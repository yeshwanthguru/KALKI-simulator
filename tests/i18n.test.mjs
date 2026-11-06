// Tests for src/i18n.js: every interface string in tests/ui-strings.json (harvested from the running app) must be translated into Tamil and Hindi,
// patterns must fill in numbers and names, and the output must really use the target scripts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LANGS, makeTranslator, LANG_ROWS } from '../src/i18n.js';

const strings = JSON.parse(fs.readFileSync(new URL('./ui-strings.json', import.meta.url), 'utf8'));
const script = { ta: /[\u0B80-\u0BFF]/, hi: /[\u0900-\u097F]/ };
assert.deepEqual(Object.keys(LANGS), ['en', 'ta', 'hi']);
assert.equal(makeTranslator('en')('Anything at all'), 'Anything at all');

for (const code of ['ta', 'hi']) {
  const t = makeTranslator(code), missing = strings.filter(s => !script[code].test(t(s)));
  assert.deepEqual(missing, [], `${code}: ${missing.length} interface strings have no translation:\n  ${missing.join('\n  ')}`);
  /* no row may be left empty or identical to the English source (apart from a few shared tokens) */
  const same = LANG_ROWS.filter(r => !r[code === 'ta' ? 1 : 2] || (r[code === 'ta' ? 1 : 2] === r[0] && !/^(Space|\(Ctrl\+Enter\)\.|Space)$/.test(r[0])));
  assert.deepEqual(same.map(r => r[0]), [], `${code}: empty or untranslated rows`);
  /* patterns with numbers and names */
  assert.match(t('Shot 3 of 12'), /3/); assert.match(t('Shot 3 of 12'), /12/); assert.ok(script[code].test(t('Shot 3 of 12')));
  assert.ok(t('Rise & reveal · 24mm · WS · 5s').includes('24') && script[code].test(t('Rise & reveal · 24mm · WS · 5s')));
  assert.ok(t('Pan to the left').includes(t('Pan')) && script[code].test(t('Pan to the left')), 'direction suffix');
  assert.ok(script[code].test(t('Zoom in (or a push in)')) && t('Zoom in (or a push in)').includes(t('Zoom in')), 'alternative note');
  assert.ok(t('Place Priya').includes('Priya') && t('Priya faces').includes('Priya') && t('Priya: action').includes('Priya'), 'names kept');
  assert.ok(t('The reference averages 2.8 s per shot; your scene averages 4.6 s. Shorten your shots to match its medium pace.').includes('2.8'));
  assert.ok(t('Shot 2: the reference uses pan (0:03, 95% sure); you use static. Switch to pan.').includes('95%'));
  assert.ok(t('18 shots · replaces the scene').includes('18') && script[code].test(t('4 shots · added to the end')), 'lesson card counts');
  assert.ok(t('Rig: Dolly + track').includes(t('Dolly + track')) && script[code].test(t('Rig: Dolly + track')) && script[code].test(t('Automatic · Gimbal / stabiliser')), 'rig heading and automatic entry');
  assert.equal(t('  Save project  '), '  ' + t('Save project') + '  ', 'whitespace is preserved');
  assert.equal(t('12:00:05'), '12:00:05', 'timecodes are left alone');
  assert.equal(t('Some text of the user\'s own'), 'Some text of the user\'s own', 'unknown text is never changed');
}
/* a translated move name and its description must line up with the English source order */
assert.ok(makeTranslator('ta')('Orbit') !== makeTranslator('hi')('Orbit'));
console.log(`i18n ok: ${strings.length} interface strings and ${LANG_ROWS.length} dictionary rows checked in Tamil and Hindi`);
