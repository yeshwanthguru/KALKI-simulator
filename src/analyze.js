/* Reference video analysis: finds the shots in a clip and estimates how the camera moves in each one.
   Everything works on small grayscale frames (AW x AH), so it is fast and runs fully offline. No machine-learning model is used:
   cuts come from histogram and pixel differences, camera motion from block matching fitted to translation + zoom + roll.
   Results are estimates; each shot carries a confidence value. */

export const AW = 128, AH = 72;

/* ---------- frame helpers ---------- */
export function toGray(rgba, w, h) {
  const g = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return g;
}
export function histogram(g) {
  const h = new Float32Array(32);
  for (let i = 0; i < g.length; i++) h[g[i] >> 3]++;
  for (let k = 0; k < 32; k++) h[k] /= g.length;
  return h;
}
const histDiff = (a, b) => { let s = 0; for (let k = 0; k < 32; k++) s += Math.abs(a[k] - b[k]); return s / 2; }; // 0..1
export function pixelDiff(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / (a.length * 255); } // 0..1
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- global motion between two frames ---------- */
/* Two-level block matching: a coarse search on half-size frames finds large moves (up to about 12% of the frame width per step),
   then a small search at full size refines to sub-pixel accuracy. */
const half = (g, w, h) => { const o = new Uint8Array((w >> 1) * (h >> 1)), W = w >> 1; for (let y = 0; y < h >> 1; y++) for (let x = 0; x < W; x++) o[y * W + x] = (g[2 * y * w + 2 * x] + g[2 * y * w + 2 * x + 1] + g[(2 * y + 1) * w + 2 * x] + g[(2 * y + 1) * w + 2 * x + 1]) >> 2; return o; };
/* copy of a frame with its edge pixels repeated outwards, so blocks at the border can still be matched in every direction */
const pad = (g, w, h, P) => { const W = w + 2 * P, o = new Uint8Array(W * (h + 2 * P)); for (let y = -P; y < h + P; y++) { const sy = Math.min(h - 1, Math.max(0, y)); for (let x = -P; x < w + P; x++) o[(y + P) * W + x + P] = g[sy * w + Math.min(w - 1, Math.max(0, x))]; } return o; };
const sadAt = (a, aw, b, bw, ax, ay, bx, by, bs) => { let s = 0; for (let y = 0; y < bs; y++) { const i = (ay + y) * aw + ax, j = (by + y) * bw + bx; for (let x = 0; x < bs; x++) s += Math.abs(a[i + x] - b[j + x]); } return s; };
/* returns tx, ty (pixels the picture content moved), s (expansion per step), r (roll, radians), res (spread of the residual, px),
   sad (how well blocks matched, 0 = perfect, high after a cut), n (blocks used) */
