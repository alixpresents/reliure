/**
 * Extract a 4-digit year from various date formats:
 * - ISO: "1972", "1972-07", "1972-07-01"
 * - Dilicom: "07/01/1972"
 * - MM/YYYY: "05/2024"
 */
export function extractYear(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (/^\d{4}/.test(s)) return s.slice(0, 4);
  const trailing = s.match(/(\d{4})$/);
  if (trailing) return trailing[1];
  return null;
}
