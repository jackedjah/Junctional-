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
  Group, Mesh, TorusGeometry, EdgesGeometry, LineSegments, Object3D, Vector3
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
    crownInset: HEAD.crownInset,
    crownZ: HEAD.crownZ,
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
  /* Concentric, for the same reason as body.js. The head's own geometry is
     already built about its centre so the correction is small here, but it is
     not zero — the crystal runs from a back apex to a front plate, so its
     bounding centre sits behind z=0 and an uncorrected shell drifts forward. */
  if (!geo.boundingBox) geo.computeBoundingBox();
  var hc = geo.boundingBox.getCenter(new Vector3());
  rim.position.set(hc.x * -0.035, hc.y * -0.035, hc.z * -0.035);
  rim.name = 'head-rim';
  group.add(rim);

  /* Edge illumination, taken from the geometry itself. */
  var heroEdges = new EdgesGeometry(geo, 68);
  group.add(new LineSegments(heroEdges, materials.edgeHero));
  var edges = new EdgesGeometry(geo, 44);
  var line = new LineSegments(edges, materials.edge);
  line.name = 'head-edges';
  group.add(line);
  var halo = new LineSegments(edges, materials.edgeHalo);
  halo.name = 'head-edge-halo';
  group.add(halo);
  /* 14 degrees found every seam on the bevel relief and drew a fan of faint
     lines straight across the face — the "dirty face" note. The head is the one
     part where linework must stay off the surface entirely, because anything
     crossing the recess competes with the eyes and smile. */
  var minorEdges = new EdgesGeometry(geo, 40);
  group.add(new LineSegments(minorEdges, materials.edgeFaint));

  /* ---- face ----------------------------------------------------------- */
  /* Sits on the recessed plate. faceZ is where the plate is; the features are
     pushed a hair forward of it so they never z-fight the plane they read on. */
  var faceZ = HEAD.faceZ * HEAD.halfDepth + 0.004;
  var face = new Group();
  face.name = 'mrmah-face';
  face.position.z = faceZ;
  group.add(face);

  /* Thin, laser-like rings — not donuts. The reference's eyes are drawn with a
     hairline; a thick tube reads as a cartoon mascot and was the single most
     "developer art" thing about the head. The soft companion ring behind each
     one carries the glow so the bright line itself can stay hairline-fine. */
  /* Sized against the reference: the eyes are smaller relative to the head
     than they first appear, and set a little wider apart. Oversized rings read
     as a cartoon mascot rather than as the reference's restrained face. */
  var eyeR = HEAD.halfWidth * 0.112;
  var eyeGap = HEAD.halfWidth * 0.325;
  var eyeY = HEAD.halfHeight * 0.10;

  var eyes = [];
  [-1, 1].forEach(function (side) {
    /* A torus, not a circle: the reference's eyes are open rings. */
    /* HAIRLINE. The tube radius is the whole difference between the reference's
       thin laser circles and a pair of cyan donuts, and 0.135 of the ring
       radius was still a donut. At 0.075 the ring is a drawn line; the soft
       companion below carries the bloom so the line itself never has to thicken
       in order to stay visible. Segment count around the tube drops to 6 —
       nothing at this width can show its cross-section. */
    /* STROKE WEIGHT, arrived at from both directions.

       0.135 of the ring radius was a donut — the "developer art" note. 0.075
       was a hairline, and a hairline sub-pixels out at chat size and turned the
       eyes into dark holes. The refined reference sits between: a clean ring
       with a definite, even stroke, obviously drawn rather than either fat or
       fragile. 0.13 is that, and it survives down to protocol scale. */
    var eye = new Mesh(new TorusGeometry(eyeR, eyeR * 0.13, 8, 40), materials.emissive);
    eye.position.set(side * eyeGap, eyeY, 0);
    eye.name = side < 0 ? 'eye-left' : 'eye-right';
    face.add(eye);
    eyes.push(eye);

    var soft = new Mesh(new TorusGeometry(eyeR * 1.16, eyeR * 0.34, 8, 28), materials.emissiveSoft);
    soft.position.copy(eye.position);
    face.add(soft);
  });

  /* Smile: a partial torus opening upward. Rotated PI so the arc's belly is
     at the bottom, which is a smile rather than a frown. */
  /* THE SMILE HAS TO BE VISIBLE. The brief is unambiguous that it currently is
     not, and it was the one face element I kept trimming. It is now wider
     (0.34 of the head half-width, so it spans the gap between the eyes rather
     than hiding under them), meaningfully thicker than the eye stroke, and
     opened out to a fuller arc so its curve reads as a smile at a glance
     instead of as a short dash. */
  var smileR = HEAD.halfWidth * 0.34;
  var smileArc = Math.PI * 0.92;
  var smile = new Mesh(
    /* The smile is drawn with the same hairline as the eyes, for the same
       reason — the reference's mouth is a thin arc of light, not a band. */
    new TorusGeometry(smileR, smileR * 0.062, 8, 52, smileArc),
    materials.emissive
  );
  smile.rotation.z = Math.PI + (Math.PI - smileArc) / 2;
  smile.position.set(0, eyeY - HEAD.halfHeight * 0.27, 0);
  smile.name = 'smile';
  face.add(smile);

  var smileSoft = new Mesh(
    new TorusGeometry(smileR, smileR * 0.125, 8, 52, smileArc),
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
      heroEdges.dispose();
      group.traverse(function (o) { if (o.geometry && o.geometry !== geo) o.geometry.dispose(); });
    }
  };
}
