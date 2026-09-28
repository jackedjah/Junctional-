/* M19 (owner 2026-09-27): "the five-class civilization must visibly include ATHLETE = GOLD, TITAN = BLUE, LEAN = CRIMSON, VISIONARY =
   PURPLE, BAGE = PINK … improve GOLD, CRIMSON and PINK … do NOT bathe entire regions in coloured light … purple belongs to VISIONARY".
   The warm-class eye-level light pass: class-keyed street lamps, warm crystal lanterns, lit portals, the BAGE basin waterline, deeper warm
   crystal cuts, warm crown spires beyond the walls. This proves it stays inside the colour law — every warm light tone keeps its family
   hue through the renderer's ACES tone mapping at the intensities used, and (M19 fix, review 2026-09-27) the light the lamps and lanterns
   CAST onto the moon-blue night floor and water never averages with that blue into a fake purple (the rose pools did: BAGE V07 night
   purple 3.0 % → 6.9 %) — inside the host rules (lanterns ≥ 3.4 m and clear of the lamp poles, the waterline line 2 cm proud, crown spires
   beyond the walls → no collider) and cheap (one lantern draw, the waterline in the existing seam draw, lamps recoloured per instance).
   node 16_TESTS/gameplay_world_warm_class_light.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as THREE from '../26_LOCAL_AUTHORITY/vendor/three/three.module.min.js';
import { warmLanternLayout, WARM_LANTERN } from '../26_LOCAL_AUTHORITY/lab/world/architecture.js';
import { lampCast, LAMP_CLASS_LIGHT } from '../26_LOCAL_AUTHORITY/lab/world/fixtures.js';
import { groundYAt, regionColliders, fixtureLayout } from '../26_LOCAL_AUTHORITY/lab/world/worldLayout.js';
import { classify } from '../26_LOCAL_AUTHORITY/deploy/world_preview/colour_law_audit.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)), LA = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
var pass = 0, fail = 0; function ok(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1600))); } }
function src(p) { return fs.readFileSync(path.join(LA, p), 'utf8'); }
var REG = JSON.parse(src('lab/assets/world/world_registry_v1.json')), ARCH = src('lab/world/architecture.js'), FIX = src('lab/world/fixtures.js'), TER = src('lab/world/terrain.js'), FOR = src('lab/world/forest.js'), CITY = src('lab/cityScene.js'), BR = src('deploy/jobb/build_registry.mjs');
var FAMILY = { gold: 'GOLD', red: 'RED', pink: 'PINK', blue: 'BLUE', purple: 'PURPLE' }, WARM = ['gold', 'red', 'pink'];

/* the renderer's ACES filmic (three r185, exposure 1.28 as in the preview / field since M21) + sRGB encode: what a linear light colour renders as */
function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); } function l2s(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
function rrt(v) { return (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081); }
function aces(r, g, b) { var k = 1.28 / 0.6; r *= k; g *= k; b *= k; var i0 = rrt(0.59719 * r + 0.35458 * g + 0.04823 * b), i1 = rrt(0.07600 * r + 0.90834 * g + 0.01566 * b), i2 = rrt(0.02840 * r + 0.13383 * g + 0.83777 * b);
  return [1.60475 * i0 - 0.53108 * i1 - 0.07367 * i2, -0.10208 * i0 + 1.10813 * i1 - 0.00605 * i2, -0.00327 * i0 - 0.07276 * i1 + 1.07602 * i2].map(function (c) { return Math.min(1, Math.max(0, c)); }); }
function rgb(hex) { return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map(function (c) { return c / 255; }); }
function toHex(c) { return (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255); }
function toned(hex, k) { return aces.apply(null, rgb(hex).map(function (c) { return s2l(c) * k; })).map(l2s); }   /* a lit / tone-mapped material: displayed colour */
function rawShown(hex) { return rgb(hex).map(s2l); }   /* a raw-output shader (aura, wet streak): the linear value is what the screen shows */
function rendered(hex, k) { return classify(toHex(toned(hex, k))); } function displayed(hex) { return classify(toHex(rawShown(hex))); }
function lit(re, text) { var m = re.exec(text); return m ? m.slice(1).map(function (v) { return parseInt(v, 16); }) : null; }
function inFam(c, f) { return c.verdict === 'LAW' ? c.family === FAMILY[f] : c.verdict === 'NEUTRAL'; }

/* 1. colour law: every warm LIGHT / CUT tone is a law colour of its own family as authored, and keeps that family through ACES at every
      intensity the pass uses (0.2 dim pool … 2.0 hot lantern core) — gold never slips to amber / yellow, rose never to violet. The
      near-player light tints are law or neutral as authored AND as lit; the retired tint (gold eased toward white in LINEAR light,
      #fbe0bf = 33°) is off-law, so the check is known to catch it */
var cut = lit(/WARM_CUT = \{ gold: 0x([0-9a-f]{6}), red: 0x([0-9a-f]{6}), pink: 0x([0-9a-f]{6}) \}/, TER), gcut = lit(/GOLD_CUT = new THREE\.Color\(0x([0-9a-f]{6})\)/, ARCH);
var tones = []; WARM.forEach(function (f, i) { tones.push([f, WARM_LANTERN.light[f], 'lantern'], [f, LAMP_CLASS_LIGHT[f], 'lamp head'], [f, lampCast(f).head, 'lamp head (cast table)'], [f, cut && cut[i], 'crystal cut']); }); tones.push(['gold', gcut && gcut[0], 'architecture gold'], ['gold', lampCast('gold').tint, 'gold near-player light'], ['gold', lampCast('gold').pool, 'gold pool']);
var bad1 = []; tones.forEach(function (t) { if (!t[1]) { bad1.push(['missing', t[2], t[0]]); return; } var c = classify(t[1]); if (c.family !== FAMILY[t[0]]) bad1.push([t[2], t[0], '#' + t[1].toString(16), c]);
  [0.2, 0.35, 0.6, 1.0, 1.5, 2.0].forEach(function (k) { var r = rendered(t[1], k); if (r.verdict === 'VIOLATION' || (r.verdict === 'LAW' && r.family !== FAMILY[t[0]])) bad1.push([t[2], t[0], k, r]); }); });
var tints = ['gold', 'red', 'pink', 'blue', 'purple', 'platinum'].map(function (f) { var h = lampCast(f).tint, a = classify(h), bad = !(a.verdict === 'NEUTRAL' || (a.verdict === 'LAW' && a.family === FAMILY[f])); [0.35, 1.0, 2.0].forEach(function (k) { var r = rendered(h, k); if (r.verdict === 'VIOLATION' || (r.verdict === 'LAW' && r.family !== FAMILY[f])) bad = true; }); return [f, '#' + h.toString(16), a.verdict, a.family || '', bad]; });
var retired = classify(new THREE.Color(0xf7ba3c).lerp(new THREE.Color(0xffffff), 0.5).getHex());
ok('1. colour law: ' + tones.length + ' warm light / crystal tones keep their family through ACES (0.2–2.0); near-player tints law-or-neutral as lit (' + tints.map(function (t) { return t[0] + ' ' + t[1]; }).join(', ') + '); the retired linear-light gold tint reads ' + retired.h + '° ' + retired.verdict, bad1.length === 0 && tints.every(function (t) { return !t[4]; }) && retired.verdict === 'VIOLATION', { bad1: bad1, tints: tints });
/* 1b. the RAW-output additive shaders (the world aura, the wet-floor streaks) put the tint's LINEAR value on the screen: the gold tones are
       chosen so that the displayed colour is still gold (the registry gold glow shows amber there); crimson / rose cast NEUTRAL (1c) */
var raw = [], bad1b = []; WARM.forEach(function (f) { raw.push([f, WARM_LANTERN.aura[f], 'lantern glow'], [f, lampCast(f).streak, 'lamp streak']); });
raw.forEach(function (t) { var a = classify(t[1]), d = displayed(t[1]), want = t[0] === 'gold' ? function (c) { return c.family === 'GOLD'; } : function (c) { return c.verdict === 'NEUTRAL'; }; if (!want(a) || !want(d)) bad1b.push([t[2], t[0], '#' + t[1].toString(16), a, d]); });
var regGoldGlow = displayed(parseInt(REG.crystal_families.gold.glow.slice(1), 16));
ok('1b. raw-output tones: gold lantern glow / streak display gold (' + displayed(WARM_LANTERN.aura.gold).h + '°; the registry gold glow would show at ' + regGoldGlow.h + '°), crimson / rose glows and streaks neutral; ATHLETE auras use the corrected gold', bad1b.length === 0 && /if \(id === 'gold'\) return WARM_LANTERN\.aura\.gold;/.test(ARCH) && /AURA_WARM = \{ gold: '#ffe57c' \}/.test(TER), bad1b);

/* 1c. NO FAKE PURPLE from cast light (M19 fix, review 2026-09-27: "blue plus pink produces the fake purple the brief forbids"). The pools,
       wet streaks, near-player lights and lantern glows ADD onto the moon-blue night floor and water. Composited additively over the night
       surfaces measured in the 80268a0 renders of each family's own district (and the shared plaza for the neutral lamps) at every weight
       0.03–0.5, no cast may turn a pixel purple (HLS hue 246–292, s ≥ 0.25, l ≥ 0.1 — the review's metric) beyond the surface's own. The
       retired rose cast is known to fail this (the check is meaningful). */
var SURF = { BAGE: [[54, 49, 89], [57, 52, 92], [48, 71, 112], [46, 62, 98]], ATHLETE: [[35, 59, 103], [58, 78, 111], [31, 60, 104]], LEAN: [[37, 58, 87], [44, 54, 90], [43, 54, 76]], PLAZA: [[45, 64, 97], [53, 71, 107], [41, 52, 72], [69, 83, 109]] };
function hls(c) { var mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, l, 0]; var s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn), h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; h *= 60; if (h < 0) h += 360; return [h, l, s]; }
function purpleS(c) { var q = hls(c); return q[0] >= 246 && q[0] <= 292 && q[2] >= 0.25 && q[1] >= 0.1 && q[1] <= 0.95 ? q[2] : 0; }
function fakePurple(casts, surfs) { var out = []; surfs.forEach(function (s) { var base = s.map(function (v) { return v / 255; }), p0 = purpleS(base); casts.forEach(function (cs) { for (var k = 0.03; k <= 0.5; k += 0.01) { var c = base.map(function (v, i) { return Math.min(1, v + cs[1][i] * k); }), p = purpleS(c); if (p > p0 + 0.01) { out.push([cs[0], s, +k.toFixed(2), +p.toFixed(2)]); break; } } }); }); return out; }
function castsOf(f) { var C = lampCast(f); return [['pool', toned(C.pool, C.pool_k)], ['streak', rawShown(C.streak)], ['near light', toned(C.tint, 1)]].concat(WARM_LANTERN.aura[f] ? [['lantern glow', rawShown(WARM_LANTERN.aura[f])]] : []); }
var fp = { gold: fakePurple(castsOf('gold'), SURF.ATHLETE.concat(SURF.PLAZA)), red: fakePurple(castsOf('red'), SURF.LEAN.concat(SURF.PLAZA)), pink: fakePurple(castsOf('pink'), SURF.BAGE.concat(SURF.PLAZA)), platinum: fakePurple(castsOf('platinum'), SURF.PLAZA.concat(SURF.BAGE)) };
var retiredRose = fakePurple([['pool', toned(0xff4aa8, 0.8)], ['streak', rawShown(0xff95d6)], ['lantern glow', rawShown(0xffa6d4)]], SURF.BAGE), retiredCrimson = fakePurple([['pool', toned(0xe8304a, 0.8)], ['streak', rawShown(0xf35670)]], SURF.LEAN.concat(SURF.PLAZA));
ok('1c. no fake purple: gold / crimson / rose / shared cast light added onto the measured moon-blue night floors and water never turns them violet (the retired rose cast did at ' + retiredRose.length + ' of ' + (SURF.BAGE.length * 3) + ' surface × cast pairs, the retired crimson at ' + retiredCrimson.length + ')', fp.gold.length + fp.red.length + fp.pink.length + fp.platinum.length === 0 && retiredRose.length >= 4 && retiredCrimson.length >= 1, fp);

