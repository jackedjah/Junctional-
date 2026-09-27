import { ridgeStations, ridgeFaceSegment } from './ridgeLayout.js';
import { ridgeWarpField, REACH_IN } from './ridgeSculpt.js'; import { ridgeKeep, ridgeRockDsp } from './macro.js';
import { mergeVertices, toCreasedNormals } from '../../vendor/three/BufferGeometryUtils.js';

/* MAHWORLD M20 :: RIDGE CRAGS — non-collision rock that changes the NEAR ridge's SILHOUETTE (owner 2026-09-27, priority 2: "rock / mountain
   smoothing and realism where still too sharp"; reinforcement: "bias away from overuse of hard planar cliff logic … chunky forms and exposed
   primitive geometry … too sharp, too geometric, too raw, too placeholder").
   Round 1 of the M20 mountains changed the ridge's LIGHT (massif normals, fracture planes, bent strata) but no OUTLINE: inside the ±300 m reach
   square the ribbon's inner face is the host's collision plane (bit-identical, gameplay_world_m19_mountains 7) and the sculpt may not touch it,
   so the seeded station fins still stood as ruled pyramids (V27 / V04 / CL1), flat-topped blocks (V05 / V12) and slab walls (V06). Nothing here
   moves a ribbon vertex; rock is laid ON the ridge, continuous with it:
     CREST CAP   a strip of rock riding every crest edge — towers every ≈ 15–30 m with notches between (a ridged profile on world position, so two
                 edges meeting at a summit agree), a crest line that wanders a little in plan, flanks that bulge out of the faces just under the
                 crest and run back into them lower down. Its shoulders lie on the face itself and take the ridge mesh's own normal and colour
                 there, so the cap grows out of the face without a seam: the razor crest and the ruled pyramid edge become a broken, towered ridge;
     LEDGES      on the big faces (≥ 60 m), one or two broken shoulder benches 2.5–6 m proud, 35–70 % up — edge-on they step a block's straight
                 flank, face-on they are a ledge with its shadow; pieces of a station span, tapering at both ends, their depth wandering;
     NOSE RIBS   on the tall fin apexes, a knuckled buttress down the nose (the convex fold from the apex toward the foot), proud of both faces it
                 joins and tapering into them — the ruled centre edge of each pyramid reads as a spur.
   The first cut (discrete sphere-born boulders along the crest and down the noses) read as studs, battlements and warts stuck on the faces
   (it1 / CL2 / V05); the strips replace it. It shares the NEAR ridge's own material (the same world-space geology: strata, joints, fracture
   planes, the rock detail map and snow run on from the face into the cap).
   HOST SAFETY (hard rule 4): scenery, no collider. Every vertex inside the reach square (max(|x|, |z|) < REACH_IN + 4) sits ≥ 6 m up (the rule is
   3.4 m; the Veil cliff crystals are the precedent for art on the in-reach face); nothing where the crest is under 18 m (the pass floors and
   their ramps: whatever stands over a pass stands ≥ 5.4 m over its floor + 3.4 m), nothing on the Veil falls face (the curtain's stations ± 4 and
   every keep circle × 2.2 + 30 m: the lead's) or at the north fall's lip; the collision face is untouched (gameplay_world_m19_mountains 12).
   Beyond the reach square the cap rides the sculpted crest (every point goes through the sculpt's own warp). Tiers: HIGH a section every 3 m
   (8 points), MED every 5 m (6 points), LOW nothing (tier law: LOW never heavier). One draw call (HIGH / MED), the ridge's program. */
var TAU = Math.PI * 2;
function seeded(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function lerp3(A, B, t) { return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, z: A.z + (B.z - A.z) * t }; }
function sub(A, B) { return { x: A.x - B.x, y: A.y - B.y, z: A.z - B.z }; }
function addS(A, B, s) { return { x: A.x + B.x * s, y: A.y + B.y * s, z: A.z + B.z * s }; }
function dot(A, B) { return A.x * B.x + A.y * B.y + A.z * B.z; }
function nrm3(A) { var l = Math.hypot(A.x, A.y, A.z) || 1; return { x: A.x / l, y: A.y / l, z: A.z / l }; }
function crossV(A, B) { return { x: A.y * B.z - A.z * B.y, y: A.z * B.x - A.x * B.z, z: A.x * B.y - A.y * B.x }; }
function sstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function hash2(i, j, s) { var h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vn2(x, z, s) { var i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz); var a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s); return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; }
export var CRAG_MIN_Y = 6;   /* every crag vertex inside the reach square stays at least this high (host rule: 3.4 m) */

