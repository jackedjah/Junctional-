/* MAHWORLD :: SEPARATED LEGS AS COMPLETE SURFACES (motion master task B, section 1)
   The previous split legs were the outer half of the fused lower body plus its mirror. Measured on the delivered asset, that
   construction has 1299 non-manifold seam edges and collapses triangles to a tenth of their length in an ordinary swing —
   the pinched, discontinuous surfaces the owner rejected. A PACKED morph cannot add the missing triangles, so the
   derivative construction is replaced, as the brief allows, with a COMPLETE closed limb per side:
     · a loft of elliptical rings along the leg axis, sized from the fused body's own cross-sections at every height
       (so the silhouette, the metallic shin taper and the pointed tip stay recognisable)
     · dense rings around the measured knee, a patella swell on the front and a shallow posterior fold behind
     · closed at the tip (a point) and at the top (a dome inside the pelvis), no seam plane, manifold everywhere
     · UVs copied from the nearest fused-body vertex in "un-narrowed" space, so the gold / graphite / metal coverage of the
       source texture lands on the same regions
     · the PACKED target is the same topology squeezed onto the fused silhouette: each leg becomes its half of the fused
       body, so the transition never crosses an empty or torn surface
   Everything is in source units; the generator converts nothing here. */

function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-9, e1 - e0))); return t * t * (3 - 2 * t); }

/* half extents (x from the midline outward, z front/back) of the fused lower body at a fraction h of body height */
export function sectionExtents(pts, h, half) {
  var sel = pts.filter(function (p) { return Math.abs(p.h - h) <= half; });
  for (var pass = 0; pass < 3 && sel.length < 8; pass++) sel = pts.filter(function (p) { return Math.abs(p.h - h) <= half * (2 + pass); });
  if (sel.length < 8) return null;
  var xmax = 0, zmin = Infinity, zmax = -Infinity, zsum = 0;
  sel.forEach(function (p) { var ax = Math.abs(p.x); if (ax > xmax) xmax = ax; if (p.z < zmin) zmin = p.z; if (p.z > zmax) zmax = p.z; zsum += p.z; });
  /* the fused body's half-width is the 97th percentile of |x| (a stray vertex must not fatten a ring) */
  var xs = sel.map(function (p) { return Math.abs(p.x); }).sort(function (a, b) { return a - b; });
  return { hw: xs[Math.floor(0.97 * (xs.length - 1))], zc: 0.5 * (zmin + zmax), hd: 0.5 * (zmax - zmin), zmean: zsum / sel.length, n: sel.length };
}

/* ring schedule: base spacing plus a dense band around the knee and a tightening toward the tip */
export function ringHeights(hipH, kneeH, tipH, opts) {
  opts = opts || {}; var base = opts.base || 0.018, kneeBand = opts.kneeBand || 0.05, kneeStep = opts.kneeStep || 0.008;
  var hs = new Set();
  for (var h = hipH; h > tipH; h -= base) hs.add(+h.toFixed(5));
  for (var k = kneeH - kneeBand; k <= kneeH + kneeBand; k += kneeStep) if (k > tipH && k < hipH) hs.add(+k.toFixed(5));
  for (var t = tipH; t < tipH + 0.06; t += 0.012) if (t < hipH) hs.add(+t.toFixed(5));
  hs.add(+tipH.toFixed(5)); hs.add(+hipH.toFixed(5));
  var sorted = Array.from(hs).sort(function (a, b) { return b - a; }), out = [];   /* top → bottom */
  sorted.forEach(function (h) { if (!out.length || out[out.length - 1] - h >= 0.003) out.push(h); });   /* two rings closer than 0.003 H would weld into a non-manifold pair */
  return out;
}

/* build both legs. lowerPts: [{x,y,z,h}] of the fused lower body · geom: {minY,H,narrow,zs,cx,hipH,kneeH,tipH,seg}
   uvOf(x,y,z) → [u,v] from the fused body · returns {pos, norm, uv, delta, idx, sides:{L:{start,count,rings},R:...}} */
