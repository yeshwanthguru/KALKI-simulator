// Builds assets_src/avatars/thumbs.json (small JPEG data URIs for the cast picker) from the Rocketbox preview images.
// Usage: node tools/make-thumbs.mjs <dir-with-Female_Adult_NN.png/Male_Adult_NN.png>
import fs from 'node:fs';
import sharp from 'sharp';

const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/make-thumbs.mjs <preview-dir>'); process.exit(1); }
const map = { f11: 'Female_Adult_11', m17: 'Male_Adult_17', f07: 'Female_Adult_07', f08: 'Female_Adult_08', m04: 'Male_Adult_04', m05: 'Male_Adult_05', m07: 'Male_Adult_07' };
const out = {};
for (const [id, name] of Object.entries(map)) {
  const file = `${dir}/${name}.png`, trimmed = await sharp(file).trim({ background: '#00000000', threshold: 5 }).toBuffer().catch(() => fs.readFileSync(file));
  const jpg = await sharp(trimmed).resize(84, 150, { fit: 'contain', background: '#20222c' }).flatten({ background: '#20222c' }).jpeg({ quality: 78 }).toBuffer();
  out[id] = 'data:image/jpeg;base64,' + jpg.toString('base64');
}
fs.mkdirSync('assets_src/avatars', { recursive: true });
fs.writeFileSync('assets_src/avatars/thumbs.json', JSON.stringify(out));
console.log('thumbs', Object.keys(out).join(' '), Math.round(JSON.stringify(out).length / 1024) + ' KB');
