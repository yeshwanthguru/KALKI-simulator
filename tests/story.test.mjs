// Tests for src/story.js: the story prompt carries the rules the script importer needs, and an answer in that layout becomes shots.
import assert from 'node:assert/strict';
import { storyPrompt, looksLikeScript, STORY_MAX } from '../src/story.js';
import { scriptToShots } from '../src/script.js';

const p = storyPrompt({ story: 'A shy girl meets a boy at a tea stall.', lang: 'ta', seconds: 60, names: ['Meera', 'Arjun'] });
assert.ok(p.includes('A shy girl meets a boy at a tea stall.') && p.includes('Tamil') && p.includes('MEERA') && p.includes('ARJUN') && p.includes('INT. or EXT.'));
assert.ok(p.includes('about 60 seconds') && p.includes('roughly 15 shots') && p.includes('a tea stall') && p.includes('a market'));
assert.ok(storyPrompt({ story: 'x', lang: 'zz' }).includes('English'), 'an unknown language falls back to English');
assert.ok(storyPrompt({ story: 'x', seconds: 9999 }).includes('180 seconds') && storyPrompt({ story: 'x', seconds: 1 }).includes('20 seconds'));
assert.ok(storyPrompt({ story: 'a'.repeat(STORY_MAX + 500) }).length < STORY_MAX + 3000, 'long stories are cut');
assert.ok(storyPrompt({}).includes('write your story here'));

/* an answer in the requested layout is recognised and builds a sensible shot list */
const answer = `Title: The Last Cup

INT. TEA STALL - MORNING

Meera walks in and sits at the counter.

MEERA
Good morning, one tea please.

ARJUN
Coming right up!

Arjun smiles and offers her a cup.

EXT. TERRACE - DUSK

MEERA
Thank you for today.
`;
assert.ok(looksLikeScript(answer) && !looksLikeScript('Once upon a time there was a girl.') && !looksLikeScript(''));
const r = scriptToShots(answer);
assert.equal(r.title, 'The Last Cup'); assert.equal(r.set, 'stall'); assert.deepEqual(r.speakers, ['MEERA', 'ARJUN']);
assert.ok(r.shots.length >= 6 && r.shots.some(s => s.actionA === 'talk') && r.shots.some(s => s.size === 'WS'));
console.log('story ok');
