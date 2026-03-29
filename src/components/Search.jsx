import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import { resetIOSZoom } from "../lib/resetZoom";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import Skeleton from "./Skeleton";

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
  const timer = useRef(null);
  const inputRef = useRef(null);
  const multiAddMode = useRef(false);

  const atMode = q.startsWith("@");
  const atQuery = q.slice(1);

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
      // @ mode: user search only, no books
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

    // Normal mode: books + users secondary
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

  const addedCount = addedGoogleIds.size;
  const placeholder = atMode
    ? "Chercher un lecteur par pseudo..."
    : "Chercher un livre, un auteur, un lecteur...";

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
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-w-0 text-base bg-transparent border-none outline-none text-[#1a1a1a] font-display italic placeholder:text-[#999] placeholder:font-display placeholder:italic"
            />
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
                {q.length >= 2 && results.length === 0 && userResults.length === 0 && (
                  <div className="py-8 text-center text-[13px] text-[#767676] font-body">Aucun résultat pour cette recherche.</div>
                )}

                {/* Lecteurs en secondaire */}
                {userResults.length > 0 && (
                  <>
                    <div className="px-5 pt-3 pb-1 text-[11px] uppercase tracking-[1.5px] text-[#999] font-body">Lecteurs</div>
                    {userResults.map(u => <UserRow key={u.id} u={u} onSelect={handleSelectUser} />)}
                    {results.length > 0 && (
                      <div className="px-5 pt-3 pb-1 text-[11px] uppercase tracking-[1.5px] text-[#999] font-body">
                        Livres {results.length > 0 && <span className="normal-case tracking-normal text-[#bbb]">({results.length})</span>}
                      </div>
                    )}
                  </>
                )}

                {results.map(gb => {
                  const added = addedGoogleIds.has(gb.googleId);
                  const isImporting = importing === gb.googleId;
                  return (
                    <div
                      key={gb.googleId}
                      onClick={() => !isImporting && !added && handleSelect(gb)}
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
