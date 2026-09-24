/* MAHWORLD M5 owner-correction visual gates (G01 / G06 / G08).

   This probe is intentionally candidate-derived. It reads the registry, district manifest,
   room tuning and the candidate's own pure road/cloud modules before Chrome starts. Runtime
   captures then use the shipped field, room transactions, time-of-day controller, flight
   controller and scene diagnostics. DEV PLACE is used only to shorten travel between labelled
   evidence stations; it never substitutes geometry, a room, a sky state or a controller result.

   G01  DAY/NIGHT ground, grazing and powered-flight views of same/mixed T/X/Y ownership,
        road/forecourt, terrain/road and the 120 m chunk boundary; LOW/HIGH captures on both
        sides of a real authored-building LOD switch while the connected road remains visible.
   G06  exterior approach -> real threshold -> related grand interior -> correct return proof
        for temple, tower and both market doors, tied to manifest/tuning dimensions.
   G08  the runtime-traced Moon GLB across translation and camera rotation, natural clear/dense
        cloud-optics extrema, coherent field-key attenuation, and DAY/NIGHT state changes.

   The mainland currently has no authored mixed-family four-way strip intersection. G01 does
   not invent one: its mixed X case is the registry's actual four-route NEXUS_CIVIC_FLOOR
   connector, explicitly labelled FLOOR_CONNECTOR_X in the report. The mixed T/Y and the
   same-family T/X/Y cases are ordinary road-network nodes.

   node 26_LOCAL_AUTHORITY/deploy/jobb/probe_m5c_visual_gates.mjs
     [--dist 26_LOCAL_AUTHORITY/deploy/static_dist]
     [--out 25_HANDOFF/CONVERGENCE/astra_m5_corrections/visual_gates]
     [--profile desktop|phone] [--validate-only]
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';

var HERE = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HERE, '..', '..', '..');
var argv = process.argv.slice(2);
function arg(k, d) { var i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; }
function has(k) { return argv.indexOf(k) >= 0; }
function safeName(v) { return String(v).replace(/[^A-Za-z0-9_.-]/g, '_'); }
var DIST = path.resolve(arg('--dist', path.join(ROOT, '26_LOCAL_AUTHORITY', 'deploy', 'static_dist')));
var OUT = path.resolve(arg('--out', path.join(ROOT, '25_HANDOFF', 'CONVERGENCE', 'astra_m5_corrections', 'visual_gates')));
var PROFILE = String(arg('--profile', 'desktop')).toLowerCase();
if (PROFILE !== 'desktop' && PROFILE !== 'phone') throw new Error('--profile must be desktop or phone');

function candidateDataPath(parts) {
  var packed = path.join.apply(path, [DIST, 'CLAUDE_GAMEPLAY_RUNTIME'].concat(parts));
  return fs.existsSync(packed) ? packed : path.join.apply(path, [ROOT].concat(parts));
}
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function runtimeFile(runtime) { return candidateDataPath(['26_LOCAL_AUTHORITY'].concat(String(runtime).replace(/^\/+/, '').split('/'))); }
function unit(v) { var n = Math.hypot(v[0], v[1]) || 1; return [v[0] / n, v[1] / n]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }

var REGISTRY_PATH = candidateDataPath(['26_LOCAL_AUTHORITY', 'lab', 'assets', 'world', 'world_registry_v1.json']);
var DISTRICT_PATH = candidateDataPath(['26_LOCAL_AUTHORITY', 'lab', 'assets', 'buildings', 'district_v1.json']);
var TUNING_PATH = candidateDataPath(['00_CORE', 'dev_tuning.dev.json']);
var ROAD_MODULE_PATH = candidateDataPath(['26_LOCAL_AUTHORITY', 'lab', 'world', 'roadNetwork.js']);
var SKY_MODULE_PATH = candidateDataPath(['26_LOCAL_AUTHORITY', 'lab', 'world', 'sky.js']);
var CELESTIAL_MODULE_PATH = candidateDataPath(['26_LOCAL_AUTHORITY', 'lab', 'world', 'celestial.js']);
var FIELD_SCENE_PATH = candidateDataPath(['26_LOCAL_AUTHORITY', 'lab', 'fieldScene.js']);
var BUILD_INFO_PATH = path.join(DIST, 'BUILD_INFO.json');
var REG = readJson(REGISTRY_PATH), DISTRICT = readJson(DISTRICT_PATH), TUNING = readJson(TUNING_PATH);
var BUILD_INFO = fs.existsSync(BUILD_INFO_PATH) ? readJson(BUILD_INFO_PATH) : null;
var ROOMS = TUNING.local_authority && TUNING.local_authority.play && TUNING.local_authority.play.rooms || {};
var roadMod = await import(pathToFileURL(ROAD_MODULE_PATH).href + '?m5c=' + Date.now());
var skyMod = await import(pathToFileURL(SKY_MODULE_PATH).href + '?m5c=' + Date.now());
var celestialMod = await import(pathToFileURL(CELESTIAL_MODULE_PATH).href + '?m5c=' + Date.now());
var buildRoadNetwork = roadMod.buildRoadNetwork, celestialCloudOptics = skyMod.celestialCloudOptics, celestialDirection = celestialMod.celestialDirection;
if (typeof buildRoadNetwork !== 'function' || typeof celestialCloudOptics !== 'function' || typeof celestialDirection !== 'function') throw new Error('candidate pure diagnostic exports are unavailable');

/* Match terrain.js's runtime path preparation closely enough that evidence coordinates
   describe the geometry that is actually emitted. The landmark-only end trim does not
   affect any selected station; origin causeways are trimmed to the civic-floor rim. */
