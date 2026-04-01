-- ============================================================
-- Reliure — Seed data (généré le 29/03/2026)
-- ============================================================

-- 1. Livres
INSERT INTO public.books (id, title, authors, page_count, cover_url, language, avg_rating, rating_count) VALUES
  ('00000000-0000-0000-0000-000000000001', '2666', '["Roberto Bolaño"]', 898, 'https://covers.openlibrary.org/b/isbn/9780312429218-L.jpg', 'es', 4.5, 1247),
  ('00000000-0000-0000-0000-000000000002', 'Les Détectives sauvages', '["Roberto Bolaño"]', 577, 'https://covers.openlibrary.org/b/isbn/9780312427481-L.jpg', 'es', 4.5, 892),
  ('00000000-0000-0000-0000-000000000003', 'Beloved', '["Toni Morrison"]', 324, 'https://covers.openlibrary.org/b/isbn/9781400033416-L.jpg', 'en', 4.3, 3421),
  ('00000000-0000-0000-0000-000000000004', 'L''Étranger', '["Albert Camus"]', 123, 'https://covers.openlibrary.org/b/isbn/9782070360024-L.jpg', 'fr', 4.1, 8932),
  ('00000000-0000-0000-0000-000000000005', 'Pedro Páramo', '["Juan Rulfo"]', 124, 'https://covers.openlibrary.org/b/isbn/9780802133908-L.jpg', 'es', 4.4, 2103),
  ('00000000-0000-0000-0000-000000000006', 'Molloy', '["Samuel Beckett"]', 256, 'https://covers.openlibrary.org/b/isbn/9780802144454-L.jpg', 'fr', 4.0, 567),
  ('00000000-0000-0000-0000-000000000007', 'Ficciones', '["Jorge Luis Borges"]', 174, 'https://covers.openlibrary.org/b/isbn/9780802130303-L.jpg', 'es', 4.6, 4210),
  ('00000000-0000-0000-0000-000000000008', 'La Peste', '["Albert Camus"]', 308, 'https://covers.openlibrary.org/b/isbn/9782070360420-L.jpg', 'fr', 4.2, 6543),
  ('00000000-0000-0000-0000-000000000009', 'Austerlitz', '["W.G. Sebald"]', 298, 'https://covers.openlibrary.org/b/isbn/9780375504839-L.jpg', 'de', 4.3, 1876),
  ('00000000-0000-0000-0000-000000000010', 'Si par une nuit d''hiver un voyageur', '["Italo Calvino"]', 260, 'https://covers.openlibrary.org/b/isbn/9780156439619-L.jpg', 'it', 4.2, 3102),
  ('00000000-0000-0000-0000-000000000011', 'Ulysses', '["James Joyce"]', 730, 'https://covers.openlibrary.org/b/isbn/9780199535675-L.jpg', 'en', 3.7, 5678),
  ('00000000-0000-0000-0000-000000000012', 'Les Choses', '["Georges Perec"]', 160, 'https://covers.openlibrary.org/b/isbn/9782260000068-L.jpg', 'fr', 3.9, 432)
ON CONFLICT (id) DO NOTHING;

-- 2. Profils utilisateurs
INSERT INTO public.users (id, username, display_name, bio) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'margaux_l', 'Margaux L.', 'Lectrice compulsive. Fiction contemporaine et littérature latino-américaine. Paris 11e.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 'theo_b', 'Théo B.', 'Étudiant en lettres modernes. Beckett, Bernhard, Blanchot. Probablement en train de rater un cours.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003', 'camille_d', 'Camille D.', 'Je lis dans le métro, dans la baignoire, et parfois au bureau. Romans noirs et SF surtout.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004', 'samir_k', 'Samir K.', 'Ingénieur le jour, lecteur de polars la nuit. Simenon forever.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005', 'louise_r', 'Louise R.', 'Libraire chez Compagnie (Paris 5e). Je conseille mieux que je ne lis, paraît-il.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006', 'paul_m', 'Paul M.', 'Retraité. Toute la journée pour lire. Je rattrape 40 ans de Proust en retard.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007', 'ines_v', 'Inès V.', 'Doctorante en histoire contemporaine. La littérature comme refuge depuis 1997.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008', 'romain_c', 'Romain C.', 'Journaliste. Je lis ce que je devrais chroniquer, et le reste par plaisir.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000009', 'sofia_p', 'Sofia P.', 'Illustratrice. Je lis de la poésie et des romans graphiques. Et tout Borges.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000010', 'julien_f', 'Julien F.', 'Fan de SF. Dick, Le Guin, Butler. Les autres genres existent, je suppose.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000011', 'alice_n', 'Alice N.', 'Prof de français au lycée. Je fais lire L''Étranger depuis 12 ans et je l''aime encore.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000012', 'marc_t', 'Marc T.', 'Chef cuisinier. Je lis la nuit après le service. Surtout des romans noirs scandinaves.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000013', 'elena_b', 'Elena B.', 'Photographe. Voyages, carnets, littérature de terrain. Sebald est mon saint patron.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000014', 'hugo_d', 'Hugo D.', '22 ans, Lyon. Je découvre tout en retard et j''adore ça.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000015', 'clementine_s', 'Clémentine S.', 'Romance, feel-good et quelques classiques pour me donner bonne conscience.')
ON CONFLICT (id) DO NOTHING;