/* The strips for one ridge (pure: Node-testable). Returns [{ role: 'cap' | 'ledge' | 'rib', sections: [[{x, y, z}, …], …] }]. */
export function ridgeCragStrips(R, idx, stations, keepOut, tier, veilSpan) {
  var N = stations.length - 1, out = [], HI = tier === 'HIGH', field = ridgeWarpField(R, stations, idx, keepOut), step = HI ? 3 : 5, sd = 0x5A17 + (idx || 0) * 97;
  function W(P) { var w = field.warp(P.x, P.y, P.z); return { x: w[0], y: w[1], z: w[2] }; }
  function fade(x, z, h) { var f = sstep(18, 32, h);   /* no cap on the low crest (the pass floors and their ramps: the routes stay clear) */
    for (var q = 0; q < keepOut.length; q++) f *= sstep(keepOut[q].r * 2.2 + 30, keepOut[q].r * 2.2 + 55, Math.hypot(x - keepOut[q].x, z - keepOut[q].z)); return f; }
  function inVeil(k) { return veilSpan && k >= veilSpan[0] - 4 && k <= veilSpan[1] + 4; }
  var passes = R.passes || [];
  function bad(Q) { for (var q = 0; q < keepOut.length; q++) if (Math.hypot(Q.x - keepOut[q].x, Q.z - keepOut[q].z) < keepOut[q].r * 2.2 + 34) return true;   /* a keep circle (the falls' lips and faces) */
    var b = Math.atan2(Q.x, Q.z); for (var p = 0; p < passes.length; p++) { var d = Math.abs(((b - passes[p].bearing_rad) % TAU + TAU * 1.5) % TAU - Math.PI); if (d < passes[p].half_width_rad * 1.05 && Q.y < passes[p].floor_m + 6) return true; } return false; }   /* low over a pass (its route) */
  function run(role, list) { var cur = []; list.forEach(function (sec) { if (!sec || sec.some(bad)) { if (cur.length > 1) out.push({ role: role, sections: cur }); cur = []; } else cur.push(sec); }); if (cur.length > 1) out.push({ role: role, sections: cur }); }   /* a strip runs only through clean sections */
  function towers(x, z) { var r = 1 - Math.abs(2 * vn2(x / 24, z / 24, sd) - 1), pr = 0.7 * Math.pow(r, 1.2) + 0.3 * vn2(x / 60, z / 60, sd + 1); return 0.15 + 0.85 * sstep(0.12, 0.72, pr) + 0.08 * (vn2(x / 6, z / 6, sd + 2) - 0.5); }   /* broad, flat-shouldered towers every ≈ 20–40 m (they must read at 300 m), notches between */
  function outerTop(F, a, b) { var rA = Math.hypot(a.x, a.z) || 1, rB = Math.hypot(b.x, b.z) || 1, hA = Math.max(2, a.h), hB = Math.max(2, b.h);   /* macro.js's uo rows, exactly */
    return [ridgeRockDsp(lerp3(F.outerA, F.crestA, 0.72), -a.x / rA, -a.z / rA, hA * 0.09, idx + 4), ridgeRockDsp(lerp3(F.outerB, F.crestB, 0.72), -b.x / rB, -b.z / rB, hB * 0.09, idx + 4)]; }
  /* CREST CAP */
  for (var k = 0; k < N; k++) { if (inVeil(k)) continue; var F = ridgeFaceSegment(stations, k), a = F.a, b = F.b; if (Math.min(a.h, b.h) < 18) continue;
    var UO = outerTop(F, a, b), L = Math.hypot(F.crestB.x - F.crestA.x, F.crestB.z - F.crestA.z), n = Math.max(2, Math.round(L / step)), secs = [];
    var nI = nrm3(crossV(sub(F.crestA, F.innerA), sub(F.crestB, F.innerA))); if (nI.x * F.ox + nI.z * F.oz > 0) nI = { x: -nI.x, y: -nI.y, z: -nI.z };   /* the inner face's outward normal (toward the ring centre) */
    var nO = nrm3(crossV(sub(F.crestB, UO[0]), sub(F.crestA, UO[0]))); if (nO.x * F.ox + nO.z * F.oz < 0) nO = { x: -nO.x, y: -nO.y, z: -nO.z };
    for (var j = 0; j <= n; j++) { var t = j / n, C = lerp3(F.crestA, F.crestB, t), hl = C.y, fd = fade(C.x, C.z, hl), amp = Math.max(5, Math.min(22, hl * 0.14)) * fd, H = amp * towers(C.x, C.z) * (0.5 + 0.5 * sstep(0, 0.14, Math.min(t, 1 - t)));   /* each run eases down toward the station folds (the neighbouring run meets it there, both closed) */
      if (fd <= 0.02) { secs.push(null); continue; } var uo = lerp3(UO[0], UO[1], t),   /* the cap runs only where it stands (a run ends at a pass, a keep circle or the low crest) */ Di = 0.8 * H + 1.5, Do = 0.6 * H + 1.5, Si = addS(C, sub(F.innerA, C), Di / Math.max(4, C.y - F.innerA.y)), So = addS(C, sub(uo, C), Do / Math.max(3, C.y - uo.y));
      var wob = (vn2(C.x / 11, C.z / 11, sd + 3) - 0.5) * 0.35 * H, hw = 0.3 * H * (0.7 + 0.6 * vn2(C.x / 13, C.z / 13, sd + 6)) + 0.6, hI = Math.hypot(nI.x, nI.z) || 1, Tc = { x: C.x + nI.x * wob, y: C.y + H, z: C.z + nI.z * wob };
      var Ti = { x: Tc.x + nI.x / hI * hw, y: Tc.y - 0.06 * H, z: Tc.z + nI.z / hI * hw }, To = { x: Tc.x - nI.x / hI * hw, y: Tc.y - 0.12 * H * vn2(C.x / 5, C.z / 5, sd + 7), z: Tc.z - nI.z / hI * hw }, bI = 0.22 * H * (0.6 + 0.8 * vn2(C.x / 7, C.z / 7, sd + 4)), bO = 0.12 * H;   /* a broken top ≈ 0.6 × its height wide, not a blade */
      var sec = HI ? [Si, addS(lerp3(Si, Ti, 0.35), nI, bI * 0.55), addS(lerp3(Si, Ti, 0.72), nI, bI), Ti, To, addS(lerp3(So, To, 0.7), nO, bO), addS(lerp3(So, To, 0.32), nO, bO * 0.5), So] : [Si, addS(lerp3(Si, Ti, 0.6), nI, bI), Ti, To, addS(lerp3(So, To, 0.6), nO, bO), So];
      secs.push(sec.map(function (P, pi) { var Q = W(P); if (pi === 0) { Q.x += nI.x * 0.12; Q.y += nI.y * 0.12; Q.z += nI.z * 0.12; } else if (pi === sec.length - 1) { Q.x += nO.x * 0.25; Q.y += nO.y * 0.25; Q.z += nO.z * 0.25; } return Q; })); }   /* the shoulders a hair proud of the faces (no z-fight) */
    run('cap', secs); }
  /* SHOULDER LEDGES on the big faces (the NW / NE blocks and the tall fins): one or two broken rock benches jutting 2.5–6 m from the face on a
     bed ≈ 35–70 % up — seen edge-on at a block's flank they step its straight wall into shoulders; seen face-on, a ledge with its shadow under it.
     Pieces of 35–75 % of a station span, tapering at both ends, depth wandering along them (never a ruled plate). */
  function facePt(F, y, t) { var fa = (y + 4) / (F.crestA.y + 4), fb = (y + 4) / (F.crestB.y + 4), PA = lerp3(F.innerA, F.crestA, fa), PB = lerp3(F.innerB, F.crestB, fb), Pd = lerp3(F.innerA, F.crestB, fb);   /* the horizontal section of the two authored triangles: innerA–crestA edge → the diagonal → innerB–crestB edge */
    var dA = Math.hypot(Pd.x - PA.x, Pd.z - PA.z), dB = Math.hypot(PB.x - Pd.x, PB.z - Pd.z), s = t * (dA + dB); return s <= dA ? lerp3(PA, Pd, dA ? s / dA : 0) : lerp3(Pd, PB, dB ? (s - dA) / dB : 1); }
  for (var k2 = 0; k2 < N; k2++) { if (inVeil(k2)) continue; var F2 = ridgeFaceSegment(stations, k2), hm = Math.min(F2.a.h, F2.b.h); if (hm < 60) continue; var rl = seeded(sd + 7000 + k2 * 17), nL2 = hm > 110 ? 2 : 1, used = [];
    var nI2 = nrm3(crossV(sub(F2.crestA, F2.innerA), sub(F2.crestB, F2.innerA))); if (nI2.x * F2.ox + nI2.z * F2.oz > 0) nI2 = { x: -nI2.x, y: -nI2.y, z: -nI2.z };
    for (var li = 0; li < nL2; li++) { var fr = 0.35 + 0.35 * rl(), t0 = 0.05 + 0.3 * rl(), t1 = Math.min(0.95, t0 + 0.35 + 0.4 * rl()), dMax = Math.max(2.5, Math.min(6, hm * 0.035)) * (0.8 + 0.4 * rl()); if (rl() < 0.3 || used.some(function (u) { return Math.abs(u - fr) < 0.2; })) continue; used.push(fr);
      var yb = fr * hm, Lg = Math.hypot(F2.crestB.x - F2.crestA.x, F2.crestB.z - F2.crestA.z) * (t1 - t0), m2 = Math.max(3, Math.round(Lg / step)), secs3 = [], fd3 = fade(F2.crestA.x, F2.crestA.z, hm); if (fd3 < 0.05) continue;
      for (var i3 = 0; i3 <= m2; i3++) { var t = t0 + (t1 - t0) * i3 / m2, Fp3 = facePt(F2, yb, t), tpr = sstep(0, 0.14, (t - t0) / (t1 - t0)) * sstep(0, 0.14, (t1 - t) / (t1 - t0)), d = dMax * tpr * (0.6 + 0.8 * vn2(Fp3.x / 8, Fp3.z / 8, sd + 9)) * fd3 + 0.05;
        var up = facePt(F2, yb + 1.1 * d + 0.3, t), dn = facePt(F2, yb - 1.3 * d - 0.3, t);
        secs3.push([addS(dn, nI2, 0.1), addS(addS(Fp3, nI2, 0.75 * d), { x: 0, y: 1, z: 0 }, -0.45 * d), addS(addS(Fp3, nI2, d), { x: 0, y: 1, z: 0 }, 0.05 * d), addS(addS(Fp3, nI2, 0.85 * d), { x: 0, y: 1, z: 0 }, 0.35 * d), addS(up, nI2, 0.1)].map(W)); }
      run('ledge', secs3); } }
  /* NOSE RIBS on the tall fin apexes (inward of both neighbours) */
  for (var s = 0; s < N; s++) { if (inVeil(s) || inVeil((s + N - 1) % N)) continue; var sP = stations[(s + N - 1) % N], sN = stations[s + 1], s0 = stations[s], r0 = Math.hypot(s0.x, s0.z);
    if (s0.h < 45 || !(r0 < Math.min(Math.hypot(sP.x, sP.z), Math.hypot(sN.x, sN.z)) - 4)) continue;
    var FR = ridgeFaceSegment(stations, s), FL = ridgeFaceSegment(stations, (s + N - 1) % N), In = FR.innerA, Cr = FR.crestA, e = sub(Cr, In), el2 = dot(e, e);
    var qL = sub(FL.innerA, In), qR = sub(FR.crestB, In), dL = nrm3(addS(qL, e, -dot(qL, e) / el2)), dR = nrm3(addS(qR, e, -dot(qR, e) / el2));   /* across each face, square to the fold */
    var nL = nrm3(crossV(e, dL)), nR = nrm3(crossV(dR, e)); if (nL.x * FL.ox + nL.z * FL.oz > 0) nL = { x: -nL.x, y: -nL.y, z: -nL.z }; if (nR.x * FR.ox + nR.z * FR.oz > 0) nR = { x: -nR.x, y: -nR.y, z: -nR.z };
    var bis = nrm3({ x: nL.x + nR.x, y: nL.y + nR.y, z: nL.z + nR.z }), sLo = Math.max(0.26, 18 / (s0.h + 4)), sHi = 0.97, m = Math.max(4, Math.round((sHi - sLo) * Math.sqrt(el2) / (step * 1.4))), secs2 = [], rs = seeded(sd + s * 31);
    var wMax = Math.max(4, Math.min(14, s0.h * 0.09)) * (0.8 + 0.4 * rs()), bMax = Math.max(3, Math.min(10, s0.h * 0.06)) * (0.8 + 0.4 * rs()), fdR = fade(Cr.x, Cr.z, s0.h); if (fdR < 0.05) continue;
    for (var i = 0; i <= m; i++) { var u = sLo + (sHi - sLo) * i / m, Fp = lerp3(In, Cr, u), tp = sstep(sLo, sLo + 0.22, u) * (0.6 + 0.7 * vn2(Fp.x / 9, Fp.y / 9, sd + 5)) * fdR,   /* a knuckled spur, not a tube */ w = wMax * (0.55 + 0.45 * tp), B = bMax * tp;
      var Lp = addS(addS(Fp, dL, w), nL, 0.12), Rp = addS(addS(Fp, dR, w), nR, 0.12), Tp2 = addS(Fp, bis, B);
      secs2.push([Lp, addS(lerp3(Lp, Tp2, 0.55), nL, B * 0.35), Tp2, addS(lerp3(Rp, Tp2, 0.55), nR, B * 0.35), Rp].map(W)); }
    run('rib', secs2); }
  return out;
}

