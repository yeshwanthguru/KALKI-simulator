import { buildShotListPdf, buildStoryboardPdf, buildBlockingPdf } from './pdf.js';
import { LANGS, makeTranslator } from './i18n.js';
import { LESSONS, TEMPLATES } from './lessons.js';
import { analyzeClip, toShots, suggest, toGray, AW, AH, fmtTime } from './analyze.js';
(function () {
'use strict';
const T = window.THREE;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const D2R = Math.PI / 180;
/* sensor presets: h = sensor height used for the vertical field of view, w = width used for the full-frame equivalent */
const SENSORS = {
  S35: { label: 'Super 35', w: 24.9, h: 14 }, FF: { label: 'Full frame', w: 36, h: 24 }, APSC: { label: 'APS-C', w: 23.6, h: 15.6 },
  M43: { label: 'Micro Four Thirds', w: 17.3, h: 13 }, ONE: { label: '1-inch', w: 13.2, h: 8.8 }
};
const DEFAULT_SENSOR = 'S35', SCHEMA = 7, NOTE_MAX = 240;
const sensorOf = () => SENSORS[P.sensor] || SENSORS[DEFAULT_SENSOR];
const sensorH = () => sensorOf().h;
const crop = () => 36 / sensorOf().w;
const eqMm = l => Math.round(l * crop());

/* ---------- cinema grammar ---------- */
const SIZES = {
  EWS: { h: 9, ty: 1.1, label: 'Extreme wide' }, WS: { h: 4.2, ty: 1.0, label: 'Wide' },
  FS: { h: 2.3, ty: 0.95, label: 'Full shot' }, MS: { h: 1.1, ty: 1.25, label: 'Medium' },
  MCU: { h: 0.7, ty: 1.5, label: 'Medium close-up' }, CU: { h: 0.42, ty: 1.64, label: 'Close-up' },
  ECU: { h: 0.2, ty: 1.7, label: 'Extreme close-up' }
};
const ACTION_LABEL = { stand: 'Standing', walk: 'Walking across', sit: 'Sitting', think: 'Sitting, thinking', talk: 'Talking', listen: 'Listening', nod: 'Nodding', sip: 'Sipping chai', wave: 'Waving', look: 'Looking around', shrug: 'Shrugging', invite: 'Inviting to sit' };
const ACTION_SHORT = { stand: 'Stand', walk: 'Walk', sit: 'Sit', think: 'Think', talk: 'Talk', listen: 'Listen', nod: 'Nod', sip: 'Sip chai', wave: 'Wave', look: 'Look', shrug: 'Shrug', invite: 'Invite' };
const SEATED = { sit: 1, think: 1 };
const KA0 = window.__KA || {}; // captured here: loadReal() clears window.__KA once the assets are parsed
/* the avatars that can play an actor; the two built-in ones are Rocketbox Female_Adult_11 and Male_Adult_17, the others come from assets_src/avatars */
const AV = { f11: { g: 'f', first: 'Meera', label: 'Female 11', src: 'meera' }, m17: { g: 'm', first: 'Arjun', label: 'Male 17', src: 'arjun' } };
const AV_NAMES = { f07: 'Priya', f08: 'Kavya', m04: 'Ravi', m05: 'Suresh', m07: 'Vikram' };
for (const [id, a] of Object.entries(KA0.avatars || {})) AV[id] = { g: a.g, first: AV_NAMES[id] || a.name, label: a.name, src: null };
const DEFAULT_CAST = { A: 'f11', B: 'm17' };
const castOf = () => (typeof P !== 'undefined' && P && P.actors) || DEFAULT_CAST;
const ACTOR_NAME = { get A() { return AV[castOf().A].first; }, get B() { return AV[castOf().B].first; } };
const HEIGHTS = { ground: 'Ground level', low: 'Low angle', eye: 'Eye level', high: 'High angle', top: "Bird's eye" };
const LENSES = [14, 18, 24, 35, 50, 85, 135], FSTOPS = [1.4, 1.8, 2.8, 4, 5.6, 8, 11];
const EASES = { smooth: 'Smooth (ease in-out)', linear: 'Linear (mechanical)', in: 'Ease in (accelerate)', out: 'Ease out (settle)' };
const EF = { linear: t => t, smooth: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, in: t => t * t * t, out: t => 1 - Math.pow(1 - t, 3) };
const SUBJ = { get A() { return `${ACTOR_NAME.A} (Actor A)`; }, get B() { return `${ACTOR_NAME.B} (Actor B)`; }, both: 'Both actors' };
const CATS = { basic: 'Basic', dynamic: 'Dynamic', emotion: 'Emotion' };

const MOVES = [
  { id: 'static', name: 'Locked-off', cat: 'basic', g: '▣', s: 'Camera holds still', why: 'Stillness lets the performance carry the scene. The audience studies faces and details because nothing else moves.', tip: 'Great for dialogue and comedy timing. Pair with a 35–50mm lens for a natural feel.', ap() {} },
  { id: 'push_in', name: 'Push in', cat: 'emotion', g: '⇥', s: 'Dolly slowly toward subject', why: 'Moving closer pulls the audience into the character’s head. It signals that this moment matters: a realisation, a decision, rising tension.', tip: 'Keep it slow and smooth. Start it just before the key line lands.', ap(s, t, a) { s.d *= 1 - .55 * a * t; } },
  { id: 'pull_out', name: 'Pull out', cat: 'emotion', g: '⇤', s: 'Dolly away from subject', why: 'Backing away isolates the character and reveals the world around them. Often used for loneliness, defeat or an ending.', tip: 'Let the final wide frame hold for a beat after the move ends.', ap(s, t, a) { s.d *= 1 + 1.3 * a * t; } },
  { id: 'zoom_in', name: 'Zoom in', cat: 'basic', g: '⊕', s: 'Lens zooms, camera stays put', why: 'A zoom magnifies without changing perspective, so it feels more “noticed” than “felt”. Compare it with a push-in to see the difference in depth.', tip: 'Fast zooms read as dramatic or comic; slow zooms feel observational, like a documentary.', ap(s, t, a) { s.fovMul = 1 - .62 * a * t; } },
  { id: 'truck', name: 'Truck', cat: 'basic', g: '⇆', s: 'Slide sideways with the action', why: 'Sideways movement creates parallax: near objects pass faster than far ones, which makes a flat set feel deep and alive.', tip: 'Put something in the foreground (a pillar, a plant) to exaggerate the parallax.', dir: 1, ap(s, t, a, d) { s.lat = (t - .5) * 3.2 * a * d; } },
  { id: 'pedestal', name: 'Pedestal', cat: 'basic', g: '⇅', s: 'Raise or lower the camera', why: 'Changing height while staying level shifts how powerful the subject looks. Rising above feels superior; sinking below makes them grow in stature.', tip: 'On a budget, a tripod with a centre column does small pedestal moves.', dir: 1, ap(s, t, a, d) { const v = (t - .5) * 1.8 * a * d; s.camY += v; s.ty += v; } },
  { id: 'pan', name: 'Pan', cat: 'basic', g: '↔', s: 'Rotate left or right on the spot', why: 'A pan follows attention, like turning your head. It connects two things in the same space without cutting.', tip: 'Pan slowly on wide lenses; fast pans on long lenses judder (strobe).', dir: 1, ap(s, t, a, d) { s.yaw = -(t - .5) * 70 * a * d * D2R; } },
  { id: 'tilt', name: 'Tilt', cat: 'basic', g: '↕', s: 'Rotate up or down on the spot', why: 'Tilting up a person or building emphasises scale and importance. Tilting down can reveal what is at their feet.', tip: 'Start on a detail (shoes, hands) and tilt up to the face for an introduction shot.', dir: 1, ap(s, t, a, d) { s.pitch = (t - .5) * 40 * a * d * D2R; } },
  { id: 'arc', name: 'Arc', cat: 'dynamic', g: '◠', s: 'Curve partly around the subject', why: 'A gentle arc adds energy to a static moment and slowly changes the background behind the actor.', tip: 'Great for a character’s quiet decision. Keep the eyeline in the upper third.', dir: 1, ap(s, t, a, d) { s.az += (t - .5) * 80 * a * d * D2R; } },
  { id: 'orbit', name: 'Orbit', cat: 'dynamic', g: '⟲', s: 'Circle all the way around', why: 'A full circle makes a moment feel heightened: a reunion, a victory, a turning point. The world spins while the subject stays centred.', tip: 'Use a wider lens (18–24mm) so the circle feels big.', dir: 1, ap(s, t, a, d) { s.az += t * 360 * a * d * D2R; } },
  { id: 'crane', name: 'Crane up', cat: 'dynamic', g: '⤴', s: 'Rise high and look down', why: 'Rising above the action pulls the audience out of the moment and shows the bigger picture. Classic for openings and endings.', tip: 'A drone or a pole rig can fake a crane on small productions.', dir: 1, ap(s, t, a, d) { s.camY = Math.max(.15, s.camY + t * 3.6 * a * d); s.d *= 1 + .45 * t * a; } },
  { id: 'dolly_zoom', name: 'Dolly zoom', cat: 'emotion', g: '◎', s: 'Move and zoom opposite ways', why: 'The subject stays the same size while the background stretches or squeezes. It feels like vertigo or shock: the world shifting under the character.', tip: 'Use it once per film. It loses power when repeated.', dir: 1, keep: true, ap(s, t, a, d) { s.d *= d > 0 ? 1 + 1.6 * a * t : 1 - .62 * a * t; } },
  { id: 'whip_pan', name: 'Whip pan', cat: 'dynamic', g: '⚡', s: 'Snap fast to a new subject', why: 'A whip blurs the frame and creates surprise or comic energy. Editors also use it to hide a cut between two shots.', tip: 'Hold steady frames before and after the whip so the eye can land.', dir: 1, raw: true, ap(s, t, a, d) { const w = 1 / (1 + Math.exp(-(t - .5) * 34)); s.yaw = (1 - w) * 110 * a * d * D2R; } },
  { id: 'handheld', name: 'Handheld', cat: 'emotion', g: '〰', s: 'Natural shake, documentary feel', why: 'Handheld feels raw and present, as if someone is really there. Use it for chaos, panic, intimacy or realism.', tip: 'Breathe with the actor. Too much shake becomes distracting.', raw: true, ap(s, t, a) { s.shake = a; } },
  { id: 'dutch', name: 'Dutch angle', cat: 'emotion', g: '⟋', s: 'Tilt the horizon', why: 'A tilted horizon tells the audience something is wrong: unease, madness, a world off balance.', tip: 'Subtle (5–10°) is often stronger than extreme.', dir: 1, ap(s, t, a, d) { s.roll = (.35 + .65 * t) * 24 * a * d * D2R; } },
  { id: 'follow', name: 'Tracking follow', cat: 'dynamic', g: '➜', s: 'Travel alongside a walking actor', why: 'Moving with a character makes the audience walk with them. It builds momentum and keeps us in their journey.', tip: 'Try a side angle (90°) for a classic walk-and-talk.', raw: true, walk: true, ap() {} },
  { id: 'spiral', name: 'Spiral in', cat: 'dynamic', g: '🌀', s: 'Orbit while pushing closer', why: 'Combining an arc with a push tightens the energy around the character, often used for a big emotional reveal.', tip: 'Keep the actor still and let the camera do the dancing.', dir: 1, ap(s, t, a, d) { s.az += t * 130 * a * d * D2R; s.d *= 1 - .45 * a * t; } },
  { id: 'reveal', name: 'Rise & reveal', cat: 'dynamic', g: '✧', s: 'Start low and tight, rise to wide', why: 'Starting close and low hides the space; rising and pulling back reveals where we are. A strong way to open a scene.', tip: 'Start on a meaningful detail (a teacup, a hand) for a richer reveal.', ap(s, t, a) { s.camY = lerp(.35, s.camY + 1.3 * a, t); s.d *= lerp(.45, 1 + .9 * a, t); } }
];
const MV = Object.fromEntries(MOVES.map(m => [m.id, m]));

/* ---------- state ---------- */
const newShot = (o = {}) => normShot(Object.assign({ name: '', move: 'static', duration: 4, lens: 35, size: 'MS', subject: 'A', height: 'eye', angle: 0, amount: .6, dir: 1, easing: 'smooth', actionA: 'stand', actionB: 'stand' }, o));
function normShot(o, errs, i) {
  const e = (m) => errs && errs.push(`Shot ${i + 1}: ${m}`);
  const s = {};
  s.move = MV[o.move] ? o.move : (e(`unknown move "${o.move}"`), 'static');
  s.name = String(o.name || MV[s.move].name).slice(0, 40);
  s.duration = clamp(+o.duration || 4, 1, 20);
  s.lens = LENSES.includes(+o.lens) ? +o.lens : (o.lens !== undefined && e('lens must be one of ' + LENSES.join(', ')), 35);
  s.size = SIZES[o.size] ? o.size : (o.size !== undefined && e('size must be ' + Object.keys(SIZES).join('/')), 'MS');
  s.subject = ['A', 'B', 'both'].includes(o.subject) ? o.subject : 'A';
  s.height = HEIGHTS[o.height] ? o.height : 'eye';
  s.angle = clamp(+o.angle || 0, -180, 180);
  s.fstop = FSTOPS.includes(+o.fstop) ? +o.fstop : 2.8;
  s.amount = clamp(o.amount === undefined ? .6 : +o.amount, 0, 1);
  s.dir = +o.dir < 0 ? -1 : 1;
  s.easing = EASES[o.easing] ? o.easing : 'smooth';
  const lw = o.action === 'walk' ? (o.subject === 'B' ? 'B' : 'A') : null; // files from before v0.5 had one action for the whole shot
  for (const k of ['A', 'B']) { const v = o['action' + k] === 'idle' ? 'stand' : o['action' + k]; s['action' + k] = ACTION_LABEL[v] ? v : (lw === k ? 'walk' : 'stand'); }
  const pl = v => v && Number.isFinite(+v.x) && Number.isFinite(+v.z) ? { x: +clamp(+v.x, -7, 7).toFixed(2), z: +clamp(+v.z, -3.6, 5.5).toFixed(2) } : null;
  const fc = v => v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : clamp(Math.round(+v), -180, 180);
  for (const k of ['A', 'B']) {
    const seen = new Set(), c = Array.isArray(o['cues' + k]) && s['action' + k] !== 'walk' ? o['cues' + k] : [];
    s['cues' + k] = c.map(x => ({ t: +(Math.round(clamp(+(x && x.t) || 0, 0, s.duration) * 2) / 2).toFixed(1), a: x && ACTION_LABEL[x.a === 'idle' ? 'stand' : x.a] && x.a !== 'walk' ? (x.a === 'idle' ? 'stand' : x.a) : null }))
      .filter(x => x.a && x.t > 0 && x.t < s.duration && !seen.has(x.t) && seen.add(x.t)).sort((p, q) => p.t - q.t).slice(0, 7);
  }
  for (const k of ['A', 'B']) s['route' + k] = Array.isArray(o['route' + k]) ? o['route' + k].map(pl).filter(Boolean).slice(0, 6) : [];
  s.placeA = pl(o.placeA); s.placeB = pl(o.placeB); s.faceA = fc(o.faceA); s.faceB = fc(o.faceB);
  s.notes = String(o.notes || '').replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX);
  return s;
}
const DEMO = () => ({ schemaVersion: SCHEMA, actors: { ...DEFAULT_CAST }, sensor: DEFAULT_SENSOR, title: 'Chai stall – first meeting', aspect: '2.39', look: 'golden', set: 'stall', shots: [
  newShot({ fstop: 5.6, name: 'Establish the stall', move: 'reveal', duration: 5, lens: 24, size: 'WS', subject: 'both', height: 'eye', angle: 15, amount: .7 }),
  newShot({ fstop: 1.8, name: 'Meera notices', move: 'push_in', duration: 4.5, lens: 50, size: 'MS', subject: 'A', angle: 25, amount: .7 }),
  newShot({ fstop: 2.8, name: 'Arjun walks in', move: 'follow', duration: 5, lens: 35, size: 'FS', subject: 'B', angle: 25, actionB: 'walk' }),
  newShot({ fstop: 1.4, name: 'The realisation', move: 'dolly_zoom', duration: 4, lens: 50, size: 'CU', subject: 'A', angle: -10, amount: .8 })
] });
let P = DEMO(), sel = 0, time = 0, playing = false, loop = true, mode = 'nocode', guides = 'off', showSet = true, demo = true, recording = null;
const undo = [], redo = [];
function commit() { undo.push(JSON.stringify(P)); if (undo.length > 80) undo.shift(); redo.length = 0; }
function restore(str) { P = JSON.parse(str); sel = clamp(sel, 0, P.shots.length - 1); refreshAll(); }
const total = () => P.shots.reduce((a, s) => a + s.duration, 0);
function starts() { let a = 0; return P.shots.map(s => { const v = a; a += s.duration; return v; }); }
function at(tm) { const st = starts(); for (let i = 0; i < P.shots.length; i++) { if (tm < st[i] + P.shots[i].duration || i === P.shots.length - 1) return { i, t: clamp((tm - st[i]) / P.shots[i].duration, 0, 1), loc: tm - st[i] }; } return null; }

/* ---------- 3D ---------- */
const cv = $('#cv');
const R = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
R.setPixelRatio(Math.min(devicePixelRatio, 1.5));
R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.2;
R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.setScissorTest(true);
const scene = new T.Scene();
scene.background = new T.Color(0x16100d); scene.fog = new T.Fog(0x16100d, 14, 42);
const cam = new T.PerspectiveCamera(40, 2, .05, 80);
const setCam = new T.PerspectiveCamera(38, 1.6, .1, 120); setCam.layers.enable(1);
const composer = new T.EffectComposer(R);
const bokeh = new T.BokehPass(scene, cam, { focus: 3, aperture: .0005, maxblur: .014 });
const bloom = new T.UnrealBloomPass(new T.Vector2(512, 256), .6, .55, .86);
const grade = new T.ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVel: { value: new T.Vector2() }, uRes: { value: new T.Vector2(1, 1) }, uGrain: { value: .045 }, uVig: { value: .55 }, uCA: { value: .0025 }, uLift: { value: new T.Vector3() }, uGain: { value: new T.Vector3(1, 1, 1) }, uSat: { value: 1 }, uCon: { value: 1 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime,uGrain,uVig,uCA,uSat,uCon;uniform vec2 uVel,uRes;uniform vec3 uLift,uGain;varying vec2 vUv;
vec3 smp(vec2 uv){vec2 d=(uv-.5)*uCA;return vec3(texture2D(tDiffuse,uv+d).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-d).b);}
void main(){vec3 c=vec3(0.);for(int i=0;i<8;i++){c+=smp(vUv+uVel*(float(i)/7.-.5));}c/=8.;
c=(c-.5)*uCon+.5;float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,uSat);c=clamp(c,0.,1.);c=c*uGain+uLift*(1.-c);
float v=smoothstep(.95,.2,length((vUv-.5)*vec2(1.,.85))*1.15);c*=mix(1.,v,uVig);
float n=fract(sin(dot(floor(vUv*uRes)+fract(uTime*7.)*137.,vec2(12.9898,78.233)))*43758.5453);c+=(n-.5)*uGrain;gl_FragColor=vec4(c,1.);}`
});
composer.addPass(new T.RenderPass(scene, cam)); composer.addPass(bokeh); composer.addPass(bloom); composer.addPass(new T.OutputPass()); composer.addPass(grade);
const _bk = bokeh.render.bind(bokeh); bokeh.render = (...a) => { const v = FX.map(o => o.visible); FX.forEach(o => o.visible = false); _bk(...a); FX.forEach((o, i) => o.visible = v[i]); };
const prevVP = new T.Matrix4(); let prevIdx = -2;
const LOOKS = {
  golden: { label: 'Golden hour', sun: [0xffb066, 4.2], hemi: [0xffd9b0, 0x1a1210, .5], fill: .7, bulb: 3, glass: 0xffc27a, shaft: 1, fog: 0x1d130e, dust: .55, g: [[.02, .025, .045], [1.06, .99, .9], 1.08, 1.08, .55, .03, .0025] },
  teal: { label: 'Teal & orange', sun: [0xffc48a, 3.6], hemi: [0x9fc7ff, 0x1a1210, .35], fill: .3, bulb: 2.6, glass: 0xffd4a0, shaft: .8, fog: 0x0f1618, dust: .4, g: [[0, .045, .065], [1.1, .98, .86], 1.18, 1.14, .6, .03, .003] },
  night: { label: 'Night', sun: [0x7fa6ff, .45], hemi: [0x34507f, 0x05060a, .2], fill: .1, bulb: 7, glass: 0x24427f, shaft: 0, fog: 0x06080e, dust: .22, g: [[0, .015, .05], [1.02, .97, 1.04], .95, 1.15, .7, .06, .003] },
  noir: { label: 'Noir', sun: [0xffffff, 4.8], hemi: [0xffffff, 0x111111, .16], fill: .2, bulb: 2.4, glass: 0xffffff, shaft: 1.3, fog: 0x0c0c0c, dust: .6, g: [[0, 0, 0], [1, 1, 1], 0, 1.38, .75, .08, 0] },
  dawn: { label: 'Dawn', sun: [0xff9f8a, 2.6], hemi: [0xc7d3ff, 0x1d1418, .45], fill: .5, bulb: 4.5, glass: 0xffc2a8, shaft: 1.1, fog: 0x1a1520, dust: .5, g: [[.03, .005, .05], [1.05, .96, .94], 1.04, 1.04, .5, .03, .0025] },
  noon: { label: 'Noon', sun: [0xfff6ea, 5.4], hemi: [0xdfeaff, 0x1b1a16, .55], fill: .55, bulb: 1.2, glass: 0xffffff, shaft: .35, fog: 0x1b1a16, dust: .22, g: [[0, 0, 0], [1.02, 1.01, 1], 1.1, 1.04, .3, .02, .001] },
  dusk: { label: 'Dusk', sun: [0xff7a4a, 3.0], hemi: [0x7a63b5, 0x1a1018, .35], fill: .25, bulb: 5.5, glass: 0xff9a6a, shaft: .9, fog: 0x120c14, dust: .5, g: [[.03, 0, .06], [1.12, .94, .86], 1.15, 1.1, .6, .035, .003] },
  neutral: { label: 'Neutral', sun: [0xfff1e0, 3.4], hemi: [0xeef3ff, 0x1a1714, .4], fill: .4, bulb: 2.5, glass: 0xfff3e0, shaft: .5, fog: 0x15140f, dust: .3, g: [[0, 0, 0], [1, 1, 1], 1, 1.03, .35, .025, .0015] }
};

const mat = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .8, flatShading: false }, o));
function add(geo, m, x, y, z, sh = true) { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = sh; o.receiveShadow = true; (CUR || scene).add(o); return o; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }

// lights
const FX = [], BULBS = [], GLASS = [], SHAFTS = [];
const SETG = {}; let CUR = null; for (const k of ['stall', 'street', 'terrace']) { SETG[k] = new T.Group(); scene.add(SETG[k]); }
const hemi = new T.HemisphereLight(0xffd9b0, 0x1a1210, .42); scene.add(hemi);
const sun = new T.DirectionalLight(0xffb066, 4.2); sun.position.set(-7, 4.5, -12); sun.target.position.set(0, .8, 1); scene.add(sun.target); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 9, bottom: -9, near: 1, far: 40 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; scene.add(sun);
const fill = new T.DirectionalLight(0xffd2a8, .35); fill.position.set(3, 3, 9); scene.add(fill);
{ const pm = new T.PMREMGenerator(R); scene.environment = pm.fromScene(new T.RoomEnvironment(), .04).texture; scene.environmentIntensity = .22; }
CUR = SETG.stall;
// floor
const floorTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#5b3d2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 24; i++) { const y = i * w / 24; g.fillStyle = `hsl(${20 + (i * 7) % 10},${36 + (i * 13) % 14}%,${20 + (i * 5) % 9}%)`; g.fillRect(0, y, w, w / 24 - 2); for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${k % 2 ? 0 : 255},${k % 2 ? 0 : 220},${k % 2 ? 0 : 180},.035)`; g.fillRect((k * 131 + i * 57) % w, y + (k * 7) % 30, 60 + (k * 13) % 120, 1.5); } g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect((i * 197) % w, y, 3, w / 24); } });
floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(3, 3);
add(new T.PlaneGeometry(16, 12), mat(0xffffff, { map: floorTex, roughness: .55 }), 0, 0, 0, false).rotation.x = -Math.PI / 2;
const ground = add(new T.PlaneGeometry(120, 120), mat(0x120d0b), 0, -.01, 0, false); ground.rotation.x = -Math.PI / 2;
// walls with real window openings (sunlight passes through)
const wallM = mat(0xc9a27a, { roughness: .95 }), trimM = mat(0x7a3b2e);
add(new T.BoxGeometry(16, 1.8, .3), wallM, 0, .9, -4.2); add(new T.BoxGeometry(16, 2.1, .3), wallM, 0, 4.45, -4.2);
for (const [x, w] of [[-6.2, 3.6], [0, 4], [6.2, 3.6]]) add(new T.BoxGeometry(w, 1.6, .3), wallM, x, 2.6, -4.2);
add(new T.BoxGeometry(.3, 5.5, 9), wallM, -8, 2.75, .3);
add(new T.BoxGeometry(16, .35, .4), trimM, 0, .17, -4);
const shaftTex = canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.6, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const SUN_DIR = new T.Vector3().subVectors(sun.target.position, sun.position).normalize();
for (const x of [-3.2, 3.2]) {
  const gl = add(new T.PlaneGeometry(2.4, 1.6), new T.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: .55, depthWrite: false }), x, 2.6, -4.3, false); gl.castShadow = false; GLASS.push(gl.material);
  add(new T.BoxGeometry(.07, 1.6, .1), trimM, x, 2.6, -4.12); add(new T.BoxGeometry(2.4, .07, .1), trimM, x, 2.6, -4.12); add(new T.BoxGeometry(2.6, .12, .3), trimM, x, 1.76, -3.98);
  for (const [k, op] of [[1, .11], [1.18, .07]]) {
    const geo = new T.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, 11, 4, 1, true); geo.rotateY(Math.PI / 4); geo.scale(2.4 * k, 1, 1.6 * k); geo.translate(0, -5.5, 0);
    const m = new T.MeshBasicMaterial({ map: shaftTex, color: 0xffb066, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
    const sh = new T.Mesh(geo, m); sh.position.set(x, 2.6, -4.2); sh.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), SUN_DIR); m.userData.base = op; CUR.add(sh); SHAFTS.push(sh); FX.push(sh);
  }
}
// chai counter + sign
add(new T.BoxGeometry(4.2, 1.05, .9), mat(0x2f6f62), 0, .52, -3.3);
add(new T.BoxGeometry(4.4, .08, 1), mat(0xe8d6b8), 0, 1.08, -3.3);
const signTex = canvasTex(512, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff6b4a'); gr.addColorStop(1, '#ffb547'); g.fillStyle = '#1a0f0a'; g.fillRect(0, 0, w, h); g.fillStyle = gr; g.font = 'bold 74px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KALKI CHAI', w / 2, h / 2 + 4); });
add(new T.PlaneGeometry(3, .75), new T.MeshBasicMaterial({ map: signTex, color: new T.Color(1.5, 1.5, 1.5) }), 0, 3.1, -4.03, false);
for (let i = 0; i < 5; i++) { add(new T.CylinderGeometry(.09, .07, .18, 10), mat(0xf3ead8), -1.4 + i * .7, 1.21, -3.2); }
add(new T.CylinderGeometry(.28, .3, .5, 12), mat(0x9aa3ad, { metalness: .7, roughness: .35 }), 1.5, 1.37, -3.4);
// bulbs
for (const [x, z] of [[-2.5, -1.5], [0, -2], [2.5, -1.5]]) { add(new T.CylinderGeometry(.006, .006, 1.4), mat(0x111111), x, 3.5, z, false); const b = add(new T.SphereGeometry(.11, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(0xffd28a).multiplyScalar(5) }), x, 2.75, z, false); const l = new T.PointLight(0xffb25e, 3.5, 7, 1.6); l.position.copy(b.position); CUR.add(l); BULBS.push(l); }
// floating dust + chai steam
const dotTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
const DN = 650, dPos = new Float32Array(DN * 3), dSeed = new Float32Array(DN);
for (let i = 0; i < DN; i++) { dPos[i * 3] = -6 + Math.random() * 12; dPos[i * 3 + 1] = .2 + Math.random() * 3.6; dPos[i * 3 + 2] = -4 + Math.random() * 7; dSeed[i] = Math.random() * 100; }
const dGeo = new T.BufferGeometry(); dGeo.setAttribute('position', new T.BufferAttribute(dPos, 3));
const dust = new T.Points(dGeo, new T.PointsMaterial({ size: .022, map: dotTex, color: 0xffd9a0, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending })); scene.add(dust); FX.push(dust);
const STEAM = []; for (let i = 0; i < 12; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: dotTex, color: 0xfff4e6, transparent: true, opacity: 0, depthWrite: false })); sp.userData.o = i / 12; scene.add(sp); STEAM.push(sp); FX.push(sp); }
function animFX(dt, t) {
  const a = dGeo.attributes.position.array;
  for (let i = 0; i < DN; i++) { const s = dSeed[i]; a[i * 3] += Math.sin(t * .3 + s) * .0009; a[i * 3 + 1] += (Math.sin(t * .2 + s * 2) * .0006 - .00015); a[i * 3 + 2] += Math.cos(t * .25 + s) * .0008; if (a[i * 3 + 1] < .1) a[i * 3 + 1] = 3.8; }
  dGeo.attributes.position.needsUpdate = true;
  for (const sp of STEAM) { sp.visible = curSet === 'stall'; const k = (t * .25 + sp.userData.o) % 1; sp.position.set(1.5 + Math.sin(k * 6 + sp.userData.o * 9) * .08 * k, 1.66 + k * 1.1, -3.4 + Math.cos(k * 5) * .05); sp.scale.setScalar(.12 + k * .45); sp.material.opacity = Math.sin(k * Math.PI) * .16; }
}
// table + stools
add(new T.CylinderGeometry(.55, .55, .06, 18), mat(0x8a5a3c), -.2, .78, -1.6); add(new T.CylinderGeometry(.06, .1, .78, 8), mat(0x3a2a20), -.2, .39, -1.6);
for (const x of [-1, .6]) add(new T.CylinderGeometry(.22, .2, .48, 10), mat(0xd6542f), x, .24, -1.7);
// pillar + plants + crates
add(new T.BoxGeometry(.5, 5.5, .5), mat(0xb08460), 4.8, 2.75, -1.4);
for (const [x, z] of [[-6.8, -3.4], [6.6, -3.3], [-3.4, 2.6]]) { add(new T.CylinderGeometry(.32, .24, .55, 10), mat(0xa4532f), x, .28, z); add(new T.ConeGeometry(.55, 1.4, 7), mat(0x3d7a44), x, 1.25, z); add(new T.ConeGeometry(.42, 1, 7), mat(0x4c9152), x, 1.85, z); }
for (const [x, z, r] of [[5.6, -2.4, .3], [6.1, -1.7, -.2], [5.8, -2.1, .1]]) { const c = add(new T.BoxGeometry(.6, .45, .6), mat(0x9c6b3f), x, .23 + (x === 5.8 ? .45 : 0), z); c.rotation.y = r; }