-- 3. Critiques (53)
INSERT INTO public.reviews (id, user_id, book_id, rating, body, contains_spoilers) VALUES
  ('cccccccc-cccc-cccc-cccc-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000001', 5, 'Un chef-d''œuvre absolu. Bolaño construit un labyrinthe dont on ne veut jamais sortir. Chaque partie est un roman en soi, avec sa propre logique, ses propres obsessions. La quatrième partie est insoutenable — au sens littéral.', false),
  ('cccccccc-cccc-cccc-cccc-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000001', 4, 'La partie des crimes de Santa Teresa est une lecture éprouvante mais nécessaire. Bolaño ne regarde pas ailleurs. C''est ce qui rend ce livre insurpassable et presque illisible à la fois.', false),
  ('cccccccc-cccc-cccc-cccc-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000001', 5, 'J''ai mis six mois à le finir et je le regrette pas une seconde. Le genre de livre qui change ta façon de lire tous les autres.', false),
  ('cccccccc-cccc-cccc-cccc-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000001', 3, 'Formidable sur le papier. En pratique, j''ai décroché à mi-parcours. La partie des critiques m''a eu, la suite moins. Je reviendrai peut-être dans dix ans.', false),
  ('cccccccc-cccc-cccc-cccc-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000002', 5, 'Mon Bolaño préféré. Plus immédiat que 2666, plus fou, plus vivant. La poésie viscérale du voyage, de la jeunesse, de l''échec magnifique.', false),
  ('cccccccc-cccc-cccc-cccc-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000002', 4, 'Le roman de formation définitif pour une génération de lecteurs francophones. Traduit magnifiquement. La structure fragmentée m''a d''abord déstabilisée puis emportée.', false),
  ('cccccccc-cccc-cccc-cccc-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000002', 4, 'wow. je savais pas trop à quoi m''attendre et j''ai pris une claque. les personnages sont tellement vivants c''est dingue', false),
  ('cccccccc-cccc-cccc-cccc-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000003', 5, 'Morrison écrit avec une densité que je n''ai trouvée nulle part ailleurs. Le passé comme présence physique. La révélation de Beloved m''a dévastée.', true),
  ('cccccccc-cccc-cccc-cccc-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000003', 5, 'Je fais lire ce livre à mes terminales depuis trois ans. Ils résistent, puis ils capitulent. C''est le but.', false),
  ('cccccccc-cccc-cccc-cccc-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000003', 4, 'Une lecture difficile mais indispensable. La langue de Morrison est à la fois opaque et transparente — on comprend tout sans comprendre comment.', false),
  ('cccccccc-cccc-cccc-cccc-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000003', 4, 'Pas mon genre habituel mais une amie insistait depuis des mois. Elle avait raison. J''ai pleuré à la fin.', false),
  ('cccccccc-cccc-cccc-cccc-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000004', 4, 'Relu pour la quatrième fois. Ce qui m''a frappée cette fois : la précision chirurgicale de la langue. Pas un mot de trop. Meursault est un trou noir.', false),
  ('cccccccc-cccc-cccc-cccc-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000004', 3, 'Surcoté. Ou alors j''étais trop vieux quand je l''ai lu pour la première fois. Les lycéens qui le découvrent ont de la chance.', false),
  ('cccccccc-cccc-cccc-cccc-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000004', 5, 'Lu à 18 ans, relu à 68. Le livre a changé, pas moi. Ou l''inverse. Je ne sais plus. C''est peut-être ça, un classique.', false),
  ('cccccccc-cccc-cccc-cccc-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000004', 4, 'Je le connais par cœur à force de l''enseigner. Et pourtant, à chaque lecture avec une nouvelle classe, je remarque quelque chose de nouveau.', false),
  ('cccccccc-cccc-cccc-cccc-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000004', 4, 'lu en 2h dans le train. court mais ça reste. la phrase d''ouverture je l''aurai en tête longtemps', false),
  ('cccccccc-cccc-cccc-cccc-000000000017', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000005', 5, 'Pedro Páramo est le fantôme de tous les romans qui l''ont suivi. Rulfo a inventé quelque chose d''irréductible. 124 pages qui changent la littérature.', false),
  ('cccccccc-cccc-cccc-cccc-000000000018', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000005', 4, 'Lu en espagnol puis en français. Les deux versions sont belles. La mort comme état ordinaire — Rulfo rend ça évident, presque rassurant.', false),
  ('cccccccc-cccc-cccc-cccc-000000000019', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000005', 3, 'j''ai rien compris à qui est mort ou vivant mais apparemment c''est normal et c''est le but? à relire', false),
  ('cccccccc-cccc-cccc-cccc-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000005', 5, 'En une nuit. Les voix des morts qui parlent depuis leurs tombes, c''est la chose la plus belle et la plus étrange que j''ai lue.', false),
  ('cccccccc-cccc-cccc-cccc-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000006', 4, 'Beckett au sommet de sa prose française. Le monologue de Molloy est une performance langagière unique — ça épuise et ça fascine en même temps.', false),
  ('cccccccc-cccc-cccc-cccc-000000000022', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000006', 3, 'J''admire plus que j''apprécie. La langue est prodigieuse. L''expérience de lecture est éprouvante. Je comprends pourquoi c''est essentiel mais ce n''est pas facile.', false),
  ('cccccccc-cccc-cccc-cccc-000000000023', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000006', 4, 'Beckett m''accompagne depuis quarante ans. Molloy est son roman le plus accompli. Le vieillard dans le fossé — on n''invente pas ça.', false),
  ('cccccccc-cccc-cccc-cccc-000000000024', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000007', 5, 'Borges invente des mondes dans chaque nouvelle. La bibliothèque de Babel, le jardin aux sentiers qui bifurquent — ces images ne me quittent plus. Vertigineux.', false),
  ('cccccccc-cccc-cccc-cccc-000000000025', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000007', 5, 'Mon livre de chevet depuis cinq ans. Je l''ouvre au hasard et je tombe toujours sur quelque chose qui me sidère.', false),
  ('cccccccc-cccc-cccc-cccc-000000000026', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000007', 5, 'En tant que journaliste, je reviens souvent à Borges pour la construction. Chaque phrase est une architecture.', false),
  ('cccccccc-cccc-cccc-cccc-000000000027', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000007', 4, 'Les labyrinthes de Borges sont des arguments philosophiques déguisés en fiction. C''est la chose la plus intelligente que la littérature ait produite.', false),
  ('cccccccc-cccc-cccc-cccc-000000000028', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000007', 4, 'Chaque nouvelle est un puzzle qu''on démonte et remonte différemment à chaque lecture. Fascinant.', false),
  ('cccccccc-cccc-cccc-cccc-000000000029', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000007', 5, 'Je l''enseigne en terminale depuis deux ans. Les élèves détestent Tlön au début. À la fin du cours, ils comprennent que c''est leur monde qu''il décrit.', false),
  ('cccccccc-cccc-cccc-cccc-000000000030', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000008', 4, 'Plus actuel que jamais, malheureusement. Camus avait tout compris sur les épidémies — et surtout sur comment les humains s''organisent face à l''incompréhensible.', false),
  ('cccccccc-cccc-cccc-cccc-000000000031', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000008', 5, 'Je l''ai relu pendant le confinement de 2020. Expérience de lecture unique. Rieux est le personnage littéraire que j''aurais voulu être.', false),
  ('cccccccc-cccc-cccc-cccc-000000000032', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000008', 4, 'L''allégorie est limpide mais jamais grossière. Camus réussit à écrire un roman humaniste sans être naïf. Difficile exercice.', false),
  ('cccccccc-cccc-cccc-cccc-000000000033', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000008', 3, 'Bien sûr que c''est important et tout mais j''ai eu du mal à m''attacher aux personnages. Peut-être pas le bon moment.', false),
  ('cccccccc-cccc-cccc-cccc-000000000034', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000009', 5, 'Sebald est mon saint patron. Austerlitz m''a accompagnée pendant un voyage en Belgique — lire ce livre dans les gares qu''il décrit, c''est une expérience de doublure du réel.', false),
  ('cccccccc-cccc-cccc-cccc-000000000035', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000009', 5, 'La prose de Sebald est une forme de deuil. Interminablement belle. Les photos en noir et blanc intégrées au texte créent un malaise parfait.', false),
  ('cccccccc-cccc-cccc-cccc-000000000036', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000009', 4, 'Sebald est inclassable. Ni roman ni essai ni documentaire. Un objet littéraire qui crée ses propres règles. Austerlitz est son sommet.', false),
  ('cccccccc-cccc-cccc-cccc-000000000037', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000009', 4, 'J''ai interviewé un historien qui disait que Sebald avait plus fait pour la mémoire de la Shoah que dix essais académiques. Je comprends maintenant pourquoi.', false),
  ('cccccccc-cccc-cccc-cccc-000000000038', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000010', 4, 'Un livre sur l''acte de lire qui te force à réfléchir à chaque phrase à ce que tu fais. Vertigineux et ludique à la fois.', false),
  ('cccccccc-cccc-cccc-cccc-000000000039', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000010', 5, 'Calvino joue avec le lecteur comme un chat avec une pelote. Mais c''est le lecteur qui finit par gagner — ou par comprendre qu''il avait déjà gagné.', false),
  ('cccccccc-cccc-cccc-cccc-000000000040', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000010', 4, 'La mise en abyme la plus élégante de la littérature occidentale. Le début de chaque chapitre est un tour de force stylistique.', false),
  ('cccccccc-cccc-cccc-cccc-000000000041', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000010', 3, 'c''est malin mais j''ai décroché au milieu. trop de jeu j''aurais voulu une vraie histoire', false),
  ('cccccccc-cccc-cccc-cccc-000000000042', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000011', 2, 'J''ai essayé trois fois. La troisième jusqu''à la page 400. Je capitule. Je comprends l''importance historique. Mais ce n''est pas pour moi.', false),
  ('cccccccc-cccc-cccc-cccc-000000000043', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000011', 4, 'Ulysses n''est pas à lire seul — il faut un guide ou un cours. Avec l''accompagnement qu''il mérite, c''est une expérience unique. Sans, c''est juste douloureux.', false),
  ('cccccccc-cccc-cccc-cccc-000000000044', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000011', 3, 'Je suis fan de SF donc je pensais être immunisé contre la difficulté. J''avais tort. Ulysses est un autre univers.', false),
  ('cccccccc-cccc-cccc-cccc-000000000045', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000012', 4, 'Perec décrit ma génération avec trente ans d''avance. Le désir de posséder des objets comme substitut à vivre — c''est encore plus vrai aujourd''hui.', false),
  ('cccccccc-cccc-cccc-cccc-000000000046', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000012', 3, 'Court et percutant. Le catalogue d''objets désirés est une radiographie de la société de consommation. Mais j''attendais plus de chair, plus de personnages.', false),
  ('cccccccc-cccc-cccc-cccc-000000000047', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000012', 4, 'Perec comme sociologue malgré lui. Les Choses est un document d''époque autant qu''un roman. L''écriture est froide et c''est exactement ce qu''il fallait.', false),
  ('cccccccc-cccc-cccc-cccc-000000000048', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000008', 4, 'Lu d''une traite un dimanche de pluie. Camus réussit quelque chose d''impossible : parler de la mort collective sans jamais perdre l''individu de vue.', false),
  ('cccccccc-cccc-cccc-cccc-000000000049', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000007', 5, 'Je lisais surtout de la SF et un ami m''a tendu Ficciones en disant ''ça te plaira''. Il avait raison : c''est de la SF pour ceux qui n''appellent pas ça SF.', false),
  ('cccccccc-cccc-cccc-cccc-000000000050', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000002', 4, 'Un roman sur des poètes ratés magnifiques qui cherchent une poétesse disparue dans le désert mexicain. La description ne rend rien. Il faut juste y aller.', false),
  ('cccccccc-cccc-cccc-cccc-000000000051', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000004', 4, 'Je l''ai lu en service après minuit. Meursault et moi on n''est pas si différents — les deux à côté de nos vies sans trop savoir pourquoi.', false),
  ('cccccccc-cccc-cccc-cccc-000000000052', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000005', 4, 'Moins de 130 pages pour révolutionner la littérature mondiale. Rulfo fait honte à beaucoup d''auteurs plus bavards.', false),
  ('cccccccc-cccc-cccc-cccc-000000000053', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000007', 4, 'Mon chéri m''a offert Ficciones en me disant que j''allais détester. J''ai adoré. Lui aussi maintenant.', false)
ON CONFLICT DO NOTHING;

-- 4. Citations (35)
INSERT INTO public.quotes (id, user_id, book_id, body) VALUES
  ('dddddddd-dddd-dddd-dddd-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000004', 'Aujourd''hui, maman est morte. Ou peut-être hier, je ne sais pas.'),
  ('dddddddd-dddd-dddd-dddd-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000008', 'Il n''y a pas de honte à préférer le bonheur.'),
  ('dddddddd-dddd-dddd-dddd-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000007', 'Les miroirs et la copulation sont abominables car ils multiplient le nombre des hommes.'),
  ('dddddddd-dddd-dddd-dddd-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000006', 'Je ne sais plus très bien où j''en suis avec mon histoire. Ça n''a d''ailleurs aucune importance.'),
  ('dddddddd-dddd-dddd-dddd-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000003', '124 était hanté.'),
  ('dddddddd-dddd-dddd-dddd-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000008', 'La vérité est que tout le monde s''ennuie, et que personne n''y peut rien.'),
  ('dddddddd-dddd-dddd-dddd-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000004', 'J''ai compris que j''avais détruit l''équilibre du jour, le silence exceptionnel d''une plage où j''avais été heureux.'),
  ('dddddddd-dddd-dddd-dddd-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000005', 'Je suis venu à Comala parce qu''on m''avait dit que mon père, un certain Pedro Páramo, vivait là.'),
  ('dddddddd-dddd-dddd-dddd-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000001', 'La littérature est une série de mensonges qui parfois disent la vérité.'),
  ('dddddddd-dddd-dddd-dddd-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000007', 'Le temps bifurque perpétuellement vers d''innombrables futurs.'),
  ('dddddddd-dddd-dddd-dddd-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000008', 'Contre les fléaux, en général, on manque d''imagination.'),
  ('dddddddd-dddd-dddd-dddd-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000004', 'Il m''a demandé si j''avais de la peine. J''ai répondu que non.'),
  ('dddddddd-dddd-dddd-dddd-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000009', 'Il semble que tout ce que j''ai fait au cours de mon existence, tout ce qui m''est arrivé, ne soit qu''une préparation à cet instant.'),
  ('dddddddd-dddd-dddd-dddd-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000003', 'Rampant entre les feuilles de la mémoire, elle retrouvait ce qui était perdu.'),
  ('dddddddd-dddd-dddd-dddd-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000007', 'Je dois avertir le lecteur que ces pages ne présentent aucune difficulté particulière.'),
  ('dddddddd-dddd-dddd-dddd-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000012', 'Ils n''aimaient pas, ils possédaient.'),
  ('dddddddd-dddd-dddd-dddd-000000000017', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000007', 'La carte n''est pas le territoire.'),
  ('dddddddd-dddd-dddd-dddd-000000000018', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000010', 'Tu vas commencer à lire le nouveau roman d''Italo Calvino, Si par une nuit d''hiver un voyageur.'),
  ('dddddddd-dddd-dddd-dddd-000000000019', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000007', 'Ce monde, je commençais à m''en rendre compte, était une bibliothèque.'),
  ('dddddddd-dddd-dddd-dddd-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000001', 'Le chaos est toujours simplement du chaos, aussi dense et impénétrable que possible.'),
  ('dddddddd-dddd-dddd-dddd-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000004', 'J''ai ouvert mon cœur à la tendre indifférence du monde.'),
  ('dddddddd-dddd-dddd-dddd-000000000022', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000008', 'Il faut imaginer Sisyphe heureux.'),
  ('dddddddd-dddd-dddd-dddd-000000000023', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000012', 'Ils voyaient dans leur appartement le reflet fidèle de la société qu''ils voulaient être.'),
  ('dddddddd-dddd-dddd-dddd-000000000024', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000004', 'C''est alors que tout a vacillé. La mer a charrié un souffle épais et ardent.'),
  ('dddddddd-dddd-dddd-dddd-000000000025', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000009', 'Je ne savais pas que je cherchais quelque chose, mais quelque chose me cherchait.'),
  ('dddddddd-dddd-dddd-dddd-000000000026', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000002', 'La poésie entre dans le sang et fait partie du corps, comme le venin de certains serpents.'),
  ('dddddddd-dddd-dddd-dddd-000000000027', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000005', 'Il y a des choses qui font mal rien qu''à les voir.'),
  ('dddddddd-dddd-dddd-dddd-000000000028', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000004', 'Maman était morte. Ça ne voulait rien dire pour moi.'),
  ('dddddddd-dddd-dddd-dddd-000000000029', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000007', 'Dans les rêves, les formes confuses sont comme une monnaie de cette pensée-là.'),
  ('dddddddd-dddd-dddd-dddd-000000000030', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000008', 'Le mal qui est dans le monde vient presque toujours de l''ignorance.'),
  ('dddddddd-dddd-dddd-dddd-000000000031', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000006', 'Je ne sais plus très bien comment je suis venu là, sur cette route.'),
  ('dddddddd-dddd-dddd-dddd-000000000032', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000010', 'Chaque nouveau roman est une nouvelle tentative de lire ce qui n''a pas encore été écrit.'),
  ('dddddddd-dddd-dddd-dddd-000000000033', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000005', 'Les murmures de Pedro Páramo se perdaient dans le vide.'),
  ('dddddddd-dddd-dddd-dddd-000000000034', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000009', 'La mémoire est peut-être la seule vraie forme de la présence.'),
  ('dddddddd-dddd-dddd-dddd-000000000035', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000001', 'Les auteurs ne sont que des créatures de leur propre imagination, au fond.')
ON CONFLICT DO NOTHING;

-- 5. Statuts de lecture (114)
INSERT INTO public.reading_status (id, user_id, book_id, status, finished_at, current_page, is_reread) VALUES
  ('eeeeeeee-eeee-eeee-eeee-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000001', 'read', '2026-03-26', 898, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000002', 'read', '2026-02-12', 577, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000003', 'read', '2025-11-05', 324, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000004', 'read', '2025-07-14', 123, true),
  ('eeeeeeee-eeee-eeee-eeee-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000005', 'read', '2026-01-08', 124, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000007', 'read', '2025-09-22', 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000009', 'read', NULL, 298, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000008', 'reading', NULL, 142, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000010', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '00000000-0000-0000-0000-000000000011', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000006', 'read', '2026-02-28', 256, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000007', 'read', '2025-12-15', 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000009', 'read', '2025-10-03', 298, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000001', 'read', '2025-08-20', 898, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000010', 'read', NULL, 260, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000011', 'read', '2025-05-11', 730, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000017', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000002', 'reading', NULL, 312, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000018', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000003', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000019', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '00000000-0000-0000-0000-000000000005', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000003', 'read', '2026-03-01', 324, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000004', 'read', '2025-11-30', 123, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000022', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000008', 'read', '2026-01-22', 308, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000023', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000012', 'read', NULL, 160, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000024', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000010', 'read', '2025-09-09', 260, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000025', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000001', 'reading', NULL, 487, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000026', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000002', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000027', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '00000000-0000-0000-0000-000000000007', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000028', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000004', 'read', '2025-06-15', 123, true),
  ('eeeeeeee-eeee-eeee-eeee-000000000029', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000005', 'read', '2025-10-28', 124, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000030', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000008', 'read', '2026-02-03', 308, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000031', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000007', 'read', NULL, 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000032', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000001', 'read', '2025-04-12', 898, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000033', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000009', 'reading', NULL, 88, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000034', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '00000000-0000-0000-0000-000000000003', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000035', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000001', 'read', '2026-03-10', 898, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000036', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000005', 'read', '2025-12-28', 124, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000037', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000007', 'read', '2025-08-05', 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000038', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000010', 'read', '2026-01-14', 260, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000039', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000002', 'read', NULL, 577, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000040', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000008', 'reading', NULL, 201, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000041', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '00000000-0000-0000-0000-000000000009', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000042', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000004', 'read', '2024-11-11', 123, true),
  ('eeeeeeee-eeee-eeee-eeee-000000000043', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000008', 'read', '2025-03-15', 308, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000044', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000006', 'read', '2025-07-22', 256, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000045', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000011', 'read', NULL, 730, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000046', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000002', 'read', '2024-10-08', 577, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000047', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000009', 'read', '2025-11-19', 298, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000048', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000007', 'reading', NULL, 92, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000049', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '00000000-0000-0000-0000-000000000003', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000050', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000003', 'read', '2026-02-18', 324, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000051', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000006', 'read', '2025-09-30', 256, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000052', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000009', 'read', '2026-01-05', 298, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000053', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000012', 'read', '2025-06-14', 160, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000054', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000002', 'read', NULL, 577, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000055', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000001', 'reading', NULL, 234, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000056', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000010', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000057', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '00000000-0000-0000-0000-000000000005', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000058', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000007', 'read', '2025-10-17', 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000059', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000009', 'read', '2026-02-25', 298, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000060', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000012', 'read', '2025-07-08', 160, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000061', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000001', 'read', NULL, 898, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000062', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000004', 'read', '2025-12-01', 123, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000063', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000008', 'reading', NULL, 76, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000064', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '00000000-0000-0000-0000-000000000010', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000065', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000007', 'read', '2026-01-30', 174, true),
  ('eeeeeeee-eeee-eeee-eeee-000000000066', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000005', 'read', '2025-11-12', 124, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000067', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000010', 'read', '2025-08-27', 260, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000068', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000009', 'read', NULL, 298, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000069', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000002', 'read', '2025-04-19', 577, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000070', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000006', 'reading', NULL, 118, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000071', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000001', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000072', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', '00000000-0000-0000-0000-000000000003', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000073', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000007', 'read', '2026-03-05', 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000074', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000011', 'read', NULL, 730, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000075', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000001', 'read', '2025-09-14', 898, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000076', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000002', 'read', '2025-12-22', 577, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000077', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000005', 'reading', NULL, 67, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000078', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000010', '00000000-0000-0000-0000-000000000009', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000079', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000004', 'read', '2026-01-20', 123, true),
  ('eeeeeeee-eeee-eeee-eeee-000000000080', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000007', 'read', '2025-10-08', 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000081', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000003', 'read', '2025-07-30', 324, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000082', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000008', 'read', '2025-12-14', 308, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000083', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000002', 'read', NULL, 577, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000084', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000009', 'reading', NULL, 155, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000085', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', '00000000-0000-0000-0000-000000000001', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000086', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000004', 'read', '2026-02-08', 123, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000087', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000012', 'read', '2025-11-25', 160, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000088', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000008', 'read', '2026-01-03', 308, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000089', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000007', 'read', NULL, 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000090', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000005', 'read', '2025-08-18', 124, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000091', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000001', 'reading', NULL, 156, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000092', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012', '00000000-0000-0000-0000-000000000009', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000093', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000009', 'read', '2026-03-14', 298, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000094', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000002', 'read', '2025-10-22', 577, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000095', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000001', 'read', '2025-06-07', 898, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000096', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000003', 'read', NULL, 324, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000097', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000007', 'read', '2025-12-30', 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000098', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000010', 'reading', NULL, 134, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000099', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', '00000000-0000-0000-0000-000000000005', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000100', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000004', 'read', '2026-02-20', 123, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000101', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000010', 'read', '2025-12-10', 260, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000102', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000005', 'read', '2026-01-28', 124, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000103', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000002', 'read', NULL, 577, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000104', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000007', 'read', '2025-11-03', 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000105', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000001', 'reading', NULL, 89, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000106', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000008', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000107', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', '00000000-0000-0000-0000-000000000009', 'want_to_read', NULL, 0, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000108', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000007', 'read', '2026-03-18', 174, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000109', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000003', 'read', '2026-01-12', 324, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000110', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000008', 'read', NULL, 308, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000111', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000004', 'read', '2025-09-05', 123, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000112', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000010', 'read', '2025-07-19', 260, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000113', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000005', 'reading', NULL, 58, false),
  ('eeeeeeee-eeee-eeee-eeee-000000000114', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000015', '00000000-0000-0000-0000-000000000001', 'want_to_read', NULL, 0, false)
ON CONFLICT DO NOTHING;

-- 6. Listes (10)
INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'Amérique latine, fantômes et poussière', 'Les romans qui sentent la terre sèche et les morts qui parlent.', true, true)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000001', '00000000-0000-0000-0000-000000000005', 1),
  ('ffffffff-ffff-ffff-ffff-000000000001', '00000000-0000-0000-0000-000000000001', 2),
  ('ffffffff-ffff-ffff-ffff-000000000001', '00000000-0000-0000-0000-000000000002', 3),
  ('ffffffff-ffff-ffff-ffff-000000000001', '00000000-0000-0000-0000-000000000007', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 'L''absurde et moi', NULL, true, false)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000002', '00000000-0000-0000-0000-000000000004', 1),
  ('ffffffff-ffff-ffff-ffff-000000000002', '00000000-0000-0000-0000-000000000008', 2),
  ('ffffffff-ffff-ffff-ffff-000000000002', '00000000-0000-0000-0000-000000000006', 3),
  ('ffffffff-ffff-ffff-ffff-000000000002', '00000000-0000-0000-0000-000000000011', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', 'Moins de 200 pages, impact maximal', 'Pour ceux qui disent qu''ils n''ont pas le temps de lire.', true, true)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000003', '00000000-0000-0000-0000-000000000004', 1),
  ('ffffffff-ffff-ffff-ffff-000000000003', '00000000-0000-0000-0000-000000000005', 2),
  ('ffffffff-ffff-ffff-ffff-000000000003', '00000000-0000-0000-0000-000000000007', 3),
  ('ffffffff-ffff-ffff-ffff-000000000003', '00000000-0000-0000-0000-000000000012', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', 'La mémoire comme territoire', 'Des livres qui fouillent dans ce qu''on préférerait oublier.', true, false)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000004', '00000000-0000-0000-0000-000000000009', 1),
  ('ffffffff-ffff-ffff-ffff-000000000004', '00000000-0000-0000-0000-000000000003', 2),
  ('ffffffff-ffff-ffff-ffff-000000000004', '00000000-0000-0000-0000-000000000008', 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', 'Métafiction et jeux de miroirs', NULL, true, true)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000005', '00000000-0000-0000-0000-000000000007', 1),
  ('ffffffff-ffff-ffff-ffff-000000000005', '00000000-0000-0000-0000-000000000010', 2),
  ('ffffffff-ffff-ffff-ffff-000000000005', '00000000-0000-0000-0000-000000000011', 3),
  ('ffffffff-ffff-ffff-ffff-000000000005', '00000000-0000-0000-0000-000000000001', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011', 'Ce que je fais lire à mes terminales', 'Et pourquoi ils finissent toujours par aimer.', true, false)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000006', '00000000-0000-0000-0000-000000000004', 1),
  ('ffffffff-ffff-ffff-ffff-000000000006', '00000000-0000-0000-0000-000000000008', 2),
  ('ffffffff-ffff-ffff-ffff-000000000006', '00000000-0000-0000-0000-000000000007', 3),
  ('ffffffff-ffff-ffff-ffff-000000000006', '00000000-0000-0000-0000-000000000003', 4),
  ('ffffffff-ffff-ffff-ffff-000000000006', '00000000-0000-0000-0000-000000000005', 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000013', 'Livres pour voyager sans bouger', 'Ma liste de chevet pour les nuits sans sommeil.', true, false)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000007', '00000000-0000-0000-0000-000000000009', 1),
  ('ffffffff-ffff-ffff-ffff-000000000007', '00000000-0000-0000-0000-000000000002', 2),
  ('ffffffff-ffff-ffff-ffff-000000000007', '00000000-0000-0000-0000-000000000010', 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', 'Les incontournables selon moi', NULL, true, true)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000008', '00000000-0000-0000-0000-000000000001', 1),
  ('ffffffff-ffff-ffff-ffff-000000000008', '00000000-0000-0000-0000-000000000005', 2),
  ('ffffffff-ffff-ffff-ffff-000000000008', '00000000-0000-0000-0000-000000000007', 3),
  ('ffffffff-ffff-ffff-ffff-000000000008', '00000000-0000-0000-0000-000000000010', 4),
  ('ffffffff-ffff-ffff-ffff-000000000008', '00000000-0000-0000-0000-000000000009', 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', 'Reporters et écrivains qui ont tout compris', 'Des livres qui auraient pu être des reportages.', true, false)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000009', '00000000-0000-0000-0000-000000000008', 1),
  ('ffffffff-ffff-ffff-ffff-000000000009', '00000000-0000-0000-0000-000000000009', 2),
  ('ffffffff-ffff-ffff-ffff-000000000009', '00000000-0000-0000-0000-000000000012', 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.lists (id, user_id, title, description, is_public, is_ranked) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000014', 'Mes premières grandes claques littéraires', 'Lu cette année, souvenir pour toujours.', true, false)
ON CONFLICT DO NOTHING;
INSERT INTO public.list_items (list_id, book_id, position) VALUES
  ('ffffffff-ffff-ffff-ffff-000000000010', '00000000-0000-0000-0000-000000000004', 1),
  ('ffffffff-ffff-ffff-ffff-000000000010', '00000000-0000-0000-0000-000000000005', 2),
  ('ffffffff-ffff-ffff-ffff-000000000010', '00000000-0000-0000-0000-000000000007', 3),
  ('ffffffff-ffff-ffff-ffff-000000000010', '00000000-0000-0000-0000-000000000002', 4)
ON CONFLICT DO NOTHING;

