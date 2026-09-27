/* MAHWORLD JOB B :: FIXTURES — the cyan street-light family (registry.fixtures, kind CYAN_STREET_LIGHT) placed EXACTLY at ctx.fixturePlacement
   (lab/world/worldLayout.js fixtureLayout: route pairs, the plaza ring, the bridge ends — the same seeded list the collider generator reads;
   poles are presentation-only, collision policy NONE). Owner art direction: chromium pole on a graphite plinth, graphite arm, a crystal-white
   luminaire with cool cyan emissive, a soft additive light pool on the black platinum ground — no bloom, no bright primaries.
   Draw calls at rest: poles (1 InstancedMesh, ctx.M.chrome) + arms (1, ctx.M.graphite) + heads (1, a clone of ctx.M.cyan so its emissive can
   switch) + pools (1 InstancedMesh of additive radial-gradient decals) = 4. Real light: registry dynamic_lights_near_player non-shadowing
   THREE.PointLights (default 3, reach dynamic_light_reach_m) that hop between the nearest fixtures around the player every 0.25 s, so the
   character receives local light when moving near / under a fixture without dozens of lights. Day is the default; setNight(n) switches the
   head emissive (0.35 / 1.6), the pool alpha (day_pool_alpha / night_pool_alpha) and the light intensity without rebuilding anything.
   No per-frame allocation in tick(): the nearest-fixture search runs on flat Float32Arrays into two preallocated small arrays. */
import { mergeGeometries } from '../../vendor/three/BufferGeometryUtils.js'; import { taperShaft, orb } from './formKit.js'; import { createReflectionStreaks } from './wetReflect.js';

import { groundYAt } from './worldLayout.js';
/* M19 fix (review 2026-09-27, colour law — "blue + pink → a fake purple: blend through neutral white"). A lamp's own LIGHT and the light it
   CASTS are separate things. The luminaire head burns its class colour (ATHLETE gold, LEAN crimson, BAGE rose; TITAN the registry blue).
   What it casts onto the moon-blue night floor and water — the additive pool, the wet-floor streak, the near-player PointLight — adds
   onto that blue: rose + blue night floor averaged into violet (BAGE V07 night: purple 3.0 % → 6.9 % of the frame, more than its pink),
   and crimson + blue read magenta-pink or lavender on the LEAN floor (measured in V16 at 321–331° — BAGE's hue, not LEAN's). So the
   rose and crimson lamps cast clean equal-channel white and their class stays in the heads, the lanterns, the crystals and the groves.
   Gold + blue passes through neutral (never violet), so ATHLETE keeps its gilded pool, streak and a pale-gold near light, authored as a
   display hex inside the family (#ffe3a0 = 42°): easing gold toward white in linear light drifted it to 33° (amber, off-law).
   Every other shared lamp casts neutral white (the old #e3eaff pale blue was TITAN's). Pure (THREE-free): the tests audit what each
   family casts over the measured night floors. */
export var LAMP_CLASS_LIGHT = { gold: 0xf7ba3c, red: 0xe8304a, pink: 0xff4aa8 };
export function lampCast(fam) { var warm = LAMP_CLASS_LIGHT[fam];
  if (fam === 'blue') return { head: null, pool: 0x8fb4ea, pool_k: 0.7, streak: 0xd6e4ff, tint: 0xe3eaff };   /* TITAN: the registry blue head (null = registry), its pools at 0.7, unchanged */
  if (fam !== 'gold') return { head: warm || 0xe2e2e2, pool: 0xb0b0b0, pool_k: 1, streak: 0xe2e2e2, tint: 0xf0f0f0 };   /* LEAN, BAGE and every shared lamp: neutral cast light (the class burns in the head) */
  return { head: warm, pool: warm, pool_k: 0.8, streak: 0xffe57c, tint: 0xffe3a0 }; }   /* ATHLETE: the gilded pool at 0.8 of the lamp hue; the streak shader writes the colour's linear value raw — #ffe57c shows at 47° */