CUR = null;

/* ---------- more sets: each lives in its own group and one is shown at a time ---------- */
const SETS = { stall: { label: 'Chai stall' }, street: { label: 'Village street' }, terrace: { label: 'Terrace' } };
let curSet = 'stall';
const gmesh = (par, geo, m, x, y, z) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
function lampAt(x, z, h) {
  add(new T.CylinderGeometry(.05, .07, h, 8), mat(0x24201c), x, h / 2, z);
  add(new T.BoxGeometry(.5, .05, .05), mat(0x24201c), x - .22, h, z);
  const b = add(new T.SphereGeometry(.1, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(0xffd28a).multiplyScalar(5) }), x - .44, h - .08, z, false);
  const l = new T.PointLight(0xffb25e, 3.5, 8, 1.6); l.position.copy(b.position); CUR.add(l); BULBS.push(l);
}
function treeAt(x, z, s) {
  add(new T.CylinderGeometry(.17 * s, .25 * s, 2.6 * s, 9), mat(0x5a3d28), x, 1.3 * s, z);
  for (const [dx, dy, dz, r, c] of [[0, 3.1, 0, 1.15, 0x3f7d3f], [.7, 2.7, .2, .8, 0x4c9152], [-.65, 2.8, -.25, .85, 0x3a7240], [.1, 3.8, .1, .7, 0x56a05a]]) add(new T.SphereGeometry(r * s, 9, 7), mat(c, { roughness: 1 }), x + dx * s, dy * s, z + dz * s);
}
function house(x, w, h, color, z) {
  add(new T.BoxGeometry(w, h, .4), mat(color, { roughness: .95 }), x, h / 2, z);
  add(new T.BoxGeometry(w + .2, .09, .75), mat(0x6b4a38), x, h + .04, z + .1);
  add(new T.BoxGeometry(w, .22, .46), mat(0xe9dcc4), x, .11, z);
  const dw = Math.min(1, w / 3); add(new T.BoxGeometry(dw, 1.65, .06), mat(0x2a1c14), x - w * .18, .98, z + .22);
  for (const s of [-1, 1]) { add(new T.BoxGeometry(.5, .7, .05), mat(0x315f70), x + w * .26 + s * .3, 1.35, z + .22); add(new T.BoxGeometry(.04, .76, .08), mat(0x1c1612), x + w * .26 + s * .56, 1.35, z + .22); }
}
function buildStreet() {
  CUR = SETG.street;
  const road = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#7d6a54'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { const v = 90 + (i * 53) % 70; g.fillStyle = `rgba(${v},${v - 14},${v - 34},.5)`; g.fillRect((i * 331) % w, (i * 197) % h, 2 + i % 5, 2 + i % 3); } g.fillStyle = 'rgba(40,30,22,.22)'; g.fillRect(w * .22, 0, w * .08, h); g.fillRect(w * .62, 0, w * .08, h); });
  road.wrapS = road.wrapT = T.RepeatWrapping; road.repeat.set(2, 2);
  add(new T.PlaneGeometry(16, 12), mat(0xffffff, { map: road, roughness: 1 }), 0, 0, 0, false).rotation.x = -Math.PI / 2;
  let x = -7.4; const cols = [0x2f8f9d, 0xe0a24a, 0xd9708a, 0x8bbf6a, 0xc9a27a];
  for (let i = 0; x < 7.4; i++) { const w = 2.6 + (i * 7 % 3) * .5; house(x + w / 2, w, 2.05 + (i % 2) * .08, cols[i % cols.length], -4.4); x += w; }
  add(new T.BoxGeometry(.3, 2.1, 9), mat(0xc9a27a, { roughness: .95 }), -8, 1.05, .3);
  add(new T.BoxGeometry(16, 3.1, .5), mat(0xb88a6a, { roughness: 1 }), 0, 1.55, -8.2);
  lampAt(3.5, -1.6, 3.4); treeAt(-5.8, -2.4, 1); treeAt(6.8, 1.8, .8);
  /* auto-rickshaw */
  const au = new T.Group(); au.position.set(5, 0, -2.2); au.rotation.y = -.55; CUR.add(au);
  const yel = mat(0xf2b705, { roughness: .5 }), blk = mat(0x1b1b1b, { roughness: .7 });
  gmesh(au, new T.BoxGeometry(1.2, .5, 1.9), blk, 0, .62, -.15); gmesh(au, new T.BoxGeometry(1.2, .45, 1.2), yel, 0, 1.05, -.45);
  gmesh(au, new T.BoxGeometry(1.3, .07, 1.7), yel, 0, 1.78, -.2);
  for (const [px, pz] of [[-.55, .55], [.55, .55], [-.55, -.95], [.55, -.95]]) gmesh(au, new T.CylinderGeometry(.03, .03, .8, 6), blk, px, 1.4, pz);
  gmesh(au, new T.BoxGeometry(1.1, .5, .04), new T.MeshStandardMaterial({ color: 0xbfe3ee, transparent: true, opacity: .4, roughness: .1 }), 0, 1.5, .6);
  gmesh(au, new T.BoxGeometry(.4, .3, .5), yel, 0, .95, 1.0);
  for (const [px, pz, r] of [[-.62, -.7, .28], [.62, -.7, .28], [0, 1.1, .26]]) { const w = gmesh(au, new T.CylinderGeometry(r, r, .13, 14), blk, px, r, pz); w.rotation.z = Math.PI / 2; }
  /* matka stand and a cot at the side of the lane */
  for (const px of [-6.4, -5.9]) gmesh(SETG.street, new T.SphereGeometry(.22, 10, 8), mat(0xa4532f), px, .24, -3.6);
  CUR = null;
}
function buildTerrace() {
  CUR = SETG.terrace;
  const slab = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#8d8a84'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { const v = 110 + (i * 37) % 60; g.fillStyle = `rgba(${v},${v},${v - 4},.35)`; g.fillRect((i * 313) % w, (i * 211) % h, 2 + i % 6, 2 + i % 4); } g.strokeStyle = 'rgba(30,28,26,.35)'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); } g.fillStyle = 'rgba(60,70,50,.18)'; g.beginPath(); g.ellipse(w * .7, h * .3, 120, 70, .4, 0, 7); g.fill(); });
  slab.wrapS = slab.wrapT = T.RepeatWrapping; slab.repeat.set(2, 2);
  add(new T.PlaneGeometry(16, 12), mat(0xffffff, { map: slab, roughness: .9 }), 0, 0, 0, false).rotation.x = -Math.PI / 2;
  const par = mat(0xd9c9a8, { roughness: .95 });
  add(new T.BoxGeometry(16, 1, .3), par, 0, .5, -4.2); add(new T.BoxGeometry(.3, 1, 9), par, -8, .5, .3); add(new T.BoxGeometry(16.3, .08, .46), mat(0xb8a584), 0, 1.04, -4.2);
  /* neighbouring buildings behind the parapet */
  [[-6.5, 3.4, 2.6, 0xc07a5a], [-2.6, 4.2, 3.2, 0x7aa0b0], [1.8, 5, 2.4, 0xd9b36a], [6.2, 3.8, 3.1, 0xa8788a]].forEach(([bx, bw, bh, c], i) => { add(new T.BoxGeometry(bw, bh, 2.4), mat(c, { roughness: 1 }), bx, bh / 2, -9.4 - (i % 2) * 1.2); for (let k = 0; k < 3; k++) add(new T.BoxGeometry(.5, .55, .05), mat(0x2a2623), bx - bw / 3 + k * bw / 3, bh * .55, -8.17 - (i % 2) * 1.2); });
  /* water tank on a stand */
  const tk = new T.Group(); tk.position.set(5.6, 0, -2.9); CUR.add(tk);
  for (const [px, pz] of [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]]) gmesh(tk, new T.BoxGeometry(.08, .9, .08), mat(0x44413c), px, .45, pz);
  gmesh(tk, new T.CylinderGeometry(.62, .62, .95, 16), mat(0x1c1f22, { roughness: .6 }), 0, 1.4, 0); gmesh(tk, new T.CylinderGeometry(.5, .62, .14, 16), mat(0x1c1f22), 0, 1.95, 0);
  /* clothesline with saris and shirts */
  for (const px of [-5.6, -1.6]) add(new T.CylinderGeometry(.04, .04, 2.3, 6), mat(0x6a5a4a), px, 1.15, -2.9);
  add(new T.CylinderGeometry(.008, .008, 4, 4), mat(0x222222), -3.6, 2.2, -2.9, false).rotation.z = Math.PI / 2;
  [[-5.1, .55, 1.3, 0xd8453a], [-4.4, .4, 1, 0xf2c14e], [-3.8, .7, 1.5, 0x2f8f9d], [-3.0, .45, .9, 0xffffff], [-2.3, .6, 1.4, 0xd9708a]].forEach(([cx, cw, ch, c]) => { const o = add(new T.BoxGeometry(cw, ch, .02), mat(c, { roughness: 1, side: T.DoubleSide }), cx, 2.2 - ch / 2, -2.9); o.rotation.z = Math.sin(cx) * .05; });
  /* rope cot, plants, a stool */
  gmesh(SETG.terrace, new T.BoxGeometry(1.9, .08, .9), mat(0x6a4a30), -5.2, .42, 2.2);
  for (const [px, pz] of [[-1.1, -.35], [1.1, -.35], [-1.1, .35], [1.1, .35]]) gmesh(SETG.terrace, new T.BoxGeometry(.08, .42, .08), mat(0x6a4a30), -5.2 + px * .9, .21, 2.2 + pz);
  gmesh(SETG.terrace, new T.BoxGeometry(1.7, .03, .75), mat(0xc9b48a, { roughness: 1 }), -5.2, .47, 2.2);
  for (const [px, pz] of [[2.4, -3.5], [3.2, -3.6], [-7.2, -3.4]]) { gmesh(SETG.terrace, new T.CylinderGeometry(.28, .2, .42, 10), mat(0xa4532f), px, .21, pz); gmesh(SETG.terrace, new T.SphereGeometry(.34, 9, 7), mat(0x3d7a44, { roughness: 1 }), px, .66, pz); }
  lampAt(-2.5, -3.6, 2.6);
  CUR = null;
}
buildStreet(); buildTerrace();
function applySet(name) { curSet = SETS[name] ? name : 'stall'; for (const k in SETG) SETG[k].visible = k === curSet; }

