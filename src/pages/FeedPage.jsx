import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Stars from "../components/Stars";
import Avatar from "../components/Avatar";
import Heading from "../components/Heading";
import LikeButton from "../components/LikeButton";
import { useFeed } from "../hooks/useActivity";
import { useLikes } from "../hooks/useLikes";
import { supabase } from "../lib/supabase";
import UserName from "../components/UserName";
import { formatRelativeTime } from "../lib/formatTime";
import Skeleton from "../components/Skeleton";

function actionLabel(actionType, metadata) {
  if (actionType === "review") return "a critiqué";
  if (actionType === "quote") return "a cité un extrait de";
  if (actionType === "list") return "a créé une liste";
  if (actionType === "reading_status") {
    const s = metadata?.status;
    if (s === "want_to_read") return "veut lire";
    if (s === "reading") return "a commencé";
    if (s === "read") return metadata?.is_reread ? "a relu" : "a terminé";
    if (s === "abandoned") return "a abandonné";
    return "a mis à jour";
  }
  return "";
}

function MiniCover({ url, title, onClick }) {
  if (url) {
    return (
      <img
        src={url}
        alt={title || ""}
        className="w-9 h-[54px] rounded-sm object-cover cursor-pointer shrink-0"
        onClick={onClick}
      />
    );
  }
  return (
    <div
      className="w-9 h-[54px] rounded-sm bg-cover-fallback flex items-center justify-center cursor-pointer shrink-0"
      onClick={onClick}
    >
      <span className="text-[6px] text-[#767676] font-body text-center leading-tight px-0.5 overflow-hidden">{title || ""}</span>
    </div>
  );
}

