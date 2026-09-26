/* MAHWORLD M8E · FACADE KIT — the reusable construction language for occupied buildings (owner 2026-09-26: the civic buildings read as
   smooth procedural shells — uninterrupted bands, identical strips, one sterile material; they must read CONSTRUCTED, OCCUPIED, FUNCTIONAL).
   One kit places, for any rounded-box tier stack (or a cylinder):
     · WINDOWS — real openings per FLOOR (floor-to-floor from the tier height), in BAYS of varied width between structural piers: civic
       glazing with mullions + transoms, small utility windows, double-height vertical groups, corner glazing on rounded corners, opaque
       service bays (louvre grilles, flush service doors) — never one continuous strip. Each pane is INTERIOR-MAPPED: the glass reflects the
       sky by Fresnel and shows a room behind it (back wall, side walls, floor, ceiling, furniture line, blinds) with a recess shadow at the
       reveal; at night a seeded share of rooms is lit, each at its own brightness and white temperature — the building is occupied;
     · FRAMES — frames, mullions, transoms, sills, bay piers and interrupted slab edges from ONE instanced box with per-instance colour;
     · LIGHT — thin integrated strips (pier edges, rooflines, door jambs): neutral white practical light; the five class colours appear only in
       a SHOW (central plaza at night, rarely, synchronised) — never a neon coat.
   Host safety: the kit mounts on the VISIBLE wall (spec.bevel: the rounded tiers are extruded with an 8 cm bevel, so their walls already
   stand 8 cm outside the collider face); below 3.4 m nothing the kit adds stands more than 5 cm beyond that wall (audit() proves it from
   the placed instances); above 3.4 m frames, sills, piers and the balcony may project. Draw cost: 4 instanced meshes for ALL buildings (panes, corner panes, bars, strips). */

export var CLASS_GLOW = ['#ffd77a', '#5c8cff', '#ff5a6a', '#b99cff', '#ffa6d4'];   /* = registry crystal_families gold / blue / red / purple / pink .glow */
export var CLASS_COLOR = ['#e6c36a', '#2a5be0', '#d4344a', '#8f6ad8', '#f08ab8'];   /* = registry .color: the saturated body the show runs on (the pale .glow tone-maps to white on a thin strip) */
export var LOW_Y = 3.4, LOW_PROUD = 0.05;
/* which construction profile a civic building takes, from its id (the city and the host-safety test use the same rule) */
export function profileFor(id, tiers) { id = String(id || ''); return /SPIRE|TOWER/.test(id) ? 'TOWER' : (/HALL|TRAINING|ARENA/.test(id) ? 'HALL' : (/EXCHANGE|MARKET/.test(id) ? 'EXCHANGE' : (tiers >= 3 ? 'TOWER' : 'EXCHANGE'))); }

