/* MAHPLAZA :: GROUND PLAN
   Three understandable surface layers (brief §08 / notes §12):
   1. the central pedestrian plaza — broad, dark, polished, mostly uninterrupted;
   2. sidewalks / building aprons — slightly raised, materially different;
   3. vehicle corridors — smooth dark lanes at the district edges with
      restrained blue-white markers, curving away so the city continues.
   Plus the MAHPLAZA civic marker (not MAHWORLD: MAHWORLD is the universe),
   a few seating blocks, and the planter spots the flora module fills.
   Deliberately sparse: pavement stays pavement. */
import * as THREE from '../vendor/three/three.module.min.js';
import { canvasTexture, diamondOutline, chamferBox, fobMark } from './materials.js';
import { SITES } from './buildings.js';

export const PLAZA_RADIUS = 27;
/* THE HERO SURFACE (v5 §05): the plaza floor is laid in ARCHITECTURAL-SCALE diamond cells — nine metres
   across, the width of a room, not a tile pattern. A resident standing on one covers a fifth of it. */
export const DIAMOND_CELL = 9.0;
const HERO_RADIUS = 28;      /* the polished hero field around the marker */
const FIELD_RADIUS = 43;     /* the satin field that carries it out to the aprons and the corridor edge */
export const FLOOR_TOP = 0.17;   /* the laid floor's deck level: everything inlaid sits on THIS, not on y = 0 */

