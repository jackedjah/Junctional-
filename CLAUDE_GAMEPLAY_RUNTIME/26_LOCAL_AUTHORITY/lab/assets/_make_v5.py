"""Derives make_class_rig_v5.mjs from make_class_rig_v4.mjs (v4 stays untouched).
v5 = anatomical shoulder complex (CLAV -> SCAP -> UPPERARM at the glenohumeral centre), twist bones, distributed trunk (LUMBAR, SPINE2),
femoral-head hip pivots, elevation-band shoulder corrective library. Numbers come from the rig forensic (agent A) and are set below."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, 'make_class_rig_v4.mjs'), encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:70], s.count(old))
    s = s.replace(old, new)

rep("/* MAHWORLD :: GENERALIZED DERIVATIVE RIG GENERATOR v4 (2026-09-16, motion precision pass) — v3 plus:",
"""/* MAHWORLD :: GENERALIZED DERIVATIVE RIG GENERATOR v5 (2026-09-16, master convergence pass) — v4 plus the anatomical chain:
     · SHOULDER COMPLEX: CLAV -> SCAP (scapula pivot behind the ribcage) -> UPPERARM at the GLENOHUMERAL centre measured inside the
       humeral head (sphere fit of the deltoid cap, one head radius inward/down from the apex) — not a fraction of the arm column
     · TWIST: ARMTWIST_L/R / FORETWIST_L/R are PROXIMAL counter-twist carriers (weighted to the deltoid / elbow half) so the chain keeps its full rotation while the proximal skin turns only 40-45 % of it
     · DISTRIBUTED TRUNK: PELVIS -> LUMBAR -> SPINE -> SPINE2 -> CHEST -> NECK -> HEAD (7 functional segments; motion propagates)
     · HIPS: THIGH pivots at the femoral heads measured in the pelvis mass
     · CORRECTIVE LIBRARY: SH45 / SH90 / SH120 / SH150 per side (pec insertion, deltoid cap, axilla, lat-teres, scapular region) blended by
       elevation windows at runtime (MuscleLayer), replacing the single SHOULDER/AXILLA blobs
   v4 text follows (its v3 history kept).
   MAHWORLD :: GENERALIZED DERIVATIVE RIG GENERATOR v4 (2026-09-16, motion precision pass) — v3 plus:""")

rep("var BLEND = parseFloat(arg('--blend', '0.85'));", "var BLEND = parseFloat(arg('--blend', '0.85'));\nvar V5 = { gh_inward_from_threshold: parseFloat(arg('--gh-in', '0.011')), gh_below_top: parseFloat(arg('--gh-down', '0.037')), hip_h: parseFloat(arg('--hip-h', '0.4575')), hip_x: parseFloat(arg('--hip-x', '0.0568')), hip_z: parseFloat(arg('--hip-z', '0.015')), sc_x: parseFloat(arg('--sc-x', '0.012')), sc_h: parseFloat(arg('--sc-h', '0.8109')), sc_z: parseFloat(arg('--sc-z', '0.027')), scap_x: parseFloat(arg('--scap-x', '0.0618')), scap_z: parseFloat(arg('--scap-z', '-0.076')) };   /* forensic numbers (source units / H fractions) */")
# ---- tunables (filled from the forensic; source units / H fractions) ----
rep("var HIPY = CROTCH, KNEEY = ((MEAS.legs && MEAS.legs.knee_h) || (CROTCH - 0.10)) + 0.010, HIP_PIVOT = CROTCH + 0.055, DOME_TOP = HIP_PIVOT - 0.006, TIPYL",
    "var HIPY = CROTCH, KNEEY = ((MEAS.legs && MEAS.legs.knee_h) || (CROTCH - 0.10)) + 0.010, HIP_PIVOT = V5.hip_h, DOME_TOP = HIP_PIVOT - 0.006, TIPYL")

