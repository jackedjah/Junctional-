/* M19 (owner 2026-09-27): "the five-class civilization must visibly include ATHLETE = GOLD, TITAN = BLUE, LEAN = CRIMSON, VISIONARY =
   PURPLE, BAGE = PINK … improve GOLD, CRIMSON and PINK … do NOT bathe entire regions in coloured light … purple belongs to VISIONARY".
   The warm-class eye-level light pass: class-keyed street lamps, warm crystal lanterns, the gilded temple glazing, the BAGE basin light,
   deeper warm crystal cuts, warm crown spires beyond the walls. This proves it stays inside the colour law (every warm light tone keeps
   its family hue through the renderer's ACES tone mapping at the intensities used), inside the host rules (lanterns ≥ 3.4 m, glazing
   ≥ 3.4 m, basin light flush additive, crown spires beyond the walls → no collider) and cheap (one lantern draw, one basin draw, lamps
   recoloured per instance).  node 16_TESTS/gameplay_world_warm_class_light.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { warmLanternLayout, WARM_LANTERN } from '../26_LOCAL_AUTHORITY/lab/world/architecture.js';
import { groundYAt, regionColliders, fixtureLayout } from '../26_LOCAL_AUTHORITY/lab/world/worldLayout.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function src(p) { return fs.readFileSync(path.join(LA, p), 'utf8'); }
var REG = JSON.parse(src('lab/assets/world/world_registry_v1.json')), ARCH = src('lab/world/architecture.js'), FIX = src('lab/world/fixtures.js'), TER = src('lab/world/terrain.js'), FOR = src('lab/world/forest.js'), CITY = src('lab/cityScene.js'), BR = src('deploy/jobb/build_registry.mjs');
var FAMILY = { gold: 'GOLD', red: 'RED', pink: 'PINK', blue: 'BLUE', purple: 'PURPLE' };

/* the renderer's ACES filmic (three r185, exposure 1.15 as in the preview / field) + sRGB encode: what a linear light colour renders as */
function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); } function l2s(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
function rrt(v) { return (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081); }
function aces(r, g, b) { var k = 1.15 / 0.6; r *= k; g *= k; b *= k; var i0 = rrt(0.59719 * r + 0.35458 * g + 0.04823 * b), i1 = rrt(0.07600 * r + 0.90834 * g + 0.01566 * b), i2 = rrt(0.02840 * r + 0.13383 * g + 0.83777 * b);
  return [1.60475 * i0 - 0.53108 * i1 - 0.07367 * i2, -0.10208 * i0 + 1.10813 * i1 - 0.00605 * i2, -0.00327 * i0 - 0.07276 * i1 + 1.07602 * i2].map(function (c) { return Math.min(1, Math.max(0, c)); }); }
function rendered(hex, k) { var lin = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map(function (c) { return s2l(c / 255) * k; }), o = aces(lin[0], lin[1], lin[2]).map(l2s); var h = (Math.round(o[0] * 255) << 16) | (Math.round(o[1] * 255) << 8) | Math.round(o[2] * 255); return classify(h); }
function lit(re, text) { var m = re.exec(text); return m ? m.slice(1).map(function (v) { return parseInt(v, 16); }) : null; }

/* 1. colour law: every warm LIGHT / CUT tone is a law colour of its own family as authored, and keeps that family through ACES at every
      intensity the pass uses (0.2 dim pool … 2.0 hot lantern core) — gold never slips to amber / yellow, rose never to violet */
var lamp = lit(/LAMP_LIGHT = \{ gold: 0x([0-9a-f]{6}), red: 0x([0-9a-f]{6}), pink: 0x([0-9a-f]{6}) \}/, FIX), cut = lit(/WARM_CUT = \{ gold: 0x([0-9a-f]{6}), red: 0x([0-9a-f]{6}), pink: 0x([0-9a-f]{6}) \}/, TER), gcut = lit(/GOLD_CUT = new THREE\.Color\(0x([0-9a-f]{6})\)/, ARCH);
var tones = []; ['gold', 'red', 'pink'].forEach(function (f, i) { tones.push([f, WARM_LANTERN.light[f], 'lantern'], [f, lamp && lamp[i], 'lamp'], [f, cut && cut[i], 'crystal cut']); }); tones.push(['gold', gcut && gcut[0], 'architecture gold']);
var bad1 = []; tones.forEach(function (t) { if (!t[1]) { bad1.push(['missing', t[2], t[0]]); return; } var c = classify(t[1]); if (c.family !== FAMILY[t[0]]) bad1.push([t[2], t[0], '#' + t[1].toString(16), c]);
  [0.2, 0.35, 0.6, 1.0, 1.5, 2.0].forEach(function (k) { var r = rendered(t[1], k); if (r.verdict === 'VIOLATION' || (r.verdict === 'LAW' && r.family !== FAMILY[t[0]])) bad1.push([t[2], t[0], k, r]); }); });
ok('1. colour law: ' + tones.length + ' warm light / crystal tones are law colours of their own family and keep it through ACES (0.2–2.0)', bad1.length === 0, bad1);
/* 1b. the RAW-output additive shaders (the world aura, the wet-floor streaks) put the tint's LINEAR value on the screen: those tones are
       chosen so that the displayed colour (the linear value read as sRGB) is still the class hue — the registry gold glow shows amber there */
function displayed(hex) { var l = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map(function (c) { return Math.round(s2l(c / 255) * 255); }); return classify((l[0] << 16) | (l[1] << 8) | l[2]); }
var streak = lit(/LAMP_STREAK = \{ gold: 0x([0-9a-f]{6}), red: 0x([0-9a-f]{6}), pink: 0x([0-9a-f]{6}) \}/, FIX), raw = [], bad1b = [];
['gold', 'red', 'pink'].forEach(function (f, i) { raw.push([f, WARM_LANTERN.aura[f], 'lantern aura'], [f, streak && streak[i], 'lamp streak']); });
raw.forEach(function (t) { if (!t[1]) { bad1b.push(['missing', t]); return; } var a = classify(t[1]), d = displayed(t[1]); if (a.family !== FAMILY[t[0]] || d.family !== FAMILY[t[0]]) bad1b.push([t[2], t[0], '#' + t[1].toString(16), a, d]); });
var regGoldGlow = displayed(parseInt(REG.crystal_families.gold.glow.slice(1), 16));
ok('1b. raw-output tones (lantern auras, lamp streaks) display in their own family (gold ' + displayed(WARM_LANTERN.aura.gold).h + '°; the registry gold glow would show at ' + regGoldGlow.h + '°); ATHLETE auras use the corrected gold', bad1b.length === 0 && /if \(id === 'gold'\) return WARM_LANTERN\.aura\.gold;/.test(ARCH) && /AURA_WARM = \{ gold: '#ffe57c' \}/.test(TER), bad1b);

/* 2. the lanterns: pure light high over the lanes — every lantern's lowest point (centre − half core − bob) ≥ 3.4 m above its ground /
      terrace; warm families only, in their own districts; one instanced draw, LOW halves them, flagged non-interactable */
var LN = warmLanternLayout(REG), bad2 = [], fams = {};
LN.forEach(function (o) { fams[o.family] = (fams[o.family] || 0) + 1; var g = Math.max(groundYAt(REG, o.x, o.z), o.ground), low = o.y - WARM_LANTERN.core_h_m / 2 - WARM_LANTERN.bob_m; if (low - g < 3.4) bad2.push(['low', o, +(low - g).toFixed(2)]); if (!WARM_LANTERN.light[o.family]) bad2.push(['family', o]); });
var lanternDraw = /lanterns = new THREE\.InstancedMesh\(g, lanternMat, L\.length\)/.test(ARCH) && /lanterns\.userData\.nonInteractable = true/.test(ARCH) && /TQ\(\) === 'LOW'\) L = L\.filter\(function \(o, i\) \{ return i % 2 === 0; \}\)/.test(ARCH) && !/colliders\.push|addCollider/.test(ARCH);
ok('2. ' + LN.length + ' warm lanterns (' + Object.keys(fams).map(function (k) { return k + ' ' + fams[k]; }).join(', ') + ') hover ≥ 3.4 m clear of their ground, one instanced non-interactable draw, halved on LOW', LN.length >= 30 && fams.gold >= 8 && fams.red >= 8 && fams.pink >= 8 && !fams.blue && !fams.purple && bad2.length === 0 && lanternDraw, bad2.slice(0, 5));

