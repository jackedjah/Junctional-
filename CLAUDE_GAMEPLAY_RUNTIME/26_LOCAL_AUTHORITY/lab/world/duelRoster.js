/* MAHWORLD M17 :: DUEL ROSTER ENGINE — 2 TO 5 FIGHTERS (owner directive 2026-09-27, "PIVOTAL DUEL RULE").
   PURE: no THREE, no DOM. The host can run it as the authority and ship snapshot(); the client mirrors that snapshot (applySnapshot) or,
   with no host, runs it LOCAL for the preview. The world's court renderer (combatZones.js) only draws what a snapshot says.
   THE RULES (DUEL_ZONE_SPEC.md is the locked contract):
     · a match is 2..5 fighters; same-class rosters are legal (five ATHLETEs, two VISIONARYs + three BAGE …): fighterId ≠ classId, one
       participant per fighter, never one per class;
     · the first fighter onto a DORMANT court opens a 30 s WAITING window (state READY). Others may join (max 5 → FULL); joining never
       restarts the window. At expiry: ≥ 2 fighters → the roster LOCKS and ACTIVATION begins; 1 fighter → no match (never a one-person
       duel) — and if a second fighter arrives after the window has passed, the match starts at once. Everyone leaving → RESET → DORMANT;
     · slots store participant identity (lowest free slot on join); the participant's class sets the colour, never the slot;
     · OD-29 (00_CORE/dev_tuning local_authority, owner-approved 2026-09-14) is preserved for the locked match: a DISCONNECT pauses the
       duel (PAUSE_AND_WAIT) with a 10 s reconnect window per fighter; the first expiry ends the match NO_CONTEST (no winner); a voluntary
       EXIT concedes; the last fighter standing wins. Walking off the court is OUTSIDE (the host owns ring-out rules); nobody present
       for 10 s ends it NO_CONTEST (ABANDONED);
     · after a match, fighters still standing on the court must step off and back on to queue again (REENTER) — nobody is pulled into a
       second duel.
   ACTIVATION TERRITORIES are generated from the LOCKED roster — one per participant, never one per class — on the court's own symmetry
   (2 halves · 3 sectors · 4 quadrants · 5 dice-five), and arranged deterministically: duplicate classes as far apart as the geometry
   allows, then the strongest local colour contrast, then the least travel from where each fighter stands, then slot order. Presentation
   only: identity, spawn and gameplay are never changed by it.
   LOCAL FIELDS (ACTIVE_DUEL) and ACTIVATION TERRITORIES blend hue-safely: overlapping fields of one class reinforce modestly and never
   change colour; different classes meet through a neutral white seam (each side keeps its own hue — averaging gold and crimson would
   pass orange, blue and pink would fake VISIONARY purple); easing is always toward an equal-channel grey and hot values are scaled, never
   clipped per channel, so no sixth colour can appear and five overlaps never wash out. */

