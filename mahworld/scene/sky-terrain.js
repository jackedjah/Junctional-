/* MAHWORLD :: UPPER REALM — THE CLOUD FLOOR AND EVERY CLOUD THAT IS NOT THE SKY

   This is the SKYBIOME's ground. sky-layout.js says where the floor is; this module is the only
   thing that draws it, and everything else in the realm stands on what it draws.

   THE TEST (§49). The result has to work as TERRAIN and still read as CLOUD. The two named failure
   modes are "white concrete disguised with fog" and "white geometry with fog", and both come from the
   same mistake: solving cloud with FACETS. So the crystalline quality here is carried by LIGHT and by
   INTERNAL STRUCTURE (§04) — a diamond organisation that shows THROUGH a soft mass, a platinum sheen
   compacted into the cloud where the pads stand — while the SILHOUETTE is always soft: every edge of
   this world dissolves into feathered vapour before it can cut against the sky.

   WHAT IT BUILDS
     1  THE DECK      a radial heightfield from layout.deckHeight()+detail, holed by deckSolid(),
                      dissolved at its rims by deckEdge(), with a lit top, a soft blue UNDERSIDE and a
                      drifting vapour skin lying on it.
     2  TERRAIN TYPES the flats, the ridges (crowned with billows), the valleys (filled with mist
                      corridors), and the sector-A CLIFF, where the deck stops and cloud pours over
                      the edge into 300 m of open air.
     3  DETACHED      layout.ISLANDS as landable soft lumps, layout.TOWERS as the cold side's hero
                      vertical architecture — 620–1500 m of cloud, 1.4–3 km out (§17).
     4  THE SEA       the rolling cloud ocean out to seaRadius*0.75, cheap per square metre and
                      enormous in extent (§33, §46).
     5  DISTURBANCE   disturb(x, z, r, strength): a pooled, self-reforming press + vapour response the
                      ascent and life modules call when something lands, launches or hits (§29–§31).

   THE TWO CONTRACT LAWS, and how this file keeps them
     · NOTHING assumes y = 0. Every height comes from deckHeight()/cloudTopAt()/seaHeight(), and every
       placement is gated on deckSolid() or is explicitly floating.
     · NO ATMOSPHERIC COLOUR IS INVENTED HERE. Every cloud tint is fillFor(bearing, band) or
       atmosphere(bearing, elevation, band) sampled AT THE CLOUD'S OWN BEARING, which is what makes a
       cloud on the sunset side warm and the same form on the cold side violet — one biome, four
       sectors (§42, §48), and continuous as the player turns (§41).

   COLOUR SPACE — a subtle one worth stating. layout.atmosphere() writes its stops with Color.setRGB(),
   which in three.js r185 does NOT decode sRGB; layout.fillFor() returns a hex. If this module decoded
   those hexes while the sky dome used the raw setRGB path, the cloud would sit visibly darker and more
   saturated than the sky it hangs in and the biome would come apart. rawHex() below therefore reads
   fillFor exactly the way atmosphere() reads its own stops. One convention, one sky.

   LIGHT (§14). Cloud is a scattering medium, not a Lambert surface, so this module BAKES its lighting
   into vertex colour and renders unlit — the same choice terrain.js made for the mountains below, and
   for the same reason: it is the only way to guarantee that a cloud shadow is NEVER crushed to black.
   The darkest value anywhere on this deck is 0.66 x its own sector fill colour, and undersides are
   lifted with bounce from the cloud sea beneath them.

   COST. Twelve meshes; measured in stats. Well inside the §45/§46 budget of 120 draw calls / 90k tris,
   because the quality is spent on WHERE the resolution goes (dense at the origin, coarse at the
   horizon) rather than on triangle count. update() allocates nothing. */

import * as THREE from '../vendor/three/three.module.min.js';
/* The layout is imported directly rather than taken from ctx: cloudTopAt() is a module-level export
   that other modules call without a ctx, and it MUST agree with the mesh this file builds to the
   millimetre. One module instance, one answer. (In ESM ctx.layout is the same instance anyway.) */
import * as layout from './sky-layout.js';
import { canvasTexture } from './materials.js';

const TAU = Math.PI * 2;
const { DECK, FEATURES, VOIDS, ISLANDS, TOWERS, QUALITY, ATMO } = layout;
const smooth = layout.smoothstep;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/* module-level scratch — update() must allocate nothing (§45) */
const _c = new THREE.Color(), _c2 = new THREE.Color(), _c3 = new THREE.Color();
const _sun = new THREE.Vector3();

/* ------------------------------------------------------------------ the cloud surface itself */
/* THE BILLOW FIELD. Three octaves of smooth trigonometric noise — cheap, pure, deterministic and, more
   importantly, ROUNDED: a heightfield built from sines can never produce the shard silhouette the
   brief forbids. Wavelengths run 70–440 m, i.e. cloud-lump scale at this world's size. */
function billow(x, z) {
  return 0.55 * Math.sin(x * 0.0143 + 1.7) * Math.cos(z * 0.0161 - 0.4)
       + 0.30 * Math.sin(x * 0.0357 - z * 0.0291 + 2.9) * Math.cos(x * 0.0219 + z * 0.0333 - 1.1)
       + 0.15 * Math.sin(x * 0.0870 + z * 0.0610 + 0.6);
}

/* THE STABLE GROUND (§04, §06). Where the player arrives and where the player trains, the floor must
   read as something you can trust — so the billow detail is damped almost to nothing on the arrival
   plateau and strongly on the training flats, and is at full strength everywhere else. */
const PLATEAU = FEATURES.find(f => f.kind === 'plateau');
const PLATEAU_XZ = layout.xz({ bearing: PLATEAU.bearing, r: PLATEAU.r });
const FLATS_XZ = layout.xz({ bearing: 1.75, r: 400 });   /* the centre of gravity of sector C's flats */
function stability(x, z) {
  const p = 1 - smooth((Math.hypot(x - PLATEAU_XZ.x, z - PLATEAU_XZ.z) - PLATEAU.radius) / 90);
  const f = 0.62 * (1 - smooth((Math.hypot(x - FLATS_XZ.x, z - FLATS_XZ.z) - 300) / 260));
  return p + f > 1 ? 1 : p + f;
}

/* THE DETAIL IS DELIBERATELY ONE-SIDED: it only ever ADDS height, never subtracts. Anything another
   module places at layout.deckHeight() therefore sits at most DETAIL_H inside soft fluff, which reads
   correctly; if the detail could go negative the same object would FLOAT, which does not. Modules that
   want the exact surface call cloudTopAt(). It also fades out at a rim so a dissolving edge is smooth
   rather than lumpy. */
const DETAIL_H = 1.9;
export function surfaceDetail(x, z) {
  const v = billow(x, z) * 0.5 + 0.5;                    /* 0..1 */
  return DETAIL_H * v * v                                /* squared: mostly calm, occasionally billowed */
       * (1 - 0.82 * stability(x, z))
       * smooth(layout.deckEdge(x, z) / 0.30);
}
/* THE VISIBLE CLOUD SURFACE. This — not deckHeight() — is what a resident stands on and what a
   platform's feet should touch. */
export function cloudTopAt(x, z) { return layout.deckHeight(x, z) + surfaceDetail(x, z); }

/* THE CLOUD SEA (§33). It lies 300 m below the deck, which is what makes the sunset cliff a cliff: you
   walk to the edge of sector A and there is an ocean a long way down and 6.75 km across. It also shows
   through every void in the deck, which is what gives a hole its depth (§05, §38). */
const SEA = Object.freeze({ y: -300, inner: 150, outer: DECK.seaRadius * 0.75, rings: 20 });
function seaHeight(x, z) {
  /* swell damped with distance: past ~2 km the ring spacing is wider than the swell, so keeping the
     amplitude there would alias into a sawtooth. Flattening into haze is also what distance does. */
  const damp = 1 - 0.78 * smooth((Math.hypot(x, z) - 2100) / 3600);
  return SEA.y + damp * (22 * Math.sin(x * 0.0028) * Math.cos(z * 0.0031)
                       + 13 * Math.sin(x * 0.0015 - z * 0.0019 + 1.3)
                       +  7 * Math.sin((x + z) * 0.0061));
}

/* ---------------------------------------------------------------------------- procedural textures */
/* THE MASS ATLAS. Four soft cloud lumps in a 2x2 sheet. Every lobe is kept well inside its cell so the
   alpha reaches zero before the seam: a cloud billboard that ends on a straight edge stops being a
   cloud, which is precisely the "white geometry" failure (§49). RGB is near-white with its own baked
   volume ramp; the world's colour arrives through vertex tint, so ONE atlas serves the warm sunset
   side and the violet cold side alike. */
