/* MAHPLAZA :: FOREGROUND DRESSING — the civic design of the floor.

   The plaza was a large empty surface. This resolves it COMPOSITIONALLY rather
   than by scattering objects (brief §17, §13): understandable routes from the
   MAHPLAZA marker to each destination and to the vehicle corridors, two
   gathering nodes, edges where the ground changes function, and a small number
   of well-placed fixtures — light masts, benches, bollards, rails, an info
   pylon, a corridor shelter.

   Everything is calm and dark: inlaid bands are a change of stone, not a glow;
   the only light is the luminaire heads and the soft pools they throw. Nothing
   is brighter than the destination signage, nothing blocks the three signs from
   the arrival cameras, and nothing above knee height stands inside the
   appearance-check area (|x| < 6, 10 < z < 24).

   Draw-call discipline: every static part is merged per material, masts /
   bollards / rail posts are instanced.

   v11 §06 — CRYSTALLINE SMOOTHNESS, swept over the furniture. "THE SILHOUETTE IS ROUND. THE SURFACE
   IS CRYSTALLINE." The finding worth recording first is a NEGATIVE one: this file's chamfers were
   already generous — 0.07 on a 0.46 m seat block, 0.14 on a 0.44 m planter, 0.06 on a 0.18 m shelter
   roof, each a third to two thirds of the half-dimension it cuts — so there was no global chamfer
   deficit and no blanket widening was done. Widening a chamfer that already eats half a form does not
   make it rounder, it makes it a frustum. FOUR SPECIFIC FORMS were wrong, and only those four moved:
     · the LAMP COWL met its top plate in ONE 133° arris and closed on a 1.09 m² flat disc. It is
       rim-chamfered and crowned now (facetCowl below): the sharpest arris drops to 85°.
     · the BOLLARD CAP was a square diamond over an axis-aligned post — four 9.6 cm horns per bollard.
       The post is turned to meet it.
     · the WAYFINDING BLADE stood on a 0.34 m plate a third of its own footprint, on a different
       bearing, its corners loose in the air. It is a base plate on the blade's own plan now.
     · the BENCH SEAT was extruded from a SELF-INTERSECTING section — a corner radius larger than the
       seat was thick. Corrected at the call site; the note there traces the outline.
   The square-diamond luminaire head keeps its points: it is the brand figure, §06's one exemption. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, softMass, canvasTexture, blobTexture, BRAND } from './materials.js';
import { SITES } from './buildings.js';

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
function part(list, geo, x, y, z, ry = 0, rx = 0, rz = 0) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _m4.compose(_p, _q, _s);
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(_m4); list.push(g); return list;
}
/* A FACETED COWL — v11 §06. `rings` is [radius, y] bottom to top; the piece is closed with a flat
   octagon at the last ring and a flat one at the first, and every band between them is a designed
   facet. This exists because the lamp shade was CylinderGeometry(0.62, 0.30, 0.34, 8), which meets
   its top plate in ONE 133.3 deg arris and closes on a 1.087 m2 dead-flat disc. §06's own technique
   for a sharp arris is to replace it with a small third face, so the profile below turns twice on the
   way over the rim instead of once, and the plate that used to be flat becomes a shallow crown of
   eight facets closing on a table a tenth the area.
   That second point is also LAW 1 arithmetic and not only taste: the cowl is chromeMirror at
   metalness 1.0 and an UP-FACING mirror face reflects the near-black zenith. MEASURED by summing the
   area of every triangle whose normal is within 10 deg of level, across all sixteen masts: 17.40 m2
   of dead-flat up-facing mirror before, 1.63 m2 after; measured again by orientation band, the whole
   fixture family goes 18.24 m2 -> 2.48 m2 within 10 deg of level, with 13.04 m2 landing at 10-26 deg.
   THE REMAINDER IS NOT UNSEEN, and an earlier note here claimed it was. It sits at y 6.28-6.52, and
   while seventeen of the nineteen entries in mahplaza.js VIEWS do stand between y 1.5 and y 4.2, TWO
   do not: `natural-edge` at y 4.5 and `overlook` at y 16, which looks down on all sixteen masts at
   6-17 degrees of depression. At that depression a level mirror still returns the lit horizon band rather
   than the zenith, so the residual is a small risk and not the black-plate defect the 6.4 m2 bench top
   was - but it is a risk, not an absence, and it is left unpartnered as a COST choice: the only
   zero-draw-call partner is a platinumLit crown merged into dressing-trim, ~512 triangles for 16 caps
   at 50-90 m. If a reviewer wants it, that is the change; do not justify leaving it by claiming
   nothing can see it. Wound +x toward -z, this world's usual winding.
   Triangles: sides * (2 * (rings - 1) + 2). */
function facetCowl(rings, sides) {
  const pos = [];
  const tri = (a, b, c) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
  const band = rings.map(([r, y]) => {
    const out = [];
    for (let i = 0; i < sides; i++) { const a = i / sides * Math.PI * 2; out.push([Math.cos(a) * r, y, -Math.sin(a) * r]); }
    return out;
  });
  for (let k = 0; k < band.length - 1; k++) {
    const A = band[k], B = band[k + 1];
    for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; tri(A[i], A[j], B[j]); tri(A[i], B[j], B[i]); }
  }
  const top = band[band.length - 1], bot = band[0];
  const tc = [0, rings[rings.length - 1][1], 0], bc = [0, rings[0][1], 0];
  for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; tri(top[i], top[j], tc); tri(bot[j], bot[i], bc); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

function mergeParts(list) {
  let n = 0; for (const g of list) n += g.getAttribute('position').count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.getAttribute('position').array, o * 3); if (g.getAttribute('normal')) nrm.set(g.getAttribute('normal').array, o * 3); o += g.getAttribute('position').count; g.dispose(); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return out;
}

