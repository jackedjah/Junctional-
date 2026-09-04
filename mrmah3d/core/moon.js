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
   fainter maria, and less grain.

   Review (R95 world, round 5): the round-1 disc measured right in the middle
   (upper half 157 against the reference's 162) and had NOTHING above 192
   where guardian-a's clear upper half carries 11% — the reference's limb is
   the brightest ring of the disc, crisp, with the glow just outside it, and
   its rays are white; ours darkened toward the limb and faded into the glow
   with no edge. And the 320-px canvas was being MAGNIFIED at showcase scale,
   so 14 soft maria and 22 faint pits read as a smudged marble. So the
   texture now carries the whole value distribution — a mid grey-white body,
   a limb RING at 255, ray splashes and ~90 hard-floored craters with 1-px
   rims on a 512 canvas — and the material is fully opaque (below), because
   at 0.86 x the showcase weight 0.85 nothing in the texture could reach 192.
   Delivered value = texture x 0.96 (the material's tint) x mode weight. */
export function moonTexture(size) {
  var c = document.createElement('canvas');
  c.width = c.height = size;
  var g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  var rnd = prng(19690720);
  var cx = size / 2, cy = size / 2, R = size * 0.33;

  /* Limb glow, OUTSIDE the disc: it starts at the limb, so the halo sits
     just outside a bright edge, and is gone by 1.5 R. A wide halo here would
     be a bigger sky, and the sky must stay black. */
  var glow = g.createRadialGradient(cx, cy, R, cx, cy, R * 1.50);
  glow.addColorStop(0.00, 'rgba(255,255,255,0.46)');
  glow.addColorStop(0.16, 'rgba(255,255,255,0.15)');
  glow.addColorStop(0.50, 'rgba(255,255,255,0.04)');
  glow.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);

  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  /* The body: a mid grey-white, lit a little from the upper left, with a
     LIMB RING — the brightest ring of the disc — and the clip's anti-aliased
     arc as its hard edge. The maria and craters pull the middle down from
     here toward the reference's 128-191 spread. */
  var body = g.createRadialGradient(cx - R * 0.22, cy - R * 0.26, R * 0.10, cx, cy, R);
  /* Delivered value = texel luma x the mode weight (0.85 in showcase) over
     the ink: 255 -> 219, 230 -> 198, 201 -> 173, 190 -> 164. The faint blue
     lives HERE now, not in the material: a tinted material is sRGB-decoded
     to 0.92 and with it nothing in the texture could deliver above 200,
     which is how the top band went missing twice. The reference's upper
     half is MORE contrasty than a flat disc — 41% in 128-159 and 7% in
     96-127 under 11% above 192 — so the mid-body sits at the reference's
     middle and the highlight zone (t < 0.22, ~9% of the disc) and the limb
     ring are what clear 192. */
  /* Each stop is (L-14, L, L+22) for its luma L: the reference disc has
     b > r+25 over 63% of its pixels at chroma ~27, and a tint of a few
     units vanished under the 0.85 weight. */
  body.addColorStop(0.00, 'rgba(255,255,255,1)');
  body.addColorStop(0.10, 'rgba(240,248,255,1)');
  body.addColorStop(0.22, 'rgba(216,230,252,1)');
  body.addColorStop(0.50, 'rgba(184,198,220,1)');
  body.addColorStop(0.86, 'rgba(174,188,210,1)');
  body.addColorStop(0.925, 'rgba(194,208,230,1)');
  body.addColorStop(0.95, 'rgba(252,253,255,1)');
  body.addColorStop(1.00, 'rgba(252,253,255,1)');
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
  /* Ray splashes, under the craters: the bright young impacts the reference
     shows as three or four white smears with thin rays. The core is what
     puts a few disc pixels above 192 besides the limb. */
  /* A tight core with 1-px rays read as a lone dot at chat scale — a star
     on the disc, to the eye. The core is broad and soft and the rays are
     wide enough to survive minification, so it reads as a splash. */
  for (var s = 0; s < 4; s++) {
    var sa = rnd() * Math.PI * 2, sr = Math.sqrt(rnd()) * R * 0.72;
    var sx = cx + Math.cos(sa) * sr, sy = cy + Math.sin(sa) * sr;
    var core = R * (0.08 + rnd() * 0.06);
    var splash = g.createRadialGradient(sx, sy, 0, sx, sy, core);
    splash.addColorStop(0.00, 'rgba(255,255,255,0.60)');
    splash.addColorStop(0.35, 'rgba(255,255,255,0.34)');
    splash.addColorStop(0.75, 'rgba(255,255,255,0.12)');
    splash.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = splash;
    g.fillRect(sx - core, sy - core, core * 2, core * 2);
    var nRays = 7 + Math.floor(rnd() * 6);
    for (var q = 0; q < nRays; q++) {
      var ra = rnd() * Math.PI * 2, rl = R * (0.12 + rnd() * 0.30);
      g.strokeStyle = 'rgba(255,255,255,' + (0.18 + rnd() * 0.16).toFixed(3) + ')';
      g.lineWidth = 1.5 + rnd() * 1.5;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + Math.cos(ra) * rl, sy + Math.sin(ra) * rl);
      g.stroke();
    }
  }
  /* Craters: a dense field of hard-floored pits — the floor is flat to 0.7 r
     and gone at r — each with a crisp 1-px rim all round and a brighter arc
     on the sunward (upper-left) side. Dense and small: at the disc's
     on-screen size this is the high-frequency texture that reads as sharp
     at any scale, where a few soft pits read as a smudge. */
  for (var k = 0; k < 90; k++) {
    var ca = rnd() * Math.PI * 2, cr = Math.sqrt(rnd()) * R * 0.94;
    var px = cx + Math.cos(ca) * cr, py = cy + Math.sin(ca) * cr;
    var r = R * (0.012 + rnd() * 0.045);
    var a = 0.25 + rnd() * 0.15;
    var pit = g.createRadialGradient(px, py, 0, px, py, r);
    pit.addColorStop(0.00, 'rgba(60,70,90,' + a.toFixed(3) + ')');
    pit.addColorStop(0.70, 'rgba(60,70,90,' + a.toFixed(3) + ')');
    pit.addColorStop(1.00, 'rgba(60,70,90,0)');
    g.fillStyle = pit;
    g.fillRect(px - r, py - r, r * 2, r * 2);
    g.strokeStyle = 'rgba(255,255,255,' + (0.30 + rnd() * 0.15).toFixed(3) + ')';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(px, py, r * 0.92, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,' + (0.22 + rnd() * 0.20).toFixed(3) + ')';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(px, py, r * 0.92, Math.PI * 1.05, Math.PI * 1.95);
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
/* Review (R95 world, round 5): eighteen soft radial blobs with soft lit
   blobs above were smoke streaks on screen, with no edge anywhere, and in
   chat two grey smudges beside a grey coin. The references' clouds are
   cumulus MASSES: hard lumpy silhouettes, dark bodies, a thin bright edge
   along the TOP where the moon lights them. So the body is now hard-edged
   discs (flat to 0.85 r, a 15% falloff) in three size tiers hung along the
   same wandering chain — a big lump, a turret on it, small tufts on the
   turret — and the lit top is a 3-px band cut from the mass's own
   silhouette: the silhouette minus itself shifted down, which is exactly the
   set of pixels whose upward neighbour is sky. The ellipse cut and the
   horizontal fade stay, so the mass still tapers and dissolves at its ends
   without softening the lumps inside it. Canvas doubled to 512 x 256 so a
   3-px rim is a rim at showcase scale and not a blur. */
export function moonCloudTexture() {
  var W = 512, H = 256;
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  var rnd = prng(20250904);
  /* The chain, and the lumps hung on it. [x, y, r], three tiers per node. */
  var discs = [];
  var cx = 88, cy = 140;
  for (var i = 0; i < 18; i++) {
    var r = (40 - i * 1.0 + rnd() * 18) * 1.5;
    discs.push([cx, cy, r]);
    discs.push([cx + (rnd() - 0.5) * r * 0.9, cy - r * 0.50, r * 0.55]);
    discs.push([cx + (rnd() - 0.5) * r * 1.2, cy - r * 0.78, r * 0.30]);
    discs.push([cx + (rnd() - 0.5) * r * 1.2, cy - r * 0.62, r * 0.36]);
    cx += (9 + rnd() * 7) * 2;
    cy += (rnd() - 0.5) * 36;
    cy = Math.max(88, Math.min(180, cy));
  }
  /* The body: dark, hard-edged, opaque where the lumps overlap. */
  discs.forEach(function (d) {
    var grd = g.createRadialGradient(d[0], d[1], 0, d[0], d[1], d[2]);
    grd.addColorStop(0.00, 'rgba(30,36,48,0.98)');
    grd.addColorStop(0.85, 'rgba(30,36,48,0.98)');
    grd.addColorStop(1.00, 'rgba(30,36,48,0)');
    g.fillStyle = grd;
    g.fillRect(d[0] - d[2], d[1] - d[2], d[2] * 2, d[2] * 2);
  });
  /* The silhouette, at the radius where the body's falloff crosses half
     alpha, so the rim sits on the visible edge. */
  var sil = document.createElement('canvas');
  sil.width = W; sil.height = H;
  var sg = sil.getContext('2d');
  sg.fillStyle = '#fff';
  discs.forEach(function (d) {
    sg.beginPath();
    sg.arc(d[0], d[1], d[2] * 0.93, 0, Math.PI * 2);
    sg.fill();
  });
  /* rimBand(shift, style): the silhouette minus itself shifted down by
     `shift` px, filled with `style` — a band along every upward-facing
     edge and nowhere else — drawn over the body. */
  var band = document.createElement('canvas');
  band.width = W; band.height = H;
  var bg = band.getContext('2d');
  function rimBand(shift, style) {
    bg.globalCompositeOperation = 'source-over';
    bg.clearRect(0, 0, W, H);
    bg.drawImage(sil, 0, 0);
    bg.globalCompositeOperation = 'destination-out';
    bg.drawImage(sil, 0, shift);
    bg.globalCompositeOperation = 'source-in';
    bg.fillStyle = style;
    bg.fillRect(0, 0, W, H);
    g.drawImage(band, 0, 0);
  }
  rimBand(3, 'rgba(210,220,235,0.55)');
  rimBand(1, 'rgba(236,242,255,0.45)');
  g.globalCompositeOperation = 'destination-out';
  g.save();
  g.translate(224, 132);
  g.scale(1.0, 0.44);
  var ell = g.createRadialGradient(0, 0, 0, 0, 0, 272);
  ell.addColorStop(0, 'rgba(0,0,0,0)');
  ell.addColorStop(0.58, 'rgba(0,0,0,0)');
  ell.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = ell;
  g.fillRect(-300, -300, 600, 600);
  g.restore();
  var hfade = g.createLinearGradient(0, 0, W, 0);
  hfade.addColorStop(0, 'rgba(0,0,0,1)');
  hfade.addColorStop(0.09, 'rgba(0,0,0,0)');
  hfade.addColorStop(0.90, 'rgba(0,0,0,0)');
  hfade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = hfade;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  var img = g.getImageData(0, 0, W, H), px = img.data;
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
/* Both crossing masses end at world x ~ -6.5: round 3 ran the right-hand
   one out to x -1 and its lit tops sat against his head's left corner, which
   is clutter on the one outline that matters; at x -5 (round 4) the hard
   cumulus tuft and its lit rim still touched that corner in the website
   (canonical) frame, where his head sits further left than in showcase. The
   tails run into empty sky on the left, so there is nothing to lose there. */
var MOON_CLOUDS = [
  { dx: -2.1, dy: -4.2, dz: 4.0, w: 19.0, h: 9.0, flip: false },
  { dx: 1.5, dy: -6.8, dz: 3.0, w: 12.0, h: 6.6, flip: false },
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

  var tex = moonTexture(opts.size || 512);
  /* The disc is a SOLID and its whole value distribution lives in the
     texture, blue included: the material is white and opaque. The renderer
     writes linear values with no tone mapping, so a texel lands at its own
     value x the mode's structures weight (0.85 in showcase) — a 255 limb at
     ~219, the mid-body around 170, the maria around 150 — the reference
     disc's distribution, with the top band the limb, the highlight zone and
     the ray cores supply. At 0.86 opacity under a tint (sRGB-decoded to
     0.92) nothing in the texture could clear 192, whatever it said. */
  var mat = new MeshBasicMaterial({
    map: tex, color: new Color(0xffffff), transparent: true, opacity: 1.0,
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
