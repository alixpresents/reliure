import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Electre NG — source de référence pour les livres francophones
// ---------------------------------------------------------------------------
let electreToken: string | null = null;
let electreTokenExpiresAt = 0;

async function getElectreToken(): Promise<string> {
  const now = Date.now();
  if (electreToken && electreTokenExpiresAt > now + 60_000) {
    return electreToken;
  }

  const authUrl = Deno.env.get("ELECTRE_AUTH_URL");
  const username = Deno.env.get("ELECTRE_USERNAME");
  const password = Deno.env.get("ELECTRE_PASSWORD");

  if (!authUrl || !username || !password) {
    throw new Error("Missing Electre credentials");
  }

  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "api-client",
      username,
      password,
      scope: "roles",
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Electre auth failed: ${res.status}`);
  const data = await res.json();
  electreToken = data.access_token;
  electreTokenExpiresAt = now + (data.expires_in || 300) * 1000;
  return electreToken!;
}

interface ElectreNotice {
  noticeId?: string;
  oeuvreId?: string;
  titre?: string;
  sousTitre?: string;
  auteurs?: Array<{ nom?: string; prenom?: string; role?: string }>;
  editeur?: string;
  collection?: string;
  dateParution?: string;
  nbPages?: number;
  couverture?: string;
  resume?: string;
  quatriemeDeCouverture?: string;
  langue?: string;
  genres?: string[];
  fiction?: boolean;
  disponibilite?: string;
  ean?: string;
}

function parseElectreNotice(
  notice: ElectreNotice,
): BookMeta & {
  electre_notice_id: string | null;
  oeuvre_id: string | null;
  collection_name: string | null;
  flag_fiction: boolean | null;
  quatrieme_de_couverture: string | null;
  disponibilite: string | null;
} {
  const authors = notice.auteurs
    ?.filter((a) => !a.role || a.role === "auteur" || a.role === "Auteur")
    .map((a) => [a.prenom, a.nom].filter(Boolean).join(" "))
    .filter(Boolean);

  return {
    title: notice.titre || null,
    subtitle: notice.sousTitre || null,
    authors: authors?.length ? authors : null,
    publisher: notice.editeur || null,
    publication_date: notice.dateParution || null,
    page_count: notice.nbPages || null,
    cover_url: notice.couverture || null,
    description: notice.resume || notice.quatriemeDeCouverture || null,
    language: notice.langue || null,
    genres: notice.genres?.length ? notice.genres : null,
    electre_notice_id: notice.noticeId || null,
    oeuvre_id: notice.oeuvreId || null,
    collection_name: notice.collection || null,
    flag_fiction: notice.fiction ?? null,
    quatrieme_de_couverture: notice.quatriemeDeCouverture || null,
    disponibilite: notice.disponibilite || null,
  };
}

async function fetchElectre(isbn: string) {
  const apiUrl = Deno.env.get("ELECTRE_API_URL");
  if (!apiUrl) return null;

  try {
    const token = await getElectreToken();
    const params = new URLSearchParams();
    params.append("ean", isbn);
    params.append("catalogue", "livre");
    params.append("editions-liees", "false");

    const res = await fetch(`${apiUrl}/notices/eans?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    // L'API retourne un tableau de notices — prendre la première
    const notices = Array.isArray(data) ? data : data.notices || data.results || [];
    if (!notices.length) return null;

    return parseElectreNotice(notices[0]);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Google Books
// ---------------------------------------------------------------------------
async function fetchGoogleBooks(isbn: string) {
  const key = Deno.env.get("GOOGLE_BOOKS_KEY");
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${key ? `&key=${key}` : ""}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  const v = data.items?.[0]?.volumeInfo;
  if (!v) return null;

  // Prefer largest available cover, upgrade zoom & remove curl effect
  const il = v.imageLinks || {};
  const rawCover =
    il.extraLarge || il.large || il.medium || il.small || il.thumbnail || null;
  const cover = rawCover
    ? rawCover
        .replace("http://", "https://")
        .replace("&zoom=1", "&zoom=2")
        .replace("&edge=curl", "")
    : null;

  return {
    title: v.title || null,
    subtitle: v.subtitle || null,
    authors: v.authors || null,
    publisher: v.publisher || null,
    publication_date: v.publishedDate || null,
    page_count: v.pageCount || null,
    cover_url: cover,
    description: v.description || null,
    language: v.language || null,
    genres: v.categories || null,
  };
}

// ---------------------------------------------------------------------------
// Open Library
// ---------------------------------------------------------------------------
async function fetchOpenLibrary(isbn: string) {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data[`ISBN:${isbn}`];
  if (!entry) return null;

  const authors = entry.authors?.map((a: { name: string }) => a.name);
  const genres = entry.subjects
    ?.map((s: { name: string }) => s.name)
    .slice(0, 5);

  return {
    title: entry.title || null,
    subtitle: entry.subtitle || null,
    authors: authors?.length ? authors : null,
    publisher: entry.publishers?.[0]?.name || null,
    publication_date: entry.publish_date || null,
    page_count: entry.number_of_pages || null,
    cover_url: entry.cover?.large || entry.cover?.medium || null,
    description: entry.notes || entry.first_sentence?.value || null,
    language: null,
    genres: genres?.length ? genres : null,
  };
}

// ---------------------------------------------------------------------------
// BnF SRU  (UNIMARC XML)
// ---------------------------------------------------------------------------
function getDatafields(
  xml: string,
  tag: string,
): Array<Record<string, string>> {
  const results: Array<Record<string, string>> = [];
  const dfRe = new RegExp(
    `<[^>]*datafield[^>]*tag="${tag}"[^>]*>([\\s\\S]*?)<\\/[^>]*datafield>`,
    "g",
  );
  let m;
  while ((m = dfRe.exec(xml)) !== null) {
    const fields: Record<string, string> = {};
    const sfRe = /<[^>]*subfield[^>]*code="([^"]+)"[^>]*>([^<]*)</g;
    let sf;
    while ((sf = sfRe.exec(m[1])) !== null) {
      fields[sf[1]] = sf[2].trim();
    }
    results.push(fields);
  }
  return results;
}

