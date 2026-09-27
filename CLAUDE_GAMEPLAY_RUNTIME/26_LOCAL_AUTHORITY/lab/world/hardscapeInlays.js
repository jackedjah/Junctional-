/* MAHWORLD M17 :: HARDSCAPE CLASS-ENERGY INLAYS (owner directive 2026-09-27, §18–19: "extend SOME of this visual vocabulary into the rest
   of MAHWORLD … restrained embedded class-energy elements throughout shared hardscape … do NOT turn roads into glowing rainbow tracks").
   The duel court's language — small crystalline gems set into stone, a five-class rosette — carried into the roads, sparingly:
     · SHARED JUNCTIONS (roads of different classes meet, or any junction in the shared plaza / match district): a small five-gem
       rosette — gold, blue, crimson, violet, pink round a pearl hairline — the same identity mark the duel courts carry;
     · DISTRICT JUNCTIONS (one class's roads): one larger gem in that class's colour;
     · ROAD-EDGE INSETS: small recessed gems along the causeway and regional road edges every ~9 m, alternating sides. Inside a class
       district they take that class's colour, with every fifth one another class in turn (the district leads; the others are
       acknowledged); on shared ground they run the five-class sequence;
     · BRIDGES: a centreline of five-class gems along each deck (bridges are shared crossings);
     · FORECOURTS: a ring of eight gems in the sanctuary's class at each forecourt.
   Each inlay reads as EMBEDDED, not taped on: a dark recessed socket, a faceted crystal core, a faint halo, and a rare soft pulse that
   travels along the road; brighter at night, subtle by day, gone beyond ~140 m (no far shimmer). Neutral paving stays dominant: the
   inlays cover a tiny fraction of the road surface.
   Host safety: pure light just above the road ribbon (≤ 4.9 cm over the ground) or 1.2 cm over a bridge deck top, no depth write, no collider, never interactable. ONE instanced draw.
   Also: junctions where roads of different classes meet get a PEARL seam ring (terrain.js averaged their seam colours — gold + pink
   averaged to a peach, off the colour law). */
import { buildRoadNetwork } from './roadNetwork.js';
import { groundYAt } from './worldLayout.js';
import { CLASS_IDS, CLASS_HEX, PEARL_HEX } from './duelRoster.js';

export var FAMILY_CLASS = { gold: 'ATHLETE', blue: 'TITAN', red: 'LEAN', purple: 'VISIONARY', pink: 'BAGE' };
export var INLAY = { edge_step_m: 9, edge_inset_m: 0.45, gem_m: 0.3, node_gem_m: 0.5, rosette_r_m: 1.25, rosette_gem_m: 0.24, bridge_step_m: 2.75, forecourt_gems: 8, lift_m: 0.012, road_cap_m: 0.049, fade_m: [70, 140] };   /* on the roads (4.5 cm ribbons) the inlay tops out at 4.9 cm — the host rule: ≤ 5 cm proud below 3.4 m */
/* shared ground: the central plaza (NEXUS), the match district, the bridges */
export function sharedAt(reg, x, z) { var Zs = (reg && reg.zones) || [];
  for (var i = 0; i < Zs.length; i++) { var Z = Zs[i], r = Z.rect; if (!r) continue; if ((Z.id === 'PLAZA_CLEAR' || Z.id === 'MATCH_DISTRICT') && x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) return true; }
  var L = (reg && reg.paths && reg.paths.links) || []; for (var j = 0; j < L.length; j++) { var d = L[j].deck; if (d && x >= d.x1 && x <= d.x2 && z >= d.z1 && z <= d.z2) return true; }
  return false; }
function deckY(reg, x, z) { var L = (reg && reg.paths && reg.paths.links) || []; for (var j = 0; j < L.length; j++) { var d = L[j].deck; if (!d) continue; if (x >= d.x1 && x <= d.x2 && z >= d.z1 + 3 && z <= d.z2 - 3) return 0.35; } return null; }   /* the bridge deck tops (BRIDGE_*_DECK colliders, h 0.35) */
/* THE LAYOUT (pure; THREE-free, so the tests can check it): a list of inlays { kind: GEM | NODE | ROSETTE_GEM | RING, x, z, y, size,
   classId (null = pearl), phase (the pulse offset along the road), shared } */
