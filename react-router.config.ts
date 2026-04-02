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
      "/explorer",
      "/citations",
      "/la-revue",
      "/defis",
      "/login",
      "/selections",
      "/classement",
    ];

    // Book slugs
    const { data: books } = await supabase
      .from("books")
      .select("slug")
      .not("slug", "is", null);
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