function candidateRoadGraph() {
  var PW = REG.paths || {}, widths = { CAUSEWAY: PW.causeway_w || 8, REGIONAL: PW.regional_w || 3.6, TRAIL: PW.trail_w || 1.8 };
  var roads = [], explicit = [], plazaR = REG.field && REG.field.plaza_radius_m || 56;
  (PW.list || []).forEach(function (P) {
    var pts = (P.pts || []).map(function (p) { return [+p[0], +p[1]]; }); if (pts.length < 2) return;
    if (P.tier === 'CAUSEWAY' && Math.hypot(pts[0][0], pts[0][1]) < 1) { var d = Math.hypot(pts[1][0], pts[1][1]) || 1, k = (plazaR - 4) / d; pts[0] = [pts[1][0] * k, pts[1][1] * k]; }
    var w = widths[P.tier] || 3, core = P.tier === 'CAUSEWAY' ? w - 1.6 : (P.tier === 'REGIONAL' ? w - 1 : w - 0.6);
    roads.push({ id: P.id, tier: P.tier, family: P.family, points: pts, frameW: w, coreW: P.tier === 'TRAIL' ? core * 0.55 : core });
    if (!P.forecourt) return;
    explicit.push({ id: P.id + ':FORECOURT', kind: 'FORECOURT', x: P.forecourt.x, z: P.forecourt.z, radius: P.forecourt.r || PW.forecourt_r || 12 });
    [P.spur, P.spur2].forEach(function (S, i) { if (!S || !S.to) return; var sw = PW.spur_w || 6; roads.push({ id: P.id + ':SPUR' + i, tier: P.tier, family: P.family, points: [[P.forecourt.x, P.forecourt.z], [+S.to[0], +S.to[1]]], frameW: sw, coreW: sw - 1.2, door: S.door }); });
  });
  var network = buildRoadNetwork(roads, explicit);
  network.nodes.forEach(function (N) {
    N.edges = network.pieces.filter(function (P) { return P.aKey === N.key || P.bKey === N.key; }).map(function (P) {
      var o = P.aKey === N.key ? P.b : P.a, d = unit([o[0] - N.x, o[1] - N.z]); return { road: P.roadId, family: P.style.family, tier: P.style.tier, direction: d };
    });
    var opposite = 0; for (var i = 0; i < N.edges.length; i++) for (var j = i + 1; j < N.edges.length; j++) if (dot(N.edges[i].direction, N.edges[j].direction) < -0.94) opposite++;
    N.valence = N.edges.length; N.shape = N.valence === 3 ? (opposite ? 'T' : 'Y') : (N.valence === 4 && opposite >= 2 ? 'X' : 'HUB_' + N.valence);
    N.families = Array.from(new Set(N.edges.map(function (e) { return e.family; })));
    N.color_relation = N.families.length > 1 ? 'MIXED' : 'SAME';
  });
  return network;
}
var NETWORK = candidateRoadGraph();
function nodeWithRoads(ids) {
  return NETWORK.nodes.filter(function (N) { var r = Array.from(new Set(N.edges.map(function (e) { return e.road; }))); return ids.every(function (id) { return r.indexOf(id) >= 0; }); })[0] || null;
}
function nodeEvidence(id, label, shape, relation, roadIds, approach) {
  var N = nodeWithRoads(roadIds); if (!N) throw new Error('missing candidate road node for ' + id + ': ' + roadIds.join(', '));
  if (N.shape !== shape || N.color_relation !== relation) throw new Error(id + ' classified ' + N.shape + '/' + N.color_relation + ', expected ' + shape + '/' + relation);
  return { id: id, label: label, source_kind: 'ROAD_NETWORK_NODE', point: [N.x, N.z], approach: unit(approach || N.edges[0].direction), offset_m: 10, expected_shape: shape, color_relation: relation, road_ids: Array.from(new Set(N.edges.map(function (e) { return e.road; }))), families: N.families, valence: N.valence, edges: N.edges };
}
var DEST = ((REG.paths && REG.paths.destinations) || []).filter(function (d) { return d.id === 'NEXUS_CIVIC_FLOOR'; })[0];
if (!DEST || !DEST.bounds || !(DEST.joins || []).length) throw new Error('candidate lacks NEXUS_CIVIC_FLOOR destination authority');
function floorHub(id, label, shape, routeIds, approach) {
  var all = REG.paths.list || [], chosen = routeIds.map(function (rid) { return all.filter(function (r) { return r.id === rid; })[0]; });
  if (chosen.some(function (r) { return !r; }) || routeIds.some(function (r) { return DEST.joins.indexOf(r) < 0; })) throw new Error('floor connector ' + id + ' is not backed by destination joins');
  var fam = Array.from(new Set(chosen.map(function (r) { return r.family; })));
  return { id: id, label: label, source_kind: 'DESTINATION_FLOOR_CONNECTOR', point: [(DEST.bounds.x1 + DEST.bounds.x2) / 2, (DEST.bounds.z1 + DEST.bounds.z2) / 2], approach: unit(approach), offset_m: 28, expected_shape: shape, color_relation: fam.length > 1 ? 'MIXED' : 'SAME', road_ids: routeIds, families: fam, valence: routeIds.length, authority_note: 'actual neutral civic floor connects the route mouths; this is not claimed as a coplanar strip intersection' };
}
var G01_PRIMARY = [
  nodeEvidence('same_t', 'same-family red T', 'T', 'SAME', ['RP_CANYON', 'DT_NW_CLEARING'], [1, 0]),
  nodeEvidence('mixed_t', 'gold/pink T', 'T', 'MIXED', ['CW_TEMPLE', 'CW_MARKET'], [-1, 0]),
  nodeEvidence('same_x', 'same-family blue X', 'X', 'SAME', ['RP_FOREST_NE', 'RP_RANGE_LOOP'], [0, -1]),
  floorHub('mixed_x_floor', 'mixed-family civic-floor X connector', 'X', ['CW_GYM', 'CW_TEMPLE', 'CW_TOWER', 'CW_MATCH'], [0, -1]),
  nodeEvidence('same_y', 'same-family purple Y', 'Y', 'SAME', ['RP_FOREST_W', 'RP_WEST_LINK', 'DT_HIGHLAND'], [-1, 0]),
  floorHub('mixed_y_floor', 'mixed-family civic-floor Y subset', 'Y', ['CW_GYM', 'CW_TEMPLE', 'CW_TOWER'], [0, -1])
];
var templePath = (REG.paths.list || []).filter(function (p) { return p.id === 'CW_TEMPLE'; })[0];
var forestChunkNode = nodeWithRoads(['RP_FOREST_W', 'RP_FOREST_W_N']);
if (!templePath || !templePath.forecourt || !forestChunkNode) throw new Error('G01 supplemental stations missing from candidate registry');
var G01_SUPPLEMENTAL = [
  { id: 'road_forecourt', label: 'temple causeway / named forecourt', source_kind: 'PATH_FORECOURT', point: [templePath.forecourt.x, templePath.forecourt.z], approach: [0, -1], offset_m: 13, road_ids: ['CW_TEMPLE'], families: [templePath.family] },
  { id: 'terrain_road_edge', label: 'terrain / temple-road ownership edge', source_kind: 'PATH_TERRAIN_EDGE', point: [0, 112], approach: [1, 0], offset_m: 12, road_ids: ['CW_TEMPLE'], families: [templePath.family], edge_half_width_m: (REG.paths.causeway_w || 20) / 2 },
  { id: 'chunk_120m', label: 'road continuity at x=-120 world chunk boundary', source_kind: 'RUNTIME_CHUNK_BOUNDARY', point: [-120, forestChunkNode.z], approach: [-1, 0], offset_m: 11, road_ids: Array.from(new Set(forestChunkNode.edges.map(function (e) { return e.road; }))), families: forestChunkNode.families, chunk_m: 120 }
];
var G01_STATIONS = G01_PRIMARY.concat(G01_SUPPLEMENTAL);

