-- SUPABASE_SERVICE_ROLE_KEY: use env variable, never commit
-- Usage: SUPABASE_SERVICE_ROLE_KEY=<your_key> npx tsx src/scripts/seed.ts

-- SUPABASE_SERVICE_ROLE_KEY: use env variable, never commit
-- Usage: echo 'SUPABASE_SERVICE_ROLE_KEY=<your_key>' >> .env.local

curl -L -X POST 'https://[ton-project-ref].supabase.co/functions/v1/book_ai_enrich' \
  -H 'Authorization: Bearer [ton-anon-key]' \
  -H 'Content-Type: application/json' \
  -d '{"title": "Belle du Seigneur", "author": "Albert Cohen", "isbn13": null}'