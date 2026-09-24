/* MAHWORLD :: SEPARATED LEGS v5 "SURGICAL" — the split legs are DERIVED FROM THE FUSED ANATOMY (S13 owner rule F).
   v4 lofted two synthetic ellipses sized from the fused half-width / half-depth; that reads as invented legs. v5 keeps v4's proven
   topology (rings x 24 segments per leg, tip point, hip dome, manifold, PACKED morph) but every ring now comes from the fused body's
   OWN cross-section:
     · the OUTER half of each leg is the real fused outline r(θ) at that height (angular sampling of the source vertices, Gaussian-smoothed
       along the limb so the source's sparse tail cannot leave ledges) — the calf bulge, the knee valley, the hamstring/quad shape are the
       fused taper's, only narrowed in x so two legs fit side by side;
     · the INNER (medial) half is INFERRED from the same outline: the mirrored outer profile compressed toward the midline into a D-section
       (`bulge`), so the inner thigh/calf has the species' own front/back shape, not a generic cylinder;
     · at the crotch the outer wall is FLUSH with the pelvis shell (v4 poked ~10 mm out): cx + narrow·hw(crotch) ≤ shell half-width;
     · above the split line the rings continue inside the pelvis, shrinking to the dome under the femur head (v4 law) so the THIGH pivots
       where the hip actually is;
     · PACKED (fused look during the transformation) = the outer half at its EXACT fused position and the inner wall folded onto the midline,
       so the packed pair reproduces the fused silhouette instead of two overlapping ellipses.
   Same return contract as buildLegsV4: {pos,norm,uv,delta,idx,sides{L,R:{start,count,rings,cx}},rings,seg,profile}. Source units. */
import { ringHeightsV4 } from './rig_legs_v4.mjs';
function smoothstep(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-9, e1 - e0))); return t * t * (3 - 2 * t); }

/* angular outline of the fused body at fraction h: NB radial bins around the section centre (0, zc), folded to x ≤ 0 (the body is
   bilaterally symmetric; folding doubles the samples and guarantees a symmetric pair of legs). Returns { zc, r[NB] } or null. */