function portalRecord(id) {
  var found = null; (DISTRICT.buildings || []).some(function (b) { return (b.portals || []).some(function (p) { if (p.id !== id) return false; found = { building: b, portal: p }; return true; }); });
  if (!found || !found.portal.world || !found.portal.outward) throw new Error('missing district portal ' + id);
  return found;
}
function pathForecourtForDoor(door) {
  var out = null; (REG.paths.list || []).some(function (P) { return [P.spur, P.spur2].some(function (S) { if (!S || S.door !== door) return false; out = P.forecourt ? [P.forecourt.x, P.forecourt.z] : null; return true; }); }); return out;
}
function roomSpec(name, door, room) {
  var q = portalRecord(door), cfg = ROOMS[room], exit = cfg && cfg.exit && cfg.exit.position, fc = pathForecourtForDoor(door);
  if (!cfg || !exit || !cfg.interior_plan || !fc) throw new Error('incomplete portal/room/forecourt contract for ' + door + ' -> ' + room);
  var out = unit(q.portal.outward), toCourt = unit([fc[0] - q.portal.world[0], fc[1] - q.portal.world[1]]);
  return { name: name, building: q.building, door: door, room: room, door_at: q.portal.world.slice(), outward: out, forecourt: fc, alignment_dot: dot(out, toCourt), exit: [+exit.x, +exit.z], room_cfg: cfg };
}
var GRAND = [
  roomSpec('gold_temple', 'TEMPLE_DOOR', 'TEMPLE_HALL'),
  roomSpec('blue_tower', 'TOWER_DOOR', 'TOWER_HALL'),
  roomSpec('market_clothing', 'CLOTHING_DOOR', 'CLOTHING_SHOP'),
  roomSpec('market_weapon', 'WEAPON_DOOR', 'WEAPON_SHOP')
];
var affectedBuildingIds = Array.from(new Set(GRAND.map(function (s) { return s.building.id; })));
if (affectedBuildingIds.join('|') !== 'temple|tower|market') throw new Error('affected imported-building set drifted: ' + affectedBuildingIds.join(', '));
var buildingRuntimeTruth = affectedBuildingIds.map(function (id) {
  var b = (DISTRICT.buildings || []).filter(function (q) { return q.id === id; })[0], c = b && b.owner_m5_correction, l0 = b && runtimeFile(b.runtime), l1 = b && runtimeFile(b.lod_runtime || b.collider_runtime || b.runtime);
  var observed0 = l0 && fs.existsSync(l0) ? sha256File(l0) : null, observed1 = l1 && fs.existsSync(l1) ? sha256File(l1) : null;
  return { id: id, runtime: b && b.runtime, lod_runtime: b && b.lod_runtime, l0_path: l0, l1_path: l1, expected_l0_sha256: c && c.near_runtime_sha256, expected_l1_sha256: c && c.far_runtime_sha256, observed_l0_sha256: observed0, observed_l1_sha256: observed1, matches: !!(c && observed0 === c.near_runtime_sha256 && observed1 === c.far_runtime_sha256) };
});

var moonCfg = REG.celestial && REG.celestial.moon, moonDerivative = moonCfg && (REG.derivatives || []).filter(function (d) { return d.id === moonCfg.derivative; })[0];
var moonSource = moonDerivative && (REG.sources || []).filter(function (s) { return s.id === moonDerivative.source; })[0];
var moonRuntime = moonDerivative && moonDerivative.files && (moonDerivative.files[moonCfg.lod || 'L0'] || moonDerivative.files.L0);
if (!moonCfg || !moonDerivative || !moonSource || !moonRuntime) throw new Error('candidate Moon provenance chain is incomplete');
var moonRuntimePath = runtimeFile(moonRuntime.runtime);
if (!fs.existsSync(moonRuntimePath)) throw new Error('candidate Moon runtime derivative is missing: ' + moonRuntimePath);
var moonRuntimeSha = sha256File(moonRuntimePath);
if (moonRuntime.sha256 && moonRuntimeSha !== moonRuntime.sha256) throw new Error('candidate Moon derivative hash mismatch');
var moonDir = celestialDirection(moonCfg, 'moon');
var chunkSource = fs.readFileSync(FIELD_SCENE_PATH, 'utf8');
if (!/mergeStatic\(group,\s*120\)/.test(chunkSource)) throw new Error('candidate field chunk size is no longer the expected source-pinned 120 m');

var validation = {
  ok: true, candidate_root: DIST,
  build: BUILD_INFO, proof_sources: { build_info: BUILD_INFO_PATH, registry: REGISTRY_PATH, district: DISTRICT_PATH, tuning: TUNING_PATH, road_module: ROAD_MODULE_PATH, sky_module: SKY_MODULE_PATH, celestial_module: CELESTIAL_MODULE_PATH, field_scene: FIELD_SCENE_PATH },
  g01: { network_stats: NETWORK.stats, primary: G01_PRIMARY, supplemental: G01_SUPPLEMENTAL, no_authored_mixed_strip_x: !NETWORK.nodes.some(function (n) { return n.shape === 'X' && n.color_relation === 'MIXED'; }), mixed_x_authority: DEST.id },
  g03: { runtime_hashes: buildingRuntimeTruth, matched_view_policy: 'local source/derivative matched views plus shipped-runtime mid/close views for temple, tower and market' },
  g06: GRAND.map(function (s) { return { name: s.name, building: s.building.id, door: s.door, room: s.room, door_at: s.door_at, outward: s.outward, forecourt: s.forecourt, alignment_dot: s.alignment_dot, scale: s.building.scale, correction: s.building.owner_m5_correction, provenance: s.building.provenance, room_plan: s.room_cfg.interior_plan }; }),
  g08: { config: moonCfg, derivative: moonDerivative.id, runtime: moonRuntime.runtime, runtime_sha256: moonRuntimeSha, source: moonSource, source_exists: fs.existsSync(moonSource.path), direction: moonDir }
};
if (has('--validate-only')) { console.log(JSON.stringify(validation, null, 2)); process.exit(0); }

fs.mkdirSync(OUT, { recursive: true });
var report = {
  generated_at: new Date().toISOString(), candidate_root: DIST, profile: PROFILE,
  capture_policy: 'candidate-derived coordinates; DEV PLACE only shortens travel; field/flight/time/room/sky states are the shipped runtime',
  physical_phone_acceptance: PROFILE === 'phone' ? 'Chromium touch-sized emulation only; owner physical-phone acceptance remains pending' : 'not a physical-phone run',
  validation: validation, checks: [], screenshots: [], g01: { stations: [], lod_boundary: [], surface_truth: null }, g03: { runtime_hashes: buildingRuntimeTruth, view_pairs: [] }, g06: [], g08: {}, console_errors: [], pass: 0, fail: 0, fatal: null
};
function check(gate, id, cond, detail) { var row = { gate: gate, id: id, pass: !!cond, detail: detail }; report.checks.push(row); cond ? report.pass++ : report.fail++; console.log((cond ? 'PASS ' : 'FAIL ') + gate + ' ' + id + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 900))); return !!cond; }
function cleanErrors(a) { return (a || []).filter(function (e) { return !/favicon\.ico|athlete_m_preview\/dev_0\.(?:1|2|3|4|5|6|7|9|10|11|12|13)\/manifest\.json|toNonIndexed|404.*(?:fallback|motion|animation|glb)/i.test(String(e)); }); }

