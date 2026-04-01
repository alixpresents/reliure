import { useState, useEffect, useRef } from "react";
import { QUOTES } from "../data";
import Img from "../components/Img";
import Heading from "../components/Heading";
import LikeButton from "../components/LikeButton";
import UserName from "../components/UserName";
import { Link } from "react-router-dom";
import { useNav } from "../lib/NavigationContext";
import { useCommunityQuotes, useMyQuotes } from "../hooks/useQuotes";
import { useLikes } from "../hooks/useLikes";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import { logActivity } from "../hooks/useActivity";
import { safeMutation, unwrapSupabase } from "../lib/safeMutation";
import ContentMenu from "../components/ContentMenu";
import Toast from "../components/Toast";
import { useToast } from "../hooks/useToast";

function AddQuoteModal({ onClose, onPublished }) {
  const { user } = useAuth();
  const { toast, showToast } = useToast();
  const [step, setStep] = useState("search"); // "search" | "compose"
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null); // DB book row
  const [quoteText, setQuoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (step === "compose") setTimeout(() => textareaRef.current?.focus(), 50);
  }, [step]);

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!searchQ || searchQ.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const res = await searchBooks(searchQ);
      setResults(res);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [searchQ]);

  const handleSelectBook = async (gb) => {
    setImporting(gb.googleId);
    const book = await importBook(gb);
    setImporting(null);
    if (book) {
      setSelectedBook(book);
      setStep("compose");
    }
  };

  const handlePublish = async () => {
    if (!quoteText.trim() || !user || !selectedBook) return;
    setSaving(true);
    await safeMutation({
      mutate: () => unwrapSupabase(
        supabase.from("quotes")
          .insert({ user_id: user.id, book_id: selectedBook.id, text: quoteText.trim() })
          .select("id")
          .single(),
        "publish quote"
      ),
      onSuccess: (data) => {
        logActivity(user.id, "quote", data.id, "quote", {
          book_id: selectedBook.id,
          book_title: selectedBook.title,
          book_author: Array.isArray(selectedBook.authors) ? selectedBook.authors.join(", ") : (selectedBook.authors || ""),
          cover_url: selectedBook.cover_url,
          quote_body: quoteText.trim(),
        });
        setSaving(false);
        onPublished();
      },
      onError: () => { setSaving(false); showToast("Une erreur est survenue"); },
      errorMessage: "publish quote error",
    });
  };

  const bookObj = selectedBook ? {
    id: selectedBook.id,
    t: selectedBook.title,
    a: Array.isArray(selectedBook.authors) ? selectedBook.authors.join(", ") : (selectedBook.authors || ""),
    c: selectedBook.cover_url,
  } : null;

  return (
    <>
      {toast.visible && <Toast message={toast.message} />}
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.35)" }}
      />

      {/* Modal */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 64, paddingLeft: 16, paddingRight: 16 }}
        onClick={onClose}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 520, background: "var(--bg-primary)", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.14)", overflow: "hidden" }}
        >
          {/* Header */}
          <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="text-[15px] font-semibold font-body" style={{ color: "var(--text-primary)" }}>
              {step === "search" ? "Choisir un livre" : "Ajouter une citation"}
            </span>
            {step === "compose" && (
              <button
                onClick={() => { setStep("search"); setQuoteText(""); }}
                className="text-[12px] font-body bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity duration-150"
                style={{ color: "var(--text-tertiary)" }}
              >
                ← Changer de livre
              </button>
            )}
          </div>

          {step === "search" ? (
            <div>
              <div style={{ padding: "12px 20px" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Titre, auteur…"
                  className="w-full bg-surface rounded-lg py-[10px] px-4 text-[14px] font-body placeholder-[var(--text-tertiary)] border outline-none focus:border-[var(--text-tertiary)] transition-[border] duration-150"
                  style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}
                />
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {searching && (
                  <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Recherche…</div>
                )}
                {!searching && searchQ.length >= 2 && results.length === 0 && (
                  <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Aucun résultat</div>
                )}
                {!searching && results.map(gb => (
                  <button
                    key={gb.googleId}
                    onClick={() => handleSelectBook(gb)}
                    disabled={!!importing}
                    className="w-full flex items-center gap-3 px-5 py-3 bg-transparent border-none cursor-pointer hover:bg-surface transition-colors duration-100 text-left"
                  >
                    {gb.cover ? (
                      <img src={gb.cover} alt="" className="w-9 h-[54px] rounded-[3px] object-cover shrink-0" style={{ boxShadow: "var(--shadow-cover)" }} />
                    ) : (
                      <div className="w-9 h-[54px] rounded-[3px] bg-cover-fallback shrink-0 flex items-center justify-center text-[9px] font-body text-center px-1 leading-tight" style={{ color: "var(--text-tertiary)" }}>{gb.title}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium font-body truncate" style={{ color: "var(--text-primary)" }}>
                        {importing === gb.googleId ? "Import…" : gb.title}
                      </div>
                      <div className="text-[11px] font-body mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{gb.author}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: "16px 20px 20px" }}>
              {bookObj && (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <Img book={bookObj} w={36} h={52} />
                  <div>
                    <div className="text-[13px] font-medium font-body" style={{ color: "var(--text-primary)" }}>{bookObj.t}</div>
                    <div className="text-[11px] font-body mt-0.5" style={{ color: "var(--text-tertiary)" }}>{bookObj.a}</div>
                  </div>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={quoteText}
                onChange={e => setQuoteText(e.target.value)}
                placeholder="La phrase qui t'a marqué…"
                rows={4}
                className="w-full bg-surface rounded-lg py-3 px-4 text-[14px] font-display italic placeholder-[var(--text-tertiary)] border outline-none focus:border-[var(--text-tertiary)] transition-[border] duration-150 resize-none leading-relaxed"
                style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handlePublish}
                  disabled={!quoteText.trim() || saving}
                  className="px-5 py-2 rounded-full text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
                >
                  {saving ? "Publication…" : "Publier"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function CitationsPage() {
  const { goToBook: go } = useNav();
  const { user } = useAuth();
  const { quotes: dbQuotes, loading, refetch } = useCommunityQuotes();
  const { quotes: myQuotes, loading: myQuotesLoading } = useMyQuotes(user?.id);
  const { likedSet, initialSet, toggle } = useLikes(dbQuotes.map(q => q.id), "quote");
  const [modalOpen, setModalOpen] = useState(false);
  const { toast, showToast } = useToast();

  const useDb = dbQuotes.length > 0;
  const showOnboarding = user && !myQuotesLoading && myQuotes.length === 0;

  const handlePublished = () => {
    setModalOpen(false);
    refetch();
  };

  return (
    <div className="pt-6">
      {toast.visible && <Toast message={toast.message} />}
      <div className="flex items-center justify-between mb-1">
        <Heading>Citations</Heading>
        {user && (
          <button
            onClick={() => setModalOpen(true)}
            className="text-[13px] font-medium font-body bg-transparent border-none cursor-pointer hover:opacity-60 transition-opacity duration-150 shrink-0"
            style={{ color: "var(--text-primary)" }}
          >
            + Ajouter
          </button>
        )}
      </div>
      <p className="text-sm mb-5 font-body" style={{ color: "var(--text-tertiary)" }}>Les plus belles phrases, partagées par la communauté.</p>

      {showOnboarding && (
        <p className="text-[13px] font-body mb-6 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          Sauvegarde les phrases qui t'ont marqué depuis n'importe quelle fiche livre, ou directement ici.
        </p>
      )}

      {loading ? (
        <div className="py-8 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Chargement...</div>
      ) : useDb ? (
        dbQuotes.map(q => {
          const bookObj = q.books ? { id: q.book_id, t: q.books.title, a: Array.isArray(q.books.authors) ? q.books.authors.join(", ") : "", c: q.books.cover_url, slug: q.books.slug, _supabase: q.books } : null;
          return (
            <div key={q.id} className="group py-[22px] border-b border-border-light relative">
              <div className="flex items-start justify-between gap-2">
                <div className="text-base italic leading-[1.75] border-l-[3px] border-l-cover-fallback pl-[18px] mb-3.5 font-display flex-1" style={{ color: "var(--text-primary)" }}>
                  « {q.text} »
                </div>
                <ContentMenu type="quote" item={q} onDelete={() => refetch()} onEdit={() => refetch()} />
              </div>
              <div className="flex items-center gap-3">
                {bookObj && (
                  <Link to={`/livre/${bookObj.slug || bookObj.id}`}>
                    <Img book={bookObj} w={36} h={52} />
                  </Link>
                )}
                <div className="flex-1">
                  {bookObj && (
                    <Link
                      to={`/livre/${bookObj.slug || bookObj.id}`}
                      className="text-[13px] font-medium font-body hover:underline"
                      style={{ color: "var(--text-primary)", textDecoration: "none" }}
                    >
                      {bookObj.t}
                    </Link>
                  )}
                  {bookObj && <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>{bookObj.a}</div>}
                </div>
                <div className="text-right">
                  <div className="text-xs font-body"><UserName user={q.users} className="text-xs" /></div>
                  <div className="text-xs mt-0.5 font-body" style={{ color: "var(--text-tertiary)" }}><LikeButton count={q.likes_count || 0} liked={likedSet.has(q.id)} initialLiked={initialSet.has(q.id)} onToggle={() => toggle(q.id, () => showToast("Une erreur est survenue"))} /></div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        [...QUOTES].sort((a, b) => b.lk - a.lk).map(q => (
          <div key={q.id} className="py-[22px] border-b border-border-light">
            <div className="text-base italic leading-[1.75] border-l-[3px] border-l-cover-fallback pl-[18px] mb-3.5 font-display" style={{ color: "var(--text-primary)" }}>
              « {q.txt} »
            </div>
            <div className="flex items-center gap-3">
              <Link to={`/livre/${q.b.slug || q.b.id}`}>
                <Img book={q.b} w={36} h={52} />
              </Link>
              <div className="flex-1">
                <Link
                  to={`/livre/${q.b.slug || q.b.id}`}
                  className="text-[13px] font-medium font-body hover:underline"
                  style={{ color: "var(--text-primary)", textDecoration: "none" }}
                >
                  {q.b.t}
                </Link>
                <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>{q.b.a}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>{q.u}</div>
                <div className="text-xs mt-0.5 font-body" style={{ color: "var(--text-tertiary)" }}><LikeButton count={q.lk} /></div>
              </div>
            </div>
          </div>
        ))
      )}

      {modalOpen && (
        <AddQuoteModal onClose={() => setModalOpen(false)} onPublished={handlePublished} />
      )}
    </div>
  );
}
