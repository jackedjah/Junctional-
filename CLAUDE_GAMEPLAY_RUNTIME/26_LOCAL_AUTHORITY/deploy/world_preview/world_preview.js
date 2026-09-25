/* MAHWORLD :: WORLD PREVIEW (dev only, never shipped). Renders the real client world — lab/fieldScene.js (plaza, city, HALO) plus the
   registry-driven world layer — without the gameplay host. The FIELD layout is the one the host publishes: Colliders.js over the generated
   rules mapping (field_colliders_district_v1), room size 600 m. Renderer settings mirror play.js (quality tier, shadows, ACES exposure).
   Served at lab/world_preview.html by capture.mjs. URL: ?quality=HIGH|MED|LOW  ?sky=day|night.  window.WP drives fixed viewpoints. */
import * as THREE from '../vendor/three/three.module.min.js';
import { createFieldScene } from './fieldScene.js';
import { createQuality } from './quality.js';
import { createColliders } from '../play/rules1723/Colliders.js';
import { drawWorldMap } from './worldMap.js';

var params = new URLSearchParams(location.search);
var quality = createQuality({ params: params });
var canvas = document.getElementById('view');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: quality.get().antialias, powerPreference: 'low-power', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(quality.get().dpr_cap, devicePixelRatio || 1));
var Tq = quality.get(); if (Tq.shadows && Tq.shadows !== 'off') { renderer.shadowMap.enabled = true; renderer.shadowMap.type = Tq.shadows === 'soft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; }
if (params.get('sky') !== 'night') { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; }
var scene = new THREE.Scene(); var camera = new THREE.PerspectiveCamera(55, 1, 0.4, 1400);
function resize() { var w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

var VIEW = { pos: new THREE.Vector3(0, 6, 24), look: new THREE.Vector3(0, 3, 0) };
var fieldScene = createFieldScene(THREE, scene, { quality: quality, renderer: renderer, botany: params.get('botany') !== '0', world: params.get('world') !== '0',
  playerPos: function () { return { x: VIEW.look.x, y: 0, z: VIEW.look.z }; }, cameraPos: function () { return { x: camera.position.x, y: camera.position.y, z: camera.position.z }; },
  playerHeading: function () { return 0; }, playerHand: function () { return null; }, playerSocket: function () { return null; }, log: function (m) { STATE.log.push(String(m)); } });

var STATE = { built: false, error: null, log: [], frames: 0, t0: performance.now(), prewarm: null, layout: null };
(async function () {
  try {
    var rules = await fetch('../play/rules1723/rules_17_23.dev.json').then(function (r) { return r.json(); });
    var L = rules._runtime_mapping.field_colliders_district_v1; var c = createColliders(L);
    var layout = { version: c.version, shapes: c.baseShapes, district_shapes: c.districtShapeCount(), world_shapes: c.worldShapeCount(), body_radius_m: c.bodyRadius, interactables: c.interactables, landmarks: c.landmarks, groups: c.groups() };
    STATE.layout = { version: layout.version, base: layout.shapes.length, district: layout.district_shapes, world: layout.world_shapes };
    fieldScene.build(layout, 600); STATE.built = true;
  } catch (e) { STATE.error = String(e && e.stack || e); }
})();

var last = performance.now(), t = 0;
function frame(now) {
  var dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
  camera.position.copy(VIEW.pos); camera.lookAt(VIEW.look);
  if (STATE.built) { try { fieldScene.follow(VIEW.look.x, VIEW.look.z); fieldScene.skyFollow(camera.position.x, camera.position.z); fieldScene.tick(dt, t, null); } catch (e) { STATE.error = STATE.error || String(e && e.stack || e); } }
  renderer.render(scene, camera); STATE.frames++;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.WP = {
  THREE: THREE, scene: scene, camera: camera, renderer: renderer, fieldScene: fieldScene, quality: quality,
  state: function () { var w = fieldScene.worldInfo ? fieldScene.worldInfo() : null; return { built: STATE.built, error: STATE.error, frames: STATE.frames, layout: STATE.layout, world: w && { status: w.status, error: w.error }, tod: fieldScene.timeOfDay ? fieldScene.timeOfDay() : null, tier: quality.tier(), log: STATE.log.slice(-12) }; },
  view: function (pos, look) { VIEW.pos.set(pos[0], pos[1], pos[2]); VIEW.look.set(look[0], look[1], look[2]); return true; },
  time: function (tod) { if (fieldScene.setNight) fieldScene.setNight(tod === 'NIGHT', { persist: false }); return fieldScene.timeOfDay ? fieldScene.timeOfDay() : null; },
  prewarm: function () { STATE.prewarm = fieldScene.prewarmTimeStates ? fieldScene.prewarmTimeStates(renderer, camera) : null; return STATE.prewarm; },
  stats: function () { var i = renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs ? i.programs.length : null }; },
  tag: function (s) { document.getElementById('tag').textContent = s || ''; return true; },
  map: function (w, h, player) { var reg = fieldScene.worldRegistry ? fieldScene.worldRegistry() : null; if (!reg) return null; var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); var boxes = [];
    function mapLabel(txt, x, y, o) { o = o || {}; g.save(); g.font = o.font || '700 9px system-ui'; var tw = Math.ceil(g.measureText(txt).width) + 8, th = o.height || 13, bx = Math.max(2, Math.min(w - tw - 2, x - tw / 2)), by = Math.max(2, Math.min(h - th - 2, y - th / 2)), box = { x1: bx, y1: by, x2: bx + tw, y2: by + th }; if (!o.force && boxes.some(function (b) { return !(box.x2 + 2 < b.x1 || box.x1 - 2 > b.x2 || box.y2 + 2 < b.y1 || box.y1 - 2 > b.y2); })) { g.restore(); return false; } boxes.push(box); g.fillStyle = 'rgba(5,7,13,0.7)'; g.fillRect(bx, by, tw, th); g.fillStyle = o.color || '#eef1f8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, bx + tw / 2, by + th / 2 + 0.5); g.restore(); return true; }
    drawWorldMap(g, w, h, reg, { player: player || { x: 0, z: -20, heading: 0 }, t: 0.6, mapLabel: mapLabel }); return c.toDataURL('image/png'); }
};