export var CLASS_IDS = ['ATHLETE', 'TITAN', 'LEAN', 'VISIONARY', 'BAGE'];
export var CLASS_FAMILY = { ATHLETE: 'gold', TITAN: 'blue', LEAN: 'red', VISIONARY: 'purple', BAGE: 'pink' };
export var CLASS_HEX = { ATHLETE: 0xffd77a, TITAN: 0x5c8cff, LEAN: 0xff5a6a, VISIONARY: 0xb99cff, BAGE: 0xffa6d4 };   /* the registry crystal families' glow (the test pins them) */
export var PEARL_HEX = 0xf4f6ff;
export var SEAM_GREY = 0.96;   /* the neutral a seam eases toward: an equal-channel grey-white, so easing never turns a hue (pearl is faintly blue and would turn crimson toward pink) */
export var DUEL_RULES = { min_fighters: 2, max_fighters: 5, wait_s: 30, reconnect_window_s: 10, abandon_s: 10, rearm: 'REENTER', disconnect: 'PAUSE_AND_WAIT', disconnect_expiry: 'NO_CONTEST', voluntary_exit: 'CONCEDE' };
export var TIMING = { activation_s: 2.8, split_hold_s: 1.3, resolution_s: 1.4, reset_s: 1.2, presence_s: 0.35, follow_s: 0.08 };
export var MAX_FIGHTERS = 5;
export var PHASES = ['DORMANT', 'READY', 'ACTIVATION', 'ACTIVE_DUEL', 'RESOLUTION', 'RESET'];
export var CLASS_PHASES = ['ACTIVATION', 'ACTIVE_DUEL', 'RESOLUTION'];   /* the only phases in which any class colour may show */
export var LOCKED_PHASES = ['ACTIVATION', 'ACTIVE_DUEL'];
export var TEMPLATE_NAMES = { 0: 'NONE', 1: 'WHOLE', 2: 'HALVES', 3: 'SECTORS', 4: 'QUADRANTS', 5: 'DICE_FIVE' };

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function sm(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
function smoothstep(a, b, x) { return sm((x - a) / (b - a)); }
export function hexRGB(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; }
export function classHex(cls) { return CLASS_HEX[String(cls || '').toUpperCase()]; }

/* THE TERRITORY TEMPLATE (the court's own symmetry): n fighters split the court into n symmetric territories — the Voronoi cells of these
   slot points (local metres; h = half the playable width):
     · 5  dice-five: four corner territories + a central diamond |x| + |z| ≤ h·√0.4, each exactly one fifth of the court;
     · 4  the four corner quadrants;   · 3  three sectors of exactly one third (borders at 33.7°, 146.3°, 270°);   · 2  two halves on a court symmetry line;   · 1  the whole court.
   Slot order (the shader's czSlot matches it): (−,−) (+,−) (+,+) (−,+) then the centre. */
export var FIVE_DIAMOND = Math.sqrt(0.4);
/* three sectors of EXACTLY one third on a square court: the top slot at 90° and the lower two turned 7.4° toward the bottom (202.6°, 337.4°),
   so the sector borders run at 33.7° (tan = 2/3), 146.3° and 270° — plain 120° sectors would give 0.356 / 0.322 / 0.322 */
export var THREE_AT = [Math.PI / 2, 1.5 * Math.PI - 2 * Math.atan(2 / 3), 1.5 * Math.PI + 2 * Math.atan(2 / 3)];
export function territorySlots(n, h, theta) { n = Math.max(1, Math.min(MAX_FIGHTERS, n | 0)); theta = theta || 0; var q, k, out = [];
  if (n === 5) { q = h * FIVE_DIAMOND; return [[-q, -q], [q, -q], [q, q], [-q, q], [0, 0]]; }
  if (n === 4) { q = h / 2; return [[-q, -q], [q, -q], [q, q], [-q, q]]; }
  if (n === 3) { THREE_AT.forEach(function (a) { out.push([Math.cos(a) * h / 2, Math.sin(a) * h / 2]); }); return out; }
  if (n === 2) return [[-Math.cos(theta) * h / 2, -Math.sin(theta) * h / 2], [Math.cos(theta) * h / 2, Math.sin(theta) * h / 2]];
  return [[0, 0]]; }
/* the two-fighter split line: the court symmetry direction (0, 45°, 90°, 135°) nearest the line between the fighters */
export function splitAngle(a, b) { var t = Math.atan2(b[1] - a[1], b[0] - a[0]); if (!isFinite(t)) return 0; var k = ((Math.round(t / (Math.PI / 4)) % 4) + 4) % 4; return k * Math.PI / 4; }   /* a line, so [0, π) */
/* fighters → territory slots by least total travel alone (exhaustive; n ≤ 5 is at most 120 orders) — the M15d rule, kept for callers */
export function assignSlots(points, slots) { var n = Math.min(points.length, slots.length), best = null, bestC = 1e18, used = [], cur = [];
  (function go(i, c) { if (c >= bestC) return; if (i === n) { bestC = c; best = cur.slice(); return; }
    for (var k = 0; k < slots.length; k++) { if (used[k]) continue; var dx = points[i][0] - slots[k][0], dz = points[i][1] - slots[k][1]; used[k] = true; cur[i] = k; go(i + 1, c + dx * dx + dz * dz); used[k] = false; } })(0, 0);
  return best || []; }
function nearestSlot(S, x, z) { var b = 0, bd = 1e18; for (var k = 0; k < S.length; k++) { var dx = x - S[k][0], dz = z - S[k][1], d = dx * dx + dz * dz; if (d < bd - 1e-12) { bd = d; b = k; } } return b; }
/* how much border two territories share: the length of their Voronoi edge inside the court (walked along the pair's bisector, kept
   where no other slot is closer), normalised to the longest border; 0 = they only touch at a point. Cached per template. */
var ADJ = {};
export function territoryAdjacency(n, theta) { n = Math.max(1, Math.min(MAX_FIGHTERS, n | 0)); var key = n + ':' + Math.round((theta || 0) / (Math.PI / 4)); if (ADJ[key]) return ADJ[key];
  var S = territorySlots(n, 1, theta || 0), W = [], a, b, k, mx = 0, STEP = 0.002;
  for (a = 0; a < n; a++) W.push(new Array(n).fill(0));
  for (a = 0; a < n; a++) for (b = a + 1; b < n; b++) { var mx0 = (S[a][0] + S[b][0]) / 2, mz0 = (S[a][1] + S[b][1]) / 2, dx = -(S[b][1] - S[a][1]), dz = S[b][0] - S[a][0], L = Math.hypot(dx, dz) || 1, len = 0; dx /= L; dz /= L;
    for (var t = -3; t <= 3; t += STEP) { var x = mx0 + dx * t, z = mz0 + dz * t; if (Math.abs(x) > 1 || Math.abs(z) > 1) continue; var da = (x - S[a][0]) * (x - S[a][0]) + (z - S[a][1]) * (z - S[a][1]), ok = true;
      for (k = 0; k < n && ok; k++) { if (k === a || k === b) continue; if ((x - S[k][0]) * (x - S[k][0]) + (z - S[k][1]) * (z - S[k][1]) < da - 1e-9) ok = false; } if (ok) len += STEP; }
    if (len < 0.01) len = 0; W[a][b] = W[b][a] = len; mx = Math.max(mx, len); }
  for (a = 0; a < n; a++) for (b = 0; b < n; b++) W[a][b] = mx ? +(W[a][b] / mx).toFixed(3) : 0;
  ADJ[key] = W; return W; }
/* two classes side by side: 1 for the same class (a duplicate seam), else a small term that is larger for close hues (gold / crimson,
   blue / violet, pink / crimson) so neighbours are picked for contrast */
export function classSimilarity(a, b) { if (a === b) return 1; var A = hexRGB(classHex(a) || PEARL_HEX), B = hexRGB(classHex(b) || PEARL_HEX); return 0.25 * (1 - Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) / Math.sqrt(3)); }
/* THE ARRANGEMENT: participants (in slot order: { fighterId, slotId, classId, local: [x, z] }) → territories. Exhaustive over the n! orders
   (≤ 120), scored by (1) the shared border between same / similar colours, (2) travel from where each fighter stands, (3) enumeration
   order (lexicographic in slot order) — so the same roster and positions always give the same answer, and no frame can flicker. */
