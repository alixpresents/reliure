import { supabase } from "./supabase";
import { generateBookSlug } from "../utils/slugify";
import { findExistingBook } from "../utils/deduplicateBook";

async function slugExists(slug) {
  const { data } = await supabase.from("books").select("id").eq("slug", slug).limit(1).maybeSingle();
  return !!data;
}

export async function importBook(googleBook) {
  // Anti-doublons : ISBN exact puis titre normalisé + auteur
  const existing = await findExistingBook(supabase, {
    title: googleBook.title,
    authors: googleBook.authors,
    isbn13: googleBook.isbn13,
  });
  if (existing) return existing;

  // If ISBN available → multi-API enrichment via edge function
  if (googleBook.isbn13) {
    try {
      const { data, error } = await supabase.functions.invoke("book_import", {
        body: { isbn: googleBook.isbn13, fallback: googleBook },
      });
      if (!error && data && data.id) return data;
      if (error) console.warn("[importBook] edge function error:", error);
    } catch (err) {
      console.warn("[importBook] edge function unavailable:", err);
    }
  }

  // Fallback: client-side import with Google Books data only
  const slug = await generateBookSlug(
    googleBook.title,
    googleBook.authors || [],
    googleBook.publishedDate,
    slugExists
  );

  const { data: newBook, error } = await supabase
    .from("books")
    .insert({
      isbn_13: googleBook.isbn13,
      title: googleBook.title,
      subtitle: googleBook.subtitle,
      authors: googleBook.authors,
      publisher: googleBook.publisher,
      publication_date: googleBook.publishedDate,
      cover_url: googleBook.coverUrl,
      page_count: googleBook.pageCount,
      description: googleBook.description,
      language: "fr",
      source: "google_books",
      slug,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Import book error:", error);
    return null;
  }

  return newBook;
}
