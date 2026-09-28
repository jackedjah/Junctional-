/* MAHWORLD M12 :: SPECTRAL AURA (owner pivot 2026-09-26: "aura / magic energy language").
   One restrained, prismatic energy language for the whole world: a soft bloom in the owner's class tint, crossed by a thin spectral
   interference ring and faint concentric fringes that drift slowly — violet → ice blue → white → gold → pink (M16: → crimson, all five classes in equal
   measure). It sits AROUND powerful
   things (landmarks, energy architecture, crystal crowns, the Veil Falls mist, selected sky moments), never as a colour wash over the map.
   Colour law: every stop is a class-family colour (violet = VISIONARY purple, ice blue = the TITAN blue family's light end, gold = ATHLETE,
   pink = BAGE) or neutral white; the gradient passes through white between ice blue and gold, so no blend reaches green or teal.
   Cost: every aura in a field is one instanced, camera-facing quad in ONE draw call (additive, no depth write, depth-tested so a building
   hides the part of its own aura behind its silhouette — the light reads as emanating from around it). Day is restrained, night stronger.
   LOW tier keeps the bloom and drops the fringes. */

import { celestialDirection } from './celestial.js';
import { createAuraForms, createFloatingCrystals } from './auraForms.js';
import { HALO_LAYOUT } from '../../play/haloLayout.js';
import { createAmbientMagic } from './ambientMagic.js'; import { groundYAt } from './worldLayout.js'; import { combatZoneCircles } from './combatZones.js';   /* M20 ambient magic ecology: built and driven by this module (the aura language's living layer) */

export var SPECTRAL = { violet: 0xb48cff, ice: 0x7fd0ff, white: 0xf4f6ff, gold: 0xffd88a, pink: 0xff9ad2 };
export var CLASS_TINT = { gold: 0xe6c36a, blue: 0x5a8cf0, purple: 0x9a78e0, pink: 0xf08ab8, red: 0xd4344a, white: 0xf4f6ff };
/* M16 (owner 2026-09-27: the world was drifting PURPLE — purple is VISIONARY, not the generic colour of magic): the light-end crystal tints of
   all FIVE classes, for shared magic that should acknowledge the whole civilization rather than default to violet. */
export var CRYSTAL_TINT = { gold: 0xffd88a, blue: 0x8fb4ff, red: 0xff6f82, purple: 0xb99cff, pink: 0xffa6d4, white: 0xf4f6ff };

var VERT = [
  'attribute vec3 aP; attribute vec4 aS; attribute vec3 aC; attribute vec4 aK; attribute vec4 aX;',   /* aX.w: the prism (0 five-class, 1 the NEXUS gold / pearl) */
  'uniform float uTime;',
  'varying vec2 vUv; varying vec3 vC; varying vec4 vK; varying vec4 vS; varying vec4 vX; varying float vNear;',
  'void main() { vUv = position.xy; vC = aC; vK = aK; vS = aS; vX = aX;',
  '  vec4 mv = viewMatrix * vec4(aP, 1.0); vNear = smoothstep(3.0, 22.0, -mv.z);',   /* M14: an aura goes faint as the viewer walks into it (never in anyone's face) */
  '  float s = aS.x * (1.0 + 0.035 * sin(uTime * 0.29 + aK.z * 3.7)); mv.xy += position.xy * vec2(s, s * aS.y);',   /* M14: a slow breath in size, not only in brightness */   /* camera-facing quad; aS.y stretches it vertically (columns, falls) */
  '  mv.z += aS.w;',                                                 /* pull toward the camera (m) so a halo is not cut by its own emitter */
  '  gl_Position = projectionMatrix * mv; }'
].join('\n');