export function arrangeTerritories(parts, h) { h = h || 12; var P = (parts || []).slice(0, MAX_FIGHTERS).slice().sort(function (a, b) { return (a.slotId | 0) - (b.slotId | 0); }), n = P.length;
  if (!n) return { n: 0, theta: 0, template: 0, templateName: 'NONE', perm: [], territoryOf: {}, order: [], colourScore: 0, travel: 0 };
  function pos(p) { var l = p.local; return l && isFinite(l[0]) && isFinite(l[1]) ? l : null; }
  var theta = n === 2 && pos(P[0]) && pos(P[1]) ? splitAngle(pos(P[0]), pos(P[1])) : 0, S = territorySlots(n, h, theta), A = territoryAdjacency(n, theta), sim = [], i, j;
  for (i = 0; i < n; i++) { sim.push([]); for (j = 0; j < n; j++) sim[i].push(i === j ? 0 : classSimilarity(P[i].classId, P[j].classId)); }
  var best = null, used = [], cur = [];
  (function go(k) { if (k === n) { var cs = 0, tr = 0; for (var a = 0; a < n; a++) { for (var b = a + 1; b < n; b++) cs += A[cur[a]][cur[b]] * sim[a][b]; var l = pos(P[a]); if (l) { var dx = l[0] - S[cur[a]][0], dz = l[1] - S[cur[a]][1]; tr += (dx * dx + dz * dz) / (h * h); } }
      cs = Math.round(cs * 1e6); tr = Math.round(tr * 1e6); if (!best || cs < best.cs || (cs === best.cs && tr < best.tr)) best = { perm: cur.slice(), cs: cs, tr: tr }; return; }
    for (var t = 0; t < n; t++) { if (used[t]) continue; used[t] = true; cur[k] = t; go(k + 1); used[t] = false; } })(0);
  var tOf = {}, order = new Array(n); P.forEach(function (p, k) { tOf[p.fighterId] = best.perm[k]; order[best.perm[k]] = p.fighterId; });
  return { n: n, theta: theta, template: n + 10 * Math.round(theta / (Math.PI / 4)), templateName: TEMPLATE_NAMES[n], perm: best.perm, territoryOf: tOf, order: order, colourScore: best.cs / 1e6, travel: best.tr / 1e6 }; }
/* the best colour score any arrangement of these classes could reach (for tests: the chosen arrangement must reach it) */
export function bestColourScore(classes, theta) { var n = classes.length, A = territoryAdjacency(n, theta || 0), best = 1e18, used = [], cur = [];
  (function go(k) { if (k === n) { var cs = 0; for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) cs += A[cur[a]][cur[b]] * classSimilarity(classes[a], classes[b]); best = Math.min(best, Math.round(cs * 1e6)); return; }
    for (var t = 0; t < n; t++) { if (used[t]) continue; used[t] = true; cur[k] = t; go(k + 1); used[t] = false; } })(0);
  return best / 1e6; }

/* LOCAL PRESENCE FIELDS (the shader mirrors this exactly: czField + the class-grouped blend in combatZones.js).
   f = { x, z (court-local metres), lift (m above the floor), presence 0..1, radius (m), speed01 0..1 }. Airborne fighters keep their
   field under their horizontal position; it narrows and fades with height but never below 35 % (always readable). */
export function fieldWeight(x, z, f) { var liftK = Math.max(0.35, 1 / (1 + Math.max(+f.lift || 0, 0) * 0.3)), R = Math.max(+f.radius || 3.2, 0.5) * (0.7 + 0.3 * liftK) * (1 + 0.12 * clamp01(+f.speed01 || 0));
  var rx = x - f.x, rz = z - f.z, d = (0.75 * Math.hypot(rx, rz) + 0.25 * (Math.abs(rx) + Math.abs(rz)) * Math.SQRT1_2) / R;
  return clamp01(f.presence === undefined ? 1 : +f.presence) * liftK * Math.exp(-d * d * 1.8) * (1 - smoothstep(0.85, 1.35, d)); }
