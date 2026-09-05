# MAHPLAZA v4 — module contracts for the AAA closure pass

Read this before touching the scene. It is the shared agreement between the
modules built in parallel; the assembly (`mahplaza.js`) integrates them.

## Non-negotiable laws (unchanged)

- Renderer: `import * as THREE from '../vendor/three/three.module.min.js'` only. No addons,
  no textures from disk, no models, no new libraries, no bundler. Everything procedural.
- No yellow / amber / orange light anywhere (hue 28–75° with saturation). Light is blue-white;
  MAH MATCH's single red accent is the only warm colour. Windows are cool white.
- MAHGIC is the resource name. Never MAHNAH / MAHNA / MANA.
- Residents: square-diamond head with dark facial chamber, crystalline facets, humanoid upper
  body, ONE continuous lower teardrop, NO legs. One coherent colour per resident, owned by
  that resident; the viewer's world theme never repaints anyone.
- Truthful copy only: no slogans, prices, product claims, fake player counts, "opponent found".
  Existing copy: `MAH GYM · TRAIN HIGHER`, `MAH MATCH · MATCHES · PRACTICE`, `MAH MARKET`,
  entrance actions `FIND AN OPPONENT`, `PRACTICE WITH A BUDDY`. Signs use the reserved
  square-diamond mark slot (no pictograms).
- No audio, no network, no storage beyond `fob.mahworld.preview.*`, no MAHFITT app files.
- Calm world: contrast is the point. Most of the environment is still; a few things move.

## The scene context (`ctx`) every builder receives

```
ctx = {
  THREE, scene, M, theme, clock,
  reflect(mesh, dim),          // register an emissive mesh for the mirrored wet-floor reflection
  timeHooks: [fn(clockState)], // called on time-of-day change; clockState.daylight 0..1, .sunElevation -1..1, .worldHour
  updateHooks: [fn(t, dt)],    // per frame (t seconds, dt seconds); keep them allocation-free
  signMaterials, residentSpots, entranceLights, actions, roomLights, planterSpots, roads, practice,
  colliders: [],               // v4: meshes the camera must not enter (building masses, big blocks)
  lifeAnchors: {               // v4: filled by builders, consumed by life.js
    paths: [],                 //   { id, points: [Vector3...], kind: 'walk'|'bridge'|'roof' }
    pads: [],                  //   { id, position: Vector3, facing, kind: 'training'|'spar'|'levitate'|'target', tier: 'near'|'mid'|'far' }
    doors: [],                 //   { id, position: Vector3, facing, building: 'gym'|'match'|'market' }
    windows: []                //   { id, position: Vector3, normal: Vector3, size: [w,h] } — where silhouettes may appear behind glass
  }
}
```

`ctx.M` (materials.js `createMaterials`) — the physical family. Use these; do not invent
new colours. `graphite, graphiteDark, graphiteLight, platinum, panel` (v3) and v4:
`structural` (dark structural metal), `composite` (satin graphite), `trim` (polished),
`trimSatin` (brushed), `curb`, `arena` (rubberised floor), `panelLit` (illuminated panel),
`plaza, road, glass, interior, interiorSoft, energy, energyLight, energySoft, signage, matchRed`.
Theme-following energy: `energy / energyLight / energySoft` only (retheme handles them).

Helpers in materials.js: `chamferBox(w,h,d,c)` (chamfered edges — use it for trims, frames,
steps, rails, platforms instead of raw BoxGeometry), `windowGrid({...})` (one InstancedMesh of
window cells with per-window brightness), `surfaceTexture('floor'|'wall')` (roughness / bump),
`blobTexture()` (contact shadow / light pool), `diamondOutline`, `softMass`, `signTexture`,
`canvasTexture`.

## Shadows and cost discipline

- The assembly enables shadow maps on ONE directional light. Builders set
  `mesh.castShadow = true` only on major masses (building bodies, big blocks, towers within
  200 m, residents) and `mesh.receiveShadow = true` on floors, platforms, aprons, steps.
  Never on glow planes, additive meshes, sprites, windows or anything transparent.