/* 3. the lit portals change only the existing door screen (no new solid, warm hero landmarks only — TITAN's portal unchanged); the basin
      light is flush additive light (3 cm over the water surface, no depth write, non-interactable) — pool lights, one draw */
var portal = /energyMat\(warmHero \? fam\(family\) : col, warmHero \? 0\.34 : 0\.16\)/.test(ARCH) && /doorFrame\(E, famId, !!L\.hero && \(famId === 'gold' \|\| famId === 'pink' \|\| famId === 'red'\)\)/.test(ARCH);
var bl = ARCH.slice(ARCH.indexOf('function basinLight'), ARCH.indexOf('function basinLight') + 3200);
var basin = /\(H\.surface_y !== undefined \? H\.surface_y : -0\.16\) \+ 0\.03/.test(bl) && /blending: THREE\.AdditiveBlending/.test(bl) && /depthWrite: false/.test(bl) && /basinGlow\.userData\.nonInteractable = true/.test(ARCH) && /c \/= max\(1\.0, max\(max\(c\.r, c\.g\), c\.b\)\)/.test(bl) && (ARCH.match(/basinLight\(holes, WARM_LANTERN\.light\.pink\)/g) || []).length === 1;
ok('3. lit portals recolour only the existing door screen of the warm hero landmarks; the BAGE basin light is flush additive light, hot light scaled, non-interactable, one draw', portal && basin, { portal: portal, basin: basin });

