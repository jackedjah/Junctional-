/* MAHWORLD M15 :: COMBAT ZONES (owner 2026-09-27: "a world-integrated duel / combat-zone system that feels native to MAHWORLD … embedded
   combat zones placed throughout the open world … ground only … no floating rings … no spectator stands … a square-diamond magical shell /
   frame, grounded into the floor … crystalline, premium, elegant, not bulky or mechanical").
   Each zone is a 12 m square set at 45° to its approach, so it reads as a diamond. It is drawn as light in the floor, with a low light
   shell rising from its edges:
     · DORMANT      nobody fighting: crystalline white / icy-blue linework (double frame, inscribed diamond, inner square, axes, corner and
                    midpoint nodes, a centre sigil, faint crystal facets) breathing slowly, with one soft light travelling round the frame;
                    the shell is a whisper;
     · ACTIVATION   a duel begins: for ~2.8 s the ring splits by side into the two opponents' CLASS colours (a clean seam that blends
                    through white at the centre line), a surge ripples out from the centre and the shell rises; then it lets go;
     · ACTIVE       the ring returns to its cool base, and each fighter's class colour becomes LOCAL — a square-diamond footprint box
                    under and around them that moves with them, recolouring the ring's linework near them (their presence and their side
                    of pressure); airborne fighters' footprints shrink and fade with height;
     · RELEASE      the duel ends: colours drain back to the dormant state over ~1.4 s.
   Future-ready: the phase machine is a pure function (duelPhase); colours come from the registry crystal families through a class map
   that new classes extend (setClassColor); begin / update / end take fighters as { id, cls, x, z, y } in world metres; onPhase(fn) reports
   phase changes. The host's duel / spar authority drives it once the runtime bridge lands (CZ_PLAZA_SOUTH sits on the NPC spar spot).
   Host safety: pure light — the inlay lies 2.5 cm above its ground, the shell is additive with no depth write, no collider, never
   interactable. Cost: two instanced draws for every zone in the world (floor + shell); per-frame work only for a zone with a live duel. */

export var CLASS_FAMILY = { ATHLETE: 'gold', TITAN: 'blue', LEAN: 'red', VISIONARY: 'purple', BAGE: 'pink' };
export var TIMING = { activation_s: 2.8, split_hold_s: 1.3, release_s: 1.4, presence_s: 0.35 };
export var ZONE_DEFAULT_SIZE = 12;

export function combatZoneList(reg) { var C = reg && reg.combat_zones, S = (C && C.size_m) || ZONE_DEFAULT_SIZE; return ((C && C.list) || []).filter(function (z) { return z && isFinite(z.x) && isFinite(z.z); }).map(function (z) { return Object.assign({ size_m: S, yaw_deg: 45, y: 0 }, z); }); }
/* exclusion circles (ground cover, shards) — the square's circumcircle plus a pad */
export function combatZoneCircles(reg, pad) { return combatZoneList(reg).map(function (z) { return { x: z.x, z: z.z, r: z.size_m * 0.7072 + (pad === undefined ? 1 : pad) }; }); }
/* world → the zone's square frame (metres) */
export function zoneLocal(zone, x, z) { var a = -(zone.yaw_deg || 0) * Math.PI / 180, dx = x - zone.x, dz = z - zone.z; return [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)]; }
export function insideZone(zone, x, z, margin) { var p = zoneLocal(zone, x, z); return Math.max(Math.abs(p[0]), Math.abs(p[1])) <= zone.size_m / 2 + (margin || 0); }

/* THE PHASE MACHINE (pure): tStart = duel begin (null = none), tEnd = duel end (null = running). Returns the phase and the three drives the
   shaders read: split (0..1, the class-colour halves), surge (0..1, the activation wave's travel; 1 = done) and live (0..1, how much the
   duel colours are present at all — 0 dormant, 1 during a duel, easing back to 0 on release). */