export function estimateMotion(prev, cur, w = AW, h = AH) {
  const pw = w >> 1, ph = h >> 1, CB = 8, CR = 8, FP = 20, hp = half(prev, w, h), hcp = pad(half(cur, w, h), pw, ph, CR), curP = pad(cur, w, h, FP), pts = [];
  let sadSum = 0, sadN = 0;
  for (let cy0 = 0; cy0 + CB <= ph; cy0 += CB) for (let cx0 = 0; cx0 + CB <= pw; cx0 += CB) {
    let mean = 0; for (let y = 0; y < CB; y++) for (let x = 0; x < CB; x++) mean += hp[(cy0 + y) * pw + cx0 + x];
    mean /= CB * CB; let vr = 0; for (let y = 0; y < CB; y++) for (let x = 0; x < CB; x++) { const d = hp[(cy0 + y) * pw + cx0 + x] - mean; vr += d * d; }
    if (vr / (CB * CB) < 20) continue; // not enough texture to follow
    let best = Infinity, bx = 0, by = 0;
    for (let dy = -CR; dy <= CR; dy++) for (let dx = -CR; dx <= CR; dx++) { const sd = sadAt(hp, pw, hcp, pw + 2 * CR, cx0, cy0, cx0 + dx + CR, cy0 + dy + CR, CB); if (sd < best || (sd === best && Math.abs(dx) + Math.abs(dy) < Math.abs(bx) + Math.abs(by))) { best = sd; bx = dx; by = dy; } }
    /* refine at full size around the doubled coarse vector */
    const x0 = cx0 * 2, y0 = cy0 * 2, FB = 16, FR = 2, c0x = bx * 2, c0y = by * 2, side = 2 * FR + 1, grid = new Float32Array(side * side);
    let fb = Infinity, fx = 0, fy = 0;
    for (let dy = -FR; dy <= FR; dy++) for (let dx = -FR; dx <= FR; dx++) {
      const sd = sadAt(prev, w, curP, w + 2 * FP, x0, y0, x0 + c0x + dx + FP, y0 + c0y + dy + FP, FB);
      grid[(dy + FR) * side + dx + FR] = sd; if (sd < fb) { fb = sd; fx = dx; fy = dy; }
    }
    let sx = c0x + fx, sy = c0y + fy; const at = (dx, dy) => grid[(dy + FR) * side + dx + FR];
    if (fx > -FR && fx < FR) { const l = at(fx - 1, fy), r = at(fx + 1, fy), d = l - 2 * fb + r; if (d > 1e-6 && l < 1e9 && r < 1e9) sx += clamp((l - r) / (2 * d), -.5, .5); }
    if (fy > -FR && fy < FR) { const l = at(fx, fy - 1), r = at(fx, fy + 1), d = l - 2 * fb + r; if (d > 1e-6 && l < 1e9 && r < 1e9) sy += clamp((l - r) / (2 * d), -.5, .5); }
    sadSum += fb / (FB * FB * 255); sadN++;
    pts.push({ px: x0 + FB / 2 - w / 2, py: y0 + FB / 2 - h / 2, vx: sx, vy: sy });
  }
  const out = { tx: 0, ty: 0, s: 0, r: 0, res: 0, depth: 0, coh: 0, sad: sadN ? sadSum / sadN : 1, n: pts.length };
  if (pts.length < 6) return out;
  /* least squares for v = t + s * p + r * perp(p), re-weighted to ignore moving objects */
  let wts = pts.map(() => 1), m = [0, 0, 0, 0];
  for (let it = 0; it < 4; it++) {
    const A = Array.from({ length: 4 }, () => new Float64Array(5));
    pts.forEach((p, i) => {
      const wt = wts[i]; if (!wt) return;
      for (const [row, vv] of [[[1, 0, p.px, -p.py], p.vx], [[0, 1, p.py, p.px], p.vy]]) {
        for (let a = 0; a < 4; a++) { for (let b = 0; b < 4; b++) A[a][b] += wt * row[a] * row[b]; A[a][4] += wt * row[a] * vv; }
      }
    });
    m = solve4(A) || m;
    const res = pts.map(p => Math.hypot(p.vx - (m[0] + m[2] * p.px - m[3] * p.py), p.vy - (m[1] + m[2] * p.py + m[3] * p.px)));
    const cut = Math.max(.6, 2.2 * median(res)); wts = res.map(r => r <= cut ? 1 : 0);
    if (wts.reduce((a, b) => a + b, 0) < 6) break;
  }
  [out.tx, out.ty, out.s, out.r] = m;
  /* how far the picture is from one rigid motion: the 80th percentile over ALL blocks, so depth layers count but a few moving people do not */
  const all = pts.map(p => Math.hypot(p.vx - (m[0] + m[2] * p.px - m[3] * p.py), p.vy - (m[1] + m[2] * p.py + m[3] * p.px))).sort((x, y) => x - y);
  out.res = all[Math.min(all.length - 1, Math.floor(all.length * .8))];
  /* depth: near things move faster than far things in a truck, pedestal or push-in; in a pan or zoom the whole picture moves alike.
     The difference between the median leftover motion of the lower and upper half of the frame is robust to a few moving people. */
  const med = a => { const q = [...a].sort((x, y) => x - y); return q.length ? q[q.length >> 1] : 0; }, lo = [], up = [];
  for (const p of pts) { const rx = p.vx - (m[0] + m[2] * p.px - m[3] * p.py), ry = p.vy - (m[1] + m[2] * p.py + m[3] * p.px); (p.py > 0 ? lo : up).push([rx, ry]); }
  out.depth = lo.length >= 3 && up.length >= 3 ? Math.hypot(med(lo.map(v => v[0])) - med(up.map(v => v[0])), med(lo.map(v => v[1])) - med(up.map(v => v[1]))) : 0;
  out.coh = all.filter(r => r < 1.5).length / all.length; // random vectors (a cut) agree with no motion; a real camera move explains most blocks
  return out;
}
function solve4(A) { // Gaussian elimination on the 4x5 augmented matrix
  const M = A.map(r => Float64Array.from(r));
  for (let c = 0; c < 4; c++) {
    let p = c; for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-9) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 4; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 5; k++) M[r][k] -= f * M[c][k]; }
  }
  return [0, 1, 2, 3].map(i => M[i][4] / M[i][i]);
}

