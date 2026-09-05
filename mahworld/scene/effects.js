/* MAHWORLD :: EFFECTS — pooled MAHGIC effects in the crystalline vocabulary.

   Six preallocated slots; every effect is one slot for a bounded time and
   everything is reused (no geometry, material, vector or object is created
   after construction). Additive but restrained: opacity never above 0.6,
   nothing wider than 3 m, no particle fountains, no screen-covering bloom.

   Vocabulary
     wave(position, colour, radius, duration)    thin expanding ring on the ground
     pulse(position, colour, intensity, duration) brief soft light pulse (one sprite)
     arc(from, to, colour, duration)              a short tube along a slight upward curve
     streak(from, to, colour, duration)           a stretched thin box travelling from → to
     impact(position, colour, duration)           small octahedron flash + a small ring
     levitationTrail(target, colour, active)      three faint diamond sprites lagging under a target

   Colour is ALWAYS the acting resident's colour (a hex number, e.g.
   R.residentPalette(name).base). The viewer's world theme never reaches an
   effect; setTheme exists for the contract and deliberately does nothing. */

import * as THREE from '../vendor/three/three.module.min.js';
import { canvasTexture } from './materials.js';

const MAX = 6;
const KIND = { NONE: 0, WAVE: 1, PULSE: 2, ARC: 3, STREAK: 4, IMPACT: 5, TRAIL: 6 };
const MAX_SIZE = 3, MAX_OPACITY = 0.6;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOut = k => 1 - (1 - k) * (1 - k);

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();

function additive(extra) {
  return new THREE.MeshBasicMaterial(Object.assign({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }, extra || {}));
}

