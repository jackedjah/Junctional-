/* MAHWORLD :: THE UPPER REALM — assembly.

   The sibling of mahplaza.js. Where that assembles the city on the ground, this assembles the
   SKYBIOME above it: the realm reached only by the vertical ascent vehicles. Same renderer, same
   materials, same world clock, same module contract — a different layer of the same world.

   WHAT THIS FILE OWNS, and what it deliberately does not.
     OWNS   the renderer, the scene, the camera and its views, the light rig, the environment map,
            fog, quality tiers, the world clock, the update loop, and the WIRING between modules.
     DOES NOT OWN  a single piece of geometry. Every visible thing comes from an optional module:
            sky-atmosphere, sky-terrain, sky-structures, ascent, sky-beams, sky-life. Each is loaded
            with a guarded dynamic import and the realm degrades to whatever is present, which is how
            the lower world's modules work and how this one was built in parallel.

   THE ONE THING THAT MAKES THIS A BIOME AND NOT FOUR MAPS. sky-layout.js is the contract: it owns
   the bearing convention, the four sectors and their smooth blend, the single directional
   atmosphere() function, and deckHeight()/deckSolid() — the cloud floor as terrain. This file reads
   the same contract as every module, so the sky the camera sees, the light on a platform, the colour
   inside a cloud and the reflection in a pod's shell all come from one source. If they ever
   disagree, the bug is in sky-layout.js.

   THE ENVIRONMENT MAP IS THE POINT (materials law). A metal takes no diffuse light: every
   metalness >= 0.9 surface in MAHWORLD is lit ONLY by scene.environment. In the city that was a ring
   of lit windows. Here it is the sky itself, painted DIRECTIONALLY from atmosphere(), over a bright
   cloud floor. So a platinum pad turns warm on the flank facing the sunset and violet on the flank
   facing the cold side, and is lit from BELOW by the cloud — which is the actual physics of standing
   on an ocean of lit vapour, and it is why this realm reads lighter than the city without anything
   being painted lighter.

   Exposes window.MAHWORLD_SKYREALM for the capture harness, including look360() — the brief's §43
   full-rotation proof is a first-class API here, not something a test has to fake. */

import * as THREE from '../vendor/three/three.module.min.js';
import { createWorldClock } from './world-clock.js';
import { createMaterials, resolveTheme } from './materials.js';
import * as L from './sky-layout.js';

/* ---------------------------------------------------------------- quality */
/* Tiers the ASSEMBLY owns (pixel ratio, shadows, env resolution). The per-module counts live in
   sky-layout.QUALITY so every module degrades together rather than each inventing its own idea. */
const TIERS = {
  high: { name: 'high', pixelRatio: 2, shadows: true, envSamples: 256, fogSteps: 1 },
  medium: { name: 'medium', pixelRatio: 1.5, shadows: true, envSamples: 192, fogSteps: 2 },
  low: { name: 'low', pixelRatio: 1.25, shadows: false, envSamples: 128, fogSteps: 3 }
};
function resolveTier(q) { return TIERS[q] || TIERS.high; }

/* ------------------------------------------------------------------ views */
/* Every view is expressed as a position and a look target in world space. Positions that should sit
   on the cloud floor are given as a SITE plus an eye height, so a camera never floats above or sinks
   into a deck that rolls — the same deckHeight() discipline the builders are held to. */
