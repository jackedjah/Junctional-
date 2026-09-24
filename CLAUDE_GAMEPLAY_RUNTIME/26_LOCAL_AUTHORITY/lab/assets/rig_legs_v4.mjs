/* MAHWORLD :: SEPARATED LEGS v4 — continuous lofted limbs with a SMOOTHED profile and a hip dome that reaches the femur head
   (motion precision pass, section B). Measured on dev_0.7 (rig_legs.mjs): the loft copied the fused body's cross-sections ring by
   ring, and below the knee the source tail is sparse (100-140 verts per 2 % H band with empty bands between), so the ±0.012 H
   sampler fell back to wider bands and neighbouring rings received IDENTICAL extents — the front of the shin became a staircase of
   1 cm ledges (front z 0.0363 → 0.0267 → 0.0173 in two-ring steps) whose downward-facing treads render dark under the top light
   and read as the front of the lower leg being cut away. v4 fixes the construction instead of hiding it:
     · the profile (half-width, half-depth, centre) is sampled every 0.004 H with an adaptive band and then Gaussian-smoothed along
       the leg (sigma 0.010 H), so every ring differs from its neighbour by a small, monotone amount — no treads, no ledges
     · the loft continues ABOVE the authored split line into the pelvis, shrinking to a dome that closes near the femur head, so
       the THIGH bone can pivot where the hip actually is (section C) without the leg top leaving the pelvis volume
     · dense rings around the knee (0.006 H) for the tighter knee blend, a patella swell in front, a shallow fold behind
     · closed at the tip (point) and at the dome (point); manifold; UVs from the nearest fused-body vertex as before
     · PACKED target: the same topology pressed onto its half of the fused silhouette (transformation morph), unchanged in intent
   Everything is in source units. */
function smoothstep(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-9, e1 - e0))); return t * t * (3 - 2 * t); }

/* half extents of the fused body at fraction h of body height; the band widens until it holds enough vertices */
export function sectionExtentsAdaptive(pts, h, half0, minN) {
  var half = half0, sel = [];
  for (var pass = 0; pass < 6; pass++) { sel = pts.filter(function (p) { return Math.abs(p.h - h) <= half; }); if (sel.length >= (minN || 12)) break; half *= 1.6; }
  if (sel.length < 4) return null;
  var xs = sel.map(function (p) { return Math.abs(p.x); }).sort(function (a, b) { return a - b; });
  var zs = sel.map(function (p) { return p.z; }).sort(function (a, b) { return a - b; });
  var zlo = zs[Math.floor(0.03 * (zs.length - 1))], zhi = zs[Math.floor(0.97 * (zs.length - 1))];
  return { hw: xs[Math.floor(0.97 * (xs.length - 1))], zc: 0.5 * (zlo + zhi), hd: 0.5 * (zhi - zlo), n: sel.length, band: half };
}

/* smoothed profile: arrays over a fine h grid */
export function smoothedProfile(pts, hLo, hHi, step, sigma) {
  var hs = [], raw = []; for (var h = hLo; h <= hHi + 1e-9; h += step) { hs.push(h); raw.push(sectionExtentsAdaptive(pts, h, 0.010, 12)); }
  for (var i = 0; i < raw.length; i++) if (!raw[i]) { var j = 1; while (j < raw.length && !raw[Math.min(raw.length - 1, i + j)] && !raw[Math.max(0, i - j)]) j++; raw[i] = raw[Math.min(raw.length - 1, i + j)] || raw[Math.max(0, i - j)]; }
  var out = hs.map(function (h, i) { var sw = 0, hw = 0, hd = 0, zc = 0; for (var k = 0; k < hs.length; k++) { var d = (hs[k] - h) / sigma; var w = Math.exp(-0.5 * d * d); sw += w; hw += w * raw[k].hw; hd += w * raw[k].hd; zc += w * raw[k].zc; } return { h: h, hw: hw / sw, hd: hd / sw, zc: zc / sw, raw: raw[i] }; });
  return { hs: hs, rows: out, at: function (h) { var t = (h - hLo) / step; var i = Math.max(0, Math.min(out.length - 1, Math.floor(t))); var j = Math.min(out.length - 1, i + 1); var f = Math.max(0, Math.min(1, t - i)); return { hw: out[i].hw + (out[j].hw - out[i].hw) * f, hd: out[i].hd + (out[j].hd - out[i].hd) * f, zc: out[i].zc + (out[j].zc - out[i].zc) * f }; } };
}