export function duelPhase(t, tStart, tEnd) {
  var T = TIMING; if (tStart === null || tStart === undefined || !isFinite(tStart)) return { phase: 'DORMANT', split: 0, surge: 1, live: 0 };
  if (tEnd !== null && tEnd !== undefined && isFinite(tEnd) && t >= tEnd) { var r = Math.min(1, (t - tEnd) / T.release_s); return r >= 1 ? { phase: 'DORMANT', split: 0, surge: 1, live: 0 } : { phase: 'RELEASE', split: 0, surge: 1, live: 1 - r * r * (3 - 2 * r) }; }
  var dt = Math.max(0, t - tStart);
  if (dt < T.activation_s) { var f = dt <= T.split_hold_s ? 1 : 1 - (dt - T.split_hold_s) / (T.activation_s - T.split_hold_s); f = f * f * (3 - 2 * f); return { phase: 'ACTIVATION', split: f, surge: Math.min(1, dt / 1.6), live: 1 }; }
  return { phase: 'ACTIVE', split: 0, surge: 1, live: 1 };
}

var FLOOR_V = [
  'attribute vec4 iZ; attribute vec4 iK; attribute vec4 iAx; attribute vec4 iCA; attribute vec4 iCB; attribute vec4 iPA; attribute vec4 iPB;',
  'varying vec2 vL; varying vec4 vK; varying vec4 vAx; varying vec4 vCA; varying vec4 vCB; varying vec4 vPA; varying vec4 vPB; varying float vDist;',
  'void main() { float S = iK.x, M = S + 5.0; vec2 L = position.xy * M; vL = L; vK = iK; vAx = iAx; vCA = iCA; vCB = iCB; vPA = iPA; vPB = iPB;',
  '  float c = cos(iZ.w), s = sin(iZ.w); vec3 w = vec3(iZ.x + L.x * c - L.y * s, iZ.y + 0.025, iZ.z + L.x * s + L.y * c);',   /* the square frame turned by the zone's yaw (local y = world z) */
  '  vDist = length(cameraPosition - w); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }'
].join('\n');

