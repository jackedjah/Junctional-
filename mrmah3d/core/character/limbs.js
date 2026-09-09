import {createElbowContinuity,createFoldedElbowContinuity,createBoundElbowSkin} from './elbow-continuity.js';
import { maleUpperAngle, maleBicepsReturn, maleBicepsSurface, maleBicepsFacingNormals } from './arm-anatomy.js';
import { authorArmMaster, authorForearmOrigin, authorDistalArmContactReturn, authorMuscleBellies, authorForearmBellies, fitShoulderTorsoAttachment } from './arm-master.js';
import { maleUpperProfile, maleForeProfile, maleUpperShape, maleForeShape, maleForePlanes, maleUpperPlanes, maleUpperSectionFaces, maleUpperSectionNormals, maleShoulderArm, blendArmSeam, maleElbowEnvelope, maleWristSurface, maleArmRecesses, maleTricepsSurface } from './arm-anatomy.js';
/* MR.MAH 3D :: LIMBS
   Arms and hands, as real articulated faceted structures.

   Each arm is a small hierarchy — shoulder -> upper -> elbow -> forearm ->
   wrist -> hand -> digits — with geometry built along each bone's own axis.
   That matters beyond looks: the animation states need joints to rotate, and
   a limb welded into the torso mesh could not be posed at all.

   The reference pose is the canonical rest: the character's right arm hangs
   bent close to the body, the left is raised with a readable open hand. The
   raised hand is the one the eye goes to, so it gets separate digits and the
   small bright tip diamond the reference shows above it. */

import {
  Group, Mesh, EdgesGeometry, LineSegments, Vector3, Quaternion, PointLight, Ray
} from '../../vendor/three/three.module.min.js';
import { segment, diamondPlate, facetedGeometry, mergeGeometries, limbSideDirection, sculptSurfaceRegion } from './forge.js';
import { ARMS, HAND, MRMAH_MORPHOLOGY } from './proportions.js';
import { REGIONS } from './regions.js';

/* R95 — THE ARM'S STRIPS ARE NAMED, NOT ROLLED.

   `d` is the angle relative to the limb's front (0 = the bicep side, pi = the
   tricep side), `t` the position along it. The references' arms are a few
   long planes: a lit bicep plane on the front, sapphire flanks, and a dark
   tricep side that reaches the black rows — which is what lets the arm read
   as the same dark crystal as the torso rather than as a softer material. */
/* R99 — `innerSign` says which sign of d faces the torso (see
   limbSideDirection in forge.js). The inner flank is the arm's shadow
   valley: it takes the navy row and almost no coat, so the arm reads as a
   mass with a lit outer side and a lost inner one — the contact shadow
   between arm and ribcage that the godform reference carries. */
function armZone(table, innerSign) {
  return function (d, t) {
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    var ad = Math.abs(d);
    var inner = innerSign != null && d * innerSign > 0;
    /* R100 — the shadow UNDER THE CAP: the arm's top band, everywhere but
       the bicep's front, takes the navy row with no coat, so the deltoid
       reads as a mass sitting over the arm rather than a colour change on
       the same tube. */
    if (t != null && t < 0.17 && ad > 0.55) return { classes: table, seed: 78, index: 1, coat: 0.08 };
    if (inner && ad >= 0.60 && ad < 1.50) return { classes: table, seed: 76, index: 1, coat: 0.12 };   /* the inner flank: the valley */
    if (inner && ad >= 1.50 && ad < 2.30) return { classes: table, seed: 77, index: 0, coat: 0.0 };    /* inner rear: lost */
    /* R96: measured against Reference A's lowered arm (48% under 32 luma, 12%
       above 96) this build's was 72% under 32 with 3% above 96 — more than half
       of every arm was drawn from the two darkest rows. The flanks now reach
       further round and the rear takes sapphire; only the last 50 degrees of
       the tricep side stay lost. */
    /* R98: the platinum coat follows the same map — full on the bicep ridge
       and the outer flank, less toward the back, none on the lost tricep side
       and the inner arm (the flank facing the ribcage is the same angle as
       the outer one here; the shader's exposure term, which favours planes
       facing outward, is what keeps the inner arm darker). */
    if (ad < 0.60) return { classes: table, seed: 70, index: 3, coat: 1.0 };           /* the bicep / flexor plane: steel-blue */
    if (ad < 1.50) return { classes: table, seed: 71 + (d > 0 ? 1 : 0), index: 2, coat: 0.55 };   /* flanks: sapphire */
    if (ad < 2.30) return { classes: table, seed: 73 + (d > 0 ? 1 : 0), index: 1, coat: 0.20 };   /* toward the back: navy (R99: the mass turns away) */
    if (ad < 2.75) return { classes: table, seed: 74, index: 1, coat: 0.15 };          /* navy */
    return { classes: table, seed: 75, index: 0, coat: 0.0 };                         /* the tricep side: lost */
  };
}

function clad(group, geo, materials, rimScale, edgeAngles, name) {
  var ea = edgeAngles || {};
  var mesh = new Mesh(geo, materials.body);
  if (name) mesh.name = name;   /* R99: named for the anatomical-group debug view */
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  /* Concentric with the part — see the long note in body.js. The arm segments
     are built in character space around y ~ 1.9, so a plain setScalar(1.05)
     lifted each shell 0.095 units off its own bone and drew it as a bright
     slab beside the arm rather than as a lip along it. */
  /* R92 — NO RIM SHELL ON THE LIMBS, for the reason the torso lost its own.

     The brief is explicit that the arms must not be defined by line outlines,
     and between this additive shell and three tiers of edge line that is exactly
     what they were: dark sapphire interiors with a bright lip all the way round,
     which reads as hollow glass rather than as a solid limb. Removing it is what
     forces the arm's own SURFACES to carry it — which is what the facet lift and
     the environment cards are for.

     Kept as a parameter so a caller can still ask for one; nothing does. */
  if (rimScale) {
    var s = rimScale;
    var rim = new Mesh(geo, materials.rim);
    rim.scale.set(s, 1, s);
    if (!geo.boundingBox) geo.computeBoundingBox();
    var c = geo.boundingBox.getCenter(new Vector3());
    rim.position.set(c.x * (1 - s), 0, c.z * (1 - s));
    group.add(rim);
  }
  /* 36, not 20. At 20 degrees every ring seam along a profiled limb qualified,
     so the arms wore a ladder of faint lines that competed with the planes
     describing the bicep and forearm. Suppressing the transition tier is what
     lets the major planes carry the volume — the same hierarchy the torso
     needed, for the same reason. */
  /* R94 — the hands pass their own thresholds. A palm and four digits are a
     dozen tiny solids, and at the limb thresholds every corner of every one
     of them drew, so the hands read as wire boxes with nothing inside — the
     references' hands are solid steel with a few catches. */
  var major = new EdgesGeometry(geo, ea.major || 48);
  var minor = new EdgesGeometry(geo, ea.minor || 36);
  /* One structural tier, not two. The halo pass doubled every major line on a
     limb, and doubled lines are what turned the arms into wireframe tubes once
     the shell came off. */
  group.add(new LineSegments(major, materials.edge));
  group.add(new LineSegments(minor, materials.edgeFaint));
  return { mesh: mesh, edges: major, minorEdges: minor };
}

/* A faceted wedge palm built between the wrist and the knuckles.

   R95 — WITH A BACK-OF-HAND RIDGE. Reviewed, the palm was one flat quad and
   read as a slab. A hand's back is two planes meeting at a low ridge running
   from the wrist to the middle knuckle, so the +z face is now split down its
   middle (five vertices a side) and the front stays flat. Two planes catch
   the light differently, which is what makes the hand read as a solid rather
   than a tile. */
