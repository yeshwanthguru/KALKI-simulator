// Smoke test: loads the built page in headless Chromium/Edge with #selftest and reads the in-page results.
// Usage: node build.mjs && node tests/smoke.mjs [path-to-html]   (set EDGE=path to choose a browser)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const candidates = [
  process.env.EDGE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].filter(Boolean);
const browser = candidates.find(p => fs.existsSync(p));
if (!browser) { console.log('smoke: no Chromium-based browser found (set EDGE=<path>); skipped'); process.exit(0); }

const page = path.resolve(process.argv[2] || 'dist/Kalki.html');
if (!fs.existsSync(page)) { console.error('smoke: build first (node build.mjs); missing ' + page); process.exit(1); }

const r = spawnSync(browser, [
  '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files',
  '--virtual-time-budget=15000', '--dump-dom', pathToFileURL(page).href + '#selftest'
], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120000 });

const m = /<pre id="selftestOut"[^>]*>([\s\S]*?)<\/pre>/.exec(r.stdout || '');
if (!m) { console.error('smoke: no self-test output (page failed to start?)\n' + (r.stderr || '').slice(0, 800)); process.exit(1); }
const text = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
console.log(text);
process.exit(/SELFTEST PASS/.test(text) ? 0 : 1);