export function sectionOutline(pts, h, half0, minN, NB) {
  var half = half0, sel = [];
  for (var pass = 0; pass < 6; pass++) { sel = pts.filter(function (p) { return Math.abs(p.h - h) <= half; }); if (sel.length >= (minN || 12)) break; half *= 1.6; }
  if (sel.length < 4) return null;
  var zs = sel.map(function (p) { return p.z; }).sort(function (a, b) { return a - b; });
  var zlo = zs[Math.floor(0.03 * (zs.length - 1))], zhi = zs[Math.floor(0.97 * (zs.length - 1))]; var zc = 0.5 * (zlo + zhi);
  var bins = []; for (var b = 0; b < NB; b++) bins.push([]);
  sel.forEach(function (p) { var x = -Math.abs(p.x), z = p.z - zc; var a = Math.atan2(z, x); if (a < 0) a += Math.PI * 2; var bi = Math.floor(a / (Math.PI * 2) * NB) % NB; bins[bi].push(Math.hypot(x, z)); });
  var r = new Array(NB).fill(null);
  for (var i = 0; i < NB; i++) { if (!bins[i].length) continue; var s = bins[i].sort(function (a, b) { return a - b; }); r[i] = s[Math.floor(0.92 * (s.length - 1))]; }   /* the outline = the outer envelope of that wedge */
  /* the folded samples only cover the x ≤ 0 half; mirror it onto the x ≥ 0 half, then fill any empty bin from its neighbours */
  for (var j = 0; j < NB; j++) { var a2 = (j + 0.5) / NB * Math.PI * 2; if (Math.cos(a2) > 0) { var am = Math.PI - a2; if (am < 0) am += Math.PI * 2; var jm = Math.floor(am / (Math.PI * 2) * NB) % NB; if (r[jm] !== null) r[j] = r[jm]; } }
  for (var k = 0; k < NB; k++) { if (r[k] !== null) continue; var d = 1; while (d < NB && r[(k + d) % NB] === null && r[(k - d + NB) % NB] === null) d++; var ra = r[(k + d) % NB], rb = r[(k - d + NB) % NB]; r[k] = ra !== null && rb !== null ? 0.5 * (ra + rb) : (ra !== null ? ra : rb); }
  for (var pass2 = 0; pass2 < 2; pass2++) { var r2 = r.slice(); for (var m = 0; m < NB; m++) r2[m] = 0.25 * r[(m - 1 + NB) % NB] + 0.5 * r[m] + 0.25 * r[(m + 1) % NB]; r = r2; }   /* angular blur: no facet jaggedness from the sparse source */
  return { zc: zc, r: r, n: sel.length, band: half };
}
/* outlines on a fine h grid, Gaussian-smoothed along the limb per angular bin (v4's profile idea, generalised from 2 numbers to NB) */
export function smoothedOutline(pts, hLo, hHi, step, sigma, NB) {
  var hs = [], raw = []; for (var h = hLo; h <= hHi + 1e-9; h += step) { hs.push(h); raw.push(sectionOutline(pts, h, 0.010, 12, NB)); }
  for (var i = 0; i < raw.length; i++) if (!raw[i]) { var j = 1; while (j < raw.length && !raw[Math.min(raw.length - 1, i + j)] && !raw[Math.max(0, i - j)]) j++; raw[i] = raw[Math.min(raw.length - 1, i + j)] || raw[Math.max(0, i - j)]; }
  var rows = hs.map(function (h) { var sw = 0, zc = 0, r = new Array(NB).fill(0); for (var k = 0; k < hs.length; k++) { var d = (hs[k] - h) / sigma; var w = Math.exp(-0.5 * d * d); sw += w; zc += w * raw[k].zc; for (var b = 0; b < NB; b++) r[b] += w * raw[k].r[b]; } for (var b2 = 0; b2 < NB; b2++) r[b2] /= sw; var hw = 0, front = 0, back = 0; for (var b3 = 0; b3 < NB; b3++) { var a = (b3 + 0.5) / NB * Math.PI * 2; hw = Math.max(hw, -r[b3] * Math.cos(a)); front = Math.max(front, r[b3] * Math.sin(a)); back = Math.max(back, -r[b3] * Math.sin(a)); } return { h: h, zc: zc / sw, r: r, hw: hw, hd: 0.5 * (front + back), zoff: 0.5 * (front - back) }; });
  function rAt(row, a) { var t = a / (Math.PI * 2) * NB - 0.5; var i = Math.floor(t); var f = t - i; var r0 = row.r[((i % NB) + NB) % NB], r1 = row.r[(((i + 1) % NB) + NB) % NB]; return r0 + (r1 - r0) * f; }
  return { hs: hs, rows: rows, at: function (h) { var t = (h - hLo) / step; var i = Math.max(0, Math.min(rows.length - 1, Math.floor(t))); var j = Math.min(rows.length - 1, i + 1); var f = Math.max(0, Math.min(1, t - i)); var A = rows[i], B = rows[j]; return { zc: A.zc + (B.zc - A.zc) * f, hw: A.hw + (B.hw - A.hw) * f, hd: A.hd + (B.hd - A.hd) * f, r: function (a) { return rAt(A, a) + (rAt(B, a) - rAt(A, a)) * f; } }; } };
}

/* axialPts: [{x,y,z,h}] fused axial column (pelvis + lower). geom: {minY,H,narrow,zs,cx,bulge,domeTop,splitH,kneeH,tipH,seg,rings,sigma,shellHW}
   uvOf(x,y,z) → [u,v]. */