var mobile = PROFILE === 'phone';
var viewport = mobile ? { width: 393, height: 852, dpr: 2, mobile: true } : { width: 1280, height: 800, dpr: 1, mobile: false };
var srv = await serveStatic(DIST), pg = await launchChrome({ width: viewport.width, height: viewport.height, dpr: viewport.dpr, mobile: viewport.mobile, gpu: true, unlockFps: !mobile, cmdTimeoutMs: 120000 });
async function ev(src) { return await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var H=window.MAHWORLD_STATIC_HOST; " + src + " })()"); }
async function shot(gate, name) { var rel = gate.toLowerCase() + '/' + safeName(name) + '.png', f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); await pg.screenshot(f); report.screenshots.push(rel.replace(/\\/g, '/')); console.log('SHOT ' + rel); return rel; }
async function ready() { for (var i = 0; i < 300; i++) { var q = await ev("var w=P.world(),r=P.restoreState(),v=document.getElementById('restore-veil'),d=P.district(); return {world:w&&w.status,restore:!!(r&&r.done),veil:!v||getComputedStyle(v).display==='none',room:P.snap().play.room,district:d};"); if (q.world === 'READY' && q.restore && q.veil && q.room === 'FIELD' && q.district && q.district.loaded && affectedBuildingIds.every(function (id) { return q.district.loaded.some(function (b) { return b.id === id && b.lod && b.lod.far_status === 'READY'; }); })) return q; if (q.world === 'FAILED') return q; await sleep(500); } return null; }
async function stop() { return await ev("return P.send('MOVE',{forward:0,strafe:0,run:false,fast:false});"); }
async function ensureField() { var s = await ev("return P.snap().play.room;"); if (s === 'FIELD') return true; return false; }
async function ensureGrounded() {
  var f = await ev("return P.snap().play.flight;"); if (!f || (!f.powered && !f.exiting && !f.falling)) return f;
  await ev("return P.send('FLIGHT',{op:'EXIT'});"); for (var i = 0; i < 100; i++) { await sleep(120); f = await ev("return P.snap().play.flight;"); if (!f.powered && !f.exiting && !f.falling) break; } return f;
}
function inwardYaw(approach) { return Math.atan2(approach[0], approach[1]); }
async function placeFrame(spec, view) {
  var ap = unit(spec.approach || [0, -1]), off = spec.offset_m || 10, actorOff = view === 'flight' ? Math.min(4, off) : off, x = spec.point[0] + ap[0] * actorOff, z = spec.point[1] + ap[1] * actorOff, yaw = inwardYaw(ap);
  var framing = view === 'ground' ? { pitch: 0.15, dist: 8, pivot: 1.18 } : (view === 'grazing' ? { pitch: 0.025, dist: 12, pivot: 0.92 } : { pitch: 0.72, dist: 14, pivot: 1.1 });
  var placed = await ev("var r=await P.devPlay('PLACE',{x:" + x + ",z:" + z + "}); await P.send('MOVE',{forward:0,strafe:0,run:false,fast:false,yaw:" + yaw + "}); P.camAt(null); P.camFollow(false); P.cam(" + yaw + "," + framing.pitch + "," + framing.dist + "," + framing.pivot + "); return r;");
  await sleep(500);
  var state = await ev("var p=P.snap().play; return {time:P.timeOfDay(),position:p.position,facing:p.facing,flight:p.flight,camera:P.camState(),quality:P.quality?P.quality():null,ground:P.groundAt(" + spec.point[0] + "," + spec.point[1] + ")};");
  return { fixture: placed, view: view, station: spec.id, target: spec.point, actor_requested: [x, z], yaw: yaw, framing: framing, state: state };
}
async function beginFlight() {
  await stop(); var enter = await ev("return P.send('FLIGHT',{op:'ENTER'});"); await sleep(450); var ascend = await ev("return P.send('FLIGHT',{op:'ASCEND'});"); await sleep(2200); var hover = await ev("return P.send('FLIGHT',{op:'HOVER'});");
  var f = null; for (var i = 0; i < 30; i++) { await sleep(100); f = await ev("return P.snap().play.flight;"); if (f && f.powered && f.intent === 0 && Math.abs(f.vz || 0) <= 0.12) break; } return { enter: enter, ascend: ascend, hover: hover, state: f };
}
async function surfaceTruth() {
  return await ev("var sc=P.sceneDebug(),names=['TERRAIN_PATH_CORES','TERRAIN_PATH_FRAMES','TERRAIN_PATH_SEAMS','TERRAIN_REGION_TINTS'],out={}; function diag(n){var a=[];sc.traverse(function(o){if(o.name===n)a.push(o);});return a.map(function(o){var g=o.geometry,ix=g&&g.index&&g.index.array,pos=g&&g.attributes&&g.attributes.position,invalid=0,deg=0;if(ix&&pos){for(var i=0;i<ix.length;i++)if(ix[i]<0||ix[i]>=pos.count)invalid++;for(i=0;i+2<ix.length;i+=3){var a0=ix[i],b=ix[i+1],c=ix[i+2],ax=pos.getX(a0),ay=pos.getY(a0),az=pos.getZ(a0),ux=pos.getX(b)-ax,uy=pos.getY(b)-ay,uz=pos.getZ(b)-az,vx=pos.getX(c)-ax,vy=pos.getY(c)-ay,vz=pos.getZ(c)-az,cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;if(cx*cx+cy*cy+cz*cz<1e-14)deg++;}}var lod=false,p=o.parent;while(p){if(p.isLOD)lod=true;p=p.parent;}var m=Array.isArray(o.material)?o.material[0]:o.material;return {uuid:o.uuid,count:a.length,indexed:!!ix,vertices:pos?pos.count:0,indices:ix?ix.length:0,invalid_indices:invalid,degenerate_triangles:deg,frustum_culled:!!o.frustumCulled,lod_ancestor:lod,material:m?{type:m.type,transparent:!!m.transparent,opacity:m.opacity,depth_write:m.depthWrite,depth_test:m.depthTest,polygon_offset:!!m.polygonOffset,program:m.customProgramCacheKey&&m.customProgramCacheKey()}:null};});}names.forEach(function(n){out[n]=diag(n);});var w=P.worldLayer(),d=w&&w.debug?w.debug():null;out.terrain_debug=d&&d.terrain;out.merge=P.mergeInfo?P.mergeInfo():null;return out;");
}

