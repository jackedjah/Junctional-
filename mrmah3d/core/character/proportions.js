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
  faceInset: 0.54,               /* plate size as a share of the diamond */
  crownInset: 0.84,              /* intermediate crown band */
  crownZ: 0.36,                  /* crown band depth, share of halfDepth */
  bevelInset: 0.665,             /* table edge / recess lip */
  bevelZ: 0.72,                  /* bevel ring depth, share of halfDepth */
  /* Dropped from 0.44 to 0.17. The recess wall is the difference between the
     lip and the plate, and at 0.62 vs 0.44 it was only 0.06 units deep — barely
     a step, so the face read as painted just behind the surface rather than set
     down inside the crystal. It is now 0.19 deep, better than three times as
     much, which is what gives the shell visible thickness and puts the eyes and
     smile properly inside the stone. */
  faceZ: 0.17,                   /* plate depth — well behind the lip */
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
  relief: 0.095
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
    { y: 1.090, w: 0.381, d: 0.204, facet: -0.0110, crystal: 0.1015, crystalY: 0.0240 },
    { y: 1.350, w: 0.444, d: 0.228, facet: 0.0099, crystal: 0.0945, crystalY: 0.0225 },
    { y: 1.580, w: 0.494, d: 0.245, facet: -0.0088, crystal: 0.0805, crystalY: 0.0180 },
    { y: 1.760, w: 0.529, d: 0.255, facet: 0.0077, crystal: 0.0595, crystalY: 0.0120 },
    { y: 1.880, w: 0.551, d: 0.259, facet: -0.0055, crystal: 0.0350, crystalY: 0.0060, dip: 0.040 },
    { y: 1.932, w: 0.557, d: 0.260, facet: 0.0055, dip: 0.030 },
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
    { y: 1.985, w: 0.470, d: 0.232, facet: -0.0088, crystal: 0.038, crystalY: 0.008 },
    { y: 2.035, w: 0.360, d: 0.190, facet: 0.0077, crystal: 0.034, crystalY: 0.007 },
    { y: 2.080, w: 0.250, d: 0.140, facet: -0.0066, crystal: 0.026, crystalY: 0.005 },
    { y: 2.115, w: 0.150, d: 0.095, facet: 0.0055 }
  ],
  /* Shoulder caps reach wider than the torso ring and carry the arm joints. */
  /* Widened. Against the canonical reference the render measured 9.3% narrow
     across the shoulders, and the refined reference is broader still — the
     brief asks explicitly for stronger shoulder-cap presence and a deltoid-like
     silhouette. This is the single value that controls how heroic he reads. */
  /* The deltoid no longer reads this — its extent comes from the arm joint plus
     its own end radius (see body.js) — but the shoulder line is still measured
     against it, so it is kept as the stated target the two should agree on. */
  shoulderHalfWidth: 0.870,
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
    shoulder: [-0.698, 1.900, 0.02],
    /* Brought under the shoulder. With the joint moved outboard, the old elbow
       at 0.764 made the upper arm angle further OUT before the forearm cut back
       in — a chicken wing. Reference A hangs the upper arm almost vertically
       from the outer shoulder and lets only the forearm angle inward to the
       hip, which is both calmer and stronger. */
    elbow: [-0.702, 1.318, 0.10],
    wrist: [-0.470, 0.902, 0.16],
    upperRadius: 0.112,
    foreRadius: 0.086,
    wristRadius: 0.060
  },
  left: {                         /* viewer's RIGHT — the raised arm */
    shoulder: [0.696, 1.894, 0.02],
    elbow: [0.758, 1.330, 0.10],
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
  profiles: {
    /* Peaks at t=0.34 — the belly of the upper arm — then draws into the
       elbow, which is the narrowest point of the whole limb. */
    upper: function (t) {
      return 1 + Math.sin(Math.pow(t, 0.78) * Math.PI) * 0.22 - t * 0.10;
    },
    /* Peaks earlier and less: a forearm is fullest right below the elbow. */
    fore: function (t) {
      return 1 + Math.sin(Math.pow(t, 0.62) * Math.PI) * 0.13 - t * 0.06;
    }
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
