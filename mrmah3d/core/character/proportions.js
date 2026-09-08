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
  /* R95-BB — TO THE FLOOR OF THE TOLERANCE, NOT PAST IT.

     The bodybuilder reference's head is 0.31 x 0.30 — a quarter smaller than
     the anatomical measurement this is checked against — because a
     bodybuilder's head is small against his shoulders; that ratio is most of
     what "dense and compact" means. The head is the recognition feature and
     the brief keeps it canonical, so it goes down only to the edge of the
     tolerance band (6% under the anatomical value) and the rest of the ratio
     is bought by growing the body: shoulders 0.598 -> 0.672, arms 40% thicker.
     The apex still lands at HEIGHT. */
  /* R101 — A TRUE SQUARE, ROTATED 45 DEGREES. The head had been 0.395 by
     0.338 since the anatomical reference (which cut it broader than tall);
     the R101 law locks the neutral head as a square diamond: equal sides,
     equal opposing angles, top and bottom corners on the centreline. The
     side is the geometric mean of the old pair, so the head keeps its
     presence in the frame; the apex still lands at HEIGHT and the bottom
     corner now sits DOWN INTO the neck column (see the neck rings). */
  halfWidth: 0.366,
  halfHeight: 0.366,
  centreY: 2.634,               /* apex lands at HEIGHT; base at 2.268 */
  /* Real front-to-back depth. The head is a beveled crystal, not a plate.
     The ratio goes UP as the head comes down — 0.85 of half-width against the
     old 0.68 — because the reference's head reads as a thick cut stone with
     substantial bevels, and a smaller diamond needs proportionally more depth
     to keep that. */
  /* R96 — SLEEK, NOT BULBOUS. At 0.355 (0.90 of the half-width) the head was
     nearly a cube seen from any angle but dead front, and from behind it read
     as a faceted skull. Reference A/C cut it as a THIN-DEPTH shell: the depth
     comes down to 0.60 of the width, the rear apex sits close behind the
     girdle, and the cavity keeps its full 0.22 by moving the lip forward and
     the plate back (bevelZ / faceZ below, which are shares of this). */
  halfDepth: 0.240,
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
  /* R98 — A COIN, NOT A HELMET. Read as depths: the lip stood 0.23 forward
     of the girdle over an in-plane band of only 0.08, i.e. the whole front of
     the head was a near-vertical wall and, seen from any angle but dead front,
     a BOX with a hole in it — the bulbous, helmet-like read the platinum
     brief names first. The platinum references present the face as a flat
     black plate with ONE lit chamfer band around it, roughly 45 degrees, and
     the plate itself fills about two thirds of the diamond.

     So the front is now a chamfered plate: the lip sits 0.096 forward of the
     girdle across a band 0.071 wide (53 degrees), the plate is wider (0.66)
     and sits 0.048 BEHIND the girdle so the cavity keeps 0.144 of real depth
     behind a steep wall and a shallow inner bevel — crisp, architectural
     transitions rather than one deep funnel. The rear is a plate too (see
     backInset below). Head depth over all falls from 1.19 to 0.72 of the
     half-width. */
  /* R99: a THICKER rim — the godform reference's head frame is a wide,
     physically deep chamfer, several planes across, not a stroke; the band
     grows from 0.18 to 0.21 of the half-width and the screen keeps two
     thirds of the diamond. */
  /* R100 — A DISPLAY MODULE IN A CASING. The recess now holds a raised
     module: a channel floor around it, a bezel wall, and the glass standing
     0.067 forward of the floor and 0.077 behind the lip. Read from the
     silhouette inward: casing chamfer 1.00 -> 0.80, the wall down to the
     floor at 0.68, a channel to 0.655, the bezel up to the glass at 0.63.
     The glass keeps the smile inside it (its tips reach 0.625). */
  faceInset: 0.680,              /* the cavity floor's edge, as a share of the diamond */
  crownInset: 0.895,             /* outer chamfer band */
  crownZ: 0.24,                  /* its depth, share of halfDepth (R101: a thicker casing) */
  bevelInset: 0.800,             /* the lip — the inner edge of the chamfer */
  bevelZ: 0.46,                  /* 0.110 forward of the girdle (R101) */
  innerInset: 0.740,             /* the cavity wall's foot */
  screenInset: 0.630,            /* the glass's edge */
  screenZ: 0.08,                 /* the glass's depth — 0.019 forward of the girdle, share of halfDepth */
  innerZ: 0.04,                  /* the wall drops nearly to the girdle plane */
  /* the rear: a side band from the silhouette to a back ring, then a flat
     back plate — a streamlined plate rather than a pyramid */
  backInset: 0.70,
  /* R90: -0.06 -> 0.15. The recess was 0.294 units deep behind a lip 0.263
     wide, which at the chat composition's 22-degree yaw put the near wall
     straight across the smile — the character rendered with eyes and no mouth
     at app scale. That is correct occlusion and a failed requirement at the
     same time.

     0.15 leaves the cavity 0.227 deep, i.e. 64% of the head's half-depth and
     still obviously a hole rather than a panel (the three-quarter capture is
     what proves that, not the front one), while clearing the smile at every
     yaw the in-app compositions use. */
  faceZ: -0.20,                  /* plate depth — 0.048 behind the girdle, 0.144 behind the lip (R98) */
  backApexZ: -0.78,              /* the back plate's depth (R98: a plate, not an apex) */
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
  relief: 0.070,                 /* R98: the chamfer is 0.096 deep now; 0.105 of the half-depth was a quarter of it */
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
/* R107 — a BELLY is a lobe with a fuller top and steeper flanks (the Gaussian
   raised to 0.55): it fills its width like a pumped muscle and then falls
   fast into the valley beside it, where the plain Gaussian was a soft bump
   that the smooth clay read as a barrel with waves on it. */
function belly(a, centre, width) { return Math.pow(bump(a - Math.PI / 2, centre, width), 0.55); }
/* R108 — a DOME has COMPACT SUPPORT: (1 - (e / hw)^2)^1.5 inside +-hw
   radians of its centre and exactly zero outside, with a zero slope at the
   edge so it blends into the ring. `belly`'s Gaussian raised to 0.55 has fat
   tails — at one width from its centre it is still at 0.58 — so on a 24-sided
   ring every lobe leaked into its neighbours: the two thigh heads filled the
   seam between them and the glute pair reached round to the hip. A dome ends
   where the muscle ends, which is what lets a belly, the valley beside it
   and the next belly be authored independently. `hw` is the HALF-width. */
function dome(a, centre, hw) {
  var e = a - Math.PI / 2 - centre;
  while (e > Math.PI) e -= Math.PI * 2;
  while (e < -Math.PI) e += Math.PI * 2;
  var u = e / hw;
  if (u >= 1 || u <= -1) return 0;
  var s = 1 - u * u;
  return s * Math.sqrt(s);
}
function domePair(a, centre, hw) { return dome(a, centre, hw) + dome(a, -centre, hw); }

/* CHEST — two pec masses either side of a sternum valley, plus the lateral
   ribcage carrying round to a flatter back. The sternum is the important half:
   a pair of swells with no valley between them is one wide swell, and the eye
   needs the division to read the pair. */
/* R108 — THE BACK IS ONE ARCHITECTURE, shared by every torso ring from the
   belt to the girdle: chestShape and coreShape both call it, so the spine
   channel, the erector columns, the valley outside them and the teres plane
   run continuously down the back instead of changing vocabulary at the pec
   line (the R107 back read as a smooth vase with a faint spine line — probed,
   the 1.935 ring had a 0.07 channel and then a FLAT plateau from 164 to 149
   degrees: no column, no valley, nothing for the light to turn on).

   The 24-side ring puts a vertex every 15 degrees, so every mass here is
   designed ONTO vertices rather than between them: the channel is the 180
   vertex; the erector column is the 165 / 150 pair, a lobe centred between
   them at 157.5 so both stand and the channel gets only their tails; the
   valley outside the column (the lat's insertion edge, the medial scapular
   border higher up) is the 135 vertex, pulled INSIDE the chord of its
   neighbours; the trapezius kite (upper rows only) broadens the column's
   plateau toward 135; teres major (the under-delt mass, chest rows only)
   sits on the 120 vertex. Every strength is per ring, because the lumbar
   erectors are the tallest thing on the lower back and the upper back
   belongs to the kite. */
function backTerms(a, o) {
  var ea = o.erectorAt == null ? 0.39 : o.erectorAt, ew = o.erectorW == null ? 0.27 : o.erectorW;
  var va = o.valleyAt == null ? 0.785 : o.valleyAt;
  var flat = -lobe(a, Math.PI, 1.10) * (o.flat == null ? 0.08 : o.flat);
  var spine = -lobe(a, Math.PI, 0.19) * (o.spine == null ? 0.26 : o.spine);
  var erector = (lobe(a, Math.PI - ea, ew) + lobe(a, -Math.PI + ea, ew)) * (o.erector || 0);
  var kite = (lobe(a, Math.PI - 0.55, 0.42) + lobe(a, -Math.PI + 0.55, 0.42)) * (o.kite || 0);
  var valley = -(lobe(a, Math.PI - va, 0.15) + lobe(a, -Math.PI + va, 0.15)) * (o.valley == null ? 0.08 : o.valley);
  var teres = (lobe(a, Math.PI - 1.00, 0.20) + lobe(a, -Math.PI + 1.00, 0.20)) * (o.teres || 0);
  /* R108 b: the lat's REAR belly — the wing seen from behind. The flare on
     the 105 vertex is the silhouette; from the back what reads is a mass
     that bulges backward on 120-135 with the valley between it and the
     erector column moved in to 145. Mid rows only; the lumbar is the
     erectors' and the upper back the kite's. */
  /* A Gaussian, not a belly, and STRONG: the ring is an ellipse, and an
     ellipse's back curves forward as it goes lateral (at 1.78 the 135 vertex
     sat 0.03 forward of the erector and the 120 vertex 0.08 forward), so the
     back read as a barrel however the erectors were cut. The reference's back
     is a SLAB — flat from the spine channel out to the lat's edge, then a
     rounded corner into the side. Pushing the 120-135 vertices back until
     they are flush with the erector column is what makes the cross-section a
     rounded rectangle, and the lat wing is that flat plane's outer edge. */
  var latBack = (lobe(a, Math.PI - 0.85, 0.30) + lobe(a, -Math.PI + 0.85, 0.30)) * (o.latBack || 0);
  return flat + spine + erector + kite + valley + teres + latBack;
}

function chestShape(k, erectorK, latK, opts) {
  var ek = erectorK == null ? 0.100 : erectorK;
  var lk = latK == null ? 1.0 : latK;   /* R107: the lat is scaled on its own, not by the pec's k — the under-pec shelf ring (k 0.5) was pinching the lat too, a groove all round the torso */
  var o = opts || {};
  var ik = o.insertion == null ? 0.12 : o.insertion;
  // R109 Astra: compact anterior bellies leave ribcage/back depth independent.
  var pa = o.pecAt == null ? 0.55 : o.pecAt;
  var pw = o.pecW == null ? 0.54 : o.pecW;
  var kk = Math.max(k, 1e-3);
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
  /* R108 — `k` scales the PEC ONLY. It walks the pectoral's projection down
     the chest rings (a long clavicular sweep to a low apex and a fast turn
     under), and nothing on the back or the flank should follow it; the lat,
     the insertion and the whole back are divided out of it. */
  return function (a) {
    /* R108: the trench is WIDER and deeper (0.22 x 0.38 -> 0.30 x 0.44) so
       the 15-degree vertex sits on the pec's rolled inner edge rather than
       already on its crown — the reference's pecs roll away from the sternum,
       they do not meet it in a V one vertex wide. */
    var sternum = -lobe(a, 0, 0.30) * (o.maleAnatomy ? 0.10 : 0.440);
    var pec = o.maleAnatomy ? domePair(a, pa, pw) * 0.66 : (belly(a, 0.64, 0.44) + belly(a, -0.64, 0.44)) * 0.560;   /* R105; R106; R107: each pec a full BELLY that falls fast into the trench and the armpit */
    /* R108: the lat's upper mass is the flare under the armpit — a belly on
       the 105 vertex (0.42 wide, where R107's 0.56 reached from 60 to 150
       degrees and rounded the whole flank into a barrel). */
    var lat = (belly(a, Math.PI / 2 + 0.30, 0.42) + belly(a, -Math.PI / 2 - 0.30, 0.42)) * 0.300 * lk / kk;
    /* R102: the pec / deltoid junction and the outer pec insertion — a groove at
       the armpit line so the pec ends in shadow against the shoulder. R108:
       per ring, strongest on the crown rings where the pec's lower-outer edge
       falls into the armpit, faint on the under-pec ring. */
    var insertion = -(lobe(a, 1.28, 0.22) + lobe(a, -1.28, 0.22)) * ik / kk;
    var back = backTerms(a, { flat: o.flat, spine: o.spine, erector: ek, erectorAt: o.erectorAt, erectorW: o.erectorW, kite: o.kite, valley: o.valley, valleyAt: o.valleyAt, teres: o.teres, latBack: o.latBack }) / kk;
    var under = o.maleAnatomy ? -domePair(a, 0.99, 0.33) * (o.under || 0) : 0;
    return 1 + (sternum + pec + lat + insertion + back) * k + under;
  };
}

/* CORE — a central abdominal plane with a shallow division either side of it,
   and the oblique running back to the flank. Deliberately much weaker than the
   chest: the brief asks for restrained core structure, not a six-pack. */
/* R96: `rectus` is a second argument, because the abdominal blocks are made
   by ALTERNATING it ring to ring — a bulge ring carries full rectus lobes and
   the crease ring between two blocks carries almost none, so the front of the
   abdomen steps in and out three times between the belt and the pecs. That
   is the reference's UPPER / MIDDLE / LOWER pair, built as shallow volumes
   that light and shadow one another, not painted. */
/* R102: `latK` is the LATISSIMUS — a lateral lobe set slightly behind the
   side angle, carried by the upper core rings so the lat hangs below the
   armpit as a block and the waist pinches out of it (the R102 references'
   V is a block-and-pinch, not a funnel: 0.18 of height held from t 0.37 to
   0.42, then 0.128 at 0.47). The oblique groove between the lat and the
   rectus is what makes the lat read as its own mass. */
/* R108 — THE ABDOMEN IS COLUMNS FIRST. Probed, the R107 abdomen had its
   crease rings at the SAME front depth as the block rings either side
   (0.216 against 0.217 at the crest): the ring depth grew 0.02-0.034 per
   row up the abdomen and swallowed the 0.24 / 0.10 rectus step whole, so
   the front was a smooth barrel with a faint linea. The rhythm now lives in
   the multiplier against a depth that grows smoothly (so the BACK stays a
   continuous surface), at an amplitude sized to the crease the reference
   shows — about 0.03 units under the block above it, 15% of a block's
   width — not the 0.1 slot of R105 and not R106's nothing.

   Around the ring the rectus column is designed onto vertices: the linea on
   the 0 vertex, the column's crest across 15 and 30, the SEMILUNAR valley
   (the rectus's outer edge) on the 45 vertex, the oblique belly on 60-75,
   and the oblique's centre walks toward the back as the rows rise
   (`obliqueShift`) so the side body reads as the diagonal sweep from the
   ribcage down to the waist rather than as a vertical rail. */
function coreShape(k, rectusK, latK, latShift, erectorK, opts) {
  var rk = rectusK == null ? 0.120 : rectusK;
  var lk = latK == null ? 0 : latK;
  var ls = latShift == null ? 0 : latShift;   /* R106: the lat's centre walks toward the spine as it descends — the back sheet's lat inserts diagonally into the lower back */
  var ek = erectorK == null ? 0.080 : erectorK;
  var o = opts || {};
  var os = o.obliqueShift == null ? 0 : o.obliqueShift;
  var ok = o.oblique == null ? 0.10 : o.oblique;
  var sk = o.serratus || 0, sc = o.serratusAt == null ? 1.10 : o.serratusAt;
  var vk = o.valleyK == null ? 0.10 : o.valleyK;   /* the semilunar valley is CONSTANT down the rows: tied to the block height it alternated on the flank vertices too, and the abdominal waves ran right round the side */
  return function (a) {
    /* R108: the column is the 15 and 30 vertices (a 24-side ring puts the
       front's whole half-width on three vertices once the ellipse is wider
       than deep), so the belly is centred on 0.30 with its tail gone by 60
       degrees; the linea is deep enough that the two bellies' overlap on the
       0 vertex still leaves a trench. */
    var linea = -lobe(a, 0, 0.20) * (o.maleAnatomy ? 0.24 : (0.34 + 0.50 * rk));   /* R100; R102; R106; R107: narrow and deep between the bellies; R108: deeper where the blocks are taller — the columns have to outrank the rows */
    /* R108 b: the belly is WINDOWED — zero past 0.72 rad. A quarter of its
       height was still landing on the 45-degree vertex, so the block rows
       alternated on the flank too and the abdomen read as ribs running
       round the side (probed: the semilunar column's normal swung -0.14 /
       -0.64 / 0.0 / -0.56 row to row). */
    var ae = Math.abs(frontDelta(a));
    var win = ae <= 0.40 ? 1 : ae >= 0.66 ? 0 : (function (t) { return 1 - t * t * (3 - 2 * t); }((ae - 0.40) / 0.26));
    var rectus = o.maleAnatomy
      ? domePair(a, o.rectusAt == null ? 0.36 : o.rectusAt, 0.43) * rk
      : (belly(a, 0.30, 0.28) + belly(a, -0.30, 0.28)) * rk * win;   /* R107: raised bellies with a rounded apex either side of the linea */
    var semilunar = -(lobe(a, 0.78, 0.16) + lobe(a, -0.78, 0.16)) * vk;
    var oblique = (lobe(a, 1.12 + os, 0.34) + lobe(a, -1.12 - os, 0.34)) * ok;
    var serratus = (lobe(a, sc, 0.13) + lobe(a, -sc, 0.13)) * sk;   /* R105; R107; R108: a tooth per ring, stepping round the ribcage row by row */
    var lat = (belly(a, Math.PI / 2 + 0.25 + ls, 0.45) + belly(a, -Math.PI / 2 - 0.25 - ls, 0.45)) * lk;
    var back = backTerms(a, { flat: o.flat == null ? 0.07 : o.flat, spine: o.spine == null ? 0.24 : o.spine, erector: ek, erectorAt: o.erectorAt, erectorW: o.erectorW, valley: o.valley, valleyAt: o.valleyAt, latBack: o.latBack });
    return 1 + (linea + rectus + semilunar + oblique + serratus + lat + back) * k;
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
    /* R95-BB: 0.34 -> 0.26. With the abs channel and the quad seam below it,
       the sternum drew as one dark stripe splitting the torso from throat to
       belt; the reference's groove is narrower and the pecs' inner edges are
       rounded toward it. */
    var sternum = 0.26 - (yy - 1.80) * 0.30;                 /* 0.26 at the lower pec, ~0.17 at the clavicle */
    var pecOuter = 1.02 + (yy - 1.80) * 0.95;                /* the lobe reaches out toward the shoulder as it rises */
    var pecSplit = 0.30 + (pecOuter - 0.30) * 0.58;          /* inner plane / outer plane */
    var table = row === 1 ? REGIONS.PEC_UPPER : REGIONS.PEC_LOWER;
    /* R98 — each plane's share of the platinum coat (see REGIONS): the
       sternum valley none, the pec's inner plane some, its OUTER plane — the
       upper-pec-to-front-delt transition — the most, the armpit almost none. */
    if (ae < sternum) return { classes: REGIONS.STERNUM.classes, seed: 10 + row, index: 0, coat: 0 };
    if (ae < pecSplit) return { classes: table.classes, seed: 20 + row * 4 + side, index: 1, coat: table.coat * 0.60 };
    if (ae < pecOuter) return { classes: table.classes, seed: 22 + row * 4 + side, index: 2, coat: table.coat };
    /* R99: the underarm pocket is LOST — the darkest row, no coat — so the
       deltoid and the pec read as masses with a shadow between them rather
       than as two lit objects touching. */
    if (ae < 2.05) return { classes: REGIONS.OBLIQUE.classes, seed: 30 + row * 2 + side, index: 0, coat: 0.04 };   /* lats / the underarm pocket */
    /* R97 — THE BACK IS AUTHORED TOO: a near-black spine channel, erector
       planes either side of it, and the lat / upper-back planes out to the
       arm, so the rear reads as designed rather than as leftover geometry. */
    if (ae > 2.92) return { classes: REGIONS.STERNUM.classes, seed: 90 + row, index: 0, coat: 0 };              /* spine channel */
    if (ae > 2.50) return { classes: REGIONS.ABS.classes, seed: 92 + row * 2 + side, index: 0, coat: 0.35 };    /* erectors */
    return { classes: REGIONS.OBLIQUE.classes, seed: 96 + row * 2 + side, index: 1, coat: 0.45 };               /* lat / upper back */
  };
}
/* R99 — THE UNDERSIDE OF THE PEC. The crease ring where the chest shelf
   turns under is its own zone: across the whole pec width it takes the
   sternum table's second row (a deep, uncoated plane), so the shelf casts a
   shadow onto the ribcage below it — the contact darkening the godform brief
   asks for between overlapping masses — and outside the pecs it falls
   through to the upper core. */