/* ---------- cuts ---------- */
/* frames: array of Uint8Array gray frames; motions[i - 1] (optional) is estimateMotion(frames[i - 1], frames[i]).
   Returns indices i where a new shot starts (frame i is the first frame after the cut).
   A cut is a frame pair that no camera motion explains: blocks cannot be matched (high sad), or the picture statistics jump. */
export function findCuts(frames, fps, motions) {
  const hs = frames.map(histogram), cuts = [], recent = [], recentSad = [];
  for (let i = 1; i < frames.length; i++) {
    const m = motions ? motions[i - 1] : estimateMotion(frames[i - 1], frames[i]);
    const pd = pixelDiff(frames[i - 1], frames[i]), hd = histDiff(hs[i - 1], hs[i]), base = median(recent.slice(-8)), sbase = median(recentSad.slice(-8));
    const textured = m && m.n >= 6;
    const matchFails = textured && m.sad > Math.max(.045, 2.8 * sbase + .02) && pd > .06 && (m.coh < .55 || m.sad > .13);
    const isCut = matchFails || (hd > .38) || (pd > .17 && hd > .09 && pd > 2.6 * base + .05);
    if (isCut) {
      if (cuts.length && i - cuts[cuts.length - 1] < Math.max(2, Math.round(fps * .3))) continue; // flashes and double detections
      cuts.push(i); recent.length = 0; recentSad.length = 0;
    } else { recent.push(pd); if (textured) recentSad.push(m.sad); }
  }
  return cuts;
}

/* ---------- camera technique of one shot ---------- */
/* Direction convention: dir follows Kalki's own moves (see tests: the app renders its own moves and checks they are recognised).
   sign = +1 when the picture content moves right / down / expands. DIR maps that to Kalki's dir value for each move. */
export const DIR = { pan: -1, tilt: 1, truck: -1, pedestal: 1 };

