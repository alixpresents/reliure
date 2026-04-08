#!/usr/bin/env node
/**
 * backfill-missing-slugs.mjs
 * ──────────────────────────────────────────────────────────────────
 * Génère et attribue des slugs aux livres qui n'en ont pas.
 * Utilise la même logique que importBook.js (generateBookSlug).
 *
 * Options :
 *   --apply         Exécute réellement (dry-run par défaut)
 *   --limit N       Limite à N livres (défaut: 500)
 *
 * Usage :
 *   node --env-file=.env scripts/backfill-missing-slugs.mjs
 *   node --env-file=.env scripts/backfill-missing-slugs.mjs --apply
 * ──────────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";

// ─── Env ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY; // fallback anon (dry-run only)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CLI ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const limIdx = args.indexOf("--limit");
const LIMIT = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) || 500 : 500;

console.log(`[backfill-slugs] ${APPLY ? "APPLY" : "DRY RUN"} — limit=${LIMIT}`);
console.log("─".repeat(60));

// ─── Slug helpers (dupliqués depuis src/utils/slugify.js) ─────────

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Cache local pour éviter les doublons intra-batch
const reservedSlugs = new Set();

async function slugExists(slug) {
  if (reservedSlugs.has(slug)) return true;
  const { data } = await supabase
    .from("books")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function generateBookSlug(title, authors = [], year = null) {
  // Nettoyage du titre : supprimer les suffixes type " - Prix Goncourt 2024"
  const cleanTitle = title.split(/\s*[-–]\s*(Prix|Tome|Volume|Livre|Part|T\.)/i)[0].trim();
  const base = slugify(cleanTitle);
  if (!base) return null;

  if (!(await slugExists(base))) return base;

  const lastName = authors[0]?.split(/[\s,]+/).filter(Boolean).pop();
  if (lastName) {
    const withAuthor = `${base}-${slugify(lastName)}`;
    if (withAuthor !== base && !(await slugExists(withAuthor))) return withAuthor;

    const y = year ? String(year).slice(0, 4) : null;
    if (y) {
      const withYear = `${withAuthor}-${y}`;
      if (!(await slugExists(withYear))) return withYear;
    }

    for (let i = 2; i <= 10; i++) {
      const candidate = `${withAuthor}-${i}`;
      if (!(await slugExists(candidate))) return candidate;
    }
  }

  for (let i = 2; i <= 100; i++) {
    const candidate = `${base}-${i}`;
    if (!(await slugExists(candidate))) return candidate;
  }

  return `${base}-${Date.now()}`;
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, authors, publication_date")
    .is("slug", null)
    .order("id")
    .limit(LIMIT);

  if (error) { console.error("DB error:", error.message); process.exit(1); }
  if (!books?.length) { console.log("Aucun livre sans slug."); return; }

  console.log(`${books.length} livre(s) sans slug\n`);

  let done = 0, failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const year = book.publication_date ? parseInt(book.publication_date) : null;

    let slug;
    try {
      slug = await generateBookSlug(book.title, book.authors ?? [], year);
    } catch (err) {
      console.log(`[${i + 1}/${books.length}] FAIL générer slug — ${book.title?.slice(0, 50)}: ${err.message}`);
      failed++;
      continue;
    }

    if (!slug) {
      console.log(`[${i + 1}/${books.length}] SKIP slug vide — "${book.title?.slice(0, 50)}"`);
      failed++;
      continue;
    }

    console.log(`[${i + 1}/${books.length}] ${APPLY ? "SET " : "DRY "} "${slug}"`);
    console.log(`       "${book.title?.slice(0, 60)}"`);

    if (APPLY) {
      const { error: updateErr } = await supabase
        .from("books")
        .update({ slug })
        .eq("id", book.id);

      if (updateErr) {
        console.log(`       ERROR: ${updateErr.message}`);
        failed++;
        continue;
      }
    }

    // Réserver dans le cache local pour éviter les doublons intra-batch
    reservedSlugs.add(slug);
    done++;
  }

  console.log("\n" + "─".repeat(60));
  if (APPLY) {
    console.log(`Mis à jour : ${done}  |  Échecs : ${failed}`);
  } else {
    console.log(`À mettre à jour : ${done}  |  Échecs : ${failed}`);
    console.log("\nRelancez avec --apply pour écrire en base.");
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
