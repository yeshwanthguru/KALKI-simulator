// End-to-end test of the reference-video pipeline in headless Edge/Chrome: the committed test clip docs/samples/street-scene-test-clip.webm
// (3 s pan, cut, 3 s zoom in, cut, 2.5 s hold; regenerate with tools/make-test-clip.mjs) goes through the app's own importer, which decodes it, seeks through it, finds the shots and classifies the camera moves.
// Usage: node build.mjs && node tests/video-e2e.mjs [html]
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const candidates = [process.env.EDGE, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
if (!candidates.some(p => fs.existsSync(p))) { console.log('video e2e: no Chromium-based browser found (set EDGE=<path>); skipped'); process.exit(0); }
const page = path.resolve(process.argv[2] || 'dist/Kalki.html');
if (!fs.existsSync(page)) { console.error('video e2e: build first (node build.mjs)'); process.exit(1); }

const clipPath = path.resolve('docs/samples/street-scene-test-clip.webm');
if (!fs.existsSync(clipPath)) { console.error('video e2e: missing ' + clipPath + ' (create it with: node tools/make-test-clip.mjs docs/samples/street-scene-test-clip.webm)'); process.exit(1); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalki-e2e-')), script = path.join(dir, 'e2e.js');
fs.writeFileSync(script, `const blob = await (await fetch('data:video/webm;base64,${fs.readFileSync(clipPath).toString('base64')}')).blob();
const file = new File([blob], 'street-scene-test-clip.webm', { type: 'video/webm' }), t1 = performance.now(), out = await window.__kalki.analyse(file);
const ui = await window.__kalki.reportUi(file), pdf = await window.__kalki.reportPdf(file);
return { ms: Math.round(performance.now() - t1), bytes: file.size, ...out, pdf, ui };`);
let code = 0;
try {
  const r = spawnSync(process.execPath, [path.resolve('tools/screenshot.mjs'), path.join(dir, 'unused.png'), script, '900', '600', page + '#e2e'], { encoding: 'utf8', timeout: 170000 });
  const line = (r.stdout || '').split('\n').find(l => l.startsWith('{'));
  if (!line) throw new Error('no result from the page' + (r.stderr ? ': ' + r.stderr.slice(0, 300) : r.error ? ': ' + r.error.message : ''));
  const o = JSON.parse(line);
  console.log(`clip ${Math.round(o.bytes / 1024)} KB, analysed in ${o.ms} ms:`, o.shots.map(s => `${s.move}(${s.dir}) ${s.start}s+${s.dur}s`).join(' | '));
  assert.equal(o.shots.length, 3, 'three shots expected');
  assert.equal(o.shots[0].move, 'pan'); assert.equal(o.shots[0].dir, -1, 'content slides right = camera pans left = dir -1');
  assert.ok(['zoom_in', 'push_in'].includes(o.shots[1].move), 'second shot is a zoom or push in, got ' + o.shots[1].move);
  assert.equal(o.shots[2].move, 'static');
  assert.ok(Math.abs(o.shots[0].dur - 3) < .5 && Math.abs(o.shots[1].dur - 3) < .5 && Math.abs(o.shots[2].dur - 2.5) < .6, 'shot lengths close to 3, 3 and 2.5 seconds');
  assert.equal(o.thumbs, 3);
  assert.deepEqual([o.ui.selects, o.ui.size0, o.ui.kept, o.ui.simSize], [o.ui.shots, 'CU', 'CU', 'CU'], 'the shot-size dropdown is saved and used by the simulation: ' + JSON.stringify(o.ui));
  assert.ok(o.pdf.head.startsWith('%PDF-1.4') && o.pdf.pages >= 1 && o.pdf.images >= 1 && o.pdf.bytes > 3000, 'analysis report PDF is built with thumbnails: ' + JSON.stringify(o.pdf));
  console.log('video e2e ok');
} catch (e) { console.error('video e2e FAILED:', e.message); code = 1; }
finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} process.exit(code); }
