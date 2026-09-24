/* MAHWORLD :: GENERALIZED DERIVATIVE RIG GENERATOR v4 (2026-09-16, motion precision pass) — v3 plus:
     · SPLIT LEGS from rig_legs_v4.mjs: smoothed cross-section profile (no stair-step ledges on the shin front), a hip dome that
       continues into the pelvis, dense knee rings; the THIGH bone pivots at the femur head (crotch + 0.055 H) instead of the split line
     · KNEE at the measured narrowing + 0.010 H (the small knee volume immediately above the metallic shin), knee blend ±0.02 H
     · ARM BINDING refinement: beyond the armpit the axial bones (CHEST/SPINE/NECK) are removed from the arm column and the deltoid
       cap is handed to the humerus (dev_0.7 measured: upper arm 21 % CHEST, elbow 13 % CHEST, deltoid cap only 46-60 % UPPERARM —
       the cap stayed put while the arm rose). NECK gets its own column above the shoulder shelf.
     · MUSCLE LAYER 2: sparse morph targets on the body (BICEPS/TRICEPS/DELTOID/PEC/LAT/FOREARM L+R, TRAP, ABS) built from the
       measured landmarks, and a per-vertex `_MUSCLE` group id attribute for the runtime tension mask (layer 3).
   v3 text follows; the v3 file is kept unchanged.
   MAHWORLD :: GENERALIZED DERIVATIVE RIG GENERATOR v3 (2026-09-15, rig-motion repair)
   Turns a static Tripo class GLB (one mesh, faces +Z, feet at y=0) into an isolated runtime derivative. v3 replaces the two
   subsystems the owner's deformation review rejected, and changes nothing else:
     · JOINT PLACEMENT — every joint is a measured cross-section landmark (lab/assets/rig_measure.mjs), not a fraction of a
       limb. The v2 elbow sat ~0.05 H inside the forearm and the v2 knee sat inside the calf bulge; both are now the narrowing
       BETWEEN the neighbouring bulges, and the shoulder is inside the humeral head instead of on the deltoid surface.
     · BINDING — geodesic surface weights (lab/assets/rig_weights.mjs) with a per-bone sigma measured from that bone's own
       limb thickness, replacing one global gaussian over straight-line distance. Blender's bone-heat solver was tried first
       and returns all-zero weights on these multi-shell crystalline meshes (it still reports FINISHED), so it is not used.
     · 17 measured body joints (ROOT PELVIS SPINE CHEST NECK HEAD CLAV/UPPERARM/FOREARM/HAND L+R TAIL1..3) — landmarks MEASURED per mesh
     · FINGERS_L/R, BROW_L/R, CHEEK_L/R, JAW derivative bones (crude on a Tripo head — stated in the manifest)
     · fused mesh as two primitives sharing one skin: upper + `fused_lower` (extras.role) so the runtime hides the fused lower body in SPLIT form
     · a second SkinnedMesh `<ID>_SPLIT_LEGS`: two pointed limbs generated from the fused lower body (each = narrowed outer half + its mirror,
       capped top ring), bones THIGH/SHIN/TIP per side, morph target PACKED (legs pressed onto the fused silhouette) for the transformation
     · textures resampled in headless Chrome through a loopback server (optional AM08 base colour + K3 emissive eye mask for the Athlete)
   Reads sources READ-ONLY. Never touches RAW / WORKING / Astra folders. Bone names / roles follow lab/ANIMATION_CHANNELS.md.
   node 26_LOCAL_AUTHORITY/lab/assets/make_class_rig.mjs --src <glb> --out <dir> --id <EXPORT_ID> --version <v> [--base-src <png>] [--mask-src <png>] [--k3] [--px 2048] [--crotch 0.40] */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net'; import http from 'node:http'; import crypto from 'node:crypto'; import { spawn } from 'node:child_process';
