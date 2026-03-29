// ═══════════════════════════════════════════════
// Client-side search suggestions for popular books
// ═══════════════════════════════════════════════
// Provides instant prefix-matching before the Google Books API call.
// When a suggestion matches, the full canonical title is used as the
// API query — which dramatically improves results for partial inputs
// like "harry p" → "Harry Potter" or "belle du sei" → "Belle du Seigneur".

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ── Curated list of popular books ──
// Each entry: { title, author } — title is the canonical search-friendly form.
const POPULAR_BOOKS = [
  // ── Harry Potter ──
  { title: "Harry Potter à l'école des sorciers", author: "J.K. Rowling" },
  { title: "Harry Potter et la chambre des secrets", author: "J.K. Rowling" },
  { title: "Harry Potter et le prisonnier d'Azkaban", author: "J.K. Rowling" },
  { title: "Harry Potter et la coupe de feu", author: "J.K. Rowling" },
  { title: "Harry Potter et l'ordre du phénix", author: "J.K. Rowling" },
  { title: "Harry Potter et le prince de sang-mêlé", author: "J.K. Rowling" },
  { title: "Harry Potter et les reliques de la mort", author: "J.K. Rowling" },

  // ── Grandes séries ──
  { title: "Hunger Games", author: "Suzanne Collins" },
  { title: "Twilight", author: "Stephenie Meyer" },
  { title: "Divergente", author: "Veronica Roth" },
  { title: "Le Labyrinthe", author: "James Dashner" },
  { title: "Percy Jackson", author: "Rick Riordan" },
  { title: "Le Seigneur des anneaux", author: "J.R.R. Tolkien" },
  { title: "Le Hobbit", author: "J.R.R. Tolkien" },
  { title: "Le Silmarillion", author: "J.R.R. Tolkien" },
  { title: "Dune", author: "Frank Herbert" },
  { title: "Fondation", author: "Isaac Asimov" },
  { title: "Le Trône de fer", author: "George R.R. Martin" },
  { title: "Eragon", author: "Christopher Paolini" },
  { title: "À la croisée des mondes", author: "Philip Pullman" },
  { title: "Narnia", author: "C.S. Lewis" },
  { title: "Le Monde de Sophie", author: "Jostein Gaarder" },

  // ── Classiques français ──
  { title: "L'Étranger", author: "Albert Camus" },
  { title: "La Peste", author: "Albert Camus" },
  { title: "La Chute", author: "Albert Camus" },
  { title: "Le Mythe de Sisyphe", author: "Albert Camus" },
  { title: "Le Premier Homme", author: "Albert Camus" },
  { title: "Madame Bovary", author: "Gustave Flaubert" },
  { title: "L'Éducation sentimentale", author: "Gustave Flaubert" },
  { title: "Les Fleurs du mal", author: "Charles Baudelaire" },
  { title: "Les Misérables", author: "Victor Hugo" },
  { title: "Notre-Dame de Paris", author: "Victor Hugo" },
  { title: "Le Père Goriot", author: "Honoré de Balzac" },
  { title: "Germinal", author: "Émile Zola" },
  { title: "Au bonheur des dames", author: "Émile Zola" },
  { title: "Du côté de chez Swann", author: "Marcel Proust" },
  { title: "À la recherche du temps perdu", author: "Marcel Proust" },
  { title: "Le Petit Prince", author: "Antoine de Saint-Exupéry" },
  { title: "Voyage au bout de la nuit", author: "Louis-Ferdinand Céline" },
  { title: "Belle du Seigneur", author: "Albert Cohen" },
  { title: "Solal", author: "Albert Cohen" },
  { title: "Les Nourritures terrestres", author: "André Gide" },
  { title: "La Nausée", author: "Jean-Paul Sartre" },
  { title: "Huis clos", author: "Jean-Paul Sartre" },
  { title: "L'Écume des jours", author: "Boris Vian" },
  { title: "Cyrano de Bergerac", author: "Edmond Rostand" },
  { title: "Le Comte de Monte-Cristo", author: "Alexandre Dumas" },
  { title: "Les Trois Mousquetaires", author: "Alexandre Dumas" },
  { title: "Candide", author: "Voltaire" },
  { title: "Les Liaisons dangereuses", author: "Choderlos de Laclos" },
  { title: "Bel-Ami", author: "Guy de Maupassant" },
  { title: "La Princesse de Clèves", author: "Madame de Lafayette" },
  { title: "Le Rouge et le Noir", author: "Stendhal" },
  { title: "La Chartreuse de Parme", author: "Stendhal" },

  // ── Classiques étrangers ──
  { title: "1984", author: "George Orwell" },
  { title: "Le Meilleur des mondes", author: "Aldous Huxley" },
  { title: "Fahrenheit 451", author: "Ray Bradbury" },
  { title: "Orgueil et Préjugés", author: "Jane Austen" },
  { title: "Jane Eyre", author: "Charlotte Brontë" },
  { title: "Les Hauts de Hurle-Vent", author: "Emily Brontë" },
  { title: "Gatsby le Magnifique", author: "F. Scott Fitzgerald" },
  { title: "Sur la route", author: "Jack Kerouac" },
  { title: "L'Attrape-cœurs", author: "J.D. Salinger" },
  { title: "Crime et Châtiment", author: "Fiodor Dostoïevski" },
  { title: "Les Frères Karamazov", author: "Fiodor Dostoïevski" },
  { title: "Anna Karénine", author: "Léon Tolstoï" },
  { title: "Guerre et Paix", author: "Léon Tolstoï" },
  { title: "Le Procès", author: "Franz Kafka" },
  { title: "La Métamorphose", author: "Franz Kafka" },
  { title: "Le Château", author: "Franz Kafka" },
  { title: "Cent ans de solitude", author: "Gabriel García Márquez" },
  { title: "L'Amour aux temps du choléra", author: "Gabriel García Márquez" },
  { title: "2666", author: "Roberto Bolaño" },
  { title: "Les Détectives sauvages", author: "Roberto Bolaño" },
  { title: "Don Quichotte", author: "Miguel de Cervantes" },
  { title: "Moby Dick", author: "Herman Melville" },
  { title: "Ulysse", author: "James Joyce" },
  { title: "Mrs Dalloway", author: "Virginia Woolf" },
  { title: "Le Vieil Homme et la Mer", author: "Ernest Hemingway" },
  { title: "Ne tirez pas sur l'oiseau moqueur", author: "Harper Lee" },
  { title: "Sa Majesté des mouches", author: "William Golding" },
  { title: "Le Portrait de Dorian Gray", author: "Oscar Wilde" },
  { title: "Dracula", author: "Bram Stoker" },
  { title: "Frankenstein", author: "Mary Shelley" },
  { title: "Les Aventures de Sherlock Holmes", author: "Arthur Conan Doyle" },

  // ── Contemporain français populaire ──
  { title: "La Vérité sur l'affaire Harry Quebert", author: "Joël Dicker" },
  { title: "L'Énigme de la chambre 622", author: "Joël Dicker" },
  { title: "Chanson douce", author: "Leïla Slimani" },
  { title: "Le Pays des autres", author: "Leïla Slimani" },
  { title: "Vernon Subutex", author: "Virginie Despentes" },
  { title: "L'Anomalie", author: "Hervé Le Tellier" },
  { title: "Au revoir là-haut", author: "Pierre Lemaitre" },
  { title: "Couleurs de l'incendie", author: "Pierre Lemaitre" },
  { title: "La Carte et le Territoire", author: "Michel Houellebecq" },
  { title: "Les Particules élémentaires", author: "Michel Houellebecq" },
  { title: "Extension du domaine de la lutte", author: "Michel Houellebecq" },
  { title: "Anéantir", author: "Michel Houellebecq" },
  { title: "L'Élégance du hérisson", author: "Muriel Barbery" },
  { title: "Bonjour tristesse", author: "Françoise Sagan" },
  { title: "La Promesse de l'aube", author: "Romain Gary" },
  { title: "La Vie devant soi", author: "Romain Gary" },
  { title: "L'Amie prodigieuse", author: "Elena Ferrante" },
  { title: "Ensemble, c'est tout", author: "Anna Gavalda" },
  { title: "Juste après la fin du monde", author: "Jean-Luc Lagarce" },
  { title: "En attendant Bojangles", author: "Olivier Bourdeaut" },
  { title: "La Délicatesse", author: "David Foenkinos" },
  { title: "Charlotte", author: "David Foenkinos" },
  { title: "Petit pays", author: "Gaël Faye" },
  { title: "Leurs enfants après eux", author: "Nicolas Mathieu" },
  { title: "Connemara", author: "Nicolas Mathieu" },

  // ── Essais & non-fiction populaire ──
  { title: "Sapiens", author: "Yuval Noah Harari" },
  { title: "21 leçons pour le XXIe siècle", author: "Yuval Noah Harari" },
  { title: "Devenir", author: "Michelle Obama" },
  { title: "Éduquer sans punir", author: "Thomas Gordon" },
  { title: "Le Pouvoir du moment présent", author: "Eckhart Tolle" },

  // ── Manga & BD populaires ──
  { title: "One Piece", author: "Eiichiro Oda" },
  { title: "Naruto", author: "Masashi Kishimoto" },
  { title: "Dragon Ball", author: "Akira Toriyama" },
  { title: "L'Attaque des Titans", author: "Hajime Isayama" },
  { title: "Death Note", author: "Tsugumi Ohba" },
  { title: "Jujutsu Kaisen", author: "Gege Akutami" },
  { title: "Demon Slayer", author: "Koyoharu Gotouge" },
  { title: "My Hero Academia", author: "Kohei Horikoshi" },
  { title: "Chainsaw Man", author: "Tatsuki Fujimoto" },
  { title: "Astérix", author: "René Goscinny" },
  { title: "Tintin", author: "Hergé" },
  { title: "Le Chat du Rabbin", author: "Joann Sfar" },
  { title: "Persepolis", author: "Marjane Satrapi" },

  // ── Littérature jeunesse ──
  { title: "Le Petit Nicolas", author: "René Goscinny" },
  { title: "L'Œil du loup", author: "Daniel Pennac" },
  { title: "Kamo", author: "Daniel Pennac" },
  { title: "Le Passeur", author: "Lois Lowry" },
  { title: "Wonder", author: "R.J. Palacio" },
  { title: "Matilda", author: "Roald Dahl" },
  { title: "Charlie et la chocolaterie", author: "Roald Dahl" },

  // ── Prix littéraires récents ──
  { title: "Veiller sur elle", author: "Jean-Baptiste Andrea" },
  { title: "Jacaranda", author: "Gaël Faye" },
  { title: "Triste tigre", author: "Neige Sinno" },
  { title: "Sympathie pour le fantôme", author: "Antoine Wauters" },
  { title: "Le Mage du Kremlin", author: "Giuliano da Empoli" },
  { title: "S'adapter", author: "Clara Dupont-Monod" },
  { title: "Ultramarins", author: "Mariette Navarro" },
  { title: "Houris", author: "Kamel Daoud" },
];

