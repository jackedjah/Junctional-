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
import { TORSO, INSIGNIA, HEAD, ARMS } from './proportions.js';
import { REGIONS } from './regions.js';

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

/* R96 — `P` is an optional PROPORTION SET (see variants.js). The male canon
   is the default; a variant hands in its own TORSO / ARMS / INSIGNIA and the
   builder is otherwise identical — one renderer, one body pipeline. */
export function buildBody(materials, P) {
  var TORSO_ = (P && P.TORSO) || TORSO, ARMS_ = (P && P.ARMS) || ARMS, INSIGNIA_ = (P && P.INSIGNIA) || INSIGNIA;
  var group = new Group();
  group.name = 'mrmah-body';
  var owned = [];

  /* ---- torso ----------------------------------------------------------
     NO HERO TIER ON THE TORSO ANY MORE.

     It existed to pick out the prow down the chest when the body was a plain
     cone. The body now has a waist, a ribcage and a crown, and every one of
     those is a sharp enough turn to clear a hero threshold — so instead of one
     authored highlight the tier drew bright white bars across whichever ring
     happened to turn hardest, most recently a hard line under the chin where
     the crown meets the head. Hero edges have to be rare BY CONSTRUCTION; on a
     shape with this many real breaks, no threshold makes them rare. The
     structural and secondary tiers describe the form perfectly well without it. */
  var torsoLoft = loft(TORSO_.rings, TORSO_.sides || 8,
    { capTop: true, capBottom: false, lift: TORSO_.classLift, inner: true, refine: TORSO_.refine || 0, jitter: TORSO_.jitter == null ? 1 : TORSO_.jitter,   /* R107: spline-refined rings, half the jitter — see forge.js */
      /* R98 — the body's default platinum share; the ring table and the zone
         functions in proportions.js refine it per plane. */
      coat: REGIONS.BODY.coat });
  /* edgeAngle 42, down from the 52 default. With the ring table thinned and the
     crystal relief raised to compensate, the torso's structural breaks are real
     but not extreme — at 52 almost none of them qualified and the front of the
     body read as one smooth surface with values on it rather than as a cut
     stone with planes. Reference A's torso is defined by exactly these seams:
     thin, and present at every major plane boundary. */
  /* R90 — THE TORSO'S RIM SHELL IS GONE, AND THIS TIME ON MEASUREMENT.

     It was removed once before and restored, on the reasoning recorded below.
     What settled it now is a histogram: sampled over a box that is entirely
     chest, the anatomical reference has 49.2% of its pixels in the darkest band
     and 19.5% above 160 — a body that is mostly black with hard catches on it.
     This build measured 0% in the darkest band. Not a few percent: none. The
     chest could not produce a dark pixel anywhere, which is the signature of an
     additive layer over the whole of it rather than of a lighting choice.

     Removing the shell for one capture confirmed it, and the frame it produced
     is by a wide margin the closest this renderer has come to Reference A: real
     black planes, the pec masses reading as value rather than as outline, and
     the ice catches finally standing out because there is something for them to
     stand out FROM.

     The reasoning that restored it was sound at the time and no longer applies.
     The shell existed to put light on a contour that had nothing else — but the
     torso now carries real anatomy, which lights its own planes, and the arms
     hang clear of the body so the contour that matters is theirs and they keep
     their shells. Bought with a flat overlay, contour light costs the whole
     dark end of the body, and the dark end is most of what makes crystal read
     as crystal.

     (The note below is kept because it is the argument this replaces.) */

  /* The torso keeps its rim shell.

     It was removed for a while during this pass on the grounds that it laid a
     broad pale sheen over the flared chest rather than a contour lip — which it
     does, because the torso is not convex: its dip chevron, crown and facet
     relief all create folds, and a back-faced copy of a folded solid shows
     through wherever the surface turns, at any inflation.

     But that sheen was never what the brief objected to. The brief asked for
     MORE presence in the torso, and the shell is most of where the body's
     presence comes from. Removing it, then compensating with envMapIntensity,
     Fresnel, a facet lift and the camera-side card in turn, produced a torso
     progressively darker and flatter than the one that was being "fixed" — a
     long correction of a fault nobody had reported. Restored. */
  /* R94: 42 -> 48. The sternum valley's vertical seams cleared 42 and drew two
     bright cyan verticals either side of the emblem — the "neon lines" on the
     core the brief rules out. The reference's sternum is a dark groove between
     two masses, not a pair of lines. */
  var torsoParts = lit(group, torsoLoft.geometry, materials,
    { rim: false, edgeAngle: 48, minorAngle: 36 });
  torsoParts.mesh.name = 'torso';   /* R99: named for the anatomical-group debug view */
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
    var spec = side < 0 ? ARMS_.right : ARMS_.left;
    var joint = spec.shoulder;
    /* PROPORTION CORRECTION — the heroic pass overshot here.

       Four things were wrong together and they compounded. The mass was 0.310
       thick at the chest end, which put each cap's apex high enough to crowd
       the head; the axis ran almost level, so the shoulder line was flat rather
       than sloping; the belly profile added 17% on top of that at the widest
       point; and the whole thing was wider than it was deep, so every unit of
       volume went sideways into the silhouette. The result read as armour
       blocks — a bodybuilder, not an athlete.

       The corrections are deliberately small and all in the same direction:

         - the chest end is slimmer (0.310 -> 0.262) and starts lower, which
           drops the visible apex without touching the head or the torso
         - the axis falls further from the neck to the joint, restoring the
           downward clavicle slope the reference has
         - depthRatio goes ABOVE 1: the deltoid is now deeper front-to-back
           than it is wide. This is the important one. It preserves the volume
           the brief explicitly says to keep while taking it out of the
           lateral silhouette, and it reads as mass from any angle the
           interaction can actually reach
         - one more step along the length, so the cap resolves into several
           facets rather than presenting as a single dark slab */
    /* THE SLOPE COMES FROM THE INNER END, NOT THE OUTER ONE.

       A first attempt at this dropped the outer end 0.165 below the arm's
       shoulder joint to get the fall. That does produce a slope, and it also
       ends the deltoid BELOW the top of the limb it is supposed to cap — so the
       arm's own top cap stood proud of it and each shoulder read as a separate
       floating pauldron with a bright seam between it and the chest.

       The clavicle end is raised instead. Same fall from neck to joint, but the
       cap still closes over the top of the arm, which is what makes the two
       read as one continuous mass. The apex comes down through the smaller
       chest-end radius rather than by moving the whole axis. */
    /* THE CHEST END MUST BE FULLY BURIED, and it was not.

       `segment` caps both ends, so the deltoid's inner end is a flat disc. That
       disc sits perpendicular to the axis, which here is nearly horizontal —
       so it spans almost its whole radius VERTICALLY: centred at y 1.925 with
       radius 0.230 it reached y 2.155, while the chest crown at that height is
       only 0.15 wide. The top of the cap was standing clear of the body beside
       the neck and catching light as a hard bright wedge on each shoulder.

       Three other explanations were tried first and all were wrong — the
       shoulder-top light card, the silver class's albedo boost, and the
       authored ridge line. None of them moved it, because it was never a
       shading problem: a flat surface that should have been inside the mesh was
       outside it. Moved inboard and down until the whole disc is within the
       torso at every row it crosses. */
    /* AND THEN THE SAME MISTAKE, ONE AXIS OVER.

       Burying the cap disc fixed the bright wedge beside the neck, but the tube
       it capped still started at x 0.152 — a sixth of the way out from the
       spine — and was DEEPER than it was wide (depthRatio 1.22, so a 0.250
       front-to-back radius against a chest whose own half-depth is 0.273). A
       horizontal tube viewed from dead front is a RECTANGLE, and this one was
       projecting through the chest wall for most of its inboard length. The
       canonical render showed exactly that: two hard-edged pale slabs across
       the pectorals, straight top, straight bottom, straight inner edge. It
       read as panelling, and it was most of what still made him look like a
       test object rather than a character.

       Removing the deltoids for one capture settled it in a single render — the
       torso underneath is a clean sloping shoulder shelf and the slabs were
       entirely these. So the deltoid now starts OUTBOARD of the chest wall
       (x 0.375, past the shoulder shelf's break) and its root is choked to a
       third of its radius by the profile, which means the buried end is a stub
       rather than a disc and nothing crosses the pectoral at all. Depth comes
       back to parity with width: the mass it needs is outboard of the ribcage,
       where sticking out in front is the shoulder reading as a shoulder rather
       than as a plate stuck on the chest. */
    /* R90 — A SLOPING CAP FROM THE TRAPEZIUS, not a level stub on the ribcage.

       With the shoulder line raised to 2.130 and the head at its reference
       size, there is a real clavicle to hang this off for the first time. The
       inner end starts inboard and HIGH, at the trapezius; the outer end lands
       just below the arm joint. That fall from neck to shoulder is the line
       Reference A has and this build has never had — every previous version ran
       the axis level, which produces a square upper body no matter what radius
       it carries. */
    /* R95-BB — A BIG ROUND CAP THAT ENCLOSES THE TOP OF THE ARM.

       Measured on the bodybuilder reference the deltoid is a near-sphere of
       radius ~0.16 sitting HIGH and OUTBOARD — its top 0.12 under the chin,
       its outer edge at 0.60, its centre roughly over the arm's axis — and the
       upper arm below it is nearly as thick as the cap. So the cap's axis now
       runs from deep inside the upper chest (x 0.30, where its root disc is
       buried) out to x 0.56 just below the shoulder line, with a belly of
       0.216 at six tenths of its length: top at 2.20, outer edge at 0.672.

       The arm's shoulder joint sits ON this axis at t 0.7 (see ARMS in
       proportions.js), so the arm's own top cap — a horizontal disc of 0.131 —
       is inside the cap's belly and never stands proud of it. The cap's OUTER
       end is choked to 0.45 of the arm's radius for the same reason in the
       other direction: a full-radius end disc perpendicular to a horizontal
       axis reaches 0.03 outside the arm's tube and shows as a flat circle on
       the outside of the shoulder from any three-quarter view. */
    /* R97: a bigger, rounder DOME — ten sides, a fuller belly, a higher and
       wider axis — the references' deltoid is the largest single mass on the
       upper body and it rounds over the top of the bicep. */
    /* R98: a shade more cap (r0 0.240 -> 0.252) — "slightly more jacked" —
       and the belly below goes with it. */
    /* R99: the root goes DEEPER into the chest (0.300 -> 0.262) and a shade
       higher, so the cap grows out of the trapezius and the front lobe
       overlaps the pec's outer plane — the shoulder wrapping into the body
       rather than sitting beside it. */
    /* R99, from the silhouette test (?debug=mass): at innerY 2.062 the cap's
       crest rose ABOVE the trapezius line and each shoulder read as a bump
       sitting on the body. Lowered so the crest continues the trap's slope. */
    /* R103 — THE SHOULDER ROOT. The cap sat as a detached piece beside the
       torso: its axis was 0.05 above where the lowered shoulder girdle now
       sits, so its crest stood proud of the trap slope as a bump, and its
       inboard end stopped at the chest's edge so a dark socket opened
       between shoulder and pec. The axis comes down with the girdle, the
       root goes deeper into the chest, and the anterior lobe (below) grows
       so the front delt overlaps the upper pec. */
    /* R107 — THE CAP WAS A 0.33-UNIT BALL. r0 0.29 with a 0.50 belly put the
       deltoid's radius at 0.33 at its widest — a sphere as tall as the whole
       chest (1.83-2.12), hanging beside it from above the shoulder line to the
       pec's lower edge: the smooth clay read it as a pauldron. The plate's
       deltoid is 0.11 of height tall (0.33 units across), i.e. radius ~0.17.
       So: r0 0.20, belly 0.30, rooted higher so the dome's crest continues
       the trapezius slope and its underside undercuts into the arm. */
    /* R108: the axis ENDS INSIDE THE ARM. At outerX 0.600 the cap's terminal
       ring (0.045 at t 1) sat 0.03 outside the arm's outer contour at y 1.93
       — a nub under the cap on the outer shoulder that filled the very notch
       the undercut is meant to open. At 0.560 the end is flush with the
       arm's narrowed top; the joint (0.7 of the axis) and the elbow / wrist
       move in with it (ARMS), which also hangs the arm straighter, as the
       R102 reference does (shoulder 0.46, elbow 0.53). */
    /* R108 b: the SHOULDER WIDTH IS THE AXIS END, not the belly — the cap's
       rings stand nearly vertical, so the belly at t 0.5 reaches only x 0.47
       and the outer x of the silhouette is the terminal ring. At 0.560 the
       shoulders had come in 0.05 a side (shoulderMaxRun 0.365 of height
       against R104's 0.384); 0.590 with the end choked to 0.15 keeps the nub
       within 0.007 of the arm's narrowed top and the V where it was. */
    /* R108 c: the axis end moves out and down a hair (0.605 / 1.915) so the
       dome's falling outer contour overhangs the arm's deltoid tongue (the V
       is authored on the arm, shapes.upper) rather than meeting a flush arm
       top in a crease. The joint at 0.7 and the elbow / wrist move with it
       (ARMS). */
    var D = ARMS_.deltoid || { innerX: 0.220, innerY: 2.045, outerX: 0.605, outerY: 1.915, r0: 0.228 };   /* R108: 0.235 -> 0.228 with the arm 0.158 / 1.06 deep — the cap is 1.4x the arm's depth from the side, down from 1.6x */   /* R107 c: rooted deeper and higher, so the dome grows OUT of the trapezius slope */   /* R107 b: higher and further in, so the dome ENCLOSES the torso's shoulder corner (the flat plate the rear clay showed above the caps) */
    var inner = [side * D.innerX, D.innerY, 0.0];
    var outer = [side * D.outerX, D.outerY, 0.02];
    var deltoidR0 = D.r0;
    /* R108: which sign of the cap's ring angle is UP. `segment` hands its
       shape function the angle from the limb's front, and +pi/2 is world
       up on the axis that points +x and world DOWN on the one that points
       -x (the same basis fact limbSideDirection exists for — reproduced
       here so the cap's underside and crest can be authored per side). */
    var upSign = (function () {
      var dx = outer[0] - inner[0], dy = outer[1] - inner[1], dz = outer[2] - inner[2];
      var len = Math.hypot(dx, dy, dz) || 1e-6;
      var ux = dx / len, uy = dy / len, uz = dz / len;
      var hx = Math.abs(uy) < 0.99 ? 0 : 1, hy = Math.abs(uy) < 0.99 ? 1 : 0;
      var rx = hy * uz, ry = -hx * uz, rz = hx * uy - hy * ux;
      var rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
      var zx = ry * uz - rz * uy, zy = rz * ux - rx * uz, zz = rx * uy - ry * ux;
      var px = -uz * ux, py = -uz * uy, pz = 1 - uz * uz;
      var pl = Math.hypot(px, py, pz) || 1;
      var fa = Math.atan2((px * zx + py * zy + pz * zz) / pl, (px * rx + py * ry + pz * rz) / pl);
      var an = fa + Math.PI / 2;
      var sideY = Math.cos(an) * ry + Math.sin(an) * zy;
      return sideY >= 0 ? 1 : -1;
    }());
    /* SMALLER THAN THE ARM IT MEETS, not larger. `segment` caps both ends, and
       the outer cap is a disc perpendicular to a near-horizontal axis, so at
       1.22x the upper-arm radius it stood proud of the limb all the way round
       and rendered as a bright white wedge on each shoulder top. The arm's own
       profile starts at 0.84, i.e. radius 0.094 — so the deltoid ends at 0.087
       and the disc is inside the bicep where nothing can see it. The mass the
       shoulder needs comes from the belly in the middle, not from the join. */
    /* Equal to the upper arm's nominal radius, which is 1.19x the radius the arm
       ACTUALLY has at the joint — the limb profile starts at 0.84. So the cap
       still closes over the top of the limb rather than standing proud of it
       (the blown-white-wedge failure), while reaching the 0.598 half-width the
       reference measures across the shoulders. */
    var deltoidR1 = spec.upperRadius * 1.00;
    /* Root choke x belly swell. The choke keeps the inboard end inside the
       chest; the swell is the deltoid's own belly. t^1.3 puts its peak at
       t ~ 0.59 rather than at the midpoint, which places the widest part of the
       shoulder outboard of the clavicle, where the reference has it, instead of
       raising a hump beside the neck. */
    /* R108 — CAP -> UNDERCUT -> ARM. The dome's outer end now falls HARDER
       and EARLIER (from t 0.68, to 0.30 of the lerped radius) so the cap's
       underside curves back in under its own apex before the arm emerges,
       and the arm's insertion narrowing (shapes.upper) meets it there: the
       contour reads rising mass -> broad apex -> descending cap -> a real
       under-delt notch -> the biceps swelling out again. At 0.62 from 0.75
       the cap ran almost straight into the arm and the smooth clay read one
       lump on a tube. The belly's peak comes a touch inboard (t^1.10) so the
       crest sits over the joint, not outboard of it. */
    var deltoidProfile = function (t) {
      var root = Math.min(1, t / 0.34);
      var endT = Math.max(0, (t - 0.68) / 0.32);
      var end = 1 - 0.85 * endT * endT * (3 - 2 * endT);
      return (0.55 + 0.45 * root * root * (3 - 2 * root)) * end *   /* R107: the root is FULL (0.55 of r0) inside the torso — a choked root necked the dome onto the chest with a crease all round */
             (1 + Math.pow(Math.sin(Math.pow(t, 1.10) * Math.PI), 0.8) * 0.30);   /* R105: a CAP; R107: 0.30 — the dome's size is r0's job, the belly only rounds it */
    };
    /* R94 — A DOME FROM A HANDFUL OF PLANES, drawn by its surfaces.

       Eight sides by eight steps with a structural edge tier, a faint tier AND
       an additive rim shell drew each shoulder as a transparent wire balloon:
       the cap's own faces were dark (they face up, and up reflects the empty
       x~64 region of the environment — see CLAUDE.md), so the only things
       visible were the lines and the lip, and the eye read a cage with nothing
       inside it. Fewer, larger planes (seven sides, five steps), the deltoid's
       own class table with no black entry (regions.js), no rim shell and only
       the sharpest breaks drawn — the dome is now carried by its planes. */
    var geo = segment(
      inner, outer,
      deltoidR0, deltoidR1, 16,   /* R108 c: sixteen sides so the three heads' plane changes land on vertices */
      { depthRatio: 0.88, crystal: 0.012, steps: 12, lift: ARMS_.deltoidLift, fg: [2, 3],   /* R108 c: 0.88 deep for its width — with the arm at 1.12 the side view lands near the reference's cap-to-arm ratio */   /* R105: eight rings, a spherical cap; R107: fourteen sides, twelve rings, a third less jitter — the cap is a smooth dome first; R108: 0.92 deep for its width (see the shape) */
        classes: REGIONS.DELT.classes,
        profile: deltoidProfile,
        /* R97 — THREE HEADS. `d` is the angle from the cap's front (+z): a
           front-delt lobe, a rear-delt lobe, and named planes for each — the
           front steel-blue, the crest lit sapphire, the rear sapphire — so the
           dome reads as front / side / rear delt and its planes trade as he
           turns, rather than as one shoulder lump. */
        /* R101 — THREE HEADS AS FORM, not only as colour: the front and rear
           lobes, a lateral CREST across the top of the cap, and two shallow
           grooves between the heads so the plane flow changes three times
           across the shoulder. */
        shape: function (t, d) {
          var ad = Math.abs(d);
          /* R102: the three heads are CARVED — the grooves between them are
             twice as deep (and the cavity term in the shader keeps them
             dark), the rear delt is fuller for the rear views. */
          /* R108 — THREE HEADS WITH THEIR OWN CENTRES OF FULLNESS. The
             anterior head is fullest LOW and forward (it rolls onto the
             upper pec and hangs over the biceps: envelope peaking at t 0.40),
             the lateral head makes the width at the crest (t 0.55), the
             posterior head wraps to the upper back (t 0.45). Each is a
             belly (pow 0.7 on the Gaussian) rather than a soft bump, and
             the valleys between them are deeper (0.045 -> 0.075) so the
             plane changes read in smooth clay — the R107 cap read as one
             sphere from every angle. Still one dome: the valleys are a
             sixth of the lobes, never cuts. */
          var frontEnv = Math.sin(Math.min(1, t / 0.80) * Math.PI);
          var crestEnv = Math.sin(Math.min(1, t / 1.20) * Math.PI);   /* R108 c: peaks at t 0.60 — the lateral head is fullest over the joint and carries out to the rim */
          var rearEnv = Math.sin(Math.min(1, t / 0.90) * Math.PI);
          /* R108 b: front 0.22 -> 0.18, rear 0.20 -> 0.15, and the cap's
             section 0.92 deep for its width (the segment's depthRatio): from
             the side the cap was 1.6x the arm's depth, a ball on a column;
             the reference's cap is about 1.2x the biceps-to-triceps depth. */
          /* R108 c: front and rear 0.12 — the side view still measured the
             cap at 1.35x the arm's depth; the arm's bellies grow (shapes.upper)
             and the cap's front / rear lobes shrink, so the ratio lands near
             the reference's 1.15-1.2. The anterior head sits a touch BELOW
             dead front (it rolls down onto the pec and hangs over the
             biceps); the posterior head sits a touch ABOVE dead rear (it
             rolls back over the scapula). */
          /* round 3: bellies (pow 0.55) rather than soft bumps, so each head
             is a plateau with its own edge and the valleys between the three
             form themselves. */
          var front = 0.13 * Math.pow(Math.exp(-Math.pow((d + upSign * 0.18) / 0.56, 2)), 0.55) * frontEnv;
          var rearD = d - upSign * (Math.PI / 2 + 1.30);
          while (rearD > Math.PI) rearD -= Math.PI * 2;
          while (rearD < -Math.PI) rearD += Math.PI * 2;
          var rear = 0.13 * Math.pow(Math.exp(-Math.pow(rearD / 0.62, 2)), 0.55) * rearEnv;
          /* R108 — UP AND DOWN ARE DIFFERENT SIDES OF THIS TUBE. The cap's
             axis runs outward, so its ring's +/-pi/2 are the crest and the
             UNDERSIDE, and `upSign` (from the segment's basis, per side) says
             which is which. The crest takes the lateral head's fullness; the
             underside is pulled IN through the belly (the armpit — a cap has
             no mass under it, a ball does) and then pushed OUT along the last
             rings, which drags the dome's lower rim down the outer arm into
             the V of the deltoid insertion. Without the V the cap's rim is a
             horizontal ring and the arm emerges from it like a sleeve from a
             shoulder pad; the reference's rim is a diagonal from the pec to
             a point halfway down the outer arm. */
          var up = Math.exp(-Math.pow((d - upSign * Math.PI / 2) / 0.55, 2));
          var downB = Math.exp(-Math.pow((d + upSign * Math.PI / 2) / 0.62, 2));
          var lateral = 0.09 * up * crestEnv;   /* R108 c: the lateral head is the dominant cap */
          var pitEnv = 1 - Math.min(1, Math.max(0, (t - 0.40) / 0.32));
          pitEnv = pitEnv * pitEnv * (3 - 2 * pitEnv);
          var pit = -0.18 * downB * pitEnv;
          var vEnv = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
          vEnv = vEnv * vEnv * (3 - 2 * vEnv);
          var vee = 0.70 * Math.exp(-Math.pow((d + upSign * Math.PI / 2) / 0.50, 2)) * vEnv * vEnv;
          /* the cap is a rounded TRIANGLE from the side, not a circle: full
             across its upper quadrants (clavicle to scapular spine) and drawn
             in below (the pit) toward the insertion */
          var broad = 0.10 * (Math.exp(-Math.pow((d - upSign * (Math.PI / 2 - 1.05)) / 0.55, 2)) +
                              Math.exp(-Math.pow((d - upSign * (Math.PI / 2 + 1.05)) / 0.55, 2))) * crestEnv;
          /* R108 c: the two grooves are the BOUNDARIES of the lateral head —
             anterior / lateral at 0.80 rad in front of the crest, lateral /
             posterior at 0.80 behind it — on the UP side only. The first
             pass placed them at |d| 0.92 and 2.20, which mirrored each into
             the underside where there is nothing to separate. */
          /* round 4: the grooves CONVERGE toward the insertion. Under the rear
             envelope they were gone by t 0.9 — exactly the outer dome the
             side view looks at — and they ran parallel to the axis, so the
             cap read as a ball from the side however deep they were. Their
             spread from the crest opens from 0.80 rad to 1.65 over the outer
             half (the two edges of the lateral head sweep DOWN around the
             dome to meet near the underside at the rim, the V), and their
             envelope peaks at t 0.56 and is still half-strength at 0.86. */
          var gEnv = Math.pow(Math.sin(Math.min(1, Math.max(0, (t - 0.12) / 0.88)) * Math.PI), 0.8);
          var gS = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
          gS = gS * gS * (3 - 2 * gS);
          var spread = 0.80 + 0.85 * gS;
          var gA = d - upSign * (Math.PI / 2 - spread), gP = d - upSign * (Math.PI / 2 + spread);
          while (gA > Math.PI) gA -= Math.PI * 2; while (gA < -Math.PI) gA += Math.PI * 2;
          while (gP > Math.PI) gP -= Math.PI * 2; while (gP < -Math.PI) gP += Math.PI * 2;
          var grooves = -0.09 * (Math.exp(-Math.pow(gA / 0.40, 2)) + Math.exp(-Math.pow(gP / 0.40, 2))) * gEnv;   /* round 2: 0.36 wide — at 0.24 (14 degrees) a groove fell between two of sixteen vertices and vanished; round 3: 0.42 */
          return 1 + front + rear + lateral + broad + pit + vee + grooves;
        },
        zoneAt: function (d, t) {
          var ad = Math.abs(d);
          /* R98: the front delt and the crest are the strongest platinum
             planes on the body; the rear delt keeps more of the crystal. */
          if (ad < 0.75) return { classes: REGIONS.DELT.classes, seed: 110, index: 3, coat: 0.90 };
          if (ad < 1.95) return { classes: REGIONS.DELT.classes, seed: 111 + (d > 0 ? 1 : 0), index: 2, coat: 1.0 };
          return { classes: REGIONS.DELT.classes, seed: 113, index: 1, coat: 0.45 };
        },
        /* R98: the coat ramps in with the value — a cap that is platinum at
           the seam and sapphire chest under it is bolted on; it starts where
           the deltoid emerges from the chest and is full by the joint. */
        coatAt: function (t) {
          var k = Math.min(1, t / 0.55);
          return REGIONS.DELT.coat * (0.35 + 0.65 * k * k * (3 - 2 * k));
        },
        /* R91 — THE VALUE STEP AT THE SEAM IS WHAT READS AS "BOLTED ON".

           The deltoid carried one lift (0.40) and the torso another (0.14), so
           there was a hard jump in optical class exactly where the two solids
           meet. Geometry alone could not fix that: the shapes already
           interpenetrate correctly, and the eye still read two objects, because
           a step in VALUE at a boundary is what an object boundary looks like.

           The cap now starts at the torso's own weighting where it is buried in
           the chest and arrives at the arm's by the time it reaches the joint,
           so the transition happens across the form rather than at the seam.
           Two more steps along its length so the ramp has rings to land on. */
        hero: function (t) {
          var k = Math.min(1, t / 0.62);
          return TORSO_.classLift + (ARMS_.deltoidLift - TORSO_.classLift) * k * k * (3 - 2 * k);
        } }
    );
    /* minorAngle up from 30 to 44: the secondary tier was outlining the cap's
       own ring seams, which draws a boundary at exactly the place the value ramp
       above exists to dissolve. */
    var parts = lit(group, geo, materials, { rim: false, quiet: true, edgeAngle: 58, minorAngle: 80 });
    parts.mesh.name = side < 0 ? 'deltoid-right' : 'deltoid-left';
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
    /* The line has to lie ON the deltoid's top surface, which means following
       the same profile the loft used. The first attempt put its two endpoints a
       fixed distance above the axis and the whole line disappeared INSIDE the
       tube — the deltoid is 0.31 units thick at the shoulder and the offset was
       0.055, so it was buried by a factor of five. Sampled as a short polyline
       along the top instead, with the profile applied exactly as `segment` does,
       so it rides the swell rather than cutting through it. */
    /* R99 — THE RIDGE LINE IS GONE. It was authored when the cap's own
       planes could not carry the shoulder; they can now (the platinum coat
       lights the crest as a PLANE, which is what the godform reference
       shows), and the godform brief rules out light that defines anatomy as
       a stroke. Kept as a switch for the record. */
    if (ARMS_.deltoidRidge) {
      var ridgePts = [];
      var STEPS = 6;
      for (var ri = 0; ri <= STEPS; ri++) {
        var rt = ri / STEPS;
        var rr = (deltoidR0 + (deltoidR1 - deltoidR0) * rt) * deltoidProfile(rt);
        ridgePts.push(
          inner[0] + (outer[0] - inner[0]) * rt,
          inner[1] + (outer[1] - inner[1]) * rt + rr * 0.90,
          inner[2] + (outer[2] - inner[2]) * rt + rr * 0.16
        );
      }
      var ridgeSeg = [];
      for (var rj = 0; rj < STEPS; rj++) {
        ridgeSeg.push(
          ridgePts[rj * 3], ridgePts[rj * 3 + 1], ridgePts[rj * 3 + 2],
          ridgePts[rj * 3 + 3], ridgePts[rj * 3 + 4], ridgePts[rj * 3 + 5]
        );
      }
      var ridge = new BufferGeometry();
      ridge.setAttribute('position', new Float32BufferAttribute(ridgeSeg, 3));
      group.add(new LineSegments(ridge, materials.edgeHero));
      owned.push(ridge);
    }
  });

  /* ---- no neck -------------------------------------------------------- */
  /* THERE IS DELIBERATELY NO NECK GEOMETRY.

     There used to be a tenon here — a narrow internal connector buried in the
     chest at one end and inside the head at the other — to make the two solids
     read as one when a gap stood between them. With the head enlarged and
     seated lower, and the chest crown shortened so its top ring is exactly the
     head's own cross-section at that height, the two now meet flush. The tenon
     had become the only thing visible in the junction: a pale rectangular stub
     under the chin, which is precisely what it had been built to prevent.

     One fewer part, a cleaner throat, and the big-shape rule honoured — head
     mass meets chest mass directly, with nothing between them to explain. */

  /* ---- chest insignia ------------------------------------------------- */
  /* Emissive, sitting slightly proud of the chest ridge so it is never
     swallowed by the prow. */
  function chestZ(y) {
    /* interpolate the torso's front depth at height y */
    var r = TORSO_.rings;
    for (var i = 0; i < r.length - 1; i++) {
      if (y >= r[i].y && y <= r[i + 1].y) {
        var t = (y - r[i].y) / (r[i + 1].y - r[i].y || 1);
        return r[i].d + (r[i + 1].d - r[i].d) * t;
      }
    }
    return r[r.length - 1].d;
  }

  /* THE THROAT GEM — a junction marked deliberately rather than left bare.

     The head comes to a point at its lower vertex and the neck converges to
     meet it, which is the only way two solids of these shapes can join without
     one standing through the other (see the neck rings in proportions.js). A
     point-to-point junction is geometrically clean and visually weak — the eye
     reads a pinch and wonders what it is. Reference A puts a small bright
     diamond exactly there, and it works for the reason accents at junctions
     always work: a deliberate mark reads as design, a bare seam reads as a
     mistake. */
  var throatGeo = diamondPlate(INSIGNIA_.throatHalf, 0.008);
  var throat = new Mesh(throatGeo, materials.emissive);
  throat.position.set(0, INSIGNIA_.throatY, chestZ(INSIGNIA_.throatY) + 0.010);
  throat.name = 'throat-gem';
  group.add(throat);
  var throatGlow = new Mesh(diamondPlate(INSIGNIA_.throatHalf * 2.1, 0.004), materials.emissiveSoft);
  throatGlow.position.copy(throat.position);
  group.add(throatGlow);
  owned.push(throatGeo, throatGlow.geometry);

  var emblemGeo = diamondPlate(INSIGNIA_.emblemHalf, 0.012);
  var emblem = new Mesh(emblemGeo, materials.emissive);
  emblem.position.set(0, INSIGNIA_.emblemY, chestZ(INSIGNIA_.emblemY) + 0.012);
  emblem.name = 'chest-emblem';
  group.add(emblem);
  /* R95: a white-hot core inside the emblem, as every reference draws it — a
     small brighter diamond at the centre of the cyan one, so the emblem reads
     as a light source with a graded edge rather than one flat two-tone plate. */
  var emblemCoreGeo = diamondPlate(INSIGNIA_.emblemHalf * 0.42, 0.004);
  var emblemCore = new Mesh(emblemCoreGeo, materials.emissiveCore || materials.emissive);
  emblemCore.position.copy(emblem.position);
  emblemCore.position.z += 0.014;
  group.add(emblemCore);
  owned.push(emblemCoreGeo);
  var emblemGlow = new Mesh(diamondPlate(INSIGNIA_.emblemHalf * 1.9, 0.004), materials.emissiveSoft);
  emblemGlow.position.copy(emblem.position);
  group.add(emblemGlow);
  owned.push(emblemGeo, emblemGlow.geometry);

  /* Transport symbols: a left triangle, a centre diamond, a right triangle,
     matching the row beneath the emblem in the reference. */
  var symbols = new Group();
  symbols.name = 'transport-symbols';
  var sy = INSIGNIA_.symbolsY;
  var sz = chestZ(sy) + 0.012;
  var sh = INSIGNIA_.symbolHalf;

  /* R95 — THREE OUTLINED RIGHT-POINTING TRIANGLES. Every reference in the
     luminous and guardian sets draws the row under the emblem as ▷ ▷ ▷ —
     three hollow triangles all pointing the same way — not the ◀ ◆ ▶ this
     carried. Outlined by drawing each glow triangle with a smaller near-black
     triangle a hair in front of it. */
  function triangle(dir, scale, z) {
    var P = [];
    function p(x, y, zz) { P.push(x, y, zz); return P.length / 3 - 1; }
    var s = sh * (scale || 1);
    var t = [p(dir * s, 0, z), p(-dir * s * 0.75, s * 0.9, z), p(-dir * s * 0.75, -s * 0.9, z)];
    return facetedGeometry(P, dir > 0 ? [[t[0], t[1], t[2]]] : [[t[0], t[2], t[1]]]);
  }

  for (var si = 0; si < 3; si++) {
    var outer = triangle(1, 1.0, 0.006);
    var inner = triangle(1, 0.58, 0.009);
    var mo = new Mesh(outer, materials.emissive);
    var mi = new Mesh(inner, materials.face);
    mo.position.set((si - 1) * INSIGNIA_.symbolSpacing, sy, sz);
    mi.position.copy(mo.position);
    mi.position.x += sh * 0.05;
    symbols.add(mo);
    symbols.add(mi);
    owned.push(outer, inner);
  }
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
