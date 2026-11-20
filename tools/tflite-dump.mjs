// Prints the operator list and tensors of a TFLite model. Usage: node tools/tflite-dump.mjs <model.tflite>
import fs from 'node:fs';
import { readModel, OP_NAME, TYPE_NAME } from './tflite.mjs';

const m = readModel(new Uint8Array(fs.readFileSync(process.argv[2])));
const counts = {};
m.ops.forEach(o => { const n = OP_NAME[o.code] || 'OP' + o.code; counts[n] = (counts[n] || 0) + 1; });
console.log('inputs', m.inputs.map(i => `${i}:${m.tensors[i].shape}`), 'outputs', m.outputs.map(i => `${i}:${m.tensors[i].shape}`));
console.log('operators', m.ops.length, counts);
m.ops.forEach((o, i) => {
  const n = OP_NAME[o.code] || 'OP' + o.code, t = k => m.tensors[k], sh = k => `${t(k).shape}`;
  console.log(String(i).padStart(3), n.padEnd(16), 'in', o.inputs.map(k => `${k}[${sh(k)}]${t(k).buffer && m.buffers[t(k).buffer] && m.buffers[t(k).buffer].length ? 'W' + TYPE_NAME[t(k).type][5] : ''}`).join(' '), '-> out', o.outputs.map(k => `${k}[${sh(k)}]`).join(' '), n === 'CONV_2D' || n === 'DEPTHWISE_CONV_2D' ? `pad${o.byte(0)} s${o.int(1)}x${o.int(2)} act${n === 'CONV_2D' ? o.byte(3) : o.byte(4)}` : n === 'ADD' ? `act${o.byte(0)}` : n === 'MAX_POOL_2D' ? `pad${o.byte(0)} s${o.int(1)}x${o.int(2)} f${o.int(3)}x${o.int(4)}` : '');
});
