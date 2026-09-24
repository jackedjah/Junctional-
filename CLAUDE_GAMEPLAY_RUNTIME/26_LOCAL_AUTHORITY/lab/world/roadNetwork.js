/* MAHWORLD road-surface topology.
   Converts authored polylines into one graph before terrain geometry is emitted:
   - every bend / crossing / T-junction is represented once;
   - crossing segments are split at the graph node;
   - coincident pieces have one deterministic owner;
   - callers can trim ribbons against the returned circular junction boundary.
   This module is deliberately THREE-free so the same graph can be regression-tested in Node. */

var EPS = 1e-6;

function q(v) { return Math.round(v * 10000) / 10000; }
function key(x, z) { return q(x) + ',' + q(z); }
function tierRank(t) { return t === 'CAUSEWAY' ? 3 : (t === 'REGIONAL' ? 2 : 1); }
function styleRank(s) { return tierRank(s.tier) * 1000 + (s.frameW || 0) * 10 + (s.coreW || 0); }
function dominant(a, b) { return !a || styleRank(b) > styleRank(a) || (styleRank(b) === styleRank(a) && String(b.id) < String(a.id)) ? b : a; }
function near(a, b) { return Math.abs(a - b) <= EPS; }
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function pointOn(s, x, z) {
  var dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], l2 = dx * dx + dz * dz;
  if (l2 <= EPS) return null;
  var t = ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / l2;
  if (t < -EPS || t > 1 + EPS) return null;
  var px = s.a[0] + dx * t, pz = s.a[1] + dz * t;
  return Math.hypot(px - x, pz - z) <= 0.001 ? Math.max(0, Math.min(1, t)) : null;
}
function intersections(a, b) {
  var rx = a.b[0] - a.a[0], rz = a.b[1] - a.a[1], sx = b.b[0] - b.a[0], sz = b.b[1] - b.a[1];
  var den = cross(rx, rz, sx, sz), qx = b.a[0] - a.a[0], qz = b.a[1] - a.a[1], out = [];
  if (Math.abs(den) > EPS) {
    var ta = cross(qx, qz, sx, sz) / den, tb = cross(qx, qz, rx, rz) / den;
    if (ta >= -EPS && ta <= 1 + EPS && tb >= -EPS && tb <= 1 + EPS) out.push({ ta: Math.max(0, Math.min(1, ta)), tb: Math.max(0, Math.min(1, tb)), x: a.a[0] + rx * ta, z: a.a[1] + rz * ta });
    return out;
  }
  if (Math.abs(cross(qx, qz, rx, rz)) > EPS) return out;
  [[a.a, 0, b], [a.b, 1, b]].forEach(function (v) { var t = pointOn(v[2], v[0][0], v[0][1]); if (t !== null) out.push({ ta: v[1], tb: t, x: v[0][0], z: v[0][1] }); });
  [[b.a, 0, a], [b.b, 1, a]].forEach(function (v) { var t = pointOn(v[2], v[0][0], v[0][1]); if (t !== null) out.push({ ta: t, tb: v[1], x: v[0][0], z: v[0][1] }); });
  return out;
}