function palmGeometry(dir, spec) {
  var P = [];
  function p(x, y, z) { P.push(x, y, z); return P.length / 3 - 1; }
  var w = spec.palmHalfWidth, d = spec.palmHalfDepth, L = spec.palmLength;
  /* Slight taper outward so the hand reads wider than the wrist. */
  /* R108: the wrist end is the WRIST'S size (0.55 w, 0.75 d — the forearm
     ends at 0.047 and this is 0.048 x 0.035), so the hand grows out of the
     wrist as a wedge; at 0.72 w it was a third wider than the tube it left
     and its flat top disc read as a box sitting on a stick. */
  var a = [p(-w * 0.55, 0, d * 0.75), p(0, 0, d * 1.02), p(w * 0.55, 0, d * 0.75),
           p(w * 0.55, 0, -d * 0.75), p(-w * 0.55, 0, -d * 0.75)];
  var b = [p(-w, L, d), p(0, L, d * 1.32), p(w, L, d), p(w, L, -d), p(-w, L, -d)];
  /* Wound outward (see the R94 note in forge.js): the wrist end faces -y, the
     knuckle end +y, and each strip's normal points away from the block. */
  var faces = [
    [a[0], a[1], a[2], a[3], a[4]],
    [b[4], b[3], b[2], b[1], b[0]],
    [a[0], a[1], b[1], b[0]],        /* back of the hand, left plane */
    [a[1], a[2], b[2], b[1]],        /* back of the hand, right plane */
    [a[2], a[3], b[3], b[2]],
    [a[3], a[4], b[4], b[3]],        /* the palm */
    [a[4], a[0], b[0], b[4]]
  ];
  /* facetedGeometry takes triangles and quads; fan the two pentagon ends. */
  var tris = [];
  faces.forEach(function (f) {
    if (f.length <= 4) { tris.push(f); return; }
    for (var i = 1; i < f.length - 1; i++) tris.push([f[0], f[i], f[i + 1]]);
  });
  return facetedGeometry(P, tris, null, { lift: ARMS.classLift, classes: REGIONS.HAND.classes, coat: REGIONS.HAND.coat });
}

/* One finger: two segments with a knuckle between them, so a curl is a bend
   rather than a shortening. `curl` 0 is straight, 1 fully folded toward the
   palm's front (+z). Returns the geometries it made. */
function buildDigit(hand, materials, spec, base, dirX, len, radius, curl, edges) {
  /* R106 — THREE PHALANGES. The arms sheet's hand is articulated: proximal,
     middle and distal segments with a knuckle between each, the curl
     progressing along the finger so a relaxed hand hangs in a hook and a
     presenting hand cups. Two segments read as a stub with a bend. Still
     merged into the one hand geometry, so it costs no draw. */
  var l1 = len * 0.42, l2 = len * 0.32, l3 = len * 0.26;
  var a1 = curl * 0.70;
  var mid = [base[0] + dirX * l1, base[1] + Math.cos(a1) * l1, base[2] + Math.sin(a1) * l1];
  var a2 = curl * 1.45;
  var mid2 = [mid[0] + dirX * l2 * 0.7, mid[1] + Math.cos(a2) * l2, mid[2] + Math.sin(a2) * l2];
  var a3 = curl * 2.05;
  var tip = [mid2[0] + dirX * l3 * 0.5, mid2[1] + Math.cos(a3) * l3, mid2[2] + Math.sin(a3) * l3];
  var o = { depthRatio: 0.86, crystal: 0.03, steps: 1, lift: ARMS.classLift, classes: REGIONS.HAND.classes, coat: REGIONS.HAND.coat };
  /* R108 c: a real TAPER along the finger (1.0 -> 0.88 -> 0.74 -> 0.50) and
     each phalanx a hair fuller at its joint end than its middle (the
     profile), so a finger is three jointed volumes rather than a tube. */
  var ph = function (t) { return 0.95 + 0.05 * Math.abs(t - 0.5) * 2; };
  var g1 = segment(base, mid, radius, radius * 0.88, 6, Object.assign({ profile: ph }, o));
  var g2 = segment(mid, mid2, radius * 0.88, radius * 0.74, 6, Object.assign({ profile: ph }, o));
  var g3 = segment(mid2, tip, radius * 0.74, radius * 0.50, 6, o);
  /* The segments are returned, not clad: the hand merges every part into ONE
     geometry (see buildHand) so a hand costs three draws, not thirty. */
  return [g1, g2, g3];
}

