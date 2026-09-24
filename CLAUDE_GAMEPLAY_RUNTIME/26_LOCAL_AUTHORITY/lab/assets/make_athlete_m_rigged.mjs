/* MAHWORLD :: DERIVATIVE AUTO-RIG for the Athlete_M development preview (owner-authorized isolated rigging work, 2026-09-15).
   Reads RAW_10_MODELS/Mah_Athlete_M.glb READ-ONLY (single rigid Tripo mesh, authentic base-colour + normal textures) and writes an
   isolated derivative GLB that keeps the ORIGINAL geometry and materials (textures embedded as in the source) and adds:
     - a derivative skeleton (ROOT · PELVIS · SPINE · CHEST · NECK · HEAD · CLAV/UPPERARM/FOREARM/HAND L+R · TAIL1..3 for the fused lower body),
       joint positions measured from the mesh cross-sections (see the profile in the report),
     - bind pose = the source rest pose, inverse bind matrices,
     - smooth skin weights (JOINTS_0 / WEIGHTS_0, up to 4 influences) from distance-to-bone with region constraints.
   No separated-leg geometry, PACKED morph, eye or lid geometry exists in the source: the rig cannot invent them (reported as missing).
   Never modifies the source, WORKING masters, Astra folders or .blend files.
       node 26_LOCAL_AUTHORITY/lab/assets/make_athlete_m_rigged.mjs   (from CLAUDE_GAMEPLAY_RUNTIME) */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var ROOT = path.resolve(HERE, '../../..', '..');
