// Writes docs/review/translation-review.csv: every interface string in English, Tamil and Hindi, with empty columns for a native-speaker reviewer.
// Usage: node tools/export-translations.mjs
import fs from 'node:fs';
import { LANG_ROWS } from '../src/i18n.js';

const q = v => `"${String(v).replace(/"/g, '""')}"`;
const seen = new Set(), rows = [['No.', 'English', 'Tamil (current)', 'Tamil correction', 'Hindi (current)', 'Hindi correction', 'Notes']];
for (const [en, ta, hi] of LANG_ROWS) { if (seen.has(en)) continue; seen.add(en); rows.push([rows.length, en, ta, '', hi, '', '']); }
fs.mkdirSync('docs/review', { recursive: true });
fs.writeFileSync('docs/review/translation-review.csv', '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n'));
console.log(`wrote docs/review/translation-review.csv (${rows.length - 1} strings)`);
