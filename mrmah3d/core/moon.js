/* MR.MAH 3D :: MOON  (R95 world)
   The large moon high in the sky of reference/mrmah-refD-guardian-a.png and
   -d.png, and the cloud masses that frame its lower half.

   What the references show, measured rather than remembered: a disc about a
   quarter of the frame's width, MOSTLY WHITE with only the faintest blue in
   it — over its own pixels guardian-a's disc averages 137 luma with 60% of
   them in 128-191 and under 2% above 224, i.e. a textured grey-white with
   maria and craters, never a blown circle — with a soft limb glow that dies
   within a third of a radius, and two or three dark cloud masses crossing its
   lower half with lit tufts where they face it. The character remains the
   brightest thing in the frame; the moon is the second.

   HOW IT IS BUILT, and why:

   - ONE quad. The disc, its maria, its craters and its limb glow are painted
     once into a canvas (as environment.js paints its other textures), so the
     whole moon is one draw at any tier. Deterministic: the same moon on every
     mount, or a screenshot comparison is worthless.
   - NORMAL blending, not additive. The disc is a solid the clouds pass in
     FRONT of; an additive moon could not be occluded by a cloud, and an
     additive cloud over it would brighten, not veil.
   - fog:false with the distance authored into the colour. At z=-140 it is far
     beyond fog.far, and a fogged object there is a solid wall of fog colour
     — the trap that killed an earlier horizon band.
   - The clouds are three quads in ONE geometry, sharing the environment's
     dense corner-cloud texture, so they cost one draw. They sit a little in
     front of the disc, dark over the sky and grey over the moon.

   Placed against the MEASURED showcase and website frames: at z=-140 the
   point (-14, 41) projects to 0.27 across, 0.13 down in showcase and 0.23,
   0.13 in website — guardian-a's moon is centred at 0.26, 0.125 — and a
   13-unit disc there is 0.17 of the frame's height, which is the reference's
   0.167. Its lowest edge sits at row ~0.22, far above the horizon rows that
   DEPTH-01 reads and well clear of his apex at 0.17 in the centre. The in-app
   modes see it from their own angle (upper right of centre); there it is
   scaled down by the same scale hint that withholds the corner clouds, so it
   stays present but never competes with the DOM UI in front of it. */

import {
  Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, Group, Color,
  BufferGeometry, Float32BufferAttribute, DoubleSide
} from '../vendor/three/three.module.min.js';