// actors
function actor(col, skin, hair, fem, acc) {
  const g = new T.Group(), m = mat(col, { roughness: .9 }), d = mat(fem ? 0xe9dfcf : 0x2b2b38), sk = mat(skin, { roughness: .6 }), hm = mat(hair, { roughness: .5 }), dk = mat(0x140e0b), sh = mat(0x1b1512);
  const part = (geo, mm, x, y, z, par = g) => { const o = new T.Mesh(geo, mm); o.position.set(x, y, z); o.castShadow = true; par.add(o); return o; };
  const legs = [-1, 1].map(s => { const p = new T.Group(); p.position.set(.095 * s, .86, 0); part(new T.CapsuleGeometry(.07, .64, 6, 12), d, 0, -.4, 0, p); part(new T.BoxGeometry(.1, .07, .24), sh, 0, -.83, .05, p); g.add(p); return p; });
  part(new T.CapsuleGeometry(.18, .44, 8, 18), m, 0, 1.22, 0).scale.set(1, 1, .72);
  part(new T.CylinderGeometry(.17, fem ? .29 : .2, fem ? .5 : .22, 18, 1, true), m, 0, fem ? .82 : .93, 0).scale.set(1, 1, .78);
  const arms = [-1, 1].map(s => { const p = new T.Group(); p.position.set(.235 * s, 1.43, 0); part(new T.CapsuleGeometry(.055, .5, 6, 12), m, 0, -.3, 0, p); part(new T.SphereGeometry(.045, 12, 10), sk, 0, -.62, .01, p); g.add(p); return p; });
  part(new T.CylinderGeometry(.05, .06, .12, 12), sk, 0, 1.54, 0);
  part(new T.SphereGeometry(.12, 24, 18), sk, 0, 1.68, 0).scale.set(.92, 1.1, .98);
  for (const x of [-1, 1]) { part(new T.SphereGeometry(.011, 10, 8), dk, .04 * x, 1.695, .104); part(new T.BoxGeometry(.04, .008, .01), hm, .04 * x, 1.725, .106).rotation.z = -.12 * x; part(new T.SphereGeometry(.026, 10, 8), sk, .112 * x, 1.68, 0).scale.set(.5, 1, .8); }
  part(new T.ConeGeometry(.016, .045, 8), sk, 0, 1.665, .118).rotation.x = Math.PI / 2;
  part(new T.BoxGeometry(.035, .006, .006), mat(0x7a3b33), 0, 1.625, .108);
  const cap = part(new T.SphereGeometry(.13, 24, 14, 0, Math.PI * 2, 0, Math.PI * .5), hm, 0, 1.7, -.012); cap.rotation.x = -.42; cap.scale.set(.96, 1.15, 1.02);
  if (fem) { part(new T.SphereGeometry(.065, 14, 10), hm, 0, 1.68, -.13); part(new T.CapsuleGeometry(.03, .34, 4, 8), hm, 0, 1.42, -.12); for (const z of [.128, -.128]) part(new T.BoxGeometry(.07, .62, .015), mat(acc), 0, 1.24, z).rotation.z = .62; }
  else part(new T.TorusGeometry(.065, .018, 8, 18), m, 0, 1.5, .01).rotation.x = Math.PI / 2;
  g.userData = { legs, arms }; scene.add(g); return g;
}
const AC = { A: actor(0xd8652a, 0xc58a62, 0x1b1210, true, 0xf2c14e), B: actor(0x2a8d84, 0xb27b56, 0x231915, false) };
const REAL = {}, REAL_YAW = 0;
const TXL = new T.TextureLoader(), TXC = {}, TXD = {};
function skinMat(mm) {
  const t = TXD[mm.name]; if (!t || mm.userData.sk) return; mm.userData.sk = 1;
  mm.color.set(t.a).multiplyScalar(1.8); if (t.o) mm.visible = false;
  const get = (u, srgb) => TXC[u] || (TXC[u] = new Promise(r => TXL.load(u, x => { x.flipY = false; x.anisotropy = 4; if (srgb) x.colorSpace = T.SRGBColorSpace; r(x); }, undefined, e => { console.warn('tex fail', mm.name, e && e.type); r(null); })));
  get(t.c, true).then(x => { if (x) { mm.map = x; mm.color.set(0xffffff); mm.visible = true; mm.needsUpdate = true; } });
  if (t.n) get(t.n, false).then(x => { if (x) { mm.normalMap = x; mm.needsUpdate = true; } });
}

/* action clips: compact quaternion tracks from assets_src/actions.json (Rocketbox animations, MIT), played ping-pong so any shot length works */
function actionClip(name, d, bones, fps) {
  const dec = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Int16Array(u.buffer); };
  const q = dec(d.q), y = dec(d.y), nb = bones.length, times = new Float32Array(d.n);
  for (let i = 0; i < d.n; i++) times[i] = Math.min(i / fps, d.dur);
  const tr = bones.map((b, j) => { const v = new Float32Array(d.n * 4); for (let i = 0; i < d.n; i++) for (let c = 0; c < 4; c++) v[i * 4 + c] = q[(i * nb + j) * 4 + c] / 32767; return new T.QuaternionKeyframeTrack(b + '.quaternion', times, v); });
  const pv = new Float32Array(d.n * 3); for (let i = 0; i < d.n; i++) pv[i * 3 + 1] = y[i] / 1000;
  tr.push(new T.VectorKeyframeTrack('Bip01.position', times, pv));
  return new T.AnimationClip(name, d.dur, tr);
}
const pingPong = (t, dur) => { const p = ((t % (2 * dur)) + 2 * dur) % (2 * dur); return p < dur ? p : 2 * dur - p; };
/* props: plastic chair for seated actions, chai glass in the hand for sipping */
function makeChair() {
  const g = new T.Group(), mat = new T.MeshStandardMaterial({ color: 0xc0392b, roughness: .55 });
  const seat = new T.Mesh(new T.BoxGeometry(.42, .035, .4), mat); seat.position.set(0, .45, -.08);
  const back = new T.Mesh(new T.BoxGeometry(.4, .3, .03), mat); back.position.set(0, .66, -.27); back.rotation.x = -.12;
  g.add(seat, back);
  for (const [x, z] of [[-.17, .08], [.17, .08], [-.17, -.22], [.17, -.22]]) { const l = new T.Mesh(new T.CylinderGeometry(.016, .016, .45, 8), mat); l.position.set(x, .225, z); g.add(l); }
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); g.visible = false; return g;
}
function makeGlass() {
  const g = new T.Group();
  const body = new T.Mesh(new T.CylinderGeometry(.034, .027, .085, 16), new T.MeshStandardMaterial({ color: 0xe9eef0, transparent: true, opacity: .55, roughness: .1 }));
  const tea = new T.Mesh(new T.CylinderGeometry(.031, .026, .06, 16), new T.MeshStandardMaterial({ color: 0xb8742e, roughness: .4 })); tea.position.y = -.01;
  g.add(body, tea); g.visible = false; return g;
}
/* ---------- costumes: accessories attached to the avatar's bones (head, neck and spine have x up and y forward) ---------- */
const OUTFITS = {
  plain: { label: 'Plain clothes', parts: [] },
  topi: { label: 'Topi and glasses', parts: ['topi', 'glasses'] },
  turban: { label: 'Turban', parts: ['turban'] },
  student: { label: 'Student with bag', parts: ['bag', 'glasses'] },
  garland: { label: 'Marigold garland', parts: ['garland'] },
  dupatta: { label: 'Dupatta', parts: ['dupatta'] },
  umbrella: { label: 'Umbrella', parts: ['umbrella'] }
};
const normOutfit = o => ({ A: o && OUTFITS[o.A] ? o.A : 'plain', B: o && OUTFITS[o.B] ? o.B : 'plain' });
const outfitOf = () => normOutfit(typeof P !== 'undefined' && P && P.outfit);
function makeParts(name) {
  const m = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .8 }, o)), at = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; return mesh; };
  const cylX = (r1, r2, h, mm) => new T.Mesh(new T.CylinderGeometry(r1, r2, h, 16).rotateZ(-Math.PI / 2), mm);
  const g = new T.Group(); let bone = 'Bip01_Head';
  if (name === 'topi') { const cap = new T.Mesh(new T.SphereGeometry(.105, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2), m(0xf4f1ea, { roughness: .95, side: T.DoubleSide })); cap.scale.set(.85, 1, 1); g.add(at(cap, .16, .0, 0)); }
  else if (name === 'turban') {
    const c = [0xe07a1f, 0xf2a33c, 0xe07a1f]; c.forEach((col, i) => { const t = new T.Mesh(new T.TorusGeometry(.098 - i * .006, .028, 8, 22).rotateY(Math.PI / 2), m(col, { roughness: .9 })); g.add(at(t, .16 + i * .035, .0, 0)); });
    const top = new T.Mesh(new T.SphereGeometry(.082, 16, 10), m(0xe07a1f, { roughness: .9 })); top.scale.set(.6, 1, 1); g.add(at(top, .24, 0, 0));
  } else if (name === 'glasses') {
    const fm = m(0x15110f, { roughness: .4 });
    for (const s of [-1, 1]) { g.add(at(new T.Mesh(new T.TorusGeometry(.023, .0035, 6, 18).rotateX(Math.PI / 2), fm), .125, .1, .036 * s)); g.add(at(new T.Mesh(new T.BoxGeometry(.003, .09, .003), fm), .125, .05, .08 * s)); }
    g.add(at(new T.Mesh(new T.BoxGeometry(.003, .003, .026), fm), .13, .1, 0));
  } else if (name === 'bag') {
    bone = 'Bip01_Pelvis';
    g.add(at(new T.Mesh(new T.BoxGeometry(.28, .3, .1), m(0x8a3d2a, { roughness: 1 })), -.03, -.02, .27)); // up, fore-aft, lateral
    const st = new T.Mesh(new T.BoxGeometry(.58, .012, .035), m(0x3a2a20, { roughness: 1 })); st.position.set(.3, .125, .07); st.rotation.y = .8; st.castShadow = true; g.add(st);
  } else if (name === 'garland') {
    bone = 'Bip01_Spine2';
    for (const [r, c, dx] of [[.17, 0xff8a00, .17], [.15, 0xd6336c, .12]]) { const t = new T.Mesh(new T.TorusGeometry(r, .036, 8, 24).rotateY(Math.PI / 2), m(c, { roughness: .95 })); t.scale.set(1, 1.25, 1); t.rotation.z = .3; g.add(at(t, dx, .05, 0)); }
  } else if (name === 'dupatta') {
    bone = 'Bip01_Spine2'; const mm = m(0xd9708a, { roughness: .95, side: T.DoubleSide });
    const loop = new T.Mesh(new T.TorusGeometry(.17, .03, 8, 24).rotateY(Math.PI / 2), mm); loop.scale.set(1, 1.2, 1); g.add(at(loop, .17, .02, 0));
    g.add(at(new T.Mesh(new T.BoxGeometry(.6, .012, .12), mm), -.02, .14, .06)); g.add(at(new T.Mesh(new T.BoxGeometry(.45, .012, .12), mm), .02, -.13, -.04));
  } else if (name === 'umbrella') {
    bone = 'Bip01_R_Hand';
    g.add(at(cylX(.012, .012, .95, m(0x222222, { metalness: .6, roughness: .4 })), .38, .03, 0)); g.add(at(cylX(.034, .02, .5, m(0x1c2a4a, { roughness: .9 })), .55, .03, 0));
    g.add(at(cylX(.022, .022, .22, m(0x5a3d28)), -.1, .03, 0));
  }
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return { bone, obj: g };
}
/* puts the chosen costume on actor k (removes the previous one) */
function applyOutfit(k) {
  const R = REAL[k]; if (!R) return; const id = outfitOf()[k]; if (R.outfit === id) return;
  for (const a of R.acc || []) a.removeFromParent();
  R.acc = []; R.outfit = id;
  for (const p of OUTFITS[id].parts) { const { bone, obj } = makeParts(p), b = R.root.getObjectByName(bone); if (b) { b.add(obj); R.acc.push(obj); } }
}
/* ---------- cast: which avatar plays actor A and actor B ---------- */
const normCast = o => ({ A: AV[o && o.A] ? o.A : DEFAULT_CAST.A, B: AV[o && o.B] ? o.B : DEFAULT_CAST.B });
const bufOf = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
const GL = T.GLTFLoader ? new T.GLTFLoader() : null;
const loadGlb = d => new Promise(r => { try { GL.parse(bufOf(d), '', g => r(g), () => r(null)); } catch (e) { r(null); } });
const AVC = {}, installing = {};
/* builds one actor from an avatar: model, idle and walk clips for its gender, the action clips, chair and glass props */
async function installActor(k, id) {
  const av = AV[id]; if (!av || !GL || !AVC[av.g]) return;
  installing[k] = id;
  const src = av.src ? KA0[av.src] : KA0.avatars[id].glb; if (!av.src) Object.assign(TXD, KA0.avatars[id].tex);
  const gl = await loadGlb(src); if (!gl) { installing[k] = null; return; }
  const m = gl.scene, { ic, wc } = AVC[av.g], g = AC[k], old = REAL[k];
  const mx = new T.AnimationMixer(m), ia = mx.clipAction(ic.animations[0]), wa = mx.clipAction(wc.animations[0]); ia.play(); wa.weight = 0; wa.play(); mx.update(0);
  m.updateMatrixWorld(true); const bx = new T.Box3().setFromObject(m, true), sc = (av.g === 'f' ? 1.66 : 1.78) / (bx.max.y - bx.min.y);
  const w = new T.Group(); w.add(m); m.scale.multiplyScalar(sc); m.position.set(-(bx.min.x + bx.max.x) / 2 * sc, -bx.min.y * sc, -(bx.min.z + bx.max.z) / 2 * sc); w.rotation.y = REAL_YAW;
  m.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; o.frustumCulled = false; const mm = o.material; if (!mm) return; mm.envMapIntensity = .7; skinMat(mm); });
  if (old) { g.remove(old.root); g.remove(old.chair); } else g.children.forEach(c => c.visible = false);
  g.add(w);
  const act = {}, AD = KA0.actions;
  if (AD) for (const nm of Object.keys(ACTION_LABEL)) { const d = AD.clips[av.g + '_' + nm]; if (!d) continue; const a = mx.clipAction(actionClip(nm, d, AD.bones, AD.fps)); a.play(); a.weight = 0; act[nm] = { a, dur: d.dur }; }
  const chair = makeChair(); g.add(chair);
  const glass = makeGlass(), hand = m.getObjectByName('Bip01_R_Hand'); if (hand) { glass.position.set(.09, .02, .03); hand.add(glass); } else g.add(glass);
  REAL[k] = { mx, ia, wa, act, chair, glass, sc, bx: [bx.min.toArray().map(v => +v.toFixed(2)), bx.max.toArray().map(v => +v.toFixed(2))], root: w, avatar: id, iD: ic.animations[0].duration, wD: wc.animations[0].duration };
  installing[k] = null; pathKey = ''; applyOutfit(k);
}
/* makes the scene's actors match P.actors (called after every change of the project) */
function syncCast() {
  const c = castOf(); for (const k of ['A', 'B']) applyOutfit(k);
  for (const k of ['A', 'B']) if (AVC.f && c[k] && (REAL[k] ? REAL[k].avatar : null) !== c[k] && installing[k] !== c[k]) installActor(k, c[k]).then(() => { if (REAL[k] && REAL[k].avatar !== castOf()[k]) syncCast(); else refreshNames(); });
}
function loadReal() {
  const A = KA0; try { delete window.__KA; } catch (e) {} if (!A.meera || !GL) return;
  Object.assign(TXD, A.tex || {});
  Promise.all(['f_idle', 'f_walk', 'm_idle', 'm_walk'].map(n => loadGlb(A[n]))).then(([fi, fw, mi, mw]) => {
    for (const [g, ic, wc] of [['f', fi, fw], ['m', mi, mw]]) {
      if (!ic || !wc) continue;
      wc.animations[0].tracks.forEach(t => { if (/^Bip01(_Footsteps)?\.position$/.test(t.name)) for (let i = 0; i < t.values.length; i += 3) { t.values[i] = t.values[0]; t.values[i + 2] = t.values[2]; } });
      AVC[g] = { ic, wc };
    }
    syncCast();
  });
}
loadReal();
const HOME = { A: new T.Vector3(-.85, 0, .2), B: new T.Vector3(.85, 0, .35) };
const FACE = { A: .45, B: -.45 };

// camera proxy (visible in set view only)
const proxy = new T.Group();
const pb = new T.Mesh(new T.BoxGeometry(.28, .2, .36), new T.MeshBasicMaterial({ color: 0xffb547 })); proxy.add(pb);
const pl = new T.Mesh(new T.CylinderGeometry(.07, .09, .18, 12), new T.MeshBasicMaterial({ color: 0x222222 })); pl.rotation.x = Math.PI / 2; pl.position.z = -.26; proxy.add(pl);
scene.add(proxy);
const frustCam = new T.PerspectiveCamera(40, 2.39, .1, 1.6); const helper = new T.CameraHelper(frustCam); scene.add(helper);
const pathGeo = new T.BufferGeometry(); const path = new T.Line(pathGeo, new T.LineBasicMaterial({ color: 0xff6b4a })); scene.add(path);
for (const o of [proxy, helper, path]) o.traverse(c => c.layers.set(1));

/* ---------- pose solver ---------- */
const V = (x, y, z) => new T.Vector3(x, y, z);
/* position and heading at fraction t along start -> waypoints, at a steady pace */
function walkRoute(p0, rt, t) {
  const pts = [[p0.x, p0.z], ...rt.map(q => [q.x, q.z])], len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = len[len.length - 1], d = clamp(t, 0, 1) * L; let i = 1; while (i < pts.length - 1 && len[i] < d) i++;
  const a = pts[i - 1], b = pts[i], sl = len[i] - len[i - 1], u = sl > 1e-6 ? clamp((d - len[i - 1]) / sl, 0, 1) : 1;
  const h = sl > 1e-6 ? Math.atan2(b[0] - a[0], b[1] - a[1]) : 0;
  return { x: lerp(a[0], b[0], u), z: lerp(a[1], b[1], u), h };
}
function subjPos(sh, t) {
  const k = sh.subject === 'both' ? null : sh.subject;
  const walkers = ['A', 'B'].filter(a => sh['action' + a] === 'walk' || (MV[sh.move].walk && a === (k || 'A')));
  const pos = {}; for (const a of ['A', 'B']) pos[a] = sh['place' + a] ? V(sh['place' + a].x, 0, sh['place' + a].z) : HOME[a].clone();
  const head = {};
  for (const w of walkers) {
    const rt = sh['route' + w] || [];
    if (rt.length) { const r = walkRoute(pos[w], rt, t); pos[w].set(r.x, 0, r.z); head[w] = r.h; continue; }
    pos[w].x += lerp(-2.2, 2.2, t) * sh.dir; if (!sh['place' + w]) pos[w].z += 1.1;
  }
  const target = k ? pos[k] : pos.A.clone().add(pos.B).multiplyScalar(.5);
  return { target: target.clone(), pos, walkers, head };
}
function solve(sh, t, sec) {
  const mv = MV[sh.move] || MV.static, te = mv.raw ? t : EF[sh.easing](t);
  const sp = subjPos(sh, t), sz = SIZES[sh.size];
  const vf = 2 * Math.atan(sensorH() / (2 * sh.lens));
  const frameH = sz.h * (sh.subject === 'both' ? 1.5 : 1);
  const d0 = (frameH / 2) / Math.tan(vf / 2);
  const eyeA = AV[castOf().A].g === 'f' ? 1.59 : 1.69, eyeB = AV[castOf().B].g === 'f' ? 1.59 : 1.69, eye = { A: eyeA, B: eyeB, both: (eyeA + eyeB) / 2 }[sh.subject], face = h => Math.max(.9, eye - h / 6);
  const s = { d: d0, az: sh.angle * D2R, ty: face(frameH), lat: 0, yaw: 0, pitch: 0, roll: 0, fovMul: 1, shake: 0 };
  s.camY = { ground: .22, low: Math.max(.25, s.ty - .35 * d0), eye: 1.55, high: s.ty + .5 * d0 + .3, top: s.ty + d0 }[sh.height];
  const y0 = s.camY; mv.ap(s, te, sh.amount, sh.dir);
  s.ty += face(frameH * (s.d / d0) * (mv.keep ? 1 : s.fovMul)) - face(frameH);
  const tg = V(sp.target.x, s.ty, sp.target.z);
  const dh = sh.height === 'top' ? .35 : s.d;
  const pos = V(tg.x + Math.sin(s.az) * dh, sh.height === 'top' ? s.ty + s.d + (s.camY - y0) : s.camY, tg.z + Math.cos(s.az) * dh);
  const rt = V(Math.cos(s.az), 0, -Math.sin(s.az)).multiplyScalar(s.lat); pos.add(rt); tg.add(rt);
  let fov = mv.keep ? 2 * Math.atan(Math.tan(vf / 2) * d0 / s.d) : vf * s.fovMul;
  if (s.shake) { const k = s.shake, q = sec * 1.0; pos.x += (Math.sin(q * 1.7) + Math.sin(q * 3.9) * .5) * .025 * k; pos.y += (Math.sin(q * 2.3 + 1) + Math.sin(q * 5.1) * .4) * .02 * k; s.roll += Math.sin(q * 1.3 + 2) * .02 * k; s.pitch += Math.sin(q * 2.9) * .012 * k; s.yaw += Math.sin(q * 1.9 + 4) * .015 * k; }
  return { pos, tg, fov: fov / D2R, yaw: s.yaw, pitch: s.pitch, roll: s.roll, sp };
}
function applyCam(c, p) { c.position.copy(p.pos); c.up.set(0, 1, 0); c.lookAt(p.tg); c.rotateY(p.yaw); c.rotateX(p.pitch); c.rotateZ(p.roll); c.fov = clamp(p.fov, 3, 120); c.updateProjectionMatrix(); }

