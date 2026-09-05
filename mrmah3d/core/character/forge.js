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
/* R91 — SEVEN CLASSES, and the middle of the table is where they went.

   Five classes weighted 50% black gives a body that is black plus a scatter of
   catches, and in a still frame that is defensible — it is close to what the
   references show. In MOTION it is not, and that is the difference this pass
   exists to close: a facet rotating out of a catch has nowhere to land except
   black, so the body does not turn in light, it BLINKS. Every plane is either
   an event or nothing, and the transitions between them carry no information.

   Motion needs somewhere to travel THROUGH, which means a populated middle. So
   the black share comes down from 50% to 34% and the space it vacates goes into
   two new intermediate tiers — a dark navy and a brighter steel-blue — rather
   than into more catches. The bright end actually gets RARER (cyan 0.07 -> 0.05,
   silver 0.07 -> 0.04), because the brief asks for shine to be deliberate: a
   catch reads as a catch in proportion to how much suppressed surface surrounds
   it, and thinning the top while filling the middle sharpens the hierarchy at
   both ends at once.

   The order matters — the table accumulates from black upward and `lift` and
   the area bias both index into it — so the tiers run monotonically from
   swallowed to mirror. */
/* R92 — REWEIGHTED AND LIGHTENED, to the brief's stated perceptual target.

   Measured over the character's own mask, this table's predecessor produced
   54.4% near-black and 8.3% dark sapphire against a brief asking for 10-15%
   and 45-55%. Two things were wrong and they compounded:

   WEIGHT. 34% of faces were the black class and another 22% charcoal, so more
   than half the body was drawn from the two darkest entries before absorption
   was even applied. Black comes down to 0.14 — it is a punctuation class now,
   the lost planes the brief describes, not the body's default.

   DARKNESS. The `dark` column is a multiplier on how much the shader swallows,
   and at 1.00 and 0.74 the top two classes were being crushed to near nothing
   whatever lit them. Every entry moves up: the darkest facet on him now keeps
   about half its light rather than a third, which is the difference between a
   lost plane that is still sapphire and a hole cut in the frame.

   The bright end is untouched in weight (cyan 0.05, silver 0.04) because the
   measurement said it was already on target at 1.7-2.8% — the body was not
   short of catches, it was short of a body. */
var FACET_CLASSES = [
  /* w,    rough,  metal,  dark,  tint */
  [0.20,   0.14,  -0.20,   0.78,  0.00],   /* black    — lost planes, punctuation */
  [0.16,   0.08,  -0.12,   0.50,  0.06],   /* navy     — the deep body */
  [0.36,   0.05,  -0.02,   0.28,  0.18],   /* sapphire — the DEFAULT, and the point */
  [0.17,   0.02,   0.06,   0.12,  0.34],   /* lit sapphire */
  [0.04,  -0.02,   0.14,  -0.02,  0.62],   /* steel    */
  [0.04,  -0.04,   0.18,  -0.14,  1.00],   /* cyan     */
  [0.03,  -0.06,   0.34,  -0.82,  0.20]    /* silver   — rare, and hot for it */
];
/* The weights above were tuned against a measurement of the character's own
   mask, and the first cut of them overshot in both directions: near-black fell
   to 1.1% against a brief asking for 10-15%, which loses the lost planes the
   value hierarchy needs, while the bright end stayed at 8%. Black comes back up
   to 0.20 and the top three classes come down, because the brief is explicit
   that white should be rare and powerful — a catch is only a catch against
   surface that has chosen not to be one. */

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

/* R94 — `classes` is a per-REGION table (see regions.js). The default is the
   body's. A region's lift slides within its own table, so the seam ramps in
   `segment()` still work when the two sides of a seam use different tables. */
