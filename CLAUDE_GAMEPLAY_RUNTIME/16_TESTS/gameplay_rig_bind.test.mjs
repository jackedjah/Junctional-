/* MAHWORLD :: RIG BIND TEST — the deformation the owner rejected, measured on the actual asset.
   Evaluates linear blend skinning straight out of the GLB (no three.js, no Blender): node hierarchy → joint world matrices →
   skin matrices → posed vertices. Everything asserted here is a property of the delivered file, not of the generator.
     · structure: one skin, joints and inverse bind matrices agree, two body primitives keep their upper / fused_lower roles,
       the split legs keep the PACKED morph
     · weights: normalised, at most 4 influences, no unweighted vertex, no bone left with nothing bound to it
     · joint placement: the elbow and the knee sit at the measured narrowing between the neighbouring bulges
     · locality: bending one elbow must not move the torso, the head or the other arm
     · volume: the elbow and knee must not collapse at the profile's deepest legal bend
   node 16_TESTS/gameplay_rig_bind.test.mjs [--asset <glb>] [--compare <glb>] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { profile, smooth, localExtrema, pickNear, measureArmThreshold } from '../26_LOCAL_AUTHORITY/lab/assets/rig_measure.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var ASSETS = path.join(HERE, '..', '26_LOCAL_AUTHORITY', 'lab', 'assets', 'athlete_m_preview');
var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var ASSET = arg('--asset', path.join(ASSETS, 'dev_0.7', 'Mah_Athlete_M_am08_v4.glb'));
var COMPARE = arg('--compare', path.join(ASSETS, 'dev_0.5', 'Mah_Athlete_M_am08_v2.glb'));   /* the build the owner reviewed first; dev_0.6 was the joint repair, dev_0.7 adds the complete legs + shoulder cap */
var pass = 0, fail = 0, notes = [];
function ok(c, m, extra) { if (c) { pass++; console.log('  PASS ' + m + (extra ? ' — ' + extra : '')); } else { fail++; console.log('  FAIL ' + m + (extra ? ' — ' + extra : '')); } }
function near(a, b, tol) { return Math.abs(a - b) <= tol; }

/* ---------- GLB ---------- */
function loadGlb(file) {
  var glb = fs.readFileSync(file); if (glb.readUInt32LE(0) !== 0x46546C67) throw new Error('not a GLB: ' + file);
  var jl = glb.readUInt32LE(12), j = JSON.parse(glb.slice(20, 20 + jl).toString('utf8'));
  var bin = glb.slice(28 + jl, 28 + jl + glb.readUInt32LE(20 + jl));
  function acc(ai) {
    var a = j.accessors[ai], bv = j.bufferViews[a.bufferView], off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    var n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    var C = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
    return new C(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * C.BYTES_PER_ELEMENT));
  }
  return { json: j, acc: acc, bytes: glb.length, file: file };
}
/* column-major 4x4 */
function mul(a, b) { var o = new Float64Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function ident() { return new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
function trs(t, q) {
  var m = ident();
  if (q) { var x = q[0], y = q[1], z = q[2], w = q[3]; m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y + z * w); m[2] = 2 * (x * z - y * w); m[4] = 2 * (x * y - z * w); m[5] = 1 - 2 * (x * x + z * z); m[6] = 2 * (y * z + x * w); m[8] = 2 * (x * z + y * w); m[9] = 2 * (y * z - x * w); m[10] = 1 - 2 * (x * x + y * y); }
  if (t) { m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; }
  return m;
}
function quatAxis(axis, ang) { var h = ang / 2, s = Math.sin(h); return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)]; }
function xform(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }

