/* Small signs of life for the actors, added on top of the recorded animation: breathing, weight shifts, blinking and eye movements.
   Everything here is a plain function of time and a seed, so the same moment always looks the same and the functions can be tested without a 3D scene. */

/* a small, fast, repeatable pseudo-random generator (mulberry32) */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* blinking: people blink every 2 to 6 seconds, the lid closes in about 70 ms and opens more slowly; now and then there is a double blink.
   Returns how closed the lids are: 0 open, 1 shut. */
const blinkCache = new Map();
function blinkTimes(seed, upTo) {
  let c = blinkCache.get(seed); if (!c) { c = { r: rng(seed * 7919 + 13), list: [], t: 1 + (seed % 7) * .3 }; blinkCache.set(seed, c); }
  while (c.t < upTo + 8) { c.list.push(c.t); const double = c.r() < .12; if (double) { c.list.push(c.t + .32); } c.t += (double ? .32 : 0) + 2.2 + c.r() * 3.8; }
  if (c.list.length > 4000) { blinkCache.delete(seed); }
  return c.list;
}
export function blinkLevel(t, seed = 1) {
  if (t < 0) return 0;
  for (const s of blinkTimes(seed, t)) {
    const d = t - s; if (d < 0) return 0;
    if (d < .07) return d / .07;
    if (d < .07 + .13) return 1 - (d - .07) / .13;
  }
  return 0;
}

/* breathing: about 14 breaths a minute, a little faster while talking; returns -1..1 (in-breath positive) */
export const breath = (t, rate = .24, phase = 0) => { const x = Math.sin(2 * Math.PI * rate * t + phase); return x * .8 + Math.sin(4 * Math.PI * rate * t + phase * 1.7) * .2; };

/* slow weight shifts while standing: a lean from one foot to the other every 5 to 9 seconds; returns -1..1 */
export const sway = (t, seed = 1) => { const p = 5.5 + (seed % 5) * .7; return Math.sin(2 * Math.PI * t / p + seed) * .75 + Math.sin(2 * Math.PI * t / (p * 2.3) + seed * 2) * .25; };

/* eye movements: the gaze rests on its target and makes small quick jumps (saccades) every 0.5 to 1.8 seconds, and sometimes a short glance away.
   Returns { x, y } offsets in degrees (x to the side, y up). */
const gazeCache = new Map();
function gazeEvents(seed, upTo) {
  let c = gazeCache.get(seed); if (!c) { c = { r: rng(seed * 104729 + 7), list: [], t: 0 }; gazeCache.set(seed, c); }
  while (c.t < upTo + 6) { const glance = c.r() < .1; c.list.push({ t: c.t, x: (c.r() - .5) * (glance ? 14 : 3.2), y: (c.r() - .5) * (glance ? 8 : 2.2), len: glance ? .5 + c.r() * .6 : 0 }); c.t += (glance ? .9 : 0) + .5 + c.r() * 1.3; }
  if (c.list.length > 4000) gazeCache.delete(seed);
  return c.list;
}
export function gazeOffset(t, seed = 1) {
  const ev = gazeEvents(seed, t); let cur = { x: 0, y: 0 };
  for (let i = 0; i < ev.length; i++) { const e = ev[i]; if (e.t > t) break; cur = e.len && t > e.t + e.len ? { x: 0, y: 0 } : e; }
  return { x: cur.x, y: cur.y };
}

/* which axis of a bone points forward, up and to the side of the character: the local axes of a bone are different in every rig, so they are found once
   from the bone's rotation relative to the character (a 3x3 rotation matrix in row-major order, columns = the bone's x, y, z axes in character space) */
export function boneAxes(m) {
  const dirs = { fwd: [0, 0, 1], up: [0, 1, 0], side: [1, 0, 0] }, out = {};
  for (const [k, d] of Object.entries(dirs)) {
    let best = { axis: 0, sign: 1, dot: -1 };
    for (let c = 0; c < 3; c++) { const dot = m[0 + c] * d[0] + m[3 + c] * d[1] + m[6 + c] * d[2]; if (Math.abs(dot) > best.dot) best = { axis: c, sign: dot < 0 ? -1 : 1, dot: Math.abs(dot) }; }
    out[k] = { axis: best.axis, sign: best.sign };
  }
  return out;
}

