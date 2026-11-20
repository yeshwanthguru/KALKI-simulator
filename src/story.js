/* Story Studio, step 1: turns a plain story into a prompt for any chat assistant. The assistant answers with a short screenplay in the layout that Kalki's script
   importer understands (scene headings, ALL-CAPS speaker names, short action lines). Nothing here talks to a network; the person copies the prompt out and pastes the answer back. */

export const STORY_LANGS = { en: 'English', ta: 'Tamil', hi: 'Hindi' };
export const STORY_SETS = [['stall', 'a tea stall'], ['street', 'a street'], ['terrace', 'a terrace'], ['living', 'a living room'], ['classroom', 'a classroom'], ['platform', 'a railway platform'], ['temple', 'a temple'], ['office', 'an office'], ['bus', 'a bus'], ['market', 'a market']];
export const STORY_MAX = 4000;

/* opts: { story, lang: 'en'|'ta'|'hi', seconds: 30..180, names: ['Meera','Arjun'] } -> prompt text */
export function storyPrompt(opts = {}) {
  const story = String(opts.story || '').replace(/\r/g, '').trim().slice(0, STORY_MAX);
  const lang = STORY_LANGS[opts.lang] ? opts.lang : 'en', language = STORY_LANGS[lang];
  const seconds = Math.min(180, Math.max(20, Math.round(+opts.seconds || 60))), shots = Math.max(4, Math.round(seconds / 4));
  const names = (opts.names && opts.names.length ? opts.names : ['Meera', 'Arjun']).slice(0, 2).map(s => String(s).toUpperCase());
  const places = STORY_SETS.map(s => s[1]).join(', ');
  return [
    'You are a screenwriter. Turn the story below into a short screenplay for a 3D animated film of about ' + seconds + ' seconds (roughly ' + shots + ' shots).',
    '',
    'Output rules (follow them exactly, and output only the screenplay, with no commentary and no code fences):',
    '1. Use screenplay layout with a blank line between blocks.',
    '2. Start each scene with a heading: INT. or EXT., a place, a dash and the time of day, for example "INT. TEA STALL - MORNING". Choose places only from this list: ' + places + '. Use 1 to 3 scenes.',
    '3. Only two characters can speak or act in a scene. Call them ' + names[0] + ' and ' + names[1] + '. Write a speaker name in ALL CAPS on its own line, with the spoken words on the next line.',
    '4. Write dialogue in ' + language + (lang === 'en' ? '' : ' (script letters, not transliteration)') + '. Keep every spoken line under 20 words. Write headings and speaker names in English capitals.',
    '5. Action lines are one short sentence in English describing what can be seen. Use simple verbs that an animation can show: walks in, sits, stands, waves, nods, drinks tea, eats, talks on the phone, shrugs, looks at, offers something.',
    '6. Show feelings through what people say and do (smiles, looks sad, looks surprised, looks angry) because the animation reads those words.',
    '7. Do not use a real person, a film character, a brand or a song as a character, and invent the story\'s names and details rather than copying any existing film.',
    '8. Begin with the title on the first line in the form "Title: <title>".',
    '',
    'Story:',
    story || '(write your story here)',
  ].join('\n');
}

/* a quick check of what a pasted answer looks like, so the person gets a clear message instead of an empty import */
export function looksLikeScript(text) {
  const t = String(text || '');
  return /^(INT|EXT|INT\.?\/EXT|EXT\.?\/INT|I\/E)[. ]/im.test(t) && /^[A-Z][A-Z .'-]{1,30}$/m.test(t);
}
