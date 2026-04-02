import { createClient } from "@supabase/supabase-js";

async function fetchBookData(params) {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  const { data: book } = await supabase
    .from("books")
    .select("id, title, subtitle, authors, cover_url, publisher, publication_date, page_count, avg_rating, rating_count, genres, slug, description, isbn_13, language")
    .eq("slug", params.slug)
    .single();

  if (!book) throw new Response("Not Found", { status: 404 });

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, users(username, display_name)")
    .eq("book_id", book.id)
    .order("likes_count", { ascending: false })
    .limit(5);

  return { book, reviews: reviews || [] };
}

// loader runs at build time during prerendering (provides data for meta + HTML)
export async function loader({ params }) {
  return fetchBookData(params);
}

// clientLoader runs in the browser on client-side navigation (no .data fetch)
export async function clientLoader({ params }) {
  return fetchBookData(params);
}

export function meta({ data, params }) {
  if (!data?.book) {
    return [
      { title: `${params.slug} — Reliure` },
      { name: "description", content: "Découvrez ce livre sur Reliure — critiques, citations et avis de lecteurs." },
      { property: "og:title", content: `${params.slug} — Reliure` },
      { property: "og:description", content: "Découvrez ce livre sur Reliure — critiques, citations et avis de lecteurs." },
      { property: "og:type", content: "book" },
      { property: "og:site_name", content: "Reliure" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
  }
  const { book } = data;
  const authors = parseAuthors(book.authors).join(", ");
  const description = book.description
    ? book.description.substring(0, 160)
    : `Découvrez ${book.title} de ${authors} sur Reliure — critiques, citations et avis de lecteurs.`;

  return [
    { title: `${book.title} — ${authors} | Reliure` },
    { name: "description", content: description },
    { property: "og:title", content: `${book.title} — ${authors}` },
    { property: "og:description", content: description },
    { property: "og:image", content: book.cover_url || "" },
    { property: "og:type", content: "book" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: `${book.title} — ${authors}` },
    { name: "twitter:image", content: book.cover_url || "" },
  ];
}

import { lazy, Suspense } from "react";
import { useLoaderData } from "react-router";
import { useParams } from "react-router-dom";
import { useBookBySlug, mapBook } from "../hooks/useBookBySlug";
import NotFoundPage from "./NotFoundPage";
import Skeleton from "../components/Skeleton";

// Lazy-load BookPage to keep its browser-only deps out of the SSR bundle
const BookPage = lazy(() => import("./BookPage"));

function BookSkeleton() {
  return (
    <div>
      <div className="py-4">
        <Skeleton.Text width={52} height={13} />
      </div>
      <div className="flex flex-col sm:flex-row gap-8 py-2 pb-6 items-center sm:items-start">
        <Skeleton.Cover w={180} h={270} />
        <div className="flex-1 pt-1 flex flex-col gap-3">
          <Skeleton.Text width="68%" height={28} />
          <Skeleton.Text width="40%" height={15} />
          <Skeleton.Text width="30%" height={12} />
          <div className="flex gap-1.5 flex-wrap mt-2">
            {[72, 48, 56, 88].map((w, i) => (
              <Skeleton className="rounded-full" key={i} style={{ width: w, height: 30 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function parseAuthors(authors) {
  if (Array.isArray(authors)) return authors;
  if (typeof authors === "string") {
    try { const parsed = JSON.parse(authors); if (Array.isArray(parsed)) return parsed; } catch {}
  }
  return [];
}

function BookJsonLd({ book }) {
  if (!book) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: parseAuthors(book.authors).map(a => ({
      "@type": "Person",
      name: typeof a === "string" ? a : a.name,
    })),
    isbn: book.isbn_13,
    image: book.cover_url,
    publisher: book.publisher,
    inLanguage: book.language || "fr",
  };
  if (book.rating_count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: book.avg_rating,
      reviewCount: book.rating_count,
    };
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// SSR-safe content for prerendering — pure HTML, no hooks, no browser APIs
function BookSeoContent({ book, reviews }) {
  const authors = parseAuthors(book.authors).join(", ");
  return (
    <article>
      <BookJsonLd book={book} />
      <div className="flex flex-col sm:flex-row gap-8 py-6 items-center sm:items-start">
        {book.cover_url && (
          <img
            src={book.cover_url}
            alt={book.title}
            style={{ width: 180, height: 270, objectFit: "cover", borderRadius: 3 }}
          />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-display" style={{ color: "var(--text-primary)" }}>
            {book.title}
          </h1>
          {authors && <p style={{ color: "var(--text-secondary)" }}>{authors}</p>}
          {book.publisher && (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {book.publisher}{book.publication_date ? `, ${book.publication_date}` : ""}
            </p>
          )}
          {book.description && (
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-body)" }}>
              {book.description}
            </p>
          )}
        </div>
      </div>
      {reviews?.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-display mb-4" style={{ color: "var(--text-primary)" }}>Critiques</h2>
          {reviews.map(r => (
            <blockquote key={r.id} className="mb-4 pl-4" style={{ borderLeft: "2px solid var(--border-default)" }}>
              <p className="text-sm" style={{ color: "var(--text-body)" }}>{r.body}</p>
              <cite className="text-xs not-italic" style={{ color: "var(--text-tertiary)" }}>
                — {r.users?.display_name || r.users?.username}
              </cite>
            </blockquote>
          ))}
        </section>
      )}
    </article>
  );
}

export default function BookPageRoute() {
  const loaderData = useLoaderData();
  const { slug } = useParams();
  const isServer = typeof window === "undefined";

  // Hooks called unconditionally (Rules of Hooks)
  const { book, loading, notFound } = useBookBySlug(slug);

  // SSR: render SEO-safe content with loader data
  // (meta tags + JSON-LD are the real SEO wins — already in <head>)
  if (isServer) {
    if (loaderData?.book) {
      return <BookSeoContent book={loaderData.book} reviews={loaderData.reviews} />;
    }
    return <BookSkeleton />;
  }

  // Client: loader data as fallback while TanStack Query loads
  const loaderBook = loaderData?.book ? mapBook(loaderData.book) : null;
  const displayBook = book || loaderBook;

  if (!displayBook && loading) return <BookSkeleton />;
  if (notFound || !displayBook) return <NotFoundPage />;

  const rawBook = displayBook._supabase || loaderData?.book;

  return (
    <div className="sk-fade">
      <BookJsonLd book={rawBook} />
      <Suspense fallback={<BookSkeleton />}>
        <BookPage book={displayBook} />
      </Suspense>
    </div>
  );
}
