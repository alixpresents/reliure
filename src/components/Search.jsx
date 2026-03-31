import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import { resetIOSZoom } from "../lib/resetZoom";
import { supabase } from "../lib/supabase";
import { useSmartSearch, looksLikeNaturalLanguage } from "../hooks/useSmartSearch";
import Avatar from "./Avatar";
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
  if (!users?.length) return [];

  const userIds = users.map(u => u.id);
  const { data: readRows } = await supabase
    .from("reading_status").select("user_id")
    .in("user_id", userIds).eq("status", "read");
  const countMap = {};
  for (const r of (readRows || [])) countMap[r.user_id] = (countMap[r.user_id] || 0) + 1;
  return users.map(u => ({ ...u, readCount: countMap[u.id] || 0 }));
}

const FILTERS = [
  { key: "all", label: "Tout" },
  { key: "books", label: "Livres" },
  { key: "authors", label: "Auteurs" },
  { key: "users", label: "Lecteurs" },
];

export default function Search({ open, onClose, go, initialQuery = "" }) {
  const navigate = useNavigate();
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
  const timer = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const multiAddMode = useRef(false);

  const atMode = q.startsWith("@");
  const atQuery = q.slice(1);

  // AI smart search — aligned with skip logic: disabled when DB returns ≥ 3 (unless NL query)
  const dbResultCount = results.filter(r => r._source === "db").length;
  const aiEnabled = !atMode && q.length >= 2 && (dbResultCount < 3 || looksLikeNaturalLanguage(q));
  const {
    books: aiBooks,
    ghost: rawGhost,
    interpretedAs,
    isLoading: aiLoading,
  } = useSmartSearch(q, { enabled: aiEnabled, debounceMs: 600 });

  const ghost = rawGhost && !ghostDismissed ? rawGhost : null;

  // Reset ghost dismissal when query changes
  useEffect(() => { setGhostDismissed(false); }, [q]);

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
  }, [open]); // initialQuery lu à l'ouverture via closure, pas besoin dans les deps

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

    if (!q || q.length < 2) { setResults([]); setUserResults([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const [bookRes, users] = await Promise.all([
        searchBooks(q),
        fetchUsers(q, 3),
      ]);
      setResults(bookRes);
      setUserResults(users);
      setUserSuggestionLabel("Lecteurs");
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [q]);

  // Hooks inconditionnels — DOIVENT être avant tout return conditionnel

  const isAIConfirmed = (r, aiBooksList) =>
    aiBooksList.some(ai => {
      const aiTitle = normalize(ai.title);
      const aiAuthor = normalizeAuthor(ai.author || "");
      const rTitle = normalize(r.title);
      const rAuthor = normalizeAuthor(r.authors?.[0] || "");
      return rTitle === aiTitle || (aiAuthor && rAuthor === aiAuthor && rTitle.includes(aiTitle.split(" ")[0]));
    });

  // Map résultat classique → livre IA correspondant (pour import par ISBN canonique)
  const aiConfirmedMap = useMemo(() => {
    const map = new Map();
    if (!aiBooks.length) return map;
    for (const r of results) {
      for (const ai of aiBooks) {
        const aiTitle = normalize(ai.title);
        const aiAuthor = normalizeAuthor(ai.author || "");
        const rTitle = normalize(r.title);
        const rAuthor = normalizeAuthor(r.authors?.[0] || "");
        if (rTitle === aiTitle || (aiAuthor && rAuthor === aiAuthor && rTitle.includes(aiTitle.split(" ")[0]))) {
          const key = r.googleId || r.isbn13 || r.title;
          map.set(key, ai);
          break;
        }
      }
    }
    return map;
  }, [results, aiBooks]);

  const displayResults = useMemo(() => {
    if (!aiBooks.length || !results.length) return results;

    const normT = (s) => normalize(s);
    const normA = (s) =>
      normalize(s)
        .replace(/\([^)]*\)/g, "")
        .replace(/[^a-z\s]/g, "")
        .trim()
        .split(/\s+/)
        .sort()
        .join(" ");

    const confirmed = results.filter(r =>
      aiBooks.some(ai => {
        const aiTitle = normT(ai.title);
        const aiAuthor = normA(ai.author || "");
        const rTitle = normT(r.title);
        const rAuthor = normA(r.authors?.[0] || "");
        return rTitle === aiTitle && aiAuthor && rAuthor && rAuthor === aiAuthor;
      })
    );

    const unconfirmed = results
      .filter(r => !confirmed.includes(r))
      .slice(0, 2);

    return [...confirmed, ...unconfirmed];
  }, [results, aiBooks]);

  // For "authors" filter: group books by first author
  const authorGroups = useMemo(() => {
    if (filter !== "authors") return null;
    const groups = new Map();
    for (const gb of displayResults) {
      const author = gb.authors?.[0] || "Auteur inconnu";
      if (!groups.has(author)) groups.set(author, []);
      groups.get(author).push(gb);
    }
    return groups;
  }, [filter, displayResults]);

  if (!open) return null;

  const handleClose = () => {
    resetIOSZoom();
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

    // 1. Essai par ISBN si disponible (résultat exact)
    const isbn = gb.isbn13 || gb.isbn10 || gb.isbn || null;
    let bookResults = [];
    if (isbn) {
      bookResults = await searchBooks(`isbn:${isbn}`);
    }

    // 2. Fallback : recherche par titre+auteur
    if (!bookResults.length) {
      const query = `${gb.title} ${gb.authors?.[0] || ""}`.trim();
      bookResults = await searchBooks(query);
    }

    if (bookResults.length > 0) {
      const normStr = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
      const targetNorm = normStr(gb.title);
      const match = bookResults.find(r => {
        const rNorm = normStr(r.title);
        return rNorm.includes(targetNorm) || targetNorm.includes(rNorm);
      });
      if (match) {
        setImporting(null);
        await handleSelect(match);
        return;
      }
    }

    // Fallback : import direct avec les données BnF
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
    setLoading(true);

    // 1. Essai Google Books avec titre canonique
    const bookResults = await searchBooks(`${aiBook.title} ${aiBook.author}`);
    if (bookResults.length > 0) {
      setLoading(false);
      await handleSelect(bookResults[0]);
      return;
    }

    // 2. Fallback : importer directement depuis les données IA
    const book = await importBook({
      title: aiBook.title,
      authors: aiBook.author ? [aiBook.author] : [],
      isbn13: aiBook.isbn13 || null,
      coverUrl: null,
      subtitle: null,
      publisher: null,
      publishedDate: null,
      pageCount: null,
      description: null,
    });

    setLoading(false);
    handleClose();
    setQ("");
    setResults([]);

    if (book?.slug) navigate(`/livre/${book.slug}`);
    else if (book?.id) navigate(`/livre/${book.id}`);
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
    ab => !displayResults.some(cr => normalize(cr.title) === normalize(ab.title))
  );

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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" className="shrink-0">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

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
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 360 }}>
        {loading && (
          <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Recherche...</div>
        )}

        {/* @ mode */}
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

        {/* Normal mode */}
        {!loading && !atMode && (
          <>
            {q.length >= 2 && displayResults.length === 0 && userResults.length === 0 && !aiLoading && filteredAIBooks.length === 0 && (
              <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Aucun résultat pour cette recherche.</div>
            )}

            {/* Lecteurs */}
            {showUsers && userResults.length > 0 && (
              <>
                <div className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-[1.5px] font-body font-medium" style={{ color: "var(--text-tertiary)" }}>Lecteurs</div>
                {userResults.map(u => <UserRow key={u.id} u={u} onSelect={handleSelectUser} />)}
                {showBooks && displayResults.length > 0 && (
                  <div className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-[1.5px] font-body font-medium" style={{ color: "var(--text-tertiary)" }}>
                    Livres
                  </div>
                )}
              </>
            )}

            {/* Classic book results */}
            {showBooks && displayResults.map(gb => {
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
                      {gb.authors.join(", ")}{gb.publishedDate ? ` · ${gb.publishedDate.slice(0, 4)}` : ""}
                    </div>
                  </div>
                  {added && (
                    <span className="text-[13px] font-medium font-body self-center shrink-0" style={{ color: "var(--text-primary)" }}>✓</span>
                  )}
                </div>
              );
            })}

            {/* AI results — below classic results */}
            {showAI && filteredAIBooks.length > 0 && (
              <>
                {displayResults.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
                    <span className="text-[10px] uppercase tracking-widest font-medium font-body" style={{ color: "var(--text-tertiary)" }}>
                      {interpretedAs ? `\u00AB ${interpretedAs} \u00BB` : "Suggestions"}
                    </span>
                    <span className="text-[10px]">✨</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
                  </div>
                )}
                {displayResults.length === 0 && interpretedAs && (
                  <div className="px-4 py-2 text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                    Compris : « {interpretedAs} »
                  </div>
                )}
                {filteredAIBooks.map((aiBook, i) => (
                  <div
                    key={`ai-${i}`}
                    onClick={() => handleAIBookClick(aiBook)}
                    className="flex gap-2.5 py-2 px-4 items-center cursor-pointer hover:bg-surface transition-colors duration-100"
                  >
                    <div className="rounded-sm bg-avatar-bg flex items-center justify-center text-[10px] shrink-0" style={{ width: 24, height: 36, color: "var(--text-tertiary)" }}>✨</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium font-body truncate">{aiBook.title}</div>
                      <div className="text-[11px] font-body truncate" style={{ color: "var(--text-tertiary)" }}>{aiBook.author}</div>
                      {aiBook.why && (
                        <div className="text-[11px] font-body mt-0.5" style={{ color: "var(--text-tertiary)" }}>→ {aiBook.why}</div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* AI loading indicator (subtle) */}
            {aiLoading && displayResults.length > 0 && (
              <div className="text-center py-2.5 text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>
                Recherche approfondie…
              </div>
            )}
          </>
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
          @{u.username}{u.readCount > 0 ? ` · ${u.readCount} livre${u.readCount > 1 ? "s" : ""} lu${u.readCount > 1 ? "s" : ""}` : ""}
        </div>
      </div>
    </div>
  );
}