/* the blend at one point: class weights W_c (fields of one class add up), dominance D = W_top⁴ / Σ W_c⁴ (1 = one class alone, 0.5 = two
   classes equal), conflict = clamp(2(1 − D)); colour = the dominant class colour eased toward the neutral seam grey by the conflict;
   intensity = the strongest field plus 30 % of the rest, capped at 1.25 (same-class overlap reinforces modestly; five overlaps never
   blow out) */
export function blendFields(x, z, fields) { var n = (fields || []).length, w = [], sumW = 0, maxW = 0, i, j;
  for (i = 0; i < n; i++) { w.push(fieldWeight(x, z, fields[i])); sumW += w[i]; maxW = Math.max(maxW, w[i]); }
  var G = SEAM_GREY; if (sumW < 1e-6) return { rgb: [G, G, G], intensity: 0, dominant: null, conflict: 0, classes: 0 };
  var Wc = [], S4 = 0, dom = 0, seen = {}; for (i = 0; i < n; i++) { var c = 0; for (j = 0; j < n; j++) if (fields[j].classId === fields[i].classId) c += w[j]; Wc.push(c); S4 += w[i] * c * c * c; if (c > Wc[dom] + 1e-12) dom = i; if (w[i] > 1e-6) seen[fields[i].classId] = true; }
  var D = S4 > 0 ? Math.pow(Wc[dom], 4) / S4 : 1, conflict = clamp01(2 * (1 - D)), C = hexRGB(classHex(fields[dom].classId) || PEARL_HEX);
  return { rgb: [C[0] + (G - C[0]) * conflict, C[1] + (G - C[1]) * conflict, C[2] + (G - C[2]) * conflict], intensity: Math.min(1.25, maxW + 0.3 * (sumW - maxW)), dominant: fields[dom].classId, conflict: conflict, classes: Object.keys(seen).length }; }

/* the ACTIVATION territory colour at a court point (the shader's territory term, exactly): the nearest territory's class colour, eased
   toward white across the seam (e_k = exp(−1.6 (d_k − d_min)), seam = clamp(Σe − 1) · 0.85) — two territories meet through white, never
   through an average of their hues. colours[k] = [r, g, b] of territory k. Returns { rgb, territory, seam }. */
export function territoryColourAt(x, z, n, h, theta, colours) { var S = territorySlots(n, h, theta), dn = 1e9, kn = 0, k, d = [];
  for (k = 0; k < n; k++) { d.push(Math.hypot(x - S[k][0], z - S[k][1])); if (d[k] < dn - 1e-12) { dn = d[k]; kn = k; } }
  var eS = 0; for (k = 0; k < n; k++) eS += Math.exp(-(d[k] - dn) * 1.6); var sm = clamp01(eS - 1) * 0.85, C = colours[kn];
  return { rgb: [C[0] + (1 - C[0]) * sm, C[1] + (1 - C[1]) * sm, C[2] + (1 - C[2]) * sm], territory: kn, seam: sm }; }
/* what the display gets: hot light is scaled down by its brightest channel (hue kept), never clipped channel by channel (gold would clip
   to yellow) */
export function displayRGB(rgb, k) { k = k === undefined ? 1 : k; var v = [rgb[0] * k, rgb[1] * k, rgb[2] * k], m = Math.max(v[0], v[1], v[2]); return m > 1 ? [v[0] / m, v[1] / m, v[2] / m] : v; }

/* every roster COMPOSITION (class multiset) of min..max fighters — combinations with repetition over the five classes:
   C(6,4) + C(7,4) + C(8,4) + C(9,4) = 15 + 35 + 70 + 126 = 246 for 2..5 */
export function rosterCompositions(minN, maxN) { minN = minN || 2; maxN = maxN || MAX_FIGHTERS; var out = [];
  for (var n = minN; n <= maxN; n++) (function go(start, acc) { if (acc.length === n) { out.push(acc.slice()); return; } for (var c = start; c < CLASS_IDS.length; c++) { acc.push(CLASS_IDS[c]); go(c, acc); acc.pop(); } })(0, []);
  return out; }

/* THE LEGACY PHASE FUNCTION (M15b; kept for callers): S = { occupied, tStart, tResolve } → the phase and the shader drives */
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
/* THE SHADER DRIVES from a roster snapshot (host or local): live (how much class colour may show: 0 in DORMANT, READY and RESET), split
   (the activation territories), surge (the activation wave), ready (the neutral occupied response), reset (the neutral sweep), wait (the
   WAITING window's progress, 0..1) and paused (OD-29) */
