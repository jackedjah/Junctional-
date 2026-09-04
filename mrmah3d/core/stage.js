/* MR.MAH 3D :: STAGE
   The Scene itself, plus the atmospheric depth that makes a dark void read as
   a room rather than a flat black rectangle.

   Depth here is exponential fog only. It is the cheapest possible way to buy
   real depth cueing — no extra draw calls, no post-processing pass, no render
   target — which is exactly the "basic atmospheric depth if extremely
   inexpensive" the Phase 1 brief asks for. Anything more (bloom, SSAO, DOF)
   is a later-phase decision and must be tier-gated when it arrives. */

import {
  Scene, Fog, Group, Color, CanvasTexture, EquirectangularReflectionMapping,
  PMREMGenerator, SRGBColorSpace
} from '../vendor/three/three.module.min.js';

/* A tiny procedural environment for the crystal to reflect.

   This is not decoration — it is what makes the material read as crystal at
   all. A metallic surface with nothing to reflect returns almost pure black
   except where a light happens to specular off it, and the body rendered as a
   flat black shape with cyan outlines no matter how the lights were tuned.
   Give it an environment and every facet reflects a different part of the
   gradient, which is exactly the "readable internal facet variation" the
   reference depends on.

   Generated rather than loaded: no asset to ship, and it re-tints with the
   theme. 64x32 is plenty — it is only ever seen blurred through roughness. */
function buildEnvironment(renderer, palette) {
  var c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  var g = c.getContext('2d');
  /* This gradient has to be BRIGHT. It is a reflection source, not scenery,
     and it is never seen directly — the scene background stays transparent.
     A first attempt used the stage's own near-black values and the crystal
     stayed black, because a dark metal reflecting a dark room is just dark. */
  var grad = g.createLinearGradient(0, 0, 0, 32);
  grad.addColorStop(0.00, '#eafaff');   /* zenith: near-white */
  grad.addColorStop(0.22, '#8fd8f2');
  grad.addColorStop(0.44, '#2f7a9b');
  grad.addColorStop(0.58, '#173c50');   /* horizon */
  grad.addColorStop(0.80, '#12293a');
  /* The floor of the environment is dark but NOT black. Limbs are roughly
     horizontal tubes whose normals point sideways and down; against a black
     lower hemisphere they reflected nothing and the arms rendered as flat
     near-black bars while the torso read correctly. */
  grad.addColorStop(1.00, '#0d1e2b');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 32);
  /* A hot band just above the horizon: facets angled slightly up catch a
     near-white highlight, which is the reference's sparse specular catch. */
  g.fillStyle = 'rgba(255,255,255,0.98)';
  g.fillRect(0, 8, 64, 3);

  /* Hard bands over the smooth gradient.

     A pure gradient makes neighbouring facets reflect almost the same value,
     and measured against the reference that piled 50% of the character's
     pixels into a single mid-tone band where the reference spreads them evenly
     from black to white. Discrete steps give adjacent facets genuinely
     different reflections, which is what a real cut crystal does. */
  var bands = [
    [0, 2, 'rgba(255,255,255,0.55)'],
    [13, 2, 'rgba(10,20,30,0.60)'],
    [17, 2, 'rgba(150,220,245,0.30)'],
    [22, 3, 'rgba(6,12,18,0.55)'],
    [27, 2, 'rgba(90,170,205,0.22)']
  ];
  bands.forEach(function (b) { g.fillStyle = b[2]; g.fillRect(0, b[0], 64, b[1]); });

  var tex = new CanvasTexture(c);
  tex.mapping = EquirectangularReflectionMapping;
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;

  var pmrem = new PMREMGenerator(renderer);
  var target = pmrem.fromEquirectangular(tex);
  pmrem.dispose();
  tex.dispose();
  return target;
}

/* Linear, not exponential, and that choice matters. FogExp2 fogs by absolute
   distance from the camera, so any density strong enough to dissolve the grid's
   far edge (~28 units) also puts visible haze on the character, who sits a
   fixed ~7 units away. Linear fog with an explicit near lets the subject stay
   completely clean while the floor still fades to nothing. */
export var FOG = { near: 11, far: 42 };

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

  var envTarget = null;
  if (opts.renderer) {
    envTarget = buildEnvironment(opts.renderer, palette);
    scene.environment = envTarget.texture;
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
    if (envTarget) { envTarget.dispose(); envTarget = null; scene.environment = null; }
    scene.clear();
  }

  return { scene: scene, world: world, subject: subject, dispose: dispose };
}
