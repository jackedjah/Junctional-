/* MAHWORLD R6 :: MAH RAIN and THE CRYSTAL SEA
   ================================================================================================

   The direction, verbatim:

       "Using the dome at the top, take the perimeter circle area of the dome and create glass shards
        of very long pieces of rain falling down towards the floor, but keep it in that circle shape
        and let it go even wider. And then once it hits around the regular ground floor, that's going
        to create huge bodies of crystallized and extremely crystal shard looking like water, which
        will be extremely flowy, extremely malleable, but completely crystal, and very interesting to
        interact with... but it's supposed to be able to abide by all the swim functions when our
        characters start actually doing activities and competing with each other."

   and the standing note that governs everything from here:

       "graphics should be looking extremely realistic, no sharp edges, no overly premium areas
        premium. This only comes after supreme detail."

   ---- WHERE IT GOES, MEASURED BEFORE IT WAS WRITTEN ---------------------------------------------
   The curtain falls from the dome's perimeter, and whatever it lands in has to stand on something.
   So the annulus was raycast first — terrain height at 24 bearings, r 1800 out to 5400:

       r 1800   ground 24/24   mean  177.6      the far range
       r 2400   ground 24/24   mean   19.7      the land ring, falling away
       r 2600   ground 17/24   mean    5.3      the land's EDGE — already broken up
       r 2800   ground  1/24   mean   28.3
       r 3000+  ground  0/24   -                NOTHING. And nothing at 3434, 4200, 5400 either.

   terrain.js builds its land ring from 600 to 2600 and its far range at 1500. The halo's outer rim
   is at 3400 and the dome springs at 3434, so BOTH of them have been standing over void for two
   layers — which is the R4 carry-over note "the halo outruns the terrain", never closed.

   This closes it. The sea's inner shore is at 2520, INSIDE the land's broken edge at 2600, so the
   two overlap and there is a real coast rather than a seam; it runs out to 5600, well past the dome,
   so the horizon from the ring is water rather than an edge. The rain lands at 3400-4200, in open
   sea. One system answers the direction and the oldest open defect in the world at the same time.

   ---- ONE LEVEL, STILL (L42) --------------------------------------------------------------------
   The sea sits at y -1.4. That is terrain.js's BASIN.y, which lakecity.js also uses, and it is now
   the level of the largest body of water in the world as well. MAH HAVEN's reservoir at +0.30 is the
   documented exception: it is infrastructure held above grade, and its header says so.

   ---- WHY THE SHARDS HAVE NO POINTS -------------------------------------------------------------
   "Very long pieces" and "no sharp edges" are not in conflict; a needle is what you get when you
   forget the second one. Every shard is a lathe of eight sides whose radius follows
   sin(pi*t)^0.42 and is CLAMPED to 0.17 at both ends, so it swells through its middle and closes to
   a blunt rounded cap. There is no vertex where the surface comes to a point, at either end, at any
   length. It reads as a long lozenge of glass, which is what a 60 m raindrop of crystal would be.

   §06 forbids cones and needles for repeated ARCHITECTURAL elements and L58 derives their section
   from their height. Rain is not architecture — a shard 120 m long at L58's w = h/6 would be 20 m
   across, which is a pillar. The law the rain answers instead is the one behind L58: nothing may
   alias into a crawling hairline. The shards are prefiltered by size instead: the LOD drops the
   count and RAISES the minimum width with distance, so a shard is never thinner than about 1.4
   pixels at the range it is drawn at.

   ---- AND WHY THE SEA IS FACETED IN THE FRAGMENT SHADER -----------------------------------------
   "Extremely flowy, extremely malleable, but completely crystal" is a contradiction in a normal
   water shader, where flow means smooth. It is not a contradiction if the SURFACE moves smoothly and
   the SHADING is flat: four summed directional waves displace the mesh (vertically, and laterally,
   which is what makes the facets stretch and compress as the swell passes), and the normal is then
   taken from the screen-space derivative of the view position — cross(dFdx, dFdy) — which is the
   true facet normal of whatever triangle the fragment landed on. So the crystal plates are real
   geometry, they slide and tilt against each other as the swell moves through, and none of it is a
   texture. That is the whole trick, and it costs one varying that meshphysical already declares.

   ---- THE SWIM CONTRACT -------------------------------------------------------------------------
   R5 §13's rule applies here too: this pass lays groundwork, it does not invent the activity system.
   What it publishes is the SHAPE the swim functions will need, and publishes it as measurements
   rather than as a promise:

       seaAt(x, z)          -> { inside, surfaceY, bedY, depth } or null
       crystalSeaBed(x, z)  -> the bed height, as a roam surface function, so a walker in the
                               shallows stands on the bed instead of falling through the world
       ctx.swimVolumes      -> the assembly's registry, so roam.js can add a swim mode without this
                               file knowing anything about roam

   buildMahRain(ctx, opts) -> the standard module contract, plus seaAt/crystalSeaBed/navSites. */

import * as THREE from '../vendor/three/three.module.min.js';

const TAU = Math.PI * 2;
const gold = i => (i * 0.6180339887) % 1;
const frac = i => (i * 0.7548776662) % 1;

export const RAIN = Object.freeze({
  /* THE CURTAIN. Top radius and height are the dome's own perimeter and spring, quoted rather than
     re-derived — halo-dome.js owns them and this file must not be a second opinion about where the
     dome is. The assembly passes them in; these are the fallbacks. */
  TOP_R: 3434,
  TOP_Y: 1841.6,
  /* "let it go even wider": the curtain flares as it descends, so it lands at 4189 rather than
     falling in a cylinder. A cylinder of rain reads as a wall; a flare reads as weather. */
  FLARE: 1.22,
  BAND: 560,             /* radial thickness of the curtain at the top */
  GROUND_Y: -1.4,        /* the world's water level, terrain.js BASIN.y */

  /* COUNT AND SECTION, both raised after the first curtain measured as a near-vacuum. 3200 shards
     at 1.9 m of radius over an annulus 21.6 km round, 560 m deep and 1843 m tall is a fill fraction
     of 4.8e-4 — three rays fired across it in the law suite hit nothing at all, which is not a probe
     artefact, it is the curtain being 0.05% rain by volume.
     And the section was a needle by this project's own law: 210 m long at 3.8 m across is 55:1,
     where L58 records 23:1 as the ratio that aliases to a crawling hairline. Widened to 8.4 m at the
     longest, which is 25:1 — and it costs NOTHING, because the triangle count is per instance and a
     wider instance is the same instance. */
  COUNT: 5000,           /* one InstancedMesh, one draw call */
  LEN_MIN: 52, LEN_MAX: 210,
  RAD_MIN: 1.40, RAD_MAX: 4.20,
  SPEED_MIN: 0.030, SPEED_MAX: 0.062,   /* fraction of the fall span per second */
  SIDES: 8, RINGS: 9,

  /* the detail tiers. A curtain 1843 m tall seen from 8 km is a veil, not 3200 objects. */
  LOD_NEAR: 2600, LOD_MID: 7000, LOD_FAR: 26000
});