/**
 * Match a user query against the curated suggestions list.
 * Supports prefix matching across word boundaries:
 *   "harry p" → "Harry Potter à l'école des sorciers"
 *   "belle du sei" → "Belle du Seigneur"
 */
function matchesSuggestion(query, book) {
  const q = stripAccents(query.toLowerCase().trim());
  const title = stripAccents(book.title.toLowerCase());
  const author = stripAccents(book.author.toLowerCase());

  // Exact start of title
  if (title.startsWith(q)) return true;

  // Exact start of author
  if (author.startsWith(q)) return true;

  // Word-prefix matching: each query word matches the start of the
  // corresponding title/author word. "harry p" → ["harry", "p"] matches
  // ["harry", "potter", ...] because "harry"="harry" and "p" starts "potter"
  const qWords = q.split(/\s+/);
  if (qWords.length >= 2) {
    const titleWords = title.split(/\s+/);
    const authorWords = author.split(/\s+/);

    const matchesWordSequence = (source) => {
      if (qWords.length > source.length) return false;
      return qWords.every((qw, i) => source[i].startsWith(qw));
    };

    if (matchesWordSequence(titleWords)) return true;
    if (matchesWordSequence(authorWords)) return true;

    // Also try matching across title+author: "flaubert bov" → "gustave flaubert" no,
    // but "madame b" → "madame bovary" yes. Already covered by titleWords.
  }

  return false;
}

/**
 * Get the best suggestion for a query.
 * Returns the canonical title to use as the API query, or null if no match.
 */
export function getSuggestion(query) {
  if (!query || query.length < 3) return null;

  const matches = POPULAR_BOOKS.filter(book => matchesSuggestion(query, book));
  if (matches.length === 0) return null;

  // Return the shortest title (most likely the canonical/base entry)
  matches.sort((a, b) => a.title.length - b.title.length);
  return matches[0].title;
}