import { measureBody, symmetriseArms, sectionCentre } from './rig_measure.mjs';
import { geodesicWeights, finalizeWeights } from './rig_weights.mjs';
import { makeUvLookup } from './rig_legs.mjs'; import { buildLegsV4 } from './rig_legs_v4.mjs';
var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; } function flag(k) { return argv.indexOf(k) >= 0; }
var SRC = arg('--src'), OUT_DIR = arg('--out'), ID = arg('--id'), VERSION = arg('--version', 'dev_0.1'); if (!SRC || !OUT_DIR || !ID) { console.error('usage: --src <glb> --out <dir> --id <EXPORT_ID> --version <v> [--base-src png] [--mask-src png] [--k3] [--px 2048] [--crotch 0.40] [--file name.glb]'); process.exit(2); }
var BLEND = parseFloat(arg('--blend', '0.85'));   /* sigma multiplier on the measured limb thickness */
var PX = parseInt(arg('--px', '2048'), 10); var EMIT_PX = 1024; var Q_BASE = parseFloat(arg('--q', '0.88')), Q_NORMAL = parseFloat(arg('--qn', '0.9')); var CROTCH = parseFloat(arg('--crotch', '0.40')); var BASE_SRC = arg('--base-src', null), MASK_SRC = arg('--mask-src', null), K3 = flag('--k3'); var OUT_FILE = arg('--file', ID.toLowerCase() + '.glb');
var CHROME = process.env.MAHWORLD_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); } function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function freePort() { return new Promise(function (res) { var s = net.createServer(); s.listen(0, '127.0.0.1', function () { var p = s.address().port; s.close(function () { res(p); }); }); }); }
function pct(arr, q) { var a = arr.slice().sort(function (u, v) { return u - v; }); return a[Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))))]; }
function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / (a.length || 1); }
/* ---------------- parse source ---------------- */
var glb = fs.readFileSync(SRC); if (glb.readUInt32LE(0) !== 0x46546C67) throw new Error('not a GLB'); var jsonLen = glb.readUInt32LE(12); var sj = JSON.parse(glb.slice(20, 20 + jsonLen).toString('utf8')); var binLen = glb.readUInt32LE(20 + jsonLen); var bin = glb.slice(28 + jsonLen, 28 + jsonLen + binLen); var srcSha = sha256(glb);
function accArray(ai) { var a = sj.accessors[ai]; var bv = sj.bufferViews[a.bufferView]; var off = (bv.byteOffset || 0) + (a.byteOffset || 0); var n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]; var Ctor = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType]; var bytes = bin.slice(off, off + a.count * n * Ctor.BYTES_PER_ELEMENT); return new Ctor(bytes.buffer, bytes.byteOffset, a.count * n); }
var prim = sj.meshes[0].primitives[0]; var P = accArray(prim.attributes.POSITION), NM = accArray(prim.attributes.NORMAL), UV = accArray(prim.attributes.TEXCOORD_0), IDX = accArray(prim.indices); var N = P.length / 3; var TRI = IDX.length / 3;
var minY = Infinity, maxY = -Infinity; for (var i = 0; i < N; i++) { var y = P[i * 3 + 1]; if (y < minY) minY = y; if (y > maxY) maxY = y; } var H = maxY - minY; console.log('source', path.basename(SRC), N, 'verts', TRI, 'tris', 'height', H.toFixed(4), 'minY', minY.toFixed(4));
function vx(i) { return P[i * 3]; } function vy(i) { return (P[i * 3 + 1] - minY) / H; } function vz(i) { return P[i * 3 + 2]; } function nz(i) { return NM[i * 3 + 2]; }
function slice(lo, hi, pred) { var out = []; for (var i = 0; i < N; i++) { var h = vy(i); if (h >= lo && h < hi && (!pred || pred(i))) out.push(i); } return out; }
/* ---------------- measured landmarks (rig_measure.mjs — one method, no per-character constants) ---------------- */
var PTS = []; for (var pi = 0; pi < N; pi++) PTS.push({ x: P[pi * 3], y: P[pi * 3 + 1], z: P[pi * 3 + 2], h: vy(pi) });
var MEAS = symmetriseArms(measureBody(PTS, null, { H: H, crotch: CROTCH }));
var armT = MEAS.arm_threshold_x;                                   /* density minimum between torso and arm mass */
var shoulder = { y: MEAS.shoulder_h, hw: MEAS.shoulder_half_width };
var chestBand = slice(0.62, 0.72); var torsoHalf = pct(chestBand.filter(function (i) { return Math.abs(vx(i)) < armT; }).map(function (i) { return Math.abs(vx(i)); }), 0.98);
function armVerts(sign) { return slice(0.20, shoulder.y + 0.10, function (i) { return Math.abs(vx(i)) > armT && Math.sign(vx(i)) === sign; }); }
var arms = { L: armVerts(-1), R: armVerts(1) }; var L = {};
function frontZ(lo, hi, xlo, xhi) { var v = slice(lo, hi, function (i) { return Math.abs(vx(i)) >= xlo && Math.abs(vx(i)) <= xhi && nz(i) > 0.2; }); return v.length ? Math.max.apply(null, v.map(vz)) : headZ; }
['L', 'R'].forEach(function (S) {
  var a = arms[S], sgn = S === 'L' ? -1 : 1, am = MEAS.arms[S];
  var xa = function (y0, y1) { var v = a.filter(function (i) { return vy(i) >= y0 && vy(i) < y1; }); return v.length ? mean(v.map(vx)) : sgn * (armT + 0.02); };
  var za = function (y0, y1) { var v = a.filter(function (i) { return vy(i) >= y0 && vy(i) < y1; }); return v.length ? mean(v.map(vz)) : 0; };
  if (!am) { var fy = shoulder.y - 0.02; L['UPPERARM_' + S] = [sgn * 0.8 * shoulder.hw, fy, 0]; L['FOREARM_' + S] = [sgn * 0.85 * shoulder.hw, fy - 0.12, 0]; L['HAND_' + S] = [sgn * 0.9 * shoulder.hw, fy - 0.24, 0]; L['HANDC_' + S] = [sgn * 0.9 * shoulder.hw, fy - 0.30, 0]; L['FINGERS_' + S] = [sgn * 0.9 * shoulder.hw, fy - 0.33, 0]; L['TIPY_' + S] = fy - 0.36; L['CLAV_' + S] = [sgn * 0.3 * shoulder.hw, fy + 0.01, 0]; return; }
  var shY = am.shoulder_joint_h, elbowY = am.elbow_h, wristY = am.wrist_h, tipY = am.lowest_h;
  var handY = am.hand_bulge_h !== null && am.hand_bulge_h < wristY ? am.hand_bulge_h : 0.5 * (wristY + tipY);
  var fingY = Math.max(tipY + 0.010, 0.5 * (handY + tipY));
  var upX = xa(shY - 0.045, shY + 0.020), upZ = za(shY - 0.045, shY + 0.020);
  L['UPPERARM_' + S] = [upX * 0.88, shY + 0.004, upZ];              /* v4: inside the humeral head under the deltoid mass (v3's 0.82 sat at the armpit line) */
  L['FOREARM_' + S] = [xa(elbowY - 0.018, elbowY + 0.018), elbowY, za(elbowY - 0.018, elbowY + 0.018)];
  L['HAND_' + S] = [xa(wristY - 0.015, wristY + 0.015), wristY, za(wristY - 0.015, wristY + 0.015)];
  L['HANDC_' + S] = [xa(handY - 0.020, handY + 0.020), handY, za(handY - 0.020, handY + 0.020)];
  L['FINGERS_' + S] = [xa(fingY - 0.015, fingY + 0.020), fingY, za(fingY - 0.015, fingY + 0.020)];
  L['TIPY_' + S] = tipY;
  L['CLAV_' + S] = [sgn * 0.35 * Math.abs(L['UPPERARM_' + S][0]), Math.min(shY + 0.008, 0.92), 0];
});
var neck = { y: MEAS.neck_h, hw: MEAS.neck_radius || MEAS.chest_half_width };
var headBand = slice(0.90, 0.97); var headHW = MEAS.head_half_width; var headZ = mean(headBand.map(vz));
var HIPY = CROTCH, KNEEY = ((MEAS.legs && MEAS.legs.knee_h) || (CROTCH - 0.10)) + 0.010, HIP_PIVOT = CROTCH + 0.055, DOME_TOP = HIP_PIVOT - 0.006, TIPYL = Math.max(0.02, ((MEAS.legs && MEAS.legs.tip_h) || 0) + 0.03);
var PELVISY = HIPY + 0.025, CHESTY = Math.max(0.55, shoulder.y - 0.085), SPINEY = 0.5 * (PELVISY + CHESTY);
var TAIL1Y = 0.5 * (HIPY + KNEEY), TAIL2Y = 0.5 * KNEEY, TAIL3Y = Math.max(0.015, TIPYL - 0.01);
var Hm = { H: H, arm_threshold_x: armT, arm_threshold_method: MEAS.arm_threshold_evidence ? 'density_minimum_inward_from_arm_mass' : 'given', shoulder_y: shoulder.y, shoulder_half_width: shoulder.hw, torso_half_width_chest: torsoHalf, chest_half_width_median: MEAS.chest_half_width, neck_y: neck.y, neck_radius: MEAS.neck_radius, head_half_width: headHW, head_top: 1.0,
  arm_L: MEAS.arms.L ? { shoulder_joint_h: MEAS.arms.L.shoulder_joint_h, shoulder_source: MEAS.arms.L.shoulder_source, deltoid_h: MEAS.arms.L.deltoid_h, elbow_h: MEAS.arms.L.elbow_h, elbow_source: MEAS.arms.L.elbow_source, elbow_station_h: MEAS.arms.L.elbow_station_h, forearm_bulge_h: MEAS.arms.L.forearm_bulge_h, wrist_h: MEAS.arms.L.wrist_h, wrist_source: MEAS.arms.L.wrist_source, hand_bulge_h: MEAS.arms.L.hand_bulge_h, fingertip_h: MEAS.arms.L.lowest_h } : null,
  legs_measured: MEAS.legs ? { hip_h: HIPY, hip_source: 'crotch parameter (the fused body has no crotch; the split line is authored)', knee_h: KNEEY, knee_source: MEAS.legs.knee_h ? 'measured_narrowing' : 'fallback', knee_radius: MEAS.legs.knee_r, calf_bulge_h: MEAS.legs.calf_bulge_h, tip_h: MEAS.legs.tip_h } : null,   /* `legs` is taken by the split-leg build metadata further down, so the measured leg landmarks keep their own key */
  spine_chain_h: { PELVIS: PELVISY, SPINE: SPINEY, CHEST: CHESTY, NECK: neck.y, TAIL1: TAIL1Y, TAIL2: TAIL2Y, TAIL3: TAIL3Y } };
