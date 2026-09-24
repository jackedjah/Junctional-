/* MAHWORLD :: GEODESIC SKIN WEIGHTS (reusable method — lab/rig_profile.json step 3)
   Influence follows the SURFACE, not straight-line proximity: an arm hanging beside the ribs cannot pull the ribs, because
   the shortest path from a rib vertex to the arm's territory has to travel over the armpit. Blender's bone-heat solver
   returns all-zero weights on these crystalline multi-shell meshes (it reports FINISHED and assigns nothing), so the
   binding is solved here, in the same pass that writes the GLB.
     1 weld vertices by position (UV seams split a Tripo mesh into a disconnected graph otherwise)
     2 territory: each vertex is claimed by the nearest ELIGIBLE bone segment (eligibility keeps a rib out of an arm bone)
     3 per bone, multi-source Dijkstra over the welded edge graph from its own territory → geodesic distance field
     4 sigma per bone is MEASURED: the mean thickness of that bone's own territory, so a forearm blends over a forearm's
       width and a chest over a chest's — no global falloff constant
     5 gaussian of the geodesic distance, top 4 influences, normalised (the loader's limit) */

export function weldVertices(P, N, quant) {
  var map = new Int32Array(N), key = new Map(), pos = [], q = quant;
  for (var i = 0; i < N; i++) {
    var k = Math.round(P[i * 3] / q) + '_' + Math.round(P[i * 3 + 1] / q) + '_' + Math.round(P[i * 3 + 2] / q);
    var w = key.get(k);
    if (w === undefined) { w = pos.length / 3; key.set(k, w); pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); }
    map[i] = w;
  }
  return { map: map, pos: new Float64Array(pos), count: pos.length / 3 };
}

export function buildGraph(IDX, map, pos, count) {
  var seen = new Set(), head = new Int32Array(count + 1), pairs = [];
  function add(a, b) {
    if (a === b) return; var k = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    if (seen.has(k)) return; seen.add(k);
    var dx = pos[a * 3] - pos[b * 3], dy = pos[a * 3 + 1] - pos[b * 3 + 1], dz = pos[a * 3 + 2] - pos[b * 3 + 2];
    pairs.push([a, b, Math.sqrt(dx * dx + dy * dy + dz * dz)]);
  }
  for (var t = 0; t < IDX.length; t += 3) { var a = map[IDX[t]], b = map[IDX[t + 1]], c = map[IDX[t + 2]]; add(a, b); add(b, c); add(c, a); }
  for (var i = 0; i < pairs.length; i++) { head[pairs[i][0]]++; head[pairs[i][1]]++; }
  var start = new Int32Array(count + 1); for (var v = 0; v < count; v++) start[v + 1] = start[v] + head[v];
  var fill = start.slice(), adj = new Int32Array(start[count]), wts = new Float64Array(start[count]);
  for (var p2 = 0; p2 < pairs.length; p2++) { var e = pairs[p2]; adj[fill[e[0]]] = e[1]; wts[fill[e[0]]++] = e[2]; adj[fill[e[1]]] = e[0]; wts[fill[e[1]]++] = e[2]; }
  return { start: start, adj: adj, wts: wts, count: count, edges: pairs.length };
}

/* binary heap of (dist, node) */
function Heap() { this.d = [0]; this.n = [0]; this.size = 0; }
Heap.prototype.push = function (dist, node) {
  var i = ++this.size; this.d[i] = dist; this.n[i] = node;
  while (i > 1) { var p = i >> 1; if (this.d[p] <= this.d[i]) break; var td = this.d[p], tn = this.n[p]; this.d[p] = this.d[i]; this.n[p] = this.n[i]; this.d[i] = td; this.n[i] = tn; i = p; }
};
Heap.prototype.pop = function () {
  var rd = this.d[1], rn = this.n[1]; this.d[1] = this.d[this.size]; this.n[1] = this.n[this.size]; this.size--;
  var i = 1; for (;;) { var l = i * 2, r = l + 1, s = i; if (l <= this.size && this.d[l] < this.d[s]) s = l; if (r <= this.size && this.d[r] < this.d[s]) s = r; if (s === i) break; var td = this.d[s], tn = this.n[s]; this.d[s] = this.d[i]; this.n[s] = this.n[i]; this.d[i] = td; this.n[i] = tn; i = s; }
  return { d: rd, n: rn };
};

export function dijkstra(g, sources) {
  var dist = new Float64Array(g.count).fill(Infinity), h = new Heap();
  for (var i = 0; i < sources.length; i++) { dist[sources[i]] = 0; h.push(0, sources[i]); }
  while (h.size) {
    var top = h.pop(); if (top.d > dist[top.n] + 1e-12) continue;
    for (var e = g.start[top.n]; e < g.start[top.n + 1]; e++) {
      var nb = g.adj[e], nd = top.d + g.wts[e];
      if (nd < dist[nb]) { dist[nb] = nd; h.push(nd, nb); }
    }
  }
  return dist;
}

