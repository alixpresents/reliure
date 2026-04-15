import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function stripHtml(str) {
  if (!str) return null;
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "é").replace(/&egrave;/g, "è")
    .replace(/&ecirc;/g, "ê").replace(/&ocirc;/g, "ô")
    .replace(/&agrave;/g, "à").replace(/&ccedil;/g, "ç")
    .replace(/&rsquo;/g, "\u2019").replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»").replace(/&hellip;/g, "…")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n").trim() || null;
}

function hasHtml(str) {
  return str && (
    /<[a-z]/i.test(str) ||
    str.includes("&lt;") || str.includes("&gt;") ||
    str.includes("&amp;") || str.includes("&eacute;") ||
    str.includes("&rsquo;") || str.includes("&laquo;")
  );
}

const DRY_RUN = !process.argv.includes("--apply");
console.log(DRY_RUN ? "DRY RUN — relancer avec --apply pour corriger" : "APPLY");

let cursor = null;
let totalFound = 0;
let totalFixed = 0;

while (true) {
  let q = supabase
    .from("books")
    .select("id, title, description")
    .not("description", "is", null)
    .order("id")
    .limit(200);

  if (cursor) q = q.gt("id", cursor);
  const { data, error } = await q;
  if (error) { console.error("Erreur Supabase:", error.message); break; }
  if (!data?.length) break;
  cursor = data[data.length - 1].id;

  const toFix = data.filter(b => hasHtml(b.description));
  totalFound += toFix.length;

  for (const b of toFix) {
    const cleaned = stripHtml(b.description);
    console.log(`  [${DRY_RUN ? "DRY" : "FIX"}] ${b.title}`);
    console.log(`    avant : ${b.description.slice(0, 80).replace(/\n/g, " ")}…`);
    console.log(`    après : ${(cleaned || "").slice(0, 80)}…`);
    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from("books")
        .update({ description: cleaned })
        .eq("id", b.id);
      if (upErr) console.error(`    ERREUR update ${b.id}:`, upErr.message);
      else totalFixed++;
    }
  }

  if (data.length < 200) break;
}

console.log(`\nTrouvés : ${totalFound}`);
if (!DRY_RUN) console.log(`Corrigés : ${totalFixed}`);
else console.log("Relancer avec --apply pour corriger");
