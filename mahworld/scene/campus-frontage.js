/* MAHWORLD WORLD 01 :: CAMPUS FRONTAGE — the buildings that hold the quad
   ============================================================================================

   ---- THE DEFECT THIS ANSWERS ------------------------------------------------------------------
   The furnishing pass put five hundred correctly-scaled objects on the quad and proved something
   the renders had been hinting at for three passes: street furniture cannot hold a 192 m space.
   A bench is 1.9 m. Two hundred of them around a circle 600 m in circumference is a thin necklace,
   not an edge, and no amount of extra density changes that — the objects were right, the
   INSTRUMENT was wrong.

   What the reference town uses is continuous BUILDING FRONTAGE. Its plaza is small, but the reason
   it feels held rather than exposed is that every direction you look, the space ends in a wall with
   doors and windows in it. MAHWORLD had walls on three bearings out of three hundred and sixty.

   ---- WHY THESE ARE NOT THE BLOCKS THAT WERE REMOVED --------------------------------------------
   The generic city was switched off one pass ago for good reasons: no names, no entrances, no
   destinations, and amber window light the colour direction forbids. Putting a ring of anonymous
   massing back would be the same mistake at a smaller radius, so every building here clears the bar
   the direction actually set:

     · it has a NAME, on a signboard, readable from the quad;
     · it has a real ENTRANCE — a recess, two door leaves, a lit header and a step up to it, so a
       stranger can see where you go in;
     · it has WINDOWS WITH DEPTH — a frame, glass set back inside it, and a lit interior plane
       behind that, so the building reads as inhabited rather than as a facade texture;
     · it has a CANOPY over the door, which is the single detail that makes a shopfront read as a
       shopfront at fifty metres;
     · it has a roof that is designed — parapet, a planted box, a service rail — instead of a flat
       lid, because the roofline is most of a building's silhouette from across a square.

   Names are venue nouns and nothing more. No claims, no prices, no products, no invented mechanics.

   ---- THE ARC PROBLEM, AND THE PLAN CHANGE IT FORCED --------------------------------------------
   campus-plan.js reserved 228 degrees of open arc for the rear sea sightline. That reserve is why
   three quarters of the quad has no edge at all, and 228 degrees is far more than a sightline
   needs: a corridor you can see the coast down is forty degrees wide, not two hundred. The plan's
   OPEN_ARC narrows to 158-202 — still dead astern, still uninterrupted, still the reserve for
   future districts — and the frontage takes the rest.

   ---- COST --------------------------------------------------------------------------------------
   Sixteen buildings, merged by material role across all of them: six opaque meshes plus one sign
   mesh. Every name lives in ONE 4x4 texture atlas with per-sign UVs, so sixteen different
   signboards cost one draw call and one texture rather than sixteen of each.

   No addons; three r185 core only; procedural; deterministic. */

import * as THREE from '../vendor/three/three.module.min.js';
import { canvasTexture, BRAND } from './materials.js';
import { CAMPUS, at, faceQuad } from './campus-plan.js';

const DECK_Y = 0.17;
const DEG = Math.PI / 180;

/* ---------------------------------------------------------------- plumbing */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(),
      _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
function part(list, geo, x, y, z, ry = 0, sc) {
  _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z);
  _s.set(1, 1, 1); if (sc) _s.set(sc[0], sc[1], sc[2]);
  _m4.compose(_p, _q, _s);
  list.push((geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(_m4));
  return list;
}
function mergeParts(list) {
  if (!list.length) return null;
  let n = 0;
  for (const g of list) { if (!g.getAttribute('normal')) g.computeVertexNormals(); n += g.getAttribute('position').count; }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of list) {
    const p = g.getAttribute('position'), q = g.getAttribute('normal'), t = g.getAttribute('uv');
    pos.set(p.array.subarray(0, p.count * 3), o * 3);
    nrm.set(q.array.subarray(0, q.count * 3), o * 3);
    if (t) uv.set(t.array.subarray(0, t.count * 2), o * 2);
    o += p.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}
/* a rounded slab: the shape language section 8 asks for — halfway between a block and a capsule,
   with the radius chosen against the LOCAL thickness rather than from one global number. */
