#!/usr/bin/env node
/**
 * migrate-ol-covers.mjs
 * ──────────────────────────────────────────────────────────────────
 * Migre les couvertures hébergées sur archive.org / openlibrary.org
 * vers le bucket Supabase Storage "book-covers".
 *
 * Problème : archive.org est lent (~800ms par image), peu fiable,
 * et les URLs peuvent mourir. Mieux vaut héberger nous-mêmes.
 *
 * Options :
 *   --apply         Exécute réellement (dry-run par défaut)
 *   --limit N       Limite à N livres (défaut: 500)
 *   --offset N      Commence à l'entrée N (défaut: 0)
 *
 * Usage :
 *   node --env-file=.env scripts/migrate-ol-covers.mjs
 *   node --env-file=.env scripts/migrate-ol-covers.mjs --apply
 *   node --env-file=.env scripts/migrate-ol-covers.mjs --apply --limit 100
 * ──────────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";

// ─── Env ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  || process.env.VITE_SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[migrate-ol-covers] SUPABASE_URL + SUPABASE_SERVICE_KEY requis.");
  console.error("  Les uploads Storage requièrent la clé service_role, pas la clé anon.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { headers: { 'x-statement-timeout': '30000' } }
});

// ─── CLI ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const APPLY   = args.includes("--apply");
const limIdx  = args.indexOf("--limit");
const offIdx  = args.indexOf("--offset");
const LIMIT   = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) || 500 : 500;
const OFFSET  = offIdx >= 0 ? parseInt(args[offIdx + 1], 10) || 0   : 0;

const RATE_LIMIT_MS = 1000; // 1 req/sec — archive.org est strict
const BUCKET = "book-covers";

console.log(`[migrate-ol-covers] ${APPLY ? "APPLY" : "DRY RUN"} — limit=${LIMIT} offset=${OFFSET}`);
console.log("─".repeat(60));

// ─── Helpers ─────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Télécharge une image et retourne un Buffer + content-type. */
async function fetchImage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Reliure/1.0 (https://reliure.page; cover migration bot)" },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") || "image/jpeg";
  // Normalise : garde uniquement image/jpeg, image/png, image/webp
  const mime = contentType.split(";")[0].trim();
  if (!mime.startsWith("image/")) throw new Error(`Content-Type inattendu : ${mime}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 500) throw new Error(`Image trop petite (${buffer.length} bytes) — probablement une erreur`);

  return { buffer, mime };
}

/** Détermine l'extension à partir du mime-type. */
function extFromMime(mime) {
  if (mime === "image/png")  return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Upload dans Storage et retourne l'URL publique. */
async function uploadToStorage(bookId, buffer, mime) {
  const ext = extFromMime(mime);
  const filePath = `${bookId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: mime, upsert: true });

  if (error) throw new Error(`Storage upload: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  // Fetch livres avec couvertures OL/archive.org
  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, cover_url")
    .or("cover_url.ilike.%archive.org%,cover_url.ilike.%openlibrary.org%")
    .not("cover_url", "is", null)
    .order("id")
    .range(OFFSET, OFFSET + LIMIT - 1);

  if (error) { console.error("DB error:", error.message); process.exit(1); }
  if (!books || books.length === 0) {
    console.log("Aucun livre avec couverture archive.org / openlibrary.org trouvé.");
    return;
  }

  console.log(`${books.length} livre(s) trouvé(s)\n`);

  let migrated = 0, failed = 0, skipped = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const title = book.title?.slice(0, 45).padEnd(45);

    process.stdout.write(`[${String(i + 1).padStart(3)}/${books.length}] ${title}  `);

    // ── Téléchargement ──
    let imageData;
    try {
      imageData = await fetchImage(book.cover_url);
    } catch (err) {
      console.log(`FAIL  download — ${err.message}`);
      console.log(`      URL: ${book.cover_url}`);
      failed++;
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const { buffer, mime } = imageData;
    const sizeKb = Math.round(buffer.length / 1024);

    if (APPLY) {
      // ── Upload Storage ──
      let publicUrl;
      try {
        publicUrl = await uploadToStorage(book.id, buffer, mime);
      } catch (err) {
        console.log(`FAIL  upload — ${err.message}`);
        failed++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      // ── Mise à jour DB ──
      const { error: updateErr } = await supabase
        .from("books")
        .update({ cover_url: publicUrl })
        .eq("id", book.id);

      if (updateErr) {
        console.log(`FAIL  db update — ${updateErr.message}`);
        failed++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      console.log(`OK    ${sizeKb} KB`);
      console.log(`      FROM: ${book.cover_url}`);
      console.log(`        TO: ${publicUrl}`);
      migrated++;
    } else {
      // Dry run — juste vérifier que l'image est téléchargeable
      console.log(`DRY   ${sizeKb} KB  ${mime}`);
      console.log(`      URL: ${book.cover_url}`);
      migrated++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log("\n" + "─".repeat(60));
  if (APPLY) {
    console.log(`Migrés : ${migrated}  |  Échoués : ${failed}  |  Ignorés : ${skipped}`);
  } else {
    console.log(`À migrer : ${migrated}  |  Non téléchargeables : ${failed}`);
    console.log("\nRelancez avec --apply pour effectuer la migration.");
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
