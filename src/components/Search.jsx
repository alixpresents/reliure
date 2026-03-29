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

export default function Search({ open, onClose, go }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
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
  const multiAddMode = useRef(false);

  const atMode = q.startsWith("@");
  const atQuery = q.slice(1);

  // AI smart search — enabled when classic results are weak or NL query
  const aiEnabled = !atMode && q.length >= 2;
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
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => inputRef.current?.focus(), 50);
      multiAddMode.current = false;
      setAddedGoogleIds(new Set());
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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

  // Normalisation partagée pour matching IA ↔ classique
  const normalizeAuthorForMatch = (s) =>
    normalize(s)
      .replace(/\([^)]*\)/g, "")
      .replace(/[^a-z\s]/g, "")
      .trim()
      .split(/\s+/)
      .sort()
      .join(" ");

  const isAIConfirmed = (r, aiBooksList) =>
    aiBooksList.some(ai => {
      const aiTitle = normalize(ai.title);
      const aiAuthor = normalizeAuthorForMatch(ai.author || "");
      const rTitle = normalize(r.title);
      const rAuthor = normalizeAuthorForMatch(r.authors?.[0] || "");
      return rTitle === aiTitle || (aiAuthor && rAuthor === aiAuthor && rTitle.includes(aiTitle.split(" ")[0]));
    });

  // Map résultat classique → livre IA correspondant (pour import par ISBN canonique)
  const aiConfirmedMap = useMemo(() => {
    const map = new Map();
    if (!aiBooks.length) return map;
    for (const r of results) {
      for (const ai of aiBooks) {
        const aiTitle = normalize(ai.title);
        const aiAuthor = normalizeAuthorForMatch(ai.author || "");
        const rTitle = normalize(r.title);
        const rAuthor = normalizeAuthorForMatch(r.authors?.[0] || "");
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

  const handleSelect = async (gb, { skipCanonical = false } = {}) => {
    if (addedGoogleIds.has(gb.googleId)) return;
    setImporting(gb.googleId);

    // Si confirmé par l'IA avec un ISBN canonique, tenter d'importer la bonne édition
    if (!skipCanonical) {
      const key = gb.googleId || gb.isbn13 || gb.title;
      const matchedAI = aiConfirmedMap.get(key);
      if (matchedAI?.isbn13) {
        const canonical = await searchBooks("isbn:" + matchedAI.isbn13);
        if (canonical.length > 0 && canonical[0].googleId !== gb.googleId) {
          setImporting(null);
          return handleSelect(canonical[0], { skipCanonical: true });
        }
      }
    }

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

    // Tenter Google Books par ISBN ou titre+auteur pour un import enrichi
    const query = gb.isbn13 || `${gb.title} ${gb.authors?.[0] || ""}`.trim();
    const bookResults = await searchBooks(query);

    if (bookResults.length > 0) {
      setImporting(null);
      await handleSelect(bookResults[0]);
      return;
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
    // importBook gère : check ISBN existant → edge function → insert minimal
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

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          backgroundColor: visible ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0)",
          transition: "background-color 150ms ease-out",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 52,
          left: 0,
          right: 0,
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 560,
            backgroundColor: "#fff",
            borderRadius: "0 0 12px 12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            maxHeight: "60vh",
            overflow: "hidden",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-8px)",
            transition: "opacity 150ms ease-out, transform 150ms ease-out",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#eee]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" className="shrink-0">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            {/* Input with ghost text overlay */}
            <div className="relative flex-1 min-w-0">
              {ghost && (
                <div
                  className="absolute inset-0 pointer-events-none flex items-center overflow-hidden whitespace-nowrap"
                  style={{ fontFamily: "Instrument Serif, serif", fontStyle: "italic", fontSize: "1rem" }}
                >
                  <span style={{ visibility: "hidden" }}>{q}</span>
                  <span className="text-[#ccc]">{ghost}</span>
                </div>
              )}
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                className="w-full text-base border-none outline-none text-[#1a1a1a] font-display italic placeholder:text-[#999] placeholder:font-display placeholder:italic"
                style={{ background: "transparent" }}
              />
              {/* Mobile ghost accept button */}
              {ghost && (
                <button
                  onClick={acceptGhost}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 text-[10px] text-[#999] bg-[#f0ede8] rounded px-1.5 py-0.5 md:hidden border-none cursor-pointer font-body"
                  aria-label="Accepter la suggestion"
                >
                  Tab
                </button>
              )}
            </div>

            {q && (
              <button
                onClick={() => { setQ(""); setResults([]); setUserResults([]); inputRef.current?.focus(); }}
                className="text-[#999] hover:text-[#1a1a1a] bg-transparent border-none cursor-pointer p-2 shrink-0 transition-colors duration-150"
                aria-label="Effacer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <button
              onClick={handleClose}
              className="sm:hidden shrink-0 bg-transparent border-none cursor-pointer text-[14px] text-[#999] font-body py-1"
            >
              Annuler
            </button>
          </div>

          {/* Résultats */}
          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="py-8 text-center text-[13px] text-[#767676] font-body">Recherche...</div>
            )}

            {/* @ mode */}
            {!loading && atMode && (
              <>
                {userResults.length > 0 ? (
                  <>
                    <div className="px-5 pt-3 pb-1 text-[11px] uppercase tracking-[1.5px] text-[#999] font-body">
                      {userSuggestionLabel}
                    </div>
                    {userResults.map(u => <UserRow key={u.id} u={u} onSelect={handleSelectUser} />)}
                  </>
                ) : (
                  atQuery.length > 0 && (
                    <div className="py-8 text-center text-[13px] text-[#767676] font-body">
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
                  <div className="py-8 text-center text-[13px] text-[#767676] font-body">Aucun résultat pour cette recherche.</div>
                )}

                {/* Lecteurs en secondaire */}
                {userResults.length > 0 && (
                  <>
                    <div className="px-5 pt-3 pb-1 text-[11px] uppercase tracking-[1.5px] text-[#999] font-body">Lecteurs</div>
                    {userResults.map(u => <UserRow key={u.id} u={u} onSelect={handleSelectUser} />)}
                    {displayResults.length > 0 && (
                      <div className="px-5 pt-3 pb-1 text-[11px] uppercase tracking-[1.5px] text-[#999] font-body">
                        Livres {displayResults.length > 0 && <span className="normal-case tracking-normal text-[#bbb]">({displayResults.length})</span>}
                      </div>
                    )}
                  </>
                )}

                {/* Classic book results */}
                {displayResults.map(gb => {
                  const isDb = gb._source === "db";
                  const isBnF = gb._source === "bnf";
                  const itemKey = gb.googleId ?? (isDb ? `db:${gb.dbId}` : `bnf:${gb.isbn13 ?? gb.title}`);
                  const added = addedGoogleIds.has(itemKey);
                  const isImporting = importing === itemKey;

                  const handleClick = () => {
                    if (isImporting || added) return;
                    if (isDb && gb.slug) {
                      handleClose();
                      setQ("");
                      setResults([]);
                      navigate(`/livre/${gb.slug}`);
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
                      className={`flex gap-3 py-2.5 px-5 min-h-[44px] items-center transition-colors duration-100 ${
                        added ? "bg-[#fafaf8]" : isImporting ? "opacity-50" : "cursor-pointer hover:bg-[#fafaf8]"
                      }`}
                    >
                      {isImporting ? (
                        <Skeleton.Cover w={36} h={52} className="rounded-sm" />
                      ) : gb.coverUrl ? (
                        <img src={gb.coverUrl} alt="" className="w-9 h-[52px] object-cover rounded-sm shrink-0 bg-cover-fallback" />
                      ) : (
                        <div className="w-9 h-[52px] rounded-sm bg-cover-fallback shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium font-body truncate">{gb.title}</div>
                        <div className="text-xs text-[#737373] font-body truncate">
                          {gb.authors.join(", ")}{gb.publishedDate ? ` · ${gb.publishedDate.slice(0, 4)}` : ""}
                        </div>
                      </div>
                      {added && (
                        <span className="text-[13px] text-[#1a1a1a] font-medium font-body self-center shrink-0">✓</span>
                      )}
                    </div>
                  );
                })}

                {/* AI results — below classic results */}
                {filteredAIBooks.length > 0 && (
                  <>
                    {displayResults.length > 0 && (
                      <div className="flex items-center gap-2 px-5 py-3">
                        <div className="flex-1 h-px bg-[#f0f0f0]" />
                        <span className="text-[10px] uppercase tracking-widest text-[#ccc] font-medium font-body">
                          {interpretedAs ? `\u00AB ${interpretedAs} \u00BB` : "Suggestions"}
                        </span>
                        <span className="text-[10px]">✨</span>
                        <div className="flex-1 h-px bg-[#f0f0f0]" />
                      </div>
                    )}
                    {displayResults.length === 0 && interpretedAs && (
                      <div className="px-5 py-2 text-xs text-[#999] font-body">
                        Compris : « {interpretedAs} »
                      </div>
                    )}
                    {filteredAIBooks.map((aiBook, i) => (
                      <div
                        key={`ai-${i}`}
                        onClick={() => handleAIBookClick(aiBook)}
                        className="flex gap-3 py-2.5 px-5 min-h-[44px] items-center cursor-pointer hover:bg-[#fafaf8] transition-colors duration-100"
                      >
                        <div className="w-9 h-[52px] rounded-sm bg-[#f0ede8] flex items-center justify-center text-[10px] text-[#bbb] shrink-0">✨</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-medium font-body truncate">{aiBook.title}</div>
                          <div className="text-xs text-[#737373] font-body truncate">{aiBook.author}</div>
                          {aiBook.why && (
                            <div className="text-[11px] text-[#bbb] font-body mt-0.5">→ {aiBook.why}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* AI loading indicator (subtle) */}
                {aiLoading && displayResults.length > 0 && (
                  <div className="text-center py-3 text-[11px] text-[#ccc] font-body">
                    Recherche approfondie…
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer "Terminé" in multi-add mode */}
          {multiAddMode.current && addedCount > 0 && (
            <div className="border-t border-[#eee] px-5 py-3 flex items-center justify-between shrink-0">
              <span className="text-[12px] text-[#767676] font-body">
                {addedCount} livre{addedCount > 1 ? "s" : ""} ajouté{addedCount > 1 ? "s" : ""}
              </span>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-[16px] text-[12px] font-medium font-body bg-[#1a1a1a] text-white border-none cursor-pointer hover:bg-[#333] transition-colors duration-150"
              >
                Terminé
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function UserRow({ u, onSelect }) {
  const name = u.display_name || u.username || "?";
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div
      onClick={() => onSelect(u)}
      className="flex items-center gap-3 py-2.5 px-5 cursor-pointer hover:bg-[#fafaf8] transition-colors duration-100"
    >
      <Avatar i={initials} s={32} src={u.avatar_url} />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium font-body truncate">{name}</div>
        <div className="text-xs text-[#767676] font-body">
          @{u.username}{u.readCount > 0 ? ` · ${u.readCount} livre${u.readCount > 1 ? "s" : ""} lu${u.readCount > 1 ? "s" : ""}` : ""}
        </div>
      </div>
    </div>
  );
}
