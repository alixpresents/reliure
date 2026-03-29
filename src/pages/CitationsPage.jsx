import { QUOTES } from "../data";
import Img from "../components/Img";
import Heading from "../components/Heading";
import LikeButton from "../components/LikeButton";
import UserName from "../components/UserName";
import { useNav } from "../lib/NavigationContext";
import { useCommunityQuotes } from "../hooks/useQuotes";
import { useLikes } from "../hooks/useLikes";

export default function CitationsPage() {
  const { goToBook: go } = useNav();
  const { quotes: dbQuotes, loading } = useCommunityQuotes();
  const { likedSet, initialSet, toggle } = useLikes(dbQuotes.map(q => q.id), "quote");

  // Use Supabase data if available, fallback to mock
  const useDb = dbQuotes.length > 0;

  return (
    <div className="pt-6">
      <Heading>Citations</Heading>
      <p className="text-sm text-[#737373] -mt-2 mb-5 font-body">Les plus belles phrases, partagées par la communauté.</p>

      {loading ? (
        <div className="py-8 text-center text-[13px] text-[#767676] font-body">Chargement...</div>
      ) : useDb ? (
        dbQuotes.map(q => {
          const bookObj = q.books ? { id: q.book_id, t: q.books.title, a: Array.isArray(q.books.authors) ? q.books.authors.join(", ") : "", c: q.books.cover_url, slug: q.books.slug, _supabase: q.books } : null;
          return (
            <div key={q.id} className="py-[22px] border-b border-border-light">
              <div className="text-base italic text-[#1a1a1a] leading-[1.75] border-l-[3px] border-l-cover-fallback pl-[18px] mb-3.5 font-display">
                « {q.body} »
              </div>
              <div className="flex items-center gap-3">
                {bookObj && <Img book={bookObj} w={36} h={52} onClick={() => go(bookObj)} />}
                <div className="flex-1">
                  {bookObj && <div className="text-[13px] font-medium font-body">{bookObj.t}</div>}
                  {bookObj && <div className="text-xs text-[#737373] font-body">{bookObj.a}</div>}
                </div>
                <div className="text-right">
                  <div className="text-xs font-body"><UserName user={q.users} className="text-xs" /></div>
                  <div className="text-xs text-[#767676] mt-0.5 font-body"><LikeButton count={q.likes_count || 0} liked={likedSet.has(q.id)} initialLiked={initialSet.has(q.id)} onToggle={() => toggle(q.id)} /></div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        [...QUOTES].sort((a, b) => b.lk - a.lk).map(q => (
          <div key={q.id} className="py-[22px] border-b border-border-light">
            <div className="text-base italic text-[#1a1a1a] leading-[1.75] border-l-[3px] border-l-cover-fallback pl-[18px] mb-3.5 font-display">
              « {q.txt} »
            </div>
            <div className="flex items-center gap-3">
              <Img book={q.b} w={36} h={52} onClick={() => go(q.b)} />
              <div className="flex-1">
                <div className="text-[13px] font-medium font-body">{q.b.t}</div>
                <div className="text-xs text-[#737373] font-body">{q.b.a}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#737373] font-body">{q.u}</div>
                <div className="text-xs text-[#767676] mt-0.5 font-body"><LikeButton count={q.lk} /></div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
