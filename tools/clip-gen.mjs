// Page-side code that builds a short test clip deterministically (no real-time recording): frames are drawn on a canvas, encoded with WebCodecs
// (VP8) and written into a WebM container by hand. Used by tools/make-test-clip.mjs and tests/video-e2e.mjs.
// The clip: 3 s pan (content slides right), cut, 3 s zoom in, cut, 2.5 s locked off. 640x360 at 30 fps.
export const CLIP_SCRIPT = `
async function makeClip() {
  const W = 640, H = 360, FPS = 30, N = Math.round(8.5 * FPS);
  const tex = seed => { const c = document.createElement('canvas'); c.width = c.height = 1400; const x = c.getContext('2d'); let r = seed; const rnd = () => (r = (r * 1664525 + 1013904223) >>> 0) / 4294967295;
    x.fillStyle = '#6a5a4a'; x.fillRect(0, 0, 1400, 1400); for (let i = 0; i < 1400; i++) { x.fillStyle = 'hsl(' + (20 + rnd() * 50) + ' ' + (30 + rnd() * 50) + '% ' + (20 + rnd() * 55) + '%)'; x.beginPath(); x.arc(rnd() * 1400, rnd() * 1400, 6 + rnd() * 36, 0, 7); x.fill(); } return c; };
  const A = tex(1), B = tex(2), C = tex(3), cv = new OffscreenCanvas(W, H), g = cv.getContext('2d');
  const draw = t => {
    if (t < 3) { const p = t / 3; g.drawImage(A, 500 - 220 * p, 400, W, H, 0, 0, W, H); }
    else if (t < 6) { const p = (t - 3) / 3, sc = 1 + .55 * p, sw = W / sc, sh = H / sc; g.drawImage(B, 400 + (W - sw) / 2, 400 + (H - sh) / 2, sw, sh, 0, 0, W, H); }
    else g.drawImage(C, 300, 300, W, H, 0, 0, W, H);
  };
  const frames = [];
  const enc = new VideoEncoder({ output: (chunk) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); frames.push({ d, ts: Math.round(chunk.timestamp / 1000), key: chunk.type === 'key' }); }, error: e => { throw e; } });
  enc.configure({ codec: 'vp8', width: W, height: H, bitrate: 1200000, framerate: FPS });
  for (let i = 0; i < N; i++) { draw(i / FPS); const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) }); enc.encode(vf, { keyFrame: i % 15 === 0 }); vf.close(); }
  await enc.flush();
  /* WebM / Matroska writer */
  const cat = parts => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Uint8Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; };
  const size = n => new Uint8Array([1, 0, 0, 0, (n / 16777216) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
  const el = (id, payload) => cat([new Uint8Array(id), size(payload.length), payload]);
  const uint = (id, v) => { const b = []; do { b.unshift(v & 255); v = Math.floor(v / 256); } while (v > 0); return el(id, new Uint8Array(b)); };
  const str = (id, s) => el(id, new TextEncoder().encode(s));
  const f64 = (id, v) => { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v); return el(id, b); };
  const header = el([0x1A, 0x45, 0xDF, 0xA3], cat([uint([0x42, 0x86], 1), uint([0x42, 0xF7], 1), uint([0x42, 0xF2], 4), uint([0x42, 0xF3], 8), str([0x42, 0x82], 'webm'), uint([0x42, 0x87], 4), uint([0x42, 0x85], 2)]));
  const info = el([0x15, 0x49, 0xA9, 0x66], cat([uint([0x2A, 0xD7, 0xB1], 1000000), f64([0x44, 0x89], N / FPS * 1000), str([0x4D, 0x80], 'kalki'), str([0x57, 0x41], 'kalki')]));
  const tracks = el([0x16, 0x54, 0xAE, 0x6B], el([0xAE], cat([uint([0xD7], 1), uint([0x73, 0xC5], 1), uint([0x83], 1), str([0x86], 'V_VP8'), el([0xE0], cat([uint([0xB0], W), uint([0xBA], H)]))])));
  const blocks = frames.map(f => el([0xA3], cat([new Uint8Array([0x81, (f.ts >> 8) & 255, f.ts & 255, f.key ? 0x80 : 0]), f.d])));
  const cluster = el([0x1F, 0x43, 0xB6, 0x75], cat([uint([0xE7], 0), ...blocks]));
  const segment = el([0x18, 0x53, 0x80, 0x67], cat([info, tracks, cluster]));
  return new File([cat([header, segment])], 'street-scene-test-clip.webm', { type: 'video/webm' });
}
`;
