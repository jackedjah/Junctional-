/* MAHWORLD :: MONUMENT — "HIGHER TOGETHER", the plaza's hero public art
   ============================================================================================

   Two colossal MAHBEING figures, Mr. Mah and Mrs. Mah, standing side by side on a tiered circular
   plinth, with a vertical MAHGIC light column rising between them out of the stone and carrying a
   glowing SQUARE DIAMOND above the pair, on up into the sky.

   ---- THE SPECIES IS NOT SCULPTED HERE, AND THAT IS THE WHOLE POINT --------------------------
   residents.js is the species authority in code. It already builds the canonical MAHBEING —
   square-diamond head with its dark facial chamber and two eyes, a muscular humanoid upper body,
   and ONE CONTINUOUS TEARDROP BELOW THE WAIST WITH NO LEGS. The concept renders appear to give
   the figures legs; they do not have any, and the species sheet outranks the concept art. So this
   module does not model a body at all, and — after one very expensive lesson — it does not re-grade
   one either. It calls createResident() twice at monument scale and LEAVES THE RESULT ALONE.
   Species compliance is then true by construction rather than by inspection, and it stays true if
   residents.js is ever re-sculpted.

   ---- THE FIRST CUT OF THIS FILE RENDERED TWO FACELESS TORSOS -----------------------------------
   Recorded in full, because the stats block said it had succeeded. That cut asked for the `guard`
   pose — the only pose whose arms survive residents.js's internal merge as addressable nodes, and
   therefore the only way to raise an arm from outside — and then pushed every triangle of both
   statues through this module's LAW 1 normal splitter into three flat platinum grades.

   Two things died there, and only a render showed either of them:
     · THE VERTEX COLOURS ARE THE SPECIES. residents.js paints the dark facial chamber, the two
       eyes and the energy accents as per-vertex colour on a white base material. The splitter
       copies positions and normals and nothing else, so the faces went. The heads were present in
       the geometry the whole time — the statues were not headless, they were FACELESS, which from
       44 m is the same picture and a much more misleading stats line.
     · A 27 m BODY IS THE WRONG PLACE FOR A MIRROR. The `steep` grade was M.chromeMirror, metalness
       1.0, roughness ~0. On the ~536-triangle facet cut of a `near` resident that gave every facet
       a hard, uncorrelated environment sample: black and white zigzag, and the arms read as blocks
       floating clear of the shoulders because neighbouring facets were three stops apart.

   BOTH ARE NOW MOOT, AND MEASURABLY SO. residents.js's own materials are `body` metalness 0.22,
   `dark` 0.50, `light` 0.18 — every one of them below the ~0.9 at which LAW 1 bites, because below
   that a surface still takes diffuse light and an up-facing face is lit rather than black. The
   statues are therefore already correct and the right action is to keep them exactly as built.
   stats.law1.figures reports the material list, the measured maximum metalness and whether LAW 1
   applies at all, so this is a measurement and not a claim.

   WHAT residents.js GAVE AND WHAT IT DID NOT (recorded honestly, because the next pass will ask):
     · THE ARMS ARE AT REST. Keeping the faces means taking `stand`, and under `stand` mergeStatic()
       bakes every mesh into the body group, so the arms are not addressable and CANNOT be posed
       from here. The raised-arm gesture of the concept render is therefore not in this build. The
       piece is composed the other way instead — the light column carries the diamond above the pair
       — which is an honest composition rather than a broken arm. To get the gesture back,
       residents.js needs a new `present` pose: drivable arms, no fighting lean, and
       headPivot.userData.animated = true so the head survives as its own node. That is a small edit
       to the species authority and it belongs in that file, not in this one.
     · DETAIL. `near` is the top tier and it is SEG 10 on the body lathes (LODS.near.seg 14, minus
       the builder's own -4), 536 triangles for a whole figure. At 27 m that is a facet roughly
       2 m across. That is not a defect — §06 asks for big designed facets and forbids subdividing
       toward a smooth ball — but it is the ceiling, and a finer cut would need a new LOD tier or a
       `seg` override in residents.js.

   ---- LAW 1: ORIENTATION DECIDES GRADE, AND IT IS MEASURED ------------------------------------
   A metal takes no diffuse light. At metalness >= 0.9 a surface is lit ONLY by scene.environment,
   whose horizon is bright and whose zenith is near black, so a VERTICAL face in a mirror grade
   reads and an UP- or DOWN-FACING one renders BLACK. This project has shipped that defect four
   times, the last one on a crown cap band routed into a mirror bucket by NAME.

   Nothing here is routed by name. EVERY opaque triangle THIS MODULE PRODUCES — every plinth
   course, both figure seats, the diamond's edge catches — goes through one splitter that measures
   the triangle's OWN normal and sends it to one of three grades:

       |ny| <= 0.50   (face within 30 deg of vertical)   the mirror / steep grade for its role
       ny  >  0.50    (up-facing)                        M.platinumLit      metalness 0.38
       ny  <  -0.50   (down-facing)                      M.platinumMidLit   metalness 0.40

   0.50 is deliberately stricter than foblock.js's "more vertical than horizontal" 0.707. The
   reason is optical: a camera ray hitting a face tilted t off vertical reflects at roughly 2t
   above the horizon, so a 45 deg face (|ny| 0.707) is already looking at the zenith and a 30 deg
   face is at 60 deg elevation. 0.50 keeps the mirror grade on faces whose reflection is still in
   the lit half of the sky. The measured result is in stats.law1 and in the pass report; the
   mirror bucket's own maximum |ny| is measured after the fact and asserted nowhere.

   THE FIGURES ARE THE EXCEPTION, AND THE REASON IS THE LAW ITSELF. A statue's shoulders, deltoids,
   forearm tops and the crown of its head are horizontal faces as surely as a roof is — which is
   exactly why the first cut split them, and exactly why it was wrong to. The law only bites at
   metalness >= ~0.9, and residents.js grades its own species at 0.22 / 0.50 / 0.18. Below 0.9 the
   surface still takes diffuse light, so those up-faces are lit, not black, and there is nothing for
   a splitter to fix. Splitting them anyway cost the faces (see above). The statues therefore keep
   residents.js's grades untouched and stats.law1.figures measures that they are safe rather than
   assuming it. The diamond's light lands on them for the same reason (LAW 2, below) — a pure
   mirror statue would have ignored its own light source, and this one is not a mirror.

   ---- LAW 2: EVERY EMITTER IS ANSWERED --------------------------------------------------------
   Two emitters: the diamond core and the light column. Three answers, all of them adjacent
   geometry actually changing value:
     1. ONE PointLight at the diamond centre, themed and clock-driven. It is what makes the low-
        metalness up-faces of both figures, the platinum nosings of all three plinth courses and
        the paving-grade treads model from ABOVE instead of being flat-lit by the environment.
     2. ctx.lightPool() on the deck under the plinth — ground.js's own instrument, in the
        emitter's hue, wide and soft. (Measured before writing this: 12 of the 32 themed pool
        slots were claimed after ground + buildings + dressing, so this one is not dropped.)
     3. The plinth's mirror bands and platinum nosings stand directly under the column and take
        its point light at grazing incidence, which is what gives the base a lit contact line
        rather than a silhouette.

   ---- COMPOSITION: WHY IT STANDS WHERE IT STANDS ----------------------------------------------
   Centre (0, -6.5), behind the MAHPLAZA marker, dead on the plaza's own axis. THE FOOTPRINT WAS
   MEASURED AGAINST ctx.colliders, not guessed, the way fobstations.js does it — and the radius is
   not a free choice. Three things bound it:
     · ground.js's existing plaza-monument collider, x +-3.8 / z 3.2..10.8, 5.2 m north of centre;
     · the plaza-dressing fixture cluster around (-8, 0);
     · the `match-approach` camera, which stands at (1.4, 1.9, -18) — 11.6 m away.
   The largest circle that clears all three is 9.13 m. The base course is 8.55 m, which the build
   re-measures as 0.61 m of stone margin (stats.clearance) and leaves the match-approach camera
   2.4 m outside this module's own collider. Neither number is trusted from this note; both are
   measured at build time against whatever ctx.colliders actually holds.

   That cap is also why the FIGURES are 27.0 m and 26.6 m rather than the 45-72 m a literal reading
   of the concept render would give. A MAHBEING's shoulder half-width is 0.328 of half its height,
   so a 50 m pair would be 44 m across the shoulders and would need a base of roughly 25 m radius —
   which does not exist at the centre of this plaza, and whose edge would swallow the match-approach
   camera whole. The assembled piece still stands taller than MAH MATCH's 38 m mass and is the
   tallest thing on the plaza, with the light column running out of the top of every frame above
   that. It is colossal by the only measure that counts, which is what it is colossal NEXT TO. The
   exact figure is not written here: stats.height is measured off the built group every time, and a
   hard-coded height in a comment is a number that goes stale the first time a course moves.

   THE PIECE IS COMPOSED AS A GATE RATHER THAN A WALL, and this was TESTED rather than hoped for.
   The three approaches themselves stay open — nothing of this module lies on the -x or +x
   corridors, and the two cameras that face MAH MATCH from its own approach (`match-approach` at
   z -18 and `match-entrance` at z -58) both stand BEHIND the monument, which is not in their
   frames at all. What is in frame is MAH MATCH seen over and between the figures from the arrival
   side, so the clear air between them was measured by raycast at the heights the sightlines
   actually use: 6.6 to 8.7 m across the band the MATCH sign is read through. With the arms now at
   rest that gap no longer closes at all below the diamond, which widens the gate — the occlusion
   figures below were measured on the raised-arm cut and are therefore an UPPER bound on the
   current one, not a current reading.

   THE RESIDUAL IS REAL AND IS NOT TALKED AWAY. Raycasting the whole monument against MAH MATCH's
   signage measures, from `establishing`: 39 % of the sign frame occluded and 0 % of the canonical
   mark; from `in-world`: 29 % and 4 %; from `overlook`: 4 % and 0 %. Widening the figures from
   +-6.0 m to +-6.6 m and the plinth's upper courses to match is what took the arrival figure from
   53 % to 39 %, at the cost of 0.6 m more shoulder overhang. A monument at the centre of a plaza
   stands in front of the building behind it; that is what a monument is. But 39 % is a composition
   trade and not a law, and the director should rule on it — the levers are FIGURES[].x with the
   COURSES radii, which move together.

   Nothing is placed within the base radius plus a margin, which is the negative space §5 asks for,
   and a collider is registered so the camera dolly and every later placement test keep out of it.

   ---- THE WATER --------------------------------------------------------------------------------
   The reference cascades water down the plinth faces. Water is a horizontal mirror, and at night a
   horizontal mirror returns the near-black zenith — it would have cost a transmissive pass to
   render a black ring. The permitted cheaper reading is taken instead: a STILL REFLECTIVE BAND,
   which here is the lower two courses' risers in mirror grade. Those are VERTICAL, so they return
   the lit horizon band and read as a polished sheet of standing water in a channel, which is what
   the reference's water actually looks like once it has fallen.

   ---- THE INSCRIPTION --------------------------------------------------------------------------
   "HIGHER TOGETHER" is the only text in this module and it is quoted from the reference. It is set
   with materials.js's own BRAND constants — Space Grotesk, title weight 700, title tracking .08em,
   BRAND.title cream, uppercase — and with the canonical centring rule (a tracked run is measured
   WITHOUT its trailing letter-space, fob.css:3975). Nothing about the letterform is invented and
   no second line, slogan, sub-line or facility name is added. Four repeats around the top course,
   phase-offset so one faces the arrival and the other three face the GYM, MARKET and MATCH
   approaches.

   ---- AERIAL PERSPECTIVE: WHY THERE IS NONE HERE, MEASURED --------------------------------------
   city.js's glassFar/glassDeep and fobstations.js's RECEDE table exist because distance must buy
   VALUE, and this world has shipped the inverse three times. The rule still holds; it just does not
   fire on this object. The distance from every camera in mahplaza.js's VIEWS to the monument's
   centre was measured: 90.5 m from `establishing`, 46.6 m from `in-world`, 11.6 m from
   `match-approach`, 74.8 m from `overlook`, and no view further than 90.5 m. fobstations.js's first
   RECEDE band runs 0-260 m at envMapIntensity 1.00 with no tint, so every camera in this world sees
   this piece inside the near band and no recession is warranted. The scene fog (near 60, far 760)
   supplies the small amount that 90 m earns, automatically and consistently with everything else.

   The inverse risk — a near object out-valuing a far one — is the correct ordering here and is
   deliberate: the monument is the nearest large object to every plaza camera and it is the hero, so
   it SHOULD out-value MAH MATCH 74 m behind it. Nothing in this module reaches above the top of the
   existing material ladder: the mirror grade is M.chromeMirror at its shipped envMapIntensity 2.7,
   unmodified and unshared-copied, and no material is cloned brighter.

   Cost: the two figures are POSED, then BAKED — their 22 live meshes are merged by grade into the
   module's shared buckets and the source groups are disposed, so both statues together cost three
   draw calls and update() touches nothing. Two meshes are registered for the deck reflection (the
   mirror grade and the diamond core) and the 200 m column deliberately is not. ONE PointLight is
   added, taking the scene from 11 to 12. Determinism: no Math.random, no Date.now.
   No addons; three r185 core only; all geometry and all textures procedural. */

