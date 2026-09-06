/* MAHWORLD :: LIFE — the world is already living when the player arrives.

   On top of the residents the assembly places, this module runs ambient life:
   walkers on a path network between the MAHPLAZA marker, the three entrances,
   the benches and the corridor mouths; small conversation groups that form and
   dissolve; residents that ENTER a building at its door and reappear elsewhere
   later; and a lightweight scheduler that stages the world's occasional
   extraordinary moments — controlled GYMATTACK practice, a rooftop levitation
   drill, distant sparring, a dash along a bridge, a training silhouette behind
   a gym window, a projectile into a contained target, a group heading into MAH
   MATCH, a resident leaving MAH MARKET with something.

   Restraint is the point (brief §07–§11, §62–§63): at most three events at
   once, cooldowns per event, most of the plaza calm at any moment, spectacle
   pushed into the distance and into the training zones. Nothing here obstructs
   navigation and nothing repeats on a theme-park loop.

   Distance tiers keep it cheap: NEAR uses full residents, MID uses the residents
   module's `mid` detail tier, FAR uses its ≤ 60 triangle impostor. The species is
   identical at every tier (one continuous teardrop, a square-diamond head, no
   legs); only the triangle count changes. A local impostor is kept as a fallback
   for an older residents build. Every ambient resident keeps its OWN colour: the
   viewer's world theme never repaints a person.

   No timers: everything is driven from update(t, dt) so it pauses with the
   loop. No allocation in the hot path. */

import * as THREE from '../vendor/three/three.module.min.js';
import { createEffects } from './effects.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* the ambient population's colours: mostly cool, a few warm-side accents, never a rainbow */
const COMMON = ['blue', 'teal', 'violet', 'silver', 'platinum', 'blue', 'teal', 'silver'];
const ACCENT = ['green', 'emerald', 'red', 'crimson', 'purple'];

/* ---------------------------------------------------------------- impostor */
/* ≤ 60 triangles, ONE draw call: the species silhouette only — a continuous
   teardrop, a shoulder bar and a square-diamond head, flat shaded. */
const IMPOSTOR_GEO = { body: null };
function impostorGeometry() {
  if (IMPOSTOR_GEO.body) return IMPOSTOR_GEO.body;
  const pos = [];
  const ring = (y, r) => { const a = []; for (let i = 0; i < 5; i++) { const t = i / 5 * TAU; a.push([Math.cos(t) * r, y, Math.sin(t) * r * 0.8]); } return a; };
  const rings = [ring(0.0, 0.001), ring(0.30, 0.16), ring(0.62, 0.21), ring(0.92, 0.19), ring(1.12, 0.20), ring(1.30, 0.001)];
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    for (let j = 0; j < 5; j++) { const k = (j + 1) % 5; pos.push(...A[j], ...A[k], ...B[j], ...A[k], ...B[k], ...B[j]); }
  }
  /* the head: a flattened square diamond above the shoulders */
  const hy = 1.52, hw = 0.17, hh = 0.19, hd = 0.06;
  const P = [[0, hy + hh, 0], [hw, hy, 0], [0, hy - hh, 0], [-hw, hy, 0], [0, hy, hd], [0, hy, -hd]];
  const F = [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [1, 0, 5], [2, 1, 5], [3, 2, 5], [0, 3, 5]];
  F.forEach(f => f.forEach(i => pos.push(...P[i])));
  /* shoulder bar */
  const sb = [[-0.22, 1.24, -0.05], [0.22, 1.24, -0.05], [0.22, 1.34, 0.05], [-0.22, 1.34, 0.05]];
  pos.push(...sb[0], ...sb[1], ...sb[2], ...sb[0], ...sb[2], ...sb[3]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  IMPOSTOR_GEO.body = g;
  return g;
}
const IMPOSTOR_MATS = new Map();
function impostorMaterial(R, colour) {
  if (IMPOSTOR_MATS.has(colour)) return IMPOSTOR_MATS.get(colour);
  const pal = R.residentPalette ? R.residentPalette(colour) : { base: 0x2f6fe6 };
  const m = new THREE.MeshStandardMaterial({ color: pal.base, flatShading: true, roughness: 0.38, metalness: 0.25, emissive: pal.base, emissiveIntensity: 0.12 });
  m.name = 'life-impostor-' + colour;
  IMPOSTOR_MATS.set(colour, m);
  return m;
}
function makeImpostor(R, colour, height) {
  const mesh = new THREE.Mesh(impostorGeometry(), impostorMaterial(R, colour));
  const g = new THREE.Group();
  mesh.scale.setScalar((height || 1.9) / 1.9); mesh.position.y = 0.39;   /* hovering, on the plaza deck (ground.js FLOOR_TOP 0.17) */
  g.add(mesh); g.name = 'impostor:' + colour;
  g.userData = {
    colour, height: height || 1.9, hover: 0.22, impostor: true, spec: { colour },
    update(t) { mesh.position.y = 0.39 + Math.sin(t * 0.9 + (height || 1.9)) * 0.03; },
    setEnergy(e) { mesh.material.emissiveIntensity = 0.08 + 0.5 * clamp(e, 0, 1); },
    face(v) { g.rotation.y = Math.atan2(v.x - g.position.x, v.z - g.position.z); },
    setDrive() {}
  };
  return g;
}

