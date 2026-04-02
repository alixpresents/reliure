import { useState, useEffect, useRef, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import Img from "../components/Img";
import Avatar from "../components/Avatar";
import Tag from "../components/Tag";
import Heading from "../components/Heading";
import Label from "../components/Label";
import HScroll from "../components/HScroll";
import LikeButton from "../components/LikeButton";
import Stars from "../components/Stars";
import UserName from "../components/UserName";
import { useCreatorIds } from "../hooks/useUserBadges";
import ContentMenu from "../components/ContentMenu";
import { useNav } from "../lib/NavigationContext";
import { useNavigate } from "react-router-dom";
import { useBabelioPopular, usePopularReviews, usePopularQuotes, usePopularLists } from "../hooks/useExplore";
import { useClassement } from "../hooks/useClassement";
import { searchBooks } from "../lib/googleBooks";
import { importBook } from "../lib/importBook";
import Toast from "../components/Toast";
import { useToast } from "../hooks/useToast";

const THEMES_PRINCIPAUX = [
  'Roman', 'Littérature française', 'Manga', 'Science-fiction',
  'Thriller', 'Philosophie', 'Poésie', 'Essai', 'Fantasy',
  'Roman historique', 'Autobiographie', 'Littérature japonaise',
  'Dystopie', 'Littérature américaine', 'Littérature russe',
  'Policier', 'Développement personnel', 'Biographie', 'Théâtre', 'Conte',
];
import { useLikes } from "../hooks/useLikes";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../lib/AuthContext";
import { useCuratedSelections } from "../hooks/useCuratedSelections";
import CuratedSelectionCard from "../components/CuratedSelectionCard";

function normalizeQuoteBook(q) {
  if (!q.books) return null;
  return { id: q.book_id, t: q.books.title, a: Array.isArray(q.books.authors) ? q.books.authors.join(", ") : "", c: q.books.cover_url, slug: q.books.slug, _supabase: q.books };
}

const ExploreReviewItem = memo(function ExploreReviewItem({ rv, liked, initialLiked, toggleLike, go, showToast, refetchReviews, creatorIds }) {
  const bookObj = rv.books ? {
    id: rv.book_id, t: rv.books.title,
    a: Array.isArray(rv.books.authors) ? rv.books.authors.join(", ") : (rv.books.authors || ""),
    c: rv.books.cover_url,
    y: rv.books.publication_date ? parseInt(rv.books.publication_date) : null,
    slug: rv.books.slug, _supabase: rv.books,
  } : null;
  return (
    <div className="group flex gap-3.5 py-5 border-b border-[var(--border-subtle)] relative">
      {bookObj && <Img book={bookObj} w={72} h={108} onClick={() => go(bookObj)} className="shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            {bookObj && <div className="text-[15px] font-medium font-body">{bookObj.t}</div>}
            {bookObj && <div className="text-xs font-body mt-0.5" style={{ color: "var(--text-tertiary)" }}>{bookObj.a}{bookObj.y ? `, ${bookObj.y}` : ""}</div>}
          </div>
          <ContentMenu type="review" item={rv} onDelete={refetchReviews} onEdit={refetchReviews} />
        </div>
        {rv.rating > 0 && <div className="mt-1"><Stars r={rv.rating} s={11} /></div>}
        <div className="mt-1.5">
          {rv.contains_spoilers ? (
            <details>
              <summary className="text-[11px] text-spoiler cursor-pointer font-medium font-body">Cette critique contient des spoilers</summary>
              <p className="text-[14px] leading-[1.65] mt-1 font-body m-0" style={{ color: "var(--text-body)" }}>{rv.body}</p>
            </details>
          ) : (
            <p className="text-[14px] leading-[1.65] font-body m-0" style={{ color: "var(--text-body)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{rv.body}</p>
          )}
        </div>
        <div className="flex items-center gap-1 mt-2 text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
          <UserName user={rv.users} className="text-xs" isCreator={creatorIds?.has(rv.user_id)} />
          <span>·</span>
          <LikeButton
            count={rv.likes_count || 0}
            liked={liked}
            initialLiked={initialLiked}
            onToggle={() => toggleLike(rv.id, () => showToast("Une erreur est survenue"))}
          />
        </div>
      </div>
    </div>
  );
});

const ExploreQuoteItem = memo(function ExploreQuoteItem({ q, liked, initialLiked, toggleLike, go, showToast, refetchQuotes, creatorIds }) {
  const bookObj = normalizeQuoteBook(q);
  return (
    <div className="group py-4 border-b border-border-light relative">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[15px] italic leading-[1.7] border-l-[3px] border-l-cover-fallback pl-3.5 mb-2.5 font-display flex-1" style={{ color: "var(--text-primary)" }}>
          « {q.text} »
        </div>
        <ContentMenu type="quote" item={q} onDelete={refetchQuotes} onEdit={refetchQuotes} />
      </div>
      <div className="flex items-center gap-2">
        {bookObj && <Img book={bookObj} w={24} h={34} onClick={() => go(bookObj)} />}
        {bookObj && <span className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>{bookObj.t}</span>}
        <span className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>· <UserName user={q.users} className="text-[11px]" isCreator={creatorIds?.has(q.user_id)} /></span>
        <LikeButton
          count={q.likes_count || 0}
          liked={liked}
          initialLiked={initialLiked}
          onToggle={() => toggleLike(q.id, () => showToast("Une erreur est survenue"))}
          className="ml-auto text-[11px] font-body"
        />
      </div>
    </div>
  );
});

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const searchTimer = useRef(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const { goToBook: go } = useNav();
  const navigate = useNavigate();
  const { user } = useAuth();
  const creatorIds = useCreatorIds();
  const { books: babelioBooks, loading: loadingBabelio } = useBabelioPopular();
  const { reviews, loading: loadingReviews, refetch: refetchReviews } = usePopularReviews();
  const { quotes, loading: loadingQuotes, refetch: refetchQuotes } = usePopularQuotes();
  const { lists, loading: loadingLists } = usePopularLists();
  const { rankings: top3, loading: loadingRanking } = useClassement("alltime", null);
  const { data: curatedSelections } = useCuratedSelections();
  const reviewIds = useMemo(() => reviews.map(r => r.id), [reviews]);
  const quoteIds = useMemo(() => quotes.map(q => q.id), [quotes]);
  const listIds = useMemo(() => lists.map(l => l.id), [lists]);
  const { likedSet: likedReviews, initialSet: initLikedReviews, toggle: toggleReviewLike } = useLikes(reviewIds, "review");
  const { likedSet, initialSet, toggle: toggleQuoteLike } = useLikes(quoteIds, "quote");
  const { likedSet: likedLists, initialSet: initLikedLists, toggle: toggleListLike } = useLikes(listIds, "list");
  const { toast, showToast } = useToast();

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query || query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      const results = await searchBooks(query);
      setSearchResults(results);
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    if (!showResults) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showResults]);

  // Close on Escape
  useEffect(() => {
    if (!showResults) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showResults]);

  const handleResultClick = async (gb) => {
    if (importing) return;

    // DB result — navigate directly
    if (gb._source === "db") {
      setShowResults(false);
      setQuery("");
      navigate(`/livre/${gb.slug ?? gb.dbId}`);
      return;
    }

    // BnF or Google Books — import then navigate
    setImporting(gb.googleId ?? gb.isbn13 ?? gb.title);
    const book = await importBook(gb);
    setImporting(null);

    if (book) {
      setShowResults(false);
      setQuery("");
      setSearchResults([]);
      if (book.slug) navigate(`/livre/${book.slug}`);
      else if (book.id) navigate(`/livre/${book.id}`);
    }
  };

  const hasResults = query.length >= 2 && (searchResults.length > 0 || searchLoading);
  const showDropdown = showResults && query.length >= 2;

  const allEmpty = !loadingBabelio && !loadingReviews && !loadingQuotes && !loadingLists && babelioBooks.length === 0 && reviews.length === 0 && quotes.length === 0 && lists.length === 0;

  return (
    <div>
      {toast.visible && <Toast message={toast.message} />}
      {/* Hero — visiteurs non connectés uniquement */}
      {!user && (
        <div className="pt-8 pb-6 mb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h1 className="font-display italic text-[22px] sm:text-[26px] font-normal leading-snug mb-2" style={{ color: "var(--text-primary)" }}>
            La bibliothèque personnelle des lecteurs francophones.
          </h1>
          <p className="text-[14px] font-body mb-5" style={{ color: "var(--text-tertiary)" }}>
            Garde une trace de tes lectures, découvre celles de tes amis.
          </p>
          <Link
            to="/login"
            className="inline-block px-5 py-2.5 rounded-full text-[13px] font-medium font-body no-underline hover:opacity-80 transition-colors duration-150"
            style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
          >
            Créer mon profil gratuit
          </Link>
        </div>
      )}

      {/* Search bar */}
      <div className="py-6 pb-5">
        <div ref={wrapperRef} className="relative">
          <div className="rounded-lg py-[11px] px-4 flex items-center gap-2.5 transition-[border] duration-150" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" className="shrink-0">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setShowResults(true); }}
              onFocus={() => { if (query.length >= 2) setShowResults(true); }}
              placeholder="Chercher des livres, auteurs, thèmes..."
              aria-label="Rechercher"
              className="flex-1 bg-transparent border-none outline-none font-body placeholder:text-[var(--text-tertiary)] min-w-0"
              style={{ fontSize: 16, color: "var(--text-primary)" }}
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setSearchResults([]); setShowResults(false); inputRef.current?.focus(); }}
                className="bg-transparent border-none cursor-pointer p-0.5 shrink-0 transition-colors duration-150"
                style={{ color: "var(--text-tertiary)" }}
                aria-label="Effacer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {showDropdown && (
            <div
              className="absolute left-0 right-0 overflow-hidden"
              style={{
                top: "calc(100% + 4px)",
                backgroundColor: "var(--bg-primary)",
                border: "0.5px solid var(--border-default)",
                borderRadius: 12,
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                maxHeight: 360,
                overflowY: "auto",
                zIndex: 100,
              }}
            >
              {searchLoading && searchResults.length === 0 && (
                <div className="py-5 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Recherche...</div>
              )}
              {!searchLoading && query.length >= 2 && searchResults.length === 0 && (
                <div className="py-5 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>Aucun résultat.</div>
              )}
              {searchResults.map(gb => {
                const itemKey = gb.googleId ?? (gb._source === "db" ? `db:${gb.dbId}` : `bnf:${gb.isbn13 ?? gb.title}`);
                const isImporting = importing === itemKey;
                return (
                  <div
                    key={itemKey}
                    onClick={() => handleResultClick(gb)}
                    className={`flex gap-3 py-2.5 px-4 items-center transition-colors duration-100 ${isImporting ? "opacity-50" : "cursor-pointer hover:bg-surface"}`}
                  >
                    {gb.coverUrl ? (
                      <img src={gb.coverUrl} alt="" className="object-cover rounded-sm shrink-0 bg-cover-fallback" style={{ width: 28, height: 42 }} />
                    ) : (
                      <div className="rounded-sm bg-cover-fallback shrink-0" style={{ width: 28, height: 42 }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium font-body truncate">{gb.title}</div>
                      <div className="text-[12px] font-body truncate" style={{ color: "var(--text-tertiary)" }}>
                        {gb.authors?.join(", ")}{gb.publishedDate ? ` · ${gb.publishedDate.slice(0, 4)}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tags — liste curatée */}
      <div className="mb-6">
        <Label>Parcourir par thème</Label>
        <div className="flex flex-wrap gap-1">
          {THEMES_PRINCIPAUX.map(t => <Link key={t} to={`/explorer/theme/${encodeURIComponent(t)}`}><Tag>{t}</Tag></Link>)}
        </div>
      </div>

      {/* Empty state */}
      {allEmpty && (
        <div className="py-16 text-center">
          <div className="text-[15px] font-body leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            Reliure se remplit au fil des lectures.<br />
            Ajoute ton premier livre pour commencer.
          </div>
          <button
            onClick={() => inputRef.current?.focus()}
            className="mt-5 px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
            style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
          >
            Chercher un livre
          </button>
        </div>
      )}

      {/* Plébiscités par les lecteurs francophones (Babelio) */}
      {loadingBabelio && (
        <div className="border-t border-border-light py-6">
          <Heading>Plébiscités par les lecteurs francophones</Heading>
          <HScroll>
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="min-w-[130px]">
                <Skeleton.Cover w={130} h={195} />
                <Skeleton.Text width={80} height={12} className="mt-2" />
                <Skeleton.Text width={56} height={10} className="mt-1" />
              </div>
            ))}
          </HScroll>
        </div>
      )}
      {!loadingBabelio && babelioBooks.length > 0 && (
        <div className="border-t border-border-light py-6">
          <Heading>Plébiscités par les lecteurs francophones</Heading>
          <div className="text-[11px] font-body mb-3" style={{ color: "var(--text-tertiary)" }}>
            Sélection d'après les classements Babelio
          </div>
          <HScroll>
            {babelioBooks.map((book, i) => {
              const years = book._supabase?.babelio_popular_year;
              const multiYear = Array.isArray(years) && years.length > 1;
              return (
                <div key={book.id} className="text-center min-w-[130px]">
                  <div className="relative inline-block">
                    <Img book={book} w={130} h={195} onClick={() => go(book)} />
                    <div className="absolute top-1.5 left-1.5 w-[22px] h-[22px] rounded-full bg-black/70 backdrop-blur-[4px] flex items-center justify-center text-[10px] font-bold text-white font-body z-2">
                      {i + 1}
                    </div>
                    {multiYear && (
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-[4px] text-[9px] font-medium text-white font-body leading-none">
                        ×{years.length} ans
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-medium mt-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[130px] font-body">{book.t}</div>
                  <div className="text-[11px] mt-[1px] font-body" style={{ color: "var(--text-tertiary)" }}>{book.a.split(" ").pop()}</div>
                </div>
              );
            })}
          </HScroll>
        </div>
      )}

      {/* Sélections */}
      {curatedSelections && curatedSelections.length > 0 && (
        <div className="border-t border-border-light py-6">
          <Heading right={<Link to="/selections" className="text-[13px] font-body no-underline hover:underline" style={{ color: "var(--text-muted)" }}>Tout voir ›</Link>}>
            Sélections
          </Heading>
          <HScroll>
            {curatedSelections.map(s => (
              <CuratedSelectionCard key={s.id} selection={s} variant="compact" />
            ))}
          </HScroll>
        </div>
      )}

      {/* Critiques populaires */}
      {loadingReviews && (
        <div className="border-t border-border-light py-6">
          <Heading>Critiques populaires</Heading>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3.5 py-5 border-b border-[var(--border-subtle)]">
              <Skeleton.Cover w={72} h={108} />
              <div className="flex-1 flex flex-col gap-2 pt-0.5">
                <Skeleton.Text width="60%" height={14} />
                <Skeleton.Text width="40%" height={11} />
                <Skeleton className="w-full rounded-[3px]" style={{ height: 48 }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {!loadingReviews && reviews.length > 0 && (
        <div className="border-t border-border-light py-6">
          <Heading>Critiques populaires</Heading>
          {reviews.map(rv => (
            <ExploreReviewItem
              key={rv.id}
              rv={rv}
              liked={likedReviews.has(rv.id)}
              initialLiked={initLikedReviews.has(rv.id)}
              toggleLike={toggleReviewLike}
              go={go}
              showToast={showToast}
              refetchReviews={refetchReviews}
              creatorIds={creatorIds}
            />
          ))}
        </div>
      )}

      {/* Citations populaires */}
      {loadingQuotes && (
        <div className="border-t border-border-light py-6">
          <Heading>Citations populaires</Heading>
          {[1, 2, 3].map(i => (
            <div key={i} className="py-4 border-b border-border-light">
              <Skeleton className="w-full rounded-[3px] mb-2.5" style={{ height: 48 }} />
              <div className="flex items-center gap-2">
                <Skeleton.Cover w={24} h={34} />
                <Skeleton.Text width={96} height={11} />
              </div>
            </div>
          ))}
        </div>
      )}
      {!loadingQuotes && quotes.length > 0 && (
        <div className="border-t border-border-light py-6">
          <Heading>Citations populaires</Heading>
          {quotes.map(q => (
            <ExploreQuoteItem
              key={q.id}
              q={q}
              liked={likedSet.has(q.id)}
              initialLiked={initialSet.has(q.id)}
              toggleLike={toggleQuoteLike}
              go={go}
              showToast={showToast}
              refetchQuotes={refetchQuotes}
              creatorIds={creatorIds}
            />
          ))}
        </div>
      )}

      {/* Listes populaires */}
      {loadingLists && (
        <div className="border-t border-border-light py-6">
          <Heading>Listes populaires</Heading>
          {[1, 2].map(i => (
            <div key={i} className="py-5 border-b border-border-light">
              <div className="flex gap-2 mb-3.5 p-3.5 px-4 bg-surface rounded-lg">
                {[1, 2, 3, 4].map(j => <Skeleton.Cover key={j} w={68} h={102} />)}
              </div>
              <Skeleton.Text width={160} height={14} />
              <Skeleton.Text width={112} height={11} className="mt-2" />
            </div>
          ))}
        </div>
      )}
      {/* Top contributeurs */}
      {!loadingRanking && top3.length > 0 && (
        <div className="border-t border-border-light py-6">
          <div className="flex items-baseline justify-between mb-4">
            <span className="font-display italic text-[18px] font-normal" style={{ color: "var(--text-primary)" }}>Top contributeurs</span>
            <Link to="/classement" className="text-[12px] font-body no-underline hover:underline" style={{ color: "var(--text-tertiary)" }}>
              Voir le classement ›
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {top3.slice(0, 3).map((entry, i) => {
              const name = entry.display_name || entry.username || "?";
              const ini = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div key={entry.user_id} className="flex items-center gap-3">
                  <span className="font-display italic text-[14px] shrink-0" style={{ color: i === 0 ? "#C9A84C" : "var(--text-muted)", minWidth: 20 }}>{i + 1}</span>
                  <Link to={`/${entry.username}`} className="shrink-0">
                    <Avatar i={ini} s={30} src={entry.avatar_url || null} />
                  </Link>
                  <Link to={`/${entry.username}`} className="flex-1 min-w-0 text-[13px] font-medium font-body no-underline hover:underline truncate" style={{ color: "var(--text-primary)" }}>
                    {name}
                  </Link>
                  <span className="text-[12px] font-body shrink-0" style={{ color: "var(--text-muted)" }}>{entry.total_points} {entry.total_points > 1 ? "points" : "point"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loadingLists && lists.length > 0 && (
        <div className="border-t border-border-light py-6">
          <Heading>Listes populaires</Heading>
          {lists.map(l => {
            const listUrl = `/${l.username}/listes/${l.slug}`;
            const userName = l.display_name || l.username || "?";
            const initials = userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(listUrl)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(listUrl); } }}
                className="py-5 border-b border-border-light cursor-pointer hover:bg-surface transition-colors duration-100"
              >
                <div className="flex gap-2 mb-3.5 p-3.5 px-4 bg-surface rounded-lg overflow-x-auto">
                  {(l.covers || []).map((url, i) => (
                    <img key={i} src={url} alt="" className="w-[68px] h-[102px] rounded-[3px] object-cover shrink-0" style={{ boxShadow: "var(--shadow-cover)" }} />
                  ))}
                  {l.book_count > 4 && (
                    <div className="w-[68px] h-[102px] rounded-[3px] bg-avatar-bg flex items-center justify-center text-xs shrink-0 font-body" style={{ color: "var(--text-tertiary)" }}>
                      +{l.book_count - 4}
                    </div>
                  )}
                </div>
                <div className="text-base font-medium font-body">{l.title}</div>
                {l.description && (
                  <div className="text-[13px] font-body mt-1 leading-snug" style={{ color: "var(--text-secondary)" }}>
                    {l.description.length > 80 ? l.description.slice(0, 80) + "…" : l.description}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-[5px]">
                  <Avatar i={initials} s={20} />
                  <span className="text-xs font-body font-medium" style={{ color: "var(--text-primary)" }}>{userName}</span>
                  <span className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>· {l.book_count} livres</span>
                  <span className="text-xs font-body" onClick={e => e.stopPropagation()}>
                    <LikeButton
                      count={l.likes_count || 0}
                      liked={likedLists.has(l.id)}
                      initialLiked={initLikedLists.has(l.id)}
                      onToggle={() => toggleListLike(l.id, () => showToast("Une erreur est survenue"))}
                    />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
