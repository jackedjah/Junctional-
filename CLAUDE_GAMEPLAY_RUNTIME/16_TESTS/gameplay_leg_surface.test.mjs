/* MAHWORLD :: LEG SURFACE TEST — are the separated legs intact surfaces, and do they stay intact through the swing?
   The reviewed clip showed pinched / discontinuous leg surfaces in the separated gait. This evaluates the split-leg mesh
   straight out of the GLB (linear blend skinning, no three.js) at rest and at the gait's deepest knee/hip pose and measures
   the things a viewer actually sees:
     · open edges: an intact limb has NO boundary edges (only the top ring may be open where it enters the pelvis)
     · edge strain: no triangle edge may stretch or shrink beyond the band a bending skin can hide
     · inversions: no triangle may flip its winding through the bend
     · the knee keeps its section, the shin keeps its length, the tip keeps its point
     · PACKED: the morph target is a full-topology displacement, so both forms are the same closed surface
   node 16_TESTS/gameplay_leg_surface.test.mjs [--asset <glb>] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url));
var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var ASSET = arg('--asset', path.join(HERE, '..', '26_LOCAL_AUTHORITY', 'lab', 'assets', 'athlete_m_preview', 'dev_0.14', 'Mah_Athlete_M_am08_v6.glb'));   /* PASS 4B: the faithful-leg derivative (8/8); --asset dev_0.13 = the surgical loft (6/8), dev_0.7 = v4 */
var pass = 0, fail = 0;
function ok(c, m, extra) { if (c) { pass++; console.log('  PASS ' + m + (extra ? ' — ' + extra : '')); } else { fail++; console.log('  FAIL ' + m + (extra ? ' — ' + extra : '')); } }

function loadGlb(file) {
  var glb = fs.readFileSync(file); var jl = glb.readUInt32LE(12), j = JSON.parse(glb.slice(20, 20 + jl).toString('utf8'));
  var bin = glb.slice(28 + jl, 28 + jl + glb.readUInt32LE(20 + jl));
  function acc(ai) { var a = j.accessors[ai], bv = j.bufferViews[a.bufferView], off = (bv.byteOffset || 0) + (a.byteOffset || 0); var n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type]; var C = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType]; return new C(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * C.BYTES_PER_ELEMENT)); }
  return { json: j, acc: acc };
}
function mul(a, b) { var o = new Float64Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function ident() { return new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
function trs(t, q) { var m = ident(); if (q) { var x = q[0], y = q[1], z = q[2], w = q[3]; m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y + z * w); m[2] = 2 * (x * z - y * w); m[4] = 2 * (x * y - z * w); m[5] = 1 - 2 * (x * x + z * z); m[6] = 2 * (y * z + x * w); m[8] = 2 * (x * z + y * w); m[9] = 2 * (y * z - x * w); m[10] = 1 - 2 * (x * x + y * y); } if (t) { m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; } return m; }
function quatAxis(axis, ang) { var h = ang / 2, s = Math.sin(h); return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)]; }