/* ------------------------------------------------------------- path network */
function buildNodes(anchors) {
  const N = {};
  const put = (id, x, z, kind) => { N[id] = { id, x, z, kind: kind || 'plaza' }; return N[id]; };
  put('marker', 0, 14); put('centre', 0, 0);
  /* the three approach nodes are derived from the door anchors: a point 14 m back toward the plaza
     from each entrance, so the network follows the site plan instead of restating it */
  const approach = (id, fx, fz) => {
    const d = (anchors.doors || []).find(k => k.id === id);
    if (!d) return put(id + 'Approach', fx, fz);
    const L = Math.hypot(d.position.x, d.position.z) || 1;
    return put(id + 'Approach', d.position.x * (1 - 14 / L), d.position.z * (1 - 14 / L));
  };
  approach('gym', -30, -6); approach('match', 0, -44); approach('market', 32, -22);
  put('benchL', -19, 20); put('benchR', 19, 20);
  put('westWalk', -32, 12); put('eastWalk', 32, 12);
  put('corridorL', -44, 44, 'edge'); put('corridorR', 44, 44, 'edge');
  (anchors.doors || []).forEach(d => { const id = 'door-' + d.id; N[id] = { id, x: d.position.x, z: d.position.z, kind: 'door', door: d }; });
  const E = [
    ['marker', 'centre'], ['centre', 'gymApproach'], ['centre', 'matchApproach'], ['centre', 'marketApproach'],
    ['marker', 'benchL'], ['marker', 'benchR'], ['benchL', 'westWalk'], ['benchR', 'eastWalk'],
    ['westWalk', 'corridorL'], ['eastWalk', 'corridorR'], ['westWalk', 'gymApproach'], ['eastWalk', 'marketApproach'],
    ['gymApproach', 'door-gym'], ['matchApproach', 'door-match'], ['marketApproach', 'door-market'],
    ['benchL', 'centre'], ['benchR', 'centre']
  ].filter(([a, b]) => N[a] && N[b]);
  const adj = {};
  Object.keys(N).forEach(k => { adj[k] = []; });
  E.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  return { N, adj };
}

