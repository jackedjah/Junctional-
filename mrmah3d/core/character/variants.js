/* MR.MAH 3D :: VARIANTS
   Proportion sets for the ONE renderer.

   R96 §73-79. A variant is not a second character: it is the same head, the
   same face, the same chest and hand square-diamonds, the same three
   indicators, the same crystal material and theme energy, built by the same
   `buildBody` / `buildLimbs` pipeline from a different PROPORTION SET. This
   module returns that set; the male canon (proportions.js) is the default.

   The female prototype is measured off `reference/mrmah-refF-r96-female.png`
   (941 x 1672; apex y 230, tip y 1435, 400 px to the unit, centre x 470):

     deltoid outer edge      0.42   (male 0.672)
     chest, with the bust    0.325  at y 2.07
     waist                   0.18   at y 1.67  — higher and tighter than his
     hip / upper thigh       0.31   at y 1.40  — the broad transition
     lower body              0.24 at 1.07, 0.14 at 0.70, one taper to the point
     upper arm radius        ~0.08, forearm ~0.065 — slim, long
     raised hand             presents the crystal at y ~2.4, above the shoulder

   Same species, feminine athletic: narrower shoulders, an integrated bust as
   two faceted upper-chest volumes on a continuous ribcage (never two spheres),
   a smaller waist, a broader hip transition, a larger but restrained glute
   region, and — as canon demands — ONE lower crystalline body. */

import { MALE, SHAPES } from './proportions.js';
import { REGIONS } from './regions.js';

var lobe = SHAPES.lobe;

/* THE BUST — the pectoral shelves' feminine counterpart: two rounder lobes
   set lower and closer to the sternum, projecting further forward, on a
   ribcage that keeps its side planes. The sternum valley stays so the chest
   diamond sits between two volumes rather than on a dome. */
function bustShape(k) {
  return function (a) {
    var sternum = -lobe(a, 0, 0.34) * 0.200;
    var bust = (lobe(a, 0.58, 0.50) + lobe(a, -0.58, 0.50)) * 0.470;
    var lat = (lobe(a, Math.PI / 2, 0.62) + lobe(a, -Math.PI / 2, 0.62)) * 0.070;
    var back = lobe(a, Math.PI, 0.90) * -0.110;
    return 1 + (sternum + bust + lat + back) * k;
  };
}
/* THE HIP — the quad's feminine counterpart: the lateral sweep sits higher
   and broader, the front seam is shallower, and the back carries a positive
   glute lobe where the male's is held negative. */
/* R102: `gluteK` scales the posterior pair separately from the hip's sweep,
   so the rings can build a glute SHELF under the waist, a full belly, and an
   under-glute crease into the hamstring (`reference/mrmah-refK-r102-female-
   rear.png`: two full round masses with a cleft, upper shelf at t 0.43, max
   at t 0.49, crease at t 0.55). The cleft is what keeps two lobes from
   reading as one dome. */
/* R108: the four masses are scaled SEPARATELY — `k` for the whole, `gluteK`
   for the posterior pair, `quadK` for the front's seam and quad heads,
   `hamK` for the hamstring columns — so the pelvis rows can carry the glute
   shelf without a quad on the front, the thigh rows the quad without a glute
   behind, and the fold between them is the glute scale FALLING between two
   rings rather than a ring narrowed all round.

   The glute is ONE large continuous belly per side (the R107 sheet's clay
   panel: an upper shelf, a posterior dome, a lateral sweep and a fold), not
   the R107 sphere pair: each belly is 0.44 rad wide and centred 35 degrees
   off the back, and the lateral sweep sits at ±1.52 so the multiplier RISES
   without a dip from the side (1.20) through 2.0 rad (1.34) to the apex
   (1.54) and only then falls into the cleft (0.75 at dead back) — one
   uninterrupted outer curve in the three-quarter, two masses from behind. */
function hipShape(k, gluteK, quadK, hamK) {
  var gk = gluteK == null ? 1.0 : gluteK;
  var qk = quadK == null ? 0.35 : quadK;
  var hk = hamK == null ? 0 : hamK;
  return function (a) {
    var seam = -lobe(a, 0, 0.40) * 0.460 * qk;   /* three vertices wide on an 18-sided ring: at 0.26 the channel was one vertex and read as a line in the clay */
    var heads = (SHAPES.belly(a, 0.58, 0.42) + SHAPES.belly(a, -0.58, 0.42)) * 0.380 * qk;
    var sweep = (SHAPES.belly(a, 1.52, 0.50) + SHAPES.belly(a, -1.52, 0.50)) * 0.160;
    var glute = ((SHAPES.belly(a, Math.PI - 0.62, 0.44) + SHAPES.belly(a, -Math.PI + 0.62, 0.44)) * 0.520 - lobe(a, Math.PI, 0.20) * 0.600) * gk;
    /* the hamstring pair: probed at y 1.03 a 0.10 cleft left the columns 0.008
       apart in z — a line; the cleft is 0.22 now, a valley */
    var ham = ((SHAPES.belly(a, Math.PI - 0.42, 0.34) + SHAPES.belly(a, -Math.PI + 0.42, 0.34)) * 0.240 - lobe(a, Math.PI, 0.16) * 0.320) * hk;
    return 1 + (seam + heads + sweep + glute + ham) * k;
  };
}

