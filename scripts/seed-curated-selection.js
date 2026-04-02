// Usage: node --env-file=.env scripts/seed-curated-selection.js [--dry-run]
// Seeds the first curated selection "La Bibliothèque de Kamel Daoud"

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = !process.argv.includes("--apply");

const SELECTION = {
  slug: "bibliotheque-de-kamel-daoud",
  title: "Les livres qui m'ont construit",
  description:
    "Kamel Daoud est de ces écrivains dont la bibliothèque est aussi fascinante que l'œuvre. Entre Camus et Borges, entre la violence du réel et la consolation de la fiction, il nous ouvre les portes de ses lectures fondatrices.\n\nNous l'avons rencontré dans son appartement parisien, entre deux piles de manuscrits. Ce qui frappe d'abord, c'est la précision de ses souvenirs de lecture : chaque livre est associé à un lieu, une lumière, parfois une odeur.",
  curator_name: "Kamel Daoud",
  curator_role: "Écrivain · Prix Goncourt 2024",
  curator_avatar_url: null,
  curator_pull_quote:
    "Les livres qui comptent vraiment sont ceux qui vous laissent différent de ce que vous étiez avant de les ouvrir.",
  items: [
    {
      title_search: "L'Étranger",
      note: "Le premier livre qui m'a fait comprendre qu'on pouvait écrire la vérité sans la décorer. J'avais quinze ans, à Oran. La première phrase m'a foudroyé. Aujourd'hui encore, je la porte en moi comme une cicatrice heureuse.",
    },
    {
      title_search: "Ficciones",
      note: "Borges m'a appris que la littérature est un labyrinthe dont on ne sort jamais — et qu'on n'a pas envie d'en sortir. Chaque nouvelle est un vertige. Je relis « La Bibliothèque de Babel » une fois par an.",
    },
    {
      title_search: "Les Mille et Une Nuits",
      note: "C'est le livre de mon enfance. Ma mère me racontait ces histoires avant de dormir. Shéhérazade m'a enseigné que raconter, c'est survivre.",
    },
    {
      title_search: "La Peste",
      note: "Plus encore que L'Étranger, c'est le livre de Camus qui m'a transformé. La solidarité face à l'absurde. L'engagement sans illusion. Oran y est un personnage à part entière.",
    },
    {
      title_search: "Le Livre de l'intranquillité",
      note: "Pessoa écrit comme on respire dans une ville qui dort. Ce livre n'a ni début ni fin, c'est un état permanent. Je l'ouvre au hasard quand le monde me pèse.",
    },
    {
      title_search: "Le Prophète",
      note: "Gibran parle avec une simplicité qui cache une profondeur vertigineuse. C'est un livre qu'on offre aux gens qu'on aime, et qu'on relit quand on doute.",
    },
  ],
};

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN" : "🚀 APPLYING");

  // 1. Find or create the "reliure" editorial account
  let { data: reliureUser } = await supabase
    .from("users")
    .select("id")
    .eq("username", "reliure")
    .single();

  if (!reliureUser) {
    console.log("⚠️  User 'reliure' not found. You'll need to create an editorial admin account first.");
    console.log("   The script will use the first admin user as fallback.");
    const { data: fallback } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .single();
    reliureUser = fallback;
  }

  if (!reliureUser) {
    console.error("❌ No user found. Aborting.");
    process.exit(1);
  }
  console.log(`✅ Using user_id: ${reliureUser.id}`);

  // 2. Find books by title
  const foundBooks = [];
  for (const item of SELECTION.items) {
    const { data: books } = await supabase
      .from("books")
      .select("id, title, slug, cover_url, authors")
      .ilike("title", `%${item.title_search}%`)
      .limit(3);

    if (books && books.length > 0) {
      const best = books[0];
      console.log(`✅ "${item.title_search}" → ${best.title} (${best.slug || best.id})`);
      foundBooks.push({ ...item, book: best });
    } else {
      console.log(`⚠️  "${item.title_search}" — not found in DB, skipping`);
    }
  }

  if (foundBooks.length === 0) {
    console.error("❌ No books found. Import some books first.");
    process.exit(1);
  }

  console.log(`\n📚 ${foundBooks.length}/${SELECTION.items.length} books found\n`);

  if (DRY_RUN) {
    console.log("Dry run complete. Run with --apply to insert.");
    return;
  }

  // 3. Create the list
  const { data: list, error: listErr } = await supabase
    .from("lists")
    .insert({
      user_id: reliureUser.id,
      title: SELECTION.title,
      description: SELECTION.description,
      slug: SELECTION.slug,
      is_public: true,
      is_ranked: true,
      is_curated: true,
      curator_name: SELECTION.curator_name,
      curator_role: SELECTION.curator_role,
      curator_avatar_url: SELECTION.curator_avatar_url,
      curator_pull_quote: SELECTION.curator_pull_quote,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (listErr) {
    console.error("❌ Failed to create list:", listErr.message);
    process.exit(1);
  }
  console.log(`✅ Created list: ${list.id}`);

  // 4. Insert list items
  const items = foundBooks.map((fb, i) => ({
    list_id: list.id,
    book_id: fb.book.id,
    position: i + 1,
    note: fb.note,
  }));

  const { error: itemsErr } = await supabase.from("list_items").insert(items);

  if (itemsErr) {
    console.error("❌ Failed to insert items:", itemsErr.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${items.length} list items`);
  console.log(`\n🎉 Selection seeded: /selections/${SELECTION.slug}`);
}

main().catch(console.error);
