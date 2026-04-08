import { createClient } from "@supabase/supabase-js";

async function queryExploreData(supabase) {
  const [babelio, reviews, quotes, lists, selections, ranking, creators] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, authors, cover_url, slug, publication_date, avg_rating, rating_count, page_count, babelio_popular_year")
      .not("babelio_popular_year", "is", null)
      .order("avg_rating", { ascending: false })
      .limit(10),
    supabase
      .from("reviews")
      .select("id, body, rating, likes_count, contains_spoilers, created_at, books:book_id(id, title, cover_url, authors, publication_date, slug), users:user_id(username, display_name, avatar_url)")
      .not("body", "is", null)
      .neq("body", "")
      .order("likes_count", { ascending: false })
      .limit(3),
    supabase
      .from("quotes")
      .select("id, text, likes_count, created_at, books!quotes_book_id_fkey(id, title, cover_url, authors, slug), users!quotes_user_id_fkey(username, display_name)")
      .order("likes_count", { ascending: false })
      .limit(3),
    supabase.rpc("popular_lists_with_covers", { result_limit: 6 }),
    supabase.rpc("curated_selections"),
    supabase.rpc("get_alltime_ranking"),
    supabase
      .from("user_badges")
      .select("user_id")
      .eq("badge_id", "creator")
      .limit(500),
  ]);

  return {
    babelioPopular: babelio.data || [],
    popularReviews: reviews.data || [],
    popularQuotes: quotes.data || [],
    popularLists: lists.data || [],
    curatedSelections: selections.data || [],
    ranking: ranking.data || [],
    creatorIds: (creators.data || []).map(r => r.user_id),
  };
}

// loader runs at build time during prerendering — own createClient (Node env)
export async function loader() {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  return queryExploreData(supabase);
}


export function meta() {
  return [
    { title: "Explorer — Reliure" },
    { name: "description", content: "Découvrez les livres populaires, les critiques récentes et les citations marquantes sur Reliure, le réseau social de lecture francophone." },
    { property: "og:title", content: "Explorer — Reliure" },
    { property: "og:description", content: "Découvrez les livres populaires, les critiques récentes et les citations marquantes sur Reliure, le réseau social de lecture francophone." },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
    { tagName: "link", rel: "canonical", href: `${import.meta.env.VITE_SITE_URL || "https://reliure.page"}/` },
  ];
}

import { lazy, Suspense, useRef, useState, useEffect } from "react";
import { useLoaderData } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import Skeleton from "../components/Skeleton";

// Lazy-load ExplorePage to keep browser-only deps out of the prerender bundle
const ExplorePage = lazy(() => import("./ExplorePage"));

function parseAuthors(authors) {
  if (Array.isArray(authors)) return authors;
  if (typeof authors === "string") {
    try { const parsed = JSON.parse(authors); if (Array.isArray(parsed)) return parsed; } catch {}
  }
  return [];
}

function normalizeBook(b) {
  return {
    id: b.id,
    t: b.title,
    a: parseAuthors(b.authors).join(", "),
    c: b.cover_url,
    y: b.publication_date ? parseInt(b.publication_date) : null,
    p: b.page_count || 0,
    r: b.avg_rating || 0,
    rt: b.rating_count || 0,
    tags: Array.isArray(b.genres) ? b.genres : [],
    desc: b.description,
    slug: b.slug,
    _supabase: b,
  };
}

