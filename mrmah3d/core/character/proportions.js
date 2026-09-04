/* MR.MAH 3D :: PROPORTIONS
   Every measurement in this file was taken FROM the canonical reference
   (`reference/mrmah-canonical-front.png`) by `tools/mrmah3d-reference.mjs`.
   None of it is invented. This is the single place where the reference
   becomes numbers, so silhouette parity is something the build inherits
   rather than something a later pass has to chase.

   Reference frame: 940 x 1672 px.
   Character: apex y=251, torso tip y=1370  ->  height 1119 px.

   Landmarks read from the extracted mask and width profile:

     head apex            y  251     t 0.000
     head widest          y  443     t 0.172    width 366 px
     head lower vertex    y  635     t 0.343   (mirrored from the apex)
     shoulder line        y ~650     t 0.356    torso width ~415 px
     torso tip            y 1370     t 1.000

   Everything below is normalised to character height and then expressed in
   world units at HEIGHT. Change HEIGHT and the whole character scales; do not
   scale individual parts. */

import { REGIONS } from './regions.js';

/* Character height in world units, apex to torso tip. */
export var HEIGHT = 3.0;

/* px -> world, for converting any further reference reading. */
export var PX = HEIGHT / 1119;

/* Reference-frame facts the camera has to reproduce. */
export var FRAME = {
  width: 940,
  height: 1672,
  aspect: 940 / 1672,          /* 0.5622 — portrait */
  characterTopFrac: 0.150,     /* apex sits 15% down the frame */
  characterBottomFrac: 0.819,
  characterHeightFrac: 0.670,  /* character fills 67% of frame height */
  /* Horizon sits at ~y 1000 of 1672, i.e. BELOW the vertical centre, which
     means the camera is very slightly pitched up, not down. */
  horizonFrac: 0.598
};

/* All Y values are measured UP from the torso tip, which is the model origin. */
var H = HEIGHT;

export var HEAD = {
  /* Diamond: 366 px wide, 384 px tall -> very slightly taller than wide. */
  /* ENLARGED FOR CHARACTER PRESENCE.

     These were traced from the canonical front, where the head measures a third
     of the character's height — correct as a measurement and wrong as a design.
     Every appealing creature character oversizes the head relative to strict
     proportion, because the head is where identity and expression live and the
     viewer's eye goes there first. At the measured size the torso outranked the
     face and he read as a body with a diamond on top.

     The head is now 1.09 wide against a 1.18 chest — very nearly as wide as his
     shoulders — which is the ratio that makes a character read as a companion
     rather than as a figure. The apex still lands at exactly HEIGHT, so overall
     scale, framing and every camera solve are unchanged. */
  /* R90 — MEASURED OFF THE ANATOMICAL REFERENCE, AND SUBSTANTIALLY SMALLER.

     `reference/mrmah-refA-anatomical.png` is the art-direction target from here
     on. Measured on it (941 x 1672, apex y 212, torso tip y 1295, so 1083 px of
     character), the head diamond is 302 px wide and 258 px tall — 27.9% and
     23.8% of character height.

     For comparison: the canonical measurement baseline has it at 32.7% / 34.3%,
     and the enlarged pivot head was running at 36.3% / 38.1%. So this is a 37%
     reduction in head height against what was here, and it is the single change
     that does the most to move him from geometric mascot toward the reference.
     It is not a small correction and it is not reversible by tuning: the head
     was outranking the whole body, and everything the reference has that this
     build lacked — a neck, real trapezius, long arms with a bicep and a
     forearm, a chest with pec masses — needs the 0.45 units of height the old
     head was occupying.

     The apex still lands at exactly HEIGHT, so framing and every camera solve
     are untouched.

     The silhouette score against the CANONICAL reference will fall as a direct
     result, and that is expected rather than a regression — the canonical file
     stays the measurement baseline but it is no longer the art-direction
     authority, and the brief is explicit that a materially weak proportion is
     not to be preserved merely because a test was written around it. */
  halfWidth: 0.418,
  halfHeight: 0.357,
  centreY: 2.643,               /* apex lands at HEIGHT; base at 2.286 */
  /* Real front-to-back depth. The head is a beveled crystal, not a plate.
     The ratio goes UP as the head comes down — 0.85 of half-width against the
     old 0.68 — because the reference's head reads as a thick cut stone with
     substantial bevels, and a smaller diamond needs proportionally more depth
     to keep that. */
  halfDepth: 0.355,
  /* The front face plate is inset from the silhouette and pushed back from
     the bevel ring, which is what makes the face read as recessed INSIDE the
     crystal rather than painted on its front. */
  /* Back to 0.54. Shrinking the plate to 0.48 was the wrong way to buy shell
     thickness: the eyes and smile are sized off the head, not off the plate, so
     a smaller plate just crowded them — the smile ran past its lower edge. The
     thickness now comes from the crown band and the deep recess wall, which add
     it without taking anything away from the face. */
  /* THE SHELL IS THINNER AND THE CAVITY IS DEEPER — the helmet correction.

     Read as rings from the silhouette inward, the head was
     1.00 -> 0.84 -> 0.665 -> 0.54: two thick crown bands eating a third of the
     diamond's width before the face began, and then a single step onto a flat
     plate. That is a helmet with a sticker on it.

     Now 1.00 -> 0.88 -> 0.72 -> 0.62 -> 0.55. The outer bands are narrower, so
     the shell reads as a crisp frame rather than bulk; the opening is wider;
     and the last two rings form a real inner bevel stepping down into the
     cavity instead of one flat wall.

     The plate also sits BEHIND the girdle plane now. The lip stands 0.78 of
     halfDepth forward and the plate at -0.06, so the cavity is 0.29 units deep
     — about half the head's whole front-to-back dimension, and roughly five
     times the depth this recess had two passes ago. That is what makes the face
     read as a space inside the crystal rather than a surface on it. */
  /* THE OPENING IS WIDER THAN IT WAS, because the cavity walls are now drawn.

     They were wound inward and culled (see the winding note in forge.js), so
     for several passes the ring between innerInset and faceInset contributed
     nothing and the face effectively had the whole 0.72 opening to sit in. With
     the walls rendering — which is what gives the recess its real depth — that
     ring is solid geometry standing in FRONT of the plate, and it cut across the
     outer edge of both eyes and most of the smile. A diamond is unforgiving
     here: a feature is inside the plate only if |x|/hw + |y|/hh < faceInset, so
     an eye centred at 0.345 across sits at 0.58 by that measure and was outside
     a 0.55 plate all along. Every ring from the girdle in is opened up by
     roughly a tenth, which keeps the bevel's proportions and the shell's
     thickness while giving the face a plate it actually fits on. */
  faceInset: 0.63,               /* plate size as a share of the diamond */
  crownInset: 0.90,              /* outer crown band — narrower now */
  crownZ: 0.40,                  /* crown band depth, share of halfDepth */
  bevelInset: 0.790,             /* the lip, at the front of the crystal */
  bevelZ: 0.78,                  /* the lip stands proud */
  innerInset: 0.700,             /* inner bevel, framing the cavity */
  innerZ: 0.30,                  /* set well behind the lip */
  /* R90: -0.06 -> 0.15. The recess was 0.294 units deep behind a lip 0.263
     wide, which at the chat composition's 22-degree yaw put the near wall
     straight across the smile — the character rendered with eyes and no mouth
     at app scale. That is correct occlusion and a failed requirement at the
     same time.

     0.15 leaves the cavity 0.227 deep, i.e. 64% of the head's half-depth and
     still obviously a hole rather than a panel (the three-quarter capture is
     what proves that, not the front one), while clearing the smile at every
     yaw the in-app compositions use. */
  faceZ: 0.15,                   /* plate depth — behind the lip, ahead of the girdle */
  backApexZ: -1.0,
  /* Depth scatter on the head's bevel ring, so its front facets tilt slightly
     differently and the head catches light in several places.

     Halved. At 0.13 the scatter broke the diamond's symmetry visibly and threw
     a fan of small facets around the recess, which is most of why the head read
     as busy and unresolved next to the reference's clean, expensive-looking
     shell. The head is the recognition feature and the one place where
     symmetry is worth more than variation. */
  /* Raised a little from 0.065 once the crown band existed. With two bands to
     tilt rather than one, a small scatter separates their reflections without
     returning the head to the busy, asymmetric read that 0.13 produced — the
     bands catch different parts of the environment, which is what stops the
     shell looking like one flat panel. */
  /* Raised again to 0.14. At 0.095 the head's two crown bands were still
     tilting too little to reflect meaningfully different parts of the
     environment, so the whole shell came back as one flat mid-teal panel with
     linework on it — the shape had thickness but no optical variation, which is
     the opposite of the reference's head.

     Pushing it to 0.14 was tried and changed nothing visible, which is itself
     the useful result: the head's flatness was never geometric. It came from
     the Fresnel term lifting every grazing facet, and on a diamond seen
     face-on almost every shell facet is grazing. Settled at a modest 0.105. */
  relief: 0.105,
  /* How far the head's facets are biased away from the body's black-heavy
     distribution. 0 would give it the body's weighting, which measured as an
     almost entirely black shell. */
  /* Down from 0.42. That lift was added when the shell measured almost
     entirely black, and it over-corrected: the head came back reading as a
     uniformly bright cyan frame. At 0.26 roughly a quarter of the shell's
     faces still land in the black class, several more in charcoal, and the
     occasional silver catch survives — crystal mass with dark faces in it,
     which is what the reference shows. */
  /* Down again to 0.15, because the head got BIGGER.

     0.26 was set on the old, smaller head. `facetClass` spreads a face toward
     the extremes in proportion to its area, so enlarging the head for character
     presence enlarged every shell facet and made each one reach further on its
     own — the lift that was rescuing small faces from the black class is now
     stacked on top of that, and the four big crown planes all came back in the
     same mid band. They also all face the camera, so they all reflect the same
     key card (x~192), which means orientation cannot separate them either: the
     only thing left that can is albedo. At 0.15 about half the shell sits black
     or charcoal and the rest catches, which is the head Reference A shows — a
     dark crystal with a few lit planes, not a lit frame around a hole.

     THE 0.26 -> 0.15 TEST WAS MEANINGLESS AND SO WAS EVERY OTHER READING OF
     THIS NUMBER. Until the head's rim shell was constrained to XZ, an additive
     backside wash covered the whole diamond and the shell's own facets were
     contributing almost nothing to what anyone was looking at. Now that they
     are what is being seen, the head needs the biggest lift on the character:
     it is one small solid whose planes all face the camera, so it has neither
     the body's area nor the arms' range of orientations to separate its facets
     with. 0.36 leaves roughly a third black or charcoal and lets the rest
     catch. */
  classLift: 0.12
};