export function hardscapeLayout(reg, opts) { opts = opts || {}; var PW = (reg && reg.paths) || {}, W = { CAUSEWAY: PW.causeway_w || 20, REGIONAL: PW.regional_w || 8, TRAIL: PW.trail_w || 3 }, out = [], roads = [], ex = [];
  function Y(x, z) { var d = deckY(reg, x, z); return d !== null ? d + INLAY.lift_m : groundYAt(reg, x, z) + Math.min(((reg.ground_detail && reg.ground_detail.path_y) || 0.016) + 0.004, INLAY.road_cap_m); }
  function add(o) { o.y = Y(o.x, o.z); o.deck = deckY(reg, o.x, o.z) !== null; o.shared = sharedAt(reg, o.x, o.z); out.push(o); }
  (PW.list || []).forEach(function (P) { var w = W[P.tier] || 3; if ((P.pts || []).length >= 2) roads.push({ id: P.id, tier: P.tier, family: P.family, points: P.pts, frameW: w, coreW: w - 1 });
    if (P.forecourt) { ex.push({ id: P.id + ':FORECOURT', kind: 'FORECOURT', x: P.forecourt.x, z: P.forecourt.z, radius: P.forecourt.r || PW.forecourt_r || 12 }); [P.spur, P.spur2].forEach(function (S, i) { if (S && S.to) roads.push({ id: P.id + ':SPUR' + i, tier: P.tier, family: P.family, points: [[P.forecourt.x, P.forecourt.z], S.to], frameW: PW.spur_w || 6, coreW: (PW.spur_w || 6) - 1.2 }); }); } });
  var net = buildRoadNetwork(roads, ex), nodes = net.nodes.filter(function (n) { return !n.bendOnly; });
  function nearNode(x, z, pad) { for (var i = 0; i < nodes.length; i++) { var n = nodes[i]; if (Math.hypot(x - n.x, z - n.z) < (n.frameRadius || n.radius || 4) + pad) return true; } return false; }
  var seq = 0;
  /* junctions */
  nodes.forEach(function (n) { var fams = []; (n.styles || []).forEach(function (s) { if (fams.indexOf(s.family) < 0) fams.push(s.family); });
    var shared = fams.length > 1 || fams.indexOf('platinum') >= 0 || sharedAt(reg, n.x, n.z), cls = fams.length === 1 ? FAMILY_CLASS[fams[0]] : null;
    if (n.kind === 'FORECOURT' || n.explicit) { var fr = (n.radius || 12) - 1.5, fc = cls; for (var k = 0; k < INLAY.forecourt_gems; k++) { var a = k * 2 * Math.PI / INLAY.forecourt_gems + Math.PI / 8; add({ kind: 'GEM', x: n.x + Math.cos(a) * fr, z: n.z + Math.sin(a) * fr, size: INLAY.gem_m, classId: fc || CLASS_IDS[k % 5], phase: k * 0.8, node: n.key }); } }
    if (shared || !cls) { for (var g = 0; g < 5; g++) { var b = Math.PI / 2 + g * 2 * Math.PI / 5; add({ kind: 'ROSETTE_GEM', x: n.x + Math.cos(b) * INLAY.rosette_r_m, z: n.z + Math.sin(b) * INLAY.rosette_r_m, size: INLAY.rosette_gem_m, classId: CLASS_IDS[g], phase: g * 1.3, node: n.key }); }
      add({ kind: 'RING', x: n.x, z: n.z, size: INLAY.rosette_r_m, classId: null, phase: 0, node: n.key }); }
    else add({ kind: 'NODE', x: n.x, z: n.z, size: INLAY.node_gem_m, classId: cls, phase: 0, node: n.key }); });
  /* road-edge insets: causeways and regional roads (never the narrow trails), alternating edges */
  (PW.list || []).forEach(function (P) { if (P.tier !== 'CAUSEWAY' && P.tier !== 'REGIONAL') return; var pts = P.pts || [], half = (W[P.tier] || 8) / 2 - INLAY.edge_inset_m, own = FAMILY_CLASS[P.family] || null, s0 = 0, idx = 0;
    for (var i = 1; i < pts.length; i++) { var ax = pts[i - 1][0], az = pts[i - 1][1], bx = pts[i][0], bz = pts[i][1], L = Math.hypot(bx - ax, bz - az); if (L < 1e-3) continue; var ux = (bx - ax) / L, uz = (bz - az) / L;
      for (var s = (INLAY.edge_step_m - (s0 % INLAY.edge_step_m)) % INLAY.edge_step_m; s <= L; s += INLAY.edge_step_m) { var x = ax + ux * s, z = az + uz * s, side = idx % 2 ? 1 : -1, gx = x - uz * half * side, gz = z + ux * half * side; idx++;
        if (nearNode(gx, gz, 1.5)) continue; var c;
        if (sharedAt(reg, gx, gz) || !own) c = CLASS_IDS[seq++ % 5];   /* shared ground: the five-class sequence */
        else if (idx % 5 === 0) { var others = CLASS_IDS.filter(function (k) { return k !== own; }); c = others[Math.floor(idx / 5) % 4]; }   /* every fifth: another class in turn */
        else c = own;   /* inside a district its class leads */
        add({ kind: 'GEM', x: gx, z: gz, size: INLAY.gem_m, classId: c, phase: (s0 + s) * 0.06, rot: Math.atan2(uz, ux), road: P.id }); }
      s0 += L; } });
  /* bridges: a five-class centreline along each deck */
  ((PW.links) || []).forEach(function (Lk) { var d = Lk.deck; if (!d || Lk.kind !== 'BRIDGE') return; var cx = (d.x1 + d.x2) / 2, n = 0;
    for (var z = d.z1 + 4; z <= d.z2 - 4 + 1e-6; z += INLAY.bridge_step_m) add({ kind: 'GEM', x: cx, z: z, size: INLAY.gem_m, classId: CLASS_IDS[n++ % 5], phase: z * 0.08, bridge: Lk.id }); });
  return { inlays: out, network: net, mixed_junctions: nodes.filter(function (n) { var f = {}; (n.styles || []).forEach(function (s) { f[s.family] = 1; }); return Object.keys(f).length > 1; }).map(function (n) { return n.key; }) }; }

