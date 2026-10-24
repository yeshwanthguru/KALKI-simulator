/* Minimal dependency-free PDF 1.4 writer (Helvetica text, rules, rectangles, JPEG images)
   plus the shot-list layout used by the Export menu. Coordinates are in points, y measured from the top. */

const W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];

const SUBST = { 0x2013: '-', 0x2014: '-', 0x2018: "'", 0x2019: "'", 0x201c: '"', 0x201d: '"', 0x2022: '\x95', 0x2026: '...', 0xb7: '\xb7', 0xb0: '\xb0', 0x2248: '~', 0xd7: 'x' };
export const latin = s => {
  let o = '';
  for (const ch of String(s)) { const c = ch.codePointAt(0); o += c < 256 ? ch : (SUBST[c] || '?'); }
  return o.replace(/[\r\n\t]+/g, ' ');
};
const esc = s => latin(s).replace(/[\\()]/g, '\\$&');
const num = n => (Math.round(n * 100) / 100).toString();
const rgb = c => c.map(v => num(v / 255)).join(' ');

const NONLATIN = /[^\u0000-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u2248\u00d7]/;
export const needsRaster = s => NONLATIN.test(String(s));
export function textWidth(s, size, bold) {
  let w = 0;
  if (needsRaster(s)) { for (const ch of String(s)) w += ch.codePointAt(0) > 255 && !/[\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u2248\u00d7]/.test(ch) ? 620 : 556; return w * size / 1000 * (bold ? 1.06 : 1); }
  for (const ch of latin(s)) { const c = ch.charCodeAt(0); w += c >= 32 && c <= 126 ? W[c - 32] : 556; }
  return w * size / 1000 * (bold ? 1.06 : 1);
}

