/* MR.MAH 3D :: CAMERA
   A real PerspectiveCamera, framed to match the stage the member already knows.

   The framing is not a guess. The current 2.5D stage fakes its perspective in
   CSS (mygym.css, #mygym .fabi-grid):

       transform: perspective(470px) rotateX(64deg)

   A CSS `perspective(d)` over a viewport of height h is a vertical field of
   view of 2*atan(h/2/d). The AI Chat stage is 500-620px tall, which at d=470
   lands between 55 and 66 degrees; 55 is the value at the stage height used on
   the common phone breakpoints. `rotateX(64deg)` tips the ground plane 64
   degrees away from the viewer, i.e. the camera looks down on it by 26.

   So: 55 degree vertical FOV, 26 degree downward pitch. Matching these means
   the real renderer inherits the framing language of the accepted design
   instead of introducing a new one that would have to be re-approved. */

import { PerspectiveCamera, Vector3, MathUtils } from '../vendor/three/three.module.min.js';

export var FRAMING = {
  fov: 55,             /* derived from perspective(470px) at stage height */
  /* The compensation below is unbounded on its own: a very narrow stage drives
     the vertical FOV toward 180. Measured at a 150px-wide stage it reached 94,
     which is past the point where perspective distortion becomes the most
     visible thing on screen. Beyond this ceiling the figure is allowed to crop
     instead — a cropped character reads better than a warped one. */
  maxFov: 75,
  pitchDeg: 26,        /* derived from rotateX(64deg) */
  distance: 7.2,       /* world units from the subject */
  targetY: 1.05,       /* chest height, so the character is not centred on his
                          own feet the way a naive lookAt(0,0,0) would */
  near: 0.1,
  far: 120
};

export function createCamera(options) {
  var opts = options || {};
  var framing = Object.assign({}, FRAMING, opts.framing || {});
  var camera = new PerspectiveCamera(framing.fov, 1, framing.near, framing.far);
  var target = new Vector3(0, framing.targetY, 0);

  function place() {
    var pitch = MathUtils.degToRad(framing.pitchDeg);
    camera.position.set(
      0,
      target.y + Math.sin(pitch) * framing.distance,
      Math.cos(pitch) * framing.distance
    );
    camera.lookAt(target);
  }

  /* Portrait phones are much taller than they are wide. With a fixed vertical
     FOV the character would be framed correctly on a laptop and cropped at the
     shoulders on an iPhone. Holding the *horizontal* FOV constant below a
     threshold aspect and letting the vertical FOV open up instead keeps the
     whole figure in frame on every viewport the brief names. */
  function setViewport(width, height) {
    var w = Math.max(1, Number(width) || 1);
    var h = Math.max(1, Number(height) || 1);
    var aspect = w / h;
    camera.aspect = aspect;

    var REFERENCE_ASPECT = 0.72;     /* ~ a 393x545 chat stage */
    if (aspect < REFERENCE_ASPECT) {
      /* Preserve the horizontal extent the reference framing would have had,
         and solve for the vertical FOV that delivers it at this aspect. */
      var refV = MathUtils.degToRad(framing.fov);
      var refH = 2 * Math.atan(Math.tan(refV / 2) * REFERENCE_ASPECT);
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

  place();

  return {
    camera: camera,
    target: target,
    framing: framing,
    place: place,
    setViewport: setViewport,
    setDistance: setDistance
  };
}
