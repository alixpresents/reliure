// ═══════════════════════════════════════════════
// Fnac Search — via edge function proxy (contourne CORS)
// ⚠️  Dépend de la structure HTML de fnac.com (fragile)
// ═══════════════════════════════════════════════

import { supabase } from "./supabase";

function extractInfoItem(article, labelText) {
  const items = article.querySelectorAll("li.moreInfos-item");
  for (const li of items) {
    const label = li.querySelector(".label")?.textContent?.trim() || "";
    if (label.toLowerCase().includes(labelText.toLowerCase())) {
      return li.querySelector("span.data")?.textContent?.trim() || null;
    }
  }
  return null;
}

function parseYear(dateStr) {
  if (!dateStr) return null;
  // Format DD/MM/YYYY → YYYY
  const parts = dateStr.trim().split("/");
  if (parts.length === 3 && parts[2].length === 4) return parts[2];
  // Fallback : 4 chiffres consécutifs
  const match = dateStr.match(/\d{4}/);
  return match ? match[0] : null;
}

function articleToBook(article) {
  const title = article.querySelector("a.Article-title")?.textContent?.trim() || null;
  if (!title) return null;

  const authorsEl = article.querySelector("p.Article-descSub a");
  const authors = authorsEl ? [authorsEl.textContent.trim()] : [];

  const coverUrl = article.querySelector("img.Article-itemVisualImg")?.src || null;

  const publisher = extractInfoItem(article, "Editeur");
  const publishedDate = parseYear(extractInfoItem(article, "Parution"));

  const descSpan = article.querySelector("p.summary span");
  const description = descSpan?.textContent?.trim() || null;

  const fnacUrl = article.querySelector("a.Article-title")?.href || null;

  return {
    googleId:      null,
    _source:       "fnac",
    dbId:          null,
    slug:          null,
    title,
    subtitle:      null,
    authors,
    publisher,
    publishedDate,
    coverUrl,
    pageCount:     null,
    isbn13:        null,
    description,
    _fnacUrl:      fnacUrl,
  };
}

export async function searchFnac(query, maxResults = 8) {
  if (!query || query.trim().length < 2) return [];

  try {
    const { data: html, error } = await supabase.functions.invoke("fnac-proxy", {
      body: { query: query.trim() },
    });
    if (error || !html) return [];

    const doc = new DOMParser().parseFromString(html, "text/html");
    const articles = doc.querySelectorAll("article.Article-itemGroup");

    const results = [];
    for (const article of articles) {
      if (results.length >= maxResults) break;
      const book = articleToBook(article);
      if (book) results.push(book);
    }

    return results;
  } catch {
    return [];
  }
}
