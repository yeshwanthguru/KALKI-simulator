// Takes a screenshot of the built app in headless Edge/Chrome, optionally running a script first (for example to open a scene).
// Usage: node tools/screenshot.mjs <out.png> [script.js] [width] [height] [html]
//   script.js: JavaScript evaluated in the page after it has loaded (top-level await is allowed)
//   html:      page to open, default dist/Kalki.html
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [out, scriptFile, w = '1440', h = '900', page = 'dist/Kalki.html'] = process.argv.slice(2);
if (!out) { console.error('usage: node tools/screenshot.mjs <out.png> [script.js] [width] [height] [html]'); process.exit(1); }
const candidates = [process.env.EDGE, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const browser = candidates.find(p => fs.existsSync(p));
if (!browser) { console.error('no Chromium-based browser found (set EDGE=<path>)'); process.exit(1); }

const port = 9300 + Math.floor(Math.random() * 500), profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kalki-shot-'));
const proc = spawn(browser, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, [res, rej]); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression, ms = 120000) => { const r = await Promise.race([send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('the page script did not finish in ' + ms / 1000 + ' s')), ms))]); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };

try {
  let target;
  for (let i = 0; i < 60 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { await sleep(250); } }
  if (!target) throw new Error('browser did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const [res, rej] = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } };
  await send('Page.enable');
  if (!process.env.NO_EMULATION) await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false }); // NO_EMULATION=1 uses the real window size (needed for MediaRecorder)
  const [pagePath, hash = ''] = page.split('#'); // the html argument may carry a hash, e.g. dist/Kalki.html#e2e
  await send('Page.navigate', { url: pathToFileURL(path.resolve(pagePath)).href + (hash ? '#' + hash : '') });
  for (let i = 0; i < 80 && (await evalJs('document.readyState')) !== 'complete'; i++) await sleep(250);
  await sleep(2500); // let the actors load
  if (scriptFile) { const r = await evalJs(`(async () => { ${fs.readFileSync(scriptFile, 'utf8')} })()`); if (r !== undefined) console.log(JSON.stringify(r)); }
  await sleep(1200);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('wrote', out);
} catch (e) { console.error('screenshot failed:', e.message); process.exitCode = 1; }
finally { try { ws && ws.close(); } catch {} proc.kill(); await sleep(400); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(process.exitCode || 0); }