function facetClass(i, area, lift, classes, jitterIndex, classIndex) {
  var TABLE = classes || FACET_CLASSES;
  var n = Math.sin(i * 78.233 + 12.9898) * 43758.5453;
  var r = n - Math.floor(n);
  /* R95 — a zone may name its class OUTRIGHT. A zone drawn by lottery is a
     black pectoral one time in five, and a pectoral that is black on one mount
     and sapphire on the next is not art direction. `classIndex` picks the row;
     the area damping and the per-face jitter still apply, so the plane keeps
     its facet variation. */
  if (classIndex != null) {
    var ci = Math.max(0, Math.min(TABLE.length - 1, Math.round(classIndex)));
    var cc = TABLE[ci];
    var bigC = area == null ? 0.7 : Math.min(1, Math.sqrt(area / AREA_HERO));
    var jiC = jitterIndex == null ? i : jitterIndex;
    var mC = Math.sin(jiC * 39.719 + 4.1414) * 24634.6345;
    var jC = (mC - Math.floor(mC)) * 2 - 1;
    var dampC = 0.35 + 0.65 * bigC;
    return [
      cc[0],
      cc[1] * dampC + jC * 0.05,
      cc[2] * dampC + jC * 0.10,
      Math.max(-0.9, Math.min(1, cc[3] * dampC + jC * 0.20 * dampC)),
      Math.max(0, Math.min(1, cc[4] * dampC + jC * 0.10))
    ];
  }
  /* The CLASS may be drawn from a shared seed (a zone or a column) while the
     jitter stays per face: a zone then reads as one plane whose triangles vary
     slightly, rather than as a flat tile. Sharing the jitter too made every
     zoned pectoral a uniform rectangle — a panel, not a plane. */
  var ji = jitterIndex == null ? i : jitterIndex;
  var m = Math.sin(ji * 39.719 + 4.1414) * 24634.6345;
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
  for (var k = 0; k < TABLE.length; k++) {
    acc += TABLE[k][0];
    if (r <= acc) {
      var c = TABLE[k];
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
  return TABLE[0];
}

/* R92 — THE MICRO-BEVEL, and it costs no triangles at all.

   The brief wants what rounding the corner of a UI container does: the shape
   stays geometric, the edge stops being a razor. Done as geometry that is a
   chamfer — inset every face and add a connecting strip — which triples the
   triangle count on a mesh whose whole discipline is not doing that.

   But a chamfer is only visible as an OPTICAL event: a narrow band along each
   edge whose normal leans toward its neighbour, so a highlight rolls off across
   it instead of stopping dead at the crease. That band can be shaded rather
   than built.

   So each vertex carries two extra attributes:

     aSmooth  the area-averaged normal of every face meeting at this POSITION,
              i.e. the normal the surface would have if it were smooth
     aBary    which corner of its triangle this vertex is

   and the shader blends from the flat face normal at the middle of a face
   toward aSmooth in a thin margin at its edges. The silhouette does not move —
   no vertex is displaced — and the geometry is untouched. What changes is
   exactly what a 1-2% chamfer would change: the rolloff.

   `flatShading` has to come OFF for this, and that is safe: every vertex of a
   face already carries that face's own normal, so an interpolated normal across
   three identical normals is the same constant the derivative gave. The faceted
   look is preserved by the DATA rather than by the renderer's flag, which is
   what makes it blendable. */
export function facetedGeometry(positions, faces, groups, options) {
  var opts = options || {};
  var pos = [], nor = [], fac = [], smo = [], bar = [];
  /* R94 — `aInner` marks the solid that carries the internal light (the torso).
     The shader's light is gated in each mesh's OWN space, and an arm's local
     origin is its shoulder joint, so without this flag the upper arms sat
     squarely inside the gate meant for the taper and both limbs came back
     electric blue. A per-geometry flag is the honest fix: the material stays
     shared, and only the mesh that asked for the light gets it. */
  var innerFlag = opts.inner ? 1 : 0;
  /* R98 — `aCoat` is the PLATINUM MASK. The brief's material is a dark
     sapphire crystal wearing a thin platinum-silver coat on its HERO planes
     only — shoulder caps, upper pecs, bicep and forearm ridges, the quad's
     outer sweep, a few head planes — and none in the recesses. That is a
     region-aware weight, so it travels with the geometry exactly as the class
     does: one value per polygon (`faceCoat`), falling back to one per solid
     (`coat`), read by the crystal shader as the blend toward the coat's
     albedo, metalness and roughness. 0 everywhere unless a region asks. */
  var coatAll = opts.coat == null ? 0 : opts.coat;
  var coa = [];
  /* R102 — `aCavity`, per POSITION from the loft (see loft's ring loop):
     how far a vertex sits inside its ring's nominal surface. 0 where the
     caller has none (the head, the caps). */
  var cavArr = opts.vertexCavity || null;
  var cav = [];
  function cavityAt(i) { return cavArr && cavArr[i] != null ? cavArr[i] : 0; }
  var groupRanges = [];
  var written = 0;
  var faceIndex = 0;

  /* Accumulate face normals per unique POSITION so shared corners average.
     Positions are keyed on a rounded string: vertices are expanded per face, so
     the only way to know two of them are the same corner is to compare where
     they are. 1e-4 is far below any feature on this character and far above
     float noise from the loft's own arithmetic. */
  var normAcc = Object.create(null);
  function key(x, y, z) {
    return (Math.round(x * 1e4) / 1e4) + ',' + (Math.round(y * 1e4) / 1e4) + ',' +
           (Math.round(z * 1e4) / 1e4);
  }
  function accumulate(a, b, c) {
    var ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    var bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
    var cx = positions[c * 3], cy = positions[c * 3 + 1], cz = positions[c * 3 + 2];
    var ux = bx - ax, uy = by - ay, uz = bz - az;
    var vx = cx - ax, vy = cy - ay, vz = cz - az;
    /* NOT normalised: the cross product's length is twice the triangle's area,
       so leaving it raw weights each face's vote by its size — which is what
       makes a hero plane dominate the corner it shares with a sliver. */
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    [[a, ax, ay, az], [b, bx, by, bz], [c, cx, cy, cz]].forEach(function (v) {
      var kk = key(v[1], v[2], v[3]);
      var e = normAcc[kk];
      if (!e) { e = normAcc[kk] = [0, 0, 0]; }
      e[0] += nx; e[1] += ny; e[2] += nz;
    });
  }
  (groups || [{ faces: faces, material: 0 }]).forEach(function (g) {
    g.faces.forEach(function (f) {
      if (f.length === 3) accumulate(f[0], f[1], f[2]);
      else { accumulate(f[0], f[1], f[2]); accumulate(f[0], f[2], f[3]); }
    });
  });
  function smoothAt(x, y, z) {
    var e = normAcc[key(x, y, z)];
    if (!e) return null;
    var l = Math.hypot(e[0], e[1], e[2]);
    return l < 1e-9 ? null : [e[0] / l, e[1] / l, e[2] / l];
  }

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
    /* R107 facet groups: remember this triangle's area-weighted normal and its
       group, so the group's average can replace the per-triangle normal below. */
    triGroup.push(curGroup); triArea.push(nx * len, ny * len, nz * len);
    var sa = smoothAt(ax, ay, az) || [nx, ny, nz];
    var sb = smoothAt(bx, by, bz) || [nx, ny, nz];
    var sc = smoothAt(cx, cy, cz) || [nx, ny, nz];
    smo.push(sa[0], sa[1], sa[2], sb[0], sb[1], sb[2], sc[0], sc[1], sc[2]);
    /* The fourth component is the triangle's INRADIUS, and it is what makes the
       chamfer a constant width instead of a constant fraction.

       A first version used the barycentric margin directly, so the bevel was a
       percentage of each face — which meant the torso's large planes got a thin
       lip and the arms' small facets got a band across most of their area. The
       arms came back as bright chrome lattice: every edge blended into every
       other, which is precisely the "white scratches" the brief rules out.

       inradius = 2 * area / perimeter is the radius of the largest circle that
       fits in the triangle, i.e. its characteristic size. Dividing the target
       world width by it in the shader converts an absolute chamfer into the
       barycentric fraction that face needs, so a 0.9 mm bevel is 0.9 mm on a
       hero plane and on a sliver alike. */
    var la = Math.hypot(bx - ax, by - ay, bz - az);
    var lb = Math.hypot(cx - bx, cy - by, cz - bz);
    var lc = Math.hypot(ax - cx, ay - cy, az - cz);
    var per = la + lb + lc;
    var inr = per > 1e-9 ? (len * 0.5) * 2 / per : 1e-4;   /* len/2 is the area */
    bar.push(1, 0, 0, inr, 0, 1, 0, inr, 0, 0, 1, inr);
    /* All three vertices of a face share its optical class, so the value is
       constant across the triangle and the facet reads as one material. */
    /* Triangle area, from the cross product already computed above: |u x v|/2
       is exactly `len / 2`, so the hierarchy costs nothing extra. */
    /* R94 — a polygon may carry its own hash SEED and its own class table.
       The seed is what lets a whole column of the taper share one class: the
       lottery is a function of the index it is handed, so handing every quad in
       a column the same index makes them one long plane rather than a stack of
       unrelated triangles. */
    var seed = faceSeed != null ? faceSeed : faceIndex;
    var k = facetClass(seed, len * 0.5, faceLift, faceClasses, faceIndex, faceClassIndex);
    faceIndex++;
    for (var v = 0; v < 3; v++) fac.push(k[1], k[2], k[3], k[4]);
    coa.push(faceCoat, faceCoat, faceCoat);
    cav.push(cavityAt(a), cavityAt(b), cavityAt(c));
    written += 3;
  }

  /* PER-POLYGON LIFT — the mechanism behind authored hero regions.

     `opts.lift` biases a whole part away from the black end of the class table.
     That is the right granularity for "arms lighter than the torso" and the
     wrong one for "the clavicle and the outer ribcage carry the catches while
     the abdomen stays dark", which is how the reference actually distributes
     light on a body: not evenly, and not by area either.

     `opts.faceLift` is an array indexed by POLYGON — the entry in `faces`, not
     the triangle — so a quad and both of its triangles share one value and a
     lofted band can hand its own lift to every quad in it. Falls back to
     `opts.lift` wherever it is absent, so nothing that does not use it changes. */
  var triGroup = [], triArea = [], curGroup = null;
  var faceLift = opts.lift;
  var faceClasses = opts.classes || null;
  var faceSeed = null;
  var faceClassIndex = null;
  var faceCoat = coatAll;
  var polyIndex = 0;
  (groups || [{ faces: faces, material: 0 }]).forEach(function (g) {
    var start = written;
    g.faces.forEach(function (f) {
      if (opts.faceLift && opts.faceLift[polyIndex] != null) faceLift = opts.faceLift[polyIndex];
      else faceLift = opts.lift;
      faceCoat = opts.faceCoat && opts.faceCoat[polyIndex] != null ? opts.faceCoat[polyIndex] : coatAll;
      faceClasses = (opts.faceClasses && opts.faceClasses[polyIndex]) || opts.classes || null;
      faceSeed = opts.faceSeed && opts.faceSeed[polyIndex] != null ? opts.faceSeed[polyIndex] : null;
      faceClassIndex = opts.faceClassIndex && opts.faceClassIndex[polyIndex] != null ? opts.faceClassIndex[polyIndex] : null;
      curGroup = opts.faceGroup && opts.faceGroup[polyIndex] != null ? opts.faceGroup[polyIndex] : null;
      polyIndex++;
      if (f.length === 3) emitTri(f[0], f[1], f[2]);
      else { emitTri(f[0], f[1], f[2]); emitTri(f[0], f[2], f[3]); }
    });
    groupRanges.push({ start: start, count: written - start, material: g.material || 0 });
  });

  /* R107 — one shading normal per FACET GROUP (see loft). */
  if (triGroup.some(function (g) { return g != null; })) {
    var gsum = {};
    triGroup.forEach(function (g, t) {
      if (g == null) return;
      var e = gsum[g] || (gsum[g] = [0, 0, 0]);
      e[0] += triArea[t * 3]; e[1] += triArea[t * 3 + 1]; e[2] += triArea[t * 3 + 2];
    });
    triGroup.forEach(function (g, t) {
      if (g == null) return;
      var e = gsum[g], l = Math.hypot(e[0], e[1], e[2]);
      if (l < 1e-9) return;
      for (var v = 0; v < 3; v++) { nor[t * 9 + v * 3] = e[0] / l; nor[t * 9 + v * 3 + 1] = e[1] / l; nor[t * 9 + v * 3 + 2] = e[2] / l; }
    });
  }
  var geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  geo.setAttribute('aFacet', new Float32BufferAttribute(fac, 4));
  geo.setAttribute('aSmooth', new Float32BufferAttribute(smo, 3));
  geo.setAttribute('aBary', new Float32BufferAttribute(bar, 4));
  var inn = new Float32Array(pos.length / 3);
  if (innerFlag) inn.fill(1);
  geo.setAttribute('aInner', new Float32BufferAttribute(inn, 1));
  geo.setAttribute('aCoat', new Float32BufferAttribute(coa, 1));
  geo.setAttribute('aCavity', new Float32BufferAttribute(cav, 1));
  if (groupRanges.length > 1) {
    groupRanges.forEach(function (g) { geo.addGroup(g.start, g.count, g.material); });
  }
  geo.computeBoundingSphere();
  return geo;
}

/* R95 — merge several forge geometries into one, so a hand's palm, fingers and
   thumb are one mesh and one edge set instead of ten of each. Every forge
   geometry is non-indexed and carries the same attributes, so this is a
   concatenation; groups are dropped (the parts share one material). The
   inputs are disposed. */
export function mergeGeometries(list) {
  var names = Object.keys(list[0].attributes);
  var geo = new BufferGeometry();
  names.forEach(function (name) {
    var size = list[0].attributes[name].itemSize;
    var total = 0;
    list.forEach(function (g) { total += g.attributes[name].count; });
    var out = new Float32Array(total * size);
    var offset = 0;
    list.forEach(function (g) {
      var a = g.attributes[name].array;
      out.set(a, offset);
      offset += a.length;
    });
    geo.setAttribute(name, new Float32BufferAttribute(out, size));
  });
  list.forEach(function (g) { g.dispose(); });
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
/* R107 — THE MACRO FORM IS A SPLINE, NOT A POLYLINE.

   A loft is piecewise-linear between its authored rings, so however the ring
   table is tuned the silhouette is a chain of straight segments and corners —
   the "step, corner, straight segment" the R107 brief rules out. `refine`
   inserts `n` rings between every authored pair, with y / w / d / zc on a
   Catmull-Rom curve through the authored rings and the anatomical shape
   blended between the two neighbours, so the profile is one continuous curve
   and the shape functions' lobes flow from ring to ring instead of stepping.

   Everything that names a PLANE (zoneAt, classesAt, columns, hero, coat) is
   inherited from the authored ring ABOVE, which is exactly what bandSpec
   already reads for a band, so the zone architecture is unchanged; `cav` is
   interpolated so a crease ring's cavity peaks at the crease. The crystal
   jitter is scaled down on the inserted rings: with rings twice as dense the
   same displacement is twice as rough, and the micro facets are meant to be
   SMALLER than the macro curve, not to fight it. */
function refineSections(sections, n) {
  if (!n || sections.length < 3) return sections;
  var out = [];
  function P(i) { return sections[Math.max(0, Math.min(sections.length - 1, i))]; }
  function cr(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  function num(s, k) { return s[k] == null ? 0 : s[k]; }
  for (var i = 0; i < sections.length - 1; i++) {
    var A = sections[i], B = sections[i + 1], Pm = P(i - 1), Pn = P(i + 2);
    out.push(A);
    /* A ring on the axis (a point) is a tip: the band into it stays as authored. */
    if (A.w <= 1e-6 || B.w <= 1e-6) continue;
    for (var k = 1; k <= n; k++) {
      var t = k / (n + 1);
      var sm = t * t * (3 - 2 * t);
      out.push({
        y: cr(Pm.y, A.y, B.y, Pn.y, t),
        w: Math.max(1e-4, cr(Pm.w, A.w, B.w, Pn.w, t)),
        d: Math.max(1e-4, cr(Pm.d, A.d, B.d, Pn.d, t)),
        zc: cr(num(Pm, 'zc'), num(A, 'zc'), num(B, 'zc'), num(Pn, 'zc'), t),
        dip: num(A, 'dip') + (num(B, 'dip') - num(A, 'dip')) * t,
        cav: num(A, 'cav') + (num(B, 'cav') - num(A, 'cav')) * t,
        facet: (num(A, 'facet') + num(B, 'facet')) * 0.5 * (k % 2 ? -1 : 1) * 0.6,
        crystal: (num(A, 'crystal') + num(B, 'crystal')) * 0.5 * 0.55,
        crystalY: (num(A, 'crystalY') + num(B, 'crystalY')) * 0.5 * 0.55,
        shape: (A.shape || B.shape) ? (function (fa, fb, w) {
          return function (a) { return (fa ? fa(a) : 1) * (1 - w) + (fb ? fb(a) : 1) * w; };
        }(A.shape, B.shape, sm)) : undefined,
        hero: B.hero, coat: B.coat, classesAt: B.classesAt, zoneAt: B.zoneAt, columns: B.columns, fg: B.fg,
        refined: true
      });
    }
  }
  out.push(sections[sections.length - 1]);
  return out;
}

export function loft(sections, sides, options) {
  var opts = options || {};
  if (opts.refine) sections = refineSections(sections, opts.refine);
  /* R107: one scale on the whole solid's crystal jitter. The smooth-normal
     clay showed the authored jitter (0.02-0.036 on a 0.3 radius) as lumps on
     the macro form; the micro facets are meant to sit UNDER the curve. */
  var jitterScale = opts.jitter == null ? 1 : opts.jitter;
  var phase = opts.phase == null ? Math.PI / 2 : opts.phase;
  var capTop = opts.capTop !== false;
  var capBottom = opts.capBottom !== false;

  var positions = [];
  var index = [];
  var rings = [];
  var vertexCavity = [];   /* R102 — per position, see the ring loop */

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
      var jitter = (hash2(i * 3 + 1, ri * 7 + 2) - 0.5) * 2 * (s.crystal || 0) * jitterScale * guard;

      /* A little vertical scatter too. Perfectly level rings read as stacked
         bands; breaking them is most of what removes the rigid, CAD look. */
      var yJit = (hash2(i * 5 + 11, ri * 13 + 3) - 0.5) * (s.crystalY || 0) * jitterScale * guard;

      /* A shoulder shelf: front and back vertices sit lower than the sides,
         which is the collar chevron the reference shows across the chest. */
      var drop = (s.dip || 0) * Math.abs(Math.sin(a));

      /* ANATOMICAL SHAPING — a per-vertex radius multiplier.

         Everything above varies a ring's radius the same way all the way round
         it, so a loft can only ever produce a body of revolution. That is the
         hard ceiling the torso kept hitting: a chest and an abdomen are not the
         same cross-section, and no amount of faceting or lighting can imply a
         pectoral on a circle. `shape` is a function of the angle around the
         ring, supplied by the ring table, and it is what lets the same loft
         carry a sternum valley, two pec masses and a flatter back.

         Applied as a multiplier on top of the relief so anatomy and crystal
         jitter compose rather than overwrite one another. */
      var mul = s.shape ? s.shape(a) : 1;
      var r = (relief + jitter) * mul;
      /* R94 — `zc` shifts a ring's centre front-to-back. The neck sits BEHIND
         the chin, not under its point, and a loft whose rings all share one
         axis cannot say that. */
      var vi = push(Math.cos(a) * s.w * r, s.y - drop + yJit, Math.sin(a) * s.d * r + (s.zc || 0));
      /* R102 — CAVITY. How far this vertex sits INSIDE the ring's nominal
         surface, from the anatomical multiplier alone: a sternum valley at
         0.76 is a full cavity, an oblique groove at 0.95 a quarter of one, a
         pec crown none. Carried per vertex (`aCavity`) so it interpolates
         across each face into a gradient toward the valley, and read by the
         crystal shader as less albedo, less reflection, less coat and less
         rim — the muscle valley stays dark while the raised form catches the
         silver, which is what makes carving read as depth rather than as
         lines. Geometry-derived, so it cannot disagree with the relief. */
      /* `cav` on a ring adds a cavity the ring table declares outright — a
         CREASE ring (under the pec, between abdominal blocks, the belt, the
         knee, under the glute) is a valley between the rings either side of
         it, which the multiplier alone cannot know. */
      vertexCavity[vi] = Math.max(0, Math.min(1, (1 - mul) / 0.22 + (s.cav || 0)));
      verts.push(vi);
    }
    rings.push({ point: null, verts: verts });
  });

  var faces = [];
  /* One lift per quad, taken from the band's upper ring, so the ring table can
     say "this is a hero band" the same way it says how wide it is. */
  /* R94 — and one class TABLE and one hash SEED per quad, from the same ring.
     A ring with `classesAt(angle)` hands each quad around it its own table (the
     taper's spear columns dark, its flank columns sapphire); a ring with
     `columns: true` seeds every quad in a column identically, so the column
     draws one class from top to bottom and reads as a single long facet. */
  var faceLift = [], faceClasses = [], faceSeed = [], faceClassIndex = [], faceCoat = [], faceGroup = [];
  function pushFace(f, heroLift, classes, seed, index, coat, group) {
    faces.push(f); faceLift.push(heroLift); faceClasses.push(classes || null); faceSeed.push(seed);
    faceClassIndex.push(index == null ? null : index);
    faceCoat.push(coat == null ? null : coat);
    faceGroup.push(group == null ? null : group);
  }
  /* R107 — FACET GROUPS. The macro form is a smooth spline now, so its
     triangles are small and uniform and read as low-poly rather than as cut
     crystal. A ring may declare `fg: [columns, bands]`: every polygon in a
     block of that many columns by that many bands shares ONE shading normal
     (the block's area-weighted average — see facetedGeometry), so the body
     shows large planar facets over a curved sculpt, each facet's normal
     following the curvature under it. Big on the big masses, small near the
     valleys, none where a ring says nothing. The geometry does not move. */
  function groupKey(spec, i, r) {
    if (!spec.fg) return null;
    return Math.floor(i / spec.fg[0]) + ':' + Math.floor(r / spec.fg[1]);
  }
  function bandSpec(r) {
    var s = sections[r + 1], lo = sections[r];
    /* The UPPER ring's setting wins when it is stated at all — an explicit
       `classesAt: null` on the ring above a region is how a region ENDS. */
    return {
      lift: s.hero == null ? lo.hero : s.hero,
      /* R98 — the band's platinum weight, from the ring table; a zone may
         override it per plane (see quadCoat). */
      coat: s.coat == null ? lo.coat : s.coat,
      classesAt: (s.classesAt !== undefined ? s.classesAt : lo.classesAt) || null,
      /* R94 — `zoneAt(angle)` returns { classes, seed } and is how a band is
         carved into ANATOMICAL PLANES: every quad whose angle falls in one zone
         draws the same class with the same hash seed, so a pectoral made of
         six triangles shades as one plane with slight facet variation rather
         than as six unrelated tiles. The zone function is the ring's own, so
         the upper pec band and the lower pec band can be two planes. */
      zoneAt: (s.zoneAt !== undefined ? s.zoneAt : lo.zoneAt) || null,
      columns: !!(s.columns !== undefined ? s.columns : lo.columns),
      fg: s.fg !== undefined ? s.fg : lo.fg
    };
  }
  function midAngle(i) { return phase + ((i + 0.5) / sides) * Math.PI * 2; }
  /* R95 — the zone function also receives the band's mid HEIGHT, so a zone
     boundary can run diagonally across the bands (a pectoral's lower edge, an
     oblique) instead of only vertically, and may return `index` to name its
     class outright (see facetClass). */
  function quadZone(spec, i, r) {
    if (!spec.zoneAt) return null;
    var ymid = (sections[r].y + sections[r + 1].y) / 2;
    return spec.zoneAt(midAngle(i), ymid) || null;
  }
  function quadClasses(spec, i, z) {
    if (z && z.classes) return z.classes;
    if (!spec.classesAt) return null;
    return spec.classesAt(midAngle(i));
  }
  function quadSeed(spec, i, r, z) {
    if (z && z.seed != null) return 200000 + z.seed;
    /* Column seeds are offset well past any face index this mesh can reach so
       a column never collides with an ordinary face's lottery. */
    return spec.columns ? 100000 + i * 7 + (r % 2) * 3 : null;
  }
  function quadIndex(z) { return z && z.index != null ? z.index : null; }
  function quadCoat(spec, z) {
    if (z && z.coat != null) return spec.coat == null ? z.coat : spec.coat * z.coat;
    return spec.coat == null ? null : spec.coat;
  }
  for (var r = 0; r < rings.length - 1; r++) {
    var lo = rings[r], hi = rings[r + 1];
    var spec = bandSpec(r);
    var bandLift = spec.lift;
    if (lo.point != null && hi.verts) {
      for (var i = 0; i < sides; i++) {
        var z0 = quadZone(spec, i, r);
        pushFace([lo.point, hi.verts[i], hi.verts[(i + 1) % sides]], bandLift, quadClasses(spec, i, z0), quadSeed(spec, i, r, z0), quadIndex(z0), quadCoat(spec, z0));
      }
    } else if (lo.verts && hi.point != null) {
      for (var i2 = 0; i2 < sides; i2++) {
        var z1 = quadZone(spec, i2, r);
        pushFace([lo.verts[i2], hi.point, lo.verts[(i2 + 1) % sides]], bandLift, quadClasses(spec, i2, z1), quadSeed(spec, i2, r, z1), quadIndex(z1), quadCoat(spec, z1));
      }
    } else if (lo.verts && hi.verts) {
      for (var i3 = 0; i3 < sides; i3++) {
        var a1 = lo.verts[i3], b1 = lo.verts[(i3 + 1) % sides];
        var c1 = hi.verts[(i3 + 1) % sides], d1 = hi.verts[i3];
        var z2 = quadZone(spec, i3, r);
        var qc = quadClasses(spec, i3, z2), qs = quadSeed(spec, i3, r, z2), qi = quadIndex(z2), qk = quadCoat(spec, z2), qg = groupKey(spec, i3, r);
        /* Alternate the diagonal of each quad, checkerboard fashion. Combined
           with the facet relief above — which already makes these quads
           non-planar — this gives every triangle its own normal and lays a
           zigzag across the surface, which is the dense triangulated faceting
           the reference shows. Splitting every quad the same way instead
           produced long uniform bands that read as a smooth cone. */
        /* R94: a column band keeps ONE diagonal direction down its length, so
           the seam between its two triangles runs as a continuous line to the
           tip instead of zigzagging — the long converging facets the reference
           taper shows. */
        /* R94 — WOUND OUTWARD. THE BODY HAD BEEN RENDERING INSIDE-OUT.

           Work it through for a quad on the +x side of a ring: a1 = lo[i] at
           (w, y0, 0), b1 = lo[i+1] at (w, y0, +d*delta), c1 = hi[i+1]. The
           rings run from +x toward +z, which is CLOCKWISE seen from above, so
           [a1, b1, c1] has (b1-a1) x (c1-a1) = (-d*delta*(y1-y0), 0, 0): a normal
           pointing -x on a face at +x. Every band quad of every loft, and both
           caps, were wound INWARD; only the point fans at a tip were outward.

           FrontSide therefore culled the entire outer surface of the torso,
           the deltoids and the arms, and what has been rendering all along is
           the INTERIOR OF THE FAR WALL — whose stored normals (computed from
           the same winding) point toward the camera, so it shaded plausibly
           and the silhouette was identical. That is why the emblem read as a
           sticker (it floated 0.45 units in front of the surface actually
           being drawn), why no pectoral shape or authored front plane ever
           read (they were on the culled side), why the chest lamp lit
           nothing, and why edge lines floated as a cage in front of the body.

           Found by raycasting the frame: the first FrontSide hit on the chest
           was at z = -0.13 behind the axis with a forward normal. A winding
           probe then read 96-100% inward on every loft. A one-off capture
           with the body material on BackSide rendered a solid character with
           domed shoulders, a clavicle shelf and real pec planes. Lesson, again:
           a culled face and a black face look identical — read the geometry. */
        var alt = spec.columns ? (i3 % 2 === 0) : ((i3 + r) % 2 === 0);
        if (alt) {
          pushFace([a1, c1, b1], bandLift, qc, qs, qi, qk, qg);
          pushFace([a1, d1, c1], bandLift, qc, qs, qi, qk, qg);
        } else {
          pushFace([a1, d1, b1], bandLift, qc, qs, qi, qk, qg);
          pushFace([b1, d1, c1], bandLift, qc, qs, qi, qk, qg);
        }
      }
    }
  }

  /* Caps, only where the end is a real ring rather than a point. */
  var first = rings[0], last = rings[rings.length - 1];
  /* Caps wound outward too (see the note above): bottom cap faces down, top
     cap faces up. */
  if (capBottom && first.verts) {
    var cb = push(0, sections[0].y, 0);
    for (var i4 = 0; i4 < sides; i4++) pushFace([cb, first.verts[i4], first.verts[(i4 + 1) % sides]], sections[0].hero);
  }
  if (capTop && last.verts) {
    var ct = push(0, sections[sections.length - 1].y, 0);
    for (var i5 = 0; i5 < sides; i5++) pushFace([ct, last.verts[(i5 + 1) % sides], last.verts[i5]], sections[sections.length - 1].hero);
  }

  return { geometry: facetedGeometry(positions, faces, null,
      { lift: opts.lift, faceLift: faceLift, classes: opts.classes, faceClasses: faceClasses, faceSeed: faceSeed,
        faceClassIndex: faceClassIndex, inner: opts.inner, coat: opts.coat, faceCoat: faceCoat,
        vertexCavity: vertexCavity, faceGroup: faceGroup }),
    positions: positions, faces: faces };
}

