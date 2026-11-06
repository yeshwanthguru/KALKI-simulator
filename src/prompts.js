/* Text prompts for AI video tools, built from a Kalki scene. Kalki gives the camera facts (move, lens, size, height, angle, speed); the words are
   generic English, not the syntax of any one tool. AI tools read camera instructions loosely, so the text says what was planned, not what will be produced. */

const MOVE = {
  static: () => 'locked-off camera, no camera movement',
  push_in: () => 'slow dolly push-in toward the subject',
  pull_out: () => 'slow dolly pull-out away from the subject',
  zoom_in: () => 'slow optical zoom in, the camera itself stays still',
  truck: d => `truck (camera slides sideways) to the ${d > 0 ? 'right' : 'left'}`,
  pedestal: d => `pedestal move, camera ${d > 0 ? 'rises' : 'lowers'} while staying level`,
  pan: d => `pan to the ${d > 0 ? 'right' : 'left'} on a tripod`,
  tilt: d => `tilt ${d > 0 ? 'up' : 'down'} on a tripod`,
  arc: d => `gentle arc ${d > 0 ? 'clockwise' : 'counter-clockwise'} around the subject`,
  orbit: d => `full 360-degree orbit ${d > 0 ? 'clockwise' : 'counter-clockwise'} around the subject`,
  crane: d => `crane move, camera ${d > 0 ? 'rises high above' : 'descends from above'} the action`,
  dolly_zoom: d => `dolly zoom (vertigo effect): the camera moves ${d > 0 ? 'away' : 'closer'} while the lens zooms the opposite way, the subject stays the same size and the background stretches`,
  whip_pan: d => `fast whip pan to the ${d > 0 ? 'right' : 'left'} with motion blur`,
  handheld: () => 'handheld camera with natural, documentary-style shake',
  dutch: d => `dutch angle, the horizon tilts ${d > 0 ? 'clockwise' : 'counter-clockwise'}`,
  follow: () => 'tracking shot that follows the walking actor from the side',
  spiral: d => `spiral move, the camera circles ${d > 0 ? 'clockwise' : 'counter-clockwise'} while pushing closer`,
  reveal: () => 'start low and tight on a detail, rise and pull back to reveal the whole place'
};
const SIZE = { EWS: 'extreme wide shot', WS: 'wide shot', FS: 'full shot, head to toe', MS: 'medium shot, waist up', MCU: 'medium close-up, chest up', CU: 'close-up on the face', ECU: 'extreme close-up' };
const HEIGHT = { ground: 'camera at ground level', low: 'low-angle camera', eye: 'eye-level camera', high: 'high-angle camera', top: "bird's-eye view from directly above" };
const LOOK = { golden: 'warm golden-hour sunlight', teal: 'teal and orange cinematic grade', night: 'night scene with cool blue light and warm practical lamps', noir: 'high-contrast black and white noir lighting', neutral: 'neutral natural colour', dawn: 'soft dawn light', noon: 'bright midday sun', dusk: 'dusk light with a deep orange sky' };

const lensWord = (l, eq) => { const f = eq || l; return f <= 24 ? `wide-angle ${l} mm lens` : f <= 50 ? `${l} mm lens, natural perspective` : f <= 85 ? `${l} mm short-telephoto lens` : `${l} mm telephoto lens with compressed background`; };
const dofWord = f => (f <= 2 ? 'very shallow depth of field, soft blurred background' : f <= 4 ? 'shallow depth of field' : f <= 5.6 ? 'moderate depth of field' : 'deep focus, everything sharp');
const speedWord = (amount, duration) => { const v = amount / Math.max(1, duration); return v > .2 ? 'fast' : v > .1 ? 'moderate-speed' : 'slow'; };

/* scene: { title, look (id), lookLabel, setLabel, sensorLabel, squeeze, aspectLabel, shots: [{ n, name, move, dir, lens, eq, fstop, size, height, angle, subject, actions, amount, duration, notes }] } */
export function shotPrompt(scene, s) {
  const mv = (MOVE[s.move] || MOVE.static)(s.dir), amt = s.move === 'static' || s.move === 'handheld' || s.move === 'follow' ? '' : speedWord(s.amount, s.duration) + ' ';
  const parts = [`${SIZE[s.size] || s.size}, ${HEIGHT[s.height] || ''}`, `${amt}${mv}`, lensWord(s.lens, s.eq), dofWord(s.fstop)];
  if (Math.abs(s.angle) >= 10) parts.push(`camera about ${Math.abs(s.angle)} degrees ${s.angle > 0 ? 'to the right of' : 'to the left of'} the subject's front`);
  const who = (s.actions || []).filter(Boolean).join('; ');
  const setting = [scene.setLabel && `set: ${scene.setLabel}`, LOOK[scene.look] || scene.lookLabel].filter(Boolean).join(', ');
  return `${parts.filter(Boolean).join(', ')}. ${who ? who + '. ' : ''}${setting ? setting.charAt(0).toUpperCase() + setting.slice(1) + '. ' : ''}${scene.aspectLabel ? 'Frame ' + scene.aspectLabel + '. ' : ''}Duration about ${s.duration} seconds.`;
}

export function buildPrompts(scene) {
  const out = [`KALKI SIMULATOR: AI REFERENCE PROMPTS`, `Scene: ${scene.title}`, `Sensor: ${scene.sensorLabel}${scene.squeeze > 1 ? `, ${scene.squeeze}x anamorphic` : ''}   |   ${scene.shots.length} shots`, '',
    'How to use: attach the matching frame (.png) as the starting image or reference in your AI video tool and paste the prompt for that shot.',
    'These words describe the camera work planned in Kalki. AI tools read such instructions loosely and may ignore the lens, speed or angle, so check the result against the plan.', ''];
  for (const s of scene.shots) {
    out.push(`--- Shot ${s.n}: ${s.name} (${s.duration} s) ---`, 'Prompt:', shotPrompt(scene, s), `Plan: ${s.moveName}, ${s.lens} mm${s.eq && s.eq !== s.lens ? ` (about ${s.eq} mm full-frame equivalent)` : ''}, f/${s.fstop}, ${s.size}, ${s.heightLabel}, angle ${s.angle} degrees, move intensity ${Math.round(s.amount * 100)}%.`);
    if (s.notes) out.push(`Your note: ${s.notes}`);
    out.push('');
  }
  return out.join('\r\n');
}
