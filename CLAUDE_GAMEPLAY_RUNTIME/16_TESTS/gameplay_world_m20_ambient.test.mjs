/* M20 AMBIENT MAGIC ECOLOGY (owner priority 7: "subtle, airy, elegant, softly alive, non-interactable … NOT random VFX spam"): motes, crystal
   pollen and night light-moths in the class groves and over the Veil lanes (lab/world/ambientMagic.js, one THREE.Points draw). The renders show
   the look; this test holds what they cannot: the tier budget (LOW builds nothing), the host law for every in-reach point against EVERY host
   collider (its floor ≥ 3.4 m above the highest thing under its whole motion footprint — a moth's loop reaching √2·r diagonally), and the
   colour law for every light tint.  node 16_TESTS/gameplay_world_m20_ambient.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
var M = await import('../26_LOCAL_AUTHORITY/lab/world/ambientMagic.js'), { forestLayout, groundYAt } = await import('../26_LOCAL_AUTHORITY/lab/world/worldLayout.js'), { combatZoneCircles } = await import('../26_LOCAL_AUTHORITY/lab/world/combatZones.js');
var reg = JSON.parse(fs.readFileSync(path.join(LA, 'lab/assets/world/world_registry_v1.json'), 'utf8')), COL = JSON.parse(fs.readFileSync(path.join(LA, 'play/rules1723/world_v1_colliders.json'), 'utf8'));
var trees = forestLayout(reg, []), avoid = combatZoneCircles(reg, 4).map(function (c) { return { x: c.x, z: c.z, r: c.r }; }); (reg.architecture.class_houses || []).forEach(function (h) { avoid.push({ x: h.x, z: h.z, r: 12 }); });
var G = function (x, z) { return groundYAt(reg, x, z); }, shapes = M.ambientHostShapes(reg, trees), plans = {};
['HIGH', 'MED', 'LOW'].forEach(function (T) { plans[T] = M.ambientPlan({ reg: reg, trees: trees, ground: G, shapes: shapes, veil: null, avoid: avoid }, T); });

/* 1. the budget: one draw; LOW builds nothing; MED about half of HIGH */
var n = { HIGH: plans.HIGH.pts.length, MED: plans.MED.pts.length, LOW: plans.LOW.pts.length };
ok('1. tier budget: HIGH ' + n.HIGH + ' ≤ 480 points, MED ' + n.MED + ' ≤ HIGH / 2 + 20, LOW 0', n.HIGH > 0 && n.HIGH <= 480 && n.MED > 0 && n.MED <= n.HIGH / 2 + 20 && n.LOW === 0, n);

/* 2. the host law against EVERY host collider (ridge face proxies, trunks, platforms, terraces …), footprint = the shader's own motion */
var all = COL.shapes.filter(function (s) { return !s.water; }), s2 = {};
['HIGH', 'MED'].forEach(function (T) { var S = M.ambientSafe(plans[T].pts, plans[T].wind, G, all); s2[T] = { inReach: S.length, minClear: S.length ? Math.min.apply(null, S.map(function (q) { return q.clear_m; })) : null }; });
ok('2. every in-reach point floats ≥ ' + M.AMBIENT_CLEAR_M + ' m over the highest host shape under its whole motion (HIGH ' + JSON.stringify(s2.HIGH) + ', MED ' + JSON.stringify(s2.MED) + ')', s2.HIGH.inReach > 0 && s2.HIGH.minClear >= M.AMBIENT_CLEAR_M && s2.MED.minClear >= M.AMBIENT_CLEAR_M, s2);

/* 3. the moth footprint covers its loop's diagonal (independent ±r in x and z reach √2·r) */
var F3 = M.ambientFootprint({ k: M.AMBIENT_KIND.MOTH, x: 0, z: 0, r: 2, h: 1 }, [0, 1]);
ok('3. a moth\'s footprint radius (' + F3.rad.toFixed(3) + ' m for r = 2) covers the √2·r diagonal of its loop', F3.rad >= Math.SQRT2 * 2, F3);

/* 4. colour law: white is neutral, every other tint sits in its own class window (a pale pastel may read neutral — never a foreign hue) */
var want = { gold: 'GOLD', blue: 'BLUE', red: 'RED', purple: 'PURPLE', pink: 'PINK', white: 'NEUTRAL' }, s4 = {};
Object.keys(M.AMBIENT_TINT).forEach(function (k) { var h = M.AMBIENT_TINT[k]; s4[k] = classify(h); });
ok('4. every light tint is lawful: white neutral, each class tint in its own window or a neutral pastel (never a foreign hue) ' + JSON.stringify(s4), Object.keys(want).every(function (k) { var c = s4[k]; return k === 'white' ? c.verdict === 'NEUTRAL' : (c.verdict === 'NEUTRAL' || (c.verdict === 'LAW' && c.family === want[k])); }) && Object.keys(M.AMBIENT_TINT).every(function (k) { return k in want; }), s4);

console.log('RESULT world m20 ambient: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
