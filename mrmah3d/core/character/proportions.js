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
  faceInset: 0.54,               /* plate size as a share of the diamond */
  bevelInset: 0.66,              /* bevel ring size */
  bevelZ: 0.62,                  /* bevel ring depth, share of halfDepth */
  faceZ: 0.44,                   /* plate depth — behind the bevel: the recess */
  backApexZ: -1.0,
  /* Depth scatter on the head's bevel ring, so its front facets tilt slightly
     differently and the head catches light in several places. */
  relief: 0.13
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
  rings: [
    { y: 0.000, w: 0.000, d: 0.000 },
    { y: 0.120, w: 0.064, d: 0.041, facet: 0.026, crystal: 0.02, crystalY: 0.004 },
    { y: 0.270, w: 0.122, d: 0.075, facet: -0.026, crystal: 0.04, crystalY: 0.010 },
    { y: 0.420, w: 0.180, d: 0.108, facet: 0.026, crystal: 0.055, crystalY: 0.014 },
    { y: 0.580, w: 0.235, d: 0.138, facet: -0.026, crystal: 0.065, crystalY: 0.018 },
    { y: 0.740, w: 0.284, d: 0.162, facet: 0.026, crystal: 0.072, crystalY: 0.020 },
    { y: 0.900, w: 0.330, d: 0.183, facet: -0.026, crystal: 0.076, crystalY: 0.022 },
    { y: 1.060, w: 0.374, d: 0.201, facet: 0.024, crystal: 0.078, crystalY: 0.022 },
    { y: 1.210, w: 0.410, d: 0.215, facet: -0.024, crystal: 0.078, crystalY: 0.022 },
    { y: 1.350, w: 0.444, d: 0.228, facet: 0.022, crystal: 0.074, crystalY: 0.020 },
    { y: 1.480, w: 0.474, d: 0.239, facet: -0.020, crystal: 0.066, crystalY: 0.018 },
    { y: 1.600, w: 0.498, d: 0.246, facet: 0.018, crystal: 0.056, crystalY: 0.014 },
    { y: 1.700, w: 0.518, d: 0.252, facet: -0.016, crystal: 0.044, crystalY: 0.010 },
    { y: 1.850, w: 0.548, d: 0.258, facet: 0.012, crystal: 0.026, crystalY: 0.005, dip: 0.055 },
    { y: 1.932, w: 0.557, d: 0.260, facet: 0.010, dip: 0.130 }
  ],
  /* Shoulder caps reach wider than the torso ring and carry the arm joints. */
  shoulderHalfWidth: 0.62,
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
    shoulder: [-0.544, 1.944, 0.02],   /* ref px (267, 645) */
    elbow: [-0.764, 1.541, 0.10],      /* ref px (185, 795) — the outer point */
    wrist: [-0.429, 0.979, 0.16],      /* ref px (310, 1005) */
    upperRadius: 0.094,
    foreRadius: 0.078,
    wristRadius: 0.060
  },
  left: {                         /* viewer's RIGHT — the raised arm */
    shoulder: [0.542, 1.936, 0.02],    /* ref px (672, 648) */
    elbow: [0.684, 1.354, 0.10],       /* ref px (725, 865) — the V's bottom */
    wrist: [0.911, 1.970, 0.14],       /* ref px (810, 635) */
    upperRadius: 0.094,
    foreRadius: 0.078,
    wristRadius: 0.060
  }
};

/* The hand is SMALL. From the reference the raised hand spans only about
   0.12 world units from wrist to fingertip; an earlier 0.24 pushed the hand
   up into the head's height band and made the silhouette 20% too wide there. */
export var HAND = {
  palmLength: 0.080,
  palmHalfWidth: 0.062,
  palmHalfDepth: 0.036,
  digitCount: 3,
  digitLength: 0.058,
  digitRadius: 0.020,
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
export var FLOAT = {
  height: 0.16,
  bobAmplitude: 0.030,
  bobPeriod: 4.2
};