/* ---------------- skeleton (source units; y as fraction of H converted below) ---------------- */
function Y(f) { return minY + f * H; }
var J = [
  { name: 'ROOT', parent: -1, p: [0, minY, 0] }, { name: 'PELVIS', parent: 0, p: [0, Y(PELVISY), 0] }, { name: 'SPINE', parent: 1, p: [0, Y(SPINEY), 0] }, { name: 'CHEST', parent: 2, p: [0, Y(CHESTY), 0] }, { name: 'NECK', parent: 3, p: [0, Y(neck.y), 0] }, { name: 'HEAD', parent: 4, p: [0, Y(0.5 * (neck.y + 1.0)), 0] },
  { name: 'CLAV_L', parent: 3, p: [L.CLAV_L[0], Y(L.CLAV_L[1]), 0] }, { name: 'UPPERARM_L', parent: 6, p: [L.UPPERARM_L[0], Y(L.UPPERARM_L[1]), L.UPPERARM_L[2]] }, { name: 'FOREARM_L', parent: 7, p: [L.FOREARM_L[0], Y(L.FOREARM_L[1]), L.FOREARM_L[2]] }, { name: 'HAND_L', parent: 8, p: [L.HAND_L[0], Y(L.HAND_L[1]), L.HAND_L[2]] },
  { name: 'CLAV_R', parent: 3, p: [L.CLAV_R[0], Y(L.CLAV_R[1]), 0] }, { name: 'UPPERARM_R', parent: 10, p: [L.UPPERARM_R[0], Y(L.UPPERARM_R[1]), L.UPPERARM_R[2]] }, { name: 'FOREARM_R', parent: 11, p: [L.FOREARM_R[0], Y(L.FOREARM_R[1]), L.FOREARM_R[2]] }, { name: 'HAND_R', parent: 12, p: [L.HAND_R[0], Y(L.HAND_R[1]), L.HAND_R[2]] },
  { name: 'TAIL1', parent: 1, p: [0, Y(TAIL1Y), 0] }, { name: 'TAIL2', parent: 14, p: [0, Y(TAIL2Y), 0] }, { name: 'TAIL3', parent: 15, p: [0, Y(TAIL3Y), 0] },
  { name: 'FINGERS_L', parent: 9, p: [L.FINGERS_L[0], Y(L.FINGERS_L[1]), L.FINGERS_L[2]] }, { name: 'FINGERS_R', parent: 13, p: [L.FINGERS_R[0], Y(L.FINGERS_R[1]), L.FINGERS_R[2]] },
  { name: 'BROW_L', parent: 5, p: [-0.35 * headHW, Y(0.945), frontZ(0.93, 0.965, 0.2 * headHW, 0.5 * headHW)] }, { name: 'BROW_R', parent: 5, p: [0.35 * headHW, Y(0.945), frontZ(0.93, 0.965, 0.2 * headHW, 0.5 * headHW)] },
  { name: 'CHEEK_L', parent: 5, p: [-0.4 * headHW, Y(0.915), frontZ(0.895, 0.935, 0.25 * headHW, 0.6 * headHW)] }, { name: 'CHEEK_R', parent: 5, p: [0.4 * headHW, Y(0.915), frontZ(0.895, 0.935, 0.25 * headHW, 0.6 * headHW)] },
  { name: 'JAW', parent: 5, p: [0, Y(0.885), frontZ(0.86, 0.905, 0, 0.3 * headHW) - 0.01] }
];
var BI = {}; J.forEach(function (j, i) { BI[j.name] = i; });
var TIPS = { HEAD: [0, Y(1.0), 0], HAND_L: [L.HANDC_L[0], Y(L.HANDC_L[1]), L.HANDC_L[2]], HAND_R: [L.HANDC_R[0], Y(L.HANDC_R[1]), L.HANDC_R[2]], TAIL3: [0, minY, 0], FINGERS_L: [L.FINGERS_L[0], Y(L.TIPY_L), L.FINGERS_L[2]], FINGERS_R: [L.FINGERS_R[0], Y(L.TIPY_R), L.FINGERS_R[2]] };
function segOf(i) { var j = J[i]; var child = J.findIndex(function (c, ci) { return c.parent === i && ci < 17; }); var end = TIPS[j.name] ? TIPS[j.name] : (child >= 0 ? J[child].p : [j.p[0], j.p[1] + 0.05, j.p[2]]); return { a: j.p, b: end }; }
var SEG = J.map(function (_, i) { return segOf(i); });
function segDist(p, s) { var ax = s.a[0], ay = s.a[1], az = s.a[2], bx = s.b[0] - ax, by = s.b[1] - ay, bz = s.b[2] - az; var L2 = bx * bx + by * by + bz * bz; var t = L2 > 0 ? ((p[0] - ax) * bx + (p[1] - ay) * by + (p[2] - az) * bz) / L2 : 0; t = Math.max(0, Math.min(1, t)); var dx = p[0] - (ax + bx * t), dy = p[1] - (ay + by * t), dz = p[2] - (az + bz * t); return Math.sqrt(dx * dx + dy * dy + dz * dz); }
/* ---------------- binding: geodesic surface weights (rig_weights.mjs) ----------------
   Territory seeding is gated by the measured arm/torso separation so a rib can never be claimed by an arm bone; the weights
   themselves are a gaussian of GEODESIC distance over the welded surface graph, so influence has to travel over the armpit
   to reach the ribs instead of jumping across the gap. Sigma is per bone, measured as the mean thickness of that bone's own
   territory — a forearm blends over a forearm's width, a chest over a chest's. */
var GEO_ARM = { L: ['CLAV_L', 'UPPERARM_L', 'FOREARM_L', 'HAND_L', 'FINGERS_L'], R: ['CLAV_R', 'UPPERARM_R', 'FOREARM_R', 'HAND_R', 'FINGERS_R'] };
var GEO_AXIAL = ['PELVIS', 'SPINE', 'CHEST', 'NECK', 'HEAD', 'TAIL1', 'TAIL2', 'TAIL3'];
var GEO_BONES = GEO_AXIAL.concat(GEO_ARM.L, GEO_ARM.R);
var SEGN = {}; GEO_BONES.forEach(function (n2) { SEGN[n2] = SEG[BI[n2]]; });
var armLow = Math.min(L.TIPY_L, L.TIPY_R) - 0.02;
var ARMTOP = { L: MEAS.arms.L ? MEAS.arms.L.arm_top_h : shoulder.y + 0.04, R: MEAS.arms.R ? MEAS.arms.R.arm_top_h : shoulder.y + 0.04 };
var DELT_X = Math.max(0.62 * shoulder.hw, 0.93 * armT);   /* the deltoid cap: the outer part of the shoulder shelf, outside the torso column (Bage's shoulders are barely wider than its ribs) */
function eligible(i) {
  var y = vy(i), ax = Math.abs(vx(i)), side = vx(i) < 0 ? 'L' : 'R';
  /* the deltoid cap rides the HUMERUS: seeded to UPPERARM so a raised arm carries its own shoulder muscle (the clavicle segment
     runs horizontally through this band and would otherwise claim it, leaving the cap fixed while the arm rises) */
  if (y > shoulder.y - 0.015 && y < ARMTOP[side] + 0.015 && ax > DELT_X) return ['UPPERARM_' + side];
  if (y > armLow && y < shoulder.y + 0.06 && ax > armT) return GEO_ARM[side];                                  /* the arm column */
  if (y > shoulder.y - 0.12 && y < shoulder.y + 0.06 && ax > 0.85 * armT) return GEO_ARM[side].slice(0, 2).concat(['CHEST', 'NECK']);   /* shoulder shelf */
  return GEO_AXIAL;
}
function smoothstep3(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-6, e1 - e0))); return t * t * (3 - 2 * t); }
var ARM_BONE = /^(CLAV|UPPERARM|FOREARM|HAND|FINGERS)_(L|R)$/;
function gate(i, bone) {                       /* soft version of the measured arm/torso separation, and never across the midline */
  var m = ARM_BONE.exec(bone); if (!m) return 1;
  var sgn = m[2] === 'L' ? -1 : 1; if (Math.sign(vx(i)) !== sgn && Math.abs(vx(i)) > 0.01) return 0;
  return smoothstep3(0.72 * armT, armT, Math.abs(vx(i)));
}
var GEO = geodesicWeights(P, IDX, N, SEGN, eligible, { scale: H / 0.9865, blend: BLEND, gate: gate });
var W = GEO.weights; var counts = {}; J.forEach(function (j) { counts[j.name] = 0; });
console.log('geodesic bind: welded', GEO.welded, 'verts,', GEO.edges, 'edges · territory', JSON.stringify(GEO.territory), '· sigma', JSON.stringify(Object.keys(GEO.sigma).reduce(function (o, k) { o[k] = +GEO.sigma[k].toFixed(4); return o; }, {})));
/* face + finger transfers */
function transfer(i, bone, share) { var w = W[i]; if (share <= 0) return; Object.keys(w).forEach(function (k) { w[k] *= (1 - share); }); w[bone] = (w[bone] || 0) + share; }
var FACE = [{ b: 'BROW_L', lo: 0.93, hi: 0.965, side: -1 }, { b: 'BROW_R', lo: 0.93, hi: 0.965, side: 1 }, { b: 'CHEEK_L', lo: 0.895, hi: 0.935, side: -1 }, { b: 'CHEEK_R', lo: 0.895, hi: 0.935, side: 1 }, { b: 'JAW', lo: 0.86, hi: 0.905, side: 0 }];
var faceSig = 0.02 * (H / 0.9865); FACE.forEach(function (f) { var jp = J[BI[f.b]].p; for (var i = 0; i < N; i++) { var y = vy(i); if (y < f.lo || y >= f.hi || nz(i) <= 0.2) continue; if (f.side !== 0 && Math.sign(vx(i)) !== f.side && Math.abs(vx(i)) > 0.05 * headHW) continue; var dx = vx(i) - jp[0], dy = P[i * 3 + 1] - jp[1], dz = vz(i) - jp[2]; var d2 = dx * dx + dy * dy + dz * dz; var g = 0.9 * Math.exp(-d2 / (2 * faceSig * faceSig)); if (g > 0.02) { transfer(i, f.b, g); counts[f.b]++; } } });
/* ---------------- v4: arm column + deltoid cap + neck refinement (measured defects of dev_0.7, see header) ---------------- */
var AXIAL_BONE = /^(PELVIS|SPINE|CHEST|NECK|HEAD|TAIL1|TAIL2|TAIL3)$/;
function renorm(w) { var s = 0; Object.keys(w).forEach(function (k) { if (w[k] < 1e-4) delete w[k]; else s += w[k]; }); if (s > 0) Object.keys(w).forEach(function (k) { w[k] /= s; }); return s; }
(function () {
  var fixedArm = 0, fixedCap = 0, fixedNeck = 0;
  for (var i = 0; i < N; i++) {
    var y = vy(i), ax = Math.abs(vx(i)), side = vx(i) < 0 ? 'L' : 'R', w = W[i];
    /* 1. beyond the armpit the arm column belongs to the arm: fade the axial bones out between armT and armT + 0.025 */
    if (y > armLow && y < ARMTOP[side] + 0.02 && ax > armT) {
      var keep = 1 - smoothstep3(armT - 0.006, armT + 0.055, ax);   /* v4.1: 1 at the armpit line -> 0 out on the limb over ~6 cm (a 2.5 cm step pinched on elevation) */
      var moved = 0; Object.keys(w).forEach(function (k) { if (AXIAL_BONE.test(k)) { var m = w[k] * (1 - keep); w[k] -= m; moved += m; } });
      if (moved > 0) { var armSum = 0; Object.keys(w).forEach(function (k) { if (ARM_BONE.test(k)) armSum += w[k]; }); if (armSum > 1e-6) Object.keys(w).forEach(function (k) { if (ARM_BONE.test(k)) w[k] += moved * w[k] / armSum; }); else w['UPPERARM_' + side] = (w['UPPERARM_' + side] || 0) + moved; fixedArm++; }
    }
    /* 2. deltoid cap rides the humerus: outside the torso column, over the shoulder band, UPPERARM 0.55 -> 0.90 outward */
    if (y > shoulder.y - 0.02 && y < ARMTOP[side] + 0.015 && ax > DELT_X) {
      var t = smoothstep3(DELT_X - 0.01, DELT_X + 0.045, ax); var target = 0.5 + 0.4 * t; var cur = w['UPPERARM_' + side] || 0;
      if (cur < target) { var need = target - cur; var others = 1 - cur; Object.keys(w).forEach(function (k) { if (k !== 'UPPERARM_' + side) w[k] *= (others - need) / Math.max(1e-6, others); }); w['UPPERARM_' + side] = target; fixedCap++; }
    }
    /* 3. the neck column above the shoulder shelf answers to NECK (then HEAD), not to CHEST */
    if (y > neck.y - 0.02 && y < neck.y + 0.045 && ax < neck.hw * 1.6 && (w.CHEST || 0) > 0.25) {
      var share = smoothstep3(neck.y - 0.02, neck.y + 0.02, y) * 0.75; var m2 = w.CHEST * share; w.CHEST -= m2; w.NECK = (w.NECK || 0) + m2; fixedNeck++;
    }
    renorm(w);
  }
  console.log('v4 binding refinement: arm column', fixedArm, 'verts · deltoid cap', fixedCap, '· neck', fixedNeck);
})();
var FIN = finalizeWeights(W, N, BI); var bodyJ = FIN.joints, bodyW = FIN.weights;
Object.keys(FIN.primary).forEach(function (b) { counts[b] = (counts[b] || 0) + FIN.primary[b]; });
(function () { var mx = 0, zero = 0; for (var i = 0; i < N; i++) { var s4 = 0, nz4 = 0; for (var k = 0; k < 4; k++) { s4 += bodyW[i * 4 + k]; if (bodyW[i * 4 + k] > 0.001) nz4++; } if (Math.abs(s4 - 1) > 1e-3) zero++; if (nz4 > mx) mx = nz4; }
  console.log('weights: max influences', mx, '· unnormalised verts', zero); if (zero) throw new Error('weight normalisation failed on ' + zero + ' vertices'); })();
