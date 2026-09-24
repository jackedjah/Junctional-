/* MAHWORLD JOB B :: CREATURE RIG TOOLS (owner redirect 2026-09-19 — the GLB_NEW3 species: fish / horse / golden phoenix).
   The Tripo exports carry a skin whose JOINT NODES have NO translation or rotation (every bone sits at the armature origin) while the
   inverse bind matrices carry the real bind pose. three.js skins with boneWorld × boneInverse, so such a rig renders TORN at rest and
   any bone rotation pivots around the model origin. rebaseFromBind() writes the bind pose back into the node transforms
   (local = parentWorld⁻¹ · boneInverse⁻¹) so the skin is the identity at rest and every joint pivots at its real position — the
   heuristic rig the redirect asks for (no Blender: BLENDER SLOT RESERVED; runtime data only, the source GLB is never modified).
   Shared helpers: bind positions, per-bone axis specs expressed in the parent's rest frame (rest-pose conjugation: deltas about the
   creature's own lateral / vertical / forward axes, whatever the rig's local axes are), and the three species classifiers
   (fish spine chain + fins · bird wings / tail / crest / head · quadruped legs / spine / neck) that read GEOMETRY, never bone names
   (the names are bone_N). Everything logs what it found; nothing is assumed. */

/* 1. bind pose → node transforms (once per source scene; idempotent) */
export function rebaseFromBind(THREE, root) {
  var done = 0, meshes = 0, skipped = 0; root.updateMatrixWorld(true);
  var bind = new THREE.Matrix4(), pinv = new THREE.Matrix4();
  root.traverse(function (o) { if (!o.isSkinnedMesh || !o.skeleton) return; meshes++; var sk = o.skeleton; if (sk.userData && sk.userData.rebased) { skipped++; return; }
    var zero = true; for (var i = 0; i < sk.bones.length; i++) { if (sk.bones[i].position.lengthSq() > 1e-10) { zero = false; break; } }
    if (!zero) { skipped++; return; }   /* a rig with real node transforms (Dogkie, the guides) is left alone */
    var order = []; root.traverse(function (b) { if (b.isBone && sk.bones.indexOf(b) >= 0) order.push(b); });   /* parents before children (pre-order) */
    for (var k = 0; k < order.length; k++) { var b = order[k]; var idx = sk.bones.indexOf(b); bind.copy(sk.boneInverses[idx]).invert(); if (b.parent) { pinv.copy(b.parent.matrixWorld).invert(); b.matrix.multiplyMatrices(pinv, bind); } else b.matrix.copy(bind); b.matrix.decompose(b.position, b.quaternion, b.scale); b.matrixWorld.multiplyMatrices(b.parent ? b.parent.matrixWorld : b.matrix, b.matrix); if (!b.parent) b.matrixWorld.copy(b.matrix); }
    sk.userData = sk.userData || {}; sk.userData.rebased = true; done++; });
  root.updateMatrixWorld(true); return { rebased: done, skinned_meshes: meshes, untouched: skipped };
}

/* 2. bone bind positions in the root's frame (after rebaseFromBind the node world positions are the bind positions; before it,
   the inverted boneInverses are) */
