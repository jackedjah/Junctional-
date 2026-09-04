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
   theme.

   Resolution matters more than it looks. At 64x32 the PMREM blur smeared the
   zone boundaries into one another and the crystal came out uniformly
   mid-toned; the zones only produce a value hierarchy if their edges survive
   to the reflection. */
function buildEnvironment(renderer, palette) {
  var c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  var g = c.getContext('2d');
  /* This gradient has to be BRIGHT. It is a reflection source, not scenery,
     and it is never seen directly — the scene background stays transparent.
     A first attempt used the stage's own near-black values and the crystal
     stayed black, because a dark metal reflecting a dark room is just dark. */
  /* ZONES, not a ramp.

     A smooth blue gradient makes almost every facet reflect some shade of
     blue, and the body reads as one uniformly tinted object no matter how much
     the geometry varies — measured, half the character's pixels sat in a
     single mid band. The reference's crystal is not blue everywhere: it is
     near-WHITE where it faces the light, near-BLACK where it faces away, and
     cyan only in a narrow transition. So the environment is built as three
     large zones with quick transitions between them. A facet's value then
     depends on which way it points, which is what a value hierarchy IS. */
  var grad = g.createLinearGradient(0, 0, 0, 128);
  /* The zones are weighted toward DARK, deliberately. The reference puts a
     third of the character's pixels in its darkest eighth and only about 3% in
     its brightest; a top-heavy environment inverts that and the crystal comes
     out pale. White is a small cap, cyan a narrow band, and everything below
     the horizon is near black. */
  grad.addColorStop(0.00, '#ffffff');   /* zenith: a small white cap */
  grad.addColorStop(0.13, '#dff3ff');
  grad.addColorStop(0.21, '#7cc4e4');   /* quick transition */
  grad.addColorStop(0.31, '#256179');   /* the narrow cyan band */
  grad.addColorStop(0.41, '#0b1d2a');   /* falls away fast */
  grad.addColorStop(0.68, '#050d15');
  /* The lower hemisphere is genuinely dark. It was lifted once because the
     arms were rendering as flat black bars — but the real cause was that they
     had no facet variation to catch anything with, not that the floor was too
     dark. Now that the limbs are properly faceted, this can go back to near
     black, which is what lets some planes on him read as truly dark and gives
     the value hierarchy its bottom end. */
  grad.addColorStop(1.00, '#050a11');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 128);
  /* LIGHT CARDS — the thing that actually makes a crystal glisten.

     A vertical gradient alone cannot do it, and this took a measurement to
     see: a facet reflects the MIRROR direction, not its own normal. A torso
     that stands roughly vertical and is viewed from the front reflects the
     region around the HORIZON, behind and beside the camera — it essentially
     never reflects the zenith. So brightening the top of the sky raised the
     numbers on nothing; measured, the bright bands stayed at 0%.

     Real product renders solve this with softboxes, and that is what these
     are: a few bright rectangles sitting at horizon height at different
     azimuths, on an otherwise dark sphere. A facet whose reflection lands on a
     card goes bright; its neighbour, angled a few degrees away, stays dark.
     With the irregular facet relief on the body that produces exactly the
     reference's scatter of glinting faces among dark ones.

     x is azimuth (0..256 = full turn), y is elevation (0 = zenith, 64 =
     horizon, 128 = nadir). */
  var cards = [
    /* key: large and near-white, front-left of the character */
    { x: 8, y: 26, w: 74, h: 52, fill: 'rgba(255,255,255,0.95)' },
    /* fill: cooler and weaker, opposite side */
    { x: 150, y: 40, w: 52, h: 40, fill: 'rgba(186,230,250,0.55)' },
    /* rim: narrow and bright cyan, behind */
    { x: 214, y: 22, w: 30, h: 46, fill: 'rgba(140,240,255,0.80)' },
    /* a small hot spot for the occasional true white catch */
    { x: 40, y: 46, w: 22, h: 16, fill: 'rgba(255,255,255,1)' }
  ];
  cards.forEach(function (c2) {
    var grd = g.createRadialGradient(
      c2.x + c2.w / 2, c2.y + c2.h / 2, 0,
      c2.x + c2.w / 2, c2.y + c2.h / 2, Math.max(c2.w, c2.h) / 2);
    grd.addColorStop(0, c2.fill);
    grd.addColorStop(0.55, c2.fill.replace(/[\d.]+\)$/, '0.35)'));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(c2.x - c2.w * 0.2, c2.y - c2.h * 0.2, c2.w * 1.4, c2.h * 1.4);
  });

  /* Hard bands over the smooth gradient.

     A pure gradient makes neighbouring facets reflect almost the same value,
     and measured against the reference that piled 50% of the character's
     pixels into a single mid-tone band where the reference spreads them evenly
     from black to white. Discrete steps give adjacent facets genuinely
     different reflections, which is what a real cut crystal does. */
  var bands = [
    [0, 8, 'rgba(255,255,255,0.55)'],
    [52, 8, 'rgba(10,20,30,0.60)'],
    [68, 8, 'rgba(150,220,245,0.30)'],
    [88, 12, 'rgba(6,12,18,0.55)'],
    [108, 8, 'rgba(90,170,205,0.22)']
  ];
  bands.forEach(function (b) { g.fillStyle = b[2]; g.fillRect(0, b[0], 256, b[1]); });

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

  /* Per-mode atmospheric depth. A chat stage wants haze starting closer and
     reaching further than a tight portrait does, and that is a property of
     the composition, not of the scene. */
  function setFog(near, far) {
    if (!scene.fog) return;
    if (near != null) scene.fog.near = near;
    if (far != null) scene.fog.far = far;
  }

  return {
    scene: scene, world: world, subject: subject,
    /* Exposed so the character's material can take the env map EXPLICITLY.
       Relying on scene.environment alone left the body reflecting nothing that
       responded to envMapIntensity — measured, values of 1, 2.4 and 4 produced
       byte-identical frames, while a mirror test proved the environment itself
       was rich. Assigning material.envMap puts the intensity back under
       control, which is the knob the whole value hierarchy is built on. */
    environment: envTarget ? envTarget.texture : null,
    setFog: setFog, dispose: dispose
  };
}
