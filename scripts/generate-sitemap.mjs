import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("[sitemap] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — skipping sitemap");
  process.exit(0);
}

const supabase = createClient(url, key);
const BASE_URL = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://reliure.page";

async function generateSitemap() {
  const urls = [];

  // Pages statiques
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/explorer", priority: "0.9", changefreq: "daily" },
    { loc: "/citations", priority: "0.7", changefreq: "daily" },
    { loc: "/la-revue", priority: "0.6", changefreq: "weekly" },
    { loc: "/defis", priority: "0.5", changefreq: "weekly" },
    { loc: "/selections", priority: "0.7", changefreq: "weekly" },
    { loc: "/explorer/boussole", priority: "0.6", changefreq: "weekly" },
  ];
  urls.push(...staticPages);

  // Livres — top 1000 most active
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("slug, created_at, rating_count")
    .not("slug", "is", null)
    .gt("rating_count", 0)
    .order("rating_count", { ascending: false })
    .limit(1000);

  if (booksError) {
    console.error("[sitemap] Error fetching books:", booksError.message);
  } else if (books) {
    urls.push(...books.map(b => ({
      loc: `/livre/${b.slug}`,
      priority: "0.8",
      changefreq: "weekly",
      lastmod: b.created_at?.split("T")[0],
    })));
    console.log(`[sitemap] ${books.length} livres`);
  }

  // Profils
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("username, created_at")
    .not("username", "is", null);

  if (usersError) {
    console.error("[sitemap] Error fetching users:", usersError.message);
  } else if (users) {
    urls.push(...users.map(u => ({
      loc: `/${u.username}`,
      priority: "0.6",
      changefreq: "weekly",
      lastmod: u.created_at?.split("T")[0],
    })));
    console.log(`[sitemap] ${users.length} profils`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <priority>${u.priority}</priority>
    <changefreq>${u.changefreq}</changefreq>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>`;

  writeFileSync("build/client/sitemap.xml", xml);
  console.log(`[sitemap] ${urls.length} URLs — build/client/sitemap.xml`);
}

generateSitemap().catch(err => {
  console.error("[sitemap] Fatal error:", err);
  process.exit(1);
});
