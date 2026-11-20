// Minimal TFLite flatbuffer reader, used only by the face-detector tools (tools/tflite-dump.mjs, tools/convert-face-model.mjs).
// It reads the model graph (operators, tensors, buffers) without any dependency. Field numbers follow the public TensorFlow Lite schema.
export function readModel(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u8 = o => dv.getUint8(o), i8 = o => dv.getInt8(o), u16 = o => dv.getUint16(o, true), i32 = o => dv.getInt32(o, true), u32 = o => dv.getUint32(o, true), f32 = o => dv.getFloat32(o, true);
  const root = u32(0);
  /* a table is read through its vtable: field(i) gives the absolute offset of field i, or 0 when absent */
  const table = pos => { const vt = pos - i32(pos), vsz = u16(vt); return { pos, field: i => (4 + 2 * i < vsz && u16(vt + 4 + 2 * i) ? pos + u16(vt + 4 + 2 * i) : 0) }; };
  const indirect = o => o + u32(o);
  const vec = o => { const p = indirect(o); return { n: u32(p), at: k => p + 4 + k }; };
  const str = o => { if (!o) return ''; const p = indirect(o), n = u32(p); return new TextDecoder().decode(bytes.subarray(p + 4, p + 4 + n)); };
  const intVec = (t, i) => { const o = t.field(i); if (!o) return []; const v = vec(o); return Array.from({ length: v.n }, (_, k) => i32(v.at(k * 4))); };
  const tables = (t, i) => { const o = t.field(i); if (!o) return []; const v = vec(o); return Array.from({ length: v.n }, (_, k) => table(indirect(v.at(k * 4)))); };
  const m = table(indirect(0 * root + 0)); // placeholder replaced below
  const mt = table(root);
  const codes = tables(mt, 1).map(t => ({ builtin: Math.max(t.field(0) ? i8(t.field(0)) : 0, t.field(3) ? i32(t.field(3)) : 0), custom: str(t.field(1)) }));
  const buffers = tables(mt, 4).map(t => { const o = t.field(0); if (!o) return null; const v = vec(o); const p = v.at(0); return bytes.subarray(p, p + v.n); });
  const sg = tables(mt, 2)[0];
  const tensors = tables(sg, 0).map(t => ({ shape: intVec(t, 0), type: t.field(1) ? i8(t.field(1)) : 0, buffer: t.field(2) ? u32(t.field(2)) : 0, name: str(t.field(3)) }));
  const ops = tables(sg, 3).map(t => {
    const optType = t.field(3) ? u8(t.field(3)) : 0, optPos = t.field(4) ? table(indirect(t.field(4))) : null;
    const byte = (i, d = 0) => optPos && optPos.field(i) ? i8(optPos.field(i)) : d, int = (i, d = 0) => optPos && optPos.field(i) ? i32(optPos.field(i)) : d;
    return { code: codes[t.field(0) ? u32(t.field(0)) : 0].builtin, inputs: intVec(t, 1), outputs: intVec(t, 2), optType, byte, int, vec: i => (optPos ? intVec(optPos, i) : []) };
  });
  return { codes, buffers, tensors, ops, inputs: intVec(sg, 1), outputs: intVec(sg, 2), f32 };
}

export const OP = { ADD: 0, AVERAGE_POOL_2D: 1, CONCATENATION: 2, CONV_2D: 3, DEPTHWISE_CONV_2D: 4, DEQUANTIZE: 6, FULLY_CONNECTED: 9, LOGISTIC: 14, MAX_POOL_2D: 17, MUL: 18, RELU: 19, RELU6: 21, RESHAPE: 22, PAD: 34, PRELU: 54, SUB: 41 };
export const OP_NAME = Object.fromEntries(Object.entries(OP).map(([k, v]) => [v, k]));
export const TYPE_NAME = ['FLOAT32', 'FLOAT16', 'INT32', 'UINT8', 'INT64', 'STRING', 'BOOL', 'INT16'];