function slab(w, h, d, r, b = 0.12) {
  const rr = Math.max(0.02, Math.min(r, w / 2 - 0.02, d / 2 - 0.02));
  const bb = Math.max(0.01, Math.min(b, h / 2 - 0.01));
  const s = new THREE.Shape(), x0 = -w / 2, z0 = -d / 2;
  s.moveTo(x0 + rr, z0);
  s.lineTo(x0 + w - rr, z0); s.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + rr);
  s.lineTo(x0 + w, z0 + d - rr); s.quadraticCurveTo(x0 + w, z0 + d, x0 + w - rr, z0 + d);
  s.lineTo(x0 + rr, z0 + d); s.quadraticCurveTo(x0, z0 + d, x0, z0 + d - rr);
  s.lineTo(x0, z0 + rr); s.quadraticCurveTo(x0, z0, x0 + rr, z0);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bb, bevelEnabled: true, bevelThickness: bb, bevelSize: bb, bevelSegments: 2, curveSegments: 5 });
  g.translate(0, 0, -(h - 2 * bb) / 2); g.rotateX(-Math.PI / 2); g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------------- the venues
   Bearing, frontage width, storeys, and the name on the board. Plain venue nouns: this world does
   not invent products, prices, claims or mechanics, and a name over a door is not one.
   The two forward gaps (between MAH MATCH and its neighbours) get the shallow social frontage; the
   two rear flanks get the deeper terraces. Nothing is placed inside OPEN_ARC. */
const VENUES = [
  { deg: 16,  w: 26, storeys: 2, name: 'MAH CAFE' },
  { deg: 32,  w: 22, storeys: 2, name: 'MAH STUDIO' },
  { deg: 48,  w: 26, storeys: 3, name: 'MAH LOUNGE' },
  { deg: 84,  w: 28, storeys: 3, name: 'MAH HALL' },
  { deg: 100, w: 24, storeys: 2, name: 'MAH SUPPLY' },
  { deg: 116, w: 26, storeys: 2, name: 'MAH GALLERY' },
  { deg: 132, w: 24, storeys: 3, name: 'MAH WORKS' },
  { deg: 148, w: 22, storeys: 2, name: 'MAH GARDEN' },
  { deg: 212, w: 22, storeys: 2, name: 'MAH TERRACE' },
  { deg: 228, w: 26, storeys: 3, name: 'MAH ARCHIVE' },
  { deg: 244, w: 24, storeys: 2, name: 'MAH DEPOT' },
  { deg: 260, w: 28, storeys: 3, name: 'MAH COURT' },
  { deg: 276, w: 24, storeys: 2, name: 'MAH ATRIUM' },
  { deg: 310, w: 26, storeys: 3, name: 'MAH LOCKERS' },
  { deg: 326, w: 22, storeys: 2, name: 'MAH REST' },
  { deg: 342, w: 26, storeys: 2, name: 'MAH POST' }
];
const STOREY_H = 4.4, PODIUM_H = 0.55;

/* THE SIGN ATLAS. Sixteen names in a 4x4 grid on one texture: one material, one draw call, and a
   per-sign UV window. Sixteen separate sign textures would have been sixteen uploads and sixteen
   draws for a detail that is only ever read from thirty metres. */
function signAtlas(names) {
  const N = 4, CELL = 512;
  return canvasTexture(N * CELL, N * CELL, (g) => {
    g.clearRect(0, 0, N * CELL, N * CELL);
    names.forEach((nm, i) => {
      const cx = (i % N) * CELL, cy = Math.floor(i / N) * CELL;
      g.save(); g.translate(cx, cy);
      /* a dark board with a hairline frame — the type is the light, never the panel */
      g.fillStyle = 'rgba(10,15,24,0.94)'; g.fillRect(0, 0, CELL, CELL);
      g.strokeStyle = 'rgba(186,212,246,0.34)'; g.lineWidth = 5;
      g.strokeRect(14, 14, CELL - 28, CELL - 28);
      /* the brand mark: the square diamond, WIDER THAN TALL */
      g.strokeStyle = 'rgba(226,238,255,0.90)'; g.lineWidth = 9;
      const mx = CELL / 2, my = 150, mw = 74, mh = 50;
      g.beginPath(); g.moveTo(mx, my - mh); g.lineTo(mx + mw, my); g.lineTo(mx, my + mh); g.lineTo(mx - mw, my); g.closePath(); g.stroke();
      /* the name, tracked and centred the canonical way: a tracked run is measured WITHOUT its
         trailing letter-space, so it centres on the glyphs and not on the gap after the last one. */
      const fam = (BRAND && BRAND.titleFamily) || '"Space Grotesk", system-ui, sans-serif';
      g.fillStyle = 'rgba(238,246,255,0.98)';
      g.font = '700 92px ' + fam;
      g.textBaseline = 'middle'; g.textAlign = 'left';
      const gap = 92 * 0.08;
      let total = 0; for (const ch of nm) total += g.measureText(ch).width + gap; total -= gap;
      let x = mx - total / 2;
      for (const ch of nm) { g.fillText(ch, x, 300); x += g.measureText(ch).width + gap; }
      g.restore();
    });
  });
}