/* ---------- action lane: timed action changes inside one shot ---------- */
const BLEND = .25;
const actionColor = a => `hsl(${(Object.keys(ACTION_LABEL).indexOf(a) * 31 + 12) % 360} 55% 42%)`;
function segmentsOf(sh, k) {
  const base = { t: 0, a: sh['action' + k] };
  if (base.a === 'walk') return [base];
  return [base].concat((sh['cues' + k] || []).filter(c => c.t > 0 && c.t < sh.duration).sort((x, y) => x.t - y.t));
}
const seqText = (sh, k) => { const g = segmentsOf(sh, k); return g.length === 1 ? ACTION_LABEL[g[0].a] : g.map((x, i) => i ? `${ACTION_SHORT[x.a]} (${+x.t.toFixed(1)} s)` : ACTION_SHORT[x.a]).join(' > '); };
const describeActions = (sh, k) => `${ACTOR_NAME[k]}: ${seqText(sh, k)}`;
let lane = { k: 'A', i: 0 };
function laneBars(sh) {
  return ['A', 'B'].map(k => {
    const segs = segmentsOf(sh, k);
    return `<div class="lane"><span>${ACTOR_NAME[k]}</span><div class="lbar">${segs.map((g, i) => { const end = i + 1 < segs.length ? segs[i + 1].t : sh.duration; return `<button class="lseg${lane.k === k && lane.i === i ? ' on' : ''}" data-seg="${k}:${i}" style="flex:${Math.max(.2, end - g.t)} 1 0;--c:${actionColor(g.a)}" title="${ACTION_LABEL[g.a]} from ${+g.t.toFixed(1)} s">${ACTION_SHORT[g.a]}</button>`; }).join('')}</div></div>`;
  }).join('');
}
function laneEditor(sh) {
  const segs = segmentsOf(sh, lane.k); lane.i = clamp(lane.i, 0, segs.length - 1); const g = segs[lane.i], first = lane.i === 0, walking = sh['action' + lane.k] === 'walk';
  const opts = Object.entries(ACTION_LABEL).filter(([a]) => first || a !== 'walk').map(([a, l]) => `<option value="${a}"${a === g.a ? ' selected' : ''}>${l}</option>`).join('');
  return `<div class="f"><label>${ACTOR_NAME[lane.k]}, part ${lane.i + 1} of ${segs.length}${first ? '' : `<em data-o="cue">from ${+g.t.toFixed(1)} s</em>`}</label><select data-lk="a">${opts}</select></div>`
    + (first ? '' : `<div class="f"><input type="range" data-lk="t" min=".5" max="${Math.max(.5, sh.duration - .5)}" step=".5" value="${g.t}"></div>`)
    + `<div class="pl" style="grid-template-columns:1fr 1fr"><button data-lane="add"${walking || segs.length >= 8 ? ' disabled' : ''} title="Add an action change at the playhead">+ Change at playhead</button><button data-lane="del"${first ? ' disabled' : ''}>Remove part</button></div>`;
}
const laneHTML = sh => `<div class="f"><label>Action sequence<em>click a part to edit</em></label><div id="laneBars">${laneBars(sh)}</div></div><div id="laneEd">${laneEditor(sh)}</div>`;
function setSegAction(sh, k, i, v) { if (i === 0) { sh['action' + k] = v; if (v === 'walk') sh['cues' + k] = []; } else sh['cues' + k][i - 1].a = v; }
{
  const box = $('#insp');
  box.addEventListener('click', e => {
    const sh = P.shots[sel]; if (!sh) return;
    const sg = e.target.closest('button[data-seg]'); if (sg) { const [k, i] = sg.dataset.seg.split(':'); lane = { k, i: +i }; $('#laneBars').innerHTML = laneBars(sh); $('#laneEd').innerHTML = laneEditor(sh); return; }
    const b = e.target.closest('button[data-lane]'); if (!b || b.disabled) return;
    commit(); const k = lane.k, cues = sh['cues' + k] = (sh['cues' + k] || []).slice();
    if (b.dataset.lane === 'add') {
      const at = clamp(Math.round((time - starts()[sel]) * 2) / 2, .5, Math.max(.5, sh.duration - .5)), used = new Set(cues.map(c => c.t));
      let t = at; for (let n = 0; used.has(t) && n < 40; n++) t = clamp(t + .5, .5, Math.max(.5, sh.duration - .5));
      const cur = segmentsOf(sh, k).slice(-1)[0].a; cues.push({ t, a: cur === 'talk' ? 'listen' : 'talk' }); cues.sort((x, y) => x.t - y.t); lane.i = segmentsOf(sh, k).findIndex(g => g.t === t);
    } else { cues.splice(lane.i - 1, 1); lane.i = Math.max(0, lane.i - 1); }
    pathKey = ''; buildInsp(); buildTL();
  });
  box.addEventListener('change', e => {
    const lk = e.target.dataset.lk, sh = P.shots[sel]; if (lk !== 'a' || !sh) return;
    commit(); setSegAction(sh, lane.k, lane.i, e.target.value); pathKey = ''; buildInsp(); buildTL();
  });
  box.addEventListener('input', e => {
    if (e.target.dataset.lk !== 't') return; const sh = P.shots[sel]; if (!sh) return;
    if (!editing) { commit(); editing = true; }
    const cues = sh['cues' + lane.k], c = cues[lane.i - 1]; c.t = +e.target.value; const keep = c; cues.sort((x, y) => x.t - y.t); lane.i = cues.indexOf(keep) + 1;
    const o = $('[data-o="cue"]'); if (o) o.textContent = `from ${c.t} s`; $('#laneBars').innerHTML = laneBars(sh);
  });
}

/* walk routes drawn on the floor of the set view */
const routeLine = {}; for (const k of ['A', 'B']) { routeLine[k] = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({ color: k === 'A' ? 0xff6b4a : 0x4aa8ff })); routeLine[k].layers.set(1); scene.add(routeLine[k]); }
let routeKey = '';
const walksIn = (sh, k) => sh['action' + k] === 'walk' || (MV[sh.move].walk && k === (sh.subject === 'B' ? 'B' : 'A'));
function drawRoutes(sh) {
  const key = sh ? ['A', 'B'].map(k => walksIn(sh, k) ? JSON.stringify([sh['place' + k], sh['route' + k]]) : '').join('|') : '';
  if (key === routeKey) return; routeKey = key;
  for (const k of ['A', 'B']) {
    const rt = sh && walksIn(sh, k) && sh['route' + k].length ? sh['route' + k] : null;
    routeLine[k].visible = !!rt; if (!rt) continue;
    const st = subjPos(sh, 0).pos[k], pts = [V(st.x, .04, st.z), ...rt.map(q => V(q.x, .04, q.z))];
    routeLine[k].geometry.dispose(); routeLine[k].geometry = new T.BufferGeometry().setFromPoints(pts);
  }
}
/* facing in radians: explicit angle, else towards the other actor when either is placed, else the default stance */
function faceRad(sh, k, pos) {
  const v = sh && sh['face' + k]; if (v !== null && v !== undefined) return v * D2R;
  const o = k === 'A' ? 'B' : 'A';
  return sh && (sh.placeA || sh.placeB) ? Math.atan2(pos[o].x - pos[k].x, pos[o].z - pos[k].z) : FACE[k];
}
const defFace = (sh, k) => sh[k] ?? Math.round(faceRad(sh, k.slice(-1), subjPos(sh, 0).pos) / D2R);
function poseActors(sh, t, sec, clock) {
  const sp = sh ? subjPos(sh, t) : { pos: { A: HOME.A, B: HOME.B }, walkers: [], head: {} };
  drawRoutes(sh);
  for (const k of ['A', 'B']) {
    const g = AC[k], u = g.userData, w = sp.walkers.includes(k), an = w ? 'walk' : (sh && sh['action' + k]) || 'stand';
    g.position.copy(sp.pos[k]);
    g.rotation.y = w ? (sp.head[k] !== undefined ? sp.head[k] : sh.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : faceRad(sh, k, sp.pos);
    const ph = w ? sec * 7.5 : 0, br = Math.sin(clock * 1.6 + (k === 'A' ? 0 : 2)) * .012;
    u.legs[0].rotation.x = Math.sin(ph) * .55; u.legs[1].rotation.x = -Math.sin(ph) * .55;
    u.arms[0].rotation.x = -Math.sin(ph) * .45; u.arms[1].rotation.x = Math.sin(ph) * .45;
    u.arms[0].rotation.z = -.08; u.arms[1].rotation.z = .08;
    g.position.y = w ? Math.abs(Math.sin(ph)) * .03 : br;
    const Q = REAL[k];
    if (Q) {
      const segs = w || !sh ? [{ t: 0, a: an }] : segmentsOf(sh, k); let si = segs.length - 1; while (si > 0 && sec < segs[si].t) si--;
      const cur = segs[si], prev = si > 0 ? segs[si - 1] : null, bw = prev ? clamp((sec - cur.t) / BLEND, 0, 1) : 1, wt = {}, st0 = {};
      wt[cur.a] = bw; if (prev) { wt[prev.a] = (wt[prev.a] || 0) + 1 - bw; st0[prev.a] = prev.t; } st0[cur.a] = cur.t;
      Q.wa.weight = wt.walk || 0; Q.ia.weight = wt.stand || 0;
      for (const nm in Q.act) Q.act[nm].a.weight = wt[nm] || 0;
      Q.ia.time = (clock + (k === 'A' ? 0 : 1.3)) % Q.iD; Q.wa.time = (sec * 1.1) % Q.wD;
      for (const nm in Q.act) if (wt[nm]) Q.act[nm].a.time = pingPong(sec - st0[nm] + (k === 'A' ? 0 : .7), Q.act[nm].dur);
      Q.mx.update(0); g.position.y = 0;
      Q.chair.visible = ((wt.sit || 0) + (wt.think || 0)) > 0; Q.glass.visible = (wt.sip || 0) > 0;
    }
  }
}
let pathFor = -1, pathKey = '';
function updatePath(i) {
  const sh = P.shots[i]; const key = i + JSON.stringify(sh);
  if (!sh || key === pathKey) return; pathKey = key; pathFor = i;
  const pts = []; for (let k = 0; k <= 60; k++) pts.push(solve(sh, k / 60, k / 60 * sh.duration).pos);
  pathGeo.setFromPoints(pts);
}

function applyLook(name) {
  const L = LOOKS[name] || LOOKS.golden, u = grade.uniforms;
  sun.color.set(L.sun[0]); sun.intensity = L.sun[1]; hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2]; fill.intensity = L.fill;
  BULBS.forEach(b => b.intensity = L.bulb); GLASS.forEach(m => m.color.set(L.glass).multiplyScalar(name === 'night' ? .9 : 2.2));
  SHAFTS.forEach(s => { s.material.color.set(L.sun[0]); s.material.opacity = s.material.userData.base * L.shaft; s.visible = L.shaft > 0; });
  scene.background.set(L.fog); scene.fog.color.set(L.fog); dust.material.opacity = L.dust;
  u.uLift.value.set(...L.g[0]); u.uGain.value.set(...L.g[1]); u.uSat.value = L.g[2]; u.uCon.value = L.g[3]; u.uVig.value = L.g[4]; u.uGrain.value = L.g[5]; u.uCA.value = L.g[6];
}
/* ---------- render ---------- */
let fpsAcc = 0, fpsN = 0, light = false;
function setLight(v) { light = v; R.setPixelRatio(v ? 1 : Math.min(devicePixelRatio, 1.5)); bokeh.enabled = bloom.enabled = !v; R.shadowMap.enabled = !v; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); layout(); $('#bPerf').style.color = v ? 'var(--ac)' : ''; }
function perf(dt) { if (light || demo || window.__kalki || location.hash === '#hq') return; fpsAcc += dt; fpsN++; if (fpsAcc > 3) { if (fpsN / fpsAcc < 22) { setLight(true); toast('Switched to Light mode for smoother playback on this computer'); } fpsAcc = 0; fpsN = 0; } }
let film = { x: 0, y: 0, w: 1, h: 1 }, ins = null;
function layout() {
  const v = $('#view'), cw = v.clientWidth, ch = v.clientHeight;
  R.setSize(cw, ch, false);
  const asp = +P.aspect || 2.39, pad = 18;
  let w = cw - pad * 2, h = w / asp; if (h > ch - pad * 2) { h = ch - pad * 2; w = h * asp; }
  film = { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
  $('#frame').classList.toggle('narrow', w < 460);
  Object.assign($('#frame').style, { left: film.x + 'px', top: film.y + 'px', width: w + 'px', height: h + 'px' });
  const iw = Math.max(180, Math.min(300, cw * .26)), ih = iw * .62;
  ins = { x: cw - iw - 12, y: 12, w: iw, h: ih };
  Object.assign($('#inset').style, { left: ins.x + 'px', top: ins.y + 'px', width: iw + 'px', height: ih + 'px', display: showSet && !recording ? 'block' : 'none' });
  composer.setPixelRatio(R.getPixelRatio()); composer.setSize(film.w, film.h); grade.uniforms.uRes.value.set(film.w * R.getPixelRatio(), film.h * R.getPixelRatio());
  cam.aspect = asp; frustCam.aspect = asp; setCam.aspect = iw / ih; setCam.updateProjectionMatrix();
}
const clk = new T.Clock(); let clock = 0, last = 0;
const DEMO_SHOT = newShot({ fstop: 2.8, move: 'orbit', size: 'WS', subject: 'both', lens: 24, height: 'high', amount: .35, duration: 30 });
function frame() { requestAnimationFrame(frame); step(); }
function step() {
  const dt = Math.min(clk.getDelta(), .1); clock += dt;
  const tot = total();
  let sh = null, t = 0, sec = 0, idx = -1;
  if (demo) { sh = DEMO_SHOT; t = (clock % 30) / 30; sec = t * 30; }
  else if (P.shots.length) {
    if (playing) { time += dt; if (time >= tot) { if (loop && !recording) time = 0; else { time = tot; setPlay(false); if (recording) stopRec(); } } }
    const a = at(time); idx = a.i; sh = P.shots[a.i]; t = a.t; sec = a.loc;
  }
  let fstop = 4, focus = 6;
  if (sh) { const p = solve(sh, t, sec); applyCam(cam, p); poseActors(sh, t, sec, clock); fstop = sh.fstop || 2.8; focus = p.pos.distanceTo(V(p.sp.target.x, SIZES[sh.size].ty, p.sp.target.z)); }
  else { applyCam(cam, { pos: V(0, 1.7, 7.5), tg: V(0, 1, 0), fov: 40, yaw: 0, pitch: 0, roll: 0 }); poseActors(null, 0, 0, clock); }
  if (!demo && idx >= 0) {
    updatePath(idx);
    frustCam.position.copy(cam.position); frustCam.quaternion.copy(cam.quaternion); frustCam.fov = cam.fov; frustCam.updateProjectionMatrix(); helper.update();
    proxy.position.copy(cam.position); proxy.quaternion.copy(cam.quaternion);
    if (idx !== sel && playing) { sel = idx; markSel(); }
  }
  proxy.visible = helper.visible = path.visible = !demo && P.shots.length > 0;
  cam.updateMatrixWorld();
  const fl = sensorH() / (2 * Math.tan(cam.fov * D2R / 2));
  bokeh.uniforms.focus.value = focus; bokeh.uniforms.aperture.value = 4.5e-7 * fl * fl / fstop * clamp(2.5 / focus, .35, 2.5);
  const cut = (demo ? -1 : idx) !== prevIdx || !playing && !demo; prevIdx = demo ? -1 : idx;
  const fw = V(0, 0, -10).applyQuaternion(cam.quaternion).add(cam.position).applyMatrix4(prevVP);
  const vel = grade.uniforms.uVel.value; if (cut || !isFinite(fw.x)) vel.set(0, 0); else { vel.set(-fw.x * .25, -fw.y * .25); if (vel.length() > .06) vel.setLength(.06); }
  prevVP.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  grade.uniforms.uTime.value = clock; animFX(dt, clock);
  perf(dt);
  render();
  if (Math.abs(time - last) > .001 || playing) { last = time; updTime(); }
}
function render(noInset) {
  const cw = cv.width / R.getPixelRatio(), ch = cv.height / R.getPixelRatio();
  R.setViewport(0, 0, cw, ch); R.setScissor(0, 0, cw, ch); R.setClearColor(0x050507, 1); R.clear();
  const fy = ch - film.y - film.h;
  R.setViewport(film.x, fy, film.w, film.h); R.setScissor(film.x, fy, film.w, film.h); composer.render();
  if (showSet && !noInset && !recording && !demo) {
    const c = proxy.visible ? proxy.position : V(0, 0, 0);
    setCam.position.set(c.x * .4 + 8, Math.max(9, c.y + 6), c.z * .4 + 11); setCam.lookAt(c.x * .35, .6, c.z * .35 - .5);
    const iy = ch - ins.y - ins.h;
    R.setViewport(ins.x, iy, ins.w, ins.h); R.setScissor(ins.x, iy, ins.w, ins.h); R.clearDepth(); R.render(scene, setCam);
  }
  if (recording) { const r = R.getPixelRatio(); recording.ctx.drawImage(cv, film.x * r, film.y * r, film.w * r, film.h * r, 0, 0, recording.c.width, recording.c.height); }
}

/* ---------- UI ---------- */
const catColor = c => `var(--${c})`;
let filt = 'all';
function buildLib() {
  $('#chips').innerHTML = [['all', 'All'], ...Object.entries(CATS)].map(([k, v]) => `<button class="chip${k === filt ? ' on' : ''}" data-c="${k}">${v}</button>`).join('');
  const q = $('#search').value.trim().toLowerCase();
  const list = MOVES.filter(m => (filt === 'all' || m.cat === filt) && (!q || (m.name + m.s + m.why).toLowerCase().includes(q)));
  $('#moves').innerHTML = list.map(m => `<button class="mv" data-id="${m.id}" style="--c:${catColor(m.cat)}" title="${m.why}"><div class="g">${m.g}</div><div><b>${m.name}</b><span>${m.s}</span></div><div class="add">+</div></button>`).join('') || '<p style="color:var(--mu);padding:12px">No moves match.</p>';
  $('#mvCount').textContent = MOVES.length + ' moves';
}
$('#chips').onclick = e => { const c = e.target.closest('.chip'); if (c) { filt = c.dataset.c; buildLib(); } };
$('#search').oninput = buildLib;
/* phone layout: one panel at a time under the view */
const setTab = t => { document.body.dataset.tab = t; $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); };
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); };
setTab('moves');
$('#moves').onclick = e => {
  const b = e.target.closest('.mv'); if (!b) return;
  const m = MV[b.dataset.id], base = P.shots[sel] || {};
  commit();
  const sh = newShot({ move: m.id, lens: base.lens || 35, size: base.size || 'MS', subject: base.subject || 'A', angle: base.angle || 0, angle2: 0 });
  if (m.walk) sh['action' + (sh.subject === 'B' ? 'B' : 'A')] = 'walk';
  if (m.walk && !base.angle) sh.angle = 80;
  const at2 = P.shots.length ? sel + 1 : 0; P.shots.splice(at2, 0, sh); sel = at2; time = starts()[sel] + .001; setPlay(true);
  refreshAll(); toast(`Added “${m.name}”`);
};