function buildHand(materials, spec, options) {
  var opts = options || {};
  var hand = new Group();
  hand.name = 'hand';
  var owned = [];
  var crystal = null;   /* R99: the presented crystal, for its levitation */

  var HAND_EDGES = { major: 84, minor: 89 };
  /* R95 — ONE GEOMETRY PER HAND. Four jointed fingers and a thumb as separate
     meshes took a hand from 15 draws to 30 and put the high tier over its
     frame budget; merged with the palm they are one mesh and one pair of edge
     sets. */
  var parts = [palmGeometry(1, spec)];

  /* Digits. Simplified and few — the requirement is that the raised hand
     reads as a hand rather than a triangle, not that it has knuckles. */
  /* Three digits on BOTH hands. The closed hand used to drop to two, which at
     app scale read as a pincer rather than a hand; keeping three and shortening
     them instead costs one small segment and reads as fingers curled in. */
  /* R90 — THE CLOSED HAND IS A FIST, NOT A SHORTER OPEN HAND.

     It used to be the same three digits at 62% length with a smaller splay,
     which is not what closing a hand does: fingers CURL, they do not shrink.
     Straight stubs fanned off a palm read as a claw or a fork at any size, and
     at the sizes this actually renders at that was the weakest thing on the
     character — the brief rules out square mittens and random spikes by name.

     `curl` folds each digit forward toward the palm's front face instead of
     shortening it, so the closed hand presents knuckles to the viewer and the
     fingers disappear underneath, which is the silhouette a fist has. The open
     hand is untouched: it still splays and presents. */
  /* R95 — FOUR JOINTED FINGERS AND A THUMB, RELAXED OR PRESENTING.

     Reviewed against the references, the fist was "a slab with three detached
     cubes", and the brief now asks for the lowered hand to hang RELAXED with
     readable fingers, and the raised one to present the crystal confidently.
     Each finger is two segments with a knuckle (buildDigit), so the relaxed
     hand's fingers hang with a gentle curl and the presenting hand's stand
     open with a slight cup — the two silhouettes a hand actually has. */
  var n = spec.digitCount;
  /* R95-BB: the relaxed hand's curl comes down from 0.62 to 0.38. At 0.62 the
     fingers folded forward into the palm and the lowered hand read as a box
     with two stubs on it; the bodybuilder reference hangs the fingers DOWN
     with only a gentle curl, so each one shows its length from the front. */
  /* R99: the lowered hand is a FIST — the godform reference closes it — and
     with two-segment jointed digits a firm curl reads as knuckles rather than
     as the box-with-stubs the old one-piece digits made at this value. */
  var curl = opts.open ? 0.18 : 0.40;   /* R106: the relaxed hand HANGS its long fingers in a gentle hook (the plate's lowered hand), the presenting one cups */
  for (var i = 0; i < n; i++) {
    var t = n === 1 ? 0.5 : i / (n - 1);
    var x = (t - 0.5) * spec.palmHalfWidth * 1.50;
    /* Splay the outer digits and shorten them slightly. */
    var splay = (t - 0.5) * (opts.open ? 0.30 : 0.10);
    var len = spec.digitLength * (1 - Math.abs(t - 0.5) * 0.26 - (t > 0.9 ? 0.10 : 0));   /* R106: the little finger shorter */
    var base = [x, spec.palmLength, spec.palmHalfDepth * 0.15];
    parts.push.apply(parts, buildDigit(hand, materials, spec, base, Math.sin(splay), len,
      spec.digitRadius, curl, HAND_EDGES));
    /* R100 — a KNUCKLE at each finger's base: a short, slightly thicker
       boss across the metacarpal head, so the back of the hand reads as a
       row of joints rather than four tubes leaving a block. Merged with the
       hand, so it costs no draw. */
    /* R108 c: the bosses are a KNUCKLE ROW — wider (1.34 of the digit) and
       set a little further back on the hand, so neighbours touch and the
       back of the hand ends in a continuous ridge of joints (the reference
       clay strip's hand), not four separate beads. */
    var kb = [x, spec.palmLength - spec.digitRadius * 1.3, spec.palmHalfDepth * 0.26];
    var kt = [x + Math.sin(splay) * spec.digitRadius * 1.2, spec.palmLength + spec.digitRadius * 1.0, spec.palmHalfDepth * 0.26 + Math.sin(curl * 0.85) * spec.digitRadius * 1.0];
    parts.push(segment(kb, kt, spec.digitRadius * 1.22, spec.digitRadius * 1.08, 6,   /* 1.22: at the finger spacing (0.044) bosses of 0.029 already touch */
      { depthRatio: 0.90, crystal: 0.02, steps: 2, lift: ARMS.classLift, classes: REGIONS.HAND.classes, coat: REGIONS.HAND.coat,
        profile: function (t) { return 0.86 + 0.14 * Math.sin(t * Math.PI); } }));
  }

  /* A THUMB — the one addition that makes a hand read as a hand. Set on the
     inner side, opposed, and shorter; on the relaxed hand it rests along the
     palm, on the presenting hand it opens out to cup the crystal. */
  var thumbBase = [-spec.palmHalfWidth * 0.92, spec.palmLength * 0.42, spec.palmHalfDepth * 0.35];
  var thumbLen = spec.digitLength * 0.80;
  var thumbTip = opts.open
    ? [thumbBase[0] - thumbLen * 0.72, thumbBase[1] + thumbLen * 0.62, thumbBase[2] + thumbLen * 0.28]
    : [thumbBase[0] - thumbLen * 0.20, thumbBase[1] + thumbLen * 0.70, thumbBase[2] + thumbLen * 0.55];
  var thumbGeo = segment(thumbBase, thumbTip, spec.digitRadius * 1.30, spec.digitRadius * 0.80, 6,   /* R101: a real thumb base; R108 c: tapers to 0.80 */
    { depthRatio: 0.9, crystal: 0.03, steps: 2, lift: ARMS.classLift, classes: REGIONS.HAND.classes, coat: REGIONS.HAND.coat,
      profile: function (t) { return 0.94 + 0.06 * Math.abs(t - 0.5) * 2; } });
  parts.push(thumbGeo);
  /* R108 c — THE THUMB PLANE. A thumb leaving a flat palm at a point is a
     peg; the reference hands carry a thenar wedge — the thumb's base is a
     broad flattened mass running from the inner wrist corner to the thumb's
     root, which is what gives the hand its width on that side. A short,
     flattened segment (depth 0.55 of its width) from just above the wrist
     to the thumb base, buried into the palm's inner face. */
  var thenarA = [-spec.palmHalfWidth * 0.50, spec.palmLength * 0.10, spec.palmHalfDepth * 0.05];
  var thenarB = [thumbBase[0] * 0.92, thumbBase[1] * 0.96, thumbBase[2] * 0.85];
  parts.push(segment(thenarA, thenarB, spec.digitRadius * 1.55, spec.digitRadius * 1.35, 8,
    { depthRatio: 0.55, crystal: 0.02, steps: 2, lift: ARMS.classLift, classes: REGIONS.HAND.classes, coat: REGIONS.HAND.coat,
      profile: function (t) { return 0.90 + 0.10 * Math.sin(t * Math.PI); } }));
  var handGeo = mergeGeometries(parts);
  var handParts = clad(hand, handGeo, materials, 0, HAND_EDGES, 'hand-solid');
  owned.push(handGeo, handParts.edges, handParts.minorEdges);

  /* The bright tip diamond the reference shows above the raised hand. */
  if (opts.tipDiamond) {
    var tipGeo = diamondPlate(spec.tipDiamond, 0.02);
    var tip2 = new Mesh(tipGeo, materials.emissive);
    tip2.name = 'hand-crystal';
    tip2.position.set(0, spec.palmLength + spec.digitLength * 1.25, 0.02);
    hand.add(tip2);
    var tipGlow = new Mesh(diamondPlate(spec.tipDiamond * 2.0, 0.006), materials.emissiveSoft);
    tipGlow.name = 'hand-crystal-glow';
    tipGlow.position.copy(tip2.position);
    hand.add(tipGlow);
    crystal = { plate: tip2, glow: tipGlow, restY: tip2.position.y };
    owned.push(tipGeo, tipGlow.geometry);

    /* R98 — THE HAND CRYSTAL LIGHTS THE HAND. An emissive plate lights
       nothing (CLAUDE.md, "emissive materials light nothing"), so the
       fingers cupping the crystal stayed exactly as dark as the fingers of
       the other hand and the crystal read as a sticker floating over them.
       A short-range point light parented to the hand travels with it through
       every pose and reaches only the fingertips and the back of the hand —
       at 0.42 units the forearm below the wrist takes a tenth of it and the
       head, 0.5 away, nothing. Its colour is the emitter's own, i.e. theme
       energy. Stood a little in front of the plate so it does not draw itself
       on the fingers as a hot dot. */
    if (opts.lamp !== false && typeof opts.makeLamp === 'function') {
      var lamp = opts.makeLamp();
      if (lamp) {
        lamp.position.set(tip2.position.x, tip2.position.y - spec.digitLength * 0.20, tip2.position.z + 0.10);
        lamp.name = 'hand-crystal-lamp';
        hand.add(lamp);
      }
    }
  }

  return { group: hand, crystal: crystal, dispose: function () { owned.forEach(function (g) { if (g && g.dispose) g.dispose(); }); } };
}

/* Build one arm as a joint hierarchy positioned to hit the measured
   shoulder / elbow / wrist points. Geometry is authored in world space and
   then re-parented, so the measured pose is exact at rest while the joints
   remain free to animate from there. */