function lcg(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

var PANE_VERT_HEAD = 'attribute vec4 aWin;\nvarying vec4 vWin; varying vec3 vTanV; varying vec2 vWinUv; varying vec2 vWinSize;';
var PANE_VERT_BODY = [
  '#ifdef USE_INSTANCING',
  '{ vec3 wT = mat3(modelMatrix) * instanceMatrix[0].xyz, wB = mat3(modelMatrix) * instanceMatrix[1].xyz, wN = mat3(modelMatrix) * instanceMatrix[2].xyz;',
  '  vWinSize = vec2(length(wT), length(wB)); wT = normalize(wT); wB = normalize(wB); wN = normalize(wN);',
  '  vec3 wV = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz - cameraPosition; vTanV = vec3(dot(wV, wT), dot(wV, wB), dot(wV, wN)); }',
  '#endif',
  'vWin = aWin; vWinUv = clamp(position.xy + 0.5, 0.0, 1.0);'].join('\n');
var PANE_FRAG_HEAD = 'uniform float uNight; uniform vec3 uLightA; uniform vec3 uLightB; uniform float uDayRoom; uniform vec3 uSkyH; uniform vec3 uSkyZ; uniform vec3 uGround;\nvarying vec4 vWin; varying vec3 vTanV; varying vec2 vWinUv; varying vec2 vWinSize;\nfloat fkH(float n) { return fract(sin(n * 91.345) * 47453.5453); }';
var PANE_FRAG_BODY = [
  '{ vec2 wsz = max(vWinSize, vec2(0.05)); vec3 d = normalize(vTanV); float depth = vWin.w; float seed = vWin.x;',
  '  float lobby = step(1.5, vWin.y), lit = clamp(vWin.y, 0.0, 1.0) * uNight; vec3 lightC = mix(uLightA, uLightB, fkH(seed * 3.1)) * mix(0.45 + 0.75 * fkH(seed * 5.7), 1.0, lobby);',
  '  vec3 amb = mix(vec3(uDayRoom) + lightC * 0.3 * lobby, lightC * (lit * 0.62 + lobby * 0.5 * uNight) + vec3(0.004), uNight);',   /* entrance lobbies are lit by day too */   /* by day the rooms are dim against the sky; at night lit rooms glow, dark rooms stay dark */
  '  vec3 room = amb * 0.25;',
  '  if (depth > 0.01 && d.z < -0.001) {',   /* interior mapping: the ray through the pane into a box room */
  '    vec2 p = vWinUv * wsz; float tb = depth / -d.z;',
  '    float tx = d.x > 0.0 ? (wsz.x + 0.6 - p.x) / d.x : (-0.6 - p.x) / min(d.x, -1e-4);',
  '    float ty = d.y > 0.0 ? (wsz.y + 0.35 - p.y) / d.y : (-0.9 - p.y) / min(d.y, -1e-4);',
  '    float t = min(tb, min(tx, ty)); vec3 hp = vec3(p, 0.0) + d * t; float dep = clamp(t * -d.z / depth, 0.0, 1.0);',
  '    vec3 wall;',
  '    if (tb <= min(tx, ty)) { wall = vec3(0.62, 0.63, 0.66) * (0.8 + 0.4 * fkH(seed * 11.0)); if (hp.y < 0.35) wall *= 0.45 + 0.3 * step(0.5, fract(hp.x * 0.9 + seed * 7.0)); }',   /* back wall + a furniture / partition line */
  '    else if (ty < tx) { wall = d.y > 0.0 ? vec3(0.8) * (1.0 + 2.2 * lit * smoothstep(0.9, 0.2, abs(hp.x - wsz.x * 0.5) / max(wsz.x, 0.5))) : vec3(0.3, 0.31, 0.33); }',   /* ceiling (a light fitting glows at night) / floor */
  '    else { wall = vec3(0.45, 0.46, 0.5); }',   /* side walls */
  '    room = wall * amb * (1.0 - 0.5 * dep); }',
  '  float bl = vWin.z; if (bl > 0.01 && vWinUv.y > 1.0 - bl) room = vec3(0.72, 0.73, 0.76) * (amb * 0.9 + vec3(0.02)) * (0.9 + 0.1 * step(0.5, fract(vWinUv.y * wsz.y * 9.0)));',   /* blinds */
  '  float e = min(min(vWinUv.x, 1.0 - vWinUv.x) * wsz.x, min(vWinUv.y, 1.0 - vWinUv.y) * wsz.y); room *= 0.55 + 0.45 * smoothstep(0.0, 0.14, e);',   /* the reveal shadows the recess */
  '  float F = 0.16 + 0.84 * pow(1.0 - clamp(abs(d.z), 0.0, 1.0), 5.0);',   /* coated facade glass: it mirrors the sky by day, you see into a room when you face it */
  '  vec3 rf = vec3(d.x, d.y, -d.z) + vec3(fkH(seed * 17.0) - 0.5, fkH(seed * 23.0) - 0.5, 0.0) * 0.06;',   /* each pane is set a hair off-plane: reflections break from pane to pane */
  '  vec3 sky = rf.y > 0.0 ? mix(uSkyH, uSkyZ, pow(clamp(rf.y, 0.0, 1.0), 0.6)) : mix(uSkyH * 0.85, uGround, clamp(-rf.y * 3.0, 0.0, 1.0));',
  '  sky *= 0.85 + 0.3 * fkH(seed * 13.1);',
  '  totalEmissiveRadiance += room * (1.0 - F) + sky * F; }'].join('\n');

var STRIP_HEAD = 'attribute vec4 aLight;\nvarying vec4 vLight;';
var STRIP_FRAG_HEAD = 'uniform float uShow; uniform float uTime; uniform float uNight; uniform vec3 uWhite; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4;\nvarying vec4 vLight;\nvec3 fkClass(float i) { return i < 0.5 ? uC0 : (i < 1.5 ? uC1 : (i < 2.5 ? uC2 : (i < 3.5 ? uC3 : uC4))); }';
var STRIP_FRAG_BODY = [
  '{ float k = vLight.z * mix(0.32, 1.0, uNight); vec3 c = uWhite;',
  '  if (uShow > 0.001 && vLight.w > 0.5) { float s = uTime * 0.3 + vLight.x * 0.7 + vLight.y * 0.19; float i = mod(floor(s), 5.0); vec3 ca = mix(fkClass(i), fkClass(mod(i + 1.0, 5.0)), smoothstep(0.75, 1.0, fract(s)));',
  '    float wave = 0.5 + 0.5 * sin(6.2832 * (uTime * 0.45 - vLight.x)); c = mix(c, ca, uShow * 0.92); k = mix(k, 0.7 + 0.55 * wave, uShow); }',   /* class colours ONLY in a show: a slow synchronised sweep */
  '  diffuseColor.rgb = c * k; }'].join('\n');

export function createFacadeKit(THREE, opts) {
  opts = opts || {}; var tierQ = opts.tier || 'HIGH', night = !!opts.night, showForce = opts.show === true;
  var panes = [], corners = [], bars = [], strips = [], pieces = [], info = { buildings: 0, windows: 0, corner_panes: 0, bars: 0, strips: 0, draw_calls: 0 };
  var UP = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4(), _b = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
  var COL = { frame: new THREE.Color(0x2c323a), sill: new THREE.Color(0xc2c8d0), pier: new THREE.Color(0x8d96a2), slab: new THREE.Color(0xaab2bc), grille: new THREE.Color(0x3a414a), door: new THREE.Color(0x4a525c), rail: new THREE.Color(0xb8c0ca), parapet: new THREE.Color(0x9ba3ad), house: new THREE.Color(0x767e89) };
  /* one oriented box in a face frame: F = { o: face origin (Vector3), t: tangent, n: normal }; a = along, y = base height, depth measured from the face outward */
  function fbox(F, a, y, lenT, lenY, proud, col, rec) { var n0 = rec && rec.n0 !== undefined ? rec.n0 : 0; _p.copy(F.o).addScaledVector(F.t, a).addScaledVector(F.n, n0 + proud / 2); _p.y = y + lenY / 2; _b.makeBasis(F.t, UP, F.n); _q.setFromRotationMatrix(_b); _s.set(lenT, lenY, Math.max(0.01, proud)); _m.compose(_p, _q, _s); bars.push({ m: _m.clone(), c: col }); pieces.push({ y0: y, y1: y + lenY, proud: n0 + proud, id: F.id }); }
  function pane(F, a, y, w, h, win, rec) { var n0 = rec && rec.n0 !== undefined ? rec.n0 : 0; _p.copy(F.o).addScaledVector(F.t, a).addScaledVector(F.n, n0 + 0.012); _p.y = y + h / 2; _b.makeBasis(F.t, UP, F.n); _q.setFromRotationMatrix(_b); _s.set(w, h, 1); _m.compose(_p, _q, _s); panes.push({ m: _m.clone(), w: win }); pieces.push({ y0: y, y1: y + h, proud: n0 + 0.012, id: F.id }); info.windows++; }
  function strip(F, a, y, lenT, lenY, rec, light) { var n0 = rec && rec.n0 !== undefined ? rec.n0 : 0; _p.copy(F.o).addScaledVector(F.t, a).addScaledVector(F.n, n0 + 0.03); _p.y = y + lenY / 2; _b.makeBasis(F.t, UP, F.n); _q.setFromRotationMatrix(_b); _s.set(lenT, lenY, 0.04); _m.compose(_p, _q, _s); strips.push({ m: _m.clone(), l: light }); pieces.push({ y0: y, y1: y + lenY, proud: n0 + 0.05, id: F.id }); }
  /* a framed window: pane + head, sill, jambs, mullions every ~1.3 m, an optional transom; frames project 4 cm below 3.4 m (the host rule), 10 cm above */
  function framedWindow(F, a, y, w, h, win, style, rec) { var low = y - 0.12 < LOW_Y, fd = low ? 0.04 : 0.1, fw = 0.075, n0 = rec && rec.n0 || 0;
    pane(F, a, y, w, h, win, rec);
    fbox(F, a, y + h, w + 2 * fw, fw, fd, COL.frame, rec); fbox(F, a - w / 2 - fw / 2, y, fw, h, fd, COL.frame, rec); fbox(F, a + w / 2 + fw / 2, y, fw, h, fd, COL.frame, rec);
    fbox(F, a, y - fw * 1.3, w + 2 * fw + (low ? 0 : 0.12), fw * 1.3, low ? fd : fd + 0.08, COL.sill, rec);   /* the sill projects a little more (drip edge) */
    var nm = Math.max(0, Math.round(w / (style === 'CIVIC' ? 1.3 : 0.9)) - 1); for (var i = 1; i <= nm; i++) fbox(F, a - w / 2 + i * w / (nm + 1), y, fw * 0.6, h, fd * 0.7, COL.frame, rec);
    if (style === 'CIVIC' && h > 2.4) fbox(F, a, y + h - 0.75, w, fw * 0.6, fd * 0.7, COL.frame, rec);   /* transom: a fixed upper light */ }
  function bayWidths(L, pattern, rnd) { var out = [], acc = 0, i = 0; while (acc < L - 0.5 && i < 64) { var wv = pattern[i % pattern.length] * (0.9 + rnd() * 0.2); out.push(wv); acc += wv; i++; } var k = L / Math.max(acc, 1e-3); return out.map(function (v) { return v * k; }); }
  var PROFILES = {
    TOWER: { bays: [2.9, 1.9, 2.9, 3.6], lit: 0.62, blinds: 0.45, depth: [3.2, 5.0] },
    HALL: { bays: [3.8, 3.8, 2.4], lit: 0.4, blinds: 0.2, depth: [5.0, 8.0] },
    EXCHANGE: { bays: [3.2, 2.2, 3.2], lit: 0.52, blinds: 0.3, depth: [3.0, 4.6] }
  };
  /* spec: { id, cx, cz, w, d, tiers, hEach, profile, entrance: {side, x, z, width, height}, seed, corner: bool, balcony: bool } */
  function addBoxBuilding(spec) {
    var P = PROFILES[spec.profile] || PROFILES.TOWER, rnd = lcg(spec.seed || 7), e = spec.entrance || null, ent = e ? e.side : '+z';
    var rear = { '+x': '-x', '-x': '+x', '+z': '-z', '-z': '+z' }[ent] || '-z', cY = e ? e.height + 0.35 : 0;
    info.buildings++; var bev = spec.bevel || 0; var balc = spec.balcony && spec.tiers > 1 && e ? Math.min(5.2, ((e.side === '+x' || e.side === '-x') ? spec.d : spec.w) * 0.91 * 0.42) : 0;
    function win(kind) { var lit = rnd() < P.lit ? 0.35 + 0.65 * rnd() : 0; return [rnd(), lit, rnd() < P.blinds ? 0.12 + rnd() * 0.45 : 0, kind === 'NONE' ? 0 : P.depth[0] + rnd() * (P.depth[1] - P.depth[0])]; }
    for (var t = 0; t < spec.tiers; t++) { var k = 1 - t * 0.09, tw = spec.w * k, td = spec.d * k, r = Math.min(tw, td) * 0.24, y0 = t * spec.hEach, H = spec.hEach, top = t === spec.tiers - 1;
      var floors = Math.max(1, Math.round(H / 3.6)), FH = H / floors;
      [['+x', 1, 0], ['-x', -1, 0], ['+z', 0, 1], ['-z', 0, -1]].forEach(function (fd) {
        var side = fd[0], n = new THREE.Vector3(fd[1], 0, fd[2]), tv = new THREE.Vector3().crossVectors(UP, n), half = (fd[1] ? tw / 2 : td / 2) + bev, L = (fd[1] ? td : tw) - 2 * r;
        if (L < 1.5) return; var F = { o: new THREE.Vector3(spec.cx, 0, spec.cz).addScaledVector(n, half), t: tv, n: n, id: spec.id + side + t };
        var bw = bayWidths(L, P.bays, rnd), a0 = -L / 2, isEnt = side === ent && t === 0, isRear = side === rear, entA = isEnt ? (e.x - spec.cx) * tv.x + (e.z - spec.cz) * tv.z : 1e9;
        var acc = a0; bw.forEach(function (w, bi) { var a = acc + w / 2, last = bi === bw.length - 1; acc += w;
          if (!last) { var pw = 0.26 + rnd() * 0.12, pb = y0 < LOW_Y ? LOW_Y + 0.2 : y0 + 0.05, pt = y0 + H - 0.45; if (pt - pb > 1) fbox(F, acc, pb, pw, pt - pb, 0.16, COL.pier); }   /* bay piers of varied width (never above the entrance canopy) */
          var inEnt = Math.abs(a - entA) < w / 2 + 0.3, inBalc = balc && t === 1 && side === ent && Math.abs(a) < balc / 2 + w / 2;
          for (var f = 0; f < floors; f++) { var fy = y0 + f * FH, lowF = fy < LOW_Y;
            if (f > 0 && fy - 0.12 >= LOW_Y && !(inEnt && fy < cY + 2)) fbox(F, a, fy - 0.12, w - 0.34, 0.24, 0.07, COL.slab);   /* the slab edge, interrupted at every pier */
            if (inEnt && fy < cY + 1.9) continue;   /* the entrance bay: door, canopy and transom own it */
            if (inBalc && f === 0) continue;   /* the balcony door owns it */
            var service = isRear && (bi % 3 === 1) && !(spec.profile === 'EXCHANGE' && f === 0);
            if (service) { if (lowF) { fbox(F, a, fy + 0.02, 1.1, 2.3, 0.03, COL.door); fbox(F, a, fy + 2.32, 1.3, 0.08, 0.04, COL.frame); strip(F, a, fy + 2.46, 0.5, 0.05, null, [0, info.buildings, 0.6, 0]); }   /* a flush service door with its light */
              else { var gw = Math.min(w - 0.6, 2.2); fbox(F, a, fy + 0.9, gw + 0.12, 1.5, 0.05, COL.frame); for (var g = 0; g < 7; g++) fbox(F, a, fy + 1.0 + g * 0.2, gw, 0.05, 0.12, COL.grille); }   /* a louvre grille: plant air */
              continue; }
            var kind = spec.profile === 'HALL' ? (f === floors - 1 || floors === 1 ? 'CLERESTORY' : 'UTILITY') : (spec.profile === 'EXCHANGE' && f === 0 ? 'STOREFRONT' : (spec.profile === 'TOWER' && top && (side === '+z' || side === '-z') && bi % 2 === 0 && floors > 1 ? 'VERTICAL' : 'CIVIC'));
            if (kind === 'VERTICAL') { if (f % 2 === 1) continue; var vh = Math.min(FH * 2, H) - 1.3; framedWindow(F, a - w * 0.18, fy + 0.8, 0.62, vh, win(), 'UTIL'); framedWindow(F, a + w * 0.18, fy + 0.8, 0.62, vh, win(), 'UTIL'); continue; }   /* double-height slots in pairs */
            if (kind === 'UTILITY') { var uw = 0.95, nU = w > 3.2 ? 2 : 1; for (var u = 0; u < nU; u++) framedWindow(F, a + (nU === 1 ? 0 : (u - 0.5) * w * 0.45), fy + 1.1, uw, 1.25, win(), 'UTIL'); continue; }
            if (kind === 'CLERESTORY') { var ch = Math.min(1.6, FH * 0.32); framedWindow(F, a, fy + FH - ch - 0.45, w - 0.6, ch, win(), 'CIVIC'); if (floors === 1 && FH > 4) framedWindow(F, a, fy + 1.0, Math.min(1.1, w * 0.3), 1.3, win(), 'UTIL'); continue; }   /* a hall: high light, solid lower walls */
            if (kind === 'STOREFRONT') { framedWindow(F, a, fy + 0.35, w - 0.55, Math.min(FH - 0.9, 3.0), win(), 'CIVIC'); continue; }
            var ww = w - 0.62 - rnd() * 0.3, wh = FH - 1.15; framedWindow(F, a, fy + 0.85, ww, wh, win(), 'CIVIC'); }
        });
        if (top && spec.profile !== 'HALL') { var sy0 = Math.max(y0 + 0.3, LOW_Y + 0.3); [-1, 1].forEach(function (sg) { strip(F, sg * L / 2, sy0, 0.09, y0 + H - 0.6 - sy0, { n0: 0.15 }, [sg * 0.25 + t * 0.4, info.buildings, 0.9, 1]); }); }   /* on the face of the corner piers */   /* integrated vertical light at the corner piers of the crown */
        strip(F, 0, y0 + H - 0.32, L * 0.92, 0.08, { n0: 0.22 }, [t * 0.33, info.buildings, 0.8, 1]);   /* the roofline / setback light on the eave fascia, interrupted at the corners */
        if (top) { var yR = y0 + H + 0.04, PL = L * 0.94;   /* ROOFLINE: a parapet on every straight run (stopped short of the rounded corners), a metal coping, a heavier cap block at each end */
          fbox(F, 0, yR, PL, 0.68, 0.24, COL.parapet, { n0: -0.36 }); fbox(F, 0, yR + 0.68, PL + 0.08, 0.06, 0.32, COL.frame, { n0: -0.4 });
          [-1, 1].forEach(function (sg) { fbox(F, sg * (PL / 2 + 0.12), yR, 0.34, 0.92, 0.36, COL.pier, { n0: -0.42 }); });
          if (isRear && spec.profile !== 'HALL') { var hw = Math.min(2.4, L * 0.3), ha = L / 2 - hw / 2 - 0.9, hd = 1.6, hn = -0.75 - hd;   /* the plant side: a roof-access stair housing and a guard rail over the parapet (maintenance) */
            fbox(F, ha, yR, hw, 2.45, hd, COL.house, { n0: hn }); fbox(F, ha, yR + 2.45, hw + 0.16, 0.08, hd + 0.16, COL.frame, { n0: hn - 0.08 });
            fbox(F, ha, yR, 0.92, 2.1, 0.03, COL.door, { n0: -0.75 }); strip(F, ha, yR + 2.2, 0.42, 0.04, { n0: -0.75 }, [0, info.buildings, 0.55, 0]);   /* its door and a practical light */
            var rl = PL - hw - 1.4, ra = -PL / 2 + rl / 2, np = Math.max(2, Math.round(rl / 1.6) + 1); for (var q = 0; q < np; q++) fbox(F, ra - rl / 2 + q * rl / (np - 1), yR + 0.74, 0.05, 0.42, 0.05, COL.rail, { n0: -0.26 });
            fbox(F, ra, yR + 1.13, rl, 0.05, 0.05, COL.rail, { n0: -0.26 }); } }
      });
      if (spec.corner && top && floors > 0) { var cr = r + bev + 0.03; [[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(function (c, ci) { for (var f2 = 0; f2 < floors; f2++) { var fy2 = y0 + f2 * FH; if (fy2 < LOW_Y) continue; _p.set(spec.cx + c[0] * (tw / 2 - r), fy2 + 0.85 + (FH - 1.15) / 2, spec.cz + c[1] * (td / 2 - r)); _q.setFromAxisAngle(UP, Math.atan2(c[0], c[1]) - Math.PI / 4); _s.set(cr, FH - 1.15, cr); _m.compose(_p, _q, _s); corners.push({ m: _m.clone(), w: [rnd(), rnd() < P.lit ? 0.4 + 0.6 * rnd() : 0, 0, 0] }); info.corner_panes++; } }); }   /* corner glazing wraps the rounded corners */
    }
    if (spec.balcony && spec.tiers > 1 && e) {   /* a cantilevered balcony on the first upper tier, over the entrance side: a door, a slab, a glass balustrade, a rail, brackets */
      var k1 = 0.91, w1 = spec.w * k1, d1 = spec.d * k1, sx = e.side === '+x' ? 1 : e.side === '-x' ? -1 : 0, sz = e.side === '+z' ? 1 : e.side === '-z' ? -1 : 0, n1 = new THREE.Vector3(sx, 0, sz), t1 = new THREE.Vector3().crossVectors(UP, n1);
      var F1 = { o: new THREE.Vector3(spec.cx, 0, spec.cz).addScaledVector(n1, (sx ? w1 / 2 : d1 / 2) + (spec.bevel || 0)), t: t1, n: n1, id: spec.id + 'balcony' }, yb = spec.hEach, BW = Math.min(5.2, (sx ? d1 : w1) * 0.42), BD = 1.7;
      fbox(F1, 0, yb - 0.24, BW, 0.24, BD, COL.slab); fbox(F1, 0, yb + 1.02, BW, 0.06, 0.06, COL.rail, { n0: BD - 0.08 });
      [-1, 1].forEach(function (sg) { fbox(F1, sg * (BW / 2 - 0.03), yb, 0.06, 1.08, BD, COL.rail); fbox(F1, sg * (BW / 2 - 0.4), yb - 0.9, 0.1, 0.66, 0.1, COL.frame, { n0: BD * 0.45 }); });
      for (var pn = 0; pn < 4; pn++) fbox(F1, -BW / 2 + 0.3 + pn * (BW - 0.6) / 3, yb, 0.04, 1.02, 0.04, COL.rail, { n0: BD - 0.06 });
      pane(F1, -BW * 0.18, yb + 0.05, 1.1, 2.35, [rnd(), rnd() < 0.7 ? 0.8 : 0, 0, 3.4], null); fbox(F1, -BW * 0.18, yb + 2.4, 1.26, 0.08, 0.1, COL.frame);   /* the balcony door */
      strip(F1, 0, yb - 0.26, BW * 0.9, 0.04, { n0: BD - 0.05 }, [0.5, info.buildings, 0.8, 1]);   /* the slab-edge downlight */
      info.balconies = (info.balconies || 0) + 1; }
  }
  /* a cylinder base (the arena): a ring of tall clerestory windows above head height with piers between them */
  function addCylinder(spec) { var rnd = lcg(spec.seed || 3), n = spec.count || 14; info.buildings++;
    function frameAt(ang, id) { var nrm = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)); return { o: new THREE.Vector3(spec.x, 0, spec.z).addScaledVector(nrm, spec.r), t: new THREE.Vector3().crossVectors(UP, nrm), n: nrm, id: spec.id + id }; }
    for (var i = 0; i < n; i++) { var ang = (i + 0.5) / n * Math.PI * 2, skip = spec.skip !== undefined && Math.abs(Math.atan2(Math.sin(ang - spec.skip), Math.cos(ang - spec.skip))) < 0.45;
      if (!skip) framedWindow(frameAt(ang, 'w' + i), 0, spec.y0, spec.ww || 1.4, spec.wh || 2.2, [rnd(), rnd() < 0.55 ? 0.4 + 0.6 * rnd() : 0, rnd() < 0.3 ? 0.3 : 0, 6.0], 'CIVIC', { n0: 0.02 });
      fbox(frameAt((i + 1) / n * Math.PI * 2, 'p' + i), 0, LOW_Y + 0.1, 0.22, spec.y0 + (spec.wh || 2.2) - LOW_Y + 0.4, 0.14, COL.pier, { n0: -0.04 }); } }   /* piers between the windows, each on its own radial */
  /* a STOREFRONT ENTRANCE (replaces the flat door slab): a proud portal surround, a glazed double door with a centre stile, push bars, a transom
     light and a flush threshold, a lit lobby behind the glass. spec: { id, o: point on the visible wall at the door centre (y 0), n: outward normal, width, height } */
  function addEntrance(spec) { var n = spec.n.clone().normalize(), F = { o: spec.o.clone(), t: new THREE.Vector3().crossVectors(UP, n), n: n, id: spec.id + 'entrance' }, W = spec.width, Ht = spec.height, rnd = lcg((spec.seed || 5) + 99);
    var dh = Math.min(2.6, Ht - 0.2), th = Ht - dh - 0.25;
    pane(F, 0, 0.03, W, dh, [rnd(), 2, 0, 7.5], null);   /* the doors: a deep lit lobby */
    if (th > 0.4) pane(F, 0, dh + 0.18, W, th, [rnd(), 2, 0, 7.5], null);   /* the transom light over the doors */
    fbox(F, 0, dh + 0.03, W, 0.15, 0.04, COL.frame);   /* transom bar */ fbox(F, 0, 0.03, 0.09, dh, 0.04, COL.frame);   /* centre stile */
    [-1, 1].forEach(function (sg) { fbox(F, sg * (W / 2 + 0.16), 0, 0.32, Ht + 0.2, 0.045, COL.pier); fbox(F, sg * W * 0.25, 1.0, W * 0.3, 0.05, 0.05, COL.rail); fbox(F, sg * W * 0.5, 0.03, 0.08, dh, 0.04, COL.frame); });   /* portal jambs, push bars, door frames */
    fbox(F, 0, Ht, W + 0.64, 0.3, 0.045, COL.pier);   /* portal head */ strip(F, 0, Ht - 0.07, W, 0.04, null, [0.1, 0, 1.0, 0]);   /* a practical downlight under the head: always neutral white */ fbox(F, 0, 0.0, W + 0.3, 0.012, 0.045, COL.sill);   /* flush threshold */
    info.entrances = (info.entrances || 0) + 1; }
  var meshes = [], mats = [], geos = [], paneMat = null, stripMat = null;
  function paneMaterial() { var m = new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.08, metalness: 0.0, envMapIntensity: 1.1 });
    m.onBeforeCompile = function (sh) { sh.uniforms.uNight = { value: night ? 1 : 0 }; sh.uniforms.uLightA = { value: new THREE.Color(0xf6f4ee) }; sh.uniforms.uLightB = { value: new THREE.Color(0xe8eefc) }; sh.uniforms.uDayRoom = { value: 0.11 }; sh.uniforms.uSkyH = { value: new THREE.Color(night ? 0x252848 : 0xc9d5e4) }; sh.uniforms.uSkyZ = { value: new THREE.Color(night ? 0x0a0d1f : 0x6c8ec4) }; sh.uniforms.uGround = { value: new THREE.Color(night ? 0x101219 : 0x5c626b) }; m.userData.shader = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + PANE_VERT_HEAD).replace('#include <project_vertex>', '#include <project_vertex>\n' + PANE_VERT_BODY);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + PANE_FRAG_HEAD).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(0.04 + 0.12 * fkH(vWin.x * 7.3), 0.03, 0.2);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + PANE_FRAG_BODY); };
    m.customProgramCacheKey = function () { return 'mahworld-facade-pane-v1'; }; return m; }
  function stripMaterial() { var cols = (opts.classColor || CLASS_COLOR).map(function (h) { return new THREE.Color(h); }); var m = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true, toneMapped: true });
    m.onBeforeCompile = function (sh) { sh.uniforms.uShow = { value: showForce ? 1 : 0 }; sh.uniforms.uTime = { value: 0 }; sh.uniforms.uNight = { value: night ? 1 : 0 }; sh.uniforms.uWhite = { value: new THREE.Color(0xf4f6fb) }; cols.forEach(function (c, i) { sh.uniforms['uC' + i] = { value: c }; }); m.userData.shader = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + STRIP_HEAD).replace('#include <begin_vertex>', '#include <begin_vertex>\nvLight = aLight;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + STRIP_FRAG_HEAD).replace('#include <color_fragment>', '#include <color_fragment>\n' + STRIP_FRAG_BODY); };
    m.customProgramCacheKey = function () { return 'mahworld-facade-strip-v1'; }; return m; }
  function instanced(geo, mat, list, name, attr, attrOf) { if (!list.length) return null; var im = new THREE.InstancedMesh(geo, mat, list.length); im.name = name; im.userData.noMerge = true; im.frustumCulled = false;
    var a = attr ? new Float32Array(list.length * 4) : null; list.forEach(function (it, i) { im.setMatrixAt(i, it.m); if (it.c) im.setColorAt(i, it.c); if (a) { var v = attrOf(it); a[i * 4] = v[0]; a[i * 4 + 1] = v[1]; a[i * 4 + 2] = v[2]; a[i * 4 + 3] = v[3]; } });
    if (a) geo.setAttribute(attr, new THREE.InstancedBufferAttribute(a, 4)); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); meshes.push(im); geos.push(geo); info.draw_calls++; return im; }
  function build(group) {
    paneMat = paneMaterial(); stripMat = stripMaterial(); var barMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.78, envMapIntensity: 0.7 }); mats.push(paneMat, stripMat, barMat);
    var root = new THREE.Group(); root.name = 'FACADE_KIT'; root.userData.noMerge = true;
    var p1 = instanced(new THREE.PlaneGeometry(1, 1), paneMat, panes, 'FACADE_WINDOWS', 'aWin', function (it) { return it.w; }); if (p1) root.add(p1);
    var cg = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true, 0, Math.PI / 2); var p2 = instanced(cg, paneMat, corners, 'FACADE_CORNER_GLAZING', 'aWin', function (it) { return it.w; }); if (p2) root.add(p2); else cg.dispose();
    var b = instanced(new THREE.BoxGeometry(1, 1, 1), barMat, bars, 'FACADE_FRAMES'); if (b) root.add(b);
    var s = instanced(new THREE.BoxGeometry(1, 1, 1), stripMat, strips, 'FACADE_LIGHTS', 'aLight', function (it) { return it.l; }); if (s) root.add(s);
    info.bars = bars.length; info.strips = strips.length; group.add(root); return root; }
  function setNight(n) { night = !!n; [paneMat, stripMat].forEach(function (m) { var sh = m && m.userData.shader; if (sh) sh.uniforms.uNight.value = night ? 1 : 0; }); var ps = paneMat && paneMat.userData.shader; if (ps) { ps.uniforms.uSkyH.value.set(night ? 0x252848 : 0xc9d5e4); ps.uniforms.uSkyZ.value.set(night ? 0x0a0d1f : 0x6c8ec4); ps.uniforms.uGround.value.set(night ? 0x101219 : 0x5c626b); } }
  /* the show: central-plaza facades run a slow class-colour sequence for 24 s every 150 s, at night only (calm by day); forced on for evidence */
  function tick(dt, t) { var sh = stripMat && stripMat.userData.shader; if (!sh) return; sh.uniforms.uTime.value = t || 0; if (showForce) { sh.uniforms.uShow.value = 1; return; }
    var ph = ((t || 0) % 150) / 24, on = night && ph < 1 ? Math.min(1, ph * 6, (1 - ph) * 6) : 0; sh.uniforms.uShow.value = on; }
  /* host rule proof: every placed piece below 3.4 m stays within 5 cm of the face (piers, frames, sills, doors, panes, lights) */
  function audit() { var worst = 0; pieces.forEach(function (p) { if (p.y0 < LOW_Y - 1e-6) worst = Math.max(worst, p.proud); }); return { pieces: pieces.length, max_proud_below_3_4_m: +worst.toFixed(3), ok: worst <= LOW_PROUD + 1e-6 }; }
  function dispose() { meshes.forEach(function (m) { if (m.parent) m.parent.remove(m); }); geos.forEach(function (g) { g.dispose(); }); mats.forEach(function (m) { m.dispose(); }); meshes = []; geos = []; mats = []; }
  return { addBoxBuilding: addBoxBuilding, addCylinder: addCylinder, addEntrance: addEntrance, build: build, setNight: setNight, tick: tick, audit: audit, dispose: dispose, info: function () { return Object.assign({}, info); } };
}

