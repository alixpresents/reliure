import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { searchBooks, isGoogleBooksAvailable, fetchDilicom } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import { resetIOSZoom } from "../lib/resetZoom";
import { supabase } from "../lib/supabase";
import { searchBnF } from "../lib/bnfSearch";
import { useSmartSearch, looksLikeNaturalLanguage } from "../hooks/useSmartSearch";
import { useAuth } from "../lib/AuthContext";
import Avatar from "./Avatar";
import { extractYear } from "../utils/extractYear";
import Skeleton from "./Skeleton";

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function normalizeAuthor(s) {
  return normalize(s)
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .sort()
    .join(" ");
}

async function fetchUsers(query, limit = 5) {
  let req = supabase.from("users").select("id, username, display_name, avatar_url");
  if (query) {
    req = req.ilike("username", `%${query}%`);
  } else {
    req = req.order("created_at", { ascending: false });
  }
  const { data: users } = await req.limit(limit);
  return (users || []).map(u => ({ ...u, readCount: 0 }));
}

function matchesAIBook(result, aiBook) {
  const rTitle = normalize(result.title);
  const rAuthor = normalizeAuthor(result.authors?.[0] || "");
  const aiTitle = normalize(aiBook.title);
  const aiAuthor = normalizeAuthor(aiBook.author || "");

  if (rTitle === aiTitle) return true;

  if (aiAuthor && rAuthor && rAuthor === aiAuthor) {
    const firstWord = aiTitle.split(" ")[0];
    if (firstWord.length >= 3 && rTitle.includes(firstWord)) return true;
  }

  return false;
}

const FILTERS = [
  { key: "all", label: "Tout" },
  { key: "books", label: "Livres" },
  { key: "authors", label: "Auteurs" },
  { key: "users", label: "Lecteurs" },
];

