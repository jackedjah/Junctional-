/* MAHWORLD :: PURE MACRO RIDGE LAYOUT
   Shared by the Three.js ridge renderer and the authoritative world-collider build.  This module deliberately has no Three.js, DOM or
   host imports: a registry ridge always resolves to the same seeded stations, visible inner face and bounded collision proxies.

   The ridge is scenery until its visible inner face enters the reachable 600 m FIELD square.  Only that face receives collision.  Each
   proxy is a short, finite-height BOX around a swept slice of the two actual rendered inner-face triangles.  Adaptive vertical slices cap
   how far the slope can move through one proxy; using both band edges keeps the visible face inside collision instead of sampling only the
   band midpoint.  This avoids an invisible full-ring wall and lets flight clear the actual crest.  Registry pass bearings are omitted with
   a segment/body safety margin so their route gaps remain traversable at low frame rates. */

var TAU = Math.PI * 2;
var FACE_BASE_Y = -4;

function seeded(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function round(n, places) { var p = Math.pow(10, places === undefined ? 3 : places); return Math.round(n * p) / p; }
function angleDelta(a, b) { var d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function boxTouchesBounds(x1, z1, x2, z2, B, pad) { return x2 >= B.x1 - pad && x1 <= B.x2 + pad && z2 >= B.z1 - pad && z1 <= B.z2 + pad; }
function pointSegmentDistance(px, pz, ax, az, bx, bz) { var dx = bx - ax, dz = bz - az, d2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / d2)); return Math.hypot(px - (ax + dx * t), pz - (az + dz * t)); }
function cross(ax, az, bx, bz, cx, cz) { return (bx - ax) * (cz - az) - (bz - az) * (cx - ax); }
function segmentsIntersect(ax, az, bx, bz, cx, cz, dx, dz) { var e = 1e-8, abC = cross(ax, az, bx, bz, cx, cz), abD = cross(ax, az, bx, bz, dx, dz), cdA = cross(cx, cz, dx, dz, ax, az), cdB = cross(cx, cz, dx, dz, bx, bz); return ((abC > e && abD < -e) || (abC < -e && abD > e)) && ((cdA > e && cdB < -e) || (cdA < -e && cdB > e)); }
function segmentDistance(ax, az, bx, bz, cx, cz, dx, dz) { if (segmentsIntersect(ax, az, bx, bz, cx, cz, dx, dz)) return 0; return Math.min(pointSegmentDistance(ax, az, cx, cz, dx, dz), pointSegmentDistance(bx, bz, cx, cz, dx, dz), pointSegmentDistance(cx, cz, ax, az, bx, bz), pointSegmentDistance(dx, dz, ax, az, bx, bz)); }

export function ridgeHeightAt(R, bearing) {
  var h = R.h_min + (R.h_max - R.h_min) * (0.5 + 0.5 * Math.sin(bearing * 3.1 + 0.7) * 0.6 + 0.4 * Math.sin(bearing * 7.3 + 2.1) * 0.5 + 0.3 * Math.sin(bearing * 13.7));
  h = Math.max(R.h_min * 0.6, h);
  var northness = Math.cos(bearing);   /* bearing 0 = north (+z); the south/open-sea sector fades away */
  if (northness < -0.35) h *= Math.max(0, 1 - (-0.35 - northness) / 0.35);
  (R.passes || []).forEach(function (P) {
    var d = Math.abs(angleDelta(bearing, P.bearing_rad));
    if (d < P.half_width_rad) { var k = d / P.half_width_rad; h = Math.min(h, P.floor_m + (h - P.floor_m) * k * k); }
  });
  return h;
}

export function ridgeStations(R, ridgeIndex) {
  var N = R.segments || 160, rnd = seeded(0x9A11 + (ridgeIndex || 0) * 977), out = [];
  for (var i = 0; i < N; i++) {
    var b = i / N * TAU, dist = R.dist_m + (rnd() - 0.5) * R.dist_jitter_m;
    out.push({ b: b, x: Math.sin(b) * dist, z: Math.cos(b) * dist, h: ridgeHeightAt(R, b), w: R.base_w_m * (0.8 + rnd() * 0.4) });
  }
  /* This is a closed ribbon, not one more random station.  Re-sampling at 2π changes both seeded radius/width and the non-integer layered
     height waves, leaving a large visible/collision tear between segment N-1 and segment 0.  Preserve the terminal bearing for segment
     bookkeeping but clone every piece of geometry/profile data from station 0 exactly. */
  if (out.length) out.push({ b: TAU, x: out[0].x, z: out[0].z, h: out[0].h, w: out[0].w });
  return out;
}