/* 2. the lanterns: pure light high over the lanes — every lantern's lowest point (centre − half height − bob) ≥ 3.4 m above its ground /
      terrace and ≥ 2.5 m from every street-lamp pole (no clutter); warm families only, in their own districts; one instanced draw with
      platinum fittings in the same geometry (aGlow), none on LOW (never heavier), flagged non-interactable */
var LN = warmLanternLayout(REG), FXL = fixtureLayout(REG), bad2 = [], fams = {};
LN.forEach(function (o) { fams[o.family] = (fams[o.family] || 0) + 1; var g = Math.max(groundYAt(REG, o.x, o.z), o.ground), low = o.y - WARM_LANTERN.core_h_m / 2 - WARM_LANTERN.bob_m; if (low - g < 3.4) bad2.push(['low', o, +(low - g).toFixed(2)]); if (!WARM_LANTERN.light[o.family]) bad2.push(['family', o]);
  var near = FXL.filter(function (f) { return Math.hypot(f.x - o.x, f.z - o.z) < 2.5; }); if (near.length) bad2.push(['pole', o, near[0].id]); });
var lanternDraw = /lanterns = new THREE\.InstancedMesh\(g, lanternMat, L\.length\)/.test(ARCH) && /lanterns\.userData\.nonInteractable = true/.test(ARCH) && /function warmLanterns\(\) \{ if \(TQ\(\) === 'LOW'\) return;/.test(ARCH) && /attribute float aGlow/.test(ARCH) && /diffuseColor\.rgb = mix\(vec3\(0\.62\), diffuseColor\.rgb, vGlow\)/.test(ARCH) && !/colliders\.push|addCollider/.test(ARCH);
ok('2. ' + LN.length + ' warm lanterns (' + Object.keys(fams).map(function (k) { return k + ' ' + fams[k]; }).join(', ') + ') hover ≥ 3.4 m clear of their ground and ≥ 2.5 m from every lamp pole; one instanced non-interactable draw with platinum fittings, none on LOW', LN.length >= 30 && fams.gold >= 8 && fams.red >= 8 && fams.pink >= 8 && !fams.blue && !fams.purple && bad2.length === 0 && lanternDraw, bad2.slice(0, 5));

/* 3. the lit portals change only the existing door screen (no new solid, warm hero landmarks only — TITAN's portal unchanged), strongest at
      the threshold; the additive rose basin wash is retired (it averaged with the blue water into violet); the BAGE basins are lit by a
      waterline line in the existing lit-seam draw, 2 cm proud of the frame's inner face (≤ 5 cm host rule) */
var portal = /energyMat\(warmHero \? fam\(family\) : col, warmHero \? 0\.34 : 0\.16\)/.test(ARCH) && /doorFrame\(E, famId, !!L\.hero && \(famId === 'gold' \|\| famId === 'pink' \|\| famId === 'red'\)\)/.test(ARCH) && /diffuseColor\.a \*= mix\(1\.0, 0\.15, smoothstep\(-1\.0, 0\.75, vPy\)\)/.test(ARCH);
var wl = /var wl = new THREE\.BoxGeometry\(Math\.abs\(dx\) \|\| 0\.03, 0\.14, Math\.abs\(dz\) \|\| 0\.03\); wl\.translate\([^;]*\* 0\.005 : 0\), 0\.09, [^;]*\* 0\.005 : 0\)\); pushColored\(seams, wl, glow/.test(ARCH), proud = 0.03 / 2 + 0.005;
var noWash = !/ARCH_BASIN_LIGHT|function basinLight/.test(ARCH);
ok('3. lit portals recolour only the warm heroes\' existing door screen (brightest at the threshold); the rose basin wash is retired; the basin waterline sits in the seam draw ' + (proud * 100).toFixed(1) + ' cm proud', portal && wl && noWash && proud <= 0.05, { portal: portal, waterline: wl, noWash: noWash });

/* 4. the warm crown spires are registry monoliths BEYOND the field walls (no collider: regionColliders is unchanged by them), added by one
      guarded builder line that runs once; TITAN / VISIONARY monoliths untouched (16 reachable monoliths + LEAN's two original north crown
      spires). M19 fix: they are landmarks only — each region's lead crystal (the M12 ringed halo + the M14 dimensional aura) is still its
      tallest ORIGINAL monolith, and the crowns request no aura */
var W = REG.field.walls, crowns = [], others = 0; REG.regions.list.forEach(function (R) { (R.monoliths || []).forEach(function (m) { if (m.m19) crowns.push([R.id, R.family, m]); else others++; }); });
var outside = crowns.every(function (c) { var m = c[2]; return m.x <= W.x1 || m.x >= W.x2 || m.z <= W.z1 || m.z >= W.z2; }), warmOnly = crowns.every(function (c) { return WARM.indexOf(c[1]) >= 0; });
var noCol = !regionColliders(REG).some(function (s) { return crowns.some(function (c) { return Math.abs(s.x - c[2].x) < 20 && Math.abs(s.z - c[2].z) < 20; }); });
var guarded = /\(function \(RG\) \{ if \(!RG \|\| RG\.some\(function \(R\) \{ return \(R\.monoliths \|\| \[\]\)\.some\(function \(m\) \{ return m\.m19; \}\); \}\)\) return;/.test(BR);
var leadOk = /if \(ctx\.auraRequests && R\.family !== 'platinum' && !Mo\.m19\) \{ var inDist = \(R\.monoliths \|\| \[\]\)\.filter\(function \(m\) \{ return !m\.m19; \}\), lead = inDist\.length > 0 && inDist\.reduce\(/.test(TER);
var leads = REG.regions.list.filter(function (R) { return (R.monoliths || []).some(function (m) { return m.m19; }); }).map(function (R) { var own = R.monoliths.filter(function (m) { return !m.m19; }); var lead = own.reduce(function (a, b) { return (b.h || 6) > (a.h || 6) ? b : a; }); return R.id + ' lead ' + lead.x + ',' + lead.z + ' h' + lead.h; });
ok('4. ' + crowns.length + ' warm crown spires stand beyond the field walls (no collider), warm families only, from one guarded builder line; never a region lead, no aura (' + leads.join('; ') + ')', crowns.length >= 3 && outside && warmOnly && noCol && guarded && leadOk && others === 16 + 2, { crowns: crowns.map(function (c) { return c[0] + '@' + c[2].x + ',' + c[2].z; }), others: others, leadOk: leadOk });

/* 5. restraint + TITAN / VISIONARY not raised: the lamps take the class of their ground (warm districts warm heads, TITAN keeps the registry
      blue, VISIONARY / plaza / links neutral — no violet lamp anywhere); only gold casts its hue (at 0.8 of the lamp, never mixed toward
      white); forest night glow is raised for warm groves only (red clearly above blue); the deeper crystal cut is warm families only; no
      new draw call on the lamps */
var FL = fixtureLayout(REG), purpleLamp = lampCast('purple'), plat = lampCast('platinum'), blue = lampCast('blue'), gold = lampCast('gold');
var lampOk = blue.head === null && blue.pool === 0x8fb4ea && blue.pool_k === 0.7 && purpleLamp.head === 0xe2e2e2 && classify(purpleLamp.head).verdict === 'NEUTRAL' && classify(plat.pool).verdict === 'NEUTRAL' && gold.pool === LAMP_CLASS_LIGHT.gold && gold.pool_k === 0.8
  && lampCast('red').head === LAMP_CLASS_LIGHT.red && lampCast('pink').head === LAMP_CLASS_LIGHT.pink && /heads\.setColorAt\(i, hc\)/.test(FIX) && /drawCalls = 3 \+ \(pools \? 1 : 0\)/.test(FIX) && /lampTint\.push\(new THREE\.Color\(LC\.tint\)\)/.test(FIX);
var forestOk = /step\(vLockFam\.b \* 1\.05 \+ 0\.002, vLockFam\.r\) \* uWarm/.test(FOR), cutOk = /if \(WARM_CUT\[id\]\)/.test(TER) && /if \(id === 'gold' && key !== 'deep'\) c\.lerp\(GOLD_CUT, 0\.8\)/.test(ARCH) && (ARCH.match(/step\(vColor\.b \* 1\.05 \+ 0\.002, vColor\.r\)/g) || []).length === 1 && (TER.match(/step\(vColor\.b \* 1\.05 \+ 0\.002, vColor\.r\)/g) || []).length === 2;
var nexusOk = /FIVE = \[0x[0-9a-f]{6}, CRYSTAL_TINT\.blue, 0x[0-9a-f]{6}, CRYSTAL_TINT\.purple, 0x[0-9a-f]{6}\]/.test(CITY);
ok('5. restraint: ' + FL.length + ' lamps keyed to their ground (warm heads in warm districts, TITAN blue, the rest neutral, never violet), only gold casts its hue, warm-grove night glow, warm-only crystal cut and night boost (red strictly above blue), NEXUS inlays warm-toned with blue / violet unchanged', lampOk && forestOk && cutOk && nexusOk, { lampOk: lampOk, forestOk: forestOk, cutOk: cutOk, nexusOk: nexusOk });

console.log('RESULT world warm class light: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