export default function Search({ open, onClose, go, initialQuery = "" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [visible, setVisible] = useState(false);
  const [addedGoogleIds, setAddedGoogleIds] = useState(new Set());
  const [userResults, setUserResults] = useState([]);
  const [userSuggestionLabel, setUserSuggestionLabel] = useState("Lecteurs");
  const [ghostDismissed, setGhostDismissed] = useState(false);
  const [showAllAI, setShowAllAI] = useState(false);
  const [showAllClassic, setShowAllClassic] = useState(false);
  const [deepSearching, setDeepSearching] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);
  const timer = useRef(null);
  const searchSeq = useRef(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const resultsRef = useRef(null);
  const multiAddMode = useRef(false);

  const atMode = q.startsWith("@");
  const atQuery = q.slice(1);

  // AI smart search — enabled for NL, low DB results, or 3+ word queries
  const dbResultCount = results.filter(r => r._source === "db").length;
  const isNL = !atMode && q.length >= 2 && looksLikeNaturalLanguage(q);
  const wordCount = q.trim().split(/\s+/).length;
  const aiEnabled = !atMode && q.length >= 2 && (dbResultCount < 3 || isNL || wordCount >= 3);

  // Fast-path: if 0 results from all sources, trigger AI immediately (no debounce)
  const zeroResults = !loading && results.length === 0 && q.length >= 2 && !atMode;

  const {
    books: aiBooks,
    ghost: rawGhost,
    interpretedAs,
    isLoading: aiLoading,
  } = useSmartSearch(q, {
    enabled: aiEnabled || zeroResults,
    debounceMs: zeroResults ? 0 : isNL ? 300 : 400,
  });

  const ghost = rawGhost && !ghostDismissed ? rawGhost : null;

  // Reset ghost dismissal and "see more" when query changes
  useEffect(() => { setGhostDismissed(false); setShowAllAI(false); setShowAllClassic(false); }, [q]);

  useEffect(() => {
    if (open) {
      setQ(initialQuery);
      setFilter("all");
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => inputRef.current?.focus(), 50);
      multiAddMode.current = false;
      setAddedGoogleIds(new Set());
    } else {
      setVisible(false);
      setQ("");
    }
  }, [open]); // initialQuery lu à l'ouverture via closure

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    clearTimeout(timer.current);

    if (atMode) {
      setResults([]);
      setLoading(true);
      const delay = atQuery.length === 0 ? 0 : 400;
      timer.current = setTimeout(async () => {
        const users = await fetchUsers(atQuery || null, 5);
        setUserResults(users);
        setUserSuggestionLabel(atQuery.length === 0 ? "Lecteurs à découvrir" : "Lecteurs");
        setLoading(false);
      }, delay);
      return () => clearTimeout(timer.current);
    }

    if (!q || q.length < 2) {
      setResults([]); setUserResults([]); setLoading(false); setDeepSearching(false);
      return;
    }
    setLoading(true);
    setDeepSearching(false);
    const seq = ++searchSeq.current;
    timer.current = setTimeout(async () => {
      const usersPromise = fetchUsers(q, 3);

      const books = await searchBooks(q, {
        onDbResults: (dbResults, { skipGoogle }) => {
          if (searchSeq.current !== seq) return;
          if (dbResults.length > 0) {
            setResults(dbResults);
            setLoading(false);
            if (!skipGoogle) setDeepSearching(true);
          }
        },
      });

      if (searchSeq.current !== seq) return;
      const users = await usersPromise;
      setResults(books);
      setUserResults(users);
      setUserSuggestionLabel("Lecteurs");
      setLoading(false);
      setDeepSearching(false);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [q]);

  // Hooks inconditionnels — DOIVENT être avant tout return conditionnel

  // For "authors" filter: group books by first author
  const authorGroups = useMemo(() => {
    if (filter !== "authors") return null;
    const groups = new Map();
    for (const gb of results) {
      const author = gb.authors?.[0] || "Auteur inconnu";
      if (!groups.has(author)) groups.set(author, []);
      groups.get(author).push(gb);
    }
    return groups;
  }, [filter, results]);

  if (!open) return null;

  const handleClose = () => {
    resetIOSZoom();
    setAuthMessage(null);
    onClose();
  };

  const handleSelectUser = (u) => {
    handleClose();
    setQ("");
    setResults([]);
    setUserResults([]);
    navigate(`/${u.username}`);
  };

  const handleSelect = async (gb) => {
    if (addedGoogleIds.has(gb.googleId)) return;
    setImporting(gb.googleId);

    const book = await importBook(gb);
    setImporting(null);
    if (book) {
      const normalized = {
        id: book.id,
        t: book.title,
        a: Array.isArray(book.authors) ? book.authors.join(", ") : (book.authors || ""),
        c: book.cover_url,
        y: book.publication_date ? parseInt(book.publication_date) : null,
        p: book.page_count,
        r: book.avg_rating || 0,
        rt: book.rating_count || 0,
        tags: Array.isArray(book.genres) ? book.genres : [],
        desc: book.description,
        awards: [],
        _supabase: book,
      };
      const result = await go(normalized);
      if (result && result.keepOpen) {
        multiAddMode.current = true;
        setAddedGoogleIds(prev => new Set(prev).add(gb.googleId));
        inputRef.current?.focus();
      } else {
        handleClose();
        setQ("");
        setResults([]);
      }
    }
  };

  const handleBnFSelect = async (gb) => {
    const key = `bnf:${gb.isbn13 ?? gb.title}`;
    if (addedGoogleIds.has(key)) return;
    setImporting(key);

    const isbn = gb.isbn13 || gb.isbn10 || gb.isbn || null;

    // 1. Check direct en base par ISBN (pas de searchBooks)
    if (isbn) {
      const cleanISBN = isbn.replace(/-/g, "");
      const { data: existing } = await supabase
        .from("books")
        .select("id, slug")
        .eq("isbn_13", cleanISBN)
        .maybeSingle();

      if (existing) {
        setImporting(null);
        handleClose();
        setQ("");
        setResults([]);
        navigate(`/livre/${existing.slug || existing.id}`);
        return;
      }
    }

    // 2. Pas en base → import via book_import edge function si ISBN dispo
    if (isbn) {
      try {
        const { data, error } = await supabase.functions.invoke("book_import", {
          body: { isbn: isbn.replace(/-/g, "") },
        });
        if (!error && data?.id) {
          setImporting(null);
          handleClose();
          setQ("");
          setResults([]);
          navigate(`/livre/${data.slug || data.id}`);
          return;
        }
      } catch { /* book_import failed, continue to fallback */ }
    }

    // 3. Fallback : import direct avec les données BnF
    const book = await importBook({
      title: gb.title,
      authors: gb.authors || [],
      isbn13: gb.isbn13 || null,
      coverUrl: gb.coverUrl || null,
      subtitle: gb.subtitle || null,
      publisher: gb.publisher || null,
      publishedDate: gb.publishedDate || null,
      pageCount: gb.pageCount || null,
      description: gb.description || null,
    });

    setImporting(null);
    handleClose();
    setQ("");
    setResults([]);

    if (book?.slug) navigate(`/livre/${book.slug}`);
    else if (book?.id) navigate(`/livre/${book.id}`);
  };

  const handleAIBookClick = async (aiBook) => {
    if (!user) {
      setAuthMessage("Connectez-vous pour ajouter ce livre à Reliure");
      resultsRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setAuthMessage(null);
    // Change 2: per-item spinner instead of full loading gate
    setImporting('ai-' + aiBook.title);

    const normStr = str => (str ?? "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/['''\u2019\u2018]/g, " ")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ").trim();

    const scoreMatch = (result, ai) => {
      const gTitle = normStr(result.title);
      const gAuthor = normStr((result.authors ?? []).join(" "));
      const aTitle = normStr(ai.title);
      const aAuthor = normStr(ai.author);
      let score = 0;
      if (gTitle === aTitle) score += 100;
      else if (gTitle.includes(aTitle) || aTitle.includes(gTitle)) score += 60;
      else {
        const words = aTitle.split(" ").filter(w => w.length > 2);
        score += words.filter(w => gTitle.includes(w)).length * 15;
      }
      if (aAuthor && gAuthor.includes(aAuthor.split(" ").pop())) score += 50;
      return score;
    };

    // Normalise un livre importé et l'envoie au callback go (comme handleSelect)
    const selectImportedBook = async (book) => {
      setImporting(null);
      const normalized = {
        id: book.id,
        t: book.title,
        a: Array.isArray(book.authors) ? book.authors.join(", ") : (book.authors || ""),
        c: book.cover_url,
        y: book.publication_date ? parseInt(book.publication_date) : null,
        p: book.page_count,
        r: book.avg_rating || 0,
        rt: book.rating_count || 0,
        tags: Array.isArray(book.genres) ? book.genres : [],
        desc: book.description,
        awards: [],
        _supabase: book,
      };
      const result = await go(normalized);
      if (result && result.keepOpen) {
        multiAddMode.current = true;
        inputRef.current?.focus();
      } else {
        handleClose();
        setQ("");
        setResults([]);
      }
    };

    // ── Branche 1 : Google Books disponible → recherche + scoring ──
    if (isGoogleBooksAvailable()) {
      const bookResults = await searchBooks(`${aiBook.title} ${aiBook.author}`);
      if (bookResults.length > 0) {
        const scored = bookResults
          .map(r => ({ r, score: scoreMatch(r, aiBook) }))
          .sort((a, b) => b.score - a.score);
        const best = scored[0];
        console.log("[search-ai-import]", JSON.stringify({
          aiTitle: aiBook.title, aiAuthor: aiBook.author,
          bestTitle: best.r.title, bestScore: best.score,
          source: best.r._source,
        }));
        if (best.score >= 100) {
          if (best.r.isbn13) {
            const { data, error } = await supabase.functions.invoke("book_import", {
              body: { isbn: best.r.isbn13 },
            });
            if (!error && data?.id) {
              await selectImportedBook(data);
              return;
            }
          }
          // Fallback si pas d'ISBN ou edge function échoue
          await handleSelect(best.r);
          setImporting(null);
          return;
        }
        // score < 100 → laisser la cascade BnF prendre le relais
      }
    }

    // ── Branche 1b : Dilicom ISBN vérification ──
    // Si smart-search a fourni un ISBN, vérifier via Dilicom (fiable pour les livres FR)
    if (aiBook.isbn13) {
      try {
        const dilicomResults = await fetchDilicom(aiBook.isbn13, { isbn: aiBook.isbn13 });
        if (dilicomResults.length > 0 && dilicomResults[0].isbn13) {
          console.log("[search-ai-import] Dilicom verified ISBN:", dilicomResults[0].isbn13);
          const { data, error } = await supabase.functions.invoke("book_import", {
            body: { isbn: dilicomResults[0].isbn13 },
          });
          if (!error && data?.id) {
            await selectImportedBook(data);
            return;
          }
        }
      } catch { /* Dilicom down — continuer */ }
    }

    // ── Branche 2 : BnF fallback ──

    // Recherche BnF par titre + auteur → récupérer un ISBN fiable
    try {
      const bnfResults = await searchBnF(`${aiBook.title} ${aiBook.author || ""}`, 5);
      const bnfWithIsbn = bnfResults.find(r => r.volumeInfo?.industryIdentifiers?.length > 0);
      if (bnfWithIsbn) {
        const isbn = bnfWithIsbn.volumeInfo.industryIdentifiers[0].identifier;
        console.log("[search-ai-import] BnF fallback found ISBN:", isbn);
        const { data, error } = await supabase.functions.invoke("book_import", {
          body: { isbn },
        });
        if (!error && data?.id) {
          await selectImportedBook(data);
          return;
        }
      }
    } catch { /* BnF down — continuer */ }

    // 2c. Dernier recours : import direct avec données IA (pas idéal mais mieux que rien)
    const book = await importBook({
      title: aiBook.title,
      authors: aiBook.author ? [aiBook.author] : [],
      isbn13: null, // ne pas utiliser l'ISBN IA non vérifié
      coverUrl: null,
      subtitle: null,
      publisher: null,
      publishedDate: null,
      pageCount: null,
      description: null,
    });

    if (book) {
      await selectImportedBook(book);
    } else {
      setImporting(null);
      console.warn("[search-ai-import] all fallbacks failed for:", aiBook.title);
    }
  };

  const acceptGhost = () => {
    if (!ghost) return;
    const full = q + ghost;
    const titleOnly = full.split(" — ")[0].trim();
    setQ(titleOnly);
  };

  const handleInputKeyDown = (e) => {
    if (ghost) {
      if (e.key === "Tab" || (e.key === "ArrowRight" && e.target.selectionStart === q.length)) {
        e.preventDefault();
        acceptGhost();
        return;
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        setGhostDismissed(true);
        return;
      }
    }
  };

  const addedCount = addedGoogleIds.size;
  const placeholder = atMode
    ? "Chercher un lecteur par pseudo..."
    : "Chercher un livre, un auteur, un lecteur...";

  // Deduplicated AI books (exclude titles already in classic results)
  const filteredAIBooks = aiBooks.filter(
    ab => !results.some(cr => normalize(cr.title) === normalize(ab.title))
  );

  const visibleAIBooks = showAllAI ? filteredAIBooks : filteredAIBooks.slice(0, 3);
  const hasMoreAI = filteredAIBooks.length > 3;

  // Change 1: stale = loading with previous results still in state
  const isShowingStale = loading && results.length > 0;

  // Filtered views
  const showBooks = filter === "all" || filter === "books" || filter === "authors";
  const showUsers = filter === "all" || filter === "users";
  const showAI = filter === "all" || filter === "books";

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        width: 420,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 200,
        backgroundColor: "var(--bg-primary)",
        border: "0.5px solid var(--border-default)",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
        maxHeight: 440,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(4px)" : "translateY(-2px)",
        transition: "opacity 120ms ease-out, transform 120ms ease-out",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Input row */}
      <div className="flex items-center gap-2 px-3" style={{ height: 44, borderBottom: "0.5px solid var(--border-subtle)" }}>
        {/* Change 1: spinner in loupe while searching */}
        {loading || deepSearching ? (
          <div
            className="animate-spin shrink-0"
            style={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              border: "2px solid var(--border-default)",
              borderTopColor: "var(--text-muted)",
            }}
          />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}

        <div className="relative flex-1 min-w-0">
          {ghost && (
            <div
              className="absolute inset-0 pointer-events-none flex items-center overflow-hidden whitespace-nowrap"
              style={{ fontSize: 15 }}
            >
              <span style={{ visibility: "hidden" }}>{q}</span>
              <span style={{ color: "var(--text-tertiary)" }}>{ghost}</span>
            </div>
          )}
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            className="w-full border-none outline-none font-body placeholder-[var(--text-muted)]"
            style={{ background: "transparent", fontSize: 15, color: "var(--text-primary)" }}
          />
          {ghost && (
            <button
              onClick={acceptGhost}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 text-[10px] bg-avatar-bg rounded px-1.5 py-0.5 md:hidden border-none cursor-pointer font-body"
              style={{ color: "var(--text-tertiary)" }}
              aria-label="Accepter la suggestion"
            >
              Tab
            </button>
          )}
        </div>

        {q && (
          <button
            onClick={() => { setQ(""); setResults([]); setUserResults([]); inputRef.current?.focus(); }}
            className="bg-transparent border-none cursor-pointer p-1 shrink-0 transition-colors duration-150 hover:opacity-80"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Effacer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <kbd
          className="hidden sm:inline-block text-[10px] font-body rounded px-1.5 py-0.5 shrink-0 leading-none"
          style={{ fontFamily: "inherit", color: "var(--text-tertiary)", border: "1px solid var(--border-default)" }}
        >
          esc
        </kbd>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 border-b" style={{ borderColor: "var(--border-subtle)", padding: "8px 12px" }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="cursor-pointer font-body transition-all duration-100"
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: 20,
              background: filter === f.key ? "var(--text-primary)" : "transparent",
              border: filter === f.key ? "0.5px solid var(--text-primary)" : "0.5px solid var(--border-default)",
              color: filter === f.key ? "var(--bg-primary)" : "var(--text-tertiary)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Résultats */}
      <div ref={resultsRef} className="overflow-y-auto flex-1" style={{ maxHeight: 360 }}>

        {authMessage && (
          <div className="mx-4 mt-2 mb-1 px-3 py-2.5 rounded-lg text-[13px] font-body text-center" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
            {authMessage}{" "}
            <a href="/login" onClick={handleClose} className="font-medium no-underline" style={{ color: "var(--text-primary)" }}>Se connecter →</a>
          </div>
        )}

        {/* @ mode — keeps its own loading gate since it clears results immediately */}
        {!loading && atMode && (
          <>
            {userResults.length > 0 ? (
              <>
                <div className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-[1.5px] font-body font-medium" style={{ color: "var(--text-tertiary)" }}>
                  {userSuggestionLabel}
                </div>
                {userResults.map(u => <UserRow key={u.id} u={u} onSelect={handleSelectUser} />)}
              </>
            ) : (
              atQuery.length > 0 && (
                <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>
                  Aucun lecteur trouvé pour @{atQuery}
                </div>
              )
            )}
          </>
        )}

        {/* Normal mode — Change 1: no !loading gate; stale results show at reduced opacity */}
        {!atMode && (
          <div style={{ opacity: isShowingStale ? 0.4 : 1, pointerEvents: isShowingStale ? "none" : "auto" }}>

            {/* Zero results states */}
            {zeroResults && aiLoading && (
              <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>
                Aucun résultat local — recherche approfondie...
              </div>
            )}
            {zeroResults && !aiLoading && filteredAIBooks.length === 0 && userResults.length === 0 && (
              <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>
                Aucun résultat trouvé.
              </div>
            )}
            {!zeroResults && q.length >= 2 && results.length === 0 && userResults.length === 0 && !aiLoading && filteredAIBooks.length === 0 && (
              <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>
                Aucun résultat pour cette recherche.
              </div>
            )}

            {/* Lecteurs */}
            {showUsers && userResults.length > 0 && (
              <>
                <div className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-[1.5px] font-body font-medium" style={{ color: "var(--text-tertiary)" }}>Lecteurs</div>
                {userResults.map(u => <UserRow key={u.id} u={u} onSelect={handleSelectUser} />)}
                {showBooks && results.length > 0 && (
                  <div className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-[1.5px] font-body font-medium" style={{ color: "var(--text-tertiary)" }}>
                    Livres
                  </div>
                )}
              </>
            )}

            {/* Classic book results — capped at 5 when AI suggestions exist */}
            {showBooks && (() => {
              const cappedResults = filteredAIBooks.length > 0 && !showAllClassic
                ? results.slice(0, 5)
                : results;
              const hiddenCount = filteredAIBooks.length > 0 ? results.length - 5 : 0;
              return (
                <>
                  {cappedResults.map(gb => {
              const isDb = gb._source === "db";
              const isBnF = gb._source === "bnf";
              const itemKey = gb.googleId ?? (isDb ? `db:${gb.dbId}` : `bnf:${gb.isbn13 ?? gb.title}`);
              const added = addedGoogleIds.has(itemKey);
              const isImporting = importing === itemKey;

              const handleClick = async () => {
                if (isImporting || added) return;
                if (isDb) {
                  const normalized = {
                    id: gb.dbId,
                    slug: gb.slug ?? gb.dbId,
                    t: gb.title,
                    a: Array.isArray(gb.authors) ? gb.authors.join(", ") : (gb.authors || ""),
                    c: gb.coverUrl,
                  };
                  const result = await go(normalized);
                  if (!(result && result.keepOpen)) {
                    handleClose();
                    setQ("");
                    setResults([]);
                  }
                } else if (isBnF) {
                  handleBnFSelect(gb);
                } else {
                  handleSelect(gb);
                }
              };

              return (
                <div
                  key={itemKey}
                  onClick={handleClick}
                  className={`flex gap-2.5 py-2 px-4 items-center transition-colors duration-100 ${
                    added ? "bg-surface" : isImporting ? "opacity-50" : "cursor-pointer hover:bg-surface"
                  }`}
                >
                  {isImporting ? (
                    <Skeleton.Cover w={24} h={36} className="rounded-sm" />
                  ) : gb.coverUrl ? (
                    <img src={gb.coverUrl} alt="" className="object-cover rounded-sm shrink-0 bg-cover-fallback" style={{ width: 24, height: 36 }} />
                  ) : (
                    <div className="rounded-sm bg-cover-fallback shrink-0" style={{ width: 24, height: 36 }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium font-body truncate">{gb.title}</div>
                    <div className="text-[11px] font-body truncate" style={{ color: "var(--text-tertiary)" }}>
                      {gb.authors.join(", ")}{extractYear(gb.publishedDate) ? ` · ${extractYear(gb.publishedDate)}` : ""}
                    </div>
                  </div>
                  {added && (
                    <span className="text-[13px] font-medium font-body self-center shrink-0" style={{ color: "var(--text-primary)" }}>✓</span>
                  )}
                </div>
              );
              })}
                  {hiddenCount > 0 && !showAllClassic && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAllClassic(true); }}
                      className="w-full py-1.5 text-center font-body border-none cursor-pointer transition-colors duration-100 hover:opacity-70"
                      style={{ background: "transparent", fontSize: 11, color: "var(--text-tertiary)" }}
                    >
                      +{hiddenCount} autres résultats
                    </button>
                  )}
                </>
              );
            })()}

            {/* AI results — Change 3: unified block (no isNL split), always below classic results */}
            {showAI && filteredAIBooks.length > 0 && (
              <>
                {results.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
                    <span className="text-[10px] uppercase tracking-widest font-medium font-body" style={{ color: "var(--text-tertiary)" }}>
                      {interpretedAs ? `\u00AB ${interpretedAs} \u00BB` : "Suggestions"}
                    </span>
                    <span className="text-[10px]">✨</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
                  </div>
                )}
                {results.length === 0 && interpretedAs && (
                  <div className="px-4 py-2 text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                    Compris : « {interpretedAs} »
                  </div>
                )}
                {visibleAIBooks.map((aiBook, i) => {
                  // Change 2: per-item spinner on the clicked row
                  const isImportingThis = importing === 'ai-' + aiBook.title;
                  return (
                    <div
                      key={`ai-${i}`}
                      onClick={() => !isImportingThis && handleAIBookClick(aiBook)}
                      className={`flex gap-2.5 py-2 px-4 items-center transition-colors duration-100 ${isImportingThis ? "opacity-60" : "cursor-pointer hover:bg-surface"}`}
                    >
                      <div className="rounded-sm bg-avatar-bg flex items-center justify-center text-[10px] shrink-0" style={{ width: 24, height: 36, color: "var(--text-tertiary)" }}>
                        {isImportingThis ? (
                          <div
                            className="animate-spin"
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              border: "1.5px solid var(--border-default)",
                              borderTopColor: "var(--text-muted)",
                            }}
                          />
                        ) : "✨"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium font-body truncate">{aiBook.title}</div>
                        <div className="text-[11px] font-body truncate" style={{ color: "var(--text-tertiary)" }}>{aiBook.author}</div>
                        {aiBook.why && (
                          <div className="text-[11px] font-body mt-0.5" style={{ color: "var(--text-tertiary)" }}>→ {aiBook.why}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {hasMoreAI && !showAllAI && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAllAI(true); }}
                    className="w-full py-2 text-center text-[12px] font-medium font-body cursor-pointer border-none transition-colors duration-100 hover:opacity-70"
                    style={{ background: "transparent", color: "var(--text-tertiary)" }}
                  >
                    Voir plus de suggestions ✨
                  </button>
                )}
              </>
            )}

            {/* Wave 2 indicator — Change 3: no !isNL condition */}
            {(deepSearching || aiLoading) && results.length > 0 && (
              <div className="text-center py-2.5 text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>
                Recherche approfondie<PulsingDots />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer "Terminé" in multi-add mode */}
      {multiAddMode.current && addedCount > 0 && (
        <div className="border-t px-4 py-2.5 flex items-center justify-between shrink-0" style={{ borderColor: "var(--border-default)" }}>
          <span className="text-[12px] font-body" style={{ color: "var(--text-tertiary)" }}>
            {addedCount} livre{addedCount > 1 ? "s" : ""} ajouté{addedCount > 1 ? "s" : ""}
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-[16px] text-[12px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
            style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
          >
            Terminé
          </button>
        </div>
      )}
    </div>
  );
}

function PulsingDots() {
  return (
    <span className="inline-flex gap-[3px] ml-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="inline-block rounded-full"
          style={{
            width: 3,
            height: 3,
            backgroundColor: "var(--text-tertiary)",
            animation: `pulsingDot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function UserRow({ u, onSelect }) {
  const name = u.display_name || u.username || "?";
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div
      onClick={() => onSelect(u)}
      className="flex items-center gap-2.5 py-2 px-4 cursor-pointer hover:bg-surface transition-colors duration-100"
    >
      <Avatar i={initials} s={28} src={u.avatar_url} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium font-body truncate">{name}</div>
        <div className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>
          @{u.username}
        </div>
      </div>
    </div>
  );
}
