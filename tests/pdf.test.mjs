// Structural test for src/pdf.js: builds a multi-page shot list and verifies the xref table and objects.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { buildShotListPdf, buildStoryboardPdf, buildBlockingPdf, textWidth, wrap, wrapMax, latin, needsRaster } from '../src/pdf.js';

const jpeg = new Uint8Array(await sharp({ create: { width: 64, height: 36, channels: 3, background: '#c85' } }).jpeg().toBuffer());
const shot = n => ({ n, name: 'Shot ' + n + ' (café) — “quotes”', move: 'Push in', why: 'A slow push-in tightens attention on the performer and builds intensity.', start: '00:00:00', duration: 4, lens: 50, eq: 73, fstop: 2.8, size: 'Medium', height: 'Eye level', angle: 15, subject: 'Meera', actions: ['Meera: Sitting', 'Arjun: Sipping chai'], amount: 60, easing: 'smooth', jpeg, jw: 64, jh: 36 });
const bin = buildShotListPdf({ title: 'Test (scene)', meta: ['2.39:1', 'Golden hour'], aspect: 2.39, footer: 'Made with Kalki Simulator', shots: Array.from({ length: 12 }, (_, i) => shot(i + 1)) });
const s = Buffer.from(bin).toString('latin1');

assert.ok(s.startsWith('%PDF-1.4'));
assert.ok(s.trimEnd().endsWith('%%EOF'));
const pages = (s.match(/\/Type \/Page /g) || []).length;
assert.equal(pages, 3, '12 shots at 5 per page -> 3 pages');
const start = +/startxref\n(\d+)/.exec(s)[1];
assert.ok(s.slice(start).startsWith('xref'));
const size = +/\/Size (\d+)/.exec(s)[1];
const entries = s.slice(start).split('\n').slice(3, 3 + size - 1);
entries.forEach((e, i) => { const off = +e.slice(0, 10); assert.ok(s.slice(off).startsWith(`${i + 1} 0 obj`), `xref entry ${i + 1}`); });
assert.ok(s.includes('/DCTDecode'));
assert.equal((s.match(/\/Subtype \/Image/g) || []).length, 1, 'identical thumbnail data is embedded once');
assert.ok(textWidth('Hello', 10) > 20 && textWidth('Hello', 10) < 40);
assert.deepEqual(wrap('aaa bbb ccc', textWidth('aaa bbb', 10) + 1, 10), ['aaa bbb', 'ccc']);
const cut = wrapMax('one two three four five six seven eight nine ten', textWidth('one two three', 10) + 1, 10, 2);
assert.equal(cut.length, 2);
assert.ok(cut[1].endsWith('...') && textWidth(cut[1], 10) <= textWidth('one two three', 10) + 1);
assert.deepEqual(wrapMax('short', 200, 10, 2), ['short']);
assert.equal(latin('கல்கி ok'), '????? ok'.replace('?????', latin('கல்கி')));
for (const [aspect, perPage] of [[2.39, 6], [1.778, 6], [1, 10], [0.5625, 6]]) {
  const doc = { title: 'Board', meta: ['x'], aspect, footer: 'f', shots: Array.from({ length: 13 }, (_, i) => ({ ...shot(i + 1), notes: 'Keep Meera in the right third; hold the sip before the cut.' })) };
  const b = Buffer.from(buildStoryboardPdf(doc)).toString('latin1');
  assert.equal((b.match(/\/Type \/Page /g) || []).length, Math.ceil(13 / perPage), 'storyboard pages at aspect ' + aspect);
  assert.ok(b.trimEnd().endsWith('%%EOF'));
}
{
  const cam = (x, z) => ({ pts: [[x, z], [x + 1, z - 1], [x + 2, z - 2]], tgx0: 0, tgz0: 0, tgx1: 1, tgz1: 0, hfov0: 40, hfov1: 30 });
  const shotB = n => ({ n, name: 'Block ' + n, move: 'Orbit', lens: 35, sizeCode: 'WS', duration: 4, actions: ['Meera: Sitting', 'Arjun: Walking across'], actors: [{ k: 'A', x0: -1, z0: 0, x1: -1, z1: 0, face0: .5, face1: .5, walk: false }, { k: 'B', x0: 1, z0: 1, x1: 3, z1: 1, face0: 1.5, face1: 1.5, walk: true }], cam: cam(0, 6) });
  const b = Buffer.from(buildBlockingPdf({ title: 'Blocking', meta: ['x'], footer: 'f', floor: { x0: -8, x1: 8, z0: -6, z1: 6 }, wallZ: -4.3, shots: Array.from({ length: 8 }, (_, i) => shotB(i + 1)) })).toString('latin1');
  assert.equal((b.match(/\/Type \/Page /g) || []).length, 2, '8 shots at 6 per page -> 2 pages');
  assert.ok(b.trimEnd().endsWith('%%EOF') && b.includes(' c ') && b.includes('[4 3] 0 d'));
}
{
  /* non-Latin text goes through the raster hook (the app draws it on a canvas); without the hook it falls back to '?' */
  const lineJpeg = new Uint8Array(await sharp({ create: { width: 30, height: 12, channels: 3, background: '#fff' } }).jpeg().toBuffer());
  let calls = 0; const raster = (text, size) => { calls++; return { data: lineJpeg, w: 30, h: 12, ptW: 10, ptH: 4, ascent: size }; };
  const tamil = { ...shot(1), name: 'தேநீர்க் கடை', notes: 'हिन्दी नोट' };
  const withHook = Buffer.from(buildShotListPdf({ title: 'கல்கி', meta: ['x'], aspect: 2.39, footer: 'f', raster, shots: [tamil] })).toString('latin1');
  const without = Buffer.from(buildShotListPdf({ title: 'கல்கி', meta: ['x'], aspect: 2.39, footer: 'f', shots: [tamil] })).toString('latin1');
  assert.ok(calls >= 3, 'title, shot name and notes were rastered, got ' + calls);
  assert.ok((withHook.match(/\/Subtype \/Image/g) || []).length >= 2 && withHook.trimEnd().endsWith('%%EOF'));
  assert.ok(/\(\?+\)/.test(without) && !/\/Im1 /.test(without), 'no hook: question marks, no extra images');
  assert.ok(needsRaster('தமிழ்') && needsRaster('हिन्दी') && !needsRaster('Café “quoted” — ok') && textWidth('தமிழ்', 10) > textWidth('abc', 10));
  assert.deepEqual(wrap('தமிழ் வணக்கம் உலகம்', textWidth('தமிழ் வணக்கம்', 10) + 1, 10), ['தமிழ் வணக்கம்', 'உலகம்'], 'Indic text wraps on its own words');
}
fs.mkdirSync('tests/out', { recursive: true });
fs.writeFileSync('tests/out/sample-shotlist.pdf', bin);
console.log('pdf ok:', bin.length, 'bytes,', pages, 'pages');
