/* minimal GLB reader: json + accessors as typed arrays (no dependencies) */
import fs from 'node:fs';
export function readGlb(file) {
  var b = fs.readFileSync(file); var jl = b.readUInt32LE(12); var json = JSON.parse(b.slice(20, 20 + jl).toString('utf8')); var bl = b.readUInt32LE(20 + jl); var bin = b.slice(28 + jl, 28 + jl + bl);
  var CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }; var NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  function acc(i) { var a = json.accessors[i]; var bv = json.bufferViews[a.bufferView]; var off = (bv.byteOffset || 0) + (a.byteOffset || 0); var T = CT[a.componentType]; var n = NC[a.type]; if (bv.byteStride && bv.byteStride !== n * T.BYTES_PER_ELEMENT) throw new Error('strided accessor'); return { data: new T(bin.buffer, bin.byteOffset + off, a.count * n), n: n, count: a.count }; }
  return { json: json, bin: bin, acc: acc };
}