/* The exact six points used by macro.js for one rendered ribbon segment. */
export function ridgeFaceSegment(stations, segmentIndex) {
  var a = stations[segmentIndex], b = stations[segmentIndex + 1]; if (!a || !b) return null;
  /* Use each station's radial outward vector for its base points.  A chord normal becomes unstable when seeded radial jitter is larger than
     one angular step and gave adjacent triangles different base vertices (visible cracks plus collider gaps).  Shared station points keep the
     ribbon watertight.  The averaged radial vector remains the face-lighting normal used by macro.js. */
  var ar = Math.hypot(a.x, a.z) || 1, br = Math.hypot(b.x, b.z) || 1, aox = a.x / ar, aoz = a.z / ar, box = b.x / br, boz = b.z / br;
  var ox = aox + box, oz = aoz + boz, ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
  return {
    a: a, b: b, ox: ox, oz: oz,
    crestA: { x: a.x, y: a.h, z: a.z }, crestB: { x: b.x, y: b.h, z: b.z },
    innerA: { x: a.x - aox * a.w, y: FACE_BASE_Y, z: a.z - aoz * a.w }, innerB: { x: b.x - box * b.w, y: FACE_BASE_Y, z: b.z - boz * b.w },
    outerA: { x: a.x + aox * a.w * 1.3, y: FACE_BASE_Y, z: a.z + aoz * a.w * 1.3 }, outerB: { x: b.x + box * b.w * 1.3, y: FACE_BASE_Y, z: b.z + boz * b.w * 1.3 }
  };
}

export function ridgeFacePoint(inner, crest, y) {
  var t = Math.max(0, Math.min(1, (y - inner.y) / Math.max(1e-6, crest.y - inner.y)));
  return { x: inner.x + (crest.x - inner.x) * t, y: y, z: inner.z + (crest.z - inner.z) * t };
}

/* These are the two inner triangles emitted by macro.js, in the same winding.  Keeping the triangle topology here means collision also
   follows the small non-planar kink that can exist between stations with different seeded radii/heights. */
export function ridgeInnerTriangles(F) {
  if (!F) return [];
  var axis = { x: F.innerB.x - F.innerA.x + F.crestB.x - F.crestA.x, z: F.innerB.z - F.innerA.z + F.crestB.z - F.crestA.z };
  if (Math.hypot(axis.x, axis.z) < 1e-8) axis = { x: F.crestB.x - F.crestA.x, z: F.crestB.z - F.crestA.z };
  return [
    { index: 0, points: [F.innerA, F.crestB, F.crestA], axis: axis },
    { index: 1, points: [F.innerA, F.innerB, F.crestB], axis: axis }
  ];
}

/* Exact horizontal intersection of one rendered triangle.  The stable along-ridge ordering lets adjacent vertical slices pair the same
   two triangle edges even when the segment happens to be close to an x- or z-axis. */
export function ridgeTriangleSection(T, y) {
  var V = T && T.points || [], eps = 1e-7, pts = [];
  function add(p) { for (var q = 0; q < pts.length; q++) if (Math.hypot(pts[q].x - p.x, pts[q].z - p.z) < 1e-7) return; pts.push({ x: p.x, y: y, z: p.z }); }
  for (var i = 0; i < V.length; i++) if (Math.abs(V[i].y - y) <= eps) add(V[i]);
  for (var a = 0; a < V.length; a++) for (var b = a + 1; b < V.length; b++) {
    var lo = Math.min(V[a].y, V[b].y), hi = Math.max(V[a].y, V[b].y);
    if (y <= lo + eps || y >= hi - eps) continue;
    var t = (y - V[a].y) / (V[b].y - V[a].y);
    add({ x: V[a].x + (V[b].x - V[a].x) * t, z: V[a].z + (V[b].z - V[a].z) * t });
  }
  if (!pts.length) return null;
  if (pts.length === 1) return [pts[0], pts[0]];
  /* A horizontal triangle edge can yield three numerical candidates.  The extreme pair is the real section. */
  var axis = T.axis || { x: 1, z: 0 }, al = Math.hypot(axis.x, axis.z) || 1, ux = axis.x / al, uz = axis.z / al;
  pts.sort(function (p, q) { return (p.x * ux + p.z * uz) - (q.x * ux + q.z * uz); });
  return [pts[0], pts[pts.length - 1]];
}

