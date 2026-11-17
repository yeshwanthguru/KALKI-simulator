/* Title and end cards for recorded video. The words come from the project's title and document details; nothing here draws, so it can be tested without a browser. */

export const CARD_SECONDS = 3;

/* -> { title: { head, sub }, end: { head, lines } }. Empty fields are left out; the end card always has a closing line. */
export function cardContent(info, title, today = '') {
  const i = info || {}, t = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const head = t(title) || 'Untitled', tag = t(i.tagline), dir = t(i.director), prod = t(i.production), cr = t(i.credits);
  const sub = tag || (dir ? 'Directed by ' + dir : '');
  const lines = [];
  if (cr) lines.push(cr);
  if (dir && cr !== 'Directed by ' + dir) lines.push('Directed by ' + dir);
  if (prod) lines.push(prod);
  if (today) lines.push(t(today));
  return { title: { head, sub }, end: { head: 'The End', lines } };
}

/* which card (if any) is on screen, given the phase of the recording */
export function cardsOn(info) { return !!(info && info.cards); }
