/* MAHWORLD :: UPPER REALM — WHO IS UP HERE, AND WHAT THEY ARE DOING (§26, §27, §28)

   The lower world is crowded because it is a city. This one is not, and the single most important
   number in this file is layout.QUALITY[tier].residents = 14 at high: fourteen people in a realm
   1.1 km across. Ten stand on the cloud and four are held back as DISTANT SILHOUETTES, which are the
   rarest and therefore the most exciting thing that happens here (§28). Anything that reads as a
   crowd has already failed — the sky is supposed to feel free.

   WHAT ACTUALLY HAPPENS
     · a few residents watch the sunset from the overlook and the rest deck, which is the whole
       programme of sector A and needs no more than that (§25);
     · residents ARRIVE and LEAVE at the pads — the only reason anyone is up here at all;
     · FLIGHT LEARNING (§27), which is what this realm is FOR. Three levels, one arc:
         BEGINNER      a tiny lift, a wobble the resident corrects, a settle back to the cloud
         INTERMEDIATE  a several-metre hover, a directional drift, a controlled landing
         ADVANCED      a vertical climb, a large arc out to a cloud island and back, and a landing
       Charming and aspirational, never slapstick (§27). Nobody falls over, nobody is embarrassed,
       and a failed attempt is a wobble that gets caught — the difference between "learning" and
       "comic relief" is entirely in the descent, so every descent here is controlled.
     · consensual SPARRING at the rings (§21, §22). The perimeter is an AGREEMENT: twelve small
       diamonds rise when the two agree and fade when they are done. It is practice — restrained
       drives and a step back, no impact, no violence — and it is not always happening.

   DETERMINISM IS A FEATURE, NOT AN OPTIMISATION. The whole event timeline is generated ONCE at
   build from a seeded schedule and then played back as a function of (t mod PERIOD), so a capture at
   t = 91 s shows the same thing on every run and a reviewer comparing two builds is comparing the
   builds. Concurrency (max 3) and actor availability are resolved at GENERATION time, which is also
   why no event can ever fail to find a cast mid-frame.

   THE TWO CONTRACT LAWS
     1  Nobody stands at y = 0. Every grounded actor's height comes from ctx.cloudTopAt (or
        layout.deckHeight), and where sky-structures.js has built a LEVELLED DECK — the apron, the
        overlook, the rest deck, the two near rings — this file re-derives that deck's top by the
        same rule that module uses, so a resident stands ON the platform rather than shin-deep in the
        cloud beside it. Every spawn point is checked against layout.deckSolid(); a flyer is the only
        thing here allowed to be over nothing, and only while it is flying.
     2  No atmospheric colour is invented. Residents own their own crystal colours (residents.js) and
        the world Theme never repaints a person — that law is inherited verbatim from life.js. The
        three things this module DOES own — the sparring perimeter, the levitation trail and the lift
        column — are MAHGIC, so they follow the Theme's energy pair and nothing else.

   Cost: the residents are the cost, and they are capped by the contract. Everything this file adds
   on top is three pooled InstancedMeshes and update() allocates nothing. */

import * as THREE from '../vendor/three/three.module.min.js';
import * as layout from './sky-layout.js';
import { createResident, createImpostor, COLOURS } from './residents.js';

const { QUALITY, SITES, ISLANDS, VOIDS } = layout;
const TAU = Math.PI * 2, HALF_PI = Math.PI / 2;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function smooth(v) { const t = clamp01(v); return t * t * (3 - 2 * t); }

/* THE PLATFORMS RESIDENTS ACTUALLY STAND ON.
   sky-structures.js is not handed to this module (the assembly passes cloudTopAt, disturb and pads
   and nothing more), so the four levelled decks a person can be on are re-derived here by that
   module's own rule: sample a band of ground, level at its MAXIMUM, add the deck's clearance. The
   numbers below are its numbers. If they ever drift apart the symptom is unmistakable — a resident
   sunk into a platform or hovering over it — which is exactly why they are one table and commented
   on both sides rather than two scattered constants. */
const PLATFORMS = {
  staging: { r: 24.0, band: 24.0 * 1.05, rings: 3, spokes: 16, clear: 0.55 },
  restDeck: { r: 10.5, band: 10.5 * 1.06, rings: 3, spokes: 14, clear: 0.90 },
  ringNear: { r: 10.0, band: 10.0 * 1.06, rings: 3, spokes: 14, clear: 0.45 },
  ringMid: { r: 9.0, band: 9.0 * 1.06, rings: 3, spokes: 14, clear: 0.45 },
  /* the overlook is an ARC, not a disc: 32 m deep and 54 m across on the ridge at the cliff */
  overlook: { arc: true, halfArc: 0.115, r0: SITES.overlook.r - 13, r1: SITES.overlook.r + 19, clear: 1.0 }
};

/* THE CAST. Ten grounded residents, and the ORDER IS THE DEGRADATION ORDER: a lower tier keeps a
   prefix of this list, so it must still describe the realm. At 'low' the world holds five people —
   someone on the arrival apron, someone watching the sunset, a sparring pair and one resident
   learning to fly — which is every one of the brief's named activities except the distant
   silhouettes, and those are the rarest thing here and so the first a low tier can afford to lose. */
/* `spread` is how far from the site a home may be placed and it is bounded by what the person is
   standing on: a ring deck is 10 m across, so 5 keeps a fighter clear of its rim, while the overlook
   is 54 m of arc and 11–13 stops two watchers from sharing the same railing. */
const CAST = [
  { id: 'arrival-1', site: 'staging', role: 'walk', lod: 'near', patrol: 9, spread: 13, colour: 'blue' },
  { id: 'sunset-1', site: 'overlook', role: 'watch', lod: 'near', patrol: 0, spread: 11, colour: 'violet' },
  { id: 'ring-1', site: 'ringNear', role: 'ring', lod: 'mid', patrol: 0, spread: 5, colour: 'teal' },
  { id: 'ring-2', site: 'ringNear', role: 'ring', lod: 'mid', patrol: 0, spread: 5, colour: 'crimson' },
  { id: 'flyer-1', site: 'launchPylons', role: 'learn', lod: 'far', patrol: 5, spread: 20, colour: 'green' },
  { id: 'arrival-2', site: 'staging', role: 'walk', lod: 'near', patrol: 12, spread: 17, colour: 'silver' },
  { id: 'sunset-2', site: 'overlook', role: 'watch', lod: 'mid', patrol: 0, spread: 13, colour: 'platinum' },
  { id: 'flyer-2', site: 'launchPylons', role: 'learn', lod: 'far', patrol: 6, spread: 24, colour: 'purple' },
  { id: 'rest-1', site: 'restDeck', role: 'watch', lod: 'mid', patrol: 0, spread: 6, colour: 'emerald' },
  { id: 'arrival-3', site: 'staging', role: 'walk', lod: 'mid', patrol: 14, spread: 19, colour: 'blue' }
];
/* four impostors, invisible until a silhouette event borrows one */
const SILHOUETTES = ['sil-1', 'sil-2', 'sil-3', 'sil-4'];

/* FLIGHT, parameterised by skill. Scaled for THIS realm and not for the plaza: the lower world's
   advanced flight was a 13 m arc between two roofs, and up here the nearest cloud island is 470 m
   out and 62 m up, so an advanced flight is a genuine journey and a beginner's lift is still 1.1 m.
   That gap is the point — it is what makes the beginner's attempt read as the first step of
   something enormous rather than as a small jump (§27). */
const SKILL = [
  { name: 'beginner', rise: 1.10, wobble: 0.155, drift: 0.0, dur: 9.0, trail: false, disturb: 0.0 },
  { name: 'intermediate', rise: 5.60, wobble: 0.048, drift: 9.5, dur: 13.0, trail: true, disturb: 0.35 }
];
const FLIGHT_CLIMB = [78, 128];          /* the advanced vertical climb, before the arc out */

const PERIOD = 420;                      /* the realm's ambient loop, in seconds */
const MAX_CONCURRENT = 3;                /* restraint: most of the sky is calm at any moment (§26) */

/* THE EVENT TABLE.
   `anchor` is where the event happens and `reach` is how far an actor may be from it to be cast.
   That pair exists because this realm is a KILOMETRE across: the lower world could pull any idle
   resident into any event because the whole plaza was 80 m wide, and doing the same here would
   teleport a person from the sunset overlook to the training flats 500 m away in one frame. So an
   event recruits locally or it does not happen — which is also why the cast list above puts people
   where the activities are rather than scattering them prettily. */