/* merge a list of geometries into one static BufferGeometry (position + normal); disposes the inputs */
function mergeGeos(list) {
  let n = 0;
  const parts = list.map(g => { const o = g.index ? g.toNonIndexed() : g; if (!o.attributes.normal) o.computeVertexNormals(); if (o !== g) g.dispose(); n += o.attributes.position.count; return o; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) { const c = p.attributes.position.count; pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); o += c; p.dispose(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}

export function buildGround(ctx) {
  const { M, scene, reflect } = ctx;
  const g = new THREE.Group(); g.name = 'ground';

  /* 1. plaza: polished dark ground, semi-transparent over black so mirrored
     emissives read as wet reflections (see the assembly's reflection group) */
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(260, 260, 1, 1), M.plaza);
  plaza.rotation.x = -Math.PI / 2; plaza.renderOrder = 2; plaza.receiveShadow = true; g.add(plaza);
  /* the diamond roughness map is scaled so ONE painted diamond matches ONE modelled cell (9 m) */
  if (M.plaza.roughnessMap) { const r = 260 / (4 * DIAMOND_CELL); M.plaza.roughnessMap.repeat.set(r, r); }
  if (M.plaza.bumpMap) { const r = 260 / (4 * DIAMOND_CELL); M.plaza.bumpMap.repeat.set(r, r); }

  /* ---------------------------------------------------------------------------------------------
     THE HERO CHROMIUM DIAMOND FLOOR (brief §05)
     The plaza is not a dark plane any more. It is a laid chromium floor of nine-metre diamond cells,
     each a shallow slab with a chamfered bevel that catches the moon and the entrance lights, set in
     mirror-grade joint catches. Two grades: a super-polished hero field inside 30 m, a satin field
     carrying it out to the aprons — so the eye is drawn to the centre and the floor still reads at the
     edge of frame. Cells are semi-transparent over the mirrored emissive copies the assembly builds
     under the floor, so what MAHWORLD reflects is what MAHWORLD is made of.
     Cost: three merged meshes, ~140 cells, no per-frame work.                                       */
  const heroMat = new THREE.MeshStandardMaterial({ color: 0x1c2637, roughness: 0.09, metalness: 0.97, envMapIntensity: 2.2, transparent: true, opacity: 0.88, flatShading: true });
  const satinMat = new THREE.MeshStandardMaterial({ color: 0x161f2d, roughness: 0.24, metalness: 0.93, envMapIntensity: 1.7, transparent: true, opacity: 0.93, flatShading: true });
  const contrastMat = new THREE.MeshStandardMaterial({ color: 0x27344a, roughness: 0.16, metalness: 0.95, envMapIntensity: 2.0, transparent: true, opacity: 0.9, flatShading: true });
  ctx.floorMaterials = [heroMat, satinMat, contrastMat];
  {
    const hero = [], satin = [], contrast = [], joints = [], outerJoints = [];
    const inset = 0.42;                                   /* the joint width between two cells */
    const cellGeo = chamferBox(DIAMOND_CELL - inset, 0.17, DIAMOND_CELL - inset, 0.15);
    const half = Math.ceil(FIELD_RADIUS / DIAMOND_CELL) + 1;
    const _m = new THREE.Matrix4();
    /* the lattice is built axis-aligned then rotated 45°, which is what makes every cell a DIAMOND */
    for (let i = -half; i <= half; i++) for (let j = -half; j <= half; j++) {
      const x = i * DIAMOND_CELL, z = j * DIAMOND_CELL, r = Math.hypot(x, z);
      if (r > FIELD_RADIUS) continue;
      const geo = cellGeo.clone();
      /* a shallow per-cell tilt (< 0.4°): each cell takes its own value under one light, which is what
         separates a laid floor from a printed pattern. Deterministic, never animated. */
      const t = ((i * 7 + j * 13) % 5 - 2) * 0.0016;
      geo.applyMatrix4(_m.makeRotationX(t)); geo.applyMatrix4(_m.makeRotationZ(t * 0.7));
      geo.translate(x, 0.085, z);
      const contrasty = ((i * 5 + j * 3) % 7 === 0);
      (r < HERO_RADIUS ? (contrasty ? contrast : hero) : satin).push(geo);
      /* joint catches: every joint is filled so the floor never shows a black gap. Inside the hero field
         they are mirror-grade and draw the eye to the centre; outside they drop to satin, which is what
         keeps the outer floor reading as laid construction without competing with the middle. */
      for (const [dx, dz, w, d] of [[DIAMOND_CELL / 2, 0, inset * 0.66, DIAMOND_CELL + inset], [0, DIAMOND_CELL / 2, DIAMOND_CELL + inset, inset * 0.66]]) {
        const jr = Math.hypot(x + dx, z + dz);
        if (jr > FIELD_RADIUS) continue;
        /* the catch fills the joint and stops a hair below the cell tops, so it reads as a bright
           hairline turning between two slabs — never as a black gap or a glowing grid line */
        const jg = chamferBox(w, 0.16, d, 0.035); jg.translate(x + dx, 0.077, z + dz);
        (jr < HERO_RADIUS ? joints : outerJoints).push(jg);
      }
    }
    cellGeo.dispose();
    const field = new THREE.Group(); field.rotation.y = Math.PI / 4; field.name = 'plaza-diamond-floor'; g.add(field);
    const add = (list, mat, name) => { if (!list.length) return; const mesh = new THREE.Mesh(mergeGeos(list), mat); mesh.name = name; mesh.receiveShadow = true; mesh.renderOrder = 3; field.add(mesh); };
    add(satin, satinMat, 'floor-satin-field');
    add(hero, heroMat, 'floor-hero-field');
    add(contrast, contrastMat, 'floor-contrast-cells');
    add(outerJoints, M.trimSatin, 'floor-joint-catches-outer');
    add(joints, M.trim, 'floor-joint-catches');
  }
  /* MAHGIC routing channels: four thin inlaid lines running from the disc edge out toward the district,
     the city's energy grid passing under the plaza — restrained, never a glowing cage */
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 46), M.energySoft);
    ch.position.set(Math.cos(a) * (PLAZA_RADIUS + 25), FLOOR_TOP + 0.03, Math.sin(a) * (PLAZA_RADIUS + 25));
    ch.rotation.y = -a + Math.PI / 2; g.add(ch);
  }
  const under = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x02040a, fog: false }));
  under.rotation.x = -Math.PI / 2; under.position.y = -80; g.add(under);

  /* the circulation ring: one restrained inset ring at the plaza edge */
  const ring = new THREE.Mesh(new THREE.RingGeometry(PLAZA_RADIUS - 0.09, PLAZA_RADIUS + 0.09, 128), M.energySoft);
  ring.rotation.x = -Math.PI / 2; ring.position.y = FLOOR_TOP + 0.02; ring.renderOrder = 4; g.add(ring);

  /* THE MAHPLAZA CIVIC MARKER: the canonical MAHFITT mark + the MAHPLAZA wordmark, inlaid.
     This used to be two concentric diamond outlines and a small core — a reasonable guess at the
     identity, and a guess is exactly what §19 forbids while the real asset sits in this repository.
     images/mahfitt-mark-gold.png resolves, measured, into a solid diamond flanked by two double
     chevrons pointing inward; materials.js:fobMark() rebuilds those measured proportions as geometry.
     The whole lockup is laid flat and sized so the mark spans the same 11 m as the wordmark plane.

     The mark sits 2.2 m RIGHT of the axis on purpose. In the canonical lockup it is not centred over
     the wordmark either: its centre falls at 0.198 of the wordmark's width to the right of centre,
     over the end of MAHFITT. Centring it here would have been tidier and would have been the
     approximation the brief rules out. */
  const markMat = M.energyLight;
  const MARK_DIAMOND = 3.6;                    /* 3.08 diamond-widths of mark = 11.1 m, the wordmark's width */
  const mark = new THREE.Mesh(fobMark(MARK_DIAMOND, 0.05), markMat);
  mark.rotation.x = -Math.PI / 2;              /* built facing +Z for a sign face; laid flat for a floor */
  mark.position.set(11 * 0.198, FLOOR_TOP + 0.03, 12); g.add(mark);
  reflect(mark, 0.4);
  const wordTex = canvasTexture(2048, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(225,238,255,0.92)'; c.font = '700 300px "Space Grotesk", "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; let total = 0; const gap = 44; for (const ch of 'MAHPLAZA') total += c.measureText(ch).width + gap; let x = w / 2 - (total - gap) / 2; c.textAlign = 'left'; for (const ch of 'MAHPLAZA') { c.fillText(ch, x, h / 2); x += c.measureText(ch).width + gap; } });
  const word = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75), new THREE.MeshBasicMaterial({ map: wordTex, transparent: true, depthWrite: false }));
  word.rotation.x = -Math.PI / 2; word.position.set(0, FLOOR_TOP + 0.03, 17.5); g.add(word);
  ctx.timeHooks.push(s => { word.material.opacity = 0.55 + 0.45 * (1 - s.daylight); });

  /* ---------------------------------------------------------------------------------------------
     THE MAHPLAZA MONUMENT (v6b) — the reference's plaza has a HERO OBJECT at its centre, a large
     crystalline square-diamond standing at the foot of the approach, and its absence is why the middle
     of this plaza has been reading as floor rather than as a place. It is the world's own reserved
     mark built at architectural scale: a faceted plinth, a mirror-grade collar, and the diamond itself
     held above it with an energy core inside, reflected in the chromium floor beneath.
     No invented emblem — this is the square-diamond the whole world already uses. */
  {
    /* forward of the MAH MATCH approach, not across its portal: a plaza centrepiece the eye lands on
       first, with the entrance and its two actions still clear behind it */
    const mx = 0, mz = 7;
    const monument = new THREE.Group(); monument.name = 'plaza-monument';
    monument.position.set(mx, FLOOR_TOP, mz); g.add(monument);
    /* the plinth: three receding faceted courses, dark, so the crystal above reads against them */
    const courses = [[7.2, 0.5, 0x0], [5.6, 0.62, 0], [4.2, 0.5, 0]];
    let py = 0;
    courses.forEach(([cw, ch], i) => {
      const c = new THREE.Mesh(chamferBox(cw, ch, cw, 0.14), i === 1 ? M.graphiteDark : M.structural);
      c.rotation.y = Math.PI / 4; c.position.y = py + ch / 2; c.castShadow = true; c.receiveShadow = true; monument.add(c);
      const rim = new THREE.Mesh(chamferBox(cw + 0.18, 0.09, cw + 0.18, 0.03), M.platinumLit || M.trim);
      rim.rotation.y = Math.PI / 4; rim.position.y = py + ch; monument.add(rim);
      py += ch;
    });
    /* a lit reveal under the top course, so the plinth sits on light rather than on the floor */
    const reveal = new THREE.Mesh(new THREE.CircleGeometry(3.4, 4), M.energySoft);
    reveal.rotation.x = -Math.PI / 2; reveal.rotation.z = Math.PI / 4; reveal.position.y = 0.04; reveal.renderOrder = 6; monument.add(reveal);
    /* the mirror collar the diamond stands in */
    const collar = new THREE.Mesh(chamferBox(2.6, 0.34, 2.6, 0.1), M.chromeMirror || M.trim);
    collar.rotation.y = Math.PI / 4; collar.position.y = py + 0.17; monument.add(collar);
    /* THE DIAMOND — the square-diamond at architectural scale. The first build made the mistake of
       wrapping a bright core in an OPAQUE faceted shell, which simply hid it: a crystal reads because
       light comes THROUGH it. So the core is large and bright, the shell over it is glass, and the
       only opaque part is the thin mirror edge that catches the moon on its turn. */
    const dy = py + 5.4;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(2.9, 0), M.energyLight);
    core.scale.set(1, 1.55, 0.34); core.position.y = dy; monument.add(core);
    const shell = new THREE.Mesh(new THREE.OctahedronGeometry(3.35, 0), M.crystalGlass || M.glass);
    shell.scale.set(1, 1.55, 0.46); shell.position.y = dy; monument.add(shell);
    reflect(core, 0.5); reflect(collar, 0.3);
    /* the edge catches that make it turn: four thin mirror bars along its equator */
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const bar = new THREE.Mesh(chamferBox(0.16, 0.16, 4.7, 0.04), M.chromeMirror || M.trim);
      bar.position.set(Math.cos(a) * 1.7, dy, Math.sin(a) * 1.7);
      bar.rotation.y = -a + Math.PI / 2; bar.rotation.x = 0.66; monument.add(bar);
    }
    /* a mast carrying the diamond clear of its plinth, so it reads as HELD rather than resting */
    const mast = new THREE.Mesh(chamferBox(0.34, 2.6, 0.34, 0.06), M.chromeSatin || M.trimSatin);
    mast.rotation.y = Math.PI / 4; mast.position.y = py + 1.5; monument.add(mast);
    const col = new THREE.Mesh(new THREE.BoxGeometry(7.6, 12, 7.6), M.curb);
    col.position.set(mx, FLOOR_TOP + 6, mz); col.visible = false; g.add(col);
    (ctx.colliders = ctx.colliders || []).push(col);
    ctx.monument = monument;
  }

  /* 2. aprons: raised slabs in front of the three destinations */
  function apron(x, z, w, d, rotY) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, d), M.platinumLitBrushed || M.graphiteLight);
    a.position.set(x, 0.21, z); a.rotation.y = rotY; a.receiveShadow = true; g.add(a);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, 0.06), M.energySoft);
    lip.position.set(0, 0.22, d / 2 - 0.03); a.add(lip);
    const edge = new THREE.Mesh(chamferBox(w + 0.12, 0.1, 0.16, 0.03), M.trim);
    edge.position.set(0, 0.16, d / 2 - 0.02); a.add(edge);   /* a mirror-grade nosing on the apron step */
    return a;
  }
  /* one apron per site, placed from the SITE PLAN so the ground follows the buildings (v5 §06) */
  Object.keys(SITES).forEach(k => {
    const S = SITES[k], out = 11;
    apron(S.x + Math.sin(S.rotY) * out, S.z + Math.cos(S.rotY) * out, S.W + 8, 16, S.rotY);
  });

  /* 3. vehicle corridors: two lanes at the district edges, curving away behind the buildings */
  function corridor(sign) {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; const z = 70 - t * 190; const x = sign * (44 + Math.pow(Math.max(0, (t - 0.55)) / 0.45, 1.6) * 40); pts.push(new THREE.Vector3(x, 0, z)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const road = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 3.6, 4, false), M.road);
    road.scale.y = 0.012; road.position.y = 0.006; g.add(road);              /* a flattened tube: a smooth ribbon of roadway */
    const walk = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 6.2, 4, false), M.graphiteLight);
    walk.scale.y = 0.02; walk.position.y = 0.0; walk.renderOrder = 1; g.add(walk);   /* the sidewalk band either side */
    /* lane markers: short inset strips along the centre, sparse */
    const markGeo = new THREE.BoxGeometry(0.08, 0.02, 1.6);
    for (let i = 2; i < 46; i += 3) { const pt = curve.getPointAt(i / 48), tan = curve.getTangentAt(i / 48); const mk = new THREE.Mesh(markGeo, M.energySoft); mk.position.copy(pt).setY(0.03); mk.rotation.y = Math.atan2(tan.x, tan.z); g.add(mk); }
    /* one square-diamond route symbol per corridor */
    const sym = diamondOutline(1.6, 0.08, M.energy); const sp = curve.getPointAt(0.18); sym.position.set(sp.x, 0.03, sp.z); g.add(sym);
    return curve;
  }
  ctx.roads = [corridor(-1), corridor(1)];

  /* seating: two low graphite blocks with one thin light seam each */
  [[-19, 21, 0.5], [19, 21, -0.5]].forEach(([x, z, ry]) => {
    const b = new THREE.Mesh(chamferBox(5.5, 0.55, 1.4, 0.09), M.graphiteDark); b.position.set(x, FLOOR_TOP + 0.275, z); b.rotation.y = ry; g.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.02, 0.04), M.energySoft); s.position.set(0, 0.28, 0.7); b.add(s);
    const cap = new THREE.Mesh(chamferBox(5.3, 0.06, 1.2, 0.04), M.chromeSatin || M.trimSatin); cap.position.set(0, 0.29, 0); b.add(cap);
  });

  /* planter spots the flora module fills — sparse, at the plaza edge and building aprons */
  /* v6b: the plaza was planted at one planter per ~970 m2, and four of the six sat behind or beside the
     arrival subject. The reference's plaza is flanked by trees the whole way in. `kind: 'tree'` asks the
     flora module for its tree where it has one, and falls back to a planter where it does not. */
  ctx.planterSpots = [
    { x: -14, z: 24, size: 'medium', shape: 'round' }, { x: 14, z: 24, size: 'medium', shape: 'round' },
    { x: -30, z: 4, size: 'large', shape: 'box' }, { x: 30, z: 4, size: 'large', shape: 'box' },
    { x: -22, z: -30, size: 'small', shape: 'box' }, { x: 22, z: -30, size: 'small', shape: 'box' },
    /* the two avenues flanking the approach — the reference's most characteristic planting */
    { x: -24, z: 18, kind: 'tree', size: 'large' }, { x: 24, z: 18, kind: 'tree', size: 'large' },
    { x: -27, z: 8, kind: 'tree', size: 'medium' }, { x: 27, z: 8, kind: 'tree', size: 'medium' },
    { x: -30, z: -3, kind: 'tree', size: 'large' }, { x: 30, z: -3, kind: 'tree', size: 'large' },
    { x: -33, z: -14, kind: 'tree', size: 'medium' }, { x: 33, z: -14, kind: 'tree', size: 'medium' },
    /* the plaza edge behind the arrival camera and out toward the corridors */
    { x: -20, z: 32, kind: 'tree', size: 'medium' }, { x: 20, z: 32, kind: 'tree', size: 'medium' },
    { x: -36, z: 26, kind: 'tree', size: 'large' }, { x: 36, z: 26, kind: 'tree', size: 'large' },
    { x: -41, z: 6, kind: 'tree', size: 'medium' }, { x: 41, z: 6, kind: 'tree', size: 'medium' },
    /* the courtyards the facilities' new spacing opened up */
    { x: -40, z: -26, kind: 'tree', size: 'large' }, { x: 42, z: -30, kind: 'tree', size: 'large' },
    { x: -30, z: -36, kind: 'tree', size: 'medium' }, { x: 32, z: -40, kind: 'tree', size: 'medium' }
  ];

  scene.add(g);
  return g;
}