/* ---------------- fused lower / upper split ---------------- */
var crotchY = Y(CROTCH); var upperTris = [], lowerTris = []; for (var t = 0; t < TRI; t++) { var a = IDX[t * 3], b3 = IDX[t * 3 + 1], c = IDX[t * 3 + 2]; var axial = Math.abs(P[a * 3]) < armT && Math.abs(P[b3 * 3]) < armT && Math.abs(P[c * 3]) < armT; if (axial && P[a * 3 + 1] < crotchY && P[b3 * 3 + 1] < crotchY && P[c * 3 + 1] < crotchY) lowerTris.push(t); else upperTris.push(t); }   /* lower body = below the crotch AND inside the torso column: hanging fingertips (Titan / Lean drop below 0.40 H) stay with the arms */
console.log('landmarks', JSON.stringify({ shoulder_y: +shoulder.y.toFixed(3), shoulder_hw: +shoulder.hw.toFixed(4), arm_threshold: +armT.toFixed(4), torso_half: +torsoHalf.toFixed(4), neck_y: +neck.y.toFixed(3), neck_hw: +neck.hw.toFixed(4), head_hw: +headHW.toFixed(4), upperarm_L: L.UPPERARM_L.map(function (v) { return +v.toFixed(3); }), elbow_L_y: +L.FOREARM_L[1].toFixed(3), wrist_L_y: +L.HAND_L[1].toFixed(3), hand_L_y: +L.HANDC_L[1].toFixed(3), fingers_L_y: +L.FINGERS_L[1].toFixed(3), arm_verts: { L: arms.L.length, R: arms.R.length }, lower_tris: lowerTris.length, upper_tris: upperTris.length }));
/* boundary ring between upper and lower (edges shared by one upper and one lower triangle) */
function edgeKey(u, v) { return u < v ? u + '_' + v : v + '_' + u; } var edgeOwner = {}; function markEdges(tris, tag) { tris.forEach(function (t) { var a = IDX[t * 3], b = IDX[t * 3 + 1], c = IDX[t * 3 + 2]; [[a, b], [b, c], [c, a]].forEach(function (e) { var k = edgeKey(e[0], e[1]); edgeOwner[k] = (edgeOwner[k] || 0) | tag; }); }); } markEdges(upperTris, 1); markEdges(lowerTris, 2);
var ringVerts = {}; Object.keys(edgeOwner).forEach(function (k) { if (edgeOwner[k] === 3) { var uv2 = k.split('_'); ringVerts[uv2[0]] = 1; ringVerts[uv2[1]] = 1; } }); var ring = Object.keys(ringVerts).map(Number); console.log('crotch ring verts', ring.length);
/* upper cap: append centroid vertex to the body buffer; fan over ring edges (double-sided) */
var ringEdges = Object.keys(edgeOwner).filter(function (k) { return edgeOwner[k] === 3; }).map(function (k) { return k.split('_').map(Number); });
var capC = [mean(ring.map(vx)), mean(ring.map(function (i) { return P[i * 3 + 1]; })), mean(ring.map(vz))];
var bodyPos = Array.from(P), bodyNorm = Array.from(NM), bodyUV = Array.from(UV), bodyJa = Array.from(bodyJ), bodyWa = Array.from(bodyW); var capIdx = N; bodyPos.push(capC[0], capC[1], capC[2]); bodyNorm.push(0, -1, 0); bodyUV.push(UV[ring[0] * 2], UV[ring[0] * 2 + 1]); var nearest = ring[0]; bodyJa.push(bodyJ[nearest * 4], bodyJ[nearest * 4 + 1], bodyJ[nearest * 4 + 2], bodyJ[nearest * 4 + 3]); bodyWa.push(bodyW[nearest * 4], bodyW[nearest * 4 + 1], bodyW[nearest * 4 + 2], bodyW[nearest * 4 + 3]);
var upperIdx = []; upperTris.forEach(function (t) { upperIdx.push(IDX[t * 3], IDX[t * 3 + 1], IDX[t * 3 + 2]); }); ringEdges.forEach(function (e) { upperIdx.push(e[0], e[1], capIdx, e[1], e[0], capIdx); });
var lowerIdx = []; lowerTris.forEach(function (t) { lowerIdx.push(IDX[t * 3], IDX[t * 3 + 1], IDX[t * 3 + 2]); });
/* ---------------- split legs: complete lofted limbs (rig_legs.mjs) ----------------
   Replaces the cut-half + mirror construction, which measured 1299 non-manifold seam edges and collapsed triangles to 0.1x
   of their length in an ordinary swing (16_TESTS/gameplay_leg_surface.test.mjs). Each leg is now a closed loft sized from the
   fused body's own sections, with dense knee loops, a patella swell, UVs from the fused body, and a PACKED target that is the
   same topology pressed onto the fused silhouette. */
