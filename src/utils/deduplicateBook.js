/**
 * Anti-doublons : regroupement des éditions par oeuvre.
 * Avant tout insert dans books, vérifier l'existence par :
 * 1. ISBN exact (isbn_13)
 * 2. Titre normalisé + auteur principal
 */

/**
 * Normalise un titre pour la comparaison cross-éditions.
 * "Je rouille : roman" → "je rouille"
 * "L'Étranger" → "letranger"
 * "  Belle du Seigneur  " → "belle du seigneur"
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .trim()
    // Couper au premier " : " ou " / " (sous-titre BnF, type de document)
    .split(/\s*[:/]\s/)[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Supprimer ponctuation sauf espaces
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrait le nom de famille normalisé du premier auteur.
 * ["Robin Watine"] → "watine"
 * ["Watine, Robin (1992-...)"] → "watine"
 * ["Albert Cohen"] → "cohen"
 */
function extractLastName(authors) {
  if (!authors?.length) return null;
  const first = authors[0];
  if (!first) return null;

  let name = first
    .replace(/\([^)]*\)/g, "")
    .replace(/\.\s*[A-Z].*$/, "")
    .trim();

  if (name.includes(",")) {
    name = name.split(",")[0].trim();
  } else {
    const parts = name.split(/\s+/);
    name = parts[parts.length - 1];
  }

  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Vérifie si un livre existe déjà dans la base.
 *
 * @param {object} supabase - Client Supabase
 * @param {{ title?: string, authors?: string[], isbn13?: string }} bookData
 * @returns {Promise<object|null>} Le livre existant (full row) ou null
 */
export async function findExistingBook(supabase, { title, authors, isbn13 }) {
  // 1. Recherche par ISBN exact
  if (isbn13) {
    const cleanISBN = isbn13.replace(/-/g, "");
    const { data } = await supabase
      .from("books")
      .select("*")
      .eq("isbn_13", cleanISBN)
      .maybeSingle();
    if (data) return data;
  }

  // 2. Recherche par titre normalisé + auteur
  if (!title) return null;

  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) return null;

  const authorLast = extractLastName(authors);

  // Chercher des candidats avec ilike sur le titre (1er mot au moins)
  const firstWord = normalizedTitle.split(" ")[0];
  if (firstWord.length < 2) return null;

  const { data: candidates } = await supabase
    .from("books")
    .select("*")
    .ilike("title", `%${firstWord}%`)
    .limit(20);

  if (!candidates?.length) return null;

  for (const candidate of candidates) {
    const candidateNorm = normalizeTitle(candidate.title);
    if (candidateNorm !== normalizedTitle) continue;

    // Titre identique — vérifier l'auteur si disponible des deux côtés
    const candidateAuthor = extractLastName(
      Array.isArray(candidate.authors) ? candidate.authors : [],
    );

    // Match si : même auteur, OU un des deux n'a pas d'auteur
    if (!authorLast || !candidateAuthor || candidateAuthor === authorLast) {
      return candidate;
    }
  }

  return null;
}
