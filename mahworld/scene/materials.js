/* MAHPLAZA :: MATERIALS + THEMES

   One place for the world's surface language so every module agrees:
   graphite / dark platinum architecture, faceted crystalline panels, cool
   glass, and ENERGY (signage, seams, markers, vegetation stems) in the
   viewing player's world Theme. Time of day only scales emissive strength;
   it never changes a hue. There is no yellow, amber or orange anywhere in
   this file — the brightest light is blue energy pushed toward white.

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

/* Fixed world neutrals (the architecture does not follow the Theme). */
export const NEUTRALS = Object.freeze({
  graphite: 0x1b2433,      /* main building mass */
  graphiteDark: 0x121a27,  /* recesses, undersides */
  graphiteLight: 0x2a3549, /* aprons, sidewalks, sills */
  platinum: 0x9aa7bb,      /* bright metal catches */
  panel: 0x22304a,         /* faceted crystalline wall panels */
  plaza: 0x0f1521,         /* polished plaza ground */
  road: 0x0c1119,          /* smooth roadway */
  glassTint: 0x1c2c48,
  interior: 0xd7e8ff       /* interior light, cool white */
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
    const lit = R() < onFraction; col.copy(lit ? on : off); if (lit) col.multiplyScalar(0.42 + R() * 0.5);   /* lit windows: a spread of brightness, none blown out */
    mesh.setColorAt(i, col); i++;
  }
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.userData.windows = { cols, rows, totalW, totalH };
  return mesh;
}

export function createMaterials(themeIn) {
  const theme = resolveTheme(themeIn);
  const floorTex = surfaceTexture('floor'), wallTex = surfaceTexture('wall');
  const m = {
    theme,
    graphite: new THREE.MeshStandardMaterial({ color: NEUTRALS.graphite, roughness: 0.52, metalness: 0.3, roughnessMap: wallTex }),
    graphiteDark: new THREE.MeshStandardMaterial({ color: NEUTRALS.graphiteDark, roughness: 0.62, metalness: 0.25 }),
    graphiteLight: new THREE.MeshStandardMaterial({ color: NEUTRALS.graphiteLight, roughness: 0.58, metalness: 0.22, roughnessMap: floorTex }),
    platinum: new THREE.MeshStandardMaterial({ color: NEUTRALS.platinum, roughness: 0.26, metalness: 0.9 }),
    panel: new THREE.MeshStandardMaterial({ color: NEUTRALS.panel, roughness: 0.34, metalness: 0.5, flatShading: true }),
    /* the v4 physical family — the same dark world, differentiated by roughness and metalness, not by colour */
    structural: new THREE.MeshStandardMaterial({ color: 0x151b26, roughness: 0.64, metalness: 0.82, roughnessMap: wallTex }),   /* dark structural metal: broad muted highlight */
    composite: new THREE.MeshStandardMaterial({ color: 0x1d2636, roughness: 0.4, metalness: 0.36 }),                            /* satin graphite composite */
    trim: new THREE.MeshStandardMaterial({ color: 0x9aa7bb, roughness: 0.16, metalness: 0.96 }),                                /* polished architectural trim */
    trimSatin: new THREE.MeshStandardMaterial({ color: 0x8593a8, roughness: 0.36, metalness: 0.9 }),                            /* brushed / satin trim */
    curb: new THREE.MeshStandardMaterial({ color: 0x38445a, roughness: 0.72, metalness: 0.12 }),                                /* raised edges, kerbs, steps */
    arena: new THREE.MeshStandardMaterial({ color: 0x171a21, roughness: 0.88, metalness: 0.04 }),                               /* rubberised impact floor */
    panelLit: new THREE.MeshStandardMaterial({ color: 0x1a2436, roughness: 0.5, metalness: 0.1, emissive: 0xcfe0ff, emissiveIntensity: 0.7 }),   /* illuminated panel, restrained */
    plaza: new THREE.MeshStandardMaterial({ color: 0x0b1019, roughness: 0.56, metalness: 0.22, envMapIntensity: 0.3, roughnessMap: floorTex, bumpMap: floorTex, bumpScale: 0.003, transparent: true, opacity: 0.9 }),
    road: new THREE.MeshStandardMaterial({ color: NEUTRALS.road, roughness: 0.5, metalness: 0.28, roughnessMap: floorTex }),
    glass: new THREE.MeshPhysicalMaterial({ color: NEUTRALS.glassTint, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.4, side: THREE.DoubleSide, envMapIntensity: 1.3 }),
    /* interior light: unlit cool white, dimmed by day */
    interior: new THREE.MeshBasicMaterial({ color: NEUTRALS.interior, toneMapped: true }),
    interiorSoft: new THREE.MeshBasicMaterial({ color: 0x8fb4e6, transparent: true, opacity: 0.5 }),
    /* ENERGY — the Theme. Strengths were lowered in the v3 slice (glare correction):
       readable seams and signs, no bloom-like wash */
    energy: new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: theme.energy, emissiveIntensity: 1.3, roughness: 0.5, metalness: 0 }),
    energyLight: new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: theme.energyLight, emissiveIntensity: 1.7, roughness: 0.5, metalness: 0 }),
    energySoft: new THREE.MeshBasicMaterial({ color: theme.energy, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false }),
    signage: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }),   /* map set per sign */
    /* MAH MATCH competitive accent — the one place red is allowed as a world colour */
    matchRed: new THREE.MeshStandardMaterial({ color: 0x140a0e, emissive: 0xff3b57, emissiveIntensity: 1.1, roughness: 0.5, metalness: 0 })
  };
  const baseEmissive = { energy: 1.3, energyLight: 1.7, matchRed: 1.1, panelLit: 0.7 };
  const baseOpacity = { energySoft: 0.26, interiorSoft: 0.5 };
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
    m.interior.color.setHex(NEUTRALS.interior).multiplyScalar(1 - d * 0.35);
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

/* A signage texture: a wordmark, an optional small sub-line and, when `mark`
   is set, a RESERVED MARK SLOT above the name — an empty square-diamond outline
   (accepted MAHFITT geometry, see REFERENCE_MANIFEST.md). No pictogram is drawn:
   the concept sheet's dumbbell / fist / cart icons are not verified FOB or
   MAHFITT marks, so nothing is invented in their place. Cool white on transparent. */
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
    g.fillStyle = 'rgba(236,244,255,0.98)';
    g.font = `800 ${titleSize}px "Space Grotesk", "Helvetica Neue", Arial, sans-serif`;
    spaced(g, title, w / 2, y, titleSize * 0.08);
    if (sub) {
      g.fillStyle = hexToRgba(0xbfe3ff, 0.9);
      g.font = `600 ${subSize}px "Space Grotesk", "Helvetica Neue", Arial, sans-serif`;
      spaced(g, sub, w / 2, y + titleSize * 0.78, subSize * 0.34);
    }
  });
}
function hexToRgba(n, a) { return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
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
