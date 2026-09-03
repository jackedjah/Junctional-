/* MR.MAH 3D :: STAGE
   The Scene itself, plus the atmospheric depth that makes a dark void read as
   a room rather than a flat black rectangle.

   Depth here is exponential fog only. It is the cheapest possible way to buy
   real depth cueing — no extra draw calls, no post-processing pass, no render
   target — which is exactly the "basic atmospheric depth if extremely
   inexpensive" the Phase 1 brief asks for. Anything more (bloom, SSAO, DOF)
   is a later-phase decision and must be tier-gated when it arrives. */

import { Scene, Fog, Group, Color } from '../vendor/three/three.module.min.js';

/* Linear, not exponential, and that choice matters. FogExp2 fogs by absolute
   distance from the camera, so any density strong enough to dissolve the grid's
   far edge (~28 units) also puts visible haze on the character, who sits a
   fixed ~7 units away. Linear fog with an explicit near lets the subject stay
   completely clean while the floor still fades to nothing. */
export var FOG = { near: 9, far: 26 };

export function createStage(options) {
  var opts = options || {};
  var palette = opts.palette;
  var settings = opts.settings || { fog: true };

  var scene = new Scene();
  /* Transparent clear colour: MAHFITT's own background shows through, so the
     3D stage composites into the page instead of punching a black hole in it.
     The scene therefore has no .background of its own by design. */
  scene.background = null;

  if (settings.fog) {
    scene.fog = new Fog(new Color(palette.fog).getHex(), FOG.near, FOG.far);
  }

  /* Two roots, deliberately separate.

     'world' holds everything the member should read as fixed reality: floor,
     grid, environment. 'subject' holds Mr.Mah. Interaction rotates the
     subject, never the world — so dragging the character does not swing the
     room around him, and a future camera orbit can move the camera without
     fighting a character transform. */
  var world = new Group();
  world.name = 'mrmah-world';
  var subject = new Group();
  subject.name = 'mrmah-subject';
  scene.add(world);
  scene.add(subject);

  function dispose() {
    /* Depth-first geometry/material release. Textures are released via each
       material's own map slots. Phase 1 has none, but the traversal is written
       now so later phases cannot forget it. */
    scene.traverse(function (obj) {
      if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
      var mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
      mats.forEach(function (m) {
        if (!m) return;
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']
          .forEach(function (slot) { if (m[slot] && m[slot].dispose) m[slot].dispose(); });
        if (m.dispose) m.dispose();
      });
    });
    scene.clear();
  }

  return { scene: scene, world: world, subject: subject, dispose: dispose };
}
