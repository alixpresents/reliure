import { useState, useEffect, useRef } from "react";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";

export default function Search({ open, onClose, go }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q || q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const res = await searchBooks(q);
      setResults(res);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [q]);

  if (!open) return null;

  const handleSelect = async (gb) => {
    setImporting(gb.googleId);
    const book = await importBook(gb);
    setImporting(null);
    if (book) {
      // Normalize to match the format expected by go()
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
      go(normalized);
      onClose();
      setQ("");
      setResults([]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-200 bg-white/97 backdrop-blur-[8px]"
      onClick={onClose}
    >
      {/* Bouton fermer (croix) */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 sm:p-0 cursor-pointer bg-transparent border-none text-[#999] hover:text-[#1a1a1a] transition-colors duration-150"
        aria-label="Fermer la recherche"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div
        className="max-w-[500px] mx-auto pt-12 sm:pt-20 px-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="bg-surface rounded-lg py-[11px] px-4 flex items-center gap-2.5 border border-[#eee] focus-within:border-[#ccc] transition-[border] duration-150 flex-1 min-w-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" className="shrink-0">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Chercher un livre, un auteur..."
              className="bg-transparent border-none outline-none text-[#1a1a1a] text-base w-full font-body placeholder:text-[#767676]"
            />
            {q && (
              <button onClick={() => { setQ(""); setResults([]); }} className="text-[#767676] hover:text-[#1a1a1a] bg-transparent border-none cursor-pointer text-sm shrink-0">×</button>
            )}
          </div>
          <button
            onClick={onClose}
            className="sm:hidden shrink-0 bg-transparent border-none cursor-pointer text-[14px] text-[#999] font-body"
          >
            Annuler
          </button>
        </div>

        <div className="mt-3">
          {loading && (
            <div className="py-4 text-center text-[13px] text-[#767676] font-body">Recherche...</div>
          )}

          {!loading && q.length >= 2 && results.length === 0 && (
            <div className="py-4 text-center text-[13px] text-[#767676] font-body">Aucun résultat pour cette recherche.</div>
          )}

          {results.map(gb => (
            <div
              key={gb.googleId}
              onClick={() => importing ? null : handleSelect(gb)}
              className={`flex gap-3 py-2.5 border-b border-border-light transition-colors duration-100 ${importing === gb.googleId ? "opacity-50" : "cursor-pointer hover:bg-[#fafafa]"}`}
            >
              {gb.coverUrl ? (
                <img src={gb.coverUrl} alt="" className="w-9 h-[52px] object-cover rounded-sm shrink-0 bg-cover-fallback" />
              ) : (
                <div className="w-9 h-[52px] rounded-sm bg-cover-fallback shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium font-body truncate">{gb.title}</div>
                <div className="text-xs text-[#737373] font-body truncate">
                  {gb.authors.join(", ")}{gb.publishedDate ? ` · ${gb.publishedDate.slice(0, 4)}` : ""}
                </div>
              </div>
              {importing === gb.googleId && (
                <span className="text-[11px] text-[#767676] font-body self-center shrink-0">Ajout...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
