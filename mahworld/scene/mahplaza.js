/* MAHPLAZA :: SCENE ASSEMBLY  (MAHWORLD development scene v3 — the reference-locked plaza slice)

   MAHPLAZA — MAH GYM, MAH MATCH, MAH MARKET — as a running, explorable place:
   the plaza and its circulation, the three destinations with readable
   interiors, crystalline residents of many player colours, diamond vegetation,
   square-diamond sky craft, the FOBEAM / FOBLOW sky, and a real-time-anchored
   day / night cycle owned by the world clock. Built on the permitted renderer
   only (Three.js 0.185.1, vendored). No game systems, no network, no HUD baked
   into the world; the page's development controls are separate and hideable.

   THREE INDEPENDENT APPEARANCE OWNERS (brief §12):
     world Theme  → environmental energy only (seams, signs, sky infrastructure,
                    plants, craft). Viewer-local.
     local avatar → the viewer's own resident ('self'), chosen separately.
     remote avatars → every other resident keeps ITS OWN colour; the viewer's
                    world Theme never repaints anyone. In this preview all
                    "other players" are labelled local fixtures.
   There is no global tint, filter, overlay or material overwrite anywhere. */
import * as THREE from '../vendor/three/three.module.min.js';
import { createWorldClock } from './world-clock.js';
import { createMaterials, resolveTheme, THEMES } from './materials.js';
import { buildGround } from './ground.js';
import { buildBuildings } from './buildings.js';
import { buildSky } from './sky.js';

export const VIEWS = {
  establishing:      { pos: [0.6, 3.0, 42],    look: [0, 8.5, -46],    fov: 56, label: 'Arrival' },
  'in-world':        { pos: [3.5, 1.9, 28],    look: [-1, 7.0, -46],   fov: 60, label: 'In-world' },
  'match-approach':  { pos: [1.4, 1.9, -14],   look: [0, 6.5, -48],    fov: 58, label: 'Toward MAH MATCH' },
  'match-entrance':  { pos: [0.4, 3.0, -37],   look: [0, 4.8, -60],    fov: 54, label: 'MAH MATCH entrance', portrait: { pos: [0.4, 3.4, -28], look: [0, 5.4, -60], fov: 58 } },
  'gym-entrance':    { pos: [-20, 2.2, -8],    look: [-36, 6, -30],    fov: 56, label: 'MAH GYM entrance' },
  'market-entrance': { pos: [21, 2.0, -9],     look: [36, 4.5, -30],   fov: 56, label: 'MAH MARKET entrance' },
  residents:         { pos: [2.2, 1.7, 20.5],  look: [-0.6, 1.2, 12],  fov: 50, label: 'Residents' },
  appearance:        { pos: [0.8, 2.7, 26],    look: [0.2, 1.3, 12],   fov: 52, label: 'Appearance check' },
  'sky-plant':       { pos: [-11.5, 1.5, 28],  look: [-15, 4.5, 18],   fov: 54, label: 'Plant and sky' },
  practice:          { pos: [-10.5, 4.0, -66],  look: [-7, 2.4, -72],   fov: 54, label: 'Practice zone' },   /* from above the left tier, nothing between the camera and the marks */
  'gym-side':        { pos: [-8, 2.0, 18],     look: [-34, 6, -30],    fov: 56, label: 'Gym side' },
  'market-side':     { pos: [8, 2.0, 18],      look: [34, 5, -30],     fov: 56, label: 'Market side' }
};
export const TOUR = ['establishing', 'in-world', 'match-entrance'];
export const AVATAR_COLOURS = ['purple', 'green', 'blue', 'red', 'silver', 'teal', 'violet', 'emerald', 'crimson', 'platinum'];
const STORE = { world: 'fob.mahworld.preview.worldTheme', self: 'fob.mahworld.preview.selfColour' };

function reducedMotion() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const readStore = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const writeStore = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) {} };

