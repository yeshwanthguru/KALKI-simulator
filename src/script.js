/* Script import: reads Fountain or plain screenplay text and builds a shot-list skeleton to refine in Kalki.
   Rules: a scene heading (INT./EXT.) becomes an establishing wide shot, each action paragraph a medium shot, and each line of dialogue a shot on the speaker
   (the first two speakers become actors A and B, shown over the shoulder). It is a starting point, not a coverage plan. */

const HEADING = /^(\.(?=[A-Za-z0-9])|(INT|EXT|EST|INT\.?\/EXT|EXT\.?\/INT|I\/E)[. ])/i;
const TRANSITION = /^(>|[A-Z ]+TO:$)/;
const SET_WORDS = [['bus', /\bBUS\b|BUS STAND|BUS STOP|COACH/i], ['market', /MARKET|BAZAAR|BAZAR|SANTHAI|MANDI|VEGETABLE/i], ['temple', /TEMPLE|KOIL|MANDIR|SHRINE|GOPURAM|PRAKARAM/i], ['office', /OFFICE|BANK|COMPANY|WORKPLACE|CUBICLE|MEETING ROOM/i], ['platform', /STATION|PLATFORM|TRAIN|RAILWAY|\bRAIL\b/i], ['classroom', /CLASS|SCHOOL|COLLEGE|LECTURE/i], ['terrace', /TERRACE|ROOF|ROOFTOP/i], ['stall', /CHAI|\bTEA\b|STALL|CAFE|CAFÉ|CANTEEN/i], ['street', /STREET|LANE|ROAD|VILLAGE/i], ['living', /LIVING|HOUSE|HOME|ROOM|KITCHEN|BEDROOM|FLAT|APARTMENT/i]];
const WALK = /\b(walks?|enters?|runs?|crosses|strolls?|steps? in|arrives?|leaves?|exits?)\b/i;
const words = s => (String(s).trim().match(/\S+/g) || []).length;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const short = (s, n) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
const title = s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