export function analyzeShot(motions, fps, w = AW, h = AH) {
  const n = motions.length, dur = (n + 1) / fps;
  const out = { move: 'static', dir: 1, amount: .3, easing: 'smooth', confidence: .5, handheld: false, jitter: 0, parallax: 0, cumX: 0, cumY: 0, cumS: 0, cumR: 0, dur };
  if (n < 2) { out.confidence = .3; return out; }
  const xs = motions.map(m => m.tx / w), ys = motions.map(m => m.ty / h * (h / w)), ss = motions.map(m => m.s), rs = motions.map(m => m.r);
  const sum = a => a.reduce((x, y) => x + y, 0);
  out.cumX = sum(xs); out.cumY = sum(ys); out.cumS = sum(ss); out.cumR = sum(rs);
  /* jitter: what remains after removing the slow trend */
  const k = Math.max(2, Math.round(fps * .8)), hp = a => a.map((v, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - k); j <= Math.min(a.length - 1, i + k); j++) { s += a[j]; c++; } return v - s / c; });
  const rms = a => Math.sqrt(sum(a.map(v => v * v)) / a.length);
  out.jitter = Math.hypot(rms(hp(xs)), rms(hp(ys)));
  /* parallax: how badly one rigid motion explains the picture, relative to how much it moves */
  let rn = 0, rd = 0; for (const m of motions) { const v = Math.hypot(m.tx, m.ty) + Math.abs(m.s) * 40 + .4; rn += m.depth; rd += v; }
  out.parallax = rn / rd;
  const trans = Math.hypot(out.cumX, out.cumY), zoom = Math.abs(out.cumS), handheld = out.jitter > .0075;
  out.handheld = handheld;
  const tN = trans / .06, zN = zoom / .08;
  const same = (a, sgn) => a.filter(v => Math.sign(v) === sgn).length / a.length;
  if (tN < 1 && zN < 1) {
    out.move = handheld ? 'handheld' : 'static';
    out.amount = handheld ? clamp(out.jitter / .02, .25, 1) : .2;
    out.confidence = handheld ? clamp(.45 + out.jitter * 25, .5, .9) : clamp(.9 - (trans + zoom) * 4, .55, .92);
  } else if (tN >= zN) {
    const horizontal = Math.abs(out.cumX) >= Math.abs(out.cumY), sgn = Math.sign(horizontal ? out.cumX : out.cumY) || 1, series = horizontal ? xs : ys;
    const par = out.parallax > (horizontal ? .12 : .42); // tilts are far more common than pedestal moves, so vertical needs stronger depth evidence
    out.move = horizontal ? (par ? 'truck' : 'pan') : (par ? 'pedestal' : 'tilt');
    out.dir = DIR[out.move] * sgn;
    const along = Math.abs(horizontal ? out.cumX : out.cumY);
    out.amount = clamp(out.move === 'pan' ? along * 45 / 70 : out.move === 'tilt' ? along * 30 / 40 : along / .6, .12, 1); // 45 and 30 degrees: typical field of view
    out.confidence = clamp(.3 + .55 * same(series, sgn) + .15 * clamp(tN / 3, 0, 1) - (par ? .08 : 0), .3, .95);
  } else {
    const sgn = Math.sign(out.cumS) || 1, par = out.parallax > .12;
    out.move = sgn > 0 ? (par ? 'push_in' : 'zoom_in') : 'pull_out';
    out.dir = 1;
    out.amount = clamp(zoom / .55, .15, 1);
    out.confidence = clamp(.3 + .55 * same(ss, sgn) + .15 * clamp(zN / 3, 0, 1), .3, .95);
  }
  /* speed profile -> easing */
  if (out.move !== 'static' && out.move !== 'handheld') {
    const sp = motions.map(m => Math.hypot(m.tx / w, m.ty / w) + Math.abs(m.s) * .6), q = Math.max(1, Math.floor(sp.length / 4));
    const a = sum(sp.slice(0, q)) / q, b = sum(sp.slice(q, sp.length - q)) / Math.max(1, sp.length - 2 * q), c = sum(sp.slice(sp.length - q)) / q;
    out.easing = b > 1.35 * Math.max(a, c) ? 'smooth' : c > 1.5 * a ? 'in' : a > 1.5 * c ? 'out' : 'linear';
  }
  return out;
}

