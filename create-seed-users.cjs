#!/usr/bin/env node
// ============================================================
// Reliure — Script de création des comptes seed
// ============================================================
// Usage :
//   1. Remplace SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY ci-dessous
//   2. npm install @supabase/supabase-js  (si pas déjà installé)
//   3. Renomme en .cjs : mv create-seed-users.js create-seed-users.cjs
//   4. node create-seed-users.cjs
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env variable');
if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL env variable');
const SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USERS = [
  { email: 'u01@reliure.beta', username: 'margaux_l', display_name: 'Margaux L.', bio: 'Lectrice compulsive. Fiction contemporaine et littérature latino-américaine. Paris 11e.', placeholder: 'u01' },
  { email: 'u02@reliure.beta', username: 'theo_b', display_name: 'Théo B.', bio: 'Étudiant en lettres modernes. Beckett, Bernhard, Blanchot. Probablement en train de rater un cours.', placeholder: 'u02' },
  { email: 'u03@reliure.beta', username: 'camille_d', display_name: 'Camille D.', bio: 'Je lis dans le métro, dans la baignoire, et parfois au bureau. Romans noirs et SF surtout.', placeholder: 'u03' },
  { email: 'u04@reliure.beta', username: 'samir_k', display_name: 'Samir K.', bio: 'Ingénieur le jour, lecteur de polars la nuit. Simenon forever.', placeholder: 'u04' },
  { email: 'u05@reliure.beta', username: 'louise_r', display_name: 'Louise R.', bio: 'Libraire chez Compagnie (Paris 5e). Je conseille mieux que je ne lis, paraît-il.', placeholder: 'u05' },
  { email: 'u06@reliure.beta', username: 'paul_m', display_name: 'Paul M.', bio: 'Retraité. Toute la journée pour lire. Je rattrape 40 ans de Proust en retard.', placeholder: 'u06' },
  { email: 'u07@reliure.beta', username: 'ines_v', display_name: 'Inès V.', bio: 'Doctorante en histoire contemporaine. La littérature comme refuge depuis 1997.', placeholder: 'u07' },
  { email: 'u08@reliure.beta', username: 'romain_c', display_name: 'Romain C.', bio: 'Journaliste. Je lis ce que je devrais chroniquer, et le reste par plaisir.', placeholder: 'u08' },
  { email: 'u09@reliure.beta', username: 'sofia_p', display_name: 'Sofia P.', bio: 'Illustratrice. Je lis de la poésie et des romans graphiques. Et tout Borges.', placeholder: 'u09' },
  { email: 'u10@reliure.beta', username: 'julien_f', display_name: 'Julien F.', bio: 'Fan de SF. Dick, Le Guin, Butler. Les autres genres existent, je suppose.', placeholder: 'u10' },
  { email: 'u11@reliure.beta', username: 'alice_n', display_name: 'Alice N.', bio: 'Prof de français au lycée. Je fais lire L\'Étranger depuis 12 ans et je l\'aime encore.', placeholder: 'u11' },
  { email: 'u12@reliure.beta', username: 'marc_t', display_name: 'Marc T.', bio: 'Chef cuisinier. Je lis la nuit après le service. Surtout des romans noirs scandinaves.', placeholder: 'u12' },
  { email: 'u13@reliure.beta', username: 'elena_b', display_name: 'Elena B.', bio: 'Photographe. Voyages, carnets, littérature de terrain. Sebald est mon saint patron.', placeholder: 'u13' },
  { email: 'u14@reliure.beta', username: 'hugo_d', display_name: 'Hugo D.', bio: '22 ans, Lyon. Je découvre tout en retard et j\'adore ça.', placeholder: 'u14' },
  { email: 'u15@reliure.beta', username: 'clementine_s', display_name: 'Clémentine S.', bio: 'Romance, feel-good et quelques classiques pour me donner bonne conscience.', placeholder: 'u15' },
];

async function main() {
  const uuidMap = {};
  console.log('Création des 15 comptes...');
  for (const user of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'reliure-seed-2026',
      email_confirm: true,
    });
    if (error) { console.error('Erreur pour', user.email, error.message); continue; }
    uuidMap[user.placeholder] = data.user.id;
    console.log('✓', user.email, '->', data.user.id);
  }
  let sql = fs.readFileSync('seed.sql', 'utf8');
  for (const [placeholder, realUUID] of Object.entries(uuidMap)) {
    const fakeUUID = 'aaaaaaaa-aaaa-aaaa-aaaa-' + placeholder.replace('u', '').padStart(12, '0');
    sql = sql.split(fakeUUID).join(realUUID);
  }
  fs.writeFileSync('seed-final.sql', sql);
  console.log('\n✅ seed-final.sql généré. Colle-le dans Supabase SQL Editor.');
}

main().catch(console.error);