const EVENT_KINDS = [
  { kind: 'arrive', weight: 3, dur: [20, 26], cast: 1, prefer: 'walk', anchor: 'staging', reach: 60 },
  { kind: 'depart', weight: 3, dur: [22, 28], cast: 1, prefer: 'walk', anchor: 'staging', reach: 60 },
  /* Flight happens at the LAUNCH PYLONS and nowhere else: that is the facility sky-structures builds
     for it, down to a lit strip up each pylon's leading edge for a resident to line up on. The reach
     is 45 m so only the two residents who live there can be cast — an earlier 175 m reach let a
     sparring resident be recruited from the ring 132 m away and teleported across the flats in one
     frame, which the training camera sees. Events recruit locally or they do not happen. */
  { kind: 'learn', weight: 5, dur: [9, 14], cast: 1, prefer: 'learn', anchor: 'launchPylons', reach: 45 },
  { kind: 'flight', weight: 3, dur: [26, 32], cast: 1, prefer: 'learn', anchor: 'launchPylons', reach: 45 },
  /* THE LESSON: one resident who can already hold a hover and one who is still learning beside it.
     Two, not three — with fourteen people in the sky, a three-hander could never be cast, and an
     event that never fires is a comment pretending to be a feature. */
  { kind: 'lesson', weight: 2, dur: [20, 24], cast: 2, prefer: 'learn', anchor: 'launchPylons', reach: 45 },
  /* Three rings, fourteen people: the bout happens at the readable near ring and the other two exist
     to sell distance (§21's own reasoning). Anchoring at ringMid would simply fail to cast. */
  { kind: 'spar', weight: 3, dur: [30, 38], cast: 2, prefer: 'ring', anchor: 'ringNear', reach: 45 },
  /* silhouettes are the RAREST thing in the realm and that is the whole of their value (§28): a
     figure crossing the sunset is exciting once and wallpaper five times, so the weights put roughly
     one of each in a 420 s loop and no more */
  { kind: 'silhouette', weight: 2, dur: [16, 26], cast: 1, prefer: 'impostor', anchor: null },
  { kind: 'airpair', weight: 1, dur: [20, 28], cast: 2, prefer: 'impostor', anchor: null }
];

const PERIM = 12, PERIM_SLOTS = 2;       /* the sparring agreement: twelve diamonds, two bouts max */
const TRAIL_SLOTS = 3, TRAIL_LEN = 16;   /* the levitation trail, pooled */

