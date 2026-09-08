/* MAHWORLD WORLD 01 :: THE CAMPUS MASTER PLAN
   ============================================================================================
   CAMPUS RECONSTRUCTION MASTER §2 (big-to-small), §3 (spacing law), §4 (roads), §15 (separate
   owners for world layout). This module is PHASE A — the world skeleton — and it builds nothing.
   It is the single table every other module reads its macro position from.

   ---- WHY IT EXISTS -----------------------------------------------------------------------------
   The plane was compressed because nothing owned its topology. buildings.js held the three facility
   sites inside a file whose real job is facade construction; ground.js sized its polished field from
   a constant that predated the facilities; city.js placed its blocks against a ring that predated
   both; fobeam.js put the ascent pads wherever there was room at the time. Four files each held a
   fragment of a site plan and none of them held the plan. That is the L42 failure at world scale,
   and it is why the campus fit inside a 150 m circle: nobody could see the whole thing at once, so
   nobody could space it out.

   ---- THE MEASUREMENTS THIS PLAN IS BUILT FROM --------------------------------------------------
   Before, from the shipped tables: MAH GYM stood 58 m from the centre, MAH MARKET 71 m, MAH MATCH
   74 m; the polished deck ended at 43 m; city.js's nearest block sat at 114 m and its furthest at
   186 m. So the three destinations, the deck and the background district were all inside one
   190 m disc, with the city ring's inner edge only 40 m behind the furthest facility. Every camera
   in the world was therefore looking at all four layers stacked at roughly the same apparent depth,
   which is exactly what "too compressed to read as a real social game space" describes.

   ---- THE PLAN ----------------------------------------------------------------------------------
   Concentric, because a quad IS concentric and because a ring gives every facility an equal
   approach without a hierarchy nobody asked for:

       0 –  96 m   THE QUAD.       Open. Social field, circulation hub, orientation landmark.
                                   Master §1: keep the centre mostly empty. The only thing standing
                                   in it is the civic symbol §1 explicitly permits, at a size that
                                   preserves openness.
      96 – 132 m   THE FORECOURTS. 36 m of approach in front of every facility facade — the "entry
                                   forecourt" and "approach space" §3 requires, and the depth a
                                   player needs to read a building's entrance before reaching it.
     132 – ~160 m  THE FACILITIES. Facade line at 132; each mass extends behind its own facade.
     158 – 186 m   SERVICE / REAR. Side and rear circulation, §3's "side/rear circulation".
           186 m   THE LOOP.       Primary campus boulevard, ringing the whole campus BEHIND the
                                   facilities. Vehicles and service at the back, pedestrians at the
                                   quad front — §4's "clear road vs pedestrian separation", and the
                                   reason the loop is not a path through the middle of the quad.
     205 m +       THE DISTRICT.   city.js's blocks, pushed out past the loop so the background
                                   reads as a separate layer instead of as the campus's back wall.

   ---- BEARINGS ----------------------------------------------------------------------------------
   The world's convention, shared with sky-layout.js and fobstations.js: dir(b) = (sin b, -cos b),
   so bearing 0 is -z, the direction every arrival camera looks.

   MAH MATCH keeps bearing 0. It is the anchor of the arrival axis and it already faces +z, so its
   identity and its rotation both survive the move unchanged. MAH MARKET and MAH GYM take ±66°,
   which is the widest split that keeps all three in the forward hemisphere where the arrival
   composition needs them. At r 132 that is 145 m between neighbouring facades, against frontages of
   36–44 m: roughly 100 m of clear air between destinations, where before they were 60–90 m apart
   centre-to-centre with masses nearly touching.

   The 228° arc behind MARKET and GYM is deliberately EMPTY. It carries the arrival approach and the
   rear sightline toward the sea (§11), and it is where future districts go. Master §19: do not
   refill cleared space.

   ---- WHAT THIS MODULE DOES NOT DECIDE ----------------------------------------------------------
   Facility DIMENSIONS stay in buildings.js — width, height, depth, pier depth, room depth and the
   corner radius are facade construction, and this file has no business knowing them. It owns only
   WHERE things are and HOW BIG the campus is. If a site moves, it moves here and nowhere else.

   No THREE import: this is data. */