// SSR-safe content for prerendering — pure HTML, no hooks, no browser APIs
function ExploreSeoContent({ data }) {
  return (
    <article>
      <h1 className="font-display text-[22px] sm:text-[26px] font-normal leading-snug pt-8 pb-4" style={{ color: "var(--text-primary)" }}>
        La bibliothèque personnelle des lecteurs francophones.
      </h1>

      {data.babelioPopular.length > 0 && (
        <section className="py-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <h2 className="font-display text-[18px] font-normal mb-3" style={{ color: "var(--text-primary)" }}>
            Plébiscités par les lecteurs francophones
          </h2>
          <div className="flex gap-4 overflow-x-auto py-2">
            {data.babelioPopular.map(book => (
              <div key={book.id} className="text-center min-w-[130px]">
                {book.cover_url && (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    style={{ width: 130, height: 195, objectFit: "cover", borderRadius: 3 }}
                  />
                )}
                <div className="text-xs font-medium mt-2 font-body" style={{ color: "var(--text-primary)" }}>
                  {book.title}
                </div>
                <div className="text-[11px] font-body" style={{ color: "var(--text-tertiary)" }}>
                  {parseAuthors(book.authors).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.popularReviews.length > 0 && (
        <section className="py-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <h2 className="font-display text-[18px] font-normal mb-3" style={{ color: "var(--text-primary)" }}>
            Critiques populaires
          </h2>
          {data.popularReviews.map(rv => (
            <div key={rv.id} className="flex gap-3.5 py-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {rv.books?.cover_url && (
                <img
                  src={rv.books.cover_url}
                  alt={rv.books?.title || ""}
                  style={{ width: 72, height: 108, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
                />
              )}
              <div>
                {rv.books?.title && (
                  <div className="text-[15px] font-medium font-body">{rv.books.title}</div>
                )}
                <div className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                  {parseAuthors(rv.books?.authors).join(", ")}
                </div>
                {rv.body && (
                  <p className="text-sm mt-1.5 leading-relaxed font-body" style={{ color: "var(--text-body)" }}>
                    {rv.body.length > 200 ? rv.body.slice(0, 200) + "…" : rv.body}
                  </p>
                )}
                <div className="text-xs mt-1 font-body" style={{ color: "var(--text-tertiary)" }}>
                  — {rv.users?.display_name || rv.users?.username}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {data.popularQuotes.length > 0 && (
        <section className="py-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <h2 className="font-display text-[18px] font-normal mb-3" style={{ color: "var(--text-primary)" }}>
            Citations populaires
          </h2>
          {data.popularQuotes.map(q => (
            <blockquote key={q.id} className="py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <p className="text-[15px] leading-relaxed pl-3.5 font-display" style={{ borderLeft: "3px solid var(--border-default)", color: "var(--text-primary)" }}>
                « {q.text} »
              </p>
              <cite className="text-xs not-italic font-body mt-1 block" style={{ color: "var(--text-tertiary)" }}>
                — {q.books?.title}{q.users ? `, ${q.users.display_name || q.users.username}` : ""}
              </cite>
            </blockquote>
          ))}
        </section>
      )}
    </article>
  );
}

function ExploreSkeleton() {
  return (
    <div>
      <div className="py-6 border-t border-border-light">
        <Skeleton.Text width={280} height={18} className="mb-3" />
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="min-w-[130px]">
              <Skeleton.Cover w={130} h={195} />
              <Skeleton.Text width={80} height={12} className="mt-2" />
              <Skeleton.Text width={56} height={10} className="mt-1" />
            </div>
          ))}
        </div>
      </div>
      <div className="py-6 border-t border-border-light">
        <Skeleton.Text width={160} height={18} className="mb-3" />
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
    </div>
  );
}

// Seeds TanStack Query cache with loader data so hooks don't re-fetch
function CacheSeeder({ loaderData, children }) {
  const queryClient = useQueryClient();
  const prevData = useRef(null);

  if (loaderData && loaderData !== prevData.current) {
    prevData.current = loaderData;
    queryClient.setQueryData(["babelioPopular"], loaderData.babelioPopular.map(normalizeBook));
    queryClient.setQueryData(["popularReviews"], loaderData.popularReviews);
    queryClient.setQueryData(["popularQuotes"], loaderData.popularQuotes);
    queryClient.setQueryData(["popularLists"], loaderData.popularLists);
    queryClient.setQueryData(["curatedSelections"], loaderData.curatedSelections);
    queryClient.setQueryData(["classement", "alltime"], loaderData.ranking);
    queryClient.setQueryData(["creatorIds"], new Set(loaderData.creatorIds));
  }

  return children;
}

export default function ExplorePageRoute() {
  const loaderData = useLoaderData();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <CacheSeeder loaderData={loaderData}>
      {!hydrated ? (
        loaderData ? <ExploreSeoContent data={loaderData} /> : <ExploreSkeleton />
      ) : (
        <div className="sk-fade">
          <Suspense fallback={<ExploreSkeleton />}>
            <ExplorePage />
          </Suspense>
        </div>
      )}
    </CacheSeeder>
  );
}