import * as THREE from '../vendor/three/three.module.min.js';
import { createResident } from './residents.js';
import { canvasTexture, chamferBox, cutGem, gemGirdle, GEM, BRAND } from './materials.js';
import { CAMPUS } from './campus-plan.js';

/* the one number the campus plan owns about this piece: how large the civic symbol is allowed to be
   in an open quad. Read once, used everywhere below, never re-typed. */
const CIVIC_S = CAMPUS.CIVIC.scale;

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const DECK_Y = 0.17;               /* ground.js FLOOR_TOP — the plaza deck everything stands on */

/* WHERE IT STANDS. See the header: this is the measured centre of the largest circle behind the
   MAHPLAZA marker that clears ground.js's centrepiece, the dressing cluster and the approach
   camera. The module re-measures the clearance at build time and reports it. */
/* ---- CAMPUS RECONSTRUCTION: THE CIVIC SYMBOL, NOT THE OBSTRUCTION ------------------------------
   The reconstruction master is explicit twice over. §1: "Remove, relocate, or dramatically reduce
   the current giant Mr./Mrs. monument. It currently blocks sightlines." §18: "The current huge
   statues should not remain as-is... Never again use giant low-fidelity approximations."

   It is NOT removed, and the reason is in the same section. §1 permits the quad "a small refined
   civic symbol" and lists what a surviving Mr./Mrs. piece must be: canonical character geometry,
   platinum/liquid-silver material, small enough to preserve openness, placed as refined civic art.
   The material half of that was done in the pass before this one — the figures now render as
   polished platinum at 77 against a frame mean of 62, measured, not asserted. What was still wrong
   was the SIZE, and only the size: a 34 m piece standing at the centre of what is now a 192 m quad.

   So it stays on the axis, where a campus memorial belongs and where the master wants the quad's
   orientation landmark, and it comes down to 0.32 — roughly 11 m to the crystal, a piece a person
   can walk up to and stand next to rather than one that fills the arrival frame. The scale is a
   GROUP transform rather than fifteen edited constants, because every proportion inside this module
   was tuned against every other one (the plinth courses pin FIGURES[].x, which pins the column's
   waist, which was measured off the built statues) and re-deriving that chain by hand is how a
   careful piece of geometry gets quietly broken.

   THREE THINGS DO NOT SCALE WITH A GROUP and are corrected explicitly below: the collider, which is
   added to the scene in world coordinates; the deck light pool, whose radius is passed to ground.js
   as a number; and the key light, whose `distance` is in world units — a 78 m falloff around an 11 m
   sculpture would light the whole quad from inside the statue. */
const SITE = { x: 0, z: 0 };

/* THE PLINTH. Three stepped courses, broadest at the bottom, each one rounded in plan (28 sides)
   and blunted at every arris with a two-turn nosing rather than a single sharp edge — §06's own
   technique. `mirror` marks the courses whose risers carry the still reflective band. */
const COURSES = [
  { r: 8.55, h: 1.30, batter: 0.10, mirror: true },
  { r: 8.10, h: 0.95, batter: 0.08, mirror: true },
  { r: 7.75, h: 1.25, batter: 0.00, mirror: false }    /* the inscription course */
];
const SIDES = 28;                  /* plan facets: round silhouette, cut surface */
const FOOT_IN = 0.24, FOOT_H = 0.18;   /* the flare each course sits on */