export function wrap(s, maxW, size, bold) {
  const out = []; let line = '';
  for (const word of (needsRaster(s) ? String(s).replace(/\s+/g, ' ') : latin(s)).split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (line && textWidth(t, size, bold) > maxW) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

/* wrap to at most n lines; if the text does not fit, the last line ends with "..." */
export function wrapMax(s, maxW, size, n, bold) {
  const l = wrap(s, maxW, size, bold);
  if (l.length <= n) return l;
  const r = l.slice(0, n); let t = r[n - 1];
  while (t && textWidth(t + '...', size, bold) > maxW) t = t.replace(/\s*\S+$/, '');
  r[n - 1] = t + '...';
  return r;
}

const bytes = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };

export class Pdf {
  constructor(w, h) { this.w = w; this.h = h; this.pages = []; this.images = []; this.cur = null; this.info = {}; }
  addPage() { this.cur = { ops: [], imgs: new Set() }; this.pages.push(this.cur); return this.cur; }
  text(x, y, s, { size = 10, bold = false, color = [0, 0, 0] } = {}) {
    if (this.raster && needsRaster(s)) { const r = this.raster(String(s), size, bold, color); this.image(r.data, r.w, r.h, x - 1, y - r.ascent, r.ptW, r.ptH); return; } // Tamil, Hindi and other scripts are drawn as images
    this.cur.ops.push(`BT /F${bold ? 2 : 1} ${num(size)} Tf ${rgb(color)} rg ${num(x)} ${num(this.h - y)} Td (${esc(s)}) Tj ET`);
  }
  rect(x, y, w, h, { fill, stroke, lw = 0.5 } = {}) {
    let op = '';
    if (fill) op += `${rgb(fill)} rg `;
    if (stroke) op += `${rgb(stroke)} RG ${num(lw)} w `;
    op += `${num(x)} ${num(this.h - y - h)} ${num(w)} ${num(h)} re ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`;
    this.cur.ops.push(op);
  }
  line(x1, y1, x2, y2, { color = [0, 0, 0], lw = 0.5, dash } = {}) {
    this.cur.ops.push(`q ${rgb(color)} RG ${num(lw)} w ${dash ? `[${dash.join(' ')}] 0 d ` : ''}${num(x1)} ${num(this.h - y1)} m ${num(x2)} ${num(this.h - y2)} l S Q`);
  }
  /* everything drawn until unclip() is cut off at this rectangle */
  clip(x, y, w, h) { this.cur.ops.push(`q ${num(x)} ${num(this.h - y - h)} ${num(w)} ${num(h)} re W n`); }
  unclip() { this.cur.ops.push('Q'); }
  /* closed polygon (or open polyline with open: true); points are [x, y] from the top */
  poly(pts, { fill, stroke, lw = 0.5, dash, open } = {}) {
    let op = 'q ';
    if (fill) op += `${rgb(fill)} rg `;
    if (stroke) op += `${rgb(stroke)} RG ${num(lw)} w `;
    if (dash) op += `[${dash.join(' ')}] 0 d `;
    op += pts.map(([x, y], i) => `${num(x)} ${num(this.h - y)} ${i ? 'l' : 'm'}`).join(' ');
    op += open ? ' S' : fill && stroke ? ' b' : fill ? ' f' : ' s';
    this.cur.ops.push(op + ' Q');
  }
  circle(cx, cy, r, { fill, stroke, lw = 0.5, dash } = {}) {
    const k = 0.5523 * r, X = cx, Y = this.h - cy;
    let op = 'q ';
    if (fill) op += `${rgb(fill)} rg `;
    if (stroke) op += `${rgb(stroke)} RG ${num(lw)} w `;
    if (dash) op += `[${dash.join(' ')}] 0 d `;
    op += `${num(X + r)} ${num(Y)} m ${num(X + r)} ${num(Y + k)} ${num(X + k)} ${num(Y + r)} ${num(X)} ${num(Y + r)} c ${num(X - k)} ${num(Y + r)} ${num(X - r)} ${num(Y + k)} ${num(X - r)} ${num(Y)} c ${num(X - r)} ${num(Y - k)} ${num(X - k)} ${num(Y - r)} ${num(X)} ${num(Y - r)} c ${num(X + k)} ${num(Y - r)} ${num(X + r)} ${num(Y - k)} ${num(X + r)} ${num(Y)} c`;
    op += fill && stroke ? ' b' : fill ? ' f' : ' s';
    this.cur.ops.push(op + ' Q');
  }
  image(jpeg, jw, jh, x, y, w, h) {
    let i = this.images.findIndex(im => im.data === jpeg);
    if (i < 0) { this.images.push({ data: jpeg, w: jw, h: jh }); i = this.images.length - 1; }
    this.cur.imgs.add(i);
    this.cur.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(this.h - y - h)} cm /Im${i} Do Q`);
  }
  build() {
    const chunks = [], offs = []; let pos = 0;
    const put = d => { const u = typeof d === 'string' ? bytes(d) : d; chunks.push(u); pos += u.length; };
    const obj = (n, body, stream) => {
      offs[n] = pos;
      put(`${n} 0 obj\n${body}\n`);
      if (stream) { put('stream\n'); put(stream); put('\nendstream\n'); }
      put('endobj\n');
    };
    const imgBase = 5, pageBase = imgBase + this.images.length, count = pageBase + this.pages.length * 2 - 1;
    put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Count ${this.pages.length} /Kids [${this.pages.map((_, i) => `${pageBase + i * 2} 0 R`).join(' ')}] >>`);
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    this.images.forEach((im, i) => obj(imgBase + i, `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>`, im.data));
    this.pages.forEach((p, i) => {
      const n = pageBase + i * 2, content = bytes(p.ops.join('\n'));
      const xo = [...p.imgs].map(k => `/Im${k} ${imgBase + k} 0 R`).join(' ');
      obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.w} ${this.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xo} >> >> /Contents ${n + 1} 0 R >>`);
      obj(n + 1, `<< /Length ${content.length} >>`, content);
    });
    const xref = pos;
    put(`xref\n0 ${count + 1}\n0000000000 65535 f \n`);
    for (let n = 1; n <= count; n++) put(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
    put(`trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(pos); let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }
}