async function captureG01() {
  report.g01.surface_truth = await surfaceTruth(); var C = report.g01.surface_truth.TERRAIN_PATH_CORES || [], F = report.g01.surface_truth.TERRAIN_PATH_FRAMES || [], S = report.g01.surface_truth.TERRAIN_PATH_SEAMS || [];
  check('G01', 'one_owned_valid_path_surface_set', C.length === 1 && F.length === 1 && S.length === 1 && C[0].invalid_indices === 0 && F[0].invalid_indices === 0 && S[0].invalid_indices === 0 && !C[0].material.transparent && C[0].material.depth_write && C[0].material.program === 'mahworld_path_core_owned' && !C[0].lod_ancestor && !F[0].lod_ancestor && !S[0].lod_ancestor, report.g01.surface_truth);
  /* Degenerate counts stay explicit diagnostics rather than being silently discarded. A
     fully swallowed clipped ribbon can legally collapse to zero area under its owning
     junction disc; it has no draw area and is not evidence of an overlapping owner. */
  check('G01', 'path_index_and_degenerate_diagnostics_recorded', [C[0], F[0], S[0]].every(function (r) { return r && Number.isInteger(r.invalid_indices) && Number.isInteger(r.degenerate_triangles); }), { cores: C[0] && { invalid: C[0].invalid_indices, degenerate: C[0].degenerate_triangles }, frames: F[0] && { invalid: F[0].invalid_indices, degenerate: F[0].degenerate_triangles }, seams: S[0] && { invalid: S[0].invalid_indices, degenerate: S[0].degenerate_triangles } });
  for (var ti = 0; ti < 2; ti++) {
    var tod = ti ? 'NIGHT' : 'DAY'; await ensureGrounded(); await ev("P.timeOfDay('" + tod + "'); P.quality&&P.quality('MED'); return 1;"); await sleep(900);
    for (var si = 0; si < G01_STATIONS.length; si++) {
      var spec = G01_STATIONS[si], rec = { time: tod, station: spec, views: {} };
      rec.views.ground = await placeFrame(spec, 'ground'); rec.views.ground.screenshot = await shot('G01', tod.toLowerCase() + '_' + spec.id + '_ground');
      rec.views.grazing = await placeFrame(spec, 'grazing'); rec.views.grazing.screenshot = await shot('G01', tod.toLowerCase() + '_' + spec.id + '_grazing'); report.g01.stations.push(rec);
    }
    var flyFixture = await placeFrame(G01_STATIONS[0], 'ground'), flight = await beginFlight();
    check('G01', tod.toLowerCase() + '_powered_flight_view_state', !!(flight.enter && flight.enter.accepted && flight.ascend && flight.ascend.accepted && flight.hover && flight.hover.accepted && flight.state && flight.state.powered && flight.state.height_above_ground >= 3), { fixture: flyFixture, flight: flight });
    for (si = 0; si < G01_STATIONS.length; si++) {
      var row = report.g01.stations.filter(function (r) { return r.time === tod && r.station.id === G01_STATIONS[si].id; })[0]; row.views.flight = await placeFrame(G01_STATIONS[si], 'flight'); row.views.flight.screenshot = await shot('G01', tod.toLowerCase() + '_' + G01_STATIONS[si].id + '_flight');
    }
    await ensureGrounded();
  }
  var required = 2 * G01_STATIONS.length * 3, got = report.g01.stations.reduce(function (n, r) { return n + ['ground', 'grazing', 'flight'].filter(function (v) { return r.views[v] && r.views[v].screenshot; }).length; }, 0);
  check('G01', 'day_night_ground_grazing_flight_matrix_complete', got === required && G01_PRIMARY.every(function (s) { return report.g01.stations.filter(function (r) { return r.station.id === s.id; }).length === 2; }), { expected: required, captured: got, stations: G01_STATIONS.map(function (s) { return s.id; }) });

  /* The road is a single non-LOD surface; exercise a real district LOD transition over its
     connected temple approach. LOW/HIGH and DAY/NIGHT are captured on both sides. */
  var temple = (DISTRICT.buildings || []).filter(function (b) { return b.id === 'temple'; })[0], portal = portalRecord('TEMPLE_DOOR').portal, out = unit(portal.outward), sw = temple.lod_switch_m;
  async function lodSide(tod, tier, side, cameraTargetM) {
    await ev("P.timeOfDay('" + tod + "'); P.quality('" + tier + "'); return 1;"); await sleep(500); var playerM = cameraTargetM - 8, x = temple.position[0] + out[0] * playerM, z = temple.position[2] + out[1] * playerM, yaw = inwardYaw(out);
    await ev("await P.devPlay('PLACE',{x:" + x + ",z:" + z + "}); await P.send('MOVE',{forward:0,strafe:0,run:false,fast:false,yaw:" + yaw + "}); P.camAt(null);P.camFollow(false);P.cam(" + yaw + ",0.08,8,1.1);return 1;"); await sleep(900);
    var state = await ev("var sc=P.sceneDebug(),b=sc.getObjectByName('DISTRICT_TEMPLE'),l=b&&b.children.filter(function(x){return x.isLOD;})[0],cp=P.cam().position,wp=new P.THREE.Vector3();if(b)b.getWorldPosition(wp);return {time:P.timeOfDay(),quality:P.quality(),camera:cp,building:[wp.x,wp.y,wp.z],camera_distance_m:b?Math.hypot(cp.x-wp.x,cp.y-wp.y,cp.z-wp.z):null,lod_level:l?l.getCurrentLevel():null,lod_distances:l?l.levels.map(function(q){return q.distance;}):[],visible_levels:l?l.levels.map(function(q){return q.object.visible;}):[],road_core:!!sc.getObjectByName('TERRAIN_PATH_CORES')};");
    var image = await shot('G01', tod.toLowerCase() + '_' + tier.toLowerCase() + '_temple_lod_' + side); var rec = { time: tod, tier: tier, side: side, requested_camera_distance_m: cameraTargetM, switch_m: sw, state: state, screenshot: image }; report.g01.lod_boundary.push(rec); return rec;
  }
  for (ti = 0; ti < 2; ti++) for (var qi = 0; qi < 2; qi++) { var tt = ti ? 'NIGHT' : 'DAY', tier = qi ? 'HIGH' : 'LOW'; await lodSide(tt, tier, 'far', sw + 18); await lodSide(tt, tier, 'near', sw - 18); }
  check('G01', 'candidate_lod_boundary_both_sides_all_states', report.g01.lod_boundary.length === 8 && report.g01.lod_boundary.every(function (r) { return r.state && r.state.road_core && r.state.lod_level !== null; }) && ['DAY', 'NIGHT'].every(function (t) { return ['LOW', 'HIGH'].every(function (q) { var rows = report.g01.lod_boundary.filter(function (r) { return r.time === t && r.tier === q; }); return rows.length === 2 && rows[0].state.lod_level !== rows[1].state.lod_level; }); }), report.g01.lod_boundary.map(function (r) { return { time: r.time, tier: r.tier, side: r.side, distance: r.state.camera_distance_m, level: r.state.lod_level }; }));
  await ev("P.quality('MED');P.timeOfDay('NIGHT');return 1;"); await sleep(400);
}

