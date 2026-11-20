// Converts Microsoft Rocketbox animation FBX files (MIT) into one compact file, assets_src/actions.json.
// Usage: node tools/convert-anim.mjs <dir-with-fbx> [out.json]
// Files expected in <dir>: f_<name>.fbx and m_<name>.fbx for each entry of ACTIONS below.
//
// Per clip: choose a window of the long source take, resample to FPS, keep every bone's rotation as int16 quaternions,
// keep the root height (Bip01.position.y, converted from cm to m) as int16 millimetres. Everything else (positions of other
// bones, scale, root drift) is dropped: the actors keep their rest pose for those.
import fs from 'node:fs';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Quaternion } from 'three';

const FPS = 12;
/* how: 'first' = start of the take, 'calm' = lowest-motion window, 'busy' = highest-motion window, 'arm' = largest right-arm lift, 'all' = whole take (capped) */
const ACTIONS = {
  sit: { file: 'sit_chair_idle_neutral_01', len: 4, how: 'calm' },
  think: { file: 'sit_chair_gestic_thoughtful', len: 5, how: 'busy' },
  talk: { file: 'gestic_talk_neutral_01', len: 6, how: 'busy' },
  listen: { file: 'gestic_listen_neutral_01', len: 5, how: 'calm' },
  nod: { file: 'gestic_listen_accept_01', len: 3, how: 'all' },
  sip: { file: 'drink_drinking', len: 5, how: 'arm' },
  wave: { file: 'wave_01', len: 3, how: 'busy' },
  look: { file: 'idle_look_around_01', len: 4.5, how: 'all' },
  shrug: { file: 'gestic_shrug_01', len: 2, how: 'all' },
  invite: { file: 'invite_sit', len: 4.2, how: 'all' }
};

const dir = process.argv[2], outPath = process.argv[3] || 'assets_src/actions.json';
if (!dir) { console.error('usage: node tools/convert-anim.mjs <dir-with-fbx> [out.json]'); process.exit(1); }

const load = f => { const b = fs.readFileSync(f); return new FBXLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '').animations[0]; };
const quatTracks = clip => clip.tracks.filter(t => t.name.endsWith('.quaternion') && !t.name.startsWith('Bip01_Footsteps'));
const sampleQ = (t, time, out) => {
  const times = t.times, n = times.length;
  if (time <= times[0]) return out.fromArray(t.values, 0);
  if (time >= times[n - 1]) return out.fromArray(t.values, (n - 1) * 4);
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= time) lo = m; else hi = m; }
  const a = new Quaternion().fromArray(t.values, lo * 4), b = new Quaternion().fromArray(t.values, hi * 4);
  return out.copy(a).slerp(b, (time - times[lo]) / (times[hi] - times[lo]));
};
const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.dot(b))));

function pickStart(clip, tracks, len, how) {
  const dur = clip.duration; if (how === 'first' || how === 'all' || dur <= len) return 0;
  const step = 0.25, q1 = new Quaternion(), q2 = new Quaternion(), q0 = new Quaternion();
  const score = (t0, mode) => {
    let s = 0, n = 0;
    for (let tm = t0; tm < t0 + len - 0.1; tm += 0.1) for (const t of tracks) {
      if (mode === 'arm') { if (!/R_(UpperArm|Forearm)\./.test(t.name)) continue; sampleQ(t, 0, q0); sampleQ(t, tm, q1); s += angle(q0, q1); n++; }
      else { sampleQ(t, tm, q1); sampleQ(t, tm + 0.1, q2); s += angle(q1, q2); n++; }
    }
    return s / Math.max(1, n);
  };
  let best = 0, bs = how === 'calm' ? Infinity : -Infinity;
  for (let t0 = 0; t0 + len <= dur; t0 += step) { const s = score(t0, how); if (how === 'calm' ? s < bs : s > bs) { bs = s; best = t0; } }
  return best;
}

function convert(file, spec) {
  const clip = load(file), tracks = quatTracks(clip);
  const len = Math.min(spec.len, clip.duration), t0 = pickStart(clip, tracks, len, spec.how);
  const n = Math.max(2, Math.round(len * FPS) + 1);
  const bones = tracks.map(t => t.name.replace('.quaternion', ''));
  const q = new Int16Array(n * bones.length * 4), tmp = new Quaternion(), prev = bones.map(() => new Quaternion(0, 0, 0, 1));
  for (let i = 0; i < n; i++) tracks.forEach((t, b) => {
    sampleQ(t, t0 + Math.min(len, i / FPS), tmp).normalize();
    if (i > 0 && tmp.dot(prev[b]) < 0) { tmp.x = -tmp.x; tmp.y = -tmp.y; tmp.z = -tmp.z; tmp.w = -tmp.w; } // keep slerp on the short path
    prev[b].copy(tmp);
    const o = (i * bones.length + b) * 4; q[o] = Math.round(tmp.x * 32767); q[o + 1] = Math.round(tmp.y * 32767); q[o + 2] = Math.round(tmp.z * 32767); q[o + 3] = Math.round(tmp.w * 32767);
  });
  const rootT = clip.tracks.find(t => t.name === 'Bip01.position'), root = new Int16Array(n);
  for (let i = 0; i < n; i++) { const time = t0 + Math.min(len, i / FPS), tt = rootT.times; let lo = 0; while (lo < tt.length - 2 && tt[lo + 1] <= time) lo++; const f = Math.min(1, Math.max(0, (time - tt[lo]) / (tt[lo + 1] - tt[lo]))); root[i] = Math.round((rootT.values[lo * 3 + 1] * (1 - f) + rootT.values[(lo + 1) * 3 + 1] * f) * 10); } // cm -> mm
  const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
  return { bones, dur: +(len).toFixed(3), n, t0: +t0.toFixed(2), q: b64(q), y: b64(root) };
}

const out = { fps: FPS, bones: null, clips: {} };
for (const [name, spec] of Object.entries(ACTIONS)) for (const g of ['f', 'm']) {
  const c = convert(`${dir}/${g}_${spec.file}.fbx`, spec);
  if (!out.bones) out.bones = c.bones;
  if (c.bones.join() !== out.bones.join()) throw new Error(`bone list differs in ${g}_${spec.file}`);
  delete c.bones; out.clips[`${g}_${name}`] = c;
  console.log(`${g}_${name}`.padEnd(10), 'window', c.t0 + 's', '+' + c.dur + 's', c.n, 'frames', Math.round((c.q.length + c.y.length) / 1024) + ' KB');
}
fs.writeFileSync(outPath, JSON.stringify(out));
console.log('bones', out.bones.length, 'wrote', outPath, Math.round(fs.statSync(outPath).size / 1024) + ' KB');