/* ---------- whole clip ---------- */
/* frames: gray frames sampled every 1/fps seconds. Returns { fps, duration, shots: [{ start, end, dur, move, dir, amount, easing, confidence, handheld, ... }], summary }. */
export function analyzeClip(frames, fps, w = AW, h = AH) {
  const all = [];
  for (let i = 1; i < frames.length; i++) all.push(estimateMotion(frames[i - 1], frames[i], w, h));
  const cuts = findCuts(frames, fps, all), bounds = [0, ...cuts, frames.length];
  const motions = all.map((m, k) => cuts.includes(k + 1) ? null : m);
  const shots = [];
  for (let b = 0; b + 1 < bounds.length; b++) {
    const a = bounds[b], z = bounds[b + 1]; if (z - a < 1) continue;
    const ms = motions.slice(a, z - 1).filter(Boolean); // motions[i-1] is the step into frame i
    const r = analyzeShot(ms, fps, w, h);
    shots.push({ ...r, startFrame: a, endFrame: z - 1, start: a / fps, end: z / fps, dur: (z - a) / fps });
  }
  /* merge slivers shorter than 0.5 s into the previous shot (flashes, dissolves) */
  for (let i = shots.length - 1; i > 0; i--) if (shots[i].dur < .5) { shots[i - 1].end = shots[i].end; shots[i - 1].endFrame = shots[i].endFrame; shots[i - 1].dur += shots[i].dur; shots.splice(i, 1); }
  return { fps, duration: frames.length / fps, shots, summary: summarize(shots, frames.length / fps) };
}

export function summarize(shots, duration) {
  const total = shots.reduce((a, s) => a + s.dur, 0) || 1, by = {};
  for (const s of shots) by[s.move] = (by[s.move] || 0) + s.dur;
  const dominant = Object.entries(by).sort((a, b) => b[1] - a[1])[0] || ['static', 0];
  const lens = shots.map(s => s.dur), avg = total / Math.max(1, shots.length);
  return {
    shotCount: shots.length, duration, avgShot: avg, medianShot: median(lens),
    staticShare: (by.static || 0) / total, handheldShare: shots.filter(s => s.handheld || s.move === 'handheld').reduce((a, s) => a + s.dur, 0) / total,
    movingShare: 1 - (by.static || 0) / total, byMove: by, dominant: dominant[0],
    pace: avg < 2.5 ? 'fast' : avg < 5.5 ? 'medium' : 'slow',
    avgAmount: shots.filter(s => s.move !== 'static').reduce((a, s, _, l) => a + s.amount / l.length, 0)
  };
}

/* ---------- reference -> Kalki shots ---------- */
const SIZE_FOR = { static: 'MS', handheld: 'MS', pan: 'WS', truck: 'WS', tilt: 'FS', pedestal: 'FS', push_in: 'MS', zoom_in: 'MS', pull_out: 'MS' };
/* shot sizes the user marked on the reference (the analyser itself does not detect them) */
export const SIZE_NAME = { EWS: 'extreme wide shot', WS: 'wide shot', FS: 'full shot', MS: 'medium shot', MCU: 'medium close-up', CU: 'close-up', ECU: 'extreme close-up' };
export function toShots(clip, label = 'Reference', sizes = []) {
  return clip.shots.slice(0, 60).map((s, i) => ({
    move: s.move, dir: s.dir, amount: +s.amount.toFixed(2), easing: s.easing, duration: Math.min(20, Math.max(1, Math.round(s.dur * 2) / 2)),
    size: SIZE_NAME[sizes[i]] ? sizes[i] : SIZE_FOR[s.move] || 'MS', subject: s.move === 'pan' || s.move === 'truck' ? 'both' : 'A', lens: 35, height: 'eye',
    name: `${label} ${i + 1}`, notes: `Detected at ${fmtTime(s.start)}: ${s.move.replace('_', ' ')}, ${Math.round(s.confidence * 100)}% confidence.`
  }));
}
export const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/* ---------- suggestions: explainable rules comparing the reference with the current scene ---------- */
/* project: { shots: [{ move, duration, amount, easing, dir }] }. Each suggestion: { id, rule, shot, text, why, patch } where patch is a list of
   { shot, set: {field: value} } edits, { addShots: [...] } or { scaleDurations: factor } that the app can apply and play. */