/* how strongly the head and the eyes follow the other person for each action (the eyes follow fully, the head partly) */
export const GAZE_WEIGHTS = {
  stand: { head: .45, eyes: 1 }, talk: { head: .55, eyes: 1 }, listen: { head: .55, eyes: 1 }, nod: { head: .5, eyes: 1 }, wave: { head: .5, eyes: 1 }, shrug: { head: .4, eyes: 1 },
  invite: { head: .5, eyes: 1 }, look: { head: .12, eyes: .3 }, sit: { head: .35, eyes: 1 }, think: { head: .1, eyes: .35 }, sip: { head: .2, eyes: .7 }, eat: { head: .2, eyes: .7 },
  phone: { head: .1, eyes: .3 }, offer: { head: .5, eyes: 1 }, walk: { head: .3, eyes: .7 }
};

/* ---------- the camera: what a real lens and a real operator do ---------- */

/* smooth random wobble: value noise with cubic smoothing, range -1..1, repeatable for a seed */
const hash = n => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
export function noise1(t, seed = 0) { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return hash(i + seed * 17.3) * (1 - u) + hash(i + 1 + seed * 17.3) * u; }

/* handheld shake as the sum of three layers, like a person holding a camera: a slow drift (about 0.4 Hz), the body's sway (1.2 Hz) and a fine tremor (7 Hz).
   k is the strength, 0..1. Returns offsets in metres for the position and in radians for the rotation. */
export function handheld(t, k) {
  const n = (f, s) => noise1(t * f, s);
  const slow = [n(.4, 1), n(.4, 2), n(.4, 3), n(.4, 4), n(.4, 5)], mid = [n(1.2, 6), n(1.2, 7), n(1.2, 8), n(1.2, 9), n(1.2, 10)], fine = [n(7, 11), n(7, 12), n(7, 13), n(7, 14), n(7, 15)];
  const m = i => slow[i] * .55 + mid[i] * .35 + fine[i] * .1;
  return { x: m(0) * .03 * k, y: m(1) * .022 * k, roll: m(2) * .022 * k, pitch: m(3) * .016 * k, yaw: m(4) * .02 * k };
}

/* the optical character of a lens: wide lenses bend straight lines outwards at the edges (barrel distortion), long lenses very slightly inwards; a lens
   opened wide darkens and colour-fringes the corners more than one stopped down. f is the focal length in mm, fstop the aperture. */
export function lensLook(f, fstop) {
  const wide = Math.max(0, Math.min(1, (35 - f) / 21)), tele = Math.max(0, Math.min(1, (f - 85) / 100)), open = Math.max(0, Math.min(1, (8 - fstop) / 6.6));
  return { distortion: wide * .085 - tele * .018, vignette: .75 + open * .55, fringe: 1 + wide * .9 + open * .35 };
}

/* ---------- speech: how a talking mouth moves ----------
   People speak in phrases of 1.5 to 4 seconds with short pauses; inside a phrase the jaw opens and closes with each syllable (3.5 to 6 per second) by varying
   amounts, and the lips spread or round with the vowel. This is not lip-sync to any words: it is the natural rhythm of speech. Returns, at time t:
   open 0..1 (jaw), wide -1..1 (lips spread positive, rounded negative), talking 0..1 (how far into a phrase we are, smoothed). */
const speechCache = new Map();
function phrases(seed, upTo) {
  let c = speechCache.get(seed); if (!c) { c = { r: rng(seed * 15485863 + 3), list: [], t: .3 + (seed % 5) * .2 }; speechCache.set(seed, c); }
  while (c.t < upTo + 10) { const len = 1.4 + c.r() * 2.8, rate = 3.6 + c.r() * 2.4, ph = c.r() * 6.28, loud = .55 + c.r() * .45, v1 = c.r(), v2 = c.r(); c.list.push({ s: c.t, e: c.t + len, rate, ph, loud, v1, v2 }); c.t += len + .35 + c.r() * .9; }
  if (c.list.length > 3000) speechCache.delete(seed);
  return c.list;
}
const smooth01 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export function speech(t, seed = 1) {
  if (t < 0) return { open: 0, wide: 0, talking: 0 };
  for (const p of phrases(seed, t)) {
    if (t < p.s) break; if (t > p.e + .15) continue;
    const u = t - p.s, env = smooth01(u / .12) * smooth01((p.e + .12 - t) / .18), syl = Math.sin(p.rate * 2 * Math.PI * u + p.ph), syl2 = Math.sin(p.rate * 1.37 * 2 * Math.PI * u + p.ph * 1.9);
    const shape = Math.pow(Math.max(0, .5 + .5 * syl), 1.4) * (.7 + .3 * syl2) * p.loud, vowel = Math.sin(p.rate * .6 * 2 * Math.PI * u + p.v1 * 6.28) * (.5 + p.v2 * .5);
    return { open: Math.max(0, Math.min(1, shape * env)), wide: Math.max(-1, Math.min(1, vowel * env)), talking: env };
  }
  return { open: 0, wide: 0, talking: 0 };
}

