/* MR.MAH 3D :: BODY
   Neck, torso, shoulder caps, and the chest insignia.

   The torso is a lofted six-sided taper, not a cone. Six sides phased so a
   vertex lands dead centre-front gives a vertical prow ridge down the chest,
   which splits the front into two large planes that catch light differently —
   the strongest facet break the reference shows, and the thing that stops the
   torso reading as a flat dark shape with cyan lines drawn on it.

   The ring table in proportions.js follows the measured width curve from the
   reference: an almost straight taper from the shoulder line to the tip that
   stiffens slightly in the upper third. */

import {
  Group, Mesh, EdgesGeometry, LineSegments, PlaneGeometry
} from '../../vendor/three/three.module.min.js';
import { loft, segment, diamondPlate, facetedGeometry } from './forge.js';
import { TORSO, NECK, INSIGNIA, HEAD } from './proportions.js';

function lit(group, geo, materials, opts) {
  var o = opts || {};
  var mesh = new Mesh(geo, o.material || materials.body);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  if (o.rim !== false) {
    var rim = new Mesh(geo, materials.rim);
    rim.scale.setScalar(o.rimScale || 1.03);
    if (o.rimOffset) rim.position.copy(o.rimOffset);
    group.add(rim);
  }
  var edges = new EdgesGeometry(geo, o.edgeAngle || 44);
  group.add(new LineSegments(edges, materials.edge));
  group.add(new LineSegments(edges, materials.edgeHalo));
  return { mesh: mesh, edges: edges };
}

export function buildBody(materials) {
  var group = new Group();
  group.name = 'mrmah-body';
  var owned = [];

  /* ---- torso ---------------------------------------------------------- */
  var torsoLoft = loft(TORSO.rings, TORSO.sides || 8, { capTop: true, capBottom: false });
  var torsoParts = lit(group, torsoLoft.geometry, materials, { rimScale: 1.022 });
  owned.push(torsoLoft.geometry, torsoParts.edges);

  /* ---- shoulder caps -------------------------------------------------- */
  /* Angular wedges reaching past the torso ring, which is what gives the
     reference its broad, hard shoulder line and gives the arms a real joint
     to leave from rather than sprouting out of a smooth surface. */
  [-1, 1].forEach(function (side) {
    var P = [];
    function p(x, y, z) { P.push(x, y, z); return P.length / 3 - 1; }
    var inner = TORSO.rings[TORSO.rings.length - 1].w * 0.72;
    var outer = TORSO.shoulderHalfWidth;
    var yTop = TORSO.topY, yBot = TORSO.shoulderY - 0.30, d = 0.20;

    var a = p(side * inner, yTop, d);
    var b = p(side * outer, yTop - 0.055, d * 0.62);
    var c = p(side * outer, yBot, d * 0.52);
    var e = p(side * inner, yBot - 0.06, d);
    var a2 = p(side * inner, yTop, -d);
    var b2 = p(side * outer, yTop - 0.055, -d * 0.62);
    var c2 = p(side * outer, yBot, -d * 0.52);
    var e2 = p(side * inner, yBot - 0.06, -d);

    var faces = side > 0
      ? [[a, b, c, e], [e2, c2, b2, a2], [a2, b2, b, a], [b2, c2, c, b], [c2, e2, e, c], [e2, a2, a, e]]
      : [[e, c, b, a], [a2, b2, c2, e2], [a, b, b2, a2], [b, c, c2, b2], [c, e, e2, c2], [e, a, a2, e2]];

    var geo = facetedGeometry(P, faces);
    var parts = lit(group, geo, materials, { rimScale: 1.04 });
    owned.push(geo, parts.edges);
  });

  /* ---- neck ----------------------------------------------------------- */
  /* Short and narrow. The head's lower vertex overlaps it, exactly as in the
     reference, so only a small collar of it is ever visible. */
  var neckGeo = segment(
    [0, TORSO.topY - 0.02, 0.02],
    [0, HEAD.centreY - HEAD.halfHeight * 0.45, 0.02],
    NECK.halfWidth * 1.15, NECK.halfWidth * 0.86, 6, { depthRatio: 0.85 }
  );
  var neckParts = lit(group, neckGeo, materials, { rimScale: 1.05 });
  owned.push(neckGeo, neckParts.edges);

  /* ---- chest insignia ------------------------------------------------- */
  /* Emissive, sitting slightly proud of the chest ridge so it is never
     swallowed by the prow. */
  function chestZ(y) {
    /* interpolate the torso's front depth at height y */
    var r = TORSO.rings;
    for (var i = 0; i < r.length - 1; i++) {
      if (y >= r[i].y && y <= r[i + 1].y) {
        var t = (y - r[i].y) / (r[i + 1].y - r[i].y || 1);
        return r[i].d + (r[i + 1].d - r[i].d) * t;
      }
    }
    return r[r.length - 1].d;
  }

  var emblemGeo = diamondPlate(INSIGNIA.emblemHalf, 0.012);
  var emblem = new Mesh(emblemGeo, materials.emissive);
  emblem.position.set(0, INSIGNIA.emblemY, chestZ(INSIGNIA.emblemY) + 0.012);
  emblem.name = 'chest-emblem';
  group.add(emblem);
  var emblemGlow = new Mesh(diamondPlate(INSIGNIA.emblemHalf * 1.9, 0.004), materials.emissiveSoft);
  emblemGlow.position.copy(emblem.position);
  group.add(emblemGlow);
  owned.push(emblemGeo, emblemGlow.geometry);

  /* Transport symbols: a left triangle, a centre diamond, a right triangle,
     matching the row beneath the emblem in the reference. */
  var symbols = new Group();
  symbols.name = 'transport-symbols';
  var sy = INSIGNIA.symbolsY;
  var sz = chestZ(sy) + 0.012;
  var sh = INSIGNIA.symbolHalf;

  function triangle(dir) {
    var P = [];
    function p(x, y, z) { P.push(x, y, z); return P.length / 3 - 1; }
    var t = [p(dir * sh, 0, 0.006), p(-dir * sh * 0.75, sh * 0.9, 0.006), p(-dir * sh * 0.75, -sh * 0.9, 0.006)];
    return facetedGeometry(P, dir > 0 ? [[t[0], t[1], t[2]]] : [[t[0], t[2], t[1]]]);
  }

  var symGeos = [triangle(-1), diamondPlate(sh * 0.8, 0.006), triangle(1)];
  symGeos.forEach(function (g, i) {
    var m = new Mesh(g, materials.emissive);
    m.position.set((i - 1) * INSIGNIA.symbolSpacing, sy, sz);
    symbols.add(m);
    owned.push(g);
  });
  group.add(symbols);

  return {
    group: group,
    torso: torsoParts.mesh,
    emblem: emblem,
    symbols: symbols,
    chestZ: chestZ,
    dispose: function () { owned.forEach(function (g) { if (g && g.dispose) g.dispose(); }); }
  };
}
