/* MAHPLAZA :: CITY — the MAHWORLD district behind and beside the plaza (v4)

   Three depth layers so every exterior view has midground, background and
   distant background instead of stopping behind the three destinations:

   1. MIDGROUND (90–220 m): dark steel residential / facility blocks in THREE
      massings (stepped / slotted / podium), each wearing a platinum structural
      frame — base course, piers, spandrel courses, sill, parapet and coping —
      over recessed window grids or lit curtain wall (windowGrid), with
      roof plant, masts and parapet rails; three short bridges between blocks and
      ONE long walkway crossing behind MAH MATCH (deck y 34, z −122, x −75..75)
      with a thin rail light line, under-deck lights and a slow rail pod.
   2. BACKGROUND (220–670 m): crystalline towers — seven faceted archetypes as
      seven InstancedMeshes, each with one or two thin energy strips: the four v4
      forms (tapered obelisk, hexagonal crystal, stepped twin prism, blade) plus
      three v5 MEGATALLS at 214–392 m (stepped shaft + spire, notched twin blade,
      crystalline pinnacle), set at overlapping radii for height parallax.
   3. DISTANT (520–850 m): flat dark silhouettes under the fog — tall slabs, a
      colossal tapered form, a suspended ring on pylons, a high platform.

   Laws honoured: materials from ctx.M only (+ MeshBasic for windows / lights /
   spill / far silhouettes), no additive glow, nothing flashes, deterministic
   (seeded), no per-frame allocation, everything merged or instanced. Windows
   dim by day; energy strips and rail lights follow the world Theme and dim ×0.3
   by day. Never inside |x| < 46 && z > −92, never at z > 70 within |x| < 60.

   v8 — WARM ROOMS, COLD SIGNS. Two changes, and they are the same change seen
   twice. (1) The district's windows were one cool white, so every lit room
   agreed with every lit sign and fifteen blocks read as one blue mass; the
   rooms are WARM now, per face, with a MAHGIC-lit minority left cool — that
   difference is what a skyline's life actually is. (2) Six blocks and two
   megatalls carry ONE saturated accent gesture each, assigned BY DISTRICT
   (left violet, centre blue, right cyan) so the eye reads regions rather than
   per-building noise. Every emitter added here is built as three pieces — the
   source, the dark reveal it sits in, and a short-falloff WASH in its own hue
   on the surface it is mounted to — because an emissive rectangle that lights
   nothing is the failure this pass exists to remove.

   v9 — CRYSTAL, AND A CITY WITH NO TOP. Three additions, and they are one idea.

   (1) GLASS SHARDS ACROSS THE BUILDINGS. The district's mass turns to crystal where a building
   already breaks: it GLAZES the slot of a slotted block, it OUTCROPS off the shoulder of a stepped
   one, it FANS off a podium's terrace, it EMERGES from the vertical corner arris, and it RUNS
   diagonally across an elevation like a fracture propagating through the wall. Nothing is stuck on a
   flat face at random, because a shard that does not grow out of a break reads as a decoration.
   Grades follow the cost rule in materials.js: shardFacet (no transmission) for the many, shardClear
   for fourteen pieces on the four blocks nearest the camera, and NO shardHero — the destinations and
   the plaza have first call on the grade that makes three render an extra scene pass.

   (2) THE CITY GOES UP FOREVER. Not by making the megatalls taller — a taller cut-out with a visible
   top is a bigger building, not an endless city. Four separate mechanisms, all composition:
     SHAFTS      six towers whose tops leave the frame at the establishing and in-world cameras, so
                 no silhouette closes the composition at the top;
     VALUE BANDS each shaft is built in four bands that step DOWN toward the night sky's own mid tone
                 the higher they stand — vertical aerial perspective, and the reason nothing is
                 lightened to achieve it (the zenith is the darkest part of this world's sky);
     BELTS       thirteen collars up each shaft at spacing that compresses toward the top, so the eye
                 can count storeys and lose count;
     GHOSTS      eight faint far shafts at 650–860 m whose tops dissolve into the fog before they end.
   The shafts carry NO light. That is deliberate: the near city holds the light and the high city
   loses it, which is what the value recession means — a shaft studded with emitters would defeat it.

   (3) JETSONS. Ring decks: floating saucer terraces on slender stalks over five blocks, and collars
   threaded on the shafts. Everything that was still a raw box — the rail pod, the elevator car, the
   under-deck lights, the pad bars, the tower strips — is chamfered or turned into the square diamond.

   v11 §06 — CUT STONE, NOT SPLINTERS. The law, in the form clouds.js states it best:

       THE SILHOUETTE IS ROUND. THE SURFACE IS CRYSTALLINE.

   Nothing here is smoothed and nothing is subdivided — every change below ADDS a facet. What is
   corrected is the OUTLINE, in four places where this district was still reading as spikes:

   (1) THE SHARD ARCHETYPES. v9 cut all three from a single CylinderGeometry each, which is one
       straight taper: a constant tangent from the foot to the tip, one hard corner into the terminal
       facet, one hard arris into the wall. At 11-39 m — which is what the corner emergences, the
       terrace fans and the megatall setback shards actually are — that is a splinter glued to a
       building. They are built from a PLAN and a PROFILE now (see shardPrism): every shard leaves its
       surface on a HAUNCH, and the blade, the one archetype with an aggressive taper, gains a CROWN
       facet so its outline turns before the table rather than running straight into it. The
       CLUSTER's second member is short and broad enough to rejoin the first's outline instead of
       crossing it, so the pair's outer envelope is one convex line with a designed shoulder in it.
       Still four and six flat sides; the square diamond in plan is untouched (law 6's exception).
   (2) THE NEAR GRADE'S SECTION. The fourteen transmissive shards on the four blocks in front of the
       plaza take the square diamond WITH ITS FOUR ARRISES CHAMFERED — eight sides, the four cut faces
       lying exactly on the original square's own faces. It is the same figure with a third face at
       each edge, and it costs no draw call because those fourteen are merged, not instanced.
   (3) THE RING DECKS. Five saucers were carried on ONE 1 m stalk, which is a couple of pixels at the
       arrival camera, so they read as grey discs hovering free. Each now stands on a splayed HAUNCH
       at the parapet (up to 4.7 m across), a tapering PIER, and a flared COLLAR that spreads into the
       deck's own underbelly. All three open-ended: not one new horizontal face (law 1).
   (4) THE ARRISES. Every mass, parapet, coping, plinth, course, pier, bridge and distant slab in the
       district carried a hairline chamfer — 0.45 m on a 22 m block, 0.09 m on a coping, 0.04 m on a
       38 m walkway pylon — which at 90-220 m is a razor edge and not a chamfer at all. They are
       widened to where the third face is actually legible. chamferBox's topology does not change with
       its radius, so this is the one part of the pass that costs NOTHING: same triangles, same draw
       calls, a facet that can be seen. Tower C's cap, tower D's bevel and tower F's three raw
       BoxGeometry slabs are corrected in the same spirit, and the colossal distant form gains a crown
       ring. Measured cost for the whole pass: 84 draw calls before and after, 41 252 -> 45 120
       triangles (+9.4 %), all of it in the shard sections and the five deck supports.

   v13 §8 / §6D — SKY ROADS AND SKYBLOCK CARRIERS. The district had FOBEAM energy routes and six
   shafts that leave the frame, and no elevated ROADWAY at all; §8 makes one mandatory and §11 gates
   on it. Six curved decks at four elevation tiers (60-89 m / 126-138 m / 186-192 m and ONE rare
   very-high at 280-298 m), each a Catmull-Rom through control points placed against the TOWERS,
   SHAFTS and BLOCKS tables in this file, with real deck thickness, a rounded edge profile and a
   keel girder underneath. Twenty-seven supports, none of them decided in advance: every one is the
   result of a search against those same tables, and the result is 7 columns standing on roofs, 19
   brackets tied into flanks and 1 pier to the ground. Nine SKYBLOCK CARRIERS ride them, grown from
   foblock.js's genome rather than modelled here.

   The part of it that took the most work is where they are NOT. This file's three valleys and
   terrain.js's basin are the composition the last three passes were built around, so the two
   forbidden bearing bands (50-74 and 106-144, the valleys plus a margin) are checked at every
   sample of every road and the worst margin is reported; the moon's own track then caps how high
   the centre corridor's roads may go. Section header at SR_BLOCKED carries the whole argument.
   Measured cost for the pass: 84 -> 95 draw calls, 45 120 -> 59 250 triangles.

   Life anchors pushed: ctx.lifeAnchors.paths (walkway + 3 bridges, kind
   'bridge') and ctx.lifeAnchors.pads (5 rooftop pads, tier 'far'). */
import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, windowGrid, canvasTexture, ACCENT, apertureField, doorwayParts, applyDistanceDim, applyCelestialPath } from './materials.js';
import { foblockParts } from './foblock.js';   /* §6D: a SKYBLOCK CARRIER is an elongated FOBLOCK, so it grows from the genome */

/* R170 §5 — THE DISTANCE-DIM CURVE, in metres of view depth. See applyDistanceDim in materials.js.
   NEAR is set past the far edge of the built district (the megatalls stand inside r 400 and the
   walking cameras all sit under 70 m), so no gameplay-distance frame changes by a single pixel.
   FAR is the aerial establishing distance. FLOOR is what a level-4 form is worth from up there:
   present, countable if you look for it, and no longer the subject.

   FLOOR WAS CHOSEN BY RENDERING BOTH ENDS, not by taste. At 0.00 — every lit window black — the
   aerial view finally showed buildings and roads, and lost the thing that makes MAHWORLD read as
   inhabited: a dark city with no lights in it is a model, not a civilization. At 1.00 (no dim) the
   windows were the whole image. 0.28 is where the window field becomes a TEXTURE on a mass rather
   than a mass of its own, which is what §4 asks a small form to be at distance.
   The curve was also widened, 220/750 to 260/900: at 750 the falloff completed before the city's
   own far edge and the transition was legible as a band moving across the district when the camera
   pulled back. Ending it at the establishing distance itself makes the recession continuous. */
const DIM_NEAR = 260, DIM_FAR = 900, DIM_FLOOR = 0.28;

const SEED = 4417;
const PW = 1.4;                       /* pilaster width */
const FLOOR = 3.4;                    /* residential floor pitch */
const WIN = { cellW: 1.5, cellH: 1.35, gapX: 0.95, gapY: FLOOR - 1.35 };
const WHITE = 0xdde8ff;               /* the cool MAHGIC white: masts, beacons, rail pods — never a room */

/* ---- v8 §01 THE WINDOW IS A ROOM ---------------------------------------------------------------
   "Most of the windows of the buildings should have yellow or an off-white lighting FAINTLY coming
   out of it." The district's windows were one cool 0xdde8ff, which meant every lit room agreed
   exactly with every lit sign, and fifteen blocks collapsed into a single blue mass however much
   platinum went onto their frames. A room is warm because there are PEOPLE in it; a sign is cold
   because it is MAHGIC. That one difference is what a night skyline's life actually consists of.

   These are materials.js's own interior family, kept here as the literals the window grids tint
   their instances with: windowGrid multiplies MATERIAL colour by INSTANCE colour, so the shared
   material stays a neutral dimmer and the HUE is chosen per face. Faint is deliberate — the grid's
   own per-cell spread (0.22–1.17 of the tint) lands most cells well under half strength. */
const WARM = {
  interior: 0xffeccd,        /* the standard lit room — warm off-white, and the district's majority */
  interiorPale: 0xfff6e4,    /* a deep room read through a large pane: paler, because more of it is air */
  interiorSoft: 0xf2d9a8     /* the SPILL — what that room throws onto its own sill, reveal and spandrel */
};
const COOL = { lit: 0xd7e8ff, spill: 0x8fb4e6 };        /* a MAHGIC-lit room: a training floor, a plant deck */
const DARKROOM = { warm: 0x262229, cool: 0x24324a };    /* an unlit flat: near-black glass, never a hole in the wall */
/* Five faces in six are DOMESTIC; the sixth is MAHGIC-lit and stays cool. The choice is per FACE and
   never per building, because a tower whose every elevation is lit identically reads as one lamp
   rather than as three hundred separate households — and `on` varies the lit fraction so some
   elevations are half empty while others are nearly full. Deterministic, from the face's own seed. */
function faceLight(seed) {
  const k = (Math.imul(seed | 0, 2654435761) >>> 0) % 12;
  if (k < 2) return { tint: COOL.lit, dim: DARKROOM.cool, spill: COOL.spill, cool: true, on: 0.74 };
  if (k < 5) return { tint: WARM.interiorPale, dim: DARKROOM.warm, spill: WARM.interiorSoft, cool: false, on: 0.88 };
  return { tint: WARM.interior, dim: DARKROOM.warm, spill: WARM.interiorSoft, cool: false, on: 0.55 + (k % 4) * 0.13 };
}
/* ---- v7 §02 THE PLATINUM FRAME — the dimensions that decide how much of an elevation is metal.
   Measured at night the district read: sky 36, ARCHITECTURE 52, chromium plaza floor 95. The floor was
   doing all of the platinum work because the blocks were a navy mass wearing a hairline trim. The masses
   are NOT lightened — they are the dark the platinum is measured against, and lifting them would flatten
   the world. What widens is the FRAME. These numbers put roughly a third of a primary elevation into the
   platinumMid grade (base + piers + courses + parapet), which is a framed building; at 100 % it would be
   as wrong as at 0 %. Every band is kept TALLER THAN IT IS DEEP so the face the camera sees is the
   vertical one — a high-metalness metal takes no diffuse light, so orientation, not hue, decides value. */
const FR = { base: 1.9, course: 0.72, courseD: 0.32, pier: 0.8, pierD: 0.34, sill: 0.22, sillD: 0.6, cope: 0.26, band: 1.1 };

/* ---- midground blocks: hand-composed so they overlap the gaps between the three destinations
   from the arrival cameras (see the establishing view) — x, z, footprint w × d, total height h,
   setback fraction sb, which side face also gets windows, rooftop pad kind --------------------- */
/* R170 D1 — FIFTEEN BLOCKS WAS A DISTRICT NOBODY COULD READ. TEN IS A DISTRICT.
   "Consider removing a lot of the city here. It looks very, very confusing still."

   The confusion was never the far layer — the slabs, ghosts and shafts are four fifths fog by their
   own feet and behave. It was this table. Fifteen lit-window masses inside a 300 x 200 m band behind
   the plaza, and from the two cameras that matter FIVE of them stood directly behind another one:
   not beside it, where an overlap builds depth, but ON it, where an overlap builds an edge that
   belongs to neither building. That is what reads as noise — not the number of buildings, the number
   of silhouettes that cannot be assigned to a mass.

   The five that went, and what each was standing behind (bearing from the plaza, near-enough shared):
     L5  24 m in front of L2 on the same bearing, and 22 m shorter — a smaller box occluding the base
         of a bigger one, so L2 lost its ground line and L5 never got a skyline.
     C2  15 m behind C1 and 16 m taller, straddling the centre-left sightline: the pair read as one
         building with a step in it, which is what MASSING is for and not what two buildings are for.
     R4  filling the one piece of open air between R2 and R3, closing the right valley into a wall.
     F1  and
     F2  the two low flank boxes nearest the plaza, at z -22 and -10. These are the ones that crowded
         the arrival frame's edges, and they were crowding it in front of MAH GYM, MAH MARKET and
         MAH FORGE — real destinations with real signage that the eye could not get to.

   P0 TOOK TWO MORE, AND THEY WERE THE TWO THAT CLOSED THE PRIMARY VIEW.
   C1 (-26,-186) and C3 (44,-190) stood immediately BEHIND MAH MATCH at the far end of the plaza's
   forward axis, and the LONG-SIGHTLINE diagnostic showed what that cost: from the deck the midground
   ran as one unbroken wall from the left edge of frame to the right, with the two colossal MAHBEING
   figures and MAH MATCH in the middle and generic lit-window massing filling every degree either
   side of them. The eye stopped at 114 m. WORLD01_MASTER section 2 asks the opposite of exactly this
   — "the eye should be able to travel through the scene", "do not fill every gap" — and its density
   rule wants ONE dominant destination, a few supporting forms, and open visual breathing room.
   Removing them is the whole correction. MAH MATCH keeps the centre as the single destination, and
   what appears either side of it is not emptiness: the treeline at 300-605 m, the ranges behind it,
   and the towers and shafts at 300-780 m were always there and were being hidden by two boxes at
   190 m. This is the master file's own instruction to make the world bigger BY USING SPACE, and it
   is a removal rather than an addition.
   Neither carried a pad, an elevator or any destination the world can send a player to.

   EIGHT REMAIN AND NOT ONE DESTINATION WAS TOUCHED. Every block the world can actually send a player
   to is still standing — L3 (training pad + elevator), R2 (training), R3 (levitate) — and so is
   every block the DECK table rings a terrace around. Two things did leave with the five, and are
   named here rather than discovered later: R4's training pad, of which two others remain, and C2's
   CROWN gesture, which leaves R2 carrying the district's only crown. That is the correct trade —
   a crown is a skyline event and C2 could not deliver one from behind C1 — but it means the crown
   is now a singular gesture in this district and should stay that way deliberately, not by default.
   DETAIL DID NOT DECREASE HERE — OCCLUSION DID. */
const BLOCKS = [
  { id: 'L1', x: -104, z: -46,  w: 22, d: 18, h: 34, sb: 0.25, side: 1 },
  { id: 'L2', x: -150, z: -96,  w: 30, d: 24, h: 62, sb: 0.30, side: 1 },
  { id: 'L3', x: -62,  z: -150, w: 26, d: 22, h: 56, sb: 0.28, side: 0, pad: 'training', elevator: true },
  { id: 'L4', x: -112, z: -148, w: 18, d: 16, h: 46, sb: 0,    side: 1, pad: 'levitate', rot: 0 },
  { id: 'R1', x: 106,  z: -50,  w: 20, d: 18, h: 30, sb: 0,    side: -1 },
  { id: 'R2', x: 116,  z: -112, w: 28, d: 24, h: 50, sb: 0.30, side: -1, pad: 'training' },
  { id: 'R3', x: 74,   z: -164, w: 24, d: 20, h: 52, sb: 0.28, side: 0, pad: 'levitate' },
  { id: 'R5', x: 150,  z: -80,  w: 22, d: 20, h: 36, sb: 0.25, side: -1 }
];
/* ---- v7 §50-7 THREE BLOCK MASSINGS -------------------------------------------------------------
   Gate §50-7 stood PARTIAL from v6 for one reason: fifteen blocks were ONE geometry recipe at fifteen
   scales — the same core mass, the same four pilasters, one crown, one window module. Scale is not
   variety; a bigger copy of a thing is still that thing. There are three MASSINGS now, and they differ
   in MASS, not in size or colour:

     stepped  the v6 form kept: a core with one setback shaft above it, two crowns
     slotted  a slab cut front-to-back by an off-centre slot, a broad low wing beside a slender full-
              height blade, so the crown is a NOTCH against the sky instead of another flat top
     podium   a wide low podium carrying a platinum terrace deck, with a slender shaft set back on it

   A block's massing comes from its IDENTITY, never from its size, so shape and scale stay two
   independent variables — exactly the separation FAMILY_OF already keeps between a tower's shape and
   its material. Hand-checked against the arrival frame so no two neighbouring blocks share a massing,
   and so the three podiums (which are the only massing that grows its footprint) stand clear of the
   blocks beside them. */
/* one row per block in BLOCKS and no rows for anything else: a massing for a block that no longer
   stands is dead data that reads like a promise, and this file has four tables keyed by block id */
const MASSING = {
  L1: 'slotted', L2: 'slotted', L3: 'stepped', L4: 'podium',
  R1: 'podium',  R2: 'stepped', R3: 'podium',  R5: 'slotted'
};
const MASSING_OF = id => MASSING[id] || 'stepped';
/* ---- v8 §02 PUNGENT DISTRICT COLOUR ------------------------------------------------------------
   The direction is saturated primary and secondary colour on the buildings, contrasted against the
   black platinum floor. The failure mode is obvious and worth naming: five hues sprinkled over
   fifteen blocks reads as an arcade, not a civilisation. So colour is a property of a DISTRICT, not
   of a building — the left blocks are violet, the centre is blue, the right is cyan — and only SIX
   of the fifteen carry a gesture at all. Each of those six carries exactly ONE, and it is large: a
   full signage band, a crown, or a full-height seam. Everything else stays dark mass and platinum
   frame, because a contrast needs something to be measured against.
   Hand-checked against the three cut valleys: L1 155.9°, L2 147.5°, C2 100.9°, C3 77.0°, R2 44.0°,
   R5 28.0° — every one of them clear of 52–72°, 108–124° and 128–142°, so no gesture draws the eye
   into a hole the composition is deliberately keeping open. */
const ACCENT_DISTRICT = { L: 'violet', F: 'violet', C: 'blue', R: 'cyan' };
const GESTURE = { L1: 'seam', L2: 'band', R2: 'crown', R5: 'band' };
/* the two megatalls that wear a full-height seam, keyed by their own bearing|radius row in TOWERS.
   Landmarks, so they take their district's hue: 88° is the centre's tallest, 46° is the right's. */
const TOWER_SEAM = { '88|665': 'blue', '46|505': 'cyan' };
/* bridges between blocks (world endpoints sit just inside the block faces) and the main walkway */
/* the walkway sits BEHIND MAH MATCH's new site (z −66, body back to −123), so it still crosses the
   frame without passing through the building */
const WALKWAY = { id: 'city-walkway', ax: -75.5, az: -150, bx: 75.5, bz: -150, y: 40, width: 4.2, pylons: [-52, 52] };
const BRIDGES = [
  { id: 'city-bridge-l2-l4', ax: -93.5, az: -124,   bx: -105.5, bz: -124,   y: 36, width: 3.2 },
  { id: 'city-bridge-r3-r4', ax: 64.7,  az: -141.6, bx: 76,     bz: -131,   y: 30, width: 3.2 },
  { id: 'city-bridge-r4-r2', ax: 92.5,  az: -124,   bx: 107.5,  bz: -124,   y: 30, width: 3.2 }
];
/* background towers: bearing a° (x = r cos a, z = −r sin a), radius r, height, width, archetype, strips */
/* ---- v6 §09 / §11 THE THREE VALLEYS ------------------------------------------------------------
   The v5 skyline formed one continuous wall: the widest hole anywhere in the arrival frame was 3.4°,
   and the PORTRAIT arrival frame — the hero composition — had ZERO open sky to the horizon. Towers and
   slabs standing in three chosen bearing ranges have been removed so the eye can see THROUGH the city
   to the mountains behind it. The valleys, in this table's polar convention (the arrival camera looks
   along bearing ~90°, the frame spans roughly 50°–130°):

     RIGHT VALLEY   52°– 72°   framed by the towers at 44° and 75°
     CENTRE VALLEY 108°–124°   the widest, directly left of MAH MATCH's tower
     LEFT VALLEY   128°–142°   framed by the towers at 120° and 145°

   Nothing was moved into the valleys to compensate. Open sky IS the feature. */
const TOWERS = [
  [104, 300, 128, 22, 'A', 2], [100, 340, 150, 24, 'A', 2],
  [75, 300, 62, 15, 'C', 1],
  [81, 450, 160, 26, 'A', 2], [103, 470, 158, 24, 'B', 1],
  [145, 400, 90, 19, 'B', 1], [120, 400, 136, 21, 'A', 2],
  [44, 330, 112, 21, 'A', 2], [36, 450, 96, 20, 'B', 1],
  [18, 300, 70, 18, 'C', 1], [8, 380, 90, 20, 'B', 1], [160, 320, 80, 18, 'A', 1], [172, 400, 100, 22, 'D', 1], [150, 480, 118, 22, 'A', 1], [25, 480, 124, 24, 'A', 2],
  /* ---- v5 §09 MEGATALL: the skyline needs a top the eye can climb to. These are 2–3× the tallest
     v4 tower, set at four different radii so they overlap each other and the towers in front of them —
     height parallax, not a flat cut-out row. Three new crowns (stepped + spire, notched twin blade,
     crystalline pinnacle) so no two megatalls end the same way. --------------------------------- */
  /* MEGATALLS are LANDMARKS, not a wall: a few dominant towers read better than fifty competing ones
     (§24). Eight remain, all clear of the three valleys, at four radii so they overlap in depth. */
  [96, 470, 340, 34, 'E', 2], [46, 505, 312, 32, 'E', 2],
  [82, 380, 214, 26, 'G', 1], [30, 420, 236, 27, 'G', 1],
  [12, 560, 258, 28, 'E', 1], [156, 455, 226, 27, 'G', 1],
  [88, 665, 392, 40, 'E', 2], [100, 780, 300, 33, 'F', 1]
];
/* distant slabs: bearing, radius, width, height, depth, rotation */
/* distant slabs: bearing, radius, width, height, depth, rotation. The 62°, 112° and 140° slabs were
   the ones closing the three valleys and are gone; the rest keep the far layer populated. */
const SLABS = [
  [30, 700, 60, 210, 30, 0.3], [40, 820, 70, 260, 34, -0.2], [78, 830, 54, 230, 28, 0.1],
  [95, 640, 40, 150, 24, -0.4], [15, 620, 56, 220, 28, 0.4], [166, 690, 48, 190, 26, 0.25]
];
/* ---- v9 §10 THE SHAFTS THAT DO NOT END --------------------------------------------------------
   "Make it look like it goes infinitely up in terms of the city's depth." That is a COMPOSITION
   problem and not a height one: the eye reads infinity from CONTINUATION plus ATMOSPHERE, never from
   one very tall object, and a taller megatall with a visible crown just reads as a bigger building.
   Scaling the eight megatalls up was therefore the one thing not done.

   These six are a different species from a tower: they have NO CROWN, because their tops leave the
   frame. Measured against the two cameras that establish the city — establishing (pos y 3.4, z 84,
   look y 20, fov 44: the frame's top edge sits 28.0° above the camera) and in-world (pos y 1.9,
   z 40, look y 14 at z −74, fov 52) — the frame top at a shaft's own distance works out at 210–260 m,
   and every shaft here is 560–720 m. The eye follows the shaft up and runs out of picture.

   bearing, radius, base width, height, taper (how much of the base width is lost by the top).
   Hand-checked against the three valleys AND against the TOWERS table above, so no shaft stands in
   a valley and none intersects an existing tower: the closest approach is 42 m between the 78°|340
   shaft and the 75°|300 tower, which is 17 m of clear air with both half-widths taken off. */
