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
  /* v5 §16: the three sites now stand at three depths across a much wider frontage, so the arrival
     camera stands further back on a narrower lens — the whole site plan reads, nothing is clipped, and
     the vertical portrait override puts the chromium floor in the lower third and the tower up top */
  /* v6 §45 / §46: the three facilities now stand apart LATERALLY as well as in depth, so the arrival
     camera stands further back on a narrower lens — the whole ecosystem reads, with real gaps between
     the facilities and open sky through the skyline valleys down to the mountains behind. */
  establishing:      { pos: [0.6, 3.4, 84],    look: [0, 20, -74],     fov: 44, label: 'Arrival',
    /* THE PHONE HERO (§46). Bottom third platinum floor, then the facilities, then the districts, then
       mountains / FOBEAMs / moon / sky. It stands further back on a wider lens than the landscape view
       because §05 (real spacing between the facilities) and §46 (all of them in one portrait frame) pull
       against each other at a physical camera: with the sites genuinely 120 m apart, holding all three
       inside a 9:19.5 crop needs about an 88-degree vertical lens, which is a fisheye. This is the
       honest compromise — MAH MATCH is the hero, and MAH GYM and MAH MARKET enter at the frame edges. */
    portrait: { pos: [0.6, 4.2, 96], look: [0, 34, -74], fov: 58 } },
  'in-world':        { pos: [3.5, 1.9, 40],    look: [-1, 14, -74],    fov: 52, label: 'In-world', portrait: { pos: [3.5, 1.9, 40], look: [-1, 23, -74], fov: 56 } },
  'match-approach':  { pos: [1.4, 1.9, -18],   look: [0, 15, -74],     fov: 58, label: 'Toward MAH MATCH' },
  'match-entrance':  { pos: [0.4, 3.0, -58],   look: [0, 6.0, -86],    fov: 54, label: 'MAH MATCH entrance', portrait: { pos: [0.4, 3.4, -50], look: [0, 9.0, -86], fov: 58 } },
  'gym-entrance':    { pos: [-30, 2.4, 10],    look: [-58, 7, -10],    fov: 56, label: 'MAH GYM entrance' },
  'market-entrance': { pos: [34, 2.0, -12],    look: [62, 6.5, -34],   fov: 56, label: 'MAH MARKET entrance' },
  residents:         { pos: [2.2, 1.7, 20.5],  look: [-0.6, 1.2, 12],  fov: 50, label: 'Residents' },
  appearance:        { pos: [0.8, 2.7, 26],    look: [0.2, 1.3, 12],   fov: 52, label: 'Appearance check' },
  'sky-plant':       { pos: [-11.5, 1.5, 28],  look: [-15, 4.5, 18],   fov: 54, label: 'Plant and sky' },
  practice:          { pos: [-10.5, 4.0, -92],  look: [-7, 2.4, -98],   fov: 54, label: 'Practice zone' },   /* from above the left tier, nothing between the camera and the marks */
  'gym-side':        { pos: [-8, 2.0, 22],     look: [-56, 8, -10],    fov: 56, label: 'Gym side' },
  'market-side':     { pos: [8, 2.0, 22],      look: [58, 9, -34],     fov: 56, label: 'Market side' },
  /* v4 review views */
  skyline:           { pos: [2, 2.4, 38],      look: [-8, 40, -280],   fov: 62, label: 'Skyline' },
  'plaza-node':      { pos: [-24, 2.0, 16],    look: [8, 3, -20],      fov: 58, label: 'Plaza node' },
  'match-hall':      { pos: [-10, 4.0, -82],   look: [2, 2.6, -92],    fov: 60, label: 'MAH MATCH hall' },
  /* ---- v6 ECOSYSTEM VIEWS (§45) -----------------------------------------------------------------
     The review set pointed almost entirely at building fronts, which is exactly how a world gets
     judged as a city. These four look at what the city is IN: the mountains through the valleys, the
     water, the ground between the facilities, and the open land where the built world stops. */
  'valley-right':    { pos: [10, 3.0, 44],     look: [78, 34, -104],   fov: 46, label: 'Right valley — mountains and the basin' },
  'valley-centre':   { pos: [-6, 3.2, 40],     look: [-60, 40, -128],  fov: 46, label: 'Centre valley — mountains behind the city' },
  overlook:          { pos: [-30, 16, 62],     look: [6, 6, -70],      fov: 52, label: 'Overlook — the whole site plan and its gaps' },
  'natural-edge':    { pos: [26, 4.5, 30],     look: [120, 22, -150],  fov: 50, label: 'Natural edge — where the built world stops' }
};
export const TOUR = ['establishing', 'in-world', 'match-entrance'];
export const AVATAR_COLOURS = ['purple', 'green', 'blue', 'red', 'silver', 'teal', 'violet', 'emerald', 'crimson', 'platinum'];
const STORE = { world: 'fob.mahworld.preview.worldTheme', self: 'fob.mahworld.preview.selfColour' };
/* quality tiers (brief §53): composition, materials and silhouette survive every tier; cost moves */
export const QUALITY = {
  high:   { name: 'high',   pixelRatio: 2,   shadowMap: 2048, shadows: true,  reflections: true,  life: { near: 6, mid: 8, far: 10 }, farLayers: true },
  medium: { name: 'medium', pixelRatio: 1.5, shadowMap: 1024, shadows: true,  reflections: true,  life: { near: 4, mid: 6, far: 8 },  farLayers: true },
  low:    { name: 'low',    pixelRatio: 1,   shadowMap: 0,    shadows: false, reflections: false, life: { near: 3, mid: 4, far: 6 },  farLayers: false }
};
function resolveQuality(name) {
  if (name && QUALITY[name]) return QUALITY[name];
  /* auto: phones and small cores get medium; low only when the device says so */
  try { const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4; if (cores <= 2 || mem <= 2) return QUALITY.low; if (cores <= 6 || (window.devicePixelRatio || 1) >= 2.5) return QUALITY.medium; } catch (e) {}
  return QUALITY.high;
}

