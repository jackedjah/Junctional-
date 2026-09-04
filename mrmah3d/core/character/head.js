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
  Group, Mesh, TorusGeometry, EdgesGeometry, LineSegments, Object3D,
  BufferGeometry, Float32BufferAttribute, MeshBasicMaterial, PlaneGeometry
} from '../../vendor/three/three.module.min.js';
import { diamondCrystal } from './forge.js';
import { HEAD } from './proportions.js';
import { REGIONS } from './regions.js';

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
    innerInset: HEAD.innerInset,
    innerZ: HEAD.innerZ,
    faceZ: HEAD.faceZ,
    backApexZ: HEAD.backApexZ,
    backInset: HEAD.backInset,
    /* R100 — the display module (forge.js): the glass stands on a bezel
       inside the recess, forward of the channel floor, behind the lip. */
    screenInset: HEAD.screenInset,
    screenZ: HEAD.screenZ,
    relief: HEAD.relief,
    /* R98 — the platinum coat on the head's chamfer bands (regions.js) */
    coat: REGIONS.HEAD_SHELL.coat,
    /* The head takes a lighter share of the optical lottery than the body —
       see `lift` in forge.js. Without it the shell rendered essentially black
       and every bit of its apparent value was the linework drawn over it. */
    lift: REGIONS.HEAD_SHELL.lift,
    /* R94 — the head draws from its OWN class table (regions.js): a pale ice
       majority with a deep-blue minority, which no lift on the body's table can
       produce. `classLift` in proportions.js is kept only as the fallback. */
    classes: REGIONS.HEAD_SHELL.classes
  });

  /* R100 — four materials: the crystal casing, the display GLASS, the cavity
     (walls and channel floor), and the bezel the glass stands on. */
  var shell = new Mesh(geo, [materials.head || materials.body, materials.face, materials.cavity, materials.bezel || materials.joint || materials.cavity]);
  shell.name = 'head-shell';
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  /* NO RIM SHELL ON THE HEAD. See the note below the winding fix in forge.js:
     this shell was drawing the head's crown bands because they were wound
     inward, and it is not needed now that they render on their own. */

  /* Edge illumination, taken from the geometry itself. */
  /* THE HEAD CARRIES VERY FEW LINES.

     It is a small object with a lot of plane breaks, so any threshold that
     looks reasonable on the body draws a dense cyan cage on the head — which is
     the whole of the "outer diamond is too uniformly cyan" note. The reference's
     shell is crystal MASS with sparse edge light, so the structural threshold
     goes up hard and the secondary pass is dropped entirely: at 40 degrees it
     was nearly duplicating the 44-degree pass anyway, drawing every line twice.
     What survives is the girdle, the crown break and the lip — the three edges
     that actually describe the cut. */
  /* NO HERO PASS ON THE HEAD. The girdle is a continuous hard break all the way
     round the diamond, so any hero threshold draws a complete near-white outline
     — a frame, by definition, however dark the faces inside it are. The
     reference's head has cyan edge light that comes and goes and several
     stretches lost entirely into darkness. Dropping this pass is what lets the
     shell read as mass rather than as an outlined shape. */
  var heroEdges = new EdgesGeometry(geo, 72);   /* kept for disposal parity */
  /* R98: the chamfer meets the side band at ~53 degrees and the lip at ~37;
     the threshold sits between them so the silhouette break and the lip draw
     and the two chamfer bands' own seam does not. */
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
  var minorEdges = new EdgesGeometry(geo, 58);   /* kept for disposal parity */

  /* ---- face ----------------------------------------------------------- */
  /* Sits on the recessed plate. faceZ is where the plate is; the features are
     pushed a hair forward of it so they never z-fight the plane they read on. */
  /* R100 — THE DISPLAY IS HARDWARE + CONTENT. The glass, bezel and channel
     are geometry in the shell (forge.js, `screen`); everything drawn ON the
     glass lives in `face`, the content layer, positioned on the glass plane
     and scaled to the screen's own half extents (`display.halfWidth` /
     `halfHeight`), so a future icon or pixel sequence is placed in screen
     units and never touches the casing. */
  var screen = geo.userData.screen || { z: HEAD.faceZ * HEAD.halfDepth, inset: HEAD.faceInset };
  var faceZ = screen.z + 0.004;
  var face = new Group();
  face.name = 'mrmah-face';
  face.position.z = faceZ;
  group.add(face);
  var display = {
    z: screen.z,
    inset: screen.inset,
    halfWidth: HEAD.halfWidth * screen.inset,
    halfHeight: HEAD.halfHeight * screen.inset
  };

  /* R100 — THE CASING'S SHADOW ON THE GLASS. A physical screen set inside a
     thick frame is darker at its edge, most of all under the top edge where
     the frame stands between the glass and the sky. A translucent black
     diamond ring drawn just above the glass, opaque at the bezel and clear
     a third of the way in, gives exactly that contact occlusion for one tiny
     mesh; the alpha is heavier along the top than the bottom. Vertex alpha,
     no filter, no extra pass. */
  (function () {
    var N = 16, hw = display.halfWidth, hh = display.halfHeight;
    var pos = [], col = [], idx = [];
    for (var i = 0; i < N; i++) {
      var t = i / N * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
      var k = 1 / (Math.abs(ct) + Math.abs(st));
      var ox = ct * k * hw, oy = st * k * hh;
      var top = 0.55 + 0.45 * Math.max(0, st);           /* darker along the top edge */
      pos.push(ox, oy, 0, ox * 0.62, oy * 0.62, 0);
      col.push(0, 0, 0, 0.72 * top, 0, 0, 0, 0);
    }
    for (var j = 0; j < N; j++) {
      var a = j * 2, b = ((j + 1) % N) * 2;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    var g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(col, 4));
    g.setIndex(idx);
    var m = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false });
    var shadow = new Mesh(g, m);
    shadow.name = 'display-shadow';
    shadow.position.z = 0.0015;
    face.add(shadow);
  })();

  /* Thin, laser-like rings — not donuts. The reference's eyes are drawn with a
     hairline; a thick tube reads as a cartoon mascot and was the single most
     "developer art" thing about the head. The soft companion ring behind each
     one carries the glow so the bright line itself can stay hairline-fine. */
  /* Sized against the reference: the eyes are smaller relative to the head
     than they first appear, and set a little wider apart. Oversized rings read
     as a cartoon mascot rather than as the reference's restrained face. */
  /* The features are sized off the head, so enlarging the head enlarged the
     cavity and left the eyes and smile looking sparse inside it — a bigger face
     with the same small marks on it reads emptier, not friendlier. These
     factors are raised to keep the FEATURES' share of the cavity where it was,
     which is what the charm actually depends on. */
  /* Trimmed a little with the cavity walls now drawn — see faceInset in
     proportions.js. The eyes move inboard rather than shrinking much, because
     it is their OUTER edge that the inner bevel was cutting. */
  /* R94 — MEASURED OFF THE LUMINOUS REFERENCE, at 2.5x crop.

     Head 280 px wide; eye ring 36 px across (radius 0.129 of the half-width),
     stroke 2.4 px (0.067 of the ring radius), centres 78 px apart (0.28 of the
     half-width either side), sitting almost exactly on the head's centre line.
     Every earlier value here was set by eye against a smaller crop and the
     rings had crept to a 0.175 stroke — thick enough that, with the soft
     companion doubling it, the eyes read as goggles. */
  /* R95: reviewed as ~40% too large and twice too heavy against the luminous
     references; the guardian references sit between. Rings a shade smaller,
     the stroke thinner, and the soft companion carries the glow. */
  var eyeR = HEAD.halfWidth * 0.118;
  var eyeGap = HEAD.halfWidth * 0.280;
  var eyeY = HEAD.halfHeight * 0.06;

  /* R90 — STROKE WEIGHT RE-DERIVED FOR THE SMALLER HEAD.

     These fractions were set against a head 27% larger, and they are fractions
     OF the head, so shrinking it shrank them twice over: the smile's tube went
     from a hairline to a sub-pixel line, and at chat scale it disappeared
     entirely — the character rendered with eyes and no mouth, which fails the
     one app-scale requirement the brief states outright.

     Raised by about half. At showcase the smile is still a drawn line rather
     than a tube, which is what the reference shows; at 186 px of character it
     survives, which is the size that actually has to work. The soft companions
     go up further still, because they are what carries the feature once the
     core line is under a pixel. */
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
    /* R94: 0.175 -> 0.075. A thin stroke, as the crop measures it. The soft
       companion below carries the eye at app scale (its opacity rises as he
       shrinks — see setScaleHint), and it is thinner too: at 0.46 of the ring
       radius it was the goggle, not the core ring. */
    var eye = new Mesh(new TorusGeometry(eyeR, eyeR * 0.075, 6, 48), materials.emissive);
    eye.position.set(side * eyeGap, eyeY, 0);
    eye.name = side < 0 ? 'eye-left' : 'eye-right';
    face.add(eye);
    eyes.push(eye);

    var soft = new Mesh(new TorusGeometry(eyeR * 1.04, eyeR * 0.20, 6, 32), materials.emissiveSoft);
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
  /* R94 — THE SMILE IS SMALL, SHALLOW, THIN, WEAK, AND WELL ABOVE THE CHIN.

     Measured on the luminous reference (2.5x crop, head 280 px wide, 264 tall):
     the mouth is a 46 px chord with a 10 px sag — a circular arc of radius
     31.5 px spanning 94 degrees, i.e. 0.225 of the half-width and just over a
     half-pi of arc — drawn 2 px thick, and its belly sits 0.40 of the
     half-height below the centre line while the cavity's lower corner is at
     0.63 and the chin vertex at 1.0. The mouth is therefore clearly ABOVE the
     chin with the inner bevel and the shell's V below it, which the brief makes
     non-negotiable. The previous 0.34 / 0.92-pi arc was a full U with its belly
     at 0.57, sitting on the cavity floor. */
  var smileR = HEAD.halfWidth * 0.225;
  var smileArc = Math.PI * 0.55;
  var smile = new Mesh(
    new TorusGeometry(smileR, smileR * 0.058, 6, 40, smileArc),
    materials.emissiveSmile || materials.emissive
  );
  smile.rotation.z = Math.PI + (Math.PI - smileArc) / 2;
  /* position.y is the arc's CENTRE; the belly hangs one radius below it. */
  smile.position.set(0, -HEAD.halfHeight * 0.40 + smileR, 0);
  smile.name = 'smile';
  face.add(smile);

  var smileSoft = new Mesh(
    new TorusGeometry(smileR, smileR * 0.15, 6, 40, smileArc),
    materials.emissiveSoft
  );
  smileSoft.rotation.copy(smile.rotation);
  smileSoft.position.copy(smile.position);
  face.add(smileSoft);

  /* R100 — A CONTENT SLOT ON THE GLASS. Proof that the display can host more
     than the face: `setIcon('dumbbell')` draws a tiny pixel dumbbell — two
     plates and a bar, seven emissive quads — in screen units, above the
     smile's line and below the eyes; `setIcon(null)` removes it. Developer
     only: nothing in idle, no state and no surface calls it, and the lab
     exposes it as ?face=dumbbell. Hidden pixels cost nothing. */
  var icon = null;
  var faceContent = [];   /* the eyes, the smile and their glows — hidden while an icon shows */
  face.traverse(function (o) { if (o.isMesh && o.name !== 'display-shadow') faceContent.push(o); });
  function setIcon(name) {
    if (icon) { face.remove(icon); icon.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); icon = null; }
    faceContent.forEach(function (o) { o.visible = true; });
    if (name !== 'dumbbell') return null;
    /* a communication state: the icon takes the screen, the face yields it */
    faceContent.forEach(function (o) { o.visible = false; });
    icon = new Group();
    icon.name = 'display-icon';
    var u = display.halfWidth * 0.115;                    /* one "pixel" */
    var mat = materials.emissive;
    function px(x, y, w, h) {
      var q = new Mesh(new PlaneGeometry(u * w, u * h), mat);
      q.position.set(u * x, u * y, 0.002);
      icon.add(q);
    }
    /* bar */
    px(0, 0, 6, 1);
    /* inner plates */
    px(-3.5, 0, 1, 3); px(3.5, 0, 1, 3);
    /* outer plates */
    px(-4.75, 0, 1, 2.2); px(4.75, 0, 1, 2.2);
    icon.position.y = 0;
    face.add(icon);
    return name;
  }

  group.position.y = HEAD.centreY;

  return {
    group: group,
    shell: shell,
    face: face,
    display: display,
    setIcon: setIcon,
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