/* 4. the warm crown spires are registry monoliths BEYOND the field walls (no collider: regionColliders is unchanged by them), added by one
      guarded builder line that runs once; TITAN / VISIONARY monoliths untouched (16 reachable monoliths + LEAN's two original north crown spires) */
var W = REG.field.walls, crowns = [], others = 0; REG.regions.list.forEach(function (R) { (R.monoliths || []).forEach(function (m) { if (m.m19) crowns.push([R.id, R.family, m]); else others++; }); });
var outside = crowns.every(function (c) { var m = c[2]; return m.x <= W.x1 || m.x >= W.x2 || m.z <= W.z1 || m.z >= W.z2; }), warmOnly = crowns.every(function (c) { return ['gold', 'red', 'pink'].indexOf(c[1]) >= 0; });
var noCol = !regionColliders(REG).some(function (s) { return crowns.some(function (c) { return Math.abs(s.x - c[2].x) < 20 && Math.abs(s.z - c[2].z) < 20; }); });
var guarded = /\(function \(RG\) \{ if \(!RG \|\| RG\.some\(function \(R\) \{ return \(R\.monoliths \|\| \[\]\)\.some\(function \(m\) \{ return m\.m19; \}\); \}\)\) return;/.test(BR);
ok('4. ' + crowns.length + ' warm crown spires stand beyond the field walls (no collider), warm families only, from one guarded builder line', crowns.length >= 3 && outside && warmOnly && noCol && guarded && others === 16 + 2, { crowns: crowns.map(function (c) { return c[0] + '@' + c[2].x + ',' + c[2].z; }), others: others });

/* 5. restraint + TITAN / VISIONARY not raised: the lamps take the class of their ground (warm districts warm, TITAN keeps the registry
      blue, VISIONARY / plaza / links neutral — no violet lamp anywhere); pools are the lamp hue at the old pool's value (no white mix → no amber
      drift); forest night glow is raised for warm groves only; the deeper crystal cut is warm families only; no new draw call on the lamps */
var FL = fixtureLayout(REG), lampOk = /fam === 'blue' \? LAMP_BLUE\.clone\(\) : new THREE\.Color\(LAMP_WHITE\)/.test(FIX) && /new THREE\.Color\(warm\)\.multiplyScalar\(0\.8\)/.test(FIX) && /heads\.setColorAt\(i, hc\)/.test(FIX) && /drawCalls = 3 \+ \(pools \? 1 : 0\)/.test(FIX) && !/purple: 0x/.test(FIX.slice(FIX.indexOf('LAMP_LIGHT'), FIX.indexOf('LAMP_LIGHT') + 120)) && classify(0xe2e2e2).verdict === 'NEUTRAL' && classify(0xb0b0b0).verdict === 'NEUTRAL';
var forestOk = /step\(vLockFam\.b, vLockFam\.r\) \* uWarm/.test(FOR), cutOk = /if \(WARM_CUT\[id\]\)/.test(TER) && /if \(id === 'gold' && key !== 'deep'\) c\.lerp\(GOLD_CUT, 0\.8\)/.test(ARCH), nexusOk = /FIVE = \[0x[0-9a-f]{6}, CRYSTAL_TINT\.blue, 0x[0-9a-f]{6}, CRYSTAL_TINT\.purple, 0x[0-9a-f]{6}\]/.test(CITY);
ok('5. restraint: ' + FL.length + ' lamps keyed to their ground (warm districts warm, TITAN blue, the rest neutral, never violet), pure-hue pools no brighter than the old blue pool, warm-grove night glow, warm-only crystal cut, NEXUS inlays warm-toned with blue / violet unchanged', lampOk && forestOk && cutOk && nexusOk, { lampOk: lampOk, forestOk: forestOk, cutOk: cutOk, nexusOk: nexusOk });

console.log('RESULT world warm class light: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