function femaleProportions() {
  var M = MALE;
  var S = SHAPES;
  var T = M.TORSO;
  var taper = S.taperClasses, neck = S.neckClasses;

  var rings = [
    /* R108 — THE LOWER BODY, re-authored against the R107 Mrs. Mah sheet.
       Read on its front figure (waist 12% of the crop at y 40%, hip 36% at
       52-55%, thigh 30% at 62%, knee 16% at 70%, calf 19% at 75%, 10% at
       80%): hip / waist 3.0, thigh 0.83 of the hip, knee 0.44, calf 0.53.
       The R107 table's hip row (0.395, silhouette 0.478) measured 3.6
       waists on the front mask WITH THE ARMS HIDDEN (4.0 with the lowered
       forearm swallowed into the central run — measure the lower body with
       `mrmah-limbs` hidden or the arm is counted) and read as a ball under a
       waist; a first cut at 0.274 measured 2.42, and the max row is 0.315
       now for the brief's 2.8. The drama is in the SHAPE: waist -> pelvic
       transition -> glute shelf -> outward sweep -> apex -> lower glute ->
       fold -> quad / hamstring sweep -> knee -> calf -> Achilles compression
       -> ONE point. */
    { y: 0.000, w: 0.006, d: 0.004, fg: [2, 2], columns: true, classesAt: taper },
    { y: 0.150, w: 0.026, d: 0.020, fg: [2, 2], facet: 0.0060, crystal: 0.0180, crystalY: 0.0040, columns: true, classesAt: taper },
    { y: 0.400, w: 0.062, d: 0.052, fg: [2, 2], facet: -0.0060, crystal: 0.0240, crystalY: 0.0060, hero: 0.20, columns: true, classesAt: taper },
    /* the Achilles compression under the calf: 0.31 of the hip at t 0.81 */
    { y: 0.560, w: 0.132, d: 0.116, fg: [2, 2], facet: 0.0050, crystal: 0.0260, crystalY: 0.0060, hero: 0.22,
      shape: S.calfShape(0.50), columns: true, classesAt: taper },
    /* the calf — the secondary sweep. Its mass is POSTERIOR (calfShape's
       gastrocnemius bellies), so from the front the width barely exceeds the
       knee's and the outline is one long taper with a slower passage; a first
       cut 15% wider than the knee made the knee a groove all round with a
       bead under it (a ring narrower than both neighbours is a groove) */
    { y: 0.650, w: 0.180, d: 0.170, fg: [1, 2],   /* R108 d: the CALF BLOOM */ facet: -0.0055, crystal: 0.0280, crystalY: 0.0070, hero: 0.26,
      shape: S.calfShape(1.0), columns: true, classesAt: taper },
    { y: 0.740, w: 0.170, d: 0.156, fg: [1, 2], facet: 0.0050, crystal: 0.0260, crystalY: 0.0060, hero: 0.16,
      shape: S.calfShape(0.90), columns: true, classesAt: taper },
    /* the knee — the controlled compression, read in depth by kneeShape's
       notch; in width it is an inflection of the taper, not a band */
    { y: 0.820, w: 0.130, d: 0.120, fg: [1, 2],   /* R108 d: the knee PINCH */ facet: -0.0045, crystal: 0.0220, crystalY: 0.0050, hero: 0.08,
      shape: S.kneeShape(0.80), columns: true, classesAt: taper, cav: 0.35 },   /* R108: softer than the male's — at 1.0 / 0.45 it read as a joint ring from behind */
    /* the long quad / hamstring sweep: quad heads and seam at full strength,
       two hamstring columns behind (their depth carries the posterior thigh
       back out under the fold), no glute */
    { y: 0.910, w: 0.205, d: 0.186, fg: [1, 3], facet: -0.0050, crystal: 0.0300, crystalY: 0.0070, hero: 0.18,
      shape: hipShape(0.70, 0.0, 0.95, 0.70), columns: true, classesAt: taper },
    { y: 1.040, w: 0.272, d: 0.250, fg: [1, 3],   /* R108 d: the hamstring / quad BULGE — wider than the fold above it (round b: 0.264 -> 0.272 against a 0.242 fold, so the second bulge reads from the front too) */ facet: 0.0055, crystal: 0.0300, crystalY: 0.0070, hero: 0.20,
      shape: hipShape(0.85, 0.0, 1.0, 1.0), columns: true, classesAt: taper },
    /* the glute FOLD: the posterior pair falls from 1.0 to 0.25 between this
       ring and the one above, so the dome's underside turns in over the
       hamstring columns that begin here; the crease is a cavity, not a slot */
    { y: 1.185, w: 0.242, d: 0.210, fg: [1, 3],   /* R108 d: the FOLD is a short pinch between the glute and the hamstring bulge */ facet: 0.0070, zc: -0.012, crystal: 0.0340, crystalY: 0.0090, hero: 0.22,
      shape: hipShape(0.95, 0.25, 0.85, 0.60), columns: false, classesAt: null, zoneAt: S.quadZone(1), cav: 0.55 },
    /* the lower glute curvature — still full behind, the quad beginning in front */
    { y: 1.300, w: 0.305, d: 0.278, fg: [1, 3], facet: -0.0060, zc: -0.030, crystal: 0.0340, crystalY: 0.0090, hero: 0.20,
      shape: hipShape(1.0, 1.0, 0.60), zoneAt: S.quadZone(1), cav: 0.20 },
    /* the muscle-bust APEX — widest below the waist, maximum posterior projection */
    { y: 1.430, w: 0.315, d: 0.292, fg: [1, 3], facet: -0.0070, zc: -0.035, crystal: 0.0340, crystalY: 0.0090, hero: 0.16,
      shape: hipShape(1.0, 1.0, 0.40), zoneAt: S.quadZone(0) },
    /* the glute SHELF and the outward acceleration out of the pelvis: the
       pair is already FULL here, one ring under the transition */
    { y: 1.545, w: 0.280, d: 0.250, fg: [1, 3], facet: 0.0050, zc: -0.025, crystal: 0.0280, crystalY: 0.0070, hero: 0.10,
      shape: hipShape(0.95, 1.0, 0.30), zoneAt: S.quadZone(0) },
    /* the gradual pelvic transition out of the waist — NO glute yet (the
       lower back is still the lumbar plane), so the shelf is the step to the
       full pair one ring down; with 0.30 of the pair here the spline rounded
       the shelf into a dome that began at the waist */
    { y: 1.625, w: 0.200, d: 0.180, fg: [1, 3],   /* R108 d: the bloom begins straight under the waist */ facet: -0.0050, zc: -0.010, crystal: 0.0240, crystalY: 0.0060, hero: 0.06,
      shape: hipShape(0.60, 0.0, 0.25), zoneAt: S.coreZone(0) },
    /* THE WAIST — higher and tighter than his (R102: 0.30 of her shoulders) */
    { y: 1.690, w: 0.118, d: 0.108, fg: [1, 1], facet: -0.0060, crystal: 0.0240, crystalY: 0.0060,
      shape: S.coreShape(1.0, 0.05), hero: 0.04, zoneAt: S.coreZone(1), cav: 0.30 },
    { y: 1.770, w: 0.192, d: 0.162, fg: [1, 2], facet: 0.0040, crystal: 0.0220, crystalY: 0.0050,
      shape: S.coreShape(0.9, 0.16, 0.12), hero: 0.08, zoneAt: S.coreZone(2) },
    /* the under-bust */
    { y: 1.860, w: 0.236, d: 0.232, fg: [2, 2], facet: -0.0050, crystal: 0.0260, crystalY: 0.0060,
      shape: bustShape(0.85), hero: 0.10, zoneAt: S.coreZone(3) },
    /* THE BUST — two integrated volumes either side of the sternum */
    { y: 1.970, w: 0.262, d: 0.276, fg: [2, 2], facet: 0.0055, crystal: 0.0300, crystalY: 0.0070,
      shape: bustShape(1.0), hero: 0.34, zoneAt: S.pecZone(0) },
    { y: 2.050, w: 0.250, d: 0.220, fg: [2, 2], facet: -0.0045, crystal: 0.0280, crystalY: 0.0060,
      shape: S.chestShape(0.55), hero: 0.40, zoneAt: S.pecZone(1) },   /* R103: the girdle sits 0.05 lower, as the male's does */
    /* the shoulder line, narrower, with the same collar */
    { y: 2.120, w: 0.236, d: 0.184, fg: [2, 2], facet: 0.0055, crystal: 0.0300, crystalY: 0.0060,
      shape: S.clavicleShape(1.0), dip: 0.030, hero: 0.30, zoneAt: null, coat: 0.12 },   /* R98: the shelf takes a reduced platinum share, as the male's does; R102: less again — her upper chest rendered as one blown white ledge */
    /* the neck — the same column, a touch slimmer */
    { y: 2.205, w: 0.165, d: 0.130, fg: [1, 1], facet: -0.0120, crystal: 0.024, crystalY: 0.0050,
      shape: S.clavicleShape(0.55), hero: 0.16, classesAt: neck },
    { y: 2.250, w: 0.110, d: 0.092, fg: [1, 1], facet: 0.0120, crystal: 0.018, crystalY: 0.0040, zc: -0.030, hero: 0.10, classesAt: neck },
    { y: 2.315, w: 0.096, d: 0.082, fg: [1, 1], facet: -0.0110, crystal: 0.014, crystalY: 0.0030, zc: -0.040, hero: 0.06, classesAt: neck },
    { y: 2.368, w: 0.088, d: 0.078, fg: [1, 1], facet: 0.0100, crystal: 0.012, crystalY: 0.0020, zc: -0.044, hero: 0.04, classesAt: neck },
    { y: 2.412, w: 0.080, d: 0.072, fg: [1, 1], facet: 0.0060, zc: -0.044, hero: 0.02, classesAt: neck }
  ];

  var TORSO = {
    topY: T.topY, sides: T.sides, refine: T.refine, classLift: T.classLift, rings: rings,
    shoulderHalfWidth: 0.510, shoulderY: 2.120   /* R102: 0.420 -> 0.470, her shoulders are 0.91 of his */
  };

  /* R102 — MUSCULAR SHOULDERS AND ARMS. The R102 female references carry
     shoulders nearly as wide as the male's (0.316 of height against his
     0.347), round deltoid caps and arms with real bicep and forearm mass;
     the R96 prototype's slim long arms (0.092 / 0.072) read soft beside
     them. Radii come up a quarter and the cap grows with them. */
  var A = M.ARMS;
  var ARMS = {
    right: {
      shoulder: [-0.389, 1.954, 0.014],
      elbow: [-0.455, 1.390, 0.10],
      wrist: [-0.410, 0.985, 0.14],
      upperRadius: 0.116, foreRadius: 0.084, wristRadius: 0.056
    },
    left: {
      shoulder: [0.389, 1.954, 0.014],
      elbow: [0.455, 1.430, 0.11],
      wrist: [0.560, 2.110, 0.15],
      upperRadius: 0.116, foreRadius: 0.084, wristRadius: 0.056
    },
    /* the deltoid: a round cap that encloses the arm's top — R102: larger; R103: rooted deeper and lower with the girdle */
    deltoid: { innerX: 0.200, innerY: 2.010, outerX: 0.470, outerY: 1.930, r0: 0.160 }   /* R107: a dome, not a ball (see body.js) */,   /* R104: wider, muscular shoulders */
    classLift: A.classLift, deltoidLift: A.deltoidLift,
    profiles: A.profiles, shapes: A.shapes
  };

  var Hd = M.HAND;
  var HAND = {
    palmLength: Hd.palmLength * 0.86, palmHalfWidth: Hd.palmHalfWidth * 0.84, palmHalfDepth: Hd.palmHalfDepth * 0.84,
    digitCount: Hd.digitCount, digitLength: Hd.digitLength * 0.92, digitRadius: Hd.digitRadius * 0.86,
    tipDiamond: Hd.tipDiamond
  };

  var I = M.INSIGNIA;
  var INSIGNIA = {
    emblemY: 1.965, emblemHalf: I.emblemHalf * 0.92,
    symbolsY: 1.795, symbolHalf: I.symbolHalf * 0.92, symbolSpacing: I.symbolSpacing * 0.92,
    throatY: I.throatY, throatHalf: I.throatHalf
  };

  var POSE = {
    centreX: ((ARMS.left.wrist[0] + HAND.palmHalfWidth) +
      Math.min(ARMS.right.elbow[0] - ARMS.right.upperRadius,
               ARMS.right.wrist[0] - HAND.palmHalfWidth,
               -TORSO.shoulderHalfWidth)) / 2
  };

  return { name: 'female', HEAD: M.HEAD, NECK: M.NECK, TORSO: TORSO, ARMS: ARMS, HAND: HAND,
           INSIGNIA: INSIGNIA, POSE: POSE, FLOAT: M.FLOAT };
}

export var VARIANT_NAMES = ['male', 'female'];

export function proportionsFor(variant) {
  if (variant === 'female') return femaleProportions();
  var m = {}; Object.keys(MALE).forEach(function (k) { m[k] = MALE[k]; });
  m.name = 'male';
  return m;
}

export var __internals = { bustShape: bustShape, hipShape: hipShape, REGIONS: REGIONS };