/* ---------- shot-list layout ---------- */
const INK = [24, 24, 30], MUTED = [110, 112, 125], RULE = [210, 212, 220], ACCENT = [232, 108, 52], HEAD = [244, 245, 248];

/* doc: { title, meta: [string], shots: [{ n, name, move, why, start, duration, lens, eq, fstop, size, height, angle, subject, action, amount, easing,
          jpeg?: Uint8Array, jw?, jh? }], aspect, footer } */
export function buildShotListPdf(doc) {
  const pdf = new Pdf(842, 595); pdf.raster = doc.raster; const M = 36, ROW = 82, TOP = 112, BOTTOM = 595 - 44;
  const cols = [{ k: 'Frame', w: 134 }, { k: 'Shot', w: 200 }, { k: 'Timing', w: 78 }, { k: 'Lens', w: 96 }, { k: 'Framing', w: 138 }, { k: 'Subject', w: 124 }];
  const perPage = Math.max(1, Math.floor((BOTTOM - TOP) / ROW)), pages = Math.max(1, Math.ceil(doc.shots.length / perPage));
  for (let p = 0; p < pages; p++) {
    pdf.addPage();
    pdf.rect(0, 0, 842, 8, { fill: ACCENT });
    pdf.text(M, 48, doc.title || 'Untitled scene', { size: 20, bold: true, color: INK });
    pdf.text(M, 66, 'SHOT LIST', { size: 8.5, bold: true, color: ACCENT });
    pdf.text(M, 82, doc.meta.join('   |   '), { size: 8.5, color: MUTED });
    let x = M; const hy = TOP - 18;
    pdf.rect(M, hy, 770, 16, { fill: HEAD });
    for (const c of cols) { pdf.text(x + 6, hy + 11, c.k.toUpperCase(), { size: 7, bold: true, color: MUTED }); x += c.w; }
    doc.shots.slice(p * perPage, (p + 1) * perPage).forEach((s, r) => {
      const y = TOP + r * ROW; let cx = M;
      pdf.line(M, y + ROW - 2, M + 770, y + ROW - 2, { color: RULE });
      /* frame */
      const bw = 118, bh = ROW - 12, ar = doc.aspect || 1.778; let fw = bw, fh = bw / ar; if (fh > bh) { fh = bh; fw = bh * ar; }
      const fx = cx + 6, fy = y + 4;
      if (s.jpeg) pdf.image(s.jpeg, s.jw, s.jh, fx, fy, fw, fh); else pdf.rect(fx, fy, fw, fh, { fill: HEAD, stroke: RULE });
      pdf.rect(fx, fy, fw, fh, { stroke: RULE });
      cx += cols[0].w;
      /* shot */
      pdf.text(cx + 6, y + 14, `${s.n}. ${s.name}`, { size: 10.5, bold: true, color: INK });
      pdf.text(cx + 6, y + 27, s.move, { size: 9, bold: true, color: ACCENT });
      wrapMax(s.why, cols[1].w - 12, 7.5, 2).forEach((ln, i) => pdf.text(cx + 6, y + 39 + i * 9, ln, { size: 7.5, color: MUTED }));
      if (s.notes) wrapMax('Note: ' + s.notes, cols[1].w - 12, 7.5, 2).forEach((ln, i) => pdf.text(cx + 6, y + 61 + i * (needsRaster(s.notes) ? 10.5 : 9), ln, { size: 7.5, color: INK }));
      cx += cols[1].w;
      /* timing */
      pdf.text(cx + 6, y + 14, s.start, { size: 10, bold: true, color: INK });
      pdf.text(cx + 6, y + 27, `${s.duration} s`, { size: 9, color: INK });
      pdf.text(cx + 6, y + 39, s.easing, { size: 7.5, color: MUTED });
      cx += cols[2].w;
      /* lens */
      pdf.text(cx + 6, y + 14, `${s.lens} mm`, { size: 10, bold: true, color: INK });
      pdf.text(cx + 6, y + 27, s.eq ? `~${s.eq} mm FF equiv.` : '', { size: 7.5, color: MUTED });
      pdf.text(cx + 6, y + 39, `f/${s.fstop}`, { size: 9, color: INK });
      cx += cols[3].w;
      /* framing */
      pdf.text(cx + 6, y + 14, s.size, { size: 10, bold: true, color: INK });
      pdf.text(cx + 6, y + 27, s.height, { size: 9, color: INK });
      pdf.text(cx + 6, y + 39, `Angle ${s.angle} deg`, { size: 7.5, color: MUTED });
      cx += cols[4].w;
      /* subject */
      pdf.text(cx + 6, y + 14, s.subject, { size: 10, bold: true, color: INK });
      let ay = y + 25; for (const ln of (s.actions || [s.action || ''])) for (const w of wrapMax(ln, cols[5].w - 12, 7.5, 2)) { pdf.text(cx + 6, ay, w, { size: 7.5, color: INK }); ay += 8.5; }
      pdf.text(cx + 6, y + 70, `Move intensity ${s.amount}%`, { size: 7, color: MUTED });
    });
    pdf.line(M, 595 - 34, M + 770, 595 - 34, { color: RULE });
    pdf.text(M, 595 - 20, doc.footer || '', { size: 7.5, color: MUTED });
    const pg = `Page ${p + 1} / ${pages}`;
    pdf.text(M + 770 - textWidth(pg, 7.5), 595 - 20, pg, { size: 7.5, color: MUTED });
  }
  return pdf.build();
}

