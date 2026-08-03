/**
 * Deterministic placeholder generation helpers — no randomness, no
 * `Date.now()`. `addDays` operates on the caller-supplied `startDate`
 * only, so `campaign.calendar`/`social.schedule` stay pure functions of
 * their input, same discipline as every other Feature Pack's Phase 2
 * placeholder logic.
 */

export function slugify(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'untitled';
}

export function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}…`;
}

export function addDays(startDateIso: string, days: number): string {
  const date = new Date(startDateIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