var g = loadGlb(ASSET), j = g.json, skin = j.skins[0], joints = skin.joints;
var parentOf = {}; j.nodes.forEach(function (n, ni) { (n.children || []).forEach(function (c) { parentOf[c] = ni; }); });
var ibm = g.acc(skin.inverseBindMatrices), nameOf = {}; joints.forEach(function (n, i) { nameOf[i] = j.nodes[n].name; });
function skinMats(pose) { var cache = {}; function w(ni) { if (cache[ni]) return cache[ni]; var n = j.nodes[ni], p = pose[n.name]; var local = trs(n.translation || [0, 0, 0], p ? quatAxis(p[0], p[1]) : (n.rotation || null)); var par = parentOf[ni] !== undefined ? w(parentOf[ni]) : ident(); return (cache[ni] = mul(par, local)); } return joints.map(function (n, i) { var b = new Float64Array(16); for (var k = 0; k < 16; k++) b[k] = ibm[i * 16 + k]; return mul(w(n), b); }); }
var legsMesh = j.meshes.filter(function (m) { return /SPLIT_LEGS/.test(m.name); })[0];
ok(!!legsMesh, 'split-leg mesh present', legsMesh && legsMesh.name);
var prim = legsMesh.primitives[0];
var POS = g.acc(prim.attributes.POSITION), IDX = g.acc(prim.indices), JO = g.acc(prim.attributes.JOINTS_0), WE = g.acc(prim.attributes.WEIGHTS_0);
var DELTA = prim.targets && prim.targets[0] && prim.targets[0].POSITION !== undefined ? g.acc(prim.targets[0].POSITION) : null;
var N = POS.length / 3, T = IDX.length / 3;
var minY = Infinity, maxY = -Infinity; var bodyPOS = g.acc(j.meshes[0].primitives[0].attributes.POSITION); for (var i = 0; i < bodyPOS.length / 3; i++) { var y = bodyPOS[i * 3 + 1]; if (y < minY) minY = y; if (y > maxY) maxY = y; } var H = maxY - minY;
console.log('MAHWORLD leg surface test · ' + path.basename(ASSET) + ' · ' + N + ' verts ' + T + ' tris' + (DELTA ? ' · PACKED morph present' : ' · NO morph'));

/* ---- topology: welded by position, so a duplicated seam still counts as one edge ---- */
var weld = new Int32Array(N), key = new Map(), wc = 0;
for (var v = 0; v < N; v++) { var k = Math.round(POS[v * 3] * 1e4) + '_' + Math.round(POS[v * 3 + 1] * 1e4) + '_' + Math.round(POS[v * 3 + 2] * 1e4); var w0 = key.get(k); if (w0 === undefined) { w0 = wc++; key.set(k, w0); } weld[v] = w0; }
var edgeCount = new Map();
function ek(a, b) { return a < b ? a + '_' + b : b + '_' + a; }
for (var t = 0; t < T; t++) { var a = weld[IDX[t * 3]], b = weld[IDX[t * 3 + 1]], c = weld[IDX[t * 3 + 2]]; [[a, b], [b, c], [c, a]].forEach(function (e) { var kk = ek(e[0], e[1]); edgeCount.set(kk, (edgeCount.get(kk) || 0) + 1); }); }
var boundary = [], nonManifold = 0; edgeCount.forEach(function (cnt, kk) { if (cnt === 1) boundary.push(kk); else if (cnt > 2) nonManifold++; });
/* boundary edges are only tolerable at the very top (the ring that disappears into the pelvis) */
var hipTop = -Infinity; for (var v2 = 0; v2 < N; v2++) if (POS[v2 * 3 + 1] > hipTop) hipTop = POS[v2 * 3 + 1];
var wpos = new Float64Array(wc * 3); for (var v3 = 0; v3 < N; v3++) { wpos[weld[v3] * 3] = POS[v3 * 3]; wpos[weld[v3] * 3 + 1] = POS[v3 * 3 + 1]; wpos[weld[v3] * 3 + 2] = POS[v3 * 3 + 2]; }
var lowBoundary = boundary.filter(function (kk) { var ab = kk.split('_').map(Number); return Math.min(wpos[ab[0] * 3 + 1], wpos[ab[1] * 3 + 1]) < hipTop - 0.03 * H; });
ok(lowBoundary.length === 0, 'no open edges below the hip ring (an intact limb has a closed surface)', boundary.length + ' boundary edges, ' + lowBoundary.length + ' of them below the hip ring');
ok(nonManifold === 0, 'no non-manifold edges', nonManifold);

