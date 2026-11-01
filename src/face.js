/* Face detector for the reference-video analysis (spike): runs the BlazeFace short-range network from plain JavaScript, so it needs no
   WebAssembly and the page's content policy stays unchanged. The layer list and 16-bit weights come from tools/convert-face-model.mjs.
   Input: an RGBA picture. Output: faces with a score, a box and six landmarks, in pixels of that picture. */

const SIZE = 128;

const half = h => { const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023; return e === 0 ? s * f * 5.960464477539063e-8 : e === 31 ? (f ? NaN : s * Infinity) : s * Math.pow(2, e - 15) * (1 + f / 1024); };

export function createFaceModel(spec, weightBytes) {
  const n = weightBytes.length >> 1, w = new Float32Array(n), dv = new DataView(weightBytes.buffer, weightBytes.byteOffset, weightBytes.byteLength);
  for (let i = 0; i < n; i++) w[i] = half(dv.getUint16(i * 2, true));
  return { spec, w };
}

const same = (inN, k, s) => { const out = Math.ceil(inN / s), tot = Math.max((out - 1) * s + k - inN, 0); return { out, before: tot >> 1 }; };

function conv(x, [H, W, C], wt, b, O, k, stride, isSame) {
  const sy = isSame ? same(H, k, stride) : { out: Math.floor((H - k) / stride) + 1, before: 0 }, sx = isSame ? same(W, k, stride) : { out: Math.floor((W - k) / stride) + 1, before: 0 };
  const oh = sy.out, ow = sx.out, y = new Float32Array(oh * ow * O);
  for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) {
    const o0 = (oy * ow + ox) * O; for (let o = 0; o < O; o++) y[o0 + o] = b[o];
    for (let ky = 0; ky < k; ky++) { const iy = oy * stride - sy.before + ky; if (iy < 0 || iy >= H) continue;
      for (let kx = 0; kx < k; kx++) { const ix = ox * stride - sx.before + kx; if (ix < 0 || ix >= W) continue;
        const i0 = (iy * W + ix) * C;
        for (let o = 0; o < O; o++) { const w0 = ((o * k + ky) * k + kx) * C; let s = 0; for (let c = 0; c < C; c++) s += x[i0 + c] * wt[w0 + c]; y[o0 + o] += s; } } }
  }
  return { data: y, shape: [oh, ow, O] };
}
function dwconv(x, [H, W, C], wt, b, k, stride, isSame) {
  const sy = same(H, k, stride), sx = same(W, k, stride), oh = sy.out, ow = sx.out, y = new Float32Array(oh * ow * C);
  for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) {
    const o0 = (oy * ow + ox) * C; for (let c = 0; c < C; c++) y[o0 + c] = b[c];
    for (let ky = 0; ky < k; ky++) { const iy = oy * stride - sy.before + ky; if (iy < 0 || iy >= H) continue;
      for (let kx = 0; kx < k; kx++) { const ix = ox * stride - sx.before + kx; if (ix < 0 || ix >= W) continue;
        const i0 = (iy * W + ix) * C, w0 = (ky * k + kx) * C; for (let c = 0; c < C; c++) y[o0 + c] += x[i0 + c] * wt[w0 + c]; } }
  }
  return { data: y, shape: [oh, ow, C] };
}
function maxpool(x, [H, W, C], k, stride, isSame) {
  const sy = isSame ? same(H, k, stride) : { out: Math.floor((H - k) / stride) + 1, before: 0 }, sx = isSame ? same(W, k, stride) : { out: Math.floor((W - k) / stride) + 1, before: 0 };
  const oh = sy.out, ow = sx.out, y = new Float32Array(oh * ow * C).fill(-Infinity);
  for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) for (let ky = 0; ky < k; ky++) { const iy = oy * stride - sy.before + ky; if (iy < 0 || iy >= H) continue;
    for (let kx = 0; kx < k; kx++) { const ix = ox * stride - sx.before + kx; if (ix < 0 || ix >= W) continue; const i0 = (iy * W + ix) * C, o0 = (oy * ow + ox) * C; for (let c = 0; c < C; c++) if (x[i0 + c] > y[o0 + c]) y[o0 + c] = x[i0 + c]; } }
  return { data: y, shape: [oh, ow, C] };
}

