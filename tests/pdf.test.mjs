// Structural test for src/pdf.js: builds a multi-page shot list and verifies the xref table and objects.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { buildShotListPdf, buildStoryboardPdf, textWidth, wrap, latin } from '../src/pdf.js';

const jpeg = new Uint8Array(await sharp({ create: { width: 64, height: 36, channels: 3, background: '#c85' } }).jpeg().toBuffer());
const shot = n => ({ n, name: 'Shot ' + n + ' (café) — “quotes”', move: 'Push in', why: 'A slow push-in tightens attention on the performer and builds intensity.', start: '00:00:00', duration: 4, lens: 50, eq: 73, fstop: 2.8, size: 'Medium', height: 'Eye level', angle: 15, subject: 'Meera', action: 'idle', amount: 60, easing: 'smooth', jpeg, jw: 64, jh: 36 });
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
assert.equal(latin('கல்கி ok'), '????? ok'.replace('?????', latin('கல்கி')));
for (const [aspect, perPage] of [[2.39, 6], [1.778, 6], [1, 10], [0.5625, 6]]) {
  const doc = { title: 'Board', meta: ['x'], aspect, footer: 'f', shots: Array.from({ length: 13 }, (_, i) => ({ ...shot(i + 1), notes: 'Keep Meera in the right third; hold the sip before the cut.' })) };
  const b = Buffer.from(buildStoryboardPdf(doc)).toString('latin1');
  assert.equal((b.match(/\/Type \/Page /g) || []).length, Math.ceil(13 / perPage), 'storyboard pages at aspect ' + aspect);
  assert.ok(b.trimEnd().endsWith('%%EOF'));
}
fs.mkdirSync('tests/out', { recursive: true });
fs.writeFileSync('tests/out/sample-shotlist.pdf', bin);
console.log('pdf ok:', bin.length, 'bytes,', pages, 'pages');