/* THE TWO FIGURES. `x` is metres either side of the monument's axis, and it MOVES WITH the COURSES
   radii above: each terminal point stands in a 0.72 m seat, so |x| + 0.72 must stay inside the top
   course's table (COURSES[2].r - 0.22 = 7.53). The species sets the lower bound — a MAHBEING's
   shoulder half-width is 0.328 of half its height, so below about +-5.9 m the two shoulder caps
   would intersect. +-6.6 is the measured value that keeps them shoulder to shoulder while opening
   the widest sightline to MAH MATCH the plinth allows; see the header's occlusion numbers.
   Mr. Mah takes the -x side, which is the viewer's left from the arrival camera. */
const FIGURES = [
  { key: 'mr',  sex: 'm', height: 27.0, x: -6.6, seed: 11 },
  { key: 'mrs', sex: 'f', height: 26.6, x: 6.6, seed: 23 }
];
const PHYSIQUE = 0.9;              /* hero end of residents.js's untrained -> hero blend */

/* THE SQUARE DIAMOND — the brand figure, and §06's one exemption from blunting: it keeps its
   points. Half-extents in metres; the height ratio is ground.js's monument crystal, so the two
   diamonds on this plaza are the same gem at two scales. */
const DIA = { w: 3.30, h: 5.10, d: 1.85 };

/* THE CUT, THE GIRDLE AND THE SPIN all live in materials.js now — see the note at cutGem() there.
   They were written here first, and then ground.js turned out to hold the OTHER brand diamond, built
   the same wrong way, and the one an arrival camera actually looks at. Two files cutting the same
   gem two ways is precisely how the pair drifted apart to begin with (L42), so the cut moved into
   the kit and both stones call it. What stays here is the one thing that is genuinely local: how
   big this particular stone is, how high above the figures it is held, and how bright its halo
   burns — a gem 38.9 m up in open sky needs a different alpha from one standing at head height on
   the deck, which is exactly why THIS number did not follow the cut into materials.js. */
const GEM_AURA_A = 0.11;

/* THE LIGHT COLUMN. Rises from inside the plinth, through the diamond, and fades out at height.
   y0 sits BELOW the top course's tread, which is opaque, so the shaft appears to come out of the
   stone rather than to begin in mid-air.

   IT HAS A WAIST, AND THE WAIST IS NOT A FLOURISH. The corridor it has to thread is measured at
   build time, on the statues as actually built, and reported as stats.axisClearance — the smallest
   distance from the monument axis to any vertex of either figure. It is NOT written down here: the
   number this note used to carry was taken off raised forearms that no longer exist, and a stale
   measurement in a comment is worse than no measurement at all. The shaft is a 0.44 m thread from
   the plinth up past the shoulders, keeps that until `knee`, and only then opens to 0.95 m at the
   crystal, which now clears the figures by a wide margin because the arms hang at the sides; the
   build reports the margin as stats.columnGap and flags a violation into stats.skipped rather than
   trusting prose. The profile is [fraction of the run, radius, alpha]; `at` is the diamond's own
   fraction, filled in at build time so the bloom cannot drift off the crystal it comes out of. */
const COLUMN = { y0: 2.20, y1: 200, sides: 12, waist: 0.44, bloom: 0.95, knee: 0.86 };

/* THE INSCRIPTION BAND on the top course. `h` fits inside that course's STRAIGHT riser — between
   the foot flare and where the nosing starts turning — so the lettering never runs off a chamfer.
   The top course is 1.25 m tall for exactly this reason and for no other. */
const BAND = { h: 0.72, cap: 0.58, repeats: 4, proud: 0.045 };

/* LAW 1. A face whose normal is more than 30 degrees off vertical takes the low-metalness partner.
   See the header for why this is stricter than foblock.js's 0.707. */
const LEVEL_COS = 0.50;

/* ------------------------------------------------------------------ buckets and the LAW 1 split */

/* Five opaque grades. `steep` is the only one a role gets to choose; `up` and `down` are fixed,
   because that is the entire content of LAW 1. */
const ROLES = {
  figure: { steep: 'mirror', up: 'lit', down: 'litDown' },
  water:  { steep: 'mirror', up: 'lit', down: 'litDown' },
  gem:    { steep: 'mirror', up: 'lit', down: 'litDown' },
  edge:   { steep: 'lit', up: 'lit', down: 'litDown' },
  stone:  { steep: 'stone', up: 'tread', down: 'tread' },
  tread:  { steep: 'stone', up: 'tread', down: 'tread' }
};

function newBuckets() {
  const b = {};
  for (const k of ['mirror', 'lit', 'litDown', 'stone', 'tread']) b[k] = { pos: [], nor: [], area: 0, level: 0, maxNy: 0, up: 0, down: 0 };
  return b;
}

/* Push ONE triangle into the grade its own measured normal earns it. Every opaque surface in this
   module goes through here; nothing is bucketed by name. Areas are accumulated in the same pass so
   the LAW 1 audit is a measurement of what was built, not a second guess at it. */
function pushTri(B, role, a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-9) return;
  nx /= len; ny /= len; nz /= len;
  const r = ROLES[role] || ROLES.stone;
  const key = ny > LEVEL_COS ? r.up : ny < -LEVEL_COS ? r.down : r.steep;
  const t = B[key];
  t.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  t.nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  const area = len * 0.5;
  t.area += area;
  if (Math.abs(ny) > 0.985) t.level += area;     /* within 10 degrees of dead level */
  if (Math.abs(ny) > t.maxNy) t.maxNy = Math.abs(ny);
  /* THE SIGN, NOT ONLY THE MAGNITUDE. An inverted winding is invisible to an area total and to
     |ny| — the face is still "horizontal", it is just facing the wrong way and culled. Both signed
     areas are carried so the audit can say that the plinth's treads face UP and the seats' tables
     face UP, which is the difference between a platinum collar and nothing at all. */
  if (ny > LEVEL_COS) t.up += area; else if (ny < -LEVEL_COS) t.down += area;
}

/* Bake an existing BufferGeometry through the splitter under a world matrix. This is how the posed
   statues and the diamond's edge catches get their LAW 1 treatment: their triangles are read out,
   transformed, and re-measured, so nothing arrives in a bucket on the strength of where it came
   from. */
const _v = new THREE.Vector3();
function bakeGeometry(B, role, geo, matrix) {
  const g = geo.getIndex() ? geo.toNonIndexed() : geo;
  const p = g.getAttribute('position');
  const tri = [null, null, null];
  for (let i = 0; i < p.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      _v.fromBufferAttribute(p, i + k);
      if (matrix) _v.applyMatrix4(matrix);
      tri[k] = [_v.x, _v.y, _v.z];
    }
    pushTri(B, role, tri[0], tri[1], tri[2]);
  }
  if (g !== geo) g.dispose();
}

/* A lathed band between two profile rings. Wound outward: for a vertical band the normal leaves
   the axis, for an inward-running tread it points up. */
function band(B, role, r0, y0, r1, y1, sides) {
  for (let i = 0; i < sides; i++) {
    const a0 = i / sides * TAU, a1 = (i + 1) / sides * TAU;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    const p00 = [c0 * r0, y0, s0 * r0], p10 = [c1 * r0, y0, s1 * r0];
    const p01 = [c0 * r1, y1, s0 * r1], p11 = [c1 * r1, y1, s1 * r1];
    /* THE APEX CASES ARE NOT THE QUAD CASE. The first cut of this file emitted (p00, p01, p11) when
       r1 was zero, which is (rim, apex, apex) — a degenerate triangle, and the whole top platform of
       the plinth silently did not exist. Measuring the built group is what caught it: `tread` came
       back at 30.6 m2 when a 7 m disc alone is 157. A count is not a geometry. */
    if (r0 <= 1e-6 && r1 <= 1e-6) continue;
    if (r0 <= 1e-6) { pushTri(B, role, p00, p01, p11); continue; }   /* closes downward-out */
    if (r1 <= 1e-6) { pushTri(B, role, p00, p11, p10); continue; }   /* closes upward-in */
    pushTri(B, role, p00, p11, p10);
    pushTri(B, role, p00, p01, p11);
  }
}

function finish(t) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(t.pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(t.nor), 3));
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------------ the inscription texture */

/* The canonical centring rule, from materials.js: tracking adds a trailing space after the last
   glyph, so the run is measured WITHOUT it and the line stays optically centred. Reproduced here
   rather than imported because materials.js keeps `spaced` private. */
