/* MR.MAH 3D :: ENVIRONMENT
   The floor: a shadow-catching ground plane plus a real perspective grid.

   This is the direct replacement for #mygym .fabi-grid, which fakes its
   perspective with a CSS transform on a flat repeating background. Everything
   the CSS version can only imply — lines actually converging, the grid passing
   *behind* the character, the floor receiving his shadow — is free here.

   Grid proportions are carried over from the CSS rule so the stage keeps its
   proportions: background-size 50px x 38px gives cells about 1.32 times wider
   than deep, and opacity .3 with line alphas around .11-.13.

   The grid's far edge is dissolved by the stage's linear fog rather than by a
   backdrop plane. Fog costs nothing per frame; a full-width backdrop quad is a
   real draw, and the brief allows atmospheric depth only while it stays
   extremely inexpensive. */

import {
  Mesh, PlaneGeometry, ShadowMaterial, GridHelper, Color
} from '../vendor/three/three.module.min.js';

/* The grid is sized and pushed forward so that it lies ENTIRELY IN FRONT OF
   THE CAMERA. This is not cosmetic.

   A grid centred on the origin at the default 40-unit size spans z = +20..-20,
   while the Phase 1 camera sits at z = +6.5. Every line running along Z then
   has one endpoint behind the near plane, and a line segment that straddles
   the near plane has to be clipped. Measured here in ANGLE/SwiftShader, such
   segments are dropped outright: the floor rendered as a set of horizontal
   bands with no converging lines at all, which reads as a flat backdrop rather
   than a receding floor.

   Sizing the grid to the region that is actually visible fixes it on every
   rasteriser and draws less geometry, so there is no reason to rely on a
   driver clipping this correctly. `centerZ` keeps the near edge just in front
   of the camera; `size / divisions` is held at 1.33 units to preserve the
   50:38 cell aspect of the CSS grid it replaces. */
export var GRID = {
  size: 28,        /* world units across */
  divisions: 21,   /* -> 1.33 unit cells, the 50:38 CSS cell aspect */
  centerZ: -9,     /* spans z = +5 .. -23, all in front of a camera at z=+6.5 */
  /* Lifted clear of the shadow-catcher rather than sharing its plane. At the
     original 0.001 the two surfaces were within depth-buffer precision at
     grazing angles and the ground won, erasing half the grid lines. */
  y: 0.02,
  opacity: 0.3     /* .fabi-grid opacity: .3 */
};

export function createEnvironment(options) {
  var opts = options || {};
  var palette = opts.palette;
  var settings = opts.settings || { shadows: true };
  var parent = opts.parent;
  var made = [];

  /* GROUND — a ShadowMaterial, not a lit surface. It is invisible except where
     something shadows it, so the floor contributes contact grounding without
     adding a large lit quad that would brighten the whole dark stage. */
  var ground = new Mesh(
    new PlaneGeometry(GRID.size + 20, GRID.size + 20),
    new ShadowMaterial({ opacity: settings.shadows ? 0.42 : 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = !!settings.shadows;
  /* It exists to catch a shadow, never to occlude. Leaving depthWrite on made
     it hide grid lines it did not visibly cover. */
  ground.material.depthWrite = false;
  ground.name = 'mrmah-ground';
  made.push(ground);

  /* GRID — lifted a hair off the ground plane and with depthWrite off so it
     cannot z-fight the shadow catcher sharing its height. Its LineBasicMaterial
     is fog-responsive by default, which is what fades the far edge out. */
  var gridColor = new Color(palette.grid);
  var grid = new GridHelper(GRID.size, GRID.divisions, gridColor, gridColor);
  grid.material.transparent = true;
  grid.material.opacity = GRID.opacity;
  grid.material.depthWrite = false;
  grid.material.fog = true;
  grid.position.set(0, GRID.y, GRID.centerZ);
  grid.name = 'mrmah-grid';
  made.push(grid);

  if (parent) made.forEach(function (m) { parent.add(m); });

  function setOpacity(value) {
    grid.material.opacity = Math.max(0, Math.min(1, Number(value)));
  }

  function dispose() {
    made.forEach(function (m) {
      if (m.geometry && m.geometry.dispose) m.geometry.dispose();
      var mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      mats.forEach(function (x) { if (x && x.dispose) x.dispose(); });
      if (m.parent) m.parent.remove(m);
    });
    made.length = 0;
  }

  return { ground: ground, grid: grid, objects: made, setOpacity: setOpacity, dispose: dispose };
}
