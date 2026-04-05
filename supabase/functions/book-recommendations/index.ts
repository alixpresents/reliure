import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// ISBN-13 checksum validation
// ---------------------------------------------------------------------------
function isValidIsbn13(isbn: string): boolean {
  if (!isbn || !/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(isbn[12]);
}

// ---------------------------------------------------------------------------
// Title normalization (mirrors src/utils/deduplicateBook.js)
// ---------------------------------------------------------------------------
function normTitle(t: string): string {
  return t
    .replace(/[\u2018\u2019\u201A\u2039\u203A''`]/g, " ")
    .toLowerCase()
    .trim()
    .split(/\s*[:/]\s/)[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lastNameOf(author: string): string {
  let n = author
    .replace(/\([^)]*\)/g, "")
    .replace(/\.\s*[A-Z].*$/, "")
    .trim();
  if (n.includes(",")) n = n.split(",")[0].trim();
  else {
    const p = n.split(/\s+/);
    n = p[p.length - 1];
  }
  return n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ---------------------------------------------------------------------------
// Find existing book by title+author (same logic as deduplicateBook.js)
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
async function findByTitleAuthor(supabase: any, title: string, author: string | null) {
  const nt = normTitle(title);
  if (!nt) return null;
  const firstWord = nt.split(" ")[0];
  if (firstWord.length < 2) return null;
  const authorLast = author ? lastNameOf(author) : null;

  const { data: candidates } = await supabase
    .from("books")
    .select("id, title, authors, slug, isbn_13, cover_url, publication_date, avg_rating, rating_count")
    .ilike("norm_title", `%${firstWord}%`)
    .limit(20);

  if (!candidates?.length) return null;

  for (const c of candidates) {
    if (normTitle(c.title) !== nt) continue;
    const cAuthor = Array.isArray(c.authors) && c.authors[0]
      ? lastNameOf(c.authors[0])
      : null;
    if (!authorLast || !cAuthor || cAuthor === authorLast) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Import a book via the book_import edge function
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
async function importBook(isbn: string, title: string, author: string): Promise<any> {
  const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/book_import`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      isbn: isbn.replace(/-/g, ""),
      fallback: { title, authors: [author] },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return null;
  const book = await res.json();
  return book?.id ? book : null;
}

// ---------------------------------------------------------------------------
// Collect user reading signals
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
async function collectSignals(supabase: any, userId: string) {
  // Parallel queries — reviews fetched separately (no FK from reading_status to reviews)
  const [favResult, statusResult, reviewsResult, quotesResult, allBooksResult] =
    await Promise.all([
      // 4 favorites
      supabase
        .from("user_favorites")
        .select("book_id, position, note, books(title, authors, genres, publication_date)")
        .eq("user_id", userId)
        .order("position")
        .limit(4),

      // 25 most recent reading_status — no reviews join
      supabase
        .from("reading_status")
        .select("book_id, status, is_reread, finished_at, books(title, authors, genres, publication_date)")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(25),

      // Reviews — separate query, lookup by book_id
      supabase
        .from("reviews")
        .select("book_id, rating, body")
        .eq("user_id", userId),

      // Quotes count per book
      supabase
        .from("quotes")
        .select("book_id")
        .eq("user_id", userId),

      // All book_ids for exclusion
      supabase
        .from("reading_status")
        .select("book_id")
        .eq("user_id", userId),
    ]);

  const favorites = favResult.data || [];
  const statuses = statusResult.data || [];
  const reviews = reviewsResult.data || [];
  const quotes = quotesResult.data || [];
  const allBookIds = new Set(
    (allBooksResult.data || []).map(
      (r: { book_id: string }) => r.book_id,
    ),
  );
  // Also include favorites in exclusion set
  for (const f of favorites) allBookIds.add(f.book_id);

  // Build review map: book_id → { rating, body }
  const reviewMap = new Map<string, { rating: number | null; body: string | null }>();
  for (const r of reviews) {
    reviewMap.set(r.book_id, { rating: r.rating || null, body: r.body || null });
  }

  // Count quotes per book
  const quoteCountMap = new Map<string, number>();
  for (const q of quotes) {
    quoteCountMap.set(q.book_id, (quoteCountMap.get(q.book_id) || 0) + 1);
  }

  return { favorites, statuses, reviewMap, quoteCountMap, allBookIds };
}

// ---------------------------------------------------------------------------
// Build weighted context for the LLM
// ---------------------------------------------------------------------------
interface WeightedBook {
  title: string;
  author: string;
  genres: string[];
  year: string | null;
  weight: number;
  rating: number | null;
  is_favorite: boolean;
  is_reread: boolean;
  has_review: boolean;
  has_quotes: boolean;
  status: string;
}

// deno-lint-ignore no-explicit-any
function buildWeightedContext(
  favorites: any[],
  statuses: any[],
  reviewMap: Map<string, { rating: number | null; body: string | null }>,
  quoteCountMap: Map<string, number>,
) {
  const bookMap = new Map<string, WeightedBook>();

  // Favorites → weight ×5
  for (const f of favorites) {
    const b = f.books;
    if (!b?.title) continue;
    bookMap.set(f.book_id, {
      title: b.title,
      author: Array.isArray(b.authors) ? b.authors.join(", ") : "",
      genres: b.genres || [],
      year: b.publication_date?.slice(0, 4) || null,
      weight: 5,
      rating: null,
      is_favorite: true,
      is_reread: false,
      has_review: false,
      has_quotes: false,
      status: "read",
    });
  }

  // Reading statuses
  for (const s of statuses) {
    const b = s.books;
    if (!b?.title) continue;

    const existing = bookMap.get(s.book_id);
    let weight = existing?.weight || 0;

    // Rating weight — lookup from reviewMap
    const review = reviewMap.get(s.book_id);
    const rating = review?.rating || null;
    if (rating === 5) weight += 4;
    else if (rating === 4) weight += 3;
    else if (rating === 3) weight += 1;
    else if (rating && rating <= 2) weight += -3;

    // Reread
    if (s.is_reread) weight += 4;

    // Quotes
    const qCount = quoteCountMap.get(s.book_id) || 0;
    if (qCount > 0) weight += 2.5;

    // Review text
    const hasReview = !!review?.body;
    if (hasReview) weight += 2;

    // Abandoned
    if (s.status === "abandoned") weight += -2;

    const entry: WeightedBook = {
      title: b.title,
      author: Array.isArray(b.authors) ? b.authors.join(", ") : "",
      genres: b.genres || [],
      year: b.publication_date?.slice(0, 4) || null,
      weight,
      rating,
      is_favorite: existing?.is_favorite || false,
      is_reread: !!s.is_reread,
      has_review: hasReview,
      has_quotes: qCount > 0,
      status: s.status,
    };
    bookMap.set(s.book_id, entry);
  }

  // Sort by weight desc, take top 20
  const all = [...bookMap.values()].sort((a, b) => b.weight - a.weight);
  const top20 = all.slice(0, 20);

  // Add 5 most recent reads (by finished_at) that aren't already in top20
  const top20Titles = new Set(top20.map((b) => b.title));
  const recentReads = statuses
    .filter(
      (s: { status: string; books?: { title: string } }) =>
        s.status === "read" && s.books?.title && !top20Titles.has(s.books.title),
    )
    .slice(0, 5);

  for (const s of recentReads) {
    const b = s.books;
    const review = reviewMap.get(s.book_id);
    top20.push({
      title: b.title,
      author: Array.isArray(b.authors) ? b.authors.join(", ") : "",
      genres: b.genres || [],
      year: b.publication_date?.slice(0, 4) || null,
      weight: 0,
      rating: review?.rating || null,
      is_favorite: false,
      is_reread: !!s.is_reread,
      has_review: !!review?.body,
      has_quotes: (quoteCountMap.get(s.book_id) || 0) > 0,
      status: "read",
    });
  }

  return top20;
}

// ---------------------------------------------------------------------------
// Format context for the LLM prompt
// ---------------------------------------------------------------------------
function formatContext(books: WeightedBook[]): string {
  const favorites = books.filter((b) => b.is_favorite);
  const positive = books.filter((b) => !b.is_favorite && b.weight > 0);
  const negative = books.filter((b) => b.weight < 0);
  const neutral = books.filter(
    (b) => !b.is_favorite && b.weight === 0,
  );

  const formatBook = (b: WeightedBook) => {
    const parts = [`"${b.title}" — ${b.author}`];
    if (b.genres.length) parts.push(`genres: ${b.genres.slice(0, 3).join(", ")}`);
    if (b.year) parts.push(`(${b.year})`);
    if (b.rating) parts.push(`note: ${b.rating}/5`);
    if (b.is_reread) parts.push("relu");
    if (b.has_quotes) parts.push("citations sauvées");
    if (b.has_review) parts.push("critiqué");
    if (b.status === "abandoned") parts.push("ABANDONNÉ");
    return parts.join(" · ");
  };

  const sections: string[] = [];
  if (favorites.length) {
    sections.push(
      `FAVORIS (les livres les plus importants pour ce lecteur) :\n${favorites.map((b) => `- ${formatBook(b)}`).join("\n")}`,
    );
  }
  if (positive.length) {
    sections.push(
      `LIVRES APPRÉCIÉS :\n${positive.map((b) => `- ${formatBook(b)}`).join("\n")}`,
    );
  }
  if (neutral.length) {
    sections.push(
      `LECT RÉCENTES :\n${neutral.map((b) => `- ${formatBook(b)}`).join("\n")}`,
    );
  }
  if (negative.length) {
    sections.push(
      `LIVRES PAS AIMÉS / ABANDONNÉS :\n${negative.map((b) => `- ${formatBook(b)}`).join("\n")}`,
    );
  }

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// SHA-256 hash
// ---------------------------------------------------------------------------
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Tu es un libraire francophone expert. À partir de la bibliothèque d'un lecteur, recommande exactement 5 livres qu'il n'a PAS encore lus.

Contraintes :
- Chaque recommandation doit avoir un ISBN-13 valide (édition poche française de préférence : Folio, Le Livre de Poche, Points, 10/18, Pocket, J'ai Lu, Babel)
- Privilégie les auteurs francophones et les éditions françaises
- Varie les auteurs (pas 2 livres du même auteur)
- Au moins 1 livre publié dans les 5 dernières années
- Inclus au moins 1 livre inattendu (pas le choix évident)
- Ne recommande pas de classiques évidents (Camus, Hugo, Proust, Saint-Exupéry) sauf si le lecteur semble débutant
- Explique en 1 phrase POURQUOI ce livre correspond au lecteur, en citant un de ses livres favoris ou appréciés
- Ne jamais inventer un ISBN. Si tu n'es pas certain de l'ISBN, retourne "0000000000000"
- Format JSON strict, pas de markdown

Réponds UNIQUEMENT avec un JSON valide :
[
  {
    "title": "Titre exact du livre",
    "author": "Nom complet de l'auteur",
    "isbn_13": "9780000000000",
    "year": 2024,
    "reason": "Parce que tu as aimé [X], tu retrouveras ici..."
  }
]`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  try {
    // Auth — extract user_id from JWT
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401, headers: getCorsHeaders(req) },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify JWT and get user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return Response.json(
        { error: "Invalid token" },
        { status: 401, headers: getCorsHeaders(req) },
      );
    }
    const userId = user.id;

    // ── Check cache ────────────────────────────────────────────
    const { data: cached } = await supabase
      .from("book_recommendations")
      .select("id, recommendations, context_hash, generated_at, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    // If cache is valid and not expired, return it
    if (cached && new Date(cached.expires_at) > new Date()) {
      // Resolve book details for the cached recommendations
      const recos = await resolveBookDetails(supabase, cached.recommendations);
      return Response.json(
        { recommendations: recos, cached: true },
        { headers: getCorsHeaders(req) },
      );
    }

    // ── Rate limit: max 1 generation per 24h ──────────────────
    if (cached) {
      const generatedAt = new Date(cached.generated_at).getTime();
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (generatedAt > twentyFourHoursAgo) {
        // Too recent — return existing cache even if expired
        const recos = await resolveBookDetails(
          supabase,
          cached.recommendations,
        );
        return Response.json(
          { recommendations: recos, cached: true, rate_limited: true },
          { headers: getCorsHeaders(req) },
        );
      }
    }

    // ── Collect signals ────────────────────────────────────────
    const { favorites, statuses, reviewMap, quoteCountMap, allBookIds } =
      await collectSignals(supabase, userId);

    // Need at least 5 books with status='read'
    const readCount = statuses.filter(
      (s: { status: string }) => s.status === "read",
    ).length;
    if (readCount < 5) {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(req),
      });
    }

    // ── Build context ──────────────────────────────────────────
    const weightedBooks = buildWeightedContext(
      favorites,
      statuses,
      reviewMap,
      quoteCountMap,
    );
    const contextText = formatContext(weightedBooks);

    // ── Check context_hash — skip re-generation if same context
    const contextHash = await sha256(contextText);
    if (cached && cached.context_hash === contextHash) {
      // Same reading profile — just renew expiration
      const newExpiry = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      await supabase
        .from("book_recommendations")
        .update({
          expires_at: newExpiry,
          generated_at: new Date().toISOString(),
        })
        .eq("id", cached.id);

      const recos = await resolveBookDetails(supabase, cached.recommendations);
      return Response.json(
        { recommendations: recos, cached: true, renewed: true },
        { headers: getCorsHeaders(req) },
      );
    }

    // ── Call Claude Sonnet ──────────────────────────────────────
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("book-recommendations: ANTHROPIC_API_KEY not set");
      return Response.json(
        { error: "Service unavailable" },
        { status: 503, headers: getCorsHeaders(req) },
      );
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Bibliothèque du lecteur :\n\n${contextText}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      console.error(
        "book-recommendations: Anthropic API error",
        aiRes.status,
        errText.slice(0, 200),
      );
      // If we have stale cache, return it
      if (cached) {
        const recos = await resolveBookDetails(
          supabase,
          cached.recommendations,
        );
        return Response.json(
          { recommendations: recos, cached: true, stale: true },
          { headers: getCorsHeaders(req) },
        );
      }
      return Response.json(
        { error: "AI service unavailable" },
        { status: 503, headers: getCorsHeaders(req) },
      );
    }

    const aiData = await aiRes.json();
    const tokensUsed =
      (aiData.usage?.input_tokens || 0) + (aiData.usage?.output_tokens || 0);
    const rawText = aiData.content?.[0]?.text || "";
    const cleaned = rawText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsedRecos: Array<{
      title: string;
      author: string;
      isbn_13: string;
      year: number;
      reason: string;
    }>;
    try {
      parsedRecos = JSON.parse(cleaned);
      if (!Array.isArray(parsedRecos)) throw new Error("Not an array");
    } catch {
      console.error("book-recommendations: Failed to parse AI response");
      if (cached) {
        const recos = await resolveBookDetails(
          supabase,
          cached.recommendations,
        );
        return Response.json(
          { recommendations: recos, cached: true, stale: true },
          { headers: getCorsHeaders(req) },
        );
      }
      return Response.json(
        { error: "Failed to generate recommendations" },
        { status: 500, headers: getCorsHeaders(req) },
      );
    }

    // ── Resolve each recommendation to a real book ─────────────
    const validRecos: Array<{
      book_id: string;
      reason: string;
      position: number;
    }> = [];

    for (const reco of parsedRecos.slice(0, 5)) {
      if (!reco.title || !reco.author) continue;

      let book = null;
      const isbn = (reco.isbn_13 || "").replace(/-/g, "");

      // 1. Try ISBN if valid
      if (isbn && isbn !== "0000000000000" && isValidIsbn13(isbn)) {
        const { data } = await supabase
          .from("books")
          .select("id, title, authors, slug, cover_url")
          .eq("isbn_13", isbn)
          .maybeSingle();
        book = data;
      }

      // 2. Try title+author normalization
      if (!book) {
        book = await findByTitleAuthor(supabase, reco.title, reco.author);
      }

      // 3. Try book_import with ISBN
      if (!book && isbn && isbn !== "0000000000000" && isValidIsbn13(isbn)) {
        try {
          book = await importBook(isbn, reco.title, reco.author);
        } catch (e) {
          console.error(
            `book-recommendations: import failed for "${reco.title}":`,
            (e as Error).message,
          );
        }
      }

      // Skip if no book found or already in user's library
      if (!book?.id) continue;
      if (allBookIds.has(book.id)) continue;

      validRecos.push({
        book_id: book.id,
        reason: reco.reason || "",
        position: validRecos.length + 1,
      });
    }

    // Need at least 3 valid recommendations
    if (validRecos.length < 3) {
      console.error(
        `book-recommendations: only ${validRecos.length} valid recos, need 3+`,
      );
      if (cached) {
        const recos = await resolveBookDetails(
          supabase,
          cached.recommendations,
        );
        return Response.json(
          { recommendations: recos, cached: true, stale: true },
          { headers: getCorsHeaders(req) },
        );
      }
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(req),
      });
    }

    // ── Upsert recommendations ─────────────────────────────────
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    const { error: upsertErr } = await supabase
      .from("book_recommendations")
      .upsert(
        {
          user_id: userId,
          recommendations: validRecos,
          model_used: "claude-sonnet",
          tokens_used: tokensUsed,
          context_hash: contextHash,
          generated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertErr) {
      console.error("book-recommendations: upsert failed", upsertErr.message);
      return Response.json(
        { error: "Failed to save recommendations" },
        { status: 500, headers: getCorsHeaders(req) },
      );
    }

    // ── Return with full book details ──────────────────────────
    const recos = await resolveBookDetails(supabase, validRecos);
    return Response.json(
      { recommendations: recos, cached: false },
      { headers: getCorsHeaders(req) },
    );
  } catch (err) {
    console.error("book-recommendations error:", err);
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: getCorsHeaders(req) },
    );
  }
});

// ---------------------------------------------------------------------------
// Resolve book_ids to full book details for the response
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
async function resolveBookDetails(supabase: any, recos: any[]) {
  if (!recos?.length) return [];

  const bookIds = recos.map(
    (r: { book_id: string }) => r.book_id,
  );
  const { data: books } = await supabase
    .from("books")
    .select("id, title, authors, cover_url, slug, avg_rating, rating_count")
    .in("id", bookIds);

  const bookMap = new Map(
    (books || []).map((b: { id: string }) => [b.id, b]),
  );

  return recos
    .map((r: { book_id: string; reason: string; position: number }) => {
      const book = bookMap.get(r.book_id) as {
        id: string;
        title: string;
        authors: string[];
        cover_url: string;
        slug: string;
        avg_rating: number;
        rating_count: number;
      } | undefined;
      if (!book) return null;
      return {
        book_id: book.id,
        title: book.title,
        authors: book.authors,
        cover_url: book.cover_url,
        slug: book.slug,
        avg_rating: book.avg_rating,
        rating_count: book.rating_count,
        reason: r.reason,
        position: r.position,
      };
    })
    .filter(Boolean);
}