function reducedMotion() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const readStore = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const writeStore = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) {} };

export async function createMahplaza(canvas, options = {}) {
  const opts = Object.assign({ theme: null, self: null, time: null, pixelRatioCap: 2, hud: null, onSelect: null, onPractice: null, persist: true, quality: null }, options);
  let theme = resolveTheme(opts.theme || (opts.persist && readStore(STORE.world)) || 'canonical');
  let quality = resolveQuality(opts.quality);
  const clock = createWorldClock();
  if (opts.time) clock.freeze(opts.time);
  const state = { version: 'mahplaza-v4', view: 'establishing', yaw: 0, pitch: 0, dolly: 0, touring: false, frames: 0, ms: 0, reduced: reducedMotion(), theme: theme.name, clock: null, selection: null, practice: null, diagnostic: false, appearance: null, quality: quality.name };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.pixelRatioCap, quality.pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  /* one shadow-mapped key light: the sun by day, the moon by night (brief §21, §40) */
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;   /* PCFSoft is deprecated in this renderer build and falls back to this anyway */

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d1f3e, 60, 760);   /* near / far follow the time of day in applyTime: atmospheric perspective, not a fog bank */
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

  const ctx = { THREE, scene, M, theme, clock, reflect, timeHooks: [], updateHooks: [], signMaterials: [], residentSpots: [], entranceLights: [], actions: [], colliders: [], lifeAnchors: { paths: [], pads: [], doors: [], windows: [] } };
  /* v4 modules are optional at load: the assembly integrates whichever exist (see CONTRACTS_V4.md) */
  const optional = async (name) => { try { return await import(name); } catch (e) { if (!/Failed to fetch|Cannot find|Failed to resolve|404|import/i.test(String(e && e.message))) console.info('MAHPLAZA optional module ' + name + ' —', e && e.message); return null; } };
  const CITY = await optional('./city.js'), DRESS = await optional('./plaza-dressing.js'), MATCHI = await optional('./match-interior.js'), LIFE = await optional('./life.js');
  const CLOUDS = await optional('./clouds.js'), FOBEAM = await optional('./fobeam.js'), TERRAIN = await optional('./terrain.js');
  ctx.cityPresent = !!(CITY && CITY.buildCity);

  /* ---- light rig ------------------------------------------------------- */
  const lights = { hemi: new THREE.HemisphereLight(0x2a4f8c, 0x05070c, 0.6), dir: new THREE.DirectionalLight(0x9fc3ff, 0.4), fill: new THREE.DirectionalLight(0x9dbdf0, 0.4) };
  lights.dir.position.set(-80, 120, 160);
  lights.fill.position.set(60, 40, 160);
  lights.dir.castShadow = quality.shadows;
  lights.dir.shadow.mapSize.set(quality.shadowMap || 1024, quality.shadowMap || 1024);
  Object.assign(lights.dir.shadow.camera, { left: -78, right: 78, top: 78, bottom: -78, near: 40, far: 620 });
  lights.dir.shadow.bias = -0.0005; lights.dir.shadow.normalBias = 0.05; lights.dir.shadow.radius = 2;
  lights.dir.shadow.camera.updateProjectionMatrix();
  scene.add(lights.hemi, lights.dir, lights.dir.target, lights.fill);

  /* ---- the world ------------------------------------------------------- */
  buildGround(ctx);
  const buildings = buildBuildings(ctx);
  /* doors: where ambient residents may enter and leave (derived from the destination actions) */
  ctx.actions.filter(a => a.kind === 'destination').forEach(a => { const g = buildings[a.id]; ctx.lifeAnchors.doors.push({ id: a.id, position: a.at.clone(), facing: g ? g.rotation.y : 0, building: a.id }); });
  /* MAH MATCH interior: the v4 module replaces the v3 inline hall when present */
  let matchInterior = null;
  if (MATCHI && MATCHI.buildMatchInterior && ctx.matchHall) {
    try {
      const h = ctx.matchHall;
      matchInterior = MATCHI.buildMatchInterior(ctx, h.room, h.dims);
      if (matchInterior) {
        h.room.remove(h.legacy); h.legacy.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
        if (matchInterior.arenaLight) ctx.arenaLight = h.room.localToWorld(matchInterior.arenaLight.clone());
        if (matchInterior.practice) { const P = matchInterior.practice, w = v => h.room.localToWorld(v.clone()); ctx.practice = { centre: w(P.centre), a: w(P.a), b: w(P.b), facingA: P.facingA, facingB: P.facingB }; }
        /* the two entrance-action panels move onto the hall's display mounts */
        const mounts = matchInterior.actionMounts || {};
        [['find-opponent', mounts.findOpponent], ['practice-buddy', mounts.practiceBuddy]].forEach(([id, mt]) => {
          if (!mt) return; const a = ctx.actions.find(x => x.id === id); if (!a || !a.meshes) return;
          const [panel, sign] = a.meshes; const n = (mt.normal || new THREE.Vector3(0, 0, 1)).clone().normalize();
          const base = mt.position.clone().add(h.room.position);      /* room-local → building-local */
          const sw = (mt.width || 5.6) / 5.6;
          panel.position.copy(base); panel.scale.set(sw, (mt.height || 1.5) / 1.5, 1); panel.lookAt(base.clone().add(n));
          sign.position.copy(base).addScaledVector(n, 0.09); sign.scale.setScalar(Math.min(sw, 1.15)); sign.lookAt(sign.position.clone().add(n));
          if (a.edge) { a.edge.visible = false; }
        });
      }
    } catch (e) { console.info('MAHPLAZA: match-interior module failed —', e && e.message); matchInterior = null; }
  }
  const sky = buildSky(ctx);
  ctx.sky = sky;   /* the v4 sky modules retire the placeholders they replace through this handle */
  /* the v4 sky modules take over from the sky's own placeholders when they exist */
  let clouds = null, fobeams = null;
  if (CLOUDS && CLOUDS.buildClouds) {
    try { clouds = CLOUDS.buildClouds(ctx); if (clouds && clouds.group && !clouds.group.parent) scene.add(clouds.group); if (clouds) { sky.clouds.visible = false; sky.deck.visible = false; } }
    catch (e) { console.info('MAHPLAZA: clouds module failed —', e && e.message); clouds = null; }
  }
  if (FOBEAM && FOBEAM.buildFobeams) {
    try { fobeams = FOBEAM.buildFobeams(ctx); if (fobeams && fobeams.group && !fobeams.group.parent) scene.add(fobeams.group); if (fobeams) { sky.beams.forEach(b => { b.core.visible = false; b.glow.visible = false; }); sky.flows.forEach(f => { f.visible = false; }); } }
    catch (e) { console.info('MAHPLAZA: fobeam module failed —', e && e.message); fobeams = null; }
  }
  let city = null, dressing = null, terrain = null;
  /* TERRAIN builds before the city so the natural world is behind it in the draw order and the city's
     own ground annulus lands on top of the land ring rather than the other way round (v6 §01) */
  if (TERRAIN && TERRAIN.buildTerrain) {
    try { terrain = TERRAIN.buildTerrain(ctx); if (terrain && terrain.group && !terrain.group.parent) scene.add(terrain.group); }
    catch (e) { console.info('MAHPLAZA: terrain module failed —', e && e.message); terrain = null; }
  }
  if (CITY && CITY.buildCity) { try { city = CITY.buildCity(ctx); if (city && city.group && !city.group.parent) scene.add(city.group); } catch (e) { console.info('MAHPLAZA: city module failed —', e && e.message); city = null; } }
  if (DRESS && DRESS.buildDressing) { try { dressing = DRESS.buildDressing(ctx); if (dressing && dressing.group && !dressing.group.parent) scene.add(dressing.group); } catch (e) { console.info('MAHPLAZA: dressing module failed —', e && e.message); dressing = null; } }

  /* entrance and plaza point lights, bounded (v3: entrance strength lowered for the glare correction) */
  const pointLights = [], themedLights = [];
  const addPoint = (p, color, intensity, distance, themed) => { const l = new THREE.PointLight(color, intensity, distance, 2); l.position.copy(p); l.userData.base = intensity; scene.add(l); pointLights.push(l); if (themed) themedLights.push(l); return l; };
  /* v4: lower than v3 — ACES rolls very bright blue-white highlights toward warm, so no source
     may blow out a nearby surface; the architecture now carries its own lit panels and truss heads */
  ctx.entranceLights.forEach(p => addPoint(p, theme.energy, 46, 52, true));
  (ctx.roomLights || []).forEach(p => addPoint(p, 0xcfe4ff, matchInterior && Math.abs(p.x) < 12 && p.z < -50 ? 70 : 130, 34));
  if (ctx.arenaLight) addPoint(ctx.arenaLight, 0xbfdcff, matchInterior ? 70 : 120, 32);
  /* the plaza-centre light stays neutral (residents near the marker are lit, not tinted, by the world
     Theme) and sits high and soft so it models the ground instead of burning a pool into it */
  addPoint(new THREE.Vector3(0, 5.6, 13), 0xcfe4ff, 22, 34, false);

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
  /* the laid chromium floor is a DECK: 9 m diamond cells whose tops sit 0.17 above the raw ground plane
     (ground.js FLOOR_TOP / FIELD_RADIUS). Anything that stands on the plaza stands on the deck. */
  const PLAZA_DECK_Y = 0.17, PLAZA_DECK_R = 43;
  let residents = [], flora = null, vehicles = null, R = null;
  const walkers = [], extras = [];
  try {
    R = await import('./residents.js');
    if (typeof R.populate === 'function') {
      residents = R.populate(scene, populationSpots) || [];
      residents.forEach((r, i) => { const s = populationSpots[i]; if (s && s.y) r.position.y = s.y; else if (Math.hypot(r.position.x, r.position.z) < PLAZA_DECK_R) r.position.y = PLAZA_DECK_Y; if (s && s.walk) walkers.push({ r, from: s.walk.from, to: s.walk.to, phase: Math.random() }); });
    }
  } catch (e) { console.info('MAHPLAZA: residents module not available —', e && e.message); }
  try {
    const F = await import('./flora-and-vehicles.js');
    if (typeof F.createPlanter === 'function' && ctx.planterSpots) {
      /* a spot marked `kind: 'tree'` asks the flora module for its tree; where that module is older and
         has none, it falls back to a planter, so the scene never depends on the newer export */
      flora = ctx.planterSpots.map((s, i) => {
        const make = (s.kind === 'tree' && typeof F.createTree === 'function') ? F.createTree : F.createPlanter;
        const p = make({ theme, seed: 100 + i, size: s.size, shape: s.shape });
        p.position.set(s.x, 0.16 + (Math.hypot(s.x, s.z) < PLAZA_DECK_R ? PLAZA_DECK_Y : 0), s.z);
        scene.add(p); return p;
      });
    }
    if (typeof F.createVehicleRoute === 'function') {
      /* the craft route follows the corridors and crosses behind the district, never over the plaza centre */
      const loop = [[-56, 15, 60], [-58, 18, -20], [-46, 22, -110], [20, 24, -136], [70, 21, -84], [66, 17, 10], [40, 15, 66], [-20, 14, 74]].map(p => new THREE.Vector3(...p));
      vehicles = F.createVehicleRoute(loop, { theme, count: 3, speed: 8 });
      if (vehicles && vehicles.group) scene.add(vehicles.group);
    }
  } catch (e) { console.info('MAHPLAZA: flora / vehicles module not available —', e && e.message); }
  const byId = id => residents.find(r => r.userData && r.userData.id === id) || null;
  /* ambient life (v4 module): walkers, groups, doors, the event scheduler, GYMATTACK background events */
  let life = null;
  if (LIFE && LIFE.createLife && R) { try { life = LIFE.createLife(ctx, R, { anchors: ctx.lifeAnchors, existing: residents, camera, maxNear: quality.life.near, maxMid: quality.life.mid, maxFar: quality.life.far, seed: 7 }); } catch (e) { console.info('MAHPLAZA: life module failed —', e && e.message); life = null; } }

  buildReflections();
  reflections.visible = quality.reflections;
  /* camera colliders: world-space boxes of the masses the camera must stay out of */
  scene.updateMatrixWorld(true);
  const colliderBoxes = (ctx.colliders || []).filter(o => o && o.isMesh).map(o => { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); return o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).expandByScalar(0.3); });

  /* ---- environment map from the sky itself, refreshed as the day turns --- */
  const pmrem = new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader();
  let envRT = null, envDaylight = -1;
  const envScene = new THREE.Scene();
  const envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
  const envCols = new Float32Array(envDome.geometry.attributes.position.count * 3); envDome.geometry.setAttribute('color', new THREE.BufferAttribute(envCols, 3)); envScene.add(envDome);
  const envSun = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); envScene.add(envSun);
  const envFloor = new THREE.Mesh(new THREE.CircleGeometry(48, 24), new THREE.MeshBasicMaterial({ color: 0x0b1220, side: THREE.DoubleSide })); envFloor.rotation.x = Math.PI / 2; envFloor.position.y = -0.5; envScene.add(envFloor);
  /* v5 §14 — WHAT CHROMIUM REFLECTS. A mirror finish is only as interesting as its surroundings: chrome
     against a smooth gradient reads as flat grey paint. So the environment scene carries a ring of the
     district itself — 56 vertical bars of varied height and brightness around the horizon, plus a
     handful of megatall silhouettes — which is what every polished surface in MAHWORLD now picks up.
     One merged, vertex-coloured mesh built once; only its brightness follows the clock. */
  const envCity = (() => {
    const N = 56, pos = new Float32Array(N * 6 * 3), col = new Float32Array(N * 6 * 3);
    let s = 20250906;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < N; i++) {
      const a0 = i / N * Math.PI * 2, a1 = (i + 0.82) / N * Math.PI * 2, r = 46;
      const h = 1.4 + rnd() * (i % 9 === 0 ? 11 : 4.6);                   /* every ninth bar is a megatall */
      const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
      const q = [[x0, -0.4, z0], [x1, -0.4, z1], [x1, h, z1], [x0, -0.4, z0], [x1, h, z1], [x0, h, z0]];
      q.forEach((p, k) => { pos.set(p, (i * 6 + k) * 3); });
      /* v6 ROOT CAUSE. A metal takes no diffuse light, so EVERY metalness ≥ 0.9 surface in MAHWORLD —
         the whole platinum family — is lit by this ring and nothing else. v5 made it "mostly dark, a
         few bright" (0.1 + rnd² × 0.9), which is why platinum surfaces rendered near-black however
         bright their hex looked. The district a chromium city reflects has to BE lit: the floor is
         raised well off zero and every fourth bar is a hot window wall. */
      const hot = (i % 4 === 0);
      const v = hot ? 0.86 + rnd() * 0.34 : 0.28 + rnd() * 0.72;
      for (let k = 0; k < 6; k++) { const t = k === 2 || k === 4 || k === 5 ? 0.55 : 1; col.set([v * t, v * t * 1.02, v * t * 1.12], (i * 6 + k) * 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    envScene.add(m); return m;
  })();
  function refreshEnvironment(k, clockState) {
    const pos = envDome.geometry.attributes.position, top = new THREE.Color(k.top), hor = new THREE.Color(k.horizon), tmp = new THREE.Color();
    /* the horizon band carries the district's glow, so reflective trims and glass see a lit city, not a void */
    /* the horizon band is what a vertical or tilted mirror grade actually sees, so it is wider and
       brighter in v6 — this and the city ring above it are the world's real key light for metal */
    const band = hor.clone().lerp(new THREE.Color(k.hemiSky), 0.6).multiplyScalar(1 + 0.95 * (1 - clockState.daylight));
    for (let i = 0; i < pos.count; i++) { const ny = pos.getY(i) / 50; const a = Math.max(0, ny); tmp.copy(hor).lerp(top, a); if (ny > -0.12 && ny < 0.26) tmp.lerp(band, 1 - Math.abs(ny - 0.07) / 0.19); envCols[i * 3] = tmp.r; envCols[i * 3 + 1] = tmp.g; envCols[i * 3 + 2] = tmp.b; }
    envDome.geometry.attributes.color.needsUpdate = true;
    envSun.position.copy(lights.dir.position).normalize().multiplyScalar(45); envSun.lookAt(0, 0, 0);
    envSun.material.color.setHex(k.sun).multiplyScalar(0.55 + 1.25 * clockState.daylight);
    /* the city's own glow belongs in the environment map: a bright band at the horizon so metal and glass
       pick up the district rather than a black void (brief §10 city bounce) */
    envDome.geometry.attributes.color.needsUpdate = true;
    /* the reflected district: bright at night, subdued under daylight when the sky dominates */
    envCity.material.color.setScalar(0.62 + 0.9 * (1 - clockState.daylight));
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0.04, 0.1, 200);
    scene.environment = envRT.texture;
    /* skylight (brief §10): at night the sky and the district behind it are a real fill, so dark planes,
       bevels and platinum catches keep reading; by day the sun stays the key and the fill stays secondary.
       v5 raises it: a chromium world is lit largely BY WHAT IT REFLECTS, and the environment is that. */
    scene.environmentIntensity = 1.18 - 0.5 * clockState.daylight;
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
    /* atmospheric perspective: a long, subtle falloff — deeper by day, closer at night; the city's far layers live inside it */
    scene.fog.near = 55 + 45 * s.daylight; scene.fog.far = 880 + 260 * s.daylight;   /* v5: the megatalls stand at 380–670 m and must not be eaten by the bank */
    pointLights.forEach(l => { l.intensity = l.userData.base * (1 - 0.7 * s.daylight) * (state.diagnostic ? 0.6 : 1); });
    ctx.timeHooks.forEach(h => { try { h(s); } catch (e) {} });
    const energy = state.diagnostic ? Math.min(0.3, 1 - s.daylight) : 1 - s.daylight;
    residents.concat(extras).forEach(r => { if (r.userData && r.userData.setEnergy) r.userData.setEnergy(energy); });
    if (flora) flora.forEach(p => { if (p.userData && p.userData.setTime) p.userData.setTime(s); });
    if (vehicles && vehicles.setTime) vehicles.setTime(s);
    [terrain, city, dressing, matchInterior, life, clouds, fobeams].forEach(mod => { if (mod && typeof mod.setTime === 'function') { try { mod.setTime(s); } catch (e) {} } });
    /* window courses on the facades: lit at night, dark recesses by day */
    (ctx.windowGrids || []).forEach(gr => { if (gr.material && gr.material.color) gr.material.color.setScalar(0.16 + 0.84 * Math.pow(1 - s.daylight, 1.4)); });
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
    [city, dressing, matchInterior, life, clouds, fobeams].forEach(mod => { if (mod && typeof mod.setTheme === 'function') { try { mod.setTheme(theme); } catch (e) {} } });
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
  const dirV = new THREE.Vector3(), rightV = new THREE.Vector3(), targetV = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0), probeV = new THREE.Vector3();
  /* the camera has weight (brief §37): look / move inputs set targets, the camera follows them with critical damping; it never enters a collider (§38) */
  const smooth = { yaw: 0, pitch: 0, dolly: 0 };
  let smoothing = true;
  function placeCamera(dt = 0) {
    if (smoothing && dt > 0 && !state.reduced) { const k = 1 - Math.exp(-dt * 11); smooth.yaw += (state.yaw - smooth.yaw) * k; smooth.pitch += (state.pitch - smooth.pitch) * k; smooth.dolly += (state.dolly - smooth.dolly) * k; }
    else { smooth.yaw = state.yaw; smooth.pitch = state.pitch; smooth.dolly = state.dolly; }
    dirV.subVectors(cur.look, cur.pos).normalize().applyAxisAngle(upV, smooth.yaw);
    rightV.crossVectors(dirV, upV).normalize(); dirV.applyAxisAngle(rightV, smooth.pitch).normalize();
    camera.position.copy(cur.pos).addScaledVector(dirV, smooth.dolly); if (camera.position.y < 0.7) camera.position.y = 0.7;
    /* collision: if the camera sits inside a mass, slide it forward along the view until it is out (smooth recovery, no pop) */
    for (let guard = 0; guard < 24; guard++) {
      let inside = false;
      for (let i = 0; i < colliderBoxes.length; i++) { if (colliderBoxes[i].containsPoint(camera.position)) { inside = true; break; } }
      if (!inside) break;
      camera.position.addScaledVector(dirV, 0.5); smooth.dolly += 0.5; if (guard === 23) state.dolly = smooth.dolly;
    }
    /* keep a little air in front of the lens */
    probeV.copy(camera.position).addScaledVector(dirV, 0.6);
    for (let i = 0; i < colliderBoxes.length; i++) { if (colliderBoxes[i].containsPoint(probeV)) { state.dolly = Math.min(state.dolly, smooth.dolly - 0.6); break; } }
    targetV.copy(camera.position).addScaledVector(dirV, 60); camera.lookAt(targetV);
    camera.fov = cur.fov + (state.fovBias || 0); camera.updateProjectionMatrix();
  }
  function setView(name, { instant = false, duration = 2800 } = {}) {
    if (!VIEWS[name]) return Promise.resolve(false);
    state.view = name; state.yaw = 0; state.pitch = 0; state.dolly = 0; smooth.yaw = 0; smooth.pitch = 0; smooth.dolly = 0;
    if (anim && anim.resolve) { const r = anim.resolve; anim = null; r(false); }
    if (instant || state.reduced) { applyView(name); requestRender(); return Promise.resolve(true); }
    from.pos.copy(cur.pos); from.look.copy(cur.look); from.fov = cur.fov;
    return new Promise(resolve => { anim = { t0: performance.now(), dur: duration, to: viewSpec(name), resolve }; requestRender(); });
  }
  /* evidence only: frame an arbitrary point (used by the capture script to look at an ambient event) */
  function setCustomView({ pos, look, fov = 56 }) { state.view = 'custom'; state.yaw = state.pitch = state.dolly = 0; smooth.yaw = smooth.pitch = smooth.dolly = 0; anim = null; cur.pos.set(...pos); cur.look.set(...look); cur.fov = fov; requestRender(); return true; }
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
  /* ONE world step, shared by the animation loop and by `advance()` (validation) so evidence exercises
     exactly the code a viewer's browser runs */
  function stepWorld(t, dt, nowMs) {
    residents.forEach(r => { if (r.userData && r.userData.update) r.userData.update(t, dt); });
    extras.forEach(r => { if (r.userData && r.userData.update) r.userData.update(t, dt); });
    walkers.forEach(w => { w.phase = (w.phase + dt * 0.02) % 1; const k = 0.5 - 0.5 * Math.cos(w.phase * Math.PI * 2); const dir = Math.sin(w.phase * Math.PI * 2) >= 0 ? 1 : -1; w.r.position.x = w.from[0] + (w.to[0] - w.from[0]) * k; w.r.position.z = w.from[1] + (w.to[1] - w.from[1]) * k; w.r.rotation.y = Math.atan2((w.to[0] - w.from[0]) * dir, (w.to[1] - w.from[1]) * dir); });
    if (vehicles && vehicles.update) vehicles.update(t);
    sky.update(nowMs != null ? nowMs : t * 1000);
    if (city && city.update) city.update(t, dt);
    if (clouds && clouds.update) clouds.update(t, dt);
    if (fobeams && fobeams.update) fobeams.update(t, dt);
    if (dressing && dressing.update) dressing.update(t, dt);
    if (matchInterior && matchInterior.update) matchInterior.update(t, dt);
    if (life && life.update) life.update(t, dt);
    ctx.updateHooks.slice().forEach(h => h(t, dt));
  }
  /* Validation only: advance the world by `seconds` in fixed steps without waiting for animation frames.
     Headless browsers throttle requestAnimationFrame to a fraction of a frame per second, so a capture
     could never observe ambient life in real time; this runs the same step function deterministically. */
  let advanceClock = 0;
  function advance(seconds, stepSeconds = 1 / 30) {
    const n = Math.max(1, Math.round(seconds / stepSeconds));
    for (let i = 0; i < n; i++) { advanceClock += stepSeconds; stepWorld(advanceClock, stepSeconds, advanceClock * 1000); }
    applyTime(false); placeCamera(0); renderer.render(scene, camera); state.frames++;
    return { advancedSeconds: n * stepSeconds, steps: n, worldTime: advanceClock };
  }
  function frame(now) {
    raf = 0;
    if (advanceClock < now / 1000) advanceClock = now / 1000;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (now - lastClockCheck > 1000 || !lastApplied) { lastClockCheck = now; applyTime(false); }
    if (anim) { const k = Math.min(1, (now - anim.t0) / anim.dur), e = ease(k); cur.pos.lerpVectors(from.pos, new THREE.Vector3(...anim.to.pos), e); cur.look.lerpVectors(from.look, new THREE.Vector3(...anim.to.look), e); cur.fov = from.fov + (anim.to.fov - from.fov) * e; if (k >= 1) { const r = anim.resolve; anim = null; r(true); } }
    if (!state.reduced || ctx.updateHooks.length) stepWorld(now / 1000, dt, now);
    placeCamera(dt);
    const t0 = performance.now(); renderer.render(scene, camera);
    state.ms = state.ms * 0.9 + (performance.now() - t0) * 0.1; state.frames++;
    if (opts.hud) opts.hud(state);
    const settling = Math.abs(smooth.yaw - state.yaw) + Math.abs(smooth.pitch - state.pitch) + Math.abs(smooth.dolly - state.dolly) > 0.002;
    if (!hidden && (anim || !state.reduced || ctx.updateHooks.length || settling)) raf = requestAnimationFrame(frame);
  }
  /* quality tier at run time (validation and the page's Preview row) */
  function setQuality(name) {
    if (!QUALITY[name] || QUALITY[name] === quality) return quality.name;
    quality = QUALITY[name]; state.quality = quality.name;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.pixelRatioCap, quality.pixelRatio));
    const shadowsChanged = renderer.shadowMap.enabled !== quality.shadows;
    renderer.shadowMap.enabled = quality.shadows; lights.dir.castShadow = quality.shadows;
    if (quality.shadowMap) { lights.dir.shadow.mapSize.set(quality.shadowMap, quality.shadowMap); if (lights.dir.shadow.map) { lights.dir.shadow.map.dispose(); lights.dir.shadow.map = null; } }
    if (shadowsChanged) scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); } });
    reflections.visible = quality.reflections;
    if (life && life.setBudget) { try { life.setBudget(quality.life); } catch (e) {} }
    if (city && city.setQuality) { try { city.setQuality(quality); } catch (e) {} }
    if (terrain && terrain.setQuality) { try { terrain.setQuality(quality); } catch (e) {} }
    if (clouds && clouds.setQuality) { try { clouds.setQuality(quality); } catch (e) {} }
    resize(); requestRender();
    return quality.name;
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
    views: Object.keys(VIEWS), viewLabels: Object.fromEntries(Object.keys(VIEWS).map(k => [k, VIEWS[k].label])), setView, setCustomView, tour, ready, state, clock, camera, scene, renderer, buildings,
    residents, flora, vehicles, get theme() { return theme; }, themes: Object.keys(THEMES), avatarColours: AVATAR_COLOURS.slice(),
    modules: { terrain: !!terrain, city: !!city, dressing: !!dressing, matchInterior: !!matchInterior, life: !!life, clouds: !!clouds, fobeams: !!fobeams }, terrain, city, dressing, matchInterior, life, clouds, fobeams,
    actions: ctx.actions.map(a => ({ id: a.id, label: a.label, kind: a.kind })), select, go, pick,
    practicePreview, practiceExit, practiceContinue,
    setWorldTheme, setSelfAppearance, setRemoteAppearance, describeAppearance, residentScreenSamples, samplePixels,
    setDiagnostic, setQuality, get quality() { return quality.name; }, qualities: Object.keys(QUALITY), advance,
    /* validation: pin or release world time */
    setTime(spec) { if (spec == null || spec === 'live') clock.release(); else clock.freeze(spec); applyTime(true); requestRender(); return clock.state(); },
    renderOnce() { requestRender(); },
    dispose
  };
}
