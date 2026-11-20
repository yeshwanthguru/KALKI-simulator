// Tests for src/prompts.js and src/docinfo.js: AI prompt text and the document details printed on the PDFs.
import assert from 'node:assert/strict';
import { shotPrompt, buildPrompts } from '../src/prompts.js';
import { normInfo, infoLine, ACCENTS, LOGO_MAX } from '../src/docinfo.js';

const shot = (o = {}) => ({ n: 1, name: 'Notice', move: 'push_in', moveName: 'Push in', dir: 1, lens: 50, eq: 75, fstop: 1.8, size: 'MCU', height: 'eye', heightLabel: 'Eye level', angle: 25, subject: 'A', amount: .6, duration: 4.5, notes: 'hold the sip', actions: ['Meera: Sipping chai'], ...o });
const scene = { title: 'Chai stall', look: 'golden', lookLabel: 'Golden hour', setLabel: 'Chai stall', sensorLabel: 'APS-C', squeeze: 1, aspectLabel: '2.39:1', shots: [shot(), shot({ n: 2, move: 'dolly_zoom', lens: 24, eq: 0, fstop: 8, size: 'WS', height: 'low', angle: -40, dir: -1, notes: '' })] };
const p = shotPrompt(scene, scene.shots[0]);
assert.match(p, /dolly push-in/); assert.match(p, /medium close-up/); assert.match(p, /50 mm/); assert.match(p, /shallow depth of field/); assert.match(p, /to the right of/); assert.match(p, /golden-hour/); assert.match(p, /Duration about 4.5 seconds/);
const p2 = shotPrompt(scene, scene.shots[1]);
assert.match(p2, /vertigo/); assert.match(p2, /wide-angle 24 mm/); assert.match(p2, /deep focus/); assert.match(p2, /to the left of/); assert.match(p2, /low-angle/);
const all = buildPrompts(scene);
assert.ok(all.includes('Shot 1: Notice') && all.includes('Shot 2:') && all.includes('Your note: hold the sip') && all.includes('read such instructions loosely') && all.includes('about 75 mm full-frame equivalent'));
assert.ok(buildPrompts({ ...scene, squeeze: 2 }).includes('2x anamorphic'));
assert.ok(!/undefined|NaN/.test(all));

/* document details */
const i = normInfo({ production: '  Kalki\n  Films ', director: 'x'.repeat(100), accent: 'nope', lang: 'fr', logo: 'http://evil', logoW: 10, logoH: 10 });
assert.equal(i.production, 'Kalki Films'); assert.equal(i.director.length, 60); assert.equal(i.accent, 'ember'); assert.equal(i.lang, 'ui'); assert.equal(i.logo, ''); assert.equal(i.logoW, 0);
const logo = 'data:image/jpeg;base64,' + 'A'.repeat(100);
assert.equal(normInfo({ logo, logoW: 100, logoH: 30 }).logo, logo); assert.equal(normInfo({ logo }).logo, '', 'a logo without its size is dropped'); assert.equal(normInfo({ logo: 'data:image/jpeg;base64,' + 'A'.repeat(LOGO_MAX), logoW: 1, logoH: 1 }).logo, '');
assert.deepEqual(normInfo(null), normInfo({})); assert.ok(Object.keys(ACCENTS).every(k => ACCENTS[k][1].length === 3));
assert.deepEqual(infoLine({ production: 'Kalki Films', scene: '12', day: '3' }), ['Kalki Films', 'Scene 12', 'Shoot day: 3']);
assert.deepEqual(infoLine({}), []);
console.log('prompts ok');
