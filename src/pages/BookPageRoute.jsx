async function queryBookData(supabase, params) {
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
    { tagName: "link", rel: "canonical", href: `${import.meta.env.VITE_SITE_URL || "https://reliure.page"}/livre/${params.slug}` },
  ];
}

import { lazy, Suspense } from "react";
import { useLoaderData } from "react-router";
import { useParams, useLocation, Navigate } from "react-router-dom";
import { useBookBySlug, mapBook } from "../hooks/useBookBySlug";
import NotFoundPage from "./NotFoundPage";
import Skeleton from "../components/Skeleton";
import { extractYear } from "../utils/extractYear";

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

function BookSkeletonEnriched({ preview }) {
  const authors = Array.isArray(preview.authors)
    ? preview.authors.join(", ")
    : preview.authors || "";

  return (
    <div className="sk-fade">
      <div className="py-4">
        <Skeleton.Text width={52} height={13} />
      </div>
      <div className="flex flex-col sm:flex-row gap-8 py-2 pb-6 items-center sm:items-start">
        {preview.coverUrl ? (
          <img
            src={preview.coverUrl}
            alt={preview.title || ""}
            style={{ width: 180, height: 270, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
          />
        ) : (
          <Skeleton.Cover w={180} h={270} />
        )}
        <div className="flex-1 pt-1 flex flex-col gap-3">
          {preview.title ? (
            <h1 className="font-display text-[24px] font-normal leading-snug"
                style={{ color: "var(--text-primary)" }}>
              {preview.title}
            </h1>
          ) : (
            <Skeleton.Text width="68%" height={28} />
          )}
          {authors ? (
            <div className="text-[15px] font-body" style={{ color: "var(--text-secondary)" }}>
              {authors}
            </div>
          ) : (
            <Skeleton.Text width="40%" height={15} />
          )}
          <Skeleton.Text width="30%" height={12} />
          <div className="flex gap-1.5 flex-wrap mt-2">
            {[72, 48, 56, 88].map((w, i) => (
              <Skeleton className="rounded-full" key={i} style={{ width: w, height: 30 }} />
            ))}
          </div>
          <div className="text-[12px] font-body mt-1" style={{ color: "var(--text-tertiary)" }}>
            Chargement en cours…
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <Skeleton.Text width="100%" height={12} />
        <Skeleton.Text width="95%" height={12} />
        <Skeleton.Text width="88%" height={12} />
        <Skeleton.Text width="72%" height={12} />
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
              {book.publisher}{book.publication_date ? `, ${extractYear(book.publication_date)}` : ""}
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
  const location = useLocation();
  const isServer = typeof window === "undefined";

  // "importing" = route transitoire SPA (pas de fetch DB)
  const isImporting = !isServer && slug === "importing";

  // Hooks toujours appelés dans le même ordre (Rules of Hooks)
  const { book, loading, notFound } = useBookBySlug(isImporting ? null : slug);

  // Cas spécial : skeleton enrichi pendant l'import en arrière-plan
  if (isImporting) {
    const previewData = location.state?.previewData;
    if (previewData) return <BookSkeletonEnriched preview={previewData} />;
    return <Navigate to="/" replace />;
  }

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
