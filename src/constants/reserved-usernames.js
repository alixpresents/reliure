export const RESERVED_USERNAMES = new Set([
  // Routes actuelles
  "explorer", "citations", "fil", "defis", "la-revue", "livre", "login", "parametres",
  // Routes futures
  "blog", "boutique", "vod", "podcast", "prix", "auteurs", "auteur", "editeurs", "editeur",
  "librairies", "librairie", "club", "clubs", "magazine", "revue", "agenda", "evenements",
  "partenaires", "presse", "pro", "entreprise", "equipe", "emplois", "careers",
  "bibliotheque", "critiques", "listes", "liste", "bilan","boussole",
  // Génériques
  "admin", "api", "app", "about", "help", "search", "settings", "static", "assets",
  "public", "private", "dashboard", "account", "accounts", "signup", "register", "logout",
  "auth", "oauth", "callback", "webhooks", "feed", "notifications", "messages", "inbox",
  "support", "contact", "terms", "privacy", "legal", "security", "status", "health",
  "www", "mail", "ftp", "cdn", "img", "images", "css", "js", "fonts", "media",
  "uploads", "downloads", "export", "import", "embed", "widget", "test", "dev",
  "staging", "beta", "alpha", "sandbox", "demo", "docs", "documentation",
  "billing", "plans", "pricing", "subscribe", "unsubscribe", "newsletter", "rss",
  "sitemap", "robots", "favicon", "error", "404", "500", "null", "undefined",
  "true", "false", "new", "edit", "delete", "create", "update", "remove", "add",
  "list", "lists", "user", "users", "member", "members", "profile", "profiles",
  "home", "index", "root", "system", "moderator", "mod", "staff", "reliure", "official",
]);

export function isUsernameValid(username) {
  if (!username || username.length < 2 || username.length > 30) return false;
  if (!/^[a-z0-9_]+$/.test(username)) return false;
  if (RESERVED_USERNAMES.has(username)) return false;
  return true;
}