/* ---------- storyboard sheet ---------- */
/* doc as for buildShotListPdf. The grid adapts to the frame aspect ratio. */
export function buildStoryboardPdf(doc) {
  const pdf = new Pdf(842, 595); pdf.raster = doc.raster; const M = 36, TOP = 100, BOTTOM = 595 - 44, ar = doc.aspect || 1.778;
  const cols = ar >= 1.5 ? 3 : ar >= 1 ? 5 : 6, gap = 12, cw = (770 - gap * (cols - 1)) / cols, fh = cw / ar, CAP = 50, cellH = fh + CAP + 10;
  const rows = Math.max(1, Math.floor((BOTTOM - TOP + 10) / cellH)), perPage = cols * rows, pages = Math.max(1, Math.ceil(doc.shots.length / perPage));
  for (let p = 0; p < pages; p++) {
    pdf.addPage();
    pdf.rect(0, 0, 842, 8, { fill: ACCENT });
    pdf.text(M, 48, doc.title || 'Untitled scene', { size: 20, bold: true, color: INK });
    pdf.text(M, 66, 'STORYBOARD', { size: 8.5, bold: true, color: ACCENT });
    pdf.text(M, 82, doc.meta.join('   |   '), { size: 8.5, color: MUTED });
    doc.shots.slice(p * perPage, (p + 1) * perPage).forEach((s, k) => {
      const x = M + (k % cols) * (cw + gap), y = TOP + Math.floor(k / cols) * cellH;
      if (s.jpeg) pdf.image(s.jpeg, s.jw, s.jh, x, y, cw, fh); else pdf.rect(x, y, cw, fh, { fill: HEAD });
      pdf.rect(x, y, cw, fh, { stroke: RULE });
      const tag = String(s.n); pdf.rect(x, y, textWidth(tag, 9, true) + 12, 15, { fill: ACCENT });
      pdf.text(x + 6, y + 11, tag, { size: 9, bold: true, color: [255, 255, 255] });
      const fit = (t, size, bold) => { let o = needsRaster(t) ? String(t) : latin(t); while (o.length > 1 && textWidth(o, size, bold) > cw) o = o.slice(0, -2) + '.'; return o; };
      pdf.text(x, y + fh + 13, fit(s.name, 9.5, true), { size: 9.5, bold: true, color: INK });
      pdf.text(x, y + fh + 24, fit(`${s.move}  |  ${s.lens} mm  |  ${s.sizeCode || s.size}  |  ${s.duration} s`, 7.5), { size: 7.5, color: ACCENT });
      wrapMax(s.notes || s.why, cw, 7.5, 2).forEach((ln, i) => pdf.text(x, y + fh + 35 + i * (needsRaster(s.notes || s.why) ? 10.5 : 9), ln, { size: 7.5, color: s.notes ? INK : MUTED }));
    });
    pdf.line(M, 595 - 34, M + 770, 595 - 34, { color: RULE });
    pdf.text(M, 595 - 20, doc.footer || '', { size: 7.5, color: MUTED });
    const pg = `Page ${p + 1} / ${pages}`;
    pdf.text(M + 770 - textWidth(pg, 7.5), 595 - 20, pg, { size: 7.5, color: MUTED });
  }
  return pdf.build();
}

