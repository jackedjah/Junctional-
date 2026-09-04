/* MR.MAH 3D :: LIGHTS
   A three-point rig whose job is to REVEAL FACETS.

   The reference has strong dark-to-light contrast: the body is largely dark
   and only some planes catch light. That is the look, and it comes from
   lighting a dark material with directional sources — never from brightening
   the material to compensate for weak lights, which flattens every facet at
   once and is the failure this rig exists to avoid.

   Omnidirectional fill is kept DELIBERATELY LOW. Ambient, hemisphere and
   bounce all raise the floor of every facet at once, and measured against the
   reference that compressed 62% of the character's pixels into a single
   mid-tone band where the reference spreads them from black to white. Contrast
   is the material; fill is what destroys it.

   Key from the front-left and high, so the character's front and side planes
   return clearly different values. Fill from the opposite side at a fraction
   of the key, only enough to keep the shadow side readable. Rim from behind
   in full-chroma cyan, which is what separates the silhouette from the void —
   the same job the 2.5D rig's Secondary perimeter does by hand. */

import {
  DirectionalLight, HemisphereLight, AmbientLight, PointLight, Color
} from '../vendor/three/three.module.min.js';

export function createLights(options) {
  var opts = options || {};
  var settings = opts.settings || { shadows: true, shadowMapSize: 512 };
  var group = opts.parent;

  /* Cool white key — not cyan. A cyan key would tint every lit plane and the
     body would start reading as "a glowing cyan object", which the reference
     explicitly is not. The cyan belongs to the edges and the rim. */
  var key = new DirectionalLight(new Color(0xd8ecff), 2.6);
  key.position.set(-4.2, 7.4, 6.2);
  key.castShadow = !!settings.shadows;
  if (key.castShadow) {
    var s = settings.shadowMapSize || 512;
    key.shadow.mapSize.set(s, s);
    key.shadow.camera.left = -3.2;
    key.shadow.camera.right = 3.2;
    key.shadow.camera.top = 4.6;
    key.shadow.camera.bottom = -0.6;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 22;
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.024;
  }

  /* Fill — cool, weak, opposite side. Never casts. */
  var fill = new DirectionalLight(new Color(0x5f88a8), 0.34);
  fill.position.set(5.6, 2.2, 3.4);

  /* Rim — cyan, from behind and above. This is what draws the lit contour. */
  var rim = new DirectionalLight(new Color(0x49dcff), 2.2);
  rim.position.set(1.4, 4.6, -7.0);

  /* A second rim from the other side, weaker, so the silhouette closes on
     both edges when the character turns. */
  var rim2 = new DirectionalLight(new Color(0x3fb8e8), 1.1);
  rim2.position.set(-5.2, 3.0, -5.6);

  /* Floor bounce: the grid is a light source in the reference, and a point
     light low and in front sells the character standing IN the world rather
     than composited over it. */
  var bounce = new PointLight(new Color(0x2fbfe8), 0.85, 9, 2);
  bounce.position.set(0, 0.28, 1.5);

  var hemi = new HemisphereLight(new Color(0x1b2836), new Color(0x08222e), 0.20);

  /* Deliberately tiny. The dark side of a crystal should be nearly black —
     that contrast is the material. */
  var ambient = new AmbientLight(new Color(0x0e1a24), 0.10);

  var all = [key, fill, rim, rim2, bounce, hemi, ambient];
  if (group) all.forEach(function (l) { group.add(l); });

  /* Swing the key horizontally with the character's yaw so the lit side
     follows him as he turns. Horizontal only — vertical position must never
     vote on which side catches light. */
  function setKeyAzimuth(ratio) {
    var r = Math.max(-1, Math.min(1, Number(ratio) || 0));
    var radius = Math.hypot(4.2, 6.2);
    var base = Math.atan2(6.2, -4.2);
    var a = base - r * 0.55;
    key.position.set(Math.cos(a) * radius, 7.4, Math.sin(a) * radius);
  }

  function setIntensity(scale) {
    var k = Math.max(0, Number(scale) || 1);
    key.intensity = 2.6 * k;
    fill.intensity = 0.34 * k;
    rim.intensity = 2.2 * k;
    rim2.intensity = 1.1 * k;
    bounce.intensity = 0.85 * k;
  }

  function dispose() {
    all.forEach(function (l) {
      if (l.shadow && l.shadow.map && l.shadow.map.dispose) l.shadow.map.dispose();
      if (l.parent) l.parent.remove(l);
      if (l.dispose) l.dispose();
    });
  }

  return {
    key: key, fill: fill, rim: rim, rim2: rim2, bounce: bounce,
    hemi: hemi, ambient: ambient, all: all,
    setKeyAzimuth: setKeyAzimuth, setIntensity: setIntensity, dispose: dispose
  };
}
