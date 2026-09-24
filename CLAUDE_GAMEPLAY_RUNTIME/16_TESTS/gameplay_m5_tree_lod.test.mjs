/* M5 OP12: source-faithful tree tiers keep one class-colour material contract and do not recreate
   the runtime render-target impostor that caused black→colour pop and startup shader/render work. */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { selectForestLod } from '../26_LOCAL_AUTHORITY/lab/world/forest.js'; import { forestLayout } from '../26_LOCAL_AUTHORITY/lab/world/worldLayout.js';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var regPath = path.join(LA, 'lab', 'assets', 'world', 'world_registry_v1.json'), REG = JSON.parse(fs.readFileSync(regPath, 'utf8'));
var SRC = fs.readFileSync(path.join(LA, 'lab', 'world', 'forest.js'), 'utf8'), GEN = fs.readFileSync(path.join(LA, 'deploy', 'jobb', 'build_registry.mjs'), 'utf8');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail))); } }
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function glb(file) { var b = fs.readFileSync(file); if (b.readUInt32LE(0) !== 0x46546c67) throw new Error('not GLB: ' + file); var len = b.readUInt32LE(12), type = b.readUInt32LE(16); if (type !== 0x4e4f534a) throw new Error('first GLB chunk is not JSON'); var j = JSON.parse(b.subarray(20, 20 + len).toString('utf8').trim()); var tris = 0, verts = 0, attrs = new Set(); (j.meshes || []).forEach(function (m) { (m.primitives || []).forEach(function (p) { var pa = p.attributes || {}; Object.keys(pa).forEach(function (a) { attrs.add(a); }); if (pa.POSITION !== undefined) verts += j.accessors[pa.POSITION].count; if (p.indices !== undefined) tris += j.accessors[p.indices].count / 3; else if (pa.POSITION !== undefined) tris += j.accessors[pa.POSITION].count / 3; }); }); return { triangles: tris, vertices: verts, attrs: Array.from(attrs).sort() }; }

var art = REG.artifacts.find(function (a) { return a.id === 'FOREST_TREE_FAMILY'; }), der = REG.derivatives.find(function (d) { return d.id === art.derivative; });
ok('1. registry retires the runtime impostor and declares L0→L1 with one shared material/class-colour policy', art.lod.near === 'L0' && art.lod.far === 'L1' && art.lod.runtime_impostor === false && art.lod.material_policy === 'SHARED_TREE_LOCK_SHADER_AND_INSTANCE_COLOR' && !('mid' in art.lod), art.lod);
ok('2. the registry generator carries the same durable no-impostor policy', /far: 'L1'/.test(GEN) && /runtime_impostor: false/.test(GEN) && /SHARED_TREE_LOCK_SHADER_AND_INSTANCE_COLOR/.test(GEN) && !/far: 'IMPOSTOR'/.test(GEN));
ok('3. runtime has no render-target bake/billboard material and builds both bands with the one treeMat', !/WebGLRenderTarget|bakeImpostor|crossQuads|MAHWORLD_FOREST_IMPOSTOR|impMat/.test(SRC) && /newBand\(g0, treeMat/.test(SRC) && /newBand\(g1, treeMat/.test(SRC) && /same_material_all_tiers: true/.test(SRC));
ok('4. authored-zone chunks are bounded and frustum-cullable instead of one always-visible world-sized far batch', art.lod.chunking === 'AUTHORED_FOREST_ZONE' && /frustumCulled = true/.test(SRC) && /computeBoundingSphere\(\)/.test(SRC));

var n = art.lod.near_m, h = art.lod.hysteresis_m;
var seq = [selectForestLod((n + 5) ** 2, -1, n, h), selectForestLod((n - 0.1) ** 2, 1, n, h), selectForestLod((n + h - 0.1) ** 2, 0, n, h), selectForestLod((n + h + 0.1) ** 2, 0, n, h), selectForestLod((n + 1) ** 2, 1, n, h)];
ok('5. LOD hysteresis enters near below 26 m, leaves only beyond 30 m, and does not chatter inside the gap', JSON.stringify(seq) === JSON.stringify([1, 0, 0, 1, 1]), seq);

var placed = forestLayout(REG, []), zones = Array.from(new Set(placed.map(function (t) { return t.zone; }))), families = Array.from(new Set(placed.map(function (t) { return REG.tree_lock.zone_family[t.zone]; })));
ok('6. every placed tree resolves to a bounded authored-zone chunk and all five class families are represented', placed.length > 100 && zones.length >= 5 && zones.length <= 10 && placed.every(function (t) { return !!REG.tree_lock.zone_family[t.zone]; }) && ['gold', 'blue', 'red', 'pink', 'purple'].every(function (f) { return families.indexOf(f) >= 0; }), { trees: placed.length, zones: zones, families: families });

var levels = ['L0', 'L1'], facts = levels.map(function (lv) { var rec = der.files[lv], file = path.join(LA, rec.runtime), info = glb(file); return { level: lv, exists: fs.existsSync(file), sha: sha(file), registry: rec, info: info }; });
ok('7. both shipped tiers match their pinned source-faithful hashes/counts and preserve POSITION/NORMAL/TEXCOORD_0', facts.every(function (f) { return f.exists && f.sha === f.registry.sha256 && f.info.triangles === f.registry.triangles && f.info.vertices === f.registry.vertices && ['POSITION', 'NORMAL', 'TEXCOORD_0'].every(function (a) { return f.info.attrs.indexOf(a) >= 0; }); }), facts);
ok('8. only the two validated derivative tiers are runtime-authoritative; the torn legacy L2 remains unshipped', Object.keys(der.files).join(',') === 'L0,L1' && /topological borders locked/.test(der.method) && /source NORMAL\/TEXCOORD_0 preserved/.test(der.method), der);

console.log('RESULT M5 tree colour / LOD correction: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