export function buildLegs(lowerPts, geom, uvOf) {
  var minY = geom.minY, H = geom.H, NARROW = geom.narrow, ZS = geom.zs, SEG = geom.seg || 22;
  var hs = ringHeights(geom.hipH, geom.kneeH, geom.tipH, geom.rings);
  var pos = [], norm = [], uv = [], delta = [], idx = [], sides = {};
  var Y = function (h) { return minY + h * H; };
  ['L', 'R'].forEach(function (S) {
    var sgn = S === 'L' ? -1 : 1, cx = sgn * geom.cx, start = pos.length / 3, ringIdx = [];
    hs.forEach(function (h, ri) {
      var ex = sectionExtents(lowerPts, h, 0.012) || sectionExtents(lowerPts, Math.min(geom.hipH, h + 0.02), 0.02) || { hw: 0.01, zc: 0, hd: 0.01 };
      /* the leg's own radii: the narrowed fused section, never below a thin floor; tapering to a point at the tip */
      var tipT = 1 - smoothstep(geom.tipH, geom.tipH + 0.05, h);       /* 0 above the tip zone → 1 at the very tip */
      var rx = Math.max(0.0025, Math.max(0.003, ex.hw * NARROW) * (1 - 0.92 * tipT)), rz = Math.max(0.0025, Math.max(0.003, ex.hd * ZS) * (1 - 0.92 * tipT));   /* the last ring keeps a real radius; the point below it closes the tip */
      /* knee: a small patella swell on the front, a shallow fold behind — both fade over ±0.045 H */
      var kd = (h - geom.kneeH) / 0.045, kw = Math.exp(-kd * kd * 2.2);
      var zc = ex.zc;
      var packedHw = ex.hw, packedZc = ex.zc, packedHd = ex.hd;
      for (var s = 0; s < SEG; s++) {
        var a = (s / SEG) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        var front = Math.max(0, sa);                       /* +z is the front of the body */
        var back = Math.max(0, -sa);
        var rzz = rz * (1 + 0.10 * kw * front - 0.06 * kw * back);
        var rxx = rx * (1 + 0.04 * kw);
        var x = cx + rxx * ca, z = zc + rzz * sa, y = Y(h);
        pos.push(x, y, z);
        norm.push(ca / Math.max(1e-6, rxx), 0, sa / Math.max(1e-6, rzz));   /* ellipse normal, normalised below */
        /* PACKED: this ring becomes its half of the fused section — centre at half the fused half-width, spanning 0 → hw */
        var px = sgn * (0.5 * packedHw) + (0.5 * packedHw) * ca * (1 - 0.9 * tipT), pz = packedZc + packedHd * sa * (1 - 0.9 * tipT);
        delta.push(px - x, 0, pz - z);
        /* UV from the fused body: look the loft point up in un-narrowed fused space on the same side */
        var fx = sgn * Math.abs((x - cx) / NARROW + sgn * 0.5 * ex.hw), fz = zc + (z - zc) / ZS;
        var t2 = uvOf(fx, y, fz); uv.push(t2[0], t2[1]);
      }
      ringIdx.push(pos.length / 3 - SEG);
    });
    /* side walls */
    for (var r = 0; r < ringIdx.length - 1; r++) {
      var A = ringIdx[r], B = ringIdx[r + 1];
      for (var s2 = 0; s2 < SEG; s2++) { var s3 = (s2 + 1) % SEG; idx.push(A + s2, B + s2, A + s3, A + s3, B + s2, B + s3); }
    }
    /* tip: a single point below the last ring */
    var lastR = ringIdx[ringIdx.length - 1], tipV = pos.length / 3; var exT = sectionExtents(lowerPts, geom.tipH + 0.01, 0.015) || { zc: 0 };
    pos.push(cx, Y(geom.tipH) - 0.004 * H, exT.zc); norm.push(0, -1, 0); var tuv = uvOf(sgn * 0.01, Y(geom.tipH), exT.zc); uv.push(tuv[0], tuv[1]);
    delta.push(sgn * 0.5 * (sectionExtents(lowerPts, geom.tipH + 0.02, 0.02) || { hw: 0.01 }).hw * 0.2 - cx, 0, 0);
    for (var s4 = 0; s4 < SEG; s4++) idx.push(lastR + s4, tipV, lastR + (s4 + 1) % SEG);
    /* top: a shallow dome that closes inside the pelvis (the pelvis cap of the body mesh covers it) */
    var firstR = ringIdx[0], topV = pos.length / 3; var exH = sectionExtents(lowerPts, geom.hipH, 0.015) || { zc: 0, hw: 0.05 };
    pos.push(cx, Y(geom.hipH) + 0.012 * H, exH.zc); norm.push(0, 1, 0); var huv = uvOf(cx / NARROW, Y(geom.hipH), exH.zc); uv.push(huv[0], huv[1]);
    delta.push(sgn * 0.5 * exH.hw - cx, 0, 0);
    for (var s5 = 0; s5 < SEG; s5++) idx.push(firstR + (s5 + 1) % SEG, topV, firstR + s5);
    sides[S] = { start: start, count: pos.length / 3 - start, rings: ringIdx.length, cx: cx };
  });
  /* smooth normals from the triangles (the analytic ring normals ignore the taper) */
  var nrm = new Float64Array(pos.length);
  for (var t = 0; t < idx.length; t += 3) {
    var a0 = idx[t], b0 = idx[t + 1], c0 = idx[t + 2];
    var ux = pos[b0 * 3] - pos[a0 * 3], uy = pos[b0 * 3 + 1] - pos[a0 * 3 + 1], uz = pos[b0 * 3 + 2] - pos[a0 * 3 + 2];
    var vx = pos[c0 * 3] - pos[a0 * 3], vy = pos[c0 * 3 + 1] - pos[a0 * 3 + 1], vz = pos[c0 * 3 + 2] - pos[a0 * 3 + 2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    [a0, b0, c0].forEach(function (v) { nrm[v * 3] += nx; nrm[v * 3 + 1] += ny; nrm[v * 3 + 2] += nz; });
  }
  for (var v = 0; v < pos.length / 3; v++) { var l = Math.hypot(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]) || 1; norm[v * 3] = nrm[v * 3] / l; norm[v * 3 + 1] = nrm[v * 3 + 1] / l; norm[v * 3 + 2] = nrm[v * 3 + 2] / l; }
  return { pos: pos, norm: norm, uv: uv, delta: delta, idx: idx, sides: sides, rings: hs.length, seg: SEG };
}