function tracked(g, text, cx, y, gap) {
  let total = 0;
  for (const ch of text) total += g.measureText(ch).width + gap;
  total -= gap;
  let x = cx - total / 2;
  const align = g.textAlign;
  g.textAlign = 'left';
  for (const ch of text) { g.fillText(ch, x, y); x += g.measureText(ch).width + gap; }
  g.textAlign = align;
}

/* The engraved band. ONE phrase, quoted from the reference, in the canonical MAH typography. The
   canvas aspect is cut to the band's own physical aspect (arc length of one repeat by band height)
   so the letters are not stretched by the wrap. */
function inscriptionTexture(arcPerRepeat) {
  /* The canvas is cut to the BAND'S OWN ASPECT so the wrap cannot stretch the letterform, and it is
     capped at 2048 by scaling BOTH axes — clamping the width alone would have squeezed 17:1 type
     into 12:1 and quietly redrawn a canonical face. */
  const aspect = arcPerRepeat / BAND.h;
  const w = Math.min(2048, Math.max(512, Math.round(160 * aspect)));
  const h = Math.max(48, Math.round(w / aspect));
  const size = Math.round(h * BAND.cap);
  const t = canvasTexture(w, h, (g, cw, ch) => {
    g.clearRect(0, 0, cw, ch);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = BRAND.titleWeight + ' ' + size + 'px ' + BRAND.face;
    g.fillStyle = BRAND.title;
    tracked(g, 'HIGHER TOGETHER', cw / 2, ch * 0.5, size * BRAND.titleTracking);
  });
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(BAND.repeats, 1);
  /* half a repeat of phase so a phrase faces +z (arrival) and the other three face the GYM, MARKET
     and MATCH approaches, instead of four phrases sitting on the diagonals */
  t.offset.set(0.5 / BAND.repeats, 0);
  return t;
}

/* ------------------------------------------------------------------ the light column */

/* Hand-rolled so the beam can FADE rather than stop: alpha rides on a 4-component vertex colour,
   which is the same trick residents.js uses for its contact blob, and it is why this is not a
   CylinderGeometry. Two shells, the inner one tighter and brighter. */