var FRAG = [
  'uniform float uTime; uniform float uGlobal; uniform float uFringe; uniform float uNight; uniform float uRingK; uniform float uBreakMin;',
  'varying vec2 vUv; varying vec3 vC; varying vec4 vK; varying vec4 vS; varying vec4 vX; varying float vNear;',
  'float auH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  'float auN(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(auH(vec2(i, 1.7)), auH(vec2(i + 1.0, 1.7)), f); }',
  'vec3 spectral(float t) { t = fract(t) * 7.0;',   /* M16 five-class prism, seven equal steps: violet → ice blue → white → gold → white → pink → crimson → violet (violet held ~40 % of the old cycle and crimson none) */
  '  vec3 v = vec3(0.706, 0.549, 1.0), i = vec3(0.498, 0.816, 1.0), w = vec3(0.957, 0.965, 1.0), g = vec3(1.0, 0.847, 0.541), p = vec3(1.0, 0.604, 0.824), c = vec3(1.0, 0.44, 0.51);',
  '  if (t < 1.0) return mix(v, i, t); if (t < 2.0) return mix(i, w, t - 1.0); if (t < 3.0) return mix(w, g, t - 2.0); if (t < 4.0) return mix(g, w, t - 3.0);',
  '  if (t < 5.0) return mix(w, p, t - 4.0); if (t < 6.0) return mix(p, c, t - 5.0); return mix(c, v, t - 6.0); }',   /* gold sits between two whites (gold straight into pink or crimson would pass orange); pink → crimson → violet stay pink / red */
  'vec3 prism(float t) { if (vX.w < 0.5) return spectral(t); float k = 0.5 - 0.5 * cos(6.2831853 * t); return mix(vec3(0.95), vec3(1.0, 0.847, 0.541), k); }',   /* M20 CLASS IDENTITY (owner 2026-09-28: "PURPLE remains VISIONARY — not generic magic"): a SHARED element (the NEXUS emblem, the Sun\'s halo) runs the gold / pearl prism — gold at the band centre easing to equal-channel pearl at its edges and back, never violet or ice (the five-class prism opens on violet) */
  'vec3 vivid(float t) { t = clamp(t, 0.0, 1.0); vec3 i = vec3(0.498, 0.816, 1.0), v = vec3(0.706, 0.549, 1.0), p = vec3(1.0, 0.604, 0.824), g = vec3(1.0, 0.847, 0.541);',   /* a vivid prismatic band, ice → violet → pink → gold: it turns through magenta, never green */
  '  if (t < 0.33) return mix(i, v, t / 0.33); if (t < 0.66) return mix(v, p, (t - 0.33) / 0.33); return mix(p, g, (t - 0.66) / 0.34); }',
  'void main() { float r = length(vUv); if (r > 1.0) discard;',
  '  float ang = atan(vUv.y, vUv.x), ph = vK.z, t = uTime;',
  '  float bloom = pow(1.0 - r, 2.4) * (0.85 + 0.15 * sin(t * 0.7 + ph));',   /* soft core, a slow breath */
  '  float ringR = vS.z, ringW = max(0.02, vK.w) * mix(1.0, 1.6, step(uRingK, 0.99));',   /* M20: a softened ring is 1.6x wider … */
  '  float rr = (r - ringR) / ringW; float band = exp(-rr * rr * 1.4) * step(0.001, ringR) * uRingK;',   /* … and fainter: a haze of light round the emitter, not a drawn circle */
  '  float arc = vX.x > 0.5 ? smoothstep(-0.05, 0.45, vUv.y / max(r, 1e-3)) : 1.0;',   /* 1 = an upper arc only (a mist-bow), never a full UI circle */
  '  float brk = mix(1.0, smoothstep(0.25, 0.85, auN(ang * 2.6 + ph * 3.0 + t * 0.04) * 0.7 + auN(ang * 7.0 - t * 0.07) * 0.3), max(vX.y, uBreakMin));',   /* the ring breaks into soft arcs (M20: never less than uBreakMin — no closed UI circle anywhere) */
  '  float shimmer = 0.78 + 0.22 * sin(ang * 5.0 + t * 0.45 + ph) * sin(ang * 3.0 - t * 0.31 + ph * 1.7);',
  '  float viv = clamp(vK.y - 1.0, 0.0, 1.0), spk = min(vK.y, 1.0);',   /* spectral > 1: the vivid band (the Veil glory); ≤ 1: pearl-soft, unchanged */
  '  vec3 sp = mix(mix(prism(rr * 0.22 + 0.5 + 0.04 * sin(t * 0.2 + ph)), vec3(1.0), 0.3), vivid(rr * 0.3 + 0.5), viv);',
  '  vec3 col = vC * bloom + sp * band * spk * shimmer * arc * brk;',
  '  col += prism(r * 2.6 - t * 0.035 + ph) * bloom * 0.22 * spk * uFringe;',   /* faint interference fringes inside the bloom */
  '  float edge = 1.0 - smoothstep(0.86, 1.0, r);',
  '  gl_FragColor = vec4(col * vK.x * uGlobal * mix(1.0, vX.z, uNight) * edge * vNear, 1.0); }'
].join('\n');