export function buildRoadNetwork(roads, explicitNodes) {
  var raw = [], nodeMap = {}, crossCount = 0, duplicateRaw = 0, duplicatePieces = 0;
  function ensureNode(x, z, opt) {
    var k = key(x, z), n = nodeMap[k];
    if (!n) n = nodeMap[k] = { key: k, x: q(x), z: q(z), explicit: false, radius: 0, touch: {}, styles: [] };
    if (opt) { if (opt.explicit) { n.explicit = true; n.radius = Math.max(n.radius, +opt.radius || 0); n.kind = opt.kind || n.kind; n.id = opt.id || n.id; } else if (!n.explicit) { var rank = { BEND: 1, JOIN: 2, INTERSECTION: 3 }; if (!n.kind || (rank[opt.kind] || 0) > (rank[n.kind] || 0)) n.kind = opt.kind || n.kind; if (!n.id && opt.id) n.id = opt.id; } }
    return n;
  }
  (explicitNodes || []).forEach(function (n) { ensureNode(n.x, n.z, Object.assign({}, n, { explicit: true })); });
  (roads || []).forEach(function (r) {
    var pts = r.points || r.pts || [];
    for (var i = 0; i + 1 < pts.length; i++) {
      var a = [+pts[i][0], +pts[i][1]], b = [+pts[i + 1][0], +pts[i + 1][1]];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) <= EPS) continue;
      raw.push({ id: r.id, piece: i, a: a, b: b, style: r, splits: [{ t: 0, x: a[0], z: a[1] }, { t: 1, x: b[0], z: b[1] }] });
      if (i > 0) ensureNode(a[0], a[1], { kind: 'BEND', id: r.id + ':B' + i });
    }
  });
  for (var i = 0; i < raw.length; i++) for (var j = i + 1; j < raw.length; j++) {
    var hits = intersections(raw[i], raw[j]);
    hits.forEach(function (h) {
      var sharedEnd = (near(h.ta, 0) || near(h.ta, 1)) && (near(h.tb, 0) || near(h.tb, 1));
      if (!sharedEnd) crossCount++;
      ensureNode(h.x, h.z, { kind: sharedEnd ? 'JOIN' : 'INTERSECTION' });
      raw[i].splits.push({ t: h.ta, x: h.x, z: h.z }); raw[j].splits.push({ t: h.tb, x: h.x, z: h.z });
    });
  }
  Object.keys(nodeMap).forEach(function (nk) {
    var n = nodeMap[nk];
    raw.forEach(function (s) { var t = pointOn(s, n.x, n.z); if (t !== null) s.splits.push({ t: t, x: n.x, z: n.z }); });
  });
  var pieceMap = {};
  raw.forEach(function (s) {
    s.splits.sort(function (a, b) { return a.t - b.t; });
    var cuts = [];
    s.splits.forEach(function (v) { if (!cuts.length || Math.abs(v.t - cuts[cuts.length - 1].t) > EPS) cuts.push(v); });
    for (var c = 0; c + 1 < cuts.length; c++) {
      var a = cuts[c], b = cuts[c + 1]; if (Math.hypot(b.x - a.x, b.z - a.z) <= EPS) continue;
      var ka = key(a.x, a.z), kb = key(b.x, b.z), pk = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      var p = { id: s.id + ':' + s.piece + ':' + c, roadId: s.id, a: [q(a.x), q(a.z)], b: [q(b.x), q(b.z)], aKey: nodeMap[ka] ? ka : null, bKey: nodeMap[kb] ? kb : null, style: s.style };
      if (!pieceMap[pk]) pieceMap[pk] = p;
      else { duplicatePieces++; if (dominant(pieceMap[pk].style, p.style) === p.style) pieceMap[pk] = p; }
    }
  });
  var pieces = Object.keys(pieceMap).map(function (k) { return pieceMap[k]; });
  pieces.forEach(function (p) { [p.aKey, p.bKey].forEach(function (nk) { if (!nk) return; var n = nodeMap[nk]; n.touch[p.roadId] = true; if (n.styles.indexOf(p.style) < 0) n.styles.push(p.style); }); });
  var nodes = Object.keys(nodeMap).map(function (k) {
    var n = nodeMap[k], d = null; n.styles.forEach(function (s) { d = dominant(d, s); }); n.owner = d;
    var maxFrame = 0, maxCore = 0; n.styles.forEach(function (s) { maxFrame = Math.max(maxFrame, s.frameW || 0); maxCore = Math.max(maxCore, s.coreW || 0); });
    n.frameRadius = Math.max(n.radius, maxFrame * 0.5 + (n.explicit ? 0 : 0.35));
    n.coreRadius = Math.max(0.1, n.explicit ? n.frameRadius - 0.8 : maxCore * 0.5 + 0.22);
    n.degree = Object.keys(n.touch).length; return n;
  }).filter(function (n) { return n.explicit || n.styles.length > 1 || n.degree > 1 || n.kind === 'BEND'; });
  var keep = {}; nodes.forEach(function (n) { keep[n.key] = true; });
  pieces.forEach(function (p) { if (p.aKey && !keep[p.aKey]) p.aKey = null; if (p.bKey && !keep[p.bKey]) p.bKey = null; });
  var seenRaw = {}; raw.forEach(function (s) { var a = key(s.a[0], s.a[1]), b = key(s.b[0], s.b[1]), k = a < b ? a + '|' + b : b + '|' + a; if (seenRaw[k]) duplicateRaw++; seenRaw[k] = true; });
  return { pieces: pieces, nodes: nodes, nodeByKey: nodeMap, stats: { authored_roads: (roads || []).length, input_segments: raw.length, output_pieces: pieces.length, junctions: nodes.length, crossings_split: crossCount, duplicate_authored_segments: duplicateRaw, duplicate_pieces_prevented: duplicatePieces } };
}
