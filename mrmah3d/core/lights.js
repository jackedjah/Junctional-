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
  var key = new DirectionalLight(new Color(0xd8ecff), 5.5);
  key.position.set(-4.2, 7.4, 6.2);
  key.castShadow = false;
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
  /* R94: raising this to 0.62 was measured as a no-op on the chest histogram
     (mean 50.6 -> 50.9). A dim fill on a dark, absorbing albedo cannot fill the
     32-63 band; the deep colour and the absorption own that end. Left alone. */
  /* R94 — A REAL OPPOSING FILL, in STEEL. Sampled, the reference's unlit
     planes are near-neutral grey at 20-55 luma — (24,27,35), (45,54,71) — and
     its blue lives in the lit and transmitting crystal. This build's darks were
     saturated blue at 20-30 luma because every soft source was itself a deep
     saturated blue carrying almost no luminance: tripling the hemisphere moved
     the chest histogram by 0.3%. Luma comes from green, and the soft rig now
     has some. */
  /* R95-BB: 2.2 -> 1.4. The bodybuilder reference is lit from one side — the
     left pec, deltoid and arm bright, the right side of the chest in a deep
     recess — and its chest histogram is 50% under 32 luma where this build's
     was 44%. A softer fill from the right is what lets the far side of every
     pair (pecs, deltoids, quad heads) fall away, which is the local contrast
     the brief asks for. */
  var fill = new DirectionalLight(new Color(0x9fb8d2), 1.4);
  fill.position.set(5.6, 3.0, 4.0);

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
  /* R95-BB: range 9 -> 2.0. The bounce reached the whole character, and on
     any plane facing the camera and tilted down — the back of the lowered
     hand, the lower back of the head when he is turned — it drew its specular
     as a cyan blob (matched by colour: 0x2fbfe8, not the chest lamp's
     0x4fe3ff). Its job is the lower body standing in the floor glow, which is
     within 1.7 of it; the chest at 2.05 and the head at 2.5 now take nothing.
     Intensity up a little to hold the quad where it was under the falloff. */
  var bounce = new PointLight(new Color(0x2fbfe8), 1.05, 2.0, 2);
  bounce.position.set(0, 0.28, 1.5);

  /* R91 — HIS OWN EMISSIONS LIGHT THE SURFACES AROUND THEM.

     The face and the chest emblem are emissive, but emissive materials in this
     renderer light nothing: they are a colour written into the frame, not a
     source. So the geometry immediately around them stayed exactly as dark as
     the geometry across the body, which is the "composited rather than
     integrated" reading the brief describes — a glowing decal on a dark solid
     rather than a light inside a crystal.

     Two small point lights fix it for the cost of two lights. Short range on
     purpose (1.5 and 1.1 units, quadratic falloff) so each one reaches the
     planes around its own emitter and nothing else: the chest lamp grazes the
     pectorals, the sternum and the inner faces of both upper arms; the face
     lamp catches the cavity walls and the underside of the head's bevels. They
     are not general fill — at these radii they are inert three feet away, which
     is what keeps this a local response rather than a brightening pass.

     Their positions are the emblem's and the face plate's, and their intensity
     rides the character's glow so a thinking pulse spills into the body around
     it rather than being confined to the emitter. */
  /* Standing OFF the surface, with a gentler falloff. At distance 1.5 and
     0.30 units out it sat almost on the chest wall, and a point light that
     close to a surface draws itself on it: a hot blob appeared on the abdomen
     below the emblem, which is a lamp, not a glow. Further forward and wider
     makes the near planes a gradient instead of a spot. */
  /* R94 — further out again, and softer. With the torso's outer surface
     finally rendering (see the winding note in forge.js) the chest wall is at
     z ~0.26, so a lamp at 0.46 sat 0.2 units off it and every facet around the
     emblem drew a hot specular dot of it — three white points on the sternum.
     At 0.95 with a wider range it is a gradient across the pectorals, which is
     what the emblem's light looks like in the references. */
  /* R95: reviewed as drawing hot specular blobs on the deltoids at yaw —
     pulled further back and dimmed; its job is the sternum, not the shoulders. */
  /* R95-BB: range 2.4 -> 1.3. At 2.4 the lamp reached the lowered hand (1.36
     away) and drew its specular on the back of the hand as a hot cyan blob;
     the chest it exists for is 0.8-0.9 away and still inside the falloff. */
  /* And again for the REAR views: turned away (the rear three-quarter output,
     or any drag past 120 degrees) the back of the head and the tricep of the
     raised arm came within 1.0-1.1 of a lamp standing 1.1 units in front of
     the chest and each drew its specular as a cyan blob. Closer to the chest
     wall with a shorter reach, and dimmer to match the inverse square: the
     sternum still takes 0.64 of the lamp at 0.6 away, the turned head's back
     at 0.89 takes nothing. */
  var chestLamp = new PointLight(new Color(0x4fe3ff), 0.62, 0.9, 2);
  chestLamp.position.set(0, 1.80, 0.85);
  /* R95: range 1.1 -> 0.5. Reviewed, the face lamp reached the shoulder line
     half a unit below the head and drew pinpoint white speculars across the
     crown, traps and neck. It only needs the cavity walls and bevel undersides. */
  /* R95-BB: range 0.5 -> 0.36, and back toward the plate. Isolated by zeroing
     each light in turn (blobprobe): the cyan blob on the lower back of the
     head in every rear view was THIS lamp — two suspects had been ruled out
     by geometry first, wrongly; the head is small enough that a lamp inside
     its cavity reaches its back shell at 0.35. The cavity walls at 0.28 keep
     0.4 of the lamp; the back shell at 0.30-0.35 keeps a tenth or nothing. */
  var faceLamp = new PointLight(new Color(0x6cebff), 0.85, 0.36, 2);
  faceLamp.position.set(0, 2.62, 0.10);

  /* R92 — THE FLOOR UNDER THE DARKS IS SAPPHIRE, NOT VOID.

     A plane turned away from every source has to land on SOMETHING, and what it
     landed on was 0.10 of a near-neutral ambient — i.e. black. That is why 54%
     of the character measured near-black while the brief asks for 10-15%: not
     because the lit planes were wrong, but because the unlit ones had no colour
     to fall back to.

     In the reference a lost shadow plane is still dark sapphire. That is what
     these two provide: a deep blue floor, from above and below, strong enough
     that the darkest facets read as deep crystal and weak enough that the value
     hierarchy above them survives. Raising ambient is normally the fastest way
     to destroy a dark end — the difference here is that it is raising it to a
     COLOUR rather than to grey, and the hierarchy is carried by hue as much as
     by value from this point on. */
  var hemi = new HemisphereLight(new Color(0x7186a4), new Color(0x2a3442), 0.55);

  /* Deliberately tiny. The dark side of a crystal should be nearly black —
     that contrast is the material. */
  var ambient = new AmbientLight(new Color(0x3c4a60), 0.30);

  var all = [key, fill, rim, rim2, bounce, chestLamp, faceLamp, hemi, ambient];
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
    key.intensity = 5.5 * k;
    fill.intensity = 1.4 * k;
    rim.intensity = 2.2 * k;
    rim2.intensity = 1.1 * k;
    bounce.intensity = 1.05 * k;
    chestLamp.intensity = 0.62 * k;
    faceLamp.intensity = 0.85 * k;
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
    setKeyAzimuth: setKeyAzimuth, setIntensity: setIntensity, dispose: dispose,
    /* The scene rides these on the character's glow so a thinking pulse spills
       into the geometry around each emitter rather than staying on it. */
    setEmissionGlow: function (g) {
      var k = Math.max(0, Number(g) || 1);
      chestLamp.intensity = 0.62 * k;
      faceLamp.intensity = 0.85 * k;
    }
  };
}