function buildArm(materials, spec, options) {
  var opts = options || {};
  /* R96 — the arm and hand tables come from the caller's proportion set. */
  var ARMS_ = opts.arms || ARMS, HAND_ = opts.hand || HAND;
  var root = new Group();
  root.name = opts.name || 'arm';
  var owned = [];

  var shoulder = new Vector3().fromArray(spec.shoulder);
  var elbow = new Vector3().fromArray(spec.elbow);
  var wrist = new Vector3().fromArray(spec.wrist);
  /* R99 — which sign of the ring angle faces the torso, per segment: the
     side toward x = 0 from this arm's shoulder. */
  var towardTorso = spec.shoulder[0] > 0 ? -1 : 1;
  function innerSignOf(a, b) {
    var dir = limbSideDirection(a, b);
    return dir[0] * towardTorso > 0 ? 1 : -1;
  }
  var upperInner = innerSignOf(spec.shoulder, spec.elbow);
  var foreInner = innerSignOf(spec.elbow, spec.wrist);

  /* Upper arm: shoulder -> elbow, in the shoulder joint's local space. */
  var shoulderJoint = new Group();
  shoulderJoint.name = root.name + '-shoulder';
  shoulderJoint.position.copy(shoulder);
  root.add(shoulderJoint);

  /* Six steps rather than four, because a profiled limb needs enough rings to
     actually describe its swell — at four the bicep belly lands between rings
     and the arm stays a cone with a kink in it. */
  /* R108 c — THE JOINT IS BURIED, NOT BUTTED. Two capped tubes ending at the
     same point meet as two rounded cap rims with a slot between them, which
     the 3x clay showed as a dark ring at every elbow — a pipe joint. The
     upper arm now runs 0.035 PAST the elbow into the forearm, whose first
     ring (0.80 of foreRadius, profiles.fore) is a hair wider than the upper
     arm's end (0.78), so the two surfaces cross at a shallow angle just
     below the joint and both cap discs are inside the other tube. The
     elbow ball fills the wedge on the outside of the bend as before. */
  /* Round 5: the burial SCALES WITH THE BEND. The seam is a normal artifact
     — the forge's smooth normal at a tube's end ring averages in its cap
     disc, so the forearm's first band is lit as a rounded rim and the upper
     arm's last band as a dark ring whatever the geometry does — and the
     cure is to put those bands INSIDE the other tube. On the hanging arm
     (a 4-degree bend) the upper arm runs 0.06 past the joint and the
     forearm starts 0.045 before it; on the presenting arm (folded to 150
     degrees) the same extension stood out under the elbow as a flat stump,
     so there the factor is zero and the ball fills the wedge as before. */
  var upperVec = elbow.clone().sub(shoulder);
  var foreVec0 = wrist.clone().sub(elbow);
  var bendK = Math.max(0, upperVec.clone().normalize().dot(foreVec0.clone().normalize()));
  bendK = bendK * bendK;
  var upperEnd = upperVec.clone().add(upperVec.clone().normalize().multiplyScalar(0.06 * bendK));
  var continuous = opts.maleAnatomy ? maleShoulderArm(spec, upperEnd.toArray(), upperInner, opts.legacyArms) : null;
  var junction = opts.maleAnatomy ? maleElbowEnvelope(spec,upperVec.toArray(),foreVec0.toArray(),bendK) : null;
  /* R166 pin — a proportion set whose regional refiners were authored against
     an earlier arm keeps that arm (see `armDesign` in arm-anatomy.js). Only the
     R123+ male surfaces are withheld; the ring cage, steps and samples are the
     same, so this is the retained arm, not a reduced one. */
  var legacyArms=!!opts.legacyArms;
  var sectionControl=opts.maleAnatomy&&!legacyArms&&MRMAH_MORPHOLOGY.arms.planeDesign.sectionFaces, sectionFrames=[];
  var upperGeo = continuous ? segment(continuous.start, continuous.end,
    continuous.radius, continuous.radius, 24,
    { depthRatio: 1.12, crystal: 0, facet: 0, steps: 18, normalWeight: 'angle', anatomicalPhase: true, angleAt: function(d,t){return maleUpperAngle(d,t,upperInner,legacyArms);},
      samplesT: [-.40,-.34,-.26,-.16,-.08,0,.08,.16,.25,.315,.39,.47,.54,.61,.69,.78,.88,.95,1].map(h=>(h+.40)/1.40),
      profile: continuous.profile, shape: continuous.shape, centreAt: continuous.centreAt,
      surfaceWorld: junction ? function(p,t){var q=maleUpperPlanes(p,t,spec,upperEnd.toArray(),legacyArms);return sectionControl?q:junction(q,t,false);} : undefined,
      ringWorld: sectionControl ? function(points,t,angles){var q=maleUpperSectionFaces(points,t,angles,upperInner).map(p=>junction(p,t,false));sectionFrames.push({h:-.4+1.4*t,angles,points:q});return q;} : undefined,
      lift: ARMS_.classLift, classes: REGIONS.UPPER_ARM.classes, columns: true,
      zoneAt: armZone(REGIONS.UPPER_ARM.classes, upperInner), coat: REGIONS.UPPER_ARM.coat }
  ) : segment(
    [0, 0, 0], upperEnd.toArray(),
    spec.upperRadius, spec.foreRadius * 1.02, 16,   /* R105: twelve sides — a belly needs vertices to be round; R108 c: sixteen, so the horseshoe's two heads and its tendon flat each land on their own vertices */
    /* R90: depthRatio goes above 1 and the cross-section is now SHAPED.

       The upper arm is deeper front-to-back than it is wide, because that is
       where a bicep and a tricep live — a round tube has nowhere to put either,
       which is why the profile swell alone only ever produced a fatter pipe.
       Ten sides rather than eight so the bicep and tricep lobes each land on
       their own pair of facets instead of sharing one. */
    /* R95: fewer, longer planes — five steps, strips seeded as columns and
       named by armZone — and a touch less relief so a strip stays one plane. */
    /* R96: eight sides by three steps, not ten by five. Reference A's upper arm
       is six or eight large graded planes; fifty small quads cannot grade —
       the facet dome (crystal-shader.js) is gated on face size and had
       nothing to work on — and read as a quilt beside the reference. */
    /* R99: deeper front-to-back (1.12 -> 1.18) so the bicep and tricep are
       two volumes the silhouette shows from the side, not two colours. */
    /* R108: depthRatio back to 0.94. The bellies in shapes.upper now put the
       depth where it belongs (a 1.28 front, a 1.20 rear at the peak); on a
       tube that was ALSO 1.18 deeper than wide the arm was a lens — 0.20
       wide by 0.45 deep at the biceps. */
    { depthRatio: 1.12, crystal: opts.maleAnatomy ? 0 : 0.012, facet: opts.maleAnatomy ? 0 : 0.010, steps: 10, fg: [1, 3],   /* R105: seven rings so the belly can PEAK; R107: ten rings, fourteen sides, less jitter — the belly is a curve first; R108 c: 1.12 — the side view measured the cap at 1.27x the arm's depth against the reference's ~1.1, and the depth belongs to the biceps / triceps, not the cap */
      profile: opts.maleAnatomy ? maleUpperProfile : ARMS_.profiles.upper, shape: function (t, d) { return opts.maleAnatomy ? maleUpperShape(t, d, upperInner, legacyArms) : ARMS_.shapes.upper(t, d, upperInner, false); }, lift: ARMS_.classLift,
      classes: REGIONS.UPPER_ARM.classes, columns: true, zoneAt: armZone(REGIONS.UPPER_ARM.classes, upperInner),
      coat: REGIONS.UPPER_ARM.coat,
      /* R91: the upper arm meets the deltoid at the deltoid's value and reaches
         its own by the bicep belly, for the same reason the cap ramps into the
         torso — a limb that starts at a different value from the thing it
         emerges from reads as a separate object stuck to it. */
      hero: function (t) {
        var k = Math.min(1, t / 0.45);
        return ARMS_.deltoidLift + (ARMS_.classLift - ARMS_.deltoidLift) * k * k * (3 - 2 * k);
      } }
  );
  if (opts.maleAnatomy) maleArmRecesses(upperGeo,spec,upperEnd.toArray());
  if (opts.maleAnatomy && !legacyArms) {maleTricepsSurface(upperGeo,spec,upperEnd.toArray());maleBicepsReturn(upperGeo,spec,upperEnd.toArray());maleBicepsSurface(upperGeo,spec,upperEnd.toArray());}
  if (opts.maleAnatomy && opts.authoringMaster) authorArmMaster(upperGeo,spec,upperEnd.toArray());
  var upper = clad(shoulderJoint, upperGeo, materials, 0, null, root.name + '-upper');
  owned.push(upperGeo, upper.edges, upper.minorEdges);

  /* Forearm hangs off an elbow joint so the elbow can actually bend. */
  var elbowJoint = new Group();
  elbowJoint.name = root.name + '-elbow';
  elbowJoint.position.copy(elbow.clone().sub(shoulder));
  shoulderJoint.add(elbowJoint);

  var foreVec = wrist.clone().sub(elbow);
  var foreAxis=foreVec.clone().normalize();
  var palmDirection=new Vector3(0,0,1).applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),foreAxis));
  var thumbDirection=new Vector3(-1,0,0).applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),foreAxis));
  var foreFrame={thumb:thumbDirection.toArray(),palm:palmDirection.toArray()};
  var foreFront=new Vector3(0,0,1).addScaledVector(foreAxis,-foreAxis.z).normalize();
  var forePositive=new Vector3().fromArray(limbSideDirection(spec.elbow,spec.wrist));
  var forePalmAngle=Math.atan2(palmDirection.dot(forePositive),palmDirection.dot(foreFront));
  var foreStart = foreVec.clone().normalize().multiplyScalar(-0.045 * bendK);
  var foreGeo = segment(
    foreStart.toArray(), foreVec.toArray(),
    spec.foreRadius, spec.wristRadius, opts.maleAnatomy ? 18 : 16,   /* sample the asymmetric male forearm territories */
    /* R98: five steps so the extensor belly just under the elbow has a ring
       to peak on and the taper into the wrist has two to fall through. */
    { depthRatio: 1.06, crystal: opts.maleAnatomy ? 0 : 0.010, facet: opts.maleAnatomy ? 0 : undefined, steps: opts.maleAnatomy ? 10 : 9, fg: [1, 2], normalWeight: opts.maleAnatomy ? 'angle' : undefined,
      samplesT: opts.maleAnatomy ? [0,.055,.12,.20,.30,.42,.55,.67,.79,.90,1] : undefined,
      surfaceWorld: opts.maleAnatomy ? function(p,t){
        var shaped=maleForePlanes(p,t,foreFrame,spec,bendK,legacyArms);
        var q=junction?junction(shaped,t,true):shaped;
        // The last disc is seated inside the new wrist transition.
        var k=Math.max(0,Math.min(1,(t-.88)/.12));k=k*k*(3-2*k);
        var axial=q[0]*foreAxis.x+q[1]*foreAxis.y+q[2]*foreAxis.z;
        return q.map(function(v,i){var c=[foreAxis.x,foreAxis.y,foreAxis.z][i]*axial;return c+(v-c)*(1-.14*k);});
      } : undefined,
      profile: opts.maleAnatomy ? function(t) { return maleForeProfile(t,bendK,legacyArms); } : ARMS_.profiles.fore, shape: function (t, d) { return opts.maleAnatomy ? maleForeShape(t, d, foreInner, forePalmAngle) : ARMS_.shapes.fore(t, d, foreInner, false); }, lift: ARMS_.classLift,
      classes: REGIONS.FOREARM.classes, columns: true, zoneAt: armZone(REGIONS.FOREARM.classes, foreInner),
      coat: REGIONS.FOREARM.coat }
  );
  if (opts.maleAnatomy && opts.authoringMaster) authorArmMaster(foreGeo,spec,foreVec.toArray(),foreFrame);
  if (opts.maleAnatomy) blendArmSeam(upperGeo,foreGeo,upperVec.toArray(),junction);
  if (sectionControl) maleUpperSectionNormals(upperGeo,sectionFrames,upperEnd.toArray(),spec,upperInner);
  if (opts.maleAnatomy && !legacyArms) maleBicepsFacingNormals(upperGeo,spec,upperEnd.toArray());
  if(opts.maleAnatomy && opts.authoringMaster)authorForearmOrigin(foreGeo,foreAxis,palmDirection,thumbDirection,foreVec.length(),spec.shoulder[0]<0?'R':'L');
  // R177: the nearly straight arm's two end surfaces competed at the
  // same depth. Fit only the buried upper-arm end to the final forearm.
  if(opts.maleAnatomy && opts.authoringMaster && bendK>.85){
    seatUpperArmOverlap(upperGeo,foreGeo,upperVec,foreAxis);
    // The radial return now owns the surface from the joint origin onward.
    // Its atlas can end at that measured ownership boundary, not an old band.
    if(foreGeo.userData.forearmOriginSupport)foreGeo.userData.forearmOriginSupport.jointReturnStartH=0;
    // Edge buffers are owned already, but have not been uploaded at mount.
    // Refresh them after this last positional correction, without new nodes.
    for(const [edge,angle]of [[upper.edges,48],[upper.minorEdges,36]]){const updated=new EdgesGeometry(upperGeo,angle);edge.copy(updated);updated.dispose();}
  }
  if(opts.maleAnatomy && opts.authoringMaster){
    if(spec.shoulder[0]>0)authorDistalArmContactReturn(upperGeo,foreGeo,spec);
    // One final anatomical owner follows the retained joint construction.
    // Static rest-space muscle bellies supersede the old arm facets/returns.
    authorMuscleBellies(upperGeo,spec,upperEnd.toArray());
    if(opts.torsoGeometry)fitShoulderTorsoAttachment(upperGeo,opts.torsoGeometry,spec);
    authorForearmBellies(foreGeo,foreAxis,palmDirection,thumbDirection,foreVec.length(),spec.shoulder[0]<0?'R':'L');
    // R190: the final muscle surfaces supersede the earlier joint stock.
    // Reconcile only the buried distal overlap against the final forearm.
    if(bendK>.85){
      seatUpperArmOverlap(upperGeo,foreGeo,upperVec,foreAxis,{finalSurfaces:true});
      upperGeo.userData.finalElbowSeating={version:'R190',owner:'buried distal upper-arm overlap',source:'final retained upper and forearm muscle skins',maxInward:upperGeo.userData.elbowOverlapSeating.maxInward,clearance:.00035,limit:.016,status:'PARTIAL: static overlap artifact reduced; rigid and skinned deformation gates remain open'};
    }
    // R186: preserve the new skin's geometric normals; the old proximity
    // average includes unrelated forearm normals across the elbow bend.
    foreGeo.userData.armDiamondOverlayDisabled={version:'R185',reason:'retain forearm mass; stop decorative arm diamond partitioning'};
    foreGeo.userData.supersededArmAtlas={planes:foreGeo.userData.diamondPlaneAtlas?.length||0,reason:'R185 muscle-belly art'};foreGeo.userData.diamondPlaneAtlas=[];
    for(const [edge,angle]of [[upper.edges,48],[upper.minorEdges,36]]){const updated=new EdgesGeometry(upperGeo,angle);edge.copy(updated);updated.dispose();}
  }
  var fore = clad(elbowJoint, foreGeo, materials, 0, null, root.name + '-fore');
  owned.push(foreGeo, fore.edges, fore.minorEdges);

  /* R96 — THE JOINTS ARE DARK STEEL. Reference A's elbow is a small dark
     mechanical knuckle between the two crystal masses, and its wrist carries
     a cuff ring; both hide the segments' end discs — the flat pale facet that
     showed at every elbow — and read as machined joints in the crystal. Drawn
     in the cavity material (dark, barely reflective), no edge lines. */
  /* R106: sized to the UPPER arm's end (0.126) rather than the forearm's
     start (0.10): the wedge that opens on the outside of the bend between
     the two tubes' end discs was a black gap with a flat lid in the clay
     view; the knob now fills it and its peak is flush with the larger tube. */
  /* R108: sized to the FOREARM'S FIRST RING (profiles.fore(0)), which the
     upper arm's last ring now matches, so the ball only fills the wedge on
     the outside of the bend and never stands proud of either tube — at
     0.78 of the upper radius (0.117 against tubes of 0.093) it showed as a
     bulging ring at every elbow, the "mechanical hinge" the brief rules out.
     The elbow is a compression between two equal tubes with a bony
     landmark (the olecranon in shapes.upper), not a knuckle. */
  /* Round 5: on the folded arm (bendK 0) the ball grows a tenth, because the
     upper arm's end ring there carries the olecranon and the brachioradialis
     origin (up to 1.14 of its radius) and the wedge on the outside of the
     bend showed that ring's flat disc past a ball sized to the bare radius.
     On the hanging arm the tubes overlap and the ball stays flush. */
  /* R255 — SIZED FROM THE PROFILE THE FOREARM IS ACTUALLY BUILT WITH. This read
     `ARMS_.profiles.fore(0)` — the generic profile, 0.77 — while the male arm is
     lofted with `maleForeProfile`, whose pose burial takes its root to 0.63 on a
     straight elbow (0.52 before R255 raised it). The ball was therefore 1.47x the tube it emerges into and
     read as a bead between two tapers. Taking the same function makes it flush
     with the forearm's own root by construction, in every pose. Gated on
     `legacyArms` so Mrs. Mah, whose arms come through this same path, is
     untouched. */
  var foreRoot = (opts.maleAnatomy && !legacyArms) ? maleForeProfile(0, bendK, false) : ARMS_.profiles.fore(0);
  var eR = spec.foreRadius * foreRoot * (1.0 + 0.12 * (1 - bendK));
  /* A BALL, not a drum: its end discs closed to half the radius so they sit
     inside both tubes (a drum's disc showed as a bright flat lid on the
     outside of the bend as soon as it was sized to the upper arm). */
  /* Round 6: a TRUE ball. At 0.5 + 0.5 sin the end discs were half the
     radius, and on the folded arm — where no tube covers the underside of
     the joint — the lower disc showed as a flat lid under the elbow. Ends
     at 0.12 of the radius, four steps, so what shows is a sphere. */
  var elbowGeo = segment([0, -eR * 0.95, 0], [0, eR * 0.95, 0], eR, eR, 8,
    { depthRatio: 1.0, crystal: 0.015, steps: 8,   /* eight steps: on the folded arm the ball's lower half IS the elbow's point, and four steps drew it as a shelf */
      profile: function (t) { return 0.12 + Math.pow(Math.sin(t * Math.PI), 0.8) * 0.88; },
      surfaceWorld: junction && junction.knob ? function(p){return junction.knob(p);} : undefined });
  if(junction && junction.knob){
    var ep=elbowGeo.attributes.position,en=elbowGeo.attributes.aSmooth;
    for(var ei=0;ei<ep.count;ei++){var ef=junction.normal([ep.getX(ei),ep.getY(ei),ep.getZ(ei)],true);if(ef)en.setXYZ(ei,ef.n[0],ef.n[1],ef.n[2]);}
  }
  // R179: measured radial cap protrusion, distinct from the R177 upper-end
  // contact. Preserve the posterior pseudo-joint and the folded envelope.
  if(opts.maleAnatomy && opts.authoringMaster && bendK>.85)
    seatRadialElbowCap(elbowGeo,upperGeo,foreGeo,upperVec,foreAxis,palmDirection,thumbDirection);
  var elbowKnob = new Mesh(elbowGeo, materials.joint || materials.cavity);
  elbowKnob.name = root.name + '-elbow-knob';
  elbowJoint.add(elbowKnob);
  owned.push(elbowGeo);

  /* R98 — THE HINGE. A knuckle ring alone is a bend in a pipe; an elbow is
     a hinge, and the platinum references draw it as one: a steel pin across
     the joint whose two bosses show on the outer and inner elbow. The pin
     lies along the arm's LATERAL axis (the upper arm's direction crossed with
     forward), which is the axis a forearm actually swings about, and it is
     long enough to stand a little proud of the arm's tube on both sides so a
     boss reads from the front and from the three-quarter. Same gunmetal as
     the knuckle, no edge lines. */
  var upDir = elbow.clone().sub(shoulder).normalize();
  var lateral = new Vector3(0, 0, 1).cross(upDir);
  if (lateral.lengthSq() < 1e-6) lateral.set(1, 0, 0);
  lateral.normalize();
  var pinHalf = eR * (opts.maleAnatomy ? .76 : 0.90), pinR = eR * 0.34;   /* R108 c: 0.90 — at 1.00 the boss showed as a spike on the outer elbow of the compressed joint */   /* R99: bosses just proud of the tube — compression, not a bolt; R108: flush — the bosses show only where the elbow compression exposes them, as the epicondyles, not as a bolt through the arm */
  var pinGeo = segment(
    lateral.clone().multiplyScalar(-pinHalf).toArray(),
    lateral.clone().multiplyScalar(pinHalf).toArray(),
    pinR, pinR, 8,
    { depthRatio: 1.0, crystal: 0.0, steps: 2,
      /* a boss at each end, a waist through the joint */
      profile: function (t) { var e = Math.abs(t - 0.5) * 2; return 0.72 + 0.28 * e * e; } });
  // R170: the internal hinge must not pierce the existing anatomical shell.
  // Clip only protruding pin vertices to the measured shell support planes.
  if(opts.maleAnatomy && opts.authoringMaster)seatElbowPin(pinGeo,elbowGeo);
  var pin = new Mesh(pinGeo, materials.joint || materials.cavity);
  pin.name = root.name + '-elbow-pin';
  elbowJoint.add(pin);
  owned.push(pinGeo);

  if(opts.maleAnatomy && opts.authoringMaster){
    const bridgeGeo=bendK>.85?createElbowContinuity(upperGeo,foreGeo,upperVec,foreAxis,palmDirection,thumbDirection):createFoldedElbowContinuity(upperGeo,foreGeo,upperVec,foreAxis);
    const bridge=createBoundElbowSkin(bridgeGeo,materials.body,elbowJoint,foreAxis);bridge.name=root.name+'-elbow-skin';owned.push(bridgeGeo,bridge.skeleton);
    elbowKnob.visible=false;pin.visible=false;
    for(const part of [upper,fore])for(const [edge,angle]of [[part.edges,48],[part.minorEdges,36]]){const g=new EdgesGeometry((part===upper?upperGeo:foreGeo),angle);edge.copy(g);g.dispose();}
  }

  /* Wrist joint, oriented so the hand continues along the forearm axis. */
  var wristJoint = new Group();
  wristJoint.name = root.name + '-wrist';
  wristJoint.position.copy(foreVec);
  var dir = foreVec.clone().normalize();
  wristJoint.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
  elbowJoint.add(wristJoint);

  /* The wrist cuff, in the wrist's own frame so it rings the forearm's end. */
  /* R108: sized from the forearm's LAST ring (wristRadius x profiles.fore(1)
     = 0.047), not from the nominal wrist radius (0.074): the cuff was half
     again as wide as the tube it ringed and read as a flat box at every
     wrist in the clay. A hair proud (1.08) with its ends drawn in so it is a
     band on the wrist, the compression before the hand expands. */
  var cR = spec.wristRadius * ARMS_.profiles.fore(1) * 1.08;
  var fitWrist=opts.maleAnatomy&&opts.authoringMaster;
  var wristSurface=opts.maleAnatomy?maleWristSurface(spec,HAND_,foreVec.length()-foreStart.dot(foreAxis),bendK,fitWrist,legacyArms):null;
  if(fitWrist)wristSurface=fitWristToForearm(wristSurface,foreGeo,foreVec,wristJoint.quaternion);
  var cuffGeo = segment([0, opts.maleAnatomy?-.042:-0.026, 0], [0, opts.maleAnatomy?.030:0.022, 0], cR, cR * 0.97, 10,
    { depthRatio: 0.92, crystal: fitWrist?0:0.006, steps: fitWrist?4:2,
      samplesT: fitWrist?[0,.25,7/12,.8,1]:undefined,
      ringWorld: fitWrist?function(points,t){return fitWristColumns(points,HAND_,wristSurface,t);}:undefined,
      profile: function (t) { return 0.90 + 0.10 * Math.sin(t * Math.PI); },
      surfaceWorld: wristSurface });
  if(fitWrist)cuffGeo.userData.wristConnectorFit={version:'R171',source:'existing pentagonal palm root',palmRootY:0,radialPalmClearance:.0002,previousBlendEndY:.015,columns:10,structuralCorners:5,stations:[-.042,-.024,0,.0156,.030],method:'five palm-corner columns plus five edge support columns; transition closes at actual palm root; hand and forearm geometry unchanged',status:'inspect palm seam'};
  if(fitWrist)cuffGeo.userData.wristForearmFit=wristSurface.fit;
  if(wristSurface){
    var wp=cuffGeo.attributes.position,wn=cuffGeo.attributes.aSmooth;
    for(var wi=0;wi<wp.count;wi++){
      var wy=wp.getY(wi),wa=Math.atan2(wp.getZ(wi),wp.getX(wi)),eps=.0001;
      var at=function(a,y){return new Vector3().fromArray(wristSurface([Math.cos(a),y,Math.sin(a)]));};
      var tang=at(wa+eps,wy).sub(at(wa-eps,wy));
      var along=at(wa,wy+eps).sub(at(wa,wy-eps));
      var normal=along.cross(tang).normalize();wn.setXYZ(wi,normal.x,normal.y,normal.z);
    }
  }
  var cuff = new Mesh(cuffGeo, materials.joint || materials.cavity);
  cuff.name = root.name + '-wrist-cuff';
  wristJoint.add(cuff);
  owned.push(cuffGeo);

  var hand = buildHand(materials, HAND_, { open: !!opts.openHand, tipDiamond: !!opts.tipDiamond, makeLamp: opts.makeLamp });
  wristJoint.add(hand.group);

  return {
    group: root,
    shoulderJoint: shoulderJoint,
    elbowJoint: elbowJoint,
    wristJoint: wristJoint,
    hand: hand.group,
    crystal: hand.crystal,
    dispose: function () { hand.dispose(); owned.forEach(function (g) { if (g && g.dispose) g.dispose(); }); }
  };
}

