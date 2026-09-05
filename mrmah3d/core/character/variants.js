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
function hipShape(k, gluteK) {
  var gk = gluteK == null ? 1.0 : gluteK;
  return function (a) {
    var seam = -lobe(a, 0, 0.30) * 0.090;
    var heads = (lobe(a, 0.62, 0.50) + lobe(a, -0.62, 0.50)) * 0.090;
    var sweep = (SHAPES.belly(a, 1.40, 0.52) + SHAPES.belly(a, -1.40, 0.52)) * 0.220;   /* R107: the outer hip is a full round sweep */
    /* R107: the glute is a structure grown from the pelvis — an upper shelf,
       maximum posterior projection, an outer sweep and a deep central valley
       whose floor sits BELOW the ring so the cavity term darkens it. */
    /* R107: TWO SPHERES. Probed at y 1.40 the earlier pair was one broad bulge
       from 126 to 161 degrees with a one-vertex crack at the centre; the
       bellies are now narrower and further apart (centre 40 degrees off the
       back) so the inner vertex sits on a slope, and the valley floor is at
       half the ring — a third of the spheres' height deep. */
    var glute = ((SHAPES.belly(a, Math.PI - 0.66, 0.30) + SHAPES.belly(a, -Math.PI + 0.66, 0.30)) * 0.560 - lobe(a, Math.PI, 0.22) * 0.640) * gk;   /* rounder: each sphere 0.30 rad wide, so the outer hip is its own curve */
    return 1 + (seam + heads + sweep + glute) * k;
  };
}

function femaleProportions() {
  var M = MALE;
  var S = SHAPES;
  var T = M.TORSO;
  var taper = S.taperClasses, neck = S.neckClasses;

  var rings = [
    { y: 0.000, w: 0.006, d: 0.004, fg: [3, 2], columns: true, classesAt: taper },
    { y: 0.150, w: 0.032, d: 0.024, fg: [3, 2], facet: 0.0060, crystal: 0.0180, crystalY: 0.0040, columns: true, classesAt: taper },
    { y: 0.400, w: 0.090, d: 0.072, fg: [3, 2], facet: -0.0060, crystal: 0.0240, crystalY: 0.0060, hero: 0.20, columns: true, classesAt: taper },
    /* R102 — knee and calf, as on the male (proportions.js kneeShape /
       calfShape). Measured on the female references: thigh 0.191 of height
       at t 0.64, knee 0.103 at t 0.72, calf 0.110 at t 0.76 (front). */
    { y: 0.560, w: 0.136, d: 0.112, fg: [3, 2], facet: 0.0050, crystal: 0.0260, crystalY: 0.0060, hero: 0.22,
      shape: S.calfShape(0.55), columns: true, classesAt: taper },
    { y: 0.680, w: 0.172, d: 0.144, fg: [2, 2], facet: -0.0055, crystal: 0.0280, crystalY: 0.0070, hero: 0.26,
      shape: S.calfShape(1.0), columns: true, classesAt: taper },
    { y: 0.760, w: 0.166, d: 0.140, fg: [2, 2], facet: 0.0050, crystal: 0.0260, crystalY: 0.0060, hero: 0.16,
      shape: S.calfShape(0.60), columns: true, classesAt: taper },
    /* the knee is read in depth, not in width (see the male table) */
    { y: 0.830, w: 0.158, d: 0.132, fg: [2, 2], facet: -0.0045, crystal: 0.0220, crystalY: 0.0050, hero: 0.08,
      shape: S.kneeShape(1.0), columns: true, classesAt: taper, cav: 0.45 },
    { y: 0.920, w: 0.204, d: 0.170, fg: [2, 3], facet: -0.0050, crystal: 0.0300, crystalY: 0.0070, hero: 0.18,
      shape: hipShape(0.45, 0.0), columns: true, classesAt: taper },
    /* the thigh — strong, the reference's 0.60 of the shoulder width */
    { y: 1.070, w: 0.276, d: 0.234, fg: [2, 3], facet: 0.0055, crystal: 0.0300, crystalY: 0.0070, hero: 0.20,
      shape: hipShape(0.70, 0.12), columns: true, classesAt: taper },
    /* R102 — the under-glute crease: the glute pair pulls in here so the
       belly above it overhangs the hamstring */
    { y: 1.230, w: 0.330, d: 0.270, fg: [2, 3], facet: 0.0070, zc: -0.030, crystal: 0.0340, crystalY: 0.0090, hero: 0.22,
      shape: hipShape(1.0, 0.85), columns: false, classesAt: null, zoneAt: S.quadZone(1), cav: 0.45 },   /* R107: still a full sphere here; it ends in a fold below */
    /* the hip / glute max — the widest point below the waist, glute-full behind
       (R102: the reference's hip is 0.77 of her shoulder width, the glute max
       sits HIGH, at t 0.49, and the shelf begins straight under the waist) */
    { y: 1.400, w: 0.395, d: 0.340, fg: [2, 3], facet: -0.0070, zc: -0.045,   /* R107: the hip / glute max — 1 : 3.5 against the waist, the brief's godform ratio */ crystal: 0.0340, crystalY: 0.0090, hero: 0.16,
      shape: hipShape(1.0, 1.0), zoneAt: S.quadZone(0) },
    { y: 1.530, w: 0.356, d: 0.300, fg: [2, 3], facet: 0.0050, zc: -0.040, crystal: 0.0280, crystalY: 0.0070, hero: 0.10,
      shape: hipShape(0.90, 1.0), zoneAt: S.quadZone(0) },
    /* the glute SHELF — the pair is already present where the waist ends */
    { y: 1.610, w: 0.250, d: 0.210, fg: [2, 3], facet: -0.0050, zc: -0.020, crystal: 0.0240, crystalY: 0.0060, hero: 0.06,
      shape: hipShape(0.60, 0.70), zoneAt: S.coreZone(0) },
    /* THE WAIST — higher and tighter than his (R102: 0.30 of her shoulders) */
    { y: 1.690, w: 0.118, d: 0.108, fg: [1, 1], facet: -0.0060, crystal: 0.0240, crystalY: 0.0060,
      shape: S.coreShape(1.0, 0.05), hero: 0.04, zoneAt: S.coreZone(1), cav: 0.30 },
    { y: 1.770, w: 0.192, d: 0.162, fg: [2, 2], facet: 0.0040, crystal: 0.0220, crystalY: 0.0050,
      shape: S.coreShape(0.9, 0.16, 0.12), hero: 0.08, zoneAt: S.coreZone(2) },
    /* the under-bust */
    { y: 1.860, w: 0.236, d: 0.232, fg: [3, 3], facet: -0.0050, crystal: 0.0260, crystalY: 0.0060,
      shape: bustShape(0.85), hero: 0.10, zoneAt: S.coreZone(3) },
    /* THE BUST — two integrated volumes either side of the sternum */
    { y: 1.970, w: 0.262, d: 0.276, fg: [3, 3], facet: 0.0055, crystal: 0.0300, crystalY: 0.0070,
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
