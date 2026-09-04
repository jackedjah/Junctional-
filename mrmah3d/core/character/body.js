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
  Group, Mesh, EdgesGeometry, LineSegments, PlaneGeometry, Vector3,
  BufferGeometry, Float32BufferAttribute
} from '../../vendor/three/three.module.min.js';
import { loft, segment, diamondPlate, facetedGeometry } from './forge.js';
import { TORSO, NECK, INSIGNIA, HEAD, ARMS } from './proportions.js';

function lit(group, geo, materials, opts) {
  var o = opts || {};
  var mesh = new Mesh(geo, o.material || materials.body);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  if (o.rim !== false) {
    /* THE RIM SHELL MUST SCALE ABOUT THE PART, NOT ABOUT THE MODEL ORIGIN.

       `scale.setScalar(s)` scales about the mesh's local origin, and every part
       here shares the character's origin down at the torso tip. So the inflated
       copy of a part standing 1.93 units up was not merely fatter — it was
       displaced 1.93 * 0.022 = 0.043 units UPWARD, floating clear of the surface
       it was supposed to hug.

       That single error produced two of the frame's worst artifacts. On the
       torso the lifted copy hovered above the shoulder crown and, viewed from
       below the shoulder line, showed its additive underside as a bright
       ellipse spanning the whole chest — the "cyan hoop", which looked for all
       the world like the character was standing in a bucket. On the shoulder
       wedges the same lift drew the bright floating quads above each shoulder.
       Neither was a lighting or an edge problem, which is why tuning edges
       never shifted them.

       Scaling about the geometry's own centre keeps the shell concentric with
       its part: p' = c + s * (p - c), which is a scale of s plus a translation
       of c * (1 - s).

       AND THE INFLATION IS HORIZONTAL ONLY.

       Growing the shell vertically as well is what actually drew the hoop, and
       it does so no matter where the shell is centred: a uniformly inflated
       solid also grows out of its own top, so the shell's crown floated 0.022
       above the real crown, and being back-faced and additive it showed that
       underside as a bright annulus spanning the whole chest. Since the shell
       exists to put a lit lip on the LEFT AND RIGHT contour, the vertical term
       was never contributing anything to begin with — it was pure artifact. */
    var s = o.rimScale || 1.03;
    var rim = new Mesh(geo, materials.rim);
    rim.scale.set(s, 1, s);
    if (!geo.boundingBox) geo.computeBoundingBox();
    var c = geo.boundingBox.getCenter(new Vector3());
    rim.position.set(c.x * (1 - s), 0, c.z * (1 - s));
    if (o.rimOffset) rim.position.add(o.rimOffset);
    group.add(rim);
  }
  /* TWO TIERS OF EDGE, and this is what breaks the wireframe read.

     One threshold gives every line the same weight, so a structural break like
     the shoulder chevron looks exactly as important as the seam between two
     adjacent facets — the eye reads a cage. Extracting twice separates them:
     a high threshold finds only the real plane breaks and draws them brightly,
     a low threshold finds every seam and draws it as a whisper. The surfaces
     then carry the identity and the lines describe structure. */
  /* FOUR CLASSES OF EDGE.

     hero        > 74 deg   rare, ice-white — the sharpest breaks only
     structural  > 52 deg   clearly visible cyan
     secondary   > 18 deg   a faint glint along a facet boundary
     lost        below that — not drawn at all, and that is the point

     Extracting at one threshold gave every line the same weight, so a facet
     seam looked as important as the shoulder spine and the eye read a cage. */
  /* Hero edges are OPT-IN. Applied everywhere they immediately drew a bright
     white cage around the shoulder wedges, whose box corners all clear any
     sensible threshold — a slab has nothing but hero edges. They belong only on
     parts whose sharpest breaks are genuinely the character's structure. */
  /* `quiet` demotes a part's structural tier to a whisper.

     The shoulder wedges needed it. They are slabs, so every one of their
     corners clears any structural threshold, and drawing them at the normal
     structural value outlined each shoulder as a complete bright rectangle —
     two boxes stuck to the chest. Raising the threshold does not help: it keeps
     the box corners, which are the sharpest breaks, and loses the ridge spine,
     which is the shallow one that actually describes the form. The fix is to
     let the shoulders be carried by their surfaces and keep only a hint of
     line, which is what the reference shows there. */
  var hero = o.hero ? new EdgesGeometry(geo, o.heroAngle || 74) : null;
  var major = new EdgesGeometry(geo, o.edgeAngle || 52);
  var minor = new EdgesGeometry(geo, o.minorAngle || 18);
  if (hero) group.add(new LineSegments(hero, materials.edgeHero));
  if (o.quiet) {
    group.add(new LineSegments(major, materials.edgeHalo));
  } else {
    group.add(new LineSegments(major, materials.edge));
    group.add(new LineSegments(major, materials.edgeHalo));
  }
  group.add(new LineSegments(minor, materials.edgeFaint));
  return { mesh: mesh, edges: major, minorEdges: minor, heroEdges: hero };
}

