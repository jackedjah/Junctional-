/* MAHPLAZA :: SCENE ASSEMBLY  (MAHWORLD development scene v2)

   The broad establishing view of MAHPLAZA — MAH GYM, MAH MATCH, MAH MARKET —
   as a running, navigable-feeling place: the wet plaza and its circulation,
   the three destinations with readable interiors, crystalline residents of
   many player colours, diamond vegetation, FOB-inspired vehicles, the
   FOBEAM / FOBLOW sky, and a real-time-anchored day / night cycle owned by
   the world clock. Built on the permitted renderer only (Three.js 0.185.1,
   vendored). No game systems, no player, no network, no HUD baked into the
   world; the page's development HUD is separate and hideable.

   The viewer's world THEME recolours environmental energy only; every
   resident keeps its own player's colour. */
import * as THREE from '../vendor/three/three.module.min.js';
import { createWorldClock } from './world-clock.js';
import { createMaterials, resolveTheme } from './materials.js';
import { buildGround } from './ground.js';
import { buildBuildings } from './buildings.js';
import { buildSky } from './sky.js';

export const VIEWS = {
  establishing:     { pos: [0.6, 3.0, 42],   look: [0, 8.5, -46],  fov: 56 },
  'in-world':       { pos: [3.5, 1.9, 28],   look: [-1, 7.0, -46], fov: 60 },
  'match-approach': { pos: [1.4, 1.9, -14],  look: [0, 6.5, -48],  fov: 58 },
  'gym-side':       { pos: [-8, 2.0, 18],    look: [-34, 6, -30],  fov: 56 },
  'market-side':    { pos: [8, 2.0, 18],     look: [34, 5, -30],   fov: 56 }
};
export const TOUR = ['establishing', 'in-world', 'match-approach'];

