# Résumé exécutif — Audits performance Reliure

> 5 audits réalisés le 1er avril 2026 | React 19 + Vite 8 + Supabase + Vercel

---

## Score performance global : 52/100

| Domaine | Score | Justification |
|---------|:-----:|---------------|
| Bundle & chargement | 4/10 | 725 KB en un seul chunk, zéro code splitting, pas de lazy images |
| Requêtes Supabase | 5/10 | Waterfalls séquentiels, zéro cache client, 15+ requêtes/page profil |
| Schéma PostgreSQL | 7/10 | RLS solide, bons index partiels, mais 2 FK non indexées et search non scalable |
| React renders | 4/10 | Zéro React.memo, 27 states dans BookPage, cascade useLikes |
| Edge functions | 6/10 | book_import bien parallélisé, mais aucun timeout Anthropic, bug env var |

**L'app fonctionne bien pour 20 users et 3800 livres**, mais les fondations manquent pour une beta publique confortable. Les 3 problèmes structurants :

1. **Pas de cache client** — chaque navigation refait toutes les requêtes (15+ sur le profil)
2. **Pas de code splitting** — 725 KB de JS monolithique chargé pour chaque visiteur
3. **Pas de timeouts sur Anthropic** — risque de blocage 150s sur smart-search et AI enrich

## Top 5 quick wins (< 30 min chacun)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Timeout Anthropic (smart-search + book_ai_enrich) | Élimine risque blocage 150s | 5 min |
| 2 | Paralléliser useProfileData (4 await → Promise.all) | **-600ms** page profil | 10 min |
| 3 | Code splitting React.lazy (14 pages) | **-50 KB gzip** chargement initial | 30 min |
| 4 | `loading="lazy"` sur Img.jsx | Bande passante réseau | 2 min |
| 5 | Index FK manquants (reading_status.book_id, list_items.book_id) | Prévention lock DELETE | 5 min SQL |

## Investissement structurant

**TanStack Query** (~3h) : résout le cache client, les re-fetches sur navigation retour, et la dedup de requêtes. C'est le seul changement qui transforme l'UX perçue globalement.

## Chiffres clés

- **725 KB** JS en un chunk (Vite warning > 500 KB)
- **15+ requêtes** Supabase au chargement du profil, dont 4 séquentielles
- **0** React.memo, **0** React.lazy, **0** Suspense dans toute l'app
- **27 useState** dans BookPage (1024 lignes)
- **4 edge functions**, dont 2 sans timeout sur les appels IA
- **~60%** des appels Google Books évités par la skip logic (bien)
- **0 incident** en beta fermée (les volumes sont trop faibles pour révéler les problèmes)