/* One rock body, in world space: { pos, nrm, col } arrays (non-indexed, creased normals) — used by the coast's island outcrops (a geodesic
   sphere lumped by a low noise, cut by three to five fracture planes at random attitudes, tapered; the planes keep crisp arrises). */
export function rockBlock(THREE, B, detail, rock, peak, hMax) {
  var rnd = seeded(Math.floor(B.sd * 7919) + 17), g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); var gm = mergeVertices(g, 1e-4); g.dispose(); g = gm;
  var P = g.attributes.position, cuts = [], o1 = rnd() * 9, o2 = rnd() * 9, o3 = rnd() * 9;
  for (var c = 0; c < B.cuts; c++) { var th = rnd() * TAU, el = c === 0 ? 0.75 + 0.6 * rnd() : (rnd() - 0.4) * 1.1; cuts.push([Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el), c === 0 ? 0.5 + 0.25 * rnd() : 0.62 + 0.25 * rnd()]); }   /* the first plane shears the top, the rest split the flanks */
  function lump(x, y, z) { return Math.sin(x * 2.1 + o1) * Math.sin(y * 1.7 + o2) * Math.sin(z * 2.3 + o3) * 0.5 + Math.sin(x * 4.3 - o2) * Math.sin(y * 3.9 + o3) * Math.sin(z * 4.1 - o1) * 0.25; }
  for (var i = 0; i < P.count; i++) { var x = P.getX(i), y = P.getY(i), z = P.getZ(i), m = 1 + 0.16 * lump(x, y, z); x *= m; y *= m; z *= m;
    for (var q = 0; q < cuts.length; q++) { var C = cuts[q], s = x * C[0] + y * C[1] + z * C[2] - C[3]; if (s > 0 && y > -0.35) { x -= C[0] * s; y -= C[1] * s; z -= C[2] * s; } }
    var tp = 1 - B.taper * (y + 1) * 0.5; x *= tp; z *= tp; P.setXYZ(i, x * B.a, y * B.H * 0.5, z * B.b); }
  var m4 = new THREE.Matrix4().compose(new THREE.Vector3(B.x, B.y, B.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(B.lean, B.yaw, B.roll, 'YXZ')), new THREE.Vector3(1, 1, 1)); g.applyMatrix4(m4); g.computeVertexNormals();
  var gc = toCreasedNormals(g, 48 * Math.PI / 180); if (gc !== g) g.dispose();
  var p = gc.attributes.position, n = gc.attributes.normal, pos = [], nrm = [], col = [], cT = new THREE.Color(), tone = 0.95 + 0.14 * rnd();
  for (var v = 0; v < p.count; v++) { var py = p.getY(v), tH = Math.max(0, Math.min(1, py / hMax)); cT.copy(rock).lerp(peak, tH * tH * 0.3).multiplyScalar(tone); pos.push(p.getX(v), py, p.getZ(v)); nrm.push(n.getX(v), n.getY(v), n.getZ(v)); col.push(cT.r, cT.g, cT.b); }
  gc.dispose(); return { pos: pos, nrm: nrm, col: col };
}

