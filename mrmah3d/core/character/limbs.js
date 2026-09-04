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
  Group, Mesh, EdgesGeometry, LineSegments, Vector3, PointLight
} from '../../vendor/three/three.module.min.js';
import { segment, diamondPlate, facetedGeometry, mergeGeometries } from './forge.js';
import { ARMS, HAND } from './proportions.js';
import { REGIONS } from './regions.js';

/* R95 — THE ARM'S STRIPS ARE NAMED, NOT ROLLED.

   `d` is the angle relative to the limb's front (0 = the bicep side, pi = the
   tricep side), `t` the position along it. The references' arms are a few
   long planes: a lit bicep plane on the front, sapphire flanks, and a dark
   tricep side that reaches the black rows — which is what lets the arm read
   as the same dark crystal as the torso rather than as a softer material. */
function armZone(table) {
  return function (d, t) {
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    var ad = Math.abs(d);
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
    if (ad < 2.30) return { classes: table, seed: 73 + (d > 0 ? 1 : 0), index: 2, coat: 0.35 };   /* toward the back: sapphire too */
    if (ad < 2.75) return { classes: table, seed: 74, index: 1, coat: 0.15 };          /* navy */
    return { classes: table, seed: 75, index: 0, coat: 0.0 };                         /* the tricep side: lost */
  };
}

function clad(group, geo, materials, rimScale, edgeAngles) {
  var ea = edgeAngles || {};
  var mesh = new Mesh(geo, materials.body);
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
  var a = [p(-w * 0.72, 0, d * 0.8), p(0, 0, d * 1.10), p(w * 0.72, 0, d * 0.8),
           p(w * 0.72, 0, -d * 0.8), p(-w * 0.72, 0, -d * 0.8)];
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
  var owned = [];
  var l1 = len * 0.56, l2 = len * 0.44;
  /* proximal segment: leans forward by the curl */
  var a1 = curl * 0.85;
  var mid = [base[0] + dirX * l1, base[1] + Math.cos(a1) * l1, base[2] + Math.sin(a1) * l1];
  var a2 = curl * 1.75;
  var tip = [mid[0] + dirX * l2 * 0.6, mid[1] + Math.cos(a2) * l2, mid[2] + Math.sin(a2) * l2];
  var g1 = segment(base, mid, radius, radius * 0.92, 6,
    { depthRatio: 0.9, crystal: 0.03, steps: 1, lift: ARMS.classLift, classes: REGIONS.HAND.classes, coat: REGIONS.HAND.coat });
  var g2 = segment(mid, tip, radius * 0.92, radius * 0.66, 6,
    { depthRatio: 0.9, crystal: 0.03, steps: 1, lift: ARMS.classLift, classes: REGIONS.HAND.classes, coat: REGIONS.HAND.coat });
  /* The segments are returned, not clad: the hand merges every part into ONE
     geometry (see buildHand) so a hand costs three draws, not thirty. */
  return [g1, g2];
}

