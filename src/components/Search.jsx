import { useState, useEffect, useRef } from "react";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import { resetIOSZoom } from "../lib/resetZoom";

export default function Search({ open, onClose, go }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);
  const inputRef = useRef(null);

  // Animate in
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setVisible(false);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Debounced search
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
      resetIOSZoom();
      setQ("");
      setResults([]);
    }
  };

  const handleClose = () => {
    resetIOSZoom();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-150 transition-opacity duration-150"
        style={{ backgroundColor: visible ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0)" }}
        onClick={handleClose}
      />

      {/* Dropdown */}
      <div
        className="fixed left-0 right-0 z-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-b-none sm:rounded-b-[12px] sm:left-1/2 sm:-translate-x-1/2 sm:max-w-[560px] sm:w-full transition-all duration-150 ease-out overflow-hidden"
        style={{
          top: 52,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-10px)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-5 border-b border-[#eee]">
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Chercher un livre, un auteur..."
            className="flex-1 min-w-0 py-4 text-base bg-transparent border-none outline-none text-[#1a1a1a] font-display italic placeholder:text-[#999] placeholder:font-display placeholder:italic"
          />
          {q && (
            <button
              onClick={() => { setQ(""); setResults([]); inputRef.current?.focus(); }}
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
            className="sm:hidden shrink-0 bg-transparent border-none cursor-pointer text-[14px] text-[#999] font-body py-2"
          >
            Annuler
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(60vh - 56px)" }}>
          {loading && (
            <div className="py-6 text-center text-[13px] text-[#767676] font-body">Recherche...</div>
          )}

          {!loading && q.length >= 2 && results.length === 0 && (
            <div className="py-6 text-center text-[13px] text-[#767676] font-body">Aucun résultat pour cette recherche.</div>
          )}

          {results.map(gb => (
            <div
              key={gb.googleId}
              onClick={() => importing ? null : handleSelect(gb)}
              className={`flex gap-3 py-2.5 px-5 min-h-[44px] items-center transition-colors duration-100 ${importing === gb.googleId ? "opacity-50" : "cursor-pointer hover:bg-surface"}`}
            >
              {gb.coverUrl ? (
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
              {importing === gb.googleId && (
                <span className="text-[11px] text-[#767676] font-body self-center shrink-0">Ajout...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
