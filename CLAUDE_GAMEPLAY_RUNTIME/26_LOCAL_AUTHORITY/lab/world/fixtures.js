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
import { mergeGeometries } from '../../vendor/three/BufferGeometryUtils.js';

import { groundYAt } from './worldLayout.js';
export function createFixtures(ctx) {
  var THREE = ctx.THREE;
  var HEAD_EMISSIVE_DAY = 0.35, HEAD_EMISSIVE_NIGHT = 1.6;      /* luminaire emissiveIntensity (owner spec) */
  var LIGHT_NIGHT = 42, LIGHT_DAY_NEAR = 14;                     /* candela (three r155+ physical units, decay 2): ~1.1 irradiance right under the head at night; a subtle cool fill by day */
  var NEAR_POLE_M = 6, HOP_INTERVAL_S = 0.25, FADE_RATE = 8;     /* by day a light only wakes while the player is within 6 m of its pole; intensities ease toward their targets */
  var POOL_SIZE_M = 7, POOL_Y = 0.045, ARM_LEN_M = 1.4;          /* pool quad ~7 m, just above the plaza floor (0.012) with a polygon offset against z-fighting */
  var group = null, poles = null, arms = null, heads = null, pools = null, headMat = null, poolMat = null, poolTex = null, geos = [];
  var lights = [], lightFix = [], lightTarget = [];
  var n = 0, hx = null, hy = null, hz = null, px = null, pz = null;   /* head positions (light anchors) and pole feet (the near-pole test) */
  var bestIdx = null, bestD2 = null, bestN = 0;
  var F = null, night = !!ctx.night, acc = HOP_INTERVAL_S, built = false, dayAlpha = 0.05, nightAlpha = 0.45, headY = 0, drawCalls = 0;
  var tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1), yAxis = new THREE.Vector3(0, 1, 0);
  var dir = { x: 0, z: 0 };

  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function col(v, d) { try { return new THREE.Color(typeof v === 'string' && v ? v : d); } catch (e) { return new THREE.Color(d); } }
  function log(m) { if (ctx.log) ctx.log('fixtures: ' + m); }

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
    var poleGeo = new THREE.CylinderGeometry(0.055, 0.115, poleH, 10, 1); poleGeo.translate(0, poleH / 2, 0);
    var plinth = new THREE.CylinderGeometry(0.2, 0.27, 0.32, 10, 1); plinth.translate(0, 0.16, 0);
    var merged = null; try { merged = mergeGeometries([poleGeo, plinth], false); } catch (e) { merged = null; }
    if (merged) { poleGeo.dispose(); plinth.dispose(); poleGeo = merged; } else { plinth.dispose(); log('plinth merge unavailable — plain pole'); }
    var armGeo = new THREE.BoxGeometry(ARM_LEN_M, 0.09, 0.13); armGeo.translate(ARM_LEN_M / 2 - 0.06, 0, 0);   /* starts inside the pole, extends along +x (rotated per instance) */
    var headGeo = new THREE.CapsuleGeometry(0.15, 0.5, 3, 10); headGeo.rotateZ(Math.PI / 2);                   /* lies along the arm */
    var poolGeo = new THREE.PlaneGeometry(POOL_SIZE_M, POOL_SIZE_M); poolGeo.rotateX(-Math.PI / 2);
    geos.push(poleGeo, armGeo, headGeo, poolGeo);

    headMat = ctx.M.cyan.clone(); headMat.color.copy(col(F.head_color, '#bfe6ff')); headMat.emissive.copy(col(F.emissive, '#6fc3ff'));
    headMat.emissiveIntensity = night ? HEAD_EMISSIVE_NIGHT : HEAD_EMISSIVE_DAY; headMat.roughness = 0.22; headMat.metalness = 0.3; headMat.name = 'FIXTURE_HEAD';
    poolTex = makePoolTexture();
    if (poolTex) { poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: 0x6fd3ff, transparent: true, opacity: night ? nightAlpha : dayAlpha, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); poolMat.name = 'FIXTURE_POOL'; }
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
    }
    poles.instanceMatrix.needsUpdate = true; arms.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true; if (pools) pools.instanceMatrix.needsUpdate = true;
    [poles, arms, heads, pools].forEach(function (m) { if (m) { if (m.computeBoundingSphere) m.computeBoundingSphere(); m.frustumCulled = true; group.add(m); } });
    drawCalls = 3 + (pools ? 1 : 0);

    /* the few real lights: never shadow-casting, always present (a constant light count keeps one shader variant — intensity 0 is "off") */
    for (var k = 0; k < nLights; k++) { var L = new THREE.PointLight(0x8fdcff, 0, reach, 2); L.castShadow = false; L.name = 'FIXTURE_LIGHT_' + k; L.position.set(0, headY, 0); group.add(L); lights.push(L); lightFix.push(-1); lightTarget.push(0); }
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
      for (k = 0; k < lights.length; k++) if (lightFix[k] < 0) { lightFix[k] = idx; lights[k].position.set(hx[idx], hy[idx], hz[idx]); lights[k].intensity = 0; break; } }
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
    headMat.emissiveIntensity = night ? HEAD_EMISSIVE_NIGHT : HEAD_EMISSIVE_DAY; if (poolMat) poolMat.opacity = night ? nightAlpha : dayAlpha;
    acc = 0; assign();   /* retarget the light intensities now; tick() eases them */
  }
  function dispose() {
    if (group && group.parent) group.parent.remove(group);
    for (var k = 0; k < lights.length; k++) if (lights[k].dispose) lights[k].dispose();
    lights.length = 0; lightFix.length = 0; lightTarget.length = 0;
    geos.forEach(function (g) { g.dispose(); }); geos.length = 0;
    if (headMat) headMat.dispose(); if (poolMat) poolMat.dispose(); if (poolTex) poolTex.dispose();
    poles = arms = heads = pools = headMat = poolMat = poolTex = group = null; built = false; n = 0; drawCalls = 0;
  }
  function debug() {
    var ls = []; for (var k = 0; k < lights.length; k++) ls.push({ fixture: lightFix[k] >= 0 ? lightFix[k] : null, intensity: +lights[k].intensity.toFixed(2), target: lightTarget[k] });
    return { fixtures: n, dynamic_lights: lights.length, draw_calls: drawCalls, night: night, head_emissive: headMat ? headMat.emissiveIntensity : null, pool_alpha: poolMat ? poolMat.opacity : null, lights: ls };
  }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug };
}