export function idSeed(id) { var h = 2166136261; id = String(id || ''); for (var i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/* the civic placement rule for one authored building collider (BOX or CYLINDER + a building block) — the city and the host-safety test
   run exactly this, so the audit proves what the player sees */
export function addCivicBuilding(kit, THREE, s) {
  var B = s && s.building; if (!B) return null; var cx, cz, w, d; if (s.type === 'CYLINDER') { cx = s.x; cz = s.z; w = d = s.r * 2; } else { cx = (s.x1 + s.x2) / 2; cz = (s.z1 + s.z2) / 2; w = s.x2 - s.x1; d = s.z2 - s.z1; }
  var tiers = Math.max(1, B.tiers || 1), hEach = s.h / tiers, prof = profileFor(s.id, tiers), E = B.entrance || null;
  if (B.dome) kit.addCylinder({ id: s.id, x: cx, z: cz, r: s.r * 1.012, y0: 3.7, count: 16, skip: E ? Math.atan2(E.x - cx, E.z - cz) : undefined, ww: 1.3, wh: 2.3, seed: idSeed(s.id) });   /* a clerestory ring of framed windows replaces the continuous glass band */
  else kit.addBoxBuilding({ id: s.id, cx: cx, cz: cz, w: w, d: d, tiers: tiers, hEach: hEach, profile: prof, entrance: E, seed: idSeed(s.id), corner: prof === 'TOWER', balcony: prof === 'TOWER', bevel: 0.08 });
  if (E) { var sx = E.side === '+x' ? 1 : E.side === '-x' ? -1 : 0, sz = E.side === '+z' ? 1 : E.side === '-z' ? -1 : 0, en = B.dome ? new THREE.Vector3(E.x - cx, 0, E.z - cz).normalize() : new THREE.Vector3(sx, 0, sz);
    kit.addEntrance({ id: s.id, o: new THREE.Vector3(E.x, 0, E.z).addScaledVector(en, B.dome ? s.r * 0.04 : 0.08), n: en, width: E.width, height: E.height, seed: idSeed(s.id) }); }   /* a storefront entrance on the visible wall */
  return prof;
}
