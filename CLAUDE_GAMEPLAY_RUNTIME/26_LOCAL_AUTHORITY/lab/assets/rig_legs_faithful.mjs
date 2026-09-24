/* MAHWORLD :: SEPARATED LEGS v6 "FAITHFUL" — the split legs are the fused lower body's OWN triangles (CONVERGENCE O6: prefer preserving
   source geometry and attributes; reconstruct only what is missing).
     · the fused lower body (every triangle below the crotch line, inside the torso column) is CUT by the sagittal plane x = 0; the left
       half becomes the left leg's lateral wall, the right half the right leg's — the same vertices, triangles, normals and UVs as the
       source (a clipped triangle gets seam vertices interpolated along its own edges, so every triangle still sits inside its own
       texture island: no resampled UVs, no nearest-vertex patchwork — the F04 "dense patterning" came from resampling a 223-island atlas);
     · the missing MEDIAL wall of each leg is inferred from the species' own anatomy: the mirror image of that lateral wall, compressed
       toward the seam plane (x' = −k·x, k = `inner`, a D-section whose front / back / knee / calf shape is the fused outline's), welded
       to the lateral wall along the seam (the seam vertices are shared, so the leg is one closed manifold surface); its normals are the
       exact inverse-transpose of that map, its UVs the lateral wall's (the texture mirrors onto the inner face);
     · the top is closed by a shallow cone inside the pelvis (apex under the femoral head, the v4/v5 dome law) so the thigh can pivot
       where the hip is; the pointed tip is the fused tip, halved;
     · in the SEPARATED form each leg is pushed laterally by `shift` = k · (thigh half-width) so the two medial walls meet at the midline
       instead of interpenetrating (legs together at the thighs, a hair apart lower down — the fused taper's own proportions); the shift
       RAMPS in below the crotch line (0 at the pelvis ring, full 0.08 H lower) so the leg's top ring never leaves the pelvis shell and the
       top cone stays hidden in every form — above the ramp the two D-walls overlap inside the pelvis (interpenetration, never shared geometry);
     · PACKED (the fused look during the transformation) = every lateral vertex back at its EXACT source position and every medial vertex
       folded flat onto the sagittal plane, so the packed pair IS the fused silhouette (identity check: max |packed − source| = 0).
   Same return contract as buildLegsSurgical: { pos, norm, uv, delta, idx, sides { L, R: { start, count, rings, cx } }, rings, seg, profile,
   stats }. Source units; L vertices first, then R (the generator assigns THIGH / SHIN / TIP joints per side by that order). */