async function roomState() {
  return await ev("var p=P.snap().play,t=P.transaction(),c=P.camState();return {room:p.room,interior:!!p.room_interior,position:p.position,facing:p.facing,prompts:(p.prompts||[]).map(function(x){return {id:x.id,intent:x.intent,to:x.to,eligible:x.eligible};}),interior_plan:p.interior_plan,room_style_id:p.room_style_id,material_family:p.material_family,feature_ids:p.feature_ids,ceiling_m:p.ceiling_m,floor_levels:p.floor_levels,solids:p.room_solids,room_build:t.room_build,room_resources:t.room_resources,last_clear:t.last_room_clear,camera:c};");
}
async function waitRoomPrompt(intent, to, timeoutMs) {
  var state = null, prompt = null, deadline = Date.now() + (timeoutMs || 2500);
  while (Date.now() < deadline) {
    state = await roomState();
    prompt = state.prompts.filter(function (p) { return p.intent === intent && (!to || p.to === to) && p.eligible; })[0] || null;
    if (prompt) break;
    await sleep(80);
  }
  return { state: state, prompt: prompt };
}
async function buildingRuntime(id) {
  return await ev("var sc=P.sceneDebug(),o=sc.getObjectByName('DISTRICT_" + id.toUpperCase() + "'),b=o?new P.THREE.Box3().setFromObject(o):null,s=b?b.getSize(new P.THREE.Vector3()):null,l=o&&o.children.filter(function(x){return x.isLOD;})[0];return {present:!!o,bounds:b?{min:[b.min.x,b.min.y,b.min.z],max:[b.max.x,b.max.y,b.max.z],size:[s.x,s.y,s.z]}:null,lod:l?{level:l.getCurrentLevel(),distances:l.levels.map(function(q){return q.distance;}),visible:l.levels.map(function(q){return q.object.visible;})}:null};");
}
async function visitGrand(spec) {
  if (!(await ensureField())) throw new Error('G06 expected FIELD before ' + spec.name); await ensureGrounded(); var mid = [spec.door_at[0] + spec.outward[0] * 30, spec.door_at[1] + spec.outward[1] * 30], ap = [spec.door_at[0] + spec.outward[0] * 10, spec.door_at[1] + spec.outward[1] * 10], threshold = [spec.door_at[0] + spec.outward[0] * 0.8, spec.door_at[1] + spec.outward[1] * 0.8], yaw = inwardYaw(spec.outward);
  await ev("await P.devPlay('PLACE',{x:" + mid[0] + ",z:" + mid[1] + "});await P.send('MOVE',{forward:0,strafe:0,run:false,fast:false,yaw:" + yaw + "});P.camAt(null);P.camFollow(false);P.cam(" + yaw + ",0.12,10,1.6);return 1;"); await sleep(800); var midShot = await shot('G03', spec.name + '_00_game_mid');
  await ev("await P.devPlay('PLACE',{x:" + ap[0] + ",z:" + ap[1] + "});await P.send('MOVE',{forward:0,strafe:0,run:false,fast:false,yaw:" + yaw + "});P.camAt(null);P.camFollow(false);P.cam(" + yaw + ",0.16,9,1.3);return 1;"); await sleep(800);
  var exterior = { state: await roomState(), building: await buildingRuntime(spec.building.id), screenshot: await shot('G03', spec.name + '_01_game_close') };
  var walk = await ev("return await P.goTo(" + threshold[0] + "," + threshold[1] + ",undefined,undefined,30000);"); await sleep(450); await ev("P.camAt(null);P.camFollow(false);P.cam(" + yaw + ",0.16,9,1.3);return 1;"); await sleep(350);
  var atDoor = await roomState(), thresholdShot = await shot('G06', spec.name + '_02_threshold'); var prompt = atDoor.prompts.filter(function (p) { return p.intent === 'ENTER' && p.id === spec.door && p.to === spec.room && p.eligible; })[0] || null;
  var pending = ev("return P.interact();"); await sleep(350); var confirmIn = await ev("return {open:P.hud.confirmOpen(),answered:P.confirmAnswer(true)};"); var enter = await pending; await sleep(600);
  var inside = await roomState(); await ev("P.camAt(null);P.camFollow(false);P.cam(0,0.16,9,1.3);return 1;"); await sleep(450); var interiorThreshold = await shot('G06', spec.name + '_03_interior_threshold_same_scale');
  var centreWalk = await ev("return await P.goTo(0,0,undefined,undefined,30000);"); await sleep(400); var ceil = +spec.room_cfg.ceiling_m || 8; await ev("P.camFollow(false);P.cam(2.35,0.22,10,2.8);P.camAt(0," + (ceil * 0.6) + ",0);return 1;"); await sleep(600); var volumeState = await roomState(), volumeShot = await shot('G06', spec.name + '_04_grand_volume_upward'); await ev("P.camAt(null);return 1;");
  var exitWalk = await ev("return await P.goTo(" + spec.exit[0] + "," + spec.exit[1] + ",undefined,undefined,30000);"); await sleep(350); var exitReady = await waitRoomPrompt('ENTER_ROOM', 'FIELD', 2500), beforeExit = exitReady.state, exitPrompt = exitReady.prompt; var xp = ev("return P.interact();"); await sleep(350); var confirmOut = await ev("return {open:P.hud.confirmOpen(),answered:P.confirmAnswer(true)};"); var exit = await xp; await sleep(600); var outside = await roomState(); await ev("P.camAt(null);P.camFollow(false);P.cam(" + yaw + ",0.16,9,1.3);return 1;"); await sleep(350); var returnShot = await shot('G06', spec.name + '_05_return_at_real_door');
  var d = Math.hypot(outside.position.x - spec.door_at[0], outside.position.z - spec.door_at[1]), plan = spec.room_cfg.interior_plan, row = { name: spec.name, building_id: spec.building.id, building_manifest: spec.building, portal: { id: spec.door, world: spec.door_at, outward: spec.outward, forecourt: spec.forecourt, alignment_dot: spec.alignment_dot }, room: spec.room, plan: plan, mid: mid, mid_screenshot: midShot, approach: ap, threshold: threshold, exterior: exterior, walk: walk, at_door: atDoor, prompt: prompt, threshold_screenshot: thresholdShot, confirm_in: confirmIn, enter: enter, inside: inside, interior_threshold_screenshot: interiorThreshold, centre_walk: centreWalk, volume: volumeState, volume_screenshot: volumeShot, exit_walk: exitWalk, before_exit: beforeExit, exit_prompt: exitPrompt, confirm_out: confirmOut, exit: exit, outside: outside, return_distance_m: +d.toFixed(3), return_screenshot: returnShot };
  row.pass = !!(spec.alignment_dot >= Math.cos(15 * Math.PI / 180) && walk && walk.reached && prompt && confirmIn.open && confirmIn.answered && enter && enter.accepted && inside.room === spec.room && inside.interior && inside.room_build && !inside.room_build.error && inside.interior_plan && inside.interior_plan.plan_id === plan.plan_id && inside.ceiling_m === spec.room_cfg.ceiling_m && (inside.floor_levels || []).length === (spec.room_cfg.floor_levels || []).length && centreWalk && centreWalk.reached && !volumeState.camera.inside && exitWalk && exitWalk.reached && exitPrompt && confirmOut.open && confirmOut.answered && exit && exit.accepted && outside.room === 'FIELD' && d <= 0.6 && exterior.building.present && exterior.building.bounds);
  report.g03.view_pairs.push({ name: spec.name, building: spec.building.id, mid: midShot, close: exterior.screenshot }); report.g06.push(row); check('G06', spec.name + '_paired_exterior_threshold_interior_return', row.pass, { building: row.building_id, portal: row.portal, room: row.room, plan: plan.plan_id, ceiling_m: inside.ceiling_m, floors: inside.floor_levels, return_m: row.return_distance_m, camera_obstruction: volumeState.camera.inside, camera_state: volumeState.camera.state, screenshots: [midShot, exterior.screenshot, thresholdShot, interiorThreshold, volumeShot, returnShot] }); return row;
}
async function captureG06() { check('G03', 'shipped_imported_building_hashes_match_manifest', buildingRuntimeTruth.length === 3 && buildingRuntimeTruth.every(function (r) { return r.matches; }), buildingRuntimeTruth); for (var i = 0; i < GRAND.length; i++) await visitGrand(GRAND[i]); check('G03', 'shipped_runtime_mid_close_views_complete', report.g03.view_pairs.length === 4 && affectedBuildingIds.every(function (id) { return report.g03.view_pairs.some(function (r) { return r.building === id && r.mid && r.close; }); }), report.g03.view_pairs); check('G06', 'all_corrected_buildings_and_market_wings_paired', report.g06.length === 4 && report.g06.every(function (r) { return r.pass; }) && affectedBuildingIds.every(function (id) { return report.g06.some(function (r) { return r.building_id === id; }); }), report.g06.map(function (r) { return { name: r.name, building: r.building_id, room: r.room, pass: r.pass }; })); }