- Draw-call budgets per module (measured on `renderer.info.render.calls` in a standard view):
  city ≤ 70, dressing ≤ 45, match-interior ≤ 90, life (residents + effects) ≤ 120, sky ≤ 30.
  Merge static geometry; use InstancedMesh for repeats; share materials; no per-frame allocation.
- Every module exports `setTime(clockState)`, `setTheme(theme)` and (if animated) `update(t, dt)`,
  and disposes what it made in `dispose()`.

## Module APIs

### city.js — `buildCity(ctx) → { group, setTime, setTheme, update, dispose, stats }`
Midground / background / distant MAHWORLD district behind and beside the plaza. Never over the
plaza (keep out of |x| < 46 && z > −92, and z > 70 within |x| < 60). Layers: (1) midground
blocks 90–220 m out — dark steel residential / facility blocks with recessed window grids
(`windowGrid`), setbacks, roof equipment, bridges and elevated walkways between them
(y 18–40), one walkway crossing behind MAH MATCH at y ≈ 30; (2) background towers 220–520 m —
crystalline towers with 1–2 restrained energy strips, chamfered silhouettes; (3) distant
silhouettes 520–850 m — dark flat forms under fog. Slow moving infrastructure: one light that
travels a rail on the walkway (transit-like), an elevator light on one tower. Populates
`ctx.lifeAnchors.paths` (bridge / roof paths) and `ctx.lifeAnchors.pads` (rooftop pads,
tier 'far' or 'mid'). Replaces sky.js's capsule towers (the assembly removes those). Windows
0.2 by day, full at night.

### plaza-dressing.js — `buildDressing(ctx) → { group, setTime, setTheme, update, dispose }`
Foreground composition per brief §17: understandable paths (inlaid lighter bands from the
MAHPLAZA marker to each entrance with curb transitions), two gathering nodes (seating rings
with light housings), rails / barriers where a fall or road edge exists, 8–10 slim light masts
with a square-diamond luminaire (instanced), benches (chamfered), planter surrounds, bollards,
a small info pylon and a corridor shelter, floor guidance decals (canvas textures, restrained).
Pushes `ctx.colliders` for anything a camera must not enter. Keeps the plaza calm.

### match-interior.js — `buildMatchInterior(ctx, room, dims) → { group, arenaLight, actionMounts, spectatorSpots, sparSpots, practice, dispose }`
Called by buildings.js inside the MAH MATCH block with `room` (a Group at the hall's front,
floor at local y = 0, hall extends toward −z) and `dims = { roomW, roomD, roomH, openW, E }`.
Builds the engineered combat hall: platform with chamfered edge, layered perimeter (inset energy
boundary, lower apron ring, barrier rail with posts on the spectator sides), corner pylons with
light heads, overhead lighting truss with luminaires, tiered seating with rails and step lights,
a display frame above the far side (geometry only — no invented scores or names), two recessed
display frames flanking the entrance that HOST the two action panels (`actionMounts.findOpponent`
/ `.practiceBuddy` = `{ position (room-local), normal, width, height }` — the assembly places the
existing sign textures there), training bays with padded striking posts on both sides, equipment
recesses, wall protection band, coffered ceiling with light strips, entry threshold. `sparSpots`
= two room-local positions on the platform facing each other; `spectatorSpots` = 3–4 tier seats;
`practice` = { a, b, centre, facingA, facingB } on the LEFT training bay pad. Uses `M.arena`
for the platform, `M.structural / composite / trim` for structure. Fixed anchors the assembly
already relies on (room-local): platform top at y = 0.8 centred on (0, −10) with a footprint of
at least 12 × 12; left practice pad top at y = 0.25 centred on (−7, −19); a spectator seat near
(−10.2, 0.4, −6); a standing spot near (−4.5, 0, −2.2). The hall you receive is `roomW = 38`
wide, `roomD = 22` deep, `roomH = 15.2` high, opening `openW = 18`; the entrance glass is at
local z = +0.15 (just in front of the room origin), the back wall at z = −roomD.
The assembly swaps the v3 inline interior for yours automatically when `match-interior.js`
exists, and moves the two entrance-action panels onto your `actionMounts`.