export const CLOUD = Object.freeze({
  /* THE MANTLE. "Clouds very present around that top dome area, but not inside of it."

     THE FIRST CUT WAS A HOOD, AND THE ARITHMETIC SAYS WHY RATHER THAN THE EYE. 1500 lobes at up to
     430 m across is 1500 * pi * 215^2 = 218 km^2 of cloud standing in front of a dome whose frontal
     silhouette is pi * 3434 * 2058 / 2 = 11 km^2. Twenty times over. The dome vanished, and the
     direction says the clouds go AROUND it — which means the dome has to still be there.

     AND IT READ AS RUBBLE, which is the second failure and the more instructive one. A cloud is an
     AGGREGATE: a few large masses with real sky between them, each built from many overlapping
     pieces that lose their individual silhouettes. A uniform scatter of a thousand separate blobs is
     a debris field however soft each blob is, and no amount of opacity work fixes it, because the
     defect is the DISTRIBUTION and not the shading.

     So the mantle is CLUSTERS now. 26 of them, sized so their discs cover about 45% of the dome's
     silhouette — present, and not a lid. Each is 14 lobes packed into a 500 m disc at low alpha, so
     the aggregate builds its density by overlap the way cloud actually does, and its edges are soft
     because they are the union of many soft edges rather than one hard one. */
  APEX_Y: 3900,
  /* 16 x 12, not 26 x 14. The clustered first cut still measured 122% of the dome's frontal
     silhouette — better than the 2000% of the scatter before it, and still a lid. 192 lobes at a
     mean radius of 109 m is 7.1 km^2 against the dome's 11 km^2: 65%, which is weather you can see
     the dome through. */
  /* CLUSTER GEOMETRY, SOLVED FROM THE ALPHA RATHER THAN CHOSEN.
     Halving the lobe deformation did not stop the clusters photographing as starbursts, because the
     deformation was never the cause. A single lobe at alpha 0.11 cannot produce a WHITE shape — so
     every white shape in the frame was accumulation, and that is arithmetic, not opinion.
     With 12 lobes of ~200 m radius packed into a 250 m disc, every lobe overlaps every other at the
     core: about 15 layers, 1 - 0.89^15 = 0.83 alpha. The core saturated and the "arms" were simply
     where fewer lobes happened to stack. A cloud with a blown-out core and ragged arms is a star.
     Solving for a core near 0.55 instead: 1 - (1-a)^n = 0.55 at a = 0.075 wants n = 7.6 layers, and
     n at the centre is about N * (r_lobe / R_cluster)^2 * 2. With N = 20 and R = 340 that gives a
     mean lobe radius near 170 — more lobes, smaller, spread wider, at two thirds the alpha. */
  MANTLE_CLUSTERS: 16,
  PER_CLUSTER: 20,
  CLUSTER_R: 340,        /* the disc a cluster's lobes are packed into */
  CLUSTER_FLAT: 0.42,    /* and it is FLATTER than it is wide: a cloud is a raft, not a ball */
  OFF_MIN: 110, OFF_MAX: 400,   /* how far off the dome's surface, along its normal */
  /* the mantle stops at 72% of the way up the meridian and its density falls as the 2.4 power of
     the climb, so the apex — where MAH CROWN's mast comes through — keeps its sky */
  APEX_CAP: 0.72, APEX_FALL: 2.4,

  /* THE DESCENT. "Elements of clouds that go back down to ground level, but as you go closer to the
     ground level, less clouds be appearance." A power curve on the height fraction: at 90% of the
     way up the odds are 0.81, at 10% they are 0.016, so the ground gets wisps and the sky gets
     weather without a single hand-placed exception. Clustered for the same reason as the mantle. */
  /* 40 x 8, STRATIFIED, with a floor. Two requirements pull against each other here: the clouds
     must come DOWN to ground level, and there must be FEWER of them as they do. With 22 clusters
     drawn from a 2.1 power the lowest one landed at 370 m — the curve is right and the tail is
     simply undersampled, which is a sampling failure wearing a distribution's clothes.
     40 strata put the lowest draw an order of magnitude lower, and the bottom 3 of those 40 are
     placed explicitly in the ground band. Three of forty is 7.5%: still "less", and now it exists. */
  VEIL_CLUSTERS: 40,
  VEIL_PER: 14,
  /* THE GROUND BAND SPANS 58 TO 480, NOT 58 TO 250, AND ITS CLUSTERS ARE SPREAD ACROSS IT.
     Bunched into the bottom 200 m they broke the very rule they exist to complete: the histogram
     came back 0-200m:24, 200-500:0, 500-900:32 — more cloud at the ground than just above it, which
     is the opposite of the direction. The stratified curve's own lowest draw lands at about 620 m,
     so this band has to reach up to meet it rather than huddle under it. Spread evenly, the three
     clusters land near 121, 269 and 417 m: one below 200 and two above, and the fall is monotonic
     from the ground all the way to the dome. */
  GROUND_CLUSTERS: 3, GROUND_LO: 58, GROUND_HI: 480,
  VEIL_R_IN: 2500, VEIL_R_OUT: 5300,
  VEIL_TOP: 2100, VEIL_POW: 2.1,

  /* SIZE. World clouds beside a 3434 m dome, so hundreds of metres across and FLATTENED — a cloud
     as tall as it is wide is a boulder. */
  LOBE_MIN: 80, LOBE_MAX: 300,
  FLAT_MIN: 0.20, FLAT_MAX: 0.40,
  /* TILT, and it is small. At +/-0.45 rad the flattened lobes met at crossing angles and their
     overlaps read as blades laid over each other; a cloud's parts lie broadly the same way up. */
  TILT: 0.22,
  /* the two layers counter-rotate, which is the whole parallax budget: two numbers, no per-frame
     CPU, and the sky stops reading as a fixed lattice the moment anything moves */
  SPIN_MANTLE: 0.0000160, SPIN_VEIL: -0.0000105,
  LOD_FAR: 30000
});

export const SEA = Object.freeze({
  LEVEL: -1.4,
  /* INSIDE terrain's broken land edge at 2600 AT EVERY BEARING, not on average. The first cut used
     2520 with harmonics of 165 and 78, so the shore ran out to 2763 — 163 m PAST the land — and at
     those bearings the coast was a gap of nothing rather than a coast. The amplitudes are now sized
     so R_IN + A1 + A2 = 2572, which clears 2600 everywhere. */
  R_IN: 2380,
  R_OUT: 5600,
  DEPTH_MAX: 46,
  /* TESSELLATION, SIZED FROM THE SWIMMER'S EYE RATHER THAN FROM THE SEA'S DIAMETER.
     At 320 x 54 the facets near the shore measure about 39 m radially by 49 m round, and from an
     eye 2.3 m above the water a single plate fills a third of the frame as one flat colour. Crystal
     needs several facets in view to read AS crystal; one facet reads as a wall.
     512 x 76 with the rings crowded harder toward the shore puts them near 20 m there, and the
     fragment ripple below supplies the detail under that — geometry for the plates, gradient for
     the surface of each plate. One draw either way. */
  SEG: 512, RINGS: 76, RING_POW: 1.70,
  /* the inner shore is NOT a circle. Two slow harmonics, so the coast has bays and headlands at the
     scale a coast has them, and the eye never finds the centre by following the shoreline. */
  SHORE_A1: 130, SHORE_N1: 3,
  SHORE_A2: 62, SHORE_N2: 7,
  /* the swell, in metres and in radians per metre. Four waves, deliberately non-harmonic periods so
     the pattern never visibly repeats: 885, 1224, 331 and 174 m. */
  WAVE: Object.freeze([
    { ax: 0.00710, az: 0.00430, amp: 3.4, spd: 0.55 },
    { ax: -0.00520, az: 0.00900, amp: 2.5, spd: 0.41 },
    { ax: 0.01800, az: -0.01100, amp: 1.15, spd: 0.83 },
    { ax: 0.03300, az: 0.02700, amp: 0.46, spd: 1.20 }
  ]),
  FACET: 0.86            /* how much of the normal comes from the true triangle rather than the mesh */
});

/* the inner shore radius at a bearing — the ONE definition, used by the mesh, the bed, the swim
   test and the law suite alike */
