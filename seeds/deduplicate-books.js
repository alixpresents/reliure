// seeds/deduplicate-books.js
// Usage: node --env-file=.env seeds/deduplicate-books.js
// Mode dry-run par défaut. --apply pour exécuter.
//
// Fixes vs version précédente :
// - .order('id') sur la pagination (élimine les faux doublons)
// - Dédup par id après fetch (ceinture + bretelles)
// - Migration FK complète : reading_status, reviews, quotes, list_items,
//   user_favorites, activity, likes
// - Gestion des conflits d'unicité : delete-then-update pour éviter les
//   violations de contraintes unique (user_id, book_id)
// - Chaque groupe dans son propre try/catch (un échec ne bloque pas les autres)

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = !process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

if (DRY_RUN) {
  console.log("🔍 DRY-RUN — rien ne sera modifié. --apply pour exécuter.\n");
} else {
  console.log("⚡ APPLY — les merges vont être exécutés.\n");
}

// ─── Helpers ─────────────────────────────────

function strip(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupKey(book) {
  const title = strip(book.title || "");
  const author =
    Array.isArray(book.authors) && book.authors.length > 0
      ? strip(book.authors[0])
      : "";
  return `${title}|${author}`;
}

function completenessScore(book) {
  let s = 0;
  if (book.cover_url) s += 10;
  if (book.description) s += 5;
  if (book.isbn_13) s += 3;
  if (book.page_count) s += 3;
  if (book.publisher) s += 2;
  if (book.publication_date) s += 1;
  if (book.language) s += 1;
  if (book.genres && book.genres.length > 0) s += 1;
  return s;
}

// ─── Fetch all books ─────────────────────────

async function fetchAllBooks() {
  const all = [];
  let lastId = "";
  const PAGE = 1000;

  while (true) {
    let query = supabase
      .from("books")
      .select(
        "id, isbn_13, title, subtitle, authors, publisher, publication_date, cover_url, description, language, genres, page_count, avg_rating, rating_count, source, slug, created_at"
      )
      .order("id")
      .limit(PAGE);

    if (lastId) {
      query = query.gt("id", lastId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Fetch failed after ${lastId}: ${error.message}`);
    all.push(...data);
    if (data.length < PAGE) break;
    lastId = data[data.length - 1].id;
    process.stdout.write(`\r   ${all.length} livres...`);
  }

  console.log(`\r   ${all.length} livres fetched.`);

  // Dédup par id (ceinture + bretelles)
  const seen = new Set();
  const unique = all.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });

  if (unique.length < all.length) {
    console.log(`  ⚠ ${all.length - unique.length} doublons de pagination éliminés\n`);
  }

  return unique;
}

// ─── Find duplicates ─────────────────────────

function findDuplicates(books) {
  const groups = new Map();

  // Pass 1 : ISBN exact
  const isbnMap = new Map();
  for (const b of books) {
    if (!b.isbn_13) continue;
    const key = b.isbn_13.replace(/-/g, "").trim();
    if (!isbnMap.has(key)) isbnMap.set(key, []);
    isbnMap.get(key).push(b);
  }
  const isbnHandled = new Set();
  for (const [isbn, group] of isbnMap) {
    if (group.length < 2) continue;
    const ids = group.map((b) => b.id).sort().join(",");
    groups.set(ids, { type: "isbn", key: isbn, books: group });
    group.forEach((b) => isbnHandled.add(b.id));
  }

  // Pass 2 : titre + auteur normalisé (skip livres déjà catchés par ISBN)
  const titleMap = new Map();
  for (const b of books) {
    if (isbnHandled.has(b.id)) continue;
    if (!b.title) continue;
    const key = dedupKey(b);
    if (!key || key === "|") continue;
    if (!titleMap.has(key)) titleMap.set(key, []);
    titleMap.get(key).push(b);
  }
  for (const [key, group] of titleMap) {
    if (group.length < 2) continue;
    const ids = group.map((b) => b.id).sort().join(",");
    if (!groups.has(ids)) {
      groups.set(ids, { type: "title+author", key, books: group });
    }
  }

  return Array.from(groups.values());
}

// ─── Elect keeper ────────────────────────────

function electKeeper(books) {
  const sorted = [...books].sort((a, b) => {
    // 1. Completeness score
    const diff = completenessScore(b) - completenessScore(a);
    if (diff !== 0) return diff;
    // 2. Rating count (user data = important)
    if ((b.rating_count || 0) !== (a.rating_count || 0))
      return (b.rating_count || 0) - (a.rating_count || 0);
    // 3. Oldest (more canonical slug, plus ancien en base)
    return new Date(a.created_at) - new Date(b.created_at);
  });
  return { keeper: sorted[0], losers: sorted.slice(1) };
}

// ─── Enrich keeper ───────────────────────────

function computeEnrichment(keeper, losers) {
  const fields = [
    "isbn_13", "cover_url", "description", "subtitle",
    "publisher", "publication_date", "page_count", "language",
  ];
  const updates = {};

  for (const field of fields) {
    if (!keeper[field] && keeper[field] !== 0) {
      for (const loser of losers) {
        if (loser[field] && loser[field] !== 0) {
          updates[field] = loser[field];
          break;
        }
      }
    }
  }

  // Genres : merge arrays
  if (!keeper.genres || keeper.genres.length === 0) {
    for (const loser of losers) {
      if (loser.genres && loser.genres.length > 0) {
        updates.genres = loser.genres;
        break;
      }
    }
  }

  return updates;
}

// ─── FK migration (avec gestion des conflits) ─

async function migrateFK(table, loserIds, keeperId, uniqueCols = null) {
  // Tables avec contrainte unique (user_id, book_id) :
  // → on doit d'abord supprimer les rows du loser qui feraient conflit
  if (uniqueCols) {
    // Trouver les user_ids qui ont déjà une row sur le keeper
    const { data: keeperRows } = await supabase
      .from(table)
      .select("user_id")
      .eq("book_id", keeperId);
    const keeperUserIds = new Set((keeperRows || []).map((r) => r.user_id));

    if (keeperUserIds.size > 0) {
      // Supprimer les rows du loser qui entreraient en conflit
      const { data: loserRows } = await supabase
        .from(table)
        .select("id, user_id")
        .in("book_id", loserIds);

      const conflictIds = (loserRows || [])
        .filter((r) => keeperUserIds.has(r.user_id))
        .map((r) => r.id);

      if (conflictIds.length > 0) {
        const { error } = await supabase
          .from(table)
          .delete()
          .in("id", conflictIds);
        if (error) console.error(`    ⚠ ${table} conflict delete: ${error.message}`);
        else if (VERBOSE) console.log(`    🗑 ${table}: ${conflictIds.length} conflits supprimés`);
      }
    }
  }

  // Maintenant migrer les rows restantes
  const { error, count } = await supabase
    .from(table)
    .update({ book_id: keeperId })
    .in("book_id", loserIds);

  if (error) console.error(`    ⚠ ${table} migrate: ${error.message}`);
  else if (VERBOSE && count > 0) console.log(`    → ${table}: ${count} rows migrées`);
}

async function migrateLikes(loserIds, keeperId) {
  // likes.target_id avec target_type = 'book'
  const { data: keeperLikes } = await supabase
    .from("likes")
    .select("user_id")
    .eq("target_type", "book")
    .eq("target_id", keeperId);
  const keeperUserIds = new Set((keeperLikes || []).map((r) => r.user_id));

  if (keeperUserIds.size > 0) {
    const { data: loserLikes } = await supabase
      .from("likes")
      .select("id, user_id")
      .eq("target_type", "book")
      .in("target_id", loserIds);

    const conflictIds = (loserLikes || [])
      .filter((r) => keeperUserIds.has(r.user_id))
      .map((r) => r.id);

    if (conflictIds.length > 0) {
      await supabase.from("likes").delete().in("id", conflictIds);
    }
  }

  await supabase
    .from("likes")
    .update({ target_id: keeperId })
    .eq("target_type", "book")
    .in("target_id", loserIds);
}

async function migrateActivity(loserIds, keeperId) {
  // Activity peut avoir book_id en colonne directe OU dans metadata
  // On migre les deux patterns
  const { error } = await supabase
    .from("activity")
    .update({ book_id: keeperId })
    .in("book_id", loserIds);

  if (error && !error.message.includes("column")) {
    console.error(`    ⚠ activity migrate: ${error.message}`);
  }
}

async function migrateListItems(loserIds, keeperId) {
  // list_items a une contrainte unique (list_id, book_id)
  const { data: keeperItems } = await supabase
    .from("list_items")
    .select("list_id")
    .eq("book_id", keeperId);
  const keeperListIds = new Set((keeperItems || []).map((r) => r.list_id));

  if (keeperListIds.size > 0) {
    const { data: loserItems } = await supabase
      .from("list_items")
      .select("id, list_id")
      .in("book_id", loserIds);

    const conflictIds = (loserItems || [])
      .filter((r) => keeperListIds.has(r.list_id))
      .map((r) => r.id);

    if (conflictIds.length > 0) {
      await supabase.from("list_items").delete().in("id", conflictIds);
    }
  }

  await supabase
    .from("list_items")
    .update({ book_id: keeperId })
    .in("book_id", loserIds);
}

async function migrateUserFavorites(loserIds, keeperId) {
  // user_favorites a une contrainte unique (user_id, book_id)
  const { data: keeperFavs } = await supabase
    .from("user_favorites")
    .select("user_id")
    .eq("book_id", keeperId);
  const keeperUserIds = new Set((keeperFavs || []).map((r) => r.user_id));

  if (keeperUserIds.size > 0) {
    const { data: loserFavs } = await supabase
      .from("user_favorites")
      .select("id, user_id")
      .in("book_id", loserIds);

    const conflictIds = (loserFavs || [])
      .filter((r) => keeperUserIds.has(r.user_id))
      .map((r) => r.id);

    if (conflictIds.length > 0) {
      await supabase.from("user_favorites").delete().in("id", conflictIds);
    }
  }

  await supabase
    .from("user_favorites")
    .update({ book_id: keeperId })
    .in("book_id", loserIds);
}

// ─── Process one group ───────────────────────

async function processGroup(group, index) {
  const { keeper, losers } = electKeeper(group.books);
  const loserIds = losers.map((l) => l.id);
  const enrichment = computeEnrichment(keeper, losers);

  // Display
  console.log(
    `${index}. [${group.type}] "${keeper.title}" — ${group.books.length} entrées`
  );
  console.log(
    `   KEEP: [${keeper.id.slice(0, 8)}] score=${completenessScore(keeper)} ratings=${keeper.rating_count || 0} slug=${keeper.slug || "null"}`
  );
  for (const l of losers) {
    console.log(
      `   DEL:  [${l.id.slice(0, 8)}] score=${completenessScore(l)} ratings=${l.rating_count || 0} slug=${l.slug || "null"}`
    );
  }
  if (Object.keys(enrichment).length > 0) {
    console.log(`   ENRICH: ${Object.keys(enrichment).join(", ")}`);
  }

  if (DRY_RUN) return { ok: true };

  try {
    // 1. Enrichir le keeper
    if (Object.keys(enrichment).length > 0) {
      const { error } = await supabase
        .from("books")
        .update(enrichment)
        .eq("id", keeper.id);
      if (error) throw new Error(`Enrich keeper: ${error.message}`);
    }

    // 2. Migrer toutes les FK
    await migrateFK("reading_status", loserIds, keeper.id, ["user_id", "book_id"]);
    await migrateFK("reviews", loserIds, keeper.id, ["user_id", "book_id"]);
    await migrateListItems(loserIds, keeper.id);
    await migrateUserFavorites(loserIds, keeper.id);
    await migrateLikes(loserIds, keeper.id);
    await migrateActivity(loserIds, keeper.id);

    // quotes : pas de contrainte unique, migration simple
    await supabase
      .from("quotes")
      .update({ book_id: keeper.id })
      .in("book_id", loserIds);

    // 3. Supprimer les losers
    for (const loserId of loserIds) {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", loserId);
      if (error) throw new Error(`Delete ${loserId}: ${error.message}`);
    }

    return { ok: true };
  } catch (err) {
    console.error(`   ❌ ERREUR: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ─── Main ────────────────────────────────────

async function main() {
  console.log("📚 Fetch des livres...");
  const books = await fetchAllBooks();
  console.log(`   ${books.length} livres en base.\n`);

  console.log("🔎 Recherche des doublons...\n");
  const dupes = findDuplicates(books);

  const isbnDupes = dupes.filter((d) => d.type === "isbn");
  const titleDupes = dupes.filter((d) => d.type === "title+author");
  const totalToDelete = dupes.reduce((s, d) => s + d.books.length - 1, 0);

  console.log("📊 Résultats :");
  console.log(`   ${isbnDupes.length} groupes ISBN (${isbnDupes.reduce((s, d) => s + d.books.length, 0)} livres)`);
  console.log(`   ${titleDupes.length} groupes titre+auteur (${titleDupes.reduce((s, d) => s + d.books.length, 0)} livres)`);
  console.log(`   ${totalToDelete} livres à supprimer\n`);

  if (dupes.length === 0) {
    console.log("✅ Aucun doublon !");
    return;
  }

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < dupes.length; i++) {
    const result = await processGroup(dupes[i], i + 1);
    if (result.ok) ok++;
    else fail++;
  }

  console.log("\n─────────────────────────────────");
  if (DRY_RUN) {
    console.log(`${dupes.length} groupes, ${totalToDelete} livres à supprimer.`);
    console.log("💡 node --env-file=.env seeds/deduplicate-books.js --apply");
  } else {
    console.log(`✅ ${ok} groupes mergés, ${fail} erreurs.`);
    console.log(`   ${totalToDelete} doublons supprimés.`);
  }
}

main().catch(console.error);