export function buildLimbs(materials, P, options={}) {
  var ARMS_ = (P && P.ARMS) || ARMS, HAND_ = (P && P.HAND) || HAND;
  var group = new Group();
  group.name = 'mrmah-limbs';

  /* The lowered arm's hand is relaxed and partly closed; the raised one is
     open and carries the tip diamond. */
  var legacyArms = !!(P && P.legacyArms);
  var right = buildArm(materials, ARMS_.right, { name: 'arm-right', maleAnatomy: !P || P.name !== 'female', legacyArms: legacyArms, authoringMaster: options.authoringMaster, torsoGeometry: options.torsoGeometry, openHand: false, arms: ARMS_, hand: HAND_ });
  /* R98 — the raised hand carries the crystal's own lamp (see buildHand). */
  var handLamp = null;
  var left = buildArm(materials, ARMS_.left, { name: 'arm-left', maleAnatomy: !P || P.name !== 'female', legacyArms: legacyArms, authoringMaster: options.authoringMaster, torsoGeometry: options.torsoGeometry, openHand: true, tipDiamond: true, arms: ARMS_, hand: HAND_,
    makeLamp: function () {
      handLamp = new PointLight(materials.emissive.color.clone(), 0.95, 0.56, 2);   /* R101: fingertips, palm and a grazing of forearm */
      return handLamp;
    } });

  group.add(right.group);
  group.add(left.group);

  return {
    group: group,
    right: right,
    left: left,
    /* the hand crystal's lamp, so the character can ride it on its glow */
    handLamp: handLamp,
    dispose: function () { right.dispose(); left.dispose(); if (handLamp && handLamp.dispose) handLamp.dispose(); }
  };
}

