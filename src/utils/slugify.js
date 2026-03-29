/**
 * Generate a URL-friendly slug from text.
 */
export function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate a unique book slug, checking against existing slugs in Supabase.
 * @param {string} title
 * @param {string[]} authors
 * @param {string|number|null} year
 * @param {function} checkExists - async (slug) => boolean
 */
export async function generateBookSlug(title, authors = [], year = null, checkExists) {
  const base = slugify(title);
  if (!base) return null;

  // Try base slug
  if (!(await checkExists(base))) return base;

  // Try with author last name
  const lastName = authors[0]?.split(" ").pop();
  if (lastName) {
    const withAuthor = `${base}-${slugify(lastName)}`;
    if (withAuthor !== base && !(await checkExists(withAuthor))) return withAuthor;

    // Try with year
    const y = year ? String(year).slice(0, 4) : null;
    if (y) {
      const withYear = `${withAuthor}-${y}`;
      if (!(await checkExists(withYear))) return withYear;

      // Counter fallback
      for (let i = 2; i <= 10; i++) {
        const withCounter = `${withYear}-${i}`;
        if (!(await checkExists(withCounter))) return withCounter;
      }
    }
  }

  // Final fallback with counter on base
  for (let i = 2; i <= 100; i++) {
    const withCounter = `${base}-${i}`;
    if (!(await checkExists(withCounter))) return withCounter;
  }

  return `${base}-${Date.now()}`;
}
