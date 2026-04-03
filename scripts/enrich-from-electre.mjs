#!/usr/bin/env node
/**
 * enrich-from-electre.mjs
 * ──────────────────────────────────────────────────────────────────
 * Enrichissement batch depuis l'API Electre NG.
 * Source de référence pour les livres francophones.
 *
 * Cible : livres en base avec isbn_13 mais sans electre_notice_id.
 * Ne remplit que les champs NULL (ne surcharge jamais une valeur existante).
 * Traite par batches de 100 EANs (limite API Electre).
 *
 * Options :
 *   --apply         Exécute réellement (dry-run par défaut)
 *   --limit N       Limite à N livres (défaut: 500)
 *   --offset N      Commence à l'entrée N (défaut: 0)
 *   --force         Ré-enrichit même les livres ayant déjà un electre_notice_id
 *
 * Usage :
 *   node --env-file=.env scripts/enrich-from-electre.mjs
 *   node --env-file=.env scripts/enrich-from-electre.mjs --apply --limit 200
 *   node --env-file=.env scripts/enrich-from-electre.mjs --apply --force --limit 50
 * ──────────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";

// ─── Env ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const ELECTRE_AUTH_URL = process.env.ELECTRE_AUTH_URL;
const ELECTRE_USERNAME = process.env.ELECTRE_USERNAME;
const ELECTRE_PASSWORD = process.env.ELECTRE_PASSWORD;
const ELECTRE_API_URL = process.env.ELECTRE_API_URL;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[electre] SUPABASE_URL et SUPABASE_SERVICE_KEY requis.");
  process.exit(1);
}
if (!ELECTRE_AUTH_URL || !ELECTRE_USERNAME || !ELECTRE_PASSWORD || !ELECTRE_API_URL) {
  console.error("[electre] ELECTRE_AUTH_URL, ELECTRE_USERNAME, ELECTRE_PASSWORD, ELECTRE_API_URL requis.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CLI ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const APPLY   = args.includes("--apply");
const FORCE   = args.includes("--force");
const DRY_RUN = !APPLY;
const limIdx  = args.indexOf("--limit");
const offIdx  = args.indexOf("--offset");
const LIMIT   = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) || 500 : 500;
const OFFSET  = offIdx >= 0 ? parseInt(args[offIdx + 1], 10) || 0   : 0;

console.log(`[electre] ${DRY_RUN ? "DRY RUN" : "APPLY"} — limit=${LIMIT} offset=${OFFSET} force=${FORCE}`);

// ─── Electre OAuth ───────────────────────────────────────────────

let cachedToken = null;
let tokenExpiresAt = 0;

async function getElectreToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60_000) return cachedToken;

  const res = await fetch(ELECTRE_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "api-client",
      username: ELECTRE_USERNAME,
      password: ELECTRE_PASSWORD,
      scope: "roles",
    }),
  });

  if (!res.ok) throw new Error(`Electre auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 300) * 1000;
  return cachedToken;
}

// ─── Fetch batch d'EANs ─────────────────────────────────────────

async function fetchElectreBatch(eans) {
  const token = await getElectreToken();
  const params = new URLSearchParams();
  eans.forEach((ean) => params.append("ean", ean));
  params.append("catalogue", "livre");
  params.append("editions-liees", "false");

  const res = await fetch(`${ELECTRE_API_URL}/notices/eans?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    console.error(`[electre] API ${res.status} for batch of ${eans.length}`);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.notices || data.results || [];
}

// ─── Parse une notice Electre ────────────────────────────────────

function parseNotice(notice) {
  const authors = notice.auteurs
    ?.filter((a) => !a.role || a.role === "auteur" || a.role === "Auteur")
    .map((a) => [a.prenom, a.nom].filter(Boolean).join(" "))
    .filter(Boolean);

  return {
    electre_notice_id: notice.noticeId || null,
    oeuvre_id: notice.oeuvreId || null,
    title: notice.titre || null,
    authors: authors?.length ? authors : null,
    publisher: notice.editeur || null,
    collection_name: notice.collection || null,
    publication_date: notice.dateParution || null,
    page_count: notice.nbPages || null,
    cover_url: notice.couverture || null,
    description: notice.resume || notice.quatriemeDeCouverture || null,
    quatrieme_de_couverture: notice.quatriemeDeCouverture || null,
    language: notice.langue || null,
    genres: notice.genres?.length ? notice.genres : null,
    flag_fiction: notice.fiction ?? null,
    disponibilite: notice.disponibilite || null,
    ean: notice.ean || null,
  };
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  // Récupérer les livres cibles
  let query = supabase
    .from("books")
    .select("id, isbn_13, title, authors, publisher, description, cover_url, page_count, language, genres, electre_notice_id")
    .not("isbn_13", "is", null);

  if (!FORCE) {
    query = query.is("electre_notice_id", null);
  }

  const { data: books, error } = await query
    .order("created_at", { ascending: false })
    .range(OFFSET, OFFSET + LIMIT - 1);

  if (error) {
    console.error("[electre] Erreur Supabase:", error.message);
    process.exit(1);
  }

  if (!books.length) {
    console.log("[electre] Aucun livre à enrichir.");
    return;
  }

  console.log(`[electre] ${books.length} livres à traiter.`);

  let enriched = 0;
  let skipped = 0;
  let notFound = 0;

  // Traiter par batches de 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE);
    const eans = batch.map((b) => b.isbn_13);

    console.log(`[electre] Batch ${Math.floor(i / BATCH_SIZE) + 1} — ${eans.length} EANs...`);

    let notices;
    try {
      notices = await fetchElectreBatch(eans);
    } catch (err) {
      console.error(`[electre] Batch error:`, err.message);
      continue;
    }

    // Indexer les notices par EAN
    const byEan = new Map();
    for (const n of notices) {
      const parsed = parseNotice(n);
      const ean = parsed.ean || n.ean;
      if (ean) byEan.set(ean, parsed);
    }

    for (const book of batch) {
      const notice = byEan.get(book.isbn_13);
      if (!notice) {
        notFound++;
        continue;
      }

      // Ne remplir que les champs NULL
      const updates = {};

      if (notice.electre_notice_id) updates.electre_notice_id = notice.electre_notice_id;
      if (notice.oeuvre_id) updates.oeuvre_id = notice.oeuvre_id;
      if (notice.collection_name) updates.collection_name = notice.collection_name;
      if (notice.flag_fiction !== null) updates.flag_fiction = notice.flag_fiction;
      if (notice.quatrieme_de_couverture) updates.quatrieme_de_couverture = notice.quatrieme_de_couverture;
      if (notice.disponibilite) updates.disponibilite = notice.disponibilite;

      // Champs existants — ne remplir que si null en base
      if (!book.description && notice.description) updates.description = notice.description;
      if (!book.publisher && notice.publisher) updates.publisher = notice.publisher;
      if (!book.page_count && notice.page_count) updates.page_count = notice.page_count;
      if (!book.cover_url && notice.cover_url) updates.cover_url = notice.cover_url;
      if (!book.language && notice.language) updates.language = notice.language;
      if ((!book.genres || book.genres.length === 0) && notice.genres) updates.genres = notice.genres;

      if (Object.keys(updates).length === 0) {
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [dry-run] ${book.isbn_13} "${book.title}" → ${Object.keys(updates).join(", ")}`);
        enriched++;
      } else {
        const { error: updateError } = await supabase
          .from("books")
          .update(updates)
          .eq("id", book.id);

        if (updateError) {
          console.error(`  [error] ${book.isbn_13}:`, updateError.message);
        } else {
          console.log(`  [ok] ${book.isbn_13} "${book.title}" → ${Object.keys(updates).join(", ")}`);
          enriched++;
        }
      }
    }

    // Rate limiting entre batches
    if (i + BATCH_SIZE < books.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n[electre] Terminé — enriched: ${enriched}, skipped: ${skipped}, not_found: ${notFound}`);
  if (DRY_RUN) console.log("[electre] Relance avec --apply pour exécuter.");
}

main().catch((err) => {
  console.error("[electre] Fatal:", err);
  process.exit(1);
});