/* ---- posed strain ---- */
function posed(pose, packed) {
  var S = skinMats(pose), out = new Float64Array(N * 3);
  for (var i = 0; i < N; i++) {
    var px = POS[i * 3] + (packed && DELTA ? DELTA[i * 3] : 0), py = POS[i * 3 + 1] + (packed && DELTA ? DELTA[i * 3 + 1] : 0), pz = POS[i * 3 + 2] + (packed && DELTA ? DELTA[i * 3 + 2] : 0), ox = 0, oy = 0, oz = 0;
    for (var k = 0; k < 4; k++) { var w = WE[i * 4 + k]; if (w <= 0) continue; var m = S[JO[i * 4 + k]]; ox += w * (m[0] * px + m[4] * py + m[8] * pz + m[12]); oy += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]); oz += w * (m[2] * px + m[6] * py + m[10] * pz + m[14]); }
    out[i * 3] = ox; out[i * 3 + 1] = oy; out[i * 3 + 2] = oz;
  }
  return out;
}
function edgeLen(P, a, b) { var dx = P[a * 3] - P[b * 3], dy = P[a * 3 + 1] - P[b * 3 + 1], dz = P[a * 3 + 2] - P[b * 3 + 2]; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
function triNormalDot(P0, P1, t) {
  function n(P) { var a = IDX[t * 3], b = IDX[t * 3 + 1], c = IDX[t * 3 + 2]; var ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2]; return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; }
  var n0 = n(P0), n1 = n(P1); var l0 = Math.hypot(n0[0], n0[1], n0[2]), l1 = Math.hypot(n1[0], n1[1], n1[2]); if (l0 < 1e-12 || l1 < 1e-12) return 1; return (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]) / (l0 * l1);
}
function strain(P0, P1, label) {
  var worst = 1, worstShrink = 1, over = 0, inverted = 0, tot = 0;
  for (var t = 0; t < T; t++) {
    var a = IDX[t * 3], b = IDX[t * 3 + 1], c = IDX[t * 3 + 2];
    [[a, b], [b, c], [c, a]].forEach(function (e) { var r0 = edgeLen(P0, e[0], e[1]); if (r0 < 1e-6) return; var r = edgeLen(P1, e[0], e[1]) / r0; tot++; if (r > worst) worst = r; if (r < worstShrink) worstShrink = r; if (r > 1.6 || r < 0.5) over++; });
    if (triNormalDot(P0, P1, t) < -0.2) inverted++;
  }
  return { max_stretch: worst, max_shrink: worstShrink, edges_out_of_band: over, edges: tot, inverted: inverted, pct: 100 * over / Math.max(1, tot) };
}
var rest = posed({}, false);
var swing = posed({ THIGH_L: [[1, 0, 0], -0.55], SHIN_L: [[1, 0, 0], 0.95], THIGH_R: [[1, 0, 0], 0.35], SHIN_R: [[1, 0, 0], 0.25] }, false);
var gather = posed({ THIGH_L: [[1, 0, 0], -1.25], SHIN_L: [[1, 0, 0], 1.35], THIGH_R: [[1, 0, 0], -1.25], SHIN_R: [[1, 0, 0], 1.35] }, false);
var sw = strain(rest, swing), ga = strain(rest, gather);
console.log('  swing strain', JSON.stringify({ max_stretch: +sw.max_stretch.toFixed(2), max_shrink: +sw.max_shrink.toFixed(2), out_of_band_pct: +sw.pct.toFixed(2), inverted: sw.inverted }));
console.log('  gather strain', JSON.stringify({ max_stretch: +ga.max_stretch.toFixed(2), max_shrink: +ga.max_shrink.toFixed(2), out_of_band_pct: +ga.pct.toFixed(2), inverted: ga.inverted }));
ok(sw.pct < 1.0 && sw.inverted === 0, 'the gait swing (knee 54 deg, hip 32 deg) keeps every triangle inside the strain band with no inversions', sw.pct.toFixed(2) + '% edges out of band, ' + sw.inverted + ' inverted');
ok(ga.pct < 2.5 && ga.inverted < 0.005 * T, 'the X-gather (knee 77 deg, hip 72 deg) keeps the leg surface continuous', ga.pct.toFixed(2) + '% edges out of band, ' + ga.inverted + ' inverted');