function reducedMotion() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function createMahplaza(canvas, options = {}) {
  const opts = Object.assign({ theme: 'canonical', time: null, pixelRatioCap: 2, hud: null }, options);
  const theme = resolveTheme(opts.theme);
  const clock = createWorldClock();
  if (opts.time) clock.freeze(opts.time);
  const state = { view: 'establishing', yaw: 0, pitch: 0, dolly: 0, touring: false, frames: 0, ms: 0, reduced: reducedMotion(), theme: theme.name, clock: null };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.pixelRatioCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d1f3e, 40, 420);
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 2000);
  const M = createMaterials(theme);

  /* wet reflections: mirrored copies of emissive elements under the floor, built from world matrices once the graph is placed */
  const reflections = new THREE.Group(); reflections.scale.y = -1; scene.add(reflections);
  const mirrorQueue = [];
  const reflect = (mesh, dim = 0.5) => { mirrorQueue.push([mesh, dim]); return mesh; };
  function buildReflections() {
    scene.updateMatrixWorld(true);
    mirrorQueue.forEach(([mesh, dim]) => {
      const c = new THREE.Mesh(mesh.geometry, mesh.material.clone()); const m = c.material;
      if (m.emissiveIntensity != null) m.emissiveIntensity *= dim;
      if (m.transparent && m.opacity != null) m.opacity *= dim;
      if (m.map && !m.emissive) m.color.multiplyScalar(dim);
      m.side = THREE.DoubleSide; c.matrixAutoUpdate = false; c.matrix.copy(mesh.matrixWorld); reflections.add(c);
    });
    mirrorQueue.length = 0;
  }

  const ctx = { THREE, scene, M, theme, clock, reflect, timeHooks: [], updateHooks: [], signMaterials: [], residentSpots: [], entranceLights: [] };

  /* ---- light rig ------------------------------------------------------- */
  const lights = { hemi: new THREE.HemisphereLight(0x2a4f8c, 0x05070c, 0.6), dir: new THREE.DirectionalLight(0x9fc3ff, 0.4), fill: new THREE.DirectionalLight(0x9dbdf0, 0.4) };
  lights.dir.position.set(-80, 120, 160);
  lights.fill.position.set(60, 40, 160);
  scene.add(lights.hemi, lights.dir, lights.fill);

  /* ---- the world ------------------------------------------------------- */
  buildGround(ctx);
  const buildings = buildBuildings(ctx);
  const sky = buildSky(ctx);

  /* entrance and plaza point lights, bounded */
  const pointLights = [];
  const addPoint = (p, color, intensity, distance) => { const l = new THREE.PointLight(color, intensity, distance, 2); l.position.copy(p); l.userData.base = intensity; scene.add(l); pointLights.push(l); return l; };
  ctx.entranceLights.forEach(p => addPoint(p, theme.energy, 120, 70));
  (ctx.roomLights || []).forEach(p => addPoint(p, 0xcfe4ff, 240, 40));
  if (ctx.arenaLight) addPoint(ctx.arenaLight, 0xbfdcff, 160, 40);
  addPoint(new THREE.Vector3(0, 2.4, 13), theme.energy, 45, 28);

  /* ---- optional populations: residents, flora, vehicles ---------------- */
  const populationSpots = [
    /* a pair conversing near the centre-left */
    { x: -8.5, z: 6, facing: 0.5, colour: 'blue', physique: 0.85, sex: 'm', pose: 'converse', seed: 1 },
    { x: -6.6, z: 7.6, facing: 0.5 + Math.PI, colour: 'purple', physique: 0.25, sex: 'f', pose: 'converse', seed: 2 },
    /* one heading toward MAH MATCH */
    { x: 2.5, z: -6, facing: Math.PI, colour: 'green', physique: 0.7, sex: 'm', pose: 'walk', seed: 3, walk: { from: [2.5, 4], to: [1.5, -18] } },
    /* two leaving MAH MARKET together */
    { x: 24, z: -14, facing: -0.6, colour: 'red', physique: 0.55, sex: 'f', pose: 'converse', seed: 4 },
    { x: 25.8, z: -12.2, facing: -0.6, colour: 'teal', physique: 0.35, sex: 'm', pose: 'walk', seed: 5 },
    /* a small group near MAH GYM */
    { x: -26, z: -9, facing: 1.2, colour: 'violet', physique: 0.5, sex: 'f', pose: 'stand', seed: 6 },
    { x: -28.3, z: -7, facing: -1.2, colour: 'platinum', physique: 0.9, sex: 'f', pose: 'converse', seed: 7 },
    { x: -24.2, z: -6.6, facing: 2.4, colour: 'blue', physique: 0.45, sex: 'm', pose: 'converse', seed: 8 },
    /* distant residents */
    { x: 12, z: -30, facing: Math.PI, colour: 'emerald', physique: 0.6, sex: 'm', pose: 'walk', seed: 9 },
    { x: -14, z: -34, facing: 0.3, colour: 'crimson', physique: 0.4, sex: 'f', pose: 'stand', seed: 10 },
    /* the seated social grouping at the left bench */
    { x: -19.6, z: 20.2, facing: 0.5, colour: 'crimson', physique: 0.5, sex: 'm', pose: 'seated', seed: 12 },
    { x: -16.8, z: 22.6, facing: 0.5 + Math.PI, colour: 'platinum', physique: 0.65, sex: 'm', pose: 'converse', seed: 13 }
  ].concat(ctx.residentSpots);
  let residents = [], flora = null, vehicles = null;
  const walkers = [];
  try {
    const R = await import('./residents.js');
    if (typeof R.populate === 'function') {
      residents = R.populate(scene, populationSpots) || [];
      residents.forEach((r, i) => { const s = populationSpots[i]; if (s && s.y) r.position.y = s.y; if (s && s.walk) walkers.push({ r, from: s.walk.from, to: s.walk.to, phase: Math.random() }); });
    }
  } catch (e) { console.info('MAHPLAZA: residents module not available yet —', e && e.message); }
  try {
    const F = await import('./flora-and-vehicles.js');
    if (typeof F.createPlanter === 'function' && ctx.planterSpots) {
      flora = ctx.planterSpots.map((s, i) => { const p = F.createPlanter({ theme, seed: 100 + i, size: s.size, shape: s.shape }); p.position.set(s.x, 0.16, s.z); scene.add(p); return p; });
    }
    if (typeof F.createVehicleRoute === 'function') {
      /* the vehicle route follows the corridors and crosses behind the district, low enough to read as craft, never over the plaza centre */
      const loop = [[-56, 15, 60], [-58, 18, -20], [-46, 22, -110], [20, 24, -136], [70, 21, -84], [66, 17, 10], [40, 15, 66], [-20, 14, 74]].map(p => new THREE.Vector3(...p));
      vehicles = F.createVehicleRoute(loop, { theme, count: 4, speed: 9 });
      if (vehicles && vehicles.group) scene.add(vehicles.group);
    }
  } catch (e) { console.info('MAHPLAZA: flora / vehicles module not available yet —', e && e.message); }

  buildReflections();

  /* ---- environment map from the sky itself, refreshed as the day turns --- */
  const pmrem = new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader();
  let envRT = null, envDaylight = -1;
  const envScene = new THREE.Scene();
  const envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
  const envCols = new Float32Array(envDome.geometry.attributes.position.count * 3); envDome.geometry.setAttribute('color', new THREE.BufferAttribute(envCols, 3)); envScene.add(envDome);
  const envSun = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); envScene.add(envSun);
  const envFloor = new THREE.Mesh(new THREE.CircleGeometry(48, 24), new THREE.MeshBasicMaterial({ color: 0x05070c, side: THREE.DoubleSide })); envFloor.rotation.x = Math.PI / 2; envFloor.position.y = -0.5; envScene.add(envFloor);
  function refreshEnvironment(k, clockState) {
    const pos = envDome.geometry.attributes.position, top = new THREE.Color(k.top), hor = new THREE.Color(k.horizon), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const ny = Math.max(0, pos.getY(i) / 50); tmp.copy(hor).lerp(top, ny); envCols[i * 3] = tmp.r; envCols[i * 3 + 1] = tmp.g; envCols[i * 3 + 2] = tmp.b; }
    envDome.geometry.attributes.color.needsUpdate = true;
    envSun.position.copy(lights.dir.position).normalize().multiplyScalar(45); envSun.lookAt(0, 0, 0);
    envSun.material.color.setHex(k.sun).multiplyScalar(0.4 + 1.6 * clockState.daylight);
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0.04, 0.1, 200);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.55 + 0.6 * clockState.daylight;
    envDaylight = clockState.daylight;
  }

  /* ---- time of day ------------------------------------------------------- */
  let lastApplied = null;
  function applyTime(force) {
    const s = clock.state(); state.clock = s;
    if (!force && lastApplied && Math.abs(lastApplied.sunElevation - s.sunElevation) < 0.004 && lastApplied.worldHour === s.worldHour) return s;
    lastApplied = s;
    const k = sky.setTime(s, lights);
    M.setTime(s);
    renderer.toneMappingExposure = k.exposure;
    pointLights.forEach(l => { l.intensity = l.userData.base * (1 - 0.7 * s.daylight); });
    ctx.timeHooks.forEach(h => { try { h(s); } catch (e) {} });
    residents.forEach(r => { if (r.userData && r.userData.setEnergy) r.userData.setEnergy(1 - s.daylight); });
    if (flora) flora.forEach(p => { if (p.userData && p.userData.setTime) p.userData.setTime(s); });
    if (vehicles && vehicles.setTime) vehicles.setTime(s);
    if (Math.abs(s.daylight - envDaylight) > 0.06) refreshEnvironment(k, s);
    return s;
  }

  /* ---- camera ------------------------------------------------------------ */
  const cur = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 54 }, from = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 54 };
  let anim = null;
  const applyView = n => { const v = VIEWS[n]; cur.pos.set(...v.pos); cur.look.set(...v.look); cur.fov = v.fov; };
  applyView('establishing');
  const dirV = new THREE.Vector3(), rightV = new THREE.Vector3(), targetV = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0);
  function placeCamera() {
    dirV.subVectors(cur.look, cur.pos).normalize().applyAxisAngle(upV, state.yaw);
    rightV.crossVectors(dirV, upV).normalize(); dirV.applyAxisAngle(rightV, state.pitch).normalize();
    camera.position.copy(cur.pos).addScaledVector(dirV, state.dolly); if (camera.position.y < 0.7) camera.position.y = 0.7;
    targetV.copy(camera.position).addScaledVector(dirV, 60); camera.lookAt(targetV);
    camera.fov = cur.fov + (state.fovBias || 0); camera.updateProjectionMatrix();
  }
  function setView(name, { instant = false, duration = 2800 } = {}) {
    if (!VIEWS[name]) return Promise.resolve(false);
    state.view = name; state.yaw = 0; state.pitch = 0; state.dolly = 0;
    if (instant || state.reduced) { applyView(name); anim = null; requestRender(); return Promise.resolve(true); }
    from.pos.copy(cur.pos); from.look.copy(cur.look); from.fov = cur.fov;
    return new Promise(resolve => { anim = { t0: performance.now(), dur: duration, to: VIEWS[name], resolve }; requestRender(); });
  }
  async function tour({ hold = 900, leg = 3800 } = {}) {
    if (state.touring) return false; state.touring = true;
    try { await setView(TOUR[0], { instant: true }); await sleep(hold); for (let i = 1; i < TOUR.length; i++) { await setView(TOUR[i], { duration: leg }); await sleep(hold); } } finally { state.touring = false; }
    return true;
  }

  /* pointer: drag to look, wheel / pinch to move along the view */
  let drag = null, pinch = null; const el = canvas; el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { if (state.touring) return; el.setPointerCapture(e.pointerId); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch }; });
  el.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const dx = (e.clientX - drag.x) / el.clientWidth, dy = (e.clientY - drag.y) / el.clientHeight; state.yaw = THREE.MathUtils.clamp(drag.yaw - dx * 1.7, -1.1, 1.1); state.pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.9, -0.4, 0.45); requestRender(); });
  const endDrag = e => { if (drag && e.pointerId === drag.id) drag = null; };
  el.addEventListener('pointerup', endDrag); el.addEventListener('pointercancel', endDrag);
  el.addEventListener('wheel', e => { e.preventDefault(); state.dolly = THREE.MathUtils.clamp(state.dolly + (e.deltaY < 0 ? 1.2 : -1.2), -10, 40); requestRender(); }, { passive: false });
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  el.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = { d: dist(e.touches), dolly: state.dolly }; }, { passive: true });
  el.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { state.dolly = THREE.MathUtils.clamp(pinch.dolly + (dist(e.touches) - pinch.d) / 20, -10, 40); requestRender(); } }, { passive: true });
  el.addEventListener('touchend', () => { pinch = null; });

  /* ---- loop --------------------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    state.fovBias = camera.aspect < 0.8 ? 16 : camera.aspect < 1.1 ? 7 : 0;
    placeCamera();
  }
  window.addEventListener('resize', () => { resize(); requestRender(); });
  resize();
  let raf = 0, last = performance.now(), hidden = false, lastClockCheck = 0;
  function requestRender() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (now - lastClockCheck > 1000 || !lastApplied) { lastClockCheck = now; applyTime(false); }
    if (anim) { const k = Math.min(1, (now - anim.t0) / anim.dur), e = ease(k); cur.pos.lerpVectors(from.pos, new THREE.Vector3(...anim.to.pos), e); cur.look.lerpVectors(from.look, new THREE.Vector3(...anim.to.look), e); cur.fov = from.fov + (anim.to.fov - from.fov) * e; if (k >= 1) { const r = anim.resolve; anim = null; r(true); } }
    if (!state.reduced) {
      const t = now / 1000;
      residents.forEach(r => { if (r.userData && r.userData.update) r.userData.update(t, dt); });
      walkers.forEach(w => { w.phase = (w.phase + dt * 0.02) % 1; const k = 0.5 - 0.5 * Math.cos(w.phase * Math.PI * 2); w.r.position.x = w.from[0] + (w.to[0] - w.from[0]) * k; w.r.position.z = w.from[1] + (w.to[1] - w.from[1]) * k; });
      if (vehicles && vehicles.update) vehicles.update(t);
      sky.update(now);
      ctx.updateHooks.forEach(h => h(t, dt));
    }
    placeCamera();
    const t0 = performance.now(); renderer.render(scene, camera);
    state.ms = state.ms * 0.9 + (performance.now() - t0) * 0.1; state.frames++;
    if (opts.hud) opts.hud(state);
    if (!hidden && (anim || !state.reduced)) raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (!hidden) { applyTime(true); requestRender(); } });
  applyTime(true);
  requestRender();

  const ready = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => new Promise(r => requestAnimationFrame(() => r(true))));

  return {
    version: 'mahplaza-v2',
    views: Object.keys(VIEWS), setView, tour, ready, state, clock, camera, scene, renderer, buildings,
    residents, flora, vehicles, theme,
    /* validation: pin or release world time */
    setTime(spec) { if (spec == null || spec === 'live') clock.release(); else clock.freeze(spec); applyTime(true); requestRender(); return clock.state(); },
    renderOnce() { requestRender(); },
    dispose() { cancelAnimationFrame(raf); if (envRT) envRT.dispose(); pmrem.dispose(); renderer.dispose(); }
  };
}