const DEG = Math.PI / 180;

/* the world's bearing convention. bearing 0 = -z = the direction the arrival cameras look. */
export const at = (deg, r) => [Math.sin(deg * DEG) * r, -Math.cos(deg * DEG) * r];

/* A facade at bearing b must face back toward the quad. A site's facade points along its local +z,
   which a Y-rotation ry sends to (sin ry, cos ry); the direction from (sin b, -cos b)·r back to the
   centre is (-sin b, cos b). Matching those gives ry = -b. fobstations.js derives the same rule for
   its medallions and got it wrong the first time by tabulating b + 180, which is a mirror rather
   than a facing — so it is derived here too, once, and never tabulated. */
export const faceQuad = deg => {
  /* normalised into (-PI, PI]. A rotation of -294 deg and one of +66 are the same rotation and every
     consumer here reads it through sin/cos, so this is legibility rather than correctness — but a
     site table that prints -5.131 for a building facing north-east is a table nobody can check. */
  let r = (-deg * DEG) % (2 * Math.PI);
  if (r <= -Math.PI) r += 2 * Math.PI;
  if (r > Math.PI) r -= 2 * Math.PI;
  return r;
};

export const CAMPUS = {
  /* ---- the concentric plan, in metres from the world origin ---- */
  QUAD_R: 96,          /* open ground: the campus quadrangle */
  FORECOURT_R: 132,    /* the facade line — every facility's front face stands here */
  SERVICE_R: 168,      /* rear circulation band behind the facility masses */
  LOOP_R: 186,         /* the primary campus boulevard, a ring behind the facilities */
  DISTRICT_R: 205,     /* nothing of city.js's background may come closer than this */

  /* ---- the named facilities. `deg` is the bearing; everything else is derived. -----------------
     Master §3 preserves the names; this only moves them. Each entry carries the bearing and the
     forecourt depth it wants — MAH MATCH gets the deepest because it is the arrival anchor and its
     event forecourt (§17) is where a crowd gathers before a match. */
  SITES: {
    match:  { deg: 0,   approachDepth: 22 },
    market: { deg: 66,  approachDepth: 18 },
    gym:    { deg: 294, approachDepth: 18 }
  },

  /* ---- THE OPEN ARC (§11, §19). No facility, no block, no landmark may be placed between these
     bearings: it carries the arrival approach and the rear sightline out toward the sea, and it is
     the reserve for future districts. Measured the long way round, through 180. ---- */
  OPEN_ARC: { from: 66, to: 294 },

  /* ---- THE CIVIC SYMBOL (§1). The quad keeps its orientation landmark and the landmark stops
     being an obstruction: master §1 permits "a small refined civic symbol" at the centre and §18
     requires that the giant low-fidelity version never returns. It stays on the axis, at the centre
     of the quad where a campus memorial belongs, at a size a person can stand next to. ---- */
  CIVIC: { x: 0, z: 0, scale: 0.32 }
};

/* the built position of a named facility: [facade x, facade z], the rotation that faces the quad,
   and the approach point a player walks to. One derivation, so a site cannot drift from its own
   approach the way the old hand-tabulated pairs could. */
export function siteOf(name) {
  const S = CAMPUS.SITES[name];
  if (!S) return null;
  const [x, z] = at(S.deg, CAMPUS.FORECOURT_R);
  const [ax, az] = at(S.deg, CAMPUS.FORECOURT_R - S.approachDepth);
  return { deg: S.deg, x, z, rotY: faceQuad(S.deg), approach: [ax, az] };
}

/* is a bearing inside the reserved open arc? Used by any module placing something on the ring, so
   the arc is enforced by code rather than by a comment nobody reads. */
export function inOpenArc(deg) {
  const d = ((deg % 360) + 360) % 360;
  return d > CAMPUS.OPEN_ARC.from && d < CAMPUS.OPEN_ARC.to;
}
