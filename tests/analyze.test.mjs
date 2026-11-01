// Tests for src/analyze.js on synthetic footage with known camera moves (a procedural texture that is panned, zoomed, shaken and cut).
import assert from 'node:assert/strict';
import { analyzeClip, analyzeShot, estimateMotion, findCuts, suggest, toShots, summarize, AW, AH } from '../src/analyze.js';

const FPS = 6;
const hash = (ix, iy, seed) => { let h = (ix * 374761393 + iy * 668265263 + seed * 144665) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; };
const vnoise = (x, y, seed) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed); return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy; };
const tex = (x, y, seed) => .55 * vnoise(x / 9, y / 9, seed) + .3 * vnoise(x / 4, y / 4, seed + 1) + .15 * vnoise(x / 2, y / 2, seed + 2);
let rnd = 12345; const rand = () => (rnd = (rnd * 1664525 + 1013904223) >>> 0) / 4294967295;

/* cam: { tx, ty, sc }  content moves by tx, ty pixels and is scaled by sc about the centre; the foreground band moves fg times as much */
function frame(seed, cam, fg = 1) {
  const g = new Uint8Array(AW * AH), cx = AW / 2, cy = AH / 2;
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const f = y > AH * .62 ? fg : 1, sc = 1 + (cam.sc - 1) * f, tx = cam.tx * f, ty = cam.ty * f;
    const u = cx + (x - cx) / sc - tx, v = cy + (y - cy) / sc - ty;
    g[y * AW + x] = Math.max(0, Math.min(255, 255 * tex(u + 500, v + 500, seed) + (rand() - .5) * 6));
  }
  return g;
}
const shot = (seed, n, camAt, fg = 1) => Array.from({ length: n }, (_, i) => frame(seed, camAt(i / (n - 1)), fg));
const only = (frames) => { const c = analyzeClip(frames, FPS); assert.equal(c.shots.length, 1, 'one shot expected, got ' + c.shots.length); return c.shots[0]; };

/* static */
{ const s = only(shot(1, 16, () => ({ tx: 0, ty: 0, sc: 1 }))); assert.equal(s.move, 'static'); assert.ok(s.confidence > .6); }
/* pan: content moves right by 40 px over the shot; left is the mirror image */
{ const a = only(shot(2, 18, t => ({ tx: 40 * t, ty: 0, sc: 1 }))), b = only(shot(2, 18, t => ({ tx: -40 * t, ty: 0, sc: 1 })));
  assert.equal(a.move, 'pan'); assert.equal(b.move, 'pan'); assert.equal(a.dir, -b.dir, 'opposite directions'); assert.ok(a.amount > .12 && a.confidence > .6, JSON.stringify(a)); }
/* truck: same sideways motion but the foreground moves 2.6x faster (parallax) */
{ const s = only(shot(3, 18, t => ({ tx: 24 * t, ty: 0, sc: 1 }), 2.6)); assert.equal(s.move, 'truck', JSON.stringify(s)); }
/* tilt and pedestal */
{ const a = only(shot(4, 18, t => ({ tx: 0, ty: 22 * t, sc: 1 }))), b = only(shot(4, 18, t => ({ tx: 0, ty: -22 * t, sc: 1 })));
  assert.equal(a.move, 'tilt'); assert.equal(b.move, 'tilt'); assert.equal(a.dir, -b.dir); }
{ const s = only(shot(5, 18, t => ({ tx: 0, ty: 16 * t, sc: 1 }), 2.8)); assert.equal(s.move, 'pedestal', JSON.stringify(s)); }
/* zoom in / zoom out: the whole picture scales; push in: the foreground scales faster */
{ const a = only(shot(6, 18, t => ({ tx: 0, ty: 0, sc: 1 + .4 * t }))), b = only(shot(6, 18, t => ({ tx: 0, ty: 0, sc: 1.4 - .4 * t })));
  assert.equal(a.move, 'zoom_in', JSON.stringify(a)); assert.equal(b.move, 'pull_out', JSON.stringify(b)); }
{ const s = only(shot(7, 18, t => ({ tx: 0, ty: 0, sc: 1 + .25 * t }), 3)); assert.equal(s.move, 'push_in', JSON.stringify(s)); }
/* handheld: random jitter around a fixed frame */
{ rnd = 777; const s = only(Array.from({ length: 24 }, () => frame(8, { tx: (rand() - .5) * 4.5, ty: (rand() - .5) * 4.5, sc: 1 }))); assert.equal(s.move, 'handheld', JSON.stringify(s)); assert.ok(s.handheld); }
/* easing: slow start and end, fast middle */
{ const s = only(shot(9, 24, t => ({ tx: 44 * (t * t * (3 - 2 * t)), ty: 0, sc: 1 }))); assert.equal(s.easing, 'smooth', s.easing); }
{ const s = only(shot(9, 24, t => ({ tx: 44 * t, ty: 0, sc: 1 }))); assert.equal(s.easing, 'linear', s.easing); }