const FIELDS = [
  ['name', 'text', 'Shot name'],
  ['move', 'sel', 'Camera move', () => MOVES.map(m => [m.id, m.name])],
  ['duration', 'rng', 'Duration', 1, 20, .5, v => v.toFixed(1) + ' s'],
  ['lens', 'sel', 'Lens', () => LENSES.map(l => [l, l + ' mm' + (crop() > 1.01 ? ` (≈${eqMm(l)} mm FF)` : '') + (l <= 24 ? ' · wide' : l >= 85 ? ' · tele' : ' · normal')])],
  ['fstop', 'sel', 'Aperture', () => FSTOPS.map(f => [f, 'f/' + f + (f <= 2 ? ' · dreamy' : f >= 8 ? ' · all sharp' : '')])],
  ['size', 'sel', 'Shot size', () => Object.entries(SIZES).map(([k, v]) => [k, `${k} · ${v.label}`])],
  ['subject', 'sel', 'Subject', () => Object.entries(SUBJ)],
  ['height', 'sel', 'Camera height', () => Object.entries(HEIGHTS)],
  ['angle', 'rng', 'Angle around subject', -180, 180, 5, v => v + '°'],
  ['amount', 'rng', 'Move intensity', 0, 1, .05, v => Math.round(v * 100) + '%'],
  ['dir', 'sel', 'Direction', () => [[1, 'Right · up · forward'], [-1, 'Left · down · back']]],
  ['easing', 'sel', 'Easing', () => Object.entries(EASES)],
  ['actionA', 'sel', '@A: action', () => Object.entries(ACTION_LABEL)],
  ['actionB', 'sel', '@B: action', () => Object.entries(ACTION_LABEL)],
  ['faceA', 'rng', '@A faces', -180, 180, 5, v => v + '°'],
  ['faceB', 'rng', '@B faces', -180, 180, 5, v => v + '°'],
  ['notes', 'area', 'Shot notes']
];
function lensNote(l) { return l <= 18 ? 'Ultra-wide: exaggerates space and speed; faces distort up close.' : l <= 24 ? 'Wide: shows the environment; great for establishing and movement.' : l <= 50 ? 'Normal: close to how the eye sees; honest and natural.' : l <= 85 ? 'Portrait: flattering faces, soft separated backgrounds.' : 'Telephoto: compresses depth; feels voyeuristic or intense.'; }
function buildInsp() {
  const sh = P.shots[sel], box = $('#insp');
  $('#sideH').textContent = mode === 'code' ? 'Scene code' : sh ? `Shot ${sel + 1} of ${P.shots.length}` : 'Shot';
  $('#bDup').style.visibility = $('#bDel').style.visibility = sh && mode !== 'code' ? 'visible' : 'hidden';
  if (!sh) { box.innerHTML = '<p style="color:var(--mu);padding-top:8px">No shot selected. Add one from the move library.</p>'; return; }
  const mv = MV[sh.move];
  const f = ([k, type, label0, a, b, c, fmt]) => {
    const label = label0.replace('@A', ACTOR_NAME.A).replace('@B', ACTOR_NAME.B);
    const v = k === 'faceA' || k === 'faceB' ? defFace(sh, k) : sh[k];
    if (type === 'text') return `<div class="f"><label>${label}</label><input type="text" data-k="${k}" value="${String(v).replace(/"/g, '&quot;')}" maxlength="40"></div>`;
    if (type === 'area') return `<div class="f"><label>${label}<em data-o="notes">${String(v).length}/${NOTE_MAX}</em></label><textarea data-k="${k}" rows="3" maxlength="${NOTE_MAX}" placeholder="Intent, blocking, reference, reminders for the crew…">${esc(v)}</textarea></div>`;
    if (type === 'sel') return `<div class="f"><label>${label}</label><select data-k="${k}">${a().map(([o, l]) => `<option value="${o}"${String(o) === String(v) ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`;
    return `<div class="f"><label>${label}<em data-o="${k}">${c ? fmt(+v) : v}</em></label><input type="range" data-k="${k}" min="${a}" max="${b}" step="${c}" value="${v}"></div>`;
  };
  const F = Object.fromEntries(FIELDS.map(x => [x[0], f(x)]));
  box.innerHTML = F.name + F.move + `<div class="row">${F.lens}${F.fstop}</div><div class="row">${F.size}${F.subject}</div>${F.height}` + F.duration + F.angle + (mv.id !== 'static' ? F.amount : '') + `<div class="row">${mv.dir ? F.dir : ''}${F.easing}</div>` + F.actionA + F.actionB + laneHTML(sh) + `<div class="f"><label>Placement<em>click the set view</em></label><div class="pl"><button data-pl="A" class="${placing === 'A' ? 'on' : ''}">Place ${ACTOR_NAME.A}</button><button data-pl="B" class="${placing === 'B' ? 'on' : ''}">Place ${ACTOR_NAME.B}</button><button data-pl="R">Reset</button></div><div class="pl" style="margin-top:6px"><button data-pl="rA" class="${placing === 'rA' ? 'on' : ''}" title="Click points on the set view; the actor walks through them">Walk path ${ACTOR_NAME.A}</button><button data-pl="rB" class="${placing === 'rB' ? 'on' : ''}" title="Click points on the set view; the actor walks through them">Walk path ${ACTOR_NAME.B}</button><button data-pl="RC" title="Remove both walk paths">Clear paths</button></div></div>` + F.faceA + F.faceB + F.notes +
    `<div class="learn" style="--c:${catColor(mv.cat)}"><h4>Why “${mv.name}”</h4><p>${mv.why}</p><p><i>Try:</i> ${mv.tip}</p><p><i>${sh.lens} mm on ${sensorOf().label}${crop() > 1.01 ? ' (≈' + eqMm(sh.lens) + ' mm full-frame equivalent)' : ''}:</i> ${lensNote(sh.lens)}</p><p><i>f/${sh.fstop}:</i> ${sh.fstop <= 2 ? 'Shallow focus melts the background and isolates the subject: the classic cinematic look.' : sh.fstop >= 8 ? 'Deep focus keeps everything sharp, so the audience can explore the whole frame.' : 'Moderate depth: subject sharp, background softly separated.'}</p></div>`;
}
/* click-to-place: click or drag on the set view to put an actor on the floor of the current shot */
let placing = null;
const rayPlane = new T.Plane(new T.Vector3(0, 1, 0), 0), rayCaster = new T.Raycaster();
function setPlacing(k) {
  placing = k; $('#inset').classList.toggle('placing', !!k);
  $('#inset span').textContent = k ? (k[0] === 'r' ? `CLICK TO ADD A WALK POINT FOR ${ACTOR_NAME[k[1]].toUpperCase()}  ·  ESC TO FINISH` : `CLICK TO PLACE ${ACTOR_NAME[k].toUpperCase()}  ·  ESC TO FINISH`) : 'SET VIEW';
  if (k && !showSet) $('#bSet').click();
  buildInsp(); if (k) toast(k[0] === 'r' ? `Click the set view to add walk points for ${ACTOR_NAME[k[1]]}` : `Click or drag on the set view to place ${ACTOR_NAME[k]}`);
}
function placeAt(e, first) {
  const sh = P.shots[sel]; if (!placing || !sh) return;
  const r = $('#inset').getBoundingClientRect(), hit = new T.Vector3();
  rayCaster.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), setCam);
  if (!rayCaster.ray.intersectPlane(rayPlane, hit)) return;
  const p = normShot({ placeA: { x: hit.x, z: hit.z } }).placeA;
  if (placing[0] === 'r') {
    if (!first) return; const k = placing[1]; commit();
    if (sh['action' + k] !== 'walk') { sh['action' + k] = 'walk'; sh['cues' + k] = []; }
    if (sh['route' + k].length < 6) sh['route' + k].push(p); else toast('A walk path can have up to 6 points'); pathKey = ''; buildTL(); return;
  }
  if (first) commit();
  sh['place' + placing] = p; pathKey = '';
  if (!playing) time = clamp(time, starts()[sel], starts()[sel] + sh.duration - .001);
}
{ let down = false; const ins = $('#inset');
  ins.addEventListener('pointerdown', e => { if (!placing) return; down = true; try { ins.setPointerCapture(e.pointerId); } catch (x) {} placeAt(e, true); e.preventDefault(); });
  ins.addEventListener('pointermove', e => { if (down) placeAt(e, false); });
  ins.addEventListener('pointerup', () => { if (down) { down = false; buildInsp(); } }); }
$('#insp').addEventListener('click', e => {
  const b = e.target.closest('button[data-pl]'); if (!b) return; const sh = P.shots[sel]; if (!sh) return;
  if (b.dataset.pl === 'R') { commit(); sh.placeA = sh.placeB = sh.faceA = sh.faceB = null; sh.routeA = []; sh.routeB = []; pathKey = ''; setPlacing(null); toast('Actors back to their default positions'); return; }
  if (b.dataset.pl === 'RC') { commit(); sh.routeA = []; sh.routeB = []; pathKey = ''; setPlacing(null); toast('Walk paths cleared'); return; }
  setPlacing(placing === b.dataset.pl ? null : b.dataset.pl);
});
let editing = false;
$('#insp').addEventListener('input', e => {
  const k = e.target.dataset.k; if (!k) return;
  if (!editing) { commit(); editing = true; }
  const sh = P.shots[sel], fd = FIELDS.find(x => x[0] === k);
  let v = e.target.value; if (fd[1] === 'rng' || k === 'lens' || k === 'dir' || k === 'fstop') v = +v;
  sh[k] = v;
  if (fd[1] === 'area') { const o = $(`[data-o="${k}"]`); if (o) o.textContent = `${v.length}/${NOTE_MAX}`; return; }
  if (k === 'name') { buildTL(); return; }
  if (fd[1] === 'rng') { const o = $(`[data-o="${k}"]`); if (o) o.textContent = fd[6](v); buildTL(); }
  else { if (k === 'move' && MV[v].walk) sh['action' + (sh.subject === 'B' ? 'B' : 'A')] = 'walk'; buildInsp(); buildTL(); }
  if (!playing) time = clamp(time, starts()[sel], starts()[sel] + sh.duration - .001);
});
$('#insp').addEventListener('change', () => { editing = false; });

function buildTL() {
  const tot = total() || 1;
  $('#clips').innerHTML = P.shots.map((s, i) => `<div class="clip${i === sel ? ' on' : ''}" data-i="${i}" style="flex:${s.duration} 1 0;--c:${catColor(MV[s.move].cat)}"><b>${i + 1}. ${esc(s.name)}</b><span>${MV[s.move].name} · ${s.lens}mm · ${s.size} · ${s.duration}s</span></div>`).join('');
  const step = tot > 40 ? 10 : tot > 16 ? 5 : tot > 6 ? 2 : 1; let r = '';
  for (let x = 0; x <= tot; x += step) r += `<i style="left:${x / tot * 100}%">${x}s</i>`;
  $('#ruler').innerHTML = r; updTime();
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function markSel() { $$('.clip').forEach((c, i) => c.classList.toggle('on', i === sel)); buildInsp(); }
const tcf = s => { const m = Math.floor(s / 60), x = s % 60, f = Math.floor((x % 1) * 24); return `${String(m).padStart(2, '0')}:${String(Math.floor(x)).padStart(2, '0')}:${String(f).padStart(2, '0')}`; };
function updTime() {
  const tot = total();
  $('#ph').style.left = `calc(${(tot ? time / tot : 0) * 100}% )`;
  $('#tc').innerHTML = `${tcf(time)} <small>/ ${tcf(tot)}</small>`;
  const a = P.shots.length ? at(time) : null, sh = a && P.shots[a.i];
  $('#hudTL').innerHTML = sh ? `${playing ? '<span class="rec"></span>' : ''}SHOT ${a.i + 1} · ${MV[sh.move].name.toUpperCase()}` : '';
  $('#hudBL').textContent = sh ? `${sh.lens}MM · F/${sh.fstop} · ${sh.size} · ${HEIGHTS[sh.height].toUpperCase()}` : '';
  $('#hudBR').textContent = sh ? `${tcf(time)}  ·  ${{ '2.39': '2.39:1', '1.778': '16:9', '0.5625': '9:16', '1': '1:1' }[P.aspect] || ''}` : '';
}
let drag = false;
const seek = e => { const r = $('#track').getBoundingClientRect(); time = clamp((e.clientX - r.left) / r.width, 0, 1) * total(); const a = at(time); if (a && a.i !== sel) { sel = a.i; markSel(); } };
$('#track').addEventListener('pointerdown', e => { if (!P.shots.length) return; drag = true; $('#track').setPointerCapture(e.pointerId); const c = e.target.closest('.clip'); if (c && e.target.closest('#clips') && !playing) { sel = +c.dataset.i; markSel(); setTab('shot'); } seek(e); });
$('#track').addEventListener('pointermove', e => { if (drag) seek(e); });
$('#track').addEventListener('pointerup', () => { drag = false; });

function setPlay(v) { playing = v && P.shots.length > 0; if (playing && time >= total() - .01) time = 0; $('#bPlay').textContent = playing ? '❚❚' : '▶'; updTime(); }
$('#bPlay').onclick = () => setPlay(!playing);
$('#bStart').onclick = () => { time = 0; sel = 0; markSel(); };
$('#bLoop').onclick = () => { loop = !loop; $('#bLoop').style.color = loop ? 'var(--ac)' : ''; toast(loop ? 'Loop on' : 'Loop off'); };
$('#bLoop').style.color = 'var(--ac)';
const GUIDE_MODES = ['off', 'thirds', 'safe', 'ui'];
const GUIDE_LABEL = { off: 'Guides off', thirds: 'Rule of thirds', safe: 'Action and title safe areas, centre mark', ui: 'Reels / Shorts interface zones (approximate)' };
const isVertical = () => P.aspect === '0.5625';
function setGuides(m) {
  guides = m;
  $('#frame').classList.toggle('guides', m === 'thirds');
  const g = $('#gd');
  const ln = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  g.innerHTML = m === 'safe'
    ? '<rect x="3.5" y="3.5" width="93" height="93"/><rect x="5" y="5" width="90" height="90" stroke-dasharray="4 3"/>' + ln(47, 50, 53, 50) + ln(50, 47, 50, 53)
    : m === 'ui'
      ? '<rect class="z" x="0" y="0" width="100" height="13"/><rect class="z" x="0" y="78" width="100" height="22"/><rect class="z" x="84" y="42" width="16" height="36"/>'
      : '';
  g.style.display = m === 'safe' || m === 'ui' ? 'block' : 'none';
  $('#bGuide').style.color = m !== 'off' ? 'var(--ac)' : '';
}
function cycleGuides() {
  let i = GUIDE_MODES.indexOf(guides);
  do { i = (i + 1) % GUIDE_MODES.length; } while (GUIDE_MODES[i] === 'ui' && !isVertical());
  setGuides(GUIDE_MODES[i]); toast(GUIDE_LABEL[guides]);
}
$('#bGuide').onclick = cycleGuides;
$('#bSet').onclick = () => { showSet = !showSet; $('#bSet').style.color = showSet ? 'var(--ac)' : ''; layout(); };
$('#bSet').style.color = 'var(--ac)';
$('#bPerf').onclick = () => { setLight(!light); toast(light ? 'Light mode: faster on CPU-only laptops' : 'Quality mode: shadows and sharper image'); };
$('#bUndo').onclick = () => { if (undo.length) { redo.push(JSON.stringify(P)); restore(undo.pop()); toast('Undone'); } };
$('#bRedo').onclick = () => { if (redo.length) { undo.push(JSON.stringify(P)); restore(redo.pop()); toast('Redone'); } };
$('#bDel').onclick = () => { if (!P.shots.length) return; commit(); P.shots.splice(sel, 1); sel = clamp(sel, 0, P.shots.length - 1); time = P.shots.length ? starts()[sel] : 0; refreshAll(); toast('Shot deleted · Ctrl+Z to undo'); };
$('#bDup').onclick = () => { if (!P.shots.length) return; commit(); P.shots.splice(sel + 1, 0, Object.assign(JSON.parse(JSON.stringify(P.shots[sel])), { name: P.shots[sel].name + ' copy' })); sel++; refreshAll(); };
$('#title').oninput = e => { P.title = e.target.value; };
$('#look').innerHTML = Object.entries(LOOKS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
$('#set').innerHTML = Object.entries(SETS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
$('#set').onchange = e => { commit(); P.set = e.target.value; applySet(P.set); toast(SETS[P.set].label + ' set'); };
$('#look').onchange = e => { commit(); P.look = e.target.value; applyLook(P.look); toast(LOOKS[P.look].label + ' look'); };
$('#sensor').innerHTML = Object.entries(SENSORS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
$('#sensor').onchange = e => { commit(); P.sensor = e.target.value; buildInsp(); pathKey = ''; toast(`${sensorOf().label} sensor · 35 mm equivalent ×${crop().toFixed(2)}`); };
$('#aspect').onchange = e => { commit(); P.aspect = e.target.value; if (guides === 'ui' && !isVertical()) setGuides('off'); layout(); updTime(); };

function setMode(m) {
  mode = m; $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#insp').style.display = m === 'code' ? 'none' : ''; $('#code').style.display = m === 'code' ? 'block' : 'none';
  $('#code').style.cssText += m === 'code' ? ';flex:1;overflow:hidden;padding:0 14px 16px' : '';
  if (m === 'code') loadCode();
  buildInsp();
}
$('#modeSeg').onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };

/* code mode */
const ta = $('#ta');
function loadCode() { ta.value = JSON.stringify({ schemaVersion: SCHEMA, title: P.title, aspect: P.aspect, look: P.look, set: P.set, sensor: P.sensor, actors: castOf(), outfit: outfitOf(), shots: P.shots }, null, 2); $('#cerr').textContent = ''; }
function applyCode() {
  let o; try { o = JSON.parse(ta.value); } catch (e) { $('#cerr').textContent = '✕ ' + e.message; return; }
  if (!o || !Array.isArray(o.shots)) { $('#cerr').textContent = '✕ The scene needs a "shots" list.'; return; }
  const errs = []; const shots = o.shots.slice(0, 60).map((s, i) => normShot(s || {}, errs, i));
  if ((+o.schemaVersion || 1) < 6) shots.forEach(s => { if (s.move === 'pan') s.dir = -s.dir; }); // before v0.6 a pan with direction Right actually panned left; flipping keeps old scenes playing the same
  commit(); P = { schemaVersion: SCHEMA, actors: normCast(o.actors), outfit: normOutfit(o.outfit), look: LOOKS[o.look] ? o.look : 'golden', set: SETS[o.set] ? o.set : 'stall', sensor: SENSORS[o.sensor] ? o.sensor : DEFAULT_SENSOR, title: String(o.title || 'Untitled scene').slice(0, 60), aspect: ['2.39', '1.778', '0.5625', '1'].includes(String(o.aspect)) ? String(o.aspect) : '2.39', shots };
  if (o.sensor !== undefined && !SENSORS[o.sensor]) errs.push('sensor must be ' + Object.keys(SENSORS).join('/'));
  if (+o.schemaVersion > SCHEMA) errs.push(`made with a newer Kalki (schema ${o.schemaVersion}); some settings were ignored`);
  sel = clamp(sel, 0, shots.length - 1); time = 0; refreshAll(false);
  $('#cerr').textContent = errs.length ? '⚠ ' + errs.slice(0, 3).join(' · ') + ' (fixed automatically)' : '';
  toast(`Applied · ${shots.length} shots`); setPlay(true);
}
$('#cApply').onclick = applyCode;
$('#cFmt').onclick = () => { try { ta.value = JSON.stringify(JSON.parse(ta.value), null, 2); $('#cerr').textContent = ''; } catch (e) { $('#cerr').textContent = '✕ ' + e.message; } };
$('#cRef').onclick = loadCode;
ta.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); applyCode(); }
});
$('#cDoc').onclick = () => {
  const row = (k, v) => `<div><b style="color:var(--ac)">${k}</b> &nbsp;${v}</div>`;
  $('#docBody').innerHTML = row('move', MOVES.map(m => m.id).join(', ')) + row('duration', 'seconds, 1–20') + row('lens', LENSES.join(', ') + ' (mm)') + row('fstop', FSTOPS.join(', ') + ' (aperture: low = blurry background)') + row('look', Object.keys(LOOKS).join(', ') + ' (scene level)') + row('size', Object.keys(SIZES).join(', ')) + row('subject', 'A, B, both') + row('height', Object.keys(HEIGHTS).join(', ')) + row('angle', '-180 to 180 (degrees around the subject, 0 = front)') + row('amount', '0 to 1 (how strong the move is)') + row('dir', '1 or -1') + row('easing', Object.keys(EASES).join(', ')) + row('actionA', Object.keys(ACTION_LABEL).join(', ') + ' (what Meera does)') + row('actionB', 'same list (what Arjun does)') + row('actors', '{ "A": "f11", "B": "m17" } who plays each actor: ' + Object.entries(AV).map(([id, a]) => id + ' = ' + a.first).join(', ')) + row('cuesA / cuesB', '[{ "t": 2, "a": "talk" }] action changes during the shot: t = seconds from the start of the shot (0.5 steps), a = any action except walk; walking shots cannot have changes') + row('placeA / placeB', '{ "x": -0.85, "z": 0.2 } position on the floor in metres (x right, z towards the audience); omit for the default spot') + row('faceA / faceB', '-180 to 180 degrees the actor turns (0 = towards the audience); omit to face the other actor') + row('notes', 'free text, up to ' + NOTE_MAX + ' characters (shown in the PDFs and CSV)') + row('aspect', '"2.39", "1.778", "0.5625", "1"') + row('sensor', Object.keys(SENSORS).join(', ') + ' (scene level; changes the field of view of every lens)') + row('schemaVersion', SCHEMA + ' (file format version; older files still open)') +
    '<pre style="margin-top:12px;background:#0c0c11;padding:10px;border-radius:8px;color:#d8e3ff;white-space:pre-wrap">{ "move": "orbit", "duration": 6, "lens": 24,\n  "size": "WS", "subject": "both", "amount": 0.5 }</pre>';
  $('#mDoc').classList.add('on');
};
$('#dClose').onclick = () => $('#mDoc').classList.remove('on');

/* files & export */
const fname = ext => ((P.title || '').replace(/[^\p{L}\p{M}\p{N}\- ]+/gu, '').trim().replace(/\s+/g, '-').toLowerCase() || 'kalki-scene') + ext;
function browserDownload(blob, name) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
/* inside the Windows desktop app: native "Save as" dialog, then write the chosen file; in a browser: normal download */
function download(blob, name) {
  if (window.__kalki) { window.__kalki.last = { blob, name }; return; } // test mode: keep the file instead of saving it
  const TA = window.__TAURI__;
  if (!(TA && TA.dialog && TA.fs)) return browserDownload(blob, name);
  const ext = name.split('.').pop();
  TA.dialog.save({ defaultPath: name, filters: [{ name: ext.toUpperCase() + ' file', extensions: [ext] }] })
    .then(async path => { if (!path) return; await TA.fs.writeFile(path, new Uint8Array(await blob.arrayBuffer())); toast('Saved'); })
    .catch(() => browserDownload(blob, name));
}
function menu(id, fn) { const m = $(id); m.querySelector('.btn').onclick = e => { e.stopPropagation(); $$('.menu').forEach(x => x !== m && x.classList.remove('open')); m.classList.toggle('open'); }; m.querySelector('.dd').onclick = e => { const b = e.target.closest('button'); if (b) { m.classList.remove('open'); fn(b.dataset.a); } }; }
document.addEventListener('click', () => $$('.menu').forEach(x => x.classList.remove('open')));
menu('#mFile', a => {
  if (a === 'new') { commit(); P = { schemaVersion: SCHEMA, actors: castOf(), title: 'Untitled scene', aspect: P.aspect, look: P.look, set: P.set, outfit: outfitOf(), sensor: P.sensor || DEFAULT_SENSOR, shots: [] }; sel = 0; time = 0; refreshAll(); toast('New scene · Ctrl+Z to undo'); }
  if (a === 'open') $('#fileIn').click();
  if (a === 'save') { download(new Blob([JSON.stringify(P, null, 2)], { type: 'application/json' }), fname('.kalki.json')); toast('Project saved'); }
});
$('#fileIn').onchange = e => {
  const f = e.target.files[0]; if (!f) return; if (f.size > 2e6) { toast('File is too large'); return; }
  const r = new FileReader(); r.onload = () => { ta.value = r.result; applyCode(); $('#title').value = P.title; }; r.readAsText(f); e.target.value = '';
};
menu('#mExport', a => {
  if (a === 'csv') {
    const q = v => `"${String(v).replace(/"/g, '""')}"`, st = starts();
    const rows = [['Shot', 'Name', 'Start', 'Duration (s)', 'Move', 'Lens (mm)', 'Aperture', 'Size', 'Subject', 'Height', 'Angle', 'Intensity', 'Easing', ACTOR_NAME.A, ACTOR_NAME.B, 'Notes', 'Why this move']]
      .concat(P.shots.map((s, i) => [i + 1, s.name, tcf(st[i]), s.duration, MV[s.move].name, s.lens, 'f/' + s.fstop, SIZES[s.size].label, SUBJ[s.subject], HEIGHTS[s.height], s.angle, Math.round(s.amount * 100) + '%', s.easing, seqText(s, 'A'), seqText(s, 'B'), s.notes, MV[s.move].why]));
    download(new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }), fname('-shotlist.csv')); toast('Shot list exported');
  }
  if (a === 'png') { render(true); const r = R.getPixelRatio(), c = document.createElement('canvas'); c.width = film.w * r; c.height = film.h * r; c.getContext('2d').drawImage(cv, film.x * r, film.y * r, c.width, c.height, 0, 0, c.width, c.height); c.toBlob(b => { download(b, fname(`-shot${sel + 1}.png`)); toast('Frame saved'); }); }
  if (a === 'pdf') exportPdf('shotlist');
  if (a === 'board') exportPdf('storyboard');
  if (a === 'blocking') exportBlocking();
  if (a === 'rec') startRec();
});
function exportPdf(kind) {
  if (!P.shots.length) return toast('Add a shot first');
  if (recording) return;
  const wasPlaying = playing, t0 = time, st = starts(), r = R.getPixelRatio(), shots = [];
  setPlay(false);
  for (let i = 0; i < P.shots.length; i++) {
    const s = P.shots[i];
    time = st[i] + s.duration * .55; step(); step(); render(true);
    const tw = 480, th = Math.max(1, Math.round(tw * film.h / film.w)), c = document.createElement('canvas'); c.width = tw; c.height = th;
    c.getContext('2d').drawImage(cv, film.x * r, film.y * r, film.w * r, film.h * r, 0, 0, tw, th);
    const bin = atob(c.toDataURL('image/jpeg', .85).split(',')[1]), jpeg = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) jpeg[k] = bin.charCodeAt(k);
    shots.push({ n: i + 1, name: s.name, move: MV[s.move].name, why: MV[s.move].why, notes: s.notes, start: tcf(st[i]), duration: s.duration, lens: s.lens, eq: crop() > 1.01 ? eqMm(s.lens) : 0, fstop: s.fstop,
      size: SIZES[s.size].label, sizeCode: s.size, height: HEIGHTS[s.height], angle: s.angle, subject: SUBJ[s.subject], actions: [describeActions(s, 'A'), describeActions(s, 'B')], amount: Math.round(s.amount * 100),
      easing: s.easing[0].toUpperCase() + s.easing.slice(1), jpeg, jw: tw, jh: th });
  }
  time = t0; setPlay(wasPlaying);
  const meta = [`${{ '2.39': '2.39:1 Cinema', '1.778': '16:9', '0.5625': '9:16 Vertical', '1': '1:1 Square' }[P.aspect] || P.aspect}`, `${LOOKS[P.look].label} look`, `${sensorOf().label} sensor`, `${P.shots.length} shots`, `Runtime ${tcf(total())}`, new Date().toLocaleDateString('en-IN')];
  const board = kind === 'storyboard';
  const doc = { raster: rasterText, title: P.title, meta, aspect: film.w / film.h, shots, footer: 'Made with Kalki Simulator  |  Offline camera-movement previsualisation' };
  download(new Blob([(board ? buildStoryboardPdf : buildShotListPdf)(doc)], { type: 'application/pdf' }), fname(board ? '-storyboard.pdf' : '-shotlist.pdf'));
  toast(board ? 'Storyboard PDF saved' : 'Shot list PDF saved');
}
/* top-down blocking diagram: positions come straight from the solver, no rendering needed */
function blockingDoc() {
  const asp = film.w / film.h || 1.778, st = starts();
  const hf = deg => 2 * Math.atan(Math.tan(deg * D2R / 2) * asp) / D2R;
  const shots = P.shots.map((s, i) => {
    const a = solve(s, 0, 0), b = solve(s, 1, s.duration), pts = []; for (let k = 0; k <= 30; k++) { const p = solve(s, k / 30, k / 30 * s.duration).pos; pts.push([+p.x.toFixed(2), +p.z.toFixed(2)]); }
    const p0 = subjPos(s, 0), p1 = subjPos(s, 1);
    return { n: i + 1, name: s.name, move: MV[s.move].name, lens: s.lens, sizeCode: s.size, duration: s.duration, actions: [describeActions(s, 'A'), describeActions(s, 'B')],
      actors: ['A', 'B'].map(k => ({ k, x0: p0.pos[k].x, z0: p0.pos[k].z, x1: p1.pos[k].x, z1: p1.pos[k].z, face0: faceRad(s, k, p0.pos), face1: faceRad(s, k, p1.pos), walk: p0.walkers.includes(k), route: p0.walkers.includes(k) && s['route' + k].length ? [[p0.pos[k].x, p0.pos[k].z], ...s['route' + k].map(q => [q.x, q.z])] : null })),
      cam: { pts, tgx0: a.tg.x, tgz0: a.tg.z, tgx1: b.tg.x, tgz1: b.tg.z, hfov0: hf(a.fov), hfov1: hf(b.fov) } };
  });
  return { raster: rasterText, title: P.title, meta: [`${P.shots.length} shots`, `Runtime ${tcf(total())}`, `${sensorOf().label} sensor`, new Date().toLocaleDateString('en-IN')], floor: { x0: -8, x1: 8, z0: -6, z1: 6 }, wallZ: -4.3, shots,
    footer: 'Made with Kalki Simulator  |  Offline camera-movement previsualisation' };
}
function exportBlocking() {
  if (!P.shots.length) return toast('Add a shot first');
  download(new Blob([buildBlockingPdf(blockingDoc())], { type: 'application/pdf' }), fname('-blocking.pdf')); toast('Blocking diagram saved');
}
function startRec() {
  if (!P.shots.length) return toast('Add a shot first');
  if (!window.MediaRecorder) return toast('Video export is not supported here');
  const r = R.getPixelRatio(), c = document.createElement('canvas'); c.width = Math.round(film.w * r / 2) * 2; c.height = Math.round(film.h * r / 2) * 2;
  const mt = ['video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(c.captureStream(30), mt ? { mimeType: mt, videoBitsPerSecond: 6e6 } : {}), chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => { download(new Blob(chunks, { type: 'video/webm' }), fname('-preview.webm')); toast('Preview video saved'); };
  recording = { c, ctx: c.getContext('2d'), rec }; layout(); time = 0; rec.start(); setPlay(true); toast('Recording… plays once through');
}
function stopRec() { const r = recording; recording = null; r.rec.stop(); layout(); }

/* toast/help/keys */
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 1800); }
$('#bHelp').onclick = () => $('#mHelp').classList.add('on');
$('#hClose').onclick = () => $('#mHelp').classList.remove('on');
$('#hIntro').onclick = () => { $('#mHelp').classList.remove('on'); showIntro(); };
document.addEventListener('keydown', e => {
  const tag = e.target.tagName; const typing = tag === 'INPUT' && e.target.type === 'text' || tag === 'TEXTAREA';
  const k = e.key.toLowerCase(), c = e.ctrlKey || e.metaKey;
  if (k === 'f12' || (c && e.shiftKey && 'ijc'.includes(k)) || (c && k === 'u') || (c && k === 's')) { e.preventDefault(); if (c && k === 's') $('#mFile [data-a=save]').click(); return; }
  if (typing || demo) return;
  if (k === ' ') { e.preventDefault(); setPlay(!playing); }
  else if (c && k === 'z') { e.preventDefault(); $('#bUndo').click(); }
  else if (c && k === 'y') { e.preventDefault(); $('#bRedo').click(); }
  else if (c && k === 'd') { e.preventDefault(); $('#bDup').click(); }
  else if (k === 'delete' || k === 'backspace') $('#bDel').click();
  else if (k === 'g') $('#bGuide').click();
  else if (k === 'escape' && placing) setPlacing(null);
  else if (k === 'home') $('#bStart').click();
  else if ((k === 'arrowright' || k === 'arrowleft') && P.shots.length) { sel = clamp(sel + (k === 'arrowright' ? 1 : -1), 0, P.shots.length - 1); time = starts()[sel]; markSel(); }
});
document.addEventListener('contextmenu', e => { if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') e.preventDefault(); });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && /\.json$/i.test(f.name)) { const dt = new DataTransfer(); dt.items.add(f); $('#fileIn').files = dt.files; $('#fileIn').dispatchEvent(new Event('change')); } });


/* ---------- reference video analysis ---------- */
const REF_FPS = 6, REF_MAX = 180;
let ref = null, refBusy = false, refCancel = false;
const nextFrame = () => new Promise(r => setTimeout(r, 0));
const DIR_TEXT = { pan: ['to the left', 'to the right'], truck: ['to the left', 'to the right'], tilt: ['down', 'up'], pedestal: ['down', 'up'] };
const ALSO = { push_in: ' (or a zoom in)', zoom_in: ' (or a push in)', pull_out: ' (or a zoom out)', tilt: ' (or a pedestal move)', pedestal: ' (or a tilt)', truck: ' (or a pan)' };
const refMoveText = s => `${MV[s.move].name}${DIR_TEXT[s.move] ? ' ' + DIR_TEXT[s.move][s.dir > 0 ? 1 : 0] : ''}${ALSO[s.move] || ''}`;
function refProgress(p, msg) { $('#rfBar').style.width = Math.round(p * 100) + '%'; $('#rfMsg').textContent = msg; }

/* Reads the video with a hidden <video>, seeks through it and keeps one small grayscale frame per sample. The video never leaves the computer. */
async function readVideoFrames(file, progress = () => {}) {
  const url = URL.createObjectURL(file), v = document.createElement('video');
  v.muted = true; v.preload = 'auto'; v.playsInline = true; v.src = url;
  try {
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('This app cannot decode that file. Try an MP4 (H.264) or WebM clip.')); });
    if (!isFinite(v.duration)) { // some recorders write no duration: seeking far past the end makes the browser work it out
      await new Promise(res => { v.ondurationchange = () => { if (isFinite(v.duration)) res(); }; setTimeout(res, 6000); v.currentTime = 1e7; });
      v.ondurationchange = null; await new Promise(res => { v.onseeked = res; v.currentTime = 0; setTimeout(res, 3000); });
    }
    if (!isFinite(v.duration) || !v.videoWidth) throw new Error('That file has no readable video.');
    const dur = Math.min(v.duration, REF_MAX), n = Math.floor(dur * REF_FPS);
    if (n < REF_FPS) throw new Error('The clip is too short (under one second).');
    const c = document.createElement('canvas'); c.width = AW; c.height = AH; const g = c.getContext('2d', { willReadFrequently: true });
    const seek = t => new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('The video stopped responding while seeking.')), 10000); v.onseeked = () => { clearTimeout(to); res(); }; v.currentTime = t; });
    const frames = [];
    for (let i = 0; i < n; i++) {
      if (refCancel) throw new Error('cancelled');
      await seek(Math.min(v.duration - .02, i / REF_FPS + .001));
      g.drawImage(v, 0, 0, AW, AH); frames.push(toGray(g.getImageData(0, 0, AW, AH).data, AW, AH));
      if (i % 4 === 0) { progress(i / n * .8, `Reading frames ${i + 1} of ${n}`); await nextFrame(); }
    }
    const thumb = async t => { await seek(Math.min(v.duration - .02, t)); const tc = document.createElement('canvas'); tc.width = 192; tc.height = 108; tc.getContext('2d').drawImage(v, 0, 0, 192, 108); return tc.toDataURL('image/jpeg', .7); };
    return { frames, duration: dur, w: v.videoWidth, h: v.videoHeight, thumb };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
}
/* the whole pipeline without any UI, so tests can drive it: video file -> frames -> shots -> thumbnails */
async function computeRef(file, progress = () => {}) {
  progress(.02, 'Opening the video…');
  const vid = await readVideoFrames(file, progress);
  progress(.82, 'Finding cuts and camera moves…'); await nextFrame();
  const clip = analyzeClip(vid.frames, REF_FPS), thumbs = [];
  for (let i = 0; i < clip.shots.length; i++) { progress(.86 + .13 * i / clip.shots.length, `Preparing thumbnails ${i + 1} of ${clip.shots.length}`); thumbs.push(await vid.thumb(clip.shots[i].start + clip.shots[i].dur / 2)); }
  progress(1, 'Done');
  return { name: (file.name || 'clip').replace(/\.[^.]+$/, ''), clip, thumbs, size: `${vid.w}×${vid.h}` };
}
async function analyseRef(file) {
  if (refBusy) return; refBusy = true; refCancel = false; ref = null;
  $('#rfRes').innerHTML = ''; $('#rfProgBox').style.display = 'block'; $('#rfPick').disabled = true; $('#rfCancel').style.display = '';
  try { ref = await computeRef(file, refProgress); renderRef(); }
  catch (e) { $('#rfRes').innerHTML = e.message === 'cancelled' ? '<p class="rf-note">Analysis cancelled.</p>' : `<p class="rf-note err">${esc(e.message)}</p>`; }
  finally { refBusy = false; $('#rfPick').disabled = false; $('#rfCancel').style.display = 'none'; setTimeout(() => { if (!refBusy) $('#rfProgBox').style.display = 'none'; }, 600); }
}
function refSuggestions() { return ref && P.shots.length && !demo ? suggest(ref.clip, { shots: P.shots }) : []; }
function renderRef() {
  const { clip } = ref, S = clip.summary, pct = v => Math.round(v * 100) + '%';
  const cards = [['Shots', S.shotCount], ['Average shot', S.avgShot.toFixed(1) + ' s'], ['Pace', S.pace], ['Camera moving', pct(S.movingShare)], ['Handheld', pct(S.handheldShare)], ['Most used', MV[S.dominant].name]];
  const strip = clip.shots.map((s, i) => `<div class="rf-shot" style="flex:${Math.max(.6, s.dur)} 1 0;background-image:url(${ref.thumbs[i]})" title="Shot ${i + 1}: ${esc(refMoveText(s))}, ${s.dur.toFixed(1)} s"><b>${i + 1}</b><span>${esc(refMoveText(s))}</span></div>`).join('');
  const rows = clip.shots.map((s, i) => `<tr><td>${i + 1}</td><td>${fmtTime(s.start)}</td><td>${s.dur.toFixed(1)} s</td><td><b>${esc(refMoveText(s))}</b>${s.handheld && s.move !== 'handheld' ? ' <em>+ handheld shake</em>' : ''}</td><td>${s.move === 'static' ? '–' : Math.round(s.amount * 100) + '%'}</td><td>${s.move === 'static' || s.move === 'handheld' ? '–' : s.easing}</td><td><i class="rf-conf"><u style="width:${Math.round(s.confidence * 100)}%"></u></i> ${Math.round(s.confidence * 100)}%</td></tr>`).join('');
  const used = Object.keys(S.byMove).filter(m => m !== 'static').sort((a, b) => S.byMove[b] - S.byMove[a]);
  const notes = used.map(m => { const at = clip.shots.map((s, i) => s.move === m ? i + 1 : 0).filter(Boolean); return `<div class="rf-tech"><h4>${esc(MV[m].name)} <small>shot${at.length > 1 ? 's' : ''} ${at.join(', ')}</small></h4><p>${esc(MV[m].why)}</p></div>`; }).join('') || '<p class="rf-note">The camera barely moves in this clip: it is mostly locked off.</p>';
  const sg = refSuggestions();
  const tips = !P.shots.length || demo ? '<p class="rf-note">Open or create a scene to get suggestions for it. You can still simulate the reference below.</p>'
    : sg.length ? sg.map((t, i) => `<div class="rf-tip"><div><b>${esc(t.rule)}</b><p>${esc(t.text)}</p><small>${esc(t.why)}</small></div>${t.patch.length ? `<button class="btn" data-rfapply="${i}">Apply</button>` : ''}</div>`).join('')
      : '<p class="rf-note">Your scene already follows the reference closely. Nothing to change.</p>';
  $('#rfRes').innerHTML = `<div class="rf-sum">${cards.map(([k, v]) => `<div><small>${k}</small><b>${esc(String(v))}</b></div>`).join('')}</div>
    <h3>Shots found <small>${esc(ref.name)} · ${ref.size} · ${fmtTime(clip.duration)}</small></h3><div class="rf-strip">${strip}</div>
    <table class="rf-tab"><thead><tr><th>#</th><th>At</th><th>Length</th><th>Camera technique</th><th>Intensity</th><th>Easing</th><th>Confidence</th></tr></thead><tbody>${rows}</tbody></table>
    <h3>How the camera is used</h3>${notes}
    <h3>Suggested changes to your scene</h3>${tips}
    <div class="rf-act"><button class="btn pri" id="rfSim">Simulate the reference</button>${sg.some(t => t.patch.length) ? '<button class="btn pri" id="rfAll">Apply all suggestions and play</button>' : ''}<button class="btn" id="rfCsv">Download report (.csv)</button></div>
    <p class="rf-note">These are estimates from picture motion, not from knowing how the shot was made. A push-in and a zoom can look alike, and moving actors can confuse the result. Everything is computed on this computer.</p>`;
}
function applySuggestions(list) {
  commit();
  for (const sg of list) for (const p of sg.patch) {
    if (p.scaleDurations) P.shots.forEach(s => { s.duration = clamp(Math.round(s.duration * p.scaleDurations * 2) / 2, 1, 20); });
    else if (p.set) { const s = P.shots[p.shot]; if (s) Object.assign(s, p.set); }
    else if (p.addShots) p.addShots.forEach(o => { if (P.shots.length < 60) P.shots.push(newShot(o)); });
    else if (p.handheldShots) p.handheldShots.forEach((h, i) => { if (h && P.shots[i]) P.shots[i].move = 'handheld'; });
  }
  P.shots = P.shots.map(s => normShot(s)); sel = 0; time = 0; refreshAll(); setPlay(true);
}
function simulateRef() {
  commit();
  P = { schemaVersion: SCHEMA, actors: castOf(), title: ('Reference: ' + ref.name).slice(0, 60), aspect: P.aspect, look: P.look, set: P.set, outfit: outfitOf(), sensor: P.sensor || DEFAULT_SENSOR, shots: toShots(ref.clip, 'Ref').map(o => newShot(o)) };
  sel = 0; time = 0; demo = false; refreshAll(); setPlay(true);
}
function refCsv() {
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['Shot', 'Start (s)', 'Length (s)', 'Technique', 'Intensity %', 'Easing', 'Confidence %', 'Handheld shake']].concat(ref.clip.shots.map((s, i) => [i + 1, s.start.toFixed(1), s.dur.toFixed(1), refMoveText(s), Math.round(s.amount * 100), s.easing, Math.round(s.confidence * 100), s.handheld ? 'yes' : 'no']));
  download(new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }), (ref.name || 'reference').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase() + '-camera-analysis.csv'); toast('Report saved');
}
$('#bRef').onclick = () => $('#mRef').classList.add('on');
$('#rfClose').onclick = () => { refCancel = true; $('#mRef').classList.remove('on'); };
$('#rfPick').onclick = () => $('#rfFile').click();
$('#rfCancel').onclick = () => { refCancel = true; };
$('#rfFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) analyseRef(f); };
$('#rfRes').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ref) return;
  if (b.id === 'rfSim') { simulateRef(); renderRef(); $('#mRef').classList.remove('on'); toast('Playing the reference camera work. Ctrl+Z restores your scene'); }
  else if (b.id === 'rfAll') { applySuggestions(refSuggestions().filter(t => t.patch.length)); renderRef(); $('#mRef').classList.remove('on'); toast('Applied. Ctrl+Z restores your scene'); }
  else if (b.id === 'rfCsv') refCsv();
  else if (b.dataset.rfapply !== undefined) { applySuggestions([refSuggestions()[+b.dataset.rfapply]]); renderRef(); $('#mRef').classList.remove('on'); toast('Suggestion applied and playing. Ctrl+Z undoes it'); }
});


