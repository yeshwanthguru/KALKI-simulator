// Converts PNG screenshots to compact JPEGs for the README.  Usage: node tools/to-jpg.mjs <in.png> <out.jpg> [width] [quality]
import sharp from 'sharp';
const [input, output, width = '1280', quality = '82'] = process.argv.slice(2);
if (!input || !output) { console.error('usage: node tools/to-jpg.mjs <in.png> <out.jpg> [width] [quality]'); process.exit(1); }
const info = await sharp(input).resize({ width: +width, withoutEnlargement: true }).jpeg({ quality: +quality, mozjpeg: true }).toFile(output);
console.log(output, Math.round(info.size / 1024) + ' KB', info.width + 'x' + info.height);