function columnProfile(at, fade, waist) {
  const w = waist > 0 ? waist : COLUMN.waist, b = COLUMN.bloom, f = a => Math.pow(a, fade || 1);
  /* THE THREAD IS SUBORDINATE TO THE CRYSTAL. The first cut ran the shaft at alpha 0.80-0.86 from
     the plinth all the way to the gem, which on an additive material saturates to flat white: the
     column read as a fluorescent tube standing between the figures, at the same value as the
     FOBEAM ascent lines behind it, and the diamond it is supposed to be feeding read as the
     dimmer object. The thread now RISES into the gem — faint where it leaves the stone, brightest
     only at `at`, which is the crystal's own fraction of the run. */
  return [
    [0, w, 0], [Math.min(0.01, at * 0.1), w, f(0.30)], [at * COLUMN.knee, w * 1.12, f(0.46)],
    [at, b, 1.00], [at + 0.08, b * 0.84, f(0.62)], [0.45, b * 0.70, f(0.26)],
    [0.70, b * 0.61, f(0.09)], [1, b * 0.55, 0]
  ];
}
function columnGeometry(profile, y0, y1, sides, k) {
  const pos = [], col = [];
  const ring = (u, r) => {
    const y = y0 + (y1 - y0) * u, out = [];
    for (let i = 0; i <= sides; i++) { const a = i / sides * TAU; out.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
    return out;
  };
  const rings = profile.map(p => ring(p[0], p[1] * k)), alphas = profile.map(p => p[2]);
  const put = (p, a) => { pos.push(p[0], p[1], p[2]); col.push(1, 1, 1, a); };
  for (let s = 0; s < rings.length - 1; s++) {
    const A = rings[s], Bg = rings[s + 1], aA = alphas[s], aB = alphas[s + 1];
    for (let i = 0; i < sides; i++) {
      put(A[i], aA); put(Bg[i + 1], aB); put(Bg[i], aB);
      put(A[i], aA); put(A[i + 1], aA); put(Bg[i + 1], aB);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 4));
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------------ build */

export function buildMonument(ctx) {
  const { M, scene, reflect } = ctx;
  const group = new THREE.Group(); group.name = 'monument';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { figures: 0, courses: COURSES.length, draws: 0, triangles: 0, pools: 0, law1: {}, skipped: [] };

  /* ---- FOOTPRINT, MEASURED AGAINST ctx.colliders (fobstations.js's discipline) --------------- */
  const boxes = (ctx.colliders || []).map(c => { c.updateMatrixWorld(true); return new THREE.Box3().setFromObject(c); });
  const clearOf = (x, z) => {
    let d = Infinity;
    for (const b of boxes) {
      const dx = Math.max(b.min.x - x, 0, x - b.max.x), dz = Math.max(b.min.z - z, 0, z - b.max.z);
      d = Math.min(d, Math.hypot(dx, dz));
    }
    return d;
  };
  const baseR = COURSES[0].r;
  stats.clearance = +(clearOf(SITE.x, SITE.z) - baseR).toFixed(3);
  if (stats.clearance < 0) {
    /* A footprint that overlaps existing furniture is a defect, not a style. Report it loudly and
       keep the piece rather than silently intersecting a bench: the caller can see stats. */
    stats.skipped.push('footprint overlaps a collider by ' + (-stats.clearance).toFixed(2) + ' m');
  }

  /* ---- THE PLINTH ---------------------------------------------------------------------------- */
  const B = newBuckets();
  let y = 0;
  for (let i = 0; i < COURSES.length; i++) {
    const c = COURSES[i], R = c.r, top = y + c.h;
    const shoulderR = R - c.batter;                 /* the riser's radius where the nosing starts */
    const noseR = shoulderR - 0.16, tableR = shoulderR - 0.22;
    band(B, 'edge', R - FOOT_IN, y, R, y + FOOT_H, SIDES);            /* the flare it sits on */
    if (c.mirror) {
      /* THE STILL REFLECTIVE BAND — the water's stand-in. VERTICAL, so a mirror grade returns the
         lit horizon here instead of the near-black zenith (LAW 1, and see the header). */
      const headY = top - 0.34;
      band(B, 'water', R, y + FOOT_H, R - c.batter * 0.55, headY, SIDES);
      band(B, 'stone', R - c.batter * 0.55, headY, shoulderR, top - 0.20, SIDES);
    } else {
      band(B, 'stone', R, y + FOOT_H, shoulderR, top - 0.20, SIDES);
    }
    /* §06: the arris is blunted with TWO turns onto a small table, never one sharp edge */
    band(B, 'edge', shoulderR, top - 0.20, noseR, top - 0.05, SIDES);
    band(B, 'edge', noseR, top - 0.05, tableR, top, SIDES);
    /* the tread: the horizontal course top, running in to the next course (or across the whole
       platform on the last one). Every triangle of it is up-facing and takes the paving grade. */
    band(B, 'tread', tableR, top, i + 1 < COURSES.length ? COURSES[i + 1].r : 0, top, SIDES);
    y = top;
  }
  const plinthTop = y;

  /* THE SEATS the two terminal points stand in: a blunt platinum collar each, 0.72 m at the stone
     rising 0.30 m to a 0.30 m table — a taper that ENDS ON A FACET, §06, and the thing that stops a
     27 m figure reading as balanced on a needle. 0.72 is not free either: |x| + 0.72 has to stay
     inside the top course's table at 7.53 m, which is what pins FIGURES[].x.

     WINDING: the first cut of this wound all three triangles the other way and every seat faced
     INWARD AND DOWN — backface-culled from above, so two platinum collars would simply not have
     been there. Nothing about the stats would have said so; the sign of a normal is invisible to an
     area total, which is why the audit below now measures ny's SIGN per bucket and not just |ny|. */
  const SEAT_R = 0.72, SEAT_TOP = 0.30, SEAT_H = 0.30;
  for (const f of FIGURES) {
    const cx = f.x, cz = 0, y1 = plinthTop + SEAT_H;
    for (let i = 0; i < SIDES; i++) {
      const a0 = i / SIDES * TAU, a1 = (i + 1) / SIDES * TAU;
      const o = (a, r, yy) => [cx + Math.cos(a) * r, yy, cz + Math.sin(a) * r];
      pushTri(B, 'edge', o(a0, SEAT_R, plinthTop), o(a1, SEAT_TOP, y1), o(a1, SEAT_R, plinthTop));
      pushTri(B, 'edge', o(a0, SEAT_R, plinthTop), o(a0, SEAT_TOP, y1), o(a1, SEAT_TOP, y1));
      pushTri(B, 'edge', o(a0, SEAT_TOP, y1), [cx, y1, cz], o(a1, SEAT_TOP, y1));
    }
  }

  /* ---- THE TWO FIGURES ----------------------------------------------------------------------- */
  /* residents.js builds them, GRADES them and KEEPS them. The header records why in full; the
     short version is that the previous cut posed a `guard` rig and then pushed every triangle of
     both statues through this module's LAW 1 splitter, which discards vertex colours — and the
     vertex colours ARE the species. The dark facial chamber, the two eyes and the energy accents
     all went, metalness 1.0 landed on a 27 m faceted body, and both figures rendered as faceless
     black-and-white zigzag. Nothing in stats said so.

     residents.js's own three materials are `body` 0.22, `dark` 0.50, `light` 0.18 metalness — every
     one of them well below the ~0.9 at which LAW 1 bites, so the statues are already correct and
     the correct action here is to leave them alone. The audit below MEASURES that rather than
     asserting it, because that is the difference this module claims to make. */
  /* R170 D3 — THE STATUES ARE MADE OF WHAT THE ASCENT POD IS MADE OF.
     "Take whatever the elevator thing looks like, whatever that's made out of, put that on our
     statues." The elevator is MAH ASCENT and its pod's hull is fobeam.js's podShellMat, which is
     M.platinumLit — roughness 0.30, metalness 0.38, envMapIntensity 1.4. These two figures were
     wearing residents.js's walking-around grade: roughness 0.34, metalness 0.22, envMapIntensity
     at the palette default. Same family, one rung down, and a 27 m public monument standing at the
     centre of the world was finished like a pedestrian.

     WHAT MOVES AND WHAT DOES NOT, because both halves matter:
       · the FINISH moves — roughness, metalness and environment response come from the pod's hull,
         so the statues take the same crisp platinum the vehicle does.
       · the COLOUR does not. The body grade is white multiplied by VERTEX COLOURS, and the vertex
         colours ARE the species: the dark facial chamber, the two eyes, the energy accents. This
         module's header records that a previous pass discarded them and shipped two faceless
         black-and-white figures with nothing in stats saying so. Keeping the material white and
         moving only the finish is the whole difference between grading a statue and erasing it.
       · the `dark` and `light` grades do not move either. Those are the face and the emblem — the
         part of a MAHBEING that is not metal at all — and the direction asked about what the figures
         are MADE of, not about their faces.

     THE CLONE IS LOAD-BEARING. residents.js caches one material set per palette name and hands the
     same three objects to every resident wearing that palette; the plaza is full of them. Mutating
     the shared `body` would re-finish the entire population to match two statues. So this owns its
     own copy, keyed by the material it replaces, and hands it only to the figures it built.

     LAW 1 IS NOT DISTURBED. 0.38 is still far below the ~0.9 at which a metal stops taking diffuse
     light, so the header's reasoning holds unchanged: the up-facing shoulders, deltoids and crowns
     of both figures are still lit by the diamond's PointLight rather than rendering black, and
     stats.law1.figures below still MEASURES that rather than assuming it. It measures the new
     number, which is the point of measuring it. */
  /* ---- THE FIGURES WERE THE DARKEST LARGE OBJECT IN THEIR OWN HERO FRAME -----------------------
     Direction: "the two central figures must stop reading as dark low-poly mannequins — move them
     toward polished platinum, liquid silver, deep graphite reflections, broad bright silver
     highlight bands, controlled roughness. Bright enough to read against the city but not glowing."

     MEASURED FIRST, because "too dark" is a feeling and a material pass needs a number.
     scratchpad/valuecheck.cjs raycasts a grid and reads the RENDERED PIXEL at each hit, grouped by
     material. On `monument-close` it returned:

         monument-statue-hull   23.6 % of frame at value  33.0
         resident-platinum-dark  4.8 %             at     30.3
         (same frame, for scale)  city-tower-platinum 64.7 · facade-wash 72.3 · vital-polished 93.2
         (frame mean 49.4)

     So the hero monument rendered at ONE THIRD of the frame mean and at HALF the value of a city
     tower four hundred metres behind it. The near object was out-valued by the far one, which is
     the inversion this project keeps having to correct, and here it was on the landmark itself.

     WHERE THE VALUE HAS TO COME FROM, AND WHERE IT MUST NOT. Not from metalness: the header's LAW 1
     reasoning is exactly right and is why these figures are the module's one exception — a statue's
     shoulders, deltoids and the crown of its head are horizontal faces, and past metalness ~0.9 they
     would stop taking diffuse light and render black. So the grade stays well under that. Not from
     emissive either; the direction rules that out in the same sentence, and residents.js has already
     moved this species' emissive budget to the four places the sheet allows.

     It comes from the two levers that are actually free here:
       · ENVIRONMENT. A vertical, polished, low-roughness surface returns the lit horizon band, and
         these figures were reflecting it at 1.4 while the city's own platinum reads it at 2.0.
       · A SILVER TINT ON THE CLONE. statueGradeOf copied roughness, metalness and envMapIntensity
         and left `color` at white — so what actually shipped was residents.js's PLATINUM PALETTE
         vertex colours, whose `dark` is 0x27303d (value 48 of 255) across most of a figure's
         turned-away facets. The material multiplies colour by vertex colour, so a tint above white
         lifts the whole ladder without touching the facet PATTERN, which is canonical geometry and
         is not being redesigned. Bias it cool, which is what makes it read as silver and not chrome.

     AND THE DARK GRADE JOINS THE PASS. `-dark` was never re-finished at all — it kept residents.js's
     player grade, which is why it measured 30.3, statistically indistinguishable from the hull it is
     supposed to CONTRAST with. A figure whose lit planes and shadow planes are the same value is a
     silhouette, and that is most of what "low-poly mannequin" describes. It now takes a deep
     graphite of its own: still darker than the hull by design, so the figures have a lit side and a
     shadow side, but lifted out of the flat.

     METALNESS IS THE WRONG LEVER ON THE DARK GRADE, AND THE FIRST ATTEMPT PROVED IT. Raising `-dark`
     from 0.50 to 0.58 with a 1.35 tint made it DARKER, 30.3 to 17.4, which is the opposite of what
     more environment and more tint should do. The reason is that a metal's reflection is tinted by
     its own base colour, and this one's base is 0x27303d — so metalness trades away diffuse light
     the PointLight was actually delivering, in exchange for a reflection of the sky multiplied by a
     near-black. On a DARK surface, more metal is less light. Both grades therefore keep metalness
     modest and take their value from environment and tint, which is also what makes them read as
     polished stone-metal rather than chrome.

     THE TINTS BELOW ARE MODEST BECAUSE MOST OF THE VALUE NOW LIVES IN THE VERTEX COLOURS. Raising
     the tint alone plateaued at 53 — see SILVERISE further down for why a multiplier cannot fix a
     contrast problem, and what does. */
  const STATUE_GRADE = {
    /* the polished platinum hull. 0.42 is less than half of law 1's ~0.9 threshold, so the
       shoulders, deltoids and crown still take the diamond's PointLight. */
    hull: { roughness: 0.22, metalness: 0.42, envMapIntensity: 3.00, tint: [1.46, 1.47, 1.50] },
    /* the deep graphite planes turned away from the light: lifted out of near-black into an actual
       graphite, and kept clearly BELOW the hull so the figures have a lit side and a shadow side */
    dark: { roughness: 0.28, metalness: 0.40, envMapIntensity: 2.40, tint: [1.50, 1.51, 1.56] }
  };
  const POD_FINISH = M.platinumLit || M.platinumMidLit || null;
  const statueGrade = new Map();
  const statueGradeOf = (mat) => {
    if (!mat || !POD_FINISH) return mat;
    /* the face and the emblem keep residents.js's own grades: they are the species' identity and
       the emblem is one of the four places the emissive budget is allowed to be spent. */
    const role = /-body$/.test(mat.name || '') ? 'hull' : /-dark$/.test(mat.name || '') ? 'dark' : null;
    if (!role) return mat;
    let g = statueGrade.get(mat.name);
    if (!g) {
      const S = STATUE_GRADE[role];
      g = mat.clone();
      g.roughness = S.roughness;
      g.metalness = S.metalness;
      g.envMapIntensity = S.envMapIntensity;
      /* written straight into the components rather than through setRGB, which would run the value
         through a colour-space conversion; these are working-space multipliers, not a colour. */
      g.color.r = S.tint[0]; g.color.g = S.tint[1]; g.color.b = S.tint[2];
      g.name = 'monument-statue-' + role;
      g.userData.moduleOwned = true;
      owned.materials.push(g);
      statueGrade.set(mat.name, g);
    }
    return g;
  };

  /* ---- SILVERISE: THE VALUE IS IN THE VERTEX COLOURS, SO THAT IS WHERE THE FIX GOES -------------
     The grade above moved the hull from 33 to 53 and then stopped moving, and the render says why.
     What a material tint CANNOT do is change the SHAPE of a distribution: multiplying by 2 turns a
     near-black facet into a slightly-less-near-black one and drives the bright facets toward clipping
     at the same time. And the range is the whole complaint — residents.js's `platinum` palette runs
     dark 0x27303d (linear 0.021) to light 0xf4f8fc (linear 0.93), a 44:1 spread painted at random
     across the facets. A 44:1 random spread on a faceted body IS what "low-poly mannequin" names;
     no amount of overall brightness fixes it, because the problem is contrast, not level.

     Two transforms, per vertex, on the figures' own geometry only:

       DESATURATE toward the vertex's own luminance. The palette is a cool blue-grey and doubling it
         doubled the blue with it; the direction asks for silver, and silver is a neutral. A little
         of the cast is kept (0.76, not 1.0) so the figures still sit in the world's cool key rather
         than turning into grey plaster.
       COMPRESS with a square root. c^0.5 maps 0.021 to 0.145 and 0.93 to 0.964: the graphite lifts
         out of near-black by a factor of seven while the highlights barely move. That is exactly
         "deep graphite reflections" at one end and "broad bright silver highlight bands" at the
         other, and it is the same curve a real polished metal's response has — most of a mirror's
         range lives near the top.

     THE FACET PATTERN IS UNTOUCHED. Which facet is bright and which is dark does not change; only
     how far apart they sit. The canonical geometry the direction says to preserve is preserved by
     construction — no vertex moves, no triangle is added or removed.

     IT CLONES. residents.js caches materials per colour but hands back geometry per call, and this
     module has no business assuming that stays true: a shared buffer edited in place would silverise
     every MAHBEING on the plaza. The clone is disposed with the rest of the module's geometry; the
     SOURCE is deliberately not disposed, because this module cannot know whether residents.js holds
     it, and it costs nothing to leave — the swap happens before the figure is ever rendered, so the
     original never reaches the GPU and there is no buffer to free. */
  const SILVER = { desat: 0.76, gamma: 0.5 };
  const silverise = (geo) => {
    const src = geo && geo.getAttribute && geo.getAttribute('color');
    if (!src) return geo;
    const out = geo.clone();
    const a = out.getAttribute('color');
    for (let i = 0; i < a.count; i++) {
      const r = a.getX(i), gg = a.getY(i), b = a.getZ(i);
      const L = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      a.setXYZ(i,
        Math.pow(r + (L - r) * SILVER.desat, SILVER.gamma),
        Math.pow(gg + (L - gg) * SILVER.desat, SILVER.gamma),
        Math.pow(b + (L - b) * SILVER.desat, SILVER.gamma));
    }
    a.needsUpdate = true;
    owned.geometries.push(out);
    return out;
  };

  const figures = [];
  for (const f of FIGURES) {
    const g = createResident({
      colour: 'platinum', sex: f.sex, physique: PHYSIQUE, pose: 'stand', lod: 'near',
      height: f.height, hover: 0,             /* stand's hoverDelta is 0: the tip touches the seat */
      seed: f.seed, id: 'monument-' + f.key
    });
    g.name = 'monument-figure-' + f.key;
    g.position.set(f.x, plinthTop + SEAT_H, 0);
    g.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      o.geometry = silverise(o.geometry);
      o.material = statueGradeOf(o.material);
    });
    group.add(g);
    figures.push({ spec: f, group: g });
    stats.figures++;
  }
  /* report the grade that SHIPPED, not the one it was derived from. This line used to echo
     POD_FINISH's roughness / metalness / envMapIntensity, which stopped being what the figures wear
     the moment STATUE_GRADE above took over — a stat describing a value the build no longer uses is
     the L42 failure in miniature, and it is the kind that survives for passes because it still
     prints a plausible number. */
  stats.statueHull = POD_FINISH
    ? { derivedFrom: 'ascent pod hull (M.platinumLit)', hull: STATUE_GRADE.hull, dark: STATUE_GRADE.dark, grades: statueGrade.size }
    : { derivedFrom: 'unavailable — figures keep residents.js grades', grades: 0 };
  group.updateMatrixWorld(true);

  /* WHAT WAS ACTUALLY BUILT, measured off the built groups — L07: a count is not a geometry, and
     `stats.figures = 2` is exactly the kind of claim that has already shipped over an empty plinth
     in this project. Triangles and a bounding box are evidence; the counter is not. */
  const figBox = new THREE.Box3(), _fb = new THREE.Box3();
  const figMats = new Map();
  let figTris = 0, figMeshes = 0;
  for (const fig of figures) {
    figBox.union(_fb.setFromObject(fig.group));
    fig.group.traverse(o => {
      if (!o.isMesh) return;
      figMeshes++;
      figTris += o.geometry.getAttribute('position').count / 3;
      if (o.material) figMats.set(o.material.name || o.material.uuid, o.material.metalness || 0);
    });
  }
  const maxFigMetal = figMats.size ? Math.max(...figMats.values()) : 0;
  stats.law1.figures = {
    meshes: figMeshes, triangles: figTris,
    materials: [...figMats].map(([n, m]) => n + ' @ ' + m.toFixed(2)),
    maxMetalness: +maxFigMetal.toFixed(2),
    /* the whole content of LAW 1: below 0.9 a surface still takes diffuse light, so an up-facing
       face is lit rather than black and no orientation split is needed at all */
    lawOneApplies: maxFigMetal >= 0.9
  };
  stats.figureTop = +figBox.max.y.toFixed(2);
  stats.figureSpan = +(figBox.max.x - figBox.min.x).toFixed(2);
  if (figMeshes === 0) stats.skipped.push('residents.js returned no meshes — the plinth is EMPTY');

  /* ---- WHERE THE DIAMOND SITS, AND WHY NO ARM REACHES FOR IT ----------------------------------
     THE ARMS ARE AT REST, AND THAT IS A DECISION, NOT A SHORTFALL. The gesture in the concept
     render is two raised inner arms meeting under the crystal, and residents.js will not give it:
     the only pose whose arms survive its internal merge as addressable nodes is `guard`, and
     asking for `guard` costs the head, the face and every vertex colour on the body (see above).
     A monument with no face is a worse monument than one with its arms down. So the piece is
     composed the other way, which the world already had the vocabulary for: THE LIGHT CARRIES THE
     DIAMOND. Both figures stand square and canonical, the MAHGIC column rises between them out of
     the plinth, and the crystal is held on that column ABOVE the pair — raised by what they stand
     for rather than by their hands.

     If the raised-arm gesture is wanted, the change is not in this file: residents.js needs either
     `headPivot.userData.animated = true` plus animated shoulder nodes on `stand`, or a new
     `present` pose with drivable arms and no fighting lean. Both are small; both are edits to the
     species authority, which this pass may not make.

     The height is therefore set by the figures' own crowns, measured, not by a hand solve: the
     crystal's LOWER POINT clears the taller head by GEM_CLEAR, so it reads as plainly held above
     the pair and never as a hat on either one. */
  const GEM_CLEAR = 2.60;
  const diamondY = figBox.max.y + GEM_CLEAR + DIA.h;
  stats.diamondY = +diamondY.toFixed(3);
  stats.gemClear = +(diamondY - DIA.h - figBox.max.y).toFixed(2);

  /* THE COLUMN'S CORRIDOR, re-measured on the statues as built. The old number in COLUMN's note
     was taken off raised forearms that no longer exist, and a stale measurement is worse than
     none. This walks both figures' vertices and reports the closest any of them comes to the
     monument axis, which is what the shaft's waist has to fit inside. */
  let waist = COLUMN.waist;
  {
    let minR = Infinity;
    const v = new THREE.Vector3();
    for (const fig of figures) fig.group.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        /* the group is still at the origin and unparented at this point, so o.matrixWorld puts the
           vertex in GROUP space, whose axis is x = z = 0 — the same space diamondY lives in */
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const r = Math.hypot(v.x, v.z);
        if (r < minR) minR = r;
      }
    });
    stats.axisClearance = +minR.toFixed(2);
    /* DERIVED, NOT DECLARED (L08). The shaft's widest point below the crystal is waist * 1.12, so
       the waist that fits this corridor with a fifth of it left as clear air is the value below.
       COLUMN.waist is a CEILING, not the answer: it stays the design intent and the corridor takes
       precedence whenever the figures are wider than it assumed. The bloom above `knee` opens over
       the figures' heads, not past their shoulders, so only the waist is bound by this. */
    waist = Math.min(COLUMN.waist, (minR * 0.78) / 1.12);
    stats.columnWaist = +waist.toFixed(3);
    stats.columnGap = +(minR - waist * 1.12).toFixed(2);
    if (!(waist > 0.05)) stats.skipped.push('no light-column corridor between the figures: axis clearance ' + minR.toFixed(2) + ' m');
  }

  const _m = new THREE.Matrix4();

  /* ---- THE SQUARE DIAMOND ----------------------------------------------------------------------
     DIRECTION, R2: "the actual diamond in the middle is super stale looking. It has no depth to it.
     It needs to have more depth and a glistening and platinumness and glow."

     WHAT WAS THERE, AND WHY IT LOOKED FLAT. Two OctahedronGeometry(1, 0) — the second at 0.86 of the
     first — one emissive, one glass, plus four bars on the equator. An octahedron has EIGHT faces, so
     from any viewpoint you see three of them. Three facets cannot glisten: a gem sparkles because
     dozens of small planes at slightly different angles catch the environment differently as you
     move, and eight big ones catch it all at once or not at all. Worse, the inner solid stood at 0.86
     of the outer, i.e. 14% of a 3.3 m gem — 23 cm of glass — so there was no INTERIOR to look into.
     The two shells read as one white lozenge with a dark chevron where the core's silhouette
     crossed it, which is exactly "stale" and exactly "no depth".

     WHAT IT IS NOW: A CUT STONE, in three nested layers, because that is how a real one works.
       · the SHELL is the cut — ten rings from crown point to culet, sixteen plan vertices each,
         flat-shaded, ~256 facets. See CUT for the profile and for what `flute` does.
       · the HEART sits at 0.62 and is chromeMirror, YAWED HALF A FACET off the shell so its facets
         never line up with the ones in front of them. This is the layer doing most of the work: what
         you actually see inside a diamond is the environment, folded twice, and a mirror behind glass
         is the cheapest honest version of that. It is also why the gem now has a value RANGE instead
         of one white note — the heart carries the darks.
       · the FIRE sits at 0.30, emissive, and is the only part that glows. Small on purpose: a core
         that fills the stone is a lamp, and a lamp has no depth.
     PLATINUMNESS is the GIRDLE: a proud sixteen-sided band on the widest line, in the palette's own
     platinum. It replaces the four equator bars, which were four objects doing worse what one
     continuous line does — and the direction asked for less clutter, not more of it.
     GLOW is the AURA: the same cut at 1.5, additive, no depth write, so the stone sits in a soft
     halo of its own shape rather than in a sphere that would read as a bubble around it. It is
     driven by the clock below with everything else this module owns.

     §06 IS NOT BROKEN BY ANY OF THIS. The four cardinal points and both apexes are exactly where the
     octahedron put them — `flute` moves only the diagonal vertices, and the plan radius is the L1
     norm, which IS the square diamond. The silhouette is unchanged; only the surface inside it is. */
  const gemGeo = own(cutGem(DIA.w, DIA.h, DIA.d));
  const auraMat = new THREE.MeshBasicMaterial({
    color: ctx.theme.energyLight, transparent: true, opacity: GEM_AURA_A,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, fog: false
  });
  /* THE HALO IS A RIM, AND IT IS BackSide FOR THAT REASON. An additive DoubleSide shell renders
     its far wall AND its near wall, so what you get is a translucent SLAB whose brightest part is
     the middle — the longest path through it — and at any close camera it washes the whole frame
     with a pale diamond. BackSide renders only the far wall, which the opaque heart hides across
     the body of the stone and which survives around the silhouette: the glow ends up where a glow
     belongs, hugging the edge, and costs half as many fragments doing it. */
  auraMat.name = 'monument-gem-aura';
  owned.materials.push(auraMat);
  const gemLayer = (name, s, mat, yaw, order) => {
    const m = new THREE.Mesh(gemGeo, mat);
    m.name = 'monument-diamond-' + name;
    if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]); else m.scale.setScalar(s);
    m.rotation.y = yaw;
    m.position.set(0, diamondY, 0);
    if (order) m.renderOrder = order;
    group.add(m);
    return m;
  };
  const fire = gemLayer('fire', GEM.LAYERS.fire, M.energyLight, 0);
  const heart = gemLayer('heart', GEM.LAYERS.heart, M.chromeMirror || M.platinum, GEM.YAW);
  const shell = gemLayer('shell', GEM.LAYERS.shell, M.crystalGlass || M.glass, 0, 6);
  const aura = gemLayer('aura', GEM.AURA, auraMat, GEM.YAW, 5);
  aura.frustumCulled = false;
  /* THE GIRDLE, from the kit's own solver. Baked into this module's shared 'gem' bucket exactly as
     the four equator bars it replaces were, so it costs no extra draw call and takes the same LAW 1
     up/down/steep split every other surface here takes. */
  for (const b of gemGirdle(DIA.w, DIA.h, DIA.d)) {
    const barGeo = chamferBox(b.w, b.h, b.len, b.chamfer);
    _m.compose(new THREE.Vector3(b.x, diamondY, b.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, b.yaw, 0)),
      new THREE.Vector3(1, 1, 1));
    bakeGeometry(B, 'gem', barGeo, _m);
    barGeo.dispose();
  }

  /* ---- EMIT THE FIVE OPAQUE GRADES ------------------------------------------------------------ */
  const GRADE = {
    mirror: M.chromeMirror || M.platinum,
    lit: M.platinumLit || M.platinumMidLit,
    litDown: M.platinumMidLit || M.platinumLit,
    stone: M.graphiteMetal || M.graphite,
    tread: M.paving || M.platinumMidLit
  };
  for (const k of Object.keys(B)) {
    const t = B[k];
    if (!t.pos.length) continue;
    const mesh = new THREE.Mesh(own(finish(t)), GRADE[k]);
    mesh.name = 'monument-' + k;
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    stats.law1[k] = {
      metalness: GRADE[k].metalness,
      m2: +t.area.toFixed(2),
      upFacing_m2: +t.up.toFixed(2),
      downFacing_m2: +t.down.toFixed(2),
      withinTenDeg: +t.level.toFixed(2),
      maxNy: +t.maxNy.toFixed(3),
      tris: t.pos.length / 9
    };
  }
  /* the mirror grade's own footing in the black platinum below it */
  const mirrorMesh = group.getObjectByName('monument-mirror');
  if (reflect && mirrorMesh) { try { reflect(mirrorMesh, 0.3); } catch (e) {} }
  if (reflect) { try { reflect(fire, 0.5); } catch (e) {} }
  /* THE STATUES ARE DELIBERATELY NOT PUT THROUGH reflect(). ctx.reflect() is the older mirrored-COPY
     path — a duplicate mesh under the deck — and the plaza now also runs a real planar mirror that
     renders the whole scene from a reflected camera. Registering the figures in both would draw the
     statues' reflection TWICE, one over the other, at 6 extra draws for the privilege. The emissive
     diamond core stays in the copy path because an additive core is exactly what that path is for. */

  /* ---- THE INSCRIPTION ------------------------------------------------------------------------ */
  const bandR = COURSES[2].r + BAND.proud;
  const bandTex = inscriptionTexture(TAU * bandR / BAND.repeats);
  owned.textures.push(bandTex);
  const bandMat = new THREE.MeshBasicMaterial({ map: bandTex, transparent: true, depthWrite: false, toneMapped: true });
  bandMat.name = 'monument-inscription';
  owned.materials.push(bandMat);
  const bandGeo = own(new THREE.CylinderGeometry(bandR, bandR, BAND.h, SIDES * 2, 1, true));
  const inscription = new THREE.Mesh(bandGeo, bandMat);
  inscription.name = 'monument-inscription';
  /* centred on the top course's straight riser: above the foot flare, below the nosing */
  inscription.position.y = COURSES[0].h + COURSES[1].h + (FOOT_H + (COURSES[2].h - 0.20)) / 2;
  inscription.renderOrder = 6;
  group.add(inscription);

  /* ---- THE LIGHT COLUMN ----------------------------------------------------------------------- */
  const colMat = new THREE.MeshBasicMaterial({
    color: ctx.theme.energy, vertexColors: true, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
  });
  colMat.name = 'monument-column';
  owned.materials.push(colMat);
  const colProfile = columnProfile((diamondY - COLUMN.y0) / (COLUMN.y1 - COLUMN.y0), 1, waist);
  const column = new THREE.Mesh(own(columnGeometry(colProfile, COLUMN.y0, COLUMN.y1, COLUMN.sides, 1)), colMat);
  column.name = 'monument-light-column';
  column.renderOrder = 7;
  group.add(column);
  const coreMat = new THREE.MeshBasicMaterial({
    color: ctx.theme.energyLight, vertexColors: true, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
  });
  coreMat.name = 'monument-column-core';
  owned.materials.push(coreMat);
  /* the inner core shares the outer shaft's radii and its bloom height exactly — only its alpha
     falls away faster, so the beam has a hot centre that runs out before the halo does */
  const columnCore = new THREE.Mesh(own(columnGeometry(columnProfile((diamondY - COLUMN.y0) / (COLUMN.y1 - COLUMN.y0), 2.4, waist), COLUMN.y0, COLUMN.y1, COLUMN.sides, 0.42)), coreMat);
  columnCore.name = 'monument-light-column-core';
  columnCore.renderOrder = 7;
  group.add(columnCore);
  /* THE COLUMN IS DELIBERATELY NOT REFLECTED. reflect() makes a full mirrored copy under the deck,
     and a 200 m additive shaft duplicated downward is a bright vertical smear that would be in
     every frame for one draw call's worth of value. The diamond core and the statues' mirror grade
     are reflected instead, which is where the plaza's black platinum earns its keep. */

  /* ---- LAW 2: THE ANSWERS ---------------------------------------------------------------------
     One real light at the diamond, so the low-metalness up-faces of both figures and every platinum
     nosing on the plinth are MODELLED by the thing they are holding, and one pool on the deck so
     the black platinum underneath shows that something is standing on it. */
  /* distance is in WORLD units and does not inherit the group scale, so it is scaled here; the
     intensity follows d^2, which is what keeps the illuminance on the figures the same as it was
     when the light stood 78 m from a 34 m piece rather than 25 m from an 11 m one. */
  const keyLight = new THREE.PointLight(ctx.theme.energy, 62 * CIVIC_S * CIVIC_S, 78 * CIVIC_S, 2);
  keyLight.name = 'monument-key';
  keyLight.position.set(0, diamondY, 0);
  group.add(keyLight);
  if (ctx.lightPool) {
    const p = ctx.lightPool({ x: SITE.x, z: SITE.z, rx: 34 * CIVIC_S, rz: 34 * CIVIC_S, k: 0.34 });
    if (p) stats.pools++; else stats.skipped.push('deck light pool dropped: ground.js pool buffer full');
  }

  /* ---- NEGATIVE SPACE, AND THE CAMERA ---------------------------------------------------------
     One collider on the plinth footprint plus a margin: the assembly turns ctx.colliders into the
     boxes the camera dolly must stay out of, and anything placed after this module tests against
     the same list. The figures' shoulders overhang it by about 2 m at 20 m of height, which no
     camera in VIEWS can reach. */
  /* the collider is added to the SCENE, not to the group, so it takes the civic scale by hand or it
     would keep a 34 m keep-out box around an 11 m sculpture and push every later placement test —
     and the camera dolly — out of the middle of the open quad. */
  const cw = (baseR + 0.35) * 2 * CIVIC_S, ch = (plinthTop + 34) * CIVIC_S;
  const collider = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cw), M.curb || M.graphiteDark);
  collider.name = 'monument-collider';
  collider.position.set(SITE.x, ch / 2, SITE.z);
  collider.visible = false;
  scene.add(collider);
  (ctx.colliders = ctx.colliders || []).push(collider);
  owned.geometries.push(collider.geometry);
  stats.colliderHalfWidth = +(cw / 2).toFixed(2);

  /* ---- place, measure, report ------------------------------------------------------------------ */
  group.position.set(SITE.x, DECK_Y, SITE.z);
  group.scale.setScalar(CIVIC_S);
  scene.add(group);
  group.updateMatrixWorld(true);

  group.traverse(o => {
    if (!o.isMesh) return;
    stats.draws++;
    const g = o.geometry, idx = g.getIndex();
    stats.triangles += idx ? idx.count / 3 : g.getAttribute('position').count / 3;
  });
  {
    /* the STRUCTURAL height is the solid piece; the column is reported separately, or a 200 m
       additive shaft would be the only number anyone read */
    const solid = new THREE.Box3(), b = new THREE.Box3();
    group.traverse(o => { if (o.isMesh && !/light-column/.test(o.name)) solid.union(b.setFromObject(o)); });
    stats.height = +(solid.max.y - DECK_Y).toFixed(2);
    stats.span = +(solid.max.x - solid.min.x).toFixed(2);
    stats.columnTop = +(COLUMN.y1 + DECK_Y).toFixed(1);
    stats.overhang = +(solid.max.x - baseR).toFixed(2);
  }
  stats.plinthTop = +plinthTop.toFixed(2);
  stats.mirrorLevelArea = stats.law1.mirror ? stats.law1.mirror.withinTenDeg : 0;

  /* ---- the contract ---------------------------------------------------------------------------- */
  let night = 1;
  return {
    group, stats,
    setTime(clockState) {
      const d = clockState && typeof clockState.daylight === 'number' ? clockState.daylight : 0;
      night = 1 - d;
      /* the emissive core follows materials.js's own clock; what this module owns is its light,
         its column and its inscription, and all three step back under daylight together */
      keyLight.intensity = 62 * (0.34 + 0.66 * night);
      colMat.opacity = 0.5 * (0.30 + 0.70 * night);
      coreMat.opacity = 0.45 * (0.30 + 0.70 * night);
      bandMat.opacity = 0.55 + 0.40 * night;
      /* the gem's halo is the one part of "glow" this module owns outright. It nearly disappears in
         daylight — a glow that holds its strength at noon reads as a decal stuck on the sky. */
      auraMat.opacity = GEM_AURA_A * (0.16 + 0.84 * night);
    },
    setTheme(theme) {
      const t = theme && theme.energy ? theme : ctx.theme;
      colMat.color.setHex(t.energy);
      coreMat.color.setHex(t.energyLight);
      auraMat.color.setHex(t.energyLight);
      keyLight.color.setHex(t.energy);
    },
    update(t) {
      /* a monument does not fidget. One very slow breath on the column, never reaching zero, so the
         light reads as alive without the piece appearing to move. */
      const k = 0.94 + 0.06 * Math.sin(t * 0.31);
      colMat.opacity = 0.5 * (0.30 + 0.70 * night) * k;
      coreMat.opacity = 0.45 * (0.30 + 0.70 * night) * (1.94 - k);
      auraMat.opacity = GEM_AURA_A * (0.16 + 0.84 * night) * (1.94 - k);
      /* AND THE STONE TURNS. Not the monument — the monument is stone and stone does not move — but
         the gem it holds, at a fifth of a degree a second. This is what converts a cut into a
         GLISTEN: a facet that is bright this second is dark the next, because it turned, and every
         facet takes its turn. A still gem with 256 facets is still a still gem. The heart runs the
         other way and slower, so the two layers' facets cross rather than travel together. */
      shell.rotation.y = t * GEM.SPIN;
      heart.rotation.y = GEM.YAW - t * GEM.SPIN * 0.55;
      fire.rotation.y = t * GEM.SPIN * 0.30;
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      shell.visible = !low;                 /* the glass over the heart is the first thing to go */
      aura.visible = !low;
      columnCore.visible = !low;
    },
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      owned.textures.forEach(t => t.dispose());
      /* the collider lives in the scene rather than in the group, so it has to be withdrawn from
         BOTH the graph and ctx.colliders — a disposed module that leaves a 17 m invisible box in
         the camera's collision list is a bug nobody would see until the camera stopped somewhere */
      if (collider.parent) collider.parent.remove(collider);
      const i = (ctx.colliders || []).indexOf(collider);
      if (i > -1) ctx.colliders.splice(i, 1);
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildMonument };
