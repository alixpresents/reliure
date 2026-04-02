/**
 * Génère le texte descriptif d'une notification.
 * @param {Object} notif — row retournée par get_notifications RPC
 * @returns {string}
 */
export function getNotificationText(notif) {
  const actor = notif.actor_display_name || notif.actor_username || "";

  switch (notif.type) {
    case "follow":
      return `${actor} t'a suivi`;
    case "like_review":
      return `${actor} a aimé ta critique de ${notif.metadata?.book_title || ""}`;
    case "like_quote":
      return `${actor} a aimé ta citation de ${notif.metadata?.book_title || ""}`;
    case "like_list":
      return `${actor} a aimé ta liste ${notif.metadata?.list_title || ""}`;
    case "badge":
      return `Nouveau badge débloqué : ${notif.metadata?.badge_name || ""}`;
    case "reply":
      return `${actor} a répondu à ta critique de ${notif.metadata?.book_title || ""}`;
    default:
      return "";
  }
}

/**
 * Génère l'URL de navigation au clic sur une notification.
 * @param {Object} notif
 * @returns {string|null} — path React Router, ou null si pas de navigation
 */
export function getNotificationLink(notif) {
  const m = notif.metadata || {};

  switch (notif.type) {
    case "follow":
      return notif.actor_username ? `/${notif.actor_username}` : null;

    case "like_review":
    case "like_quote":
    case "reply":
      return m.book_slug ? `/livre/${m.book_slug}` : m.book_id ? `/livre/${m.book_id}` : null;

    case "like_list":
      return m.list_owner_username && m.list_slug
        ? `/${m.list_owner_username}/listes/${m.list_slug}`
        : null;

    case "badge":
      return null;

    default:
      return null;
  }
}

/**
 * Timestamp relatif en français.
 * @param {string} dateStr — ISO 8601
 * @returns {string}
 */
export function relativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffS = Math.floor((now - then) / 1000);

  if (diffS < 60) return "à l'instant";

  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `il y a ${diffM} min`;

  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `il y a ${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `il y a ${diffD} j`;

  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `le ${dd}/${mm}`;
}