/* runs the network on a 128x128x3 float picture in [-1, 1]; returns { scores: Float32Array(896), boxes: Float32Array(896 * 16) } */
export function runNetwork(model, input, onLayer) {
  const { spec, w } = model, T = new Map(); T.set(spec.input, { data: input, shape: [SIZE, SIZE, 3] });
  for (const L of spec.layers) {
    if (L.op === 'conv' || L.op === 'dw') {
      const x = T.get(L.in), wt = w.subarray(L.w.offset, L.w.offset + L.w.shape.reduce((a, b) => a * b, 1)), b = w.subarray(L.b.offset, L.b.offset + L.b.shape[0]);
      T.set(L.out, L.op === 'conv' ? conv(x.data, x.shape, wt, b, L.w.shape[0], L.w.shape[1], L.stride, L.same) : dwconv(x.data, x.shape, wt, b, L.w.shape[1], L.stride, L.same));
    } else if (L.op === 'relu') { const x = T.get(L.in), y = new Float32Array(x.data.length); for (let i = 0; i < y.length; i++) y[i] = x.data[i] > 0 ? x.data[i] : 0; T.set(L.out, { data: y, shape: x.shape }); }
    else if (L.op === 'add') { const a = T.get(L.in), b = T.get(L.in2), y = new Float32Array(a.data.length); for (let i = 0; i < y.length; i++) y[i] = a.data[i] + b.data[i]; T.set(L.out, { data: y, shape: a.shape }); }
    else if (L.op === 'maxpool') { const x = T.get(L.in); T.set(L.out, maxpool(x.data, x.shape, L.k, L.stride, L.same)); }
    else if (L.op === 'padc') { const x = T.get(L.in), [H, W, C] = x.shape, C2 = C + L.before + L.after, y = new Float32Array(H * W * C2); for (let p = 0; p < H * W; p++) for (let c = 0; c < C; c++) y[p * C2 + L.before + c] = x.data[p * C + c]; T.set(L.out, { data: y, shape: [H, W, C2] }); }
    else if (L.op === 'reshape') { const x = T.get(L.in); T.set(L.out, { data: x.data, shape: L.outShape.slice(1) }); }
    else if (L.op === 'concat') { const parts = L.ins.map(i => T.get(i)), n = parts.reduce((a, p) => a + p.data.length, 0), y = new Float32Array(n); let o = 0; for (const p of parts) { y.set(p.data, o); o += p.data.length; } T.set(L.out, { data: y, shape: [parts.reduce((a, p) => a + p.shape[0], 0), parts[0].shape[1]] }); }
    if (onLayer) onLayer(L, T.get(L.out));
  }
  return { scores: T.get(spec.scores).data, boxes: T.get(spec.boxes).data };
}

/* the 896 anchor centres of BlazeFace short range: a 16x16 grid with 2 anchors per cell, then an 8x8 grid with 6 per cell */
export const ANCHORS = (() => { const a = []; for (const [g, per] of [[16, 2], [8, 6]]) for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) for (let k = 0; k < per; k++) a.push([(x + .5) / g, (y + .5) / g]); return a; })();

const sigmoid = v => 1 / (1 + Math.exp(-Math.max(-100, Math.min(100, v))));
const iou = (a, b) => { const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y), x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h), i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1); return i / (a.w * a.h + b.w * b.h - i || 1); };

/* turns network output into faces in the 128x128 input space (0..1 fractions), then removes duplicates */
export function decode({ scores, boxes }, minScore = .5, nms = .3) {
  const found = [];
  for (let i = 0; i < ANCHORS.length; i++) {
    const s = sigmoid(scores[i]); if (s < minScore) continue;
    const r = boxes.subarray(i * 16, i * 16 + 16), [ax, ay] = ANCHORS[i], cx = r[0] / SIZE + ax, cy = r[1] / SIZE + ay, w = r[2] / SIZE, h = r[3] / SIZE;
    found.push({ score: s, x: cx - w / 2, y: cy - h / 2, w, h, kp: Array.from({ length: 6 }, (_, k) => ({ x: r[4 + 2 * k] / SIZE + ax, y: r[5 + 2 * k] / SIZE + ay })) });
  }
  found.sort((a, b) => b.score - a.score);
  const keep = []; for (const f of found) if (keep.every(k => iou(k, f) < nms)) keep.push(f);
  return keep;
}

