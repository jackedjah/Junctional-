/* MAHWORLD :: UPPER REALM — THE AIR ITSELF (sky-atmosphere)

   Everything in the SKYBIOME that is NOT solid: the sky, the sun, the stars, the void that falls
   away under the cloud floor, and the far distance where the cloud ocean meets the horizon. The
   terrain module owns cloud you could stand on; this module owns cloud you can only look at, and
   the air between.

   THE ONE IDEA. A player standing on the arrival plateau sees a sunset ocean ahead, turns right into
   an open training expanse, turns again into a cool violet upper atmosphere, and turns again to find
   the pads they arrived on — and at no point does the light CUT. It changes continuously, because
   there is exactly one sky object and its colour at every point comes out of
   layout.atmosphere(bearing, elevation, band). Four sectors, one dome, one function (§42, §48).
   Nothing here invents an atmospheric colour: the dome, the horizon glow, the void haze, the far
   cloud sea and the mountains all sample atmosphere() / fillFor() / ATMO[band], so turning the camera
   changes the light as a structural property of the world rather than as something painted by hand
   (§41). The single exception the brief grants is the aurora, which is MAHGIC and therefore Theme.

   WHAT IT BUILDS, and which part of the brief each answers

     1  THE DOME (§42)              one world-space sphere at DECK.domeRadius, vertex-coloured from
                                    atmosphere(), carrying the sun's own scattering and the warm
                                    sector-A horizon band inside those same vertex colours.
     2  SUN + HALO (§15)            a small disc at the contract's sun direction and a wide, low-alpha
                                    halo. The bulk of the sun's light lives in the dome, which is why
                                    the halo never has to close into a glare blob.
     3  STARS + UPPER AIR (§18)     one Points object, seeded, density and brightness weighted by
                                    sectorMix(bearing,'stars'), plus an airglow band. Atmosphere seen
                                    from inside the atmosphere — not outer space.
     4  AURORA (§18)                three restrained curtains on the cold side only. THE one place
                                    the world Theme colour is allowed into the sky, so setTheme
                                    repaints it and nothing else.
     5  THE VOID BELOW (§38)        six layers of haze falling to DECK.voidFloor, with rim mist that
                                    finds the real holes through deckSolid(), two drifting lower
                                    cloud decks and an unfocused suggestion of city glow far below.
                                    No ground plane anywhere: oceans may exist down there later (§39).
     6  DISTANT PEAKS (§16)         layout.PEAKS — five massifs at 4.7-7.2 km, sunk to their own
                                    local cloud-sea level so they RISE OUT of the sea instead of
                                    standing in front of it, painted with real aerial perspective and
                                    a warm rim on their sunset flank only.
     7  THE FAR CLOUD SEA           the ocean's outer edge from seaRadius*0.75 to the horizon. Cheap
                                    on purpose (§46): the terrain module owns everything inside.

   THE TWO CONTRACT LAWS, and where this module obeys them

     LAW 1 — nothing assumes y = 0. The far cloud sea takes its height from layout.deckHeight(x, z)
     directly, vertex by vertex, so it JOINS whatever the terrain module builds inside the handoff
     radius instead of merely being near it. The rim-mist veil hangs a fixed distance BELOW
     deckHeight(x, z) rather than at an absolute height, so it drapes with the cloud floor. Every
     peak's waterline is deckHeight() at that peak's own xz. deckSolid() is what finds the real void
     rims for the mist, and it is asserted in stats.

     LAW 2 — no atmospheric colour is authored here. Search this file for a hex literal: there are
     none in the sky. The scalars below are STRENGTHS, not colours.

   THE BAND MAY BE A BLEND. The contract's `band` argument is either one of the four key names or its
   own { a, b, t } pair, and atmoBand(clockState) turns the world clock's eight bands into one. BAND
   is therefore held here exactly as given and passed through to atmosphere() and fillFor() untouched,
   and every per-band number this module owns — sun glow, horizon glow, disc opacity, fog near/far —
   resolves through the SAME pair. Otherwise the dome would cross-fade through a sunset while the sun
   glow, the star level and the fog snapped at the boundary, which is the seam §41 exists to prevent.

   FOG. This module sets nothing global — every object it owns is fog:false and carries its own
   painted aerial perspective, because the realm is 9 km deep and a linear fog tuned for a 1 km deck
   would erase all of it. The assembly asks fog(band) for the colour and near/far it should apply to
   everyone else, and gets a blended answer for the same reason.

   COST (§45, §46). Measured, not estimated — see stats.drawCalls / stats.triangles. Quality is spent
   on the dome's azimuth resolution (that IS the module) and on the sunset horizon; the cloud sea
   nine kilometres out is a flat annulus and a few billboards, which is all it can ever be worth. */

import * as THREE from '../vendor/three/three.module.min.js';
import * as LAYOUT from './sky-layout.js';
import { canvasTexture } from './materials.js';

const TAU = Math.PI * 2;

/* ---- module-level scratch. Neither update() nor a repaint may allocate (§45). ---------------- */
const _c = new THREE.Color(), _csun = new THREE.Color(), _cvoid = new THREE.Color();
const _cfill = new THREE.Color(), _csea = new THREE.Color(), _ce1 = new THREE.Color(), _ce2 = new THREE.Color();
const _sunDir = new THREE.Vector3();
const _w4 = [0, 0, 0, 0];

/* How hard the sun's own scattering is painted INTO the dome's vertex colours. These are STRENGTHS,
   not colours — the colour is always ATMO[band].sun. Dusk and dawn are the realm's signature hours so
   they carry the most; day is already a bright sky and needs little help; night keeps a faint residue
   because SUN_ELEV.night is only -0.22 rad, i.e. civil twilight, not astronomical dark. */
/* MEASURED, at bearing 0 and elevation 0 at dusk: the contract's own A horizon lands the dome vertex
   at linear (0.92, 0.39, 0.24) and these two terms together add about 0.85 on top of it. Through ACES
   at the band's 1.02 exposure that is a near-white warm core inside a peach field that still holds its
   hue 45 deg out — which is a low sun over an ocean. Pushed to 1.0 the core goes white and takes the
   colour with it, which is the failure this number is set just under. */
const SUN_GLOW = Object.freeze({ night: 0.09, dawn: 0.42, day: 0.22, dusk: 0.46 });
/* the warm band lying ALONG the horizon, as opposed to the round glow around the disc. Weighted by
   the sector-A membership squared, which is what makes it structurally impossible for the cold side
   to go warm however the sectors are later retuned (§15). */
const HORIZON_GLOW = Object.freeze({ night: 0.11, dawn: 0.40, day: 0.18, dusk: 0.44 });
/* the disc is simply absent when the sun is under the cloud line */
const SUN_DISC = Object.freeze({ night: 0.0, dawn: 0.88, day: 1.0, dusk: 0.92 });

/* What this module ASKS the assembly to apply as scene fog. Far has to clear the cold side's cloud
   towers (TOWERS reach r = 3000) or the realm's best silhouettes vanish; near is generous because a
   cloud world is hazy even close up. */
const FOG_BAND = Object.freeze({
  night: { near: 210, far: 3300 },
  dawn: { near: 300, far: 4400 },
  day: { near: 440, far: 5400 },
  dusk: { near: 300, far: 4200 }
});

/* Star population before sector weighting. Weighted rejection then removes most of them from the warm
   side, so the cold backside genuinely shows more sky (§18). */
const STAR_POOL = 3600;
const STAR_FRACTION = Object.freeze({ high: 1.0, medium: 0.7, low: 0.45 });

