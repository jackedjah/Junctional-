/* MAHWORLD :: MAH HALO — the eight districts, the ascent dock, and the life on the ring
   ============================================================================================

   halo.js owns the SURFACE. This file owns what stands on it, and R4 names all of it:

       HALO ARRIVAL   ascent docking and orientation
       HALO COMMONS   meeting, chilling, free movement
       HALO PULSE     music, parties, dancing, events
       HALO TABLE     food and social dining
       HALO PLAY      mini-games and social activities
       HALO QUIET     low-stimulation gardens and rest
       HALO FORUM     meetings, talks, community
       HALO STAGE     major performances and broadcasts

   "Names may later refine; functions are locked."

   ---- THE ONE RULE THAT SHAPES THE WHOLE FILE --------------------------------------------------
   R4's PEACEFULNESS clause: "Default MAH HALO is sanctuary space: no random hostile spawns,
   unsolicited combat, ambient attacks or boss encounters in ordinary districts. The player should
   feel safe standing still and socializing."

   That is not decoration, it is a design constraint with teeth, and it decides what this file may
   contain. Nothing here spawns a MAHBEAST, nothing here is a weapon, and mahbeasts.js's territories
   are all on the ground 1800 m below — which the law suite asserts rather than assumes, because
   "we did not add any" is exactly the sort of thing that stops being true in six months.

   ---- WHY EVERYTHING MERGES BY MATERIAL AND NOT BY DISTRICT ------------------------------------
   L48's lesson at city scale. Eight districts each emitting their own meshes is eight times the
   draws for no visual gain; the GPU does not care which district a triangle belongs to, only which
   material it wears. So every district pushes into four shared buckets — platinum, dark deck, glass,
   and one instanced family per repeated object — and the whole sanctuary costs a handful of draws.
   The districts stay separate in the SOURCE, where separation is worth something.

   ---- THE ASCENT DOCK, AND WHY IT IS THREE RAKED BEAMS -----------------------------------------
   R4: "Ascent shafts and FOBEAMS physically dock into HALO ARRIVAL... Replace the tiny top-platform
   feeling." mahascent.js already builds the lower chain: ground pad -> cloud aperture at 566 ->
   arrival decks at 700. Those decks are the platform R4 is calling tiny, and the correct move is not
   to delete them but to DEMOTE them: they become TRANSFER decks halfway up, and a third leg rakes
   from them out to the halo at 1815. The journey becomes ground -> weather -> transfer -> sanctuary,
   which is a real progression and is exactly the chain R4 lists.

   Raked and not vertical because the halo's inner rim is 700 m from the world axis and the ascent
   lines stand within 40 m of it. A vertical line would arrive at the hole. The beams land on a pier
   at r 760, just inside that rim: a 730 m run against a 1136 m climb, 32.7° off vertical — a
   cable-car angle, not a wall — and three of them converging on one pier is a better arrival than
   three parallel ones. From the pier a 1220 m CONCOURSE SPINE walks you out to the arrival gateway
   on the midline, so the 2700 m width of the ring is crossed rather than ignored.

   buildHaloDistricts(ctx, { transferDecks }) -> the standard module contract. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, signTexture } from './materials.js';
import { HALO, haloHeight, haloNormal, onHalo, applyHaloGrid } from './halo.js';
import { createMusicLineField } from './musicline.js';

const TAU = Math.PI * 2;

/* ================================================================================================
   THE DISTRICT TABLE. theta is the angle on the ring; span is how much of the ring the district
   occupies, in metres along the midline. ARRIVAL is at -90 deg — world -z — so it sits straight out
   along the axis the plaza's own establishing camera already looks down.
   ================================================================================================ */
export const DISTRICTS = Object.freeze([
  { id: 'arrival', label: 'HALO ARRIVAL', sub: 'ASCENT DOCK', deg: -90, span: 420, density: 'high' },
  { id: 'commons', label: 'HALO COMMONS', sub: 'MEET + MOVE', deg: -45, span: 520, density: 'low' },
  { id: 'pulse', label: 'HALO PULSE', sub: 'MUSIC + EVENTS', deg: 0, span: 380, density: 'high' },
  { id: 'table', label: 'HALO TABLE', sub: 'FOOD + SOCIAL', deg: 45, span: 300, density: 'medium' },
  { id: 'play', label: 'HALO PLAY', sub: 'GAMES', deg: 90, span: 340, density: 'medium' },
  { id: 'quiet', label: 'HALO QUIET', sub: 'REST', deg: 135, span: 560, density: 'low' },
  { id: 'forum', label: 'HALO FORUM', sub: 'COMMUNITY', deg: 180, span: 320, density: 'medium' },
  { id: 'stage', label: 'HALO STAGE', sub: 'PERFORMANCE', deg: -135, span: 400, density: 'high' }
]);

const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;

/* ring coordinates -> world. `s` is metres along the ring from the district centre, `t` is metres
   across it from the midline (negative = toward the hole, positive = toward the outer rim). */
function ringPoint(deg, s, t) {
  const th = deg * Math.PI / 180 + s / HALO.R_MID;
  const r = HALO.R_MID + t;
  return [Math.cos(th) * r, Math.sin(th) * r, th];
}