export function ridgeReachBounds(reg) {
  /* FIELD authority clamps x/z to 300 m.  Derive that square from registered reachable content (walls + reachable islets), rounded outward
     to the existing 25 m world grid, rather than coupling this pure module to dev_tuning. */
  var W = reg && reg.field && reg.field.walls || { x1: -175, x2: 175, z1: -56.5, z2: 292 };
  var reach = Math.max(Math.abs(W.x1), Math.abs(W.x2), Math.abs(W.z1), Math.abs(W.z2));
  (((reg && reg.coast && reg.coast.islands) || []).filter(function (I) { return I.reachable; })).forEach(function (I) { reach = Math.max(reach, Math.abs(I.x) + (I.rx || 0), Math.abs(I.z) + (I.rz || 0)); });
  var half = Math.max(25, Math.ceil(reach / 25) * 25);
  return { x1: -half, z1: -half, x2: half, z2: half, half: half };
}

function segmentInPass(R, bearing, segmentHalfAngle, radialPadM) {
  var radial = Math.max(1, R.dist_m - R.base_w_m), bodyAngle = radialPadM / radial;
  for (var i = 0; i < (R.passes || []).length; i++) if (Math.abs(angleDelta(bearing, R.passes[i].bearing_rad)) <= R.passes[i].half_width_rad + segmentHalfAngle + bodyAngle) return R.passes[i];
  return null;
}

function traversableSegments(reg) {
  var out = [], widths = reg && reg.paths || {};
  ((widths && widths.list) || []).forEach(function (P) { var w = P.width_m || (P.tier === 'CAUSEWAY' ? widths.causeway_w : P.tier === 'REGIONAL' ? widths.regional_w : widths.trail_w) || 3; for (var i = 0; i < (P.pts || []).length - 1; i++) out.push({ a: P.pts[i], b: P.pts[i + 1], half: w * 0.5, route: P.id }); });
  /* Old/small registries may only carry field.routes.  Avoid duplicates when the richer path registry is present. */
  if (!out.length) ((reg && reg.field && reg.field.routes) || []).forEach(function (P) { out.push({ a: P.from, b: P.to, half: ((widths && widths.causeway_w) || 8) * 0.5, route: P.id }); });
  return out;
}

function sectionPoint(S, t) { return { x: S[0].x + (S[1].x - S[0].x) * t, z: S[0].z + (S[1].z - S[0].z) * t }; }
function pointDistance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function patchNearRoute(C, P, pad) {
  /* C is ordered around the swept four-corner patch.  Testing every boundary edge catches crossings as well as parallel approaches; the
     patch is at most maxFaceSweep deep, so a road corridor cannot sit wholly inside it without also approaching an edge. */
  for (var i = 0; i < C.length; i++) {
    var a = C[i], b = C[(i + 1) % C.length];
    if (segmentDistance(a.x, a.z, b.x, b.z, P.a[0], P.a[1], P.b[0], P.b[1]) <= pad) return true;
  }
  return false;
}

function triangleBands(T, maxBandHeight, maxFaceSweep) {
  var ys = [0], maxY = -Infinity;
  (T.points || []).forEach(function (p) { maxY = Math.max(maxY, p.y); if (p.y > 0 && ys.every(function (y) { return Math.abs(y - p.y) > 1e-7; })) ys.push(p.y); });
  if (!(maxY > 0)) return [];
  if (ys.every(function (y) { return Math.abs(y - maxY) > 1e-7; })) ys.push(maxY);
  ys.sort(function (a, b) { return a - b; });
  var out = [];
  for (var i = 0; i < ys.length - 1; i++) {
    var a = ys[i], b = ys[i + 1]; if (b - a < 1e-7) continue;
    var A = ridgeTriangleSection(T, a), B = ridgeTriangleSection(T, b); if (!A || !B) continue;
    var travel = Math.max(pointDistance(A[0], B[0]), pointDistance(A[1], B[1]));
    var n = Math.max(1, Math.ceil((b - a) / maxBandHeight), Math.ceil(travel / maxFaceSweep));
    for (var j = 0; j < n; j++) out.push({ y0: a + (b - a) * j / n, y1: a + (b - a) * (j + 1) / n });
  }
  return out;
}