var FLOOR_F = [
  'uniform float uTime; uniform float uGlobal; uniform float uFacets; uniform float uFill;',
  'varying vec2 vL; varying vec4 vK; varying vec4 vAx; varying vec4 vCA; varying vec4 vCB; varying vec4 vPA; varying vec4 vPB; varying float vDist;',
  'float czLine(float d, float w) { float a = fwidth(d) * 1.2 + 1e-4; return 1.0 - smoothstep(w, w + a, abs(d)); }',
  'float czGlow(float d, float s) { return exp(-d * d / s); }',
  'vec3 czFoot(vec2 L, vec4 P, vec4 C, out float own) {',   /* a fighter's square-diamond footprint box and the ownership it spreads through the ring */
  '  vec2 r = L - P.xy; float lift = 1.0 / (1.0 + max(P.z, 0.0) * 0.35), b = 1.5 * mix(0.75, 1.0, lift), fsq = max(abs(r.x), abs(r.y)), fdm = (abs(r.x) + abs(r.y)) * 0.70710678;',
  '  float k = C.w * lift, pulse = 0.85 + 0.15 * sin(uTime * 3.0 + P.w * 6.2831853);',
  '  own = czGlow(length(r), 12.0) * C.w;',
  '  return C.rgb * k * (czLine(fsq - b, 0.045) * 1.25 * pulse + czLine(fdm - b * 0.55, 0.03) * 0.8 + czGlow(fsq, b * b * 0.9) * 0.34 + czGlow(fsq - b, 0.5) * 0.35); }',
  'void main() { vec2 L = vL; float S = vK.x, h = S * 0.5, t = uTime, live = vK.w, split = vK.y, surge = vK.z;',
  '  float sq = max(abs(L.x), abs(L.y)), dm = (abs(L.x) + abs(L.y)) * 0.70710678, inside = 1.0 - smoothstep(h - 0.05, h + 0.05, sq);',
  /* the linework (weights: frame, diamond, inner square, axes, diagonals) */
  '  float frame = czLine(sq - h, 0.04) * 0.85 + czLine(sq - (h - 0.4), 0.022) * 0.6;',
  '  float dia = czLine(dm - h * 0.70710678, 0.035) * 0.85, innerSq = czLine(sq - h * 0.46, 0.028) * 0.6;',
  '  float axes = (czLine(L.x, 0.02) + czLine(L.y, 0.02)) * 0.32 * step(h * 0.46, sq) * inside;',
  '  float diag = (czLine(abs(L.x) - abs(L.y), 0.02)) * 0.28 * step(h * 0.46, sq) * inside;',
  '  vec2 cn = abs(L) - vec2(h); float corner = czLine((abs(cn.x) + abs(cn.y)) * 0.70710678 - 0.5, 0.035) * 0.9 + czGlow(length(cn), 0.2) * 0.45;',
  '  vec2 mA = vec2(abs(L.x) - h, L.y), mB = vec2(L.x, abs(L.y) - h); float mid = czGlow(length(mA), 0.12) * 0.7 + czGlow(length(mB), 0.12) * 0.7;',
  '  float sig = czLine(dm - 0.95, 0.03) * 0.9 + czGlow(dm, 0.25) * 0.8 + czGlow(abs(L.x) * abs(L.y) * 6.0, 0.04) * czGlow(length(L), 2.6) * 0.9;',   /* the centre sigil: a small diamond, a core and a four-point star */
  '  float facets = 0.0; if (uFacets > 0.5) { vec2 q = L * 0.62; vec2 g = vec2(q.x + q.y * 0.57735, q.y * 1.1547); vec2 f = fract(g); float tri = min(min(f.x, f.y), abs(1.0 - f.x - f.y)); facets = czLine(tri, 0.012) * 0.14 * inside * (0.6 + 0.4 * sin(t * 0.3 + g.x * 1.7 + g.y * 2.3)); }',
  '  float run = czGlow(mod(atan(L.y, L.x) / 6.2831853 + 1.0 - t * 0.035, 1.0) - 0.5, 0.004) * 0.9;',   /* one soft light travelling round the frame */
  '  float breath = 0.86 + 0.14 * sin(t * 0.5 + vAx.w * 6.2831853);',
  '  float lines = frame + dia + innerSq + axes + diag + facets, nodes = corner + mid + sig;',
  '  float halo = czGlow(sq - h, 0.35) * 0.5 + czGlow(sq - h, 3.0) * 0.12;',
  /* colours: the dormant base (white core, ice-blue glow); the activation split by side (seam through white); the fighters' local ownership */
  '  vec3 ice = vec3(0.55, 0.75, 1.0), core = mix(vec3(0.86, 0.93, 1.0), ice, 0.3 * (1.0 - live));',   /* dormant runs cooler: crystalline ice, not signage white */
  '  float sd = dot(L, vAx.xy); vec3 splitC = mix(vCB.rgb, vCA.rgb, smoothstep(-vAx.z, vAx.z, sd)); splitC = mix(splitC, vec3(1.0), (1.0 - smoothstep(0.0, vAx.z, abs(sd))) * 0.55);',
  '  float ownA, ownB; vec3 footA = czFoot(L, vPA, vCA, ownA), footB = czFoot(L, vPB, vCB, ownB); ownA *= live; ownB *= live;',
  '  vec3 lineC = mix(core, splitC, split * live); float ow = ownA + ownB; if (ow > 1e-3) lineC = mix(lineC, (vCA.rgb * ownA + vCB.rgb * ownB) / ow, clamp(ow, 0.0, 1.0) * (1.0 - split));',
  '  vec3 glowC = mix(ice, splitC, split * live * 0.85);',
  '  float wave = czGlow(sq - surge * h * 1.25, 0.6) * (1.0 - surge) * live;',   /* the activation surge */
  '  float lvl = (breath + run * (1.0 - live) + 0.35 * split * live) * mix(0.6, 1.35, live);',   /* dormant is calm (it must not read as an active event) */
  '  vec3 col = lineC * lines * lvl + mix(core, lineC, 0.6) * nodes * lvl + glowC * halo * lvl * 0.8 + mix(vec3(1.0), splitC, split) * wave * 1.4 + (footA + footB) * (1.0 - split * 0.6) * live;',
  '  float far = 1.0 - smoothstep(180.0, 320.0, vDist);',
  '  float fillA = uFill * inside * (0.55 + 0.45 * far);',   /* a faint polished-glass field under the lines gives definition by day */
  '  col *= uGlobal * far; if (max(max(col.r, col.g), col.b) < 0.003 && fillA < 0.003) discard;',
  '  gl_FragColor = vec4(vec3(0.05, 0.07, 0.11) * fillA + col, fillA); }'   /* premultiplied: the lines add light, the field darkens a touch */
].join('\n');

