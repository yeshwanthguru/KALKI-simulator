// Structural test for src/pdf.js: builds a multi-page shot list and verifies the xref table and objects.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { buildAnalysisPdf, buildShotListPdf, buildStoryboardPdf, buildBlockingPdf, textWidth, wrap, wrapMax, latin, needsRaster } from '../src/pdf.js';

const jpeg = new Uint8Array(await sharp({ create: { width: 64, height: 36, channels: 3, background: '#c85' } }).jpeg().toBuffer());
const shot = n => ({ n, name: 'Shot ' + n + ' (café) — “quotes”', move: 'Push in', why: 'A slow push-in tightens attention on the performer and builds intensity.', start: '00:00:00', duration: 4, lens: 50, eq: 73, fstop: 2.8, size: 'Medium', height: 'Eye level', angle: 15, subject: 'Meera', actions: ['Meera: Sitting', 'Arjun: Sipping chai'], amount: 60, easing: 'smooth', jpeg, jw: 64, jh: 36 });
const bin = buildShotListPdf({ title: 'Test (scene)', meta: ['2.39:1', 'Golden hour'], aspect: 2.39, footer: 'Made with Kalki Simulator', shots: Array.from({ length: 12 }, (_, i) => shot(i + 1)) });
const s = Buffer.from(bin).toString('latin1');

/* the rig name is printed next to the move, and a very long one is cut with an ellipsis instead of overflowing */
{
  const withRig = Buffer.from(buildShotListPdf({ title: 'Rig', meta: ['x'], aspect: 2.39, footer: 'f', shots: [{ ...shot(1), rig: 'Dolly + track' }, { ...shot(2), rig: 'A very long rig name that cannot possibly fit in the move column of the sheet' }] })).toString('latin1');
  assert.ok(withRig.includes('Dolly'), 'rig name is in the PDF');
  assert.ok(withRig.includes('...'), 'a long rig name is shortened');
}
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

/* document theme: accent colour, logo and translated headings */
{
  const logoJpeg = new Uint8Array(await sharp({ create: { width: 90, height: 30, channels: 3, background: '#06c' } }).jpeg().toBuffer());
  const doc = { title: 'Themed', meta: ['x'], aspect: 2.39, footer: 'f', shots: [shot(1)], accent: [42, 141, 132], t: s => (s === 'Shot list' ? 'Xlist' : s), logo: { jpeg: logoJpeg, jw: 90, jh: 30 } };
  const themed = Buffer.from(buildShotListPdf(doc)).toString('latin1'), plain = Buffer.from(buildShotListPdf({ ...doc, accent: undefined, logo: undefined, t: undefined, shots: [shot(1)] })).toString('latin1');
  assert.ok(themed.includes('0.16 0.55 0.52 rg') && !themed.includes('0.91 0.42 0.2 rg'), 'accent colour is used'); assert.ok(plain.includes('0.91 0.42 0.2 rg'), 'default accent comes back (the theme is not sticky)');
  assert.ok(themed.includes('XLIST') && plain.includes('SHOT LIST'), 'heading words are translated'); assert.ok((themed.match(/\/Subtype \/Image/g) || []).length === 2 && (plain.match(/\/Subtype \/Image/g) || []).length === 1, 'the logo is embedded');
  for (const f of [buildStoryboardPdf, buildBlockingPdf]) assert.ok(Buffer.from(f({ title: 'T', meta: ['m'], aspect: 1.78, footer: 'f', shots: [], floor: { x0: -8, x1: 8, z0: -6, z1: 6 }, wallZ: -4.3, accent: [1, 2, 3], logo: { jpeg: logoJpeg, jw: 90, jh: 30 } })).toString('latin1').startsWith('%PDF'));
}
/* reference-video analysis report: paginates a long shot table, keeps the structure valid and embeds each thumbnail once */
{
  const rows = Array.from({ length: 30 }, (_, i) => ({ n: i + 1, at: '0:' + String(i).padStart(2, '0'), len: '2.5 s', tech: 'Push in (forward) + handheld shake and a very long technique description that has to be cut', intensity: '60%', easing: 'smooth', conf: 80, jpeg, jw: 64, jh: 36, secs: 1 + i % 5 }));
  const bin = buildAnalysisPdf({ avg: 3, title: 'Clip (test)', subtitle: '1280x720 | 0:30', cards: [['Shots', 30], ['Pace', 'fast']], shots: rows, techniques: [{ name: 'Push in', shots: 'shots 1, 2', why: 'Moving closer pulls the audience in. '.repeat(8) }], tips: [{ rule: 'Match the pace', text: 'Shorten shots. '.repeat(30) }], note: 'Estimates only.', footer: 'Made with Kalki Simulator' });
  const t = Buffer.from(bin).toString('latin1');
  assert.ok(t.startsWith('%PDF-1.4') && t.trimEnd().endsWith('%%EOF'));
  const pages = (t.match(/\/Type \/Page /g) || []).length; assert.ok(pages >= 3, 'a 30-shot report needs several pages, got ' + pages);
  assert.equal((t.match(/\/Subtype \/Image/g) || []).length, 1, 'identical thumbnails are embedded once');
  const st = +/startxref\n(\d+)/.exec(t)[1], size = +/\/Size (\d+)/.exec(t)[1];
  t.slice(st).split('\n').slice(3, 3 + size - 1).forEach((e, i) => assert.ok(t.slice(+e.slice(0, 10)).startsWith(`${i + 1} 0 obj`), 'analysis xref entry ' + (i + 1)));
  assert.ok(t.includes('Page 1 / ' + pages), 'page numbers are added');
  const empty = Buffer.from(buildAnalysisPdf({ title: 'Empty', shots: [] })).toString('latin1'); assert.ok(empty.startsWith('%PDF-1.4'));
  console.log('analysis pdf ok: ' + pages + ' pages');
}
