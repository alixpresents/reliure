import { supabase } from "./supabase";
import { generateBookSlug } from "../utils/slugify";

async function slugExists(slug) {
  const { data } = await supabase.from("books").select("id").eq("slug", slug).limit(1).maybeSingle();
  return !!data;
}

export async function importBook(googleBook) {
  // Try to find by ISBN first
  if (googleBook.isbn13) {
    const { data: existing } = await supabase
      .from("books")
      .select("*")
      .eq("isbn_13", googleBook.isbn13)
      .single();
    if (existing) return existing;
  }

  // Try to find by exact title + first author
  const firstAuthor = googleBook.authors?.[0];
  if (firstAuthor) {
    const { data: existing } = await supabase
      .from("books")
      .select("*")
      .eq("title", googleBook.title)
      .contains("authors", [firstAuthor])
      .single();
    if (existing) return existing;
  }

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