export function bonePositions(THREE, root) {
  var bones = []; root.traverse(function (o) { if (o.isBone) bones.push(o); }); root.updateMatrixWorld(true);
  var sk = null; root.traverse(function (o) { if (!sk && o.isSkinnedMesh && o.skeleton) sk = o.skeleton; });
  var m = new THREE.Matrix4(); var out = bones.map(function (b) { var idx = sk ? sk.bones.indexOf(b) : -1; if (idx >= 0 && b.position.lengthSq() < 1e-10 && (!sk.userData || !sk.userData.rebased)) { m.copy(sk.boneInverses[idx]).invert(); return new THREE.Vector3().setFromMatrixPosition(m); } return b.getWorldPosition(new THREE.Vector3()); });
  return { bones: bones, pos: out, skeleton: sk };
}
export function boneKids(b) { return b.children.filter(function (c) { return c.isBone; }); }
export function depthOf(b) { var d = 0; while (b.parent && b.parent.isBone) { b = b.parent; d++; } return d; }
/* the longest descending chain that starts at `from` (by bone count, ties → the longer in metres) */
export function longestChain(from, P) { var best = [from]; (function walk(b, path) { if (path.length > best.length) best = path.slice(); boneKids(b).forEach(function (c) { path.push(c); walk(c, path); path.pop(); }); })(from, [from]); return best; }
/* per-bone spec: rest quaternion + the creature's axes expressed in the parent's REST frame — a delta about them is one premultiply */
export function makeSpec(THREE, b, axes) { if (!b) return null; var tq = new THREE.Quaternion(); if (b.parent) b.parent.getWorldQuaternion(tq); else tq.identity(); tq.invert(); return { bone: b, name: b.name, rest: b.quaternion.clone(), axP: axes.lat.clone().applyQuaternion(tq).normalize(), axY: axes.up.clone().applyQuaternion(tq).normalize(), axR: axes.fwd.clone().applyQuaternion(tq).normalize() }; }
export function makePoser(THREE) { var QA = new THREE.Quaternion(), QB = new THREE.Quaternion(); return function setBone(bone, spec, pitch, yaw, roll) { if (!spec || !bone) return; QA.setFromAxisAngle(spec.axP, pitch || 0); if (yaw) { QB.setFromAxisAngle(spec.axY, yaw); QA.multiply(QB); } if (roll) { QB.setFromAxisAngle(spec.axR, roll); QA.multiply(QB); } bone.quaternion.multiplyQuaternions(QA, spec.rest); }; }

function frameFrom(THREE, fwd) { var up = new THREE.Vector3(0, 1, 0); var f = fwd.clone(); f.y = 0; if (f.lengthSq() < 1e-8) f.set(0, 0, 1); f.normalize(); if (Math.abs(f.x) > Math.abs(f.z)) f.set(f.x < 0 ? -1 : 1, 0, 0); else f.set(0, 0, f.z > 0 ? 1 : -1); return { fwd: f, up: up, lat: new THREE.Vector3().crossVectors(up, f).normalize(), fix: Math.atan2(f.x, -f.z) }; }   /* fix = the inner yaw that turns the model's forward onto the client's −Z */

/* 3a. FISH: the spine = the longest chain from the root; head = the chain's start end (it sits toward the mesh's long-axis extreme
   that the chain moves AWAY from); fins = the other leaf chains (mirrored pairs by lateral sign) */
export function classifyFish(THREE, root, log) {
  var BP = bonePositions(THREE, root); var bones = BP.bones, P = BP.pos; if (!bones.length) return null;
  var roots = bones.filter(function (b) { return !(b.parent && b.parent.isBone); }); var top = roots[0];
  var chain = longestChain(top, P); var pidx = function (b) { return P[bones.indexOf(b)]; };
  /* drop the leading zero-length / origin bones so the chain starts at the first bone that has an offset */
  while (chain.length > 3 && pidx(chain[0]).distanceTo(pidx(chain[1])) < 1e-3) chain.shift();
  var a = pidx(chain[0]), z = pidx(chain[chain.length - 1]); var dir = z.clone().sub(a); dir.y = 0; var F = frameFrom(THREE, dir.clone().negate());   /* the chain runs head → tail, so forward = −chain */
  var spineSet = {}; chain.forEach(function (b) { spineSet[b.uuid] = true; });
  var fins = []; bones.forEach(function (b) { if (spineSet[b.uuid]) return; if (b.parent && b.parent.isBone && spineSet[b.parent.uuid]) { var ch = longestChain(b, P); var e = pidx(ch[ch.length - 1]); var side = (e.x * F.lat.x + e.z * F.lat.z) > 0 ? 'L' : 'R'; fins.push({ side: side, chain: ch, y: e.y }); } });
  var axes = { lat: F.lat, up: F.up, fwd: F.fwd };
  var box = new THREE.Box3(); root.traverse(function (o) { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } }); var size = box.getSize(new THREE.Vector3());
  var spec = { kind: 'FISH', axes: axes, fix: F.fix, forward_model: F.fwd.x ? (F.fwd.x > 0 ? '+x' : '-x') : (F.fwd.z > 0 ? '+z' : '-z'), box: box, length: Math.max(size.x, size.z), height: size.y,
    spine: chain.map(function (b) { return makeSpec(THREE, b, axes); }), fins: fins.map(function (f) { return { side: f.side, specs: f.chain.map(function (b) { return makeSpec(THREE, b, axes); }) }; }), bones: bones };
  spec.report = { kind: 'FISH', bones: bones.length, spine: chain.map(function (b) { return b.name; }), fins: fins.map(function (f) { return f.side + ':' + f.chain.map(function (b) { return b.name; }).join('>'); }), forward: spec.forward_model, fix_deg: Math.round(F.fix * 180 / Math.PI), length_m: +spec.length.toFixed(3) };
  if (log) log('creatureRig FISH: spine [' + spec.report.spine.join(',') + '] fins ' + spec.report.fins.join(' ') + ' forward ' + spec.forward_model + ' (fix ' + spec.report.fix_deg + '°)');
  return spec;
}

/* 3b. BIRD (phoenix): forward = root → the highest bone; wings = lateral chains ABOVE the body centre (one per side, ordered by
   lateral reach), tail = lateral / rear chains BELOW the centre, crest / head = the chain toward the top-front */
export function classifyBird(THREE, root, log) {
  var BP = bonePositions(THREE, root); var bones = BP.bones, P = BP.pos; if (!bones.length) return null; var pidx = function (b) { return P[bones.indexOf(b)]; };
  var box = new THREE.Box3(); root.traverse(function (o) { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } }); var size = box.getSize(new THREE.Vector3()); var cy = (box.min.y + box.max.y) / 2;
  var roots = bones.filter(function (b) { return !(b.parent && b.parent.isBone); }); var top = roots[0]; var rootP = pidx(top);
  var hi = null, hy = -1e9; bones.forEach(function (b) { var p = pidx(b); if (p.y > hy) { hy = p.y; hi = b; } });
  var fwdV = pidx(hi).clone().sub(rootP); var F = frameFrom(THREE, fwdV); var axes = { lat: F.lat, up: F.up, fwd: F.fwd };
  var lat = function (p) { return p.x * F.lat.x + p.z * F.lat.z; }, fw = function (p) { return p.x * F.fwd.x + p.z * F.fwd.z; };
  var span = Math.max(size.x, size.z) / 2; var groups = { wingL: [], wingR: [], tailL: [], tailR: [], axial: [] };
  bones.forEach(function (b) { var p = pidx(b); var l = lat(p); if (Math.abs(l) < span * 0.12) { groups.axial.push(b); return; } var wing = p.y >= cy - 0.02 * size.y; var key = (wing ? 'wing' : 'tail') + (l > 0 ? 'L' : 'R'); groups[key].push(b); });
  var order = function (list) { return list.slice().sort(function (a, b) { return Math.abs(lat(pidx(a))) - Math.abs(lat(pidx(b))); }); };
  var axial = groups.axial.slice().sort(function (a, b) { return fw(pidx(a)) - fw(pidx(b)); }); var head = axial.length ? axial[axial.length - 1] : null; var neck = axial.length > 2 ? axial[axial.length - 2] : null;
  var crest = axial.filter(function (b) { return pidx(b).y > cy + 0.25 * size.y; });
  var spec = { kind: 'BIRD', axes: axes, fix: F.fix, forward_model: F.fwd.x ? (F.fwd.x > 0 ? '+x' : '-x') : (F.fwd.z > 0 ? '+z' : '-z'), box: box, length: Math.max(size.x, size.z), height: size.y, bones: bones,
    wingL: order(groups.wingL).map(function (b) { return makeSpec(THREE, b, axes); }), wingR: order(groups.wingR).map(function (b) { return makeSpec(THREE, b, axes); }), tailL: order(groups.tailL).map(function (b) { return makeSpec(THREE, b, axes); }), tailR: order(groups.tailR).map(function (b) { return makeSpec(THREE, b, axes); }),
    head: makeSpec(THREE, head, axes), neck: makeSpec(THREE, neck, axes), crest: crest.map(function (b) { return makeSpec(THREE, b, axes); }) };
  spec.report = { kind: 'BIRD', bones: bones.length, forward: spec.forward_model, fix_deg: Math.round(F.fix * 180 / Math.PI), wingL: spec.wingL.map(function (s) { return s.name; }), wingR: spec.wingR.map(function (s) { return s.name; }), tailL: spec.tailL.map(function (s) { return s.name; }), tailR: spec.tailR.map(function (s) { return s.name; }), head: head ? head.name : null, neck: neck ? neck.name : null, crest: crest.map(function (b) { return b.name; }), span_m: +Math.max(size.x, size.z).toFixed(3) };
  if (log) log('creatureRig BIRD: wings L[' + spec.report.wingL.join(',') + '] R[' + spec.report.wingR.join(',') + '] tail L[' + spec.report.tailL.join(',') + '] R[' + spec.report.tailR.join(',') + '] head ' + spec.report.head + ' crest ' + spec.report.crest.length + ' forward ' + spec.forward_model);
  return spec;
}

/* 3c. QUADRUPED (horse): the spine = the longest chain from the root along the long axis; legs = chains hanging DOWN from the spine
   (leaf lower than 45 % of the height), front / back by their position along the forward axis, left / right by the lateral sign;
   the neck / head = the axial chain that rises at the front; the tail = the rear axial chain */
export function classifyQuadruped(THREE, root, log) {
  var BP = bonePositions(THREE, root); var bones = BP.bones, P = BP.pos; if (!bones.length) return null; var pidx = function (b) { return P[bones.indexOf(b)]; };
  var box = new THREE.Box3(); root.traverse(function (o) { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } }); var size = box.getSize(new THREE.Vector3()); var H = size.y;
  var roots = bones.filter(function (b) { return !(b.parent && b.parent.isBone); }); var top = roots[0];
  /* the long axis of the BONE cloud (the mesh box can disagree with a rotated bind space — the bones are what we pose) */
  var minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9; P.forEach(function (p) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
  var alongX = (maxX - minX) >= (maxZ - minZ); var high = null, hy = -1e9; bones.forEach(function (b) { var p = pidx(b); if (p.y > hy) { hy = p.y; high = b; } });
  /* the head end: the highest bone marks the withers / neck; the neck rises toward the head → forward = root → highest bone along the long axis */
  var rp = pidx(top); var hp = pidx(high); var fv = new THREE.Vector3(alongX ? hp.x - rp.x : 0, 0, alongX ? 0 : hp.z - rp.z); if (fv.lengthSq() < 1e-6) fv.set(alongX ? 1 : 0, 0, alongX ? 0 : 1); var F = frameFrom(THREE, fv); var axes = { lat: F.lat, up: F.up, fwd: F.fwd };
  var lat = function (p) { return p.x * F.lat.x + p.z * F.lat.z; }, fw = function (p) { return p.x * F.fwd.x + p.z * F.fwd.z; };
  var spine = longestChain(top, P).filter(function (b) { return Math.abs(lat(pidx(b))) < 0.12 * Math.max(size.x, size.z); });
  var spineSet = {}; spine.forEach(function (b) { spineSet[b.uuid] = true; });
  /* leg chains: every leaf whose position is low; walk up until a spine / axial parent */
  var legs = []; bones.forEach(function (leaf) { if (boneKids(leaf).length) return; var e = pidx(leaf); if (e.y > 0.55 * H) return; var ch = [leaf], b = leaf; while (b.parent && b.parent.isBone && !spineSet[b.parent.uuid] && Math.abs(lat(pidx(b.parent))) > 0.02 * H) { b = b.parent; ch.unshift(b); } if (ch.length < 2) return; legs.push({ chain: ch, end: e }); });
  var mid = (fw(pidx(spine[0])) + fw(pidx(spine[spine.length - 1]))) / 2; var L = {}; var dup = [];
  legs.sort(function (a, b) { return fw(b.end) - fw(a.end); }).forEach(function (l, i) { var key = (fw(l.end) > mid ? 'F' : 'B') + (lat(l.end) > 0 ? 'L' : 'R'); if (L[key]) { dup.push(key + ':' + l.chain[0].name); return; } L[key] = l; });
  var axial = bones.filter(function (b) { return !spineSet[b.uuid] && Math.abs(lat(pidx(b))) < 0.08 * Math.max(size.x, size.z) && !legs.some(function (l) { return l.chain.indexOf(b) >= 0; }); });
  var frontAx = axial.filter(function (b) { return fw(pidx(b)) > mid; }).sort(function (a, b) { return fw(pidx(b)) - fw(pidx(a)); }); var rearAx = axial.filter(function (b) { return fw(pidx(b)) < mid; }).sort(function (a, b) { return fw(pidx(a)) - fw(pidx(b)); });
  var head = frontAx[0] || spine[spine.length - 1], neck = frontAx[1] || null, tail = rearAx.slice(0, 3);
  var legSpec = function (l) { if (!l) return null; var ch = l.chain; return { top: makeSpec(THREE, ch[0], axes), mid: makeSpec(THREE, ch[Math.min(1, ch.length - 1)], axes), end: makeSpec(THREE, ch[ch.length - 1], axes), n: ch.length }; };
  var spec = { kind: 'QUADRUPED', axes: axes, fix: F.fix, forward_model: F.fwd.x ? (F.fwd.x > 0 ? '+x' : '-x') : (F.fwd.z > 0 ? '+z' : '-z'), box: box, length: Math.max(size.x, size.z), height: H, bones: bones,
    spine: spine.map(function (b) { return makeSpec(THREE, b, axes); }), head: makeSpec(THREE, head, axes), neck: makeSpec(THREE, neck, axes), tail: tail.map(function (b) { return makeSpec(THREE, b, axes); }), legs: { FL: legSpec(L.FL), FR: legSpec(L.FR), BL: legSpec(L.BL), BR: legSpec(L.BR) } };
  spec.report = { kind: 'QUADRUPED', bones: bones.length, forward: spec.forward_model, fix_deg: Math.round(F.fix * 180 / Math.PI), spine: spine.map(function (b) { return b.name; }), head: head ? head.name : null, neck: neck ? neck.name : null, tail: tail.map(function (b) { return b.name; }), legs: {}, missing: [], dup: dup, bone_extent: { x: +(maxX - minX).toFixed(3), z: +(maxZ - minZ).toFixed(3) }, mesh_size: [+size.x.toFixed(3), +size.y.toFixed(3), +size.z.toFixed(3)] };
  ['FL', 'FR', 'BL', 'BR'].forEach(function (k) { if (L[k]) spec.report.legs[k] = L[k].chain.map(function (b) { return b.name; }).join('>'); else spec.report.missing.push('leg ' + k); });
  if (log) log('creatureRig QUADRUPED: spine [' + spec.report.spine.join(',') + '] head ' + spec.report.head + ' neck ' + spec.report.neck + ' tail [' + spec.report.tail.join(',') + '] legs ' + JSON.stringify(spec.report.legs) + (spec.report.missing.length ? ' MISSING ' + spec.report.missing.join(', ') : '') + ' forward ' + spec.forward_model + ' bones x ' + spec.report.bone_extent.x + ' z ' + spec.report.bone_extent.z + ' mesh ' + spec.report.mesh_size.join('×'));
  return spec;
}
