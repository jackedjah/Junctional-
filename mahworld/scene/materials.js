/* MAHPLAZA :: MATERIALS + THEMES

   One place for the world's surface language so every module agrees.

   v5 — THE CHROMIUM CIVILIZATION. MAHWORLD is built from chromium, dark
   platinum, polished crystal, reflective glass and MAHGIC light. A finish is a
   ROUGHNESS, not a hue: `chromeMirror`, `chromeSatin`, `platinumBrushed`,
   `graphiteMetal` and `crystalGlass` are the same cool neutral metal read at
   five different polishes, so the world stays one civilization. They are ranked
   by how much of it may wear them — mirror is rare and focal, graphite is
   everywhere. This does NOT mean every surface becomes mirror chrome.

   ENERGY (signage, seams, markers, vegetation stems) carries the viewing
   player's world Theme. Time of day only scales emissive strength; it never
   changes a hue. There is no yellow, amber or orange anywhere in this file —
   the brightest light is blue energy pushed toward white.

   The Theme is LOCAL TO THE VIEWER: it recolours the environment's energy,
   never a resident (residents carry their own player's colour). */
import * as THREE from '../vendor/three/three.module.min.js';

export const THEMES = Object.freeze({
  canonical: { name: 'canonical', energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 },
  blue:      { name: 'blue',      energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 },
  red:       { name: 'red',       energy: 0xff5a6e, energyLight: 0xffd3da, energyDeep: 0xa5203a },
  purple:    { name: 'purple',    energy: 0xb07cff, energyLight: 0xeadfff, energyDeep: 0x5a2bb8 },
  green:     { name: 'green',     energy: 0x63e6a3, energyLight: 0xd8ffea, energyDeep: 0x1f8a55 },
  teal:      { name: 'teal',      energy: 0x5fe0e6, energyLight: 0xd6fbff, energyDeep: 0x1c7f86 }
});
export function resolveTheme(nameOrTheme) {
  if (nameOrTheme && typeof nameOrTheme === 'object' && nameOrTheme.energy) return nameOrTheme;
  return THEMES[String(nameOrTheme || 'canonical').toLowerCase()] || THEMES.canonical;
}

/* Fixed world neutrals (the architecture does not follow the Theme).
   v5: every value moved up a step out of near-black. MAHWORLD is a chromium civilization at
   night — its darks are dark METAL, which returns light, not black plastic which swallows it. */
export const NEUTRALS = Object.freeze({
  graphite: 0x2c3a50,      /* main building mass */
  graphiteDark: 0x1f2a3c,  /* recesses, undersides */
  graphiteLight: 0x3d4c68, /* aprons, sidewalks, sills */
  platinum: 0xa9b8cd,      /* bright metal catches */
  chromium: 0xdfe9f7,      /* mirror-grade chromium: focal trim and hero catches only */
  chromiumSatin: 0xbecddf, /* satin chromium: broad structural framing */
  platinumDark: 0x94a3ba,  /* brushed dark platinum: large secondary surfaces */
  panel: 0x2c3c58,         /* faceted crystalline wall panels */
  plaza: 0x090c12,         /* BLACK PLATINUM: the hero plaza ground (v8) */
  road: 0x0b0e14,          /* smooth roadway, the floor's darker sibling */
  glassTint: 0x2b3f60,
  interior: 0xffeccd,      /* interior light, WARM off-white (v8) */
  interiorPale: 0xfff6e4,  /* the palest warm interior, for deep rooms */
  interiorCool: 0xd7e8ff   /* the old cool white: signage wash and MAHGIC-lit interiors only */
});

/* THE PUNGENT ACCENT FAMILY (v8, art-directed).
   The world's darks became darker and its floor became black platinum, and the direction is that
   the buildings answer that with saturated primary and secondary colour. These are EMISSIVE accent
   hues, never surface paint: a facade's mass stays graphite and its LIGHT is what carries the hue.
   They are deliberately close to full saturation — "pungent" is the brief's word — and they are
   used sparingly and large: a signage band, a portal reveal, a full-height glazing wash. Scattered
   confetti of five colours would read as a games arcade, not a civilisation. */
export const ACCENT = Object.freeze({
  blue: 0x2f7bff,
  cyan: 0x22d3ee,
  violet: 0x8b5cf6,
  magenta: 0xe23bd0,
  green: 0x27d17c
});

/* Canvas helper shared by signage. */
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export function hex(n) { return '#' + ('000000' + (n >>> 0).toString(16)).slice(-6); }

/* ---- procedural surface information (v4): roughness / bump maps so large
   surfaces have physical variation without any texture asset ---------------- */