export function buildSkyAtmosphere(ctx) {
  const layout = (ctx && ctx.layout) || LAYOUT;
  const smooth = layout.smoothstep;
  const DECK = layout.DECK;
  const R = DECK.domeRadius;
  const SEA_IN = DECK.seaRadius * 0.75;          /* the handoff: terrain owns inside, this owns outside */
  const IA = layout.SECTORS.findIndex(s => s.id === 'A');

  let theme = (ctx && ctx.theme) || (ctx && ctx.M && ctx.M.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2f6ea8 };
  /* BAND is either a key name or the contract's { a, b, t } blend — see pairOf() below */
  let BAND = 'dusk', daylight = 0, tierName = 'high', starLevel = 0.3;

  const group = new THREE.Group(); group.name = 'sky-atmosphere';
  const geometries = [], materials = [], textures = [];
  const own = g => { geometries.push(g); return g; };
  const ownM = m => { materials.push(m); return m; };
  const ownT = t => { textures.push(t); return t; };

  /* ---- the contract, wrapped ---------------------------------------------------------------
     atmosphere() hands back a PACKED sRGB integer when no out-colour is given, and setHex is the
     call that lifts it into the renderer's working colour space — the same path sky.js takes for its
     own dome. Passing a THREE.Color into atmosphere() instead would write sRGB numbers straight into
     a linear colour and darken the whole realm by roughly a stop, which in a world that has to read
     BRIGHT is the wrong failure to accept for one saved allocation. Neither form allocates. */
  const sky = (c, bearing, elev) => c.setHex(layout.atmosphere(bearing, elev, BAND));
  const fill = (c, bearing) => c.setHex(layout.fillFor(bearing, BAND));
  const warmA = bearing => { layout.sectorWeights(bearing, _w4); return _w4[IA]; };

  /* THE BAND MAY BE A BLEND. world-clock.js runs eight bands and this atmosphere has four keys, so
     the contract allows `band` to be either a key name or its own { a, b, t } pair, and gives
     atmoBand(clockState) to build one. BAND is therefore passed through to atmosphere() and
     fillFor() completely untouched, and every per-band number this module owns is resolved through
     the SAME pair — otherwise the sky would cross-fade continuously while the sun glow, the star
     level and the fog snapped at each boundary, which is the exact seam §41 exists to prevent. */
  function pairOf(band) {
    if (band && typeof band === 'object' && band.a) return band;
    return { a: layout.ATMO[band] ? band : 'dusk', b: layout.ATMO[band] ? band : 'dusk', t: 0 };
  }
  function bandNum(table) { const p = pairOf(BAND), a = table[p.a], b = table[p.b]; return a + (b - a) * (p.t || 0); }
  function bandScalar(name) {
    if (layout.atmoScalar) return layout.atmoScalar(BAND, name);
    const p = pairOf(BAND), a = layout.ATMO[p.a][name], b = layout.ATMO[p.b][name];
    return a + (b - a) * (p.t || 0);
  }
  function bandHex(key) {
    const p = pairOf(BAND), t = p.t || 0;
    const A = layout.ATMO[p.a][key], B = layout.ATMO[p.b][key];
    if (t <= 0) return A;
    if (t >= 1) return B;
    const r = ((A >> 16) & 255) + (((B >> 16) & 255) - ((A >> 16) & 255)) * t;
    const g = ((A >> 8) & 255) + (((B >> 8) & 255) - ((A >> 8) & 255)) * t;
    const b = (A & 255) + ((B & 255) - (A & 255)) * t;
    return ((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)) >>> 0;
  }
  /* layout.sunDirection() only knows the four key NAMES, so handing it a blend would silently snap
     the sun back to the dusk elevation. The elevation blends exactly like every other key. */
  function sunDirFor(out) {
    const p = pairOf(BAND), t = p.t || 0;
    const ea = layout.SUN_ELEV[p.a], eb = layout.SUN_ELEV[p.b];
    const e = ea + (eb - ea) * t;
    const d = layout.dir(layout.SUN_BEARING);
    return out.set(d.x * Math.cos(e), Math.sin(e), d.z * Math.cos(e)).normalize();
  }
  function bandLabel() { const p = pairOf(BAND); return (p.t || 0) > 0.001 ? p.a + '->' + p.b + '@' + p.t.toFixed(2) : p.a; }

  /* Bake per-vertex bearing and elevation-as-seen-from-the-origin once, so a repaint never pays for
     atan2 or a square root. Every painted surface in this module uses these two numbers and nothing
     else to ask the contract what colour the air is at that point. */
  function bakeBE(geo) {
    const p = geo.attributes.position, n = p.count;
    const b = new Float32Array(n), e = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      b[i] = layout.bearingOf(x, z);
      const d = Math.sqrt(x * x + y * y + z * z) || 1;
      e[i] = y / d;
    }
    return { b, e };
  }

  /* ============================================================== 1. THE DOME (§42) ========== */
  /* Azimuth resolution is the whole point of this mesh: 96 columns is a 3.75 deg step, which is finer
     than the raised-cosine sector blend can change in, so the directional gradient reads as continuous
     colour rather than as facets. 40 rows is more than the elevation ramp needs, but the horizon is
     where all the drama lives and it costs 7.5k triangles to be generous about it. */
  const DOME_W = 96, DOME_H = 40;
  const domeGeo = own(new THREE.SphereGeometry(R, DOME_W, DOME_H));
  const domeN = domeGeo.attributes.position.count;
  const domeCol = new Float32Array(domeN * 3);
  domeGeo.setAttribute('color', new THREE.BufferAttribute(domeCol, 3));
  const domeBE = bakeBE(domeGeo);
  /* at a pole every bearing meets in one vertex, so a per-bearing sample there tears; those vertices
     take the all-bearing average instead */
  const domePole = new Uint8Array(domeN);
  for (let i = 0; i < domeN; i++) domePole[i] = Math.abs(domeBE.e[i]) > 0.9999 ? 1 : 0;
  const domeMat = ownM(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  domeMat.name = 'sky-dome';
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.name = 'sky-dome'; dome.frustumCulled = false; dome.renderOrder = -100;
  group.add(dome);

  function paintDome() {
    sunDirFor(_sunDir);
    _csun.setHex(bandHex('sun')); _cvoid.setHex(bandHex('void'));
    const gA = bandNum(SUN_GLOW), hA = bandNum(HORIZON_GLOW);
    const p = domeGeo.attributes.position;
    /* the two pole colours, averaged over eight bearings */
    let zr = 0, zg = 0, zb = 0, nr = 0, ng = 0, nb = 0;
    for (let k = 0; k < 8; k++) {
      const b = -Math.PI + (k + 0.5) * (TAU / 8);
      sky(_c, b, 1); zr += _c.r; zg += _c.g; zb += _c.b;
      sky(_c, b, -1); nr += _c.r; ng += _c.g; nb += _c.b;
    }
    zr /= 8; zg /= 8; zb /= 8; nr /= 8; ng /= 8; nb /= 8;
    for (let i = 0; i < domeN; i++) {
      const e = domeBE.e[i];
      let r, g, b;
      if (domePole[i]) { const up = e > 0; r = up ? zr : nr; g = up ? zg : ng; b = up ? zb : nb; }
      else { sky(_c, domeBE.b[i], e); r = _c.r; g = _c.g; b = _c.b; }
      /* THE SUN'S SCATTERING, painted into the sky itself rather than sprited on top of it. A wide
         cos^3 lobe (half strength 37 deg out) carries the glow the eye reads as "the sun is over
         there"; a tight cos^16 core (half strength 18 deg) keeps the disc sitting in something. */
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      let cw = (px * _sunDir.x + py * _sunDir.y + pz * _sunDir.z) / R;
      if (cw < 0) cw = 0;
      const cw2 = cw * cw, cw4 = cw2 * cw2, cw8 = cw4 * cw4;
      let lift = gA * (0.58 * cw2 * cw + 0.42 * cw8 * cw8);
      /* THE HORIZON BAND. Asymmetric on purpose: a sunset's warmth climbs into the sky further than
         it sinks. wA squared means sector D can never receive it (§15 "NEVER warm on the cold side"). */
      const de = e - 0.008;
      if (de > -0.24 && de < 0.5) {
        const s = de > 0 ? 0.135 : 0.062, wA = warmA(domeBE.b[i]);
        lift += hA * wA * wA * Math.exp(-(de * de) / (s * s));
      }
      r += _csun.r * lift; g += _csun.g * lift; b += _csun.b * lift;
      /* BELOW THE HORIZON the sky is not sky any more, it is the void looking back (§38). The
         transition starts at -3.4 deg so that the far cloud sea's own edge, which sits at about
         -1.5 deg from the deck, still reads against clean horizon colour and not against a dark band. */
      if (e < -0.06) {
        const t = smooth((-e - 0.06) / 0.44) * 0.85;
        r += (_cvoid.r - r) * t; g += (_cvoid.g - g) * t; b += (_cvoid.b - b) * t;
      }
      const o = i * 3;
      domeCol[o] = r; domeCol[o + 1] = g; domeCol[o + 2] = b;
    }
    domeGeo.attributes.color.needsUpdate = true;
  }

  /* ============================================================== 2. SUN AND HALO (§15) ====== */
  const haloTex = ownT(haloTexture());
  const sunMat = ownM(new THREE.MeshBasicMaterial({ fog: false, transparent: true, depthWrite: false }));
  sunMat.name = 'sky-sun';
  /* 96 m across at 8.9 km is 1.24 deg — a shade larger than a real sun, which is what a low sun over
     an ocean looks like and what the composition wants. It is a disc, not a light source. */
  const sunDisc = new THREE.Mesh(own(new THREE.CircleGeometry(96, 56)), sunMat);
  sunDisc.name = 'sky-sun-disc'; sunDisc.renderOrder = -66; sunDisc.frustumCulled = false;
  const haloMat = ownM(new THREE.SpriteMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.42 }));
  haloMat.name = 'sky-sun-halo';
  const sunHalo = new THREE.Sprite(haloMat);
  /* 3600 across at 8.9 km is 23 deg of halo. It is deliberately far wider and far weaker than a
     bloom: the texture's core never exceeds 0.5 alpha, so it cannot close into a glare blob. */
  sunHalo.scale.set(3600, 3600, 1); sunHalo.renderOrder = -68; sunHalo.frustumCulled = false;
  group.add(sunHalo, sunDisc);

  const SUN_R = 8900;
  function placeSun() {
    const sunHex = bandHex('sun');
    sunDirFor(_sunDir);
    sunDisc.position.copy(_sunDir).multiplyScalar(SUN_R);
    sunDisc.lookAt(0, 0, 0);
    sunHalo.position.copy(_sunDir).multiplyScalar(SUN_R - 60);
    sunMat.color.setHex(sunHex);
    haloMat.color.setHex(sunHex);
    const d = bandNum(SUN_DISC);
    sunMat.opacity = d;
    haloMat.opacity = 0.42 * d;
  }

  /* ============================================================== 3. STARS AND UPPER AIR ===== */
  /* One Points object, seeded so the sky is the same sky every session. Sector membership decides
     both whether a candidate survives and how bright it is, which is what makes the cold backside
     read as genuinely more open than the sunset side (§18). Sorted brightest-first so setQuality can
     cut the tail with a draw range and lose only the faintest. */
  const starPos = [], starCol = [], starB = [];
  {
    const rnd = layout.rng('skybiome-stars');
    const stars = [];
    for (let i = 0; i < STAR_POOL; i++) {
      const bearing = -Math.PI + rnd() * TAU;
      /* elevation biased upward: near the horizon the air is thick and stars are scarce */
      const e = 0.02 + Math.pow(rnd(), 0.78) * 0.96;
      const w = layout.sectorMix(bearing, 'stars');
      /* the rejection is sharpened past the raw weight (w^1.6) because a linear one only produced a
         2.3:1 cold-to-warm star count against the contract's own 10:1 intent — the sunset side has to
         read as a bright hazy sky with almost nothing in it, and the cold backside as genuinely open */
      if (rnd() > 0.04 + 0.96 * Math.pow(w, 1.6)) continue;
      const bright = (0.16 + Math.pow(rnd(), 2.4) * 0.90) * (0.18 + 0.82 * w);
      stars.push({ bearing, e, bright });
    }
    stars.sort((a, b) => b.bright - a.bright);
    const SR = 9200;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i], d = layout.dir(s.bearing);
      const rh = SR * Math.sqrt(Math.max(0, 1 - s.e * s.e));
      starPos.push(d.x * rh, SR * s.e, d.z * rh);
      /* the tint comes through the contract: a star is seen THROUGH this air, so it carries a trace
         of the fill colour of the direction it sits in — violet on the cold side, warm-white in A */
      _cfill.setHex(layout.fillFor(s.bearing, 'night'));
      const t = 0.34;
      starCol.push((1 - t) * s.bright + _cfill.r * t * s.bright, (1 - t) * s.bright + _cfill.g * t * s.bright, (1 - t) * s.bright + _cfill.b * t * s.bright);
      starB.push(s.bearing);
    }
  }
  const starGeo = own(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starCol, 3));
  const dotTex = ownT(dotTexture());
  const starMat = ownM(new THREE.PointsMaterial({
    map: dotTex, vertexColors: true, size: 2.6, sizeAttenuation: false,
    transparent: true, depthWrite: false, fog: false, opacity: 0.9
  }));
  starMat.name = 'sky-stars';
  const starCount = starPos.length / 3;
  const stars = new THREE.Points(starGeo, starMat);
  stars.name = 'sky-stars'; stars.renderOrder = -92; stars.frustumCulled = false;
  group.add(stars);

  /* THE AIRGLOW BAND — the faint cosmic haze of §18, kept as ATMOSPHERE. A real upper-air glow, not a
     galaxy: a soft ring high in the sky whose strength follows sectorMix(bearing,'stars'), so it is
     almost absent over the sunset and clearly present on the cold side. Its colour is fillFor() at
     each bearing, so it can never disagree with the dome behind it. */
  const AIR_U = 64, AIR_V = 9, AIR_R = 9350;
  const airglow = latLongBand(AIR_R, AIR_U, AIR_V, 0.06, 0.88);
  const airglowGeo = own(airglow.geo);
  const airglowBE = bakeBE(airglowGeo);
  const airglowShape = new Float32Array(airglowGeo.attributes.position.count);
  {
    const n = airglowShape.length;
    for (let i = 0; i < n; i++) {
      const e = airglowBE.e[i];
      /* strongest at about 30 deg up: below that the band would fight the horizon glow, above it the
         air is too thin to glow */
      const v = Math.exp(-Math.pow((e - 0.46) / 0.30, 2));
      airglowShape[i] = v * layout.sectorMix(airglowBE.b[i], 'stars');
    }
  }
  const airglowCol = new Float32Array(airglowShape.length * 3);
  airglowGeo.setAttribute('color', new THREE.BufferAttribute(airglowCol, 3));
  const airglowMat = ownM(new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, fog: false, side: THREE.BackSide, opacity: 1
  }));
  airglowMat.name = 'sky-airglow';
  const airglowMesh = new THREE.Mesh(airglowGeo, airglowMat);
  airglowMesh.name = 'sky-airglow'; airglowMesh.renderOrder = -96; airglowMesh.frustumCulled = false;
  group.add(airglowMesh);

  function paintAirglow() {
    const n = airglowShape.length;
    for (let i = 0; i < n; i++) {
      fill(_cfill, airglowBE.b[i]);
      /* 0.085 is the whole band's ceiling: measured against the night dome's own mid stop it lifts the
         cold-side sky by about a value, which is presence. Twice that starts to look like fog. */
      const s = airglowShape[i] * 0.085;
      const o = i * 3;
      airglowCol[o] = _cfill.r * s; airglowCol[o + 1] = _cfill.g * s; airglowCol[o + 2] = _cfill.b * s;
    }
    airglowGeo.attributes.color.needsUpdate = true;
  }

  /* ============================================================== 4. AURORA (§18) ============ */
  /* Rare and restrained, cold side only. THIS IS THE ONE PLACE the world Theme colour is allowed into
     the sky, so it is the one thing here that setTheme repaints — and nothing else in this file
     responds to a Theme change at all, because cloud, sun, stars and void are nature (§41 owners). */
  const AUR_U = 28, AUR_V = 8, AUR_R = 9250;
  const AURORA_CURTAINS = [
    { b0: -2.32, span: 0.52, e0: 0.10, e1: 0.52, fold: 9.7, ph: 0.0, gain: 0.85 },
    { b0: -1.70, span: 0.66, e0: 0.12, e1: 0.64, fold: 12.3, ph: 1.9, gain: 1.00 },
    { b0: -1.10, span: 0.44, e0: 0.09, e1: 0.44, fold: 8.1, ph: 3.4, gain: 0.66 }
  ];
  const auroraGeo = own(new THREE.BufferGeometry());
  const auroraShape = new Float32Array((AUR_U + 1) * (AUR_V + 1) * AURORA_CURTAINS.length);
  const auroraT = new Float32Array(auroraShape.length);
  {
    const nv = (AUR_U + 1) * (AUR_V + 1) * AURORA_CURTAINS.length;
    const pos = new Float32Array(nv * 3), idx = [];
    let vi = 0;
    for (let k = 0; k < AURORA_CURTAINS.length; k++) {
      const C = AURORA_CURTAINS[k], base = vi;
      for (let i = 0; i <= AUR_U; i++) {
        const u = i / AUR_U;
        /* the curtain meanders in bearing rather than running straight: a straight aurora is a stripe */
        const bearing = C.b0 + C.span * (u - 0.5) + 0.14 * Math.sin(u * 4.7 + C.ph);
        const d = layout.dir(bearing);
        const env = Math.pow(Math.sin(Math.PI * u), 0.62);                 /* fades to nothing at both ends */
        const rays = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(u * C.fold + C.ph));
        for (let j = 0; j <= AUR_V; j++) {
          const v = j / AUR_V;
          const e = C.e0 + (C.e1 - C.e0) * v;
          const rh = AUR_R * Math.sqrt(Math.max(0, 1 - e * e));
          const o = vi * 3;
          pos[o] = d.x * rh; pos[o + 1] = AUR_R * e; pos[o + 2] = d.z * rh;
          /* a hard-ish bright base fading upward is what separates an aurora from a smear of light */
          const vert = smooth(v / 0.10) * Math.pow(1 - v, 1.25);
          auroraShape[vi] = env * rays * vert * C.gain * layout.sectorMix(bearing, 'stars');
          auroraT[vi] = v;
          vi++;
        }
      }
      for (let i = 0; i < AUR_U; i++) {
        for (let j = 0; j < AUR_V; j++) {
          const a = base + i * (AUR_V + 1) + j;
          idx.push(a, a + 1, a + AUR_V + 1, a + 1, a + AUR_V + 2, a + AUR_V + 1);
        }
      }
    }
    auroraGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    auroraGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    auroraGeo.setIndex(idx);
  }
  const auroraMat = ownM(new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, fog: false, side: THREE.DoubleSide, opacity: 0.6
  }));
  auroraMat.name = 'sky-aurora';
  const aurora = new THREE.Mesh(auroraGeo, auroraMat);
  aurora.name = 'sky-aurora'; aurora.renderOrder = -94; aurora.frustumCulled = false;
  group.add(aurora);

  function paintAurora() {
    _ce1.setHex(theme.energyLight != null ? theme.energyLight : 0xdff1ff);
    _ce2.setHex(theme.energy != null ? theme.energy : 0x7fc6ff);
    const col = auroraGeo.attributes.color.array;
    for (let i = 0; i < auroraShape.length; i++) {
      const t = auroraT[i], s = auroraShape[i] * 0.40;   /* 0.40 is the restraint: this is a hint, not a light show */
      const o = i * 3;
      col[o] = (_ce1.r + (_ce2.r - _ce1.r) * t) * s;
      col[o + 1] = (_ce1.g + (_ce2.g - _ce1.g) * t) * s;
      col[o + 2] = (_ce1.b + (_ce2.b - _ce1.b) * t) * s;
    }
    auroraGeo.attributes.color.needsUpdate = true;
  }

  /* ============================================================== 5. THE VOID BELOW (§38) ==== */
  /* Six horizontal sheets of haze falling to DECK.voidFloor. Not a floor: even the deepest sheet is
     translucent, because oceans may exist down there later and this module must not have decided that
     the world below is solid (§39). What closes the bottom is accumulated depth, not opacity.

     Split into two meshes so the lower cloud decks can drift while the deep haze and the city glow
     stay put. Sheets inside each mesh are laid deepest-first, which is back-to-front from any camera
     standing on the deck, so a single transparent mesh blends correctly without per-triangle sorting. */
  const VOID_SEG = 56, VOID_RING = 7;
  /* y, radius, peak alpha, mottle (0 = flat haze, 1 = reads as cloud), city glow strength */
  const HAZE_SHEETS = [
    { y: DECK.voidFloor, r: 8200, a: 0.62, mottle: 0.15, city: 1.00 },
    { y: -720, r: 6600, a: 0.34, mottle: 0.25, city: 0.55 },
    { y: -560, r: 5400, a: 0.24, mottle: 0.30, city: 0.20 }
  ];
  const CLOUD_SHEETS = [
    { y: -380, r: 4200, a: 0.30, mottle: 0.95, city: 0 },
    { y: -230, r: 3200, a: 0.24, mottle: 1.00, city: 0 },
    { y: null, r: 2400, a: 0.22, mottle: 0.70, city: 0, drape: 62, rim: 1 }   /* the rim mist: drapes with deckHeight */
  ];
  /* the unfocused suggestion of the city far below — blooms, never buildings (§38 "do NOT expose a
     detailed city"). Placed near the origin because the ascent vehicles go straight up from it. */
  const CITY = [];
  {
    const rnd = layout.rng('skybiome-below');
    for (let i = 0; i < 7; i++) {
      const b = -Math.PI + rnd() * TAU, r = 180 + rnd() * 1700;
      const d = layout.dir(b);
      CITY.push({ x: d.x * r, z: d.z * r, s: 320 + rnd() * 620, k: 0.35 + rnd() * 0.65 });
    }
  }

  const VOID_META = 6;    /* per vertex: ringFraction, mottle, cityAmount, alpha, bearing, depthFraction */
  function buildVoidSheets(list) {
    const nv = VOID_SEG * (VOID_RING + 1) * list.length;
    const pos = new Float32Array(nv * 3), idx = [];
    const meta = new Float32Array(nv * VOID_META);
    const ranges = [];      /* cumulative index count per sheet, so a tier can drop the shallow ones */
    let vi = 0;
    for (let s = 0; s < list.length; s++) {
      const S = list[s], base = vi;
      const rnd = layout.rng('skybiome-void-' + s);
      /* one lumpy field per sheet: three rotating sine lobes, cheap and seeded */
      const l1 = rnd() * TAU, l2 = rnd() * TAU, l3 = rnd() * TAU;
      for (let ri = 0; ri <= VOID_RING; ri++) {
        const rf = ri / VOID_RING;
        const rr = S.r * Math.pow(rf, 0.82);
        for (let ai = 0; ai < VOID_SEG; ai++) {
          const a = (ai / VOID_SEG) * TAU;
          const ux = Math.cos(a), uz = Math.sin(a);
          const x = ux * rr, z = uz * rr;
          let y = S.y;
          if (y == null) {
            /* LAW 1: the rim mist hangs a fixed distance BELOW the actual cloud floor, so it drapes
               with the deck's ridges and dips instead of lying flat under them. Clamped so it can
               never sink under the sheet drawn behind it once the deck falls away past its radius. */
            y = Math.max(layout.deckHeight(x, z) - S.drape, -110);
          }
          const o = vi * 3;
          pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
          const mot = 0.62 + 0.38 * (
            Math.sin(x * 0.0016 + l1) * Math.cos(z * 0.0013 + l2) * 0.6 +
            Math.sin((x * 0.9 + z * 1.3) * 0.0031 + l3) * 0.4);
          let city = 0;
          if (S.city > 0) {
            for (let c = 0; c < CITY.length; c++) {
              const C = CITY[c], dx = x - C.x, dz = z - C.z;
              city += C.k * Math.exp(-(dx * dx + dz * dz) / (C.s * C.s));
            }
            city *= S.city;
          }
          let rim = 1;
          if (S.rim) {
            /* THE RIM MIST FINDS THE REAL HOLES. deckSolid() is sampled at the point and four
               neighbours 70 m out: where they disagree we are under a void rim or the sunset cliff,
               which is exactly where torn cloud falls. This is why the mist pools under the actual
               VOIDS and along the cliff instead of being an even sheet nobody can read. */
            const c0 = layout.deckSolid(x, z);
            let diff = 0;
            if (layout.deckSolid(x + 70, z) !== c0) diff++;
            if (layout.deckSolid(x - 70, z) !== c0) diff++;
            if (layout.deckSolid(x, z + 70) !== c0) diff++;
            if (layout.deckSolid(x, z - 70) !== c0) diff++;
            rim = (c0 ? 0.30 : 0.85) + 0.9 * (diff / 4);
          }
          const m = vi * VOID_META;
          meta[m] = rf;
          meta[m + 1] = 1 + (mot - 1) * S.mottle;
          meta[m + 2] = city;
          meta[m + 3] = S.a * rim;
          /* the centre ring collapses to a point, so its bearing must come from the WEDGE it belongs
             to and not from its (degenerate) position — otherwise the whole inner fan of every sheet
             would take one arbitrary direction's colour instead of a continuous gradient */
          meta[m + 4] = layout.bearingOf(ux, uz);
          meta[m + 5] = Math.min(1, Math.abs(y / DECK.voidFloor));
          vi++;
        }
      }
      for (let ri = 0; ri < VOID_RING; ri++) {
        for (let ai = 0; ai < VOID_SEG; ai++) {
          const an = (ai + 1) % VOID_SEG;
          const a0 = base + ri * VOID_SEG + ai, a1 = base + ri * VOID_SEG + an;
          const b0 = base + (ri + 1) * VOID_SEG + ai, b1 = base + (ri + 1) * VOID_SEG + an;
          idx.push(a0, b0, a1, a1, b0, b1);
        }
      }
      ranges.push(idx.length);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nv * 4), 4));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return { geo, meta, ranges };
  }

  const voidHaze = buildVoidSheets(HAZE_SHEETS);
  const voidCloud = buildVoidSheets(CLOUD_SHEETS);
  own(voidHaze.geo); own(voidCloud.geo);
  const voidMatA = ownM(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  const voidMatB = ownM(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  voidMatA.name = 'sky-void-haze'; voidMatB.name = 'sky-void-cloud';
  const voidHazeMesh = new THREE.Mesh(voidHaze.geo, voidMatA);
  voidHazeMesh.name = 'sky-void-haze'; voidHazeMesh.renderOrder = -44; voidHazeMesh.frustumCulled = false;
  const voidCloudMesh = new THREE.Mesh(voidCloud.geo, voidMatB);
  voidCloudMesh.name = 'sky-void-cloud'; voidCloudMesh.renderOrder = -42; voidCloudMesh.frustumCulled = false;
  group.add(voidHazeMesh, voidCloudMesh);

  function paintVoid(part) {
    _cvoid.setHex(bandHex('void'));
    const col = part.geo.attributes.color.array, meta = part.meta;
    const n = meta.length / VOID_META;
    /* city light is a night fact: by day the world below is just more haze */
    const cityK = Math.pow(1 - daylight, 1.4);
    for (let i = 0; i < n; i++) {
      const m = i * VOID_META;
      const rf = meta[m], mot = meta[m + 1], city = meta[m + 2], pa = meta[m + 3];
      const bearing = meta[m + 4], dFrac = meta[m + 5];
      /* the sheet's own colour: the air at that direction just under the horizon, sinking toward the
         band's void colour with DEPTH and with distance out. Both come out of the contract; neither
         is authored here. A veil 60 m under the deck is still mostly sky; the floor is all void. */
      sky(_c, bearing, -0.30);
      const depth = smooth(0.18 + 0.62 * dFrac + 0.30 * rf);
      let r = _c.r + (_cvoid.r - _c.r) * depth;
      let g = _c.g + (_cvoid.g - _c.g) * depth;
      let b = _c.b + (_cvoid.b - _c.b) * depth;
      if (city > 0 && cityK > 0.001) {
        fill(_cfill, bearing);
        const k = city * cityK * 0.55;
        r += _cfill.r * k; g += _cfill.g * k; b += _cfill.b * k;
      }
      /* every sheet fades to nothing at its own rim, so no layer ever ends in a visible circle */
      const edge = 1 - smooth((rf - 0.72) / 0.28);
      const o = i * 4;
      col[o] = r; col[o + 1] = g; col[o + 2] = b;
      col[o + 3] = pa * mot * edge;
    }
    part.geo.attributes.color.needsUpdate = true;
  }

  /* ============================================================== 6. DISTANT PEAKS (§16) ===== */
  /* Mountains from the world below, piercing the cloud sea 4.7-7.2 km out. Five of them and no more:
     they are proof that this realm sits above the same planet, not scenery in their own right.

     Each is a main massif plus one shoulder, because a single cone at 5 km reads as a party hat. Each
     is sunk so that a little over half its height is under the local cloud sea — and the sea level is
     layout.deckHeight() at that peak's own xz, not zero (LAW 1), so a peak stands correctly in the
     surface the terrain module actually builds. The lowest 90 m of visible rock also dissolves into
     the sea colour, which is what guarantees the requirement that a peak reads BEHIND the cloud sea's
     edge and never in front of it, even if the near cloud is absent or the camera drops below it. */
  /* nine rows rather than six: a rounded summit closing with a vertical tangent needs the resolution
     near the top, and at six the dome read as a stack of rings */
  const PEAK_SIDES = 16, PEAK_ROWS = 9;
  const peakOrder = layout.PEAKS.map((p, i) => i).sort((a, b) => (layout.PEAKS[b].h / layout.PEAKS[b].r) - (layout.PEAKS[a].h / layout.PEAKS[a].r));
  const peakRanges = [];                 /* cumulative index counts, in prominence order, for setQuality */
  let peaksGeo = null, peaksBE = null, peaksSea = null, peaksNrm = null, peaksHaze = null;
  {
    const pos = [], idx = [], sea = [], hz = [];
    const cone = (cx, cz, baseY, w, h, seed, squash, twist) => {
      const rnd = layout.rng(seed);
      const spur = new Float32Array(PEAK_SIDES);
      for (let i = 0; i < PEAK_SIDES; i++) spur[i] = 0.68 + rnd() * 0.62;
      const first = pos.length / 3;
      for (let ri = 0; ri <= PEAK_ROWS; ri++) {
        const u = ri / PEAK_ROWS;
        /* ROUNDED, NOT POINTY (v8, on direction). This was pow(1 - u, 1.32): concave, flaring at the
           foot and steepening to a sharp apex — a cone, and the render showed a row of sharp pink
           triangles on the horizon. pow(1 - u*u, 0.42) is the opposite curve: broad shoulders that
           hold their width most of the way up, then a summit that closes with a vertical tangent,
           which is what makes a silhouette read as a domed massif instead of a spike. Measured on
           the same peak, the radius at 80% height goes from 12% of the base to 65% of it. */
        const rw = w * Math.pow(1 - u * u, 0.42);
        const y = baseY + h * u;
        for (let ai = 0; ai < PEAK_SIDES; ai++) {
          const a = twist + (ai / PEAK_SIDES) * TAU;
          /* spurs relax toward the summit so the peak is a ridge system, not a fluted column */
          const sp = 1 + (spur[ai] - 1) * (1 - u * 0.55);
          const x = cx + Math.cos(a) * rw * sp;
          const z = cz + Math.sin(a) * rw * sp * squash;
          pos.push(x, y, z);
        }
      }
      /* winding: (a0, b0, a1) is the OUTWARD face for a ring that advances counter-clockwise in xz.
         Getting this backwards makes a mountain into a hole in the sky under FrontSide rendering, and
         it is invisible in a wireframe, so it is spelled out here rather than left to be discovered. */
      for (let ri = 0; ri < PEAK_ROWS; ri++) {
        for (let ai = 0; ai < PEAK_SIDES; ai++) {
          const an = (ai + 1) % PEAK_SIDES;
          const a0 = first + ri * PEAK_SIDES + ai, a1 = first + ri * PEAK_SIDES + an;
          const b0 = first + (ri + 1) * PEAK_SIDES + ai, b1 = first + (ri + 1) * PEAK_SIDES + an;
          if (ri === PEAK_ROWS - 1) idx.push(a0, b0, a1);          /* the summit row is a single fan */
          else idx.push(a0, b0, a1, a1, b0, b1);
        }
      }
    };
    for (let k = 0; k < peakOrder.length; k++) {
      const P = layout.PEAKS[peakOrder[k]];
      const d = layout.dir(P.bearing);
      const cx = d.x * P.r, cz = d.z * P.r;
      const seaY = layout.deckHeight(cx, cz);       /* LAW 1 */
      const rnd = layout.rng('skybiome-peak-' + peakOrder[k]);
      const twist = rnd() * TAU, squash = 0.72 + rnd() * 0.46;
      /* 36% of the mountain is under the cloud. Enough that it unarguably RISES OUT of the sea rather
         than sitting on it, and no more, because every metre spent under the cloud is a metre of
         apparent height given away — at 0.44 the tallest summit stood only 5.1 deg above the deck. */
      cone(cx, cz, seaY - P.h * 0.36, P.w, P.h, 'peak-main-' + peakOrder[k], squash, twist);
      /* the shoulder: lower, offset along the range's own axis, so the massif has a profile */
      const sa = twist + 1.1 + rnd() * 1.6, so = P.w * (0.62 + rnd() * 0.36);
      cone(cx + Math.cos(sa) * so, cz + Math.sin(sa) * so, seaY - P.h * 0.34,
        P.w * (0.52 + rnd() * 0.22), P.h * (0.48 + rnd() * 0.22), 'peak-shoulder-' + peakOrder[k], squash * 0.9, twist + 0.7);
      const vTotal = pos.length / 3;
      while (sea.length < vTotal) { sea.push(seaY); hz.push(P.r); }
      peakRanges.push(idx.length);
    }
    peaksGeo = own(new THREE.BufferGeometry());
    peaksGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    peaksGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    peaksGeo.setIndex(idx);
    peaksGeo.computeVertexNormals();
    peaksGeo.computeBoundingSphere();
    peaksBE = bakeBE(peaksGeo);
    peaksSea = new Float32Array(sea);
    peaksHaze = new Float32Array(hz);
    peaksNrm = peaksGeo.attributes.normal;
  }
  const peaksMat = ownM(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  peaksMat.name = 'sky-peaks';
  const peaks = new THREE.Mesh(peaksGeo, peaksMat);
  peaks.name = 'sky-peaks'; peaks.renderOrder = -60; peaks.frustumCulled = false;
  group.add(peaks);

  function paintPeaks() {
    sunDirFor(_sunDir);
    _csun.setHex(bandHex('sun'));
    const sunI = bandScalar('sunI');
    const p = peaksGeo.attributes.position, col = peaksGeo.attributes.color.array;
    const n = p.count;
    for (let i = 0; i < n; i++) {
      const y = p.getY(i), bearing = peaksBE.b[i], e = peaksBE.e[i];
      sky(_c, bearing, e);
      /* AERIAL PERSPECTIVE. A mountain 5 km away is not a colour, it is a darker VALUE of the sky
         directly behind it, and by 7 km it is barely a value at all. 0.52 is the near end of that,
         and the haze term takes it to 0.90 of the sky at the furthest peak. */
      const haze = smooth((peaksHaze[i] - 3000) / 6000);
      const k = 0.52 + 0.48 * haze;
      let r = _c.r * k, g = _c.g * k, b = _c.b * k;
      /* THE SUN'S RIM, and only on the sunset flank: sector-A weighted so a cold-side face can never
         catch a warm edge however the sun is later moved (§15). */
      const nx = peaksNrm.getX(i), ny = peaksNrm.getY(i), nz = peaksNrm.getZ(i);
      let d = nx * _sunDir.x + ny * _sunDir.y + nz * _sunDir.z;
      if (d > 0) {
        const wA = warmA(bearing);
        const rim = d * d * d * wA * 0.46 * (sunI / 3.3);
        r += _csun.r * rim; g += _csun.g * rim; b += _csun.b * rim;
      }
      /* THE WATERLINE. Below the local cloud-sea height the rock becomes the sea, so there is never a
         hard base edge cut against the sky — the peak rises OUT of the ocean (§16). */
      const above = smooth((y - peaksSea[i]) / 90);
      if (above < 1) {
        fill(_cfill, bearing);
        sky(_csea, bearing, -0.02);
        const sr = _csea.r * 0.55 + _cfill.r * 0.45, sg = _csea.g * 0.55 + _cfill.g * 0.45, sb = _csea.b * 0.55 + _cfill.b * 0.45;
        r = sr + (r - sr) * above; g = sg + (g - sg) * above; b = sb + (b - sb) * above;
      }
      const o = i * 3;
      col[o] = r; col[o + 1] = g; col[o + 2] = b;
    }
    peaksGeo.attributes.color.needsUpdate = true;
  }

  /* ============================================================== 7. THE FAR CLOUD SEA ======= */
  /* From the handoff radius out to the horizon. This is deliberately the cheapest thing in the module
     (§46): from a deck 240 m above it, the entire outer ocean occupies about half a degree of the
     frame, so an annulus and a ring of billboards is all it can ever be worth.

     Its height is layout.deckHeight(x, z) itself, which is the only way to be certain it JOINS the
     terrain module's near cloud rather than merely being close to it (LAW 1). The relief on top of
     that fades to zero at the inner edge for the same reason. The last two rings curl gently upward
     so the cloud edge lands on the eye-level horizon instead of a degree and a half below it — the
     alternative is a permanent dark gap between the ocean and the sky. */
  const SEA_SEG = 96;
  const SEA_RINGS = [
    { r: SEA_IN, a: 0.0, curl: 0, relief: 0 },
    { r: 7150, a: 0.55, curl: 0, relief: 1 },
    { r: 7600, a: 0.86, curl: 0, relief: 1 },
    { r: 8100, a: 0.96, curl: 0, relief: 1 },
    { r: 8550, a: 1.0, curl: 0, relief: 0.9 },
    { r: DECK.seaRadius, a: 1.0, curl: 0.35, relief: 0.6 },
    { r: 9250, a: 0.9, curl: 0.78, relief: 0.25 },
    { r: 9500, a: 0.5, curl: 1.0, relief: 0 }
  ];
  const seaGeo = own(new THREE.BufferGeometry());
  const seaMeta = new Float32Array(SEA_SEG * SEA_RINGS.length * 2);   /* ringFraction, alpha */
  {
    const nv = SEA_SEG * SEA_RINGS.length;
    const pos = new Float32Array(nv * 3), idx = [];
    let vi = 0;
    for (let ri = 0; ri < SEA_RINGS.length; ri++) {
      const S = SEA_RINGS[ri];
      for (let ai = 0; ai < SEA_SEG; ai++) {
        const a = (ai / SEA_SEG) * TAU;
        const x = Math.cos(a) * S.r, z = Math.sin(a) * S.r;
        const base = layout.deckHeight(x, z);
        /* cloud-top swell: long, low crests so the far horizon has a slightly ragged edge */
        const rel = (Math.sin(x * 0.00043 + z * 0.00021) * 0.6 + Math.sin((x - z) * 0.00071) * 0.4) * 34 + 16;
        const y = base + rel * S.relief + (-25 - base) * S.curl;
        const o = vi * 3;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
        seaMeta[vi * 2] = ri / (SEA_RINGS.length - 1);
        seaMeta[vi * 2 + 1] = S.a;
        vi++;
      }
    }
    for (let ri = 0; ri < SEA_RINGS.length - 1; ri++) {
      for (let ai = 0; ai < SEA_SEG; ai++) {
        const an = (ai + 1) % SEA_SEG;
        const a0 = ri * SEA_SEG + ai, a1 = ri * SEA_SEG + an;
        const b0 = (ri + 1) * SEA_SEG + ai, b1 = (ri + 1) * SEA_SEG + an;
        idx.push(a0, b0, a1, a1, b0, b1);
      }
    }
    seaGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    seaGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nv * 4), 4));
    seaGeo.setIndex(idx);
    seaGeo.computeBoundingSphere();
  }
  const seaBE = bakeBE(seaGeo);
  const seaMat = ownM(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  seaMat.name = 'sky-far-sea';
  const farSea = new THREE.Mesh(seaGeo, seaMat);
  farSea.name = 'sky-far-sea'; farSea.renderOrder = -50; farSea.frustumCulled = false;
  group.add(farSea);

  function paintSea() {
    _csun.setHex(bandHex('sun'));
    const sunI = bandScalar('sunI');
    const col = seaGeo.attributes.color.array, n = seaMeta.length / 2;
    for (let i = 0; i < n; i++) {
      const rf = seaMeta[i * 2], alpha = seaMeta[i * 2 + 1], bearing = seaBE.b[i];
      /* near edge: the lit top of the cloud in that direction. far edge: the sky itself, so the
         ocean dissolves into the horizon instead of ending on a line. */
      fill(_cfill, bearing);
      sky(_c, bearing, -0.012);
      const t = smooth(rf);
      let r = _cfill.r + (_c.r - _cfill.r) * t;
      let g = _cfill.g + (_c.g - _cfill.g) * t;
      let b = _cfill.b + (_c.b - _cfill.b) * t;
      /* backlit cloud: the ocean burns where the sun goes into it, sector-A weighted and nowhere else */
      const wA = warmA(bearing);
      if (wA > 0.02) {
        const k = wA * wA * 0.30 * (sunI / 3.3) * (1 - t * 0.5);
        r += _csun.r * k; g += _csun.g * k; b += _csun.b * k;
      }
      const o = i * 4;
      col[o] = r; col[o + 1] = g; col[o + 2] = b; col[o + 3] = alpha;
    }
    seaGeo.attributes.color.needsUpdate = true;
  }

  /* THE FAR BANKS — the silhouette that makes a cloud ocean read as an ocean and not as a disc. Flat
     billboards standing on the sea, oriented to face the origin rather than the camera: at 8 km the
     camera can wander the whole 1.1 km deck and the angular error stays under 8 deg, so this costs
     nothing per frame and never has to be re-sorted. */
  const bankTex = ownT(bankAtlas(256));
  const BANK_N = 46;
  const bankGeo = own(new THREE.BufferGeometry());
  const bankRange = [];
  {
    const rnd = layout.rng('skybiome-banks');
    const pos = [], uv = [], idx = [];
    /* ordered so the low tiers can drop the least useful: sunset-facing banks first */
    const banks = [];
    for (let i = 0; i < BANK_N; i++) {
      const bearing = -Math.PI + rnd() * TAU;
      const r = 7100 + rnd() * 1750;
      const w = 520 + rnd() * 1250, h = 70 + rnd() * 330;
      banks.push({ bearing, r, w, h, cell: Math.floor(rnd() * 4), lift: rnd() });
    }
    banks.sort((a, b) => Math.abs(layout.angleDelta(0, a.bearing)) - Math.abs(layout.angleDelta(0, b.bearing)));
    for (let i = 0; i < banks.length; i++) {
      const B = banks[i], d = layout.dir(B.bearing);
      const cx = d.x * B.r, cz = d.z * B.r;
      /* the tangent at this bearing: the quad lies across the line of sight */
      const tx = Math.cos(B.bearing), tz = Math.sin(B.bearing);
      const base = layout.deckHeight(cx, cz) - 20;
      const hw = B.w / 2, first = pos.length / 3;
      const cu = (B.cell % 2) * 0.5, cv = Math.floor(B.cell / 2) * 0.5;
      pos.push(cx - tx * hw, base, cz - tz * hw);
      pos.push(cx + tx * hw, base, cz + tz * hw);
      pos.push(cx + tx * hw, base + B.h, cz + tz * hw);
      pos.push(cx - tx * hw, base + B.h, cz - tz * hw);
      uv.push(cu, cv, cu + 0.5, cv, cu + 0.5, cv + 0.5, cu, cv + 0.5);
      idx.push(first, first + 1, first + 2, first, first + 2, first + 3);
      bankRange.push(idx.length);
    }
    bankGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bankGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    bankGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    bankGeo.setIndex(idx);
    bankGeo.computeBoundingSphere();
  }
  const bankBE = bakeBE(bankGeo);
  const bankMat = ownM(new THREE.MeshBasicMaterial({ map: bankTex, vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, opacity: 1 }));
  bankMat.name = 'sky-far-banks';
  const farBanks = new THREE.Mesh(bankGeo, bankMat);
  farBanks.name = 'sky-far-banks'; farBanks.renderOrder = -48; farBanks.frustumCulled = false;
  group.add(farBanks);

  function paintBanks() {
    _csun.setHex(bandHex('sun'));
    const sunI = bandScalar('sunI');
    const col = bankGeo.attributes.color.array, p = bankGeo.attributes.position, n = p.count;
    for (let i = 0; i < n; i++) {
      const bearing = bankBE.b[i];
      fill(_cfill, bearing);
      sky(_c, bearing, 0.02);
      /* a bank at the horizon is mostly the sky it hangs in, lifted toward the direction's own fill */
      let r = _c.r * 0.62 + _cfill.r * 0.44;
      let g = _c.g * 0.62 + _cfill.g * 0.44;
      let b = _c.b * 0.62 + _cfill.b * 0.44;
      const wA = warmA(bearing);
      if (wA > 0.02) {
        const k = wA * wA * 0.42 * (sunI / 3.3);
        r += _csun.r * k; g += _csun.g * k; b += _csun.b * k;
      }
      const o = i * 3;
      col[o] = r; col[o + 1] = g; col[o + 2] = b;
    }
    bankGeo.attributes.color.needsUpdate = true;
  }

  /* THE LIMB — the thin luminous lip of the atmosphere sitting exactly on the cloud horizon. Drawn
     AFTER the sea so it glows in front of the far cloud edge rather than under it, which is the one
     thing that stops a 9 km annulus from ending on a hard line. Present all the way round, because
     the limb is the air itself; warm only in sector A, because the sun is (§15). */
  const limb = latLongBand(9440, 96, 6, -0.085, 0.135);
  const limbGeo = own(limb.geo);
  const limbBE = bakeBE(limbGeo);
  limbGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(limbGeo.attributes.position.count * 3), 3));
  const limbMat = ownM(new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, fog: false, side: THREE.BackSide, opacity: 1
  }));
  limbMat.name = 'sky-limb';
  const limbMesh = new THREE.Mesh(limbGeo, limbMat);
  limbMesh.name = 'sky-limb'; limbMesh.renderOrder = -46; limbMesh.frustumCulled = false;
  group.add(limbMesh);

  function paintLimb() {
    _csun.setHex(bandHex('sun'));
    const sunI = bandScalar('sunI');
    const col = limbGeo.attributes.color.array, n = limbGeo.attributes.position.count;
    for (let i = 0; i < n; i++) {
      const e = limbBE.e[i], bearing = limbBE.b[i];
      /* centred just under the geometric horizon, where the cloud ocean's own edge actually sits */
      const de = e + 0.018;
      const s = de > 0 ? 0.062 : 0.030;
      const prof = Math.exp(-(de * de) / (s * s));
      sky(_c, bearing, 0.0);
      const wA = warmA(bearing);
      const k = prof * (0.16 + 0.22 * (sunI / 3.3));
      const warm = wA * wA * prof * 0.30 * (sunI / 3.3);
      const o = i * 3;
      col[o] = _c.r * k + _csun.r * warm;
      col[o + 1] = _c.g * k + _csun.g * warm;
      col[o + 2] = _c.b * k + _csun.b * warm;
    }
    limbGeo.attributes.color.needsUpdate = true;
  }

  /* =============================================================== the contract surface ====== */
  if (ctx && ctx.scene && !group.parent) ctx.scene.add(group);

  function setTime(state) {
    const b = state && state.band;
    /* atmoBand() is the contract's own converter from the clock's eight bands to this atmosphere's
       four keys, and it returns a BLEND rather than a snap. Prefer it always: it is what keeps the
       sky continuous through a sunset instead of cutting from dusk to night in one frame. A caller
       that hands over a bare key name still works, because pairOf() accepts either. */
    if (layout.atmoBand && state && (state.band || typeof state.sunElevation === 'number')) BAND = layout.atmoBand(state);
    else if (b && layout.ATMO[b]) BAND = b;
    if (state && typeof state.daylight === 'number') daylight = state.daylight;
    else if (state && typeof state.sunElevation === 'number') daylight = smooth((state.sunElevation + 0.20) / 0.55);
    else daylight = 1 - bandScalar('stars');
    paintDome();
    placeSun();
    paintAirglow();
    paintVoid(voidHaze);
    paintVoid(voidCloud);
    paintPeaks();
    paintSea();
    paintBanks();
    paintLimb();
    /* stars, airglow and aurora are night sky: they wash out on the band's own stars key, so the
       cold side keeps a trace of them through dusk and dawn and loses them entirely at noon (§18).
       Cached here because update() reads it every frame and must not re-resolve the band blend. */
    starLevel = bandScalar('stars');
    starMat.opacity = 0.92 * starLevel;
    stars.visible = starLevel > 0.01;
    airglowMat.opacity = starLevel;
    airglowMesh.visible = starLevel > 0.01 && tierName !== 'low';
    auroraMat.opacity = 0.6 * starLevel;
    aurora.visible = starLevel > 0.02 && tierName !== 'low';
    limbMat.opacity = 1;
    return state;
  }

  /* NATURE IS NOT REPAINTED BY THE THEME (§41). The dome, sun, stars, void, peaks and cloud sea all
     ignore this. Only the aurora responds, because the brief names it as the one MAHGIC in the sky. */
  function setTheme(t) {
    if (!t) return theme;
    theme = t;
    paintAurora();
    return theme;
  }

  /* ZERO ALLOCATION. Scalar writes and in-place .set() only — nothing here constructs an object. */
  let auroraDrift = 0;
  function update(t, dt, camera) {
    /* the lower cloud decks drift: 6e-7 rad/ms is about 1.2 m/s at 2 km, which is a real cloud's
       pace at that scale and reads as "the world below is moving", never as a spinning disc */
    voidCloudMesh.rotation.y = t * 6e-7;
    /* the far banks creep at a twentieth of that: perceptible over a minute, invisible in a frame */
    farBanks.rotation.y = t * 3e-8;
    /* the aurora is the only thing in this sky that is allowed to breathe, and it does so slowly
       enough (105 s period) that it reads as weather rather than as an effect */
    auroraDrift = 0.5 + 0.5 * Math.sin(t * 6e-5);
    if (aurora.visible) {
      aurora.rotation.y = t * 2.2e-7;
      auroraMat.opacity = 0.6 * starLevel * (0.35 + 0.65 * auroraDrift);
    }
    /* the halo swells by two percent over half a minute: enough that the sun is not a decal */
    const s = 3600 * (1 + 0.02 * Math.sin(t * 2.1e-4));
    sunHalo.scale.set(s, s, 1);
    void dt; void camera;
  }

  /* Tiers come from the shared contract so this module degrades in step with the cloud, structure and
     life modules rather than inventing its own idea of "low" (§45). */
  function setQuality(tier) {
    const name = typeof tier === 'string' ? tier : (tier && tier.name) || 'high';
    const Q = layout.QUALITY[name] || layout.QUALITY.high;
    tierName = layout.QUALITY[name] ? name : 'high';
    /* peaks are ordered by angular prominence, so cutting the tail loses the least readable ones */
    const keep = Math.max(1, Math.min(peakRanges.length, Q.peaks | 0));
    peaksGeo.setDrawRange(0, peakRanges[keep - 1]);
    /* the far banks thin out with the mist budget; the sunset-facing ones are first in the buffer */
    const bk = Math.max(6, Math.round(bankRange.length * (0.25 + 0.75 * Q.mist)));
    bankGeo.setDrawRange(0, bankRange[Math.min(bankRange.length, bk) - 1]);
    starGeo.setDrawRange(0, Math.max(40, Math.round(starCount * (STAR_FRACTION[tierName] || 1))));
    /* SHEETS ARE FILL, and full-screen transparent fill is what actually costs on a phone (§45). They
       are laid deepest-first, so cutting the tail drops the SHALLOW layers and keeps the ones that
       close the bottom — the void stays bottomless, it just has fewer veils in it. */
    const hz = voidHaze.ranges;
    voidHaze.geo.setDrawRange(0, hz[Math.max(0, Math.min(hz.length, Math.round(hz.length * (0.5 + 0.5 * Q.mist)))) - 1] || hz[hz.length - 1]);
    /* the drifting lower decks are the most expensive fill in the module and the least load-bearing */
    voidCloudMesh.visible = tierName !== 'low';
    airglowMesh.visible = tierName !== 'low' && starLevel > 0.01;
    aurora.visible = tierName !== 'low' && starLevel > 0.02;
    return tierName;
  }

  /* What this module wants the ASSEMBLY to set as scene fog. Nothing here is fogged — every object it
     owns is fog:false and carries painted aerial perspective — so these numbers exist purely for the
     solid modules. The colour has to be one number for a directional sky, so it is the bearing-average
     of the horizon with the sunset view weighted double: that is where the player is looking, and the
     directional truth lives in the dome (§41), not in the fog. */
  function fog(bandIn) {
    const b = (bandIn && (layout.ATMO[bandIn] || (typeof bandIn === 'object' && bandIn.a))) ? bandIn : BAND;
    let r = 0, g = 0, bl = 0, w = 0;
    for (let i = 0; i < 24; i++) {
      const bearing = -Math.PI + (i + 0.5) * (TAU / 24);
      const wt = 1 + 1.2 * Math.max(0, Math.cos(bearing));
      const hx = layout.atmosphere(bearing, 0.045, b);
      r += ((hx >> 16) & 255) * wt; g += ((hx >> 8) & 255) * wt; bl += (hx & 255) * wt; w += wt;
    }
    /* near/far blend across a band pair for the same reason the colour does: a fog plane that jumps
       1200 m at the dusk-to-night boundary pops every silhouette in the realm at once */
    const p = pairOf(b), t = p.t || 0;
    const FA = FOG_BAND[p.a] || FOG_BAND.dusk, FB = FOG_BAND[p.b] || FOG_BAND.dusk;
    return {
      color: ((Math.round(r / w) << 16) | (Math.round(g / w) << 8) | Math.round(bl / w)) >>> 0,
      near: FA.near + (FB.near - FA.near) * t,
      far: FA.far + (FB.far - FA.far) * t,
      band: b
    };
  }

  /* The dome's OWN vertex colours, sampled at the nearest vertex to a direction. This exists so the
     directional gradient can be PROVEN from outside the module rather than recomputed and assumed. */
  function sampleDome(bearing, elevation, out) {
    let best = -1, bestD = Infinity;
    const e = elevation || 0;
    for (let i = 0; i < domeN; i++) {
      if (domePole[i]) continue;
      const db = Math.abs(layout.angleDelta(domeBE.b[i], bearing)), de = Math.abs(domeBE.e[i] - e);
      const d = db * db + de * de * 9;
      if (d < bestD) { bestD = d; best = i; }
    }
    const c = out || new THREE.Color();
    c.setRGB(domeCol[best * 3], domeCol[best * 3 + 1], domeCol[best * 3 + 2]);
    return c;
  }

  function dispose() {
    if (group.parent) group.parent.remove(group);
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
  }

  /* ---- initial state, then MEASURE. Draw calls and triangles are counted off the built scene graph,
     not estimated from the source, because an estimate has never once caught a mistake here. */
  paintAurora();
  setTime((ctx && ctx.clock && ctx.clock.state && ctx.clock.state()) || { band: 'dusk', daylight: 0.35 });
  setQuality((ctx && ctx.quality) || 'high');
  update(0, 0, null);

  const stats = { module: 'sky-atmosphere', drawCalls: 0, triangles: 0, points: starCount };
  group.traverse(o => {
    if (o.isPoints) { stats.drawCalls++; return; }
    if (!o.isMesh && !o.isSprite) return;
    stats.drawCalls++;
    if (o.isSprite) { stats.triangles += 2; return; }
    const g = o.geometry;
    const n = g.index ? g.index.count : g.attributes.position.count;
    stats.triangles += Math.round(n / 3);
  });
  stats.domeVertices = domeN;
  stats.peaks = peakRanges.length;
  stats.banks = bankRange.length;
  stats.voidLayers = HAZE_SHEETS.length + CLOUD_SHEETS.length;
  /* the contract assertion this module most needs to be true: every named void really is a hole, so
     the rim mist and the depth layers are pointing at open air and not at solid cloud (LAW 1) */
  stats.voidsOpen = layout.VOIDS.filter(v => { const d = layout.dir(v.bearing); return !layout.deckSolid(d.x * v.r, d.z * v.r); }).length;
  stats.voidsTotal = layout.VOIDS.length;
  stats.seaHandoffRadius = SEA_IN;
  Object.defineProperty(stats, 'band', { get: () => bandLabel() });
  Object.defineProperty(stats, 'bandBlend', { get: () => BAND });
  Object.defineProperty(stats, 'quality', { get: () => tierName });

  return { group, setTime, setTheme, update, setQuality, dispose, stats, fog, sampleDome, dome, peaks, farSea, stars: stars };

  /* ---- local geometry helpers ------------------------------------------------------------- */
  /* A lat-long band on a sphere: the shape every atmospheric layer in this module wants, because a
     band defined in ELEVATION lines up with atmosphere()'s own elevation parameter exactly. */
  function latLongBand(radius, uSeg, vSeg, e0, e1) {
    const nv = (uSeg + 1) * (vSeg + 1);
    const pos = new Float32Array(nv * 3), idx = [];
    let vi = 0;
    for (let i = 0; i <= uSeg; i++) {
      const bearing = -Math.PI + (i / uSeg) * TAU;
      const d = layout.dir(bearing);
      for (let j = 0; j <= vSeg; j++) {
        const e = e0 + (e1 - e0) * (j / vSeg);
        const rh = radius * Math.sqrt(Math.max(0, 1 - e * e));
        const o = vi * 3;
        pos[o] = d.x * rh; pos[o + 1] = radius * e; pos[o + 2] = d.z * rh;
        vi++;
      }
    }
    for (let i = 0; i < uSeg; i++) {
      for (let j = 0; j < vSeg; j++) {
        const a = i * (vSeg + 1) + j;
        idx.push(a, a + 1, a + vSeg + 1, a + 1, a + vSeg + 2, a + vSeg + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return { geo };
  }
}

/* ---- procedural textures ------------------------------------------------------------------
   Three small canvases, no assets. */

/* The sun's halo: a WIDE, long-tailed falloff whose core never exceeds half alpha, so that at the
   material's own 0.42 the brightest pixel lands near 0.21 additive. That is what keeps it reading as
   atmosphere around a disc rather than as a second, larger, blown-out disc (§15). */
function haloTexture() {
  return canvasTexture(256, 256, (g, W) => {
    const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    r.addColorStop(0, 'rgba(255,255,255,0.50)');
    r.addColorStop(0.10, 'rgba(255,250,240,0.34)');
    r.addColorStop(0.22, 'rgba(255,242,224,0.18)');
    r.addColorStop(0.40, 'rgba(255,235,212,0.070)');
    r.addColorStop(0.62, 'rgba(255,228,204,0.024)');
    r.addColorStop(0.84, 'rgba(255,224,200,0.006)');
    r.addColorStop(1, 'rgba(255,220,196,0)');
    g.clearRect(0, 0, W, W); g.fillStyle = r; g.fillRect(0, 0, W, W);
  });
}

/* A star: a soft round dot with a feathered edge, so a 2.6 px point does not read as a square. */
function dotTexture() {
  return canvasTexture(32, 32, (g, W) => {
    const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.35, 'rgba(255,255,255,0.62)');
    r.addColorStop(0.72, 'rgba(255,255,255,0.12)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.clearRect(0, 0, W, W); g.fillStyle = r; g.fillRect(0, 0, W, W);
  });
}

/* Four far-cloud-bank silhouettes in one 2x2 atlas: wide, low, flat-bottomed masses with lumpy tops
   and edges feathered to nothing, so a bank never cuts a straight line against the sky. The colour is
   white throughout — every bank's actual colour arrives as a vertex colour from atmosphere(). */
function bankAtlas(size) {
  return canvasTexture(size, size, (g, W) => {
    const half = W / 2;
    g.clearRect(0, 0, W, W);
    for (let cell = 0; cell < 4; cell++) {
      const ox = (cell % 2) * half, oy = Math.floor(cell / 2) * half;
      let s = (cell * 7919 + 13) >>> 0;
      const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      g.save(); g.beginPath(); g.rect(ox, oy, half, half); g.clip();
      const n = 16 + Math.floor(rnd() * 8);
      for (let i = 0; i < n; i++) {
        /* blobs sit low in the cell and spread wide: a bank is a horizon mass, not a puff */
        const fx = 0.5 + (rnd() - 0.5) * 0.78;
        const fy = 0.66 + (rnd() - 0.5) * 0.44;
        const rad = half * (0.10 + rnd() * 0.17);
        const a = 0.16 + rnd() * 0.20;
        g.save();
        g.translate(ox + fx * half, oy + fy * half);
        g.scale(1.55, 0.62);
        const grad = g.createRadialGradient(0, 0, rad * 0.15, 0, 0, rad);
        grad.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
        grad.addColorStop(0.55, 'rgba(255,255,255,' + (a * 0.55).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      /* feather the cell's own border so nothing bleeds across an atlas seam */
      const fade = g.createLinearGradient(ox, 0, ox + half, 0);
      fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.10, 'rgba(0,0,0,0)');
      fade.addColorStop(0.90, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(ox, oy, half, half);
      const fade2 = g.createLinearGradient(0, oy, 0, oy + half);
      fade2.addColorStop(0, 'rgba(0,0,0,1)'); fade2.addColorStop(0.14, 'rgba(0,0,0,0)');
      fade2.addColorStop(0.92, 'rgba(0,0,0,0)'); fade2.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = fade2; g.fillRect(ox, oy, half, half);
      g.globalCompositeOperation = 'source-over';
      g.restore();
    }
  });
}

export default buildSkyAtmosphere;
