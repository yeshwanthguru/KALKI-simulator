import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, resample } from '@gltf-transform/functions';
import sharp from 'sharp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const [src, keep, out] of [['Michelle', [], 'meera'], ['Soldier', ['Idle', 'Walk'], 'arjun']]) {
  const doc = await io.read(`assets_src/${src}.glb`);
  for (const a of doc.getRoot().listAnimations()) if (!keep.includes(a.getName())) a.dispose();
  await doc.transform(resample(), prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }));
  await io.write(`assets_src/${out}.glb`, doc);
}
