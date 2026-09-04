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
  halfWidth: 0.327 * H / 2,      /* 0.4905 */
  halfHeight: 0.343 * H / 2,     /* 0.5145 */
  centreY: (1 - 0.172) * H,      /* 2.484 — the widest row */
  /* Real front-to-back depth. The head is a beveled crystal, not a plate. */
  halfDepth: 0.115 * H,          /* 0.345 */
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
  faceInset: 0.55,               /* plate size as a share of the diamond */
  crownInset: 0.88,              /* outer crown band — narrower now */
  crownZ: 0.40,                  /* crown band depth, share of halfDepth */
  bevelInset: 0.720,             /* the lip, at the front of the crystal */
  bevelZ: 0.78,                  /* the lip stands proud */
  innerInset: 0.620,             /* inner bevel, framing the cavity */
  innerZ: 0.30,                  /* set well behind the lip */
  faceZ: -0.06,                  /* plate depth — behind the girdle plane */
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
  classLift: 0.26
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
export var TORSO = {
  topY: (1 - 0.356) * H,         /* 1.932 */
  sides: 12,
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
     the whole difference between it and the rim shell it replaces. */
  classLift: 0.30,
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
    { y: 0.000, w: 0.006, d: 0.004 },
    { y: 0.230, w: 0.104, d: 0.065, facet: 0.0121, crystal: 0.0525, crystalY: 0.0120 },
    { y: 0.520, w: 0.213, d: 0.126, facet: -0.0121, crystal: 0.0840, crystalY: 0.0210 },
    { y: 0.810, w: 0.305, d: 0.171, facet: 0.0110, crystal: 0.0980, crystalY: 0.0240 },
    /* THE CHEST FLARE.

       The taper from tip to shoulder used to be very nearly a straight line, so
       the torso read as exactly what it was — a cone with facets on it. A cone
       has no upper-body PRESENCE: nothing about its profile says chest.

       The waist is now drawn in slightly and the chest carried out, so the
       outline swells through the upper third before the shoulder line. It is a
       small move — under 4% at its widest — because the silhouette against the
       reference is already right and this is about giving the eye a curve to
       read rather than about size. Crystal relief rises through the same rings,
       so the flare arrives with the largest and most varied hero facets on the
       body rather than as a smooth bulge.

       Relief is deliberately NOT raised along with the width. Pushing both at
       once was tried and the chest came back as a smooth pale swell: past about
       18% of the ring radius the displacement stops reading as facets and
       starts rounding the profile, which is the exact opposite of what a flare
       is for. The width gives the curve; the existing relief keeps the planes
       that sit on it. */
    { y: 1.090, w: 0.371, d: 0.200, facet: -0.0110, crystal: 0.1015, crystalY: 0.0240 },
    { y: 1.350, w: 0.440, d: 0.226, facet: 0.0099, crystal: 0.0930, crystalY: 0.0225 },
    { y: 1.580, w: 0.504, d: 0.250, facet: -0.0088, crystal: 0.0830, crystalY: 0.0185 },
    { y: 1.760, w: 0.546, d: 0.262, facet: 0.0077, crystal: 0.0640, crystalY: 0.0130 },
    { y: 1.880, w: 0.570, d: 0.267, facet: -0.0055, crystal: 0.0470, crystalY: 0.0085, dip: 0.052 },
    { y: 1.932, w: 0.576, d: 0.268, facet: 0.0055, dip: 0.038 },
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
    { y: 1.985, w: 0.470, d: 0.232, facet: -0.0195, crystal: 0.072, crystalY: 0.016 },
    { y: 2.035, w: 0.360, d: 0.190, facet: 0.0175, crystal: 0.062, crystalY: 0.013 },
    { y: 2.080, w: 0.250, d: 0.140, facet: -0.0140, crystal: 0.044, crystalY: 0.009 },
    { y: 2.115, w: 0.150, d: 0.095, facet: 0.0090 }
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
  shoulderHalfWidth: 0.734,
  shoulderY: 1.900
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
    elbow: [-0.628, 1.318, 0.10],
    wrist: [-0.470, 0.902, 0.16],
    upperRadius: 0.112,
    foreRadius: 0.086,
    wristRadius: 0.060
  },
  left: {                         /* viewer's RIGHT — the raised arm */
    shoulder: [0.596, 1.872, 0.02],
    elbow: [0.678, 1.330, 0.10],
    wrist: [0.812, 1.982, 0.14],
    upperRadius: 0.112,
    foreRadius: 0.086,
    wristRadius: 0.060
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
  classLift: 0.34,

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
  palmLength: 0.098,
  palmHalfWidth: 0.079,
  palmHalfDepth: 0.044,
  digitCount: 3,
  digitLength: 0.070,
  digitRadius: 0.024,
  /* The small bright diamond above the reference's raised hand. */
  tipDiamond: 0.044
};

/* Chest insignia, measured at reference y 735 (emblem) and y 820 (symbols). */
export var INSIGNIA = {
  emblemY: (1 - (735 - 251) / 1119) * H,     /* 1.702 */
  emblemHalf: 0.074,
  symbolsY: (1 - (820 - 251) / 1119) * H,    /* 1.474 */
  symbolHalf: 0.038,
  symbolSpacing: 0.115
};

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
export var FLOAT = {
  height: 0.17,
  bobAmplitude: 0.016,
  bobPeriod: 6.4
};