var hipBand = lowerTris.length ? (function () { var v = {}; lowerTris.forEach(function (t) { for (var k = 0; k < 3; k++) v[IDX[t * 3 + k]] = 1; }); return Object.keys(v).map(Number); })() : [];
var hipHW = Math.max.apply(null, hipBand.filter(function (i) { return vy(i) > CROTCH - 0.06; }).map(function (i) { return Math.abs(vx(i)); })); var lowerZc = mean(hipBand.map(vz));
var NARROW = 0.5, ZS = 0.82, CX = 0.62 * hipHW;
function smoothstep(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-6, e1 - e0))); return t * t * (3 - 2 * t); }
function legWeights(y) {   /* v4: the knee blends over ±0.02 H around the measured knee (a joint's own diameter); the thigh owns everything up to the dome */
  var h = (y - minY) / H, kb = 0.020, tipC = TIPYL + 0.30 * (KNEEY - TIPYL), tb = Math.max(0.03, 0.4 * (KNEEY - TIPYL));
  var thigh = smoothstep(KNEEY - kb, KNEEY + kb, h), tip = 1 - smoothstep(tipC - tb, tipC + tb, h), shin = Math.max(0, 1 - thigh - tip);
  return { thigh: thigh, shin: shin, tip: tip };
}
var axialPts = slice(0.0, DOME_TOP + 0.03, function (i) { return Math.abs(vx(i)) < armT; }).map(function (i) { return { x: vx(i), y: P[i * 3 + 1], z: vz(i), h: vy(i) }; });   /* v4: pelvis + lower body sections for the loft */
var uvOf = makeUvLookup(P, UV, hipBand, 0.02 * (H / 0.9865));
var LEGS = buildLegsV4(axialPts, { minY: minY, H: H, narrow: NARROW, zs: ZS, cx: CX, domeTop: DOME_TOP, splitH: HIPY, kneeH: KNEEY, tipH: Math.max(0.006, TIPYL - 0.035), seg: 24, sigma: 0.010 }, uvOf);
console.log('leg profile (h:hw/hd/zc)', LEGS.profile.filter(function (r, i) { return i % 6 === 0; }).map(function (r) { return r.h + ':' + r.hw + '/' + r.hd + '/' + r.zc; }).join(' '));
var legPos = LEGS.pos, legNorm = LEGS.norm, legUV = LEGS.uv, legIdx = LEGS.idx, legDelta = LEGS.delta, legJ = [], legW = [];
for (var lv = 0; lv < legPos.length / 3; lv++) { var lw = legWeights(legPos[lv * 3 + 1]); legJ.push(0, 0, 0, 0); legW.push(lw.thigh, lw.shin, lw.tip, 0); }
var legMeta = { L: { verts: LEGS.sides.L.count, rings: LEGS.sides.L.rings, cx: +LEGS.sides.L.cx.toFixed(4) }, R: { verts: LEGS.sides.R.count, rings: LEGS.sides.R.rings, cx: +LEGS.sides.R.cx.toFixed(4) }, tris: legIdx.length / 3, segments: LEGS.seg };
/* leg bones (children of PELVIS) — appended after the face bones */
['L', 'R'].forEach(function (S) { var cx = (S === 'L' ? -1 : 1) * CX; J.push({ name: 'THIGH_' + S, parent: 1, p: [cx, Y(HIP_PIVOT), lowerZc] });   /* v4: femur head inside the pelvis */ J.push({ name: 'SHIN_' + S, parent: J.length - 1, p: [cx, Y(KNEEY), lowerZc] }); J.push({ name: 'TIP_' + S, parent: J.length - 1, p: [cx, Y(TIPYL), lowerZc] }); });
J.forEach(function (j, i) { BI[j.name] = i; });
(function () { var idx = 0; ['L', 'R'].forEach(function (S) { var n = legMeta[S].verts; for (var v = 0; v < n; v++) { legJ[(idx + v) * 4] = BI['THIGH_' + S]; legJ[(idx + v) * 4 + 1] = BI['SHIN_' + S]; legJ[(idx + v) * 4 + 2] = BI['TIP_' + S]; legJ[(idx + v) * 4 + 3] = 0; } idx += n; }); })();
console.log('split legs', JSON.stringify(legMeta), 'hip half-width', hipHW.toFixed(4), 'leg centres ±' + CX.toFixed(4));
/* ---------------- v4: MUSCLE LAYER 2 — sparse morph targets on the body from the measured landmarks ----------------
   Each target displaces a muscle belly along the source normal with a smooth bump; amplitudes in source units (1 cm ≈ 0.0101).
   Group ids go into the `_MUSCLE` vertex attribute so the runtime can drive normal/roughness tension per muscle (layer 3). */
var MUSCLES = [];   /* {name, group, verts:[], deltas:[]} */
var MGROUP = new Float32Array(N + 1);   /* +1: the crotch cap vertex */
function armFrame(S) { return { sh: J[BI['UPPERARM_' + S]].p, el: J[BI['FOREARM_' + S]].p, hd: J[BI['HAND_' + S]].p }; }
function segT(p, a, b) { var bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2]; var L2 = bx * bx + by * by + bz * bz; var t = ((p[0] - a[0]) * bx + (p[1] - a[1]) * by + (p[2] - a[2]) * bz) / Math.max(1e-9, L2); return { t: t, dx: p[0] - (a[0] + bx * t), dy: p[1] - (a[1] + by * t), dz: p[2] - (a[2] + bz * t) }; }
function bump(t, lo, hi, pow) { if (t <= lo || t >= hi) return 0; var u = (t - lo) / (hi - lo); return Math.pow(Math.sin(Math.PI * u), pow || 1.5); }
function addMuscle(name, group, amp, sel) {   /* sel(i) -> weight 0..1 */
  var verts = [], deltas = [], nAssigned = 0;
  for (var i = 0; i < N; i++) { var wgt = sel(i); if (!(wgt > 0.02)) continue; var k = amp * wgt; verts.push(i); deltas.push(NM[i * 3] * k, NM[i * 3 + 1] * k, NM[i * 3 + 2] * k); if (wgt > 0.25 && !MGROUP[i]) { MGROUP[i] = group; nAssigned++; } }
  MUSCLES.push({ name: name, group: group, verts: verts, deltas: deltas }); console.log('muscle', name, 'verts', verts.length, 'group-tagged', nAssigned);
}
['L', 'R'].forEach(function (S) {
  var sgn = S === 'L' ? -1 : 1, F = armFrame(S), gid = S === 'L' ? 0 : 1;
  var inArm = function (i) { return Math.sign(vx(i)) === sgn && Math.abs(vx(i)) > armT && vy(i) > armLow; };
  addMuscle('BICEPS_' + S, 1 + gid, 0.013, function (i) { if (!inArm(i)) return 0; var q = segT([vx(i), P[i * 3 + 1], vz(i)], F.sh, F.el); if (q.dz < 0.004) return 0; return bump(q.t, 0.22, 0.90, 1.6) * Math.min(1, q.dz / 0.02); });
  addMuscle('TRICEPS_' + S, 3 + gid, 0.010, function (i) { if (!inArm(i)) return 0; var q = segT([vx(i), P[i * 3 + 1], vz(i)], F.sh, F.el); if (q.dz > -0.004) return 0; return bump(q.t, 0.15, 0.92, 1.4) * Math.min(1, -q.dz / 0.02); });
  addMuscle('DELTOID_' + S, 5 + gid, 0.009, function (i) { var y = vy(i), ax = Math.abs(vx(i)); if (Math.sign(vx(i)) !== sgn || y < shoulder.y - 0.035 || y > ARMTOP[S] + 0.01 || ax < DELT_X - 0.01) return 0; var cy = 0.5 * (shoulder.y + ARMTOP[S]), dy = (y - cy) / 0.045, dx = (ax - (DELT_X + 0.035)) / 0.045; return Math.exp(-(dx * dx + dy * dy)); });
  addMuscle('PEC_' + S, 7 + gid, 0.009, function (i) { var y = vy(i), ax = Math.abs(vx(i)); if (Math.sign(vx(i)) !== sgn || ax < 0.012 || ax > armT || y < 0.68 || y > 0.80 || nz(i) < 0.25) return 0; var dy = (y - 0.74) / 0.045, dx = (ax - 0.06) / 0.045; return Math.exp(-(dx * dx + dy * dy)); });
  addMuscle('LAT_' + S, 9 + gid, 0.013, function (i) { var y = vy(i), ax = Math.abs(vx(i)); if (Math.sign(vx(i)) !== sgn || ax < 0.045 || ax > armT + 0.012 || y < 0.55 || y > 0.75 || nz(i) > 0.35) return 0; var dy = (y - 0.655) / 0.07, dx = (ax - 0.095) / 0.05; return Math.exp(-(dx * dx + dy * dy)); });
  addMuscle('FOREARM_' + S, 13 + gid, 0.007, function (i) { if (!inArm(i)) return 0; var q = segT([vx(i), P[i * 3 + 1], vz(i)], F.el, F.hd); return bump(q.t, 0.08, 0.75, 1.3); });
});
addMuscle('TRAP', 11, 0.008, function (i) { var y = vy(i), ax = Math.abs(vx(i)); if (y < 0.78 || y > 0.88 || ax > 0.105 || nz(i) > 0.45 || NM[i * 3 + 1] < -0.2) return 0; var dy = (y - 0.83) / 0.04, dx = (ax - 0.05) / 0.045; return Math.exp(-(dx * dx + dy * dy)); });
addMuscle('ABS', 15, 0.005, function (i) { var y = vy(i), ax = Math.abs(vx(i)); if (y < 0.49 || y > 0.67 || ax > 0.065 || nz(i) < 0.45) return 0; var dy = (y - 0.58) / 0.08, dx = ax / 0.05; return Math.exp(-(dx * dx + dy * dy)); });
/* v4.1 SHOULDER CORRECTIVE (pose-space lite): linear blend skinning loses volume exactly where a vertex is shared between the humerus and
   the girdle. SHOULDER_L/R push those mixed-weight vertices out along their rest normal (peak at 50/50, ~1.4 cm), driven at runtime by the
   arm's elevation (MuscleLayer). Group 0 = no tension mask. */
