/* MAHWORLD :: MAH HALO — the upper sanctuary, and the surface it is
   ============================================================================================

   R4 makes MAH HALO permanent canon and opens with the sentence the whole file has to earn:

       "MAH HALO is a first-class world layer, not a decorative top platform."

   and the shape of it:

       "LOCALLY FLAT - GLOBALLY CURVED. At MAHBEING scale it reads essentially flat and
        comfortable. Across immense distance the grid gradually bends away and reveals a colossal
        halo/concave world surface. Never make it feel like a small spherical room."

   ---- WHY IT IS A RING AND NOT A DISC ----------------------------------------------------------
   The obvious build is a vast plate over the world. It fails on one thing and the failure is fatal:
   it puts a ceiling over MAHWORLD'S NIGHT SKY. The moon is "a principal of the composition", the
   galaxy band and the star field are hand-placed, and a disc at this altitude erases all of them
   from every ground camera in the world — the establishing shot included.

   A HALO IS A RING. That is what the word means, and it is also the answer: the hole is over the
   plaza, so from the ground you look straight up into open sky, and the ring arcs across the middle
   band of the sky in every direction. Measured from the world origin it occupies elevations 28° to
   69°; the zenith is open above it and the low sky is open below it, and sky.js's moon sits at
   17–27° — under the outer rim, still visible. Nothing is lost and the world gains a colossal
   luminous arc overhead.

   ---- THE TWO CURVATURES, AND WHICH ONE IS "GLOBAL" --------------------------------------------
   R4's curvature proof is a list of distances, so the geometry was chosen against it numerically:

       look    50 m along the ring  ->  it bends  1.4°, deviating   0.15 m from straight   FLAT
       look   150 m                 ->            4.2°,             1.37 m                 FLAT
       look   300 m                 ->            8.4°,             5.49 m                 COMFORTABLE
       look  1000 m                 ->           27.9°,            60.67 m                 ARCING
       look  3000 m                 ->           83.9°,           524.73 m                 A SHELL

   So THE RING'S OWN ARC IS THE GLOBAL CURVATURE. It is a halo: locally a flat strip, and at
   kilometre scale it visibly bends away and closes overhead. The supplied curvature reference is a
   grid that makes a surface's bend legible, and that is exactly the job the tile grid does here.

   The SECOND curvature is the cross-section. The ring dishes: flat along its midline at r 2050,
   rising 39.6 m to each rim over 1350 m. That is a 5.87% grade at its steepest — a walkable ramp,
   never a wall — and it does three things at once. It gives the "concave world surface" R4 asks
   for, it makes the ring read as a channel rather than a flat band, and the rise at both rims is an
   ANALYTIC GUARD RAIL: you cannot wander off a 2700 m wide ring 1800 m up, because its edges curl.
   No collision system, no fence.

   ---- WHY 1800 m -------------------------------------------------------------------------------
   Measured, not chosen. The tallest things already in this world are city.js's ghost shafts at
   900 m, its shafts at 720, clouds.js's high deck at 560 and terrain.js's far peaks at 660. The
   halo clears every one of them by more than 930 m at the radius each stands at. It is also 1100 m
   above mahascent's arrival decks at 700 — which is the point: R4 calls that deck "the tiny top
   platform" and asks for it to be replaced, so the ascent now has a real journey left to make.

   ---- THE LASER-PLATED TILE GENOME -------------------------------------------------------------
   The three laser references contribute one thing between them: THIN PRECISE LUMINOUS LINES
   EMBEDDED THROUGH A REFLECTIVE PHYSICAL SURFACE. Not neon tubes laid on top — lines that are IN
   the stone. R4 says so and forbids the palettes: "do not inherit their red/rainbow palettes".

   So the grid is a SHADER, not geometry, and it is injected into a real MeshStandardMaterial rather
   than replacing it. That choice is the whole design:

     · the surface keeps its PBR shading, so LAW 1 still governs it — the tile field is a metal and
       it takes its value from what it reflects, exactly like every other surface in this world;
     · a line costs no triangle, so MICRO/STANDARD/MEGA scales are free and a 2700 m ring can carry
       a 1 m grid without a geometry budget;
     · the lines are anti-aliased with fwidth and FADE OUT as they approach a pixel wide, which is
       the only way to satisfy R4's "lines do not shimmer" — a geometric line at 3 km is aliasing,
       and no amount of care in the mesh fixes it.

   ---- WHAT THIS FILE OWNS AND WHAT IT DOES NOT -------------------------------------------------
   This file owns THE SURFACE: the analytic shell, the shell mesh, the tile shader, the near-field
   physical tiles, the rims, and the walking contract roam.js needs. The eight districts, the social
   and event infrastructure and the arrival docking are halo-districts.js, because a file that owns
   both a surface and a city is a file nobody can review.

   buildHalo(ctx) -> the standard module contract, plus surfaceAt/onHalo for roam and the districts. */

import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox } from './materials.js';

const TAU = Math.PI * 2;

/* ================================================================================================
   THE SURFACE CONTRACT. Everything about where the halo IS lives here, is pure, and is exported —
   roam.js walks on it, halo-districts.js builds on it, and the law suite asserts against it. One
   source decides where the halo is (L42, applied before it can bite).
   ================================================================================================ */