function prng(seed) {
  var s = (seed >>> 0) || 1;
  return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/* The disc, painted in LUMINANCE only — the material supplies the faint blue.
   R is 0.33 of the canvas so the limb glow (to 1.5 R) fits inside it.

   Round 1 measured the first cut at 96-159 luma over the disc with nothing
   above 160 against the reference's 57% in 128-191, and its 46 craters read
   as polka dots. So: a brighter body, fewer and softer craters, broader and
   fainter maria, and less grain. */
export function moonTexture(size) {
  var c = document.createElement('canvas');
  c.width = c.height = size;
  var g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  var rnd = prng(19690720);
  var cx = size / 2, cy = size / 2, R = size * 0.33;

  /* Limb glow, under the disc: gone by 1.5 R. A wide halo here would be a
     bigger sky, and the sky must stay black. */
  var glow = g.createRadialGradient(cx, cy, R * 0.90, cx, cy, R * 1.50);
  glow.addColorStop(0.00, 'rgba(255,255,255,0.50)');
  glow.addColorStop(0.22, 'rgba(255,255,255,0.16)');
  glow.addColorStop(0.55, 'rgba(255,255,255,0.04)');
  glow.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);

  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  /* The body: nearly flat — a full moon is lit face-on — with a little
     limb darkening so the disc reads as a sphere rather than a coin. */
  var body = g.createRadialGradient(cx - R * 0.22, cy - R * 0.26, R * 0.10, cx, cy, R);
  body.addColorStop(0.00, 'rgba(255,255,255,1)');
  body.addColorStop(0.66, 'rgba(248,249,252,1)');
  body.addColorStop(0.93, 'rgba(230,233,240,1)');
  body.addColorStop(1.00, 'rgba(206,211,222,1)');
  g.fillStyle = body;
  g.fillRect(0, 0, size, size);

  /* Maria: broad dark plains, overlapping, biased to one side of the disc as
     the real ones are. Each is a soft blob; several overlapping give the
     lumpy, continental pattern rather than polka dots. */
  for (var i = 0; i < 14; i++) {
    var ang = rnd() * Math.PI * 2, rad = Math.sqrt(rnd()) * R * 0.78;
    var mx = cx + Math.cos(ang) * rad * (i < 9 ? 1 : 0.6) + (i < 9 ? R * 0.14 : 0);
    var my = cy + Math.sin(ang) * rad * 0.9 + (i < 9 ? -R * 0.06 : 0);
    var mr = R * (0.16 + rnd() * 0.26);
    var ma = 0.06 + rnd() * 0.11;
    g.save();
    g.translate(mx, my);
    g.scale(1 + (rnd() - 0.5) * 0.8, 1 + (rnd() - 0.5) * 0.8);
    var mg = g.createRadialGradient(0, 0, 0, 0, 0, mr);
    mg.addColorStop(0.00, 'rgba(70,80,100,' + ma.toFixed(3) + ')');
    mg.addColorStop(0.60, 'rgba(70,80,100,' + (ma * 0.65).toFixed(3) + ')');
    mg.addColorStop(1.00, 'rgba(70,80,100,0)');
    g.fillStyle = mg;
    g.fillRect(-mr, -mr, mr * 2, mr * 2);
    g.restore();
  }
  /* Craters: a few soft pits, each with a thin lit rim on its sunward side.
     Small and faint — at the disc's on-screen size a crater is texture, not
     a feature. */
  for (var k = 0; k < 22; k++) {
    var ca = rnd() * Math.PI * 2, cr = Math.sqrt(rnd()) * R * 0.92;
    var px = cx + Math.cos(ca) * cr, py = cy + Math.sin(ca) * cr;
    var r = R * (0.016 + rnd() * 0.036);
    var a = 0.07 + rnd() * 0.12;
    var pit = g.createRadialGradient(px, py, 0, px, py, r);
    pit.addColorStop(0.00, 'rgba(60,70,90,' + a.toFixed(3) + ')');
    pit.addColorStop(0.65, 'rgba(60,70,90,' + (a * 0.5).toFixed(3) + ')');
    pit.addColorStop(1.00, 'rgba(60,70,90,0)');
    g.fillStyle = pit;
    g.fillRect(px - r, py - r, r * 2, r * 2);
    g.strokeStyle = 'rgba(255,255,255,' + (0.08 + rnd() * 0.12).toFixed(3) + ')';
    g.lineWidth = Math.max(1, r * 0.2);
    g.beginPath();
    g.arc(px, py, r * 0.9, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
  }
  /* Grain: +/-1.5% per pixel inside the disc, so the 8-bit gradients do not
     render as contour rings on a surface this smooth. */
  var img = g.getImageData(0, 0, size, size), d = img.data;
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > R * R) continue;
      var idx = (y * size + x) * 4;
      var m = 1 + 0.03 * (rnd() - 0.5);
      d[idx] = Math.min(255, d[idx] * m);
      d[idx + 1] = Math.min(255, d[idx + 1] * m);
      d[idx + 2] = Math.min(255, d[idx + 2] * m);
    }
  }
  g.putImageData(img, 0, 0);
  g.restore();
  var t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/* The clouds that cross the moon, painted with their own LUMINANCE: a dark
   body along a wandering chain of blobs, and lit tufts along its upper edge
   where it faces the disc. One tone could not do this — round 1 drew them
   from the corner-cloud alpha with a single grey and, over a 150-luma disc,
   the densest core was a mild veil while over the sky it was nothing.
   guardian-a's clouds at the moon sit at 60-90 luma with rims to 150. The
   shape is the corner clouds' — a lumpy tapering mass, dense at the left,
   cut by a soft ellipse, faded at every edge — with a gentler dither, because
   a dense texture shows the +/-30% grain the faint one hid. */