export function rosterDrives(s, t) { var T = TIMING, st = s && s.state || 'DORMANT', o = { phase: st, live: 0, split: 0, surge: 1, ready: 0, reset: 0, wait: 0, paused: !!(s && s.paused) };
  if (st === 'READY') { o.ready = 1; o.wait = s.waiting && s.waiting.startedAt !== null ? clamp01((t - s.waiting.startedAt) / ((s.rules && s.rules.wait_s) || DUEL_RULES.wait_s)) : 0; }
  else if (st === 'ACTIVATION') { var dt = Math.max(0, t - s.lockedAt); o.live = 1; o.ready = 1; o.split = dt <= T.split_hold_s ? 1 : 1 - sm((dt - T.split_hold_s) / (T.activation_s - T.split_hold_s)); o.surge = Math.min(1, dt / 1.6); }
  else if (st === 'ACTIVE_DUEL') { o.live = 1; o.ready = 1; }
  else if (st === 'RESOLUTION') { o.live = 1 - sm((t - s.resolvedAt) / T.resolution_s); o.ready = 1; }
  else if (st === 'RESET') { o.reset = clamp01((t - s.resetAt) / T.reset_s); }
  return o; }

/* THE ROSTER STATE MACHINE (one per court). opts: { zoneId, authority: 'LOCAL' | 'HOST', halfWidth (m), rules, timing }.
   LOCAL decides its own lock / expiry / walkover; HOST only mirrors applySnapshot() for those decisions (presentation timing still runs).
   Fighters: { fighterId, classId, worldPosition {x,y,z} | [x,y,z], local [x,z] (court frame), teamId, localInfluenceRadius,
   airborneState { airborne, altitude_m } | verticalState + airborneHeight }. Times are seconds on one monotonic clock. */