# ---- glenohumeral centre: from the deltoid cap apex, one head radius inward and down (cap apex = outermost arm vertex in the shoulder band)
rep("  L['UPPERARM_' + S] = [upX * 0.88, shY + 0.004, upZ];              /* v4: inside the humeral head under the deltoid mass (v3's 0.82 sat at the armpit line) */",
    """  /* v5: GLENOHUMERAL centre. The deltoid cap apex is the outermost point of the arm column between the shoulder line and the arm top;
     the humeral head centre sits ~one head radius inward and a little below the apex, i.e. INSIDE the head at the glenoid relation. */
  var capV = a.filter(function (i) { return vy(i) >= shY - 0.03 && vy(i) <= ARMTOP_PRE[S] + 0.01; }); var apexX = capV.length ? (sgn < 0 ? Math.min.apply(null, capV.map(vx)) : Math.max.apply(null, capV.map(vx))) : upX;
  var capTopY = capV.length ? Math.max.apply(null, capV.map(vy)) : shY + 0.05; var headR = Math.max(0.026, Math.min(0.04, 0.5 * (Math.abs(apexX) - armT)));
  L['UPPERARM_' + S] = [sgn * (armT + V5.gh_inward_from_threshold), capTopY - V5.gh_below_top, upZ];   /* forensic 2026-09-16: the deltoid dome is a sphere r 0.052 centred at the arm threshold; a head of r 0.0325 sits 0.037 under the acromion top and 0.011 outside the threshold */
  L['CAP_APEX_' + S] = [apexX, capTopY, upZ]; L['HEAD_R_' + S] = headR;""")
rep("['L', 'R'].forEach(function (S) {\n  var a = arms[S], sgn = S === 'L' ? -1 : 1, am = MEAS.arms[S];",
    "var ARMTOP_PRE = { L: MEAS.arms.L ? MEAS.arms.L.arm_top_h : shoulder.y + 0.04, R: MEAS.arms.R ? MEAS.arms.R.arm_top_h : shoulder.y + 0.04 };\n['L', 'R'].forEach(function (S) {\n  var a = arms[S], sgn = S === 'L' ? -1 : 1, am = MEAS.arms[S];")

# ---- skeleton additions after J/BI: append new joints, re-parent, tips
rep("var BI = {}; J.forEach(function (j, i) { BI[j.name] = i; });\nvar TIPS = {",
"""/* v5 chain additions (appended so every v4 index stays valid): LUMBAR / SPINE2 in the trunk, SCAP between clavicle and humerus,
   ARMTWIST / FORETWIST as distal twist carriers. Positions in source units. */
var LUMBARY = PELVISY + 0.45 * (SPINEY - PELVISY), SPINE2Y = SPINEY + 0.5 * (CHESTY - SPINEY);
J.push({ name: 'LUMBAR', parent: 1, p: [0, Y(LUMBARY), 0] }); J[2].parent = J.length - 1;                 /* PELVIS -> LUMBAR -> SPINE */
J.push({ name: 'SPINE2', parent: 2, p: [0, Y(SPINE2Y), 0] }); J[3].parent = J.length - 1;                  /* SPINE -> SPINE2 -> CHEST */
J[6].p = [-V5.sc_x, Y(V5.sc_h), V5.sc_z]; J[10].p = [V5.sc_x, Y(V5.sc_h), V5.sc_z];                        /* CLAV_L/R root at the sternoclavicular joint (manubrium top, 1 cm under the front skin) */
['L', 'R'].forEach(function (S) { var sgn = S === 'L' ? -1 : 1; var ci = S === 'L' ? 6 : 10, ui = S === 'L' ? 7 : 11, fi = S === 'L' ? 8 : 12, hi = S === 'L' ? 9 : 13;
  J.push({ name: 'SCAP_' + S, parent: ci, p: [sgn * V5.scap_x, Y(L['UPPERARM_' + S][1]), V5.scap_z] }); J[ui].parent = J.length - 1;   /* CLAV -> SCAP -> UPPERARM */
  var u = J[ui].p, f = J[fi].p, h = J[hi].p;
  J.push({ name: 'ARMTWIST_' + S, parent: ui, p: [u[0] + 0.05 * (f[0] - u[0]), u[1] + 0.05 * (f[1] - u[1]), u[2] + 0.05 * (f[2] - u[2])] });   /* proximal counter-twist carrier */
  J.push({ name: 'FORETWIST_' + S, parent: fi, p: [f[0] + 0.05 * (h[0] - f[0]), f[1] + 0.05 * (h[1] - f[1]), f[2] + 0.05 * (h[2] - f[2])] }); });
var BI = {}; J.forEach(function (j, i) { BI[j.name] = i; });
var TIPS = { PELVIS: J[BI.LUMBAR].p, LUMBAR: J[2].p, SPINE: J[BI.SPINE2].p, SPINE2: J[3].p, CLAV_L: J[7].p, CLAV_R: J[11].p, SCAP_L: J[7].p, SCAP_R: J[11].p, ARMTWIST_L: J[8].p, ARMTWIST_R: J[12].p, FORETWIST_L: J[9].p, FORETWIST_R: J[13].p,""")
rep("var GEO_AXIAL = ['PELVIS', 'SPINE', 'CHEST', 'NECK', 'HEAD', 'TAIL1', 'TAIL2', 'TAIL3'];", "var GEO_AXIAL = ['PELVIS', 'LUMBAR', 'SPINE', 'SPINE2', 'CHEST', 'NECK', 'HEAD', 'TAIL1', 'TAIL2', 'TAIL3'];")

