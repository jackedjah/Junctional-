/* MAHWORLD M15b :: DUEL COURTS (owner 2026-09-27 correction: the M15 zone was "TOO SMALL" and showed class colours while inactive).
   A duel court is DORMANT WORLD INFRASTRUCTURE: a large square-diamond court drawn into the ground — crystalline inlay, faint faceted
   seams, subtle diamond anchors, low ground-bound energy. No cage, no walls, no raised arena, no spectator structure.
   SIZE (validated from the rules, not guessed): every fighter's largest area effect (radius 2.5 melee units = 6.25 m) must fit without two
   fighters' areas stacking. All FIVE classes can meet on one court (owner 2026-09-27: "they also have a fifth class that is purple"), and
   the tightest square that holds five such areas is the dice-five pattern, R·(2 + 2√2) = 30.2 m (four fighters would need 2 × 2 = 25 m).
   So the court is 31 m of clear playable width (≈ 102 ft) plus a 1.2 m inlaid border — 33.4 m across in all.
   STATES (the host drives them; the dev preview can stage each):
     · DORMANT      nobody on it — white / cool white-blue / pale ice only, soft glass, a faint neutral shimmer, subtly world-reflective.
                    ZERO class colour: no gold, red, pink, purple or blue class ownership.
     · READY        someone stands on it — a neutral response: the inlay wakes a little and a soft WHITE presence forms under each occupant.
                    Still zero class colour.
     · ACTIVATION   a duel begins — the dramatic moment: the court splits into equal CLASS territories by its own symmetry (territorySlots:
                    five fighters = four corner territories + a central diamond, each exactly one fifth; four = the corner quadrants;
                    two = halves on a symmetry line), each fighter taking the territory nearest them; seams run through white, a surge
                    crosses the court; after ~1.3 s the split lets go. The dormant inlay faintly carries the same dice-five structure.
     · ACTIVE_DUEL  the split is gone; the court is neutral again, and each fighter carries a LOCAL PRESENCE FIELD in their class colour
                    that moves with them (eased, never flickering), fades at its perimeter (never a box or a UI ring) and blends with
                    restraint where two fields overlap (the overlap leans to white). Airborne fighters' fields shrink and fade.
     · RESOLUTION   the duel ends — colour drains back out over ~1.4 s.
     · RESET        a neutral sweep runs in from the border (~1.2 s); then DORMANT (or READY if someone is still standing on it).
   Contract (future-ready): fighters are { fighterId, classId, classColor?, worldPosition {x,y,z} | [x,y,z], isParticipant, teamId,
   localInfluenceRadius, verticalState ('GROUNDED' | 'AIRBORNE'), airborneHeight } (the M15 shape { id, cls, x, z, y } still works). The
   phase machine is a pure function (duelPhase). Class colours come from the registry crystal families through a class map a new class
   extends (setClassColor).
   Host safety: pure light — the inlay lies 2.5 cm above its ground (no depth write), no collider, never interactable. Cost: ONE instanced
   draw for every court in the world; per-frame work only for a court with someone on it. */

export var CLASS_FAMILY = { ATHLETE: 'gold', TITAN: 'blue', LEAN: 'red', VISIONARY: 'purple', BAGE: 'pink' };
export var TIMING = { activation_s: 2.8, split_hold_s: 1.3, resolution_s: 1.4, reset_s: 1.2, presence_s: 0.35, follow_s: 0.08 };
export var SIZING = { melee_unit_m: 2.5, max_aoe_radius_m: 6.25, max_fighters: 5, four_fighter_packing_m: 25, five_fighter_packing_m: 30.18, playable_m: 31, border_m: 1.2 };
export var MAX_FIGHTERS = 5;   /* one of each class: ATHLETE gold, TITAN blue, LEAN red, VISIONARY purple, BAGE pink */
export var PHASES = ['DORMANT', 'READY', 'ACTIVATION', 'ACTIVE_DUEL', 'RESOLUTION', 'RESET'];
export var CLASS_PHASES = ['ACTIVATION', 'ACTIVE_DUEL', 'RESOLUTION'];   /* the only phases in which any class colour may show */
/* the neutral palette (display values): every dormant / ready colour is white or pale ice (colour law: NEUTRAL or the BLUE window, never
   a class colour's saturation) */
export var PALETTE = { ice: 0xb3d1ff, core: 0xe0edff, ready: 0xeef4ff, fill_day: 0xd2def0, fill_night: 0x0d1320, sky_day: 0xd6e6fa, sky_night: 0x2b3f6b };

export function combatZoneList(reg) { var C = (reg && reg.combat_zones) || {}, PL = C.playable_m || SIZING.playable_m, BO = C.border_m === undefined ? SIZING.border_m : C.border_m;
  return (C.list || []).filter(function (z) { return z && isFinite(z.x) && isFinite(z.z); }).map(function (z) { var o = Object.assign({ playable_m: PL, border_m: BO, yaw_deg: 45, y: 0 }, z); o.size_m = o.playable_m + 2 * o.border_m; return o; }); }
/* exclusion circles (ground cover, shards): the court's circumcircle plus a pad */
export function combatZoneCircles(reg, pad) { return combatZoneList(reg).map(function (z) { return { x: z.x, z: z.z, r: z.size_m * 0.7072 + (pad === undefined ? 1 : pad) }; }); }
/* world → the court's square frame (metres) */
export function zoneLocal(zone, x, z) { var a = -(zone.yaw_deg || 0) * Math.PI / 180, dx = x - zone.x, dz = z - zone.z; return [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)]; }
/* inside the PLAYABLE square (plus an optional margin) */
export function insideZone(zone, x, z, margin) { var p = zoneLocal(zone, x, z); return Math.max(Math.abs(p[0]), Math.abs(p[1])) <= (zone.playable_m || zone.size_m) / 2 + (margin || 0); }

