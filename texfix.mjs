import { NodeIO } from '@gltf-transform/core';
import { prune, dedup } from '@gltf-transform/functions';
import sharp from 'sharp'; import fs from 'fs';
const S = process.argv[2], io = new NodeIO(), TEX = {};
const uri = async (p, q, alpha) => 'data:image/' + (alpha ? 'webp' : 'jpeg') + ';base64,' + (alpha ? await sharp(p).webp({ quality: q, alphaQuality: 90 }).toBuffer() : await sharp(p).flatten().jpeg({ quality: q, mozjpeg: true }).toBuffer()).toString('base64');
const avg = async p => { const { channels } = await sharp(p).stats(); return '#' + channels.slice(0, 3).map(c => Math.round(c.mean).toString(16).padStart(2, '0')).join(''); };
for (const [src, out] of [['Female_Adult_11', 'meera'], ['Male_Adult_17', 'arjun']]) {
  const doc = await io.read(`${S}/conv/${src}.glb`);
  for (const m of doc.getRoot().listMaterials()) {
    const n = m.getName(), base = `${S}/tex/${n}_color.png`, nrm = `${S}/tex/${n}_normal.png`, op = /opacity/.test(n);
    m.setBaseColorTexture(null).setNormalTexture(null).setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(/head/.test(n) ? .55 : .8).setEmissiveFactor([0, 0, 0]);
    if (op) m.setAlphaMode('MASK').setAlphaCutoff(.45).setDoubleSided(true);
    if (fs.existsSync(base)) TEX[n] = { c: await uri(base, 82, op), a: await avg(base), o: op ? 1 : 0, n: fs.existsSync(nrm) ? await uri(nrm, 75, false) : '' };
  }
  await doc.transform(prune({ keepAttributes: true }), dedup());
  fs.writeFileSync(`assets_src/${out}.glb`, await io.writeBinary(doc));
}
fs.writeFileSync('assets_src/tex.json', JSON.stringify(TEX));
console.log(Object.entries(TEX).map(([k, v]) => k + ' ' + v.a + ' ' + Math.round((v.c.length + v.n.length) / 1024) + 'KB').join('\n'));