export default function FeedPage() {
  const nav = useNavigate();
  const { items, loading } = useFeed();
  const reviewIds = items.filter(i => i.action_type === "review").map(i => i.target_id);
  const quoteIds = items.filter(i => i.action_type === "quote").map(i => i.target_id);
  const { likedSet: likedReviews, initialSet: initLikedReviews, toggle: toggleReviewLike } = useLikes(reviewIds, "review");
  const { likedSet: likedQuotes, initialSet: initLikedQuotes, toggle: toggleQuoteLike } = useLikes(quoteIds, "quote");

  // Fetch cover previews for list-type activity items
  const [listPreviews, setListPreviews] = useState({});
  useEffect(() => {
    const listIds = items.filter(i => i.action_type === "list").map(i => i.target_id);
    if (!listIds.length) return;
    supabase
      .from("lists")
      .select("id, list_items(book_id, position, books(id, cover_url))")
      .in("id", listIds)
      .then(({ data }) => {
        if (!data) return;
        const previews = {};
        for (const l of data) {
          const sorted = [...(l.list_items || [])].sort((a, b) => a.position - b.position);
          const covers = sorted.filter(i => i.books?.cover_url).slice(0, 3).map(i => i.books.cover_url);
          previews[l.id] = { covers, count: sorted.length };
        }
        setListPreviews(previews);
      });
  }, [items]);

  const goToBook = async (meta) => {
    if (!meta.book_id) return;
    const { data } = await supabase.from("books").select("slug").eq("id", meta.book_id).single();
    if (data?.slug) {
      nav(`/livre/${data.slug}`);
    }
  };

  return (
    <div className="pt-5">
      <Heading>Fil d'activité</Heading>

      {loading ? (
        <div>{[1, 2, 3].map(i => <Skeleton.Card key={i} />)}</div>
      ) : items.length > 0 ? (
        <div className="sk-fade">{items.map(it => {
          const displayName = it.users?.display_name || it.users?.username || "?";
          const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
          const meta = it.metadata || {};
          const bookTitle = meta.book_title || "un livre";
          const bookAuthor = meta.book_author;
          const hasContent = (it.action_type === "review" && meta.review_body) || (it.action_type === "quote" && meta.quote_body);

          return (
            <div key={it.id} className="py-3.5 border-b border-border-light">
              <div className="flex gap-3 items-start">
                {/* Avatar */}
                <Avatar i={initials} s={28} />

                {/* Text line */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-normal font-body m-0">
                    <UserName user={it.users} className="text-[13px]" />
                    {" "}
                    <span className="text-[#737373]">{actionLabel(it.action_type, meta)}</span>
                    {" "}
                    {it.action_type !== "list" && (
                      <>
                        <span
                          className={`font-medium ${meta.book_id ? "cursor-pointer hover:underline" : ""}`}
                          onClick={() => goToBook(meta)}
                        >
                          {bookTitle}
                        </span>
                        {bookAuthor && <span className="text-[#737373]"> de {bookAuthor}</span>}
                        {meta.rating > 0 && (
                          <span className="inline-flex align-middle ml-1.5"><Stars r={meta.rating} s={11} /></span>
                        )}
                      </>
                    )}
                  </p>

                  {/* List content */}
                  {it.action_type === "list" && (
                    <div className="mt-1.5">
                      <span
                        className="text-[14px] font-normal font-display italic cursor-pointer hover:underline"
                        onClick={() => nav(`/${it.users?.username}/listes/${meta.list_slug}`)}
                      >
                        {meta.list_title}
                      </span>
                      {(() => {
                        const preview = listPreviews[it.target_id];
                        if (!preview?.covers?.length) return null;
                        const { covers, count } = preview;
                        const extra = count - 3;
                        return (
                          <div>
                            <div
                              className="flex gap-1 mt-2 cursor-pointer"
                              onClick={() => nav(`/${it.users?.username}/listes/${meta.list_slug}`)}
                            >
                              {covers.map((url, i) => (
                                <img key={i} src={url} alt="" className="w-[38px] h-[57px] object-cover rounded-[2px] shrink-0 bg-cover-fallback" />
                              ))}
                              {extra > 0 && (
                                <div className="w-[38px] h-[57px] rounded-[2px] shrink-0 bg-[#f0ede8] flex items-center justify-center text-[11px] text-[#999] font-body">
                                  +{extra}
                                </div>
                              )}
                            </div>
                            <div className="text-[11px] text-[#767676] font-body mt-1">
                              {count} livre{count !== 1 ? "s" : ""}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Review content */}
                  {it.action_type === "review" && meta.review_body && (
                    <div className="mt-1.5 ml-0">
                      {meta.contains_spoilers ? (
                        <details>
                          <summary className="text-[11px] text-spoiler cursor-pointer font-medium font-body">Cette critique contient des spoilers</summary>
                          <p className="text-[13px] text-[#333] leading-relaxed mt-1 font-body m-0">{meta.review_body}</p>
                        </details>
                      ) : (
                        <p className="text-[13px] text-[#333] leading-relaxed font-body m-0">{meta.review_body}</p>
                      )}
                      <div className="flex gap-4 mt-1.5 text-[11px] text-[#767676] font-body">
                        <LikeButton
                          count={meta.likes_count || 0}
                          liked={likedReviews.has(it.target_id)}
                          initialLiked={initLikedReviews.has(it.target_id)}
                          onToggle={() => toggleReviewLike(it.target_id)}
                        />
                        <span className="cursor-pointer hover:text-[#1a1a1a] transition-colors duration-150">Répondre</span>
                      </div>
                    </div>
                  )}

                  {/* Quote content */}
                  {it.action_type === "quote" && meta.quote_body && (
                    <div className="mt-2">
                      <div className="border-l-[3px] border-l-cover-fallback pl-3">
                        <span className="text-sm italic leading-relaxed font-display text-[#1a1a1a]">« {meta.quote_body} »</span>
                      </div>
                      <div className="mt-1.5 text-[11px] font-body">
                        <LikeButton
                          count={meta.likes_count || 0}
                          liked={likedQuotes.has(it.target_id)}
                          initialLiked={initLikedQuotes.has(it.target_id)}
                          onToggle={() => toggleQuoteLike(it.target_id)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`text-[11px] text-[#767676] font-body ${hasContent ? "mt-1.5" : "mt-1"}`}>
                    {formatRelativeTime(it.created_at)}
                  </div>
                </div>

                {/* Mini cover — masqué pour les listes (mosaïque inline) */}
                {it.action_type !== "list" && (
                  <MiniCover url={meta.cover_url} title={bookTitle} onClick={() => goToBook(meta)} />
                )}
              </div>
            </div>
          );
        })}</div>
      ) : (
        <div className="py-12 text-center font-body">
          <div className="text-sm text-[#999]">Suis des lecteurs pour voir leur activité ici.</div>
          <button onClick={() => nav("/explorer")} className="mt-4 px-5 py-2.5 rounded-[20px] text-[13px] font-medium bg-[#1a1a1a] text-white border-none cursor-pointer hover:bg-[#333] transition-colors duration-150">Explorer</button>
        </div>
      )}
    </div>
  );
}