/* rgba: Uint8Array/Uint8ClampedArray of a w x h picture. The picture is centred in a black square, as the model expects. */
export function detectFaces(model, rgba, w, h, minScore = .5) {
  const sc = SIZE / Math.max(w, h), nw = Math.max(1, Math.round(w * sc)), nh = Math.max(1, Math.round(h * sc)), px = (SIZE - nw) / 2, py = (SIZE - nh) / 2, input = new Float32Array(SIZE * SIZE * 3).fill(-1);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { /* bilinear sample of the source */
    const fx = Math.min(w - 1, (x + .5) / sc - .5), fy = Math.min(h - 1, (y + .5) / sc - .5), x0 = Math.max(0, Math.floor(fx)), y0 = Math.max(0, Math.floor(fy)), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
    const o = ((Math.round(py) + y) * SIZE + Math.round(px) + x) * 3;
    for (let c = 0; c < 3; c++) { const v = (rgba[(y0 * w + x0) * 4 + c] * (1 - tx) + rgba[(y0 * w + x1) * 4 + c] * tx) * (1 - ty) + (rgba[(y1 * w + x0) * 4 + c] * (1 - tx) + rgba[(y1 * w + x1) * 4 + c] * tx) * ty; input[o + c] = v / 127.5 - 1; } }
  const faces = decode(runNetwork(model, input), minScore), toSrcX = v => (v * SIZE - px) / sc, toSrcY = v => (v * SIZE - py) / sc;
  return faces.map(f => ({ score: f.score, box: { x: toSrcX(f.x), y: toSrcY(f.y), w: f.w * SIZE / sc, h: f.h * SIZE / sc }, keypoints: f.kp.map(k => ({ x: toSrcX(k.x), y: toSrcY(k.y) })) }));
}

/* rough shot size from how tall the largest face is compared with the frame (thresholds are estimates to calibrate on real footage) */
export function sizeFromFace(faceH, frameH) {
  const r = faceH / frameH; // face height as a fraction of frame height; thresholds calibrated on Kalki's own renders, so real footage may differ
  return r > .5 ? 'ECU' : r > .25 ? 'CU' : r > .16 ? 'MCU' : r > .09 ? 'MS' : r > .04 ? 'FS' : r > .015 ? 'WS' : 'EWS';
}

/* Small faces (medium and wide shots) are too small for one 128x128 pass, so look at the frame in square tiles as well:
   the whole frame, then squares as tall as the frame, then squares half as tall. A big face found early stops the search. */
export function detectFacesMulti(model, rgba, w, h, minScore = .5) {
  const found = [], crop = (x0, y0, cw, ch) => { const o = new Uint8Array(cw * ch * 4); for (let y = 0; y < ch; y++) o.set(rgba.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x0 + cw) * 4), y * cw * 4); return o; };
  const run = (x0, y0, cw, ch) => { for (const f of detectFaces(model, crop(x0, y0, cw, ch), cw, ch, minScore)) found.push({ ...f, box: { x: f.box.x + x0, y: f.box.y + y0, w: f.box.w, h: f.box.h }, keypoints: f.keypoints.map(k => ({ x: k.x + x0, y: k.y + y0 })) }); };
  run(0, 0, w, h);
  if (!found.some(f => f.box.h > h * .25)) {
    for (const side of [h, Math.round(h / 2)]) {
      const s = Math.min(side, w, h), nx = Math.max(1, Math.ceil((w - s) / (s * .6)) + 1), ny = Math.max(1, Math.ceil((h - s) / (s * .6)) + 1);
      for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) run(nx === 1 ? 0 : Math.round(ix * (w - s) / (nx - 1)), ny === 1 ? 0 : Math.round(iy * (h - s) / (ny - 1)), s, s);
    }
  }
  found.sort((a, b) => b.score - a.score);
  const keep = []; for (const f of found) if (keep.every(k => iou(k.box, f.box) < .3)) keep.push(f);
  return keep;
}