['L', 'R'].forEach(function (S) {
  var sgn = S === 'L' ? -1 : 1; var jp = J[BI['UPPERARM_' + S]].p; var bUp = BI['UPPERARM_' + S];
  addMuscle('SHOULDER_' + S, 0, 0.014, function (i) { if (Math.sign(vx(i)) !== sgn) return 0; var dx = vx(i) - jp[0], dy = P[i * 3 + 1] - jp[1], dz = vz(i) - jp[2]; var d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > 0.11) return 0; var wa = 0; for (var k = 0; k < 4; k++) if (bodyJ[i * 4 + k] === bUp) wa += bodyW[i * 4 + k]; var mix = 4 * wa * (1 - wa); return mix * mix * (1 - smoothstep(0.07, 0.11, d)); });
});
/* micro-closure: AXILLA_L/R — the posterior / inferior shoulder groove that opens above ~120° of elevation: vertices below and behind
   the humeral head within 9 cm, pushed out along the rest normal (peak ~1.2 cm), driven only by high elevation (MuscleLayer). Group 0. */
['L', 'R'].forEach(function (S) {
  var sgn = S === 'L' ? -1 : 1; var jp = J[BI['UPPERARM_' + S]].p; var bUp = BI['UPPERARM_' + S];
  addMuscle('AXILLA_' + S, 0, 0.012, function (i) { if (Math.sign(vx(i)) !== sgn) return 0; var dx = vx(i) - jp[0], dy = P[i * 3 + 1] - jp[1], dz = vz(i) - jp[2]; var d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > 0.09 || dy > 0.012 || dz > 0.015) return 0; var wa = 0; for (var k = 0; k < 4; k++) if (bodyJ[i * 4 + k] === bUp) wa += bodyW[i * 4 + k]; var under = smoothstep(0.012, -0.03, dy) * 0.6 + 0.4; var mixed = Math.min(1, 1.6 * wa * (1 - wa) + 0.2); return under * mixed * (1 - smoothstep(0.055, 0.09, d)); });
});
/* ---------------- textures (headless Chrome via loopback) ---------------- */
var mat = sj.materials[0]; var baseImgI = sj.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source; var normImgI = sj.textures[mat.normalTexture.index].source;
var srcBaseBytes = bin.slice(sj.bufferViews[sj.images[baseImgI].bufferView].byteOffset || 0, (sj.bufferViews[sj.images[baseImgI].bufferView].byteOffset || 0) + sj.bufferViews[sj.images[baseImgI].bufferView].byteLength); var srcNormBytes = bin.slice(sj.bufferViews[sj.images[normImgI].bufferView].byteOffset || 0, (sj.bufferViews[sj.images[normImgI].bufferView].byteOffset || 0) + sj.bufferViews[sj.images[normImgI].bufferView].byteLength);
var baseBytes = BASE_SRC ? fs.readFileSync(BASE_SRC) : srcBaseBytes; var maskBytes = MASK_SRC ? fs.readFileSync(MASK_SRC) : null;
var files = { '/base': baseBytes, '/normal': srcNormBytes }; if (maskBytes) files['/mask'] = maskBytes;
var srv = http.createServer(function (req, res) { if (process.env.MW_DEBUG) console.error('texture server', req.url, req.headers.host); res.on('error', function (e) { console.error('texture server response error', e.message); }); if (req.url === '/none') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><title>mahworld texture work</title>'); } var b = files[req.url]; if (!b) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': b.length }); res.end(b); }); await new Promise(function (r) { srv.listen(0, '127.0.0.1', r); }); var fport = srv.address().port;
var port = await freePort(); var udd = fs.mkdtempSync(path.join(os.tmpdir(), 'mahworld-rig2-'));
var chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=' + port, '--user-data-dir=' + udd, 'about:blank'], { stdio: 'ignore' });
var wsUrl = null; for (var i = 0; i < 100 && !wsUrl; i++) { await wait(200); try { var v = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json(); wsUrl = v.webSocketDebuggerUrl; } catch (e) { } } if (!wsUrl) { chrome.kill(); throw new Error('chrome devtools endpoint did not come up'); }
var ws = new WebSocket(wsUrl); await new Promise(function (r, j) { ws.onopen = r; ws.onerror = j; }); var msgId = 0; var pending = {}; var sessionId = null; ws.onmessage = function (ev) { var m = JSON.parse(ev.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
function cdp(method, params) { return new Promise(function (res, rej) { var id = ++msgId; pending[id] = function (m) { if (m.error) rej(new Error(method + ': ' + JSON.stringify(m.error))); else res(m.result); }; var msg = { id: id, method: method, params: params || {} }; if (sessionId) msg.sessionId = sessionId; ws.send(JSON.stringify(msg)); }); }
var tg = await cdp('Target.createTarget', { url: 'http://127.0.0.1:' + fport + '/none' }); var at = await cdp('Target.attachToTarget', { targetId: tg.targetId, flatten: true }); sessionId = at.sessionId; await cdp('Runtime.enable'); await cdp('Page.enable'); await cdp('Page.navigate', { url: 'http://127.0.0.1:' + fport + '/none' }); await wait(500);
async function evalIn(expr) { var r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; }
var t0 = Date.now();
var res = await evalIn('(async function(){ async function load(u){ var im = new Image(); im.decoding = "async"; await new Promise(function(res, rej){ im.onload = res; im.onerror = function(){ rej(new Error("image load failed " + u)); }; im.src = u; }); return await createImageBitmap(im); }   /* <img> streams the 40 MB source; fetch()+blob() fails once the system drive runs low */' +
  ' var base = await load("/base"), norm = await load("/normal"); var mask = ' + (maskBytes ? 'await load("/mask")' : 'null') + '; var P = ' + PX + ', E = ' + EMIT_PX + ';' +
  ' var cb = document.createElement("canvas"); cb.width = P; cb.height = P; var gb = cb.getContext("2d"); gb.imageSmoothingEnabled = true; gb.imageSmoothingQuality = "high"; gb.drawImage(base, 0, 0, P, P); var inside = 0; var emit = null;' +
  ' if (mask && ' + (K3 ? 'true' : 'false') + ') { var cm = document.createElement("canvas"); cm.width = P; cm.height = P; var gm = cm.getContext("2d"); gm.drawImage(mask, 0, 0, P, P); var md = gm.getImageData(0, 0, P, P); var bd = gb.getImageData(0, 0, P, P); var dg = [130, 85, 18]; for (var i = 0; i < md.data.length; i += 4) { var m = md.data[i] / 255; if (m > 0.02) { inside++; var a = Math.min(1, m); bd.data[i] = bd.data[i] * (1 - a) + dg[0] * a; bd.data[i + 1] = bd.data[i + 1] * (1 - a) + dg[1] * a; bd.data[i + 2] = bd.data[i + 2] * (1 - a) + dg[2] * a; } } gb.putImageData(bd, 0, 0);' +
  '   var ce = document.createElement("canvas"); ce.width = E; ce.height = E; var ge = ce.getContext("2d"); ge.fillStyle = "#000"; ge.fillRect(0, 0, E, E); ge.imageSmoothingEnabled = true; ge.imageSmoothingQuality = "high"; ge.drawImage(mask, 0, 0, E, E); emit = ce.toDataURL("image/jpeg", 0.9).split(",")[1]; }' +
  ' var cn = document.createElement("canvas"); cn.width = P; cn.height = P; var gn = cn.getContext("2d"); gn.imageSmoothingEnabled = true; gn.imageSmoothingQuality = "high"; gn.drawImage(norm, 0, 0, P, P);' +
  ' return { bw: base.width, nw: norm.width, inside: inside, base: cb.toDataURL("image/jpeg", ' + Q_BASE + ').split(",")[1], emit: emit, normal: cn.toDataURL("image/jpeg", ' + Q_NORMAL + ').split(",")[1] }; })()');
console.log('textures resampled in', Date.now() - t0, 'ms · base', res.bw + '² → ' + PX + '²', 'normal', res.nw + '²', maskBytes ? ('eye-mask texels ' + res.inside) : '');
try { await cdp('Target.closeTarget', { targetId: tg.targetId }); } catch (e) { } ws.close(); chrome.kill(); srv.close(); await wait(300); try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) { }
var baseOut = Buffer.from(res.base, 'base64'), normOut = Buffer.from(res.normal, 'base64'), emitOut = res.emit ? Buffer.from(res.emit, 'base64') : null;
/* ---------------- write GLB ---------------- */
var views = [], accessors = [], parts = [], offset = 0; function pad4(n) { return (4 - (n % 4)) % 4; }
function addView(buf, target) { var p = pad4(offset); if (p) { parts.push(Buffer.alloc(p)); offset += p; } parts.push(buf); var v = { buffer: 0, byteOffset: offset, byteLength: buf.length }; if (target) v.target = target; views.push(v); offset += buf.length; return views.length - 1; }
function addAcc(arr, type, comp, target, withMinMax) { var buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); var vi = addView(buf, target); var n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type]; var a = { bufferView: vi, componentType: comp, count: arr.length / n, type: type }; if (withMinMax) { var mn = new Array(n).fill(Infinity), mx = new Array(n).fill(-Infinity); for (var i = 0; i < arr.length; i++) { var c = i % n; if (arr[i] < mn[c]) mn[c] = arr[i]; if (arr[i] > mx[c]) mx[c] = arr[i]; } a.min = mn; a.max = mx; } accessors.push(a); return accessors.length - 1; }
var A = {}; A.bpos = addAcc(new Float32Array(bodyPos), 'VEC3', 5126, 34962, true); A.bnorm = addAcc(new Float32Array(bodyNorm), 'VEC3', 5126, 34962); A.buv = addAcc(new Float32Array(bodyUV), 'VEC2', 5126, 34962); A.bj = addAcc(new Uint16Array(bodyJa), 'VEC4', 5123, 34962); A.bw = addAcc(new Float32Array(bodyWa), 'VEC4', 5126, 34962);
A.upperIdx = addAcc(new Uint32Array(upperIdx), 'SCALAR', 5125, 34963); A.lowerIdx = addAcc(new Uint32Array(lowerIdx), 'SCALAR', 5125, 34963);
A.lpos = addAcc(new Float32Array(legPos), 'VEC3', 5126, 34962, true); A.lnorm = addAcc(new Float32Array(legNorm), 'VEC3', 5126, 34962); A.luv = addAcc(new Float32Array(legUV), 'VEC2', 5126, 34962); A.lj = addAcc(new Uint16Array(legJ), 'VEC4', 5123, 34962); A.lw = addAcc(new Float32Array(legW), 'VEC4', 5126, 34962); A.lidx = addAcc(new Uint32Array(legIdx), 'SCALAR', 5125, 34963); A.ldelta = addAcc(new Float32Array(legDelta), 'VEC3', 5126, 34962, true);
function addSparse(count, verts, deltas) {   /* sparse VEC3 float accessor with no base bufferView (zeros) */
  var iv = addView(Buffer.from(new Uint32Array(verts).buffer)), vv = addView(Buffer.from(new Float32Array(deltas).buffer));
  var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (var q = 0; q < deltas.length; q += 3) for (var c = 0; c < 3; c++) { if (deltas[q + c] < mn[c]) mn[c] = deltas[q + c]; if (deltas[q + c] > mx[c]) mx[c] = deltas[q + c]; }
  if (!verts.length) { mn = [0, 0, 0]; mx = [0, 0, 0]; }
  accessors.push({ componentType: 5126, count: count, type: 'VEC3', min: mn, max: mx, sparse: { count: verts.length, indices: { bufferView: iv, componentType: 5125 }, values: { bufferView: vv } } }); return accessors.length - 1;
}
A.muscleTargets = MUSCLES.map(function (m) { return { POSITION: addSparse(bodyPos.length / 3, m.verts, m.deltas) }; });
A.bmuscle = addAcc(new Float32Array(MGROUP), 'SCALAR', 5126, 34962);
var ibm = new Float32Array(J.length * 16); J.forEach(function (j, i) { var m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -j.p[0], -j.p[1], -j.p[2], 1]; for (var k = 0; k < 16; k++) ibm[i * 16 + k] = m[k]; }); A.ibm = addAcc(ibm, 'MAT4', 5126);
var imgViews = [addView(baseOut), addView(normOut)]; if (emitOut) imgViews.push(addView(emitOut));
var images = [{ name: ID + '_BASECOLOR', mimeType: 'image/jpeg', bufferView: imgViews[0] }, { name: ID + '_NORMAL', mimeType: 'image/jpeg', bufferView: imgViews[1] }]; if (emitOut) images.push({ name: ID + '_K3_EYE_MASK', mimeType: 'image/jpeg', bufferView: imgViews[2] });
var textures = images.map(function (_, i) { return { source: i, sampler: 0 }; });
var material = { name: ID + '_PBR', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.5 }, normalTexture: { index: 1 }, doubleSided: false }; if (emitOut) { material.emissiveTexture = { index: 2, texCoord: 0 }; material.emissiveFactor = [1, 0.3, 0.02]; material.extensions = { KHR_materials_emissive_strength: { emissiveStrength: 3 } }; }
var nodes = []; var bodyNode = { name: ID + '_BODY', mesh: 0, skin: 0 }; var legsNode = { name: ID + '_SPLIT_LEGS', mesh: 1, skin: 0 }; nodes.push(bodyNode, legsNode); var jn = []; J.forEach(function (j) { var pp = j.parent >= 0 ? J[j.parent].p : [0, 0, 0]; nodes.push({ name: j.name, translation: [j.p[0] - pp[0], j.p[1] - pp[1], j.p[2] - pp[2]] }); jn.push(nodes.length - 1); }); J.forEach(function (j, i) { if (j.parent >= 0) { var pn = nodes[jn[j.parent]]; pn.children = (pn.children || []).concat([jn[i]]); } });
var out = { asset: { version: '2.0', generator: 'MAHWORLD make_class_rig_v4.mjs (measured joints + geodesic binding + arm refinement; smoothed split legs with femur-head pivot; muscle morphs; source geometry untouched)', extras: { mahworld_preview: 'DEVELOPMENT_PREVIEW_UNAPPROVED', source: path.basename(SRC), source_sha256: srcSha } }, scene: 0, scenes: [{ nodes: [0, 1, jn[0]] }], nodes: nodes,
  meshes: [{ name: ID + '_BODY', primitives: [{ attributes: { POSITION: A.bpos, NORMAL: A.bnorm, TEXCOORD_0: A.buv, JOINTS_0: A.bj, WEIGHTS_0: A.bw, _MUSCLE: A.bmuscle }, indices: A.upperIdx, material: 0, targets: A.muscleTargets, extras: { role: 'upper' } }, { attributes: { POSITION: A.bpos, NORMAL: A.bnorm, TEXCOORD_0: A.buv, JOINTS_0: A.bj, WEIGHTS_0: A.bw, _MUSCLE: A.bmuscle }, indices: A.lowerIdx, material: 0, targets: A.muscleTargets, extras: { role: 'fused_lower' } }], weights: MUSCLES.map(function () { return 0; }), extras: { targetNames: MUSCLES.map(function (m) { return m.name; }) } },
    { name: ID + '_SPLIT_LEGS', primitives: [{ attributes: { POSITION: A.lpos, NORMAL: A.lnorm, TEXCOORD_0: A.luv, JOINTS_0: A.lj, WEIGHTS_0: A.lw }, indices: A.lidx, material: 0, targets: [{ POSITION: A.ldelta }], extras: { role: 'split_legs' } }], weights: [0], extras: { targetNames: ['PACKED'] } }],
  skins: [{ name: ID + '_DERIVATIVE_RIG', inverseBindMatrices: A.ibm, joints: jn, skeleton: jn[0] }], materials: [material], textures: textures, images: images, samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }], bufferViews: views, accessors: accessors, buffers: [{ byteLength: 0 }], extensionsUsed: emitOut ? ['KHR_materials_emissive_strength'] : [] };
