/* MR.MAH 3D :: FORGE
   Geometry builders for faceted crystalline solids.

   Everything Mr.Mah is made of comes from here, so the whole character speaks
   one geometric language: flat planes meeting at hard edges, no smooth shading
   anywhere. That is what lets light reveal the form, which is the requirement
   the reference's readability depends on.

   These build real closed solids with correct winding and per-face normals.
   They are deliberately NOT parametric primitives with a Three.js modifier
   stacked on top — a lofted ring cage is what lets the torso carry a front
   ridge and a measured taper at the same time. */

import { BufferGeometry, Float32BufferAttribute } from '../../vendor/three/three.module.min.js';

/* Build a geometry from explicit vertex positions and triangle indices,
   with FLAT per-face normals. Vertices are expanded per-face rather than
   shared, because a shared vertex would average its neighbours' normals and
   soften exactly the facet edges we are trying to create. */
/* THE OPTICAL LOTTERY — how a crystal stops being a blue mosaic.

   Adding polygons was not enough: every facet still received the same material
   treatment, so the body read as a polygon mosaic in one hue. A real cut stone
   does not behave that way. Depending on how deep the light travels and what
   it meets on the way out, one face returns almost nothing, its neighbour
   returns a near-white specular, another passes light and goes translucent.

   Each triangle is therefore assigned an optical CLASS here, once, at build
   time. The distribution is authored rather than uniform, and weighted hard
   toward the dark end — which is what the reference actually shows:

     black      42%   returns almost nothing
     charcoal   24%   very dark, slight sheen
     deep       18%   dark blue, some transmission
     cyan       10%   catches the cyan band
     silver      6%   the rare bright specular face

   The value is deterministic (a hash of the face index), so the pattern is
   identical on every mount and in every screenshot — never Math.random().

   Returned as a vec3 attribute the shader reads:
     x  roughness offset   (dark faces are rougher and reflect less)
     y  metalness offset   (silver faces are more mirror-like)
     z  darkness           (0 = full value, 1 = swallowed) */
/* ROUGHNESS IS NOT THE WAY TO MAKE A FACET DARK.

   The first version of this table darkened the black class by roughening it to
   0.6+, on the reasoning that a rough face kills its own reflection. It does
   the opposite: roughness widens the reflection lobe, so a rough facet returns
   the AVERAGE of the surrounding environment rather than a single direction.
   With any environment that is not itself black, that average is a solid
   mid-tone, and the darkest class rendered as the same blue as everything else.

   Darkness now comes from where it physically comes from — a near-black albedo
   (`dark`) and a low metalness, so there is little diffuse to light and little
   reflection to return — while roughness stays LOW across the whole table so
   every facet keeps a sharp, directional reflection. A sharp reflection of a
   mostly-black room is black; the same facet rotated a few degrees onto a light
   card is white. That hit-or-miss behaviour across neighbouring planes is the
   entire optical effect, and a broad lobe averages it away. */
/* Reweighted toward the dark end again. The refined reference is dominated by
   near-black and charcoal — well over half its body area — with deep blue as a
   minority, cyan as an accent and silver as a rarity. Half the faces are now
   the black class, and the black class itself goes deeper. The silver class is
   left alone: rarity is what makes a catch read as a catch, and widening it
   would turn the sparkle into a sheen. */
var FACET_CLASSES = [
  /* w,    rough,  metal,  dark,  tint */
  [0.50,   0.14,  -0.36,   1.00,  0.00],   /* black    */
  [0.24,   0.08,  -0.18,   0.74,  0.03],   /* charcoal */
  [0.12,   0.02,   0.04,   0.34,  0.26],   /* deep     */
  [0.07,  -0.04,   0.18,  -0.06,  1.00],   /* cyan     */
  [0.07,  -0.06,   0.34,  -0.82,  0.20]    /* silver   */
];

