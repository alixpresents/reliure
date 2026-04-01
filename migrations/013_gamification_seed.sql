-- Seed badges de départ (séparé de 012 pour éviter "unsafe use of new enum value in same transaction")

insert into public.badge_definitions (id, name, description, category, icon, points, sort_order) values
  ('first_book',      'Premier livre',       'Tu as terminé ton premier livre',               'lecture',       '📖', 50,  1),
  ('ten_books',       '10 livres',           'Tu as terminé 10 livres',                       'lecture',       '🎯', 100, 2),
  ('fifty_books',     '50 livres',           'Tu as terminé 50 livres',                       'lecture',       '🏆', 500, 3),
  ('first_review',    'Première critique',   'Tu as écrit ta première critique',              'contribution',  '✍️', 50,  10),
  ('ten_reviews',     '10 critiques',        'Tu as écrit 10 critiques',                      'contribution',  '📝', 150, 11),
  ('first_quote',     'Première citation',   'Tu as sauvegardé ta première citation',         'contribution',  '💬', 30,  20),
  ('first_list',      'Première liste',      'Tu as créé ta première liste',                  'contribution',  '📋', 30,  21),
  ('first_follow',    'Premier abonnement',  'Tu t''es abonné à quelqu''un',                  'social',        '🤝', 20,  30),
  ('ten_followers',   '10 abonnés',          'Tu as 10 abonnés',                              'social',        '⭐', 100, 31),
  ('year_review',     'Bilan annuel',        'Tu as débloqué ton bilan de l''année',          'lecture',       '🗓️', 75,  4),
  ('speed_reader',    'Lecteur rapide',      '5 livres en un mois',                           'lecture',       '⚡', 100, 5),
  ('night_owl',       'Hibou',               'Tu lis tard le soir',                           'special',       '🦉', 50,  50),
  ('early_bird',      'Lève-tôt',            'Tu lis tôt le matin',                           'special',       '🌅', 50,  51),
  ('completionist',   'Perfectionniste',     'Tu as noté tous tes livres lus',                'lecture',       '💯', 100, 6),
  ('polyglotte',      'Polyglotte',          'Tu as lu dans 3 langues différentes',           'special',       '🌍', 150, 52)
on conflict (id) do nothing;