export async function createMahplaza(canvas, options = {}) {
  const opts = Object.assign({ theme: null, self: null, time: null, pixelRatioCap: 2, hud: null, onSelect: null, onPractice: null, persist: true }, options);
  let theme = resolveTheme(opts.theme || (opts.persist && readStore(STORE.world)) || 'canonical');
  const clock = createWorldClock();
  if (opts.time) clock.freeze(opts.time);
  const state = { version: 'mahplaza-v3', view: 'establishing', yaw: 0, pitch: 0, dolly: 0, touring: false, frames: 0, ms: 0, reduced: reducedMotion(), theme: theme.name, clock: null, selection: null, practice: null, diagnostic: false, appearance: null };

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
  const mirrorQueue = [], themedReflections = [];
  const reflect = (mesh, dim = 0.4) => { mirrorQueue.push([mesh, dim]); return mesh; };
  function buildReflections() {
    scene.updateMatrixWorld(true);
    mirrorQueue.forEach(([mesh, dim]) => {
      const src = mesh.material, c = new THREE.Mesh(mesh.geometry, src.clone()); const m = c.material;
      if (m.emissiveIntensity != null) m.emissiveIntensity *= dim;
      if (m.transparent && m.opacity != null) m.opacity *= dim;
      if (m.map && !m.emissive) m.color.multiplyScalar(dim);
      m.side = THREE.DoubleSide; c.matrixAutoUpdate = false; c.matrix.copy(mesh.matrixWorld); reflections.add(c);
      if (src === M.energy || src === M.energyLight || src === M.energySoft) themedReflections.push([m, src]);
    });
    mirrorQueue.length = 0;
  }

  const ctx = { THREE, scene, M, theme, clock, reflect, timeHooks: [], updateHooks: [], signMaterials: [], residentSpots: [], entranceLights: [], actions: [] };

  /* ---- light rig ------------------------------------------------------- */
  const lights = { hemi: new THREE.HemisphereLight(0x2a4f8c, 0x05070c, 0.6), dir: new THREE.DirectionalLight(0x9fc3ff, 0.4), fill: new THREE.DirectionalLight(0x9dbdf0, 0.4) };
  lights.dir.position.set(-80, 120, 160);
  lights.fill.position.set(60, 40, 160);
  scene.add(lights.hemi, lights.dir, lights.fill);

  /* ---- the world ------------------------------------------------------- */
  buildGround(ctx);
  const buildings = buildBuildings(ctx);
  const sky = buildSky(ctx);

  /* entrance and plaza point lights, bounded (v3: entrance strength lowered for the glare correction) */
  const pointLights = [], themedLights = [];
  const addPoint = (p, color, intensity, distance, themed) => { const l = new THREE.PointLight(color, intensity, distance, 2); l.position.copy(p); l.userData.base = intensity; scene.add(l); pointLights.push(l); if (themed) themedLights.push(l); return l; };
  ctx.entranceLights.forEach(p => addPoint(p, theme.energy, 90, 64, true));
  (ctx.roomLights || []).forEach(p => addPoint(p, 0xcfe4ff, 220, 40));
  if (ctx.arenaLight) addPoint(ctx.arenaLight, 0xbfdcff, 140, 40);
  addPoint(new THREE.Vector3(0, 2.4, 13), 0xcfe4ff, 30, 26, false);   /* the plaza-centre light stays neutral: residents near the marker are lit, not tinted, by the world Theme */

  /* ---- population: 12 outdoor residents (self + 11 fixtures) and the building spots -- */
  const selfColour = (() => { const c = String(opts.self || (opts.persist && readStore(STORE.self)) || 'purple').toLowerCase(); return AVATAR_COLOURS.indexOf(c) > -1 ? c : 'purple'; })();
  const populationSpots = [
    /* the local avatar's stand-in, ahead of the appearance camera, facing the plaza */
    { id: 'self', role: 'self', x: 0.6, z: 21.5, facing: Math.PI, colour: selfColour, physique: 0.5, sex: 'm', pose: 'stand', seed: 40, note: 'the local avatar (preview stand-in)' },
    /* four labelled fixtures in the same frame: green (a beginner), red, blue, silver */
    { id: 'fixture-green', role: 'remote', x: -3.4, z: 15.5, facing: 2.07, colour: 'green', physique: 0.25, sex: 'f', pose: 'converse', seed: 41, note: 'local fixture' },
    { id: 'fixture-red', role: 'remote', x: -1.4, z: 14.4, facing: -1.07, colour: 'red', physique: 0.8, sex: 'm', pose: 'converse', seed: 42, note: 'local fixture' },
    { id: 'fixture-blue', role: 'remote', x: 3.4, z: 15.2, facing: 2.6, colour: 'blue', physique: 0.55, sex: 'm', pose: 'observe', seed: 43, note: 'local fixture' },
    { id: 'fixture-silver', role: 'remote', x: 1.2, z: 12.2, facing: 0.35, colour: 'silver', physique: 0.65, sex: 'f', pose: 'stand', seed: 44, note: 'local fixture' },
    /* a pair approaching MAH MATCH */
    { id: 'walker-teal', role: 'remote', x: 1.6, z: -8, facing: Math.PI, colour: 'teal', physique: 0.45, sex: 'm', pose: 'walk', seed: 45, walk: { from: [1.6, -6], to: [0.9, -26] } },
    { id: 'walker-violet', role: 'remote', x: -0.6, z: -9, facing: Math.PI, colour: 'violet', physique: 0.6, sex: 'f', pose: 'walk', seed: 46, walk: { from: [-0.6, -7], to: [-1.3, -27] } },
    /* near MAH GYM: a trained resident and a beginner */
    { id: 'gym-a', role: 'remote', x: -25, z: -8, facing: 1.2, colour: 'platinum', physique: 0.9, sex: 'f', pose: 'stand', seed: 47 },
    { id: 'gym-b', role: 'remote', x: -27.4, z: -6, facing: -1.2, colour: 'emerald', physique: 0.2, sex: 'm', pose: 'converse', seed: 48 },
    /* two leaving MAH MARKET together */
    { id: 'market-a', role: 'remote', x: 24, z: -14, facing: -0.6, colour: 'crimson', physique: 0.5, sex: 'f', pose: 'converse', seed: 49 },
    { id: 'market-b', role: 'remote', x: 25.8, z: -12.2, facing: 2.5, colour: 'blue', physique: 0.7, sex: 'm', pose: 'converse', seed: 50 },
    /* one seated at the left bench */
    { id: 'bench', role: 'remote', x: -19.6, z: 20.2, facing: 0.5, colour: 'red', physique: 0.5, sex: 'm', pose: 'seated', seed: 51 }
  ].concat(ctx.residentSpots.map(s => Object.assign({ role: 'remote' }, s)));
  let residents = [], flora = null, vehicles = null, R = null;
  const walkers = [], extras = [];
  try {
    R = await import('./residents.js');
    if (typeof R.populate === 'function') {
      residents = R.populate(scene, populationSpots) || [];
      residents.forEach((r, i) => { const s = populationSpots[i]; if (s && s.y) r.position.y = s.y; if (s && s.walk) walkers.push({ r, from: s.walk.from, to: s.walk.to, phase: Math.random() }); });
    }
  } catch (e) { console.info('MAHPLAZA: residents module not available —', e && e.message); }
  try {
    const F = await import('./flora-and-vehicles.js');
    if (typeof F.createPlanter === 'function' && ctx.planterSpots) {
      flora = ctx.planterSpots.map((s, i) => { const p = F.createPlanter({ theme, seed: 100 + i, size: s.size, shape: s.shape }); p.position.set(s.x, 0.16, s.z); scene.add(p); return p; });
    }
    if (typeof F.createVehicleRoute === 'function') {
      /* the craft route follows the corridors and crosses behind the district, never over the plaza centre */
      const loop = [[-56, 15, 60], [-58, 18, -20], [-46, 22, -110], [20, 24, -136], [70, 21, -84], [66, 17, 10], [40, 15, 66], [-20, 14, 74]].map(p => new THREE.Vector3(...p));
      vehicles = F.createVehicleRoute(loop, { theme, count: 3, speed: 8 });
      if (vehicles && vehicles.group) scene.add(vehicles.group);
    }
  } catch (e) { console.info('MAHPLAZA: flora / vehicles module not available —', e && e.message); }
  const byId = id => residents.find(r => r.userData && r.userData.id === id) || null;

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
    envSun.material.color.setHex(k.sun).multiplyScalar(0.4 + 1.4 * clockState.daylight);
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0.04, 0.1, 200);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.5 + 0.55 * clockState.daylight;
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
    renderer.toneMappingExposure = state.diagnostic ? 1.0 : k.exposure;
    pointLights.forEach(l => { l.intensity = l.userData.base * (1 - 0.7 * s.daylight) * (state.diagnostic ? 0.6 : 1); });
    ctx.timeHooks.forEach(h => { try { h(s); } catch (e) {} });
    const energy = state.diagnostic ? Math.min(0.3, 1 - s.daylight) : 1 - s.daylight;
    residents.concat(extras).forEach(r => { if (r.userData && r.userData.setEnergy) r.userData.setEnergy(energy); });
    if (flora) flora.forEach(p => { if (p.userData && p.userData.setTime) p.userData.setTime(s); });
    if (vehicles && vehicles.setTime) vehicles.setTime(s);
    if (Math.abs(s.daylight - envDaylight) > 0.06) refreshEnvironment(k, s);
    return s;
  }

  /* ---- appearance: three independent owners --------------------------------- */
  function residentFacts(r) {
    let mat = null, geo = null;
    r.traverse(o => { if (!mat && o.isMesh && /-body$/.test(o.material.name || '')) { mat = o.material; geo = o.geometry; } });
    let vertex = null;
    if (geo && geo.getAttribute('color')) { const c = geo.getAttribute('color'); const n = Math.min(c.count, 600); let rr = 0, gg = 0, bb = 0; for (let i = 0; i < n; i++) { rr += c.getX(i); gg += c.getY(i); bb += c.getZ(i); } vertex = new THREE.Color(rr / n, gg / n, bb / n).getHexString(); }
    return { id: r.userData.id, role: r.userData.role, colour: r.userData.colour, materialName: mat ? mat.name : null, emissiveHex: mat ? mat.emissive.getHexString() : null, vertexAverageHex: vertex, note: r.userData.note || null };
  }
  function describeAppearance() {
    const self = byId('self');
    const desc = {
      worldTheme: { name: theme.name, energyHex: new THREE.Color(theme.energy).getHexString(), energyMaterialEmissiveHex: M.energy.emissive.getHexString() },
      self: self ? residentFacts(self) : null,
      remotes: residents.filter(r => r.userData.role === 'remote').map(residentFacts),
      globalTint: { canvasCssFilter: (() => { try { return getComputedStyle(canvas).filter || 'none'; } catch (e) { return 'unavailable'; } })(), toneMappingExposure: renderer.toneMappingExposure, sceneOverlayMaterials: 0 },
      diagnostic: state.diagnostic
    };
    state.appearance = desc;
    return desc;
  }
  function setWorldTheme(name) {
    theme = M.retheme(name); ctx.theme = theme; state.theme = theme.name;
    sky.setTheme(theme);
    if (flora && flora.length) flora[0].userData.setTheme(theme);       /* shared per-theme set: one call retunes every planter and craft */
    else if (vehicles && vehicles.setTheme) vehicles.setTheme(theme);
    themedLights.forEach(l => l.color.setHex(theme.energy));
    themedReflections.forEach(([m, src]) => { if (m.emissive && src.emissive) m.emissive.copy(src.emissive); if (!src.emissive) m.color.copy(src.color); });
    if (opts.persist) writeStore(STORE.world, theme.name);
    applyTime(true); requestRender();
    return describeAppearance();
  }
  function recolourResident(r, colour) {
    if (!r || !R || typeof R.recolour !== 'function' || !R.isColour(colour)) return null;
    R.recolour(r, colour);
    r.userData.role = r === byId('self') ? 'self' : 'remote';
    applyTime(true); requestRender();
    return residentFacts(r);
  }
  function setSelfAppearance(colour) {
    const self = byId('self'); if (!self) return null;
    const facts = recolourResident(self, String(colour).toLowerCase());
    if (facts && opts.persist) writeStore(STORE.self, facts.colour);
    return describeAppearance();
  }
  function setRemoteAppearance(id, colour) {
    const r = byId(id); if (!r || r.userData.role !== 'remote') return null;
    recolourResident(r, String(colour).toLowerCase());
    return describeAppearance();
  }

  /* ---- diagnostic view: additive glow off, emissive capped, fixed exposure -------- */
  const additiveHidden = [];
  function setDiagnostic(on) {
    on = !!on; if (on === state.diagnostic) return on;
    state.diagnostic = on; M.setDiagnostic(on);
    if (on) { scene.traverse(o => { if ((o.isMesh || o.isSprite) && o.material && o.material.blending === THREE.AdditiveBlending && o.visible) { o.visible = false; additiveHidden.push(o); } }); }
    else { additiveHidden.forEach(o => { o.visible = true; }); additiveHidden.length = 0; }
    applyTime(true); requestRender();
    return on;
  }

  /* ---- camera ------------------------------------------------------------ */
  const cur = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 54 }, from = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 54 };
  let anim = null, portrait = false;
  const viewSpec = n => { const v = VIEWS[n]; return portrait && v.portrait ? v.portrait : v; };
  const applyView = n => { const v = viewSpec(n); cur.pos.set(...v.pos); cur.look.set(...v.look); cur.fov = v.fov; };
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
    if (anim && anim.resolve) { const r = anim.resolve; anim = null; r(false); }
    if (instant || state.reduced) { applyView(name); requestRender(); return Promise.resolve(true); }
    from.pos.copy(cur.pos); from.look.copy(cur.look); from.fov = cur.fov;
    return new Promise(resolve => { anim = { t0: performance.now(), dur: duration, to: viewSpec(name), resolve }; requestRender(); });
  }
  async function tour({ hold = 900, leg = 3800 } = {}) {
    if (state.touring) return false; state.touring = true;
    try { await setView(TOUR[0], { instant: true }); await sleep(hold); for (let i = 1; i < TOUR.length; i++) { await setView(TOUR[i], { duration: leg }); await sleep(hold); } } finally { state.touring = false; }
    return true;
  }

  /* ---- selection: tap a destination or an entrance action (preview navigation) ------- */
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const actionMeshes = []; ctx.actions.forEach(a => (a.meshes || [a.mesh]).forEach(m => actionMeshes.push(m)));
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(actionMeshes, false);
    if (!hits.length) return null;
    const id = hits[0].object.userData.action;
    return ctx.actions.find(a => a.id === id) || null;
  }
  function select(idOrNull) {
    const a = idOrNull ? ctx.actions.find(x => x.id === idOrNull) : null;
    state.selection = a ? { id: a.id, label: a.label, kind: a.kind, copy: a.copy || '', view: a.view || null, available: a.id !== 'find-opponent', status: a.id === 'find-opponent' ? 'unavailable' : (a.id === 'practice-buddy' ? 'local-preview' : 'preview-navigation') } : null;
    if (opts.onSelect) { try { opts.onSelect(state.selection); } catch (e) {} }
    return state.selection;
  }
  /* act on the selection: destinations move the camera; FIND AN OPPONENT stays honest; PRACTICE WITH A BUDDY runs the local preview */
  function go(id) {
    const a = ctx.actions.find(x => x.id === (id || (state.selection && state.selection.id)));
    if (!a) return Promise.resolve(false);
    if (a.kind === 'destination') return setView(a.view, { duration: 2600 });
    if (a.id === 'practice-buddy') return practicePreview();
    return Promise.resolve(false);        /* find-opponent: nothing to run — no live players, none simulated */
  }

  /* ---- the practice preview: enter → two proxies take positions → guard / strike / block / evade → reset → return -- */
  const practice = { running: false, aborted: false, timers: [], proxies: [], prevView: 'establishing', stepwise: false, gate: null };
  const wait = ms => new Promise((resolve, reject) => { if (practice.aborted) return reject(new Error('aborted')); const t = setTimeout(() => { practice.timers = practice.timers.filter(x => x !== t); practice.aborted ? reject(new Error('aborted')) : resolve(); }, state.reduced ? Math.min(ms, 400) : ms); practice.timers.push(t); });
  /* stepwise (evidence) mode: the sequence pauses at each step until practiceContinue() — used by the capture script, never by the page */
  const gate = () => { if (!practice.stepwise) return Promise.resolve(); state.practice.waiting = true; return new Promise((res, rej) => { practice.gate = { res, rej }; }); };
  function practiceContinue() { if (!practice.gate) return false; const g = practice.gate; practice.gate = null; if (state.practice) state.practice.waiting = false; g.res(); return true; }
  const step = async (name, detail) => { state.practice = { step: name, detail, startedAt: performance.now(), waiting: false }; if (opts.onPractice) { try { opts.onPractice(state.practice); } catch (e) {} } await gate(); };
  function practiceCleanup(reason) {
    practice.timers.forEach(clearTimeout); practice.timers.length = 0;
    practice.proxies.forEach(p => { scene.remove(p); const i = extras.indexOf(p); if (i > -1) extras.splice(i, 1); p.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); });
    practice.proxies.length = 0; practice.running = false;
    state.practice = null; if (opts.onPractice) { try { opts.onPractice(null, reason); } catch (e) {} }
    requestRender();
  }
  async function practicePreview({ stepwise = false } = {}) {
    if (practice.running || !R) return false;
    practice.running = true; practice.aborted = false; practice.prevView = state.view; practice.stepwise = !!stepwise; practice.gate = null;
    const selfR = byId('self'), buddyR = byId('fixture-blue');
    const P = ctx.practice;
    try {
      await step('enter', 'entering the practice zone (camera only — nothing about the account changes)');
      await setView('practice', { duration: 2600 }); await wait(300);
      await step('positions', 'two local proxies take the marks: your colour and a labelled buddy fixture');
      const mk = (src, colour, at, facing, id) => { const spec = src ? src.userData.spec : {}; const p = R.createResident({ colour, physique: spec.physique, sex: spec.sex, pose: 'guard', seed: 60 + practice.proxies.length, id }); p.position.copy(at); p.rotation.y = facing; p.userData.role = 'practice-proxy'; p.userData.note = 'local practice proxy'; p.scale.setScalar(0.01); scene.add(p); practice.proxies.push(p); extras.push(p); return p; };
      const A = mk(selfR, selfR ? selfR.userData.colour : 'purple', P.a, P.facingA, 'practice-proxy-self');
      const B = mk(buddyR, buddyR ? buddyR.userData.colour : 'blue', P.b, P.facingB, 'practice-proxy-buddy');
      applyTime(true);
      await tween(700, k => { A.scale.setScalar(k); B.scale.setScalar(k); });
      A.userData.setDrive({}); B.userData.setDrive({});
      await step('guard', 'both in guard'); await wait(800);
      await tween(340, k => A.userData.setDrive({ fwdR: 0.6 * k, elbowR: -1.55 * k, lean: 0.14 * k, yaw: -0.25 * k }));
      await step('strike', 'your proxy strikes (right arm extends)'); await wait(220);
      await tween(300, k => B.userData.setDrive({ fwdL: 0.7 * k, fwdR: 0.7 * k, elbowL: 0.15 * k, elbowR: 0.15 * k, lean: -0.06 * k }));
      await step('block', 'the buddy proxy blocks (both arms rise)'); await wait(500);
      await tween(340, k => A.userData.setDrive({ fwdR: 0.6 * (1 - k), elbowR: -1.55 * (1 - k), lean: 0.14 * (1 - k), yaw: -0.25 * (1 - k) }));
      await tween(420, k => B.userData.setDrive({ fwdL: 0.7 * (1 - k), fwdR: 0.7 * (1 - k), side: -0.55 * k, yaw: 0.5 * k, lean: -0.16 * k }));
      await step('evade', 'the buddy proxy evades (slips sideways)'); await wait(500);
      await tween(420, k => B.userData.setDrive({ side: -0.55 * (1 - k), yaw: 0.5 * (1 - k), lean: -0.16 * (1 - k) }));
      A.userData.setDrive(null); B.userData.setDrive(null);
      await step('reset', 'both return to guard, then the marks clear'); await wait(800);
      await tween(500, k => { A.scale.setScalar(1 - k); B.scale.setScalar(1 - k); });
      await step('return', 'returning to where you were');
      await setView(practice.prevView, { duration: 2400 });
      practiceCleanup('complete');
      return true;
    } catch (e) {
      /* an exit during the preview: restore the plaza context, leave nothing running */
      practiceCleanup('exited');
      if (String(e && e.message) !== 'aborted') console.info('MAHPLAZA practice preview stopped —', e && e.message);
      return false;
    } finally { select(null); }
  }
  function tween(ms, fn) {
    return new Promise((resolve, reject) => {
      if (practice.aborted) return reject(new Error('aborted'));
      const dur = state.reduced ? 1 : ms, t0 = performance.now();
      const hook = () => { const k = Math.min(1, (performance.now() - t0) / dur); fn(ease(k)); if (k >= 1 || practice.aborted) { ctx.updateHooks.splice(ctx.updateHooks.indexOf(hook), 1); practice.aborted ? reject(new Error('aborted')) : resolve(); } };
      ctx.updateHooks.push(hook); requestRender();
    });
  }
  function practiceExit() {
    if (!practice.running) return false;
    practice.aborted = true; practice.timers.forEach(clearTimeout); practice.timers.length = 0;
    if (practice.gate) { const g = practice.gate; practice.gate = null; g.rej(new Error('aborted')); }
    if (anim && anim.resolve) { const r = anim.resolve; anim = null; r(false); }
    practiceCleanup('exited');
    setView(practice.prevView, { instant: true });
    return true;
  }

  /* ---- pointer: tap selects, drag looks, wheel / pinch / keys move ------------ */
  let drag = null, pinch = null; const el = canvas; el.style.touchAction = 'none';
  const L = [];
  const on = (target, type, fn, o) => { target.addEventListener(type, fn, o); L.push([target, type, fn, o]); };
  on(el, 'pointerdown', e => { if (state.touring) return; el.setPointerCapture(e.pointerId); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch, t0: performance.now(), moved: 0 }; });
  on(el, 'pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const dx = (e.clientX - drag.x) / el.clientWidth, dy = (e.clientY - drag.y) / el.clientHeight; drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y)); if (drag.moved < 6) return; state.yaw = THREE.MathUtils.clamp(drag.yaw - dx * 1.7, -1.1, 1.1); state.pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.9, -0.4, 0.45); requestRender(); });
  const endDrag = e => { if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; if (e.type === 'pointerup' && d.moved < 8 && performance.now() - d.t0 < 450 && !pinch) { const a = pick(e.clientX, e.clientY); select(a ? a.id : null); } };
  on(el, 'pointerup', endDrag); on(el, 'pointercancel', endDrag);
  on(el, 'wheel', e => { e.preventDefault(); state.dolly = THREE.MathUtils.clamp(state.dolly + (e.deltaY < 0 ? 1.2 : -1.2), -10, 40); requestRender(); }, { passive: false });
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  on(el, 'touchstart', e => { if (e.touches.length === 2) pinch = { d: dist(e.touches), dolly: state.dolly }; }, { passive: true });
  on(el, 'touchmove', e => { if (pinch && e.touches.length === 2) { state.dolly = THREE.MathUtils.clamp(pinch.dolly + (dist(e.touches) - pinch.d) / 20, -10, 40); requestRender(); } }, { passive: true });
  on(el, 'touchend', () => { setTimeout(() => { pinch = null; }, 50); });
  on(window, 'keydown', e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') state.dolly = Math.min(40, state.dolly + 1.5);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') state.dolly = Math.max(-10, state.dolly - 1.5);
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') state.yaw = Math.min(1.1, state.yaw + 0.08);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') state.yaw = Math.max(-1.1, state.yaw - 0.08);
    else if (k === 'Escape') { if (practice.running) practiceExit(); else select(null); }
    else return;
    if (k.indexOf('Arrow') === 0) e.preventDefault();
    requestRender();
  });

  /* ---- loop --------------------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const wasPortrait = portrait; portrait = camera.aspect < 0.8;
    state.fovBias = camera.aspect < 0.8 ? 14 : camera.aspect < 1.1 ? 7 : 0;
    if (wasPortrait !== portrait && !anim) applyView(state.view);
    placeCamera();
  }
  on(window, 'resize', () => { resize(); requestRender(); });
  resize();
  let raf = 0, last = performance.now(), hidden = false, lastClockCheck = 0;
  function requestRender() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (now - lastClockCheck > 1000 || !lastApplied) { lastClockCheck = now; applyTime(false); }
    if (anim) { const k = Math.min(1, (now - anim.t0) / anim.dur), e = ease(k); cur.pos.lerpVectors(from.pos, new THREE.Vector3(...anim.to.pos), e); cur.look.lerpVectors(from.look, new THREE.Vector3(...anim.to.look), e); cur.fov = from.fov + (anim.to.fov - from.fov) * e; if (k >= 1) { const r = anim.resolve; anim = null; r(true); } }
    if (!state.reduced || ctx.updateHooks.length) {
      const t = now / 1000;
      residents.forEach(r => { if (r.userData && r.userData.update) r.userData.update(t, dt); });
      extras.forEach(r => { if (r.userData && r.userData.update) r.userData.update(t, dt); });
      walkers.forEach(w => { const p0 = w.phase; w.phase = (w.phase + dt * 0.02) % 1; const k = 0.5 - 0.5 * Math.cos(w.phase * Math.PI * 2); const dir = Math.sin(w.phase * Math.PI * 2) >= 0 ? 1 : -1; w.r.position.x = w.from[0] + (w.to[0] - w.from[0]) * k; w.r.position.z = w.from[1] + (w.to[1] - w.from[1]) * k; w.r.rotation.y = Math.atan2((w.to[0] - w.from[0]) * dir, (w.to[1] - w.from[1]) * dir); void p0; });
      if (vehicles && vehicles.update) vehicles.update(t);
      sky.update(now);
      ctx.updateHooks.slice().forEach(h => h(t, dt));
    }
    placeCamera();
    const t0 = performance.now(); renderer.render(scene, camera);
    state.ms = state.ms * 0.9 + (performance.now() - t0) * 0.1; state.frames++;
    if (opts.hud) opts.hud(state);
    if (!hidden && (anim || !state.reduced || ctx.updateHooks.length)) raf = requestAnimationFrame(frame);
  }
  on(document, 'visibilitychange', () => { hidden = document.hidden; if (!hidden) { applyTime(true); requestRender(); } });
  applyTime(true);
  requestRender();

  /* ---- evidence helpers (used by the capture script; harmless in the page) ------ */
  const _w = new THREE.Vector3();
  function projectResident(r) { r.getWorldPosition(_w); _w.y += (r.userData.height || 1.9) * 0.62; _w.project(camera); const w = canvas.clientWidth, h = canvas.clientHeight; return { x: (_w.x + 1) / 2 * w, y: (1 - _w.y) / 2 * h, inFront: _w.z < 1 && Math.abs(_w.x) < 1 && Math.abs(_w.y) < 1 }; }
  function samplePixels(points) {
    placeCamera(); renderer.render(scene, camera);
    const gl = renderer.getContext(), pr = renderer.getPixelRatio(), H = gl.drawingBufferHeight, W = gl.drawingBufferWidth, buf = new Uint8Array(4);
    return points.map(p => { const x = Math.round(p.x * pr), y = Math.round(H - p.y * pr); if (x < 0 || y < 0 || x >= W || y >= H) return null; gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf); return [buf[0], buf[1], buf[2]]; });
  }
  function residentScreenSamples() {
    const list = residents.filter(r => r.userData.role === 'self' || r.userData.role === 'remote').map(r => ({ r, s: projectResident(r) })).filter(x => x.s.inFront);
    const px = samplePixels(list.map(x => x.s));
    return list.map((x, i) => ({ id: x.r.userData.id, role: x.r.userData.role, colour: x.r.userData.colour, screen: [Math.round(x.s.x), Math.round(x.s.y)], rgb: px[i] }));
  }

  const ready = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => new Promise(r => requestAnimationFrame(() => r(true))));
  describeAppearance();

  function dispose() {
    practiceExit(); cancelAnimationFrame(raf); raf = 0;
    L.forEach(([t, type, fn, o]) => t.removeEventListener(type, fn, o)); L.length = 0;
    scene.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    if (envRT) envRT.dispose(); pmrem.dispose(); M.dispose(); renderer.dispose();
  }

  return {
    version: 'mahplaza-v3',
    views: Object.keys(VIEWS), viewLabels: Object.fromEntries(Object.keys(VIEWS).map(k => [k, VIEWS[k].label])), setView, tour, ready, state, clock, camera, scene, renderer, buildings,
    residents, flora, vehicles, get theme() { return theme; }, themes: Object.keys(THEMES), avatarColours: AVATAR_COLOURS.slice(),
    actions: ctx.actions.map(a => ({ id: a.id, label: a.label, kind: a.kind })), select, go, pick,
    practicePreview, practiceExit, practiceContinue,
    setWorldTheme, setSelfAppearance, setRemoteAppearance, describeAppearance, residentScreenSamples, samplePixels,
    setDiagnostic,
    /* validation: pin or release world time */
    setTime(spec) { if (spec == null || spec === 'live') clock.release(); else clock.freeze(spec); applyTime(true); requestRender(); return clock.state(); },
    renderOnce() { requestRender(); },
    dispose
  };
}
