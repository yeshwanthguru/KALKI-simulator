// Spike harness for the face detector (src/face.js): checks the network output, times it, and runs it on pictures.
// Usage: node tools/face-spike.mjs <picture.png> [more pictures ...]   (each picture is a frame crop, e.g. from tools/screenshot.mjs)
import fs from 'node:fs';
import sharp from 'sharp';
import { createFaceModel, runNetwork, detectFaces, detectFacesMulti, sizeFromFace, ANCHORS } from '../src/face.js';

const spec = JSON.parse(fs.readFileSync('assets_src/face/blazeface.json', 'utf8')), model = createFaceModel(spec, new Uint8Array(fs.readFileSync('assets_src/face/blazeface.bin')));
let bad = 0, checked = 0; const out = runNetwork(model, new Float32Array(128 * 128 * 3).fill(.1), (L, t) => { if (L.outShape) { checked++; if (L.outShape.slice(1).join() !== t.shape.join() && L.op !== 'reshape') bad++; if (L.op === 'reshape' && t.data.length !== L.outShape.reduce((a, b) => a * b, 1)) bad++; } });
console.log('layer output sizes checked against the original model:', checked, 'mismatches:', bad);
console.log('anchors', ANCHORS.length, 'scores', out.scores.length, 'boxes', out.boxes.length, 'finite', [...out.scores, ...out.boxes].every(Number.isFinite));
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), t = performance.now();
  const faces = detectFacesMulti(model, data, info.width, info.height, .5), ms = Math.round(performance.now() - t);
  console.log(f.split(/[\/]/).pop().padEnd(10), `${info.width}x${info.height}`, ms + ' ms', faces.length ? faces.map(x => `face ${(x.score * 100).toFixed(0)}% h=${(x.box.h / info.height * 100).toFixed(0)}% -> ${sizeFromFace(x.box.h, info.height)}`).join(' | ') : 'no face');
}