export function createLife(ctx, R, opts = {}) {
  const scene = ctx.scene, M = ctx.M;
  const anchors = opts.anchors || ctx.lifeAnchors || { paths: [], pads: [], doors: [], windows: [] };
  const camera = opts.camera;
  const rand = rng(opts.seed || 7);
  const budget = { near: opts.maxNear || 6, mid: opts.maxMid || 8, far: opts.maxFar || 10 };
  const group = new THREE.Group(); group.name = 'life'; scene.add(group);
  const { N, adj } = buildNodes(anchors);
  const nodeIds = Object.keys(N);
  const plazaNodes = nodeIds.filter(k => N[k].kind !== 'door');
  const log = [], stats = { near: 0, mid: 0, far: 0, walking: 0, activeEvents: 0, events: 0 };
  let daylight = 0, clockState = null;

  /* pooled MAHGIC effects: crystalline, restrained, capped, allocation-free */
  let FX = null;
  try { FX = createEffects(ctx); if (FX && FX.group && !FX.group.parent) scene.add(FX.group); } catch (e) { console.info('MAHPLAZA life: effects unavailable —', e && e.message); FX = null; }

  /* ---- agents -------------------------------------------------------- */
  /* the plaza is a laid chromium DECK (ground.js FLOOR_TOP / FIELD_RADIUS): anyone standing inside it
     stands 0.17 m higher than the raw ground plane the corridors and aprons run on */
  const DECK_Y = 0.17, DECK_R = 43;
  const deckY = (x, z) => (Math.hypot(x, z) < DECK_R ? DECK_Y : 0);
  const agents = [];
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _look = new THREE.Vector3();
  function spawnResident(colour, tier, spec) {
    const s = Object.assign({ colour, physique: 0.2 + rand() * 0.7, sex: rand() < 0.5 ? 'm' : 'f', pose: 'stand', seed: Math.floor(rand() * 1e6) }, spec || {});
    const height = 1.85 + rand() * 0.18;
    /* the residents module owns the species at every tier: prefer ITS impostor and ITS detail tiers, and
       fall back to the local copy below only if an older build of that module is loaded */
    if (tier === 'far') {
      if (typeof R.createImpostor === 'function') { try { return R.createImpostor({ colour, height, hover: 0.39 }); } catch (e) {} }
      return makeImpostor(R, colour, height);
    }
    try { return R.createResident(Object.assign({}, s, { height, lod: tier === 'mid' ? 'mid' : 'near' })); }
    catch (e) { return makeImpostor(R, colour, height); }
  }
  function addAgent(tier, x, z, colour) {
    const c = colour || (rand() < 0.72 ? COMMON[Math.floor(rand() * COMMON.length)] : ACCENT[Math.floor(rand() * ACCENT.length)]);
    const pose = tier === 'far' ? 'stand' : (rand() < 0.6 ? 'walk' : 'stand');
    const g = spawnResident(c, tier, { pose });
    const deck = deckY(x, z);
    g.position.set(x, deck, z);
    g.rotation.y = rand() * TAU;
    g.userData.role = 'ambient'; g.userData.id = g.userData.id || ('ambient-' + agents.length);
    group.add(g);
    const a = { g, tier, colour: c, state: 'idle', node: null, target: null, t0: 0, wait: 1 + rand() * 5, speed: 1.1 + rand() * 0.5, from: new THREE.Vector3(x, deck, z), to: new THREE.Vector3(x, deck, z), u: 0, dur: 1, busy: false, scale: 1 };
    agents.push(a); return a;
  }
  /* seed the population on the network */
  function seedPopulation() {
    for (let i = 0; i < budget.near; i++) { const n = N[plazaNodes[Math.floor(rand() * plazaNodes.length)]]; const a = addAgent('near', n.x + (rand() - 0.5) * 6, n.z + (rand() - 0.5) * 6); a.node = n.id; }
    for (let i = 0; i < budget.mid; i++) { const n = N[plazaNodes[Math.floor(rand() * plazaNodes.length)]]; const a = addAgent('mid', n.x + (rand() - 0.5) * 14, n.z + (rand() - 0.5) * 14); a.node = n.id; }
    /* far tier: along the corridors, the aprons, and the city walkway when it exists */
    const bridge = (anchors.paths || []).find(p => p.kind === 'bridge' && p.points && p.points.length > 1);
    for (let i = 0; i < budget.far; i++) {
      if (bridge && i % 3 === 0) { const p = bridge.points[Math.floor(rand() * bridge.points.length)]; const a = addAgent('far', p.x + (rand() - 0.5) * 8, p.z); a.g.position.y = p.y; a.fixedY = p.y; a.state = 'stroll'; a.axis = 'x'; a.range = 30; a.centre = p.x; a.dir = rand() < 0.5 ? -1 : 1; }
      else { const side = rand() < 0.5 ? -1 : 1; const a = addAgent('far', side * (38 + rand() * 10), -20 + rand() * 80); a.state = 'stroll'; a.axis = 'z'; a.range = 34; a.centre = a.g.position.z; a.dir = rand() < 0.5 ? -1 : 1; }
    }
    stats.near = budget.near; stats.mid = budget.mid; stats.far = budget.far;
  }
  seedPopulation();

  /* ---- walking ------------------------------------------------------- */
  function pickNext(a) {
    const here = a.node && adj[a.node] ? a.node : plazaNodes[Math.floor(rand() * plazaNodes.length)];
    const options = adj[here] && adj[here].length ? adj[here] : plazaNodes;
    const next = options[Math.floor(rand() * options.length)];
    const n = N[next];
    a.from.copy(a.g.position);
    /* stop 3 m short of a door and enter there */
    if (n.kind === 'door') { const dx = n.x - a.from.x, dz = n.z - a.from.z, d = Math.hypot(dx, dz) || 1; const tx = n.x - dx / d * 3, tz = n.z - dz / d * 3; a.to.set(tx, deckY(tx, tz), tz); a.entering = next; }
    else { const tx = n.x + (rand() - 0.5) * 4, tz = n.z + (rand() - 0.5) * 4; a.to.set(tx, deckY(tx, tz), tz); a.entering = null; }
    a.node = next;
    const dist = a.from.distanceTo(a.to);
    a.dur = Math.max(0.6, dist / a.speed); a.u = 0; a.state = 'walk';
    if (a.g.userData.parts && a.tier !== 'far') { try { a.g.userData.spec.pose = 'walk'; } catch (e) {} }
  }
  function stepWalker(a, t, dt) {
    if (a.busy) return;
    if (a.state === 'idle') { a.wait -= dt; if (a.wait <= 0) pickNext(a); return; }
    if (a.state === 'enter') {
      a.scale = Math.max(0, a.scale - dt * 1.6); a.g.scale.setScalar(a.scale);
      if (a.scale <= 0.01) { a.g.visible = false; a.state = 'inside'; a.wait = 14 + rand() * 40; }
      return;
    }
    if (a.state === 'inside') {
      a.wait -= dt;
      if (a.wait <= 0) { const n = N[plazaNodes[Math.floor(rand() * plazaNodes.length)]]; a.g.position.set(n.x + (rand() - 0.5) * 5, 0, n.z + (rand() - 0.5) * 5); a.node = n.id; a.g.visible = true; a.scale = 0.01; a.state = 'appear'; }
      return;
    }
    if (a.state === 'appear') { a.scale = Math.min(1, a.scale + dt * 1.4); a.g.scale.setScalar(a.scale); if (a.scale >= 1) { a.state = 'idle'; a.wait = 1 + rand() * 3; } return; }
    if (a.state === 'stroll') {
      const p = a.g.position, axis = a.axis;
      p[axis] += a.dir * dt * (0.7 + a.speed * 0.3);
      if (Math.abs(p[axis] - a.centre) > a.range) a.dir *= -1;
      a.g.rotation.y = axis === 'x' ? (a.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (a.dir > 0 ? 0 : Math.PI);
      return;
    }
    /* walk */
    a.u += dt / a.dur;
    const k = clamp(a.u, 0, 1), e = k < 0.15 ? k * k / 0.045 : k > 0.85 ? 1 - (1 - k) * (1 - k) / 0.045 : (k - 0.075) / 0.85;
    a.g.position.lerpVectors(a.from, a.to, clamp(e, 0, 1));
    _look.subVectors(a.to, a.from);
    if (_look.lengthSq() > 1e-4) { const want = Math.atan2(_look.x, _look.z); let d = want - a.g.rotation.y; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; a.g.rotation.y += d * Math.min(1, dt * 4); }
    if (a.u >= 1) {
      if (a.entering) { a.state = 'enter'; log.push({ t: Math.round(t), name: 'enters ' + a.entering.replace('door-', ''), where: [a.g.position.x, 0, a.g.position.z] }); }
      else { a.state = 'idle'; a.wait = 2 + rand() * 7; }
    }
  }

  /* ---- conversation groups ------------------------------------------ */
  const groups = [];
  function formGroup(t) {
    const free = agents.filter(a => a.tier !== 'far' && !a.busy && (a.state === 'idle' || a.state === 'walk'));
    if (free.length < 2) return false;
    const a = free[Math.floor(rand() * free.length)];
    const b = free.filter(x => x !== a).sort((x, y) => x.g.position.distanceTo(a.g.position) - y.g.position.distanceTo(a.g.position))[0];
    if (!b || b.g.position.distanceTo(a.g.position) > 22) return false;
    const cx = (a.g.position.x + b.g.position.x) / 2, cz = (a.g.position.z + b.g.position.z) / 2;
    [a, b].forEach((m, i) => { m.busy = true; m.state = 'walk'; m.from.copy(m.g.position); m.to.set(cx + (i ? 1 : -1) * 0.9, deckY(cx, cz), cz + (i ? 0.5 : -0.5)); m.dur = Math.max(0.8, m.from.distanceTo(m.to) / m.speed); m.u = 0; m.entering = null; });
    groups.push({ members: [a, b], until: t + 16 + rand() * 26, settled: false, cx, cz });
    log.push({ t: Math.round(t), name: 'conversation', where: [cx, 0, cz] });
    return true;
  }
  function stepGroups(t, dt) {
    for (let i = groups.length - 1; i >= 0; i--) {
      const G = groups[i];
      if (!G.settled) {
        let done = true;
        G.members.forEach(m => { m.busy = false; stepWalker(m, t, dt); m.busy = true; if (m.state === 'walk') done = false; });
        if (done) { G.settled = true; G.members.forEach((m, k) => { const o = G.members[1 - k]; _v.copy(o.g.position); if (m.g.userData.face) m.g.userData.face(_v); }); }
      }
      if (t > G.until) { G.members.forEach(m => { m.busy = false; m.state = 'idle'; m.wait = 0.5 + rand() * 2; }); groups.splice(i, 1); }
    }
  }

  /* ---- events (brief §10) -------------------------------------------- */
  const pads = (anchors.pads || []).slice();
  const bridgePaths = (anchors.paths || []).filter(p => p.kind === 'bridge' && p.points && p.points.length > 1);
  const windows = (anchors.windows || []).slice();
  const active = [];
  const colourOf = a => a.colour || 'blue';
  const hexOf = c => (R.residentPalette ? R.residentPalette(c).base : 0x7fc6ff);

  function takeAgents(n, tier) {
    const free = agents.filter(a => !a.busy && a.tier === tier && (a.state === 'idle' || a.state === 'walk' || a.state === 'stroll'));
    if (free.length < n) return null;
    const picked = [];
    for (let i = 0; i < n; i++) { const k = Math.floor(rand() * free.length); picked.push(free.splice(k, 1)[0]); }
    picked.forEach(a => { a.busy = true; a.prevState = a.state; });
    return picked;
  }
  function release(list) { list.forEach(a => { a.busy = false; a.state = a.prevState === 'stroll' ? 'stroll' : 'idle'; a.wait = 1 + rand() * 4; if (a.g.userData.setDrive) a.g.userData.setDrive(null); }); }

  const EVENTS = [
    { id: 'A', name: 'training strike', cooldown: 52, weight: 3, run: (t) => {
        const pad = pads.length ? pads[Math.floor(rand() * pads.length)] : null;
        const who = takeAgents(1, pad ? 'far' : 'mid'); if (!who) return null;
        const a = who[0]; const p = pad ? pad.position : _v.set(a.g.position.x, 0, a.g.position.z);
        a.g.position.set(p.x, p.y || 0, p.z); a.g.rotation.y = Math.atan2(-p.x, -p.z);
        return { who, phase: 0, t0: t, dur: 3.4, pos: p.clone ? p.clone() : new THREE.Vector3(p.x, p.y, p.z), colour: colourOf(a),
          step(t2) { const k = (t2 - this.t0) / this.dur, d = a.g.userData.setDrive;
            if (d) { if (k < 0.32) d({ fwdR: 0.35 * (k / 0.32), lean: -0.08 * (k / 0.32), yaw: 0.18 * (k / 0.32) }); else if (k < 0.44) d({ fwdR: 0.9, elbowR: -1.5, lean: 0.2, yaw: -0.3 }); else if (k < 0.72) d({ fwdR: 0.6, elbowR: -0.9, lean: 0.1 }); else d(null); }
            if (this.phase === 0 && k >= 0.44) { this.phase = 1; if (FX) { FX.wave(this.pos, hexOf(this.colour), 2.0, 0.75); FX.pulse(this.pos, hexOf(this.colour), 0.5, 0.3); } } } }; } },
    { id: 'B', name: 'levitation drill', cooldown: 64, weight: 2, run: (t) => {
        const pad = pads.filter(p => p.kind === 'levitate').concat(pads)[0]; if (!pad) return null;
        const who = takeAgents(1, 'far'); if (!who) return null;
        const a = who[0]; a.g.position.set(pad.position.x, pad.position.y, pad.position.z);
        return { who, t0: t, dur: 5.6, base: pad.position.y, colour: colourOf(a),
          step(t2) { const k = (t2 - this.t0) / this.dur; const rise = k < 0.28 ? k / 0.28 : k < 0.72 ? 1 : Math.max(0, 1 - (k - 0.72) / 0.28); a.g.position.y = this.base + rise * 1.9; if (FX && k > 0.2 && k < 0.85) FX.levitationTrail(a.g, hexOf(this.colour), true); },
          end() { a.g.position.y = this.base; if (FX) FX.levitationTrail(a.g, hexOf(this.colour), false); } }; } },
    { id: 'C', name: 'distant sparring', cooldown: 58, weight: 3, run: (t) => {
        const who = takeAgents(2, 'far') || takeAgents(2, 'mid'); if (!who) return null;
        const pad = pads.length ? pads[Math.floor(rand() * pads.length)] : null;
        const c = pad ? pad.position : new THREE.Vector3(who[0].g.position.x, 0, who[0].g.position.z);
        who[0].g.position.set(c.x - 1.1, c.y || 0, c.z); who[1].g.position.set(c.x + 1.1, c.y || 0, c.z);
        who[0].g.rotation.y = Math.PI / 2; who[1].g.rotation.y = -Math.PI / 2;
        return { who, t0: t, dur: 9, pos: c, colour: colourOf(who[0]),
          step(t2) { const k = (t2 - this.t0), beat = k % 2.2;
            const dA = who[0].g.userData.setDrive, dB = who[1].g.userData.setDrive;
            if (dA && dB) { if (beat < 0.35) { dA({ fwdR: 0.85, elbowR: -1.4, lean: 0.16 }); dB({ fwdL: 0.7, fwdR: 0.7, lean: -0.08 }); } else if (beat < 1.1) { dA({ fwdR: 0.3, elbowR: -0.6 }); dB({ fwdL: 0.5, fwdR: 0.5, side: -0.25 }); } else if (beat < 1.5) { dB({ fwdL: 0.9, elbowL: -1.3, lean: 0.16 }); dA({ fwdL: 0.6, fwdR: 0.6, lean: -0.06 }); } else { dA({}); dB({}); } }
            if (FX && beat > 0.32 && beat < 0.38) FX.impact(this.pos, hexOf(this.colour), 0.3); } }; } },
    { id: 'D', name: 'bridge dash', cooldown: 46, weight: 2, run: (t) => {
        const path = bridgePaths.length ? bridgePaths[Math.floor(rand() * bridgePaths.length)] : null; if (!path) return null;
        const who = takeAgents(1, 'far'); if (!who) return null;
        const a = who[0], p0 = path.points[0], p1 = path.points[path.points.length - 1];
        const fwd = rand() < 0.5;
        a.g.position.copy(fwd ? p0 : p1); a.g.rotation.y = Math.atan2((fwd ? p1.x - p0.x : p0.x - p1.x), (fwd ? p1.z - p0.z : p0.z - p1.z));
        return { who, t0: t, dur: 3.2, from: (fwd ? p0 : p1).clone(), to: (fwd ? p1 : p0).clone(), colour: colourOf(a), streaked: false,
          step(t2) { const k = clamp((t2 - this.t0) / this.dur, 0, 1); a.g.position.lerpVectors(this.from, this.to, k * k * (3 - 2 * k));
            if (FX && !this.streaked && k > 0.15) { this.streaked = true; FX.streak(this.from, this.to, hexOf(this.colour), 0.6); } } }; } },
    { id: 'E', name: 'gym window silhouette', cooldown: 70, weight: 2, run: (t) => {
        if (!windows.length) return null;
        const w = windows[Math.floor(rand() * windows.length)];
        const who = takeAgents(1, 'far'); if (!who) return null;
        const a = who[0]; a.g.position.copy(w.position); a.g.rotation.y = Math.atan2(w.normal.x, w.normal.z) + Math.PI;
        return { who, t0: t, dur: 7, base: w.position.clone(), across: new THREE.Vector3(-w.normal.z, 0, w.normal.x),
          step(t2) { const k = (t2 - this.t0) / this.dur; a.g.position.copy(this.base).addScaledVector(this.across, Math.sin(k * Math.PI * 2) * 1.6); } }; } },
    { id: 'F', name: 'projectile practice', cooldown: 74, weight: 2, run: (t) => {
        const pad = pads.filter(p => p.kind === 'training').concat(pads)[0]; if (!pad || !FX) return null;
        const who = takeAgents(1, 'far'); if (!who) return null;
        const a = who[0]; const from = pad.position.clone(); a.g.position.copy(from); a.g.rotation.y = Math.atan2(-from.x, -from.z);
        const to = from.clone().add(new THREE.Vector3(Math.sin(a.g.rotation.y), 0.3, Math.cos(a.g.rotation.y)).multiplyScalar(9));
        return { who, t0: t, dur: 2.6, from: from.clone().setY(from.y + 1.2), to, colour: colourOf(a), fired: false, hit: false,
          step(t2) { const k = (t2 - this.t0) / this.dur; const d = a.g.userData.setDrive; if (d) { if (k < 0.3) d({ fwdR: 0.4 * (k / 0.3), lean: -0.06 }); else if (k < 0.42) d({ fwdR: 0.95, elbowR: -1.5, lean: 0.18 }); else d(null); }
            if (!this.fired && k >= 0.4) { this.fired = true; FX.streak(this.from, this.to, hexOf(this.colour), 0.5); }
            if (!this.hit && k >= 0.62) { this.hit = true; FX.impact(this.to, hexOf(this.colour), 0.45); } } }; } },
    { id: 'G', name: 'group enters MAH MATCH', cooldown: 88, weight: 2, run: (t) => {
        const door = (anchors.doors || []).find(d => d.id === 'match'); if (!door) return null;
        const who = takeAgents(2, 'mid') || takeAgents(2, 'near'); if (!who) return null;
        who.forEach((a, i) => { a.state = 'walk'; a.from.copy(a.g.position); a.to.set(door.position.x + (i ? 1.6 : -1.6), 0, door.position.z + 5); a.dur = Math.max(2, a.from.distanceTo(a.to) / a.speed); a.u = 0; a.entering = null; });
        return { who, t0: t, dur: 12, group: true,
          step(t2, dt2) { who.forEach(a => { a.busy = false; stepWalker(a, t2, dt2); a.busy = true; }); } }; } },
    { id: 'H', name: 'leaves MAH MARKET', cooldown: 66, weight: 2, run: (t) => {
        const door = (anchors.doors || []).find(d => d.id === 'market'); if (!door) return null;
        const who = takeAgents(1, 'mid') || takeAgents(1, 'near'); if (!who) return null;
        const a = who[0];
        a.g.position.set(door.position.x, 0, door.position.z + 2.5);
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.24), M.composite || M.graphiteLight);
        box.position.set(0.32, 1.15, 0.22); a.g.add(box);
        a.state = 'walk'; a.from.copy(a.g.position); a.to.set(door.position.x * 0.4, 0, 8 + rand() * 8); a.dur = Math.max(4, a.from.distanceTo(a.to) / a.speed); a.u = 0; a.entering = null;
        return { who, t0: t, dur: a.dur + 1, box,
          step(t2, dt2) { a.busy = false; stepWalker(a, t2, dt2); a.busy = true; },
          end() { a.g.remove(box); box.geometry.dispose(); } }; } }
  ];

  /* ================= FLIGHT AND FLIGHT-LEARNING (v6 §28-§32) ======================================
     MAHBEINGS levitate; not all of them fly, and the ones who are learning are the point. The states
     the brief names — FLIGHT_READY, LIFT_ATTEMPT, WOBBLE, SUCCESSFUL_HOVER, DESCEND, FAILED_ATTEMPT,
     SHORT_FLIGHT — are built here as one shared arc driven by a skill level, so a beginner and an
     advanced resident run the same code and differ only in how far they get and how cleanly.

     Restraint is the whole design (§31): these sit alongside the eight existing ambient events under
     the SAME three-at-once cap and the same cooldowns, so most of the plaza is still calm and flight
     stays special. They happen in LOGICAL PLACES (§32) — the rooftop pads the city module publishes
     and one ground training zone off the west side of the plaza — never through the pedestrian routes.

     A failed attempt is charming, not slapstick (§29): a small lift, a tilt the resident corrects, and
     a controlled settle. Nobody falls over.                                                          */
  const FLIGHT_GROUND = { x: -46, z: 22 };          /* west of the plaza, clear of every route and node */
  const SKILL = {
    beginner:     { rise: 0.85, hold: 0.10, wobble: 0.15, dur: 5.2, trail: false },
    intermediate: { rise: 1.75, hold: 0.34, wobble: 0.05, dur: 6.4, trail: true },
    advanced:     { rise: 3.10, hold: 0.52, wobble: 0.015, dur: 7.8, trail: true }
  };
  /* where a flight event can happen: every rooftop pad, plus the ground training zone */
  function flightSpot() {
    const roof = pads.filter(p => p.kind === 'levitate' || p.kind === 'training');
    if (roof.length && rand() < 0.62) { const p = roof[Math.floor(rand() * roof.length)].position; return { x: p.x, y: p.y, z: p.z, tier: 'far' }; }
    return { x: FLIGHT_GROUND.x + (rand() - 0.5) * 7, y: deckY(FLIGHT_GROUND.x, FLIGHT_GROUND.z), z: FLIGHT_GROUND.z + (rand() - 0.5) * 7, tier: 'mid' };
  }
  /* ONE arc, five phases, parameterised by skill. `fail` turns the hold into a corrected imbalance. */
  function flightArc(a, spot, skill, fail, t, seedPhase) {
    const S = SKILL[skill];
    const base = spot.y || 0;
    a.g.position.set(spot.x, base, spot.z);
    a.g.rotation.y = Math.atan2(-spot.x, -spot.z);
    return {
      t0: t, dur: S.dur, base, skill, fail,
      step(t2) {
        const k = Math.min(1, (t2 - this.t0) / this.dur);
        /* FLIGHT_READY 0..0.16 — the resident settles and gathers before it tries */
        /* LIFT_ATTEMPT 0.16..0.40 — a rise eased so the effort reads */
        /* SUCCESSFUL_HOVER / FAILED_ATTEMPT 0.40..0.72 — hold, or lose it and correct */
        /* DESCEND 0.72..1 — always controlled; nobody drops */
        let h = 0;
        if (k < 0.16) h = 0;
        else if (k < 0.40) { const u = (k - 0.16) / 0.24; h = S.rise * u * u * (3 - 2 * u); }
        else if (k < 0.72) {
          const u = (k - 0.40) / 0.32;
          h = this.fail ? S.rise * Math.max(0, 1 - u * 1.35) : S.rise * (1 + S.hold * 0.08 * Math.sin(u * 5.4 + seedPhase));
        } else { const u = (k - 0.72) / 0.28; h = (this.fail ? 0 : S.rise) * (1 - u * u); }
        a.g.position.y = base + h;
        /* WOBBLE — a lateral correction, largest for a beginner and largest at the moment of losing it */
        const w = S.wobble * (k > 0.16 && k < 0.86 ? 1 : 0) * (this.fail && k > 0.40 && k < 0.62 ? 2.1 : 1);
        a.g.rotation.z = Math.sin(t2 * 3.1 + seedPhase) * w;
        a.g.position.x = spot.x + Math.sin(t2 * 2.3 + seedPhase) * w * 0.5;
        if (FX && S.trail && !this.fail && k > 0.3 && k < 0.8) FX.levitationTrail(a.g, hexOf(colourOf(a)), true);
      },
      end() { a.g.position.set(spot.x, base, spot.z); a.g.rotation.z = 0; if (FX && S.trail) FX.levitationTrail(a.g, hexOf(colourOf(a)), false); }
    };
  }

  const FLIGHT_EVENTS = [
    { id: 'F1', name: 'hover attempt', cooldown: 46, weight: 4, run: (t) => {
        const spot = flightSpot(); const who = takeAgents(1, spot.tier) || takeAgents(1, 'mid'); if (!who) return null;
        const arc = flightArc(who[0], spot, 'beginner', false, t, rand() * 6.283);
        return Object.assign({ who, pos: new THREE.Vector3(spot.x, spot.y, spot.z), colour: colourOf(who[0]) }, arc); } },
    { id: 'F2', name: 'steady hover', cooldown: 62, weight: 3, run: (t) => {
        const spot = flightSpot(); const who = takeAgents(1, spot.tier) || takeAgents(1, 'mid'); if (!who) return null;
        const arc = flightArc(who[0], spot, 'intermediate', false, t, rand() * 6.283);
        return Object.assign({ who, pos: new THREE.Vector3(spot.x, spot.y, spot.z), colour: colourOf(who[0]) }, arc); } },
    { id: 'F3', name: 'failed attempt', cooldown: 78, weight: 2, run: (t) => {
        const spot = flightSpot(); const who = takeAgents(1, spot.tier) || takeAgents(1, 'mid'); if (!who) return null;
        const arc = flightArc(who[0], spot, 'beginner', true, t, rand() * 6.283);
        return Object.assign({ who, pos: new THREE.Vector3(spot.x, spot.y, spot.z), colour: colourOf(who[0]) }, arc); } },
    /* SHORT FLIGHT — an advanced resident actually travels: pad to pad, high and smooth, far enough
       away that it reads as someone who can already do this rather than as traffic (§30, §31) */
    { id: 'F4', name: 'short flight', cooldown: 104, weight: 2, run: (t) => {
        const roof = pads.filter(p => p.kind === 'levitate' || p.kind === 'training');
        if (roof.length < 2) return null;
        const i = Math.floor(rand() * roof.length); let j = Math.floor(rand() * roof.length); if (j === i) j = (j + 1) % roof.length;
        const from = roof[i].position, to = roof[j].position;
        const who = takeAgents(1, 'far'); if (!who) return null;
        const a = who[0]; a.g.position.copy(from);
        a.g.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
        return { who, t0: t, dur: 9.5, colour: colourOf(a), pos: from.clone(),
          step(t2) {
            const k = Math.min(1, (t2 - this.t0) / this.dur), e = k * k * (3 - 2 * k);
            a.g.position.lerpVectors(from, to, e);
            a.g.position.y += Math.sin(Math.PI * k) * 13;          /* a real arc, well above the roofs */
            if (FX && k > 0.06 && k < 0.94) FX.levitationTrail(a.g, hexOf(this.colour), true);
          },
          end() { a.g.position.copy(to); if (FX) FX.levitationTrail(a.g, hexOf(this.colour), false); } }; } },
    /* THE LESSON — one resident who can already hold a hover, two who are still learning beside it.
       This is the event that makes the world's progression legible without a word of copy (§34). */
    { id: 'F5', name: 'flight lesson', cooldown: 132, weight: 1, run: (t) => {
        const spot = flightSpot(); const who = takeAgents(3, spot.tier) || takeAgents(3, 'mid'); if (!who) return null;
        const arcs = [
          flightArc(who[0], { x: spot.x, y: spot.y, z: spot.z, tier: spot.tier }, 'advanced', false, t, 0.4),
          flightArc(who[1], { x: spot.x - 3.4, y: spot.y, z: spot.z + 1.2, tier: spot.tier }, 'beginner', false, t, 2.1),
          flightArc(who[2], { x: spot.x + 3.2, y: spot.y, z: spot.z + 1.5, tier: spot.tier }, 'beginner', rand() < 0.5, t, 4.7)
        ];
        return { who, t0: t, dur: 8.6, colour: colourOf(who[0]), pos: new THREE.Vector3(spot.x, spot.y, spot.z),
          step(t2) { arcs.forEach(A => A.step(t2)); },
          end() { arcs.forEach(A => A.end()); } }; } }
  ];
  FLIGHT_EVENTS.forEach(e => EVENTS.push(e));

  const cooldowns = {}; EVENTS.forEach(e => { cooldowns[e.id] = 6 + rand() * 30; });

  function tryStartEvent(t) {
    if (active.length >= 3) return;
    const ready = EVENTS.filter(e => cooldowns[e.id] <= 0);
    stats.ready = ready.length;
    if (!ready.length) return;
    stats.attempts = (stats.attempts || 0) + 1;
    let total = 0; ready.forEach(e => { total += e.weight; });
    let pick = rand() * total, chosen = ready[0];
    for (const e of ready) { pick -= e.weight; if (pick <= 0) { chosen = e; break; } }
    let inst = null;
    try { inst = chosen.run(t); } catch (err) { inst = null; stats.lastError = chosen.id + ': ' + (err && err.message); }
    cooldowns[chosen.id] = chosen.cooldown * (0.75 + rand() * 0.6) * (inst ? 1 : 0.25);   /* a failed stage retries sooner */
    if (!inst) { stats.lastFail = chosen.id; return; }
    inst.id = chosen.id; inst.name = chosen.name; inst.t0 = inst.t0 || t; inst.dur = inst.dur || 4;
    active.push(inst); stats.events++;
    const p = inst.pos || (inst.who && inst.who[0] ? inst.who[0].g.position : null);
    log.push({ t: Math.round(t), id: chosen.id, name: chosen.name, where: p ? [p.x, p.y || 0, p.z] : null });
    if (log.length > 40) log.splice(0, log.length - 40);
  }

  /* ---- tiers ---------------------------------------------------------- */
  let tierClock = 0;
  function retier(dt) {
    tierClock -= dt; if (tierClock > 0 || !camera) return; tierClock = 1.5;
    for (const a of agents) {
      if (a.busy || a.state === 'inside' || a.tier === 'far') continue;
      const d = camera.position.distanceTo(a.g.position);
      const want = d < 34 ? 'near' : 'mid';
      if (want !== a.tier && d > 20) a.tier = want;   /* the record follows the camera; the model is only rebuilt when a LOD API exists */
      if (want !== a.tier && R.setLOD) { try { R.setLOD(a.g, want); a.tier = want; } catch (e) {} }
    }
    stats.near = agents.filter(a => a.tier === 'near').length;
    stats.mid = agents.filter(a => a.tier === 'mid').length;
    stats.far = agents.filter(a => a.tier === 'far').length;
  }

  /* ---- frame ---------------------------------------------------------- */
  let groupTimer = 12 + rand() * 20;
  function update(t, dt) {
    dt = Math.min(dt || 0.016, 0.05);
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (a.g.userData.update) a.g.userData.update(t, dt);
      stepWalker(a, t, dt);
    }
    stepGroups(t, dt);
    groupTimer -= dt; if (groupTimer <= 0) { groupTimer = 26 + rand() * 40; formGroup(t); }
    for (const id in cooldowns) cooldowns[id] -= dt;
    tryStartEvent(t);
    for (let i = active.length - 1; i >= 0; i--) {
      const e = active[i];
      try { if (e.step) e.step(t, dt); } catch (err) {}
      if (t - e.t0 > e.dur) { try { if (e.end) e.end(); } catch (err) {} release(e.who || []); active.splice(i, 1); }
    }
    stats.activeEvents = active.length;
    stats.walking = agents.reduce((n, a) => n + (a.state === 'walk' || a.state === 'stroll' ? 1 : 0), 0);
    if (FX) FX.update(t, dt);
    retier(dt);
  }
  function setTime(s) {
    clockState = s || clockState; daylight = clockState ? clockState.daylight : 0;
    const e = 1 - daylight;
    for (const a of agents) if (a.g.userData.setEnergy) a.g.userData.setEnergy(e);
    return clockState;
  }
  function setTheme() { /* residents and their MAHGIC keep their own colours; the world theme never repaints a person */ }
  function setBudget(b) { if (b) { budget.near = b.near; budget.mid = b.mid; budget.far = b.far; } return budget; }
  function dispose() {
    active.length = 0;
    agents.forEach(a => { group.remove(a.g); a.g.traverse(o => { if (o.isMesh && o.geometry && o.geometry !== IMPOSTOR_GEO.body) o.geometry.dispose(); }); });
    agents.length = 0;
    if (group.parent) group.parent.remove(group);
    if (FX && FX.dispose) FX.dispose();
  }
  setTime(ctx.clock && ctx.clock.state ? ctx.clock.state() : null);

  return { group, update, setTime, setTheme, setBudget, dispose, residents: agents.map(a => a.g), stats, log, effects: FX };
}