export var NECK = {
  topY: HEAD.centreY - HEAD.halfHeight * 0.55,
  bottomY: 0.356 * 0 + (1 - 0.356) * H + 0.02,
  halfWidth: 0.052 * H,
  halfDepth: 0.045 * H
};

/* Torso rings, tip (t=1.0) upward to the shoulder line (t=0.356).
   `w` is half-width, `d` is half-depth, both in world units. The profile
   follows the measured width curve: a nearly straight taper that stiffens
   just under the shoulders. */
/* `facet` gives each ring a small alternating in/out relief so the lofted
   quads are non-planar and every triangle returns its own value; `dip` lowers
   the front and back vertices to cut the collar chevron the reference shows
   across the chest. Rings are dense in the upper body where the reference's
   faceting is most visible and sparser down the plain taper. */
/* `crystal` / `crystalY` are the irregular relief that turns a faceted cone
   into a cut gem — see forge.js. They are strongest across the chest, which is
   the surface the viewer actually reads, and taper to nothing at the tip and
   the collar so neither the point nor the shoulder line loses its shape.

   12 sides rather than 8: the front of the torso now spans several distinct
   planes instead of two, which is what the reference shows and what a uniform
   front could never produce. */
/* ANATOMICAL SHAPING, as a per-vertex radius multiplier around a ring.

   The ring table can only describe a body of revolution: it says how wide the
   torso is at a height, not what shape that cross-section is. That is why every
   version of this torso until now read as a lathe-turned solid however it was
   faceted — a chest and an abdomen have completely different cross-sections and
   the table could not express the difference.

   `shape` is a function of the angle around the ring, returning a multiplier on
   that vertex's radius. `loft` applies it after the facet relief, so anatomy and
   crystal jitter compose rather than fight.

   Convention, from loft's default phase of PI/2: sin(a) is FRONTNESS (+1 dead
   front, -1 dead back) and cos(a) is SIDENESS. Lobes are placed by angle from
   dead front, so they land in the same place at any `sides` count. */
function bump(d, centre, width) {
  var e = d - centre;
  while (e > Math.PI) e -= Math.PI * 2;
  while (e < -Math.PI) e += Math.PI * 2;
  return Math.exp(-(e / width) * (e / width));
}
/* Same gaussian, but taking a RAW ring angle and measuring from dead front,
   which is where the torso's rings are authored. */
function lobe(a, centre, width) { return bump(a - Math.PI / 2, centre, width); }

/* CHEST — two pec masses either side of a sternum valley, plus the lateral
   ribcage carrying round to a flatter back. The sternum is the important half:
   a pair of swells with no valley between them is one wide swell, and the eye
   needs the division to read the pair. */
