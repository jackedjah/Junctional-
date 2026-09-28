/* MAHWORLD M15b → M17 :: DUEL COURTS (owner 2026-09-27: the M15 zone was "TOO SMALL"; M17 "PIVOTAL DUEL RULE — 2 TO 5 PLAYERS").
   A duel court is DORMANT WORLD INFRASTRUCTURE: a large square-diamond court drawn into the ground — crystalline inlay, faint faceted
   seams, subtle diamond anchors, low ground-bound energy. No cage, no walls, no raised arena, no spectator structure.
   SIZE (M17, validated from the rules; the owner's target is 18–24 m): 24 m of clear playable width (≈ 79 ft) plus a 1.2 m inlaid border.
     · lock-on holds a target to 34 m, and the court's diagonal (24·√2 = 33.9 m) stays inside it — nobody on the court ever drops lock;
     · the longest dash (LEAN 7.4 m) plus a body (0.4 m) fits from the centre in every direction with room to spare;
     · five fighters' dice-five starts sit 10.7 m apart — beyond the longest strike (2.9 m + 0.6 m hit radius), the largest area effect
       (6.25 m) and a dash plus two bodies — so an ACTIVATION never opens with anyone already inside another's reach;
     · the host's existing duel boundary is a 12 m radius: the same 24 m. (M15d's 31 m court let two fighters stand 43.8 m apart — past
       lock-on.) If Character integration shows 24 m is cramped for five, the court grows — combat usability first.
   THE MATCH comes from the roster engine (duelRoster.js — pure, host-shareable; DUEL_ZONE_SPEC.md is the contract): 2..5 fighters,
   duplicate classes legal (fighterId ≠ classId), a 30 s WAITING window opened by the first fighter, never a one-person duel, OD-29 for
   disconnects. The court draws what a roster snapshot says:
     · DORMANT      white / cool white-blue / pale ice, soft glass, a faint neutral shimmer. The WORLD identity — five tiny permanent class
                    gems (gold, blue, crimson, violet, pink) in a centre rosette, in every state, never colouring the surface.
     · READY        the WAITING window: the court stays neutral; a pearl light fills the border band as the 30 s pass (a steady slow pulse
                    once it has passed with one fighter — waiting for a challenger); a soft WHITE presence under each waiting fighter.
     · ACTIVATION   generated from the LOCKED roster: one territory per participant (2 halves · 3 sectors · 4 quadrants · 5 dice-five, equal
                    shares), arranged so duplicate classes sit apart and neighbours contrast; a thin pearl separator marks every slot
                    border (a little firmer between two territories of one class, so GOLD + GOLD still reads as two fighters); a surge.
     · ACTIVE_DUEL  the territories let go; the court is neutral; each fighter carries a LOCAL FIELD in their class colour — a soft aura,
                    feathered, with a faint square-diamond footprint that follows them and swells a little with speed. Same-class fields
                    reinforce modestly; different classes meet through a neutral white seam (no blended sixth colour, no white-out). Airborne
                    fighters keep their field under their horizontal position, narrower and fainter with height but never below 35 %.
     · RESOLUTION   the fields stop tracking and drain (~1.4 s).   · RESET  a neutral sweep (~1.2 s); then DORMANT.
   Host safety: pure light — the inlay lies 2.5 cm above its ground (no depth write), no collider, never interactable. Cost: ONE instanced
   draw for every court in the world; per-frame work only for a court with someone on it. */
import { CLASS_FAMILY, CLASS_IDS, CLASS_HEX, PEARL_HEX, TIMING, DUEL_RULES, MAX_FIGHTERS, PHASES, CLASS_PHASES, LOCKED_PHASES, FIVE_DIAMOND, territorySlots, splitAngle, assignSlots, duelPhase, createDuelRoster, rosterDrives } from './duelRoster.js';
export { CLASS_FAMILY, CLASS_IDS, TIMING, DUEL_RULES, MAX_FIGHTERS, PHASES, CLASS_PHASES, FIVE_DIAMOND, territorySlots, splitAngle, assignSlots, duelPhase };

export var SIZING = { melee_unit_m: 2.5, max_aoe_radius_m: 6.25, max_strike_reach_m: 3.475, max_dash_m: 7.4, body_radius_m: 0.4, lock_on_hold_m: 34, min_fighters: 2, max_fighters: 5, dice_five_spacing_m: 10.73, playable_m: 24, border_m: 1.2 };
export var IDENTITY_ORDER = ['ATHLETE', 'TITAN', 'LEAN', 'VISIONARY', 'BAGE'];   /* the five permanent class gems round the centre: gold, blue, crimson, violet, pink */
/* the neutral palette (display values): every dormant / ready colour is white or pale ice (colour law: NEUTRAL or the BLUE window, never
   a class colour's saturation) */
/* M20 CLASS IDENTITY (owner 2026-09-28: "Correct the current BLUE dominance"; the courts are shared ground): the dormant court is pearl and
   platinum — the pale-ice tones (TITAN's end of white) are equal-channel greys of the same value; the day sky sheen is neutral (the day sky is
   violet-grey, not blue); the night sky sheen keeps the night sky's own blue (natural light, not a class accent) */
export var PALETTE = { ice: 0xcccccc, core: 0xebebeb, ready: 0xf3f3f3, pearl: PEARL_HEX, fill_day: 0xdcdcdc, fill_night: 0x111214, sky_day: 0xe2e2e2, sky_night: 0x2b3f6b };

export function combatZoneList(reg) { var C = (reg && reg.combat_zones) || {}, PL = C.playable_m || SIZING.playable_m, BO = C.border_m === undefined ? SIZING.border_m : C.border_m;
  return (C.list || []).filter(function (z) { return z && isFinite(z.x) && isFinite(z.z); }).map(function (z) { var o = Object.assign({ playable_m: PL, border_m: BO, yaw_deg: 45, y: 0 }, z); o.size_m = o.playable_m + 2 * o.border_m; return o; }); }
/* exclusion circles (ground cover, shards): the court's circumcircle plus a pad */
export function combatZoneCircles(reg, pad) { return combatZoneList(reg).map(function (z) { return { x: z.x, z: z.z, r: z.size_m * 0.7072 + (pad === undefined ? 1 : pad) }; }); }
/* world → the court's square frame (metres) */
export function zoneLocal(zone, x, z) { var a = -(zone.yaw_deg || 0) * Math.PI / 180, dx = x - zone.x, dz = z - zone.z; return [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)]; }
/* inside the PLAYABLE square (plus an optional margin) */
export function insideZone(zone, x, z, margin) { var p = zoneLocal(zone, x, z); return Math.max(Math.abs(p[0]), Math.abs(p[1])) <= (zone.playable_m || zone.size_m) / 2 + (margin || 0); }