const TEX = {};
function seeded(seed) { let s = seed >>> 0 || 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
/* broad soft blotches + faint panel seams; mid grey so a material's roughness stays the average */
export function surfaceTexture(kind = 'floor', size = 512) {
  const key = kind + ':' + size; if (TEX[key]) return TEX[key];
  const t = canvasTexture(size, size, (c, w, h) => {
    /* three.js MULTIPLIES material.roughness by this map, so the map lives near white (≈0.86) and only
       varies ±12%: blotches a touch smoother, grout / seams rougher, traffic bands slightly smoother */
    const R = seeded(kind === 'floor' ? 11 : kind === 'wall' ? 23 : 37);
    c.fillStyle = '#dcdcdc'; c.fillRect(0, 0, w, h);
    const n = kind === 'floor' ? 60 : 36;
    for (let i = 0; i < n; i++) { const x = R() * w, y = R() * h, r = (0.06 + R() * 0.22) * w, v = 196 + Math.floor(R() * 40) - 20, a = 0.10 + R() * 0.22; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${v},${v},${v},${a})`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
    /* seams: floor = large slabs; wall = panel courses (rougher, i.e. lighter) */
    c.strokeStyle = 'rgba(250,250,250,0.7)'; c.lineWidth = kind === 'floor' ? 3 : 2;
    const step = kind === 'floor' ? w / 4 : w / 6;
    for (let i = 0; i <= (kind === 'floor' ? 4 : 6); i++) { const p = Math.round(i * step) + 0.5; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, h); c.stroke(); if (kind === 'floor' || i % 2 === 0) { c.beginPath(); c.moveTo(0, p); c.lineTo(w, p); c.stroke(); } }
    /* traffic softening near seams (floor only): a slightly smoother band */
    if (kind === 'floor') { c.strokeStyle = 'rgba(200,200,200,0.35)'; c.lineWidth = 18; for (let i = 0; i <= 4; i++) { const p = Math.round(i * step) + 0.5; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, h); c.stroke(); } }
  });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  TEX[key] = t; return t;
}
/* BRUSHED metal (v5): fine directional streaks. three.js multiplies material.roughness by this map, so it
   lives near white and varies along ONE axis only — the read of a brushed platinum panel without an
   anisotropy extension. `axis` 'v' streaks vertically (columns, masts), 'h' horizontally (spandrels, decks). */
export function brushTexture(axis = 'v', size = 256) {
  const key = 'brush:' + axis + ':' + size; if (TEX[key]) return TEX[key];
  const t = canvasTexture(size, size, (c, w, h) => {
    const R = seeded(axis === 'v' ? 5171 : 8231);
    c.fillStyle = '#d2d2d2'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) {
      const v = 176 + Math.floor(R() * 78), a = 0.05 + R() * 0.16, p = R() * (axis === 'v' ? w : h), thick = 0.5 + R() * 1.8;
      c.strokeStyle = `rgba(${v},${v},${v},${a})`; c.lineWidth = thick;
      c.beginPath();
      if (axis === 'v') { c.moveTo(p, 0); c.lineTo(p + (R() - 0.5) * 2, h); } else { c.moveTo(0, p); c.lineTo(w, p + (R() - 0.5) * 2); }
      c.stroke();
    }
  });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  TEX[key] = t; return t;
}
/* HERO CHROMIUM FLOOR (v5): the plaza's diamond field as a roughness map — architectural-scale diamond
   cells with a smoother polished centre and a rougher joint line, so a single flat plane still reads as a
   laid, jointed, super-polished chromium surface between the modelled bevels. */
export function diamondFloorTexture(size = 1024) {
  if (TEX.diamondFloor) return TEX.diamondFloor;
  const t = canvasTexture(size, size, (c, w, h) => {
    c.fillStyle = '#8a8a8a'; c.fillRect(0, 0, w, h);          /* base: already polished (roughness × 0.54) */
    c.save(); c.translate(w / 2, h / 2); c.rotate(Math.PI / 4); c.translate(-w / 2, -h / 2);
    const cell = size / 4;
    /* each diamond cell: a smoother polished centre falling off toward its joints */
    for (let r = -2; r <= 5; r++) for (let q = -2; q <= 5; q++) {
      const x = q * cell + cell / 2, y = r * cell + cell / 2;
      const g = c.createRadialGradient(x, y, 0, x, y, cell * 0.62);
      g.addColorStop(0, 'rgba(86,86,86,0.85)'); g.addColorStop(0.7, 'rgba(120,120,120,0.35)'); g.addColorStop(1, 'rgba(150,150,150,0)');
      c.fillStyle = g; c.fillRect(x - cell * 0.62, y - cell * 0.62, cell * 1.24, cell * 1.24);
    }
    /* the joints: a rougher line where two cells meet, and a brighter hairline in the middle of it */
    c.strokeStyle = 'rgba(226,226,226,0.85)'; c.lineWidth = Math.max(2, size / 220);
    for (let i = -2; i <= 6; i++) {
      const p = i * cell;
      c.beginPath(); c.moveTo(p, -size); c.lineTo(p, 2 * size); c.stroke();
      c.beginPath(); c.moveTo(-size, p); c.lineTo(2 * size, p); c.stroke();
    }
    c.restore();
  });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
  TEX.diamondFloor = t; return t;
}
/* soft radial blob: contact / hover shadows and light pools */
export function blobTexture() {
  if (TEX.blob) return TEX.blob;
  const t = canvasTexture(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  TEX.blob = t; return t;
}

/* ---- geometry helpers (v4): chamfered boxes and instanced window grids ---- */
/* A box with CHAMFERED front/back edges (c wide) — the cheapest way to give light a place to live on
   trims, frames, steps, rails and platforms. Centred at the origin; ~28 triangles. */
export function chamferBox(w, h, d, c = 0.04) {
  c = Math.max(0.001, Math.min(c, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const s = new THREE.Shape(); const x = -(w / 2 - c), y = -(h / 2 - c), W = w - 2 * c, H = h - 2 * c;
  s.moveTo(x, y); s.lineTo(x + W, y); s.lineTo(x + W, y + H); s.lineTo(x, y + H); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * c, bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -(d - 2 * c) / 2);
  g.computeVertexNormals();
  return g;
}
/* One mesh for a facade of recessed window cells: InstancedMesh of thin boxes with per-window brightness
   (instance colour × material colour). `material` should be an unlit MeshBasicMaterial (windows glow),
   or a dark MeshStandardMaterial for unlit recesses. Local origin at the grid centre, cells in the XY plane facing +Z. */
export function windowGrid({ cols = 8, rows = 6, cellW = 1.2, cellH = 1.6, gapX = 0.5, gapY = 0.6, depth = 0.08, onFraction = 0.55, seed = 1, material = null, tint = 0xc4d6f0, dimTint = 0x1c2838 }) {
  const mat = material || new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
  const geo = new THREE.BoxGeometry(cellW, cellH, depth);
  const mesh = new THREE.InstancedMesh(geo, mat, cols * rows);
  const R = seeded(seed * 977 + 13), m4 = new THREE.Matrix4(), col = new THREE.Color(), on = new THREE.Color(tint), off = new THREE.Color(dimTint);
  const totalW = cols * cellW + (cols - 1) * gapX, totalH = rows * cellH + (rows - 1) * gapY;
  let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    m4.makeTranslation(-totalW / 2 + cellW / 2 + c * (cellW + gapX), -totalH / 2 + cellH / 2 + r * (cellH + gapY), 0);
    mesh.setMatrixAt(i, m4);
    /* lit windows: a wide spread of brightness and a slight cool/neutral drift, so a facade never reads
       as a uniform grid of identical white dots (brief §08) */
    const lit = R() < onFraction; col.copy(lit ? on : off);
    if (lit) { col.multiplyScalar(0.22 + R() * R() * 0.95); if (R() < 0.3) col.lerp(new THREE.Color(0x9fc0f0), 0.35); }
    mesh.setColorAt(i, col); i++;
  }
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.userData.windows = { cols, rows, totalW, totalH };
  return mesh;
}

export function createMaterials(themeIn) {
  const theme = resolveTheme(themeIn);
  const floorTex = surfaceTexture('floor'), wallTex = surfaceTexture('wall');
  const brushV = brushTexture('v'), brushH = brushTexture('h'), diamondTex = diamondFloorTexture();
  const m = {
    theme,
    /* ================= v5 CHROMIUM FINISH GRADES ==========================================
       MAHWORLD is built from chromium and dark platinum. A finish is a ROUGHNESS, not a hue:
       every grade below is the same cool neutral metal read at a different polish, so the
       world stays one civilization instead of five materials. The grades are ranked by how
       much of the world may wear them — mirror is rare, graphite is everywhere.

         chromeMirror     0.03  focal trim, hero catches, floor bevels, portal frames
         chromeSatin      0.17  broad structural framing, masts, rails, receivers
         platinumBrushed  0.34  large secondary architectural surfaces (directional streaks)
         graphiteMetal    0.52  structural depth, building mass, the dark that holds the light
         crystalGlass     0.06  windows and light-transmitting sections
       ===================================================================================== */
    /* ORIENTATION, NOT HUE, is what decides whether a platinum surface reads.
       A metal takes no diffuse light: a metalness-1.0 surface is lit ONLY by what it reflects. A
       VERTICAL or TILTED face reflects the horizon band, which is the brightest thing in this world's
       environment — so mirror and satin grades belong there, on mast shafts, mullions, portal frames,
       blade faces, apron nosings and cell chamfers. A HORIZONTAL cap facing a night sky reflects the
       ZENITH, which is almost black, so the same hex renders black no matter how bright it looks in
       the source. Every horizontal cap therefore uses `platinumLit` — a LOW-metalness platinum that
       takes diffuse light from the hemisphere and reads at something near its own value. */
    chromeMirror: new THREE.MeshStandardMaterial({ color: 0xdfe9f7, roughness: 0.03, metalness: 1.0, envMapIntensity: 2.7 }),
    chromeSatin: new THREE.MeshStandardMaterial({ color: 0xbecddf, roughness: 0.17, metalness: 1.0, envMapIntensity: 2.1 }),
    /* THE HORIZONTAL GRADE. Low metalness on purpose — this is the world's platinum FRAMING, and it is
       the single material that makes canopies, terraces, aprons, path bands, collars and rims read. */
    platinumLit: new THREE.MeshStandardMaterial({ color: 0xb6c4d6, roughness: 0.3, metalness: 0.38, envMapIntensity: 1.4 }),
    platinumLitBrushed: new THREE.MeshStandardMaterial({ color: 0xacbacc, roughness: 0.36, metalness: 0.4, roughnessMap: brushH, envMapIntensity: 1.3 }),
    /* ---- v11 PAVING: THE WALKING SURFACE IS PART OF THE BLACK FLOOR ------------------------------
       Direction: "I want the reflective floor almost pitch black."

       The hero deck was already black platinum, and it was not the surface anyone was looking at.
       A peel at the canonical low camera measured the bright foreground at lum 159; hiding the whole
       `ground` group only took it to 139, while hiding `plaza-dressing` took it to 27. The paths —
       and ground.js's own apron slab — were wearing platinumLitBrushed, a LIT platinum at 0xacbacc,
       so the plaza's actual walking surface was one of the palest things in the world while the
       black platinum sat underneath it doing nothing for the read.

       This grade keeps that material's OPTICS exactly — roughness, metalness 0.4, the horizontal
       brush map — and only takes the albedo to near-black. Metalness stays LOW on purpose and must
       not be raised: paving is a horizontal plane, and LAW 1 (a metal takes no diffuse light, and an
       up-facing high-metalness face reflects the near-black zenith) is why the bright grade was
       chosen here in the first place. Black albedo at low metalness still takes the lamps and the
       hemisphere, so a path is still legible as a path — it is simply legible by its FINISH and its
       reflections rather than by being pale.

       platinumLitBrushed itself is untouched: buildings.js uses it for the gym canopy top and the
       market terrace decks, which are architecture and should stay bright. */
    paving: new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.34, metalness: 0.40, roughnessMap: brushH, envMapIntensity: 1.3 }),
    platinumBrushed: new THREE.MeshStandardMaterial({ color: 0x94a3ba, roughness: 0.34, metalness: 0.96, roughnessMap: brushV, envMapIntensity: 1.7 }),
    graphiteMetal: new THREE.MeshStandardMaterial({ color: 0x2c3a4e, roughness: 0.52, metalness: 0.9, roughnessMap: wallTex, envMapIntensity: 1.5 }),
    /* THE MISSING RUNG (v7, brief §02). Measured across the whole palette: the building masses sit at
       luminance 49-58 (structural 49, graphite 55, panel 58) and the platinum family at 183-232
       (platinum 183, platinumLit 194, chromeMirror 232). Nothing lived in between, so every elevation
       could only be a navy mass wearing hairline highlights — which is exactly the "black/navy
       dominance" this brief is trying to leave behind. Lightening the masses would have flattened the
       world; what was missing was a platinum grade broad enough to CARRY a primary elevation.

       platinumMid is that grade, at luminance 142 — a true midtone, not a lightened navy: it is on the
       platinum's own cool axis, so a pilaster, a spandrel course or a corner turn cut from it belongs
       to the same metal as the mirror catches above it. High metalness, and therefore for VERTICAL and
       TILTED faces only: a vertical face reflects the bright horizon band of the environment, which is
       what makes this read. platinumMidLit is its horizontal partner at low metalness, for the caps,
       sills and soffits of the same framing — a horizontal mirror faces the near-black zenith and
       renders black, which is the single most expensive mistake this palette has already made once. */
    platinumMid: new THREE.MeshStandardMaterial({ color: 0x7e90ae, roughness: 0.24, metalness: 0.94, envMapIntensity: 1.85 }),
    platinumMidBrushed: new THREE.MeshStandardMaterial({ color: 0x7688a6, roughness: 0.32, metalness: 0.92, roughnessMap: brushV, envMapIntensity: 1.7 }),
    platinumMidLit: new THREE.MeshStandardMaterial({ color: 0x8b9cb8, roughness: 0.34, metalness: 0.4, envMapIntensity: 1.35 }),
    crystalGlass: new THREE.MeshPhysicalMaterial({ color: 0x2b3f60, roughness: 0.06, metalness: 0.22, transparent: true, opacity: 0.42, side: THREE.DoubleSide, envMapIntensity: 2.0 }),
    /* v5 midtone pass (brief §04): the neutrals move up out of near-black. The world stays a NIGHT world —
       what changed is that its darks are now dark METAL that returns light, not black plastic. */
    graphite: new THREE.MeshStandardMaterial({ color: 0x2c3a50, roughness: 0.42, metalness: 0.62, roughnessMap: wallTex, envMapIntensity: 1.5 }),
    graphiteDark: new THREE.MeshStandardMaterial({ color: 0x1f2a3c, roughness: 0.52, metalness: 0.5, envMapIntensity: 1.25 }),
    graphiteLight: new THREE.MeshStandardMaterial({ color: 0x3d4c68, roughness: 0.46, metalness: 0.46, roughnessMap: floorTex, envMapIntensity: 1.35 }),
    platinum: new THREE.MeshStandardMaterial({ color: 0xa9b8cd, roughness: 0.2, metalness: 0.98, envMapIntensity: 2.0 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x2c3c58, roughness: 0.24, metalness: 0.66, flatShading: true, envMapIntensity: 1.7 }),
    /* the physical family — the same dark world, differentiated by roughness and metalness, not by colour */
    structural: new THREE.MeshStandardMaterial({ color: 0x27354a, roughness: 0.5, metalness: 0.9, roughnessMap: wallTex, envMapIntensity: 1.55 }),   /* dark structural metal: broad muted highlight */
    composite: new THREE.MeshStandardMaterial({ color: 0x33435e, roughness: 0.3, metalness: 0.62, roughnessMap: brushH, envMapIntensity: 1.6 }),     /* brushed platinum composite */
    /* mirror / satin catches (brief §03): the same language as Mr. Mah's edge catches — these read as
       bright turns of the surface under moonlight and city glow, never as an outline */
    /* `trim` / `trimSatin` / `platinumBrushedH` / `glass` were four materials indistinguishable from
       four others (differing by 1–2 per channel), which made the ranked ladder unreadable. They are
       ALIASES now: same object, one value each, and every existing call site keeps working. */
    curb: new THREE.MeshStandardMaterial({ color: 0x1c2434, roughness: 0.58, metalness: 0.34, envMapIntensity: 1.2 }),          /* raised edges, kerbs, steps. v11: 0x4a5a76 measured lum 149 beside a deck at 25-68 — with the paving taken to black the kerbs became the brightest thing at floor level, and a kerb is floor furniture, not architecture. Darkened to sit just above the paving so an edge still reads as an edge. */
    arena: new THREE.MeshStandardMaterial({ color: 0x1d2129, roughness: 0.86, metalness: 0.06 }),                               /* rubberised impact floor */
    panelLit: new THREE.MeshStandardMaterial({ color: 0x24304a, roughness: 0.4, metalness: 0.2, emissive: 0xcfe0ff, emissiveIntensity: 0.7 }),   /* illuminated panel, restrained */
    /* THE HERO SURFACE — BLACK PLATINUM (v8, art-directed).
       The direction is "black platinum with extreme shine, contrasted with the pungent colour of the
       buildings", and the three reference frames all show the same thing: a near-black floor that is
       almost entirely REFLECTION. So the base colour drops from 0x18202e to 0x090c12 and the
       roughness from 0.54 to 0.055 — the single biggest change in this pass. A metal at roughness
       0.055 returns a sharp, near-mirror image of everything above it, which is what turns every sign
       band, window and resident in the world into a second copy of itself on the ground. The floor
       stops being a surface with a colour and becomes the instrument the rest of the city is read in.
       The diamond field stays as the roughness and bump map, so the polish is JOINTED — a laid floor
       of enormous black slabs, not one poured mirror — and the joints catch the light differently
       from the faces, which is what keeps it crystalline rather than glassy. */
    /* v10 §07: UNCHANGED, deliberately. This material was the prime suspect for the pale grazing
       sheet that ran through the middle distance of every view, and it is not the cause: at 78 m the
       deck read lum 128, and at runtime envMapIntensity 2.6 -> 0, roughness 0.055 -> 0.15 and
       metalness 0.98 -> 0 each moved that pixel by two counts or fewer. The fix is the fresnel
       darkening in mahplaza.js's plaza shader patch, which took it to 69. Do not re-tune the numbers
       here to chase floor brightness — it has now been measured three times that they do not
       control it. */
    plaza: new THREE.MeshStandardMaterial({ color: 0x04060a, roughness: 0.055, metalness: 0.98, envMapIntensity: 2.6, roughnessMap: diamondTex, bumpMap: diamondTex, bumpScale: 0.010, transparent: true, opacity: 0.94 }),
    road: new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.14, metalness: 0.9, roughnessMap: floorTex, envMapIntensity: 1.9 }),

    /* INTERIOR LIGHT IS WARM NOW (v8, art-directed).
       "Most of the windows should have yellow or an off-white light faintly coming out." That is a
       deliberate reversal: MAHWORLD's interiors were cool white, which made every lit window agree
       with the signage and flattened the whole city into one blue. Warm interiors do the opposite —
       they read as PEOPLE inside, they separate a lit room from a lit sign at a glance, and they are
       what the cold blue accents now contrast against. `interiorCool` survives for the places where
       the light genuinely is MAHGIC rather than domestic: signage washes and energy-lit interiors. */
    interior: new THREE.MeshBasicMaterial({ color: NEUTRALS.interior, toneMapped: true }),
    interiorPale: new THREE.MeshBasicMaterial({ color: NEUTRALS.interiorPale, toneMapped: true }),
    interiorCool: new THREE.MeshBasicMaterial({ color: NEUTRALS.interiorCool, toneMapped: true }),
    /* the soft spill behind a window: warm, translucent, and the thing that makes a lit room read as
       having depth rather than being a bright rectangle */
    interiorSoft: new THREE.MeshBasicMaterial({ color: 0xf2d9a8, transparent: true, opacity: 0.5 }),
    interiorSoftCool: new THREE.MeshBasicMaterial({ color: 0x8fb4e6, transparent: true, opacity: 0.5 }),
    /* ================= GLASS SHARDS, WITH REAL REFRACTION (v9, art-directed) ==================
       "Create these glass shard looking elements all across the buildings and some of the floor",
       and "actually incorporate physics of light refraction".

       THIS IS THE ONE PLACE IN MAHWORLD THAT BENDS LIGHT. Everything else that looks like glass —
       crystalGlass, the curtain-wall panes, the crystal crowns — is a transparent SURFACE: it lets
       colour through unchanged. A shard is a SOLID with an interior. `transmission` makes three
       render the scene behind it into a buffer and refract the sample through `ior` and `thickness`,
       so what you see through a shard is genuinely displaced, and `dispersion` splits that
       displacement per channel, which is where the fringe of colour along a thick edge comes from.

       THE COST IS REAL AND IS WHY THERE ARE THREE GRADES. A transmissive material triggers an extra
       scene pass. With the plaza's planar mirror already costing a second pass, a world where every
       pane refracted would render itself three times over. So:
         shardHero    true refraction with dispersion. For the FEW — a monument, a portal, a handful
                      of large architectural shards the camera comes close to.
         shardClear   transmission with no dispersion and a thinner wall. The MIDDLE — cheaper per
                      pixel, still genuinely refracting.
         shardFacet   NO transmission. A faceted crystal that fakes it with a low roughness, a strong
                      environment and a clearcoat. For the MANY — the shards scattered across facades
                      and inlaid in the floor, where displacement would never be legible anyway.
       A builder that reaches for shardHero more than a few times per scene has misread this. */
    shardHero: new THREE.MeshPhysicalMaterial({
      color: 0xdfe9f7, metalness: 0, roughness: 0.045, transmission: 1, ior: 1.62, thickness: 1.6,
      dispersion: 2.2, attenuationColor: new THREE.Color(0x9fc4ef), attenuationDistance: 3.4,
      clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, envMapIntensity: 2.4, flatShading: true
    }),
    shardClear: new THREE.MeshPhysicalMaterial({
      color: 0xd6e6fb, metalness: 0, roughness: 0.075, transmission: 0.92, ior: 1.48, thickness: 0.75,
      attenuationColor: new THREE.Color(0x8fb4e6), attenuationDistance: 2.2,
      clearcoat: 0.9, clearcoatRoughness: 0.06, side: THREE.DoubleSide, envMapIntensity: 2.1, flatShading: true
    }),
    shardFacet: new THREE.MeshPhysicalMaterial({
      color: 0x9fc0e8, metalness: 0.12, roughness: 0.11, transparent: true, opacity: 0.55,
      clearcoat: 1, clearcoatRoughness: 0.05, ior: 1.45, side: THREE.DoubleSide,
      envMapIntensity: 2.6, flatShading: true
    }),
    /* THE PUNGENT ACCENTS. Emissive only — a facade's MASS never takes these, its LIGHT does. */
    accentBlue: new THREE.MeshStandardMaterial({ color: 0x060a14, emissive: ACCENT.blue, emissiveIntensity: 1.45, roughness: 0.5, metalness: 0 }),
    accentCyan: new THREE.MeshStandardMaterial({ color: 0x03121a, emissive: ACCENT.cyan, emissiveIntensity: 1.35, roughness: 0.5, metalness: 0 }),
    accentViolet: new THREE.MeshStandardMaterial({ color: 0x0c0718, emissive: ACCENT.violet, emissiveIntensity: 1.40, roughness: 0.5, metalness: 0 }),
    accentMagenta: new THREE.MeshStandardMaterial({ color: 0x150618, emissive: ACCENT.magenta, emissiveIntensity: 1.30, roughness: 0.5, metalness: 0 }),
    accentGreen: new THREE.MeshStandardMaterial({ color: 0x04140c, emissive: ACCENT.green, emissiveIntensity: 1.30, roughness: 0.5, metalness: 0 }),
    /* ENERGY — the Theme. Strengths were lowered in the v3 slice (glare correction):
       readable seams and signs, no bloom-like wash */
    energy: new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: theme.energy, emissiveIntensity: 1.3, roughness: 0.5, metalness: 0 }),
    energyLight: new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: theme.energyLight, emissiveIntensity: 1.7, roughness: 0.5, metalness: 0 }),
    energySoft: new THREE.MeshBasicMaterial({ color: theme.energy, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false }),
    signage: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }),   /* map set per sign */
    /* MAH MATCH competitive accent — the one place red is allowed as a world colour */
    matchRed: new THREE.MeshStandardMaterial({ color: 0x140a0e, emissive: 0xff3b57, emissiveIntensity: 1.1, roughness: 0.5, metalness: 0 })
  };
  /* the aliases: one object per value, so nothing in the scene can drift apart by two channels */
  m.trim = m.chromeMirror;
  m.trimSatin = m.chromeSatin;
  m.platinumBrushedH = m.platinumLitBrushed;
  m.glass = m.crystalGlass;
  const ACCENTS = ['accentBlue', 'accentCyan', 'accentViolet', 'accentMagenta', 'accentGreen'];
  const baseEmissive = { energy: 1.3, energyLight: 1.7, matchRed: 1.1, panelLit: 0.7, accentBlue: 1.45, accentCyan: 1.35, accentViolet: 1.40, accentMagenta: 1.30, accentGreen: 1.30 };
  const baseOpacity = { energySoft: 0.26, interiorSoft: 0.5, interiorSoftCool: 0.5, shardFacet: 0.55 };
  /* the shards are a QUALITY LEVER as well as a material family: true refraction costs an extra
     scene pass, so a low tier drops the two transmissive grades onto the faceted one rather than
     dropping the shards themselves. The architecture keeps its glass; only the physics gets cheaper. */
  m.setShardQuality = function (tier) {
    const on = tier !== 'low';
    m.shardHero.transmission = on ? 1 : 0;
    m.shardHero.dispersion = tier === 'high' ? 2.2 : 0;
    m.shardClear.transmission = on ? 0.92 : 0;
    m.shardHero.opacity = on ? 1 : 0.6; m.shardHero.transparent = !on;
    m.shardClear.opacity = on ? 1 : 0.6; m.shardClear.transparent = !on;
    m.shardHero.needsUpdate = true; m.shardClear.needsUpdate = true;
    return tier;
  };
  m.interiorSoft.opacity = baseOpacity.interiorSoft;
  let lastState = null, diagnostic = false;
  /* Time of day scales light strength only. day = 0.3, night = 1. */
  m.setTime = function (state) {
    lastState = state;
    const d = state && typeof state.daylight === 'number' ? state.daylight : 0;
    const k = (1 - d * 0.7) * (diagnostic ? 0.6 : 1);
    m.energy.emissiveIntensity = Math.min(diagnostic ? 1 : 9, baseEmissive.energy * k);
    m.energyLight.emissiveIntensity = Math.min(diagnostic ? 1 : 9, baseEmissive.energyLight * k);
    m.matchRed.emissiveIntensity = Math.min(diagnostic ? 1 : 9, baseEmissive.matchRed * k);
    m.panelLit.emissiveIntensity = Math.min(diagnostic ? 0.6 : 9, baseEmissive.panelLit * (1 - d * 0.5));
    m.energySoft.opacity = diagnostic ? 0 : baseOpacity.energySoft * k;
    m.interiorSoft.opacity = baseOpacity.interiorSoft * (1 - d * 0.5);
    m.interiorSoftCool.opacity = baseOpacity.interiorSoftCool * (1 - d * 0.5);
    /* the three interior whites dim together: a lit room is still lit at noon, just not against
       a black sky, and a room that stayed at night strength by day reads as a light box */
    m.interior.color.setHex(NEUTRALS.interior).multiplyScalar(1 - d * 0.35);
    m.interiorPale.color.setHex(NEUTRALS.interiorPale).multiplyScalar(1 - d * 0.35);
    m.interiorCool.color.setHex(NEUTRALS.interiorCool).multiplyScalar(1 - d * 0.35);
    for (const a of ACCENTS) m[a].emissiveIntensity = Math.min(diagnostic ? 1 : 9, baseEmissive[a] * k);
    m.signage.color.setScalar(1 - d * 0.25);
  };
  /* Live world-Theme change: recolours the ENERGY materials only. Neutrals,
     glass, the interior whites and MAH MATCH's red never follow the Theme, and
     nothing here can reach a resident (residents own their materials). */
  m.retheme = function (themeIn) {
    const t = resolveTheme(themeIn); m.theme = t;
    m.energy.emissive.setHex(t.energy); m.energyLight.emissive.setHex(t.energyLight); m.energySoft.color.setHex(t.energy);
    return t;
  };
  /* Diagnostic view: additive glow off, emissive capped at 1.0, so what remains
     is geometry and direct light. Used for the reduced-glare proof. */
  m.setDiagnostic = function (on) { diagnostic = !!on; m.setTime(lastState); return diagnostic; };
  m.dispose = function () { Object.keys(m).forEach(k => { if (m[k] && m[k].isMaterial) m[k].dispose(); }); };
  return m;
}

/* ================= CANONICAL MAH BRANDING (v6 §17–§19) ==============================================

   The brief requires that any world text containing "MAH" use the branding language ALREADY PRESENT IN
   THE APP, and forbids approximating it from memory where the real styling exists in source. It was
   read out of the source, and this is what it says:

     FACE          Space Grotesk everywhere — fob.css:17 `--display`, :25 `--body` ("one face
                   sitewide"), mahfitt-canonical-components.css:6 `--mf-ui-font`. Already the face
                   mahplaza.html loads.
     WEIGHT        canonical MAH text runs 500–800, but NO page in the repository ever loads an 800
                   master, so an 800 request has always been a synthesised faux-bold. mahplaza.html
                   loads 400/500/700; titles take 700, sub-lines 500.
     TRACKING      the rule is TIGHT TITLE against WIDE SUB-LINE, and it holds in the CSS and in the
                   wordmark asset alike: titles .055em–.10em (mygym.css:4312 .08em, :4794 .055em;
                   fob.css:3617 .085em), eyebrows and sub-lines .16em–.42em (mygym.css:4311 .2em,
                   :4793 .19em; music-studio.css:692 .16em; fob.css:3975 .42em). Measured off
                   images/mahfitt-mark-gold.png the same ratio appears: wordmark ~0.04–0.08em,
                   sub-line ~0.32–0.40em.
     CENTRING      a tracked line is always paired with an equal text-indent so it stays optically
                   centred (fob.css:3975, :4086) — trailing letter-space is compensated, never left.
     CASE          uppercase, always, and enforced in CSS rather than only in the copy. Sentence case
                   is never used for a MAH name.

     COLOUR — AND THE ONE DEPARTURE. The canonical identity colour is champagne gold #E9C98F: every
     opaque pixel of images/mahfitt-mark-gold.png is exactly that value, and it is declared four times
     across the app as --bright / --gold-bright / --cal-accent. MAHWORLD's light law forbids it —
     LAW-001 rejects any hue 28–75° above 0.35 saturation, and #E9C98F is hue 38.7° at 0.67. Most of
     the cream family fails the same test. Both concept images render MAH GYM / MAH MATCH / MAH MARKET
     in cool white, and REFERENCE_MANIFEST.md already recorded this decision in v3. So the world takes
     every canonical property EXCEPT the hue, in the one cream value that passes (#EFEAE0, the colour
     every MAH title takes in gym-app.css:19), with the accent on the sub-line. If the light law is
     ever relaxed for signage, BRAND.gold below is the only line that has to change.

   The MAHFITT WORDMARK ITSELF is not set in type at all — it is a raster asset in a bespoke chamfered
   letterform, and fob.css:4038 instructs "use the existing exact gold FOB/SYSTEMS artwork rather than
   reconstructing the letters in CSS". Nothing here reconstructs it. These are facility names. */
export const BRAND = Object.freeze({
  face: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
  titleWeight: 700,          /* loaded; 800 was a faux-bold of a master that does not exist */
  subWeight: 500,
  titleTracking: 0.08,       /* em — tight, per mygym.css:4312 */
  subTracking: 0.30,         /* em — wide, per the wordmark asset's own sub-line */
  title: '#EFEAE0',          /* gym-app.css:19 --cream, the colour every MAH title takes */
  sub: '#BFD6F2',            /* the accent role, in the world's blue-white instead of the app's gold */
  gold: '#E9C98F'            /* canonical, and forbidden in-world by LAW-001. Kept here as the record. */
});

/* A signage texture in the canonical MAH language: a wordmark, an optional sub-line and, when `mark`
   is set, a RESERVED MARK SLOT above the name — an empty square-diamond outline (accepted MAHFITT
   geometry, see REFERENCE_MANIFEST.md). No pictogram is drawn: the concept sheet's dumbbell / fist /
   cart icons are not verified FOB or MAHFITT marks, so nothing is invented in their place. */
export function signTexture({ title, sub, mark = false, w = 2048, h = 768, titleSize = 190, subSize = 60 }) {
  return canvasTexture(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let y = h * 0.6;
    if (mark) {
      const cx = w / 2, cy = h * 0.27, s = h * 0.15;
      g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4);
      g.lineWidth = 9; g.strokeStyle = 'rgba(232,242,255,0.92)'; g.strokeRect(-s, -s, 2 * s, 2 * s);
      g.lineWidth = 4; g.strokeStyle = 'rgba(232,242,255,0.5)'; g.strokeRect(-s * 0.72, -s * 0.72, 1.44 * s, 1.44 * s);
      g.restore();
      y = h * 0.7;
    }
    g.fillStyle = BRAND.title;
    g.font = `${BRAND.titleWeight} ${titleSize}px ${BRAND.face}`;
    spaced(g, title, w / 2, y, titleSize * BRAND.titleTracking);
    if (sub) {
      g.fillStyle = BRAND.sub;
      g.font = `${BRAND.subWeight} ${subSize}px ${BRAND.face}`;
      spaced(g, sub, w / 2, y + titleSize * 0.78, subSize * BRAND.subTracking);
    }
  });
}
function hexToRgba(n, a) { return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
/* The canonical centring rule: tracking adds a trailing space after the last glyph, so the app always
   pairs `letter-spacing: Xem` with `text-indent: Xem` to put it back (fob.css:3975, :4086-4087). The
   canvas equivalent is to measure the run WITHOUT the trailing gap, which is what this does. */
function spaced(g, text, cx, y, gap) {
  let total = 0; for (const ch of text) total += g.measureText(ch).width + gap; total -= gap;
  let x = cx - total / 2; const align = g.textAlign; g.textAlign = 'left';
  for (const ch of text) { g.fillText(ch, x, y); x += g.measureText(ch).width + gap; }
  g.textAlign = align;
}

/* Geometry helpers shared by the built environment. */
export function roundedBoxShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = 0;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
/* A softened mass: width X, height Y (from y=0 up), depth Z (front face at z=0, body toward −z). */
export function softMass(w, h, d, radius = 1.2, bevel = 0.35) {
  const g = new THREE.ExtrudeGeometry(roundedBoxShape(w, h, radius), { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -d - bevel);
  return g;
}
/* A square-diamond outline (four thin bars) in the XZ plane, for ground markers and boundaries. */
export function diamondOutline(size, bar, mat, thickness = 0.02) {
  const grp = new THREE.Group(); const half = size / 2;
  const geo = new THREE.BoxGeometry(size, thickness, bar);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(geo, mat); const a = i * Math.PI / 2;
    seg.position.set(Math.cos(a) * half, 0, Math.sin(a) * half); seg.rotation.y = -a + Math.PI / 2;
    grp.add(seg);
  }
  grp.rotation.y = Math.PI / 4;
  return grp;
}

/* THE CANONICAL MAHFITT MARK, rebuilt as geometry rather than approximated.
   MEASURED off images/mahfitt-mark-gold.png, which is the identity asset already in this repository,
   so none of this is invented: in a 1130 x 652 image the mark occupies one ink band at y 221-327 and
   resolves into exactly three column runs —
     a solid DIAMOND          x 725-839, y 221-327   (115 x 107, widest row dead centre)
     a left double CHEVRON    x 608-692, y 248-301   (85 x 54)
     a right double CHEVRON   x 872-961, y 248-303   (90 x 56)
   which gives the proportions this builder uses: the chevrons stand at 0.50 of the diamond's height,
   the gap between a chevron group and the diamond is 0.29 of the diamond's width, and the whole mark
   spans 3.08 diamond-widths. The chevrons point INWARD at the diamond from both sides.

   The mark is built in the XY plane facing +Z so it mounts on a sign face, and it is returned as ONE
   merged geometry per depth so a sign costs one draw call for its mark, not seven.

   ON COLOUR: the canonical mark is champagne gold #E9C98F, and MAHWORLD's own light law LAW-001
   forbids that hue (38.7 deg at 0.67 saturation). The mark therefore takes every canonical property
   EXCEPT the hue, the same departure already recorded for the wordmark; the caller supplies the
   material, and BRAND.gold is kept above as the record if that law is ever relaxed. */
export function fobMark(size = 1, depth = 0.06) {
  /* size is the DIAMOND's width; everything else is a measured ratio of it */
  const dW = size, dH = size * (107 / 115);
  const cH = dH * (54 / 107), cW = size * (87 / 115) * 0.5;   /* each group is two chevrons */
  const gap = size * (33 / 115);
  const parts = [];
  const push = (shape, x, y) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: depth * 0.22, bevelSegments: 1 });
    g.translate(x, y, -depth / 2); parts.push(g);
  };
  const diamond = new THREE.Shape();
  diamond.moveTo(0, dH / 2); diamond.lineTo(dW / 2, 0); diamond.lineTo(0, -dH / 2); diamond.lineTo(-dW / 2, 0); diamond.closePath();
  push(diamond, 0, 0);
  /* one chevron: a solid triangle with its point toward the diamond, so the pair reads as << and >> */
  for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
    const ch = new THREE.Shape();
    ch.moveTo(side * cW * 0.5, cH / 2); ch.lineTo(-side * cW * 0.5, 0); ch.lineTo(side * cW * 0.5, -cH / 2); ch.closePath();
    push(ch, side * (dW / 2 + gap + cW * (0.5 + k * 0.99)), 0);   /* 0.99 puts the group at 0.757 of the diamond's width and the whole mark at 3.08, both measured */
  }
  const merged = mergeGeometries(parts);
  parts.forEach(g => g.dispose());
  return merged;
}

/* Minimal position/normal merge for the mark — BufferGeometryUtils is an addon and this module
   vendors nothing but three's core. Every input is a non-indexed ExtrudeGeometry of the same
   attributes, so concatenating them is the whole job. */
function mergeGeometries(list) {
  const flat = list.map(g => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of flat) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  let o = 0;
  for (const g of flat) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nrm.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.computeBoundingSphere();
  return out;
}
