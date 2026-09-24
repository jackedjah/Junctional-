/* JOB A :: import-contract validator / drafter (node, no three.js): reads a GLB's node hierarchy, skins and morph targets, then either
   DRAFTS a record (--draft <out.json>, the semantic adapter's best guess — a human confirms every role) or VALIDATES a record
   (roles exist, chains descend in order, bind orientation identity vs oriented, morphs, emitter anchors, units / height).
     node deploy/joba/validate_import_contract.mjs <file.glb> --draft <out.json> [--character NAME]
     node deploy/joba/validate_import_contract.mjs <file.glb> <contract.json>            (exit 1 when invalid) */
import fs from 'node:fs'; import path from 'node:path';
import { draftContract, validateContract } from '../../lab/importContract.js';
var argv = process.argv.slice(2); var glbPath = argv[0]; if (!glbPath) { console.error('usage: validate_import_contract.mjs <glb> (--draft <out.json> | <contract.json>)'); process.exit(2); }
function readGlb(p) { var b = fs.readFileSync(p); var jl = b.readUInt32LE(12); var j = JSON.parse(b.slice(20, 20 + jl).toString('utf8')); return j; }
var j = readGlb(glbPath); var nodes = j.nodes || []; var parentOf = {}; nodes.forEach(function (n, i) { (n.children || []).forEach(function (c) { parentOf[c] = i; }); });
var jointSet = {}; (j.skins || []).forEach(function (s) { (s.joints || []).forEach(function (ji) { jointSet[ji] = true; }); });
var bones = nodes.map(function (n, i) { return { i: i, name: n.name || ('node' + i), parent: parentOf[i] !== undefined ? (nodes[parentOf[i]].name || ('node' + parentOf[i])) : null, rotation: n.rotation || null, joint: !!jointSet[i] }; }).filter(function (b) { return b.joint || Object.keys(jointSet).length === 0; });
var morphs = []; (j.meshes || []).forEach(function (m) { var names = m.extras && m.extras.targetNames; if (names) names.forEach(function (n) { if (morphs.indexOf(n) < 0) morphs.push(n); }); (m.primitives || []).forEach(function (p) { if (p.targets && !names) p.targets.forEach(function (t, k) { var nm = 'target' + k; if (morphs.indexOf(nm) < 0) morphs.push(nm); }); }); });
/* height from the POSITION accessor bounds of the first skinned primitive (metres if the asset is in metres) */
var height = null; try { var acc = j.accessors; (j.meshes || []).some(function (m) { return (m.primitives || []).some(function (p) { var a = acc[p.attributes.POSITION]; if (a && a.min && a.max) { height = +(a.max[1] - a.min[1]).toFixed(3); return true; } return false; }); }); } catch (e) { }
var skel = { bones: bones, morphs: morphs, height_m: height };
console.log('GLB ' + path.basename(glbPath) + ': ' + nodes.length + ' nodes, ' + bones.length + ' joints, ' + morphs.length + ' morph targets, mesh height ' + height);
var di = argv.indexOf('--draft');
if (di >= 0) { var out = argv[di + 1]; var ci = argv.indexOf('--character'); var d = draftContract(bones.map(function (b) { return b.name; }), { character: ci >= 0 ? argv[ci + 1] : path.basename(glbPath, '.glb'), source: path.basename(glbPath), height_m: height, morphs: morphs.length ? { list: morphs.slice(0, 12).join(', ') } : {} }); delete d.morphs.list;
  var v = validateContract(d, skel); d.validation_at_draft = { ok: v.ok, errors: v.errors, warnings: v.warnings, bind: v.bind }; d.bind = Object.keys(v.bind).some(function (r) { return /oriented/.test(v.bind[r]); }) ? 'oriented' : 'identity';
  fs.writeFileSync(out, JSON.stringify(d, null, 1)); console.log('draft written ' + out + ' — roles guessed ' + Object.keys(d.roles).length + ' / required ' + 14 + '; ' + (v.ok ? 'structurally valid' : 'INCOMPLETE: ' + v.errors.slice(0, 4).join(' | ')) + (v.warnings.length ? '; warnings: ' + v.warnings.slice(0, 3).join(' | ') : '')); process.exit(0); }
var cp = argv[1]; if (!cp) { console.error('contract path or --draft required'); process.exit(2); } var contract = JSON.parse(fs.readFileSync(cp, 'utf8')); var r = validateContract(contract, skel);
console.log((r.ok ? 'VALID' : 'INVALID') + ' — ' + contract.character + ' (' + Object.keys(r.roles).length + ' roles mapped; chains ' + Object.keys(r.chains).map(function (k) { return k + ':' + (r.chains[k].ordered ? 'ok' : 'BROKEN'); }).join(' ') + ')');
r.errors.forEach(function (e) { console.log('  ERROR ' + e); }); r.warnings.forEach(function (w) { console.log('  warn  ' + w); });
process.exit(r.ok ? 0 : 1);