# ---- post-binding: scapula share + twist distribution (before finalize)
rep("var FIN = finalizeWeights(W, N, BI); var bodyJ = FIN.joints, bodyW = FIN.weights;",
"""/* v5: SCAPULA territory (posterior shoulder shelf: behind the ribcage centre, outside the spine, at shoulder height) takes a share of
   CHEST / CLAV; TWIST carriers take a distal ramp of their parent's weight so axial rotation is distributed along the limb. */
(function () {
  var nScap = 0, nTw = 0;
  function segT(p, a, b) { var bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2]; var L2 = bx * bx + by * by + bz * bz; return L2 > 1e-12 ? ((p[0] - a[0]) * bx + (p[1] - a[1]) * by + (p[2] - a[2]) * bz) / L2 : 0; }
  for (var i = 0; i < N; i++) {
    var w = W[i], y = vy(i), ax = Math.abs(vx(i)), side = vx(i) < 0 ? 'L' : 'R', sgn = vx(i) < 0 ? -1 : 1;
    if (y > shoulder.y - 0.10 && y < shoulder.y + 0.07 && ax > 0.035 && ax < armT + 0.01 && vz(i) < -0.01) {
      var share = 0.45 * smoothstep3(0.035, 0.07, ax) * (1 - smoothstep3(-0.035, -0.005, vz(i))); var moved = 0;
      ['CHEST', 'CLAV_' + side, 'NECK', 'SPINE2'].forEach(function (k) { if (w[k]) { var m = w[k] * share; w[k] -= m; moved += m; } });
      if (moved > 0) { w['SCAP_' + side] = (w['SCAP_' + side] || 0) + moved; nScap++; }
    }
    if (w['UPPERARM_' + side]) { var t = segT([vx(i), P[i * 3 + 1], vz(i)], J[BI['UPPERARM_' + side]].p, J[BI['FOREARM_' + side]].p); var sh = 0.6 * (1 - smoothstep3(0.05, 0.7, t)); if (sh > 0.01) { var m1 = w['UPPERARM_' + side] * sh; w['UPPERARM_' + side] -= m1; w['ARMTWIST_' + side] = (w['ARMTWIST_' + side] || 0) + m1; nTw++; } }
    if (w['FOREARM_' + side]) { var t2 = segT([vx(i), P[i * 3 + 1], vz(i)], J[BI['FOREARM_' + side]].p, J[BI['HAND_' + side]].p); var sh2 = 0.55 * (1 - smoothstep3(0.1, 0.8, t2)); if (sh2 > 0.01) { var m2 = w['FOREARM_' + side] * sh2; w['FOREARM_' + side] -= m2; w['FORETWIST_' + side] = (w['FORETWIST_' + side] || 0) + m2; nTw++; } }
  }
  /* HUMERAL COLUMN OWNERSHIP (gate 3 of gameplay_rig_v5_gates): the skinned upper arm stretched 21 % at 170° because the ring 3-4 cm below
     the glenohumeral centre was still 40 % girdle-bound (deltoid origin) — the surface below the head must ride the humerus. Along the
     GH→elbow axis, inside 1.35× the arm radius, the arm share ramps to ≥ 95 % between t 0.04 and 0.18 (inside the head, under the cap) (taken from CLAV / SCAP / CHEST / NECK / SPINE2). */
  var nOwn = 0;
  ['L', 'R'].forEach(function (S) { var gh = J[BI['UPPERARM_' + S]].p, el = J[BI['FOREARM_' + S]].p; var axis = [el[0] - gh[0], el[1] - gh[1], el[2] - gh[2]]; var Lax = Math.hypot(axis[0], axis[1], axis[2]); axis = axis.map(function (c) { return c / Lax; }); var rArm = 0.052;
    for (var i2 = 0; i2 < N; i2++) { if ((vx(i2) < 0 ? 'L' : 'R') !== S) continue; var w2 = W[i2]; var d = [vx(i2) - gh[0], P[i2 * 3 + 1] - gh[1], vz(i2) - gh[2]]; var t = (d[0] * axis[0] + d[1] * axis[1] + d[2] * axis[2]) / Lax; if (t < 0.04 || t > 1.05) continue; var along = t * Lax; var rad = Math.sqrt(Math.max(0, d[0] * d[0] + d[1] * d[1] + d[2] * d[2] - along * along)); if (rad > 1.35 * rArm) continue;
      var armSum = 0; Object.keys(w2).forEach(function (k) { if (/^(UPPERARM|FOREARM|HAND|FINGERS|ARMTWIST|FORETWIST)_/.test(k)) armSum += w2[k]; });   /* the clavicle is girdle, not arm */ var want = 0.95 * smoothstep3(0.04, 0.18, t); if (armSum >= want) continue;
      var need = want - armSum, pool = 0; ['CLAV_' + S, 'SCAP_' + S, 'CHEST', 'NECK', 'SPINE2', 'SPINE'].forEach(function (k) { pool += w2[k] || 0; }); if (pool <= 1e-6) continue; var take = Math.min(need, pool);
      ['CLAV_' + S, 'SCAP_' + S, 'CHEST', 'NECK', 'SPINE2', 'SPINE'].forEach(function (k) { if (w2[k]) w2[k] -= take * w2[k] / pool; }); w2['UPPERARM_' + S] = (w2['UPPERARM_' + S] || 0) + take; nOwn++; } });
  console.log('v5 chain binding: scapula share', nScap, 'verts · twist carriers', nTw, '· humeral column ownership', nOwn);
})();
var FIN = finalizeWeights(W, N, BI); var bodyJ = FIN.joints, bodyW = FIN.weights;""")

