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
  Group, Mesh, EdgesGeometry, LineSegments, Vector3
} from '../../vendor/three/three.module.min.js';
import { segment, diamondPlate, facetedGeometry } from './forge.js';
import { ARMS, HAND } from './proportions.js';

function clad(group, geo, materials, rimScale) {
  var mesh = new Mesh(geo, materials.body);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  /* Concentric with the part — see the long note in body.js. The arm segments
     are built in character space around y ~ 1.9, so a plain setScalar(1.05)
     lifted each shell 0.095 units off its own bone and drew it as a bright
     slab beside the arm rather than as a lip along it. */
  var s = rimScale || 1.05;
  var rim = new Mesh(geo, materials.rim);
  rim.scale.set(s, 1, s);
  if (!geo.boundingBox) geo.computeBoundingBox();
  var c = geo.boundingBox.getCenter(new Vector3());
  rim.position.set(c.x * (1 - s), 0, c.z * (1 - s));
  group.add(rim);
  var major = new EdgesGeometry(geo, 48);
  var minor = new EdgesGeometry(geo, 20);
  group.add(new LineSegments(major, materials.edge));
  group.add(new LineSegments(major, materials.edgeHalo));
  group.add(new LineSegments(minor, materials.edgeFaint));
  return { mesh: mesh, edges: major, minorEdges: minor };
}

/* A faceted wedge palm built between the wrist and the fingertips. */
function palmGeometry(dir, spec) {
  var P = [];
  function p(x, y, z) { P.push(x, y, z); return P.length / 3 - 1; }
  var w = spec.palmHalfWidth, d = spec.palmHalfDepth, L = spec.palmLength;
  /* Slight taper outward so the hand reads wider than the wrist. */
  var a = [p(-w * 0.72, 0, d * 0.8), p(w * 0.72, 0, d * 0.8),
           p(w * 0.72, 0, -d * 0.8), p(-w * 0.72, 0, -d * 0.8)];
  var b = [p(-w, L, d), p(w, L, d), p(w, L, -d), p(-w, L, -d)];
  var faces = [
    [a[0], a[1], a[2], a[3]].slice().reverse(),
    [b[0], b[1], b[2], b[3]],
    [a[0], b[0], b[1], a[1]],
    [a[1], b[1], b[2], a[2]],
    [a[2], b[2], b[3], a[3]],
    [a[3], b[3], b[0], a[0]]
  ];
  return facetedGeometry(P, faces);
}

function buildHand(materials, spec, options) {
  var opts = options || {};
  var hand = new Group();
  hand.name = 'hand';
  var owned = [];

  var palmGeo = palmGeometry(1, spec);
  var palm = clad(hand, palmGeo, materials, 1.06);
  owned.push(palmGeo, palm.edges, palm.minorEdges);

  /* Digits. Simplified and few — the requirement is that the raised hand
     reads as a hand rather than a triangle, not that it has knuckles. */
  var n = opts.open ? spec.digitCount : Math.max(2, spec.digitCount - 1);
  for (var i = 0; i < n; i++) {
    var t = n === 1 ? 0.5 : i / (n - 1);
    var x = (t - 0.5) * spec.palmHalfWidth * 1.55;
    /* Splay the outer digits and shorten them slightly. */
    var splay = (t - 0.5) * (opts.open ? 0.55 : 0.22);
    var len = spec.digitLength * (opts.open ? 1 : 0.72) * (1 - Math.abs(t - 0.5) * 0.35);
    var base = [x, spec.palmLength, 0];
    var tip = [x + Math.sin(splay) * len, spec.palmLength + Math.cos(splay) * len, 0.01];
    var g = segment(base, tip, spec.digitRadius, spec.digitRadius * 0.7, 5, { depthRatio: 0.9, crystal: 0.05, steps: 2 });
    var d = clad(hand, g, materials, 1.08);
    owned.push(g, d.edges, d.minorEdges);
  }

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
  }

  return { group: hand, dispose: function () { owned.forEach(function (g) { if (g && g.dispose) g.dispose(); }); } };
}

/* Build one arm as a joint hierarchy positioned to hit the measured
   shoulder / elbow / wrist points. Geometry is authored in world space and
   then re-parented, so the measured pose is exact at rest while the joints
   remain free to animate from there. */
function buildArm(materials, spec, options) {
  var opts = options || {};
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
    { depthRatio: 0.88, crystal: 0.075, steps: 6, profile: ARMS.profiles.upper }
  );
  var upper = clad(shoulderJoint, upperGeo, materials, 1.05);
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
    { depthRatio: 0.88, crystal: 0.070, steps: 5, profile: ARMS.profiles.fore }
  );
  var fore = clad(elbowJoint, foreGeo, materials, 1.05);
  owned.push(foreGeo, fore.edges, fore.minorEdges);

  /* Wrist joint, oriented so the hand continues along the forearm axis. */
  var wristJoint = new Group();
  wristJoint.name = root.name + '-wrist';
  wristJoint.position.copy(foreVec);
  var dir = foreVec.clone().normalize();
  wristJoint.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
  elbowJoint.add(wristJoint);

  var hand = buildHand(materials, HAND, { open: !!opts.openHand, tipDiamond: !!opts.tipDiamond });
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

export function buildLimbs(materials) {
  var group = new Group();
  group.name = 'mrmah-limbs';

  /* The lowered arm's hand is relaxed and partly closed; the raised one is
     open and carries the tip diamond. */
  var right = buildArm(materials, ARMS.right, { name: 'arm-right', openHand: false });
  var left = buildArm(materials, ARMS.left, { name: 'arm-left', openHand: true, tipDiamond: true });

  group.add(right.group);
  group.add(left.group);

  return {
    group: group,
    right: right,
    left: left,
    dispose: function () { right.dispose(); left.dispose(); }
  };
}
