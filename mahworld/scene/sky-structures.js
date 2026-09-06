/* MAHWORLD :: UPPER REALM — EVERY BUILT THING IN THE SKY

   There are very few of them, on purpose (§11, §32). The lower world is civilisation; this realm is
   atmosphere, open space, training, flight and cloud, and the fastest way to ruin it would be to put
   a second city up here. So this module builds ONE real building, four ascent pads, an apron, two
   overlooks, three sparring rings, a flight lane, a target field, five launch pylons and four pieces
   of cold-side infrastructure — and nothing else. Each one is therefore high-value: platinum,
   diamond-glazed, and worth walking to.

   THE TWO CONTRACT LAWS, AND WHAT THEY ACTUALLY COST HERE
     1  NOTHING assumes y = 0, and nothing stands off the cloud. Every height in this file comes from
        ground() — ctx.cloudTopAt when the terrain module is present, layout.deckHeight otherwise —
        and every grounded footprint is checked against layout.deckSolid(). This is not a formality.
        MEASURED off the layout before a line was written, the deck under the named sites runs at
        31–57 degrees at ringNear, ringMid, targetField, launchPylons, relayTower and stabiliser,
        because those sites sit on the flanks of the four boundary banks; padB stands at y +7.9 and
        padD at −11.2; the concourse footprint falls 10.5 m across its own frontage. That measurement
        DECIDED THE ARCHITECTURE. Nothing here is a slab dropped on a plane:
          · a platform is levelled at the HIGHEST ground under it and reaches the cloud on splayed
            legs or a battered skirt, so it is never floating and never buried;
          · a marking (ringFar, the walkways) CONFORMS to the cloud instead of levelling;
          · the concourse stands on a colonnade because its own site is a slope.
        Standing a building on legs over falling cloud is also the single strongest way to say
        "you are very high up", so the constraint and the brief agree.
     2  NO ATMOSPHERIC COLOUR IS INVENTED HERE. Structures are lit by scene.environment, which the
        assembly paints from layout.atmosphere(). The two places this module needs an atmospheric
        value of its own — the bounce a soffit takes from the lit cloud below it, and the sky a pane
        of glass reflects — both read it from the contract: fillFor(bearing, band) and
        atmosphere(bearing, elevation, band), sampled AT EACH CARD'S OWN BEARING and repainted in
        setTime(). Turning the camera therefore changes the light on the architecture continuously
        (§41) and all four sectors stay one sky (§42, §48). See washCard() / paintWash().

   THE MATERIAL LAW THAT HAS ALREADY COST THIS PROJECT DEARLY. A metal takes no diffuse light: at
   metalness >= 0.9 a surface is lit ONLY by what it reflects, so ORIENTATION decides the grade. Every
   HORIZONTAL face in this file — deck tops, caps, sills, soffits, walkway surfaces, bench seats —
   takes platinumLit / platinumMidLit (low metalness, reads at its own value). Vertical and tilted
   faces — fascias, piers, masts, blades, legs, rails — take platinumMid / platinumMidBrushed /
   chromeSatin / chromeMirror, which reflect the bright horizon band and read as metal. In a white
   cloud world a black platform top is the loudest possible mistake.

   SIGNAGE (§35, §36). Only layout.SIGNAGE, and only these six surfaces: the concourse blade
   (MAH ASCENT + the canonical sub-line + the canonical mark), the queue pylon (ASCENT QUEUE + the
   mark + a live pad-state list), a threshold plate on the apron (UPPER REALM), four wayfinding
   plates (the four SIGNAGE.actions, each aimed at the real site it names), and pad numerals. No
   slogan, tagline or marketing line is invented, and nothing is copied out of concept art.

   COST. Static geometry is merged to ONE mesh per material per sector; repeats are InstancedMesh;
   update() allocates nothing. Measured in stats, well inside the §45/§46 budget. */

import * as THREE from '../vendor/three/three.module.min.js';
import * as layout from './sky-layout.js';
import { chamferBox, signTexture, canvasTexture, fobMark, BRAND } from './materials.js';

const { SITES, SIGNAGE, QUALITY, DECK } = layout;
const TAU = Math.PI * 2, HALF_PI = Math.PI / 2;

/* ------------------------------------------------------------------ module scratch
   update() and setQueue() run every frame and must allocate nothing (§45). Everything they touch
   lives here. Math.hypot is deliberately avoided in any per-frame path — it is variadic and
   allocates an argument array on every call. */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _sc = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0), _axisY = new THREE.Vector3(0, 1, 0);
const _col = new THREE.Color();
const _gb = new Float64Array(2);          /* [groundMin, groundMax] — build-time only */

/* A group standing at bearing b whose LOCAL +Z should point at the world origin takes rotation.y = −b;
   pointing outward takes PI − b. Derived from the contract's own dir(b) = (sin b, 0, −cos b), and used
   everywhere below so no structure has to guess which way it faces. */
const faceIn = b => -b;
const faceOut = b => Math.PI - b;

/* ------------------------------------------------------------------ geometry plumbing */
/* Merge many small parts into ONE mesh per material (draw-call discipline). BufferGeometryUtils is an
   addon and this project vendors nothing but three's core, so the concatenation is done by hand —
   position, normal and uv, because several platinum grades carry a roughnessMap. */
