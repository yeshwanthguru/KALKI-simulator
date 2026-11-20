// Converts the BlazeFace short-range TFLite model into two small files the app can embed:
//   assets_src/face/blazeface.json  the layer list (convolutions, pools, adds ...) with weight offsets
//   assets_src/face/blazeface.bin   all weights as 16-bit floats, in the order the layer list uses them
// Usage: node tools/convert-face-model.mjs <blaze_face_short_range.tflite>
// The model comes from Google MediaPipe (Apache-2.0 per its model card; confirm before shipping, see docs/FRAMING_MODEL_CHECK.md).
import fs from 'node:fs';
import { readModel, OP, OP_NAME } from './tflite.mjs';

const src = process.argv[2];
if (!src) { console.error('usage: node tools/convert-face-model.mjs <blaze_face_short_range.tflite>'); process.exit(1); }
const m = readModel(new Uint8Array(fs.readFileSync(src)));

/* half-float bits of each constant tensor straight from the file; DEQUANTIZE layers only turn those weights into 32-bit floats, so we keep the 16-bit data */
const deq = new Map(); // dequantized tensor id -> source tensor id
for (const o of m.ops) if (o.code === OP.DEQUANTIZE) deq.set(o.outputs[0], o.inputs[0]);
const chunks = []; let offset = 0; const wrec = new Map();
const weight = id => {
  const srcId = deq.get(id); if (srcId === undefined) throw new Error('tensor ' + id + ' is not a dequantized weight');
  if (!wrec.has(srcId)) {
    const t = m.tensors[srcId], buf = m.buffers[t.buffer]; if (t.type !== 1 || !buf) throw new Error('weight ' + srcId + ' is not float16');
    const n = t.shape.reduce((a, b) => a * b, 1); if (buf.length !== n * 2) throw new Error('weight size mismatch ' + srcId);
    chunks.push(Buffer.from(buf)); wrec.set(srcId, { offset, shape: t.shape }); offset += n;
  }
  return wrec.get(srcId);
};

const layers = [], shape = id => m.tensors[id].shape;
for (const o of m.ops) {
  const name = OP_NAME[o.code];
  if (o.code === OP.DEQUANTIZE) continue;
  if (o.code === OP.CONV_2D || o.code === OP.DEPTHWISE_CONV_2D) {
    const dw = o.code === OP.DEPTHWISE_CONV_2D, act = dw ? o.byte(4) : o.byte(3), same = o.byte(0) === 0;
    if (act !== 0) throw new Error('fused activations are not expected here');
    if (dw && o.int(3, 1) !== 1) throw new Error('depth multiplier other than 1');
    layers.push({ op: dw ? 'dw' : 'conv', in: o.inputs[0], out: o.outputs[0], w: weight(o.inputs[1]), b: weight(o.inputs[2]), stride: o.int(1, 1), same, outShape: shape(o.outputs[0]) });
  } else if (o.code === OP.RELU) layers.push({ op: 'relu', in: o.inputs[0], out: o.outputs[0] });
  else if (o.code === OP.ADD) { if (o.byte(0) !== 0) throw new Error('fused add activation'); layers.push({ op: 'add', in: o.inputs[0], in2: o.inputs[1], out: o.outputs[0] }); }
  else if (o.code === OP.MAX_POOL_2D) layers.push({ op: 'maxpool', in: o.inputs[0], out: o.outputs[0], k: o.int(3), stride: o.int(1), same: o.byte(0) === 0 });
  else if (o.code === OP.PAD) {
    const pb = m.buffers[m.tensors[o.inputs[1]].buffer], pv = new DataView(pb.buffer, pb.byteOffset, pb.byteLength), pads = Array.from({ length: 8 }, (_, i) => pv.getInt32(i * 4, true));
    if (pads.slice(0, 6).some(v => v !== 0)) throw new Error('only channel padding is supported'); layers.push({ op: 'padc', in: o.inputs[0], out: o.outputs[0], before: pads[6], after: pads[7] });
  } else if (o.code === OP.RESHAPE) layers.push({ op: 'reshape', in: o.inputs[0], out: o.outputs[0], outShape: shape(o.outputs[0]) });
  else if (o.code === OP.CONCATENATION) layers.push({ op: 'concat', ins: o.inputs, out: o.outputs[0], axis: o.int(0) });
  else throw new Error('unsupported operator ' + name);
}
const spec = { input: m.inputs[0], inputShape: shape(m.inputs[0]), scores: m.outputs.find(i => shape(i)[2] === 1), boxes: m.outputs.find(i => shape(i)[2] === 16), layers };
const bin = Buffer.concat(chunks);
fs.mkdirSync('assets_src/face', { recursive: true });
fs.writeFileSync('assets_src/face/blazeface.json', JSON.stringify(spec));
fs.writeFileSync('assets_src/face/blazeface.bin', bin);
console.log(`${layers.length} layers, ${offset} weights, blazeface.bin ${bin.length} bytes, blazeface.json ${JSON.stringify(spec).length} bytes`);