var SHELL_V = [
  'attribute vec4 iZ; attribute vec4 iK; attribute vec4 iAx; attribute vec4 iCA; attribute vec4 iCB; attribute vec4 iPA; attribute vec4 iPB;',
  'varying vec3 vP; varying vec4 vK; varying vec4 vAx; varying vec4 vCA; varying vec4 vCB; varying vec4 vPA; varying vec4 vPB; varying float vDist;',
  'void main() { float h = iK.x * 0.5; vec3 L = vec3(position.x * h, position.y, position.z * h); vP = L; vK = iK; vAx = iAx; vCA = iCA; vCB = iCB; vPA = iPA; vPB = iPB;',
  '  float c = cos(iZ.w), s = sin(iZ.w); vec3 w = vec3(iZ.x + L.x * c - L.z * s, iZ.y + L.y, iZ.z + L.x * s + L.z * c);',
  '  vDist = length(cameraPosition - w); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }'
].join('\n');

var SHELL_F = [
  'uniform float uTime; uniform float uGlobal; uniform float uStreak; uniform float uShellH;',
  'varying vec3 vP; varying vec4 vK; varying vec4 vAx; varying vec4 vCA; varying vec4 vCB; varying vec4 vPA; varying vec4 vPB; varying float vDist;',
  'void main() { float v = clamp(vP.y / uShellH, 0.0, 1.0), t = uTime, live = vK.w, split = vK.y, surge = vK.z;',
  '  float rise = mix(0.55, 1.0, live) * (1.0 - v) * (1.0 - v);',   /* bright at the floor, gone by the top */
  '  float along = vP.x + vP.z, streak = mix(1.0, 0.55 + 0.45 * sin(along * 2.2 + t * 0.6) * sin(v * 9.0 - t * 1.4), uStreak);',
  '  float corner = exp(-pow(min(abs(abs(vP.x) - vK.x * 0.5), abs(abs(vP.z) - vK.x * 0.5)), 2.0) * 3.0);',   /* brighter seams at the four corners */
  '  vec3 base = vec3(0.62, 0.8, 1.0); float sd = dot(vP.xz, vAx.xy); vec3 splitC = mix(vCB.rgb, vCA.rgb, smoothstep(-vAx.z, vAx.z, sd));',
  '  float oa = exp(-dot(vP.xz - vPA.xy, vP.xz - vPA.xy) / 10.0) * vCA.w * live, ob = exp(-dot(vP.xz - vPB.xy, vP.xz - vPB.xy) / 10.0) * vCB.w * live;',
  '  vec3 c = mix(base, splitC, split * live); c = mix(c, (vCA.rgb * oa + vCB.rgb * ob) / max(oa + ob, 1e-3), clamp(oa + ob, 0.0, 1.0) * (1.0 - split));',
  '  float lvl = mix(0.07, 0.3, live) + 0.55 * split * live + 0.8 * (1.0 - surge) * live * exp(-pow(v - surge, 2.0) * 30.0) + 0.35 * (oa + ob);',   /* dormant: a whisper; activation: the shell rises; a fighter near a wall lights it */
  '  float far = 1.0 - smoothstep(120.0, 260.0, vDist), near = smoothstep(1.5, 6.0, vDist);',
  '  gl_FragColor = vec4(c * rise * streak * lvl * (1.0 + corner * 0.8) * uGlobal * far * near, 1.0); }'
].join('\n');