/* items: [{ x, y, z, size (m, quad half-extent), aspect (vertical stretch, 1 = round), ring (0..1 ring radius as a fraction of the quad; 0 =
   no ring), ringW (ring half-width as a fraction), tint (hex, the bloom colour), spectral (0..1 ring / fringe strength; 1..2 blends the ring toward the vivid prismatic band), intensity (day
   brightness, ~0.2–1), pull (m toward the camera), phase }]. Returns { mesh, uniforms, setNight(n), tick(t), count }. */
/* extra per item: arc (1 = upper arc only), breakup (0..1, the ring dissolves into soft arcs; default 0.75), nightK (night brightness factor; default 1),
   prism ('gold' = the NEXUS gold / pearl prism for a shared element; default the five-class prism) */
/* opts: isNight, tier, name, renderOrder, day / night (global levels), cull (true for a fixed field: frustum-cull it as one sphere),
   ringK (ring strength, default 0.55 — M20: rings are a soft haze; 1 = the old full-strength line), breakMin (the least ring breakup, default 0.85) */
export function createAuraField(THREE, items, opts) {
  opts = opts || {}; var n = items.length; if (!n) return null;
  var base = new THREE.PlaneGeometry(2, 2); var g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.instanceCount = n;
  var P = new Float32Array(n * 3), S = new Float32Array(n * 4), C = new Float32Array(n * 3), K = new Float32Array(n * 4), X = new Float32Array(n * 4), col = new THREE.Color();
  items.forEach(function (it, i) { P[i * 3] = it.x; P[i * 3 + 1] = it.y; P[i * 3 + 2] = it.z;
    S[i * 4] = it.size || 10; S[i * 4 + 1] = it.aspect || 1; S[i * 4 + 2] = it.ring === undefined ? 0.62 : it.ring; S[i * 4 + 3] = it.pull || 0;
    col.set(it.tint === undefined ? SPECTRAL.white : it.tint); C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b;
    K[i * 4] = it.intensity === undefined ? 0.5 : it.intensity; K[i * 4 + 1] = it.spectral === undefined ? 0.6 : it.spectral; K[i * 4 + 2] = it.phase === undefined ? i * 1.37 : it.phase; K[i * 4 + 3] = it.ringW === undefined ? 0.06 : it.ringW; X[i * 4] = it.arc ? 1 : 0; X[i * 4 + 1] = it.breakup === undefined ? 0.75 : it.breakup; X[i * 4 + 2] = it.nightK === undefined ? 1 : it.nightK; X[i * 4 + 3] = it.prism === 'gold' ? 1 : 0; });
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(S, 4)); g.setAttribute('aC', new THREE.InstancedBufferAttribute(C, 3)); g.setAttribute('aK', new THREE.InstancedBufferAttribute(K, 4)); g.setAttribute('aX', new THREE.InstancedBufferAttribute(X, 4));
  var day = opts.day === undefined ? 0.55 : opts.day, nightK = opts.night === undefined ? 1.0 : opts.night;
  var uniforms = { uTime: { value: 0 }, uGlobal: { value: opts.isNight ? nightK : day }, uFringe: { value: opts.tier === 'LOW' ? 0 : 1 }, uNight: { value: opts.isNight ? 1 : 0 }, uRingK: { value: opts.ringK === undefined ? 0.55 : opts.ringK }, uBreakMin: { value: opts.breakMin === undefined ? 0.85 : opts.breakMin } };   /* M20: every field's rings are softened by default (the civic emblem and HALO fields included) */
  var mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, toneMapped: false });
  var mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
  if (opts.cull) { var cx = 0, cy = 0, cz = 0, R = 0; items.forEach(function (it) { cx += it.x / n; cy += it.y / n; cz += it.z / n; });   /* a fixed local field (no followers) can be frustum-culled: one sphere round every quad at its full reach */
    items.forEach(function (it) { R = Math.max(R, Math.hypot(it.x - cx, it.y - cy, it.z - cz) + (it.size || 10) * Math.max(1, it.aspect || 1) + (it.pull || 0)); });
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), R); mesh.frustumCulled = true; } mesh.renderOrder = opts.renderOrder === undefined ? 12 : opts.renderOrder; mesh.name = opts.name || 'SPECTRAL_AURA'; mesh.userData.noMerge = true;
  base.dispose();
  return { mesh: mesh, uniforms: uniforms, count: n, positions: g.attributes.aP,
    setNight: function (nn) { uniforms.uGlobal.value = nn ? nightK : day; uniforms.uNight.value = nn ? 1 : 0; },
    tick: function (t) { uniforms.uTime.value = t || 0; },
    dispose: function () { g.dispose(); mat.dispose(); } };
}