export const HALO = Object.freeze({
  Y: 1800,               /* the midline altitude: clears the 900 m ghosts by 930 m */
  R_IN: 700,             /* inner rim — the hole, so the plaza keeps its sky */
  R_OUT: 3400,           /* outer rim */
  R_MID: 2050,           /* (R_IN + R_OUT) / 2 — the flat midline the ring is walked along */
  R_DISH: 23000,         /* cross-section curvature: 39.6 m of rise at each rim, 5.87% at worst */
  APRON: 34,             /* the lip beyond each rim: an analytic guard rail, no fence needed */
  THICK: 16,             /* the slab is a WORLD LAYER and a world layer has mass */
  TILE: 8,               /* STANDARD grid: the walking tile */
  MICRO: 1,              /* MICRO grid: premium interiors and close reading */
  MEGA: 64,              /* MEGA grid: district organisation, and the only scale that survives 3 km */
  NEAR_TILES: 26,        /* the physical near field is NEAR_TILES^2 slabs following the viewer */
  CEIL: 2600             /* roam's ceiling must clear the halo or it cannot be flown to */
});

/* the cross-section: distance from the midline decides the rise. Pure, and the ONLY definition. */
export function haloHeight(x, z) {
  const d = Math.hypot(x, z);
  const u = d - HALO.R_MID;
  return HALO.Y + (u * u) / (2 * HALO.R_DISH);
}
/* is this point on the walkable ring? The apron is included on purpose — it is the curl that keeps
   a walker on, and a surface that ends exactly at the rim would drop them off it. */
export function onHalo(x, z) {
  const d = Math.hypot(x, z);
  return d >= HALO.R_IN - HALO.APRON && d <= HALO.R_OUT + HALO.APRON;
}
/* the surface normal, for anything that needs to sit flat on the ring rather than flat in the world */
export function haloNormal(x, z, out) {
  const d = Math.hypot(x, z) || 1e-6;
  const u = d - HALO.R_MID;
  const slope = u / HALO.R_DISH;              /* dy/dd */
  const n = out || new THREE.Vector3();
  n.set(-slope * (x / d), 1, -slope * (z / d)).normalize();
  return n;
}
/* THE WALKING CONTRACT roam.js consumes. Returns the floor height here, or null if the halo does
   not claim this point — so the hole over the plaza and the sky beyond the outer rim stay open. */
export function haloFloor(x, z) {
  return onHalo(x, z) ? haloHeight(x, z) : null;
}

/* ================================================================================================
   THE LASER-PLATED TILE SHADER
   ================================================================================================
   Injected into a real MeshStandardMaterial via onBeforeCompile. Verified against the vendored
   three@0.185.1 build: `#include <begin_vertex>` and `#include <emissivemap_fragment>` are both
   present as literal strings, `instanceMatrix` is three's own instanced world-position pattern, and
   the renderer is WebGL2 so fwidth() is core GLSL ES 3.00 and needs no extension.

   THE ANTI-SHIMMER RULE, which is the whole reason this is a shader. `f` below is the distance to
   the nearest grid line measured IN SCREEN-DERIVATIVE UNITS — i.e. in pixels. A line is drawn where
   that pixel distance is under the line width, so a line is always about the same number of pixels
   wide however far away it is, and when a whole grid cell shrinks below a pixel the term goes to
   zero and the grid FADES OUT instead of aliasing into moiré. Geometry cannot do this. */
