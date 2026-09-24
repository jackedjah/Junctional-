/* OWNER HOTFIX 2026-09-19 §2 — SEAM audit: the upper body is a quilt of patches whose boundary vertices COINCIDE but are separate vertices
   (mesh_components.mjs). If two coincident copies carry DIFFERENT skin weights they must separate under any rotation of those joints — a gap
   the eye reads as a tear. This measures, per coincident group, the largest weight difference between its copies, and where those groups sit.
   node deploy/mesh_seams.mjs [glb] */
import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { readGlb } from './glb_read.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var file = process.argv[2] || path.join(HERE, '..', 'lab', 'assets', 'athlete_m_preview', 'dev_0.16', 'Mah_Athlete_M_am08_v8.glb');
var G = readGlb(file); var J = G.json; var skin = J.skins[0]; var jointNames = skin.joints.map(function (n) { return J.nodes[n].name; });
function nodeWorld(ni) { var p = [0, 0, 0]; var n = ni; while (n !== undefined) { var t = J.nodes[n].translation || [0, 0, 0]; p[0] += t[0]; p[1] += t[1]; p[2] += t[2]; var par = undefined; for (var i = 0; i < J.nodes.length; i++) if (J.nodes[i].children && J.nodes[i].children.indexOf(n) >= 0) { par = i; break; } n = par; } return p; }
var JI = {}; jointNames.forEach(function (n, i) { JI[n] = i; }); var GH = { L: nodeWorld(skin.joints[JI.UPPERARM_L]), R: nodeWorld(skin.joints[JI.UPPERARM_R]) };
J.meshes.forEach(function (m) { m.primitives.forEach(function (pr) { if (!(pr.extras && pr.extras.role === 'upper')) return;
  var pos = G.acc(pr.attributes.POSITION).data, idx = G.acc(pr.indices).data, n = pos.length / 3; var jn = G.acc(pr.attributes.JOINTS_0).data, wt = G.acc(pr.attributes.WEIGHTS_0).data;
  var used = new Uint8Array(n); for (var t = 0; t < idx.length; t++) used[idx[t]] = 1;
  function W(i) { var o = {}; for (var k = 0; k < 4; k++) { var w = wt[i * 4 + k]; if (w > 1e-6) o[jn[i * 4 + k]] = (o[jn[i * 4 + k]] || 0) + w; } return o; }
  var byPos = {}; for (var i = 0; i < n; i++) { if (!used[i]) continue; var key = pos[i * 3].toFixed(4) + ',' + pos[i * 3 + 1].toFixed(4) + ',' + pos[i * 3 + 2].toFixed(4); (byPos[key] || (byPos[key] = [])).push(i); }
  var groups = 0, differing = 0, hist = { '0.05': 0, '0.15': 0, '0.30': 0, '0.50': 0 }, nearShoulder = 0, nearShoulderDiff = 0, worst = [];
  Object.keys(byPos).forEach(function (k) { var vs = byPos[k]; if (vs.length < 2) return; groups++; var maxD = 0, pair = null; for (var a = 0; a < vs.length; a++) for (var b = a + 1; b < vs.length; b++) { var wa = W(vs[a]), wb = W(vs[b]); var keys = Object.keys(wa).concat(Object.keys(wb)); var d = 0; keys.forEach(function (j) { d = Math.max(d, Math.abs((wa[j] || 0) - (wb[j] || 0))); }); if (d > maxD) { maxD = d; pair = [vs[a], vs[b]]; } }
    var x = pos[vs[0] * 3], y = pos[vs[0] * 3 + 1], z = pos[vs[0] * 3 + 2]; var dS = Math.min(Math.hypot(x - GH.L[0], y - GH.L[1], z - GH.L[2]), Math.hypot(x - GH.R[0], y - GH.R[1], z - GH.R[2])); if (dS < 0.12) nearShoulder++;
    if (maxD > 0.05) { differing++; if (dS < 0.12) nearShoulderDiff++; if (maxD > 0.5) hist['0.50']++; else if (maxD > 0.3) hist['0.30']++; else if (maxD > 0.15) hist['0.15']++; else hist['0.05']++; worst.push({ d: +maxD.toFixed(3), at: [+x.toFixed(3), +y.toFixed(3), +z.toFixed(3)], dShoulder: +dS.toFixed(3), a: W(pair[0]), b: W(pair[1]) }); } });
  worst.sort(function (a, b) { return b.d - a.d; });
  function named(w) { return Object.keys(w).map(function (j) { return jointNames[j] + ':' + w[j].toFixed(2); }).join(' '); }
  console.log(path.basename(file) + ' upper: ' + groups + ' coincident-position groups (unwelded seam vertices); ' + differing + ' groups whose copies carry DIFFERENT weights (> 0.05): >0.05 ' + hist['0.05'] + ', >0.15 ' + hist['0.15'] + ', >0.30 ' + hist['0.30'] + ', >0.50 ' + hist['0.50'] + '; within 12 cm (source units) of a glenohumeral centre: ' + nearShoulder + ' groups, ' + nearShoulderDiff + ' differing');
  worst.slice(0, 8).forEach(function (w) { console.log('   Δw ' + w.d + ' at ' + JSON.stringify(w.at) + ' (' + w.dShoulder + ' from the shoulder): ' + named(w.a) + '  |  ' + named(w.b)); });
}); });
