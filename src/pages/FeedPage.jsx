import Stars from "../components/Stars";
import Avatar from "../components/Avatar";
import Heading from "../components/Heading";
import LikeButton from "../components/LikeButton";
import { useFeed } from "../hooks/useActivity";
import { supabase } from "../lib/supabase";
import { formatRelativeTime } from "../lib/formatTime";

function actionLabel(actionType, metadata) {
  if (actionType === "review") return "a critiqué";
  if (actionType === "quote") return "a cité un extrait de";
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

export default function FeedPage({ go }) {
  const { items, loading } = useFeed();

  const goToBook = async (meta) => {
    if (!meta.book_id) return;
    const { data } = await supabase.from("books").select("*").eq("id", meta.book_id).single();
    if (data) {
      go({ id: data.id, _supabase: data, t: data.title, a: Array.isArray(data.authors) ? data.authors.join(", ") : data.authors, c: data.cover_url, y: data.publication_date, p: data.page_count, r: data.avg_rating, rt: data.rating_count });
    } else {
      go({ id: meta.book_id, _supabase: { id: meta.book_id }, t: meta.book_title, a: meta.book_author, c: meta.cover_url });
    }
  };

  return (
    <div className="pt-5">
      <Heading>Fil d'activité</Heading>

      {loading ? (
        <div className="py-8 text-center text-[13px] text-[#767676] font-body">Chargement...</div>
      ) : items.length > 0 ? (
        items.map(it => {
          const name = it.users?.display_name || it.users?.username || "?";
          const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
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
                    <span className="font-medium">{name}</span>
                    {" "}
                    <span className="text-[#737373]">{actionLabel(it.action_type, meta)}</span>
                    {" "}
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
                  </p>

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
                        <LikeButton count={0} size={11} />
                        <span className="cursor-pointer hover:text-[#1a1a1a] transition-colors duration-150">Répondre</span>
                      </div>
                    </div>
                  )}

                  {/* Quote content */}
                  {it.action_type === "quote" && meta.quote_body && (
                    <div className="mt-2 border-l-[3px] border-l-cover-fallback pl-3">
                      <span className="text-sm italic leading-relaxed font-display text-[#1a1a1a]">« {meta.quote_body} »</span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`text-[11px] text-[#767676] font-body ${hasContent ? "mt-1.5" : "mt-1"}`}>
                    {formatRelativeTime(it.created_at)}
                  </div>
                </div>

                {/* Mini cover */}
                <MiniCover url={meta.cover_url} title={bookTitle} onClick={() => goToBook(meta)} />
              </div>
            </div>
          );
        })
      ) : (
        <div className="py-12 text-center text-sm text-[#767676] font-body">Rien de nouveau pour l'instant.</div>
      )}
    </div>
  );
}
