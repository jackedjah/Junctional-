/* MR.MAH 3D :: CHARACTER
   The character slot in the renderer.

   Phase 1 filled this with a stack of primitives. It is now the real
   reference-derived Mr.Mah, built in `character/`. This module stays as the
   seam: `mrmah-scene.js` calls `createCharacter(...)` and knows nothing about
   how the character is made, so a later swap to a loaded model changes this
   file and nothing else.

   The contract a character must satisfy:
     root           Object3D to add to the scene
     update(dt,o)   per-frame, honouring o.reducedMotion
     setYaw / getYaw
     setState(name) behaviour, see character/states.js
     isPlaceholder  false for the real character
     dispose() */

import { createMrMah } from './character/mrmah.js';
import { HEIGHT } from './character/proportions.js';

export { HEIGHT as CHARACTER_HEIGHT };

export function createCharacter(options) {
  var opts = options || {};
  var mah = createMrMah({ tint: opts.tint, envMap: opts.envMap, variant: opts.variant });
  if (opts.parent) opts.parent.add(mah.root);

  /* Shadow flags are the renderer's business, not the character's: the
     quality tier decides whether shadows exist at all. */
  var shadows = !(opts.settings && opts.settings.shadows === false);
  mah.root.traverse(function (o) {
    if (!o.isMesh) return;
    o.castShadow = shadows && o.castShadow;
    /* HE DOES NOT RECEIVE SHADOW, only casts it.

       Self-shadowing was measurably flattening the crystal. The shadow camera
       covers a few units and PCF spreads each sample over a region far wider
       than one facet, so what lands on the body is not occlusion — a convex
       gem has almost none to show — but a soft grey wash drifting across
       several facets at once, competing with exactly the per-facet values the
       whole material is built to produce. Captured side by side, the low tier
       (shadows off entirely) had visibly stronger facet-to-facet contrast than
       the high tier, which is the wrong way round for a quality setting.

       The floor contact shadow is the one that carries meaning here, and that
       is a cast, so it is untouched. */
    o.receiveShadow = false;
  });

  return mah;
}