/* ---------- cast picker ---------- */
const refreshNames = () => { if (typeof buildInsp === 'function') { buildInsp(); buildTL(); } };
function renderCast() {
  const c = castOf(), th = KA0.thumbs || {};
  $('#castBody').innerHTML = ['A', 'B'].map(k => `<div class="cast-col"><h3>Actor ${k} <small>${esc(ACTOR_NAME[k])}</small></h3><div class="cast-grid">${Object.entries(AV).map(([id, a]) => `<button class="cast-card${c[k] === id ? ' on' : ''}" data-cast="${k}:${id}" title="${esc(a.first)}: ${a.g === 'f' ? 'female' : 'male'} ${esc(a.label)}">${th[id] ? `<img alt="" src="${th[id]}">` : ''}<b>${esc(a.first)}</b><small>${a.g === 'f' ? 'Female' : 'Male'} ${esc(a.label.replace(/^(Fe)?[Mm]ale /, ''))}</small></button>`).join('')}</div><label class="cast-out">Costume <select class="sel" data-out="${k}">${Object.entries(OUTFITS).map(([o, v]) => `<option value="${o}"${outfitOf()[k] === o ? ' selected' : ''}>${v.label}</option>`).join('')}</select></label></div>`).join('');
}
/* ---------- lessons and shot templates ---------- */
const tourLesson = () => ({
  id: 'moves', title: 'Tour of all camera moves', blurb: 'Every move in the library, one shot each on the same two actors, with what it does and when to use it.',
  scene: { title: 'Lesson: All camera moves', aspect: '1.778', look: 'neutral', set: 'stall', shots: MOVES.map(m => ({ name: m.name, move: m.id, duration: 4, lens: 35, size: m.walk ? 'FS' : 'MS', subject: m.walk ? 'B' : 'A', angle: m.walk ? 90 : 25, actionB: m.walk ? 'walk' : 'stand', actionA: m.walk ? 'stand' : 'talk', notes: m.s + '. ' + m.tip })) }
});
const allLessons = () => [tourLesson(), ...LESSONS];
function renderLearn() {
  const card = (kind, x, extra) => `<button class="lc" data-${kind}="${x.id}"><b>${esc(x.title)}</b><span>${esc(x.blurb)}</span><small>${extra}</small></button>`;
  $('#learnBody').innerHTML = `<h3>Lesson scenes</h3><div class="lgrid">${allLessons().map(x => card('lesson', x, x.scene.shots.length + ' shots · replaces the scene')).join('')}</div>`
    + `<h3>Shot templates</h3><div class="lgrid">${TEMPLATES.map(x => card('tpl', x, x.shots.length + ' shots · added to the end')).join('')}</div>`;
}
function openLesson(id) {
  const l = allLessons().find(x => x.id === id); if (!l) return;
  ta.value = JSON.stringify({ ...l.scene, schemaVersion: SCHEMA, actors: castOf(), outfit: outfitOf(), sensor: P.sensor || DEFAULT_SENSOR });
  applyCode(); $('#mLearn').classList.remove('on'); toast(`${l.title} · Ctrl+Z to undo`);
}
function addTemplate(id) {
  const tp = TEMPLATES.find(x => x.id === id); if (!tp) return;
  if (P.shots.length + tp.shots.length > 60) { toast('A scene can hold 60 shots'); return; }
  commit(); const first = P.shots.length; P.shots.push(...tp.shots.map(o => newShot(o)));
  sel = first; time = 0; refreshAll(); setPlay(true); $('#mLearn').classList.remove('on'); toast(`${tp.title} added · Ctrl+Z to undo`);
}
$('#bLearn').onclick = () => { renderLearn(); $('#mLearn').classList.add('on'); };
$('#learnClose').onclick = () => $('#mLearn').classList.remove('on');
$('#learnBody').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.lesson) openLesson(b.dataset.lesson); else if (b.dataset.tpl) addTemplate(b.dataset.tpl); });
$('#bCast').onclick = () => { renderCast(); $('#mCast').classList.add('on'); };
$('#castClose').onclick = () => $('#mCast').classList.remove('on');
$('#castBody').addEventListener('change', e => {
  const sl = e.target.closest('select[data-out]'); if (!sl) return; commit(); P.outfit = { ...outfitOf(), [sl.dataset.out]: sl.value }; applyOutfit(sl.dataset.out); toast('Costume: ' + OUTFITS[sl.value].label);
});
$('#castBody').addEventListener('click', e => {
  const b = e.target.closest('button[data-cast]'); if (!b) return; const [k, id] = b.dataset.cast.split(':');
  if (castOf()[k] === id) return;
  commit(); P.actors = { ...castOf(), [k]: id }; syncCast(); renderCast(); toast(`${AV[id].first} now plays Actor ${k}`);
});


