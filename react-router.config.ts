import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  ssr: false,

  async prerender() {
    const { createLoaderClient } = await import("./src/lib/supabase-loader");
    const supabase = createLoaderClient();

    // Static pages
    const paths = [
      "/",
      "/citations",
      "/la-revue",
      "/defis",
      "/login",
      "/selections",
      "/classement",
    ];

    // Book slugs — top 1000 most active (at least 1 review, quote or reading_status)
    const { data: books } = await supabase
      .from("books")
      .select("slug, rating_count")
      .not("slug", "is", null)
      .gt("rating_count", 0)
      .order("rating_count", { ascending: false })
      .limit(1000);
    if (books) {
      paths.push(...books.map((b: { slug: string }) => `/livre/${b.slug}`));
    }

    // Public usernames
    const { data: users } = await supabase
      .from("users")
      .select("username")
      .not("username", "is", null);
    if (users) {
      paths.push(...users.map((u: { username: string }) => `/${u.username}`));
    }

    console.log(`[prerender] ${paths.length} pages to prerender`);
    return paths;
  },
} satisfies Config;
