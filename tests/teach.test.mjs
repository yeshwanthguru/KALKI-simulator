// Tests for the teaching and writing tools: assignments (src/assignment.js), scene comparison (src/compare.js) and script import (src/script.js).
import assert from 'node:assert/strict';
import { normAssignment, evaluate, summary, describeCheck, reportText, CHECK_TYPES } from '../src/assignment.js';
import { compareScenes } from '../src/compare.js';
import { parseScript, scriptToShots } from '../src/script.js';

/* ---- assignments ---- */
const known = { moves: ['push_in', 'pan', 'static'], sizes: ['CU', 'MS', 'WS'], aspects: ['2.39', '1.778'] };
const a = normAssignment({ title: '  Two person scene ', brief: 'Shoot a short dialogue.\r\nUse the 180 degree rule.', checks: [
  { type: 'minShots', value: '4' }, { type: 'useMove', value: 'push_in' }, { type: 'useMove', value: 'warp' }, { type: 'minRuntime', value: -3 }, { type: 'useSize', value: 'CU' }, { type: 'allNotes', value: 9 }, { type: 'bogus', value: 1 }, { type: 'noRepeat' }, { type: 'aspect', value: 1.778 }, null] }, known);
assert.equal(a.title, 'Two person scene'); assert.ok(!a.brief.includes('\r')); assert.deepEqual(a.checks.map(c => c.type), ['minShots', 'useMove', 'useSize', 'allNotes', 'noRepeat', 'aspect'], 'unknown or invalid checks are dropped');
assert.equal(a.checks[0].value, 4); assert.equal(a.checks[3].value, 1); assert.equal(a.checks[5].value, '1.778');
assert.equal(normAssignment(null), null); assert.equal(normAssignment({}), null); assert.equal(normAssignment('x'), null);
assert.equal(normAssignment({ checks: Array.from({ length: 30 }, () => ({ type: 'noRepeat' })) }).checks.length, 12, 'at most 12 checks');
const scene = { aspect: '1.778', title: 'Mine', shots: [{ move: 'push_in', size: 'CU', duration: 5, notes: 'x', name: 'a', lens: 50 }, { move: 'pan', size: 'MS', duration: 6, notes: '', name: 'b', lens: 35 }, { move: 'pan', size: 'MS', duration: 4, notes: 'y', name: 'c', lens: 35 }] };
const names = { moves: { push_in: 'Push in' }, sizes: { CU: 'close-up' }, aspects: { '1.778': '16:9 YouTube' } };
const res = evaluate(a, scene, names), by = Object.fromEntries(res.map(r => [r.check.type, r]));
assert.equal(by.minShots.ok, false); assert.match(by.minShots.detail, /you have 3/); assert.equal(by.useMove.ok, true); assert.equal(by.useSize.ok, true);
assert.equal(by.allNotes.ok, false); assert.match(by.allNotes.detail, /shot 2/); assert.equal(by.noRepeat.ok, false); assert.match(by.noRepeat.detail, /shot 3/); assert.equal(by.aspect.ok, true);
assert.match(by.useMove.label, /Push in/); assert.match(by.aspect.label, /16:9 YouTube/);
assert.deepEqual(summary(res), { done: 3, total: 6 });
assert.deepEqual(evaluate(null, scene), []);
const empty = evaluate(a, { shots: [], aspect: '2.39' }); assert.ok(empty.every(r => !r.ok), 'an empty scene meets nothing');
const rt = reportText(a, { ...scene, shots: scene.shots.map(s => ({ ...s, moveName: s.move })) }, res, { date: '1 Nov 2026', student: 'Asha' });
assert.ok(rt.includes('Result: 3 of 6 checks met') && rt.includes('[x] ') && rt.includes('[ ] ') && rt.includes('Student: Asha') && rt.includes('Shoot a short dialogue.'));
assert.ok(Object.keys(CHECK_TYPES).every(k => describeCheck({ type: k, value: CHECK_TYPES[k].def }).length > 5));

/* ---- comparison ---- */
const mk = (moves, d = 3) => ({ shots: moves.map(m => ({ move: m, size: 'MS', lens: 35, height: 'eye', duration: d, angle: 0 })) });
const c = compareScenes(mk(['push_in', 'pan', 'static']), { shots: [{ move: 'push_in', size: 'MS', lens: 35, height: 'eye', duration: 3, angle: 0 }, { move: 'tilt', size: 'CU', lens: 50, height: 'eye', duration: 3, angle: 0 }] });
assert.equal(c.rows.length, 3); assert.deepEqual(c.rows[0].diffs, []); assert.deepEqual(c.rows[1].diffs.map(d => d.field), ['move', 'size', 'lens']); assert.equal(c.rows[2].b, null);
assert.equal(c.summary.identical, 1); assert.equal(c.summary.sameMove, 1); assert.equal(c.summary.match, 33); assert.deepEqual(c.summary.onlyA, ['pan', 'static']); assert.deepEqual(c.summary.onlyB, ['tilt']); assert.equal(c.summary.runtimeA, 9);
assert.equal(compareScenes({}, {}).rows.length, 0);

/* ---- script import ---- */
const fountain = `Title: Chai Pe Charcha
Author: Test

EXT. VILLAGE CHAI STALL - MORNING

Meera sits at the stall. Arjun walks in with a bag.

ARJUN
Is this seat taken?

MEERA (O.S.)
(smiling)
Only by you.

ARJUN
What?!

INT. LIVING ROOM - NIGHT

They sit in silence.

CUT TO:

EXT. TERRACE - DAWN

MEERA
It is over.
`;
const p = parseScript(fountain);
assert.equal(p.meta.title, 'Chai Pe Charcha'); assert.deepEqual(p.blocks.map(b => b.type).slice(0, 5), ['heading', 'action', 'cue', 'dialogue', 'cue']); assert.ok(p.blocks.some(b => b.type === 'paren') && p.blocks.some(b => b.type === 'transition'));
const r = scriptToShots(fountain);
assert.equal(r.title, 'Chai Pe Charcha'); assert.equal(r.set, 'stall', 'the first scene sets the location'); assert.deepEqual(r.speakers, ['ARJUN', 'MEERA']); assert.equal(r.shots.length, 9); assert.equal(r.truncated, false);
assert.equal(r.shots[0].size, 'WS'); assert.equal(r.shots[0].move, 'reveal'); assert.equal(r.shots[1].move, 'follow', 'a walking action is followed'); assert.equal(r.shots[2].subject, 'A'); assert.equal(r.shots[3].subject, 'B'); assert.equal(r.shots[3].actionB, 'talk'); assert.equal(r.shots[3].actionA, 'listen');
assert.ok(r.shots.every(s => s.duration >= 2 && s.duration <= 10 && s.name.length > 0)); assert.equal(r.shots[8].move, 'push_in', 'the last line of the scene pushes in');
/* plain text without Fountain marks and odd input */
const plain = scriptToShots('INT. CLASSROOM\n\nTEACHER\nGood morning.\n\nSTUDENT\nGood morning, sir.');
assert.equal(plain.set, 'classroom'); assert.equal(plain.shots.length, 3);
assert.equal(scriptToShots('').shots.length, 0); assert.equal(scriptToShots(null).shots.length, 0); assert.equal(scriptToShots('just words').shots.length, 1);
const long = scriptToShots(Array.from({ length: 100 }, (_, i) => `INT. ROOM ${i} - DAY\n\nSomething happens ${i}.\n`).join('\n'));
assert.equal(long.shots.length, 60); assert.equal(long.truncated, true);
console.log('teach ok');