export function ridgeColliders(reg, opts) {
  opts = opts || {};
  var cfg = reg && reg.macro && reg.macro.ridge_collision || {};
  var bounds = opts.bounds || ridgeReachBounds(reg), queryPad = opts.query_pad_m === undefined ? (cfg.query_pad_m === undefined ? 8 : cfg.query_pad_m) : opts.query_pad_m;
  var thickness = opts.face_thickness_m === undefined ? (cfg.face_thickness_m === undefined ? 0.45 : cfg.face_thickness_m) : opts.face_thickness_m;
  var maxSpan = opts.max_span_m === undefined ? (cfg.max_span_m === undefined ? 8 : cfg.max_span_m) : opts.max_span_m;
  var maxFaceSweep = opts.max_face_sweep_m === undefined ? (cfg.max_face_sweep_m === undefined ? 2.5 : cfg.max_face_sweep_m) : opts.max_face_sweep_m;
  var maxBandHeight = opts.max_band_height_m === undefined ? (cfg.max_band_height_m === undefined ? 6 : cfg.max_band_height_m) : opts.max_band_height_m;
  var contactPad = opts.vertical_contact_pad_m === undefined ? (cfg.vertical_contact_pad_m === undefined ? 0.25 : cfg.vertical_contact_pad_m) : opts.vertical_contact_pad_m;
  var passPad = opts.pass_body_pad_m === undefined ? (cfg.pass_body_pad_m === undefined ? 1.2 : cfg.pass_body_pad_m) : opts.pass_body_pad_m;
  var sectorSegments = opts.sector_segments || cfg.sector_segments || 8, routes = traversableSegments(reg), out = [];
  ((reg && reg.macro && reg.macro.mountains) || []).forEach(function (R, ri) {
    var stations = ridgeStations(R, ri), N = R.segments || 160, step = TAU / N;
    for (var k = 0; k < N; k++) {
      var F = ridgeFaceSegment(stations, k); if (!F || (F.a.h < 2 && F.b.h < 2)) continue;
      var bearing = F.a.b + step * 0.5; if (segmentInPass(R, bearing, step * 0.5, passPad)) continue;
      ridgeInnerTriangles(F).forEach(function (T) {
        triangleBands(T, maxBandHeight, maxFaceSweep).forEach(function (band, bi) {
          var lower = ridgeTriangleSection(T, band.y0), upper = ridgeTriangleSection(T, band.y1); if (!lower || !upper) return;
          var pieces = Math.max(1, Math.ceil(Math.max(pointDistance(lower[0], lower[1]), pointDistance(upper[0], upper[1])) / maxSpan));
          for (var pi = 0; pi < pieces; pi++) {
            var t0 = pi / pieces, t1 = (pi + 1) / pieces;
            var C = [sectionPoint(lower, t0), sectionPoint(lower, t1), sectionPoint(upper, t1), sectionPoint(upper, t0)];
            var x1 = Math.min.apply(null, C.map(function (p) { return p.x; })) - thickness, x2 = Math.max.apply(null, C.map(function (p) { return p.x; })) + thickness;
            var z1 = Math.min.apply(null, C.map(function (p) { return p.z; })) - thickness, z2 = Math.max.apply(null, C.map(function (p) { return p.z; })) + thickness;
            if (!boxTouchesBounds(x1, z1, x2, z2, bounds, queryPad)) continue;
            if (routes.some(function (P) { return patchNearRoute(C, P, P.half + passPad + thickness); })) continue;
            var sweep = Math.max(pointDistance(C[0], C[3]), pointDistance(C[1], C[2]));
            out.push({
              id: R.id + '_FACE_S' + String(k).padStart(3, '0') + '_T' + T.index + '_B' + String(bi).padStart(3, '0') + '_P' + String(pi).padStart(2, '0'), type: 'BOX',
              x1: round(x1), z1: round(z1), x2: round(x2), z2: round(z2), y0: round(band.y0), h: round(band.y1 + contactPad),
              ridge: true, mountain: true, ridge_id: R.id, ridge_segment: k, ridge_triangle: T.index, ridge_band: bi, ridge_piece: pi, ridge_pieces: pieces,
              face_y0_m: round(band.y0, 9), face_y1_m: round(band.y1, 9), face_sweep_m: round(sweep, 6), surface_y_m: round((band.y0 + band.y1) * 0.5),
              collision_proxy: 'VISIBLE_RIDGE_INNER_FACE', world: 'JOBB', zone: R.id + '_FACE_' + String(Math.floor(k / sectorSegments)).padStart(2, '0')
            });
          }
        });
      });
    }
  });
  return out;
}
