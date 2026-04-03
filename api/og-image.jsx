// Vercel Edge Function — génère un PNG 1200×630 pour og:image
// Appelée par api/og.js pour les livres non prérendus.
// Cache CDN 24h (s-maxage=86400) + stale-while-revalidate 7j.

import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Chargé une fois, mis en cache par le runtime Edge
const garamondFontPromise = fetch(
  "https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUA4V-e6yHgQ.woff",
).then((res) => res.arrayBuffer());

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

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1918",
          gap: "12px",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: "#e8e5df",
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          reliure
        </div>
        <div style={{ fontSize: 15, color: "#6a6560", display: "flex" }}>
          Le réseau social de lecture francophone
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: CACHE_HEADERS },
  );
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return fallbackImage();
  }

  let book = null;
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/books?slug=eq.${encodeURIComponent(slug)}&select=title,authors,cover_url,description&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    const rows = await resp.json();
    if (rows?.length > 0) book = rows[0];
  } catch (err) {
    console.error("[og-image] fetch error:", err);
  }

  if (!book) return fallbackImage();

  const authors = parseAuthors(book.authors);
  const desc = book.description
    ? book.description.slice(0, 140) +
      (book.description.length > 140 ? "…" : "")
    : "";
  const titleFontSize = book.title.length > 40 ? 34 : 42;

  let fontData;
  try {
    fontData = await garamondFontPromise;
  } catch {
    // Si la font échoue, Satori utilise sa font système — pas bloquant
    fontData = null;
  }

  const fonts = fontData
    ? [{ name: "EB Garamond", data: fontData, style: "normal", weight: 400 }]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#1a1918",
        }}
      >
        {/* Couverture */}
        <div
          style={{
            width: "380px",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: "40px 20px 40px 50px",
          }}
        >
          {book.cover_url ? (
            <img
              src={book.cover_url}
              width={220}
              height={330}
              style={{
                borderRadius: "4px",
                objectFit: "cover",
                boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
              }}
            />
          ) : (
            <div
              style={{
                width: "220px",
                height: "330px",
                borderRadius: "4px",
                backgroundColor: "#2a2928",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                fontFamily: fontData ? '"EB Garamond"' : "serif",
                fontSize: "24px",
                color: "#8a8680",
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              {book.title}
            </div>
          )}
        </div>

        {/* Texte */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 50px 40px 20px",
          }}
        >
          <div
            style={{
              fontFamily: fontData ? '"EB Garamond"' : "serif",
              fontSize: titleFontSize,
              fontWeight: 400,
              color: "#e8e5df",
              lineHeight: 1.2,
              marginBottom: "10px",
              display: "flex",
            }}
          >
            {book.title}
          </div>

          {authors && (
            <div
              style={{
                fontSize: 20,
                color: "#8a8680",
                marginBottom: desc ? "20px" : "30px",
                display: "flex",
              }}
            >
              {authors}
            </div>
          )}

          {desc && (
            <div
              style={{
                fontSize: 15,
                color: "#6a6560",
                lineHeight: 1.6,
                marginBottom: "30px",
                display: "flex",
                maxWidth: "95%",
              }}
            >
              {desc}
            </div>
          )}

          {/* Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "30px",
                height: "1px",
                backgroundColor: "#555",
                display: "flex",
              }}
            />
            <div
              style={{
                fontSize: 13,
                color: "#6a6560",
                letterSpacing: "0.12em",
                fontWeight: 500,
                display: "flex",
              }}
            >
              RELIURE
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts, headers: CACHE_HEADERS },
  );
}