/* Five classes give five values, and five values across a few hundred facets is
   a mosaic — which is exactly what it looked like. Measured against the
   reference, the classes alone piled 45% of the character's pixels into a
   single band while the reference spreads its midtones evenly across four.

   So each face also gets a JITTER on top of its class, from a second
   independent hash. Same class, still visibly different face. It costs nothing
   (the values are baked into the attribute at build time) and it is what turns
   five discrete steps into a continuous range, which is the difference between
   a polygon mosaic and a cut stone.

   Both hashes are deterministic functions of the face index — never
   Math.random() — so the character is byte-identical on every mount and every
   screenshot, and a comparison run measures the change I made rather than a new
   roll of the dice. */
/* HERO FACETS ARE BIG FACETS.

   "Some planes should carry the entire read of the torso; other facets should
   fall almost completely away." That is a hierarchy of IMPORTANCE, and until
   now every triangle drew from the same lottery regardless of how much of the
   body it covered — so a sliver between two chest planes could come up silver
   while the large plane beside it came up charcoal. The result reads as noise
   however well-authored the individual classes are, because visual weight and
   visual drama were uncorrelated.

   So the face's own AREA now steers its class. A large face is allowed to be
   fully what its class says — near-black, or a silver catch — and is biased
   toward the extremes, because a big plane taking a hero value is exactly what
   makes a cut gemstone read. A small face is pulled toward the middle and
   damped, so transition facets support the form instead of competing with it.

   AREA_HERO is calibrated against the character's own scale (3 world units
   tall): torso and shoulder planes land near or above it, while the slivers
   produced by relief and by the crown's convergence land far below. */
var AREA_HERO = 0.011;

function facetClass(i, area, lift) {
  var n = Math.sin(i * 78.233 + 12.9898) * 43758.5453;
  var r = n - Math.floor(n);
  var m = Math.sin(i * 39.719 + 4.1414) * 24634.6345;
  var j = (m - Math.floor(m)) * 2 - 1;          /* -1 .. 1 */

  /* 0 = a sliver, 1 = a hero plane. sqrt so the ramp is generous in the middle
     rather than only rewarding the very largest faces. */
  var big = area == null ? 0.7 : Math.min(1, Math.sqrt(area / AREA_HERO));
  /* Big faces are pushed AWAY FROM THE MIDDLE of the lottery, toward whichever
     extreme they were already nearer.

     The first version of this lowered `r` for large faces, on the reasoning
     that it would "reach further into the bright end". It does the opposite:
     the table accumulates from black upward, so lowering r lands on black more
     often and silver never got any commoner. The bias has to be symmetric.

     Spreading from the centre is also the behaviour actually wanted, and the
     reference is the argument for it — its large planes are either almost
     black or a bright catch, and it is that pairing, a near-black plane sitting
     directly beside a silver one, that reads as cut crystal. The mid classes
     belong to the small transition faces. */
  r = Math.max(0.0005, Math.min(0.9995, 0.5 + (r - 0.5) * (1 + big * 0.62)));

  /* `lift` biases a whole part away from the black end of the table.

     The body wants half its faces near-black — that is what makes it read as a
     dark crystalline mass. The HEAD does not, and applying the body's
     distribution to it was a real error: stripping the head's linework showed
     the shell underneath was almost entirely black, so every bit of its
     apparent mid-teal was coming from the lines drawn on it. That is the
     "linework is doing the lighting" fault, still fully true for the head long
     after it was fixed on the torso.

     The head is also small, so the same weighting lands far more brutally: on a
     few dozen facets, half of them black leaves nothing to read. Both
     references show a head that is a lighter, clearer crystal than the body
     with dark facets among it, not a black one. */
  if (lift) r = r * (1 - lift) + lift;

  var acc = 0;
  for (var k = 0; k < FACET_CLASSES.length; k++) {
    acc += FACET_CLASSES[k][0];
    if (r <= acc) {
      var c = FACET_CLASSES[k];
      /* Damp everything a small face does. `damp` 1 leaves a hero plane at full
         strength; at 0.35 a sliver keeps only a third of its class's departure
         from the mid tone, which is what makes it a transition rather than a
         statement. */
      var damp = 0.35 + 0.65 * big;
      return [
        c[0],
        c[1] * damp + j * 0.05,                  /* roughness */
        /* A plain offset. These four numbers are OFFSETS applied to the
           material's own values, and the shader already clamps each resulting
           factor into range — an earlier attempt to clamp here instead read
           `max(0 - c[2], ...)`, which for the black class pinned its offset at
           +0.34 and made the darkest facets the most metallic of all. */
        c[2] * damp + j * 0.10,                  /* metalness */
        Math.max(-0.9, Math.min(1, c[3] * damp + j * 0.26 * damp)),  /* darkness */
        Math.max(0, Math.min(1, c[4] * damp + j * 0.14))             /* tint */
      ];
    }
  }
  return FACET_CLASSES[0];
}

