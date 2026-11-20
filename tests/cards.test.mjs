// Tests for src/cards.js and the card fields of the document details.
import assert from 'node:assert/strict';
import { cardContent, cardsOn, CARD_SECONDS } from '../src/cards.js';
import { normInfo } from '../src/docinfo.js';

const c = cardContent({ director: 'Meera K', production: 'Kalki Films', credits: 'Story and voices by the class' }, '  The Last   Cup ', '17/11/2026');
assert.equal(c.title.head, 'The Last Cup'); assert.equal(c.title.sub, 'Directed by Meera K');
assert.deepEqual(c.end.lines, ['Story and voices by the class', 'Directed by Meera K', 'Kalki Films', '17/11/2026']); assert.equal(c.end.head, 'The End');
assert.equal(cardContent({ tagline: 'A short film', director: 'X' }, 'T').title.sub, 'A short film', 'a tagline wins over the director line');
assert.deepEqual(cardContent({}, '').title, { head: 'Untitled', sub: '' }); assert.deepEqual(cardContent(null, 'T').end.lines, []);
assert.deepEqual(cardContent({ director: 'A', credits: 'Directed by A' }, 'T').end.lines, ['Directed by A'], 'no repeated director line');
assert.ok(CARD_SECONDS >= 2 && CARD_SECONDS <= 5);

/* the card settings travel with the document details */
const i = normInfo({ cards: true, tagline: ' a  b ' + 'x'.repeat(100), credits: 'y'.repeat(300) });
assert.equal(i.cards, true); assert.equal(i.tagline.length, 60); assert.equal(i.credits.length, 120); assert.equal(cardsOn(i), true);
assert.equal(normInfo({ cards: 'yes' }).cards, false); assert.equal(normInfo({}).cards, false); assert.equal(cardsOn(normInfo({})), false);
console.log('cards ok');