/* THE TERRITORY TEMPLATE (the court's own symmetry, not wherever the fighters happen to stand): n fighters split the court into n
   symmetric class territories — the soft Voronoi cells of these slot points (local metres; h = half the playable width):
     · 5  dice-five: four corner territories + a central diamond |x| + |z| ≤ h·√0.4, each exactly one fifth of the court;
     · 4  the four corner quadrants;
     · 3  three 120° sectors, mirror-symmetric about the court's axis;
     · 2  two halves, split through the centre on whichever of the court's four symmetry lines best separates the fighters;
     · 1  the whole court.
   Slot order (the shader's czSlot matches it): (−,−) (+,−) (+,+) (−,+) then the centre. */
export var FIVE_DIAMOND = Math.sqrt(0.4);
export function territorySlots(n, h, theta) { n = Math.max(1, Math.min(MAX_FIGHTERS, n | 0)); theta = theta || 0; var q, k, out = [];
  if (n === 5) { q = h * FIVE_DIAMOND; return [[-q, -q], [q, -q], [q, q], [-q, q], [0, 0]]; }
  if (n === 4) { q = h / 2; return [[-q, -q], [q, -q], [q, q], [-q, q]]; }
  if (n === 3) { for (k = 0; k < 3; k++) { var a = Math.PI / 2 + k * 2 * Math.PI / 3; out.push([Math.cos(a) * h / 2, Math.sin(a) * h / 2]); } return out; }
  if (n === 2) return [[-Math.cos(theta) * h / 2, -Math.sin(theta) * h / 2], [Math.cos(theta) * h / 2, Math.sin(theta) * h / 2]];
  return [[0, 0]]; }
/* the two-fighter split line: the court symmetry direction (0, 45°, 90°, 135°) nearest the line between the fighters */
export function splitAngle(a, b) { var t = Math.atan2(b[1] - a[1], b[0] - a[0]); if (!isFinite(t)) return 0; var k = ((Math.round(t / (Math.PI / 4)) % 4) + 4) % 4; return k * Math.PI / 4; }   /* a line, so [0, π): 0, 45°, 90° or 135° */
/* fighters → territory slots: the assignment with the least total travel (exhaustive; n ≤ 5 is at most 120 orders) */
export function assignSlots(points, slots) { var n = Math.min(points.length, slots.length), best = null, bestC = 1e18, used = [], cur = [];
  (function go(i, c) { if (c >= bestC) return; if (i === n) { bestC = c; best = cur.slice(); return; }
    for (var k = 0; k < slots.length; k++) { if (used[k]) continue; var dx = points[i][0] - slots[k][0], dz = points[i][1] - slots[k][1]; used[k] = true; cur[i] = k; go(i + 1, c + dx * dx + dz * dz); used[k] = false; } })(0, 0);
  return best || []; }

/* THE PHASE MACHINE (pure). S = { occupied (someone stands on the court), tStart (duel begin; null = no duel), tResolve (duel end; null =
   running) }. Returns the phase and the drives the shader reads: live (0..1 — how much class colour may show at all; 0 in DORMANT, READY
   and RESET), split (0..1, the activation territories), surge (0..1, the activation wave's travel; 1 = done), ready (0/1, the neutral
   occupied response) and reset (0..1, the neutral reset sweep). */
function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
export function duelPhase(t, S) {
  S = S || {}; var T = TIMING, occ = S.occupied ? 1 : 0, rest = { phase: occ ? 'READY' : 'DORMANT', live: 0, split: 0, surge: 1, ready: occ, reset: 0 };
  if (S.tStart === null || S.tStart === undefined || !isFinite(S.tStart)) return rest;
  if (S.tResolve !== null && S.tResolve !== undefined && isFinite(S.tResolve) && t >= S.tResolve) { var e = t - S.tResolve;
    if (e < T.resolution_s) return { phase: 'RESOLUTION', live: 1 - sm(e / T.resolution_s), split: 0, surge: 1, ready: occ, reset: 0 };
    if (e < T.resolution_s + T.reset_s) return { phase: 'RESET', live: 0, split: 0, surge: 1, ready: occ, reset: (e - T.resolution_s) / T.reset_s };
    return rest; }
  var dt = Math.max(0, t - S.tStart);
  if (dt < T.activation_s) return { phase: 'ACTIVATION', live: 1, split: dt <= T.split_hold_s ? 1 : 1 - sm((dt - T.split_hold_s) / (T.activation_s - T.split_hold_s)), surge: Math.min(1, dt / 1.6), ready: 1, reset: 0 };
  return { phase: 'ACTIVE_DUEL', live: 1, split: 0, surge: 1, ready: 1, reset: 0 };
}

var FLOOR_V = [
  'attribute vec4 iZ; attribute vec4 iK; attribute vec4 iK2; attribute vec4 iF0; attribute vec4 iF1; attribute vec4 iF2; attribute vec4 iF3; attribute vec4 iC0; attribute vec4 iC1; attribute vec4 iC2; attribute vec4 iC3; attribute vec4 iC4;',   /* 13 attributes with position — inside WebGL2's 16 with room to spare (phones often have exactly 16). iK2.w: territory template (n + 10 · split-line index); iF0..iF3: five fighters × (x, z, lift·100 packed with presence) + the court's seed */
  'uniform float uMargin;',
  'varying vec4 vLD; flat varying vec4 vK; flat varying vec4 vK2; flat varying vec4 vF0; flat varying vec4 vF1; flat varying vec4 vF2; flat varying vec4 vF3; flat varying vec4 vC0; flat varying vec4 vC1; flat varying vec4 vC2; flat varying vec4 vC3; flat varying vec4 vC4;',
  'void main() { float hb = iK.x + iK2.z; vec2 L = position.xy * (hb + uMargin) * 2.0;',   /* the court's square frame, reaching past the border for the ground-bound halo */
  '  float c = cos(iZ.w), s = sin(iZ.w); vec3 w = vec3(iZ.x + L.x * c - L.y * s, iZ.y + 0.025, iZ.z + L.x * s + L.y * c);',   /* turned by the court's yaw (local y = world z); 2.5 cm inlay */
  '  vec3 V = cameraPosition - w; float D = length(V); vLD = vec4(L, D, V.y / max(D, 1e-3));',
  '  vK = iK; vK2 = iK2; vF0 = iF0; vF1 = iF1; vF2 = iF2; vF3 = iF3; vC0 = iC0; vC1 = iC1; vC2 = iC2; vC3 = iC3; vC4 = iC4;',   /* per-court data is flat: packed values must not be interpolated */
  '  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }'
].join('\n');