function pecUnderZone(a, y) {
  var e = frontDelta(a), ae = Math.abs(e), side = e < 0 ? 0 : 1;
  if (ae < 0.24) return { classes: REGIONS.STERNUM.classes, seed: 14, index: 0, coat: 0 };
  if (ae < 1.30) return { classes: REGIONS.STERNUM.classes, seed: 15 + side, index: 1, coat: 0 };
  return coreZone(3)(a, y);
}
/* R100 — the sub-clavicular groove: dark under the collar lobes, the
   sternal notch darker still, the shoulder ends left to the upper pec's
   outer plane so the front deltoid runs into it. */
function subclavicleZone(a, y) {
  var e = frontDelta(a), ae = Math.abs(e), side = e < 0 ? 0 : 1;
  if (ae < 0.32) return { classes: REGIONS.STERNUM.classes, seed: 120, index: 0, coat: 0 };
  if (ae < 1.30) return { classes: REGIONS.STERNUM.classes, seed: 121 + side, index: 2, coat: 0.10 };   /* the hollow, not a black band */
  if (ae < 2.05) return { classes: REGIONS.PEC_UPPER.classes, seed: 22 + 4 + side, index: 2, coat: 0.85 };
  return pecZone(1)(a, y);
}
/* R100 — the trapezius: a lit diagonal plane either side of a dark valley
   at the neck, front and back, so the rise toward the neck reads as a pair
   of muscles and not as a collar. */