export function buildSkyLife(ctx) {
  const scene = ctx && ctx.scene;
  const M = (ctx && ctx.M) || {};
  const theme0 = (ctx && ctx.theme) || M.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };
  const group = new THREE.Group(); group.name = 'sky-life';

  const owned = { geometries: [], materials: [] };
  let tier = typeof ctx?.quality === 'string' ? ctx.quality : (ctx?.quality && ctx.quality.name) || 'high';
  if (!QUALITY[tier]) tier = 'high';

  /* contract law 1: the cloud floor, from the module that draws it when there is one */
  const ground = (ctx && typeof ctx.cloudTopAt === 'function') ? ctx.cloudTopAt : layout.deckHeight;
  /* §29: the cloud may answer a landing. Optional — the terrain module owns it. */
  const disturbFn = (ctx && typeof ctx.disturb === 'function') ? ctx.disturb : null;

  const R = layout.rng('sky-life-v1');
  const rr = (a, b) => a + (b - a) * R();

  /* ================================================================ 1. STANDING ON THINGS */
  function bandMax(cx, cz, r, rings, spokes) {
    let mx = ground(cx, cz);
    for (let k = 1; k <= rings; k++) {
      const rad = r * k / rings;
      for (let a = 0; a < spokes; a++) {
        const th = a / spokes * TAU;
        const h = ground(cx + Math.cos(th) * rad, cz + Math.sin(th) * rad);
        if (h > mx) mx = h;
      }
    }
    return mx;
  }
  /* Resolve each platform ONCE: its centre, its radius and the level top a person stands on. */
  const decks = [];
  for (const name of Object.keys(PLATFORMS)) {
    const P = PLATFORMS[name], s = SITES[name], p = layout.xz(s);
    let top;
    if (P.arc) {
      let gMax = -Infinity;
      for (let i = 0; i <= 22; i++) for (let j = 0; j <= 4; j++) {
        const b = s.bearing - P.halfArc + (i / 22) * P.halfArc * 2, rad = P.r0 + (P.r1 - P.r0) * j / 4;
        const d = layout.dir(b);
        const h = ground(d.x * rad, d.z * rad);
        if (h > gMax) gMax = h;
      }
      top = gMax + P.clear;
      /* an arc is treated as a disc centred on its own middle for the "am I on it" test; the arc is
         32 m deep and 54 m wide, so a 15 m disc sits comfortably inside it */
      decks.push({ name, x: p.x, z: p.z, r: 15, top });
    } else {
      top = bandMax(p.x, p.z, P.band, P.rings, P.spokes) + P.clear;
      decks.push({ name, x: p.x, z: p.z, r: P.r, top });
    }
  }
  /* The height a person standing at (x, z) stands at: a platform's level top when they are on one,
     the rolling cloud otherwise. NEVER a constant.

     THE RIM BLEND. MAHBEINGS levitate — they have no feet and hover above whatever is under them —
     so they do not STEP up onto a deck, they rise onto it. Blending over the last 2.6 m of the
     approach is both what that looks like and the fix for a measured defect: a resident walking from
     an ascent pad onto the arrival apron popped 2.9 m vertically in one frame at the apron's edge,
     because the apron is levelled 2.9 m above the cloud beside it. */
  const RIM = 2.6;
  function standY(x, z) {
    for (let i = 0; i < decks.length; i++) {
      const d = decks[i], dx = x - d.x, dz = z - d.z;
      const dd = dx * dx + dz * dz;
      if (dd >= d.r * d.r) continue;
      const dist = Math.sqrt(dd);
      if (dist <= d.r - RIM) return d.top;
      const g = ground(x, z);
      return g + (d.top - g) * smooth((d.r - dist) / RIM);
    }
    return ground(x, z);
  }
  const deckOf = name => { for (let i = 0; i < decks.length; i++) if (decks[i].name === name) return decks[i]; return null; };

  /* A home is placed on solid cloud, deterministically, and NOT on top of somebody else. The
     personal-space test is not fussiness: two of the sunset watchers came out 1.27 m apart on the
     first build, which at 1.9 m tall is two crystal figures intersecting in the hero frame of the
     entire realm. The retry is bounded and falls back to the site itself; there is no unbounded
     search anywhere in this file. */
  const SPACE = 3.6;
  function homeNear(siteName, spread, index, taken) {
    const s = SITES[siteName], p = layout.xz(s);
    const d = deckOf(siteName);
    let fallback = null;
    for (let k = 0; k < 20; k++) {
      /* the golden angle keeps successive candidates far apart in bearing rather than clustered */
      const a = (index * 2.399963 + k * 2.399963 * 3) % TAU;
      const rad = spread * (0.30 + 0.70 * ((k * 0.37 + index * 0.61) % 1));
      const x = p.x + Math.cos(a) * rad, z = p.z + Math.sin(a) * rad;
      /* on a levelled deck, "solid" is the deck; off it, the contract's own test */
      const onDeck = d && (x - d.x) * (x - d.x) + (z - d.z) * (z - d.z) < d.r * d.r * 0.8;
      if (!onDeck && !layout.deckSolid(x, z)) continue;
      if (!fallback) fallback = { x, z };
      let clear = true;
      for (let i = 0; i < taken.length; i++) {
        const dx = x - taken[i].x, dz = z - taken[i].z;
        if (dx * dx + dz * dz < SPACE * SPACE) { clear = false; break; }
      }
      if (clear) return { x, z };
    }
    return fallback || { x: p.x, z: p.z };
  }
  /* A patrol radius is only as large as the solid cloud around it: shrink until the whole circle is
     standable, so a strolling resident can never walk off the edge of the world. */
  function safePatrol(x, z, want) {
    let r = want;
    while (r > 0.4) {
      let ok = true;
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU;
        if (!layout.deckSolid(x + Math.cos(a) * r, z + Math.sin(a) * r) && !onAnyDeck(x + Math.cos(a) * r, z + Math.sin(a) * r)) { ok = false; break; }
      }
      if (ok) return r;
      r *= 0.7;
    }
    return 0;
  }
  function onAnyDeck(x, z) {
    for (let i = 0; i < decks.length; i++) {
      const d = decks[i], dx = x - d.x, dz = z - d.z;
      if (dx * dx + dz * dz < d.r * d.r) return true;
    }
    return false;
  }

  /* ================================================================ 2. THE CAST */
  const actors = [];
  const SUN = layout.SUN_BEARING;
  const takenHomes = [];
  CAST.forEach((c, i) => {
    const h = homeNear(c.site, c.spread, i, takenHomes);
    takenHomes.push(h);
    const y = standY(h.x, h.z);
    /* the pose IS the role, and residents.js already carries all three: 'walk' for the people moving
       across the apron, 'guard' at the rings because it leaves the arms drivable for a practice bout,
       and 'observe' — a slight lean and a head tilt — for the ones at the overlook, which is the
       whole of what sector A asks anyone to do (§25) */
    const pose = c.role === 'walk' ? 'walk' : c.role === 'ring' ? 'guard' : c.role === 'watch' ? 'observe' : 'stand';
    let g = null;
    try {
      g = createResident({
        colour: c.colour, physique: 0.2 + ((i * 0.37) % 1) * 0.65, sex: i % 2 ? 'f' : 'm',
        pose, seed: 1000 + i * 37, height: 1.84 + ((i * 0.23) % 1) * 0.18, lod: c.lod, id: c.id
      });
    } catch (e) {
      /* an older residents build, or a pose this one does not carry: the silhouette still stands in */
      g = createImpostor({ colour: c.colour, height: 1.9, id: c.id });
    }
    g.position.set(h.x, y, h.z);
    /* everyone in sector A faces the sun, because that is what they came for (§25); everyone else
       faces the thing they are here to use */
    const face = c.role === 'watch' ? SUN : layout.bearingOf(-h.x, -h.z);
    g.rotation.y = face;
    g.userData.role = 'sky-' + c.role;
    group.add(g);
    actors.push({
      id: c.id, kind: 'resident', g, role: c.role, site: c.site, lod: c.lod, colour: c.colour,
      home: { x: h.x, y, z: h.z }, face,
      patrol: safePatrol(h.x, h.z, c.patrol),
      /* THE PATROL FREQUENCIES ARE INTEGER MULTIPLES OF 1 / PERIOD. That is what makes the whole
         module exactly periodic: at the loop wrap every idle resident is back where it started, so
         the realm has no seam, and — because the ambient position is then a function of loop time
         alone — an event can be told where its actor WILL BE standing without simulating up to it. */
      w1: (11 + Math.floor(R() * 9)) / PERIOD, w2: (7 + Math.floor(R() * 8)) / PERIOD,
      w3: (2 + Math.floor(R() * 3)) / PERIOD,
      p1: R() * TAU, p2: R() * TAU,
      busy: false, active: true, index: i
    });
  });
  SILHOUETTES.forEach((id, i) => {
    const colour = COLOURS[(i * 3 + 1) % COLOURS.length];
    const g = createImpostor({ colour, height: 1.88 + i * 0.03, id });
    g.visible = false;
    group.add(g);
    actors.push({
      id, kind: 'impostor', g, role: 'impostor', site: null, lod: 'impostor', colour,
      home: { x: 0, y: 0, z: 0 }, face: 0, patrol: 0, w1: 0, w2: 0, p1: 0, p2: 0,
      busy: false, active: true, index: CAST.length + i
    });
  });
  const GROUNDED = CAST.length;

  /* ================================================================ 3. MAHGIC — the three things
     this module draws itself. All pooled, all additive, all Theme-owned energy (§12). */
  const perimMat = new THREE.MeshBasicMaterial({ color: theme0.energyLight, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const trailMat = new THREE.MeshBasicMaterial({ color: theme0.energy, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const columnMat = new THREE.MeshBasicMaterial({ color: theme0.energy, transparent: true, opacity: 0.20, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
  perimMat.name = 'skylife-perimeter'; trailMat.name = 'skylife-trail'; columnMat.name = 'skylife-column';
  owned.materials.push(perimMat, trailMat, columnMat);

  const diamond = new THREE.OctahedronGeometry(1, 0);          /* the reserved square-diamond mark */
  owned.geometries.push(diamond);
  const perimMesh = new THREE.InstancedMesh(diamond, perimMat, PERIM * PERIM_SLOTS);
  perimMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  perimMesh.name = 'sky-life-perimeter'; perimMesh.frustumCulled = false; perimMesh.renderOrder = 12;
  const trailMesh = new THREE.InstancedMesh(diamond, trailMat, TRAIL_SLOTS * TRAIL_LEN);
  trailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  trailMesh.name = 'sky-life-trail'; trailMesh.frustumCulled = false; trailMesh.renderOrder = 13;
  /* the lift column: a soft vertical card under a resident who is holding a hover, so the hover
     reads as an EFFORT rather than as a floating bug */
  const columnGeo = new THREE.PlaneGeometry(1, 1);
  owned.geometries.push(columnGeo);
  const columnMesh = new THREE.InstancedMesh(columnGeo, columnMat, TRAIL_SLOTS);
  columnMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  columnMesh.name = 'sky-life-columns'; columnMesh.frustumCulled = false; columnMesh.renderOrder = 11;
  group.add(perimMesh, trailMesh, columnMesh);
  {
    const w = new THREE.Color(1, 1, 1);
    for (let i = 0; i < perimMesh.count; i++) perimMesh.setColorAt(i, w);
    for (let i = 0; i < trailMesh.count; i++) trailMesh.setColorAt(i, w);
    for (let i = 0; i < columnMesh.count; i++) columnMesh.setColorAt(i, w);
  }
  /* pooled trail state — preallocated, so a flight allocates nothing (§45) */
  const trailPos = new Float32Array(TRAIL_SLOTS * TRAIL_LEN * 3);
  const trailAge = new Float32Array(TRAIL_SLOTS * TRAIL_LEN).fill(2);
  const trailHead = new Int32Array(TRAIL_SLOTS);
  const trailTick = new Float32Array(TRAIL_SLOTS);
  const trailOwner = new Int32Array(TRAIL_SLOTS).fill(-1);
  const columnState = new Float32Array(TRAIL_SLOTS * 5);       /* x, y, z, height, alpha */

  /* ================================================================ 4. THE SCHEDULE
     Generated once, deterministic, with concurrency and casting resolved HERE so that playback can
     never fail to find an actor. An event that could not be cast is simply not scheduled — which is
     also how the timeline stays honest about a realm that only holds fourteen people. */
  const schedule = [];
  const busyUntil = new Float32Array(actors.length);           /* used only during generation */
  const busyFrom = new Float32Array(actors.length).fill(-999);
  const spans = [];                                            /* [t0, t1] of every scheduled event */
  const away = [];                                             /* windows where an actor is off-world */

  function concurrentAt(t0, t1) {
    let n = 0;
    for (let i = 0; i < spans.length; i++) if (t0 < spans[i][1] && spans[i][0] < t1) n++;
    return n;
  }
  function castFor(need, prefer, t0, t1, ax, az, reach) {
    const picked = [];
    /* a 4 s cushion either side, so nobody steps out of one commitment straight into the next */
    const freeAt = i => {
      for (let k = 0; k < schedule.length; k++) {
        const e = schedule[k];
        for (let j = 0; j < e.cast.length; j++) {
          if (e.cast[j] !== i) continue;
          if (t0 < e.t0 + e.dur + 4 && e.t0 - 4 < t1) return false;
        }
      }
      return true;
    };
    const inReach = a => {
      if (reach == null || a.kind === 'impostor') return true;
      const dx = a.home.x - ax, dz = a.home.z - az;
      return dx * dx + dz * dz <= reach * reach;
    };
    const wants = a => (prefer === 'impostor' ? a.kind === 'impostor' : a.kind === 'resident' && a.role === prefer);
    /* the preferred role first, then any grounded resident who is close enough — someone waiting on
       the apron can take a turn at the ring next to them, and a cast this small cannot be precious */
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < actors.length && picked.length < need; i++) {
        const a = actors[i];
        if (picked.indexOf(i) >= 0) continue;
        if (prefer === 'impostor') { if (a.kind !== 'impostor') continue; }
        else if (pass === 0 ? !wants(a) : a.kind !== 'resident') continue;
        if (!inReach(a)) continue;
        if (!freeAt(i)) continue;
        picked.push(i);
      }
      if (picked.length >= need || prefer === 'impostor') break;
    }
    return picked.length >= need ? picked : null;
  }

  let totalWeight = 0; EVENT_KINDS.forEach(e => { totalWeight += e.weight; });
  const attempts = { tried: 0, placed: 0, noCast: 0, tooBusy: 0 };
  {
    let t = 5;
    while (t < PERIOD - 46) {
      let pick = R() * totalWeight, spec = EVENT_KINDS[0];
      for (const e of EVENT_KINDS) { pick -= e.weight; if (pick <= 0) { spec = e; break; } }
      const dur = rr(spec.dur[0], spec.dur[1]);
      const t1 = t + dur;
      attempts.tried++;
      /* the anchor is chosen BEFORE the cast, because who can be in an event depends on where it is */
      const site = spec.anchor || null;
      const ap = site ? layout.xz(SITES[site]) : { x: 0, z: 0 };
      if (t1 >= PERIOD - 2 || concurrentAt(t, t1) >= MAX_CONCURRENT) attempts.tooBusy++;
      else {
        const cast = castFor(spec.cast, spec.prefer, t, t1, ap.x, ap.z, spec.reach);
        if (!cast) attempts.noCast++;
        else {
          const ev = { kind: spec.kind, t0: t, dur, cast, site, seed: R(), begun: false, perim: null, slot: -1, missed: false };
          configure(ev);
          schedule.push(ev);
          spans.push([t, t1]);
          attempts.placed++;
          /* A DEPARTURE IS PAIRED WITH A RETURN. Somebody who boards a pod has to actually be gone —
             shrinking away at the pad and reappearing at full size on the apron in the same frame is
             the worst continuity error this module can make, and it is the one the loop would repeat
             most often. So the same resident is scheduled back in 30–100 s later and is HIDDEN in
             between: they are on the pod, below. That also makes §25's "residents arrive and leave"
             literally true rather than an animation of it. */
          if (spec.kind === 'depart') {
            const back = t1 + 30 + R() * 70;
            const rSpec = EVENT_KINDS[0];              /* 'arrive' */
            const rDur = rr(rSpec.dur[0], rSpec.dur[1]);
            let placedBack = false;
            if (back + rDur < PERIOD - 2 && concurrentAt(back, back + rDur) < MAX_CONCURRENT) {
              const rEv = { kind: 'arrive', t0: back, dur: rDur, cast, site: 'staging', seed: R(), begun: false, perim: null, slot: -1, missed: false };
              configure(rEv);
              schedule.push(rEv); spans.push([back, back + rDur]);
              attempts.placed++; placedBack = true;
              away.push({ actor: cast[0], t0: t1, t1: back });
            }
            /* if the return does not fit, they stay away until the loop comes round again, which is
               exactly what "they caught the last pod" looks like */
            if (!placedBack) away.push({ actor: cast[0], t0: t1, t1: PERIOD });
          }
        }
      }
      /* the gap between attempts is what keeps the realm CALM: across a kilometre of sky roughly one
         new thing begins every twenty seconds, and most of them involve one person */
      t += 9 + R() * 22;
    }
  }
  /* COVERAGE. The loop is this realm's showreel: a reviewer watching one 420 s pass must see every
     kind of thing that can happen here at least once, or they will correctly conclude the feature
     does not exist. MEASURED on the first build, the purely weighted pass above produced ZERO
     sparring bouts in the entire loop — and consensual sparring at the rings is one of the three
     things this module is for (§21, §22). So any kind the weights missed is placed explicitly, in
     the first slot where the concurrency cap and the cast both allow it. */
  const missing = [];
  for (const spec of EVENT_KINDS) {
    let found = false;
    for (let i = 0; i < schedule.length; i++) if (schedule[i].kind === spec.kind) { found = true; break; }
    if (found) continue;
    let placed = false;
    for (let t = 7; t < PERIOD - 46 && !placed; t += 6.5) {
      const dur = (spec.dur[0] + spec.dur[1]) / 2, t1 = t + dur;
      if (t1 >= PERIOD - 2 || concurrentAt(t, t1) >= MAX_CONCURRENT) continue;
      const site = spec.anchor || null;
      const ap = site ? layout.xz(SITES[site]) : { x: 0, z: 0 };
      const cast = castFor(spec.cast, spec.prefer, t, t1, ap.x, ap.z, spec.reach);
      if (!cast) continue;
      const ev = { kind: spec.kind, t0: t, dur, cast, site, seed: R(), begun: false, perim: null, slot: -1, missed: false };
      configure(ev);
      schedule.push(ev); spans.push([t, t1]);
      placed = true; attempts.placed++;
    }
    if (!placed) missing.push(spec.kind);
  }
  schedule.sort((a, b) => a.t0 - b.t0);

  /* ---- per-event configuration: everything an event needs, resolved at build ---- */
  function configure(ev) {
    const a0 = actors[ev.cast[0]];
    if (ev.kind === 'arrive' || ev.kind === 'depart') {
      /* the pads the assembly measured, when it has them; otherwise the contract's own pad sites */
      const pads = (ctx && ctx.pads && ctx.pads.length) ? ctx.pads : null;
      let px, pz, py;
      if (pads) { const p = pads[Math.floor(R() * pads.length) % pads.length]; px = p.x; pz = p.z; py = (p.deckY != null ? p.deckY : standY(p.x, p.z)); }
      else { const nm = ['padA', 'padB', 'padC', 'padD'][Math.floor(R() * 4) % 4]; const p = layout.xz(nm); px = p.x; pz = p.z; py = standY(px, pz); }
      const apron = deckOf('staging');
      /* stop on the pad's edge rather than its centre: a pod is docked there */
      const dx = apron.x - px, dz = apron.z - pz, d = Math.hypot(dx, dz) || 1;
      ev.px = px + dx / d * 5.5; ev.pz = pz + dz / d * 5.5; ev.py = py;
    } else if (ev.kind === 'learn' || ev.kind === 'lesson') {
      /* A resident lifts off FROM WHERE IT IS STANDING — the takeoff point is read live from
         ambientXZ() in the frame, not stored here, because the flats are the practice ground and
         there is nothing to walk to. Everything that varies between attempts varies in the flight
         itself, not in the address. */
      /* BEGINNER most of the time: the realm is a place people come to learn, so the commonest thing
         in the sky is somebody's first metre off the ground (§27) */
      ev.skill = ev.seed < 0.62 ? 0 : 1;
      ev.fail = ev.kind === 'learn' && ev.skill === 0 && ev.seed > 0.30 && ev.seed < 0.46;
      ev.drift = ev.seed * TAU;
      /* HOW FAR THE DRIFT MAY GO. Shortened until its far end is somewhere a person could stand, so
         an intermediate hover never drifts out over the cliff or a hole in the floor. */
      let dd = SKILL[ev.kind === 'lesson' ? 1 : ev.skill].drift;
      for (let k = 0; k < 8 && dd > 1; k++) {
        const lx = a0.home.x + Math.cos(ev.drift) * dd, lz = a0.home.z + Math.sin(ev.drift) * dd;
        if (layout.deckSolid(lx, lz) || onAnyDeck(lx, lz)) break;
        dd *= 0.7;
      }
      ev.driftLen = dd > 1 ? dd : 0;
    } else if (ev.kind === 'flight') {
      /* the destination is a real cloud island from the contract — the thing a resident learning to
         fly has been looking at from the ground the whole time */
      const isl = ISLANDS[Math.floor(ev.seed * ISLANDS.length) % ISLANDS.length];
      const ip = layout.xz(isl);
      ev.tx = ip.x; ev.tz = ip.z; ev.ty = isl.y + 3.0;
      ev.climb = FLIGHT_CLIMB[0] + ev.seed * (FLIGHT_CLIMB[1] - FLIGHT_CLIMB[0]);
    } else if (ev.kind === 'spar') {
      const d = deckOf(ev.site) || deckOf('ringNear');
      ev.ring = d.name; ev.x = d.x; ev.z = d.z; ev.y = d.top; ev.r = d.r;
      ev.axis = ev.seed * TAU;
    } else if (ev.kind === 'silhouette') {
      /* forms 0, 1 and 3 are solo; form 2 (two training in the air) is its own event kind because it
         needs a second impostor and casting is settled at generation, never mid-frame */
      ev.form = [0, 1, 3][Math.floor(ev.seed * 3) % 3];
      configureSilhouette(ev);
    } else if (ev.kind === 'airpair') {
      ev.form = 2;
      configureSilhouette(ev);
    }
  }
  /* THE FOUR SILHOUETTES (§28). Ranges are deliberately 140–420 m and not kilometres: MEASURED at
     1080p / 56 degrees a 1.9 m figure subtends 13.8 px at 140 m and 4.6 px at 420 m, and past about
     600 m it is a single pixel and reads as dirt on the lens rather than as a person. Far enough to
     be a silhouette, near enough to be a MAHBEING. */
  function configureSilhouette(ev) {
    const s = ev.seed;
    if (ev.form === 0) {
      /* crossing the sunset: a figure passing across the low sun, at altitude, sector A */
      const r = 150 + s * 130, b = -0.34 + s * 0.14;
      const p0 = layout.xz({ bearing: b - 0.30, r }), p1 = layout.xz({ bearing: b + 0.34, r: r * 1.06 });
      ev.x0 = p0.x; ev.z0 = p0.z; ev.x1 = p1.x; ev.z1 = p1.z;
      ev.y0 = ground(p0.x, p0.z) + 34 + s * 26; ev.y1 = ev.y0 + 8;
      ev.arc = 6;
    } else if (ev.form === 1) {
      /* a figure rising vertically: someone who can already do this, seen from a long way off */
      const b = 1.1 + s * 1.4, r = 200 + s * 190;
      const p = layout.xz({ bearing: b, r });
      ev.x0 = ev.x1 = p.x; ev.z0 = ev.z1 = p.z;
      ev.y0 = ground(p.x, p.z) + 2; ev.y1 = ev.y0 + 95 + s * 70;
      ev.arc = 0;
    } else if (ev.form === 2) {
      /* two training in the air — the second impostor is bound at begin(), see below */
      const b = 1.4 + s * 0.9, r = 240 + s * 160;
      const p = layout.xz({ bearing: b, r });
      ev.x0 = ev.x1 = p.x; ev.z0 = ev.z1 = p.z;
      ev.y0 = ev.y1 = ground(p.x, p.z) + 52 + s * 40;
      ev.orbit = 7.5 + s * 5;
      ev.arc = 0;
    } else {
      /* crossing a cloud gap: seen THROUGH a hole in the floor, below the deck, which is the most
         surprising place in the realm to find a person */
      const v = VOIDS[Math.floor(s * VOIDS.length) % VOIDS.length];
      const c = layout.xz({ bearing: v.bearing, r: v.r });
      const head = s * Math.PI;
      ev.x0 = c.x - Math.cos(head) * v.radius * 0.85; ev.z0 = c.z - Math.sin(head) * v.radius * 0.85;
      ev.x1 = c.x + Math.cos(head) * v.radius * 0.85; ev.z1 = c.z + Math.sin(head) * v.radius * 0.85;
      ev.y0 = ev.y1 = -(34 + s * 46);
      ev.arc = 0;
    }
  }

  /* ================================================================ 5. PLAYBACK — zero allocation */
  const _v = new THREE.Vector3(), _m4 = new THREE.Matrix4();
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s3 = new THREE.Vector3();
  const _cam = new THREE.Vector3(0, 40, 0), _view = new THREE.Vector3();
  const active = [];
  const counts = { arrive: 0, depart: 0, learn: 0, flight: 0, lesson: 0, spar: 0, silhouette: 0, airpair: 0, skipped: 0, disturbs: 0 };
  let dim = 1, lastT = -1;

  function claimSlot(ev) {
    for (let i = 0; i < TRAIL_SLOTS; i++) if (trailOwner[i] < 0) { trailOwner[i] = ev.cast[0]; ev.slot = i; trailTick[i] = 0; return i; }
    ev.slot = -1; return -1;
  }
  function releaseSlot(ev) {
    if (ev.slot >= 0) { trailOwner[ev.slot] = -1; columnState[ev.slot * 5 + 4] = 0; ev.slot = -1; }
  }
  function castActive(ev) {
    for (let i = 0; i < ev.cast.length; i++) if (!actors[ev.cast[i]].active) return false;
    return true;
  }

  const perimBusy = new Uint8Array(PERIM_SLOTS);
  const perimFade = new Float32Array(PERIM_SLOTS);

  function begin(ev) {
    for (let i = 0; i < ev.cast.length; i++) {
      const a = actors[ev.cast[i]];
      a.busy = true;
      a.g.scale.setScalar(a.kind === 'impostor' ? 0.02 : 1);
      if (a.kind === 'impostor') a.g.visible = true;
    }
    if (ev.kind === 'learn' || ev.kind === 'lesson' || ev.kind === 'flight') claimSlot(ev);
    if (ev.kind === 'spar') { for (let i = 0; i < PERIM_SLOTS; i++) if (!perimBusy[i]) { perimBusy[i] = 1; ev.perim = i; break; } }
    counts[ev.kind]++;
    ev.begun = true; ev.lifted = false; ev.landed = false;
  }
  function end(ev) {
    for (let i = 0; i < ev.cast.length; i++) {
      const a = actors[ev.cast[i]];
      a.busy = false;
      a.g.scale.setScalar(1);          /* arrivals and silhouettes scale; nobody is left small */
      if (a.kind === 'impostor') { a.g.visible = false; }
      else {
        /* The POSITION is deliberately not reset: ambient() runs later in this same frame and puts
           the actor back on its idle path, which is exactly where the event left it. Setting it to
           the home point here instead would undo the whole reason events read ambientXZ() live. Only
           the attitude and any driven pose are released. */
        a.g.rotation.x = 0; a.g.rotation.z = 0;
        if (a.g.userData.setDrive) a.g.userData.setDrive(null);
      }
    }
    releaseSlot(ev);
    if (ev.perim != null) { perimBusy[ev.perim] = 0; ev.perim = null; }
    ev.begun = false;
  }

  /* ---- the flight arc, shared by every skill level (§27) ----------------------------------------
     One curve, five phases, parameterised. `fail` turns the hold into an imbalance the resident
     CATCHES: the height drops early and the wobble doubles, and then the descent is still controlled.
     That single decision is what keeps a failed attempt charming rather than slapstick. */
  function hoverHeight(S, u, fail, seedPhase) {
    if (u < 0.16) return 0;                                     /* FLIGHT_READY — gather */
    if (u < 0.40) { const k = (u - 0.16) / 0.24; return S.rise * k * k * (3 - 2 * k); }   /* LIFT */
    if (u < 0.72) {                                             /* HOVER, or lose it and correct */
      const k = (u - 0.40) / 0.32;
      return fail ? S.rise * Math.max(0.12, 1 - k * 1.15) : S.rise * (1 + 0.08 * Math.sin(k * 5.4 + seedPhase));
    }
    const k = (u - 0.72) / 0.28;                                /* DESCEND — always controlled */
    return S.rise * (1 - k * k) * (fail ? 0.14 : 1);
  }

  function playEvent(ev, tt, dt, t) {
    const u = clamp01((tt - ev.t0) / ev.dur);
    const a0 = actors[ev.cast[0]];

    if (ev.kind === 'arrive' || ev.kind === 'depart') {
      /* eased walk between the pad and the apron; the resident's own walk pose does the arms. The
         apron end is read LIVE from where this person would otherwise be idling, so an arrival ends
         exactly on its own idle path and a departure starts exactly on it — no step at the handover. */
      ambientXZ(a0, tt, _amb);
      const ax = ev.kind === 'arrive' ? ev.px : _amb.x, az = ev.kind === 'arrive' ? ev.pz : _amb.z;
      const bx = ev.kind === 'arrive' ? _amb.x : ev.px, bz = ev.kind === 'arrive' ? _amb.z : ev.pz;
      const k = u < 0.12 ? 0 : u > 0.92 ? 1 : (u - 0.12) / 0.80;
      const e = k * k * (3 - 2 * k);
      const x = ax + (bx - ax) * e, z = az + (bz - az) * e;
      a0.g.position.set(x, standY(x, z), z);
      a0.g.rotation.y = Math.atan2(bx - ax, bz - az);
      /* stepping out of, or into, the pod: a short scale so nobody pops into existence */
      const s = u < 0.08 ? u / 0.08 : u > 0.94 ? (1 - u) / 0.06 : 1;
      a0.g.scale.setScalar(clamp(s, 0.02, 1));
      return;
    }

    if (ev.kind === 'learn' || ev.kind === 'lesson') {
      const n = ev.kind === 'lesson' ? Math.min(2, ev.cast.length) : 1;
      for (let i = 0; i < n; i++) {
        const a = actors[ev.cast[i]];
        /* THE LESSON: index 0 holds a clean intermediate hover, index 1 is still learning beside it.
           Putting the two side by side, at the same moment, is what makes the realm's progression
           legible without a word of copy — you can see what practice buys. */
        const S = SKILL[ev.kind === 'lesson' ? (i === 0 ? 1 : 0) : ev.skill];
        const fail = ev.kind === 'lesson' ? (i === 1 && ev.seed > 0.5) : ev.fail;
        const ph = ev.seed * 6.283 + i * 2.1;
        /* the takeoff point is where this person would be standing anyway, read live */
        ambientXZ(actors[ev.cast[0]], tt, _amb);
        const ox = i === 0 ? 0 : -3.6, oz = i === 0 ? 0 : 1.4;
        const bx = _amb.x + ox, bz = _amb.z + oz;
        const h = hoverHeight(S, u, fail, ph);
        /* DIRECTIONAL DRIFT on the hold, and only for the one who can hold a hover: a hover that
           goes somewhere is what separates "I am off the ground" from "I am flying". It goes out and
           comes back on one continuous sine — a hard window cut the drift dead at its edge and
           snapped the resident 6 m sideways (measured, then fixed), and a practising person does not
           want to finish ten metres downhill of where they left their things anyway. */
        const maxDrift = i === 0 ? ev.driftLen : 0;
        const df = Math.sin(Math.PI * clamp01((u - 0.34) / 0.52));
        const dr = maxDrift * df;
        /* the reference ground is re-read UNDER the drifted position every frame, so the hover holds
           its height over cloud that is falling away and the descent always ends on real ground
           rather than above where the ground used to be */
        const base = standY(bx + Math.cos(ev.drift) * dr, bz + Math.sin(ev.drift) * dr);
        /* the wobble is ramped in and out for the same reason: nothing in this module may begin or
           end with a step */
        const wg = smooth((u - 0.14) / 0.09) * (1 - smooth((u - 0.84) / 0.11));
        const wob = S.wobble * wg * (fail && u > 0.40 && u < 0.62 ? 2.0 : 1);
        const x = bx + Math.cos(ev.drift) * dr + Math.sin(t * 2.3 + ph) * wob * 0.6;
        const z = bz + Math.sin(ev.drift) * dr + Math.cos(t * 1.9 + ph) * wob * 0.5;
        a.g.position.set(x, base + h, z);
        a.g.rotation.z = Math.sin(t * 3.1 + ph) * wob;
        a.g.rotation.y = ev.drift;
        if (i === 0) {
          if (S.trail && ev.slot >= 0) pushTrail(ev.slot, x, base + h + 0.9, z, dt);
          if (ev.slot >= 0) setColumn(ev.slot, x, base, z, h, h > 0.25 ? clamp01(h / Math.max(0.5, S.rise)) : 0);
          /* §29: the cloud answers a lift-off and a touchdown, and nothing else. Two calls per
             flight, never one per footstep. */
          if (!ev.lifted && u > 0.30 && S.disturb > 0) { ev.lifted = true; fireDisturb(x, z, 3.4, S.disturb); }
          if (!ev.landed && u > 0.94 && S.disturb > 0) { ev.landed = true; fireDisturb(x, z, 2.6, S.disturb * 0.7); }
        }
      }
      return;
    }

    if (ev.kind === 'flight') {
      /* ADVANCED (§27): a vertical climb, a large arc out to a cloud island, a moment there, and the
         same arc home. It is a round trip on purpose — a one-way flight leaves the flyer 470 m from
         its home and the only way back is a teleport. */
      const out = u < 0.5 ? u / 0.5 : (1 - u) / 0.5;             /* 0 → 1 → 0 */
      const trav = smooth(clamp01((out - 0.22) / 0.72));         /* the climb happens before the travel */
      const climb = smooth(clamp01(out / 0.30));
      /* origin read live from the idle path, so the flight departs from and returns to exactly the
         point this resident would be standing on if it were not flying */
      ambientXZ(a0, tt, _amb);
      ev.x = _amb.x; ev.z = _amb.z; ev.y = standY(_amb.x, _amb.z);
      const x = ev.x + (ev.tx - ev.x) * trav;
      const z = ev.z + (ev.tz - ev.z) * trav;
      /* the arc: base line from the launch height to the island top, lifted by a big sine so the
         flight goes UP and over rather than sliding along a wire. No constant offset anywhere in
         this expression — at u = 0 and u = 1 it must evaluate to exactly the ground the resident was
         standing on, or the flight begins and ends with a jump. */
      const yLine = ev.y + (ev.ty - ev.y) * trav;
      const y = yLine + climb * ev.climb * Math.sin(Math.PI * clamp01(0.15 + trav * 0.85));
      a0.g.position.set(x, y, z);
      const dx = (ev.tx - ev.x) * (u < 0.5 ? 1 : -1), dz = (ev.tz - ev.z) * (u < 0.5 ? 1 : -1);
      a0.g.rotation.y = Math.atan2(dx, dz);
      /* a lean into the turn, not a wobble — and damped to zero at both ends of the flight */
      a0.g.rotation.z = Math.sin(u * 9.0 + ev.seed) * 0.05 * Math.sin(Math.PI * u);
      if (ev.slot >= 0) {
        pushTrail(ev.slot, x, y + 0.9, z, dt);
        setColumn(ev.slot, x, standY(x, z), z, 0, 0);
      }
      if (!ev.lifted && u > 0.06) { ev.lifted = true; fireDisturb(ev.x, ev.z, 4.6, 0.55); }
      if (!ev.landed && u > 0.965) { ev.landed = true; fireDisturb(ev.x, ev.z, 3.8, 0.45); }
      return;
    }

    if (ev.kind === 'spar') {
      /* CONSENSUAL, and the timeline says so: they approach, they AGREE, the perimeter rises, they
         practise, the perimeter fades, they step back. No impact, no knockdown, no crowd. */
      const A = actors[ev.cast[0]], B = actors[ev.cast[1]];
      const ux = Math.cos(ev.axis), uz = Math.sin(ev.axis);
      const gap = 2.4;
      /* 0.00–0.18 approach · 0.18–0.26 agreement · 0.26–0.88 practice · 0.88–1 step back */
      const app = smooth(u / 0.18);
      for (let i = 0; i < 2; i++) {
        const a = i === 0 ? A : B, sgn = i === 0 ? -1 : 1;
        const sx = a.home.x, sz = a.home.z;
        const tx = ev.x + ux * gap * sgn, tz = ev.z + uz * gap * sgn;
        /* the practice itself: a small in-and-out on a 2.6 s beat, out of phase between the two */
        const beat = u > 0.26 && u < 0.88 ? Math.sin((t * 2.42) + i * Math.PI) : 0;
        const bx = tx - ux * sgn * beat * 0.55, bz = tz - uz * sgn * beat * 0.55;
        const x = sx + (bx - sx) * app, z = sz + (bz - sz) * app;
        a.g.position.set(x, standY(x, z), z);
        a.g.rotation.y = Math.atan2((i === 0 ? 1 : -1) * ux, (i === 0 ? 1 : -1) * uz);
        const d = a.g.userData.setDrive;
        if (d) {
          if (u < 0.26) d(null);
          else if (beat > 0.72) d({ fwdR: 0.62, elbowR: -0.9, lean: 0.10 });
          else if (beat < -0.72) d({ fwdL: 0.40, fwdR: 0.40, lean: -0.06 });
          else d({ fwdL: 0.20, fwdR: 0.24, lean: 0.02 });
        }
      }
      /* the agreement perimeter */
      if (ev.perim != null) perimFade[ev.perim] = clamp01(smooth((u - 0.18) / 0.09) - smooth((u - 0.88) / 0.09));
      return;
    }

    if (ev.kind === 'silhouette' || ev.kind === 'airpair') {
      const e = smooth(u);
      let x = ev.x0 + (ev.x1 - ev.x0) * e, z = ev.z0 + (ev.z1 - ev.z0) * e;
      let y = ev.y0 + (ev.y1 - ev.y0) * (ev.form === 1 ? smooth(clamp01((u - 0.08) / 0.84)) : e);
      if (ev.arc) y += Math.sin(Math.PI * u) * ev.arc;
      if (ev.form === 2) {
        /* two training in the air: a slow shared orbit, one impostor opposite the other. Only the
           first is guaranteed cast, so the second is optional and the event still reads without it. */
        const th = t * 0.55 + ev.seed * TAU;
        x += Math.cos(th) * ev.orbit; z += Math.sin(th) * ev.orbit;
        y += Math.sin(th * 1.7) * 3.0;
        if (ev.cast.length > 1) {
          const B = actors[ev.cast[1]];
          B.g.position.set(ev.x0 - Math.cos(th) * ev.orbit, ev.y0 - Math.sin(th * 1.7) * 3.0, ev.z0 - Math.sin(th) * ev.orbit);
          B.g.rotation.y = th + HALF_PI;
        }
      }
      a0.g.position.set(x, y, z);
      a0.g.rotation.y = ev.form === 1 ? t * 0.25 : Math.atan2(ev.x1 - ev.x0, ev.z1 - ev.z0);
      /* they fade in and out rather than blinking: a silhouette should feel noticed, not spawned */
      const s = clamp01(Math.min(u / 0.10, (1 - u) / 0.10));
      a0.g.scale.setScalar(0.02 + 0.98 * s);
      if (ev.cast.length > 1 && ev.form === 2) actors[ev.cast[1]].g.scale.setScalar(0.02 + 0.98 * s);
    }
  }

  function fireDisturb(x, z, r, strength) {
    if (!disturbFn) return;
    try { disturbFn(x, z, r, strength * dim); counts.disturbs++; } catch (e) { /* the terrain module owns it */ }
  }

  function pushTrail(slot, x, y, z, dt) {
    trailTick[slot] -= dt;
    if (trailTick[slot] > 0) return;
    trailTick[slot] = 0.13;
    const h = trailHead[slot] = (trailHead[slot] + 1) % TRAIL_LEN;
    const o = (slot * TRAIL_LEN + h) * 3;
    trailPos[o] = x; trailPos[o + 1] = y; trailPos[o + 2] = z;
    trailAge[slot * TRAIL_LEN + h] = 0;
  }
  function setColumn(slot, x, y, z, h, alpha) {
    const o = slot * 5;
    columnState[o] = x; columnState[o + 1] = y; columnState[o + 2] = z; columnState[o + 3] = h; columnState[o + 4] = alpha;
  }

  /* ---- ambient behaviour: a pure function of t, so a capture reproduces exactly ------------------
     A resident who is not in an event drifts inside its own patrol circle on two slow, incommensurate
     frequencies. That reads as idling rather than as pacing, costs two sines and one cloudTopAt, and
     — because it is a function and not a state machine — is identical on every run. */
  /* WHERE THIS PERSON WOULD BE STANDING IF NOTHING WERE HAPPENING, at loop time tt. Events call it
     too, and that is the whole point: a hover that begins at the flyer's idle position and returns
     to it has no seam at either end. Fixing the takeoff to the actor's home instead put a 5 m step
     across a 40 degree pylon flank at the start of every flight — 7 m of vertical, measured. */
  const _amb = { x: 0, z: 0 };
  function ambientXZ(a, tt, out) {
    if (a.patrol <= 0) { out.x = a.home.x; out.z = a.home.z; return out; }
    out.x = a.home.x + Math.cos(tt * a.w1 * TAU + a.p1) * a.patrol;
    out.z = a.home.z + Math.sin(tt * a.w2 * TAU + a.p2) * a.patrol * 0.8;
    return out;
  }
  function ambient(a, tt) {
    ambientXZ(a, tt, _amb);
    a.g.position.set(_amb.x, standY(_amb.x, _amb.z), _amb.z);
    if (a.patrol <= 0) {
      /* even a still watcher moves: a slow look along the horizon, ±7 degrees */
      a.g.rotation.y = a.face + Math.sin(tt * a.w3 * TAU + a.p1) * 0.12;
      return;
    }
    /* face the direction of travel — the derivative of the same two sines, no extra state */
    const vx = -Math.sin(tt * a.w1 * TAU + a.p1) * a.w1;
    const vz = Math.cos(tt * a.w2 * TAU + a.p2) * a.w2 * 0.8;
    a.g.rotation.y = Math.atan2(vx, vz);
  }

  /* ================================================================ 6. FRAME */
  function update(t, dt, camera) {
    if (t === lastT) return;
    lastT = t;
    dt = dt > 0 ? Math.min(dt, 0.08) : 0.016;
    const tt = ((t % PERIOD) + PERIOD) % PERIOD;
    const cam = camera || (ctx && ctx.camera);
    if (cam && cam.isCamera) _cam.setFromMatrixPosition(cam.matrixWorld);

    /* activate and retire against the schedule; every event is a window, not a queue, so a capture
       harness that jumps straight to t = 300 lands in the same state a real session would */
    for (let i = 0; i < schedule.length; i++) {
      const ev = schedule[i];
      const inWindow = tt >= ev.t0 && tt < ev.t0 + ev.dur;
      const on = inWindow && castActive(ev);
      if (on && !ev.begun) begin(ev);
      else if (!on && ev.begun) end(ev);
      /* an event whose cast is switched off at this quality tier is counted ONCE, not once a frame:
         it is a fact about the tier, not a per-frame failure */
      if (inWindow && !on && !ev.missed) { ev.missed = true; counts.skipped++; }
      else if (!inWindow) ev.missed = false;
    }
    active.length = 0;
    for (let i = 0; i < schedule.length; i++) if (schedule[i].begun) active.push(schedule[i]);

    /* the actors: an event drives its cast, everyone else idles */
    for (let i = 0; i < actors.length; i++) {
      const a = actors[i];
      if (!a.active) continue;
      if (a.g.userData.update) a.g.userData.update(t, dt);
      if (a.busy || a.kind === 'impostor') continue;
      /* away on a pod: gone, not standing invisibly on the apron */
      let gone = false;
      for (let k = 0; k < away.length; k++) { const w = away[k]; if (w.actor === i && tt >= w.t0 && tt < w.t1) { gone = true; break; } }
      if (gone) { if (a.g.visible) a.g.visible = false; continue; }
      if (!a.g.visible) a.g.visible = true;
      ambient(a, tt);
    }
    for (let i = 0; i < active.length; i++) playEvent(active[i], tt, dt, t);

    /* ---- the perimeter: twelve diamonds around the ring of whichever bouts are live ---- */
    for (let s = 0; s < PERIM_SLOTS; s++) {
      let ring = null;
      for (let i = 0; i < active.length; i++) if (active[i].perim === s) { ring = active[i]; break; }
      const f = ring ? perimFade[s] : (perimFade[s] = Math.max(0, perimFade[s] - dt * 2.4));
      for (let k = 0; k < PERIM; k++) {
        const idx = s * PERIM + k;
        if (!ring || f <= 0.001) { _m4.makeScale(0, 0, 0); perimMesh.setMatrixAt(idx, _m4); continue; }
        const ang = (k / PERIM) * TAU + ring.axis * 0.5;
        const rad = (ring.r - 0.5) * (0.90 + 0.10 * f);
        /* they RISE into place, which is what makes the perimeter read as an agreement being made
           rather than as a cage being switched on */
        _v.set(ring.x + Math.cos(ang) * rad, ring.y + 0.55 + 1.05 * f, ring.z + Math.sin(ang) * rad);
        _e.set(0, ang, Math.PI / 4); _q.setFromEuler(_e);
        const sc = 0.34 * f;
        _s3.set(sc, sc * 1.5, sc * 0.35);
        _m4.compose(_v, _q, _s3);
        perimMesh.setMatrixAt(idx, _m4);
        const b = f * (0.55 + 0.45 * Math.sin(t * 1.6 + k * 0.9)) * dim;
        perimMesh.instanceColor.setXYZ(idx, b, b, b);
      }
    }
    perimMesh.instanceMatrix.needsUpdate = true;
    if (perimMesh.instanceColor) perimMesh.instanceColor.needsUpdate = true;

    /* ---- the levitation trail: a ring buffer per slot, aged and billboarded ---- */
    for (let s = 0; s < TRAIL_SLOTS; s++) {
      for (let k = 0; k < TRAIL_LEN; k++) {
        const j = s * TRAIL_LEN + k;
        trailAge[j] = Math.min(2, trailAge[j] + dt / 1.5);
        const idx = j;
        const age = trailAge[j];
        if (age >= 1) { _m4.makeScale(0, 0, 0); trailMesh.setMatrixAt(idx, _m4); continue; }
        const o = j * 3;
        _v.set(trailPos[o], trailPos[o + 1], trailPos[o + 2]);
        _view.subVectors(_cam, _v);
        const sc = 0.42 * (1 - age) + 0.06;
        _m4.makeRotationY(Math.atan2(_view.x, _view.z));
        _m4.scale(_s3.set(sc, sc * 1.4, sc * 0.3));
        _m4.setPosition(_v);
        trailMesh.setMatrixAt(idx, _m4);
        const b = (1 - age) * (1 - age) * 0.9 * dim;
        trailMesh.instanceColor.setXYZ(idx, b, b, b);
      }
    }
    trailMesh.instanceMatrix.needsUpdate = true;
    if (trailMesh.instanceColor) trailMesh.instanceColor.needsUpdate = true;

    /* ---- the lift column ---- */
    for (let s = 0; s < TRAIL_SLOTS; s++) {
      const o = s * 5, alpha = columnState[o + 4], h = columnState[o + 3];
      if (alpha <= 0.001 || h <= 0.2) { _m4.makeScale(0, 0, 0); columnMesh.setMatrixAt(s, _m4); continue; }
      _v.set(columnState[o], columnState[o + 1] + h * 0.5, columnState[o + 2]);
      _view.subVectors(_cam, _v);
      _m4.makeRotationY(Math.atan2(_view.x, _view.z));
      _m4.scale(_s3.set(1.5, h, 1));
      _m4.setPosition(_v);
      columnMesh.setMatrixAt(s, _m4);
      const b = alpha * dim;
      columnMesh.instanceColor.setXYZ(s, b, b, b);
    }
    columnMesh.instanceMatrix.needsUpdate = true;
    if (columnMesh.instanceColor) columnMesh.instanceColor.needsUpdate = true;

    stats.activeEvents = active.length;
  }

  /* ================================================================ 7. CONTRACT SURFACE */
  function setTime(clockState) {
    const cs = clockState || {};
    const day = typeof cs.daylight === 'number' ? clamp01(cs.daylight) : 0.25;
    dim = 1 - 0.45 * day;
    /* the residents' own night glow: the crystal lights from inside as the world darkens. This is
       residents.js's material family, not a repaint — every person keeps their own colour. */
    const e = 1 - day;
    for (let i = 0; i < actors.length; i++) { const u = actors[i].g.userData; if (u && u.setEnergy) u.setEnergy(e); }
    perimMat.opacity = 0.85 * dim;
    trailMat.opacity = 0.55 * dim;
    columnMat.opacity = 0.20 * dim;
    return cs;
  }
  function setTheme(t) {
    /* MAHGIC ONLY. A resident's crystal is that person's own colour and the viewer's world theme
       never repaints a person — inherited verbatim from life.js. The three things repainted here are
       the sparring perimeter, the levitation trail and the lift column, all of which are energy. */
    if (!t || !t.energy) return t;
    perimMat.color.setHex(t.energyLight);
    trailMat.color.setHex(t.energy);
    columnMat.color.setHex(t.energy);
    return t;
  }
  /* Quality changes WHO IS HERE, not how they are built. The realm's cameras are fixed views rather
     than a free-roaming player, so a distance-driven LOD swap would rebuild resident geometry every
     time the view changed and buy nothing; each cast member's tier is assigned once, by which camera
     can actually see them. What a lower tier does is hold fewer people — which is the honest cut in
     a realm whose whole subject is emptiness. */
  function setQuality(q) {
    if (QUALITY[q]) tier = q;
    const want = QUALITY[tier].residents;
    const grounded = Math.min(GROUNDED, want);
    const sil = Math.max(0, want - grounded);
    for (let i = 0; i < actors.length; i++) {
      const a = actors[i];
      const on = a.kind === 'resident' ? a.index < grounded : (a.index - GROUNDED) < sil;
      a.active = on;
      if (!on) { a.g.visible = false; a.busy = false; }
      else if (a.kind === 'resident') a.g.visible = true;
      /* an inactive impostor stays hidden either way; an active one is only shown by its event */
    }
    /* any event mid-flight whose cast just went away must let go of its pooled slots */
    for (let i = 0; i < schedule.length; i++) { const ev = schedule[i]; if (ev.begun && !castActive(ev)) end(ev); }
    measure();
    return tier;
  }
  function dispose() {
    if (group.parent) group.parent.remove(group);
    perimMesh.dispose(); trailMesh.dispose(); columnMesh.dispose();
    for (let i = 0; i < actors.length; i++) {
      const g = actors[i].g;
      g.traverse(o => { if (o.isMesh && o.geometry && o.geometry !== diamond && o.geometry !== columnGeo) o.geometry.dispose(); });
    }
    owned.geometries.forEach(g => g.dispose());
    owned.materials.forEach(m => m.dispose());
    group.clear();
  }

  /* ================================================================ 8. MEASURED cost (§45, §46) */
  const stats = {
    module: 'sky-life',
    get tier() { return tier; },
    drawCalls: 0, triangles: 0, meshes: 0,
    residents: 0, impostors: 0, cap: QUALITY[tier].residents,
    scheduled: schedule.length, period: PERIOD, activeEvents: 0,
    /* kinds the schedule could not fit at all — empty is the expected answer, and a non-empty one
       says a feature of this module is invisible in a capture */
    uncovered: missing,
    generation: attempts,
    events: counts,
    byKind: {}, offCloud: 0, onPlatform: 0,
    platforms: decks.map(d => ({ name: d.name, top: Math.round(d.top * 100) / 100, r: d.r }))
  };
  function measure() {
    stats.drawCalls = 0; stats.triangles = 0; stats.meshes = 0;
    stats.residents = 0; stats.impostors = 0;
    stats.cap = QUALITY[tier].residents;
    group.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      const full = g.index ? g.index.count : g.attributes.position.count;
      const inst = o.isInstancedMesh ? o.count : 1;
      stats.meshes++;
      let vis = o.visible, p = o.parent;
      while (vis && p) { vis = p.visible; p = p.parent; }
      if (vis) { stats.drawCalls++; stats.triangles += Math.round(full * inst / 3); }
    });
    for (let i = 0; i < actors.length; i++) {
      if (!actors[i].active) continue;
      if (actors[i].kind === 'resident') stats.residents++; else stats.impostors++;
    }
    stats.byKind = {};
    for (let i = 0; i < schedule.length; i++) stats.byKind[schedule[i].kind] = (stats.byKind[schedule[i].kind] || 0) + 1;
    /* contract law 1, checked rather than asserted: every HOME is standable */
    stats.offCloud = 0; stats.onPlatform = 0;
    for (let i = 0; i < actors.length; i++) {
      const a = actors[i];
      if (a.kind !== 'resident') continue;
      if (onAnyDeck(a.home.x, a.home.z)) stats.onPlatform++;
      else if (!layout.deckSolid(a.home.x, a.home.z)) stats.offCloud++;
    }
    return stats;
  }

  if (scene && !group.parent) scene.add(group);

  setTheme(theme0);
  setTime((ctx && ctx.clock && ctx.clock.state) ? ctx.clock.state() : { band: 'dusk', daylight: 0.25, sunElevation: 0.055 });
  setQuality(tier);
  update(0, 0.016, ctx && ctx.camera);
  measure();

  return {
    group, setTime, setTheme, update, setQuality, dispose, stats,
    /* the cast and the timeline, so a capture harness or a reviewer can seek to a named moment */
    residents: actors.filter(a => a.kind === 'resident').map(a => a.g),
    timeline: schedule.map(e => ({ kind: e.kind, t: Math.round(e.t0 * 10) / 10, dur: Math.round(e.dur * 10) / 10, cast: e.cast.map(i => actors[i].id) })),
    measure
  };
}

export default buildSkyLife;