var FLOOR_F = [
  'uniform float uTime; uniform float uGlobal; uniform float uFacets; uniform float uFill; uniform float uSheen; uniform float uPres; uniform vec3 uIce; uniform vec3 uCore; uniform vec3 uReady; uniform vec3 uFillC; uniform vec3 uSky;',
  'varying vec4 vLD; flat varying vec4 vK; flat varying vec4 vK2; flat varying vec4 vF0; flat varying vec4 vF1; flat varying vec4 vF2; flat varying vec4 vF3; flat varying vec4 vC0; flat varying vec4 vC1; flat varying vec4 vC2; flat varying vec4 vC3; flat varying vec4 vC4;',
  'float czLine(float d, float w) { float a = fwidth(d) * 1.2 + 1e-4; return 1.0 - smoothstep(w, w + a, abs(d)); }',
  'float czGlow(float d, float s) { return exp(-d * d / s); }',
  'float czHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  /* a fighter's presence field: soft, mostly round with a quarter of the court's diamond in it, fading to nothing at its perimeter
     (P.xy local position, P.z height above the floor, P.w presence 0..1; R the influence radius) */
  'float czField(vec2 L, vec4 P, float R) { vec2 r = L - P.xy; float lift = 1.0 / (1.0 + max(P.z, 0.0) * 0.45), Rr = max(R, 0.5) * mix(0.7, 1.0, lift);',
  '  float d = mix(length(r), (abs(r.x) + abs(r.y)) * 0.70710678, 0.25) / Rr; return P.w * lift * exp(-d * d * 1.8) * (1.0 - smoothstep(0.85, 1.35, d)); }',
  'vec2 czSlot(float k, float n, float th, float h) { float q = n > 4.5 ? h * 0.63245553 : h * 0.5;',   /* territorySlots() in the shader: (−,−) (+,−) (+,+) (−,+), then the centre */
  '  if (n > 3.5) { if (k > 3.5) return vec2(0.0); return vec2((k > 0.5 && k < 2.5) ? q : -q, k > 1.5 ? q : -q); }',
  '  if (n > 2.5) { float a = 1.5707963 + k * 2.0943951; return vec2(cos(a), sin(a)) * h * 0.5; }',
  '  if (n > 1.5) return vec2(cos(th), sin(th)) * h * 0.5 * (k > 0.5 ? 1.0 : -1.0); return vec2(0.0); }',
  'vec4 czFP(float x, float z, float lp) { return vec4(x, z, floor(lp) * 0.01, fract(lp)); }',   /* unpack a fighter: (x, z, lift, presence) */
  'float czTerr(vec2 L, float k, vec4 S, float h, vec4 P) { return (k < S.x - 0.5 && P.w > 0.01) ? length(L - czSlot(k, S.x, S.y, h)) : 1e4; }',
  'void main() { vec2 L = vLD.xy; float h = vK.x, B = vK2.z, hb = h + B, t = uTime, split = vK.y, surge = vK.z, live = vK.w, ready = vK2.x, reset = vK2.y, seed = vF3.w;',
  '  vec4 P0 = czFP(vF0.x, vF0.y, vF0.z), P1 = czFP(vF0.w, vF1.x, vF1.y), P2 = czFP(vF1.z, vF1.w, vF2.x), P3 = czFP(vF2.y, vF2.z, vF2.w), P4 = czFP(vF3.x, vF3.y, vF3.z);',
  '  vec4 TS = vec4(mod(vK2.w, 10.0), floor(vK2.w / 10.0 + 0.001) * 0.78539816, 0.0, 0.0);',
  '  float sq = max(abs(L.x), abs(L.y)), dm = (abs(L.x) + abs(L.y)) * 0.70710678;',
  '  float court = 1.0 - smoothstep(hb - 0.03, hb + 0.03, sq), field = 1.0 - smoothstep(h - 0.03, h + 0.03, sq), band = court - field;',
  /* the border band: an inner and an outer edge, crossed by faint faceted seams (two diagonal families → crystal facets in the band) */
  '  float across = sq - h, along = abs(L.x) > abs(L.y) ? L.y : L.x;',
  '  float edges = czLine(sq - h, 0.03) * 0.8 + czLine(sq - hb, 0.022) * 0.5;',
  '  float seams = (czLine(fract((along + across) / 1.6) - 0.5, 0.012) + czLine(fract((along - across) / 1.6) - 0.5, 0.012)) * 0.3 * band;',
  /* diamond anchors: a gem at each corner and each edge midpoint of the band */
  '  float m = h + B * 0.5; vec2 aL = abs(L), ca = aL - vec2(m); float cdm = (abs(ca.x) + abs(ca.y)) * 0.70710678;',
  '  float mdm = min((abs(aL.x - m) + abs(L.y)) * 0.70710678, (abs(L.x) + abs(aL.y - m)) * 0.70710678);',
  '  float anch = czLine(cdm - 0.5, 0.026) * 0.85 + czGlow(cdm, 0.05) * 0.7 + czLine(mdm - 0.36, 0.022) * 0.6 + czGlow(mdm, 0.025) * 0.5;',
  /* the playable field: a faint inscribed diamond, a small centre diamond, faint crystal facets (calmer toward the centre) */
  '  float c5 = h * 0.63245553, sAx = smoothstep(c5 - 0.2, c5 + 0.6, abs(L.x)), sAz = smoothstep(c5 - 0.2, c5 + 0.6, abs(L.y));',   /* the dice-five structure, faintly: the central diamond + the four seams from its tips to the edge-midpoint anchors */
  '  float dia = (czLine(dm - c5 * 0.70710678, 0.02) * 0.24 + (czLine(L.x, 0.014) * sAz + czLine(L.y, 0.014) * sAx) * 0.14) * field, sig = czLine(dm - 1.1, 0.02) * 0.32 + czGlow(dm, 0.06) * 0.22;',
  '  vec2 g = vec2(L.x * 0.62 + L.y * 0.62 * 0.57735, L.y * 0.62 * 1.1547), gf = fract(g), gc = floor(g); float up = step(1.0, gf.x + gf.y);',
  '  float facetT = czHash(gc * 2.0 + up), facets = 0.0;',   /* each facet has its own tone: the court reads as cut glass, not a grid */
  '  if (uFacets > 0.5) { float tri = min(min(gf.x, gf.y), abs(1.0 - gf.x - gf.y)); facets = czLine(tri, 0.012) * (0.05 + 0.07 * smoothstep(h * 0.35, h, sq)) * field * (0.7 + 0.3 * sin(t * 0.3 + gc.x * 1.7 + gc.y * 2.3)); }',
  /* the neutral shimmer: one soft light travelling round the band, and rare facet glints */
  '  float run = czGlow(mod(atan(L.y, L.x) / 6.2831853 + 1.0 - t * (0.018 + 0.02 * ready) + seed, 1.0) - 0.5, 0.0015) * band;',
  '  float glint = uFacets > 0.5 ? step(0.965, facetT) * pow(0.5 + 0.5 * sin(t * 0.9 + facetT * 60.0), 16.0) * czGlow(length(gf - vec2(0.33)), 0.02) * field : 0.0;',
  '  float breath = 0.9 + 0.1 * sin(t * 0.45 + seed * 6.2831853);',
  /* fighters: presence fields (a WHITE presence while READY; the class colour only while live) */
  '  float f0 = czField(L, P0, vC0.w), f1 = czField(L, P1, vC1.w), f2 = czField(L, P2, vC2.w), f3 = czField(L, P3, vC3.w), f4 = czField(L, P4, vC4.w);',
  '  float fs = f0 + f1 + f2 + f3 + f4, fm = max(max(max(f0, f1), max(f2, f3)), f4);',
  '  vec3 pc = fs > 1e-4 ? (vC0.rgb * f0 + vC1.rgb * f1 + vC2.rgb * f2 + vC3.rgb * f3 + vC4.rgb * f4) / fs : uReady;',
  '  pc = mix(pc, vec3(1.0), clamp((fs - fm) * 1.2, 0.0, 0.6));',   /* restrained overlap: where two presences meet they lean to white */
  '  vec3 presC = mix(uReady, pc, live); float pres = min(fs, 1.1) * mix(0.5 * ready, 0.95 * uPres, live);   /* uPres: bright day paving needs a stronger presence than night */',
  /* activation territories: the court's symmetric template cells (slot k holds the fighter assigned to territory k), seams through white */
  '  float d0 = czTerr(L, 0.0, TS, h, P0), d1 = czTerr(L, 1.0, TS, h, P1), d2 = czTerr(L, 2.0, TS, h, P2), d3 = czTerr(L, 3.0, TS, h, P3), d4 = czTerr(L, 4.0, TS, h, P4), dn = min(min(min(d0, d1), min(d2, d3)), d4);',
  '  float e0 = exp(-(d0 - dn) * 1.6), e1 = exp(-(d1 - dn) * 1.6), e2 = exp(-(d2 - dn) * 1.6), e3 = exp(-(d3 - dn) * 1.6), e4 = exp(-(d4 - dn) * 1.6), eS = e0 + e1 + e2 + e3 + e4;',
  '  vec3 terrC = (vC0.rgb * e0 + vC1.rgb * e1 + vC2.rgb * e2 + vC3.rgb * e3 + vC4.rgb * e4) / max(eS, 1e-4); terrC = mix(terrC, vec3(1.0), clamp(eS - 1.0, 0.0, 1.0) * 0.6);',
  '  float terr = split * live * step(dn, 1e3);',
  /* colour: the neutral inlay, the territories while splitting, the presences under the fighters */
  '  vec3 lineC = mix(uCore, uIce, 0.35); lineC = mix(lineC, terrC, terr); lineC = mix(lineC, presC, clamp(pres, 0.0, 1.0) * 0.85);',
  '  float lvl = (breath * 0.78 + ready * 0.36 + terr * 0.8) * mix(1.0, 1.3, live);   /* dormant is quiet infrastructure; someone stepping on wakes it */',
  '  float lines = edges + seams + dia + facets;',
  '  vec3 col = lineC * lines * lvl + mix(uCore, lineC, 0.6) * (anch + sig) * lvl + uIce * run * 0.7 + uCore * glint * 0.5;',
  '  col += presC * pres * (0.3 * court + lines * 1.5);',   /* a presence warms the floor under the fighter and lights the inlay it stands on */
  '  col += terrC * terr * (0.14 * field + 0.4 * band);',
  '  float dmC = c5 * 0.70710678 - dm, band5 = smoothstep(-0.05, 0.1, dmC) * (1.0 - smoothstep(0.9, 1.3, dmC));',   /* the central territory's own lit band, just inside its diamond — the corners have the border band: the fifth share carries equal weight */
  '  col += vC4.rgb * band5 * step(4.5, TS.x) * step(0.01, P4.w) * split * live * 0.45;',
  '  col += vec3(1.0) * czGlow(sq - surge * hb * 1.15, 0.8) * (1.0 - surge) * live * 1.2;',   /* the activation surge */
  '  col += uCore * czGlow(sq - (1.0 - reset) * hb, 0.5) * sin(reset * 3.14159265) * 0.6;',   /* the neutral reset sweep */
  '  col += uIce * czGlow(sq - hb, 0.45) * 0.1 * (1.0 - 0.5 * court);',   /* low ground-bound energy just outside the border */
  '  float far = 1.0 - smoothstep(180.0, 320.0, vLD.z); col *= uGlobal * far;',
  '  float fres = pow(1.0 - clamp(vLD.w, 0.0, 1.0), 5.0); vec3 sheen = uSky * fres * uSheen * court * (0.75 + 0.5 * facetT) * far;',   /* the glass catches the sky at grazing angles, facet by facet */
  '  float fillA = (uFill * field + (uFill + 0.08) * band) * (0.55 + 0.45 * far);',
  '  vec3 outC = uFillC * fillA + sheen + col; if (max(max(outC.r, outC.g), outC.b) < 0.003 && fillA < 0.003) discard;',
  '  gl_FragColor = vec4(outC, fillA); }'   /* premultiplied: the inlay adds light, the glass field tints the ground a touch */
].join('\n');

