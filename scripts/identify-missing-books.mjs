#!/usr/bin/env node

/**
 * Identifie les livres manquants les plus recherchés.
 *
 * Sources :
 * A. search_cache (queries réelles des utilisateurs)
 * B. Liste curatée de ~200 livres francophones incontournables
 *
 * Génère : reports/missing-books.json
 *
 * Usage: node scripts/identify-missing-books.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  let vars = {};
  try {
    const raw = readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const cleaned = line.replace(/^export\s+/, "").trim();
      if (!cleaned || cleaned.startsWith("#")) continue;
      const eq = cleaned.indexOf("=");
      if (eq < 0) continue;
      vars[cleaned.slice(0, eq).trim()] = cleaned.slice(eq + 1).trim();
    }
  } catch {}
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing env"); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const C = {
  reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", dim: "\x1b[2m", bold: "\x1b[1m", cyan: "\x1b[36m",
};

function norm(s) {
  return (s || "")
    .replace(/[\u2018\u2019\u201A\u2039\u203A''`]/g, " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function titleMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════
// Curated list (~200 livres francophones)
// ISBN = édition poche FR (Folio, LdP, Points) quand connu
// ═══════════════════════════════════════════════

const CURATED = [
  // ─── Classiques français (50) ───
  { title: "Madame Bovary", author: "Gustave Flaubert", isbn13: "9782070413119", category: "classiques_fr" },
  { title: "Germinal", author: "Émile Zola", isbn13: "9782070409228", category: "classiques_fr" },
  { title: "Le Rouge et le Noir", author: "Stendhal", isbn13: "9782070411634", category: "classiques_fr" },
  { title: "Les Fleurs du mal", author: "Charles Baudelaire", isbn13: "9782070411795", category: "classiques_fr" },
  { title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", isbn13: "9782070612758", category: "classiques_fr" },
  { title: "L'Étranger", author: "Albert Camus", isbn13: "9782070360024", category: "classiques_fr" },
  { title: "La Peste", author: "Albert Camus", isbn13: "9782070360420", category: "classiques_fr" },
  { title: "Les Misérables", author: "Victor Hugo", isbn13: "9782253096344", category: "classiques_fr" },
  { title: "Le Comte de Monte-Cristo", author: "Alexandre Dumas", isbn13: "9782253098058", category: "classiques_fr" },
  { title: "Les Trois Mousquetaires", author: "Alexandre Dumas", isbn13: "9782070411214", category: "classiques_fr" },
  { title: "Bel-Ami", author: "Guy de Maupassant", isbn13: "9782070411443", category: "classiques_fr" },
  { title: "Candide", author: "Voltaire", isbn13: "9782070411580", category: "classiques_fr" },
  { title: "Les Liaisons dangereuses", author: "Choderlos de Laclos", isbn13: "9782070413027", category: "classiques_fr" },
  { title: "Cyrano de Bergerac", author: "Edmond Rostand", isbn13: "9782070412228", category: "classiques_fr" },
  { title: "Le Père Goriot", author: "Honoré de Balzac", isbn13: "9782070409341", category: "classiques_fr" },
  { title: "Nana", author: "Émile Zola", isbn13: "9782070409235", category: "classiques_fr" },
  { title: "L'Assommoir", author: "Émile Zola", isbn13: "9782070409211", category: "classiques_fr" },
  { title: "Notre-Dame de Paris", author: "Victor Hugo", isbn13: "9782253009887", category: "classiques_fr" },
  { title: "Du côté de chez Swann", author: "Marcel Proust", isbn13: "9782070413799", category: "classiques_fr" },
  { title: "Les Contemplations", author: "Victor Hugo", isbn13: "9782253014652", category: "classiques_fr" },
  { title: "Thérèse Raquin", author: "Émile Zola", isbn13: "9782070411290", category: "classiques_fr" },
  { title: "Bouvard et Pécuchet", author: "Gustave Flaubert", isbn13: "9782070362998", category: "classiques_fr" },
  { title: "L'Éducation sentimentale", author: "Gustave Flaubert", isbn13: "9782070413690", category: "classiques_fr" },
  { title: "Les Rêveries du promeneur solitaire", author: "Jean-Jacques Rousseau", isbn13: "9782070362585", category: "classiques_fr" },
  { title: "Les Confessions", author: "Jean-Jacques Rousseau", isbn13: "9782070362080", category: "classiques_fr" },
  { title: "Mémoires d'outre-tombe", author: "François-René de Chateaubriand", isbn13: null, category: "classiques_fr" },
  { title: "La Princesse de Clèves", author: "Madame de La Fayette", isbn13: "9782070411634", category: "classiques_fr" },
  { title: "Le Malade imaginaire", author: "Molière", isbn13: "9782070449828", category: "classiques_fr" },
  { title: "Tartuffe", author: "Molière", isbn13: null, category: "classiques_fr" },
  { title: "Phèdre", author: "Jean Racine", isbn13: null, category: "classiques_fr" },
  { title: "Les Essais", author: "Michel de Montaigne", isbn13: null, category: "classiques_fr" },
  { title: "Manon Lescaut", author: "Abbé Prévost", isbn13: "9782070411122", category: "classiques_fr" },
  { title: "Jacques le Fataliste", author: "Denis Diderot", isbn13: "9782070364817", category: "classiques_fr" },
  { title: "La Religieuse", author: "Denis Diderot", isbn13: "9782070362974", category: "classiques_fr" },
  { title: "Le Horla", author: "Guy de Maupassant", isbn13: "9782070411405", category: "classiques_fr" },
  { title: "Une vie", author: "Guy de Maupassant", isbn13: "9782070411429", category: "classiques_fr" },
  { title: "Au bonheur des dames", author: "Émile Zola", isbn13: "9782253004226", category: "classiques_fr" },
  { title: "La Chartreuse de Parme", author: "Stendhal", isbn13: "9782070411610", category: "classiques_fr" },
  { title: "Illusions perdues", author: "Honoré de Balzac", isbn13: "9782070409372", category: "classiques_fr" },
  { title: "Les Caractères", author: "Jean de La Bruyère", isbn13: null, category: "classiques_fr" },
  { title: "Zadig", author: "Voltaire", isbn13: "9782070411597", category: "classiques_fr" },
  { title: "Micromégas", author: "Voltaire", isbn13: null, category: "classiques_fr" },
  { title: "La Peau de chagrin", author: "Honoré de Balzac", isbn13: "9782070411337", category: "classiques_fr" },
  { title: "Eugénie Grandet", author: "Honoré de Balzac", isbn13: "9782070409365", category: "classiques_fr" },
  { title: "Le Ventre de Paris", author: "Émile Zola", isbn13: null, category: "classiques_fr" },
  { title: "La Bête humaine", author: "Émile Zola", isbn13: "9782253004233", category: "classiques_fr" },
  { title: "Colomba", author: "Prosper Mérimée", isbn13: null, category: "classiques_fr" },
  { title: "Carmen", author: "Prosper Mérimée", isbn13: "9782070411139", category: "classiques_fr" },
  { title: "Le Lys dans la vallée", author: "Honoré de Balzac", isbn13: null, category: "classiques_fr" },
  { title: "La Modification", author: "Michel Butor", isbn13: "9782707301734", category: "classiques_fr" },

  // ─── Littérature contemporaine FR (50) ───
  { title: "Anéantir", author: "Michel Houellebecq", isbn13: "9782081510241", category: "contemporain_fr" },
  { title: "L'Anomalie", author: "Hervé Le Tellier", isbn13: "9782072887994", category: "contemporain_fr" },
  { title: "Chanson douce", author: "Leïla Slimani", isbn13: "9782072681578", category: "contemporain_fr" },
  { title: "Vernon Subutex 1", author: "Virginie Despentes", isbn13: "9782246855712", category: "contemporain_fr" },
  { title: "La Carte et le Territoire", author: "Michel Houellebecq", isbn13: "9782290034545", category: "contemporain_fr" },
  { title: "Soumission", author: "Michel Houellebecq", isbn13: "9782081354807", category: "contemporain_fr" },
  { title: "Les Particules élémentaires", author: "Michel Houellebecq", isbn13: "9782290028933", category: "contemporain_fr" },
  { title: "Extension du domaine de la lutte", author: "Michel Houellebecq", isbn13: "9782290050613", category: "contemporain_fr" },
  { title: "Sérotonine", author: "Michel Houellebecq", isbn13: "9782081471757", category: "contemporain_fr" },
  { title: "L'Amie prodigieuse", author: "Elena Ferrante", isbn13: "9782070466207", category: "contemporain_fr" },
  { title: "Boussole", author: "Mathias Énard", isbn13: "9782330066734", category: "contemporain_fr" },
  { title: "Leurs enfants après eux", author: "Nicolas Mathieu", isbn13: "9782330108830", category: "contemporain_fr" },
  { title: "Civilizations", author: "Laurent Binet", isbn13: "9782253074472", category: "contemporain_fr" },
  { title: "HHhH", author: "Laurent Binet", isbn13: "9782253134497", category: "contemporain_fr" },
  { title: "L'Art de perdre", author: "Alice Zeniter", isbn13: "9782081435865", category: "contemporain_fr" },
  { title: "La Nuit du renard", author: "Mary Higgins Clark", isbn13: null, category: "contemporain_fr" },
  { title: "Au revoir là-haut", author: "Pierre Lemaitre", isbn13: "9782253194613", category: "contemporain_fr" },
  { title: "Couleurs de l'incendie", author: "Pierre Lemaitre", isbn13: "9782253237310", category: "contemporain_fr" },
  { title: "Miroir de nos peines", author: "Pierre Lemaitre", isbn13: "9782253243359", category: "contemporain_fr" },
  { title: "La Vérité sur l'affaire Harry Quebert", author: "Joël Dicker", isbn13: "9782253178187", category: "contemporain_fr" },
  { title: "Le Livre des Baltimore", author: "Joël Dicker", isbn13: "9782253066552", category: "contemporain_fr" },
  { title: "L'Énigme de la chambre 622", author: "Joël Dicker", isbn13: "9782253080701", category: "contemporain_fr" },
  { title: "Stupeur et tremblements", author: "Amélie Nothomb", isbn13: "9782253150718", category: "contemporain_fr" },
  { title: "Hygiène de l'assassin", author: "Amélie Nothomb", isbn13: "9782253111184", category: "contemporain_fr" },
  { title: "La Promesse de l'aube", author: "Romain Gary", isbn13: "9782070363735", category: "contemporain_fr" },
  { title: "La Vie devant soi", author: "Romain Gary", isbn13: "9782070373628", category: "contemporain_fr" },
  { title: "Éducation européenne", author: "Romain Gary", isbn13: "9782070369478", category: "contemporain_fr" },
  { title: "Le Grand Monde", author: "Pierre Lemaitre", isbn13: null, category: "contemporain_fr" },
  { title: "Pas pleurer", author: "Lydie Salvayre", isbn13: "9782757849545", category: "contemporain_fr" },
  { title: "Trois jours et une vie", author: "Pierre Lemaitre", isbn13: "9782253088523", category: "contemporain_fr" },
  { title: "Petit Pays", author: "Gaël Faye", isbn13: "9782253070320", category: "contemporain_fr" },
  { title: "Le Lambeau", author: "Philippe Lançon", isbn13: "9782072689697", category: "contemporain_fr" },
  { title: "Naissance", author: "Yann Moix", isbn13: null, category: "contemporain_fr" },
  { title: "Tous les hommes n'habitent pas le monde de la même façon", author: "Jean-Paul Dubois", isbn13: "9782823615791", category: "contemporain_fr" },
  { title: "Le Plus Grand Menu du monde", author: "Hervé Le Tellier", isbn13: null, category: "contemporain_fr" },
  { title: "La Disparition de Stephanie Mailer", author: "Joël Dicker", isbn13: null, category: "contemporain_fr" },
  { title: "Constellation", author: "Adrien Bosc", isbn13: "9782253045472", category: "contemporain_fr" },
  { title: "Le Sermon sur la chute de Rome", author: "Jérôme Ferrari", isbn13: "9782330021061", category: "contemporain_fr" },
  { title: "S'adapter", author: "Clara Dupont-Monod", isbn13: "9782253082224", category: "contemporain_fr" },
  { title: "Vivre vite", author: "Brigitte Giraud", isbn13: "9782081524125", category: "contemporain_fr" },
  { title: "Veiller sur elle", author: "Jean-Baptiste Andrea", isbn13: null, category: "contemporain_fr" },
  { title: "Jacaranda", author: "Gaël Faye", isbn13: null, category: "contemporain_fr" },
  { title: "Triste tigre", author: "Neige Sinno", isbn13: null, category: "contemporain_fr" },
  { title: "Sympathie pour le diable", author: "Irène Némirovsky", isbn13: null, category: "contemporain_fr" },
  { title: "Suite française", author: "Irène Némirovsky", isbn13: "9782070340743", category: "contemporain_fr" },
  { title: "Le Bal", author: "Irène Némirovsky", isbn13: null, category: "contemporain_fr" },
  { title: "David Copperfield", author: "Charles Dickens", isbn13: null, category: "contemporain_fr" },
  { title: "Connemara", author: "Nicolas Mathieu", isbn13: "9782330170028", category: "contemporain_fr" },
  { title: "Les Choses humaines", author: "Karine Tuil", isbn13: "9782072849251", category: "contemporain_fr" },
  { title: "La Tresse", author: "Laetitia Colombani", isbn13: "9782253238089", category: "contemporain_fr" },

  // ─── Francophonie (20) ───
  { title: "Ru", author: "Kim Thúy", isbn13: null, category: "francophonie" },
  { title: "L'Énigme du retour", author: "Dany Laferrière", isbn13: "9782253156505", category: "francophonie" },
  { title: "Texaco", author: "Patrick Chamoiseau", isbn13: "9782070722006", category: "francophonie" },
  { title: "Le Chercheur d'os", author: "Tahar Djaout", isbn13: null, category: "francophonie" },
  { title: "Allah n'est pas obligé", author: "Ahmadou Kourouma", isbn13: "9782020525145", category: "francophonie" },
  { title: "L'Enfant noir", author: "Camara Laye", isbn13: "9782266231244", category: "francophonie" },
  { title: "Une si longue lettre", author: "Mariama Bâ", isbn13: null, category: "francophonie" },
  { title: "Monnè, outrages et défis", author: "Ahmadou Kourouma", isbn13: null, category: "francophonie" },
  { title: "Le Baobab fou", author: "Ken Bugul", isbn13: null, category: "francophonie" },
  { title: "Gouverneurs de la rosée", author: "Jacques Roumain", isbn13: null, category: "francophonie" },
  { title: "Les Soleils des indépendances", author: "Ahmadou Kourouma", isbn13: "9782020259019", category: "francophonie" },
  { title: "Mémoires de porc-épic", author: "Alain Mabanckou", isbn13: "9782757803684", category: "francophonie" },
  { title: "Petit piment", author: "Alain Mabanckou", isbn13: "9782757854488", category: "francophonie" },
  { title: "Verre Cassé", author: "Alain Mabanckou", isbn13: "9782020855068", category: "francophonie" },
  { title: "Trois femmes puissantes", author: "Marie NDiaye", isbn13: "9782070424368", category: "francophonie" },
  { title: "La Femme qui attendait", author: "Andreï Makine", isbn13: null, category: "francophonie" },
  { title: "Le Testament français", author: "Andreï Makine", isbn13: "9782070400553", category: "francophonie" },
  { title: "La Nuit sacrée", author: "Tahar Ben Jelloun", isbn13: "9782020126861", category: "francophonie" },
  { title: "L'Enfant de sable", author: "Tahar Ben Jelloun", isbn13: "9782020092302", category: "francophonie" },
  { title: "Le Passé devant soi", author: "Gilbert Gatore", isbn13: null, category: "francophonie" },

  // ─── Classiques internationaux traduits (30) ───
  { title: "Cent ans de solitude", author: "Gabriel García Márquez", isbn13: "9782020238113", category: "international_traduit" },
  { title: "1984", author: "George Orwell", isbn13: "9782070368228", category: "international_traduit" },
  { title: "Le Maître et Marguerite", author: "Mikhaïl Boulgakov", isbn13: "9782266284585", category: "international_traduit" },
  { title: "Kafka sur le rivage", author: "Haruki Murakami", isbn13: "9782264042156", category: "international_traduit" },
  { title: "1Q84", author: "Haruki Murakami", isbn13: "9782264056924", category: "international_traduit" },
  { title: "La Ferme des animaux", author: "George Orwell", isbn13: "9782070375165", category: "international_traduit" },
  { title: "Le Vieil Homme et la Mer", author: "Ernest Hemingway", isbn13: "9782070360079", category: "international_traduit" },
  { title: "L'Amour aux temps du choléra", author: "Gabriel García Márquez", isbn13: "9782253045076", category: "international_traduit" },
  { title: "Fahrenheit 451", author: "Ray Bradbury", isbn13: "9782070415731", category: "international_traduit" },
  { title: "Le Procès", author: "Franz Kafka", isbn13: "9782070411580", category: "international_traduit" },
  { title: "La Métamorphose", author: "Franz Kafka", isbn13: "9782070365376", category: "international_traduit" },
  { title: "Crime et Châtiment", author: "Fiodor Dostoïevski", isbn13: "9782253082583", category: "international_traduit" },
  { title: "Les Frères Karamazov", author: "Fiodor Dostoïevski", isbn13: "9782253041740", category: "international_traduit" },
  { title: "L'Idiot", author: "Fiodor Dostoïevski", isbn13: "9782253092476", category: "international_traduit" },
  { title: "Anna Karénine", author: "Léon Tolstoï", isbn13: "9782253098355", category: "international_traduit" },
  { title: "Guerre et Paix", author: "Léon Tolstoï", isbn13: "9782253098348", category: "international_traduit" },
  { title: "Don Quichotte", author: "Miguel de Cervantès", isbn13: null, category: "international_traduit" },
  { title: "L'Ombre du vent", author: "Carlos Ruiz Zafón", isbn13: "9782266154116", category: "international_traduit" },
  { title: "Le Nom de la rose", author: "Umberto Eco", isbn13: "9782253033134", category: "international_traduit" },
  { title: "Le Parfum", author: "Patrick Süskind", isbn13: "9782253044901", category: "international_traduit" },
  { title: "Lolita", author: "Vladimir Nabokov", isbn13: "9782070362233", category: "international_traduit" },
  { title: "Le Monde de Sophie", author: "Jostein Gaarder", isbn13: "9782020550765", category: "international_traduit" },
  { title: "Pedro Páramo", author: "Juan Rulfo", isbn13: "9782070411184", category: "international_traduit" },
  { title: "Les Versets sataniques", author: "Salman Rushdie", isbn13: null, category: "international_traduit" },
  { title: "Beloved", author: "Toni Morrison", isbn13: "9782264074720", category: "international_traduit" },
  { title: "L'Insoutenable Légèreté de l'être", author: "Milan Kundera", isbn13: "9782070381654", category: "international_traduit" },
  { title: "La Plaisanterie", author: "Milan Kundera", isbn13: "9782070384709", category: "international_traduit" },
  { title: "Le Seigneur des anneaux", author: "J.R.R. Tolkien", isbn13: null, category: "international_traduit" },
  { title: "Dune", author: "Frank Herbert", isbn13: "9782266320481", category: "international_traduit" },
  { title: "Ne tirez pas sur l'oiseau moqueur", author: "Harper Lee", isbn13: "9782253115847", category: "international_traduit" },

  // ─── Mangas / BD populaires (30) ───
  { title: "One Piece 1", author: "Eiichiro Oda", isbn13: "9782723488525", category: "mangas_bd" },
  { title: "Naruto 1", author: "Masashi Kishimoto", isbn13: "9782871293057", category: "mangas_bd" },
  { title: "Dragon Ball 1", author: "Akira Toriyama", isbn13: "9782723418546", category: "mangas_bd" },
  { title: "Jujutsu Kaisen 1", author: "Gege Akutami", isbn13: "9791032705179", category: "mangas_bd" },
  { title: "Chainsaw Man 1", author: "Tatsuki Fujimoto", isbn13: "9782889513796", category: "mangas_bd" },
  { title: "Spy×Family 1", author: "Tatsuya Endo", isbn13: "9782380710151", category: "mangas_bd" },
  { title: "Demon Slayer 1", author: "Koyoharu Gotouge", isbn13: "9791032702895", category: "mangas_bd" },
  { title: "L'Attaque des Titans 1", author: "Hajime Isayama", isbn13: "9782811607261", category: "mangas_bd" },
  { title: "My Hero Academia 1", author: "Kohei Horikoshi", isbn13: "9791032700310", category: "mangas_bd" },
  { title: "Death Note 1", author: "Tsugumi Ohba", isbn13: "9782505001560", category: "mangas_bd" },
  { title: "Fullmetal Alchemist 1", author: "Hiromu Arakawa", isbn13: "9782351421239", category: "mangas_bd" },
  { title: "Tokyo Ghoul 1", author: "Sui Ishida", isbn13: "9782344001585", category: "mangas_bd" },
  { title: "Hunter × Hunter 1", author: "Yoshihiro Togashi", isbn13: "9782505003137", category: "mangas_bd" },
  { title: "Berserk 1", author: "Kentaro Miura", isbn13: "9782723448017", category: "mangas_bd" },
  { title: "Vagabond 1", author: "Takehiko Inoue", isbn13: "9782845800069", category: "mangas_bd" },
  { title: "Slam Dunk 1", author: "Takehiko Inoue", isbn13: "9782505074854", category: "mangas_bd" },
  { title: "Bleach 1", author: "Tite Kubo", isbn13: "9782723443753", category: "mangas_bd" },
  { title: "One Punch Man 1", author: "ONE / Yusuke Murata", isbn13: "9782368520840", category: "mangas_bd" },
  { title: "Astérix le Gaulois", author: "René Goscinny", isbn13: "9782014001013", category: "mangas_bd" },
  { title: "Tintin au Tibet", author: "Hergé", isbn13: "9782203001190", category: "mangas_bd" },
  { title: "Le Chat du Rabbin 1", author: "Joann Sfar", isbn13: "9782205055658", category: "mangas_bd" },
  { title: "Persepolis", author: "Marjane Satrapi", isbn13: "9782844146793", category: "mangas_bd" },
  { title: "L'Arabe du futur 1", author: "Riad Sattouf", isbn13: "9782370730145", category: "mangas_bd" },
  { title: "Maus", author: "Art Spiegelman", isbn13: "9782080661418", category: "mangas_bd" },
  { title: "Le Monde sans fin", author: "Christophe Blain", isbn13: "9782205088168", category: "mangas_bd" },
  { title: "Les Vieux Fourneaux 1", author: "Wilfrid Lupano", isbn13: "9782205072921", category: "mangas_bd" },
  { title: "Solo Leveling 1", author: "Chugong", isbn13: "9791038107557", category: "mangas_bd" },
  { title: "Frieren 1", author: "Kanehito Yamada", isbn13: "9791041103348", category: "mangas_bd" },
  { title: "Blue Lock 1", author: "Muneyuki Kaneshiro", isbn13: "9791032710593", category: "mangas_bd" },
  { title: "Kaiju No. 8 1", author: "Naoya Matsumoto", isbn13: "9782889516728", category: "mangas_bd" },

  // ─── Essais / Non-fiction (20) ───
  { title: "Sapiens", author: "Yuval Noah Harari", isbn13: "9782226257017", category: "essais" },
  { title: "Le Deuxième Sexe", author: "Simone de Beauvoir", isbn13: "9782070323517", category: "essais" },
  { title: "Mythologies", author: "Roland Barthes", isbn13: "9782020027281", category: "essais" },
  { title: "La Société du spectacle", author: "Guy Debord", isbn13: "9782072681578", category: "essais" },
  { title: "Surveiller et punir", author: "Michel Foucault", isbn13: "9782070729685", category: "essais" },
  { title: "L'Être et le Néant", author: "Jean-Paul Sartre", isbn13: "9782070293889", category: "essais" },
  { title: "Tristes Tropiques", author: "Claude Lévi-Strauss", isbn13: "9782259228886", category: "essais" },
  { title: "Le Capital au XXIe siècle", author: "Thomas Piketty", isbn13: "9782021082289", category: "essais" },
  { title: "La Banalité du mal", author: "Hannah Arendt", isbn13: "9782070326211", category: "essais" },
  { title: "Les Naufragés", author: "Patrick Declerck", isbn13: "9782259198738", category: "essais" },
  { title: "La Nuit des prolétaires", author: "Jacques Rancière", isbn13: "9782213600697", category: "essais" },
  { title: "Homo Deus", author: "Yuval Noah Harari", isbn13: "9782226393876", category: "essais" },
  { title: "21 leçons pour le XXIe siècle", author: "Yuval Noah Harari", isbn13: "9782226436030", category: "essais" },
  { title: "La Part du colibri", author: "Pierre Rabhi", isbn13: null, category: "essais" },
  { title: "Indignez-vous !", author: "Stéphane Hessel", isbn13: "9791090354012", category: "essais" },
  { title: "No Logo", author: "Naomi Klein", isbn13: "9782742765270", category: "essais" },
  { title: "Le Mythe de Sisyphe", author: "Albert Camus", isbn13: "9782070322886", category: "essais" },
  { title: "L'Homme révolté", author: "Albert Camus", isbn13: "9782070323036", category: "essais" },
  { title: "La Haine de l'Occident", author: "Jean Ziegler", isbn13: null, category: "essais" },
  { title: "Éloge de la fuite", author: "Henri Laborit", isbn13: "9782070324415", category: "essais" },
];

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Identification des livres manquants             ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);

  // ═══ A. Analyse search_cache ═══
  console.log(`${C.bold}═══ A. Analyse search_cache ═══${C.reset}\n`);

  const { data: cache, error: cacheErr } = await supabase
    .from("search_cache")
    .select("query_normalized, hit_count, response")
    .order("hit_count", { ascending: false });

  if (cacheErr) {
    console.error("  Erreur cache:", cacheErr.message);
  }

  const cacheEntries = cache || [];
  const cacheMissing = [];

  for (const entry of cacheEntries) {
    const aiBooks = entry.response?.books || [];
    for (const book of aiBooks) {
      if (!book.title) continue;
      // Check in DB via search
      const { data: dbResults } = await supabase.rpc("search_books_v2", { q: book.title, n: 3 });
      const found = (dbResults || []).some(r => titleMatch(r.title, book.title));
      if (!found) {
        cacheMissing.push({
          title: book.title,
          author: book.author || null,
          isbn13: book.isbn13 || null,
          searchedCount: entry.hit_count,
          query: entry.query_normalized,
          source: "smart-search-cache",
        });
      }
      await sleep(100);
    }
  }

  // Dedupe cache missing by normalized title
  const seenTitles = new Set();
  const uniqueCacheMissing = cacheMissing.filter(b => {
    const k = norm(b.title);
    if (seenTitles.has(k)) return false;
    seenTitles.add(k);
    return true;
  });

  console.log(`  Entrées cache : ${cacheEntries.length}`);
  console.log(`  Livres IA non trouvés en base : ${C.bold}${uniqueCacheMissing.length}${C.reset}`);
  if (uniqueCacheMissing.length > 0) {
    console.log(`  ${C.dim}Top 10 :${C.reset}`);
    uniqueCacheMissing.slice(0, 10).forEach(b =>
      console.log(`    ${C.yellow}•${C.reset} "${b.title}" — ${b.author || "?"} ${C.dim}(cherché ${b.searchedCount}×)${C.reset}`)
    );
  }

  // ═══ B. Vérification liste curatée ═══
  console.log(`\n${C.bold}═══ B. Vérification liste curatée (${CURATED.length} livres) ═══${C.reset}\n`);

  const missing = [];
  const found = [];
  let checked = 0;

  for (const book of CURATED) {
    checked++;
    process.stdout.write(`\r  [${String(checked).padStart(3)}/${CURATED.length}] ${book.title.padEnd(45).slice(0, 45)}`);

    // Check by ISBN first
    let exists = false;
    if (book.isbn13) {
      const { data } = await supabase
        .from("books")
        .select("id, title")
        .eq("isbn_13", book.isbn13)
        .limit(1)
        .maybeSingle();
      if (data) { exists = true; found.push({ ...book, dbTitle: data.title }); }
    }

    // Fallback: check by title
    if (!exists) {
      const { data: results } = await supabase.rpc("search_books_v2", { q: book.title, n: 3 });
      const match = (results || []).find(r => titleMatch(r.title, book.title));
      if (match) {
        exists = true;
        found.push({ ...book, dbTitle: match.title });
      }
    }

    if (!exists) {
      // Also check cache missing to boost priority
      const cacheHit = uniqueCacheMissing.find(c => titleMatch(c.title, book.title));
      missing.push({
        title: book.title,
        author: book.author,
        isbn13: book.isbn13,
        category: book.category,
        searchedCount: cacheHit?.searchedCount || 0,
        source: cacheHit ? "curated+cache" : "curated",
        priority: cacheHit ? "high" : (book.isbn13 ? "medium" : "low"),
      });
    }

    await sleep(80);
  }

  // Add cache-only missing (not in curated list)
  for (const cm of uniqueCacheMissing) {
    const alreadyInMissing = missing.some(m => titleMatch(m.title, cm.title));
    const alreadyFound = found.some(f => titleMatch(f.title, cm.title));
    if (!alreadyInMissing && !alreadyFound) {
      missing.push({
        title: cm.title,
        author: cm.author,
        isbn13: cm.isbn13,
        category: "cache_only",
        searchedCount: cm.searchedCount,
        source: "smart-search-cache",
        priority: cm.searchedCount >= 3 ? "high" : "medium",
      });
    }
  }

  // Sort: high > medium > low, then by searchedCount
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  missing.sort((a, b) => {
    const po = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (po !== 0) return po;
    return b.searchedCount - a.searchedCount;
  });

  process.stdout.write("\r" + " ".repeat(80) + "\r");
  console.log(`\n  ${C.green}Déjà en base${C.reset} : ${found.length}/${CURATED.length}`);
  console.log(`  ${C.red}Manquants${C.reset}    : ${missing.length} total`);

  // Stats by category
  const catStats = {};
  for (const b of missing) {
    catStats[b.category] = (catStats[b.category] || 0) + 1;
  }
  console.log(`\n  ${C.dim}Par catégorie :${C.reset}`);
  for (const [cat, count] of Object.entries(catStats).sort((a, b) => b[1] - a[1])) {
    const total = cat === "cache_only" ? count : CURATED.filter(c => c.category === cat).length;
    console.log(`    ${cat.padEnd(25)} ${count}${cat !== "cache_only" ? ` / ${total}` : ""}`);
  }

  // Priority breakdown
  const high = missing.filter(m => m.priority === "high").length;
  const medium = missing.filter(m => m.priority === "medium").length;
  const low = missing.filter(m => m.priority === "low").length;
  const withISBN = missing.filter(m => m.isbn13).length;

  console.log(`\n  ${C.bold}Priorités :${C.reset}`);
  console.log(`    High (cherché + curated) : ${high}`);
  console.log(`    Medium (ISBN connu)       : ${medium}`);
  console.log(`    Low (pas d'ISBN)          : ${low}`);
  console.log(`    Avec ISBN                 : ${withISBN} (importables via book_import)`);
  console.log(`    Sans ISBN                 : ${missing.length - withISBN} (nécessite recherche Google)`);

  // Top 20
  console.log(`\n  ${C.bold}Top 20 manquants :${C.reset}`);
  missing.slice(0, 20).forEach((b, i) => {
    const isbn = b.isbn13 ? `${C.green}ISBN${C.reset}` : `${C.yellow}no-ISBN${C.reset}`;
    console.log(`    ${String(i + 1).padStart(2)}. [${b.priority}] "${b.title}" — ${b.author} ${isbn} ${C.dim}(${b.category})${C.reset}`);
  });

  // Save JSON
  mkdirSync(resolve(ROOT, "reports"), { recursive: true });
  writeFileSync(
    resolve(ROOT, "reports", "missing-books.json"),
    JSON.stringify(missing, null, 2),
  );
  console.log(`\n  ${C.green}✓${C.reset} Sauvegardé : ${C.bold}reports/missing-books.json${C.reset} (${missing.length} livres)\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