export function buildHaloDistricts(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'halo-districts';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = {
    districts: [], draws: 0, triangles: 0, overlooks: 0, seats: 0, kiosks: 0,
    gameZones: 0, eventTiles: 0, spawnPoints: 0, hostiles: 0, dockBeams: 0
  };

  /* ---- placement on the curved shell --------------------------------------------------------- */
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
    _e = new THREE.Euler(), _s = new THREE.Vector3(), _n = new THREE.Vector3(),
    _up = new THREE.Vector3(0, 1, 0), _qn = new THREE.Quaternion(), _qy = new THREE.Quaternion();
  /* THE ORIENTATION RULE. Everything on the ring stands along the SHELL NORMAL, not along world up.
     At the rims that is 3.4° off vertical, which is small — and it is exactly the difference between
     a sanctuary built on a curved surface and a set of props dropped onto one. */
  function onShell(x, z, up, ry) {
    const y = haloHeight(x, z);
    haloNormal(x, z, _n);
    _qn.setFromUnitVectors(_up, _n);
    _e.set(0, ry || 0, 0); _qy.setFromEuler(_e);
    _q.copy(_qn).multiply(_qy);
    _p.set(x, y + (up || 0), z);
    return { p: _p, q: _q, y };
  }
  function mat(x, z, up, ry, sx, sy, sz) {
    const o = onShell(x, z, up, ry);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(o.p, o.q, _s).clone();
  }

  /* four shared buckets, by MATERIAL — see the header note on why not by district */
  const B = { plat: [], dark: [], glass: [] };
  const put = (b, geo, matrix, value) => B[b].push({ geo, matrix, value });

  const platinum = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  platinum.vertexColors = true; platinum.name = 'halo-d-platinum'; owned.materials.push(platinum);
  const darkMat = (M.paving || M.graphiteMetal || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  darkMat.vertexColors = true; darkMat.name = 'halo-d-dark';
  /* THE MIDDLE GRADE (L51). §07's plaza runs hero r0.045 / satin r0.13 across 43 m; halo.js's shell
     runs honed r0.62 across 2700 m. A district deck is 60-150 m — between the two, so its polish is
     between the two. Left at the plaza's own r0.34 the STAGE's 100 x 44 m deck and FORUM's 150 m
     treads mirror the horizon the same way the shell did, at a smaller scale but from the same
     standing eye. Three grades over sixty times the span is the ladder, not one number. */
  darkMat.roughness = 0.56; darkMat.envMapIntensity = 0.30;
  /* ---- CHANGE OF METHOD, after two weak iterations on envMapIntensity ------------------------
     The concourse spine is a 26 m by 1180 m slab walked at 1.7 m, so it is pure grazing over its
     whole length, and a directional moon puts a specular path down it that no reduction of the
     environment term removes: 0.45 then 0.30 both came back a mirror. R3's rule is that two
     iterations with weak improvement mean CHANGE METHOD, and the method here was wrong. A flat
     surface with nothing on it reflects; a surface with structure has something else to show.

     So the district decks take the SAME laser plating the shell wears, computed from the same world
     XZ, which means the plating is continuous across the whole sanctuary — step off the open plate
     onto a terrace and the tile lines carry straight over the kerb instead of stopping at it. That
     is what R4's "physical laser-plated tiles" means at district scale, it is one line instead of a
     material argument, and it gives every dark deck line structure in place of a mirror.

     Lower gains than the shell: a district deck is READ AT WALKING DISTANCE, where the shell's
     values would be a lightbox underfoot. */
  applyHaloGrid(darkMat, { micro: 1, tile: 8, mega: 64, gainMicro: 0.05, gainTile: 0.20,
    gainMega: 0.34, node: 0.5, microFar: 30, tileFar: 340 });
  owned.materials.push(darkMat);
  /* R4's VISUAL SEPARATION list puts TRANSMISSION second, right after silhouette. The overlooks and
     the display surfaces are the only transmissive thing up here, which is what makes an overlook
     read as a hole you can see through rather than as a differently-coloured floor. */
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x16202f, metalness: 0.10, roughness: 0.06,
    transparent: true, opacity: 0.34, envMapIntensity: 1.3, vertexColors: true,
    side: THREE.DoubleSide, depthWrite: false
  });
  glassMat.name = 'halo-d-glass'; owned.materials.push(glassMat);

  /* (there was a `glow` MeshBasicMaterial here. It was built, named, pushed to owned.materials and
     driven by BOTH setTime and setTheme every frame — while being attached to no mesh, no instanced
     mesh and no line: a material animating in the dark since the file was written. Deleted rather
     than given a job, because inventing a use for dead code is how dead code survives.) */
  /* the one place warm light is legal in this world is INSIDE a building (mahplaza LAW-001's
     exemption is by ROLE, and the identifier has to name an interior light). MAH TABLE's counters
     are interiors, and a food district lit in the same cold blue as everything else is a morgue. */
  const interiorWarm = new THREE.MeshBasicMaterial({
    color: 0xffd9a8, transparent: true, opacity: 0.30,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  interiorWarm.name = 'halo-interior-light'; owned.materials.push(interiorWarm);

  /* THE EVENT TILE FIELD — R4's "modular luminous floors", from the event-tile reference. Its own
     material so its grid can react while the sanctuary floor stays calm: R4 wants event tiles that
     "react to normalized bands/amplitude", and a district that reacts is only legible if the ones
     next to it do not. */
  const eventMat = (M.paving || M.graphite || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  eventMat.name = 'halo-event-tiles'; eventMat.vertexColors = false;
  applyHaloGrid(eventMat, { micro: 1, tile: 4, mega: 16, gainMicro: 0.06, gainTile: 0.62, gainMega: 0.9, node: 1.5, tileFar: 900 });
  owned.materials.push(eventMat);

  const musicSites = [];
  const spawnPoints = [];

  /* ================================================================================================
     THE SHARED VOCABULARY. Every district is built from these; the differences are in which parts,
     how many, how spaced and how tall — R4's VISUAL SEPARATION order (silhouette, roughness,
     transmission, depth, motion, shadow, scale) BEFORE hue, and no district gets a colour.
     ================================================================================================ */
  /* A PLATINUM PERIMETER, four boxes, laid around a rectangle on the shell. This is the shape §07
     asks for wherever a floor needs an edge: the horizontal you walk on stays near-black, and the
     bright metal is the frame around it — vertical enough to catch the horizon, narrow enough that
     it never becomes the surface. Used by every raised deck in the sanctuary. */
  /* THE ROTATION MUST COME FROM THE CALLER, not be re-derived from th. Most decks up here are laid
     with mat(..., -th), which puts local X radially and local Z tangentially — but the ascent pier
     is laid with mat(..., -th + PI/2), because it faces out along the radius. A kerb that assumed
     -th would have been turned ninety degrees to the deck it edges: four platinum bars lying across
     the pier instead of around it, and nothing would have failed. So `rot` is the SAME value the
     caller passed to mat(), and the two offset axes are derived from it.
     mat()'s yaw sends local +X to (cos rot, -sin rot) and local +Z to (sin rot, cos rot) in world xz. */
  function kerb(x, z, rot, w, d, up, val) {
    const v = val == null ? 0.98 : val;
    const ax = Math.cos(rot), az = -Math.sin(rot);   /* where the box's own X points */
    const bx = Math.sin(rot), bz = Math.cos(rot);    /* where the box's own Z points */
    for (const s of [-1, 1]) {
      /* the two ends, running the full width so the corners close */
      const o1 = s * (d * 0.5 + 0.4);
      put('plat', chamferBox(w + 1.6, 0.34, 0.8, 0.12), mat(x + bx * o1, z + bz * o1, up, rot), v);
      /* the two sides, fitted between them */
      const o2 = s * (w * 0.5 + 0.4);
      put('plat', chamferBox(0.8, 0.34, d, 0.12), mat(x + ax * o2, z + az * o2, up, rot), v);
    }
  }

  const P = {
    /* a raised terrace: the thing a district stands on, so it reads as a place and not as a patch.

       §07 IS THE REASON THIS IS SHAPED THE WAY IT IS, and the first cut broke it. It capped every
       terrace with a single platinum slab a metre wider than the plinth — so the surface you STAND
       on was bright metal, 79 m by 63 m of it, and from a 1.70 m eye at grazing incidence ARRIVAL
       photographed as a sheet of milk with the sanctuary's pylons standing in it. The law is not
       "use platinum sparingly", it is "every walking surface in this world is near-black and
       reflective"; platinum is for VERTICALS and EDGES, which is exactly what catches the horizon.
       So the top is dark paving and the platinum is a perimeter kerb four boxes wide — which is
       also what makes the terrace read as a raised place, because an edge you can see is what says
       a floor has a boundary. */
    terrace(deg, s, t, w, d, val) {
      const [x, z, th] = ringPoint(deg, s, t);
      put('dark', chamferBox(w, 1.1, d, 0.4), mat(x, z, 0.55, -th, 1, 1, 1), val != null ? val : 0.34);
      put('dark', chamferBox(w, 0.30, d, 0.12), mat(x, z, 1.18, -th, 1, 1, 1), (val != null ? val : 0.34) + 0.14);
      kerb(x, z, -th, w, d, 1.24);
      return [x, z, th];
    },
    /* a square-diamond GATEWAY: two piers and a diamond keystone. The brand figure, load-bearing. */
    gateway(deg, s, t, w, h) {
      const [x, z, th] = ringPoint(deg, s, t);
      for (const side of [-1, 1]) {
        const gx = x + Math.cos(th + Math.PI / 2) * side * w * 0.5;
        const gz = z + Math.sin(th + Math.PI / 2) * side * w * 0.5;
        put('plat', chamferBox(2.2, h, 2.2, 0.6), mat(gx, gz, h / 2, -th), 0.90);
        put('plat', chamferBox(3.4, 0.5, 3.4, 0.16), mat(gx, gz, h, -th + 0.4), 1.0);
      }
      /* THE LINTEL SPANS THE WAY ITS PIERS ARE SEPARATED. The piers are offset along
         (cos(th+PI/2), sin(th+PI/2)) — TANGENTIAL — and the lintel was authored on local X, which
         mat(..., -th) sends RADIALLY: the arrival gateway's crossbeam stood ninety degrees to the
         two piers under it. Fourth instance of this bug in one file (kerb, screen, proscenium). */
      put('plat', chamferBox(1.6, 1.0, w + 2, 0.3), mat(x, z, h + 0.5, -th), 1.0);
      const dia = own(new THREE.OctahedronGeometry(1, 0));
      put('plat', dia, mat(x, z, h + 4.2, -th, 3.0, 2.4, 3.0), 1.0);
      return [x, z, th];
    },
    /* a MAST carrying a FOBEAM endpoint — and every one of them gets the music line (R4: "Every
       FOBEAM retains the miniature vertical music-line motif") */
    mast(deg, s, t, h, seed) {
      const [x, z, th] = ringPoint(deg, s, t);
      /* THE PROPORTION IS THE LESSON mahascent ALREADY PAID FOR. A fixed 1.4 m section carried
         heights from 11 to 32 m — up to 23:1, which is the slenderness that aliases to a hairline
         and puts a picket fence across a district. A mast at about 6:1 is a structure: it has a
         silhouette, it casts, and the square diamond on top is carried rather than balanced. The
         section grows with the height instead of being a constant, and everything above it is a
         multiple of the section so a short mast and a tall one are the same object at two sizes. */
      const w = Math.max(1.6, h / 6);
      put('plat', chamferBox(w, h, w, w * 0.26), mat(x, z, h / 2, -th), 0.88);
      put('plat', chamferBox(w * 1.7, 0.44 + w * 0.10, w * 1.7, 0.14), mat(x, z, h - 0.3, -th + 0.4), 1.0);
      const dia = own(new THREE.OctahedronGeometry(1, 0));
      /* wider than tall — the brand figure, never a spike wearing its name (§06) */
      put('plat', dia, mat(x, z, h + w * 1.05, -th, w * 1.25, w, w * 1.25), 1.0);
      /* the motif stands CLEAR of the mast, and the clearance has to follow the section now that
         the section grows with height — at 2.6 m a 5.3 m mast would have swallowed it */
      const mo = w * 0.5 + 1.6;
      musicSites.push({ x: x + Math.cos(th) * mo, y: haloHeight(x, z) + 0.9, z: z + Math.sin(th) * mo, ry: -th, scale: 1.6 + w * 0.22 });
      return [x, z, th];
    },
    /* SUPPORTED SEATING — R4 asks for "supported seating" and "movable seating" by name. A bench in
       this world is a slab on a plinth, never a chair with legs. */
    seat(deg, s, t, ry, long) {
      const [x, z, th] = ringPoint(deg, s, t);
      const w = long ? 7.5 : 3.4;
      put('dark', chamferBox(w, 0.34, 1.5, 0.16), mat(x, z, 0.92, -th + (ry || 0)), 0.44);
      put('plat', chamferBox(w * 0.42, 0.85, 1.0, 0.22), mat(x, z, 0.44, -th + (ry || 0)), 0.80);
      put('plat', chamferBox(w, 0.14, 0.34, 0.06), mat(x, z, 1.12, -th + (ry || 0)), 1.0);
      stats.seats++;
      return [x, z, th];
    },
    /* a FOBLOCK-derived KIOSK. R4: "rounded-square serving modules... No ordinary fast-food
       storefront copy." So it is the FOBLOCK silhouette at service scale with a counter cut into it. */
    kiosk(deg, s, t, ry, seed) {
      const [x, z, th] = ringPoint(deg, s, t);
      const a = -th + (ry || 0);
      put('dark', chamferBox(4.6, 3.6, 3.4, 0.9), mat(x, z, 1.8, a), 0.30);
      put('plat', chamferBox(5.0, 0.4, 3.8, 0.16), mat(x, z, 3.8, a), 1.0);
      put('plat', chamferBox(5.2, 0.34, 1.4, 0.14), mat(x + Math.cos(a) * 2.0, z - Math.sin(a) * 2.0, 1.5, a), 0.96);
      /* the counter's interior light — the exemption, and the identifier names it */
      const interiorGeo = own(new THREE.PlaneGeometry(3.6, 1.5));
      const interiorLight = new THREE.Mesh(interiorGeo, interiorWarm);
      const o = onShell(x + Math.cos(a) * 1.5, z - Math.sin(a) * 1.5, 2.1, a);
      interiorLight.position.copy(o.p); interiorLight.quaternion.copy(o.q);
      interiorLight.rotateY(Math.PI / 2); interiorLight.renderOrder = 4;
      interiorLight.name = 'halo-kiosk-interior-light';
      group.add(interiorLight);
      const dia = own(new THREE.OctahedronGeometry(1, 0));
      put('plat', dia, mat(x, z, 5.2, a, 1.2, 1.0, 1.2), 1.0);
      stats.kiosks++;
      return [x, z, th];
    },
    /* a HOLOGRAPHIC SCREEN — R4's presentation surface, and the only large transmissive plane */
    screen(deg, s, t, w, h, ry) {
      const [x, z, th] = ringPoint(deg, s, t);
      const a = -th + (ry || 0);
      /* THE POSTS AND THE PANEL MUST SPAN THE SAME AXIS, AND IT MUST BE THE TANGENTIAL ONE.
         mat(x,z,up,a) sends local +X to (cos a, -sin a) and local +Z to (sin a, cos a); with a = -th
         that is RADIAL and TANGENTIAL respectively. Two mistakes were made here in turn. The first
         cut spanned the base and glass along X while offsetting the posts along Z — a screen turned
         ninety degrees to the two posts holding it. The correction moved the posts to X, which made
         them agree on the WRONG axis: the panel's face normal then pointed along the ring, so from
         HALO STAGE and HALO FORUM — where the audience sits OUTBOARD and looks inward — every screen
         was edge-on, a blade instead of a display. A screen faces radially, so it SPANS tangentially:
         thin on X, tall on Y, long on Z, with its posts offset along Z. */
      const px = Math.sin(a), pz = Math.cos(a);
      put('plat', chamferBox(1.2, 0.5, w + 1.4, 0.2), mat(x, z, 0.6, a), 0.9);
      for (const side of [-1, 1]) {
        put('plat', chamferBox(0.7, h, 0.7, 0.2),
          mat(x + px * side * w * 0.5, z + pz * side * w * 0.5, h / 2, a), 0.94);
      }
      put('glass', chamferBox(0.18, h * 0.78, w, 0.06), mat(x, z, h * 0.52, a), 0.62);
      return [x, z, th];
    },
    /* a CRYSTAL GROWTH cluster — QUIET's garden, the rainforest's ground family brought upstairs.

       DARK ON DARK IS NOT A SILHOUETTE. The first cut put the whole cluster in the dark bucket at
       value 0.50, standing on a near-black plate: from any camera further than about 40 m the
       growths vanished, and QUIET's garden read as an empty district rather than a quiet one. R3's
       instruction for exactly this is to solve same-colour readability with material RESPONSE,
       silhouette, texture and shadow rather than by inventing a hue.

       So a growth is two materials, which is also what a crystal actually is: a dark body that the
       plate's own light passes into, and a CROWN whose upper facets are platinum and catch the
       horizon. The crown is the readable part at distance and the body is what you see up close —
       the same two-tier trick the plaza's own floor shards use. The crown is set WIDER than the
       body's waist and lower than its apex, so the profile is a faceted stone and never a spike. */
    growth(deg, s, t, n, seed) {
      const [x, z, th] = ringPoint(deg, s, t);
      for (let k = 0; k < n; k++) {
        const a = gold(seed + k), rr = 2 + 7 * frac(seed + k * 3);
        const w = 0.8 + 2.2 * frac2(seed + k * 5), tall = w * (0.5 + 0.7 * frac(seed + k * 7));
        const gx = x + Math.cos(a) * rr, gz = z + Math.sin(a) * rr, gy = gold(seed + k * 11);
        const g = own(new THREE.OctahedronGeometry(1, 0));
        put('dark', g, mat(gx, gz, tall * 0.28, gy, w, tall, w * 0.9), 0.50);
        /* the crown: a second, shallower octahedron riding the body's shoulder in platinum */
        const c = own(new THREE.OctahedronGeometry(1, 0));
        put('plat', c, mat(gx, gz, tall * 0.62, gy + 0.42, w * 0.66, tall * 0.34, w * 0.60), 0.92);
      }
      return [x, z, th];
    },
    /* a DOWNWARD OVERLOOK — R4 devotes a whole clause to it: "Preserve dramatic overlooks to Civic
       City, Lake City, Rainforest City, mountains, moon" and "Preserve downward world views".

       ---- WHY THIS IS A CANTILEVER AND NOT A WINDOW IN THE FLOOR ------------------------------
       The first cut was a glass band set into the deck at r = R_IN + 26, and the render came back
       COMPLETELY BLACK. The cause is the same curvature that makes the ring safe. The dish rises
       39.6 m from the midline to each rim, so the last 60 m before the inner edge is an UPHILL
       slope at the worst grade in the world: the deck is 1838.1 at r 726 and 1841.6 at r 666. An
       eye 1.7 m above that overlook sits at 1839.8 and the lip 60 m away is 1841.6 — 1.8 m ABOVE
       it — with a parapet on top. There is no downward view from there at all. The guard rail was
       deleting the clause it was supposed to make survivable.

       The geometry only works one way: the bay has to project PAST the rim, out over the hole, and
       STEP DOWN below the crest so nothing is between the eye and the world. That is a cantilevered
       skywalk — which is also the most dramatic form the clause could take, and "dramatic" is R4's
       own word. You stand on glass 1836 m above MAHPLAZA with nothing under your feet.

       Struts carry it back to the rim, because a 20 m cantilever with no visible support reads as a
       mistake, and the rail is on three sides only: the fourth is the edge you came in over. */
    overlook(deg, s, w) {
      /* THE RADII ARE THE WHOLE POINT AND THEY ARE MEASURED. The shell ends at R_IN - APRON = 666.
         A bay centred inside that is buried under the shell; a bay centred outside it is back behind
         the lip. So the bay STRADDLES the edge: 30 m long, centred at 652, spanning 637 to 667 — its
         root just catches the shell and its far end hangs 29 m out over open air. From out there the
         line to MAHPLAZA is 70 degrees below horizontal with nothing in it.

         Flush with the deck, not stepped down: stepping down would bury the root, and the rails are
         only 1.28 m so they never come between a standing eye and the ground. */
      const D = 30, rDeck = HALO.R_IN - HALO.APRON - D * 0.5 + 1;
      const th0 = deg * Math.PI / 180 + s / HALO.R_MID;
      const x = Math.cos(th0) * rDeck, z = Math.sin(th0) * rDeck, th = th0;
      const drop = 0.10;
      /* THE DECK: a dark-crystal frame carrying a glass floor. §07 holds even here — the solid part
         of a floor you stand on is near-black, and the transparent part is the point of the room. */
      put('dark', chamferBox(D, 0.55, w + 3.2, 0.22), mat(x, z, drop, -th), 0.26);
      put('glass', chamferBox(D - 2.6, 0.20, w, 0.06), mat(x, z, drop + 0.34, -th), 0.42);
      /* the RAIL on three sides — the fourth is the way in */
      const off = (dr, dt) => [x + Math.cos(th) * dr - Math.sin(th) * dt,
                               z + Math.sin(th) * dr + Math.cos(th) * dt];
      for (const side of [-1, 1]) {
        const [px, pz] = off(0, side * (w * 0.5 + 1.4));
        put('plat', chamferBox(D, 0.22, 0.42, 0.08), mat(px, pz, drop + 1.28, -th), 1.0);
        put('dark', chamferBox(D, 1.0, 0.30, 0.10), mat(px, pz, drop + 0.75, -th), 0.30);
        for (const f of [-0.36, 0, 0.36]) {
          const [qx, qz] = off(D * f, side * (w * 0.5 + 1.4));
          put('plat', chamferBox(0.34, 1.25, 0.34, 0.10), mat(qx, qz, drop + 0.65, -th), 0.96);
        }
      }
      const [ex, ez] = off(-D * 0.5, 0);              /* the far end, out over the middle of the hole */
      put('plat', chamferBox(0.42, 0.22, w + 2.8, 0.08), mat(ex, ez, drop + 1.28, -th), 1.0);
      put('dark', chamferBox(0.30, 1.0, w + 2.8, 0.10), mat(ex, ez, drop + 0.75, -th), 0.30);
      /* THE STRUTS: two raked legs back up to the rim, so the cantilever is carried and not floating */
      for (const side of [-1, 1]) {
        const [ax2, az2] = off(-D * 0.30, side * (w * 0.5 + 0.9));
        put('plat', chamferBox(15, 0.7, 0.7, 0.2), mat(ax2, az2, drop - 1.6, -th, 1, 1, 1), 0.88);
      }
      /* and the THRESHOLD back on the ring proper, so the bay is entered rather than arrived at */
      const [tx, tz] = ringPoint(deg, s, -(HALO.R_MID - HALO.R_IN) + 20);
      put('dark', chamferBox(16, 0.42, w + 4, 0.16), mat(tx, tz, 0.22, -th), 0.30);
      kerb(tx, tz, -th, 16, w + 4, 0.50);
      /* ROAM CANNOT SEE THIS BAY. haloFloor() answers null past R_IN - APRON, which is exactly where
         the cantilever hangs — the analytic surface is the RING and the bay is deliberately off it.
         So the deck is registered the way every other standable object in this world is: an invisible
         proxy MESH in ctx.colliders. L47 is the reason it is a mesh and not a Box3 — the assembly's
         filter is `o.isMesh` and a Box3 is dropped without a word. Its top is one step above the
         shell, so a walker steps onto it exactly as they would onto a bench. */
      if (ctx && ctx.colliders) {
        const proxy = new THREE.Mesh(own(new THREE.BoxGeometry(D - 1, 1.2, w + 2.4)));
        const o = onShell(x, z, drop - 0.25, -th);
        proxy.position.copy(o.p); proxy.quaternion.copy(o.q);
        proxy.visible = false; proxy.name = 'halo-overlook-floor-' + deg;
        proxy.updateMatrixWorld(true);
        group.add(proxy); ctx.colliders.push(proxy);
      }
      stats.overlooks++;
      spawnPoints.push({ x, z, kind: 'overlook' });
      /* WHERE THE RAIL IS, published — because the alternative is a second table (L42) and the
         second table is how halo-life came to stand two people at a rim wall 21 m inboard of the
         nearest bay. `rail` is the radius of the far end, the one you actually lean on. */
      (stats.overlookSites || (stats.overlookSites = [])).push({
        deg, s, w, r: rDeck, rail: rDeck - D * 0.5 + 1.6, up: drop + 0.55
      });
      return [x, z, th];
    }
  };

  /* signage, shared */
  const signMats = [];
  function districtSign(D, x, z, th, up) {
    const tex = signTexture({ title: D.label, sub: D.sub, mark: true });
    owned.textures.push(tex);
    /* TWO BACK-TO-BACK PLANES, NOT ONE DOUBLE-SIDED ONE.

       A ring has two along-ring approaches and a PlaneGeometry has one face, so at three's default
       FrontSide each of the eight signs was legible from only ONE direction — walk toward HALO
       PULSE from TABLE and you read it, arrive from COMMONS and you see a blank plane. (A probe
       measured every sign's normal at exactly 0.00 against radial, i.e. perfectly tangential. The
       audit called that a defect and it is not one: the promenade runs along the ring, so along the
       ring is the direction a district is walked toward, which is what street signage does.)

       The obvious fix — side: DoubleSide — is WRONG FOR TEXT, and the render said so immediately:
       from behind, a double-sided plane shows its texture MIRRORED, so HALO STAGE read backwards.
       Two planes, each FrontSide, the second yawed 180 degrees, is the only correct answer for
       lettering. They share one material and one geometry, so the cost is one extra draw-free mesh. */
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, fog: true,
      toneMapped: true });
    m.name = 'halo-sign-' + D.id; owned.materials.push(m); signMats.push(m);
    if (ctx && ctx.signMaterials) ctx.signMaterials.push(m);
    const geo = own(new THREE.PlaneGeometry(26, 26 * (768 / 2048)));
    for (const face of [0, Math.PI]) {
      const mesh = new THREE.Mesh(geo, m);
      const o = onShell(x, z, up, -th + face);
      mesh.position.copy(o.p); mesh.quaternion.copy(o.q);
      mesh.name = 'halo-sign-' + D.id + (face ? '-b' : '');
      group.add(mesh);
    }
  }

  /* ================================================================================================
     THE EIGHT DISTRICTS
     ================================================================================================ */
  const eventTiles = [];
  for (const D of DISTRICTS) {
    const half = D.span * 0.5;
    const rec = { id: D.id, deg: D.deg, span: D.span, parts: {} };
    const pre = { seats: stats.seats, kiosks: stats.kiosks, overlooks: stats.overlooks };

    if (D.id === 'arrival') {
      /* BROAD TERRACES. R4 names them, and they are the answer to "the tiny top platform": three
         stepped terraces across 260 m, so what you step out onto is a civic scale, not a pad. */
      for (let k = -1; k <= 1; k++) P.terrace(D.deg, k * 96, -34 + k * 8, 78, 62, 0.34 + 0.06 * k);
      P.gateway(D.deg, 0, -70, 42, 26);
      for (const s of [-140, -70, 70, 140]) P.mast(D.deg, s, 30, 20 + 8 * frac(s), s);
      for (const s of [-104, -34, 34, 104]) P.seat(D.deg, s, 46, 0, true);
      P.overlook(D.deg, -60, 40); P.overlook(D.deg, 60, 40);
      districtSign(D, ...ringPoint(D.deg, 0, -70).slice(0, 2).concat([ringPoint(D.deg, 0, -70)[2]]), 32);
      spawnPoints.push({ x: ringPoint(D.deg, 0, -20)[0], z: ringPoint(D.deg, 0, -20)[1], kind: 'arrival' });

    } else if (D.id === 'commons') {
      /* R4's DENSITY LAW: "huge calm movement fields... Every empty area is intentional movement,
         view, future event, quiet space, arrival buffer or an unbuilt defect." COMMONS is the
         intentional emptiness — a very wide field with sparse seating clusters and nothing tall. */
      for (let k = 0; k < 7; k++) {
        const s = -half + (k + 0.5) * (D.span / 7);
        const t = -40 + 90 * frac2(k * 5);
        for (let j = 0; j < 3; j++) P.seat(D.deg, s + (j - 1) * 9, t + (j % 2) * 6, gold(k * 3 + j), j === 1);
        if (k % 3 === 1) P.growth(D.deg, s + 22, t - 26, 5, k * 17);
      }
      P.mast(D.deg, -half + 40, -10, 16, 1); P.mast(D.deg, half - 40, -10, 16, 2);
      /* COMMONS' own overlook is offset along the ring, because the blanket per-district pass at
         the end of this loop also calls P.overlook(D.deg, 0, ...) — and P.overlook derives its
         position entirely from (deg, s), so two calls at s = 0 build two bays in exactly the same
         place: doubled geometry, z-fighting glass and two colliders on one point. */
      P.overlook(D.deg, -150, 56);
      districtSign(D, ...(() => { const [x, z, th] = ringPoint(D.deg, 0, -62); return [x, z, th]; })(), 12);

    } else if (D.id === 'pulse') {
      /* THE DANCE GRID. The event-tile reference, adopted as behaviour and not as palette: a
         modular luminous floor whose tiles react. It is its own material so it can react while the
         sanctuary around it stays calm. */
      const G = 13, T = 6.2;
      for (let i = 0; i < G; i++) {
        for (let j = 0; j < G; j++) {
          const s = (i - (G - 1) / 2) * T, t = (j - (G - 1) / 2) * T;
          const [x, z, th] = ringPoint(D.deg, s, t);
          eventTiles.push({ x, z, th, phase: frac(i * 7 + j * 3), ring: Math.hypot(i - 6, j - 6) });
        }
      }
      /* the RIG: FOBEAM masts around the floor, which is where the music lines live */
      for (let k = 0; k < 8; k++) {
        const a = gold(k * 5) + k * TAU / 8;
        P.mast(D.deg, Math.cos(a) * 62, Math.sin(a) * 62, 22 + 10 * frac(k * 3), k * 11);
      }
      P.screen(D.deg, 0, -74, 34, 18, 0);
      for (const s of [-120, 120]) { P.terrace(D.deg, s, 40, 34, 26, 0.30); P.seat(D.deg, s, 40, 0, true); }
      districtSign(D, ...(() => { const [x, z, th] = ringPoint(D.deg, 0, -92); return [x, z, th]; })(), 22);
      spawnPoints.push({ x: ringPoint(D.deg, 0, 0)[0], z: ringPoint(D.deg, 0, 0)[1], kind: 'event' });

    } else if (D.id === 'table') {
      /* FOOD. Kiosks along a served edge, counters, supported seating in clusters — and the only
         warm light in the sanctuary, inside the counters where LAW-001's exemption allows it. */
      for (let k = 0; k < 6; k++) {
        const s = -half + (k + 0.5) * (D.span / 6);
        P.kiosk(D.deg, s, -46, 0, k * 13);
        for (let j = 0; j < 4; j++) {
          const t = -10 + j * 15;
          P.seat(D.deg, s + (j % 2 ? 5 : -5), t, gold(k * 7 + j), false);
        }
      }
      /* D.span is ALONG the ring (the table says so) and P.terrace's `w` is the RADIAL dimension,
         so this had the dining terrace 240 m deep and 74 m wide — inside out. */
      P.terrace(D.deg, 0, 20, 74, D.span * 0.8, 0.32);
      for (const s of [-90, 90]) P.mast(D.deg, s, 56, 14, s);
      /* ---- THE SERVING CANOPY, and why TABLE needed one -------------------------------------
         L53 at district scale. TABLE's whole vocabulary was six 4.6 m kiosks and twenty-four 3.4 m
         seats spread across a 300 m span: one object every 12 m, each of them dust from any camera
         that can see the district at all, so from the ring HALO TABLE read as bare plate with a
         sign on it. More kiosks would have been more dust.

         What a food district needs is the thing that makes one legible from across a concourse: a
         ROOF. 168 m of it on nine pier pairs, following the ring's curve, with a dark soffit and a
         platinum fascia — so the district has a silhouette at a kilometre, a shaded edge to serve
         under, and somewhere for the warm counter light to bounce. It is the same answer the
         sector architecture gave the open plate, scaled to a district instead of a ring. */
      {
        const BAYS = 9, SPAN = 168, H = 12.5;
        for (let k = 0; k <= BAYS; k++) {
          const sp = -SPAN / 2 + (k * SPAN) / BAYS;
          for (const side of [-1, 1]) {
            const [px, pz, pth] = ringPoint(D.deg, sp, -46 + side * 13);
            put('plat', chamferBox(2.0, H, 2.0, 0.5), mat(px, pz, H / 2, -pth), 0.90);
            put('plat', chamferBox(3.0, 0.6, 3.0, 0.18), mat(px, pz, H - 0.4, -pth + 0.4), 1.0);
          }
        }
        /* the deck itself, laid in bays so it follows the curve rather than chording across it */
        for (let k = 0; k < BAYS; k++) {
          const sc = -SPAN / 2 + ((k + 0.5) * SPAN) / BAYS;
          const [cx, cz, cth] = ringPoint(D.deg, sc, -46);
          put('dark', chamferBox(30, 0.9, SPAN / BAYS * 0.99, 0.3), mat(cx, cz, H + 0.9, -cth), 0.26);
          put('plat', chamferBox(31.5, 0.34, SPAN / BAYS * 0.99, 0.12), mat(cx, cz, H + 1.5, -cth), 1.0);
          /* a square-diamond node over every other bay, so the roof carries the brand figure */
          if (k % 2 === 1) {
            const dg = own(new THREE.OctahedronGeometry(1, 0));
            put('plat', dg, mat(cx, cz, H + 3.4, -cth, 3.0, 2.3, 3.0), 1.0);
          }
        }
        stats.canopyBays = BAYS;
      }
      districtSign(D, ...(() => { const [x, z, th] = ringPoint(D.deg, 0, -66); return [x, z, th]; })(), 14);

    } else if (D.id === 'play') {
      /* THE MINI-GAME FRAMEWORK, as geometry: R4 wants "reusable game boundary, join/leave, score,
         team marker, timer, spectator zone, reset, safe collision". Three bounded arenas with score
         pylons and a spectator tier each — the boundary is a real ring you can see from inside it. */
      for (let g = 0; g < 3; g++) {
        const s = (g - 1) * 108;
        const R = 30;
        for (let k = 0; k < 40; k++) {
          const a = (k / 40) * TAU;
          const [bx, bz, bth] = ringPoint(D.deg, s + Math.cos(a) * R, Math.sin(a) * R);
          /* A BOUNDARY SEGMENT MUST LIE ALONG THE BOUNDARY, and the fix is the YAW ALONE.
             Each of the 40 pieces was yawed to -bth — the ring's radial direction — so all forty
             pointed outward from the world axis and the arena read as a 40-spoke asterisk. The
             circle's tangent at parameter a works out to (cos(a - bth), -sin(a - bth)) in world xz,
             and mat(..., ry) sends local +X to (cos ry, -sin ry): so ry = a - bth and the length
             stays on X. Checked numerically — tangent . localX = 1.0000, tangent . localZ = 0.0000.

             The first correction changed BOTH the yaw and the axis, which is this bug class's own
             trap in reverse: after finding twelve places where the axis was wrong, the reflex is to
             swap the axis everywhere, and here that turned a 4.95 m chord back into a 0.9 m tick.
             The render showed forty dashes around a circle instead of a circle. */
          put('plat', chamferBox(TAU * R / 40 * 1.05, 0.30, 0.9, 0.1), mat(bx, bz, 0.2, -bth + a), 1.0);
        }
        P.terrace(D.deg, s, 0, 40, 40, 0.26);
        for (const side of [-1, 1]) P.mast(D.deg, s + side * 34, -34, 11 + 3 * g, g * 5 + side);
        P.seat(D.deg, s, 46, 0, true); P.seat(D.deg, s - 10, 52, 0, true); P.seat(D.deg, s + 10, 52, 0, true);
        stats.gameZones++;
        spawnPoints.push({ x: ringPoint(D.deg, s, 0)[0], z: ringPoint(D.deg, s, 0)[1], kind: 'game' });
      }
      districtSign(D, ...(() => { const [x, z, th] = ringPoint(D.deg, 0, -60); return [x, z, th]; })(), 12);

    } else if (D.id === 'quiet') {
      /* LOW STIMULATION, and that is a real constraint: no masts, no screens, no event tiles, and
         the widest spacing on the ring. R4's DENSITY LAW calls this "quiet space" and it is one of
         the six legitimate reasons for an empty area. */
      for (let k = 0; k < 11; k++) {
        const s = -half + (k + 0.5) * (D.span / 11);
        const t = -50 + 110 * frac(k * 7);
        P.growth(D.deg, s, t, 6 + Math.round(4 * frac2(k * 3)), k * 23);
        if (k % 2 === 0) P.seat(D.deg, s + 14, t + 12, gold(k), false);
      }
      P.overlook(D.deg, -110, 44); P.overlook(D.deg, 110, 44);
      districtSign(D, ...(() => { const [x, z, th] = ringPoint(D.deg, 0, -64); return [x, z, th]; })(), 10);

    } else if (D.id === 'forum') {
      /* A STEPPED AMPHITHEATRE facing a speaker platform. R4: "small meetings through large
         gatherings, speaker focus, holographic presentation... Presenters are canonical MAHBEINGS." */
      for (let k = 0; k < 7; k++) {
        const t = 20 + k * 11;
        const w = 150 - k * 6;
        const [x, z, th] = ringPoint(D.deg, 0, t);
        /* THE TIERS STEP RADIALLY, SO A TREAD SPANS TANGENTIALLY. t = 20 + k*11 moves each tier
           11 m further out across the ring, and the tread's 150 m was authored on local X — also
           radial — so seven treads each 150 m deep overlapped one another almost completely and the
           amphitheatre was a solid block, not a stair. The 9 m is the radial depth of one step. */
        put('dark', chamferBox(9, 1.5 + k * 0.9, w, 0.3), mat(x, z, (1.5 + k * 0.9) * 0.5, -th), 0.30 + 0.05 * k);
        /* §07 again: a 150 m tread in platinum is a 150 m mirror. The TREAD is dark and the NOSING —
           the front lip, the part that is nearly vertical to a seated eye — carries the metal. That
           is also how a real stepped auditorium reads: the edge catches, the seat does not. */
        /* AND THE VALUE MATTERS AS MUCH AS THE AXIS. The first cut gave these tread tops 0.42 rising
           to 0.66 — bright vertex values on a plated dark material, seven of them, each 150 m long.
           Photographed from the auditorium floor they were seven horizontal white bands and the
           amphitheatre read as a multi-storey car park. §07 does not stop at material choice: a
           near-black surface painted 0.66 is not near-black. The tread is 0.18, the NOSING keeps the
           metal, and the step reads because its front lip catches while its seat does not. */
        put('dark', chamferBox(9.4, 0.2, w, 0.08), mat(x, z, 1.5 + k * 0.9, -th), 0.18 + 0.02 * k);
        const [nx2, nz2] = ringPoint(D.deg, 0, t - 4.4);
        put('plat', chamferBox(0.6, 0.34, w, 0.1), mat(nx2, nz2, 1.62 + k * 0.9, -th), 1.0);
      }
      P.terrace(D.deg, 0, -34, 56, 34, 0.40);
      P.screen(D.deg, 0, -62, 40, 20, 0);
      for (const side of [-1, 1]) P.mast(D.deg, side * 78, -40, 17, side);
      if (ctx && ctx.residentSpots) {
        const [sx, sz] = ringPoint(D.deg, 0, -34);
        ctx.residentSpots.push({ x: sx, y: haloHeight(sx, sz) + 1.7, z: sz, facing: -D.deg * Math.PI / 180,
          id: 'halo-forum-speaker', colour: 'platinum', physique: 0.55, sex: 'f', pose: 'explain',
          seed: 501, lod: 'near', note: 'presenting at HALO FORUM' });
      }
      districtSign(D, ...(() => { const [x, z, th] = ringPoint(D.deg, 0, -86); return [x, z, th]; })(), 24);

    } else if (D.id === 'stage') {
      /* THE BIG ONE. A stage shell, a performer platform, a crowd field, flanking screens and a
         light-sculpture rig. R4 allows "a sanctuary relay of the giant civic authority hologram" —
         the relay's PLINTH is here; broadcast.js already owns what stands on it. */
      const [sx, sz, sth] = ringPoint(D.deg, 0, -78);
      /* the deck's LONG axis is tangential — it faces a crowd sitting outboard and its proscenium
         piers are spaced tangentially. Authored on local X the stage was 96 m DEEP and 40 m wide,
         the wrong way round to everything built around it. */
      put('dark', chamferBox(40, 4.0, 96, 1.2), mat(sx, sz, 2.0, -sth), 0.26);
      /* §07: the deck a performer stands on is dark; the platinum is its edge (see kerb above) */
      put('dark', chamferBox(44, 0.4, 100, 0.16), mat(sx, sz, 4.2, -sth), 0.46);
      kerb(sx, sz, -sth, 44, 100, 4.5);
      /* the shell: three arched ribs over the stage, so it has a silhouette from the whole ring */
      for (let k = 0; k < 3; k++) {
        const t = -78 + k * 13, h = 40 - k * 6, w = 92 - k * 10;
        const [ax, az, ath] = ringPoint(D.deg, 0, t);
        /* A PROSCENIUM SPANS THE WAY ITS PIERS ARE SPACED, and the first cut did not: the piers were
           offset TANGENTIALLY (correctly — the crowd sits outboard, so the arch opens across their
           view) while the crossbeam was authored along local X, which mat(..., -ath) sends RADIALLY.
           Three beams floated in the air ninety degrees to the piers under them. The span is the Z
           dimension now, which is the tangential one.
           The piers also carry L58's ratio: 2.4 m at 40 m is 16.7:1, the slenderness that made
           mahascent's masts a picket fence. */
        const pw = Math.max(2.4, h / 7);
        for (const side of [-1, 1]) {
          put('plat', chamferBox(pw, h, pw, pw * 0.28),
            mat(ax + Math.cos(ath + Math.PI / 2) * side * w * 0.5, az + Math.sin(ath + Math.PI / 2) * side * w * 0.5, h / 2, -ath), 0.88);
        }
        put('plat', chamferBox(3.2, 2.6, w, 0.8), mat(ax, az, h, -ath), 1.0);
      }
      P.screen(D.deg, -62, -70, 26, 15, 0); P.screen(D.deg, 62, -70, 26, 15, 0);
      for (let k = 0; k < 6; k++) P.mast(D.deg, -110 + k * 44, -30, 26 + 9 * frac(k * 5), k * 7);
      /* the crowd field: an event-tile band in front of the stage */
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 6; j++) {
          const s = (i - 7.5) * 8.4, t = -20 + j * 8.4;
          const [x, z, th] = ringPoint(D.deg, s, t);
          eventTiles.push({ x, z, th, phase: frac(i * 3 + j * 11), ring: Math.hypot(i - 7.5, j) });
        }
      }
      for (const s of [-140, 140]) { P.terrace(D.deg, s, 40, 40, 30, 0.30); P.seat(D.deg, s, 40, 0, true); }
      districtSign(D, ...(() => { const [x, z, th] = ringPoint(D.deg, 0, -104); return [x, z, th]; })(), 46);
      spawnPoints.push({ x: ringPoint(D.deg, 0, 10)[0], z: ringPoint(D.deg, 0, 10)[1], kind: 'crowd' });
    }

    /* every district gets one connector run of low guide lights along the ring toward the next —
       R4's "medium connectors", and the thing that makes eight places one sanctuary */
    for (let k = 0; k < 9; k++) {
      const s = -half - 60 + k * ((D.span + 120) / 8);
      const [x, z, th] = ringPoint(D.deg, s, -6);
      put('plat', chamferBox(2.2, 0.18, 0.7, 0.06), mat(x, z, 0.12, -th), 1.0);
    }
    /* R4 devotes a whole clause to the views down — "Preserve dramatic overlooks to Civic City, Lake
       City, Rainforest City, mountains, moon" — and the first cut gave only three districts one, so
       five of the eight bearings had no way to look at the world at all. Every district now reaches
       the inner rim: eight overlooks ring the hole, which is also what makes the inner edge read as
       an authored lip from every camera rather than as where the geometry happened to stop. The
       three districts that authored their own above keep them and get this one alongside; ARRIVAL is
       the exception because the concourse spine already lands there. */
    if (D.id !== 'arrival') P.overlook(D.deg, 0, 52);
    /* THESE ARE THIS DISTRICT'S OWN COUNTS. stats.seats/kiosks/overlooks are sanctuary-wide running
       totals that no one resets between districts, so snapshotting them verbatim recorded a
       cumulative prefix sum — QUIET appeared to have every seat built before it. */
    rec.parts = { seats: stats.seats - pre.seats, kiosks: stats.kiosks - pre.kiosks,
      overlooks: stats.overlooks - pre.overlooks };
    stats.districts.push(rec);
  }

  /* ================================================================================================
     THE ASCENT DOCK — three raked beams from the transfer decks up to HALO ARRIVAL
     ================================================================================================ */
  {
    const decks = opts.transferDecks || [];
    /* ---- WHERE THE BEAMS LAND, and why it is NOT the arrival gateway --------------------------
       The first cut aimed these at ringPoint(-90, 0, -70) — the gateway, 70 m inside the MIDLINE,
       which is 1980 m from the world axis. The three transfer decks stand within 40 m of that axis
       at 700 m up. Measured, that beam is a 1980 m horizontal run against an 1100 m climb: 61° off
       vertical, a near-horizontal wire drawn across two kilometres of sky. Nothing about it reads as
       docking into anything, and it contradicts this file's own header ("36° off vertical over a
       1100 m climb"), which was written for the geometry below and not for what got built.

       The beams land at the INNER RIM instead, at r 760 — just inside the lip, directly over the
       hole the plaza keeps its sky through. From (0, 700) to (0, -760) is a 730 m run against a
       1136 m climb: 32.7° off vertical, the cable-car angle the header describes, and it arrives
       at the one place on the whole ring where you can turn round and look straight back down at
       where you came from.

       That leaves 1220 m of ring between the dock and the arrival gateway, and R3's density law is
       explicit that an unauthored gap is a defect. So the gap is not left: THE CONCOURSE SPINE
       below is a radial promenade that walks you out from the dock to the district. Arrival becomes
       a progression — deck, climb, rim, spine, gateway, ring — instead of a drop onto a pad. */
    const DOCK_R = HALO.R_IN + 60;
    const dth = -90 * Math.PI / 180;
    const dockCx = Math.cos(dth) * DOCK_R, dockCz = Math.sin(dth) * DOCK_R;
    /* (the gateway coordinates the first cut aimed at are gone with it — the beams land on the
       pier at DOCK_R now, so nothing here needs ringPoint(-90, 0, -70) any more) */
    const beamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.24,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: true
    });
    beamMat.name = 'halo-dock-beam'; owned.materials.push(beamMat);
    const packMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.70,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: true
    });
    packMat.name = 'halo-dock-packet'; owned.materials.push(packMat);
    const dockCurves = [];
    decks.forEach((d, i) => {
      /* each beam leaves its transfer deck vertically, then rakes out to the pier — a straight line
         from 700 m to 1836 m would leave the deck sideways, which reads as a wire and not as a
         route. The lift-then-rake is the same shape travel.js gives a flight. */
      const spread = (i - (decks.length - 1) / 2) * 30;
      const ax = dockCx + Math.cos(dth + Math.PI / 2) * spread, az = dockCz + Math.sin(dth + Math.PI / 2) * spread;
      const ay = haloHeight(ax, az);
      const pts = [
        new THREE.Vector3(d.x, d.y + 2, d.z),
        new THREE.Vector3(d.x + (ax - d.x) * 0.06, d.y + 170, d.z + (az - d.z) * 0.06),
        new THREE.Vector3(d.x + (ax - d.x) * 0.44, d.y + (ay - d.y) * 0.54, d.z + (az - d.z) * 0.44),
        new THREE.Vector3(d.x + (ax - d.x) * 0.86, ay - 110, d.z + (az - d.z) * 0.86),
        new THREE.Vector3(ax, ay + 4, az)
      ];
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      dockCurves.push({ curve, phase: frac(i * 7 + 3), rate: 0.055 + 0.02 * frac(i * 5) });
      const tube = own(new THREE.TubeGeometry(curve, 140, 1.7, 5, false));
      const m = new THREE.Mesh(tube, beamMat);
      m.name = 'halo-dock-' + i; m.frustumCulled = false; m.renderOrder = 4;
      group.add(m); stats.draws++; stats.dockBeams++;
      stats.triangles += tube.index.count / 3;
      /* THE PIER: a real structure where the beam meets the ring, so it lands ON something. It faces
         out along the radius, so stepping off it puts the whole sanctuary in front of you and the
         hole — with MAHPLAZA 1836 m straight down it — behind. */
      const rot = -dth + Math.PI / 2;
      /* §07: the pier's mass is dark and its edge is metal — the first surface a viewer's feet
         touch in MAH HALO obeys the same floor law as the plaza they left */
      put('dark', chamferBox(16, 2.4, 22, 0.7), mat(ax, az, 1.2, rot), 0.30);
      put('dark', chamferBox(15, 0.5, 21, 0.2), mat(ax, az, 2.5, rot), 0.48);
      kerb(ax, az, rot, 16, 22, 2.7);
      /* two collar piers and a keystone diamond: the arrival aperture, the brand figure at the top */
      for (const side of [-1, 1]) {
        const px = ax + Math.cos(dth) * 0 + Math.cos(dth + Math.PI / 2) * side * 7.4;
        const pz = az + Math.sin(dth + Math.PI / 2) * side * 7.4;
        put('plat', chamferBox(2.0, 11, 2.0, 0.5), mat(px, pz, 5.5 + 2.5, rot), 0.90);
      }
      /* THE KEYSTONE SITS ON ITS LINTEL, NOT ABOVE IT — and the number that matters is the diamond's
         EQUATOR, not its lower vertex. An octahedron's bottom half is a thin taper that reads as
         nothing; what the eye calls "the diamond" is the widest band. Placing the lower vertex just
         above the lintel therefore still looks like a diamond floating three metres clear, which is
         what the first two attempts produced. The equator goes 1.7 m over the lintel top and the
         lower pyramid disappears INTO it, so the figure is carried. */
      const kd = own(new THREE.OctahedronGeometry(1, 0));
      for (const side of [-1, 1]) {
        const cx = ax + Math.cos(dth + Math.PI / 2) * side * 7.4;
        const cz = az + Math.sin(dth + Math.PI / 2) * side * 7.4;
        put('plat', chamferBox(3.2, 1.1, 3.2, 0.35), mat(cx, cz, 13.4, rot + 0.4), 1.0);
      }
      put('plat', chamferBox(2.4, 1.3, 17.6, 0.4), mat(ax, az, 14.2, rot), 1.0);
      put('plat', kd, mat(ax, az, 16.55, rot, 4.0, 3.2, 4.0), 1.0);
      musicSites.push({ x: ax + Math.cos(dth) * 9, y: ay + 2.8, z: az + Math.sin(dth) * 9, ry: rot, scale: 3.0 });
      spawnPoints.push({ x: ax, z: az, kind: 'dock' });
    });

    /* ---- THE CONCOURSE SPINE — 1220 m of authored radial promenade ------------------------------
       R3's density law: "every empty area is intentional movement, view, future event, quiet space,
       arrival buffer or an unbuilt defect." This one is MOVEMENT, and it is authored as movement:
       a dark walking channel with a platinum kerb either side, paired masts at a walkable rhythm,
       benches at every third bay and a lit overlook cut into the channel at the halfway point.

       The rhythm is 88 m — a bay you can see the end of from its start, which is what stops a
       kilometre of promenade reading as a corridor. Everything sits along the SHELL NORMAL like the
       rest of the ring, which over 1220 m of radius is a 3.0 m rise the eye reads as a gentle
       incline rather than as a flat plane cheating. */
    {
      const SP_IN = DOCK_R + 26, SP_OUT = HALO.R_MID - 84;
      const BAY = 88, bays = Math.max(1, Math.round((SP_OUT - SP_IN) / BAY));
      const along = (r, lat) => [Math.cos(dth) * r + Math.cos(dth + Math.PI / 2) * lat,
                                 Math.sin(dth) * r + Math.sin(dth + Math.PI / 2) * lat];
      const rot = -dth + Math.PI / 2;
      for (let b = 0; b < bays; b++) {
        const r0 = SP_IN + b * BAY, rc = r0 + BAY * 0.5;
        const [cx, cz] = along(rc, 0);
        /* the channel: dark deck, and a platinum kerb on each side that carries the horizon */
        put('dark', chamferBox(26, 0.5, BAY * 0.98, 0.2), mat(cx, cz, 0.28, rot), 0.30);
        for (const side of [-1, 1]) {
          const [kx, kz] = along(rc, side * 13.6);
          put('plat', chamferBox(1.6, 0.42, BAY * 0.98, 0.14), mat(kx, kz, 0.42, rot), 0.98);
        }
        /* paired masts at every bay head — the FOBEAM motif walking you outward */
        for (const side of [-1, 1]) {
          const [mx, mz] = along(r0, side * 17);
          const mh = 13 + 5 * frac(b * 7 + (side > 0 ? 1 : 0));
          put('plat', chamferBox(1.3, mh, 1.3, 0.34), mat(mx, mz, mh / 2, rot), 0.88);
          put('plat', chamferBox(2.2, 0.4, 2.2, 0.12), mat(mx, mz, mh - 0.3, rot + 0.4), 1.0);
          const md = own(new THREE.OctahedronGeometry(1, 0));
          put('plat', md, mat(mx, mz, mh + 2.0, rot, 1.7, 1.35, 1.7), 1.0);
          if (b % 2 === 0) musicSites.push({ x: mx + Math.cos(dth) * 2.4, y: haloHeight(mx, mz) + 0.9, z: mz + Math.sin(dth) * 2.4, ry: rot, scale: 2.0 });
        }
        /* a bench pair every third bay: somewhere to stop on a kilometre of walking */
        if (b % 3 === 1) {
          for (const side of [-1, 1]) {
            const [sx, sz] = along(rc, side * 10);
            put('dark', chamferBox(7.5, 0.34, 1.5, 0.16), mat(sx, sz, 0.86, rot), 0.44);
            put('plat', chamferBox(3.1, 0.85, 1.0, 0.22), mat(sx, sz, 0.42, rot), 0.80);
            put('plat', chamferBox(7.5, 0.14, 0.34, 0.06), mat(sx, sz, 1.06, rot), 1.0);
            stats.seats++;
          }
        }
        stats.spineBays = (stats.spineBays || 0) + 1;
      }
      /* the halfway VIEW CUT: a glazed panel in the channel floor, so the spine has a moment in it */
      const [hx, hz] = along((SP_IN + SP_OUT) * 0.5, 0);
      put('dark', chamferBox(22, 0.6, 16, 0.3), mat(hx, hz, 0.30, rot), 0.26);
      put('glass', chamferBox(17, 0.20, 11, 0.06), mat(hx, hz, 0.56, rot), 0.44);
      for (const side of [-1, 1]) {
        const [px, pz] = along((SP_IN + SP_OUT) * 0.5, side * 9.6);
        put('plat', chamferBox(1.0, 1.25, 12, 0.28), mat(px, pz, 0.9, rot), 0.96);
      }
      spawnPoints.push({ x: hx, z: hz, kind: 'spine' });
      stats.spine = { inner: SP_IN, outer: SP_OUT, bays, length: +(SP_OUT - SP_IN).toFixed(1) };
    }
    /* packets climbing the dock: the route is USED */
    const dockPackGeo = own(new THREE.OctahedronGeometry(1, 0));
    dockPackGeo.scale(2.0, 3.0, 2.0);
    const dockPackets = new THREE.InstancedMesh(dockPackGeo, packMat, Math.max(1, dockCurves.length * 12));
    dockPackets.name = 'halo-dock-packets'; dockPackets.frustumCulled = false; dockPackets.renderOrder = 5;
    dockPackets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(dockPackets); stats.draws++;
    var _dockCurves = dockCurves, _dockPackets = dockPackets;
  }

  /* ---- EVENT TILES, one instanced family across PULSE and STAGE ------------------------------- */
  let eventMesh = null;
  {
    const geo = own(chamferBox(5.9, 0.30, 5.9, 0.14));
    eventMesh = new THREE.InstancedMesh(geo, eventMat, Math.max(1, eventTiles.length));
    eventMesh.name = 'halo-event-tiles'; eventMesh.frustumCulled = false;
    eventMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < eventTiles.length; i++) {
      const T = eventTiles[i];
      eventMesh.setMatrixAt(i, mat(T.x, T.z, 0.30, -T.th));
    }
    eventMesh.instanceMatrix.needsUpdate = true;
    group.add(eventMesh); stats.draws++;
    stats.eventTiles = eventTiles.length;
  }

  /* ---- emit the merged buckets ---------------------------------------------------------------- */
  const MATS = { plat: platinum, dark: darkMat, glass: glassMat };
  for (const k of Object.keys(B)) {
    if (!B[k].length) continue;
    const mesh = new THREE.Mesh(own(mergeSolids(B[k])), MATS[k]);
    mesh.name = 'halo-d-' + k;
    mesh.frustumCulled = false;
    if (k === 'glass') { mesh.renderOrder = 3; }
    group.add(mesh); stats.draws++;
    stats.triangles += mesh.geometry.attributes.position.count / 3;
  }
  for (const k of Object.keys(B)) for (const it of B[k]) {
    if (it.geo && it.geo.dispose && owned.geometries.indexOf(it.geo) < 0) it.geo.dispose();
  }

  /* ---- R4: every FOBEAM keeps the mini vertical music line ------------------------------------ */
  const musicLines = createMusicLineField(ctx, musicSites, { name: 'halo-musicline', opacity: 0.72 });
  if (musicLines && musicLines.group) { group.add(musicLines.group); stats.draws++; }

  stats.spawnPoints = spawnPoints.length;
  stats.hostiles = 0;   /* R4 PEACEFULNESS: asserted by the law suite, not merely intended */

  /* ---- LAW 2, ON THE RING AND NOT ON THE GROUND ------------------------------------------------
     The first draft of this called ctx.lightPool. That is ground.js's pool family and it lays its
     ellipses on the PLAZA DECK — writePool ignores x,z distance and defaults y to POOL_Y ≈ 0.24. So
     eight district pools at radius 2050 would have painted eight glowing ovals onto the terrain
     1800 m BELOW the sanctuary, answering nothing and inventing eight defects; ground.js says so in
     its own comment ("only serves the plaza deck") and broadcast.js already learned it at 185 m.
     LAW 2 is not "call the pool function", it is "every emitter is answered on the surface it stands
     on" — so the halo answers its own, on its own floor, along its own normal, in one draw. */
  {
    const poolTex = new THREE.CanvasTexture(poolCanvas());
    poolTex.name = 'halo-pool'; owned.textures.push(poolTex);
    const poolMat = new THREE.MeshBasicMaterial({
      map: poolTex, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending,
      depthWrite: false, fog: true, side: THREE.DoubleSide
    });
    poolMat.name = 'halo-pool'; owned.materials.push(poolMat);
    /* authored in the XZ plane so mat()'s shell quaternion lands it flat on the curved deck */
    const poolGeo = own(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    const pools = new THREE.InstancedMesh(poolGeo, poolMat, DISTRICTS.length * 2 + musicSites.length);
    pools.name = 'halo-district-pools'; pools.frustumCulled = false; pools.renderOrder = 5;
    let np = 0;
    for (const D of DISTRICTS) {
      const [x, z, th] = ringPoint(D.deg, 0, 0);
      /* §07's correction (v11 §100: pools washed the black floor pale) says a pool over a near-black
         reflective deck is a WIDE, WEAK gradient, never a bright disc. 0.10 across 400 m is a breath. */
      /* sx is RADIAL and sz is TANGENTIAL under mat(..., -th). D.span is the district's extent
         ALONG the ring and 170 is the band ACROSS it, so the two were swapped: every pool was
         stretched hundreds of metres across the ring's width and cut short along its length. */
      pools.setMatrixAt(np++, mat(x, z, 0.34, -th, 170, 1, D.span * 0.9));
      const [gx, gz, gth] = ringPoint(D.deg, 0, -30);
      pools.setMatrixAt(np++, mat(gx, gz, 0.36, -gth, 78, 1, 54));
    }
    /* every music mast is an emitter and gets its own answer at its own scale */
    for (const S of musicSites) {
      const th = Math.atan2(S.z, S.x);
      pools.setMatrixAt(np++, mat(S.x, S.z, 0.32, -th, 15, 1, 15));
    }
    pools.count = np;
    pools.instanceMatrix.needsUpdate = true;
    group.add(pools); stats.draws++; stats.pools = np;
    var _pools = poolMat;
  }

  /* EVERY material carrying the injected grid uniforms. One list, so setTime / setTheme / update
     cannot drive one and forget the other — the exact defect halo.js had with its near tiles. */
  const GRIDDED = [eventMat, darkMat];

  const _mm = new THREE.Matrix4(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(),
    _ee = new THREE.Euler(), _ss = new THREE.Vector3();
  let quiet = false, state = 'BASE_IDLE';

  return {
    group, stats, districts: DISTRICTS, spawnPoints,
    /* MAH NAV reads this: every district is a fast-travel destination once discovered */
    navSites: () => DISTRICTS.map(D => {
      const [x, z] = ringPoint(D.deg, 0, D.id === 'arrival' ? -20 : -30);
      return { id: 'halo-' + D.id, label: D.label, sub: D.sub, x, z, y: haloHeight(x, z) + 1.9,
        look: [ringPoint(D.deg, 0, 60)[0], haloHeight(x, z) + 14, ringPoint(D.deg, 0, 60)[1]] };
    }),
    setState(s) {
      state = s || 'BASE_IDLE';
      const u = eventMat.userData.haloUniforms;
      if (u) u.uHaloGain.value.y = (state === 'EVENT' || state === 'MUSIC_ACTIVE') ? 0.95 : 0.62;
      return state;
    },
    update(t) {
      if (quiet) return;
      if (_dockPackets && _dockCurves) {
        let n = 0;
        for (let c = 0; c < _dockCurves.length; c++) {
          const C = _dockCurves[c];
          for (let k = 0; k < 12; k++) {
            const u = (t * C.rate + C.phase + k / 12) % 1;
            C.curve.getPoint(u, _pp);
            const s = 0.8 + 0.5 * (1 - u);
            _ee.set(0, gold(c * 13 + k) + t * 0.6, 0); _qq.setFromEuler(_ee); _ss.set(s, s, s);
            _dockPackets.setMatrixAt(n++, _mm.compose(_pp, _qq, _ss));
          }
        }
        _dockPackets.instanceMatrix.needsUpdate = true;
      }
      /* BOTH gridded materials, not just the event tiles. darkMat carries the same injected
         uniforms now (see applyHaloGrid on it above), and leaving it out of these three drivers is
         exactly the silent failure halo.js already had with its near-tile material: the district
         decks would keep a stale line colour and a frozen breath while everything else moved. */
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.9);
      const band = (state === 'EVENT' || state === 'MUSIC_ACTIVE') ? (t * 0.22) % 1 : 0;
      for (const m of GRIDDED) {
        const u = m.userData.haloUniforms; if (!u) continue;
        u.uHaloPulse.value = pulse;
        /* the travelling band belongs to the EVENT FLOOR. A whole sanctuary pulsing in unison is
           the strobe R3-12 and R4 both forbid, so the district decks only breathe. */
        if (m === eventMat) u.uHaloBand.value = band;
      }
      if (musicLines && musicLines.update) musicLines.update(t);
    },
    setTime(s) {
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      interiorWarm.opacity = 0.10 + 0.26 * night;
      /* the answer follows the emitter: by day the sanctuary reads on its own reflections */
      if (_pools) _pools.opacity = 0.08 + 0.26 * night;
      signMats.forEach(m => { m.opacity = 0.5 + 0.42 * night; });
      for (const m of GRIDDED) {
        const u = m.userData.haloUniforms; if (!u) continue;
        u.uHaloLine.value.setHex(theme.energyLight || 0xdff1ff).multiplyScalar(0.4 + 0.6 * night);
      }
      if (musicLines && musicLines.setTime) musicLines.setTime(s);
    },
    setTheme(th) {
      if (!th || th.energyLight == null) return;
      for (const m of GRIDDED) {
        const u = m.userData.haloUniforms; if (u) u.uHaloLine.value.setHex(th.energyLight);
      }
      if (musicLines && musicLines.setTheme) musicLines.setTheme(th);
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      quiet = !!low;
      if (_dockPackets) _dockPackets.visible = !low;
      if (musicLines && musicLines.setQuality) musicLines.setQuality(q);
    },
    dispose() {
      if (musicLines && musicLines.dispose) musicLines.dispose();
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      owned.textures.forEach(tx => tx.dispose && tx.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

/* a soft elliptical falloff, drawn once. Deliberately not a hard-edged disc: §07's floor is a near
   mirror and the thing that reads on it is a gradient, not a shape with a rim. */
function poolCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0.00, 'rgba(190,222,255,0.95)');
  rg.addColorStop(0.34, 'rgba(150,196,246,0.42)');
  rg.addColorStop(0.68, 'rgba(110,160,220,0.12)');
  rg.addColorStop(1.00, 'rgba(80,130,200,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  return c;
}

function mergeSolids(list) {
  let n = 0;
  for (const it of list) { const g = it.geo; n += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const nm = new THREE.Matrix3(), v = new THREE.Vector3();
  let o = 0;
  for (const it of list) {
    const g = it.geo, P = g.attributes.position, N = g.attributes.normal;
    const idx = g.index ? g.index.array : null;
    nm.getNormalMatrix(it.matrix);
    const take = i => {
      v.fromBufferAttribute(P, i).applyMatrix4(it.matrix);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
      col[o * 3] = col[o * 3 + 1] = col[o * 3 + 2] = it.value;
      o++;
    };
    if (idx) { for (let i = 0; i < idx.length; i++) take(idx[i]); }
    else { for (let i = 0; i < P.count; i++) take(i); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 3), 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, o * 3), 3));
  out.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, o * 3), 3));
  return out;
}

export default { buildHaloDistricts, DISTRICTS };
