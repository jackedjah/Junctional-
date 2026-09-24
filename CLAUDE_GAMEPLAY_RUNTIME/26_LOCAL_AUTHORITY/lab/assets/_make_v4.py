"""Derives make_class_rig_v4.mjs from make_class_rig_v3.mjs (v3 stays untouched)."""
import io, os
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, 'make_class_rig_v3.mjs'), encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:70], s.count(old))
    s = s.replace(old, new)

rep("/* MAHWORLD :: GENERALIZED DERIVATIVE RIG GENERATOR v3 (2026-09-15, rig-motion repair)",
"""/* MAHWORLD :: GENERALIZED DERIVATIVE RIG GENERATOR v4 (2026-09-16, motion precision pass) — v3 plus:
     · SPLIT LEGS from rig_legs_v4.mjs: smoothed cross-section profile (no stair-step ledges on the shin front), a hip dome that
       continues into the pelvis, dense knee rings; the THIGH bone pivots at the femur head (crotch + 0.055 H) instead of the split line
     · KNEE at the measured narrowing + 0.010 H (the small knee volume immediately above the metallic shin), knee blend ±0.02 H
     · ARM BINDING refinement: beyond the armpit the axial bones (CHEST/SPINE/NECK) are removed from the arm column and the deltoid
       cap is handed to the humerus (dev_0.7 measured: upper arm 21 % CHEST, elbow 13 % CHEST, deltoid cap only 46-60 % UPPERARM —
       the cap stayed put while the arm rose). NECK gets its own column above the shoulder shelf.
     · MUSCLE LAYER 2: sparse morph targets on the body (BICEPS/TRICEPS/DELTOID/PEC/LAT/FOREARM L+R, TRAP, ABS) built from the
       measured landmarks, and a per-vertex `_MUSCLE` group id attribute for the runtime tension mask (layer 3).
   v3 text follows; the v3 file is kept unchanged.
   MAHWORLD :: GENERALIZED DERIVATIVE RIG GENERATOR v3 (2026-09-15, rig-motion repair)""")
rep("import { buildLegs, makeUvLookup } from './rig_legs.mjs';", "import { makeUvLookup } from './rig_legs.mjs'; import { buildLegsV4 } from './rig_legs_v4.mjs';")

rep("var HIPY = CROTCH, KNEEY = (MEAS.legs && MEAS.legs.knee_h) || (CROTCH - 0.10), TIPYL",
    "var HIPY = CROTCH, KNEEY = ((MEAS.legs && MEAS.legs.knee_h) || (CROTCH - 0.10)) + 0.010, HIP_PIVOT = CROTCH + 0.055, DOME_TOP = HIP_PIVOT - 0.006, TIPYL")

rep("var FIN = finalizeWeights(W, N, BI); var bodyJ = FIN.joints, bodyW = FIN.weights;",
"""/* ---------------- v4: arm column + deltoid cap + neck refinement (measured defects of dev_0.7, see header) ---------------- */
var AXIAL_BONE = /^(PELVIS|SPINE|CHEST|NECK|HEAD|TAIL1|TAIL2|TAIL3)$/;
function renorm(w) { var s = 0; Object.keys(w).forEach(function (k) { if (w[k] < 1e-4) delete w[k]; else s += w[k]; }); if (s > 0) Object.keys(w).forEach(function (k) { w[k] /= s; }); return s; }
(function () {
  var fixedArm = 0, fixedCap = 0, fixedNeck = 0;
  for (var i = 0; i < N; i++) {
    var y = vy(i), ax = Math.abs(vx(i)), side = vx(i) < 0 ? 'L' : 'R', w = W[i];
    /* 1. beyond the armpit the arm column belongs to the arm: fade the axial bones out between armT and armT + 0.025 */
    if (y > armLow && y < ARMTOP[side] + 0.02 && ax > armT) {
      var keep = 1 - smoothstep3(armT, armT + 0.025, ax);          /* 1 at the armpit line -> 0 out on the limb */
      var moved = 0; Object.keys(w).forEach(function (k) { if (AXIAL_BONE.test(k)) { var m = w[k] * (1 - keep); w[k] -= m; moved += m; } });
      if (moved > 0) { var armSum = 0; Object.keys(w).forEach(function (k) { if (ARM_BONE.test(k)) armSum += w[k]; }); if (armSum > 1e-6) Object.keys(w).forEach(function (k) { if (ARM_BONE.test(k)) w[k] += moved * w[k] / armSum; }); else w['UPPERARM_' + side] = (w['UPPERARM_' + side] || 0) + moved; fixedArm++; }
    }
    /* 2. deltoid cap rides the humerus: outside the torso column, over the shoulder band, UPPERARM 0.55 -> 0.90 outward */
    if (y > shoulder.y - 0.02 && y < ARMTOP[side] + 0.015 && ax > DELT_X) {
      var t = smoothstep3(DELT_X, DELT_X + 0.02, ax); var target = 0.55 + 0.35 * t; var cur = w['UPPERARM_' + side] || 0;
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
var FIN = finalizeWeights(W, N, BI); var bodyJ = FIN.joints, bodyW = FIN.weights;""")