export function createRidgeCrags(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }, mesh = null, own = [], info = { strips: 0, caps: 0, ledges: 0, ribs: 0, tris: 0, draw_calls: 0 };
  function tier() { try { return ctx.quality && ctx.quality.tier ? ctx.quality.tier() : 'MED'; } catch (e) { return 'MED'; } }
  function build() { var T = tier(), reg = ctx.registry, M = reg && reg.macro; if (!M || T === 'LOW') { log('ridgeCrags: ' + (M ? 'LOW tier — none' : 'no registry.macro')); return; }
    var mi = (M.mountains || []).findIndex(function (R) { return R.id === 'RIDGE_NEAR'; }); if (mi < 0) return; var R = M.mountains[mi], stations = ridgeStations(R, mi), keep = ridgeKeep(M, R, stations);
    var VW = (M.waterfalls || []).filter(function (W) { return W.style === 'VEIL' && W.source_id === R.id && W.curtain; })[0], strips = ridgeCragStrips(R, mi, stations, keep, T, VW ? [VW.curtain.from, VW.curtain.to] : null);
    var ridge = ctx.group && ctx.group.getObjectByName ? ctx.group.getObjectByName('MACRO_RIDGE_' + R.id) : null, mat = ridge ? ridge.material : null;   /* the NEAR ridge's own material: the same program, geology and night switch */
    /* the ridge mesh's own shading at the seams: its nearest vertex normal / colour (a 6 m hash of the ribbon's upper vertices) */
    var HS = {}, rp = ridge ? ridge.geometry.attributes.position : null, rn = ridge ? ridge.geometry.attributes.normal : null, rc = ridge ? ridge.geometry.attributes.color : null;
    if (rp) for (var v = 0; v < rp.count; v++) { if (rp.getY(v) < 8) continue; var key = Math.floor(rp.getX(v) / 6) + ',' + Math.floor(rp.getZ(v) / 6); (HS[key] = HS[key] || []).push(v); }
    function nearest(x, y, z) { var best = -1, bd = 1e9, cx = Math.floor(x / 6), cz = Math.floor(z / 6); for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) { var L = HS[(cx + i) + ',' + (cz + j)]; if (!L) continue; for (var q = 0; q < L.length; q++) { var w = L[q], d = (rp.getX(w) - x) * (rp.getX(w) - x) + (rp.getY(w) - y) * (rp.getY(w) - y) + (rp.getZ(w) - z) * (rp.getZ(w) - z); if (d < bd) { bd = d; best = w; } } } return bd < 144 ? best : -1; }
    var rock = new THREE.Color(R.color_base).lerp(new THREE.Color(R.color_peak), 0.2), peak = new THREE.Color(R.color_peak), cT = new THREE.Color(), cR = new THREE.Color(), pos = [], nrm = [], col = [];
    strips.forEach(function (S) { var secs = S.sections, P = secs[0].length, g = new THREE.BufferGeometry(), pa = [], ix = [];
      secs.forEach(function (sec) { sec.forEach(function (Q) { pa.push(Q.x, Q.y, Q.z); }); });
      for (var i = 0; i < secs.length - 1; i++) for (var j = 0; j < P - 1; j++) { var a = i * P + j, b = (i + 1) * P + j, c = (i + 1) * P + j + 1, d = i * P + j + 1; ix.push(a, b, c, a, c, d); }
      [0, secs.length - 1].forEach(function (e, ei) { var sc = secs[e], cx = 0, cy = 0, cz = 0; sc.forEach(function (Q) { cx += Q.x; cy += Q.y; cz += Q.z; }); var ci = pa.length / 3; pa.push(cx / P, cy / P - 0.5, cz / P); for (var j2 = 0; j2 < P - 1; j2++) ix.push(e * P + j2, e * P + j2 + 1, ci, e * P + j2 + 1, e * P + j2, ci); });   /* close both ends, both windings (an open strip end read as a paper blade; the culled twin costs a few triangles) */
      g.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3)); g.setIndex(ix); g.computeVertexNormals();
      var gn = g.attributes.normal, up = 0; for (var i2 = 0; i2 < secs.length; i2++) up += gn.getY(i2 * P + (P >> 1)); if (up < 0) { for (var t3 = 0; t3 < ix.length; t3 += 3) { var tt = ix[t3 + 1]; ix[t3 + 1] = ix[t3 + 2]; ix[t3 + 2] = tt; } g.setIndex(ix); g.computeVertexNormals(); }   /* the strip faces out of the rock */
      var gc = toCreasedNormals(g, 50 * Math.PI / 180); g.dispose(); var p = gc.attributes.position, n = gc.attributes.normal, bad = false;
      for (var vv = 0; vv < p.count; vv++) if (Math.max(Math.abs(p.getX(vv)), Math.abs(p.getZ(vv))) < REACH_IN + 4 && p.getY(vv) < CRAG_MIN_Y) { bad = true; break; }   /* host safety: a strip reaching under 6 m inside the reach square is dropped whole */
      if (bad) { gc.dispose(); return; }
      for (var v2 = 0; v2 < p.count; v2++) { var x = p.getX(v2), y = p.getY(v2), z = p.getZ(v2), nx = n.getX(v2), ny = n.getY(v2), nz = n.getZ(v2), tH = Math.max(0, Math.min(1, y / R.h_max));
        cT.copy(rock).lerp(peak, tH * tH * 0.3).multiplyScalar(0.92 + 0.14 * vn2(x / 9, z / 9, 7));   /* the ridge's own rock tone (graphite → a touch paler with height) */
        var w = rp ? nearest(x, y, z) : -1; if (w >= 0) { var sk = 1 - sstep(1.5, 6, Math.hypot(rp.getX(w) - x, rp.getY(w) - y, rp.getZ(w) - z)) * 0.85;   /* near the face: its shading */
          nx += (rn.getX(w) - nx) * sk; ny += (rn.getY(w) - ny) * sk; nz += (rn.getZ(w) - nz) * sk; var nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; if (rc) cT.lerp(cR.setRGB(rc.getX(w), rc.getY(w), rc.getZ(w)), sk); }
        pos.push(x, y, z); nrm.push(nx, ny, nz); col.push(cT.r, cT.g, cT.b); }
      gc.dispose(); info.strips++; info[S.role + 's']++; });
    if (!pos.length) return; var g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g2.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g2.computeBoundingSphere(); own.push(g2);
    if (!mat) { mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.04 }); own.push(mat); }
    mesh = new THREE.Mesh(g2, mat); mesh.name = 'RIDGE_CRAGS_' + R.id; mesh.frustumCulled = false; mesh.receiveShadow = false; mesh.castShadow = false; mesh.userData.noMerge = true; ctx.group.add(mesh);
    info.tris = pos.length / 9; info.draw_calls = 1; log('ridgeCrags: ' + info.caps + ' crest caps, ' + info.ledges + ' ledges, ' + info.ribs + ' nose ribs, ' + info.tris + ' tris, 1 draw'); }
  function dispose() { own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; if (mesh && mesh.parent) mesh.parent.remove(mesh); mesh = null; }
  function debug() { return info; }
  return { build: build, dispose: dispose, debug: debug };
}
