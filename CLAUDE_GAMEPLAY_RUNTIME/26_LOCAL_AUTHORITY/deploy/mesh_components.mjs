/* OWNER HOTFIX 2026-09-19 §2 — TOPOLOGY audit of the Athlete derivative: connected components of every primitive (by shared vertex index), each
   component's size, bounding box and its dominant skin joints. A body built from SEPARATE overlapping shells (muscle volumes) opens gaps between
   the shells when neighbouring joints rotate — a cause no weight smoothing can remove (the same class of cause as the hip's pelvis shell).
   node deploy/mesh_components.mjs [glb] */
import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { readGlb } from './glb_read.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var file = process.argv[2] || path.join(HERE, '..', 'lab', 'assets', 'athlete_m_preview', 'dev_0.16', 'Mah_Athlete_M_am08_v8.glb');
var G = readGlb(file); var J = G.json; var skin = J.skins[0]; var jointNames = skin.joints.map(function (n) { return J.nodes[n].name; });
J.meshes.forEach(function (m) { m.primitives.forEach(function (pr, pi) {
  var pos = G.acc(pr.attributes.POSITION).data, idx = G.acc(pr.indices).data, n = pos.length / 3; var jn = pr.attributes.JOINTS_0 !== undefined ? G.acc(pr.attributes.JOINTS_0).data : null, wt = pr.attributes.WEIGHTS_0 !== undefined ? G.acc(pr.attributes.WEIGHTS_0).data : null;
  /* union-find over triangle edges */ var parent = new Int32Array(n); for (var i = 0; i < n; i++) parent[i] = i; function find(a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; } function uni(a, b) { a = find(a); b = find(b); if (a !== b) parent[a] = b; }
  for (var t = 0; t < idx.length; t += 3) { uni(idx[t], idx[t + 1]); uni(idx[t + 1], idx[t + 2]); }
  var used = new Uint8Array(n); for (t = 0; t < idx.length; t++) used[idx[t]] = 1;
  var comps = {}; for (i = 0; i < n; i++) { if (!used[i]) continue; var r = find(i); var c = comps[r] || (comps[r] = { verts: 0, min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9], joints: {} }); c.verts++; for (var k = 0; k < 3; k++) { c.min[k] = Math.min(c.min[k], pos[i * 3 + k]); c.max[k] = Math.max(c.max[k], pos[i * 3 + k]); } if (jn && wt) { var best = 0, bw = -1; for (k = 0; k < 4; k++) if (wt[i * 4 + k] > bw) { bw = wt[i * 4 + k]; best = jn[i * 4 + k]; } var nm = jointNames[best] || ('j' + best); c.joints[nm] = (c.joints[nm] || 0) + 1; } }
  var list = Object.keys(comps).map(function (k) { return comps[k]; }).sort(function (a, b) { return b.verts - a.verts; });
  /* welded-ness: how many vertex POSITIONS are shared by ≥ 2 vertices of DIFFERENT components (an unwelded seam) vs inside one component */
  var byPos = {}; for (i = 0; i < n; i++) { if (!used[i]) continue; var key = pos[i * 3].toFixed(4) + ',' + pos[i * 3 + 1].toFixed(4) + ',' + pos[i * 3 + 2].toFixed(4); (byPos[key] || (byPos[key] = [])).push(i); }
  var seamCross = 0, seamSame = 0; Object.keys(byPos).forEach(function (k) { var vs = byPos[k]; if (vs.length < 2) return; var roots = {}; vs.forEach(function (v) { roots[find(v)] = 1; }); if (Object.keys(roots).length > 1) seamCross++; else seamSame++; });
  console.log(m.name + (m.primitives.length > 1 ? ' [' + pi + ']' : '') + ' role=' + (pr.extras && pr.extras.role) + ': ' + n + ' verts, ' + (idx.length / 3) + ' tris, ' + list.length + ' connected components; coincident positions across components ' + seamCross + ', within one component ' + seamSame);
  list.slice(0, 40).forEach(function (c, ci) { var tj = Object.keys(c.joints).sort(function (a, b) { return c.joints[b] - c.joints[a]; }).slice(0, 3).map(function (k) { return k + ' ' + c.joints[k]; }).join(', '); console.log('   #' + ci + ' verts ' + c.verts + ' box y ' + c.min[1].toFixed(3) + '..' + c.max[1].toFixed(3) + ' x ' + c.min[0].toFixed(3) + '..' + c.max[0].toFixed(3) + ' z ' + c.min[2].toFixed(3) + '..' + c.max[2].toFixed(3) + ' → ' + tj); });
  if (list.length > 40) console.log('   … ' + (list.length - 40) + ' more components');
}); });
