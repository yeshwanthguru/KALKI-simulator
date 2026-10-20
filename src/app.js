(function () {
'use strict';
const T = window.THREE;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const D2R = Math.PI / 180, SENSOR_H = 14;

/* ---------- cinema grammar ---------- */
const SIZES = {
  EWS: { h: 9, ty: 1.1, label: 'Extreme wide' }, WS: { h: 4.2, ty: 1.0, label: 'Wide' },
  FS: { h: 2.3, ty: 0.95, label: 'Full shot' }, MS: { h: 1.1, ty: 1.25, label: 'Medium' },
  MCU: { h: 0.7, ty: 1.5, label: 'Medium close-up' }, CU: { h: 0.42, ty: 1.64, label: 'Close-up' },
  ECU: { h: 0.2, ty: 1.7, label: 'Extreme close-up' }
};
const HEIGHTS = { ground: 'Ground level', low: 'Low angle', eye: 'Eye level', high: 'High angle', top: "Bird's eye" };
const LENSES = [14, 18, 24, 35, 50, 85, 135], FSTOPS = [1.4, 1.8, 2.8, 4, 5.6, 8, 11];
const EASES = { smooth: 'Smooth (ease in-out)', linear: 'Linear (mechanical)', in: 'Ease in (accelerate)', out: 'Ease out (settle)' };
const EF = { linear: t => t, smooth: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, in: t => t * t * t, out: t => 1 - Math.pow(1 - t, 3) };
const SUBJ = { A: 'Meera (Actor A)', B: 'Arjun (Actor B)', both: 'Both actors' };
const CATS = { basic: 'Basic', dynamic: 'Dynamic', emotion: 'Emotion' };

const MOVES = [
  { id: 'static', name: 'Locked-off', cat: 'basic', g: '▣', s: 'Camera holds still', why: 'Stillness lets the performance carry the scene. The audience studies faces and details because nothing else moves.', tip: 'Great for dialogue and comedy timing. Pair with a 35–50mm lens for a natural feel.', ap() {} },
  { id: 'push_in', name: 'Push in', cat: 'emotion', g: '⇥', s: 'Dolly slowly toward subject', why: 'Moving closer pulls the audience into the character’s head. It signals that this moment matters: a realisation, a decision, rising tension.', tip: 'Keep it slow and smooth. Start it just before the key line lands.', ap(s, t, a) { s.d *= 1 - .55 * a * t; } },
  { id: 'pull_out', name: 'Pull out', cat: 'emotion', g: '⇤', s: 'Dolly away from subject', why: 'Backing away isolates the character and reveals the world around them. Often used for loneliness, defeat or an ending.', tip: 'Let the final wide frame hold for a beat after the move ends.', ap(s, t, a) { s.d *= 1 + 1.3 * a * t; } },
  { id: 'zoom_in', name: 'Zoom in', cat: 'basic', g: '⊕', s: 'Lens zooms, camera stays put', why: 'A zoom magnifies without changing perspective, so it feels more “noticed” than “felt”. Compare it with a push-in to see the difference in depth.', tip: 'Fast zooms read as dramatic or comic; slow zooms feel observational, like a documentary.', ap(s, t, a) { s.fovMul = 1 - .62 * a * t; } },
  { id: 'truck', name: 'Truck', cat: 'basic', g: '⇆', s: 'Slide sideways with the action', why: 'Sideways movement creates parallax: near objects pass faster than far ones, which makes a flat set feel deep and alive.', tip: 'Put something in the foreground (a pillar, a plant) to exaggerate the parallax.', dir: 1, ap(s, t, a, d) { s.lat = (t - .5) * 3.2 * a * d; } },
  { id: 'pedestal', name: 'Pedestal', cat: 'basic', g: '⇅', s: 'Raise or lower the camera', why: 'Changing height while staying level shifts how powerful the subject looks. Rising above feels superior; sinking below makes them grow in stature.', tip: 'On a budget, a tripod with a centre column does small pedestal moves.', dir: 1, ap(s, t, a, d) { const v = (t - .5) * 1.8 * a * d; s.camY += v; s.ty += v; } },
  { id: 'pan', name: 'Pan', cat: 'basic', g: '↔', s: 'Rotate left or right on the spot', why: 'A pan follows attention, like turning your head. It connects two things in the same space without cutting.', tip: 'Pan slowly on wide lenses; fast pans on long lenses judder (strobe).', dir: 1, ap(s, t, a, d) { s.yaw = (t - .5) * 70 * a * d * D2R; } },
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
const newShot = (o = {}) => normShot(Object.assign({ name: '', move: 'static', duration: 4, lens: 35, size: 'MS', subject: 'A', height: 'eye', angle: 0, amount: .6, dir: 1, easing: 'smooth', action: 'idle' }, o));
function normShot(o, errs, i) {
  const e = (m) => errs && errs.push(`Shot ${i + 1}: ${m}`);
  const s = {};
  s.move = MV[o.move] ? o.move : (e(`unknown move "${o.move}"`), 'static');
  s.name = String(o.name || MV[s.move].name).slice(0, 40);
  s.duration = clamp(+o.duration || 4, 1, 20);
  s.lens = LENSES.includes(+o.lens) ? +o.lens : (o.lens !== undefined && e('lens must be one of ' + LENSES.join(', ')), 35);
  s.size = SIZES[o.size] ? o.size : (o.size !== undefined && e('size must be ' + Object.keys(SIZES).join('/')), 'MS');
  s.subject = SUBJ[o.subject] ? o.subject : 'A';
  s.height = HEIGHTS[o.height] ? o.height : 'eye';
  s.angle = clamp(+o.angle || 0, -180, 180);
  s.fstop = FSTOPS.includes(+o.fstop) ? +o.fstop : 2.8;
  s.amount = clamp(o.amount === undefined ? .6 : +o.amount, 0, 1);
  s.dir = +o.dir < 0 ? -1 : 1;
  s.easing = EASES[o.easing] ? o.easing : 'smooth';
  s.action = o.action === 'walk' ? 'walk' : 'idle';
  return s;
}
const DEMO = () => ({ kalki: '0.1', title: 'Chai stall – first meeting', aspect: '2.39', look: 'golden', shots: [
  newShot({ fstop: 5.6, name: 'Establish the stall', move: 'reveal', duration: 5, lens: 24, size: 'WS', subject: 'both', height: 'eye', angle: 15, amount: .7 }),
  newShot({ fstop: 1.8, name: 'Meera notices', move: 'push_in', duration: 4.5, lens: 50, size: 'MS', subject: 'A', angle: 25, amount: .7 }),
  newShot({ fstop: 2.8, name: 'Arjun walks in', move: 'follow', duration: 5, lens: 35, size: 'FS', subject: 'B', angle: 25, action: 'walk' }),
  newShot({ fstop: 1.4, name: 'The realisation', move: 'dolly_zoom', duration: 4, lens: 50, size: 'CU', subject: 'A', angle: -10, amount: .8 })
] });
let P = DEMO(), sel = 0, time = 0, playing = false, loop = true, mode = 'nocode', guides = false, showSet = true, demo = true, recording = null;
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
  neutral: { label: 'Neutral', sun: [0xfff1e0, 3.4], hemi: [0xeef3ff, 0x1a1714, .4], fill: .4, bulb: 2.5, glass: 0xfff3e0, shaft: .5, fog: 0x15140f, dust: .3, g: [[0, 0, 0], [1, 1, 1], 1, 1.03, .35, .025, .0015] }
};

const mat = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .8, flatShading: false }, o));
function add(geo, m, x, y, z, sh = true) { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = sh; o.receiveShadow = true; scene.add(o); return o; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }

// lights
const FX = [], BULBS = [], GLASS = [], SHAFTS = [];
const hemi = new T.HemisphereLight(0xffd9b0, 0x1a1210, .42); scene.add(hemi);
const sun = new T.DirectionalLight(0xffb066, 4.2); sun.position.set(-7, 4.5, -12); sun.target.position.set(0, .8, 1); scene.add(sun.target); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 9, bottom: -9, near: 1, far: 40 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; scene.add(sun);
const fill = new T.DirectionalLight(0xffd2a8, .35); fill.position.set(3, 3, 9); scene.add(fill);
{ const pm = new T.PMREMGenerator(R); scene.environment = pm.fromScene(new T.RoomEnvironment(), .04).texture; scene.environmentIntensity = .22; }
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
    const sh = new T.Mesh(geo, m); sh.position.set(x, 2.6, -4.2); sh.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), SUN_DIR); m.userData.base = op; scene.add(sh); SHAFTS.push(sh); FX.push(sh);
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
for (const [x, z] of [[-2.5, -1.5], [0, -2], [2.5, -1.5]]) { add(new T.CylinderGeometry(.006, .006, 1.4), mat(0x111111), x, 3.5, z, false); const b = add(new T.SphereGeometry(.11, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(0xffd28a).multiplyScalar(5) }), x, 2.75, z, false); const l = new T.PointLight(0xffb25e, 3.5, 7, 1.6); l.position.copy(b.position); scene.add(l); BULBS.push(l); }
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
  for (const sp of STEAM) { const k = (t * .25 + sp.userData.o) % 1; sp.position.set(1.5 + Math.sin(k * 6 + sp.userData.o * 9) * .08 * k, 1.66 + k * 1.1, -3.4 + Math.cos(k * 5) * .05); sp.scale.setScalar(.12 + k * .45); sp.material.opacity = Math.sin(k * Math.PI) * .16; }
}
// table + stools
add(new T.CylinderGeometry(.55, .55, .06, 18), mat(0x8a5a3c), -.2, .78, -1.6); add(new T.CylinderGeometry(.06, .1, .78, 8), mat(0x3a2a20), -.2, .39, -1.6);
for (const x of [-1, .6]) add(new T.CylinderGeometry(.22, .2, .48, 10), mat(0xd6542f), x, .24, -1.7);
// pillar + plants + crates
add(new T.BoxGeometry(.5, 5.5, .5), mat(0xb08460), 4.8, 2.75, -1.4);
for (const [x, z] of [[-6.8, -3.4], [6.6, -3.3], [-3.4, 2.6]]) { add(new T.CylinderGeometry(.32, .24, .55, 10), mat(0xa4532f), x, .28, z); add(new T.ConeGeometry(.55, 1.4, 7), mat(0x3d7a44), x, 1.25, z); add(new T.ConeGeometry(.42, 1, 7), mat(0x4c9152), x, 1.85, z); }
for (const [x, z, r] of [[5.6, -2.4, .3], [6.1, -1.7, -.2], [5.8, -2.1, .1]]) { const c = add(new T.BoxGeometry(.6, .45, .6), mat(0x9c6b3f), x, .23 + (x === 5.8 ? .45 : 0), z); c.rotation.y = r; }

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
function loadReal() {
  const A = window.__KA; try { delete window.__KA; } catch (e) {} if (!A || !T.GLTFLoader) return;
  Object.assign(TXD, A.tex || {});
  const ld = new T.GLTFLoader();
  const buf = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
  const load = d => new Promise(r => { try { ld.parse(buf(d), '', g => r(g), () => r(null)); } catch (e) { r(null); } });
  const keys = ['meera', 'arjun', 'f_idle', 'f_walk', 'm_idle', 'm_walk'];
  Promise.all(keys.map(k => load(A[k]))).then(([gm, ga, fi, fw, mi, mw]) => {
    for (const [k, gl, ic, wc] of [['A', gm, fi, fw], ['B', ga, mi, mw]]) {
      if (!gl || !ic || !wc) continue; const m = gl.scene;
      const wcl = wc.animations[0]; wcl.tracks.forEach(t => { if (/^Bip01(_Footsteps)?\.position$/.test(t.name)) for (let i = 0; i < t.values.length; i += 3) { t.values[i] = t.values[0]; t.values[i + 2] = t.values[2]; } });
      const mx = new T.AnimationMixer(m), ia = mx.clipAction(ic.animations[0]), wa = mx.clipAction(wcl); ia.play(); wa.weight = 0; wa.play(); mx.update(0);
      m.updateMatrixWorld(true); const bx = new T.Box3().setFromObject(m, true), sc = (k === 'A' ? 1.66 : 1.78) / (bx.max.y - bx.min.y);
      const w = new T.Group(); w.add(m); m.scale.multiplyScalar(sc); m.position.set(-(bx.min.x + bx.max.x) / 2 * sc, -bx.min.y * sc, -(bx.min.z + bx.max.z) / 2 * sc); w.rotation.y = REAL_YAW;
      m.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; o.frustumCulled = false; const mm = o.material; if (!mm) return; mm.envMapIntensity = .7; skinMat(mm); });
      const g = AC[k]; g.children.forEach(c => c.visible = false); g.add(w);
      REAL[k] = { mx, ia, wa, iD: ic.animations[0].duration, wD: wc.animations[0].duration };
    }
    pathKey = '';
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
function subjPos(sh, t) {
  const k = sh.subject === 'both' ? null : sh.subject;
  const walk = (sh.action === 'walk' || MV[sh.move].walk) ? (k || 'A') : null;
  const pos = {}; for (const a of ['A', 'B']) pos[a] = HOME[a].clone();
  if (walk) { pos[walk].x += lerp(-2.2, 2.2, t) * sh.dir; pos[walk].z += 1.1; }
  const target = k ? pos[k] : pos.A.clone().add(pos.B).multiplyScalar(.5);
  return { target: target.clone(), pos, walk };
}
function solve(sh, t, sec) {
  const mv = MV[sh.move] || MV.static, te = mv.raw ? t : EF[sh.easing](t);
  const sp = subjPos(sh, t), sz = SIZES[sh.size];
  const vf = 2 * Math.atan(SENSOR_H / (2 * sh.lens));
  const frameH = sz.h * (sh.subject === 'both' ? 1.5 : 1);
  const d0 = (frameH / 2) / Math.tan(vf / 2);
  const eye = { A: 1.59, B: 1.69, both: 1.64 }[sh.subject], face = h => Math.max(.9, eye - h / 6);
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
function poseActors(sh, t, sec, clock) {
  const sp = sh ? subjPos(sh, t) : { pos: { A: HOME.A, B: HOME.B }, walk: null };
  for (const k of ['A', 'B']) {
    const g = AC[k], u = g.userData, w = sp.walk === k;
    g.position.copy(sp.pos[k]);
    g.rotation.y = w ? (sh.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : FACE[k];
    const ph = w ? sec * 7.5 : 0, br = Math.sin(clock * 1.6 + (k === 'A' ? 0 : 2)) * .012;
    u.legs[0].rotation.x = Math.sin(ph) * .55; u.legs[1].rotation.x = -Math.sin(ph) * .55;
    u.arms[0].rotation.x = -Math.sin(ph) * .45; u.arms[1].rotation.x = Math.sin(ph) * .45;
    u.arms[0].rotation.z = -.08; u.arms[1].rotation.z = .08;
    g.position.y = w ? Math.abs(Math.sin(ph)) * .03 : br;
    const Q = REAL[k]; if (Q) { Q.wa.weight = w ? 1 : 0; Q.ia.weight = w ? 0 : 1; Q.ia.time = (clock + (k === 'A' ? 0 : 1.3)) % Q.iD; Q.wa.time = (sec * 1.1) % Q.wD; Q.mx.update(0); g.position.y = 0; }
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
function perf(dt) { if (light || demo || location.hash === '#hq') return; fpsAcc += dt; fpsN++; if (fpsAcc > 3) { if (fpsN / fpsAcc < 22) { setLight(true); toast('Switched to Light mode for smoother playback on this computer'); } fpsAcc = 0; fpsN = 0; } }
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
function frame() {
  requestAnimationFrame(frame);
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
  const fl = SENSOR_H / (2 * Math.tan(cam.fov * D2R / 2));
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
$('#moves').onclick = e => {
  const b = e.target.closest('.mv'); if (!b) return;
  const m = MV[b.dataset.id], base = P.shots[sel] || {};
  commit();
  const sh = newShot({ move: m.id, lens: base.lens || 35, size: base.size || 'MS', subject: base.subject || 'A', angle: base.angle || 0, action: m.walk ? 'walk' : 'idle', angle2: 0 });
  if (m.walk && !base.angle) sh.angle = 80;
  const at2 = P.shots.length ? sel + 1 : 0; P.shots.splice(at2, 0, sh); sel = at2; time = starts()[sel] + .001; setPlay(true);
  refreshAll(); toast(`Added “${m.name}”`);
};

const FIELDS = [
  ['name', 'text', 'Shot name'],
  ['move', 'sel', 'Camera move', () => MOVES.map(m => [m.id, m.name])],
  ['duration', 'rng', 'Duration', 1, 20, .5, v => v.toFixed(1) + ' s'],
  ['lens', 'sel', 'Lens', () => LENSES.map(l => [l, l + ' mm' + (l <= 24 ? ' · wide' : l >= 85 ? ' · tele' : ' · normal')])],
  ['fstop', 'sel', 'Aperture', () => FSTOPS.map(f => [f, 'f/' + f + (f <= 2 ? ' · dreamy' : f >= 8 ? ' · all sharp' : '')])],
  ['size', 'sel', 'Shot size', () => Object.entries(SIZES).map(([k, v]) => [k, `${k} · ${v.label}`])],
  ['subject', 'sel', 'Subject', () => Object.entries(SUBJ)],
  ['height', 'sel', 'Camera height', () => Object.entries(HEIGHTS)],
  ['angle', 'rng', 'Angle around subject', -180, 180, 5, v => v + '°'],
  ['amount', 'rng', 'Move intensity', 0, 1, .05, v => Math.round(v * 100) + '%'],
  ['dir', 'sel', 'Direction', () => [[1, 'Right · up · forward'], [-1, 'Left · down · back']]],
  ['easing', 'sel', 'Easing', () => Object.entries(EASES)],
  ['action', 'sel', 'Actor action', () => [['idle', 'Standing'], ['walk', 'Walking across']]]
];
function lensNote(l) { return l <= 18 ? 'Ultra-wide: exaggerates space and speed; faces distort up close.' : l <= 24 ? 'Wide: shows the environment; great for establishing and movement.' : l <= 50 ? 'Normal: close to how the eye sees; honest and natural.' : l <= 85 ? 'Portrait: flattering faces, soft separated backgrounds.' : 'Telephoto: compresses depth; feels voyeuristic or intense.'; }
function buildInsp() {
  const sh = P.shots[sel], box = $('#insp');
  $('#sideH').textContent = mode === 'code' ? 'Scene code' : sh ? `Shot ${sel + 1} of ${P.shots.length}` : 'Shot';
  $('#bDup').style.visibility = $('#bDel').style.visibility = sh && mode !== 'code' ? 'visible' : 'hidden';
  if (!sh) { box.innerHTML = '<p style="color:var(--mu);padding-top:8px">No shot selected. Add one from the move library.</p>'; return; }
  const mv = MV[sh.move];
  const f = ([k, type, label, a, b, c, fmt]) => {
    const v = sh[k];
    if (type === 'text') return `<div class="f"><label>${label}</label><input type="text" data-k="${k}" value="${String(v).replace(/"/g, '&quot;')}" maxlength="40"></div>`;
    if (type === 'sel') return `<div class="f"><label>${label}</label><select data-k="${k}">${a().map(([o, l]) => `<option value="${o}"${String(o) === String(v) ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`;
    return `<div class="f"><label>${label}<em data-o="${k}">${c ? fmt(+v) : v}</em></label><input type="range" data-k="${k}" min="${a}" max="${b}" step="${c}" value="${v}"></div>`;
  };
  const F = Object.fromEntries(FIELDS.map(x => [x[0], f(x)]));
  box.innerHTML = F.name + F.move + `<div class="row">${F.lens}${F.fstop}</div><div class="row">${F.size}${F.subject}</div>${F.height}` + F.duration + F.angle + (mv.id !== 'static' ? F.amount : '') + `<div class="row">${mv.dir ? F.dir : ''}${F.easing}</div>` + (mv.walk ? '' : F.action) +
    `<div class="learn" style="--c:${catColor(mv.cat)}"><h4>Why “${mv.name}”</h4><p>${mv.why}</p><p><i>Try:</i> ${mv.tip}</p><p><i>${sh.lens} mm:</i> ${lensNote(sh.lens)}</p><p><i>f/${sh.fstop}:</i> ${sh.fstop <= 2 ? 'Shallow focus melts the background and isolates the subject: the classic cinematic look.' : sh.fstop >= 8 ? 'Deep focus keeps everything sharp, so the audience can explore the whole frame.' : 'Moderate depth: subject sharp, background softly separated.'}</p></div>`;
}
let editing = false;
$('#insp').addEventListener('input', e => {
  const k = e.target.dataset.k; if (!k) return;
  if (!editing) { commit(); editing = true; }
  const sh = P.shots[sel], fd = FIELDS.find(x => x[0] === k);
  let v = e.target.value; if (fd[1] === 'rng' || k === 'lens' || k === 'dir' || k === 'fstop') v = +v;
  sh[k] = v; if (k === 'name') { buildTL(); return; }
  if (fd[1] === 'rng') { const o = $(`[data-o="${k}"]`); if (o) o.textContent = fd[6](v); buildTL(); }
  else { if (k === 'move' && MV[v].walk) sh.action = 'walk'; buildInsp(); buildTL(); }
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
$('#track').addEventListener('pointerdown', e => { if (!P.shots.length) return; drag = true; $('#track').setPointerCapture(e.pointerId); const c = e.target.closest('.clip'); if (c && e.target.closest('#clips') && !playing) { sel = +c.dataset.i; markSel(); } seek(e); });
$('#track').addEventListener('pointermove', e => { if (drag) seek(e); });
$('#track').addEventListener('pointerup', () => { drag = false; });

function setPlay(v) { playing = v && P.shots.length > 0; if (playing && time >= total() - .01) time = 0; $('#bPlay').textContent = playing ? '❚❚' : '▶'; updTime(); }
$('#bPlay').onclick = () => setPlay(!playing);
$('#bStart').onclick = () => { time = 0; sel = 0; markSel(); };
$('#bLoop').onclick = () => { loop = !loop; $('#bLoop').style.color = loop ? 'var(--ac)' : ''; toast(loop ? 'Loop on' : 'Loop off'); };
$('#bLoop').style.color = 'var(--ac)';
$('#bGuide').onclick = () => { guides = !guides; $('#frame').classList.toggle('guides', guides); $('#bGuide').style.color = guides ? 'var(--ac)' : ''; };
$('#bSet').onclick = () => { showSet = !showSet; $('#bSet').style.color = showSet ? 'var(--ac)' : ''; layout(); };
$('#bSet').style.color = 'var(--ac)';
$('#bPerf').onclick = () => { setLight(!light); toast(light ? 'Light mode: faster on CPU-only laptops' : 'Quality mode: shadows and sharper image'); };
$('#bUndo').onclick = () => { if (undo.length) { redo.push(JSON.stringify(P)); restore(undo.pop()); toast('Undone'); } };
$('#bRedo').onclick = () => { if (redo.length) { undo.push(JSON.stringify(P)); restore(redo.pop()); toast('Redone'); } };
$('#bDel').onclick = () => { if (!P.shots.length) return; commit(); P.shots.splice(sel, 1); sel = clamp(sel, 0, P.shots.length - 1); time = P.shots.length ? starts()[sel] : 0; refreshAll(); toast('Shot deleted · Ctrl+Z to undo'); };
$('#bDup').onclick = () => { if (!P.shots.length) return; commit(); P.shots.splice(sel + 1, 0, Object.assign({}, P.shots[sel], { name: P.shots[sel].name + ' copy' })); sel++; refreshAll(); };
$('#title').oninput = e => { P.title = e.target.value; };
$('#look').innerHTML = Object.entries(LOOKS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
$('#look').onchange = e => { commit(); P.look = e.target.value; applyLook(P.look); toast(LOOKS[P.look].label + ' look'); };
$('#aspect').onchange = e => { commit(); P.aspect = e.target.value; layout(); updTime(); };

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
function loadCode() { ta.value = JSON.stringify({ kalki: '0.1', title: P.title, aspect: P.aspect, look: P.look, shots: P.shots }, null, 2); $('#cerr').textContent = ''; }
function applyCode() {
  let o; try { o = JSON.parse(ta.value); } catch (e) { $('#cerr').textContent = '✕ ' + e.message; return; }
  if (!o || !Array.isArray(o.shots)) { $('#cerr').textContent = '✕ The scene needs a "shots" list.'; return; }
  const errs = []; const shots = o.shots.slice(0, 60).map((s, i) => normShot(s || {}, errs, i));
  commit(); P = { kalki: '0.1', look: LOOKS[o.look] ? o.look : 'golden', title: String(o.title || 'Untitled scene').slice(0, 60), aspect: ['2.39', '1.778', '0.5625', '1'].includes(String(o.aspect)) ? String(o.aspect) : '2.39', shots };
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
  $('#docBody').innerHTML = row('move', MOVES.map(m => m.id).join(', ')) + row('duration', 'seconds, 1–20') + row('lens', LENSES.join(', ') + ' (mm)') + row('fstop', FSTOPS.join(', ') + ' (aperture: low = blurry background)') + row('look', Object.keys(LOOKS).join(', ') + ' (scene level)') + row('size', Object.keys(SIZES).join(', ')) + row('subject', 'A, B, both') + row('height', Object.keys(HEIGHTS).join(', ')) + row('angle', '-180 to 180 (degrees around the subject, 0 = front)') + row('amount', '0 to 1 (how strong the move is)') + row('dir', '1 or -1') + row('easing', Object.keys(EASES).join(', ')) + row('action', 'idle, walk') + row('aspect', '"2.39", "1.778", "0.5625", "1"') +
    '<pre style="margin-top:12px;background:#0c0c11;padding:10px;border-radius:8px;color:#d8e3ff;white-space:pre-wrap">{ "move": "orbit", "duration": 6, "lens": 24,\n  "size": "WS", "subject": "both", "amount": 0.5 }</pre>';
  $('#mDoc').classList.add('on');
};
$('#dClose').onclick = () => $('#mDoc').classList.remove('on');

/* files & export */
const fname = ext => (P.title || 'kalki-scene').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + ext;
function download(blob, name) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
function menu(id, fn) { const m = $(id); m.querySelector('.btn').onclick = e => { e.stopPropagation(); $$('.menu').forEach(x => x !== m && x.classList.remove('open')); m.classList.toggle('open'); }; m.querySelector('.dd').onclick = e => { const b = e.target.closest('button'); if (b) { m.classList.remove('open'); fn(b.dataset.a); } }; }
document.addEventListener('click', () => $$('.menu').forEach(x => x.classList.remove('open')));
menu('#mFile', a => {
  if (a === 'new') { commit(); P = { kalki: '0.1', title: 'Untitled scene', aspect: P.aspect, look: P.look, shots: [] }; sel = 0; time = 0; refreshAll(); toast('New scene · Ctrl+Z to undo'); }
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
    const rows = [['Shot', 'Name', 'Start', 'Duration (s)', 'Move', 'Lens (mm)', 'Aperture', 'Size', 'Subject', 'Height', 'Angle', 'Intensity', 'Easing', 'Action', 'Why this move']]
      .concat(P.shots.map((s, i) => [i + 1, s.name, tcf(st[i]), s.duration, MV[s.move].name, s.lens, 'f/' + s.fstop, SIZES[s.size].label, SUBJ[s.subject], HEIGHTS[s.height], s.angle, Math.round(s.amount * 100) + '%', s.easing, s.action, MV[s.move].why]));
    download(new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }), fname('-shotlist.csv')); toast('Shot list exported');
  }
  if (a === 'png') { render(true); const r = R.getPixelRatio(), c = document.createElement('canvas'); c.width = film.w * r; c.height = film.h * r; c.getContext('2d').drawImage(cv, film.x * r, film.y * r, c.width, c.height, 0, 0, c.width, c.height); c.toBlob(b => { download(b, fname(`-shot${sel + 1}.png`)); toast('Frame saved'); }); }
  if (a === 'rec') startRec();
});
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
  else if (k === 'home') $('#bStart').click();
  else if ((k === 'arrowright' || k === 'arrowleft') && P.shots.length) { sel = clamp(sel + (k === 'arrowright' ? 1 : -1), 0, P.shots.length - 1); time = starts()[sel]; markSel(); }
});
document.addEventListener('contextmenu', e => { if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') e.preventDefault(); });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && /\.json$/i.test(f.name)) { const dt = new DataTransfer(); dt.items.add(f); $('#fileIn').files = dt.files; $('#fileIn').dispatchEvent(new Event('change')); } });

/* onboarding */
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
$('#obTitle').innerHTML = 'KALKI'.split('').map((c, i) => `<span style="animation-delay:${.35 + i * .09}s">${c}</span>`).join('');
function showIntro() { demo = true; setPlay(false); $('#ob').classList.remove('out'); $('#ob').style.display = ''; $('#obStep1').style.display = ''; $('#obStep2').style.display = 'none'; }
function endIntro(m) { store.set('kalki.onboarded', '1'); $('#ob').classList.add('out'); setTimeout(() => $('#ob').style.display = 'none', 650); demo = false; setMode(m || mode); time = 0; sel = 0; markSel(); setPlay(true); }
$('#obNext').onclick = () => { $('#obStep1').style.display = 'none'; $('#obStep2').style.display = ''; };
$$('.mode').forEach(b => b.onclick = () => endIntro(b.dataset.m));
$('#obSkip').onclick = () => endIntro('nocode');

function refreshAll(code = true) { P.look = LOOKS[P.look] ? P.look : 'golden'; $('#look').value = P.look; applyLook(P.look); $('#title').value = P.title; $('#aspect').value = P.aspect; $('#empty').style.display = P.shots.length ? 'none' : 'grid'; buildTL(); buildInsp(); layout(); pathKey = ''; if (mode === 'code' && code) loadCode(); }
new ResizeObserver(layout).observe($('#view'));
buildLib(); refreshAll();
if (store.get('kalki.onboarded')) { demo = false; $('#ob').style.display = 'none'; setPlay(true); }
frame();
})();