function seatElbowPin(pin,shell){
 const p=shell.attributes.position,planes=[],a=new Vector3(),b=new Vector3(),c=new Vector3();
 for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);const n=b.clone().sub(a).cross(c.clone().sub(a));if(n.lengthSq()<1e-18)continue;n.normalize();const d=n.dot(a);if(d<=0)throw new Error('Elbow shell must contain its hinge origin');planes.push({n,d});}
 const margin=.0005;let changed=0,maxDisplacement=0;
 sculptSurfaceRegion(pin,{name:'R170 internal elbow pin seating',sample:before=>{const q=new Vector3(...before),r=q.length();if(r<1e-9)return null;const dir=q.clone().divideScalar(r);let limit=Infinity;for(const {n,d}of planes){const dot=n.dot(dir);if(dot>1e-9)limit=Math.min(limit,(d-margin)/dot);}if(r<=limit)return null;const delta=r-limit;if(delta>.020)throw new Error('Elbow pin exceeds local seating limit');changed++;maxDisplacement=Math.max(maxDisplacement,delta);return dir.multiplyScalar(limit).toArray();}});
 pin.userData.elbowPinSeating={version:'R170',support:'existing anatomical elbow shell triangle halfspaces, rest-local frame',clearance:margin,changedTriangleCorners:changed,maxDisplacement,method:'Only pin vertices outside shell interior move; anatomical shell, muscles and transforms unchanged.',status:'inspect folded/open poses'};
}

