/* World pivot (owner law 2026-09-25): the ONLY expressive world colours are the five class identities — ATHLETE gold, TITAN blue, LEAN
   red/crimson, VISIONARY purple/violet, BAGE pink — over neutral support (platinum, silver, graphite, steel, black, neutral glass, dark stone,
   white light). Scans every colour literal in the world-art sources and the world registry.  node 16_TESTS/gameplay_world_colour_law.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { auditColourLaw, classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
ok('1. the classifier accepts the five class families and neutral support, and rejects teal/cyan, green and orange', classify(0xe6c36a).family === 'GOLD' && classify(0x2a5be0).family === 'BLUE' && classify(0xd4344a).family === 'RED' && classify(0x8f6ad8).family === 'PURPLE' && classify(0xf08ab8).family === 'PINK' && classify(0xdfe6ee).verdict === 'NEUTRAL' && classify(0x151a21).verdict === 'NEUTRAL' && classify(0x4fd8ff).verdict === 'VIOLATION' && classify(0x5fd39a).verdict === 'VIOLATION' && classify(0xff8a2a).verdict === 'VIOLATION');
var A = auditColourLaw();
ok('2. no expressive off-law colour literal remains in the world-art sources or the registry (' + A.files + ' files scanned)', A.rows.length === 0, A.rows.slice(0, 12));
var R = JSON.parse(fs.readFileSync(path.join(LA, 'lab', 'assets', 'world', 'world_registry_v1.json'), 'utf8'));
var fams = Object.keys(R.crystal_families).filter(function (k) { return k[0] !== '_'; }).sort();
ok('3. the registry crystal families are exactly the five class colours plus neutral platinum', fams.join('|') === 'blue|gold|pink|platinum|purple|red', fams);
function families(o, out) { if (Array.isArray(o)) o.forEach(function (x) { families(x, out); }); else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (k === 'family' && typeof o[k] === 'string') out.add(o[k]); else families(o[k], out); }); return out; }
var MATERIAL = Object.keys(R.material_families || {}).concat(['source']);   /* 'source' = preserve the original asset albedo (Dogkie look), not a colour */ var used = [...families(R, new Set())].filter(function (f) { return MATERIAL.indexOf(f) < 0; }).sort();   /* material-family names (civic, gym, …) are audited through their colour literals in check 2 */
ok('4. every colour family referenced anywhere in the registry is one of the five class colours or platinum', used.length >= 5 && used.every(function (f) { return ['gold', 'blue', 'red', 'purple', 'pink', 'platinum'].indexOf(f) >= 0; }), { used: used, material_families: MATERIAL });
console.log('RESULT world colour law: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