const SHAFTS = [
  [100, 265, 30, 600, 0.42], [78, 340, 34, 720, 0.40], [104, 420, 28, 640, 0.44],
  [46, 370, 32, 660, 0.40], [148, 330, 26, 560, 0.44], [22, 440, 30, 620, 0.42]
];
/* GHOST SHAFTS: the fourth mechanism — very faint far towers standing ABOVE the near ones' tops, so
   the city implies it continues past what can be resolved. Their value is one step under the
   farthest distant band, and the atmosphere does the rest: at night the fog runs 55 → 880 m, so a
   shaft at 700 m is already four fifths fog at its foot and its top, being farther still, dissolves
   completely before it ends. A form that fades out instead of stopping is the whole idea.
   bearing, radius, width, height — all clear of the three valleys with their angular width taken
   into account (the widest subtends 3.8°). */
const GHOSTS = [
  [86, 700, 46, 760], [102, 650, 42, 660], [76, 730, 44, 800], [38, 690, 40, 700],
  [148, 700, 42, 680], [18, 760, 44, 720], [92, 860, 50, 900], [156, 820, 44, 700]
];
/* the blocks that carry a floating ring deck (v9 §12, the Jetsons gesture). Three of eight — F2 left
   with the D1 thinning and C3 with the P0 sight corridor: a saucer terrace over every block would
   be a pattern, over three it is a civic amenity, and the ratio the gesture depends on holds. */
const DECK = { L1: 1, R1: 1, R5: 1 };

/* ================================================================================================
   v13 §8 / §6D — THE SKY ROADS AND THE SKYBLOCK CARRIERS
   ================================================================================================

   The district had FOBEAM energy routes and six shafts that leave the frame, and no elevated
   roadway anywhere. §8 makes one mandatory — "low/mid/high/rare very-high tiers, smooth curves and
   structural support" — and §11 gates on it. This section is that system, and almost all of the
   thinking in it went into ONE question, because it is the question sky roads are always got wrong
   on: WHERE A ROAD IS ALLOWED TO BE.

   ---- THE COMPOSITION ARITHMETIC (§8, §13) ----------------------------------------------------
   This file's own v6 header cut THREE VALLEYS into the skyline and every pass since has been built
   around them — 52-72 deg right (terrain.js also puts its water BASIN at bearing 62 inside it),
   108-124 deg centre, 128-142 deg left. A ribbon drawn across any of them undoes three passes of
   work in one line, and it would do it at exactly the elevation where the mountains are: a deck at
   130 m and 340 m out sits 20 deg up, which is the middle of a range that tops out at 28 deg.

   So the valleys are widened by a 2 deg margin and the centre and left ones merge (they are only
   4 deg apart), giving two FORBIDDEN BEARING BANDS: 50-74 and 106-144. Every sample of every road
   below is tested against them at build time and the worst margin is reported in stats. What is
   left is three legal corridors — 0-50 on the right flank, 74-106 through the centre, 144-180 on
   the left flank — and all six roads live in those.

   THE MOON falls out of the same arithmetic, and it is worth writing down because it looks like
   luck. sky.js's moonDirection was SAMPLED hour by hour rather than reasoned about, because the
   first estimate of it here was wrong by 4 deg: across 18:00-06:00 it sweeps bearing 61 -> 86 ->
   113 at elevations 21 -> 30.5 -> 22 deg, and the disc subtends 4.15 deg (r 58 at 800 m), so its
   LOWER LIMB never falls below 16.9 deg. Its two low positions, 61.4 and 112.6 deg, sit inside the
   right and centre valleys, which this network already leaves empty. The part of its track that
   crosses a legal corridor is bearings 74-106, and there its limb is 24.4 deg or higher — so the
   centre roads are capped in height instead. The build MEASURES the highest sample any road
   reaches inside a conservative 57-117 window as seen from the establishing camera (0, 3.4, 84):
   18.98 deg, which leaves 5.4 deg of clear sky under the moon at its worst hour. The one RARE
   very-high tier, which does reach 32 deg, is on the RIGHT FLANK at bearings 12-46, where the moon
   never goes at all.

   The three FOBEAM ascent lines stand at radius 37-39 m and the plaza is inside 126 m; the nearest
   road here is at radius 190. Nothing crosses an ascent route.

   ---- WHY THEY ARE CURVES AND NOT ARCS --------------------------------------------------------
   A constant-radius arc is a curve, but it is also a road that never decides anything: it cannot
   reach a tower, so it can only ever be supported by piers from the ground, which is what makes a
   sky road read as scenery. Each road here is a CATMULL-ROM through control points given in
   (bearing, radius, height), so the curve is smooth by construction — there is no straight segment
   anywhere and therefore no angle where two of them meet — and the control points are placed
   against the real TOWERS, SHAFTS and BLOCKS tables above, so the curve threads the district.

   ---- SUPPORT LOGIC IS DERIVED, NOT DRAWN (§3) ------------------------------------------------
   Nothing here decides in advance what carries the road. Support stations are laid at ~55 m of arc
   and each one SEARCHES the anchor set — fifteen midground blocks, twenty-three towers, six shafts,
   with a shaft's half-width taken at the deck's own height off its own taper — and the answer
   decides the structure:
       COLUMN   the anchor's roof is below the deck: a raking pair of legs off that roof, with a pad
                on it and a saddle under the keel. This is the one the reference render shows.
       BRACKET  the anchor stands past the deck: two ties out to its flank plus a collar band.
       PIER     nothing within reach: a tapered pier to the ground with a splayed foot and a haunch.
   A station whose deck would INTERSECT an anchor is a build-time failure, counted and reported.

   ---- LAW 1 ------------------------------------------------------------------------------------
   A road deck is the largest horizontal surface anyone can add to this world, and a mirror grade on
   it renders BLACK. Every triangle the sweep emits is routed by its OWN measured normal into a cap
   bucket (low metalness) or a side bucket, its world area accumulated as it goes, and the totals
   land in stats.skyRoads.horizontalArea. Nothing here is asserted.

   ---- LAW 2 ------------------------------------------------------------------------------------
   The rims are edge-lit, so: a wash strip runs inboard of each rim along the deck it lies on, a
   second falls down the fascia under it, the keel carries a third, and every carrier drags its own
   wash on the deck beneath it. The two LOW roads also lay a pool through ctx.lightPool at the foot
   of their tallest pier, where a 75-135 m column of lit structure actually meets ground the plaza
   floor system can paint.                                                                          */
const SR_BLOCKED = [[50, 74], [106, 144]];      /* the three valleys plus a 2 deg margin, merged */
const SR_CAPBAND = 0.62;                        /* |ny| above this is a horizontal face (foblock.js's own threshold) */
/* The four tiers. `dim` is a GREY the ribbons are vertex-painted with, so one emissive material and
   one wash material carry all four tiers at four brightnesses for one draw call each and the HUE
   still comes from the world Theme. Deck widths are broad on purpose (§8: "broad curved rings") and
   narrow with height, which is the same recession the value grades make. */
const SR_TIER = {
  low:   { halfW: 4.80, thick: 1.34, keelW: 2.10, keelD: 2.30, far: false, dim: 0xffffff, pier: 150, recede: 1.00 },
  mid:   { halfW: 4.40, thick: 1.22, keelW: 1.90, keelD: 2.10, far: false, dim: 0xdcdcdc, pier: 150, recede: 0.86 },
  high:  { halfW: 4.00, thick: 1.10, keelW: 1.70, keelD: 1.90, far: true,  dim: 0xb4b4b4, pier: 195, recede: 0.72 },
  /* the very-high tier is the only one with NO pier budget, and that is the point of it: a rare
     road at 290 m is carried by the towers it threads or it does not exist. */
  vhigh: { halfW: 3.70, thick: 1.00, keelW: 1.55, keelD: 1.75, far: true,  dim: 0x9c9c9c, pier: 0,   recede: 0.66 }
};
/* THE NETWORK. ctrl = [bearing, radius, deck centre height]; every point was placed against the
   TOWERS / SHAFTS / BLOCKS tables above and the two forbidden bands, and the build re-checks both.
   THE HEIGHTS ARE THE PART THAT GOT REWRITTEN. The first cut of this table put the control points
   at whatever height each anchor happened to want, which gave the mid centre road a 51 % grade
   between its first two points — that is a ramp, not a road, and it would have read as one from
   every camera. Every road here is now near-level with a gentle undulation and no segment steeper
   than about 8 %, and the SUPPORTS absorb the difference instead: a column can be 55 m long. */
const SKYROADS = [
  /* LOW, centre corridor — the one that lands on BUILDINGS. It runs over the roofs of C3 and C1.
     ITS HEIGHT IS A CORRECTION, not a preference. At 78-81 m its keel underside sat at 76.4 and the
     CRYSTAL BLADE SHARDS growing off C1's roof reach a MEASURED 81.9 m in the built group, so the
     first cut of this road had 447 shard vertices standing inside its deck — the shards speared it.
     The build's own collision test could not see that: it tests the deck against the BLOCKS / TOWERS
     / SHAFTS tables, and a shard is in none of them. Lifted 8 m, the worst clearance along the whole
     road is +2.6 m to the tallest thing under it. It is still the lowest centre road there is. */
  { id: 'sr-low-centre', tier: 'low', carriers: 2, speed: 15.0,
    ctrl: [[76, 196, 87], [86, 214, 89], [97, 190, 88], [104, 202, 86]] },
  /* MID, centre corridor — the long one. It is held INSIDE the 265-340 m ring of shafts for its
     whole length rather than weaving through it: the first cut crossed radius 340 at bearing 80,
     which is exactly where the 720 m shaft at 78|340 stands, and the build's own collision test
     caught it. Brackets out to the shaft and to 100|340, and spans its middle on one pier.
     ITS HEIGHT IS ALSO A CORRECTION. At 121-125 m its keel underside sat at 118.3 and the RING DECK
     over the tower at 75|300 reaches a MEASURED 122.7 m — the saucer stood inside the deck. Same
     blind spot: a ring deck is not in the anchor tables either. Lifted 7 m. */
  { id: 'sr-mid-centre', tier: 'mid', carriers: 2, speed: 17.5,
    ctrl: [[77, 296, 128], [82, 312, 130], [90, 322, 132], [100, 306, 128]] },
  /* HIGH, centre corridor — 186-192 m, which is 18-19 deg from the establishing camera: above the
     midground entirely, still a clear 8 deg under the moon at its highest. */
  { id: 'sr-high-centre', tier: 'high', carriers: 1, speed: 19.0,
    ctrl: [[78, 452, 186], [85, 472, 190], [96, 508, 192], [104, 452, 187]] },
  /* MID, right flank — five anchors and four clear spans, the most structurally legible of the six. */
  { id: 'sr-mid-right', tier: 'mid', carriers: 2, speed: 16.5,
    ctrl: [[12, 528, 126], [22, 472, 134], [30, 456, 138], [46, 402, 130]] },
  /* LOW, left flank — brackets off the 560 m shaft at 148|330 and the two towers at 160 and 172. */
  { id: 'sr-low-left', tier: 'low', carriers: 1, speed: 14.0,
    ctrl: [[147, 356, 60], [160, 342, 66], [172, 428, 72]] },
  /* THE RARE VERY-HIGH, on the right flank where the moon never travels. One road, one carrier,
     280-298 m, carried entirely on the two 620/660 m shafts and the towers between them — there is
     no pier tier at this height and there should not be. It runs directly ABOVE sr-mid-right at the
     same bearings and 155 m higher, so the two read as one interchange seen in section. */
  { id: 'sr-vhigh-right', tier: 'vhigh', carriers: 1, speed: 21.0,
    ctrl: [[12, 534, 280], [22, 470, 290], [46, 400, 298]] }
];
/* THE CARRIER, grown from foblock.js's genome and not invented here (§6D: "a carrier is an
   elongated FOBLOCK, not a new species"). `stretch` runs along local +Z, which is the genome's
   DEPTH axis — so the medallion and the square-diamond mark end up on the NOSE, and the two lateral
   connection rings stay circular at mid height on the flanks, tracking just inside the deck's rim
   lights. Nothing is scaled that would turn a ring into an ellipse. */
const SR_CAR = { size: 3.6, stretch: 2.75, clear: 0.62, dwell: 2.6 };
const SR_MOT = 96;      /* motion samples per road: the carriers read off this, never off the geometry */

/* ---- sky-road geometry helpers (module level so they allocate nothing per frame) ------------- */
/* Route ONE triangle by its OWN measured normal. This is the whole of law 1's enforcement in this
   file: `cap` collects every face whose normal is more vertical than horizontal and the caller
   clads it in a LOW-metalness grade, `side` takes everything else and may take a mirror. The area
   is accumulated in world metres as it goes, so the module can REPORT the horizontal face it made
   instead of claiming it made none. */
function srTri(B, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const L = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (!(L > 1e-9)) return;
  /* B.band lets a caller ROUTE at a tighter threshold than it MEASURES at. The carriers need that:
     they are placed with pitch and bank, so a face sitting just inside the vertical band in the
     prototype's own frame can tip past it in the world. Routing at 0.49 and reporting at 0.62 means
     the extra margin is spent on the safe side and the number reported is still the real one. */
  const k = ny / L, a = L * 0.5, band = B.band || SR_CAPBAND;
  (Math.abs(k) > band ? B.cap : B.side).push(ax, ay, az, bx, by, bz, cx, cy, cz);
  if (k > SR_CAPBAND) B.up += a; else if (k < -SR_CAPBAND) B.down += a; else B.vert += a;
}
/* uniform Catmull-Rom through the control points, with the two ends linearly extrapolated so the
   curve starts and finishes ON the first and last control point rather than short of them */