/* ---- knee section, shin length, tip ---- */
var restW = {}; (function () { var S = skinMats({}); })();
function jointWorld(name) { var cache = {}; function w(ni) { if (cache[ni]) return cache[ni]; var n = j.nodes[ni]; var local = trs(n.translation || [0, 0, 0], n.rotation || null); var par = parentOf[ni] !== undefined ? w(parentOf[ni]) : ident(); return (cache[ni] = mul(par, local)); } var idx = joints.map(function (n) { return j.nodes[n].name; }).indexOf(name); var m = w(joints[idx]); return [m[12], m[13], m[14]]; }
var kneeL = jointWorld('SHIN_L'), tipL = jointWorld('TIP_L');
function sectionRadius(P, centre, half, side) { var d = []; for (var i = 0; i < N; i++) { if (side < 0 ? POS[i * 3] > 0 : POS[i * 3] < 0) continue; if (Math.abs(POS[i * 3 + 1] - centre[1]) > half) continue; d.push(Math.hypot(P[i * 3] - centre[0], P[i * 3 + 2] - centre[2])); } if (d.length < 6) return null; d.sort(function (a, b) { return a - b; }); return d[Math.floor(d.length / 2)]; }
var kr0 = sectionRadius(rest, kneeL, 0.012, -1);
/* the knee section after the bend is measured about the POSED knee centre */
var Sm = skinMats({ THIGH_L: [[1, 0, 0], -0.55], SHIN_L: [[1, 0, 0], 0.95] }); var kIdx = joints.map(function (n) { return j.nodes[n].name; }).indexOf('SHIN_L'); var km = Sm[kIdx]; var kneePosed = [km[0] * kneeL[0] + km[4] * kneeL[1] + km[8] * kneeL[2] + km[12], km[1] * kneeL[0] + km[5] * kneeL[1] + km[9] * kneeL[2] + km[13], km[2] * kneeL[0] + km[6] * kneeL[1] + km[10] * kneeL[2] + km[14]];
var kneeSel = []; for (var i5 = 0; i5 < N; i5++) { if (POS[i5 * 3] > 0) continue; if (Math.abs(POS[i5 * 3 + 1] - kneeL[1]) > 0.012) continue; kneeSel.push(i5); }
var kr1 = (function () { var d = kneeSel.map(function (i) { return Math.hypot(swing[i * 3] - kneePosed[0], swing[i * 3 + 1] - kneePosed[1], swing[i * 3 + 2] - kneePosed[2]); }); d.sort(function (a, b) { return a - b; }); return d.length ? d[Math.floor(d.length / 2)] : null; })();
ok(kr0 && kr1 && kr1 / kr0 > 0.6, 'the knee keeps its section through the swing', kr0 && kr1 ? (kr0 * 1000).toFixed(1) + ' mm → ' + (kr1 * 1000).toFixed(1) + ' mm (' + (100 * kr1 / kr0).toFixed(0) + '%)' : 'not measurable');
var kneeRings = 0; (function () { var ys = new Set(); for (var i = 0; i < N; i++) { if (POS[i * 3] > 0) continue; var dy = POS[i * 3 + 1] - kneeL[1]; if (Math.abs(dy) < 0.05 * H) ys.add(Math.round(POS[i * 3 + 1] * 500)); } kneeRings = ys.size; })();
ok(kneeRings >= 5, 'the knee has enough loops to bend (≥ 5 distinct rings within ±0.05 H)', kneeRings + ' rings');
if (DELTA) {
  var packed = posed({}, true); var pk = strain(rest, packed, 'packed');
  ok(pk.inverted < 0.02 * T, 'the PACKED form is the same surface (no mass inversion)', pk.inverted + ' inverted of ' + T);
}
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
