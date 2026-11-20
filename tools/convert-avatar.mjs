// Converts a Microsoft Rocketbox adult avatar (FBX + TGA textures, MIT licence) into the compact assets the app uses:
//   assets_src/avatars/<id>.glb  (skinned mesh, metres, quantised, no embedded textures)
//   an entry in assets_src/avatars/avatars.json with the textures as small data URIs
// Usage: node tools/convert-avatar.mjs <avatar-dir> <id> <gender f|m> <display name>
//   <avatar-dir> holds <Name>.fbx and the *_body_color.tga, *_head_color.tga, *_opacity_color.tga files.
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { prune, quantize } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import * as THREE from 'three';
THREE.TextureLoader.prototype.load = function () { return new THREE.Texture(); }; // textures are handled separately
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');

const [dir, id, gender, label] = process.argv.slice(2);
if (!label) { console.error('usage: node tools/convert-avatar.mjs <avatar-dir> <id> <f|m> <display name>'); process.exit(1); }
const fbxFile = fs.readdirSync(dir).find(f => f.endsWith('.fbx')), SCALE = 0.01; // Rocketbox files are in centimetres

/* ---------- TGA reader (uncompressed 24 / 32 bit true colour, the format Rocketbox ships) ---------- */
function readTga(file) {
  const b = fs.readFileSync(file), idLen = b[0], type = b[2], w = b.readUInt16LE(12), h = b.readUInt16LE(14), bpp = b[16], desc = b[17], bytes = bpp >> 3;
  if (type !== 2 || (bpp !== 24 && bpp !== 32)) throw new Error(`${file}: unsupported TGA (type ${type}, ${bpp} bit)`);
  const out = Buffer.alloc(w * h * 4), off = 18 + idLen, topFirst = !!(desc & 0x20);
  for (let y = 0; y < h; y++) {
    const sy = topFirst ? y : h - 1 - y;
    for (let x = 0; x < w; x++) { const s = off + (sy * w + x) * bytes, d = (y * w + x) * 4; out[d] = b[s + 2]; out[d + 1] = b[s + 1]; out[d + 2] = b[s]; out[d + 3] = bytes === 4 ? b[s + 3] : 255; }
  }
  return { data: out, w, h };
}

/* ---------- mesh: weld the unindexed FBX triangles per material and build a glTF document ---------- */
const buf = fs.readFileSync(path.join(dir, fbxFile)), root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
let skinned = null; root.traverse(o => { if (o.isSkinnedMesh) skinned = o; });
if (!skinned) throw new Error('no skinned mesh in ' + fbxFile);
root.updateMatrixWorld(true); skinned.updateMatrixWorld(true);
const MW = skinned.matrixWorld, NM = new THREE.Matrix3().getNormalMatrix(MW), tmp = new THREE.Vector3(); // the FBX stores the body rotated: bake the mesh transform into the vertices
const geo = skinned.geometry, mats = Array.isArray(skinned.material) ? skinned.material : [skinned.material];
const P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;

const doc = new Document(), buffer = doc.createBuffer(), scene = doc.createScene();
const boneNodes = new Map();
const bones = skinned.skeleton.bones;
bones.forEach(b => { const n = doc.createNode(b.name).setTranslation(b.position.toArray().map(v => v * SCALE)).setRotation(b.quaternion.toArray()).setScale(b.scale.toArray()); boneNodes.set(b, n); });
/* parents of the skeleton that are not joints themselves (Bip01 carries the standing height and is driven by the animations) */
const nodeFor = o => { if (boneNodes.has(o)) return boneNodes.get(o); const n = doc.createNode(o.name).setTranslation(o.position.toArray().map(v => v * SCALE)).setRotation(o.quaternion.toArray()).setScale(o.scale.toArray()); boneNodes.set(o, n); if (o.parent && o.parent.isBone) nodeFor(o.parent).addChild(n); return n; };
bones.forEach(b => { if (b.parent && b.parent.isBone) nodeFor(b.parent).addChild(boneNodes.get(b)); });
const rootBones = [...boneNodes.keys()].filter(b => !(b.parent && boneNodes.has(b.parent)));
rootBones.forEach(b => scene.addChild(boneNodes.get(b)));
const ibm = new Float32Array(bones.length * 16);
bones.forEach((b, i) => { const w = b.matrixWorld.clone(); w.elements[12] *= SCALE; w.elements[13] *= SCALE; w.elements[14] *= SCALE; ibm.set(w.invert().elements, i * 16); }); // bind pose: world matrix of each bone in metres, inverted
const skin = doc.createSkin('skin').setInverseBindMatrices(doc.createAccessor('ibm').setArray(ibm).setType('MAT4').setBuffer(buffer));
bones.forEach(b => skin.addJoint(boneNodes.get(b)));
if (rootBones[0]) skin.setSkeleton(boneNodes.get(rootBones[0]));

