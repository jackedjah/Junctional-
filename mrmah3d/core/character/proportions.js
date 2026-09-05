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
function chestShape(k, erectorK, latK) {
  var ek = erectorK == null ? 0.100 : erectorK;
  var lk = latK == null ? 1.0 : latK;   /* R107: the lat is scaled on its own, not by the pec's k — the under-pec shelf ring (k 0.5) was pinching the lat too, a groove all round the torso */
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
    /* R95-BB: the valley softens a little (0.26 -> 0.21) and the pec crowns
       come forward (0.245 -> 0.28): the reference's pecs are thick SHELVES
       with a groove between them, not two swells either side of a slot. */
    /* R99: a deeper valley and a thicker shelf — the godform reference's pec
       is a mass with real front-to-back projection, and the sternum falls
       away between the two; the lats flare a little more under the arm. */
    var sternum = -lobe(a, 0, 0.22) * 0.380;   /* R103; R106; R107: a deep NARROW trench the bellies roll away from */
    var pec = (belly(a, 0.66, 0.46) + belly(a, -0.66, 0.46)) * 0.560;   /* R105; R106; R107: each pec a full BELLY that falls fast into the trench and the armpit */
    /* R97: the lats — the ribcage's side planes swell so the V reads from
       the front AND the back; the back itself is flattened, grooved down the
       spine and carries a pair of erector / lat planes either side of it. */
    var lat = (belly(a, Math.PI / 2 + 0.32, 0.56) + belly(a, -Math.PI / 2 - 0.32, 0.56)) * 0.320 * lk / Math.max(k, 1e-3);   /* R101: the lats flare wider; R102: further back and wider still — the rear reference's lat spread is wider than the front's */
    var back = lobe(a, Math.PI, 1.00) * -0.100;
    var spine = -lobe(a, Math.PI, 0.26) * 0.200;   /* R102; R107: a CHANNEL two vertices wide, deep enough to survive grayscale */
    var erector = (lobe(a, Math.PI - 0.42, 0.30) + lobe(a, -Math.PI + 0.42, 0.30)) * ek;   /* R102: 0.06 -> 0.10; R106: per ring — the TRAPEZIUS KITE descends the spine from the shoulder line and fades by the lower pec (back sheet) */
    /* R102: the pec / deltoid junction and the outer pec insertion — a groove at
       the armpit line so the pec ends in shadow against the shoulder */
    var insertion = -(lobe(a, 1.30, 0.28) + lobe(a, -1.30, 0.28)) * 0.140;   /* R103; R107: the pec's outer edge FALLS into the armpit so the dome ends */
    /* R106: the SCAPULAR planes — a pair of shallow masses between the
       spine channel and the rear deltoid (the torso sheet's back 3/4 reads
       rhomboid / teres planes there), with a channel between them and the
       erectors, so the upper back is structured and not one slab. */
    var scapula = (lobe(a, Math.PI - 0.80, 0.26) + lobe(a, -Math.PI + 0.80, 0.26)) * 0.120
                - (lobe(a, Math.PI - 0.58, 0.10) + lobe(a, -Math.PI + 0.58, 0.10)) * 0.055;   /* R106 back sheet: teres major / infraspinatus under the rear delt */
    return 1 + (sternum + pec + lat + back + spine + erector + insertion + scapula) * k;
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
function coreShape(k, rectusK, latK, latShift, erectorK) {
  var rk = rectusK == null ? 0.120 : rectusK;
  var lk = latK == null ? 0 : latK;
  var ls = latShift == null ? 0 : latShift;   /* R106: the lat's centre walks toward the spine as it descends — the back sheet's lat inserts diagonally into the lower back */
  var ek = erectorK == null ? 0.080 : erectorK;
  return function (a) {
    var linea = -lobe(a, 0, 0.22) * 0.360;   /* R100; R102; R106; R107: narrow and deep between the bellies */
    var rectus = (belly(a, 0.50, 0.38) + belly(a, -0.50, 0.38)) * rk;   /* R107: raised bellies with a rounded apex either side of the linea */
    var oblique = (lobe(a, 1.20, 0.48) + lobe(a, -1.20, 0.48)) * 0.080;
    var obliqueGroove = -(lobe(a, 0.98, 0.15) + lobe(a, -0.98, 0.15)) * 0.130 * (lk > 0 ? 1 : 0.5);   /* R102; R107: the valley between the block and the oblique */
    var lat = (belly(a, Math.PI / 2 + 0.22 + ls, 0.52) + belly(a, -Math.PI / 2 - 0.22 - ls, 0.52)) * lk;
    var serratus = (lobe(a, 1.02, 0.15) + lobe(a, -1.02, 0.15)) * 0.100 * Math.min(1, lk / 0.3);   /* R105; R107: a real tooth mass under the pec */
    var back = lobe(a, Math.PI, 0.95) * -0.085;
    var spine = -lobe(a, Math.PI, 0.26) * 0.170;   /* R102; R107: a channel */
    var erector = (lobe(a, Math.PI - 0.36, 0.28) + lobe(a, -Math.PI + 0.36, 0.28)) * ek;   /* R102: 0.045 -> 0.08; R106: per ring */
    return 1 + (linea + rectus + oblique + obliqueGroove + lat + serratus + back + spine + erector) * k;
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
    m += domePair(a, 1.45, 0.50) * vl;
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
    if (ae < headOuter) return { classes: REGIONS.ABS.classes, seed: 82 + row * 2 + side, index: row === 0 ? 0 : 1, coat: 0.40 };
    if (ae < sweepOuter) return { classes: REGIONS.TAPER_FLANK.classes, seed: 86 + row * 2 + side, index: row === 0 ? 1 : 2, coat: 1.0 };
    return null;
  };
}

/* R100 — THE GROOVE UNDER THE CLAVICLE. A ridge is only a ridge against a
   hollow beneath it: this ring sits between the upper pec and the shoulder
   line and pulls IN where the collar lobes above it stand out, so the
   clavicle reads as a bar across the top of the chest with shadow under it
   rather than as a widening of the pec. */
function subclavicleShape(k, trapK, pecK) {
  var tk = trapK == null ? 0 : trapK;
  var pk = pecK == null ? 0 : pecK;
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
    var traps = (lobe(a, Math.PI - 0.7, 0.60) + lobe(a, -Math.PI + 0.7, 0.60)) * tk;
    var pec = ((belly(a, 0.66, 0.46) + belly(a, -0.66, 0.46)) * 0.56 - lobe(a, 0, 0.22) * 0.38) * pk;   /* R107: the upper pec's tail */
    /* No back term: worked through at the back, a ring narrower than BOTH its
       neighbours is a groove, and the band above it faces down — the dark
       line under the trap cap in the rear clay view. The back's depth must
       be monotonic from the chest to the shoulder line. */
    return 1 + (hollow + notch + traps + pec) * k;
  };
}
function clavicleShape(k) {
  return function (a) {
    var hollow = -lobe(a, 0, 0.60) * 0.120;
    var collar = (lobe(a, 0.95, 0.50) + lobe(a, -0.95, 0.50)) * 0.130;
    /* R106: 0.72 -> 0.30. Worked through at the rear-side angle the
       shoulder-line ring stood 0.18 proud of the ring 0.02 below it and 0.04
       proud of the one above — a LEDGE, the flat lid the rear clay view
       showed, with a black slot under it. The trapezius is now a slope: the
       lobe grows from 0.17 on the groove ring through 0.30 here to the neck
       base's share, and the rings above narrow faster than they rise. */
    var traps = (lobe(a, Math.PI - 0.7, 0.60) + lobe(a, -Math.PI + 0.7, 0.60)) * 0.300;
    /* R97: a SHOULDER SHELF at the sides, so the torso's own line runs out
       under the deltoid cap and the cap grows out of the trapezius instead of
       sitting on it — the trap -> delt continuity the brief asks for. */
    var shelf = (lobe(a, Math.PI / 2, 0.50) + lobe(a, -Math.PI / 2, 0.50)) * 0.060;   /* R107: the shoulder corner sits INSIDE the deltoid dome; a shelf out to the crest was a flat plate above the caps from behind */
    return 1 + (hollow + collar + traps + shelf) * k;
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
    { y: 0.000, w: 0.006, d: 0.004, fg: [3, 2], columns: true, classesAt: taperClasses, coat: 0.55 },
    /* R106 — ONE GODFORM TEARDROP. Measured on the R106 godform plate (front
       figure, 905 px of height): waist 0.100 of height at t 0.435, the
       thigh / glute mass 0.22 at t 0.54, knee 0.128 at t 0.69, calf 0.135 at
       t 0.76, and from the calf a STRAIGHT cone to the point. The R104 lower
       body (hip 0.141, knee 0.072, calf 0.088) was a spike under a V; the
       reference's is a teardrop as wide as three quarters of the shoulders,
       converging bilateral masses on ONE body. The waist already matched, so
       every ring below it is re-widened against the waist and the rows
       between are set on the reference's own profile. */
    /* R108 — THE MALE LOWER BODY, from the point up (see thighShape /
       lowerLegShape). Targets in fractions of character height (H 2.94
       units; half-width in units = fraction x 1.47), set against the R106
       godform plate's SEQUENCE (waist -> restrained expansion -> lateral
       apex -> long descent -> knee -> calf -> long point) and the R108
       brief's male ratio, muscle-bust : waist about 1.5 : 1 where the R107
       build measured 2.06. The base ring `w` is pre-divided by the side
       multiplier (the VL belly is 0.885 of its amplitude at the side angle)
       so the silhouette lands on the target; the depth `d` is the ring's
       own and the RF / glute bellies add to it. */
    { y: 0.150, w: 0.028, d: 0.024, fg: [3, 2], facet: 0.0040, crystal: 0.0180, crystalY: 0.0040,
      columns: true, classesAt: taperClasses },
    { y: 0.300, w: 0.052, d: 0.046, fg: [3, 2], facet: -0.0020, crystal: 0.0140, crystalY: 0.0050, hero: 0.16,
      shape: lowerLegShape({ notch: 0.02, shins: 0.02, tendon: 0.04, hollow: 0.03 }), columns: true, classesAt: taperClasses },
    /* THE ACHILLES: an aggressive narrowing under the calf — 0.106 of height
       at the calf to 0.056 here, 0.13 of height lower — easing into the
       straight cone below; a narrow tendon on the back with hollows beside it. */
    { y: 0.440, w: 0.082, d: 0.072, fg: [3, 2], facet: 0.0020, zc: -0.004, crystal: 0.0140, crystalY: 0.0060, hero: 0.20,
      shape: lowerLegShape({ notch: 0.03, shins: 0.03, tendon: 0.06, hollow: 0.06, soleus: 0.04 }), columns: true, classesAt: taperClasses },
    /* THE SOLEUS: wider and lower than the gastrocnemius heads, so the calf's
       lower edge is a second, flatter swell rather than the end of a bulb;
       the medial head still carries 0.22 here so the belly falls away over
       two rings instead of cornering on one (the side view showed a beak). */
    { y: 0.550, w: 0.124, d: 0.126, fg: [3, 2], facet: -0.0020, zc: -0.010, crystal: 0.0150, crystalY: 0.0060, hero: 0.22,
      shape: lowerLegShape({ notch: 0.03, shins: 0.04, medial: 0.22, lateral: 0.06, cleft: 0.08, soleus: 0.14 }), columns: true, classesAt: taperClasses },
    /* THE GASTROCNEMIUS: the medial head peaks here (large, near the centre),
       the lateral head one ring higher (smaller, further out) — asymmetric
       within each half, symmetric across the body. In silhouette the calf
       is only 7% wider than the knee (the plate's is 5%); its identity is
       posterior depth, +30% on the medial head. */
    { y: 0.640, w: 0.157, d: 0.142, fg: [2, 2], facet: 0.0020, zc: -0.012, crystal: 0.0160, crystalY: 0.0070, hero: 0.26,
      shape: lowerLegShape({ notch: 0.03, shins: 0.04, medial: 0.30, lateral: 0.14, cleft: 0.10, soleus: 0.06 }), columns: true, classesAt: taperClasses },
    { y: 0.720, w: 0.152, d: 0.138, fg: [2, 2], facet: -0.0020, crystal: 0.0150, crystalY: 0.0060, hero: 0.16,
      shape: lowerLegShape({ notch: 0.03, shins: 0.04, medial: 0.22, lateral: 0.16, cleft: 0.06 }), columns: true, classesAt: taperClasses },
    /* THE KNEE: the compression between the thigh's long descent and the
       calf's swell — 0.099 of height, read in depth (the pit behind, the
       cavity term) more than in width. Its FRONT is not a notch: from the
       side the line from thigh to shin runs nearly straight over the
       patellae and the concavity is behind (the first cut notched the front
       too and the side view showed a corner). */
    { y: 0.810, w: 0.146, d: 0.144, fg: [2, 2], facet: 0.0020, zc: 0.008, crystal: 0.0130, crystalY: 0.0050, hero: 0.08,
      shape: lowerLegShape({ notch: 0.05, caps: 0.06, pit: 0.06, medial: 0.04, cleft: 0.04 }), columns: true, classesAt: taperClasses, cav: 0.35 },
    /* THE LOWER THIGH: the VL inserting toward the knee (0.24), the RF
       tendon fading (0.12) and the VASTUS MEDIALIS teardrop taking over
       medial and low (0.20) — the one belly that lives only here. The
       hamstrings end into the knee behind. */
    { y: 0.870, w: 0.148, d: 0.156, fg: [2, 3], facet: -0.0030, zc: 0.012, crystal: 0.0200, crystalY: 0.0070, hero: 0.18,
      shape: thighShape({ seam: 0.22, head: 0.04, vl: 0.28, valley: 0.06, vm: 0.28, itb: 0.04, ham: 0.20, hamCleft: 0.10 }), columns: true, classesAt: taperClasses },
    /* THE LONG DESCENT: from the apex the VL falls away (0.62 -> 0.40) while
       the RF holds its belly; the hamstring columns peak here under the fold. */
    { y: 0.950, w: 0.150, d: 0.176, fg: [2, 3], facet: 0.0040, zc: 0.008, crystal: 0.0300, crystalY: 0.0070, hero: 0.20,
      shape: thighShape({ seam: 0.25, head: 0.24, rf: 0.08, vl: 0.48, valley: 0.10, vm: 0.14, itb: 0.06, ham: 0.26, hamCleft: 0.12 }), columns: true, classesAt: taperClasses },
    /* THE GLUTEAL FOLD: the glute goes NEGATIVE here (a crease under the
       mass, darkened by the ring's cav where the multiplier is at or under
       1 — the front bellies sit above 1 and take none of it) and the
       hamstrings begin under it. */
    { y: 1.030, w: 0.151, d: 0.186, fg: [2, 2], facet: -0.0040, crystal: 0.0300, crystalY: 0.0070, hero: 0.14,
      shape: thighShape({ seam: 0.26, head: 0.30, rf: 0.10, vl: 0.60, valley: 0.12, vm: 0.04, itb: 0.06, glute: -0.05, gluteC: 0.52, gluteW: 0.42, ham: 0.08, hamCleft: 0.10 }), columns: true, classesAt: taperClasses, cav: 0.25 },
    /* THE LATERAL APEX: the VL's belly (0.62) makes the widest row — 0.162 of
       height, 1.50 x the belt — on a base ring no wider than the belt's. */
    { y: 1.100, w: 0.152, d: 0.192, fg: [2, 3], facet: 0.0045, zc: -0.012, crystal: 0.0360, crystalY: 0.0090, hero: 0.22,
      shape: thighShape({ seam: 0.26, head: 0.30, rf: 0.10, vl: 0.62, valley: 0.12, itb: 0.06, glute: 0.16, gluteC: 0.50, gluteW: 0.38, cleft: 0.30, ham: 0.05 }), columns: false, classesAt: null, zoneAt: quadZone(1), coat: 1.0 },
    /* The VL still rising here; the apex is one row down (round 5 moved it
       from 1.200 to 1.100 so the expansion out of the belt is RESTRAINED and
       the apex sits in the mid thigh, the brief's sequence). */
    { y: 1.200, w: 0.153, d: 0.196, fg: [2, 3], facet: -0.0045, zc: -0.024, crystal: 0.0360, crystalY: 0.0090, hero: 0.22,
      shape: thighShape({ seam: 0.26, head: 0.28, rf: 0.10, vl: 0.54, valley: 0.12, itb: 0.05, glute: 0.36, gluteC: 0.58, gluteW: 0.52, cleft: 0.48 }), columns: false, classesAt: null, zoneAt: quadZone(1), coat: 1.0 },
    /* THE GLUTE SHELF: the pair is fullest here, 35 degrees off the back with
       the cleft's centre vertex at half the ring, and the RF / VL are rising
       out of their origins under the belt. */
    { y: 1.320, w: 0.157, d: 0.186, fg: [2, 3], facet: 0.0045, zc: -0.032, crystal: 0.0360, crystalY: 0.0090, hero: 0.16,
      shape: thighShape({ seam: 0.20, head: 0.20, rf: 0.07, vl: 0.34, valley: 0.10, glute: 0.42, gluteC: 0.62, gluteW: 0.55, cleft: 0.50 }), zoneAt: quadZone(0) },
    /* THE UPPER GLUTE / GLUTE MEDIUS: a restrained expansion out of the belt
       (0.108 -> 0.133 of height in 0.07), the glute already a shelf behind
       and sitting LATERAL here — the upper shelf ties into the hip. */
    { y: 1.410, w: 0.160, d: 0.170, fg: [2, 3], facet: 0.0035, zc: -0.026, crystal: 0.0300, crystalY: 0.0080, hero: 0.10,
      shape: thighShape({ seam: 0.12, head: 0.12, rf: 0.03, vl: 0.18, valley: 0.06, glute: 0.30, gluteC: 0.70, gluteW: 0.50, cleft: 0.30 }), zoneAt: quadZone(0) },
    /* THE BELT — the waist. The deepest concavity on the character, and the
       line that separates the torso from the single quad. Re-measured on the
       lower-body crop it is TIGHTER than the abdomen above it (0.19 against
       0.24) and the quad swells to 0.264 within 0.3 below it — a 40% step,
       which is the single thing that makes the lower body read as a thigh
       hung from a belt rather than as a skirt continuing the torso. */
    { y: 1.480, w: 0.150, d: 0.132, fg: [1, 1], facet: -0.0070, crystal: 0.0300, crystalY: 0.0080,
      shape: coreShape(1.0, 0.06), hero: 0.04, zoneAt: coreZone(0), cav: 0.35 },   /* R102: the belt is a crease */
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
    { y: 1.545, w: 0.160, d: 0.144, fg: [2, 2], facet: 0.0040, crystal: 0.0220, crystalY: 0.0050,
      shape: coreShape(1.0, 0.26), hero: 0.08, zoneAt: coreZone(1) },   /* R106: bulge 0.24 against a 0.06 crease — in the clay view the 0.42 / -0.06 pairs were horizontal SLOTS, armour plating, not blocks */
    { y: 1.605, w: 0.188, d: 0.164, fg: [2, 2], facet: -0.0040, crystal: 0.0220, crystalY: 0.0050,
      shape: coreShape(1.0, 0.10, 0.04, 0.40, 0.08), hero: 0.03, zoneAt: coreZone(1), cav: 0.80 },   /* R102: abdominal crease */
    { y: 1.665, w: 0.246, d: 0.198, fg: [2, 2], facet: 0.0040, crystal: 0.0240, crystalY: 0.0050,
      shape: coreShape(0.95, 0.26, 0.26, 0.28, 0.09), hero: 0.08, zoneAt: coreZone(2) },
    { y: 1.725, w: 0.306, d: 0.232, fg: [2, 2], facet: -0.0040, crystal: 0.0240, crystalY: 0.0050,
      shape: coreShape(0.90, 0.10, 0.40, 0.14, 0.10), hero: 0.03, zoneAt: coreZone(2), cav: 0.80 },   /* R102: abdominal crease */
    { y: 1.780, w: 0.332, d: 0.250, fg: [2, 2], facet: 0.0040, crystal: 0.0260, crystalY: 0.0060,
      shape: coreShape(0.85, 0.26, 0.46, 0.0, 0.10), hero: 0.08, zoneAt: coreZone(3) },
    /* R97 — THE LOWER PEC TURN: a crease ring where the chest shelf ends and
       a belly ring above it, so the pectoral is a mass with a lower edge
       that falls into shadow rather than a plane that fades into the abs. */
    /* R99 — THE CHEST HAS DEPTH. The godform reference's pec is a thick shelf
       projecting toward the viewer; the chest rings' front-to-back radius
       rises about 9% while the width holds, the crease ring under the shelf
       comes in so the shelf overhangs it, and that ring takes its own dark
       zone (pecUnderZone). */
    { y: 1.830, w: 0.330, d: 0.262, fg: [2, 2], facet: -0.0040,   /* R107: not narrower than either neighbour — that was a groove all round */ crystal: 0.0300, crystalY: 0.0080,
      shape: chestShape(0.50, 0.11, 1.0), zoneAt: pecUnderZone, cav: 0.60 },   /* R106: d 0.236 -> 0.272, k 0.62 -> 0.74 — the shelf overhung its crease by 0.2 units and drew a black slot across the chest in clay */   /* R103: the under-pec crease pulls IN (d 0.252 -> 0.232) so the shelf overhangs it; the lat block is wider */   /* R102: 0.272 -> 0.282, the top of the lat block; the under-pec crease is a cavity */
    /* R103 — THE CHEST PROJECTS: the chest rings' front-to-back radius rises
       another 8% and the pec lobe with it, so the pectoral is a shelf that
       overhangs the crease ring under it. */
    { y: 1.895, w: 0.326, d: 0.306, fg: [3, 3], facet: 0.0035, crystal: 0.0320, crystalY: 0.0080,
      shape: chestShape(0.94, 0.13, 1.0), hero: 0.30, zoneAt: pecZone(0) },
    /* R106 — THE PEC IS A DOME: a crown ring between two shoulder rings, so
       the mass rounds over in the vertical as well as across. Three bands
       over 0.22 units made a hexagonal profile that the clay view read as a
       flat plate with a slot beneath it. */
    { y: 1.935, w: 0.336, d: 0.318, fg: [3, 3], facet: -0.0030, crystal: 0.0340, crystalY: 0.0080,
      shape: chestShape(1.0, 0.15, 0.90), hero: 0.34, zoneAt: pecZone(0) },
    /* the pectoral line — the strongest cross-section shaping on the body */
    { y: 1.970, w: 0.338, d: 0.322, fg: [3, 3], facet: 0.0035, crystal: 0.0340, crystalY: 0.0080,
      shape: chestShape(0.92, 0.18, 0.78), hero: 0.34, zoneAt: pecZone(0) },
    /* R103 — THE SHOULDER GIRDLE SITS 0.05 LOWER. The trap could only slope
       at 22 degrees from a shoulder line at 2.170 to a neck base at 2.215;
       the references' traps climb at about 40 degrees into a visible neck,
       and the deltoid cap stood ABOVE that shallow slope as a bump. With the
       shoulder line at 2.120 the slope is 41 degrees, the cap's crest meets
       it, and the neck is embedded in a rising upper torso. The head does
       not move. */
    { y: 2.050, w: 0.330, d: 0.300, fg: [2, 2], facet: -0.0035, crystal: 0.0300, crystalY: 0.0060,
      shape: chestShape(0.70, 0.44, 0.45), hero: 0.40, zoneAt: pecZone(1) },   /* R107: the pec FADES up into the clavicle (0.52 -> 0.70 here, 0.35 on the groove ring) instead of stepping off — the step was a horizontal band above the chest */   /* R105: the upper pec ROUNDS OFF toward the clavicle (0.80 -> 0.62) instead of running flat into it */
    /* R100 — the groove under the clavicle (subclavicleShape): its own dark,
       uncoated zone, so the collarbone above it reads as a bar with shadow
       beneath. */
    { y: 2.100, w: 0.316, d: 0.285, fg: [2, 2], facet: 0.0035, crystal: 0.0200, crystalY: 0.0040,
      shape: subclavicleShape(1.0, 0.17, 0.35), hero: 0.20, zoneAt: pecZone(1), coat: 0.55 },   /* R106: d 0.250 -> 0.300, the slot under the collarbone closes to a hollow */
    /* THE SHOULDER LINE — collarbones across the front, trapezius behind.
       R100: the thin band just under it is the groove's dark zone, so the
       collarbone reads as a bar with a hairline of shadow beneath — not a
       stripe across the chest. */
    { y: 2.120, w: 0.300, d: 0.270, fg: [2, 2], facet: 0.0035, crystal: 0.0340, crystalY: 0.0060,
      shape: clavicleShape(1.0), dip: 0.030, hero: 0.32, zoneAt: subclavicleZone, coat: 0.30 },   /* R99: the shelf blew white; the godform reference's clavicle is dark under a lit shoulder */
    /* R100 — THE TRAPEZIUS RING: between the shoulder line and the neck's
       base, so the traps rise diagonally toward the neck across two bands
       instead of one steep step, with the trap lobes at full strength.
       R103: halfway up the 41-degree slope. */
    { y: 2.172, w: 0.258, d: 0.220, fg: [2, 2], facet: -0.0040, crystal: 0.0260, crystalY: 0.0050,
      shape: clavicleShape(0.85), hero: 0.04, zoneAt: trapZone, coat: 0.12 },   /* R106: narrower — the width falls faster than the height rises, so the band tilts toward the neck */   /* R101: deeper behind, the upper back's thickness */   /* a slope, not a shelf: first cut at 2.190 / 0.282 drew a flat ledge */
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
    { y: 2.228, w: 0.165, d: 0.130, fg: [1, 1], facet: -0.0120, crystal: 0.024, crystalY: 0.0050, coat: 0.15,
      shape: clavicleShape(0.55), hero: 0.08, classesAt: neckClasses },   /* R106: 2.215 / 0.225 -> 2.228 / 0.190 — the plate's head sits DOWN on the traps; the base rises toward the head's corner and narrows so the collar under the head is a slope, not a lid */
    /* The column's rings follow the head's lower vertex (2.324 now): the top
       ring sits 0.09 above it where the head is 0.10 wide and swallows it, and
       the visible neck from trapezius to chin is 0.12 — the reference's. */
    /* R101 — the square head's bottom corner is at 2.268 and the column
       rises past it: the diamond's point sits down INTO the neck, which is
       how the sheet reference seats it — a collar the head plunges into,
       not a stick the head balances on. The column closes at 2.380, inside
       the diamond (0.11 wide there). */
    { y: 2.250, w: 0.135, d: 0.110, fg: [1, 1], facet: 0.0120, crystal: 0.018, crystalY: 0.0040,
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
    shoulder: [-0.498, 1.957, 0.014],   /* R104: on the cap's axis at 0.7; R107: the axis moved up and in with the smaller dome */
    elbow: [-0.585, 1.455, 0.10],   /* R103: the reference's lowered arm hangs STRAIGHT and close — elbow in, shorter */
    wrist: [-0.610, 1.105, 0.14],
    upperRadius: 0.150,   /* R103: 0.160 -> 0.150, the arm was as wide as the lat at the elbow */
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
    shoulder: [0.498, 1.957, 0.014],
    elbow: [0.565, 1.465, 0.11],
    wrist: [0.720, 1.860, 0.15],
    upperRadius: 0.150,   /* R103: 0.160 -> 0.150, the arm was as wide as the lat at the elbow */
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
      return 0.90 + Math.pow(Math.sin(Math.pow(t, 0.85) * Math.PI), 1.3) * 0.18 - t * 0.10;   /* R105; R107: a modest belly in the PROFILE — the bicep lobe makes the peak; at 0.34 the two compounded into a ball under the dome */
    },
    /* Picks up close to where the upper arm ended — a step at the elbow reads
       as an error rather than as a joint — then swells just below it and tapers
       to a narrow wrist. */
    /* R98: the extensor swell sits high, just under the elbow, and the taper
       to the wrist is steeper — an anatomical forearm, not a stick. */
    fore: function (t) {
      return 0.86 + Math.sin(Math.pow(t, 0.55) * Math.PI) * 0.30 - t * 0.24;   /* R100; R107: moderate at the elbow, a real belly, a narrow wrist */
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
    upper: function (t, d, inner) {
      var belly = Math.pow(Math.sin(Math.pow(t, 0.82) * Math.PI), 1.6);   /* R105: a PEAK, not a broad swell — the bicep is a belly under tension */
      var rear = Math.pow(Math.sin(Math.pow(t, 1.30) * Math.PI), 1.4);
      var outer = -(inner || 1);
      /* R97: BELLIES, not bulges. The bicep peaks at a third of the way
         down at nearly a third of the radius, the tricep — broader, lower —
         at a quarter, and the groove between them deepens so the two masses
         read as two from the side and trade dominance as the arm turns. */
      /* R100: a CREST, not a bulge — the bicep's lobe narrows (0.80 -> 0.62)
         and rises (0.32 -> 0.36) so it peaks along a line; the tricep keeps
         its long-head fullness and gains a LATERAL-HEAD ridge on the outer
         arm, the horseshoe's outer arm converging toward the elbow. */
      var bicep = bump(d, 0, 0.58) * 0.420 * belly;   /* R101; R106; R107: a PEAK on the front of a cylinder, not a ball */
      /* R107 — THE HORSESHOE: a long head on the inner rear, a lateral head on
         the outer rear, and a valley between them that opens toward the elbow
         where the tendon runs; the arm rear crop showed one smooth column. */
      var tricep = bump(d, Math.PI + (inner || 1) * 0.30, 0.55) * 0.400 * rear;
      var lateralHead = bump(d, outer * (Math.PI - 0.70), 0.42) * 0.300 * Math.sin(Math.pow(t, 1.1) * Math.PI);   /* R101; R106; R107: the lateral head is the horseshoe's outer arm, a sweep of its own */
      /* the groove between them, down each side of the arm */
      /* R98: the groove is deepest through the upper half, and in the lower
         half a BRACHIALIS lobe fills it either side — the lateral mass that
         sits between bicep and tricep just above the elbow, which is what
         gives the outer upper arm its second contour. */
      var low = Math.max(0, Math.min(1, (t - 0.45) / 0.35));
      low = low * low * (3 - 2 * low);
      /* (declared after `low`: an earlier placement read it before assignment and
         every upper-arm vertex came out NaN — the arm vanished and the clay
         crops were judged on a deltoid and a forearm with nothing between.) */
      var triValley = -bump(d, Math.PI - (inner || 1) * 0.15, 0.20) * 0.140 * low;
      var sides = bump(d, Math.PI / 2, 0.42) + bump(d, -Math.PI / 2, 0.42);
      var groove = -(bump(d, Math.PI / 2, 0.30) + bump(d, -Math.PI / 2, 0.30)) * 0.300 * belly * (1 - low);   /* R106: 0.22; R107: a NARROW valley (0.42 -> 0.30 wide) at 0.30 — the biceps / triceps interlock, not a flute */   /* R99: a deeper valley between the two; R100: deeper again; R101; R102: 0.16 -> 0.20, the biceps/triceps boundary is a cut */
      var brachialis = (bump(d, outer * (Math.PI / 2 - 0.15), 0.36) * 1.0 + bump(d, -outer * (Math.PI / 2 - 0.15), 0.36) * 0.5) * 0.280 * low * Math.sin(Math.min(1, t / 0.92) * Math.PI);   /* R107: the brachialis is a WEDGE on the outer lower arm, half as much inside */   /* R101: visible between bicep and tricep above the elbow */
      /* R102: the DELTOID INSERTION — a valley across the top of the arm
         under the cap, so the shoulder is separated from the arm by a
         change of depth (the brief's "visible insertion under the delt
         cap"), and ELBOW COMPRESSION — the arm narrows into the joint on the
         front where the biceps' tendon runs. */
      var insertion = -(0.12 + 0.16 * bump(d, 0, 0.55)) * (1 - Math.min(1, t / 0.24)) * (1 - Math.min(1, t / 0.24));   /* R105; R107: the CAP -> UNDERCUT -> ARM step */
      var elbow = -bump(d, 0, 0.60) * 0.130 * Math.pow(Math.max(0, (t - 0.80) / 0.20), 2);
      return 1 + bicep + tricep + triValley + lateralHead + groove + brachialis + insertion + elbow;
    },
    fore: function (t, d, inner) {
      var swell = Math.sin(Math.pow(t, 0.58) * Math.PI);
      var outer = -(inner || 1);
      /* Flexor mass sits front-and-inboard, extensor mass rear-and-outboard —
         offset from dead front and dead back, which is what stops the forearm
         reading as a smaller copy of the upper arm. */
      /* R98: fuller extensor group high on the outer forearm, flexors
         inboard, and a shallow groove between them down the ulna so the two
         groups read as two under the coat. */
      var flexor = bump(d, 0.45, 0.75) * 0.340 * swell;
      var extensor = bump(d, Math.PI - 0.55, 0.85) * 0.380 * Math.pow(Math.sin(Math.pow(t, 0.45) * Math.PI), 1.4);
      var ulna = bump(d, -Math.PI / 2 - 0.2, 0.40) * -0.070 * swell;
      /* R100: the RADIAL ridge — the brachioradialis running down the outer
         forearm from the elbow, fullest in the upper third and fading to
         the wrist, which is what gives the forearm its direction. */
      /* R101: the BRACHIORADIALIS — starts at the lateral elbow, fullest in the upper third, fading to the wrist */
      var radial = bump(d, outer * 0.95, 0.40) * 0.300 * Math.sin(Math.min(1, t / 0.78) * Math.PI) * (1 - t * 0.35);   /* R107: the BRACHIORADIALIS is an obvious ridge */
      /* R102: the FLEXOR / EXTENSOR CHANNEL — a groove between the two groups
         on the inner side, and the WRIST TENDONS: the forearm flattens toward
         the wrist on the front so the flexor tendons read as a narrowing */
      var channel = -bump(d, -outer * 0.95, 0.26) * 0.200 * swell;
      var wrist = -bump(d, 0.20, 0.55) * 0.150 * Math.pow(Math.max(0, (t - 0.72) / 0.28), 2);
      return 1 + flexor + extensor + ulna + radial + channel + wrist;
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
