/* MAHWORLD :: DISTRICT COLLIDER SYNC — the authority's world layout must be the SAME proxies the client renders against.
   deploy/build_district.mjs writes play/rules1723/district_v1_colliders.json (fitted boxes + deck slabs from the runtime derivatives) and the
   manifest lab/assets/buildings/district_v1.json (envelopes, heights, landing levels). The HOST reads its layout from
   play/rules1723/rules_17_23.dev.json → _runtime_mapping.field_colliders_district_v1 (base plaza shapes + district shapes + landmarks).
   The owner round (0.67× landmarks) regenerated the JSON but not the mapping: the host still collided against the S11 full-size proxies
   (2 356 shapes, gym envelope 71.5 × 72 m) while the visuals were 0.67× (47.9 × 48.2 m) — invisible walls, perches in mid-air.
   This script splices the district shapes and the landmark envelopes into the mapping textually (the rest of the rules file stays byte-identical).
   node deploy/sync_district_colliders.mjs [--check]   (--check: exit 1 when the mapping differs from the JSON, write nothing) */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.join(HERE, '..'); var CHECK = process.argv.indexOf('--check') >= 0;
var RULES = path.join(LA, 'play', 'rules1723', 'rules_17_23.dev.json'); var COLJ = path.join(LA, 'play', 'rules1723', 'district_v1_colliders.json'); var MANP = path.join(LA, 'lab', 'assets', 'buildings', 'district_v1.json');
var raw = fs.readFileSync(RULES, 'utf8'); var rules = JSON.parse(raw); var col = JSON.parse(fs.readFileSync(COLJ, 'utf8')); var man = JSON.parse(fs.readFileSync(MANP, 'utf8'));
var L = rules._runtime_mapping.field_colliders_district_v1; if (!L) { console.error('no field_colliders_district_v1 mapping'); process.exit(2); }
var base = L.shapes.filter(function (s) { return !s.district && !s.world; }); var district = col.shapes; var world = L.shapes.filter(function (s) { return s.world; });   /* JOB B world shapes (deploy/jobb/build_world_colliders.mjs) ride after the district shapes and are kept as they are */
var wantShapes = base.concat(district, world);
var NAMES = { temple: 'Gold Temple', gym: 'MAH GYM', tower: 'Blue Tower', market: 'MAH MARKET' };
var wantLandmarks = man.buildings.filter(function (b) { return b.enabled !== false && b.envelope_m; }).map(function (b) { var old = (L.landmarks || []).filter(function (l) { return l.id === 'LM_' + b.id.toUpperCase(); })[0] || {}; return { id: 'LM_' + b.id.toUpperCase(), kind: 'DISTRICT_BUILDING', name: old.name || NAMES[b.id] || b.label, x: b.position[0], z: b.position[2], envelope: b.envelope_m, height_m: b.target_height_m, highest_usable_landing_m: b.highest_usable_landing_m }; });
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
var shapesSame = same(L.shapes, wantShapes), lmSame = same(L.landmarks, wantLandmarks);
console.log('mapping shapes ' + L.shapes.length + ' (district ' + (L.shapes.length - base.length - world.length) + ', world ' + world.length + ') vs json district ' + district.length + ' → ' + (shapesSame ? 'IN SYNC' : 'DIFFERENT') + '; landmarks ' + (lmSame ? 'IN SYNC' : 'DIFFERENT'));
if (shapesSame && lmSame) { console.log('nothing to do'); process.exit(0); }
if (CHECK) { console.error('district colliders OUT OF SYNC — run node deploy/sync_district_colliders.mjs'); process.exit(1); }
/* textual splice: find the mapping object, then its "shapes" / "landmarks" arrays (bracket matching that skips strings) */
function findKey(text, key, from) { var i = text.indexOf('"' + key + '"', from); if (i < 0) throw new Error('key not found: ' + key); return i; }
function arrayBounds(text, keyIdx) { var i = text.indexOf('[', keyIdx); var depth = 0, inStr = false; for (var k = i; k < text.length; k++) { var c = text[k]; if (inStr) { if (c === '\\') k++; else if (c === '"') inStr = false; continue; } if (c === '"') inStr = true; else if (c === '[') depth++; else if (c === ']') { depth--; if (depth === 0) return [i, k + 1]; } } throw new Error('unbalanced array'); }
var eol = raw.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
function indentOf(text, idx) { var ls = text.lastIndexOf('\n', idx) + 1; var m = /^[ \t]*/.exec(text.slice(ls, idx)); return m ? m[0] : ''; }
function ser(arr, baseIndent) { var s = JSON.stringify(arr, null, 1); return s.split('\n').map(function (l, i) { return i === 0 ? l : baseIndent + l; }).join(eol); }
var mapIdx = findKey(raw, 'field_colliders_district_v1', 0); var out = raw;
[['landmarks', wantLandmarks], ['shapes', wantShapes]].forEach(function (pair) { var kIdx = findKey(out, pair[0], mapIdx); var b = arrayBounds(out, kIdx); var ind = indentOf(out, kIdx); out = out.slice(0, b[0]) + ser(pair[1], ind) + out.slice(b[1]); });
var check = JSON.parse(out); var L2 = check._runtime_mapping.field_colliders_district_v1; if (!same(L2.shapes, wantShapes) || !same(L2.landmarks, wantLandmarks)) { console.error('splice verification failed'); process.exit(2); }
/* everything else must be untouched */
delete check._runtime_mapping.field_colliders_district_v1; var before = JSON.parse(raw); delete before._runtime_mapping.field_colliders_district_v1; if (!same(check, before)) { console.error('unexpected change outside the mapping'); process.exit(2); }
fs.writeFileSync(RULES, out); console.log('rules mapping updated: ' + wantShapes.length + ' shapes (' + base.length + ' base + ' + district.length + ' district + ' + world.length + ' world), ' + wantLandmarks.length + ' landmarks → ' + path.relative(LA, RULES));