### life.js (+ effects.js) — `createLife(ctx, R, opts) → { update(t, dt), setTime, setTheme, residents, stats, log, dispose }`
`R` is the residents module. `opts = { anchors: ctx.lifeAnchors, existing: residents[] (the 12
outdoor + interior residents already placed by the assembly — do NOT move or recolour them),
maxNear, maxMid, maxFar, seed }`. Creates ambient life on top of the existing population:
walkers on a path network between the MAHPLAZA marker, the three entrances (`anchors.doors`),
the benches and the corridor ends; arrivals at a door "enter" (scale down at the threshold,
respawn later elsewhere, never through a wall); small conversing groups; occasional idle
variation. A lightweight scheduler runs events A–H from the brief (training-pad strike with a
restrained MAHGIC wave; rooftop levitation drill; distant sparring pair; a dash across a bridge;
a gym window silhouette; a projectile into a contained target; a group entering MAH MATCH; a
resident leaving MAH MARKET with a small object). Rules: at most 3 events at once, cooldowns,
varied start / duration / participants / location; near tier = full residents (`R.createResident`),
mid = `R.createResident({ lod: 'mid' })` when available, far = `R.createImpostor(...)` when
available else a ≤ 60-triangle stand-in of the same colour and species silhouette; tiers by
distance from the camera (`opts.camera`). GYMATTACK animation = anticipation → action → impact
→ recovery via `group.userData.setDrive`. `effects.js` provides pooled, allocation-free MAHGIC
effects in the crystalline vocabulary (expanding ring wave, brief light pulse, thin energy arc,
short streak, contained impact flash, faint levitation trail). No particles fountains, no
screen-covering bloom, max 6 effects active. Every ambient resident keeps its own colour;
`setTheme` may recolour effect ENERGY only when the effect is world infrastructure (targets,
pad boundaries), never a resident's MAHGIC (that follows the resident's colour).

### residents.js (upgrade in place — keep every existing export and userData member)
Quality: continuous volume under the facets (SEG 12–14 near), coherent shoulder / neck / arm
transitions, facet size distribution (smaller on torso, larger on the lower teardrop), stable
silhouette. LOD: `createResident({ lod: 'near'|'mid'|'far' })` (mid ≈ SEG 8, fewer parts; far
≈ 60–120 tris), `createImpostor({ colour, physique, sex })` (≤ 60 tris, 1–2 draw calls, same
silhouette language), `setLOD(group, tier)` (rebuild in place like `recolour`). Hover contact:
each resident gets a soft dark blob under it (`blobTexture()`, multiply / normal blending, opacity
by hover height, never a black halo). Keep: `createResident, populate, recolour, isColour, COLOURS,
residentPalette`, `userData.{update, setEnergy, face, setDrive, parts, id, colour, spec, height, hover}`.

## How to look at your work

```sh
# from the repository root; software GL, headless
node /tmp/claude-0/-home-user-Junctional-/26202b52-dea2-5bed-a726-bbc766d8e027/scratchpad/mahworld/smoke-v3.js establishing,in-world,match-entrance night wide
```
(`smoke-v3.js` accepts a comma list of views, a time, `wide|phone`, and writes PNGs to
`scratchpad/mahworld/smoke-v3/`). Views: establishing, in-world, match-entrance, gym-entrance,
market-entrance, residents, appearance, sky-plant, practice. The page exposes
`window.MAHWORLD_MAHPLAZA` (`renderer.info`, `scene`, `setView`, `setTime`, `setWorldTheme`,
`describeAppearance`). Capture sparingly — the machine has 4 cores and other builders share it;
use 960×540 for iteration. Judge at phone size too.

Do not edit files you do not own: city.js / plaza-dressing.js / match-interior.js / life.js /
effects.js / residents.js belong to their builders; buildings.js, ground.js, sky.js, materials.js,
mahplaza.js, mahplaza.html belong to the assembly. If you need a hook in an assembly file,
write it down in your final report instead of editing.
