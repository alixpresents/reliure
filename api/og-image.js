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
    "https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond%5Bwght%5D.ttf",
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
    ? book.description.slice(0, 120) +
      (book.description.length > 120 ? "…" : "")
    : "";
  const titleFontSize = title.length > 40 ? 34 : 42;

  const textChildren = [
    {
      type: "div",
      props: {
        style: {
          fontFamily: "EB Garamond",
          fontSize: titleFontSize,
          fontWeight: 400,
          color: "#e8e5df",
          lineHeight: 1.2,
          marginBottom: 10,
        },
        children: title,
      },
    },
  ];

  if (authors) {
    textChildren.push({
      type: "div",
      props: {
        style: { fontSize: 20, color: "#8a8680", marginBottom: desc ? 20 : 30 },
        children: authors,
      },
    });
  }

  if (desc) {
    textChildren.push({
      type: "div",
      props: {
        style: {
          fontSize: 15,
          color: "#6a6560",
          lineHeight: 1.6,
          marginBottom: 30,
        },
        children: desc,
      },
    });
  }

  textChildren.push({
    type: "div",
    props: {
      style: { display: "flex", alignItems: "center", gap: 12 },
      children: [
        {
          type: "div",
          props: {
            style: { width: 30, height: 1, backgroundColor: "#555" },
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: 13,
              color: "#6a6560",
              letterSpacing: "0.12em",
              fontWeight: 500,
            },
            children: "RELIURE",
          },
        },
      ],
    },
  });

  const coverElement = book.cover_url
    ? {
        type: "img",
        props: {
          src: book.cover_url,
          width: 220,
          height: 330,
          style: { borderRadius: 4, objectFit: "cover" },
        },
      }
    : {
        type: "div",
        props: {
          style: {
            width: 220,
            height: 330,
            borderRadius: 4,
            backgroundColor: "#2a2928",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: "EB Garamond",
            fontSize: 22,
            color: "#8a8680",
            textAlign: "center",
          },
          children: title,
        },
      };

  const markup = {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        backgroundColor: "#1a1918",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: 380,
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              padding: "40px 20px 40px 50px",
            },
            children: coverElement,
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              padding: "40px 50px 40px 20px",
            },
            children: textChildren,
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