export function applyHaloGrid(material, opts = {}) {
  const o = {
    micro: opts.micro != null ? opts.micro : HALO.MICRO,
    tile: opts.tile != null ? opts.tile : HALO.TILE,
    mega: opts.mega != null ? opts.mega : HALO.MEGA,
    /* the three scales carry different weights: MEGA is the district structure and reads at any
       distance, STANDARD is the walking grid, MICRO is only ever seen underfoot */
    gainMicro: opts.gainMicro != null ? opts.gainMicro : 0.10,
    gainTile: opts.gainTile != null ? opts.gainTile : 0.34,
    gainMega: opts.gainMega != null ? opts.gainMega : 0.62,
    microFar: opts.microFar != null ? opts.microFar : 34,
    tileFar: opts.tileFar != null ? opts.tileFar : 560,
    width: opts.width != null ? opts.width : 1.05,     /* line half-width, in pixels */
    node: opts.node != null ? opts.node : 1.0          /* square-diamond node brightness at MEGA crossings */
  };
  const u = {
    uHaloLine: { value: new THREE.Color(0xdff1ff) },
    uHaloGain: { value: new THREE.Vector3(o.gainMicro, o.gainTile, o.gainMega) },
    uHaloScale: { value: new THREE.Vector3(o.micro, o.tile, o.mega) },
    uHaloFade: { value: new THREE.Vector2(o.microFar, o.tileFar) },
    uHaloWidth: { value: o.width },
    uHaloNode: { value: o.node },
    uHaloPulse: { value: 0 },        /* BASE_IDLE breathing; the audio contract writes this */
    uHaloBand: { value: 0 }          /* MUSIC_ACTIVE: a travelling band, normalised 0..1 */
  };
  material.userData.haloUniforms = u;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = 'varying vec3 vHaloW;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 haloWP = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        haloWP = instanceMatrix * haloWP;
      #endif
      haloWP = modelMatrix * haloWP;
      vHaloW = haloWP.xyz;`
    );
    shader.fragmentShader = `
      varying vec3 vHaloW;
      uniform vec3 uHaloLine; uniform vec3 uHaloGain; uniform vec3 uHaloScale;
      uniform vec2 uHaloFade; uniform float uHaloWidth; uniform float uHaloNode;
      uniform float uHaloPulse; uniform float uHaloBand;
      /* distance to the nearest line of a square grid, in PIXELS, then shaped to a line */
      float haloGrid( vec2 p, float period, float w ) {
        vec2 q = p / period;
        vec2 dq = fwidth( q );
        vec2 f = abs( fract( q - 0.5 ) - 0.5 ) / max( dq, vec2( 1e-8 ) );
        float m = min( f.x, f.y );
        return 1.0 - clamp( m / max( w, 1e-4 ), 0.0, 1.0 );
      }
      /* the CROSSINGS of the MEGA grid carry the square diamond: a small rotated-square node where
         two district lines meet, which is where this world puts its brand figure */
      float haloNodeAt( vec2 p, float period ) {
        vec2 q = fract( p / period + 0.5 ) - 0.5;
        vec2 dq = fwidth( p / period );
        float dia = ( abs( q.x ) + abs( q.y ) ) / max( max( dq.x, dq.y ), 1e-8 );
        return 1.0 - clamp( dia / 4.0, 0.0, 1.0 );
      }
      /* ---- THE SECTOR SCALE, and why it is POLAR ------------------------------------------------
         The first cut stopped at MEGA — a 64 m cartesian grid with no distance ramp — and the
         multi-kilometre render came back as GRAPH PAPER: the same square cell from the rim to the
         horizon, forty-seven of them, laid diagonally across a ring it has nothing to do with. Two
         things were wrong and they are the same thing. A cartesian grid does not know it is on a
         ring, and a scale with no ramp never hands over to a larger one, so there IS no larger one.

         A ring is organised in polar coordinates: SPOKES from the axis and BANDS across the width.
         These two functions are the only ones in the shader that survive to the horizon, and they
         are the reason the plate reads as one enormous engineered ring rather than as tiling. The
         spoke count is 16 — two per district, so the structure the eye reads is the structure the
         world is actually divided into. */
      float haloSpoke( vec2 p, float n, float w ) {
        /* +0.5 puts the spokes at HALF-SECTOR bearings — 11.25 deg and every 22.5 deg after. Without
           it the sixteen spokes land on multiples of 22.5, which includes every multiple of 45, which
           is every district centre bearing: spoke 12 would run straight down the middle of the
           ARRIVAL concourse and its pylons would stand in the walking channel. Offset, each district
           sits centred between two joints 402 m either side. The geometry carries the same +0.5. */
        float a = atan( p.y, p.x ) * n / 6.28318530718 + 0.5;
        float da = fwidth( a );
        float f = abs( fract( a - 0.5 ) - 0.5 ) / max( da, 1e-8 );
        return 1.0 - clamp( f / max( w, 1e-4 ), 0.0, 1.0 );
      }
      float haloBandLine( vec2 p, float period, float w ) {
        float r = length( p ) / period;
        float dr = fwidth( r );
        float f = abs( fract( r - 0.5 ) - 0.5 ) / max( dr, 1e-8 );
        return 1.0 - clamp( f / max( w, 1e-4 ), 0.0, 1.0 );
      }
    ` + shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      {
        vec2 hp = vHaloW.xz;
        float hd = length( vHaloW - cameraPosition );
        float fMicro = 1.0 - smoothstep( uHaloFade.x * 0.55, uHaloFade.x, hd );
        float fTile  = 1.0 - smoothstep( uHaloFade.y * 0.55, uHaloFade.y, hd );
        /* MEGA now ramps out too, at four times the tile range, so it hands the frame to the sector
           scale instead of tiling to the horizon on its own */
        float fMega  = 1.0 - smoothstep( uHaloFade.y * 2.2, uHaloFade.y * 4.4, hd );
        float g = haloGrid( hp, uHaloScale.x, uHaloWidth ) * uHaloGain.x * fMicro
                + haloGrid( hp, uHaloScale.y, uHaloWidth ) * uHaloGain.y * fTile
                + haloGrid( hp, uHaloScale.z, uHaloWidth * 1.25 ) * uHaloGain.z * fMega;
        g += haloNodeAt( hp, uHaloScale.z ) * uHaloNode * 0.9 * fMega;
        /* the two scales that never fade: 16 spokes and a band every 300 m of radius */
        g += haloSpoke( hp, 16.0, uHaloWidth * 2.4 ) * uHaloGain.z * 1.15;
        g += haloBandLine( hp, 300.0, uHaloWidth * 2.0 ) * uHaloGain.z * 0.80;
        /* BASE_IDLE: a slow breath, never a blink (R3-12, and R4's animation states).
           MUSIC_ACTIVE: one travelling band along the ring, and only one. */
        float breath = 0.88 + 0.12 * uHaloPulse;
        float band = uHaloBand > 0.0
          ? smoothstep( 0.86, 1.0, cos( ( length( hp ) * 0.010 ) - uHaloBand * 6.2831 ) ) * 0.85
          : 0.0;
        totalEmissiveRadiance += uHaloLine * g * breath * ( 1.0 + band );
      }`
    );
  };
  /* three caches compiled programs by a key that does NOT include onBeforeCompile's closure, so two
     materials that differ only in their injected uniforms would share one program. The customProgram
     cache key is how you tell it they are different — and getting this wrong is a class of bug that
     shows as "the second grid has the first grid's spacing". */
  material.customProgramCacheKey = () =>
    'halo|' + o.micro + '|' + o.tile + '|' + o.mega + '|' + o.gainMicro + '|' + o.gainTile + '|' + o.gainMega;
  material.needsUpdate = true;
  return material;
}

const gold = i => (i * 2.3999632) % TAU;
const frac = i => (i * 0.6180339887) % 1;
const frac2 = i => (i * 0.7548776662) % 1;