export function createFixtures(ctx) {
  var THREE = ctx.THREE;
  var HEAD_EMISSIVE_DAY = 0.35, HEAD_EMISSIVE_NIGHT = 1.6;      /* luminaire emissiveIntensity (owner spec) */
  var LIGHT_NIGHT = 42, LIGHT_DAY_NEAR = 14;                     /* candela (three r155+ physical units, decay 2): ~1.1 irradiance right under the head at night; a subtle cool fill by day */
  var NEAR_POLE_M = 6, HOP_INTERVAL_S = 0.25, FADE_RATE = 8;     /* by day a light only wakes while the player is within 6 m of its pole; intensities ease toward their targets */
  var POOL_SIZE_M = 9, POOL_Y = 0.045, ARM_LEN_M = 1.4;          /* M9: pool quad ~9 m (7 m at alpha 0.45 vanished on the night paving), just above the plaza floor (0.012) with a polygon offset against z-fighting */
  var group = null, poles = null, arms = null, heads = null, pools = null, headMat = null, poolMat = null, poolTex = null, geos = [], streaks = null, lampList = [];
  var lights = [], lightFix = [], lightTarget = [];
  var n = 0, hx = null, hy = null, hz = null, px = null, pz = null;   /* head positions (light anchors) and pole feet (the near-pole test) */
  var bestIdx = null, bestD2 = null, bestN = 0;
  var F = null, night = !!ctx.night, acc = HOP_INTERVAL_S, built = false, dayAlpha = 0.05, nightAlpha = 0.45, headY = 0, drawCalls = 0;
  var tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1), yAxis = new THREE.Vector3(0, 1, 0);
  var dir = { x: 0, z: 0 };

  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function col(v, d) { try { return new THREE.Color(typeof v === 'string' && v ? v : d); } catch (e) { return new THREE.Color(d); } }
  function log(m) { if (ctx.log) ctx.log('fixtures: ' + m); }
  /* M19 (owner 2026-09-27: "the five-class civilization must visibly include ATHLETE gold, LEAN crimson and BAGE pink at eye level … light
     fixtures, not whole regions bathed in colour"). Every luminaire used to burn the registry's one cyan-blue, so at night every district
     and the shared plaza read TITAN. Now each lamp carries the class of the sanctuary it stands in (a 6 m margin): ATHLETE gilded gold,
     LEAN crimson, BAGE rose; TITAN keeps the registry blue (unchanged); outside the sanctuaries a lamp on a road toward a warm sanctuary
     carries that warm light (its road seam and inlays already do), and VISIONARY, the plaza ring, MAH MATCH and every other shared lamp
     burn clean equal-channel white (colour law: civic light is neutral; purple is VISIONARY's, never the generic lamp; the registry's
     pale-blue head_color is superseded). The warm class LIGHT tones are deeper than the pastel crystal .color
     (#e6c36a / #f08ab8 tone-map to champagne / blush and never read as class light): each keeps its family hue through ACES at the head's
     day (0.35) and night (1.6) emissive. Per-instance colour on the heads (albedo + emissive), the pools (the lamp's hue, no brighter than the
     old blue pool: a warm cast, never a coloured floor) and the wet-floor streaks; the near-player lights take a warm lamp's tint when they
     anchor to it (M19 fix: only ATHLETE's gold is cast as a hue — LEAN / BAGE / shared lamps cast neutral light, see lampCast above). No new draw call, no new program per lamp. */
  var LAMP_LIGHT = LAMP_CLASS_LIGHT, LAMP_BLUE = null, lampFam = null, lampTint = null;   /* M19 fix: what each family casts → lampCast() above */
  function lampFamily(p, reg) { var RG = reg.regions && reg.regions.list || [], i, j;
    for (i = 0; i < RG.length; i++) { var R = RG[i], s = R.shape || {}; if (!R.class) continue; var m = 6, inside = s.kind === 'CIRCLE' ? Math.hypot(p.x - s.x, p.z - s.z) <= s.r + m : (s.rects || []).some(function (r) { return p.x >= r.x1 - m && p.x <= r.x2 + m && p.z >= r.z1 - m && p.z <= r.z2 + m; }); if (inside) return R.family; }   /* a lamp at a sanctuary's edge (≤ 6 m) is that sanctuary's */
    var road = null, PL = reg.paths && reg.paths.list || []; for (j = 0; j < PL.length && !road; j++) if (PL[j].id === p.route) road = PL[j].family;
    var LK = reg.paths && reg.paths.links || []; for (j = 0; j < LK.length && !road; j++) if (LK[j].physical === p.route) road = LK[j].family;
    return LAMP_LIGHT[road] ? road : 'platinum'; }   /* outside the sanctuaries a road toward a warm sanctuary carries its warm light (the shared world acknowledges the warm classes); every other shared lamp is neutral white — TITAN's blue stays in TITAN */

  /* the arm / head direction: toward the lane the fixture serves (route centreline, plaza centre, bridge centreline); yaw is the fallback */
  function laneDir(p, reg, out) {
    var routes = reg.field && reg.field.routes || []; var r = null, i;
    for (i = 0; i < routes.length; i++) if (routes[i].id === p.route) { r = routes[i]; break; }
    if (r && r.from && r.to) { var ax = r.from[0], az = r.from[1], dx = r.to[0] - ax, dz = r.to[1] - az; var l2 = dx * dx + dz * dz || 1; var t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / l2)); out.x = ax + dx * t - p.x; out.z = az + dz * t - p.z; }
    else if (p.route === 'PLAZA_RING') { out.x = -p.x; out.z = -p.z; }
    else { var b = null, bridges = reg.water && reg.water.bridges || []; for (i = 0; i < bridges.length; i++) if (bridges[i].id === p.route) { b = bridges[i]; break; }
      if (b) { out.x = (b.x1 + b.x2) / 2 - p.x; out.z = 0; } else { out.x = -p.x; out.z = -p.z; } }
    var L = Math.hypot(out.x, out.z); if (L < 1e-3) { out.x = Math.sin(p.yaw || 0); out.z = -Math.cos(p.yaw || 0); L = Math.hypot(out.x, out.z) || 1; }
    out.x /= L; out.z /= L; return out;
  }
  /* 128² radial-gradient decal (white; the material colour tints it) */
  function makePoolTexture() {
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'); if (!g) return null;
    var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.6)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; return t;
  }

  function build() {
    var reg = ctx.registry || {}; F = reg.fixtures || null;
    if (!F) { log('registry.fixtures missing — module skipped'); return; }
    var list = Array.isArray(ctx.fixturePlacement) ? ctx.fixturePlacement : [];
    if (!list.length) { log('ctx.fixturePlacement is empty — nothing to build'); return; }
    var poleH = num(F.pole_h, 7.2); dayAlpha = num(F.day_pool_alpha, 0.05); nightAlpha = num(F.night_pool_alpha, 0.45);
    var reach = num(F.dynamic_light_reach_m, 16); var nLights = Math.max(0, Math.min(8, Math.round(num(F.dynamic_lights_near_player, 3))));
    n = list.length; hx = new Float32Array(n); hy = new Float32Array(n); hz = new Float32Array(n); px = new Float32Array(n); pz = new Float32Array(n);
    group = new THREE.Group(); group.name = 'FIXTURES_' + (F.kind || 'STREET_LIGHT'); group.userData.noMerge = true; ctx.group.add(group);

    /* geometry: slim tapered pole with a merged plinth (one draw call), short arm, capsule luminaire, ground pool quad */
    /* DESIGN DNA (the character roster): a rolled dome foot inside the old plinth, a tapered pole with a polished orb collar and an orb at the
       arm root, and a swan-neck arm arcing up and out to the luminaire (was a straight bar) — the same footprint, height and head position */
    var FT = 'HIGH'; try { FT = ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { }
    var poleGeo = taperShaft(THREE, 0.1, 0.05, poleH - 0.3, FT, { belly: 0.02, radial: FT === 'LOW' ? 5 : (FT === 'MED' ? 6 : 8), rows: FT === 'LOW' ? 3 : 4 });   /* instanced everywhere: a tight triangle budget (~0.4 k per light) */ poleGeo.translate(0, 0.3, 0);
    var plinth = new THREE.LatheGeometry([new THREE.Vector2(0.0001, 0), new THREE.Vector2(0.27, 0), new THREE.Vector2(0.26, 0.08), new THREE.Vector2(0.2, 0.22), new THREE.Vector2(0.12, 0.34), new THREE.Vector2(0.0001, 0.36)], FT === 'LOW' ? 6 : 8);
    var collar = orb(THREE, 0.13, FT, FT === 'HIGH' ? 8 : 6); collar.scale(1, 0.75, 1); collar.translate(0, 2.6, 0); var crown = orb(THREE, 0.1, FT, 6); crown.translate(0, poleH - 0.12, 0);
    var parts = (FT === 'LOW' ? [poleGeo, plinth, collar] : [poleGeo, plinth, collar, crown]).map(function (g) { return g.index ? g.toNonIndexed() : g; }); parts.forEach(function (g) { g.deleteAttribute('uv'); g.deleteAttribute('uv1'); });
    var merged = null; try { merged = mergeGeometries(parts, false); } catch (e) { merged = null; }
    if (merged) { merged.computeVertexNormals(); parts.forEach(function (g) { g.dispose(); }); poleGeo = merged; } else { log('plinth merge unavailable — plain pole'); poleGeo = parts[0]; }
    var armCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.04, 0, 0), new THREE.Vector3(ARM_LEN_M * 0.45, 0.34, 0), new THREE.Vector3(ARM_LEN_M - 0.06, 0.02, 0));
    var armGeo = new THREE.TubeGeometry(armCurve, FT === 'LOW' ? 6 : 8, 0.045, FT === 'HIGH' ? 6 : 4, false);   /* starts at the arm-root orb, arcs up and out along +x (rotated per instance) */
    var headGeo = new THREE.CapsuleGeometry(0.15, 0.5, 3, 10); headGeo.rotateZ(Math.PI / 2);                   /* lies along the arm */
    /* M20 (owner 2026-09-27: "practical lighting", "reduce smooth primitive shells … excessive neon"): the luminaire was a pill glowing all over.
       Now it is a luminaire: the upper shell is a dark satin housing, only the lower half — the diffuser facing the street — burns in the lamp's
       class light (aGlow per vertex; one draw as before, the instance colour still carries the class) */
    (function () { var hp = headGeo.attributes.position, ag = new Float32Array(hp.count); for (var gi = 0; gi < hp.count; gi++) ag[gi] = hp.getY(gi) < 0.035 ? 1 : 0; headGeo.setAttribute('aGlow', new THREE.BufferAttribute(ag, 1)); })();
    var poolGeo = new THREE.PlaneGeometry(POOL_SIZE_M, POOL_SIZE_M); poolGeo.rotateX(-Math.PI / 2);
    geos.push(poleGeo, armGeo, headGeo, poolGeo);

    headMat = ctx.M.cyan.clone(); headMat.color.setHex(0xededed); headMat.emissive.setHex(0xffffff);   /* M19: the lamp's own colour rides in the instance colour (albedo × tint, emissive × tint) */
    headMat.onBeforeCompile = function (sh) { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow; varying float vGlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGlow;').replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb = mix(vec3(0.13, 0.135, 0.145), diffuseColor.rgb, vGlow);').replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n\tmetalnessFactor = mix(0.8, metalnessFactor, vGlow); roughnessFactor = mix(0.38, roughnessFactor, vGlow);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n\ttotalEmissiveRadiance *= vColor.rgb;\n#endif\n\ttotalEmissiveRadiance *= vGlow;'); }; headMat.customProgramCacheKey = function () { return 'mahworld_fixture_head_class_v2'; };   /* M20: a dark housing over the lit diffuser */
    headMat.emissiveIntensity = night ? HEAD_EMISSIVE_NIGHT : HEAD_EMISSIVE_DAY; headMat.roughness = 0.22; headMat.metalness = 0.3; headMat.name = 'FIXTURE_HEAD';
    LAMP_BLUE = col(F.emissive, '#6fc3ff'); lampFam = []; lampTint = [];
    poolTex = makePoolTexture();
    if (poolTex) { poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: 0xffffff, transparent: true, opacity: night ? nightAlpha : dayAlpha, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -10 }); poolMat.name = 'FIXTURE_POOL'; }   /* M19: the pools sat at 4.5 cm, UNDER the 4.9 cm path cores (registry path_y 0.045), so no pool showed on a road — a stronger depth offset, same height */   /* M19: per-instance pool colour (TITAN keeps the old 0x8fb4ea) */
    else log('no canvas available — light pools skipped');

    poles = new THREE.InstancedMesh(poleGeo, ctx.M.chrome, n); arms = new THREE.InstancedMesh(armGeo, ctx.M.graphite, n); heads = new THREE.InstancedMesh(headGeo, headMat, n);
    pools = poolMat ? new THREE.InstancedMesh(poolGeo, poolMat, n) : null;
    poles.name = 'FIXTURE_POLES'; arms.name = 'FIXTURE_ARMS'; heads.name = 'FIXTURE_HEADS';
    poles.castShadow = false; poles.receiveShadow = true; arms.castShadow = false; arms.receiveShadow = true; heads.castShadow = false; heads.receiveShadow = false;
    if (pools) { pools.name = 'FIXTURE_POOLS'; pools.castShadow = false; pools.receiveShadow = false; pools.renderOrder = 2; }
    headY = poleH - 0.12 - 0.2;
    for (var i = 0; i < n; i++) {
      var p = list[i] || {}; var x = num(p.x, 0), z = num(p.z, 0); laneDir(p, reg, dir);
      var theta = Math.atan2(-dir.z, dir.x);                                     /* rotates +x onto the lane direction (three: +x → (cos θ, 0, −sin θ)) */
      px[i] = x; pz[i] = z;
      var gy = groundYAt(reg, x, z);   /* JOB B redirect: fixtures stand on the terraces */
      tmpQ.identity(); tmpV.set(x, gy, z); tmpM.compose(tmpV, tmpQ, tmpS); poles.setMatrixAt(i, tmpM);
      tmpQ.setFromAxisAngle(yAxis, theta); tmpV.set(x, gy + poleH - 0.12, z); tmpM.compose(tmpV, tmpQ, tmpS); arms.setMatrixAt(i, tmpM);
      var ex = x + dir.x * (ARM_LEN_M - 0.22), ez = z + dir.z * (ARM_LEN_M - 0.22);   /* the luminaire hangs under the arm end */
      tmpV.set(ex, gy + headY, ez); tmpM.compose(tmpV, tmpQ, tmpS); heads.setMatrixAt(i, tmpM);
      hx[i] = ex; hy[i] = gy + headY; hz[i] = ez;
      if (pools) { tmpQ.identity(); tmpV.set(ex, gy + POOL_Y, ez); tmpM.compose(tmpV, tmpQ, tmpS); pools.setMatrixAt(i, tmpM); }
      var fam = lampFamily({ x: x, z: z, route: p.route }, reg), LC = lampCast(fam), hc = LC.head === null ? LAMP_BLUE.clone() : new THREE.Color(LC.head), pc = new THREE.Color(LC.pool).multiplyScalar(LC.pool_k);   /* the head in its class colour; warm gold / crimson pools the lamp's own hue at 0.8 (≈ the old blue pool's value: a warm cast, never a coloured floor; never mixed toward white in linear light, which drifts gold to amber); BAGE and shared pools neutral white; TITAN's at 0.7 */
      heads.setColorAt(i, hc); if (pools) pools.setColorAt(i, pc); lampFam.push(fam); lampTint.push(new THREE.Color(LC.tint));
      lampList.push({ x: ex, y: gy, z: ez, h: headY, color: LC.streak });
    }
    poles.instanceMatrix.needsUpdate = true; arms.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true; if (pools) pools.instanceMatrix.needsUpdate = true; if (heads.instanceColor) heads.instanceColor.needsUpdate = true; if (pools && pools.instanceColor) pools.instanceColor.needsUpdate = true;
    [poles, arms, heads, pools].forEach(function (m) { if (m) { if (m.computeBoundingSphere) m.computeBoundingSphere(); m.frustumCulled = true; group.add(m); } });
    drawCalls = 3 + (pools ? 1 : 0);
    streaks = createReflectionStreaks(THREE, lampList, { tier: FT, night: night, name: 'FIXTURE_WET_REFLECTIONS' }); if (streaks) { group.add(streaks.mesh); drawCalls++; }   /* M15: the polished night floor mirrors every luminaire as a streak toward the viewer */

    /* the few real lights: never shadow-casting, always present (a constant light count keeps one shader variant — intensity 0 is "off") */
    for (var k = 0; k < nLights; k++) { var L = new THREE.PointLight(0xe3eaff, 0, reach, 2); L.castShadow = false; L.name = 'FIXTURE_LIGHT_' + k; L.position.set(0, headY, 0); group.add(L); lights.push(L); lightFix.push(-1); lightTarget.push(0); }
    bestN = Math.min(nLights, n); bestIdx = new Int32Array(Math.max(1, bestN)); bestD2 = new Float32Array(Math.max(1, bestN));
    built = true; acc = HOP_INTERVAL_S;
    log(n + ' fixtures (' + (F.kind || 'STREET_LIGHT') + ', pole ' + poleH + ' m), ' + nLights + ' dynamic lights (reach ' + reach + ' m), ' + drawCalls + ' draw calls, ' + (night ? 'night' : 'day'));
  }

  /* every HOP_INTERVAL_S: the bestN nearest fixtures (insertion into a tiny sorted array), keep lights already anchored to one of them, re-anchor
     the rest to unclaimed nearest fixtures (fresh anchors start dark and fade in — no pop), then set each light's target intensity */
  function assign() {
    var p = ctx.playerPos(); if (!p || !isFinite(p.x) || !isFinite(p.z)) return; var pxp = p.x, pzp = p.z; var m = 0, i, j, k, q, d2, f;
    for (i = 0; i < n; i++) { var dx = hx[i] - pxp, dz = hz[i] - pzp; d2 = dx * dx + dz * dz;
      if (m < bestN) { j = m++; } else if (d2 < bestD2[m - 1]) { j = m - 1; } else continue;
      while (j > 0 && bestD2[j - 1] > d2) { bestD2[j] = bestD2[j - 1]; bestIdx[j] = bestIdx[j - 1]; j--; } bestD2[j] = d2; bestIdx[j] = i; }
    for (k = 0; k < lights.length; k++) { f = lightFix[k]; var keep = false; if (f >= 0) for (q = 0; q < m; q++) if (bestIdx[q] === f) { keep = true; break; } if (!keep) lightFix[k] = -1; }
    for (q = 0; q < m; q++) { var idx = bestIdx[q]; var claimed = false; for (k = 0; k < lights.length; k++) if (lightFix[k] === idx) { claimed = true; break; } if (claimed) continue;
      for (k = 0; k < lights.length; k++) if (lightFix[k] < 0) { lightFix[k] = idx; lights[k].position.set(hx[idx], hy[idx], hz[idx]); lights[k].intensity = 0; if (lampTint && lampTint[idx]) lights[k].color.copy(lampTint[idx]); else lights[k].color.setHex(0xe3eaff); break; } }   /* M19: a warm lamp lights the player warm */
    var near2 = NEAR_POLE_M * NEAR_POLE_M;
    for (k = 0; k < lights.length; k++) { f = lightFix[k]; if (f < 0) { lightTarget[k] = 0; continue; }
      if (night) lightTarget[k] = LIGHT_NIGHT; else { var ddx = px[f] - pxp, ddz = pz[f] - pzp; lightTarget[k] = (ddx * ddx + ddz * ddz <= near2) ? LIGHT_DAY_NEAR : 0; } }
  }
  function tick(dt) {
    if (!built || !lights.length) return;
    dt = (dt > 0 && dt < 0.1) ? dt : 0.016; acc += dt;
    if (acc >= HOP_INTERVAL_S) { acc = 0; assign(); }
    var a = Math.min(1, dt * FADE_RATE);
    for (var k = 0; k < lights.length; k++) { var L = lights[k], t = lightTarget[k], c = L.intensity; if (c === t) continue; var d = t - c; L.intensity = (d > -0.05 && d < 0.05) ? t : c + d * a; }
  }
  function setNight(nt) {
    night = !!nt; if (!built) return;
    headMat.emissiveIntensity = night ? HEAD_EMISSIVE_NIGHT : HEAD_EMISSIVE_DAY; if (poolMat) poolMat.opacity = night ? nightAlpha : dayAlpha; if (streaks) streaks.setNight(night);
    acc = 0; assign();   /* retarget the light intensities now; tick() eases them */
  }
  function dispose() {
    if (group && group.parent) group.parent.remove(group);
    for (var k = 0; k < lights.length; k++) if (lights[k].dispose) lights[k].dispose();
    lights.length = 0; lightFix.length = 0; lightTarget.length = 0;
    geos.forEach(function (g) { g.dispose(); }); geos.length = 0;
    if (headMat) headMat.dispose(); if (poolMat) poolMat.dispose(); if (poolTex) poolTex.dispose(); if (streaks) streaks.dispose(); streaks = null; lampList = [];
    poles = arms = heads = pools = headMat = poolMat = poolTex = group = null; built = false; n = 0; drawCalls = 0;
  }
  function debug() {
    var fams = {}; (lampFam || []).forEach(function (f) { fams[f] = (fams[f] || 0) + 1; });
    var ls = []; for (var k = 0; k < lights.length; k++) ls.push({ fixture: lightFix[k] >= 0 ? lightFix[k] : null, intensity: +lights[k].intensity.toFixed(2), target: lightTarget[k] });
    return { fixtures: n, lamp_families: fams, dynamic_lights: lights.length, draw_calls: drawCalls, night: night, head_emissive: headMat ? headMat.emissiveIntensity : null, pool_alpha: poolMat ? poolMat.opacity : null, lights: ls };
  }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug };
}