const mesh = doc.createMesh('avatar'), materialNames = [];
const groups = geo.groups.length ? geo.groups : [{ start: 0, count: (geo.index ? geo.index.count : P.count), materialIndex: 0 }];
for (const mi of [...new Set(groups.map(g => g.materialIndex))]) {
  const key = new Map(), pos = [], nor = [], uv = [], ji = [], jw = [], idx = [];
  for (const g of groups.filter(g => g.materialIndex === mi)) for (let t = g.start; t < g.start + g.count; t++) {
    const v = geo.index ? geo.index.getX(t) : t;
    const k = [P.getX(v), P.getY(v), P.getZ(v), N.getX(v), N.getY(v), N.getZ(v), UV.getX(v), UV.getY(v), SI.getX(v), SI.getY(v), SI.getZ(v), SI.getW(v), SW.getX(v), SW.getY(v), SW.getZ(v), SW.getW(v)].map(x => Math.round(x * 1e4)).join(',');
    let j = key.get(k);
    if (j === undefined) {
      j = pos.length / 3; key.set(k, j);
      tmp.set(P.getX(v), P.getY(v), P.getZ(v)).applyMatrix4(MW).multiplyScalar(SCALE); pos.push(tmp.x, tmp.y, tmp.z);
      tmp.set(N.getX(v), N.getY(v), N.getZ(v)).applyMatrix3(NM).normalize(); nor.push(tmp.x, tmp.y, tmp.z); uv.push(UV.getX(v), 1 - UV.getY(v)); // glTF has the texture origin at the top
      ji.push(SI.getX(v), SI.getY(v), SI.getZ(v), SI.getW(v));
      const w = [SW.getX(v), SW.getY(v), SW.getZ(v), SW.getW(v)], s = w[0] + w[1] + w[2] + w[3] || 1; jw.push(...w.map(x => x / s));
    }
    idx.push(j);
  }
  const acc = (name, arr, type, Cls) => doc.createAccessor(name).setArray(Cls.from(arr)).setType(type).setBuffer(buffer);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', acc('pos', pos, 'VEC3', Float32Array)).setAttribute('NORMAL', acc('nor', nor, 'VEC3', Float32Array)).setAttribute('TEXCOORD_0', acc('uv', uv, 'VEC2', Float32Array))
    .setAttribute('JOINTS_0', acc('j', ji, 'VEC4', Uint16Array)).setAttribute('WEIGHTS_0', acc('w', jw, 'VEC4', Float32Array))
    .setIndices(acc('idx', idx, 'SCALAR', Uint32Array));
  const name = mats[mi].name || `${id}_mat${mi}`; materialNames.push(name);
  const opacity = /opacity/.test(name), m = doc.createMaterial(name).setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(/head/.test(name) ? .55 : .8).setEmissiveFactor([0, 0, 0]);
  if (opacity) m.setAlphaMode('MASK').setAlphaCutoff(.45).setDoubleSided(true);
  prim.setMaterial(m); mesh.addPrimitive(prim);
}
const meshNode = doc.createNode('avatar').setMesh(mesh).setSkin(skin); scene.addChild(meshNode);

await doc.transform(prune({ keepAttributes: true }), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 14, quantizeWeight: 8, quantizeColor: 8, quantizeGeneric: 12 }));
doc.createExtension(KHRMeshQuantization).setRequired(true);
const io = new NodeIO().registerExtensions([KHRMeshQuantization]), glb = await io.writeBinary(doc);
fs.mkdirSync('assets_src/avatars', { recursive: true });
fs.writeFileSync(`assets_src/avatars/${id}.glb`, glb);

/* ---------- textures as data URIs ---------- */
const tex = {};
for (const name of materialNames) {
  const file = fs.readdirSync(dir).find(f => f.toLowerCase() === `${name}_color.tga`.toLowerCase()); if (!file) { console.warn('no texture for', name); continue; }
  const { data, w, h } = readTga(path.join(dir, file)), opacity = /opacity/.test(name), head = /head/.test(name), size = head ? 1024 : 512;
  const img = sharp(data, { raw: { width: w, height: h, channels: 4 } }).resize(size, size);
  const uri = opacity ? 'data:image/webp;base64,' + (await img.webp({ quality: 80, alphaQuality: 90 }).toBuffer()).toString('base64')
    : 'data:image/jpeg;base64,' + (await img.flatten({ background: '#808080' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()).toString('base64');
  const { channels } = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).resize(64, 64).removeAlpha().stats();
  tex[name] = { c: uri, a: '#' + channels.slice(0, 3).map(c => Math.round(c.mean).toString(16).padStart(2, '0')).join(''), o: opacity ? 1 : 0, n: '' };
}
const jsonPath = 'assets_src/avatars/avatars.json', all = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : {};
all[id] = { g: gender, name: label, tex };
fs.writeFileSync(jsonPath, JSON.stringify(all));
console.log(`${id}: glb ${Math.round(glb.length / 1024)} KB, textures ${Math.round(Object.values(tex).reduce((a, t) => a + t.c.length, 0) / 1024)} KB, materials ${materialNames.join(', ')}, joints ${bones.length}`);