var V = [
  'attribute vec4 iP; attribute vec4 iS; attribute vec4 iC;',   /* iP: x, y, z, rotation · iS: size, kind (0 gem, 1 node, 2 ring), pulse phase, - · iC: rgb, pearl flag */
  'varying vec2 vUv; varying vec4 vS; varying vec4 vC; varying float vD;',
  'void main() { float r = iS.x * (iS.y > 1.5 ? 1.12 : 1.6); vec2 q = position.xy * 2.0 * r; float c = cos(iP.w), s = sin(iP.w);',
  '  vec3 w = vec3(iP.x + q.x * c - q.y * s, iP.y, iP.z + q.x * s + q.y * c); vUv = position.xy * 2.0 * (iS.y > 1.5 ? 1.12 : 1.6); vS = iS; vC = iC; vD = length(cameraPosition - w);',
  '  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }'
].join('\n');
var F = [
  'uniform float uTime; uniform float uNight; uniform vec3 uPearl; uniform vec2 uFade;',
  'varying vec2 vUv; varying vec4 vS; varying vec4 vC; varying float vD;',
  'float hl(float d, float w) { float a = fwidth(d) * 1.2 + 1e-4; return 1.0 - smoothstep(w, w + a, abs(d)); }',
  'void main() { float far = 1.0 - smoothstep(uFade.x, uFade.y, vD); if (far < 0.002) discard; vec2 p = vUv; vec3 col = vec3(0.0); float a = 0.0;',
  '  float pulse = 0.82 + 0.18 * pow(0.5 + 0.5 * sin(uTime * 0.55 - vS.z), 6.0);',   /* a rare soft pulse, travelling along the road (phase = distance) */
  '  if (vS.y > 1.5) { float r = length(p); col = uPearl * hl(r - 1.0, 0.012) * 0.35; a = 0.0; }',   /* the rosette's pearl hairline */
  '  else { float dm = (abs(p.x) + abs(p.y)) * 0.70710678, core = 1.0 - smoothstep(0.5, 0.56, dm), sock = 1.0 - smoothstep(0.66, 0.72, dm);',   /* a square-diamond gem in a recessed socket */
  '    float facet = 0.78 + 0.22 * step(0.0, p.x * p.y) + 0.12 * (1.0 - dm * 1.6), halo = exp(-dm * dm * 3.0) * (1.0 - sock) * 0.5;',
  '    vec3 c = vC.w > 0.5 ? uPearl : vC.rgb; float k = mix(0.55, 1.25, uNight) * pulse * (vS.y > 0.5 ? 1.15 : 1.0);',
  '    col = c * (core * facet + halo) * k; a = (sock - core) * 0.55 + core * 0.2; col += vec3(0.02, 0.025, 0.03) * (sock - core); }',   /* the socket darkens the stone a touch: embedded, not taped on */
  '  col *= far; a *= far; col /= max(1.0, max(max(col.r, col.g), col.b)); if (a < 0.002 && max(max(col.r, col.g), col.b) < 0.003) discard; gl_FragColor = vec4(col, a); }'   /* premultiplied; hot light scaled, never clipped per channel */
].join('\n');