export function shoreR(theta) {
  return SEA.R_IN
    + SEA.SHORE_A1 * Math.sin(SEA.SHORE_N1 * theta + 0.7)
    + SEA.SHORE_A2 * Math.sin(SEA.SHORE_N2 * theta - 1.9);
}
/* the bed. A basin: it falls away from the shore, bottoms out across the middle of the annulus and
   lifts again at the outer edge, so the sea has a far bank rather than a cliff into nothing. */
export function seaBedY(x, z) {
  const r = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  const rIn = shoreR(th);
  if (r < rIn || r > SEA.R_OUT) return null;
  const u = (r - rIn) / (SEA.R_OUT - rIn);
  return SEA.LEVEL - SEA.DEPTH_MAX * Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
}
/* a roam surface: f(x, z) -> y or null. The BED, not the surface — you stand on the bottom in the
   shallows, and the swim system will lift you off it. */
export function crystalSeaBed(x, z) { return seaBedY(x, z); }
export function inCrystalSea(x, z) {
  const r = Math.hypot(x, z);
  return r <= SEA.R_OUT && r >= shoreR(Math.atan2(z, x));
}

/* ================================================================================================
   THE SHARD. Eight sides, nine rings, blunt at both ends. ~144 triangles.
   ================================================================================================ */
function shardGeometry(sides, rings) {
  const pos = [], nor = [];
  const prof = t => 0.17 + 0.83 * Math.pow(Math.sin(Math.PI * t), 0.42);
  const ring = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    ring.push({ y: (t - 0.5), r: prof(t) });
  }
  const V = (i, s) => {
    const a = (s / sides) * TAU;
    return [Math.cos(a) * ring[i].r, ring[i].y, Math.sin(a) * ring[i].r];
  };
  const push = (p, n) => { pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const tri = (a, b, c) => { const n = norm(cross(sub(b, a), sub(c, a))); push(a, n); push(b, n); push(c, n); };
  for (let i = 0; i < rings; i++) {
    for (let s = 0; s < sides; s++) {
      const a = V(i, s), b = V(i, s + 1), c = V(i + 1, s + 1), d = V(i + 1, s);
      tri(a, b, c); tri(a, c, d);
    }
  }
  /* THE TWO CAPS, AND THEY ARE FLAT DISCS. The first cut fanned them to a centre vertex lifted
     0.55 of the end radius beyond the last ring, and called that blunt — but a fan centre sitting ON
     THE AXIS is a point however shallow the cone around it, and the law suite measured exactly that:
     minimum end radius 0.000. A flat disc terminates the shard with a real face of radius 0.17
     instead, which is what a broken piece of glass actually ends in. */
  for (const [i, dir] of [[0, -1], [rings, 1]]) {
    const centre = [0, ring[i].y, 0];
    for (let s = 0; s < sides; s++) {
      const a = V(i, s), b = V(i, s + 1);
      if (dir < 0) tri(centre, b, a); else tri(centre, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  return g;
}

/* ================================================================================================
   THE CLOUD LOBE. A crystal cloud is not a sphere with a soft texture on it and it is not a
   billboard — both of those are how you get vapour, and the direction is explicit that these are
   "crystal like, not any clouds, very worldlike".

   So it is a subdivided icosahedron, deformed by three summed directional harmonics of its own
   surface direction, left NON-INDEXED so computeVertexNormals gives FLAT per-face normals. Eighty
   facets, every one catching the sky at its own angle: that is the whole crystal read, and it costs
   nothing at run time because the deformation happens once at build.

   And it has no sharp edges. An icosahedron's facets meet at obtuse angles everywhere, the
   deformation is bounded to +/-26% of the radius so it can never fold a face through another, and
   nothing is ever scaled to a point — the flattening is 0.30 at its most extreme, which is a
   lozenge, not a blade.
   ============================================================================================== */
function cloudLobeGeometry(detail) {
  const g = new THREE.IcosahedronGeometry(1, detail).toNonIndexed();
  const P = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i).normalize();
    const k = 1
      + 0.150 * Math.sin(v.x * 2.7 + v.y * 1.9)
      + 0.085 * Math.sin(v.y * 4.3 - v.z * 3.1 + 1.7)
      + 0.045 * Math.sin(v.z * 6.9 + v.x * 5.2 - 0.8);
    P.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals();     /* non-indexed -> per-face normals -> faceted crystal */
  return g;
}

export function buildMahRain(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'mah-rain';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };

  /* the dome tells this file where its perimeter is. A second opinion about the dome's radius is
     how two files come to disagree about one object (L42), so it is an INPUT. */
  const TOP_R = opts.topR != null ? opts.topR : RAIN.TOP_R;
  const TOP_Y = opts.topY != null ? opts.topY : RAIN.TOP_Y;
  const GROUND_Y = opts.groundY != null ? opts.groundY : RAIN.GROUND_Y;
  const SPAN = TOP_Y - GROUND_Y;

  const stats = {
    draws: 0, triangles: 0, shards: 0,
    curtain: { topR: TOP_R, topY: +TOP_Y.toFixed(1), groundY: GROUND_Y, span: +SPAN.toFixed(1),
      landR: +(TOP_R * RAIN.FLARE).toFixed(0), band: RAIN.BAND },
    sea: null, swim: null
  };

  /* ==============================================================================================
     0. THE CRYSTAL CLOUDS — the mantle around the dome, and the veils that come down
     ============================================================================================ */
  const APEX_Y = opts.apexY != null ? opts.apexY : CLOUD.APEX_Y;
  const DOME_H = APEX_Y - TOP_Y;
  /* the dome's own surface of revolution, quoted so this file cannot hold a second opinion about
     the shape it is not allowed to be inside of */
  const domeSurfaceY = r => {
    const t = Math.min(1, Math.max(0, r / TOP_R));
    return TOP_Y + DOME_H * Math.sqrt(Math.max(0, 1 - t * t));
  };
  /* INSIDE THE DOME is: within its footprint AND under its shell AND above the halo it covers.
     "Not inside of it" is the direction's one hard geometric constraint on this system, so it is a
     predicate with a name, used by the placement, published in stats and asserted by the tests —
     rather than a margin someone hopes is large enough. */
  const insideDome = (r, y) => r < TOP_R && y < domeSurfaceY(r) && y > TOP_Y - 30;

  /* DECLARED HERE, WITH THE OTHER STATE. These are live scene objects and a live uniform block,
     and they are NOT allowed in `stats`: stats is this module's PUBLISHED contract, the thing a
     harness serialises and a law suite reads, and a THREE.Group in it makes JSON.stringify throw on
     a circular parent/children reference. The first cut put them there for convenience and the very
     first capture run died on it before taking a single frame. A published number is data; a
     published object is a leak. */
  let cloudSpinA = null, cloudSpinB = null, cloudUniforms = null;
  let cloudViolations = 0;
  {
    const lobe = own(cloudLobeGeometry(1));
    const cloudMat = new THREE.MeshStandardMaterial({
      /* SOFT, not premium. The standing direction is explicit — "no overly premium areas premium,
         this only comes after supreme detail" — and a cloud at roughness 0.1 is a chrome balloon.
         0.62 is a diffuse crystal: it holds its facets because the GEOMETRY is faceted, not because
         the finish is a mirror, which is the difference between crystal and costume jewellery. */
      color: 0xc9dcf2, roughness: 0.62, metalness: 0.06,
      envMapIntensity: 0.85, transparent: true, opacity: 1.0,
      depthWrite: false, side: THREE.FrontSide
    });
    cloudMat.name = 'mah-cloud-crystal'; owned.materials.push(cloudMat);
    const cloudU = {
      /* x = the alpha a face-on fragment keeps, y = what the grazing rim adds. A cloud is dense at
         its turning edges and airy through its middle; a uniform alpha is a jellyfish. */
      /* LOW, on purpose. Density comes from OVERLAP inside a cluster, not from opacity — which is
         how cloud actually builds, and the reason the first cut read as rubble: a thousand separate
         blobs at alpha 0.30 are a thousand visible silhouettes. Fourteen at 0.11 are one cloud. */
      uCloudA: { value: new THREE.Vector2(0.075, 0.26) },
      uCloudGlow: { value: new THREE.Color(0x9fc4e8) },
      uCloudGlowI: { value: 0.08 }
    };
    cloudMat.userData.cloudUniforms = cloudU;
    cloudMat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, cloudU);
      sh.fragmentShader = 'uniform vec2 uCloudA;\nuniform vec3 uCloudGlow;\nuniform float uCloudGlowI;\n'
        + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
        float cNdv = abs( dot( normalize( vViewPosition ), normal ) );
        float cF = pow( 1.0 - cNdv, 2.0 );
        diffuseColor.a *= clamp( uCloudA.x + uCloudA.y * cF, 0.0, 1.0 );
        totalEmissiveRadiance += uCloudGlow * uCloudGlowI * ( 0.35 + 0.65 * cF );
      }`);
    };
    cloudMat.customProgramCacheKey = () => 'mahcloud';

    const _cm = new THREE.Matrix4(), _cp = new THREE.Vector3(), _cq = new THREE.Quaternion(),
      _ce = new THREE.Euler(), _cs = new THREE.Vector3();
    const lobeTris = lobe.attributes.position.count / 3;

    /* ---- THE MANTLE, AS CLUSTERS -----------------------------------------------------------
       The cluster CENTRE is parameterised on the dome's own meridian: r = R cos(phi),
       y = SPRING + H sin(phi), which is exactly the surface domeSurfaceY() describes. It is then
       pushed out along that surface's TRUE normal — for an ellipsoid of semi-axes (R, H) the
       outward normal is proportional to (x/R^2, y'/H^2), NOT to the radius, and a mantle laid on
       the radius sits at an angle to the shell it is supposed to hug. On a dome 3434 wide by 2058
       tall that is a visible error, not a subtlety.

       The lobes then scatter within a flattened disc AROUND that centre, which is what turns a
       debris field into a cloud. */
    const MANTLE_N = CLOUD.MANTLE_CLUSTERS * CLOUD.PER_CLUSTER;
    const mantle = new THREE.InstancedMesh(lobe, cloudMat, MANTLE_N);
    mantle.name = 'mah-cloud-mantle';
    mantle.frustumCulled = false; mantle.renderOrder = 5;
    let mi = 0;
    for (let c = 0; c < CLOUD.MANTLE_CLUSTERS; c++) {
      const a = gold(c * 5) * TAU;
      const phi = (Math.PI / 2) * CLOUD.APEX_CAP * Math.pow(frac(c * 7), CLOUD.APEX_FALL);
      const r0 = TOP_R * Math.cos(phi);
      const y0 = TOP_Y + DOME_H * Math.sin(phi);
      let nx = r0 / (TOP_R * TOP_R), ny = (y0 - TOP_Y) / (DOME_H * DOME_H);
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const off = CLOUD.OFF_MIN + (CLOUD.OFF_MAX - CLOUD.OFF_MIN) * gold(c * 11);
      let cr = r0 + nx * off, cy = y0 + ny * off;
      /* the hard rule, enforced rather than assumed: if this landed inside, walk it out along the
         same normal until it is not. It cannot loop — the normal points outward by construction. */
      let guard = 0;
      while (insideDome(cr, cy) && guard++ < 40) { cr += nx * 40; cy += ny * 40; }
      const cx = Math.cos(a) * cr, cz = Math.sin(a) * cr;
      /* the cluster's own tangential axis, so its raft lies ALONG the dome rather than across it */
      const tx = -Math.sin(a), tz = Math.cos(a);
      for (let k = 0; k < CLOUD.PER_CLUSTER; k++) {
        const g1 = gold(c * 31 + k * 13), g2 = frac(c * 17 + k * 7), g3 = gold(c * 23 + k * 3);
        /* packed toward the middle (sqrt of a uniform is a uniform DISC), so the aggregate has a
           dense core and a ragged edge instead of a hard rim */
        const rad = CLOUD.CLUSTER_R * Math.sqrt(g2);
        const ang = g1 * TAU;
        const dx = Math.cos(ang) * rad, dt = Math.sin(ang) * rad;
        const px = cx + tx * dx + nx * Math.cos(a) * 0;
        const pz = cz + tz * dx;
        const py = cy + dt * CLOUD.CLUSTER_FLAT;
        let fx = px + Math.cos(a) * (dt * 0.35), fz = pz + Math.sin(a) * (dt * 0.35);
        let fr = Math.hypot(fx, fz);
        /* THE CLUSTER CENTRE WAS WALKED OUT; ITS MEMBERS WERE ONLY COUNTED. 20 of 584 lobes ended up
           under the shell because the scatter that gives a cloud its shape can carry a lobe back
           inside after the centre has been cleared. Counting a violation is not enforcing a rule. */
        let lobeGuard = 0;
        while (insideDome(fr, py) && lobeGuard++ < 30) {
          fx += Math.cos(a) * 45; fz += Math.sin(a) * 45; fr = Math.hypot(fx, fz);
        }
        if (insideDome(fr, py)) cloudViolations++;
        const sc = CLOUD.LOBE_MIN + (CLOUD.LOBE_MAX - CLOUD.LOBE_MIN) * Math.pow(g3, 1.4);
        const flat = CLOUD.FLAT_MIN + (CLOUD.FLAT_MAX - CLOUD.FLAT_MIN) * frac(c * 29 + k * 11);
        _cp.set(fx, py, fz);
        _ce.set((gold(c * 19 + k) - 0.5) * CLOUD.TILT, gold(c * 23 + k * 5) * TAU,
          (gold(c * 29 + k * 7) - 0.5) * CLOUD.TILT);
        _cq.setFromEuler(_ce);
        _cs.set(sc, sc * flat, sc * (0.86 + 0.28 * frac(c * 31 + k * 3)));
        mantle.setMatrixAt(mi++, _cm.compose(_cp, _cq, _cs));
      }
    }
    mantle.instanceMatrix.needsUpdate = true;
    group.add(mantle);
    stats.draws++; stats.triangles += lobeTris * MANTLE_N;

    /* ---- THE DESCENT ---------------------------------------------------------------------------
       Cluster heights are drawn as TOP * u^(1/POW) from a uniform u, which puts the density where
       the direction asks for it: thick aloft, thinning all the way down, wisps at the sea. There is
       no floor exception and no hand-placed low cloud — the curve is the whole rule. */
    const VEIL_N = CLOUD.VEIL_CLUSTERS * CLOUD.VEIL_PER;
    const veil = new THREE.InstancedMesh(lobe, cloudMat, VEIL_N);
    veil.name = 'mah-cloud-veil';
    veil.frustumCulled = false; veil.renderOrder = 5;
    let vi = 0;
    for (let c = 0; c < CLOUD.VEIL_CLUSTERS; c++) {
      const a = gold(c * 3 + 1) * TAU;
      /* STRATIFIED, not sampled. One stratum per cluster with a deterministic jitter inside it, so
         the whole 0..1 range is covered and the thin tail of the power curve is actually populated
         instead of being left to chance with forty draws. */
      const u = (c + 0.15 + 0.7 * frac(c * 5 + 2)) / CLOUD.VEIL_CLUSTERS;
      /* and the lowest few are placed IN the ground band by name. The power curve is the rule for
         how density falls; this is the direction's explicit floor — clouds that come all the way
         down — and three of forty keeps it rare. */
      const cy = (c < CLOUD.GROUND_CLUSTERS)
        /* SPREAD, not scattered. Three clusters drawn at random from a 420 m band can all land in
           its bottom third, and with three samples that is not unlikely — it is what happened. */
        ? CLOUD.GROUND_LO + (CLOUD.GROUND_HI - CLOUD.GROUND_LO) * ((c + 0.5) / CLOUD.GROUND_CLUSTERS)
        : Math.max(46, CLOUD.VEIL_TOP * Math.pow(u, 1 / CLOUD.VEIL_POW));
      /* THE VEIL'S INNER RADIUS DEPENDS ON ITS HEIGHT, and it has to. VEIL_R_IN is 2500 and the
         dome's footprint reaches 3434, so any veil cluster drawn inside that radius ABOVE the
         spring height is in the dome's interior volume by definition — which is where the last 27
         violations came from, and no amount of walking individual lobes out fixes a rule that the
         cluster centres break by construction.
         Above the spring you must be outside the footprint; below it the space is open sky under
         the halo, and cloud may drift as far in as it likes. */
      const rMin = (cy > TOP_Y - 60) ? (TOP_R + 70) : CLOUD.VEIL_R_IN;
      const cr = rMin + (CLOUD.VEIL_R_OUT - rMin) * gold(c * 7 + 3);
      const cx = Math.cos(a) * cr, cz = Math.sin(a) * cr;
      const tx = -Math.sin(a), tz = Math.cos(a);
      /* the low ones are SMALLER as well as rarer. Fewer of the same clouds lower down is a
         ceiling; the direction asks for fewer, which means smaller too. */
      const near = Math.min(1, cy / CLOUD.VEIL_TOP);
      const shrink = 0.30 + 0.70 * near;
      for (let k = 0; k < CLOUD.VEIL_PER; k++) {
        const g1 = gold(c * 37 + k * 11), g2 = frac(c * 19 + k * 5), g3 = gold(c * 13 + k * 17);
        const rad = CLOUD.CLUSTER_R * 0.85 * Math.sqrt(g2) * shrink;
        const ang = g1 * TAU;
        const px = cx + tx * Math.cos(ang) * rad + Math.cos(a) * Math.sin(ang) * rad * 0.55;
        const pz = cz + tz * Math.cos(ang) * rad + Math.sin(a) * Math.sin(ang) * rad * 0.55;
        const py = Math.max(30, cy + (g3 - 0.5) * CLOUD.CLUSTER_R * CLOUD.CLUSTER_FLAT);
        /* and the same walk-out the mantle uses, as a backstop: the scatter that gives a cluster
           its shape can still carry one lobe across the line its centre respects. */
        let vx = px, vz = pz, vr = Math.hypot(px, pz), vg = 0;
        while (insideDome(vr, py) && vg++ < 30) {
          vx += Math.cos(a) * 45; vz += Math.sin(a) * 45; vr = Math.hypot(vx, vz);
        }
        if (insideDome(vr, py)) cloudViolations++;
        const sc = (CLOUD.LOBE_MIN + (CLOUD.LOBE_MAX - CLOUD.LOBE_MIN) * Math.pow(frac(c * 11 + k * 7), 1.6)) * shrink;
        const flat = CLOUD.FLAT_MIN + (CLOUD.FLAT_MAX - CLOUD.FLAT_MIN) * gold(c * 41 + k * 3);
        _cp.set(vx, py, vz);
        _ce.set((gold(c * 17 + k * 9) - 0.5) * CLOUD.TILT, gold(c * 19 + k * 13) * TAU,
          (gold(c * 23 + k) - 0.5) * CLOUD.TILT);
        _cq.setFromEuler(_ce);
        _cs.set(sc, sc * flat, sc * (0.86 + 0.28 * frac(c * 29 + k * 5)));
        veil.setMatrixAt(vi++, _cm.compose(_cp, _cq, _cs));
      }
    }
    veil.instanceMatrix.needsUpdate = true;
    group.add(veil);
    stats.draws++; stats.triangles += lobeTris * VEIL_N;

    /* the two layers live on their own carriers so a single group rotation is the entire drift
       budget — no per-frame matrix work, and counter-rotation reads as depth */
    const spinA = new THREE.Group(); spinA.name = 'mah-cloud-spin-mantle';
    const spinB = new THREE.Group(); spinB.name = 'mah-cloud-spin-veil';
    group.remove(mantle); group.remove(veil);
    spinA.add(mantle); spinB.add(veil);
    group.add(spinA); group.add(spinB);

    /* HOW THE DENSITY ACTUALLY CAME OUT, read back off the INSTANCE MATRICES rather than
       recomputed from the curve that placed them. A histogram derived from the same expression as
       the placement proves the expression, not the world. */
    {
      const bands = [0, 200, 500, 900, 1400];
      const hist = new Array(bands.length).fill(0);
      const mm = new THREE.Matrix4();
      let lo = Infinity, hi = -Infinity;
      for (const im of [mantle, veil]) {
        for (let i2 = 0; i2 < im.count; i2++) {
          im.getMatrixAt(i2, mm);
          const y = mm.elements[13];
          if (y < lo) lo = y; if (y > hi) hi = y;
          for (let k = bands.length - 1; k >= 0; k--) if (y >= bands[k]) { hist[k]++; break; }
        }
      }
      stats.clouds = {
        mantleClusters: CLOUD.MANTLE_CLUSTERS, veilClusters: CLOUD.VEIL_CLUSTERS,
        lobes: MANTLE_N + VEIL_N, lobeTris,
        insideDome: cloudViolations,
        lowest: +lo.toFixed(0), highest: +hi.toFixed(0),
        bandsFromGround: bands.map((b, k) => b + 'm:' + hist[k]).join(' '),
        apexY: APEX_Y, domeR: TOP_R,
        /* the number the first cut got wrong by a factor of twenty: how much cloud stands in front
           of the dome, measured against the dome's own frontal silhouette. Over 100 is a lid. */
        coverPct: +(((MANTLE_N * Math.PI * Math.pow((CLOUD.LOBE_MIN + CLOUD.LOBE_MAX) / 4, 2))
          / (Math.PI * TOP_R * DOME_H / 2)) * 100).toFixed(0)
      };
    }
    cloudSpinA = spinA; cloudSpinB = spinB; cloudUniforms = cloudU;
  }

  /* ==============================================================================================
     1. THE CURTAIN
     ============================================================================================ */
  const shard = own(shardGeometry(RAIN.SIDES, RAIN.RINGS));
  const rainMat = new THREE.MeshStandardMaterial({
    color: 0xd7e8ff, roughness: 0.06, metalness: 0.0,
    envMapIntensity: 2.1, transparent: true, opacity: 1.0, depthWrite: false,
    side: THREE.FrontSide
  });
  rainMat.name = 'mah-rain-glass'; owned.materials.push(rainMat);
  const rainU = {
    /* x = the alpha a face-on fragment keeps, y = how much the grazing rim adds on top.
       Glass is CLEAR through its faces and BRIGHT at its turns; a uniform 0.4 opacity is a plastic
       rod, which is what every first cut of falling glass looks like. */
    uRainA: { value: new THREE.Vector2(0.055, 0.72) },
    uRainRim: { value: new THREE.Color(0xeaf4ff) },
    uRainGlow: { value: 0.30 }
  };
  rainMat.userData.rainUniforms = rainU;
  rainMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, rainU);
    sh.fragmentShader = 'uniform vec2 uRainA;\nuniform vec3 uRainRim;\nuniform float uRainGlow;\n'
      + sh.fragmentShader
        /* AFTER the normal chunks, because a Fresnel term needs a normal, and diffuseColor is still
           in scope here — it is declared at the top of main and consumed at opaque_fragment. */
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
        float rainNdv = abs( dot( normalize( vViewPosition ), normal ) );
        float rainF = pow( 1.0 - rainNdv, 3.0 );
        diffuseColor.a *= clamp( uRainA.x + uRainA.y * rainF, 0.0, 1.0 );
        totalEmissiveRadiance += uRainRim * rainF * uRainGlow;
      }`);
  };
  rainMat.customProgramCacheKey = () => 'rain';

  const curtain = new THREE.InstancedMesh(shard, rainMat, RAIN.COUNT);
  curtain.name = 'mah-rain-curtain';
  curtain.frustumCulled = false;
  curtain.renderOrder = 6;          /* transparent, and it must come after the solid world */
  group.add(curtain);
  stats.draws++;
  stats.triangles += (shard.attributes.position.count / 3) * RAIN.COUNT;
  stats.shards = RAIN.COUNT;

  /* THE INSTANCE STATE. Each shard is a bearing, a radius band position, a length, a width, a fall
     phase and a fall speed. The phase is what makes the curtain continuous: a shard that reaches the
     sea reappears at the dome, and because every phase is a different irrational fraction the
     curtain never pulses. */
  const S = [];
  for (let i = 0; i < RAIN.COUNT; i++) {
    const a = gold(i * 7) * TAU;
    const bandU = frac(i * 3);
    const len = RAIN.LEN_MIN + (RAIN.LEN_MAX - RAIN.LEN_MIN) * Math.pow(frac(i * 11), 1.7);
    S.push({
      a,
      bandU,
      len,
      rad: RAIN.RAD_MIN + (RAIN.RAD_MAX - RAIN.RAD_MIN) * gold(i * 13),
      phase: gold(i * 17),
      speed: RAIN.SPEED_MIN + (RAIN.SPEED_MAX - RAIN.SPEED_MIN) * frac(i * 19),
      /* a slow tangential drift, so the curtain rotates a little and never reads as a fixed lattice */
      drift: (gold(i * 23) - 0.5) * 0.00028
    });
  }

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3();
  let widthGain = 1, visibleCount = RAIN.COUNT;

  /* THE MOTION IS ON THE CPU, AND THAT IS THE CORRECT CHOICE HERE, NOT A COMPROMISE.
     A vertex-shader fall would have to displace AFTER instanceMatrix is applied, and in r185 that
     happens inside project_vertex — so the world position that worldpos_vertex hands to fog and to
     the environment would still be the undisplaced one, and a curtain 1843 m tall would be fogged
     for where it is not. Composing 3200 matrices is about 120k float operations a frame, which is
     nothing, and every downstream chunk then sees the truth. */
  function place(t) {
    for (let i = 0; i < visibleCount; i++) {
      const s = S[i];
      const fall = (s.phase + t * s.speed) % 1;
      const y = TOP_Y - fall * SPAN;
      /* the flare: the radius grows as the shard descends, so the curtain opens outward */
      const k = 1 + (RAIN.FLARE - 1) * fall;
      const r = (TOP_R + (s.bandU - 0.5) * RAIN.BAND) * k;
      const a = s.a + t * s.drift * TAU;
      _p.set(Math.cos(a) * r, y, Math.sin(a) * r);
      /* the shard leans the way it is travelling — outward, by the flare's own slope. This is the
         detail that stops the curtain reading as a bead curtain hanging straight down. */
      const lean = Math.atan2((RAIN.FLARE - 1) * TOP_R, SPAN);
      _e.set(0, -a, -lean);
      _q.setFromEuler(_e);
      _s.set(s.rad * widthGain, s.len, s.rad * widthGain);
      curtain.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    for (let i = visibleCount; i < RAIN.COUNT; i++) {
      _s.set(0, 0, 0);
      curtain.setMatrixAt(i, _m.compose(_p.set(0, TOP_Y, 0), _q.identity(), _s));
    }
    curtain.instanceMatrix.needsUpdate = true;
  }

  /* ==============================================================================================
     2. THE CRYSTAL SEA
     ============================================================================================ */
  {
    /* the mesh: an annulus whose inner edge follows shoreR() exactly, built directly rather than by
       deforming a RingGeometry, because a ring's inner edge is a circle and this one is not. */
    const SEG = SEA.SEG, RINGS = SEA.RINGS;
    const tri = [];
    const P = (si, ri) => {
      const th = (si / SEG) * TAU;
      const rIn = shoreR(th);
      /* the rings are packed toward the shore — that is where a swimmer is, and where the facets
         need to be small enough to read as plates rather than as continents */
      const u = Math.pow(ri / RINGS, SEA.RING_POW);
      const r = rIn + (SEA.R_OUT - rIn) * u;
      return [Math.cos(th) * r, SEA.LEVEL, Math.sin(th) * r];
    };
    for (let si = 0; si < SEG; si++) {
      for (let ri = 0; ri < RINGS; ri++) {
        const a = P(si, ri), b = P(si + 1, ri), c = P(si + 1, ri + 1), d = P(si, ri + 1);
        tri.push(a, b, c, a, c, d);
      }
    }
    const pos = new Float32Array(tri.length * 3), nor = new Float32Array(tri.length * 3);
    for (let i = 0; i < tri.length; i++) {
      pos[i * 3] = tri[i][0]; pos[i * 3 + 1] = tri[i][1]; pos[i * 3 + 2] = tri[i][2];
      nor[i * 3] = 0; nor[i * 3 + 1] = 1; nor[i * 3 + 2] = 0;
    }
    const g = own(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, SEA.LEVEL, 0), SEA.R_OUT * 1.05);

    /* DARKER, AND LESS OF THE ENVIRONMENT. The first render came back pale violet: at grazing
       incidence a 0.30-metalness surface at envMapIntensity 1.55 returns most of the sky, and most
       of this sky at night is a lit horizon band. §07's rule for water in this world is that it
       reads near-black and takes its value from what it returns, not from its own colour — so the
       albedo drops and the environment term comes down with it. */
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x0d151f, roughness: 0.15, metalness: 0.26,
      envMapIntensity: 1.00, transparent: true, opacity: 0.95
    });
    seaMat.name = 'mah-crystal-sea'; owned.materials.push(seaMat);

    const W = SEA.WAVE;
    const seaU = {
      uSeaT: { value: 0 },
      uSeaFacet: { value: SEA.FACET },
      /* the swell, packed as four (ax, az, amp, spd) rows */
      uSeaW0: { value: new THREE.Vector4(W[0].ax, W[0].az, W[0].amp, W[0].spd) },
      uSeaW1: { value: new THREE.Vector4(W[1].ax, W[1].az, W[1].amp, W[1].spd) },
      uSeaW2: { value: new THREE.Vector4(W[2].ax, W[2].az, W[2].amp, W[2].spd) },
      uSeaW3: { value: new THREE.Vector4(W[3].ax, W[3].az, W[3].amp, W[3].spd) },
      /* x = inner shore mean, y = outer radius: the envelope that flattens the swell where it meets
         the land, because a 7 m swell running into a coastline cuts through it */
      uSeaEnv: { value: new THREE.Vector2(SEA.R_IN, SEA.R_OUT) },
      /* the shore's own harmonics, so the vertex shader can compute the LOCAL shore radius instead
         of the mean. Anchoring the swell's taper to the mean shore is what made the first 400 m of
         water glassy flat — see the note in the vertex injection. */
      uSeaShore: { value: new THREE.Vector4(SEA.SHORE_A1, SEA.SHORE_N1, SEA.SHORE_A2, SEA.SHORE_N2) },
      uSeaGlow: { value: new THREE.Color(0x2c4a63) },
      uSeaGlowI: { value: 0.06 },
      /* the micro-ripple: amplitude in radians of normal tilt, and its two wavelengths in metres */
      uSeaRipple: { value: new THREE.Vector3(0.085, 3.7, 13.1) }
    };
    seaMat.userData.seaUniforms = seaU;
    seaMat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, seaU);
      sh.vertexShader = [
        'uniform float uSeaT;',
        'uniform vec4 uSeaW0; uniform vec4 uSeaW1; uniform vec4 uSeaW2; uniform vec4 uSeaW3;',
        'uniform vec2 uSeaEnv; uniform vec4 uSeaShore;',
        'varying float vSeaH;',
        'varying vec3 vSeaW;',
        ''
      ].join('\n') + sh.vertexShader.replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        '{',
        '  vec2 sp = transformed.xz;',
        '  float sr = length( sp );',
        /* THE TAPER IS ANCHORED TO THE LOCAL SHORE, AND IT IS SHORT.
           The first cut anchored it to uSeaEnv.x — the MEAN shore radius — and ramped over 360 m.
           But the shore is not a circle: it swings 243 m either side of that mean, so at the bay
           where a swimmer actually enters the water, smoothstep(2480, 2840, 2497) evaluates to
           0.0065. The swell was at six tenths of one percent of amplitude across the entire
           near-shore zone, and the render showed exactly that: a sheet of flat navy glass with no
           facets, because a flat mesh has one facet normal.
           Now the local shore is computed from the same two harmonics shoreR() uses, and the ramp
           is 90 m — a surf zone, not a third of a kilometre of dead water. */
        '  float sth = atan( transformed.z, transformed.x );',
        '  float rIn = uSeaEnv.x + uSeaShore.x * sin( uSeaShore.y * sth + 0.7 )',
        '                        + uSeaShore.z * sin( uSeaShore.w * sth - 1.9 );',
        '  float env = smoothstep( rIn + 6.0, rIn + 96.0, sr )',
        '            * ( 1.0 - smoothstep( uSeaEnv.y - 900.0, uSeaEnv.y, sr ) );',
        '  float h = 0.0; vec2 lat = vec2( 0.0 );',
        /* four directional waves. The LATERAL term is what makes it malleable rather than merely
           bumpy: each wave drags the surface along its own direction as it passes, so the facets
           stretch on the back of a swell and crowd on its face, which is what crystal plates riding
           a moving surface would actually do. */
        '  vec4 w;',
        '  w = uSeaW0; { vec2 d = vec2( w.x, w.y ); float ph = dot( sp, d ) + uSeaT * w.w;',
        '    h += sin( ph ) * w.z; lat += normalize( d ) * cos( ph ) * w.z * 0.85; }',
        '  w = uSeaW1; { vec2 d = vec2( w.x, w.y ); float ph = dot( sp, d ) + uSeaT * w.w;',
        '    h += sin( ph ) * w.z; lat += normalize( d ) * cos( ph ) * w.z * 0.85; }',
        '  w = uSeaW2; { vec2 d = vec2( w.x, w.y ); float ph = dot( sp, d ) + uSeaT * w.w;',
        '    h += sin( ph ) * w.z; lat += normalize( d ) * cos( ph ) * w.z * 0.85; }',
        '  w = uSeaW3; { vec2 d = vec2( w.x, w.y ); float ph = dot( sp, d ) + uSeaT * w.w;',
        '    h += sin( ph ) * w.z; lat += normalize( d ) * cos( ph ) * w.z * 0.85; }',
        '  transformed.y += h * env;',
        '  transformed.xz += lat * env;',
        '  vSeaH = h * env;',
        '  vSeaW = transformed;',
        '}'
      ].join('\n'));
      sh.fragmentShader = [
        'uniform float uSeaFacet; uniform vec3 uSeaGlow; uniform float uSeaGlowI;',
        'uniform vec3 uSeaRipple; uniform float uSeaT;',
        'uniform vec2 uSeaEnv;',
        'varying float vSeaH;',
        'varying vec3 vSeaW;',
        ''
      ].join('\n') + sh.fragmentShader.replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        '{',
        /* THE FACET. vViewPosition is meshphysical's own varying (it is -mvPosition.xyz), so the
           cross product of its screen derivatives is the true plane of the triangle this fragment
           landed on, in view space — the same space `normal` is already in. No extra varying, no
           flat qualifier, no second geometry. */
        /* AND IT MUST NOT END AT A LINE. The first render showed the sea as a dark disc with a
           hard circular edge at R_OUT — correct geometry, and a horizon nobody would build. The
           alpha falls to nothing over the last 1100 m so the water dissolves into the sky instead
           of being cut out of it. */
        '  {',
        '    float sr2 = length( vSeaW.xz );',
        '    diffuseColor.a *= 1.0 - smoothstep( uSeaEnv.y - 1100.0, uSeaEnv.y - 40.0, sr2 );',
        '  }',
        '  vec3 sfx = dFdx( vViewPosition );',
        '  vec3 sfy = dFdy( vViewPosition );',
        '  vec3 sfn = normalize( cross( sfx, sfy ) );',
        '  if ( sfn.z < 0.0 ) sfn = -sfn;',
        '  normal = normalize( mix( normal, sfn, uSeaFacet ) );',
        /* AND THE SURFACE OF EACH PLATE. A 20 m facet is still enormous under a swimmer's chin, and
           no tessellation this world can afford reaches centimetres across three kilometres. So the
           plate is geometry and its SURFACE is a gradient: two octaves at 3.7 m and 13.1 m tilting
           the normal by up to 0.085 rad. It is deliberately an order of magnitude finer than the
           swell, so it reads as the texture ON the crystal rather than as more swell. */
        '  {',
        '    vec2 rp = vSeaW.xz;',
        '    float k1 = 6.2831853 / uSeaRipple.y, k2 = 6.2831853 / uSeaRipple.z;',
        '    float dx = sin( rp.x * k1 + uSeaT * 1.7 ) * cos( rp.y * k1 * 0.83 - uSeaT * 1.1 )',
        '             + 0.55 * sin( rp.x * k2 - uSeaT * 0.7 );',
        '    float dz = cos( rp.x * k1 * 0.91 - uSeaT * 1.3 ) * sin( rp.y * k1 + uSeaT * 1.9 )',
        '             + 0.55 * sin( rp.y * k2 + uSeaT * 0.6 );',
        '    vec3 rt = normalize( cross( vec3( 0.0, 0.0, 1.0 ), normal ) );',
        '    vec3 rb = cross( normal, rt );',
        '    normal = normalize( normal + ( rt * dx + rb * dz ) * uSeaRipple.x );',
        '  }',
        /* the crests carry a little internal light, the troughs none — the depth cue that stops a
           dark reflective sea reading as a sheet of slate at night */
        '  totalEmissiveRadiance += uSeaGlow * uSeaGlowI * clamp( vSeaH * 0.22 + 0.35, 0.0, 1.0 );',
        '}'
      ].join('\n'));
    };
    seaMat.customProgramCacheKey = () => 'crystalsea';

    const sea = new THREE.Mesh(g, seaMat);
    sea.name = 'mah-crystal-sea';
    sea.frustumCulled = false;
    sea.renderOrder = 2;
    group.add(sea);
    stats.draws++;
    stats.triangles += pos.length / 9;

    /* WHICH WAY IS UP. The same assertion mah-haven.js now carries, for the same reason: an
       authored normal that contradicts its winding does not make a surface look wrong, it makes it
       not exist, and this sea is built by hand out of raw triangles exactly like that one was. */
    {
      const ax = pos[3] - pos[0], az = pos[5] - pos[2];
      const bx = pos[6] - pos[0], bz = pos[8] - pos[2];
      stats.seaFacesUp = (az * bx - ax * bz) > 0;
    }

    stats.sea = {
      level: SEA.LEVEL, rIn: SEA.R_IN, rOut: SEA.R_OUT, depthMax: SEA.DEPTH_MAX,
      shoreMin: +(SEA.R_IN - SEA.SHORE_A1 - SEA.SHORE_A2).toFixed(0),
      shoreMax: +(SEA.R_IN + SEA.SHORE_A1 + SEA.SHORE_A2).toFixed(0),
      facets: pos.length / 9,
      swellM: +W.reduce((a, c) => a + c.amp, 0).toFixed(2)
    };

    /* ---- THE SWIM REGISTRY. The assembly owns roam; this file owns the water. ----------------- */
    const volume = {
      id: 'mah-crystal-sea',
      label: 'THE CRYSTAL SEA',
      surfaceY: () => SEA.LEVEL,
      contains: (x, z) => inCrystalSea(x, z),
      bedY: (x, z) => seaBedY(x, z),
      depthAt: (x, z) => { const b = seaBedY(x, z); return b == null ? 0 : SEA.LEVEL - b; }
    };
    if (ctx && Array.isArray(ctx.swimVolumes)) ctx.swimVolumes.push(volume);
    else if (ctx) ctx.swimVolumes = [volume];
    stats.swim = { volumes: 1, surfaceY: SEA.LEVEL, maxDepth: SEA.DEPTH_MAX };
  }

  /* ---- the module contract --------------------------------------------------------------------- */
  let T = 0;
  place(0);

  return {
    group, stats, RAIN, SEA,
    seaAt(x, z) {
      if (!inCrystalSea(x, z)) return null;
      const bed = seaBedY(x, z);
      return { inside: true, surfaceY: SEA.LEVEL, bedY: bed, depth: SEA.LEVEL - bed };
    },
    crystalSeaBed,
    update(dt) {
      T += (dt || 0);
      place(T);
      const u = seaMatUniforms(); if (u) u.uSeaT.value = T;
      /* the entire cloud animation: two group rotations, counter-turning. 2400 lobes drift for the
         price of two quaternions a frame, which is why the drift is a carrier rotation and not a
         per-instance recompose like the rain's — the rain has to fall in a straight line and clouds
         only have to move. */
      if (cloudSpinA) {
        cloudSpinA.rotation.y = T * CLOUD.SPIN_MANTLE * TAU * 60;
        cloudSpinB.rotation.y = T * CLOUD.SPIN_VEIL * TAU * 60;
      }
    },
    setTime(s) {
      /* R5 §17's note applied to weather: the rain is LIT at day and GLOWS at night, and it must
         never do both. A curtain that emits at noon is a light show; one that only reflects at
         midnight disappears. */
      const day = (s && s.daylight != null) ? s.daylight : 0;
      rainU.uRainGlow.value = 0.14 + 0.38 * (1 - day);
      rainU.uRainA.value.set(0.040 + 0.030 * day, 0.62 + 0.18 * (1 - day));
      const u = seaMatUniforms();
      if (u) u.uSeaGlowI.value = 0.05 + 0.16 * (1 - day);
      /* the clouds DENSIFY at night and open at noon, which is the honest way round: a lit cloud is
         read by its shading and needs to stay airy, and an unlit one is read by its silhouette and
         disappears unless it closes up. */
      const c = cloudUniforms;
      if (c) {
        c.uCloudA.value.set(0.062 + 0.048 * (1 - day), 0.22 + 0.10 * day);
        c.uCloudGlowI.value = 0.04 + 0.13 * (1 - day);
      }
    },
    setTheme(t) {
      if (t && t.energyLight) {
        rainU.uRainRim.value.setHex(t.energyLight);
        if (cloudUniforms) cloudUniforms.uCloudGlow.value.setHex(t.energyLight);
      }
    },
    setDetail(dist) {
      /* the count falls and the SHARDS GET WIDER, which is the half of an LOD that is usually
         forgotten: dropping the count alone thins a veil until it is a scatter of hairlines, and a
         hairline is the one thing L58 exists to prevent. */
      let n = RAIN.COUNT, w = 1;
      if (dist > RAIN.LOD_FAR) { n = 0; w = 1; }
      else if (dist > RAIN.LOD_MID) { n = Math.round(RAIN.COUNT * 0.28); w = 2.6; }
      else if (dist > RAIN.LOD_NEAR) { n = Math.round(RAIN.COUNT * 0.58); w = 1.6; }
      if (n !== visibleCount || w !== widthGain) {
        visibleCount = n; widthGain = w;
        curtain.visible = n > 0;
        curtain.count = Math.max(1, n);
        place(T);
      }
      /* the clouds outlive the rain by a long way. A curtain at 26 km is a smear, but the cloud
         mantle IS the world's silhouette at that range — it is the thing that says there is weather
         around the dome — so it only stops at the far tier. */
      if (cloudSpinA) {
        const on = dist < CLOUD.LOD_FAR;
        cloudSpinA.visible = on;
        cloudSpinB.visible = on;
      }
      return { shards: visibleCount, widthGain, clouds: cloudSpinA ? cloudSpinA.visible : false };
    },
    setState() { },
    setQuality(q) {
      if (q === 'low') { curtain.count = Math.round(RAIN.COUNT * 0.35); visibleCount = curtain.count; }
      else { curtain.count = RAIN.COUNT; visibleCount = RAIN.COUNT; }
      place(T);
    },
    swimVolumes() { return (ctx && ctx.swimVolumes) ? ctx.swimVolumes.slice() : []; },
    navSites() {
      /* the coast, at the bearing where the shore reaches furthest in — you arrive where the land
         and the sea actually meet, not at a point on a circle */
      let best = 0, bestR = 1e9;
      for (let d = 0; d < 360; d += 5) {
        const th = d * Math.PI / 180, r = shoreR(th);
        if (r < bestR) { bestR = r; best = th; }
      }
      const x = Math.cos(best) * (bestR - 90), z = Math.sin(best) * (bestR - 90);
      const lx = Math.cos(best) * (bestR + 1400), lz = Math.sin(best) * (bestR + 1400);
      return [{ id: 'crystal-sea', label: 'THE CRYSTAL SEA', sub: 'where the rain lands',
        x, z, y: SEA.LEVEL + 3.2, look: [lx, SEA.LEVEL + 40, lz] }];
    },
    dispose() {
      for (const g of owned.geometries) { try { g.dispose(); } catch (e) { } }
      for (const m of owned.materials) { try { m.dispose(); } catch (e) { } }
      for (const t of owned.textures) { try { t.dispose(); } catch (e) { } }
      if (group.parent) group.parent.remove(group);
    }
  };

  /* declared as a function so both update() and setTime() reach the sea's uniforms without either of
     them closing over a `const` that is defined inside the block above — the temporal-dead-zone
     failure this project has now paid for twice */
  function seaMatUniforms() {
    const m = owned.materials.find(x => x.name === 'mah-crystal-sea');
    return m ? m.userData.seaUniforms : null;
  }
}

export default { buildMahRain, RAIN, SEA, shoreR, seaBedY, crystalSeaBed, inCrystalSea };