export function moonCloudTexture() {
  var c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  var g = c.getContext('2d');
  g.clearRect(0, 0, 256, 128);
  var rnd = prng(20250904);
  /* The body: large overlapping blobs, dense. Round 2's 30-px blobs at 0.7
     were a thin band the disc showed through; a cloud that crosses a moon is
     a MASS. */
  var cx = 44, cy = 70;
  for (var i = 0; i < 18; i++) {
    var r = 40 - i * 1.0 + rnd() * 18;
    var a = Math.min(1, (0.92 - i * 0.018) + rnd() * 0.20);
    var grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0, 'rgba(30,36,48,' + a.toFixed(3) + ')');
    grd.addColorStop(0.62, 'rgba(30,36,48,' + (a * 0.72).toFixed(3) + ')');
    grd.addColorStop(1, 'rgba(30,36,48,0)');
    g.fillStyle = grd;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    cx += 9 + rnd() * 7;
    cy += (rnd() - 0.5) * 18;
    cy = Math.max(44, Math.min(90, cy));
  }
  /* Lit tops: a continuous band of broader, softer masses along the upper
     edge — what the disc lights — not a string of beads. Drawn over the body
     so the lit rim reads as the cloud's own surface turned toward the moon. */
  cx = 40; cy = 52;
  for (var j = 0; j < 16; j++) {
    var tr = 16 + rnd() * 14;
    var ta = 0.22 + rnd() * 0.22;
    var tg = g.createRadialGradient(cx, cy - tr * 0.2, 0, cx, cy, tr);
    tg.addColorStop(0, 'rgba(172,184,204,' + ta.toFixed(3) + ')');
    tg.addColorStop(0.5, 'rgba(172,184,204,' + (ta * 0.45).toFixed(3) + ')');
    tg.addColorStop(1, 'rgba(172,184,204,0)');
    g.fillStyle = tg;
    g.fillRect(cx - tr, cy - tr, tr * 2, tr * 2);
    cx += 11 + rnd() * 6;
    cy += (rnd() - 0.5) * 12;
    cy = Math.max(40, Math.min(66, cy));
  }
  g.globalCompositeOperation = 'destination-out';
  g.save();
  g.translate(112, 66);
  g.scale(1.0, 0.44);
  var ell = g.createRadialGradient(0, 0, 0, 0, 0, 136);
  ell.addColorStop(0, 'rgba(0,0,0,0)');
  ell.addColorStop(0.58, 'rgba(0,0,0,0)');
  ell.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = ell;
  g.fillRect(-150, -150, 300, 300);
  g.restore();
  var hfade = g.createLinearGradient(0, 0, 256, 0);
  hfade.addColorStop(0, 'rgba(0,0,0,1)');
  hfade.addColorStop(0.09, 'rgba(0,0,0,0)');
  hfade.addColorStop(0.90, 'rgba(0,0,0,0)');
  hfade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = hfade;
  g.fillRect(0, 0, 256, 128);
  g.globalCompositeOperation = 'source-over';
  var img = g.getImageData(0, 0, 256, 128), px = img.data;
  for (var k = 3; k < px.length; k += 4) {
    var al = px[k];
    if (al > 0) px[k] = Math.max(0, Math.min(255, Math.round(al * (1 + 0.16 * (rnd() - 0.5)))));
  }
  g.putImageData(img, 0, 0);
  var t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/* Where the moon hangs, and how big. The disc is 0.66 of the quad. */
export var MOON = { x: -14, y: 41, z: -140, disc: 13.0 };

/* The clouds that frame it: three quads in one geometry. Offsets are from
   the moon's centre; `flip` mirrors the texture so its dense end faces the
   other way. Authored against guardian-a: a large mass across the lower left
   of the disc, a second across the lower right, a small tuft beside the upper
   left limb. */
/* Both crossing masses end at world x ~ -5 (0.39 across in showcase): round 3
   ran the right-hand one out to x -1 and its lit tops sat against his head's
   left corner, which is clutter on the one outline that matters. */
var MOON_CLOUDS = [
  { dx: -0.6, dy: -4.2, dz: 4.0, w: 19.0, h: 9.0, flip: false },
  { dx: 3.0, dy: -6.8, dz: 3.0, w: 12.0, h: 6.6, flip: false },
  { dx: -9.4, dy: 2.4, dz: 5.0, w: 9.5, h: 4.6, flip: false }
];

/* createMoon()
     group          the disc and its clouds (export as 'moon')
     applyWeight(w) per-mode structures weight, from AUTHORED baselines
     setDetail(k)   scale hint: dims the whole moon toward a third at app scale
     update(dt)     the clouds sway, slowly
     dispose()      releases everything it made */
