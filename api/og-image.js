// Vercel Serverless Function (Node.js) — génère un PNG 1200×630 pour og:image
// Utilise satori (HTML-to-SVG) + sharp (SVG-to-PNG).
// Appelée par api/og.js pour les livres non prérendus.
// Cache CDN 24h (s-maxage=86400) + stale-while-revalidate 7j.

import satori from "satori";
import sharp from "sharp";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Mis en cache entre les invocations à chaud
let fontData = null;

async function loadFont() {
  if (fontData) return fontData;
  const res = await fetch(
    "https://raw.githubusercontent.com/octaviopardo/EBGaramond12/master/fonts/ttf/EBGaramond-Regular.ttf",
  );
  fontData = Buffer.from(await res.arrayBuffer());
  return fontData;
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

async function renderPng(markup, font) {
  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [{ name: "EB Garamond", data: font, weight: 400, style: "normal" }],
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function sendPng(res, png) {
  res.setHeader("Content-Type", "image/png");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  return res.status(200).send(png);
}

async function serveFallback(res) {
  try {
    const font = await loadFont();
    const markup = {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1918",
          gap: 12,
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                fontSize: 36,
                fontWeight: 500,
                color: "#e8e5df",
                letterSpacing: "-0.02em",
              },
              children: "reliure",
            },
          },
          {
            type: "div",
            props: {
              style: { fontSize: 15, color: "#6a6560" },
              children: "Le réseau social de lecture francophone",
            },
          },
        ],
      },
    };
    const png = await renderPng(markup, font);
    return sendPng(res, png);
  } catch (err) {
    console.error("[og-image] fallback error:", err);
    res.setHeader("Content-Type", "text/plain");
    return res.status(500).send("Image generation failed");
  }
}

export default async function handler(req, res) {
  const slug = req.query.slug;

  if (!slug || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return serveFallback(res);
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

  if (!book) return serveFallback(res);

  const authors = parseAuthors(book.authors);
  const title = book.title || "Sans titre";
  const desc = book.description
    ? book.description.slice(0, 100) +
      (book.description.length > 100 ? "…" : "")
    : "";
  const titleFontSize = title.length > 40 ? 32 : 36;

  // Groupe texte bas-gauche
  const textGroupChildren = [
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          fontFamily: "EB Garamond",
          fontSize: titleFontSize,
          fontWeight: 400,
          color: "#ffffff",
          lineHeight: 1.2,
          marginBottom: 6,
        },
        children: title,
      },
    },
  ];

  if (authors) {
    textGroupChildren.push({
      type: "div",
      props: {
        style: {
          display: "flex",
          fontSize: 18,
          color: "rgba(255,255,255,0.7)",
          marginBottom: desc ? 8 : 0,
        },
        children: authors,
      },
    });
  }

  if (desc) {
    textGroupChildren.push({
      type: "div",
      props: {
        style: {
          display: "flex",
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
        },
        children: desc,
      },
    });
  }

  // Layers de l'image ou fond solide si pas de cover
  const backgroundLayers = book.cover_url
    ? [
        // Couverture plein cadre
        {
          type: "img",
          props: {
            src: book.cover_url,
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            },
          },
        },
        // Gradient overlay
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundImage:
                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)",
            },
          },
        },
      ]
    : [];

  const markup = {
    type: "div",
    props: {
      style: {
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#1a1918",
      },
      children: [
        ...backgroundLayers,
        // Couche contenu
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              alignItems: "flex-end",
            },
            children: [
              // Barre du bas
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    width: "100%",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    padding: "40px",
                  },
                  children: [
                    // Groupe texte gauche
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                        },
                        children: textGroupChildren,
                      },
                    },
                    // Branding droite
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          fontSize: 12,
                          color: "rgba(255,255,255,0.5)",
                          letterSpacing: "0.1em",
                          fontWeight: 500,
                        },
                        children: "RELIURE",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };

  try {
    const font = await loadFont();
    const png = await renderPng(markup, font);
    return sendPng(res, png);
  } catch (err) {
    console.error("[og-image] render error:", err);
    return serveFallback(res);
  }
}