function clipTriangles(P, NM, UV, IDX, tris, sign) {
  /* keep the part of every triangle with sign·x ≤ 0 (sign = +1 → the left half x ≤ 0; sign = −1 → the right half x ≥ 0).
     Sutherland–Hodgman against one plane: a crossing triangle yields a triangle or a quad (two triangles). Seam vertices are cached per
     source edge so the two triangles that share a cut edge share the new vertex (a manifold seam). Returns local arrays. */
  var pos = [], norm = [], uv = [], idx = [], map = new Map(), seamCache = new Map(), seam = new Set();
  function side(i) { return sign * P[i * 3]; }
  function srcVert(i) { var m = map.get(i); if (m !== undefined) return m; var n = pos.length / 3; pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); norm.push(NM[i * 3], NM[i * 3 + 1], NM[i * 3 + 2]); uv.push(UV[i * 2], UV[i * 2 + 1]); map.set(i, n); if (Math.abs(P[i * 3]) < 1e-7) seam.add(n); return n; }
  function cutVert(a, b) { var key = a < b ? a + '_' + b : b + '_' + a; var m = seamCache.get(key); if (m !== undefined) return m; var xa = P[a * 3], xb = P[b * 3]; var t = xa / (xa - xb); var n = pos.length / 3;
    pos.push(0, P[a * 3 + 1] + (P[b * 3 + 1] - P[a * 3 + 1]) * t, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * t);
    var nx = NM[a * 3] + (NM[b * 3] - NM[a * 3]) * t, ny = NM[a * 3 + 1] + (NM[b * 3 + 1] - NM[a * 3 + 1]) * t, nz = NM[a * 3 + 2] + (NM[b * 3 + 2] - NM[a * 3 + 2]) * t; var l = Math.hypot(nx, ny, nz) || 1; norm.push(nx / l, ny / l, nz / l);
    uv.push(UV[a * 2] + (UV[b * 2] - UV[a * 2]) * t, UV[a * 2 + 1] + (UV[b * 2 + 1] - UV[a * 2 + 1]) * t); seamCache.set(key, n); seam.add(n); return n; }
  var kept = 0, cut = 0;
  tris.forEach(function (t) {
    var v = [IDX[t * 3], IDX[t * 3 + 1], IDX[t * 3 + 2]]; var s = v.map(side);
    if (s[0] <= 1e-7 && s[1] <= 1e-7 && s[2] <= 1e-7) { idx.push(srcVert(v[0]), srcVert(v[1]), srcVert(v[2])); kept++; return; }
    if (s[0] >= -1e-7 && s[1] >= -1e-7 && s[2] >= -1e-7) return;   /* entirely on the other side */
    cut++; var poly = [];   /* clip the polygon v0 v1 v2 against side ≤ 0 (winding preserved) */
    for (var i = 0; i < 3; i++) { var a = v[i], b = v[(i + 1) % 3], sa = s[i], sb = s[(i + 1) % 3]; var ina = sa <= 1e-7, inb = sb <= 1e-7;
      if (ina) poly.push({ src: a }); if (ina !== inb) poly.push({ cut: [a, b] }); }
    var loc = poly.map(function (p) { return p.src !== undefined ? srcVert(p.src) : cutVert(p.cut[0], p.cut[1]); });
    for (var k = 1; k + 1 < loc.length; k++) idx.push(loc[0], loc[k], loc[k + 1]);
  });
  return { pos: pos, norm: norm, uv: uv, idx: idx, seam: seam, kept: kept, cut: cut };
}
function weldIds(pos) { var ids = new Int32Array(pos.length / 3), key = new Map(), rep = [], n = 0; for (var v = 0; v < ids.length; v++) { var k = Math.round(pos[v * 3] * 1e6) + '_' + Math.round(pos[v * 3 + 1] * 1e6) + '_' + Math.round(pos[v * 3 + 2] * 1e6); var w = key.get(k); if (w === undefined) { w = n++; key.set(k, w); rep.push(v); } ids[v] = w; } return { ids: ids, rep: rep, count: n }; }
function openEdges(idx, ids) {
  /* boundary edges (used once, welded by position) of a triangle set, as directed [a, b] in local vertex indices (the direction of the
     triangle that owns them, so a cap that traverses them b → a is consistently wound) */
  var count = new Map(), dir = new Map(); function ek(a, b) { return a < b ? a + '_' + b : b + '_' + a; }
  for (var t = 0; t < idx.length; t += 3) { var v = [idx[t], idx[t + 1], idx[t + 2]]; for (var i = 0; i < 3; i++) { var a = v[i], b = v[(i + 1) % 3]; var k = ek(ids[a], ids[b]); count.set(k, (count.get(k) || 0) + 1); dir.set(k, [a, b]); } }
  var edges = []; count.forEach(function (c, k) { if (c === 1) edges.push(dir.get(k)); }); return edges;
}
export function buildLegsFaithful(src, o) {
  var P = src.P, NM = src.NM, UV = src.UV, IDX = src.IDX, lowerTris = src.lowerTris; var Y = o.Y, k = o.inner === undefined ? 0.31 : o.inner;
  var pos = [], norm = [], uv = [], delta = [], idx = [], sides = {}, stats = { inner: k, gap: o.gap === undefined ? 0.0005 : o.gap, ramp_h: o.ramp_h === undefined ? 0.08 : o.ramp_h, knee_blend: o.kneeBlend === undefined ? null : o.kneeBlend, sides: {} };
  ['L', 'R'].forEach(function (S) {
    var sign = S === 'L' ? 1 : -1;   /* left leg = the x ≤ 0 half (the source's left is −x) */
    var half = clipTriangles(P, NM, UV, IDX, lowerTris, sign); var nh = half.pos.length / 3; var triStart = idx.length / 3;
    /* thigh half-width from the clipped wall's widest band just under the crotch (the lateral shift of the separated form) */
    var hwMax = 0; for (var i = 0; i < nh; i++) { var h = (half.pos[i * 3 + 1] - o.minY) / o.H; if (h > o.splitH - 0.04) hwMax = Math.max(hwMax, Math.abs(half.pos[i * 3])); }
    var gapS = -sign * (o.gap === undefined ? 0.0005 : o.gap); var shiftFull = -sign * k * hwMax;   /* the leg moves laterally so the medial D reaches, but never crosses, the midline (a 0.5 mm gap: the two medial walls never share an edge) */
    /* PASS 4B review: the lateral shift RAMPS in from the crotch line — 0 at the pelvis ring (the leg's top stays inside the pelvis shell, no hip ledge) to full `ramp_h` (0.08 H ≈ 15 cm) below it; above the ramp the two medial D-walls overlap (they interpenetrate inside the pelvis and between the thighs — never shared geometry) */
    var rampH = o.ramp_h === undefined ? 0.08 : o.ramp_h; var wOf = function (y) { var d = (o.splitH - 0.005) - (y - o.minY) / o.H; var t = Math.max(0, Math.min(1, d / rampH)); return t * t * (3 - 2 * t); };
    var base = pos.length / 3; var seamLocal = half.seam; var innerOf = new Int32Array(nh);
    /* lateral wall: the source vertices (shifted by the ramp), source normals and UVs; packed = the exact source position */
    for (var i2 = 0; i2 < nh; i2++) { var sh2 = gapS + shiftFull * wOf(half.pos[i2 * 3 + 1]); pos.push(half.pos[i2 * 3] + sh2, half.pos[i2 * 3 + 1], half.pos[i2 * 3 + 2]); norm.push(half.norm[i2 * 3], half.norm[i2 * 3 + 1], half.norm[i2 * 3 + 2]); uv.push(half.uv[i2 * 2], half.uv[i2 * 2 + 1]); delta.push(-sh2, 0, 0); }
    /* medial wall: the mirror of the lateral wall compressed toward the seam plane by k·w(h) (seam vertices are shared, not duplicated);
       normal = inverse-transpose of x' = −k·x → (−nx / k, ny, nz) normalised */
    for (var i3 = 0; i3 < nh; i3++) { if (seamLocal.has(i3)) { innerOf[i3] = i3; continue; } var n = pos.length / 3 - base; innerOf[i3] = n;
      var x = half.pos[i3 * 3]; var w3 = wOf(half.pos[i3 * 3 + 1]); var kw = k; var sh3 = gapS + shiftFull * w3;   /* the medial D keeps its full depth all the way up (a flattened wall would fold the front and back halves onto each other); only the SHIFT ramps in, so at the crotch the two D-walls overlap each other inside the pelvis / between the thighs (interpenetration, no shared geometry) and open up as the shift comes in below */ pos.push(-kw * x + sh3, half.pos[i3 * 3 + 1], half.pos[i3 * 3 + 2]);
      var mx = -half.norm[i3 * 3] / kw, my = half.norm[i3 * 3 + 1], mz = half.norm[i3 * 3 + 2]; var ml = Math.hypot(mx, my, mz) || 1; norm.push(mx / ml, my / ml, mz / ml); uv.push(half.uv[i3 * 2], half.uv[i3 * 2 + 1]);
      delta.push(-(-kw * x + sh3), 0, 0); }   /* packed: folded flat onto the sagittal plane (x = 0) — the packed pair is the fused silhouette */
    var shift = shiftFull;
    for (var t = 0; t < half.idx.length; t += 3) { idx.push(base + half.idx[t], base + half.idx[t + 1], base + half.idx[t + 2]); idx.push(base + innerOf[half.idx[t]], base + innerOf[half.idx[t + 2]], base + innerOf[half.idx[t + 1]]); }   /* mirror → reversed winding */
    /* top closure: the open arc of the lateral wall (boundary edges by position, minus the seam itself) + its mirror → a shallow cone to an apex inside the pelvis */
    var weld = weldIds(half.pos); var edges = openEdges(half.idx, weld.ids).filter(function (e) { return !(seamLocal.has(e[0]) && seamLocal.has(e[1])); });
    var apexY = Y(o.domeTop); var cxSum = 0, czSum = 0, cn = 0, arcTop = -Infinity, arcBot = Infinity; edges.forEach(function (e) { e.forEach(function (v) { cxSum += pos[(base + v) * 3]; czSum += pos[(base + v) * 3 + 2]; cn++; arcTop = Math.max(arcTop, pos[(base + v) * 3 + 1]); arcBot = Math.min(arcBot, pos[(base + v) * 3 + 1]); }); });
    var arcMaxAbsX = 0; edges.forEach(function (e) { e.forEach(function (v) { arcMaxAbsX = Math.max(arcMaxAbsX, Math.abs(pos[(base + v) * 3])); }); });
    if (edges.length && ((arcBot - o.minY) / o.H < o.splitH - 0.02 || (arcTop - o.minY) / o.H > o.splitH + 0.005)) throw new Error('faithful legs ' + S + ': the open arc is not the crotch ring (h ' + ((arcBot - o.minY) / o.H).toFixed(3) + '–' + ((arcTop - o.minY) / o.H).toFixed(3) + ') — a stray boundary in the source lower body');
    if (o.shellHW && arcMaxAbsX > o.shellHW + 0.001) throw new Error('faithful legs ' + S + ': the top ring (|x| ' + arcMaxAbsX.toFixed(4) + ') is outside the pelvis shell (' + o.shellHW.toFixed(4) + ')');
    var apexShift = gapS + shiftFull * wOf(apexY); var apex = pos.length / 3; var ax = cn ? cxSum / cn : apexShift, az = cn ? czSum / cn : 0; pos.push(ax, apexY, az); norm.push(0, 1, 0); uv.push(half.uv[0], half.uv[1]); delta.push(-apexShift, 0, 0);
    edges.forEach(function (e) { var a = base + e[0], b = base + e[1]; idx.push(b, a, apex); var ia = base + innerOf[e[0]], ib = base + innerOf[e[1]]; if (ia !== a || ib !== b) idx.push(ia, ib, apex); });   /* the lateral arc winds one way, its mirror the other */
    var count = pos.length / 3 - base; sides[S] = { start: base, count: count, rings: 0, cx: +(ax).toFixed(4) };
    stats.sides[S] = { source_tris_kept: half.kept, source_tris_cut: half.cut, seam_verts: seamLocal.size, top_arc_edges: edges.length, verts: count, tris: idx.length / 3 - triStart, thigh_half_width: +hwMax.toFixed(4), lateral_shift_full: +shift.toFixed(4), shift_ramp_h: rampH, top_ring_max_abs_x: +arcMaxAbsX.toFixed(4), shell_half_width: o.shellHW ? +o.shellHW.toFixed(4) : null, arc_h: [+((arcBot - o.minY) / o.H).toFixed(4), +((arcTop - o.minY) / o.H).toFixed(4)] };
  });
  /* profile for the generator's log: half-width / half-depth / centre per height band (the separated form, left leg) */
  var profile = []; for (var h = 0.02; h < o.splitH; h += 0.02) { var sel = []; for (var v3 = sides.L.start; v3 < sides.L.start + sides.L.count; v3++) { var hh = (pos[v3 * 3 + 1] - o.minY) / o.H; if (Math.abs(hh - h) < 0.01) sel.push(v3); } if (!sel.length) continue; var xs = sel.map(function (v) { return pos[v * 3]; }), zs = sel.map(function (v) { return pos[v * 3 + 2]; }); profile.push({ h: +h.toFixed(2), hw: +((Math.max.apply(null, xs) - Math.min.apply(null, xs)) / 2).toFixed(4), hd: +((Math.max.apply(null, zs) - Math.min.apply(null, zs)) / 2).toFixed(4), zc: +((Math.max.apply(null, zs) + Math.min.apply(null, zs)) / 2).toFixed(4) }); }
  return { pos: pos, norm: norm, uv: uv, delta: delta, idx: idx, sides: sides, rings: 0, seg: 0, profile: profile, stats: stats };
}