export function createMoon(options) {
  var opts = options || {};
  var owned = [];
  var group = new Group();
  group.name = 'moon';

  var tex = moonTexture(opts.size || 320);
  /* Mostly white with the faintest hint of the secondary blue. Opacity is
     the disc's VALUE: the renderer writes linear values with no tone mapping,
     so 255 x 0.95 x 0.86 lands the brightest part around 200 and the maria
     around 150 — the reference disc's distribution, not a white hole. */
  var mat = new MeshBasicMaterial({
    map: tex, color: new Color(0xf2f6ff), transparent: true, opacity: 0.86,
    depthWrite: false, toneMapped: false, fog: false, side: DoubleSide
  });
  var quad = MOON.disc / 0.66;
  var disc = new Mesh(new PlaneGeometry(quad, quad), mat);
  disc.position.set(MOON.x, MOON.y, MOON.z);
  disc.name = 'moon-disc';
  /* Drawn first among the transparent layers: it is the farthest thing in
     the world and everything else lies in front of it. */
  disc.renderOrder = -40;
  group.add(disc);
  owned.push(disc.geometry, mat, tex);

  /* The framing clouds. */
  var pos = [], uv = [];
  MOON_CLOUDS.forEach(function (b) {
    var x0 = MOON.x + b.dx - b.w / 2, x1 = MOON.x + b.dx + b.w / 2;
    var y0 = MOON.y + b.dy - b.h / 2, y1 = MOON.y + b.dy + b.h / 2;
    var z = MOON.z + b.dz;
    var u0 = b.flip ? 1 : 0, u1 = b.flip ? 0 : 1;
    var p = [[x0, y0], [x1, y0], [x1, y1], [x0, y0], [x1, y1], [x0, y1]];
    var t = [[u0, 0], [u1, 0], [u1, 1], [u0, 0], [u1, 1], [u0, 1]];
    for (var i = 0; i < 6; i++) { pos.push(p[i][0], p[i][1], z); uv.push(t[i][0], t[i][1]); }
  });
  var cloudGeo = new BufferGeometry();
  cloudGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  cloudGeo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  /* Dark over the sky, a silhouette over the moon, lit along the top.
     Normal blending: a cloud VEILS what is behind it. The texture carries
     its own two tones, so the material colour is white. */
  var cloudTex = moonCloudTexture();
  var cloudMat = new MeshBasicMaterial({
    map: cloudTex, color: new Color(0xffffff), transparent: true, opacity: 0.96,
    depthWrite: false, toneMapped: false, fog: false, side: DoubleSide
  });
  owned.push(cloudTex);
  var clouds = new Mesh(cloudGeo, cloudMat);
  clouds.name = 'moon-clouds';
  clouds.renderOrder = -39;
  clouds.frustumCulled = false;
  group.add(clouds);
  owned.push(cloudGeo, cloudMat);

  /* Authored baselines, captured once. */
  var BASE = { disc: mat.opacity, cloud: cloudMat.opacity };
  var weight = 1, detail = 1, time = 0;

  function write() {
    /* Full from a scale hint of 0.60 (portrait 0.61, showcase 1.0), down to a
       third at 0 (chat 0.13, protocol 0.26): present in the app frames, never
       the brightest thing in them. */
    var k = 0.34 + 0.66 * Math.max(0, Math.min(1, detail / 0.60));
    mat.opacity = BASE.disc * weight * k;
    cloudMat.opacity = BASE.cloud * weight * k;
    group.visible = weight > 0.05;
  }
  function applyWeight(w) {
    weight = Math.max(0, Math.min(1, w == null ? 1 : w));
    write();
  }
  function setDetail(k) {
    detail = Math.max(0, Math.min(1, Number(k) || 0));
    write();
  }
  function update(dt) {
    time += dt;
    /* The clouds drift a little across the disc and back — slow enough to
       be weather, never enough to leave it. */
    clouds.position.x = Math.sin(time * 0.030) * 0.9;
    clouds.position.y = Math.sin(time * 0.021 + 1.3) * 0.25;
  }
  function dispose() {
    owned.forEach(function (o) { if (o && o.dispose) o.dispose(); });
    if (group.parent) group.parent.remove(group);
  }

  return {
    group: group, disc: disc, clouds: clouds, material: mat,
    applyWeight: applyWeight, setDetail: setDetail, update: update, dispose: dispose
  };
}

export var __internals = { MOON: MOON, MOON_CLOUDS: MOON_CLOUDS };
