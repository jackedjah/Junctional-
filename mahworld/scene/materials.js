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
/* ---- LAW 1, APPLIED PER FRAGMENT INSTEAD OF PER MATERIAL --------------------------------------

   The world's platinum has been one compromise number for its whole life, and the compromise is
   visible in every render: metalness 0.38.

   It is a compromise because ONE merged bucket carries both kinds of surface. A HORIZONTAL cap
   faces the near-black zenith, and a metal takes no diffuse light, so a high-metalness cap renders
   BLACK — that is LAW 1, and it is why `platinumLit` exists at 0.38 rather than at 1.0. But a
   VERTICAL face sees the bright horizon band, which is the only place platinum reads as metal at
   all, and §07 says platinum is FOR verticals and edges. At 0.38 the caps are right and the
   verticals are wrong: a mast shaft keeps 90% of a pale Lambert term and reads as grey plastic.

   The two cases want opposite numbers and they are in the same draw call. But the merged geometry
   already carries a correct world normal, so the split costs no material, no bucket, no draw call,
   no attribute and no texture — only the arithmetic below.

     albedo 0xb6c4d6 = linear (0.478, 0.556, 0.685)
     diffuse = albedo * (1 - metalness):  0.38 -> (0.296,0.345,0.425)   a strong pale Lambert
                                          0.94 -> (0.029,0.033,0.041)   a 10.3x drop
     F0      = mix(0.04, albedo, metal):  0.38 -> (0.206,0.236,0.285)
                                          0.94 -> (0.452,0.525,0.646)   a 2.2x rise

   So a shaft loses 90% of its flat term and gains 120% of its horizon catch — dark metal with a
   bright turn, which is the language materials.js has described in prose since v5 without ever
   implementing it.

   AND THE CHAMFERS ARE THE POINT. chamferBox bevels are 45°, so abs(nY) = 0.707 on a top bevel;
   smoothstep(0.55, 0.92, 0.707) = 0.387, giving metalness 0.71 and roughness 0.29 on every bevel in
   the world. chamferBox's own comment calls a bevel "the cheapest way to give light a place to
   live", and until now the light had nowhere to live once it got there.

   The break-up is the other half of the complaint. This family carries NO roughness map, so every
   merged body shares one perfectly uniform finish — which is what "no micro-variation" means in
   channel terms. Two octaves in world space at 0.92 m and 4.30 m, ±0.075: at r 0.22 ± 0.075 the GGX
   lobe half-width (0.644·α) swings from 0.0135 to 0.0567 rad, a 4.2x change across a metre of mast.
   That is drawn metal rather than a painted cylinder. */