var FLOOR_V = [
  'attribute vec4 iZ; attribute vec4 iK; attribute vec4 iK2; attribute vec4 iF0; attribute vec4 iF1; attribute vec4 iF2; attribute vec4 iF3; attribute vec4 iC0; attribute vec4 iC1; attribute vec4 iC2; attribute vec4 iC3; attribute vec4 iC4;',   /* 13 attributes with position — inside WebGL2's 16 with room to spare (phones often have exactly 16). iK2.x: ready + the waiting window's progress; iK2.w: territory template (n + 10 · split-line index); iF0..iF3: five fighters × (x, z, lift · speed · presence packed) + the court's seed */
  'uniform float uMargin;',
  'varying vec4 vLD; flat varying vec4 vK; flat varying vec4 vK2; flat varying vec4 vF0; flat varying vec4 vF1; flat varying vec4 vF2; flat varying vec4 vF3; flat varying vec4 vC0; flat varying vec4 vC1; flat varying vec4 vC2; flat varying vec4 vC3; flat varying vec4 vC4;',
  'void main() { float hb = iK.x + iK2.z; vec2 L = position.xy * (hb + uMargin) * 2.0;',   /* the court's square frame, reaching past the border for the ground-bound halo */
  '  float c = cos(iZ.w), s = sin(iZ.w); vec3 w = vec3(iZ.x + L.x * c - L.y * s, iZ.y + 0.025, iZ.z + L.x * s + L.y * c);',   /* turned by the court's yaw (local y = world z); 2.5 cm inlay */
  '  vec3 V = cameraPosition - w; float D = length(V); vLD = vec4(L, D, V.y / max(D, 1e-3));',
  '  vK = iK; vK2 = iK2; vF0 = iF0; vF1 = iF1; vF2 = iF2; vF3 = iF3; vC0 = iC0; vC1 = iC1; vC2 = iC2; vC3 = iC3; vC4 = iC4;',   /* per-court data is flat: packed values must not be interpolated */
  '  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }'
].join('\n');