function buildHand(materials, spec, options) {
  var opts = options || {};
  var hand = new Group();
  hand.name = 'hand';
  var owned = [];

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
  var curl = opts.open ? 0.22 : 0.38;
  for (var i = 0; i < n; i++) {
    var t = n === 1 ? 0.5 : i / (n - 1);
    var x = (t - 0.5) * spec.palmHalfWidth * 1.50;
    /* Splay the outer digits and shorten them slightly. */
    var splay = (t - 0.5) * (opts.open ? 0.30 : 0.10);
    var len = spec.digitLength * (1 - Math.abs(t - 0.5) * 0.30);
    var base = [x, spec.palmLength, spec.palmHalfDepth * 0.15];
    parts.push.apply(parts, buildDigit(hand, materials, spec, base, Math.sin(splay), len,
      spec.digitRadius, curl, HAND_EDGES));
  }

  /* A THUMB — the one addition that makes a hand read as a hand. Set on the
     inner side, opposed, and shorter; on the relaxed hand it rests along the
     palm, on the presenting hand it opens out to cup the crystal. */
  var thumbBase = [-spec.palmHalfWidth * 0.92, spec.palmLength * 0.42, spec.palmHalfDepth * 0.35];
  var thumbLen = spec.digitLength * 0.80;
  var thumbTip = opts.open
    ? [thumbBase[0] - thumbLen * 0.72, thumbBase[1] + thumbLen * 0.62, thumbBase[2] + thumbLen * 0.28]
    : [thumbBase[0] - thumbLen * 0.20, thumbBase[1] + thumbLen * 0.70, thumbBase[2] + thumbLen * 0.55];
  var thumbGeo = segment(thumbBase, thumbTip, spec.digitRadius * 1.12, spec.digitRadius * 0.8, 6,
    { depthRatio: 0.9, crystal: 0.03, steps: 1, lift: ARMS.classLift, classes: REGIONS.HAND.classes, coat: REGIONS.HAND.coat });
  parts.push(thumbGeo);
  var handGeo = mergeGeometries(parts);
  var handParts = clad(hand, handGeo, materials, 0, HAND_EDGES);
  owned.push(handGeo, handParts.edges, handParts.minorEdges);

  /* The bright tip diamond the reference shows above the raised hand. */
  if (opts.tipDiamond) {
    var tipGeo = diamondPlate(spec.tipDiamond, 0.02);
    var tip2 = new Mesh(tipGeo, materials.emissive);
    tip2.position.set(0, spec.palmLength + spec.digitLength * 1.25, 0.02);
    hand.add(tip2);
    var tipGlow = new Mesh(diamondPlate(spec.tipDiamond * 2.0, 0.006), materials.emissiveSoft);
    tipGlow.position.copy(tip2.position);
    hand.add(tipGlow);
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

  return { group: hand, dispose: function () { owned.forEach(function (g) { if (g && g.dispose) g.dispose(); }); } };
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

  /* Upper arm: shoulder -> elbow, in the shoulder joint's local space. */
  var shoulderJoint = new Group();
  shoulderJoint.name = root.name + '-shoulder';
  shoulderJoint.position.copy(shoulder);
  root.add(shoulderJoint);

  /* Six steps rather than four, because a profiled limb needs enough rings to
     actually describe its swell — at four the bicep belly lands between rings
     and the arm stays a cone with a kink in it. */
  var upperGeo = segment(
    [0, 0, 0], elbow.clone().sub(shoulder).toArray(),
    spec.upperRadius, spec.foreRadius * 1.02, 8,
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
    { depthRatio: 1.12, crystal: 0.045, steps: 5,
      profile: ARMS_.profiles.upper, shape: ARMS_.shapes.upper, lift: ARMS_.classLift,
      classes: REGIONS.UPPER_ARM.classes, columns: true, zoneAt: armZone(REGIONS.UPPER_ARM.classes),
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
  var upper = clad(shoulderJoint, upperGeo, materials, 0);
  owned.push(upperGeo, upper.edges, upper.minorEdges);

  /* Forearm hangs off an elbow joint so the elbow can actually bend. */
  var elbowJoint = new Group();
  elbowJoint.name = root.name + '-elbow';
  elbowJoint.position.copy(elbow.clone().sub(shoulder));
  shoulderJoint.add(elbowJoint);

  var foreVec = wrist.clone().sub(elbow);
  var foreGeo = segment(
    [0, 0, 0], foreVec.toArray(),
    spec.foreRadius, spec.wristRadius, 8,
    /* R98: five steps so the extensor belly just under the elbow has a ring
       to peak on and the taper into the wrist has two to fall through. */
    { depthRatio: 1.06, crystal: 0.040, steps: 5,
      profile: ARMS_.profiles.fore, shape: ARMS_.shapes.fore, lift: ARMS_.classLift,
      classes: REGIONS.FOREARM.classes, columns: true, zoneAt: armZone(REGIONS.FOREARM.classes),
      coat: REGIONS.FOREARM.coat }
  );
  var fore = clad(elbowJoint, foreGeo, materials, 0);
  owned.push(foreGeo, fore.edges, fore.minorEdges);

  /* R96 — THE JOINTS ARE DARK STEEL. Reference A's elbow is a small dark
     mechanical knuckle between the two crystal masses, and its wrist carries
     a cuff ring; both hide the segments' end discs — the flat pale facet that
     showed at every elbow — and read as machined joints in the crystal. Drawn
     in the cavity material (dark, barely reflective), no edge lines. */
  var eR = spec.foreRadius * 0.98;
  var elbowGeo = segment([0, -eR * 0.55, 0], [0, eR * 0.55, 0], eR, eR, 8,
    { depthRatio: 1.0, crystal: 0.015, steps: 2,
      profile: function (t) { return 0.70 + Math.sin(t * Math.PI) * 0.36; } });
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
  var pinHalf = eR * 1.14, pinR = eR * 0.42;
  var pinGeo = segment(
    lateral.clone().multiplyScalar(-pinHalf).toArray(),
    lateral.clone().multiplyScalar(pinHalf).toArray(),
    pinR, pinR, 8,
    { depthRatio: 1.0, crystal: 0.0, steps: 2,
      /* a boss at each end, a waist through the joint */
      profile: function (t) { var e = Math.abs(t - 0.5) * 2; return 0.72 + 0.28 * e * e; } });
  var pin = new Mesh(pinGeo, materials.joint || materials.cavity);
  pin.name = root.name + '-elbow-pin';
  elbowJoint.add(pin);
  owned.push(pinGeo);

  /* Wrist joint, oriented so the hand continues along the forearm axis. */
  var wristJoint = new Group();
  wristJoint.name = root.name + '-wrist';
  wristJoint.position.copy(foreVec);
  var dir = foreVec.clone().normalize();
  wristJoint.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
  elbowJoint.add(wristJoint);

  /* The wrist cuff, in the wrist's own frame so it rings the forearm's end. */
  var cR = spec.wristRadius * 1.22;
  var cuffGeo = segment([0, -0.030, 0], [0, 0.026, 0], cR, cR * 0.96, 8,
    { depthRatio: 1.0, crystal: 0.01, steps: 1 });
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
    dispose: function () { hand.dispose(); owned.forEach(function (g) { if (g && g.dispose) g.dispose(); }); }
  };
}

export function buildLimbs(materials, P) {
  var ARMS_ = (P && P.ARMS) || ARMS, HAND_ = (P && P.HAND) || HAND;
  var group = new Group();
  group.name = 'mrmah-limbs';

  /* The lowered arm's hand is relaxed and partly closed; the raised one is
     open and carries the tip diamond. */
  var right = buildArm(materials, ARMS_.right, { name: 'arm-right', openHand: false, arms: ARMS_, hand: HAND_ });
  /* R98 — the raised hand carries the crystal's own lamp (see buildHand). */
  var handLamp = null;
  var left = buildArm(materials, ARMS_.left, { name: 'arm-left', openHand: true, tipDiamond: true, arms: ARMS_, hand: HAND_,
    makeLamp: function () {
      handLamp = new PointLight(materials.emissive.color.clone(), 0.70, 0.42, 2);
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
