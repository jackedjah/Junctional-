/* MAHWORLD :: MONUMENT — "HIGHER TOGETHER", the plaza's hero public art
   ============================================================================================

   Two colossal MAHBEING figures, Mr. Mah and Mrs. Mah, standing side by side on a tiered circular
   plinth, each with the INNER arm raised, together holding a glowing SQUARE DIAMOND above and
   between them, with a vertical light column rising through the diamond into the sky.

   ---- THE SPECIES IS NOT SCULPTED HERE, AND THAT IS THE WHOLE POINT --------------------------
   residents.js is the species authority in code. It already builds the canonical MAHBEING —
   square-diamond head with its dark facial chamber and two eyes, a muscular humanoid upper body,
   and ONE CONTINUOUS TEARDROP BELOW THE WAIST WITH NO LEGS. The concept renders appear to give
   the figures legs; they do not have any, and the species sheet outranks the concept art. So this
   module does not model a body at all: it calls createResident() twice, scales the returned groups
   to monument size and REPLACES THEIR MATERIALS. Species compliance is then true by construction
   rather than by inspection, and it stays true if residents.js is ever re-sculpted.

   WHAT residents.js GAVE AND WHAT IT DID NOT (recorded honestly, because the next pass will ask):
     · POSE. Only the `guard` pose is `drivable`, and drivable is exactly what decides whether the
       arms survive the module's internal merge as addressable nodes: mergeStatic() bakes every
       mesh into the nearest ancestor flagged userData.animated, so under `stand` the arms are
       baked into the body and CANNOT be posed. Under `guard` the torso, both swing nodes and both
       elbow nodes stay live and are handed out through group.userData.parts. This module therefore
       asks for `guard` and then zeroes the fighting stance it comes with — lean 10 deg, shoulder
       yaw 28 deg — on those same exposed nodes, which is posing a rig, not hacking a module.
     · THE HEAD IS THE ONE THING IT WOULD NOT GIVE. headPivot is exposed as parts.head but it is
       NOT flagged animated, so the head slab is baked into the torso bucket at the pose's own
       roll — guard carries tilt -4 deg. Both statues therefore hold a 4 degree head roll that
       cannot be removed from outside residents.js. It reads as a shared glance and it is small,
       but it is a real residue and it is not asserted away here. IF THE DIRECTOR WANTS DEAD-LEVEL
       HEADS, residents.js needs either headPivot.userData.animated = true or a drivable pose with
       tilt 0; both are one-line changes in a file this pass may not edit.
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

   Nothing here is routed by name. EVERY opaque triangle this module produces — the statues, every
   plinth course, the diamond's edge catches — goes through one splitter that measures the
   triangle's OWN normal and sends it to one of three grades:

       |ny| <= 0.50   (face within 30 deg of vertical)   the mirror / steep grade for its role
       ny  >  0.50    (up-facing)                        M.platinumLit      metalness 0.38
       ny  <  -0.50   (down-facing)                      M.platinumMidLit   metalness 0.40

   0.50 is deliberately stricter than foblock.js's "more vertical than horizontal" 0.707. The
   reason is optical: a camera ray hitting a face tilted t off vertical reflects at roughly 2t
   above the horizon, so a 45 deg face (|ny| 0.707) is already looking at the zenith and a 30 deg
   face is at 60 deg elevation. 0.50 keeps the mirror grade on faces whose reflection is still in
   the lit half of the sky. The measured result is in stats.law1 and in the pass report; the
   mirror bucket's own maximum |ny| is measured after the fact and asserted nowhere.

   A statue's shoulders, deltoids, forearm tops and the crown of its head are horizontal faces as
   surely as a roof is, which is why the figures are NOT one mirror material. They are three, and
   the low-metalness partner on the up-facing turns is also what lets the diamond's light land on
   them at all (LAW 2, below) — a pure mirror statue would have ignored its own light source.

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
   camera whole. The assembled piece still measures 41.96 m from the deck to the diamond's apex,
   taller than MAH MATCH's 38 m mass and the tallest thing standing on the plaza, with the light
   column running out of the top of every frame above that. It is colossal by the only measure that
   counts, which is what it is colossal NEXT TO.

   THE PIECE IS COMPOSED AS A GATE RATHER THAN A WALL, and this was TESTED rather than hoped for.
   The three approaches themselves stay open — nothing of this module lies on the -x or +x
   corridors, and the two cameras that face MAH MATCH from its own approach (`match-approach` at
   z -18 and `match-entrance` at z -58) both stand BEHIND the monument, which is not in their
   frames at all. What is in frame is MAH MATCH seen over and between the figures from the arrival
   side, so the clear air between them was measured by raycast at the heights the sightlines
   actually use: 6.6 to 8.7 m across the band the MATCH sign is read through, closing to 1.1 m only
   where the two raised forearms converge under the diamond.

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
import { canvasTexture, chamferBox, BRAND } from './materials.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const DECK_Y = 0.17;               /* ground.js FLOOR_TOP — the plaza deck everything stands on */