/* the route network, in plaza coordinates: [from, to] pairs the paths connect */
/* THE DIRECTORY BOARD FACE. Portrait, because the pylon it goes on is 1.0 x 1.5 m and a landscape
   sign texture stretched onto it would be the one thing on the plaza that is not proportioned.
   Everything on it comes from ctx.directory, which the assembly fills from its single destination
   table — so this cannot drift from the nav menu, and it invents no copy of its own. */
function directoryTexture(ctx) {
  const rows = ((ctx && ctx.directory) || []).slice(0, 5);
  return canvasTexture(768, 1152, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    /* the ground: a dark slab, not a glow. The type is the light here. */
    g.fillStyle = 'rgba(12,17,26,0.90)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(191,214,242,0.30)'; g.lineWidth = 3;
    g.strokeRect(16, 16, w - 32, h - 32);
    /* the mark: the brand's square diamond, WIDER THAN TALL (§06), drawn as an outline */
    const cx = w / 2, my = 150, mw = 104, mh = 78;
    g.strokeStyle = 'rgba(239,234,224,0.92)'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(cx, my - mh); g.lineTo(cx + mw, my); g.lineTo(cx, my + mh); g.lineTo(cx - mw, my); g.closePath(); g.stroke();
    g.lineWidth = 4; const im = 0.46;
    g.beginPath(); g.moveTo(cx, my - mh * im); g.lineTo(cx + mw * im, my); g.lineTo(cx, my + mh * im); g.lineTo(cx - mw * im, my); g.closePath(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = BRAND.titleWeight + ' 74px ' + BRAND.face;
    g.letterSpacing = Math.round(74 * BRAND.titleTracking) + 'px';
    g.fillStyle = BRAND.title; g.fillText('MAHPLAZA', cx, 300);
    g.font = BRAND.subWeight + ' 26px ' + BRAND.face;
    g.letterSpacing = Math.round(26 * BRAND.subTracking) + 'px';
    g.fillStyle = BRAND.sub; g.fillText('DIRECTORY', cx, 358);
    g.letterSpacing = '0px';
    g.strokeStyle = 'rgba(191,214,242,0.42)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(90, 404); g.lineTo(w - 90, 404); g.stroke();
    /* one row per destination: the name in cream, what it is in the world's blue-white beneath it */
    let y = 480;
    g.textAlign = 'left';
    for (const d of rows) {
      g.font = BRAND.titleWeight + ' 46px ' + BRAND.face;
      g.letterSpacing = Math.round(46 * BRAND.titleTracking) + 'px';
      g.fillStyle = BRAND.title; g.fillText(String(d.label || '').toUpperCase(), 96, y);
      g.font = BRAND.subWeight + ' 24px ' + BRAND.face;
      g.letterSpacing = Math.round(24 * BRAND.subTracking) + 'px';
      g.fillStyle = BRAND.sub; g.fillText(String(d.sub || '').toUpperCase(), 98, y + 44);
      g.letterSpacing = '0px';
      /* the marker that says this line is a place you can go: the same diamond, small */
      g.strokeStyle = 'rgba(191,214,242,0.55)'; g.lineWidth = 3;
      const dy = y + 8, dw = 15, dh = 11, dx = w - 108;
      g.beginPath(); g.moveTo(dx, dy - dh); g.lineTo(dx + dw, dy); g.lineTo(dx, dy + dh); g.lineTo(dx - dw, dy); g.closePath(); g.stroke();
      y += 142;
    }
  });
}

const MARKER = [0, 14];
/* THE ROUTE NETWORK. Every destination end is read from the SITE PLAN, so a path always arrives
   where the building actually is; a hand-typed endpoint is how a road ends up in a wall (L42).

   R2 added the last three rows, on the direction's own list — "leading to certain buildings and
   DIRECTORIES and OUTSIDE OF THE MAP and other parts of the map". The first five go to the three
   destinations and the two corridor mouths; the sixth is the short spur to the directory pylon,
   which is the one object on this plaza that tells a newcomer where anything is and had no path to
   it; the last two run past the deck edge and out of the plaza entirely, north-west and north-east,
   so the eye is given somewhere the world continues to rather than a rim it stops at.

   `w` is the bed width, and the widths are a HIERARCHY, not a preference: MAH MATCH is the primary
   approach and reads widest, the two flanking destinations are secondary, and a spur is a spur. */
const ROUTES = [
  { to: SITES.match.approach, w: 5.2 },    /* MAH MATCH forecourt */
  { to: SITES.gym.approach, w: 4.4 },      /* MAH GYM apron */
  { to: SITES.market.approach, w: 4.4 },   /* MAH MARKET apron */
  { to: [-40, 40], w: 3.6 },               /* west corridor mouth */
  { to: [40, 40], w: 3.6 },                /* east corridor mouth */
  /* THE DIRECTORY. The pylon body stands at (20, 14) yawed −0.5, so its READABLE face looks along
     (sin −0.5, cos −0.5) = (−0.48, 0.88). The spur ends 3.4 m out along that normal — in front of
     the board, where someone reading it would stand — and not at the post, which is its back. */
  { to: [20 + Math.sin(-0.5) * 3.4, 14 + Math.cos(-0.5) * 3.4], w: 2.8 },
  { from: [-40, 40], to: [-62, 74], w: 3.2 },  /* and out of the plaza: north-west, past the deck edge */
  { from: [40, 40], to: [62, 74], w: 3.2 }     /* north-east, the same */
];
const NODES = [[-16, 6], [17, 4]];
/* masts sit inside the plaza, never in the arrival camera's near foreground (z ≳ 24 at the edges reads
   as a pillar across the lens) and never in front of a destination sign */