export function applyPlatinumFinish(material, opts = {}) {
  const u = {
    /* x = metalness horizontal (LAW 1: stays diffuse-lit, or the cap renders black)
       y = metalness vertical   (§07: platinum is FOR verticals; lit by the horizon band)
       z = roughness horizontal, w = roughness vertical */
    uPlatMR: {
      value: new THREE.Vector4(
        opts.mFlat != null ? opts.mFlat : 0.34, opts.mEdge != null ? opts.mEdge : 0.94,
        opts.rFlat != null ? opts.rFlat : 0.40, opts.rEdge != null ? opts.rEdge : 0.22)
    },
    uPlatBreak: { value: opts.breakUp != null ? opts.breakUp : 0.075 }
  };
  material.userData.platUniforms = u;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = 'varying vec3 vPlatW;\nvarying vec3 vPlatN;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 platW = vec4( transformed, 1.0 ); vec3 platN = objectNormal;
      #ifdef USE_INSTANCING
        platW = instanceMatrix * platW; platN = mat3( instanceMatrix ) * platN;
      #endif
      platW = modelMatrix * platW;
      vPlatW = platW.xyz; vPlatN = normalize( mat3( modelMatrix ) * platN );`);
    shader.fragmentShader =
      'varying vec3 vPlatW;\nvarying vec3 vPlatN;\nuniform vec4 uPlatMR;\nuniform float uPlatBreak;\n'
      + shader.fragmentShader
        /* roughnessmap_fragment runs BEFORE metalnessmap_fragment in r185's meshphysical_frag, and
           each chunk appears exactly once, so both writes land and neither is overwritten. */
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      float platUp = smoothstep( 0.55, 0.92, abs( vPlatN.y ) );
      {
        vec3 bp = vPlatW;
        float b = sin( bp.x * 6.83 ) * sin( bp.y * 6.83 + 1.3 ) * sin( bp.z * 6.83 - 0.7 ) * 0.60
                + sin( bp.x * 1.461 + 2.2 ) * sin( bp.z * 1.461 ) * 0.40;
        roughnessFactor = clamp( mix( uPlatMR.w, uPlatMR.z, platUp ) + b * uPlatBreak, 0.06, 1.0 );
      }`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      metalnessFactor = mix( uPlatMR.y, uPlatMR.x, smoothstep( 0.55, 0.92, abs( vPlatN.y ) ) );`);
  };
  /* three caches compiled programs by material signature; two platinums with different splits are
     different programs and must say so, or the second one silently wears the first one's shader. */
  material.customProgramCacheKey = () => 'plat|' + u.uPlatMR.value.toArray().join(',') + '|' + u.uPlatBreak.value;
  material.needsUpdate = true;
  return material;
}

/* ================================================================================================
   THE CLOUD LOBE — THE WORLD'S ONE CLOUD GENOME.

   It lives here rather than in mah-rain.js because MAHWORLD has two cloud systems and R6 §5 has
   one rule for both. halo-threshold.js built its shelf out of THREE CROSSED BILLBOARD QUADS per
   mass — two vertical at ninety degrees plus a horizontal — and crossed planes seen obliquely are
   a star by construction. That is the "random shard silhouette" §5 forbids by name, and it cost
   six rounds of blaming the OTHER cloud system before a raycast named the object: 202 of 364 rays
   over the frame that showed it hit halo-threshold-cloud, not a crystal cloud at all.

   A crystal cloud is not a sphere with a soft texture on it and it is not a
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
export function cloudLobeGeometry(detail) {
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

/* ================================================================================================
   R167 §5 — THE APERTURE KIT, and why the window grid had to go.

   windowGrid() above tiles a facade with cols x rows identical boxes. It is cheap and it was right
   for a city read from 400 m, but at approach and street range it is the single loudest thing
   saying "generated": every opening the same size, the same spacing, the same brightness class,
   wrapped around every mass. R167 names it directly — square-window repetition is no longer the
   premium language.

   WHAT REPLACES IT IS NOT A DIFFERENT TILE. Rounding the corners of forty-eight rectangles, or
   swapping them for forty-eight diamonds, is the same defect wearing a costume. What makes the
   reference interiors read as expensive is the OPPOSITE of tiling: a small number of large,
   deliberately placed openings with broad unbroken wall between them. The wall is the luxury. The
   glass is only where someone decided there should be a view.

   So this builds a COMPOSED FIELD, not a grid:
     - typically three to seven apertures on a facade instead of forty-eight cells;
     - placed on a deterministic golden walk with an enforced minimum gap, then rejected if they
       would break the solid-wall budget, so openings never drift into a row;
     - every family cut from ONE shared profile, instance-scaled — so the whole kit is two draw
       calls per facade and FEWER triangles than the grid it replaces.

   THE PROFILE is the MAHWORLD signature and it is one shape: a plate whose head arches and whose
   sides taper inward slightly toward the top. Scaled tall and narrow it is a tapered slit; scaled
   wide it is a panoramic opening; scaled long and low it is a ribbon. The taper is built into the
   outline rather than applied per instance, because a non-uniform scale cannot taper anything —
   and it is what stops the family reading as a stretched rectangle at any size.
   ============================================================================================== */

export const APERTURE = Object.freeze({
  /* AN APERTURE IS A FRACTION OF ITS WALL, NOT A FIXED NUMBER OF METRES.
     The first cut wrote these as absolute sizes — a 9 m panoramic, a 1.5 x 8.2 m slit — and then
     required 1.6 m of margin at every edge and 2.4 m of wall between neighbours. On the wide test
     facades that composed beautifully. On the world's actual building piers, which measure three
     and a half to eight metres across, every candidate fell outside the legal area and the field
     placed NOTHING: MAH GYM came back with zero openings on both piers. A blank wall is a worse
     failure than the grid it replaced, and only building it and counting found it.

     So a family is now a PROPORTION with clamps. A slit is a third of its wall wide whatever wall
     it is given; the margins and the minimum gap scale with the surface too. The same table now
     serves a 3.5 m pier and a 48 m civic elevation without either one being a special case. */
  PANORAMIC: { wf: 0.72, hf: 0.34, wMin: 2.2, wMax: 11.0, hMin: 1.6, hMax: 5.2, max: 2, tag: 'panoramic' },
  TAPERED:   { wf: 0.30, hf: 0.42, wMin: 0.7, wMax: 2.6,  hMin: 2.0, hMax: 9.0, max: 4, tag: 'tapered' },
  ARCH:      { wf: 0.46, hf: 0.40, wMin: 1.4, wMax: 5.0,  hMin: 1.8, hMax: 6.0, max: 1, tag: 'arch' },
  RIBBON:    { wf: 0.82, hf: 0.16, wMin: 3.0, wMax: 16.0, hMin: 0.8, hMax: 2.6, max: 2, tag: 'ribbon' },
  PORTAL:    { wf: 0.40, hf: 0.50, wMin: 1.6, wMax: 6.0,  hMin: 2.2, hMax: 7.0, max: 1, tag: 'portal' },
  MAX_GLASS_FRACTION: 0.30,
  GAP_FRACTION: 0.14,        /* wall between openings, as a fraction of the smaller wall dimension */
  GAP_MIN: 0.7, GAP_MAX: 3.0,
  EDGE_FRACTION: 0.10, EDGE_MIN: 0.45, EDGE_MAX: 2.0
});

/* THE OPENING OUTLINE, at any size. One routine, because the doorway kit needs the same line at a
   real width and height rather than as a unit square scaled non-uniformly — a taper survives a
   uniform scale and is destroyed by an anisotropic one. Writes into a THREE.Shape or a THREE.Path,
   which is what lets the same line serve as an outline and as the hole inside it. */
function archOutline(P, hw, hh) {
  const tw = hw * 0.84;                 /* the taper: the head is 84% of the sill width */
  const shoulder = hh * 0.42;
  P.moveTo(-hw, -hh);
  P.lineTo(hw, -hh);
  P.lineTo(hw * 0.985, shoulder);       /* the sides lean in as they rise */
  /* the arched head — one quadratic per side, meeting at the crown. This is the line the reference
     frames all share: not a semicircle sitting on a rectangle, but a continuous shoulder. */
  P.quadraticCurveTo(tw * 1.02, hh * 0.93, 0, hh);
  P.quadraticCurveTo(-tw * 1.02, hh * 0.93, -hw * 0.985, shoulder);
  P.lineTo(-hw, -hh);
  return P;
}

let _apertureProfile = null;
/* ONE geometry for the whole kit. Unit height, unit width, thin in Z, origin at the centre. */
function apertureGeometry() {
  if (_apertureProfile) return _apertureProfile;
  const S = archOutline(new THREE.Shape(), 0.5, 0.5);
  const g = new THREE.ExtrudeGeometry(S, { depth: 1, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -0.5);
  _apertureProfile = g;
  return g;
}

/* Compose the openings for one facade. Deterministic, and it REFUSES rather than crowds: an
   aperture that cannot find a place with MIN_GAP of wall around it is simply not placed, which is
   why the results have holes in them instead of rows. */
export function composeApertures({ W, H, families, seed = 1, sillY = 3.0 }) {
  const clamp = (v, lo, hi) => v < lo ? lo : (v > hi ? hi : v);
  const R = seeded(seed * 1291 + 7);
  const edge = clamp(Math.min(W, H) * APERTURE.EDGE_FRACTION, APERTURE.EDGE_MIN, APERTURE.EDGE_MAX);
  const gap = clamp(Math.min(W, H) * APERTURE.GAP_FRACTION, APERTURE.GAP_MIN, APERTURE.GAP_MAX);
  const sill = Math.min(sillY, H * 0.22);          /* a short wall cannot afford a tall sill */
  const head = Math.max(sill + 0.6, H - edge);
  const placed = [], area = Math.max(1, W * H);
  let glassArea = 0;
  const fits = (x, y, w, h) => {
    if (x - w / 2 < edge || x + w / 2 > W - edge) return false;
    if (y - h / 2 < sill || y + h / 2 > head) return false;
    for (const q of placed) {
      const gx = Math.abs(x - q.x) - (w + q.w) / 2, gy = Math.abs(y - q.y) - (h + q.h) / 2;
      if (gx < gap && gy < gap) return false;
    }
    return true;
  };
  for (const fam of families) {
    const F = APERTURE[fam]; if (!F) continue;
    const want = 1 + Math.floor(R() * F.max);
    for (let i = 0; i < want; i++) {
      const w = clamp(F.wf * W, F.wMin, F.wMax) * (0.86 + R() * 0.28);
      const h = clamp(F.hf * H, F.hMin, F.hMax) * (0.88 + R() * 0.24);
      if (w > W - 2 * edge || h > head - sill) continue;      /* will not fit this wall at all */
      if (glassArea + w * h > area * APERTURE.MAX_GLASS_FRACTION) break;
      /* sample INSIDE the legal rectangle rather than across the whole wall — the previous version
         sampled 0..W and threw away nearly every candidate on a narrow pier */
      const xLo = edge + w / 2, xHi = W - edge - w / 2;
      const yLo = sill + h / 2, yHi = head - h / 2;
      let ok = false;
      for (let t = 0; t < 12 && !ok; t++) {
        const u = ((seed * 0.6180339887 + i * 0.7548776662 + t * 0.3819660113) % 1);
        const v = ((i * 0.6180339887 + t * 0.2360679775 + seed * 0.1149) % 1);
        const x = xLo + u * Math.max(0, xHi - xLo);
        const y = yLo + v * Math.max(0, yHi - yLo);
        if (fits(x, y, w, h)) { placed.push({ x, y, w, h, fam: F.tag }); glassArea += w * h; ok = true; }
      }
    }
  }
  return { placed, glassFraction: +(glassArea / area).toFixed(3) };
}

/* Build the facade's openings as TWO instanced meshes: the glass, and the sculpted reveal that
   frames it. Local origin at the facade centre, openings in XY facing +Z — the same convention
   windowGrid() used, so a caller swaps one for the other without moving anything. */
export function apertureField({ W, H, families = ['TAPERED'], seed = 1, sillY = 3.0,
                                glassMaterial = null, frameMaterial = null, depth = 0.55 }) {
  const comp = composeApertures({ W, H, families, seed, sillY });
  const group = new THREE.Group();
  group.name = 'aperture-field';
  if (!comp.placed.length) { group.userData.apertures = comp; return group; }

  const geo = apertureGeometry();
  const gMat = glassMaterial || new THREE.MeshBasicMaterial({ color: 0x9fc0f0, toneMapped: true });
  const fMat = frameMaterial || new THREE.MeshStandardMaterial({ color: 0xb6c4d6, roughness: 0.3, metalness: 0.42 });
  const glass = new THREE.InstancedMesh(geo, gMat, comp.placed.length);
  const frame = new THREE.InstancedMesh(geo, fMat, comp.placed.length);
  glass.name = 'aperture-glass'; frame.name = 'aperture-frame';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  const pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const R = seeded(seed * 31 + 5);
  comp.placed.forEach((a, i) => {
    /* the FRAME sits proud of the wall and is slightly larger all round: that lip is the whole
       reason the opening reads as sculpted rather than cut with scissors */
    pos.set(a.x - W / 2, a.y - H / 2, depth * 0.30);
    sc.set(a.w + 0.9, a.h + 0.9, depth);
    frame.setMatrixAt(i, m4.compose(pos, q, sc));
    /* the GLASS sits back inside it — the recess is what gives a facade depth at grazing angles */
    pos.set(a.x - W / 2, a.y - H / 2, -depth * 0.42);
    sc.set(a.w, a.h, depth * 0.5);
    glass.setMatrixAt(i, m4.compose(pos, q, sc));
    /* brightness varies per opening, but far less than the grid's did: these are rooms, not pixels */
    const v = 0.55 + R() * 0.45;
    glass.setColorAt(i, col.setRGB(v * 0.82, v * 0.90, v));
  });
  glass.instanceMatrix.needsUpdate = true; frame.instanceMatrix.needsUpdate = true;
  if (glass.instanceColor) glass.instanceColor.needsUpdate = true;
  group.add(frame); group.add(glass);
  group.userData.apertures = comp;
  return group;
}

/* ==============================================================================================
   R167 §D — THE DOORWAY KIT, and why a door is not a small window.

   WHAT THE WORLD ACTUALLY HAD, counted before anything was written. Twenty-three masses stand on
   ground a player can walk on. THREE of them had anything at ground level that reads as a way in
   — MAH GYM, MAH MARKET, MAH MATCH — and all three got the same gesture from the same function.
   The fifteen city blocks had ZERO. Their lowest opening sat at exactly 3.0 m on every single
   block, because the aperture field starts at a sill and a sill is above head height. So the
   street read as a row of plinths, and there was no hierarchy to refine: there was one tier and
   twenty blank walls.

   THE HIERARCHY IS A SCALING RULE, NOT A DECORATION BUDGET. This is the part worth stating,
   because it is what makes the three tiers legible instead of merely different:

     TIER 1 (LOCAL) is ABSOLUTE.     3.2 m to the head on a 20 m block and 3.2 m on a 70 m tower.
     TIER 2 (FACILITY) is HINGED.    A fixed core plus a small fraction of the wall.
     TIER 3 (LANDMARK) is PROPORTIONAL. It grows with the mass it is cut into.

   That is how a real street tells you which door is yours. A human-sized opening in a large wall
   says "this is an entrance for one person at a time"; an opening that scales with the building
   says "this is the way into somewhere". The player never reads the table — they read the fact
   that the door beside them is the same size as them, and the one across the plaza is not.

   AND THE LIGHT FOLLOWS THE SAME LADDER, low to high, because "do not put a giant glowing
   doorway on every building" is the whole risk here:

     TIER 1  a lit line at the SILL only. A doorstep. Visible at 20 m, gone at 150 m.
     TIER 2  a lit line across the HEAD, plus a projecting canopy. Reads from a block away.
     TIER 3  head, jambs, threshold and a pool on the floor — which portal() in buildings.js
             already builds, and keeps building. This kit sizes it; it does not replace it.

   The reveal and the leaf are cut from apertureGeometry() — the SAME tapered arch the windows
   use. One opening profile for the whole world at five sizes is what makes a facade read as one
   building; a separate door shape would have been a second language on the same wall (L42).

   Returns GEOMETRIES BY ROLE, not a Group, because every caller here merges. city.js pushes them
   straight into the block's existing platinum/composite/strip buckets, so fifteen doorways cost
   no draw call at all.

   WHERE THE CALLER PUTS IT. Local origin is the centre of the sill, +Z out of the wall, and the
   surround's front face is at z = 0 with the reveal tunnelling back to z = -reveal. There is no
   CSG in this renderer, so the recess is made by standing the surround OUT rather than by cutting
   the mass: place the origin one `reveal` in front of whatever solid the door belongs to — the
   plinth face on a city block, the wall plane on a facility — and the tunnel is real depth over a
   real surface. `spec.reveal` is on the returned spec so the caller can do that without knowing
   the tier.
   ============================================================================================== */
export const DOORWAY = Object.freeze({
  /* w/h are the absolute core; wf/hf the fraction of the wall added on top. lip is how far the
     surround stands proud, reveal how deep the opening cuts, sillOut how far the step projects. */
  LOCAL:    Object.freeze({ tier: 1, w: 2.8, h: 3.2, wf: 0.00, hf: 0.000, reveal: 0.42, lip: 0.26, mullions: 1, head: 0,    canopy: 0,   sill: 0.13, sillOut: 0.60, glow: 'sill' }),
  FACILITY: Object.freeze({ tier: 2, w: 4.6, h: 5.0, wf: 0.05, hf: 0.030, reveal: 0.95, lip: 0.50, mullions: 2, head: 0.30, canopy: 2.1, sill: 0.18, sillOut: 1.25, glow: 'head' }),
  LANDMARK: Object.freeze({ tier: 3, w: 7.0, h: 7.0, wf: 0.20, hf: 0.150, reveal: 1.80, lip: 0.85, mullions: 0, head: 0.58, canopy: 0,   sill: 0.24, sillOut: 2.10, glow: 'full' }),
  /* a doorway never eats its wall: past these fractions it stops being a door and becomes a gap */
  W_MAX_FRACTION: 0.52,
  H_MAX_FRACTION: 0.60
});

/* The size this tier takes on this wall. Exported on its own because callers that only need to
   know how much wall a door will occupy — an aperture field deciding where its sill starts —
   must not have to build the geometry to find out. */
export function doorwaySpec(kind, wallW, wallH, headroom = Infinity) {
  const D = DOORWAY[kind] || DOORWAY.LOCAL;
  const w = Math.min(D.w + D.wf * wallW, wallW * DOORWAY.W_MAX_FRACTION);
  /* HEADROOM is what stands ABOVE the doorway on this particular elevation, and it is a hard cap
     rather than a preference: on a city block the glazing begins at 3.0 m, and a 3.2 m door with a
     0.26 m lip over it would have driven its surround straight through the bottom row of windows.
     The lip is subtracted here, once, so no caller has to remember that the surround is taller
     than the opening it surrounds. */
  let h = Math.min(D.h + D.hf * wallH, wallH * DOORWAY.H_MAX_FRACTION);
  if (isFinite(headroom)) h = Math.min(h, headroom - D.lip);
  return { kind, tier: D.tier, w, h, reveal: D.reveal, lip: D.lip, mullions: D.mullions,
           head: D.head, canopy: D.canopy, sill: D.sill, sillOut: D.sillOut, glow: D.glow };
}

export function doorwayParts(kind, wallW, wallH, headroom = Infinity) {
  const S = doorwaySpec(kind, wallW, wallH, headroom);
  const out = { spec: S, reveal: [], leaf: [], sill: [], glow: [], canopy: [] };
  if (S.w < 1.4 || S.h < 2.2) return out;                 /* the wall is too small to take a door */

  /* THE SURROUND IS A RING, NOT A SLAB, and getting that wrong is worth the paragraph.
     The first cut reused the aperture trick: a solid arch standing slightly proud with a smaller
     solid arch behind it. On a window that reads correctly, because the glass covers the middle
     and the frame only shows as a lip. On a doorway standing PROUD OF THE PLINTH it does not,
     because there is no wall in front of the leaf to hide it — and the render showed exactly that:
     a platinum tombstone leaning against each block, with the dark leaf buried out of sight behind
     the plinth. Nothing had been cut, and only looking at it found that.

     So the surround is an extruded RING: the arch outline with the same outline inset by `lip` as
     a hole. The extrusion generates the walls of that hole for free, and those walls ARE the jambs
     of the reveal — the tunnel a player sees into. One geometry gives the lip, both jambs, the
     soffit and the depth, and because it is built at the door's real width and height the taper is
     the authored line rather than an anisotropically stretched one. */
  const hw = S.w / 2, hh = S.h / 2;
  const ring = new THREE.Shape();
  archOutline(ring, hw + S.lip, hh + S.lip * 0.5);
  ring.holes.push(archOutline(new THREE.Path(), hw, hh));
  const surround = new THREE.ExtrudeGeometry(ring, { depth: S.reveal, bevelEnabled: false, curveSegments: 8 });
  surround.translate(0, hh + S.lip * 0.5, -S.reveal);      /* the front face lands on the wall plane */
  out.reveal.push(surround);

  /* THE LEAF, set at the BACK of the reveal so the ring reads as depth rather than as trim. Dark:
     at tier 1 a doorway is a shadow with a lit step, and a bright panel here is exactly the
     "glowing doorway on every building" the brief rules out.
     It is deep enough to reach the wall behind it. A caller stands this whole assembly one reveal
     forward of whatever solid it is cut into (there is no CSG here — the recess is made by standing
     the surround out, not by subtracting from the mass), which leaves a gap behind the leaf that a
     thin panel would show at a grazing angle. */
  const leafShape = archOutline(new THREE.Shape(), hw - 0.04, hh - 0.04);
  const leaf = new THREE.ExtrudeGeometry(leafShape, { depth: S.reveal + 0.5, bevelEnabled: false, curveSegments: 8 });
  leaf.translate(0, hh, -S.reveal * 2 - 0.47);
  out.leaf.push(leaf);
  /* the mullions that divide it into leaves, standing IN the reveal in front of the leaf — which is
     what gives a doorway its human-scale reading: two leaves means two people wide.
     A mullion runs to the LINE OF THE ARCH ABOVE IT, not to a fixed height: the first cut stopped
     every one of them 0.30 m short, and under a curved head that left the centre post hanging in
     the opening with a visible cut end — the render showed a floating bar before anything else.
     The outline's own height at this x is what it has to meet, so it is evaluated here. */
  for (let m = 1; m <= S.mullions; m++) {
    const x = -hw + (m * S.w) / (S.mullions + 1);
    const u = Math.min(1, Math.abs(x) / hw);
    /* the arch height at x, from the same shoulder-and-crown line archOutline draws */
    const top = hh * (u < 0.42 ? 1 - 0.14 * (u / 0.42) * (u / 0.42) : 0.86 - 0.44 * ((u - 0.42) / 0.58));
    const mh = hh + top - 0.06;
    out.reveal.push(chamferBox(0.11, mh, 0.14, 0.03).translate(x, mh / 2, -S.reveal * 0.45));
  }
  /* THE SILL: a step at the ground plane, wider than the reveal and projecting out onto the
     pavement. It is the piece that reads from above, so it takes the lit-cap grade. */
  out.sill.push(chamferBox(S.w + 2 * S.lip + 0.35, S.sill, S.sillOut, 0.04)
    .translate(0, S.sill / 2, S.sillOut / 2 - 0.05));
  /* THE LIGHT, on the ladder above. One thin line at tier 1, at the step. */
  if (S.glow === 'sill' || S.glow === 'full') {
    out.glow.push(chamferBox(S.w - 0.20, 0.075, 0.14, 0.025)
      .translate(0, S.sill + 0.05, S.sillOut - 0.10));
  }
  /* a line across the head at tier 2 and above, set INSIDE the reveal so it lights the way in
     rather than the wall — the same argument portal() makes about a brow under a lintel */
  /* AT THE SPRING LINE, not under the crown. Tucked against the head it was a bar 5 m wide sitting
     at a height the arch only reaches in the middle, so its outer two thirds were buried in the
     masonry either side and the render showed almost nothing. The spring line is where the arch
     leaves the jamb, it is the full width of the opening there, and a lit band across it is a
     transom — the thing that actually says "an entrance, not a hole". */
  if (S.head > 0) {
    out.glow.push(chamferBox(S.w - 0.24, S.head, 0.22, 0.05)
      .translate(0, hh * 1.42, -S.reveal + 0.10));
  }
  /* THE CANOPY at tier 2: the one part that projects into the street, and the reason a facility
     entrance is findable from a block away when its light is not yet resolvable. */
  if (S.canopy > 0) {
    out.canopy.push(chamferBox(S.w + 2 * S.lip + 1.5, 0.30, S.canopy, 0.08)
      .translate(0, S.h + 0.42, S.canopy / 2 - 0.1));
    for (const sd of [-1, 1]) out.reveal.push(chamferBox(0.16, 0.62, S.canopy * 0.78, 0.04)
      .translate(sd * (S.w / 2 + S.lip + 0.55), S.h + 0.04, S.canopy * 0.40));
  }
  return out;
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
