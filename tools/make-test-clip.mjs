// Builds a short test clip (pan, cut, zoom in, cut, hold) as a WebM in headless Edge/Chrome, deterministically (WebCodecs + a small WebM writer). Usage: node tools/make-test-clip.mjs <out.webm>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLIP_SCRIPT } from './clip-gen.mjs';

const out = process.argv[2];
if (!out) { console.error('usage: node tools/make-test-clip.mjs <out.webm>'); process.exit(1); }
const candidates = [process.env.EDGE, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const browser = candidates.find(p => fs.existsSync(p));
if (!browser) { console.error('no Chromium-based browser found (set EDGE=<path>)'); process.exit(1); }

const SCRIPT = CLIP_SCRIPT + `
(async () => { const f = await makeClip(); const buf = new Uint8Array(await f.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192)); return btoa(s); })()`;

const port = 9600 + Math.floor(Math.random() * 150), profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kalki-clip-'));
const proc = spawn(browser, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--window-size=900,600', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0, code = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, [res, rej]); ws.send(JSON.stringify({ id: i, method, params })); });
try {
  let target; for (let i = 0; i < 60 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { await sleep(250); } }
  if (!target) throw new Error('browser did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const [res, rej] = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } };
  const blank = path.join(profile, 'blank.html'); fs.writeFileSync(blank, '<!doctype html><title>clip</title>'); // WebCodecs needs a secure context, which about:blank is not
  await send('Page.enable'); await send('Page.navigate', { url: pathToFileURL(blank).href }); await sleep(500);
  const r = await Promise.race([send('Runtime.evaluate', { expression: SCRIPT, awaitPromise: true, returnByValue: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('clip generation did not finish in 90 s')), 90000))]);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  fs.writeFileSync(out, Buffer.from(r.result.value, 'base64')); console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
} catch (e) { console.error('failed:', e.message); code = 1; }
finally { try { ws && ws.close(); } catch {} proc.kill(); await sleep(500); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); }