async function fetchBnF(isbn: string) {
  const url =
    `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve` +
    `&query=bib.isbn+adj+"${isbn}"&recordSchema=unimarcxchange&maximumRecords=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const xml = await res.text();

  if (
    xml.includes("<srw:numberOfRecords>0</srw:numberOfRecords>") ||
    !xml.includes("datafield")
  ) {
    return null;
  }

  // Zone 200 $a → titre
  const z200 = getDatafields(xml, "200")[0];
  const title = z200?.a || null;

  // Zone 700/701 $a=nom $b=prénom → "Prénom Nom"
  const authors: string[] = [];
  for (const tag of ["700", "701"]) {
    for (const f of getDatafields(xml, tag)) {
      const name = [f.b, f.a].filter(Boolean).join(" ");
      if (name) authors.push(name);
    }
  }

  // Zone 210 $c → éditeur, $d → date
  const z210 = getDatafields(xml, "210")[0];
  const publisher =
    z210?.c?.replace(/^[\s:]+|[\s,]+$/g, "") || null;
  const dateMatch = (z210?.d || "").match(/(\d{4})/);
  const pubDate = dateMatch ? dateMatch[1] : null;

  // Zone 215 $a → pages ("172 p.")
  const z215 = getDatafields(xml, "215")[0];
  const pageMatch = (z215?.a || "").match(/(\d+)\s*p/i);
  const pageCount = pageMatch ? parseInt(pageMatch[1]) : null;

  // Zone 101 $a → langue
  const z101 = getDatafields(xml, "101")[0];
  const language = z101?.a || null;

  return {
    title,
    subtitle: null,
    authors: authors.length ? authors : null,
    publisher,
    publication_date: pubDate,
    page_count: pageCount,
    cover_url: null,
    description: null,
    language,
    genres: null,
  };
}

// ---------------------------------------------------------------------------
// MetasBooks
// ---------------------------------------------------------------------------
async function fetchMetasBooks(isbn13: string): Promise<Partial<BookMeta> | null> {
  const key = Deno.env.get("METASBOOKS_API_KEY");
  if (!key || !isbn13) return null;

  try {
    const res = await fetch(
      `https://metasbooks.fr/api/v1/lookup?ean=${isbn13.replace(/-/g, "")}`,
      {
        headers: { "X-API-Key": key },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok || !data.meta) return null;

    const m = data.meta;
    return {
      publisher: m.editeur || null,
      description: m.description || null,
      page_count: m.nbpages ? parseInt(m.nbpages) : null,
      cover_url: m.url_image || null,
      publication_date: m.date_parrution
        ? m.date_parrution.split("-").reverse().join("-") // DD-MM-YYYY → YYYY-MM-DD
        : null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Slug generation (mirrors src/utils/slugify.js)
// ---------------------------------------------------------------------------
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// deno-lint-ignore no-explicit-any
async function generateSlug(
  title: string,
  authors: string[],
  year: string | null,
  supabase: any,
): Promise<string> {
  const exists = async (slug: string) => {
    const { data } = await supabase
      .from("books")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    return !!data;
  };

  const base = slugify(title);
  if (!base) return `book-${Date.now()}`;
  if (!(await exists(base))) return base;

  const lastName = authors[0]?.split(" ").pop();
  if (lastName) {
    const withAuthor = `${base}-${slugify(lastName)}`;
    if (withAuthor !== base && !(await exists(withAuthor))) return withAuthor;
    const y = year?.slice(0, 4);
    if (y) {
      const withYear = `${withAuthor}-${y}`;
      if (!(await exists(withYear))) return withYear;
    }
  }
  for (let i = 2; i <= 100; i++) {
    if (!(await exists(`${base}-${i}`))) return `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Merge logic — first non-null/non-empty value wins
// ---------------------------------------------------------------------------
function pick<T>(...values: (T | null | undefined)[]): T | null {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    return v;
  }
  return null;
}

interface BookMeta {
  title: string | null;
  subtitle: string | null;
  authors: string[] | null;
  publisher: string | null;
  publication_date: string | null;
  page_count: number | null;
  cover_url: string | null;
  description: string | null;
  language: string | null;
  genres: string[] | null;
}

// deno-lint-ignore no-explicit-any
function mergeSources(
  google: BookMeta | null,
  openLib: BookMeta | null,
  bnf: BookMeta | null,
  fallback: any,
  electre: ReturnType<typeof parseElectreNotice> | null = null,
): BookMeta {
  return {
    // Electre > BnF > Google > OL (sources FR prioritaires)
    title:
      pick(electre?.title, bnf?.title, google?.title, openLib?.title, fallback?.title) ||
      "Sans titre",
    subtitle: pick(electre?.subtitle, google?.subtitle, openLib?.subtitle, fallback?.subtitle),
    authors:
      pick(
        electre?.authors,
        google?.authors,
        bnf?.authors,
        openLib?.authors,
        fallback?.authors,
      ) || [],
    publisher: pick(
      electre?.publisher,
      bnf?.publisher,
      openLib?.publisher,
      google?.publisher,
      fallback?.publisher,
    ),
    publication_date: pick(
      electre?.publication_date,
      bnf?.publication_date,
      google?.publication_date,
      openLib?.publication_date,
      fallback?.publishedDate,
    ),
    page_count: pick(
      electre?.page_count,
      openLib?.page_count,
      google?.page_count,
      bnf?.page_count,
      fallback?.pageCount,
    ),
    // Couverture : Electre > Google (zoom 2) > OL
    cover_url: pick(
      electre?.cover_url,
      google?.cover_url,
      openLib?.cover_url,
      bnf?.cover_url,
      fallback?.coverUrl,
    ),
    // Description : Electre (4ème de couv ou résumé) > Google > OL
    description: pick(
      electre?.description,
      google?.description,
      openLib?.description,
      fallback?.description,
    ),
    language: pick(electre?.language, bnf?.language, google?.language) || "fr",
    genres: pick(electre?.genres, google?.genres, openLib?.genres) || [],
  };
}

// ---------------------------------------------------------------------------
// Anti-doublons : recherche par titre normalisé + auteur
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

function lastNameOf(authors: string[] | null): string | null {
  const first = authors?.[0];
  if (!first) return null;
  let n = first.replace(/\([^)]*\)/g, "").replace(/\.\s*[A-Z].*$/, "").trim();
  if (n.includes(",")) n = n.split(",")[0].trim();
  else { const p = n.split(/\s+/); n = p[p.length - 1]; }
  return n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function findByTitleAuthor(
  supabase: ReturnType<typeof createClient>,
  title: string,
  authors: string[] | null,
) {
  const nt = normTitle(title);
  if (!nt) return null;
  const firstWord = nt.split(" ")[0];
  if (firstWord.length < 2) return null;
  const authorLast = lastNameOf(authors);

  const { data: candidates } = await supabase
    .from("books")
    .select("*")
    .ilike("title", `%${firstWord}%`)
    .limit(20);

  if (!candidates?.length) return null;

  for (const c of candidates) {
    if (normTitle(c.title) !== nt) continue;
    const cAuthor = lastNameOf(Array.isArray(c.authors) ? c.authors : null);
    if (!authorLast || !cAuthor || cAuthor === authorLast) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const { isbn, fallback } = await req.json();
    if (!isbn) {
      return new Response(JSON.stringify({ error: "isbn required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (!/^\d{10}(\d{3})?$/.test(isbn)) {
      return new Response(JSON.stringify({ error: "Invalid ISBN format" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Already imported?
    const { data: existing } = await supabase
      .from("books")
      .select("*")
      .eq("isbn_13", isbn)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify(existing), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Fetch all sources in parallel — never let one failure block the rest
    const [google, openLib, bnf, metasData, electreData] = await Promise.all([
      fetchGoogleBooks(isbn).catch((e) => {
        console.error("Google Books error:", e.message);
        return null;
      }),
      fetchOpenLibrary(isbn).catch((e) => {
        console.error("Open Library error:", e.message);
        return null;
      }),
      fetchBnF(isbn).catch((e) => {
        console.error("BnF error:", e.message);
        return null;
      }),
      fetchMetasBooks(isbn).catch(() => null),
      fetchElectre(isbn).catch((e) => {
        console.error("Electre error:", e.message);
        return null;
      }),
    ]);

    console.log(
      `[book_import] ${isbn} — Electre:${!!electreData} Google:${!!google} OL:${!!openLib} BnF:${!!bnf} MetasBooks:${!!metasData}`,
    );

    const merged = mergeSources(google, openLib, bnf, fallback, electreData);

    // MetasBooks enrichment — comble les champs vides après fusion principale
    let enrichedByMetasbooks = false;

    if (metasData?.description &&
        (!merged.description || merged.description.length < 100)) {
      merged.description = metasData.description;
      enrichedByMetasbooks = true;
    }
    if (metasData?.publisher && !merged.publisher) {
      merged.publisher = metasData.publisher;
      enrichedByMetasbooks = true;
    }
    if (metasData?.page_count && !merged.page_count) {
      merged.page_count = metasData.page_count;
      enrichedByMetasbooks = true;
    }
    if (metasData?.cover_url) {
      const currentCover = merged.cover_url || "";
      if (!currentCover || currentCover.includes("books.google")) {
        merged.cover_url = metasData.cover_url;
        enrichedByMetasbooks = true;
      }
    }
    if (metasData?.publication_date && !merged.publication_date) {
      merged.publication_date = metasData.publication_date;
      enrichedByMetasbooks = true;
    }

    if (enrichedByMetasbooks) {
      console.log("[book_import] MetasBooks enriched:", isbn);
    }

    // Anti-doublons : même oeuvre sous un ISBN différent ?
    if (merged.title) {
      const dup = await findByTitleAuthor(
        supabase,
        merged.title,
        (merged.authors as string[]) || null,
      );
      if (dup) {
        return new Response(JSON.stringify(dup), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    const slug = await generateSlug(
      merged.title!,
      (merged.authors as string[]) || [],
      merged.publication_date,
      supabase,
    );

    // Determine source tag
    let sourceTag = "multi_api";
    if (electreData) sourceTag = "multi_api_electre";
    else if (enrichedByMetasbooks) sourceTag = "multi_api_metasbooks";

    const insertPayload: Record<string, unknown> = {
      isbn_13: isbn,
      title: merged.title,
      subtitle: merged.subtitle,
      authors: merged.authors,
      publisher: merged.publisher,
      publication_date: merged.publication_date,
      cover_url: merged.cover_url,
      page_count: merged.page_count,
      description: merged.description,
      language: merged.language,
      genres: merged.genres,
      source: sourceTag,
      slug,
    };

    // Electre-specific fields
    if (electreData) {
      insertPayload.electre_notice_id = electreData.electre_notice_id;
      insertPayload.oeuvre_id = electreData.oeuvre_id;
      insertPayload.collection_name = electreData.collection_name;
      insertPayload.flag_fiction = electreData.flag_fiction;
      insertPayload.quatrieme_de_couverture = electreData.quatrieme_de_couverture;
      insertPayload.disponibilite = electreData.disponibilite;
    }

    const { data: book, error } = await supabase
      .from("books")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(book), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("book_import error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