function shellGeometry(THREE) {   /* four walls on the unit square's edges (x, z in −1..1), height in metres (y 0..H) */
  var H = 2.4, P = [], I = [], k = 0; [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]].forEach(function (e) { var n = 12; for (var i = 0; i <= n; i++) { var u = i / n, x = e[0] + (e[2] - e[0]) * u, z = e[1] + (e[3] - e[1]) * u; P.push(x, 0, z, x, H, z); if (i < n) { var b = k + i * 2; I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } } k += (n + 1) * 2; });
  var g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); return { geo: g, H: H };
}

export function createCombatZones(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }, reg = ctx.registry || {}, night = !!ctx.night;
  var zones = [], byId = {}, group = null, floor = null, shell = null, uF = null, uS = null, A = null, own = [], clock = 0, listeners = [], demo = null;
  var famColor = {}, classColor = {};
  function tier() { try { return ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { return 'HIGH'; } }
  function fam(f) { var F = (reg.crystal_families || {})[f] || {}; return F.glow || F.color || '#f4f6ff'; }
  function colorOf(cls) { var k = String(cls || '').toUpperCase(); if (classColor[k]) return classColor[k]; var c = new THREE.Color(fam(CLASS_FAMILY[k] || 'platinum')); classColor[k] = c; return c; }
  function build() {
    zones = combatZoneList(reg); if (!zones.length) { log('combatZones: registry.combat_zones empty — nothing built'); return; }
    group = new THREE.Group(); group.name = 'MAHWORLD_COMBAT_ZONES'; group.userData.noMerge = true; group.userData.nonInteractable = true; ctx.group.add(group);
    var n = zones.length, lowQ = tier() === 'LOW';
    A = { iZ: new Float32Array(n * 4), iK: new Float32Array(n * 4), iAx: new Float32Array(n * 4), iCA: new Float32Array(n * 4), iCB: new Float32Array(n * 4), iPA: new Float32Array(n * 4), iPB: new Float32Array(n * 4) };
    zones.forEach(function (z, i) { z.index = i; z.duel = null; byId[z.id] = z; A.iZ.set([z.x, z.y || 0, z.z, (z.yaw_deg || 0) * Math.PI / 180], i * 4); A.iK.set([z.size_m, 0, 1, 0], i * 4); A.iAx.set([1, 0, 0.9, (i * 0.618) % 1], i * 4); A.iCA.set([1, 1, 1, 0], i * 4); A.iCB.set([1, 1, 1, 0], i * 4); A.iPA.set([0, 0, 0, 0], i * 4); A.iPB.set([0, 0, 0, 0.5], i * 4); });
    var attrs = {}; Object.keys(A).forEach(function (k) { attrs[k] = new THREE.InstancedBufferAttribute(A[k], 4); attrs[k].setUsage(THREE.DynamicDrawUsage); });
    var fg = new THREE.InstancedBufferGeometry(), pl = new THREE.PlaneGeometry(1, 1); fg.index = pl.index; fg.setAttribute('position', pl.attributes.position); fg.instanceCount = n; Object.keys(attrs).forEach(function (k) { fg.setAttribute(k, attrs[k]); }); own.push(fg, pl);
    uF = { uTime: { value: 0 }, uGlobal: { value: night ? 1.25 : 0.85 }, uFacets: { value: lowQ ? 0 : 1 }, uFill: { value: night ? 0.16 : 0.22 } };
    var fm = new THREE.ShaderMaterial({ vertexShader: FLOOR_V, fragmentShader: FLOOR_F, uniforms: uF, transparent: true, depthWrite: false, depthTest: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, toneMapped: false }); own.push(fm);
    floor = new THREE.Mesh(fg, fm); floor.name = 'COMBAT_ZONE_FLOORS'; floor.frustumCulled = false; floor.renderOrder = 3; floor.userData.noMerge = true; floor.userData.nonInteractable = true; group.add(floor);
    var sh = shellGeometry(THREE), sg = sh.geo; sg.instanceCount = n; Object.keys(attrs).forEach(function (k) { sg.setAttribute(k, attrs[k]); }); own.push(sg);
    uS = { uTime: uF.uTime, uGlobal: { value: night ? 1.1 : 0.7 }, uStreak: { value: lowQ ? 0 : 1 }, uShellH: { value: sh.H } };
    var smt = new THREE.ShaderMaterial({ vertexShader: SHELL_V, fragmentShader: SHELL_F, uniforms: uS, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }); own.push(smt);
    shell = new THREE.Mesh(sg, smt); shell.name = 'COMBAT_ZONE_SHELLS'; shell.frustumCulled = false; shell.renderOrder = 12; shell.userData.noMerge = true; shell.userData.nonInteractable = true; group.add(shell);
    A.attrs = attrs;
    try { var m = /[?&]duelDemo=([^&]+)/.exec(typeof location !== 'undefined' ? location.search : ''); if (m) { var p = decodeURIComponent(m[1]).split(':'); demo = { id: p[0], a: p[1] || 'ATHLETE', b: p[2] || 'LEAN', phase: (p[3] || 'ACTIVE').toUpperCase(), t0: null }; } } catch (e) { }   /* dev preview only: ?duelDemo=ZONE:CLASS_A:CLASS_B:ACTIVATION|ACTIVE|RELEASE (ZONE = ALL for every zone) */
    log('combatZones: ' + n + ' zones (' + zones.map(function (z) { return z.id; }).join(', ') + ') in 2 draws');
  }
  function write(z) { var i = z.index * 4, d = z.duel, ph = d ? duelPhase(clock, d.tStart, d.tEnd) : duelPhase(clock, null, null);
    A.iK[i + 1] = ph.split; A.iK[i + 2] = ph.surge; A.iK[i + 3] = ph.live;
    if (d) { A.iAx[i] = d.axis[0]; A.iAx[i + 1] = d.axis[1];
      [['a', A.iCA, A.iPA], ['b', A.iCB, A.iPB]].forEach(function (S) { var F = d[S[0]]; if (!F) return; S[1][i] = F.col.r; S[1][i + 1] = F.col.g; S[1][i + 2] = F.col.b; S[1][i + 3] = F.pres; S[2][i] = F.lx; S[2][i + 1] = F.lz; S[2][i + 2] = F.lift; S[2][i + 3] = F.seed; }); }
    else { A.iCA[i + 3] = 0; A.iCB[i + 3] = 0; }
    if (ph.phase !== z.lastPhase) { var prev = z.lastPhase; z.lastPhase = ph.phase; listeners.forEach(function (fn) { try { fn({ zone: z.id, phase: ph.phase, from: prev || null, t: clock }); } catch (e) { } }); }
    if (ph.phase === 'DORMANT' && d && d.tEnd !== null && !demo) z.duel = null;
    return ph; }
  function fighter(z, f, seed) { var p = zoneLocal(z, f.x, f.z); return { id: f.id, cls: String(f.cls || '').toUpperCase(), col: colorOf(f.cls), lx: p[0], lz: p[1], lift: Math.max(0, f.y || 0), pres: 0, target: insideZone(z, f.x, f.z, 1.5) ? 1 : 0, seed: seed }; }
  /* API — fighters are { id, cls, x, z, y (height above the zone floor) } in world metres */
  function begin(id, a, b, opts) { var z = byId[id]; if (!z || !a || !b) return null; opts = opts || {};
    var d = { tStart: opts.t !== undefined ? opts.t : clock, tEnd: null, a: fighter(z, a, 0.13), b: fighter(z, b, 0.61) }; d.a.pres = d.a.target; d.b.pres = d.b.target;
    var ax = d.a.lx - d.b.lx, az = d.a.lz - d.b.lz, al = Math.hypot(ax, az); d.axis = al > 0.5 ? [ax / al, az / al] : [1, 0];   /* A's colour holds A's side of the seam */
    z.duel = d; write(z); flag(); return phaseOf(id); }
  function update(id, fighters, dt) { var z = byId[id]; if (!z || !z.duel) return null; var d = z.duel, k = Math.min(1, (dt || 0.016) / TIMING.presence_s);
    (fighters || []).forEach(function (f) { var slot = f.id !== undefined && d.b.id === f.id ? d.b : (f.id !== undefined && d.a.id === f.id ? d.a : (f.cls && String(f.cls).toUpperCase() === d.b.cls && d.a.cls !== d.b.cls ? d.b : d.a)); var n = fighter(z, f, slot.seed); slot.lx = n.lx; slot.lz = n.lz; slot.lift = n.lift; slot.target = n.target; });
    [d.a, d.b].forEach(function (F) { F.pres += (F.target - F.pres) * k; }); write(z); flag(); return phaseOf(id); }
  function end(id, opts) { var z = byId[id]; if (!z || !z.duel) return null; z.duel.tEnd = opts && opts.t !== undefined ? opts.t : clock; write(z); flag(); return phaseOf(id); }
  function phaseOf(id) { var z = byId[id]; if (!z) return null; var d = z.duel, ph = d ? duelPhase(clock, d.tStart, d.tEnd) : duelPhase(clock, null, null);
    return { zone: id, phase: ph.phase, split: +ph.split.toFixed(3), live: +ph.live.toFixed(3), fighters: d ? [d.a, d.b].map(function (F) { return { id: F.id, cls: F.cls, local: [+F.lx.toFixed(2), +F.lz.toFixed(2)], presence: +F.pres.toFixed(2), control: +(F.lx * d.axis[0] + F.lz * d.axis[1]).toFixed(2) }; }) : [] }; }   /* control: the fighter's position along the duel axis (their side of pressure) */
  function flag() { if (A && A.attrs) Object.keys(A.attrs).forEach(function (k) { A.attrs[k].needsUpdate = true; }); }
  function zoneAt(x, z) { for (var i = 0; i < zones.length; i++) if (insideZone(zones[i], x, z)) return zones[i].id; return null; }
  function runDemo(t) { if (!demo) return; var list = demo.id === 'ALL' ? zones : zones.filter(function (z) { return z.id === demo.id; });
    list.forEach(function (z, zi) { var h = z.size_m * 0.5, w = t * 0.55 + zi, P = function (s) { var ang = w + (s ? Math.PI : 0), rr = h * (0.42 + 0.12 * Math.sin(t * 0.9 + s * 2)); var lx = Math.cos(ang) * rr + (s ? 0.6 : -0.6), lz = Math.sin(ang) * rr * 0.7; var c = Math.cos((z.yaw_deg || 0) * Math.PI / 180), sn = Math.sin((z.yaw_deg || 0) * Math.PI / 180); return { id: s ? 'B' : 'A', cls: s ? demo.b : demo.a, x: z.x + lx * c - lz * sn, z: z.z + lx * sn + lz * c, y: s ? 0 : Math.max(0, Math.sin(t * 1.3) * 1.2) }; };
      var off = demo.phase === 'ACTIVATION' ? 0.9 : (demo.phase === 'RELEASE' ? 20 : 12); if (!z.duel) begin(z.id, P(0), P(1), { t: t - off }); z.duel.tStart = t - off; z.duel.tEnd = demo.phase === 'RELEASE' ? t - 0.5 : null;   /* the staged phase stays anchored to the current clock (the preview pins the clock after load) */
      update(z.id, [P(0), P(1)], 1); }); }
  /* HOST ADAPTER (best effort; unverified until the runtime bridge lands): when the host snapshot reports a live duel whose local fighter
     stands in a zone, the zone runs it — snap.duel.state / rules.match.state, snap.me.position + rules.me.class, the opponent from
     snap.duel.opponent or rules.others. Missing fields simply leave every zone dormant. */
  function P3(p) { if (!p) return null; if (Array.isArray(p)) return { x: +p[0], y: +(p[1] || 0), z: +p[2] }; if (isFinite(p.x) && isFinite(p.z)) return { x: +p.x, y: +(p.y || 0), z: +p.z }; return null; }
  function hostDuel(dt) { var s = null; try { s = ctx.snapshot ? ctx.snapshot() : null; } catch (e) { } if (!s) return; var R = s.rules || {}, st = (s.duel && s.duel.state) || (R.match && R.match.state) || null, live = st === 'ACTIVE' || st === 'STARTING' || st === 'COUNTDOWN';
    var mp = P3(s.me && (s.me.position || s.me.pos)), meCls = (R.me && R.me.class) || (s.me && s.me.class) || null, op = (s.duel && s.duel.opponent) || (R.others && R.others[0]) || null, opP = op && P3(op.position || op.pos || op), opCls = op && (op.class || op.class_id) || null;
    var zid = mp ? zoneAt(mp.x, mp.z) : null, cur = zones.filter(function (z) { return z.duel && z.duel.host; })[0];
    if (live && zid && opP) { var me = { id: 'me', cls: meCls, x: mp.x, z: mp.z, y: 0 }, you = { id: 'op', cls: opCls, x: opP.x, z: opP.z, y: 0 }; if (!cur || cur.id !== zid) { if (cur) end(cur.id); begin(zid, me, you); byId[zid].duel.host = true; } update(zid, [me, you], dt); }
    else if (cur && cur.duel.tEnd === null) end(cur.id); }
  function tick(dt, t) { if (!zones.length) return; clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); uF.uTime.value = clock; if (demo) runDemo(clock); else hostDuel(dt);
    var any = false; zones.forEach(function (z) { if (z.duel) { write(z); any = true; } }); if (any) flag(); }
  function setNight(n) { night = !!n; if (uF) { uF.uGlobal.value = night ? 1.25 : 0.85; uF.uFill.value = night ? 0.16 : 0.22; } if (uS) uS.uGlobal.value = night ? 1.1 : 0.7; }
  function dispose() { if (group && group.parent) group.parent.remove(group); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; zones = []; byId = {}; group = floor = shell = null; }
  function debug() { return { zones: zones.map(function (z) { return { id: z.id, at: [z.x, z.z], y: z.y, size_m: z.size_m, yaw_deg: z.yaw_deg, phase: phaseOf(z.id).phase }; }), draw_calls: zones.length ? 2 : 0, demo: demo ? demo.id + ':' + demo.phase : null }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug,
    zones: function () { return zones.map(function (z) { return { id: z.id, x: z.x, z: z.z, y: z.y, size_m: z.size_m, yaw_deg: z.yaw_deg }; }); },
    zoneAt: zoneAt, begin: begin, update: update, end: end, phase: phaseOf, onPhase: function (fn) { listeners.push(fn); }, classColor: function (c) { return '#' + colorOf(c).getHexString(); },
    setClassColor: function (cls, hex) { classColor[String(cls).toUpperCase()] = new THREE.Color(hex); } };   /* a future class brings its own colour (colour law: one of the five families) */
}