function chestShape(k) {
  /* STRENGTHS ARE LARGE ON PURPOSE.

     A first attempt used a 12% sternum and a 10% pec, which is what these would
     be as a percentage of a real ribcage — and it was invisible. The reason is
     that the multiplier scales the ring's DEPTH as well as its width, and the
     chest's half-depth is only 0.19: a 10% modulation there moves a vertex by
     0.019 units on a three-unit character, which is under a pixel at chat scale
     and barely two at showcase. Anatomy has to be authored against the size of
     the thing it is displacing, not against the size of the body. At these
     values the sternum sits 0.06 behind the pec crowns, which is a step the eye
     reads as two masses rather than as one surface. */
  return function (a) {
    var sternum = -lobe(a, 0, 0.38) * 0.260;
    var pec = (lobe(a, 0.70, 0.52) + lobe(a, -0.70, 0.52)) * 0.245;
    var lat = (lobe(a, Math.PI / 2, 0.62) + lobe(a, -Math.PI / 2, 0.62)) * 0.100;
    var back = lobe(a, Math.PI, 0.90) * -0.110;
    return 1 + (sternum + pec + lat + back) * k;
  };
}

/* CORE — a central abdominal plane with a shallow division either side of it,
   and the oblique running back to the flank. Deliberately much weaker than the
   chest: the brief asks for restrained core structure, not a six-pack. */
function coreShape(k) {
  return function (a) {
    var linea = -lobe(a, 0, 0.34) * 0.130;
    var rectus = (lobe(a, 0.52, 0.44) + lobe(a, -0.52, 0.44)) * 0.120;
    var oblique = (lobe(a, 1.20, 0.48) + lobe(a, -1.20, 0.48)) * 0.070;
    var back = lobe(a, Math.PI, 0.95) * -0.085;
    return 1 + (linea + rectus + oblique + back) * k;
  };
}

/* CLAVICLE / TRAPEZIUS — the shoulder line is not round. It is flat and slightly
   hollow across the front where the collarbones run, and it carries mass to the
   sides and rear where the traps do. */
/* R94 — per-quad class tables for the ring bands that own a region. The neck
   uses one table all the way round; the taper chooses spear or flank by angle
   (see the taper rings). Ring angle: pi/2 is the FRONT vertex. */
function neckClasses() { return REGIONS.NECK.classes; }
/* The taper: front columns within ~30 degrees of the front vertex are the
   spear, the flanks out to ~100 degrees are sapphire, and the back is spear
   again — it is never lit from the front and the reference keeps it dark. */
/* ANATOMICAL ZONES for the chest and core — `zoneAt(angle)` per ring. Each
   returns { classes, seed }: one class table and one hash seed per zone, so a
   zone shades as ONE plane (see forge.js). `row` separates the bands so the
   upper and lower pec, and the three abdominal rows, are distinct planes. */
function frontDelta(a) {
  var e = a - Math.PI / 2;
  while (e > Math.PI) e -= Math.PI * 2;
  while (e < -Math.PI) e += Math.PI * 2;
  return e;
}
/* R95 — ZONES ARE DETERMINISTIC AND THEIR BOUNDARIES ARE DIAGONAL.

   Reviewed against the references, the R94 zones drew as a rectangular grid
   of tiles — every boundary vertical or horizontal — and each zone rolled its
   class by lottery, so a pectoral was black one mount in five. Now each zone
   NAMES its class (`index` into its region table, see facetClass) and the
   zone function receives the band's height, so the sternum narrows upward,
   the pec lobe's outer edge climbs toward the deltoid, and the oblique line
   runs diagonally out from the waist to the ribcage — the plane architecture
   the brief asks for: two planes a pec (an inner sapphire plane, an outer
   steel one), a dark sternum, abdominal pairs on a dark channel, obliques. */
function pecZone(row) {
  return function (a, y) {
    var e = frontDelta(a), ae = Math.abs(e), side = e < 0 ? 0 : 1;
    var yy = y == null ? 1.90 : y;
    var sternum = 0.34 - (yy - 1.80) * 0.36;                 /* 0.34 at the lower pec, ~0.23 at the clavicle */
    var pecOuter = 1.02 + (yy - 1.80) * 0.95;                /* the lobe reaches out toward the shoulder as it rises */
    var pecSplit = 0.30 + (pecOuter - 0.30) * 0.58;          /* inner plane / outer plane */
    var table = row === 1 ? REGIONS.PEC_UPPER : REGIONS.PEC_LOWER;
    if (ae < sternum) return { classes: REGIONS.STERNUM.classes, seed: 10 + row, index: 0 };
    if (ae < pecSplit) return { classes: table.classes, seed: 20 + row * 4 + side, index: 1 };
    if (ae < pecOuter) return { classes: table.classes, seed: 22 + row * 4 + side, index: 2 };
    if (ae < 2.05) return { classes: REGIONS.OBLIQUE.classes, seed: 30 + row * 2 + side, index: 1 };   /* lats */
    return null;                                                                                        /* back: the body lottery */
  };
}
function coreZone(row) {
  return function (a, y) {
    var e = frontDelta(a), ae = Math.abs(e), side = e < 0 ? 0 : 1;
    var yy = y == null ? 1.50 : y;
    var channel = 0.22 - (yy - 1.18) * 0.06;
    var absOuter = 0.74 + (yy - 1.18) * 0.28;                /* the blocks widen with the ribcage */
    var obliqueOuter = 1.45 + (yy - 1.18) * 0.30;
    if (ae < channel) return { classes: REGIONS.STERNUM.classes, seed: 40 + row, index: 0 };            /* the central channel */
    if (ae < absOuter) return { classes: REGIONS.ABS.classes, seed: 50 + row * 2 + side, index: row === 1 ? 2 : 1 };
    if (ae < obliqueOuter) return { classes: REGIONS.OBLIQUE.classes, seed: 60 + row * 2 + side, index: row === 0 ? 0 : 1 };
    return null;
  };
}
function taperClasses(a) {
  var e = a - Math.PI / 2;
  while (e > Math.PI) e -= Math.PI * 2;
  while (e < -Math.PI) e += Math.PI * 2;
  var ae = Math.abs(e);
  /* R95: the spear widened to about a third of the taper's front (0.52 -> 0.66
     rad either side), as reviewed against the reference crop. */
  if (ae < 0.66) return REGIONS.TAPER_SPEAR.classes;
  if (ae < 1.80) return REGIONS.TAPER_FLANK.classes;
  return REGIONS.TAPER_SPEAR.classes;
}

function clavicleShape(k) {
  return function (a) {
    var hollow = -lobe(a, 0, 0.60) * 0.160;
    var collar = (lobe(a, 0.95, 0.50) + lobe(a, -0.95, 0.50)) * 0.150;
    var traps = (lobe(a, Math.PI - 0.7, 0.60) + lobe(a, -Math.PI + 0.7, 0.60)) * 0.170;
    return 1 + (hollow + collar + traps) * k;
  };
}

