// Usage:
//   node --env-file=.env scripts/seed-onboarding-picks.mjs           # dry-run
//   node --env-file=.env scripts/seed-onboarding-picks.mjs --apply   # wipe + insert
//
// Remplis l'ISBN-13 de l'édition canonique de CHAQUE pick (source: Babelio, Fnac, Amazon).
// Le script valide le checksum, importe via book_import (fan-out 6 sources, upsert dans books),
// vérifie que l'auteur retourné correspond, puis insère dans onboarding_picks.
//
// Un pick sans isbn (ou avec isbn invalide) est skippé avec log — le seed n'est jamais partiel en base.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ SUPABASE_URL et SUPABASE_SERVICE_KEY requis dans l'env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const DRY_RUN = !process.argv.includes("--apply");

function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(isbn[i], 10) * (i % 2 ? 3 : 1);
  return ((10 - (sum % 10)) % 10) === parseInt(isbn[12], 10);
}

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const PICKS = [
  // Classiques scolaires FR — 20
  { title: "L'Étranger", author: "Albert Camus", category: "classique", isbn: "9782070360024" },
  { title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", category: "classique", isbn: "9782070408504" },
  { title: "Candide", author: "Voltaire", category: "classique", isbn: "9782290335369" },
  { title: "Madame Bovary", author: "Gustave Flaubert", category: "classique", isbn: "9782070413119" },
  { title: "Germinal", author: "Émile Zola", category: "classique", isbn: "9782253004226" },
  { title: "Les Misérables", author: "Victor Hugo", category: "classique", isbn: "9782072730672" },
  { title: "Bel-Ami", author: "Guy de Maupassant", category: "classique", isbn: "9791040006718" },
  { title: "La Peste", author: "Albert Camus", category: "classique", isbn: "9782070360420" },
  { title: "Le Rouge et le Noir", author: "Stendhal", category: "classique", isbn: "9782253006206" },
  { title: "Thérèse Raquin", author: "Émile Zola", category: "classique", isbn: "9782266159210" },
  { title: "Antigone", author: "Jean Anouilh", category: "classique", isbn: "9782710381419" },
  { title: "Huis clos", author: "Jean-Paul Sartre", category: "classique", isbn: "9782070368075" },
  { title: "No et moi", author: "Delphine de Vigan", category: "classique", isbn: "9782709628617" },
  { title: "L'Amant", author: "Marguerite Duras", category: "classique", isbn: "9782707306951" },
  { title: "La Promesse de l'aube", author: "Romain Gary", category: "classique", isbn: "9782070363735" },
  { title: "Cyrano de Bergerac", author: "Edmond Rostand", category: "classique", isbn: "9782253005674" },
  { title: "Le Père Goriot", author: "Honoré de Balzac", category: "classique", isbn: "9782070409341" },
  { title: "Au Bonheur des Dames", author: "Émile Zola", category: "classique", isbn: "9782253002864" },
  { title: "Les Liaisons dangereuses", author: "Pierre Choderlos de Laclos", category: "classique", isbn: "9782070338962" },
  { title: "Vipère au poing", author: "Hervé Bazin", category: "classique", isbn: "9782253001454" },

  // Best-sellers contemporains FR — 15
  { title: "La Vérité sur l'affaire Harry Quebert", author: "Joël Dicker", category: "best_seller", isbn: "9782877068161" },
  { title: "L'Élégance du hérisson", author: "Muriel Barbery", category: "best_seller", isbn: "9782070391653" },
  { title: "Ensemble c'est tout", author: "Anna Gavalda", category: "best_seller", isbn: "9782842635473" },
  { title: "Stupeur et tremblements", author: "Amélie Nothomb", category: "best_seller", isbn: "9782253150718" },
  { title: "La Délicatesse", author: "David Foenkinos", category: "best_seller", isbn: "9782070126415" },
  { title: "Les Gens heureux lisent et boivent du café", author: "Agnès Martin-Lugand", category: "best_seller", isbn: "9782266300872" },
  { title: "Et si c'était vrai", author: "Marc Levy", category: "best_seller", isbn: "9782266305549" },
  { title: "La Fille de papier", author: "Guillaume Musso", category: "best_seller", isbn: "9782845634572" },
  { title: "Soumission", author: "Michel Houellebecq", category: "best_seller", isbn: "9782081358119" },
  { title: "La Liste de mes envies", author: "Grégoire Delacourt", category: "best_seller", isbn: "9782709638180" },
  { title: "Rien ne s'oppose à la nuit", author: "Delphine de Vigan", category: "best_seller", isbn: "9782709635790" },
  { title: "La Tresse", author: "Laetitia Colombani", category: "best_seller", isbn: "9782246813880" },
  { title: "Il était deux fois", author: "Franck Thilliez", category: "best_seller", isbn: "9782265144279" },
  { title: "Le Bal des folles", author: "Victoria Mas", category: "best_seller", isbn: "9782226442109" },
  { title: "Au revoir là-haut", author: "Pierre Lemaitre", category: "best_seller", isbn: "9782253194613" },

  // Étrangers ultra-connus en FR — 8
  { title: "1984", author: "George Orwell", category: "incontournable", isbn: "9782070368228" },
  { title: "Harry Potter à l'école des sorciers", author: "J.K. Rowling", category: "incontournable", isbn: "9782070518425" },
  { title: "Millénium - Les Hommes qui n'aimaient pas les femmes", author: "Stieg Larsson", category: "incontournable", isbn: "9782742761579" },
  { title: "Da Vinci Code", author: "Dan Brown", category: "incontournable", isbn: "9782266198356" },
  { title: "Hunger Games", author: "Suzanne Collins", category: "incontournable", isbn: "9782266182690" },
  { title: "Orgueil et préjugés", author: "Jane Austen", category: "incontournable", isbn: "9782264058249" },
  { title: "Le Seigneur des Anneaux - La Communauté de l'anneau", author: "J.R.R. Tolkien", category: "incontournable", isbn: "9782266282390" },
  { title: "L'Amie prodigieuse", author: "Elena Ferrante", category: "incontournable", isbn: "9782070138623" },

  // Goncourts récents — 7
  { title: "L'Anomalie", author: "Hervé Le Tellier", category: "goncourt", isbn: "9782072965821" },
  { title: "La Plus Secrète Mémoire des hommes", author: "Mohamed Mbougar Sarr", category: "goncourt", isbn: "9782848768861" },
  { title: "Veiller sur elle", author: "Jean-Baptiste Andrea", category: "goncourt", isbn: "9782493909930" },
  { title: "Vivre vite", author: "Brigitte Giraud", category: "goncourt", isbn: "9782290388389" },
  { title: "Houris", author: "Kamel Daoud", category: "goncourt", isbn: "9782072999994" },
  { title: "Leurs enfants après eux", author: "Nicolas Mathieu", category: "goncourt", isbn: "9782330139179" },
  { title: "L'Art de perdre", author: "Alice Zeniter", category: "goncourt", isbn: "9782290155158" },
];

async function invokeEdge(name, body) {
  const res = await supabase.functions.invoke(name, { body });
  if (res.error) throw new Error(`${name} failed: ${res.error.message}`);
  return res.data;
}

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN (pas d'insertion)" : "🚀 APPLY");
  console.log(`📚 ${PICKS.length} titres\n`);

  const resolved = [];
  const failures = [];

  for (let i = 0; i < PICKS.length; i++) {
    const pick = PICKS[i];
    const position = i + 1;
    process.stdout.write(`[${position}/${PICKS.length}] ${pick.title} — ${pick.author} ... `);

    // 1. ISBN renseigné ?
    if (!pick.isbn) {
      console.log("⏭  pas d'ISBN (à remplir)");
      failures.push({ ...pick, position, reason: "isbn_missing" });
      continue;
    }
    if (!isValidIsbn13(pick.isbn)) {
      console.log(`❌ ISBN invalide (checksum) : ${pick.isbn}`);
      failures.push({ ...pick, position, reason: "isbn_invalid", isbn: pick.isbn });
      continue;
    }

    // 2. Import via book_import (fan-out 6 sources)
    let book;
    try {
      book = await invokeEdge("book_import", { isbn: pick.isbn });
    } catch (err) {
      console.log(`❌ book_import exception : ${err.message}`);
      failures.push({ ...pick, position, reason: "import_exception", isbn: pick.isbn, error: err.message });
      continue;
    }

    if (!book?.id) {
      console.log(`❌ book_import a échoué (ISBN ${pick.isbn} introuvable)`);
      failures.push({ ...pick, position, reason: "import_failed", isbn: pick.isbn });
      continue;
    }

    // 3. Post-vérif : l'auteur du livre importé doit contenir le nom attendu
    const bookAuthors = Array.isArray(book.authors) ? book.authors.join(" ") : String(book.authors || "");
    const expectedSurname = normalize(pick.author.split(/\s+/).pop());
    if (!normalize(bookAuthors).includes(expectedSurname)) {
      console.log(`❌ ISBN ${pick.isbn} → mauvais livre : ${book.title} par ${bookAuthors}`);
      failures.push({ ...pick, position, reason: "wrong_book", isbn: pick.isbn });
      continue;
    }

    console.log(`✅ ${book.title} — ${bookAuthors}`);
    resolved.push({ position, book_id: book.id, category: pick.category });

    // Petit délai pour pas saturer les APIs en aval de book_import
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n📊 Prêts : ${resolved.length}/${PICKS.length}`);
  if (failures.length > 0) {
    console.log(`⚠️  Échecs : ${failures.length}`);
    failures.forEach(f => console.log(`   - [${f.position}] ${f.title} — ${f.author} (${f.reason}${f.isbn ? ` ${f.isbn}` : ""})`));
  }

  if (DRY_RUN) {
    console.log("\nDry run terminé. Relance avec --apply une fois tous les ISBN remplis.");
    return;
  }

  if (resolved.length === 0) {
    console.error("❌ Rien à insérer.");
    process.exit(1);
  }

  console.log("\n🗑  Suppression des picks existants...");
  const { error: delErr } = await supabase.from("onboarding_picks").delete().gte("id", 0);
  if (delErr) {
    console.error("❌ delete:", delErr.message);
    process.exit(1);
  }

  console.log(`💾 Insertion de ${resolved.length} picks...`);
  const rows = resolved.map(r => ({ position: r.position, book_id: r.book_id, category: r.category }));
  const { error: insErr } = await supabase.from("onboarding_picks").insert(rows);
  if (insErr) {
    console.error("❌ insert:", insErr.message);
    process.exit(1);
  }

  console.log(`✅ ${rows.length} picks insérés.`);
}

main().catch(err => { console.error(err); process.exit(1); });
