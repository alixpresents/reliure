import { supabase } from "./supabase";

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

  // Insert new book
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
    })
    .select("*")
    .single();

  if (error) {
    console.error("Import book error:", error);
    return null;
  }

  return newBook;
}
