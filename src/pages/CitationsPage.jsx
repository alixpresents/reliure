export function meta() {
  return [
    { title: "Citations — Reliure" },
    { name: "description", content: "Les plus belles citations littéraires partagées par la communauté Reliure." },
    { property: "og:title", content: "Citations — Reliure" },
    { property: "og:description", content: "Les plus belles citations littéraires partagées par la communauté Reliure." },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
    { tagName: "link", rel: "canonical", href: `${import.meta.env.VITE_SITE_URL || "https://www.reliure.page"}/citations` },
  ];
}

import { useMemo } from "react";
import { QUOTES } from "../data";
import Img from "../components/Img";
import Heading from "../components/Heading";
import LikeButton from "../components/LikeButton";
import UserName from "../components/UserName";
import ContentMenu from "../components/ContentMenu";
import Toast from "../components/Toast";
import { Link } from "react-router-dom";
import { useCommunityQuotes } from "../hooks/useQuotes";
import { useLikes } from "../hooks/useLikes";
import { useAuth } from "../lib/AuthContext";
import { useCreatorIds } from "../hooks/useUserBadges";
import { useToast } from "../hooks/useToast";

function QuoteCard({ q, liked, initialLiked, onToggle, showToast, onEdit, onDelete, creatorIds }) {
  const bookSlug = q.books?.slug || q.book_id;
  const bookTitle = q.books?.title;
  const bookAuthor = Array.isArray(q.books?.authors) ? q.books.authors.join(", ") : (q.books?.authors || "");
  const bookObj = q.books ? { id: q.book_id, t: q.books.title, a: bookAuthor, c: q.books.cover_url, slug: q.books.slug, _supabase: q.books } : null;

  return (
    <div
      className="mb-3 sm:px-6 px-[18px] py-5"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
      }}
    >
      {/* Quote text */}
      <div
        className="text-[15px] font-display leading-[1.6] mb-4 pl-4"
        style={{
          color: "var(--text-primary)",
          borderLeft: "2px solid var(--border-default)",
        }}
      >
        « {q.text} »
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2.5">
        {/* Cover */}
        {bookSlug && (
          <Link to={`/livre/${bookSlug}`} className="shrink-0">
            <Img book={bookObj} w={32} h={48} style={{ borderRadius: 2 }} />
          </Link>
        )}

        {/* Book + user info */}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="text-[12px] font-body truncate" style={{ color: "var(--text-secondary)" }}>
            {bookTitle && (
              <Link
                to={`/livre/${bookSlug}`}
                className="font-medium no-underline hover:underline"
                style={{ color: "var(--text-primary)" }}
              >
                {bookTitle}
              </Link>
            )}
            {bookTitle && bookAuthor && (
              <span style={{ color: "var(--text-secondary)" }}> · {bookAuthor}</span>
            )}
          </div>
          <div className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>
            <UserName user={q.users} className="text-[11px]" isCreator={creatorIds?.has(q.user_id)} />
          </div>
        </div>

        {/* Right: like + menu */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className="text-[11px] font-body">
            <LikeButton
              count={q.likes_count || 0}
              liked={liked}
              initialLiked={initialLiked}
              onToggle={() => onToggle(q.id, () => showToast("Une erreur est survenue"))}
            />
          </span>
          <ContentMenu type="quote" item={q} onDelete={onDelete} onEdit={onEdit} />
        </div>
      </div>
    </div>
  );
}

export default function CitationsPage() {
  const { user } = useAuth();
  const { quotes: dbQuotes, loading, refetch } = useCommunityQuotes();
  const quoteIds = useMemo(() => dbQuotes.map(q => q.id), [dbQuotes]);
  const { likedSet, initialSet, toggle } = useLikes(quoteIds, "quote");
  const creatorIds = useCreatorIds();
  const { toast, showToast } = useToast();

  const useDb = dbQuotes.length > 0;

  return (
    <div className="pt-6">
      {toast.visible && <Toast message={toast.message} />}
      <Heading className="mb-1">Citations</Heading>
      <p className="text-[13px] mb-5 font-body" style={{ color: "var(--text-tertiary)" }}>
        Les plus belles phrases, partagées par la communauté.
      </p>

      {loading ? (
        <div className="py-8 text-center text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>
          Chargement...
        </div>
      ) : useDb ? (
        dbQuotes.map(q => (
          <QuoteCard
            key={q.id}
            q={q}
            liked={likedSet.has(q.id)}
            initialLiked={initialSet.has(q.id)}
            onToggle={toggle}
            showToast={showToast}
            onEdit={refetch}
            onDelete={refetch}
            creatorIds={creatorIds}
          />
        ))
      ) : (
        [...QUOTES].sort((a, b) => b.lk - a.lk).map(q => (
          <div
            key={q.id}
            className="mb-3 sm:px-6 px-[18px] py-5"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
            }}
          >
            <div
              className="text-[15px] font-display leading-[1.6] mb-4 pl-4"
              style={{
                color: "var(--text-primary)",
                borderLeft: "2px solid var(--border-default)",
              }}
            >
              « {q.txt} »
            </div>
            <div className="flex items-center gap-2.5">
              <Link to={`/livre/${q.b.slug || q.b.id}`} className="shrink-0">
                <Img book={q.b} w={32} h={48} style={{ borderRadius: 2 }} />
              </Link>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="text-[12px] font-body">
                  <Link
                    to={`/livre/${q.b.slug || q.b.id}`}
                    className="font-medium no-underline hover:underline"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {q.b.t}
                  </Link>
                  {q.b.a && <span style={{ color: "var(--text-secondary)" }}> · {q.b.a}</span>}
                </div>
                <div className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>{q.u}</div>
              </div>
              <div className="ml-auto shrink-0 text-[11px] font-body">
                <LikeButton count={q.lk} />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