/* splits the text into blocks: { type: 'heading' | 'action' | 'cue' | 'paren' | 'dialogue' | 'transition', text, name? } */
export function parseScript(src) {
  const lines = String(src || '').replace(/\r/g, '').replace(/^﻿/, '').split('\n'), out = []; let meta = {};
  let i = 0;
  while (i < lines.length && /^[A-Za-z ]{2,20}:\s*.*$/.test(lines[i]) && /^(title|credit|author|authors|source|draft date|contact)\s*:/i.test(lines[i])) { const m = /^([A-Za-z ]+):\s*(.*)$/.exec(lines[i]); meta[m[1].toLowerCase()] = m[2].trim(); i++; while (i < lines.length && /^\s+\S/.test(lines[i])) i++; }
  for (; i < lines.length; i++) {
    const raw = lines[i], t = raw.trim(); if (!t) continue;
    const prevBlank = i === 0 || !lines[i - 1].trim(), nextOk = i + 1 < lines.length && lines[i + 1].trim();
    if (/^\/\*|^\[\[/.test(t)) continue;
    if (HEADING.test(t) && prevBlank) { out.push({ type: 'heading', text: t.replace(/^\./, '').replace(/\s*#.*#\s*$/, '') }); continue; }
    if (TRANSITION.test(t) && prevBlank) { out.push({ type: 'transition', text: t }); continue; }
    const cue = /^@?([^a-z()]+?)(\s*\([^)]*\))?\^?$/.exec(t);
    if (prevBlank && nextOk && cue && /[A-Z]/.test(cue[1]) && cue[1].length <= 40 && !HEADING.test(t) && !/[.!?]$/.test(cue[1].trim()) || (prevBlank && nextOk && t.startsWith('@'))) { out.push({ type: 'cue', name: t.replace(/^@/, '').replace(/\s*\([^)]*\)\s*\^?$/, '').trim(), text: t }); let j = i + 1; while (j < lines.length && lines[j].trim()) { const d = lines[j].trim(); out.push(/^\(.*\)$/.test(d) ? { type: 'paren', text: d } : { type: 'dialogue', text: d }); j++; } i = j - 1; continue; }
    let j = i, para = []; while (j < lines.length && lines[j].trim() && !(j > i && HEADING.test(lines[j].trim()) && false)) { para.push(lines[j].trim()); j++; }
    out.push({ type: 'action', text: para.join(' ') }); i = j - 1;
  }
  return { meta, blocks: out };
}

/* -> { title, set, shots: [shot fields], speakers: [names], truncated } ; shot fields use Kalki's own names */
export function scriptToShots(src, opts = {}) {
  const { meta, blocks } = parseScript(src), max = opts.max || 60, shots = [], speakers = [], setVotes = {};
  const slot = n => { const k = n.toUpperCase(); if (!speakers.includes(k)) speakers.push(k); const i = speakers.indexOf(k); return i === 0 ? 'A' : i === 1 ? 'B' : 'both'; };
  let first = true, exchange = 0, lastSpeaker = '';
  const push = s => { if (shots.length < max) shots.push({ move: 'static', size: 'MS', lens: 50, subject: 'both', angle: 0, duration: 4, actionA: 'stand', actionB: 'stand', notes: '', ...s }); };
  for (let b = 0; b < blocks.length; b++) {
    const k = blocks[b];
    if (k.type === 'heading') {
      for (const [id, re] of SET_WORDS) if (re.test(k.text)) { setVotes[id] = (setVotes[id] || 0) + 1; break; }
      push({ name: `Establish: ${short(title(k.text.replace(/^(INT|EXT)[./ ]*/i, '')), 28)}`, move: first ? 'reveal' : 'static', size: 'WS', lens: 24, subject: 'both', duration: 4, notes: k.text }); first = false; exchange = 0; lastSpeaker = '';
    } else if (k.type === 'action') {
      const w = WALK.test(k.text);
      push({ name: short(k.text, 26), move: w ? 'follow' : 'static', size: w ? 'FS' : 'MS', lens: w ? 35 : 35, subject: w ? 'B' : 'both', angle: w ? 80 : 0, actionB: w ? 'walk' : 'stand', duration: clamp(Math.round(words(k.text) / 3 * 2) / 2, 2.5, 8), notes: short(k.text, 200) });
    } else if (k.type === 'cue') {
      let line = [], j = b + 1; while (j < blocks.length && (blocks[j].type === 'dialogue' || blocks[j].type === 'paren')) { if (blocks[j].type === 'dialogue') line.push(blocks[j].text); j++; }
      const who = slot(k.name), speech = line.join(' '), other = who === 'A' ? 'B' : 'A';
      if (k.name.toUpperCase() !== lastSpeaker) exchange++; lastSpeaker = k.name.toUpperCase();
      const nextIsEnd = !blocks.slice(j).some(x => x.type === 'cue') || (blocks[j] && blocks[j].type === 'heading');
      const intense = /[!?]\s*$/.test(speech) && exchange > 1;
      push({ name: `${title(k.name)}: ${short(speech, 18)}`, move: nextIsEnd && who !== 'both' ? 'push_in' : 'static', size: intense || nextIsEnd ? 'MCU' : 'MS', lens: 50, subject: who, angle: who === 'A' ? 25 : who === 'B' ? -25 : 0, amount: nextIsEnd ? .4 : .6,
        actionA: who === 'A' ? 'talk' : who === 'B' ? 'listen' : 'stand', actionB: who === 'B' ? 'talk' : who === 'A' ? 'listen' : 'stand', duration: clamp(Math.round(words(speech) / 2.5 * 2) / 2, 2, 10), notes: short(`${k.name}: ${speech}`, 200) });
      b = j - 1;
    }
  }
  const set = Object.entries(setVotes).sort((p, q) => q[1] - p[1])[0];
  return { title: short(meta.title || '', 60), set: set ? set[0] : '', shots, speakers, truncated: blocks.filter(x => x.type === 'heading' || x.type === 'action' || x.type === 'cue').length > shots.length };
}