a = s.index("function legWeights(y) {"); b = s.index("var lowerPts = hipBand.map(")
s = s[:a] + """function legWeights(y) {   /* v4: the knee blends over ±0.02 H around the measured knee (a joint's own diameter); the thigh owns everything up to the dome */
  var h = (y - minY) / H, kb = 0.020, tipC = TIPYL + 0.30 * (KNEEY - TIPYL), tb = Math.max(0.03, 0.4 * (KNEEY - TIPYL));
  var thigh = smoothstep(KNEEY - kb, KNEEY + kb, h), tip = 1 - smoothstep(tipC - tb, tipC + tb, h), shin = Math.max(0, 1 - thigh - tip);
  return { thigh: thigh, shin: shin, tip: tip };
}
""" + s[b:]
rep("var lowerPts = hipBand.map(function (i) { return { x: vx(i), y: P[i * 3 + 1], z: vz(i), h: vy(i) }; });",
    "var axialPts = slice(0.0, DOME_TOP + 0.03, function (i) { return Math.abs(vx(i)) < armT; }).map(function (i) { return { x: vx(i), y: P[i * 3 + 1], z: vz(i), h: vy(i) }; });   /* v4: pelvis + lower body sections for the loft */")
rep("var LEGS = buildLegs(lowerPts, { minY: minY, H: H, narrow: NARROW, zs: ZS, cx: CX, hipH: HIPY - 0.005, kneeH: KNEEY, tipH: Math.max(0.006, TIPYL - 0.035), seg: 22 }, uvOf);",
    "var LEGS = buildLegsV4(axialPts, { minY: minY, H: H, narrow: NARROW, zs: ZS, cx: CX, domeTop: DOME_TOP, splitH: HIPY, kneeH: KNEEY, tipH: Math.max(0.006, TIPYL - 0.035), seg: 24, sigma: 0.010 }, uvOf);\nconsole.log('leg profile (h:hw/hd/zc)', LEGS.profile.filter(function (r, i) { return i % 6 === 0; }).map(function (r) { return r.h + ':' + r.hw + '/' + r.hd + '/' + r.zc; }).join(' '));")
rep("J.push({ name: 'THIGH_' + S, parent: 1, p: [cx, Y(HIPY - 0.005), lowerZc] });",
    "J.push({ name: 'THIGH_' + S, parent: 1, p: [cx, Y(HIP_PIVOT), lowerZc] });   /* v4: femur head inside the pelvis */")

rep("/* ---------------- textures (headless Chrome via loopback) ---------------- */",
"""/* ---------------- v4: MUSCLE LAYER 2 — sparse morph targets on the body from the measured landmarks ----------------
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
/* ---------------- textures (headless Chrome via loopback) ---------------- */""")

rep("var ibm = new Float32Array(J.length * 16);",
"""function addSparse(count, verts, deltas) {   /* sparse VEC3 float accessor with no base bufferView (zeros) */
  var iv = addView(Buffer.from(new Uint32Array(verts).buffer)), vv = addView(Buffer.from(new Float32Array(deltas).buffer));
  var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (var q = 0; q < deltas.length; q += 3) for (var c = 0; c < 3; c++) { if (deltas[q + c] < mn[c]) mn[c] = deltas[q + c]; if (deltas[q + c] > mx[c]) mx[c] = deltas[q + c]; }
  if (!verts.length) { mn = [0, 0, 0]; mx = [0, 0, 0]; }
  accessors.push({ componentType: 5126, count: count, type: 'VEC3', min: mn, max: mx, sparse: { count: verts.length, indices: { bufferView: iv, componentType: 5125 }, values: { bufferView: vv } } }); return accessors.length - 1;
}
A.muscleTargets = MUSCLES.map(function (m) { return { POSITION: addSparse(bodyPos.length / 3, m.verts, m.deltas) }; });
A.bmuscle = addAcc(new Float32Array(MGROUP), 'SCALAR', 5126, 34962);
var ibm = new Float32Array(J.length * 16);""")
rep("attributes: { POSITION: A.bpos, NORMAL: A.bnorm, TEXCOORD_0: A.buv, JOINTS_0: A.bj, WEIGHTS_0: A.bw }, indices: A.upperIdx, material: 0, extras: { role: 'upper' } }, { attributes: { POSITION: A.bpos, NORMAL: A.bnorm, TEXCOORD_0: A.buv, JOINTS_0: A.bj, WEIGHTS_0: A.bw }, indices: A.lowerIdx, material: 0, extras: { role: 'fused_lower' } }] },",
    "attributes: { POSITION: A.bpos, NORMAL: A.bnorm, TEXCOORD_0: A.buv, JOINTS_0: A.bj, WEIGHTS_0: A.bw, _MUSCLE: A.bmuscle }, indices: A.upperIdx, material: 0, targets: A.muscleTargets, extras: { role: 'upper' } }, { attributes: { POSITION: A.bpos, NORMAL: A.bnorm, TEXCOORD_0: A.buv, JOINTS_0: A.bj, WEIGHTS_0: A.bw, _MUSCLE: A.bmuscle }, indices: A.lowerIdx, material: 0, targets: A.muscleTargets, extras: { role: 'fused_lower' } }], weights: MUSCLES.map(function () { return 0; }), extras: { targetNames: MUSCLES.map(function (m) { return m.name; }) } },")
rep("generator: 'MAHWORLD make_class_rig_v3.mjs (measured joints + geodesic binding; split legs; source geometry untouched)'",
    "generator: 'MAHWORLD make_class_rig_v4.mjs (measured joints + geodesic binding + arm refinement; smoothed split legs with femur-head pivot; muscle morphs; source geometry untouched)'")
rep("preview_status: 'DEVELOPMENT_PREVIEW_UNAPPROVED (measured derivative auto-rig v3:",
    "rig_generator: 'make_class_rig_v4.mjs', hip_pivot_h: HIP_PIVOT, knee_h: KNEEY, muscles: MUSCLES.map(function (m) { return { name: m.name, group: m.group, verts: m.verts.length }; }), muscle_attribute: '_MUSCLE', preview_status: 'DEVELOPMENT_PREVIEW_UNAPPROVED (measured derivative auto-rig v4: v3 +")
open(os.path.join(HERE, 'make_class_rig_v4.mjs'), 'w', encoding='utf-8').write(s)
print('written', len(s))
