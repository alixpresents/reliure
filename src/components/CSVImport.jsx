import { useState, useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

const STATUS_LABELS = {
  read: "Lu",
  reading: "En cours",
  want_to_read: "À lire",
  abandoned: "Abandonné",
};

function detectSource(headers) {
  const h = headers.map(s => s.toLowerCase().trim());
  if (h.includes("exclusive shelf") || h.includes("bookshelves")) return "goodreads";
  if (h.includes("statut") || h.includes("etagère") || h.includes("etagere")) return "babelio";
  return null;
}

function col(row, ...names) {
  for (const n of names) {
    const key = Object.keys(row).find(k => k.toLowerCase().trim() === n.toLowerCase());
    if (key && row[key] != null && row[key] !== "") return row[key].trim();
  }
  return "";
}

function stripGoodreadsISBN(raw) {
  if (!raw) return null;
  const match = raw.match(/^="?(.+?)"?$/);
  const cleaned = match ? match[1] : raw;
  return cleaned.length >= 10 ? cleaned : null;
}

function normalizeGoodreads(row) {
  const shelf = col(row, "exclusive shelf").toLowerCase();
  const statusMap = { read: "read", "currently-reading": "reading", "to-read": "want_to_read" };
  const rawIsbn = stripGoodreadsISBN(col(row, "isbn13", "isbn/uid")) || "";
  const rawIsbn10 = stripGoodreadsISBN(col(row, "isbn")) || "";
  return {
    title: col(row, "title"),
    author: col(row, "author", "author l-f"),
    isbn13: rawIsbn.length === 13 ? rawIsbn : "",
    isbn10: rawIsbn10.length === 10 ? rawIsbn10 : "",
    status: statusMap[shelf] || "read",
    rating: parseInt(col(row, "my rating")) || 0,
  };
}

function normalizeBabelio(row) {
  const raw = col(row, "statut", "etagère", "etagere").toLowerCase();
  let status = "read";
  if (raw === "lu") status = "read";
  else if (raw === "en cours") status = "reading";
  else if (raw === "a lire" || raw === "à lire") status = "want_to_read";
  else if (raw === "abandonné" || raw === "abandonne") status = "abandoned";

  const rawIsbn = col(row, "isbn13", "isbn").replace(/[="]/g, "");
  return {
    title: col(row, "titre", "title"),
    author: col(row, "auteur", "author"),
    isbn13: rawIsbn.length === 13 ? rawIsbn : "",
    isbn10: rawIsbn.length === 10 ? rawIsbn : "",
    status,
    rating: parseInt(col(row, "note", "rating")) || 0,
  };
}

export default function CSVImport() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);

  // States: idle → preview → importing → done
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const [rows, setRows] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [paused, setPaused] = useState(false);

  // Import progress
  const [progress, setProgress] = useState({ current: 0, total: 0, imported: 0, skipped: 0, failed: 0 });
  const [failedTitles, setFailedTitles] = useState([]);

  // Pause/resume on tab visibility change
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden") {
        pauseRef.current = true;
        setPaused(true);
      } else {
        pauseRef.current = false;
        setPaused(false);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const reset = () => {
    setPhase("idle");
    setError(null);
    setSource(null);
    setRows([]);
    setProgress({ current: 0, total: 0, imported: 0, skipped: 0, failed: 0 });
    setFailedTitles([]);
    abortRef.current = false;
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = useCallback((file) => {
    if (!file || !file.name.endsWith(".csv")) {
      setError("Ce fichier n'est pas un CSV.");
      return;
    }
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (result) => {
        if (!result.data?.length || !result.meta?.fields?.length) {
          setError("Le fichier est vide ou illisible.");
          return;
        }

        const detected = detectSource(result.meta.fields);
        if (!detected) {
          setError("Format non reconnu — nous supportons les exports Goodreads et Babelio.");
          return;
        }

        const normalize = detected === "goodreads" ? normalizeGoodreads : normalizeBabelio;
        const normalized = result.data
          .map(normalize)
          .filter(r => r.title);

        if (!normalized.length) {
          setError("Aucun livre trouvé dans ce fichier.");
          return;
        }

        setSource(detected);
        setRows(normalized);
        setPhase("preview");
      },
      error: () => {
        setError("Erreur de lecture du fichier.");
      },
    });
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const startImport = async () => {
    if (!user || !rows.length) return;
    setPhase("importing");
    abortRef.current = false;
    setProgress({ current: 0, total: rows.length, imported: 0, skipped: 0, failed: 0 });
    setFailedTitles([]);

    let imported = 0, skipped = 0, failed = 0;
    const failures = [];

    for (let i = 0; i < rows.length; i++) {
      if (abortRef.current) break;
      // Wait while paused (tab hidden)
      while (pauseRef.current && !abortRef.current) {
        await new Promise(r => setTimeout(r, 200));
      }
      if (abortRef.current) break;
      const row = rows[i];

      try {
        let book = null;

        // Enrichir via searchBooks avant d'importer
        let googleBook = null;

        if (row.isbn13 || row.isbn10) {
          // Cas 1 — ISBN disponible : chercher par ISBN d'abord
          const byIsbn = await searchBooks(row.isbn13 || row.isbn10);
          if (byIsbn?.length) {
            googleBook = byIsbn[0];
          } else {
            // Fallback : recherche par titre+auteur
            const byTitle = await searchBooks(`${row.title} ${row.author}`);
            if (byTitle?.length) googleBook = byTitle[0];
          }
        } else {
          // Cas 2 — pas d'ISBN : recherche par titre+auteur uniquement
          const byTitle = await searchBooks(`${row.title} ${row.author}`);
          if (byTitle?.length) googleBook = byTitle[0];
        }

        if (googleBook) {
          book = await importBook(googleBook);
        }

        // Fallback : chercher par titre exact dans notre DB si pas de livre trouvé et pas d'ISBN
        if (!book && !row.isbn13 && !row.isbn10 && row.title) {
          const { data: existingByTitle } = await supabase
            .from('books')
            .select('id')
            .ilike('title', row.title.trim())
            .limit(1);

          if (existingByTitle?.[0]) {
            book = { id: existingByTitle[0].id };
          }
        }

        if (!book) {
          failed++;
          failures.push(row.title);
          setProgress({ current: i + 1, total: rows.length, imported, skipped, failed });
          setFailedTitles([...failures]);
          continue;
        }

        // Vérifier si reading_status existe déjà avant d'insérer
        const { data: existing } = await supabase
          .from("reading_status")
          .select("id")
          .eq("user_id", user.id)
          .eq("book_id", book.id)
          .maybeSingle();

        // Créer reading_status — ne pas écraser si déjà existant
        const { error: rsErr } = await supabase.from("reading_status").upsert(
          { user_id: user.id, book_id: book.id, status: row.status },
          { onConflict: "user_id,book_id", ignoreDuplicates: true }
        );

        // Créer review rating-only si note >= 1 — ne pas écraser
        if (row.rating >= 1) {
          await supabase.from("reviews").upsert(
            { user_id: user.id, book_id: book.id, rating: row.rating },
            { onConflict: "user_id,book_id", ignoreDuplicates: true }
          );
        }

        // Comptage : succès / doublon / erreur
        if (!rsErr && !existing) {
          imported++;
        } else if (existing || rsErr?.code === "23505") {
          skipped++;
        } else {
          skipped++;
        }
      } catch (err) {
        failed++;
        failures.push(row.title);
      }

      setProgress({ current: i + 1, total: rows.length, imported, skipped, failed });
      setFailedTitles([...failures]);
    }

    setPhase("done");
  };

  const missingIsbnPct = rows.length ? Math.round(rows.filter(r => !r.isbn13 && !r.isbn10).length / rows.length * 100) : 0;

  // ── Idle ──
  if (phase === "idle") {
    return (
      <div className="mb-10">
        <div className="text-center mb-4">
          <h2 className="font-display italic text-xl font-normal mb-1">Importer depuis un fichier</h2>
          <p className="text-[13px] text-[#666] font-body">
            Exporte ta bibliothèque depuis Goodreads ou Babelio, puis dépose le CSV ici.
          </p>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-[1.5px] border-dashed rounded-lg py-10 px-6 text-center cursor-pointer transition-colors duration-150 ${
            dragOver ? "border-[#767676] bg-[#f5f3f0]" : "border-[#eee] bg-[#fafaf8] hover:bg-[#f5f3f0]"
          }`}
        >
          <div className="text-[15px] text-[#1a1a1a] font-body font-medium mb-1">
            Dépose un fichier CSV ici
          </div>
          <div className="text-[13px] text-[#767676] font-body">
            ou clique pour choisir un fichier
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            className="hidden"
          />
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-[#e25555] font-body text-center">{error}</p>
        )}
      </div>
    );
  }

  // ── Preview ──
  if (phase === "preview") {
    const preview = rows.slice(0, 5);
    return (
      <div className="mb-10">
        <div className="text-center mb-5">
          <h2 className="font-display italic text-xl font-normal mb-1">
            {rows.length} livre{rows.length > 1 ? "s" : ""} détecté{rows.length > 1 ? "s" : ""} depuis {source === "goodreads" ? "Goodreads" : "Babelio"}
          </h2>
        </div>

        {/* Preview table */}
        <div className="border border-[#eee] rounded-lg overflow-hidden mb-4">
          {preview.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i < preview.length - 1 ? "border-b border-[#f0f0f0]" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium font-body truncate">{r.title}</div>
                <div className="text-xs text-[#666] font-body truncate">{r.author}</div>
              </div>
              <span className="px-2 py-0.5 rounded-xl text-[10px] font-medium font-body bg-[#f5f3f0] text-[#666] border border-[#eee] shrink-0">
                {STATUS_LABELS[r.status] || r.status}
              </span>
              <span className="text-[12px] text-[#767676] font-body w-6 text-right shrink-0">
                {r.rating > 0 ? r.rating : "—"}
              </span>
            </div>
          ))}
          {rows.length > 5 && (
            <div className="px-4 py-2 text-[12px] text-[#767676] font-body text-center bg-[#fafaf8]">
              … et {rows.length - 5} autre{rows.length - 5 > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {missingIsbnPct > 20 && (
          <p className="text-[12px] text-[#D4883A] font-body mb-4 text-center">
            ⚠ {missingIsbnPct}% des livres n'ont pas d'ISBN — l'import sera plus lent et certains titres pourraient ne pas être trouvés.
          </p>
        )}

        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-transparent text-[#767676] border border-[#eee] cursor-pointer hover:border-[#767676] transition-colors duration-150"
          >
            Annuler
          </button>
          <button
            onClick={startImport}
            className="px-6 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-[#1a1a1a] text-white border-none cursor-pointer hover:bg-[#333] transition-colors duration-150"
          >
            Importer {rows.length} livre{rows.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  // ── Importing ──
  if (phase === "importing") {
    const pct = progress.total ? Math.round(progress.current / progress.total * 100) : 0;
    return (
      <div className="mb-10">
        <div className="text-center mb-5">
          <h2 className="font-display italic text-xl font-normal mb-1">Import en cours…</h2>
          <p className="text-[13px] text-[#666] font-body">
            {progress.current} / {progress.total}
          </p>
        </div>

        {/* Tab warning */}
        <div
          className="text-[12px] font-body text-[#666] px-3 py-2 rounded-md mb-4"
          style={{ background: "#fef9e7", border: "1px solid #f0e68c" }}
        >
          {paused
            ? "Import en pause — reviens sur cet onglet pour continuer."
            : "Ne change pas d'onglet pendant l'import — la progression s'arrêterait."}
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-[#f0ede8] rounded-sm overflow-hidden mb-4">
          <div
            className="h-full bg-[#1a1a1a] rounded-sm transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Counters */}
        <div className="flex justify-center gap-4 text-[12px] font-body mb-6">
          <span className="text-[#1a1a1a]">{progress.imported} importé{progress.imported > 1 ? "s" : ""}</span>
          <span className="text-[#767676]">{progress.skipped} déjà présent{progress.skipped > 1 ? "s" : ""}</span>
          <span className="text-[#e25555]">{progress.failed} non trouvé{progress.failed > 1 ? "s" : ""}</span>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => { abortRef.current = true; }}
            className="px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-transparent text-[#767676] border border-[#eee] cursor-pointer hover:border-[#767676] transition-colors duration-150"
          >
            Arrêter l'import
          </button>
        </div>
      </div>
    );
  }

  // ── Done ──
  if (phase === "done") {
    return (
      <div className="mb-10">
        <div
          className="mb-5"
          style={{ background: "#f0faf4", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px" }}
        >
          <div className="flex items-center gap-2 font-body">
            <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 15 }}>✓</span>
            <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 14 }}>
              {progress.imported} livre{progress.imported > 1 ? "s" : ""} importé{progress.imported > 1 ? "s" : ""} avec succès
            </span>
          </div>
          <p className="font-body mt-1" style={{ fontSize: 13, color: "#666", margin: "6px 0 0 0" }}>
            Ils apparaissent maintenant dans ta bibliothèque.
          </p>
          {progress.skipped > 0 && (
            <p className="font-body" style={{ fontSize: 12, color: "#999", margin: "4px 0 0 0" }}>
              {progress.skipped} déjà présent{progress.skipped > 1 ? "s" : ""} · {progress.failed} non trouvé{progress.failed > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {failedTitles.length > 0 && (
          <div className="border border-[#eee] rounded-lg p-4 mb-5">
            <div className="text-[12px] text-[#767676] font-body font-medium mb-2">
              Titres non trouvés — tu peux les chercher manuellement :
            </div>
            {failedTitles.map((t, i) => (
              <div key={i} className="text-[13px] text-[#666] font-body py-1">{t}</div>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-[#1a1a1a] text-white border-none cursor-pointer hover:bg-[#333] transition-colors duration-150"
          >
            Terminé
          </button>
        </div>
      </div>
    );
  }

  return null;
}