/* nearest-vertex UV lookup over the fused lower body (coarse grid so 4k lookups stay cheap) */
export function makeUvLookup(P, UV, vertIdx, cell) {
  var grid = new Map(), c = cell || 0.02;
  function key(x, y, z) { return Math.floor(x / c) + '_' + Math.floor(y / c) + '_' + Math.floor(z / c); }
  vertIdx.forEach(function (i) { var k = key(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); var arr = grid.get(k); if (!arr) grid.set(k, arr = []); arr.push(i); });
  return function (x, y, z) {
    var best = -1, bd = Infinity, gx = Math.floor(x / c), gy = Math.floor(y / c), gz = Math.floor(z / c);
    for (var rad = 0; rad < 4 && best < 0; rad++) {
      for (var dx = -rad; dx <= rad; dx++) for (var dy = -rad; dy <= rad; dy++) for (var dz = -rad; dz <= rad; dz++) {
        var arr = grid.get((gx + dx) + '_' + (gy + dy) + '_' + (gz + dz)); if (!arr) continue;
        for (var q = 0; q < arr.length; q++) { var i = arr[q]; var d = (P[i * 3] - x) * (P[i * 3] - x) + (P[i * 3 + 1] - y) * (P[i * 3 + 1] - y) + (P[i * 3 + 2] - z) * (P[i * 3 + 2] - z); if (d < bd) { bd = d; best = i; } }
      }
    }
    if (best < 0) { best = vertIdx[0]; }
    return [UV[best * 2], UV[best * 2 + 1]];
  };
}
