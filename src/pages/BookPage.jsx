import { useState, useRef, useEffect, useMemo, memo } from "react";

const S_MODAL_OVERLAY = { position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.4)" };
const S_MODAL_CONTAINER = { position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" };
const S_COVER_MINI = { width: 40, height: 60, objectFit: "cover", borderRadius: 3 };
const S_FILE_BTN = { color: "var(--text-primary)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)" };
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
import { useLikes } from "../hooks/useLikes";
import UserName from "../components/UserName";
import { useCreatorIds } from "../hooks/useUserBadges";
import { useNavigate, Link } from "react-router-dom";
import { useNav } from "../lib/NavigationContext";
import { useBookLists } from "../hooks/useBookLists";
import ContentMenu from "../components/ContentMenu";
import Toast from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { useQueryClient } from "@tanstack/react-query";

function LoginModal({ book, onClose, onNavigate }) {
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={S_MODAL_OVERLAY} />
      <div style={S_MODAL_CONTAINER}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "var(--bg-primary)", borderRadius: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.16)", padding: "28px 24px 24px", textAlign: "center" }}>
          {/* Cover */}
          {(book.c || book.cover_url) && (
            <div className="flex justify-center mb-5">
              <img
                src={book.c || book.cover_url}
                alt=""
                style={{ width: 48, height: 72, objectFit: "cover", borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
              />
            </div>
          )}
          <div className="text-[17px] font-semibold font-body mb-1.5 leading-snug" style={{ color: "var(--text-primary)" }}>
            Garde une trace de cette lecture
          </div>
          <div className="text-[13px] font-body mb-6 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            Crée ton profil gratuit en 30 secondes.
          </div>
          <button
            onClick={() => onNavigate("/login")}
            className="w-full py-3 rounded-full text-[14px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150 mb-3"
            style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
          >
            Créer mon profil
          </button>
          <button
            onClick={() => onNavigate("/login")}
            className="w-full bg-transparent border-none cursor-pointer text-[13px] font-body transition-colors duration-150"
            style={{ color: "var(--text-tertiary)" }}
          >
            Déjà un compte ? Se connecter
          </button>
        </div>
      </div>
    </>
  );
}

function EnrichModal({ bookId, onClose, onSaved, initialDescription, initialPages, initialPublisher, initialPubDate, initialCoverUrl }) {
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverMode, setCoverMode] = useState("upload");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverUrlValid, setCoverUrlValid] = useState(null); // null | true | false
  const [coverUrlDebounced, setCoverUrlDebounced] = useState("");
  const [description, setDescription] = useState(initialDescription || "");
  const [pages, setPages] = useState(initialPages ? String(initialPages) : "");
  const [publisher, setPublisher] = useState(initialPublisher || "");
  const [pubDate, setPubDate] = useState(initialPubDate || "");
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    if (coverMode !== "url") return;
    const t = setTimeout(() => setCoverUrlDebounced(coverUrl.trim()), 600);
    return () => clearTimeout(t);
  }, [coverUrl, coverMode]);

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) { setFileError("Format non supporté (jpg/png uniquement)"); return; }
    if (file.size > 2 * 1024 * 1024) { setFileError("Fichier trop lourd (max 2 Mo)"); return; }
    setFileError(null);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (coverMode === "url" && coverUrl.trim() && coverUrlValid !== true) return;
    setSaving(true);
    const updates = {};
    try {
      if (coverMode === "upload" && coverFile) {
        const ext = coverFile.name.split(".").pop();
        const filePath = `${bookId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("book-covers")
          .upload(filePath, coverFile, { contentType: coverFile.type, upsert: true });
        if (!uploadError) {
          const { data } = supabase.storage.from("book-covers").getPublicUrl(filePath);
          const publicUrl = data.publicUrl;
          if (publicUrl) {
            await supabase.from("books").update({ cover_url: publicUrl }).eq("id", bookId);
            updates.cover_url = publicUrl;
          }
        }
      } else if (coverMode === "url" && coverUrlValid === true) {
        await supabase.from("books").update({ cover_url: coverUrl.trim() }).eq("id", bookId);
        updates.cover_url = coverUrl.trim();
      }

      const pubDateStr = pubDate ? String(pubDate).trim() : null;
      if (description.trim()) updates.description = description.trim();
      if (pages && parseInt(pages) > 0) updates.page_count = parseInt(pages);
      if (publisher.trim()) updates.publisher = publisher.trim();
      if (pubDateStr) updates.publication_date = pubDateStr;

      const remainingUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => k !== 'cover_url'));
      if (Object.keys(remainingUpdates).length > 0) {
        await supabase.from("books").update(remainingUpdates).eq("id", bookId);
      }

      onSaved();
    } catch (err) {
      console.error('[EnrichModal] save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const coverHasChange = coverMode === "upload" ? !!coverFile : (coverUrlValid === true);
  const hasContent = coverHasChange || description.trim() || pages || publisher.trim() || pubDate.trim();
  const saveBlocked = coverMode === "url" && coverUrl.trim() && coverUrlValid !== true;

  const S_TAB_ACTIVE = { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)", borderRadius: 20, fontSize: 11, padding: "4px 12px", border: "none", cursor: "pointer", fontFamily: "inherit" };
  const S_TAB_INACTIVE = { backgroundColor: "transparent", color: "#999", borderRadius: 20, fontSize: 11, padding: "4px 12px", border: "1px solid var(--border-default)", cursor: "pointer", fontFamily: "inherit" };

  return (
    <>
      <div onClick={onClose} style={S_MODAL_OVERLAY} />
      <div style={S_MODAL_CONTAINER}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--bg-primary)", borderRadius: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.16)", padding: "28px 24px 24px", maxHeight: "90vh", overflowY: "auto" }}>
          <h2 className="font-display italic text-[20px] font-normal m-0 mb-1">Compléter cette fiche</h2>
          <div className="text-[11px] font-body mb-5" style={{ color: "var(--text-tertiary)" }}>Les modifications sont appliquées immédiatement.</div>

          {/* Couverture */}
          <div className="mb-4">
            <div className="text-[12px] font-body mb-2" style={{ color: "var(--text-tertiary)" }}>Couverture</div>

            {/* Onglets mode */}
            <div className="flex gap-1.5 mb-3">
              <button style={coverMode === "upload" ? S_TAB_ACTIVE : S_TAB_INACTIVE} onClick={() => setCoverMode("upload")}>Importer un fichier</button>
              <button style={coverMode === "url" ? S_TAB_ACTIVE : S_TAB_INACTIVE} onClick={() => setCoverMode("url")}>Coller une URL</button>
            </div>

            {coverMode === "upload" ? (
              <>
                {coverPreview ? (
                  <div className="flex items-start gap-3">
                    <img src={coverPreview} alt="" style={S_COVER_MINI} />
                    <button onClick={() => { setCoverFile(null); setCoverPreview(null); }} className="text-[12px] font-body bg-transparent border-none cursor-pointer transition-colors duration-150 mt-1" style={{ color: "var(--text-tertiary)" }}>Supprimer</button>
                  </div>
                ) : initialCoverUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={initialCoverUrl} alt="" style={S_COVER_MINI} />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="px-3 py-1.5 rounded-md text-[12px] font-body bg-surface hover:bg-tag-bg transition-colors duration-150" style={S_FILE_BTN}>Remplacer</span>
                      <span className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>jpg/png, max 2 Mo</span>
                      <input type="file" accept="image/jpeg,image/png" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="px-3 py-1.5 rounded-md text-[12px] font-body bg-surface hover:bg-tag-bg transition-colors duration-150" style={S_FILE_BTN}>Choisir une image</span>
                    <span className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>jpg/png, max 2 Mo</span>
                    <input type="file" accept="image/jpeg,image/png" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
                {fileError && <div className="text-[11px] text-spoiler font-body mt-1">{fileError}</div>}
              </>
            ) : (
              <>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={e => { setCoverUrl(e.target.value); setCoverUrlValid(null); }}
                  onBlur={() => setCoverUrlDebounced(coverUrl.trim())}
                  placeholder="https://…"
                  className="w-full py-2 px-3 bg-surface border rounded-lg outline-none text-[13px] font-body placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] transition-[border] duration-150"
                  style={{ color: "var(--text-primary)", borderColor: coverUrlValid === false ? "var(--color-error)" : "var(--border-default)" }}
                />
                {coverUrlDebounced && (
                  <div className="mt-2">
                    <img
                      src={coverUrlDebounced}
                      alt=""
                      style={{ ...S_COVER_MINI, display: coverUrlValid === false ? "none" : "block" }}
                      onLoad={() => setCoverUrlValid(true)}
                      onError={() => setCoverUrlValid(false)}
                    />
                    {coverUrlValid === false && (
                      <div className="text-[11px] font-body mt-1" style={{ color: "var(--color-error)" }}>Cette URL ne pointe pas vers une image valide</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Résumé */}
          <div className="mb-4">
            <div className="text-[12px] font-body mb-2" style={{ color: "var(--text-tertiary)" }}>Résumé</div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1000}
              placeholder="Résumé du livre..."
              className="w-full min-h-[100px] p-3 bg-surface border rounded-lg outline-none text-[13px] font-body leading-[1.7] resize-y placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] transition-[border] duration-150"
              style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}
            />
            <div className="text-[11px] font-body text-right mt-0.5" style={{ color: "var(--text-tertiary)" }}>{description.length}/1000</div>
          </div>

          {/* Nombre de pages */}
          <div className="mb-4">
            <div className="text-[12px] font-body mb-2" style={{ color: "var(--text-tertiary)" }}>Nombre de pages</div>
            <input type="number" value={pages} onChange={e => setPages(e.target.value)} min={1} placeholder="ex. 320" className="w-full py-2 px-3 bg-surface border rounded-lg outline-none text-[13px] font-body placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] transition-[border] duration-150" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }} />
          </div>

          {/* Éditeur */}
          <div className="mb-4">
            <div className="text-[12px] font-body mb-2" style={{ color: "var(--text-tertiary)" }}>Éditeur</div>
            <input type="text" value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="ex. Gallimard" className="w-full py-2 px-3 bg-surface border rounded-lg outline-none text-[13px] font-body placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] transition-[border] duration-150" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }} />
          </div>

          {/* Date de publication */}
          <div className="mb-6">
            <div className="text-[12px] font-body mb-2" style={{ color: "var(--text-tertiary)" }}>Date de publication</div>
            <input type="text" value={pubDate} onChange={e => setPubDate(e.target.value)} placeholder='ex. 2024 ou "15 mars 2024"' className="w-full py-2 px-3 bg-surface border rounded-lg outline-none text-[13px] font-body placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] transition-[border] duration-150" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }} />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-body bg-transparent border-none cursor-pointer transition-colors duration-150" style={{ color: "var(--text-tertiary)" }}>Annuler</button>
            <button
              onClick={handleSubmit}
              disabled={!hasContent || saving || saveBlocked}
              className={`px-5 py-2 rounded-lg text-[13px] font-medium font-body border-none transition-all duration-150 ${hasContent && !saving && !saveBlocked ? "cursor-pointer hover:opacity-80" : "bg-avatar-bg cursor-not-allowed"}`}
              style={hasContent && !saving && !saveBlocked ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" } : { color: "var(--text-tertiary)" }}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const BookReviewItem = memo(function BookReviewItem({ rv, liked, initialLiked, toggleLike, showToast, refetchReviews, navigate, anchorRef, creatorIds }) {
  const displayName = rv.users?.display_name || rv.users?.username || "?";
  const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div ref={anchorRef} className="group py-4 border-b border-border-light relative">
      <div className="flex items-center gap-2.5 mb-2">
        <div className={rv.users?.username ? "cursor-pointer" : ""} onClick={() => rv.users?.username && navigate(`/${rv.users.username}`)}>
          <Avatar i={initials} s={26} src={rv.users?.avatar_url} />
        </div>
        <UserName user={rv.users} className="text-[13px]" isCreator={creatorIds?.has(rv.user_id)} />
        {rv.rating > 0 && <Stars r={rv.rating} s={11} />}
        <div className="ml-auto"><ContentMenu type="review" item={rv} onDelete={refetchReviews} onEdit={refetchReviews} /></div>
      </div>
      {rv.contains_spoilers ? (
        <details>
          <summary className="text-[11px] text-spoiler cursor-pointer font-medium font-body">Cette critique contient des spoilers</summary>
          <p className="text-[15px] leading-[1.7] mt-2 font-body" style={{ color: "var(--text-body)" }}>{rv.body}</p>
        </details>
      ) : (
        <p className="text-[15px] leading-[1.7] m-0 font-body" style={{ color: "var(--text-body)" }}>{rv.body}</p>
      )}
      <div className="mt-2 text-[11px] font-body">
        <LikeButton
          count={rv.likes_count || 0}
          liked={liked}
          initialLiked={initialLiked}
          onToggle={() => toggleLike(rv.id, () => showToast("Une erreur est survenue"))}
        />
      </div>
    </div>
  );
});

const BookQuoteItem = memo(function BookQuoteItem({ q, liked, initialLiked, toggleLike, showToast, refetchQuotes, anchorRef, creatorIds }) {
  return (
    <div ref={anchorRef} className="group py-[18px] border-b border-border-light relative">
      <div className="text-[15px] italic leading-[1.7] border-l-[3px] border-l-cover-fallback pl-4 font-display" style={{ color: "var(--text-primary)" }}>
        « {q.text} »
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <UserName user={q.users} className="text-xs" isCreator={creatorIds?.has(q.user_id)} />
        <span className="text-[11px] font-body">
          <LikeButton
            count={q.likes_count || 0}
            liked={liked}
            initialLiked={initialLiked}
            onToggle={() => toggleLike(q.id, () => showToast("Une erreur est survenue"))}
          />
        </span>
        <div className="ml-auto"><ContentMenu type="quote" item={q} onDelete={refetchQuotes} onEdit={refetchQuotes} /></div>
      </div>
    </div>
  );
});

export default function BookPage({ book }) {
  const navigate = useNavigate();
  const bookQueryClient = useQueryClient();
  const { goToBook: go } = useNav();
  const bookId = book._supabase?.id || book.id;
  const { status: dbStatus, loading: statusLoading, alreadyRead, setStatus: dbSetStatus, removeStatus: dbRemoveStatus, updateFields: dbUpdateFields } = useReadingStatus(bookId);
  const { rating: dbRating, setRating: dbSetRating } = useUserRating(bookId);
  const { reviews: dbReviews, loading: reviewsLoading, refetch: refetchReviews } = useBookReviews(bookId);
  const { quotes: dbQuotes, loading: quotesLoading, refetch: refetchQuotes } = useBookQuotes(bookId);
  const { user } = useAuth();
  const creatorIds = useCreatorIds();
  const reviewIds = useMemo(() => dbReviews.map(r => r.id), [dbReviews]);
  const quoteIds = useMemo(() => dbQuotes.map(q => q.id), [dbQuotes]);
  const { likedSet: likedReviews, initialSet: initLikedReviews, toggle: toggleReviewLike } = useLikes(reviewIds, "review");
  const { likedSet: likedQuotes, initialSet: initLikedQuotes, toggle: toggleQuoteLike } = useLikes(quoteIds, "quote");
  const userReview = dbReviews.find(rv => rv.user_id === user?.id && rv.body);
  const { toast, showToast } = useToast();

  // Live book data from Supabase
  const isUuid = typeof bookId === "string" && bookId.includes("-");
  const { lists: bookLists } = useBookLists(isUuid ? bookId : null);
  const avgRating = book.r ?? 0;
  const ratingCount = book.rt ?? 0;
  const bookDescription = book.desc ?? null;
  const displayBook = book;

  const [st, setSt] = useState(null);
  const [ur, setUr] = useState(0);
  const [bt, setBt] = useState("critiques");
  const [showCitationTooltip, setShowCitationTooltip] = useState(false);
  const citationTooltipSeen = useRef(!!localStorage.getItem("reliure_citation_tab_tooltip_seen"));
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewSpoiler, setReviewSpoiler] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [finDate, setFinDate] = useState(null);
  const [noDate, setNoDate] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [isReread, setIsReread] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [loginModal, setLoginModal] = useState(false);
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [enrichToast, setEnrichToast] = useState(false);
  const dateRef = useRef(null);
  const newReviewRef = useRef(null);
  const newQuoteRef = useRef(null);

  const KNOWN_TAGS = ["en vacances", "recommandé par Margaux", "avion CDG-JFK", "relu", "en VO", "café Oberkampf", "métro"];
  const [tagFocused, setTagFocused] = useState(false);
  const [similarBooks, setSimilarBooks] = useState([]);
  useEffect(() => {
    if (!isUuid) return;
    const genres = book.tags?.length ? book.tags : null;
    (async () => {
      let query = supabase
        .from("books")
        .select("id, title, authors, cover_url, slug")
        .neq("id", bookId)
        .order("rating_count", { ascending: false })
        .limit(6);
      if (genres?.length) query = query.filter("genres", "cs", `["${genres[0]}"]`);
      const { data } = await query;
      if (data?.length) setSimilarBooks(data);
    })();
  }, [bookId, isUuid]);

  // Sync from DB on load
  useEffect(() => {
    if (statusLoading) return;
    if (dbStatus) {
      setSt(dbStatus.status === "want_to_read" ? "À lire" : dbStatus.status === "reading" ? "En cours" : dbStatus.status === "read" ? "Lu" : dbStatus.status === "abandoned" ? "Abandonné" : null);
      if (dbStatus.finished_at) {
        setFinDate(dateToLabel(dbStatus.finished_at));
        setNoDate(false);
      } else {
        setFinDate(null);
        setNoDate(dbStatus.status === "read");
      }
      setIsReread(dbStatus.is_reread || false);
    } else {
      setSt(null); setFinDate(null); setNoDate(false); setIsReread(false);
    }
  }, [dbStatus, statusLoading]);

  useEffect(() => { setUr(dbRating); }, [dbRating]);

  // Reset local-only state on book change
  useEffect(() => {
    setBt("critiques"); setNoDate(false);
    setTagInput(""); setTags([]); setTagFocused(false);
  }, [book.id]);

  const showLoginModal = (saveIntent = false) => {
    if (saveIntent) {
      const slug = book._supabase?.slug || book.slug;
      localStorage.setItem("reliure_pending_intent", JSON.stringify({ bookId, bookSlug: slug, action: "want_to_read" }));
    }
    setLoginModal(true);
  };

  // Execute pending intent after login
  useEffect(() => {
    if (!user || statusLoading) return;
    const raw = localStorage.getItem("reliure_pending_intent");
    if (!raw) return;
    try {
      const { bookId: intentId, action } = JSON.parse(raw);
      if (intentId === bookId && action === "want_to_read" && !dbStatus) {
        localStorage.removeItem("reliure_pending_intent");
        setSt("À lire");
        dbSetStatus("want_to_read");
      }
    } catch {
      localStorage.removeItem("reliure_pending_intent");
    }
  }, [user?.id, statusLoading]);

  const STATUS_MAP = { "En cours": "reading", "Lu": "read", "À lire": "want_to_read", "Abandonné": "abandoned" };

  const todayLabel = () => {
    const d = new Date();
    const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const todayISO = new Date().toISOString().split("T")[0];

  const dateToLabel = iso => {
    const d = new Date(iso);
    const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleStatus = s => {
    if (!user) { showLoginModal(s === "À lire"); return; }
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
    if (!user) { showLoginModal(false); return; }
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
    bookQueryClient.invalidateQueries({ queryKey: ["book", book.slug || book._supabase?.slug] });
    bookQueryClient.invalidateQueries({ queryKey: ["profileData"] });
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
    const { data } = await supabase.from("quotes").insert({ user_id: user.id, book_id: bookId, text: quoteText.trim() }).select("id").single();
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
      {toast.visible && <Toast message={toast.message} />}
      {/* Modal connexion requise */}
      {loginModal && <LoginModal book={book} onClose={() => setLoginModal(false)} onNavigate={path => { setLoginModal(false); navigate(path); }} />}

      {/* Modal enrichissement communautaire */}
      {showEnrichModal && (
        <EnrichModal
          bookId={bookId}
          initialDescription={bookDescription}
          initialPages={book.p || book._supabase?.page_count}
          initialPublisher={book._supabase?.publisher}
          initialPubDate={book.y || book._supabase?.publication_date}
          initialCoverUrl={book.c}
          onClose={() => setShowEnrichModal(false)}
          onSaved={() => {
            setShowEnrichModal(false);
            bookQueryClient.invalidateQueries({ queryKey: ["book", book.slug || book._supabase?.slug] });
            setEnrichToast(true);
            setTimeout(() => setEnrichToast(false), 3000);
          }}
        />
      )}

      {/* Toast contribution */}
      {enrichToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "var(--text-primary)", color: "var(--bg-primary)", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontFamily: "inherit", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", whiteSpace: "nowrap" }}>
          Merci pour ta contribution !
        </div>
      )}

      <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer text-[13px] py-4 font-body" style={{ color: "var(--text-tertiary)" }}>
        ← Retour
      </button>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-8 py-2 pb-6 sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <Img book={displayBook} w={180} h={270} />
          {book._supabase?.source === "ai_enriched" && book._supabase?.ai_confidence < 0.7 && (
            <div className="px-2.5 py-1.5 rounded text-[11px] font-body text-center leading-snug max-w-[180px]" style={{ backgroundColor: "var(--color-warn-bg)", border: "1px solid var(--color-warn-border)", color: "var(--text-secondary)" }}>
              ℹ️ Métadonnées générées par IA · Incertaines
            </div>
          )}
        </div>
        <div className="flex-1 pt-1">
          <h1 className="m-0 text-[26px] font-normal leading-tight font-display italic">{book.t}</h1>
          <div className="text-[15px] mt-1.5 font-body" style={{ color: "var(--text-tertiary)" }}>{book.a}</div>
          <div className="text-[13px] mt-1 font-body" style={{ color: "var(--text-tertiary)" }}>{book.y || book.publication_date}{(book.p || book.page_count) ? ` · ${book.p || book.page_count} pages` : ""}</div>

          {/* Modifier la fiche */}
          {user && isUuid && (
            <button
              onClick={() => setShowEnrichModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[13px] font-body border cursor-pointer hover:opacity-80 transition-colors duration-150 mt-3"
              style={{ color: "var(--text-body)", backgroundColor: "var(--tag-bg)", borderColor: "var(--border-default)" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Modifier la fiche
            </button>
          )}

          {/* Rating box — masqué si aucune évaluation */}
          {ratingCount > 0 && avgRating > 0 && (
            <div className="flex items-center gap-3 mt-5 p-3.5 px-[18px] bg-surface rounded-lg">
              <span className="text-[32px] font-bold font-body">{avgRating}</span>
              <div>
                <Stars r={avgRating} s={14} />
                <div className="text-[11px] mt-0.5 font-body" style={{ color: "var(--text-tertiary)" }}>{ratingCount?.toLocaleString("fr-FR")} évaluation{ratingCount > 1 ? "s" : ""}</div>
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
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-[5px] rounded-2xl text-xs bg-tag-bg border font-body" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0" style={{ color: "var(--text-tertiary)" }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="cursor-pointer" onClick={() => dateRef.current?.showPicker()}>{finDate}</span>
                  <input
                    ref={dateRef}
                    type="date"
                    max={todayISO}
                    className="absolute w-0 h-0 opacity-0"
                    onChange={e => {
                      if (!e.target.value) return;
                      if (e.target.value > todayISO) { setDateError(true); setTimeout(() => setDateError(false), 3000); return; }
                      setDateError(false); setFinDate(dateToLabel(e.target.value)); dbUpdateFields({ finished_at: e.target.value });
                    }}
                  />
                  <button onClick={() => { setFinDate(null); setNoDate(true); dbUpdateFields({ finished_at: null }); }} className="bg-transparent border-none cursor-pointer text-[11px] leading-none p-0 ml-0.5 transition-colors duration-150" style={{ color: "var(--text-tertiary)" }}>×</button>
                </span>
              ) : noDate && st === "Lu" ? (
                <>
                  <input
                    ref={dateRef}
                    type="date"
                    max={todayISO}
                    className="absolute w-0 h-0 opacity-0"
                    onChange={e => {
                      if (!e.target.value) return;
                      if (e.target.value > todayISO) { setDateError(true); setTimeout(() => setDateError(false), 3000); return; }
                      setDateError(false); setFinDate(dateToLabel(e.target.value)); setNoDate(false);
                      dbUpdateFields({ finished_at: e.target.value });
                    }}
                  />
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => dateRef.current?.showPicker()}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dateRef.current?.showPicker(); } }}
                    className="text-[12px] font-body cursor-pointer transition-colors duration-150"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Ajouter une date
                  </span>
                </>
              ) : null}

              {/* Reread pill */}
              {alreadyRead && st === "Lu" && (
                isReread ? (
                  <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-[5px] rounded-2xl text-xs bg-tag-bg border font-body" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
                    Relecture
                    <button onClick={() => { setIsReread(false); dbUpdateFields({ is_reread: false }); }} className="bg-transparent border-none cursor-pointer text-[11px] leading-none p-0 ml-0.5 transition-colors duration-150" style={{ color: "var(--text-tertiary)" }}>×</button>
                  </span>
                ) : (
                  <button
                    onClick={() => { setIsReread(true); dbUpdateFields({ is_reread: true }); }}
                    className="inline-flex items-center px-2.5 py-[5px] rounded-2xl text-xs bg-transparent border-[1.5px] border-dashed font-body cursor-pointer hover:border-[var(--text-tertiary)] transition-colors duration-150"
                    style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
                  >
                    + Relecture
                  </button>
                )
              )}
            </div>
            {dateError && <div className="text-[11px] text-spoiler font-body mt-1.5">La date ne peut pas être dans le futur</div>}
          </div>

          {/* User rating */}
          <div className="mt-[18px]">
            <div className="text-xs mb-1.5 font-body" style={{ color: "var(--text-tertiary)" }}>Votre note</div>
            <InteractiveStars value={ur} onChange={handleRating} />
          </div>

          {/* Personal tags */}
          <div className="mt-[18px]">
            <div className="text-xs mb-1.5 font-body" style={{ color: "var(--text-tertiary)" }}>Tags personnels</div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-[5px] rounded-2xl text-xs bg-tag-bg border font-body" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
                    {t}
                    <button
                      onClick={() => setTags(tags.filter(x => x !== t))}
                      className="bg-transparent border-none cursor-pointer text-[11px] leading-none p-0 ml-0.5 transition-colors duration-150"
                      style={{ color: "var(--text-tertiary)" }}
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
                  className="w-full py-2 text-base md:text-[13px] bg-transparent border-b outline-none font-body focus:border-[var(--text-primary)] transition-colors duration-200"
                  style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}
                />
                {tagFocused && tagSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 border rounded-lg overflow-hidden z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
                    {tagSuggestions.map(s => (
                      <div
                        key={s}
                        onMouseDown={e => { e.preventDefault(); addTag(s); }}
                        className="px-3 py-2 text-[13px] font-body cursor-pointer hover:bg-surface transition-colors duration-100"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="text-[11px] mt-1.5 font-body" style={{ color: "var(--text-tertiary)" }}>Visibles uniquement par toi</div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {book.tags?.length > 0 ? (
        <div className="pb-5">
          <Label>Thèmes</Label>
          <div className="flex flex-wrap gap-1">{book.tags.map(t => <Link key={t} to={`/explorer/theme/${encodeURIComponent(t)}`}><Tag>{t}</Tag></Link>)}</div>
        </div>
      ) : user ? (
        <div className="pb-5">
          <button
            onClick={() => setShowEnrichModal(true)}
            className="text-[12px] font-body bg-transparent border-none cursor-pointer transition-colors duration-150 p-0"
            style={{ color: "var(--text-tertiary)" }}
          >
            + Suggérer des thèmes
          </button>
        </div>
      ) : null}

      {/* Description */}
      {(bookDescription || isUuid) && (
        <div className="border-t border-border-light py-5">
          {bookDescription ? (
            <p className="text-[14px] leading-[1.75] m-0 font-body" style={{ color: "var(--text-body)" }}>{bookDescription}</p>
          ) : (
            <button
              onClick={() => setShowEnrichModal(true)}
              className="text-[13px] font-body bg-transparent border-none cursor-pointer transition-colors duration-150 p-0"
              style={{ color: "var(--text-tertiary)" }}
            >
              + Suggérer un résumé
            </button>
          )}
        </div>
      )}

      {/* Où lire */}
      <div className="border-t border-border-light py-5">
        <Label>Où lire</Label>
        <div className="flex gap-2 items-center">
          {["Fnac", "Amazon"].map(s => (
            <span key={s} className="text-[11px] py-1.5 px-3 rounded-md bg-surface cursor-pointer border font-body" style={{ color: "var(--text-secondary)", borderColor: "var(--border-default)" }}>
              {s}
            </span>
          ))}
          <div className="w-px h-5 mx-1" style={{ backgroundColor: "var(--border-default)" }} />
          {["Bibliothèque", "Kindle", "Audible"].map(s => (
            <span key={s} className="text-[11px] py-1.5 px-3 rounded-md bg-surface cursor-pointer border font-body" style={{ color: "var(--text-secondary)", borderColor: "var(--border-default)" }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Dans des listes */}
      {bookLists.length > 0 && (
        <div className="border-t border-border-light py-5">
          <Label>Dans des listes</Label>
          <HScroll>
            {bookLists.map(l => (
              <div
                key={l.id}
                className="min-w-[155px] cursor-pointer group"
                onClick={() => navigate(`/${l.users?.username}/listes/${l.slug}`)}
              >
                <div className="flex gap-1 p-2 bg-surface rounded-lg mb-2 group-hover:bg-tag-bg transition-colors duration-150">
                  {l.previewCovers.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-[43px] h-[64px] object-cover rounded-[2px] shrink-0 bg-cover-fallback" />
                  ))}
                  {Array.from({ length: Math.max(0, 3 - l.previewCovers.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-[43px] h-[64px] rounded-[2px] bg-cover-fallback shrink-0" />
                  ))}
                </div>
                <div className="text-[13px] font-medium font-body leading-snug overflow-hidden text-ellipsis whitespace-nowrap max-w-[155px]">{l.title}</div>
                <div className="text-[11px] font-body mt-0.5" style={{ color: "var(--text-tertiary)" }}>@{l.users?.username} · {l.bookCount} livre{l.bookCount !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </HScroll>
        </div>
      )}

      {/* Tabs */}
      <div className="border-t border-border-light">
        <div className="flex">
          {["critiques", "citations", "éditions"].map(t => (
            <div key={t} className="flex-1 relative">
              <button
                onClick={() => setBt(t)}
                onMouseEnter={() => {
                  if (t === "citations" && !citationTooltipSeen.current) {
                    citationTooltipSeen.current = true;
                    localStorage.setItem("reliure_citation_tab_tooltip_seen", "1");
                    setShowCitationTooltip(true);
                    setTimeout(() => setShowCitationTooltip(false), 2500);
                  }
                }}
                className={`w-full py-3 bg-transparent border-none cursor-pointer text-xs capitalize font-body ${
                  bt === t
                    ? "font-semibold border-b-2"
                    : "font-normal border-b-2 border-b-transparent"
                }`}
                style={bt === t ? { color: "var(--text-primary)", borderBottomColor: "var(--text-primary)" } : { color: "var(--text-tertiary)" }}
              >
                {t}{t === "citations" && dbQuotes.length > 0 ? ` (${dbQuotes.length})` : ""}
              </button>
              {t === "citations" && showCitationTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-[11px] font-body px-2.5 py-1.5 rounded-md pointer-events-none" style={{ zIndex: 50, backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}>
                  Sauvegarde tes phrases préférées
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: "var(--text-primary)" }} />
                </div>
              )}
            </div>
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
                className="w-full mb-4 py-2.5 rounded-lg border-[1.5px] border-dashed bg-transparent cursor-pointer text-[13px] font-body transition-colors duration-200 hover:border-[var(--text-tertiary)]"
                style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
              >
                {userReview ? "Modifier ma critique" : "+ Écrire une critique"}
              </button>
            ) : (
              <div className="mb-4 p-4 bg-surface rounded-lg">
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Qu'avez-vous pensé de ce livre ?"
                  className="w-full min-h-[120px] p-3 border rounded-lg outline-none text-base md:text-sm font-body leading-[1.7] resize-y placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] transition-[border] duration-150"
                  style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", borderColor: "var(--border-default)" }}
                />
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={reviewSpoiler} onChange={e => setReviewSpoiler(e.target.checked)} className="accent-[var(--text-primary)]" />
                  <span className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>Cette critique contient des spoilers</span>
                </label>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handlePublishReview}
                    disabled={!reviewText.trim() || reviewSaving}
                    className={`px-4 py-2 rounded-lg text-[13px] font-medium font-body border-none transition-all duration-150 ${
                      reviewText.trim() && !reviewSaving
                        ? "cursor-pointer hover:opacity-80"
                        : "bg-avatar-bg cursor-not-allowed"
                    }`}
                    style={reviewText.trim() && !reviewSaving ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" } : { color: "var(--text-tertiary)" }}
                  >
                    {reviewSaving ? "Publication..." : "Publier"}
                  </button>
                  <button
                    onClick={() => { setShowReviewForm(false); setReviewText(""); setReviewSpoiler(false); }}
                    className="px-4 py-2 text-[13px] font-body bg-transparent border-none cursor-pointer transition-colors duration-150"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {user && !showReviewForm && (
              <div className="text-center mb-4 -mt-1">
                <button
                  onClick={() => setBt("citations")}
                  className="text-[12px] font-body bg-transparent border-none cursor-pointer transition-colors duration-150"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Tu as une phrase marquante ? → Ajouter une citation
                </button>
              </div>
            )}

            {/* Reviews list */}
            {reviewsLoading ? (
              <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Chargement...</div>
            ) : dbReviews.length > 0 ? (
              (() => {
                const ownReviewIdx = dbReviews.findIndex(r => r.user_id === user?.id);
                return dbReviews.map((rv, i) => (
                  <BookReviewItem
                    key={rv.id}
                    rv={rv}
                    liked={likedReviews.has(rv.id)}
                    initialLiked={initLikedReviews.has(rv.id)}
                    toggleLike={toggleReviewLike}
                    showToast={showToast}
                    refetchReviews={refetchReviews}
                    navigate={navigate}
                    anchorRef={i === ownReviewIdx ? newReviewRef : null}
                    creatorIds={creatorIds}
                  />
                ));
              })()
            ) : (
              <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Pas encore de critiques. Soyez le premier !</div>
            )}
          </div>
        )}

        {bt === "citations" && (
          <div>
            {/* Quote form */}
            {!showQuoteForm ? (
              <button
                onClick={() => setShowQuoteForm(true)}
                className="w-full mb-4 py-2.5 rounded-lg border-[1.5px] border-dashed bg-transparent cursor-pointer text-[13px] font-body transition-colors duration-200 hover:border-[var(--text-tertiary)]"
                style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
              >
                + Ajouter une citation
              </button>
            ) : (
              <div className="mb-4 p-4 bg-surface rounded-lg">
                <textarea
                  value={quoteText}
                  onChange={e => setQuoteText(e.target.value)}
                  placeholder="Copiez un passage du livre..."
                  className="w-full min-h-[80px] p-3 border rounded-lg outline-none text-base md:text-[15px] font-display italic leading-[1.7] resize-y placeholder:text-[var(--text-tertiary)] placeholder:not-italic placeholder:font-body focus:border-[var(--text-tertiary)] transition-[border] duration-150"
                  style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", borderColor: "var(--border-default)" }}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handlePublishQuote}
                    disabled={!quoteText.trim() || quoteSaving}
                    className={`px-4 py-2 rounded-lg text-[13px] font-medium font-body border-none transition-all duration-150 ${
                      quoteText.trim() && !quoteSaving
                        ? "cursor-pointer hover:opacity-80"
                        : "bg-avatar-bg cursor-not-allowed"
                    }`}
                    style={quoteText.trim() && !quoteSaving ? { backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" } : { color: "var(--text-tertiary)" }}
                  >
                    {quoteSaving ? "Publication..." : "Publier"}
                  </button>
                  <button
                    onClick={() => { setShowQuoteForm(false); setQuoteText(""); }}
                    className="px-4 py-2 text-[13px] font-body bg-transparent border-none cursor-pointer transition-colors duration-150"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Quotes list */}
            {quotesLoading ? (
              <div className="py-6 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Chargement...</div>
            ) : dbQuotes.length > 0 ? (
              (() => {
                const ownQuoteIdx = dbQuotes.findIndex(qt => qt.user_id === user?.id);
                return dbQuotes.map((q, i) => (
                  <BookQuoteItem
                    key={q.id}
                    q={q}
                    liked={likedQuotes.has(q.id)}
                    initialLiked={initLikedQuotes.has(q.id)}
                    toggleLike={toggleQuoteLike}
                    showToast={showToast}
                    refetchQuotes={refetchQuotes}
                    anchorRef={i === ownQuoteIdx ? newQuoteRef : null}
                    creatorIds={creatorIds}
                  />
                ));
              })()
            ) : (
              <div className="py-8 text-center">
                <div className="text-[14px] font-body mb-1" style={{ color: "var(--text-tertiary)" }}>Aucune citation pour ce livre.</div>
                <div className="text-[13px] font-body mb-4" style={{ color: "var(--text-tertiary)" }}>Tu as une phrase marquante à partager ?</div>
                {user && !showQuoteForm && (
                  <button
                    onClick={() => setShowQuoteForm(true)}
                    className="px-5 py-2 rounded-full text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
                    style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
                  >
                    + Ajouter une citation
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {bt === "éditions" && (
          <div className="flex gap-2.5">
            {[{ l: "Poche", p: "Folio", y: "2008" }, { l: "Relié", p: "Gallimard", y: "2004" }, { l: "Audio", p: "Audible", y: "2019" }].map((e, i) => (
              <div key={i} className="p-3.5 px-4 bg-surface rounded-lg flex-1 cursor-pointer hover:bg-tag-bg">
                <div className="text-[13px] font-semibold font-body">{e.l}</div>
                <div className="text-xs mt-[3px] font-body" style={{ color: "var(--text-tertiary)" }}>{e.p} · {e.y}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Also liked */}
      {similarBooks.length > 0 && (
        <div className="border-t border-border-light py-6">
          <Label>Les lecteurs ont aussi aimé</Label>
          <HScroll>
            {similarBooks.map(b => {
              const sb = { id: b.id, t: b.title, a: Array.isArray(b.authors) ? b.authors.join(", ") : (b.authors || ""), c: b.cover_url, slug: b.slug };
              return (
                <div key={b.id} className="text-center min-w-[100px]">
                  <Img book={sb} w={100} h={150} onClick={() => go(sb)} />
                  <div className="text-[10px] font-medium mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px] font-body">{b.title}</div>
                </div>
              );
            })}
          </HScroll>
        </div>
      )}
    </div>
  );
}