export function createHardscapeInlays(ctx) {
  var THREE = ctx.THREE, reg = ctx.registry || {}, log = ctx.log || function () { }, night = !!ctx.night, mesh = null, own = [], U = null, info = { inlays: 0, rosettes: 0, nodes: 0, edge_gems: 0, bridge_gems: 0, forecourt_gems: 0, mixed_junctions: 0, draw_calls: 0 };
  function tier() { try { return ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { return 'HIGH'; } }
  function build() { var L = hardscapeLayout(reg), list = L.inlays; if (tier() === 'LOW') list = list.filter(function (o, i) { return o.kind !== 'GEM' || !o.road || i % 2 === 0; });   /* phones: half the edge insets */
    var n = list.length; if (!n) { log('hardscape: no roads'); return; }
    var P = new Float32Array(n * 4), S = new Float32Array(n * 4), C = new Float32Array(n * 4);
    list.forEach(function (o, i) { var hex = o.classId ? CLASS_HEX[o.classId] : PEARL_HEX, kind = o.kind === 'RING' ? 2 : (o.kind === 'NODE' ? 1 : 0);
      P.set([o.x, o.y, o.z, o.rot || 0], i * 4); S.set([o.size, kind, o.phase || 0, 0], i * 4); C.set([((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255, o.classId ? 0 : 1], i * 4);
      if (o.kind === 'RING') info.rosettes++; else if (o.kind === 'ROSETTE_GEM') { } else if (o.kind === 'NODE') info.nodes++; else if (o.bridge) info.bridge_gems++; else if (o.road) info.edge_gems++; else if (o.kind === 'GEM') info.forecourt_gems++; });
    info.inlays = n; info.mixed_junctions = L.mixed_junctions.length;
    var g = new THREE.InstancedBufferGeometry(), pl = new THREE.PlaneGeometry(1, 1); g.index = pl.index; g.setAttribute('position', pl.attributes.position); g.setAttribute('iP', new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute('iS', new THREE.InstancedBufferAttribute(S, 4)); g.setAttribute('iC', new THREE.InstancedBufferAttribute(C, 4)); g.instanceCount = n; own.push(g, pl);
    U = { uTime: { value: 0 }, uNight: { value: night ? 1 : 0 }, uPearl: { value: new THREE.Vector3(((PEARL_HEX >> 16) & 255) / 255, ((PEARL_HEX >> 8) & 255) / 255, (PEARL_HEX & 255) / 255) }, uFade: { value: new THREE.Vector2(INLAY.fade_m[0], INLAY.fade_m[1]) } };
    var m = new THREE.ShaderMaterial({ vertexShader: V, fragmentShader: F, uniforms: U, transparent: true, depthWrite: false, depthTest: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, toneMapped: false }); own.push(m);   /* the XY quad laid on XZ is mirrored: draw both faces */
    mesh = new THREE.Mesh(g, m); mesh.name = 'HARDSCAPE_CLASS_INLAYS'; mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.userData.noMerge = true; mesh.userData.nonInteractable = true; ctx.group.add(mesh); info.draw_calls = 1;
    log('hardscape: ' + n + ' class-energy inlays (' + info.rosettes + ' five-class junction rosettes, ' + info.nodes + ' district nodes, ' + info.edge_gems + ' edge insets, ' + info.bridge_gems + ' bridge gems, ' + info.forecourt_gems + ' forecourt gems) in 1 draw'); }
  function tick(dt, t) { if (U) U.uTime.value = (typeof t === 'number' && isFinite(t)) ? t : U.uTime.value + (dt || 0); }
  function setNight(v) { night = !!v; if (U) U.uNight.value = night ? 1 : 0; }
  function dispose() { if (mesh && mesh.parent) mesh.parent.remove(mesh); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; mesh = null; }
  function debug() { return info; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug };
}