/* ---------- interface language (English, Tamil, Hindi) ---------- */
/* Every piece of visible text is looked up in src/i18n.js. The English original is kept on each node, so the language can be switched back and forth. */
let LANG = 'en', trFn = s => s;
const trSkip = n => { const p = n.parentElement; return !p || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.tagName) || !!p.closest('.hud, #ta, #title, #lang'); };
function trNode(n) {
  const cur = n.nodeValue;
  if (n.__tr !== undefined && cur === n.__tr) return; // the text we wrote ourselves
  if (!/[A-Za-z]{2}/.test(cur) || trSkip(n)) { n.__en = undefined; n.__tr = undefined; return; }
  n.__en = cur;
  if (LANG === 'en') { n.__tr = undefined; return; }
  const out = trFn(cur); n.__tr = out; if (out !== cur) n.nodeValue = out;
}
const TR_ATTRS = ['title', 'placeholder', 'aria-label'];
function trAttrs(e) {
  for (const a of TR_ATTRS) {
    const v = e.getAttribute(a); if (!v) continue;
    if (e.__trA && e.__trA[a] === v) continue;
    (e.__enA = e.__enA || {})[a] = v;
    if (LANG === 'en') { if (e.__trA) delete e.__trA[a]; continue; }
    const out = trFn(v); (e.__trA = e.__trA || {})[a] = out; if (out !== v) e.setAttribute(a, out);
  }
}
function trTree(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); while (w.nextNode()) trNode(w.currentNode);
  if (root.nodeType === 1) { trAttrs(root); root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(trAttrs); }
}
function setLang(code) {
  LANG = LANGS[code] ? code : 'en'; trFn = makeTranslator(LANG);
  try { localStorage.setItem('kalki.lang', LANG); } catch (e) {}
  document.documentElement.lang = LANG; const sel = $('#lang'); if (sel) sel.value = LANG;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (n.__en !== undefined) { const out = LANG === 'en' ? n.__en : trFn(n.__en); n.__tr = LANG === 'en' ? undefined : out; if (n.nodeValue !== out) n.nodeValue = out; } }
  document.querySelectorAll('*').forEach(e => { if (e.__enA) for (const a of Object.keys(e.__enA)) { const out = LANG === 'en' ? e.__enA[a] : trFn(e.__enA[a]); (e.__trA = e.__trA || {})[a] = out; if (e.getAttribute(a) !== out) e.setAttribute(a, out); } });
  trTree(document.body);
}
new MutationObserver(ms => {
  for (const m of ms) {
    if (m.type === 'characterData') trNode(m.target);
    else if (m.type === 'attributes') trAttrs(m.target);
    else m.addedNodes.forEach(n => { if (n.nodeType === 3) trNode(n); else if (n.nodeType === 1) trTree(n); });
  }
}).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTRS });
$('#lang').innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('#lang').onchange = e => { setLang(e.target.value); toast(trFn('Language') + ': ' + LANGS[LANG]); };
{ let saved = 'en'; try { saved = localStorage.getItem('kalki.lang') || 'en'; } catch (e) {} if (LANGS[saved]) setLang(saved); }

/* text with Tamil, Hindi or other non-Latin letters cannot use the PDF's built-in font, so it is drawn on a canvas and placed as an image */
function rasterText(text, size, bold, color) {
  const S = 3, c = document.createElement('canvas'), g = c.getContext('2d'), font = `${bold ? '700 ' : ''}${size * S}px "Nirmala UI","Noto Sans Tamil","Noto Sans Devanagari","Latha","Mangal","Segoe UI",sans-serif`;
  g.font = font; const w = Math.ceil(g.measureText(text).width) + 6, h = Math.ceil(size * S * 1.45); c.width = w; c.height = h;
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.font = font; g.textBaseline = 'alphabetic'; g.fillStyle = `rgb(${color.join(',')})`; g.fillText(text, 3, size * S * 1.05);
  const bin = atob(c.toDataURL('image/jpeg', .92).split(',')[1]), data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return { data, w, h, ptW: w / S, ptH: h / S, ascent: size * 1.05 };
}

/* onboarding */
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
$('#obTitle').innerHTML = 'KALKI'.split('').map((c, i) => `<span style="animation-delay:${.35 + i * .09}s">${c}</span>`).join('');
function showIntro() { demo = true; setPlay(false); $('#ob').classList.remove('out'); $('#ob').style.display = ''; $('#obStep1').style.display = ''; $('#obStep2').style.display = 'none'; }
function endIntro(m) { store.set('kalki.onboarded', '1'); $('#ob').classList.add('out'); setTimeout(() => $('#ob').style.display = 'none', 650); demo = false; setMode(m || mode); time = 0; sel = 0; markSel(); setPlay(true); }
$('#obNext').onclick = () => { $('#obStep1').style.display = 'none'; $('#obStep2').style.display = ''; };
$$('.mode').forEach(b => b.onclick = () => endIntro(b.dataset.m));
$('#obSkip').onclick = () => endIntro('nocode');

function refreshAll(code = true) { P.actors = normCast(P.actors); P.outfit = normOutfit(P.outfit); syncCast(); P.look = LOOKS[P.look] ? P.look : 'golden'; $('#look').value = P.look; applyLook(P.look); P.set = SETS[P.set] ? P.set : 'stall'; $('#set').value = P.set; applySet(P.set); $('#title').value = P.title; $('#aspect').value = P.aspect; $('#sensor').value = SENSORS[P.sensor] ? P.sensor : DEFAULT_SENSOR; $('#empty').style.display = P.shots.length ? 'none' : 'grid'; buildTL(); buildInsp(); layout(); pathKey = ''; if (mode === 'code' && code) loadCode(); }
new ResizeObserver(layout).observe($('#view'));
buildLib(); refreshAll();
if (location.hash === '#selftest' || location.hash === '#e2e') { if (location.hash === '#selftest') runSelfTest(); window.__kalki = { real: REAL, T, analyse: async f => { const r = await computeRef(f); return { shots: r.clip.shots.map(x => ({ move: x.move, dir: x.dir, start: +x.start.toFixed(2), dur: +x.dur.toFixed(2), conf: +x.confidence.toFixed(2), cx: +x.cumX.toFixed(3), cy: +x.cumY.toFixed(3), cs: +x.cumS.toFixed(3), jit: +x.jitter.toFixed(4), par: +x.parallax.toFixed(2) })), summary: r.clip.summary, thumbs: r.thumbs.length }; } }; }
if (store.get('kalki.onboarded')) { demo = false; $('#ob').style.display = 'none'; setPlay(true); }