function mergeList(list) {
  let n = 0;
  for (let i = 0; i < list.length; i++) n += list[i].attributes.position.count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (let i = 0; i < list.length; i++) {
    const g = list[i], c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nrm.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += c; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

/* A chamfered plan: the realm's boxes are octagons in plan so a mass reads as FACETED from every
   bearing rather than as a rectangle seen from a lucky angle. Nothing in this world has a raw 90
   degree corner. */
function chamferedPlan(w, d, c) {
  const hw = w / 2, hd = d / 2, s = new THREE.Shape();
  c = Math.max(0.05, Math.min(c, hw - 0.05, hd - 0.05));
  s.moveTo(-hw + c, -hd); s.lineTo(hw - c, -hd); s.lineTo(hw, -hd + c); s.lineTo(hw, hd - c);
  s.lineTo(hw - c, hd); s.lineTo(-hw + c, hd); s.lineTo(-hw, hd - c); s.lineTo(-hw, -hd + c);
  s.closePath();
  return s;
}
/* A faceted mass with its BASE at y = 0, centred in x/z. Extruded up rather than along z, so a plan
   chamfer and a top/bottom bevel are two different things and both are present. */
function massGeo(w, d, h, c, bevel = 0.35) {
  const g = new THREE.ExtrudeGeometry(chamferedPlan(w, d, c), {
    depth: Math.max(0.05, h - 2 * bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 1, curveSegments: 1
  });
  g.rotateX(-HALF_PI);          /* +Z extrusion becomes +Y */
  g.translate(0, bevel, 0);
  g.computeVertexNormals();
  return g;
}

/* COLOUR SPACE, and it is not a nicety. layout.atmosphere() writes its stops with Color.setRGB(),
   which in three r185 does NOT decode sRGB, while layout.fillFor() hands back a hex. Reading that hex
   with setHex() would decode it and the architecture's bounce would sit visibly darker and more
   saturated than the sky it stands in — the same trap sky-terrain.js documents. One convention, one
   sky: fillFor is read RAW, exactly the way atmosphere() reads its own stops. */
function rawHex(h, out) { return out.setRGB(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255); }

export function buildSkyStructures(ctx) {
  const M = (ctx && ctx.M) || {};
  const scene = ctx && ctx.scene;
  const group = new THREE.Group(); group.name = 'sky-structures';

  const geometries = [], materials = [], textures = [], meshes = [];
  const own = {
    g: g => { geometries.push(g); return g; },
    m: m => { materials.push(m); return m; },
    t: t => { textures.push(t); return t; }
  };

  let tier = typeof ctx?.quality === 'string' ? ctx.quality : (ctx?.quality?.name || 'high');
  if (!QUALITY[tier]) tier = 'high';

  /* THE CLOUD FLOOR. ctx.cloudTopAt is the surface the terrain module actually DRAWS; deckHeight() is
     the contract's own answer and the correct fallback when that module is absent. Everything grounded
     in this file is placed against this one function (contract law 1). */
  const ground = (ctx && typeof ctx.cloudTopAt === 'function') ? ctx.cloudTopAt : layout.deckHeight;

  /* ground extremes over a footprint, written into module scratch. A platform is levelled at max and
     skirted past min, which is what guarantees it neither floats nor sinks. */
  function groundBand(cx, cz, r, rings = 3, spokes = 12) {
    let mn = Infinity, mx = -Infinity;
    const h0 = ground(cx, cz); mn = mx = h0;
    for (let k = 1; k <= rings; k++) {
      const rr = r * k / rings;
      for (let a = 0; a < spokes; a++) {
        const th = a / spokes * TAU;
        const h = ground(cx + Math.cos(th) * rr, cz + Math.sin(th) * rr);
        if (h < mn) mn = h; if (h > mx) mx = h;
      }
    }
    _gb[0] = mn; _gb[1] = mx; return _gb;
  }

  /* ---------------------------------------------------------------- placement bookkeeping */
  /* Every structure records where it stands and whether the contract says there is cloud there. The
     smoke test reads this back: it is the proof that law 1 was kept rather than a claim about it. */
  const placements = [];
  function place(name, x, z, opts) {
    const o = opts || {};
    const p = {
      name, x, z,
      solid: !!o.floating || layout.deckSolid(x, z),
      edge: o.floating ? 1 : layout.deckEdge(x, z),
      floating: !!o.floating,
      groundY: o.floating ? null : ground(x, z),
      baseY: o.baseY != null ? o.baseY : null,
      topY: o.topY != null ? o.topY : null,
      radius: o.radius || 0
    };
    placements.push(p);
    return p;
  }
  /* A footprint is only legal if EVERY sampled point of it has cloud under it AND is off the rim.
     deckEdge() is the contract's own "how close to an edge is this", and a structure standing where it
     reads below ~0.2 is standing on cloud the terrain module is already dissolving into air. */
  function footprintSolid(cx, cz, r, spokes = 12, minEdge = 0.2) {
    if (!layout.deckSolid(cx, cz) || layout.deckEdge(cx, cz) < minEdge) return false;
    for (let a = 0; a < spokes; a++) {
      const th = a / spokes * TAU, x = cx + Math.cos(th) * r, z = cz + Math.sin(th) * r;
      if (!layout.deckSolid(x, z) || layout.deckEdge(x, z) < minEdge * 0.5) return false;
    }
    return true;
  }

  /* ---------------------------------------------------------------- materials I own
     The platinum, chrome and glass grades are SHARED (M): they are stateless and every module should
     agree about what platinum is. The emissive and interior materials are NOT shared, because their
     intensity is time-of-day state and their hue is the world Theme, and this module has to be able to
     answer setTime()/setTheme() without reaching into a material set the whole world uses. Nature —
     cloud, sky, stars, peaks — is not repainted by anything here; this module owns no nature. */
  const theme0 = (ctx && ctx.theme) || (M && M.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const mat = {
    /* shared grades — ORIENTATION decides which one a face gets (see the header) */
    mid: M.platinumMid || M.platinum || own.m(new THREE.MeshStandardMaterial({ color: 0x7e90ae, roughness: 0.24, metalness: 0.94 })),
    brushed: M.platinumMidBrushed || M.platinumBrushed || M.platinumMid || M.platinum,
    midLit: M.platinumMidLit || M.platinumLit || own.m(new THREE.MeshStandardMaterial({ color: 0x8b9cb8, roughness: 0.34, metalness: 0.4 })),
    lit: M.platinumLit || M.platinumMidLit || own.m(new THREE.MeshStandardMaterial({ color: 0xb6c4d6, roughness: 0.3, metalness: 0.38 })),
    satin: M.chromeSatin || M.platinum || own.m(new THREE.MeshStandardMaterial({ color: 0xbecddf, roughness: 0.17, metalness: 1.0 })),
    mirror: M.chromeMirror || M.chromeSatin || own.m(new THREE.MeshStandardMaterial({ color: 0xdfe9f7, roughness: 0.03, metalness: 1.0 })),
    glass: M.crystalGlass || M.glass || own.m(new THREE.MeshPhysicalMaterial({ color: 0x2b3f60, roughness: 0.06, metalness: 0.22, transparent: true, opacity: 0.42, side: THREE.DoubleSide })),
    /* owned */
    energy: own.m(new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: theme0.energy, emissiveIntensity: 1.30, roughness: 0.5, metalness: 0 })),
    energyLight: own.m(new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: theme0.energyLight, emissiveIntensity: 1.70, roughness: 0.5, metalness: 0 })),
    soft: own.m(new THREE.MeshBasicMaterial({ color: theme0.energy, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })),
    /* interior light is WARM: it is what separates a lit room from a lit sign at a glance, and it is
       the thing that makes the concourse read as somewhere you would want to arrive */
    warm: own.m(new THREE.MeshBasicMaterial({ color: 0xffeccd, toneMapped: true, side: THREE.DoubleSide })),
    warmSoft: own.m(new THREE.MeshBasicMaterial({ color: 0xf2d9a8, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })),
    /* THE ONLY PLACE AN ATMOSPHERIC COLOUR ENTERS THIS FILE. White base, vertex-coloured, additive:
       every card's colour comes from layout.fillFor() or layout.atmosphere() in paintWash(). */
    wash: own.m(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: true }))
  };
  const BASE_EMISSIVE = { energy: 1.30, energyLight: 1.70 };
  const BASE_OPACITY = { soft: 0.22, warmSoft: 0.42 };

  /* ---------------------------------------------------------------- buckets
     One list of geometries per (scope, material). `A`/`B`/`C`/`D` are the sector base scopes — merged
     per sector so the far half of the realm can still be frustum-culled — and `X` is fine trim that
     the low tier drops. */
  const BK = { A: {}, B: {}, C: {}, D: {}, X: {} };
  function put(scope, key, geo, x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _v.set(x, y, z); _eu.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_eu); _sc.set(sx, sy, sz);
    _m4.compose(_v, _q, _sc);
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(_m4);
    if (!g.attributes.normal) g.computeVertexNormals();
    const b = BK[scope];
    (b[key] || (b[key] = [])).push(g);
    geo.dispose();
    return g;
  }
  /* a strut between two world points: legs, rails, braces. The realm's structures reach the cloud with
     these, because the cloud under them is never level. */
  function strut(scope, key, x0, y0, z0, x1, y1, z1, r0, r1, seg = 7) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.02) return;
    const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false);
    _v.set(dx / len, dy / len, dz / len);
    _q.setFromUnitVectors(_up, _v);
    _v2.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    _sc.set(1, 1, 1);
    _m4.compose(_v2, _q, _sc);
    g.applyMatrix4(_m4);
    const b = BK[scope];
    (b[key] || (b[key] = [])).push(g);
  }
  /* a levelled circular deck: top slab, battered fascia, and a skirt that reaches PAST the lowest
     ground under it. Three pieces so the horizontal top can take a low-metalness grade and the
     vertical fascia a high one. Returns the deck top y. */
  function levelledDeck(scope, cx, cz, r, opts) {
    const o = opts || {};
    groundBand(cx, cz, r * 1.06, 3, 14);
    const gMin = _gb[0], gMax = _gb[1];
    const topY = gMax + (o.clear != null ? o.clear : 0.9);
    const seg = o.seg || 28;
    const th = o.thick != null ? o.thick : 0.55;
    put(scope, o.topKey || 'midLit', new THREE.CylinderGeometry(r, r, th, seg), cx, topY - th / 2, cz);
    put(scope, 'mid', new THREE.CylinderGeometry(r, r * 0.90, 1.5, seg), cx, topY - th - 0.75, cz);
    if (!o.legs) {
      const skirtTop = topY - th - 1.5;
      const skirtBot = gMin - 1.6;
      if (skirtTop > skirtBot) put(scope, 'mid', new THREE.CylinderGeometry(r * 0.90, r * 0.74, skirtTop - skirtBot, seg), cx, (skirtTop + skirtBot) / 2, cz);
    } else {
      /* SPLAYED LEGS instead of a solid skirt. On a 30-degree cloud flank a solid plinth would be a
         20 m wall; legs let the cloud run under the deck, which is both lighter (§12) and the reason
         the altitude reads. Each leg finds its OWN ground. */
      const n = o.legs, spread = r * (o.legSpread || 0.80), foot = r * (o.legFoot || 1.02);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + (o.legPhase || 0);
        const tx = cx + Math.cos(a) * spread, tz = cz + Math.sin(a) * spread;
        const fx = cx + Math.cos(a) * foot, fz = cz + Math.sin(a) * foot;
        strut(scope, 'satin', fx, ground(fx, fz) - 1.8, fz, tx, topY - th - 0.2, tz, r * 0.055, r * 0.040, 7);
      }
      /* a perimeter ring beam so the legs read as one structure and not as sticks */
      put(scope, 'mid', new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.5, seg, 1, true), cx, topY - th - 1.9, cz);
    }
    washCard(cx, topY - th - 0.02, cz, r * 1.9, r * 1.9, 0, 'fill', o.washGain || 1.0);
    return topY;
  }

  /* a ribbon of deck that CONFORMS to the cloud: paths and flat markings follow the floor instead of
     levelling it, which is the other half of contract law 1 (§03) */
  function ribbon(scope, key, x0, z0, x1, z1, width, lift, steps, endY, startY) {
    const dx = x1 - x0, dz = z1 - z0, len = Math.sqrt(dx * dx + dz * dz);
    if (len < 1) return;
    const ux = -dz / len, uz = dx / len;      /* across the ribbon */
    const n = steps || Math.max(6, Math.round(len / 6));
    const pos = new Float32Array(n * 6 * 3), uv = new Float32Array(n * 6 * 2);
    let o = 0, uo = 0;
    /* a path LEAVES the apron at the apron's own top and ARRIVES on the pad at the pad's own deck; in
       between it belongs to the cloud. Without those two ramps the walkways would start and end in a
       two-to-five metre step, which is the exact failure a level platform on rolling terrain invites. */
    const yAt = (t) => {
      const x = x0 + dx * t, z = z0 + dz * t;
      let y = ground(x, z) + lift;
      if (startY != null && t < 0.18) y = y + (startY - y) * (1 - t / 0.18);
      if (endY != null && t > 0.82) y = y + (endY - y) * ((t - 0.82) / 0.18);
      return y;
    };
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const ax = x0 + dx * t0, az = z0 + dz * t0, bx = x0 + dx * t1, bz = z0 + dz * t1;
      const ay = yAt(t0), by = yAt(t1), hw = width / 2;
      const q = [
        ax - ux * hw, ay, az - uz * hw, bx - ux * hw, by, bz - uz * hw, bx + ux * hw, by, bz + uz * hw,
        ax - ux * hw, ay, az - uz * hw, bx + ux * hw, by, bz + uz * hw, ax + ux * hw, ay, az + uz * hw
      ];
      for (let k = 0; k < 18; k++) pos[o++] = q[k];
      const v0 = t0 * len / 6, v1 = t1 * len / 6;
      const u = [0, v0, 0, v1, 1, v1, 0, v0, 1, v1, 1, v0];
      for (let k = 0; k < 12; k++) uv[uo++] = u[k];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const b = BK[scope];
    (b[key] || (b[key] = [])).push(g);
  }
  /* a conforming disc — a marking laid ON the cloud (ringFar, light pools) */
  function conformDisc(scope, key, cx, cz, r, lift, segs = 24, rings = 3) {
    const tri = segs * rings * 6;
    const pos = new Float32Array(tri * 3), uv = new Float32Array(tri * 2);
    let o = 0, uo = 0;
    const P = (i, j) => {
      const a = (i / segs) * TAU, rr = r * j / rings;
      const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      return [x, ground(x, z) + lift, z, 0.5 + Math.cos(a) * j / rings * 0.5, 0.5 + Math.sin(a) * j / rings * 0.5];
    };
    for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      const quad = [a, b, c, a, c, d];
      for (let k = 0; k < 6; k++) { pos[o++] = quad[k][0]; pos[o++] = quad[k][1]; pos[o++] = quad[k][2]; uv[uo++] = quad[k][3]; uv[uo++] = quad[k][4]; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const b = BK[scope];
    (b[key] || (b[key] = [])).push(g);
  }

  /* ---------------------------------------------------------------- the atmospheric wash
     THE CONTRACT'S COLOUR, ON THE ARCHITECTURE. Two kinds of card, and only two:
       'fill'  a horizontal card under an overhang. In this realm the brightest thing beneath every
               structure is an ocean of lit cloud, so a soffit is lit from BELOW — and the colour of
               that bounce in a direction is exactly layout.fillFor(bearing, band).
       'sky'   a card lying on a pane of glass, carrying what that pane reflects:
               layout.atmosphere(bearing, elevation, band) at the bearing the pane FACES.
     Both are repainted in setTime(), so the same platform turns warm on the sunset side and violet on
     the cold side without a single colour constant appearing in this file. */
  const washPos = [], washMeta = [];    /* meta: bearing, kind(0 fill / 1 sky), gain, elevation */
  function washCard(x, y, z, w, d, yaw, kind, gain, elev) {
    const hw = w / 2, hd = d / 2, c = Math.cos(yaw), s = Math.sin(yaw);
    const bearing = layout.bearingOf(x, z);
    const k = kind === 'sky' ? 1 : 0;
    const corner = (lx, lz) => {
      if (k === 0) { washPos.push(x + lx * c + lz * s, y, z - lx * s + lz * c); }
      else { washPos.push(x + lx * c, y + lz, z - lx * s); }
    };
    /* two triangles */
    corner(-hw, -hd); corner(hw, -hd); corner(hw, hd);
    corner(-hw, -hd); corner(hw, hd); corner(-hw, hd);
    const b = k === 1 ? yaw : bearing;    /* a sky card reflects the bearing it FACES, not where it is */
    for (let i = 0; i < 6; i++) washMeta.push(b, k, gain != null ? gain : 1, elev != null ? elev : 0.16);
  }

  /* ---------------------------------------------------------------- signage plumbing */
  const signMats = [];
  function signMesh(tex, w, h, name) {
    const m = own.m(new THREE.MeshBasicMaterial({ map: own.t(tex), transparent: true, depthWrite: false, toneMapped: true, side: THREE.DoubleSide }));
    signMats.push(m);
    const geo = own.g(new THREE.PlaneGeometry(w, h));
    const mesh = new THREE.Mesh(geo, m); mesh.name = name;
    meshes.push(mesh);
    return mesh;
  }
  /* a 2x2 atlas of short words in the canonical MAH language, so four plates cost ONE draw call.
     Weight 700 at 0.08em tracking, colour BRAND.title — materials.js resolved this and it is not
     re-approximated here. */
  function atlasTexture(labels, size, fontSize) {
    return canvasTexture(size, size, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = BRAND.title;
      g.font = `${BRAND.titleWeight} ${fontSize}px ${BRAND.face}`;
      for (let i = 0; i < 4; i++) {
        const cx = (i % 2) * w / 2 + w / 4, cy = Math.floor(i / 2) * h / 2 + h / 4;
        const text = labels[i] || '';
        const gap = fontSize * BRAND.titleTracking;
        let total = 0; for (const ch of text) total += g.measureText(ch).width + gap; total -= gap;
        let x = cx - total / 2; g.textAlign = 'left';
        for (const ch of text) { g.fillText(ch, x, cy); x += g.measureText(ch).width + gap; }
        g.textAlign = 'center';
      }
    });
  }
  /* one quad of an atlas plate, emitted into a shared list so N plates merge to one mesh */
  const atlasQuads = { actions: [], pads: [] };
  function atlasQuad(listKey, idx, x, y, z, w, h, ry, rx) {
    const g = new THREE.PlaneGeometry(w, h);
    const u0 = (idx % 2) * 0.5, v0 = 0.5 - Math.floor(idx / 2) * 0.5;
    const uv = g.attributes.uv;
    uv.setXY(0, u0, v0 + 0.5); uv.setXY(1, u0 + 0.5, v0 + 0.5);
    uv.setXY(2, u0, v0); uv.setXY(3, u0 + 0.5, v0);
    _v.set(x, y, z); _eu.set(rx || 0, ry || 0, 0, 'YXZ'); _q.setFromEuler(_eu); _sc.set(1, 1, 1);
    _m4.compose(_v, _q, _sc);
    g.applyMatrix4(_m4);
    atlasQuads[listKey].push(g.index ? g.toNonIndexed() : g);
  }

  /* ================================================================= SECTOR B — ARRIVAL
     The only dense part of the realm, and the part the player has at their back when they step out
     (§53). Everything here is measured off the real cloud: the apron levels, the pads level
     independently at four different heights, the concourse stands on a slope. */

  const stagingP = layout.siteAt('staging');
  const APRON_R = 24;
  groundBand(stagingP.x, stagingP.z, APRON_R * 1.05, 3, 16);
  const apronMin = _gb[0], apronMax = _gb[1];
  const APRON_Y = apronMax + 0.55;

  /* ---- the staging apron: the safe, calm, no-combat ground the pods open onto (§21) --------------
     It is the ONE genuinely level thing in a realm of rolling cloud, and that is how it says "safe"
     without a sign: a continuous platinum plane, a soft unbroken edge light, benches, a lean rail
     wherever the cloud falls away — social vocabulary. A sparring ring, forty metres away, is a bare
     marked plane with four open markers and nothing to sit on. Separable at a glance. */
  (function apron() {
    const cx = stagingP.x, cz = stagingP.z, seg = 44;
    place('staging', cx, cz, { radius: APRON_R, baseY: apronMin - 1.8, topY: APRON_Y });
    put('B', 'midLit', new THREE.CylinderGeometry(APRON_R, APRON_R, 0.6, seg), cx, APRON_Y - 0.3, cz);
    put('B', 'mid', new THREE.CylinderGeometry(APRON_R, APRON_R - 1.5, 1.6, seg), cx, APRON_Y - 1.4, cz);
    put('B', 'mid', new THREE.CylinderGeometry(APRON_R - 1.5, APRON_R - 3.4, (APRON_Y - 2.2) - (apronMin - 1.8), seg),
      cx, ((APRON_Y - 2.2) + (apronMin - 1.8)) / 2, cz);
    /* the nosing: a bright chamfered rim, and the only continuous line on the apron */
    put('B', 'lit', new THREE.CylinderGeometry(APRON_R + 0.34, APRON_R + 0.34, 0.22, seg, 1, true), cx, APRON_Y - 0.12, cz);
    put('B', 'energy', new THREE.RingGeometry(APRON_R - 0.95, APRON_R - 0.25, seg).rotateX(-HALF_PI), cx, APRON_Y + 0.02, cz);
    washCard(cx, APRON_Y - 2.3, cz, APRON_R * 2.2, APRON_R * 2.2, 0, 'fill', 1.15);

    /* two inlaid square-diamonds — the world's motif, restrained, and flat so they never break the
       plane a person walks on */
    for (const [size, bar] of [[31, 0.34], [20, 0.22]]) {
      for (let i = 0; i < 4; i++) {
        const a = i * HALF_PI + Math.PI / 4;
        put('X', 'lit', chamferBox(size * 0.72, 0.10, bar, 0.03), cx + Math.cos(a) * size / 2 * 0.72, APRON_Y + 0.04, cz + Math.sin(a) * size / 2 * 0.72, -a + HALF_PI);
      }
    }
    /* benches: low, chamfered, facing outward, and set on the quiet arc away from the pads */
    for (let i = 0; i < 6; i++) {
      const a = -1.05 + i * 0.42;
      const bx = cx + Math.cos(a) * (APRON_R - 4.6), bz = cz + Math.sin(a) * (APRON_R - 4.6);
      put('X', 'midLit', chamferBox(2.8, 0.16, 0.66, 0.05), bx, APRON_Y + 0.52, bz, -a + HALF_PI);
      put('X', 'mid', chamferBox(0.24, 0.5, 0.52, 0.04), bx, APRON_Y + 0.27, bz, -a + HALF_PI, 0, 0, 1, 1, 1);
      put('X', 'mid', chamferBox(2.2, 0.10, 0.10, 0.02), bx, APRON_Y + 0.27, bz, -a + HALF_PI);
    }
    /* THE LEAN RAIL, and it only exists where the cloud actually falls away — the apron is level and
       the floor under it is not, so the exposed arc is computed rather than guessed */
    let prev = null;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU;
      const rx = cx + Math.cos(a) * (APRON_R + 0.2), rz = cz + Math.sin(a) * (APRON_R + 0.2);
      const drop = APRON_Y - ground(rx, rz);
      const here = drop > 2.0 ? { x: rx, z: rz } : null;
      if (here && i % 2 === 0) {
        put('B', 'satin', chamferBox(0.10, 1.06, 0.10, 0.02), rx, APRON_Y + 0.53, rz, -a);
        if (prev) strut('B', 'satin', prev.x, APRON_Y + 1.04, prev.z, rx, APRON_Y + 1.04, rz, 0.055, 0.055, 6);
        prev = here;
      } else if (!here) prev = null;
    }
  })();

  /* ---- the four ascent pads ----------------------------------------------------------------------
     MEASURED: padB stands at ground +7.9 and padD at −11.2, so these are four independent terraces on
     a rolling cloud, not four holes in one slab. Each levels itself at the highest ground under it and
     reaches the cloud with a battered skirt. The pods themselves belong to the ascent module; the
     `pads` array below is the docking contract it reads. */
  const PAD_R = 8.6, PAD_NAMES = ['padA', 'padB', 'padC', 'padD'];
  const pads = [];
  PAD_NAMES.forEach((name, idx) => {
    const s = SITES[name], p = layout.siteAt(name);
    const cx = p.x, cz = p.z;
    groundBand(cx, cz, PAD_R * 1.15, 3, 14);
    const gMin = _gb[0], gMax = _gb[1];
    const deckY = gMax + 1.25;
    place(name, cx, cz, { radius: PAD_R, baseY: gMin - 1.7, topY: deckY });

    put('B', 'midLit', new THREE.CylinderGeometry(PAD_R, PAD_R, 0.5, 26), cx, deckY - 0.25, cz);
    put('B', 'mid', new THREE.CylinderGeometry(PAD_R, PAD_R - 1.3, 1.5, 26), cx, deckY - 1.25, cz);
    const skTop = deckY - 2.0, skBot = gMin - 1.7;
    if (skTop > skBot) put('B', 'mid', new THREE.CylinderGeometry(PAD_R - 1.3, PAD_R - 2.4, skTop - skBot, 26), cx, (skTop + skBot) / 2, cz);
    /* the recess the pod sits in: a shallow well with a lit collar, so the pad reads as a socket */
    put('B', 'midLit', new THREE.CylinderGeometry(4.6, 4.6, 0.3, 24), cx, deckY - 0.6, cz);
    put('B', 'lit', new THREE.CylinderGeometry(4.62, 4.62, 0.46, 24, 1, true), cx, deckY - 0.23, cz);
    /* EDGE LIGHTING — a continuous ring in the rim and a soft pool on the deck */
    put('B', 'energy', new THREE.CylinderGeometry(PAD_R + 0.06, PAD_R + 0.06, 0.13, 26, 1, true), cx, deckY - 0.18, cz);
    put('B', 'soft', new THREE.RingGeometry(PAD_R - 0.4, PAD_R + 2.6, 26).rotateX(-HALF_PI), cx, deckY + 0.03, cz);
    /* retractable-looking guides: four canted blades standing off the recess, tips lit */
    for (let i = 0; i < 4; i++) {
      const a = i * HALF_PI + Math.PI / 4;
      const gx = cx + Math.cos(a) * 6.1, gz = cz + Math.sin(a) * 6.1;
      /* ry = −a + PI/2 puts each blade's local +Z on the outward radius, so rx = −0.16 leans all four
         INWARD over the recess — the read of a guide that folds down onto a docked pod */
      put('B', 'satin', chamferBox(0.55, 3.5, 1.05, 0.08), gx, deckY + 1.6, gz, -a + HALF_PI, -0.16);
      put('B', 'energy', chamferBox(0.30, 0.14, 0.72, 0.03), cx + Math.cos(a) * 5.54, deckY + 3.28, cz + Math.sin(a) * 5.54, -a + HALF_PI, -0.16);
    }
    washCard(cx, deckY - 2.1, cz, PAD_R * 2.1, PAD_R * 2.1, 0, 'fill', 1.0);

    /* CLEAR NUMBERING. A pad number is wayfinding, not copy: one numeral flat on the deck where a
       departing passenger reads it, one on the outboard guide where an arriving pod does. Both come
       out of a single 2x2 atlas, so all eight plates cost one draw call. */
    const inward = faceIn(s.bearing);
    atlasQuad('pads', idx, cx - Math.sin(s.bearing) * 6.4, deckY + 0.06, cz + Math.cos(s.bearing) * 6.4, 2.4, 2.4, inward, -HALF_PI);
    const ox = cx + Math.sin(s.bearing) * 6.35, oz = cz - Math.cos(s.bearing) * 6.35;
    atlasQuad('pads', idx, ox, deckY + 2.1, oz, 1.5, 1.5, inward, 0);

    pads.push({
      id: name, index: idx + 1, label: String(idx + 1),
      x: cx, z: cz,
      y: deckY, deckY,                    /* the platinum surface a pod's feet touch */
      dockY: deckY - 0.3,                 /* the recess floor it settles into */
      groundY: ground(cx, cz),
      radius: PAD_R, recessRadius: 4.6,
      bearing: s.bearing, yaw: inward,
      solid: footprintSolid(cx, cz, PAD_R)
    });
  });

  /* ---- walkways: the cluster becomes ONE place ---------------------------------------------------
     Measured, the apron sits at +8.4 and padD's deck at −10, so four pads and a building would read
     as four objects on a hill unless something joins them. These ribbons CONFORM to the cloud — the
     padD run is a genuine 20 % ramp, because that is what the floor does — and lift onto each pad in
     their last few metres. */
  (function walkways() {
    for (const p of pads) {
      const dx = p.x - stagingP.x, dz = p.z - stagingP.z, len = Math.sqrt(dx * dx + dz * dz);
      const sx = stagingP.x + dx / len * (APRON_R - 1.2), sz = stagingP.z + dz / len * (APRON_R - 1.2);
      const ex = p.x - dx / len * (PAD_R - 0.6), ez = p.z - dz / len * (PAD_R - 0.6);
      ribbon('B', 'lit', sx, sz, ex, ez, 4.8, 0.24, 0, p.deckY - 0.1, APRON_Y - 0.15);
      /* two hairlines of light down the edges — the only thing that makes a path read at dusk */
      const rl = Math.sqrt((ex - sx) * (ex - sx) + (ez - sz) * (ez - sz));
      const ux = -(ez - sz) / rl, uz = (ex - sx) / rl;
      ribbon('B', 'energy', sx + ux * 2.3, sz + uz * 2.3, ex + ux * 2.3, ez + uz * 2.3, 0.16, 0.30, 0, p.deckY - 0.04, APRON_Y - 0.09);
      ribbon('B', 'energy', sx - ux * 2.3, sz - uz * 2.3, ex - ux * 2.3, ez - uz * 2.3, 0.16, 0.30, 0, p.deckY - 0.04, APRON_Y - 0.09);
    }
  })();

  /* ---- MAH ASCENT: the one real building in the sky ---------------------------------------------
     Its own site falls 10.5 m across the frontage, which is what shaped it: the terrace is levelled
     above the high ground and carried on splayed legs where the cloud drops away, so you can see
     cloud running underneath the building you are walking into. Above the terrace, three faceted
     platinum volumes step back; the front of the lower two is a colonnade of piers with the glass set
     1.2 m behind them, which is what makes the glazing DEEP rather than a picture of windows. */
  const concourse = {};
  (function buildConcourse() {
    const s = SITES.concourse, p = layout.siteAt('concourse');
    const yaw = faceIn(s.bearing), c = Math.cos(yaw), sn = Math.sin(yaw);
    /* the terrace is DEEPER than the mass on purpose: the front 9 m of it is the sheltered concourse
       — canopy, columns, the head of the stair — and a building that fills its own podium leaves
       nowhere to arrive */
    const W = 44, D = 30;
    /* local (lx, lz) -> world; +Z is toward the apron */
    const wx = (lx, lz) => p.x + lx * c + lz * sn;
    const wz = (lx, lz) => p.z - lx * sn + lz * c;

    let gMin = Infinity, gMax = -Infinity;
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
      const lx = -W / 2 + W * i / 6, lz = -D / 2 + D * j / 6;
      const h = ground(wx(lx, lz), wz(lx, lz));
      if (h < gMin) gMin = h; if (h > gMax) gMax = h;
    }
    const TER = gMax + 1.6;                       /* the terrace: level, above the highest ground */
    concourse.terraceY = TER; concourse.yaw = yaw; concourse.x = p.x; concourse.z = p.z;
    place('concourse', p.x, p.z, { radius: Math.max(W, D) / 2, baseY: gMin - 2.0, topY: TER + 29 });

    /* terrace slab: top horizontal (low metal), fascia vertical (high metal) */
    put('B', 'midLit', massGeo(W, D, 1.1, 4.0, 0.22), p.x, TER - 1.1, p.z, yaw);
    put('B', 'mid', massGeo(W - 0.9, D - 0.9, 1.5, 3.8, 0.2), p.x, TER - 2.5, p.z, yaw);
    put('B', 'lit', massGeo(W + 0.5, D + 0.5, 0.20, 4.2, 0.05), p.x, TER - 0.20, p.z, yaw);
    washCard(p.x, TER - 2.6, p.z, W * 1.05, D * 1.05, yaw, 'fill', 1.25);

    /* THE COLONNADE. Ten legs, each finding its OWN ground — the building's answer to a sloping site,
       and the reason you can see cloud running underneath the thing you are walking into. */
    for (const [lx, lz] of [[-20, -13], [-20, 0], [-20, 13], [-7, -13.5], [-7, 13.5], [7, -13.5], [7, 13.5], [20, -13], [20, 0], [20, 13]]) {
      const fx = wx(lx * 1.06, lz * 1.06), fz = wz(lx * 1.06, lz * 1.06);
      strut('B', 'satin', fx, ground(fx, fz) - 2.0, fz, wx(lx, lz), TER - 2.4, wz(lx, lz), 0.85, 0.62, 8);
    }
    /* one horizontal brace course, so the legs read as a structure */
    for (const lz of [-13, 13]) strut('B', 'satin', wx(-20, lz), TER - 5.6, wz(-20, lz), wx(20, lz), TER - 5.6, wz(20, lz), 0.28, 0.28, 6);

    /* --- the mass: three faceted volumes, stepping back --- */
    const LV = [
      { w: 42, d: 20, h: 12, c: 3.6, dz: -4.0, key: 'brushed' },
      { w: 32, d: 16, h: 9.5, c: 3.0, dz: -6.0, key: 'mid' },
      { w: 21, d: 12, h: 8.0, c: 2.3, dz: -8.0, key: 'mid' }
    ];
    let y = TER;
    LV.forEach((L, li) => {
      /* the core is pushed BACK 3.2 m on the two lower levels; the front of that gap becomes piers, and
         the glass hangs in the gap between them, which is what makes the glazing genuinely DEEP */
      const coreD = li < 2 ? L.d - 3.2 : L.d;
      const coreDz = li < 2 ? L.dz - 1.6 : L.dz;
      put('B', L.key, massGeo(L.w, coreD, L.h, L.c, 0.3), wx(0, coreDz), y, wz(0, coreDz), yaw);
      /* parapet cap — HORIZONTAL, so it must not be a mirror grade or it renders black */
      put('B', 'midLit', massGeo(L.w + 1.0, L.d + 1.0, 0.55, L.c + 0.4, 0.12), wx(0, L.dz), y + L.h - 0.2, wz(0, L.dz), yaw);
      put('B', 'lit', massGeo(L.w + 1.4, L.d + 1.4, 0.16, L.c + 0.5, 0.04), wx(0, L.dz), y + L.h + 0.35, wz(0, L.dz), yaw);

      if (li < 2) {
        /* DEEP ILLUMINATED GLAZING. Piers stand 1.2 m proud of the glass line; behind the glass a warm
           interior plane. That is the whole trick — depth, not decals. */
        const nBays = li === 0 ? 5 : 4;
        const faceZ = L.dz + L.d / 2 - 1.2;
        const glassZ = L.dz + L.d / 2 - 2.3;
        const pierW = 2.1, span = L.w - 3.0;
        const bayW = (span - nBays * pierW) / Math.max(1, nBays - 1);
        for (let i = 0; i < nBays; i++) {
          const px2 = -span / 2 + pierW / 2 + i * (pierW + bayW);
          put('B', 'mid', chamferBox(pierW, L.h - 1.2, 2.6, 0.18), wx(px2, faceZ), y + (L.h - 1.2) / 2, wz(px2, faceZ), yaw);
          if (i < nBays - 1) {
            const bx = px2 + pierW / 2 + bayW / 2, bh = L.h - 3.4;
            put('B', 'glass', new THREE.PlaneGeometry(bayW - 0.2, bh), wx(bx, glassZ), y + 1.7 + bh / 2, wz(bx, glassZ), yaw);
            /* the warm plane sits 0.55 m BEHIND the glass and 0.35 m in front of the core's face — it
               has to be inside the gap or the room is buried in the mass and nothing lights up */
            put('B', 'warm', new THREE.PlaneGeometry(bayW - 0.5, bh - 0.5), wx(bx, glassZ - 0.55), y + 1.7 + bh / 2, wz(bx, glassZ - 0.55), yaw);
            /* WHAT THE GLASS REFLECTS comes from layout.atmosphere() at the bearing this pane faces */
            washCard(wx(bx, glassZ + 0.05), y + 1.7 + bh / 2, wz(bx, glassZ + 0.05), bayW - 0.3, bh, s.bearing + Math.PI, 'sky', 0.55, 0.18);
            /* a mullion pair per bay: the fine vertical grain that stops a facade reading as a slab */
            put('X', 'satin', chamferBox(0.16, bh, 0.34, 0.04), wx(bx - bayW * 0.22, glassZ + 0.3), y + 1.7 + bh / 2, wz(bx - bayW * 0.22, glassZ + 0.3), yaw);
            put('X', 'satin', chamferBox(0.16, bh, 0.34, 0.04), wx(bx + bayW * 0.22, glassZ + 0.3), y + 1.7 + bh / 2, wz(bx + bayW * 0.22, glassZ + 0.3), yaw);
          }
        }
        /* sill and head beams close the colonnade */
        put('B', 'midLit', chamferBox(span + 1.2, 0.55, 2.9, 0.10), wx(0, faceZ), y + 1.45, wz(0, faceZ), yaw);
        put('B', 'midLit', chamferBox(span + 1.2, 0.8, 2.9, 0.12), wx(0, faceZ), y + L.h - 1.6, wz(0, faceZ), yaw);
      }
      /* THE SIDE ELEVATIONS. Budget headroom is spent HERE (§45/§46 say near the player and on the
         hero silhouettes): without them the mass is a bare octagonal prism on three of its four sides,
         and this is the one building in the realm. Two shadow-gap courses per level, and a fin order
         on the flanks — vertical, so the high-metal grade reflects the horizon and reads. */
      for (const t of [0.34, 0.70]) {
        put('X', 'lit', massGeo(L.w + 0.28, coreD + 0.28, 0.16, L.c + 0.1, 0.04), wx(0, coreDz), y + L.h * t, wz(0, coreDz), yaw);
      }
      for (const side of [-1, 1]) for (let f = 0; f < 5; f++) {
        const lz2 = coreDz - coreD * 0.34 + f * coreD * 0.17;
        put('X', 'satin', chamferBox(0.30, L.h - 1.4, 0.70, 0.06), wx(side * (L.w / 2 + 0.12), lz2), y + L.h / 2, wz(side * (L.w / 2 + 0.12), lz2), yaw);
      }
      y += L.h;
    });
    concourse.topY = y;

    /* --- the sheltered concourse at its foot: a canopy on six columns, warm underneath ---
       This is the piece that does the emotional work. You come up the steps out of open cloud and
       there is a lit soffit over your head before you are indoors. */
    const canY = TER + 5.4, canZ = 10.5;      /* over the terrace, not over the void beyond it */
    put('B', 'midLit', massGeo(28, 9, 0.7, 2.2, 0.16), wx(0, canZ), canY, wz(0, canZ), yaw);
    put('B', 'lit', massGeo(28.8, 9.8, 0.16, 2.4, 0.04), wx(0, canZ), canY + 0.72, wz(0, canZ), yaw);
    put('B', 'warm', new THREE.PlaneGeometry(24, 6.6).rotateX(HALF_PI), wx(0, canZ), canY - 0.03, wz(0, canZ), yaw);
    washCard(wx(0, canZ), canY - 0.10, wz(0, canZ), 26, 7.6, yaw, 'fill', 0.9);
    for (let i = 0; i < 6; i++) {
      const lx = -11.5 + i * 4.6;
      strut('B', 'satin', wx(lx, canZ + 3.1), TER, wz(lx, canZ + 3.1), wx(lx, canZ + 3.1), canY - 0.3, wz(lx, canZ + 3.1), 0.30, 0.24, 8);
    }
    /* THE STAIR, and it is a solid stepped MASS rather than a flight of floating treads: each riser is
       cut down to the cloud beneath it, because the ground falls away under the flight and a tread
       hovering over that gap is exactly the failure contract law 1 exists to prevent. */
    const nStep = 8;
    const stepBase = ground(wx(0, D / 2 + 0.6 + nStep * 1.4), wz(0, D / 2 + 0.6 + nStep * 1.4));
    const rise = Math.max(0.16, (TER - stepBase - 0.3) / nStep);
    for (let i = 0; i < nStep; i++) {
      const lz = D / 2 + 0.6 + i * 1.4;
      const sxw = wx(0, lz), szw = wz(0, lz);
      const treadY = TER - (i + 1) * rise;
      const hh = Math.max(0.35, treadY - (ground(sxw, szw) - 1.4));
      put('B', 'midLit', chamferBox(17, hh, 1.5, 0.06), sxw, treadY - hh / 2, szw, yaw);
    }
    /* and the ribbon that reaches the apron */
    const footX = wx(0, D / 2 + 0.6 + nStep * 1.4 + 1.6), footZ = wz(0, D / 2 + 0.6 + nStep * 1.4 + 1.6);
    const ddx = footX - stagingP.x, ddz = footZ - stagingP.z, dl = Math.sqrt(ddx * ddx + ddz * ddz);
    ribbon('B', 'lit', stagingP.x + ddx / dl * (APRON_R - 1.2), stagingP.z + ddz / dl * (APRON_R - 1.2), footX, footZ, 6.4, 0.24, 0, stepBase + 0.2, APRON_Y - 0.15);

    /* --- THE CANTED SIGNAGE BLADE ---
       At the high end of the terrace, clear of the canopy, raked back 9 degrees so it catches the
       sunset on its face and the cold sky on its edge. It carries the wordmark, the canonical
       sub-line and the canonical mark — and nothing else exists to put on it. */
    const bx = 19.0, bz = 11.0, rake = -0.157;
    const bladeH = 15.5;
    concourse.blade = { x: wx(bx, bz), z: wz(bx, bz), y: TER, h: bladeH };
    put('B', 'mid', chamferBox(5.6, bladeH, 0.85, 0.16), wx(bx, bz), TER + bladeH / 2, wz(bx, bz), yaw, rake);
    put('B', 'lit', chamferBox(5.9, 0.22, 1.05, 0.05), wx(bx, bz), TER + bladeH + 0.1, wz(bx, bz), yaw, rake);
    put('B', 'energy', chamferBox(0.16, bladeH - 1.2, 0.20, 0.03), wx(bx - 2.75, bz + 0.45), TER + bladeH / 2, wz(bx - 2.75, bz + 0.45), yaw, rake);
    put('B', 'energy', chamferBox(0.16, bladeH - 1.2, 0.20, 0.03), wx(bx + 2.75, bz + 0.45), TER + bladeH / 2, wz(bx + 2.75, bz + 0.45), yaw, rake);
    /* THE MARK: canonical geometry from materials.js, merged — one draw call, no texture, no
       approximation. Mirror grade, and vertical, which is the only orientation it reads in. */
    const markG = fobMark(1.05, 0.10);
    put('B', 'mirror', markG, wx(bx, bz + 0.5), TER + bladeH * 0.80, wz(bx, bz + 0.5), yaw, rake);
    /* the wordmark itself */
    const sign = signMesh(signTexture({ title: SIGNAGE.ascent, sub: SIGNAGE.canonicalSub, w: 2048, h: 768, titleSize: 205, subSize: 60 }), 4.95, 1.86, 'sky-sign-ascent');
    sign.position.set(wx(bx, bz + 0.5), TER + bladeH * 0.50, wz(bx, bz + 0.5));
    sign.rotation.set(rake, yaw, 0, 'YXZ');
    group.add(sign);
  })();

  /* ---- the ASCENT QUEUE pylon --------------------------------------------------------------------
     A free-standing lit panel: the mark, the name, and a live list of what each pad is doing. That
     list is WAYFINDING and is driven by the ascent module through setQueue() — a static picture of
     four states would be a lie the moment a pod moved. Nothing else is written on it. */
  const queue = { rows: 4, tex: null, canvas: null, gfx: null, mesh: null };
  const QUEUE_STATES = ['READY', 'BOARDING', 'DEPARTING', 'PREPARING'];
  (function queuePylon() {
    const s = SITES.queuePylon, p = layout.siteAt('queuePylon');
    const yaw = faceIn(s.bearing);
    /* MEASURED: this site is 11.8 m from the apron's centre, i.e. it stands ON the apron, whose top is
       1.9 m above the cloud there. Taking its base from the cloud would bury it to the knee — a thing
       standing on a built platform takes ITS height, not the terrain's. */
    const dxA = p.x - stagingP.x, dzA = p.z - stagingP.z;
    const onApron = Math.sqrt(dxA * dxA + dzA * dzA) < APRON_R - 1.5;
    const gy = onApron ? APRON_Y : ground(p.x, p.z);
    place('queuePylon', p.x, p.z, { radius: 1.6, baseY: onApron ? apronMin - 1.8 : gy - 1.0, topY: gy + 6.0 });
    put('B', 'midLit', chamferBox(3.0, 0.34, 1.5, 0.07), p.x, gy + 0.17, p.z, yaw);
    put('B', 'mid', chamferBox(2.5, 0.9, 1.1, 0.10), p.x, gy + 0.79, p.z, yaw);
    put('B', 'mid', chamferBox(2.7, 4.6, 0.42, 0.09), p.x, gy + 3.4, p.z, yaw);
    put('B', 'lit', chamferBox(2.95, 0.18, 0.62, 0.04), p.x, gy + 5.76, p.z, yaw);
    put('B', 'energy', chamferBox(2.45, 0.10, 0.14, 0.02), p.x, gy + 1.32, p.z, yaw);
    put('B', 'mirror', fobMark(0.52, 0.07), p.x + Math.sin(yaw) * 0.24, gy + 5.25, p.z + Math.cos(yaw) * 0.24, yaw);

    const title = signMesh(signTexture({ title: SIGNAGE.queue, w: 1024, h: 320, titleSize: 130 }), 2.24, 0.70, 'sky-sign-queue');
    title.position.set(p.x + Math.sin(yaw) * 0.23, gy + 4.62, p.z + Math.cos(yaw) * 0.23);
    title.rotation.y = yaw;
    group.add(title);

    /* the live list. Its own canvas so setQueue() can repaint it in place rather than build a texture
       per frame; the typography is the canonical pairing — tight 700 label against wide 500 state. */
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
    queue.canvas = cv; queue.gfx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    queue.tex = own.t(tex);
    const qm = own.m(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: true }));
    signMats.push(qm);
    const qmesh = new THREE.Mesh(own.g(new THREE.PlaneGeometry(2.3, 2.3)), qm);
    qmesh.name = 'sky-sign-queue-status';
    qmesh.position.set(p.x + Math.sin(yaw) * 0.23, gy + 3.05, p.z + Math.cos(yaw) * 0.23);
    qmesh.rotation.y = yaw;
    queue.mesh = qmesh; meshes.push(qmesh); group.add(qmesh);
  })();

  /* the wayfinding plates and the threshold plate — the last of the realm's permitted text */
  (function apronSignage() {
    const cx = stagingP.x, cz = stagingP.z;
    /* UPPER REALM, inlaid flat in the apron on the sunset axis: you step off a pod, turn, and it is
       under your feet on the way to the view */
    const rp = signMesh(signTexture({ title: SIGNAGE.realm, w: 1536, h: 360, titleSize: 150 }), 6.6, 1.55, 'sky-sign-realm');
    rp.position.set(cx + Math.sin(0) * 0, APRON_Y + 0.05, cz - Math.cos(0) * 15.5);
    rp.rotation.set(-HALF_PI, 0, 0, 'YXZ');
    rp.material.polygonOffset = true; rp.material.polygonOffsetFactor = -2; rp.material.polygonOffsetUnits = -2;
    group.add(rp);

    /* the four actions, each aimed at the site it actually names — bearings computed FROM THE APRON to
       the real world position, not assumed */
    const aim = [
      ['TRAIN', 'launchPylons'], ['FLY', 'gateLane'], ['SPAR', 'ringMid'], ['RETURN', 'padB']
    ];
    aim.forEach(([word, site], i) => {
      const t = layout.siteAt(site);
      const b = layout.bearingOf(t.x - cx, t.z - cz);
      const px2 = cx + Math.sin(b) * (APRON_R - 2.6), pz2 = cz - Math.cos(b) * (APRON_R - 2.6);
      /* the wedge is canted back toward the apron so the word reads while walking out to it */
      put('X', 'mid', chamferBox(2.1, 0.62, 0.5, 0.06), px2, APRON_Y + 0.30, pz2, -b, -0.52);
      atlasQuad('actions', i, px2 - Math.sin(b) * 0.30, APRON_Y + 0.56, pz2 + Math.cos(b) * 0.30, 1.85, 0.68, -b + Math.PI, -1.05);
    });
  })();

  /* ================================================================= SECTOR A — SUNSET
     Almost nothing is built here (§01, §15): the cliff is the view and the breathing room is the
     content. Three restrained pieces, and no signage at all. */

  /* ---- the sunset observation deck ---------------------------------------------------------------
     An arc of levelled deck out on the ridge, panoramic and meditative. Something to lean on along
     the whole outer edge, somewhere to sit along the inner, and nothing else — no sign, no light
     sculpture, nothing that competes with the sun. */
  (function overlook() {
    const s = SITES.overlook, p = layout.siteAt('overlook');
    /* 32 m deep and 54 m of arc: generous, because panoramic is the whole point, but sector A carries
       an `architecture` weight of 0.05 in the contract and this is the largest thing allowed in it */
    const r0 = s.r - 13, r1 = s.r + 19, halfArc = 0.115;
    const segs = 22, rings = 4;
    let gMax = -Infinity, gMin = Infinity;
    for (let i = 0; i <= segs; i++) for (let j = 0; j <= rings; j++) {
      const b = s.bearing - halfArc + (i / segs) * halfArc * 2, rr = r0 + (r1 - r0) * j / rings;
      const d = layout.dir(b), h = ground(d.x * rr, d.z * rr);
      if (h > gMax) gMax = h; if (h < gMin) gMin = h;
    }
    const TOP = gMax + 1.0;
    place('overlook', p.x, p.z, { radius: (r1 - r0) / 2, baseY: gMin - 1.6, topY: TOP });

    /* the deck as an annulus sector — one buffer, flat, level */
    const tri = segs * rings * 6;
    const pos = new Float32Array(tri * 3), uv = new Float32Array(tri * 2);
    let o = 0, uo = 0;
    const V = (i, j) => {
      const b = s.bearing - halfArc + (i / segs) * halfArc * 2, rr = r0 + (r1 - r0) * j / rings;
      const d = layout.dir(b);
      return [d.x * rr, TOP, d.z * rr, i / segs * 6, j / rings];
    };
    for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) {
      const q = [V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j), V(i + 1, j + 1), V(i, j + 1)];
      for (let k = 0; k < 6; k++) { pos[o++] = q[k][0]; pos[o++] = q[k][1]; pos[o++] = q[k][2]; uv[uo++] = q[k][3]; uv[uo++] = q[k][4]; }
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    dg.computeVertexNormals();
    (BK.A.midLit || (BK.A.midLit = [])).push(dg);

    /* the outer fascia and the two edge arcs */
    for (let i = 0; i < segs; i++) {
      const b0 = s.bearing - halfArc + (i / segs) * halfArc * 2, b1 = s.bearing - halfArc + ((i + 1) / segs) * halfArc * 2;
      const d0 = layout.dir(b0), d1 = layout.dir(b1);
      const ax = d0.x * r1, az = d0.z * r1, bx = d1.x * r1, bz = d1.z * r1;
      strut('A', 'mid', ax, TOP - 0.35, az, bx, TOP - 0.35, bz, 0.55, 0.55, 5);
      strut('A', 'lit', ax, TOP + 0.02, az, bx, TOP + 0.02, bz, 0.16, 0.16, 5);
      /* the deck's legs down to the actual cloud, every third segment */
      if (i % 3 === 0) {
        strut('A', 'satin', ax, ground(ax, az) - 1.8, az, ax, TOP - 0.7, az, 0.34, 0.26, 7);
        const ix = d0.x * r0, iz = d0.z * r0;
        strut('A', 'satin', ix, ground(ix, iz) - 1.8, iz, ix, TOP - 0.7, iz, 0.30, 0.24, 7);
      }
      /* THE LEAN RAIL — continuous, waist height, with a glass balustrade under it. This is the
         "something to lean on" the whole deck exists for. */
      strut('A', 'satin', ax, TOP + 1.06, az, bx, TOP + 1.06, bz, 0.07, 0.07, 6);
      put('A', 'lit', chamferBox(Math.sqrt((bx - ax) * (bx - ax) + (bz - az) * (bz - az)) + 0.1, 0.09, 0.30, 0.03),
        (ax + bx) / 2, TOP + 1.14, (az + bz) / 2, faceOut(b0) + HALF_PI);
      if (i % 2 === 0) put('A', 'satin', chamferBox(0.09, 1.08, 0.09, 0.02), ax, TOP + 0.54, az, faceOut(b0));
      const panW = Math.sqrt((bx - ax) * (bx - ax) + (bz - az) * (bz - az));
      put('X', 'glass', new THREE.PlaneGeometry(panW, 0.86), (ax + bx) / 2, TOP + 0.56, (az + bz) / 2, faceOut(b0));
      washCard((ax + bx) / 2, TOP + 0.56, (az + bz) / 2, panW, 0.86, b0, 'sky', 0.34, 0.02);
    }
    /* the bench arc on the inner edge: sit with your back to the realm and the sun in front of you */
    for (let i = 0; i < segs; i += 2) {
      const b = s.bearing - halfArc + ((i + 0.5) / segs) * halfArc * 2;
      const d = layout.dir(b), bx = d.x * (r0 + 2.4), bz = d.z * (r0 + 2.4);
      const w = (halfArc * 2 / segs) * (r0 + 2.4) * 2 - 0.3;
      put('X', 'midLit', chamferBox(w, 0.16, 0.72, 0.05), bx, TOP + 0.50, bz, faceOut(b) + HALF_PI);
      put('X', 'mid', chamferBox(w * 0.5, 0.48, 0.5, 0.04), bx, TOP + 0.25, bz, faceOut(b) + HALF_PI);
    }
    /* three shallow steps up from the cloud on the inner edge, so the deck is walked onto, not climbed */
    for (let k = 0; k < 3; k++) {
      const rr = r0 - 1.0 - k * 1.3;
      for (let i = 0; i < segs; i += 2) {
        const b = s.bearing - halfArc + ((i + 0.5) / segs) * halfArc * 2, d = layout.dir(b);
        const sx = d.x * rr, sz = d.z * rr;
        const w = (halfArc * 2 / segs) * rr * 2 + 0.2;
        put('A', 'midLit', chamferBox(w, 0.30, 1.25, 0.05), sx, TOP - 0.32 * (k + 1) - 0.15, sz, faceOut(b) + HALF_PI);
      }
    }
    washCard(p.x, TOP - 0.9, p.z, (r1 - r0) * 1.6, (r1 - r0) * 1.6, 0, 'fill', 1.1);
  })();

  /* ---- the rest deck: players do not always need to fight (§25) ---------------------------------- */
  (function restDeck() {
    const s = SITES.restDeck, p = layout.siteAt('restDeck');
    const R = 10.5;
    const TOP = levelledDeck('A', p.x, p.z, R, { clear: 0.9, seg: 24, thick: 0.45 });
    place('restDeck', p.x, p.z, { radius: R, topY: TOP });
    put('A', 'lit', new THREE.CylinderGeometry(R + 0.28, R + 0.28, 0.18, 24, 1, true), p.x, TOP - 0.08, p.z);
    /* five seats on the inland arc, all looking at the sun */
    for (let i = 0; i < 5; i++) {
      const a = s.bearing + Math.PI + (i - 2) * 0.36;
      const bx = p.x + Math.sin(a) * (R - 2.5), bz = p.z - Math.cos(a) * (R - 2.5);
      put('X', 'midLit', chamferBox(2.0, 0.15, 0.66, 0.05), bx, TOP + 0.48, bz, faceIn(a));
      put('X', 'mid', chamferBox(0.9, 0.46, 0.48, 0.04), bx, TOP + 0.24, bz, faceIn(a));
    }
    /* one lean rail on the sunset side and one slender lamp — that is the whole programme */
    for (let i = 0; i <= 8; i++) {
      const a = s.bearing - 0.55 + i * 0.1375;
      const rx = p.x + Math.sin(a) * R, rz = p.z - Math.cos(a) * R;
      if (i % 2 === 0) put('A', 'satin', chamferBox(0.09, 1.02, 0.09, 0.02), rx, TOP + 0.51, rz, faceOut(a));
      if (i > 0) {
        const pa = s.bearing - 0.55 + (i - 1) * 0.1375;
        strut('A', 'satin', p.x + Math.sin(pa) * R, TOP + 1.02, p.z - Math.cos(pa) * R, rx, TOP + 1.02, rz, 0.06, 0.06, 6);
      }
    }
    const mx = p.x + Math.sin(s.bearing + Math.PI) * (R - 1.4), mz = p.z - Math.cos(s.bearing + Math.PI) * (R - 1.4);
    strut('A', 'satin', mx, TOP, mz, mx, TOP + 4.6, mz, 0.16, 0.10, 8);
    put('A', 'lit', new THREE.CylinderGeometry(0.72, 0.44, 0.30, 12), mx, TOP + 4.72, mz);
    put('A', 'warm', new THREE.CircleGeometry(0.62, 12).rotateX(HALF_PI), mx, TOP + 4.55, mz);
    put('A', 'warmSoft', new THREE.CircleGeometry(2.6, 14).rotateX(-HALF_PI), mx, TOP + 0.06, mz);
    washCard(p.x, TOP - 1.0, p.z, R * 2, R * 2, 0, 'fill', 1.0);
  })();

  /* ---- the cliff marker: where the deck ends ------------------------------------------------------
     deckEdge() at this site reads 0.27, i.e. it genuinely IS the rim. Three elements and no more:
     two posts, a plate between them, and a light line along the last of the floor. */
  (function cliffMarker() {
    const s = SITES.cliffMarker, p = layout.siteAt('cliffMarker');
    const gy = ground(p.x, p.z);
    place('cliffMarker', p.x, p.z, { radius: 4, topY: gy + 2.7 });
    const across = s.bearing + HALF_PI;
    for (const sd of [-1, 1]) {
      const px2 = p.x + Math.sin(across) * sd * 3.4, pz2 = p.z - Math.cos(across) * sd * 3.4;
      const g2 = ground(px2, pz2);
      put('A', 'satin', chamferBox(0.26, 2.7, 0.26, 0.05), px2, g2 + 1.35, pz2, faceIn(s.bearing));
      put('A', 'lit', chamferBox(0.42, 0.14, 0.42, 0.03), px2, g2 + 2.74, pz2, faceIn(s.bearing));
    }
    /* the plate: the world's square-diamond, laid flat, unlit, restrained */
    for (let i = 0; i < 4; i++) {
      const a = i * HALF_PI + Math.PI / 4;
      put('A', 'lit', chamferBox(2.0, 0.10, 0.20, 0.03), p.x + Math.cos(a) * 1.4, gy + 0.10, p.z + Math.sin(a) * 1.4, -a + HALF_PI);
    }
    /* and one line of light along the last metres of floor. It FINDS the edge with deckEdge() rather
       than being drawn at a radius that looked right: the rim moves with the bearing, and a light line
       that misses it by ten metres is a light line about nothing. */
    for (let i = -6; i <= 6; i++) {
      const b = s.bearing + i * 0.016;
      const d = layout.dir(b);
      let rr = DECK.cliffRadius + 20;
      while (rr > 200 && layout.deckEdge(d.x * rr, d.z * rr) < 0.06) rr -= 1.5;
      const ex = d.x * (rr - 1.5), ez = d.z * (rr - 1.5);
      put('A', 'energy', chamferBox(1.4, 0.09, 0.22, 0.02), ex, ground(ex, ez) + 0.10, ez, faceOut(b) + HALF_PI);
    }
  })();

  /* ================================================================= SECTOR C — TRAINING
     SPARSE, and it has to stay sparse: the content of this sector is DISTANCE (§21–24, §51). Three
     rings, one flight lane, one target field, five pylons — spread across 700 m of open cloud. */

  /* ---- the sparring rings -------------------------------------------------------------------------
     PvP is CONSENSUAL, so a perimeter here is an AGREEMENT, not a cage: four open markers on the
     cardinals, a dashed light line, and nothing between them. You can walk in from any direction.

     ringNear and ringMid sit on 31 and 41 degree cloud flanks, so they are levelled decks on splayed
     legs — you cannot spar on a hillside, and a levelled deck over falling cloud is also the strongest
     statement of altitude in the sector. ringFar sits on ground that is flat to 0.4 m over its whole
     width, so it is what a ring wants to be: a marking laid straight on the cloud. */
  const RINGS = [
    { name: 'ringNear', r: 10.0, levelled: true },
    { name: 'ringMid', r: 9.0, levelled: true },
    { name: 'ringFar', r: 8.0, levelled: false }
  ];
  RINGS.forEach(R => {
    const p = layout.siteAt(R.name);
    let top;
    if (R.levelled) {
      top = levelledDeck('C', p.x, p.z, R.r, { clear: 0.45, seg: 26, thick: 0.34, legs: 6, legSpread: 0.78, legFoot: 1.0, washGain: 1.2 });
    } else {
      conformDisc('C', 'lit', p.x, p.z, R.r, 0.10, 26, 3);
      top = ground(p.x, p.z) + 0.10;
    }
    place(R.name, p.x, p.z, { radius: R.r, topY: top });
    /* the inlaid diamond that says "a bout happens here" */
    for (let i = 0; i < 4; i++) {
      const a = i * HALF_PI + Math.PI / 4;
      const s2 = R.r * 1.05;
      put('C', 'mirror', chamferBox(s2 * 0.72, 0.07, 0.26, 0.02), p.x + Math.cos(a) * s2 / 2 * 0.72, top + 0.05, p.z + Math.sin(a) * s2 / 2 * 0.72, -a + HALF_PI);
    }
    /* the dashed agreement line: twelve short marks, generous gaps, deliberately not continuous */
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const dx = p.x + Math.cos(a) * (R.r - 0.55), dz = p.z + Math.sin(a) * (R.r - 0.55);
      put('C', 'energy', chamferBox(1.05, 0.07, 0.16, 0.02), dx, top + 0.05, dz, -a);
    }
    /* four corner markers, 1.15 m tall — waist height, open, steppable-past */
    for (let i = 0; i < 4; i++) {
      const a = i * HALF_PI + Math.PI / 4;
      const mx = p.x + Math.cos(a) * (R.r - 0.2), mz = p.z + Math.sin(a) * (R.r - 0.2);
      put('C', 'satin', chamferBox(0.16, 1.15, 0.16, 0.03), mx, top + 0.58, mz, -a);
      /* a small upright square-diamond on top: the motif, at the scale of a marker, not a gate */
      for (let k = 0; k < 4; k++) {
        const b2 = k * HALF_PI + Math.PI / 4;
        put('C', 'satin', chamferBox(0.62, 0.09, 0.09, 0.02), mx + Math.cos(b2) * 0.31, top + 1.48 + Math.sin(b2) * 0.31, mz, -a, 0, -b2 + HALF_PI);
      }
      put('C', 'energy', chamferBox(0.16, 0.16, 0.16, 0.03), mx, top + 1.48, mz, -a);
    }
  });

  /* ---- the flight-gate lane -----------------------------------------------------------------------
     EXPLICITLY FLOATING (contract law 1): these hang in open air, which is the point — a resident
     flies THROUGH them. The lane's floor is the real cloud, so each gate is held at least 18 m above
     whatever is under it AND on a steady climb, which is why the first gate is 12 m up a 92 m ridge
     and the last is 168 m over cloud that has fallen to 51. */
  const GATE_MAX = 7;
  const gateLane = { count: 0, mesh: null, energyMesh: null };
  (function gates() {
    const s = SITES.gateLane, d = layout.dir(s.bearing);
    const frameParts = [];
    /* one unit gate: a square-diamond ring of four chamfered bars, in the XY plane facing +Z */
    for (let i = 0; i < 4; i++) {
      const a = i * HALF_PI + Math.PI / 4;
      const g = chamferBox(0.72, 0.09, 0.10, 0.02);
      _v.set(Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0); _eu.set(0, 0, -a + HALF_PI, 'YXZ');
      _q.setFromEuler(_eu); _sc.set(1, 1, 1); _m4.compose(_v, _q, _sc);
      g.applyMatrix4(_m4);
      frameParts.push(g.index ? g.toNonIndexed() : g);
    }
    const frameGeo = own.g(mergeList(frameParts));
    const ringGeo = own.g(new THREE.TorusGeometry(0.33, 0.018, 5, 24));

    const fm = new THREE.InstancedMesh(frameGeo, matFor('satin'), GATE_MAX);
    const em = new THREE.InstancedMesh(ringGeo, mat.energy, GATE_MAX);
    fm.name = 'sky-gates'; em.name = 'sky-gates-light';
    const y0 = ground(d.x * s.r, d.z * s.r) + 12;
    for (let i = 0; i < GATE_MAX; i++) {
      const r = s.r + i * 68;
      const gx = d.x * r, gz = d.z * r;
      const size = 15 + i * 1.4;
      const y = Math.max(ground(gx, gz) + 18, y0 + i * 8.5);
      const yPrev = i === 0 ? y : Math.max(ground(d.x * (r - 68), d.z * (r - 68)) + 18, y0 + (i - 1) * 8.5);
      const pitch = -Math.atan2(y - yPrev, 68);
      _v.set(gx, y, gz); _eu.set(pitch, faceOut(s.bearing), 0, 'YXZ'); _q.setFromEuler(_eu);
      _sc.set(size, size, size); _m4.compose(_v, _q, _sc);
      fm.setMatrixAt(i, _m4);
      _sc.set(size, size, size * 0.6); _m4.compose(_v, _q, _sc);
      em.setMatrixAt(i, _m4);
      place('gate' + i, gx, gz, { floating: true, topY: y, radius: size / 2 });
    }
    fm.instanceMatrix.needsUpdate = true; em.instanceMatrix.needsUpdate = true;
    fm.computeBoundingSphere(); em.computeBoundingSphere();
    gateLane.mesh = fm; gateLane.energyMesh = em; gateLane.count = GATE_MAX;
    meshes.push(fm, em); group.add(fm, em);
  })();

  /* ---- the target field --------------------------------------------------------------------------
     Floating target diamonds over a 33 degree cloud flank, plus four impact constructs standing on the
     real floor. The diamonds turn and breathe in update(); nothing about them allocates. */
  const TARGET_MAX = 14;
  const targets = { mesh: null, core: null, count: TARGET_MAX, base: new Float32Array(TARGET_MAX * 4), scale: new Float32Array(TARGET_MAX), spin: new Float32Array(TARGET_MAX) };
  (function targetField() {
    const p = layout.siteAt('targetField');
    const R = layout.rng('sky-targets');
    const shell = own.g(new THREE.OctahedronGeometry(1, 0));
    const core = own.g(new THREE.OctahedronGeometry(0.42, 0));
    const sm = new THREE.InstancedMesh(shell, matFor('glass'), TARGET_MAX);
    const cm = new THREE.InstancedMesh(core, mat.energyLight, TARGET_MAX);
    sm.name = 'sky-targets'; cm.name = 'sky-targets-core';
    for (let i = 0; i < TARGET_MAX; i++) {
      const a = R() * TAU, rr = 6 + Math.sqrt(R()) * 34;
      const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
      const y = ground(x, z) + 7 + R() * 26;
      targets.base[i * 4] = x; targets.base[i * 4 + 1] = y; targets.base[i * 4 + 2] = z; targets.base[i * 4 + 3] = R() * TAU;
      targets.scale[i] = 1.5 + R() * 1.9;
      targets.spin[i] = 0.12 + R() * 0.28;
      place('target' + i, x, z, { floating: true, topY: y, radius: targets.scale[i] });
    }
    targets.mesh = sm; targets.core = cm;
    meshes.push(sm, cm); group.add(sm, cm);
    /* the impact constructs: grounded, padded on top, each finding its own floor */
    for (let i = 0; i < 4; i++) {
      const a = p_angle(i), rr = 16 + i * 5;
      const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
      const gy = ground(x, z);
      const h = 2.2 + (i % 3) * 0.7;
      for (let k = 0; k < 3; k++) {
        const la = k / 3 * TAU + 0.4;
        const fx = x + Math.cos(la) * 1.5, fz = z + Math.sin(la) * 1.5;
        strut('C', 'satin', fx, ground(fx, fz) - 1.2, fz, x + Math.cos(la) * 0.55, gy + h * 0.45, z + Math.sin(la) * 0.55, 0.20, 0.15, 6);
      }
      put('C', 'mid', chamferBox(1.5, h, 1.5, 0.14), x, gy + h / 2 + 0.4, z, -a);
      put('C', 'midLit', chamferBox(2.0, 0.34, 2.0, 0.10), x, gy + h + 0.55, z, -a);
      put('X', 'energy', chamferBox(1.55, 0.11, 0.14, 0.02), x, gy + h * 0.72, z + 0.78, -a);
      place('impact' + i, x, z, { radius: 1.6, topY: gy + h + 0.7 });
    }
    function p_angle(i) { return 0.7 + i * 1.5; }
  })();

  /* ---- launch pylons: vertical, for flight practice ----------------------------------------------
     Five, on a 37 degree flank, so every one finds its own ground on three splayed feet and the row
     steps down the slope. Varied heights, because a row of identical masts reads as a fence. */
  /* Five, but only TWO draw-call groups: the first three are the low-tier set and always drawn, the
     last two are dropped below 'high'. Five separate groups would have cost twenty draw calls for
     nine hundred triangles, which is exactly the trade §45 says not to make. */
  const PYLON_MAX = 5, PYLON_CORE = 3;
  const pylonGroups = [new THREE.Group(), new THREE.Group()];
  (function launchPylons() {
    const s = SITES.launchPylons, p = layout.siteAt('launchPylons');
    const across = s.bearing + HALF_PI;
    const HS = [34, 24, 42, 27, 31];
    pylonGroups[0].name = 'sky-pylons-core'; pylonGroups[1].name = 'sky-pylons-extra';
    group.add(pylonGroups[0], pylonGroups[1]);
    const SET = [{ P: {} }, { P: {} }];
    for (let i = 0; i < PYLON_MAX; i++) {
      const off = (i - 2) * 46;
      const x = p.x + Math.sin(across) * off, z = p.z - Math.cos(across) * off;
      if (!footprintSolid(x, z, 3.5)) continue;
      const gy = ground(x, z), H = HS[i];
      const B = SET[i < PYLON_CORE ? 0 : 1];
      /* three splayed feet, each to ITS OWN ground: on a 37 degree flank the downhill foot lands two
         metres below the uphill one, and the recorded base is the lowest of the three — a legged
         structure's reach is its longest leg, not the height under its centre */
      let footMin = Infinity;
      for (let k = 0; k < 3; k++) {
        const a = k / 3 * TAU + 0.5;
        const fx = x + Math.cos(a) * 2.9, fz = z + Math.sin(a) * 2.9;
        const fy = ground(fx, fz) - 1.6;
        if (fy < footMin) footMin = fy;
        pylonStrut(B, fx, fy, fz, x + Math.cos(a) * 0.85, gy + 3.4, z + Math.sin(a) * 0.85, 0.34, 0.24);
      }
      const parts = B.P;
      pylonPut(parts, 'mid', new THREE.CylinderGeometry(0.48, 1.15, H, 9), x, gy + 2.4 + H / 2, z);
      pylonPut(parts, 'midLit', new THREE.CylinderGeometry(1.05, 1.05, 0.42, 12), x, gy + 2.55, z);
      pylonPut(parts, 'midLit', new THREE.CylinderGeometry(1.0, 0.6, 0.36, 12), x, gy + 2.4 + H + 0.1, z);
      pylonPut(parts, 'energy', new THREE.CylinderGeometry(0.42, 0.42, 0.5, 10), x, gy + 2.4 + H + 0.5, z);
      /* the strip up the leading edge: the pylon has a FRONT, and a resident lines up on it */
      pylonPut(parts, 'energy', chamferBox(0.16, H - 3, 0.13, 0.03), x + Math.sin(s.bearing) * 0.9, gy + 2.4 + H / 2, z - Math.cos(s.bearing) * 0.9, faceOut(s.bearing));
      place('launchPylon' + i, x, z, { radius: 2.9, baseY: footMin, topY: gy + 2.4 + H + 0.8 });
    }
    for (let sIdx = 0; sIdx < 2; sIdx++) {
      const parts = SET[sIdx].P;
      for (const key of Object.keys(parts)) {
        if (!parts[key].length) continue;
        const mesh = new THREE.Mesh(own.g(mergeList(parts[key])), matFor(key));
        mesh.name = 'sky-pylons-' + (sIdx ? 'extra' : 'core') + '-' + key;
        meshes.push(mesh); pylonGroups[sIdx].add(mesh);
      }
    }
    function pylonPut(parts, key, geo, px2, py2, pz2, ry, rx) {
      _v.set(px2, py2, pz2); _eu.set(rx || 0, ry || 0, 0, 'YXZ'); _q.setFromEuler(_eu); _sc.set(1, 1, 1);
      _m4.compose(_v, _q, _sc);
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      g.applyMatrix4(_m4); if (!g.attributes.normal) g.computeVertexNormals();
      (parts[key] || (parts[key] = [])).push(g); geo.dispose();
    }
    function pylonStrut(B, x0, y0, z0, x1, y1, z1, r0, r1) {
      const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const g = new THREE.CylinderGeometry(r1, r0, len, 6, 1, false);
      _v.set(dx / len, dy / len, dz / len); _q.setFromUnitVectors(_up, _v);
      _v2.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); _sc.set(1, 1, 1);
      _m4.compose(_v2, _q, _sc); g.applyMatrix4(_m4);
      (B.P.satin || (B.P.satin = [])).push(g);
    }
  })();

  /* ================================================================= SECTOR D — HIGH CLOUD */

  /* ---- the MAHGIC relay: the one lit thing on the cold side -------------------------------------- */
  (function relay() {
    const p = layout.siteAt('relayTower');
    groundBand(p.x, p.z, 6.0, 2, 8);
    const gMin = _gb[0], gMax = _gb[1];
    const BASE = gMax + 3.2;
    place('relayTower', p.x, p.z, { radius: 7, baseY: gMin - 2, topY: BASE + 54 });
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU + Math.PI / 4;
      const fx = p.x + Math.cos(a) * 6.0, fz = p.z + Math.sin(a) * 6.0;
      strut('D', 'satin', fx, ground(fx, fz) - 2.0, fz, p.x + Math.cos(a) * 2.4, BASE - 0.6, p.z + Math.sin(a) * 2.4, 0.42, 0.30, 7);
    }
    put('D', 'midLit', massGeo(9.4, 9.4, 0.7, 2.6, 0.16), p.x, BASE - 0.7, p.z);
    put('D', 'lit', massGeo(10.0, 10.0, 0.16, 2.8, 0.04), p.x, BASE, p.z);
    washCard(p.x, BASE - 0.8, p.z, 11, 11, 0, 'fill', 0.9);
    put('D', 'mid', new THREE.CylinderGeometry(0.7, 1.5, 48, 12), p.x, BASE + 24, p.z);
    for (const h of [15, 28, 40]) put('D', 'lit', new THREE.CylinderGeometry(1.9, 1.9, 0.5, 12, 1, true), p.x, BASE + h, p.z);
    put('D', 'energy', chamferBox(0.16, 44, 0.16, 0.03), p.x + 1.1, BASE + 24, p.z);
    /* the head: a crystal octahedron with a lit core — the cold side's single warm-free beacon */
    put('D', 'glass', new THREE.OctahedronGeometry(3.6, 1), p.x, BASE + 51, p.z);
    put('D', 'energyLight', new THREE.OctahedronGeometry(1.5, 0), p.x, BASE + 51, p.z);
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU;
      put('D', 'satin', chamferBox(0.30, 5.4, 1.5, 0.07), p.x + Math.cos(a) * 3.1, BASE + 46, p.z + Math.sin(a) * 3.1, -a, 0, 0.34);
    }
  })();

  /* ---- the cloud stabiliser: the world's own explanation for why the deck holds weight (§03, §06)
     It is INFRASTRUCTURE, and it should look like it is doing a job: four legs of four different
     lengths on a 41 degree flank, a heavy frame, an emitter cone aimed DOWN at the cloud, a rotating
     inner ring, and a pool of light on the floor beneath it. */
  const stabiliser = { ring: null, y: 0 };
  (function stab() {
    const p = layout.siteAt('stabiliser');
    groundBand(p.x, p.z, 8.5, 2, 8);
    const gMin = _gb[0], gMax = _gb[1];
    const FR = gMax + 9.0;
    stabiliser.y = FR;
    place('stabiliser', p.x, p.z, { radius: 9, baseY: gMin - 2.2, topY: FR + 9 });
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU + Math.PI / 4;
      const fx = p.x + Math.cos(a) * 8.2, fz = p.z + Math.sin(a) * 8.2;
      strut('D', 'satin', fx, ground(fx, fz) - 2.2, fz, p.x + Math.cos(a) * 4.6, FR - 1.4, p.z + Math.sin(a) * 4.6, 0.62, 0.44, 8);
      /* a knee brace, because a leg on a slope needs one and it reads as engineering */
      strut('D', 'satin', p.x + Math.cos(a) * 6.4, ground(fx, fz) + (FR - ground(fx, fz)) * 0.45, p.z + Math.sin(a) * 6.4,
        p.x + Math.cos(a) * 2.0, FR - 1.6, p.z + Math.sin(a) * 2.0, 0.22, 0.18, 6);
    }
    put('D', 'mid', massGeo(15.5, 15.5, 1.5, 4.4, 0.28), p.x, FR - 1.5, p.z, Math.PI / 4);
    put('D', 'midLit', massGeo(14.5, 14.5, 0.55, 4.0, 0.14), p.x, FR, p.z, Math.PI / 4);
    put('D', 'lit', massGeo(16.2, 16.2, 0.18, 4.8, 0.05), p.x, FR + 0.6, p.z, Math.PI / 4);
    washCard(p.x, FR - 1.7, p.z, 17, 17, 0, 'fill', 1.3);
    /* THE EMITTER, pointed at the floor it is holding up */
    put('D', 'lit', new THREE.CylinderGeometry(6.0, 3.0, 3.4, 20, 1, true), p.x, FR - 3.2, p.z);
    put('D', 'energy', new THREE.CylinderGeometry(3.05, 3.05, 0.35, 20, 1, true), p.x, FR - 4.85, p.z);
    /* the pool of MAHGIC on the cloud beneath it — conforming, because the floor is not level */
    conformDisc('D', 'soft', p.x, p.z, 22, 0.4, 22, 2);
    /* six vanes on top, splayed: machinery, not sculpture */
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU;
      put('D', 'satin', chamferBox(0.42, 6.4, 2.1, 0.09), p.x + Math.cos(a) * 4.6, FR + 3.4, p.z + Math.sin(a) * 4.6, -a, 0, 0.16);
    }
    put('D', 'midLit', new THREE.CylinderGeometry(1.6, 2.2, 0.5, 12), p.x, FR + 7.0, p.z);
    put('D', 'energy', new THREE.CylinderGeometry(0.5, 0.5, 0.6, 10), p.x, FR + 7.5, p.z);
    /* the rotating ring is its own mesh: it is the only thing in the realm that visibly WORKS */
    const rg = own.g(new THREE.TorusGeometry(4.3, 0.20, 5, 24));
    rg.rotateX(HALF_PI);
    const rm = new THREE.Mesh(rg, mat.energy);
    rm.name = 'sky-stabiliser-ring';
    rm.position.set(p.x, FR - 3.9, p.z);
    stabiliser.ring = rm; meshes.push(rm); group.add(rm);
  })();

  /* ---- the two suspended training towers ---------------------------------------------------------
     EXPLICITLY FLOATING: their y comes from the site's own absolute `y`, and deckSolid() does not
     apply to them (contract law 1's second clause). They are silhouettes at 880 and 1180 m — the
     things a resident learning to fly is aiming at — so they are built for OUTLINE and kept cheap. */
  ['suspendedA', 'suspendedB'].forEach((name, i) => {
    const p = layout.siteAt(name);
    const S = i === 0 ? 1.0 : 1.32;
    place(name, p.x, p.z, { floating: true, topY: p.y + 30 * S, radius: 15 * S });
    put('D', 'mid', new THREE.CylinderGeometry(0.1, 2.2, 26 * S, 14), p.x, p.y + 13 * S, p.z);
    put('D', 'mid', new THREE.CylinderGeometry(2.2, 0.1, 26 * S, 14), p.x, p.y - 13 * S, p.z);
    put('D', 'mid', new THREE.CylinderGeometry(1.5, 1.5, 30 * S, 12), p.x, p.y, p.z);
    const RS = [[14 * S, 11 * S], [0, 14 * S], [-14 * S, 8.5 * S]];
    for (const [dy, rr] of RS) {
      put('D', 'midLit', new THREE.CylinderGeometry(rr, rr, 0.6 * S, 20), p.x, p.y + dy, p.z);
      put('D', 'mid', new THREE.CylinderGeometry(rr, rr * 0.86, 1.4 * S, 20), p.x, p.y + dy - 1.0 * S, p.z);
      washCard(p.x, p.y + dy - 1.9 * S, p.z, rr * 2, rr * 2, 0, 'fill', 0.8);
    }
    put('D', 'energy', new THREE.CylinderGeometry(14.1 * S, 14.1 * S, 0.3 * S, 16, 1, true), p.x, p.y + 0.5 * S, p.z);
    put('D', 'mid', new THREE.OctahedronGeometry(3.0 * S, 0), p.x, p.y + 28 * S, p.z);
  });

  /* ================================================================= flush the buckets */
  function matFor(key) { return mat[key] || mat.mid; }
  /* The assembly's sun shadow camera covers +-260 m of the origin, so only the arrival cluster and the
     sunset decks can cast into it. C and D are outside it and asking them to cast is pure cost; the
     fine trim never casts either, because a 90 mm rail in a 1024 shadow map is noise. */
  const SHADOW_SCOPES = { A: true, B: true, C: false, D: false, X: false };
  const bucketMeshes = [];
  for (const scope of ['A', 'B', 'C', 'D', 'X']) {
    const b = BK[scope];
    for (const key of Object.keys(b)) {
      if (!b[key].length) continue;
      const geo = own.g(mergeList(b[key]));
      const mesh = new THREE.Mesh(geo, matFor(key));
      mesh.name = 'sky-struct-' + scope + '-' + key;
      const shade = SHADOW_SCOPES[scope] && key !== 'energy' && key !== 'soft' && key !== 'warm' && key !== 'warmSoft' && key !== 'glass';
      mesh.castShadow = shade; mesh.receiveShadow = shade;
      mesh.userData.scope = scope;
      bucketMeshes.push(mesh); meshes.push(mesh); group.add(mesh);
    }
  }
  /* the two atlas sign meshes */
  const atlasMeshes = {};
  {
    const actionsTex = own.t(atlasTexture(SIGNAGE.actions, 1024, 96));
    const am = own.m(new THREE.MeshBasicMaterial({ map: actionsTex, transparent: true, depthWrite: false, toneMapped: true, side: THREE.DoubleSide }));
    signMats.push(am);
    const ag = own.g(mergeList(atlasQuads.actions));
    const amesh = new THREE.Mesh(ag, am); amesh.name = 'sky-sign-actions';
    atlasMeshes.actions = amesh; meshes.push(amesh); group.add(amesh);

    const padTex = own.t(atlasTexture(['1', '2', '3', '4'], 512, 210));
    const pm = own.m(new THREE.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false, toneMapped: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    signMats.push(pm);
    const pg = own.g(mergeList(atlasQuads.pads));
    const pmesh = new THREE.Mesh(pg, pm); pmesh.name = 'sky-sign-pads';
    atlasMeshes.pads = pmesh; meshes.push(pmesh); group.add(pmesh);
  }

  /* the atmospheric wash mesh — ONE draw call for every fillFor()/atmosphere() card in the realm */
  const washCount = washPos.length / 3;
  const washGeo = own.g(new THREE.BufferGeometry());
  const washColArr = new Float32Array(washCount * 3);
  const washBearing = new Float32Array(washCount), washKind = new Uint8Array(washCount);
  const washGain = new Float32Array(washCount), washElev = new Float32Array(washCount);
  {
    const pos = new Float32Array(washPos.length);
    for (let i = 0; i < washPos.length; i++) pos[i] = washPos[i];
    for (let i = 0; i < washCount; i++) {
      washBearing[i] = washMeta[i * 4]; washKind[i] = washMeta[i * 4 + 1];
      washGain[i] = washMeta[i * 4 + 2]; washElev[i] = washMeta[i * 4 + 3];
    }
    washGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    washGeo.setAttribute('color', new THREE.BufferAttribute(washColArr, 3));
    washGeo.computeBoundingSphere();
  }
  const washMesh = new THREE.Mesh(washGeo, mat.wash);
  washMesh.name = 'sky-struct-wash';
  washMesh.renderOrder = 2;
  meshes.push(washMesh); group.add(washMesh);

  /* ================================================================= time, theme, quality, motion */
  let band = 'dusk', daylight = 0.25, qBeams = 1;

  /* THE CONTRACT'S COLOUR, REPAINTED. A soffit takes fillFor() at its own bearing; a pane of glass
     takes atmosphere() at the bearing it faces. Nothing here is a colour constant. */
  function paintWash() {
    for (let i = 0; i < washCount; i++) {
      if (washKind[i] === 0) rawHex(layout.fillFor(washBearing[i], band), _col);
      else layout.atmosphere(washBearing[i], washElev[i], band, _col);
      /* additive: a bounce card is a LIFT on what is already there, never a paint layer, and it is
         scaled down hard at midday when the sun is already doing the job */
      const k = washGain[i] * (washKind[i] === 0 ? 0.20 : 0.15) * (1 - daylight * 0.45);
      washColArr[i * 3] = _col.r * k; washColArr[i * 3 + 1] = _col.g * k; washColArr[i * 3 + 2] = _col.b * k;
    }
    washGeo.attributes.color.needsUpdate = true;
  }

  function setTime(clockState, bandIn) {
    const cs = clockState || {};
    daylight = typeof cs.daylight === 'number' ? cs.daylight : 0.25;
    band = bandIn || layout.atmoBand(cs);
    /* the same curve materials.js uses, so structure light and city light agree about what night is */
    const k = 1 - daylight * 0.7;
    mat.energy.emissiveIntensity = BASE_EMISSIVE.energy * k;
    mat.energyLight.emissiveIntensity = BASE_EMISSIVE.energyLight * k;
    mat.soft.opacity = BASE_OPACITY.soft * k * qBeams;
    mat.warmSoft.opacity = BASE_OPACITY.warmSoft * (1 - daylight * 0.5);
    /* a lit room is still lit at noon, just not against a dark sky */
    mat.warm.color.setHex(0xffeccd).multiplyScalar(1 - daylight * 0.35);
    for (let i = 0; i < signMats.length; i++) signMats[i].color.setScalar(1 - daylight * 0.25);
    paintWash();
    return band;
  }

  /* ENERGY ONLY. This module owns no cloud, no sky, no stars and no peaks, so there is nothing here a
     Theme could wrongly repaint — but the rule is stated because it is the rule (§41 owners). */
  function setTheme(t) {
    if (!t) return null;
    mat.energy.emissive.setHex(t.energy);
    mat.energyLight.emissive.setHex(t.energyLight || t.energy);
    mat.soft.color.setHex(t.energy);
    return t;
  }

  /* ---- quality ------------------------------------------------------------------------------------
     Everything is built once at full detail and DEGRADED by visibility and instance count, because a
     rebuild would allocate and because the tiers have to be switchable at runtime (§45). The counts
     ride on layout.QUALITY so this module degrades in step with the cloud and the life modules. */
  const QT = {
    high: { gates: GATE_MAX, targets: TARGET_MAX, pylonsExtra: true, trim: true },
    medium: { gates: 5, targets: 10, pylonsExtra: true, trim: true },
    low: { gates: 3, targets: 6, pylonsExtra: false, trim: false }
  };
  function setQuality(t) {
    tier = QUALITY[t] ? t : 'high';
    const q = QT[tier] || QT.high;
    /* layout.QUALITY drives the shared idea of "how much of the realm is drawn"; beams scales the
       emissive dressing the same way the cloud module scales its light shafts */
    qBeams = (QUALITY[tier] && QUALITY[tier].beams) || 1;
    if (gateLane.mesh) { gateLane.mesh.count = q.gates; gateLane.energyMesh.count = q.gates; }
    if (targets.mesh) { targets.mesh.count = q.targets; targets.core.count = q.targets; }
    pylonGroups[1].visible = q.pylonsExtra;
    for (const m of bucketMeshes) if (m.userData.scope === 'X') m.visible = q.trim;
    if (atlasMeshes.actions) atlasMeshes.actions.visible = q.trim;
    /* the wash is never dropped: it is the contract's own colour on the architecture, it is one draw
       call, and without it the low tier would be the only tier where the sectors stop agreeing */
    mat.soft.opacity = BASE_OPACITY.soft * (1 - daylight * 0.7) * qBeams;
    return tier;
  }

  /* ---- the live queue ----------------------------------------------------------------------------
     The assembly calls this EVERY FRAME from the ascent module's own state, so the common case — the
     states have not changed — must cost nothing. The raw values are compared before anything is
     normalised, so the early return allocates no strings.

     It is also where §35/§36 is enforced at the boundary: a row may show a pad number and one of four
     state words, or a countdown. Anything else becomes a dash. A sign cannot be turned into a
     billboard by whatever the caller happens to pass. */
  const qRawPad = new Array(4).fill(null), qRawState = new Array(4).fill(null);
  const qLabel = ['1', '2', '3', '4'], qState = ['', '', '', ''];
  function normaliseState(v) {
    if (v == null) return '';
    const s = String(v).toUpperCase().trim();
    if (QUEUE_STATES.indexOf(s) >= 0) return s;
    if (/^\d{1,2}:\d{2}$/.test(s) || /^\d{1,3}$/.test(s)) return s;    /* a countdown is wayfinding too */
    return '—';
  }
  function padIndexOf(v) {
    if (typeof v === 'number' && v >= 1 && v <= 4) return v - 1;
    const s = String(v == null ? '' : v).toUpperCase();
    const i = 'ABCD'.indexOf(s.replace('PAD', '').trim());
    if (i >= 0) return i;
    const n = parseInt(s, 10);
    return (n >= 1 && n <= 4) ? n - 1 : -1;
  }
  function drawQueue() {
    const g = queue.gfx, w = queue.canvas.width, h = queue.canvas.height;
    g.clearRect(0, 0, w, h);
    const rowH = h / 4.6, top = h * 0.06;
    for (let i = 0; i < 4; i++) {
      const y = top + rowH * (i + 0.5);
      g.textBaseline = 'middle';
      /* the canonical pairing: tight 700 label against a wide 500 state */
      g.textAlign = 'left';
      g.fillStyle = BRAND.title;
      g.font = `${BRAND.titleWeight} 74px ${BRAND.face}`;
      g.fillText(qLabel[i], w * 0.07, y);
      g.fillStyle = BRAND.sub;
      g.font = `${BRAND.subWeight} 40px ${BRAND.face}`;
      const text = qState[i] || '—', gap = 40 * BRAND.subTracking;
      let x = w * 0.26;
      for (const ch of text) { g.fillText(ch, x, y); x += g.measureText(ch).width + gap; }
      g.fillStyle = 'rgba(191,214,242,0.22)';
      g.fillRect(w * 0.07, y + rowH * 0.38, w * 0.86, 2);
    }
    queue.tex.needsUpdate = true;
  }
  function setQueue(rows) {
    if (!queue.gfx) return;
    const arr = Array.isArray(rows) ? rows : (rows && Array.isArray(rows.rows) ? rows.rows : null);
    if (!arr) return;
    let changed = false;
    for (let i = 0; i < 4; i++) {
      const r = arr[i];
      const rp = r ? (r.pad != null ? r.pad : (r.id != null ? r.id : r.index)) : null;
      const rs = r ? (r.state != null ? r.state : r.status) : null;
      if (rp !== qRawPad[i] || rs !== qRawState[i]) { changed = true; qRawPad[i] = rp; qRawState[i] = rs; }
    }
    if (!changed) return;
    for (let i = 0; i < 4; i++) {
      const idx = padIndexOf(qRawPad[i]);
      qLabel[i] = String((idx >= 0 ? idx : i) + 1);
      qState[i] = normaliseState(qRawState[i]);
    }
    drawQueue();
  }

  /* ---- motion: ZERO allocation (§45) ------------------------------------------------------------- */
  let pulse = 0;
  function update(t, dt, camera) {
    const d = (typeof dt === 'number' && dt > 0 && dt < 0.5) ? dt : 0.016;
    pulse += d;
    /* the pads breathe: a slow, shallow swell on the edge lighting, so an idle pad still reads as live */
    const k = 1 - daylight * 0.7;
    const s = 0.86 + 0.14 * Math.sin(pulse * 0.9);
    mat.energy.emissiveIntensity = BASE_EMISSIVE.energy * k * s;
    /* the stabiliser is the one thing in the realm that visibly works */
    if (stabiliser.ring) {
      stabiliser.ring.rotation.y = t * 0.22;
      stabiliser.ring.position.y = stabiliser.y - 3.9 + Math.sin(t * 0.5) * 0.35;
    }
    /* the target diamonds turn and drift; setMatrixAt writes into the existing buffer */
    if (targets.mesh && targets.mesh.count > 0) {
      const n = targets.mesh.count;
      for (let i = 0; i < n; i++) {
        const b = i * 4;
        const bob = Math.sin(t * 0.42 + targets.base[b + 3]) * 1.15;
        _eu.set(0.46, targets.base[b + 3] + t * targets.spin[i], 0, 'YXZ');
        _q.setFromEuler(_eu);
        _v.set(targets.base[b], targets.base[b + 1] + bob, targets.base[b + 2]);
        _sc.setScalar(targets.scale[i]);
        _m4.compose(_v, _q, _sc);
        targets.mesh.setMatrixAt(i, _m4);
        _sc.setScalar(targets.scale[i] * (0.94 + 0.06 * Math.sin(t * 1.7 + i)));
        _m4.compose(_v, _q, _sc);
        targets.core.setMatrixAt(i, _m4);
      }
      targets.mesh.instanceMatrix.needsUpdate = true;
      targets.core.instanceMatrix.needsUpdate = true;
    }
    void camera;
  }

  /* Every geometry, material and texture this module created went through own.*, so the tracked lists
     ARE the complete inventory — a traverse would double-dispose the same buffers. The shared platinum
     and glass grades belong to materials.js and are deliberately not touched. */
  function dispose() {
    geometries.forEach(g => { if (g && g.dispose) g.dispose(); });
    materials.forEach(m => { if (m && m.dispose) m.dispose(); });
    textures.forEach(t => { if (t && t.dispose) t.dispose(); });
    group.clear();
  }

  if (scene && !group.parent) scene.add(group);

  /* ---- MEASURED cost, not estimated (§45, §46) ---------------------------------------------------- */
  const stats = {
    module: 'sky-structures',
    get tier() { return tier; },
    drawCalls: 0, triangles: 0, trianglesPeak: 0,
    meshes: 0, instanced: 0, signs: signMats.length,
    washCards: washCount / 6,
    placements: placements.length,
    grounded: 0, floating: 0, offCloud: 0,
    get pads() { return pads.length; },
    get gates() { return gateLane.mesh ? gateLane.mesh.count : 0; },
    get targets() { return targets.mesh ? targets.mesh.count : 0; },
    get bandKey() { return band && band.a ? band.a + '>' + band.b : band; }
  };
  function measure() {
    stats.drawCalls = 0; stats.triangles = 0; stats.trianglesPeak = 0; stats.meshes = 0; stats.instanced = 0;
    group.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      const full = g.index ? g.index.count : g.attributes.position.count;
      const inst = o.isInstancedMesh ? o.count : 1;
      const peak = o.isInstancedMesh ? (g.index ? g.index.count : g.attributes.position.count) * o.instanceMatrix.count : full;
      stats.meshes++;
      if (o.isInstancedMesh) stats.instanced++;
      if (o.visible && (!o.parent || o.parent.visible)) { stats.drawCalls++; stats.triangles += Math.round(full * inst / 3); }
      stats.trianglesPeak += Math.round(peak / 3);
    });
    stats.grounded = 0; stats.floating = 0; stats.offCloud = 0;
    for (const p of placements) {
      if (p.floating) stats.floating++;
      else { stats.grounded++; if (!p.solid) stats.offCloud++; }
    }
    return stats;
  }

  /* ---- finish ------------------------------------------------------------------------------------- */
  setTheme(theme0);
  setTime((ctx && ctx.clock && ctx.clock.state) ? ctx.clock.state() : { band: 'dusk', daylight: 0.25, sunElevation: 0.055 });
  drawQueue();
  setQuality(tier);
  update(0, 0, ctx && ctx.camera);
  measure();

  return {
    group, setTime, setTheme, update, setQuality, dispose, stats,
    /* the ascent module docks to THESE, not to nominal site positions: a pad's deck height is a
       measured consequence of the cloud under it and nothing else can know it */
    pads,
    /* the queue pylon shows the pods' real states */
    setQueue,
    /* everything this module put in the world, with the contract's verdict on each spot */
    placements,
    /* useful anchors for the beam and life modules */
    anchors: {
      concourse, stabiliserY: stabiliser.y, apronY: APRON_Y, apronRadius: APRON_R,
      staging: { x: stagingP.x, y: APRON_Y, z: stagingP.z }
    },
    measure
  };
}

export default buildSkyStructures;
