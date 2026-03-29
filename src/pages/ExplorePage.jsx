import Img from "../components/Img";
import Avatar from "../components/Avatar";
import Tag from "../components/Tag";
import Heading from "../components/Heading";
import Label from "../components/Label";
import HScroll from "../components/HScroll";
import LikeButton from "../components/LikeButton";
import Stars from "../components/Stars";
import UserName from "../components/UserName";
import { usePopularBooks, usePopularReviews, usePopularQuotes, usePopularLists } from "../hooks/useExplore";
import { useLikes } from "../hooks/useLikes";

function Skeleton({ className = "" }) {
  return <div className={`bg-[#f0ede8] rounded-[3px] animate-pulse ${className}`} />;
}

function normalizeQuoteBook(q) {
  if (!q.books) return null;
  return { id: q.book_id, t: q.books.title, a: Array.isArray(q.books.authors) ? q.books.authors.join(", ") : "", c: q.books.cover_url, _supabase: q.books };
}

export default function ExplorePage({ go, onTag, onSearch }) {
  const { books: popular, loading: loadingBooks } = usePopularBooks();
  const { reviews, loading: loadingReviews } = usePopularReviews();
  const { quotes, loading: loadingQuotes } = usePopularQuotes();
  const { lists, loading: loadingLists } = usePopularLists();
  const { likedSet: likedReviews, initialSet: initLikedReviews, toggle: toggleReviewLike } = useLikes(reviews.map(r => r.id), "review");
  const { likedSet, initialSet, toggle: toggleQuoteLike } = useLikes(quotes.map(q => q.id), "quote");
  const { likedSet: likedLists, initialSet: initLikedLists, toggle: toggleListLike } = useLikes(lists.map(l => l.id), "list");

  const ptags = ["autofiction", "réalisme magique", "Japon", "années 80", "féminisme", "dystopie", "poésie", "philosophie", "Paris", "mémoire", "nature writing"];

  const allEmpty = !loadingBooks && !loadingReviews && !loadingQuotes && !loadingLists && popular.length === 0 && reviews.length === 0 && quotes.length === 0 && lists.length === 0;

  return (
    <div>
      {/* Search bar */}
      <div className="py-6 pb-5">
        <div
          role="button"
          tabIndex={0}
          onClick={onSearch}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSearch(); } }}
          aria-label="Rechercher"
          className="bg-surface rounded-lg py-[11px] px-4 flex items-center gap-2.5 border border-[#eee] cursor-pointer hover:border-[#ddd] transition-[border] duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-[#767676] text-sm font-body">Chercher des livres, auteurs, tags...</span>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-6">
        <Label>Parcourir par thème</Label>
        <div className="flex flex-wrap gap-1">
          {ptags.map(t => <Tag key={t} onClick={() => onTag(t)}>{t}</Tag>)}
        </div>
      </div>

      {/* Empty state */}
      {allEmpty && (
        <div className="py-16 text-center">
          <div className="text-[15px] text-[#737373] font-body leading-relaxed">
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
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="min-w-[130px]">
                <Skeleton className="w-[130px] h-[195px]" />
                <Skeleton className="w-20 h-3 mt-2" />
                <Skeleton className="w-14 h-2.5 mt-1" />
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
              <Skeleton className="w-[72px] h-[108px] shrink-0" />
              <div className="flex-1">
                <Skeleton className="w-32 h-4 mb-1.5" />
                <Skeleton className="w-20 h-3 mb-2" />
                <Skeleton className="w-full h-12" />
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
              _supabase: rv.books,
            } : null;
            return (
              <div key={rv.id} className="flex gap-3.5 py-5 border-b border-[#f3f3f3]">
                {bookObj && <Img book={bookObj} w={72} h={108} onClick={() => go(bookObj)} className="shrink-0" />}
                <div className="flex-1 min-w-0">
                  {bookObj && <div className="text-[15px] font-medium font-body">{bookObj.t}</div>}
                  {bookObj && <div className="text-xs text-[#737373] font-body mt-0.5">{bookObj.a}{bookObj.y ? `, ${bookObj.y}` : ""}</div>}
                  {rv.rating > 0 && <div className="mt-1"><Stars r={rv.rating} s={11} /></div>}
                  <div className="mt-1.5">
                    {rv.contains_spoilers ? (
                      <details>
                        <summary className="text-[11px] text-spoiler cursor-pointer font-medium font-body">Cette critique contient des spoilers</summary>
                        <p className="text-[14px] text-[#444] leading-[1.65] mt-1 font-body m-0">{rv.body}</p>
                      </details>
                    ) : (
                      <p className="text-[14px] text-[#444] leading-[1.65] font-body m-0" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{rv.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-[#767676] font-body">
                    <UserName user={rv.users} className="text-xs" />
                    <span>·</span>
                    <LikeButton
                      count={rv.likes_count || 0}
                      liked={likedReviews.has(rv.id)}
                      initialLiked={initLikedReviews.has(rv.id)}
                      onToggle={() => toggleReviewLike(rv.id)}
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
              <Skeleton className="w-full h-12 mb-2.5" />
              <div className="flex items-center gap-2">
                <Skeleton className="w-6 h-[34px]" />
                <Skeleton className="w-24 h-3" />
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
              <div key={q.id} className="py-4 border-b border-border-light">
                <div className="text-[15px] italic text-[#1a1a1a] leading-[1.7] border-l-[3px] border-l-cover-fallback pl-3.5 mb-2.5 font-display">
                  « {q.body} »
                </div>
                <div className="flex items-center gap-2">
                  {bookObj && <Img book={bookObj} w={24} h={34} onClick={() => go(bookObj)} />}
                  {bookObj && <span className="text-xs text-[#737373] font-body">{bookObj.t}</span>}
                  <span className="text-[11px] text-[#767676] font-body">· <UserName user={q.users} className="text-[11px]" /></span>
                  <LikeButton
                    count={q.likes_count || 0}
                    liked={likedSet.has(q.id)}
                    initialLiked={initialSet.has(q.id)}
                    onToggle={() => toggleQuoteLike(q.id)}
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
                {[1, 2, 3, 4].map(j => <Skeleton key={j} className="w-[68px] h-[102px] shrink-0" />)}
              </div>
              <Skeleton className="w-40 h-4" />
              <Skeleton className="w-28 h-3 mt-2" />
            </div>
          ))}
        </div>
      )}
      {!loadingLists && lists.length > 0 && (
        <div className="border-t border-border-light py-6">
          <Heading>Listes populaires</Heading>
          {lists.map(l => (
            <div key={l.id} className="py-5 border-b border-border-light">
              <div className="flex gap-2 mb-3.5 p-3.5 px-4 bg-surface rounded-lg overflow-x-auto">
                {l.previewBooks.map(b => <Img key={b.id} book={b} w={68} h={102} onClick={() => go(b)} />)}
                {l.bookCount > 4 && (
                  <div className="w-[68px] h-[102px] rounded-[3px] bg-avatar-bg flex items-center justify-center text-xs text-[#737373] shrink-0 font-body">
                    +{l.bookCount - 4}
                  </div>
                )}
              </div>
              <div className="text-base font-medium font-body">{l.title}</div>
              <div className="flex items-center gap-2 mt-[5px]">
                <Avatar i={(l.userName || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)} s={20} />
                <UserName user={l.users} className="text-xs" />
                <span className="text-xs text-[#737373] font-body">· {l.bookCount} livres</span>
                <span className="text-xs font-body">
                  <LikeButton
                    count={l.likes_count || 0}
                    liked={likedLists.has(l.id)}
                    initialLiked={initLikedLists.has(l.id)}
                    onToggle={() => toggleListLike(l.id)}
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