/* Lamps line the plaza's EDGES and its route flanks. None stands in the central band (|x| < 15 between
   z −22 and z 26): a lit civic square is not a forest of posts, and the camera must be able to see the
   three destinations from the marker without a column across the lens. */
const MASTS = [[-17, 24], [17, 24], [-26, 16], [26, 16], [-17, -12], [17, -12], [-27, -25], [27, -25], [-34, -14], [34, -14],
  [-22, 32], [22, 32], [-36, 2], [36, 2], [-19, -28], [19, -28]];
/* the deck the plaza is laid on: ground.js lays 9 m chromium diamond cells whose tops sit here */
const DECK = 0.17;

export function buildDressing(ctx) {
  const M = ctx.M, THREEJS = THREE;
  const group = new THREE.Group(); group.name = 'plaza-dressing';
  /* the whole dressing stands ON the laid chromium floor, not on the raw ground plane */
  group.position.y = DECK;
  const owned = [];
  const own = g => { owned.push(g); return g; };
  ctx.colliders = ctx.colliders || [];

  const curb = [], slab = [], trim = [], dark = [];
  const pools = [], luminaires = [];

  /* ---- 1. PATHS -------------------------------------------------------------------------------
     DIRECTION, R2: "think about pathways and streets that would be obvious to walk on and around
     and leading to certain buildings and directories and outside of the map and other parts of the
     map ... using our theming and branding of the square diamonds."

     THE PATHS WERE ALREADY HERE. FIVE OF THEM. THEY WERE INVISIBLE, AND THE REASON IS TWO NUMBERS.
     The bed was M.paving at 0x0e0f11 and the deck it crosses is M.plaza at 0x060607 — luminance 15
     against luminance 6, a nine-count difference on a 255 scale, which no eye reads as an edge and
     no screenshot has ever shown. The guidance chevrons were a 0.5-alpha stroke on a 0.22-opacity
     material, i.e. an effective alpha of about 0.11 on a near-black floor. So the network was
     complete, correctly routed off the shared SITE PLAN, and completely unreadable — which is why
     the note came back asking for pathways in a plaza that already had five.

     THE FIX IS NOT TO MAKE THE PATH LIGHTER. This world's ground is near-black on purpose (v11 took
     the paving to black deliberately, and R1 kept it there); a grey ribbon across it would undo that
     and would be the "basic" the direction warns against in the same breath. A path here reads by
     FINISH and by EDGE, which is how this world already distinguishes everything else:

       · THE BED stays matte black — M.paving, roughness 0.34. What changes is the thing it crosses:
         the deck is a MIRROR at roughness 0.055 and metalness 0.98. A matte ribbon laid across a
         black mirror is unmistakable at any hour, because the mirror carries the sky and the towers
         and the path does not. The value difference was never going to do this. The FINISH always
         could, and it was already there, unhelped.
       · THE RAILS are the line that makes it obvious. One continuous chromeMirror rail down each
         flank — the palette's own "focal trim, hero catches, portal frames" grade — standing 4 cm
         proud of the bed. Under LAW 1 a mirror grade takes no diffuse and is lit by the environment
         alone, so at night these are moonlit silver hairlines running out of the plaza toward each
         destination, and by day they are the same line in daylight. This replaces M.curb, which at
         0x222427 was doing the same nine-count nothing the bed was.
       · THE DIAMONDS are the branding, and they are the paving unit, not a decal. A square diamond
         is set flush in the bed on a fixed pitch down the centre of every route, in the same mirror
         grade as the rails. Walking a route you cross one diamond, then another, then another: the
         brand IS the road surface. The chevron texture is gone — a decal that could not be seen
         replaced by geometry that catches light is the whole trade.
       · THE JOINT is one energy line inside each rail, the world's own MAHGIC seam, laid at the
         same low value as every other seam on this plaza and driven by the clock with them.

     AND THE NETWORK NOW GOES WHERE THE DIRECTION SAYS. Three destinations and two corridor mouths
     were the old five; a spur to the DIRECTORY pylon and two routes running clear off the deck to
     the world beyond it are the new three. See ROUTES. */
  const RAIL = { w: 0.14, h: 0.075, out: 0.02 };  /* the flank rail: width, height above the bed, and how far it sits outboard of the bed edge */
  const DIAMOND_PITCH = 5.6;                      /* metres between centre diamonds — one per stride-and-a-half, not a chequerboard */
  const DIAMOND_R = 0.62;                         /* half-diagonal of a centre diamond */
  const seamMat = new THREE.MeshBasicMaterial({
    color: (ctx.theme && ctx.theme.energy) || 0x7fc6ff, transparent: true, opacity: 0.30,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  });
  seamMat.name = 'dressing-path-seam'; seamMat.userData.moduleOwned = true;
  const seams = [], rails = [], marks = [];
  for (const r of ROUTES) {
    const from = r.from || MARKER;
    const dx = r.to[0] - from[0], dz = r.to[1] - from[1];
    const len = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
    const cx = from[0] + dx / 2, cz = from[1] + dz / 2;
    /* the unit vector ACROSS the route — everything flanking it is offset along this */
    const nx = Math.cos(ang), nz = -Math.sin(ang);
    part(slab, chamferBox(r.w, 0.05, len, 0.03), cx, 0.025, cz, ang);
    for (const sd of [-1, 1]) {
      const off = sd * (r.w / 2 + RAIL.out);
      part(rails, chamferBox(RAIL.w, RAIL.h, len, 0.025), cx + nx * off, 0.05, cz + nz * off, ang);
      /* the seam sits INSIDE its rail, in the rail's own shadow, which is where a light line belongs:
         on top of the bed it would read as paint, and outside the rail it would light the deck the
         path is supposed to be distinct from */
      const so = sd * (r.w / 2 - 0.30);
      part(seams, chamferBox(0.10, 0.012, len - 0.4, 0.004), cx + nx * so, 0.058, cz + nz * so, ang);
    }
    /* THE DIAMOND COURSE. Whole diamonds only: a pitch that does not divide the run leaves a clipped
       one at the far end, and a half diamond is not the brand figure. The count is floored and the
       course is centred on the run, so both ends finish on clear bed. */
    const nD = Math.max(1, Math.floor((len - 3.0) / DIAMOND_PITCH));
    const span = (nD - 1) * DIAMOND_PITCH;
    for (let i = 0; i < nD; i++) {
      const t = (len - span) / 2 + i * DIAMOND_PITCH - len / 2;
      /* §06's square diamond, WIDER THAN TALL in plan: the across-axis half is the full radius and
         the along-axis half is shorter, so a walker meets the wide face of the figure, not its point */
      part(marks, chamferBox(DIAMOND_R * 2 * 0.72, 0.022, DIAMOND_R * 2 * 0.72, 0.05),
        cx + Math.sin(ang) * t, 0.062, cz + Math.cos(ang) * t, ang + Math.PI / 4);
    }
  }
  {
    /* the rails and the diamond course are the same grade and the same purpose, so they are one mesh */
    const railMesh = new THREE.Mesh(own(mergeParts(rails.concat(marks))), M.trim || M.chromeMirror || M.platinumLit);
    railMesh.name = 'dressing-path-rails'; group.add(railMesh);
    if (ctx.reflect) { try { ctx.reflect(railMesh, 0.35); } catch (e) {} }
    const seamMesh = new THREE.Mesh(own(mergeParts(seams)), seamMat);
    seamMesh.name = 'dressing-path-seams'; seamMesh.renderOrder = 5; group.add(seamMesh);
  }

  /* ---- 2. NODES: a seating ring segment, a planter surround, a mast ---------- */
  for (const [nx, nz] of NODES) {
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      part(curb, chamferBox(2.4, 0.46, 0.9, 0.07), nx + Math.cos(a) * 3.4, 0.23, nz + Math.sin(a) * 3.4, -a);
      part(trim, chamferBox(2.2, 0.04, 0.08, 0.015), nx + Math.cos(a) * 3.4, 0.47, nz + Math.sin(a) * 3.4 + 0.4, -a);
    }
    part(slab, chamferBox(9.5, 0.06, 9.5, 0.05), nx, 0.03, nz, Math.PI / 4);
  }
  /* the civic ring around the MAHPLAZA marker: one inlaid band, no glow */
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2, R = 9.2;
    part(curb, chamferBox(1.25, 0.05, 0.34, 0.02), MARKER[0] + Math.cos(a) * R, 0.028, MARKER[1] + Math.sin(a) * R, -a + Math.PI / 2);
  }

  /* ---- 3. LIGHT MASTS: instanced pole + square-diamond luminaire + light pool -- */
  /* v5 PREMIUM LAMP (brief §12): not a stick with a dot on it. A tapered satin-chromium column on a
     mirror-grade base collar, a machined mid collar, a cantilevered head bracket, a mirror shade, and the
     square-diamond luminaire beneath it throwing a soft pool. Poles / shades / luminaires are instanced;
     the collars and brackets merge into the trim mesh. */
  const poleGeo = own(new THREE.CylinderGeometry(0.10, 0.21, 6.4, 10));
  const headGeo = own(new THREE.OctahedronGeometry(0.34, 0));      /* the square-diamond luminaire: the brand figure, and §06's one exemption — it keeps its points */
  /* the cowl, rim-chamfered and crowned (facetCowl above): throat 0.30, rim 0.62, a 5.5 x 8 cm
     chamfer band back to 0.565, then the crown to 0.19 and a small table. MEASURED as dihedral turns
     between consecutive faces, which is the only honest way to say whether an arris got blunter:
       before   flank 133.3 deg off level, then the flat plate — ONE arris of 133.3 deg
       after    140.9 / 55.5 / 9.8 / 0 — turns of 85.4, 45.7 and 9.8 deg
     The sharpest edge on the fixture drops from 133 to 85 degrees and the piece gains two facets.
     The rim sits a little lower than the old flat top so the chamfer has room; the cowl still
     occupies 0.34 m of height plus a 6.5 cm crown. */
  const shadeGeo = own(facetCowl([[0.30, -0.170], [0.62, 0.090], [0.565, 0.170], [0.19, 0.235]], 8));
  const poles = new THREE.InstancedMesh(poleGeo, M.chromeSatin || M.trimSatin, MASTS.length);
  const heads = new THREE.InstancedMesh(headGeo, M.energyLight, MASTS.length);
  const shades = new THREE.InstancedMesh(shadeGeo, M.chromeMirror || M.trim, MASTS.length);
  poles.castShadow = true; shades.castShadow = true;
  const poolMat = new THREE.MeshBasicMaterial({ map: blobTexture(), color: (ctx.theme && ctx.theme.energy) || 0x7fc6ff, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false });
  pools.push(poolMat);
  const poolGeo = own(new THREE.PlaneGeometry(10, 10));
  const poolMesh = new THREE.InstancedMesh(poolGeo, poolMat, MASTS.length);
  poolMesh.renderOrder = 6;
  MASTS.forEach(([x, z], i) => {
    const face = Math.atan2(-x, -z);                       /* every lamp turns its head toward the marker */
    _p.set(x, 3.2, z); _q.identity(); _m4.compose(_p, _q, _s); poles.setMatrixAt(i, _m4);
    _p.set(x, 6.28, z); _e.set(0, face, 0); _q.setFromEuler(_e); _m4.compose(_p, _q, _s); shades.setMatrixAt(i, _m4);
    _p.set(x, 5.86, z); _e.set(0, Math.PI / 4, 0); _q.setFromEuler(_e); _s.set(0.95, 1.5, 0.4); _m4.compose(_p, _q, _s); heads.setMatrixAt(i, _m4); _s.set(1, 1, 1);
    _p.set(x, 0.05, z); _e.set(-Math.PI / 2, 0, 0); _q.setFromEuler(_e); _m4.compose(_p, _q, _s); poolMesh.setMatrixAt(i, _m4);
    /* base plinth, mirror foot ring, machined mid collar, head bracket */
    part(dark, chamferBox(0.86, 0.30, 0.86, 0.06), x, 0.15, z, Math.PI / 4);
    part(trim, chamferBox(0.96, 0.06, 0.96, 0.02), x, 0.32, z, Math.PI / 4);
    part(trim, chamferBox(0.38, 0.10, 0.38, 0.025), x, 3.9, z, Math.PI / 4);
    part(trim, chamferBox(0.14, 0.14, 0.62, 0.03), x, 6.44, z, face);
    /* the mast is something the camera must not walk into */
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.6, 0.6), M.trimSatin);
    col.position.set(x, 3.3, z); col.visible = false; group.add(col); ctx.colliders.push(col);
  });
  [poles, shades, heads, poolMesh].forEach(m => { m.instanceMatrix.needsUpdate = true; group.add(m); });
  luminaires.push(heads);

  /* ---- 4. CORRIDOR EDGES: rails, bollards, barrier segments ------------------- */
  /* R170 §17 — THE RAIL WAS 62 POSTS, AND A RAIL IS NOT READ BY COUNTING ITS POSTS.
     2.6 m spacing over 80 m, both sides: 62 posts and 62 base plates, and from the plaza's own long
     sightline they line up into a picket fence across the middle distance — one of the few things in
     this world that manages to be simultaneously invisible up close and dominant at 60 m. What the
     eye actually reads as "there is a rail there" is the CONTINUOUS TOP BAR six lines below, an 80 m
     run at y 0.95 that is unchanged. The posts are what hold it up; at 5.2 m they still do that, and
     there are 31 of them instead of 62.
     This is the §17 test answered honestly: the posts have a function (they carry the rail), so they
     are not removed — they are halved, which is the smallest change that stops them competing. */
  const railPost = own(chamferBox(0.1, 0.95, 0.1, 0.02));
  const postMats = [];
  for (const sd of [-1, 1]) for (let z = 40; z > -40; z -= 5.2) postMats.push([sd * 39.6, 0.48, z]);
  const posts = new THREE.InstancedMesh(railPost, M.chromeSatin || M.trimSatin, postMats.length);
  /* base plates: the vertical shaft earns its metalness 1.0, the horizontal plate does not (§15) */
  const plateGeo = own(chamferBox(0.24, 0.05, 0.24, 0.015));
  const plates = new THREE.InstancedMesh(plateGeo, M.platinumLit || M.trimSatin, postMats.length);
  postMats.forEach((pm, i) => {
    _p.set(pm[0], pm[1], pm[2]); _q.identity(); _m4.compose(_p, _q, _s); posts.setMatrixAt(i, _m4);
    _p.set(pm[0], 0.025, pm[2]); _m4.compose(_p, _q, _s); plates.setMatrixAt(i, _m4);
  });
  posts.instanceMatrix.needsUpdate = true; plates.instanceMatrix.needsUpdate = true; group.add(posts, plates);
  for (const sd of [-1, 1]) part(trim, chamferBox(0.08, 0.08, 80, 0.02), sd * 39.6, 0.95, 0);
  const bollard = own(chamferBox(0.26, 0.9, 0.26, 0.05));
  const bolls = [];
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) bolls.push([sd * (36 - i * 1.8), 0.45, 42]);
  const bollardMesh = new THREE.InstancedMesh(bollard, M.curb, bolls.length);
  const bollCapGeo = own(chamferBox(0.32, 0.05, 0.32, 0.015));
  const bollCaps = new THREE.InstancedMesh(bollCapGeo, M.platinumLit || M.trimSatin, bolls.length);
  /* v11 §06: THE POST IS TURNED TO MEET ITS CAP. The cap was already a square diamond on the bearing
     every plinth, collar and foot ring in this file uses, and the post alone was left axis-aligned —
     so the cap's four corners stood 9.6 cm proud of the post's faces while the post's own corners
     stood 2.4 cm proud of the cap's edges. Four horns and four exposed arrises on each of eight
     bollards, at knee height, at the corridor mouth. Turned, the two are concentric and the cap
     becomes an even 3 cm rim the whole way round, which is what a bollard cap is. No geometry, no
     triangles and no draw calls change: it is one quaternion. */
  _e.set(0, Math.PI / 4, 0); _q.setFromEuler(_e);
  bolls.forEach((b, i) => {
    _p.set(b[0], b[1], b[2]); _m4.compose(_p, _q, _s); bollardMesh.setMatrixAt(i, _m4);
    _p.set(b[0], b[1] + 0.47, b[2]); _m4.compose(_p, _q, _s); bollCaps.setMatrixAt(i, _m4);
  });
  bollardMesh.instanceMatrix.needsUpdate = true; bollCaps.instanceMatrix.needsUpdate = true;
  bollardMesh.castShadow = true; group.add(bollardMesh, bollCaps);

  /* ---- 5. SMALL STRUCTURES: an info pylon and a corridor shelter -------------- */
  {
    /* v6 §15: the lit face was offset along the WRONG axis and ended up 0.2 m behind its own body,
       single-sided, facing into its back — an invisible panel on a solid post. It is offset along the
       body's actual outward normal now, set into a bezel, and the post has a foot. */
    const px = 20, pz = 14, ry = -0.5;
    const nx = Math.sin(ry), nz = Math.cos(ry);                    /* the body's outward normal after yaw */
    part(dark, chamferBox(1.55, 0.16, 0.62, 0.05), px, 0.08, pz, ry);          /* the foot */
    part(dark, chamferBox(1.3, 2.3, 0.36, 0.07), px, 1.15, pz, ry);
    part(trim, chamferBox(1.4, 0.07, 0.44, 0.02), px, 2.36, pz, ry);
    part(trim, chamferBox(1.16, 1.66, 0.06, 0.02), px + nx * 0.185, 1.3, pz + nz * 0.185, ry);   /* the bezel */
    /* R167 §F — THE PYLON SAYS SOMETHING. Its lit face was a blank panel: correct as architecture
       and useless as signage, and at ground level in roam it was the only thing in the plaza that
       could have told a player where anything is. It is a DIRECTORY now — the brand's diamond, the
       place you are standing in, and the destinations that actually exist, drawn from ctx.directory
       so this board and the nav menu read the same table (L42). No invented copy: every string on
       it is a name the world already uses.

       Drawn rather than lit-plain because the reference plaza's pylons are dark slabs with light
       type on them, not glowing rectangles — the panel reads as a surface with information on it,
       which is what "signage integrated into architecture" means. */
    const dirTex = directoryTexture(ctx);
    const dirMat = new THREE.MeshBasicMaterial({ map: dirTex, transparent: true, toneMapped: true, fog: true });
    dirMat.name = 'plaza-directory'; dirMat.userData.moduleOwned = true;
    owned.push(dirTex, dirMat);   /* this module's dispose() calls .dispose() on everything it owns */
    if (ctx.signMaterials) ctx.signMaterials.push(dirMat);
    const face = new THREE.Mesh(own(new THREE.PlaneGeometry(1.0, 1.5)), dirMat);
    face.position.set(px + nx * 0.215, 1.3, pz + nz * 0.215);
    face.rotation.y = ry; face.name = 'plaza-directory'; group.add(face);
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.7), M.curb); col.position.set(px, 1.3, pz); col.visible = false; group.add(col); ctx.colliders.push(col);
  }
  {
    const sx = 46, sz = 30;
    for (const dz of [-2.4, 2.4]) part(dark, chamferBox(0.22, 3.2, 0.22, 0.04), sx, 1.6, sz + dz);
    part(dark, chamferBox(3.2, 0.18, 6.4, 0.06), sx, 3.3, sz);
    part(trim, chamferBox(3.34, 0.05, 0.14, 0.02), sx, 3.42, sz + 3.2);
    const soffitE = new THREE.Mesh(own(new THREE.PlaneGeometry(2.7, 5.8)), M.interiorSoft);
    soffitE.rotation.x = Math.PI / 2; soffitE.position.set(sx, 3.19, sz); group.add(soffitE);
    const col = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 6.6), M.curb); col.position.set(sx, 1.7, sz); col.visible = false; group.add(col); ctx.colliders.push(col);
  }

  /* ---- 6. BENCHES — v6 §15. A 0.16 m slab floating at knee height is what reads as a flat cutout.
     A bench is a BODY: a dark plinth set back from the seat so the seat overhangs it, a curved seat
     with real corners (softMass, not a single 45-degree chamfer), a platinum nosing along the front
     edge, and an unlit strip in the shadow of the overhang. The plinth MUST stay dark — that dark
     mass under the light edge is the entire reason the platinum above it reads. */
  for (const [bx, bz, ry] of [[-19, 21, 0.5], [19, 21, -0.5], [-16, 10.5, 0.2], [17, 8.5, -0.2]]) {
    part(dark, chamferBox(4.5, 0.46, 0.95, 0.09), bx, 0.23, bz, ry);                 /* the plinth, set back */
    /* v11 §06, and this one was a real geometric fault rather than a matter of taste. softMass rounds
       its shape in ELEVATION — width against thickness — and it was asked for a corner radius of
       0.16 m on a seat 0.17 m thick. roundedBoxShape has no clamp, so the two arcs at each end
       overshot each other and the outline doubled back: traced, it runs (2.600, 0.160) then
       (2.600, 0.010), a bowtie. Both ends of all four bench seats were extruded from a
       self-intersecting section. 0.075 is the largest radius this thickness can actually carry
       (h/2 = 0.085), so the ends are now a true continuous round-over instead of a crossed one — and
       it is the rounding the direction asked for, arriving by being correct rather than by being
       softer. Cost: 440 -> 444 triangles per seat, from the triangulator, not from me.
       materials.js owns softMass and is another worker's file, so the clamp is applied HERE, at the
       call; the report says what the shared fix would be. */
    const seat = new THREE.Mesh(own(softMass(5.2, 0.17, 1.35, 0.075, 0.045)), M.platinumLit || M.curb);
    seat.position.set(bx, 0.46, bz + 0.675); seat.rotation.y = ry; seat.castShadow = true; group.add(seat);
    part(trim, chamferBox(5.06, 0.05, 0.09, 0.018), bx, 0.5, bz + 0.66, ry);          /* the nosing */
    /* the light in the shadow of the overhang — this is what makes a 0.17 m slab read as thick */
    const under = new THREE.Mesh(own(new THREE.PlaneGeometry(4.7, 0.1)), M.interior);
    under.position.set(bx + Math.sin(ry) * 0.6, 0.44, bz + Math.cos(ry) * 0.6); under.rotation.y = ry; group.add(under);
    const col = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.8, 1.6), M.curb); col.position.set(bx, 0.4, bz); col.rotation.y = ry; col.visible = false; group.add(col); ctx.colliders.push(col);
  }

  /* ---- 6b. v5 STREET FURNITURE (§12): a civic plaza is furnished, not decorated. Everything here is
     chromium and dark platinum in the world's own vocabulary, merged into the existing meshes. ---- */
  {
    /* WAYFINDING BLADES: one slim upright at the head of each destination route, turned to face the
       way it points. A machined chromium blade with a lit edge — no text, because no wording for these
       has been supplied and none is invented. */
    for (const r of ROUTES.slice(0, 3)) {
      const dx = r.to[0] - MARKER[0], dz = r.to[1] - MARKER[1], L = Math.hypot(dx, dz) || 1;
      /* the blade FLANKS its route rather than standing in it: 2.6 m to one side of the centre line */
      const px = -dz / L, pz = dx / L, side = r.to[0] < 0 ? -1 : 1;
      const bx = MARKER[0] + dx / L * 11 + px * 2.6 * side, bz = MARKER[1] + dz / L * 11 + pz * 2.6 * side, ang = Math.atan2(dx, dz);
      part(dark, chamferBox(0.24, 3.1, 1.05, 0.07), bx, 1.55, bz, ang);
      part(trim, chamferBox(0.3, 0.09, 1.15, 0.03), bx, 3.14, bz, ang);        /* the cap */
      /* v11 §06: the foot was a 0.34 m square diamond turned 45° under a blade 1.05 m deep on a
         different bearing — so a 3.1 m blade stood on a plate a third of its own footprint, its two
         ends cantilevered over nothing, and the plate's corners poked 10 cm out of the blade's flanks
         as four loose points. It is a base plate now: the blade's own plan with a 9 cm rim all round,
         on the blade's own bearing. Same 28 triangles, same merged mesh. */
      part(trim, chamferBox(0.42, 0.12, 1.23, 0.05), bx, 0.06, bz, ang);
      const edge = new THREE.Mesh(own(new THREE.BoxGeometry(0.05, 2.5, 0.04)), M.energy);
      edge.position.set(bx + Math.cos(ang) * 0.14, 1.6, bz - Math.sin(ang) * 0.14); edge.rotation.y = ang;
      group.add(edge);
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 1.3), M.curb);
      col.position.set(bx, 1.6, bz); col.rotation.y = ang; col.visible = false; group.add(col); ctx.colliders.push(col);
    }
    /* PLANTED PLINTHS around the civic ring: low chromium-rimmed troughs, six of them, on the diagonals
       so they never stand between the arrival camera and a destination sign */
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3, R = 12.6;
      const px = MARKER[0] + Math.cos(a) * R, pz = MARKER[1] + Math.sin(a) * R;
      if (pz < MARKER[1] - 8) continue;                       /* nothing on the MAH MATCH sight line */
      /* HOLLOW, not a solid stone box labelled "planted" (§15): a rim, a recess, and a dark void with
         one soft interior wash, so the trough reads as something that could actually hold planting */
      part(dark, chamferBox(2.6, 0.44, 2.6, 0.14), px, 0.22, pz, Math.PI / 4);
      part(trim, chamferBox(2.78, 0.08, 2.78, 0.03), px, 0.47, pz, Math.PI / 4);
      const voidTop = new THREE.Mesh(own(new THREE.PlaneGeometry(1.9, 1.9)), M.graphiteDark);
      voidTop.rotation.x = -Math.PI / 2; voidTop.rotation.z = Math.PI / 4; voidTop.position.set(px, 0.4, pz); group.add(voidTop);
      const wash = new THREE.Mesh(own(new THREE.PlaneGeometry(1.55, 1.55)), M.energySoft);
      wash.rotation.x = -Math.PI / 2; wash.rotation.z = Math.PI / 4; wash.position.set(px, 0.43, pz); wash.renderOrder = 6; group.add(wash);
      const col = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.6, 3.0), M.curb);
      col.position.set(px, 0.3, pz); col.rotation.y = Math.PI / 4; col.visible = false; group.add(col); ctx.colliders.push(col);
    }
    /* a second corridor shelter on the west side, mirroring the east one */
    {
      const sx = -46, sz = 30;
      for (const dz of [-2.4, 2.4]) part(dark, chamferBox(0.22, 3.2, 0.22, 0.04), sx, 1.6, sz + dz);
      part(dark, chamferBox(3.2, 0.18, 6.4, 0.06), sx, 3.3, sz);
      part(trim, chamferBox(3.34, 0.05, 0.14, 0.02), sx, 3.42, sz + 3.2);
      const soffit = new THREE.Mesh(own(new THREE.PlaneGeometry(2.7, 5.8)), M.interiorSoft);
      soffit.rotation.x = Math.PI / 2; soffit.position.set(sx, 3.19, sz); group.add(soffit);
      const col = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 6.6), M.curb); col.position.set(sx, 1.7, sz); col.visible = false; group.add(col); ctx.colliders.push(col);
    }
    /* UTILITY COLUMNS: short machined chromium posts in pairs at the node edges — the small, ordinary
       street objects whose absence is what makes a scene read as a prototype */
    for (const [nx, nz] of NODES) for (const sd of [-1, 1]) {
      part(dark, chamferBox(0.3, 1.15, 0.3, 0.06), nx + sd * 5.6, 0.58, nz - 1.2, Math.PI / 4);
      part(trim, chamferBox(0.36, 0.07, 0.36, 0.02), nx + sd * 5.6, 1.18, nz - 1.2, Math.PI / 4);
    }
  }

  /* ---- 7. CURB LINE between the plaza circle and the aprons / sidewalk band ---- */
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2, R = 27.9;
    if (Math.sin(a) < -0.55 && Math.abs(Math.cos(a)) < 0.5) continue;   /* leave the MAH MATCH approach open */
    part(curb, chamferBox(2.6, 0.12, 0.3, 0.03), Math.cos(a) * R, 0.06, Math.sin(a) * R, -a + Math.PI / 2);
  }

  /* ---- merge and finish ------------------------------------------------------- */
  const add = (list, mat, name, shadow, receive) => {
    if (!list.length) return null;
    const m = new THREE.Mesh(own(mergeParts(list)), mat); m.name = name;
    if (shadow) m.castShadow = true; if (receive) m.receiveShadow = true;
    group.add(m); return m;
  };
  /* R170 D2 — THE ROAD IS NOT PAINTED ON THE FLOOR. IT IS THE FLOOR.
     "That x looking road that drives through the middle needs to be extremely platinum and pitch
     black just like the rest of the floor" — and the operative words are the last five.

     THE BED'S COLOUR WAS NEVER THE PROBLEM. M.paving is 0x0e0f11, black by any measure, and three
     earlier passes that went after the material's own values are recorded in ground.js as having
     moved the measured pixel by nothing. The real cause is one the material cannot see: mahplaza.js
     owns a shader patch that crushes the plaza deck to ELEVEN PERCENT of its own value and then ADDS
     the planar reflection back — that is what makes this world's floor a black mirror rather than a
     grey one. It is applied to M.plaza and to everything in ctx.floorMaterials. The path slab was
     in neither list. So the deck around the road was rendering at 0.11x and the road was rendering
     at 1.00x, and the X came out five pale ribbons across a black plaza — not because it was light,
     but because everything around it had been darkened and it had not.

     So it joins the list. The road now goes through the same crush and the same mirror as the deck
     it crosses, which is the only way it can be "just like the rest of the floor": one surface,
     one treatment, one value family.

     A CLONE IS NOT OPTIONAL HERE. patchMirror() installs an onBeforeCompile on the material it is
     given, and M.paving is shared with every paved thing in the world — handing it over would put
     the plaza's planar reflection on pavements in districts that have no such floor and no such
     mirror. The clone is what keeps this to the five ribbons it is meant for.

     AND THE PATH STAYS LEGIBLE, WHICH IS THE WHOLE POINT OF IT EXISTING. The finish is untouched:
     the bed is still matte at roughness 0.34 where the deck is a mirror at 0.055. Through the same
     patch a matte bed returns almost no reflection, so it reads as the BLACKEST thing in frame while
     the deck beside it carries the city in streaks — the ribbon is still unmistakable, and now it is
     unmistakable in the way the direction asked for. The chromeMirror rails and the diamond course
     are untouched too, and with the bed under them finally black they are the only platinum on it. */
  const pathBedMat = (M.paving || M.platinumLitBrushed || M.graphiteLight).clone();
  pathBedMat.name = 'dressing-path-bed'; pathBedMat.userData.moduleOwned = true;
  (ctx.floorMaterials = ctx.floorMaterials || []).push(pathBedMat);
  add(slab, pathBedMat, 'dressing-paths', false, true);
  add(curb, M.curb, 'dressing-curbs', true, true);
  /* the 82 merged trim parts are almost all HORIZONTAL caps — foot rings, collars, brackets, bench
     edges, fascias, rims. On a mirror grade they reflect a near-black zenith and render black; on the
     low-metalness platinum grade they become the world's visible platinum framing (v6). */
  add(trim, M.platinumLit || M.trim, 'dressing-trim', false, false);
  /* v5: street furniture is BRUSHED PLATINUM, not near-black metal. A flat top facing a dark night sky
     mirrors nothing, so a polished grade would read as a black cut-out on the bright chromium floor; a
     brushed grade picks up the hemisphere and the district glow and stays a readable midtone. */
  add(dark, M.composite || M.structural, 'dressing-structures', true, true);

  const stats = { masts: MASTS.length, routes: ROUTES.length, nodes: NODES.length, colliders: ctx.colliders.length, drawCalls: 0 };
  group.traverse(o => { if (o.isMesh && o.visible) stats.drawCalls++; });

  let daylight = 0, breath = 0;
  function setTime(s) {
    daylight = s ? s.daylight : daylight;
    const k = 1 - 0.7 * daylight;
    poolMat.opacity = 0.13 * k;
    /* the route seams are the same class of light as the pools and step back with them: a wayfinding
       line that holds full strength at noon is signage, and this world's seams are architecture */
    seamMat.opacity = 0.30 * k;
    return s;
  }
  function setTheme(t) { if (t && t.energy != null) { poolMat.color.setHex(t.energy); seamMat.color.setHex(t.energy); } return t; }
  function update(t) {
    /* one very slow breath so the pools are not perfectly static at night; imperceptible by day */
    breath = 0.94 + Math.sin(t * 0.3) * 0.06;
    poolMat.opacity = 0.13 * (1 - 0.7 * daylight) * breath;
    seamMat.opacity = 0.30 * (1 - 0.7 * daylight) * breath;
  }
  function dispose() {
    if (group.parent) group.parent.remove(group);
    owned.forEach(g => { if (g && g.dispose) g.dispose(); });
    poolMat.dispose(); seamMat.dispose(); pathBedMat.dispose();
  }
  setTime(ctx.clock && ctx.clock.state ? ctx.clock.state() : null);
  return { group, setTime, setTheme, update, dispose, stats };
}