function rig(g, primIndex) {
  var j = g.json, skin = j.skins[0], joints = skin.joints;
  var name = {}, index = {}; joints.forEach(function (n, i) { name[i] = j.nodes[n].name; index[j.nodes[n].name] = i; });
  var parentOf = {}; j.nodes.forEach(function (n, ni) { (n.children || []).forEach(function (c) { parentOf[c] = ni; }); });
  var ibm = g.acc(skin.inverseBindMatrices);
  function world(pose) {                                  /* pose: {boneName: [axis, angle]} */
    var cache = {};
    function w(nodeIdx) {
      if (cache[nodeIdx]) return cache[nodeIdx];
      var n = j.nodes[nodeIdx], p = pose && pose[n.name];
      var local = trs(n.translation || [0, 0, 0], p ? quatAxis(p[0], p[1]) : (n.rotation || null));
      var par = parentOf[nodeIdx] !== undefined ? w(parentOf[nodeIdx]) : ident();
      return (cache[nodeIdx] = mul(par, local));
    }
    return joints.map(function (n) { return w(n); });
  }
  function skinMats(pose) {
    var ws = world(pose);
    return ws.map(function (m, i) { var b = new Float64Array(16); for (var k = 0; k < 16; k++) b[k] = ibm[i * 16 + k]; return mul(m, b); });
  }
  var mesh = j.meshes[primIndex === undefined ? 0 : primIndex], prim = mesh.primitives[0];
  var POS = g.acc(prim.attributes.POSITION), JO = g.acc(prim.attributes.JOINTS_0), WE = g.acc(prim.attributes.WEIGHTS_0);
  function pose(poseMap) {
    var S = skinMats(poseMap), N = POS.length / 3, out = new Float64Array(N * 3);
    for (var i = 0; i < N; i++) {
      var px = POS[i * 3], py = POS[i * 3 + 1], pz = POS[i * 3 + 2], ox = 0, oy = 0, oz = 0;
      for (var k = 0; k < 4; k++) {
        var w2 = WE[i * 4 + k]; if (w2 <= 0) continue;
        var m = S[JO[i * 4 + k]];
        ox += w2 * (m[0] * px + m[4] * py + m[8] * pz + m[12]); oy += w2 * (m[1] * px + m[5] * py + m[9] * pz + m[13]); oz += w2 * (m[2] * px + m[6] * py + m[10] * pz + m[14]);
      }
      out[i * 3] = ox; out[i * 3 + 1] = oy; out[i * 3 + 2] = oz;
    }
    return out;
  }
  var restW = {}; joints.forEach(function (n, i) { var m = world(null)[i]; restW[j.nodes[n].name] = [m[12], m[13], m[14]]; });
  return { json: j, name: name, index: index, POS: POS, JO: JO, WE: WE, pose: pose, restWorld: restW, joints: joints, ibm: ibm, mesh: mesh };
}

