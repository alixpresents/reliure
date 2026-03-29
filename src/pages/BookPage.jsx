import { useState, useRef, useEffect } from "react";
import { B } from "../data";
import Img from "../components/Img";
import Stars from "../components/Stars";
import Avatar from "../components/Avatar";
import Tag from "../components/Tag";
import Pill from "../components/Pill";
import Label from "../components/Label";
import HScroll from "../components/HScroll";
import LikeButton from "../components/LikeButton";
import InteractiveStars from "../components/InteractiveStars";
import { useReadingStatus, useUserRating } from "../hooks/useReadingStatus";
import { useBookReviews } from "../hooks/useReviews";
import { useBookQuotes } from "../hooks/useQuotes";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { logActivity } from "../hooks/useActivity";
import { resetIOSZoom } from "../lib/resetZoom";

export default function BookPage({ book, onBack, onTag, go }) {
  const bookId = book._supabase?.id || book.id;
  const { status: dbStatus, loading: statusLoading, alreadyRead, setStatus: dbSetStatus, removeStatus: dbRemoveStatus } = useReadingStatus(bookId);
  const { rating: dbRating, setRating: dbSetRating } = useUserRating(bookId);
  const { reviews: dbReviews, loading: reviewsLoading, refetch: refetchReviews } = useBookReviews(bookId);
  const { quotes: dbQuotes, loading: quotesLoading, refetch: refetchQuotes } = useBookQuotes(bookId);
  const { user } = useAuth();
  const userReview = dbReviews.find(rv => rv.user_id === user?.id && rv.body);

  // Live book data from Supabase
  const isUuid = typeof bookId === "string" && bookId.includes("-");
  const [liveBook, setLiveBook] = useState(null);
  useEffect(() => {
    if (!isUuid) return;
    supabase.from("books").select("avg_rating, rating_count").eq("id", bookId).single().then(({ data }) => {
      if (data) setLiveBook(data);
    });
  }, [bookId, isUuid]);
  const avgRating = liveBook?.avg_rating ?? book.r ?? 0;
  const ratingCount = liveBook?.rating_count ?? book.rt ?? 0;

  const [st, setSt] = useState(null);
  const [ur, setUr] = useState(0);
  const [bt, setBt] = useState("critiques");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewSpoiler, setReviewSpoiler] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [finDate, setFinDate] = useState(null);
  const [noDate, setNoDate] = useState(false);
  const [isReread, setIsReread] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const dateRef = useRef(null);
  const newReviewRef = useRef(null);
  const newQuoteRef = useRef(null);

  const KNOWN_TAGS = ["en vacances", "recommandé par Margaux", "avion CDG-JFK", "relu", "en VO", "café Oberkampf", "métro"];
  const [tagFocused, setTagFocused] = useState(false);

  // Sync from DB on load
  useEffect(() => {
    if (statusLoading) return;
    if (dbStatus) {
      setSt(dbStatus.status === "want_to_read" ? "À lire" : dbStatus.status === "reading" ? "En cours" : dbStatus.status === "read" ? "Lu" : dbStatus.status === "abandoned" ? "Abandonné" : null);
      if (dbStatus.finished_at) setFinDate(dateToLabel(dbStatus.finished_at));
      setIsReread(dbStatus.is_reread || false);
    } else {
      setSt(null); setFinDate(null); setIsReread(false);
    }
  }, [dbStatus, statusLoading]);

  useEffect(() => { setUr(dbRating); }, [dbRating]);

  // Reset local-only state on book change
  useEffect(() => {
    setBt("critiques"); setNoDate(false);
    setTagInput(""); setTags([]); setTagFocused(false);
  }, [book.id]);

  const STATUS_MAP = { "En cours": "reading", "Lu": "read", "À lire": "want_to_read", "Abandonné": "abandoned" };

  const todayLabel = () => {
    const d = new Date();
    const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const dateToLabel = iso => {
    const d = new Date(iso);
    const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleStatus = s => {
    if (st === s) {
      // Remove status
      setSt(null); setFinDate(null); setNoDate(false); setIsReread(false);
      dbRemoveStatus();
    } else {
      // Set new status
      setSt(s);
      const extras = {};
      if (s === "Lu") {
        const now = new Date().toISOString();
        setFinDate(todayLabel()); setNoDate(false);
        extras.finished_at = now;
      } else {
        setFinDate(null); setNoDate(false);
      }
      setIsReread(false);
      dbSetStatus(STATUS_MAP[s], extras, { book_title: book.t || book.title, book_author: book.a || book.authors, cover_url: book.c || book.cover_url, ...(s === "Lu" && alreadyRead ? { is_reread: true } : {}) });
    }
  };

  const handleRating = async r => {
    setUr(r);
    await dbSetRating(r);
    // Auto-create reading_status "read" if none exists
    if (!dbStatus) {
      const now = new Date().toISOString();
      setSt("Lu");
      setFinDate(todayLabel());
      setNoDate(false);
      dbSetStatus("read", { finished_at: now }, { book_title: book.t || book.title, book_author: book.a || book.authors, cover_url: book.c || book.cover_url });
    }
    if (isUuid) {
      const { data } = await supabase.from("books").select("avg_rating, rating_count").eq("id", bookId).single();
      if (data) setLiveBook(data);
    }
  };

  const handlePublishReview = async () => {
    if (!reviewText.trim() || !user) return;
    setReviewSaving(true);
    const { data } = await supabase.from("reviews").upsert(
      { user_id: user.id, book_id: bookId, body: reviewText.trim(), contains_spoilers: reviewSpoiler, rating: ur || null },
      { onConflict: "user_id,book_id" }
    ).select("id").single();
    if (data) logActivity(user.id, "review", data.id, "review", { book_id: bookId, book_title: book.t || book.title, book_author: book.a || book.authors, cover_url: book.c || book.cover_url, rating: ur, review_body: reviewText.trim(), contains_spoilers: reviewSpoiler });
    setReviewSaving(false);
    setShowReviewForm(false);
    setReviewText("");
    setReviewSpoiler(false);
    resetIOSZoom();
    await refetchReviews();
    requestAnimationFrame(() => {
      newReviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handlePublishQuote = async () => {
    if (!quoteText.trim() || !user) return;
    setQuoteSaving(true);
    const { data } = await supabase.from("quotes").insert({ user_id: user.id, book_id: bookId, body: quoteText.trim() }).select("id").single();
    if (data) logActivity(user.id, "quote", data.id, "quote", { book_id: bookId, book_title: book.t || book.title, book_author: book.a || book.authors, cover_url: book.c || book.cover_url, quote_body: quoteText.trim() });
    setQuoteSaving(false);
    setShowQuoteForm(false);
    setQuoteText("");
    resetIOSZoom();
    await refetchQuotes();
    requestAnimationFrame(() => {
      newQuoteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tagSuggestions = tagInput.length >= 2
    ? KNOWN_TAGS.filter(t => norm(t).includes(norm(tagInput)) && !tags.includes(t)).slice(0, 4)
    : [];

  const addTag = t => {
    if (!tags.includes(t) && tags.length < 5) setTags([...tags, t]);
    setTagInput("");
  };

  const handleTagKey = e => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (tagSuggestions.length > 0) { addTag(tagSuggestions[0]); }
      else { addTag(tagInput.replace(/,/g, "").trim().toLowerCase()); }
    } else if (e.key === "," && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.replace(/,/g, "").trim().toLowerCase());
    }
  };

  return (
    <div>
      <button onClick={onBack} className="bg-transparent border-none text-[#737373] cursor-pointer text-[13px] py-4 font-body">
        ← Retour
      </button>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-8 py-2 pb-6 items-center sm:items-start">
        <Img book={book} w={180} h={270} />
        <div className="flex-1 pt-1">
          <h1 className="m-0 text-[26px] font-normal leading-tight font-display italic">{book.t}</h1>
          <div className="text-[15px] text-[#737373] mt-1.5 font-body">{book.a}</div>
          <div className="text-[13px] text-[#767676] mt-1 font-body">{book.y || book.publication_date}{(book.p || book.page_count) ? ` · ${book.p || book.page_count} pages` : ""}</div>

          {/* Rating box — masqué si aucune évaluation */}
          {ratingCount > 0 && avgRating > 0 && (
            <div className="flex items-center gap-3 mt-5 p-3.5 px-[18px] bg-surface rounded-lg">
              <span className="text-[32px] font-bold font-body">{avgRating}</span>
              <div>
                <Stars r={avgRating} s={14} />
                <div className="text-[11px] text-[#767676] mt-0.5 font-body">{ratingCount?.toLocaleString("fr-FR")} évaluation{ratingCount > 1 ? "s" : ""}</div>
              </div>
            </div>
          )}

          {/* Status pills */}
          <div className="flex gap-1.5 mt-[18px] flex-wrap items-center">
            {["En cours", "Lu", "À lire", "Abandonné"].map(s => (
              <Pill key={s} active={st === s} onClick={() => handleStatus(s)}>{s}</Pill>
            ))}
          </div>

          {/* Secondary pills (Lu only) */}
          <div className={`overflow-hidden transition-all duration-200 ${st === "Lu" ? "max-h-[80px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}>
            <div className="flex flex-wrap gap-1.5 items-center">
              {/* Date pill */}
              {finDate && !noDate ? (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-[5px] rounded-2xl text-xs bg-tag-bg border border-[#eee] text-[#1a1a1a] font-body">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-[#737373]">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="cursor-pointer" onClick={() => dateRef.current?.showPicker()}>{finDate}</span>
                  <input
                    ref={dateRef}
                    type="date"
                    className="absolute w-0 h-0 opacity-0"
                    onChange={e => { if (e.target.value) setFinDate(dateToLabel(e.target.value)); }}
                  />
                  <button onClick={() => { setFinDate(null); setNoDate(true); }} className="bg-transparent border-none cursor-pointer text-[#767676] hover:text-[#1a1a1a] text-[11px] leading-none p-0 ml-0.5 transition-colors duration-150">×</button>
                </span>
              ) : noDate && st === "Lu" ? (
                <span className="text-[11px] text-[#767676] font-body">Ajouté à ta bibliothèque</span>
              ) : null}

              {/* Reread pill */}
              {alreadyRead && st === "Lu" && (
                isReread ? (
                  <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-[5px] rounded-2xl text-xs bg-tag-bg border border-[#eee] text-[#1a1a1a] font-body">
                    Relecture
                    <button onClick={() => { setIsReread(false); if (dbStatus?.id) supabase.from("reading_status").update({ is_reread: false }).eq("id", dbStatus.id); }} className="bg-transparent border-none cursor-pointer text-[#767676] hover:text-[#1a1a1a] text-[11px] leading-none p-0 ml-0.5 transition-colors duration-150">×</button>
                  </span>
                ) : (
                  <button
                    onClick={() => { setIsReread(true); if (dbStatus?.id) supabase.from("reading_status").update({ is_reread: true }).eq("id", dbStatus.id); }}
                    className="inline-flex items-center px-2.5 py-[5px] rounded-2xl text-xs bg-transparent border-[1.5px] border-dashed border-[#ddd] text-[#767676] font-body cursor-pointer hover:border-[#767676] hover:text-[#1a1a1a] transition-colors duration-150"
                  >
                    + Relecture
                  </button>
                )
              )}
            </div>
          </div>

          {/* User rating */}
          <div className="mt-[18px]">
            <div className="text-xs text-[#737373] mb-1.5 font-body">Votre note</div>
            <InteractiveStars value={ur} onChange={handleRating} />
          </div>

          {/* Personal tags */}
          <div className="mt-[18px]">
            <div className="text-xs text-[#737373] mb-1.5 font-body">Tags personnels</div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-[5px] rounded-2xl text-xs bg-tag-bg border border-[#eee] text-[#1a1a1a] font-body">
                    {t}
                    <button
                      onClick={() => setTags(tags.filter(x => x !== t))}
                      className="bg-transparent border-none cursor-pointer text-[#767676] hover:text-[#1a1a1a] text-[11px] leading-none p-0 ml-0.5 transition-colors duration-150"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {tags.length < 5 && (
              <div className="relative">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  onFocus={() => setTagFocused(true)}
                  onBlur={() => setTimeout(() => setTagFocused(false), 150)}
                  placeholder="en vacances, recommandé par Margaux..."
                  className="w-full py-2 text-base md:text-[13px] bg-transparent border-b border-[#eee] outline-none text-[#1a1a1a] font-body focus:border-[#1a1a1a] transition-colors duration-200"
                />
                {tagFocused && tagSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-[#eee] rounded-lg overflow-hidden z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    {tagSuggestions.map(s => (
                      <div
                        key={s}
                        onMouseDown={e => { e.preventDefault(); addTag(s); }}
                        className="px-3 py-2 text-[13px] text-[#1a1a1a] font-body cursor-pointer hover:bg-surface transition-colors duration-100"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="text-[11px] text-[#767676] mt-1.5 font-body">Visibles uniquement par toi</div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {book.tags && (
        <div className="pb-5">
          <Label>Thèmes</Label>
          <div className="flex flex-wrap gap-1">{book.tags.map(t => <Tag key={t} onClick={() => onTag(t)}>{t}</Tag>)}</div>
        </div>
      )}

      {/* Où lire */}
      <div className="border-t border-border-light py-5">
        <Label>Où lire</Label>
        <div className="flex gap-2 items-center">
          {["Fnac", "Amazon"].map(s => (
            <span key={s} className="text-[11px] py-1.5 px-3 rounded-md bg-surface text-[#666] cursor-pointer border border-[#eee] font-body">
              {s}
            </span>
          ))}
          <div className="w-px h-5 bg-[#eee] mx-1" />
          {["Bibliothèque", "Kindle", "Audible"].map(s => (
            <span key={s} className="text-[11px] py-1.5 px-3 rounded-md bg-surface text-[#666] cursor-pointer border border-[#eee] font-body">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border-light">
        <div className="flex">
          {["critiques", "citations", "éditions"].map(t => (
            <button
              key={t}
              onClick={() => setBt(t)}
              className={`flex-1 py-3 bg-transparent border-none cursor-pointer text-xs capitalize font-body ${
                bt === t
                  ? "font-semibold text-[#1a1a1a] border-b-2 border-b-[#1a1a1a]"
                  : "font-normal text-[#737373] border-b-2 border-b-transparent"
              }`}
            >
              {t}{t === "citations" && dbQuotes.length > 0 ? ` (${dbQuotes.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="py-4">
        {bt === "critiques" && (
          <div>
            {/* Write review */}
            {!showReviewForm ? (
              <button
                onClick={() => {
                  if (userReview) {
                    setReviewText(userReview.body);
                    setReviewSpoiler(userReview.contains_spoilers || false);
                  }
                  setShowReviewForm(true);
                }}
                className="w-full mb-4 py-2.5 rounded-lg border-[1.5px] border-dashed border-[#ddd] bg-transparent cursor-pointer text-[13px] text-[#767676] font-body transition-colors duration-200 hover:border-[#767676] hover:text-[#1a1a1a]"
              >
                {userReview ? "Modifier ma critique" : "+ Écrire une critique"}
              </button>
            ) : (
              <div className="mb-4 p-4 bg-surface rounded-lg">
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Qu'avez-vous pensé de ce livre ?"
                  className="w-full min-h-[120px] p-3 bg-white border border-[#eee] rounded-lg outline-none text-base md:text-sm text-[#1a1a1a] font-body leading-[1.7] resize-y placeholder:text-[#767676] focus:border-[#ccc] transition-[border] duration-150"
                />
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={reviewSpoiler} onChange={e => setReviewSpoiler(e.target.checked)} className="accent-[#1a1a1a]" />
                  <span className="text-xs text-[#737373] font-body">Cette critique contient des spoilers</span>
                </label>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handlePublishReview}
                    disabled={!reviewText.trim() || reviewSaving}
                    className={`px-4 py-2 rounded-lg text-[13px] font-medium font-body border-none transition-all duration-150 ${
                      reviewText.trim() && !reviewSaving
                        ? "bg-[#1a1a1a] text-white cursor-pointer hover:bg-[#333]"
                        : "bg-avatar-bg text-[#767676] cursor-not-allowed"
                    }`}
                  >
                    {reviewSaving ? "Publication..." : "Publier"}
                  </button>
                  <button
                    onClick={() => { setShowReviewForm(false); setReviewText(""); setReviewSpoiler(false); }}
                    className="px-4 py-2 text-[13px] text-[#767676] font-body bg-transparent border-none cursor-pointer hover:text-[#1a1a1a] transition-colors duration-150"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Reviews list */}
            {reviewsLoading ? (
              <div className="py-6 text-center text-[13px] text-[#767676] font-body">Chargement...</div>
            ) : dbReviews.length > 0 ? (
              dbReviews.map((rv, i) => {
                const name = rv.users?.display_name || rv.users?.username || "?";
                const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                const isOwn = rv.user_id === user?.id;
                return (
                  <div key={rv.id} ref={isOwn && i === dbReviews.findIndex(r => r.user_id === user?.id) ? newReviewRef : undefined} className="py-4 border-b border-border-light">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar i={initials} s={26} />
                      <span className="text-[13px] font-semibold font-body">{name}</span>
                      {rv.rating > 0 && <Stars r={rv.rating} s={11} />}
                    </div>
                    {rv.contains_spoilers ? (
                      <details>
                        <summary className="text-[11px] text-spoiler cursor-pointer font-medium font-body">Cette critique contient des spoilers</summary>
                        <p className="text-[15px] text-[#333] leading-[1.7] mt-2 font-body">{rv.body}</p>
                      </details>
                    ) : (
                      <p className="text-[15px] text-[#333] leading-[1.7] m-0 font-body">{rv.body}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-[13px] text-[#767676] font-body">Pas encore de critiques. Soyez le premier !</div>
            )}
          </div>
        )}

        {bt === "citations" && (
          <div>
            {/* Quote form */}
            {!showQuoteForm ? (
              <button
                onClick={() => setShowQuoteForm(true)}
                className="w-full mb-4 py-2.5 rounded-lg border-[1.5px] border-dashed border-[#ddd] bg-transparent cursor-pointer text-[13px] text-[#767676] font-body transition-colors duration-200 hover:border-[#767676] hover:text-[#1a1a1a]"
              >
                + Ajouter une citation
              </button>
            ) : (
              <div className="mb-4 p-4 bg-surface rounded-lg">
                <textarea
                  value={quoteText}
                  onChange={e => setQuoteText(e.target.value)}
                  placeholder="Copiez un passage du livre..."
                  className="w-full min-h-[80px] p-3 bg-white border border-[#eee] rounded-lg outline-none text-base md:text-[15px] text-[#1a1a1a] font-display italic leading-[1.7] resize-y placeholder:text-[#767676] placeholder:not-italic placeholder:font-body focus:border-[#ccc] transition-[border] duration-150"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handlePublishQuote}
                    disabled={!quoteText.trim() || quoteSaving}
                    className={`px-4 py-2 rounded-lg text-[13px] font-medium font-body border-none transition-all duration-150 ${
                      quoteText.trim() && !quoteSaving
                        ? "bg-[#1a1a1a] text-white cursor-pointer hover:bg-[#333]"
                        : "bg-avatar-bg text-[#767676] cursor-not-allowed"
                    }`}
                  >
                    {quoteSaving ? "Publication..." : "Publier"}
                  </button>
                  <button
                    onClick={() => { setShowQuoteForm(false); setQuoteText(""); }}
                    className="px-4 py-2 text-[13px] text-[#767676] font-body bg-transparent border-none cursor-pointer hover:text-[#1a1a1a] transition-colors duration-150"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Quotes list */}
            {quotesLoading ? (
              <div className="py-6 text-center text-[13px] text-[#767676] font-body">Chargement...</div>
            ) : dbQuotes.length > 0 ? (
              dbQuotes.map((q, i) => {
                const name = q.users?.display_name || q.users?.username || "?";
                const isOwn = q.user_id === user?.id;
                return (
                  <div key={q.id} ref={isOwn && i === dbQuotes.findIndex(qt => qt.user_id === user?.id) ? newQuoteRef : undefined} className="py-[18px] border-b border-border-light">
                    <div className="text-[15px] italic text-[#1a1a1a] leading-[1.7] border-l-[3px] border-l-cover-fallback pl-4 font-display">
                      « {q.body} »
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="text-xs text-[#737373] font-body">{name}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-[#767676] text-[13px] font-body">Pas encore de citations.</div>
            )}
          </div>
        )}

        {bt === "éditions" && (
          <div className="flex gap-2.5">
            {[{ l: "Poche", p: "Folio", y: "2008" }, { l: "Relié", p: "Gallimard", y: "2004" }, { l: "Audio", p: "Audible", y: "2019" }].map((e, i) => (
              <div key={i} className="p-3.5 px-4 bg-surface rounded-lg flex-1 cursor-pointer hover:bg-[#f3f0eb]">
                <div className="text-[13px] font-semibold font-body">{e.l}</div>
                <div className="text-xs text-[#737373] mt-[3px] font-body">{e.p} · {e.y}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Also liked */}
      <div className="border-t border-border-light py-6">
        <Label>Les lecteurs ont aussi aimé</Label>
        <HScroll>
          {B.filter(x => x.id !== book.id).slice(0, 6).map(b => (
            <div key={b.id} className="text-center min-w-[100px]">
              <Img book={b} w={100} h={150} onClick={() => { onBack(); setTimeout(() => go(b), 0); }} />
              <div className="text-[10px] font-medium mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px] font-body">{b.t}</div>
            </div>
          ))}
        </HScroll>
      </div>
    </div>
  );
}