/* ---------- facial expressions ----------
   An expression is a set of small movements of the face bones, in millimetres in the head's own frame: up is towards the top of the head, out is away from
   the middle of the face (negative = towards it), fwd is forward. Each entry says which group of bones moves; the app applies them to the left and right
   sides symmetrically. Several expressions mix by weight. */
export const MOODS = ['neutral', 'smile', 'serious', 'sad', 'surprised', 'angry'];
export const EXPR = {
  smile: { corner: { up: 4.8, out: 5.6 }, cheek: { up: 4.2, fwd: 1.2 }, lidB: { up: 1.8 }, lipU: { up: 1.3 }, browO: { up: .8 } },
  serious: { browI: { up: -1.8, out: -1.2 }, browM: { up: -1.2 }, browO: { up: -.8 }, corner: { up: -1 } },
  sad: { browI: { up: 3.2 }, browM: { up: 1.2 }, browO: { up: -1.6 }, corner: { up: -3.4, out: -.5 }, lidT: { up: -.8 } },
  surprised: { browI: { up: 5 }, browM: { up: 5 }, browO: { up: 5.5 }, lidT: { up: 1.6 } },
  angry: { browI: { up: -3.6, out: -1.8 }, browM: { up: -3 }, browO: { up: -1.5 }, lidT: { up: -.8 }, corner: { up: -1.6 }, lipU: { up: -.8 } },
  concern: { browI: { up: 2.4 }, browM: { up: .5 }, browO: { up: -.4 } }
};
/* the expression an actor wears when the director has not chosen one: what a person doing this would naturally show */
export const AUTO_MOOD = {
  stand: { smile: .12 }, walk: {}, sit: { smile: .08 }, think: { concern: .8, serious: .2 }, talk: { smile: .2 }, listen: { concern: .25, smile: .1 }, nod: { smile: .3 },
  sip: {}, wave: { smile: .85 }, look: { concern: .2 }, shrug: { sad: .25, surprised: .2 }, invite: { smile: .7 }, eat: { smile: .1 }, phone: { concern: .1 }, offer: { smile: .65 }
};
/* weights of each expression at time t: { smile, serious, sad, surprised, angry, concern } (0..1) plus raise (0..1), a brief lifting of the brows for emphasis
   while talking and the occasional flick of attention while listening. mood is 'auto' or one of MOODS. */
export function mixExpression(mood, action, t, seed = 1, speechOpen = 0) {
  const w = { smile: 0, serious: 0, sad: 0, surprised: 0, angry: 0, concern: 0 };
  if (mood && mood !== 'auto' && MOODS.includes(mood)) { if (mood !== 'neutral') w[mood] = 1; }
  else { const a = AUTO_MOOD[action] || {}; for (const k of Object.keys(a)) w[k] = a[k]; }
  /* slow drift so a held expression is never frozen: the strength wanders by up to about 20% */
  const drift = 1 + noise1(t * .35, seed + 40) * .2; for (const k of Object.keys(w)) w[k] = Math.max(0, Math.min(1, w[k] * drift));
  const talkingNow = action === 'talk' || action === 'phone', flick = Math.max(0, noise1(t * .8, seed + 50) - .55) * 2.2;
  const raise = Math.max(0, Math.min(1, (talkingNow ? speechOpen * .55 + flick * .3 : flick * .6)));
  return { w, raise };
}
