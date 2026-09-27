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

   Tiers: subdivision level 4 (HIGH) / 3 (MED) / 1 (LOW: the warp still moves the authored vertices — crest line and summits — for free).
   M19: macro.js tags every ribbon triangle with its row edge, and the subdivision runs in STRIP mode (ridgeRowPlan: ≈ 6.5 m rows × 4 columns
   per station span on HIGH, ≈ 16 m × 3 on MED — about M18's MED budget — and the authored vertices only on LOW), so a shelf has the vertical
   resolution to read as a ledge; the untagged call keeps the barycentric split (the host-safety test's path). */
var TAU = Math.PI * 2;
export var REACH_IN = 312, REACH_OUT = 336, REACH_FLOOR = 304;
/* M19 (owner 2026-09-27: "more geological continuity — ledges, strata, broken rock shelves"): ONE regional bedding for the whole range. The
   beds dip gently (dx, dz m per m) and fold (± fold m) — the same analytic surface in the rock shader (applyGeology dip) and here, where the
   geometric shelves step on it — so a ledge in the rock and a bedding line in the shader are the same bed, continuous face to face. */
export var RIDGE_DIP = [0.045, -0.02, 10, 17, 9, 0.2];   /* dip x, dip z, fold m, fault blocks per ring (a whole number: the blocks wrap at the ±π bearing, no seam), fault throw m, fault ramp (fraction of a block) */
/* M19 review fix: the fault used to step its throw within ~5 m of arc, which a 3.5–6 m column mesh cannot resolve — the shelves sheared into
   thin pale blades at every fault — and 400 / 150 blocks did not close round the ring (a hard ~16 m bed step due south). The blocks are now a
   whole number per ring and the throw ramps over a fifth of a block (≈ 27 m of arc on the near ridge): a broken, offset shelf the mesh can carry. */
function faultT(i) { var n = RIDGE_DIP[3]; return Math.sin((((i % n) + n) % n) * 2.399 + 0.7); }
export function bedY(x, y, z) { var D = RIDGE_DIP, fu = (Math.atan2(x, z) / TAU + 0.5) * D[3], fi = Math.floor(fu), ft = sstep(0, D[5], fu - fi);
  return y + x * D[0] + z * D[1] + D[2] * Math.sin(x * 0.0093 + z * 0.0061) * Math.cos(z * 0.0071 - x * 0.0023) + (faultT(fi - 1) * (1 - ft) + faultT(fi) * ft) * D[4]; }   /* the beds step at each fault: a broken shelf, not a contour line */
/* the geometric shelf step: a whole number of the shader's MAJOR beds (strata 2.6 × 3.2 = 8.32 m), so shelf lips land on bed boundaries */
export function ridgeShelfStep(R) { return 2.6 * 3.2 * ((R && R.dist_m || 400) < 450 ? 3 : 4); }
/* M19 row budget per tier: the ribbon's bands are cut into horizontal strips (rows ≈ rowM tall) × cols per station span, instead of the
   uniform barycentric split that left 3.5 m × 17 m slivers (no vertical resolution for a ledge). LOW keeps the authored vertices only. */
export function ridgeRowPlan(R, tier) { var hi = tier === 'HIGH', lo = tier === 'LOW', rowM = lo ? 1e9 : (hi ? 6.5 : 16) * ((R && R.dist_m || 400) < 450 ? 1 : 1.6), H = (R && R.h_max || 100) + 4;
  function n(fr) { return lo ? 1 : Math.max(1, Math.round(fr * H / rowM)); }
  return { cols: lo ? 1 : (hi ? 4 : 3), inner: [n(0.46), n(0.30), n(0.24)], outer: [n(0.42), n(0.30), n(0.28)] }; }

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
  var perCrest = Math.max(8, Math.round(TAU * arc / 170)), perShelf = Math.max(8, Math.round(TAU * arc / 120)), perSpur = Math.max(8, Math.round(TAU * arc / (arc < 450 ? 105 : 130))), perNotch = Math.max(16, Math.round(TAU * arc / 55));
  var SSP = ridgeShelfStep(R), passes = R.passes || [];
  function at(b) { var f = (((b % TAU) + TAU) % TAU) / TAU * N, i = Math.min(N - 1, Math.floor(f)), t = f - i; return { r: rad[i] + (rad[i + 1] - rad[i]) * t, rs: rs[i] + (rs[i + 1] - rs[i]) * t, h: stations[i].h + (stations[i + 1].h - stations[i].h) * t, w: stations[i].w + (stations[i + 1].w - stations[i].w) * t }; }
  var kb = (keepOut || []).reduce(function (b, K) { var m = K.r * 2.2; return [Math.min(b[0], K.x - m), Math.max(b[1], K.x + m), Math.min(b[2], K.z - m), Math.max(b[3], K.z + m)]; }, [1e9, -1e9, 1e9, -1e9]);   /* the keep circles' reach box: most vertices skip the loop */
  function weight(x, z) {
    var w = sstep(REACH_IN, REACH_OUT, maxNorm(x, z)); if (w <= 0) return 0;
    var b = Math.atan2(x, z); for (var p = 0; p < passes.length; p++) { var d = Math.abs(angleDelta(b, passes[p].bearing_rad)); w *= sstep(passes[p].half_width_rad * 1.1, passes[p].half_width_rad * 1.6 + 0.02, d); }
    if (x >= kb[0] && x <= kb[1] && z >= kb[2] && z <= kb[3]) for (var k = 0; k < keepOut.length; k++) { var K = keepOut[k]; w *= sstep(K.r, K.r * 2.2, Math.hypot(x - K.x, z - K.z)); if (w <= 0) return 0; }
    return w; }
  function warp(x, y, z) {
    var w = weight(x, z); if (w <= 0) return [x, y, z, 1];
    var b = Math.atan2(x, z), r = Math.hypot(x, z) || 1, S = at(b), hb = Math.max(2, S.h), amp = sstep(8, 60, hb) * w; if (amp <= 0) return [x, y, z, 1];
    var yN = Math.max(0, Math.min(1, (y + 4) / (hb + 4)));
    var side = Math.max(-1, Math.min(1, (S.r - r) / 8));   /* +1 inner face, −1 outer face, 0 on the crest — continuous */
    var cot = (side >= 0 ? S.w : S.w * 1.3) / (hb + 4);
    /* 1 · crest line: the fins pulled to the eased line, strongest at the top */
    var dr = (S.rs - S.r) * sstep(0.2, 1.0, yN) * 0.9;
    /* 2 · M19 SHELVES ON THE BEDDING: the face steps — a steep cliff band, then a setback ledge — on the regional beds (bedY: the shader's
       dip / fold), so every shelf is one continuous bed round the ring instead of a random phase per bearing. The lip wanders a little
       along the ring (broken shelf edges) and the strength drifts, so some walls are banded and others stay sheer. */
    var yb = bedY(x, y, z), f = fract(yb / SSP + 0.1 * (fbm(b, yb / 90, perShelf * 2, seed + 2, 2) - 0.5));
    var g = f * 0.3 + 0.7 * sstep(0.58, 0.95, f), shelfK = (0.25 + 0.75 * sstep(0.3, 0.66, fbm(b, yb / 80, perShelf, seed + 3, 2))) * sstep(0.06, 0.2, yN) * (1 - sstep(0.82, 0.96, yN));
    dr += side * cot * SSP * (g - f) * shelfK * 1.2;
    /* 3 · M19 SPURS AND COULOIRS (was 34 m V-gullies that folded the faces into crumpled foil): a rhythm of ~110 m along the ring that
       meanders with height — couloirs cut into the face (deepest high on the face, notching the crest where they head out, dying into the
       scree at the foot), rounded spurs bulge between them and broaden toward the base, the buttresses that carry the summits. */
    var Q = b / TAU * perSpur + (fbm(b, yN * 0.9, perSpur, seed + 4, 2) - 0.5) * 0.7, dq = Math.abs(fract(Q) - 0.5) * 2, cw = 0.3 + 0.12 * fbm(b, 0.2, perSpur, seed + 5, 1);
    var gch = 1 - sstep(0, cw, dq), spur = sstep(0.42, 1.0, dq), cDeep = hb * (0.05 + 0.06 * fbm(b, 0.1, perSpur, seed + 10, 1));
    dr += side * (cDeep * gch * sstep(0.12, 0.5, yN) * (1 - 0.45 * sstep(0.88, 1.0, yN)) - hb * 0.045 * spur * sstep(0.05, 0.3, yN) * (1 - sstep(0.55, 0.9, yN)));
    var dy = -cDeep * 0.6 * gch * sstep(0.8, 1.0, yN);
    /* 4 · secondary summits and saddles on a long, asymmetric crest profile */
    var peaks = ridged(b, 0.37, perCrest, seed + 6, 3), longw = fbm(b, 0.13, Math.max(4, perCrest >> 2), seed + 7, 2);
    dy += hb * (0.22 * (peaks - 0.42) + 0.12 * (longw - 0.5)) * sstep(0.62, 1.0, yN);
    /* 4b · M19 review fix (F4: the dominant summit behind the Veil highland had turned into a flat-topped block): a BROKEN CREST — frost-
       shattered notches and small towers every ~25–55 m along the top only (crest band, yN > 0.84), so summits split and saddles bite
       without folding the faces again (the old 34 m V-gullies did, the crumpled-foil read). The third summit octave is back as well. */
    var nt = ridged(b, 0.9, perNotch, seed + 12, 2), nn = sstep(0.5, 0.85, vnoise(b / TAU * perNotch * 2, 1.7, perNotch * 2, seed + 13));
    dy += hb * (0.05 * (nt - 0.4) - 0.07 * nn) * sstep(0.84, 1.0, yN);
    /* 5 · broken rock: low-amplitude, larger-scale irregularity so no face is a plane (M19: half the old amplitude — it read as crumpling) */
    dr += side * hb * 0.01 * (fbm(b, yb / 40, perShelf * 2, seed + 8, 2) - 0.5); dy += hb * 0.012 * (fbm(b, yb / 45, perShelf * 2, seed + 9, 2) - 0.5) * sstep(0.1, 0.5, yN);
    var ux = x / r, uz = z / r, DX = ux * dr * amp, DY = dy * amp, DZ = uz * dr * amp;
    var nx = x + DX, ny = y + DY, nz = z + DZ;
    if (maxNorm(nx, nz) < REACH_FLOOR) { var lo = 0, hi = 1; for (var it = 0; it < 14; it++) { var m = (lo + hi) / 2; if (maxNorm(x + DX * m, z + DZ * m) >= REACH_FLOOR) lo = m; else hi = m; } nx = x + DX * lo; ny = y + DY * lo; nz = z + DZ * lo; }
    var shade = 1 - amp * (0.2 * gch * sstep(0.15, 0.5, yN) + 0.08 * shelfK * (1 - sstep(0.45, 0.6, f))) + amp * (0.06 * shelfK * sstep(0.65, 0.8, f) * (1 - sstep(0.95, 1, f)) + 0.05 * spur * (1 - yN) + 0.05 * sstep(0.75, 1, yN) * peaks);   /* couloir floors and each steep cliff band a step darker; ledge tops, spur noses and summits a touch lighter */
    return [nx, ny, nz, shade]; }
  return { warp: warp, weight: weight, crestAt: at };
}

/* Subdivide + warp a non-indexed triangle list (pos: xyz × 3 per triangle, col: rgb × 3). Triangles wholly inside REACH_IN stay as they are.
   Returns { pos, col, nrm, tris, sculpted } as plain arrays. Vertex tone follows the warp's shade (gully floors and cliff bands darker). */
export function sculptRidge(pos, col, field, level, tags, cols) {
  var L = Math.max(1, level | 0), P = [], C = [], Nn = [], sculpted = 0;
  /* M19 STRIP MODE (tags[t] = [row edge index, strips n], cols = splits of every row edge): each triangle is cut into n strips parallel to
     its row edge (the station-to-station edge), each strip zipped from the cols of its lower line to the fewer of its upper line. n is set
     per BAND and cols per ridge, so both triangles on a shared edge split it at the same points; edge points are taken from the edge's
     canonical end (bit-identical on both sides) — the ribbon stays watertight, and every point is still barycentric on its authored plane. */
  var strip = !!(tags && tags.length * 9 === pos.length && cols > 0);
  function canon(U, V) { return U[0] < V[0] || (U[0] === V[0] && (U[1] < V[1] || (U[1] === V[1] && U[2] <= V[2]))); }
  function ept(U, V, t) { if (t <= 0) return U; if (t >= 1) return V; if (!canon(U, V)) { var T = U; U = V; V = T; t = 1 - t; } return [U[0] + (V[0] - U[0]) * t, U[1] + (V[1] - U[1]) * t, U[2] + (V[2] - U[2]) * t]; }
  function emit(a, b, c, ca, cb, cc) { P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); C.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1;
    for (var k = 0; k < 3; k++) Nn.push(nx / nl, ny / nl, nz / nl); }
  for (var t = 0; t < pos.length; t += 9) {
    var A = [pos[t], pos[t + 1], pos[t + 2]], B = [pos[t + 3], pos[t + 4], pos[t + 5]], Cc = [pos[t + 6], pos[t + 7], pos[t + 8]];
    var cA = [col[t], col[t + 1], col[t + 2]], cB = [col[t + 3], col[t + 4], col[t + 5]], cC = [col[t + 6], col[t + 7], col[t + 8]];
    var inside = maxNorm(A[0], A[2]) < REACH_IN && maxNorm(B[0], B[2]) < REACH_IN && maxNorm(Cc[0], Cc[2]) < REACH_IN;
    if (inside) { emit(A, B, Cc, cA, cB, cC); continue; }
    sculpted++;
    if (strip) { var e = tags[t / 9][0] | 0, ns = Math.max(1, tags[t / 9][1] | 0), V3 = [A, B, Cc], K3 = [cA, cB, cC], P0 = V3[e], P1 = V3[(e + 1) % 3], Q0 = V3[(e + 2) % 3], c0 = K3[e], c1 = K3[(e + 1) % 3], cq = K3[(e + 2) % 3], prev = null;
      for (var k = 0; k <= ns; k++) { var tk = k / ns, cnt = k === ns ? 0 : Math.max(1, Math.round(cols * (1 - tk))), Pa = ept(P0, Q0, tk), Pb = ept(P1, Q0, tk), line = [];
        for (var jj = 0; jj <= cnt; jj++) { var sj = cnt ? jj / cnt : 0, p0s = k === 0 ? ept(P0, P1, sj) : (jj === 0 ? Pa : (jj === cnt ? Pb : [Pa[0] + (Pb[0] - Pa[0]) * sj, Pa[1] + (Pb[1] - Pa[1]) * sj, Pa[2] + (Pb[2] - Pa[2]) * sj]));
          var w0 = (1 - sj) * (1 - tk), w1 = sj * (1 - tk), p1s = field.warp(p0s[0], p0s[1], p0s[2]), shs = p1s[3];
          line.push({ p: p1s, c: [(c0[0] * w0 + c1[0] * w1 + cq[0] * tk) * shs, (c0[1] * w0 + c1[1] * w1 + cq[1] * tk) * shs, (c0[2] * w0 + c1[2] * w1 + cq[2] * tk) * shs] }); }
        if (prev) { var ia = 0, ib = 0, na = prev.length - 1, nb = line.length - 1;
          while (ia < na || ib < nb) { if (ib >= nb || (ia < na && (ia + 1) / na <= (ib + 1) / Math.max(1, nb))) { emit(prev[ia].p, prev[ia + 1].p, line[ib].p, prev[ia].c, prev[ia + 1].c, line[ib].c); ia++; } else { emit(prev[ia].p, line[ib + 1].p, line[ib].p, prev[ia].c, line[ib + 1].c, line[ib].c); ib++; } } }
        prev = line; }
      continue; }
    var lv = L, grid = {}, cg = {};
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