export function buildLegsSurgical(axialPts, geom, uvOf) {
  var minY = geom.minY, H = geom.H, ZS = geom.zs || 0.82, SEG = geom.seg || 24, NB = geom.bins || 48, BULGE = geom.bulge === undefined ? 0.62 : geom.bulge;
  var prof = smoothedOutline(axialPts, Math.max(0.0, geom.tipH - 0.02), geom.domeTop + 0.01, 0.004, geom.sigma || 0.010, NB);
  var hs = ringHeightsV4(geom.domeTop, geom.splitH, geom.kneeH, geom.tipH, geom.rings);
  var pos = [], norm = [], uv = [], delta = [], idx = [], sides = {};
  var Y = function (h) { return minY + h * H; };
  /* narrowing: two legs side by side, each `narrow` of the fused half-width; at the crotch the outer wall must stay inside the pelvis shell */
  var exC = prof.at(geom.splitH); var narrowTop = geom.shellHW ? Math.min(geom.narrow, Math.max(0.35, (geom.shellHW - geom.cx) / Math.max(1e-6, exC.hw))) : geom.narrow;
  var narrowAt = function (h) { var t = smoothstep(geom.kneeH + 0.03, geom.splitH - 0.01, h); return geom.narrow + (narrowTop - geom.narrow) * t; };   /* v4's 0.5 below the knee → flush value at the crotch */
  var stats = { narrowTop: +narrowTop.toFixed(3), crotch_hw: +exC.hw.toFixed(4), crotch_outer: +(geom.cx + narrowTop * exC.hw).toFixed(4), shell: geom.shellHW };
  var zcSpike = geom.zcTip !== undefined ? geom.zcTip : prof.at(geom.tipH + 0.11).zc;   /* the spike sits on the TIP bone's axis */
  ['L', 'R'].forEach(function (S) {
    var sgn = S === 'L' ? -1 : 1, cx = sgn * geom.cx, start = pos.length / 3, ringIdx = [];
    hs.forEach(function (h) {
      var ex = prof.at(h); var NARROW = narrowAt(h);
      var tipT = 1 - smoothstep(geom.tipH, geom.tipH + 0.045, h);                 /* 0 above the tip zone → 1 at the tip ring */
      var dome = smoothstep(geom.splitH, geom.domeTop, h);                          /* 0 at the split line → 1 at the dome top */
      var shrink = (1 - 0.90 * tipT) * (1 - 0.62 * dome);                           /* the tip closes; inside the pelvis the limb tucks in */
      var kd = (h - geom.kneeH) / 0.040, kw = Math.exp(-kd * kd * 2.0);            /* a light patella swell on top of the real knee outline */
      var spike0 = 1 - smoothstep(geom.tipH, geom.tipH + 0.11, h); var zc = ex.zc + (zcSpike - ex.zc) * spike0, y = Y(h);   /* the spike keeps ONE axis (no centre wander between tiny rings) */
      for (var s = 0; s < SEG; s++) {
        var a = (s / SEG) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        /* the fused outline point for this angle: OUTER half (x on the leg's own side) = the real outline; INNER half = the mirrored outline */
        var outer = (ca * sgn) >= 0 || Math.abs(ca) < 1e-9;                          /* R leg: cos ≥ 0 is lateral; L leg: cos ≤ 0 is lateral */
        var aF = a;                                                                     /* the outline is symmetric (folded + mirrored), so the same angle serves both halves */
        var rOut = ex.r(aF); var rEll = ex.hw * ex.hd / Math.max(1e-6, Math.hypot(ex.hd * ca, ex.hw * sa)); var spike = 1 - smoothstep(geom.tipH, geom.tipH + 0.11, h);   /* the pointed tip (bottom ~11 % of the height) is a clean elliptical spike: the source outline there is a handful of verts */
        var toEll = Math.max(spike, smoothstep(geom.splitH - 0.02, geom.splitH + 0.02, h));   /* inside the pelvis (above the split line) the hidden rings are plain ellipses: the groin's concave front must not dent the limb top */
        var rr = Math.max(rOut + (rEll - rOut) * toEll, 0.80 * rEll) * (1 + 0.05 * kw * Math.max(0, sa) - 0.03 * kw * Math.max(0, -sa));   /* and no ring dips below 80 % of its own ellipse: convex per leg */
        var fxAbs = Math.abs(rr * Math.cos(aF)), fz = zc + rr * Math.sin(aF);       /* |x| and z of the fused outline point */
        var x, z = zc + (fz - zc) * ZS * shrink;
        if (outer) x = cx + sgn * fxAbs * NARROW * shrink;                           /* the real outer wall, narrowed */
        else { /* the inferred INNER wall: a convex D — a half-ellipse whose depth is the outline's own front / back extent at this height (continuous with the
                  outer half at the seam) and whose medial bulge is `bulge` of the narrowed half-width; round at the pointed tip and inside the pelvis dome */
          var bl = BULGE + (1 - BULGE) * Math.max(tipT, dome); var rF = ex.r(Math.PI / 2), rB = ex.r(Math.PI * 1.5); var seamZ = sa >= 0 ? rF : rB; var bx = Math.min(ex.hw * NARROW * bl * shrink, Math.max(0.002, geom.cx - 0.004));
          x = cx - sgn * bx * Math.abs(ca); z = zc + seamZ * Math.abs(sa) * (sa >= 0 ? 1 : -1) * ZS * shrink; fxAbs = ex.hw * Math.abs(ca); fz = zc + seamZ * sa; }
        var ox = x - cx, oz = z - zc; var ol = Math.hypot(ox, oz); if (ol < 0.0025) { var kq = 0.0025 / Math.max(1e-9, ol); if (ol < 1e-9) { ox = 0.0025 * ca; oz = 0.0025 * sa; } else { ox *= kq; oz *= kq; } x = cx + ox; z = zc + oz; }
        pos.push(x, y, z); norm.push(ca, 0, sa);
        /* PACKED: the outer half sits EXACTLY on the fused surface; the inner wall folds onto the midline plane (hidden inside) */
        var px = outer ? sgn * fxAbs * shrink : sgn * 0.002 - sgn * 0.14 * ex.hw * Math.abs(ca) * shrink, pz = zc + (fz - zc) * shrink;   /* packed inner wall: a thin D that still bulges MEDIALLY (across the midline, hidden inside the other leg's outer half) so no triangle flips */
        delta.push(px - x, 0, pz - z);
        var t2 = uvOf(outer ? sgn * fxAbs : -sgn * fxAbs, y, fz); uv.push(t2[0], t2[1]);
      }
      ringIdx.push(pos.length / 3 - SEG);
    });
    for (var r = 0; r < ringIdx.length - 1; r++) { var A = ringIdx[r], B = ringIdx[r + 1]; for (var s2 = 0; s2 < SEG; s2++) { var s3 = (s2 + 1) % SEG; idx.push(A + s2, A + s3, B + s2, A + s3, B + s3, B + s2); } }   /* outward winding (v4 convergence fix) */
    /* tip point */
    var lastR = ringIdx[ringIdx.length - 1], tipV = pos.length / 3, exT = prof.at(geom.tipH);
    pos.push(cx, Y(geom.tipH) - 0.004 * H, exT.zc); norm.push(0, -1, 0); var tuv = uvOf(sgn * 0.01, Y(geom.tipH), exT.zc); uv.push(tuv[0], tuv[1]); delta.push(sgn * 0.1 * exT.hw - cx, 0, 0);
    for (var s4 = 0; s4 < SEG; s4++) idx.push(lastR + s4, lastR + (s4 + 1) % SEG, tipV);
    /* dome point inside the pelvis */
    var firstR = ringIdx[0], topV = pos.length / 3, exH = prof.at(geom.domeTop);
    pos.push(cx, Y(geom.domeTop) + 0.008 * H, exH.zc); norm.push(0, 1, 0); var huv = uvOf(cx / Math.max(0.2, geom.narrow), Y(geom.splitH), exH.zc); uv.push(huv[0], huv[1]); delta.push(sgn * 0.20 * exH.hw - cx, 0, 0);
    for (var s5 = 0; s5 < SEG; s5++) idx.push(firstR + (s5 + 1) % SEG, firstR + s5, topV);
    sides[S] = { start: start, count: pos.length / 3 - start, rings: ringIdx.length, cx: cx };
  });
  /* smooth normals from the triangles */
  var nrm = new Float64Array(pos.length);
  for (var t = 0; t < idx.length; t += 3) { var a0 = idx[t], b0 = idx[t + 1], c0 = idx[t + 2]; var ux = pos[b0 * 3] - pos[a0 * 3], uy = pos[b0 * 3 + 1] - pos[a0 * 3 + 1], uz = pos[b0 * 3 + 2] - pos[a0 * 3 + 2]; var vx = pos[c0 * 3] - pos[a0 * 3], vy = pos[c0 * 3 + 1] - pos[a0 * 3 + 1], vz = pos[c0 * 3 + 2] - pos[a0 * 3 + 2]; var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; [a0, b0, c0].forEach(function (v) { nrm[v * 3] += nx; nrm[v * 3 + 1] += ny; nrm[v * 3 + 2] += nz; }); }
  for (var v = 0; v < pos.length / 3; v++) { var l = Math.hypot(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]) || 1; norm[v * 3] = nrm[v * 3] / l; norm[v * 3 + 1] = nrm[v * 3 + 1] / l; norm[v * 3 + 2] = nrm[v * 3 + 2] / l; }
  return { pos: pos, norm: norm, uv: uv, delta: delta, idx: idx, sides: sides, rings: hs.length, seg: SEG, stats: stats, profile: prof.rows.map(function (r) { return { h: +r.h.toFixed(3), hw: +r.hw.toFixed(4), hd: +r.hd.toFixed(4), zc: +r.zc.toFixed(4) }; }) };
}
export { makeUvLookup } from './rig_legs.mjs';