export function facetedGeometry(positions, faces, groups, options) {
  var opts = options || {};
  var pos = [], nor = [], fac = [];
  var groupRanges = [];
  var written = 0;
  var faceIndex = 0;

  function emitTri(a, b, c) {
    var ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    var bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
    var cx = positions[c * 3], cy = positions[c * 3 + 1], cz = positions[c * 3 + 2];
    var ux = bx - ax, uy = by - ay, uz = bz - az;
    var vx = cx - ax, vy = cy - ay, vz = cz - az;
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    var len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    /* All three vertices of a face share its optical class, so the value is
       constant across the triangle and the facet reads as one material. */
    /* Triangle area, from the cross product already computed above: |u x v|/2
       is exactly `len / 2`, so the hierarchy costs nothing extra. */
    var k = facetClass(faceIndex++, len * 0.5, opts.lift);
    for (var v = 0; v < 3; v++) fac.push(k[1], k[2], k[3], k[4]);
    written += 3;
  }

  (groups || [{ faces: faces, material: 0 }]).forEach(function (g) {
    var start = written;
    g.faces.forEach(function (f) {
      if (f.length === 3) emitTri(f[0], f[1], f[2]);
      else { emitTri(f[0], f[1], f[2]); emitTri(f[0], f[2], f[3]); }
    });
    groupRanges.push({ start: start, count: written - start, material: g.material || 0 });
  });

  var geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  geo.setAttribute('aFacet', new Float32BufferAttribute(fac, 4));
  if (groupRanges.length > 1) {
    groupRanges.forEach(function (g) { geo.addGroup(g.start, g.count, g.material); });
  }
  geo.computeBoundingSphere();
  return geo;
}

/* Deterministic pseudo-random in 0..1 from two integers.

   Deterministic matters: the character must be identical on every mount and in
   every screenshot, so the facet pattern is a function of position in the mesh,
   never of Math.random(). */