/* ---------------------------------------------------------------- one building
   Built in its own frame: +z is the QUAD side, so every entrance faces the space it serves. */
function venue(B, v, signIndex) {
  const w = v.w, h = PODIUM_H + v.storeys * STOREY_H, d = 17;
  const R = Math.min(2.6, w * 0.10);

  /* 1. PODIUM — the building meets the ground on a wider base with a step in front of the door.
     A wall that arrives at the deck with no base reads as a decal, not a building. */
  part(B.dark, slab(w + 1.6, PODIUM_H, d + 1.6, R + 0.7, 0.09), 0, PODIUM_H / 2, 0);
  part(B.trim, slab(w + 1.9, 0.10, d + 1.9, R + 0.85, 0.03), 0, PODIUM_H + 0.03, 0);
  /* the entrance step, only where the door is */
  part(B.trim, slab(7.2, 0.20, 1.5, 0.30, 0.05), 0, 0.10, d / 2 + 1.35);
  part(B.trim, slab(7.6, 0.20, 1.5, 0.30, 0.05), 0, 0.32, d / 2 + 0.55);

  /* 2. THE MASS, and the upper storey set BACK — a straight extrusion to the parapet is the
     "primitive stack" the shape language rules out, and a setback is what gives a terrace a
     roofline you can read across a square. */
  const bodyH = PODIUM_H + STOREY_H * Math.min(2, v.storeys);
  part(B.shell, slab(w, bodyH - PODIUM_H, d, R, 0.16), 0, PODIUM_H + (bodyH - PODIUM_H) / 2, 0);
  if (v.storeys > 2) {
    part(B.shell, slab(w - 4.4, h - bodyH, d - 3.0, R * 0.9, 0.14), 0, bodyH + (h - bodyH) / 2, -1.2);
    part(B.roof, slab(w - 4.0, 0.34, d - 2.6, R * 0.95, 0.06), 0, h + 0.17, -1.2);
  }
  /* the parapet over the main body: a rail, not a raw arris */
  part(B.roof, slab(w + 0.5, 0.40, d + 0.5, R + 0.2, 0.07), 0, bodyH + 0.20, 0);

  /* 3. WINDOW BAYS WITH DEPTH. Frame, glass set 0.22 m back inside it, and a lit interior plane
     0.5 m behind that. Three planes is what makes a window read as an opening into a room instead
     of as a rectangle painted on a wall — and it is why these buildings look inhabited at night. */
  /* ONE BAY, placed on any face. It takes a position and a facing, so the same three-plane window
     serves the front, both flanks and the rear — which is the whole point. A building whose sides
     are blank slabs is a stage flat, and from a quad you see far more building FLANK than facade:
     the first cut of this file put windows on the quad-facing side only and the render showed
     exactly that, a bare white wall on every terrace seen at an angle. */
  const bay = (x, y, z, ry, bw) => {
    /* A FRAME IS FOUR MEMBERS AROUND AN OPENING. The first cut made it one solid slab in front of
       the glass, which is not a frame — it is a bright plate covering a window, and the street
       render showed exactly that: every opening reading LIGHTER than the wall it was cut into,
       which is the opposite of what a window does. Head, sill and two jambs, with the glass
       visible between them. */
    const ow = bw - 1.0, oh = 2.30;                      /* the opening itself */
    const sn = Math.sin(ry), cs = Math.cos(ry);
    const off = (dx, dz) => [x + sn * dz + cs * dx, z + cs * dz - sn * dx];
    let q;
    q = off(0, 0);  part(B.trim, slab(ow + 0.34, 0.17, 0.34, 0.06, 0.04), q[0], y + oh / 2 + 0.08, q[1], ry);   /* head */
    for (const sd of [-1, 1]) {
      q = off(sd * (ow / 2 + 0.09), 0);
      part(B.trim, slab(0.18, oh, 0.34, 0.06, 0.04), q[0], y, q[1], ry);                                        /* jambs */
    }
    q = off(0, -0.24); part(B.glass, slab(ow, oh - 0.06, 0.10, 0.05, 0.03), q[0], y, q[1], ry);
    q = off(0, -0.70); part(B.interior, slab(ow - 0.16, oh - 0.24, 0.06, 0.04, 0.02), q[0], y, q[1], ry);
    /* a sill, because a window with no sill is a hole */
    q = off(0, 0.09);  part(B.trim, slab(ow + 0.52, 0.13, 0.50, 0.05, 0.03), q[0], y - oh / 2 - 0.06, q[1], ry);
  };
  const bays = Math.max(3, Math.floor((w - 8) / 3.4));
  const bayW = (w - 4.2) / bays;
  const sideBays = Math.max(2, Math.floor((d - 5) / 4.2));
  const sideW = (d - 3.4) / sideBays;
  for (let s = 0; s < v.storeys; s++) {
    const y = PODIUM_H + s * STOREY_H + STOREY_H * 0.60;
    const inset = s >= 2 ? 1.5 : 0;                       /* the set-back storey's windows follow it */
    const zf = d / 2 - inset * 1.5;
    /* the quad-facing frontage */
    for (let i = 0; i < bays; i++) {
      const x = -w / 2 + 2.1 + bayW * (i + 0.5);
      if (s === 0 && Math.abs(x) < 4.6) continue;         /* the ground-floor door bay is not a window */
      bay(x, y, zf - 0.05, 0, bayW);
    }
    /* both flanks, at a wider spacing — a side elevation is read in passing and does not need the
       frontage's rhythm, but it does need to be an elevation and not a blank */
    const xf = w / 2 - inset * 2.2;
    for (let i = 0; i < sideBays; i++) {
      const z = -d / 2 + 1.7 + sideW * (i + 0.5);
      bay(xf - 0.05, y, z, Math.PI / 2, sideW);
      bay(-xf + 0.05, y, z, -Math.PI / 2, sideW);
    }
    /* the rear: two bays, so a terrace seen from the service side still reads as a building */
    for (let i = 0; i < 2; i++) {
      const x = (i - 0.5) * w * 0.42;
      bay(x, y, -zf + 0.05, Math.PI, bayW * 0.9);
    }
    /* a floor band between storeys: the horizontal that tells you how many floors there are */
    if (s < v.storeys - 1) part(B.roof, slab(w + 0.24, 0.26, d + 0.24, R + 0.1, 0.05), 0, PODIUM_H + (s + 1) * STOREY_H, 0);
  }

  /* 4. THE ENTRANCE. A recess cut forward of the wall, two door leaves with a gap between them, a
     lit header over the opening, and a jamb either side. Five parts, and every one of them is a
     part a person expects a door to have. */
  const dz = d / 2;
  part(B.dark, slab(7.0, 3.60, 1.30, 0.28, 0.06), 0, PODIUM_H + 1.80, dz - 0.55);      /* the reveal */
  part(B.interior, slab(6.2, 3.10, 0.10, 0.20, 0.03), 0, PODIUM_H + 1.60, dz - 0.95);  /* what is lit inside */
  for (const sd of [-1, 1]) {
    part(B.glass, slab(2.75, 3.00, 0.14, 0.14, 0.04), sd * 1.55, PODIUM_H + 1.55, dz - 0.20);
    part(B.trim, slab(0.16, 3.10, 0.30, 0.06, 0.04), sd * 3.15, PODIUM_H + 1.60, dz - 0.16);   /* jamb */
    part(B.trim, slab(0.10, 0.90, 0.16, 0.04, 0.03), sd * 0.22, PODIUM_H + 1.25, dz - 0.10);   /* handle */
  }
  part(B.accent, slab(6.9, 0.16, 0.22, 0.06, 0.04), 0, PODIUM_H + 3.42, dz - 0.02);    /* the lit header */

  /* 5. THE CANOPY. The one detail that makes a frontage read as somewhere you can walk into, from
     across the square. A blade on two struts, projecting past the step. */
  part(B.roof, slab(9.4, 0.30, 2.9, 0.42, 0.06), 0, PODIUM_H + 4.05, dz + 1.05);
  part(B.accent, slab(9.0, 0.09, 0.16, 0.04, 0.02), 0, PODIUM_H + 3.92, dz + 2.46);
  for (const sd of [-1, 1]) part(B.trim, slab(0.16, 1.10, 0.16, 0.06, 0.04), sd * 4.2, PODIUM_H + 4.62, dz + 1.9);

  /* 6. THE SIGNBOARD, on the fascia above the canopy, with the venue's own cell of the atlas. */
  {
    const sw = Math.min(9.0, w * 0.42), sh = sw * 0.36;
    part(B.trim, slab(sw + 0.5, sh + 0.5, 0.26, 0.16, 0.05), 0, PODIUM_H + 5.95, dz + 0.06);
    const g = new THREE.PlaneGeometry(sw, sh);
    const uv = g.getAttribute('uv'), N = 4;
    const cx = signIndex % N, cy = Math.floor(signIndex / N);
    for (let i = 0; i < uv.count; i++) {
      /* the atlas is drawn top row first, so v is flipped into the cell */
      uv.setXY(i, (cx + uv.getX(i)) / N, (N - 1 - cy + uv.getY(i)) / N);
    }
    uv.needsUpdate = true;
    part(B.sign, g, 0, PODIUM_H + 5.95, dz + 0.21);
    g.dispose();
  }

  /* 7. THE ROOF, designed rather than lidded: a planted box, a service rail and a vent block. From
     the quad you see roofs more than you see walls, and a flat lid is what makes a town read as
     cardboard. */
  const rt = v.storeys > 2 ? h : bodyH;
  part(B.dark, slab(w * 0.30, 0.90, d * 0.34, 0.32, 0.08), -w * 0.24, rt + 0.45, -d * 0.16);
  part(B.green, slab(w * 0.26, 0.30, d * 0.28, 0.28, 0.06), -w * 0.24, rt + 1.02, -d * 0.16);
  part(B.trim, slab(w * 0.34, 0.10, 0.10, 0.04, 0.03), w * 0.20, rt + 1.05, -d * 0.10);
  for (const o of [-1, 0, 1]) part(B.trim, slab(0.10, 1.05, 0.10, 0.04, 0.03), w * 0.20 + o * w * 0.14, rt + 0.52, -d * 0.10);
  return h;
}