/* cuts and a mixed clip: pan, cut, zoom in, cut, static */
{
  const f = [...shot(10, 14, t => ({ tx: 36 * t, ty: 0, sc: 1 })), ...shot(11, 14, t => ({ tx: 0, ty: 0, sc: 1 + .35 * t })), ...shot(12, 12, () => ({ tx: 0, ty: 0, sc: 1 }))];
  const cuts = findCuts(f, FPS); assert.deepEqual(cuts, [14, 28], 'cuts at the true boundaries');
  const c = analyzeClip(f, FPS);
  assert.equal(c.shots.length, 3); assert.deepEqual(c.shots.map(s => s.move), ['pan', 'zoom_in', 'static']);
  assert.ok(Math.abs(c.shots[0].dur - 14 / FPS) < .01 && Math.abs(c.shots[1].start - 14 / FPS) < .01);
  assert.equal(c.summary.shotCount, 3); assert.ok(c.summary.staticShare > .2 && c.summary.staticShare < .4); assert.equal(c.summary.pace, 'fast');
  /* the scene as Kalki shots */
  const ks = toShots(c); assert.equal(ks.length, 3); assert.equal(ks[1].move, 'zoom_in'); assert.ok(ks.every(s => s.duration >= 1 && s.notes.includes('Detected')));
  /* suggestions against a different scene */
  const project = { shots: [{ move: 'static', duration: 8, amount: .6, easing: 'smooth', dir: 1 }, { move: 'zoom_in', duration: 8, amount: .9, easing: 'smooth', dir: 1 }] };
  const sg = suggest(c, project), ids = sg.map(x => x.id);
  assert.ok(ids.includes('pace'), 'pace rule'); assert.ok(ids.includes('move0'), 'shot 1 should become a pan'); assert.ok(ids.includes('count'), 'one more shot');
  assert.ok(sg.every(x => x.rule && x.text && x.why && Array.isArray(x.patch)), 'every tip names its rule and reason');
  assert.equal(sg.find(x => x.id === 'move0').patch[0].set.move, 'pan');
  /* shot sizes marked by the user */
  assert.ok(!ids.some(i => i.startsWith('size')), 'no size rule until the user marks a size');
  const sz = suggest(c, { shots: [{ ...project.shots[0], size: 'WS' }, { ...project.shots[1], size: 'MS' }] }, ['CU', 'MS', '']);
  assert.ok(sz.some(x => x.id === 'size0' && x.patch[0].set.size === 'CU'), 'a different size becomes a suggestion'); assert.ok(!sz.some(x => x.id === 'size1'), 'an equal size is not suggested');
  assert.equal(toShots(c, 'Ref', ['ECU', '', 'bogus'])[0].size, 'ECU'); assert.notEqual(toShots(c, 'Ref', ['ECU', '', 'bogus'])[2].size, 'bogus');
}
/* edge cases */
assert.equal(analyzeClip([], FPS).shots.length, 0);
assert.equal(analyzeClip([new Uint8Array(AW * AH)], FPS).shots.length, 1);
assert.equal(estimateMotion(new Uint8Array(AW * AH), new Uint8Array(AW * AH)).n, 0, 'flat frames have nothing to track');
assert.equal(summarize([], 0).shotCount, 0);
console.log('analyze ok');
