/* MR.MAH 3D :: REGIONS
   Per-region art direction for the crystal's optical classes.

   R94. Until now every part of the character drew its facets from ONE class
   table (`FACET_CLASSES` in forge.js), steered only by a scalar `lift` that
   slid the whole lottery away from the black end. That is a single dial, and a
   single dial cannot express what the luminous references actually do: the
   head is a light, clear ice crystal with a few deep facets among it; the neck
   is steel-blue; the pectorals are sapphire with a darker sternum between
   them; the taper is dark down its spine and lit at its flanks. Those are
   DIFFERENT distributions, not the same distribution shifted.

   So each region names its own table here. A table is a list of
     [ weight, roughness offset, metalness offset, darkness, tint ]
   in the same units forge.js already uses (see the long note above
   FACET_CLASSES there), accumulated from the darkest entry upward, and a
   region's `lift` still slides within its own table so the hero ramps in
   `segment()` keep working across a seam.

   These are the controls the director tunes. Nothing here is geometry. */

/* Darkness > 0 swallows the facet's value toward the deep interior colour;
   darkness < 0 is EXTRA albedo (the silver catch). Tint is how much of the
   crystal's own hue the facet keeps against neutral. */

var BODY = [
  [0.20,   0.14,  -0.20,   0.78,  0.00],   /* black     — lost planes, punctuation */
  [0.16,   0.08,  -0.12,   0.50,  0.06],   /* navy      — the deep body */
  [0.36,   0.05,  -0.02,   0.28,  0.18],   /* sapphire  — the default */
  [0.17,   0.02,   0.06,   0.12,  0.34],   /* lit sapphire */
  [0.04,  -0.02,   0.14,  -0.02,  0.62],   /* steel */
  [0.04,  -0.04,   0.18,  -0.14,  1.00],   /* cyan */
  [0.03,  -0.06,   0.34,  -0.82,  0.20]    /* silver    — rare, and hot for it */
];

/* THE HEAD IS ICE, NOT SAPPHIRE.

   Cropped side by side, the reference shell is pale — steel-white and
   sky-blue planes over most of its frame, deep blue on perhaps a sixth of it,
   and no black at all — while this build's shell was near-black with one
   blown bevel. A lift on the body table cannot get there: at any lift that
   removes the black it also removes the deep facets, and the head reads as a
   flat pale frame. Its own table keeps a deep-blue minority AND a pale
   majority, which is the distribution the crop shows. */
/* MEASURED, NOT IMPRESSED. A first cut of this table was authored from the
   impression that the reference head is "pale ice", and it produced a shell
   with 21% of its pixels above 160 luma. Histogrammed over a diamond-ring mask
   (the shell without its cavity) the reference head is 52% below 32, 23% in
   32-63, 12% in 64-95, 7% in 96-127 and under 4% above 160 — a DARK crystal
   with a smoothly graded middle and thin bright edges, lighter than the body
   only in that its middle is populated. The pale read comes from its edge
   lines and its few catches, not from its planes. So: a dark majority, a real
   middle, almost no silver. */
var HEAD_SHELL = [
  [0.24,   0.06,  -0.06,   0.58,  0.28],   /* deep blue  — the dark facets */
  [0.26,   0.04,   0.00,   0.34,  0.30],   /* sapphire */
  [0.24,   0.02,   0.04,   0.12,  0.36],   /* pale sapphire — the middle */
  [0.16,   0.00,   0.10,  -0.06,  0.50],   /* steel */
  [0.08,  -0.02,   0.16,  -0.26,  0.34],   /* ice */
  [0.02,  -0.05,   0.28,  -0.55,  0.16]    /* silver — one or two facets */
];

/* Steel-blue, with a dark minority and no silver: the neck sits in the chin's
   shadow and reads as a machined column, brighter than the chest below it and
   much darker than the ice head above. */
var NECK = [
  [0.14,   0.10,  -0.12,   0.62,  0.06],
  [0.26,   0.06,  -0.04,   0.36,  0.16],
  [0.36,   0.03,   0.04,   0.14,  0.30],
  [0.18,   0.00,   0.12,  -0.06,  0.50],
  [0.06,  -0.03,   0.18,  -0.30,  0.55]
];

/* THE LOWER TAPER — dark spear, sapphire flanks, bright rails.

   Its facets are assigned by COLUMN (see `columnClasses` in forge.js), so a
   vertical strip of the cone shares one class all the way to the tip and reads
   as one long plane. The front columns take the dark entries, the flank
   columns the lit sapphire, and the internal light in the shader does the rest. */
var TAPER_SPEAR = [
  [0.58,   0.10,  -0.16,   0.84,  0.08],   /* the dark spear — steel-black */
  [0.30,   0.06,  -0.08,   0.58,  0.16],
  [0.12,   0.03,   0.02,   0.30,  0.30]
];
var TAPER_FLANK = [
  [0.14,   0.06,  -0.06,   0.56,  0.18],   /* a dark long facet among the lit ones */
  [0.28,   0.04,  -0.02,   0.30,  0.40],   /* sapphire */
  [0.32,   0.02,   0.06,   0.10,  0.62],   /* lit sapphire */
  [0.18,   0.00,   0.12,  -0.20,  0.80],   /* bright blue */
  [0.08,  -0.04,   0.22,  -0.60,  0.45]    /* the occasional internal catch */
];

/* THE CHEST AND CORE, AS PLANES (brief §15-20).

   Cropped, both luminous references build the torso from a few LARGE planes:
   each pectoral is two or three facets — an upper plane that catches steel
   white from above and a lower sapphire one — with a dark sternum channel
   between them; the abdomen is three pairs of blocks either side of a dark
   central channel, with diagonal oblique planes outboard. These tables are
   drawn by ZONE (see `zoneAt` in forge.js), so every triangle in a zone shares
   one class and reads as one plane. */