// R171: longitudinal support columns track the unchanged palm pentagon.
// Ring winding follows increasing XZ angle, as in the original +Y segment.
function fitWristColumns(points,hand,surface,t){
 const y=-.042+.072*t,u=Math.max(0,y/hand.palmLength),w=hand.palmHalfWidth*(.55+.45*u),d=hand.palmHalfDepth*(.75+.25*u),ridge=hand.palmHalfDepth*(1.02+.30*u);
 const corners=[[-w,d],[0,ridge],[w,d],[w,-d],[-w,-d]].map(q=>Math.atan2(q[1],q[0])).sort((a,b)=>a-b),angles=[];
 for(let i=0;i<5;i++){const a=corners[i],b=i===4?corners[0]+Math.PI*2:corners[i+1];angles.push(a,(a+b)/2);}
 return angles.map(a=>surface([Math.cos(a),y,Math.sin(a)]));
}


// R174: fit the proximal connector to the ACTUAL retained forearm triangles,
// not its older analytic radius profile. Only excess outward radius is seated;
// the palm-root interval and hand stay unchanged. Coordinates are wrist-local.
function fitWristToForearm(surface,geometry,origin,rotation){
 const inverse=rotation.clone().invert(),position=geometry.attributes.position,triangles=[];
 for(let i=0;i<position.count;i+=3){
  const ps=[0,1,2].map(j=>new Vector3().fromBufferAttribute(position,i+j).sub(origin).applyQuaternion(inverse));
  if(Math.max(...ps.map(p=>p.y))>-.065)triangles.push(ps);
 }
 const cache=new Map(),fit={version:'R174',source:'retained distal forearm triangles in rest wrist frame',radialClearance:.0002,fullFitThroughY:-.024,fadeEndY:-.012,maxRadialCorrection:0,queries:0,misses:0};
 const sample=point=>{
  const p=surface(point),y=p[1],r=Math.hypot(p[0],p[2]);
  if(y>=-.012||r<1e-8)return p;
  const n=new Vector3(p[0]/r,0,p[2]/r),key=Math.atan2(n.z,n.x).toFixed(9)+':'+y.toFixed(9);
  let foreR=cache.get(key);
  if(foreR===undefined){
   const ray=new Ray(n.clone().multiplyScalar(.3).add(new Vector3(0,y,0)),n.clone().negate()),hit=new Vector3();foreR=-Infinity;
   for(const[a,b,c]of triangles)if(ray.intersectTriangle(a,b,c,false,hit))foreR=Math.max(foreR,hit.dot(n));
   if(!Number.isFinite(foreR)){fit.misses++;throw new Error('Wrist fit outside distal forearm support');}
   cache.set(key,foreR);fit.queries++;
  }
  const t=Math.max(0,Math.min(1,(y+.024)/.012)),weight=1-t*t*(3-2*t),correction=Math.max(0,r-(foreR-fit.radialClearance))*weight;
  fit.maxRadialCorrection=Math.max(fit.maxRadialCorrection,correction);
  return [n.x*(r-correction),y,n.z*(r-correction)];
 };
 sample.fit=fit;return sample;
}

// R177: finite clearance at the existing rigid-segment overlap. This is
// interior seating, not a circumferential anatomical groove. The folded
// arm uses a different joint envelope and never enters this correction.
export function seatUpperArmOverlap(upper,fore,elbowOffset,axis,options={}){
 const p=fore.attributes.position,stock=[],cache=new Map();
 // Radial probes have fixed axial height. Triangles outside this local
 // interval cannot intersect them; omit the rest of the forearm at mount.
 for(let i=0;i<p.count;i+=3){const tri=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j)),h=tri.map(v=>v.dot(axis));if(Math.max(...h)>=-.021&&Math.min(...h)<=.076)stock.push(...tri);}
 const jointNormals=Object.fromEntries(['aSmooth','aMoldNormal'].filter(n=>upper.attributes[n]).map(n=>[n,upper.attributes[n].array.slice()]));
 const clearance=.00035,fade=[-.020,0],samples=[];
 const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
 let moved=0,maxInward=0;
 sculptSurfaceRegion(upper,{name:'R177 measured upper-arm end seating inside forearm',sample:before=>{
  const q=new Vector3(...before).sub(elbowOffset),h=q.dot(axis);if(h<=fade[0]||h>.075)return null;
  const radial=q.clone().addScaledVector(axis,-h),radius=radial.length();if(radius<1e-8)return null;const d=radial.divideScalar(radius),key=before.join(',');
  let support=cache.get(key);if(support===undefined){
   const c=axis.clone().multiplyScalar(h),ray=new Ray(c.clone().addScaledVector(d,.5),d.clone().negate()),hit=new Vector3();support=-Infinity;
   for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))support=Math.max(support,hit.clone().sub(c).dot(d));
   if(!Number.isFinite(support))throw new Error('Upper overlap has no forearm support');cache.set(key,support);
  }
  const amount=Math.max(0,radius-support+clearance)*smooth((h-fade[0])/(fade[1]-fade[0]));
   if(amount>(options.finalSurfaces ? .016 : .012))throw new Error('Upper overlap exceeds local seating allowance '+amount);if(amount<1e-8)return null;
  moved++;maxInward=Math.max(maxInward,amount);samples.push({h,beforeRadius:radius,supportRadius:support,afterRadius:radius-amount});
  return q.addScaledVector(d,-amount).add(elbowOffset).toArray();
 }});
 // Measured barycentric contact constraints. Correct only the corners
 // participating in a protruding chord, without extending a neighboring
 // plane outside its footprint or adding global subdivision.
 const fitted=upper.attributes.position,corrections=new Map(),keyOf=v=>v.toArray().map(x=>Math.round(x*1e6)).join(',');let contacts=0,maxResidual=0;
 for(let i=0;i<fitted.count;i+=3){const vs=[0,1,2].map(j=>new Vector3().fromBufferAttribute(fitted,i+j).sub(elbowOffset)),hs=vs.map(v=>v.dot(axis));if(hs.every(h=>h<0)||hs.every(h=>h>.075))continue;
  for(const w of [[1/3,1/3,1/3],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){
   const q=vs.reduce((v,p,j)=>v.addScaledVector(p,w[j]),new Vector3()),h=q.dot(axis);if(h<0||h>.065)continue;const c=axis.clone().multiplyScalar(h),radial=q.clone().sub(c),radius=radial.length();if(radius<.025)continue;const d=radial.divideScalar(radius),ray=new Ray(c.clone().addScaledVector(d,.5),d.clone().negate()),hit=new Vector3();let support=-Infinity;
   for(let j=0;j<stock.length;j+=3)if(ray.intersectTriangle(stock[j],stock[j+1],stock[j+2],false,hit))support=Math.max(support,hit.clone().sub(c).dot(d));
   const error=radius-support;if(error<=2e-7)continue;
   const dirs=vs.map((v,j)=>v.clone().addScaledVector(axis,-hs[j]).normalize()),influence=w.reduce((t,v,j)=>t+(hs[j]>=0?v*Math.max(0,dirs[j].dot(d)):0),0);
   if(influence<.25)throw new Error('Elbow contact lacks local movable support');
    const amount=(error+clearance)/influence;if(amount>.003)throw new Error('Elbow barycentric contact exceeds local allowance '+amount);
   contacts++;maxResidual=Math.max(maxResidual,error);
   for(let j=0;j<3;j++){if(hs[j]<0||w[j]===0)continue;const k=keyOf(vs[j].clone().add(elbowOffset)),old=corrections.get(k);if(!old||old.amount<amount)corrections.set(k,{amount,d:dirs[j]});}
  }
 }
 let contactCorners=0,maxContactCorrection=0;
 if(corrections.size)sculptSurfaceRegion(upper,{name:'R177 barycentric contact seating on measured forearm support',sample:before=>{const c=corrections.get(keyOf(new Vector3(...before)));if(!c)return null;contactCorners++;maxContactCorrection=Math.max(maxContactCorrection,c.amount);return new Vector3(...before).addScaledVector(c.d,-c.amount).toArray();}});
 // Joint normals belong to the retained common envelope, not the buried
 // end-face triangles. Preserve that field through interior fitting.
 for(const[n,array]of Object.entries(jointNormals)){upper.attributes[n].array.set(array);upper.attributes[n].needsUpdate=true;}
 upper.userData.elbowOverlapSeating={version:'R177',frame:'actual elbow origin and forearm longitudinal axis; full retained forearm triangles',axis:axis.toArray(),elbowOffset:elbowOffset.toArray(),clearance,fade,changedTriangleCorners:moved,maxInward,samples,contactCorrection:{contacts,contactCorners,maxContactCorrection,maxResidual,uniqueVertices:corrections.size,method:'one measured barycentric constraint pass; fixed forearm surface and unchanged topology'},method:'only excess radial upper-end positions move inward; final forearm support measured before atlas; no cap, muscle-belly or pose change',status:'PARTIAL verify contact and supported poses'};
}

