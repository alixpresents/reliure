// Vercel Serverless Function — sert des tags OG dynamiques aux crawlers sociaux
// pour les pages livre/sélection qui ne sont pas encore prérendues.
//
// Flux : crawler → /livre/:slug → rewrite conditionnel (User-Agent) → /api/og?type=book&slug=...
// Les pages prérendues (filesystem) ont priorité sur les rewrites — cette function
// n'est appelée que pour les pages non prérendues.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SITE_URL = process.env.VITE_SITE_URL || "https://www.reliure.page";
const SITE_NAME = "Reliure";
const DEFAULT_DESCRIPTION =
  "Reliure est une bibliothèque personnelle et un réseau social littéraire pour la communauté francophone.";

export default async function handler(req, res) {
  const { type, slug } = req.query;

  if (!slug || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return serveHTML(res, {
      title: `${SITE_NAME} — Le réseau social de lecture francophone`,
      description: DEFAULT_DESCRIPTION,
      url: SITE_URL,
      image: null,
      ogType: "website",
    });
  }

  try {
    if (type === "book") return await serveBookOG(res, slug);
    if (type === "selection") return await serveSelectionOG(res, slug);
  } catch (err) {
    console.error("[og] error:", err);
  }

  return serveHTML(res, {
    title: `${SITE_NAME} — Le réseau social de lecture francophone`,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    image: null,
    ogType: "website",
  });
}

// ── Supabase REST helper ──

async function supabaseGet(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!resp.ok) return null;
  return resp.json();
}

function parseAuthors(authors) {
  if (!authors) return "";
  if (typeof authors === "string") {
    try {
      authors = JSON.parse(authors);
    } catch {
      return authors;
    }
  }
  if (Array.isArray(authors)) return authors.join(", ");
  return String(authors);
}

// ── Book OG ──

async function serveBookOG(res, slug) {
  let rows = await supabaseGet(
    "books",
    `slug=eq.${encodeURIComponent(slug)}&select=title,authors,cover_url,description&limit=1`,
  );

  if (!rows || rows.length === 0) {
    rows = await supabaseGet(
      "books",
      `id=eq.${encodeURIComponent(slug)}&select=title,authors,cover_url,description&limit=1`,
    );
  }

  if (!rows || rows.length === 0) {
    return serveHTML(res, {
      title: `Livre — ${SITE_NAME}`,
      description: DEFAULT_DESCRIPTION,
      url: `${SITE_URL}/livre/${slug}`,
      image: null,
      ogType: "book",
    });
  }

  const book = rows[0];
  const authors = parseAuthors(book.authors);
  const title = authors ? `${book.title} — ${authors}` : book.title;
  const description = book.description
    ? book.description.slice(0, 200) + (book.description.length > 200 ? "…" : "")
    : `Découvrez ${book.title}${authors ? ` de ${authors}` : ""} sur Reliure.`;

  return serveHTML(res, {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: `${SITE_URL}/livre/${slug}`,
    image: `${SITE_URL}/api/og-image?slug=${encodeURIComponent(slug)}`,
    ogType: "book",
  });
}

// ── Selection OG ──

async function serveSelectionOG(res, slug) {
  const rows = await supabaseGet(
    "lists",
    `slug=eq.${encodeURIComponent(slug)}&is_curated=eq.true&select=title,description,curator_name&limit=1`,
  );

  if (!rows || rows.length === 0) {
    return serveHTML(res, {
      title: `Sélection — ${SITE_NAME}`,
      description: DEFAULT_DESCRIPTION,
      url: `${SITE_URL}/selections/${slug}`,
      image: null,
      ogType: "website",
    });
  }

  const sel = rows[0];
  const title = sel.curator_name
    ? `${sel.title} — par ${sel.curator_name}`
    : sel.title;
  const description = sel.description
    ? sel.description.slice(0, 200)
    : "Sélection curée sur Reliure.";

  return serveHTML(res, {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: `${SITE_URL}/selections/${slug}`,
    image: null,
    ogType: "website",
  });
}

// ── HTML renderer ──

function esc(s) {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function serveHTML(res, { title, description, url, image, ogType }) {
  const imageTag = image
    ? `<meta property="og:image" content="${esc(image)}" />
    <meta name="twitter:image" content="${esc(image)}" />`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    ${imageTag}
  </head>
  <body>
    <p>Redirecting...</p>
    <script>window.location.href = "${esc(url)}";</script>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  return res.status(200).send(html);
}
