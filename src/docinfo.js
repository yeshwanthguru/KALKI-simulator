/* Document details printed on the PDFs: production, director, scene, shoot day, an accent colour, the language of the headings and a small logo.
   They are saved in the project file as "info". */

export const ACCENTS = { ember: ['Ember', [232, 108, 52]], teal: ['Teal', [42, 141, 132]], indigo: ['Indigo', [84, 98, 200]], crimson: ['Crimson', [196, 48, 72]], mono: ['Graphite', [70, 72, 84]] };
export const PDF_LANGS = ['ui', 'en', 'ta', 'hi'];
export const LOGO_MAX = 60000; // characters of the data URL kept in the project file

const text = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 60);

export function normInfo(o) {
  o = o && typeof o === 'object' ? o : {};
  const logo = typeof o.logo === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(o.logo) && o.logo.length <= LOGO_MAX ? o.logo : '';
  const dim = v => (Number.isInteger(+v) && +v >= 1 && +v <= 2000 ? +v : 0), lw = dim(o.logoW), lh = dim(o.logoH), ok = logo && lw && lh;
  return { production: text(o.production), director: text(o.director), scene: text(o.scene), day: text(o.day), accent: ACCENTS[o.accent] ? o.accent : 'ember', cards: o.cards === true, tagline: text(o.tagline), credits: String(o.credits == null ? '' : o.credits).replace(/\s+/g, ' ').trim().slice(0, 120), lang: PDF_LANGS.includes(o.lang) ? o.lang : 'ui', logo: ok ? logo : '', logoW: ok ? lw : 0, logoH: ok ? lh : 0 };
}

/* the lines added to the PDF header, in order; empty fields are left out */
export function infoLine(info, t = s => s) {
  const i = normInfo(info), out = [];
  if (i.production) out.push(i.production);
  if (i.director) out.push(`${t('Director')}: ${i.director}`);
  if (i.scene) out.push(`${t('Scene')} ${i.scene}`);
  if (i.day) out.push(`${t('Shoot day')}: ${i.day}`);
  return out;
}
