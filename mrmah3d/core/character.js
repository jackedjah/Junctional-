/* MR.MAH 3D :: CHARACTER
   PHASE 1 PLACEHOLDER — THIS IS NOT MR.MAH.

   Deliberately a stack of primitives. Its entire job is to prove that the
   pipeline in front of it works: that geometry has real depth, that lights
   land on real normals, that a shadow falls on the floor, that a drag rotates
   a solid and reveals sides the member could not previously see.

   Do not refine this into the character. When the real Mr.Mah arrives he
   arrives as a loaded model, and the seam is already cut for it: this module
   exposes exactly the interface the host uses (`root`, `update`, `setYaw`,
   `dispose`), so `createCharacter` can be swapped for a loader-backed
   implementation without any consumer changing.

   The angular, faceted look is not art direction either — flat-shaded low-poly
   primitives make lighting errors obvious. A smooth sphere would hide a broken
   normal or a missing light; a faceted solid shows it immediately. */

import {
  Group, Mesh, MeshStandardMaterial, BoxGeometry, IcosahedronGeometry,
  CylinderGeometry, TorusGeometry, Color
} from '../vendor/three/three.module.min.js';

export function createCharacter(options) {
  var opts = options || {};
  var palette = opts.palette;
  var settings = opts.settings || { shadows: true };
  var parent = opts.parent;

  var root = new Group();
  root.name = 'mrmah-character-placeholder';

  /* One shared material for the body masses. Low roughness on a dark base is
     what produces the tight Secondary speculars that the 2.5D rig has to paint
     by hand — here they are simply what the lights do. */
  var bodyMaterial = new MeshStandardMaterial({
    /* palette.placeholder, NOT palette.body — see the note on that token.
       Metalness is kept low: a metal surface has almost no diffuse response,
       which flattens exactly the plane-to-plane value differences this
       placeholder exists to demonstrate. */
    color: new Color(palette.placeholder).getHex(),
    roughness: 0.5,
    metalness: 0.1,
    flatShading: true
  });

  /* A separate emissive material for the chest emblem, so the accent reads as
     self-lit rather than as a bright patch of body. Mirrors the existing rig,
     where the emblem is the accent and the plane under it stays dark. */
  var emblemMaterial = new MeshStandardMaterial({
    color: new Color(palette.rim).getHex(),
    emissive: new Color(palette.rim).getHex(),
    emissiveIntensity: 0.85,
    roughness: 0.3,
    metalness: 0.1,
    flatShading: true
  });

  var parts = [];
  function add(mesh, name) {
    mesh.name = name;
    mesh.castShadow = !!settings.shadows;
    mesh.receiveShadow = !!settings.shadows;
    root.add(mesh);
    parts.push(mesh);
    return mesh;
  }

  /* Torso — a box, because a box has unambiguous planes. If the key, fill and
     rim are working, its three visible faces read at three clearly different
     values. That single fact is most of what Phase 1 is trying to prove. */
  var torso = add(new Mesh(new BoxGeometry(1.15, 1.5, 0.72), bodyMaterial), 'torso');
  torso.position.y = 1.15;

  /* Head — a low-frequency icosahedron. Faceted on purpose; it is the clearest
     possible readout of light direction. */
  var head = add(new Mesh(new IcosahedronGeometry(0.46, 0), bodyMaterial), 'head');
  head.position.y = 2.24;

  /* Arms — cylinders, angled out so they break the silhouette and cast onto
     the torso. Self-shadowing is the cheapest proof that shadows are real. */
  [-1, 1].forEach(function (side) {
    var arm = add(new Mesh(new CylinderGeometry(0.15, 0.13, 1.15, 6), bodyMaterial), side < 0 ? 'arm-left' : 'arm-right');
    arm.position.set(side * 0.76, 1.2, 0);
    arm.rotation.z = side * 0.22;
  });

  /* Legs */
  [-1, 1].forEach(function (side) {
    var leg = add(new Mesh(new CylinderGeometry(0.18, 0.15, 0.86, 6), bodyMaterial), side < 0 ? 'leg-left' : 'leg-right');
    leg.position.set(side * 0.28, 0.43, 0);
  });

  /* Emblem — on the chest front, so that rotating the character clearly shows
     a front and a back. Without an asymmetric feature a box under three-point
     light can look almost the same from several angles and the drag test
     proves less than it should. */
  var emblem = add(new Mesh(new TorusGeometry(0.2, 0.055, 6, 12), emblemMaterial), 'emblem');
  emblem.position.set(0, 1.42, 0.38);
  emblem.castShadow = false;

  if (parent) parent.add(root);

  /* A three-quarter resting pose, not a dead-on front view. Face-on, a box
     shows exactly one plane and the figure reads as flat until someone drags
     it; turned, the front and one side are both visible at rest, so the depth
     the renderer is meant to prove is legible in a still screenshot. It is
     also simply how a character is normally presented. */
  var RESTING_YAW = -0.38;
  var yaw = RESTING_YAW;
  root.rotation.y = yaw;
  var idlePhase = 0;

  function setYaw(radians) {
    yaw = Number(radians) || 0;
    root.rotation.y = yaw;
    return yaw;
  }
  function getYaw() { return yaw; }

  /* A very small idle bob. Present so the loop has something time-dependent to
     drive — it is how a still screenshot is distinguished from a stalled one —
     and so that reduced-motion has something real to switch off. */
  function update(dt, opts2) {
    var o = opts2 || {};
    if (o.reducedMotion) {
      root.position.y = 0;
      return;
    }
    idlePhase += dt;
    root.position.y = Math.sin(idlePhase * 1.6) * 0.024;
  }

  function dispose() {
    parts.forEach(function (m) {
      if (m.geometry && m.geometry.dispose) m.geometry.dispose();
      if (m.parent) m.parent.remove(m);
    });
    bodyMaterial.dispose();
    emblemMaterial.dispose();
    parts.length = 0;
    if (root.parent) root.parent.remove(root);
  }

  return {
    root: root,
    parts: parts,
    materials: { body: bodyMaterial, emblem: emblemMaterial },
    setYaw: setYaw,
    getYaw: getYaw,
    update: update,
    dispose: dispose,
    /* Marks this as the throwaway. A later loader-backed character reports
       false, and the lab HUD surfaces it, so nobody can mistake the
       placeholder for the real model in a screenshot. */
    isPlaceholder: true
  };
}