export function ringHeightsV4(domeTop, splitH, kneeH, tipH, opts) {
  opts = opts || {}; var base = opts.base || 0.012, kneeBand = opts.kneeBand || 0.05, kneeStep = opts.kneeStep || 0.006;
  var hs = new Set();
  for (var h = domeTop; h > tipH; h -= base) hs.add(+h.toFixed(5));
  for (var k = kneeH - kneeBand; k <= kneeH + kneeBand; k += kneeStep) if (k > tipH && k < domeTop) hs.add(+k.toFixed(5));
  for (var t = tipH; t < tipH + 0.06; t += 0.010) if (t < domeTop) hs.add(+t.toFixed(5));
  hs.add(+tipH.toFixed(5)); hs.add(+splitH.toFixed(5)); hs.add(+domeTop.toFixed(5));
  var sorted = Array.from(hs).sort(function (a, b) { return b - a; }), out = [];
  sorted.forEach(function (h) { if (!out.length || out[out.length - 1] - h >= 0.0035) out.push(h); });
  return out;
}

/* axialPts: [{x,y,z,h}] of the fused body's axial column (pelvis + lower). geom: {minY,H,narrow,zs,cx,domeTop,splitH,kneeH,tipH,seg,rings,sigma}
   uvOf(x,y,z) → [u,v]. Returns {pos,norm,uv,delta,idx,sides,rings,seg,profile} */