function rawRGB(THREE, hex) { return new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255); }   /* display values (the shader writes them untouched) */
function P3(p) { if (!p) return null; if (Array.isArray(p)) return { x: +p[0], y: +(p[1] || 0), z: +p[2] }; if (isFinite(p.x) && isFinite(p.z)) return { x: +p.x, y: +(p.y || 0), z: +p.z }; return null; }

export function createCombatZones(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }, reg = ctx.registry || {}, night = !!ctx.night;
  var zones = [], byId = {}, group = null, floor = null, uF = null, A = null, own = [], clock = 0, listeners = [], demo = null, refs = null, classColor = {}, WHITE = null;
  function tier() { try { return ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { return 'HIGH'; } }
  function fam(f) { var F = (reg.crystal_families || {})[f] || {}; return F.glow || F.color || '#f4f6ff'; }
  function colorOf(cls) { var k = String(cls || '').toUpperCase(); if (classColor[k]) return classColor[k]; var c = new THREE.Color(fam(CLASS_FAMILY[k] || 'platinum')); classColor[k] = c; return c; }
  function build() {
    zones = combatZoneList(reg); WHITE = new THREE.Color(1, 1, 1); if (!zones.length) { log('combatZones: registry.combat_zones empty — nothing built'); return; }
    group = new THREE.Group(); group.name = 'MAHWORLD_COMBAT_ZONES'; group.userData.noMerge = true; group.userData.nonInteractable = true; ctx.group.add(group);
    var n = zones.length, lowQ = tier() === 'LOW', keys = ['iZ', 'iK', 'iK2', 'iF0', 'iF1', 'iF2', 'iF3', 'iC0', 'iC1', 'iC2', 'iC3', 'iC4'];
    A = {}; keys.forEach(function (k) { A[k] = new Float32Array(n * 4); });
    zones.forEach(function (z, i) { z.index = i; z.duel = null; z.occ = []; z.readyV = 0; z.lastPhase = 'DORMANT'; byId[z.id] = z; A.iZ.set([z.x, z.y || 0, z.z, (z.yaw_deg || 0) * Math.PI / 180], i * 4); A.iK.set([z.playable_m / 2, 0, 1, 0], i * 4); A.iK2.set([0, 0, z.border_m, 0], i * 4); A.iF3[i * 4 + 3] = (i * 0.618) % 1; for (var s = 0; s < MAX_FIGHTERS; s++) A['iC' + s].set([1, 1, 1, 3.2], i * 4); });
    var attrs = {}; keys.forEach(function (k) { attrs[k] = new THREE.InstancedBufferAttribute(A[k], 4); attrs[k].setUsage(THREE.DynamicDrawUsage); });
    var fg = new THREE.InstancedBufferGeometry(), pl = new THREE.PlaneGeometry(1, 1); fg.index = pl.index; fg.setAttribute('position', pl.attributes.position); fg.instanceCount = n; keys.forEach(function (k) { fg.setAttribute(k, attrs[k]); }); own.push(fg, pl);
    uF = { uTime: { value: 0 }, uGlobal: { value: 0 }, uFacets: { value: lowQ ? 0 : 1 }, uFill: { value: 0 }, uSheen: { value: 0 }, uPres: { value: 1 }, uMargin: { value: 2.5 },
      uIce: { value: rawRGB(THREE, PALETTE.ice) }, uCore: { value: rawRGB(THREE, PALETTE.core) }, uReady: { value: rawRGB(THREE, PALETTE.ready) }, uFillC: { value: rawRGB(THREE, PALETTE.fill_day) }, uSky: { value: rawRGB(THREE, PALETTE.sky_day) } };
    setNight(night);
    var fm = new THREE.ShaderMaterial({ vertexShader: FLOOR_V, fragmentShader: FLOOR_F, uniforms: uF, transparent: true, depthWrite: false, depthTest: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, toneMapped: false }); own.push(fm);
    floor = new THREE.Mesh(fg, fm); floor.name = 'COMBAT_ZONE_FLOORS'; floor.frustumCulled = false; floor.renderOrder = 3; floor.userData.noMerge = true; floor.userData.nonInteractable = true; group.add(floor);
    A.attrs = attrs;
    var qs = typeof location !== 'undefined' ? location.search : '';
    try { var m = /[?&]duelDemo=([^&]+)/.exec(qs); if (m) { var p = decodeURIComponent(m[1]).split(':'); demo = { id: p[0], classes: (p[1] || 'ATHLETE,LEAN').split(',').filter(Boolean).slice(0, MAX_FIGHTERS), phase: (p[2] || 'ACTIVE_DUEL').toUpperCase() }; if (PHASES.indexOf(demo.phase) < 0) demo.phase = 'ACTIVE_DUEL'; } } catch (e) { }   /* dev preview only: ?duelDemo=ZONE:CLS_A,CLS_B[,…]:DORMANT|READY|ACTIVATION|ACTIVE_DUEL|RESOLUTION|RESET (ZONE = ALL for every court) */
    try { var r = /[?&]scaleRefs=(\d+)/.exec(qs); if (r) buildRefs(Math.max(1, Math.min(8, +r[1]))); } catch (e) { }   /* dev preview only: full-size neutral human-scale references on each court */
    zones.forEach(function (z) { write(z); }); flag();
    log('combatZones: ' + n + ' courts (' + zones.map(function (z) { return z.id + ' ' + z.playable_m + ' m'; }).join(', ') + ') in 1 draw');
  }
  /* SCALE REFERENCES (dev only): neutral 1.88 m mannequins, so the footprint reads at human scale — the first five stand where five
     fighters' territories centre (the dice-five: corners at 0.572 h, one in the middle), as fractions of the half-width h */
  var REF_AT = [[-0.572, -0.572], [0.572, -0.572], [0.572, 0.572], [-0.572, 0.572], [0, 0], [0.8, 0], [-0.8, 0], [0, 0.8]];
  function buildRefs(N) { var body = new THREE.CapsuleGeometry(0.2, 1.2, 4, 10), head = new THREE.SphereGeometry(0.13, 12, 8), mat = new THREE.MeshStandardMaterial({ color: 0x9aa3ae, roughness: 0.7, metalness: 0 }); own.push(body, head, mat);
    var cnt = zones.length * N, bI = new THREE.InstancedMesh(body, mat, cnt), hI = new THREE.InstancedMesh(head, mat, cnt), M = new THREE.Matrix4(), k = 0;
    zones.forEach(function (z) { var c = Math.cos((z.yaw_deg || 0) * Math.PI / 180), s = Math.sin((z.yaw_deg || 0) * Math.PI / 180); for (var i = 0; i < N; i++) { var hh = z.playable_m / 2, l = [REF_AT[i][0] * hh, REF_AT[i][1] * hh], x = z.x + l[0] * c - l[1] * s, wz = z.z + l[0] * s + l[1] * c; M.makeTranslation(x, (z.y || 0) + 0.8, wz); bI.setMatrixAt(k, M); M.makeTranslation(x, (z.y || 0) + 1.75, wz); hI.setMatrixAt(k, M); k++; } });
    [bI, hI].forEach(function (o, j) { o.name = j ? 'COMBAT_ZONE_SCALE_REF_HEADS' : 'COMBAT_ZONE_SCALE_REFS'; o.userData.noMerge = true; o.userData.nonInteractable = true; o.userData.devOnly = true; o.castShadow = true; group.add(o); });
    refs = { n: N, height_m: 1.88 }; }
  /* a fighter from the contract (or the M15 shape) → its slot on a court: local position, lift, colour, influence */
  function norm(z, f, prev) { var wp = P3(f.worldPosition) || { x: +f.x, y: +(f.y || 0), z: +f.z }; if (!isFinite(wp.x) || !isFinite(wp.z)) return null;
    var id = f.fighterId !== undefined ? f.fighterId : (f.id !== undefined ? f.id : (prev ? prev.fighterId : null)), cls = String(f.classId || f.cls || (prev && prev.classId) || '').toUpperCase(), p = zoneLocal(z, wp.x, wp.z);   /* an update may carry only what changed */
    var lift = f.airborneHeight !== undefined ? +f.airborneHeight : (f.worldPosition ? wp.y - (z.y || 0) : +(f.y || 0)); if (f.verticalState === 'AIRBORNE') lift = Math.max(lift, 1); if (f.verticalState === 'GROUNDED') lift = 0; lift = Math.max(0, lift || 0);
    var col = f.classColor !== undefined && f.classColor !== null ? new THREE.Color(f.classColor) : (prev && prev.classId === cls && prev.col ? prev.col : colorOf(cls));
    var o = prev || { pres: 0, lx: p[0], lz: p[1] }; o.fighterId = id; o.classId = cls; o.col = col; o.part = f.isParticipant !== undefined ? f.isParticipant !== false : (prev ? prev.part : true); o.teamId = f.teamId !== undefined ? f.teamId : (prev ? prev.teamId : id); o.vState = f.verticalState || (lift > 0.05 ? 'AIRBORNE' : 'GROUNDED');
    o.rad = f.localInfluenceRadius !== undefined ? Math.max(1.5, Math.min(SIZING.max_aoe_radius_m, +f.localInfluenceRadius || 3.2)) : (prev ? prev.rad : 3.2); o.tx = p[0]; o.tz = p[1]; o.lift = lift; o.target = insideZone(z, wp.x, wp.z, 1.5) ? 1 : 0; return o; }
  function merge(z, list, fighters, replace) { var seen = {};
    (fighters || []).forEach(function (f, i) { if (!f) return; var id = f.fighterId !== undefined ? f.fighterId : f.id, slot = null;
      for (var j = 0; j < list.length; j++) if (list[j].fighterId === id && id !== undefined && id !== null) slot = list[j];
      if (!slot && (id === undefined || id === null)) { var cls = String(f.classId || f.cls || '').toUpperCase(); slot = list.filter(function (s) { return s.classId === cls && !seen[list.indexOf(s)]; })[0] || null; }
      if (slot) { norm(z, f, slot); seen[list.indexOf(slot)] = true; } else if (list.length < MAX_FIGHTERS) { var o = norm(z, f, null); if (o) { list.push(o); seen[list.length - 1] = true; } } });
    if (replace) list.forEach(function (s, j) { if (!seen[j]) s.target = 0; }); }
  function ease(list, dt) { var kp = Math.min(1, (dt || 0.016) / TIMING.presence_s), kf = Math.min(1, (dt || 0.016) / TIMING.follow_s);
    list.forEach(function (s) { s.pres += (s.target - s.pres) * kp; s.lx += (s.tx - s.lx) * kf; s.lz += (s.tz - s.lz) * kf; }); }
  function stateOf(z) { var d = z.duel; return duelPhase(clock, { occupied: z.occ.some(function (s) { return s.target > 0; }), tStart: d ? d.tStart : null, tResolve: d ? d.tResolve : null }); }
  function write(z) { var i = z.index * 4, d = z.duel, ph = stateOf(z);
    A.iK[i + 1] = ph.split; A.iK[i + 2] = ph.surge; A.iK[i + 3] = ph.live; A.iK2[i] = z.readyV; A.iK2[i + 1] = ph.reset;
    var slots = d ? territoryOrder(z, d) : z.occ, coloured = !!d && ph.live > 0;   /* outside a live duel every slot is written WHITE: no class colour can reach the floor */
    A.iK2[i + 3] = d ? (d.tn || 0) + 10 * Math.round((d.theta || 0) / (Math.PI / 4)) : 0;   /* the territory template: n + 10 · split-line index */
    function setF(k, v) { A['iF' + (k >> 2)][i + (k & 3)] = v; }   /* fighter k packs into floats 3k .. 3k + 2 of iF0..iF3 */
    for (var s = 0; s < MAX_FIGHTERS; s++) { var F = slots[s], C = A['iC' + s]; if (F) { setF(3 * s, F.lx); setF(3 * s + 1, F.lz); setF(3 * s + 2, Math.floor(Math.min(F.lift, 99) * 100) + Math.min(Math.max(F.pres, 0), 0.999)); var c = coloured && F.part ? F.col : WHITE; C[i] = c.r; C[i + 1] = c.g; C[i + 2] = c.b; C[i + 3] = F.rad; } else { setF(3 * s + 2, 0); C[i] = C[i + 1] = C[i + 2] = 1; } }
    if (ph.phase !== z.lastPhase) { var prev = z.lastPhase; z.lastPhase = ph.phase; listeners.forEach(function (fn) { try { fn({ zone: z.id, phase: ph.phase, from: prev || null, t: clock }); } catch (e) { } }); }
    if (d && d.tResolve !== null && (ph.phase === 'DORMANT' || ph.phase === 'READY') && !demo) z.duel = null;
    return ph; }
  /* the duel's fighters in territory order: participant k stands in template slot k (assigned once per fighter set, by least travel),
     non-participants after them (presence only, never a territory) */
  function territoryOrder(z, d) { var sig = d.f.map(function (F) { return F.fighterId + ':' + (F.part ? 1 : 0); }).join('|');
    if (d.sig !== sig) { var P = d.f.filter(function (F) { return F.part; }).slice(0, MAX_FIGHTERS), O = d.f.filter(function (F) { return !F.part; }), n = P.length, h = z.playable_m / 2;
      d.theta = n === 2 ? splitAngle([P[0].tx, P[0].tz], [P[1].tx, P[1].tz]) : 0; d.tn = n;
      var perm = assignSlots(P.map(function (F) { return [F.tx, F.tz]; }), territorySlots(n, h, d.theta)), ord = new Array(n);
      P.forEach(function (F, k) { ord[perm[k]] = F; F.territory = perm[k]; }); O.forEach(function (F) { F.territory = null; });
      d.order = ord.concat(O).slice(0, MAX_FIGHTERS); d.sig = sig; }
    return d.order; }
  /* API */
  function setOccupants(id, fighters, dt) { var z = byId[id]; if (!z) return null; if (z.duel && z.duel.tResolve === null) return update(id, fighters, dt); merge(z, z.occ, fighters, true); if (dt !== undefined) ease(z.occ, dt); z.occ = z.occ.filter(function (s) { return s.target > 0 || s.pres > 0.01; }); write(z); flag(); return phaseOf(id); }
  function begin(id, fighters, b, opts) { var z = byId[id]; if (!z) return null; if (!Array.isArray(fighters)) { fighters = [fighters, b]; } else opts = b; opts = opts || {};   /* begin(zone, [f…], opts) — or the M15 begin(zone, a, b, opts) */
    fighters = (fighters || []).filter(Boolean); if (!fighters.length) return null;
    var list = []; merge(z, list, fighters, false); list.forEach(function (s) { s.pres = s.target; s.lx = s.tx; s.lz = s.tz; });
    z.duel = { tStart: opts.t !== undefined ? opts.t : clock, tResolve: null, f: list }; z.occ = list; write(z); flag(); return phaseOf(id); }
  function update(id, fighters, dt) { var z = byId[id]; if (!z) return null; if (!z.duel) return setOccupants(id, fighters, dt); merge(z, z.duel.f, fighters, false); if (dt !== undefined) ease(z.duel.f, dt); write(z); flag(); return phaseOf(id); }
  function resolve(id, opts) { var z = byId[id]; if (!z || !z.duel) return null; z.duel.tResolve = opts && opts.t !== undefined ? opts.t : clock; write(z); flag(); return phaseOf(id); }
  function phaseOf(id) { var z = byId[id]; if (!z) return null; var d = z.duel, ph = stateOf(z), h = z.playable_m / 2, slots = d ? territoryOrder(z, d) : z.occ;   /* fighters in territory order (the floor's slots) */
    return { zone: id, phase: ph.phase, live: +ph.live.toFixed(3), split: +ph.split.toFixed(3), ready: ph.ready, reset: +ph.reset.toFixed(3), classColourShown: ph.live > 0 && CLASS_PHASES.indexOf(ph.phase) >= 0 && slots.some(function (s) { return s.part && s.pres > 0.01; }),
      territories: d ? d.tn || 0 : 0, fighters: slots.map(function (F) { return { fighterId: F.fighterId, classId: F.classId, teamId: F.teamId, isParticipant: F.part, territory: d && F.territory !== undefined ? F.territory : null, local: [+F.tx.toFixed(2), +F.tz.toFixed(2)], presence: +F.pres.toFixed(2), verticalState: F.vState, airborne: F.lift > 0.05, influence: F.rad,
        control: +(1 - Math.min(1, Math.max(Math.abs(F.tx), Math.abs(F.tz)) / h)).toFixed(2), id: F.fighterId, cls: F.classId }; }) }; }   /* control: how close the fighter holds the centre (1 = on it, 0 = at the edge) */
  function flag() { if (A && A.attrs) Object.keys(A.attrs).forEach(function (k) { A.attrs[k].needsUpdate = true; }); }
  function zoneAt(x, z) { for (var i = 0; i < zones.length; i++) if (insideZone(zones[i], x, z)) return zones[i].id; return null; }
  /* DEV PREVIEW: stage a phase on a court, anchored to the current clock (the preview pins the clock after load); with scale references
     the fighters stand at the mannequins */
  function demoFighters(z, t) { var c = Math.cos((z.yaw_deg || 0) * Math.PI / 180), s = Math.sin((z.yaw_deg || 0) * Math.PI / 180), N = demo.classes.length;
    return demo.classes.map(function (cls, i) { var l; if (refs) { var r = REF_AT[i], hh = z.playable_m / 2; l = [r[0] * hh + 0.4 * Math.sin(t * 0.7 + i), r[1] * hh + 0.4 * Math.cos(t * 0.6 + i * 2)]; } else { var a = t * 0.25 + i * Math.PI * 2 / N, rr = z.playable_m * 0.5 * (0.42 + 0.06 * Math.sin(t * 0.9 + i * 2)); l = [Math.cos(a) * rr, Math.sin(a) * rr]; }
      return { fighterId: 'demo_' + i, classId: cls, teamId: i, worldPosition: { x: z.x + l[0] * c - l[1] * s, y: (z.y || 0) + (i === 0 && !refs ? Math.max(0, Math.sin(t * 1.3) * 1.2) : 0), z: z.z + l[0] * s + l[1] * c }, isParticipant: true, localInfluenceRadius: 3.2 }; }); }
  function runDemo(t, dt) { var list = demo.id === 'ALL' ? zones : zones.filter(function (z) { return z.id === demo.id; });
    list.forEach(function (z) { var fs = demoFighters(z, t), P = demo.phase;
      if (P === 'DORMANT') { z.duel = null; z.occ = []; return; }
      if (P === 'READY') { z.duel = null; setOccupants(z.id, fs, 1); return; }
      var off = P === 'ACTIVATION' ? 0.9 : 12; if (!z.duel) begin(z.id, fs, { t: t - off }); z.duel.tStart = t - off;
      z.duel.tResolve = P === 'RESOLUTION' ? t - 0.5 : (P === 'RESET' ? t - (TIMING.resolution_s + TIMING.reset_s * 0.35) : null); update(z.id, fs, 1); }); }
  /* HOST ADAPTER (best effort; unverified until the runtime bridge lands): the local player standing on a court makes it READY; when the
     host snapshot reports a live duel (snap.duel.state / rules.match.state) and the opponent is known, that court runs it — me.position +
     rules.me.class, the opponent from snap.duel.opponent or rules.others. Missing fields simply leave every court dormant. */
  function hostDuel(dt) { var s = null; try { s = ctx.snapshot ? ctx.snapshot() : null; } catch (e) { } if (!s) return; var R = s.rules || {}, st = (s.duel && s.duel.state) || (R.match && R.match.state) || null, live = ['ACTIVE', 'STARTING', 'COUNTDOWN', 'ACTIVATION', 'ACTIVE_DUEL'].indexOf(st) >= 0;
    var mp = P3(s.me && (s.me.position || s.me.pos)), meCls = (R.me && R.me.class) || (s.me && s.me.class) || null, op = (s.duel && s.duel.opponent) || (R.others && R.others[0]) || null, opP = op && P3(op.position || op.pos || op), opCls = op && (op.class || op.class_id) || null;
    var zid = mp ? zoneAt(mp.x, mp.z) : null, cur = zones.filter(function (z) { return z.duel && z.duel.host; })[0];
    var me = mp ? { fighterId: 'me', classId: meCls, worldPosition: mp } : null, you = opP ? { fighterId: 'op', classId: opCls, worldPosition: opP } : null;
    if (live && zid && you) { if (!cur || cur.id !== zid) { if (cur && cur.duel.tResolve === null) resolve(cur.id); begin(zid, [me, you]); byId[zid].duel.host = true; } update(zid, [me, you]); return; }
    if (cur && cur.duel.tResolve === null) resolve(cur.id);
    zones.forEach(function (z) { if (z.duel && z.duel.tResolve === null) return; if (z.id === zid && me) { setOccupants(z.id, [me]); z.hostOcc = true; } else if (z.hostOcc) { setOccupants(z.id, []); if (!z.occ.length) z.hostOcc = false; } }); }
  function tick(dt, t) { if (!zones.length) return; var prev = clock; clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); var d = Math.max(0, Math.min(0.1, dt || (clock - prev) || 0.016)); uF.uTime.value = clock;
    if (demo) runDemo(clock, d); else hostDuel(d);
    var any = false; zones.forEach(function (z) { var tgt = stateOf(z).ready, busy = z.duel || z.occ.length || Math.abs(z.readyV - tgt) > 1e-3 || z.lastPhase !== 'DORMANT';
      if (!busy) return; z.readyV += (tgt - z.readyV) * Math.min(1, d / TIMING.presence_s); if (Math.abs(z.readyV - tgt) < 1e-3) z.readyV = tgt; if (!demo) ease(z.duel ? z.duel.f : z.occ, d); if (!z.duel) z.occ = z.occ.filter(function (s) { return s.target > 0 || s.pres > 0.01; }); write(z); any = true; });
    if (any) flag(); }
  function setNight(n) { night = !!n; if (!uF) return; uF.uGlobal.value = night ? 1.0 : 0.72; uF.uFill.value = night ? 0.16 : 0.13; uF.uSheen.value = night ? 0.22 : 0.16; uF.uPres.value = night ? 1 : 1.7;
    uF.uFillC.value.copy(rawRGB(THREE, night ? PALETTE.fill_night : PALETTE.fill_day)); uF.uSky.value.copy(rawRGB(THREE, night ? PALETTE.sky_night : PALETTE.sky_day)); }
  function dispose() { if (group && group.parent) group.parent.remove(group); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; zones = []; byId = {}; group = floor = null; refs = null; }
  function debug() { return { courts: zones.map(function (z) { return { id: z.id, at: [z.x, z.z], y: z.y, playable_m: z.playable_m, border_m: z.border_m, size_m: z.size_m, yaw_deg: z.yaw_deg, phase: phaseOf(z.id).phase }; }), draw_calls: zones.length ? 1 + (refs ? 2 : 0) : 0, demo: demo ? demo.id + ':' + demo.classes.join(',') + ':' + demo.phase : null, scale_refs: refs }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug,
    zones: function () { return zones.map(function (z) { return { id: z.id, x: z.x, z: z.z, y: z.y, playable_m: z.playable_m, border_m: z.border_m, size_m: z.size_m, yaw_deg: z.yaw_deg }; }); },
    zoneAt: zoneAt, setOccupants: setOccupants, begin: begin, update: update, resolve: resolve, end: resolve, phase: phaseOf, onPhase: function (fn) { listeners.push(fn); },
    classColor: function (c) { return '#' + colorOf(c).getHexString(); },
    setClassColor: function (cls, hex) { classColor[String(cls).toUpperCase()] = new THREE.Color(hex); } };   /* a future class brings its own colour (colour law: one of the five families) */
}
