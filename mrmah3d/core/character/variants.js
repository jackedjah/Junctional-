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
function hipShape(k) {
  return function (a) {
    var seam = -lobe(a, 0, 0.30) * 0.070;
    var heads = (lobe(a, 0.62, 0.50) + lobe(a, -0.62, 0.50)) * 0.090;
    var sweep = (lobe(a, 1.35, 0.60) + lobe(a, -1.35, 0.60)) * 0.170;
    var glute = (lobe(a, Math.PI - 0.55, 0.55) + lobe(a, -Math.PI + 0.55, 0.55)) * 0.150;
    return 1 + (seam + heads + sweep + glute) * k;
  };
}

function femaleProportions() {
  var M = MALE;
  var S = SHAPES;
  var T = M.TORSO;
  var taper = S.taperClasses, neck = S.neckClasses;

  var rings = [
    { y: 0.000, w: 0.006, d: 0.004, columns: true, classesAt: taper },
    { y: 0.150, w: 0.032, d: 0.024, facet: 0.0060, crystal: 0.0180, crystalY: 0.0040, columns: true, classesAt: taper },
    { y: 0.400, w: 0.076, d: 0.060, facet: -0.0060, crystal: 0.0240, crystalY: 0.0060, hero: 0.20, columns: true, classesAt: taper },
    { y: 0.700, w: 0.128, d: 0.102, facet: 0.0055, crystal: 0.0280, crystalY: 0.0070, hero: 0.24, columns: true, classesAt: taper },
    { y: 0.850, w: 0.164, d: 0.134, facet: -0.0050, crystal: 0.0300, crystalY: 0.0070, hero: 0.18,
      shape: hipShape(0.35), columns: true, classesAt: taper },
    { y: 1.070, w: 0.212, d: 0.176, facet: 0.0055, crystal: 0.0300, crystalY: 0.0070, hero: 0.20,
      shape: hipShape(0.70), columns: true, classesAt: taper },
    /* the hip — the widest point below the waist, glute-full behind */
    { y: 1.250, w: 0.258, d: 0.220, facet: 0.0070, crystal: 0.0340, crystalY: 0.0090, hero: 0.22,
      shape: hipShape(1.0), columns: false, classesAt: null, zoneAt: S.quadZone(1) },
    { y: 1.420, w: 0.276, d: 0.232, facet: -0.0070, crystal: 0.0340, crystalY: 0.0090, hero: 0.16,
      shape: hipShape(0.95), zoneAt: S.quadZone(0) },
    { y: 1.560, w: 0.210, d: 0.176, facet: 0.0050, crystal: 0.0260, crystalY: 0.0070, hero: 0.06,
      shape: hipShape(0.55), zoneAt: S.coreZone(0) },
    /* THE WAIST — higher and tighter than his */
    { y: 1.670, w: 0.170, d: 0.146, facet: -0.0060, crystal: 0.0240, crystalY: 0.0060,
      shape: S.coreShape(1.0, 0.05), hero: 0.04, zoneAt: S.coreZone(1) },
    { y: 1.760, w: 0.200, d: 0.168, facet: 0.0040, crystal: 0.0220, crystalY: 0.0050,
      shape: S.coreShape(0.9, 0.16), hero: 0.08, zoneAt: S.coreZone(2) },
    /* the under-bust */
    { y: 1.860, w: 0.236, d: 0.232, facet: -0.0050, crystal: 0.0260, crystalY: 0.0060,
      shape: bustShape(0.85), hero: 0.10, zoneAt: S.coreZone(3) },
    /* THE BUST — two integrated volumes either side of the sternum */
    { y: 1.970, w: 0.262, d: 0.276, facet: 0.0055, crystal: 0.0300, crystalY: 0.0070,
      shape: bustShape(1.0), hero: 0.34, zoneAt: S.pecZone(0) },
    { y: 2.080, w: 0.250, d: 0.214, facet: -0.0045, crystal: 0.0280, crystalY: 0.0060,
      shape: S.chestShape(0.55), hero: 0.40, zoneAt: S.pecZone(1) },
    /* the shoulder line, narrower, with the same collar */
    { y: 2.170, w: 0.236, d: 0.180, facet: 0.0055, crystal: 0.0300, crystalY: 0.0060,
      shape: S.clavicleShape(1.0), dip: 0.030, hero: 0.46, zoneAt: null },
    /* the neck — the same column, a touch slimmer */
    { y: 2.205, w: 0.190, d: 0.140, facet: -0.0120, crystal: 0.024, crystalY: 0.0050,
      shape: S.clavicleShape(0.55), hero: 0.16, classesAt: neck },
    { y: 2.250, w: 0.110, d: 0.092, facet: 0.0120, crystal: 0.018, crystalY: 0.0040, zc: -0.030, hero: 0.10, classesAt: neck },
    { y: 2.315, w: 0.096, d: 0.082, facet: -0.0110, crystal: 0.014, crystalY: 0.0030, zc: -0.040, hero: 0.06, classesAt: neck },
    { y: 2.368, w: 0.088, d: 0.078, facet: 0.0100, crystal: 0.012, crystalY: 0.0020, zc: -0.044, hero: 0.04, classesAt: neck },
    { y: 2.412, w: 0.010, d: 0.008, facet: 0.0060, zc: -0.044, hero: 0.02, classesAt: neck }
  ];

  var TORSO = {
    topY: T.topY, sides: T.sides, classLift: T.classLift, rings: rings,
    shoulderHalfWidth: 0.420, shoulderY: 2.120
  };

  var A = M.ARMS;
  var ARMS = {
    right: {
      shoulder: [-0.305, 1.985, 0.014],
      elbow: [-0.400, 1.430, 0.10],
      wrist: [-0.360, 1.020, 0.14],
      upperRadius: 0.092, foreRadius: 0.072, wristRadius: 0.048
    },
    left: {
      shoulder: [0.305, 1.985, 0.014],
      elbow: [0.400, 1.470, 0.11],
      wrist: [0.540, 2.110, 0.15],
      upperRadius: 0.092, foreRadius: 0.072, wristRadius: 0.048
    },
    /* the deltoid: a smaller, higher cap that still encloses the arm's top */
    deltoid: { innerX: 0.190, innerY: 2.035, outerX: 0.345, outerY: 1.970, r0: 0.118 },
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