export var TORSO = {
  /* R90: the shoulder line rises from 1.932 to 2.130.

     Measured on the anatomical reference at y 525 px, i.e. 0.710 of character
     height above the tip. The old value came from the canonical front, where
     the much larger head forced the shoulders down. Raising it is what creates
     room for a real neck and trapezius between the collarbones and the jaw —
     the region the reference has and this build did not have at all. */
  /* R92 — THE RIBCAGE HAS REAL DEPTH NOW.

     The side capture is what forced this, and it is the reason the brief asks
     for one: from the front he read correctly and from 90 degrees he was a
     BLADE. The chest was 0.206 deep against 0.328 wide — 63% — where a human
     ribcage runs nearer 80%, and the head beside it was already at 85%. So the
     one part of him with no front-to-back mass was the part carrying the pecs,
     the emblem and the whole upper-body read.

     Depths through the chest and core go up by about a quarter, tapering back
     toward the original at the point where the lower body is supposed to be a
     blade. Widths are untouched, so the front silhouette — which every previous
     pass was measured against — does not move at all. This is the brief's
     "more front/back mass than excessive sideways mass", applied where the
     measurement showed it was missing. */
  topY: 2.130,
  /* 14, not 12. The anatomical lobes are 0.5 radians wide and a 12-sided ring
     samples every 0.52, so a pec crown could fall between two vertices and be
     averaged away entirely — the shaping was there in the numbers and absent
     from the mesh. 14 puts a vertex within 0.22 radians of every lobe centre
     for the cost of two more columns of faces. */
  sides: 14,
  /* A SMALL lift away from the black end — a third of the head's, half the
     arms'. The body is the one part that should keep the black-heavy weighting,
     because that is what makes it read as a dark crystalline mass. But with the
     rim shell removed from the torso, its facets had nothing lifting them at
     all and the chest went flat at app scale.

     0.16 was too timid — the chest stayed near-black once the shell was gone.
     0.30 puts enough of the chest's planes into the charcoal and deep-blue
     classes that they separate from one another and the flare has something to
     read on, while still sitting below the arms (0.34) and well below the head
     (0.42) so the value hierarchy across the character holds. This is presence
     built from per-facet variation rather than from a flat overlay, which is
     the whole difference between it and the rim shell it replaces.

     AND THEN THE SHELL CAME BACK, so 0.30 was lifting a torso that was already
     being lifted. 0.30 was chosen against a body with NO rim shell; the shell
     was restored a pass later and nothing re-derived this number, so the two
     compounded and the abdomen went uniform mid-blue — a continuous middle with
     no black left in it, which is the opposite of Reference A, where the body
     is near-black and the light is concentrated into a few hero facets and the
     contour. 0.20 restores the black-heavy weighting the body is supposed to
     have while the shell keeps the contour lit, and the head (0.26) and arms
     (0.34) still sit above it so the hierarchy holds. */
  /* R90: 0.30 -> 0.14, on the chest histogram. Half of the reference's chest
     sits in the darkest band; this build had 6% there. The lift was pushing
     nearly every torso facet into the same middle, which is what made the body
     read as one continuous surface with seams drawn on it however the anatomy
     underneath was shaped. Anatomy needs a value range to be seen through. */
  /* R92 — EVERY LIFT COMES DOWN, because the body they were compensating for
     no longer exists.

     `lift` compresses the class lottery toward the TOP of the table, and these
     were tuned against a table that was 34% black with an absorption of 0.72 —
     a lift of 0.50 on the arms was the only thing keeping them visible at all.
     Against the sapphire table (20% black, absorption 0.38) the same 0.50 puts
     22% of every arm facet into the three brightest classes, more than double
     their nominal share, and both arms came back as white chrome while the
     torso stayed correctly deep.

     Isolated by setting the micro-bevel to zero and re-rendering: the arms were
     still white, so it was never the bevel. The hierarchy is kept — arms above
     head above torso, as the brief's arm-visibility requirement needs — but it
     is now a nudge rather than a rescue. */
  classLift: 0.06,
  /* AUTHORED HERO REGIONS — `hero` overrides classLift for one band.

     The class lottery is steered by face AREA, which is a good proxy for visual
     weight and a poor one for anatomical importance: it cannot know that the
     clavicle carries the light on a body and the abdomen does not. So the brief
     asks for named hero regions, and these are them, top to bottom:

       R93 adds hero bands DOWN THE TAPER as well, which the earlier table left
       flat. Measured against the luminous references, the lower body was 82% of
       its pixels inside a single value band — the right average with no variance
       at all, i.e. a slab. The reference's taper is mostly near-black with a
       scatter of genuinely lit planes among it, and alternating the hero weight
       ring by ring is what produces that: 0.52 at y 0.680 and 0.38 at y 0.400
       against 0.04 at the waist.

       2.130  clavicle / trapezius   0.46   the brightest band on the torso
       2.040  upper pec              0.40
       1.930  pectoral line          0.34
       1.620  lower ribcage          0.06   deliberately BELOW the part's lift
       1.400  waist                  0.04   the darkest band on the body
       0.950  one lower-body plane   0.30   a single catch in the taper

     The dark bands matter as much as the bright ones. A hero region only reads
     as one if what surrounds it recedes, and an abdomen that catches as readily
     as a collarbone is the flat, evenly-lit torso this build kept producing. */
  rings: [
    /* FEWER, LARGER PLANES DOWN THE CONE.

       The previous table stepped every 0.12-0.16 units all the way to the tip,
       which gave the lower body a dense mesh of small triangles. The reference
       does the opposite: below the chest it is a handful of big, calm planes,
       and the facet detail concentrates where the eye actually reads it — the
       chest and shoulders. Equal detail everywhere is what made the body feel
       over-busy and what stops any single plane reading as a hero.

       So the spacing is now graded: wide steps through the taper, tightening
       through the chest, tight across the shoulder crown. Same silhouette
       curve, far fewer and much larger faces where the reference has them.

       AND THE RELIEF HAD TO GO UP TO PAY FOR IT. Thinning the rings without
       raising `crystal` left the surviving planes very nearly coplanar down the
       cone, so they all reflected the same part of the environment and the
       torso went back to reading as one smooth dark shape — fewer facets is
       only an improvement if the ones that remain are genuinely differently
       angled. The relief is now roughly 75% stronger than it was at the old
       ring density, which is what buys each large plane its own value. */
    /* NOT zero. A ring of radius zero collapses all twelve of its vertices onto
       one point, so every triangle in the bottom band is a degenerate sliver
       with an ill-defined normal — and EdgesGeometry, which works from face
       normals, then reports meaningless dihedral angles there and drew a bright
       hero edge straight across the cone just above the tip. At 0.006 the point
       is still visually sharp (well under a pixel at any framing we render) and
       the faces are real. */
    /* THE BODY IS NOW A DESIGNED SILHOUETTE, NOT A CONE.

       Every version of this table until now described a single monotonic taper
       from the shoulder line to the point. A monotonic taper cannot read as a
       body, however it is faceted or lit, because there is no landmark anywhere
       on it — no waist, no ribcage, no hip. That is the whole of "reads like a
       technical mannequin": the silhouette says cone, and silhouette is what a
       viewer reads first and remembers.

       The profile now has the landmarks a stylized creature needs, in order
       from the top: a broad chest, a ribcage that draws in, a clear WAIST
       PINCH, a hip swell below it, and only then the iconic taper to the hover
       point. The pinch is the important one — it is a single concave moment in
       an otherwise convex outline, and one concavity is enough to make an
       outline read as anatomy instead of geometry.

       The taper survives intact because it is canonical Mr.Mah. What changes is
       that it now resolves OUT OF a body rather than being the body.

       The CHEST is the widest point, not the hips. A first attempt swelled the
       lower mass to 0.404 and the result read pear-shaped — bottom-heavy, like a
       robe — which is the opposite of the strong-upper-body silhouette a
       companion character needs. Relief through the lower body came down at the
       same time: big-shape clarity beats surface incident down there, because
       the taper's job is to be a clean elegant shape the eye slides along on its
       way back up to the face.

       The waist pinch is DEEP enough to see. At 6% it was arithmetic; at 12% it
       is a landmark. That is the difference between an outline the eye reads as
       a body and one it reads as a shape that happens to wobble. */
    /* R90 — RE-MEASURED, AND THE CROSS-SECTION IS NOW SHAPED.
       Half-widths traced off the anatomical reference at 3.0 units of height:
       waist 0.244 at t 0.47, chest 0.326 at t 0.62, clavicle 0.290 at t 0.71.
       The lower body is longer and considerably slimmer than it was, which is
       what lets the taper read as elegant rather than as a skirt. */
    /* R94 — THE TAPER IS BUILT IN COLUMNS, AND EACH COLUMN HAS A JOB.

       Cropped beside the luminous reference, the taper here was a mosaic of
       small triangles in one dark band — measured, 80% of its pixels in a
       single value — while the reference's is a handful of LONG planes
       converging on the tip: a dark steel spear down the front centre, bright
       sapphire masses either side of it lit from within, and brighter rails
       along the silhouette. `columns: true` makes every quad in a vertical
       strip draw one optical class and keep one diagonal, so a strip reads as a
       single long facet; `classesAt` hands the front columns the spear table
       and the flanks the sapphire one (regions.js). The internal light that
       makes the flanks glow lives in crystal-shader.js (uInnerLight), gated to
       this region of the body. The relief is halved down here so the long
       planes stay long. */
    { y: 0.000, w: 0.006, d: 0.004, columns: true, classesAt: taperClasses },
    { y: 0.175, w: 0.050, d: 0.034, facet: 0.0060, crystal: 0.0180, crystalY: 0.0040,
      columns: true, classesAt: taperClasses },
    { y: 0.400, w: 0.110, d: 0.082, facet: -0.0060, crystal: 0.0240, crystalY: 0.0060, hero: 0.20,
      columns: true, classesAt: taperClasses },
    { y: 0.680, w: 0.178, d: 0.132, facet: 0.0055, crystal: 0.0280, crystalY: 0.0070, hero: 0.24,
      columns: true, classesAt: taperClasses },
    { y: 0.950, w: 0.236, d: 0.172, facet: -0.0055, crystal: 0.0300, crystalY: 0.0070, hero: 0.20,
      columns: true, classesAt: taperClasses },
    /* hip swell — the widest point of the lower mass, and modest */
    { y: 1.180, w: 0.264, d: 0.192, facet: 0.0099, crystal: 0.0640, crystalY: 0.0150,
      shape: coreShape(0.55), hero: 0.26, columns: false, classesAt: null },
    /* THE WAIST. The one concave moment in the outline. */
    /* R94 — THE CORE AND CHEST ARE ZONED INTO PLANES (see zoneAt in forge.js
       and the tables in regions.js): three rows of abdominal blocks either side
       of a dark channel, oblique planes outboard, then a lower and an upper
       pectoral plane each side of a dark sternum. The crystal jitter comes
       down through these rings so the triangles inside one zone stay near
       enough coplanar to read as a single plane with facet variation, which
       is what the reference's chest is. */
    { y: 1.400, w: 0.244, d: 0.182, facet: -0.0070, crystal: 0.0380, crystalY: 0.0100,
      shape: coreShape(1.0), hero: 0.04, columns: false, classesAt: null, zoneAt: coreZone(0) },
    /* ribcage opening back out — lower abdominal into the rib arch */
    { y: 1.620, w: 0.298, d: 0.222, facet: 0.0060, crystal: 0.0400, crystalY: 0.0100,
      shape: coreShape(0.85), hero: 0.06, zoneAt: coreZone(1) },
    { y: 1.800, w: 0.320, d: 0.248, facet: -0.0060, crystal: 0.0400, crystalY: 0.0100,
      shape: chestShape(0.70), zoneAt: coreZone(2) },
    /* the pectoral line — the strongest cross-section shaping on the body */
    { y: 1.930, w: 0.328, d: 0.258, facet: 0.0055, crystal: 0.0340, crystalY: 0.0080,
      shape: chestShape(1.0), hero: 0.34, zoneAt: pecZone(0) },
    { y: 2.040, w: 0.322, d: 0.244, facet: -0.0045, crystal: 0.0300, crystalY: 0.0060,
      shape: chestShape(0.80), hero: 0.40, zoneAt: pecZone(1) },
    /* THE SHOULDER LINE — collarbones across the front, trapezius behind */
    { y: 2.130, w: 0.290, d: 0.206, facet: 0.0055, crystal: 0.0340, crystalY: 0.0060,
      shape: clavicleShape(1.0), dip: 0.030, hero: 0.46, zoneAt: null },
    /* THE CROWN — the upper chest rising beside the neck to meet the head.

       The torso used to end at the shoulder line in a flat lid. A lid 1.11
       units across, seen from a camera sitting at roughly shoulder height, drew
       its whole perimeter as a bright ellipse and the character appeared to be
       standing in a bucket. It was the most conspicuous artifact in the frame,
       and it survived two wrong diagnoses (the rim shell's centring, then its
       vertical inflation — both were real bugs, neither was this one).

       The silhouette overlay settled it. There is a broad band of magenta —
       reference mass the render does not have — directly beside the neck and
       above the shoulder line, and the width profile confirms it: at t=0.30 the
       reference is 0.518 of character height where the render reaches only
       0.355. The reference's torso does not stop at the shoulders; it climbs
       beside the neck toward the head.

       So the fix for the bucket is the same as the fix for the missing mass,
       which is a good sign it is the right one. These rings climb 0.18 units
       and narrow to just under the head's own cross-section at the row where
       they end, so the chest arrives at the head instead of stopping short of
       it. There is no longer a horizontal surface at the top to be seen into,
       and the head's lower vertex now seats into a shoulder rather than
       hovering above a rim. `dip` on the shoulder ring drops to a trace: it cut
       the collar chevron when that ring was the top of the model, but under a
       crown it only carved a notch you could see down into. */
    /* The crown carries real relief now. It is a broad, upward-facing surface
       and it sits directly under the shoulder-top light card, so with the low
       relief it had it caught that card as ONE smooth plane — a pale swell
       across the upper chest between the two deltoids, which is what stopped
       the torso reading as sculptural at showcase scale however the chest
       below it was shaped. Broken into facets it takes the same light as a set
       of distinct planes instead. */
    /* The crown is SHORTER now that the head is larger and sits lower. It used
       to climb to 2.115 while the head's lower vertex reached only 1.91, so
       0.2 units of chest stood proud above the chin as a bright collar shelf —
       the cluttered throat. It now ends at 2.020, where its half-width of 0.110
       is exactly the head's own cross-section at that height, so the two meet
       flush and nothing of the chest is visible above the jaw. */
    /* The crown's TOP must finish inside the head, not level with its lower
       vertex. Ending at 2.020 put the closing ring exactly where the head's own
       silhouette is barely wider, so the seam showed as a hard pale line under
       the chin — capped it read as a bar, uncapped as an ellipse, and neither is
       something a viewer should ever see. At 2.105 the head is 0.233 across and
       the ring is 0.055, so it is buried by a factor of four and the junction
       simply has no visible event in it. */
    /* R90 — THIS IS A NECK NOW, not a crown buried in an oversized head.

       The crown existed because the head was so large that its lower vertex sat
       almost on the shoulder line; there was no room for anything between them,
       so the chest was ramped straight up into the jaw. With the head at its
       reference size there are 0.156 units of clear space there, and the
       reference fills them with a real neck: narrow, faceted, flaring into the
       trapezius at the bottom and disappearing under the chin at the top.

       It is still part of the TORSO loft rather than its own mesh, which is
       deliberate — a separate neck cylinder is exactly where the old build kept
       producing a visible seam under the jaw, and a continuous loft cannot have
       one by construction.

       The top ring is buried INSIDE the head. The head's own half-width at
       y 2.352 is 0.418 * (1 - 0.291/0.357) = 0.077, and the ring there is 0.028,
       so it is enclosed by nearly a factor of three and the junction has no
       visible event in it from any angle the interaction can reach. */
    /* THE NECK MUST CONVERGE TO MEET THE HEAD'S POINT, and the arithmetic here
       is unforgiving. The head's half-width falls off linearly from its centre:
       hw(y) = 0.418 * (1 - |y - 2.643| / 0.357). At y 2.300 that is 0.016. A
       first version of this table put a 0.068 ring there on the assumption that
       anything below the head's centre was safely inside it — so a wedge of
       neck four times the head's width at that height stood straight out
       through the jaw and rendered as the blown white bar under the chin that
       dominated the whole frame.

       There is no width that threads the head's lower vertex, because the
       vertex is a point. So the neck converges to one too, 0.006 below it, and
       the throat gem sits over the junction exactly as the reference does. */
    /* R94 — A COLUMN, NOT A CONE, AND IT PASSES BEHIND THE CHIN.

       The rings above converged smoothly from the 0.290 clavicle to a point
       0.006 under the head's vertex, which is a pyramid of shoulder rising to
       the chin: from the front there was no event anywhere that read as a
       neck, and the chin sat directly on the deltoid line. Measured on the
       luminous reference (2.5x crop): the trapezius slopes in fast over the
       first ~0.07 units above the clavicle, and from there the neck is a
       near-vertical column about 0.20 wide — 0.49 of the head's half-width —
       that runs UP BEHIND the head's lower facets and shows either side of the
       chin vertex before the head hides it. Its visible length below the chin
       is a fifth of the head's height.

       So: two rings of trapezius, three of column, and the column's top ring
       sits 0.044 ABOVE the head's vertex, where the head is already 0.10 wide
       and swallows it. Between 2.286 and ~2.35 the neck stands proud of the
       chin by up to 0.046 a side — which is what the reference shows, a neck
       passing behind a chin, and is not the R90 "white bar" (that was a lit
       ring cap at the vertex's own height; these faces are dark-classed and
       the cap is buried). `zc` sets the column 0.04 behind the head's axis so
       the chin overhangs it. */
    /* R95: the neck's hero values come down hard (0.26-0.40 -> 0.04-0.12).
       Reviewed, the column rendered as two pale posts beside the chin — mean
       luma 90 against the reference's 29 — because `hero` slides the lottery
       onto the NECK table's steel rows. It is a dark column in the chin's
       shadow, brighter than the chest only by its edges. */
    { y: 2.165, w: 0.212, d: 0.158, facet: -0.0120, crystal: 0.024, crystalY: 0.0050,
      shape: clavicleShape(0.55), hero: 0.16, classesAt: neckClasses },
    { y: 2.200, w: 0.122, d: 0.102, facet: 0.0120, crystal: 0.018, crystalY: 0.0040,
      zc: -0.030, hero: 0.10, classesAt: neckClasses },
    { y: 2.262, w: 0.104, d: 0.090, facet: -0.0110, crystal: 0.014, crystalY: 0.0030,
      zc: -0.040, hero: 0.06, classesAt: neckClasses },
    { y: 2.330, w: 0.098, d: 0.086, facet: 0.0100, crystal: 0.012, crystalY: 0.0020,
      zc: -0.044, hero: 0.04, classesAt: neckClasses },
    { y: 2.372, w: 0.010, d: 0.008, facet: 0.0060, zc: -0.044, hero: 0.02, classesAt: neckClasses }
  ],
  /* Shoulder caps reach wider than the torso ring and carry the arm joints. */
  /* Widened. Against the canonical reference the render measured 9.3% narrow
     across the shoulders, and the refined reference is broader still — the
     brief asks explicitly for stronger shoulder-cap presence and a deltoid-like
     silhouette. This is the single value that controls how heroic he reads. */
  /* The deltoid no longer reads this — its extent comes from the arm joint plus
     its own end radius (see body.js) — but the shoulder line is still measured
     against it, so it is kept as the stated target the two should agree on. */
  /* Corrected down from 0.870. The heroic pass overshot: the deltoids
     projected far enough laterally to square off the whole upper body and
     visually outrank the head. The volume they were carrying is not lost — it
     moved into front-to-back DEPTH (see the deltoid's depthRatio in body.js),
     which reads as mass from every angle a viewer can reach without widening
     the silhouette. Roughly a 10% reduction in projection, as briefed. */
  /* A further 6% off the lateral projection, as briefed. Combined with the
     previous pass the shoulders have come in 14% from their widest, while the
     deltoid's front-to-back depth has gone the other way — the mass is being
     moved out of the silhouette rather than removed. */
  /* R90: measured on the anatomical reference, where the shoulder silhouette
     reaches 216 px of 1083, i.e. 0.598 at 3.0 units. Narrower than the 0.734
     this carried, because that number was set against a head half as wide again
     — the shoulders only had to be that broad to avoid being outranked. */
  shoulderHalfWidth: 0.598,
  shoulderY: 2.095
};

