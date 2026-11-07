// Tests for src/life.js: the small signs of life (blinks, breathing, weight shifts, eye movements) must be repeatable, bounded and natural in rate.
import assert from 'node:assert/strict';
import { rng, blinkLevel, breath, sway, gazeOffset, boneAxes, GAZE_WEIGHTS, noise1, handheld, lensLook } from '../src/life.js';

/* the generator is repeatable and stays in 0..1 */
const a = rng(5), b = rng(5); for (let i = 0; i < 50; i++) { const x = a(); assert.equal(x, b()); assert.ok(x >= 0 && x < 1); }
assert.notEqual(rng(5)(), rng(6)());

/* blinks: same value for the same moment, between 0 and 1, about 10 to 25 a minute, each lasting 150 to 250 ms */
for (let t = 0; t < 30; t += .013) { const v = blinkLevel(t, 3); assert.ok(v >= 0 && v <= 1); assert.equal(v, blinkLevel(t, 3)); }
for (const seed of [1, 2, 3, 4, 9]) {
  let blinks = 0, prev = 0, shut = 0, maxShut = 0, cur = 0;
  for (let t = 0; t < 120; t += .01) { const v = blinkLevel(t, seed); if (v > .5 && prev <= .5) { blinks++; cur = 0; } if (v > .5) { cur += .01; maxShut = Math.max(maxShut, cur); } prev = v; if (v > .9) shut++; }
  const perMin = blinks / 2; assert.ok(perMin >= 9 && perMin <= 26, `seed ${seed}: ${perMin} blinks a minute`); assert.ok(maxShut < .25, 'a blink does not last long'); assert.ok(shut > 0, 'the lids really close');
}
assert.equal(blinkLevel(-1, 1), 0);
assert.notDeepEqual(Array.from({ length: 200 }, (_, i) => blinkLevel(i * .1, 1)), Array.from({ length: 200 }, (_, i) => blinkLevel(i * .1, 2)), 'two people do not blink together');

/* breathing and weight shift: bounded, slow, repeatable */
let lo = 9, hi = -9; for (let t = 0; t < 30; t += .02) { const v = breath(t); lo = Math.min(lo, v); hi = Math.max(hi, v); assert.equal(v, breath(t)); } assert.ok(lo >= -1.05 && hi <= 1.05 && hi > .8 && lo < -.8);
let zc = 0, pv = breath(0); for (let t = .02; t < 60; t += .02) { const v = breath(t); if (v > 0 && pv <= 0) zc++; pv = v; } assert.ok(zc >= 12 && zc <= 18, `about 14 breaths a minute, got ${zc}`);
for (let t = 0; t < 60; t += .1) { const v = sway(t, 2); assert.ok(v >= -1.01 && v <= 1.01); }

/* eye movements: small most of the time, never large, repeatable */
let big = 0, n = 0; for (let t = 0; t < 120; t += .05) { const g = gazeOffset(t, 4); assert.deepEqual(g, gazeOffset(t, 4)); assert.ok(Math.abs(g.x) <= 7.01 && Math.abs(g.y) <= 4.01); n++; if (Math.hypot(g.x, g.y) > 3) big++; }
assert.ok(big / n < .25, 'glances away are the exception');

/* finding a bone's forward, up and side axes from its rotation relative to the character */
const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
assert.deepEqual(boneAxes(I), { fwd: { axis: 2, sign: 1 }, up: { axis: 1, sign: 1 }, side: { axis: 0, sign: 1 } });
/* a bone turned so that its x axis points up and its y axis points forward (as in the head and spine bones of this rig): columns are the bone's axes in character space */
const R = [0, 0, 1, 1, 0, 0, 0, 1, 0]; // columns: x -> (0,1,0)... written row-major below
const M = [0, 1, 0, 0, 0, 1, 1, 0, 0]; // x axis = (0,0,1)... see assertions
const ax = boneAxes([0, 1, 0, 1, 0, 0, 0, 0, 1].map((v, i) => v)); // x axis -> (0,1,0) up, y axis -> (1,0,0) side, z axis -> (0,0,1) forward
assert.deepEqual([ax.up.axis, ax.side.axis, ax.fwd.axis], [0, 1, 2]);
const flipped = boneAxes([-1, 0, 0, 0, 1, 0, 0, 0, -1]); assert.deepEqual([flipped.fwd.sign, flipped.side.sign, flipped.up.sign], [-1, -1, 1]);
assert.ok(Object.values(GAZE_WEIGHTS).every(w => w.head >= 0 && w.head <= 1 && w.eyes >= 0 && w.eyes <= 1) && GAZE_WEIGHTS.talk.eyes === 1);
/* handheld shake: repeatable, bounded, grows with strength, has slow and fast parts, and is not a pure sine */
for (let tt = 0; tt < 20; tt += .037) { const h = handheld(tt, 1), h2 = handheld(tt, 1); assert.deepEqual(h, h2); assert.ok(Math.abs(h.x) < .035 && Math.abs(h.y) < .026 && Math.abs(h.roll) < .026 && Math.abs(h.pitch) < .02 && Math.abs(h.yaw) < .024); }
const rms = k => { let s = 0, n = 0; for (let tt = 0; tt < 60; tt += .02) { const h = handheld(tt, k); s += h.x * h.x + h.roll * h.roll; n++; } return Math.sqrt(s / n); };
assert.ok(rms(1) > rms(.5) * 1.8 && rms(.5) > rms(.1) * 3 && rms(0) === 0 && rms(1) > .004);
let crossings = 0, pp = handheld(0, 1).x; for (let tt = .005; tt < 60; tt += .005) { const v = handheld(tt, 1).x; if (v * pp < 0) crossings++; pp = v; } assert.ok(crossings > 20 && crossings < 600, 'a few movements a second, not a hum: ' + crossings);
assert.ok(Math.abs(noise1(3.5, 1)) <= 1 && noise1(2, 1) === noise1(2, 1) && noise1(2, 1) !== noise1(2, 2));
/* lens character: wide lenses distort and fringe more, wide-open apertures vignette more, telephotos barely distort */
const w14 = lensLook(14, 2.8), n50 = lensLook(50, 2.8), t135 = lensLook(135, 2.8), open14 = lensLook(50, 1.4), shut11 = lensLook(50, 11);
assert.ok(w14.distortion > .07 && n50.distortion === 0 && t135.distortion < 0 && Math.abs(t135.distortion) < .02, 'distortion by focal length');
assert.ok(open14.vignette > shut11.vignette && open14.fringe > shut11.fringe && w14.fringe > n50.fringe, 'aperture and focal length');
assert.ok(lensLook(24, 4).distortion > 0 && lensLook(24, 4).distortion < w14.distortion, 'a 24 mm bends less than a 14 mm');
console.log('life ok');