export function suggest(clip, project, sizes = []) {
  const out = [], R = clip.summary, P = project.shots, name = m => m.replace('_', ' ');
  if (!clip.shots.length) return out;
  if (P.length) {
    const avgP = P.reduce((a, s) => a + s.duration, 0) / P.length, f = R.avgShot / avgP;
    if (f < .8 || f > 1.25) out.push({ id: 'pace', rule: 'Pacing', shot: null, text: `The reference averages ${R.avgShot.toFixed(1)} s per shot; your scene averages ${avgP.toFixed(1)} s. ${f < 1 ? 'Shorten' : 'Lengthen'} your shots to match its ${R.pace} pace.`, why: 'Shot length sets the rhythm of a scene more than any single camera move.', patch: [{ scaleDurations: f }] });
    const m = Math.min(P.length, clip.shots.length);
    for (let i = 0; i < m; i++) {
      const r = clip.shots[i], p = P[i];
      if (SIZE_NAME[sizes[i]] && SIZE_NAME[p.size] && sizes[i] !== p.size) out.push({ id: 'size' + i, rule: 'Shot size', shot: i, text: `Shot ${i + 1}: you marked the reference as a ${SIZE_NAME[sizes[i]]}; yours is a ${SIZE_NAME[p.size]}. Change the shot size to ${sizes[i]}.`, why: 'Shot size decides how close the audience feels. Matching the reference keeps the same emotional distance.', patch: [{ shot: i, set: { size: sizes[i] } }] });
      if (r.confidence < .45) continue;
      if (p.move !== r.move) out.push({ id: 'move' + i, rule: 'Camera move', shot: i, text: `Shot ${i + 1}: the reference uses ${name(r.move)} (${fmtTime(r.start)}, ${Math.round(r.confidence * 100)}% sure); you use ${name(p.move)}. Switch to ${name(r.move)}.`, why: r.move === 'static' ? 'The reference lets the frame hold still here.' : 'Matching the move reproduces the reference\'s energy at this beat.', patch: [{ shot: i, set: { move: r.move, dir: r.dir, amount: +r.amount.toFixed(2), easing: r.easing } }] });
      else if (r.move !== 'static' && Math.abs(r.amount - p.amount) > .3) out.push({ id: 'amount' + i, rule: 'Move intensity', shot: i, text: `Shot ${i + 1}: the reference's ${name(r.move)} is ${r.amount < p.amount ? 'gentler' : 'stronger'} than yours. Set intensity to about ${Math.round(r.amount * 100)}%.`, why: 'Intensity changes how noticeable the move is.', patch: [{ shot: i, set: { amount: +r.amount.toFixed(2) } }] });
      if (p.move === r.move && r.move !== 'static' && p.easing !== r.easing) out.push({ id: 'ease' + i, rule: 'Easing', shot: i, text: `Shot ${i + 1}: the reference eases ${r.easing === 'linear' ? 'mechanically (linear)' : r.easing === 'smooth' ? 'in and out' : 'only ' + r.easing}. Set easing to ${r.easing}.`, why: 'Easing decides whether a move feels mechanical or human.', patch: [{ shot: i, set: { easing: r.easing } }] });
    }
    if (clip.shots.length > P.length) out.push({ id: 'count', rule: 'Shot count', shot: null, text: `The reference has ${clip.shots.length} shots; your scene has ${P.length}. Add ${clip.shots.length - P.length} more to cover the same beats.`, why: 'It shows the reference\'s coverage, but only add shots the story needs.', patch: [{ addShots: toShots({ shots: clip.shots.slice(P.length) }, 'Added') }] });
  }
  if (R.handheldShare > .3) out.push({ id: 'handheld', rule: 'Handheld feel', shot: null, text: `${Math.round(R.handheldShare * 100)}% of the reference has a handheld shake. Use Handheld on the shots that should feel raw or urgent.`, why: 'Natural shake reads as documentary and presence.', patch: [{ handheldShots: clip.shots.map(s => s.handheld || s.move === 'handheld') }] });
  if (R.staticShare > .6 && P.length && P.filter(s => s.move !== 'static').length / P.length > .6) out.push({ id: 'still', rule: 'Restraint', shot: null, text: `The reference holds still ${Math.round(R.staticShare * 100)}% of the time, but most of your shots move. Keep moves for the key beats.`, why: 'Stillness makes the few moves stand out.', patch: [] });
  return out;
}