function srSpline(ctrl, n) {
  const P = ctrl.slice();
  P.unshift(ctrl[0].map((v, i) => 2 * v - ctrl[1][i]));
  P.push(ctrl[ctrl.length - 1].map((v, i) => 2 * v - ctrl[ctrl.length - 2][i]));
  const segs = P.length - 3, out = [];
  for (let s = 0; s <= n; s++) {
    const g = (s / n) * segs, si = Math.min(segs - 1, Math.floor(g)), t = g - si;
    const p0 = P[si], p1 = P[si + 1], p2 = P[si + 2], p3 = P[si + 3], t2 = t * t, t3 = t2 * t, r = [];
    for (let i = 0; i < 3; i++) {
      r.push(0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
    }
    out.push(r);
  }
  return out;
}
/* how far a bearing sits outside the two forbidden bands; negative means it is inside one */
function srMargin(a) {
  let m = 999;
  for (const [lo, hi] of SR_BLOCKED) m = Math.min(m, a < lo ? lo - a : a > hi ? a - hi : -Math.min(a - lo, hi - a));
  return m;
}
/* one triangle, wound so it faces the given direction */
function srTriOut(B, a, b, c, ox, oy, oz) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  if (nx * ox + ny * oy + nz * oz < 0) srTri(B, a[0], a[1], a[2], c[0], c[1], c[2], b[0], b[1], b[2]);
  else srTri(B, a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}
function srQuad(B, a, b, c, d, ox, oy, oz) { srTriOut(B, a, b, c, ox, oy, oz); srTriOut(B, a, c, d, ox, oy, oz); }
/* Sweep a CLOSED CONVEX section along a sampled centreline. `sec` is [[v, y], ...] in the road's own
   cross-section frame — v across (along the horizontal right vector), y in world up — and the
   winding of every quad is decided against the section's own outward direction, so a section can be
   written either way round and still come out facing the world. Convex is required only so the end
   caps can be fanned from vertex 0; the deck slab and the keel are therefore swept as two separate
   convex tubes rather than as one concave profile. */
function srSweep(B, pts, sec, capEnds, open) {
  const n = pts.length, m = sec.length, edges = open ? m - 1 : m;
  let cv = 0, cy = 0;
  for (const s of sec) { cv += s[0]; cy += s[1]; }
  cv /= m; cy /= m;
  const wp = (i, k) => { const p = pts[i], s = sec[k]; return [p.x + p.rx * s[0], p.y + s[1], p.z + p.rz * s[0]]; };
  for (let i = 0; i + 1 < n; i++) for (let k = 0; k < edges; k++) {
    const k2 = (k + 1) % m, p = pts[i];
    const mv = (sec[k][0] + sec[k2][0]) * 0.5 - cv, my = (sec[k][1] + sec[k2][1]) * 0.5 - cy;
    srQuad(B, wp(i, k), wp(i, k2), wp(i + 1, k2), wp(i + 1, k), p.rx * mv, my, p.rz * mv);
  }
  if (!capEnds) return;
  for (const [i, s] of [[0, -1], [n - 1, 1]]) {
    const p = pts[i], o0 = wp(i, 0);
    for (let k = 1; k + 1 < m; k++) srTriOut(B, o0, wp(i, k), wp(i, k + 1), p.tx * s, p.ty * s, p.tz * s);
  }
}
/* Feed an ordinary THREE geometry through the same by-measured-normal router, so the supports obey
   law 1 on exactly the same terms the swept deck does and land in the same two buckets. */
function srBucket(B, g) {
  const n = g.index ? g.toNonIndexed() : g;
  const p = n.attributes.position.array, c = n.attributes.position.count;
  for (let i = 0; i + 2 < c; i += 3) {
    const o = i * 3;
    srTri(B, p[o], p[o + 1], p[o + 2], p[o + 3], p[o + 4], p[o + 5], p[o + 6], p[o + 7], p[o + 8]);
  }
  if (n !== g) n.dispose();
  g.dispose();
}
/* a tapered member between two points — the one primitive every column, tie and stay is cut from.
   Open-ended on purpose: a strut's two end discs are buried in the pad and the saddle, and an
   unbuilt disc is one fewer horizontal face to have to answer for. */
const _srUp = new THREE.Vector3(0, 1, 0), _srD = new THREE.Vector3(), _srQ3 = new THREE.Quaternion(), _srM3 = new THREE.Matrix4(), _srP3 = new THREE.Vector3(), _srS3 = new THREE.Vector3(1, 1, 1);
function srStrut(ax, ay, az, bx, by, bz, r0, r1, sides) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (!(L > 0.05)) return null;
  const g = new THREE.CylinderGeometry(r1, r0, L, sides || 6, 1, true);
  _srD.set(dx / L, dy / L, dz / L); _srQ3.setFromUnitVectors(_srUp, _srD);
  _srP3.set((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  g.applyMatrix4(_srM3.compose(_srP3, _srQ3, _srS3));
  return g;
}
/* A RIBBON: a quad strip swept along the centreline between two cross-section offsets, carrying a
   uv that runs 0..1 along the road and 0..1 across the strip, which is exactly what the district's
   shared falloff map wants — the light is full along the strip's middle and gone at both of its
   edges, and it dies away over the last 14 % at each end of the road rather than stopping. */
function srRibbon(pts, aV, aY, bV, bY) {
  const n = pts.length, q = n - 1;
  const pos = new Float32Array(q * 18), uv = new Float32Array(q * 12);
  let o = 0, t = 0;
  const put = (p, v, y, u, w) => { pos[o++] = p.x + p.rx * v; pos[o++] = p.y + y; pos[o++] = p.z + p.rz * v; uv[t++] = u; uv[t++] = w; };
  for (let i = 0; i < q; i++) {
    const p0 = pts[i], p1 = pts[i + 1], u0 = i / q, u1 = (i + 1) / q;
    put(p0, aV, aY, u0, 0); put(p0, bV, bY, u0, 1); put(p1, bV, bY, u1, 1);
    put(p0, aV, aY, u0, 0); put(p1, bV, bY, u1, 1); put(p1, aV, aY, u1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
/* scratch for the carriers — one of each, reused every frame for every carrier (no allocation) */
const _srCarM = new THREE.Matrix4(), _srCarQ = new THREE.Quaternion(), _srCarE = new THREE.Euler(), _srCarP = new THREE.Vector3(), _srCarS = new THREE.Vector3(1, 1, 1);

/* ---- small deterministic helpers ------------------------------------------------------------ */
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function smooth(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function polar(a, r) { const t = a * Math.PI / 180; return [r * Math.cos(t), -r * Math.sin(t)]; }

/* ================================================================================================
   L42 — THE BACKDROP HAS TO BE TOLD WHEN THE WORLD GROWS A CITY WHERE IT WAS STANDING
   ================================================================================================
   This module's distant layer — slabs, ghosts, the colossal tapered form, the ring on pylons — was
   composed when there was one city and the whole ring beyond 600 m was empty backdrop to arrange.
   Lake City (bearing 62, r 700) and Rainforest City (bearing 127, r 700) then landed inside it, and
   nobody told this file. Measured, FIVE distant forms were standing inside a destination: a 90 x 320
   m slab at bearing 128 planted dead centre in the rainforest, the 330 m colossal form and the
   pylon ring both inside the lake, plus a ghost each. From the plaza they were invisibly correct —
   backdrop behind backdrop. From inside either city, walked to, one of them filled a quarter of the
   frame with a blank unlit face, which is how the rainforest's was found.

   terrain.js already solved this shape of problem with its PASSES table, and this is the same table
   read from the other side: those bearings are SPOKEN FOR. A placement that lands inside a site is
   swung outward along the ring — deterministically, smallest move first, either direction — so the
   backdrop keeps its object count and its silhouette rhythm and simply stands somewhere it is not
   standing in a city. Nothing is dropped; a hole in the far skyline would be its own defect. */
const SITES = [
  { id: 'lake', bearing: 62, r: 700, keepOut: 330 },
  { id: 'rainforest', bearing: 127, r: 700, keepOut: 400 }
];
function insideSite(x, z, pad) {
  for (const S of SITES) {
    const [sx, sz] = polar(S.bearing, S.r);
    if (Math.hypot(x - sx, z - sz) < S.keepOut + (pad || 0)) return S;
  }
  return null;
}
/* the adjusted bearing for a form at (a, r) of half-width `half`, or the original if it is clear */
function clearOfSites(a, r, half) {
  let [x, z] = polar(a, r);
  if (!insideSite(x, z, half || 0)) return a;
  /* swing in 3° steps, alternating sides, so the correction is the smallest one that works and two
     forms displaced from the same site do not pile up on the same shoulder */
  for (let step = 3; step <= 90; step += 3) {
    for (const dir of [1, -1]) {
      const b = a + dir * step;
      [x, z] = polar(b, r);
      if (!insideSite(x, z, half || 0)) return b;
    }
  }
  return a;                                  /* nowhere on this ring is clear; leave it where it was */
}
/* concatenate geometries (non-indexed) into one static BufferGeometry; disposes the inputs.
   v8: a vertex COLOUR is carried when any part has one, which is what lets all three district accent
   hues share ONE wash mesh instead of costing a draw call each — the wash material is white and the
   hue rides on the vertices. Parts without a colour default to white, so nothing else changes. */
function mergeGeos(list) {
  const parts = []; let count = 0, tinted = false;
  for (const g of list) { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (n.attributes.color) tinted = true; parts.push(n); count += n.attributes.position.count; if (n !== g) g.dispose(); }
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const col = tinted ? new Float32Array(count * 3) : null;
  let o = 0;
  for (const n of parts) {
    const c = n.attributes.position.count;
    pos.set(n.attributes.position.array, o * 3); nor.set(n.attributes.normal.array, o * 3);
    if (n.attributes.uv) uv.set(n.attributes.uv.array, o * 2);
    if (col) { if (n.attributes.color) col.set(n.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3); }
    o += c; n.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
/* paint one geometry's vertices so it can share a merged mesh with other hues */
const _tint = new THREE.Color();
function paint(geo, hex) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  _tint.setHex(hex);
  for (let i = 0; i < n; i++) { a[i * 3] = _tint.r; a[i * 3 + 1] = _tint.g; a[i * 3 + 2] = _tint.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
/* ---- v8 §03 THE WASH — how a light in this file proves it is a light -----------------------------
   An emissive material makes a bright rectangle and illuminates nothing, which is the exact defect
   the direction is calling out. A wash is the answer: an unlit plane carrying the emitter's own hue
   and a FALLOFF MAP, laid on the surface the emitter is mounted to. The map is bright along the
   emitter's line and gone at the edges of the quad, so a two-metre-tall wash is light that dies in
   two metres — believable falloff, not a uniform tint over a whole facade.
   `hwash` falls off across its HEIGHT (a band, a window ribbon, a sill line); `vwash` is the same
   quad rotated a quarter turn so it falls off across its WIDTH, for a vertical seam's two jambs. */
const hwash = (w, h) => new THREE.PlaneGeometry(w, h);
const vwash = (w, h) => new THREE.PlaneGeometry(h, w).rotateZ(Math.PI / 2);
const soffitWash = (w, d) => new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2);    /* faces DOWN: under a course, a coping */
const sillWash = (w, d) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);     /* faces UP: onto a sill, a deck, a plinth */
/* flat facets: non-indexed + per-face normals */
function faceted(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); if (n !== g) g.dispose(); return n; }
/* ---- v11 §06 CUT STONE, NOT SPLINTERS ----------------------------------------------------------
   THE SILHOUETTE IS ROUND. THE SURFACE IS CRYSTALLINE. A shard's SURFACE must stay planar, cut and
   faceted; what has to stop reading as a spike is its OUTLINE against whatever is behind it. v9 built
   every shard from a single CylinderGeometry, which gives a straight taper: one constant tangent from
   the foot to the tip, meeting the terminal facet at one hard corner, and meeting the wall it grows
   from at one hard arris. That is the geometry of a splinter, and at 11-39 m — which is what the
   corner emergences, the terrace fans and the megatall setback shards actually are — it read as a
   spike glued to a building.

   `shardPrism` separates the two things a shard is made of, so both can be designed:
     PLAN     the cross-section, as unit points in x/z. Wound like a CylinderGeometry's
              (x = sin th, z = cos th, th increasing) so the outward faces come out the same way.
     PROFILE  rings of [radius, height] up the axis. More than two rings is the whole point: it is
              what lets the silhouette TURN instead of running straight.
   Caps are fanned from vertex 0, which costs n − 2 triangles where a centre vertex costs n.

   The two moves the profiles make, and neither of them removes a facet — both ADD one:
     THE HAUNCH   a short flared ring at the foot, so a shard leaves its surface wider than its body.
                  A shard that steps out of the wall reads as the material breaking; one that meets it
                  at a single arris reads as an object stuck on.
     THE CROWN    on the blade — the one archetype with an aggressive taper — a second, steeper facet
                  before the terminal one, so the outline turns toward horizontal at the tip rather
                  than arriving at it along a single straight line. This is terrain.js massif()'s
                  argument, cut into flats instead of sampled: a cone's tangent is the same all the way
                  to its point, and what stops a form being a cone is the tangent turning at the top.
   The blade's terminal facet also grows 0.13 -> 0.165 of its own width, because a blunt tip holds a
   highlight and a hairline aliases away. */
function shardPrism(plan, profile) {
  const n = plan.length, m = profile.length;
  const tris = n * (m - 1) * 2 + 2 * (n - 2);
  const pos = new Float32Array(tris * 9);
  let o = 0;
  const put = (k, i) => { const r = profile[k][0]; pos[o++] = plan[i][0] * r; pos[o++] = profile[k][1]; pos[o++] = plan[i][1] * r; };
  for (let k = 0; k + 1 < m; k++) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    put(k, i); put(k, j); put(k + 1, j);
    put(k, i); put(k + 1, j); put(k + 1, i);
  }
  for (let i = 1; i + 1 < n; i++) { put(0, 0); put(0, i + 1); put(0, i); }               /* the foot, facing down */
  for (let i = 1; i + 1 < n; i++) { put(m - 1, 0); put(m - 1, i); put(m - 1, i + 1); }   /* the terminal facet */
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();      /* non-indexed, so every triangle keeps its own normal: flat facets */
  return g;
}
/* THE PLANS. Four sides is the SQUARE DIAMOND seen in plan — the brand's own figure and law 6's one
   exception, so it is kept exactly, vertices on the axes. Six sides is the crystal's. Eight is the
   square diamond WITH ITS FOUR CORNERS CHAMFERED: the four cut faces lie exactly on the original
   square's own faces, so this is the same figure with a small third face at each arris rather than a
   different one — more crystalline, not less. It is spent only on the near grade, where a bare
   four-sided splinter is close enough for its corners to read. The 1.09 rescale keeps the cut section
   the same visual bulk as the square it came from. */
const PLAN4 = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const PLAN6 = [0, 1, 2, 3, 4, 5].map(k => [Math.sin(k * Math.PI / 3), Math.cos(k * Math.PI / 3)]);
const PLAN8 = (() => { const t = 0.21, a = 1 - t, s = 1.09;
  return [[t, a], [a, t], [a, -t], [t, -a], [-t, -a], [-a, -t], [-a, t], [-t, a]].map(([u, v]) => [u * s, v * s]); })();
/* the profiles, in the shard's own unit height. Radius 0.5 is the nominal half-width, so SH's `w` and
   `t` stay real metres; only the haunch ring exceeds it, by 12 % over the bottom 8 % of the height. */
const PROF = {
  blade:   [[0.56, 0], [0.50, 0.085], [0.245, 0.86], [0.165, 1]],   /* haunch, body, crown, table */
  crystal: [[0.52, 0], [0.46, 0.075], [0.300, 1]],                  /* haunch, body — its table is already broad */
  cluster: [[0.52, 0], [0.45, 0.085], [0.225, 0.86], [0.150, 1]],
  /* THE SPUR — the cluster's second member. Shorter and broader than v9's, and it now merges back
     into the main blade's outline TANGENTIALLY rather than crossing it: its outer edge leaves the
     haunch at 0.66 of the pair's width and rejoins the main silhouette at about 0.4 of the height, so
     the cluster's OUTER ENVELOPE is one convex line with a designed shoulder in it, not a fork. */
  spur:    [[0.38, 0], [0.325, 0.06], [0.170, 0.52]]
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function matrixOf(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, parent = null) {
  _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s);
  if (parent) _m.premultiply(parent);
  return _m;
}
/* place a fresh geometry: local translate / yaw / scale, then an optional parent matrix */
function xform(geo, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, parent = null) { geo.applyMatrix4(matrixOf(x, y, z, ry, sx, sy, sz, parent)); return geo; }
/* A SHARD IS PLACED BY A FULL POSE, not by a yaw. Its entire language is that it LEANS out of the
   surface it grows from — a shard standing plumb against a wall is a fin, and a shard with no roll is
   a row of identical fins — so it needs pitch and roll as well. Order 'YXZ': yaw the shard around the
   building first, then tilt it out of the wall, then roll it off the vertical. Same scratch discipline
   as matrixOf: one Euler, one quaternion, one matrix, reused, so placing 250 shards allocates nothing. */
const _m2 = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _p2 = new THREE.Vector3(), _s2 = new THREE.Vector3(), _e2 = new THREE.Euler();
function poseOf(x, y, z, rx, ry, rz, sx, sy, sz, parent = null) {
  _e2.set(rx, ry, rz, 'YXZ'); _q2.setFromEuler(_e2); _p2.set(x, y, z); _s2.set(sx, sy, sz); _m2.compose(_p2, _q2, _s2);
  if (parent) _m2.premultiply(parent);
  return _m2;
}

export function buildCity(ctx) {
  const M = ctx.M || {};
  const theme = ctx.theme || M.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };
  const mat = (k, fb) => M[k] || M[fb] || M.graphite || new THREE.MeshStandardMaterial({ color: 0x1b2433 });
  const structuralM = mat('structural', 'graphite'), compositeM = mat('composite', 'graphiteDark'), panelM = mat('panel', 'graphite'), trimM = mat('trimSatin', 'trim');
  /* THE MISSING RUNG, spent on the district (see materials.js). platinumMid sits at luminance 142,
     between the block masses (49–58) and the bright platinum family (183–232) — a grade broad enough to
     CARRY an elevation rather than outline it. Its two partners are not decoration: platinumMidBrushed
     puts a directional streak on the piers, which are the tallest single pieces of metal on a facade,
     and platinumMidLit is the LOW-metalness partner every up-facing piece of the frame must use. A
     metal at 0.94 metalness is lit only by what it reflects, and a horizontal face reflects the night
     zenith, which is black — the sill and the coping would vanish in the exact grade that makes the
     piers read. This world has shipped that bug once already. */
  const platMidM = mat('platinumMid', 'platinum'), platPierM = mat('platinumMidBrushed', 'platinumMid'), platCapM = mat('platinumMidLit', 'platinumLit');
  const anchors = ctx.lifeAnchors || (ctx.lifeAnchors = { paths: [], pads: [], doors: [], windows: [] });
  anchors.paths = anchors.paths || []; anchors.pads = anchors.pads || [];

  /* the three district accent hues, and only three. materials.js owns them (emissive, near-black
     base, dimmed with the world clock by its own setTime), so they are USED here and never disposed. */
  const accentM = { violet: mat('accentViolet', 'energy'), blue: mat('accentBlue', 'energy'), cyan: mat('accentCyan', 'energy') };

  const group = new THREE.Group(); group.name = 'city';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };

  /* THE FALLOFF MAP every wash in this module is cut from: white, opaque along its centre line and
     gone at top and bottom, with the last 14 % of its width faded so a band does not end on a hard
     edge. One 32 × 64 canvas, shared by every spill and every accent wash in the district. */
  const washTex = canvasTexture(32, 64, (c, w, h) => {
    const v = c.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(0.34, 'rgba(255,255,255,0.55)');
    v.addColorStop(0.5, 'rgba(255,255,255,1)');
    v.addColorStop(0.66, 'rgba(255,255,255,0.55)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in';
    const u = c.createLinearGradient(0, 0, w, 0);
    u.addColorStop(0, 'rgba(0,0,0,0)'); u.addColorStop(0.14, 'rgba(0,0,0,1)');
    u.addColorStop(0.86, 'rgba(0,0,0,1)'); u.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = u; c.fillRect(0, 0, w, h);
  });
  owned.textures.push(washTex);

  /* own materials: windows (instance colour × material colour), theme energy lines, cool-white lights, far silhouettes */
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true, fog: true }); winMat.name = 'city-windows';
  /* THE WORLD ANSWERING ITS OWN WINDOWS. Two materials, one per interior temperature, and one more
     carrying every accent hue on its vertices. depthWrite off because a wash is light landing on a
     surface, not a surface; the opaque depth buffer still occludes it, so a wash on a block behind
     another block stays behind it. */
  const spillWarmM = new THREE.MeshBasicMaterial({ color: WARM.interiorSoft, map: washTex, transparent: true, opacity: 0.44, depthWrite: false, toneMapped: true, fog: true });
  const spillCoolM = new THREE.MeshBasicMaterial({ color: COOL.spill, map: washTex, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: true, fog: true });
  const accentWashM = new THREE.MeshBasicMaterial({ color: 0xffffff, map: washTex, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: true, fog: true });
  spillWarmM.name = 'city-window-spill-warm'; spillCoolM.name = 'city-window-spill-cool'; accentWashM.name = 'city-accent-wash';
  const stripMat = new THREE.MeshBasicMaterial({ color: theme.energy, toneMapped: true, fog: true }); stripMat.name = 'city-energy';
  const whiteMat = new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: true, fog: true }); whiteMat.name = 'city-lights';
  /* R170 §4/§5/§6 — THE SIX LEVEL-4 FAMILIES, AND WHY THEY ARE THE ONES THAT RECEDE.
     Every material listed here paints a form measured in ones of metres: a window cell is 1.5 x 1.35,
     a light strip is a few centimetres wide, a mast lamp is a point. From the plaza they are the
     texture of a lived-in city and they must stay exactly as they are — DIM_NEAR is 220 m, past the
     far edge of the built district, so nothing a walking or standing camera sees is touched at all.
     From 900 m they were the entire image: ten thousand sub-pixel white dots with no building
     underneath them. They now fall to DIM_FLOOR, which is what lets the megatalls, the destination
     masses and the plaza read as SHAPES from the air.

     What is deliberately NOT in this list: every opaque architectural grade in this file. Those are
     the large forms, and the whole point is that they keep their contrast while the sparkle on them
     goes quiet. Nor is anything outside city.js — the monument gem, the hero FOBEAM, the MAH NEXUS
     energy and destination signage are level 1 and are never passed to this. */
  [winMat, spillWarmM, spillCoolM, accentWashM, stripMat, whiteMat]
    .forEach(m => applyDistanceDim(m, DIM_NEAR, DIM_FAR, DIM_FLOOR));
  /* v6 §07 / §08 / §25 / §44 — THE BACKGROUND MATERIAL FAMILIES.
     In v5, twenty-six of thirty-nine towers wore one of two materials, and all twelve distant
     silhouettes were a single flat 0x0a1322. Material is the only depth cue a silhouette has left, so
     the whole background flattened into one cut-out plane. These four families give the skyline
     separation the way a real one gets it — not by painting buildings different colours, but by
     building them out of different METALS AND GLASS that answer the same moonlight differently.
     Colour comes from material response, never from flat paint (§08). */
  const towerFamilies = {
    /* bright platinum + blue glass: the landmarks, and the closest band, so they read first */
    platinum: new THREE.MeshStandardMaterial({ color: 0x9aabc4, roughness: 0.28, metalness: 0.94, envMapIntensity: 2.0 }),
    /* dark crystalline glass + silver ribs: reads almost black on a turned-away plane, bright where it catches */
    glass: new THREE.MeshStandardMaterial({ color: 0x25406b, roughness: 0.1, metalness: 0.55, envMapIntensity: 2.4, flatShading: true }),
    /* soft graphite: the quiet mass that lets the other two read */
    graphite: new THREE.MeshStandardMaterial({ color: 0x3a4863, roughness: 0.56, metalness: 0.82, envMapIntensity: 1.35 }),
    /* a restrained violet-grey reflective zone: one district's material identity, never a rainbow */
    violet: new THREE.MeshStandardMaterial({ color: 0x554e7c, roughness: 0.34, metalness: 0.76, envMapIntensity: 1.7 }),
    /* ---- v10 §12 THE DEEP SKYLINE ---------------------------------------------------------------
       AERIAL PERSPECTIVE WAS INVERTED, and it is what made the city read flat. Every megatall past
       520 m wore `glass`: metalness 0.55, roughness 0.1, a dark navy. A metal takes no diffuse light,
       so beyond the reach of the plaza's own lamps those towers were lit by whatever the night
       environment returned — and that is LESS than the sky behind them and less than the mountains
       behind THAT. A 600 m tower rendered darker than a 1500 m mountain. The skyline became a row of
       flat near-black cut-outs pasted on a lighter sky: no crown, no setback, no shaft, nothing for
       the eye to climb. §01 forbids exactly this ("black boxes"), §12 asks for a legible BASE / LOWER
       BODY / MID / UPPER / CROWN, and the direction was "make it look like it goes infinitely up".

       Distance now buys VALUE. Metalness falls away with range so the far towers take the hemisphere
       and the fog like the mountains do, and their base colour climbs toward the horizon key — the
       same law terrain.js paints its three ranges by. The silhouette is unchanged; only what happens
       INSIDE it is. Two new families cost two draw calls, because the towers are instanced per
       (archetype × family) and the megatalls are two archetypes. */
    glassFar: new THREE.MeshStandardMaterial({ color: 0x4a688f, roughness: 0.33, metalness: 0.34, envMapIntensity: 1.45, flatShading: true }),
    glassDeep: new THREE.MeshStandardMaterial({ color: 0x63799d, roughness: 0.54, metalness: 0.15, envMapIntensity: 1.0, flatShading: true })
  };
  Object.keys(towerFamilies).forEach(k => { towerFamilies[k].name = 'city-tower-' + k; owned.materials.push(towerFamilies[k]); });
  /* the distant layer gets THREE depth values instead of one, so 600 m and 830 m are not the same
     paper cut-out. Unlit basic materials: at that range the fog does the rest. */
  const farMats = [
    new THREE.MeshBasicMaterial({ color: 0x22304a, fog: true }),
    new THREE.MeshBasicMaterial({ color: 0x18243a, fog: true }),
    new THREE.MeshBasicMaterial({ color: 0x111b2c, fog: true })
  ];
  /* one step under the farthest band: the ghosts must read as a shade darker than the fogged air they
     stand in, because that difference is all a form at 700 m has left to be seen by */
  /* L41 — A FORM THAT DISSOLVES INTO THE FOG STOPS DISSOLVING WHEN THE FOG MOVES.
     The ghosts were authored against a night fog of 55 → 880 m: at 650–860 m a ghost's foot was four
     fifths obscured and its top was gone entirely, which is the whole idea of them. L34 pushed far to
     2350 to save terrain's value ladder, and at 26–35% fog these eight shafts snapped into focus as
     hard black bars — the most graphic thing in the wide frame, and darker than the sky they stand
     against, so they read as cut-outs rather than as a city continuing past where it can be read.
     A backdrop element must not outsource its own dissolve to an atmosphere setting owned by another
     module. It dissolves at the material now: transparent at 0.30, so however the fog is tuned the
     ghost is always mostly whatever is behind it. */
  const farGhostM = new THREE.MeshBasicMaterial({ color: 0x0d1626, fog: true, transparent: true, opacity: 0.30, depthWrite: false }); farGhostM.name = 'city-distant-ghost';
  farMats.forEach((m, i) => { m.name = 'city-distant-' + i; owned.materials.push(m); });
  owned.materials.push(farGhostM);
  /* ---- R170 D5: ONE FLOOR, FROM THE PLAZA TO THE MOUNTAINS ------------------------------------
     "Start adding some uniformity across the floor, across the entire grounded map. We have the
     black platinum floor on the main city area, but extend that to the entire map."

     THE GROUNDED MAP IS THREE SURFACES AND THEY WERE THREE DIFFERENT MATERIALS:
       ground.js    a 260 x 260 m plane of M.plaza — black platinum, roughness 0.055, metalness 0.98,
                    the diamond lattice in its roughness and bump maps, and mahplaza's mirror patch
                    on top. This is the floor the direction is pointing AT.
       this file    a ring from 126 m to 620 m, and it was a flat unlit MeshBasicMaterial at
                    0x141d2c. No lattice, no metal, no response to anything — a painted blue-grey
                    disc, and from any camera above the deck it is most of the ground in frame.
                    This is the one that broke the uniformity.
       terrain.js   600 m to 2600 m, painted with a radial gradient that lifts into the horizon key.

     THIS RING JOINS THE FAMILY. Not by copying M.plaza — by taking the SATIN grade, which is the
     vocabulary ground.js already uses for its own outer field: same near-black colour family, same
     metalness, roughness 0.30 instead of 0.055. A plaza deck is polished and the ground around a
     city is not, and saying that with the two grades the floor system already owns is what makes
     the transition read as one material finished two ways rather than as two materials meeting.
     The diamond maps come from M.plaza itself and are repeat-scaled by the SAME rule ground.js uses
     — one painted diamond per 9 m cell — so the lattice runs straight off the deck and out to the
     treeline without a seam or a change of scale.

     WHAT IT DELIBERATELY DOES NOT TAKE IS THE MIRROR. mahplaza's planar pass is sized and aimed for
     the plaza; projecting it across a 620 m ring would sample outside its own coverage, and a
     reflective field at that radius is exactly the "mirror duplicates the city" failure v10 was
     written against. The material identity extends; the planar reflection stays where it belongs. */
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0a0e16, roughness: 0.30, metalness: 0.96, envMapIntensity: 2.2, fog: true
  });
  groundMat.name = 'city-ground';
  if (M.plaza && M.plaza.roughnessMap) {
    /* the maps are SHARED with M.plaza and must not be re-repeated here: ground.js already set
       their repeat for its own 260 m plane, and a texture's repeat is a property of the texture,
       not of the material using it. Cloning is what lets this ring carry the same lattice at its
       own scale without silently re-tiling the plaza's floor underneath it. */
    const rm = M.plaza.roughnessMap.clone(); rm.needsUpdate = true;
    const rep = (620 * 2) / (4 * 9.0);          /* ground.js's rule: one painted diamond per 9 m cell */
    rm.repeat.set(rep, rep);
    groundMat.roughnessMap = rm;
    owned.textures.push(rm);
    /* THE ROUGHNESS MAP EARNS ITS PLACE HERE AND THE BUMP MAP DOES NOT, and the difference is
       geometry rather than taste. The lattice reads at this radius because roughness changes what
       the surface RETURNS, which survives any distance. The bump is 1 cm of relief on a 9 m cell,
       and the nearest part of this ring is 126 m from the plaza — that relief is far below a pixel
       everywhere it is ever seen. Carrying it would cost a derivative pair per fragment across the
       largest single surface in the world to render something that cannot be resolved. So the plaza
       keeps its bump, where a walker stands two metres from the stone, and the field does not. */
  }
  /* R170 D6 — AND THE FIELD CATCHES THE SAME MOON THE DECK DOES. This is the surface that makes the
     path a WORLD feature rather than a plaza feature: it runs from 126 m to 620 m, so the column of
     light crosses the whole middle distance and arrives at the deck instead of starting there.
     Broader and dimmer than the deck's grades because this is the satin end of the floor, and its
     azimuth is the widest of any surface — at this radius a tight path would be a thread. */
  applyCelestialPath(groundMat, { az: 34, el: 7.0, gain: 0.78 });
  /* R170 P0 — AND IT JOINS THE DECK'S OWN GRADE, WHICH IS THE HALF D5 MISSED.
     D5 gave this ring the plaza's colour, metalness and lattice and stopped there. What it did not
     give it was the CRUSH: mahplaza patches every material in ctx.floorMaterials to eleven percent
     of its own value and lifts it back with a grazing sheen, and that patch is the only reason this
     world's ground is black. The deck had it; this ring did not.
     The BUILDING-AWAY diagnostic is what found it, and the failure is worse than "slightly light".
     At metalness 0.96 and envMapIntensity 2.2 with nothing crushing it, a horizontal surface seen at
     a grazing angle returns nearly the whole environment — so from any camera looking OUT across the
     world the entire middle distance rendered as a pale silver sheet, brighter than the mountains
     and brighter than the treeline in front of it. Distance cannot read against that: the trees stop
     being a layer at 300 m and become a black cut-out pasted on a white wall, which is precisely the
     flattening the spaciousness priority exists to remove.
     Pushing it into ctx.floorMaterials is the whole fix — one list, one patch, the same value
     behaviour from the deck to the treeline. This is what D5 should have done. */
  (ctx.floorMaterials = ctx.floorMaterials || []).push(groundMat);
  {
  }
  owned.materials.push(winMat, stripMat, whiteMat, groundMat, spillWarmM, spillCoolM, accentWashM);

  /* static geometry buckets, merged per material at the end */
  /* the platinum frame gets THREE buckets, not three meshes per block: every block's framing merges
     into the same three geometries, so widening the framing across fifteen blocks costs three draw
     calls in total rather than forty-five */
  const B = { structural: [], composite: [], trim: [], strips: [], whites: [], platMid: [], platPier: [], platLit: [], far: [], far0: [], far1: [], far2: [],
    spillWarm: [], spillCool: [], accWash: [], violet: [], blue: [], cyan: [],
    shardClear: [], shaft0: [], shaft1: [], shaft2: [], shaft3: [], ghost: [] };
  const kitBoxes = [], kitMasts = [], decks = [];        /* instanced roof kit / ring deck matrices */
  const stats = { blocks: 0, bridges: 0, towers: 0, giants: 0, windows: 0, windowGrids: 0, pads: 0, paths: 0, drawCalls: 0, triangles: 0,
    lit: 0, warmFaces: 0, coolFaces: 0, emitters: 0, washes: 0, gestures: [],
    shardsFacet: 0, shardsClear: 0, shafts: 0, shaftBelts: 0, ghosts: 0, decks: 0 };
  let elevator = null, pod = null;

  /* ---- v9 §01 THE CITY CONTINUING INTO CRYSTAL --------------------------------------------------
     "Create these glass shard looking elements all across the buildings." The failure mode is easy to
     name: a shard placed on a flat piece of wall is a decoration stuck on, and fifteen blocks wearing
     the same decoration is a texture. So every shard in this file grows out of a BREAK the building
     already has — a slot, a setback shoulder, a terrace edge, a corner arris, or a fracture run across
     an elevation — and the mass it grows from is unchanged behind it.

     THREE ARCHETYPES, and one instanced mesh each, so the 263 faceted shards across fifteen blocks and
     seven megatalls cost three draw calls in total rather than one per building — the same economy the
     platinum frame already buys by merging fifteen blocks' framing into three geometries. A shard per
     block as its own mesh would have been fifteen. Every one of them is BLUNT at the tip, for the same reason the
     megatall spires were blunted in v8 (law 6): a needle aliases into a hairline and catches nothing,
     while a small terminal facet is a real surface that answers the sky. The four-sided forms are the
     square diamond seen in plan, which is the one silhouette the law exempts because it is the brand.

     THE GRADE IS A COST DECISION, made in materials.js and obeyed here. shardFacet has NO transmission
     — it fakes refraction with a low roughness, a clearcoat and a strong environment — and it carries
     the great majority, because displacement is not legible at 150 m anyway. shardClear (real
     transmission) is spent on fourteen pieces, all on the four blocks nearest the camera. shardHero
     appears nowhere in this district: the destinations and the plaza have first call on the grade that
     makes three render an extra scene pass, and a district that spent it would be taking it from them. */
  const shardFacetM = mat('shardFacet', 'crystalGlass'), shardClearM = mat('shardClear', 'shardFacet');
  /* v11 §06: the three archetypes are built from a PLAN and a PROFILE now (see shardPrism above), not
     from one straight-tapered cylinder each. The silhouettes change; the language does not — four and
     six flat sides, one terminal facet, nothing smooth-shaded, nothing subdivided toward a sphere. */
  const cluster = (plan) => mergeGeos([
    shardPrism(plan, PROF.cluster),
    shardPrism(plan, PROF.spur).rotateZ(0.42).translate(0.31, 0.04, 0.05)
  ]);
  const shardGeo = {
    /* THE BLADE — four sides, a haunch at the foot, a crown facet under the table. The workhorse:
       reads as a splinter of the wall's own crystal at any scale, at 28 triangles. */
    blade: own(shardPrism(PLAN4, PROF.blade)),
    /* THE CRYSTAL — six sides, a shallower taper, a broad blunt table. The mass that still reads as a
       volume rather than as a line at 200 m, so it carries the mid-distance work. It takes the haunch
       and NOT the crown facet: at 0.30 of 0.46 its table is already a broad top, and the eight extra
       triangles a crown would cost across 91 instances buy nothing the eye can find at that range. */
    crystal: own(shardPrism(PLAN6, PROF.crystal)),
    /* THE CLUSTER — a blade and a SPUR fused at one haunch. A single shard on a corner reads as an
       object placed there; two growing from one root read as the material breaking, which is the whole
       point — provided their outlines are related. The spur is short and broad enough to rejoin the
       blade's outline tangentially, so the pair's outer envelope is one convex line with a shoulder in
       it. v9's spur was long and thin and CROSSED that outline, which is what made a fork. */
    cluster: own(cluster(PLAN4))
  };
  /* ---- THE NEAR GRADE'S OWN SECTION -------------------------------------------------------------
     The fourteen transmissive shards stand on the four blocks in front of the plaza and are the only
     ones the camera ever gets near, and at that range a bare four-sided splinter shows its arrises: a
     90-ish degree edge running the whole length of a 13 m form is what reads as "spike glued on". They
     take the CHAMFERED square diamond instead — the same figure with a small third face cut along each
     of its four arrises, which is more crystalline and not less. It costs nothing in draw calls
     because these fourteen are MERGED into one mesh rather than instanced, so a second geometry family
     here is free; the instanced three are untouched. */
  const shardNear = { blade: own(shardPrism(PLAN8, PROF.blade)), crystal: shardGeo.crystal, cluster: own(cluster(PLAN8)) };
  const shardI = { blade: [], crystal: [], cluster: [] };
  /* Place one shard. `grade` 'clear' merges a copy into the transmissive mesh (few, near); anything
     else pushes an instance matrix (many, mid-distance). Geometry grows from y = 0 along +Y, so `y` is
     the shard's FOOT — where it leaves the surface — which is the only anchor that stays right when a
     shard is tilted out of a wall. w / h / t are its real metres. */
  const SH = (grade, kind, x, y, z, rx, ry, rz, w, h, t, parent) => {
    if (grade === 'clear') { B.shardClear.push(shardNear[kind].clone().applyMatrix4(poseOf(x, y, z, rx, ry, rz, w, h, t, parent))); stats.shardsClear++; }
    else { shardI[kind].push(poseOf(x, y, z, rx, ry, rz, w, h, t, parent).clone()); stats.shardsFacet++; }
  };

  /* ---------------------------------------------------------------- 1. midground blocks */
  const unitKit = own(chamferBox(1, 1, 1, 0.115));
  const kitBox = (parent, x, y, z, ry, sx, sy, sz) => kitBoxes.push(matrixOf(x, y + sy / 2, z, ry, sx, sy, sz, parent).clone());
  const kitMast = (parent, x, y, z, r, h) => kitMasts.push(matrixOf(x, y + h / 2, z, 0, r * 2, h, r * 2, parent).clone());
  const elevGeo = own(chamferBox(1.0, 0.9, 0.35, 0.11));   /* law 6: the car is a rounded lozenge, not a brick sliding up a wall */

  /* ---- v6b GLASS BLOCKS ------------------------------------------------------------------------
     The reference's midground is not dark masses punched with small windows — it is lit curtain wall.
     A third of the district's blocks are GLASS blocks now: instead of a windowGrid of individual
     cells they carry a full-height glazed face with lit floor plates behind it, which is what makes a
     night city read as inhabited rather than as a silhouette with holes in it. The MASS stays dark;
     only the glazing is bright, so the value hierarchy the platinum depends on survives.
     v8: the curtain material is a NEUTRAL DIMMER now rather than a cool tint. It used to hold the
     hue for every glazed block at once, which made a hundred metres of curtain wall one temperature;
     the hue is chosen per face and rides on the grid's instance colours instead. */
  const glassFaceMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true, fog: true });
  glassFaceMat.name = 'city-curtain'; owned.materials.push(glassFaceMat);
  const glazedIds = { L2: 1, R2: 1, R5: 1 };

  /* ONE MODULE PER FACE. The glazing and the platinum frame are now cut from the SAME grid, because a
     pier may only stand in a gap BETWEEN cells and a spandrel course may only sit in a gap between
     rows. Derive the two separately and the frame reads as paint laid over the glass instead of
     structure built around it — the same tell that gives a hairline trim away. Punched-window and
     curtain-wall blocks differ only in this module, so both get the same frame treatment. */
  function winModule(faceW, faceH, glazed, light) {
    if (glazed) {
      const cols = Math.max(3, Math.floor((faceW - 2 * PW) / 4.2)), rows = Math.max(3, Math.floor(faceH / 7));
      return { cols, rows, cellW: (faceW - 2 * PW - 2.2) / cols - 0.5, cellH: (faceH - 5) / rows - 1.1, gapX: 0.5, gapY: 1.1,
        y0: 3.2, depth: 0.14, onFraction: 0.92 * light.on, tint: light.tint, dimTint: light.dim, light, material: glassFaceMat, name: 'city-curtain' };
    }
    /* fewer lit cells and a wider brightness spread: a night city has dark apartments too (brief §08) */
    return { cols: Math.floor((faceW - 2 * PW - 1.6 + WIN.gapX) / (WIN.cellW + WIN.gapX)),
      rows: Math.floor((faceH - 4.6 + WIN.gapY) / (WIN.cellH + WIN.gapY)),
      cellW: WIN.cellW, cellH: WIN.cellH, gapX: WIN.gapX, gapY: WIN.gapY,
      y0: 3.0, depth: 0.1, onFraction: 0.58 * light.on, tint: light.tint, dimTint: light.dim, light, material: winMat, name: 'city-windows' };
  }
  /* ---- v8 §04b THE FACE'S OWN OCCUPANCY ----------------------------------------------------------
     windowGrid hands back a grid tinted from ONE `tint`, with a per-cell brightness spread and a fixed
     30 % drift toward cool white. That drift was right when every room in this city was cool and is
     exactly wrong now: it lerps a DIMMED warm cell toward a FULL-strength blue, so a third of the
     district's rooms came back on the cold side of neutral and the skyline measured 57 % warm when the
     direction says MOST. The grid's colours are therefore rewritten here, once, at build time — no
     runtime cost, no new draw call, and it buys the variation the direction actually asked for: a ROW
     IS A STOREY, and a storey is bright, half empty or dark as a whole before its rooms vary inside
     it. That is what makes a tower read as occupied rather than as a field of independent dots. */
  const _cell = new THREE.Color();
  function relight(grid, mod, seed) {
    const ic = grid.instanceColor; if (!ic) return 0;
    const light = mod.light, R = rng(seed * 733 + 17), a = ic.array;
    let lit = 0;
    for (let r = 0; r < mod.rows; r++) {
      /* the storey: one floor in eight is dark (plant, empty, unlet); the rest run from two thirds to
         full occupancy, at their own level, so neighbouring floors differ before their rooms do */
      const dark = R() < 0.12, occ = dark ? 0.1 : 0.72 + R() * 0.5, level = 0.55 + R() * 0.45;
      for (let c = 0; c < mod.cols; c++) {
        const i = r * mod.cols + c;
        if (R() < mod.onFraction * occ) {
          /* one room. FAINT is the brief's word: the median cell lands near a third of full strength,
             and a handful of rooms on any face are lit by the other temperature — one MAHGIC-lit study
             in a block of homes, one lamp-lit flat in a training block. */
          const k = R();
          _cell.setHex(light.cool ? (k < 0.14 ? WARM.interior : COOL.lit)
            : (k < 0.06 ? COOL.lit : k < 0.24 ? WARM.interiorPale : WARM.interior));
          _cell.multiplyScalar(level * (0.2 + R() * R() * 0.92));
          lit++;
        } else _cell.setHex(light.dim);
        a[i * 3] = _cell.r; a[i * 3 + 1] = _cell.g; a[i * 3 + 2] = _cell.b;
      }
    }
    ic.needsUpdate = true;
    return lit;
  }
  /* R167 §5 — THE NEAR BLOCKS GET APERTURES; THE SKYLINE KEEPS ITS GRID.
     This file already knows which blocks a player can walk up to: `near` is the same test the
     transmissive shard grade uses, and its comment says it outright — the four blocks in front of
     the plaza are the only ones the camera ever gets close to. That is exactly the set where a
     tiled window grid betrays itself, and exactly the set R167 wants reauthored.

     The distant towers keep windowGrid. At 150 m a curtain wall IS a field of small lit cells, the
     grid is the cheapest possible way to draw one, and replacing it would spend triangles on
     something no one can resolve while flattening the skyline's read. R167 says selectively, and
     says do not homogenize the city. So the language changes where it is legible and nowhere else. */
  function glazeApertures(parent, mod, seed, place, f) {
    const W = Math.max(2, f.w), H = Math.max(3, f.h);
    /* proportion picks the family, as it does on the dressed buildings: a tall elevation takes
       slits, a broad one takes a panoramic opening and a ribbon */
    const families = H > W * 1.25 ? ['TAPERED', 'RIBBON'] : ['PANORAMIC', 'TAPERED'];
    const field = apertureField({
      W, H, families, seed: seed * 7 + 3, sillY: Math.min(3.0, H * 0.14), depth: 0.5,
      glassMaterial: mod.material, frameMaterial: M.chromeSatin || M.structural
    });
    if (!field.userData.apertures.placed.length) return 0;
    field.name = 'city-aperture-field';
    place(field, mod.y0 + H / 2);
    parent.add(field);
    stats.apertureFields = (stats.apertureFields || 0) + 1;
    stats.apertures = (stats.apertures || 0) + field.userData.apertures.placed.length;
    return field.userData.apertures.placed.length;
  }

  /* R167 §D — THE WAY IN, at the one scale the player shares.
     Fifteen blocks stood on walkable ground with nothing at eye level: their lowest opening was at
     3.0 m on every one of them, because a window sits above a sill and a sill is above a head. So
     the street read as a row of plinths and there was nowhere the eye could say "in there".

     This is a TIER 1 doorway and it stays tier 1: human-sized, unlit except for a line at the step.
     The hierarchy only means anything if the ordinary case is ordinary — a facility entrance is
     legible from a block away precisely because the fifteen doors around it are not.

     It is placed PROUD OF THE PLINTH, not on the wall behind it. The base course is 0.6 m wider
     than the mass it carries, so the elevation is set 0.3 m back from what a walker actually meets;
     a doorway on the wall plane would have been a shape buried in the plinth up to 1.9 m. Standing
     the surround out past the plinth face is also what a real entrance does to a base course: it
     interrupts it. Everything merges into the block's own buckets, so fifteen doors cost nothing. */
  function doorway(bm, f, kind, headroom, id) {
    const parts = doorwayParts(kind, f.w, f.h, headroom);
    if (!parts.spec.h || parts.spec.h < 2.2) return 0;
    /* stood one reveal-depth in front of the PLINTH face, not the wall behind it. The base course
       is 0.6 m wider than the mass it carries (baseCourse above), so the surface a walker actually
       meets is 0.3 m proud of the elevation; and with no CSG in this renderer the recess is made by
       standing the surround out over that surface rather than by cutting into it. */
    const dm = matrixOf(f.ox, f.yBase, f.oz + 0.3 + parts.spec.reveal, f.ry, 1, 1, 1, bm).clone();
    const put = (list, bucket) => list.forEach(geo => bucket.push(geo.applyMatrix4(dm)));
    put(parts.reveal, B.platPier);      /* a vertical metal surround takes the brushed grade */
    put(parts.leaf, B.composite);       /* the leaf is DARK: the light at a local door is the step */
    put(parts.sill, B.platLit);         /* the step reads by its top face, like every cap in this file */
    put(parts.canopy, B.platLit);
    put(parts.glow, B.strips);
    stats.doorways = (stats.doorways || 0) + 1;
    /* the record carries WHERE and WHICH WAY, not just how big. A district rotates its blocks, so
       nothing outside this file can derive a doorway's world position from the block table without
       reproducing that rotation — and a probe that guesses the position measures the wrong wall.
       The matrix already holds both: column 3 is the origin, column 2 is the outward normal. */
    const e = dm.elements;
    (ctx.doorTiers || (ctx.doorTiers = [])).push({
      tier: parts.spec.tier, kind, w: +parts.spec.w.toFixed(2), h: +parts.spec.h.toFixed(2),
      reveal: parts.spec.reveal, name: 'block-' + id,
      x: +e[12].toFixed(2), y: +e[13].toFixed(2), z: +e[14].toFixed(2),
      nx: +e[8].toFixed(4), nz: +e[10].toFixed(4)
    });
    return 1;
  }

  function glaze(parent, mod, seed, place, f) {
    if (f && f.nearBlock) { const n = glazeApertures(parent, mod, seed, place, f); if (n) return n; }
    if (mod.cols < 2 || mod.rows < 2) return 0;
    const grid = windowGrid({ cols: mod.cols, rows: mod.rows, cellW: mod.cellW, cellH: mod.cellH, gapX: mod.gapX, gapY: mod.gapY,
      depth: mod.depth, onFraction: mod.onFraction, seed, material: mod.material, tint: mod.tint, dimTint: mod.dimTint });
    own(grid.geometry);
    stats.lit += relight(grid, mod, seed);
    place(grid, mod.y0 + grid.userData.windows.totalH / 2);
    grid.name = mod.name; parent.add(grid);
    stats.windows += mod.cols * mod.rows; stats.windowGrids++;
    return mod.cols * mod.rows;
  }

  /* ---- v7 §02 / §03 / §07 THE FRAME ON AN ELEVATION ---------------------------------------------
     A block used to be a navy mass with a hairline of composite on it, so its whole elevation answered
     the environment at one value and the plaza floor out-read the architecture two to one. The frame
     below is what a real building has and this one did not: a base course at the pavement, a PIER on
     every second bay joint running the full height of the glazing, a spandrel COURSE in every second
     row gap, a SILL at the foot of the glass, and a parapet band with its coping. The infill panels
     between them stay dark crystal — that contrast is the point; platinum everywhere would be as flat
     as navy everywhere.
     Orientation decides the grade, not taste. Piers and courses are kept taller than they are deep so
     the face presented to the camera is vertical, and a vertical metal reflects the bright horizon
     band. The sill and the coping are the two pieces whose read is their TOP face, so they take
     platinumMidLit, the low-metalness partner that still answers a black zenith. */
  function frameFace(bm, f, mod) {
    const inner = f.w - 2 * PW - 0.4;
    if (inner < 2.2) return;
    const fm = matrixOf(f.ox, f.yBase, f.oz, f.ry, 1, 1, 1, bm).clone();
    const F = (geo, lx, ly, lz) => xform(geo, lx, ly, lz, 0, 1, 1, 1, fm);
    const pitch = mod.cellH + mod.gapY, totalW = mod.cols * mod.cellW + (mod.cols - 1) * mod.gapX;
    /* the sill answers the same test the glazing does, because a sill with no glass over it is not a
       sill — it is a band left stranded a storey up a blank wall */
    if (mod.cols >= 2 && mod.rows >= 2) B.platLit.push(F(chamferBox(inner, FR.sill, FR.sillD, 0.1), 0, mod.y0 - FR.sill / 2, FR.sillD / 2));
    /* a course marks a FLOOR line, so its pitch follows the module rather than a fixed number: a
       punched-window module already has one row per storey and takes a course every second row, while
       a curtain module's row IS a two-storey floor plate and takes one at each */
    const ch = Math.min(FR.course, mod.gapY - 0.3), step = mod.gapY > 1.6 ? 2 : 1;
    for (let r = 1; r + 1 < mod.rows; r += step)
      B.platMid.push(F(chamferBox(inner, ch, FR.courseD, 0.09), 0, mod.y0 + r * pitch + mod.cellH + mod.gapY / 2, FR.courseD / 2));
    /* the pier is the largest single piece of metal on the elevation, so it carries the brushed grade:
       a directional streak up a 30 m column is the material response the colour is not allowed to be */
    const pw = Math.min(FR.pier, mod.gapX - 0.1), ph = f.top - f.foot;
    if (pw > 0.28 && ph > 6) for (let c = 2; c < mod.cols; c += 2)
      B.platPier.push(F(chamferBox(pw, ph, FR.pierD, 0.09), -totalW / 2 + c * (mod.cellW + mod.gapX) - mod.gapX / 2, f.foot + ph / 2, FR.pierD / 2));
  }
  /* the two pieces of frame that belong to a MASS rather than to one of its faces. Dimensions are the
     band's own outer footprint, so a wing can be framed without its parapet swallowing the slot beside it.
     The base course is a PLINTH: its height follows the mass it carries, because a fixed 1.9 m course
     reads as a plinth on a 60 m tower and as a skirt on a 22 m one. */
  const baseCourse = (P, cx, cz, bw, bd, bh) => {
    B.platMid.push(P(chamferBox(bw, bh, bd, 0.34), cx, bh / 2, cz));
    /* law 1, found in this pass: the plinth is 0.6 m wider than the wall it carries, so it leaves a
       0.3 m LEDGE all the way round — a horizontal face, in a metalness-0.94 grade, reflecting the
       near-black zenith and therefore rendering as a dark line at the pavement. That line is the one
       place the district meets the black platinum floor, which is now a near mirror: it is the edge
       the floor most wants to return. It takes the lit grade, like every other cap in this file. */
    B.platLit.push(P(chamferBox(bw + 0.12, 0.16, bd + 0.12, 0.075), cx, bh + 0.04, cz));
  };
  const parapet = (P, cx, cz, bw, bd, top, band) => {
    B.platMid.push(P(chamferBox(bw, band, bd, 0.34), cx, top - band / 2, cz));
    B.platLit.push(P(chamferBox(bw + 0.3, FR.cope, bd + 0.3, 0.12), cx, top + FR.cope / 2, cz));   /* the coping faces the sky */
  };

  /* ---- v8 §04 THE WORLD ANSWERS THE WINDOWS ------------------------------------------------------
     Every lit face gets three responses, and they are the three surfaces a real window actually
     throws light onto — no more, because a fourth would start washing the whole elevation and the
     falloff would stop being believable:
       the SPANDREL, above and below each row of glass. One quad per storey, so a face with dark
         floors has dark bands too and the spill inherits the grid's own occupancy;
       the SILL at the foot of the glazing, lit from above — the one horizontal catch on the
         elevation, and the reason the platinumMidLit sill reads as a sill rather than as a stranded
         band (law 1 keeps that piece low-metalness; this is what gives it something to answer);
       the SOFFIT of each spandrel course, lit from below by the row under it.
     The spandrel band sits 0.022 m off the wall — BEHIND the window boxes (front faces at ≈ 0.11) and
     behind the frame (0.32–0.34) — so both occlude it and what survives is a halo in the gaps around
     the glass, which is what light leaving a window actually looks like and costs nothing to get. The
     other two sit on the members themselves, at half the sill's and the course's own projection, so
     each lands on the horizontal face it belongs to rather than floating in front of it. */
  function spillFace(bm, f, mod, light) {
    if (mod.cols < 2 || mod.rows < 2) return 0;
    const bucket = light.cool ? B.spillCool : B.spillWarm;
    const fm = matrixOf(f.ox, f.yBase, f.oz, f.ry, 1, 1, 1, bm).clone();
    const F = (geo, lx, ly, lz) => xform(geo, lx, ly, lz, 0, 1, 1, 1, fm);
    const pitch = mod.cellH + mod.gapY, ribbon = mod.cols * mod.cellW + (mod.cols - 1) * mod.gapX + mod.gapX;
    let n = 0;
    for (let r = 0; r < mod.rows; r++) {
      bucket.push(F(hwash(ribbon, mod.cellH + mod.gapY * 1.6), 0, mod.y0 + r * pitch + mod.cellH / 2, 0.022)); n++;
    }
    const inner = f.w - 2 * PW - 0.4;
    if (inner > 2.2) {
      bucket.push(F(sillWash(inner - 0.2, FR.sillD * 0.92), 0, mod.y0 + 0.014, FR.sillD / 2)); n++;
      const ch = Math.min(FR.course, mod.gapY - 0.3), step = mod.gapY > 1.6 ? 2 : 1;
      for (let r = 1; r + 1 < mod.rows; r += step) {
        const cy = mod.y0 + r * pitch + mod.cellH + mod.gapY / 2;
        bucket.push(F(soffitWash(inner - 0.2, FR.courseD * 0.9), 0, cy - ch / 2 - 0.014, FR.courseD / 2)); n++;
      }
    }
    stats.washes += n;
    return n;
  }

  /* ---- v8 §05 A DISTRICT GESTURE, AND WHAT ANSWERS IT ---------------------------------------------
     Three shapes, one per named block (see GESTURE). Each is built the same way and for the same
     reason: an EMITTER, the dark REVEAL it stands in — which is what gives it depth and stops it
     reading as paint on a wall — and WASHES in the emitter's own hue on the surfaces around it. The
     washes are the part that makes this a light. Falloff is set by the quad: a band 2.6 m tall gets
     a wash 9 m tall, so it is bright at the source and gone about three metres away. */
  function accentGesture(bm, spec, faces, top) {
    const kind = GESTURE[spec.id];
    if (!kind || !faces.length) return;
    const hue = ACCENT_DISTRICT[spec.id.charAt(0)] || 'blue', A = B[hue], col = ACCENT[hue];
    const f = faces[0];
    const fm = matrixOf(f.ox, f.yBase, f.oz, f.ry, 1, 1, 1, bm).clone();
    const F = (geo, lx, ly, lz) => xform(geo, lx, ly, lz, 0, 1, 1, 1, fm);
    const wash = (geo, lx, ly, lz) => { B.accWash.push(paint(F(geo, lx, ly, lz), col)); stats.washes++; };
    /* THE DEPTHS ARE THE ARGUMENT. The frame stands 0.32–0.34 m proud of the wall, so a wash laid on
       the wall itself would be HIDDEN behind every pier and course it crosses and the frame would read
       as dark bars ruled across a glow. The broad wash therefore sits at 0.40 — in front of the
       platinum — and what it lights is the frame, which is the correct answer and the better picture.
       The reveal (front face at 0.44) still masks its own middle, so the light reads as coming out
       from behind the sign rather than being painted over it. */
    if (kind === 'band') {
      /* A SIGNAGE BAND: one large horizontal gesture across the primary elevation, sized to be read
         from the arrival camera at 150 m. A band you have to squint at is confetti with extra steps. */
      const bw = Math.min(f.w * 0.66, 15), bh = 2.6, by = f.foot + (f.top - f.foot) * 0.64;
      B.structural.push(F(chamferBox(bw + 1.3, bh + 1.1, 0.4, 0.17), 0, by, 0.24));         /* the reveal it stands in */
      A.push(F(chamferBox(bw, bh, 0.26, 0.1), 0, by, 0.62));
      wash(hwash(bw + 0.9, bh + 0.75), 0, by, 0.46);                                       /* the recess itself, filled with its own colour */
      wash(hwash(bw + 3.4, bh * 3.5), 0, by, 0.40);                                        /* the wall and its frame, dying within ~3 m */
      /* v9: and the CRYSTAL the band lights. A blade at each end of the band, growing out of the wall
         into the light, with the falloff wash carried across it — the third surface this emitter
         answers on, and the only one with facets, so the hue breaks instead of sitting flat. */
      for (const sx of [-1, 1]) {
        SH('facet', 'blade', sx * (bw / 2 + 1.5), by - 1.6, 0.50, -0.30, sx * 0.55, sx * 0.34, 2.2, 8.0, 1.8, fm);
        wash(vwash(4.2, 8.5), sx * (bw / 2 + 1.6), by + 1.8, 0.42);
      }
      stats.emitters++; stats.gestures.push(spec.id + ':band:' + hue);
    } else if (kind === 'crown') {
      /* A CROWN: the top of the mass lit in one hue on the three faces the district is seen from, so
         a block ENDS in a colour instead of in another dark parapet. It is bolted to the parapet band
         and stands 0.46 m proud of the mass, which clears the widest parapet any massing builds — and
         from there it lights three real things: the band under it, the coping overhanging it, and the
         elevation below, which is the note "a crown light must catch the parapet below it". */
      const cy = top.y - top.band * 0.5, sides = [
        [top.w, 0, 1, top.d / 2, 0], [top.d, -1, 0, top.w / 2, -Math.PI / 2], [top.d, 1, 0, top.w / 2, Math.PI / 2]
      ];
      sides.forEach(([len, nx, nz, hb, ry]) => {
        const bar = Math.max(2.0, len - 1.6);
        const at = (geo, t, ly) => xform(geo, top.x + nx * (hb + t), ly, top.z + nz * (hb + t), ry, 1, 1, 1, bm);
        B[hue].push(at(chamferBox(bar, 0.5, 0.22, 0.095), 0.46, cy));
        B.accWash.push(paint(at(hwash(bar + 0.6, top.band * 1.6), 0.36, cy), col));                     /* the parapet band it is bolted to */
        B.accWash.push(paint(at(soffitWash(bar + 0.6, 0.26), 0.40, top.y - 0.012), col));               /* the coping's overhang, lit from under */
        B.accWash.push(paint(at(hwash(bar + 1.4, 7.5), 0.13, top.y - top.band - 3.4), col));            /* the elevation below, falling off over ~4 m */
        stats.emitters++; stats.washes += 3;
      });
      /* v9: three shards standing on the parapet INSIDE the ring of crown bars, so the block does not
         merely end in a colour — it ends in crystal lit from three sides at once. This is the one
         place in the district where an emitter surrounds what it lights rather than facing it. */
      for (let q = 0; q < 3; q++)
        SH('facet', q === 1 ? 'crystal' : 'blade', top.x + (q - 1) * top.w * 0.26, top.y - 0.3, top.z + (q - 1) * top.d * 0.12,
          (q - 1) * 0.16, q * 0.7, (q - 1) * 0.22, 2.6 + q * 0.5, 6.5 + q * 3.0, 2.4, bm);
      stats.gestures.push(spec.id + ':crown:' + hue);
    } else {
      /* A FULL-HEIGHT SEAM: one vertical line of colour from the plinth to the parapet, set off
         centre so it DIVIDES the elevation instead of splitting it in half. Its two jambs are washed
         with the horizontal-falloff map, so the light dies about a metre either side of the cut. */
      const y0 = f.foot + 0.5, y1 = f.top - 0.4, sh = y1 - y0, sx = f.w * 0.21;
      if (sh < 6) return;
      B.structural.push(F(chamferBox(1.5, sh + 0.9, 0.4, 0.17), sx, y0 + sh / 2, 0.24));
      A.push(F(chamferBox(0.44, sh, 0.26, 0.1), sx, y0 + sh / 2, 0.62));
      wash(vwash(5.2, sh), sx, y0 + sh / 2, 0.40);                                         /* both jambs at once; the reveal masks the middle */
      wash(sillWash(2.8, 1.1), sx, y0 - 0.42, 0.52);                                       /* the plinth the seam stands on */
      wash(soffitWash(2.8, 0.9), sx, y1 + 0.52, 0.48);                                     /* and the parapet soffit it stops under */
      /* v9: two clusters growing out of the cut, one either side and at two heights, so the seam is a
         fracture the wall has opened rather than a strip applied to it */
      for (let q = 0; q < 2; q++)
        SH('facet', 'cluster', sx + (q ? 1.7 : -1.6), y0 + sh * (0.28 + q * 0.44), 0.48, -0.34, q ? 0.6 : -0.6, q ? 0.30 : -0.30, 2.4, 7.0 + q * 2.5, 2.0, fm);
      stats.emitters++; stats.gestures.push(spec.id + ':seam:' + hue);
    }
  }

  BLOCKS.forEach((spec, i) => {
    const R = rng(SEED + i * 131);
    const { x, z, w, d, h } = spec;
    const rot = spec.rot != null ? spec.rot : 0.55 * Math.atan2(-x, -z) + (R() - 0.5) * 0.12;
    const massing = MASSING_OF(spec.id), glazed = !!glazedIds[spec.id];
    const g = new THREE.Group(); g.name = 'city-block-' + spec.id; g.position.set(x, 0, z); g.rotation.y = rot; g.updateMatrix(); group.add(g);
    const bm = g.matrix;
    const P = (geo, lx, ly, lz, lry = 0, sx = 1, sy = 1, sz = 1) => xform(geo, lx, ly, lz, lry, sx, sy, sz, bm);
    /* every massing answers the same four questions, so the frame, the glazing, the roof kit, the pad
       and the elevator below are written once and never per family:
         faces  the elevations that get the platinum frame (and glazing where the block shows one)
         roof   the deck the parapet rails ring — a terrace on a podium, the low wing on a slot
         top    the highest roof: plant, mast and beacon
         pad    where the life module may land */
    const faces = [], baseH = Math.max(1.1, Math.min(FR.base, h * 0.055));
    /* the four blocks in front of the plaza are the only shards the camera ever gets near, so they are
       the only ones that spend the transmissive grade — refraction is invisible at 150 m and expensive
       at any distance. `crn*` is the mass whose vertical corner the emergence grows out of, which is a
       different mass per massing: the podium's own corner is at eye level, the slotted block's wing is
       not, and a corner shard on the wrong one would hang off nothing. */
    const near = spec.z > -60, grade = near ? 'clear' : 'facet';
    let crnHW = w / 2, crnHD = d / 2, crnY0 = baseH, crnY1 = h;
    let roofY = h, roofW = w, roofD = d, roofX = 0, roofZ = 0;
    let topY = h, topW = w, topD = d, topX = 0, topZ = 0, topBand = FR.band;   /* topBand: the parapet a crown light mounts on */
    let padY = h, padX = 0, padZ = 0;

    if (massing === 'slotted') {
      /* SLOTTED: one slab cut front-to-back by an OFF-CENTRE slot. The wide wing carries the glazing,
         the narrow blade runs past it to full height, and the link between them stops two thirds up —
         so this block ends in a notch and a shoulder where a stepped block ends in a crown. The slot
         is only a slot if its edges are metal; a deep reveal with dark returns is just a black gap. */
      const slotW = Math.max(2.4, w * 0.13), rem = w - slotW, wA = rem * 0.62, wB = rem * 0.38;
      const xA = -w / 2 + wA / 2, xB = w / 2 - wB / 2, xS = -w / 2 + wA + slotW / 2;
      const hA = Math.round(h * 0.84), hB = h, hL = Math.round(h * 0.6), slotD = Math.min(6.5, d * 0.34);
      /* a wing is narrower than a whole block, so its edge piers are narrower too — a full-width
         pilaster on a 10 m wing would put a fifth of the elevation into metal on width alone */
      const wp = Math.min(PW, Math.max(0.9, wA * 0.1));
      B.structural.push(P(chamferBox(wA, hA, d, 0.9), xA, hA / 2, 0));
      B.structural.push(P(chamferBox(wB, hB, d, 0.75), xB, hB / 2, 0));
      B.structural.push(P(chamferBox(slotW + 0.8, hL, d - slotD, 0.55), xS, hL / 2, -slotD / 2));
      for (const sz of [-1, 1]) {
        B.platMid.push(P(chamferBox(wp, hA + 0.2, wp, wp * 0.21), -w / 2 + wp / 2 - 0.42, (hA + 0.2) / 2, sz * (d / 2 - wp / 2 + 0.42)));
        B.platMid.push(P(chamferBox(wp, hB + 0.2, wp, wp * 0.21), w / 2 - wp / 2 + 0.42, (hB + 0.2) / 2, sz * (d / 2 - wp / 2 + 0.42)));
      }
      B.platMid.push(P(chamferBox(wp * 0.85, hA + 0.2, wp * 0.85, wp * 0.18), xS - slotW / 2 - wp * 0.42, (hA + 0.2) / 2, d / 2 - wp * 0.42 + 0.3));
      B.platMid.push(P(chamferBox(wp * 0.85, hB + 0.2, wp * 0.85, wp * 0.18), xS + slotW / 2 + wp * 0.42, (hB + 0.2) / 2, d / 2 - wp * 0.42 + 0.3));
      baseCourse(P, 0, 0, w + 0.6, d + 0.6, baseH);
      parapet(P, xA, 0, wA + 0.3, d + 0.7, hA, FR.band);
      parapet(P, xB, 0, wB + 0.3, d + 0.7, hB, 1.0);
      faces.push({ ox: xA, yBase: 0, oz: d / 2, ry: 0, w: wA, h: hA, top: hA - FR.band, foot: baseH, seed: 100 + i, glaze: true });
      faces.push({ ox: xB, yBase: 0, oz: d / 2, ry: 0, w: wB, h: hB, top: hB - 1.0, foot: baseH, seed: 400 + i, glaze: true });   /* the blade takes glass only where it is wide enough to hold a module */
      if (spec.side) { const sh = spec.side > 0 ? hB : hA; faces.push({ ox: spec.side * (w / 2), yBase: 0, oz: 0, ry: spec.side * Math.PI / 2, w: d, h: sh, top: sh - 1.0, foot: baseH, seed: 200 + i, glaze: true }); }
      /* GLAZING THE SLOT (v9 §01). The slot was a dark cut through the mass. It is filled now with a
         stack of crystal panes, each rolled the opposite way from the one under it and each tapering
         upward, so the cut reads as the building's material turning to glass rather than as a hole.
         They sit at 0.44 of the slot's depth: behind the metal reveals that edge the slot, so the
         reveals still read as the slot's edges and the crystal reads as being INSIDE it. */
      const panes = Math.max(3, Math.round(hL / 11)), paneH = (hL - baseH - 1.4) / panes;
      for (let k = 0; k < panes; k++)
        SH('facet', k % 2 ? 'crystal' : 'blade', xS, baseH + 0.7 + k * paneH, d / 2 - slotD * 0.44,
          0.05, k % 2 ? 0.22 : -0.18, (k % 2 ? 1 : -1) * 0.09, slotW * 0.92, paneH * 1.22, slotD * 0.66, bm);
      /* and where the slot opens out above the link, three blades growing UP from it and leaning
         toward the taller blade: the seam between two wings is the one place on this mass with room */
      for (let k = 0; k < 3; k++)
        SH(near ? 'clear' : 'facet', 'blade', xS + (k - 1) * slotW * 0.34, hL - 0.6, d / 2 - slotD * (0.5 + k * 0.1),
          -0.16 - k * 0.05, k * 0.4, (k - 1) * 0.26, slotW * (0.64 - k * 0.09), 8 + k * 3.4, slotD * 0.5, bm);
      crnHW = w / 2; crnHD = d / 2; crnY1 = hA;
      roofY = hA; roofW = wA; roofX = xA;
      topY = hB; topW = wB; topX = xB; topBand = 1.0;
      padY = hA; padX = xA;
    } else if (massing === 'podium') {
      /* PODIUM + SHAFT: a wide low base with a terrace on it and a slender tower set back above. The
         terrace deck is the reason this massing exists in a platinum brief — it is a large HORIZONTAL
         plane at eye level, which is precisely the surface a high-metalness grade turns black on. It
         takes platinumMidLit and reads as the brightest thing on the block. */
      const ph = Math.max(6.5, Math.round(h * 0.26)), pw = w + 6, pd = d + 5;
      const sw = w * 0.72, sd = d * 0.74, sh = h - ph, sz0 = -d * 0.06;
      B.structural.push(P(chamferBox(pw, ph, pd, 1.15), 0, ph / 2, 0));
      B.structural.push(P(chamferBox(sw, sh, sd, 0.9), 0, ph + sh / 2, sz0));
      baseCourse(P, 0, 0, pw + 0.6, pd + 0.6, baseH);
      B.platMid.push(P(chamferBox(pw + 0.5, 0.9, pd + 0.5, 0.3), 0, ph - 0.45, 0));           /* the podium fascia */
      B.platLit.push(P(chamferBox(pw + 1.1, 0.3, pd + 1.1, 0.14), 0, ph + 0.15, 0));            /* THE TERRACE DECK */
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.platMid.push(P(chamferBox(PW * 0.9, sh + 0.2, PW * 0.9, 0.27), sx * (sw / 2 - PW * 0.45 + 0.34), ph + (sh + 0.2) / 2, sz0 + sz * (sd / 2 - PW * 0.45 + 0.34)));
      parapet(P, 0, sz0, sw + 0.6, sd + 0.6, h, 1.0);
      /* a face that starts on a deck has no plinth under it, so its piers run from just above the deck */
      faces.push({ ox: 0, yBase: ph, oz: sz0 + sd / 2, ry: 0, w: sw, h: sh, top: sh - 1.0, foot: 0.3, seed: 100 + i, glaze: true });
      if (spec.side) faces.push({ ox: spec.side * (sw / 2), yBase: ph, oz: sz0, ry: spec.side * Math.PI / 2, w: sd, h: sh, top: sh - 1.0, foot: 0.3, seed: 200 + i, glaze: true });
      /* the podium's own elevation is the widest wall this district puts at eye level — it gets the
         frame and the glass too, or the shaft above it stands on a blank plinth */
      faces.push({ ox: 0, yBase: 0, oz: pd / 2, ry: 0, w: pw, h: ph, top: ph - 0.9, foot: baseH, seed: 400 + i, glaze: true });
      /* SPANNING THE SETBACK (v9 §01). The terrace is the one surface in this district a person could
         stand on beside the crystal, so its shards are the largest and the most upright — a fan of four
         leaning against the shaft's base, growing off the deck the podium already gives them, tallest
         at the centre. This is the shape a setback wants: the step is not a smaller box on a bigger
         one any more, it is a place where the mass split and something grew in the gap. */
      for (let k = 0; k < 4; k++) {
        const u = (k - 1.5) / 1.5;
        SH('facet', k === 1 || k === 2 ? 'crystal' : 'blade', u * (sw / 2 + 1.4), ph + 0.30, sz0 + sd / 2 + 1.5 + Math.abs(u) * 0.9,
          -0.22, u * 0.5, -u * 0.34, 2.6 + (1 - Math.abs(u)) * 1.7, 9 + (1 - Math.abs(u)) * 7.5, 2.2, bm);
      }
      /* and a low cluster at each front corner of the podium itself, where the mass meets the pavement */
      for (const sx of [-1, 1]) SH('facet', 'cluster', sx * (pw / 2 - 2.2), baseH, pd / 2 - 2.0, -0.34, sx * 0.8, sx * 0.26, 3.0, 6.5, 2.6, bm);
      crnHW = pw / 2; crnHD = pd / 2; crnY1 = ph;
      roofY = ph + 0.3; roofW = pw; roofD = pd;
      topY = h; topW = sw; topD = sd; topZ = sz0; topBand = 1.0;
      padY = ph + 0.3; padZ = Math.min(sz0 + sd / 2 + 3.1, pd / 2 - 3.0);
    } else {
      /* STEPPED: the v6 form, kept — a core mass with one setback shaft above it. What changed is the
         frame it wears: the four corner pilasters are platinum now instead of composite, and the base
         course, the piers and the courses put a structural grid on the elevation the mass used to lack. */
      const coreH = spec.sb ? Math.round(h * (1 - spec.sb)) : h;
      B.structural.push(P(chamferBox(w, coreH, d, 0.95), 0, coreH / 2, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.platMid.push(P(chamferBox(PW, coreH + 0.2, PW, 0.3), sx * (w / 2 - PW / 2 + 0.42), (coreH + 0.2) / 2, sz * (d / 2 - PW / 2 + 0.42)));
      baseCourse(P, 0, 0, w + 0.6, d + 0.6, baseH);
      parapet(P, 0, 0, w + 0.7, d + 0.7, coreH, FR.band);
      faces.push({ ox: 0, yBase: 0, oz: d / 2, ry: 0, w, h: coreH, top: coreH - FR.band, foot: baseH, seed: 100 + i, glaze: true });
      if (spec.side) faces.push({ ox: spec.side * (w / 2), yBase: 0, oz: 0, ry: spec.side * Math.PI / 2, w: d, h: coreH, top: coreH - FR.band, foot: baseH, seed: 200 + i, glaze: true });
      crnY1 = coreH;
      roofY = coreH; topY = coreH;
      padY = spec.sb ? coreH : h;
      if (!spec.sb) {
        /* a flat-topped block still has to end in crystal or its roof line is the only one in the
           district that does not: one cluster on the parapet, leaning out over its own coping */
        SH('facet', 'cluster', w * 0.30, coreH - 0.4, d * 0.28, -0.26, 0.7, 0.20, 3.6, 10, 3.0, bm);
      }
      if (spec.sb) {
        const sw = w * 0.6, sd = d * 0.58, sh = h - coreH, sz0 = -d * 0.14, sx0 = (R() - 0.5) * (w - sw) * 0.5;
        B.structural.push(P(chamferBox(sw, sh, sd, 0.85), sx0, coreH + sh / 2, sz0));
        parapet(P, sx0, sz0, sw + 0.5, sd + 0.5, h, 0.9);
        for (const sx of [-1, 1]) B.platMid.push(P(chamferBox(PW * 0.8, sh + 0.2, PW * 0.8, 0.24), sx0 + sx * (sw / 2 - PW * 0.4 + 0.3), coreH + (sh + 0.2) / 2, sz0 + sd / 2 - PW * 0.4 + 0.3));
        faces.push({ ox: sx0, yBase: coreH, oz: sz0 + sd / 2, ry: 0, w: sw, h: sh, top: sh - 0.9, foot: 0.3, seed: 300 + i, glaze: true });
        /* THE SETBACK OUTCROP (v9 §01). Where the shaft steps back off the core there is a shoulder,
           and a shoulder is the one horizontal surface on this massing with a vertical wall behind it —
           which is exactly the condition a crystal grows in. Five shards of falling size lean AWAY from
           the shaft, so the step reads as a fracture the mass opened rather than as a stacking of two
           boxes. Every one of them stays inside the core's own footprint, so nothing overhangs air. */
        const out = [[-1, 0.55, 1.0], [1, 0.72, 0.88], [-0.62, -0.40, 0.72], [0.86, -0.18, 0.60], [0.20, 0.92, 0.48]];
        out.forEach(([ux, uz, k2], q) => {
          const px = sx0 + ux * (sw / 2 + 1.1 + q * 0.3), pz = sz0 + uz * (sd / 2 + 1.0);
          SH('facet', q % 2 ? 'cluster' : 'blade', px, coreH - 0.5, pz, -0.30 * uz, Math.atan2(ux, uz), 0.30 * ux,
            3.2 * k2, 4 + (7 + q * 2.4) * k2, 2.6 * k2, bm);
        });
        topY = h; topW = sw; topD = sd; topX = sx0; topZ = sz0; topBand = 0.9;
        padZ = d / 2 - 3.2;
      }
    }
    /* the frame and the glazing, cut from one module per face; the frame goes on faces the block turns
       to the camera even where there is no glass behind it, so a blank flank is still a framed wall */
    faces.forEach(f => {
      const light = faceLight(f.seed * 17 + i);
      const mod = winModule(f.w, f.h, glazed, light);
      frameFace(bm, f, mod);
      if (f.glaze) {
        glaze(g, mod, f.seed, (grid, cy) => { grid.position.set(f.ox + 0.06 * Math.sin(f.ry), f.yBase + cy, f.oz + 0.06 * Math.cos(f.ry)); grid.rotation.y = f.ry; }, { w: f.w, h: f.h, nearBlock: near });
        spillFace(bm, f, mod, light);        /* law 2: no lit face leaves this loop without the wall answering it */
        if (mod.cols >= 2 && mod.rows >= 2) { if (light.cool) stats.coolFaces++; else stats.warmFaces++; }
      }
    });
    /* R167 §D — ONE WAY IN PER BLOCK, on its widest ground-level front.
       The gate that picked "every face at yBase 0 facing forward" looked right and was wrong: the
       SLOTTED massing pushes two such faces, the broad wing and the slender blade, so five of the
       fifteen blocks would have come back with two front doors each — a street where half the
       buildings have two fronts. Choosing the single widest ground-level front instead is both the
       correct count and the correct architecture: the door goes on the principal elevation, which
       on a slotted block is the wing and not the blade.
       mod.y0 is where the glazing starts on that face, and that is exactly the headroom the door's
       surround has to fit under, so it is measured here rather than assumed. */
    const fronts = faces.filter(f => f.glaze && f.yBase === 0 && f.ry === 0);
    if (fronts.length) {
      const front = fronts.reduce((a, b) => (b.w > a.w ? b : a));
      doorway(bm, front, 'LOCAL', winModule(front.w, front.h, glazed, faceLight(front.seed * 17 + i)).y0 - 0.15, spec.id);
    }
    /* ---- v9 §02 THE CORNER EMERGENCE AND THE FRACTURE RUN ------------------------------------------
       Two more ways the crystal reads as the building's own material and not as applied trim.
       THE CORNER: a cluster grows out of the vertical arris where two elevations meet, at 45° in plan
       and leaning out and up, so the turn of the mass BREAKS instead of ending in another pilaster. The
       two corners are set at different heights on purpose — matched pairs read as brackets.
       THE RUN: four flakes climbing one diagonal across a primary elevation. Scattered, the same four
       read as four objects stuck on a wall; on a line they read as a fracture propagating through it,
       and the flake sizes swell and fall along the run for the same reason. Each is tilted a few
       degrees out of the wall, so no two take the same slice of the horizon. */
    for (const sx of [-1, 1]) {
      const cy = crnY0 + (crnY1 - crnY0) * (sx > 0 ? 0.42 : 0.66);
      SH(grade, 'cluster', sx * (crnHW - 0.7), cy, crnHD - 0.7, -0.42, sx * Math.PI / 4, sx * 0.30, 3.4, 11 + sx * 2.6, 3.0, bm);
    }
    faces.forEach((f, fi) => {
      if (!f.glaze || f.w < 9 || f.top - f.foot < 10) return;
      const fm = matrixOf(f.ox, f.yBase, f.oz, f.ry, 1, 1, 1, bm).clone(), Rs = rng(SEED + i * 61 + fi * 7);
      const x0 = (Rs() - 0.5) * (f.w - 7), dirn = Rs() < 0.5 ? -1 : 1, span = f.top - f.foot - 5;
      for (let k = 0; k < 4; k++) {
        const u = k / 3, swell = 0.55 + Math.sin(u * Math.PI) * 0.75;
        SH('facet', k % 2 ? 'blade' : 'crystal', x0 + dirn * u * f.w * 0.30, f.foot + 2 + u * span * 0.82, 0.30,
          -0.13 - Rs() * 0.09, (Rs() - 0.5) * 0.6, dirn * (0.5 + u * 0.5), 1.5 * swell, 4.4 * swell, 0.8 + Rs() * 0.6, fm);
      }
    });
    accentGesture(bm, spec, faces, { x: topX, z: topZ, w: topW, d: topD, y: topY, band: topBand });
    /* ---- v9 §12 THE RING DECK (the Jetsons gesture) ------------------------------------------------
       The reference is optimistic mid-century futurism, not grimdark cyberpunk: sweeping curves, disc
       and ring forms, slender supports, floating decks. So five blocks carry a saucer terrace on one
       slim stalk over the roof — the district's only round form at building scale, and the shape that
       tells the eye this future was drawn in 1962. Law 1 decides its material without a choice being
       available: a deck is a HORIZONTAL plane, a metalness-0.94 grade there would reflect the near-black
       zenith and render as a black disc, so it takes the low-metalness platinumMidLit like every other
       cap in this file — which also makes it the brightest thing on the block, which is the point. */
    if (DECK[spec.id]) {
      /* set forward of the roof's centre so the saucer CANTILEVERS over the parapet — a deck that sits
         concentrically on its own roof is a water tank, and the overhang is also what keeps the stalk
         clear of the roof plant the kit scatters across the back half */
      const stalkH = 7 + R() * 4, dr = 5.2 + R() * 2.4, dz = topZ + topD * 0.26, dy = topY + stalkH;
      /* ---- v11 §06 THE SAUCER GETS A SUPPORT THE EYE CAN FIND -------------------------------------
         The defect this replaces: v9 carried each ring deck on ONE 1.0 m box. At the arrival camera
         (roughly 150–200 m out) a 1 m stalk against a dark parapet is a couple of pixels, so five
         saucers read as flat grey discs hovering free over the district — a flying saucer, which is
         the one mid-century reference this world is not making. A deck is architecture; architecture
         arrives at the ground.
         Three pieces, and the middle one is the only one that was there before:
           THE HAUNCH  a splayed four-sided base standing on the roof at the parapet line, up to 4.7 m
                       across — twenty times the stalk's silhouette area, so it survives the range.
                       Scaled off the top roof's own width, because the slotted massing's blade top is
                       only 6.6 m wide and a fixed haunch would swallow it.
           THE PIER    the stalk, now tapering out of the haunch instead of standing on nothing.
           THE COLLAR  an eight-sided capital flaring from the pier into the deck's own underbelly, so
                       the disc GROWS OUT of the support rather than balancing on a pin.
         LAW 1: all three are built OPEN-ENDED, so between them they add not one horizontal face. The
         pier is the vertical structural member and takes platinumMid, like every other pier in this
         file — 0.94 metalness on a vertical face reflects the lit horizon and reads bright against the
         mass. The haunch and the collar both present surfaces well off vertical, so both take
         platinumMidLit, the low-metalness partner, exactly like the coping and the deck they sit
         between; that also makes the connection the brightest thing at the parapet, which is the
         point. Turned a quarter of a face so the four-sided pieces show FLATS to the elevations rather
         than an arris, which is what makes them read as piers and not as diamonds. */
      const hb = Math.min(2.35, topW * 0.30), hp = hb * 0.60, hq = hb * 0.26;
      const yH1 = topY + 1.6, yP1 = dy - 1.45, S2 = Math.SQRT2;
      B.platLit.push(xform(faceted(new THREE.CylinderGeometry(hp * S2, hb * S2, yH1 - topY, 4, 1, true)), topX, (topY + yH1) / 2, dz, Math.PI / 4, 1, 1, 1, bm));
      B.platMid.push(xform(faceted(new THREE.CylinderGeometry(hq * S2, hp * S2, yP1 - yH1 + 0.14, 4, 1, true)), topX, (yH1 - 0.14 + yP1) / 2, dz, Math.PI / 4, 1, 1, 1, bm));
      B.platLit.push(xform(faceted(new THREE.CylinderGeometry(dr * 0.335, hq * S2 * 1.02, 0.75, 8, 1, true)), topX, dy - 1.19, dz, 0, 1, 1, 1, bm));
      decks.push(poseOf(topX, dy, dz, 0, R() * Math.PI, 0, dr, 2.4, dr, bm).clone());
      stats.decks++;
    }
    /* parapet rails on the block's own deck (front and both sides) */
    kitBox(bm, roofX, roofY, roofZ + roofD / 2 - 0.12, 0, roofW - 0.6, 0.9, 0.12);
    kitBox(bm, roofX - (roofW / 2 - 0.12), roofY, roofZ, 0, 0.12, 0.9, roofD - 0.6);
    kitBox(bm, roofX + (roofW / 2 - 0.12), roofY, roofZ, 0, 0.12, 0.9, roofD - 0.6);
    /* roof plant on the top roof (kept to the back half where a pad shares the roof — or where a ring
       deck's haunch now stands in the front half, which is a bigger footprint than the v9 stalk was
       and would otherwise have plant growing through it), one mast on most */
    const shared = (spec.pad && padY > topY - 1) || !!DECK[spec.id];
    const n = 2 + Math.floor(R() * 2);
    for (let k = 0; k < n; k++) {
      const bw = 2 + R() * 2.5, bh = 1.2 + R() * 1.8, bd = 2 + R() * 1.5;
      const bx = topX + (R() - 0.5) * Math.max(0, topW - bw - 2.4);
      const bz = shared ? topZ - topD / 4 - R() * Math.max(0, topD / 4 - bd / 2 - 0.6) : topZ + (R() - 0.5) * Math.max(0, topD - bd - 2.4);
      kitBox(bm, bx, topY, bz, 0, bw, bh, bd);
    }
    if (R() < 0.7) {
      const mh = 5 + R() * 6, mx = topX + (R() < 0.5 ? -1 : 1) * (topW / 2 - 1.5), mz = topZ - topD / 2 + 1.5;
      kitMast(bm, mx, topY, mz, 0.22, mh);
      if (i % 3 === 0) B.whites.push(P(new THREE.OctahedronGeometry(0.42, 0).scale(1, 1.35, 1), mx, topY + mh + 0.25, mz));   /* the mast beacon is a square diamond — law 6's one exception, and the brand's own figure */
    }
    /* rooftop pad for the life module: a low platform with a square-diamond outline in energy */
    if (spec.pad) {
      B.composite.push(P(chamferBox(5.5, 0.3, 5.5, 0.14), padX, padY + 0.15, padZ));
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, hs = 1.9; B.strips.push(P(chamferBox(2.7, 0.06, 0.28, 0.028), padX + Math.cos(a) * hs, padY + 0.33, padZ + Math.sin(a) * hs, Math.atan2(-Math.cos(a), -Math.sin(a)))); }
      const position = new THREE.Vector3(padX, padY + 0.3, padZ).applyMatrix4(bm);
      anchors.pads.push({ id: 'city-pad-' + spec.id, position, facing: Math.atan2(-position.x, -position.z), kind: spec.pad, tier: 'far' });
      stats.pads++;
    }
    /* the elevator: a slim track on the front face and one cool-white car that changes floor every few seconds */
    if (spec.elevator) {
      const f0 = faces[0], ex = f0.ox - f0.w / 2 + PW + 1.6, th = f0.h - 3, base = f0.yBase + 3.2;
      B.composite.push(P(chamferBox(0.7, th, 0.3, 0.09), ex, f0.yBase + th / 2 + 1.5, f0.oz + 0.22));
      const car = new THREE.Mesh(elevGeo, whiteMat); car.name = 'city-elevator'; car.position.set(ex, base, f0.oz + 0.4); g.add(car);
      elevator = { mesh: car, floors: Math.max(2, Math.floor((f0.h - 6.5) / FLOOR)), base, floor: 0, dir: 1, from: base, to: base, t0: 0, t1: 0, next: -1, R: rng(SEED + 9001) };
    }
    stats.blocks++;
  });

  /* ---------------------------------------------------------------- bridges and the walkway */
  function span(spec, main) {
    const dx = spec.bx - spec.ax, dz = spec.bz - spec.az, L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx), W = spec.width;
    const bm = new THREE.Matrix4().compose(new THREE.Vector3((spec.ax + spec.bx) / 2, spec.y, (spec.az + spec.bz) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    const P = (geo, lx, ly, lz, lry = 0) => xform(geo, lx, ly, lz, lry, 1, 1, 1, bm);
    B.structural.push(P(chamferBox(L, 0.5, W, 0.16), 0, 0.05, 0));                    /* deck: top at y + 0.3 */
    B.structural.push(P(chamferBox(L, 1.5, W * 0.6, 0.34), 0, -0.95, 0));            /* girder under the deck */
    for (const s of [-1, 1]) {
      B.trim.push(P(chamferBox(L, 1.05, 0.1, 0.045), 0, 0.82, s * (W / 2 - 0.08)));   /* handrails */
      B.strips.push(P(chamferBox(L, 0.16, 0.12, 0.055), 0, 1.4, s * (W / 2 - 0.08)));   /* the thin rail light line, its edges turned so it catches along its length */
    }
    /* under-deck lights along the girder's front edge, none where a pylon stands */
    for (let u = -L / 2 + 3; u < L / 2 - 2; u += 6) { if (main && spec.pylons.some(px => Math.abs(px - u) < 1.6)) continue; B.strips.push(P(chamferBox(0.5, 0.3, 0.5, 0.12), u, -1.45, W * 0.3 + 0.3)); }
    if (main) {
      /* twin slim pylons either side of the girder with a cross-beam under it; the rail pod hangs below */
      for (const px of spec.pylons) {
        for (const s of [-1, 1]) B.structural.push(P(chamferBox(1.2, spec.y - 1.9, 1.0, 0.22), px, -(spec.y - 1.9) / 2 - 1.9 + (spec.y - 1.9) / 2 + 0.05 - (spec.y - 1.9) / 2 + (spec.y - 1.9) / 2 - 0.05 + 0.05 - spec.y + (spec.y - 1.9) / 2 + 1.9 - 0.05, s * 2.1));
        B.structural.push(P(chamferBox(1.4, 0.6, 5.4, 0.22), px, -1.95, 0));
        B.whites.push(P(new THREE.OctahedronGeometry(0.34, 0), px, -2.45, 2.9));   /* the pylon's marker: the same square diamond as the mast beacons */
      }
      pod = { mesh: new THREE.Mesh(own(chamferBox(3.0, 1.0, 0.9, 0.38)), whiteMat), y: -3.0, travel: (L - 6) / 6, dwell: 3, half: L / 2 - 3, frame: bm };
      pod.mesh.name = 'city-rail-pod'; pod.mesh.matrixAutoUpdate = false; group.add(pod.mesh);
    }
    /* life path along the deck (world space) */
    const pts = [], nPts = Math.max(2, Math.round(L / 30) + 1);
    for (let k = 0; k < nPts; k++) { const u = -L / 2 + 0.5 + (L - 1) * (k / (nPts - 1)); pts.push(new THREE.Vector3(u, 0.3, 0).applyMatrix4(bm)); }
    anchors.paths.push({ id: spec.id, points: pts, kind: 'bridge' });
    stats.paths++; stats.bridges++;
  }
  span(WALKWAY, true);
  BRIDGES.forEach(b => span(b, false));

  /* ---------------------------------------------------------------- 2. background towers */
  /* v8 §06 (law 6): "more round looking, not so pointy". Nothing in this world is allowed to end in a
     point unless it is a square diamond, and three of these archetypes were needles — A closed at a
     0.03 radius, E's spire at 0.03 and G's pinnacle at 0.001, which is a mathematical spike. They are
     BLUNTED, not shortened: the same silhouette and the same height, ending in a small flat facet the
     moon can catch instead of an aliasing hairline. The four-sided shafts stay four-sided, because a
     square prism seen in plan IS the diamond, and that is the one exception the law makes. */
  const arch = {
    A: faceted(mergeGeos([new THREE.CylinderGeometry(0.60, 0.72, 1, 4, 1).translate(0, 0.5, 0), new THREE.CylinderGeometry(0.10, 0.60, 0.15, 4, 1).translate(0, 1.075, 0)])),
    B: faceted(mergeGeos([new THREE.CylinderGeometry(0.50, 0.56, 1, 6, 1).translate(0, 0.5, 0), new THREE.CylinderGeometry(0.10, 0.50, 0.12, 6, 1).translate(0, 1.06, 0)])),
    /* v11 §06: C's cap closed at 0.04 of its own width — 0.6 m across on a 62 m tower, which is a
       hairline that aliases rather than a facet that catches. It is a CAP and not a needle (0.12 tall
       against a 0.46 base), so the fix is not to lengthen it but to widen what it ends on: 0.10 puts a
       1.5 m table on top of the tower, which the moon can actually find. */
    C: faceted(mergeGeos([new THREE.CylinderGeometry(0.70, 0.72, 0.62, 4, 1).translate(0, 0.31, 0), new THREE.CylinderGeometry(0.46, 0.50, 1, 4, 1).translate(0.12, 0.5, 0.1), new THREE.CylinderGeometry(0.10, 0.46, 0.12, 4, 1).translate(0.12, 1.06, 0.1)])),
    /* v11 §06: D's extrusion carried a 0.02 bevel, which on a 22 m tower is 0.4 m — under a pixel at
       400 m, so every arris on it read as a razor cut. The bevel is 0.05 now (1.1 m: a real chamfer
       face at each edge, including the crown's own corner) and the extruded depth drops by the same
       amount either side, so the tower's outer envelope and the energy strip that rings it are
       unchanged. Bevel segments stay at 1 — this ADDS one facet per arris, it does not round anything. */
    D: (() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, 0.84); s.lineTo(0.12, 1); s.lineTo(-0.5, 0.9); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.30, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1, curveSegments: 1 }); g.translate(0, 0, -0.15); return faceted(g); })(),
    /* MEGATALL E — the stepped supertall: a long tapering shaft, two setbacks, then a slender spire.
       The classic "how tall is that" silhouette; the spire is what makes the height legible. */
    E: faceted(mergeGeos([
      new THREE.CylinderGeometry(0.40, 0.62, 0.78, 4, 1).translate(0, 0.39, 0),
      new THREE.CylinderGeometry(0.30, 0.40, 0.13, 4, 1).translate(0, 0.845, 0),
      new THREE.CylinderGeometry(0.19, 0.30, 0.09, 4, 1).translate(0, 0.955, 0),
      new THREE.CylinderGeometry(0.075, 0.13, 0.19, 4, 1).translate(0, 1.095, 0)
    ])),
    /* MEGATALL F — the notched twin blade: two slabs of different height sharing a core, so the crown
       is a NOTCH against the sky rather than a point. Reads at any distance, from any bearing.
       v11 §06: its three slabs were raw BoxGeometry — twelve triangles and eight razor arrises each,
       on a 300 m megatall 780 m out, which is the one archetype in this table with no chamfer anywhere
       on it. They are chamferBoxes now: the same masses, the same notch, one narrow third face along
       every arris. It costs 48 triangles because F stands exactly once in the whole district. */
    F: faceted(mergeGeos([
      chamferBox(0.86, 1.0, 0.30, 0.075).translate(-0.20, 0.5, 0),
      chamferBox(0.72, 0.83, 0.30, 0.07).translate(0.38, 0.415, 0),
      chamferBox(0.30, 0.62, 0.26, 0.06).translate(0.09, 0.31, 0),
      new THREE.CylinderGeometry(0.045, 0.05, 0.16, 4, 1).translate(-0.20, 1.08, 0)
    ])),
    /* MEGATALL G — the crystalline pinnacle: an eight-sided shaft narrowing toward a faceted crown,
       the purest expression of the world's diamond language at architectural scale. It stops at a
       0.085 cap rather than at a point (law 6): the taper reads exactly the same and the top face is
       now a real octagon that answers the sky instead of a one-pixel spike. */
    G: faceted(mergeGeos([
      new THREE.CylinderGeometry(0.34, 0.56, 0.72, 8, 1).translate(0, 0.36, 0),
      new THREE.CylinderGeometry(0.22, 0.34, 0.18, 8, 1).translate(0, 0.81, 0),
      new THREE.CylinderGeometry(0.085, 0.22, 0.22, 8, 1).translate(0, 1.01, 0)
    ]))
  };
  Object.values(arch).forEach(own);
  /* Every tower is assigned a MATERIAL FAMILY independently of its archetype, so a shape and a surface
     are two separate variables and the skyline reads as a mixed city rather than a sorted one. The
     assignment is deterministic and hand-checked against the TOWERS table so no two adjacent bearings
     share a family. Instancing still costs one draw call per (archetype × family) pair actually used. */
  const FAMILY_OF = (a, r, type) => {
    /* v10 §12: three depths for a megatall, not two. Under 520 m it is architecture in platinum; past
       that it is atmosphere, and it gets lighter and less metallic the further back it stands. */
    if (type === 'E' || type === 'G') return r > 640 ? 'glassDeep' : r > 520 ? 'glassFar' : 'platinum';
    if (type === 'F') return 'graphite';
    const k = (Math.round(a) * 7 + Math.round(r / 10) * 3) % 10;
    return k < 3 ? 'platinum' : k < 6 ? 'glass' : k < 8 ? 'graphite' : 'violet';
  };
  const byArch = {};                       /* 'ARCH|family' -> matrices */
  const archKey = (type, fam) => type + '|' + fam;
  const boxStrips = [], hexStrips = [];
  const Rt = rng(SEED + 77);
  TOWERS.forEach(([a, r, h, w, type, strips]) => {
    const [x, z] = polar(a, r), ry = Rt() * Math.PI * 2;
    const key = archKey(type, FAMILY_OF(a, r, type));
    (byArch[key] || (byArch[key] = [])).push(matrixOf(x, 0, z, ry, w, h, w).clone());
    for (let k = 0; k < strips; k++) {
      const f = strips === 1 ? 0.55 + Rt() * 0.25 : 0.35 + k * 0.3 + Rt() * 0.12, y = f * h;
      if (type === 'A') { const rr = 0.72 + (0.60 - 0.72) * f, side = rr * Math.SQRT2 * w * 1.02; boxStrips.push(matrixOf(x, y, z, ry + Math.PI / 4, side, 1.1, side).clone()); }
      else if (type === 'C') { const rr = 0.50 + (0.46 - 0.50) * f, side = rr * Math.SQRT2 * w * 1.02, ox = 0.12 * w, oz = 0.1 * w; boxStrips.push(matrixOf(x + ox * Math.cos(ry) + oz * Math.sin(ry), y, z - ox * Math.sin(ry) + oz * Math.cos(ry), ry + Math.PI / 4, side, 1.1, side).clone()); }
      else if (type === 'D') boxStrips.push(matrixOf(x, y, z, ry, w * 1.02, 1.1, 0.36 * w * 1.04).clone());
      else if (type === 'E') { const rr = 0.62 + (0.40 - 0.62) * Math.min(1, f / 0.78), side = rr * Math.SQRT2 * w * 1.02; boxStrips.push(matrixOf(x, y, z, ry + Math.PI / 4, side, 1.6, side).clone()); }
      else if (type === 'F') boxStrips.push(matrixOf(x - 0.20 * w * Math.cos(ry), y, z + 0.20 * w * Math.sin(ry), ry, 0.88 * w, 1.6, 0.32 * w).clone());
      else if (type === 'G') { const rr = 0.56 + (0.34 - 0.56) * Math.min(1, f / 0.72); hexStrips.push(matrixOf(x, y, z, ry, rr * w * 1.03, 1.6, rr * w * 1.03).clone()); }
      else { const rr = 0.56 + (0.50 - 0.56) * f; hexStrips.push(matrixOf(x, y, z, ry, rr * w * 1.03, 1.1, rr * w * 1.03).clone()); }
    }
    /* ---- v8 §07 THE MEGATALL SEAM ---------------------------------------------------------------
       Two of the eight megatalls wear ONE full-height seam in their district's hue — the largest and
       fewest gesture in the file, and the one that gives the skyline a colour the eye can navigate by.
       It is built in four segments because the shaft TAPERS: a single straight strip would be buried
       in the mass at the bottom or floating off it at the top. Each segment sits on the flat of the
       prism (a four-sided cylinder's face lies at radius / √2 from the axis, which is what the strip
       matrices below already use), is flanked by a wash pair that lights the shaft either side of it,
       and the run ends in a SHOULDER band at the first setback, so the seam terminates in architecture
       instead of stopping in mid-air. */
    const seamHue = TOWER_SEAM[a + '|' + r];
    if (seamHue && type === 'E') {
      const ryd = ry + Math.PI / 4, nx = Math.sin(ryd), nz = Math.cos(ryd), tx = Math.cos(ryd), tz = -Math.sin(ryd);
      const segs = 4, y0 = 0.06 * h, y1 = 0.78 * h, sw = 0.09 * w;
      for (let k = 0; k < segs; k++) {
        const fa = (y0 + (y1 - y0) * (k + 0.5) / segs) / h, sy = y0 + (y1 - y0) * (k + 0.5) / segs;
        const ap = (0.62 + (0.40 - 0.62) * Math.min(1, fa / 0.78)) * w / Math.SQRT2;
        B[seamHue].push(xform(chamferBox(sw, (y1 - y0) / segs, 0.7, 0.16), x + nx * ap, sy, z + nz * ap, ryd));
        for (const sd of [-1, 1]) B.accWash.push(paint(xform(vwash(sw * 7, (y1 - y0) / segs), x + nx * (ap + 0.05) + tx * sd * sw * 3.6, sy, z + nz * (ap + 0.05) + tz * sd * sw * 3.6, ryd), ACCENT[seamHue]));
      }
      const shoulder = 0.40 * Math.SQRT2 * w * 1.04, sap = shoulder / 2 + 0.06;
      B[seamHue].push(xform(chamferBox(shoulder, 0.9 + h * 0.004, shoulder, 0.3), x, y1 + 0.4, z, ryd));
      /* the shoulder's own answer: the shaft it rings, lit for a few metres under it on all four flats */
      for (let q = 0; q < 4; q++) {
        const qa = ryd + q * Math.PI / 2;
        B.accWash.push(paint(xform(hwash(shoulder * 0.92, h * 0.05), x + Math.sin(qa) * sap, y1 - h * 0.02, z + Math.cos(qa) * sap, qa), ACCENT[seamHue]));
      }
      stats.emitters += segs + 1; stats.washes += segs * 2 + 4;
      stats.gestures.push('megatall@' + a + 'deg:seam:' + seamHue);
    }
    /* v9 §01: the crystal has to reach the background or it reads as a treatment applied to the near
       blocks only. The megatalls have exactly one break each — the first setback, at 0.78 of an E and
       0.72 of a G — and four shards stand on it, one per flat, at a tenth of the tower's height. Four
       hundred metres away that is still 3° of picture, which is why this is the only shard placement in
       the file sized as a fraction of its host rather than in metres. */
    if (h > 200 && (type === 'E' || type === 'G')) {
      const fy = type === 'E' ? 0.78 : 0.72, rad = (type === 'E' ? 0.40 : 0.34) * w * 0.92;
      for (let q = 0; q < 4; q++) {
        const qa = ry + Math.PI / 4 + q * Math.PI / 2;
        SH('facet', q % 2 ? 'crystal' : 'blade', x + Math.sin(qa) * rad, fy * h - w * 0.05, z + Math.cos(qa) * rad,
          -0.22, qa, (q - 1.5) * 0.10, w * 0.26, h * (0.085 + (q % 2) * 0.03), w * 0.22, null);
      }
    }
    stats.towers++;
  });
  /* ---------------------------------------------------------------- 2b. the shafts that do not end */
  /* ---- v9 §10 VERTICAL AERIAL PERSPECTIVE ---------------------------------------------------------
     Four bands, and the ladder only ever goes DOWN. That is not a stylistic preference: at night this
     world's sky runs horizon 0x1d3d6e → mid 0x102446 → zenith 0x081226, so the higher a mass stands the
     closer it sits to the DARKEST part of the sky, and a band that got lighter with altitude would be
     painting a daylight sky's aerial perspective onto a night one. It also means law 4 is kept by
     construction — nothing in this file is lightened to make the city look deeper.
     The environment intensity falls with the value for the same reason: more atmosphere between the eye
     and a surface means less of the environment survives the trip. Fog then does the rest, and it does
     a great deal — a 600 m shaft at 265 m radius has its foot 265 m away and its top 655 m away, which
     across a 55→880 m fog is the difference between one quarter and three quarters obscured. */
  const shaftBand = [
    new THREE.MeshStandardMaterial({ color: 0x2a3750, roughness: 0.50, metalness: 0.88, envMapIntensity: 1.55 }),
    new THREE.MeshStandardMaterial({ color: 0x243149, roughness: 0.46, metalness: 0.88, envMapIntensity: 1.35 }),
    new THREE.MeshStandardMaterial({ color: 0x1e2a41, roughness: 0.44, metalness: 0.88, envMapIntensity: 1.12 }),
    new THREE.MeshStandardMaterial({ color: 0x18233a, roughness: 0.42, metalness: 0.88, envMapIntensity: 0.90 })
  ];
  shaftBand.forEach((m, i) => { m.name = 'city-shaft-band-' + i; owned.materials.push(m); });
  /* THE RING DECK, shared by the block saucers and the shaft collars: a lens, not a plate. Three lathe
     rings — the deck, the rim band that gives its edge a vertical face to catch the horizon with, and
     the underbelly that tapers back to the support. 144 triangles, one geometry, one draw call for all
     of them. Unit radius and a total depth of 0.45, so a caller scales it to real metres. */
  const discGeo = own(mergeGeos([
    new THREE.CylinderGeometry(0.86, 1.0, 0.10, 18, 1).translate(0, 0.05, 0),
    new THREE.CylinderGeometry(1.03, 1.03, 0.09, 18, 1, true).translate(0, -0.02, 0),
    new THREE.CylinderGeometry(1.0, 0.34, 0.30, 18, 1, true).translate(0, -0.21, 0)
  ]));
  /* the band a height fraction falls in; the boundaries close up toward the top so the bands themselves
     are one more diminishing series the eye can read as recession */
  const bandOf = f => (f < 0.30 ? 0 : f < 0.56 ? 1 : f < 0.80 ? 2 : 3);
  SHAFTS.forEach(([a, r, w0, H, taper], si) => {
    const [x, z] = polar(a, r), ry = Rt() * Math.PI * 2, cut = [0, 0.30, 0.56, 0.80, 1.0];
    for (let k = 0; k < 4; k++) {
      const r0 = (w0 / 2) * (1 - taper * cut[k]), r1 = (w0 / 2) * (1 - taper * cut[k + 1]);
      B['shaft' + k].push(xform(faceted(new THREE.CylinderGeometry(r1, r0, (cut[k + 1] - cut[k]) * H, 4, 1)),
        x, (cut[k] + cut[k + 1]) / 2 * H, z, ry));
    }
    /* THE BELTS. Thirteen collars whose SPACING COMPRESSES toward the top — f = 1 − (1 − k/N)^1.9,
       whose slope falls to zero at the top — and whose height falls with it. That compression is the
       oldest trick there is for reading a height as farther than it is: the eye counts the low ones,
       finds the high ones too close together to separate, and stops being able to say where the top is.
       Each belt joins its own band's mesh, so thirteen collars on six shafts cost no draw call at all. */
    const N = 14;
    for (let k = 1; k < N; k++) {
      const f = 1 - Math.pow(1 - k / N, 1.9), rr = (w0 / 2) * (1 - taper * f) * 1.07;
      B['shaft' + bandOf(f)].push(xform(faceted(new THREE.CylinderGeometry(rr, rr, 1.6 * (1 - 0.62 * f), 4, 1, true)), x, f * H, z, ry));
      stats.shaftBelts++;
    }
    /* LAW 1, and the one place this section could have broken it. Every segment's top cap is buried
       under the segment above it — the taper is continuous, so those faces never see the sky — except
       the last one, which does. A metalness-0.88 face pointed at the near-black zenith renders black,
       so the shaft ends in a coping in the LIT grade, exactly like every block in this district. It is
       also the only reason a shaft that leaves the frame still resolves properly in the periphery views
       where its top IS visible. */
    /* turned 45° to the shaft's own axes because a four-sided cylinder puts its VERTICES on those axes
       and its flats on the diagonals: an axis-aligned box over it would leave four corners of dark cap
       showing. At √2 × 1.12 of the top radius the coping matches the shaft's square and overhangs it
       by an eighth, which is a coping rather than a mushroom. */
    const rTop = (w0 / 2) * (1 - taper);
    B.platLit.push(xform(chamferBox(rTop * 1.585, 0.9, rTop * 1.585, 0.4), x, H + 0.3, z, ry + Math.PI / 4));
    /* two of the six wear a collar deck low down, where the shaft is still legible as architecture */
    if (si === 1 || si === 3) { decks.push(poseOf(x, 0.17 * H, z, 0, ry, 0, w0 * 1.6, 3.2, w0 * 1.6).clone()); stats.decks++; }
    stats.shafts++;
  });
  const instanced = (geo, material, mats, name) => { if (!mats.length) return null; const im = new THREE.InstancedMesh(geo, material, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.name = name; group.add(im); return im; };
  Object.keys(byArch).forEach(k => { const [type, fam] = k.split('|'); instanced(arch[type], towerFamilies[fam], byArch[k], 'city-towers-' + type + '-' + fam); });
  instanced(own(chamferBox(1, 1, 1, 0.07)), stripMat, boxStrips, 'city-tower-strips');
  instanced(own(faceted(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true))), stripMat, hexStrips, 'city-tower-strips-hex');

  /* ---------------------------------------------------------------- 3. distant silhouettes */
  const distant = new THREE.Group(); distant.name = 'city-distant'; group.add(distant);
  {
    /* v6 §44: the distant layer is sorted into THREE depth bands by radius and drawn in three values.
       A form at 620 m and a form at 830 m used to be the same 0x0a1322, which is why the far layer read
       as one paper cut-out; giving them different values restores aerial perspective before the fog
       even acts. Each band is one merged mesh, so this costs two extra draw calls in total.
       Distant forms are also CHAMFERED now: eight un-bevelled black rectangles on the horizon was
       exactly the repeated-box read the brief objects to. */
    const band = r => (r < 660 ? B.far0 : r < 760 ? B.far1 : B.far2);
    /* THE COLOSSAL TAPERED FORM — 330 m of silhouette at 720 m, so its outline is the whole of it.
       v9 cut it from one CylinderGeometry, which meant one straight taper meeting a flat top at a
       single hard corner. It is a three-ring prism now (v11 §06): the taper steepens over the last
       80 m, so the outline turns toward horizontal before the table instead of arriving at it along
       one line. Four extra triangles, on the largest distant form in the frame. */
    /* every bearing below goes through clearOfSites (L42): the ring past 600 m is no longer empty */
    let [x, z] = polar(clearOfSites(50, 720, 90), 720); band(720).push(xform(shardPrism(PLAN4, [[90, 0], [62, 250], [46, 330]]), x, 0, z, 0.4));
    [x, z] = polar(clearOfSites(70, 680, 130), 680);                                                                     /* the suspended ring on two pylons */
    band(680).push(xform(new THREE.TorusGeometry(115, 7, 6, 44).rotateX(1.25), x, 210, z, 0.1));
    band(680).push(xform(chamferBox(10, 200, 10, 2.6), x - 64, 100, z + 6)); band(680).push(xform(chamferBox(10, 200, 10, 2.6), x + 66, 100, z - 6));
    [x, z] = polar(clearOfSites(128, 640, 50), 640); band(640).push(xform(chamferBox(90, 320, 34, 6), x, 160, z, 0.5));   /* a tall slab above the ridge line */
    [x, z] = polar(clearOfSites(100, 780, 110), 780);                                                                    /* a high platform on slim pylons */
    band(780).push(xform(chamferBox(210, 14, 70, 4.5), x, 232, z, 0.15));
    [-80, 0, 80].forEach(o => band(780).push(xform(chamferBox(8, 232, 8, 2.0), x + o * Math.cos(0.15), 116, z - o * Math.sin(0.15))));
    SLABS.forEach(([a, r, w, h, d, ry]) => { const [sx, sz] = polar(clearOfSites(a, r, w * 0.5), r); band(r).push(xform(chamferBox(w, h, d, Math.min(6, w / 5)), sx, h / 2, sz, ry)); });
    GHOSTS.forEach(([a0, r, w, h]) => {
      const a = clearOfSites(a0, r, w * 0.5);
      const [gx, gz] = polar(a, r), gry = (a * 0.37) % 1.5707;
      B.ghost.push(xform(faceted(new THREE.CylinderGeometry(w * 0.28, w * 0.5, h, 4, 1)), gx, h / 2, gz, gry));
      for (const f of [0.34, 0.62]) {
        const rr = (w * 0.5 + (w * 0.28 - w * 0.5) * f) * 1.09;
        B.ghost.push(xform(faceted(new THREE.CylinderGeometry(rr, rr, h * 0.012, 4, 1, true)), gx, f * h, gz, gry));
      }
      stats.ghosts++;
    });
    stats.giants = 4 + SLABS.length;
    [B.far0, B.far1, B.far2].forEach((F, i) => {
      if (!F.length) return;
      const far = new THREE.Mesh(own(mergeGeos(F)), farMats[i]); far.name = 'city-distant-forms-' + i; far.frustumCulled = false; distant.add(far);
    });
    /* ---- v9 §11 THE GHOSTS -------------------------------------------------------------------------
       The fourth mechanism, and the cheapest: eight shafts at 650–860 m, 660–900 m tall, one value step
       under the farthest distant band. Their job is to stand ABOVE the near skyline's tops with nothing
       resolvable about them, so the city implies it continues past where it can be read. Two belts each
       is all the structure they get — enough that they are buildings and not obelisks, not enough to be
       countable, which would defeat them. What finishes them is the atmosphere rather than a crown: at
       night the fog runs 55 → 880 m, so a ghost's foot is already four fifths obscured and its top,
       being farther still, is gone entirely. A form that dissolves before it ends is the whole idea. */
    if (B.ghost.length) {
      const gh = new THREE.Mesh(own(mergeGeos(B.ghost)), farGhostM); gh.name = 'city-far-ghosts'; gh.frustumCulled = false; distant.add(gh);
    }
  }
  /* ---------------------------------------------------------------- 4. THE SKY ROADS (v13 §8 / §6D) */
  /* See the long note above SR_BLOCKED for the composition arithmetic, the support logic and the two
     laws this section is most exposed to. What follows is the build. */
  const srStats = { roads: 0, tiers: {}, deckArea: 0, upArea: 0, downArea: 0, sideArea: 0,
    columns: 0, brackets: 0, piers: 0, unsupported: 0, stations: 0, collisions: [], minBearingMargin: 999,
    maxGrade: 0, maxSpan: 0, maxSpanAt: '', tallestPier: 0, carriers: 0, pools: 0, elevMax: 0, elevMoon: 0, supports: [] };
  const srCars = [];              /* the runtime carrier state; filled below, read by update() */
  let srCarMeshes = null, srDarkMesh = null, srWashMesh = null, srSetTime = null;
  {
    /* ---- THE GRADES. Four MeshStandard materials for the whole network: two for horizontal face,
       two for vertical, each in a NEAR and a FAR value. The far pair is this file's own glassFar /
       glassDeep argument applied to a road — metalness falls away with range so a 500 m deck takes
       the hemisphere and the fog the way the mountains do, and the base colour is lerped toward the
       night horizon key 0x1d3d6e, which is what "distance buys value" means for something that
       starts BRIGHTER than the sky (a mountain converges on the same key from below).
       LAW 1 decides the split within each pair, not distance: `cap` is every face the router
       measured as horizontal and it never goes above metalness 0.40. */
    const srCapNear = new THREE.MeshStandardMaterial({ color: 0x93a3bd, roughness: 0.42, metalness: 0.40, envMapIntensity: 1.30 });
    const srCapFar = new THREE.MeshStandardMaterial({ color: 0x64799c, roughness: 0.54, metalness: 0.24, envMapIntensity: 0.86 });
    const srSideNear = new THREE.MeshStandardMaterial({ color: 0x8496b4, roughness: 0.28, metalness: 0.90, envMapIntensity: 1.85 });
    const srSideFar = new THREE.MeshStandardMaterial({ color: 0x566e94, roughness: 0.46, metalness: 0.32, envMapIntensity: 1.05 });
    srCapNear.name = 'city-skyroad-deck-near'; srCapFar.name = 'city-skyroad-deck-far';
    srSideNear.name = 'city-skyroad-side-near'; srSideFar.name = 'city-skyroad-side-far';
    owned.materials.push(srCapNear, srCapFar, srSideNear, srSideFar);
    /* THE RIM LIGHT and THE WASH IT THROWS. One emissive material and one wash material carry all
       four tiers: the HUE is the world Theme's (so setTime/setTheme own it exactly as they own every
       other emitter in this district) and the per-tier BRIGHTNESS rides on the vertices as a grey,
       which is the same trick the accent washes use to put three hues in one draw call. DoubleSide
       because an edge light is meant to be seen from under the deck as well as from over it. */
    const srRimM = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, side: THREE.DoubleSide, toneMapped: true, fog: true });
    const srWashM = new THREE.MeshBasicMaterial({ color: theme.energy, map: washTex, vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: true, fog: true });
    srRimM.name = 'city-skyroad-rims'; srWashM.name = 'city-skyroad-wash';
    owned.materials.push(srRimM, srWashM);

    /* ---- THE ANCHOR SET. Everything in this district a support is allowed to land on, with a
       shaft's half-width taken off its own taper at whatever height it is asked about — a 30 m
       shaft is 17 m across at its foot and 10 m at 600 m, and using the foot value would have put
       every bracket on the high roads 7 m short of the flank it is tied to. */
    const srAnchors = [];
    /* VERIFIER CORRECTION — A TABLE IS NOT A ROOF. `b.h` is a block's tallest point, and for the SIX
       SLOTTED blocks that point is the NARROW BLADE, which stands off-centre: the wide wing that
       actually occupies the block's own (x, z) only reaches round(h * 0.84), and the slot beside it
       is a void down to round(h * 0.6). Measured against the BUILT group by ray-casting down each
       anchor's axis, all six slotted blocks sit 3.7-10.7 m BELOW their table height at their centre
       (L1 34/29.3, L2 62/52.3, C2 70/59.3, R4 42/35.3, F2 22/18.3, R5 36/30.3) — and C2 was carrying
       a column, so its 5.4 m pad and the feet of both raking legs stood in mid air 10.7 m above the
       roof, with one corner over the slot. That is the "four plinths with nothing on them" failure.
       A column needs a roof it can stand on across the whole pad, and a slotted block does not have
       one at its centre, so it is a BRACKET anchor only — its flank is real at every height. */
    BLOCKS.forEach(b => srAnchors.push({ x: b.x, z: b.z, top: b.h, h0: Math.max(b.w, b.d) * 0.5, tp: 0, H: b.h, kind: 'block', id: b.id, noColumn: MASSING_OF(b.id) === 'slotted' }));
    TOWERS.forEach(([a, r, h, w]) => { const [x, z] = polar(a, r); srAnchors.push({ x, z, top: h, h0: w * 0.5, tp: 0, H: h, kind: 'tower', id: 'T' + a + '|' + r }); });
    SHAFTS.forEach(([a, r, w0, H, taper]) => { const [x, z] = polar(a, r); srAnchors.push({ x, z, top: H, h0: w0 * 0.5, tp: taper, H, kind: 'shaft', id: 'S' + a + '|' + r }); });
    const halfAt = (an, y) => an.h0 * (1 - an.tp * Math.max(0, Math.min(1, y / an.H)));

    const BRACKET_REACH = 27, COLUMN_REACH = 44, COLUMN_MAX = 76, CLEAR_MIN = 2.0;
    const srB = { cap: [], side: [], up: 0, down: 0, vert: 0 };
    const rimGeos = [], washGeos = [], srCapNearG = [], srCapFarG = [], srSideNearG = [], srSideFarG = [];

    SKYROADS.forEach((road, ri) => {
      const T = SR_TIER[road.tier], W = T.halfW, T2 = T.thick * 0.5;
      /* ---- the centreline. Segment count comes from the arc it actually has to cover, so a 100 m
         ribbon and a 270 m one are tessellated at the same 14 m of chord rather than at the same
         number of pieces — the chord's sagitta on a 450 m radius at that spacing is 0.2 m, which is
         well under a pixel at this range, and the curve is smooth by construction anyway. */
      const probe = srSpline(road.ctrl, 64);
      let arc = 0;
      const wpt = p => { const [x, z] = polar(p[0], p[1]); return [x, p[2], z]; };
      for (let i = 1; i < probe.length; i++) {
        const a = wpt(probe[i - 1]), b = wpt(probe[i]);
        arc += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      }
      const segs = Math.max(14, Math.min(34, Math.round(arc / 14)));
      const raw = srSpline(road.ctrl, segs);
      const pts = raw.map(p => { const [x, z] = polar(p[0], p[1]); return { x, y: p[2], z, bearing: p[0], rx: 0, rz: 0, tx: 0, ty: 0, tz: 0 }; });
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L3 = Math.hypot(dx, dy, dz), Lh = Math.hypot(dx, dz) || 1;
        pts[i].tx = dx / L3; pts[i].ty = dy / L3; pts[i].tz = dz / L3;
        pts[i].rx = dz / Lh; pts[i].rz = -dx / Lh;                       /* up x tangent, horizontal */
        srStats.maxGrade = Math.max(srStats.maxGrade, Math.abs(dy) / Lh);
        srStats.minBearingMargin = Math.min(srStats.minBearingMargin, srMargin(pts[i].bearing));
        /* the elevation this sample subtends at the establishing camera (0, 3.4, 84). The number
           that actually matters is the second one: the moon only travels bearings 57-117, so what
           the guard is about is how high a road gets INSIDE that band, not how high it gets. */
        const el = Math.atan2(pts[i].y - 3.4, Math.hypot(pts[i].x, pts[i].z - 84)) * 180 / Math.PI;
        srStats.elevMax = Math.max(srStats.elevMax, el);
        if (pts[i].bearing >= 57 && pts[i].bearing <= 117) srStats.elevMoon = Math.max(srStats.elevMoon, el);
      }

      /* ---- THE DECK. Two convex swept tubes: a slab with a rounded edge rolled onto all four of
         its arrises (§06 — the SILHOUETTE is round, the surface stays cut: two facets per quarter,
         not a smooth roll), and a keel girder under it that gives the road structural depth from
         below. This is what stops it being a ribbon of zero thickness. */
      const r = Math.min(T2 * 0.80, W * 0.22), s45 = Math.SQRT1_2, rx = r * s45;
      const deckSec = [
        [W - r, T2], [W - r + rx, T2 - r + rx], [W, T2 - r],
        [W, -(T2 - r)], [W - r + rx, -(T2 - r) - rx], [W - r, -T2],
        [-(W - r), -T2], [-(W - r) - rx, -(T2 - r) - rx], [-W, -(T2 - r)],
        [-W, T2 - r], [-(W - r) - rx, T2 - r + rx], [-(W - r), T2]
      ];
      const K = T.keelW, G = T.keelD, kc = Math.min(0.42, K * 0.34, G * 0.24);
      const keelSec = [
        [K, -T2 + 0.20], [K, -T2 - G + kc], [K - kc, -T2 - G],
        [-(K - kc), -T2 - G], [-K, -T2 - G + kc], [-K, -T2 + 0.20]
      ];
      const before = { cap: srB.cap.length, side: srB.side.length };
      srSweep(srB, pts, deckSec, true, false);
      /* the keel is swept OPEN along its last edge: that edge is its top, it is buried inside the
         deck slab, and building it added a MEASURED 4771 m2 of up-facing face that nothing can ever
         see — face this section would then have had to report and answer for under law 1, on top of
         the triangles. (Measured by building it both ways: 16924 m2 up closed, 12153 m2 open.) The
         end caps still fan the whole closed section, so the girder is closed where it is seen. */
      srSweep(srB, pts, keelSec, true, true);

      /* ---- SUPPORT PLANNING, in two passes, and the ORDER is the whole argument.
         PASS 1 asks the city: stations every ~44 m of arc each SEARCH the anchor set, and whatever
         they find is what carries the road there. Nothing about that is written down in advance.
         PASS 2 asks the ground, and only where pass 1 left a hole: a gap longer than 112 m, or an
         end cantilevering more than 46 m past its last support, gets exactly as many piers as it
         needs and no more. Doing it the other way round — pier first, wherever a station happened
         to fall — put three 188 m piers at 45 m centres under the high road, which is scaffolding
         and not a bridge. A pier is what a sky road does when the city cannot carry it. */
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z));
      const MAX_SPAN = 112, MAX_OVERHANG = 46;
      const stations = [];
      { const n = Math.max(2, Math.round(arc / 44) + 1);
        for (let k = 0; k < n; k++) stations.push(Math.round((k / (n - 1)) * (pts.length - 1))); }
      srStats.stations += stations.length;
      const columnUsed = {};     /* one column per anchor per road: three A-frames fanning off one crown is not support logic, it is a mistake repeated */
      const plan = [];
      stations.forEach(si => {
        const p = pts[si], keelY = p.y - T2 - G;
        let best = null;
        for (const an of srAnchors) {
          const hd = Math.hypot(an.x - p.x, an.z - p.z), ah = halfAt(an, Math.min(an.top, p.y));
          if (an.top > keelY - CLEAR_MIN && hd < ah + W + 2.0) {
            srStats.collisions.push(road.id + '@' + p.bearing.toFixed(1) + 'deg hits ' + an.id + ' (top ' + an.top + ', keel ' + keelY.toFixed(1) + ', gap ' + (hd - ah - W).toFixed(1) + ')');
            continue;
          }
          /* A COLUMN MAY NOT LIE DOWN. The first build of this search accepted any anchor within
             44 m and produced a 7.8 m rise raked over 32.7 m of plan — a strut at 13 degrees off
             horizontal, which is not a column, it is a cantilever pretending to be one. The rake is
             capped against the column's OWN height (plus a 12 m allowance so a short one can still
             step sideways off a parapet), which is the only test that stays right at every tier. */
          if (an.top <= keelY - CLEAR_MIN && !an.noColumn && !columnUsed[an.id] && hd <= Math.min(COLUMN_REACH, Math.max(12, (keelY - an.top) * 1.35)) && (keelY - an.top) <= COLUMN_MAX) {
            const eff = (keelY - an.top) + hd * 0.6;
            if (!best || eff < best.eff) best = { kind: 'column', an, hd, eff };
          } else if (an.top > p.y + 3 && hd >= ah + W + 2.0 && hd <= ah + W + BRACKET_REACH) {
            const eff = (hd - ah - W) * 2.4;
            if (!best || eff < best.eff) best = { kind: 'bracket', an, hd, ah, eff };
          }
        }
        /* A station with nothing in reach is NOT a defect — a bridge spans between its supports and
           these stations are only where the search is run. What would be a defect is a long unheld
           span, so pass 2 measures exactly that. */
        if (!best) { srStats.unsupported++; return; }
        if (best.kind === 'column') columnUsed[best.an.id] = 1;
        plan.push({ si, best });
      });
      if (T.pier > 0) {
        /* an OVERHANG (deck past the last support) and a SPAN (deck between two supports) need
           different pier counts, and the first cut of this told them apart by testing whether the
           gap started at sample 0 — which is wrong the moment the first support IS at sample 0, and
           it put two 189 m piers 45 m apart under the high road. The distinction is carried
           explicitly now. */
        const gaps = [];
        if (!plan.length) gaps.push({ a: 0, b: pts.length - 1, over: true });
        else {
          if (cum[plan[0].si] > MAX_OVERHANG) gaps.push({ a: 0, b: plan[0].si, over: true });
          for (let k = 1; k < plan.length; k++) if (cum[plan[k].si] - cum[plan[k - 1].si] > MAX_SPAN) gaps.push({ a: plan[k - 1].si, b: plan[k].si, over: false });
          const lz = plan[plan.length - 1].si;
          if (cum[pts.length - 1] - cum[lz] > MAX_OVERHANG) gaps.push({ a: lz, b: pts.length - 1, over: true });
        }
        for (const { a: ga, b: gb, over } of gaps) {
          const len = cum[gb] - cum[ga], n = Math.max(1, Math.ceil(len / MAX_SPAN) - (over ? 0 : 1));
          for (let k = 1; k <= n; k++) {
            const target = cum[ga] + (len * k) / (n + 1);
            let si = ga;
            for (let i = ga; i <= gb; i++) if (Math.abs(cum[i] - target) < Math.abs(cum[si] - target)) si = i;
            if (si === ga || si === gb) continue;
            if (pts[si].y - T2 - G <= T.pier) plan.push({ si, best: { kind: 'pier' } });
          }
        }
        plan.sort((a, b) => a.si - b.si);
      }
      for (let k = 1; k < plan.length; k++) {
        const span = cum[plan[k].si] - cum[plan[k - 1].si];
        if (span > srStats.maxSpan) { srStats.maxSpan = span; srStats.maxSpanAt = road.id; }
      }

      plan.forEach(({ si, best }) => {
        const p = pts[si], keelY = p.y - T2 - G;
        const tx = p.tx, ty = p.ty, tz = p.tz, splay = 2.6;

        if (best.kind === 'column') {
          /* THE COLUMN — the support the reference render shows and the one §3 wants most: a pair
             of raking legs standing on something that is already in the world, with a pad on the
             roof they land on and a saddle under the keel they carry. */
          const an = best.an;
          for (const s of [-1, 1]) {
            const g = srStrut(an.x + tx * s * 0.9, an.top, an.z + tz * s * 0.9,
              p.x + tx * s * splay, keelY + 0.5, p.z + tz * s * splay, 1.15, 0.78, 6);
            if (g) srBucket(srB, g);
          }
          srBucket(srB, chamferBox(5.4, 0.72, 5.4, 0.22).translate(an.x, an.top + 0.36, an.z));   /* the pad on the roof */
          srBucket(srB, new THREE.CylinderGeometry(1.5, 2.7, 2.1, 6, 1).translate(p.x, keelY + 1.05, p.z));  /* the saddle under the keel */
          srStats.columns++; srStats.supports.push(road.id + ' column onto ' + an.kind + ' ' + an.id + ' (' + (keelY - an.top).toFixed(1) + ' m rise, ' + best.hd.toFixed(1) + ' m rake)');
        } else if (best.kind === 'bracket') {
          /* THE BRACKET — the anchor stands past the deck, so the road ties INTO its flank: two
             raking ties off the keel and a collar band round the anchor to receive them. */
          const an = best.an, ty2 = p.y - 3.4, ah = halfAt(an, ty2);
          const ux = (an.x - p.x) / best.hd, uz = (an.z - p.z) / best.hd;
          for (const s of [-1, 1]) {
            const g = srStrut(p.x + tx * s * splay + ux * (W * 0.6), keelY + 0.4, p.z + tz * s * splay + uz * (W * 0.6),
              an.x - ux * (ah + 0.2), ty2, an.z - uz * (ah + 0.2), 0.92, 0.62, 6);
            if (g) srBucket(srB, g);
          }
          srBucket(srB, new THREE.CylinderGeometry(ah + 0.9, ah + 0.9, 3.6, 6, 1, true).translate(an.x, ty2, an.z));
          srStats.brackets++; srStats.supports.push(road.id + ' bracket to ' + an.kind + ' ' + an.id + ' (clear ' + (best.hd - best.ah - W).toFixed(1) + ' m)');
        } else {
          /* THE PIER — pass 1 left a span the city could not hold, so the road goes to the ground on
             a real tapered pier with a splayed foot and a haunch that spreads into the keel. The
             very-high tier has no pier budget at all, which is why it never reaches this branch: a
             rare road at 290 m is carried by the towers it threads or it is in the wrong place. */
          const h = keelY - 2.4;
          srBucket(srB, new THREE.CylinderGeometry(1.55, 3.30, h, 6, 1, true).translate(p.x, 2.4 + h * 0.5, p.z));
          srBucket(srB, new THREE.CylinderGeometry(2.90, 1.55, 4.20, 6, 1, true).translate(p.x, keelY - 0.4, p.z));
          srBucket(srB, new THREE.CylinderGeometry(3.90, 5.00, 2.40, 6, 1).translate(p.x, 1.2, p.z));
          srStats.piers++; srStats.tallestPier = Math.max(srStats.tallestPier, keelY);
          srStats.supports.push(road.id + ' pier ' + keelY.toFixed(0) + ' m to ground @ ' + p.bearing.toFixed(0) + 'deg');
        }
      });

      /* ---- LAW 2, ON THE GROUND. ground.js exposes ctx.lightPool so the module that OWNS an
         emitter answers it on the surface that shows it, and the two LOW roads are the only part of
         this network where that surface is the district floor: their decks run 60-81 m up over open
         ground at radius 190-428, edge-lit along their whole length, and a broad faint ellipse under
         each is what ties them to the world instead of leaving them floating. Two per low road, at
         the third points, deliberately wide (34 m) and weak (k 0.13) — a tight bright pool under a
         70 m deck would read as a spotlight rather than as spill. The mid, high and very-high roads
         get NONE, because a pool cast from 190 or 290 m would be a lie; those tiers are answered on
         their own decks, fascias, keels and supports instead. ground.js's field caps at 32 and this
         takes four, which the build re-counts rather than assuming. */
      if (road.tier === 'low' && ctx.lightPool) {
        for (const f of [0.34, 0.68]) {
          let target = cum[pts.length - 1] * f, si = 0;
          for (let i = 0; i < pts.length; i++) if (Math.abs(cum[i] - target) < Math.abs(cum[si] - target)) si = i;
          if (ctx.lightPool({ x: pts[si].x, z: pts[si].z, rx: 34, rz: 34, k: 0.13 })) srStats.pools++;
        }
      }

      /* ---- THE RIMS AND WHAT THEY LIGHT (law 2). Four ribbons per side: the emissive line on the
         deck top and the one on the fascia, then the wash each of them throws — inboard across the
         deck it lies on, and downward across the fascia and keel below it. An emissive rectangle
         that lights nothing is the defect this world has been corrected for repeatedly; these two
         are built together so that cannot happen. */
      const tint = T.dim;
      for (const s of [-1, 1]) {
        rimGeos.push(paint(srRibbon(pts, s * (W - 0.94), T2 + 0.03, s * (W - 0.30), T2 + 0.03), tint));
        rimGeos.push(paint(srRibbon(pts, s * (W + 0.03), T2 - 0.16, s * (W + 0.03), T2 - 0.52), tint));
        washGeos.push(paint(srRibbon(pts, s * (W - 0.28), T2 + 0.05, s * (W - 3.30), T2 + 0.05), tint));
        washGeos.push(paint(srRibbon(pts, s * (W + 0.05), T2 - 0.55, s * (K + 0.05), -T2 - G * 0.75), tint));
      }
      /* and the keel's own soffit, so the light does not stop at the fascia's bottom edge.
         VERIFIER CORRECTION. This strip was first laid at -T2-G+0.10, which is 0.10 m ABOVE the
         soffit — that is INSIDE the girder. Measured against the keel section at every tier, 82-87 %
         of the strip sat within the solid and was depth-tested away, and because the falloff map is
         brightest along a strip's CENTRE LINE, the buried part was precisely its bright core: what
         survived was two ~10 %-alpha slivers at the outer edges. An emitter whose answer renders
         inside the thing it is answering is exactly the law 2 defect this section was written to
         avoid. It now hangs 0.05 m UNDER the soffit, and inside the soffit's own flat half-width
         (K - kc) so the falloff dies before the girder's bottom arris rather than fringing past it
         against the sky. */
      const soffitHalf = Math.max(0.30, K - kc - 0.04);
      washGeos.push(paint(srRibbon(pts, soffitHalf, -T2 - G - 0.05, -soffitHalf, -T2 - G - 0.05), tint));

      /* ---- THE MOTION TRACK. Sampled independently of the geometry and far more finely, because a
         carrier reading its ride off a 14-segment deck would visibly step through the corners. Five
         numbers per sample, in one Float32Array, so update() does two lerps and no allocation. */
      const mraw = srSpline(road.ctrl, SR_MOT - 1), mot = new Float32Array(SR_MOT * 6);
      let yawAcc = 0, prevYaw = null;
      const mw = mraw.map(p => { const [x, z] = polar(p[0], p[1]); return [x, p[2], z]; });
      for (let i = 0; i < SR_MOT; i++) {
        const a = mw[Math.max(0, i - 1)], b = mw[Math.min(SR_MOT - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L3 = Math.hypot(dx, dy, dz) || 1;
        let yaw = Math.atan2(dx, dz);
        if (prevYaw != null) { let d = yaw - prevYaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; yawAcc += d; }
        else yawAcc = yaw;
        prevYaw = yaw;
        const o = i * 6;
        mot[o] = mw[i][0]; mot[o + 1] = mw[i][1] + T2 + SR_CAR.clear; mot[o + 2] = mw[i][2];
        mot[o + 3] = yawAcc; mot[o + 4] = -Math.asin(Math.max(-1, Math.min(1, dy / L3)));
      }
      /* BANK, from the track's own turn rate — a guided carrier leans into its curve and a flying
         one does not, and that difference is the whole of "guided rather than flying". Capped at
         6.3 deg: past that a block on a road starts to read as an aircraft. */
      for (let i = 1; i < SR_MOT - 1; i++) {
        const o = i * 6, ds = Math.hypot(mw[i + 1][0] - mw[i - 1][0], mw[i + 1][2] - mw[i - 1][2]) || 1;
        mot[o + 5] = Math.max(-0.11, Math.min(0.11, -(mot[o + 9] - mot[o - 3]) / ds * 260));
      }
      mot[5] = mot[11]; mot[(SR_MOT - 1) * 6 + 5] = mot[(SR_MOT - 2) * 6 + 5];

      for (let c = 0; c < road.carriers; c++) {
        srCars.push({ mot, travel: arc / road.speed, phase: (c / road.carriers) + ri * 0.137, value: T.recede });
        srStats.carriers++;
      }
      srStats.roads++;
      srStats.tiers[road.tier] = (srStats.tiers[road.tier] || 0) + 1;
      srStats.deckArea += arc * W * 2;
      const list = T.far ? srCapFarG : srCapNearG, sideList = T.far ? srSideFarG : srSideNearG;
      /* the two buckets are drained per road so each road's faces reach the grade its own range
         wants; the router itself never sees a tier */
      const capSlice = srB.cap.splice(before.cap), sideSlice = srB.side.splice(before.side);
      list.push(capSlice); sideList.push(sideSlice);
      srStats.upArea = srB.up; srStats.downArea = srB.down; srStats.sideArea = srB.vert;
    });

    /* the supports were bucketed into srB as they were built, and the per-road splice above already
       carried them off with their own road's slice, so nothing is left over */
    const srMeshOf = (slices, material, name) => {
      let n = 0;
      for (const s of slices) n += s.length;
      if (!n) return null;
      const pos = new Float32Array(n);
      let o = 0;
      for (const s of slices) { pos.set(s, o); o += s.length; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.computeVertexNormals();      /* non-indexed, so every triangle keeps its own normal: flat facets */
      const m = new THREE.Mesh(own(g), material); m.name = name; m.castShadow = false; group.add(m);
      return m;
    };
    srMeshOf(srCapNearG, srCapNear, 'city-skyroad-deck-near');
    srMeshOf(srCapFarG, srCapFar, 'city-skyroad-deck-far');
    srMeshOf(srSideNearG, srSideNear, 'city-skyroad-side-near');
    srMeshOf(srSideFarG, srSideFar, 'city-skyroad-side-far');
    if (rimGeos.length) { const m = new THREE.Mesh(own(mergeGeos(rimGeos)), srRimM); m.name = 'city-skyroad-rims'; group.add(m); }
    if (washGeos.length) { const m = new THREE.Mesh(own(mergeGeos(washGeos)), srWashM); m.name = 'city-skyroad-wash'; m.renderOrder = 3; group.add(m); }

    /* ---- THE SKYBLOCK CARRIERS ------------------------------------------------------------------
       §6D: "a carrier is an elongated FOBLOCK, not a new species". So it is not modelled here at
       all — foblock.js hands over the genome's parts and the only thing this file does to them is
       stretch them 2.75x along the genome's own DEPTH axis, which puts the engraved medallion and
       the square-diamond mark on the NOSE and leaves the two lateral connection rings circular at
       mid height, where they track just inside the deck's rim lights. The rings are the one part
       deliberately NOT stretched: a scaled torus is an ellipse, and the ring is the single most
       identifying feature of the reference object.

       All the carriers are one prototype in five InstancedMeshes, so nine of them cost five draw
       calls and the per-frame work is one matrix each. AERIAL PERSPECTIVE rides on the INSTANCE
       COLOUR — the same mechanism windowGrid uses to put a whole facade's brightness spread in one
       material — so a carrier on the 500 m high road sits back from one on the 200 m low road
       without a second material. */
    const cp = foblockParts({ tier: 'standard', size: SR_CAR.size, medallion: true, rings: true, diamond: true, energy: true });
    const stretch = new THREE.Matrix4().makeScale(1, 1, SR_CAR.stretch);
    const darks = [], glows = [];
    /* LAW 1, AND THE TRAP THE STRETCH SETS. foblock.js already splits its shell into `shell` and
       `cap` by measured normal — but it does that BEFORE this file scales the block 2.75x through
       Z, and a non-uniform scale rotates every normal it touches. Faces that sat at |ny| 0.55 in
       the genome come out past 0.62 once the block is long, and the two connection rings (which are
       deliberately NOT stretched) are tori: their crowns and soffits point straight up and down
       whatever anyone does to the body. The first build of this trusted the genome's split and
       measured 137.8 m2 of horizontal face sitting at metalness 0.92 — small, but it is precisely
       the bug this project has shipped four times, and the audit caught it because the audit
       measures instead of asking. So the whole assembled carrier is re-routed through the SAME
       by-normal router the road decks use, after the stretch. */
    const cb = { cap: [], side: [], up: 0, down: 0, vert: 0, band: 0.49 };
    for (const k of ['shell', 'rim', 'cap']) for (const g of cp[k]) srBucket(cb, g.applyMatrix4(stretch));
    for (const g of cp.ring) srBucket(cb, g);                               /* NOT stretched: a scaled torus is an ellipse */
    for (const g of cp.dark) darks.push(g.applyMatrix4(stretch));
    for (const k of ['diamond', 'energy']) for (const g of cp[k]) glows.push(g.applyMatrix4(stretch));
    const srGeoOf = arr => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3)); g.computeVertexNormals(); return g; };
    const body = [srGeoOf(cb.side)], caps = [srGeoOf(cb.cap)];
    srStats.carrierHorizontal = { up: +cb.up.toFixed(2), down: +cb.down.toFixed(2), vertical: +cb.vert.toFixed(2), note: 'per carrier, local frame — the horizontal share wears metalness 0.38' };
    /* THE WASH THE CARRIER DRAGS (law 2). A quad lying on the deck under the block, built in the
       block's own local frame so it rides on the SAME matrix — one pose per carrier per frame, not
       two — and carrying the falloff map so the light dies before it reaches the deck's rims.
       Its size is MEASURED off the stretched prototype rather than recomputed from the genome's own
       proportion constants, which this file does not own and must not restate. */
    const cbox = new THREE.Box3();
    for (const g of body.concat(caps)) { g.computeBoundingBox(); cbox.union(g.boundingBox); }
    srStats.carrierSize = [+(cbox.max.x - cbox.min.x).toFixed(2), +(cbox.max.y - cbox.min.y).toFixed(2), +(cbox.max.z - cbox.min.z).toFixed(2)];
    const washQuad = sillWash((cbox.max.x - cbox.min.x) * 1.28, (cbox.max.z - cbox.min.z) * 1.34).translate(0, -SR_CAR.clear + 0.07, 0);
    const carBodyM = new THREE.MeshStandardMaterial({ color: 0x9fb0c9, roughness: 0.22, metalness: 0.92, envMapIntensity: 1.70 });
    const carCapM = new THREE.MeshStandardMaterial({ color: 0x93a3bd, roughness: 0.40, metalness: 0.38, envMapIntensity: 1.20 });
    const carDarkM = mat('graphiteDark', 'graphite');
    const carGlowM = new THREE.MeshBasicMaterial({ color: theme.energy, toneMapped: true, fog: true });
    const carWashM = new THREE.MeshBasicMaterial({ color: theme.energy, map: washTex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, toneMapped: true, fog: true });
    carBodyM.name = 'city-carrier-body'; carCapM.name = 'city-carrier-cap';
    carGlowM.name = 'city-carrier-energy'; carWashM.name = 'city-carrier-wash';
    owned.materials.push(carBodyM, carCapM, carGlowM, carWashM);
    if (srCars.length) {
      const mk = (list, material, name) => {
        const im = new THREE.InstancedMesh(own(mergeGeos(list)), material, srCars.length);
        im.name = name; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        group.add(im); return im;
      };
      srCarMeshes = [mk(body, carBodyM, 'city-carriers'), mk(caps, carCapM, 'city-carriers-cap'), mk(glows, carGlowM, 'city-carriers-energy')];
      srDarkMesh = mk(darks, carDarkM, 'city-carriers-medallion');
      srWashMesh = mk([washQuad], carWashM, 'city-carrier-wash');
      srCarMeshes.push(srDarkMesh, srWashMesh);
      /* the recession, baked once per carrier into its instance colour */
      const _cc = new THREE.Color();
      srCars.forEach((c, i) => {
        _cc.setScalar(c.value);
        srCarMeshes.forEach(m => m.setColorAt(i, _cc));
      });
      srCarMeshes.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    }
    srStats.grades = ['deck cap near 0x93a3bd metalness 0.40', 'deck cap far 0x64799c metalness 0.24 env 0.86',
      'side near 0x8496b4 metalness 0.90', 'side far 0x566e94 metalness 0.32 env 1.05',
      'rims + washes: ONE material each, hue from the Theme, per-tier brightness on the vertices',
      'carriers: one instance colour per tier carries their recession (windowGrid\'s own mechanism)'];
    /* One hook for everything this section lights. It follows the district's existing curve exactly
       — energy lines and rail lights are already dimmed x0.3 by day here — so a sky road never
       becomes the one thing in the city that ignores the clock. setTheme calls setTime, so the hue
       is re-copied from themeCol on both paths and there is no second entry point to keep in step. */
    srSetTime = d => {
      srRimM.color.copy(themeCol).multiplyScalar(1 - 0.7 * d);
      srWashM.color.copy(themeCol); srWashM.opacity = 0.42 * (1 - 0.7 * d);
      carGlowM.color.copy(themeCol).multiplyScalar(1 - 0.7 * d);
      carWashM.color.copy(themeCol); carWashM.opacity = 0.50 * (1 - 0.7 * d);
    };
  }

  /* The district ground: an annulus from the plaza slab's edge out to the horizon. It stops at 620 m
     now rather than 900 — beyond that the terrain module owns the world, and the city's ground plane
     must not paint over the natural land or the mountains standing behind it (§10, §41). */
  const ground = new THREE.Mesh(own(new THREE.RingGeometry(126, 620, 72, 1)), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08; ground.name = 'city-ground'; ground.frustumCulled = false; group.add(ground);

  /* ---------------------------------------------------------------- merges and instances */
  const merged = (list, material, name, shadow) => { if (!list.length) return null; const m = new THREE.Mesh(own(mergeGeos(list)), material); m.name = name; if (shadow) m.castShadow = true; group.add(m); return m; };
  merged(B.structural, structuralM, 'city-structure', true);      /* block bodies, setbacks, decks, pylons — the only shadow casters */
  merged(B.composite, compositeM, 'city-composite', false);
  /* the whole district's platinum frame in three meshes: fifteen blocks' worth of base courses,
     spandrel courses, pilasters, reveals and parapet bands (vertical), their piers (vertical, brushed)
     and their sills, copings and terrace decks (horizontal, low metalness) */
  merged(B.platMid, platMidM, 'city-frame', false);
  merged(B.platPier, platPierM, 'city-frame-piers', false);
  merged(B.platLit, platCapM, 'city-frame-caps', false);
  merged(B.trim, trimM, 'city-rails', false);
  merged(B.strips, stripMat, 'city-energy-lines', false);
  merged(B.whites, whiteMat, 'city-static-lights', false);
  /* the district's colour, in three meshes — one per hue, never one per building (law 5) */
  merged(B.violet, accentM.violet, 'city-accent-violet', false);
  merged(B.blue, accentM.blue, 'city-accent-blue', false);
  merged(B.cyan, accentM.cyan, 'city-accent-cyan', false);
  /* and the light those emitters actually throw: two interior temperatures and, because the hue rides
     on the vertices, all three accent washes together. Five meshes for the whole district's response. */
  merged(B.spillWarm, spillWarmM, 'city-window-spill-warm', false);
  merged(B.spillCool, spillCoolM, 'city-window-spill-cool', false);
  merged(B.accWash, accentWashM, 'city-accent-wash', false);
  /* THE SHAFTS THAT DO NOT END: four meshes, one per value band, carrying six shafts' segments AND all
     seventy-eight of their belts. Vertical aerial perspective for four draw calls. */
  merged(B.shaft0, shaftBand[0], 'city-shaft-band-0', false);
  merged(B.shaft1, shaftBand[1], 'city-shaft-band-1', false);
  merged(B.shaft2, shaftBand[2], 'city-shaft-band-2', false);
  merged(B.shaft3, shaftBand[3], 'city-shaft-band-3', false);
  /* THE CRYSTAL. Three instanced meshes carry the whole district's shards; the fourteen transmissive
     ones on the four nearest blocks are merged into a fourth. Four draw calls, and — the number that
     actually matters — ONE transmissive material in the scene, so three renders its extra pass once. */
  instanced(shardGeo.blade, shardFacetM, shardI.blade, 'city-shards-blade');
  instanced(shardGeo.crystal, shardFacetM, shardI.crystal, 'city-shards-crystal');
  instanced(shardGeo.cluster, shardFacetM, shardI.cluster, 'city-shards-cluster');
  merged(B.shardClear, shardClearM, 'city-shards-clear', false);
  instanced(unitKit, compositeM, kitBoxes, 'city-roof-kit');
  instanced(own(new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1)), trimM, kitMasts, 'city-masts');
  instanced(discGeo, platCapM, decks, 'city-decks');   /* saucer terraces and shaft collars: horizontal, so the LIT grade (law 1) */

  /* ---------------------------------------------------------------- time, theme, motion */
  const themeCol = new THREE.Color(theme.energy), whiteCol = new THREE.Color(WHITE);
  let last = { daylight: 0 };
  function setTime(s) {
    last = s || last; const d = Math.max(0, Math.min(1, last.daylight || 0));
    /* the district reads as a lit city but never outshines the three destinations in front of it:
       windows sit at ~60 % of full at night and 18 % by day (brief §08 window variety, §45 hierarchy) */
    winMat.color.setScalar(0.18 + 0.44 * (1 - d));
    /* both window materials are neutral DIMMERS now: the warm/cool hue lives on the grid instances,
       so time of day may only change how much light is coming out, never what colour it is */
    glassFaceMat.color.setScalar(0.26 + 0.56 * (1 - d));           /* the glazed blocks read as lit interiors at night, as glass by day */
    stripMat.color.copy(themeCol).multiplyScalar(1 - 0.7 * d);     /* strips / rail lights: day × 0.3 */
    whiteMat.color.copy(whiteCol).multiplyScalar(0.35 + 0.65 * (1 - d));
    /* a spill is the light a window is throwing, so it fades with the window rather than on its own
       curve — and by day it nearly vanishes, because sunlight is what a room's own light loses to */
    spillWarmM.opacity = 0.44 * (1 - 0.72 * d);
    spillCoolM.opacity = 0.40 * (1 - 0.72 * d);
    accentWashM.opacity = 0.50 * (1 - 0.66 * d);
    if (srSetTime) srSetTime(d);        /* the sky roads' rims, their washes and the carriers */
    return last;
  }
  function setTheme(t) { if (t && t.energy != null) themeCol.setHex(t.energy); setTime(last); return t; }
  /* piecewise-eased traverse: constant speed with short ramps at both ends */
  function ramp(k) { const a = 0.12; return k < a ? k * k / (2 * a * (1 - a)) : k > 1 - a ? 1 - (1 - k) * (1 - k) / (2 * a * (1 - a)) : (k - a / 2) / (1 - a); }
  const podLocal = new THREE.Matrix4();
  function update(t) {
    if (pod) {
      const cycle = 2 * (pod.travel + pod.dwell), ph = t % cycle;
      let u;
      if (ph < pod.travel) u = ramp(ph / pod.travel);
      else if (ph < pod.travel + pod.dwell) u = 1;
      else if (ph < 2 * pod.travel + pod.dwell) u = 1 - ramp((ph - pod.travel - pod.dwell) / pod.travel);
      else u = 0;
      podLocal.makeTranslation(-pod.half + 2 * pod.half * u, pod.y, 0);
      pod.mesh.matrix.multiplyMatrices(pod.frame, podLocal); pod.mesh.matrixWorldNeedsUpdate = true;
    }
    if (elevator) {
      const e = elevator;
      if (e.next < 0) { e.next = t + 2.0; e.mesh.position.y = e.base; }
      else if (t < e.t1) e.mesh.position.y = e.from + (e.to - e.from) * smooth((t - e.t0) / (e.t1 - e.t0));
      else if (t >= e.next) {
        let f = e.floor + e.dir * (1 + Math.floor(e.R() * 3));
        if (f >= e.floors) { f = e.floors; e.dir = -1; } else if (f <= 0) { f = 0; e.dir = 1; }
        e.from = e.mesh.position.y; e.to = e.base + f * FLOOR; e.floor = f; e.t0 = t;
        e.t1 = t + Math.max(0.8, Math.abs(e.to - e.from) / 2.4); e.next = e.t1 + 2.5 + e.R() * 3;
      }
    }
    /* ---- THE SKYBLOCK CARRIERS. One matrix per carrier per frame, composed into module-level
       scratch and written to the five instanced meshes — nothing here allocates. The ride is a
       ping-pong with a dwell at each end, eased by this file's own `ramp`, which is the same motion
       language the walkway's rail pod already speaks; a carrier that looped and snapped back to its
       start would read as a texture rather than as a vehicle. The block is symmetrical along its
       travel axis, so the return leg needs no turn-around and gets none. */
    if (srCarMeshes) {
      for (let ci = 0; ci < srCars.length; ci++) {
        const c = srCars[ci], cyc = 2 * (c.travel + SR_CAR.dwell);
        let ph = (t + c.phase * cyc) % cyc; if (ph < 0) ph += cyc;
        let u;
        if (ph < c.travel) u = ramp(ph / c.travel);
        else if (ph < c.travel + SR_CAR.dwell) u = 1;
        else if (ph < 2 * c.travel + SR_CAR.dwell) u = 1 - ramp((ph - c.travel - SR_CAR.dwell) / c.travel);
        else u = 0;
        const f = u * (SR_MOT - 1), i0 = Math.min(SR_MOT - 2, Math.floor(f)), k = f - i0, o = i0 * 6, o2 = o + 6;
        const m = c.mot;
        _srCarP.set(m[o] + (m[o2] - m[o]) * k, m[o + 1] + (m[o2 + 1] - m[o + 1]) * k, m[o + 2] + (m[o2 + 2] - m[o + 2]) * k);
        _srCarE.set(m[o + 4] + (m[o2 + 4] - m[o + 4]) * k, m[o + 3] + (m[o2 + 3] - m[o + 3]) * k, m[o + 5] + (m[o2 + 5] - m[o + 5]) * k, 'YXZ');
        _srCarQ.setFromEuler(_srCarE);
        _srCarM.compose(_srCarP, _srCarQ, _srCarS);
        for (let mi = 0; mi < srCarMeshes.length; mi++) srCarMeshes[mi].setMatrixAt(ci, _srCarM);
      }
      for (let mi = 0; mi < srCarMeshes.length; mi++) srCarMeshes[mi].instanceMatrix.needsUpdate = true;
    }
  }
  function setQuality(q) {
    distant.visible = !q || q.farLayers !== false;
    /* the two pieces of the sky roads a phone can lose without losing the road: the engraved
       medallion recess on a 9 m carrier at 200–500 m, and the wash it drags */
    const low = !!(q && (q.name === 'low' || q === 'low'));
    if (srDarkMesh) srDarkMesh.visible = !low;
    if (srWashMesh) srWashMesh.visible = !low;
    return distant.visible;
  }
  function dispose() {
    if (group.parent) group.parent.remove(group);
    owned.geometries.forEach(g => g.dispose()); owned.geometries.length = 0;
    owned.materials.forEach(m => m.dispose()); owned.materials.length = 0;
    owned.textures.forEach(t => t.dispose()); owned.textures.length = 0;   /* the wash map is this module's own canvas, not one of materials.js's cached ones */
  }

  /* cost bookkeeping (what the establishing view can at most draw from this module) */
  group.traverse(o => { if (o.isMesh && o.geometry) { const g = o.geometry, n = g.index ? g.index.count : g.attributes.position.count; stats.triangles += Math.round(n / 3) * (o.isInstancedMesh ? o.count : 1); stats.drawCalls++; } });
  stats.materials = ['tower families: platinum / glass / graphite / violet', 'structural', 'composite', 'trimSatin', 'block frame: platinumMid / platinumMidBrushed (vertical) + platinumMidLit (horizontal)', 'MeshBasic: windows / curtain / energy lines / lights / 3 distant bands + 1 ghost band / ground', 'accent: accentViolet (left) / accentBlue (centre) / accentCyan (right)', 'wash: warm spill / cool spill / accent (vertex-coloured)', 'shards: M.shardFacet (instanced, the many) + M.shardClear (merged, 14 near) — NO shardHero in this district', 'shafts: four value bands stepping toward the night sky',
    'sky roads: deck cap near/far (metalness 0.40 / 0.24, LAW 1) + side near/far (0.90 / 0.32, vertical only) + 1 vertex-tinted rim + 1 vertex-tinted wash',
    'carriers: body / cap / medallion / energy / wash, five instanced meshes for nine carriers, recession on the instance colour'];
  stats.districtHues = ACCENT_DISTRICT;
  /* v9 bookkeeping: the shard budget and the four mechanisms the vertical depth is built from */
  stats.shards = { facet: stats.shardsFacet, clear: stats.shardsClear, hero: 0,
    grades: 'shardFacet instanced in 3 archetypes (3 draw calls) + shardClear merged (1); shardHero belongs to the destinations and the plaza',
    where: ['slot glazing (slotted)', 'setback outcrop (stepped)', 'terrace fan + podium corner (podium)', 'corner emergence (every block)', 'fracture run across every glazed elevation', 'accent gesture crystal (6 blocks)', 'megatall setback (6 towers)'] };
  stats.verticalDepth = ['6 shafts, 560-720 m, no crown — their tops leave the establishing and in-world frames',
    '4 value bands per shaft stepping DOWN toward the night sky (vertical aerial perspective)',
    stats.shaftBelts + ' belts at spacing that compresses toward the top',
    stats.ghosts + ' ghost shafts at 650-860 m whose tops dissolve into the fog'];
  stats.lights = 0;   /* this module adds no THREE light: every emitter here answers through geometry (§04, §05) */
  stats.massings = BLOCKS.reduce((o, s) => { const k = MASSING_OF(s.id); o[k] = (o[k] || 0) + 1; return o; }, {});
  stats.towerFamilies = Object.keys(byArch).reduce((o, k) => { const f = k.split('|')[1]; o[f] = (o[f] || 0) + byArch[k].length; return o; }, {});
  stats.valleys = ['52-72 deg right', '108-124 deg centre', '128-142 deg left'];
  /* v13 §8 — the sky-road network, reported from what was MEASURED during the build rather than
     from what was intended. horizontalArea is the world-space area of every face the by-normal
     router put in the LOW-metalness bucket; if it were ever routed to a mirror grade that number is
     exactly how much of this district would render black. */
  srStats.deckArea = Math.round(srStats.deckArea);
  stats.skyRoads = {
    roads: srStats.roads, tiers: srStats.tiers, carriers: srStats.carriers,
    deckTopArea: srStats.deckArea + ' m2 (nominal deck footprint)',
    horizontalArea: { up: +srStats.upArea.toFixed(2), down: +srStats.downArea.toFixed(2), grade: 'platinum-class LOW metalness only: 0.40 near / 0.24 far — never a mirror (LAW 1)' },
    verticalArea: +srStats.sideArea.toFixed(2),
    supports: { columnsOntoRoofs: srStats.columns, bracketsToFlanks: srStats.brackets, groundPiers: srStats.piers,
      stationsSearched: srStats.stations, stationsWithNothingInReach: srStats.unsupported },
    tallestPier: +srStats.tallestPier.toFixed(1) + ' m',
    longestClearSpan: +srStats.maxSpan.toFixed(1) + ' m on ' + srStats.maxSpanAt,
    steepestGrade: (srStats.maxGrade * 100).toFixed(1) + ' %',
    composition: { minBearingMarginToAValley: +srStats.minBearingMargin.toFixed(2) + ' deg',
      maxElevationAtEstablishingCamera: +srStats.elevMax.toFixed(2) + ' deg',
      maxElevationInsideTheMoonsBearingBand: +srStats.elevMoon.toFixed(2) + ' deg, against a moon whose lower limb over a legal corridor is never under 24.4 deg',
      moonGuard: 'sampled from sky.js hour by hour: bearing 61-113, elevation 21-30.5 deg, disc 4.15 deg. Its two lowest positions (61.4 and 112.6 deg) fall inside valleys this network already avoids; over the legal 74-106 corridor its lower limb is 24.4 deg or higher',
      collisions: srStats.collisions },
    lightPools: srStats.pools, grades: srStats.grades, carrierSize: srStats.carrierSize,
    support: srStats.supports
  };
  setTime(ctx.clock && typeof ctx.clock.state === 'function' ? ctx.clock.state() : last);
  update(0);
  return { group, setTime, setTheme, update, dispose, stats, setQuality, anchors: { paths: anchors.paths.filter(p => /^city-/.test(p.id)), pads: anchors.pads.filter(p => /^city-/.test(p.id)) } };
}