/* A world module: other modules push aura requests into ctx.auraRequests during their build; this module (built after them) turns every
   request into one field. Requests may carry a `follow` function returning [x, y, z] (re-read each tick, e.g. a sky phenomenon). */
export function createAura(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var field = null, night = !!ctx.night, followers = [];
  function tier() { try { return ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { return 'HIGH'; } }
  /* SELECTED SKY MOMENTS: a 22° halo that forms round the Sun for about a minute every five minutes by day, and a faint corona round the
     lavender Moon at night. Both ride camera-relative at 870 m along the celestial directions (in front of the 900 m bodies), so they stay
     locked to the Sun / Moon wherever the viewer is. Additive and depth-tested: terrain and cloud bodies occlude them; the Moon disc itself
     is untouched. */
  function skyMoments(req) { var reg = ctx.registry || {}, C = reg.celestial; if (!C || !ctx.cameraPos) return; var D = 870;
    var sd = celestialDirection(C.sun, 'sun'), sl = Math.hypot(sd[0], sd[1], sd[2]) || 1, md = celestialDirection(C.moon, 'moon'), ml = Math.hypot(md[0], md[1], md[2]) || 1;
    function at(d, l) { return function () { var c = ctx.cameraPos(); return [c.x + d[0] / l * D, c.y + d[1] / l * D, c.z + d[2] / l * D]; }; }
    var sunHalf = ((C.sun && +C.sun.apparent_deg) || 6.5) / 2, moonHalf = ((C.moon && +C.moon.apparent_deg) || 11) / 2;   /* M14: drawn in the sky backdrop with the bodies (never over a far massif); the corona clears the larger Moon's limb */
    var haloR = D * Math.tan(Math.max(22, sunHalf * 1.38) * Math.PI / 180), coronaR = D * Math.tan(Math.max(7, moonHalf * 1.3) * Math.PI / 180);
    req.push({ x: 0, y: 0, z: 0, size: haloR / 0.8, ring: 0.8, ringW: 0.03, breakup: 0.45, tint: 0x000000, spectral: 1.0, prism: 'gold', intensity: 0.75, nightK: 0, phase: 0.7, follow: at(sd, sl),   /* M20 CLASS IDENTITY: the Sun's halo is a warm gold / pearl arc (it opened on violet and ice blue — purple is VISIONARY's) */
      fade: function (t, n) { if (n) return 0; var u = ((t % 300) + 300) % 300; return Math.min(1, Math.max(0, u / 12)) * Math.min(1, Math.max(0, (75 - u) / 12)); } });
    req.push({ x: 0, y: 0, z: 0, size: coronaR / 0.6, ring: 0.6, ringW: 0.08, breakup: 0.25, tint: 0x1e1e1e, spectral: 0.9, intensity: 0.6, phase: 1.9, follow: at(md, ml),   /* M19: a neutral equal-channel silver bloom (was 0x241c36, a violet wash ~75° wide round the Moon); the five-class ring stays */
      fade: function (t, n) { return n ? 1 : 0; } }); }
  /* M14 SKY FORMS: dimensional aura in the sky, far beyond anyone's reach — a gyroscope of two slow soft rings round the HALO dome, outside
     its shell (the rings' inner band edge clears the shell radius), and two great light frames far out over the sea. */
  function skyForms(F) { var H = HALO_LAYOUT, cy = H.arrival_height_m + 22, R = H.shell_radius_m + 32;
    F.push({ x: H.center.x, y: cy, z: H.center.z, size: R * 2, shape: 'RING', scale: [1, 40, 1], tint: 0xffd88a, intensity: 0.26, ground: 0, axis: [0.22, 1, 0.1], spin: 0.012, phase: 0.1 });
    F.push({ x: H.center.x, y: cy, z: H.center.z, size: (R + 14) * 2, shape: 'RING', scale: [1, 44, 1], tint: CRYSTAL_TINT.white, intensity: 0.22, ground: 0, axis: [1, 0.3, 0.45], spin: -0.009, phase: 0.6 });   /* M16: the HALO gyroscope is gold + TITAN blue (was gold + violet) — the shared hub is not VISIONARY's; M20: fainter (0.34 / 0.3 → 0.26 / 0.22), and the ring shader now breaks it into drifting arcs; M20 CLASS IDENTITY (owner 2026-09-28: "Correct the current BLUE dominance"): gold + pearl — the shared hub is family GOLD, and TITAN's blue stays in TITAN */
    /* M20 (owner 2026-09-27: "remove … redundant aura … visually noisy effects"): the four free-standing sky figures are REMOVED — the 110 m
       crimson hex frame over the southern sea (TS1 / V33: a pink wireframe box in the sky), the 80 m rose diamond far east (V04 night), the
       MAH MATCH octahedron (MA: a white wire gem beside the Sun) and the crimson icosahedron over the north-west terraces. Each read as a UI
       sticker pasted on the sky; the HALO gyroscope and the rings over the falls keep the dimensional language. 27 → 9 forms (curate below). */ }
  /* M20 FORM CURATION: a polyhedral frame (cube / hex / diamond / octa / icosa) is a wire outline of hard edges and points — exactly the
     "sharp objects and edges, even with the diamonds" the owner asked to lose — and low over a landmark it doubled the landmark's own crown,
     ring and halo (the gold temple wore a crystal, a hex frame, a tilted ring and two spectral rings at once). Every frame request is
     dropped here (the eight crown hex frames, the five cubes / diamonds over the region lead crystals, the Veil's hex frame over the falls —
     V21 / V33: a blue wire box in the sky); only the soft RINGS render (the HALO gyroscope, the Veil pair, the five hero crown rings), and
     they break into arcs. FRAME_MIN_Y is the one knob: frames centred above it would render again (Infinity = none). */
  var FRAME_MIN_Y = Infinity;
  /* M20 magic-ecology pass (owner: "a faint slowly turning arcane ring … high over a landmark, only if it reads as elegant, never a UI
     circle"): a ring tilted round a hero crown gem (~14 m, V13 night: an orbit ellipse round the TITAN gem, an atom icon) is dropped too;
     only the sky-scale rings stay (RING_MIN_M and up: the HALO gyroscope, the pair high over the Veil falls). */
  var RING_MIN_M = 40;
  function curate(list) { return list.filter(function (f) { var sh = typeof f.shape === 'string' ? f.shape : ['RING', 'CUBE', 'HEX', 'DIAMOND', 'OCTA', 'ICOSA'][f.shape]; return (sh === 'RING' && (f.size || 6) >= RING_MIN_M) || f.y >= FRAME_MIN_Y; }); }
  /* M19 AMBIENT LAW (owner 2026-09-27: "clearly non-interactable; sparse; stronger / firmer higher in space; faint near ground / humans; …
     no random pickup appearance"): a small figure turning a few metres over a crystal is exactly the look of a game pickup. Every local form
     under 4 m is lifted so its lowest point clears 12 m above its ground, grown to at least 3.6 m and slowed to a drift (≤ 0.03 rad/s); the
     form shader's height law then keeps it faint until it is well above people. Pure light: nothing near a hand moves, no collider. */
  function ambientLaw(list) { return list.map(function (f) { if (f.shape === 'CRYSTAL' || (f.size || 6) >= 4) return f; var g = Object.assign({}, f), s = Math.max(3.6, f.size || 0), sc = f.scale || [1, 1, 1], k = (f.shape === 'RING' ? 0.56 * Math.max(sc[0], sc[2]) : 0.9 * Math.max(sc[0], sc[1], sc[2])) * 1.035 + 0.06, low = (f.ground || 0) + 12 + s * k;
    g.size = s; g.y = Math.max(f.y, low); var sp = f.spin === undefined ? 0.06 : f.spin; if (Math.abs(sp) > 0.03) g.spin = sp < 0 ? -0.03 : 0.03; return g; }); }
  /* M15 FLOATING CRYSTALS (owner reference renders): great diamonds hanging high over the plaza, the highland, the river, TITAN and the
     north-west terrace, and two far out in the sky — all 40 m+ above the ground; modules may add more (shape 'CRYSTAL' in ctx.auraForms).
     M16 (five-class world): each takes the colour of the district it hangs over — pearl over the shared plaza, VISIONARY purple over the
     highland, ATHLETE gold over the temple, TITAN blue over the tower, LEAN crimson over the north-west terrace, TITAN blue by MAH MATCH, BAGE
     pink far out over the south-west coast, ATHLETE gold far out east (was five violet, two pink, one ice). */
  /* M16 step 2 (the five-colour audit): TITAN's ground monoliths and VISIONARY's amethyst clusters carried most of the map's expressive light
     (≈ 5 % and 2 % of their district frames) while ATHLETE, LEAN and BAGE sat near 0.2–0.5 %. The warm sanctuaries get their own skyborne
     crowns — three crystals each over the gold temple, the crimson terraces and the rose market (34–52 m up, never a ground feature: no
     collider moves) — so every class has a luminous signature of its own. */
  /* M20 (owner 2026-09-27: "Keep crystals important. But remove excessive or repetitive crystal clutter. Each crystal should feel intentional
     … scale variety"): 17 → 9 sky crystals. ONE hero gem per district (pearl over the shared plaza, VISIONARY purple, TITAN blue, and the
     warm heroes a size up at 5–5.6 m) and, for the three warm classes that carry the least ground crystal, one small 2 m companion hanging
     lower beside the hero — a deliberate pair, not a scattered trio. Removed: the three-crystal crowns (their tallest becomes the hero), the
     second TITAN gem by MAH MATCH and the two 12–14 m gems far out over the coast (more of the same diamond at every horizon).
     M20 review fix (2026-09-27): the LEAN gems (T.red here, and the Veil's crimson gem) read dusty rose by day and pastel pink by night once
     the dark gem body went neutral — the pale crystal red (0xff6f82) on a grey stone is pink, the M19 crimson-hex trap again, and it sat
     beside the BAGE pink heroes. build() gives every LEAN gem, and its bloom, the deep class crimson — CLASS_TINT.red with its blue eased
     (0xd4344a → 0xd42c3a, hue 352° → 355°, still the RED window): lit by the blue sky / hemisphere a gem renders 4–6° toward magenta, and
     with the plain class hex its rim pixels crossed into the PINK window (measured on the GR / GML gem cameras: rendered hue 346–349° and
     7–20 % PINK pixels → 349–351° and 0–6 %). */
  function skyCrystals(C) { var T = CRYSTAL_TINT; [[-30, 42, -8, 4.2, T.white], [-120, 64, 20, 5.5, T.purple], [140, 62, 150, 5.0, T.blue], [0, 56, 220, 5.6, T.gold], [-24, 38, 200, 2.2, T.gold], [-116, 52, 218, 5.4, T.red], [-96, 38, 234, 2.0, T.red], [0, 50, 282, 5.0, T.pink], [22, 37, 266, 2.0, T.pink]].forEach(function (a) { C.push({ x: a[0], y: a[1], z: a[2], size: a[3], tint: a[4], ground: 0, shape: 'CRYSTAL' }); }); }
  /* M20 AMBIENT MAGIC ECOLOGY (owner 2026-09-27, priority 7): the aura language's living layer — motes in the grove air and over the Veil
     lanes, crystal pollen off the grove crowns, light-moths at night (ambientMagic.js). Built here, after every module has published its
     data (the forest placement, the Veil's anchors). Duel courts and class houses are kept clear; the key light is the celestial direction
     the light rig uses. One draw on HIGH / MED, none on LOW. */
  function ambientOpts() { var reg = ctx.registry || {}, C = reg.celestial || {}, avoid = combatZoneCircles(reg, 4).map(function (c) { return { x: c.x, z: c.z, r: c.r }; });
    (((reg.architecture && reg.architecture.class_houses) || [])).forEach(function (h) { avoid.push({ x: h.x, z: h.z, r: 12 }); });
    return { ground: function (x, z) { return groundYAt(reg, x, z); }, avoid: avoid, key: function (n) { return celestialDirection(n ? C.moon : C.sun, n ? 'moon' : 'sun'); } }; }
  var skyField = null, forms = null, skyFollowers = [], crystals = null, formsDropped = 0, ambient = null;
  /* M20 RING CURATION (owner 2026-09-27: "remove … redundant aura … visually noisy effects"; the magic-ecology audit, V13 / V16 / FW1 at
     night): a ring drawn round a crown gem, a spire tip or a lead monolith breaks into a circle of bright beads — a dotted UI loading ring
     round the TITAN tower's gem, the gold temple's, the Veil spire's (a blue bokeh orb over the falls). Local requests keep their soft
     bloom and fringes and lose the drawn ring; only a mist-bow (an upper arc in falling water's spray) keeps its arc, and the sky moments
     (the 22° Sun halo, the lunar corona) keep theirs. The ambient ecology below carries the life the rings were standing in for. */
  function curateRings(list) { return list.map(function (r) { if (r.follow || r.arc || !(r.ring > 0)) return r; ringsDropped++; return Object.assign({}, r, { ring: 0 }); }); }
  var ringsDropped = 0;
  function build() { var req = curateRings(ctx.auraRequests || []), sky = []; skyMoments(sky);
    var cl = (ctx.auraForms || []).filter(function (f) { return f.shape === 'CRYSTAL'; }); skyCrystals(cl);
    cl = cl.map(function (c) { return c.tint === CRYSTAL_TINT.red ? Object.assign({}, c, { tint: 0xd42c3a }) : c; });   /* M20 review: a LEAN gem is the deep class crimson (hue-held for the sky light, see above), never the pale crystal red (it read pink) */
    cl.forEach(function (c) { req.push({ x: c.x, y: c.y, z: c.z, size: c.size * 2.3, aspect: 1.25, ring: 0, tint: c.tint, spectral: 0.6, intensity: 0.2, pull: c.size, nightK: 1.9, phase: (c.x * 0.01) % 6 }); });   /* each crystal's soft bloom */
    crystals = createFloatingCrystals(THREE, cl, { isNight: night, tier: tier(), name: 'WORLD_FLOATING_CRYSTALS' }); if (crystals) ctx.group.add(crystals.mesh);
    if (req.length) { field = createAuraField(THREE, req, { isNight: night, tier: tier(), name: 'WORLD_SPECTRAL_AURA' }); if (field) ctx.group.add(field.mesh); }
    if (sky.length) { skyField = createAuraField(THREE, sky, { isNight: night, tier: tier(), name: 'SKY_SPECTRAL_AURA', renderOrder: -7.5 }); if (skyField) { skyField.mesh.material.transparent = false; ctx.group.add(skyField.mesh); } }   /* the celestial backdrop pass: additive, no depth write, before the world */
    [[req, field, followers], [sky, skyField, skyFollowers]].forEach(function (L) { if (L[1]) L[0].forEach(function (r, i) { if (typeof r.follow === 'function') L[2].push({ i: i, fn: r.follow, fade: r.fade || null, base: r.intensity === undefined ? 0.5 : r.intensity }); }); });
    var asked = (ctx.auraForms || []).filter(function (f) { return f.shape !== 'CRYSTAL'; }), fl = curate(ambientLaw(asked)), tq = tier(); formsDropped = asked.length - fl.length; if (tq === 'LOW') fl = fl.filter(function (f, i) { return f.size > 40 || i % 2 === 0; }); skyForms(fl);   /* LOW: every sky form, half the local ones (M19 review: thinned BEFORE the sky forms join, so the two small M19 sky figures both stay) */
    forms = createAuraForms(THREE, fl, { isNight: night, tier: tq, name: 'WORLD_AURA_FORMS', day: 0.5, night: 1.0 }); if (forms) ctx.group.add(forms.mesh);
    try { ambient = createAmbientMagic(ctx, ambientOpts()); ambient.build(); } catch (e) { ambient = null; log('aura: ambient magic FAILED: ' + (e && e.message || e)); }
    log('aura: ' + req.length + ' spectral auras in one draw, ' + sky.length + ' sky moments in the backdrop, ' + (forms ? forms.count : 0) + ' dimensional forms in one draw (' + (followers.length + skyFollowers.length) + ' following)'); }
  function follow(f, list, t) { if (!f || !list.length) return; var P = f.positions, K = f.mesh.geometry.attributes.aK;
    for (var i = 0; i < list.length; i++) { var F = list[i], p = F.fn(t); if (p) { P.setXYZ(F.i, p[0], p[1], p[2]); } if (F.fade) K.setX(F.i, F.base * F.fade(t, night)); }
    P.needsUpdate = true; K.needsUpdate = true; }
  function tick(dt, t) { if (field) field.tick(t); if (skyField) skyField.tick(t); if (forms) forms.tick(t); if (crystals) crystals.tick(t); if (ambient) ambient.tick(dt, t); follow(field, followers, t); follow(skyField, skyFollowers, t); }
  function setNight(n) { night = !!n; if (field) field.setNight(night); if (skyField) skyField.setNight(night); if (forms) forms.setNight(night); if (crystals) crystals.setNight(night); if (ambient) ambient.setNight(night); }
  function dispose() { [field, skyField, forms, crystals].forEach(function (f) { if (f) { if (f.mesh.parent) f.mesh.parent.remove(f.mesh); f.dispose(); } }); if (ambient) ambient.dispose(); field = skyField = forms = crystals = ambient = null; followers = []; skyFollowers = []; }
  function debug() { return { count: field ? field.count : 0, sky_moments: skyField ? skyField.count : 0, forms: forms ? forms.count : 0, forms_dropped: formsDropped, rings_dropped: ringsDropped, crystals: crystals ? crystals.count : 0, crystal_tris: crystals ? crystals.tris : 0, following: followers.length + skyFollowers.length, ambient: ambient ? ambient.debug() : null }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug };
}