# ---- hips: femoral heads at the measured pelvis mass (x = hip_x_frac of pelvis half-width from the midline)
rep("var NARROW = 0.5, ZS = 0.82, CX = 0.62 * hipHW;", "var NARROW = 0.5, ZS = 0.82, CX = V5.hip_x;   /* v5: leg columns centred on the measured femoral heads (0.27 of the 0.2104 pelvis width) */")
rep("J.push({ name: 'THIGH_' + S, parent: 1, p: [cx, Y(HIP_PIVOT), lowerZc] });   /* v4: femur head inside the pelvis */",
    "J.push({ name: 'THIGH_' + S, parent: 1, p: [cx, Y(HIP_PIVOT), V5.hip_z] });   /* v5: femoral head at the measured pelvis mass: mid-height of the widest band, just forward of its mid-depth */")

# ---- corrective library replaces SHOULDER/AXILLA
a = s.index("/* v4.1 SHOULDER CORRECTIVE (pose-space lite)"); b = s.index("/* micro-closure: AXILLA_L/R")
c = s.index("/* ---------------- textures (headless Chrome via loopback) ---------------- */")
s = s[:a] + """/* v5 SHOULDER CORRECTIVE LIBRARY — one targeted corrective per elevation band per side, blended by elevation windows at runtime
   (MuscleLayer): SH45 pec insertion + anterior deltoid fold · SH90 deltoid cap + axillary fold · SH120 axilla + lat/teres · SH150 superior
   (acromion / upper trapezius / scapular region). Each pushes its mixed-weight band out along the rest normal. Group 0 = no tension. */
['L', 'R'].forEach(function (S) {
  var sgn = S === 'L' ? -1 : 1; var jp = J[BI['UPPERARM_' + S]].p; var bUp = BI['UPPERARM_' + S], bTw = BI['ARMTWIST_' + S];
  function armW(i) { var wa = 0; for (var k = 0; k < 4; k++) if (bodyJ[i * 4 + k] === bUp || bodyJ[i * 4 + k] === bTw) wa += bodyW[i * 4 + k]; return wa; }
  function near(i, r) { var dx = vx(i) - jp[0], dy = P[i * 3 + 1] - jp[1], dz = vz(i) - jp[2]; return { d: Math.sqrt(dx * dx + dy * dy + dz * dz), dx: dx, dy: dy, dz: dz }; }
  addMuscle('SH45_' + S, 0, 0.005, function (i) { if (Math.sign(vx(i)) !== sgn) return 0; var q = near(i, 0.10); if (q.d > 0.10 || q.dz < -0.005) return 0; var wa = armW(i); var mix = 4 * wa * (1 - wa); return mix * smoothstep(-0.005, 0.03, q.dz) * (1 - smoothstep(0.06, 0.10, q.d)); });
  addMuscle('SH90_' + S, 0, 0.007, function (i) { if (Math.sign(vx(i)) !== sgn) return 0; var q = near(i, 0.11); if (q.d > 0.11) return 0; var wa = armW(i); var mix = 4 * wa * (1 - wa); return mix * mix * (1 - smoothstep(0.07, 0.11, q.d)); });
  addMuscle('SH120_' + S, 0, 0.006, function (i) { if (Math.sign(vx(i)) !== sgn) return 0; var q = near(i, 0.09); if (q.d > 0.09 || q.dy > 0.012 || q.dz > 0.015) return 0; var wa = armW(i); var under = smoothstep(0.012, -0.03, q.dy) * 0.6 + 0.4; var mixed = Math.min(1, 1.6 * wa * (1 - wa) + 0.2); return under * mixed * (1 - smoothstep(0.055, 0.09, q.d)); });
  addMuscle('SH150_' + S, 0, 0.006, function (i) { if (Math.sign(vx(i)) !== sgn) return 0; var q = near(i, 0.10); if (q.d > 0.10 || q.dy < -0.01) return 0; var wa = armW(i); var top = smoothstep(-0.01, 0.03, q.dy); var mixed = Math.min(1, 1.4 * wa * (1 - wa) + 0.25); return top * mixed * (1 - smoothstep(0.05, 0.10, q.d)); });
});
""" + s[c:]

rep("generator: 'MAHWORLD make_class_rig_v4.mjs (measured joints + geodesic binding + arm refinement; smoothed split legs with femur-head pivot; muscle morphs; source geometry untouched)'",
    "generator: 'MAHWORLD make_class_rig_v5.mjs (anatomical shoulder complex + twist + distributed trunk + femoral-head hips + corrective library; source geometry untouched)'")
rep("rig_generator: 'make_class_rig_v4.mjs', hip_pivot_h: HIP_PIVOT, knee_h: KNEEY,",
    "rig_generator: 'make_class_rig_v5.mjs', rig_chain: 'PELVIS>LUMBAR>SPINE>SPINE2>CHEST>NECK>HEAD; CLAV>SCAP>UPPERARM>ARMTWIST; FOREARM>FORETWIST', glenohumeral: { L: L.UPPERARM_L, R: L.UPPERARM_R, cap_apex_L: L.CAP_APEX_L, head_radius_L: L.HEAD_R_L }, v5: V5, hip_pivot_h: HIP_PIVOT, knee_h: KNEEY,")
open(os.path.join(HERE, 'make_class_rig_v5.mjs'), 'w', encoding='utf-8').write(s)
print('written', len(s))