const EYE = 1.72;
const VIEWS = {
  arrival: {
    site: 'staging', eye: EYE + 0.6, lookBearing: 0, lookRange: 300, lookY: 34, fov: 52,
    label: 'Arrival — stepping out onto the staging apron, facing the sunset',
    portrait: { eye: EYE + 1.1, lookY: 60, fov: 62 }
  },
  concourse: {
    site: 'staging', eye: EYE + 1.4, lookBearing: Math.PI * 0.97, lookRange: 130, lookY: 26, fov: 54,
    label: 'MAH ASCENT — turning around to the concourse and the pads'
  },
  pads: {
    site: 'padB', eye: EYE + 5.5, offset: { bearing: 2.55, r: 46 }, lookBearing: 3.02, lookRange: 60, lookY: 8, fov: 48,
    label: 'Ascent pads — a pod docked, one preparing'
  },
  overlook: {
    site: 'overlook', eye: EYE + 1.0, lookBearing: 0.02, lookRange: 900, lookY: 90, fov: 50,
    label: 'Sunset overlook — the cliff, the cloud ocean, the peaks below'
  },
  cliff: {
    site: 'cliffMarker', eye: EYE + 0.4, lookBearing: 0.10, lookRange: 200, lookY: -180, fov: 58,
    label: 'The cliff edge — where the cloud floor stops and the void opens'
  },
  training: {
    site: 'ringNear', eye: EYE + 6.0, offset: { bearing: 0.9, r: 70 }, lookBearing: 2.0, lookRange: 700, lookY: 40, fov: 56,
    label: 'Training expanse — the open flats, rings, gates and distance'
  },
  highcloud: {
    site: 'relayTower', eye: EYE + 8.0, offset: { bearing: 1.2, r: 120 }, lookBearing: -1.85, lookRange: 2200, lookY: 620, fov: 54,
    label: 'High cloud — the cold side: towers, anvils, upper atmosphere'
  },
  islands: {
    site: 'gateLane', eye: EYE + 10, lookBearing: 1.35, lookRange: 620, lookY: 130, fov: 52,
    label: 'Cloud islands — the traversal chain out over the flats'
  },
  voidview: {
    site: 'restDeck', eye: EYE + 2.0, lookBearing: 0.42, lookRange: 430, lookY: -260, fov: 56,
    label: 'Void — a hole in the cloud floor and the world far below'
  },
  wide: {
    /* the only camera that leaves the deck: a high establishing shot of the whole realm */
    absolute: { x: 250, y: 420, z: 520 }, look: { x: -60, y: 40, z: -140 }, fov: 46,
    label: 'Establishing — the realm from above and behind the arrival side'
  }
};
/* the §43 rotation proof: one standing position, eight bearings */
const SPIN_SITE = 'staging', SPIN_EYE = EYE + 0.6;

function reducedMotion() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

