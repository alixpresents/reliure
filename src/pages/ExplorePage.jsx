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
import ContentMenu from "../components/ContentMenu";
import { useNav } from "../lib/NavigationContext";
import { useNavigate } from "react-router-dom";
import { usePopularBooks, usePopularReviews, usePopularQuotes, usePopularLists } from "../hooks/useExplore";
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

function normalizeQuoteBook(q) {
  if (!q.books) return null;
  return { id: q.book_id, t: q.books.title, a: Array.isArray(q.books.authors) ? q.books.authors.join(", ") : "", c: q.books.cover_url, slug: q.books.slug, _supabase: q.books };
}

export default function ExplorePage({ onSearch }) {
  const { goToBook: go } = useNav();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { books: popular, loading: loadingBooks } = usePopularBooks();
  const { reviews, loading: loadingReviews, refetch: refetchReviews } = usePopularReviews();
  const { quotes, loading: loadingQuotes, refetch: refetchQuotes } = usePopularQuotes();
  const { lists, loading: loadingLists } = usePopularLists();
  const { likedSet: likedReviews, initialSet: initLikedReviews, toggle: toggleReviewLike } = useLikes(reviews.map(r => r.id), "review");
  const { likedSet, initialSet, toggle: toggleQuoteLike } = useLikes(quotes.map(q => q.id), "quote");
  const { likedSet: likedLists, initialSet: initLikedLists, toggle: toggleListLike } = useLikes(lists.map(l => l.id), "list");
  const { toast, showToast } = useToast();

  const allEmpty = !loadingBooks && !loadingReviews && !loadingQuotes && !loadingLists && popular.length === 0 && reviews.length === 0 && quotes.length === 0 && lists.length === 0;

  return (
    <div>
      {toast.visible && <Toast message={toast.message} />}
      {/* Hero — visiteurs non connectés uniquement */}
      {!user && (
        <div className="pt-8 pb-6 border-b border-[#f0f0f0] mb-2">
          <h1 className="font-display italic text-[22px] sm:text-[26px] font-normal text-[#1a1a1a] leading-snug mb-2">
            La bibliothèque personnelle des lecteurs francophones.
          </h1>
          <p className="text-[14px] text-[#767676] font-body mb-5">
            Garde une trace de tes lectures, découvre celles de tes amis.
          </p>
          <Link
            to="/login"
            className="inline-block px-5 py-2.5 rounded-full bg-[#1a1a1a] text-white text-[13px] font-medium font-body no-underline hover:bg-[#333] transition-colors duration-150"
          >
            Créer mon profil gratuit
          </Link>
        </div>
      )}

      {/* Search bar */}
      <div className="py-6 pb-5">
        <div
          role="button"
          tabIndex={0}
          onClick={onSearch}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSearch(); } }}
          aria-label="Rechercher"
          className="bg-surface rounded-lg py-[11px] px-4 flex items-center gap-2.5 border border-[#eee] cursor-pointer hover:border-[#eee] transition-[border] duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0f0f0" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-[#767676] text-sm font-body">Chercher des livres, auteurs, tags...</span>
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
          <div className="text-[15px] text-[#767676] font-body leading-relaxed">
            Reliure se remplit au fil des lectures.<br />
            Ajoute ton premier livre pour commencer.
          </div>
          <button
            onClick={onSearch}
            className="mt-5 px-5 py-2.5 rounded-[20px] text-[13px] font-medium font-body bg-[#1a1a1a] text-white border-none cursor-pointer hover:bg-[#333] transition-colors duration-150"
          >
            Chercher un livre
          </button>
        </div>
      )}

      {/* Populaires cette semaine */}
      {loadingBooks && (
        <div className="border-t border-border-light py-6">
          <Heading>Populaires cette semaine</Heading>
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
      {!loadingBooks && popular.length > 0 && (
        <div className="border-t border-border-light py-6">
          <Heading>Populaires cette semaine</Heading>
          <HScroll>
            {popular.map((book, i) => (
              <div key={book.id} className="text-center min-w-[130px]">
                <div className="relative inline-block">
                  <Img book={book} w={130} h={195} onClick={() => go(book)} />
                  <div className="absolute top-1.5 left-1.5 w-[22px] h-[22px] rounded-full bg-black/70 backdrop-blur-[4px] flex items-center justify-center text-[10px] font-bold text-white font-body z-2">
                    {i + 1}
                  </div>
                </div>
                <div className="text-xs font-medium mt-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[130px] font-body">{book.t}</div>
                <div className="text-[11px] text-[#767676] mt-[1px] font-body">{book.a.split(" ").pop()}</div>
              </div>
            ))}
          </HScroll>
        </div>
      )}

      {/* Critiques populaires */}
      {loadingReviews && (
        <div className="border-t border-border-light py-6">
          <Heading>Critiques populaires</Heading>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3.5 py-5 border-b border-[#f3f3f3]">
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
          {reviews.map(rv => {
            const bookObj = rv.books ? {
              id: rv.book_id, t: rv.books.title,
              a: Array.isArray(rv.books.authors) ? rv.books.authors.join(", ") : (rv.books.authors || ""),
              c: rv.books.cover_url,
              y: rv.books.publication_date ? parseInt(rv.books.publication_date) : null,
              slug: rv.books.slug, _supabase: rv.books,
            } : null;
            return (
              <div key={rv.id} className="group flex gap-3.5 py-5 border-b border-[#f3f3f3] relative">
                {bookObj && <Img book={bookObj} w={72} h={108} onClick={() => go(bookObj)} className="shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {bookObj && <div className="text-[15px] font-medium font-body">{bookObj.t}</div>}
                      {bookObj && <div className="text-xs text-[#767676] font-body mt-0.5">{bookObj.a}{bookObj.y ? `, ${bookObj.y}` : ""}</div>}
                    </div>
                    <ContentMenu type="review" item={rv} onDelete={refetchReviews} onEdit={refetchReviews} />
                  </div>
                  {rv.rating > 0 && <div className="mt-1"><Stars r={rv.rating} s={11} /></div>}
                  <div className="mt-1.5">
                    {rv.contains_spoilers ? (
                      <details>
                        <summary className="text-[11px] text-spoiler cursor-pointer font-medium font-body">Cette critique contient des spoilers</summary>
                        <p className="text-[14px] text-[#333] leading-[1.65] mt-1 font-body m-0">{rv.body}</p>
                      </details>
                    ) : (
                      <p className="text-[14px] text-[#333] leading-[1.65] font-body m-0" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{rv.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-[#767676] font-body">
                    <UserName user={rv.users} className="text-xs" />
                    <span>·</span>
                    <LikeButton
                      count={rv.likes_count || 0}
                      liked={likedReviews.has(rv.id)}
                      initialLiked={initLikedReviews.has(rv.id)}
                      onToggle={() => toggleReviewLike(rv.id, () => showToast("Une erreur est survenue"))}
                    />
                  </div>
                </div>
              </div>
            );
          })}
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
          {quotes.map(q => {
            const bookObj = normalizeQuoteBook(q);
            return (
              <div key={q.id} className="group py-4 border-b border-border-light relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[15px] italic text-[#1a1a1a] leading-[1.7] border-l-[3px] border-l-cover-fallback pl-3.5 mb-2.5 font-display flex-1">
                    « {q.body} »
                  </div>
                  <ContentMenu type="quote" item={q} onDelete={refetchQuotes} onEdit={refetchQuotes} />
                </div>
                <div className="flex items-center gap-2">
                  {bookObj && <Img book={bookObj} w={24} h={34} onClick={() => go(bookObj)} />}
                  {bookObj && <span className="text-xs text-[#767676] font-body">{bookObj.t}</span>}
                  <span className="text-[11px] text-[#767676] font-body">· <UserName user={q.users} className="text-[11px]" /></span>
                  <LikeButton
                    count={q.likes_count || 0}
                    liked={likedSet.has(q.id)}
                    initialLiked={initialSet.has(q.id)}
                    onToggle={() => toggleQuoteLike(q.id, () => showToast("Une erreur est survenue"))}
                    className="ml-auto text-[11px] font-body"
                  />
                </div>
              </div>
            );
          })}
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
      {!loadingLists && lists.length > 0 && (
        <div className="border-t border-border-light py-6">
          <Heading>Listes populaires</Heading>
          {lists.map(l => {
            const listUrl = `/${l.users?.username}/listes/${l.slug}`;
            return (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(listUrl)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(listUrl); } }}
                className="py-5 border-b border-border-light cursor-pointer hover:bg-[#fafafa] transition-colors duration-100"
              >
                <div className="flex gap-2 mb-3.5 p-3.5 px-4 bg-surface rounded-lg overflow-x-auto">
                  {l.previewBooks.map(b => <Img key={b.id} book={b} w={68} h={102} />)}
                  {l.bookCount > 4 && (
                    <div className="w-[68px] h-[102px] rounded-[3px] bg-avatar-bg flex items-center justify-center text-xs text-[#767676] shrink-0 font-body">
                      +{l.bookCount - 4}
                    </div>
                  )}
                </div>
                <div className="text-base font-medium font-body">{l.title}</div>
                {l.description && (
                  <div className="text-[13px] text-[#666] font-body mt-1 leading-snug">
                    {l.description.length > 80 ? l.description.slice(0, 80) + "…" : l.description}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-[5px]">
                  <Avatar i={(l.userName || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)} s={20} />
                  <UserName user={l.users} className="text-xs" />
                  <span className="text-xs text-[#767676] font-body">· {l.bookCount} livres</span>
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