var SRC = path.join(ROOT, 'RAW_10_MODELS', 'Mah_Athlete_M.glb'); var OUT_DIR = path.join(HERE, 'athlete_m_preview', 'dev_0.2'); fs.mkdirSync(OUT_DIR, { recursive: true });
var buf = fs.readFileSync(SRC); var srcSha = crypto.createHash('sha256').update(buf).digest('hex');
var jsonLen = buf.readUInt32LE(12); var json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8')); var binOff = 20 + jsonLen + 8; var bin = buf.slice(binOff, binOff + buf.readUInt32LE(20 + jsonLen));
var prim = json.meshes[0].primitives[0]; var posAcc = json.accessors[prim.attributes.POSITION]; var pv = json.bufferViews[posAcc.bufferView]; var pOff = (pv.byteOffset || 0) + (posAcc.byteOffset || 0); var P = new Float32Array(bin.buffer, bin.byteOffset + pOff, posAcc.count * 3);
var H = posAcc.max[1] - posAcc.min[1]; var N = posAcc.count;
/* ---- skeleton (metres of the source: height H ≈ 0.9865) ---- */
var J = [
  { name: 'ROOT', parent: -1, p: [0, 0, 0] },
  { name: 'PELVIS', parent: 0, p: [0, 0.42 * H, 0] },
  { name: 'SPINE', parent: 1, p: [0, 0.52 * H, 0] },
  { name: 'CHEST', parent: 2, p: [0, 0.64 * H, 0] },
  { name: 'NECK', parent: 3, p: [0, 0.83 * H, 0] },
  { name: 'HEAD', parent: 4, p: [0, 0.88 * H, 0] },
  { name: 'CLAV_L', parent: 3, p: [-0.05, 0.79 * H, 0] }, { name: 'UPPERARM_L', parent: 6, p: [-0.145, 0.775 * H, 0] }, { name: 'FOREARM_L', parent: 7, p: [-0.165, 0.615 * H, 0] }, { name: 'HAND_L', parent: 8, p: [-0.175, 0.485 * H, 0] },
  { name: 'CLAV_R', parent: 3, p: [0.05, 0.79 * H, 0] }, { name: 'UPPERARM_R', parent: 10, p: [0.145, 0.775 * H, 0] }, { name: 'FOREARM_R', parent: 11, p: [0.165, 0.615 * H, 0] }, { name: 'HAND_R', parent: 12, p: [0.175, 0.485 * H, 0] },
  { name: 'TAIL1', parent: 1, p: [0, 0.31 * H, 0] }, { name: 'TAIL2', parent: 14, p: [0, 0.18 * H, 0] }, { name: 'TAIL3', parent: 15, p: [0, 0.06 * H, 0] }
];
var TIP = { HEAD: [0, 1.0 * H, 0], HAND_L: [-0.18, 0.42 * H, 0], HAND_R: [0.18, 0.42 * H, 0], TAIL3: [0, 0, 0], NECK: [0, 0.88 * H, 0] };
/* bone segments: from joint to its first child (or tip) */
var SEG = J.map(function (j, i) { var child = J.findIndex(function (c) { return c.parent === i; }); var end = TIP[j.name] ? TIP[j.name] : (child >= 0 ? J[child].p : [j.p[0], j.p[1] + 0.05, j.p[2]]); return { a: j.p, b: end }; });
function segDist(p, s) { var ax = s.a[0], ay = s.a[1], az = s.a[2], bx = s.b[0] - ax, by = s.b[1] - ay, bz = s.b[2] - az; var L2 = bx * bx + by * by + bz * bz; var t = L2 > 0 ? ((p[0] - ax) * bx + (p[1] - ay) * by + (p[2] - az) * bz) / L2 : 0; t = Math.max(0, Math.min(1, t)); var dx = p[0] - (ax + bx * t), dy = p[1] - (ay + by * t), dz = p[2] - (az + bz * t); return Math.sqrt(dx * dx + dy * dy + dz * dz); }
var ARM_L = [6, 7, 8, 9], ARM_R = [10, 11, 12, 13], AXIAL = [1, 2, 3, 4, 5, 14, 15, 16];
function eligible(p) { var y = p[1] / H, ax = Math.abs(p[0]); var arm = y > 0.36 && y < 0.86 && ax > 0.118; if (arm) return p[0] < 0 ? ARM_L : ARM_R; var torsoWide = y > 0.72 && y < 0.86 && ax > 0.10; if (torsoWide) return (p[0] < 0 ? ARM_L.slice(0, 2) : ARM_R.slice(0, 2)).concat([3, 4]); return AXIAL; }
var joints = new Uint16Array(N * 4), weights = new Float32Array(N * 4); var SIG = 0.055; var counts = new Array(J.length).fill(0);
for (var i = 0; i < N; i++) { var p = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; var el = eligible(p); var cand = el.map(function (b) { return { b: b, d: segDist(p, SEG[b]) }; }).sort(function (u, v) { return u.d - v.d; }).slice(0, 3); var w = cand.map(function (c) { return Math.exp(-(c.d * c.d) / (2 * SIG * SIG)); }); var sum = w.reduce(function (s, x) { return s + x; }, 0) || 1; for (var k = 0; k < 4; k++) { joints[i * 4 + k] = k < cand.length ? cand[k].b : 0; weights[i * 4 + k] = k < cand.length ? w[k] / sum : 0; } counts[cand[0].b]++; }
/* ---- append JOINTS_0 / WEIGHTS_0 / inverse bind matrices to the BIN, add nodes + skin ---- */
var chunks = [bin]; var offset = bin.length; function pad4(n) { return (4 - (n % 4)) % 4; }
function addView(bytes, target) { var padN = pad4(offset); if (padN) { chunks.push(Buffer.alloc(padN)); offset += padN; } var b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength); chunks.push(b); var v = { buffer: 0, byteOffset: offset, byteLength: b.length }; if (target) v.target = target; json.bufferViews.push(v); offset += b.length; return json.bufferViews.length - 1; }
var jv = addView(joints, 34962); json.accessors.push({ bufferView: jv, componentType: 5123, count: N, type: 'VEC4' }); prim.attributes.JOINTS_0 = json.accessors.length - 1;
var wv = addView(weights, 34962); json.accessors.push({ bufferView: wv, componentType: 5126, count: N, type: 'VEC4' }); prim.attributes.WEIGHTS_0 = json.accessors.length - 1;
var ibm = new Float32Array(J.length * 16); J.forEach(function (j, i) { var m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -j.p[0], -j.p[1], -j.p[2], 1]; for (var k = 0; k < 16; k++) ibm[i * 16 + k] = m[k]; });   /* bind pose = rest pose, identity rotations */
var iv = addView(ibm); json.accessors.push({ bufferView: iv, componentType: 5126, count: J.length, type: 'MAT4' }); var ibmAcc = json.accessors.length - 1;
var meshNodeIdx = 0; var baseNode = json.nodes[meshNodeIdx]; var jointNodeIdx = []; J.forEach(function (j, i) { var parentPos = j.parent >= 0 ? J[j.parent].p : [0, 0, 0]; json.nodes.push({ name: j.name, translation: [j.p[0] - parentPos[0], j.p[1] - parentPos[1], j.p[2] - parentPos[2]] }); jointNodeIdx.push(json.nodes.length - 1); });
J.forEach(function (j, i) { if (j.parent >= 0) { var pn = json.nodes[jointNodeIdx[j.parent]]; pn.children = (pn.children || []).concat([jointNodeIdx[i]]); } });
json.skins = [{ name: 'ATHLETE_M_DERIVATIVE_RIG', inverseBindMatrices: ibmAcc, joints: jointNodeIdx, skeleton: jointNodeIdx[0] }];
baseNode.name = 'ATHLETE_M_BODY'; baseNode.skin = 0; json.scenes[json.scene || 0].nodes = [meshNodeIdx, jointNodeIdx[0]];
json.meshes[0].name = 'ATHLETE_M_BODY'; json.materials[0].name = 'ATHLETE_M_SOURCE_PBR';
json.extensionsUsed = (json.extensionsUsed || []).filter(function (x) { return x !== 'FB_ngon_encoding'; }); if (json.extensionsRequired) json.extensionsRequired = json.extensionsRequired.filter(function (x) { return x !== 'FB_ngon_encoding'; });
json.buffers = [{ byteLength: offset }]; json.asset = { version: '2.0', generator: 'MAHWORLD make_athlete_m_rigged.mjs (derivative auto-rig; source geometry + materials untouched)', extras: { mahworld_preview: 'DEVELOPMENT_PREVIEW_UNAPPROVED', source: 'RAW_10_MODELS/Mah_Athlete_M.glb', source_sha256: srcSha, rig: 'DERIVATIVE_AUTO_RIG_DEV (17 joints, distance-based weights)', missing: ['split_upper_mesh', 'split_leg_mesh_L', 'split_leg_mesh_R', 'PACKED morph', 'eye / lid geometry', 'authored clips'] } };
var js = Buffer.from(JSON.stringify(json), 'utf8'); var jpad = pad4(js.length); if (jpad) js = Buffer.concat([js, Buffer.alloc(jpad, 0x20)]); var binBuf = Buffer.concat(chunks); var bpad = pad4(binBuf.length); if (bpad) binBuf = Buffer.concat([binBuf, Buffer.alloc(bpad)]);
var total = 12 + 8 + js.length + 8 + binBuf.length; var out = Buffer.alloc(total); out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8); out.writeUInt32LE(js.length, 12); out.writeUInt32LE(0x4E4F534A, 16); js.copy(out, 20); out.writeUInt32LE(binBuf.length, 20 + js.length); out.writeUInt32LE(0x004E4942, 24 + js.length); binBuf.copy(out, 28 + js.length);
var outFile = path.join(OUT_DIR, 'Mah_Athlete_M_rigged.glb'); fs.writeFileSync(outFile, out); var outSha = crypto.createHash('sha256').update(out).digest('hex');
var manifest = { export_id: 'ATHLETE_M_RIGGED_PREVIEW', version: 'dev_0.2', sha256: outSha, owner_review_status: 'CANDIDATE', preview_status: 'DEVELOPMENT_PREVIEW_UNAPPROVED (derivative auto-rig over the Tripo source; not a retained or production character; the Astra head / eye cleanup (AM08 retained base, AM19 in progress) is NOT included because no export exists)', source_release: 'isolated derivative of RAW_10_MODELS/Mah_Athlete_M.glb (sha256 ' + srcSha + ') with the authentic base-colour + normal textures embedded and a 17-joint derivative skeleton + skin weights added', units: 'metres', up_axis: '+Y', forward_axis: '-Z', source_forward_axis: '+Z', root: 'ROOT', scale_to_metres: +(1.8 / H).toFixed(5), source_height_units: +H.toFixed(4), forms: ['FUSED'], clips: {}, sockets: { ROOT: 'ROOT', HEAD: 'HEAD', CHEST: 'CHEST', HAND_L: 'HAND_L', HAND_R: 'HAND_R', FEET: 'TAIL3' }, materials: { ATHLETE_M_SOURCE_PBR: 'source base colour + normal map (embedded JPEG)' }, files: ['Mah_Athlete_M_rigged.glb'], joints: J.map(function (j) { return j.name; }), weight_stats: J.map(function (j, i) { return j.name + ':' + counts[i]; }), limitations: ['derivative auto-rig: joint placement measured from cross-sections, smooth distance weights (not hand-painted)', 'no separated-leg geometry / PACKED morph in the source: SPLIT anatomy cannot be shown', 'no eye or lid geometry: blinks / gaze are not possible', 'no authored clips: all motion is procedural on the derivative bones', 'textures are the source JPEGs (about 11 MB total)'], generated: new Date().toISOString() };
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('wrote', outFile, out.length, 'bytes sha', outSha.slice(0, 16), 'joints', J.length, 'weights by bone', manifest.weight_stats.join(' '));