export async function createSkyrealm(canvas, options = {}) {
  const opts = Object.assign({ theme: null, time: null, pixelRatioCap: 2, hud: null, quality: null, view: 'arrival' }, options);
  let theme = resolveTheme(opts.theme || 'canonical');
  let tier = resolveTier(opts.quality);
  const clock = createWorldClock();
  /* the realm's signature hour is the sunset the brief's reference shows; a page may override it */
  clock.freeze(opts.time || '18:10');

  const state = {
    version: 'skyrealm-v1', view: opts.view, bearing: 0, frames: 0, ms: 0,
    reduced: reducedMotion(), theme: theme.name, quality: tier.name, clock: null, band: null, modules: null
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.pixelRatioCap, tier.pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = tier.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  /* Fog here is ATMOSPHERE, not a hiding place (§44 of the ecosystem brief, §33 of this one): its job
     is to make 6 km read as 6 km. The far plane is enormous because the peaks are, and the colour is
     taken from the sky in the direction the camera faces, refreshed as it turns. */
  scene.fog = new THREE.Fog(0xbfa9b4, 900, 8200);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.4, 24000);
  const M = createMaterials(theme);

  const ctx = {
    THREE, scene, camera, M, theme, clock, layout: L,
    quality: tier.name, timeHooks: [], updateHooks: []
  };

  const optional = async (name) => {
    try { return await import(name); }
    catch (e) {
      if (!/Failed to fetch|Cannot find|Failed to resolve|404|import/i.test(String(e && e.message))) console.info('SKYREALM optional module ' + name + ' —', e && e.message);
      return null;
    }
  };
  const ATMO = await optional('./sky-atmosphere.js');
  const TERRAIN = await optional('./sky-terrain.js');
  const STRUCT = await optional('./sky-structures.js');
  const ASCENT = await optional('./ascent.js');
  const BEAMS = await optional('./sky-beams.js');
  const LIFE = await optional('./sky-life.js');

  /* ---- light rig ------------------------------------------------------- */
  /* Three lights and no more. The KEY is the sun, low in sector A. The HEMI carries the fact that
     this world is lit from below as much as above — the cloud floor is a vast bright reflector, and
     ignoring that is what would make the realm look like a dark room with a white carpet. The FILL
     comes from the cold side so the shadowed flank of everything stays violet rather than black:
     clouds scatter light heavily and a crushed black shadow up here is simply wrong (§14). */
  const lights = {
    sun: new THREE.DirectionalLight(0xfff0da, 2.35),
    hemi: new THREE.HemisphereLight(0xdcb8c8, 0xf0f4ff, 1.15),
    fill: new THREE.DirectionalLight(0x9fa8dd, 0.55)
  };
  lights.sun.castShadow = tier.shadows;
  if (lights.sun.shadow) {
    lights.sun.shadow.mapSize.set(1024, 1024);
    const c = lights.sun.shadow.camera;
    c.near = 20; c.far = 900; c.left = -260; c.right = 260; c.top = 220; c.bottom = -220;
    lights.sun.shadow.bias = -0.0012; lights.sun.shadow.normalBias = 0.6;
  }
  scene.add(lights.sun, lights.sun.target, lights.hemi, lights.fill);

  /* ---- build the realm --------------------------------------------------- */
  const modules = {};
  const add = (mod, key) => { if (mod && mod.group) { scene.add(mod.group); modules[key] = mod; } return mod; };
  const guard = (name, fn) => { try { return fn(); } catch (e) { console.info('SKYREALM: ' + name + ' failed —', e && e.message); return null; } };

  /* order matters only where one module hands another a contract */
  const atmosphere = ATMO && ATMO.buildSkyAtmosphere ? add(guard('sky-atmosphere', () => ATMO.buildSkyAtmosphere(ctx)), 'atmosphere') : null;
  const terrain = TERRAIN && TERRAIN.buildSkyTerrain ? add(guard('sky-terrain', () => TERRAIN.buildSkyTerrain(ctx)), 'terrain') : null;

  /* THE CLOUD SURFACE IS THE GROUND. Anything placed after this asks the terrain module where the
     visible cloud top is, so a pad or a resident sits ON the cloud rather than inside it. When the
     terrain module is absent the layout's own deckHeight is the fallback, which keeps every other
     module working against a coherent — if undetailed — world. */
  ctx.cloudTopAt = (terrain && typeof terrain.cloudTopAt === 'function')
    ? terrain.cloudTopAt
    : (TERRAIN && typeof TERRAIN.cloudTopAt === 'function' ? TERRAIN.cloudTopAt : ((x, z) => L.deckHeight(x, z)));
  /* the cloud's own reaction to a launch, a landing or an ability (§29–§31) */
  ctx.disturb = (terrain && typeof terrain.disturb === 'function') ? terrain.disturb : null;

  const structures = STRUCT && STRUCT.buildSkyStructures ? add(guard('sky-structures', () => STRUCT.buildSkyStructures(ctx)), 'structures') : null;
  /* the ascent module docks to the REAL pads the structures module built, not to nominal positions */
  ctx.pads = (structures && structures.pads) || null;
  const ascent = ASCENT && ASCENT.buildAscent ? add(guard('ascent', () => ASCENT.buildAscent(ctx)), 'ascent') : null;
  /* and the queue pylon shows the pods' real states rather than a static picture */
  if (ascent && structures && typeof structures.setQueue === 'function') ctx.publishQueue = structures.setQueue;

  const beams = BEAMS && BEAMS.buildSkyBeams ? add(guard('sky-beams', () => BEAMS.buildSkyBeams(ctx)), 'beams') : null;
  const life = LIFE && LIFE.buildSkyLife ? add(guard('sky-life', () => LIFE.buildSkyLife(ctx)), 'life') : null;

  const modList = [atmosphere, terrain, structures, ascent, beams, life].filter(Boolean);
  state.modules = { atmosphere: !!atmosphere, terrain: !!terrain, structures: !!structures, ascent: !!ascent, beams: !!beams, life: !!life };

  /* ---- environment map: the sky, painted directionally, over a lit cloud floor ---- */
  /* This is the realm's real key light for every metal. It is an equirectangular DataTexture filled
     straight from layout.atmosphere(), so the environment and the visible sky can never disagree,
     then run through PMREM so roughness blurs it properly. Rebuilt only when the hour moves enough
     to matter — it is the most expensive thing in the frame and nothing about it animates. */
  const pmrem = new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader();
  const ENV_W = 128, ENV_H = 64;
  const envData = new Uint8Array(ENV_W * ENV_H * 4);
  const envTex = new THREE.DataTexture(envData, ENV_W, ENV_H, THREE.RGBAFormat);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  envTex.needsUpdate = true;
  let envRT = null, envAt = null;
  const _ec = new THREE.Color(), _ef = new THREE.Color();
  const TAU = Math.PI * 2;
  /* THE EQUIRECT CONVENTION, taken from three's own equirectUv() rather than assumed:
       u = atan2(dir.z, dir.x) / 2PI + 0.5      v = asin(dir.y) / PI + 0.5
     Two consequences that are easy to get wrong and that both matter here.
     LATITUDE IS A SINE, not a linear ramp: y = sin((v − 0.5)·PI). Treating the row index as a
     linear elevation squashes the horizon band toward the poles and puts the sun's reflection at
     the wrong height.
     AZIMUTH IS OFFSET BY A QUARTER TURN from this world's bearings. dir(0) = (0,0,−1) sits at
     u = 0.25, so bearing = (u − 0.25)·2PI. Getting this wrong rotates the entire environment 90
     degrees, which would put the sunset's reflection on the cold flank of everything metal. */
  function paintEnvironment(band, clockState) {
    const sun = L.sunDirection(band && band.a ? band.a : 'dusk');
    for (let row = 0; row < ENV_H; row++) {
      const v = (row + 0.5) / ENV_H;
      const lat = (v - 0.5) * Math.PI;
      const ey = Math.sin(lat), er = Math.cos(lat);
      for (let col = 0; col < ENV_W; col++) {
        const u = (col + 0.5) / ENV_W;
        const bearing = (u - 0.25) * TAU;
        L.atmosphere(bearing, ey, band, _ec);
        if (ey < -0.02) {
          /* BELOW THE HORIZON IS NOT GROUND HERE — it is the cloud ocean, and it is bright. This is
             the half of the environment the city version did not have, and it is what lights the
             undersides of every platform, pod and railing in the realm. */
          const t = Math.min(1, (-ey - 0.02) / 0.42);
          _ef.setHex(L.fillFor(bearing, band));
          _ec.lerp(_ef, 0.55 * t).multiplyScalar(1 + 0.42 * t);
        }
        /* the sun's own disc, so a mirror grade has something to catch */
        const dot = Math.sin(bearing) * er * sun.x + ey * sun.y + -Math.cos(bearing) * er * sun.z;
        if (dot > 0.9915) _ec.multiplyScalar(1 + 5.5 * ((dot - 0.9915) / 0.0085) * Math.max(0, sun.y + 0.24));
        const i = (row * ENV_W + col) * 4;
        envData[i] = Math.min(255, Math.round(Math.sqrt(_ec.r) * 255));
        envData[i + 1] = Math.min(255, Math.round(Math.sqrt(_ec.g) * 255));
        envData[i + 2] = Math.min(255, Math.round(Math.sqrt(_ec.b) * 255));
        envData[i + 3] = 255;
      }
    }
    envTex.needsUpdate = true;
    if (envRT) envRT.dispose();
    envRT = pmrem.fromEquirectangular(envTex);
    scene.environment = envRT.texture;
    /* the realm is lit BY WHAT IT REFLECTS more than the city was: an ocean of lit cloud in every
       direction is a genuinely strong source, and this is the number that makes platinum read */
    scene.environmentIntensity = 1.25 - 0.35 * (clockState ? clockState.daylight : 0.5);
  }

  /* ---- time of day ------------------------------------------------------- */
  const _fogC = new THREE.Color();
  let band = null;
  function applyTime(force) {
    const cs = clock.state();
    state.clock = { hhmm: cs.hhmm, label: cs.label, band: cs.band, daylight: cs.daylight, sunElevation: cs.sunElevation };
    band = L.atmoBand(cs);
    /* report the EFFECTIVE band, not the pair: a blend sitting at t = 0 is simply its first key, and
       showing "dusk→night" while nothing of night is mixed in reads as a bug in a capture log */
    state.band = (band.a === band.b || band.t <= 0.02) ? band.a
      : band.t >= 0.98 ? band.b
        : band.a + '→' + band.b + ' ' + band.t.toFixed(2);

    /* the sun: azimuth pinned to sector A because the sunset direction is a fact about this place,
       elevation driven by the shared world clock so the realm turns with the world below */
    const sd = L.sunDirection(band.t > 0.5 ? band.b : band.a);
    lights.sun.position.set(sd.x * 600, Math.max(0.06, sd.y) * 600, sd.z * 600);
    lights.sun.target.position.set(0, 0, 0);
    lights.sun.color.setHex(L.atmoSunColour(band));
    lights.sun.intensity = L.atmoScalar(band, 'sunI');
    lights.hemi.intensity = L.atmoScalar(band, 'hemiI');
    /* sky half of the hemisphere takes the zenith overhead; the GROUND half takes the cloud, which
       is the brightest thing under everything in this world */
    lights.hemi.color.setHex(L.atmosphere(0, 0.9, band));
    lights.hemi.groundColor.setHex(L.fillFor(camera ? state.bearing : 0, band));
    /* the fill comes from the cold side, so shadowed flanks stay violet and never crush to black */
    const cd = L.dir(L.SECTORS[3].bearing);
    lights.fill.position.set(cd.x * 500, 260, cd.z * 500);
    lights.fill.color.setHex(L.fillFor(L.SECTORS[3].bearing, band));
    renderer.toneMappingExposure = L.atmoScalar(band, 'exposure');

    modList.forEach(m => { if (typeof m.setTime === 'function') { try { m.setTime(cs, band); } catch (e) {} } });
    ctx.timeHooks.forEach(h => { try { h(cs, band); } catch (e) {} });

    if (force || envAt == null || Math.abs(cs.sunElevation - envAt) > 0.02) { paintEnvironment(band, cs); envAt = cs.sunElevation; }
    applyFog();
  }
  /* Fog colour follows the direction the camera is FACING. That is the whole trick that stops four
     sectors reading as four maps: turn toward the sunset and the distance goes warm; turn to the
     cold side and the same distance goes violet, continuously, because it is one function. */
  function applyFog() {
    if (!band) return;
    const f = (atmosphere && typeof atmosphere.fog === 'function') ? atmosphere.fog(band) : null;
    L.atmosphere(state.bearing, 0.03, band, _fogC);
    scene.fog.color.copy(_fogC);
    scene.fog.near = f && f.near != null ? f.near : 700;
    scene.fog.far = f && f.far != null ? f.far : 8600;
  }

  /* ---- camera ------------------------------------------------------------ */
  const _look = new THREE.Vector3();
  function placeCamera(v, portrait) {
    const spec = Object.assign({}, v, portrait && v.portrait ? v.portrait : null);
    let px, py, pz;
    if (spec.absolute) { px = spec.absolute.x; py = spec.absolute.y; pz = spec.absolute.z; }
    else {
      const s = L.siteAt(spec.site);
      let x = s.x, z = s.z;
      if (spec.offset) { const d = L.dir(spec.offset.bearing); x += d.x * spec.offset.r; z += d.z * spec.offset.r; }
      px = x; pz = z;
      py = ctx.cloudTopAt(x, z) + (spec.eye || EYE);
    }
    camera.position.set(px, py, pz);
    if (spec.look) _look.set(spec.look.x, spec.look.y, spec.look.z);
    else {
      const d = L.dir(spec.lookBearing || 0);
      _look.set(px + d.x * (spec.lookRange || 300), (spec.lookY != null ? spec.lookY : py), pz + d.z * (spec.lookRange || 300));
    }
    camera.lookAt(_look);
    camera.fov = spec.fov || 52;
    /* the bearing the camera is FACING drives fog and hemisphere colour */
    state.bearing = L.bearingOf(_look.x - px, _look.z - pz);
    camera.updateProjectionMatrix();
    applyFog();
  }
  const isPortrait = () => canvas.clientHeight > canvas.clientWidth;
  function setView(name) {
    const v = VIEWS[name]; if (!v) return state.view;
    state.view = name; placeCamera(v, isPortrait()); return name;
  }
  /* §43 — the full-rotation proof, as a first-class API. One standing position on the staging apron,
     any bearing, so a reviewer can prove the realm is authored in every direction rather than in
     front of one hero camera. */
  function look360(degrees, o = {}) {
    const b = (Number(degrees) || 0) * Math.PI / 180;
    const s = L.siteAt(SPIN_SITE);
    const py = ctx.cloudTopAt(s.x, s.z) + SPIN_EYE;
    camera.position.set(s.x, py, s.z);
    const d = L.dir(b);
    const range = o.range || 500;
    _look.set(s.x + d.x * range, py + (o.pitch != null ? o.pitch : 26), s.z + d.z * range);
    camera.lookAt(_look);
    camera.fov = o.fov || (isPortrait() ? 66 : 56);
    camera.updateProjectionMatrix();
    state.view = 'look360@' + Math.round(Number(degrees) || 0);
    state.bearing = b;
    applyFog();
    return { degrees: Number(degrees) || 0, bearing: b, sector: L.dominantSector(b).id, sectorName: L.dominantSector(b).name };
  }

  function resize() {
    const w = canvas.clientWidth || canvas.width || 1, h = canvas.clientHeight || canvas.height || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    placeCamera(VIEWS[state.view] || VIEWS.arrival, isPortrait());
  }

  /* ---- loop -------------------------------------------------------------- */
  let raf = 0, t0 = 0, running = true, lastEnvCheck = 0;
  function stepWorld(t, dt) {
    modList.forEach(m => { if (typeof m.update === 'function') { try { m.update(t, dt, camera); } catch (e) {} } });
    ctx.updateHooks.forEach(h => { try { h(t, dt, camera); } catch (e) {} });
    /* the queue pylon follows the pods' real states */
    if (ctx.publishQueue && ascent && ascent.queue) { try { ctx.publishQueue(ascent.queue); } catch (e) {} }
    /* the clock is frozen for validation by default; when it is not, the sky follows it */
    if (t - lastEnvCheck > 4) { lastEnvCheck = t; if (!clock.state().frozen) applyTime(false); }
  }
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!t0) t0 = now;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, t - (state.t || 0));
    state.t = t;
    const a = performance.now();
    stepWorld(t, dt);
    renderer.render(scene, camera);
    state.ms = state.ms * 0.9 + (performance.now() - a) * 0.1;
    state.frames++;
    if (opts.hud) opts.hud(state);
  }

  /* deterministic advance for headless capture, since headless Chromium throttles rAF below 1 fps */
  function advance(seconds, step = 1 / 30) {
    let t = state.t || 0;
    const end = t + seconds;
    while (t < end) { const dt = Math.min(step, end - t); t += dt; stepWorld(t, dt); }
    state.t = t;
    renderer.render(scene, camera);
    return t;
  }

  applyTime(true);
  resize();
  setView(opts.view);
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);

  const api = {
    version: state.version, state, scene, camera, renderer, clock, modules, layout: L,
    setView, look360, advance,
    views: () => Object.keys(VIEWS).map(k => ({ id: k, label: VIEWS[k].label })),
    setTime(spec) { if (spec == null) clock.release(); else clock.freeze(spec); applyTime(true); return clock.state(); },
    setQuality(q) {
      tier = resolveTier(q); state.quality = tier.name; ctx.quality = tier.name;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.pixelRatioCap, tier.pixelRatio));
      renderer.shadowMap.enabled = tier.shadows; lights.sun.castShadow = tier.shadows;
      modList.forEach(m => { if (typeof m.setQuality === 'function') { try { m.setQuality(tier.name); } catch (e) {} } });
      resize(); return tier.name;
    },
    setTheme(next) {
      theme = resolveTheme(next); state.theme = theme.name; ctx.theme = theme;
      /* ENERGY ONLY. The sky, the cloud, the stars and the peaks are nature and are never repainted
         by a Theme — that law is the modules' to keep, and the assembly simply passes it on. */
      modList.forEach(m => { if (typeof m.setTheme === 'function') { try { m.setTheme(theme); } catch (e) {} } });
      return theme.name;
    },
    stats() {
      const s = { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, modules: {} };
      modList.forEach((m, i) => { const k = Object.keys(modules)[i]; if (m.stats) s.modules[k] = m.stats; });
      return s;
    },
    dispose() {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      modList.forEach(m => { if (typeof m.dispose === 'function') { try { m.dispose(); } catch (e) {} } });
      if (envRT) envRT.dispose();
      envTex.dispose(); pmrem.dispose(); renderer.dispose();
    }
  };
  window.MAHWORLD_SKYREALM = api;
  api.ready = Promise.resolve(api);
  return api;
}
