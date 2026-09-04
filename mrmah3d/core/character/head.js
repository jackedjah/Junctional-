/* MR.MAH 3D :: HEAD
   The diamond crystal head and the face inside it.

   This is the primary recognition feature, so it gets real volume: a beveled
   diamond with front-to-back depth, side planes, a back apex, and a facial
   plane that is genuinely recessed behind a bevel lip rather than painted on
   the front. Turn the character and the face goes into shadow inside the
   crystal, which is the behaviour that proves it is not a decal.

   The eyes are RINGS, not discs — that is what the reference shows — and the
   smile is an open arc. Both are unlit and tone-mapping-exempt so they stay
   legible at any exposure. */

import {
  Group, Mesh, TorusGeometry, EdgesGeometry, LineSegments, Object3D
} from '../../vendor/three/three.module.min.js';
import { diamondCrystal } from './forge.js';
import { HEAD } from './proportions.js';

export function buildHead(materials) {
  var group = new Group();
  group.name = 'mrmah-head';

  var geo = diamondCrystal({
    halfWidth: HEAD.halfWidth,
    halfHeight: HEAD.halfHeight,
    halfDepth: HEAD.halfDepth,
    bevelInset: HEAD.bevelInset,
    faceInset: HEAD.faceInset,
    bevelZ: HEAD.bevelZ,
    faceZ: HEAD.faceZ,
    backApexZ: HEAD.backApexZ,
    relief: HEAD.relief
  });

  var shell = new Mesh(geo, [materials.body, materials.face]);
  shell.name = 'head-shell';
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  /* Rim shell — the same solid, slightly inflated, back faces only. */
  var rim = new Mesh(geo, materials.rim);
  rim.scale.setScalar(1.035);
  rim.name = 'head-rim';
  group.add(rim);

  /* Edge illumination, taken from the geometry itself. */
  var edges = new EdgesGeometry(geo, 34);
  var line = new LineSegments(edges, materials.edge);
  line.name = 'head-edges';
  group.add(line);
  var halo = new LineSegments(edges, materials.edgeHalo);
  halo.name = 'head-edge-halo';
  group.add(halo);
  var minorEdges = new EdgesGeometry(geo, 14);
  group.add(new LineSegments(minorEdges, materials.edgeFaint));

  /* ---- face ----------------------------------------------------------- */
  /* Sits on the recessed plate. faceZ is where the plate is; the features are
     pushed a hair forward of it so they never z-fight the plane they read on. */
  var faceZ = HEAD.faceZ * HEAD.halfDepth + 0.004;
  var face = new Group();
  face.name = 'mrmah-face';
  face.position.z = faceZ;
  group.add(face);

  /* Sized against the reference: the eyes are smaller relative to the head
     than they first appear, and set a little wider apart. Oversized rings read
     as a cartoon mascot rather than as the reference's restrained face. */
  var eyeR = HEAD.halfWidth * 0.112;
  var eyeGap = HEAD.halfWidth * 0.325;
  var eyeY = HEAD.halfHeight * 0.10;

  var eyes = [];
  [-1, 1].forEach(function (side) {
    /* A torus, not a circle: the reference's eyes are open rings. */
    var eye = new Mesh(new TorusGeometry(eyeR, eyeR * 0.30, 8, 20), materials.emissive);
    eye.position.set(side * eyeGap, eyeY, 0);
    eye.name = side < 0 ? 'eye-left' : 'eye-right';
    face.add(eye);
    eyes.push(eye);

    var soft = new Mesh(new TorusGeometry(eyeR * 1.5, eyeR * 0.42, 8, 20), materials.emissiveSoft);
    soft.position.copy(eye.position);
    face.add(soft);
  });

  /* Smile: a partial torus opening upward. Rotated PI so the arc's belly is
     at the bottom, which is a smile rather than a frown. */
  var smileR = HEAD.halfWidth * 0.30;
  var smile = new Mesh(
    new TorusGeometry(smileR, smileR * 0.085, 8, 32, Math.PI * 0.86),
    materials.emissive
  );
  smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.86) / 2;
  smile.position.set(0, eyeY - HEAD.halfHeight * 0.30, 0);
  smile.name = 'smile';
  face.add(smile);

  var smileSoft = new Mesh(
    new TorusGeometry(smileR, smileR * 0.20, 8, 32, Math.PI * 0.86),
    materials.emissiveSoft
  );
  smileSoft.rotation.copy(smile.rotation);
  smileSoft.position.copy(smile.position);
  face.add(smileSoft);

  group.position.y = HEAD.centreY;

  return {
    group: group,
    shell: shell,
    face: face,
    eyes: eyes,
    smile: smile,
    geometry: geo,
    edges: edges,
    /* Blink by squashing the rings vertically — cheaper and more readable at
       this scale than swapping geometry. */
    setBlink: function (t) {
      var s = Math.max(0.04, 1 - t);
      eyes.forEach(function (e) { e.scale.y = s; });
    },
    dispose: function () {
      geo.dispose();
      edges.dispose();
      minorEdges.dispose();
      group.traverse(function (o) { if (o.geometry && o.geometry !== geo) o.geometry.dispose(); });
    }
  };
}