/* No albedo-boost classes on a zoned plane: a whole zone drawn as "ice" is a
   bright rectangle whatever the light is doing, which is a sticker. The pec's
   catches must come from its NORMAL meeting the key and the cards, so the
   table stops at steel and lets the lighting decide which plane is lit. */
var PEC_UPPER = [
  [0.14,   0.04,   0.00,   0.34,  0.30],
  [0.40,   0.02,   0.06,   0.12,  0.44],   /* sapphire */
  [0.46,   0.00,   0.12,   0.00,  0.58]    /* steel-blue */
];
var PEC_LOWER = [
  [0.22,   0.06,  -0.06,   0.52,  0.20],
  [0.40,   0.04,   0.00,   0.30,  0.34],   /* sapphire */
  [0.28,   0.02,   0.06,   0.08,  0.48],
  [0.10,   0.00,   0.12,  -0.14,  0.60]
];
var STERNUM = [
  [0.50,   0.10,  -0.14,   0.82,  0.08],   /* the channel — near-black */
  [0.35,   0.06,  -0.08,   0.62,  0.14],
  [0.15,   0.03,   0.00,   0.40,  0.24]
];
var ABS = [
  [0.18,   0.06,  -0.06,   0.56,  0.18],
  [0.36,   0.04,   0.00,   0.34,  0.30],   /* sapphire */
  [0.30,   0.02,   0.06,   0.14,  0.42],
  [0.12,   0.00,   0.12,  -0.10,  0.56],   /* steel */
  [0.04,  -0.04,   0.26,  -0.55,  0.24]
];
var OBLIQUE = [
  [0.26,   0.08,  -0.10,   0.66,  0.14],
  [0.40,   0.05,  -0.04,   0.42,  0.24],
  [0.26,   0.02,   0.04,   0.20,  0.36],
  [0.08,   0.00,   0.12,  -0.10,  0.52]
];

/* DELTOIDS — the brightest planes on the body after the head's catches. In
   both luminous references the shoulder domes are lit sapphire and steel with
   a bright crest, and they are made of a HANDFUL of planes: no black facets,
   because a dark facet on a dome reads as a hole in it. */
var DELT = [
  [0.12,   0.06,  -0.06,   0.42,  0.22],
  [0.30,   0.04,   0.00,   0.22,  0.36],   /* sapphire */
  [0.30,   0.02,   0.06,   0.04,  0.58],   /* lit sapphire */
  [0.18,   0.00,   0.12,  -0.12,  0.66],   /* steel-blue */
  [0.08,  -0.03,   0.20,  -0.42,  0.40],   /* ice crest */
  [0.02,  -0.05,   0.30,  -0.70,  0.18]    /* silver */
];

/* UPPER ARM — sapphire with a dark tricep side; FOREARM — steel segments with
   more silver, the reference's forearms read as machined; HAND — dark steel,
   small, with one or two catches so it reads solid rather than as a cage. */
/* NOTE: the limbs draw with a lift ramp of 0.34-0.44 (see limbs.js), so the
   bottom third of these tables is never reached; reweighting the darkest
   entries measured as an exact no-op on the arm histogram. The arms' value is
   set by what they reflect and by the deep colour, not by these rows. */
var UPPER_ARM = [
  [0.14,   0.08,  -0.10,   0.56,  0.14],
  [0.24,   0.05,  -0.04,   0.34,  0.24],
  [0.32,   0.03,   0.02,   0.14,  0.40],
  [0.18,   0.01,   0.08,  -0.04,  0.60],
  [0.08,  -0.02,   0.16,  -0.24,  0.70],
  [0.04,  -0.05,   0.30,  -0.66,  0.22]
];
var FOREARM = [
  [0.12,   0.08,  -0.10,   0.52,  0.12],
  [0.22,   0.05,  -0.02,   0.30,  0.22],
  [0.28,   0.02,   0.06,   0.10,  0.38],
  [0.22,   0.00,   0.14,  -0.10,  0.58],   /* steel */
  [0.10,  -0.02,   0.20,  -0.32,  0.50],
  [0.06,  -0.05,   0.32,  -0.70,  0.20]    /* silver */
];
var HAND = [
  [0.18,   0.08,  -0.08,   0.52,  0.12],
  [0.30,   0.05,   0.00,   0.30,  0.24],
  [0.30,   0.02,   0.08,   0.10,  0.40],
  [0.16,   0.00,   0.14,  -0.10,  0.56],
  [0.06,  -0.04,   0.28,  -0.60,  0.24]
];

export var REGIONS = {
  BODY:        { classes: BODY,       lift: 0.06 },
  HEAD_SHELL:  { classes: HEAD_SHELL, lift: 0.00 },
  NECK:        { classes: NECK,       lift: 0.00 },
  TAPER_SPEAR: { classes: TAPER_SPEAR, lift: 0.00 },
  TAPER_FLANK: { classes: TAPER_FLANK, lift: 0.00 },
  PEC_UPPER:   { classes: PEC_UPPER,  lift: 0.00 },
  PEC_LOWER:   { classes: PEC_LOWER,  lift: 0.00 },
  STERNUM:     { classes: STERNUM,    lift: 0.00 },
  ABS:         { classes: ABS,        lift: 0.00 },
  OBLIQUE:     { classes: OBLIQUE,    lift: 0.00 },
  DELT:        { classes: DELT,       lift: 0.00 },
  UPPER_ARM:   { classes: UPPER_ARM,  lift: 0.00 },
  FOREARM:     { classes: FOREARM,    lift: 0.00 },
  HAND:        { classes: HAND,       lift: 0.00 }
};
