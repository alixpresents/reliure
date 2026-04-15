#!/usr/bin/env node
/**
 * Nettoie les descriptions HTML encodées en DB (entités &lt; &gt; &amp; etc.)
 * Usage:
 *   node --env-file=.env scripts/fix-html-descriptions.mjs          # dry-run
 *   node --env-file=.env scripts/fix-html-descriptions.mjs --apply  # écriture
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function decodeHtmlEntities(str) {
  if (!str) return null;

  const NAMED = {
    "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"',
    "&apos;": "'", "&nbsp;": " ",
    "&eacute;": "é", "&egrave;": "è", "&ecirc;": "ê", "&euml;": "ë",
    "&agrave;": "à", "&acirc;": "â", "&auml;": "ä",
    "&ugrave;": "ù", "&ucirc;": "û", "&uuml;": "ü",
    "&icirc;": "î", "&iuml;": "ï",
    "&ocirc;": "ô", "&ouml;": "ö",
    "&ccedil;": "ç",
    "&Eacute;": "É", "&Egrave;": "È", "&Ecirc;": "Ê",
    "&Agrave;": "À", "&Acirc;": "Â",
    "&Ucirc;": "Û", "&Icirc;": "Î", "&Ocirc;": "Ô",
    "&Ccedil;": "Ç",
    "&rsquo;": "\u2019", "&lsquo;": "\u2018",
    "&rdquo;": "\u201D", "&ldquo;": "\u201C",
    "&mdash;": "\u2014", "&ndash;": "\u2013",
    "&hellip;": "\u2026", "&oelig;": "\u0153", "&OElig;": "\u0152",
  };

  let out = str;
  out = out.replace(/&amp;(#?\w+;)/g, "&$1");
  for (const [entity, char] of Object.entries(NAMED)) {
    out = out.replaceAll(entity, char);
  }
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

  return out;
}

function stripHtml(str) {
  if (!str) return null;
  return decodeHtmlEntities(str)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasHtmlEntities(str) {
  return str && (
    str.includes("&lt;") ||
    str.includes("&gt;") ||
    str.includes("&amp;") ||
    str.includes("&#") ||
    str.includes("&eacute;") ||
    str.includes("&egrave;") ||
    str.includes("&ecirc;") ||
    str.includes("&agrave;") ||
    str.includes("&ccedil;") ||
    str.includes("&rsquo;") ||
    str.includes("&oelig;") ||
    str.includes("&hellip;") ||
    str.includes("&mdash;") ||
    str.includes("&ndash;") ||
    str.includes("&nbsp;") ||
    /<br[\s/]|<div|<p[ >]|<span/i.test(str)
  );
}

const DRY_RUN = !process.argv.includes("--apply");
console.log(DRY_RUN ? "\nDRY RUN — aucune écriture" : "\nAPPLY — écriture en DB");
console.log("─".repeat(50));

let cursor = null;
let totalFound = 0;
let totalFixed = 0;
const PAGE_SIZE = 200;

while (true) {
  let query = supabase
    .from("books")
    .select("id, title, description")
    .not("description", "is", null)
    .order("id")
    .limit(PAGE_SIZE);

  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) { console.error("Supabase error:", error); break; }
  if (!data?.length) break;

  cursor = data[data.length - 1].id;

  const toFix = data.filter(b => hasHtmlEntities(b.description));
  totalFound += toFix.length;

  if (toFix.length > 0) {
    console.log(`\nBatch : ${toFix.length} livre(s) à corriger`);
    for (const b of toFix) {
      const cleaned = stripHtml(b.description);
      console.log(`  "${b.title}"`);
      console.log(`    Avant : ${b.description.slice(0, 80)}...`);
      console.log(`    Après : ${cleaned?.slice(0, 80)}...`);
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from("books")
          .update({ description: cleaned })
          .eq("id", b.id);
        if (updateError) console.error(`    Erreur update:`, updateError);
        else totalFixed++;
      }
    }
  }

  if (data.length < PAGE_SIZE) break;
}

console.log("\n" + "─".repeat(50));
console.log(`Total trouvés : ${totalFound}`);
if (!DRY_RUN) console.log(`Total corrigés : ${totalFixed}`);
else console.log("Relancer avec --apply pour corriger");
