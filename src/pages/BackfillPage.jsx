import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { B } from "../data";
import Img from "../components/Img";
import Label from "../components/Label";
import InteractiveStars from "../components/InteractiveStars";
import CSVImport from "../components/CSVImport";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

function BackfillBook({ book, rating, onRate, onRemove, isNew }) {
  return (
    <div className={`flex flex-col items-center transition-all duration-300 ${isNew ? "animate-[fadeIn_300ms_ease]" : ""}`}>
      <div className="relative">
        <Img book={book} w={60} h={90} />
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-[#eee] text-[#767676] hover:text-[#1a1a1a] hover:border-[#ccc] text-xs leading-none flex items-center justify-center cursor-pointer transition-all duration-150 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          ×
        </button>
      </div>
      <div className="text-[11px] font-medium mt-2 font-body text-center max-w-[60px] truncate">{book.t}</div>
      <div className="text-[10px] text-[#737373] font-body">{book.a.split(" ").pop()}</div>
      <div className="mt-1">
        <InteractiveStars value={rating} onChange={onRate} size="text-[10px]" />
      </div>
    </div>
  );
}

function StatusPill({ label, active, variant, onClick }) {
  const base = "px-2.5 py-[5px] rounded-2xl text-[11px] font-medium font-body cursor-pointer transition-all duration-200 border inline-flex items-center gap-1";
  if (active && variant === "lu") {
    return <button onClick={onClick} className={`${base} bg-[#1a1a1a] text-white border-[#1a1a1a]`}>✓ {label}</button>;
  }
  if (active && variant === "alire") {
    return <button onClick={onClick} className={`${base} bg-tag-bg text-[#1a1a1a] border-[#eee]`}>✓ {label}</button>;
  }
  return <button onClick={onClick} className={`${base} bg-transparent text-[#767676] border-[#ddd] hover:border-[#999]`}>{label}</button>;
}

export default function BackfillPage() {
  const onBack = () => navigate(-1);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState([]);
  const [lastAdded, setLastAdded] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await searchBooks(q);
      setSearchResults(res);
      setSearching(false);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [q]);

  const pickMap = new Map(picks.map(p => [p.book.id, p]));

  const toggleStatus = (book, status) => {
    const existing = pickMap.get(book.id);
    if (existing && existing.status === status) {
      setPicks(picks.filter(p => p.book.id !== book.id));
    } else if (existing) {
      setPicks(picks.map(p => p.book.id === book.id ? { ...p, status } : p));
    } else {
      setPicks([...picks, { book, rating: 0, status }]);
      setLastAdded(book.id);
      setTimeout(() => setLastAdded(null), 300);
    }
  };

  const addFromSearch = gb => {
    const book = { id: gb.googleId, t: gb.title, a: gb.authors.join(", "), c: gb.coverUrl, y: gb.publishedDate ? parseInt(gb.publishedDate) : null, p: gb.pageCount, _google: gb };
    if (!pickMap.has(book.id)) {
      setPicks([...picks, { book, rating: 0, status: "lu" }]);
      setLastAdded(book.id);
      setTimeout(() => setLastAdded(null), 300);
    }
    setQ("");
    setSearchResults([]);
  };

  const rateBook = (id, r) => {
    setPicks(picks.map(p => p.book.id === id ? { ...p, rating: r } : p));
  };

  const removeBook = id => {
    setPicks(picks.filter(p => p.book.id !== id));
  };

  const handleConfirm = async () => {
    if (!user || picks.length === 0) return;
    const count = picks.length;
    setConfirming(true);

    for (const pick of picks) {
      try {
        // Import book to DB (from Google Books or find existing)
        let bookId = pick.book._supabase?.id;
        if (!bookId && pick.book._google) {
          const imported = await importBook(pick.book._google);
          if (imported) bookId = imported.id;
        }
        if (!bookId) continue;

        // Create reading_status
        const status = pick.status === "alire" ? "want_to_read" : "read";
        const payload = { user_id: user.id, book_id: bookId, status };
        if (status === "read") payload.finished_at = new Date().toISOString();
        const { error: rsError } = await supabase.from("reading_status").insert(payload);
        if (rsError) console.error("reading_status insert error:", rsError);

        // Create review with rating if provided
        if (pick.rating > 0) {
          const { error: rvError } = await supabase.from("reviews").upsert(
            { user_id: user.id, book_id: bookId, rating: pick.rating },
            { onConflict: "user_id,book_id" }
          );
          if (rvError) console.error("review upsert error:", rvError);
        }
      } catch (err) {
        console.error("backfill error for book:", pick.book.t, err);
      }
    }

    setPicks([]);
    setConfirmMsg(`${count} livre${count > 1 ? "s" : ""} ajouté${count > 1 ? "s" : ""} !`);
    if (onRefreshProfile) onRefreshProfile();
    setTimeout(() => onBack(), 1200);
  };

  return (
    <div className="max-w-[500px] mx-auto">
      <button
        onClick={onBack}
        className="bg-transparent border-none text-[#737373] cursor-pointer text-[13px] py-4 font-body"
      >
        ← Retour au profil
      </button>

      {/* CSV Import */}
      <CSVImport />

      {/* Séparateur */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 h-px bg-[#f0f0f0]" />
        <span className="text-[11px] uppercase tracking-widest text-[#ccc] font-body">ou ajoute manuellement</span>
        <div className="flex-1 h-px bg-[#f0f0f0]" />
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="font-display italic text-xl font-normal mb-1 leading-tight">
          Qu'as-tu lu récemment ?
        </h1>
        <p className="text-[13px] text-[#737373] font-body">
          Tape un titre ou un auteur.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <div className="bg-surface rounded-lg py-[11px] px-4 flex items-center gap-2.5 border border-[#eee] focus-within:border-[#ccc] transition-[border] duration-150">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Chercher un livre, un auteur..."
            className="bg-transparent border-none outline-none text-[#1a1a1a] text-base md:text-sm w-full font-body placeholder:text-[#767676]"
          />
        </div>
        {searching && (
          <div className="mt-2 py-3 text-center text-[13px] text-[#767676] font-body">Recherche...</div>
        )}
        {!searching && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-[#eee] rounded-lg overflow-hidden z-10 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            {searchResults.slice(0, 6).map(gb => (
              <div
                key={gb.googleId}
                onClick={() => addFromSearch(gb)}
                className="flex items-center gap-3 px-3 py-2.5 border-b border-border-light last:border-b-0 cursor-pointer hover:bg-surface transition-colors duration-100"
              >
                {gb.coverUrl ? (
                  <img src={gb.coverUrl} alt="" className="w-8 h-12 object-cover rounded-sm shrink-0 bg-cover-fallback" />
                ) : (
                  <div className="w-8 h-12 rounded-sm bg-cover-fallback shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium font-body truncate">{gb.title}</div>
                  <div className="text-xs text-[#737373] font-body">{gb.authors.join(", ")}{gb.publishedDate ? ` · ${gb.publishedDate.slice(0, 4)}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!searching && q.length >= 2 && searchResults.length === 0 && (
          <div className="mt-2 py-3 text-center text-[13px] text-[#767676] font-body">Aucun résultat.</div>
        )}
      </div>

      {/* Discovery list */}
      <div className="mb-6">
        <Label>Les plus lus</Label>
        <div className="flex flex-col">
          {B.map(book => {
            const pick = pickMap.get(book.id);
            const st = pick?.status || null;
            return (
              <div key={book.id} className="flex items-center gap-3 py-2.5 border-b border-border-light">
                <Img book={book} w={44} h={66} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium font-body truncate">{book.t}</div>
                  <div className="text-xs text-[#737373] font-body">{book.a}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <StatusPill label="Lu" active={st === "lu"} variant="lu" onClick={() => toggleStatus(book, "lu")} />
                  <StatusPill label="À lire" active={st === "alire"} variant="alire" onClick={() => toggleStatus(book, "alire")} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pile */}
      {picks.length > 0 && (
        <div className={`transition-all duration-400 ${confirming ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#737373] font-body">Ta sélection</span>
            <span className="text-xs text-[#767676] font-body">{picks.length} livre{picks.length > 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-wrap gap-3 mb-24">
            {picks.map(p => (
              <BackfillBook
                key={p.book.id}
                book={p.book}
                rating={p.rating}
                onRate={r => rateBook(p.book.id, r)}
                onRemove={() => removeBook(p.book.id)}
                isNew={lastAdded === p.book.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirm message */}
      {confirmMsg && (
        <div className="fixed inset-x-0 bottom-24 flex justify-center z-20 animate-[fadeIn_300ms_ease]">
          <div className="bg-[#1a1a1a] text-white text-sm font-medium font-body px-5 py-3 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
            {confirmMsg}
          </div>
        </div>
      )}

      {/* Sticky button */}
      <div className="fixed bottom-0 left-0 right-0 z-10 pb-6 pt-4 bg-gradient-to-t from-white via-white to-white/0 pointer-events-none">
        <div className="max-w-[500px] mx-auto px-4 pointer-events-auto">
          <button
            onClick={handleConfirm}
            disabled={picks.length === 0}
            className={`w-full py-3.5 rounded-[20px] text-[15px] font-medium font-body border-none transition-all duration-200 ${
              picks.length > 0
                ? "bg-[#1a1a1a] text-white cursor-pointer hover:bg-[#333]"
                : "bg-avatar-bg text-[#767676] cursor-not-allowed"
            }`}
          >
            {picks.length > 0
              ? `Ajouter ${picks.length} livre${picks.length > 1 ? "s" : ""} à ma bibliothèque`
              : "Ajouter des livres à ma bibliothèque"}
          </button>
        </div>
      </div>
    </div>
  );
}