/* WHERE IT STANDS. See the header: this is the measured centre of the largest circle behind the
   MAHPLAZA marker that clears ground.js's centrepiece, the dressing cluster and the approach
   camera. The module re-measures the clearance at build time and reports it. */
const SITE = { x: 0, z: -6.5 };

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

/* THE LIGHT COLUMN. Rises from inside the plinth, through the diamond, and fades out at height.
   y0 sits BELOW the top course's tread, which is opaque, so the shaft appears to come out of the
   stone rather than to begin in mid-air.

   IT HAS A WAIST, AND THE WAIST IS NOT A FLOURISH. The corridor it has to thread was measured on
   the built statues: the nearest statue surface to the monument axis is 0.95 m out at the inner
   shoulder caps (y 20-24) and the two raised forearms close to 1.14 m of clear air under the
   diamond. A shaft of constant bloom radius would have run straight through Mr. Mah's deltoid, so
   the column is a 0.44 m thread from the plinth up past the shoulders, keeps that until `knee`, and
   only then opens to 0.95 m at the crystal. Measured minimum gap between the finished shaft and the
   statues: 0.19 m, at y 35. The profile is [fraction of the run, radius, alpha]; `at` is the
   diamond's own fraction, filled in at build time so the bloom cannot drift off the crystal it
   comes out of. */
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
function columnProfile(at, fade) {
  const w = COLUMN.waist, b = COLUMN.bloom, f = a => Math.pow(a, fade || 1);
  return [
    [0, w, 0], [Math.min(0.01, at * 0.1), w, f(0.80)], [at * COLUMN.knee, w * 1.12, f(0.86)],
    [at, b, 1.00], [at + 0.08, b * 0.84, f(0.70)], [0.45, b * 0.70, f(0.32)],
    [0.70, b * 0.61, f(0.11)], [1, b * 0.55, 0]
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
  /* residents.js builds them; this module only poses, scales and re-grades. */
  const figures = [];
  for (const f of FIGURES) {
    const g = createResident({
      colour: 'platinum', sex: f.sex, physique: PHYSIQUE, pose: 'guard', lod: 'near',
      height: f.height, hover: 0.05,          /* + guard's hoverDelta -0.05 = 0: the tip touches */
      seed: f.seed, id: 'monument-' + f.key
    });
    g.name = 'monument-figure-' + f.key;
    g.position.set(f.x, plinthTop + 0.30, 0);
    group.add(g);
    figures.push({ spec: f, group: g, parts: g.userData.parts });
    stats.figures++;
  }

  /* Zero the fighting stance `guard` arrives in, on the nodes residents.js exposes. */
  for (const fig of figures) {
    fig.parts.torso.rotation.x = 0;                     /* lean 10 deg -> upright */
    for (const arm of fig.parts.arms) {
      arm.shoulder.rotation.y = 0;                      /* guard's 28 deg inward yaw -> square */
      arm.swing.rotation.x = 0;
      arm.elbow.rotation.x = 0;
    }
  }

  /* THE OUTER ARM falls naturally: the canonical abduction the measures already carry, a few
     degrees of forward set and a soft elbow. THE INNER ARM is raised and straight — the solve
     below decides by how much. `inner` is the arm on the side facing the axis. */
  const outerFwd = 6 * DEG, outerElbow = 9 * DEG, abduct = 8 * DEG;
  const armOf = (fig, inner) => {
    const want = inner ? (fig.spec.x < 0 ? 1 : -1) : (fig.spec.x < 0 ? -1 : 1);
    return fig.parts.arms.find(a => a.side === want);
  };
  for (const fig of figures) {
    const o = armOf(fig, false);
    o.shoulder.rotation.z = o.side * abduct;
    o.swing.rotation.x = -outerFwd;
    o.elbow.rotation.x = -outerElbow;
  }

  /* WHERE THE HAND ACTUALLY IS, measured rather than derived. The forearm and hand were merged
     into the elbow node, so the terminal point of the arm is the lowest point of that node's own
     geometry — read it off the bounding boxes and transform it out. */
  const handLocal = fig => {
    const arm = armOf(fig, true);
    let minY = Infinity;
    arm.elbow.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      minY = Math.min(minY, o.geometry.boundingBox.min.y);
    });
    return new THREE.Vector3(0, minY === Infinity ? 0 : minY, 0);
  };
  const handWorld = (fig, tip) => {
    group.updateMatrixWorld(true);
    return tip.clone().applyMatrix4(armOf(fig, true).elbow.matrixWorld);
  };

  /* THE SOLVE. Both raised hands must land ON the diamond's lower flank, not near it — a monument
     whose hands float 40 cm off the thing they are holding is the defect that gets noticed first.
     The diamond's height is set by whichever figure reaches highest with a dead-vertical arm; the
     other figure's shoulder angle is then bisected until its measured fingertip satisfies the
     octahedron's own surface equation |x|/w + |dy|/h + |z|/d = 1. */
  /* rotation.z = side * PI puts the arm dead vertical; turning it back toward 0 by `t` leans it
     inward, for BOTH sides, because the sign of `side` is already in the expression. */
  const raise = (arm, t) => { arm.shoulder.rotation.z = arm.side * (Math.PI - t); };
  const tips = figures.map(handLocal);
  for (const fig of figures) raise(armOf(fig, true), 0);
  const reach = figures.map((fig, i) => handWorld(fig, tips[i]));
  const lead = reach[0].y >= reach[1].y ? 0 : 1;
  /* the taller reach sets the diamond's height, with its own fingertip exactly on the flank */
  const L = reach[lead];
  const diamondY = L.y + DIA.h * (1 - Math.abs(L.x) / DIA.w - Math.abs(L.z) / DIA.d);
  const surface = p => Math.abs(p.x) / DIA.w + Math.abs(p.y - diamondY) / DIA.h + Math.abs(p.z) / DIA.d - 1;
  figures.forEach((fig, i) => {
    if (i === lead) return;
    const arm = armOf(fig, true);
    const at = t => { raise(arm, t); return surface(handWorld(fig, tips[i])); };
    /* surface() IS NOT MONOTONE in the tilt, which the first cut of this solve assumed and paid
       for: past the angle where the fingertip crosses the axis, |x| starts GROWING again and a
       plain bisection walks into the far branch — it put Mrs. Mah's hand 4.7 m the wrong side of
       centre at the 40 degree clamp. So the bracket is FOUND by a coarse sweep to the first sign
       change, and only then bisected. */
    const MAXT = 34 * DEG, N = 160;
    let lo = 0, hi = -1, prev = at(0);
    for (let k = 1; k <= N; k++) {
      const t = MAXT * k / N, s = at(t);
      if (prev > 0 && s <= 0) { lo = MAXT * (k - 1) / N; hi = t; break; }
      prev = s;
    }
    if (hi < 0) {                       /* no crossing: the hand cannot reach the flank */
      raise(arm, 0);
      stats.skipped.push('no arm solution for ' + fig.spec.key + ' — arm left vertical');
      stats['tilt_' + fig.spec.key] = 0;
      return;
    }
    for (let k = 0; k < 34; k++) { const mid = (lo + hi) / 2; if (at(mid) > 0) lo = mid; else hi = mid; }
    raise(arm, (lo + hi) / 2);
    stats['tilt_' + fig.spec.key] = +((lo + hi) / 2 / DEG).toFixed(2);
  });
  stats.diamondY = +diamondY.toFixed(3);
  group.updateMatrixWorld(true);
  stats.hands = figures.map((fig, i) => {
    const p = handWorld(fig, tips[i]);
    return { key: fig.spec.key, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), onSurface: +surface(p).toFixed(4) };
  });

  /* ---- BAKE THE FIGURES INTO THE GRADE BUCKETS ------------------------------------------------
     Posed, so the geometry is final; static, so nothing needs a live node. Both statues are read
     out through the same normal splitter as the stone and merged into the same three meshes. */
  const gInv = new THREE.Matrix4();
  const _m = new THREE.Matrix4();
  /* snapshot the stone's areas so the LAW 1 audit can say what the FIGURES contributed on their
     own — a statue's shoulders are the case this law exists for and they should be readable
     separately from a plinth tread */
  const beforeFigures = {};
  for (const k of Object.keys(B)) beforeFigures[k] = { area: B[k].area, level: B[k].level, up: B[k].up, down: B[k].down };
  group.updateMatrixWorld(true);
  gInv.copy(group.matrixWorld).invert();
  const doomed = [];
  for (const fig of figures) {
    fig.group.traverse(o => {
      if (!o.isMesh) return;
      _m.multiplyMatrices(gInv, o.matrixWorld);
      bakeGeometry(B, 'figure', o.geometry, _m);
      doomed.push(o);
    });
  }
  for (const o of doomed) { if (o.parent) o.parent.remove(o); o.geometry.dispose(); }
  for (const fig of figures) group.remove(fig.group);

  /* ---- THE SQUARE DIAMOND --------------------------------------------------------------------
     The brand figure keeps its points (§06's one exemption). A bright core inside a glass shell,
     because a crystal reads by light coming THROUGH it, and four mirror bars on the equator that
     catch the moon on the turn — the same construction as ground.js's plaza crystal, one scale up. */
  const diamondCoreGeo = own(new THREE.OctahedronGeometry(1, 0));   /* THE SQUARE DIAMOND, brand figure */
  const diamondShellGeo = own(new THREE.OctahedronGeometry(1, 0));  /* square-diamond glass over the core */
  const core = new THREE.Mesh(diamondCoreGeo, M.energyLight);
  core.name = 'monument-diamond-core';
  core.scale.set(DIA.w * 0.86, DIA.h * 0.86, DIA.d * 0.86);
  core.position.set(0, diamondY, 0);
  group.add(core);
  const shell = new THREE.Mesh(diamondShellGeo, M.crystalGlass || M.glass);
  shell.name = 'monument-diamond-shell';
  shell.scale.set(DIA.w, DIA.h, DIA.d);
  shell.position.set(0, diamondY, 0);
  group.add(shell);
  /* the equator catches, measured into the grade buckets like everything else */
  {
    const barGeo = chamferBox(0.20, 0.20, DIA.w * 1.62, 0.05);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      _m.compose(
        new THREE.Vector3(Math.cos(a) * DIA.w * 0.52, diamondY, Math.sin(a) * DIA.d * 0.52),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0.66, -a + Math.PI / 2, 0)),
        new THREE.Vector3(1, 1, 1));
      bakeGeometry(B, 'gem', barGeo, _m);
    }
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
      figures_m2: +(t.area - beforeFigures[k].area).toFixed(2),
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
  if (reflect) { try { reflect(core, 0.5); } catch (e) {} }

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
  const colProfile = columnProfile((diamondY - COLUMN.y0) / (COLUMN.y1 - COLUMN.y0), 1);
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
  const columnCore = new THREE.Mesh(own(columnGeometry(columnProfile((diamondY - COLUMN.y0) / (COLUMN.y1 - COLUMN.y0), 2.4), COLUMN.y0, COLUMN.y1, COLUMN.sides, 0.42)), coreMat);
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
  const keyLight = new THREE.PointLight(ctx.theme.energy, 62, 78, 2);
  keyLight.name = 'monument-key';
  keyLight.position.set(0, diamondY, 0);
  group.add(keyLight);
  if (ctx.lightPool) {
    const p = ctx.lightPool({ x: SITE.x, z: SITE.z, rx: 34, rz: 34, k: 0.34 });
    if (p) stats.pools++; else stats.skipped.push('deck light pool dropped: ground.js pool buffer full');
  }

  /* ---- NEGATIVE SPACE, AND THE CAMERA ---------------------------------------------------------
     One collider on the plinth footprint plus a margin: the assembly turns ctx.colliders into the
     boxes the camera dolly must stay out of, and anything placed after this module tests against
     the same list. The figures' shoulders overhang it by about 2 m at 20 m of height, which no
     camera in VIEWS can reach. */
  const cw = (baseR + 0.35) * 2;
  const collider = new THREE.Mesh(new THREE.BoxGeometry(cw, plinthTop + 34, cw), M.curb || M.graphiteDark);
  collider.name = 'monument-collider';
  collider.position.set(SITE.x, (plinthTop + 34) / 2, SITE.z);
  collider.visible = false;
  scene.add(collider);
  (ctx.colliders = ctx.colliders || []).push(collider);
  owned.geometries.push(collider.geometry);
  stats.colliderHalfWidth = +(cw / 2).toFixed(2);

  /* ---- place, measure, report ------------------------------------------------------------------ */
  group.position.set(SITE.x, DECK_Y, SITE.z);
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
    },
    setTheme(theme) {
      const t = theme && theme.energy ? theme : ctx.theme;
      colMat.color.setHex(t.energy);
      coreMat.color.setHex(t.energyLight);
      keyLight.color.setHex(t.energy);
    },
    update(t) {
      /* a monument does not fidget. One very slow breath on the column, never reaching zero, so the
         light reads as alive without the piece appearing to move. */
      const k = 0.94 + 0.06 * Math.sin(t * 0.31);
      colMat.opacity = 0.5 * (0.30 + 0.70 * night) * k;
      coreMat.opacity = 0.45 * (0.30 + 0.70 * night) * (1.94 - k);
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      shell.visible = !low;                 /* the glass over the core is the first thing to go */
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
