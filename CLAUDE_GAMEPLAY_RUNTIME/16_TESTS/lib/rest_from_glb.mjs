/* MAHWORLD :: the rest skeleton, read from the delivered GLB instead of typed into a test.
   A hand-written fixture is how a whole fork ended up posing a mirrored character: the shipped rig puts `_L` bones at model
   −x and the face at model +z (the runtime then turns the whole body 180° about Y, which moves the character but mirrors
   nothing). Tests that need bone positions take them from the asset, so the convention can only ever be wrong in one place.
   Returns metres: the glTF node translations scaled by the manifest's scale_to_metres. */
import fs from 'node:fs'; import path from 'node:path';

export function restFromGlb(file) {
  var glb = fs.readFileSync(file);
  if (glb.readUInt32LE(0) !== 0x46546C67) throw new Error('not a GLB: ' + file);
  var jl = glb.readUInt32LE(12), j = JSON.parse(glb.slice(20, 20 + jl).toString('utf8'));
  var mfPath = path.join(path.dirname(file), 'manifest.json');
  var mf = fs.existsSync(mfPath) ? JSON.parse(fs.readFileSync(mfPath, 'utf8')) : {};
  var scale = mf.scale_to_metres || 1;
  var bones = {}, parent = {}, world = {};
  var skin = j.skins[0];
  j.nodes.forEach(function (n, ni) { (n.children || []).forEach(function (c) { parent[c] = ni; }); });
  skin.joints.forEach(function (ni) {
    var n = j.nodes[ni], t = n.translation || [0, 0, 0];
    bones[n.name] = [t[0] * scale, t[1] * scale, t[2] * scale];
  });
  function worldOf(ni) {
    if (world[ni]) return world[ni];
    var n = j.nodes[ni], t = n.translation || [0, 0, 0];
    var p = parent[ni] !== undefined ? worldOf(parent[ni]) : [0, 0, 0];
    return (world[ni] = [p[0] + t[0] * scale, p[1] + t[1] * scale, p[2] + t[2] * scale]);
  }
  var worldByName = {}; skin.joints.forEach(function (ni) { worldByName[j.nodes[ni].name] = worldOf(ni); });
  var parentName = {}; skin.joints.forEach(function (ni) { var pn = parent[ni]; parentName[j.nodes[ni].name] = pn !== undefined && j.nodes[pn] ? j.nodes[pn].name : null; });
  var order0 = skin.joints.map(function (ni) { return j.nodes[ni].name; });
  /* parents before children (rig v5 appends LUMBAR / SPINE2 / SCAP / twist bones AFTER the joints they re-parent) */
  var order = [], seen = {}; function visit(n) { if (seen[n]) return; var par = parentName[n]; if (par && order0.indexOf(par) >= 0) visit(par); seen[n] = true; order.push(n); } order0.forEach(visit);
  return { bones: bones, world: worldByName, parent: parentName, order: order, scale: scale, manifest: mf, file: file, names: Object.keys(bones) };
}

/* the side convention, derived rather than assumed: which sign of x carries the `_L` bones, and which sign of z the face */
export function convention(rest) {
  var lx = rest.world.UPPERARM_L ? rest.world.UPPERARM_L[0] : 0;
  var fz = rest.world.BROW_L && rest.world.HEAD ? rest.world.BROW_L[2] - rest.world.HEAD[2] : 0;
  return { left_x_sign: lx < 0 ? -1 : 1, face_z_sign: fz < 0 ? -1 : 1, left_x: lx, face_z: fz };
}