function cloudAtlas(size) {
  const t = canvasTexture(size, size, (g, W) => {
    const half = W / 2;
    g.clearRect(0, 0, W, W);
    for (let cell = 0; cell < 4; cell++) {
      const ox = (cell % 2) * half, oy = ((cell >> 1) & 1) * half;
      const R = layout.rng(cell * 1231 + 17);
      g.save(); g.beginPath(); g.rect(ox, oy, half, half); g.clip();
      const n = 26 + Math.floor(R() * 10);
      for (let i = 0; i < n; i++) {
        const fx = 0.5 + (R() - 0.5) * 0.44, fy = 0.5 + (R() - 0.5) * 0.42;
        const rad = half * (0.07 + R() * 0.14);
        /* crown lit, base sitting in the mass's own scatter — never below 0.46, because a cloud's
           shadow side is lit by every other part of the cloud (§14) */
        const lum = 0.46 + 0.54 * Math.pow(1 - fy, 1.2);
        const r = Math.round(226 + 29 * lum), gg = Math.round(233 + 22 * lum), b = Math.round(242 + 13 * lum);
        const a = (0.20 + R() * 0.20) * (0.55 + 0.45 * lum);
        g.save();
        g.translate(ox + fx * half, oy + fy * half);
        g.scale(1.24, 0.82);                     /* a cloud lobe is wider than it is tall */
        const grad = g.createRadialGradient(0, 0, rad * 0.05, 0, 0, rad);
        grad.addColorStop(0, 'rgba(' + r + ',' + gg + ',' + b + ',' + a.toFixed(3) + ')');
        grad.addColorStop(0.46, 'rgba(' + r + ',' + gg + ',' + b + ',' + (a * 0.90).toFixed(3) + ')');
        grad.addColorStop(0.76, 'rgba(' + r + ',' + gg + ',' + b + ',' + (a * 0.40).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(' + r + ',' + gg + ',' + b + ',0)');
        g.fillStyle = grad; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();
        g.restore();
      }
      /* two faint angular sheets high in the mass: the diamond organisation READING THROUGH the
         volume, which is the only form the crystal is allowed to take out here (§04) */
      for (let i = 0; i < 2; i++) {
        const x = ox + half * (0.34 + R() * 0.28), y = oy + half * (0.30 + R() * 0.16);
        const w = half * (0.11 + R() * 0.12), h = half * (0.055 + R() * 0.05), lean = (R() - 0.5) * 0.9;
        const grad = g.createLinearGradient(x, y - h, x, y + h);
        grad.addColorStop(0, 'rgba(255,255,255,0.10)');
        grad.addColorStop(1, 'rgba(224,236,255,0)');
        g.fillStyle = grad;
        g.beginPath(); g.moveTo(x - w, y + h * lean); g.lineTo(x + w, y - h * 0.6); g.lineTo(x + w * 0.3, y + h); g.closePath(); g.fill();
      }
      g.restore();
    }
  });
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/* THE VAPOUR SKIN. A seamlessly tiling patch field laid ON the deck. This is the single most important
   texture in the module: it is what stops a heightfield from reading as poured white concrete, because
   it makes the surface unevenly thick and slowly moving instead of uniformly solid. Every blob is
   drawn nine times (the 3x3 wrap) so the tile has no seam at any offset. */
function vapourTexture(size, seed) {
  const t = canvasTexture(size, size, (g, W) => {
    g.clearRect(0, 0, W, W);
    const R = layout.rng(seed);
    for (let i = 0; i < 96; i++) {
      const x = R() * W, y = R() * W, rad = W * (0.05 + R() * 0.17), a = 0.05 + R() * 0.17;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const cx = x + ox * W, cy = y + oy * W;
        if (cx < -rad || cx > W + rad || cy < -rad || cy > W + rad) continue;
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grd.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
        grd.addColorStop(0.55, 'rgba(247,251,255,' + (a * 0.55).toFixed(3) + ')');
        grd.addColorStop(1, 'rgba(240,247,255,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.fill();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/* THE INTERNAL LATTICE. A diamond cell field used ONLY as an alpha map for the platinum sheen that
   lies over the arrival plateau. |frac(u+v)| / |frac(u-v)| tiles perfectly on a unit square, so the
   pattern is seamless at any repeat. Note what this is NOT: it is not geometry, it does not touch the
   silhouette, and it exists only where infrastructure stands (§04, §32). */
function latticeTexture(size, cells) {
  const t = canvasTexture(size, size, (g, W) => {
    const img = g.createImageData(W, W), d = img.data;
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W, v = (y + 0.5) / W;
        const a = (u + v) * cells, b = (u - v) * cells;
        const fa = Math.abs(a - Math.floor(a) - 0.5) * 2, fb = Math.abs(b - Math.floor(b) - 0.5) * 2;
        const joint = Math.max(smooth((fa - 0.80) / 0.20), smooth((fb - 0.80) / 0.20));
        /* each cell takes a slightly different base value, so the field reads as laid cells rather
           than as a printed grid */
        const face = 0.17 + 0.09 * Math.sin((Math.floor(a) * 3 + Math.floor(b) * 7) * 1.7);
        const val = Math.min(1, face + joint * 0.78);
        const i = (y * W + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = Math.round(255 * val);
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ------------------------------------------------------------------------------- small utilities */
/* Read a contract hex the way layout.atmosphere() reads its own stops — see the header note. */
function rawHex(h, out) { return out.setRGB(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255); }
function mixInto(out, r, g, b, t) { out.r += (r - out.r) * t; out.g += (g - out.g) * t; out.b += (b - out.b) * t; return out; }

export function buildSkyTerrain(ctx) {
  const M = (ctx && ctx.M) || {};
  const scene = ctx && ctx.scene;
  const group = new THREE.Group(); group.name = 'sky-terrain';

  const geometries = [], materials = [], textures = [];
  const own = { g: g => { geometries.push(g); return g; }, m: m => { materials.push(m); return m; }, t: t => { textures.push(t); return t; } };

  let tier = typeof ctx?.quality === 'string' ? ctx.quality : (ctx?.quality?.name || 'high');
  if (!QUALITY[tier]) tier = 'high';
  const Q0 = QUALITY[tier];

  /* --------------------------------------------------------------- the directional colour LUTs */
  /* Every sky colour in this module is sampled from these three rings, one entry per 3.75 degrees of
     bearing. Building them once per band and interpolating turns thousands of per-vertex sectorWeights
     evaluations into two multiply-adds, and it guarantees that the deck, the sea, the towers and the
     islands all agree about what colour a direction is (§42, §48). */
  const LUT_N = 96;
  const lutFill = new Float32Array(LUT_N * 3);   /* fillFor(): the ambient bounce in a direction */
  const lutHaze = new Float32Array(LUT_N * 3);   /* atmosphere() at the horizon: what distance dissolves into */
  const lutSky = new Float32Array(LUT_N * 3);    /* atmosphere() overhead: the light falling on a cloud top */
  const sunCol = new THREE.Color();
  let band = 'dusk', daylight = 0, sunStr = 0.7;

  function refreshLUT(b) {
    for (let i = 0; i < LUT_N; i++) {
      const bear = (i / LUT_N) * TAU - Math.PI;
      rawHex(layout.fillFor(bear, b), _c);
      lutFill[i * 3] = _c.r; lutFill[i * 3 + 1] = _c.g; lutFill[i * 3 + 2] = _c.b;
      layout.atmosphere(bear, -0.04, b, _c);
      lutHaze[i * 3] = _c.r; lutHaze[i * 3 + 1] = _c.g; lutHaze[i * 3 + 2] = _c.b;
      layout.atmosphere(bear, 0.34, b, _c);
      lutSky[i * 3] = _c.r; lutSky[i * 3 + 1] = _c.g; lutSky[i * 3 + 2] = _c.b;
    }
    const K = ATMO[b] || ATMO.dusk;
    rawHex(K.sun, sunCol);
    /* how hard the key light is in this band, normalised against the day sun */
    sunStr = Math.max(0.3, Math.min(1, K.sunI / 3.30));
    layout.sunDirection(b, _sun);
  }
  function sampleLUT(lut, bear, out) {
    let f = (bear + Math.PI) / TAU * LUT_N;
    f -= Math.floor(f / LUT_N) * LUT_N;
    const i0 = Math.floor(f) % LUT_N, t = f - Math.floor(f);
    const a = i0 * 3, c = ((i0 + 1) % LUT_N) * 3;
    out.r = lut[a] + (lut[c] - lut[a]) * t;
    out.g = lut[a + 1] + (lut[c + 1] - lut[a + 1]) * t;
    out.b = lut[a + 2] + (lut[c + 2] - lut[a + 2]) * t;
    return out;
  }
  /* 1 when a form stands between the player and the sun (backlit — the silver-lining case), 0 when the
     sun is behind the player. This is what makes the sunset side of the realm glow and the cold side
     read as flat violet mass, from ONE piece of geometry logic. */
  function backlight(bear) { return 1 - Math.abs(layout.angleDelta(layout.SUN_BEARING, bear)) / Math.PI; }

  refreshLUT(band);

  /* ============================================================================ 1. THE DECK FIELD */
  const segs = Q0.cloudSegments, rings = Q0.cloudRings;
  const dCount = 1 + rings * segs;
  const dPos = new Float32Array(dCount * 3);
  const dUV = new Float32Array(dCount * 2);
  const dNor = new Float32Array(dCount * 3);     /* kept off the geometry: nothing here is lit at runtime */
  const dBear = new Float32Array(dCount);
  const dRad = new Float32Array(dCount);
  const dEdge = new Float32Array(dCount);
  const dHgt = new Float32Array(dCount);
  const dSolid = new Uint8Array(dCount);
  const UVS = 1 / 260;                            /* the vapour skin tiles every 260 m */

  function writeVert(v, x, z) {
    const y = cloudTopAt(x, z);
    dPos[v * 3] = x; dPos[v * 3 + 1] = y; dPos[v * 3 + 2] = z;
    dUV[v * 2] = x * UVS; dUV[v * 2 + 1] = z * UVS;
    /* the surface normal by central difference — used only to bake the light, never uploaded */
    const e = 4.5;
    const hx = cloudTopAt(x + e, z) - cloudTopAt(x - e, z);
    const hz = cloudTopAt(x, z + e) - cloudTopAt(x, z - e);
    let nx = -hx / (2 * e), ny = 1, nz = -hz / (2 * e);
    const inv = 1 / Math.hypot(nx, ny, nz);
    dNor[v * 3] = nx * inv; dNor[v * 3 + 1] = ny * inv; dNor[v * 3 + 2] = nz * inv;
    dBear[v] = layout.bearingOf(x, z);
    dRad[v] = Math.hypot(x, z);
    dEdge[v] = layout.deckEdge(x, z);
    dHgt[v] = y;
    dSolid[v] = layout.deckSolid(x, z) ? 1 : 0;
  }
  writeVert(0, 0, 0);
  /* RESOLUTION WHERE IT IS SEEN (§46). r = R * (i/rings)^1.7 puts the first ring 4.5 m out and the last
     75 m apart, so the arrival area and the ground under the player's feet carry the detail and the
     far rim — a kilometre away and half dissolved — costs almost nothing. */
  for (let i = 1; i <= rings; i++) {
    const r = DECK.radius * Math.pow(i / rings, 1.7);
    for (let j = 0; j < segs; j++) {
      const b = (j / segs) * TAU - Math.PI;
      writeVert(1 + (i - 1) * segs + j, Math.sin(b) * r, -Math.cos(b) * r);
    }
  }
  /* indices, skipping any quad with no solid corner at all: a void is a HOLE in this floor, not a
     transparent lid over one */
  const dIdx = [];
  const vAt = (i, j) => 1 + (i - 1) * segs + (j % segs);
  for (let j = 0; j < segs; j++) {
    const a = vAt(1, j), b = vAt(1, j + 1);
    if (dSolid[0] || dSolid[a] || dSolid[b]) dIdx.push(0, b, a);   /* wound so the top faces +Y */
  }
  for (let i = 1; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = vAt(i, j), b = vAt(i, j + 1), c = vAt(i + 1, j + 1), d = vAt(i + 1, j);
      if (!(dSolid[a] || dSolid[b] || dSolid[c] || dSolid[d])) continue;
      dIdx.push(a, c, b, a, d, c);
    }
  }
  const deckIndex = new THREE.BufferAttribute(new Uint32Array(dIdx), 1);
  const deckPosAttr = new THREE.BufferAttribute(dPos, 3);

  const deckGeo = own.g(new THREE.BufferGeometry());
  deckGeo.setAttribute('position', deckPosAttr);
  deckGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(dCount * 4), 4));
  deckGeo.setIndex(deckIndex);
  deckGeo.computeBoundingSphere();
  /* the underside and the vapour skin SHARE the deck's positions and indices — one surface, three
     readings of it, and only one copy of the vertex data on the GPU */
  const underGeo = own.g(new THREE.BufferGeometry());
  underGeo.setAttribute('position', deckPosAttr);
  underGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(dCount * 4), 4));
  underGeo.setIndex(deckIndex);
  underGeo.boundingSphere = deckGeo.boundingSphere;
  const skinGeo = own.g(new THREE.BufferGeometry());
  skinGeo.setAttribute('position', deckPosAttr);
  skinGeo.setAttribute('uv', new THREE.BufferAttribute(dUV, 2));
  skinGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(dCount * 4), 4));
  skinGeo.setIndex(deckIndex);
  skinGeo.boundingSphere = deckGeo.boundingSphere;

  const deckMat = own.m(new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, side: THREE.FrontSide, depthWrite: true,
    /* fog off on purpose: the aerial perspective here is baked PER BEARING out of atmosphere(), which
       a single scene fog colour cannot do — the sunset side has to recede warm while the cold side
       recedes violet, or the four sectors stop being one sky (§48) */
    fog: false
  }));
  deckMat.name = 'skyterrain-deck';
  const underMat = own.m(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.BackSide, depthWrite: true, fog: false }));
  underMat.name = 'skyterrain-deck-under';
  const vapour = own.t(vapourTexture(512, 'skybiome-vapour'));
  const skinMat = own.m(new THREE.MeshBasicMaterial({
    map: vapour, vertexColors: true, transparent: true, side: THREE.FrontSide,
    depthWrite: false, fog: false, opacity: 0.85
  }));
  skinMat.name = 'skyterrain-vapour-skin';

  const deckMesh = new THREE.Mesh(deckGeo, deckMat); deckMesh.name = 'skyterrain-deck';
  const underMesh = new THREE.Mesh(underGeo, underMat); underMesh.name = 'skyterrain-deck-underside';
  const skinMesh = new THREE.Mesh(skinGeo, skinMat); skinMesh.name = 'skyterrain-vapour-skin';
  skinMesh.position.y = 2.4;                       /* the vapour lies just above the surface it clings to */
  [deckMesh, underMesh, skinMesh].forEach(m => { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; });
  deckMesh.renderOrder = 0; underMesh.renderOrder = 0; skinMesh.renderOrder = 2;
  group.add(deckMesh, underMesh, skinMesh);

  function bakeDeck() {
    const top = deckGeo.attributes.color.array, und = underGeo.attributes.color.array, skn = skinGeo.attributes.color.array;
    const sx = _sun.x, sy = _sun.y, sz = _sun.z;
    for (let v = 0; v < dCount; v++) {
      const bear = dBear[v], edge = dEdge[v], r = dRad[v];
      sampleLUT(lutFill, bear, _c);                 /* the sector's own bounce colour */
      sampleLUT(lutSky, bear, _c2);
      sampleLUT(lutHaze, bear, _c3);
      const up = dNor[v * 3 + 1];
      const ndl = dNor[v * 3] * sx + up * sy + dNor[v * 3 + 2] * sz;
      const lit = smooth((ndl + 0.25) / 1.0);
      const back = backlight(bear);

      /* THE FLOOR VALUE. 0.66 x fill is the darkest this world's cloud is ever allowed to be — a cloud
         shadow is filled by the rest of the cloud, so it is soft and coloured, never black (§14). */
      let cr = _c.r * (0.66 + 0.28 * up), cg = _c.g * (0.66 + 0.28 * up), cb = _c.b * (0.66 + 0.28 * up);
      /* skylight on the horizontal, then the key on the slopes that face it */
      cr += (_c2.r - cr) * 0.16 * up; cg += (_c2.g - cg) * 0.16 * up; cb += (_c2.b - cb) * 0.16 * up;
      const kf = 0.34 * lit * sunStr;
      cr += (sunCol.r - cr) * kf; cg += (sunCol.g - cg) * kf; cb += (sunCol.b - cb) * kf;
      const gain = (0.88 + 0.30 * lit) * (1 + 0.10 * clamp01(dHgt[v] / 45));
      cr *= gain; cg *= gain; cb *= gain;
      /* RIM SCATTER. Where the deck thins toward an edge, light comes THROUGH it: the rim glows rather
         than ending. This is what turns a cut boundary into a cloud that fades into air (§01, §49). */
      const rim = (1 - smooth(edge / 0.55)) * (0.55 + 0.45 * back);
      const rf = 0.44 * rim * sunStr;
      cr += (sunCol.r * 1.10 - cr) * rf; cg += (sunCol.g * 1.08 - cg) * rf; cb += (sunCol.b * 1.06 - cb) * rf;
      /* aerial perspective, per bearing */
      const hz = 0.44 * smooth((r - 260) / 900);
      cr += (_c3.r - cr) * hz; cg += (_c3.g - cg) * hz; cb += (_c3.b - cb) * hz;

      const alpha = smooth(edge / 0.42);
      const o4 = v * 4;
      top[o4] = cr; top[o4 + 1] = cg; top[o4 + 2] = cb; top[o4 + 3] = alpha;

      /* THE UNDERSIDE. Seen from a void or from below the cliff. It is lit almost entirely by bounce
         off the cloud sea 300 m under it, so it is soft, blue and clearly NOT dark. */
      let ur = _c.r * 0.58, ug = _c.g * 0.58, ub = _c.b * 0.58;
      ur += (_c3.r * 0.95 - ur) * 0.48; ug += (_c3.g * 0.95 - ug) * 0.48; ub += (_c3.b * 0.95 - ub) * 0.48;
      const ug2 = 1 + 0.35 * rim;                   /* the rim is thin from below too */
      und[o4] = ur * ug2; und[o4 + 1] = ug * ug2; und[o4 + 2] = ub * ug2; und[o4 + 3] = alpha;

      /* THE VAPOUR SKIN. Near-white, tinted by the same sector fill, thicker in the hollows (where
         vapour pools) and thinner on the crowns — so the surface is unevenly dense, which is the whole
         difference between cloud and poured white concrete (§49). */
      const pool = clamp01(0.62 - dHgt[v] / 34);
      let sr2 = 0.86 + 0.20 * lit, sg2 = 0.88 + 0.18 * lit, sb2 = 0.92 + 0.14 * lit;
      sr2 = sr2 * (0.55 + 0.45 * _c.r); sg2 = sg2 * (0.55 + 0.45 * _c.g); sb2 = sb2 * (0.55 + 0.45 * _c.b);
      skn[o4] = sr2; skn[o4 + 1] = sg2; skn[o4 + 2] = sb2;
      skn[o4 + 3] = alpha * (0.16 + 0.40 * pool + 0.16 * rim);
    }
    deckGeo.attributes.color.needsUpdate = true;
    underGeo.attributes.color.needsUpdate = true;
    skinGeo.attributes.color.needsUpdate = true;
  }

  /* ============================================================== 2. THE PLATINUM APRON (§04, §12) */
  /* The ONE place the crystal is allowed to become a material rather than a suggestion: where the pods
     land, the cloud has been compacted into a faintly diamond-jointed platinum ice. It is a sheen laid
     over the deck, 0.3 opacity, and it stops at the plateau — "localised", and nowhere else.
     Metalness 0.45, not 0.95: this face points UP, and a high-metalness horizontal takes no diffuse
     light at all, so it would reflect the dim zenith and render black in a white cloud world. */
  const lattice = own.t(latticeTexture(256, 4));
  const sheenBase = (M.platinumMidLit && M.platinumMidLit.color) ? M.platinumMidLit.color.getHex() : 0x8b9cb8;
  const sheenMat = own.m(new THREE.MeshStandardMaterial({
    color: sheenBase, roughness: 0.19, metalness: 0.45, envMapIntensity: 1.5,
    alphaMap: lattice, vertexColors: true, transparent: true, opacity: 0.30,
    depthWrite: false, side: THREE.FrontSide
  }));
  sheenMat.name = 'skyterrain-plateau-sheen';
  let sheenMesh = null;
  {
    const SR = 205, seg = 56, rg = 5;
    const n = 1 + seg * rg;
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 4);
    const put = (v, x, z, t) => {
      pos[v * 3] = x - PLATEAU_XZ.x; pos[v * 3 + 1] = cloudTopAt(x, z) + 0.35; pos[v * 3 + 2] = z - PLATEAU_XZ.z;
      uv[v * 2] = x / 44; uv[v * 2 + 1] = z / 44;     /* a 44 m diamond cell — architectural, not a print */
      const a = (1 - smooth((t - 0.45) / 0.55));
      col[v * 4] = 1; col[v * 4 + 1] = 1; col[v * 4 + 2] = 1; col[v * 4 + 3] = a;
    };
    put(0, PLATEAU_XZ.x, PLATEAU_XZ.z, 0);
    for (let i = 1; i <= rg; i++) for (let j = 0; j < seg; j++) {
      const t = i / rg, r = SR * t, b = (j / seg) * TAU;
      put(1 + (i - 1) * seg + j, PLATEAU_XZ.x + Math.sin(b) * r, PLATEAU_XZ.z - Math.cos(b) * r, t);
    }
    const idx = [];
    const sAt = (i, j) => 1 + (i - 1) * seg + (j % seg);
    for (let j = 0; j < seg; j++) idx.push(0, sAt(1, j + 1), sAt(1, j));
    for (let i = 1; i < rg; i++) for (let j = 0; j < seg; j++) {
      const a = sAt(i, j), b = sAt(i, j + 1), c = sAt(i + 1, j + 1), d = sAt(i + 1, j);
      idx.push(a, c, b, a, d, c);
    }
    const g = own.g(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 4));
    g.setIndex(idx);
    g.computeBoundingSphere();
    sheenMesh = new THREE.Mesh(g, sheenMat);
    sheenMesh.name = 'skyterrain-plateau-sheen';
    sheenMesh.position.set(PLATEAU_XZ.x, 0, PLATEAU_XZ.z);
    sheenMesh.renderOrder = 3;
    sheenMesh.frustumCulled = false;
    group.add(sheenMesh);
  }

  /* ============================================================================ 3. THE CLOUD SEA */
  /* Cheap per square metre, enormous in extent (§46). Ring radii are spaced GEOMETRICALLY, so the
     first ring is 36 m from the last and the outermost is 1.3 km — the same trick as the deck, applied
     to a surface that runs to 6.75 km. */
  const seaSegs = Q0.seaSegments, seaRings = SEA.rings;
  const sCount = (seaRings + 1) * seaSegs;
  const sPos = new Float32Array(sCount * 3);
  const sCol = new Float32Array(sCount * 4);
  const sBear = new Float32Array(sCount), sRad = new Float32Array(sCount), sUp = new Float32Array(sCount);
  let seaGeo = null, seaMesh = null;
  {
    const ratio = SEA.outer / SEA.inner;
    for (let i = 0; i <= seaRings; i++) {
      const r = SEA.inner * Math.pow(ratio, i / seaRings);
      for (let j = 0; j < seaSegs; j++) {
        const b = (j / seaSegs) * TAU - Math.PI;
        const x = Math.sin(b) * r, z = -Math.cos(b) * r, v = i * seaSegs + j;
        const y = seaHeight(x, z);
        sPos[v * 3] = x; sPos[v * 3 + 1] = y; sPos[v * 3 + 2] = z;
        sBear[v] = b; sRad[v] = r;
        /* how much of a swell CREST this vertex is: the crests catch the light, the troughs stay in
           the sea's own soft scatter */
        sUp[v] = clamp01((y - SEA.y) / 30 + 0.5);
      }
    }
    const idx = [];
    for (let i = 0; i < seaRings; i++) for (let j = 0; j < seaSegs; j++) {
      const a = i * seaSegs + j, b = i * seaSegs + ((j + 1) % seaSegs);
      const c = (i + 1) * seaSegs + ((j + 1) % seaSegs), d = (i + 1) * seaSegs + j;
      idx.push(a, c, b, a, d, c);
    }
    const g = own.g(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(sCol, 4));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const mat = own.m(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.FrontSide, fog: false }));
    mat.name = 'skyterrain-sea';
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'skyterrain-cloud-sea';
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;                          /* the backdrop everything else stands in front of */
    group.add(mesh);
    seaGeo = g; seaMesh = mesh;
  }
  function bakeSea() {
    for (let v = 0; v < sCount; v++) {
      const bear = sBear[v], r = sRad[v], crest = sUp[v];
      sampleLUT(lutFill, bear, _c);
      sampleLUT(lutHaze, bear, _c3);
      const back = backlight(bear);
      let cr = _c.r * (0.70 + 0.24 * crest), cg = _c.g * (0.70 + 0.24 * crest), cb = _c.b * (0.70 + 0.24 * crest);
      const kf = 0.30 * crest * sunStr * (0.5 + 0.5 * back);
      cr += (sunCol.r - cr) * kf; cg += (sunCol.g - cg) * kf; cb += (sunCol.b - cb) * kf;
      /* the ocean melts into the horizon: by 6.75 km it is 88% atmosphere, which is what makes the
         realm read as vast rather than as a big white disc (§33) */
      const hz = 0.10 + 0.78 * smooth((r - 500) / 5200);
      cr += (_c3.r - cr) * hz; cg += (_c3.g - cg) * hz; cb += (_c3.b - cb) * hz;
      const o = v * 4;
      sCol[o] = cr; sCol[o + 1] = cg; sCol[o + 2] = cb; sCol[o + 3] = 1;
    }
    seaGeo.attributes.color.needsUpdate = true;
  }

  /* ================================================================ 4. THE SOFT-MASS QUAD SYSTEM */
  /* Everything whose SILHOUETTE has to be soft is a feathered billboard from the mass atlas: the cliff
     cascade, the deck rim, the void rims, the ridge crowns, the mist in the valleys, the islands' skin,
     the sea's swell tops and the cold side's towers. They are yawed toward the world origin at BUILD
     time rather than billboarded per frame — the player lives within a few hundred metres of the
     origin and these masses sit 300 m to 6 km out, so the worst orientation error in normal play is
     under 20 degrees, i.e. a 6% foreshortening of a soft blob. That buys zero per-frame cost and full
     atlas variety (a per-frame InstancedMesh could not vary the atlas cell without a custom shader). */
  const atlas = own.t(cloudAtlas(512));
  function QuadSet(name) { return { name, pos: [], uv: [], meta: [], n: 0 }; }
  const PAD = 0.012;
  function addQuad(S, o) {
    const yaw = Math.atan2(-o.x, -o.z);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const roll = o.roll || 0, cr = Math.cos(roll), sr = Math.sin(roll);
    const hw = o.w * 0.5, hh = o.h * 0.5;
    const cell = o.cell & 3;
    const cu = (cell % 2) * 0.5, cv = ((cell >> 1) & 1) * 0.5;
    const u0 = cu + PAD, u1 = cu + 0.5 - PAD, v0 = cv + PAD, v1 = cv + 0.5 - PAD;
    for (let k = 0; k < 4; k++) {                    /* corners anticlockwise from bottom-left */
      const lx = (k === 0 || k === 3) ? -hw : hw;
      const ly = (k === 0 || k === 1) ? -hh : hh;
      const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
      S.pos.push(o.x + rx * c, o.y + ry, o.z - rx * s);
      S.uv.push((k === 0 || k === 3) ? (o.flip ? u1 : u0) : (o.flip ? u0 : u1), (k === 0 || k === 1) ? v0 : v1);
    }
    const r = Math.hypot(o.x, o.z);
    S.meta.push({
      b: layout.bearingOf(o.x, o.z), r,
      base: o.base == null ? 1 : o.base,             /* overall brightness of this mass */
      aTop: o.aTop == null ? 0.9 : o.aTop,
      aBot: o.aBot == null ? 0.62 : o.aBot,
      cool: o.cool || 0,                             /* 1 = read this mass as an underside */
      imp: (o.imp != null ? o.imp : o.w / Math.max(60, r)),
      grp: o.grp | 0,
      run: o.run == null ? -1 : o.run                /* which contiguous form (tower, island) this belongs to */
    });
    S.n++;
    return S.n - 1;
  }
  /* build order = FAR TO NEAR, so a set of depth-write-free soft masses composites correctly for a
     viewer standing near the origin */
  function finishQuads(S, order, materialOpacity) {
    const rank = S.meta.map((m, i) => i).sort((a, b) => S.meta[b].r - S.meta[a].r);
    const n = S.n;
    const pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), col = new Float32Array(n * 16);
    const meta = new Array(n);
    for (let q = 0; q < n; q++) {
      const src = rank[q];
      for (let k = 0; k < 4; k++) {
        pos[q * 12 + k * 3] = S.pos[src * 12 + k * 3];
        pos[q * 12 + k * 3 + 1] = S.pos[src * 12 + k * 3 + 1];
        pos[q * 12 + k * 3 + 2] = S.pos[src * 12 + k * 3 + 2];
        uv[q * 8 + k * 2] = S.uv[src * 8 + k * 2];
        uv[q * 8 + k * 2 + 1] = S.uv[src * 8 + k * 2 + 1];
      }
      meta[q] = S.meta[src];
    }
    const g = own.g(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 4));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(n * 6), 1));
    g.computeBoundingSphere();
    const mat = own.m(new THREE.MeshBasicMaterial({
      map: atlas, vertexColors: true, transparent: true, opacity: materialOpacity,
      depthWrite: false, side: THREE.DoubleSide, fog: false, forceSinglePass: true
    }));
    mat.name = 'skyterrain-' + S.name;
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'skyterrain-' + S.name;
    mesh.frustumCulled = false; mesh.renderOrder = order;
    mesh.castShadow = false; mesh.receiveShadow = false;
    return { mesh, geo: g, mat, meta, n };
  }
  /* Quality trims a quad set by rewriting its index buffer, keeping the masses that read biggest in
     frame and preserving the far-to-near draw order among the survivors. */
  function applyQuadQuality(set, keep) {
    const n = set.n, want = Math.max(1, Math.min(n, Math.round(n * keep)));
    const order = set.meta.map((m, i) => i).sort((a, b) => set.meta[b].imp - set.meta[a].imp);
    const alive = new Uint8Array(n);
    for (let i = 0; i < want; i++) alive[order[i]] = 1;
    const arr = set.geo.index.array;
    let w = 0;
    for (let q = 0; q < n; q++) {
      if (!alive[q]) continue;
      const v = q * 4;
      arr[w++] = v; arr[w++] = v + 1; arr[w++] = v + 2;
      arr[w++] = v; arr[w++] = v + 2; arr[w++] = v + 3;
    }
    set.geo.index.needsUpdate = true;
    set.geo.setDrawRange(0, w);
    set.drawn = w / 6;
  }
  /* Quality on a set whose members are whole FORMS spread across many quads (a tower is nine masses,
     an island's skin is eight): a tier drops entire forms, never half of one. `keep` is the ordered
     list of run ids that survive. */
  function applyRunQuality(set, keepRuns) {
    const alive = new Set(keepRuns);
    const arr = set.geo.index.array;
    let w = 0;
    for (let q = 0; q < set.n; q++) {
      const run = set.meta[q].run;
      if (run >= 0 && !alive.has(run)) continue;
      const v = q * 4;
      arr[w++] = v; arr[w++] = v + 1; arr[w++] = v + 2;
      arr[w++] = v; arr[w++] = v + 2; arr[w++] = v + 3;
    }
    set.geo.index.needsUpdate = true;
    set.geo.setDrawRange(0, w);
    set.drawn = w / 6;
  }
  function bakeQuads(set) {
    const col = set.geo.attributes.color.array;
    for (let q = 0; q < set.n; q++) {
      const m = set.meta[q];
      sampleLUT(lutFill, m.b, _c);
      sampleLUT(lutSky, m.b, _c2);
      const back = backlight(m.b);
      /* THE ONE RULE THAT MAKES FOUR SECTORS ONE BIOME: this mass is tinted from ITS OWN bearing, so
         the identical form is warm on the sunset side and violet on the cold side (§48). */
      const kf = (0.20 + 0.42 * back) * sunStr;
      let tr = _c.r + (sunCol.r - _c.r) * kf, tg = _c.g + (sunCol.g - _c.g) * kf, tb = _c.b + (sunCol.b - _c.b) * kf;
      const gain = m.base * (0.90 + 0.36 * back) * (1 - 0.30 * m.cool);
      tr *= gain; tg *= gain; tb *= gain;
      /* the base of a mass: soft, blue, lifted by the sky above it — never dark (§14) */
      let br = _c.r * 0.60, bg = _c.g * 0.60, bb = _c.b * 0.60;
      br += (_c2.r * 0.62 - br) * 0.50; bg += (_c2.g * 0.62 - bg) * 0.50; bb += (_c2.b * 0.62 - bb) * 0.50;
      const bgain = m.base * (0.92 + 0.30 * back);
      br *= bgain; bg *= bgain; bb *= bgain;
      const o = q * 16;
      for (let k = 0; k < 4; k++) {
        const topv = (k === 2 || k === 3);
        const p = o + k * 4;
        col[p] = topv ? tr : br; col[p + 1] = topv ? tg : bg; col[p + 2] = topv ? tb : bb;
        col[p + 3] = topv ? m.aTop : m.aBot;
      }
    }
    set.geo.attributes.color.needsUpdate = true;
  }

  /* ---------------------------------------------------- 4a. the near forms: rim, cliff, ridges, mist */
  const near = QuadSet('forms-near');
  {
    const R = layout.rng('skybiome-near');
    /* THE SUNSET CLIFF (§05). Sector A's deck simply stops at cliffRadius, and what lies past it is
       300 m of open air over the ocean. The cascade is what makes that edge dramatic instead of
       merely absent: cloud spilling over the lip and dissolving on the way down. */
    for (let i = 0; i < 78; i++) {
      const b = DECK.cliffBearing + (R() * 2 - 1) * DECK.cliffHalf * 0.98;
      const drop = Math.pow(R(), 0.7);               /* biased to the lip, thinning downward */
      const rr = DECK.cliffRadius + 6 + drop * 90 + (R() - 0.5) * 26;
      const d = layout.dir(b);
      const x = d.x * rr, z = d.z * rr;
      const top = cloudTopAt(d.x * (DECK.cliffRadius - 20), d.z * (DECK.cliffRadius - 20));
      const y = top - 6 - drop * 190;
      addQuad(near, {
        x, y, z, w: 84 + drop * 150 + R() * 60, h: 44 + drop * 92 + R() * 34,
        roll: (R() - 0.5) * 0.5, cell: (i * 7) & 3, flip: R() < 0.5,
        base: 1.06 - 0.20 * drop, aTop: 0.88 - 0.24 * drop, aBot: 0.50 - 0.16 * drop,
        cool: drop * 0.6, imp: 3.4 - drop, grp: 0
      });
    }
    /* THE DECK RIM. The continent's outer edge and its under-fluff: without masses hanging below it,
       a heightfield that fades to alpha zero reads as a cut sheet of paper. */
    const RIMN = 120;
    for (let i = 0; i < RIMN; i++) {
      const b = (i / RIMN) * TAU - Math.PI + (R() - 0.5) * 0.03;
      /* skip the sunset arc: over there the boundary is the cliff, 850 m closer in */
      if (Math.abs(layout.angleDelta(DECK.cliffBearing, b)) < DECK.cliffHalf + 0.10) continue;
      const rr = DECK.radius * (0.975 + R() * 0.05);
      const d = layout.dir(b);
      const x = d.x * rr, z = d.z * rr;
      const hang = R();
      const y = cloudTopAt(d.x * (DECK.radius - 90), d.z * (DECK.radius - 90)) - 8 - hang * 78;
      addQuad(near, {
        x, y, z, w: 110 + R() * 96, h: 52 + R() * 58, roll: (R() - 0.5) * 0.42,
        cell: (i * 5 + 1) & 3, flip: R() < 0.5,
        base: 1.0 - 0.16 * hang, aTop: 0.80, aBot: 0.46, cool: 0.25 + hang * 0.5, grp: 1
      });
    }
    /* VOID RIMS (§05, §38). A hole you can see across is atmosphere; its lip is where the cloud tears. */
    for (let vi = 0; vi < VOIDS.length; vi++) {
      const V = VOIDS[vi], c = layout.dir(V.bearing);
      const cx = c.x * V.r, cz = c.z * V.r;
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU + R() * 0.2;
        const rr = V.radius * (0.98 + R() * 0.12);
        const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
        const hang = R();
        addQuad(near, {
          x, y: cloudTopAt(x, z) - 4 - hang * 46, z, w: 52 + R() * 48, h: 26 + R() * 30,
          roll: (R() - 0.5) * 0.5, cell: (vi * 3 + i) & 3, flip: R() < 0.5,
          base: 0.98, aTop: 0.72, aBot: 0.42, cool: 0.3 + hang * 0.5, grp: 2
        });
      }
    }
    /* RIDGE CROWNS (§05). The ridges are what give the realm scale without walling it in, so they get
       cumulus heads — the one place on the deck where the cloud stands UP. */
    const ridges = FEATURES.filter(f => f.kind === 'ridge');
    for (let ri = 0; ri < ridges.length; ri++) {
      const f = ridges[ri];
      const c = layout.dir(f.bearing), cx = c.x * f.r, cz = c.z * f.r;
      const a = f.bearing + layout.HALF_PI + f.rot, ux = Math.sin(a), uz = -Math.cos(a);
      const n = 20;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * f.len * 0.9;
        const off = (R() - 0.5) * f.wide * 0.8;
        const x = cx + ux * t - uz * off, z = cz + uz * t + ux * off;
        if (!layout.deckSolid(x, z) || layout.deckEdge(x, z) < 0.16) continue;
        const s = 0.5 + 0.5 * Math.cos((t / (f.len * 0.5)) * Math.PI * 0.5);
        addQuad(near, {
          x, y: cloudTopAt(x, z) + f.h * 0.22 + 6 + R() * 12, z,
          w: (f.wide * 1.15 + R() * 60) * (0.6 + 0.5 * s), h: (f.h * 0.9 + 22 + R() * 20) * (0.6 + 0.5 * s),
          roll: (R() - 0.5) * 0.34, cell: (ri * 2 + i) & 3, flip: R() < 0.5,
          base: 1.02, aTop: 0.70, aBot: 0.40, cool: 0.18, grp: 3
        });
      }
    }
    /* MIST CORRIDORS (§05). In the valleys the cloud does not stop at the floor — it fills the hollow.
       These standing masses are the part you actually walk INTO; the horizontal sheets below are what
       reads from above. Density is deliberately uneven across the realm: only the valleys get this. */
    const valleys = FEATURES.filter(f => f.kind === 'valley');
    for (let vi = 0; vi < valleys.length; vi++) {
      const f = valleys[vi];
      const c = layout.dir(f.bearing), cx = c.x * f.r, cz = c.z * f.r;
      for (let i = 0; i < 16; i++) {
        const a = R() * TAU, rr = f.radius * 0.85 * Math.sqrt(R());
        const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
        if (!layout.deckSolid(x, z)) continue;
        addQuad(near, {
          x, y: cloudTopAt(x, z) + 5 + R() * 14, z,
          w: 66 + R() * 78, h: 24 + R() * 26, roll: (R() - 0.5) * 0.3,
          cell: (vi + i) & 3, flip: R() < 0.5,
          base: 1.0, aTop: 0.34, aBot: 0.24, cool: 0.4, imp: 0.9, grp: 4
        });
      }
    }
  }

  /* ------------------------------------------------------------------------- 4b. islands (§ISLANDS) */
  /* Detached cloud masses used for traversal and flight practice, so unlike everything else in this
     section they need a real, landable, solid TOP. Each is a lump: a slightly flattened crown that
     tapers into a long soft root, lumpy enough never to read as a sphere. The contract's `y` is taken
     as the LANDING SURFACE, which is the only reading another module can use without asking. */
  const islandSkin = QuadSet('island-skin');
  const islandInfo = [];
  let islandsSet = null;
  {
    const ST = 8, SL = 14;
    const perIsland = ST * SL * 2 - SL * 2;          /* two degenerate rows at the poles */
    const total = ISLANDS.length * (ST + 1) * SL;
    const pos = new Float32Array(total * 3), col = new Float32Array(total * 4);
    const idx = new Uint32Array(ISLANDS.length * perIsland * 3);
    const meta = new Array(ISLANDS.length);
    let vo = 0, io = 0;
    const runs = [];                                  /* one entry per island: its slice of the index buffer */
    for (let k = 0; k < ISLANDS.length; k++) {
      const I = ISLANDS[k];
      const d = layout.dir(I.bearing);
      const cx = d.x * I.r, cz = d.z * I.r;
      const ry = (I.rx + I.rz) * 0.5 * 0.55;
      const cy = I.y - ry;                            /* so the crown lands exactly on I.y */
      const R = layout.rng('island' + k);
      const s1 = R() * TAU, s2 = R() * TAU;
      const base = vo, ioStart = io;
      for (let i = 0; i <= ST; i++) {
        const th = (i / ST) * Math.PI, cth = Math.cos(th), sth = Math.sin(th);
        for (let j = 0; j < SL; j++) {
          const phi = (j / SL) * TAU;
          /* crown slightly flattened so it is standable; underside drawn down into a soft root */
          const hy = cth >= 0 ? ry * Math.pow(cth, 1.45) : -ry * 1.45 * Math.pow(-cth, 0.75);
          let hr = sth;
          if (cth < 0) hr *= 1 - 0.85 * Math.pow(-cth, 1.3);
          const lump = 1 + 0.14 * Math.sin(3.1 * phi + s1) * (0.4 + 0.6 * sth) + 0.09 * Math.sin(5.3 * phi + s2) * sth;
          const v = vo++;
          pos[v * 3] = cx + I.rx * hr * lump * Math.sin(phi);
          pos[v * 3 + 1] = cy + hy;
          pos[v * 3 + 2] = cz + I.rz * hr * lump * Math.cos(phi);
        }
      }
      for (let i = 0; i < ST; i++) for (let j = 0; j < SL; j++) {
        const a = base + i * SL + j, b = base + i * SL + ((j + 1) % SL);
        const c = base + (i + 1) * SL + ((j + 1) % SL), dd = base + (i + 1) * SL + j;
        if (i > 0) { idx[io++] = a; idx[io++] = c; idx[io++] = b; }
        if (i < ST - 1) { idx[io++] = a; idx[io++] = dd; idx[io++] = c; }
      }
      runs.push({ id: k, ioStart, ioEnd: io, imp: (I.rx + I.rz) / Math.max(120, I.r) });
      meta[k] = { b: layout.bearingOf(cx, cz), base, count: vo - base, ry, cy };
      islandInfo.push({ index: k, x: cx, y: I.y, z: cz, rx: I.rx, rz: I.rz, top: I.y, bearing: I.bearing, r: I.r });
      /* a feathered skin around the equator so the lump never shows a hard sphere edge (§49) */
      for (let q = 0; q < 8; q++) {
        const a = (q / 8) * TAU + R() * 0.3;
        const rr = Math.max(I.rx, I.rz) * (0.72 + R() * 0.24);
        addQuad(islandSkin, {
          x: cx + Math.sin(a) * rr, y: cy + ry * (0.05 - R() * 0.55), z: cz + Math.cos(a) * rr,
          w: I.rx * (1.5 + R() * 0.7), h: I.rx * (0.62 + R() * 0.32), roll: (R() - 0.5) * 0.4,
          cell: (k + q) & 3, flip: R() < 0.5,
          base: 1.0, aTop: 0.66, aBot: 0.44, cool: 0.35, imp: I.rx / Math.max(80, I.r), grp: 5, run: k
        });
      }
    }
    const g = own.g(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 4));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    /* OPAQUE on purpose: an island is the one cloud in this realm a resident stands on, so it needs a
       real depth write and a solid read. Its softness comes from the skin quads around it, not from
       making the mass itself see-through. */
    const mat = own.m(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.FrontSide, fog: false }));
    mat.name = 'skyterrain-islands';
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'skyterrain-islands';
    mesh.frustumCulled = false; mesh.renderOrder = -1;
    group.add(mesh);
    runs.sort((a, b) => b.imp - a.imp);               /* biggest in frame first, so a tier drops the faint ones */
    islandsSet = { geo: g, mesh, mat, meta, runs, idxFull: idx.slice(), count: vo, drawn: ISLANDS.length };
  }
  /* Islands trim by whole island: copy the surviving islands' triangle runs back into the index. */
  function applyIslandQuality(count) {
    const k = Math.max(1, Math.min(islandsSet.runs.length, count));
    const dst = islandsSet.geo.index.array, src = islandsSet.idxFull;
    let w = 0;
    const kept = [];
    for (let i = 0; i < k; i++) kept.push(islandsSet.runs[i]);
    kept.sort((a, b) => a.ioStart - b.ioStart);       /* keep buffer order, so the copy stays sequential */
    for (const R of kept) for (let e = R.ioStart; e < R.ioEnd; e++) dst[w++] = src[e];
    islandsSet.geo.index.needsUpdate = true;
    islandsSet.geo.setDrawRange(0, w);
    islandsSet.drawn = k;
    return kept.map(r => r.id);
  }
  function bakeIslands() {
    const col = islandsSet.geo.attributes.color.array;
    const pos = islandsSet.geo.attributes.position.array;
    for (let k = 0; k < islandsSet.meta.length; k++) {
      const m = islandsSet.meta[k];
      sampleLUT(lutFill, m.b, _c);
      sampleLUT(lutSky, m.b, _c2);
      sampleLUT(lutHaze, m.b, _c3);
      const back = backlight(m.b);
      for (let v = m.base; v < m.base + m.count; v++) {
        /* one gradient, top to root: crown catches the key, the root stays in soft blue bounce */
        const t = clamp01((pos[v * 3 + 1] - (m.cy - m.ry * 1.45)) / (m.ry * 2.45));
        let cr = _c.r * (0.58 + 0.30 * t), cg = _c.g * (0.58 + 0.30 * t), cb = _c.b * (0.58 + 0.30 * t);
        const kf = (0.14 + 0.36 * back) * sunStr * Math.pow(t, 1.4);
        cr += (sunCol.r - cr) * kf; cg += (sunCol.g - cg) * kf; cb += (sunCol.b - cb) * kf;
        const sky = 0.26 * (1 - t);
        cr += (_c2.r * 0.66 - cr) * sky; cg += (_c2.g * 0.66 - cg) * sky; cb += (_c2.b * 0.66 - cb) * sky;
        const hz = 0.30 * smooth((Math.hypot(pos[v * 3], pos[v * 3 + 2]) - 300) / 1200);
        cr += (_c3.r - cr) * hz; cg += (_c3.g - cg) * hz; cb += (_c3.b - cb) * hz;
        const g2 = 0.94 + 0.26 * back;
        col[v * 4] = cr * g2; col[v * 4 + 1] = cg * g2; col[v * 4 + 2] = cb * g2; col[v * 4 + 3] = 1;
      }
    }
    islandsSet.geo.attributes.color.needsUpdate = true;
  }

  /* -------------------------------------------------------------------- 4c. the cold side's towers */
  /* §17 asks the backside to REWARD turning around, so these are the hero silhouette of the realm:
     620–1500 m of vertical cloud standing 1.4–3 km out in sector D, rising out of the cloud sea. They
     are architecture made of weather, and they are the reason the violet half of the sky has depth. */
  const towerSet = QuadSet('towers');
  const towerRuns = [];                               /* one per tower, ordered later by angular size */
  {
    for (let k = 0; k < TOWERS.length; k++) {
      const T = TOWERS[k];
      const d = layout.dir(T.bearing);
      const cx = d.x * T.r, cz = d.z * T.r;
      const R = layout.rng('tower' + k);
      const baseY = seaHeight(cx, cz) + 25;
      /* the tangential axis, so the stack can wander sideways without rotating out of its billboard */
      const tx = -d.z, tz = d.x;
      const from = towerSet.n;
      if (T.kind === 'shelf') {
        /* a broad horizontal shelf: the cold side's flat cloud architecture */
        const yy = baseY + T.h * 0.55;
        for (let i = 0; i < 7; i++) {
          const u = (i / 6 - 0.5) * T.w * 1.6;
          addQuad(towerSet, {
            x: cx + tx * u, y: yy + (R() - 0.5) * T.h * 0.16, z: cz + tz * u,
            w: T.w * (0.72 + R() * 0.3), h: T.h * (0.30 + R() * 0.16), roll: (R() - 0.5) * 0.14,
            cell: (k + i) & 3, flip: R() < 0.5, base: 1.0, aTop: 0.80, aBot: 0.52, cool: 0.30,
            imp: T.h / T.r, grp: 6, run: k
          });
        }
        for (let i = 0; i < 4; i++) {
          const u = (R() - 0.5) * T.w * 1.3;
          addQuad(towerSet, {
            x: cx + tx * u, y: yy - T.h * (0.24 + R() * 0.18), z: cz + tz * u,
            w: T.w * (0.5 + R() * 0.4), h: T.h * (0.16 + R() * 0.12), roll: (R() - 0.5) * 0.3,
            cell: (k + i + 2) & 3, flip: R() < 0.5, base: 0.94, aTop: 0.56, aBot: 0.34, cool: 0.6,
            imp: T.h / T.r, grp: 6, run: k
          });
        }
      } else {
        /* the column: 9 masses stacked with real overlap so no gap can open between them */
        const N = 9;
        for (let i = 0; i < N; i++) {
          const t = i / (N - 1);
          const flare = 1 + 0.34 * Math.pow(1 - t, 2.0);   /* wide, soft foot */
          const u = (R() - 0.5) * T.w * 0.30;
          addQuad(towerSet, {
            x: cx + tx * u, y: baseY + T.h * (0.06 + t * 0.72), z: cz + tz * u,
            w: T.w * flare * (0.86 + R() * 0.3), h: T.h * (0.20 + R() * 0.08),
            roll: (R() - 0.5) * 0.18, cell: (k * 3 + i) & 3, flip: R() < 0.5,
            base: 0.96 + 0.14 * t, aTop: 0.84, aBot: 0.56, cool: 0.42 * (1 - t),
            imp: T.h / T.r, grp: 6, run: k
          });
        }
        if (T.kind === 'anvil') {
          /* the anvil: the top spreads and shears, which is what says "this is 1.5 km of weather" */
          for (let i = 0; i < 6; i++) {
            const u = (i / 5 - 0.42) * T.w * 2.0;
            addQuad(towerSet, {
              x: cx + tx * u, y: baseY + T.h * (0.86 + R() * 0.12), z: cz + tz * u,
              w: T.w * (0.9 + R() * 0.5), h: T.h * (0.11 + R() * 0.06), roll: (R() - 0.5) * 0.1,
              cell: (k + i + 1) & 3, flip: R() < 0.5, base: 1.16, aTop: 0.86, aBot: 0.58, cool: 0.1,
              imp: T.h / T.r * 1.2, grp: 6, run: k
            });
          }
        }
      }
      towerRuns.push({ id: k, from, to: towerSet.n, imp: T.h / T.r });
    }
    towerRuns.sort((a, b) => b.imp - a.imp);          /* biggest in frame first */
  }

  /* ------------------------------------------------------------ 4d. the swell tops on the cloud sea */
  const seaForms = QuadSet('sea-forms');
  {
    const R = layout.rng('skybiome-sea-forms');
    for (let i = 0; i < 96; i++) {
      /* biased outward: near the deck the ocean should stay legible, far out it should be all texture */
      const rr = 1250 + Math.pow(R(), 0.65) * (SEA.outer * 0.82 - 1250);
      const b = R() * TAU - Math.PI;
      const x = Math.sin(b) * rr, z = -Math.cos(b) * rr;
      const scale = 0.55 + rr / SEA.outer * 1.5;
      addQuad(seaForms, {
        x, y: seaHeight(x, z) + 18 + R() * 120 * scale, z,
        w: (220 + R() * 420) * scale, h: (86 + R() * 160) * scale, roll: (R() - 0.5) * 0.2,
        cell: i & 3, flip: R() < 0.5,
        base: 1.0, aTop: 0.66, aBot: 0.40, cool: 0.2, imp: (220 + R() * 420) / rr, grp: 7
      });
    }
  }

  const nearSet = finishQuads(near, 6, 0.95);
  const towerFinished = finishQuads(towerSet, 4, 0.92);
  const seaSet = finishQuads(seaForms, 5, 0.88);
  const islandSkinSet = finishQuads(islandSkin, 6, 0.95);
  group.add(nearSet.mesh, towerFinished.mesh, seaSet.mesh, islandSkinSet.mesh);

  /* ================================================================ 5. THE VALLEY MIST SHEETS (§05) */
  /* Stacked horizontal veils lying in each valley bowl. Seen from the flats they are the haze that
     makes a hollow read as depth; seen from above they are the partially-obscured passage the brief
     asks for. They drift, so a corridor is never the same shape twice. */
  const mistSheets = [];
  let mistMesh = null, mistGeo = null, mistMat = null;
  {
    const valleys = FEATURES.filter(f => f.kind === 'valley');
    const SEG = 20, RG = 3;
    const per = 1 + SEG * RG;
    const LEVELS = [2.5, 8, 15, 23];
    const total = valleys.length * LEVELS.length * per;
    const pos = new Float32Array(total * 3), col = new Float32Array(total * 4);
    const idx = [];
    let vo = 0;
    const R = layout.rng('skybiome-mist');
    for (let vi = 0; vi < valleys.length; vi++) {
      const f = valleys[vi];
      const c = layout.dir(f.bearing), cx = c.x * f.r, cz = c.z * f.r;
      for (let li = 0; li < LEVELS.length; li++) {
        const rad = f.radius * (1.18 - li * 0.16);
        const lift = LEVELS[li];
        const base = vo;
        const put = (v, x, z, t) => {
          pos[v * 3] = x; pos[v * 3 + 1] = cloudTopAt(x, z) + lift; pos[v * 3 + 2] = z;
          const a = (1 - smooth((t - 0.35) / 0.65)) * (0.30 - li * 0.05);
          col[v * 4] = 1; col[v * 4 + 1] = 1; col[v * 4 + 2] = 1; col[v * 4 + 3] = a;
        };
        put(vo++, cx, cz, 0);
        for (let i = 1; i <= RG; i++) for (let j = 0; j < SEG; j++) {
          const t = i / RG, rr = rad * t, a = (j / SEG) * TAU;
          put(vo++, cx + Math.cos(a) * rr * (0.85 + R() * 0.3), cz + Math.sin(a) * rr * (0.85 + R() * 0.3), t);
        }
        const mAt = (i, j) => base + 1 + (i - 1) * SEG + (j % SEG);
        for (let j = 0; j < SEG; j++) idx.push(base, mAt(1, j + 1), mAt(1, j));
        for (let i = 1; i < RG; i++) for (let j = 0; j < SEG; j++) {
          const a = mAt(i, j), b = mAt(i, j + 1), cc = mAt(i + 1, j + 1), d = mAt(i + 1, j);
          idx.push(a, cc, b, a, d, cc);
        }
        mistSheets.push({ base, count: per, b: layout.bearingOf(cx, cz) });
      }
    }
    mistGeo = own.g(new THREE.BufferGeometry());
    mistGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    mistGeo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    mistGeo.setIndex(idx);
    mistGeo.computeBoundingSphere();
    mistMat = own.m(new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, opacity: 1
    }));
    mistMat.name = 'skyterrain-valley-mist';
    mistMesh = new THREE.Mesh(mistGeo, mistMat);
    mistMesh.name = 'skyterrain-valley-mist';
    mistMesh.frustumCulled = false; mistMesh.renderOrder = 7;
    group.add(mistMesh);
  }
  function bakeMist() {
    const col = mistGeo.attributes.color.array;
    for (const S of mistSheets) {
      sampleLUT(lutFill, S.b, _c);
      const back = backlight(S.b);
      const kf = (0.24 + 0.30 * back) * sunStr;
      const r = (_c.r + (sunCol.r - _c.r) * kf) * 1.02;
      const g = (_c.g + (sunCol.g - _c.g) * kf) * 1.02;
      const b = (_c.b + (sunCol.b - _c.b) * kf) * 1.02;
      for (let v = S.base; v < S.base + S.count; v++) { col[v * 4] = r; col[v * 4 + 1] = g; col[v * 4 + 2] = b; }
    }
    mistGeo.attributes.color.needsUpdate = true;
  }

  /* ============================================ 6. THE DISTURBANCE POOL — disturb() (§29, §30, §31) */
  /* A launch, a GYMATTACK or a hover presses the cloud down and it reforms. Everything is POOLED and
     preallocated: disturb() writes into a free slot and allocates nothing, and update() rewrites two
     small dynamic buffers rather than touching the deck (a deck rebuild per impact would cost more
     than the whole module).

     Two parts. The PRESS is a bowl lying in the surface, sampled against the real cloud top at the
     moment it is created so it follows a rolling deck exactly. The VAPOUR is a ring of displaced
     cloud running outward from it plus three rising puffs. The bowl eases in over 0.16 s and releases
     over the rest — the cloud always wins. */
  const SLOTS = 12, PS_SEG = 14, PS_RING = 2;
  const PRESS_V = 1 + PS_SEG * PS_RING;            /* the bowl */
  const RING_V = PS_SEG * 2;                       /* the displaced-vapour band */
  const SLOT_V = PRESS_V + RING_V;
  /* index elements one slot contributes: the bowl's fan, its quad rings, and the vapour band */
  const PRESS_IDX = (PS_SEG + (PS_RING - 1) * PS_SEG * 2 + PS_SEG * 2) * 3;
  const PUFFS = 3, PUFF_V = PUFFS * 4;
  const pressPos = new Float32Array(SLOTS * SLOT_V * 3);
  const pressCol = new Float32Array(SLOTS * SLOT_V * 4);
  const pressBase = new Float32Array(SLOTS * SLOT_V * 3);   /* the resting surface under each vertex */
  const pressDip = new Float32Array(SLOT_V);                /* the unit bowl profile */
  const puffPos = new Float32Array(SLOTS * PUFF_V * 3);
  const puffUV = new Float32Array(SLOTS * PUFF_V * 2);
  const puffCol = new Float32Array(SLOTS * PUFF_V * 4);
  const slots = [];
  for (let s = 0; s < SLOTS; s++) slots.push({ i: s, live: false, x: 0, z: 0, r: 40, s: 1, t: 0, life: 2.6, seed: s * 1.7, b: 0, tint: new THREE.Color(1, 1, 1) });
  let pressGeo = null, pressMesh = null, puffGeo = null, puffMesh = null;
  {
    /* the unit bowl: 1 at the centre, 0 at the rim, with a soft shoulder */
    pressDip[0] = 1;
    for (let i = 1; i <= PS_RING; i++) for (let j = 0; j < PS_SEG; j++) {
      const f = i / PS_RING;
      pressDip[1 + (i - 1) * PS_SEG + j] = Math.pow(1 - f * f, 1.6);
    }
    for (let v = PRESS_V; v < SLOT_V; v++) pressDip[v] = 0;
    /* static index buffers for the pool */
    const pidx = [];
    for (let s = 0; s < SLOTS; s++) {
      const o = s * SLOT_V;
      const pAt = (i, j) => o + 1 + (i - 1) * PS_SEG + (j % PS_SEG);
      for (let j = 0; j < PS_SEG; j++) pidx.push(o, pAt(1, j + 1), pAt(1, j));
      for (let i = 1; i < PS_RING; i++) for (let j = 0; j < PS_SEG; j++) {
        const a = pAt(i, j), b = pAt(i, j + 1), c = pAt(i + 1, j + 1), d = pAt(i + 1, j);
        pidx.push(a, c, b, a, d, c);
      }
      const rBase = o + PRESS_V;
      for (let j = 0; j < PS_SEG; j++) {
        const a = rBase + j, b = rBase + ((j + 1) % PS_SEG);
        const c = rBase + PS_SEG + ((j + 1) % PS_SEG), d = rBase + PS_SEG + j;
        pidx.push(a, c, b, a, d, c);
      }
    }
    const g = own.g(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pressPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(pressCol, 4).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(pidx);
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);   /* pooled: never cull by bounds */
    const mat = own.m(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    mat.name = 'skyterrain-disturb-press';
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'skyterrain-disturb-press';
    mesh.frustumCulled = false; mesh.renderOrder = 8;
    group.add(mesh);
    pressGeo = g; pressMesh = mesh;

    const qidx = [];
    for (let s = 0; s < SLOTS; s++) for (let p = 0; p < PUFFS; p++) {
      const v = (s * PUFFS + p) * 4;
      qidx.push(v, v + 1, v + 2, v, v + 2, v + 3);
      /* every puff draws atlas cell (s+p)%4 */
      const cell = (s + p) & 3, cu = (cell % 2) * 0.5, cv = ((cell >> 1) & 1) * 0.5;
      const u0 = cu + PAD, u1 = cu + 0.5 - PAD, v0 = cv + PAD, v1 = cv + 0.5 - PAD;
      puffUV[v * 2] = u0; puffUV[v * 2 + 1] = v0;
      puffUV[(v + 1) * 2] = u1; puffUV[(v + 1) * 2 + 1] = v0;
      puffUV[(v + 2) * 2] = u1; puffUV[(v + 2) * 2 + 1] = v1;
      puffUV[(v + 3) * 2] = u0; puffUV[(v + 3) * 2 + 1] = v1;
    }
    const pg = own.g(new THREE.BufferGeometry());
    pg.setAttribute('position', new THREE.BufferAttribute(puffPos, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('uv', new THREE.BufferAttribute(puffUV, 2));
    pg.setAttribute('color', new THREE.BufferAttribute(puffCol, 4).setUsage(THREE.DynamicDrawUsage));
    pg.setIndex(qidx);
    pg.setDrawRange(0, 0);
    pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const pmat = own.m(new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    pmat.name = 'skyterrain-disturb-vapour';
    const pmesh = new THREE.Mesh(pg, pmat);
    pmesh.name = 'skyterrain-disturb-vapour';
    pmesh.frustumCulled = false; pmesh.renderOrder = 9;
    group.add(pmesh);
    puffGeo = pg; puffMesh = pmesh;
  }

  /* The public hook. Costs one slot write; never allocates; ignores anything off the cloud floor,
     because a press has to press SOMETHING (contract law 1). */
  function disturb(x, z, radius, strength) {
    if (!layout.deckSolid(x, z)) return false;
    let slot = null, oldest = -1;
    for (let i = 0; i < SLOTS; i++) {
      const S = slots[i];
      if (!S.live) { slot = S; break; }
      const age = S.t / S.life;
      if (age > oldest) { oldest = age; slot = S; }
    }
    if (!slot) return false;
    slot.live = true; slot.t = 0;
    slot.x = x; slot.z = z;
    slot.r = Math.max(5, Math.min(150, radius || 30));
    slot.s = Math.max(0.05, Math.min(1, strength == null ? 0.6 : strength));
    slot.life = 1.9 + slot.s * 1.6;
    slot.b = layout.bearingOf(x, z);
    sampleLUT(lutFill, slot.b, slot.tint);
    /* sample the real surface once, so the bowl lies in the deck however the deck rolls here */
    const o = slot.i * SLOT_V;
    pressBase[o * 3] = x; pressBase[o * 3 + 1] = cloudTopAt(x, z) + 0.35; pressBase[o * 3 + 2] = z;
    for (let i = 1; i <= PS_RING; i++) for (let j = 0; j < PS_SEG; j++) {
      const f = i / PS_RING, a = (j / PS_SEG) * TAU;
      const px = x + Math.cos(a) * slot.r * f, pz = z + Math.sin(a) * slot.r * f;
      const v = (o + 1 + (i - 1) * PS_SEG + j) * 3;
      pressBase[v] = px; pressBase[v + 1] = cloudTopAt(px, pz) + 0.35; pressBase[v + 2] = pz;
    }
    for (let j = 0; j < PS_SEG; j++) {
      const a = (j / PS_SEG) * TAU;
      for (let k = 0; k < 2; k++) {
        const px = x + Math.cos(a) * slot.r, pz = z + Math.sin(a) * slot.r;
        const v = (o + PRESS_V + k * PS_SEG + j) * 3;
        pressBase[v] = px; pressBase[v + 1] = cloudTopAt(px, pz) + 0.9; pressBase[v + 2] = pz;
      }
    }
    return true;
  }

  /* ------------------------------------------------------------------------------ time and theme */
  const drift = { skinU: 0, mistPhase: 0 };
  let lastBand = null, lastDay = -1;

  function bakeAll() {
    bakeDeck(); bakeSea(); bakeIslands(); bakeMist();
    bakeQuads(nearSet); bakeQuads(towerFinished); bakeQuads(seaSet); bakeQuads(islandSkinSet);
  }

  function setTime(state) {
    const s = state || {};
    const b = (s.band && ATMO[s.band]) ? s.band : (typeof s.sunElevation === 'number'
      ? (s.sunElevation < -0.12 ? 'night' : s.sunElevation > 0.32 ? 'day' : 'dusk') : 'dusk');
    daylight = typeof s.daylight === 'number' ? s.daylight : daylight;
    /* rebaking is a full vertex-colour pass over ~9k vertices, so it happens on a real change of
       light and never per frame */
    if (b === lastBand && Math.abs(daylight - lastDay) < 0.05) return b;
    band = b; lastBand = b; lastDay = daylight;
    refreshLUT(band);
    bakeAll();
    /* the vapour skin thins in bright day (a cloud floor in full sun is harder, not softer) and
       thickens at night, when the realm should feel like it is inside the weather */
    skinMat.opacity = 0.95 - 0.28 * daylight;
    return band;
  }

  /* NATURE IS NOT THEMED. Cloud, sky, mist and rock belong to the world, not to the viewing player's
     energy colour (§ the three appearance owners). There is nothing in this module a Theme may touch. */
  function setTheme(t) { return t; }

  /* ------------------------------------------------------------------------------------- motion */
  function update(t, dt, camera) {
    const d = (typeof dt === 'number' && dt > 0 && dt < 0.5) ? dt : 0.016;
    /* the vapour skin creeps across the deck: the surface is never quite still, which is most of what
       separates cloud from concrete when the player stands still and looks at the floor */
    drift.skinU += d * 0.0022;
    vapour.offset.x = drift.skinU;
    vapour.offset.y = drift.skinU * 0.42;
    /* the valley mist wanders through its hollow */
    drift.mistPhase = t * 0.035;
    if (mistMesh) {
      mistMesh.position.x = Math.sin(drift.mistPhase) * 11;
      mistMesh.position.z = Math.cos(drift.mistPhase * 0.77) * 9;
      mistMesh.position.y = Math.sin(drift.mistPhase * 1.31) * 1.6;
    }
    /* the sea's swell tops drift very slowly around the world: 0.9 m/s at 1.5 km */
    seaSet.mesh.rotation.y = t * 0.0006;

    /* ---- the disturbance pool ---- */
    let activePress = 0, activePuff = 0;
    const camX = camera ? camera.position.x : 0, camZ = camera ? camera.position.z : 0;
    for (let i = 0; i < SLOTS; i++) {
      const S = slots[i];
      if (!S.live) continue;
      S.t += d;
      const u = S.t / S.life;
      if (u >= 1) { S.live = false; continue; }
      /* press in fast, reform slow — the cloud always comes back (§31) */
      const press = u < 0.16 ? smooth(u / 0.16) : 1 - smooth((u - 0.16) / 0.84);
      const depth = S.s * S.r * 0.26 * press;
      const o = i * SLOT_V;
      const dst = activePress * SLOT_V;
      const rim = 0.78 + 0.9 * u;                    /* the displaced vapour runs outward */
      const rimFade = (1 - smooth(u)) * S.s;
      for (let v = 0; v < SLOT_V; v++) {
        const sv = (o + v) * 3, dv = (dst + v) * 3;
        const isRing = v >= PRESS_V;
        if (isRing) {
          /* the band expands about the slot centre */
          const k = (v - PRESS_V) < PS_SEG ? rim * 0.82 : rim * 1.24;
          pressPos[dv] = S.x + (pressBase[sv] - S.x) * k;
          pressPos[dv + 2] = S.z + (pressBase[sv + 2] - S.z) * k;
          pressPos[dv + 1] = pressBase[sv + 1] + 1.2 + 5 * u;
        } else {
          pressPos[dv] = pressBase[sv];
          pressPos[dv + 2] = pressBase[sv + 2];
          pressPos[dv + 1] = pressBase[sv + 1] - depth * pressDip[v];
        }
        const cv = (dst + v) * 4;
        if (isRing) {
          /* displaced vapour: brighter than the floor it came out of */
          pressCol[cv] = S.tint.r * 1.18; pressCol[cv + 1] = S.tint.g * 1.16; pressCol[cv + 2] = S.tint.b * 1.14;
          pressCol[cv + 3] = ((v - PRESS_V) < PS_SEG ? 0.42 : 0.0) * rimFade;
        } else {
          /* the bowl: compressed cloud, a touch deeper in value, never anywhere near dark */
          const f = pressDip[v];
          const k = 1 - 0.20 * f * press;
          pressCol[cv] = S.tint.r * k; pressCol[cv + 1] = S.tint.g * k; pressCol[cv + 2] = S.tint.b * k;
          pressCol[cv + 3] = 0.55 * f * press * S.s;
        }
      }
      activePress++;

      /* three puffs lifting out of the press, camera-facing */
      for (let p = 0; p < PUFFS; p++) {
        const a = S.seed + p * 2.094;
        const rr = S.r * (0.45 + 0.85 * u);
        const px = S.x + Math.cos(a) * rr, pz = S.z + Math.sin(a) * rr;
        const py = pressBase[o * 3 + 1] + 3 + 16 * u;
        let nx = camX - px, nz = camZ - pz;
        const inv = 1 / Math.max(1e-3, Math.hypot(nx, nz));
        nx *= inv; nz *= inv;
        const rxv = nz, rzv = -nx;                    /* right = up x normal */
        const w = S.r * (0.40 + 0.55 * u) * (0.7 + 0.3 * Math.sin(a * 3.1));
        const h = w * 0.62;
        const alpha = Math.sin(Math.PI * u) * 0.62 * S.s;
        const vb = (activePuff * 4);
        for (let k = 0; k < 4; k++) {
          const lx = (k === 0 || k === 3) ? -w * 0.5 : w * 0.5;
          const ly = (k === 0 || k === 1) ? -h * 0.5 : h * 0.5;
          const vv = (vb + k) * 3;
          puffPos[vv] = px + rxv * lx; puffPos[vv + 1] = py + ly; puffPos[vv + 2] = pz + rzv * lx;
          const cc = (vb + k) * 4;
          puffCol[cc] = S.tint.r * 1.20; puffCol[cc + 1] = S.tint.g * 1.18; puffCol[cc + 2] = S.tint.b * 1.16;
          puffCol[cc + 3] = alpha * ((k === 2 || k === 3) ? 1 : 0.62);
        }
        activePuff++;
      }
    }
    /* the pool is compacted to the front of the buffer, so one draw range covers every live slot */
    pressGeo.setDrawRange(0, activePress * PRESS_IDX);
    puffGeo.setDrawRange(0, activePuff * 6);
    if (activePress) { pressGeo.attributes.position.needsUpdate = true; pressGeo.attributes.color.needsUpdate = true; }
    if (activePuff) { puffGeo.attributes.position.needsUpdate = true; puffGeo.attributes.color.needsUpdate = true; }
  }

  /* ------------------------------------------------------------------------------------ quality */
  /* The deck's own resolution is fixed at build time (rebuilding a 5k-triangle heightfield mid-session
     costs more than it saves, and the deck is the cheapest thing here). What a tier changes is the
     things that are expensive because of OVERDRAW: the vapour skin, the mist, and how many soft masses
     are in the air (§45). */
  function setQuality(q) {
    const name = typeof q === 'string' ? q : (q && q.name) || 'high';
    const K = QUALITY[name] || QUALITY.high;
    tier = QUALITY[name] ? name : 'high';
    const keep = name === 'low' ? 0.48 : name === 'medium' ? 0.76 : 1.0;
    applyQuadQuality(nearSet, keep);
    applyQuadQuality(seaSet, name === 'low' ? 0.35 : name === 'medium' ? 0.7 : 1.0);
    /* whole forms, never half of one */
    applyRunQuality(towerFinished, towerRuns.slice(0, Math.max(1, Math.min(towerRuns.length, K.towers))).map(r => r.id));
    const keptIslands = applyIslandQuality(K.islands);
    applyRunQuality(islandSkinSet, keptIslands);      /* a skin without its island would be a ghost */
    /* the vapour skin is a full-deck transparent layer, so it is the biggest fill-rate item here; at
       the low tier the deck goes DoubleSide instead of carrying a separate underside mesh, which keeps
       the continent solid from below for one fewer draw call */
    skinMesh.visible = name !== 'low';
    mistMat.opacity = K.mist;
    mistMesh.visible = K.mist > 0.05;
    underMesh.visible = name !== 'low';
    deckMat.side = name === 'low' ? THREE.DoubleSide : THREE.FrontSide;
    deckMat.needsUpdate = true;
    if (stats) measure();
    return tier;
  }

  function dispose() {
    if (group.parent) group.parent.remove(group);
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
  }

  if (scene && !group.parent) scene.add(group);

  const stats = {
    module: 'sky-terrain',
    tier,
    deckVertices: dCount,
    deckSegments: segs, deckRings: rings,
    seaSegments: seaSegs, seaRings,
    nearForms: nearSet.n, seaForms: seaSet.n, towerForms: towerFinished.n, islandSkins: islandSkinSet.n,
    islands: ISLANDS.length, towers: TOWERS.length, mistSheets: mistSheets.length,
    disturbSlots: SLOTS,
    drawCalls: 0, triangles: 0, trianglesPeak: 0, disturbTrianglesPeak: 0,
    get band() { return band; },
    get drawnTowers() { return towerFinished.drawn; },
    get drawnIslands() { return islandsSet.drawn; }
  };
  /* MEASURED, not estimated: what this module actually submits at the tier it was built at, counting
     the draw range every quality pass left behind (§45, §46). The disturbance pool is idle at build,
     so its ceiling is reported separately. */
  function measure() {
    stats.drawCalls = 0; stats.triangles = 0; stats.trianglesPeak = 0;
    group.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      const full = g.index ? g.index.count : g.attributes.position.count;
      const dr = g.drawRange;
      const drawn = (dr && dr.count != null && dr.count !== Infinity) ? Math.min(dr.count, full) : full;
      if (o.visible) { stats.drawCalls++; stats.triangles += Math.round(drawn / 3); }
      stats.trianglesPeak += Math.round(full / 3);
    });
    /* the pool at full stretch: 12 simultaneous disturbances */
    stats.disturbTrianglesPeak = SLOTS * (PRESS_IDX / 3) + SLOTS * PUFFS * 2;
    return stats;
  }

  /* ------------------------------------------------------------------------------------- finish */
  setTime((ctx && ctx.clock && ctx.clock.state) ? ctx.clock.state() : { band: 'dusk', daylight: 0.25, sunElevation: 0.055 });
  setQuality(tier);
  update(0, 0, ctx && ctx.camera);
  measure();

  return {
    group, setTime, setTheme, update, setQuality, dispose, stats,
    /* the extra surface the rest of the realm needs */
    disturb,
    cloudTopAt,
    seaHeight,
    /* every island's landing surface, so the life and structure modules land ON them (contract law 1) */
    islands: islandInfo
  };
}

export default buildSkyTerrain;
