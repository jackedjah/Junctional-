/* MAHWORLD M5 OWNER CORRECTION :: SKY LAYERS
   The registry's one wind vector drives the world-fixed cloud sheets and one deterministic optical-density field. That shared field
   is sampled on the stable Sun/Moon directions and sent to celestial.js: T = exp(-tau) consistently controls disc, halo, rays and
   the real field key. Low/mid sheets remain depth-writing cloud bodies; high cirrus remains a non-occluding veil. */
import { celestialDirection, cloudEdgeAlpha, createCloudGeometry } from './celestial.js';

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function smooth(a, b, x) { var t = clamp01((x - a) / Math.max(1e-6, b - a)); return t * t * (3 - 2 * t); }
function frac(v) { return v - Math.floor(v); }
function hashId(s) { var h = 2166136261; for (var i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

export function celestialWindTravel(sky, seconds) {
  var W = sky && sky.wind || {}, speed = isFinite(+W.speed_mps) ? +W.speed_mps : 2.4, gust = isFinite(+W.gust) ? +W.gust : 0, period = isFinite(+W.gust_period_s) && +W.gust_period_s > 0 ? +W.gust_period_s : 17, t = Math.max(0, isFinite(+seconds) ? +seconds : 0), omega = Math.PI * 2 / period;
  return speed * ((1 + gust * 0.5) * t + gust * 0.5 * (1 - Math.cos(omega * t)) / omega);
}

/* Pure, allocation-optional diagnostic/test seam. It is an intentionally bounded real-time approximation, not a volumetric solver. */
export function celestialCloudOptics(sky, direction, seconds, night, out) {
  sky = sky || {}; direction = direction || [0, 1, 0]; out = out || {}; var W = sky.wind || {}, P = sky.celestial_optics || {};
  var speed = isFinite(+W.speed_mps) ? +W.speed_mps : 2.4, windA = (isFinite(+W.dir_deg) ? +W.dir_deg : 0) * Math.PI / 180, travel = celestialWindTravel(sky, seconds);
  var windX = Math.sin(windA), windZ = Math.cos(windA), heading = Math.atan2(direction[0], direction[2]); var tau = 0, weighted = 0, weight = 0;
  var layers = sky.layers || []; for (var i = 0; i < layers.length; i++) { var L = layers[i]; if (!L || L.kind !== 'CLOUD') continue; var seed = hashId(L.id || i), drift = isFinite(+L.drift_scale) ? +L.drift_scale : 1, wavelength = Math.max(36, ((L.size_m && (+L.size_m[0] + +L.size_m[1]) * 0.5) || 110) * 0.72); var along = direction[0] * windX + direction[2] * windZ;
    var phase = travel * drift * Math.PI * 2 / wavelength + heading * (1.35 + seed) + along * 1.8 + seed * Math.PI * 8;
    var field = 0.5 + 0.255 * Math.sin(phase) + 0.155 * Math.sin(phase * 0.47 + seed * 11.3) + 0.09 * Math.cos(phase * 1.93 - seed * 7.1);
    var cover = smooth(0.34, 0.76, field), opacity = night ? (L.opacity_night === undefined ? 0.3 : +L.opacity_night) : (L.opacity_day === undefined ? 0.6 : +L.opacity_day);
    var depthScale = L.occludes ? (P.occluding_tau_scale === undefined ? 1.45 : +P.occluding_tau_scale) : (P.cirrus_tau_scale === undefined ? 0.42 : +P.cirrus_tau_scale); var alpha = clamp01(cover * opacity * depthScale); tau += -Math.log(Math.max(0.06, 1 - alpha)); weighted += cover * opacity; weight += opacity; }
  var maxTau = P.max_tau === undefined ? 2.2 : Math.max(0.1, +P.max_tau); tau = Math.min(maxTau, Math.max(0, tau)); var T = Math.exp(-tau), minKey = P.min_key_transmission === undefined ? 0.38 : clamp01(+P.min_key_transmission);
  out.tau = tau; out.transmission = T; out.coverage = 1 - T; out.layer_coverage = weight > 0 ? weighted / weight : 0; out.disc = 0.42 + 0.58 * T; out.halo = Math.pow(T, 1.35); out.rays = Math.pow(T, 2); out.key = minKey + (1 - minKey) * T;
  out.phase_u = frac(travel * windX / 180 + heading / (Math.PI * 2)); out.phase_v = frac(travel * windZ / 260 + 0.17); out.seconds = seconds; out.travel_m = travel; return out;
}

export function createSky(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var reg = ctx.registry || {}, S = reg.sky || null;
  var group = null, layers = [], own = [], night = !!ctx.night, clock = 0; var wind = { dir: 0, x: 0, z: 1, speed: 0, gust: 0, period: 17, t: 0, now: 0 }; var mist = null, mistMat = null;
  var _m = null, _p = null, _q = null, _s = null, _e = null, _c = null; var SUN = { x: 0.6, z: 0.32 }, MOON = { x: -0.6, z: -0.32 };
  var dirs = { sun: [0, 1, 0], moon: [0, 1, 0] }, optics = { sun: {}, moon: {} };

  function blobTexture(seed) { var c = document.createElement('canvas'); c.width = 320; c.height = 112; var g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); var s = (seed >>> 0) || 1; var r = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; for (var i = 0; i < 13; i++) { var x = 24 + i / 12 * 272 + (r() - 0.5) * 10, y = 64 - (i % 3 === 1 ? 16 : 0) + (r() - 0.5) * 16, rx = 27 + r() * 20, ry = 18 + r() * 12; g.save(); g.translate(x, y); g.scale(1, ry / rx); var gr = g.createRadialGradient(-rx * 0.16, -rx * 0.18, rx * 0.05, 0, 0, rx); gr.addColorStop(0, 'rgba(102,123,158,0.9)'); gr.addColorStop(0.55, 'rgba(65,84,118,0.76)'); gr.addColorStop(0.8, 'rgba(178,207,239,0.42)'); gr.addColorStop(1, 'rgba(38,56,84,0)'); g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); } var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; own.push(t); return t; }
  function cloudMaskTexture(size, seed) { var c = document.createElement('canvas'); c.width = c.height = size; var g = c.getContext('2d'), im = g.createImageData(size, size), d = im.data; for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) { var a = Math.round(255 * cloudEdgeAlpha((x + 0.5) / size, (y + 0.5) / size, seed)), o = (y * size + x) * 4; d[o] = d[o + 1] = d[o + 2] = a; d[o + 3] = 255; } g.putImageData(im, 0, 0); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; own.push(t); return t; }
  function ringTexture() { var c = document.createElement('canvas'); c.width = 8; c.height = 128; var g = c.getContext('2d'); var gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128); var t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; own.push(t); return t; }
  function opacityFor(L) { return night ? (L.opacity_night === undefined ? 0.3 : L.opacity_night) : (L.opacity_day === undefined ? 0.6 : L.opacity_day); }
  function publishOptics() { if (!S) return; celestialCloudOptics(S, dirs.sun, clock, night, optics.sun); celestialCloudOptics(S, dirs.moon, clock, night, optics.moon); ctx.skyOptics = optics; var cel = ctx.mods && ctx.mods.celestial; if (cel && cel.setCloudState) cel.setCloudState(optics); }

  function build() {
    if (!S) { log('sky: registry.sky missing — nothing built'); return; }
    group = new THREE.Group(); group.name = 'MAHWORLD_SKY_LAYERS'; group.userData.noMerge = true; ctx.group.add(group);
    _m = new THREE.Matrix4(); _p = new THREE.Vector3(); _q = new THREE.Quaternion(); _s = new THREE.Vector3(); _e = new THREE.Euler(); _c = new THREE.Color();
    dirs.sun = celestialDirection(reg.celestial && reg.celestial.sun, 'sun'); dirs.moon = celestialDirection(reg.celestial && reg.celestial.moon, 'moon'); var sd = dirs.sun, sl = Math.hypot(sd[0], sd[2]) || 1, md = dirs.moon, ml = Math.hypot(md[0], md[2]) || 1; SUN.x = sd[0] / sl; SUN.z = sd[2] / sl; MOON.x = md[0] / ml; MOON.z = md[2] / ml;
    var W = S.wind || {}; wind.dir = (W.dir_deg || 0) * Math.PI / 180; wind.x = Math.sin(wind.dir); wind.z = Math.cos(wind.dir); wind.speed = W.speed_mps || 2; wind.gust = W.gust || 0; wind.period = W.gust_period_s || 17; ctx.wind = wind;
    var rnd = ctx.rnd ? ctx.rnd(0x5C7) : Math.random;
    (S.layers || []).forEach(function (L, li) {
      if (L.kind === 'MIST') { var r0 = L.ring_r_m ? L.ring_r_m[0] : 190, r1 = L.ring_r_m ? L.ring_r_m[1] : 520; var g = new THREE.RingGeometry(r0, r1, 96, 1); g.rotateX(-Math.PI / 2); var uv = g.attributes.uv, pos = g.attributes.position; for (var i = 0; i < uv.count; i++) { var d = Math.hypot(pos.getX(i), pos.getZ(i)); uv.setXY(i, Math.atan2(pos.getZ(i), pos.getX(i)) * 2, (d - r0) / (r1 - r0)); } uv.needsUpdate = true;
        mistMat = new THREE.MeshBasicMaterial({ map: ringTexture(), color: new THREE.Color(L.color || '#c9d8e6'), transparent: true, opacity: opacityFor(L), depthWrite: false, fog: false, side: THREE.DoubleSide }); own.push(mistMat); mist = new THREE.Mesh(g, mistMat); mist.name = 'SKY_MIST_' + L.id; mist.position.set(0, L.alt_m || 6, 118); mist.renderOrder = 3; mist.frustumCulled = false; mist.userData.noMerge = true; group.add(mist); layers.push({ id: L.id, kind: 'MIST', mesh: mist, mat: mistMat, L: L }); return; }
      var count = L.count || 20; try { var qt = ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; if (qt === 'LOW') count = Math.max(6, Math.round(count * 0.5)); else if (qt === 'MED') count = Math.max(8, Math.round(count * 0.75)); } catch (e) { }
      var shapeSeed = 0x9e + li * 131, geo = createCloudGeometry(THREE, shapeSeed, 40); geo.rotateX(-Math.PI / 2); var mat = new THREE.MeshBasicMaterial({ map: blobTexture(shapeSeed), alphaMap: cloudMaskTexture(96, shapeSeed), color: new THREE.Color(L.color || '#ffffff'), transparent: true, opacity: opacityFor(L), depthTest: true, depthWrite: !!L.occludes, alphaTest: L.occludes ? 0.055 : 0.012, fog: L.alt_m < 200, side: THREE.DoubleSide }); own.push(mat);
      var im = new THREE.InstancedMesh(geo, mat, count); im.name = 'SKY_' + L.id; im.frustumCulled = false; im.userData.noMerge = true; im.renderOrder = 4 + li; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.userData.cloudSilhouette = geo.userData.cloudSilhouette;
      var spread = L.spread_m || 600, items = []; for (var k = 0; k < count; k++) { var w = (L.size_m ? L.size_m[0] : 60) + rnd() * ((L.size_m ? L.size_m[1] : 140) - (L.size_m ? L.size_m[0] : 60)), x0 = (rnd() - 0.5) * spread, z0 = 118 + (rnd() - 0.5) * spread; items.push({ x: x0, z: z0, x0: x0, z0: z0, y: (L.alt_m || 150) + (rnd() - 0.5) * 24, w: w, h: w * (0.22 + rnd() * 0.11), yaw: rnd() * Math.PI, drift: 0.7 + rnd() * 0.6 }); }
      group.add(im); layers.push({ id: L.id, kind: 'CLOUD', mesh: im, mat: mat, items: items, spread: spread, L: L }); writeLayer(layers[layers.length - 1]);
    });
    publishOptics(); log('sky: wind ' + (S.wind ? S.wind.dir_deg + '° ' + S.wind.speed_mps + ' m/s' : 'none') + ', ' + layers.length + ' layers (' + layers.map(function (l) { return l.id; }).join(', ') + '), shared celestial optics');
  }
  function writeLayer(Ly) { var im = Ly.mesh, lit = Ly.L.kind === 'CLOUD', key = night ? MOON : SUN; for (var i = 0; i < Ly.items.length; i++) { var it = Ly.items[i]; _p.set(it.x, it.y, it.z); _e.set(0, it.yaw, 0); _q.setFromEuler(_e); _s.set(it.w, 1, it.h); _m.compose(_p, _q, _s); im.setMatrixAt(i, _m); if (lit) { var dx = it.x, dz = it.z - 118, dl = Math.hypot(dx, dz) || 1, k = 0.5 + 0.5 * ((dx / dl) * key.x + (dz / dl) * key.z), b = night ? 0.48 + 0.3 * k : 0.7 + 0.3 * k; _c.setRGB(b * (1 + (night ? 0.02 : 0.08) * k), b * (1 + (night ? 0.07 : 0.03) * k), b * (1 + (night ? 0.16 : -0.04) * k)); im.setColorAt(i, _c); } } im.instanceMatrix.needsUpdate = true; if (lit && im.instanceColor) im.instanceColor.needsUpdate = true; }
  function tick(dt, t) { clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); if (!layers.length) return; var gust = 1 + wind.gust * (0.5 + 0.5 * Math.sin(clock * 2 * Math.PI / wind.period)), travel = celestialWindTravel(S, clock); wind.t = clock; wind.now = wind.speed * gust; wind.travel = travel;
    for (var l = 0; l < layers.length; l++) { var Ly = layers[l]; if (Ly.kind === 'MIST') { Ly.mesh.rotation.y = clock * 0.004; if (Ly.mat.map) Ly.mat.map.offset.x = clock * 0.002; continue; } var layerDrift = Ly.L.drift_scale || 1, half = Ly.spread / 2; for (var i = 0; i < Ly.items.length; i++) { var it = Ly.items[i], dx = wind.x * travel * layerDrift * it.drift, dz = wind.z * travel * layerDrift * it.drift; it.x = ((it.x0 + dx + half) % Ly.spread + Ly.spread) % Ly.spread - half; it.z = 118 + (((it.z0 - 118 + dz + half) % Ly.spread + Ly.spread) % Ly.spread - half); } writeLayer(Ly); }
    publishOptics();
  }
  function setNight(n) { night = !!n; layers.forEach(function (Ly) { Ly.mat.opacity = opacityFor(Ly.L); if (Ly.kind === 'CLOUD') writeLayer(Ly); }); publishOptics(); }
  function dispose() { layers.forEach(function (Ly) { if (Ly.mesh.parent) Ly.mesh.parent.remove(Ly.mesh); Ly.mesh.geometry.dispose(); }); layers = []; own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; if (group && group.parent) group.parent.remove(group); group = null; if (ctx.skyOptics === optics) ctx.skyOptics = null; }
  function opticDebug(o) { return { tau: +o.tau.toFixed(3), transmission: +o.transmission.toFixed(3), coverage: +o.coverage.toFixed(3), disc: +o.disc.toFixed(3), halo: +o.halo.toFixed(3), rays: +o.rays.toFixed(3), key: +o.key.toFixed(3), phase_u: +o.phase_u.toFixed(3), phase_v: +o.phase_v.toFixed(3), travel_m: +(+o.travel_m || 0).toFixed(2) }; }
  function debug() { return { wind: { dir_deg: Math.round(wind.dir * 180 / Math.PI), speed_mps: wind.speed, now_mps: wind.now ? +wind.now.toFixed(2) : null, travel_m: wind.travel ? +wind.travel.toFixed(2) : 0, gust: wind.gust }, cloud_cards: 'OLD_SOFT_FEATHERED', cloud_key: night ? 'MOON' : 'SUN', layers: layers.map(function (L) { return { id: L.id, kind: L.kind, count: L.items ? L.items.length : 1, alt_m: L.L.alt_m, opacity: +L.mat.opacity.toFixed(2), occludes: !!L.L.occludes, depth_write: !!L.mat.depthWrite, silhouette: L.mesh.userData.cloudSilhouette || null, alpha_test: +(+L.mat.alphaTest || 0).toFixed(3) }; }), celestial_optics: { model: 'T=exp(-tau)', sun: opticDebug(optics.sun), moon: opticDebug(optics.moon) }, draw_calls: layers.length, night: night }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug, wind: function () { return wind; }, optics: function () { return optics; } };
}