// Use the union of the two final arm surfaces as support, not a scaled ball.
// Only the radial cap patch exposed above that union can move, inward only.
function seatRadialElbowCap(cap,upper,fore,offset,axis,front,outer){
 const stock=[],cache=new Map(),smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 for(const [g,shift]of [[upper,offset],[fore,new Vector3()]]){
  const p=g.attributes.position;
  for(let i=0;i<p.count;i+=3){const tri=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i+j).sub(shift)),h=tri.map(v=>v.dot(axis));if(Math.max(...h)>=-.046&&Math.min(...h)<=.041)stock.push(...tri);}
 }
 const normalStock=Object.fromEntries(['aSmooth','aMoldNormal'].filter(n=>cap.attributes[n]).map(n=>[n,cap.attributes[n].array.slice()]));
 const clearance=.00025,samples=[];let changed=0,maxInward=0;
 sculptSurfaceRegion(cap,{name:'R179 radial cap seating against final arm union',sample:before=>{
  const q=new Vector3(...before),h=q.dot(axis),a=Math.atan2(q.dot(outer),q.dot(front));
  const w=smooth(-.045,-.020,h)*(1-smooth(.010,.040,h))*smooth(-.60,-.40,a)*(1-smooth(.25,.45,a));if(w<=0)return null;
  const c=axis.clone().multiplyScalar(h),d=q.clone().sub(c),r=d.length();if(r<1e-8)return null;d.divideScalar(r);
  const key=before.join(',');let support=cache.get(key);
  if(support===undefined){const ray=new Ray(c.clone().addScaledVector(d,.5),d.clone().negate()),hit=new Vector3();support=-Infinity;
   for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))support=Math.max(support,hit.clone().sub(c).dot(d));
   if(!Number.isFinite(support))throw new Error('Radial elbow cap has no final arm support');cache.set(key,support);
  }
  const amount=Math.max(0,r-support+clearance)*w;if(amount>.004)throw new Error('Radial cap exceeds local seating allowance '+amount);if(amount<1e-8)return null;
  changed++;maxInward=Math.max(maxInward,amount);samples.push({h,angle:a,beforeRadius:r,supportRadius:support,afterRadius:r-amount,weight:w});return q.addScaledVector(d,-amount).toArray();
 }});
 // One bounded triangle-interior contact pass. A single fitted corner can
 // leave its neighboring chord outside a different supporting arm triangle.
 const points=Array.from({length:cap.attributes.position.count},(_,i)=>new Vector3().fromBufferAttribute(cap.attributes.position,i)),corrections=new Map(),keyOf=p=>p.toArray().map(v=>Math.round(v*1e6)).join(',');let contacts=0,maxResidual=0;
 for(let hi=0;hi<=16;hi++)for(let ai=0;ai<=24;ai++){
  const h=-.020+.030*hi/16,a=-.40+.65*ai/24,c=axis.clone().multiplyScalar(h),d=front.clone().multiplyScalar(Math.cos(a)).addScaledVector(outer,Math.sin(a)),ray=new Ray(c.clone().addScaledVector(d,.5),d.clone().negate()),hit=new Vector3();let support=-Infinity,radius=-Infinity,triangle=-1,capPoint=null;
  for(let i=0;i<stock.length;i+=3)if(ray.intersectTriangle(stock[i],stock[i+1],stock[i+2],false,hit))support=Math.max(support,hit.clone().sub(c).dot(d));
  for(let i=0;i<points.length;i+=3)if(ray.intersectTriangle(points[i],points[i+1],points[i+2],false,hit)){const r=hit.clone().sub(c).dot(d);if(r>radius){radius=r;triangle=i;capPoint=hit.clone();}}
  if(triangle<0||!Number.isFinite(support)||radius-support<=2e-7)continue;
  const vs=points.slice(triangle,triangle+3),e0=vs[1].clone().sub(vs[0]),e1=vs[2].clone().sub(vs[0]),v=capPoint.clone().sub(vs[0]),x=e0.dot(e0),y=e0.dot(e1),z=e1.dot(e1),det=x*z-y*y,u=(z*v.dot(e0)-y*v.dot(e1))/det,t=(x*v.dot(e1)-y*v.dot(e0))/det,w=[1-u-t,u,t];
  const dirs=vs.map(p=>p.clone().addScaledVector(axis,-p.dot(axis)).normalize()),active=vs.map(p=>{const h=p.dot(axis),a=Math.atan2(p.dot(outer),p.dot(front));return h>-.045&&h<.040&&a>-.60&&a<.45;});
  const influence=w.reduce((s,v,j)=>s+(active[j]?Math.max(0,v)*Math.max(0,dirs[j].dot(d)):0),0);if(influence<.25)throw new Error('Radial cap contact has insufficient local support');
  const amount=(radius-support+clearance)/influence;if(amount>.002)throw new Error('Radial cap chord correction exceeds allowance');contacts++;maxResidual=Math.max(maxResidual,radius-support);
  for(let j=0;j<3;j++)if(active[j]&&w[j]>1e-7){const k=keyOf(vs[j]),old=corrections.get(k);if(!old||old.amount<amount)corrections.set(k,{amount,d:dirs[j]});}
 }
 let contactCorners=0,maxContactCorrection=0;
 if(corrections.size)sculptSurfaceRegion(cap,{name:'R179 radial cap measured triangle-contact seating',sample:before=>{const q=new Vector3(...before),c=corrections.get(keyOf(q));if(!c)return null;contactCorners++;maxContactCorrection=Math.max(maxContactCorrection,c.amount);return q.addScaledVector(c.d,-c.amount).toArray();}});
 // Retain the existing joint envelope field through this interior fitting.
 for(const[n,array]of Object.entries(normalStock)){cap.attributes[n].array.set(array);cap.attributes[n].needsUpdate=true;}
 cap.userData.radialCapSeating={version:'R179',frame:{axis:axis.toArray(),front:front.toArray(),outer:outer.toArray()},axialSupport:[-.045,.040],angleSupport:[-.60,.45],clearance,changedTriangleCorners:changed,maxInward,samples,contactCorrection:{contacts,contactCorners,maxContactCorrection,maxResidual,uniqueVertices:corrections.size,surfaceSamples:425},method:'radial cap only; actual union of final upper and forearm triangles; posterior cap, arm crowns and bone frames protected',status:'PARTIAL inspect local rim and supported poses'};
}
