/* World pivot (2026-09-25) host-safety contract: every visual pivot addition stays presentation-only. The host owns walkable ground, the
   generated colliders and the HALO radial limit, and its own tests need the runtime bridge — so the pivot keeps its art where the host never
   reads it: on the exact collision surfaces, inside collider footprints, above head height, or beyond the host limits.
   node 16_TESTS/gameplay_world_pivot_host_safety.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { HALO_LAYOUT } from '../26_LOCAL_AUTHORITY/play/haloLayout.js';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function src(rel) { return fs.readFileSync(path.join(LA, rel), 'utf8'); }
var MACRO = src('lab/world/macro.js'), CITY = src('lab/cityScene.js'), ARCH = src('lab/world/architecture.js'), BODIES = src('lab/world/cloudBodies.js');
var R = JSON.parse(src('lab/assets/world/world_registry_v1.json'));

/* 1. owner OP10: the ridge INNER face is the shared visible/collision surface (VISIBLE_RIDGE_INNER_FACE proxies from ridgeLayout). Its rows
      are linear between the inner base and the crest and are never displaced; the rock displacement may only push OUTER rows into the body. */
var innerLerp = /var siA = \{ x: inA\.x \* 0\.54 \+ crestA\.x \* 0\.46/.test(MACRO) && /var uiA = \{ x: inA\.x \* 0\.24 \+ crestA\.x \* 0\.76/.test(MACRO);
var innerDisplaced = /\b(si|ui)[AB]\s*=\s*dsp\(/.test(MACRO);
var outerInward = (MACRO.match(/\b(so|uo)[AB]\s*=\s*dsp\(\s*(so|uo)[AB]\s*,\s*-ox\s*,\s*-oz/g) || []).length === 4;
ok('1. the ridge inner (collision) face rows stay on the proxy plane; only the outer rows are displaced, and only into the body', innerLerp && !innerDisplaced && outerInward, { innerLerp: innerLerp, innerDisplaced: innerDisplaced, outerInward: outerInward });

/* 2. HALO: the rim colonnade stands beyond the host playable radius and under the dome shell; the celestial rings are decorative, high above
      the deck; the deck keeps its single opaque owner. */
var rc = /var RC = HALO_LAYOUT\.playable_radius_m \+ ([0-9.]+)/.exec(CITY), off = rc ? +rc[1] : 0, RC = HALO_LAYOUT.playable_radius_m + off;
var ringsY = /rg\.position\.set\(s\.x, PH \+ ([0-9.]+), s\.z\)/.exec(CITY);
ok('2. HALO colonnade beyond the playable radius and inside the shell; celestial rings ≥ 60 m above the deck; single opaque deck owner kept', off > 0.5 && RC < HALO_LAYOUT.shell_radius_m && ringsY && +ringsY[1] >= 60 && /HALO_DECK_SINGLE_TOP/.test(CITY) && /full_area_opaque_owners: 1/.test(CITY) && /transparent_full_area_overlays: 0/.test(CITY), { playable: HALO_LAYOUT.playable_radius_m, colonnade_r: RC, shell: HALO_LAYOUT.shell_radius_m, rings_above_deck: ringsY && +ringsY[1] });

/* 3. no low / mid cloud body can rise through the HALO deck (the upper realm floor at the arrival height) */
var deckY = HALO_LAYOUT.arrival_height_m; var bodies = (R.sky.layers || []).filter(function (L) { return L.kind === 'CLOUD' && L.alt_m < deckY; });
ok('3. every cloud layer based below the HALO deck is capped under it (max_top_m) and the cluster builder enforces the cap', bodies.length > 0 && bodies.every(function (L) { return L.max_top_m > L.alt_m && L.max_top_m < deckY; }) && /if \(L\.max_top_m && cl\.y \+ cl\.extent > L\.max_top_m\) cl\.y = L\.max_top_m - cl\.extent;/.test(BODIES), bodies.map(function (L) { return [L.id, L.alt_m, L.max_top_m]; }));

/* 4. class-house dressing: the free-standing suspended pieces clear head height above the house ground (3.4 m) */
var houses = R.architecture.class_houses, terr = {}; ((R.terraces && R.terraces.list) || []).forEach(function (t) { terr[t.id] = t.h; });
var vis = houses.filter(function (H) { return H.supports && H.platform; })[0];
var coreClear = vis ? vis.platform.h - 1.05 - 2 * 1.9 : -1;   /* soffit − gap − the core's full height (octahedron scaled 1.9) */
var collarClear = /col\.translate\(sx, base \+ ([0-9.]+), sz\)/.exec(ARCH);
ok('4. the suspended amethyst core and the support collars clear 3.4 m above the class-house ground; the dressing is one guarded function', !!vis && coreClear >= 3.4 && collarClear && +collarClear[1] >= 3.4 && /function premiumHouse\(H, base, famId, glow\)/.test(ARCH), { house: vis && vis.id, core_lowest_above_ground_m: +coreClear.toFixed(2), collar_y: collarClear && +collarClear[1] });

/* 5. contact AO (PASS 6) is presentation only: flat decals a few cm above the local ground, no collider / walkable output, one draw call;
      the far silhouettes swap their baked night palette live (the in-game time toggle never rebuilds the field) */
var CAO = src('lab/world/contactAO.js'), WB = src('lab/world/worldB.js'), FAR = src('lab/farWorld.js'), FS = src('lab/fieldScene.js');
var lift = /y: groundYAt\(reg, x, z\) \+ ([0-9.]+)/.exec(CAO);
ok('5. contact AO decals sit ≤ 6 cm above the local ground with no collider output and one draw; the far world swaps day/night palettes live', lift && +lift[1] > 0 && +lift[1] <= 0.06 && !/collider|walkable\s*:/i.test(CAO.replace(/\/\*[\s\S]*?\*\//g, '')) && /info\.draw_calls = 1/.test(CAO) && /\['contactAO', createContactAO\]/.test(WB) && /group\.userData\.setNight = function/.test(FAR) && /fw\.userData\.setNight\(NIGHT\)/.test(FS), { lift_m: lift && +lift[1] });

/* 6. presentation integrity: the field owns ONE light rig. Every Directional / Hemisphere light is constructed inside buildLights() (which
      clears the previous rig first); a legacy `if (false) {…} else {…}` block used to stack a second daylight rig after it on every build. */
var b0 = FS.indexOf('function buildLights('), b1 = FS.indexOf('function setNight(', b0), inside = b0 >= 0 && b1 > b0 ? FS.slice(b0, b1) : '', outside = b0 >= 0 && b1 > b0 ? FS.slice(0, b0) + FS.slice(b1) : FS;
var rigIn = (inside.match(/new THREE\.(Directional|Hemisphere)Light\(/g) || []).length, rigOut = (outside.replace(/es\.add\(new THREE\.HemisphereLight\([^)]*\)\)/g, '').match(/new THREE\.(Directional|Hemisphere)Light\(/g) || []).length;   /* the offscreen room-environment PMREM scene (es) keeps its own light */
ok('6. the field builds exactly one light rig: every directional / hemisphere light lives in buildLights() (none outside it)', rigIn >= 4 && rigOut === 0 && /lights\.length = 0/.test(inside), { in_buildLights: rigIn, outside: rigOut });

/* 7. M8C construction language (cityScene premiumDress): every piece that stands proud of the collider face is ≥ 3.4 m above the ground —
      ground-tier piers start on the first-floor cornice (3.6 m), upper-tier piers on a tier ledge ≥ 3.4 m, the eave fascias, the louvred
      service bay and the entrance transom / canopy rods are gated on ≥ 3.4 m; facade fins stand on the straight runs only (never floating
      off the rounded corners). Checked against every authored building. */
var RULES = JSON.parse(src('play/rules1723/rules_17_23.dev.json')), blds = []; (function walk(o) { if (!o || typeof o !== 'object') return; if (o.building && !o.building.dome) blds.push(o); for (var k in o) walk(o[k]); })(RULES);
var minUpper = Math.min.apply(null, blds.map(function (b) { var t = Math.max(1, b.building.tiers || 1); return t > 1 ? b.h / t : 99; })), minDoor = Math.min.apply(null, blds.filter(function (b) { return b.building.entrance; }).map(function (b) { return b.building.entrance.height; }));
var cons = { piers: /pb = t3 \? y3 \+ 0\.08 : 3\.6/.test(CITY), eave: /if \(y3 \+ hEach - 0\.4 >= 3\.4\) chromeParts\.push/.test(CITY), louvre: /ly >= 3\.4 && ly \+ LH < yT \+ hEach - 0\.5/.test(CITY),
  transom: /cY = en\.height \+ 0\.35/.test(CITY) && /ty = cY \+ 0\.42/.test(CITY) && /cY \+ 0\.2, en\.z/.test(CITY) && minDoor + 0.35 + 0.2 >= 3.4, upperTiers: minUpper >= 3.4, fins: /var Lx = runOf\(f\.w, f\), Lz = runOf\(f\.d, f\)/.test(CITY) };
ok('7. M8C construction pieces (piers, eave fascias, service louvres, entrance transom and canopy rods) stay ≥ 3.4 m above the ground; fins stand on the straight wall runs', Object.keys(cons).every(function (k) { return cons[k]; }), Object.assign({ buildings: blds.length, min_upper_tier_base_m: minUpper, min_door_h_m: minDoor }, cons));

console.log('RESULT world pivot host safety: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
