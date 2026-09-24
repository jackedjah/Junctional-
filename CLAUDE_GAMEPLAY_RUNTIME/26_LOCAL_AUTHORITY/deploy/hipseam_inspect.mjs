/* HIP SEAM INSPECTION (owner assignment 2026-09-18 §5) — what actually joins the pelvis shell to the separated thighs in the derivative GLB:
   geometry (rings, gap / overlap, normals), weight distribution (which joints own the pelvis shell and the leg top), joint placement (femoral head vs
   the split line), duplicated / hidden surfaces. Pure node over the GLB; no runtime, no Blender.   node deploy/_hipseam.mjs <glb> [--json out] */
import fs from 'node:fs'; import path from 'node:path'; import { readGlb } from './glb_read.mjs';
var argv = process.argv.slice(2); var FILE = argv[0]; var jsonOut = argv.indexOf('--json') >= 0 ? argv[argv.indexOf('--json') + 1] : null;
var G = readGlb(FILE); var J = G.json; var acc = G.acc;
var skin = J.skins[0]; var jointNames = skin.joints.map(function (n) { return J.nodes[n].name; }); var JI = {}; jointNames.forEach(function (n, i) { JI[n] = i; });
var nodes = J.nodes; function worldOf(ni) { var p = [0, 0, 0]; var n = ni; var chain = []; while (n !== undefined && n !== null) { chain.push(n); var par = null; for (var i = 0; i < nodes.length; i++) if (nodes[i].children && nodes[i].children.indexOf(n) >= 0) { par = i; break; } n = par === null ? undefined : par; } chain.reverse(); chain.forEach(function (c) { var t = nodes[c].translation || [0, 0, 0]; p[0] += t[0]; p[1] += t[1]; p[2] += t[2]; }); return p; }   /* rest = pure translations (the inspector reported no rest rotations / scales) */
var JW = {}; skin.joints.forEach(function (n, i) { JW[jointNames[i]] = worldOf(n); });
function mesh(name) { for (var i = 0; i < J.meshes.length; i++) if (J.meshes[i].name === name || J.meshes[i].name.indexOf(name) >= 0) return J.meshes[i]; return null; }
var body = mesh('_BODY'), legs = mesh('_SPLIT_LEGS'); var R = { file: path.resolve(FILE), joints: { PELVIS: JW.PELVIS, LUMBAR: JW.LUMBAR, THIGH_L: JW.THIGH_L, THIGH_R: JW.THIGH_R, SHIN_L: JW.SHIN_L, TAIL1: JW.TAIL1 } };
function prim(m, k) { var p = m.primitives[k]; var pos = acc(p.attributes.POSITION).data, nor = acc(p.attributes.NORMAL).data, jn = acc(p.attributes.JOINTS_0).data, wt = acc(p.attributes.WEIGHTS_0).data, idx = acc(p.indices).data; return { pos: pos, nor: nor, jn: jn, wt: wt, idx: idx, n: pos.length / 3, role: p.extras && p.extras.role }; }
function usedVerts(P) { var u = {}; for (var i = 0; i < P.idx.length; i++) u[P.idx[i]] = 1; return Object.keys(u).map(Number); }
function weightsOf(P, v) { var o = {}; for (var k = 0; k < 4; k++) { var w = P.wt[v * 4 + k]; if (w > 1e-4) { var nm = jointNames[P.jn[v * 4 + k]]; o[nm] = (o[nm] || 0) + w; } } return o; }
function bandStats(P, verts, y0, y1, tag) { var sel = verts.filter(function (v) { var y = P.pos[v * 3 + 1]; return y >= y0 && y < y1; }); var tot = {}; sel.forEach(function (v) { var w = weightsOf(P, v); Object.keys(w).forEach(function (k) { tot[k] = (tot[k] || 0) + w[k]; }); }); var n = sel.length || 1; var share = {}; Object.keys(tot).forEach(function (k) { share[k] = +(tot[k] / n).toFixed(3); }); return { tag: tag, verts: sel.length, y0: +y0.toFixed(4), y1: +y1.toFixed(4), mean_weight_share: share }; }
var up = prim(body, 0), lo = prim(body, 1); var upV = usedVerts(up), loV = usedVerts(lo); var lg = prim(legs, 0); var lgV = usedVerts(lg);
var hipY = JW.THIGH_L[1]; var upMinY = Math.min.apply(null, upV.map(function (v) { return up.pos[v * 3 + 1]; })); var lgMaxY = Math.max.apply(null, lgV.map(function (v) { return lg.pos[v * 3 + 1]; })); var lgMinY = Math.min.apply(null, lgV.map(function (v) { return lg.pos[v * 3 + 1]; })); var loMaxY = Math.max.apply(null, loV.map(function (v) { return lo.pos[v * 3 + 1]; }));
R.heights = { hip_pivot_y: +hipY.toFixed(4), upper_prim_lowest_y: +upMinY.toFixed(4), fused_lower_top_y: +loMaxY.toFixed(4), legs_top_y: +lgMaxY.toFixed(4), legs_bottom_y: +lgMinY.toFixed(4), pivot_above_split_m: +(hipY - upMinY).toFixed(4) };
/* the body's pelvis shell: bands from the split line up to 0.12 above the hip pivot */
R.upper_bands = [bandStats(up, upV, upMinY - 1e-4, upMinY + 0.01, 'upper bottom ring (split line)'), bandStats(up, upV, upMinY + 0.01, hipY, 'between split line and hip pivot'), bandStats(up, upV, hipY, hipY + 0.06, 'hip pivot → +0.06 (glute / iliac)'), bandStats(up, upV, hipY + 0.06, hipY + 0.12, 'pivot +0.06 → +0.12 (lower abdomen / sacrum)')];
R.legs_bands = [bandStats(lg, lgV, lgMaxY - 0.005, lgMaxY + 1e-4, 'legs top ring'), bandStats(lg, lgV, lgMaxY - 0.03, lgMaxY - 0.005, 'legs top 3 cm'), bandStats(lg, lgV, lgMaxY - 0.08, lgMaxY - 0.03, 'upper thigh')];
/* which joints touch each surface at all */
function jointSet(P, verts) { var s = {}; verts.forEach(function (v) { Object.keys(weightsOf(P, v)).forEach(function (k) { s[k] = (s[k] || 0) + 1; }); }); return s; }
R.joint_coverage = { upper_prim: jointSet(up, upV), fused_lower_prim: jointSet(lo, loV), split_legs: jointSet(lg, lgV) };
/* seam geometry: upper bottom ring vs legs top ring — coincidence, gap, normal mismatch */
var ringU = upV.filter(function (v) { return up.pos[v * 3 + 1] < upMinY + 0.006; }); var ringL = lgV.filter(function (v) { return lg.pos[v * 3 + 1] > lgMaxY - 0.006; });
function nearest(P, v, Q, list) { var best = null, bd = 1e9; var x = P.pos[v * 3], y = P.pos[v * 3 + 1], z = P.pos[v * 3 + 2]; list.forEach(function (u) { var d = Math.hypot(Q.pos[u * 3] - x, Q.pos[u * 3 + 1] - y, Q.pos[u * 3 + 2] - z); if (d < bd) { bd = d; best = u; } }); return { u: best, d: bd }; }
var gaps = [], nrm = []; ringU.forEach(function (v) { var nn = nearest(up, v, lg, ringL); if (nn.u === null) return; gaps.push(nn.d); var a = [up.nor[v * 3], up.nor[v * 3 + 1], up.nor[v * 3 + 2]], b = [lg.nor[nn.u * 3], lg.nor[nn.u * 3 + 1], lg.nor[nn.u * 3 + 2]]; var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; nrm.push(Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI); });
function pct(a, q) { var s = a.slice().sort(function (x, y) { return x - y; }); return s.length ? +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(4) : null; }
R.seam = { upper_ring_verts: ringU.length, legs_ring_verts: ringL.length, ring_gap_m: { median: pct(gaps, 0.5), p90: pct(gaps, 0.9), max: pct(gaps, 1) }, normal_mismatch_deg: { median: pct(nrm, 0.5), p90: pct(nrm, 0.9), max: pct(nrm, 1) } };
/* the split-leg top ring x / z extent vs the pelvis shell at the same height (does the thigh emerge from inside the shell or from its rim?) */
function extent(P, verts) { var xs = verts.map(function (v) { return P.pos[v * 3]; }), zs = verts.map(function (v) { return P.pos[v * 3 + 2]; }); return { x: [+Math.min.apply(null, xs).toFixed(4), +Math.max.apply(null, xs).toFixed(4)], z: [+Math.min.apply(null, zs).toFixed(4), +Math.max.apply(null, zs).toFixed(4)] }; }
R.extents = { upper_bottom_ring: extent(up, ringU), legs_top_ring_L: extent(lg, ringL.filter(function (v) { return lg.pos[v * 3] < 0; })), legs_top_ring_R: extent(lg, ringL.filter(function (v) { return lg.pos[v * 3] >= 0; })), fused_lower_top_band: extent(lo, loV.filter(function (v) { return lo.pos[v * 3 + 1] > loMaxY - 0.01; })) };
/* hidden / duplicated surfaces: does the upper prim keep triangles below the hip pivot that the legs also cover? (shell overlap) */
var upBelowPivot = upV.filter(function (v) { return up.pos[v * 3 + 1] < hipY; }).length; var lgAbovePivot = lgV.filter(function (v) { return lg.pos[v * 3 + 1] > hipY; }).length;
R.overlap = { upper_verts_below_hip_pivot: upBelowPivot, legs_verts_above_hip_pivot: lgAbovePivot, note: 'the pelvis shell continues below the femoral head; a leg that also reaches above the pivot doubles the surface there' };
/* verdict material */
var shellThigh = R.upper_bands[1].mean_weight_share.THIGH_L || 0; var legsPelvis = (R.legs_bands[0].mean_weight_share.PELVIS || 0) + (R.legs_bands[1].mean_weight_share.PELVIS || 0);
R.findings = [
  'pelvis shell between the split line and the femoral head: THIGH share ' + shellThigh + ' (a connected hip needs the shell to follow the thigh partially here)',
  'legs top ring / top 3 cm: PELVIS share ' + legsPelvis.toFixed(3) + ' (a connected junction needs the thigh top to stay with the pelvis partially)',
  'femoral head sits ' + R.heights.pivot_above_split_m + ' m above the split line: the thigh swings from the split line, ' + R.heights.pivot_above_split_m + ' m below its own pivot — the shell above is rigid',
  'ring gap median ' + R.seam.ring_gap_m.median + ' m / max ' + R.seam.ring_gap_m.max + ' m; normal mismatch median ' + R.seam.normal_mismatch_deg.median + '°'];
console.log(JSON.stringify(R, null, 1)); if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(R, null, 1));