export function createDuelRoster(opts) {
  opts = opts || {}; var RU = Object.assign({}, DUEL_RULES, opts.rules || {}), T = Object.assign({}, TIMING, opts.timing || {}), zoneId = opts.zoneId === undefined ? null : opts.zoneId;
  var LOCAL = opts.authority !== 'HOST', halfW = opts.halfWidth || 12, S = null, events = [], listeners = [];
  function reset0(keepCooldown) { var cd = keepCooldown && S ? S.cooldown : {}; S = { state: 'DORMANT', since: 0, waitStartedAt: null, expired: false, lockedAt: null, resolvedAt: null, resetAt: null, result: null, parts: [], cooldown: cd, arrangement: null, pausedAt: null, absentSince: null, cancelled: false }; }
  reset0(false);
  function emit(t, type, extra) { var e = Object.assign({ t: +(+t).toFixed(4), type: type, zone: zoneId, state: S.state }, extra || {}); events.push(e); if (events.length > 400) events.shift(); listeners.forEach(function (fn) { try { fn(e); } catch (x) { } }); return e; }
  function idOf(f) { return f ? (f.fighterId !== undefined ? f.fighterId : f.id) : undefined; }
  function clsOf(f) { return String((f && (f.classId || f.cls)) || '').toUpperCase(); }
  function find(id) { for (var i = 0; i < S.parts.length; i++) if (S.parts[i].fighterId === id) return S.parts[i]; return null; }
  function freeSlot() { for (var k = 0; k < RU.max_fighters; k++) if (!S.parts.some(function (p) { return p.slotId === k; })) return k; return -1; }
  function locked() { return LOCKED_PHASES.indexOf(S.state) >= 0; }
  function standing() { return S.parts.filter(function (p) { return p.isLocked && (p.status === 'LOCKED' || p.status === 'OUTSIDE' || p.status === 'RECONNECTING'); }); }
  function setPos(p, f) { var wp = f.worldPosition, x, y, z; if (Array.isArray(wp)) { x = +wp[0]; y = +(wp[1] || 0); z = +wp[2]; } else if (wp && isFinite(wp.x) && isFinite(wp.z)) { x = +wp.x; y = +(wp.y || 0); z = +wp.z; } else if (isFinite(f.x) && isFinite(f.z)) { x = +f.x; y = +(f.y || 0); z = +f.z; }
    if (isFinite(x) && isFinite(z)) p.worldPosition = { x: x, y: isFinite(y) ? y : 0, z: z };
    if (f.local && isFinite(f.local[0]) && isFinite(f.local[1])) p.local = [+f.local[0], +f.local[1]]; else if (p.worldPosition && opts.toLocal) p.local = opts.toLocal(p.worldPosition.x, p.worldPosition.z);
    var alt = f.airborneState && isFinite(f.airborneState.altitude_m) ? +f.airborneState.altitude_m : (isFinite(f.airborneHeight) ? +f.airborneHeight : null), air = f.airborneState ? !!f.airborneState.airborne : (f.verticalState ? f.verticalState === 'AIRBORNE' : null);
    if (alt === null && air === null) return; if (alt === null) alt = air ? Math.max(1, p.airborneState.altitude_m) : 0; if (air === null) air = alt > 0.05; p.airborneState = { airborne: air, altitude_m: Math.max(0, alt) }; }
  function make(f, slot, t) { var p = { fighterId: idOf(f), slotId: slot, classId: clsOf(f), classColor: '#' + ('000000' + classHex(clsOf(f)).toString(16)).slice(-6), worldPosition: null, local: null, isPresent: true, isLocked: false,
      teamId: f.teamId === undefined ? null : f.teamId, airborneState: { airborne: false, altitude_m: 0 }, localInfluenceRadius: isFinite(f.localInfluenceRadius) ? Math.max(1.5, Math.min(6.25, +f.localInfluenceRadius)) : 3.2, territory: null, status: 'WAITING', joinedAt: t, reconnectDeadline: null };
    setPos(p, f); return p; }
  function lock(t) { S.parts = S.parts.filter(function (p) { return p.isPresent; }).sort(function (a, b) { return a.slotId - b.slotId; });
    S.state = 'ACTIVATION'; S.since = t; S.lockedAt = t; S.parts.forEach(function (p) { p.isLocked = true; p.status = 'LOCKED'; });
    S.arrangement = arrangeTerritories(S.parts.map(function (p) { return { fighterId: p.fighterId, slotId: p.slotId, classId: p.classId, local: p.local }; }), halfW);
    S.parts.forEach(function (p) { p.territory = S.arrangement.territoryOf[p.fighterId]; }); emit(t, 'LOCK', { roster: S.parts.map(function (p) { return p.fighterId + ':' + p.classId; }) }); }
  function resolveAt(t, result) { if (!locked()) return false; S.state = 'RESOLUTION'; S.since = t; S.resolvedAt = t; S.pausedAt = null; S.result = Object.assign({ outcome: 'ENDED', winnerId: null, reason: 'HOST' }, result || {}); emit(t, 'RESOLVE', { result: S.result }); return true; }
  function unlock(t) { S.parts.forEach(function (p) { if (p.isPresent) S.cooldown[p.fighterId] = true; p.isLocked = false; p.status = 'DONE'; }); S.state = 'RESET'; S.since = t; S.resetAt = t; emit(t, 'RESET', { cancelled: false }); }
  function pauseCheck(t) { var rc = S.parts.some(function (p) { return p.status === 'RECONNECTING'; }); if (rc && S.pausedAt === null) { S.pausedAt = t; emit(t, 'PAUSE'); } else if (!rc && S.pausedAt !== null) { S.pausedAt = null; emit(t, 'RESUME'); } }
  function absentCheck(t) { if (!locked()) { S.absentSince = null; return; } var any = S.parts.some(function (p) { return p.isLocked && p.isPresent; }); if (any) S.absentSince = null; else if (S.absentSince === null) S.absentSince = t; }
  function lastStanding(t) { if (!LOCAL || !locked()) return; var left = standing(); if (left.length === 1) resolveAt(t, { outcome: 'WIN', winnerId: left[0].fighterId, reason: 'LAST_STANDING' }); else if (!left.length) resolveAt(t, { outcome: 'NO_CONTEST', winnerId: null, reason: 'NONE_STANDING' }); }
  /* time-driven transitions up to t, each at its exact moment (so a late tick never changes an outcome) */
  function advance(t) { for (var g = 0; g < 24; g++) {
      if (S.state === 'READY' && LOCAL && !S.expired && t >= S.waitStartedAt + RU.wait_s) { var te = S.waitStartedAt + RU.wait_s; if (S.parts.length >= RU.min_fighters) lock(te); else { S.expired = true; emit(te, 'WAIT_EXPIRED', { waiting: S.parts.length }); } continue; }
      if (S.state === 'ACTIVATION' && t >= S.lockedAt + T.activation_s) { S.state = 'ACTIVE_DUEL'; S.since = S.lockedAt + T.activation_s; emit(S.since, 'ACTIVE'); continue; }
      if (locked() && LOCAL) { var dl = null; S.parts.forEach(function (p) { if (p.status === 'RECONNECTING' && (dl === null || p.reconnectDeadline < dl)) dl = p.reconnectDeadline; });
        if (dl !== null && t >= dl) { resolveAt(dl, { outcome: 'NO_CONTEST', winnerId: null, reason: 'DISCONNECT_EXPIRED' }); continue; }
        if (S.absentSince !== null && t >= S.absentSince + RU.abandon_s) { resolveAt(S.absentSince + RU.abandon_s, { outcome: 'NO_CONTEST', winnerId: null, reason: 'ABANDONED' }); continue; } }
      if (S.state === 'RESOLUTION' && t >= S.resolvedAt + T.resolution_s) { unlock(S.resolvedAt + T.resolution_s); continue; }
      if (S.state === 'RESET' && t >= S.resetAt + T.reset_s) { var td = S.resetAt + T.reset_s; reset0(true); S.since = td; emit(td, 'DORMANT'); continue; }
      break; } }
  function join(f, t) { advance(t); var id = idOf(f), cls = clsOf(f), p;
    function no(r) { emit(t, 'REJECT', { fighterId: id, reason: r }); return { ok: false, reason: r, state: S.state }; }
    if (id === undefined || id === null) return no('NO_ID'); if (CLASS_IDS.indexOf(cls) < 0) return no('INVALID_CLASS');
    p = find(id);
    if (p) { if (p.isLocked && !p.isPresent && (p.status === 'OUTSIDE' || p.status === 'RECONNECTING')) { var was = p.status; p.isPresent = true; p.status = 'LOCKED'; p.reconnectDeadline = null; setPos(p, f); emit(t, was === 'RECONNECTING' ? 'RECONNECT' : 'RETURN', { fighterId: id }); pauseCheck(t); absentCheck(t); return { ok: true, slotId: p.slotId, rejoined: true, state: S.state }; }
      return no('ALREADY_IN'); }
    if (S.cooldown[id]) return no('REENTER');
    if (S.state === 'RESOLUTION' || S.state === 'RESET') return no('RESETTING');
    if (locked()) return no('LOCKED');
    if (S.parts.length >= RU.max_fighters) return no('FULL');
    p = make(f, freeSlot(), t);
    S.parts.push(p); if (S.state === 'DORMANT') { S.state = 'READY'; S.since = t; S.waitStartedAt = t; S.expired = false; emit(t, 'WAIT_START', { fighterId: id }); }
    emit(t, 'JOIN', { fighterId: id, slotId: p.slotId, classId: cls, count: S.parts.length, full: S.parts.length >= RU.max_fighters });
    if (LOCAL && S.state === 'READY' && S.expired && S.parts.length >= RU.min_fighters) lock(t);   /* the window already passed: a now-valid roster starts at once */
    return { ok: true, slotId: p.slotId, state: S.state }; }
  function leave(id, t, cause) { advance(t); cause = String(cause || 'EXIT').toUpperCase(); var p = find(id);
    if (!p) { if (S.cooldown[id]) { delete S.cooldown[id]; return { ok: true, cooldownCleared: true }; } return { ok: false, reason: 'NOT_IN_ROSTER' }; }
    if (!p.isLocked) { if (S.state === 'RESET' || S.state === 'RESOLUTION') { p.isPresent = false; delete S.cooldown[id]; return { ok: true }; }
      S.parts.splice(S.parts.indexOf(p), 1); emit(t, 'LEAVE', { fighterId: id, cause: cause, count: S.parts.length });
      if (!S.parts.length && S.state === 'READY') { S.state = 'RESET'; S.since = t; S.resetAt = t; S.waitStartedAt = null; S.expired = false; S.cancelled = true; emit(t, 'RESET', { cancelled: true }); }
      return { ok: true, removed: true }; }
    if (!locked()) { p.isPresent = false; return { ok: true }; }
    if (cause === 'DISCONNECT') { if (p.status === 'RECONNECTING') return { ok: true, already: true, deadline: p.reconnectDeadline }; p.isPresent = false; p.status = 'RECONNECTING'; p.reconnectDeadline = t + RU.reconnect_window_s; emit(t, 'DISCONNECT', { fighterId: id, deadline: p.reconnectDeadline }); pauseCheck(t); }
    else if (cause === 'OUTSIDE') { if (p.status === 'LOCKED') { p.isPresent = false; p.status = 'OUTSIDE'; emit(t, 'OUTSIDE', { fighterId: id }); } }
    else { p.isPresent = false; p.status = cause === 'KO' ? 'KO' : 'CONCEDED'; p.reconnectDeadline = null; emit(t, cause === 'KO' ? 'KO' : 'CONCEDE', { fighterId: id }); pauseCheck(t); lastStanding(t); }
    absentCheck(t); advance(t); return { ok: true }; }
  function update(f, t) { var p = find(idOf(f)); if (!p) return false; if (S.state === 'RESOLUTION' || S.state === 'RESET') return false;   /* resolved: the fields stop tracking */
    setPos(p, f); if (f.teamId !== undefined) p.teamId = f.teamId; if (isFinite(f.localInfluenceRadius)) p.localInfluenceRadius = Math.max(1.5, Math.min(6.25, +f.localInfluenceRadius)); return true; }
  /* presence feed: `inside` = every fighter currently standing on the court. New ones queue (join), known ones update / return, and a
     known one missing from the feed has left: before the lock it leaves the queue, after it it is OUTSIDE (the match goes on) */
  function sync(inside, t) { advance(t); var seen = {};
    (inside || []).forEach(function (f) { var id = idOf(f); if (id === undefined || id === null) return; seen[id] = true; var p = find(id);
      if (p) { if (p.isLocked && !p.isPresent && (p.status === 'OUTSIDE' || p.status === 'RECONNECTING')) join(f, t); else update(f, t); }
      else if (!S.cooldown[id] && (S.state === 'DORMANT' || S.state === 'READY') && S.parts.length < RU.max_fighters) join(f, t); });   /* a full or running court: they are spectators, no retry spam */
    S.parts.slice().forEach(function (p) { if (!seen[p.fighterId] && p.isPresent) leave(p.fighterId, t, p.isLocked ? 'OUTSIDE' : 'EXIT'); });
    Object.keys(S.cooldown).forEach(function (id) { if (!seen[id]) delete S.cooldown[id]; });
    advance(t); return snapshot(t); }
  /* the host says a match starts now with exactly these fighters (the legacy begin): needs ≥ 2 — one fighter never starts combat */
  function begin(fighters, t) { advance(t); var list = (fighters || []).filter(function (f) { return f && idOf(f) !== undefined && CLASS_IDS.indexOf(clsOf(f)) >= 0; }).slice(0, RU.max_fighters), uniq = {};
    list = list.filter(function (f) { var id = idOf(f); if (uniq[id]) return false; uniq[id] = true; return true; });
    if (list.length < RU.min_fighters) { emit(t, 'REJECT', { reason: 'NEED_TWO', count: list.length }); return { ok: false, reason: 'NEED_TWO' }; }
    reset0(false); list.forEach(function (f, k) { S.parts.push(make(f, k, t)); }); S.waitStartedAt = t; lock(t); return { ok: true, state: S.state }; }
  function resolve(t, result) { advance(t); var ok = resolveAt(t, result); return { ok: ok, state: S.state }; }
  function eliminate(id, t) { return leave(id, t, 'KO'); }
  function snapshot(t) { if (t !== undefined) advance(t); var n = S.parts.length, arr = S.arrangement;
    return { duelZoneId: zoneId, state: S.state, since: S.since, authority: LOCAL ? 'LOCAL' : 'HOST', rules: { min_fighters: RU.min_fighters, max_fighters: RU.max_fighters, wait_s: RU.wait_s, reconnect_window_s: RU.reconnect_window_s },
      waiting: { startedAt: S.state === 'READY' ? S.waitStartedAt : null, elapsed_s: S.state === 'READY' && t !== undefined ? Math.max(0, t - S.waitStartedAt) : 0, remaining_s: S.state === 'READY' && t !== undefined ? Math.max(0, S.waitStartedAt + RU.wait_s - t) : 0, expired: S.state === 'READY' && S.expired },
      full: n >= RU.max_fighters, participantCount: n, presentCount: S.parts.filter(function (p) { return p.isPresent; }).length, lockedAt: S.lockedAt, resolvedAt: S.resolvedAt, resetAt: S.resetAt, paused: S.pausedAt !== null, result: S.result,
      territories: arr && (locked() || S.state === 'RESOLUTION') ? { n: arr.n, template: arr.template, templateName: arr.templateName, theta: arr.theta, byFighter: Object.assign({}, arr.territoryOf), order: arr.order.slice() } : null,
      participants: S.parts.map(function (p) { return { fighterId: p.fighterId, slotId: p.slotId, classId: p.classId, classColor: p.classColor, worldPosition: p.worldPosition ? Object.assign({}, p.worldPosition) : null, local: p.local ? p.local.slice() : null,
        isPresent: p.isPresent, isLocked: p.isLocked, teamId: p.teamId, airborneState: Object.assign({}, p.airborneState), localInfluenceRadius: p.localInfluenceRadius, territory: p.territory, status: p.status, joinedAt: p.joinedAt, reconnectDeadline: p.reconnectDeadline }; }) }; }
  /* HOST mirroring: take the authority's snapshot as the truth (its arrangement if it sends one, else the same deterministic one) */
  function applySnapshot(s) { if (!s || PHASES.indexOf(s.state) < 0) return false; var cd = S.cooldown; reset0(false); S.cooldown = cd; S.state = s.state; S.since = s.since || 0; S.waitStartedAt = s.waiting ? s.waiting.startedAt : null; S.expired = !!(s.waiting && s.waiting.expired);
    S.lockedAt = s.lockedAt === undefined ? null : s.lockedAt; S.resolvedAt = s.resolvedAt === undefined ? null : s.resolvedAt; S.resetAt = s.resetAt === undefined ? null : s.resetAt; S.result = s.result || null; S.pausedAt = s.paused ? (S.since || 0) : null;
    (s.participants || []).slice(0, RU.max_fighters).forEach(function (q, k) { if (CLASS_IDS.indexOf(String(q.classId || '').toUpperCase()) < 0) return; var p = make(q, isFinite(q.slotId) ? q.slotId : k, q.joinedAt || 0); p.isPresent = q.isPresent !== false; p.isLocked = !!q.isLocked; p.status = q.status || (p.isLocked ? 'LOCKED' : 'WAITING'); p.territory = isFinite(q.territory) ? q.territory : null; S.parts.push(p); });
    if (s.territories && s.territories.byFighter) { S.arrangement = { n: s.territories.n, theta: s.territories.theta || 0, template: s.territories.template, templateName: s.territories.templateName, territoryOf: Object.assign({}, s.territories.byFighter), order: (s.territories.order || []).slice(), perm: [] }; }
    else if (locked() || S.state === 'RESOLUTION') { S.arrangement = arrangeTerritories(S.parts.filter(function (p) { return p.isLocked; }).map(function (p) { return { fighterId: p.fighterId, slotId: p.slotId, classId: p.classId, local: p.local }; }), halfW); }
    if (S.arrangement) S.parts.forEach(function (p) { if (S.arrangement.territoryOf[p.fighterId] !== undefined) p.territory = S.arrangement.territoryOf[p.fighterId]; });
    return true; }
  return { join: join, leave: leave, update: update, sync: sync, begin: begin, resolve: resolve, eliminate: eliminate, snapshot: snapshot, advance: advance, applySnapshot: applySnapshot,
    state: function (t) { if (t !== undefined) advance(t); return S.state; }, events: function () { return events.slice(); }, onEvent: function (fn) { listeners.push(fn); }, rules: RU, timing: T, zoneId: zoneId, authority: LOCAL ? 'LOCAL' : 'HOST' };
}
