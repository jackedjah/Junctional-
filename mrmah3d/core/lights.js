/* MR.MAH 3D :: LIGHTS
   A three-point rig: key, fill, rim. Plus a very low ambient so unlit faces
   are dark rather than pure black.

   This mirrors the vocabulary the 2.5D rig already speaks. The current SVG
   system paints a key sweep, a fill/bounce and a Secondary-family perimeter
   rim by hand (mygym.css, .fabi-rig__rim, and fabiApplySceneLighting's
   keyMix / bounceMix). Phase 1 uses real lights for the same three jobs, so
   when the real Mr.Mah model arrives the lighting intent transfers directly
   instead of being reinvented.

   The rim in particular is load-bearing, not decoration: R83's whole finding
   was that a dark character against a dark stage dissolves at the silhouette
   unless something separates the edge from the void. */

import { DirectionalLight, HemisphereLight, AmbientLight, Color } from '../vendor/three/three.module.min.js';

export function createLights(options) {
  var opts = options || {};
  var palette = opts.palette;
  var settings = opts.settings || { shadows: true, shadowMapSize: 512 };
  var group = opts.parent;

  /* KEY — the one required directional light. High, and to the left of camera
     but well forward of it.

     The forward bias is deliberate and was measured, not guessed. An earlier
     placement at (-3.4, 5.4, 4.2) put the key on the exact 45-degree diagonal
     between the front and left faces of the torso, so both faces returned the
     same N.L and rendered at an identical value — the box lost its corner and
     read as a flat silhouette. Pulling the key toward the front separates the
     three visible planes into three distinct values, which is the single
     clearest proof that the geometry has real depth. */
  var key = new DirectionalLight(new Color(palette.key).getHex(), 2.1);
  key.position.set(-2.2, 6.2, 5.2);
  key.castShadow = !!settings.shadows;
  if (key.castShadow) {
    var s = settings.shadowMapSize || 512;
    key.shadow.mapSize.set(s, s);
    /* A tight ortho frustum around the subject. Left at three's defaults the
       shadow map would spread over a 10x10 area and the character's contact
       shadow would be a soft grey smear. */
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -1;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 18;
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.02;
  }

  /* FILL — opposite side, far weaker, cool-neutral. Its only job is to keep
     the shadow side readable. It never casts. */
  var fill = new DirectionalLight(new Color(palette.fill).getHex(), 0.42);
  fill.position.set(4.6, 1.8, 2.4);

  /* RIM — behind and above, the Secondary at full chroma. This is what draws
     the bright edge that separates the silhouette from the void. */
  var rim = new DirectionalLight(new Color(palette.rim).getHex(), 1.5);
  rim.position.set(1.6, 3.2, -5.2);

  /* Ground-to-sky ambient. Cheaper and more directional than flat ambient:
     the floor bounce arrives from below in the floor's own colour. */
  var hemi = new HemisphereLight(new Color(palette.card).getHex(), new Color(palette.floor).getHex(), 0.34);

  /* A floor of last resort so nothing is ever absolutely 0,0,0. */
  var ambient = new AmbientLight(new Color(palette.ink).getHex(), 0.6);

  var all = [key, fill, rim, hemi, ambient];
  if (group) all.forEach(function (l) { group.add(l); });

  /* Exposed so a future character-attitude system can swing the key the way
     fabiMidpointPerspective already swings the 2.5D specular — same idea,
     real light. Horizontal only, matching R83's finding that vertical
     position must not vote on which side catches light. */
  function setKeyAzimuth(ratio) {
    var r = Math.max(-1, Math.min(1, Number(ratio) || 0));
    var radius = Math.sqrt(2.2 * 2.2 + 5.2 * 5.2);
    var base = Math.atan2(5.2, -2.2);
    var a = base - r * 0.6;
    key.position.set(Math.cos(a) * radius, 6.2, Math.sin(a) * radius);
  }

  function setIntensity(scale) {
    var k = Math.max(0, Number(scale) || 1);
    key.intensity = 2.1 * k;
    fill.intensity = 0.42 * k;
    rim.intensity = 1.5 * k;
  }

  function dispose() {
    all.forEach(function (l) {
      if (l.shadow && l.shadow.map && l.shadow.map.dispose) l.shadow.map.dispose();
      if (l.parent) l.parent.remove(l);
      if (l.dispose) l.dispose();
    });
  }

  return {
    key: key, fill: fill, rim: rim, hemi: hemi, ambient: ambient,
    all: all,
    setKeyAzimuth: setKeyAzimuth,
    setIntensity: setIntensity,
    dispose: dispose
  };
}