var FLOOR_F = [
  'uniform float uTime; uniform float uGlobal; uniform float uFacets; uniform float uFill; uniform float uSheen; uniform float uPres; uniform vec3 uIce; uniform vec3 uCore; uniform vec3 uReady; uniform vec3 uPearl; uniform vec3 uFillC; uniform vec3 uSky; uniform vec3 uMk[5]; uniform float uMarkK;',   /* uMk: the five permanent class identity gems (never a fighter slot) */
  'varying vec4 vLD; flat varying vec4 vK; flat varying vec4 vK2; flat varying vec4 vF0; flat varying vec4 vF1; flat varying vec4 vF2; flat varying vec4 vF3; flat varying vec4 vC0; flat varying vec4 vC1; flat varying vec4 vC2; flat varying vec4 vC3; flat varying vec4 vC4;',
  'float czLine(float d, float w) { float a = fwidth(d) * 1.2 + 1e-4; return 1.0 - smoothstep(w, w + a, abs(d)); }',
  'float czGlow(float d, float s) { return exp(-d * d / s); }',
  'float czHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  /* a fighter's LOCAL FIELD (duelRoster.fieldWeight, exactly): soft, mostly round with a quarter of the court's diamond in it, feathered to
     nothing at its perimeter; P = (local x, local z, height above the floor, presence), R the influence radius, s the speed 0..1 */
  'float czLiftK(float lift) { return max(0.35, 1.0 / (1.0 + max(lift, 0.0) * 0.3)); }',
  'float czField(vec2 L, vec4 P, float R, float s) { vec2 r = L - P.xy; float lk = czLiftK(P.z), Rr = max(R, 0.5) * (0.7 + 0.3 * lk) * (1.0 + 0.12 * s);',
  '  float d = (0.75 * length(r) + 0.25 * (abs(r.x) + abs(r.y)) * 0.70710678) / Rr; return P.w * lk * exp(-d * d * 1.8) * (1.0 - smoothstep(0.85, 1.35, d)); }',
  /* the square-diamond footprint inlaid under a fighter: it swells a little with speed and stays readable in the air (≥ half strength) */
  'float czFoot(vec2 L, vec4 P, float R, float s) { vec2 r = L - P.xy; float lk = czLiftK(P.z), b = max(R, 0.5) * 0.5 * (0.75 + 0.25 * lk) * (1.0 + 0.12 * s); return P.w * max(lk, 0.5) * czLine((abs(r.x) + abs(r.y)) * 0.70710678 - b * 0.70710678, 0.035 + 0.02 * s); }',
  'vec2 czSlot(float k, float n, float th, float h) { float q = n > 4.5 ? h * 0.63245553 : h * 0.5;',   /* territorySlots() in the shader: (−,−) (+,−) (+,+) (−,+), then the centre */
  '  if (n > 3.5) { if (k > 3.5) return vec2(0.0); return vec2((k > 0.5 && k < 2.5) ? q : -q, k > 1.5 ? q : -q); }',
  '  if (n > 2.5) { float a = k < 0.5 ? 1.5707963 : (k < 1.5 ? 3.5363838 : 5.8883942); return vec2(cos(a), sin(a)) * h * 0.5; }',   /* THREE_AT: exact thirds on a square court */
  '  if (n > 1.5) return vec2(cos(th), sin(th)) * h * 0.5 * (k > 0.5 ? 1.0 : -1.0); return vec2(0.0); }',
  /* unpack a fighter: v = (lift in 5 cm steps · 16 + speed in 15 steps) + presence */
  'vec4 czFP(float x, float z, float v, out float spd) { float fl = floor(v); spd = mod(fl, 16.0) / 15.0; return vec4(x, z, floor(fl / 16.0 + 1e-3) * 0.05, v - fl); }',
  'void main() { vec2 L = vLD.xy; float h = vK.x, B = vK2.z, hb = h + B, t = uTime, split = vK.y, surge = vK.z, live = vK.w, reset = vK2.y, seed = vF3.w;',
  '  float rq = floor(vK2.x), ready = vK2.x - rq, wait = rq * 0.01;',   /* ready (eased 0..1) + the WAITING window's progress */
  '  vec4 P[5]; float Sp[5]; vec3 C[5]; float R[5];',
  '  P[0] = czFP(vF0.x, vF0.y, vF0.z, Sp[0]); P[1] = czFP(vF0.w, vF1.x, vF1.y, Sp[1]); P[2] = czFP(vF1.z, vF1.w, vF2.x, Sp[2]); P[3] = czFP(vF2.y, vF2.z, vF2.w, Sp[3]); P[4] = czFP(vF3.x, vF3.y, vF3.z, Sp[4]);',
  '  C[0] = vC0.rgb; C[1] = vC1.rgb; C[2] = vC2.rgb; C[3] = vC3.rgb; C[4] = vC4.rgb; R[0] = vC0.w; R[1] = vC1.w; R[2] = vC2.w; R[3] = vC3.w; R[4] = vC4.w;',
  '  float tn = mod(vK2.w, 10.0), th = floor(vK2.w / 10.0 + 0.001) * 0.78539816;',
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
  /* the playable field: the dice-five structure faintly (the central diamond + the four seams from its tips to the edge-midpoint anchors),
     a small centre diamond, faint crystal facets (calmer toward the centre) */
  '  float c5 = h * 0.63245553, sAx = smoothstep(c5 - 0.2, c5 + 0.6, abs(L.x)), sAz = smoothstep(c5 - 0.2, c5 + 0.6, abs(L.y));',
  '  float dia = (czLine(dm - c5 * 0.70710678, 0.02) * 0.24 + (czLine(L.x, 0.014) * sAz + czLine(L.y, 0.014) * sAx) * 0.14) * field, sig = czLine(dm - 1.1, 0.02) * 0.32 + czGlow(dm, 0.06) * 0.22;',
  '  vec2 g = vec2(L.x * 0.62 + L.y * 0.62 * 0.57735, L.y * 0.62 * 1.1547), gf = fract(g), gc = floor(g); float up = step(1.0, gf.x + gf.y);',
  '  float facetT = czHash(gc * 2.0 + up), facets = 0.0;',   /* each facet has its own tone: the court reads as cut glass, not a grid */
  '  if (uFacets > 0.5) { float tri = min(min(gf.x, gf.y), abs(1.0 - gf.x - gf.y)); facets = czLine(tri, 0.012) * (0.05 + 0.07 * smoothstep(h * 0.35, h, sq)) * field * (0.7 + 0.3 * sin(t * 0.3 + gc.x * 1.7 + gc.y * 2.3)); }',
  /* the neutral shimmer: one soft light travelling round the band, and rare facet glints */
  '  float ang = mod(atan(L.y, L.x) / 6.2831853 + 1.0, 1.0);',
  '  float run = czGlow(mod(ang - t * (0.018 + 0.02 * ready) + seed, 1.0) - 0.5, 0.0015) * band;',
  '  float glint = uFacets > 0.5 ? step(0.965, facetT) * pow(0.5 + 0.5 * sin(t * 0.9 + facetT * 60.0), 16.0) * czGlow(length(gf - vec2(0.33)), 0.02) * field : 0.0;',
  '  float breath = 0.9 + 0.1 * sin(t * 0.45 + seed * 6.2831853);',
  /* LOCAL FIELDS (duelRoster.blendFields, exactly): fields of one class add up (class weight Wc), dominance D = Wtop⁴ / Σ Wc⁴, conflict =
     clamp(2(1 − D)); the colour is the dominant class eased toward a neutral grey by the conflict — two classes meet through a white seam, never a
     blended sixth colour; intensity = the strongest field + 30 % of the rest, capped (same-class overlap reinforces modestly) */
  '  float w[5]; float sumW = 0.0, maxW = 0.0; for (int i = 0; i < 5; i++) { w[i] = czField(L, P[i], R[i], Sp[i]); sumW += w[i]; maxW = max(maxW, w[i]); }',
  '  vec3 pc = uReady; float fI = 0.0;',
  '  if (sumW > 1e-4) { float S4 = 0.0, Wd = -1.0; vec3 Cd = C[0]; for (int i = 0; i < 5; i++) { float wc = 0.0; for (int j = 0; j < 5; j++) { vec3 dc = C[j] - C[i]; wc += w[j] * step(dot(dc, dc), 1e-4); } S4 += w[i] * wc * wc * wc; if (wc > Wd + 1e-6) { Wd = wc; Cd = C[i]; } }',
  '    float D = S4 > 0.0 ? Wd * Wd * Wd * Wd / S4 : 1.0; pc = mix(Cd, vec3(0.96), clamp(2.0 * (1.0 - D), 0.0, 1.0)); fI = min(1.25, maxW + 0.3 * (sumW - maxW)); }',   /* toward an equal-channel grey: the hue never turns */
  '  float fB = 0.0; vec3 footC = vec3(0.0); for (int i = 0; i < 5; i++) { float fk = czFoot(L, P[i], R[i], Sp[i]); if (fk > fB) { fB = fk; footC = C[i]; } }',   /* the strongest footprint wins a pixel: crossing outlines never mix */
  '  vec3 presC = live > 0.001 ? mix(vec3(0.95), pc, live) : uReady; float pres = fI * mix(0.5 * ready, 0.95 * uPres, live) * (1.0 - 0.7 * split);   /* uPres: bright day paving needs a stronger presence than night; the territories own the ACTIVATION moment */',
  /* ACTIVATION TERRITORIES: the court's symmetric template cells (slot k holds the participant assigned to territory k); seams through
     white, and a thin pearl separator on every slot border — firmer between two territories of ONE class, so duplicates stay readable */
  '  float d[5]; float dn = 1e4, d2 = 1e4; vec3 cn = vec3(1.0), c2 = vec3(1.0);',
  '  for (int k = 0; k < 5; k++) { float fk = float(k); d[k] = (fk < tn - 0.5 && P[k].w > 0.01) ? length(L - czSlot(fk, tn, th, h)) : 1e4; if (d[k] < dn) { d2 = dn; c2 = cn; dn = d[k]; cn = C[k]; } else if (d[k] < d2) { d2 = d[k]; c2 = C[k]; } }',
  '  float eS = 0.0; for (int k = 0; k < 5; k++) eS += exp(-(d[k] - dn) * 1.6); vec3 terrC = mix(cn, vec3(1.0), clamp(eS - 1.0, 0.0, 1.0) * 0.85);',   /* duelRoster.territoryColourAt: the nearest territory, whitened across the seam — never an average of two hues */
  '  float terr = split * live * step(dn, 1e3); vec3 dc2 = cn - c2; float sep = czLine(min(d2 - dn, 50.0), 0.035) * (0.3 + 0.45 * step(dot(dc2, dc2), 1e-4)) * field * terr * step(d2, 1e3);',
  /* colour: the neutral inlay, the territories while splitting, the presences under the fighters */
  '  vec3 lineC = mix(uCore, uIce, 0.35); lineC = mix(lineC, terrC, terr); lineC = mix(lineC, presC, clamp(pres, 0.0, 1.0) * 0.85);',
  '  float lvl = (breath * 0.78 + ready * 0.36 + terr * 0.8) * mix(1.0, 1.3, live);   /* dormant is quiet infrastructure; someone stepping on wakes it */',
  '  float lines = edges + seams + dia + facets;',
  '  vec3 col = lineC * lines * lvl + mix(uCore, lineC, 0.6) * (anch + sig) * lvl + uIce * run * 0.7 + uCore * glint * 0.5;',
  '  col += presC * pres * (0.3 * court + lines * 1.5) + footC * live * (1.0 - split) * fB * 0.9 * uPres;',   /* the class footprints show only in a live duel (never READY) */
  '  float rim5 = czLine(length(L) - 2.1, 0.01) * 0.1; vec3 mkC = vec3(0.0);',   /* the five-class rosette: a faint pearl hairline set with five tiny gems (identity, not ownership) */
  '  for (int k = 0; k < 5; k++) { float a = 1.5707963 + float(k) * 1.2566371; vec2 q = L - vec2(cos(a), sin(a)) * 2.1; float gd = (abs(q.x) + abs(q.y)) * 0.70710678; mkC += uMk[k] * (czLine(gd - 0.19, 0.016) * 0.8 + czGlow(gd, 0.01) * 1.0); }',
  '  col += uCore * rim5 * lvl + mkC * uMarkK * (1.0 - 0.4 * terr);',
  '  col += terrC * terr * (0.14 * field + 0.4 * band) + uPearl * sep;',
  '  float dmC = c5 * 0.70710678 - dm, band5 = smoothstep(-0.05, 0.1, dmC) * (1.0 - smoothstep(0.9, 1.3, dmC));',   /* the central territory's own lit band, just inside its diamond — the corners have the border band: the fifth share carries equal weight */
  '  col += C[4] * band5 * step(4.5, tn) * step(0.01, P[4].w) * split * live * 0.45;',
  /* the WAITING window (READY only, neutral): a pearl light fills the border band as the 30 s pass — then a steady slow pulse */
  '  float wOn = ready * (1.0 - live) * step(0.005, wait), wLead = czGlow(ang - wait, 0.0004) * (1.0 - step(0.999, wait));',
  '  float wFill = step(ang, wait); col *= 1.0 - wOn * 0.55 * (1.0 - wFill) * court * (1.0 - field * (1.0 - czLine(sq - h, 0.06)));',   /* a progress ring: the unfilled arc of the border dims while the window runs */
  '  col += uPearl * (band + czLine(sq - h, 0.06) * 0.8) * wOn * (step(ang, wait) * (0.55 + 0.15 * step(0.999, wait) * sin(t * 1.6)) + wLead * 1.8);',   /* the filled arc lights the band and its inner edge — readable from the approach */
  '  col += vec3(1.0) * czGlow(sq - surge * hb * 1.15, 0.8) * (1.0 - surge) * live * 1.2;',   /* the activation surge */
  '  col += uCore * czGlow(sq - (1.0 - reset) * hb, 0.5) * sin(reset * 3.14159265) * 0.6;',   /* the neutral reset sweep */
  '  col += uIce * czGlow(sq - hb, 0.45) * 0.1 * (1.0 - 0.5 * court);',   /* low ground-bound energy just outside the border */
  '  float far = 1.0 - smoothstep(180.0, 320.0, vLD.z); col *= uGlobal * far; col /= max(1.0, max(max(col.r, col.g), col.b));',   /* displayRGB: hot light scaled by its brightest channel, never clipped per channel (gold would clip to yellow) */
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
  var AUTH = ctx.duelAuthority === 'LOCAL' ? 'LOCAL' : 'HOST';   /* the live client mirrors the host; the dev preview and tests may run LOCAL */
  function makeRoster(z) { return createDuelRoster({ zoneId: z.id, authority: AUTH, halfWidth: z.playable_m / 2, toLocal: function (x, wz) { return zoneLocal(z, x, wz); } }); }
  function tier() { try { return ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { return 'HIGH'; } }
  function fam(f) { var F = (reg.crystal_families || {})[f] || {}; return F.glow || F.color || '#f4f6ff'; }
  function colorOf(cls) { var k = String(cls || '').toUpperCase(); if (classColor[k]) return classColor[k]; var c = new THREE.Color(fam(CLASS_FAMILY[k] || 'platinum')); classColor[k] = c; return c; }
  function build() {
    zones = combatZoneList(reg); WHITE = new THREE.Color(1, 1, 1); if (!zones.length) { log('combatZones: registry.combat_zones empty — nothing built'); return; }
    var qs = typeof location !== 'undefined' ? location.search : '';
    try { var m = /[?&]duelDemo=([^&]+)/.exec(qs); if (m) { var p = decodeURIComponent(m[1]).split(':'); demo = { id: p[0], classes: (p[1] || 'ATHLETE,LEAN').split(',').map(function (c) { return c.trim().toUpperCase(); }).filter(function (c) { return CLASS_IDS.indexOf(c) >= 0; }).slice(0, MAX_FIGHTERS), phase: (p[2] || 'ACTIVE_DUEL').toUpperCase(), layout: (p[3] || 'SPREAD').toUpperCase() }; if (PHASES.indexOf(demo.phase) < 0 && demo.phase !== 'WAITING_EXPIRED') demo.phase = 'ACTIVE_DUEL'; AUTH = 'LOCAL'; } } catch (e) { }   /* dev preview only: ?duelDemo=ZONE:CLS,CLS[,…]:DORMANT|READY|WAITING_EXPIRED|ACTIVATION|ACTIVE_DUEL|RESOLUTION|RESET[:SPREAD|CLUSTER|AIR] (ZONE = ALL for every court; duplicate classes allowed) */
    group = new THREE.Group(); group.name = 'MAHWORLD_COMBAT_ZONES'; group.userData.noMerge = true; group.userData.nonInteractable = true; ctx.group.add(group);
    var n = zones.length, lowQ = tier() === 'LOW', keys = ['iZ', 'iK', 'iK2', 'iF0', 'iF1', 'iF2', 'iF3', 'iC0', 'iC1', 'iC2', 'iC3', 'iC4'];
    A = {}; keys.forEach(function (k) { A[k] = new Float32Array(n * 4); });
    zones.forEach(function (z, i) { z.index = i; z.vis = {}; z.spect = {}; z.readyV = 0; z.lastPhase = 'DORMANT'; byId[z.id] = z; z.roster = makeRoster(z);
      A.iZ.set([z.x, z.y || 0, z.z, (z.yaw_deg || 0) * Math.PI / 180], i * 4); A.iK.set([z.playable_m / 2, 0, 1, 0], i * 4); A.iK2.set([0, 0, z.border_m, 0], i * 4); A.iF3[i * 4 + 3] = (i * 0.618) % 1; for (var s = 0; s < MAX_FIGHTERS; s++) A['iC' + s].set([1, 1, 1, 3.2], i * 4); });
    var attrs = {}; keys.forEach(function (k) { attrs[k] = new THREE.InstancedBufferAttribute(A[k], 4); attrs[k].setUsage(THREE.DynamicDrawUsage); });
    var fg = new THREE.InstancedBufferGeometry(), pl = new THREE.PlaneGeometry(1, 1); fg.index = pl.index; fg.setAttribute('position', pl.attributes.position); fg.instanceCount = n; keys.forEach(function (k) { fg.setAttribute(k, attrs[k]); }); own.push(fg, pl);
    uF = { uTime: { value: 0 }, uGlobal: { value: 0 }, uFacets: { value: lowQ ? 0 : 1 }, uFill: { value: 0 }, uSheen: { value: 0 }, uPres: { value: 1 }, uMargin: { value: 2.5 }, uMarkK: { value: 0.6 }, uMk: { value: IDENTITY_ORDER.map(function (c) { return colorOf(c).clone(); }) },
      uIce: { value: rawRGB(THREE, PALETTE.ice) }, uCore: { value: rawRGB(THREE, PALETTE.core) }, uReady: { value: rawRGB(THREE, PALETTE.ready) }, uPearl: { value: rawRGB(THREE, PALETTE.pearl) }, uFillC: { value: rawRGB(THREE, PALETTE.fill_day) }, uSky: { value: rawRGB(THREE, PALETTE.sky_day) } };
    setNight(night);
    var fm = new THREE.ShaderMaterial({ vertexShader: FLOOR_V, fragmentShader: FLOOR_F, uniforms: uF, transparent: true, depthWrite: false, depthTest: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, toneMapped: false }); own.push(fm);
    floor = new THREE.Mesh(fg, fm); floor.name = 'COMBAT_ZONE_FLOORS'; floor.frustumCulled = false; floor.renderOrder = 3; floor.userData.noMerge = true; floor.userData.nonInteractable = true; group.add(floor);
    A.attrs = attrs;
    try { var r = /[?&]scaleRefs=(\d+)/.exec(qs); if (r) buildRefs(Math.max(1, Math.min(8, +r[1]))); } catch (e) { }   /* dev preview only: full-size neutral human-scale references on each court */
    zones.forEach(function (z) { write(z); }); flag();
    log('combatZones: ' + n + ' courts (' + zones.map(function (z) { return z.id + ' ' + z.playable_m + ' m'; }).join(', ') + ') in 1 draw; roster authority ' + AUTH);
  }
  /* SCALE REFERENCES (dev only): neutral mannequins (1.88 m; the gameplay capsule is 1.7 m × 0.4 m radius) so the footprint reads at
     human scale. With a staged duel they stand where the staged fighters stand; otherwise at the dice-five territory centres. */
  var REF_AT = [[-0.572, -0.572], [0.572, -0.572], [0.572, 0.572], [-0.572, 0.572], [0, 0], [0.8, 0], [-0.8, 0], [0, 0.8]];
  function buildRefs(N) { var body = new THREE.CapsuleGeometry(0.2, 1.2, 4, 10), head = new THREE.SphereGeometry(0.13, 12, 8), mat = new THREE.MeshStandardMaterial({ color: 0x9aa3ae, roughness: 0.7, metalness: 0 }); own.push(body, head, mat);
    var cnt = zones.length * N, bI = new THREE.InstancedMesh(body, mat, cnt), hI = new THREE.InstancedMesh(head, mat, cnt);
    [bI, hI].forEach(function (o, j) { o.name = j ? 'COMBAT_ZONE_SCALE_REF_HEADS' : 'COMBAT_ZONE_SCALE_REFS'; o.userData.noMerge = true; o.userData.nonInteractable = true; o.userData.devOnly = true; o.castShadow = true; o.frustumCulled = false; group.add(o); });
    refs = { n: N, height_m: 1.88, body: bI, head: hI }; zones.forEach(function (z) { var hh = z.playable_m / 2; placeRefs(z, REF_AT.slice(0, N).map(function (a) { return { local: [a[0] * hh, a[1] * hh], lift: 0 }; })); }); }
  var _M = null;
  function placeRefs(z, at) { if (!refs) return; _M = _M || new THREE.Matrix4(); var c = Math.cos((z.yaw_deg || 0) * Math.PI / 180), s = Math.sin((z.yaw_deg || 0) * Math.PI / 180);
    for (var i = 0; i < refs.n; i++) { var k = z.index * refs.n + i, a = at[i]; if (!a) { _M.makeScale(0, 0, 0); refs.body.setMatrixAt(k, _M); refs.head.setMatrixAt(k, _M); continue; }
      var x = z.x + a.local[0] * c - a.local[1] * s, wz = z.z + a.local[0] * s + a.local[1] * c, y = (z.y || 0) + (a.lift || 0); _M.makeTranslation(x, y + 0.8, wz); refs.body.setMatrixAt(k, _M); _M.makeTranslation(x, y + 1.75, wz); refs.head.setMatrixAt(k, _M); }
    refs.body.instanceMatrix.needsUpdate = true; refs.head.instanceMatrix.needsUpdate = true; }
  /* the renderer's per-fighter visual state (eased; never the authority): participants from the roster snapshot, plus spectators (anyone
     on the court who is not in this match — always WHITE, never a territory) */
  function visOf(z, id) { var v = z.vis[id]; if (!v) { v = z.vis[id] = { fighterId: id, pres: 0, target: 0, lx: null, lz: null, tx: 0, tz: 0, lift: 0, spd: 0, rad: 3.2, classId: '', part: false }; } return v; }
  function specFrom(z, f) { var wp = P3(f.worldPosition) || { x: +f.x, y: +(f.y || 0), z: +f.z }; if (!isFinite(wp.x) || !isFinite(wp.z)) return null; var id = f.fighterId !== undefined ? f.fighterId : f.id, p = zoneLocal(z, wp.x, wp.z);
    var lift = f.airborneHeight !== undefined ? +f.airborneHeight : (f.worldPosition ? wp.y - (z.y || 0) : +(f.y || 0)); if (f.verticalState === 'AIRBORNE') lift = Math.max(lift, 1); if (f.verticalState === 'GROUNDED') lift = 0;
    return { fighterId: id, classId: String(f.classId || f.cls || '').toUpperCase(), local: p, lift: Math.max(0, lift || 0), inside: insideZone(z, wp.x, wp.z, 1.5), teamId: f.teamId === undefined ? null : f.teamId, rad: isFinite(f.localInfluenceRadius) ? Math.max(1.5, Math.min(SIZING.max_aoe_radius_m, +f.localInfluenceRadius)) : 3.2, part: f.isParticipant !== false }; }
  function toRoster(f) { return Object.assign({}, f, { fighterId: f.fighterId !== undefined ? f.fighterId : f.id, classId: f.classId || f.cls, worldPosition: P3(f.worldPosition) || (isFinite(f.x) ? { x: +f.x, y: +(f.y || 0), z: +f.z } : undefined) }); }
  function snapOf(z) { return z.roster.snapshot(clock); }
  /* one frame of the court: roster snapshot → visual targets → eased state → the floor's attributes */
  function refresh(z, dt) { var s = snapOf(z), dr = rosterDrives(s, clock), live = LOCKED_PHASES.indexOf(s.state) >= 0 || s.state === 'RESOLUTION', seen = {};
    s.participants.forEach(function (p) { var v = visOf(z, p.fighterId), l = p.local || (p.worldPosition ? zoneLocal(z, p.worldPosition.x, p.worldPosition.z) : null); seen[p.fighterId] = true; v.part = true; v.classId = p.classId; v.teamId = p.teamId; v.rad = p.localInfluenceRadius; v.slotId = p.slotId; v.territory = p.territory; v.status = p.status; v.locked = p.isLocked;
      if (l) { v.tx = l[0]; v.tz = l[1]; } v.lift = p.airborneState ? p.airborneState.altitude_m : 0; var ins = l ? Math.max(Math.abs(l[0]), Math.abs(l[1])) <= z.playable_m / 2 + 1.5 : false; v.target = p.isPresent && ins && s.state !== 'RESET' ? 1 : 0; });
    Object.keys(z.spect).forEach(function (id) { var q = z.spect[id]; if (seen[id] || clock - q.at > 1) { if (clock - q.at > 1) delete z.spect[id]; return; } var v = visOf(z, id); seen[id] = true; v.part = false; v.classId = q.classId; v.teamId = q.teamId; v.rad = q.rad; v.territory = null; v.slotId = null; v.status = 'SPECTATOR'; v.locked = false; v.tx = q.local[0]; v.tz = q.local[1]; v.lift = q.lift; v.target = q.inside ? 1 : 0; });
    Object.keys(z.vis).forEach(function (id) { var v = z.vis[id]; if (!seen[id]) v.target = 0; if (v.lx === null) { v.lx = v.tx; v.lz = v.tz; v.pres = dt >= 1 ? v.target : 0; } });
    dt = dt > 0 ? dt : 0; var kp = Math.min(1, dt / TIMING.presence_s), kf = Math.min(1, dt / TIMING.follow_s), frozen = s.state === 'RESOLUTION' || s.state === 'RESET';
    Object.keys(z.vis).forEach(function (id) { var v = z.vis[id], ox = v.lx, oz = v.lz; v.pres += (v.target - v.pres) * kp; if (!frozen) { v.lx += (v.tx - v.lx) * kf; v.lz += (v.tz - v.lz) * kf; }
      var sp = dt > 1e-4 && dt < 1 ? Math.hypot(v.lx - ox, v.lz - oz) / dt : 0; if (v.spdHold !== undefined) v.spd = v.spdHold; else v.spd += (Math.min(1, sp / 8) - v.spd) * Math.min(1, dt / 0.25); if (v.target === 0 && v.pres < 0.01 && !(v.part && s.participants.some(function (p) { return p.fighterId === id; }))) delete z.vis[id]; });   /* a roster participant stays listed (faded) until the roster drops it */
    z.snap = s; z.drives = dr; z.readyV += (dr.ready - z.readyV) * (dt >= 1 ? 1 : kp); if (Math.abs(z.readyV - dr.ready) < 1e-3) z.readyV = dr.ready; return s; }
  /* the floor's five slots: in a locked match slot k = territory k (the shader's template cells), then spectators; otherwise the waiting
     fighters by slot, then spectators. Outside a live match every slot is written WHITE: no class colour can reach the floor. */
  function slotsOf(z) { var s = z.snap, vis = Object.keys(z.vis).map(function (id) { return z.vis[id]; }), tn = s && s.territories ? s.territories.n : 0, out = new Array(MAX_FIGHTERS);
    var parts = vis.filter(function (v) { return v.part; }), others = vis.filter(function (v) { return !v.part; });
    if (tn) { parts.forEach(function (v) { if (typeof v.territory === 'number' && v.territory >= 0 && v.territory < MAX_FIGHTERS && !out[v.territory]) out[v.territory] = v; else others.unshift(v); }); }
    else parts.sort(function (a, b) { return (typeof a.slotId === 'number' ? a.slotId : 9) - (typeof b.slotId === 'number' ? b.slotId : 9); }).forEach(function (v) { var k = firstFree(out); if (k >= 0) out[k] = v; });
    others.sort(function (a, b) { return String(a.fighterId) < String(b.fighterId) ? -1 : 1; }).forEach(function (v) { var k = firstFree(out); if (k >= 0) out[k] = v; });
    return out; }
  function firstFree(a) { for (var k = 0; k < a.length; k++) if (!a[k]) return k; return -1; }
  function write(z) { var i = z.index * 4, s = z.snap || snapOf(z), dr = z.drives || rosterDrives(s, clock), slots = slotsOf(z), coloured = dr.live > 0 && CLASS_PHASES.indexOf(s.state) >= 0;
    A.iK[i + 1] = dr.split; A.iK[i + 2] = dr.surge; A.iK[i + 3] = dr.live; A.iK2[i] = Math.round(Math.min(1, dr.wait) * 100) + Math.min(Math.max(z.readyV, 0), 0.999); A.iK2[i + 1] = dr.reset;
    A.iK2[i + 3] = s.territories ? s.territories.template : 0;   /* the territory template: n + 10 · split-line index */
    function setF(k, v) { A['iF' + (k >> 2)][i + (k & 3)] = v; }   /* fighter k packs into floats 3k .. 3k + 2 of iF0..iF3 */
    for (var k = 0; k < MAX_FIGHTERS; k++) { var F = slots[k], C = A['iC' + k]; if (F) { var lq = Math.min(399, Math.round(Math.max(0, F.lift) * 20)), sq = Math.min(15, Math.round(Math.max(0, F.spd) * 15));
        setF(3 * k, F.lx); setF(3 * k + 1, F.lz); setF(3 * k + 2, lq * 16 + sq + Math.min(Math.max(F.pres, 0), 0.999)); var c = coloured && F.part && F.locked !== false ? colorOf(F.classId) : WHITE; C[i] = c.r; C[i + 1] = c.g; C[i + 2] = c.b; C[i + 3] = F.rad; }
      else { setF(3 * k, 0); setF(3 * k + 1, 0); setF(3 * k + 2, 0); C[i] = C[i + 1] = C[i + 2] = 1; C[i + 3] = 3.2; } }
    if (s.state !== z.lastPhase) { var prev = z.lastPhase; z.lastPhase = s.state; listeners.forEach(function (fn) { try { fn({ zone: z.id, phase: s.state, from: prev || null, t: clock }); } catch (e) { } }); }
    return s; }
  /* API — the host (or the preview) feeds fighters; the roster decides; the floor draws */
  function spectate(z, list) { list.forEach(function (f) { var q = specFrom(z, f); if (!q || q.fighterId === undefined || q.fighterId === null) return; var inRoster = z.snap && z.snap.participants.some(function (p) { return p.fighterId === q.fighterId; }); q.at = clock; if (inRoster && q.part) delete z.spect[q.fighterId]; else z.spect[q.fighterId] = q; }); }
  function setOccupants(id, fighters, dt) { var z = byId[id]; if (!z) return null; var list = (fighters || []).filter(Boolean), inside = [];   /* presence feed: everyone standing on the court now */
    list.forEach(function (f) { var q = specFrom(z, f); if (q && q.inside && q.part) inside.push(toRoster(f)); });
    var sn = z.roster.sync(inside, clock); z.snap = sn; z.spect = {}; spectate(z, list.filter(function (f) { var q = specFrom(z, f); return q && q.inside && !sn.participants.some(function (p) { return p.fighterId === q.fighterId; }); }));
    refresh(z, dt === undefined ? 0.016 : dt); write(z); flag(); return phaseOf(id); }
  function begin(id, fighters, b, opts) { var z = byId[id]; if (!z) return null; if (!Array.isArray(fighters)) { fighters = [fighters, b]; } else opts = b; opts = opts || {};   /* begin(zone, [f…], opts) — or the M15 begin(zone, a, b, opts): the host says a match starts now */
    fighters = (fighters || []).filter(Boolean); var t = opts.t !== undefined ? opts.t : clock, r = z.roster.begin(fighters.filter(function (f) { return f.isParticipant !== false; }).map(toRoster), t); if (!r.ok) return null;
    z.vis = {}; z.spect = {}; refresh(z, 1); write(z); flag(); return phaseOf(id); }
  function update(id, fighters, dt) { var z = byId[id]; if (!z) return null; var s = z.snap || snapOf(z), extra = [];
    (fighters || []).filter(Boolean).forEach(function (f) { var fid = f.fighterId !== undefined ? f.fighterId : f.id; if (f.isParticipant !== false && s.participants.some(function (p) { return p.fighterId === fid; })) z.roster.update(toRoster(f), clock); else extra.push(f); });
    spectate(z, extra); refresh(z, dt === undefined ? 0.016 : dt); write(z); flag(); return phaseOf(id); }
  function resolve(id, opts) { var z = byId[id]; if (!z) return null; var r = z.roster.resolve(opts && opts.t !== undefined ? opts.t : clock, opts && opts.result); if (!r.ok) return null; refresh(z, 0); write(z); flag(); return phaseOf(id); }
  function join(id, f, t) { var z = byId[id]; if (!z) return null; var r = z.roster.join(toRoster(f), t === undefined ? clock : t); refresh(z, 0); write(z); flag(); return r; }
  function leave(id, fighterId, cause, t) { var z = byId[id]; if (!z) return null; var r = z.roster.leave(fighterId, t === undefined ? clock : t, cause); refresh(z, 0); write(z); flag(); return r; }
  function phaseOf(id) { var z = byId[id]; if (!z) return null; var s = z.snap || snapOf(z), dr = z.drives || rosterDrives(s, clock), h = z.playable_m / 2, slots = slotsOf(z).filter(Boolean);
    var byF = {}; s.participants.forEach(function (p) { byF[p.fighterId] = p; });
    return { zone: id, phase: s.state, live: +dr.live.toFixed(3), split: +dr.split.toFixed(3), ready: dr.ready, reset: +dr.reset.toFixed(3), wait: +dr.wait.toFixed(3), paused: s.paused,
      classColourShown: dr.live > 0 && CLASS_PHASES.indexOf(s.state) >= 0 && slots.some(function (v) { return v.part && v.pres > 0.01; }),
      territories: s.territories ? s.territories.n : 0, template: s.territories ? s.territories.templateName : 'NONE', full: s.full, participantCount: s.participantCount, waiting: s.waiting, result: s.result, roster: s,
      fighters: slots.map(function (F) { var p = byF[F.fighterId]; return { fighterId: F.fighterId, slotId: p ? p.slotId : null, classId: F.classId, classColor: p ? p.classColor : null, teamId: F.teamId === undefined ? null : F.teamId, isParticipant: !!F.part, isLocked: p ? p.isLocked : false, isPresent: p ? p.isPresent : F.target > 0, status: p ? p.status : 'SPECTATOR',
        territory: F.part && s.territories && isFinite(F.territory) ? F.territory : null, local: [+F.tx.toFixed(2), +F.tz.toFixed(2)], presence: +F.pres.toFixed(2), speed01: +F.spd.toFixed(2), verticalState: F.lift > 0.05 ? 'AIRBORNE' : 'GROUNDED', airborne: F.lift > 0.05, airborneState: { airborne: F.lift > 0.05, altitude_m: +F.lift.toFixed(2) }, influence: F.rad, localInfluenceRadius: F.rad,
        control: +(1 - Math.min(1, Math.max(Math.abs(F.tx), Math.abs(F.tz)) / h)).toFixed(2), id: F.fighterId, cls: F.classId }; }) }; }   /* control: how close the fighter holds the centre (1 = on it, 0 = at the edge) */
  function flag() { if (A && A.attrs) Object.keys(A.attrs).forEach(function (k) { A.attrs[k].needsUpdate = true; }); }
  function zoneAt(x, z) { for (var i = 0; i < zones.length; i++) if (insideZone(zones[i], x, z)) return zones[i].id; return null; }
  /* DEV PREVIEW: stage a phase on a court, anchored to the current clock (the preview pins the clock after load). SPREAD: the fighters
     stand in their own territories; CLUSTER: close together so their fields overlap; AIR: the first fighter 2 m up */
  var DEMO_AT = { 1: [[0, 0]], 2: [[-0.5, -0.5], [0.5, 0.5]], 3: [[0, 0.5], [-0.433, -0.25], [0.433, -0.25]], 4: REF_AT.slice(0, 4), 5: REF_AT.slice(0, 5) };
  function demoFighters(z, t, terr) { var c = Math.cos((z.yaw_deg || 0) * Math.PI / 180), s = Math.sin((z.yaw_deg || 0) * Math.PI / 180), N = demo.classes.length, hh = z.playable_m / 2, T = terr && terr.n === N ? territorySlots(N, hh, terr.theta) : null;
    return demo.classes.map(function (cls, i) { var id = 'demo_' + i, l;
      if (demo.layout === 'CLUSTER') { var a = i * 2 * Math.PI / N + 0.4, rr = N > 1 ? 1.35 : 0; l = [-2.5 + Math.cos(a) * rr + 0.25 * Math.sin(t * 0.7 + i), 2 + Math.sin(a) * rr + 0.25 * Math.cos(t * 0.6 + i)]; }
      else { var k = T && terr.byFighter[id] !== undefined ? terr.byFighter[id] : -1, r = k >= 0 ? [T[k][0] / hh, T[k][1] / hh] : DEMO_AT[N][i]; l = [r[0] * hh * 0.9 + 0.5 * Math.sin(t * 0.7 + i), r[1] * hh * 0.9 + 0.5 * Math.cos(t * 0.6 + i * 2)]; }
      var lift = demo.layout === 'AIR' && i === 0 ? 2 : 0;
      return { fighterId: id, classId: cls, teamId: null, local: l, worldPosition: { x: z.x + l[0] * c - l[1] * s, y: (z.y || 0) + lift, z: z.z + l[0] * s + l[1] * c }, airborneState: { airborne: lift > 0, altitude_m: lift }, localInfluenceRadius: 3.2 }; }); }
  function runDemo(t, dt) { var list = demo.id === 'ALL' ? zones : zones.filter(function (z) { return z.id === demo.id; });
    list.forEach(function (z) { var P = demo.phase, R = z.roster;
      if (z.demoT === undefined || Math.abs(t - z.demoT) > 0.5) { R = z.roster = makeRoster(z); z.vis = {}; var fs = demoFighters(z, t, null);   /* (re)staged whenever the clock jumps — the preview pins it after load */
        if (P === 'READY') fs.forEach(function (f, i) { R.join(f, t - 12 + i * 0.5); });
        else if (P === 'WAITING_EXPIRED') R.join(fs[0], t - 36);
        else if (P !== 'DORMANT') { R.begin(fs, t - (P === 'ACTIVATION' ? 0.9 : 12)); if (P === 'RESOLUTION') R.resolve(t - 0.5, { outcome: 'ENDED', reason: 'DEMO' }); if (P === 'RESET') R.resolve(t - (TIMING.resolution_s + TIMING.reset_s * 0.35), { outcome: 'ENDED', reason: 'DEMO' }); } }
      z.demoT = t; var sn = R.snapshot(t), fs2 = demoFighters(z, t, sn.territories); fs2.forEach(function (f, i) { R.update(f, t); if (z.vis[f.fighterId]) z.vis[f.fighterId].spdHold = P === 'ACTIVE_DUEL' ? [0.8, 0.15, 0.55, 0.3, 0.65][i % 5] : 0; });
      placeRefs(z, fs2.slice(0, refs ? refs.n : 0).map(function (f) { return { local: f.local, lift: f.airborneState.altitude_m }; })); }); }
  /* HOST ADAPTER (unverified until the runtime bridge lands; the host's duel is still 1v1 — DuelHost JOIN_DUEL refuses a third fighter):
     · the M17 contract: the host ships every court's roster snapshot (snap.duelZones — an array of { duelZoneId, state, participants … }
       or a map by court id), and each court mirrors it (roster.applySnapshot);
     · the legacy 1v1 path: when the host snapshot reports a live duel (snap.duel.state / rules.match.state) and the opponent is known,
       the court the local player stands on runs it with those two fighters — me.position + rules.me.class, the opponent from
       snap.duel.opponent or rules.others;
     · otherwise the local player standing on a court feeds its presence (a WAITING window that never locks by itself: HOST authority).
     Missing fields simply leave every court dormant. */
  function hostDuel(dt) { var s = null; try { s = ctx.snapshot ? ctx.snapshot() : null; } catch (e) { } if (!s) return;
    if (s.duelZones && typeof s.duelZones === 'object') { zones.forEach(function (z) { var hz = Array.isArray(s.duelZones) ? s.duelZones.filter(function (q) { return q && q.duelZoneId === z.id; })[0] : s.duelZones[z.id]; if (hz) { z.roster.applySnapshot(hz); z.hostRoster = true; } else if (z.hostRoster) { z.roster.applySnapshot({ state: 'DORMANT', participants: [] }); z.hostRoster = false; } }); return; }
    var R = s.rules || {}, st = (s.duel && s.duel.state) || (R.match && R.match.state) || null, live = ['ACTIVE', 'STARTING', 'COUNTDOWN', 'ACTIVATION', 'ACTIVE_DUEL'].indexOf(st) >= 0;
    var mp = P3(s.me && (s.me.position || s.me.pos)), meCls = (R.me && R.me.class) || (s.me && s.me.class) || null, op = (s.duel && s.duel.opponent) || (R.others && R.others[0]) || null, opP = op && P3(op.position || op.pos || op), opCls = op && (op.class || op.class_id) || null;
    var zid = mp ? zoneAt(mp.x, mp.z) : null, cur = zones.filter(function (z) { return z.hostDuel; })[0];
    var me = mp ? { fighterId: 'me', classId: meCls, worldPosition: mp } : null, you = opP ? { fighterId: 'op', classId: opCls, worldPosition: opP } : null;
    if (live && zid && you) { var zz = byId[zid], locked = zz.snap && LOCKED_PHASES.indexOf(zz.snap.state) >= 0; if (!cur || cur.id !== zid || !locked) { if (cur && cur.id !== zid) { resolve(cur.id); cur.hostDuel = false; } begin(zid, [me, you]); zz.hostDuel = true; } update(zid, [me, you], dt); return; }
    if (cur) { resolve(cur.id); cur.hostDuel = false; }
    zones.forEach(function (z) { if (z.snap && LOCKED_PHASES.indexOf(z.snap.state) >= 0) return; if (z.id === zid && me) { setOccupants(z.id, [me], dt); z.hostOcc = true; } else if (z.hostOcc) { setOccupants(z.id, [], dt); z.hostOcc = false; } }); }
  function tick(dt, t) { if (!zones.length) return; var prev = clock; clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); var d = Math.max(0, Math.min(0.1, dt || (clock - prev) || 0.016)); uF.uTime.value = clock;
    if (demo) runDemo(clock, d); else hostDuel(d);
    var any = false; zones.forEach(function (z) { var st = z.roster.state(clock), busy = st !== 'DORMANT' || Object.keys(z.vis).length || Object.keys(z.spect).length || z.readyV > 1e-3 || z.lastPhase !== 'DORMANT';
      if (!busy) return; refresh(z, demo ? 1 : d); write(z); any = true; });
    if (any) flag(); }
  function setNight(n) { night = !!n; if (!uF) return; uF.uGlobal.value = night ? 1.0 : 0.72; uF.uFill.value = night ? 0.16 : 0.13; uF.uSheen.value = night ? 0.22 : 0.16; uF.uPres.value = night ? 1 : 1.7; uF.uMarkK.value = night ? 0.55 : 0.8;
    uF.uFillC.value.copy(rawRGB(THREE, night ? PALETTE.fill_night : PALETTE.fill_day)); uF.uSky.value.copy(rawRGB(THREE, night ? PALETTE.sky_night : PALETTE.sky_day)); }
  function dispose() { if (group && group.parent) group.parent.remove(group); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; zones = []; byId = {}; group = floor = null; refs = null; }
  function debug() { return { identity_markers: IDENTITY_ORDER.slice(), authority: AUTH, rules: Object.assign({}, DUEL_RULES), courts: zones.map(function (z) { var s = z.snap || snapOf(z); return { id: z.id, at: [z.x, z.z], y: z.y, playable_m: z.playable_m, border_m: z.border_m, size_m: z.size_m, yaw_deg: z.yaw_deg, phase: s.state, participants: s.participantCount, full: s.full }; }),
    draw_calls: zones.length ? 1 + (refs ? 2 : 0) : 0, demo: demo ? demo.id + ':' + demo.classes.join(',') + ':' + demo.phase + ':' + demo.layout : null, scale_refs: refs ? { n: refs.n, height_m: refs.height_m } : null }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug,
    zones: function () { return zones.map(function (z) { return { id: z.id, x: z.x, z: z.z, y: z.y, playable_m: z.playable_m, border_m: z.border_m, size_m: z.size_m, yaw_deg: z.yaw_deg }; }); },
    zoneAt: zoneAt, setOccupants: setOccupants, begin: begin, update: update, resolve: resolve, end: resolve, join: join, leave: leave, phase: phaseOf, onPhase: function (fn) { listeners.push(fn); },
    roster: function (id) { var z = byId[id]; return z ? z.roster : null; }, snapshot: function (id) { var z = byId[id]; return z ? snapOf(z) : null; },
    classColor: function (c) { return '#' + colorOf(c).getHexString(); },
    setClassColor: function (cls, hex) { classColor[String(cls).toUpperCase()] = new THREE.Color(hex); } };   /* a future class brings its own colour (colour law: one of the five families) */
}