function trapZone(a, y) {
  var e = frontDelta(a), ae = Math.abs(e), side = e < 0 ? 0 : 1;
  if (ae < 0.30) return { classes: REGIONS.STERNUM.classes, seed: 124, index: 1, coat: 0 };          /* the notch / neck valley, front */
  if (ae > 2.85) return { classes: REGIONS.STERNUM.classes, seed: 125, index: 0, coat: 0 };          /* the valley behind the neck */
  if (ae > 1.90) return { classes: REGIONS.DELT.classes, seed: 126 + side, index: 2, coat: 0.55 };   /* the trap's upper plane */
  return { classes: REGIONS.PEC_UPPER.classes, seed: 128 + side, index: 2, coat: 0.60 };            /* collar to shoulder */
}
function coreZone(row) {
  return function (a, y) {
    var e = frontDelta(a), ae = Math.abs(e), side = e < 0 ? 0 : 1;
    var yy = y == null ? 1.50 : y;
    var channel = 0.16 - (yy - 1.18) * 0.04;
    /* R97: the blocks are NARROW — a pair either side of the channel, not
       the whole front — so the dark oblique planes flank them and the V of
       the torso reads through the core. */
    var absOuter = 0.56 + (yy - 1.18) * 0.20;
    var obliqueOuter = 1.40 + (yy - 1.18) * 0.30;
    if (ae < channel) return { classes: REGIONS.STERNUM.classes, seed: 40 + row, index: 0, coat: 0 };   /* the central channel */
    /* R96: rows 1-3 are the three abdominal pairs; the middle pair takes the
       lit row so the stack reads as three values, not one plane. */
    /* R98: the abdominal blocks take the coat on their ridge (the belt row
       does not), the obliques a quarter of it, the channel and spine none. */
    if (ae < absOuter) return { classes: REGIONS.ABS.classes, seed: 50 + row * 2 + side, index: row === 0 ? 0 : 1, coat: row === 0 ? 0.20 : REGIONS.ABS.coat };
    /* R100 — SERRATUS: on the upper rows the plane between the abdominal
       blocks and the flank is cut into an alternating saw of lit and lost
       facets, the rhythm the reference shows under the outer pec. */
    if (ae < obliqueOuter) {
      if (row >= 2) {
        var tooth = Math.floor((ae - absOuter) / 0.27) % 2 === 0;
        return { classes: REGIONS.OBLIQUE.classes, seed: 60 + row * 2 + side + (tooth ? 0 : 8), index: tooth ? 2 : 0, coat: tooth ? 0.40 : 0 };
      }
      return { classes: REGIONS.OBLIQUE.classes, seed: 60 + row * 2 + side, index: row === 0 ? 0 : 1, coat: REGIONS.OBLIQUE.coat };
    }
    if (ae > 2.92) return { classes: REGIONS.STERNUM.classes, seed: 100 + row, index: 0, coat: 0 };    /* spine channel */
    if (ae > 2.55) return { classes: REGIONS.ABS.classes, seed: 102 + row * 2 + side, index: 0, coat: 0.30 };   /* erectors */
    return { classes: REGIONS.OBLIQUE.classes, seed: 106 + row * 2 + side, index: 0, coat: 0.30 };              /* lower back / lat */
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

/* R95-BB — THE SINGLE QUAD. One lower-body mass, shaped like a thigh.

   `reference/mrmah-refE-bodybuilder-a.png` (1024 x 1536; apex y 165, tip
   y 1145, so 980 px of character and 327 px to the unit) has ONE lower-body
   piece below a tight waist belt — never two legs — and it is not a cone: it
   swells out immediately under the belt to its widest (half-width 0.256 at
   y 1.33), holds that width to about y 1.05, then runs a long convex sweep on
   its OUTER edge down to the point (0.228 at y 1.00, 0.153 at 0.71, 0.08 at
   0.40). Read as anatomy that is a vastus-lateralis sweep on a single quad; the
   front carries a shallow seam between two heads, and the back is flatter with
   the glute mass deliberately restrained.

   Cross-section, as a per-vertex radius multiplier (same convention as
   chestShape): a groove down the front centre, two quad heads either side of
   it, the lateral sweep at the front-outer angle, and a flattened back. */
function quadShape(k, gluteK, hamK) {
  var gk = gluteK == null ? 1.0 : gluteK;
  var hk = hamK == null ? 0 : hamK;
  return function (a) {
    /* R97: the heads and the sweep are muscle BELLIES now — a centre of
       fullness the eye can find — and the back keeps a restrained glute. */
    /* R102: the seam is DEEP — the R102 front reference reads two thigh masses
       either side of a dark channel all the way to the knee — and the back
       carries a restrained but real glute PAIR with a cleft, not a flattened
       curve. */
    /* R106: authored against the size of what they displace — at d 0.256 a
       0.24 head moved a vertex 0.06 and the clay view still showed a vase.
       The quad heads, the seam and the glute pair are now masses the
       Lambert clay reads without the cavity term's help. */
    var seam = -lobe(a, 0, 0.24) * 0.360;
    var heads = (belly(a, 0.58, 0.42) + belly(a, -0.58, 0.42)) * 0.320;   /* R107: two full quad bellies either side of the seam */
    var sweep = (lobe(a, 1.30, 0.55) + lobe(a, -1.30, 0.55)) * 0.160;   /* R103: less outer-thigh bulge */
    /* R106: the glute PAIR is a real mass (0.14 -> 0.22) with a deeper cleft;
       in the rear clay view the lower body was a smooth vase with no glute. */
    /* R106 back sheet: the glutes are two SPHERES that project back with a
       fold under them (`gluteK` falls to nothing by the mid-thigh) and two
       hamstring columns take over below the fold (`hamK`). */
    var glute = (lobe(a, Math.PI, 0.90) * -0.020 + (belly(a, Math.PI - 0.70, 0.36) + belly(a, -Math.PI + 0.70, 0.36)) * 0.520 - lobe(a, Math.PI, 0.22) * 0.620) * gk;   /* R107: two SPHERES 40 degrees off the back with a valley a third of their height deep (see variants.js) */   /* the cleft's centre vertex goes BELOW the ring (mul 0.80) so the cavity term darkens it; at 0.32 it sat at 1.0 and read as a line */
    var ham = ((lobe(a, Math.PI - 0.42, 0.36) + lobe(a, -Math.PI + 0.42, 0.36)) * 0.160 - lobe(a, Math.PI, 0.14) * 0.080) * hk;
    return 1 + (seam + heads + sweep + glute + ham) * k;
  };
}
/* R102 — THE KNEE AND THE CALF. The lower body is still ONE crystalline
   mass (never two legs), but every R102 reference carries a knee band — a
   concavity where the thighs' channel closes — and a calf swell below it,
   before the taper resolves to the point. Measured on the male front
   (fractions of character height, full width): thigh 0.140 at t 0.66, knee
   0.089 at t 0.75, calf 0.101 at t 0.80; the rear and both female views
   carry the same three landmarks. The knee is flat-fronted with the channel
   closing into a shallow notch; the calf is two posterior bellies (the
   gastrocnemius pair) with a hard front ridge, so it reads from behind and
   from the three-quarter as muscle rather than as a bulge in the cone. */
function kneeShape(k) {
  return function (a) {
    var notch = -lobe(a, 0, 0.30) * 0.090;
    var caps = (lobe(a, 0.55, 0.40) + lobe(a, -0.55, 0.40)) * 0.070;
    var back = lobe(a, Math.PI, 0.70) * -0.060;
    return 1 + (notch + caps + back) * k;
  };
}
function calfShape(k) {
  return function (a) {
    var ridge = lobe(a, 0, 0.26) * 0.060;
    var shin = -(lobe(a, 0.55, 0.28) + lobe(a, -0.55, 0.28)) * 0.060;
    var bellies = (lobe(a, Math.PI - 0.62, 0.50) + lobe(a, -Math.PI + 0.62, 0.50)) * 0.260;
    var cleft = -lobe(a, Math.PI, 0.18) * 0.080;
    return 1 + (ridge + shin + bellies + cleft) * k;
  };
}
/* R108 — THE MALE LOWER BODY IS A SET OF MUSCLE EVENTS ON ONE MASS.

   The R107 table made its width with the ring radius (`w` 0.276 at the hip
   against 0.150 at the belt) and laid a quad seam and a glute pair over it;
   in smooth clay that is a vase — small waist, one enormous oval, a point —
   and it measured 2.06 : 1 against the brief's 1.5 : 1. Here the base ring
   stays at the waist's radius all the way to the knee (w 0.148-0.164) and
   EVERY unit of width beyond it is a named muscle: the vastus lateralis
   sweep makes the lateral apex, the rectus femoris the forward depth, the
   glute pair the posterior shelf. Each takes its own amplitude per ring, so
   a muscle has an origin (amplitude rising), a belly (peak) and an insertion
   (amplitude falling to nothing) — the four properties the brief asks for —
   instead of one k scaling every lobe together.

   Cross-section, by angle from dead front (24 sides, a vertex every 15 deg):
     0        seam    the channel between the two thigh columns
     +-29     rf      rectus femoris — the long central belly of each column
     +-53     valley  the RF / VL separation (shallow; the clay reads the plane change)
     +-80     vl      vastus lateralis — the lateral sweep; the silhouette IS this lobe
     +-18     vm      vastus medialis — the teardrop above the knee, medial and low
     +-112    itb     the flat between the VL and the hamstring
     180-+35  glute   two glute masses; negative here is the fold under them
     180      cleft   between the glutes (deep: the centre vertex sits at half the ring)
     180-+26  ham     the hamstring columns under the fold
     180      hamCleft
   All amplitudes are FINAL multipliers (0.30 = 30% of the ring radius),
   so a row can be read straight off the table. */
function thighShape(o) {
  /* `head` is the whole thigh column's roundness — one dome from the seam to
     the side, peaking at 40 degrees — and `rf` is a SUBTLE ridge on it (the
     brief's longitudinal relief, not a second column); `vl` is the lateral
     sweep, from 49 to 112 degrees, which is what the silhouette is made of;
     `vm` the teardrop beside the seam on the lower rows; `itb` the flat
     between the VL and the hamstring. A first cut built the RF and VL as two
     narrow Gaussian bellies with a valley cut between them and the clay
     showed three flat vertical strips per column — polygon anatomy. */
  var seam = o.seam || 0, head = o.head || 0, rf = o.rf || 0, vl = o.vl || 0, vm = o.vm || 0, valley = o.valley || 0;
  var glute = o.glute || 0, cleft = o.cleft || 0, ham = o.ham || 0, hamCleft = o.hamCleft || 0, itb = o.itb || 0;
  /* The glute is a SPHERE, so its section is not the same on every ring:
     the upper shelf sits lateral and wide, the lower part narrower and
     nearer the cleft, and the fold under it is therefore CURVED in the rear
     view — higher at the outer edge, lowest under the centre of the mass —
     rather than the horizontal cut a fixed lobe makes. `gluteC` / `gluteW`
     place the dome per ring (radians off the back; W is the half-width). */
  var gC = o.gluteC == null ? 0.60 : o.gluteC, gW = o.gluteW == null ? 0.52 : o.gluteW;
  var PI = Math.PI;
  return function (a) {
    var m = 1;
    m -= dome(a, 0, 0.30) * seam;
    m += domePair(a, 0.70, 0.75) * head;
    m += domePair(a, 0.42, 0.28) * rf;
    /* `valley` is the groove between the RF column and the VL at 57 degrees:
       without it the column climbed monotonically into the VL and the front
       read as one smooth cylinder per side (round 4). */
    m -= domePair(a, 1.00, 0.30) * valley;
    /* R109: the sweep is BROADER — centre 1.42, half-width 0.55 (50 to 113
       degrees) where R108 ran 1.45 / 0.50 — and it is no longer where the
       width comes from. On a base ring no wider than the belt the VL was a
       FIN: the 60-degree vertex sat at 0.19 and the 75-degree vertex at
       0.28, a 0.09 step on a 0.19 body, which the clay read as a ridge down
       the outer thigh. The R109 rows carry the quad's width in `w`; the
       sweep peaks on the 75-degree vertex (forward of the side, the vastus
       lateralis' belly) with the RF / VL valley on the 60-degree vertex
       between it and the quad head, so the section is one convex oval with
       a plane change on it rather than a fin. */
    m += domePair(a, 1.42, 0.55) * vl;
    m += domePair(a, 0.30, 0.32) * vm;
    m -= domePair(a, 1.95, 0.30) * itb;
    m += domePair(a, PI - gC, gW) * glute;
    m -= dome(a, PI, 0.30) * cleft;
    m += domePair(a, PI - 0.50, 0.45) * ham;
    m -= dome(a, PI, 0.22) * hamCleft;
    return m;
  };
}
/* R108 — THE MALE CALF, SOLEUS AND ACHILLES, by the same rule. `calfShape`
   above is kept as it was because the female table calls it; this one names
   each event so the rows can grade them: a tibial ridge and shin flats on
   the front, a MEDIAL gastrocnemius head (large, low, near the centre) and a
   LATERAL head (smaller, higher, further out) so the calf is asymmetric
   within each half and symmetric across the body, a soleus that is wider
   and lower than either, a cleft between the medial heads, and for the
   Achilles rows a narrow tendon with hollows either side of it. */
function lowerLegShape(o) {
  /* THE FRONT IS THE SAME GRAMMAR FROM THE KNEE TO THE ANKLE. The first cut
     put the knee's front at a notch between two patellae and the calf's at
     one central ridge, so the columns FLIPPED between the two rings and the
     clay showed a zigzag of seams across the shin. On one fused mass the
     centre front is the channel between the two columns all the way down:
     `notch` at 0, `caps` (the patellae) at +-29 deg on the knee, `shins` (the
     tibial ridges) at +-26 deg below it, and the centre is never a ridge. */
  var notch = o.notch || 0, caps = o.caps || 0, shins = o.shins || 0, pit = o.pit || 0;
  var medial = o.medial || 0, lateral = o.lateral || 0;
  var cleft = o.cleft || 0, soleus = o.soleus || 0, tendon = o.tendon || 0, hollow = o.hollow || 0;
  var PI = Math.PI;
  return function (a) {
    var m = 1;
    m -= dome(a, 0, 0.30) * notch;
    m += domePair(a, 0.50, 0.32) * caps;
    m += domePair(a, 0.45, 0.30) * shins;
    m -= dome(a, PI, 0.70) * pit;
    m += domePair(a, PI - 0.48, 0.42) * medial;
    m += domePair(a, PI - 1.00, 0.38) * lateral;
    m -= dome(a, PI, 0.25) * cleft;
    m += domePair(a, PI - 0.80, 0.70) * soleus;
    m += dome(a, PI, 0.35) * tendon;
    m -= domePair(a, PI - 0.60, 0.40) * hollow;
    return m;
  };
}
/* And the quad's planes, by zone: a dark seam down the centre, a quad head
   either side of it as one plane each, the lateral sweep as a lit sapphire
   plane, and the back left to the body lottery. Two rows so the upper mass
   and the sweep read as separate planes. */
function quadZone(row) {
  return function (a, y) {
    var e = frontDelta(a), ae = Math.abs(e), side = e < 0 ? 0 : 1;
    var yy = y == null ? 1.15 : y;
    var seam = 0.16 + (1.30 - yy) * 0.10;                 /* the seam widens toward the spear */
    var headOuter = 1.00 + (1.30 - yy) * 0.25;
    var sweepOuter = 1.95;
    /* Histogrammed against the reference's quad (43% of it under 32 luma, 49%
       in 32-63, 4% above), a first cut with lit heads and bright-blue sweep
       planes came back with a mean of 54 against 38: the reference's quad is a
       DARK navy mass whose light sits on its outer edge, so the heads take the
       dark and sapphire rows and the sweep the sapphire and lit rows. */
    /* R98: the quad's OUTER SWEEP is a platinum hero plane; the seam none,
       the heads a little, the back the body's default. */
    if (ae < seam) return { classes: REGIONS.STERNUM.classes, seed: 80 + row, index: 0, coat: 0 };
    /* R109: one row lighter and more coat — measured over the quad the reference is 43% under 32 with a graded middle and a 4% platinum tail; after the value pass darkened the body this build's quad was 76% under 32 with no tail at all. The light the quad keeps is platinum, not cyan. */
    if (ae < headOuter) return { classes: REGIONS.ABS.classes, seed: 82 + row * 2 + side, index: row === 0 ? 2 : 3, coat: 0.75 };
    if (ae < sweepOuter) return { classes: REGIONS.TAPER_FLANK.classes, seed: 86 + row * 2 + side, index: row === 0 ? 2 : 3, coat: 1.0 };   /* R109: one row lighter — the sweep is the quad's lit edge in the reference */
    return null;
  };
}

/* R100 — THE GROOVE UNDER THE CLAVICLE. A ridge is only a ridge against a
   hollow beneath it: this ring sits between the upper pec and the shoulder
   line and pulls IN where the collar lobes above it stand out, so the
   clavicle reads as a bar across the top of the chest with shadow under it
   rather than as a widening of the pec. */
/* R108 — THE TRAPEZIUS IS LATERAL, AND THE SPINE RUNS THROUGH IT. The R107
   trap lobes (0.6 wide at 140 degrees) put 0.51 of their strength on the 180
   vertex, so the shoulder-line ring bulged 0.04 BEHIND the ring under it at
   the spine and then the back stepped in 0.108 over 0.056 of rise to the neck
   base — worked through, a surface facing UP: the horizontal roll across the
   upper back in the rear clay. The lobes are narrower and further round
   (0.45 at 134 degrees), a nuchal notch (`notch`) takes the spine's own
   vertex down so the back's depth falls MONOTONICALLY from the chest through
   the girdle into the neck column, and a shallow flattener keeps the upper
   back a plane rather than a drum. The shoulder shelf is gone: the corner
   sits inside the deltoid dome and the ring stays at w 0.30 at the side. */
function trapTerms(a, tk, nk, fk) {
  var traps = (lobe(a, Math.PI - 0.80, 0.45) + lobe(a, -Math.PI + 0.80, 0.45)) * tk;
  var nuchal = -lobe(a, Math.PI, 0.28) * nk - lobe(a, Math.PI, 1.10) * fk;
  return traps + nuchal;
}
function subclavicleShape(k, trapK, pecK, opts) {
  var tk = trapK == null ? 0 : trapK;
  var pk = pecK == null ? 0 : pecK;
  var o = opts || {};
  var nk = o.notch == null ? 0 : o.notch;
  var fk = o.flat == null ? 0.06 : o.flat;
  return function (a) {
    /* R106: in the clay view the 0.10 undercut under a 0.45-strength upper
       pec was a black SLOT across the top of the chest (the pec overhung this
       ring by 0.18); the reference's upper chest rises smoothly into the
       collarbone with a shallow hollow under it. And this ring now carries
       the first step of the trapezius (`trapK`), so the traps climb from
       here through the shoulder line to the neck instead of standing on the
       shoulder-line ring alone as a ledge. */
    var hollow = -(lobe(a, 0.95, 0.40) + lobe(a, -0.95, 0.40)) * 0.050;
    var notch = -lobe(a, 0, 0.30) * 0.06;
    var pec = ((belly(a, 0.64, 0.44) + belly(a, -0.64, 0.44)) * 0.56 - lobe(a, 0, 0.30) * 0.44) * pk;   /* R107: the upper pec's tail; R108: the same trench and bellies as chestShape */
    return 1 + (hollow + notch + pec + trapTerms(a, tk, nk, fk)) * k;
  };
}
function clavicleShape(k, opts) {
  var o = opts || {};
  /* The male rows pass every value; the defaults are what the female's
     girdle and neck-base rings (variants.js, no opts) receive. No notch and
     a modest trap there: with the male's notch her neck base drew two small
     horns either side of the nape in the rear clay. */
  var nk = o.notch == null ? 0 : o.notch;
  var tk = o.traps == null ? 0.18 : o.traps;
  var fk = o.flat == null ? 0.04 : o.flat;
  return function (a) {
    /* R108 b: 0.12 -> 0.03. The front hollow made the girdle ring's front
       0.05 SMALLER than the groove ring's 0.02 below it — a fold facing
       straight up (probed: normal y 0.98 at y 2.104), the bright bar under
       the collarbone in every clay capture since R103 lowered the girdle.
       The clavicle is the top edge above the sub-clavicular hollow, not a
       hollow of its own. */
    var hollow = -lobe(a, 0, 0.60) * 0.030;
    var collar = (lobe(a, 0.95, 0.42) + lobe(a, -0.95, 0.42)) * 0.110;   /* R108: narrower, so the collar's tail no longer widens the side vertex — the shoulder corner stays at w 0.30 inside the deltoid dome */
    /* R106: 0.72 -> 0.30. Worked through at the rear-side angle the
       shoulder-line ring stood 0.18 proud of the ring 0.02 below it and 0.04
       proud of the one above — a LEDGE, the flat lid the rear clay view
       showed, with a black slot under it. The trapezius is now a slope: the
       lobe grows from 0.17 on the groove ring through 0.30 here to the neck
       base's share, and the rings above narrow faster than they rise. */
    return 1 + (hollow + collar + trapTerms(a, tk, nk, fk)) * k;
  };
}

/* R95-BB — THE BODYBUILDER LOCK. Where the numbers below come from.

   `reference/mrmah-refE-bodybuilder-a.png` is the body-proportion target from
   here on: a compact, dense, very muscular crystal guardian — broad faceted
   deltoids that flow out of the trapezius and clavicle, thick pectoral shelves
   either side of a dark sternum, arms with real bicep, tricep and forearm mass,
   a much tighter waist, and one quad-shaped lower body. Measured on it at 327
   px to the unit, against the values this table carried:

     chest (pec line)      half-width 0.35  (was 0.328)   and deeper
     waist                 half-width 0.22  (was 0.244)   a 37% pinch, not 26%
     quad, widest          half-width 0.256 (was 0.264)   the SHAPE changes, not the width
     shoulder, outer edge  0.60 on the lowered side, i.e. 1.94 of the head's
                           half-width — this build had 1.43
     upper arm, mid-bicep  radius 0.153 (was 0.104 nominal, 0.137 at the belly)
     forearm               radius 0.118 (was 0.081)
     wrist                 radius 0.090 (was 0.055)
     hand                  1.4x this build's, in both width and length

   The head is kept at its canonical size (it is the recognition feature and
   the brief says to keep it), so the head-to-shoulder ratio is moved by
   growing the shoulders, not shrinking the head: deltoid outer edge 0.68, arm
   joints outboard to match, arms ~40% thicker. The character's height is
   unchanged, so every camera solve and framing is unchanged. */

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
  sides: 24,   /* R105: a pec dome, a rectus block and an oblique each need vertices to be ROUND; at 14 a lobe was one flat facet; R107: 24 — a glute belly spans four vertices */
  /* R107 — SMOOTH CURVE FIRST. One ring is inserted between every authored
     pair on a Catmull-Rom curve (forge.js refineSections), so the profile is
     a pencil stroke rather than a chain of segments and the shape lobes flow
     from ring to ring. The authored table stays the design; the spline is
     the sculpt. */
  refine: 1,
  jitter: 0.45,
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
    /* R95-BB — THE LOWER BODY IS ONE QUAD, and the torso above it is a
       bodybuilder's. See the note above TORSO. From the point upward: the
       spear, then the sweep of the quad's outer edge (0.153 at 0.71, 0.228 at
       1.00), the held width of the mass (0.256 from 1.05 to 1.30), the belt at
       the waist (0.22 at 1.48 — the deepest concavity on the character), the
       abdominal block, the ribcage flaring to the pectoral shelf (0.36 at
       1.97), and a shoulder line raised to 2.170 so the deltoids can sit
       0.12 under the chin the way the reference's do. */
    /* `w` IS THE RING RADIUS BEFORE `shape`, and the SILHOUETTE is w times the
       shape at the side angle — chestShape's lateral lobe adds 10%, the quad's
       sweep 10-12%, coreShape's oblique 3-4%. A first cut of this table set w
       to the reference's silhouette and came back 13% too wide across the
       ribcage, a barrel; the numbers below are pre-divided so that the
       silhouette lands on the measurement: chest 0.357 at 1.97, then a FAST
       V — 0.305 at 1.83, 0.248 at 1.66, 0.22 at the belt — which is what
       makes a broad chest read as a bodybuilder's rather than a barrel's. */
    /* R98: `coat` per band is the platinum share (see REGIONS in regions.js);
       the taper's columns take a moderate share and the shader's class gate
       keeps it on the lit flank columns and off the dark spear. */
    { y: 0.000, w: 0.006, d: 0.004, fg: [2, 2], columns: true, classesAt: taperClasses, coat: 0.55 },
    /* R106 — ONE GODFORM TEARDROP. Measured on the R106 godform plate (front
       figure, 905 px of height): waist 0.100 of height at t 0.435, the
       thigh / glute mass 0.22 at t 0.54, knee 0.128 at t 0.69, calf 0.135 at
       t 0.76, and from the calf a STRAIGHT cone to the point. The R104 lower
       body (hip 0.141, knee 0.072, calf 0.088) was a spike under a V; the
       reference's is a teardrop as wide as three quarters of the shoulders,
       converging bilateral masses on ONE body. The waist already matched, so
       every ring below it is re-widened against the waist and the rows
       between are set on the reference's own profile. */
    /* R109 — THE MALE LOWER BODY IS ONE QUAD-DRIVEN TEARDROP, from the point
       up (see thighShape / lowerLegShape). Authority: the R109 hero
       (`reference/mrmah-refN-r109-male-hero.png`), read by hand off a 5%
       grid — full width as a fraction of character height, apex t 0, point
       t 1: waist 0.13-0.157 at t 0.46, quad maximum 0.26-0.27 at t 0.58,
       knee inflection 0.157 at t 0.69, 0.118 at t 0.79, 0.063 at t 0.88,
       then the point. Its head is about this build's size, so the ratios
       are comparable directly: the waist is 0.44 of the shoulders and the
       quad 0.76 (R108 d measured 0.29 and 0.50 — both too narrow).

       Three laws from the brief, all of which reverse R108 d:
       - NO CALF BELLIES. Below the quad the outline SIMPLIFIES: a soft
         knee-like inflection, then a long, near-straight, slightly convex
         taper to one point, monotonically narrower every row. The 0.640 /
         0.720 gastrocnemius bloom (0.174 / 0.164 on a 0.124 knee) is gone;
         lower-leg anatomy is a faint tibial channel and shin ridges for the
         facet flow, and a tendon-and-hollows row for value, never a swell.
       - LESS BOOTY. The glute pair is a modest shelf (0.20 at its fullest
         against R108 d's 0.44 belly / 0.50 cleft), placed 32-38 degrees off
         the back with a compact half-width so it never reaches the side
         vertex — it cannot widen the side silhouette or make an hourglass.
       - QUAD-DRIVEN, ONE MASS. The width now lives in `w` (the section is
         a wide convex oval, depth about 0.6 of width — the sheet's side
         view) with a BROAD vastus-lateralis sweep rounding the lateral
         apex forward of the side vertex, the quad head domes on the
         front, and the seam between the two columns. Nothing on the ring
         is a fin.
       Profile targets, half-width in units (fraction x 1.5) at the SIDE
       vertex after the shape: belt 0.201 -> 0.28 -> 0.36 -> 0.397 (apex,
       1.230) -> 0.357 -> 0.318 -> 0.262 -> 0.220 (0.870) -> 0.208 (knee,
       0.810) -> 0.189 -> 0.174 -> 0.152 -> 0.121 -> 0.079 -> 0.038 -> 0.
       Depth `d` follows the width at about 0.6-0.7 of it through the
       thigh and knee and rounds toward the point (0.85+), so the side view
       is a lean posterior with the quad mass forward, not the R108 barrel
       (d / w measured 0.9-1.0 on every row below the belt). */
    { y: 0.150, w: 0.038, d: 0.032, fg: [2, 2], facet: 0.0040, crystal: 0.0180, crystalY: 0.0040,
      columns: true, classesAt: taperClasses },
    { y: 0.300, w: 0.079, d: 0.066, fg: [2, 2], facet: -0.0020, crystal: 0.0140, crystalY: 0.0050, hero: 0.16,
      shape: lowerLegShape({ notch: 0.02, shins: 0.02, tendon: 0.03, hollow: 0.02 }), columns: true, classesAt: taperClasses },
    /* THE SPEAR: a narrow tendon on the back with hollows beside it and the
       tibial channel on the front — value and facet flow, no swell. */
    { y: 0.440, w: 0.121, d: 0.094, fg: [2, 2], facet: 0.0020, zc: -0.004, crystal: 0.0140, crystalY: 0.0060, hero: 0.20,
      shape: lowerLegShape({ notch: 0.03, shins: 0.03, tendon: 0.04, hollow: 0.03 }), columns: true, classesAt: taperClasses },
    { y: 0.550, w: 0.152, d: 0.108, fg: [2, 2], facet: -0.0020, zc: -0.006, crystal: 0.0150, crystalY: 0.0060, hero: 0.22,
      shape: lowerLegShape({ notch: 0.03, shins: 0.04, tendon: 0.03, hollow: 0.02 }), columns: true, classesAt: taperClasses },
    /* THE LOWER LEG: the long taper. R108 d put the calf bloom here (0.174,
       38% over the knee); the R109 hero has NO calf — 0.118 of height at
       t 0.79 on a straight line from the knee inflection to the point. */
    { y: 0.640, w: 0.174, d: 0.122, fg: [1, 2], facet: 0.0020, zc: -0.008, crystal: 0.0160, crystalY: 0.0070, hero: 0.26,
      shape: lowerLegShape({ notch: 0.03, shins: 0.04 }), columns: true, classesAt: taperClasses },
    { y: 0.720, w: 0.189, d: 0.130, fg: [1, 2], facet: -0.0020, zc: -0.004, crystal: 0.0150, crystalY: 0.0060, hero: 0.16,
      shape: lowerLegShape({ notch: 0.04, shins: 0.04, pit: 0.02 }), columns: true, classesAt: taperClasses },
    /* THE KNEE INFLECTION: not a pinch (R108 d cut it to 0.124 between two
       bulbs) but a change of slope — the quad's steep descent (about 0.55
       of half-width per unit of height) eases here to the taper's 0.2, and
       the ring is 0.14 of height, wider than everything below it. Its
       identity is the patellae, the pit behind and a light cavity. */
    { y: 0.810, w: 0.208, d: 0.140, fg: [1, 2], facet: 0.0020, zc: 0.004, crystal: 0.0130, crystalY: 0.0050, hero: 0.08,
      shape: lowerLegShape({ notch: 0.05, caps: 0.06, pit: 0.03 }), columns: true, classesAt: taperClasses, cav: 0.25 },
    /* THE LOWER THIGH: the VL inserting toward the knee, the RF tendon
       fading and the vastus medialis teardrop medial and low; the
       hamstrings end into the knee behind. */
    { y: 0.870, w: 0.190, d: 0.148, fg: [1, 2], facet: -0.0030, zc: 0.008, crystal: 0.0200, crystalY: 0.0070, hero: 0.18,
      shape: thighShape({ seam: 0.22, head: 0.06, vl: 0.16, valley: 0.06, vm: 0.20, itb: 0.04, ham: 0.16, hamCleft: 0.10 }), columns: true, classesAt: taperClasses },
    /* THE LONG DESCENT: from the apex the quad falls away on a convex
       curve (0.397 -> 0.357 -> 0.318 -> 0.262 -> 0.220 of half-width);
       the hamstring columns are restrained so the posterior stays lean. */
    { y: 0.950, w: 0.207, d: 0.180, fg: [1, 4], facet: 0.0040, zc: 0.006, crystal: 0.0300, crystalY: 0.0070, hero: 0.20,
      shape: thighShape({ seam: 0.26, head: 0.28, rf: 0.08, vl: 0.22, valley: 0.10, vm: 0.14, itb: 0.06, ham: 0.26, hamCleft: 0.20 }), columns: true, classesAt: taperClasses },
    /* THE GLUTEAL FOLD: a shallow crease under the modest shelf (the glute
       goes slightly negative, darkened by the ring's cav), the hamstrings
       beginning under it. */
    { y: 1.030, w: 0.230, d: 0.200, fg: [1, 4], facet: -0.0040, crystal: 0.0300, crystalY: 0.0070, hero: 0.14,
      shape: thighShape({ seam: 0.28, head: 0.32, rf: 0.10, vl: 0.26, valley: 0.12, vm: 0.04, itb: 0.06, glute: -0.04, gluteC: 0.52, gluteW: 0.42, ham: 0.14, hamCleft: 0.12 }), columns: true, classesAt: taperClasses, cav: 0.25 },
    /* Astra R109: contain the quad sweep inside the lat block while retaining
       its front depth. This changes the muscle envelope, never the single
       taper below the knee; no additional rings or calf volume. */
    /* THE QUAD MASS: the two front columns at full head, the broad lateral
       sweep, a glute that is already only a low shelf behind. */
    { y: 1.100, w: 0.255, d: 0.215, fg: [1, 4], facet: 0.0045, zc: -0.008, crystal: 0.0360, crystalY: 0.0090, hero: 0.22,
      shape: thighShape({ seam: 0.34, head: 0.44, rf: 0.12, vl: 0.28, valley: 0.12, itb: 0.06, glute: 0.10, gluteC: 0.50, gluteW: 0.40, cleft: 0.18, ham: 0.08 }), columns: false, classesAt: null, zoneAt: quadZone(1), coat: 1.0 },
    /* THE QUAD MAXIMUM — t 0.59, 0.265 of height at the silhouette, 0.76 of
       the shoulders and just under twice the belt. R108 d's apex was the
       1.200 row at 0.188; this one is the widest row of the whole lower
       body and every row below it is narrower. */
    { y: 1.230, w: 0.280, d: 0.215, fg: [1, 4], facet: -0.0045, zc: -0.016, crystal: 0.0360, crystalY: 0.0090, hero: 0.22,
      shape: thighShape({ seam: 0.34, head: 0.42, rf: 0.12, vl: 0.28, valley: 0.12, itb: 0.05, glute: 0.20, gluteC: 0.56, gluteW: 0.48, cleft: 0.24 }), columns: false, classesAt: null, zoneAt: quadZone(1), coat: 1.0 },
    /* THE UPPER QUAD / GLUTE SHELF: the mass still rising to the apex, the
       glute at its fullest here and small (0.20 — structural, never
       dominant), the RF / VL rising out of their origins under the belt. */
    { y: 1.320, w: 0.262, d: 0.205, fg: [1, 4], facet: 0.0045, zc: -0.020, crystal: 0.0360, crystalY: 0.0090, hero: 0.16,
      shape: thighShape({ seam: 0.22, head: 0.26, rf: 0.07, vl: 0.26, valley: 0.09, glute: 0.20, gluteC: 0.60, gluteW: 0.50, cleft: 0.22 }), zoneAt: quadZone(0) },
    /* THE PELVIC TRANSITION: the flare straight out of the belt, about 48
       degrees off vertical (the hero's flare runs 30-50 degrees), the glute
       medius a low lateral-posterior shelf tying into the hip. */
    { y: 1.410, w: 0.221, d: 0.180, fg: [1, 4], facet: 0.0035, zc: -0.016, crystal: 0.0300, crystalY: 0.0080, hero: 0.10,
      shape: thighShape({ seam: 0.14, head: 0.16, rf: 0.04, vl: 0.22, valley: 0.06, glute: 0.14, gluteC: 0.66, gluteW: 0.50, cleft: 0.16 }), zoneAt: quadZone(0) },
    /* THE BELT — the waist. Still the narrowest point on the character and
       still a crease, but the R109 hero's waist is 0.44 of its shoulders
       (0.13-0.157 of height) where R108 d had pinched this row to 0.103 of
       height; 0.201 here is 0.134. The waist stays SHORT: the ring above
       is within 2% of it and the flare below leaves at 48 degrees. */
    { y: 1.480, w: 0.197, d: 0.155, fg: [1, 1], facet: -0.0070, crystal: 0.0300, crystalY: 0.0080,
      shape: coreShape(1.0, 0.06, 0, 0, 0.08, { maleAnatomy: true }), hero: 0.04, zoneAt: coreZone(0), cav: 0.35 },   /* R102: the belt is a crease */
    /* R96 — THE ABDOMINAL ROWS. Three blocks a side between the belt and the
       pectoral turn, as bulge rings (full rectus lobes) alternating with
       crease rings (almost none), so each pair steps out of the abdomen by
       0.03-0.04 and its lower edge falls into the crease below it. The V still
       opens FAST toward the pecs. */
    /* R102 — BLOCK AND PINCH. The R102 references hold the lat's width from
       under the armpit (t 0.37) to t 0.42 and then pinch fast to the waist
       (0.183 -> 0.18 -> 0.128 of height); this table used to funnel evenly
       from the pec-under ring to the belt. The two rings above the pinch
       widen and carry the lat lobe (coreShape's latK); the two below narrow. */
    /* R103: the waist tighter still (0.176 / 0.182 / 0.196) and the lat lobe
       nearly doubled on the two rings above the pinch — the lat is a
       silhouette driver, not a flank detail. */
    /* R108 — THREE BLOCK ROWS ON A SMOOTH DEPTH. The depth grows evenly
       (0.150 -> 0.236) so the back is one surface; the block / crease
       rhythm is the multiplier alone (rectus 0.32 against 0.02), sized so a
       crease sits ~0.03 under the block above it at the crest. The widths
       carry the LAT WING: held near the chest's width through the upper two
       rows and then a convex sweep into the belt (0.44 / 0.42 / 0.37 / 0.29 /
       0.20 / 0.156 at the silhouette), where R107 ran a straight diagonal
       from the armpit to the waist. The oblique belly walks forward as the
       rows descend (obliqueShift 0.36 -> 0), the diagonal side-body sweep;
       the lumbar erectors are the tallest thing on the lower back
       (erector 0.30 against a 0.34 channel) and fade upward. */
    /* R109: the two rows under the lat block follow the belt out — the waist
       is a short pinch (1.545 within 2% of the belt), not a funnel. */
    { y: 1.545, w: 0.202, d: 0.152, fg: [1, 4], facet: 0.0040, crystal: 0.0220, crystalY: 0.0050,
      shape: coreShape(1.0, 0.34, 0.0, 0.0, 0.34, { maleAnatomy: true, obliqueShift: 0.0, oblique: 0.14, spine: 0.34, valley: 0.14, erectorAt: 0.36, erectorW: 0.25, latBack: 0.08 }), hero: 0.08, zoneAt: coreZone(1) },
    { y: 1.605, w: 0.232, d: 0.160, fg: [1, 4], facet: -0.0040, crystal: 0.0220, crystalY: 0.0050,
      shape: coreShape(1.0, 0.16, 0.10, 0.34, 0.34, { maleAnatomy: true, obliqueShift: 0.10, oblique: 0.14, spine: 0.34, valley: 0.14, erectorAt: 0.36, erectorW: 0.25, latBack: 0.14 }), hero: 0.03, zoneAt: coreZone(1), cav: 0.75 },   /* R102: abdominal crease */
    { y: 1.665, w: 0.280, d: 0.176, fg: [1, 4], facet: 0.0040, crystal: 0.0240, crystalY: 0.0050,
      shape: coreShape(0.95, 0.36, 0.26, 0.24, 0.28, { maleAnatomy: true, obliqueShift: 0.18, oblique: 0.14, spine: 0.32, valley: 0.14, erectorAt: 0.34, erectorW: 0.24, latBack: 0.22 }), hero: 0.08, zoneAt: coreZone(2) },
    { y: 1.725, w: 0.317, d: 0.203, fg: [1, 4], facet: -0.0040, crystal: 0.0240, crystalY: 0.0050,
      shape: coreShape(0.90, 0.16, 0.36, 0.12, 0.22, { maleAnatomy: true, obliqueShift: 0.26, oblique: 0.12, spine: 0.28, serratus: 0.09, serratusAt: 1.05, erectorAt: 0.32, erectorW: 0.22, valley: 0.16, valleyAt: 0.55, latBack: 0.32 }), hero: 0.03, zoneAt: coreZone(2), cav: 0.75 },   /* R102: abdominal crease */
    /* the lat hands over to chestShape's lat on the ring above at the SAME
       strength (0.34 here against 0.33 there): R108's first cut had 0.52
       against 0.30, and the flank normal flipped from facing down to facing
       up across 0.05 of height — a ledge on top of the lat. */
    { y: 1.780, w: 0.342, d: 0.226, fg: [1, 4], facet: 0.0040, crystal: 0.0260, crystalY: 0.0060,
      shape: coreShape(0.85, 0.30, 0.34, 0.0, 0.18, { maleAnatomy: true, obliqueShift: 0.36, oblique: 0.06, spine: 0.26, serratus: 0.09, serratusAt: 1.20, erectorAt: 0.32, erectorW: 0.22, valley: 0.16, valleyAt: 0.55, latBack: 0.36 }), hero: 0.08, zoneAt: coreZone(3) },
    /* R97 — THE LOWER PEC TURN: a crease ring where the chest shelf ends and
       a belly ring above it, so the pectoral is a mass with a lower edge
       that falls into shadow rather than a plane that fades into the abs. */
    /* R99 — THE CHEST HAS DEPTH. The godform reference's pec is a thick shelf
       projecting toward the viewer; the chest rings' front-to-back radius
       rises about 9% while the width holds, the crease ring under the shelf
       comes in so the shelf overhangs it, and that ring takes its own dark
       zone (pecUnderZone). */
    /* R108 — THE PEC IS A SLAB WITH A LOW APEX. Worked through at the crown
       vertex, the R107 chest rose 0.15 from the upper abs to an apex at
       1.935 and fell 0.18 to the clavicle — a ball, symmetric top to
       bottom. The reference's pectoral is a long clavicular sweep to a
       fullness in its LOWER third and then a fast turn under with a shelf
       that casts onto the upper abs. So the pec's k climbs 0.30 / 0.55 /
       0.80 / 0.95 / 1.0 down from the groove ring to 1.895, and the ring
       under it drops the front 0.13 in 0.065 — steep, but the spline rounds
       it and the under-pec is the one crease the chest needs. */
    { y: 1.830, w: 0.336, d: 0.242, fg: [2, 2], facet: -0.0040,   /* R107: not narrower than either neighbour — that was a groove all round */ crystal: 0.0300, crystalY: 0.0080,
      shape: chestShape(0.56, 0.17, 1.10, { maleAnatomy: true, pecAt: 0.55, pecW: 0.54, under: 0.02, insertion: 0.04, spine: 0.26, erectorAt: 0.32, erectorW: 0.22, valley: 0.16, valleyAt: 0.55, latBack: 0.34 }), zoneAt: pecUnderZone, cav: 0.60 },
    { y: 1.895, w: 0.328, d: 0.256, fg: [2, 2], facet: 0.0035, crystal: 0.0320, crystalY: 0.0080,
      shape: chestShape(0.78, 0.15, 1.0, { maleAnatomy: true, insertion: 0.14, kite: 0.06, erectorAt: 0.34, erectorW: 0.24, valley: 0.14, valleyAt: 0.60, latBack: 0.28 }), hero: 0.30, zoneAt: pecZone(0) },
    /* R106 — THE PEC IS A DOME: a crown ring between two shoulder rings, so
       the mass rounds over in the vertical as well as across. Three bands
       over 0.22 units made a hexagonal profile that the clay view read as a
       flat plate with a slot beneath it. */
    { y: 1.935, w: 0.336, d: 0.264, fg: [2, 2], facet: -0.0030, crystal: 0.0340, crystalY: 0.0080,
      shape: chestShape(0.94, 0.13, 0.90, { maleAnatomy: true, insertion: 0.14, kite: 0.10, valley: 0.10, valleyAt: 0.66, latBack: 0.20 }), hero: 0.34, zoneAt: pecZone(0) },
    /* the pectoral line — the strongest cross-section shaping on the body */
    { y: 1.970, w: 0.338, d: 0.270, fg: [2, 2], facet: 0.0035, crystal: 0.0340, crystalY: 0.0080,
      shape: chestShape(0.92, 0.10, 0.75, { maleAnatomy: true, insertion: 0.10, kite: 0.14, valley: 0.06, valleyAt: 0.72, latBack: 0.10 }), hero: 0.34, zoneAt: pecZone(0) },
    /* R103 — THE SHOULDER GIRDLE SITS 0.05 LOWER. The trap could only slope
       at 22 degrees from a shoulder line at 2.170 to a neck base at 2.215;
       the references' traps climb at about 40 degrees into a visible neck,
       and the deltoid cap stood ABOVE that shallow slope as a bump. With the
       shoulder line at 2.120 the slope is 41 degrees, the cap's crest meets
       it, and the neck is embedded in a rising upper torso. The head does
       not move. */
    { y: 2.050, w: 0.330, d: 0.278, fg: [2, 2], facet: -0.0035, crystal: 0.0300, crystalY: 0.0060,
      shape: chestShape(0.55, 0.08, 0.40, { maleAnatomy: true, insertion: 0.06, kite: 0.16, valley: 0.02 }), hero: 0.40, zoneAt: pecZone(1) },   /* R107: the pec FADES up into the clavicle; R108: the clavicular sweep — 0.55 here, 0.30 on the groove ring */
    /* R100 — the groove under the clavicle (subclavicleShape): its own dark,
       uncoated zone, so the collarbone above it reads as a bar with shadow
       beneath. */
    { y: 2.092, w: 0.316, d: 0.285, fg: [2, 2], facet: 0.0035, crystal: 0.0200, crystalY: 0.0040,
      shape: subclavicleShape(1.0, 0.17, 0.30, { notch: 0.22 }), hero: 0.20, zoneAt: pecZone(1), coat: 0.55 },   /* R108 b: 2.100 -> 2.092 and the spine channel continues through it (notch 0.22): at 2.100 it sat at the girdle ring's own radius behind, a flat spot the rear clay read as a crease under the trap band */   /* R106: d 0.250 -> 0.300, the slot under the collarbone closes to a hollow */
    /* THE SHOULDER LINE — collarbones across the front, trapezius behind.
       R100: the thin band just under it is the groove's dark zone, so the
       collarbone reads as a bar with a hairline of shadow beneath — not a
       stripe across the chest. */
    { y: 2.120, w: 0.300, d: 0.276, fg: [2, 2], facet: 0.0035, crystal: 0.0340, crystalY: 0.0060,
      shape: clavicleShape(1.0, { notch: 0.20, traps: 0.12, flat: 0.08 }), dip: 0.004, hero: 0.32, zoneAt: subclavicleZone, coat: 0.30 },   /* R108: 0.030 -> 0.012. The girdle ring is 0.02 above the groove ring since R103, so a 0.03 dip put this ring's front and back vertices BELOW the ring under it — the surface folded and a strip faced straight up (probed: normal y 0.996 at y 2.097), the bright bar under the collarbone and the seam under the traps in clay */   /* R99: the shelf blew white; the godform reference's clavicle is dark under a lit shoulder */
    /* R100 — THE TRAPEZIUS RING: between the shoulder line and the neck's
       base, so the traps rise diagonally toward the neck across two bands
       instead of one steep step, with the trap lobes at full strength.
       R103: halfway up the 41-degree slope. */
    { y: 2.172, w: 0.258, d: 0.220, fg: [2, 2], facet: -0.0040, crystal: 0.0260, crystalY: 0.0050,
      shape: clavicleShape(0.85, { notch: 0.14 }), hero: 0.04, zoneAt: trapZone, coat: 0.12 },   /* R106: narrower — the width falls faster than the height rises, so the band tilts toward the neck */   /* R101: deeper behind, the upper back's thickness */   /* a slope, not a shelf: first cut at 2.190 / 0.282 drew a flat ledge */
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
    /* R95-BB: the trapezius ring rises with the shoulder line and is broader,
       so the neck is the reference's SHORT, THICK column — 0.12 of clear neck
       under the chin instead of 0.16, and traps that climb steeply beside it. */
    /* R99 — A NECK THAT CARRIES THE HEAD. The column was 0.10-0.13 across:
       a connector under a floating diamond. The godform reference's neck is
       a real faceted column rising out of the trapezius, about a third of
       the head's width, that the chin sits DOWN onto; these rings are 20%
       wider and deeper and the trapezius ring above the shoulder line is
       broader, so the head's lower vertex is swallowed by a column the eye
       accepts as supporting it. */
    /* R100: the neck's base ring narrows and rises (0.236 at 2.205 -> 0.205
       at 2.215) so the trapezius runs DIAGONALLY from the shoulder line up
       to the neck instead of stepping onto a flat ledge. */
    { y: 2.228, w: 0.172, d: 0.136, fg: [1, 1], facet: -0.0120, crystal: 0.024, crystalY: 0.0050, coat: 0.15,   /* R108 b: a touch wider, and the column's first ring a touch narrower, so the trap slope eases into the neck instead of stopping dead against it (probed: 55 degrees at 2.227, vertical at 2.240) */
      shape: clavicleShape(0.55, { notch: 0, flat: 0 }), hero: 0.08, classesAt: neckClasses },   /* R108: no notch at the neck's base — it must stay flush with the column above it */   /* R106: 2.215 / 0.225 -> 2.228 / 0.190 — the plate's head sits DOWN on the traps; the base rises toward the head's corner and narrows so the collar under the head is a slope, not a lid */
    /* The column's rings follow the head's lower vertex (2.324 now): the top
       ring sits 0.09 above it where the head is 0.10 wide and swallows it, and
       the visible neck from trapezius to chin is 0.12 — the reference's. */
    /* R101 — the square head's bottom corner is at 2.268 and the column
       rises past it: the diamond's point sits down INTO the neck, which is
       how the sheet reference seats it — a collar the head plunges into,
       not a stick the head balances on. The column closes at 2.380, inside
       the diamond (0.11 wide there). */
    { y: 2.250, w: 0.130, d: 0.106, fg: [1, 1], facet: 0.0120, crystal: 0.018, crystalY: 0.0040,
      zc: -0.030, hero: 0.10, classesAt: neckClasses },
    /* measured (headsym): buried to 2.345 the visible diamond lost a tenth of
       its height and read wider than tall; the collar now closes at 2.335 so
       the corner sits into it by 0.03 and the square reads. */
    { y: 2.290, w: 0.125, d: 0.100, fg: [1, 1], facet: -0.0110, crystal: 0.014, crystalY: 0.0030,
      zc: -0.040, hero: 0.06, classesAt: neckClasses },
    { y: 2.318, w: 0.116, d: 0.094, fg: [1, 1], facet: 0.0100, crystal: 0.012, crystalY: 0.0020,
      zc: -0.044, hero: 0.04, classesAt: neckClasses },
    { y: 2.335, w: 0.108, d: 0.088, fg: [1, 1], facet: 0.0060, zc: -0.044, hero: 0.02, classesAt: neckClasses }   /* R107: a column the head sits down onto (the back sheet's neck), capped inside the plate */
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
  /* R95-BB: 0.598 -> 0.680. The bodybuilder reference puts the lowered-side
     deltoid's outer edge at 1.94 head half-widths from the centre line; with
     the head kept canonical that is 0.81, and 0.68 is as far as the shoulders
     can go before the raised hand leaves the canonical frame. The ratio moves
     from 1.43 to 1.63 — most of the way — and the rest is carried by the arm
     mass, which is where the reference's width actually is. */
  shoulderHalfWidth: 0.770,   /* R97: the dome's outer edge */
  shoulderY: 2.120
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
    /* R95-BB — OUTBOARD AND THICK. The joints move 0.06 out with the
       shoulders, the shoulder joint rises with the shoulder line, and the
       radii go up by about 40% (measured: mid-bicep 0.153, forearm 0.118,
       wrist 0.090 on the reference). The elbow and wrist keep the reference's
       hang — upper arm near-vertical, forearm cutting in to the hip — and the
       elbow swings a little further out so the thicker upper arm still clears
       the wider ribcage. */
    /* The shoulder joint sits ON the deltoid's axis at 0.7 of its length (see
       body.js), so the arm's top cap is buried inside the cap's belly. The arm
       is SHORTER than it was and thicker: on the reference the elbow is at
       y 1.56 and the wrist at 1.20 (this build had 1.40 and 0.96), and the big
       hand then reaches the same 0.82 the old fingertips did. Compact, dense. */
    /* R108: the cap's axis ends inside the arm now (body.js, outerX 0.590),
       so the joint on it at 0.7 is 0.479 / 1.961, and the elbow and wrist
       come in 0.035 / 0.025 so the arm hangs straight — shoulder 0.479,
       elbow 0.550, wrist 0.585 against the R102 reference's 0.46 / 0.53 /
       0.58. */
    /* R108 c: the cap's axis ends at 0.605 / 1.915 (body.js), so the joint on
       it at 0.7 is 0.4895 / 1.954; the elbow and wrist move out by the same
       0.0105 so the hang is unchanged. */
    shoulder: [-0.4895, 1.954, 0.014],   /* R104: on the cap's axis at 0.7; R107: the axis moved up and in with the smaller dome */
    elbow: [-0.5605, 1.455, 0.10],   /* R103: the reference's lowered arm hangs STRAIGHT and close — elbow in, shorter */
    wrist: [-0.5955, 1.105, 0.14],
    upperRadius: 0.158,   /* R103: 0.160 -> 0.150, the arm was as wide as the lat at the elbow; R108: 0.158 — with the sides no longer grooved the arm's belly is 0.57 of the cap's width from the front and 0.73 from the side (the reference's ~0.8) */
    foreRadius: 0.112,   /* R105: the reference forearm is three quarters of the upper arm */
    wristRadius: 0.074
  },
  left: {                         /* viewer's RIGHT — the raised arm */
    /* Reference pixels: shoulder (645, 550), elbow (730, 700), wrist (775, 570).
       A shallower, more relaxed V than the old pose — the reference does not
       fold the raised arm hard, it opens the elbow to about 100 degrees and
       presents the crystal at roughly shoulder height. */
    /* R95-BB: the raised arm's upper arm HANGS — the reference drops it
       almost vertically to an elbow at waist height (y 1.52) and raises only
       the forearm, 21 degrees off vertical, to present the crystal at the
       shoulder line. That is a far stronger, more compact pose than the wide
       V this carried, and it is what keeps the raised arm's mass beside the
       ribcage instead of out in space. */
    shoulder: [0.4895, 1.954, 0.014],   /* R108: on the cap's axis at 0.7, see the lowered arm */
    elbow: [0.5455, 1.465, 0.11],
    wrist: [0.7005, 1.860, 0.15],
    upperRadius: 0.158,   /* R103: 0.160 -> 0.150, the arm was as wide as the lat at the elbow; R108: 0.158 — with the sides no longer grooved the arm's belly is 0.57 of the cap's width from the front and 0.73 from the side (the reference's ~0.8) */
    foreRadius: 0.112,   /* R105: the reference forearm is three quarters of the upper arm */
    wristRadius: 0.074
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
  classLift: 0.20,   /* R99: 0.30 -> 0.20 — the arm reaches its dark rows again (reference arm 49% under 32 luma, this build 9%) */

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
  deltoidLift: 0.24,

  profiles: {
    /* STARTS BELOW 1, which is the correction the brief asks for.

       Both profiles used to begin at exactly 1.0, so the limb left the shoulder
       at its full nominal radius and the deltoid met a cylinder of the same
       width — no waist between them, and therefore no readable transition. The
       arm now narrows immediately below the shoulder, swells through the
       bicep/tricep belly around a third of the way down, and draws into the
       elbow as the narrowest point of the whole limb. That sequence is what
       makes the taper read; a single bulge on a straight cone does not. */
    /* R95-BB: starts nearer full radius (0.90) so the upper arm leaves the
       deltoid as a thick limb rather than a waisted one, and the belly is a
       touch fuller. The reference's upper arm is close to its bicep width for
       most of its length. */
    /* R98: the belly a touch fuller and the arm DRAWS IN to the elbow — the
       platinum references' upper arm is its widest at the bicep peak and
       clearly narrower at the joint, which is what makes the elbow read as a
       hinge between two masses rather than a bend in a pipe. */
    upper: function (t) {   /* R104: swell 0.28 -> 0.20, the arm hangs as a column from the front; the bellies read in the three-quarter */
      /* R108: the profile is the arm's ENVELOPE only — a long sweep to a
         controlled apex at 0.42 and a gradual reversal into the elbow. The
         muscle bellies live in the cross-section (shapes.upper), so the
         envelope stays modest or the two compound into a ball. */
      /* R108 c — THE OUTLINE HAS TO SAY IT. At 0.92 -> 1.05 -> 0.84 the arm
         was near-constant width from the cap to the elbow (the first pass's
         three-quarter crop measured 1.2 : 1 belly to elbow); the reference's
         biceps belly is a round peak and its elbow a compact hinge at about
         0.6 of it. 0.90 -> 1.10 (t 0.40) -> 0.94 (0.70) -> 0.78 (1.0): the
         elbow end is 0.089, which the forearm's first ring matches. */
      /* round 7: the peak comes back to 1.05 (from 1.10). Measured on the
         front clay the biceps' outer edge stood outside the cap's outer edge
         — the arm was the broadest mass, and the director's order is broad
         delt -> tuck -> belly. The ball's roundness is the front / rear
         bellies' job (shapes.upper); the profile only sets the side width. */
      /* R108 d — BULGE -> PINCH -> BULGE. The mass-recovery brief rules out a
         continuous taper from the cap to the wrist: the upper arm is a HUGE
         round belly (1.14 at t 0.40, so the belly is 0.16 against the cap's
         0.228 — big, and still under the delt), and the elbow is a CLEAR,
         SHORT pinch (0.76 at the end, 0.087) that the forearm's own bloom
         then climbs out of. The circumference was not traded for it: the
         start (0.90) and the peak are as full as or fuller than R108 c. */
      return 0.90 + Math.pow(Math.sin(Math.pow(t, 0.80) * Math.PI), 1.3) * 0.28 - Math.pow(t, 1.5) * 0.14;
    },
    /* Picks up close to where the upper arm ended — a step at the elbow reads
       as an error rather than as a joint — then swells just below it and tapers
       to a narrow wrist. */
    /* R98: the extensor swell sits high, just under the elbow, and the taper
       to the wrist is steeper — an anatomical forearm, not a stick. */
    fore: function (t) {
      /* R108: starts at 0.84 so the forearm's first ring matches the upper
         arm's last (0.098 against 0.094 — the elbow is a COMPRESSION between
         two equal tubes, not a step), swells to its thickest a quarter of the
         way down and draws to a 0.64 wrist. The cuff and the elbow ball are
         sized from this function (limbs.js), so the joints never stand proud
         of the tubes they sit between. */
      /* R108 c: starts at 0.79 (0.089, the upper arm's compressed end), the
         brachioradialis / extensor peak comes HIGH (1.085 at t 0.25, a
         quarter up from the elbow) and the taper to the wrist is long and
         continuous to 0.62 (0.046): BIG -> NARROWER -> BIG -> TAPER. */
      /* round 2: the belly is CONVEX and the taper CONCAVE (sin^1.6 against a
         t^1.3 fall) — a straight line from the peak to the wrist is a club. */
      /* R108 d — the forearm is its OWN bulge, not the upper arm's tail. It
         starts at 0.77 (0.086, inside the upper arm's 0.087 end), BLOOMS to
         1.25 at t 0.28 (0.126 — 1.45x the elbow pinch and 0.8 of the upper
         belly, the reference's forearm-to-upper-arm), and pinches to a 0.58
         wrist (0.043). The bloom is convex and the fall concave, as before. */
      return 0.77 + Math.pow(Math.sin(Math.pow(t, 0.55) * Math.PI), 1.6) * 0.51 - Math.pow(t, 1.3) * 0.19;
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
    /* R100 — `inner` is +1 or -1: which sign of d faces the torso (see
       limbSideDirection); the lateral tricep ridge and the radial forearm
       ridge sit on the OUTER side, which is -inner. */
    /* R108 — THE UPPER ARM IS A ROUND LIMB WITH BELLIES ON IT, not a lens.

       The R107 section carried a 0.42 biceps, a 0.40 triceps and a 0.30
       groove on BOTH sides through the whole belly, on a tube already 1.18
       deeper than wide. Worked through at the bicep peak that is 0.20 wide
       and 0.45 deep: from the front the arm was a stick under a 0.48 dome,
       from the side an egg as big as the deltoid, and the smooth clay read a
       shoulder lump on a pillow. A real upper arm is about 1.15 deeper than
       wide; the biceps is a broad belly that covers the whole anterior face
       (a belly, pow 0.7, not a narrow crest), the intermuscular septa are
       SHALLOW valleys (6-8% of the radius), and the width the arm needs
       comes from leaving the sides alone.

       Angles: `inner` is the sign of d that faces the torso, so the inner
       side is at d = inner*pi/2 and the outer at -inner*pi/2; the rear is
       pi, and rear-OUTER is pi + inner*x (the bump wraps), rear-INNER is
       pi - inner*x. The R107 table had the long and lateral heads swapped
       by exactly this sign, which is one reason the horseshoe never read. */
    upper: function (t, d, inner, maleAnatomy) {
      var inn = inner || 1, out = -inn;
      /* R108 c — SCULPTED INSIDE THE SAME CIRCUMFERENCE. The first pass's
         section was a round limb with modest bellies (biceps 0.28, heads
         0.24 / 0.22) and read as one generic volume; the reference's clay
         strips are a biceps that is a distinct round ball with a visible
         distal insertion, a triceps HORSESHOE whose long head is the deep
         posterior mass and whose lateral head sweeps the outer arm, a
         brachialis wedge between them, and a deltoid whose lateral head
         ends in a V on the outer arm. Everything below is a column step
         (around the ring) and can be large; the row steps (the envelopes)
         stay smooth. */
      /* longitudinal envelopes: where each belly sits along the bone */
      var bic = Math.pow(Math.sin(Math.pow(Math.min(1, t / 0.92), 0.78) * Math.PI), 1.6);   /* the biceps peaks at t 0.38 and is gone into its tendon by t 0.92 */
      var tri = Math.pow(Math.sin(Math.pow(t, 1.10) * Math.PI), 1.2);                          /* the long head peaks at t 0.53, long */
      var lat = Math.pow(Math.sin(Math.pow(t, 1.00) * Math.PI), 1.2);                          /* the lateral head, t 0.50 */
      var low = Math.max(0, Math.min(1, (t - 0.30) / 0.42));
      low = low * low * (3 - 2 * low);                                                          /* 0 -> 1 from a third down — the tendon flat starts where the heads are fullest */
      var lower = t < 0.38 ? 0 : Math.sin(Math.min(1, (t - 0.38) / 0.60) * Math.PI);          /* the brachialis wedge, t 0.68 */
      /* BICEPS: a full belly across the front, a shade toward the inner arm,
         with the long head (outer) and short head (inner) as two shallow
         crowns on it so the ball has a seam, and a distal INSERTION where
         the belly falls fast into its tendon (the pow 1.6 envelope). */
      var heads = 1 + 0.10 * (bump(d, out * 0.42, 0.30) + bump(d, inn * 0.55, 0.30)) - 0.05 * bump(d, inn * 0.08, 0.16);
      var biceps = Math.pow(bump(d, inn * 0.10, 0.80), 0.7) * 0.40 * bic * heads;
      /* TRICEPS: the long head on the rear-inner, the lateral head on the
         rear-outer, and between them, low down, the flat TENDON plane that
         makes the horseshoe a U rather than a second belly. */
      /* the heads CONVERGE toward the olecranon: their centres move toward
         the rear as t grows, and the tendon flat between them deepens */
      /* R108 c, round 2: the U's valley has to be a THIRD of the heads'
         height to read as two masses (the belly rule) — at 0.16 of the
         radius it was a flat on an oval. Narrower, fuller heads (pow 0.55)
         and a tendon flat that starts a third down: the valley is now ~0.29
         against peaks of 0.36 / 0.30. */
      var conv = 0.22 * low;
      var triLong = Math.pow(bump(d, Math.PI - inn * (0.72 - conv), 0.48), 0.50) * 0.36 * tri;
      var triLat = Math.pow(bump(d, Math.PI + inn * (0.80 - conv), 0.44), 0.50) * 0.30 * lat;
      var tendon = -Math.pow(bump(d, Math.PI, 0.44), 0.7) * 0.22 * low;   /* round 3: a plateau flat with steeper sides — the horseshoe's inside is a PLANE, not a dip */
      /* SEPTA: the biceps / triceps interlock is a valley either side —
         deepest through the belly, and the brachialis fills the outer one
         below it. */
      var septOut = -bump(d, out * 1.05, 0.24) * 0.10 * lower - bump(d, out * 1.62, 0.26) * 0.12 * bic;   /* round 4: the outer septum continues down between the biceps and the brachialis */
      var septIn = -bump(d, inn * 1.55, 0.30) * 0.13 * bic;
      /* BRACHIALIS: a controlled wedge on the outer distal arm, between the
         biceps and the lateral head, pushing the lower outer contour out. */
      var brach = Math.pow(bump(d, out * 1.45, 0.38), 0.8) * 0.20 * lower;
      /* INSERTION and THE DELTOID V. The arm narrows into the cap across its
         top 0.26 on the front and rear (the anterior and posterior delt
         overhang it there), but NOT on the outer side: there the deltoid's
         lateral head continues down the arm as a tongue whose two edges — a
         groove in front of it (delt / biceps separation) and one behind it
         (delt / lateral head) — converge to a point at t 0.42. The cap's own
         rings end at the shoulder's outer x, so the V can only live on the
         arm's surface; the first pass put the deepest narrowing on the outer
         side and got a horizontal crease. */
      var reach = 0.26 - 0.12 * bump(d, out * 1.45, 0.70);
      var top = Math.pow(1 - Math.min(1, t / reach), 1.5);
      var insertionBase = -(0.13 + 0.12 * bump(d, 0, 0.70) + 0.05 * bump(d, Math.PI, 0.70)) * top;   /* round 7: 0.13 all round — the tuck has to be in the OUTLINE, under the cap's outer edge */
      /* round 3: at +0.05 / -0.09 with 0.24-wide grooves the V was invisible
         in the 3x side clay. The tongue is a plateau (pow 0.6) of +0.10, the
         grooves -0.12 and 0.40 wide (two vertices at sixteen sides), fading
         IN over the top 0.08 so the tongue rises out of the cap's rim rather
         than stepping off it, and OUT to the tip at t 0.44. */
      /* round 4: the V's strongest rings were UNDER the cap's overhang where
         nothing sees them; it now fades in over the top 0.14, is fullest at
         t 0.2-0.3 and closes at 0.52 — on the visible outer arm. */
      var vT = Math.max(0, 1 - t / 0.52);
      var gw = 0.26 + 0.74 * vT;                                     /* the grooves' half-spread: 1.0 rad under the cap, closing to 0.26 at the tip */
      var vEnv = Math.min(1, t / 0.14) * Math.pow(Math.sin(Math.min(1, vT) * Math.PI * 0.5), 0.8);
      var vee = -0.13 * (bump(d, out * 1.45 - out * gw, 0.40) + bump(d, out * 1.45 + out * gw, 0.40)) * vEnv
              + 0.04 * Math.pow(bump(d, out * 1.45, gw * 0.75), 0.6) * vEnv;   /* round 7: 0.04 — at 0.10 the tongue cancelled the tuck on the outer side and the outline lost its notch */
      var insertion = insertionBase + vee;   /* the insertion IS the V: the cap's rim as it lands on the arm */
      /* ELBOW: a compression on the front (the cubital fossa) and the
         olecranon at the rear — a joint, not a hinge. The BRACHIORADIALIS
         ORIGIN sits here too: it rises off the outer-front of the humerus
         above the elbow, so the upper arm's last rings carry its ridge and
         the forearm's first ring (which used to overhang the joint by a lip
         on that side) continues it. */
      var e = Math.pow(Math.max(0, (t - 0.76) / 0.24), 2);
      var radialOrigin = Math.pow(bump(d, out * 0.85, 0.50), 0.7) * 0.14 * Math.pow(Math.max(0, (t - 0.70) / 0.30), 1.5);
      var elbow = -bump(d, 0, 0.62) * 0.12 * e + bump(d, Math.PI, 0.42) * 0.08 * e + radialOrigin;
      // R109 Astra: expose posterior heads and side separations inside the
      // accepted envelope; profile and nominal radius remain unchanged.
      if (maleAnatomy) {
        biceps *= 1.08;
        triLong *= 1.28;
        triLat *= 1.23;
        tendon *= 1.12;
        septOut *= 1.40;
        septIn *= 1.25;
        brach *= 1.25;
        insertion += 0.10 * bump(d, out * 1.45, 0.48) * top;
      }
      return 1 + biceps + triLong + triLat + tendon + septOut + septIn + brach + insertion + elbow;
    },
    /* R108 — THE FOREARM'S MASSES ARE PLACED BY `inner`, all of them.

       The R107 flexor (d 0.45) and extensor (pi - 0.55) were authored in raw
       signed angles, so on one arm the flexors sat inboard and on the other
       outboard, and the brachioradialis (which did use `outer`) crossed
       them. Every mass now takes its side from the limb: brachioradialis
       ridge on the outer-front sweeping down the radial side, the extensor
       mass behind it on the rear-outer, the flexor mass on the front-inner,
       the flexor carpi ulnaris on the rear-inner, and the ulnar border — the
       bone — as a flat between the two rear groups. Thickest just under the
       elbow, a long taper, and a wrist that flattens front-to-back so the
       tendons read as a compression before the hand expands again. */
    fore: function (t, d, inner, maleAnatomy) {
      var inn = inner || 1, out = -inn;
      /* R108 c — A CLUSTER, NOT A CLUB. The brachioradialis is the dominant
         mass and it originates HIGH, on the outer arm above the elbow line
         (its envelope is already 0.6 at t 0), sweeping down the radial side
         and fading by the wrist; the extensor mass sits behind it and peaks
         a quarter down; the flexor mass on the front-inner peaks a third
         down; and everything is gone by t 0.8 so the wrist is tendon over
         bone. The flexor and extensor amplitudes come down (0.24 / 0.22 ->
         0.18 / 0.18) so the forearm's top is not as wide as the arm's
         bottom: the profile carries the peak now. */
      var swell = Math.pow(Math.sin(Math.pow(Math.min(1, t / 0.94), 0.62) * Math.PI), 1.2);   /* the flexor belly, t 0.33 */
      var high = Math.pow(Math.sin(Math.pow(Math.min(1, t / 0.90), 0.50) * Math.PI), 1.3);    /* the extensor origin, t 0.22 */
      var radialEnv = Math.pow(Math.sin(Math.min(1, (t + 0.08) / 1.02) * Math.PI), 1.1) * (1 - t * 0.35); /* the brachioradialis: 0.2 at the elbow (the upper arm's radialOrigin hands it over), peak t 0.32, gone at the wrist */
      var brachioradialis = Math.pow(bump(d, out * 0.85, 0.46), 0.7) * 0.30 * radialEnv;
      var extensor = Math.pow(bump(d, Math.PI + inn * 0.90, 0.56), 0.7) * 0.18 * high;
      var flexor = Math.pow(bump(d, inn * 0.60, 0.66), 0.7) * 0.18 * swell;
      var fcu = bump(d, Math.PI - inn * 0.62, 0.48) * 0.11 * swell;
      var ulna = -bump(d, Math.PI - inn * 1.10, 0.26) * 0.06;
      var radialChannel = -bump(d, out * 1.50, 0.26) * 0.08 * Math.max(swell, high)   /* between the brachioradialis and the extensors */
                        - bump(d, inn * 0.02, 0.22) * 0.05 * swell;                  /* and between the brachioradialis and the flexors */
      var w = Math.pow(Math.max(0, (t - 0.66) / 0.34), 2);
      var wrist = -(bump(d, 0, 0.70) * 0.12 + bump(d, Math.PI, 0.70) * 0.08) * w;   /* the wrist is wider than it is deep: tendons */
      if (maleAnatomy) {
        brachioradialis *= 1.18;
        extensor *= 1.22;
        radialChannel *= 1.55;
      }
      return 1 + brachioradialis + extensor + flexor + fcu + ulna + radialChannel + wrist;
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
/* R95-BB: scaled up 1.35x with the arms. The bodybuilder reference's lowered
   hand is 0.27 wide and 0.38 long to the fingertips against this build's
   0.17 x 0.19 — a hand a third the size of the forearm it hung from read as a
   claw. Still a robotic hand with readable fingers, still small next to the
   body; the presented diamond stays small. */
export var HAND = {
  /* R96: a thinner, slightly narrower palm and longer, slimmer fingers — the
     reference's hand is a flat articulated plate with fingers that read
     individually, not a block with stubs. */
  /* R106: the arms sheet's hand is LONG-FINGERED — fingers a third longer
     than the palm, a palm that tapers to the wrist, three phalanges each
     (buildDigit). The R101 hand had fingers shorter than its palm, which is
     the mitten read. */
  palmLength: 0.120,
  palmHalfWidth: 0.088,
  palmHalfDepth: 0.046,
  /* R95: four jointed fingers (see buildDigit in limbs.js), a little longer
     and slimmer, as the references' robotic hands are. */
  digitCount: 4,
  digitLength: 0.160,
  digitRadius: 0.024,
  /* The small bright diamond above the reference's raised hand. */
  tipDiamond: 0.048
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
  /* R95-BB: both rise with the chest. On the bodybuilder reference the
     diamond sits on the sternum at the level of the pec crowns (y 2.03) and the
     three indicators at the pecs' lower edge (y 1.85); the diamond is the
     canonical anchor and is centred, the indicators stay small and secondary. */
  emblemY: 1.900,
  emblemHalf: 0.074,
  symbolsY: 1.715,
  symbolHalf: 0.032,
  symbolSpacing: 0.100,
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
  throatY: 2.186,
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
    /* leftmost: whichever of the lowered elbow, hand, arm or deltoid reaches furthest */
    Math.min(ARMS.right.elbow[0] - ARMS.right.upperRadius,
             ARMS.right.wrist[0] - HAND.palmHalfWidth,
             -TORSO.shoulderHalfWidth)
  ) / 2
};

export var FLOAT = {
  height: 0.17,
  bobAmplitude: 0.016,
  bobPeriod: 6.4
};

/* R96 — THE MALE CANON AS ONE SET, and the shape vocabulary a variant builds
   its own table from. `variants.js` returns this set by default and a
   FEMALE set derived from it; nothing under core/ reads the loose exports
   above for a variant, only this bundle. */
export var MALE = {
  HEAD: HEAD, NECK: NECK, TORSO: TORSO, ARMS: ARMS, HAND: HAND,
  INSIGNIA: INSIGNIA, POSE: POSE, FLOAT: FLOAT
};
export var SHAPES = {
  belly: belly,
  bump: bump, lobe: lobe, chestShape: chestShape, coreShape: coreShape,
  quadShape: quadShape, quadZone: quadZone, clavicleShape: clavicleShape,
  thighShape: thighShape, lowerLegShape: lowerLegShape, dome: dome,
  kneeShape: kneeShape, calfShape: calfShape,
  pecZone: pecZone, coreZone: coreZone, taperClasses: taperClasses,
  neckClasses: neckClasses
};

/* R111 fixed authored morphology. Estimates from the revised male mold, not
   calibrated anatomy, medical data, or a growth simulation. +Y superior,
   +Z anterior; paired territories mirror X in the rest frame. Poses use the
   existing shoulder/elbow/wrist rig and do not replace these rest forms.
   This is the executable shape owner; myofascial.js evaluates these fields. */
export const MRMAH_MORPHOLOGY = {
  rectus:{originFootprint:'lower rib/costal and sternum sheet',insertionFootprint:'compact fictional lower anterior root',support:'continuous abdominal wall',bellies:[{x:.062,y:1.544,width:.073,length:.105,projection:.084},{x:.079,y:1.671,width:.092,length:.076,projection:.105},{x:.092,y:1.791,width:.099,length:.073,projection:.101}],separationDepth:.011,referencePanel:'mold large front and upper-body inset',confidence:'authored relief; exact hidden attachments not observable'},
  back:{originFootprint:'broad spinal/iliac-inspired trunk sheet and scapular planes',insertionFootprint:'proximal posterior upper-arm region beneath rear deltoid',support:'posterior ribcage and lumbar axis',bellyPeak:[.21,1.85],neighborOverlap:'scapular planes over teres/lat sheet; narrow integrated erectors',referencePanel:'mold large rear',confidence:'stylized attachment interpretation'},
  posteriorSheets: 'back.sheets owns counter-clockwise XY footprints, crown/extent, plane depth/tilt and physical bevel; back.axillaryFold retains a longitudinal attachment sheet',
  reference: {construction:'ADCDB126-E4E7-474A-8D95-8C6008531149/1-Photo-1.jpg male clay guide',presence:'2-Photo-2.jpg',confidence:'authored interpretation; attachment footprints partly occluded'},
  protected: {crown:3,helmetBase:2.268,tip:0,shoulderX:.4895,shoulderY:1.954,waistY:1.48},
  // Same sampling cost, concentrated at crests, rolling returns and insertions.
  sampleY:[0,.15,.44,.55,.66,.77,.87,.97,1.06,1.14,1.22,1.28,1.34,1.40,1.45,1.48,1.515,1.545,1.575,1.605,1.635,1.665,1.695,1.725,1.752,1.78,1.805,1.83,1.855,1.88,1.905,1.93,1.955,1.98,2.005,2.03,2.055,2.08,2.105,2.13,2.155,2.18,2.20,2.22,2.24,2.26,2.28,2.30,2.318,2.335],
  pec:{originFootprint:[[.018,1.88,.23],[.028,2.11,.22],[.23,2.11,.18]],insertionFootprint:[[.38,2.04,.10],[.445,1.98,.09]],support:['sternum','clavicle','proximal humerus'],lower:1.805,lowerCurve:.175,upper:2.133,upperSlope:.095,projection:.225,bellyX:.195,bellyY:2.000,bellyWidth:.205,bellyHeight:.135,medialReturn:.071,lateralEnd:.423,bellyPower:1.35,inferiorReturn:{centreX:.18,lowY:1.825,curvature:2.2,width:.10,continuation:.45},neighbor:'anterior deltoid overlies lateral convergence; local axillary recess'},
  neck:{originFootprint:[[.04,2.10,.18],[.24,2.12,.12]],insertionFootprint:[[.08,2.30,.05],[.06,2.335,-.02]],support:['clavicular arc','posterior helmet seat'],anteriorRoute:[[2.10,.060],[2.17,.071],[2.25,.060],[2.335,.036]],anteriorRelief:.034,throatValley:.012},
  arms:{frame:'project +Z into each rest bone normal plane; mirrored inner/outer side; pose transports this basis; forearm +Z follows palm and positive angle turns toward thumb',originFootprint:'clavicle/acromion/scapular spine into cap; shoulder-to-humeral anterior and posterior routes',insertionFootprint:'cap to lateral humerus; biceps to radius side; brachialis and triceps toward ulna/olecranon',bellyPeaks:{biceps:.50,tricepsLong:.35,tricepsLateral:.54,brachialis:.66,brachioradialis:.24},proximalTransition:[-.30,.15],distalTransition:[.78,1],neighborOverlap:'one shoulder/upper-arm surface, existing articulated elbow/forearm junction; radius crest above fuller flexor belly, bounded dorsal/ulnar planes'},
  lower:{fictional:true,attachment:'compact root into broad common quad/posterior sheets; paired relief merges inside one envelope',maximumY:1.22,noSecondaryExpansion:true},
  TRUNK_WIDTH:[[1.40,.233],[1.48,.21518],[1.55,.224],[1.67,.278],[1.81,.350],[1.94,.345],[2.07,.329],[2.12,.285],[2.18,.137],[2.23,.094],[2.29,.079],[2.318,.066],[2.335,.056]],
  TRUNK_FRONT:[[1.40,.173],[1.48,.178],[1.62,.180],[1.76,.222],[1.85,.236],[1.96,.246],[2.08,.224],[2.15,.157],[2.23,.079],[2.29,.062],[2.335,.054]],
  TRUNK_BACK:[[1.40,.190],[1.48,.165],[1.63,.174],[1.80,.205],[1.98,.244],[2.10,.215],[2.18,.150],[2.23,.112],[2.29,.109],[2.335,.101]],
  TRUNK_PATHS:{
  rectus:[[1.38,.045,.033],[1.59,.059,.047],[1.76,.080,.060],[1.85,.085,.055]],
  oblique:[[1.43,.125,.035],[1.62,.207,.055],[1.84,.310,.035]],
  lat:[[1.46,.060,.028],[1.75,.213,.108],[1.91,.281,.080],[2.09,.319,.032]],
  erector:[[1.40,.047,.029],[1.67,.055,.031],[1.82,.065,.036],[1.97,.076,.045]]
},
  LOWER_WIDTH:[[0,0],[.20,.035],[.43,.084],[.68,.151],[.88,.211],[1.08,.289],[1.22,.318],[1.33,.279],[1.48,.21518],[1.56,.227]],
  LOWER_FRONT:[[0,0],[.20,.026],[.43,.060],[.68,.100],[.88,.148],[1.08,.201],[1.23,.221],[1.34,.201],[1.48,.175],[1.56,.178]],
  LOWER_BACK:[[0,0],[.20,.025],[.43,.057],[.68,.094],[.88,.139],[1.08,.176],[1.25,.208],[1.36,.197],[1.48,.160],[1.56,.163]],
  LOWER_PATHS:{
  rectusFemoris:[[.76,.043,.026],[1.03,.113,.052],[1.23,.131,.060],[1.48,.083,.032]],
  vastusLateralis:[[.79,.099,.029],[1.06,.219,.075],[1.26,.228,.065],[1.45,.161,.027]],
  vastusMedialis:[[.70,.034,.023],[.90,.071,.041],[1.06,.098,.034],[1.30,.124,.022]],
  hamstring:[[.66,.039,.027],[.94,.090,.041],[1.14,.129,.055],[1.33,.155,.039]],
  glute:[[1.02,.116,.038],[1.27,.150,.080],[1.46,.130,.047]]
},
};

// R112: broad attachments and belly sheets from the latest male clay guide.
// These visible surface footprints are authored interpretations, not scans.
MRMAH_MORPHOLOGY.back.axillaryFold=[[1.76,.14,.25,0],[1.85,.18,.335,.025],[1.96,.24,.37,.035],[2.075,.31,.38,0]];


MRMAH_MORPHOLOGY.lower.planeDesign={quadTerritory:[.10,.95],quadProjection:.058,kneeAccentY:.75,kneeRelief:.012,kind:'paired interior chevron; no new joint or external expansion'};

// R114 front cross-sections: support, crown and return are independent.
// Coordinates remain the same authored rest frame; no camera-specific fields.
MRMAH_MORPHOLOGY.pec.surface={
 supportDepth:[[1.77,.275],[1.84,.285],[1.90,.300],[1.97,.338],[2.035,.320],[2.09,.240],[2.14,.180],[2.18,.125]],
 crownDepth:[[1.77,.295],[1.84,.305],[1.885,.335],[1.935,.385],[1.98,.434],[2.035,.450],[2.07,.434],[2.12,.270],[2.18,.135]],
 crownFootprint:[[0,0],[.035,.56],[.082,1],[.254,.98],[.325,.58],[.423,0]],
 lowerCurve:.095,sideExponent:.45,blend:[1.81,2.17,.075],
 projectionScale:.80,inferiorProjectionScale:.725,sternumSupport:.014,lowerSternumSeparation:.025,
 route:'broad clavicular and sternum stock; crown rolls inward before lateral humeral tie-in',
 reference:'2561CD55-A0FF-4099-B425-90010006EA5A/2-Photo-2.jpg'
};
MRMAH_MORPHOLOGY.rectus.crown={projectionScale:.4898,sideTurn:.75,crownConvexity:.19,wallDepth:.047,medialWidth:.028,medialSupport:.012,
 widthScales:[.98,.935,.90],lengthScales:[1.07,1.07,1],intersectionFill:.003};

MRMAH_MORPHOLOGY.arms.planeDesign={
 biceps:{crownBreadth:1.18,crownConvexity:.18,projection:.477},
 brachialis:{origin:.45,peak:.67,insertion:.88,angularCentre:1.46,angularWidth:.50,projection:.058},
 triceps:{longProjection:.47,lateralProjection:.46,longBreadth:.98,lateralBreadth:.85},
 deltoid:{anteriorEnd:.035,posteriorEnd:.065,lateralEnd:.315,valleyWidth:.048,valleyDepth:.040},
 attachment:'outer deltoid boundaries descend obliquely into the humeral surface; brachialis emerges distal to biceps alongside posterior triceps',
 reference:'latest male guide shoulder and arm close-up; authored local rest frame'
};

// R114 broad anatomical footprints, counter-clockwise in mirrored XY.
// Fixed physical bevels keep narrow insertion ends from becoming knife edges.
MRMAH_MORPHOLOGY.back.sheets={
 upperTrap:{footprint:[[.003,2.08],[.19,2.115],[.14,2.22],[.035,2.335],[.001,2.30]],crown:[.075,2.19],extent:[.12,.17],depth:.038,tilt:[-.06,.01],bevel:.060},
 middleTrap:{footprint:[[.008,1.77],[.055,1.81],[.225,2.045],[.175,2.17],[.018,2.23]],crown:[.078,2.04],extent:[.16,.25],depth:.025,tilt:[.03,.02],bevel:.075},
 infraspinatus:{footprint:[[.095,2.015],[.235,1.94],[.360,2.025],[.358,2.095],[.23,2.15],[.125,2.13]],crown:[.235,2.045],extent:[.15,.12],depth:.063,tilt:[.04,.01],bevel:.065},
 teres:{footprint:[[.175,1.885],[.25,1.85],[.390,1.99],[.37,2.065],[.285,2.00]],crown:[.30,1.955],extent:[.14,.14],depth:.066,tilt:[.05,0],bevel:.060},
 lat:{footprint:[[.040,1.52],[.115,1.55],[.300,1.78],[.390,1.96],[.345,2.015],[.170,1.90],[.065,1.71]],crown:[.205,1.795],extent:[.21,.28],depth:.078,tilt:[.10,.04],bevel:.085}
};
MRMAH_MORPHOLOGY.back.planeDesign={crownConvexity:.20,edgeStart:.42,projectionScale:.83,axialIntegration:.006,spinalFloorWidth:.12,spinalFloor:.028,outerReliefExponent:.35};

// R115: explicit male fields, continued from the frozen R114 B0.
// One active profile per region; references are artwork, not calibrated scans.
MRMAH_MORPHOLOGY.pec.surface={"supportDepth":[[1.4,0.228],[1.48,0.236],[1.6,0.239],[1.74,0.268],[1.84,0.289],[1.92,0.301],[2.015,0.3],[2.08,0.271],[2.14,0.172],[2.18,0.125],[2.335,0.054]],"crownDepth":[[1.77,0.284],[1.85,0.329],[1.9,0.367],[1.94,0.389],[2.015,0.398],[2.065,0.391],[2.11,0.326],[2.155,0.175],[2.18,0.125]],"crownFootprint":[[0,0],[0.006,0.3],[0.014,0.85],[0.035,1],[0.26,1],[0.34,0.7],[0.423,0]],"lowerCurve":0.07,"sideExponent":0.45,"blend":[1.825,2.19,0.085],"projectionScale":1,"inferiorProjectionScale":1,"sternumSupport":0.028,"lowerSternumSeparation":0,"route":"R120 / PDF23: consistent connected support; four broad oblique crown/return facing directions within one pec envelope.","reference":"3F8C5D7B-8C2B-4C0C-9C00-6C393710665B/1-Photo-1.jpg","moldPlanes":{"frontDepth":0.397,"crownConvexity":0.007,"crownX":0.17,"halfWidth":0.23,"verticalTilt":0.13,"outerStart":0.23,"outerDepth":0.397,"outerSlope":0.93,"bevel":0.018,"outerBevel":0.02},"sternumSurface":[[1.825,0.245],[1.885,0.28],[1.94,0.326],[2.015,0.37],[2.065,0.36],[2.13,0.22],[2.18,0.125]],"envelope":{"lower":[[0,1.93],[0.04,1.917],[0.12,1.897],[0.21,1.913],[0.29,1.955],[0.36,2.003],[0.423,2.035]],"upper":[[0,2.18],[0.1,2.174],[0.22,2.154],[0.32,2.119],[0.423,2.068]],"lowerReturn":0.104,"upperReturn":0.071,"planarReturn":true,"returnCage":{"height":0.094,"section":[[0,0],[0.18,0.18],[0.52,0.63],[1,1]],"supportLift":0.012,"supportBelow":0.04,"supportAbove":0.067,"medialFade":0.036,"lateralFade":[0.27,0.37],"crownJoin":0.012,"relativeToCrown":true}},"connectedSupport":{"region":[1.4,2.2,0.09],"sideSlope":[[1.4,0.5],[1.6,0.48],[1.75,0.33],[1.87,0.25],[2.015,0.32],[2.14,0.2]],"sideStart":0.11,"midlineHalfWidth":0.026,"midlineRecess":0.007,"thoracicMidline":{"halfWidth":0.015,"recess":0.006,"region":[1.91,2.18,0.035]},"rectusMidline":{"halfWidth":0.012,"recess":0.007,"region":[1.655,1.905,0.025],"source":"Craftsman p10; medial wall frame follows narrower actual column border, same recess depth"}},"facingPlanes":{"source":"PDF 23 / T02; PDF31 anatomy-following fan","fillet":0.004,"faces":[{"name":"clavicular-slope","at":[0.17,2.04],"z":0.385,"slope":[0.05,-0.9]},{"name":"inferior-oblique-face","at":[0.17,1.99],"z":0.386,"slope":[0.2,0.85]},{"name":"outer-attachment-turn","at":[0.25,2.02],"z":0.386,"slope":[-1,0.15]},{"name":"medial-return","at":[0.05,2.01],"z":0.386,"slope":[0.85,-0.07]}],"baselineCrownDepth":[[1.77,0.284],[1.85,0.329],[1.9,0.367],[1.94,0.389],[2.015,0.398],[2.065,0.391],[2.11,0.326],[2.155,0.175],[2.18,0.125]],"front":{"at":[0.17,2.01],"z":0.385,"slope":[0.04,0.06]}},"surfaceCage":{"source":"Craftsman pp8-9; P40 T02/T03; approximate rest-space authoring, not calibrated reconstruction","boundary":[[0.012,1.917],[0.13,1.901],[0.27,1.948],[0.402,2.064],[0.3,2.124],[0.13,2.161],[0.012,2.151]],"crown":[[0.04,1.965,0.36],[0.14,1.949,0.37],[0.26,1.984,0.367],[0.33,2.06,0.311],[0.255,2.094,0.337],[0.13,2.1,0.35],[0.036,2.087,0.33]],"crest":[0.16,2.035,0.384],"baselineSlope":[0.04,0.06],"alignedRows":true,"baselineLower":[[0,1.93],[0.04,1.917],[0.12,1.897],[0.21,1.913],[0.29,1.955],[0.36,2.003],[0.423,2.035]],"baselineReturnSection":[[0,0],[0.18,0.18],[0.52,0.63],[1,1]]}};
MRMAH_MORPHOLOGY.rectus.crown={"wallDepth":0.047};
MRMAH_MORPHOLOGY.rectus.patches=[{"name":"lower","footprint":[[1.405,0.002,0.048],[1.45,0.002,0.105],[1.52,0.002,0.132],[1.585,0.002,0.139],[1.61,0.002,0.13]],"crest":[0.066,1.559],"extent":[0.065,0.109],"projection":0.05,"convexity":[0.0025,0.002],"sidePlane":-0.12,"flow":-0.06,"returns":{"medial":0.014,"lateral":0.03,"longitudinal":0.045},"contour":[[0.005,1.428],[0.069,1.476],[0.126,1.586],[0.124,1.64],[0.013,1.649],[0.003,1.547]],"edgeReturns":[0.04012,0.024,0.024,0.036579999999999994,0.037,0.037],"verticalPlane":0.05,"planarReturn":true,"crownSideOnly":true,"returnFillet":0.003},{"name":"middle","footprint":[[1.603,0.002,0.129],[1.635,0.002,0.152],[1.675,0.002,0.157],[1.715,0.002,0.15],[1.737,0.002,0.136]],"crest":[0.073,1.699],"extent":[0.072,0.074],"projection":0.053,"convexity":[0.0025,0.002],"sidePlane":-0.16,"flow":0.11,"returns":{"medial":0.014,"lateral":0.033,"longitudinal":0.034},"contour":[[0.004,1.627],[0.105,1.648],[0.143,1.706],[0.123,1.752],[0.01,1.752],[0.003,1.699]],"edgeReturns":[0.024,0.021,0.023,0.024,0.016,0.016],"verticalPlane":0.01,"planarReturn":true,"crownSideOnly":true,"returnFillet":0.003,"crownSurface":{"z":0.305,"slope":[-0.09,0.12],"source":"PDF24 / T01; local final surface plane, approximate B0 crown anchor","reliefBaseline":0.053},"shapeContract":{"state":"UNRESOLVED","source":"Craftsman pp8/10; P40 T01/T03","protected":["crest","crownSurface","lower patch"],"edit":"medial and transverse footprints return over different local distances; no crown multiplier"}},{"name":"upper","footprint":[[1.737,0.002,0.137],[1.765,0.002,0.157],[1.8,0.002,0.164],[1.835,0.002,0.159],[1.868,0.002,0.129]],"crest":[0.077,1.826],"extent":[0.079,0.069],"projection":0.051,"convexity":[0.0025,0.002],"sidePlane":-0.19,"flow":0.18,"returns":{"medial":0.014,"lateral":0.032,"longitudinal":0.031},"contour":[[0.004,1.755],[0.105,1.785],[0.151,1.827],[0.132,1.879],[0.009,1.898],[0.003,1.824]],"edgeReturns":[0.023,0.02,0.022,0.026,0.014,0.014],"verticalPlane":-0.035,"planarReturn":true,"crownSideOnly":true,"returnFillet":0.003,"crownSurface":{"z":0.333,"slope":[-0.13,0.16],"source":"PDF24 / T01; local final surface plane, approximate B0 crown anchor","reliefBaseline":0.051},"shapeContract":{"state":"UNRESOLVED","source":"Craftsman pp8/10; P40 T01/T03","protected":["crest","crownSurface","lower patch"],"edit":"medial and transverse footprints return over different local distances; no crown multiplier"}}];
MRMAH_MORPHOLOGY.rectus.organization={"lineaDepth":0.006,"lineaHalfWidth":0.011,"flankProjection":0.023,"reference":"astra-r117/references/regional-boundaries.json","method":"independent per-edge rectus returns and crown directions; two short rib sheets over one long oblique sheet","flankTurn":{"startX":0.135,"slope":0.61,"region":[1.47,1.93,0.12],"slopeProfile":[[1.47,0.61],[1.62,0.54],[1.76,0.29],[1.85,0.15],[1.93,0.1]]},"bridgeRecess":0.024,"columnProfile":[[1.405,0],[1.48,0.018],[1.59,0.028],[1.66,0.03],[1.74,0.032],[1.84,0.031],[1.91,0]],"lateralSheets":[{"footprint":[[0.117,1.465],[0.196,1.555],[0.274,1.745],[0.244,1.778],[0.168,1.635]],"crown":[0.192,1.64],"extent":[0.09,0.17],"depth":0.026,"tilt":[-0.22,0.095],"bevel":0.029,"planeReturns":true,"returnFillet":0.003},{"footprint":[[0.166,1.701],[0.247,1.774],[0.319,1.865],[0.288,1.881],[0.183,1.783]],"crown":[0.227,1.79],"extent":[0.083,0.08],"depth":0.03,"tilt":[-0.11,0.04],"bevel":0.023,"planeReturns":true,"returnFillet":0.003},{"footprint":[[0.183,1.796],[0.278,1.872],[0.343,1.935],[0.306,1.944],[0.197,1.863]],"crown":[0.258,1.863],"extent":[0.088,0.076],"depth":0.034,"tilt":[-0.17,-0.03],"bevel":0.022,"planeReturns":true,"returnFillet":0.003}],"sampleX":[0,0.014,0.031,0.056,0.082,0.108,0.137,0.171,0.225,0.29,1],"surfaceSamples":{"patch":"middle","region":[1.65,1.755,0.025],"source":"PDF24/31; rest-space crest and lateral-return samples within existing allocation"},"supportReturn":{"outer":0.133,"width":0.041,"region":[1.655,1.875,0.025],"source":"PDF24-25: independent lateral column support; verified max(crown,bed) concealed return at 52% of middle-footprint samples"}};
MRMAH_MORPHOLOGY.arms.planeDesign={"biceps":{"crownBreadth":1.24,"crownConvexity":0.09,"projection":0.46,"bellySpan":[0.35,0.57]},"brachialis":{"origin":0.4,"peak":0.69,"insertion":0.9,"angularCentre":1.48,"angularWidth":0.52,"projection":0.19},"triceps":{"longProjection":0.47,"lateralProjection":0.48,"longBreadth":1.08,"lateralBreadth":0.93,"longSpan":[0.24,0.43],"lateralSpan":[0.43,0.6]},"deltoid":{"anteriorEnd":0.09,"posteriorEnd":0.15,"lateralEnd":0.34,"valleyWidth":0.056,"valleyDepth":0.042},"attachment":"outer deltoid boundaries descend obliquely into the humeral surface; brachialis emerges distal to biceps alongside posterior triceps","reference":"PDF26-27 / T03 and T01: longitudinally distinct bellies; B0-integral-preserving envelope; retain local wedge returns.","angularSamples":[0,0.24,0.48,0.7,0.89,1.05,1.22,1.42,1.61,1.82,2.03,2.23,2.47,2.72,3.141592653589793,3.45,3.82,4.17,4.55,4.94,5.3,5.62,5.91,6.12,6.283185307179586],"crowns":{"base":1.085,"growth":0.24,"convexity":0.065,"method":"bounded normal-direction redistribution; same arm axis and insertion footprints"},"regionalPlanes":{"brachialisCrown":1.12,"brachialisTilt":0.24,"armLimit":0.032,"forearmTurn":0.75,"deltFacing":1.15,"deltReturnSlope":0.3,"preserveReturns":true,"sideFaces":[{"name":"biceps-lateral-return","normal":[0.6,0.8],"offset":1.1,"region":[0.24,0.38,0.73,0.9],"limit":0.022},{"name":"triceps-lateral-return","normal":[0.75,-0.66],"offset":1.13,"region":[0.2,0.35,0.72,0.89],"limit":0.023},{"name":"brachialis-facing","normal":[1,0.2],"offset":1.16,"region":[0.42,0.55,0.76,0.9],"limit":0.01},{"name":"cap-anterior-turn","normal":[0.55,0.84],"offset":1.12,"region":[-0.31,-0.15,0.08,0.27],"limit":0.016},{"name":"cap-posterior-turn","normal":[0.63,-0.78],"offset":1.15,"region":[-0.3,-0.1,0.14,0.32],"limit":0.016}]}};
MRMAH_MORPHOLOGY.back.sheets={"upperTrap":{"footprint":[[0.004,2.077],[0.183,2.119],[0.137,2.225],[0.035,2.335],[0.001,2.298]],"crown":[0.072,2.2],"extent":[0.11,0.15],"depth":0.037,"tilt":[-0.13,0.085],"bevel":0.025,"planeReturns":true,"surfaceFrame":{"depth":0.154506,"reliefBaseline":0.037,"slope":[-0.35,-0.85],"returnWidth":0.035,"limit":0.027,"source":"PDF28-29 / T03; B0 mesh depth at named crown; visual facing-direction trial"}},"middleTrap":{"footprint":[[0.02,1.72],[0.105,1.885],[0.184,2.099],[0.109,2.246],[0.013,2.171]],"crown":[0.073,2.047],"extent":[0.11,0.3],"depth":0.034,"tilt":[0.04,0.065],"bevel":0.033,"planeReturns":true,"surfaceFrame":{"depth":0.293284,"reliefBaseline":0.034,"slope":[-0.2,-0.28],"returnWidth":0.032,"limit":0.027,"source":"PDF28-29 / T03; B0 mesh depth at named crown; visual facing-direction trial"}},"infraspinatus":{"footprint":[[0.142,1.962],[0.263,1.95],[0.369,2.047],[0.332,2.139],[0.209,2.175],[0.113,2.08]],"crown":[0.244,2.07],"extent":[0.13,0.11],"depth":0.052,"tilt":[-0.025,0.16],"bevel":0.032,"planeReturns":true,"edgeReturns":[0.024,0.03,0.05,0.047,0.031,0.029],"returnFillet":0.004,"surfaceFrame":{"depth":0.239864,"reliefBaseline":0.052,"slope":[-0.46,-0.1],"returnWidth":0.027,"limit":0.027,"source":"PDF28-29 / T03; B0 mesh depth at named crown; visual facing-direction trial"}},"teres":{"footprint":[[0.178,1.86],[0.292,1.89],[0.391,2.02],[0.366,2.077],[0.242,1.989]],"crown":[0.288,1.962],"extent":[0.12,0.13],"depth":0.039,"tilt":[0.08,-0.09],"bevel":0.027,"planeReturns":true,"edgeReturns":[0.04,0.034,0.03,0.021,0.026],"returnFillet":0.004,"surfaceFrame":{"depth":0.25525,"reliefBaseline":0.039,"slope":[0.18,-0.22],"returnWidth":0.024,"limit":0.027,"source":"PDF28-29 / T03; B0 mesh depth at named crown; visual facing-direction trial"}},"lat":{"footprint":[[0.063,1.483],[0.166,1.621],[0.298,1.759],[0.387,1.96],[0.288,1.941],[0.141,1.808]],"crown":[0.22,1.811],"extent":[0.16,0.31],"depth":0.061,"tilt":[0.02,-0.045],"bevel":0.043,"planeReturns":true,"edgeReturns":[0.059,0.052,0.037,0.025,0.031,0.054],"returnFillet":0.004,"surfaceFrame":{"depth":0.27846,"reliefBaseline":0.061,"slope":[0.22,0.19],"returnWidth":0.04,"limit":0.027,"source":"PDF28-29 / T03; B0 mesh depth at named crown; visual facing-direction trial","outerTurn":[0.245,-0.45,0.65]}}};
MRMAH_MORPHOLOGY.lower.planeDesign={"quadTerritory":[0.1,0.95],"quadProjection":0.058,"kneeAccentY":0.75,"kneeRelief":0.012,"kind":"paired interior chevron; no new joint or external expansion","crownLimit":0.033,"crownConvexity":0.011,"directionalCrown":true,"quadFaces":{"crestQ":0.44,"upperOblique":0.065,"outerSlope":0.08,"innerSlope":0.018,"returnWidth":0.018},"surfaceFaces":{"source":"PDF30-31 / T01 longitudinal quad faces; one continuous surface","depth":[[0.6,0.093],[0.77,0.135],[0.97,0.19],[1.14,0.233],[1.22,0.239],[1.34,0.212],[1.46,0.184]],"crestQ":0.41,"convexity":0.005,"innerTurn":0.3,"outerTurn":0.52,"innerSlope":0.58,"outerSlope":0.72,"boundary":[0.1,0.94],"edgeWidth":0.15,"region":[0.62,1.44,0.15],"linearFaces":true}};
MRMAH_MORPHOLOGY.sampleY=[0,0.15,0.44,0.55,0.66,0.77,0.87,0.97,1.06,1.14,1.22,1.28,1.34,1.4,1.45,1.48,1.535,1.585,1.61,1.63,1.65,1.675,1.695,1.735,1.755,1.78,1.805,1.825,1.845,1.865,1.885,1.91,1.935,1.96,1.985,2.01,2.035,2.06,2.085,2.11,2.135,2.16,2.18,2.2,2.22,2.24,2.26,2.28,2.3,2.335];
MRMAH_MORPHOLOGY.neck.anteriorRelief=0.02;
MRMAH_MORPHOLOGY.matureFit={"baseline": "astra-r117/B0", "reference": "astra-r117/references", "torso": "One continuous costal/abdominal support, independent directed crowns and a neighbour-derived recessed midline. No whole-ring depth scaling.", "confidence": "Manual image boundaries; support is an authored approximation, not scan data."};
MRMAH_MORPHOLOGY.rectus.organization.columnBed=.029;


// R119 spinal floor is derived from the two local support rims; it closes the
// broad inherited hollow while preserving the neighbouring trap/erector crowns.
MRMAH_MORPHOLOGY.back.midlineReturn={region:[1.53,2.28,.09],halfWidth:[[1.53,.020],[1.78,.034],[2.12,.041],[2.28,.020]],depth:.009,floorFraction:.23};

// R118 rest-surface boundaries. Widths belong to their named local regions.
// Primary anatomy is preserved outside these finite corridors. No striations.
export const MRMAH_RECESSES = {
  torsoFront: [
    {name:'under-pec-return',class:'A',mirror:true,path:[[.038,1.897],[.12,1.894],[.205,1.909],[.295,1.956]],width:.042,regionWidth:.38,depthT:.010,maxDepth:.006,floor:.20,walls:[.70,1.35],fade:.22,widthEnds:.65},
    {name:'rectus-upper-intersection',class:'B',mirror:true,path:[[.021,1.760],[.071,1.769],[.132,1.790]],width:.042,regionWidth:.145,depthT:.015,maxDepth:.009,floor:.22,walls:[.75,1.30],fade:.20},
    {name:'linea-alba',class:'A',path:[[0,1.49],[0,1.64],[0,1.79],[0,1.89]],width:.036,regionWidth:.29,depthT:.014,maxDepth:.007,floor:.20,walls:[1,1],fade:.15}
  ],
  torsoRear: [
    {name:'scapular-teres-overlap',thicknessBySide:{"1": 0.6955422607755954, "-1": 0.6955422607755954},class:'A',mirror:true,path:[[.14,2.095],[.23,2.047],[.30,2.02],[.347,2.052]],width:.064,regionWidth:.29,depthT:.025,maxDepth:.015,floor:.20,walls:[1.45,.70],fade:.20},
    {name:'lat-upper-return',thicknessBySide:{"1": 0.3305855977744146, "-1": 0.35346846914098284},class:'A',mirror:true,path:[[.12,1.826],[.207,1.872],[.296,1.941],[.344,1.999]],width:.060,regionWidth:.34,depthT:.024,maxDepth:.013,floor:.20,walls:[.75,1.35],fade:.22},
    {name:'erector-lumbar-return',thicknessBySide:{"1": 0.5555852838493072, "-1": 0.5555852838493072},class:'B',mirror:true,path:[[.035,1.47],[.076,1.62],[.106,1.775],[.141,1.897]],width:.042,regionWidth:.22,depthT:.012,maxDepth:.006,floor:.18,walls:[1.25,.80],fade:.25}
  ], lower: [
    {name:'quad-inner-return',alpha:1,class:'B',mirror:true,path:[[.044,.73],[.068,.95],[.109,1.18],[.14,1.35]],width:.049,regionWidth:.285,depthT:.012,maxDepth:.005,floor:.20,walls:[.80,1.30],fade:.28,widthEnds:.60},
  ],
  // Arm paths are (outer angle in radians, shoulder-to-elbow t). The builder
  // converts this named bone chart to surface-length units before fitting.
  upperArm: [
    {name:'deltoid-anterior-insertion',alpha:1,class:'A',path:[[.28,.055],[.78,.19],[1.20,.285],[1.48,.325]],width:.050,regionWidth:.32,depthT:.026,maxDepth:.009,floor:.23,walls:[.70,1.45],fade:.22},
    {name:'deltoid-posterior-insertion',alpha:1,class:'A',path:[[2.80,.14],[2.27,.24],[1.77,.31],[1.48,.325]],width:.047,regionWidth:.32,depthT:.022,maxDepth:.008,floor:.22,walls:[1.35,.80],fade:.22},
    {name:'brachialis-anterior',alpha:1,class:'A',path:[[1.02,.44],[.93,.60],[.86,.73],[1.05,.85]],width:.044,regionWidth:.21,depthT:.026,maxDepth:.0085,floor:.22,walls:[.75,1.40],fade:.20},
    {name:'brachialis-posterior',alpha:1,class:'B',path:[[1.96,.48],[1.83,.64],[1.67,.77],[1.29,.87]],width:.041,regionWidth:.21,depthT:.014,maxDepth:.005,floor:.18,walls:[1.20,.85],fade:.24},
    {name:'triceps-distal-return',alpha:1,class:'B',path:[[2.40,.66],[2.24,.75],[2.13,.83],[2.40,.89]],width:.042,regionWidth:.24,depthT:.012,maxDepth:.0045,floor:.18,walls:[.85,1.25],fade:.25}
  ], forearm: []
};

// R122: constrain shared edges on the existing outer pec cage.
MRMAH_MORPHOLOGY.pec.surface.surfaceCage.conformOuterReturn = true;

// R122: restore local costal support below the fixed pec crown, P40 p23.
MRMAH_MORPHOLOGY.pec.surface.connectedSupport.underPecPlane = {x:[.10,.335,.028], y:[1.895,1.99,.024], origin:[.22,1.945], z:.295, slope:[-.36,.18]};

MRMAH_MORPHOLOGY.pec.surface.surfaceCage.returnBevel = .0035;

// R122: lower crown turns inward before the connected costal return.
MRMAH_MORPHOLOGY.pec.surface.surfaceCage.crown[1][2] = .350;
MRMAH_MORPHOLOGY.pec.surface.surfaceCage.crown[2][2] = .346;

// R122: crown directions share the same crest and return vertices.
MRMAH_MORPHOLOGY.pec.surface.surfaceCage.conformCrownFan = true;

// R123 / Craftsman p9: restore a local medial attachment, not a raised strip.
// floorOffsetZ is an axial construction distance, not claimed normal depth.
MRMAH_MORPHOLOGY.arms.planeDesign.regionalPlanes.preserveBrachialisReturns = true;
// R132 / P40 pp26–27: side-plane half-spaces previously crossed the bellies.
// Rest-chart angular footprints now preserve the broad biceps/triceps crowns.
Object.assign(MRMAH_MORPHOLOGY.arms.planeDesign.regionalPlanes.sideFaces.find(f=>f.name==='biceps-lateral-return'),{
  angularRegion:[.44,.66,1.08,1.24]
});
Object.assign(MRMAH_MORPHOLOGY.arms.planeDesign.regionalPlanes.sideFaces.find(f=>f.name==='triceps-lateral-return'),{
 angularRegion:[1.65,1.83,2.45,2.72]
});
// Shoulder-pivot to elbow h / angular half-footprint in radians. The support
// radius and existing longitudinal crown projection are unchanged. Biceps
// breadth now narrows independently toward its distal attachment. Triceps
// width trials remain in evidence only; their current crowns are retained.
MRMAH_MORPHOLOGY.arms.planeDesign.biceps.footprintWidth=[
 [.10,.62],[.315,1.14],[.47,1.12],[.61,.93],[.78,.56],[.94,.24]
];
// P40 pp26–27 / Craftsman11. This is a rest-frame shape trial, not a depth
// recovered from artwork. The crown level and direction use actual mesh rays.
MRMAH_MORPHOLOGY.arms.planeDesign.triceps.surface={
 name:'lateral triceps directional crown and return',angle:2.33,crest:[.52,.003],
 facingAnchors:[[.39,-.035],[.47,.040],[.66,.005]],
 footprint:[[.30,-.045],[.38,-.073],[.65,-.058],[.78,0],[.64,.062],[.42,.074]],
 crownHalfWidth:.052,convexity:.003,returnWidth:.018,axialFade:[.30,.40,.62,.76],limit:.018,
 source:'R133 / P40 pp26–27, Craftsman11; h is humeral position, transverse values are model units'
};
MRMAH_MORPHOLOGY.arms.planeDesign.triceps.longSurface={
 name:'long triceps posterior crown and taper',angle:3.72,crest:[.43,.006],
 facingAnchors:[[.35,-.025],[.43,.042],[.61,.010]],
 footprint:[[.30,-.018],[.38,-.062],[.62,-.042],[.72,.016],[.56,.077],[.34,.046]],
 crownHalfWidth:.050,convexity:.0035,returnWidth:.020,axialFade:[.30,.39,.55,.70],limit:.016,
 source:'R133 / P40 pp26–27, Craftsman11; distinct proximal long-head facing with preserved distal tendon'
};
// R135 / Craftsman11: tapered anterior belly below the cap, with a gently
// convex longitudinal facing region. Support rays are sampled from the final
// mesh; values define a local footprint, not a global arm-size correction.
MRMAH_MORPHOLOGY.arms.planeDesign.biceps.surface={
 name:'biceps anterior belly and proximal attachment',angle:-.06,crest:[.47,0],
 facingAnchors:[[.30,-.030],[.36,.035],[.66,.005]],
 footprint:[[.18,-.025],[.29,-.090],[.53,-.096],[.75,-.030],[.76,.028],[.56,.080],[.31,.044]],
 crownHalfWidth:.074,convexity:.006,crownStations:[.18,.28,.40,.50,.64,.76],
 facingSlopeX:-.18,sideTurns:[[.043,.50],[.038,.72]],sideBevel:.012,angularBounds:[-.72,.45],moldNormals:true,
 crestDrift:-.10,returnWidth:.025,axialFade:[.18,.30,.62,.76],limit:.022,
 source:'R135 / P40 pp26–27; h in actual humeral rest frame, transverse lengths in model units; crown depth from B0 surface'
};
// R136 authoring layer. These cages share the live anatomical owner and rig,
// but opt in independently of the shipping mesh/tier. Coordinates are rest
// h/angle landmarks; named quads are readable regions, not triangle quotas.
MRMAH_MORPHOLOGY.arms.authoringMaster={
 source:'AAA redirect / Mr. Mah arm branch; original clay and Craftsman11 remain visual authority',
 cap:{id:'DELTOID',
  primarySurface:{source:'R142 / P40pp26-27 and Craftsman11; primary cap replacement; R140 measured lateral apex locks span',
   apexB0:{L:[.1764407455921173,-.007685027085244656,.014914414845407009],R:[-.1802702397108078,-.006673261523246765,.015886880457401276]},
   angles:[-.50,.12,.65,1.05,1.52,2.0,2.55,3.10,3.64],
   starts:[-.30,-.30,-.30,-.30,-.30,-.30,-.30,-.30,-.30],
   superior:[-.22,-.22,-.20,-.18,-.16,-.18,-.20,-.22,-.22],
   crests:[-.10,-.10,-.075,.015,.06,.015,-.08,-.10,-.10],
   returns:[.06,.09,.13,.19,.265,.185,.11,.065,.065],
   ends:[.16,.23,.32,.405,.46,.41,.28,.22,.20],
   offsets:[[0,0,0,0,0,0,0,0,0],[0,0,.002,.002,0,.002,.002,0,0],[0,-.008,-.012,-.004,0,-.004,-.012,-.010,0],[0,-.003,-.010,-.012,-.020,-.014,-.008,-.003,0],[0,0,0,0,0,0,0,0,0]],
   owners:['anterior deltoid medial support','anterior deltoid crown','anterior/lateral deltoid turn','lateral deltoid anterior face','lateral deltoid posterior face','posterior deltoid outer turn','posterior deltoid crown','posterior medial support'],
   faceConvexity:.0015,axialBlend:.12,angularBlend:.20,safetyLimit:.050},
 },
 brachialis:{id:'BRACHIALIS',owners:['anterior brachialis return','posterior brachialis face'],
  grid:[[[.33,1.14],[.33,1.45],[.33,1.78]],[[.54,1.12],[.54,1.48],[.54,1.91]],[[.70,1.18],[.70,1.33],[.70,1.48]],[[.88,1.07],[.88,1.16],[.88,1.25]]],
  radialOffsets:[[0,0,0],[0,.012,0],[0,0,0],[0,0,0]],limit:.018,edgeBlend:.004},
 // R138: independent longitudinal masses. h is measured along the retained
 // humeral axis; angles use the mirrored front/outward chart. Unequal row
 // positions place the anterior crest distal to the posterior long-head crest.
 // The h>=.70 tendon/seam bridge and all pocket targets remain untouched.
 biceps:{id:'BICEPS',owners:['medial biceps turn','anterior biceps crown','lateral biceps return'],
  primaryBelly:{source:'R143 / P40pp26-27, Craftsman11 and clay arm crop; R142 fixed comparison family',
   rows:[[.26,-.08,.25,0],[.38,.10,.70,.80],[.50,.13,.70,1],[.63,.18,.52,.75],[.76,.23,.16,0]],
   peak:[.50,.10],peakSupportH:[.34,.40,.46,.52],peakSupportAngles:[-.20,-.06,.12,.25],rimStations:41,
   crownSides:[.48,.40],convexity:.0025,phases:[.38,.55],
   axialBlend:.035,edgeBlend:.20,capBlend:.04,safetyLimit:.035},
  grid:[[[.17,-.48],[.14,-.12],[.17,.40],[.23,.92]],
   [[.33,-.48],[.36,-.12],[.38,.47],[.36,1.03]],
   [[.51,-.40],[.50,-.06],[.49,.44],[.51,.94]],
   [[.58,-.25],[.65,.02],[.65,.27],[.58,.72]]],
  radialOffsets:[[0,0,0,0],[0,.006,.008,0],[0,.008,.006,0],[0,0,0,0]],
  limit:.022,edgeBlend:.027,radialProjection:true},
 triceps:{id:'TRICEPS',owners:['lateral triceps turn','posterolateral triceps crown','long-head posterior face'],
  primaryBelly:{source:'R146 precision arm pivot / original male clay arm and posterior reference; actual B0 support',
   rows:[[.24,3.28,.40,0],[.34,3.22,1.04,.94],[.43,3.16,1.07,1],[.57,3.12,.85,.72],[.70,3.0,.26,0]],
   peak:[.39,3.20],peakSupportH:[.30,.37,.44],peakSupportAngles:[2.70,3.10,3.40,3.75],rimStations:41,
   crownSides:[.42,.48],convexity:.003,phases:[.36,.53],axialBlend:.035,edgeBlend:.20,capBlend:.04,safetyLimit:.045},
  grid:[[[.15,1.98],[.08,2.60],[.09,3.38],[.15,4.40]],
   [[.31,1.92],[.34,2.54],[.29,3.35],[.29,4.40]],
   [[.52,2.03],[.53,2.48],[.47,3.22],[.48,4.30]],
   [[.57,2.19],[.64,2.65],[.65,3.24],[.57,4.01]]],
  radialOffsets:[[0,0,0,0],[0,.005,.009,0],[0,.005,.002,0],[0,0,0,0]],
  limit:.024,edgeBlend:.030,radialProjection:true,
  attachedReturn:{source:'R139 / P40pp26-27, Craftsman11; R138 measured posterior rebound, no reference-derived numeric depth',
   interval:[.49,.675],angles:[2.15,4.40],angularSamples:33,angularFade:.23,tangentStep:.01,endpointBlend:.018,safetyLimit:.025}},
 forearm:{id:'FOREARM',owners:['radial flexor','radial sweep','radial extensor','extensor','ulnar extensor','ulnar return','ulnar flexor','flexor'],
  angles:[-.40,.385,1.17,1.955,2.74,3.525,4.31,5.095,5.88318530718],rows:[.10,.46,.87],limit:.018,edgeBlend:.008,closed:true},
 // Frozen R136 FULL support thickness: changing adjacent masses must not
 // silently deepen the already retained pocket targets in this comparison.
 pockets:[{id:'BRACHIALIS_UPPER',owner:'deltoid / brachialis convergence',h:.425,angle:1.14,lengthH:.024,widthW:.012,depthT:.009,supportThicknessB0:{R:.334746626498713,L:.2867075698676086}},
  {id:'BRACHIALIS_LOWER',owner:'brachialis / elbow tendon return',h:.835,angle:1.10,lengthH:.022,widthW:.010,depthT:.008,supportThicknessB0:{R:.31256419754598497,L:.2209675904366021}}],
 refinement:{passes:2,edgesPerPass:5000,minEdge:.0035,pocketEdges:256,pocketPasses:5,minPocketEdge:.00055}
};

MRMAH_MORPHOLOGY.pec.surface.connectedSupport.thoracicBridge = {
  region:[1.95,2.175,.035],halfWidth:.040,floorHalfWidth:.006,floorOffsetZ:.019
};

// R124 / Craftsman p10: oblique paired rectus shields on the existing wall.
// Crown positions/depths and the recovered lower patch remain unchanged.
MRMAH_MORPHOLOGY.rectus.patches[1].contour = [
  [.004,1.627],[.105,1.648],[.143,1.706],[.145,1.754],[.010,1.727],[.003,1.699]
];
MRMAH_MORPHOLOGY.rectus.patches[2].contour = [
  [.004,1.752],[.110,1.777],[.148,1.826],[.156,1.881],[.009,1.898],[.003,1.824]
];
// A single shared path is evaluated between these two attachment outlines,
// instead of retaining a separately authored horizontal intersection track.
MRMAH_MORPHOLOGY.rectus.organization.sharedIntersection = {
  lowerPatch:1, upperPatch:2, stations:[.021,.050,.080,.110,.128],
  source:'Craftsman p10 / P40 pp24-25, T01/T03; approximate outline authoring'
};

// R124 / Craftsman p9: local costal support meets the unchanged pec return.
// This raises only the existing bounded support plane, not the pec crown.
MRMAH_MORPHOLOGY.pec.surface.connectedSupport.underPecPlane.z = .313;

// R125: final R124 mesh floor, measured once in the rest chart. Local FULL
// thickness and outward normals are recorded; no extra cut or screenshot depth.
Object.assign(MRMAH_RECESSES.torsoFront.find(c=>c.name==='rectus-upper-intersection'),{
 alpha:1, fixedFloor:{source:"Measured R124-clay-0c3711f3a682 actual final triangles; paired average in canonical positive-X rest chart",points:[
  [0,0.021,1.742604716981132,0.29921629185545795,-0.20625038126742606,-0.16337778266235545,0.9647634323290728,0.5579063904718504],
  [0.041666666666666664,0.025622025767202218,1.7436119697662489,0.3000109715248394,-0.08220849904465241,-0.1730302923201985,0.9814796384155975,0.5763050315094458],
  [0.08333333333333333,0.03024405153440443,1.7446192225513655,0.2997958873831986,0.08748382599026311,-0.20200940886325644,0.9754684920184881,0.5874458705287966],
  [0.125,0.03486607730160665,1.7456264753364823,0.2991765996964685,0.155053294774059,-0.20185630212771224,0.9670638598722602,0.6098254006432505],
  [0.16666666666666666,0.03948810306880886,1.746633728121599,0.2981775685861777,0.12994094756383767,-0.1786684345670882,0.9752912081196867,0.5894586708041543],
  [0.20833333333333334,0.04411012883601108,1.7476409809067157,0.2981669184618172,0.1295601208232636,-0.17685597499438382,0.9756721473943217,0.5869038621381749],
  [0.25,0.0487321546032133,1.7486482336918323,0.298563787531074,0.1395953768368477,-0.18403045645552918,0.9729573073175143,0.5913190425725948],
  [0.2916666666666667,0.053354180370415505,1.7496554864769491,0.2978917448004519,0.13587736539795303,-0.16772956061402203,0.9764241578682589,0.5826181897300953],
  [0.3333333333333333,0.057976206137617725,1.7506627392620657,0.2971636368470708,0.13142710403177926,-0.1502943217841343,0.9798665894729072,0.5745599114818263],
  [0.375,0.06259823190481995,1.7516699920471825,0.29643552889368974,0.12697660671785158,-0.132978759808063,0.982951469191806,0.5689924686822909],
  [0.4166666666666667,0.06722025767202217,1.7526772448322991,0.29590023995238773,0.12266051338734575,-0.14059830268929827,0.9824390646429128,0.5684216821437822],
  [0.4583333333333333,0.07184228343922439,1.753684497617416,0.29539408512384924,0.11835681669992205,-0.15192987818278078,0.9812792548790717,0.5703087857387426],
  [0.5,0.07646430920642659,1.7546917504025326,0.29485741803742416,0.18023932600642384,-0.18363488757737184,0.9663291434212239,0.5916139373185079],
  [0.5416666666666666,0.08108633497362881,1.7556990031876494,0.29431537283126097,0.252819561041114,-0.21784314378282843,0.9426699498031069,0.6389051313384619],
  [0.5833333333333334,0.08570836074083102,1.756706255972766,0.2933706030533242,0.308605577964686,-0.23035483658293177,0.9228755314298525,0.6122274542917858],
  [0.625,0.09033038650803324,1.7577135087578828,0.29138822319279556,0.34973393335628844,-0.19581660751133717,0.9161561177451636,0.5944899063970069],
  [0.6666666666666666,0.09495241227523546,1.7587207615429994,0.2895485648760629,0.3889831198983872,-0.15531797220521062,0.908057520173793,0.5865920872201349],
  [0.7083333333333334,0.09957443804243768,1.7597280143281162,0.2877089065593303,0.42744197367699444,-0.11379325611599024,0.8968525263395517,0.5850057332120615],
  [0.75,0.10419646380963989,1.7607352671132328,0.2857759084180209,0.4695359974178238,-0.07492891518235442,0.8797281425522575,0.6305791800106977],
  [0.7916666666666666,0.1088184895768421,1.7617425198983496,0.28274268051976015,0.5307688822719115,-0.07063743821528637,0.8445677864648918,0.6634354242432575],
  [0.8333333333333334,0.11282413032261526,1.7641032338981582,0.27990435029619265,0.5717636202868763,-0.11152972684220722,0.8128022407369134,0.6762001999950762],
  [0.875,0.11661809774196144,1.7669287412130923,0.2774168000258533,0.611324407250003,-0.1596905416294424,0.7751008966673487,0.6923006287702815],
  [0.9166666666666666,0.12041206516130763,1.7697542485280264,0.27489783411838864,0.6344112989660892,-0.19846051943979826,0.7470848184562747,0.6973058731447517],
  [0.9583333333333334,0.12420603258065382,1.7725797558429606,0.2723084230895748,0.5784730046899367,-0.1862068883606588,0.7941636969618024,0.6996423138504541],
  [1,0.128,1.7754052631578947,0.26972670394049747,0.5180510342748678,-0.17218760247370768,0.8378392181326297,0.6224435370856538]
 ]}
});

// Same eight edge splits: two floor and one on each wall per mirrored side.
MRMAH_RECESSES.torsoFront.find(c=>c.name==='rectus-upper-intersection').sampleBands=[{at:0,count:2,h:[.2,.85]},{at:-.62,count:1,h:[.2,.85]},{at:.62,count:1,h:[.2,.85]}];

// R125 / Craftsman p10: a longer lateral wall under the unchanged middle
// crown, inside its existing attachment outline. No extra belly projection.
MRMAH_MORPHOLOGY.rectus.patches[1].edgeReturns[2] = .035;
// R126: inferior/oblique return joins the existing continuous column stock.
// Footprint, crown frame, upper floor and lower-ab landmark remain fixed.
MRMAH_MORPHOLOGY.rectus.patches[1].supportReturns={
  0:{width:.046,endEase:.18},
  1:{width:.034,endEase:.18}
};
MRMAH_MORPHOLOGY.arms.planeDesign.deltoid.insertionNarrowing=.72;
// R127 / Craftsman p10: the measured inferior trough reverses sharply at
// Y1.630, beneath the preserved middle crown. Local column stock only.
MRMAH_MORPHOLOGY.rectus.organization.inferiorSupport={
  region:[1.600,1.667,.013],lateral:[.018,.113,.021],
  stock:[[1.600,.032],[1.630,.038],[1.667,.032]],
  source:'R126 actual XY sections; local support trial, not artwork depth'
};
// R128 / Craftsman p11, P40 pp26-27: landmarks are existing angular
// columns, in the pre-elbow arm frame. Their positions stay unchanged.
MRMAH_MORPHOLOGY.arms.planeDesign.sectionFaces={
  landmarks:[.48,1.05,1.22,1.61,2.03,2.72],region:[.30,.47,.72,.90],moldNormals:true,
  wedgeBounds:[[.30,1.22,1.61],[.39,1.28,1.46],[.47,1.20,1.58],[.61,1.22,1.61],[.69,1.19,1.49],[.78,1.12,1.29],[.90,1.22,1.61]],
  normalFaces:[0,.65,1,.25,0],
  capFaces:{landmarks:[.24,.89,1.61,2.23,2.72],region:[-.30,-.16,.12,.31],
    source:'R131 / P40 p26, Craftsman11: wrapped cap faces between existing front, lateral and rear crests; rest-ring anchors held'},
  source:'R127 measured pre-elbow columns; biceps return / brachialis face / triceps turn; no final-pose anchor reuse'
};
// R134 / Craftsman11: measured crown/valley rails are retained. The transverse
// coordinate runs crown 0 to existing floor 1; rise is a fraction of this
// local wall span, not extra groove depth or a whole-arm scale factor.
MRMAH_MORPHOLOGY.arms.planeDesign.sectionFaces.bicepsReturn={
 region:[.36,.47,.61,.74],profile:[[0,0],[.42,.14],[.72,.065],[1,0]],
 angles:[.48,1.05],stations:[.36,.40,.47,.54,.61,.69,.74],
 crestFlow:[[.36,.34],[.47,.38],[.61,.50],[.72,.62],[.84,.62]],
 source:'R134 / P40 pp26–27; bounded biceps-facing turn into the preserved brachialis valley'
};
// R129 / P40pp28–29: a shared rear-facing crown and attached lower return.
MRMAH_MORPHOLOGY.back.sheets.infraspinatus.surfacePatch={
 source:'R129 / Craftsman p12; P40 pp28–29: local rear crown and attached return; model-space authoring, not calibrated scan',
 boundary:[[.112,1.956],[.245,1.935],[.313,2.020],[.278,2.110],[.180,2.130],[.096,2.075]],
 crown:[[.150,2.004,.297],[.237,1.983,.2653],[.282,2.038,.239],[.250,2.089,.2442],[.182,2.105,.269],[.131,2.070,.2947]],
 crest:[.208,2.049,.269],
 inferiorReturn:{name:'scapular-inferior-return',class:'B',mirror:true,
  path:[[.148,1.984],[.238,1.964],[.294,2.022]],width:.026,regionWidth:.19,
  depthT:.010,maxDepth:.004,alpha:.5,floor:.20,walls:[.85,1.25],fade:.24,widthEnds:.65}
};
// R130: one attached diagonal lat facing region below the retained scapular
// return. Depth coordinates describe the sculpt surface, not recess relief.
MRMAH_MORPHOLOGY.back.sheets.lat.surfacePatch={
 name:'teres lat connected diagonal crown',source:'Craftsman p12 / P40 pp28–29; R129 final rest-XY support',
 sampleRegion:[.105,.340,1.69,2.005],upperLimit:[.24,1.941,.65],
 boundary:[[.125,1.740],[.215,1.720],[.310,1.860],[.310,1.940],[.244,1.918],[.130,1.900]],
 crown:[[.160,1.802,.26132],[.209,1.787,.27537],[.272,1.867,.28152],[.279,1.901,.27919],[.231,1.893,.26815],[.174,1.869,.25678]],
 crest:[.224,1.838,.275]
};
MRMAH_MORPHOLOGY.back.sheets.teres.attachment={
 source:'R131: P40 pp28–29 / Craftsman12; R130 actual lat edge loop and scapular inferior-floor path',
 range:[.168,.309],endFade:.023,
 lower:[[.168,1.883],[.231,1.905],[.279,1.913],[.309,1.960]],
 upper:[[.168,1.964],[.238,1.946],[.294,2.004],[.309,2.010]],
 face:[.231,1.928,.269],slope:[-.30,.08],walls:[.32,.28],limit:.030
};
// R127: hold the recorded B0 midline directions while adjacent stock changes.
// Interpolated smooth normals otherwise turn unchanged lower floor vertices.
Object.assign(MRMAH_RECESSES.torsoFront.find(c=>c.name==='linea-alba'),{
 thickness:0.5164339091314187,
 thicknessSource:'R126 incoming full opposing ray at channel middle; model units',
 referenceNormals:{"source":"R126-clay-928da1a2c956 incoming mesh linea-alba station normals; frozen rest-frame comparison","points":[[0,-0.0020356558806969532,-0.2700785331930077,0.9628361449454673],[0.041666666666666664,-0.002242397383800189,-0.17377829829362337,0.9847822473502179],[0.08333333333333333,-0.00242743282932015,-0.07568644799323847,0.9971287124338692],[0.125,-0.00228732074612268,-0.009773655138146915,0.9999496206454828],[0.16666666666666666,-0.0014402247140814976,-0.017382211847521974,0.9998478806618838],[0.20833333333333334,-0.0005930244110334355,-0.024989927854761514,0.9996875270942724],[0.25,-1.4851789958249148e-15,-0.04865725586274682,0.9988155342463928],[0.2916666666666667,-2.559503929406378e-16,-0.10971267490893243,0.993963343873569],[0.3333333333333333,2.806026398015924e-17,-0.29092680397004106,0.956745313409884],[0.375,1.0645665880642569e-16,-0.3676589976462103,0.9299606773674809],[0.4166666666666667,3.896761214281229e-16,-0.27715479615785354,0.9608252801455104],[0.4583333333333333,-9.652142728463805e-16,-0.0513757499641376,0.9986793941579161],[0.5,-7.279430308503043e-16,-0.12198539299021688,0.9925318956572742],[0.5416666666666666,-1.0545455309052094e-15,-0.16908532446965666,0.9856014169272438],[0.5833333333333334,-7.957322946210218e-16,-0.19231421467055665,0.9813334004484139],[0.625,-5.670081286432986e-16,-0.21737963348540978,0.9760871349145778],[0.6666666666666666,1.041761042486817e-15,-0.24584642373010832,0.9693087928720734],[0.7083333333333334,1.1258255611389915e-15,-0.2653057045270684,0.9641643444690309],[0.75,6.794211699120481e-16,-0.2567230446468283,0.966485011962039],[0.7916666666666666,0.00012048053623178459,-0.2202378891413084,0.9754461838927974],[0.8333333333333334,0.001325248032140491,-0.09991423745814586,0.9949951702751179],[0.875,0.0016802899354137952,0.022148578027718815,0.9997532781226991],[0.9166666666666666,0.0007314853481195936,0.014915507196208893,0.9998884900699003],[0.9583333333333334,-1.0978343278034034e-16,0.1019490120065735,0.9947896254740916],[1,3.9900736300441416e-16,0.2587924772590087,0.9659329447296772]]}
});