export function buildLegsV4(axialPts, geom, uvOf) {
  var minY = geom.minY, H = geom.H, NARROW = geom.narrow, ZS = geom.zs, SEG = geom.seg || 24;
  var prof = smoothedProfile(axialPts, Math.max(0.0, geom.tipH - 0.02), geom.domeTop + 0.01, 0.004, geom.sigma || 0.010);
  var hs = ringHeightsV4(geom.domeTop, geom.splitH, geom.kneeH, geom.tipH, geom.rings);
  var pos = [], norm = [], uv = [], delta = [], idx = [], sides = {};
  var Y = function (h) { return minY + h * H; };
  ['L', 'R'].forEach(function (S) {
    var sgn = S === 'L' ? -1 : 1, cx = sgn * geom.cx, start = pos.length / 3, ringIdx = [];
    hs.forEach(function (h) {
      var ex = prof.at(h);
      var tipT = 1 - smoothstep(geom.tipH, geom.tipH + 0.045, h);                 /* 0 above the tip zone → 1 at the tip ring */
      var dome = smoothstep(geom.splitH, geom.domeTop, h);                          /* 0 at the split line → 1 at the dome top */
      var shrink = 1 - 0.62 * dome;                                                 /* inside the pelvis the limb tucks in */
      var rx = Math.max(0.0025, ex.hw * NARROW * (1 - 0.90 * tipT) * shrink), rz = Math.max(0.0025, ex.hd * ZS * (1 - 0.90 * tipT) * shrink);
      var kd = (h - geom.kneeH) / 0.040, kw = Math.exp(-kd * kd * 2.0);            /* patella / posterior fold weights */
      var zc = ex.zc;
      for (var s = 0; s < SEG; s++) {
        var a = (s / SEG) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        var front = Math.max(0, sa), back = Math.max(0, -sa);
        var rzz = rz * (1 + 0.09 * kw * front - 0.05 * kw * back), rxx = rx * (1 + 0.03 * kw);
        var x = cx + rxx * ca, z = zc + rzz * sa, y = Y(h);
        pos.push(x, y, z); norm.push(ca / Math.max(1e-6, rxx), 0, sa / Math.max(1e-6, rzz));
        /* PACKED: this ring becomes its half of the fused section (centre at half the fused half-width, spanning 0 → hw) */
        /* v4.1: PACKED = a FULL rounded ellipse per leg (centre ±0.35 hw, half-width 0.65 hw) whose union matches the fused silhouette; the inner
           halves overlap inside each other, so every intermediate of the transformation is two rounded volumes, never a half-flat face */
        var px = sgn * (0.20 * ex.hw) + (0.80 * ex.hw) * ca * (1 - 0.9 * tipT) * shrink,   /* micro-closure: ±0.20 / 0.80 → the union's midline dip is 3 %, one coherent form until the split shows */ pz = ex.zc + ex.hd * sa * (1 - 0.9 * tipT) * shrink;
        delta.push(px - x, 0, pz - z);
        var fx = sgn * Math.abs((x - cx) / NARROW + sgn * 0.5 * ex.hw), fz = zc + (z - zc) / ZS;
        var t2 = uvOf(fx, y, fz); uv.push(t2[0], t2[1]);
      }
      ringIdx.push(pos.length / 3 - SEG);
    });
    for (var r = 0; r < ringIdx.length - 1; r++) { var A = ringIdx[r], B = ringIdx[r + 1]; for (var s2 = 0; s2 < SEG; s2++) { var s3 = (s2 + 1) % SEG; idx.push(A + s2, A + s3, B + s2, A + s3, B + s3, B + s2); } }   /* CONVERGENCE FIX: outward winding (the v4 order was inside-out — every leg rendered as its far interior wall under FrontSide culling: 'legs cut / hollow / not fully seen') */
    /* tip point */
    var lastR = ringIdx[ringIdx.length - 1], tipV = pos.length / 3, exT = prof.at(geom.tipH);
    pos.push(cx, Y(geom.tipH) - 0.004 * H, exT.zc); norm.push(0, -1, 0); var tuv = uvOf(sgn * 0.01, Y(geom.tipH), exT.zc); uv.push(tuv[0], tuv[1]); delta.push(sgn * 0.1 * exT.hw - cx, 0, 0);
    for (var s4 = 0; s4 < SEG; s4++) idx.push(lastR + s4, lastR + (s4 + 1) % SEG, tipV);
    /* dome point inside the pelvis */
    var firstR = ringIdx[0], topV = pos.length / 3, exH = prof.at(geom.domeTop);
    pos.push(cx, Y(geom.domeTop) + 0.008 * H, exH.zc); norm.push(0, 1, 0); var huv = uvOf(cx / NARROW, Y(geom.splitH), exH.zc); uv.push(huv[0], huv[1]); delta.push(sgn * 0.20 * exH.hw - cx, 0, 0);
    for (var s5 = 0; s5 < SEG; s5++) idx.push(firstR + (s5 + 1) % SEG, firstR + s5, topV);
    sides[S] = { start: start, count: pos.length / 3 - start, rings: ringIdx.length, cx: cx };
  });
  /* smooth normals from the triangles */
  var nrm = new Float64Array(pos.length);
  for (var t = 0; t < idx.length; t += 3) { var a0 = idx[t], b0 = idx[t + 1], c0 = idx[t + 2]; var ux = pos[b0 * 3] - pos[a0 * 3], uy = pos[b0 * 3 + 1] - pos[a0 * 3 + 1], uz = pos[b0 * 3 + 2] - pos[a0 * 3 + 2]; var vx = pos[c0 * 3] - pos[a0 * 3], vy = pos[c0 * 3 + 1] - pos[a0 * 3 + 1], vz = pos[c0 * 3 + 2] - pos[a0 * 3 + 2]; var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; [a0, b0, c0].forEach(function (v) { nrm[v * 3] += nx; nrm[v * 3 + 1] += ny; nrm[v * 3 + 2] += nz; }); }
  for (var v = 0; v < pos.length / 3; v++) { var l = Math.hypot(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]) || 1; norm[v * 3] = nrm[v * 3] / l; norm[v * 3 + 1] = nrm[v * 3 + 1] / l; norm[v * 3 + 2] = nrm[v * 3 + 2] / l; }
  return { pos: pos, norm: norm, uv: uv, delta: delta, idx: idx, sides: sides, rings: hs.length, seg: SEG, profile: prof.rows.map(function (r) { return { h: +r.h.toFixed(3), hw: +r.hw.toFixed(4), hd: +r.hd.toFixed(4), zc: +r.zc.toFixed(4) }; }) };
}
export { makeUvLookup } from './rig_legs.mjs';
