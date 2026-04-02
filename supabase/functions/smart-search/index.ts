import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `Tu es le moteur de recherche intelligent de Reliure, une app de lecture francophone.

L'utilisateur a tapé une requête dans la barre de recherche. Ta mission : identifier les livres les plus probables.

La requête peut être :
- Un titre partiel ou mal orthographié ("belle d" → Belle du Seigneur)
- Un nom d'auteur partiel ("bol" → Roberto Bolaño)
- Une description en langage naturel ("roman court fantômes mexique" → Pedro Páramo)
- Une citation approximative ("aujourd'hui maman est morte" → L'Étranger)
- Un thème ou une ambiance ("existentialisme algérie soleil" → L'Étranger, La Peste)
- Une demande de recommandation ("comme 2666 mais plus court" → Nocturne du Chili, Amuleto)

Réponds UNIQUEMENT avec un JSON valide (pas de backticks, pas de texte avant/après) :

{
  "books": [
    {
      "title": "Titre exact du livre",
      "author": "Nom complet de l'auteur",
      "isbn13": "9780000000000 ou null si inconnu",
      "why": "Phrase courte expliquant le match (12 mots max, en français)"
    }
  ],
  "ghost": "complétion pour le champ de recherche ou null",
  "interpreted_as": "Ce que tu as compris de la requête (8 mots max)"
}

Règles :
- 1 à 5 livres max, classés par probabilité décroissante
- Privilégier les éditions françaises et la littérature francophone
- "ghost" = la suite du texte tapé si c'est un début de titre/auteur.
  Format : "suite du titre — auteur". Exemples :
  "harry p" → ghost: "otter à l'école des sorciers — j.k. rowling"
  "belle d" → ghost: "u seigneur — albert cohen"
  "proust" → ghost: " — à la recherche du temps perdu"
  Si la requête est en langage naturel : ghost = null
- Pour les requêtes de 1-2 mots qui ressemblent à un début de titre, retourne jusqu'à 3 suggestions dans books ET le ghost le plus probable.
- "interpreted_as" = reformulation courte pour afficher à l'utilisateur
- Ne jamais inventer de livres qui n'existent pas
- Ne jamais inventer un ISBN. Si tu n'es pas certain à 100% de l'ISBN de l'édition poche FR, retourne null pour isbn13. Les ISBN halluccinés sont pires que pas d'ISBN.
- Si la requête n'est pas liée à un livre : { "books": [], "ghost": null, "interpreted_as": null }
- Si c'est un ISBN (suite de chiffres) : { "books": [], "ghost": null, "interpreted_as": null }
- Gérer les fautes d'orthographe courantes : "Beaudelaire" → Baudelaire, "Nietzche" → Nietzsche, "Dostoïevsky" → Dostoïevski, "Toqueville" → Tocqueville, etc.
- Pour isbn13 : toujours retourner l'ISBN de l'édition de poche française la plus courante (Folio Gallimard, Le Livre de Poche, Points Seuil, 10/18, Pocket, J'ai Lu, Babel Actes Sud). Si pas d'édition poche connue, retourner l'édition originale française. Ne jamais retourner un ISBN d'édition collector, illustrée, scolaire, ou numérique.`;

function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  try {
    const { query } = await req.json();

    if (!query || query.length < 2) {
      return Response.json(
        { books: [], ghost: null, interpreted_as: null },
        { headers: getCorsHeaders(req) },
      );
    }

    // Supabase client for cache
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const normalizedQuery = normalizeQuery(query);

    // Check cache
    const { data: cached } = await supabase
      .from("search_cache")
      .select("response, hit_count")
      .eq("query_normalized", normalizedQuery)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      // Increment hit_count in background (fire-and-forget)
      supabase
        .from("search_cache")
        .update({ hit_count: (cached.hit_count || 0) + 1 })
        .eq("query_normalized", normalizedQuery)
        .then(() => {});

      return Response.json(cached.response, { headers: getCorsHeaders(req) });
    }

    // Call Claude Haiku
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("smart-search: ANTHROPIC_API_KEY not set");
      return Response.json(
        { books: [], ghost: null, interpreted_as: null },
        { headers: getCorsHeaders(req) },
      );
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: query }],
      }),
    });

    const rawText = await aiRes.text();

    if (!aiRes.ok) {
      console.error("smart-search: Anthropic API error", aiRes.status);
      return Response.json(
        { books: [], ghost: null, interpreted_as: null },
        { headers: getCorsHeaders(req) },
      );
    }

    const aiData = JSON.parse(rawText);
    const text =
      aiData.content?.[0]?.type === "text" ? aiData.content[0].text : "";

    let result;
    try {
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { books: [], ghost: null, interpreted_as: null };
    }

    // Store in cache (7 days)
    await supabase.from("search_cache").upsert({
      query_normalized: normalizedQuery,
      response: result,
      hit_count: 1,
      expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    // Auto-enrichment: import AI-discovered books into DB (fire-and-forget)
    if (result.books?.length > 0) {
      for (const book of result.books) {
        if (book.isbn13 && /^\d{13}$/.test(book.isbn13)) {
          // Check if already in DB before importing
          const { count } = await supabase
            .from("books")
            .select("id", { count: "exact", head: true })
            .eq("isbn_13", book.isbn13);
          if (!count || count === 0) {
            // Fire-and-forget: don't await, don't block the response
            supabase.functions.invoke("book_import", {
              body: { isbn: book.isbn13 },
            }).catch(() => {}); // silently ignore errors
          }
        }
      }
    }

    return Response.json(result, { headers: getCorsHeaders(req) });
  } catch (error) {
    console.error("smart-search error:", error);
    // Never break search because AI is down
    return Response.json(
      { books: [], ghost: null, interpreted_as: null },
      { status: 200, headers: getCorsHeaders(req) },
    );
  }
});
