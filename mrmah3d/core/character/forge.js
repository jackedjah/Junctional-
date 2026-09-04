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
export function facetedGeometry(positions, faces, groups) {
  var pos = [], nor = [];
  var groupRanges = [];
  var written = 0;

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
  if (groupRanges.length > 1) {
    groupRanges.forEach(function (g) { geo.addGroup(g.start, g.count, g.material); });
  }
  geo.computeBoundingSphere();
  return geo;
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

  sections.forEach(function (s) {
    if (s.w <= 1e-6 && s.d <= 1e-6) { rings.push({ point: push(0, s.y, 0), verts: null }); return; }
    var verts = [];
    for (var i = 0; i < sides; i++) {
      var a = phase + (i / sides) * Math.PI * 2;
      /* Alternating facet relief. Pulling every other vertex slightly in
         makes each quad of the loft non-planar, so its two triangles get
         different normals and return different values under the same light.
         Without it a lofted taper is almost smooth and the body reads as a
         flat dark shape with lines drawn on it — the crystal has to be made
         of visibly distinct planes for lighting to describe the form. */
      var relief = 1 + (s.facet || 0) * (i % 2 ? -1 : 1);
      /* A shoulder shelf: front and back vertices sit lower than the sides,
         which is the collar chevron the reference shows across the chest. */
      var drop = (s.dip || 0) * Math.abs(Math.sin(a));
      verts.push(push(Math.cos(a) * s.w * relief, s.y - drop, Math.sin(a) * s.d * relief));
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

  return { geometry: facetedGeometry(positions, faces), positions: positions, faces: faces };
}

/* A tapered faceted limb segment running from point A to point B.
   Built along +Y then oriented, so the caller works in world positions and
   never has to think about rotations. */
export function segment(a, b, radiusA, radiusB, sides, options) {
  var opts = options || {};
  var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  var len = Math.hypot(dx, dy, dz) || 1e-6;

  var built = loft([
    { y: 0, w: radiusA, d: radiusA * (opts.depthRatio || 0.82) },
    { y: len, w: radiusB, d: radiusB * (opts.depthRatio || 0.82) }
  ], sides || 6, { capTop: true, capBottom: true, phase: opts.phase });

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

  var P = [];
  function push(x, y, z) { P.push(x, y, z); return P.length / 3 - 1; }

  /* Equator diamond: right, top, left, bottom — at z = 0. */
  var E = [push(hw, 0, 0), push(0, hh, 0), push(-hw, 0, 0), push(0, -hh, 0)];
  /* Bevel ring, forward. */
  var B = [push(hw * bevel, 0, bevelZ), push(0, hh * bevel, bevelZ),
           push(-hw * bevel, 0, bevelZ), push(0, -hh * bevel, bevelZ)];
  /* Face plate, inset AND behind the bevel ring. */
  var F = [push(hw * face, 0, faceZ), push(0, hh * face, faceZ),
           push(-hw * face, 0, faceZ), push(0, -hh * face, faceZ)];
  /* Back apex. */
  var back = push(0, 0, backZ);

  var shell = [], plate = [];
  for (var i = 0; i < 4; i++) {
    var j = (i + 1) % 4;
    shell.push([E[i], B[i], B[j], E[j]]);   /* front bevels */
    shell.push([B[i], F[i], F[j], B[j]]);   /* the recess lip */
    shell.push([E[j], E[i], back]);         /* back facets */
  }
  plate.push([F[0], F[1], F[2], F[3]]);     /* the dark facial plane */

  return facetedGeometry(P, null, [
    { faces: shell, material: 0 },
    { faces: plate, material: 1 }
  ]);
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
