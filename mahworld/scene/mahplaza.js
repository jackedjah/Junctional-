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
import { createMaterials, resolveTheme, THEMES, canvasTexture } from './materials.js';
import { createRoam, ROAM } from './roam.js';   /* v15: the viewer's own camera */
import { createTravel } from './travel.js';     /* R2 §9: inter-city flight as real traversal */
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
  const state = { version: 'mahplaza-v4', view: 'establishing', roam: null, yaw: 0, pitch: 0, dolly: 0, touring: false, frames: 0, ms: 0, reduced: reducedMotion(), theme: theme.name, clock: null, selection: null, practice: null, diagnostic: false, appearance: null, quality: quality.name };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.pixelRatioCap, quality.pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  /* one shadow-mapped key light: the sun by day, the moon by night (brief §21, §40) */
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;   /* PCFSoft is deprecated in this renderer build and falls back to this anyway */

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d1f3e, 60, 2350);  /* near / far follow the time of day in applyTime: atmospheric perspective, not a fog bank */
  /* FAR PLANE PAST THE FAR RING. terrain.js's outermost range stands at r 1500, so a viewer who
     has flown 700 m out to Lake City is 2200 m from the ridge behind the plaza — beyond a 2000 m
     frustum, which clipped the far range out of exactly the wide shots it exists for. 2600 clears
     it with margin; the depth buffer loses a little far-field precision and there is nothing
     coplanar out there to lose it on. */
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 2600);
  /* R4: the fog bank is authored by applyTime and SCALED by altitude (updateFrustum, far below).
     Both have to be declared here, before the first applyTime call, and both write through
     applyFog so neither can silently overwrite the other's decision. */
  const fogBase = { near: 55, far: 2350 };
  let frustumHigh = false;
  const applyFog = () => {
    const k = frustumHigh ? 3.4 : 1;
    scene.fog.near = fogBase.near * k; scene.fog.far = fogBase.far * k;
  };
  const M = createMaterials(theme);

  /* wet reflections: mirrored copies of emissive elements under the floor, built from world matrices once the graph is placed */
  /* THE MIRROR PLANE IS THE DECK TOP, NOT y = 0 (fixed in v8).
     scale.y = −1 alone reflects about y = 0, but the plaza deck's surface is at ground.js's
     FLOOR_TOP = 0.17, so every reflected object was landing 0.34 m away from where it touches the
     floor. On the old mid-dark plaza that error was invisible. The floor is black platinum at
     roughness 0.055 now — a near mirror — and a reflection that does not meet its object at the
     contact line is the first thing an eye notices. Reflecting about a plane at height h is
     y' = 2h − y, which is scale.y = −1 followed by position.y = 2h.
     One plane cannot be right everywhere: the ground outside PLAZA_DECK_R sits at 0. The deck wins
     because it is the hero surface, it is where the camera stands, and almost everything registered
     for reflection — the monument, the inlaid marks, the ring, the furniture, the residents — stands
     on it. */
  const reflections = new THREE.Group(); reflections.scale.y = -1; reflections.position.y = 2 * 0.17; scene.add(reflections);
  /* declared here, assigned far below once the scene graph exists. It has to be declared BEFORE
     resize() is first called: `typeof x` does NOT protect a let/const in its temporal dead zone the
     way it protects an undeclared name, so the guard inside resize() threw rather than skipping. */
  let mirror = null;
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
  const FOBST = await optional('./fobstations.js');   /* v12 §4: the FOBLOCK family */
  const MONU = await optional('./monument.js');       /* v12 §5: HIGHER TOGETHER, the hero public art */
  const BCAST = await optional('./broadcast.js');     /* v14 §8: the giant rear-city authority monitor */
  const LAKE = await optional('./lakecity.js');       /* R2 §5: the second destination */
  const FOREST = await optional('./rainforest.js');   /* R2 §6: the third destination */
  const MASCENT = await optional('./mahascent.js');   /* R3-06: the ascent reaches its destination */
  const MDESCENT = await optional('./mahdescent.js'); /* R3-07: the way down, three entrances */
  const ORING = await optional('./outerring.js');     /* R3-01: dead-zone closure in the outer ring */
  const MFAC = await optional('./mahfacilities.js');  /* R3-08/R3-11: MAH VITAL, FORGE, MODE */
  const MBEAST = await optional('./mahbeasts.js');    /* R3-10: MAHBEASTS, Monkey Dogs L5-7 + boss */
  const ILINK = await optional('./interlink.js');     /* R2 §5: the routes between the three cities */
  const HALOM = await optional('./halo.js');          /* R4: MAH HALO, the upper sanctuary surface */
  const HALOD = await optional('./halo-districts.js');/* R4: the eight districts standing on it */
  const HALOL = await optional('./halo-life.js');      /* R4-16: the social life on the ring */
  const HALOT = await optional('./halo-threshold.js'); /* R4-19: where HALO ends and SKY REALM begins */
  const CROWNM = await optional('./mah-crown.js');     /* R5: MAH CROWN, the ultra-tall central landmark */
  const DOMEM = await optional('./halo-dome.js');      /* R5: the sanctuary dome and its climbing routes */
  const HAVENM = await optional('./mah-haven.js');     /* R5: MAH HAVEN, the peaceful waterfront */
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
  let city = null, dressing = null, terrain = null, fobstations = null, monument = null, broadcast = null, lakeCity = null, rainforest = null, mahAscent = null, mahDescent = null, outerRing = null, facilities = null, beasts = null, interlink = null, halo = null, haloDistricts = null, haloLife = null, haloThreshold = null, mahCrown = null, haloDome = null, mahHaven = null;
  /* TERRAIN builds before the city so the natural world is behind it in the draw order and the city's
     own ground annulus lands on top of the land ring rather than the other way round (v6 §01) */
  if (TERRAIN && TERRAIN.buildTerrain) {
    try { terrain = TERRAIN.buildTerrain(ctx); if (terrain && terrain.group && !terrain.group.parent) scene.add(terrain.group); }
    catch (e) { console.info('MAHPLAZA: terrain module failed —', e && e.message); terrain = null; }
  }
  if (CITY && CITY.buildCity) { try { city = CITY.buildCity(ctx); if (city && city.group && !city.group.parent) scene.add(city.group); } catch (e) { console.info('MAHPLAZA: city module failed —', e && e.message); city = null; } }
  if (DRESS && DRESS.buildDressing) { try { dressing = DRESS.buildDressing(ctx); if (dressing && dressing.group && !dressing.group.parent) scene.add(dressing.group); } catch (e) { console.info('MAHPLAZA: dressing module failed —', e && e.message); dressing = null; } }
  /* v12 §4 — THE FOBLOCK FAMILY. Runs LAST of the world builders on purpose: it tests every
     candidate position against ctx.colliders, and that list is only complete once ground.js and
     plaza-dressing.js have pushed their benches, planters, bollards and stairs. */
  if (FOBST && FOBST.buildFobstations) { try { fobstations = FOBST.buildFobstations(ctx); } catch (e) { console.info('MAHPLAZA: fobstations module failed —', e && e.message); fobstations = null; } }
  /* v12 §5 — HIGHER TOGETHER. Last of the world builders, for the same reason fobstations runs
     late: it measures its own footprint against ctx.colliders before it stands anything up, and
     that list is only complete once ground.js and plaza-dressing.js have pushed theirs. It then
     adds a collider of its own, which is why it must come before the camera dolly is built. */
  if (MONU && MONU.buildMonument) { try { monument = MONU.buildMonument(ctx); } catch (e) { console.info('MAHPLAZA: monument module failed —', e && e.message); monument = null; } }
  /* R2 §20 — THE GIANT REAR-CITY AUTHORITY MONITOR. Built and unwired since v14; the doctrine's own
     build order puts it directly after the monument and transport, so it is wired here.
     It needs residents.js by REFERENCE, not by import: §8's presenter ownership forbids forking the
     species, so the module asks the authority for its figure the same way monument.js does. The
     residents module is already resolved above as `R`, but that happens AFTER this block, so the
     import is repeated rather than reordering the world build — a monitor 185 m out is not worth
     moving the population step for. captions default to EMPTY: §22 forbids invented copy. */
  if (BCAST && BCAST.buildBroadcast) {
    try {
      const RES = await optional('./residents.js');
      broadcast = BCAST.buildBroadcast(ctx, { residents: RES, canvasTexture });
      if (broadcast && broadcast.group && !broadcast.group.parent) scene.add(broadcast.group);
    } catch (e) { console.info('MAHPLAZA: broadcast module failed —', e && e.message); broadcast = null; }
  }

  /* R2 §5 — LAKE CITY, the second destination. Placed at bearing 62 / r 560, which is the corridor
     terrain.js already reserved for water: its BASIN sits at the same bearing with a far shore at
     r ~= 460, so the two bodies read as ONE system. Built after the civic city so it can be judged
     against it, and it registers no colliders because roam's ground gear does not reach 560 m. */
  if (LAKE && LAKE.buildLakeCity) { try { lakeCity = LAKE.buildLakeCity(ctx); } catch (e) { console.info('MAHPLAZA: lake city module failed —', e && e.message); lakeCity = null; } }
  /* R2 §6 — RAINFOREST CITY, the third destination, at bearing 127 in the second corridor of
     terrain.js's PASSES table. Peer of Lake City at the same ring radius, on the other flank, so
     the far-zoom frame has a destination either side of the civic centre (§8). */
  if (FOREST && FOREST.buildRainforest) { try { rainforest = FOREST.buildRainforest(ctx); } catch (e) { console.info('MAHPLAZA: rainforest module failed —', e && e.message); rainforest = null; } }
  /* R3-10 — TERRITORY, and the rule is a prohibition first: "do not randomly spawn enemies in
     premium civic pedestrian zones". So none of these is on the plaza or in the civic district.
     Each is one of the places the doctrine names — a forest zone, a lake edge, an outer district —
     and the two peer-city territories are derived from those modules' own sites, not a second
     table (L42). The packs sit OUTSIDE each city rather than in it: a hostile pack in a city's
     streets is a different design decision and not one this pass is authorised to make. */
  /* R2 §5 — the far-zoom lock asks for multiple BELIEVABLE destinations, and believable includes
     connected. The route table is built from the two peer modules' own sites and radii, so a city
     that failed to load has no route to it and the link is never a fiction (the same rule the travel
     destination table follows). Built AFTER the cities so their stats exist. */
  if (ILINK && ILINK.buildInterlink) {
    try {
      const routes = [];
      if (lakeCity && lakeCity.stats && lakeCity.stats.site) {
        routes.push({ id: 'lake', x: lakeCity.stats.site.x, z: lakeCity.stats.site.z,
          radius: (lakeCity.stats.lake && lakeCity.stats.lake.rMax) || 274, arriveY: 120 });
      }
      if (rainforest && rainforest.stats && rainforest.stats.site) {
        routes.push({ id: 'forest', x: rainforest.stats.site.x, z: rainforest.stats.site.z,
          radius: 300, arriveY: 150 });
      }
      interlink = ILINK.buildInterlink(ctx, { routes });
      scene.add(interlink.group);
    } catch (e) { console.info('MAHPLAZA: interlink module failed —', e && e.message); interlink = null; }
  }
  if (MBEAST && MBEAST.buildMahBeasts) {
    try {
      const terr = [];
      const off = (mod, pull, id) => {
        if (!mod || !mod.stats || !mod.stats.site) return;
        const sx = mod.stats.site.x, sz = mod.stats.site.z, d = Math.hypot(sx, sz) || 1;
        terr.push({ id, family: 'monkeydog', x: sx - (sx / d) * pull, z: sz - (sz / d) * pull, r: 16 });
      };
      off(rainforest, 340, 'forest-clearing');
      off(lakeCity, 330, 'lake-edge');
      /* an outer district in the ring's southern category-F sector, well clear of everything */
      terr.push({ id: 'south-wildland', family: 'monkeydog', x: -352, z: 128, r: 18 });
      beasts = MBEAST.buildMahBeasts(ctx, { territories: terr });
      scene.add(beasts.group);
    } catch (e) { console.info('MAHPLAZA: mahbeasts module failed —', e && e.message); beasts = null; }
  }
  if (MFAC && MFAC.buildMahFacilities) { try { facilities = MFAC.buildMahFacilities(ctx); scene.add(facilities.group); } catch (e) { console.info('MAHPLAZA: facilities module failed —', e && e.message); facilities = null; } }
  if (ORING && ORING.buildOuterRing) { try { outerRing = ORING.buildOuterRing(ctx); scene.add(outerRing.group); } catch (e) { console.info('MAHPLAZA: outer ring module failed —', e && e.message); outerRing = null; } }
  if (MASCENT && MASCENT.buildMahAscent) { try { mahAscent = MASCENT.buildMahAscent(ctx); scene.add(mahAscent.group); } catch (e) { console.info('MAHPLAZA: mah ascent module failed —', e && e.message); mahAscent = null; } }
  /* ============================================================================================
     R4 · MAH HALO — the upper sanctuary
     ============================================================================================
     Two modules and a strict order. halo.js owns the SURFACE — the contract haloFloor(x,z), the
     laser-plated tiles, the shell and the two rims. halo-districts.js owns what stands on it, and
     it needs mahascent's decks to rake its dock beams from, so it builds AFTER the ascent and reads
     those positions from THAT module's stats rather than from a second table here (L42).

     The halo goes in the scene at world origin: its geometry is authored in world coordinates
     because a ring 6800 m across has no meaningful local origin — every point on it is 2 km from
     every other. */
  if (HALOM && HALOM.buildHalo) {
    /* the rim apertures come from halo-districts' OVERLOOKS table — the SAME table its bays are
       built from — so the parapet cannot close over a bay again. halo is built first, but the table
       is a module-level constant, so it is readable before buildHaloDistricts() ever runs. */
    try {
      halo = HALOM.buildHalo(ctx, { rimApertures: (HALOD && HALOD.OVERLOOKS) || [] });
      scene.add(halo.group);
    }
    catch (e) { console.info('MAHPLAZA: halo module failed —', e && e.message); halo = null; }
  }
  if (halo && HALOD && HALOD.buildHaloDistricts) {
    try {
      haloDistricts = HALOD.buildHaloDistricts(ctx, {
        transferDecks: (mahAscent && mahAscent.stats && mahAscent.stats.sites) || []
      });
      scene.add(haloDistricts.group);
    } catch (e) { console.info('MAHPLAZA: halo districts module failed —', e && e.message); haloDistricts = null; }
  }
  /* R4-19 — THE SKY THRESHOLD. R4's SKY REALM SEPARATION clause: HALO is the civilized tiled layer,
     the SKY REALM is the cloud biome beyond it, and "the transition between them must be clear and
     spectacular". It takes the open plate at bearing -67.5 deg, between ARRIVAL and COMMONS, and
     runs out to the OUTER rim — so departure sits beside arrival and radially opposite it. */
  if (halo && HALOT && HALOT.buildHaloThreshold) {
    try { haloThreshold = HALOT.buildHaloThreshold(ctx); scene.add(haloThreshold.group); }
    catch (e) { console.info('MAHPLAZA: halo threshold module failed —', e && e.message); haloThreshold = null; }
  }
  /* ================================================================================================
     R5 — MAH CROWN. The sanctuary's ultra-tall central landmark, carried across the halo's hole on
     eight spars from the inner rim. Built after the halo (it is founded on the rim's own height)
     and before the life (its plinth is a place people stand).
     ============================================================================================== */
  if (halo && CROWNM && CROWNM.buildMahCrown) {
    try { mahCrown = CROWNM.buildMahCrown(ctx); scene.add(mahCrown.group); }
    catch (e) { console.info('MAHPLAZA: mah crown module failed —', e && e.message); mahCrown = null; }
  }
  /* R5 — THE HALO DOME. Built after MAH CROWN so its apex clearance can be measured against the
     tower it has to clear rather than asserted, and after the threshold so its portal frames a gate
     that already exists. */
  if (halo && DOMEM && DOMEM.buildHaloDome) {
    try {
      haloDome = DOMEM.buildHaloDome(ctx);
      scene.add(haloDome.group);
      if (mahCrown && CROWNM) {
        haloDome.stats.crownClearance = +(DOMEM.DOME.APEX_Y - CROWNM.CROWN.MAST_TOP).toFixed(1);
      }
    } catch (e) { console.info('MAHPLAZA: halo dome module failed —', e && e.message); haloDome = null; }
  }
  /* R4-16 — MAHBEING SOCIAL LIFE. Built after the districts AND after the threshold, because it
     stands on their furniture: the dance floor, the amphitheatre tiers, the kiosk line, the overlook
     rails, the departure hold and the causeway out to the sky gate. It is a POPULATION
     and not a cast, so it does not go through ctx.residentSpots — see halo-life.js's header. */
  if (halo && HALOL && HALOL.buildHaloLife) {
    /* the overlook table comes from the module that BUILT the bays, so a figure at a rail is at a
       rail that exists. halo-districts is loaded before this block, so if it failed the list is
       empty and halo-life simply places no rails — never a guessed radius (L42). */
    try {
      haloLife = HALOL.buildHaloLife(ctx, {
        overlooks: (haloDistricts && haloDistricts.stats && haloDistricts.stats.overlookSites) || [],
        walkSites: (haloThreshold && haloThreshold.stats && haloThreshold.stats.walkSites) || []
      });
      scene.add(haloLife.group);
    }
    catch (e) { console.info('MAHPLAZA: halo life module failed —', e && e.message); haloLife = null; }
  }
  /* R5 — MAH HAVEN. It stands on terrain.js's BASIN, not on Lake City's lake: a 60-bearing ground
     sweep of that lake's whole perimeter returned rock at every single one, with 95 to 435 m of
     relief, because it sits at r 700 ringed by the near range. The basin's ellipse, its half-extents
     and its water level all come from terrain.js's own export rather than a second table, so the
     shoreline cannot drift from the water it edges (L42). */
  if (HAVENM && HAVENM.buildMahHaven) {
    try {
      mahHaven = HAVENM.buildMahHaven(ctx, {
        water: (TERRAIN && TERRAIN.BASIN) ? { centre: TERRAIN.basinCentre(),
          rx: TERRAIN.BASIN.rx, rz: TERRAIN.BASIN.rz, y: TERRAIN.BASIN.y } : null
      });
      scene.add(mahHaven.group);
    } catch (e) { console.info('MAHPLAZA: mah haven module failed —', e && e.message); mahHaven = null; }
  }
  /* R3-07 — the three recommended entrances. The two peer-city sites come from THOSE MODULES' own
     stats rather than from a second table here: L42's lesson is that when two files each know where
     a city is, one of them is eventually wrong. Each is pulled back toward the plaza from its city's
     centre so it lands in the arrival district rather than in the middle of the water or the stand. */
  if (MDESCENT && MDESCENT.buildMahDescent) {
    try {
      const sites = [{ id: 'civic', x: 66, y: 0.17, z: 26, ry: -2.28 }];
      const edge = (mod, pull, id) => {
        if (!mod || !mod.stats || !mod.stats.site) return;
        const sx = mod.stats.site.x, sz = mod.stats.site.z;
        const d = Math.hypot(sx, sz) || 1;
        sites.push({ id, x: sx - (sx / d) * pull, y: 0.17, z: sz - (sz / d) * pull,
          ry: Math.atan2(sx / d, sz / d) + Math.PI });   /* the threshold faces back toward the plaza */
      };
      edge(lakeCity, 250, 'lake-shore');
      edge(rainforest, 262, 'forest-root');
      mahDescent = MDESCENT.buildMahDescent(ctx, { sites });
      scene.add(mahDescent.group);
    } catch (e) { console.info('MAHPLAZA: mah descent module failed —', e && e.message); mahDescent = null; }
  }

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
  let residents = [], flora = null, vehicles = null, fobpods = null, R = null;
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
    /* THE PARKED FLEET (§6A/§6B). buildFobPods() has existed for two passes and WAS NEVER CALLED —
       nothing in the repository referenced it outside its own file, so nine FOBLOCK pods, the parked
       shuttle, their apron placement search and the ascent-pad keep-out that was written to fix a
       shuttle planted inside a launch pad all rendered exactly zero pixels. L15, again: a passing law
       proves the generator is correct, never that the world contains its output. It builds its own
       group and adds it to the scene, so this is the whole wiring. */
    if (typeof F.buildFobPods === 'function') {
      fobpods = F.buildFobPods(ctx);
      if (fobpods && fobpods.group && !fobpods.group.parent) scene.add(fobpods.group);
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
  /* the lower half of what every metal sees. It IS the plaza, so it follows the plaza down to black
     platinum (v8) — a metal lit from below by a floor brighter than the floor actually is reads as
     lit from nowhere, and it was the thing keeping the darks from settling. */
  const envFloor = new THREE.Mesh(new THREE.CircleGeometry(48, 24), new THREE.MeshBasicMaterial({ color: 0x080b11, side: THREE.DoubleSide })); envFloor.rotation.x = Math.PI / 2; envFloor.position.y = -0.5; envScene.add(envFloor);
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
    /* L34 — FOG FAR IS THE AERIAL LADDER'S CEILING, AND 880 WAS BELOW THE WORLD.
       terrain.js authors three deliberately-separated value ranges: near (r 620), mid (r 1050,
       base 0x172440 / ridge 0x51648f) and far (r 1500, base 0x2b3f66 / ridge 0x7a8fb8). Each is
       lighter than the one in front of it — that IS the world's depth cue, painted into the
       vertex colours. Linear fog at far = 880 reached 100% at 880 m, so BOTH the mid and far
       rings resolved to one flat 0x152c52 and the ladder terrain paid for was deleted before it
       reached the frame: every render came back value-compressed, band means inside 18 counts of
       each other. The bank must sit BEYOND the last thing worth seeing, not in front of it. */
    fogBase.near = 55 + 45 * s.daylight; fogBase.far = 2350 + 700 * s.daylight;
    applyFog();
    pointLights.forEach(l => { l.intensity = l.userData.base * (1 - 0.7 * s.daylight) * (state.diagnostic ? 0.6 : 1); });
    ctx.timeHooks.forEach(h => { try { h(s); } catch (e) {} });
    const energy = state.diagnostic ? Math.min(0.3, 1 - s.daylight) : 1 - s.daylight;
    residents.concat(extras).forEach(r => { if (r.userData && r.userData.setEnergy) r.userData.setEnergy(energy); });
    if (flora) flora.forEach(p => { if (p.userData && p.userData.setTime) p.userData.setTime(s); });
    if (vehicles && vehicles.setTime) vehicles.setTime(s);
    [terrain, city, dressing, matchInterior, life, clouds, fobeams, fobstations, monument, fobpods, broadcast, lakeCity, rainforest, mahAscent, mahDescent, outerRing, facilities, beasts, interlink, halo, haloDistricts, haloLife, haloThreshold, mahCrown, haloDome, mahHaven].forEach(mod => { if (mod && typeof mod.setTime === 'function') { try { mod.setTime(s); } catch (e) {} } });
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
    [city, dressing, matchInterior, life, clouds, fobeams, fobstations, monument, fobpods, broadcast, lakeCity, rainforest, mahAscent, mahDescent, outerRing, facilities, beasts, interlink, halo, haloDistricts, haloLife, haloThreshold, mahCrown, haloDome, mahHaven].forEach(mod => { if (mod && typeof mod.setTheme === 'function') { try { mod.setTheme(theme); } catch (e) {} } });
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
  /* ROAM (v15): the viewer's own camera. roam.js owns position, heading, collide-and-slide and the
     two gears; this file owns only the handover — when roam is on it REPLACES the anchored rail
     camera inside placeCamera(), and every composed view, the tour and the capture harness keep
     working unchanged because turning roam off restores the anchor they were always using. */
  const roam = createRoam({ THREE, boxes: colliderBoxes, onChange: r => { state.roam = r.on ? r.mode : null; } });
  /* R4 — MAH HALO IS WALKABLE, which is the difference between a sanctuary and a backdrop. A box
     list cannot describe a 2700 m wide curved deck; one analytic function can, exactly. And because
     roam's three bounds were all measured against a world whose only floor was the ground, the
     ceiling and the upper radius move with it — see roam.js's own note on the two-storey bound. */
  if (halo && HALOM && HALOM.haloFloor) {
    /* R5 — the crown's plinth is the second analytic surface in the world. crownFloor() answers a
       height inside a 240 m square at the sanctuary's centre and null everywhere else, exactly as
       haloFloor() does for the ring, so the two compose without either knowing about the other. */
    const surfaces = [HALOM.haloFloor];
    if (mahCrown && CROWNM && CROWNM.crownFloor) surfaces.push(CROWNM.crownFloor);
    roam.setSurfaces(surfaces);
    roam.setBounds({
      /* THE CEILING HAS TO CLEAR THE THING IT IS OVER. R4 set it at 2600 to clear a 1800 m ring;
         MAH CROWN's mast is at 3620, so a 2600 m ceiling makes the sanctuary's own landmark
         unreachable and unviewable from above — which would fail R5's observation clause with a
         constant nobody would think to look at. It clears the mast by 220 m. */
      ceil: mahCrown ? CROWNM.CROWN.MAST_TOP + 220 : HALOM.HALO.CEIL,
      /* above the transfer decks, nothing solid stands between the plaza and the sanctuary, so the
         upper world is as wide as the sanctuary plus a margin to see its outer rim from outside */
      highY: 900,
      highR: HALOM.HALO.R_OUT + 260
    });
  }
  /* R2 §9 — INTER-CITY FLIGHT. The destination table is built from the modules that actually got
     built, so a city that failed to load cannot be flown to and the table is never a fiction. The
     plaza is a destination too: you have to be able to come home. */
  const travelDest = { plaza: { x: 0, z: 0, radius: 60, arriveY: 34, label: 'MAHPLAZA' } };
  if (lakeCity && lakeCity.stats && lakeCity.stats.site) {
    travelDest.lake = { x: lakeCity.stats.site.x, z: lakeCity.stats.site.z, radius: (lakeCity.stats.lake && lakeCity.stats.lake.rMax) || 274, arriveY: 96, label: 'LAKE CITY' };
  }
  if (rainforest && rainforest.stats && rainforest.stats.site) {
    travelDest.forest = { x: rainforest.stats.site.x, z: rainforest.stats.site.z, radius: 300, arriveY: 104, label: 'RAINFOREST CITY' };
  }
  /* ============================================================================================
     R3-09 · MAH NAV — the compact destination menu
     ============================================================================================
     "Small unobtrusive button -> compact list of named destinations -> tap -> short confirm/preview
      -> teleport -> closes instantly without breaking movement."

     Two things separate this from the Fly-to row that already exists, and both matter:

       · FLY TO is travel.js — REAL TRAVERSAL, eight beats and 20 seconds of world streaming past
         you, and R2 §9 exists specifically to stop that being a cut. It is the SLOW way, on purpose.
       · MAH NAV is the fast way, and R3-09 authorises it: "square-diamond contraction -> brief
         MAHGIC spatial transition -> arrival pulse. Fast, premium, not a generic loading-screen snap."

     Keeping both is the design. A world you can only cross slowly is a chore; a world you can only
     jump around is small. The menu lists a destination whether or not it can be flown to, because a
     MAH FORGE 90 m away does not warrant a 20-second flight.

     The presentation is the PAGE'"'"'s, not the renderer'"'"'s: a contracting square diamond and an arrival
     pulse are two CSS keyframes, they cost no draw call, and they cannot drop a frame in a scene
     already at 900k triangles. The renderer'"'"'s job is only to be somewhere else when the diamond
     closes. */
  const navDest = () => {
    const list = [
      { id: 'plaza', label: 'HIGHER TOGETHER', sub: 'the plaza', x: 0, z: -6, y: 1.9, look: [0, 14, -70] },
      { id: 'gym', label: 'MAH GYM', sub: 'training', x: -52, z: -30, y: 1.9, look: [-64, 8, -46] },
      { id: 'match', label: 'MAH MATCH', sub: 'combat', x: 0, z: -50, y: 1.9, look: [0, 10, -74] },
      { id: 'market', label: 'MAH MARKET', sub: 'trade', x: 52, z: -30, y: 1.9, look: [64, 8, -46] }
    ];
    if (facilities && facilities.stats) {
      const F = MFAC.FACILITIES;
      const face = (k, lab, sub) => {
        const f = F[k]; if (!f) return;
        /* stand OUTSIDE the building, on its apron, looking at it — arriving inside a wall is the
           one failure a teleport must never have (travel.js makes the same choice at city scale) */
        list.push({ id: k, label: lab, sub, y: 1.9,
          x: f.x + Math.sin(f.ry) * (f.D * 0.5 + 11), z: f.z + Math.cos(f.ry) * (f.D * 0.5 + 11),
          look: [f.x, f.H * 0.55, f.z] });
      };
      face('vital', 'MAH VITAL', 'recovery + buffs');
      face('forge', 'MAH FORGE', 'upgrades');
      face('mode', 'MAH MODE', 'appearance');
    }
    if (mahAscent && mahAscent.stats) {
      list.push({ id: 'ascent', label: 'MAH ASCENT', sub: 'to the sky realm', x: -30, z: -8, y: 1.9, look: [-30, 240, -22] });
    }
    /* R4 — the eight districts are destinations. The list comes from haloDistricts.navSites(), which
       derives every position from the SAME ringPoint() that placed the district: a nav entry that
       arrives 40 m off the terrace it names is worse than no entry, and a second table here is how
       that happens (L42 again). MAH NAV is also the only way in until you have flown up once. */
    if (haloDistricts && haloDistricts.navSites) {
      try { for (const S of haloDistricts.navSites()) list.push(S); } catch (e) {}
    }
    /* R4-19 — the way OUT of the sanctuary. Three stops, so the transition is something you travel
       rather than something you are teleported past: the hold, the gate, and the flight line. */
    if (haloThreshold && haloThreshold.navSites) {
      try { for (const S of haloThreshold.navSites()) list.push(S); } catch (e) {}
    }
    /* R5 — MAH CROWN is the sanctuary's central destination, so it is a nav stop */
    if (mahCrown && mahCrown.navSites) {
      try { for (const S of mahCrown.navSites()) list.push(S); } catch (e) {}
    }
    if (haloDome && haloDome.navSites) {
      try { for (const S of haloDome.navSites()) list.push(S); } catch (e) {}
    }
    if (mahHaven && mahHaven.navSites) {
      try { for (const S of mahHaven.navSites()) list.push(S); } catch (e) {}
    }
    if (mahDescent && mahDescent.stats) {
      for (const S of mahDescent.stats.sites) {
        const d = Math.hypot(S.x, S.z) || 1;
        list.push({ id: 'descent-' + S.id, label: 'MAH DESCENT', sub: S.id.replace(/-/g, ' '), y: 1.9,
          x: S.x - (S.x / d) * 15, z: S.z - (S.z / d) * 15, look: [S.x, 7, S.z] });
      }
    }
    for (const k of ['lake', 'forest']) {
      const d = travelDest[k]; if (!d) continue;
      const dist = Math.hypot(d.x, d.z) || 1;
      list.push({ id: k, label: d.label, sub: 'peer city', y: (d.arriveY || 90) * 0.18 + 2,
        x: d.x - (d.x / dist) * d.radius * 1.05, z: d.z - (d.z / dist) * d.radius * 1.05,
        look: [d.x, 60, d.z] });
    }
    return list;
  };
  /* the teleport itself. It leaves the viewer IN ROAM and standing, because R3-09 says the menu
     "closes instantly without breaking movement" — a jump that drops you back into a rail camera
     has broken movement by definition. */
  function navGoto(id) {
    const d = navDest().find(v => v.id === id);
    if (!d) return false;
    if (travel && travel.flying) travel.cancel();
    /* setRoam is the assembly's own entry point (roam.js exposes setEnabled, not enable) and it is
       the one that seeds from the live camera, so a jump from a rail view hands over cleanly */
    if (!roam.state.on) setRoam(true, { mode: 'walk' });
    roam.setMode('walk'); roam.releaseAll();
    roam.pos.set(d.x, d.y != null ? d.y : 1.9, d.z);
    if (d.look) {
      const dx = d.look[0] - d.x, dz = d.look[2] - d.z;
      roam.state.yaw = Math.atan2(dx, -dz);
      roam.state.pitch = Math.atan2((d.look[1] || 2) - (d.y || 1.9), Math.hypot(dx, dz) || 1) * 0.8;
    }
    state.nav = id;
    return true;
  }

  const travel = createTravel({ THREE, roam, destinations: travelDest });
  state.travel = null;
  const cur = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 54 }, from = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 54 };
  let anim = null, portrait = false;
  /* THE `!v` GUARD IS NOT DEFENSIVE PADDING, IT IS A CRASH FIX. `state.view` is not always a key of
     VIEWS: setCustomView() sets it to the literal 'custom' (and look360, every scratch diagnostic and
     the capture harness all go through setCustomView), and roam sets it to 'roam'. resize() calls
     applyView(state.view) whenever the PORTRAIT FLAG FLIPS, so on the old code `VIEWS['custom']` was
     undefined and `v.portrait` threw a TypeError — i.e. rotating a phone while in any custom view
     killed the scene. On a phone-first product that is the worst possible place for it.
     Returning null is also the RIGHT behaviour and not just a safe one: a custom or roam camera was
     placed deliberately, and a portrait flip has no business overwriting it with a table entry. */
  const viewSpec = n => { const v = VIEWS[n]; if (!v) return null; return portrait && v.portrait ? v.portrait : v; };
  const applyView = n => { const v = viewSpec(n); if (!v) return false; cur.pos.set(...v.pos); cur.look.set(...v.look); cur.fov = v.fov; return true; };
  applyView('establishing');
  const dirV = new THREE.Vector3(), rightV = new THREE.Vector3(), targetV = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0), probeV = new THREE.Vector3();
  /* the camera has weight (brief §37): look / move inputs set targets, the camera follows them with critical damping; it never enters a collider (§38) */
  const smooth = { yaw: 0, pitch: 0, dolly: 0 };
  let smoothing = true;
  function placeCamera(dt = 0) {
    /* THE HANDOVER. placeCamera is the only writer of camera.position in this file (frame, resize,
       advance and samplePixels all route through it), so roam has to live HERE or be overwritten on
       the same frame it moves. It takes the whole function and still pays the portrait FOV bias,
       because that bias is what keeps phone framing correct and it is not roam's to drop. */
    if (roam.state.on) {
      /* §9: the flight WRITES roam's position and heading, then roam integrates as normal — so the
         viewer is in their own camera the whole way and can take it back at any moment. */
      if (travel.flying) { travel.update(dt); state.travel = travel.state.beat; }
      else if (state.travel) state.travel = null;
      roam.step(dt);
      roam.applyTo(camera);
      camera.fov = cur.fov + (state.fovBias || 0); camera.updateProjectionMatrix();
      return;
    }
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
    /* choosing a composed view is how you leave roam: the anchor set and the viewer's own camera are
       two different cameras and there is no sensible blend of them */
    if (roam.state.on) roam.setEnabled(false);
    state.view = name; state.yaw = 0; state.pitch = 0; state.dolly = 0; smooth.yaw = 0; smooth.pitch = 0; smooth.dolly = 0;
    if (anim && anim.resolve) { const r = anim.resolve; anim = null; r(false); }
    if (instant || state.reduced) { applyView(name); requestRender(); return Promise.resolve(true); }
    from.pos.copy(cur.pos); from.look.copy(cur.look); from.fov = cur.fov;
    return new Promise(resolve => { anim = { t0: performance.now(), dur: duration, to: viewSpec(name), resolve }; requestRender(); });
  }
  /* evidence only: frame an arbitrary point (used by the capture script to look at an ambient event) */
  function setCustomView({ pos, look, fov = 56 }) { state.view = 'custom'; state.yaw = state.pitch = state.dolly = 0; smooth.yaw = smooth.pitch = smooth.dolly = 0; anim = null; cur.pos.set(...pos); cur.look.set(...look); cur.fov = fov; requestRender(); return true; }
  /* ---- §42 / §43 ACCEPTANCE INSTRUMENT --------------------------------------------------------
     The upper realm has had a spin ring since it was built; the lower world has only ever been
     judged from named views, which is exactly the failure the law names — "a map that works from
     one angle". This is the same instrument for the city: ONE eye point, the bearing swept, so a
     sector that was never composed cannot hide behind a camera that was.

     Bearing convention is the world's, shared with sky-layout.js: dir(b) = (sin b, 0, -cos b), so
     bearing 0 looks up the spine of the site toward MAH MATCH, 90 toward MAH MARKET, 270 toward
     MAH GYM, 180 back out over the arrival ground. Pitch is signed degrees: negative looks DOWN
     at the mirror floor, 0 is level, positive is the megatall look-up test (§44).

     It does not disturb VIEWS, the tour, or the collider dolly — it is evidence only, like
     setCustomView, which it delegates to. */
  const LOOK360 = { eye: [0, 5.6, 14], reach: 90 };
  function look360(degrees, { pitch = 0, fov = 62, eye = null, height = null } = {}) {
    const b = (Number(degrees) || 0) * Math.PI / 180;
    const p = (Number(pitch) || 0) * Math.PI / 180;
    const e = eye ? eye.slice() : LOOK360.eye.slice();
    if (height != null) e[1] = height;
    const ch = Math.cos(p), r = LOOK360.reach;
    return setCustomView({
      pos: e,
      look: [e[0] + Math.sin(b) * ch * r, e[1] + Math.sin(p) * r, e[2] - Math.cos(b) * ch * r],
      fov
    });
  }
  /* ---- ROAM: the public entry ------------------------------------------------------------------
     setRoam(true) hands roam the camera's CURRENT position and look direction, so entering is a
     handover rather than a cut — you keep standing where the view left you. Leaving restores the
     anchored view that was active, which is why state.view is remembered rather than overwritten. */
  let roamPrevView = 'establishing';
  const _seedPos = new THREE.Vector3(), _seedDir = new THREE.Vector3();
  function setRoam(on, { mode } = {}) {
    on = !!on;
    if (on === roam.state.on) { if (on && mode) roam.setMode(mode); return roam.state.on; }
    if (on) {
      if (state.touring || practice.running) return false;   /* both drive setView; do not fight them */
      roamPrevView = VIEWS[state.view] ? state.view : 'establishing';
      placeCamera(0);                                        /* make sure the anchor camera is settled */
      _seedPos.copy(camera.position);
      camera.getWorldDirection(_seedDir);
      if (mode) roam.setMode(mode);
      roam.setEnabled(true, { pos: _seedPos, dir: _seedDir });
      state.view = 'roam';
      anim = null;
    } else {
      roam.setEnabled(false);
      setView(roamPrevView, { instant: true });
    }
    requestRender();
    return roam.state.on;
  }
  function setRoamMode(m) { const r = roam.setMode(m); requestRender(); return r; }
  /* §9 public entry. Engages roam first if it is not on, because a flight you watch from a fixed
     camera is the cut this is written against. */
  function travelTo(name, opt) {
    if (!roam.state.on) { if (!setRoam(true, { mode: 'fly' })) return false; }
    const ok = travel.go(name, opt);
    if (ok) { state.travel = travel.state.beat; requestRender(); }
    return ok;
  }
  function travelCancel() { const r = travel.cancel(); state.travel = null; return r; }

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
  on(el, 'pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = (e.clientX - drag.x) / el.clientWidth, dy = (e.clientY - drag.y) / el.clientHeight;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    if (drag.moved < 6) return;
    if (roam.state.on) {
      /* roam look is INCREMENTAL — the drag origin is re-based every move — because roam's yaw is
         unbounded and a from-origin delta would fight the wrap at +-PI. The rail camera below is
         absolute, because its yaw is clamped to a window around the anchor and must not drift. */
      if (travel.flying) travelCancel();       /* the viewer's hand always wins over the flight */
      roam.look(-dx * ROAM.LOOK_DRAG, -dy * ROAM.LOOK_DRAG * 0.62);
      drag.x = e.clientX; drag.y = e.clientY;
      requestRender(); return;
    }
    state.yaw = THREE.MathUtils.clamp(drag.yaw - dx * 1.7, -1.1, 1.1);
    state.pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.9, -0.4, 0.45);
    requestRender();
  });
  const endDrag = e => { if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; if (e.type === 'pointerup' && d.moved < 8 && performance.now() - d.t0 < 450 && !pinch) { const a = pick(e.clientX, e.clientY); select(a ? a.id : null); } };
  on(el, 'pointerup', endDrag); on(el, 'pointercancel', endDrag);
  on(el, 'wheel', e => { e.preventDefault(); state.dolly = THREE.MathUtils.clamp(state.dolly + (e.deltaY < 0 ? 1.2 : -1.2), -10, 40); requestRender(); }, { passive: false });
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  on(el, 'touchstart', e => { if (e.touches.length === 2) pinch = { d: dist(e.touches), dolly: state.dolly }; }, { passive: true });
  on(el, 'touchmove', e => { if (pinch && e.touches.length === 2) { state.dolly = THREE.MathUtils.clamp(pinch.dolly + (dist(e.touches) - pinch.d) / 20, -10, 40); requestRender(); } }, { passive: true });
  on(el, 'touchend', () => { setTimeout(() => { pinch = null; }, 50); });
  /* roam takes the movement keys ONLY while it is on, and never takes Escape, so every existing
     exit keeps working. keyup is registered for it too — a held key that never lifts is a camera
     that never stops. */
  on(window, 'keyup', e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (roam.key(e.key, false)) requestRender();
  });
  on(window, 'blur', () => { if (roam.state.on) { roam.releaseAll(); requestRender(); } });
  on(window, 'keydown', e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key;
    if (k === 'r' || k === 'R') { if (roam.state.on) setRoamMode(roam.state.mode === 'fly' ? 'walk' : 'fly'); else setRoam(true); e.preventDefault(); return; }
    if (roam.key(k, true)) { if (travel.flying) travelCancel(); if (k.indexOf('Arrow') === 0 || k === ' ') e.preventDefault(); requestRender(); return; }
    if (k === 'Escape' && roam.state.on) { setRoam(false); return; }
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
    if (mirror) mirror.resize();
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
  /* ---- R3-13 · DETAIL TIERS ------------------------------------------------------------------
     "Far forest = mass + landmark branches. Near forest = premium detail." A peer city 700 m away
     is drawing its medium branches, its twigs, 6500 ground instances and a diamond-rain aura that
     together are a quarter of a million triangles nobody can resolve. Each destination module owns
     its own near/far switch and its own hysteresis; the assembly's only job is to tell it how far
     away the eye currently is. Called once per rendered frame, after the camera is placed. */
  const _detEye = new THREE.Vector3();
  function updateDetailTiers() {
    camera.getWorldPosition(_detEye);
    for (const mod of [lakeCity, rainforest]) {
      if (!mod || typeof mod.setDetail !== 'function' || !mod.stats || !mod.stats.site) continue;
      mod.setDetail(Math.hypot(_detEye.x - mod.stats.site.x, _detEye.z - mod.stats.site.z));
    }
    /* R3-07: the descent doors open on approach, so they need the eye from the same place */
    if (mahDescent && mahDescent.setEye) mahDescent.setEye(_detEye.x, _detEye.y, _detEye.z);
    /* R3-13's animation tier: a pack 400 m away does not need its limbs solved every frame */
    if (beasts && beasts.setDetail && beasts.stats.territories.length) {
      let best = Infinity;
      for (const T of beasts.stats.territories) best = Math.min(best, Math.hypot(_detEye.x - T.x, _detEye.z - T.z));
      beasts.setDetail(best);
    }
    /* R4: the halo's PHYSICAL near-field follows the eye. The shell is one surface out to 3400 m;
       the 26x26 field of real tiles that gives it relief under your feet has to be where you are. */
    if (halo && halo.setEye) halo.setEye(_detEye.x, _detEye.y, _detEye.z);
    /* R4-16: the population's animation AND visibility tiers. The ring is 6800 m across, so without
       a far cut the crowd is paid for from every camera in the world — measured against the nearest
       point of the ring, not its centre, or a viewer standing ON it reads as 2050 m away. */
    if (haloLife && haloLife.setDetail) {
      const rEye = Math.hypot(_detEye.x, _detEye.z);
      haloLife.setDetail(Math.hypot(Math.abs(rEye - HALOM.HALO.R_MID), _detEye.y - HALOM.HALO.Y));
    }
    /* R4-19: the threshold's near detail. Measured to the GATE, because that is the object whose
       run-out plates and kerbs stop resolving — the cloud beyond it is meant to be seen from
       everywhere and is never the thing being tiered. */
    /* R5 — the crown's band and glass tiers. Measured to the AXIS, because the tower is a vertical
       line and its distance from a viewer is a horizontal distance, not a distance to a centroid
       1.8 km up. */
    if (mahCrown && mahCrown.setDetail) {
      mahCrown.setDetail(Math.hypot(_detEye.x, _detEye.z));
    }
    /* R5 — the dome's climbing holds are the near field. Measured to the SHELL, not to the axis:
       a viewer standing on the ring at r 2050 is 1400 m from the dome's spring, not 2050 m from
       anything, and tiering on the wrong distance is how a near field ends up never being near. */
    if (haloDome && haloDome.setDetail) {
      const rE = Math.hypot(_detEye.x, _detEye.z);
      haloDome.setDetail(Math.hypot(DOMEM.DOME.R - rE, _detEye.y - DOMEM.DOME.SPRING_Y));
    }
    if (haloThreshold && haloThreshold.setDetail && haloThreshold.stats.gate) {
      const G = haloThreshold.stats, th = G.deg * Math.PI / 180;
      haloThreshold.setDetail(Math.hypot(_detEye.x - Math.cos(th) * G.gateR,
        _detEye.z - Math.sin(th) * G.gateR));
    }
    updateFrustum();
  }

  /* ---- R4 · THE FRUSTUM IS NOW A FUNCTION OF ALTITUDE ------------------------------------------
     The 2600 m far plane was measured against the ground world: fly to Lake City and the ridge
     behind the plaza is 2200 m away. From the halo the far rim of the ring is 6800 m across and the
     ground is 1800 m down, so a fixed 2600 clips away most of the thing R4 exists to show — and
     R4's curvature proof needs a multi-kilometre view by definition.

     It cannot simply be raised: near 0.1 with far 8000 is a depth ratio of 80,000, and the plaza's
     coplanar inlays and 3 cm paving relief are exactly what z-fighting eats first. So both planes
     move together, and the ratio stays inside what the ground world already survives. The switch is
     hysteretic on altitude so a hover at the threshold cannot flicker the depth precision. */
  function updateFrustum() {
    const y = _detEye.y;
    const want = frustumHigh ? y > 520 : y > 900;   /* 380 m of hysteresis */
    if (want === frustumHigh) return;
    frustumHigh = want;
    camera.near = want ? 1.2 : 0.1;
    camera.far = want ? 9000 : 2600;
    camera.updateProjectionMatrix();
    /* L34 AT ALTITUDE. The fog bank has to sit beyond the last thing worth seeing, and from the
       halo the last thing worth seeing is the far rim 6800 m away and the world 1800 m below. Left
       at 2350 the bank stands in front of the whole sanctuary and R4's curvature proof photographs
       a wall of haze. The near end opens with it, so the ladder keeps the same SHAPE at both
       altitudes rather than becoming a hard edge. */
    applyFog();
  }

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
    if (fobstations && fobstations.update) fobstations.update(t, dt);
    if (fobpods && fobpods.update) fobpods.update(t, dt);
    if (broadcast && broadcast.update) broadcast.update(t, dt);
    if (lakeCity && lakeCity.update) lakeCity.update(t, dt);
    if (rainforest && rainforest.update) rainforest.update(t, dt);
    if (mahAscent && mahAscent.update) mahAscent.update(t, dt);
    if (mahDescent && mahDescent.update) mahDescent.update(t, dt);
    if (outerRing && outerRing.update) outerRing.update(t, dt);
    if (facilities && facilities.update) facilities.update(t, dt);
    if (beasts && beasts.update) beasts.update(t, dt);
    if (interlink && interlink.update) interlink.update(t, dt);
    if (halo && halo.update) halo.update(t, dt);
    if (haloDistricts && haloDistricts.update) haloDistricts.update(t, dt);
    if (haloLife && haloLife.update) haloLife.update(t, dt);
    if (haloThreshold && haloThreshold.update) haloThreshold.update(t, dt);
    if (mahCrown && mahCrown.update) mahCrown.update(t, dt);
    if (haloDome && haloDome.update) haloDome.update(t, dt);
    if (mahHaven && mahHaven.update) mahHaven.update(t, dt);
    if (monument && monument.update) monument.update(t, dt);
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
    /* THE VIEWER'S CAMERA IS PART OF THE WORLD STEP. advance() exists so evidence exercises exactly
       the code a viewer's browser runs, and it used to step everything except the one thing the
       viewer actually drives — it called placeCamera(0) once at the end, so a roam camera integrated
       nothing. Stepping roam inside the loop makes a capture reproduce a walk deterministically at a
       fixed dt, which also takes the acceptance harness off the software renderer's real frame rate
       (L14: under SwiftShader this page runs near 1 fps, and roam's own anti-teleport clamp caps a
       frame at 0.1 s, so wall-clock key holds measure the renderer, not the movement). */
    for (let i = 0; i < n; i++) {
      advanceClock += stepSeconds;
      if (roam.state.on) roam.step(stepSeconds);
      stepWorld(advanceClock, stepSeconds, advanceClock * 1000);
    }
    applyTime(false); placeCamera(0);
    if (mirror) mirror.render(true);   /* a capture screenshots straight after this: never reuse */
    sky.follow(camera);                                  /* L43: the sky is a direction, not a place */
    updateDetailTiers();
    renderer.render(scene, camera); state.frames++;
    return { advancedSeconds: n * stepSeconds, steps: n, worldTime: advanceClock };
  }
  /* ============================ THE FLOOR IS A MIRROR ============================================
     "Extremely much more reflective, almost so that it's like a mirror to the rest of the city."

     Roughness alone could never do this, and it is worth being precise about why. A metal's
     roughness controls how sharply it returns the ENVIRONMENT MAP, and the environment map here is a
     128x64 equirect of sky and a ring of window bars. It contains no buildings, no residents, no
     signage — so no matter how polished the floor became, the city was never in it. The old
     mirrored-copy trick reflected only the handful of emissive meshes explicitly registered with
     ctx.reflect(); everything else in MAHWORLD simply had no reflection at all.

     A real mirror needs a real second view. This renders the whole scene from a camera reflected
     through the plaza plane into an offscreen target, and feeds that texture back into M.plaza
     projected in screen space — the classic planar reflection, hand-rolled because Reflector is a
     three addon and this project vendors only the core.

     THREE THINGS THAT MAKE IT CORRECT RATHER THAN JUST SHINY:
       - the mirror plane is the DECK TOP (FLOOR_TOP = 0.17), the same plane the old mirrored copies
         were finally corrected to; a reflection that does not meet its object at the contact line is
         the first thing an eye notices on a mirror
       - an OBLIQUE NEAR PLANE clips the reflected camera exactly at the mirror, so nothing below the
         floor leaks into the image and no separate clipping pass is needed
       - the blend is FRESNEL-WEIGHTED: weak looking straight down, near-total at grazing angles,
         which is why a wet street mirrors the far city but not your own feet
     The old mirrored-copy group is switched OFF wherever this runs — two reflection systems on one
     plane would double every light — and stays as the low tier's fallback. */
  const MIRROR_Y = 0.17;
  mirror = (() => {
    if (!quality.reflections) return null;
    const size = new THREE.Vector2();
    renderer.getSize(size);
    const rt = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType, depthBuffer: true });
    rt.texture.name = 'plaza-mirror';
    const cam = new THREE.PerspectiveCamera();
    const texMatrix = new THREE.Matrix4();
    const normal = new THREE.Vector3(0, 1, 0);
    const mirrorPos = new THREE.Vector3(0, MIRROR_Y, 0);
    const view = new THREE.Vector3(), target = new THREE.Vector3(), up = new THREE.Vector3(), look = new THREE.Vector3();
    const rot = new THREE.Matrix4(), plane = new THREE.Plane(), q = new THREE.Vector4(), cp = new THREE.Vector4();
    let strength = { value: 0.52 }, hidden = [];   /* v10 §10: 0.9 duplicated the city; see the shader note */
    /* A REFLECTION ONLY CHANGES WHEN THE VIEW DOES. The city behind it is static; the mirror pass is
       a second full scene render, so redrawing it every frame doubles the whole cost to show an
       identical image. It is redrawn when the camera has actually moved, and forced whenever
       something else needs it fresh. That is what keeps a mirror affordable on a phone, and it is
       why a capture — which moves the camera, then screenshots — still gets a correct frame. */
    const lastPos = new THREE.Vector3(NaN, NaN, NaN), lastQuat = new THREE.Quaternion(0, 0, 0, 0);
    let dirty = true;
    return {
      rt, texMatrix, strength,
      /* every mesh that must not appear in its own reflection: the floor itself, and the legacy
         mirrored copies. Collected once, after the graph exists. */
      collect() {
        hidden.length = 0;
        scene.traverse(o => {
          if (!o.isMesh) return;
          const m = o.material;
          const mats = Array.isArray(m) ? m : [m];
          if (mats.some(x => x === M.plaza || x === M.road)) hidden.push(o);
        });
        hidden.push(reflections);
      },
      resize() {
        dirty = true;
        renderer.getSize(size);
        /* half resolution: a reflection is read through a rough-ish, fresnel-weighted blend and at
           grazing angles, where the eye cannot resolve what full resolution would buy */
        rt.setSize(Math.max(2, Math.floor(size.x * 0.5)), Math.max(2, Math.floor(size.y * 0.5)));
      },
      invalidate() { dirty = true; },
      render(force) {
        if (!force && !dirty
          && camera.position.distanceToSquared(lastPos) < 1e-8
          && Math.abs(camera.quaternion.dot(lastQuat)) > 0.9999999) return;
        dirty = false;
        lastPos.copy(camera.position); lastQuat.copy(camera.quaternion);
        mirrorPos.set(0, MIRROR_Y, 0);
        normal.set(0, 1, 0);
        view.subVectors(mirrorPos, camera.position);
        view.reflect(normal).negate().add(mirrorPos);
        rot.extractRotation(camera.matrixWorld);
        look.set(0, 0, -1).applyMatrix4(rot);
        target.copy(camera.position).add(look);
        look.subVectors(mirrorPos, target).reflect(normal).negate().add(mirrorPos);
        cam.position.copy(view);
        up.set(0, 1, 0).applyMatrix4(rot).reflect(normal).negate();
        cam.up.copy(up);
        cam.lookAt(look);
        cam.near = camera.near; cam.far = camera.far; cam.fov = camera.fov; cam.aspect = camera.aspect;
        cam.updateMatrixWorld(); cam.updateProjectionMatrix();

        /* project world space into this target's UVs: bias * projection * view */
        texMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
        texMatrix.multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);

        /* OBLIQUE NEAR PLANE — clip the reflected view exactly at the mirror so the world below the
           floor can never leak into it. Cheaper and tighter than a clipping plane, and it is what
           stops the underside of the deck appearing in its own surface. */
        plane.setFromNormalAndCoplanarPoint(normal, mirrorPos).applyMatrix4(cam.matrixWorldInverse);
        q.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
        const p = cam.projectionMatrix;
        cp.set((Math.sign(q.x) + p.elements[8]) / p.elements[0], (Math.sign(q.y) + p.elements[9]) / p.elements[5], -1, (1 + p.elements[10]) / p.elements[14]);
        q.multiplyScalar(2 / q.dot(cp));
        p.elements[2] = q.x; p.elements[6] = q.y; p.elements[10] = q.z + 1 - 0.0000001; p.elements[14] = q.w;

        const wasVis = hidden.map(o => o.visible);
        hidden.forEach(o => { o.visible = false; });
        const prevTarget = renderer.getRenderTarget();
        const prevShadow = renderer.shadowMap.autoUpdate;
        renderer.shadowMap.autoUpdate = false;         /* the shadow maps from the main pass are reused */
        renderer.setRenderTarget(rt);
        renderer.clear();
        renderer.render(scene, cam);
        renderer.setRenderTarget(prevTarget);
        renderer.shadowMap.autoUpdate = prevShadow;
        hidden.forEach((o, i) => { o.visible = wasVis[i]; });
      },
      dispose() { rt.dispose(); }
    };
  })();

  if (mirror) {
    mirror.resize();
    mirror.collect();
    reflections.visible = false;   /* the planar pass supersedes the mirrored copies */
    /* Patch the floor's shader rather than replacing the material: M.plaza keeps its diamond
       roughness and bump maps, its metalness and its place in the palette, and gains one projected
       sample on top. */
    M.plaza.onBeforeCompile = (shader) => {
      shader.uniforms.tPlazaMirror = { value: mirror.rt.texture };
      shader.uniforms.uMirrorMatrix = { value: mirror.texMatrix };
      shader.uniforms.uMirrorStrength = mirror.strength;
      shader.vertexShader = 'uniform mat4 uMirrorMatrix;\nvarying vec4 vMirrorCoord;\n' + shader.vertexShader
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vMirrorCoord = uMirrorMatrix * ( modelMatrix * vec4( transformed, 1.0 ) );');
      shader.fragmentShader = 'uniform sampler2D tPlazaMirror;\nuniform float uMirrorStrength;\nvarying vec4 vMirrorCoord;\n' + shader.fragmentShader
        .replace('#include <opaque_fragment>', `
        {
          /* SURFACE BREAK-UP. The plaza is cut stone, not a pond: ground.js sets every cell crown
             about 1.2 degrees off its own table and every joint is a real edge. Pushing the
             projected sample along the BUMPED normal is what puts that relief into the reflection,
             so the returned city is broken across the lattice instead of arriving whole — and it is
             the cheapest available stand-in for a roughness-convolved probe. */
          vec4 mcoord = vMirrorCoord;
          mcoord.xy += normal.xz * 0.085 * mcoord.w;
          /* ROUGHNESS CONVOLUTION GROWS WITH PATH LENGTH. A perfectly sharp planar pass returns the
             skyline as legibly upside down as it is right way up, and no amount of dimming fixes
             that — a dim duplicate is still a duplicate. Real polished stone smears a reflection
             VERTICALLY, and it smears the far ones more than the near ones, because the reflected
             ray has travelled further across the same micro-relief. Three taps up the view axis,
             widening with distance: the bench two metres away stays crisp, the tower four hundred
             metres away arrives as a streak of its own light. This, not the strength, is what turns
             "the city is duplicated upside down" into "that floor is insane". */
          float mdist = length( vViewPosition );
          float smear = ( 0.0035 + 0.030 * smoothstep( 18.0, 140.0, mdist ) ) * mcoord.w;
          vec4 mup = mcoord + vec4( 0.0, smear, 0.0, 0.0 );
          vec4 mdn = mcoord - vec4( 0.0, smear, 0.0, 0.0 );
          vec3 mrefl = texture2DProj( tPlazaMirror, mcoord ).rgb * 0.40
            + texture2DProj( tPlazaMirror, mup ).rgb * 0.30
            + texture2DProj( tPlazaMirror, mdn ).rgb * 0.30;
          /* FRESNEL. A mirror floor returns almost everything at a grazing angle and very little
             looking straight down at your feet — that asymmetry is most of what reads as "wet
             polished stone" rather than "a picture pasted on the ground". */
          float ndv = clamp( dot( normalize( vViewPosition ), normal ), 0.0, 1.0 );
          float fres = pow( 1.0 - ndv, 4.0 );
          /* COHERENCE FALLS OFF WITH PATH LENGTH — the correction §10 actually asks for. Every plaza
             camera looks at this floor at a 2-12 degree depression, so fresnel alone was near 1.0
             across the whole visible deck and the far half returned the skyline sharply enough to
             be read as a second city hanging upside down. That is the one reaction the law rules
             out. The NEAR floor keeps its reflection — lamps, seams, the monument, residents, the
             part that reads as "that floor is insane" — and the far floor lets go of it. */
          float coh = 1.0 - 0.72 * smoothstep( 60.0, 300.0, mdist );
          /* BLACK PLATINUM ABSORBS. What comes back off this stone is darker and cooler than the
             thing that cast it; returning it neat is what makes a mirror read as a hole. */
          mrefl *= vec3( 0.52, 0.60, 0.78 );

          /* ---- v11: ALMOST PITCH BLACK, AND STILL A MIRROR --------------------------------------
             Direction: "I want the reflective floor almost pitch black."

             Those two words fight each other only while the deck's OWN value and the value it
             RETURNS are the same number. mix() made them the same number: it REPLACES the surface
             with the reflection, so the floor could never be darker than what it was reflecting.
             Reflecting a night sky at lum 90 gave a floor at lum 90, and no amount of tinting the
             stone could get underneath that — which is exactly why three passes at the material
             failed to move the measured pixel.

             A real black mirror does not work that way. Obsidian is not a window onto a second
             city; it is a black surface that ADDS what it catches. Dark reflected content adds
             nothing and the stone stays black; bright reflected content — a lit window, a lamp, a
             beam, a sign — adds a streak. So the operator changes from mix to ADD, and the
             surface's own term is crushed first:

               surface  x 0.11   the deck contributes almost nothing of its own
               + reflection      the ONLY thing that lifts it above black

             The result is a floor that is nearly pitch black wherever it is returning sky, mountain
             or dark mass, and carries bright streaks of the city exactly where the city is lit —
             which is both what the reference frames show and what the direction asks for. It also
             means the darker the world behind the camera, the blacker the floor, automatically. */
          outgoingLight *= 0.11;
          outgoingLight += mrefl * uMirrorStrength * coh * ( 0.05 + 0.95 * fres );
        }
        #include <opaque_fragment>`);
    };
    M.plaza.needsUpdate = true;
  }

  function frame(now) {
    raf = 0;
    if (advanceClock < now / 1000) advanceClock = now / 1000;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (now - lastClockCheck > 1000 || !lastApplied) { lastClockCheck = now; applyTime(false); }
    if (anim) { const k = Math.min(1, (now - anim.t0) / anim.dur), e = ease(k); cur.pos.lerpVectors(from.pos, new THREE.Vector3(...anim.to.pos), e); cur.look.lerpVectors(from.look, new THREE.Vector3(...anim.to.look), e); cur.fov = from.fov + (anim.to.fov - from.fov) * e; if (k >= 1) { const r = anim.resolve; anim = null; r(true); } }
    if (!state.reduced || ctx.updateHooks.length) stepWorld(now / 1000, dt, now);
    placeCamera(dt);
    const t0 = performance.now();
    if (mirror) mirror.render();     /* the reflected view first: the floor samples it this frame */
    sky.follow(camera);                                  /* L43 */
    updateDetailTiers();
    renderer.render(scene, camera);
    state.ms = state.ms * 0.9 + (performance.now() - t0) * 0.1; state.frames++;
    if (opts.hud) opts.hud(state);
    /* ROAM KEEPS THE LOOP ALIVE. Under prefers-reduced-motion this loop parks itself the moment
       nothing is settling, which is right for an ambient scene and fatal for a camera the viewer is
       driving — a held key would move you one frame and stop. A viewer holding W has asked for
       motion explicitly, so roam counts as a reason to keep asking for frames, and reduced-motion
       still governs everything roam does not touch. */
    const settling = Math.abs(smooth.yaw - state.yaw) + Math.abs(smooth.pitch - state.pitch) + Math.abs(smooth.dolly - state.dolly) > 0.002;
    if (!hidden && (anim || !state.reduced || ctx.updateHooks.length || settling || roam.state.on)) raf = requestAnimationFrame(frame);
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
    if (monument && monument.setQuality) { try { monument.setQuality(quality); } catch (e) {} }
    if (fobpods && fobpods.setQuality) { try { fobpods.setQuality(quality); } catch (e) {} }
    if (broadcast && broadcast.setQuality) { try { broadcast.setQuality(quality); } catch (e) {} }
    if (lakeCity && lakeCity.setQuality) { try { lakeCity.setQuality(quality); } catch (e) {} }
    if (rainforest && rainforest.setQuality) { try { rainforest.setQuality(quality); } catch (e) {} }
    if (mahAscent && mahAscent.setQuality) { try { mahAscent.setQuality(quality); } catch (e) {} }
    if (mahDescent && mahDescent.setQuality) { try { mahDescent.setQuality(quality); } catch (e) {} }
    if (outerRing && outerRing.setQuality) { try { outerRing.setQuality(quality); } catch (e) {} }
    if (facilities && facilities.setQuality) { try { facilities.setQuality(quality); } catch (e) {} }
    if (halo && halo.setQuality) { try { halo.setQuality(quality); } catch (e) {} }
    if (haloDistricts && haloDistricts.setQuality) { try { haloDistricts.setQuality(quality); } catch (e) {} }
    if (haloLife && haloLife.setQuality) { try { haloLife.setQuality(quality); } catch (e) {} }
    if (haloThreshold && haloThreshold.setQuality) { try { haloThreshold.setQuality(quality); } catch (e) {} }
    if (mahCrown && mahCrown.setQuality) { try { mahCrown.setQuality(quality); } catch (e) {} }
    if (haloDome && haloDome.setQuality) { try { haloDome.setQuality(quality); } catch (e) {} }
    if (beasts && beasts.setQuality) { try { beasts.setQuality(quality); } catch (e) {} }
    if (interlink && interlink.setQuality) { try { interlink.setQuality(quality); } catch (e) {} }
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
    placeCamera(); sky.follow(camera); updateDetailTiers(); if (mirror) mirror.render(); renderer.render(scene, camera);
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
    views: Object.keys(VIEWS), viewLabels: Object.fromEntries(Object.keys(VIEWS).map(k => [k, VIEWS[k].label])), setView, setCustomView, look360, tour, ready, state, clock, camera, scene, renderer, buildings,
    residents, flora, vehicles, get theme() { return theme; }, themes: Object.keys(THEMES), avatarColours: AVATAR_COLOURS.slice(),
    modules: { terrain: !!terrain, city: !!city, dressing: !!dressing, matchInterior: !!matchInterior, life: !!life, clouds: !!clouds, fobeams: !!fobeams, fobstations: !!fobstations, monument: !!monument, fobpods: !!fobpods, broadcast: !!broadcast, lakeCity: !!lakeCity, rainforest: !!rainforest, mahAscent: !!mahAscent, mahDescent: !!mahDescent, outerRing: !!outerRing, facilities: !!facilities, beasts: !!beasts, interlink: !!interlink, halo: !!halo, haloDistricts: !!haloDistricts, haloLife: !!haloLife, haloThreshold: !!haloThreshold, mahCrown: !!mahCrown, haloDome: !!haloDome, mahHaven: !!mahHaven }, terrain, city, dressing, matchInterior, life, clouds, fobeams, fobstations, monument, fobpods, broadcast, lakeCity, rainforest, mahAscent, mahDescent, outerRing, facilities, beasts, interlink, halo, haloDistricts, haloLife, haloThreshold, mahCrown, haloDome, mahHaven,
    actions: ctx.actions.map(a => ({ id: a.id, label: a.label, kind: a.kind })), select, go, pick,
    practicePreview, practiceExit, practiceContinue,
    setWorldTheme, setSelfAppearance, setRemoteAppearance, describeAppearance, residentScreenSamples, samplePixels,
    navDestinations: () => navDest().map(d => ({ id: d.id, label: d.label, sub: d.sub })), navGoto,
    setDiagnostic, setQuality, get quality() { return quality.name; }, qualities: Object.keys(QUALITY), advance,
    setRoam, setRoamMode, roam,
    /* R4's ANIMATION STATES — BASE_IDLE, EVENT, MUSIC_ACTIVE — reach the sanctuary through here and
       nowhere else. The renderer deliberately does not listen to audio: MAH PLAYER is the world's
       one music owner and the standing constraint forbids a second AudioContext, so the page drives
       this from the player it already has. Default BASE_IDLE, which is a slow breath and not a
       blink. Returns the state actually set, or null if the halo did not build. */
    setHaloState(s) {
      let out = null;
      if (haloDistricts && haloDistricts.setState) { try { out = haloDistricts.setState(s); } catch (e) {} }
      if (halo && halo.setState) { try { halo.setState(s); } catch (e) {} }
      requestRender();
      return out;
    },
    get haloDistrictList() { return haloDistricts ? haloDistricts.districts : []; },
    travelTo, travelCancel, travel, travelDestinations: () => Object.keys(travelDest),
    /* validation: pin or release world time */
    setTime(spec) { if (spec == null || spec === 'live') clock.release(); else clock.freeze(spec); applyTime(true); requestRender(); return clock.state(); },
    renderOnce() { requestRender(); },
    dispose
  };
}