/* ---------- self test: open the page with #selftest, results go to the title and #selftestOut (used by tests/smoke.mjs) ---------- */
async function runSelfTest() {
  const res = [];
  const t = (name, fn) => { try { const r = fn(); res.push([name, r === undefined || r === true, r === false ? 'returned false' : '']); } catch (e) { res.push([name, false, String(e && e.message || e)]); } };
  const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

  t('normShot defaults and clamps', () => { const s = normShot({ duration: 999, lens: 33, angle: 999 }); return s.duration === 20 && s.lens === 35 && s.angle === 180 && s.notes === '' && s.fstop === 2.8; });
  t('normShot trims and limits notes', () => { const s = normShot({ notes: '  a \n  b ' + 'x'.repeat(500) }); return s.notes.startsWith('a b') && s.notes.length === NOTE_MAX; });
  t('normShot rejects unknown move', () => { const errs = []; const s = normShot({ move: 'nope' }, errs, 0); return s.move === 'static' && errs.length === 1; });
  t('18 moves exist', () => MOVES.length === 18);
  t('every move solves to finite camera values', () => {
    for (const m of MOVES) for (const sz of Object.keys(SIZES)) for (const tt of [0, .5, 1]) {
      const sh = newShot({ move: m.id, size: sz, subject: 'both', amount: 1 });
      const p = solve(sh, tt, tt * sh.duration);
      if (![p.pos.x, p.pos.y, p.pos.z, p.tg.x, p.tg.y, p.tg.z, p.fov, p.yaw, p.pitch, p.roll].every(Number.isFinite) || p.fov <= 0) throw new Error(`${m.id}/${sz}/${tt}`);
    }
  });
  t('every sensor has a sane crop factor', () => Object.keys(SENSORS).every(k => { P.sensor = k; return crop() >= 1 && eqMm(50) >= 50; }));
  t('bigger sensor widens the field of view', () => { const sh = newShot({ move: 'static', lens: 50 }); P.sensor = 'S35'; const a = solve(sh, 0, 0).fov; P.sensor = 'FF'; const b = solve(sh, 0, 0).fov; P.sensor = DEFAULT_SENSOR; return b > a; });
  t('full frame has crop 1', () => { P.sensor = 'FF'; const c = crop(); P.sensor = DEFAULT_SENSOR; return near(c, 1); });
  t('every lesson and template loads with no corrections', () => {
    const errs = []; for (const l of [tourLesson(), ...LESSONS]) { if (!l.scene.shots.length || l.scene.shots.length > 60) return false; l.scene.shots.forEach((o, i) => { const n = normShot(o, errs, i); if (n.move !== o.move || n.lens !== (o.lens || 35) || n.size !== o.size) errs.push(l.id + ' ' + i); }); }
    for (const x of TEMPLATES) x.shots.forEach((o, i) => { const n = normShot(o, errs, i); if (n.move !== o.move || n.size !== o.size || n.lens !== o.lens) errs.push(x.id + ' ' + i); });
    return errs.length === 0;
  });
  t('the tour covers every camera move once', () => { const ids = tourLesson().scene.shots.map(o => o.move); return ids.length === MOVES.length && new Set(ids).size === MOVES.length; });
  t('a lesson replaces the scene but keeps the cast, and undo restores it', () => { const before = JSON.stringify(P); const cast = { ...castOf() }; openLesson('sizes'); const ok = P.shots.length === 7 && P.title === 'Lesson: Shot sizes' && P.actors.A === cast.A && P.actors.B === cast.B; $('#bUndo').click(); return ok && JSON.stringify(P) === before; });
  t('a template is added to the end and can be undone', () => { const n = P.shots.length; addTemplate('dialogue'); const ok = P.shots.length === n + 3 && sel === n; $('#bUndo').click(); return ok && P.shots.length === n; });
  t('legacy project (no schemaVersion) opens', () => { $('#ta').value = JSON.stringify({ kalai: '0.1', title: 'Old', shots: [{ move: 'orbit', lens: 35 }] }); applyCode(); return P.schemaVersion === SCHEMA && P.sensor === DEFAULT_SENSOR && P.shots.length === 1 && P.title === 'Old'; });
  t('project round trip keeps notes, sensor, look', () => {
    $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA, title: 'RT', look: 'noir', aspect: '0.5625', sensor: 'M43', shots: [{ move: 'push_in', notes: 'hold the sip' }] }); applyCode();
    loadCode(); const o = JSON.parse($('#ta').value);
    return o.schemaVersion === SCHEMA && o.sensor === 'M43' && o.look === 'noir' && o.aspect === '0.5625' && o.shots[0].notes === 'hold the sip';
  });
  t('invalid sensor falls back to default', () => { $('#ta').value = JSON.stringify({ sensor: 'XX', shots: [{}] }); applyCode(); return P.sensor === DEFAULT_SENSOR; });
  t('newer schema is accepted with a warning', () => { $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA + 5, shots: [{}] }); applyCode(); return /newer Kalki/.test($('#cerr').textContent); });
  t('guides cycle skips the UI zones unless vertical', () => {
    setGuides('off'); P.aspect = '2.39'; const seen = []; for (let i = 0; i < 5; i++) { cycleGuides(); seen.push(guides); }
    const ok1 = !seen.includes('ui') && seen.includes('safe') && seen.includes('thirds');
    P.aspect = '0.5625'; setGuides('off'); const seen2 = []; for (let i = 0; i < 4; i++) { cycleGuides(); seen2.push(guides); }
    setGuides('off'); return ok1 && seen2.includes('ui');
  });
  t('guides draw into the frame', () => { setGuides('safe'); const a = $('#gd').querySelectorAll('rect').length === 2; setGuides('ui'); const b = $('#gd').querySelectorAll('rect.z').length === 3; setGuides('off'); return a && b && $('#gd').style.display === 'none'; });
  t('legacy single action becomes a per-actor action', () => { const a = normShot({ action: 'walk', subject: 'B' }), b = normShot({ action: 'walk' }), c = normShot({ action: 'idle' }); return a.actionB === 'walk' && a.actionA === 'stand' && b.actionA === 'walk' && c.actionA === 'stand' && c.actionB === 'stand'; });
  t('unknown actions fall back to standing', () => { const s = normShot({ actionA: 'dance', actionB: 'sit' }); return s.actionA === 'stand' && s.actionB === 'sit'; });
  t('every action has a label', () => Object.keys(ACTION_LABEL).length === 12 && Object.keys(SEATED).every(k => ACTION_LABEL[k]));
  t('both actors can walk in one shot', () => { const sh = newShot({ actionA: 'walk', actionB: 'walk' }); const p0 = subjPos(sh, 0), p1 = subjPos(sh, 1); return p0.walkers.length === 2 && p1.pos.A.x > p0.pos.A.x && p1.pos.B.x > p0.pos.B.x; });
  t('only the subject walks on a follow move', () => { const sh = newShot({ move: 'follow', subject: 'B' }); const w = subjPos(sh, .5).walkers; return w.length === 1 && w[0] === 'B'; });
  t('actions survive a project round trip', () => { $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA, shots: [{ actionA: 'sit', actionB: 'sip' }] }); applyCode(); loadCode(); const o = JSON.parse($('#ta').value).shots[0]; return o.actionA === 'sit' && o.actionB === 'sip'; });
  t('placement is clamped and optional', () => { const a = normShot({ placeA: { x: 99, z: -99 }, placeB: { x: 'x' }, faceA: 999, faceB: 'no' }); return a.placeA.x === 7 && a.placeA.z === -3.6 && a.placeB === null && a.faceA === 180 && a.faceB === null; });
  t('placed actors move the camera target', () => { const a = subjPos(newShot({ subject: 'A' }), 0).target, b = subjPos(newShot({ subject: 'A', placeA: { x: 3, z: 1 } }), 0).target; return near(b.x, 3) && near(b.z, 1) && !near(a.x, 3); });
  t('placed actors face each other by default', () => { const sh = newShot({ placeA: { x: -2, z: 0 }, placeB: { x: 2, z: 0 } }), p = subjPos(sh, 0).pos; return faceRad(sh, 'A', p) > 1.5 && faceRad(sh, 'B', p) < -1.5 && near(faceRad({ ...sh, faceA: 90 }, 'A', p), Math.PI / 2); });
  t('unplaced shots keep the default stance', () => { const sh = newShot({}), p = subjPos(sh, 0).pos; return near(faceRad(sh, 'A', p), FACE.A) && near(p.A.x, HOME.A.x); });
  t('walk routes are clamped, limited to 6 points and survive a round trip', () => { const a = normShot({ actionA: 'walk', routeA: [{ x: 1, z: 1 }, { x: 99, z: 0 }, { x: 'q' }, { x: 0, z: 0 }, { x: 1, z: 2 }, { x: 2, z: 2 }, { x: 3, z: 2 }, { x: 4, z: 2 }] }); if (a.routeA.length !== 6 || a.routeA[1].x !== 7 || a.routeB.length !== 0) return false; $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA, shots: [{ actionB: 'walk', routeB: [{ x: -1, z: 2 }, { x: 2, z: 2 }] }] }); applyCode(); loadCode(); return JSON.parse($('#ta').value).shots[0].routeB.length === 2; });
  t('a walker follows the route at a steady pace and faces the way they move', () => { const sh = newShot({ actionA: 'walk', placeA: { x: 0, z: 0 }, routeA: [{ x: 2, z: 0 }, { x: 2, z: 2 }] }); const p0 = subjPos(sh, 0), p1 = subjPos(sh, 1), pm = subjPos(sh, .25), pn = subjPos(sh, .75); return near(p0.pos.A.x, 0) && near(p1.pos.A.x, 2) && near(p1.pos.A.z, 2) && near(pm.pos.A.x, 1) && near(pm.pos.A.z, 0) && near(pm.head.A, Math.PI / 2) && near(pn.pos.A.z, 1) && near(pn.head.A, 0); });
  t('a route is ignored when the actor is not walking', () => { const sh = newShot({ actionA: 'sit', routeA: [{ x: 3, z: 3 }] }); return near(subjPos(sh, 1).pos.A.x, HOME.A.x) && subjPos(sh, 1).walkers.length === 0; });
  t('the blocking diagram carries walk routes', () => { $('#ta').value = JSON.stringify({ shots: [{ actionA: 'walk', placeA: { x: -2, z: 0 }, routeA: [{ x: 0, z: 2 }, { x: 3, z: 2 }] }] }); applyCode(); const a = blockingDoc().shots[0].actors[0]; return a.route && a.route.length === 3 && near(a.route[2][0], 3); });
  t('sets: three exist, only the chosen one is shown, unknown falls back to the chai stall', () => { const names = Object.keys(SETS); if (names.join() !== 'stall,street,terrace') return false; for (const k of names) { applySet(k); if (!Object.keys(SETG).every(g => SETG[g].visible === (g === k))) return false; } applySet('nope'); const ok = SETG.stall.visible && !SETG.street.visible; $('#ta').value = JSON.stringify({ set: 'street', shots: [{}] }); applyCode(); const a = P.set; $('#ta').value = JSON.stringify({ set: 'moon', shots: [{}] }); applyCode(); return ok && a === 'street' && P.set === 'stall'; });
  t('the set is saved in the project and survives a round trip', () => { $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA, set: 'terrace', shots: [{}] }); applyCode(); loadCode(); const o = JSON.parse($('#ta').value); applyCode(); return o.set === 'terrace' && P.set === 'terrace' && $('#set').value === 'terrace' && SETG.terrace.visible; });
  t('every set has its own floor and dressing and the stall keeps its lights', () => ['stall', 'street', 'terrace'].every(k => SETG[k].children.length > 8) && BULBS.length >= 5);
  t('duplicating a shot does not share its walk route', () => { $('#ta').value = JSON.stringify({ shots: [{ actionA: 'walk', routeA: [{ x: 1, z: 1 }] }] }); applyCode(); sel = 0; $('#bDup').click(); P.shots[0].routeA.push({ x: 2, z: 2 }); return P.shots.length === 2 && P.shots[1].routeA.length === 1; });
  t('costumes: unknown ids fall back to plain clothes and the choice survives a round trip', () => { const n = normOutfit({ A: 'turban', B: 'nope' }); if (n.A !== 'turban' || n.B !== 'plain' || normOutfit(null).A !== 'plain') return false; $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA, outfit: { A: 'garland', B: 'umbrella' }, shots: [{}] }); applyCode(); loadCode(); const o = JSON.parse($('#ta').value); return o.outfit.A === 'garland' && o.outfit.B === 'umbrella' && P.outfit.B === 'umbrella'; });
  t('placement survives a project round trip', () => { $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA, shots: [{ placeA: { x: 1.5, z: 2 }, faceA: 40 }] }); applyCode(); loadCode(); const o = JSON.parse($('#ta').value).shots[0]; return o.placeA.x === 1.5 && o.placeA.z === 2 && o.faceA === 40 && o.placeB === null; });
  t('blocking diagram builds for a scene', () => { $('#ta').value = JSON.stringify({ shots: [{ move: 'orbit', actionA: 'walk', placeB: { x: 2, z: 1 } }, { move: 'push_in' }] }); applyCode(); const b = buildBlockingPdf(blockingDoc()); return b.length > 1000 && String.fromCharCode(b[0], b[1], b[2], b[3]) === '%PDF'; });
  t('cues are validated, sorted and limited', () => { const s = normShot({ duration: 6, actionA: 'sit', cuesA: [{ t: 4, a: 'sip' }, { t: 2.3, a: 'talk' }, { t: 2.4, a: 'nod' }, { t: 0, a: 'wave' }, { t: 9, a: 'wave' }, { t: 3, a: 'walk' }, { t: 3, a: 'dance' }, 'x'] }); return s.cuesA.length === 2 && s.cuesA[0].t === 2.5 && s.cuesA[0].a === 'talk' && s.cuesA[1].t === 4 && s.cuesB.length === 0; });
  t('walking shots cannot have cues', () => normShot({ actionA: 'walk', cuesA: [{ t: 1, a: 'sit' }] }).cuesA.length === 0);
  t('segments follow the cues', () => { const s = normShot({ duration: 6, actionA: 'sit', cuesA: [{ t: 2, a: 'talk' }, { t: 4, a: 'sip' }] }); const g = segmentsOf(s, 'A'); return g.length === 3 && g[1].a === 'talk' && seqText(s, 'A') === 'Sit > Talk (2 s) > Sip chai (4 s)' && seqText(s, 'B') === 'Standing'; });
  t('cues survive a project round trip', () => { $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA, shots: [{ duration: 6, actionB: 'listen', cuesB: [{ t: 3, a: 'nod' }] }] }); applyCode(); loadCode(); const o = JSON.parse($('#ta').value).shots[0]; return o.cuesB.length === 1 && o.cuesB[0].a === 'nod' && o.cuesB[0].t === 3 && o.cuesA.length === 0; });
  t('mode switch keeps its own styling', () => { const b = [...document.querySelectorAll('#modeSeg button')]; return b.length === 2 && b.every(x => x.getBoundingClientRect().width > 30 && getComputedStyle(x).opacity === '1') && getComputedStyle($('#modeSeg')).paddingLeft === '3px'; });
  t('pan direction matches its label and old scenes keep their look', () => {
    const sh = newShot({ move: 'pan', dir: 1, amount: 1 }), yaw0 = solve(sh, 0, 0).yaw, yaw1 = solve(sh, 1, 3).yaw; // yaw decreasing = turning right
    $('#ta').value = JSON.stringify({ schemaVersion: 5, shots: [{ move: 'pan', dir: 1 }, { move: 'tilt', dir: 1 }] }); applyCode(); const old = P.shots[0].dir === -1 && P.shots[1].dir === 1;
    $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA, shots: [{ move: 'pan', dir: 1 }] }); applyCode(); const cur = P.shots[0].dir === 1;
    return yaw1 < yaw0 && old && cur;
  });
  t('PDF writer is wired in', () => typeof buildShotListPdf === 'function' && typeof buildStoryboardPdf === 'function');
  t('desktop save helper exists', () => typeof download === 'function' && typeof browserDownload === 'function');

  for (let i = 0; i < 160 && !(REAL.A && REAL.B); i++) await new Promise(r => setTimeout(r, 100));
  t('both actors loaded', () => !!(REAL.A && REAL.B));
  t('every action clip is bound for both actors', () => ['A', 'B'].every(k => Object.keys(ACTION_LABEL).filter(n => n !== 'stand' && n !== 'walk').every(n => REAL[k].act[n] && REAL[k].act[n].dur > 1)));
  t('seated and sip props exist', () => ['A', 'B'].every(k => REAL[k].chair && REAL[k].glass));
  t('actions pose the skeleton differently', () => {
    const sh = newShot({ subject: 'A', actionA: 'stand' }); poseActors(sh, .5, 1, 0); const bone = AC.A.getObjectByName('Bip01_R_Hand'); AC.A.updateMatrixWorld(true);
    const p0 = bone.getWorldPosition(new T.Vector3()); sh.actionA = 'wave'; poseActors(sh, .5, 1, 0); AC.A.updateMatrixWorld(true);
    const p1 = bone.getWorldPosition(new T.Vector3()); sh.actionA = 'sit'; poseActors(sh, .5, 1, 0); const seated = REAL.A.chair.visible; const root = AC.A.getObjectByName('Bip01').position.y;
    poseActors(null, 0, 0, 0);
    return p0.distanceTo(p1) > .2 && seated && root < .8;
  });
  t('the action lane changes the pose and props over time', () => {
    const sh = newShot({ duration: 6, actionA: 'stand', cuesA: [{ t: 2, a: 'sit' }] });
    poseActors(sh, 0, 0, 0); const early = REAL.A.chair.visible; const root0 = AC.A.getObjectByName('Bip01').position.y;
    poseActors(sh, .5, 2.1, 0); const mid = REAL.A.act.sit.a.weight; poseActors(sh, .9, 5, 0); const late = REAL.A.chair.visible; const root1 = AC.A.getObjectByName('Bip01').position.y;
    poseActors(null, 0, 0, 0);
    return !early && late && mid > 0 && mid < 1 && root1 < root0 - .15;
  });

  /* calibration: Kalki renders its own camera moves and the analyser has to recognise them (this also fixes the direction signs) */
  const grabGray = (shot, count) => {
    const keep = { P, demo, playing, time, sel }, frames = [], c = document.createElement('canvas'); c.width = AW; c.height = AH;
    const g = c.getContext('2d', { willReadFrequently: true }), r = R.getPixelRatio();
    P = { ...P, shots: [shot] }; demo = false; playing = false; sel = 0;
    for (let i = 0; i < count; i++) { time = i / (count - 1) * shot.duration * .999; step(); step(); render(true); g.drawImage(cv, film.x * r, film.y * r, film.w * r, film.h * r, 0, 0, AW, AH); frames.push(toGray(g.getImageData(0, 0, AW, AH).data, AW, AH)); }
    ({ P, demo, playing, time, sel } = keep); return frames;
  };
  const OK = { pan: ['pan'], tilt: ['tilt', 'pedestal'], truck: ['truck', 'pan'], pedestal: ['pedestal', 'tilt'], push_in: ['push_in', 'zoom_in'], pull_out: ['pull_out'], zoom_in: ['zoom_in', 'push_in'], static: ['static'] };
  for (const [mv, dir] of [['pan', 1], ['pan', -1], ['tilt', 1], ['tilt', -1], ['truck', 1], ['truck', -1], ['pedestal', 1], ['pedestal', -1], ['push_in', 1], ['pull_out', 1], ['zoom_in', 1], ['static', 1]]) {
    const shot = newShot({ move: mv, dir, size: 'WS', subject: 'both', lens: 35, duration: 3, amount: ['pan', 'tilt'].includes(mv) ? .4 : .9, angle: 15, easing: 'linear', fstop: 8 });
    const res = analyzeClip(grabGray(shot, 19), 6), d = res.shots[0];
    t(`analyser recognises Kalki's ${mv}${mv === 'static' || mv.includes('_') ? '' : ' (dir ' + dir + ')'}`, () => res.shots.length === 1 && OK[mv].includes(d.move) && (!['pan', 'tilt', 'truck', 'pedestal'].includes(mv) || d.dir === dir) || (() => { throw new Error('got ' + JSON.stringify({ move: d.move, dir: d.dir, cx: +d.cumX.toFixed(3), cy: +d.cumY.toFixed(3), cs: +d.cumS.toFixed(3), par: +d.parallax.toFixed(2), n: res.shots.length })); })());
  }
  { const fast = analyzeClip(grabGray(newShot({ move: 'pan', dir: 1, size: 'WS', subject: 'both', lens: 35, duration: 3, amount: .7, angle: 15, easing: 'linear', fstop: 8 }), 19), 6);
    t('a fast pan is one shot, not a series of cuts', () => fast.shots.length === 1 && ['pan', 'truck'].includes(fast.shots[0].move) || (() => { throw new Error('got ' + JSON.stringify(fast.shots.map(x => [x.move, +x.dur.toFixed(1)]))); })()); }
  t('cast is normalised, saved and loaded', () => {
    $('#ta').value = JSON.stringify({ schemaVersion: SCHEMA, actors: { A: 'm04', B: 'nope' }, shots: [{}] }); applyCode(); const a = P.actors.A === 'm04' && P.actors.B === DEFAULT_CAST.B;
    loadCode(); const o = JSON.parse($('#ta').value); $('#ta').value = JSON.stringify({ shots: [{}] }); applyCode();
    return a && o.actors.A === 'm04' && P.actors.A === 'f11' && P.actors.B === 'm17';
  });
  t('every avatar has a name and a gender', () => Object.values(AV).length >= 7 && Object.values(AV).every(a => a.first && (a.g === 'f' || a.g === 'm')));
  t('actor names and subject labels follow the cast', () => { P.actors = { A: 'f07', B: 'm07' }; const ok = ACTOR_NAME.A === 'Priya' && ACTOR_NAME.B === 'Vikram' && SUBJ.A.startsWith('Priya') && describeActions(newShot({}), 'B').startsWith('Vikram'); P.actors = { ...DEFAULT_CAST }; return ok; });
  for (const id of Object.keys(AV)) {
    const k = AV[id].g === 'f' ? 'A' : 'B';
    await installActor(k, id);
    t(`avatar ${id} (${AV[id].first}) installs, binds every action and stands at a sensible height`, () => {
      const Q = REAL[k]; if (!Q || Q.avatar !== id) throw new Error('not installed');
      const missing = Object.keys(ACTION_LABEL).filter(n => n !== 'stand' && n !== 'walk' && !Q.act[n]); if (missing.length) throw new Error('missing ' + missing.join());
      AC[k].updateMatrixWorld(true); const box = new T.Box3().setFromObject(AC[k].children.find(c => c === Q.root), true), h = box.max.y - box.min.y;
      const info = { h: +h.toFixed(2), w: +(box.max.x - box.min.x).toFixed(2), d: +(box.max.z - box.min.z).toFixed(2), hand: !!AC[k].getObjectByName('Bip01_R_Hand'), bx: Q.bx, bip: !!AC[k].getObjectByName('Bip01'), sc: +Q.sc.toFixed(3) };
      if (!(h > 1.5 && h < 1.9 && info.hand && info.bip)) throw new Error(JSON.stringify(info));
      return true;
    });
  }
  await installActor('A', 'f11'); await installActor('B', 'm17');
  t('every costume builds its parts and attaches them to real bones', () => { for (const id of Object.keys(OUTFITS)) for (const p of OUTFITS[id].parts) { const { bone, obj } = makeParts(p); let meshes = 0; obj.traverse(o => { if (o.isMesh) meshes++; }); if (!meshes || !REAL.A.root.getObjectByName(bone)) return false; } return true; });
  t('putting on and taking off a costume changes the actor', () => { P.outfit = { A: 'student', B: 'plain' }; applyOutfit('A'); const on = REAL.A.acc.length === 2 && REAL.A.root.getObjectByName('Bip01_Pelvis').children.includes(REAL.A.acc[0]); P.outfit = { A: 'plain', B: 'plain' }; applyOutfit('A'); return on && REAL.A.acc.length === 0 && !REAL.A.root.getObjectByName('Bip01_Pelvis').children.some(c => c.type === 'Group' && c.children.some(m => m.material && m.material.color && m.material.color.getHex() === 0x8a3d2a)); });
  const texts = () => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const n = w.currentNode; if (/[A-Za-z]{2}/.test(n.nodeValue) || n.__en) out.push((n.__en !== undefined ? n.__en : n.nodeValue).trim()); } return out.sort().join('|'); };
  t('switching language translates the page and switching back restores it exactly', () => {
    const before = texts(); setLang('ta'); const ta = $('#bUndo').title, tamilText = /[\u0B80-\u0BFF]/.test(ta) && /[\u0B80-\u0BFF]/.test($('#mFile .btn').textContent);
    setLang('hi'); const hiOk = /[\u0900-\u097F]/.test($('#bUndo').title) && /[\u0900-\u097F]/.test($('#mExport .btn').textContent);
    setLang('en'); const after = texts(); document.documentElement.lang; return tamilText && hiOk && before === after && $('#bUndo').title === 'Undo (Ctrl+Z)';
  });
  t('text added later is translated too, with numbers and names filled in', () => {
    setLang('hi'); const probe = document.createElement('span'); probe.textContent = 'Shot 2 of 4'; document.body.appendChild(probe); const sync = trFn(probe.textContent); probe.remove(); setLang('en'); return sync === 'शॉट 2 / 4';
  });
  t('time-of-day looks exist and apply', () => { for (const k of ['dawn', 'noon', 'dusk']) { if (!LOOKS[k] || !LOOKS[k].label) return false; applyLook(k); } applyLook(P.look); return true; });
  t('Indic text becomes an image for PDFs', () => { const r = rasterText('தமிழ் காட்சி · हिन्दी', 10, false, [20, 20, 30]); return r.data[0] === 0xff && r.data[1] === 0xd8 && r.w > 40 && r.ptH > 8; });
  t('file names keep Tamil and Hindi letters', () => { const keep = P.title; P.title = 'தமிழ் காட்சி'; const a = fname('.json'); P.title = '!!!'; const b = fname('.json'); P.title = keep; return a === 'தமிழ்-காட்சி.json' && b === 'kalki-scene.json'; });
  const pass = res.filter(r => r[1]).length;
  const out = document.createElement('pre'); out.id = 'selftestOut';
  out.textContent = res.map(r => `${r[1] ? 'PASS' : 'FAIL'}  ${r[0]}${r[2] ? '  (' + r[2] + ')' : ''}`).join('\n') + `\nSELFTEST ${pass === res.length ? 'PASS' : 'FAIL'} ${pass}/${res.length}`;
  out.style.cssText = 'position:fixed;inset:0;margin:0;padding:16px;background:#fff;color:#000;z-index:99999;white-space:pre-wrap;font:12px monospace';
  document.body.appendChild(out);
  document.title = `SELFTEST ${pass === res.length ? 'PASS' : 'FAIL'} ${pass}/${res.length}`;
}

frame();
})();
