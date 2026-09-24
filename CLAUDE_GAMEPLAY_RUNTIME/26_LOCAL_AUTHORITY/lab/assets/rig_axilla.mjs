/* AXILLA UNWELD (S10, runtime derivative only — the source sculpt is untouched).
   The source body has the inner upper arm merged into the lat over a narrow contact strip (34 bridging edges on the left side, t 0.3–0.8
   along the humerus): there is no inner-arm skin and no lat skin inside that union, so ANY weight assignment either plates (hard split →
   1.8 cm edges become 55 cm at 150° elevation) or webs (soft split → a sail). This pass:
     1. deletes the bridging triangles (one vertex mostly arm, one mostly trunk, on the medial side of the humerus);
     2. lofts an INNER-ARM patch — the missing medial face of the upper-arm tube — from the arm's own measured section radii, bound to the arm;
     3. lofts a LAT patch — the ribcage side under the arm — from the trunk's own side silhouette, bound to the trunk.
   Both patches sit 3–4 mm inside their surface so they are hidden in the rest pose and take over as the arm lifts. Nothing else moves. */

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; } function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; } function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function lerp(a, b, t) { return a + (b - a) * t; }

export function unweldAxilla(ctx) {
  var P = ctx.P, N = ctx.N, J = ctx.J, BI = ctx.BI, bodyJ = ctx.bodyJ, bodyW = ctx.bodyW, upperIdx = ctx.upperIdx, rArm = ctx.rArm || 0.052, uvOf = ctx.uvOf, jointName = ctx.jointName;
  var out = { removed: 0, armPatchTris: 0, latPatchTris: 0, bridges: {} };
  var isArmBone = function (name) { return /^(UPPERARM|FOREARM|HAND|FINGERS|ARMTWIST|FORETWIST)_/.test(name); };
  function armShare(i) { var s = 0; for (var k = 0; k < 4; k++) if (isArmBone(jointName(bodyJ[i * 4 + k]))) s += bodyW[i * 4 + k]; return s; }
  var vx = function (i) { return P[i * 3]; }, vy = function (i) { return P[i * 3 + 1]; }, vz = function (i) { return P[i * 3 + 2]; };
  ['L', 'R'].forEach(function (S) {
    var sgn = S === 'L' ? -1 : 1; var gh = J[BI['UPPERARM_' + S]].p, el = J[BI['FOREARM_' + S]].p; var axis = sub(el, gh); var Lax = Math.hypot(axis[0], axis[1], axis[2]); var a = norm(axis);
    /* medial direction: from the humeral axis toward the trunk, perpendicular to the axis */
    var toTrunk = norm(sub([0, gh[1] - 0.05 * Lax, gh[2]], gh)); var u = norm(sub(toTrunk, [a[0] * dot(toTrunk, a), a[1] * dot(toTrunk, a), a[2] * dot(toTrunk, a)])); var v = norm(cross(a, u));   /* u = medial, v = along the arm's front/back */
    function cyl(i) { var d = sub([vx(i), vy(i), vz(i)], gh); var t = dot(d, a) / Lax; var al = t * Lax; var rad = Math.sqrt(Math.max(0, dot(d, d) - al * al)); var pu = dot(d, u), pv = dot(d, v); return { t: t, rad: rad, ang: Math.atan2(pv, pu) }; }   /* ang 0 = medial */
    var side = function (i) { return Math.sign(vx(i)) === sgn; };
    /* ---- 1. bridging triangles ---- */
    var cls = new Int8Array(N);   /* 1 arm, -1 trunk, 0 other */
    for (var i = 0; i < N; i++) { if (!side(i)) continue; var c = cyl(i); if (c.t < 0.08 || c.t > 1.0 || Math.abs(c.ang) > 1.6) continue; var s = armShare(i); cls[i] = s >= 0.5 ? 1 : -1;   /* inside the medial window every vertex is either arm or trunk: a half-and-half vertex is exactly a plate corner */ }
    var keep = [], removedTris = [], holeArm = {}, holeTrunk = {};
    for (var q = 0; q < upperIdx.length; q += 3) { var tri = [upperIdx[q], upperIdx[q + 1], upperIdx[q + 2]]; var ca = tri.map(function (i) { return cls[i]; }); var bridge = ca.indexOf(1) >= 0 && ca.indexOf(-1) >= 0; if (bridge) { removedTris.push(tri); tri.forEach(function (i, k) { if (ca[k] === 1) holeArm[i] = 1; else if (ca[k] === -1) holeTrunk[i] = 1; }); } else keep.push(tri[0], tri[1], tri[2]); }
    upperIdx.length = 0; keep.forEach(function (x) { upperIdx.push(x); }); out.removed += removedTris.length; out.bridges[S] = removedTris.length;
    if (!removedTris.length) return;
    var armHole = Object.keys(holeArm).map(Number), trunkHole = Object.keys(holeTrunk).map(Number);
    var tMin = Infinity, tMax = -Infinity, angMin = Infinity, angMax = -Infinity; armHole.forEach(function (i) { var c = cyl(i); tMin = Math.min(tMin, c.t); tMax = Math.max(tMax, c.t); angMin = Math.min(angMin, c.ang); angMax = Math.max(angMax, c.ang); });
    /* ---- 2. inner-arm patch: rings of the arm's own section, medial arc widened past the hole, 3.5 mm inside ---- */
    var K = 10, A_N = 7; var t0 = Math.max(0.12, tMin - 0.08), t1 = Math.min(1.0, tMax + 0.08); var ang0 = angMin - 0.45, ang1 = angMax + 0.45;
    function armRadiusAt(t, ang) { /* mean radius of arm-bound verts near this t on the nearest non-medial arcs; the medial arc itself is merged */ var acc = 0, n = 0; for (var i = 0; i < N; i++) { if (!side(i) || armShare(i) < 0.6) continue; var c = cyl(i); if (Math.abs(c.t - t) > 0.06) continue; var da = Math.abs(c.ang - ang); if (da < 0.5 || da > 2.6) continue; if (c.rad > 1.6 * rArm) continue; acc += c.rad; n++; } return n ? acc / n : rArm; }
    var armVerts = []; for (var k = 0; k <= K; k++) { var t = lerp(t0, t1, k / K); var cpt = [gh[0] + a[0] * t * Lax, gh[1] + a[1] * t * Lax, gh[2] + a[2] * t * Lax]; var ring = []; for (var m = 0; m <= A_N; m++) { var ang = lerp(ang0, ang1, m / A_N); var r = armRadiusAt(t, ang) * 0.985 - 0.0015; var dir = [u[0] * Math.cos(ang) + v[0] * Math.sin(ang), u[1] * Math.cos(ang) + v[1] * Math.sin(ang), u[2] * Math.cos(ang) + v[2] * Math.sin(ang)]; ring.push({ p: [cpt[0] + dir[0] * r, cpt[1] + dir[1] * r, cpt[2] + dir[2] * r], n: dir, t: t }); } armVerts.push(ring); }
    /* weights: copy the nearest arm-bound vertex at the same t (keeps the proximal twist ramp) */
    function nearestVert(p, pred) { var best = -1, bd = Infinity; for (var i = 0; i < N; i++) { if (!side(i) || !pred(i)) continue; var d = (vx(i) - p[0]) * (vx(i) - p[0]) + (vy(i) - p[1]) * (vy(i) - p[1]) + (vz(i) - p[2]) * (vz(i) - p[2]); if (d < bd) { bd = d; best = i; } } return best; }
    var base = ctx.pushVertex; var armC = armVerts[Math.floor(K / 2)][Math.floor(A_N / 2)].p; var tC = lerp(t0, t1, 0.5), cC = [gh[0] + a[0] * tC * Lax, gh[1] + a[1] * tC * Lax, gh[2] + a[2] * tC * Lax], aS = ang1 + 0.6, rS = armRadiusAt(tC, aS); var sampleP = [cC[0] + (u[0] * Math.cos(aS) + v[0] * Math.sin(aS)) * rS, cC[1] + (u[1] * Math.cos(aS) + v[1] * Math.sin(aS)) * rS, cC[2] + (u[2] * Math.cos(aS) + v[2] * Math.sin(aS)) * rS]; var armRef = nearestVert(sampleP, function (i) { return armShare(i) >= 0.8 && !holeArm[i]; });   /* texture sample from open arm skin beside the crease (the crease itself is baked dark) */ var armUV = [ctx.UV[armRef * 2], ctx.UV[armRef * 2 + 1]];   /* ONE texture sample per patch: nearest-vertex UVs jump between islands and smear the atlas across the patch */
    var armIds = armVerts.map(function (ring) { return ring.map(function (w) { var src = nearestVert(w.p, function (i) { return armShare(i) >= 0.6; }); return base(w.p, w.n, armUV, src); }); });
    /* quads between rings; winding: outward = along the ring direction (u→v) crossed with the axis; fixed per side by the normal test below */
    function emit(idsA, idsB, target) { for (var m = 0; m < idsA.length - 1; m++) { var i0 = idsA[m], i1 = idsA[m + 1], j0 = idsB[m], j1 = idsB[m + 1]; ctx.pushTri(i0, j0, i1, target); ctx.pushTri(i1, j0, j1, target); } }
    for (var k2 = 0; k2 < K; k2++) emit(armIds[k2], armIds[k2 + 1], 'arm'); out.armPatchTris += K * A_N * 2;
    /* ---- 3. lat patch: ONLY the lat area that was hidden inside the arm volume — sized row by row from the trunk-side hole verts ---- */
    var hy = trunkHole.map(vy); var yTop = Math.max.apply(null, hy) + 0.012, yBot = Math.max(gh[1] - 0.26, Math.min.apply(null, hy) - 0.012);
    var holeC = [0, 0, 0]; trunkHole.forEach(function (i) { holeC[0] += vx(i) / trunkHole.length; holeC[1] += vy(i) / trunkHole.length; holeC[2] += vz(i) / trunkHole.length; });
    var latRef = nearestVert([holeC[0], yBot - 0.035, holeC[2]], function (i) { return !holeTrunk[i] && cls[i] !== 1 && armShare(i) <= 0.2; });   /* lat skin just below the crease */ var latUV = [ctx.UV[latRef * 2], ctx.UV[latRef * 2 + 1]];
    function rowSpan(y) { var zs = [], xs = []; trunkHole.forEach(function (i) { if (Math.abs(vy(i) - y) <= 0.03) { zs.push(vz(i)); xs.push(Math.abs(vx(i))); } }); if (!zs.length) return null; return { z0: Math.min.apply(null, zs) - 0.012, z1: Math.max.apply(null, zs) + 0.012, x: xs.reduce(function (a0, b0) { return a0 + b0; }, 0) / xs.length }; }
    function ribX(y, z) { /* the ribcage surface around the hole: the trunk-bound vertex nearest in the y-z plane (neither arm nor hole rim) gives x AND the shading normal */ var best = -1, bd = Infinity; for (var i = 0; i < N; i++) { if (!side(i) || cls[i] === 1 || armShare(i) > 0.25 || holeTrunk[i]) continue; var d = (vy(i) - y) * (vy(i) - y) + (vz(i) - z) * (vz(i) - z); if (d < bd) { bd = d; best = i; } } return best; }
    var R_N = 8, Z_N = 6, latIds = [], prevSpan = null; for (var r2 = 0; r2 <= R_N; r2++) { var y = lerp(yTop, yBot, r2 / R_N); var sp = rowSpan(y) || prevSpan; if (!sp) continue; prevSpan = sp; var row = []; for (var zz = 0; zz <= Z_N; zz++) { var z = lerp(sp.z0, sp.z1, zz / Z_N); var ri = ribX(y, z); var xr = ri >= 0 ? Math.abs(vx(ri)) : sp.x; var p = [sgn * (xr - 0.0015), y, z]; var nrm = ri >= 0 ? [ctx.NM[ri * 3], ctx.NM[ri * 3 + 1], ctx.NM[ri * 3 + 2]] : [sgn, 0, 0]; var src = nearestVert(p, function (i) { return holeTrunk[i]; }); row.push(base(p, nrm, latUV, src)); } latIds.push(row); }
    for (var r3 = 0; r3 < latIds.length - 1; r3++) emit(latIds[r3], latIds[r3 + 1], 'lat'); out.latPatchTris += (latIds.length - 1) * Z_N * 2;
  });
  return out;
}