export function buildHalo(ctx) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'mah-halo';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = {
    y: HALO.Y, rIn: HALO.R_IN, rOut: HALO.R_OUT, rMid: HALO.R_MID,
    draws: 0, triangles: 0, sectors: 0, nearTiles: 0, curvature: {}
  };
  /* the curvature proof, computed at build time so a law test can assert it rather than trust it */
  for (const arc of [50, 150, 300, 1000, 3000]) {
    const th = arc / HALO.R_MID;
    stats.curvature['arc' + arc] = {
      bendDeg: +(th * 180 / Math.PI).toFixed(2),
      deviation: +(HALO.R_MID * (1 - Math.cos(th / 2))).toFixed(2)
    };
  }
  /* haloHeight takes (x, z), not a radius — the first cut passed one argument, Math.hypot(r, undefined)
     is NaN, and the statistic reported null in every capture without failing anything. */
  stats.rimRise = +(haloHeight(HALO.R_OUT, 0) - HALO.Y).toFixed(1);
  stats.innerRimRise = +(haloHeight(HALO.R_IN, 0) - HALO.Y).toFixed(1);
  stats.worstGrade = +((HALO.R_OUT - HALO.R_MID) / HALO.R_DISH * 100).toFixed(2);

  /* ---- MATERIALS ------------------------------------------------------------------------------
     §07 is a WORLD law and it does not stop 1800 m up: the walking surface is near-black and
     reflective. The tile field is M.paving — the same black platinum the plaza deck is — with the
     laser grid injected through it. That is the reference exactly: luminous lines embedded in a
     reflective physical surface, and it is why the grid is a shader and not an overlay. */
  /* ---- WHY THERE ARE TWO BLACK DECKS AND NOT ONE ----------------------------------------------
     The first cut gave the whole ring M.paving unchanged — roughness 0.34, metalness 0.40 — and the
     first standing render came back a SHEET OF MILK. The material is not wrong; the SCALE is. A
     polished plane returns the horizon at grazing incidence, and on the plaza that never shows
     because you never see more than 43 m of deck before a building interrupts it. Here there is
     1350 m of uninterrupted plate between a walking eye and the rim, essentially all of it at
     grazing, so all of it mirrors the bright sky and the near-black floor law is deleted by physics
     rather than by a wrong colour. It is the same lesson as the forest floor (measure a floor from
     the height it is WALKED at) arriving at a new scale.

     §07's own plaza already contains the answer: it grades its floor, hero r0.045 inside 28 m and
     satin r0.13 outside, because one polish across a big field reads as plastic. At halo scale the
     grades are further apart because the field is sixty times wider.

       PLATE   the shell. Honed, not mirrored — r0.62, envMap down to 0.55. Still black, still
               metal, still reflective, but it returns a broad blur instead of the horizon, so what
               reads across two kilometres is the LASER LINE and not the sky. That is also the
               reference behaviour exactly: luminous lines in a dark ground.
       TILE    the near field, which follows the viewer. Mirror-grade, r0.20 — so the surface under
               your feet is the polished black platinum §07 promises, and the boundary between the
               two reads as finer plating around you rather than as an error. */
  const deck = (M.paving || M.graphite || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  deck.name = 'halo-plate'; deck.vertexColors = false;
  /* MEASURED, not chosen. The standing view's plate bands read 165 / 168 / 158 at the first cut
     (the near tiles, which are correct, read 21-26). Restoring §07's floor law on the terraces took
     them to 99 / 91 / 116 — most of the failure — and the rest is the ENVIRONMENT REFLECTION, which
     is the part a "darker" value cannot touch: a vertex colour multiplies the base colour, and at
     grazing incidence Fresnel drives the specular term to 1 whatever the base colour is. The only
     three knobs on that term are roughness, metalness and envMapIntensity, so those are what move.
     §07 asks for near-black and REFLECTIVE; at 0.22 the plate still returns the world, it just no
     longer mirrors the horizon across two kilometres — which leaves the laser lines and the platinum
     edges as the brightest things on the ring, exactly as the reference has it. */
  deck.roughness = 0.78; deck.envMapIntensity = 0.22; deck.roughnessMap = null;
  applyHaloGrid(deck, {});
  owned.materials.push(deck);

  const tileMat = (M.paving || M.graphite || new THREE.MeshStandardMaterial({ color: 0x0b0f16 })).clone();
  tileMat.name = 'halo-tile'; tileMat.vertexColors = false;
  tileMat.roughness = 0.20; tileMat.envMapIntensity = 1.15;
  applyHaloGrid(tileMat, { gainMicro: 0.16, gainTile: 0.40, gainMega: 0.62, microFar: 46 });
  owned.materials.push(tileMat);

  /* THE UNDERSIDE is what the whole world sees from the ground, so it is authored as a ceiling and
     not as the back of a floor: darker, one MEGA grid only, no micro detail nobody can resolve at
     1800 m, and a lower gain so it reads as a vast dark arc with structure in it rather than as a
     lit lid over the world. */
  const under = (M.graphiteMetal || M.graphite || new THREE.MeshStandardMaterial({ color: 0x141b28 })).clone();
  under.name = 'halo-underside'; under.vertexColors = false; under.side = THREE.BackSide;
  applyHaloGrid(under, { gainMicro: 0, gainTile: 0.06, gainMega: 0.30, node: 0.35, tileFar: 220 });
  owned.materials.push(under);

  /* the RIM is platinum: LAW 1's partner, a vertical band that catches the horizon, and the thing
     that draws the ring's two enormous circles in the sky */
  const rimMat = (M.platinumLit || M.platinum || new THREE.MeshStandardMaterial({ color: 0xb6c4d6 })).clone();
  rimMat.name = 'halo-rim'; rimMat.vertexColors = true;
  owned.materials.push(rimMat);

  const edgeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.energyLight), transparent: true, opacity: 0.42,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true
  });
  edgeMat.name = 'halo-edge-line'; owned.materials.push(edgeMat);

  /* ================================================================================================
     1. THE SHELL — one annulus, the whole ring, curvature in the geometry and detail in the shader
     ================================================================================================
     Radial rings x angular segments. The angular count is what decides whether the two enormous
     circles read as circles or as polygons, so it is the one that gets the budget: 384 segments is
     0.94° per facet, which at the inner rim is a 11.4 m chord — under a tile — and the rim edge
     reads clean from anywhere a viewer can stand. */
  const RINGS = 34, SEGS = 384;
  {
    const rIn = HALO.R_IN - HALO.APRON, rOut = HALO.R_OUT + HALO.APRON;
    const nV = (RINGS + 1) * (SEGS + 1);
    const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
    const idx = new Uint32Array(RINGS * SEGS * 6);
    const _n = new THREE.Vector3();
    let v = 0;
    for (let i = 0; i <= RINGS; i++) {
      /* rings are spaced so the two RIMS get more of them than the flat middle — that is where the
         curvature actually is, and where a viewer standing at the edge is closest to the surface */
      const t = i / RINGS;
      const s = t < 0.5 ? 0.5 * Math.pow(t * 2, 1.35) : 1 - 0.5 * Math.pow((1 - t) * 2, 1.35);
      const r = rIn + (rOut - rIn) * s;
      for (let j = 0; j <= SEGS; j++) {
        const a = (j / SEGS) * TAU;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const y = haloHeight(x, z);
        pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
        haloNormal(x, z, _n);
        nor[v * 3] = _n.x; nor[v * 3 + 1] = _n.y; nor[v * 3 + 2] = _n.z;
        uv[v * 2] = j / SEGS; uv[v * 2 + 1] = s;
        v++;
      }
    }
    let k = 0;
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SEGS; j++) {
        const a = i * (SEGS + 1) + j, b = a + SEGS + 1;
        idx[k++] = a; idx[k++] = b; idx[k++] = a + 1;
        idx[k++] = b; idx[k++] = b + 1; idx[k++] = a + 1;
      }
    }
    const geo = own(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const top = new THREE.Mesh(geo, deck);
    top.name = 'halo-shell'; top.frustumCulled = false; top.renderOrder = -1;
    group.add(top); stats.draws++;
    stats.triangles += RINGS * SEGS * 2;

    /* the UNDERSIDE: the same surface, THICK metres below, drawn back-side so it is the ceiling the
       world sees. Sharing the geometry would be cheaper and would put the underside at the walking
       surface's exact height — the slab has to have thickness or the world layer is a sheet of
       paper, and from the ground the edge-on read of a 16 m slab is what gives it mass. */
    const gUnder = own(geo.clone());
    const up = gUnder.attributes.position;
    for (let i = 0; i < up.count; i++) up.setY(i, up.getY(i) - HALO.THICK);
    const bottom = new THREE.Mesh(gUnder, under);
    bottom.name = 'halo-underside'; bottom.frustumCulled = false; bottom.renderOrder = -2;
    group.add(bottom); stats.draws++;
    stats.triangles += RINGS * SEGS * 2;
  }

  /* ================================================================================================
     1b. THE SECTOR ARCHITECTURE — the fix for "three kilometres of empty plate"
     ================================================================================================
     The first multi-kilometre render is the reason this exists. The shell worked, the curvature
     worked, the laser plating worked — and ninety-five per cent of every frame was BARE PLATE with
     a district somewhere on it too small to see. R3's density law names that exactly: an empty area
     is legitimate only as movement, view, future event, quiet space or arrival buffer, and this was
     none of them. It was an unbuilt defect at the largest scale in the world.

     Furniture cannot fix it. A bench is 8 m and the gap is 2700; adding a thousand benches makes a
     thousand invisible benches. What a two-and-a-half-kilometre-wide ring needs is the thing a
     two-and-a-half-kilometre-wide ring would actually have: STRUCTURE. Every large span in the real
     world is divided by expansion joints and carried by towers, and both are visible from a
     distance because they are what holds it up.

     So the ring is divided into SIXTEEN SECTORS — two per district, the same count the shader's
     spoke lines draw, so the geometry and the light agree about where the divisions are. Each
     sector joint carries a raised platinum rail the full 2700 m width, and four PYLONS at radial
     stations chosen to miss the district band entirely (the districts occupy 1966-2134; the
     stations are at 980, 1520, 2680 and 3220). Sixteen of them gives one every 805 m along the
     midline — sparse enough to be grand, close enough that no camera in the sanctuary is without
     one. The whole family merges into the rim's single draw.

     §06 governs the shape and the mahascent lesson governs the proportion: a 78 m pylon 16 m across
     is a 4.9:1 structure with a square-diamond finial, not a mast at 17:1 that aliases to a
     hairline. Nothing here is a cone and nothing here is a needle.

     THE HEIGHT RULE IS OPTICAL. A pylon has to hold up at the distance it is seen from, so height
     grows with radius: the inner ones are read from the concourse and the outer ones from three
     kilometres across the ring. 78 m at 3 km subtends 1.5°, which is 33 px in a 720-line frame —
     above the threshold where a vertical becomes a scratch. */
  const rimSolid = [];
  {
    const SECTORS = 16;
    const STATIONS = [
      { r: 980, h: 34, w: 8.0 },
      { r: 1520, h: 46, w: 10.0 },
      { r: 2680, h: 64, w: 13.5 },
      { r: 3220, h: 78, w: 16.0 }
    ];
    const _sm = new THREE.Matrix4(), _sp = new THREE.Vector3(), _sq = new THREE.Quaternion(),
      _sn = new THREE.Vector3(), _sup = new THREE.Vector3(0, 1, 0), _ss = new THREE.Vector3(),
      _se = new THREE.Euler(), _sqy = new THREE.Quaternion();
    /* on the shell, along its normal, like everything else that stands up here */
    const onS = (x, z, up, ry, sx, sy, sz) => {
      haloNormal(x, z, _sn);
      _sq.setFromUnitVectors(_sup, _sn);
      _se.set(0, ry || 0, 0); _sqy.setFromEuler(_se); _sq.multiply(_sqy);
      _sp.set(x, haloHeight(x, z) + (up || 0), z);
      _ss.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
      return _sm.compose(_sp, _sq, _ss).clone();
    };
    for (let s = 0; s < SECTORS; s++) {
      /* the +0.5 is not decoration — see haloSpoke above. Every district centre is a multiple of 45
         degrees and every unshifted spoke is a multiple of 22.5, so an unshifted joint runs down the
         middle of a district and a pylon stands in its concourse. Shifted, the joints fall between. */
      const a = ((s + 0.5) / SECTORS) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      /* THE JOINT RAIL: 2700 m of raised platinum laid in lengths, so it follows the dish's curve
         instead of chording across it. This is the piece that makes the ring read as engineered
         from any altitude — sixteen radii drawn in metal, not only in light.

         SEG_L IS A BUDGET DECISION AND IT IS MEASURED. The first cut used 30 m: 90 segments per
         spoke times three solids times sixteen spokes is 4,320 chamfer boxes, which at roughly 200
         triangles each is 860k — more than the entire rest of MAHWORLD put together, spent on a
         kerb. The dish's deviation from a 150 m chord is (75^2)/(2 x 23000) = 0.12 m over 150 m,
         which no camera in this world can see, so the segment is five times longer and the whole
         family costs 672 solids instead of 4,416. The dark shoulder is one box under the rail
         rather than two beside it, for the same reason and with the same result on screen. */
      const SEG_L = 150;
      for (let r = HALO.R_IN + 6; r < HALO.R_OUT - 6; r += SEG_L) {
        const rc = r + SEG_L * 0.5;
        /* the recessed shoulder first, wider and darker: the rail is a JOINT in the plate, not a
           stripe painted on top of one, and the shoulder is what says so */
        rimSolid.push({ geo: chamferBox(9.0, 0.26, SEG_L * 0.99, 0.10),
          matrix: onS(ca * rc, sa * rc, 0.05, -a + Math.PI / 2), value: 0.16 });
        rimSolid.push({ geo: chamferBox(3.0, 0.5, SEG_L * 0.99, 0.16),
          matrix: onS(ca * rc, sa * rc, 0.26, -a + Math.PI / 2), value: 0.98 });
      }
      for (let k = 0; k < STATIONS.length; k++) {
        const S = STATIONS[k];
        const px = ca * S.r, pz = sa * S.r;
        const ry = -a + Math.PI / 2;
        /* base -> shaft -> collar -> square diamond. The base is wider than the shaft so the tower
           is CARRIED rather than balanced, which is the same correction mahascent's masts needed. */
        rimSolid.push({ geo: chamferBox(S.w * 1.9, 1.6, S.w * 1.9, 0.5), matrix: onS(px, pz, 0.8, ry), value: 0.34 });
        rimSolid.push({ geo: chamferBox(S.w * 1.5, 0.5, S.w * 1.5, 0.18), matrix: onS(px, pz, 1.8, ry), value: 1.0 });
        rimSolid.push({ geo: chamferBox(S.w, S.h, S.w, S.w * 0.22), matrix: onS(px, pz, 2.0 + S.h * 0.5, ry), value: 0.90 });
        /* a mid collar at two thirds, so a 78 m shaft has a scale reference on it */
        rimSolid.push({ geo: chamferBox(S.w * 1.28, 1.4, S.w * 1.28, 0.4),
          matrix: onS(px, pz, 2.0 + S.h * 0.66, ry + 0.4), value: 1.0 });
        rimSolid.push({ geo: chamferBox(S.w * 1.34, 1.8, S.w * 1.34, 0.5), matrix: onS(px, pz, 2.0 + S.h, ry + 0.4), value: 1.0 });
        const dia = own(new THREE.OctahedronGeometry(1, 0));
        /* WIDER THAN TALL — the brand figure, never a spike wearing its name (§06) */
        rimSolid.push({ geo: dia, matrix: onS(px, pz, 2.0 + S.h + S.w * 0.72, ry, S.w * 0.80, S.w * 0.64, S.w * 0.80), value: 1.0 });
        stats.pylons = (stats.pylons || 0) + 1;
      }
    }
    stats.sectors = SECTORS;
  }

  /* ---- 2. THE RIMS — the two circles, and the guard rail you can see -------------------------- */
  {
    const RSEG = 384;
    const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
      _e = new THREE.Euler(), _s = new THREE.Vector3();
    /* THE SCALE MUST DEFAULT TO 1, and the first cut did not do it. Every caller below omits the
       scale arguments, `Vector3.set(undefined, undefined, undefined)` writes NaN, and a NaN scale
       makes a singular matrix whose inverse-transpose (mergeSolids' normal matrix) is NaN too — so
       all 205,824 vertices of `halo-rims` came out NaN and THE TWO RIMS NEVER DREW AT ALL. The only
       symptom was one console warning about a NaN bounding sphere, which is why the inner rim read
       as a bare cut with no parapet in every render and nothing failed. */
    const at = (x, y, z, ry, sx, sy, sz) => {
      _p.set(x, y, z); _e.set(0, ry, 0); _q.setFromEuler(_e);
      _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
      return _m.compose(_p, _q, _s).clone();
    };
    for (const [rr, sign] of [[HALO.R_IN - HALO.APRON, -1], [HALO.R_OUT + HALO.APRON, 1]]) {
      const chord = TAU * rr / RSEG;
      for (let j = 0; j < RSEG; j++) {
        const a = (j / RSEG) * TAU;
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = haloHeight(x, z);
        /* the PARAPET: a platinum band standing on the lip. It does not need to be a collider — the
           dish already curls 39.6 m over the last 1350 m, which is the guard rail. This is the part
           you can SEE, and it is what draws the ring's outline against the sky from the ground. */
        rimSolid.push({ geo: chamferBox(chord * 1.02, 2.4, 1.6, 0.35),
          matrix: at(x, y + 1.2, z, -a), value: 1.0 });
        /* and the slab's edge, so the ring reads as a thing with thickness */
        rimSolid.push({ geo: chamferBox(chord * 1.02, HALO.THICK, 2.2, 0.5),
          matrix: at(x + Math.cos(a) * sign * 0.9, y - HALO.THICK * 0.5, z + Math.sin(a) * sign * 0.9, -a), value: 0.42 });
      }
    }
    if (rimSolid.length) {
      const mesh = new THREE.Mesh(own(mergeSolids(rimSolid)), rimMat);
      mesh.name = 'halo-rims'; mesh.frustumCulled = false;
      group.add(mesh); stats.draws++;
      stats.triangles += mesh.geometry.attributes.position.count / 3;
    }
    for (const it of rimSolid) if (it.geo && it.geo.dispose) it.geo.dispose();
  }

  /* the two EDGE LINES: a hairline of MAHGIC along each rim. At 1800 m these two circles are what
     say "halo" from the ground, and they are the cheapest possible way to say it — two rings. */
  {
    for (const rr of [HALO.R_IN - HALO.APRON + 1.4, HALO.R_OUT + HALO.APRON - 1.4]) {
      const pts = [];
      for (let j = 0; j <= 256; j++) {
        const a = (j / 256) * TAU;
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        pts.push(new THREE.Vector3(x, haloHeight(x, z) + 2.5, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
      const tube = own(new THREE.TubeGeometry(curve, 384, 0.9, 4, true));
      const m = new THREE.Mesh(tube, edgeMat);
      m.name = 'halo-edge-' + Math.round(rr); m.frustumCulled = false; m.renderOrder = 4;
      group.add(m); stats.draws++;
      stats.triangles += tube.index.count / 3;
    }
  }

  /* ================================================================================================
     3. THE NEAR FIELD — physical tiles that follow the viewer
     ================================================================================================
     The shader gives the grid everywhere. What it cannot give is PHYSICALITY: a bevel that catches,
     a platinum perimeter, a raised node, a shadow in a joint. R4 asks for "load-bearing base,
     dark-crystal field, platinum perimeter, laser channels, square-diamond nodes" — that is relief,
     and relief is geometry.

     So a fixed pool of NEAR_TILES^2 slabs is repositioned around the viewer in whole-tile steps.
     Stepping by whole tiles is the entire trick: the field never slides under your feet, it
     re-registers, so a 208 m patch of physical tile follows you across a 2700 m ring for two draws
     and no allocation. Beyond it the shader grid continues unbroken, because both are computed from
     the same world XZ. */
  let nearTiles = null, nearNodes = null;
  const nearState = { cx: NaN, cz: NaN };
  {
    const N = HALO.NEAR_TILES, T = HALO.TILE, COUNT = N * N;
    const tileGeo = own(chamferBox(T * 0.965, 0.34, T * 0.965, 0.16));
    nearTiles = new THREE.InstancedMesh(tileGeo, tileMat, COUNT);
    nearTiles.name = 'halo-near-tiles'; nearTiles.frustumCulled = false;
    nearTiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(nearTiles); stats.draws++;
    stats.nearTiles = COUNT;

    /* a square-diamond node at every MEGA crossing inside the near field — the shader draws one too,
       but a node you can walk around has to be a solid */
    const nodeGeo = own(new THREE.OctahedronGeometry(1, 0));
    nodeGeo.scale(0.62, 0.34, 0.62);
    nearNodes = new THREE.InstancedMesh(nodeGeo, rimMat, Math.ceil(COUNT * T * T / (HALO.MEGA * HALO.MEGA)) + 8);
    nearNodes.name = 'halo-near-nodes'; nearNodes.frustumCulled = false;
    nearNodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(nearNodes); stats.draws++;
  }

  const _tm = new THREE.Matrix4(), _tp = new THREE.Vector3(), _tq = new THREE.Quaternion(),
    _tn = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _ts = new THREE.Vector3();
  function placeNear(ex, ez) {
    const T = HALO.TILE, N = HALO.NEAR_TILES;
    const cx = Math.round(ex / T) * T, cz = Math.round(ez / T) * T;
    if (cx === nearState.cx && cz === nearState.cz) return false;
    nearState.cx = cx; nearState.cz = cz;
    const half = (N - 1) / 2;
    let t = 0, n = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = cx + (i - half) * T, z = cz + (j - half) * T;
        /* THE RIM BANDS ARE NOT THE NEAR FIELD'S TO PAVE. The overlooks are cut into the inner rim
           at r = R_IN + 26, and the first cut's tile field marched straight over them: the downward
           view — the one clause R4 gives a paragraph of its own — photographed as a floor. The rims
           are authored by the rim pass and by the districts' overlooks; the tile field stops short
           of both, which also keeps a 34 cm slab from standing proud of the parapet line. */
        const rr = Math.hypot(x, z);
        if (rr < HALO.R_IN + 64 || rr > HALO.R_OUT - 40 || !onHalo(x, z)) {
          /* off the ring: park it below the underside where nothing can see it. Skipping the write
             would leave the previous frame's matrix in place, which is a tile hanging in the hole. */
          _tp.set(0, HALO.Y - 4000, 0); _ts.set(0.001, 0.001, 0.001);
          nearTiles.setMatrixAt(t++, _tm.compose(_tp, _tq.identity(), _ts));
          continue;
        }
        const y = haloHeight(x, z);
        haloNormal(x, z, _tn);
        _tq.setFromUnitVectors(_up, _tn);          /* the tile lies ON the shell, not flat in the world */
        _tp.set(x, y + 0.17, z); _ts.set(1, 1, 1);
        nearTiles.setMatrixAt(t++, _tm.compose(_tp, _tq, _ts));
        if (Math.abs(x % HALO.MEGA) < T * 0.5 && Math.abs(z % HALO.MEGA) < T * 0.5 && n < nearNodes.count) {
          _tp.set(x, y + 0.42, z);
          nearNodes.setMatrixAt(n++, _tm.compose(_tp, _tq, _ts));
        }
      }
    }
    for (; n < nearNodes.count; n++) {
      _tp.set(0, HALO.Y - 4000, 0); _ts.set(0.001, 0.001, 0.001);
      nearNodes.setMatrixAt(n, _tm.compose(_tp, _tq.identity(), _ts));
    }
    nearTiles.instanceMatrix.needsUpdate = true;
    nearNodes.instanceMatrix.needsUpdate = true;
    return true;
  }
  /* seed at the arrival bearing so the first frame is not an empty ring */
  placeNear(0, -(HALO.R_IN + 120));

  /* ---- LAW 2, and the one call that had to be DELETED -----------------------------------------
     The first cut answered the ring with ctx.lightPool. That is ground.js's family and it lays its
     ellipses on the PLAZA DECK: writePool defaults y to POOL_Y ≈ 0.24 and never looks at how far
     out x,z are. So a 260 m pool at (0, -820) painted a glowing oval onto the TERRAIN, 1800 m below
     the thing it was supposed to be answering — a defect invented in the name of a law. ground.js
     says so in its own comment ("only serves the plaza deck") and broadcast.js learned it at 185 m.

     LAW 2 is "every emitter is answered on the surface it stands on", and here the emitter IS the
     surface: the laser lines are emissive and the plate under them is a black metal that returns
     them. The answer is already in the frame. What the ring owes the WORLD is the underside, which
     is authored as a ceiling for exactly that reason — and halo-districts lays the sanctuary's own
     pool family, on the ring, along the shell normal. Nothing here should call ctx.lightPool. */

  /* ---- the animation contract (R4's states), driven from setState -----------------------------
     One uniform pair carries every state, because R4 asks for states that are "restrained
     reusable", and eight bespoke animation paths is the opposite of that. */
  /* EVERY material carrying the grid, including the near tiles. Leaving tileMat out of this list is
     the silent failure this file is one edit away from at all times: setTime/setTheme/update would
     drive the shell and the underside while the 676 tiles under the viewer's feet kept a stale line
     colour and a frozen breath — the one part of the sanctuary nobody could miss. */
  const gridMats = [deck, tileMat, under];
  let quiet = false, state = 'BASE_IDLE', bandPhase = 0;

  return {
    group, stats,
    /* the surface contract — roam, the districts and the law suite all read the halo from here */
    HALO, heightAt: haloHeight, normalAt: haloNormal, floorAt: haloFloor, contains: onHalo,
    setEye(x, y, z) { placeNear(x, z); },
    setState(s) { state = s || 'BASE_IDLE'; return state; },
    get state() { return state; },
    update(t, dt) {
      if (quiet) return;
      /* BASE_IDLE breathes; MUSIC_ACTIVE additionally sends one band around the ring. Nothing
         strobes and nothing pulses the whole object — R3-12 and R4 both forbid it. */
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.42);
      const music = state === 'MUSIC_ACTIVE' || state === 'EVENT';
      if (music) bandPhase = (bandPhase + (dt || 1 / 60) * 0.14) % 1;
      for (const m of gridMats) {
        const u = m.userData.haloUniforms;
        if (!u) continue;
        u.uHaloPulse.value = state === 'QUIET' ? 0.15 * pulse : pulse;
        u.uHaloBand.value = music ? bandPhase : 0;
      }
    },
    setTime(s) {
      /* the halo belongs to the night as much as the city does: by day the sky out-values a grid
         line and a bright one reads as haze (the same argument fobeam and interlink make) */
      const night = 1 - (s && s.daylight != null ? s.daylight : 0);
      for (const m of gridMats) {
        const u = m.userData.haloUniforms;
        if (!u) continue;
        u.uHaloLine.value.setHex(theme.energyLight || 0xdff1ff).multiplyScalar(0.34 + 0.66 * night);
      }
      edgeMat.opacity = 0.12 + 0.34 * night;
    },
    setTheme(th) {
      if (!th || th.energyLight == null) return;
      edgeMat.color.setHex(th.energyLight);
      for (const m of gridMats) {
        const u = m.userData.haloUniforms;
        if (u) u.uHaloLine.value.setHex(th.energyLight);
      }
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      quiet = !!low;
      nearNodes.visible = !low;
      /* §19: at the low tier the MICRO grid goes first — it is the scale nobody can see from
         standing height anyway, and it is the most expensive per pixel */
      const ud = deck.userData.haloUniforms;
      if (ud) ud.uHaloGain.value.x = low ? 0 : 0.10;
      const ut = tileMat.userData.haloUniforms;
      if (ut) ut.uHaloGain.value.x = low ? 0 : 0.16;
    },
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

/* ---- the hand-rolled merge. BufferGeometryUtils does not exist in this build (LOCKED), so every
   module carries its own; this one is the same shape as the others so it reads the same. -------- */
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

export default { buildHalo, HALO, haloHeight, haloNormal, haloFloor, onHalo, applyHaloGrid };