/* Arm joint positions, converted from reference pixels via PX with the torso
   centre column at x=470. The pose is asymmetric exactly as the reference is:
   the character's right arm hangs bent, the left is raised. */
/* Arm joints, read off the reference with a pixel grid overlaid and converted
   through PX with the torso's centre column at x=470.

   Both elbows sit LOWER and further OUT than a first reading suggests. The
   raised arm in particular makes a deep V: it travels down from the shoulder
   to an elbow at y=865 before turning sharply up to the hand. Placing that
   elbow at y=780 — where the forearm merely looks like it starts — left the
   silhouette 22% too narrow across the whole of t=0.47..0.55, which is where
   the reference is at its widest. */
export var ARMS = {
  right: {                        /* viewer's LEFT — the lowered arm */
    /* MOVED OUTBOARD, and this is the change that opens the armpit.

       The measured joint sat at 0.544 while the torso is 0.557 wide at that
       height, so the upper arm began INSIDE the body and the two solids simply
       welded — no gap, no separate limb, and the shoulder read as a bulge on
       the chest rather than as a joint. Reference A shows daylight between the
       arm and the torso along its whole length; that gap is most of what makes
       the arms read as arms.

       Hung under the outer part of the deltoid cap instead. The elbow and wrist
       stay where they were measured, so the pose and the hand positions are
       unchanged — only the top of the limb moves out, which also gives the
       upper arm the near-vertical hang that Reference A has. */
    shoulder: [-0.598, 1.878, 0.02],
    /* Brought under the shoulder. With the joint moved outboard, the old elbow
       at 0.764 made the upper arm angle further OUT before the forearm cut back
       in — a chicken wing. Reference A hangs the upper arm almost vertically
       from the outer shoulder and lets only the forearm angle inward to the
       hip, which is both calmer and stronger. */
    /* The elbows swing OUT, and the silhouette test is why.

       Rendered as a pure filled mask — the brief's own "would this still read as
       a specific character" check — the lowered arm had fused into the torso
       with no gap at all. The chest had widened for presence while the shoulder
       joints came inboard for elegance, and between them they closed the
       armpit; the two changes were each right and their combination was not.

       Opening the elbow angle solves it without touching either: the upper arm
       still hangs from a narrow shoulder, but the forearm swings clear and cuts
       a triangle of background between limb and body. That gap is a silhouette
       landmark in its own right, and "arms disappearing into the torso" is
       named in the brief as a fault to eliminate. */
    /* R90 — RE-MEASURED OFF THE ANATOMICAL REFERENCE, and the arms are
       substantially longer and hung from a higher shoulder.

       Reference pixels (centre column x 470, tip y 1295, 1083 px of height):
       lowered arm shoulder (300, 550), elbow (245, 790), wrist (295, 950).
       The upper arm falls almost vertically and slightly outward; the forearm
       then cuts back INWARD toward the hip, which is the shape the old build
       had backwards — it swung the elbow out and the forearm further out again,
       so the arm read as a chicken wing and the armpit gap was made by pushing
       the whole limb away from the body rather than by the pose.

       Total limb length goes from 0.98 to 1.16 units, and the hand now falls
       just below the hip rather than level with the waist. That reach is a
       large part of why the reference reads humanoid and this build read as a
       cone with stubs. */
    shoulder: [-0.500, 2.064, 0.03],
    elbow: [-0.623, 1.399, 0.09],
    wrist: [-0.485, 0.956, 0.13],
    upperRadius: 0.104,
    foreRadius: 0.081,
    wristRadius: 0.055
  },
  left: {                         /* viewer's RIGHT — the raised arm */
    /* Reference pixels: shoulder (645, 550), elbow (730, 700), wrist (775, 570).
       A shallower, more relaxed V than the old pose — the reference does not
       fold the raised arm hard, it opens the elbow to about 100 degrees and
       presents the crystal at roughly shoulder height. */
    shoulder: [0.500, 2.064, 0.03],
    elbow: [0.720, 1.648, 0.10],
    wrist: [0.845, 2.008, 0.14],
    upperRadius: 0.104,
    foreRadius: 0.081,
    wristRadius: 0.055
  },

  /* LIMB PROFILES — where the mass sits along each bone.

     Radii alone give a cone. These are the multipliers that put a bicep/tricep
     belly on the upper arm and a forearm swell just below the elbow, which is
     what the brief asks for: stronger form language, implied through the
     crystal rather than sculpted as anatomy. The numbers are deliberately
     modest — a 22% swell reads clearly as upper-arm mass at silhouette scale
     and stops well short of a bodybuilder, which the brief rules out just as
     firmly as it rules out a bar.

     Both start and end at ~1.0 so the joints still meet their sockets exactly
     and the measured shoulder/elbow/wrist points stay where the reference put
     them. */
  /* The limbs take a lift away from the black end for the same reason the head
     does — they are small, and the body's 50%-black weighting leaves a slim
     tapered tube with almost nothing visible on it. Kept below the head's, so
     the arms stay clearly darker than the face. */
  /* R90: raised hard, from 0.34 to 0.50.

     Arm visibility is called out in the brief as high priority, and the arms
     were losing to the background: the limbs are the smallest-area parts of the
     character, the area-driven hero hierarchy damps small faces toward the
     middle, and the body's black-heavy weighting then takes most of what is
     left. The result is a correct dark value that is also an invisible one.

     The arms are now the LIGHTEST major region on the character — above the
     torso (0.20) and above the head (0.30) — which inverts the old hierarchy on
     purpose. Reference A does the same thing: its arms carry noticeably more
     secondary blue and more silver than the chest, because they are what has to
     read against a black world at the edge of the silhouette. */
  /* R95: 0.44 -> 0.30. Reviewed against the references the arms were one navy
     band with no dark tricep side; with their class now named per strip (see
     armZone in limbs.js) the lift only needs to keep the seam ramps honest. */
  classLift: 0.30,

  /* The deltoid takes MORE lift than the arm it caps. Its exposed surface is
     mostly upward-facing, and an upward-facing plane reflects x~64 in the
     environment — a dim region — so at the arm's own lift the shoulders came
     back as two dark lumps sitting on a lighter chest, which reads as damage
     rather than as mass. Lifting only the shoulder caps keeps the arms dark
     while giving the shoulder line something to describe itself with.

     Not higher than this, though. Lift compresses the class lottery toward the
     top of the table, so it raises the SILVER share in proportion — at 0.48 the
     silver class went from 7% of faces to about 13% and two of them landed on
     the shoulder crest, where the upward-facing card hits them squarely. The
     result was a pair of blown white triangles that looked like damage. Three
     things were ruled out before the lottery: the authored ridge line and the
     rim shell were each removed for a capture and neither moved it, and the
     wedges are absent at the arm's own lift. */
  deltoidLift: 0.28,

  profiles: {
    /* STARTS BELOW 1, which is the correction the brief asks for.

       Both profiles used to begin at exactly 1.0, so the limb left the shoulder
       at its full nominal radius and the deltoid met a cylinder of the same
       width — no waist between them, and therefore no readable transition. The
       arm now narrows immediately below the shoulder, swells through the
       bicep/tricep belly around a third of the way down, and draws into the
       elbow as the narrowest point of the whole limb. That sequence is what
       makes the taper read; a single bulge on a straight cone does not. */
    upper: function (t) {
      return 0.84 + Math.sin(Math.pow(t, 0.85) * Math.PI) * 0.28;
    },
    /* Picks up close to where the upper arm ended — a step at the elbow reads
       as an error rather than as a joint — then swells just below it and tapers
       to a narrow wrist. */
    fore: function (t) {
      return 0.88 + Math.sin(Math.pow(t, 0.62) * Math.PI) * 0.16 - t * 0.10;
    }
  },

  /* R90 — CROSS-SECTION SHAPING FOR THE LIMBS.

     `profiles` above says how THICK the arm is along its length; it cannot say
     what shape that thickness is, so however hard it swelled the result was a
     tapered tube with a bulge — which is why the arms kept reading as segmented
     pipes no matter how the radii were tuned. A real upper arm is not round:
     the bicep sits on the front and peaks around a third of the way down, the
     tricep sits on the back, is broader, and peaks lower and closer to the
     elbow, and the two are separated by a groove down each side.

     These are handed the angle RELATIVE TO THE FRONT of the limb (see the
     frontAngle derivation in forge.js), so they hold under any pose.

     From the front the bicep reads as fullness; from a slight angle the front
     and rear masses separate, which is what the brief asks for. */
  shapes: {
    upper: function (t, d) {
      var belly = Math.sin(Math.pow(t, 0.82) * Math.PI);
      var rear = Math.sin(Math.pow(t, 1.30) * Math.PI);
      var bicep = bump(d, 0, 0.80) * 0.175 * belly;
      var tricep = bump(d, Math.PI, 1.15) * 0.150 * rear;
      /* the groove between them, down each side of the arm */
      var groove = (bump(d, Math.PI / 2, 0.42) +
                    bump(d, -Math.PI / 2, 0.42)) * -0.070 * belly;
      return 1 + bicep + tricep + groove;
    },
    fore: function (t, d) {
      var swell = Math.sin(Math.pow(t, 0.58) * Math.PI);
      /* Flexor mass sits front-and-inboard, extensor mass rear-and-outboard —
         offset from dead front and dead back, which is what stops the forearm
         reading as a smaller copy of the upper arm. */
      var flexor = bump(d, 0.45, 0.85) * 0.130 * swell;
      var extensor = bump(d, Math.PI - 0.55, 0.95) * 0.095 * swell;
      return 1 + flexor + extensor;
    }
  }
};