/* R99 — which WORLD direction a limb's ring angle d = +pi/2 points in.

   `segment` hands its shape and zone functions an angle relative to the
   limb's FRONT, which makes "the bicep is at d = 0" pose-independent — but it
   leaves "which side is the INNER arm" unknowable from d alone: worked
   through, +pi/2 is world +x on a limb whose axis points down and world -x on
   one whose axis points up, so the same rule puts the shadow valley on the
   outside of one arm and the inside of the other. This reproduces the basis
   and front-angle derivation exactly and returns the +pi/2 direction, so a
   caller can decide the sign per limb instead of guessing it. */
export function limbSideDirection(a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  var len = Math.hypot(dx, dy, dz) || 1e-6;
  var ux = dx / len, uy = dy / len, uz = dz / len;
  var hx = Math.abs(uy) < 0.99 ? 0 : 1, hy = Math.abs(uy) < 0.99 ? 1 : 0, hz = 0;
  var rx = hy * uz - hz * uy, ry = hz * ux - hx * uz, rz = hx * uy - hy * ux;
  var rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
  var zx = ry * uz - rz * uy, zy = rz * ux - rx * uz, zz = rx * uy - ry * ux;
  var fdot = uz;
  var px = -fdot * ux, py = -fdot * uy, pz = 1 - fdot * uz;
  var pl = Math.hypot(px, py, pz);
  var frontAngle = pl < 1e-6 ? 0
    : Math.atan2((px * zx + py * zy + pz * zz) / pl, (px * rx + py * ry + pz * rz) / pl);
  var an = frontAngle + Math.PI / 2;
  var c = Math.cos(an), s = Math.sin(an);
  return [c * rx + s * zx, c * ry + s * zy, c * rz + s * zz];
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

  /* The orientation basis is computed HERE, before the rings are built, because
     the shaping below needs to know which way is FORWARD in the tube's own
     frame. u is the new Y; r and z are an arbitrary pair perpendicular to it. */
  var ux = dx / len, uy = dy / len, uz = dz / len;
  var hx = Math.abs(uy) < 0.99 ? 0 : 1, hy = Math.abs(uy) < 0.99 ? 1 : 0, hz = 0;
  var rx = hy * uz - hz * uy, ry = hz * ux - hx * uz, rz = hx * uy - hy * ux;
  var rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;   /* X axis */
  /* Z axis = r cross u, NOT u cross r — the basis has to be RIGHT-handed.

     It was u x r, which makes [r u z] a left-handed frame: worked through for
     u = (1,0,0) the determinant is -1. A left-handed basis MIRRORS whatever it
     transforms, so every limb built by `segment` has been reflected, and — the
     part that matters — its triangle winding no longer agrees with its stored
     normals. Every arm, hand, digit and deltoid has been carrying inverted
     normals in its `normal` attribute.

     It went unseen for many passes because `flatShading` was on, and flat
     shading ignores the attribute entirely: three derives the normal from
     screen-space derivatives of the view position, which is always consistent
     with what is actually facing the camera. The moment flatShading came off so
     the micro-bevel could blend the normal, the real data was used and both
     arms rendered white — an inverted normal gives N.V = 0, which is maximum
     grazing Fresnel, which is maximum brightness.

     Found by elimination: the bevel was set to zero and the arms stayed white,
     the facet lift was cut from 0.50 to 0.18 and they stayed white, the rim
     shells were hidden and they stayed white, and flatShading was put back and
     they went correctly dark. Only then was the basis worth checking. */
  var zx = ry * uz - rz * uy, zy = rz * ux - rx * uz, zz = rx * uy - ry * ux;

  /* WHICH RING ANGLE FACES THE VIEWER.

     A limb's shape function wants to say "put the bicep on the FRONT", but the
     basis above is arbitrary — it is whatever fell out of crossing the axis with
     a fixed helper vector, so the ring angle that happens to point forward is
     different for every limb and changes the moment a joint moves. Shaping in
     raw ring angles would therefore put the bicep somewhere different on each
     arm, which is exactly the kind of silent, pose-dependent error this file has
     produced before.

     So the front direction is derived: project world +Z onto the plane
     perpendicular to the axis, then read off the ring angle that points along
     it. The shape function is handed the angle RELATIVE to that, so "0 is the
     front of the limb" is true for any limb at any orientation. */
  var fx = 0, fy = 0, fz = 1;
  var fdot = fx * ux + fy * uy + fz * uz;
  var px = fx - fdot * ux, py = fy - fdot * uy, pz = fz - fdot * uz;
  var pl = Math.hypot(px, py, pz);
  var frontAngle = pl < 1e-6 ? 0
    : Math.atan2((px * zx + py * zy + pz * zz) / pl, (px * rx + py * ry + pz * rz) / pl);

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
      /* R108: the alternating relief is an OPTION now (default a third of the
         old 0.03). On a smooth-normal limb the +/-3% checkerboard read as
         horizontal corrugation on every arm; the crystal's facet groups no
         longer need it to break the bands. */
      facet: (k % 2 ? -1 : 1) * (opts.facet == null ? 0.010 : opts.facet) * taper,
      shape: opts.shape ? (function (tt, fa, fn) {
        return function (a) { return fn(tt, a - fa); };
      }(t, frontAngle, opts.shape)) : undefined,
      /* A LIFT RAMP ALONG THE LIMB — how a part stops looking bolted on.

         `opts.lift` is one value for a whole solid, so a deltoid at 0.40 meeting
         a torso at 0.14 puts a hard value step exactly at the seam between them,
         and the eye reads a step in value as a boundary between OBJECTS however
         well the geometry interpenetrates. That is most of the "arms attached
         afterward" impression: not the shape of the join, the value of it.

         `opts.hero(t)` lets a limb start at its neighbour's value and arrive at
         its own, so the transition happens across the form instead of at the
         seam. */
      hero: opts.hero ? opts.hero(t) : undefined,
      fg: opts.fg,   /* R107: facet-group size along the limb */
      /* R98 — the platinum weight may ramp along the limb too, for the same
         reason the lift does: a coat that starts at the seam is a seam. */
      coat: opts.coatAt ? opts.coatAt(t) : opts.coat,
      /* R95 — LONG FACETS ALONG THE LIMB. The references' arms are striated:
         a handful of long crystal planes running from shoulder to elbow, not a
         quilt of small triangles. `columns` seeds each strip of the tube as one
         class with one diagonal, and `zoneAt(d, t)` — handed the angle relative
         to the limb's FRONT and the position along it — lets the caller name
         the class of each strip outright: bicep, sides, tricep. */
      columns: !!opts.columns,
      zoneAt: opts.zoneAt ? (function (tt, fa, fn) {
        return function (a) { return fn(a - fa, tt); };
      }(t, frontAngle, opts.zoneAt)) : undefined
    });
  }

  var built = loft(rings, sides || 6, { capTop: true, capBottom: true, phase: opts.phase, lift: opts.lift, classes: opts.classes, coat: opts.coat });

  var p = built.geometry.attributes.position.array;
  var n = built.geometry.attributes.normal.array;

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
  /* The smoothed normals are a normal field like any other and have to be
     rotated with the part. Left in the loft's local space they would describe a
     surface pointing in an unrelated direction, and the chamfer would lean the
     shading normal toward nonsense. */
  var sm = built.geometry.attributes.aSmooth;
  if (sm) { xform(sm.array, false); sm.needsUpdate = true; }
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
  /* R90 — SIXTEEN, for the same reason and one more.

     At eight, each of the four lower bevels is a single enormous plane, and a
     single plane either catches a light card or it does not. One of them caught
     the camera-side key square-on and returned pure white across a fifth of the
     head — a blown bar under the chin that was the brightest thing in the frame
     and survived several passes of being blamed on other parts.

     That is not a lighting problem, it is a resolution problem: a cut gem
     distributes light across many small facets so that some catch and their
     neighbours do not, which is exactly the reference's head. Sixteen girdle
     points quarter the area of each bevel; the extra vertices again sit ON the
     diamond's own edges, so the silhouette is mathematically identical and only
     the cut changes. It costs 64 triangles on one small mesh. */
  var N = 16;
  var girdle = [];
  for (var g = 0; g < N; g++) {
    var t = g / N * Math.PI * 2;
    /* Parametrise the diamond itself rather than a circle, so every point
       lands exactly on the outline. */
    var ct = Math.cos(t), st = Math.sin(t);
    var k = 1 / (Math.abs(ct) + Math.abs(st));
    girdle.push({ x: ct * k * hw, y: st * k * hh });
  }

  function ring(scale, z, jitterSeed, insetZig) {
    return girdle.map(function (p, i) {
      /* R101 — MIRROR-SYMMETRIC. The scatter and the zigzag are keyed on the
         point's FOLDED index (its mirror across the vertical centreline is
         i -> N/2 - i), so the left and right halves of every ring are exact
         reflections: the chassis is symmetric by construction and only the
         light is allowed to be asymmetric. */
      var fi = Math.min(i, (N / 2 - i + N) % N);
      /* A little depth scatter on the bevel ring gives the front facets
         genuinely different tilts, which is what makes the head catch light in
         several places instead of reading as one plate. */
      var jz = jitterSeed == null ? 0 : (hash2(fi * 3 + jitterSeed, jitterSeed) - 0.5) * 2 * relief * hd;
      /* R95 — AN IN-PLANE ZIGZAG ON THE INNER RINGS. Reviewed, each side of a
         crown band was four coplanar quads (all four points sit on the same
         diamond edge, only z scattered), so a band reflected one environment
         region as one plate. Alternate points now sit a little inside or
         outside the nominal inset, which breaks each side into planes that tilt
         left and right as well as in and out — the many small facets a cut
         frame shows. The silhouette ring never takes it. */
      var s = scale * (1 + (insetZig || 0) * (fi % 2 ? 1 : -1) * (fi % 4 < 2 ? 1 : -0.6));
      return push(p.x * s, p.y * s, z + jz);
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

  var E = ring(1, 0, null);                       /* the silhouette — never jittered */
  var C = ring(crownInset, crownZ, 11, 0.030);    /* crown band */
  var B = ring(bevel, bevelZ, 5, 0.022);          /* table edge / recess lip */
  var I = ring(innerInset, innerZ, 17, 0.014);    /* inner bevel, inside the opening */
  var F = ring(face, faceZ, null);          /* the recessed face plate */
  /* R98 — A PLATE, NOT A SKULL. The rear used to close to a single apex, so
     from any three-quarter or rear view the head was a faceted pyramid behind
     the face — the "bulbous" read. The platinum references cut the head as a
     thin plate with a chamfered back: a side band from the silhouette to a
     back ring, and a flat back plate. `backInset` sizes that plate (0 keeps
     the old apex). */
  var backInset = opts.backInset == null ? 0 : opts.backInset;
  var K = backInset > 0 ? ring(backInset, backZ, null) : null;
  var back = push(0, 0, backZ);
  /* R100 — THE DISPLAY MODULE. The face is no longer a plate painted on the
     cavity floor: inside the recess sits a raised module — a channel floor
     ring around it (the cavity material), a short bezel wall rising from the
     floor (its own material, dark steel), and the GLASS on top, standing
     `screenZ` forward of the floor and still behind the lip. That is the
     depth stack the platinum references show: casing, channel, bezel, glass,
     dark screen, luminous UI. `screenInset` sizes the glass. 0 keeps the old
     flat plate. */
  var screenInset = opts.screenInset == null ? 0 : opts.screenInset;
  var screenZ = (opts.screenZ == null ? 0 : opts.screenZ) * hd;
  var S0 = screenInset > 0 ? ring(Math.min(face, screenInset + 0.025), faceZ, null) : null;   /* the bezel's foot, on the floor */
  var S = screenInset > 0 ? ring(screenInset, screenZ, null) : null;                            /* the glass's edge */

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
  /* R98 — the platinum weight per shell polygon: the front chamfer bands take
     the coat (they are the head's hero planes — the bevel band the reference
     draws bright around the black face), the side band a little less, the back
     plate the least; the cavity and the face plate never do. */
  var shellCoat = [];
  var coat = opts.coat == null ? 0 : opts.coat;
  for (var i = 0; i < N; i++) {
    var j = (i + 1) % N;
    shell.push([E[j], C[j], C[i], E[i]]); shellCoat.push(coat);          /* outer chamfer band */
    shell.push([C[j], B[j], B[i], C[i]]); shellCoat.push(coat * 1.0);    /* inner chamfer band — the lip */
    cavity.push([B[j], I[j], I[i], B[i]]);  /* over the lip, into the cavity */
    cavity.push([I[j], F[j], F[i], I[i]]);  /* the inner bevel wall */
    if (K) {
      shell.push([E[j], E[i], K[i], K[j]]); shellCoat.push(coat * 0.55);  /* side band, wound rearward */
    } else {
      shell.push([E[j], E[i], back]); shellCoat.push(coat * 0.35);        /* back facets — already correct */
    }
  }
  if (K) {
    /* the flat back plate, fanned and wound rearward */
    for (var kb = 0; kb < N; kb++) { shell.push([back, K[(kb + 1) % N], K[kb]]); shellCoat.push(coat * 0.30); }
  }
  /* Fan the plate from its centre so it is several triangles, not one quad —
     it then picks up a little value variation of its own instead of reading as
     a single flat void. */
  var bezel = [];
  if (S) {
    /* the channel floor: an annulus between the cavity's foot and the bezel */
    for (var s = 0; s < N; s++) {
      var sj = (s + 1) % N;
      cavity.push([F[sj], S0[sj], S0[s], F[s]]);          /* floor ring, facing forward */
      bezel.push([S0[sj], S[sj], S[s], S0[s]]);           /* the bezel wall, rising */
    }
    var sc = push(0, 0, screenZ);
    for (var g2 = 0; g2 < N; g2++) plate.push([sc, S[g2], S[(g2 + 1) % N]]);   /* the glass */
  } else {
    var centre = push(0, 0, faceZ);
    for (var f = 0; f < N; f++) plate.push([centre, F[f], F[(f + 1) % N]]);
  }

  var faceCoat = shellCoat.slice();
  for (var pc = 0; pc < plate.length + cavity.length + bezel.length; pc++) faceCoat.push(0);
  var groups = [
    { faces: shell, material: 0 },
    { faces: plate, material: 1 },
    { faces: cavity, material: 2 }
  ];
  if (bezel.length) groups.push({ faces: bezel, material: 3 });
  var geo = facetedGeometry(P, null, groups, { lift: opts.lift, classes: opts.classes, faceCoat: faceCoat });
  /* where the glass sits, for the content layer and the casing shadow */
  geo.userData.screen = { z: S ? screenZ : faceZ, inset: S ? screenInset : face };
  return geo;
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
    /* R94: the side strips were wound inward (normal (-,-) on the (+,+) side). */
    faces.push([b[i], b[j], f[j], f[i]]);
  }
  return facetedGeometry(P, faces);
}