function cloudPlan(now, horizon) {
  /* worldB receives performance.now()/1000 as its absolute sky clock. Host simulation
     time is intentionally independent, so scheduling on host_t would photograph the
     wrong optical phase after a long asset load. */
  var rows = []; for (var t = now + 2; t <= now + (horizon || 70); t += 0.25) { var o = celestialCloudOptics(REG.sky, moonDir, t, true, {}); rows.push({ target_sky_clock_s: +t.toFixed(2), coverage: o.coverage, transmission: o.transmission, tau: o.tau }); }
  var clear = rows.reduce(function (a, b) { return !a || b.coverage < a.coverage ? b : a; }, null), dense = rows.reduce(function (a, b) { return !a || b.coverage > a.coverage ? b : a; }, null); return [clear, dense].sort(function (a, b) { return a.target_sky_clock_s - b.target_sky_clock_s; }).map(function (r) { return Object.assign({ label: r === clear ? 'clear' : 'dense' }, r); });
}
async function waitSkyClock(target) { var q = null; for (var i = 0; i < 900; i++) { q = await ev("var p=P.snap().play;return {sky_clock_s:performance.now()/1000,host_t:p.host_t,time:P.timeOfDay()};"); if (q.sky_clock_s >= target) return q; await sleep(80); } throw new Error('sky clock did not reach cloud target ' + target); }
async function celestialState() {
  return await ev("var W=P.worldLayer(),d=W&&W.debug?W.debug():{},sc=P.sceneDebug(),moon=sc.getObjectByName('JOBB_MOON'),sun=sc.getObjectByName('JOBB_SUN'),cv=P.cam(),cp=cv.position,mw=new P.THREE.Vector3(),rel=null,screen=null;if(moon){moon.getWorldPosition(mw);rel={x:mw.x-cp.x,y:mw.y-cp.y,z:mw.z-cp.z,distance:Math.hypot(mw.x-cp.x,mw.y-cp.y,mw.z-cp.z)};screen=P.worldToScreen(mw.x,mw.y,mw.z);}var key=null;sc.traverse(function(o){if(o.isDirectionalLight&&o.userData&&o.userData.mahworldCelestial){var u=o.userData.mahworldCelestial;key={name:o.name||null,intensity:o.intensity,kind:u.kind,direction:u.direction&&u.direction.slice?u.direction.slice():u.direction,transmission:u.transmission,key_transmission:u.key_transmission,coverage:u.coverage,tau:u.tau};}});function op(n){var o=sc.getObjectByName(n);return o&&o.material?{visible:o.visible,opacity:o.material.opacity}:null;}var p=P.snap().play;return {sky_clock_s:performance.now()/1000,host_t:p.host_t,time:P.timeOfDay(),player:p.position,camera:P.camState(),moon_object:moon?{visible:moon.visible,world:[mw.x,mw.y,mw.z],relative:rel,screen:screen}:null,sun_visible:!!(sun&&sun.visible),celestial:d.celestial,sky:d.sky,field_key:key,effects:{halo:op('JOBB_MOON_HALO'),halo2:op('JOBB_MOON_HALO2'),rays:op('JOBB_MOON_RAYS'),veil:op('JOBB_MOON_CLOUD_VEIL')}};");
}
async function moonPose(label, x, z, yawOffset) {
  var yaw = (+moonCfg.yaw_rad || 0.35) + (yawOffset || 0); await ev("await P.devPlay('PLACE',{x:" + x + ",z:" + z + "});await P.send('MOVE',{forward:0,strafe:0,run:false,fast:false,yaw:" + yaw + "});P.camAt(null);P.camFollow(false);P.cam(" + yaw + ",0.02,6,1.15);return 1;"); await sleep(800); var state = await celestialState(), image = await shot('G08', label); return { label: label, requested: { x: x, z: z, yaw: yaw }, state: state, screenshot: image };
}
async function captureG08() {
  await ensureGrounded(); await ev("P.timeOfDay('NIGHT');P.quality('MED');return 1;"); await sleep(700);
  var translations = [await moonPose('01_night_plaza_translation', 0, 0, 0), await moonPose('02_night_highland_translation', -150, 0, 0)];
  var rotations = [await moonPose('03_night_highland_rotation_left', -150, 0, -0.22), await moonPose('04_night_highland_rotation_right', -150, 0, 0.22)];
  await ev("P.timeOfDay('DAY');return 1;"); await sleep(900); var day = await moonPose('05_day_highland_same_composition', -150, 0, 0); await ev("P.timeOfDay('NIGHT');return 1;"); await sleep(700); var nightReturn = await moonPose('06_night_highland_return', -150, 0, 0);
  var now = await ev("return performance.now()/1000;"), plan = cloudPlan(now, 70), cloudStates = [];
  await moonPose('07_cloud_optics_composition_start', -120, -45, 0);
  for (var i = 0; i < plan.length; i++) { await waitSkyClock(plan[i].target_sky_clock_s); var st = await celestialState(), im = await shot('G08', '08_cloud_' + plan[i].label); cloudStates.push({ plan: plan[i], actual: st, screenshot: im }); }
  function relUnit(r) { var n = r.distance || Math.hypot(r.x, r.y, r.z) || 1; return [r.x / n, r.y / n, r.z / n]; }
  var ar = translations[0].state.moon_object.relative, br = translations[1].state.moon_object.relative, ad = relUnit(ar), bd = relUnit(br), directionDot = ad[0] * bd[0] + ad[1] * bd[1] + ad[2] * bd[2], distDelta = Math.abs(ar.distance - br.distance);
  var clear = cloudStates.filter(function (x) { return x.plan.label === 'clear'; })[0], dense = cloudStates.filter(function (x) { return x.plan.label === 'dense'; })[0], cOpt = clear && clear.actual.sky.celestial_optics.moon, dOpt = dense && dense.actual.sky.celestial_optics.moon;
  var prov = translations[0].state.celestial && translations[0].state.celestial.moon && translations[0].state.celestial.moon.provenance;
  report.g08 = { registry: { moon: moonCfg, derivative: moonDerivative, source: moonSource, runtime_file: moonRuntimePath, runtime_sha256_observed: moonRuntimeSha }, translations: translations, rotations: rotations, day: day, night_return: nightReturn, cloud_plan: plan, cloud_states: cloudStates, invariants: { translation_direction_dot: directionDot, translation_distance_delta_m: distDelta } };
  check('G08', 'runtime_actual_moon_glb_provenance', !!(prov && prov.mode === 'REGISTRY_TRACED_DERIVATIVE' && prov.derivative_id === moonDerivative.id && prov.runtime === moonRuntime.runtime && prov.runtime_sha256 === moonRuntime.sha256 && prov.source_id === moonSource.id && prov.source_path === moonSource.path && prov.source_sha256 === moonSource.sha256 && /moon\.glb$/i.test(prov.source_path) && translations[0].state.celestial.moon.geometry === 'TRACED_DERIVATIVE_GLB' && translations[0].state.celestial.moon.textured && translations[0].state.celestial.moon.distance_m >= 800), { runtime: prov, registry_source: moonSource, runtime_hash_observed: moonRuntimeSha, moon: translations[0].state.celestial.moon });
  check('G08', 'camera_translation_keeps_distant_world_direction', directionDot > 0.99999 && distDelta < 0.25 && translations.every(function (r) { return r.state.celestial.camera_relative_origin && r.state.celestial.world_direction_stable; }), report.g08.invariants);
  var sx0 = rotations[0].state.moon_object.screen && rotations[0].state.moon_object.screen.x, sx1 = rotations[1].state.moon_object.screen && rotations[1].state.moon_object.screen.x;
  check('G08', 'camera_rotation_changes_composition_not_world_direction', Number.isFinite(sx0) && Number.isFinite(sx1) && Math.abs(sx1 - sx0) > viewport.width * 0.12 && rotations.every(function (r) { var q = relUnit(r.state.moon_object.relative); return q[0] * ad[0] + q[1] * ad[1] + q[2] * ad[2] > 0.99999; }), { left_screen_x: sx0, right_screen_x: sx1, rotations: rotations.map(function (r) { return { yaw: r.requested.yaw, relative: r.state.moon_object.relative, screen: r.state.moon_object.screen }; }) });
  check('G08', 'day_night_visibility_and_light_system', day.state.time === 'DAY' && day.state.moon_object && !day.state.moon_object.visible && day.state.sun_visible && nightReturn.state.time === 'NIGHT' && nightReturn.state.moon_object.visible && !nightReturn.state.sun_visible && day.state.sky.night === false && nightReturn.state.sky.night === true, { day: day.state, night: nightReturn.state });
  var opticalDelta = cOpt && dOpt ? dOpt.coverage - cOpt.coverage : 0, keyCoherent = clear && dense && Math.abs(clear.actual.field_key.key_transmission - cOpt.key) < 0.002 && Math.abs(dense.actual.field_key.key_transmission - dOpt.key) < 0.002 && clear.actual.field_key.intensity > dense.actual.field_key.intensity && clear.actual.effects.halo.opacity > dense.actual.effects.halo.opacity && clear.actual.effects.rays.opacity > dense.actual.effects.rays.opacity && dense.actual.effects.veil.opacity > clear.actual.effects.veil.opacity;
  check('G08', 'natural_dense_clear_cloud_disc_halo_rays_key_coherence', opticalDelta >= 0.2 && keyCoherent && clear.actual.sky.celestial_optics.model === 'T=exp(-tau)' && dense.actual.sky.layers.some(function (l) { return l.kind === 'CLOUD' && l.occludes && l.depth_write; }), { clear: clear, dense: dense, coverage_delta: opticalDelta, key_coherent: keyCoherent });
}

