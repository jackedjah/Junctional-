/* MR.MAH 3D :: CAMERA
   The canonical front camera, solved against the reference composition.

   Phase 1 derived its framing from the CSS stage that fakes perspective in
   mygym.css (`perspective(470px) rotateX(64deg)` -> 55 degree FOV, 26 degree
   downward pitch). That is retained below as LEGACY_STAGE because it is still
   the right framing for the existing 2.5D surface, but it is NOT the framing
   of the reference and is no longer the default.

   The reference is a near-level, long-lens hero shot. Its numbers, measured:

     frame              940 x 1672  (aspect 0.5622, portrait)
     character height   67.0% of frame height
     character apex     15.0% down the frame
     horizon            59.8% down the frame

   A horizon BELOW the vertical centre means the camera is pitched slightly
   UP, not down — the opposite of the legacy stage. Solving those three
   constraints for a 3.0-unit character hovering 0.16 above the floor:

     fov       32 degrees   (weak perspective; the reference shows very little
                             convergence across the character himself)
     distance  7.81         from  h / (2 d tan(fov/2)) = 0.670
     pitch     +3.22 deg    from  horizon offset 0.098 of frame
     camera Y  1.15         so the character centre lands at 48.45% of frame
     target Y  1.59         = camY + d tan(pitch)

   Do not "tidy" these into round numbers. They are the composition. */

import { PerspectiveCamera, Vector3, MathUtils } from '../vendor/three/three.module.min.js';

export var LEGACY_STAGE = { fov: 55, pitchDeg: 26, distance: 7.2, targetY: 1.05 };

export var FRAMING = {
  fov: 32,
  distance: 7.81,
  cameraY: 1.15,
  targetY: 1.59,
  /* The aspect the composition was solved for. Narrower than this and the
     camera opens up rather than cropping the character's hands. */
  referenceAspect: 0.5622,
  maxFov: 75,
  near: 0.1,
  far: 200
};

export function createCamera(options) {
  var opts = options || {};
  var framing = Object.assign({}, FRAMING, opts.framing || {});
  var camera = new PerspectiveCamera(framing.fov, framing.referenceAspect, framing.near, framing.far);
  var target = new Vector3(0, framing.targetY, 0);

  function place() {
    camera.position.set(0, framing.cameraY, framing.distance);
    target.set(0, framing.targetY, 0);
    camera.lookAt(target);
  }

  /* Portrait phones are much narrower than the reference frame; a fixed
     vertical FOV would crop the raised hand off the side. Holding the
     HORIZONTAL extent constant below the reference aspect and letting the
     vertical FOV open instead keeps the whole character in frame, at the cost
     of showing a little more world above and below — which is the right
     trade, because the silhouette is the thing that must survive. */
  function setViewport(width, height) {
    var w = Math.max(1, Number(width) || 1);
    var h = Math.max(1, Number(height) || 1);
    var aspect = w / h;
    camera.aspect = aspect;

    if (aspect < framing.referenceAspect) {
      var refV = MathUtils.degToRad(framing.fov);
      var refH = 2 * Math.atan(Math.tan(refV / 2) * framing.referenceAspect);
      camera.fov = Math.min(framing.maxFov,
        MathUtils.radToDeg(2 * Math.atan(Math.tan(refH / 2) / aspect)));
    } else {
      camera.fov = framing.fov;
    }
    camera.updateProjectionMatrix();
    return camera.fov;
  }

  function setDistance(d) {
    framing.distance = Math.max(1, Number(d) || framing.distance);
    place();
  }

  /* Used by the comparison harness to re-solve the framing when the character
     height or float height changes, so the composition stays measured rather
     than drifting as the model is refined. */
  function frameCharacter(height, floatHeight, heightFraction) {
    var hf = heightFraction || 0.670;
    var halfV = MathUtils.degToRad(framing.fov) / 2;
    framing.distance = height / (2 * Math.tan(halfV) * hf);
    var centreY = floatHeight + height / 2;
    var pitch = MathUtils.degToRad(3.22);
    /* the character's centre must land 1.55% above the frame centre */
    var offset = Math.atan(0.031 * Math.tan(halfV));
    framing.cameraY = centreY - framing.distance * Math.tan(pitch + offset);
    framing.targetY = framing.cameraY + framing.distance * Math.tan(pitch);
    place();
    return framing;
  }

  place();

  return {
    camera: camera,
    target: target,
    framing: framing,
    place: place,
    setViewport: setViewport,
    setDistance: setDistance,
    frameCharacter: frameCharacter
  };
}
