// Tests for src/audio.js: which recordings start when playback begins, and how long a shot must be to hold its recording.
import assert from 'node:assert/strict';
import { planClips, fitDuration } from '../src/audio.js';

const items = [{ at: 0, dur: 3, id: 'a1x' }, { at: 4, dur: 0, id: '' }, { at: 5, dur: 2, id: 'b2y' }, { at: 9, dur: 4, id: 'c3z' }];
/* from the start: every recording is still to come, the first without delay */
assert.deepEqual(planClips(items, 0), [{ id: 'a1x', delay: 0, offset: 0 }, { id: 'b2y', delay: 5, offset: 0 }, { id: 'c3z', delay: 9, offset: 0 }]);
/* in the middle of a recording: it starts at once, part of the way in; finished ones are skipped */
assert.deepEqual(planClips(items, 1.5), [{ id: 'a1x', delay: 0, offset: 1.5 }, { id: 'b2y', delay: 3.5, offset: 0 }, { id: 'c3z', delay: 7.5, offset: 0 }]);
assert.deepEqual(planClips(items, 7.5), [{ id: 'c3z', delay: 1.5, offset: 0 }]);
assert.deepEqual(planClips(items, 13), []);
assert.deepEqual(planClips([], 0), []); assert.deepEqual(planClips([null, { at: 0, dur: 2, id: 'x' }, { at: 0, dur: -1, id: 'y1z' }], 0), [{ id: 'x', delay: 0, offset: 0 }]);

/* a shot grows to hold its recording plus a short pause, in half seconds, never shrinks, never beyond 20 s */
assert.equal(fitDuration(4, 2), 4); assert.equal(fitDuration(2, 3.4), 4); assert.equal(fitDuration(2, 2.1), 2.5); assert.equal(fitDuration(5, 30), 20);
console.log('audio ok');
