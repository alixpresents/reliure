// Resolve Open Library cover redirects — replaces triple-hop URLs
// with final destination URLs to eliminate ~900ms per cover load.
//
// Usage:
//   node --env-file=.env scripts/resolve-ol-covers.mjs           # dry run
//   node --env-file=.env scripts/resolve-ol-covers.mjs --apply   # write to DB
//   node --env-file=.env scripts/resolve-ol-covers.mjs --apply --limit 50

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY"); process.exit(1); }

const supabase = createClient(url, key);
const apply = process.argv.includes("--apply");
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg >= 0 ? parseInt(process.argv[limitArg + 1]) : 1000;

async function resolveUrl(originalUrl) {
  try {
    const res = await fetch(originalUrl, { method: "HEAD", redirect: "follow" });
    if (res.ok && res.url !== originalUrl) {
      return res.url;
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, cover_url")
    .like("cover_url", "%covers.openlibrary.org%")
    .limit(limit);

  if (error) { console.error("DB error:", error.message); process.exit(1); }
  if (!books || books.length === 0) { console.log("No OL covers found."); return; }

  console.log(`Found ${books.length} books with OL covers (limit ${limit})`);
  console.log(apply ? "MODE: APPLY (writing to DB)" : "MODE: DRY RUN");
  console.log("---");

  let resolved = 0, failed = 0, unchanged = 0;

  for (const book of books) {
    const finalUrl = await resolveUrl(book.cover_url);

    if (!finalUrl) {
      console.log(`  FAIL  ${book.title.slice(0, 40)} — could not resolve`);
      failed++;
      continue;
    }

    if (finalUrl === book.cover_url) {
      unchanged++;
      continue;
    }

    console.log(`  ${book.title.slice(0, 40)}`);
    console.log(`    FROM: ${book.cover_url}`);
    console.log(`      TO: ${finalUrl}`);

    if (apply) {
      const { error: updateErr } = await supabase
        .from("books")
        .update({ cover_url: finalUrl })
        .eq("id", book.id);
      if (updateErr) {
        console.log(`    ERROR: ${updateErr.message}`);
        failed++;
        continue;
      }
    }

    resolved++;

    // Rate limit — 100ms between requests
    await new Promise(r => setTimeout(r, 100));
  }

  console.log("---");
  console.log(`Resolved: ${resolved}, Failed: ${failed}, Unchanged: ${unchanged}`);
  if (!apply && resolved > 0) console.log("Run with --apply to write changes.");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