export function segDist(px, py, pz, s) {
  var ax = s.a[0], ay = s.a[1], az = s.a[2], bx = s.b[0] - ax, by = s.b[1] - ay, bz = s.b[2] - az;
  var L2 = bx * bx + by * by + bz * bz, t = L2 > 0 ? ((px - ax) * bx + (py - ay) * by + (pz - az) * bz) / L2 : 0;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  var dx = px - (ax + bx * t), dy = py - (ay + by * t), dz = pz - (az + bz * t);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/* P, IDX: source mesh · SEG: {bone: {a,b}} segments in source units · eligibleOf(i): array of bone keys allowed for vertex i
   returns { weights: [{bone:w}], sigma: {bone}, territory: {bone: count}, stats } */
export function geodesicWeights(P, IDX, N, SEG, eligibleOf, opts) {
  opts = opts || {}; var scale = opts.scale || 1, blend = opts.blend === undefined ? 0.85 : opts.blend;
  var bones = Object.keys(SEG);
  var weld = weldVertices(P, N, opts.quant || 1e-4 * scale);
  var g = buildGraph(IDX, weld.map, weld.pos, weld.count);
  /* territory: nearest eligible bone, resolved per welded vertex (union of the eligibility of its original vertices) */
  var owner = new Array(weld.count).fill(null), ownerD = new Float64Array(weld.count).fill(Infinity);
  for (var i = 0; i < N; i++) {
    var w = weld.map[i], el = eligibleOf(i), px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2];
    for (var k = 0; k < el.length; k++) {
      var b = el[k]; if (!SEG[b]) continue;
      var d = segDist(px, py, pz, SEG[b]);
      if (d < ownerD[w]) { ownerD[w] = d; owner[w] = b; }
    }
  }
  var terr = {}, thick = {};
  bones.forEach(function (b) { terr[b] = []; thick[b] = []; });
  for (var v = 0; v < weld.count; v++) { if (owner[v] !== null) { terr[owner[v]].push(v); thick[owner[v]].push(ownerD[v]); } }
  /* sigma = measured mean thickness of the bone's own territory */
  var sigma = {};
  bones.forEach(function (b) {
    var t = thick[b];
    var m = t.length ? t.reduce(function (s, x) { return s + x; }, 0) / t.length : 0.03 * scale;
    sigma[b] = Math.max(0.010 * scale, Math.min(0.12 * scale, blend * (m || 0.03 * scale)));
  });
  /* geodesic field per bone, gaussian, accumulate per original vertex */
  var acc = new Array(N); for (var q = 0; q < N; q++) acc[q] = {};
  var reach = {}, gate = opts.gate || null;
  bones.forEach(function (b) {
    if (!terr[b].length) { reach[b] = 0; return; }
    var dist = dijkstra(g, terr[b]), s = sigma[b], cut = 3.0 * s, hit = 0;
    for (var o = 0; o < N; o++) {
      var d2 = dist[weld.map[o]]; if (!(d2 < cut)) continue;
      var wv = Math.exp(-(d2 * d2) / (s * s)); if (wv < 1e-3) continue;
      /* a bone's field may cross a limb boundary geodesically (over the armpit, over the hip). The gate is the same measured
         separation used for seeding, applied softly, so a shoulder lift cannot drag the middle of the chest. It never touches
         the vertex's own territory bone. */
      if (gate && owner[weld.map[o]] !== b) { wv *= gate(o, b); if (wv < 1e-3) continue; }
      acc[o][b] = wv; hit++;
    }
    reach[b] = hit;
  });
  /* every vertex must have at least its owner */
  for (var o2 = 0; o2 < N; o2++) { var ow = owner[weld.map[o2]]; if (ow && !acc[o2][ow]) acc[o2][ow] = 1; }
  return { weights: acc, sigma: sigma, territory: (function () { var t = {}; bones.forEach(function (b) { t[b] = terr[b].length; }); return t; })(), reach: reach, welded: weld.count, edges: g.edges, owner: owner, weldMap: weld.map };
}

/* top-4 normalised joint/weight arrays for the glTF accessors */
export function finalizeWeights(acc, N, boneIndex) {
  var J4 = new Uint16Array(N * 4), W4 = new Float32Array(N * 4), used = {};
  for (var i = 0; i < N; i++) {
    var ks = Object.keys(acc[i]).map(function (b) { return { b: b, w: acc[i][b] }; }).sort(function (u, v) { return v.w - u.w; }).slice(0, 4);
    var s = ks.reduce(function (a, x) { return a + x.w; }, 0) || 1;
    for (var k = 0; k < 4; k++) {
      if (k < ks.length) { J4[i * 4 + k] = boneIndex[ks[k].b]; W4[i * 4 + k] = ks[k].w / s; if (k === 0) used[ks[k].b] = (used[ks[k].b] || 0) + 1; }
      else { J4[i * 4 + k] = 0; W4[i * 4 + k] = 0; }
    }
  }
  return { joints: J4, weights: W4, primary: used };
}