/* The hand is SMALL. From the reference the raised hand spans only about
   0.12 world units from wrist to fingertip; an earlier 0.24 pushed the hand
   up into the head's height band and made the silhouette 20% too wide there. */
/* Scaled up with the limbs. The arms gained real mass this pass and the hands
   did not, so they had started to read as small claws on the end of proper
   forearms — the wrist is 0.060 and the palm was only 0.062 half-width, barely
   wider than the arm it hangs from. A hand is meaningfully wider than its
   wrist; that difference is most of what makes it read as a hand at a glance,
   which is all that is being asked for here. */
export var HAND = {
  palmLength: 0.106,
  palmHalfWidth: 0.085,
  palmHalfDepth: 0.050,
  /* R95: four jointed fingers (see buildDigit in limbs.js), a little longer
     and slimmer, as the references' robotic hands are. */
  digitCount: 4,
  digitLength: 0.082,
  digitRadius: 0.019,
  /* The small bright diamond above the reference's raised hand. */
  tipDiamond: 0.044
};

/* Chest insignia, measured at reference y 735 (emblem) and y 820 (symbols). */
export var INSIGNIA = {
  /* Moved down. With the head enlarged and seated lower, the emblem sat almost
     under the chin and the whole throat region read as clutter. On the chest,
     where a chest emblem belongs. */
  /* R90: re-measured on the anatomical reference — emblem at y 632 px, symbols
     at y 700, i.e. 0.612 and 0.549 of character height above the tip. The
     emblem sits ON the sternum, between the pec masses, which is where the
     reference puts it and why the sternum valley matters to it: a glowing
     diamond on a flat chest is a sticker, the same one in a groove reads as
     set into the crystal. */
  emblemY: 1.837,
  emblemHalf: 0.070,
  symbolsY: 1.648,
  symbolHalf: 0.034,
  symbolSpacing: 0.104,
  /* THE THROAT GEM. The reference carries a small bright diamond exactly where
     the neck disappears under the jaw. It is doing real work there — it is the
     one place on the body where two very different forms meet, and a deliberate
     bright accent at a junction reads as design where a bare seam reads as a
     mistake. */
  /* R94 — moved from the chin (2.262) to the STERNAL NOTCH. Cropped, the
     luminous reference has no gem under the jaw at all; the bright accent sits
     where the neck meets the collarbones, in the notch between them. Sitting
     the gem on the notch gives the neck a base and the chin nothing to
     compete with. */
  throatY: 2.146,
  throatHalf: 0.026 };

