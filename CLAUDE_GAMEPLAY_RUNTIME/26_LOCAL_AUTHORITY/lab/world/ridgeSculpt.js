/* MAHWORLD :: RIDGE SCULPT (M10) — pure, no Three.js / DOM / host imports (Node-testable).
   The macro ridge ribbon (macro.js) is a fan of long flat triangles from a base ring to a crest ring; seeded radial jitter between
   stations folds it into sawtooth FINS, so every silhouette read as giant triangles. This pass re-cuts the ribbon as mountain rock —
   natural ridge profiles (fins eased into a continuous crest line, secondary summits and saddles), rock SHELVES (setback ledges that step
   the faces), fall-line erosion GULLIES that notch the crest — but ONLY where the rock lies beyond the host's reach.

   Collision authority is untouched. The FIELD authority clamps x / z to the reach square (ridgeReachBounds, ±300 m); the only collider on
   a ridge is its visible INNER face where that face enters the square (ridgeColliders, 8 m query pad). Every ribbon triangle is subdivided
   (coplanar — the surface does not move), then each vertex is warped by a continuous field weighted by w = smoothstep(REACH_IN, REACH_OUT,
   max(|x|, |z|)) of its ORIGINAL position: zero inside 312 m, so everything inside the reach square (and 12 m beyond it) stays exactly on the
   authored plane; a guard pulls any warped vertex back so none lands inside 304 m. The warp is a function of position only, so shared
   edges get identical vertices (watertight); triangles wholly inside 312 m are left unsubdivided (their edges are unwarped, collinear).

   Tiers: subdivision level 4 (HIGH) / 3 (MED) / 1 (LOW: the warp still moves the authored vertices — crest line and summits — for free). */
var TAU = Math.PI * 2;
export var REACH_IN = 312, REACH_OUT = 336, REACH_FLOOR = 304;

function sstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function fract(x) { return x - Math.floor(x); }
function hash2(i, j, seed) { var h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
/* value noise on (u, v) that wraps exactly in u with an integer period (u runs round the ring, so no seam at the ±π bearing) */
function vnoise(u, v, per, seed) { var i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j; fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv); var i0 = ((i % per) + per) % per, i1 = (i0 + 1) % per; var a = hash2(i0, j, seed), b = hash2(i1, j, seed), c = hash2(i0, j + 1, seed), d = hash2(i1, j + 1, seed); var x0 = a + (b - a) * fu, x1 = c + (d - c) * fu; return x0 + (x1 - x0) * fv; }
function fbm(b, v, per, seed, oct) { var s = 0, amp = 0.5, tot = 0, p = per, vv = v; for (var o = 0; o < oct; o++) { s += amp * vnoise(b / TAU * p, vv, p, seed + o * 31); tot += amp; amp *= 0.5; p *= 2; vv *= 2; } return s / tot; }
function ridged(b, v, per, seed, oct) { var s = 0, amp = 0.5, tot = 0, p = per, vv = v; for (var o = 0; o < oct; o++) { var n = 1 - Math.abs(vnoise(b / TAU * p, vv, p, seed + o * 17) * 2 - 1); s += amp * n * n; tot += amp; amp *= 0.5; p *= 2; vv *= 2; } return s / tot; }
function maxNorm(x, z) { return Math.max(Math.abs(x), Math.abs(z)); }
function angleDelta(a, b) { var d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

/* The warp field for one ridge. stations: ridgeStations(R, idx) (N + 1 with the exact closure). keepOut: [{x, z, r}] scenic anchors that
   must not move (a waterfall lip). Returns warp(x, y, z) → [x', y', z'] and the reach weight. */
export function ridgeWarpField(R, stations, idx, keepOut) {
  var N = stations.length - 1, seed = 0x51D6 + (idx || 0) * 101, arc = R.dist_m || 400, hMax = R.h_max || 100;
  var rad = stations.map(function (s) { return Math.hypot(s.x, s.z); });
  /* the crest line eased: a circular moving average over ±3 stations removes the jitter fins, noise below puts natural variation back */
  var rs = []; for (var i = 0; i < N; i++) { var acc = 0, wt = 0; for (var k = -3; k <= 3; k++) { var q = 1 - Math.abs(k) / 4; acc += rad[((i + k) % N + N) % N] * q; wt += q; } rs.push(acc / wt); } rs.push(rs[0]);
  var perCrest = Math.max(8, Math.round(TAU * arc / 170)), perShelf = Math.max(8, Math.round(TAU * arc / 120)), perGully = Math.round(TAU * arc / (arc < 450 ? 34 : 52));
  var gullyW = 0.2, passes = R.passes || [];
  function at(b) { var f = (((b % TAU) + TAU) % TAU) / TAU * N, i = Math.min(N - 1, Math.floor(f)), t = f - i; return { r: rad[i] + (rad[i + 1] - rad[i]) * t, rs: rs[i] + (rs[i + 1] - rs[i]) * t, h: stations[i].h + (stations[i + 1].h - stations[i].h) * t, w: stations[i].w + (stations[i + 1].w - stations[i].w) * t }; }
  function weight(x, z) {
    var w = sstep(REACH_IN, REACH_OUT, maxNorm(x, z)); if (w <= 0) return 0;
    var b = Math.atan2(x, z); for (var p = 0; p < passes.length; p++) { var d = Math.abs(angleDelta(b, passes[p].bearing_rad)); w *= sstep(passes[p].half_width_rad * 1.1, passes[p].half_width_rad * 1.6 + 0.02, d); }
    for (var k = 0; k < (keepOut || []).length; k++) { var K = keepOut[k]; w *= sstep(K.r, K.r * 2.2, Math.hypot(x - K.x, z - K.z)); }
    return w; }
  function warp(x, y, z) {
    var w = weight(x, z); if (w <= 0) return [x, y, z, 1];
    var b = Math.atan2(x, z), r = Math.hypot(x, z) || 1, S = at(b), hb = Math.max(2, S.h), amp = sstep(8, 60, hb) * w; if (amp <= 0) return [x, y, z, 1];
    var yN = Math.max(0, Math.min(1, (y + 4) / (hb + 4)));
    var side = Math.max(-1, Math.min(1, (S.r - r) / 8));   /* +1 inner face, −1 outer face, 0 on the crest — continuous */
    var cot = (side >= 0 ? S.w : S.w * 1.3) / (hb + 4);
    /* 1 · crest line: the fins pulled to the eased line, strongest at the top */
    var dr = (S.rs - S.r) * sstep(0.2, 1.0, yN) * 0.9;
    /* 2 · shelves: the face steps — a steep cliff band, then a setback ledge — spacing and strength drift along the ring */
    var Ssp = hb * (0.2 + 0.1 * fbm(b, 0.3, perShelf, seed + 1, 2)), f = fract((y + 4) / Ssp + fbm(b, 0.7, perShelf, seed + 2, 2) * 1.7);
    var g = f * 0.3 + 0.7 * sstep(0.6, 0.96, f), shelfK = (0.35 + 0.65 * sstep(0.35, 0.7, fbm(b, (y + 4) / 70, perShelf, seed + 3, 2))) * sstep(0.08, 0.22, yN) * (1 - sstep(0.8, 0.95, yN));
    dr += side * cot * Ssp * (g - f) * shelfK * 1.15;
    /* 3 · fall-line gullies: meandering V channels, deepest mid-face, that notch the crest where they head out */
    var q = b / TAU * perGully + (fbm(b, (y + 4) / 45, perShelf, seed + 4, 2) - 0.5) * 0.9, dq = Math.abs(fract(q) - 0.5), gch = Math.max(0, 1 - dq / gullyW); gch *= gch;
    var gd = hb * (0.05 + 0.07 * fbm(b, 0.1, perGully >> 2, seed + 5, 1)) * gch;
    dr += side * gd * sstep(0.1, 0.35, yN) * (1 - 0.6 * sstep(0.85, 1.0, yN));
    var dy = -gd * 0.75 * sstep(0.8, 1.0, yN);
    /* 4 · secondary summits and saddles on a long, asymmetric crest profile */
    var peaks = ridged(b, 0.37, perCrest, seed + 6, 3), longw = fbm(b, 0.13, Math.max(4, perCrest >> 2), seed + 7, 2);
    dy += hb * (0.22 * (peaks - 0.42) + 0.12 * (longw - 0.5)) * sstep(0.62, 1.0, yN);
    /* 5 · broken rock: low-amplitude irregularity so no face is a plane */
    dr += side * hb * 0.018 * (fbm(b, (y + 4) / 28, perShelf * 2, seed + 8, 2) - 0.5); dy += hb * 0.02 * (fbm(b, (y + 4) / 33, perShelf * 2, seed + 9, 2) - 0.5) * sstep(0.1, 0.5, yN);
    var ux = x / r, uz = z / r, DX = ux * dr * amp, DY = dy * amp, DZ = uz * dr * amp;
    var nx = x + DX, ny = y + DY, nz = z + DZ;
    if (maxNorm(nx, nz) < REACH_FLOOR) { var lo = 0, hi = 1; for (var it = 0; it < 14; it++) { var m = (lo + hi) / 2; if (maxNorm(x + DX * m, z + DZ * m) >= REACH_FLOOR) lo = m; else hi = m; } nx = x + DX * lo; ny = y + DY * lo; nz = z + DZ * lo; }
    var shade = 1 - amp * (0.24 * gch * sstep(0.1, 0.4, yN) + 0.09 * shelfK * (1 - sstep(0.45, 0.6, f))) + amp * (0.05 * shelfK * sstep(0.65, 0.8, f) * (1 - sstep(0.95, 1, f)) + 0.05 * sstep(0.75, 1, yN) * peaks);   /* gully floors and each steep cliff band a step darker, the ledge tops and summits a touch lighter */
    return [nx, ny, nz, shade]; }
  return { warp: warp, weight: weight, crestAt: at };
}

/* Subdivide + warp a non-indexed triangle list (pos: xyz × 3 per triangle, col: rgb × 3). Triangles wholly inside REACH_IN stay as they are.
   Returns { pos, col, nrm, tris, sculpted } as plain arrays. Vertex tone follows the warp's shade (gully floors and cliff bands darker). */
export function sculptRidge(pos, col, field, level) {
  var L = Math.max(1, level | 0), P = [], C = [], Nn = [], sculpted = 0;
  function emit(a, b, c, ca, cb, cc) { P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); C.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1;
    for (var k = 0; k < 3; k++) Nn.push(nx / nl, ny / nl, nz / nl); }
  for (var t = 0; t < pos.length; t += 9) {
    var A = [pos[t], pos[t + 1], pos[t + 2]], B = [pos[t + 3], pos[t + 4], pos[t + 5]], Cc = [pos[t + 6], pos[t + 7], pos[t + 8]];
    var cA = [col[t], col[t + 1], col[t + 2]], cB = [col[t + 3], col[t + 4], col[t + 5]], cC = [col[t + 6], col[t + 7], col[t + 8]];
    var inside = maxNorm(A[0], A[2]) < REACH_IN && maxNorm(B[0], B[2]) < REACH_IN && maxNorm(Cc[0], Cc[2]) < REACH_IN;
    if (inside) { emit(A, B, Cc, cA, cB, cC); continue; }
    sculpted++; var lv = L, grid = {}, cg = {};
    for (var i = 0; i <= lv; i++) for (var j = 0; j <= lv - i; j++) { var u = i / lv, v = j / lv, wA = 1 - u - v;
      var p0 = [A[0] * wA + B[0] * u + Cc[0] * v, A[1] * wA + B[1] * u + Cc[1] * v, A[2] * wA + B[2] * u + Cc[2] * v];
      var p1 = field.warp(p0[0], p0[1], p0[2]); grid[i + ',' + j] = p1;
      var sh = p1[3]; cg[i + ',' + j] = [(cA[0] * wA + cB[0] * u + cC[0] * v) * sh, (cA[1] * wA + cB[1] * u + cC[1] * v) * sh, (cA[2] * wA + cB[2] * u + cC[2] * v) * sh]; }
    for (var i2 = 0; i2 < lv; i2++) for (var j2 = 0; j2 < lv - i2; j2++) {
      var k00 = i2 + ',' + j2, k10 = (i2 + 1) + ',' + j2, k01 = i2 + ',' + (j2 + 1);
      emit(grid[k00], grid[k10], grid[k01], cg[k00], cg[k10], cg[k01]);
      if (i2 + j2 + 1 < lv) { var k11 = (i2 + 1) + ',' + (j2 + 1); emit(grid[k10], grid[k11], grid[k01], cg[k10], cg[k11], cg[k01]); } } }
  return { pos: P, col: C, nrm: Nn, tris: P.length / 9, sculpted: sculpted };
}