/* ---------- blocking diagram (top-down) ---------- */
/* doc: { title, meta, footer, aspect, floor: {x0, x1, z0, z1}, wallZ,
          shots: [{ n, name, move, lens, sizeCode, duration, actions: [textA, textB],
                    actors: [{ k: 'A'|'B', x0, z0, x1, z1, face0, face1, walk }],
                    cam: { pts: [[x, z]...], tgx0, tgz0, tgx1, tgz1, hfov0, hfov1 } }] }
   World x runs left to right, world z runs towards the audience (drawn downwards). */
export function buildBlockingPdf(doc) {
  const pdf = new Pdf(842, 595); pdf.raster = doc.raster; const M = 36, TOP = 100, BOTTOM = 595 - 44, GAP = 14, cols = 3, cw = (770 - GAP * (cols - 1)) / cols, MAPH = 168, CAP = 44, cellH = MAPH + CAP + 8;
  const rows = Math.max(1, Math.floor((BOTTOM - TOP + 8) / cellH)), perPage = cols * rows, pages = Math.max(1, Math.ceil(doc.shots.length / perPage));
  /* one shared world window so every cell uses the same scale: zoomed to the actors and the camera start points
     (at least 10 m wide); the rest of the floor and long camera paths are clipped at the cell edge */
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const grow = (x, z) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); };
  for (const s of doc.shots) { grow(s.cam.pts[0][0], s.cam.pts[0][1]); s.actors.forEach(a => { grow(a.x0, a.z0); grow(a.x1, a.z1); }); }
  x0 -= 1.4; x1 += 1.4; z0 -= 1.4; z1 += 1.4;
  const minW = 10, minH = minW * MAPH / cw;
  if (x1 - x0 < minW) { const m = (x0 + x1) / 2; x0 = m - minW / 2; x1 = m + minW / 2; }
  if (z1 - z0 < minH) { const m = (z0 + z1) / 2; z0 = m - minH / 2; z1 = m + minH / 2; }
  const sc = Math.min(cw / (x1 - x0), MAPH / (z1 - z0)), offx = (cw - (x1 - x0) * sc) / 2, offy = (MAPH - (z1 - z0) * sc) / 2;
  const COLOR = { A: ACCENT, B: [42, 141, 132] };
  for (let p = 0; p < pages; p++) {
    pdf.addPage();
    pdf.rect(0, 0, 842, 8, { fill: ACCENT });
    pdf.text(M, 48, doc.title || 'Untitled scene', { size: 20, bold: true, color: INK });
    pdf.text(M, 66, 'BLOCKING DIAGRAM  (view from above, audience at the bottom)', { size: 8.5, bold: true, color: ACCENT });
    pdf.text(M, 82, doc.meta.join('   |   '), { size: 8.5, color: MUTED });
    doc.shots.slice(p * perPage, (p + 1) * perPage).forEach((s, k) => {
      const cx = M + (k % cols) * (cw + GAP), cy = TOP + Math.floor(k / cols) * cellH;
      const X = x => cx + offx + (x - x0) * sc, Y = z => cy + offy + (z - z0) * sc;
      /* floor and grid */
      pdf.rect(cx, cy, cw, MAPH, { fill: [250, 248, 244] });
      pdf.clip(cx, cy, cw, MAPH);
      pdf.rect(X(doc.floor.x0), Y(doc.floor.z0), (doc.floor.x1 - doc.floor.x0) * sc, (doc.floor.z1 - doc.floor.z0) * sc, { fill: [240, 232, 220], stroke: [205, 195, 180] });
      for (let gx = Math.ceil(doc.floor.x0 / 2) * 2; gx <= doc.floor.x1; gx += 2) pdf.line(X(gx), Y(doc.floor.z0), X(gx), Y(doc.floor.z1), { color: [226, 216, 202], lw: .4 });
      for (let gz = Math.ceil(doc.floor.z0 / 2) * 2; gz <= doc.floor.z1; gz += 2) pdf.line(X(doc.floor.x0), Y(gz), X(doc.floor.x1), Y(gz), { color: [226, 216, 202], lw: .4 });
      pdf.line(X(doc.floor.x0), Y(doc.wallZ), X(doc.floor.x1), Y(doc.wallZ), { color: [120, 100, 80], lw: 2 });
      pdf.text(X(doc.floor.x0) + 3, Y(doc.wallZ) - 3, 'back wall', { size: 6, color: [150, 130, 110] });
      const c = s.cam;
      /* camera view cones: start filled, end outlined */
      const cone = (px, pz, tx, tz, hfov, o) => {
        const dir = Math.atan2(tx - px, tz - pz), len = Math.max(1.5, Math.min(7, Math.hypot(tx - px, tz - pz) * 1.35)), h = hfov * Math.PI / 360;
        const pt = a => [X(px + Math.sin(dir + a) * len), Y(pz + Math.cos(dir + a) * len)];
        pdf.poly([[X(px), Y(pz)], pt(-h), pt(h)], o);
      };
      cone(c.pts[0][0], c.pts[0][1], c.tgx0, c.tgz0, c.hfov0, { fill: [255, 226, 205], stroke: [235, 150, 100], lw: .6 });
      const L = c.pts.length - 1;
      if (Math.hypot(c.pts[L][0] - c.pts[0][0], c.pts[L][1] - c.pts[0][1]) > .05 || Math.abs(c.hfov1 - c.hfov0) > .5) cone(c.pts[L][0], c.pts[L][1], c.tgx1, c.tgz1, c.hfov1, { stroke: [235, 150, 100], lw: .6, dash: [3, 2] });
      /* camera path */
      if (L > 0) { pdf.poly(c.pts.map(q => [X(q[0]), Y(q[1])]), { stroke: INK, lw: 1, open: true }); const a = c.pts[Math.max(0, L - 3)], b = c.pts[L]; const ang = Math.atan2(X(b[0]) - X(a[0]), Y(b[1]) - Y(a[1])); pdf.poly([[X(b[0]) + Math.sin(ang) * 5, Y(b[1]) + Math.cos(ang) * 5], [X(b[0]) + Math.sin(ang + 2.5) * 4, Y(b[1]) + Math.cos(ang + 2.5) * 4], [X(b[0]) + Math.sin(ang - 2.5) * 4, Y(b[1]) + Math.cos(ang - 2.5) * 4]], { fill: INK }); }
      /* camera body at the start */
      const cp = c.pts[0], cd = Math.atan2(c.tgx0 - cp[0], c.tgz0 - cp[1]), q = (fwd, side) => [X(cp[0]) + Math.sin(cd) * fwd + Math.cos(cd) * side, Y(cp[1]) + Math.cos(cd) * fwd - Math.sin(cd) * side];
      pdf.poly([q(-5, -4), q(-5, 4), q(3, 4), q(3, -4)], { fill: INK });
      pdf.poly([q(3, -3), q(3, 3), q(8, 6), q(8, -6)], { fill: INK });
      /* actors */
      for (const a of s.actors) {
        const col = COLOR[a.k], r = .32 * sc;
        if (a.walk) {
          pdf.circle(X(a.x0), Y(a.z0), r, { stroke: col, lw: 1, dash: [2, 2] });
          pdf.line(X(a.x0), Y(a.z0), X(a.x1), Y(a.z1), { color: col, lw: 1.2, dash: [4, 3] });
        }
        const ex = a.walk ? a.x1 : a.x0, ez = a.walk ? a.z1 : a.z0, f = a.walk ? a.face1 : a.face0;
        pdf.circle(X(ex), Y(ez), r, { fill: col, stroke: [255, 255, 255], lw: .8 });
        const tip = [X(ex) + Math.sin(f) * (r + 5), Y(ez) + Math.cos(f) * (r + 5)], bl = [X(ex) + Math.sin(f + 1.1) * r * .95, Y(ez) + Math.cos(f + 1.1) * r * .95], br = [X(ex) + Math.sin(f - 1.1) * r * .95, Y(ez) + Math.cos(f - 1.1) * r * .95];
        pdf.poly([tip, bl, br], { fill: col });
        pdf.text(X(ex) - 2.2, Y(ez) + 2.3, a.k === 'A' ? 'M' : 'A', { size: 6.5, bold: true, color: [255, 255, 255] });
      }
      pdf.unclip();
      pdf.rect(cx, cy, cw, MAPH, { stroke: RULE });
      /* caption */
      const tag = String(s.n); pdf.rect(cx, cy, textWidth(tag, 9, true) + 12, 15, { fill: ACCENT });
      pdf.text(cx + 6, cy + 11, tag, { size: 9, bold: true, color: [255, 255, 255] });
      const fit = (t, size, bold) => { let o = needsRaster(t) ? String(t) : latin(t); while (o.length > 1 && textWidth(o, size, bold) > cw) o = o.slice(0, -2) + '.'; return o; };
      pdf.text(cx, cy + MAPH + 13, fit(s.name, 9.5, true), { size: 9.5, bold: true, color: INK });
      pdf.text(cx, cy + MAPH + 24, fit(`${s.move}  |  ${s.lens} mm  |  ${s.sizeCode}  |  ${s.duration} s`, 7.5), { size: 7.5, color: ACCENT });
      pdf.text(cx, cy + MAPH + 34, fit(s.actions.join('   '), 7.5), { size: 7.5, color: MUTED });
    });
    /* legend */
    const lg = 595 - 52; pdf.rect(M, lg - 7, 9, 9, { fill: ACCENT }); pdf.text(M + 13, lg, 'Meera', { size: 7.5, color: MUTED });
    pdf.rect(M + 55, lg - 7, 9, 9, { fill: [42, 141, 132] }); pdf.text(M + 68, lg, 'Arjun', { size: 7.5, color: MUTED });
    pdf.rect(M + 108, lg - 7, 9, 9, { fill: INK }); pdf.text(M + 121, lg, 'Camera (start)', { size: 7.5, color: MUTED });
    pdf.line(M + 190, lg - 2.5, M + 210, lg - 2.5, { color: INK, lw: 1 }); pdf.text(M + 214, lg, 'Camera path', { size: 7.5, color: MUTED });
    pdf.line(M + 275, lg - 2.5, M + 295, lg - 2.5, { color: ACCENT, lw: 1.2, dash: [4, 3] }); pdf.text(M + 299, lg, 'Actor movement', { size: 7.5, color: MUTED });
    pdf.line(M, 595 - 34, M + 770, 595 - 34, { color: RULE });
    pdf.text(M, 595 - 20, doc.footer || '', { size: 7.5, color: MUTED });
    const pg = `Page ${p + 1} / ${pages}`;
    pdf.text(M + 770 - textWidth(pg, 7.5), 595 - 20, pg, { size: 7.5, color: MUTED });
  }
  return pdf.build();
}