export function createEffects(ctx) {
  const scene = ctx.scene;
  const group = new THREE.Group(); group.name = 'effects'; scene.add(group);

  /* ---- shared textures and geometries ---------------------------------- */
  const softTex = canvasTexture(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const diamondTex = canvasTexture(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.save(); c.translate(w / 2, h / 2); c.rotate(Math.PI / 4); const g = c.createLinearGradient(-14, -14, 14, 14); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0.55)'); c.fillStyle = g; c.fillRect(-14, -14, 28, 28); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.strokeRect(-14, -14, 28, 28); c.restore(); });
  const ringGeo = new THREE.RingGeometry(0.84, 1.0, 40, 1); ringGeo.rotateX(-Math.PI / 2);
  const smallRingGeo = new THREE.RingGeometry(0.7, 1.0, 24, 1); smallRingGeo.rotateX(-Math.PI / 2);
  const arcCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.16, 0.5), new THREE.Vector3(0, 0, 1));
  const tubeGeo = new THREE.TubeGeometry(arcCurve, 10, 0.035, 5, false);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1); boxGeo.translate(0, 0, 0.5);
  const octaGeo = new THREE.OctahedronGeometry(1, 0);

  /* ---- slots -------------------------------------------------------------- */
  const slots = [];
  for (let i = 0; i < MAX; i++) {
    const s = {
      kind: KIND.NONE, t0: 0, dur: 1, active: false, target: null, colour: 0xffffff,
      from: new THREE.Vector3(), to: new THREE.Vector3(), radius: 1, intensity: 1, len: 1,
      ring: new THREE.Mesh(ringGeo, additive()), ring2: new THREE.Mesh(smallRingGeo, additive()),
      tube: new THREE.Mesh(tubeGeo, additive()), box: new THREE.Mesh(boxGeo, additive()), octa: new THREE.Mesh(octaGeo, additive()),
      sprite: new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })),
      trail: [0, 1, 2].map(() => new THREE.Sprite(new THREE.SpriteMaterial({ map: diamondTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))),
      trailPos: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
    };
    s.parts = [s.ring, s.ring2, s.tube, s.box, s.octa, s.sprite, s.trail[0], s.trail[1], s.trail[2]];
    for (const p of s.parts) { p.visible = false; p.renderOrder = 30; p.frustumCulled = true; group.add(p); }
    slots.push(s);
  }
  const stats = { active: 0 };
  let now = 0;

  function hide(s) { for (const p of s.parts) { p.visible = false; p.material.opacity = 0; } s.active = false; s.kind = KIND.NONE; s.target = null; }
  function acquire() {
    for (const s of slots) if (!s.active) return s;
    /* all busy: steal the oldest non-trail effect (trails are persistent and owned by their target) */
    let best = null;
    for (const s of slots) if (s.kind !== KIND.TRAIL && (!best || s.t0 < best.t0)) best = s;
    if (best) { hide(best); return best; }
    return null;
  }
  function paint(s, colour) { s.colour = colour; for (const p of s.parts) p.material.color.setHex(colour); }
  function begin(s, kind, colour, duration) { s.kind = kind; s.active = true; s.t0 = now; s.dur = Math.max(0.05, duration || 0.5); paint(s, colour); }

  /* ---- the vocabulary ------------------------------------------------------ */
  function wave(position, colour, radius = 1.5, duration = 0.7) {
    const s = acquire(); if (!s) return -1;
    begin(s, KIND.WAVE, colour, duration);
    s.radius = Math.min(MAX_SIZE, Math.max(0.3, radius));
    s.from.copy(position); s.from.y += 0.05;
    s.ring.position.copy(s.from); s.ring.scale.set(0.2, 1, 0.2); s.ring.visible = true;
    return slots.indexOf(s);
  }
  function pulse(position, colour, intensity = 0.6, duration = 0.35) {
    const s = acquire(); if (!s) return -1;
    begin(s, KIND.PULSE, colour, duration);
    s.intensity = clamp01(intensity);
    s.from.copy(position);
    s.sprite.position.copy(s.from); s.sprite.scale.set(0.5, 0.5, 1); s.sprite.visible = true;
    return slots.indexOf(s);
  }
  function arc(from, to, colour, duration = 0.35) {
    const s = acquire(); if (!s) return -1;
    begin(s, KIND.ARC, colour, duration);
    s.from.copy(from); s.to.copy(to);
    let len = s.from.distanceTo(s.to);
    if (len > MAX_SIZE) { _d.subVectors(s.to, s.from).multiplyScalar(MAX_SIZE / len); s.to.copy(s.from).add(_d); len = MAX_SIZE; }
    s.len = Math.max(0.2, len);
    s.tube.position.copy(s.from); s.tube.lookAt(s.to); s.tube.scale.set(1, 1, s.len); s.tube.visible = true;
    return slots.indexOf(s);
  }
  function streak(from, to, colour, duration = 0.4) {
    const s = acquire(); if (!s) return -1;
    begin(s, KIND.STREAK, colour, duration);
    s.from.copy(from); s.to.copy(to);
    s.len = Math.max(0.2, s.from.distanceTo(s.to));
    s.box.position.copy(s.from); s.box.lookAt(s.to); s.box.scale.set(0.05, 0.05, Math.min(MAX_SIZE, s.len)); s.box.visible = true;
    return slots.indexOf(s);
  }
  function impact(position, colour, duration = 0.5) {
    const s = acquire(); if (!s) return -1;
    begin(s, KIND.IMPACT, colour, duration);
    s.from.copy(position);
    s.octa.position.copy(s.from); s.octa.scale.setScalar(0.05); s.octa.rotation.set(0, 0, 0); s.octa.visible = true;
    s.ring2.position.copy(s.from); s.ring2.scale.set(0.1, 1, 0.1); s.ring2.visible = true;
    return slots.indexOf(s);
  }
  function trailFor(target) { for (const s of slots) if (s.kind === KIND.TRAIL && s.target === target) return s; return null; }
  function levitationTrail(target, colour, active) {
    const existing = trailFor(target);
    if (!active) { if (existing) hide(existing); return -1; }
    if (existing) { if (existing.colour !== colour) paint(existing, colour); return slots.indexOf(existing); }
    const s = acquire(); if (!s) return -1;
    begin(s, KIND.TRAIL, colour, 1e9);
    s.target = target;
    target.getWorldPosition(_a);
    for (let i = 0; i < 3; i++) { s.trailPos[i].copy(_a); s.trailPos[i].y -= 0.25 + 0.3 * i; s.trail[i].position.copy(s.trailPos[i]); s.trail[i].scale.set(0.26 - 0.05 * i, 0.26 - 0.05 * i, 1); s.trail[i].visible = true; s.trail[i].material.opacity = 0; }
    return slots.indexOf(s);
  }

  /* ---- animation ------------------------------------------------------------- */
  function update(t, dt) {
    now = t; let active = 0;
    for (const s of slots) {
      if (!s.active) continue;
      const k = (t - s.t0) / s.dur;
      if (s.kind !== KIND.TRAIL && k >= 1) { hide(s); continue; }
      active++;
      switch (s.kind) {
        case KIND.WAVE: {
          const r = s.radius * (0.15 + 0.85 * easeOut(k));
          s.ring.scale.set(r, 1, r); s.ring.material.opacity = MAX_OPACITY * 0.9 * (1 - k) * (1 - k);
          break;
        }
        case KIND.PULSE: {
          const a = Math.sin(Math.PI * clamp01(k)), size = 0.5 + 1.6 * s.intensity * a;
          s.sprite.scale.set(size, size, 1); s.sprite.material.opacity = MAX_OPACITY * s.intensity * a;
          break;
        }
        case KIND.ARC: {
          const env = k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82;
          s.tube.material.opacity = MAX_OPACITY * 0.85 * env * (0.85 + 0.15 * Math.sin(t * 61));
          break;
        }
        case KIND.STREAK: {
          /* the head travels from → to; the visible segment trails behind it, never longer than 3 m */
          const head = clamp01(k * 1.15), tail = Math.max(0, head - Math.min(MAX_SIZE, s.len * 0.6) / s.len);
          _a.lerpVectors(s.from, s.to, tail); _b.lerpVectors(s.from, s.to, head);
          const L = Math.max(0.05, _a.distanceTo(_b));
          s.box.position.copy(_a); s.box.scale.set(0.05, 0.05, L);
          s.box.material.opacity = MAX_OPACITY * 0.85 * (1 - k * k);
          break;
        }
        case KIND.IMPACT: {
          const a = Math.sin(Math.PI * clamp01(k));
          s.octa.scale.setScalar(0.05 + 0.3 * a); s.octa.rotation.y += dt * 6; s.octa.rotation.x += dt * 3;
          s.octa.material.opacity = MAX_OPACITY * a;
          const r = 0.15 + 0.75 * easeOut(k);
          s.ring2.scale.set(r, 1, r); s.ring2.material.opacity = MAX_OPACITY * 0.8 * (1 - k);
          break;
        }
        case KIND.TRAIL: {
          if (!s.target || !s.target.parent) { hide(s); active--; break; }
          s.target.getWorldPosition(_a);
          const fade = Math.min(1, (t - s.t0) / 0.6);
          for (let i = 0; i < 3; i++) {
            _b.copy(_a); _b.y -= 0.22 + 0.3 * i;
            const rate = Math.min(1, dt * (7 - 2 * i));
            s.trailPos[i].lerp(_b, rate);
            s.trail[i].position.copy(s.trailPos[i]);
            s.trail[i].position.x += Math.sin(t * 2.1 + i * 2.1) * 0.05 * (i + 1);
            s.trail[i].material.opacity = (0.34 - 0.09 * i) * fade;
          }
          break;
        }
        default: break;
      }
    }
    stats.active = active;
  }

  function setTheme() { /* effects follow the acting resident's colour, never the world theme */ }
  function dispose() {
    for (const s of slots) { for (const p of s.parts) { p.material.dispose(); } }
    if (group.parent) group.parent.remove(group);
    ringGeo.dispose(); smallRingGeo.dispose(); tubeGeo.dispose(); boxGeo.dispose(); octaGeo.dispose(); softTex.dispose(); diamondTex.dispose();
  }

  return { group, wave, pulse, arc, streak, impact, levitationTrail, update, setTheme, dispose, stats, slots, MAX };
}
