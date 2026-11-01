// Tests for src/face.js (spike): the converted BlazeFace network must reproduce the original layer sizes, give finite output, and find the face in
// Kalki-rendered close and medium shots without finding one in a blank picture. Pictures are CG frames, not real footage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { createFaceModel, runNetwork, detectFacesMulti, sizeFromFace, ANCHORS } from '../src/face.js';

const spec = JSON.parse(fs.readFileSync(new URL('../assets_src/face/blazeface.json', import.meta.url), 'utf8')), bin = fs.readFileSync(new URL('../assets_src/face/blazeface.bin', import.meta.url));
const model = createFaceModel(spec, new Uint8Array(bin));
assert.equal(ANCHORS.length, 896);
let checked = 0; const out = runNetwork(model, new Float32Array(128 * 128 * 3).fill(.2), (L, t) => { if (L.outShape && L.op !== 'reshape') { checked++; assert.equal(t.shape.join(), L.outShape.slice(1).join(), 'layer output size'); } });
assert.ok(checked > 30 && out.scores.length === 896 && out.boxes.length === 896 * 16 && [...out.scores, ...out.boxes].every(Number.isFinite));
const load = async n => { const { data, info } = await sharp(new URL(`./fixtures/face-${n}.jpg`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
for (const [name, size] of [['CU', 'CU'], ['MS', 'MS']]) {
  const im = await load(name), faces = detectFacesMulti(model, im.data, im.w, im.h);
  assert.ok(faces.length >= 1 && faces[0].score > .8, name + ': a face is found'); assert.equal(sizeFromFace(faces[0].box.h, im.h), size, name + ': size class');
}
const blank = await load('blank'); assert.equal(detectFacesMulti(model, blank.data, blank.w, blank.h).length, 0, 'no face in a blank picture');
assert.equal(sizeFromFace(.7, 1), 'ECU'); assert.equal(sizeFromFace(.005, 1), 'EWS');
console.log('face ok: ' + checked + ' layer sizes match, faces found in CG close and medium shots');