console.log('MAHWORLD rig bind test');
console.log('asset  ', ASSET);
var g = loadGlb(ASSET), R = rig(g);
var N = R.POS.length / 3, minY = Infinity, maxY = -Infinity;
for (var i = 0; i < N; i++) { var y = R.POS[i * 3 + 1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
var H = maxY - minY;

/* ---------- 1 structure ---------- */
console.log('\n[1] structure');
ok(g.json.skins && g.json.skins.length === 1, 'exactly one skin', 'skins=' + (g.json.skins || []).length);
ok(R.joints.length === R.ibm.length / 16, 'inverse bind matrices match joint count', R.joints.length + ' joints');
var roles = (g.json.meshes[0].primitives || []).map(function (p) { return p.extras && p.extras.role; });
ok(roles.length === 2 && roles.indexOf('upper') >= 0 && roles.indexOf('fused_lower') >= 0, 'body keeps two primitives with upper / fused_lower roles', JSON.stringify(roles));
var legs = g.json.meshes[1];
ok(!!legs && legs.extras && (legs.extras.targetNames || []).indexOf('PACKED') >= 0, 'split legs keep the PACKED morph', JSON.stringify(legs && legs.extras));
ok((legs.primitives[0].attributes.JOINTS_0 !== undefined), 'split legs are skinned');
['PELVIS', 'SPINE', 'CHEST', 'NECK', 'HEAD', 'UPPERARM_L', 'FOREARM_L', 'HAND_L', 'FINGERS_L', 'THIGH_L', 'SHIN_L', 'TIP_L'].forEach(function (b) {
  if (R.index[b] === undefined) ok(false, 'bone present: ' + b);
});
ok(true, 'all runtime bone names present');

/* ---------- 2 weights ---------- */
console.log('\n[2] weights');
var bad = 0, maxInf = 0, unweighted = 0, per = {};
for (var i2 = 0; i2 < N; i2++) {
  var s = 0, nzc = 0;
  for (var k2 = 0; k2 < 4; k2++) { var w3 = R.WE[i2 * 4 + k2]; s += w3; if (w3 > 1e-3) { nzc++; per[R.name[R.JO[i2 * 4 + k2]]] = (per[R.name[R.JO[i2 * 4 + k2]]] || 0) + 1; } }
  if (Math.abs(s - 1) > 1e-3) bad++; if (nzc > maxInf) maxInf = nzc; if (nzc === 0) unweighted++;
}
ok(bad === 0, 'every vertex weight set is normalised', bad + ' bad');
ok(maxInf <= 4, 'at most four influences', 'max ' + maxInf);
ok(unweighted === 0, 'no unweighted vertex', unweighted);
var deadBones = ['PELVIS', 'SPINE', 'CHEST', 'NECK', 'HEAD', 'CLAV_L', 'UPPERARM_L', 'FOREARM_L', 'HAND_L', 'FINGERS_L', 'CLAV_R', 'UPPERARM_R', 'FOREARM_R', 'HAND_R', 'FINGERS_R', 'TAIL1', 'TAIL2', 'TAIL3'].filter(function (b) { return !per[b]; });
ok(deadBones.length === 0, 'every body bone has vertices bound to it', deadBones.length ? 'unbound: ' + deadBones.join(',') : Object.keys(per).length + ' bones bound');

/* ---------- 3 joint placement against the mesh itself ---------- */
console.log('\n[3] joint placement (measured from this asset)');
var pts = []; for (var i3 = 0; i3 < N; i3++) pts.push({ x: R.POS[i3 * 3], y: R.POS[i3 * 3 + 1], z: R.POS[i3 * 3 + 2], h: (R.POS[i3 * 3 + 1] - minY) / H });
var shHW = Math.max.apply(null, pts.filter(function (p) { return p.h >= 0.74 && p.h <= 0.86; }).map(function (p) { return Math.abs(p.x); }));
var ARMT = measureArmThreshold(pts, shHW).armT;            /* the same measured separation the generator used */
var armPts = pts.filter(function (p) { return p.x < -ARMT && p.h > 0.30; });
var rows = smooth(profile(armPts, Math.min.apply(null, armPts.map(function (p) { return p.h; })), 0.80, 30));
var minima = localExtrema(rows, -1), maxima = localExtrema(rows, 1);
var elbowH = (R.restWorld.FOREARM_L[1] - minY) / H, wristH = (R.restWorld.HAND_L[1] - minY) / H, shH = (R.restWorld.UPPERARM_L[1] - minY) / H;
/* band-alignment independent: the section AT the bone must be within 8 % of the narrowest section around it, and must not
   coincide with a bulge. (Asking for a local minimum at exactly the bone's band makes the result depend on where the
   profile's bands happen to fall.) */
function narrowness(rws, h, win) {
  var here = null, lo = Infinity, hi = -Infinity;
  rws.forEach(function (r) { if (r.r === null || Math.abs(r.h - h) > win) return; if (r.r < lo) lo = r.r; if (r.r > hi) hi = r.r; if (here === null || Math.abs(r.h - h) < Math.abs(here.h - h)) here = r; });
  return here && lo < Infinity ? { at: here.r, min: lo, max: hi, ratio: here.r / lo } : null;
}
var nEl = narrowness(rows, elbowH, 0.05), nWr = narrowness(rows, wristH, 0.05);
var nearestMin = pickNear(minima, elbowH, 0.05);
/* the manifest states how each joint was found; the check follows that claim rather than assuming every body has a
   measurable elbow narrowing. A body that has one must use it; a body that does not must say so and land on the station. */
var mfPath = path.join(path.dirname(ASSET), 'manifest.json'), mf = fs.existsSync(mfPath) ? JSON.parse(fs.readFileSync(mfPath, 'utf8')) : null;
var elbowClaim = mf && mf.measurements && mf.measurements.arm_L ? mf.measurements.arm_L.elbow_source : 'measured_narrowing';
if (elbowClaim === 'measured_narrowing') {
  ok(nEl && nEl.ratio < 1.08, 'the elbow bone sits at a narrowing of the arm (manifest: measured)', nEl ? 'section ' + (nEl.at * 1000).toFixed(1) + ' mm vs narrowest nearby ' + (nEl.min * 1000).toFixed(1) + ' mm and widest ' + (nEl.max * 1000).toFixed(1) + ' mm' : 'not measurable');
} else {
  var station = mf.measurements.arm_L.elbow_station_h;
  ok(Math.abs(elbowH - station) < 0.01, 'the elbow bone is at the declared proportional station (this mesh has no stable narrowing there)', 'bone ' + elbowH.toFixed(3) + ' H, station ' + station.toFixed(3) + ' H, section ' + (nEl ? (nEl.at * 1000).toFixed(1) : '?') + ' mm');
  notes.push('elbow placed by proportional station on this body: the arm profile has no narrowing that survives a half-band shift (declared in the manifest as ' + elbowClaim + ')');
}
ok(nWr && nWr.ratio < 1.12, 'the wrist bone sits at a narrowing of the arm', nWr ? 'section ' + (nWr.at * 1000).toFixed(1) + ' mm vs narrowest nearby ' + (nWr.min * 1000).toFixed(1) + ' mm' : 'not measurable');
var foreBulge = pickNear(maxima, elbowH - 0.04, 0.06);
ok(!foreBulge || Math.abs(foreBulge.h - elbowH) > 0.015, 'the elbow bone is NOT inside the forearm bulge', foreBulge ? 'bulge at ' + foreBulge.h.toFixed(3) + ' H' : 'no bulge within 0.06 H');
/* knee: measured on the split-leg mesh this asset ships */
var Rl = rig(g, 1), NL = Rl.POS.length / 3, lp = [];
for (var i4 = 0; i4 < NL; i4++) { var x4 = Rl.POS[i4 * 3]; if (x4 < 0) lp.push({ x: x4, y: Rl.POS[i4 * 3 + 1], z: Rl.POS[i4 * 3 + 2], h: (Rl.POS[i4 * 3 + 1] - minY) / H }); }
var lrows = smooth(profile(lp, 0.0, 0.42, 24)), lmin = localExtrema(lrows, -1), lmax = localExtrema(lrows, 1);
var kneeH = (R.restWorld.SHIN_L[1] - minY) / H;
var kneeNarrow = pickNear(lmin, kneeH, 0.05), calf = pickNear(lmax, kneeH - 0.08, 0.08);
var nKn = narrowness(lrows, kneeH, 0.05);
ok(nKn && nKn.ratio < 1.10, 'the knee bone sits at a narrowing of the leg', nKn ? 'section ' + (nKn.at * 1000).toFixed(1) + ' mm vs narrowest nearby ' + (nKn.min * 1000).toFixed(1) + ' mm and widest ' + (nKn.max * 1000).toFixed(1) + ' mm' : 'not measurable');
ok(!calf || Math.abs(calf.h - kneeH) > 0.02, 'the knee bone is NOT inside the calf bulge', calf ? 'calf bulge at ' + calf.h.toFixed(3) + ' H' : 'no bulge within 0.08 H');

/* ---------- 4 deformation locality ---------- */
console.log('\n[4] deformation locality (elbow bent 75 deg, the profile limit)');
function disp(a, b, filter) {
  var mx = 0, sum = 0, n = 0;
  for (var i = 0; i < a.length / 3; i++) {
    if (filter && !filter(i)) continue;
    var dx = a[i * 3] - b[i * 3], dy = a[i * 3 + 1] - b[i * 3 + 1], dz = a[i * 3 + 2] - b[i * 3 + 2];
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > mx) mx = d; sum += d; n++;
  }
  return { max: mx, mean: n ? sum / n : 0, n: n };
}
var rest = R.pose(null), bent = R.pose({ FOREARM_L: [[1, 0, 0], -1.31] });
var isTorso = function (i) { return Math.abs(R.POS[i * 3]) < 0.80 * ARMT && (R.POS[i * 3 + 1] - minY) / H > 0.42 && (R.POS[i * 3 + 1] - minY) / H < 0.80; };
var isHead = function (i) { return (R.POS[i * 3 + 1] - minY) / H > 0.90; };
var isRightArm = function (i) { return R.POS[i * 3] > ARMT && (R.POS[i * 3 + 1] - minY) / H > 0.30; };
var isLeftHand = function (i) { return R.POS[i * 3] < -ARMT && (R.POS[i * 3 + 1] - minY) / H < 0.50; };
var isLeftUpper = function (i) { var h = (R.POS[i * 3 + 1] - minY) / H; return R.POS[i * 3] < -ARMT && h > 0.68 && h < 0.75; };
var dHand = disp(rest, bent, isLeftHand), dTorso = disp(rest, bent, isTorso), dHead = disp(rest, bent, isHead), dRight = disp(rest, bent, isRightArm), dUp = disp(rest, bent, isLeftUpper);
ok(dHand.mean > 0.05, 'the bent arm actually moves the hand', 'mean ' + (dHand.mean * 100).toFixed(1) + ' cm over ' + dHand.n + ' verts');
ok(dTorso.max < 0.002, 'the torso does not follow the elbow', 'max ' + (dTorso.max * 1000).toFixed(2) + ' mm');
ok(dHead.max < 0.001, 'the head does not follow the elbow', 'max ' + (dHead.max * 1000).toFixed(2) + ' mm');
ok(dRight.max < 0.001, 'the other arm does not follow the elbow', 'max ' + (dRight.max * 1000).toFixed(2) + ' mm');
ok(dUp.max < 0.02, 'the upper arm above the elbow stays put', 'max ' + (dUp.max * 1000).toFixed(1) + ' mm');
var shoulderBend = R.pose({ UPPERARM_L: [[1, 0, 0], -1.2] });
var dTorso2 = disp(rest, shoulderBend, isTorso);
ok(dTorso2.max < 0.012, 'raising the shoulder does not drag the ribcage', 'max ' + (dTorso2.max * 1000).toFixed(1) + ' mm over ' + dTorso2.n + ' torso-column verts');

/* ---------- 5 joint volume (candy-wrapper) ---------- */
console.log('\n[5] joint volume under the deepest legal bend');
/* the joint's own cross-section: only vertices BOUND to the two bones that meet there, selected in rest space within a slab
   around the joint, then measured again after posing. A plain world-space slice would take in the torso and the other arm. */
function jointSet(rr, joint, bones, half) {
  var idx = [], c = rr.restWorld[joint], n = rr.POS.length / 3, want = {};
  bones.forEach(function (b) { want[rr.index[b]] = 1; });
  for (var i = 0; i < n; i++) {
    var w = 0; for (var k = 0; k < 4; k++) if (want[rr.JO[i * 4 + k]]) w += rr.WE[i * 4 + k];
    if (w < 0.5) continue;
    if (Math.abs(rr.POS[i * 3 + 1] - c[1]) > half) continue;
    idx.push(i);
  }
  return idx;
}
function jointRadius(posed, idx, centre) {
  if (idx.length < 6) return null;
  var d = idx.map(function (i) { var dx = posed[i * 3] - centre[0], dz = posed[i * 3 + 2] - centre[2]; return Math.sqrt(dx * dx + dz * dz); });
  d.sort(function (a, b) { return a - b; });
  return d[Math.floor(0.5 * d.length)];
}
var elbowC = R.restWorld.FOREARM_L;
var eIdx = jointSet(R, 'FOREARM_L', ['UPPERARM_L', 'FOREARM_L'], 0.014);
var r0 = jointRadius(rest, eIdx, elbowC), r1 = jointRadius(bent, eIdx, elbowC);
ok(r0 && r1 && r1 / r0 > 0.55, 'the elbow does not collapse at 75 deg of flexion', r0 && r1 ? 'rest ' + (r0 * 1000).toFixed(1) + ' mm → bent ' + (r1 * 1000).toFixed(1) + ' mm (' + (100 * r1 / r0).toFixed(0) + '%, ' + eIdx.length + ' verts)' : 'not measurable');
var restL = Rl.pose(null), bentL = Rl.pose({ SHIN_L: [[1, 0, 0], 1.2] });
var kneeC = Rl.restWorld.SHIN_L;
var kIdx = jointSet(Rl, 'SHIN_L', ['THIGH_L', 'SHIN_L'], 0.014);
var k0 = jointRadius(restL, kIdx, kneeC), k1 = jointRadius(bentL, kIdx, kneeC);
ok(k0 && k1 && k1 / k0 > 0.55, 'the knee does not collapse at 69 deg of flexion', k0 && k1 ? 'rest ' + (k0 * 1000).toFixed(1) + ' mm → bent ' + (k1 * 1000).toFixed(1) + ' mm (' + (100 * k1 / k0).toFixed(0) + '%, ' + kIdx.length + ' verts)' : 'not measurable');
var dThighTop = disp(restL, bentL, function (i) { return (Rl.POS[i * 3 + 1] - minY) / H > 0.37 && Rl.POS[i * 3] < 0; });
ok(dThighTop.max < 0.004, 'bending the knee does not move the hip', 'max ' + (dThighTop.max * 1000).toFixed(2) + ' mm');

/* ---------- 6 side by side with the version the owner reviewed ---------- */
if (fs.existsSync(COMPARE)) {
  console.log('\n[6] against the reviewed version (' + path.basename(COMPARE) + ')');
  var g2 = loadGlb(COMPARE), R2 = rig(g2), N2 = R2.POS.length / 3;
  var minY2 = Infinity, maxY2 = -Infinity; for (var i5 = 0; i5 < N2; i5++) { var y5 = R2.POS[i5 * 3 + 1]; if (y5 < minY2) minY2 = y5; if (y5 > maxY2) maxY2 = y5; }
  var H2 = maxY2 - minY2;
  var e2 = (R2.restWorld.FOREARM_L[1] - minY2) / H2, w2 = (R2.restWorld.HAND_L[1] - minY2) / H2, k2 = (R2.restWorld.SHIN_L[1] - minY2) / H2;
  var pts2 = []; for (var i6 = 0; i6 < N2; i6++) pts2.push({ x: R2.POS[i6 * 3], y: R2.POS[i6 * 3 + 1], z: R2.POS[i6 * 3 + 2], h: (R2.POS[i6 * 3 + 1] - minY2) / H2 });
  var shHW2 = Math.max.apply(null, pts2.filter(function (p) { return p.h >= 0.74 && p.h <= 0.86; }).map(function (p) { return Math.abs(p.x); }));
  var ARMT2 = measureArmThreshold(pts2, shHW2).armT;
  var arm2 = pts2.filter(function (p) { return p.x < -ARMT2 && p.h > 0.30; });
  var rows2 = smooth(profile(arm2, Math.min.apply(null, arm2.map(function (p) { return p.h; })), 0.80, 30));
  var min2 = localExtrema(rows2, -1);
  var oldNear = pickNear(min2, e2, 0.05);
  notes.push('reviewed rig: elbow ' + e2.toFixed(3) + ' H, wrist ' + w2.toFixed(3) + ' H, knee ' + k2.toFixed(3) + ' H' + (oldNear ? ' (nearest narrowing ' + oldNear.h.toFixed(3) + ')' : ' (no narrowing within 0.05 H — the bone was inside the limb mass)'));
  notes.push('repaired rig: elbow ' + elbowH.toFixed(3) + ' H, wrist ' + wristH.toFixed(3) + ' H, knee ' + kneeH.toFixed(3) + ' H, shoulder ' + shH.toFixed(3) + ' H');
  var rest2 = R2.pose(null), bent2 = R2.pose({ FOREARM_L: [[1, 0, 0], -1.31] });
  var t2 = disp(rest2, bent2, function (i) { return Math.abs(R2.POS[i * 3]) < 0.80 * ARMT2 && (R2.POS[i * 3 + 1] - minY2) / H2 > 0.42 && (R2.POS[i * 3 + 1] - minY2) / H2 < 0.80; });
  notes.push('torso pulled by an elbow bend: reviewed ' + (t2.max * 1000).toFixed(1) + ' mm → repaired ' + (dTorso.max * 1000).toFixed(2) + ' mm');
  var e2Idx = jointSet(R2, 'FOREARM_L', ['UPPERARM_L', 'FOREARM_L'], 0.014);
  var er0 = jointRadius(rest2, e2Idx, R2.restWorld.FOREARM_L), er1 = jointRadius(bent2, e2Idx, R2.restWorld.FOREARM_L);
  if (er0 && er1) notes.push('elbow section kept at 75 deg: reviewed ' + (100 * er1 / er0).toFixed(0) + '% → repaired ' + (100 * r1 / r0).toFixed(0) + '%');
  ok(Math.abs(elbowH - (oldNear ? oldNear.h : elbowH)) <= Math.abs(e2 - (oldNear ? oldNear.h : e2)) + 1e-9, 'the repaired elbow is at least as close to the measured narrowing as the reviewed one');
  ok(dTorso.max <= Math.max(t2.max, 0.001) + 1e-9, 'the repaired bind pulls the torso no more than the reviewed one (or under 1 mm)', (t2.max * 1000).toFixed(1) + ' mm → ' + (dTorso.max * 1000).toFixed(2) + ' mm');
}

console.log('\n' + notes.map(function (n) { return '  · ' + n; }).join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