/* The character hovers; the tip does not rest on the floor. The reference
   shows a bright contact starburst directly beneath the point. */
/* HOVER, deliberately almost imperceptible.

   The brief is specific: gently sustaining himself above the floor, not
   bobbing, drifting or bouncing. 0.030 at a 4.2s period was a visible rise and
   fall — readable as animation, which is exactly what it should not be. At
   0.016 over 6.4 seconds the movement is below the threshold where the eye
   tracks it as motion and instead just reads the character as alive. Slower is
   as important as smaller here: a small fast movement still registers as a
   twitch, a small slow one registers as breathing.

   `height` also sets how long the levitation emitter is, so it is the one
   number that ties the hover and the beam together. */
/* THE POSE'S VISUAL CENTRE, in x.

   One arm is raised and reaching and the other hangs, so the silhouette is not
   centred on the model origin — and the camera solver composes around whatever
   point it is given. Composing around x=0 therefore places him off his intended
   screen position by exactly this asymmetry, which is what MODE-showcase caught
   when the arms were lengthened to the reference's reach (0.556 against an
   intent of 0.500).

   Derived from the extents rather than hardcoded, so a change to the pose
   corrects the framing instead of silently decentring it. */
export var POSE = {
  centreX: (
    /* rightmost: the raised hand, plus its palm */
    (ARMS.left.wrist[0] + HAND.palmHalfWidth) +
    /* leftmost: whichever of the lowered elbow, hand or deltoid reaches furthest */
    Math.min(ARMS.right.elbow[0],
             ARMS.right.wrist[0] - HAND.palmHalfWidth,
             ARMS.right.shoulder[0] - ARMS.right.upperRadius)
  ) / 2
};

export var FLOAT = {
  height: 0.17,
  bobAmplitude: 0.016,
  bobPeriod: 6.4
};