export function buildBody(materials) {
  var group = new Group();
  group.name = 'mrmah-body';
  var owned = [];

  /* ---- torso ----------------------------------------------------------
     heroAngle 86, not 78. With the ring table thinned out the seam just above
     the tip became a very sharp break, cleared the hero threshold, and drew a
     bright white bar straight across the bottom of the body. Hero edges are
     meant to be rare by construction; if a routine seam qualifies, the
     threshold is wrong rather than the seam. */
  var torsoLoft = loft(TORSO.rings, TORSO.sides || 8, { capTop: true, capBottom: false });
  var torsoParts = lit(group, torsoLoft.geometry, materials, { rimScale: 1.022, hero: true, heroAngle: 86 });
  owned.push(torsoLoft.geometry, torsoParts.edges, torsoParts.minorEdges, torsoParts.heroEdges);

  /* ---- shoulder caps / deltoids --------------------------------------- */
  /* A LOFTED MASS, NOT A SLAB.

     Three versions of this were wedges — a flat-topped box reaching out from
     the chest — and every one of them read as an epaulette rather than as a
     shoulder. The reasons compound: a slab has a flat top plane that either
     faces the light (a bright plate) or is tilted away (a collapsed shoulder),
     its box corners are all sharp so any edge threshold outlines it, and,
     worst, it is a SEPARATE object butted against the arm, so the eye reads
     plate-then-arm instead of one continuous mass.

     Reference A has no such seam. The shoulder swells out of the chest, is
     widest just outboard of the joint, and tapers straight into the upper arm.
     That is a tapered tube with a belly, which is exactly what `segment` with a
     profile builds — the same tool the biceps use. Its far end lands on the
     shoulder joint at slightly more than the upper arm's own radius, so the
     deltoid closes over the top of the arm and the two become one form. */
  var deltoidGeos = [];
  [-1, 1].forEach(function (side) {
    var spec = side < 0 ? ARMS.right : ARMS.left;
    var joint = spec.shoulder;
    var inner = [side * 0.26, TORSO.topY - 0.015, 0.015];
    var outer = [joint[0] * 0.99, joint[1] - 0.10, joint[2]];
    var geo = segment(
      inner, outer,
      0.300, spec.upperRadius * 1.22, 8,
      { depthRatio: 0.86, crystal: 0.055, steps: 5, profile: function (t) {
        /* Widest just outboard of where it leaves the chest — the deltoid
           belly — then drawing into the arm. */
        return 1 + Math.sin(Math.pow(t, 0.7) * Math.PI) * 0.17;
      } }
    );
    var parts = lit(group, geo, materials, { rimScale: 1.03, quiet: true, minorAngle: 30 });
    owned.push(geo, parts.edges, parts.minorEdges, parts.heroEdges);
    deltoidGeos.push(geo);

    /* THE SHOULDER LINE, drawn explicitly.

       Reference A runs a bright line along the top of each shoulder, and it is
       doing real work: it states the shoulder's width and separates the lit
       upper surface from the shadowed outer one. It cannot be extracted by
       dihedral angle, because on a rounded mass the break it describes is the
       silhouette from this viewpoint rather than a crease in the surface — the
       angle there is gentle everywhere. Threshold tools cannot find a line that
       is not a crease, so it is authored: two points, hero value, following the
       top of the deltoid from the neck side out to the joint. */
    var ridge = new BufferGeometry();
    ridge.setAttribute('position', new Float32BufferAttribute([
      inner[0] * 0.9, inner[1] + 0.055, inner[2] + 0.10,
      outer[0], outer[1] + spec.upperRadius * 1.05, outer[2] + 0.04
    ], 3));
    group.add(new LineSegments(ridge, materials.edgeHero));
    owned.push(ridge);
  });

  /* ---- neck ----------------------------------------------------------- */
  /* Short and narrow. The head's lower vertex overlaps it, exactly as in the
     reference, so only a small collar of it is ever visible. */
  /* The neck runs from INSIDE the chest to INSIDE the head.

     Previously it spanned the visible gap between them and read as a little
     rectangular connector bridging two separate objects — the character looked
     assembled rather than sculpted. Burying both ends means neither termination
     is ever visible: the head's lower vertex descends over the top of it and
     the collar below rises to receive it, so the transition is continuous
     crystal. It is also wider at the base than the top, which is what lets the
     chest appear to carry the head rather than merely touch it. */
  /* A TENON, not a neck.

     Measured off the reference, the head's lower vertex (t=0.343) and the
     shoulder line (t=0.356) are fifteen pixels apart: the point of the diamond
     lands essentially ON the chest and no neck is visible anywhere in the
     image. What we were drawing was a cone 0.156 wide climbing through rows
     where the head tapers to nothing, so it protruded around the head's point
     as a pale funnel — the "head / little rectangular neck / body" read, and
     the reason the character looked assembled.

     So this is now a narrow internal connector: buried in the chest crown at
     the bottom, buried inside the head at the top, and narrower than the head's
     own cross-section for all but a sliver of its length. It exists to make the
     two solids one solid, and it is not meant to be seen.

     The separate collar flare is gone with it. Its job — giving the chest
     something to receive the head with — now belongs to the crown rings in
     proportions.js, which is where it should have been: part of the torso's own
     surface rather than a ring clipped around it. As a separate lofted tube it
     could only ever read as a shelf or a hoop sitting on the chest. */
  var neckGeo = segment(
    [0, TORSO.topY - 0.10, 0.01],                     /* inside the chest */
    [0, HEAD.centreY - HEAD.halfHeight * 0.60, 0.01], /* up inside the head */
    NECK.halfWidth * 0.42, NECK.halfWidth * 0.34, 8,
    { depthRatio: 0.92, crystal: 0.05, steps: 3 }
  );
  /* Quiet, and no rim. Whatever of the tenon is briefly visible between the
     head's lower vertex and the chest crown should read as crystal continuing,
     not as a bright-edged column bridging two objects — which is exactly the
     "assembled" impression the tenon exists to remove. Its edges are demoted to
     a whisper so the surfaces alone carry it. */
  var neckParts = lit(group, neckGeo, materials, { rim: false, quiet: true, minorAngle: 40 });
  owned.push(neckGeo, neckParts.edges, neckParts.minorEdges, neckParts.heroEdges);

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