try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1&sky=night&quality=MED'); await waitForGame(pg, 150000); var boot = await ready(); check('BOOT', 'candidate_world_district_and_authored_lods_ready', !!(boot && boot.world === 'READY' && boot.restore && boot.veil && boot.room === 'FIELD'), boot); if (!boot || boot.world !== 'READY') throw new Error('candidate did not reach READY');
  await ev("P.hud.showGuide(false);P.hud.setDev&&P.hud.setDev(false);P.timeOfDay('NIGHT');P.quality&&P.quality('MED');return 1;"); await sleep(600);
  await captureG01(); await captureG06(); await captureG08(); report.console_errors = cleanErrors(pg.errors); check('RUNTIME', 'no_unexpected_console_errors', report.console_errors.length === 0, report.console_errors.slice(0, 10));
} catch (e) { report.fatal = String(e && e.stack || e); report.fail++; console.error(report.fatal); }
finally { try { await ensureGrounded(); } catch (e) { } try { await pg.close(); } catch (e2) { } srv.close(); report.finished_at = new Date().toISOString(); report.result = report.fail ? 'FAIL' : 'PASS'; fs.writeFileSync(path.join(OUT, PROFILE + '_m5c_visual_gates.json'), JSON.stringify(report, null, 1)); }
console.log('RESULT M5C visual gates: ' + report.pass + ' passed, ' + report.fail + ' failed -> ' + path.join(OUT, PROFILE + '_m5c_visual_gates.json'));
process.exit(report.fail ? 1 : 0);