var binBuf = Buffer.concat(parts); var bp = pad4(binBuf.length); if (bp) binBuf = Buffer.concat([binBuf, Buffer.alloc(bp)]); out.buffers[0].byteLength = binBuf.length;
var js = Buffer.from(JSON.stringify(out), 'utf8'); var jp = pad4(js.length); if (jp) js = Buffer.concat([js, Buffer.alloc(jp, 0x20)]);
var header = Buffer.alloc(12); header.writeUInt32LE(0x46546C67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + js.length + 8 + binBuf.length, 8); var jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4E4F534A, 4); var bh = Buffer.alloc(8); bh.writeUInt32LE(binBuf.length, 0); bh.writeUInt32LE(0x004E4942, 4);
var outGlb = Buffer.concat([header, jh, js, bh, binBuf]); fs.mkdirSync(OUT_DIR, { recursive: true }); var outPath = path.join(OUT_DIR, OUT_FILE); fs.writeFileSync(outPath, outGlb); var outSha = sha256(outGlb);
/* ---------------- manifest ---------------- */
var mf = { export_id: ID, version: VERSION, sha256: outSha, owner_review_status: 'CANDIDATE', rig_generator: 'make_class_rig_v4.mjs', hip_pivot_h: HIP_PIVOT, knee_h: KNEEY, muscles: MUSCLES.map(function (m) { return { name: m.name, group: m.group, verts: m.verts.length }; }), muscle_attribute: '_MUSCLE', preview_status: 'DEVELOPMENT_PREVIEW_UNAPPROVED (measured derivative auto-rig v4: v3 + cross-section joints + geodesic surface binding, split legs, face and finger bones over the Tripo source; not a retained or production character)', source: { file: path.basename(SRC), sha256: srcSha }, source_release: 'isolated derivative of ' + path.basename(SRC) + ' (sha256 ' + srcSha + ')', units: 'metres', up_axis: '+Y', forward_axis: '-Z', source_forward_axis: '+Z', root: 'ROOT', scale_to_metres: +(1.8 / H).toFixed(5), source_height_units: +H.toFixed(4), forms: ['FUSED', 'SPLIT'], clips: {},
  sockets: { ROOT: 'ROOT', HEAD: 'HEAD', CHEST: 'CHEST', HAND_L: 'HAND_L', HAND_R: 'HAND_R', FEET: 'TAIL3', TIP_FUSED: 'TAIL3', TIP_L: 'TIP_L', TIP_R: 'TIP_R' },
  split: { legs_mesh: ID + '_SPLIT_LEGS', packed_morph: 'PACKED', fused_lower_role: 'fused_lower', upper_role: 'upper', leg_bones: ['THIGH_L', 'SHIN_L', 'TIP_L', 'THIGH_R', 'SHIN_R', 'TIP_R'], leg_centres_x: [-CX, CX], crotch_h: CROTCH, method: 'each leg = a closed loft of ' + LEGS.rings + ' elliptical rings x ' + LEGS.seg + ' segments sized from the fused body sections at every height (x ' + NARROW + ', z ' + ZS + '), dense loops around the measured knee with a patella swell, closed tip point and hip dome, UVs from the nearest fused-body vertex; PACKED delta presses the same topology onto its half of the fused silhouette (no seam plane, manifold)' },
  face_controls: 'DERIVATIVE_BONES (brow/cheek/jaw), no eyelid or iris geometry', finger_controls: 'FINGERS_L / FINGERS_R single finger-mass bones', materials: {}, textures: { base_color: PX + 'x' + PX + ' jpeg q' + Q_BASE + (BASE_SRC ? ' (from ' + path.basename(BASE_SRC) + ')' : ' (source)'), normal: PX + 'x' + PX + ' jpeg q' + Q_NORMAL + ' (source)' }, files: [OUT_FILE], joints: J.map(function (j) { return j.name; }), weight_stats: J.map(function (j) { return j.name + ':' + (counts[j.name] || 0); }),
  measurements: Object.assign({}, Hm, { landmarks_source_units: { PELVIS: J[1].p, SPINE: J[2].p, CHEST: J[3].p, NECK: J[4].p, HEAD: J[5].p, UPPERARM_L: J[7].p, FOREARM_L: J[8].p, HAND_L: J[9].p, FINGERS_L: J[17].p, BROW_L: J[19].p, CHEEK_L: J[21].p, JAW: J[23].p, THIGH_L: J[BI.THIGH_L].p, TIP_L: J[BI.TIP_L].p }, arm_verts: { L: arms.L.length, R: arms.R.length }, tris: { upper: upperTris.length, fused_lower: lowerTris.length, legs: legIdx.length / 3 }, legs: legMeta }),
  limitations: ['derivative auto-rig: joint placement measured from cross-sections, smooth distance weights (not hand-painted); shoulder / elbow / groin can pinch at extreme angles', 'split legs are an engineering approximation: each pointed limb = the narrowed outer half of the fused lower body plus its mirror (texture mirrors on the inner face), capped; the pelvis underside is capped flat', 'PACKED morph carries positions only (normals are the separated-form normals)', 'face bones deform a Tripo head with no eyelid, iris or mouth-interior geometry — expressions are crude and stated as such', 'finger mass is one bone per hand (curl only)', 'textures resampled in the browser canvas, not mip-aware'], generated: new Date().toISOString() };
mf.materials[material.name] = 'base colour ' + PX + '² + normal ' + PX + '²' + (emitOut ? ' + K3 eye emissive mask ' + EMIT_PX + '² (strength 3, (1, 0.3, 0.02))' : '') + ', roughness 0.5, metallic 0';
if (emitOut) mf.textures.emissive_eye_mask = EMIT_PX + 'x' + EMIT_PX + ' jpeg (from ' + path.basename(MASK_SRC) + ')';
if (flag('--astra-from')) { try { var prev = JSON.parse(fs.readFileSync(arg('--astra-from'), 'utf8')); if (prev.astra_candidate) mf.astra_candidate = prev.astra_candidate; mf.derived_from = { export_id: prev.export_id, version: prev.version, sha256: prev.sha256 }; } catch (e) { console.log('astra-from unreadable', e.message); } }
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(mf, null, 1) + '\n');
console.log('wrote', outPath, outGlb.length, 'bytes sha256', outSha); console.log('bones', J.length, J.map(function (j) { return j.name + ':' + (counts[j.name] || 0); }).join(' '));