/* ---------------------------------------------------------------- build */
export function buildCampusFrontage(ctx) {
  const { M, scene } = ctx;
  const group = new THREE.Group(); group.name = 'campus-frontage';
  const owned = { geometries: [], materials: [], textures: [] };
  const stats = { venues: 0, draws: 0, colliders: 0, names: [] };

  const tex = signAtlas(VENUES.map(v => v.name));
  tex.anisotropy = 4; owned.textures.push(tex);

  /* ---- VALUE HIERARCHY, WHICH IS THE REFERENCE'S ACTUAL LESSON --------------------------------
     The first cut borrowed the world's shared grades: platinumLit for the shell and chromeSatin for
     the trim. In daylight those are 0xc0c3c6 and a bright satin — the same value — so sixteen
     buildings rendered as white foam with white frames on them, and the street render showed
     exactly that. In the reference town you can read the whole place at a hundred metres because
     every class is a different value: cream walls, BLUE roofs, dark timber, green trees.

     So the frontage owns its own five-step ladder instead of borrowing two overlapping ones:

        ROOF     deep navy      the parapets, the canopies, the setback caps  <- the "blue roof"
        DARK     near-black     the podium, the entrance reveal, the plant box
        SHELL    mid cool grey  the wall itself, deliberately NOT white
        TRIM     bright platinum the frames, bands, sills, rails            <- the light lines
        GLASS    near-black mirror

     Deep navy is one of the colour direction's dominant hues, so the roof line is on-palette and
     is doing the one job the reference's blue roofs do: telling you what is a building from far
     enough away that you cannot read anything else about it. */
  const MAT = {
    shell: new THREE.MeshStandardMaterial({ color: 0x6b7686, roughness: 0.55, metalness: 0.34, envMapIntensity: 1.15 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x131926, roughness: 0.62, metalness: 0.40, envMapIntensity: 0.95 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xd8dee6, roughness: 0.26, metalness: 0.68, envMapIntensity: 1.9 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x1b2a49, roughness: 0.44, metalness: 0.52, envMapIntensity: 1.5 }),
    green: new THREE.MeshStandardMaterial({ color: 0x2f6b57, roughness: 0.78, metalness: 0.05, flatShading: true }),
    /* GLASS is dark and reflective, not transparent: a transmissive pass on sixteen frontages is a
       cost this world has never paid, and the depth is already carried by the three-plane bay. */
    glass: new THREE.MeshStandardMaterial({ color: 0x070d16, roughness: 0.07, metalness: 0.76, envMapIntensity: 2.6 }),
    /* the lit room behind the glass. COOL WHITE — the colour direction excludes amber outright, and
       warm interior light was exactly what got the old city switched off. */
    interior: new THREE.MeshBasicMaterial({ color: 0xc8dcf6, fog: true }),
    accent: new THREE.MeshStandardMaterial({ color: 0x0a1424, emissive: 0x6fb7ff, emissiveIntensity: 1.05, roughness: 0.45, metalness: 0.1 }),
    sign: new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true })
  };
  MAT.shell.name = 'frontage-shell'; MAT.dark.name = 'frontage-dark'; MAT.trim.name = 'frontage-trim';
  MAT.roof.name = 'frontage-roof';
  MAT.green.name = 'frontage-planting'; MAT.glass.name = 'frontage-glass';
  MAT.interior.name = 'frontage-interior'; MAT.accent.name = 'frontage-accent'; MAT.sign.name = 'frontage-sign';
  owned.materials.push(MAT.shell, MAT.dark, MAT.trim, MAT.roof, MAT.green, MAT.glass, MAT.interior, MAT.accent, MAT.sign);

  const B = { shell: [], dark: [], trim: [], roof: [], glass: [], interior: [], accent: [], green: [], sign: [] };
  const FRONT_R = (CAMPUS.QUAD_R + CAMPUS.FORECOURT_R) / 2;   /* the frontage line: 114 m, between
    the quad edge and the facility facades, so the terraces sit BEHIND the furnishing ring and IN
    FRONT of the destinations — which is the depth order a real high street has. */

  VENUES.forEach((v, i) => {
    /* build the venue in its own frame, then rotate the whole thing onto its bearing. Building in
       place and rotating afterwards is what keeps every entrance facing the quad without a second
       facing derivation that could disagree with the plan's. */
    const local = { shell: [], dark: [], trim: [], roof: [], glass: [], interior: [], accent: [], green: [], sign: [] };
    const h = venue(local, v, i);
    const [x, z] = at(v.deg, FRONT_R);
    const ry = faceQuad(v.deg);
    for (const k of Object.keys(local)) for (const g of local[k]) {
      _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, DECK_Y, z); _s.set(1, 1, 1);
      B[k].push(g.applyMatrix4(_m4.compose(_p, _q, _s)));
    }
    /* one collider on the footprint: the frontage is a wall and the camera must stay outside it */
    const cg = new THREE.BoxGeometry(v.w + 1.6, h, 19);
    const c = new THREE.Mesh(cg, M.curb || M.graphiteDark);
    c.position.set(x, DECK_Y + h / 2, z); c.rotation.y = ry; c.visible = false;
    group.add(c); (ctx.colliders = ctx.colliders || []).push(c);
    owned.geometries.push(cg); stats.colliders++;
    stats.venues++; stats.names.push(v.name);
  });

  for (const k of Object.keys(B)) {
    const g = mergeParts(B[k]); if (!g) continue;
    owned.geometries.push(g);
    const m = new THREE.Mesh(g, MAT[k]);
    m.name = 'frontage-' + k;
    m.castShadow = (k !== 'interior' && k !== 'sign');
    m.receiveShadow = (k !== 'interior' && k !== 'sign');
    group.add(m); stats.draws++;
  }

  scene.add(group);

  /* the accent and the interior follow the world clock: interiors brighten as the sky darkens,
     which is what makes a terrace read as occupied in the evening without adding a single light. */
  ctx.timeHooks.push((s, k) => {
    if (ctx.theme && ctx.theme.energy != null) MAT.accent.emissive.setHex(ctx.theme.energy);
    const night = k && k.exposure != null ? Math.min(1, Math.max(0, 1.35 - k.exposure)) : 0.5;
    MAT.interior.color.setRGB(0.62 + 0.24 * night, 0.72 + 0.20 * night, 0.86 + 0.14 * night);
  });

  return {
    group, stats,
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      owned.textures.forEach(t => t.dispose());
      scene.remove(group);
    }
  };
}