function hash2(i, j) {
  var n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/* How much a vertex is allowed to move, given where it sits around the ring.

   This is what lets the body be richly faceted WITHOUT damaging the measured
   silhouette. Seen from the front camera the outline is drawn by the vertices
   at the extreme left and right of each ring — cos(angle) = +/-1 — while the
   vertices facing the camera contribute nothing to the outline at all. So
   displacement is suppressed near the profile and allowed in full across the
   front and back.

   The result is that the face of him the viewer actually reads gets the most
   plane variation, and the shape they judge him by does not move. */
function reliefWeight(angle) {
  var c = Math.abs(Math.cos(angle));
  return 1 - c * c * 0.82;
}

/* Loft a stack of rings into a closed solid.

   Rings are elliptical in XZ, phased so that with 6 sides a vertex lands dead
   centre-front. That single choice is what gives the torso a vertical prow
   ridge down its middle instead of a flat slab face, which is the strongest
   facet break the reference shows.

   `sections` is an array of { y, w, d } — half-width and half-depth. A section
   with w=0 collapses to a point and is emitted as a fan, which is how the
   torso terminates in its sharp lower tip without a degenerate ring of
   zero-area quads. */
export function loft(sections, sides, options) {
  var opts = options || {};
  var phase = opts.phase == null ? Math.PI / 2 : opts.phase;
  var capTop = opts.capTop !== false;
  var capBottom = opts.capBottom !== false;

  var positions = [];
  var index = [];
  var rings = [];

  function push(x, y, z) { positions.push(x, y, z); return positions.length / 3 - 1; }

  sections.forEach(function (s, ri) {
    if (s.w <= 1e-6 && s.d <= 1e-6) { rings.push({ point: push(0, s.y, 0), verts: null }); return; }
    var verts = [];
    for (var i = 0; i < sides; i++) {
      var a = phase + (i / sides) * Math.PI * 2;
      var guard = reliefWeight(a);

      /* Alternating facet relief. Pulling every other vertex slightly in
         makes each quad of the loft non-planar, so its two triangles get
         different normals and return different values under the same light.
         Without it a lofted taper is almost smooth and the body reads as a
         flat dark shape with lines drawn on it. */
      var relief = 1 + (s.facet || 0) * (i % 2 ? -1 : 1);

      /* CRYSTAL RELIEF — the difference between a faceted cone and a cut gem.

         A regular alternation still produces a regular surface: every quad the
         same size, every plane at the same angle to its neighbour, which is
         what made the body read as machined rather than grown. An irregular
         but DETERMINISTIC displacement gives neighbouring triangles genuinely
         different normals, so they catch genuinely different parts of the
         environment — which is where the reference's glistening front faces
         come from. Weighted by `guard`, so the profile stays measured. */
      var jitter = (hash2(i * 3 + 1, ri * 7 + 2) - 0.5) * 2 * (s.crystal || 0) * guard;

      /* A little vertical scatter too. Perfectly level rings read as stacked
         bands; breaking them is most of what removes the rigid, CAD look. */
      var yJit = (hash2(i * 5 + 11, ri * 13 + 3) - 0.5) * (s.crystalY || 0) * guard;

      /* A shoulder shelf: front and back vertices sit lower than the sides,
         which is the collar chevron the reference shows across the chest. */
      var drop = (s.dip || 0) * Math.abs(Math.sin(a));

      var r = relief + jitter;
      verts.push(push(Math.cos(a) * s.w * r, s.y - drop + yJit, Math.sin(a) * s.d * r));
    }
    rings.push({ point: null, verts: verts });
  });

  var faces = [];
  for (var r = 0; r < rings.length - 1; r++) {
    var lo = rings[r], hi = rings[r + 1];
    if (lo.point != null && hi.verts) {
      for (var i = 0; i < sides; i++) faces.push([lo.point, hi.verts[i], hi.verts[(i + 1) % sides]]);
    } else if (lo.verts && hi.point != null) {
      for (var i2 = 0; i2 < sides; i2++) faces.push([lo.verts[i2], hi.point, lo.verts[(i2 + 1) % sides]]);
    } else if (lo.verts && hi.verts) {
      for (var i3 = 0; i3 < sides; i3++) {
        var a1 = lo.verts[i3], b1 = lo.verts[(i3 + 1) % sides];
        var c1 = hi.verts[(i3 + 1) % sides], d1 = hi.verts[i3];
        /* Alternate the diagonal of each quad, checkerboard fashion. Combined
           with the facet relief above — which already makes these quads
           non-planar — this gives every triangle its own normal and lays a
           zigzag across the surface, which is the dense triangulated faceting
           the reference shows. Splitting every quad the same way instead
           produced long uniform bands that read as a smooth cone. */
        if ((i3 + r) % 2 === 0) {
          faces.push([a1, b1, c1]);
          faces.push([a1, c1, d1]);
        } else {
          faces.push([a1, b1, d1]);
          faces.push([b1, c1, d1]);
        }
      }
    }
  }

  /* Caps, only where the end is a real ring rather than a point. */
  var first = rings[0], last = rings[rings.length - 1];
  if (capBottom && first.verts) {
    var cb = push(0, sections[0].y, 0);
    for (var i4 = 0; i4 < sides; i4++) faces.push([cb, first.verts[(i4 + 1) % sides], first.verts[i4]]);
  }
  if (capTop && last.verts) {
    var ct = push(0, sections[sections.length - 1].y, 0);
    for (var i5 = 0; i5 < sides; i5++) faces.push([ct, last.verts[i5], last.verts[(i5 + 1) % sides]]);
  }

  return { geometry: facetedGeometry(positions, faces, null, { lift: opts.lift }), positions: positions, faces: faces };
}

/* A tapered faceted limb segment running from point A to point B.
   Built along +Y then oriented, so the caller works in world positions and
   never has to think about rotations. */
export function segment(a, b, radiusA, radiusB, sides, options) {
  var opts = options || {};
  var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  var len = Math.hypot(dx, dy, dz) || 1e-6;

  /* Limbs get intermediate rings and their own crystal relief.

     Built as a single tapered tube from end to end, an arm is four or six long
     flat strips — which is exactly why the limbs kept reading as bars while the
     torso read as crystal. Subdividing along the length and letting the same
     deterministic relief work on it gives the arms facets of a comparable size
     to the body's, so they belong to the same object. */
  var STEPS = opts.steps || 4;
  var crystal = opts.crystal == null ? 0.075 : opts.crystal;
  var ratio = opts.depthRatio || 0.82;
  var rings = [];
  /* PROFILE — the difference between a bar and a limb.

     A straight interpolation from radiusA to radiusB is a cone, and a cone is
     what made the arms read as bars no matter how they were faceted. A real
     upper arm is thickest a third of the way down (the bicep/tricep belly) and
     narrows into the elbow; a forearm is thickest just below the elbow. So the
     caller can hand in a profile — a multiplier on the interpolated radius as a
     function of t — and get that swell without any extra geometry.

     Kept as a multiplier rather than a radius table so a profile can be reused
     across limbs of different lengths and thicknesses. */
  var profile = opts.profile;
  for (var k = 0; k <= STEPS; k++) {
    var t = k / STEPS;
    var r = radiusA + (radiusB - radiusA) * t;
    if (profile) r *= profile(t);
    /* Relief fades out at both ends so the joints still meet cleanly. */
    var taper = Math.sin(t * Math.PI);
    rings.push({
      y: len * t, w: r, d: r * ratio,
      crystal: crystal * taper,
      crystalY: crystal * 0.35 * taper * len,
      facet: (k % 2 ? -1 : 1) * 0.03 * taper
    });
  }

  var built = loft(rings, sides || 6, { capTop: true, capBottom: true, phase: opts.phase, lift: opts.lift });

  /* Orient +Y onto the A->B axis with a minimal rotation. */
  var ux = dx / len, uy = dy / len, uz = dz / len;
  var p = built.geometry.attributes.position.array;
  var n = built.geometry.attributes.normal.array;

  /* Basis: u is the new Y. Pick any vector not parallel to u for the cross. */
  var hx = Math.abs(uy) < 0.99 ? 0 : 1, hy = Math.abs(uy) < 0.99 ? 1 : 0, hz = 0;
  var rx = hy * uz - hz * uy, ry = hz * ux - hx * uz, rz = hx * uy - hy * ux;
  var rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;   /* X axis */
  /* Z axis = u cross r */
  var zx = uy * rz - uz * ry, zy = uz * rx - ux * rz, zz = ux * ry - uy * rx;

  function xform(arr, translate) {
    for (var i = 0; i < arr.length; i += 3) {
      var x = arr[i], y = arr[i + 1], z = arr[i + 2];
      var nx = rx * x + ux * y + zx * z;
      var ny = ry * x + uy * y + zy * z;
      var nz = rz * x + uz * y + zz * z;
      arr[i] = nx + (translate ? a[0] : 0);
      arr[i + 1] = ny + (translate ? a[1] : 0);
      arr[i + 2] = nz + (translate ? a[2] : 0);
    }
  }
  xform(p, true);
  xform(n, false);
  built.geometry.attributes.position.needsUpdate = true;
  built.geometry.attributes.normal.needsUpdate = true;
  built.geometry.computeBoundingSphere();
  return built.geometry;
}

/* A beveled diamond crystal with a flat, RECESSED front plate.

   This is the head, and the recess is the whole point: the reference's face
   sits inside the crystal, not on it. The solid is
     equator diamond  ->  bevel ring (forward)  ->  face plate (pushed BACK)
   so the bevel ring stands proud of the plate and casts the lip that reads as
   depth. Behind the equator it closes to a single apex.

   Returns groups: material 0 = crystal shell, material 1 = the dark face. */
export function diamondCrystal(opts) {
  var hw = opts.halfWidth, hh = opts.halfHeight, hd = opts.halfDepth;
  var bevel = opts.bevelInset, face = opts.faceInset;
  var bevelZ = opts.bevelZ * hd, faceZ = opts.faceZ * hd, backZ = opts.backApexZ * hd;
  var relief = opts.relief || 0;

  var P = [];
  function push(x, y, z) { P.push(x, y, z); return P.length / 3 - 1; }

  /* An EIGHT-point girdle, not four.

     With four points the head has only four front bevels, and it rendered as a
     flat diamond outline with a large black hole in it — by some distance the
     least resolved part of the character. Eight points double the facet count
     on every ring while keeping the outline exactly where it was: the four
     extra vertices sit ON the diamond's own edges (the line x/hw + y/hh = 1),
     so the silhouette is mathematically unchanged and only the cut gets
     richer. */
  var N = 8;
  var girdle = [];
  for (var g = 0; g < N; g++) {
    var t = g / N * Math.PI * 2;
    /* Parametrise the diamond itself rather than a circle, so every point
       lands exactly on the outline. */
    var ct = Math.cos(t), st = Math.sin(t);
    var k = 1 / (Math.abs(ct) + Math.abs(st));
    girdle.push({ x: ct * k * hw, y: st * k * hh });
  }

  function ring(scale, z, jitterSeed) {
    return girdle.map(function (p, i) {
      /* A little depth scatter on the bevel ring gives the front facets
         genuinely different tilts, which is what makes the head catch light in
         several places instead of reading as one plate. */
      var jz = jitterSeed == null ? 0 : (hash2(i * 3 + jitterSeed, jitterSeed) - 0.5) * 2 * relief * hd;
      return push(p.x * scale, p.y * scale, z + jz);
    });
  }

  /* A CROWN RING, so the head stops reading as a frame.

     With only girdle -> bevel -> plate there is exactly ONE band of facets
     between the silhouette and the face, and one band cannot look like
     thickness: it reads as a flat diamond outline drawn around a dark hole,
     which was the standing "head is still a frame" note. A real cut stone
     climbs from its girdle to its table across several bands, and each one
     takes light at its own angle.

     So there is now an intermediate ring between the two, giving two bands of
     crown facets rather than one, and the plate drops much further back. The
     shell gains visible thickness from the depth between the bands, and the
     recess gains a genuine wall for the face to sit down inside. */
  var crownZ = (opts.crownZ == null ? 0.38 : opts.crownZ) * hd;
  var crownInset = opts.crownInset == null ? 0.84 : opts.crownInset;
  /* THE INNER BEVEL — a band inside the lip, framing the face cavity.

     Without it the solid went lip -> plate in one step, so the face was a flat
     black panel butted straight against the shell: the "helmet around a
     sticker" read. A real recessed setting has a bevel running around the
     inside of the opening, and it is that band, catching light at a different
     angle from both the outer crown and the plate, which tells the eye the face
     is set DOWN INSIDE the crystal rather than painted across a hole in it. */
  var innerZ = (opts.innerZ == null ? 0.30 : opts.innerZ) * hd;
  var innerInset = opts.innerInset == null ? 0.62 : opts.innerInset;

  var E = ring(1, 0, null);                 /* the silhouette — never jittered */
  var C = ring(crownInset, crownZ, 11);     /* crown band */
  var B = ring(bevel, bevelZ, 5);           /* table edge / recess lip */
  var I = ring(innerInset, innerZ, 17);     /* inner bevel, inside the opening */
  var F = ring(face, faceZ, null);          /* the recessed face plate */
  var back = push(0, 0, backZ);

  /* THREE MATERIAL GROUPS, not two.

     The cavity walls used to share the outer shell's material, and that is
     most of why the recess did not read as depth from the front: a wall inside
     a hole was being lit exactly like the crystal surrounding the hole. Real
     depth is mostly OCCLUSION — the lip overhangs the wall, so the wall is
     darker than the surface it sits under, and the eye reads that value step as
     distance before it reads any geometry at all.

     Splitting them lets the cavity take its own darker, barely-reflective
     material, so the step exists whatever angle the head is seen from. */
  /* WINDING. Every one of these rings runs clockwise as seen from the front, so
     a quad listed outer-then-inner comes out with its normal pointing INTO the
     head and is culled by FrontSide. All four bands were listed that way, and
     the consequences were severe and completely silent:

       - the head's crown and bevel — the whole diamond frame — were never drawn
         by their own material at all;
       - the additive back-faced rim shell WAS drawing them, because BackSide is
         exactly the set of faces FrontSide was throwing away, so the head's
         apparent material was a flat 15%-opacity overlay of one colour;
       - and every attempt to fix the resulting flatness measured nothing,
         because none of them was touching a face that reached the screen. The
         facet lift was moved from 0.26 to 0.15 to 0.36 and finally to 1.0, which
         makes every facet silver, with no visible change whatsoever. The relief
         was raised twice in an earlier pass. The global Fresnel boost was cut to
         0.15. Four light cards were added on calculated reflection directions.
         None of it could have worked.

     What settled it was reading the normals out of the live geometry: material 0
     had 40 of 40 triangles pointing backward when only its 8 back facets should,
     and material 2 had 32 of 32. The back facets below are listed in the
     opposite order and were correct already, which is why they are not touched
     here — and the plate fan measured 8 of 8 forward, so it is left alone too.

     Lesson worth keeping: a culled face and a black face look identical on a
     dark stage, and no amount of material tuning distinguishes them. Reading
     the geometry is a two-minute check that no capture can substitute for. */
  var shell = [], cavity = [], plate = [];
  for (var i = 0; i < N; i++) {
    var j = (i + 1) % N;
    shell.push([E[j], C[j], C[i], E[i]]);   /* lower crown band */
    shell.push([C[j], B[j], B[i], C[i]]);   /* upper crown band */
    cavity.push([B[j], I[j], I[i], B[i]]);  /* over the lip, into the cavity */
    cavity.push([I[j], F[j], F[i], I[i]]);  /* the inner bevel wall */
    shell.push([E[j], E[i], back]);         /* back facets — already correct */
  }
  /* Fan the plate from its centre so it is several triangles, not one quad —
     it then picks up a little value variation of its own instead of reading as
     a single flat void. */
  var centre = push(0, 0, faceZ);
  for (var f = 0; f < N; f++) plate.push([centre, F[f], F[(f + 1) % N]]);

  return facetedGeometry(P, null, [
    { faces: shell, material: 0 },
    { faces: plate, material: 1 },
    { faces: cavity, material: 2 }
  ], { lift: opts.lift });
}

/* A flat diamond outline plate, used for the chest emblem and the transport
   symbols. Double-sided is unnecessary — these always face the camera. */
export function diamondPlate(half, depth) {
  var P = [];
  function push(x, y, z) { P.push(x, y, z); return P.length / 3 - 1; }
  var f = [push(half, 0, depth), push(0, half, depth), push(-half, 0, depth), push(0, -half, depth)];
  var b = [push(half, 0, 0), push(0, half, 0), push(-half, 0, 0), push(0, -half, 0)];
  var faces = [[f[0], f[1], f[2], f[3]]];
  for (var i = 0; i < 4; i++) {
    var j = (i + 1) % 4;
    faces.push([b[i], f[i], f[j], b[j]]);
  }
  return facetedGeometry(P, faces);
}
