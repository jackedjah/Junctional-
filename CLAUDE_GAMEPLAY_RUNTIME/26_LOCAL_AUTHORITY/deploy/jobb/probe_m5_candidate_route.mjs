/* Astra M5 candidate-route acceptance. This drives the ordinary shipped controller through the complete
   NIGHT-first mainland route: no placement shortcut and no alternate world. It proves the five sanctuary
   arrivals, representative public-room transactions, form-specific exercise motion, two-hand barbell
   ownership and press-throw return, flight brake/hover/landing, ecology, resources, menus and cleanup.

   node 26_LOCAL_AUTHORITY/deploy/jobb/probe_m5_candidate_route.mjs \
     [--dist 26_LOCAL_AUTHORITY/deploy/static_dist] \
     [--out 25_HANDOFF/CONVERGENCE/astra_m5/candidate_route] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';

var HERE = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HERE, '..', '..', '..');
var argv = process.argv.slice(2);
function arg(k, d) { var i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; }
var DIST = path.resolve(arg('--dist', path.join(ROOT, '26_LOCAL_AUTHORITY', 'deploy', 'static_dist')));
var OUT = path.resolve(arg('--out', path.join(ROOT, '25_HANDOFF', 'CONVERGENCE', 'astra_m5', 'candidate_route')));
fs.mkdirSync(OUT, { recursive: true });

/* Door truth belongs to the shipped district manifest. Prefer the copy inside the
   candidate under test, then fall back to the working tree for source-only runs. */
function candidateDataPath(parts) {
  var packed = path.join.apply(path, [DIST, 'CLAUDE_GAMEPLAY_RUNTIME'].concat(parts));
  return fs.existsSync(packed) ? packed : path.join.apply(path, [ROOT].concat(parts));
}
var DISTRICT_PATH = candidateDataPath(['26_LOCAL_AUTHORITY', 'lab', 'assets', 'buildings', 'district_v1.json']);
var TUNING_PATH = candidateDataPath(['00_CORE', 'dev_tuning.dev.json']);
var DISTRICT_MANIFEST = JSON.parse(fs.readFileSync(DISTRICT_PATH, 'utf8'));
var DEV_TUNING = JSON.parse(fs.readFileSync(TUNING_PATH, 'utf8'));
function portalRecord(id) {
  var found = null;
  (DISTRICT_MANIFEST.buildings || []).some(function (building) {
    return (building.portals || []).some(function (portal) {
      if (portal.id !== id) return false;
      found = { building: building.id, portal: portal };
      return true;
    });
  });
  if (!found || !found.portal.world || !found.portal.outward) throw new Error('candidate route: missing district portal ' + id + ' in ' + DISTRICT_PATH);
  return found;
}
function grandRoomSpec(name, door, room) {
  var record = portalRecord(door), rooms = DEV_TUNING.local_authority && DEV_TUNING.local_authority.play && DEV_TUNING.local_authority.play.rooms;
  var cfg = rooms && rooms[room], exit = cfg && cfg.exit && cfg.exit.position;
  if (!exit) throw new Error('candidate route: missing exit for ' + room + ' in ' + TUNING_PATH);
  return { name: name, door: door, room: room, building: record.building, doorAt: record.portal.world.slice(), outward: record.portal.outward.slice(), exit: [exit.x, exit.z] };
}
function approachPoint(spec, metres) {
  metres = metres === undefined ? 0.8 : metres;
  return [spec.doorAt[0] + spec.outward[0] * metres, spec.doorAt[1] + spec.outward[1] * metres];
}
var GRAND_ROOMS = {
  temple: grandRoomSpec('gold_temple', 'TEMPLE_DOOR', 'TEMPLE_HALL'),
  clothing: grandRoomSpec('clothing_shop', 'CLOTHING_DOOR', 'CLOTHING_SHOP'),
  weapon: grandRoomSpec('weapon_shop', 'WEAPON_DOOR', 'WEAPON_SHOP'),
  tower: grandRoomSpec('blue_tower', 'TOWER_DOOR', 'TOWER_HALL')
};

var report = {
  generated_at: new Date().toISOString(),
  source: 'ordinary local static_dist candidate',
  capture_method: 'normal P.goTo controller traversal and normal P.interact confirmation transactions; no placement shortcut',
  query: { field: '1', sky: 'night', quality: 'MED' },
  checks: [], route: [], sanctuary_arrivals: {}, interiors: [], menu: [], forms: [], exercises: [],
  hud_modes: {}, camera: { sweeps: [] }, room_lifecycle: {}, form_elevations: {},
  equipment: {}, flight: {}, transit_flights: [], resources: {}, ecology: {}, time_states: {}, screenshots: [],
  console_errors: [], runtime_errors: [], cleanup: null, fatal: null,
  proof_sources: { district_manifest: DISTRICT_PATH, room_tuning: TUNING_PATH }
};
var pass = 0, fail = 0;
function ok(id, cond, detail) {
  (cond ? pass++ : fail++);
  var row = { id: id, pass: !!cond, detail: detail };
  report.checks.push(row);
  console.log((cond ? 'PASS ' : 'FAIL ') + id + (detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1100)));
  return !!cond;
}

var srv = null, pg = null;
async function ev(src) { return await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; " + src + " })()"); }
async function shot(name) {
  var file = path.join(OUT, name + '.png');
  await pg.screenshot(file);
  report.screenshots.push(name + '.png');
  console.log('SHOT ' + name);
  return file;
}
async function waitReady() {
  for (var i = 0; i < 300; i++) {
    var q = await ev("var w=P.world?P.world():null, s=P.warmState?P.warmState():null, r=P.restoreState?P.restoreState():null; return {world:w&&w.status,warm:!!(s&&s.world_done),warm_error:s&&s.world_err,restore:!!(r&&r.done),room:P.snap().play.room,tod:P.timeOfDay?P.timeOfDay():null};");
    if (q.world === 'READY' && q.warm && q.restore && q.room === 'FIELD') return q;
    if (q.world === 'FAILED') return q;
    await sleep(500);
  }
  return null;
}
async function stop() { return await ev("return P.send('MOVE',{forward:0,strafe:0,run:false,fast:false});"); }
async function pos() { return await ev("var p=P.snap().play,f=p.flight||{}; return {x:p.position.x,z:p.position.z,room:p.room,form:p.form,transforming:!!p.transforming,defeat:!!p.defeat,defeats:p.stats&&p.stats.defeats||0,hp:p.rules&&p.rules.me?p.rules.me.hp:null,flying:!!f.powered,ground:f.ground,altitude:f.altitude,height_above_ground:f.height_above_ground};"); }
async function rendererCensus() {
  return await ev("var r=P.rendererDebug(),i=r&&r.info,sc=P.sceneDebug(),objects=0,skinned=0,meshes=0; if(sc)sc.traverse(function(o){objects++;if(o.isSkinnedMesh)skinned++;if(o.isMesh)meshes++;}); var t=P.transaction(); return {geometries:i&&i.memory?i.memory.geometries:null,textures:i&&i.memory?i.memory.textures:null,programs:i&&i.programs?i.programs.length:null,objects:objects,meshes:meshes,skinned:skinned,room_build:t&&t.room_build?t.room_build:null,room_resources:t&&t.room_resources?t.room_resources:null,last_room_clear:t&&t.last_room_clear?t.last_room_clear:null};");
}
async function hostTick() { return await ev("var H=window.MAHWORLD_STATIC_HOST,L=H&&H.host&&H.host.dev?H.host.dev.log():[]; return L.length?L[L.length-1].tick:0;"); }
async function hostEvents(since, kinds) {
  return await ev("var H=window.MAHWORLD_STATIC_HOST,L=H&&H.host&&H.host.dev?H.host.dev.log():[],K=" + JSON.stringify(kinds || []) + "; return L.filter(function(e){return e.tick>=" + (+since || 0) + "&&(!K.length||K.indexOf(e.kind)>=0);});");
}

/* Every row records the controller's own result plus an independently measured final distance. */
async function nav(id, x, z, opt) {
  opt = opt || {};
  await ev("window.__m5Phase='NAV:" + id + "'; return 1;");
  await stop();
  var from = await pos();
  var result = null, error = null;
  try { result = await ev("return await P.goTo(" + x + "," + z + ",undefined,undefined," + (opt.timeout || 90000) + ");"); }
  catch (e) { error = String(e && e.message || e); }
  var final = await pos();
  var distance = +Math.hypot(final.x - x, final.z - z).toFixed(3);
  var reached = !error && final.room === 'FIELD' && !final.defeat && (final.hp === null || final.hp > 0) && !!(result && result.reached) && distance <= 1.2;
  var row = { id: id, target: [x, z], from: [from.x, from.z], final: [final.x, final.z], distance_m: distance, controller: result, room: final.room, reached: reached, auxiliary: !!opt.aux, from_vitals: { defeat: from.defeat, defeats: from.defeats, hp: from.hp }, final_vitals: { defeat: final.defeat, defeats: final.defeats, hp: final.hp }, error: error };
  report.route.push(row);
  if (opt.sanctuary) report.sanctuary_arrivals[opt.sanctuary] = row;
  console.log((reached ? 'NAV  ' : 'NAV! ') + id + ' -> ' + x + ',' + z + ' d=' + distance + 'm' + (result ? ' passes=' + result.passes : ''));
  return row;
}

async function ensureForm(want, label) {
  var attempts = [], deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    var s = await pos();
    if (s.form === want && !s.transforming) { var done = { label: label, want: want, reached: true, attempts: attempts, final: s }; report.forms.push(done); return done; }
    if (!s.transforming) {
      var r = await ev("return P.send('TRANSFORM',{to:'" + want + "'});");
      attempts.push(r);
      if (r && !r.accepted && r.reason && !/MIN_DWELL|TRANSFORM/.test(r.reason)) break;
    }
    await sleep(450);
  }
  var final = await pos(); var out = { label: label, want: want, reached: final.form === want && !final.transforming, attempts: attempts, final: final }; report.forms.push(out); return out;
}
async function exercise(id, expectedForm, shotName) {
  await stop();
  var started = await ev("return P.send('EMOTE',{emote_id:'" + id + "'});");
  await sleep(650);
  var state = await ev("var p=P.snap().play; return {form:p.form,emote:p.emote,transforming:!!p.transforming,flight:!!(p.flight&&p.flight.powered)};");
  if (shotName) await shot(shotName);
  var stopped = await ev("return P.send('EMOTE_STOP',{});");
  await sleep(450);
  var after = await ev("var p=P.snap().play; return {form:p.form,emote:p.emote,transforming:!!p.transforming};");
  var row = { id: id, expected_form: expectedForm, started: started, during: state, stopped: stopped, after: after, pass: !!(started && (started.accepted || started.ok) && state.form === expectedForm && state.emote === id && stopped && (stopped.accepted || stopped.ok) && !after.emote) };
  report.exercises.push(row);
  return row;
}

/* Room exits restore the avatar exactly on the exterior threshold. Clear the
   doorway with the same sustained MOVE input a player would use before asking
   the path controller for the next long leg; otherwise the first long diagonal
   can press the capsule into the jamb instead of taking it through the opening. */
async function clearDoor(doorAt, outward) {
  var ox = +outward[0], oz = +outward[1], mag = Math.hypot(ox, oz) || 1;
  ox /= mag; oz /= mag;
  var before = await pos();
  var move = await ev("return P.send('MOVE',{forward:" + (-oz).toFixed(5) + ",strafe:" + ox.toFixed(5) + ",run:false,fast:false,yaw:" + Math.atan2(ox, -oz).toFixed(5) + "});");
  await sleep(1400);
  var halt = await stop();
  await sleep(250);
  var after = await pos();
  var projected = +((after.x - doorAt[0]) * ox + (after.z - doorAt[1]) * oz).toFixed(3);
  var lateral = +Math.abs((after.x - doorAt[0]) * -oz + (after.z - doorAt[1]) * ox).toFixed(3);
  var travelled = +Math.hypot(after.x - before.x, after.z - before.z).toFixed(3);
  return { outward: [ox, oz], before: before, move: move, halt: halt, after: after, projected_clearance_m: projected, lateral_drift_m: lateral, travelled_m: travelled, pass: !!(move && move.accepted && halt && halt.accepted && after.room === 'FIELD' && !after.defeat && projected >= 1.2 && travelled >= 1.2 && lateral <= 0.75) };
}

async function visitRoom(spec) {
  var p0 = await ev("var p=P.snap().play; return {room:p.room,pos:p.position,camera:P.camState?P.camState():null,prompts:(p.prompts||[]).map(function(x){return {id:x.id,intent:x.intent,to:x.to,label:x.label,eligible:x.eligible};})};");
  p0.census = await rendererCensus();
  var prompt = p0.prompts.filter(function (x) { return x.id === spec.door && x.intent === 'ENTER'; })[0] || null;
  var enterPending = ev("return P.interact();");
  await sleep(380);
  var confirmIn = await ev("return {open:P.hud.confirmOpen?P.hud.confirmOpen():null,answered:P.confirmAnswer(true)};");
  var enter = await enterPending;
  await sleep(450);
  var inside = await ev("var p=P.snap().play,t=P.transaction(); return {room:p.room,pos:p.position,interior:!!p.room_interior,camera:P.camState?P.camState():null,transaction:t.state,room_build:t.room_build,log:t.log.slice(-12)};");
  await shot('room_' + spec.name + '_inside');
  inside.census = await rendererCensus();
  var exitWalk = await ev("return await P.goTo(" + spec.exit[0] + "," + spec.exit[1] + ",undefined,undefined,30000);");
  await sleep(250);
  var beforeExit = await ev("var p=P.snap().play; return {room:p.room,pos:p.position,camera:P.camState?P.camState():null,prompts:(p.prompts||[]).map(function(x){return {id:x.id,intent:x.intent,to:x.to,label:x.label,eligible:x.eligible};})};");
  var exitPrompt = beforeExit.prompts.filter(function (x) { return x.intent === 'ENTER_ROOM' && x.to === 'FIELD' && x.eligible; })[0] || null;
  var exitPending = ev("return P.interact();");
  await sleep(380);
  var confirmOut = await ev("return {open:P.hud.confirmOpen?P.hud.confirmOpen():null,answered:P.confirmAnswer(true)};");
  var exit = await exitPending;
  await sleep(450);
  var outside = await ev("var p=P.snap().play,t=P.transaction(); return {room:p.room,pos:p.position,camera:P.camState?P.camState():null,transaction:t.state,room_build:t.room_build,log:t.log.slice(-12)};");
  outside.census = await rendererCensus();
  var doorDistance = +Math.hypot(outside.pos.x - spec.doorAt[0], outside.pos.z - spec.doorAt[1]).toFixed(3);
  var clearance = await clearDoor(spec.doorAt, spec.outward);
  var row = {
    name: spec.name, door: spec.door, expected_room: spec.room, before: p0, prompt: prompt,
    confirm_in: confirmIn, enter: enter, inside: inside, exit_walk: exitWalk, before_exit: beforeExit, exit_prompt: exitPrompt,
    confirm_out: confirmOut, exit: exit, outside: outside, door_return_distance_m: doorDistance,
    doorway_clearance: clearance
  };
  var badTransaction = inside.log.concat(outside.log).some(function (x) { return /READY_TIMEOUT|SCENE_FAILED/.test(x.ev || '') || (x.ev === 'END' && x.ok === false); });
  row.bad_transaction = badTransaction;
  row.pass = !!(prompt && prompt.eligible && confirmIn.open && confirmIn.answered && enter && enter.accepted && inside.room === spec.room && inside.interior && inside.room_build && inside.room_build.room === spec.room && !inside.room_build.error && exitWalk && exitWalk.reached && exitPrompt && confirmOut.open && confirmOut.answered && exit && exit.accepted && outside.room === 'FIELD' && doorDistance <= 0.6 && clearance.pass && !badTransaction);
  report.interiors.push(row);
  console.log((row.pass ? 'ROOM ' : 'ROOM!') + spec.name + ' ' + spec.room + ' -> FIELD');
  return row;
}

async function hudVisibility() {
  return await ev("function see(id){var el=document.getElementById(id);if(!el)return {id:id,exists:false,visible:false};var c=getComputedStyle(el),r=el.getBoundingClientRect();return {id:id,exists:true,visible:c.display!=='none'&&c.visibility!=='hidden'&&parseFloat(c.opacity||'1')>0.04&&r.width>0&&r.height>0,display:c.display,width:+r.width.toFixed(1),height:+r.height.toFixed(1)};} var essential=['g-vitals','g-vitals-r','g-state','g-menubt','g-erty','g-cluster','g-fly','g-guard'].map(see),secondary=['g-mahguide','g-utils','g-swordbt','g-gear','g-cue'].map(see);return {mode:P.hud.hudMode(),body_minimal:document.body.classList.contains('hud-minimal'),stored:(function(){try{return localStorage.getItem('mahworld-hud-mode');}catch(e){return null;}})(),toggle_text:(document.getElementById('g-hudmode')||{}).textContent||'',essential:essential,secondary:secondary};");
}
async function proveHudModes() {
  await ev("return P.hud.hudMode(false);"); await sleep(180); var full0 = await hudVisibility();
  var toMinimal = await ev("return P.hud.hudMode(true);"); await sleep(180); var minimal = await hudVisibility(); await shot('00b_hud_minimal');
  var toFull = await ev("return P.hud.hudMode(false);"); await sleep(180); var full1 = await hudVisibility(); await shot('00c_hud_full');
  var mustHide = ['g-mahguide', 'g-utils', 'g-swordbt'];
  var out = { initial_full: full0, toggle_minimal: toMinimal, minimal: minimal, toggle_full: toFull, restored_full: full1 };
  out.pass = !!(toMinimal && toMinimal.mode === 'MINIMAL' && minimal.body_minimal && minimal.stored === 'MINIMAL' && minimal.essential.every(function (x) { return x.exists && x.visible; }) && mustHide.every(function (id) { var x = minimal.secondary.filter(function (q) { return q.id === id; })[0]; return x && x.exists && !x.visible; }) && toFull && toFull.mode === 'FULL' && !full1.body_minimal && full1.stored === 'FULL' && full1.essential.every(function (x) { return x.exists && x.visible; }) && mustHide.every(function (id) { var x = full1.secondary.filter(function (q) { return q.id === id; })[0]; return x && x.visible; }));
  report.hud_modes = out;
  return out;
}

/* Rotate through the same persistent manual-look path used by a real drag. At a
   façade threshold at least one boom direction must shorten against the wall,
   then recover to full distance, without ever placing the camera in geometry. */
async function cameraObstructionSweep(label) {
  var start = await ev("return P.camState();"), samples = [];
  for (var i = 0; i < 20; i++) {
    await ev("P.camOrbit(" + (Math.PI / 8).toFixed(7) + ",0); return 1;");
    await sleep(160);
    samples.push(await ev("return P.camState();"));
  }
  var blockedIndex = samples.findIndex(function (x) { return x && (x.obstructed || x.applied < x.dist - 0.2); });
  var recoveredIndex = samples.findIndex(function (x, i) { return i > blockedIndex && x && !x.obstructed && x.applied >= x.dist - 0.2; });
  var out = { label: label, start: start, samples: samples, blocked_index: blockedIndex, recovered_index: recoveredIndex };
  out.pass = !!(start && start.state === 'ORBIT' && blockedIndex >= 0 && recoveredIndex > blockedIndex && samples.every(function (x) { return x && x.state === 'ORBIT' && !x.inside && !x.below_ground; }));
  report.camera.sweeps.push(out);
  return out;
}

async function observeBarbell(barId, ms) {
  var states = {}, projectiles = [], frames = [];
  for (var t = 0; t < ms; t += 25) {
    await sleep(25);
    var q = await ev("var p=P.snap().play,e=p.equipment||{manifested:[]},r=p.rules||{}; return {item:(e.manifested||[]).filter(function(x){return x.id==='" + barId + "';})[0]||null,held:e.held||null,cast:r.me&&r.me.cast?r.me.cast:null,projectiles:(r.entities||[]).filter(function(x){return x.type==='PROJECTILE'&&x.skill==='ATHLETE_BARBELL_PRESS_THROW';}).map(function(x){return {id:x.projectile_id||x.id,cast_id:x.cast_id,equipment_ids:x.equipment_ids||[],x:x.position&&x.position.x,y:x.y,z:x.position&&x.position.z};})};");
    frames.push(q);
    if (q.item) states[q.item.state] = (states[q.item.state] || 0) + 1;
    q.projectiles.forEach(function (x) { if (!projectiles.some(function (y) { return y.id === x.id && y.cast_id === x.cast_id; })) projectiles.push(x); });
  }
  return { states: states, projectiles: projectiles, frames: frames };
}

async function observeEquipment(ids, skill, ms) {
  var states = {}, projectiles = [], first = null, last = null;
  ids.forEach(function (id) { states[id] = {}; });
  for (var t = 0; t < ms; t += 25) {
    await sleep(25);
    var q = await ev("var p=P.snap().play,e=p.equipment||{manifested:[]},r=p.rules||{},W=P.worldLayer(),g=W&&W.gear&&W.gear(),gd=g&&g.debug?g.debug():null;return {items:(e.manifested||[]).filter(function(x){return " + JSON.stringify(ids) + ".indexOf(x.id)>=0;}),gear:gd&&gd.grips||[],held:e.held||null,cast:r.me&&r.me.cast?r.me.cast:null,projectiles:(r.entities||[]).filter(function(x){return x.type==='PROJECTILE'&&x.skill==='" + skill + "';}).map(function(x){return {id:x.projectile_id||x.id,cast_id:x.cast_id,equipment_ids:x.equipment_ids||[],x:x.position&&x.position.x,y:x.y,z:x.position&&x.position.z};})};");
    if (!first) first = q; last = q;
    q.items.forEach(function (it) { if (states[it.id]) states[it.id][it.state] = (states[it.id][it.state] || 0) + 1; });
    q.gear.forEach(function (it) { if (states[it.id]) states[it.id][it.state] = (states[it.id][it.state] || 0) + 1; });
    q.projectiles.forEach(function (x) { if (!projectiles.some(function (y) { return y.id === x.id && y.cast_id === x.cast_id; })) projectiles.push(x); });
  }
  return { states: states, projectiles: projectiles, first: first, last: last, samples: Math.ceil(ms / 25) };
}

async function doGuideDumbbell() {
  await ev("P.send('LOCK_TARGET',{aim_id:null});P.send('EQUIP_DISMISS',{});return 1;"); await sleep(900);
  var guide0 = await ev("var W=P.worldLayer(),g=W&&W.guides&&W.guides();return g&&g.debug?g.debug():null;");
  if (!(guide0 && guide0.on_stage && guide0.current)) await ev("P.hud.doButton('mahguide',document.getElementById('g-mahguide'));return 1;");
  var guideVisible = null;
  for (var gw = 0; gw < 80; gw++) { guideVisible = await ev("var W=P.worldLayer(),g=W&&W.guides&&W.guides();return g&&g.debug?g.debug():null;"); if (guideVisible && guideVisible.visible && guideVisible.on_stage && guideVisible.current) break; await sleep(250); }
  var manifest = await ev("return P.send('EQUIP_MANIFEST',{kind:'DUMBBELL',count:2});");
  await sleep(360);
  var guideCast = await ev("var W=P.worldLayer(),g=W&&W.guides&&W.guides();return g&&g.debug?g.debug():null;");
  await shot('gear_guide_dumbbell_cast');
  await sleep(1250);
  var floating = await ev("var e=P.snap().play.equipment;return (e&&e.manifested||[]).filter(function(x){return x.kind==='DUMBBELL';});");
  var pickups = [];
  for (var i = 0; i < floating.length; i++) { pickups.push(await ev("return P.send('EQUIP_PICKUP',{id:'" + floating[i].id + "'});")); await sleep(90); }
  await sleep(500);
  var gripDebug = await ev("var W=P.worldLayer(),g=W&&W.gear&&W.gear();return g&&g.debug?g.debug():null;");
  await shot('gear_true_dumbbell_grips');
  await ev("P.send('MOVE',{forward:0,strafe:0,run:false,yaw:0});return 1;");
  var lock = await ev("return P.send('LOCK_TARGET',{aim_id:'FIELD_DUMMY'});");
  var practice = await ev("return P.send('FIELD_PRACTICE',{on:true});"); await sleep(180);
  var tick0 = await hostTick();
  var cast = await ev("return P.send('RULES_CAST',{skill_id:'ATHLETE_X_WAVE'});");
  var ids = floating.map(function (x) { return x.id; });
  var observed = ids.length === 2 ? await observeEquipment(ids, 'ATHLETE_X_WAVE', 2900) : { states: {}, projectiles: [] };
  var final = await ev("var p=P.snap().play;return {equipment:p.equipment,entities:p.rules?(p.rules.entities||[]):[],dummy:(p.rules&&p.rules.others||[]).filter(function(x){return x.id==='FIELD_DUMMY';})[0]||null};");
  var events = await hostEvents(tick0, ['R1723_DAMAGE', 'R1723_MISS', 'EQUIP_SPECIAL_STATE']);
  var damage = cast ? events.filter(function (x) { return x.kind === 'R1723_DAMAGE' && x.cast_id === cast.cast_id && x.on === 'FIELD_DUMMY'; }) : [];
  var grips = gripDebug ? (gripDebug.grips || []).filter(function (x) { return ids.indexOf(x.id) >= 0; }) : [];
  var returnedByEvent = ids.every(function (id) { return events.some(function (x) { return x.kind === 'EQUIP_SPECIAL_STATE' && x.equipment_id === id && x.cast_id === (cast && cast.cast_id) && x.from === 'PROJECTILE' && x.to === 'RETURNING'; }); });
  var remaining = cast ? final.entities.filter(function (x) { return x.type === 'PROJECTILE' && x.cast_id === cast.cast_id; }) : [];
  var practiceOff = await ev("return P.send('FIELD_PRACTICE',{on:false});");
  var out = { guide_before: guide0, guide_visible: guideVisible, guide_cast: guideCast, manifest: manifest, floating: floating, pickups: pickups, ids: ids, grips: grips, lock: lock, practice: practice, cast: cast, states: observed.states, projectiles: observed.projectiles, events: events, returned_by_event: returnedByEvent, damage: damage, remaining_projectiles: remaining, final: final.equipment, practice_off: practiceOff };
  var sockets = grips.map(function (g) { return g.grip && g.grip.sockets && g.grip.sockets[0]; }).sort().join('|');
  out.pass = !!(guideVisible && guideVisible.visible && guideVisible.on_stage && guideCast && guideCast.cast && guideCast.cast.weight > 0.15 && manifest && manifest.accepted && ids.length === 2 && pickups.length === 2 && pickups.every(function (x) { return x && x.accepted; }) && grips.length === 2 && sockets === 'HAND_L|HAND_R' && grips.every(function (g) { return g.grip && g.grip.palm_error_m === 0; }) && lock && lock.accepted && lock.locked === 'FIELD_DUMMY' && practice && practice.accepted && cast && cast.accepted && ids.every(function (id) { var s = observed.states[id] || {}; return s.IN_SPECIAL; }) && returnedByEvent && observed.projectiles.some(function (p) { return p.cast_id === cast.cast_id && ids.every(function (id) { return (p.equipment_ids || []).indexOf(id) >= 0; }); }) && damage.some(function (x) { return x.gear_special === true && x.applied > 0; }) && remaining.length === 0 && final.equipment && final.equipment.held && final.equipment.held.count === 2 && ids.every(function (id) { return final.equipment.held.ids.indexOf(id) >= 0; }) && final.equipment.manifested.length === 2 && practiceOff && practiceOff.accepted);
  report.equipment.dumbbell = out;
  return out;
}

async function doBandManifestOnly() {
  await ev("P.send('LOCK_TARGET',{aim_id:null});P.send('EQUIP_DISMISS',{});return 1;"); await sleep(900);
  var manifest = await ev("return P.send('EQUIP_MANIFEST',{kind:'BAND',count:1});"); await sleep(1300);
  var state = await ev("var p=P.snap().play,W=P.worldLayer(),g=W&&W.gear&&W.gear(),skills=p.rules&&p.rules.skills&&p.rules.skills.SPECIAL_MAGIC||[];return {equipment:p.equipment,gear:g&&g.debug?g.debug():null,specials:skills.map(function(x){return x.id||x;})};");
  await shot('gear_band_manifest_only');
  var item = state.equipment && (state.equipment.manifested || []).filter(function (x) { return x.kind === 'BAND'; })[0];
  var dismiss = await ev("return P.send('EQUIP_DISMISS',{});"); await sleep(950);
  var after = await ev("return P.snap().play.equipment;");
  var out = { policy: 'manifest/display/dismiss only — no owner-approved BAND move set', manifest: manifest, state: state, dismiss: dismiss, after: after };
  out.pass = !!(manifest && manifest.accepted && item && item.state === 'MANIFESTED' && state.gear && state.gear.items.indexOf('BAND:MANIFESTED') >= 0 && /procedural tube/.test(state.gear.band || '') && !state.specials.some(function (id) { return /BAND/.test(id); }) && dismiss && dismiss.accepted && after && after.manifested.length === 0 && !after.held);
  report.equipment.band = out;
  return out;
}

async function doBarbell() {
  await ev("P.send('LOCK_TARGET',{aim_id:null}); P.send('EQUIP_DISMISS',{}); return 1;");
  await sleep(900);
  var manifest = await ev("return P.send('EQUIP_MANIFEST',{kind:'BARBELL',count:1});");
  await sleep(2300);
  var manifested = await ev("var e=P.snap().play.equipment; return e?(e.manifested||[]):[];");
  var bar = manifested.filter(function (x) { return x.kind === 'BARBELL'; })[0] || null;
  var pickup = bar ? await ev("return P.send('EQUIP_PICKUP',{id:'" + bar.id + "'});") : null;
  await sleep(650);
  var gripDebug = await ev("var W=P.worldLayer(),g=W&&W.gear&&W.gear(); return g&&g.debug?g.debug():null;");
  await shot('gear_true_barbell_grip');
  await ev("P.send('MOVE',{forward:0,strafe:0,run:false,yaw:3.14159}); P.send('LOCK_TARGET',{aim_id:null}); return 1;");
  var tick0 = await hostTick();
  var cast = bar ? await ev("return P.send('RULES_CAST',{skill_id:'ATHLETE_BARBELL_PRESS_THROW'});") : null;
  var observed = bar ? await observeBarbell(bar.id, 3300) : { states: {}, projectiles: [], frames: [] };
  var final = await ev("var p=P.snap().play; return {equipment:p.equipment,entities:p.rules?(p.rules.entities||[]):[]};");
  var events = await hostEvents(tick0, ['R1723_DAMAGE', 'R1723_MISS', 'R1723_PROJECTILE_WALL', 'R1723_ENTITY_EXPIRED', 'EQUIP_SPECIAL_STATE']);
  var grip = bar && gripDebug ? (gripDebug.grips || []).filter(function (g) { return g.id === bar.id; })[0] : null;
  var remainingProjectiles = cast ? final.entities.filter(function (x) { return x.type === 'PROJECTILE' && x.cast_id === cast.cast_id; }) : [];
  var projectileIds = observed.projectiles.map(function (x) { return x.id; });
  var castEvents = cast ? events.filter(function (x) { return x.cast_id === cast.cast_id || x.skill === 'ATHLETE_BARBELL_PRESS_THROW' || (x.kind === 'R1723_ENTITY_EXPIRED' && projectileIds.indexOf(x.id) >= 0); }) : [];
  var damage = castEvents.filter(function (x) { return x.kind === 'R1723_DAMAGE'; });
  var miss = castEvents.filter(function (x) { return x.kind === 'R1723_MISS' || x.kind === 'R1723_PROJECTILE_WALL' || x.kind === 'R1723_ENTITY_EXPIRED'; });
  var out = { manifest: manifest, manifested: manifested, id: bar && bar.id, pickup: pickup, grip: grip, cast: cast, states: observed.states, projectiles: observed.projectiles, events: castEvents, deliberate_miss: miss, damage: damage, remaining_projectiles: remainingProjectiles, final: final.equipment };
  out.pass = !!(manifest && (manifest.accepted || manifest.ok) && bar && pickup && (pickup.accepted || pickup.ok) && grip && grip.grip && (grip.grip.sockets || []).join('|') === 'HAND_L|HAND_R' && grip.grip.palm_mid_error_m === 0 && grip.grip.hand_span_m > 0.2 && cast && (cast.accepted || cast.ok) && observed.states.IN_SPECIAL && observed.states.PROJECTILE && observed.states.RETURNING && observed.projectiles.some(function (p) { return p.cast_id === cast.cast_id && (p.equipment_ids || []).indexOf(bar.id) >= 0; }) && miss.length >= 1 && damage.length === 0 && remainingProjectiles.length === 0 && final.equipment && final.equipment.held && final.equipment.held.ids && final.equipment.held.ids.indexOf(bar.id) >= 0 && final.equipment.manifested.length === 1);
  report.equipment.barbell = out;
  return out;
}

async function sampleFlight() {
  return await ev("var p=P.snap().play,e=P.entity('me'),a=e&&e.fused&&e.fused.animator,fb=a&&a.flightBrake?a.flightBrake():null; return {speed:p.speed_mps||0,flight:p.flight||null,brake_pose:fb,pos:p.position};");
}
async function doFlightBrake() {
  await stop();
  var enter = await ev("return P.send('FLIGHT',{op:'ENTER'});");
  await sleep(650);
  var ascend = await ev("return P.send('FLIGHT',{op:'ASCEND'});");
  await sleep(1450);
  var hover0 = await ev("return P.send('FLIGHT',{op:'HOVER'});");
  await sleep(700);
  var seq0 = (await sampleFlight()).flight.brake_seq || 0;
  /* diagonal onto the open TITAN causeway: enough unobstructed runway for the real boost/release edge */
  await ev("P.send('MOVE',{forward:-0.707,strafe:0.707,run:true,fast:true,yaw:2.35619}); return 1;");
  var run = [];
  for (var i = 0; i < 24; i++) { await sleep(120); run.push(await sampleFlight()); }
  var peak = Math.max.apply(null, run.map(function (x) { return x.speed || 0; }));
  var cruise = run.length && run[run.length - 1].flight ? run[run.length - 1].flight.cruise_mps : 0;
  var boostFactor = run.length && run[run.length - 1].flight ? run[run.length - 1].flight.boost_factor || 1 : 1;
  var altBefore = run.length && run[run.length - 1].flight ? run[run.length - 1].flight.altitude : null;
  await ev("P.send('MOVE',{forward:0,strafe:0,run:false,fast:false}); return 1;");
  var release = [];
  for (var q = 0; q < 18; q++) { await sleep(50); release.push(await sampleFlight()); if (q === 3) await shot('flight_brake'); }
  var seq1 = release.length && release[release.length - 1].flight ? release[release.length - 1].flight.brake_seq || 0 : null;
  var posePeak = Math.max.apply(null, release.map(function (x) { return x.brake_pose ? x.brake_pose.amount || 0 : 0; }));
  var hover1 = await ev("return P.send('FLIGHT',{op:'HOVER'});");
  await sleep(650); var hovered = await sampleFlight(); await shot('flight_settled_hover');
  var exit = await ev("return P.send('FLIGHT',{op:'EXIT'});");
  var landed = null;
  for (var w = 0; w < 70; w++) { await sleep(180); landed = await sampleFlight(); if (landed.flight && !landed.flight.powered && !landed.flight.exiting && !landed.flight.falling) break; }
  await shot('flight_landed');
  var altAfter = release.length && release[release.length - 1].flight ? release[release.length - 1].flight.altitude : null;
  var out = { enter: enter, ascend: ascend, hover_start: hover0, hover_after_brake: hover1, exit: exit, run: run, release: release, peak_mps: peak, cruise_mps: cruise, boost_factor: boostFactor, brake_seq: [seq0, seq1], brake_pose_peak: posePeak, altitude: [altBefore, altAfter], hovered: hovered, landed: landed };
  out.pass = !!(enter && enter.accepted && ascend && ascend.accepted && hover0 && hover0.accepted && peak >= cruise * boostFactor * 0.9 && seq1 === seq0 + 1 && release.some(function (x) { return x.flight && x.flight.braking; }) && posePeak > 0.3 && hover1 && hover1.accepted && hovered.flight && hovered.flight.powered && hovered.flight.intent === 0 && !hovered.flight.braking && Math.abs(hovered.flight.vz) <= 0.1 && hovered.flight.hold_alt !== null && Math.abs(hovered.flight.altitude - hovered.flight.hold_alt) <= 0.15 && exit && exit.accepted && landed && landed.flight && !landed.flight.powered && !landed.flight.exiting && !landed.flight.falling && Math.abs(landed.flight.vz) <= 0.05 && (landed.flight.height_above_ground <= 0.05 || !!landed.flight.perch) && Math.abs(altAfter - altBefore) < 0.4);
  report.flight = out;
  return out;
}

/* The authored forest circuit crosses two deliberately hostile Dogkie territories.
   A real player can use low flight to cross/observe those packs without turning a
   world-quality tour into repeated respawns. Keep well below the Phoenix's 30 m
   aerial-aggression threshold, and land again on a safe road/pool edge. */
async function beginLowFlight(label, climbMs) {
  await ev("window.__m5Phase='FLIGHT_BEGIN:" + label + "'; return 1;");
  await stop();
  var enter = await ev("return P.send('FLIGHT',{op:'ENTER'});");
  await sleep(300);
  var ascend = await ev("return P.send('FLIGHT',{op:'ASCEND'});");
  await sleep(climbMs || 1300);
  var hover = await ev("return P.send('FLIGHT',{op:'HOVER'});");
  var state = null;
  for (var settle = 0; settle < 24; settle++) { await sleep(100); state = await sampleFlight(); if (state.flight && state.flight.intent === 0 && Math.abs(state.flight.vz) <= 0.1 && state.flight.hold_alt !== null && Math.abs(state.flight.altitude - state.flight.hold_alt) <= 0.12) break; }
  var row = { label: label, phase: 'BEGIN', enter: enter, ascend: ascend, hover: hover, state: state };
  row.pass = !!(enter && enter.accepted && ascend && ascend.accepted && hover && hover.accepted && state && state.flight && state.flight.powered && state.flight.height_above_ground >= 3 && state.flight.altitude < 25 && state.flight.intent === 0 && Math.abs(state.flight.vz) <= 0.1 && state.flight.hold_alt !== null && Math.abs(state.flight.altitude - state.flight.hold_alt) <= 0.12);
  report.transit_flights.push(row);
  console.log((row.pass ? 'FLY  ' : 'FLY! ') + label + ' low-flight begin h=' + (state.flight && state.flight.height_above_ground));
  return row;
}
async function endLowFlight(label) {
  await ev("window.__m5Phase='FLIGHT_END:" + label + "'; return 1;");
  var exit = await ev("return P.send('FLIGHT',{op:'EXIT'});");
  var state = null;
  for (var i = 0; i < 90; i++) { await sleep(180); state = await sampleFlight(); if (state.flight && !state.flight.powered && !state.flight.exiting && !state.flight.falling) break; }
  var row = { label: label, phase: 'END', exit: exit, state: state };
  row.pass = !!(exit && exit.accepted && state && state.flight && !state.flight.powered && !state.flight.exiting && !state.flight.falling && Math.abs(state.flight.height_above_ground || 0) <= 0.05 && Math.abs(state.flight.vz || 0) <= 0.05);
  report.transit_flights.push(row);
  console.log((row.pass ? 'LAND ' : 'LAND!') + label + ' low-flight end');
  return row;
}

async function resourceState(nodeId) {
  return await ev("var p=P.snap().play,n=(p.nodes||[]).filter(function(x){return x.id==='" + nodeId + "';})[0],W=P.worldLayer(),g=W&&W.gear&&W.gear();return {node:n||null,refills:p.equipment?p.equipment.refills:null,energy:p.equipment?p.equipment.combat_mahgic:null,collectibles:(p.collectibles||[]).slice(),gear:g&&g.debug?g.debug():null};");
}

async function drainCombatMahgic() {
  await ev("P.send('LOCK_TARGET',{aim_id:null});P.send('EQUIP_DISMISS',{});return 1;"); await sleep(900);
  var reset = await ev("return P.send('PRACTICE_RESET',{});"); await sleep(350);
  var before = await resourceState('NODE_RB_GYM_BEND'), cycles = [];
  for (var i = 0; i < 4; i++) {
    var manifest = await ev("return P.send('EQUIP_MANIFEST',{kind:'DUMBBELL',count:2});");
    await sleep(1350);
    var charged = await ev("return P.snap().play.equipment;");
    var dismiss = await ev("return P.send('EQUIP_DISMISS',{});");
    await sleep(950);
    var cleared = await ev("return P.snap().play.equipment;");
    cycles.push({ manifest: manifest, charged: charged, dismiss: dismiss, cleared: cleared });
  }
  var zero = await resourceState('NODE_RB_GYM_BEND');
  await sleep(1250);
  var noRegen = await resourceState('NODE_RB_GYM_BEND');
  var out = { reset: reset, before: before, cycles: cycles, zero: zero, after_no_regen_window: noRegen };
  out.pass = !!(reset && reset.accepted && reset.combat_mahgic === 200 && before.energy && before.energy.current === before.energy.max && cycles.length === 4 && cycles.every(function (x, i) { return x.manifest && x.manifest.accepted && x.manifest.cost === 50 && x.dismiss && x.dismiss.accepted && x.cleared && x.cleared.manifested.length === 0 && x.cleared.combat_mahgic.current === before.energy.max - (i + 1) * 50; }) && zero.energy && zero.energy.current === 0 && noRegen.energy && noRegen.energy.current === 0 && noRegen.refills === 0);
  return out;
}

async function settleNodeRange(nodeId) {
  var trace = [], final = null;
  for (var i = 0; i < 70; i++) {
    var q = await ev("var p=P.snap().play,n=(p.nodes||[]).filter(function(x){return x.id==='" + nodeId + "';})[0];if(!n)return null;return {x:p.position.x,z:p.position.z,nx:n.x,nz:n.z,d:Math.hypot(n.x-p.position.x,n.z-p.position.z)};");
    if (!q) return { pass: false, reason: 'NODE_MISSING', trace: trace };
    final = q; trace.push({ x: +q.x.toFixed(3), z: +q.z.toFixed(3), distance_m: +q.d.toFixed(3) });
    if (q.d >= 2.82 && q.d <= 3.02) break;
    var dx = q.nx - q.x, dz = q.nz - q.z, d = Math.hypot(dx, dz) || 1, sign = q.d > 2.92 ? 1 : -1, ux = dx / d * sign, uz = dz / d * sign;
    await ev("return P.send('MOVE',{forward:" + (-uz).toFixed(6) + ",strafe:" + ux.toFixed(6) + ",run:false,fast:false,yaw:" + Math.atan2(ux, -uz).toFixed(6) + "});");
    await sleep(35); await stop(); await sleep(160);
  }
  final = await ev("var p=P.snap().play,n=(p.nodes||[]).filter(function(x){return x.id==='" + nodeId + "';})[0];return n?{x:p.position.x,z:p.position.z,nx:n.x,nz:n.z,d:Math.hypot(n.x-p.position.x,n.z-p.position.z)}:null;");
  return { pass: !!(final && final.d >= 2.78 && final.d <= 3.06), target_m: 2.92, final: final && { x: +final.x.toFixed(3), z: +final.z.toFixed(3), distance_m: +final.d.toFixed(3) }, trace: trace.slice(-16) };
}

async function harvestNode(nodeId, label) {
  var before = await resourceState(nodeId), known = {};
  before.collectibles.forEach(function (x) { known[x.id] = true; });
  var tick0 = await hostTick();
  var standOff = await settleNodeRange(nodeId);
  var setup = await ev("var p=P.snap().play,n=(p.nodes||[]).filter(function(x){return x.id==='" + nodeId + "';})[0];if(n){var yaw=Math.atan2(n.x-p.position.x,-(n.z-p.position.z));await P.send('MOVE',{forward:0,strafe:0,yaw:yaw});}var lock=await P.send('LOCK_TARGET',{aim_id:'" + nodeId + "'});var select=await P.send('RULES_SELECT',{category:'PHYSICAL',slot:0});return {lock:lock,select:select};");
  await shot('resource_' + label + '_before');
  var casts = [], broken = false, dropsSeen = [];
  for (var i = 0; i < 10 && !broken; i++) {
    var cast = await ev("return P.send('RULES_CAST',{});"); casts.push(cast); await sleep(900);
    var q = await resourceState(nodeId);
    broken = !!(q.node && q.node.broken);
    var fresh = q.collectibles.filter(function (x) { return !known[x.id]; });
    if (fresh.length > dropsSeen.length) dropsSeen = fresh;
  }
  await shot('resource_' + label + '_broken');
  for (var c = 0; c < dropsSeen.length; c++) await nav('resource_' + label + '_pickup_' + (c + 1), dropsSeen[c].x, dropsSeen[c].z, { aux: true, timeout: 20000 });
  await sleep(500);
  var after = await resourceState(nodeId);
  var unlock = await ev("return P.send('LOCK_TARGET',{aim_id:null});");
  var events = await hostEvents(tick0, ['RESOURCE_NODE_BROKEN', 'REFILL_PICKED', 'R1723_DAMAGE']);
  var pickups = events.filter(function (x) { return x.kind === 'REFILL_PICKED' && dropsSeen.some(function (d) { return d.id === x.id; }); });
  var energyGain = (after.energy && before.energy) ? after.energy.current - before.energy.current : 0;
  var refillGain = (after.refills || 0) - (before.refills || 0);
  var patch = nodeId.replace(/^NODE_/, '');
  var out = { id: nodeId, label: label, before: before, stand_off: standOff, setup: setup, casts: casts, broken: broken, drops_seen: dropsSeen, pickups: pickups, events: events, after: after, unlock: unlock, energy_gain: energyGain, refill_gain: refillGain };
  out.pass = !!(before.node && !before.node.broken && standOff.pass && setup && setup.lock && setup.lock.accepted && setup.lock.locked === nodeId && setup.select && setup.select.accepted && setup.select.category === 'PHYSICAL' && setup.select.slot === 0 && setup.select.skill === 'PA_PUSH' && casts.filter(function (x) { return x && x.accepted; }).length >= 2 && casts.filter(function (x) { return x && x.accepted; }).every(function (x) { return !x.reserved; }) && after.node && after.node.broken && after.gear && (after.gear.broken || []).indexOf(patch) >= 0 && dropsSeen.length >= 2 && pickups.length === dropsSeen.length && !after.collectibles.some(function (x) { return dropsSeen.some(function (d) { return d.id === x.id; }); }) && unlock && unlock.accepted && unlock.locked === null);
  return out;
}

async function finishResourceRecovery(drain, harvests) {
  var recovered = await resourceState('NODE_RB_TEMPLE_E');
  var spendTick = await hostTick();
  var spend = await ev("P.send('LOCK_TARGET',{aim_id:null});return P.send('RULES_CAST',{skill_id:'ATHLETE_OVERHEAD_RELEASE'});");
  await sleep(1750);
  var beforeUse = await resourceState('NODE_RB_TEMPLE_E');
  var use = await ev("return P.send('USE_REFILL',{});"); await sleep(250);
  var afterUse = await resourceState('NODE_RB_TEMPLE_E');
  var useEvents = await hostEvents(spendTick, ['R1723_CAST_START', 'R1723_MISS', 'REFILL_USED']);
  var allPickups = harvests.reduce(function (a, h) { return a.concat(h.pickups || []); }, []);
  var out = { drain: drain, harvests: harvests, recovered: recovered, spend: spend, before_use: beforeUse, use: use, after_use: afterUse, use_events: useEvents, pickup_destinations: Array.from(new Set(allPickups.map(function (x) { return x.to; }))) };
  out.pass = !!(drain.pass && harvests.length === 3 && harvests.every(function (x) { return x.pass; }) && allPickups.length >= 6 && allPickups.some(function (x) { return x.to === 'MAHGIC'; }) && allPickups.some(function (x) { return x.to === 'INVENTORY'; }) && recovered.energy && recovered.energy.current === recovered.energy.max && recovered.refills >= 2 && spend && spend.accepted && beforeUse.energy && beforeUse.energy.current < beforeUse.energy.max && beforeUse.refills >= 1 && use && use.accepted && afterUse.energy && afterUse.energy.current === afterUse.energy.max && afterUse.refills === beforeUse.refills - 1);
  report.resources = out;
  return out;
}

async function ecologySamples(label, n, interval) {
  await ev("window.__m5Phase='ECOLOGY:" + label + "'; return 1;");
  var rows = [];
  for (var i = 0; i < n; i++) {
    rows.push(await ev("var p=P.snap().play; function mini(x){return {id:x.id,species:x.species,state:x.state,x:x.position&&x.position.x,y:x.y,z:x.position&&x.position.z,speed:x.speed_mps,clearance:x.terrain_clearance_m,ko:!!x.ko,zone:x.zone||null,sanctuary:x.sanctuary||null,school:x.school||null,fight:!!x.fight};} return {t:p.host_t,dogkies:(p.creatures||[]).map(mini),wildlife:(p.wildlife||[]).map(mini)};"));
    await sleep(interval);
  }
  report.ecology[label] = rows;
  return rows;
}
function tracks(rows, collection, species) {
  var by = {};
  rows.forEach(function (r) { (r[collection] || []).filter(function (x) { return !species || x.species === species; }).forEach(function (x) { var a = by[x.id] || (by[x.id] = []); a.push(x); }); });
  return Object.keys(by).map(function (id) { var a = by[id], f = a[0], l = a[a.length - 1], stepMax = 0, fromMax = 0; for (var i = 1; i < a.length; i++) { stepMax = Math.max(stepMax, Math.hypot((a[i].x || 0) - (a[i - 1].x || 0), (a[i].z || 0) - (a[i - 1].z || 0))); fromMax = Math.max(fromMax, Math.hypot((a[i].x || 0) - (f.x || 0), (a[i].z || 0) - (f.z || 0))); } return { id: id, samples: a.length, states: Array.from(new Set(a.map(function (x) { return x.state; }))), zones: Array.from(new Set(a.map(function (x) { return x.zone; }).filter(Boolean))), sanctuaries: Array.from(new Set(a.map(function (x) { return x.sanctuary; }).filter(Boolean))), schools: Array.from(new Set(a.map(function (x) { return x.school; }).filter(Boolean))), fight_seen: a.some(function (x) { return x.fight; }), moved_m: +(Math.hypot((l.x || 0) - (f.x || 0), (l.z || 0) - (f.z || 0))).toFixed(3), max_step_m: +stepMax.toFixed(3), max_from_first_m: +fromMax.toFixed(3), speed_peak_mps: +Math.max.apply(null, a.map(function (x) { return Number.isFinite(x.speed) ? x.speed : 0; })).toFixed(3), min_clearance_m: Math.min.apply(null, a.map(function (x) { return Number.isFinite(x.clearance) ? x.clearance : 1e9; })) }; });
}

async function measuredTimeSwitch(want) {
  return await ev("return await new Promise(function(resolve){var d=[],prev=performance.now(),start=prev,r=P.rendererDebug(),sc=P.sceneDebug(),THREE=P.THREE,m0=new THREE.Matrix4(),m1=new THREE.Matrix4(),cloud=sc&&sc.getObjectByName('SKY_CUMULUS_MID'),host0=P.snap().play.host_t,programs0=r&&r.info&&r.info.programs?r.info.programs.length:null,wind0=(function(){var W=P.worldLayer(),s=W&&W.sky&&W.sky();return s&&s.debug?s.debug():null;})(),p0=null;if(cloud&&cloud.getMatrixAt){cloud.getMatrixAt(0,m0);p0={x:+m0.elements[12].toFixed(3),z:+m0.elements[14].toFixed(3)};}var returned=P.timeOfDay('" + want + "');function frame(now){d.push(now-prev);prev=now;if(now-start<1200){requestAnimationFrame(frame);return;}var p1=null;if(cloud&&cloud.getMatrixAt){cloud.getMatrixAt(0,m1);p1={x:+m1.elements[12].toFixed(3),z:+m1.elements[14].toFixed(3)};}var sorted=d.slice().sort(function(a,b){return a-b;}),pct=function(q){return sorted.length?+sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*q))].toFixed(2):null;},wind1=(function(){var W=P.worldLayer(),s=W&&W.sky&&W.sky();return s&&s.debug?s.debug():null;})(),host1=P.snap().play.host_t,programs1=r&&r.info&&r.info.programs?r.info.programs.length:null;resolve({requested:'" + want + "',returned:returned,observed:P.timeOfDay(),frames:d.length,p50_ms:pct(.5),p95_ms:pct(.95),max_ms:sorted.length?+sorted[sorted.length-1].toFixed(2):null,host_delta_s:+(host1-host0).toFixed(3),programs:[programs0,programs1],cloud_before:p0,cloud_after:p1,cloud_moved_m:p0&&p1?+Math.hypot(p1.x-p0.x,p1.z-p0.z).toFixed(3):null,wind_before:wind0,wind_after:wind1});}requestAnimationFrame(frame);});");
}

async function cleanup() {
  var roomRecovery = false;
  try {
    await ev("if(P.menu&&P.menu.close)P.menu.close('m5-cleanup'); if(P.hud&&P.hud.catalogClose)P.hud.catalogClose(); if(P.hud&&P.hud.hudMode)P.hud.hudMode(false); if(P.hud&&P.hud.confirmOpen&&P.hud.confirmOpen())P.confirmAnswer(false); var W=P.worldLayer(),g=W&&W.guides&&W.guides(),d=g&&g.debug?g.debug():null;if(d&&d.visible)P.hud.doButton('mahguide',document.getElementById('g-mahguide')); P.send('MOVE',{forward:0,strafe:0,run:false,fast:false}); P.send('EMOTE_STOP',{}); P.send('GUARD',{kind:'NONE'}); P.send('LOCK_TARGET',{aim_id:null}); P.send('EQUIP_DISMISS',{}); P.timeOfDay('NIGHT'); return 1;");
    var s0 = await ev("var p=P.snap().play; return {room:p.room,flight:p.flight,form:p.form,transforming:!!p.transforming};");
    if (s0.room !== 'FIELD') { roomRecovery = true; await ev("return P.enterRoom('FIELD','ENTER_ROOM');"); await sleep(1800); }
    if (s0.flight && s0.flight.powered) { await ev("return P.send('FLIGHT',{op:'EXIT'});"); for (var i = 0; i < 70; i++) { await sleep(180); var f = await ev("return P.snap().play.flight;"); if (!f.powered && !f.exiting && !f.falling) break; } }
    await ensureForm('FUSED', 'cleanup_fused');
    await sleep(1200);
    var done = await ev("var p=P.snap().play,e=p.equipment||{},lk=p.rules&&p.rules.me&&p.rules.me.lock,W=P.worldLayer(),g=W&&W.guides&&W.guides(),gd=g&&g.debug?g.debug():null; return {room:p.room,form:p.form,transforming:!!p.transforming,flying:!!(p.flight&&p.flight.powered),exiting:!!(p.flight&&p.flight.exiting),falling:!!(p.flight&&p.flight.falling),flight_height:p.flight?p.flight.height_above_ground:null,flight_vz:p.flight?p.flight.vz:null,guard:p.guard||null,lock:lk?lk.target:null,emote:p.emote||null,cast:p.rules&&p.rules.me?p.rules.me.cast:null,defeat:!!p.defeat,defeats:p.stats&&p.stats.defeats||0,hp:p.rules&&p.rules.me?p.rules.me.hp:null,equipment:{manifested:(e.manifested||[]).length,held:!!e.held},menu:P.menu&&P.menu.state?P.menu.state():null,tod:P.timeOfDay?P.timeOfDay():null,hud:P.hud&&P.hud.hudMode?P.hud.hudMode():null,guide:gd?{visible:gd.visible,on_stage:gd.on_stage}:null,confirm:P.hud&&P.hud.confirmOpen?P.hud.confirmOpen():null};");
    done.room_recovery_used = roomRecovery;
    return done;
  } catch (e) { return { error: String(e && e.stack || e) }; }
}

try {
  srv = await serveStatic(DIST);
  pg = await launchChrome({ width: 1280, height: 800, dpr: 1.25, gpu: true, unlockFps: true, cmdTimeoutMs: 180000 });
  pg.on('Runtime.consoleAPICalled', function (p) {
    if (p.type !== 'error') return;
    var text = (p.args || []).map(function (a) { return a.value !== undefined ? String(a.value) : (a.description || ''); }).join(' ');
    if (!/toNonIndexed/.test(text)) report.console_errors.push(text.slice(0, 500));
  });
  var url = srv.origin + PLAY_PATH + '?field=1&sky=night&quality=MED';
  report.url = url;
  await pg.goto(url);
  report.started_at = new Date().toISOString();
  report.restore_gate = { early_samples: [] };
  for (var vg = 0; vg < 60; vg++) {
    var veilEarly = await pg.evaluate("(function(){var v=document.getElementById('restore-veil'),b=v&&v.querySelector('b'),c=v?getComputedStyle(v):null;return {exists:!!v,display:c&&c.display,opacity:c&&c.opacity,gone:!!(v&&v.classList.contains('gone')),text:b?b.textContent:''};})()");
    report.restore_gate.early_samples.push(veilEarly);
    if (veilEarly && veilEarly.display !== 'none' && !veilEarly.gone) break;
    await sleep(50);
  }
  await waitForGame(pg, 180000);
  var ready = await waitReady();
  await sleep(900);
  await ev("P.hud.showGuide(false); P.timeOfDay('NIGHT'); return 1;");
  report.restore_gate.ready = await ev("var v=document.getElementById('restore-veil'),b=v&&v.querySelector('b'),c=v?getComputedStyle(v):null;return {done:P.restoreState().done,display:c&&c.display,opacity:c&&c.opacity,gone:!!(v&&v.classList.contains('gone')),text:b?b.textContent:''};");
  var boot = await ev("var u=new URL(location.href),w=P.world(),r=P.worldLayer().registry(),q=P.quality?P.quality():null,s=P.warmState(),bi=window.MAHWORLD_BUILD_INFO||await fetch('/BUILD_INFO.json',{cache:'no-store'}).then(function(x){return x.json();}); return {url:location.href,query:{field:u.searchParams.get('field'),sky:u.searchParams.get('sky'),quality:u.searchParams.get('quality'),dev:u.searchParams.get('dev')},world:w&&w.status,restore:P.restoreState().done,warm:{done:s.world_done,error:s.world_err,time_states:s.time_states},tod:P.timeOfDay(),quality:q,room:P.snap().play.room,sanctuary_contracts:r.sanctuary_contracts,build:bi,build_tag:(document.getElementById('buildtag')||{}).textContent||''};");
  report.boot = boot;
  report.build = boot.build;
  var expectedBuildTag = (boot.build.pass || 'UNPACKAGED') + (boot.build.commit ? ' · ' + boot.build.commit : '') + (boot.build.worktree_clean === false ? ' · WORKTREE' : '');
  ok('M5.WORLD ordinary MED NIGHT candidate reaches READY with the visible stamped M4 world build and five sanctuary contracts', !!ready && boot.world === 'READY' && boot.restore && boot.warm.done && !boot.warm.error && boot.room === 'FIELD' && boot.tod === 'NIGHT' && boot.query.field === '1' && boot.query.sky === 'night' && boot.query.quality === 'MED' && boot.query.dev === null && boot.quality && boot.quality.tier === 'MED' && boot.sanctuary_contracts && boot.sanctuary_contracts.list.length === 5 && boot.build && /^[0-9a-f]{64}$/.test(boot.build.world_registry_sha256) && boot.build.world_counts && boot.build.world_counts.sanctuaries === 5 && boot.build.world_counts.paths === 31 && boot.build.world_counts.bridge_links === 3 && boot.build.world_counts.buildings === 14 && boot.build.world_counts.dogkie_pool === 54 && boot.build_tag === expectedBuildTag, boot);
  ok('M5.RESTORE the visible LOADING/RESTORING gate covers startup and clears only after READY restoration', report.restore_gate.early_samples.some(function (x) { return x && x.display !== 'none' && !x.gone && /LOADING|RESTORING/.test(x.text); }) && report.restore_gate.ready && report.restore_gate.ready.done && (report.restore_gate.ready.display === 'none' || report.restore_gate.ready.gone), report.restore_gate);
  await ev("clearInterval(window.__m5VitalsIv); var p=P.snap().play; window.__m5Phase='BOOT'; window.__m5Vitals={samples:0,defeat_active_samples:0,defeat_edges:0,start_defeats:p.stats&&p.stats.defeats||0,min_hp:p.rules&&p.rules.me?p.rules.me.hp:null,events:[],last_defeat:!!p.defeat,last_defeats:p.stats&&p.stats.defeats||0}; window.__m5VitalsIv=setInterval(function(){var q=P.snap().play,v=window.__m5Vitals; v.samples++; if(q.defeat)v.defeat_active_samples++; var hp=q.rules&&q.rules.me?q.rules.me.hp:null; if(hp!==null)v.min_hp=v.min_hp===null?hp:Math.min(v.min_hp,hp); var defeats=q.stats&&q.stats.defeats||0,edge=(!!q.defeat)&&!v.last_defeat; if(edge)v.defeat_edges++; if((!!q.defeat)!==v.last_defeat||defeats!==v.last_defeats){if(v.events.length<40)v.events.push({t:q.host_t,phase:window.__m5Phase||null,defeat:!!q.defeat,defeats:defeats,hp:hp,x:q.position.x,z:q.position.z,room:q.room,flight:q.flight?{powered:!!q.flight.powered,height:q.flight.height_above_ground,altitude:q.flight.altitude}:null});v.last_defeat=!!q.defeat;v.last_defeats=defeats;}},100); return window.__m5Vitals;");
  await shot('00_night_ready');

  var hudModes = await proveHudModes();
  ok('M5.HUD the in-game FULL -> MINIMAL -> FULL toggle preserves all essential vitals/controls, hides only secondary chrome and persists the preference', hudModes.pass, hudModes);

  /* All six candidate-facing menu bodies are opened by their real uppercase ids. */
  var tabs = ['COMBAT', 'STATS', 'SKILLS', 'LOADOUT', 'INVENTORY', 'MAP'];
  for (var mt = 0; mt < tabs.length; mt++) {
    var tab = tabs[mt];
    await ev("P.menu.open('" + tab + "'); return 1;"); await sleep(260);
    var menuState = await ev("var s=P.menu.state(),el=document.getElementById('g-menu'); return {state:s,visible:!!(el&&getComputedStyle(el).display!=='none'),body:(document.getElementById('g-menu-body')||{}).textContent?document.getElementById('g-menu-body').textContent.trim().slice(0,120):''};");
    report.menu.push({ requested: tab, observed: menuState });
    if (tab === 'MAP') await shot('01_route_map');
    await ev("P.menu.close('m5-candidate'); return 1;"); await sleep(120);
    var closedState = await ev("var s=P.menu.state(),el=document.getElementById('g-menu'); return {state:s,visible:!!(el&&getComputedStyle(el).display!=='none')};");
    report.menu[report.menu.length - 1].closed = closedState;
  }
  ok('M5.MENU real uppercase COMBAT/STATS/SKILLS/LOADOUT/INVENTORY/MAP bodies open with nonempty content and close', report.menu.length === tabs.length && report.menu.every(function (x) { return x.observed.visible && x.observed.state.open && x.observed.state.tab === x.requested && x.observed.body.length > 0 && x.closed && !x.closed.visible && !x.closed.state.open; }) && report.menu.map(function (x) { return x.requested; }).join('|') === tabs.join('|'), report.menu);

  /* The fused exercise and the split-only squat each run in the appropriate body form. */
  var fused0 = await ensureForm('FUSED', 'initial_fused');
  var exF = await exercise('UPRIGHT_ROW_DEMO', 'FUSED', '02_fused_upright_row');
  var split = await ensureForm('SPLIT', 'exercise_split');
  var exS = await exercise('SQUAT_DEMO', 'SPLIT', '03_split_squat');
  var fused1 = await ensureForm('FUSED', 'route_fused');
  ok('M5.FORMS idempotent FUSED -> SPLIT -> FUSED transitions and form-valid exercise commands complete', fused0.reached && split.reached && fused1.reached && exF.pass && exS.pass, { forms: report.forms, exercises: report.exercises });

  /* The real MAH GUIDE performs the DB×2 cast. Both authoritative dumbbell ids
     enter the true animated palms, become one owned X-Wave projectile, hit the
     locked practice target, return and remain the same two objects. */
  await ev("P.camOrbit(0.85,0.03);return 1;"); await sleep(220);
  report.camera.manual_orbit_start = await ev("return P.camState();");
  var dumbbell = await doGuideDumbbell();
  ok('M5.DUMBBELL the visible Guide casts DBx2; exact ids use HAND_R/HAND_L grips, own the X-Wave hit projectile and return without duplication', dumbbell.pass, dumbbell);
  var band = await doBandManifestOnly();
  ok('M5.BAND the procedural resistance band manifests, renders and dismisses cleanly while the owner-approved manifest-only policy remains explicit', band.pass, band);

  /* True two-palm barbell and actual equipment-owned projectile/return. The south runway is reached by
     ordinary movement (not placement); the boundary supplies an honest wall/miss with no fabricated damage. */
  await nav('barbell_south_runway', 0, -50, { timeout: 60000 });
  var barbell = await doBarbell();
  ok('M5.GEAR one authoritative barbell id is picked up in HAND_L|HAND_R, becomes the Press Throw projectile, records an honest wall/miss, returns, and leaves no duplicate', barbell.pass, barbell);
  await ev("return P.send('EQUIP_DISMISS',{});"); await sleep(1200);
  await nav('barbell_return_nexus', 0, 0, { timeout: 60000 });
  await ev("var W=P.worldLayer(),g=W&&W.guides&&W.guides(),d=g&&g.debug?g.debug():null;if(d&&d.visible)P.hud.doButton('mahguide',document.getElementById('g-mahguide'));return 1;"); await sleep(350);

  /* Flight is ordinary input: boost, release/brake, explicit hover, explicit landing. */
  var flight = await doFlightBrake();
  ok('M5.FLIGHT boost release produces one brake envelope, holds altitude, settles to hover, then lands fully', flight.pass, { peak_mps: flight.peak_mps, cruise_mps: flight.cruise_mps, brake_seq: flight.brake_seq, brake_pose_peak: flight.brake_pose_peak, altitude: flight.altitude, hovered: flight.hovered, landed: flight.landed });
  await nav('return_nexus_after_flight', 0, 0, { timeout: 60000 });

  /* Honest civic/training shell before leaving the hub. */
  await nav('civic_training_threshold', -15.4, 0, { timeout: 30000 });
  var cameraSweep = await cameraObstructionSweep('civic_training_facade');
  var civicFirst = await visitRoom({ name: 'civic_training', door: 'CIVIC_TRAINING_DOOR', room: 'CIVIC_TRAINING_HALL', doorAt: [-17, 0], outward: [1, 0], exit: [0, 8.4] });
  await nav('civic_repeat_threshold', -15.4, 0, { aux: true, timeout: 30000 });
  var civicRepeat = await visitRoom({ name: 'civic_training_repeat', door: 'CIVIC_TRAINING_DOOR', room: 'CIVIC_TRAINING_HALL', doorAt: [-17, 0], outward: [1, 0], exit: [0, 8.4] });
  var repeatBounds = civicFirst && civicRepeat ? {
    textures_inside_delta: civicRepeat.inside.census.textures - civicFirst.inside.census.textures,
    geometries_inside_delta: civicRepeat.inside.census.geometries - civicFirst.inside.census.geometries,
    programs_inside_delta: civicRepeat.inside.census.programs - civicFirst.inside.census.programs,
    objects_inside_delta: civicRepeat.inside.census.objects - civicFirst.inside.census.objects,
    textures_outside_delta: civicRepeat.outside.census.textures - civicFirst.outside.census.textures,
    geometries_outside_delta: civicRepeat.outside.census.geometries - civicFirst.outside.census.geometries,
    programs_outside_delta: civicRepeat.outside.census.programs - civicFirst.outside.census.programs,
    objects_outside_delta: civicRepeat.outside.census.objects - civicFirst.outside.census.objects,
    first_retained: {
      textures: civicFirst.outside.census.textures - civicFirst.before.census.textures,
      geometries: civicFirst.outside.census.geometries - civicFirst.before.census.geometries,
      programs: civicFirst.outside.census.programs - civicFirst.before.census.programs,
      objects: civicFirst.outside.census.objects - civicFirst.before.census.objects,
      meshes: civicFirst.outside.census.meshes - civicFirst.before.census.meshes,
      skinned: civicFirst.outside.census.skinned - civicFirst.before.census.skinned
    },
    repeat_retained: {
      textures: civicRepeat.outside.census.textures - civicRepeat.before.census.textures,
      geometries: civicRepeat.outside.census.geometries - civicRepeat.before.census.geometries,
      programs: civicRepeat.outside.census.programs - civicRepeat.before.census.programs,
      objects: civicRepeat.outside.census.objects - civicRepeat.before.census.objects,
      meshes: civicRepeat.outside.census.meshes - civicRepeat.before.census.meshes,
      skinned: civicRepeat.outside.census.skinned - civicRepeat.before.census.skinned
    },
    inside_structure_delta: {
      objects: civicRepeat.inside.census.objects - civicFirst.inside.census.objects,
      meshes: civicRepeat.inside.census.meshes - civicFirst.inside.census.meshes,
      skinned: civicRepeat.inside.census.skinned - civicFirst.inside.census.skinned,
      programs: civicRepeat.inside.census.programs - civicFirst.inside.census.programs
    }
  } : null;
  report.room_lifecycle = { first: civicFirst, repeat: civicRepeat, bounds: repeatBounds };
  var roomCameraStates = civicFirst && civicRepeat ? [civicFirst.before.camera, civicFirst.inside.camera, civicFirst.before_exit.camera, civicFirst.outside.camera, civicRepeat.before.camera, civicRepeat.inside.camera, civicRepeat.before_exit.camera, civicRepeat.outside.camera] : [];
  var angleDelta = function (a, b) { return Math.abs(Math.atan2(Math.sin((a - b) * Math.PI / 180), Math.cos((a - b) * Math.PI / 180)) * 180 / Math.PI); };
  var orbitAngleDeltas = civicFirst && civicRepeat ? [
    angleDelta(civicFirst.before.camera.err_deg, civicFirst.inside.camera.err_deg),
    angleDelta(civicFirst.before_exit.camera.err_deg, civicFirst.outside.camera.err_deg),
    angleDelta(civicRepeat.before.camera.err_deg, civicRepeat.inside.camera.err_deg),
    angleDelta(civicRepeat.before_exit.camera.err_deg, civicRepeat.outside.camera.err_deg)
  ] : [];
  var transactionCameras = civicFirst && civicRepeat ? [civicFirst.enter, civicFirst.exit, civicRepeat.enter, civicRepeat.exit] : [];
  var resourceKeys = ['children', 'objects', 'meshes', 'skinned', 'geometries', 'materials', 'textures', 'skeletons'];
  var roomEmpty = function (x) { return x && resourceKeys.every(function (k) { return x[k] === 0; }); };
  var sameRoomResources = function (a, b) { return a && b && resourceKeys.every(function (k) { return a[k] === b[k]; }); };
  var clearMatches = function (inside, outside) { var c = outside && outside.last_room_clear; return !!(inside && c && sameRoomResources(inside.room_resources, c.disposed) && roomEmpty(c.remaining) && roomEmpty(outside.room_resources)); };
  var roomBounded = !!(repeatBounds && clearMatches(civicFirst.inside.census, civicFirst.outside.census) && clearMatches(civicRepeat.inside.census, civicRepeat.outside.census) && sameRoomResources(civicFirst.inside.census.room_resources, civicRepeat.inside.census.room_resources) && repeatBounds.first_retained.programs <= 2 && repeatBounds.repeat_retained.programs <= 2 && Math.abs(repeatBounds.inside_structure_delta.objects) <= 4 && Math.abs(repeatBounds.inside_structure_delta.meshes) <= 4 && Math.abs(repeatBounds.inside_structure_delta.skinned) <= 2 && Math.abs(repeatBounds.inside_structure_delta.programs) <= 2 && civicFirst.inside.census.room_build.key === civicRepeat.inside.census.room_build.key && civicFirst.outside.census.room_build.key === civicRepeat.outside.census.room_build.key);
  var cameraPreserved = !!(cameraSweep.pass && report.camera.manual_orbit_start && report.camera.manual_orbit_start.state === 'ORBIT' && roomCameraStates.length === 8 && roomCameraStates.every(function (x) { return x.state === 'ORBIT' && !x.inside && !x.below_ground; }) && orbitAngleDeltas.length === 4 && orbitAngleDeltas.every(function (x) { return x <= 6; }) && transactionCameras.every(function (x) { return x && x.camera_before && x.camera_after && x.camera_before.state === 'ORBIT' && x.camera_after.state === 'ORBIT'; }));
  ok('M5.CAMERA a real manual orbit persists through travel and two room transactions with its relative angle preserved; façade obstruction shortens and recovers the boom without camera penetration', cameraPreserved, { start: report.camera.manual_orbit_start, sweep: cameraSweep, room_states: roomCameraStates, orbit_angle_delta_deg: orbitAngleDeltas, transaction_cameras: transactionCameras.map(function (x) { return { before: x && x.camera_before, after: x && x.camera_after, change: x && x.camera_change }; }) });
  ok('M5.ROOM_LIFECYCLE immediate repeat entry/exit disposes every room-owned resource and rebuilds the same bounded interior scene', civicFirst.pass && civicRepeat.pass && roomBounded, { first: { before: civicFirst.before.census, inside: civicFirst.inside.census, outside: civicFirst.outside.census }, repeat: { before: civicRepeat.before.census, inside: civicRepeat.inside.census, outside: civicRepeat.outside.census }, renderer_wide_diagnostic_delta: repeatBounds });
  await ev("P.camReset('m5-camera-proof');return 1;"); await sleep(1500);
  await nav('nexus_departure', 0, 0, { timeout: 30000 });

  /* Exact economy chain: spend 4× DB2 manifestations to literal zero (with a
     no-regen window), break three nodes using free physical PA_PUSH, walk every
     blue refill into the pool then inventory, spend, and consume stored stock. */
  var drained = await drainCombatMahgic();
  await nav('resource_gym_bend_approach', -62, 54.8, { aux: true, timeout: 90000 });
  var harvestGym = await harvestNode('NODE_RB_GYM_BEND', 'gym_bend');
  await nav('resource_link_to_athlete', -40, 80, { aux: true, timeout: 60000 });

  /* ATHLETE: normal road arrival, exact live resources, and real temple transaction. */
  /* P.goTo stops inside 0.6 m of its target: 98.8 leaves the player inside strike range but keeps
     the far-side deterministic refill fan outside auto-pickup range for visible walking evidence. */
  await nav('athlete_resource_approach', -14, 98.8, { timeout: 90000 });
  var harvestWest = await harvestNode('NODE_RB_TEMPLE_W', 'temple_w');
  await nav('resource_temple_e_link', 0, 110, { aux: true, timeout: 30000 });
  await nav('resource_temple_e_approach', 15, 122.8, { aux: true, timeout: 30000 });
  var harvestEast = await harvestNode('NODE_RB_TEMPLE_E', 'temple_e');
  var resources = await finishResourceRecovery(drained, [harvestGym, harvestWest, harvestEast]);
  await nav('athlete_causeway', 0, 140, { sanctuary: 'ATHLETE_SANCTUARY', timeout: 60000 });
  await shot('04_athlete_sanctuary');
  var templeApproach = approachPoint(GRAND_ROOMS.temple);
  await nav('athlete_temple_threshold', templeApproach[0], templeApproach[1], { timeout: 30000 });
  await visitRoom(GRAND_ROOMS.temple);
  await nav('athlete_temple_west', -18, 166, { timeout: 30000 });
  await nav('athlete_market_road_1', -18, 190, { timeout: 30000 });
  await nav('athlete_market_road_2', 0, 205, { timeout: 30000 });

  /* BAGE: bridge, market, both basin ecology and the real shop. The registry's
     nominal [0,258] is the solid market center; [0,241] is its real forecourt,
     and [-30,242] is the authored west-basin bank (not the hostile water). */
  await nav('bage_bridge_south', 0, 226, { timeout: 30000 });
  await nav('bage_bridge_north', 0, 240, { timeout: 30000 });
  await nav('bage_forecourt', 0, 241, { sanctuary: 'BAGE_SANCTUARY', timeout: 30000 });
  var clothingApproach = approachPoint(GRAND_ROOMS.clothing), weaponApproach = approachPoint(GRAND_ROOMS.weapon);
  await nav('bage_clothing_threshold', clothingApproach[0], clothingApproach[1], { timeout: 30000 });
  await visitRoom(GRAND_ROOMS.clothing);
  await nav('bage_weapon_threshold', weaponApproach[0], weaponApproach[1], { timeout: 30000 });
  await visitRoom(GRAND_ROOMS.weapon);
  await nav('bage_shop_lane', -4, 241.5, { timeout: 30000 });
  await nav('bage_basin_lane', -15, 241.5, { timeout: 30000 });
  await nav('bage_west_bank', -30, 242, { timeout: 30000 });
  await shot('05_bage_sanctuary');
  var bageEco = await ecologySamples('bage_basin', 7, 350);
  await shot('06_bage_wildlife');
  var routeSplit = await ensureForm('SPLIT', 'bage_route_split');

  /* LEAN: connected west garden/canal/canyon route. Low flight is the ordinary
     gameplay counter to the hostile Bage garden pack; land before the canonical
     Lean sanctuary road arrival. */
  var leanFlight0 = await beginLowFlight('bage_to_lean', 1300);
  await nav('lean_basin_edge', -47, 282, { timeout: 30000 });
  await nav('lean_garden', -60, 270, { timeout: 30000 });
  await nav('northwest_terrace_view', -100, 272, { timeout: 50000 });
  var splitElevated = await pos();
  await nav('lean_canal_north', -112, 247, { timeout: 30000 });
  await nav('lean_bridge_north', -112, 226, { timeout: 30000 });
  await nav('lean_bridge_south', -112, 205, { timeout: 30000 });
  await nav('lean_sanctuary_approach', -108, 185, { timeout: 30000 });
  await nav('lean_forest_road', -108, 178, { sanctuary: 'LEAN_SANCTUARY', timeout: 30000 });
  await shot('07_lean_sanctuary');
  await nav('lean_spire_route', -145, 144, { timeout: 40000 });
  var leanFlight1 = await endLowFlight('bage_to_lean');
  var splitLanded = await pos();
  var routeFused = await ensureForm('FUSED', 'lean_route_fused');
  report.form_elevations = { fused_origin: fused0.final, split_elevated: splitElevated, split_landed: splitLanded, fused_after: routeFused.final };
  ok('M5.FORM_ELEVATION FUSED is proven at ground level and SPLIT traverses the elevated low-flight route before a complete landing and re-fuse', fused0.reached && routeSplit.reached && splitElevated.form === 'SPLIT' && splitElevated.flying && splitElevated.height_above_ground >= 3 && splitElevated.altitude - fused0.final.altitude >= 3 && leanFlight1.pass && splitLanded.form === 'SPLIT' && !splitLanded.flying && Math.abs(splitLanded.height_above_ground || 0) <= 0.05 && routeFused.reached, report.form_elevations);

  /* VISIONARY: highland descent, Dogkie glade, Phoenix anchor and pool. Observe
     the hostile glade from low flight (below Phoenix aggression), then land at
     the safe pool edge. */
  await nav('visionary_highland_1', -145, 100, { timeout: 40000 });
  await nav('visionary_highland_2', -150, 60, { timeout: 30000 });
  var visionFlight0 = await beginLowFlight('visionary_glade', 1900);
  await nav('visionary_terrace', -142, 39.5, { timeout: 30000 });
  await nav('visionary_dogkie_glade', -140, 10, { timeout: 30000 });
  await nav('visionary_heart', -150, 0, { sanctuary: 'VISIONARY_SANCTUARY', timeout: 30000 });
  var visionEco = await ecologySamples('visionary_glade', 10, 350);
  await shot('08_visionary_dogkie_phoenix');
  await nav('visionary_return_1', -120, 10, { timeout: 30000 });
  await nav('visionary_pool', -94, 30, { timeout: 30000 });
  await shot('09_visionary_pool');
  await nav('visionary_return_2', -72, 10, { timeout: 30000 });
  var visionFlight1 = await endLowFlight('visionary_glade');
  await nav('visionary_return_3', -40, 40, { timeout: 30000 });
  await nav('visionary_return_nexus', 0, 0, { timeout: 40000 });

  /* TITAN: blue causeway, tower room, lake/mountain route and Moon Pass return. */
  await nav('titan_causeway_1', 40, 40, { timeout: 30000 });
  await nav('titan_causeway_2', 70, 70, { timeout: 30000 });
  await nav('titan_forecourt', 84, 84, { timeout: 30000 });
  var towerApproach = approachPoint(GRAND_ROOMS.tower);
  await nav('titan_tower_threshold', towerApproach[0], towerApproach[1], { timeout: 30000 });
  await visitRoom(GRAND_ROOMS.tower);
  await nav('titan_range_loop_entry', 70, 80, { timeout: 30000 });
  await nav('titan_range_south', 126, 78, { timeout: 30000 });
  await nav('titan_range_turn', 131, 88, { timeout: 30000 });
  await nav('titan_range_2', 131, 121, { timeout: 30000 });
  /* TITAN_LAKE fish are intentionally proximity-provoked glass cannons. Cross the
     water/pass loop with the ordinary low-flight counter: high enough to stay out
     of their < surface+6 m launch envelope, still well below the Phoenix's 30 m
     aggression threshold. Land only after the return route clears the fish leash. */
  var titanFlight0 = await beginLowFlight('titan_lake_pass', 1500);
  await nav('titan_lake', 150, 124, { sanctuary: 'TITAN_SANCTUARY', timeout: 30000 });
  await shot('10_titan_sanctuary_lake');
  await nav('titan_lake_exit', 131, 121, { timeout: 30000 });
  await nav('titan_pass_turn', 131, 88, { timeout: 30000 });
  await nav('titan_pass_south', 126, 78, { timeout: 30000 });
  await nav('titan_moon_pass', 150, 80, { timeout: 40000 });
  await shot('11_titan_moon_pass');
  await nav('titan_return_pass', 126, 78, { timeout: 30000 });
  await nav('titan_return_3', 70, 80, { timeout: 40000 });
  await nav('titan_return_4', 40, 40, { timeout: 30000 });
  var titanFlight1 = await endLowFlight('titan_lake_pass');
  await nav('route_finish_nexus', 0, 0, { timeout: 30000 });

  report.vitals = await ev("clearInterval(window.__m5VitalsIv); var p=P.snap().play,v=window.__m5Vitals||{}; return Object.assign({},v,{end_defeats:p.stats&&p.stats.defeats||0,active_defeat:!!p.defeat,end_hp:p.rules&&p.rules.me?p.rules.me.hp:null});");
  var requiredRoute = report.route.filter(function (x) { return !x.auxiliary; });
  var expectedRouteIds = ('barbell_south_runway barbell_return_nexus return_nexus_after_flight civic_training_threshold nexus_departure ' +
    'athlete_resource_approach athlete_causeway athlete_temple_threshold athlete_temple_west athlete_market_road_1 athlete_market_road_2 ' +
    'bage_bridge_south bage_bridge_north bage_forecourt bage_clothing_threshold bage_weapon_threshold bage_shop_lane bage_basin_lane bage_west_bank ' +
    'lean_basin_edge lean_garden northwest_terrace_view lean_canal_north lean_bridge_north lean_bridge_south lean_sanctuary_approach lean_forest_road lean_spire_route ' +
    'visionary_highland_1 visionary_highland_2 visionary_terrace visionary_dogkie_glade visionary_heart visionary_return_1 visionary_pool visionary_return_2 visionary_return_3 visionary_return_nexus ' +
    'titan_causeway_1 titan_causeway_2 titan_forecourt titan_tower_threshold titan_range_loop_entry titan_range_south titan_range_turn titan_range_2 titan_lake titan_lake_exit titan_pass_turn titan_pass_south titan_moon_pass titan_return_pass titan_return_3 titan_return_4 route_finish_nexus').split(/\s+/);
  var actualRouteIds = requiredRoute.map(function (x) { return x.id; });
  var sanctuaryIds = ['ATHLETE_SANCTUARY', 'BAGE_SANCTUARY', 'LEAN_SANCTUARY', 'VISIONARY_SANCTUARY', 'TITAN_SANCTUARY'];
  var sanctuaryTargets = { ATHLETE_SANCTUARY: [0, 140], BAGE_SANCTUARY: [0, 241], LEAN_SANCTUARY: [-108, 178], VISIONARY_SANCTUARY: [-150, 0], TITAN_SANCTUARY: [150, 124] };
  ok('M5.ROUTE the exact ordered normal-controller circuit and all five accessible sanctuary arrivals finish within 1.2 m without defeat/respawn', actualRouteIds.join('|') === expectedRouteIds.join('|') && requiredRoute.every(function (x) { return x.reached && x.distance_m <= 1.2 && !x.final_vitals.defeat && x.final_vitals.hp > 0 && x.final_vitals.defeats === x.from_vitals.defeats; }) && sanctuaryIds.every(function (id) { var x = report.sanctuary_arrivals[id], t = sanctuaryTargets[id]; return x && x.reached && x.distance_m <= 1.2 && x.target[0] === t[0] && x.target[1] === t[1]; }) && report.vitals.defeat_active_samples === 0 && report.vitals.defeat_edges === 0 && report.vitals.end_defeats === report.vitals.start_defeats && !report.vitals.active_defeat && report.vitals.min_hp > 0, { expected_ids: expectedRouteIds, actual_ids: actualRouteIds, failed: requiredRoute.filter(function (x) { return !x.reached; }), sanctuaries: report.sanctuary_arrivals, vitals: report.vitals });
  ok('M5.TRANSIT_FLIGHT hostile forest crossings and the Titan fish water/pass loop use accepted low flight below Phoenix aggro height and land fully', leanFlight0.pass && leanFlight1.pass && visionFlight0.pass && visionFlight1.pass && titanFlight0.pass && titanFlight0.state && titanFlight0.state.flight && titanFlight0.state.flight.altitude >= 6.1 && titanFlight0.state.flight.altitude < 25 && titanFlight1.pass && report.transit_flights.length === 6, report.transit_flights.map(function (x) { return { label: x.label, phase: x.phase, pass: x.pass, height: x.state && x.state.flight && x.state.flight.height_above_ground, altitude: x.state && x.state.flight && x.state.flight.altitude }; }));
  ok('M5.INTERIORS civic/training (including immediate repeat), temple, both market wings and tower use real prompt + confirm entry and exit transactions', report.interiors.length === 6 && report.interiors.every(function (x) { return x.pass; }), report.interiors.map(function (x) { return { name: x.name, pass: x.pass, room: x.inside.room, return_m: x.door_return_distance_m }; }));
  ok('M5.RESOURCES literal zero Combat MAHGIC does not regenerate; three physical harvests visibly refill the pool then inventory, and stored USE_REFILL restores a later spend', resources.pass, resources);

  /* Never concatenate windows separated by minutes: that would turn a legitimate
     patrol between samples into a fake single-frame step. Each displacement below
     comes from one contiguous 2.5–3.5 s observation window. */
  var bageDogs = tracks(bageEco, 'dogkies', 'DOGKIE').filter(function (x) { return x.sanctuaries.indexOf('BAGE_SANCTUARY') >= 0; });
  var bageFish = tracks(bageEco, 'wildlife', 'FISH').filter(function (x) { return x.schools.indexOf('BAGE_BASIN_W') >= 0; });
  var bageHorses = tracks(bageEco, 'wildlife', 'HORSE');
  var visionDogs = tracks(visionEco, 'dogkies', 'DOGKIE').filter(function (x) { return x.sanctuaries.indexOf('VISIONARY_SANCTUARY') >= 0; });
  var visionPhoenix = tracks(visionEco, 'wildlife', 'PHOENIX').filter(function (x) { return x.id === 'WILD_PHOENIX_2'; });   /* registry ecology.PHOENIX.habitat.anchors[1] = VISIONARY */
  var visionHorses = tracks(visionEco, 'wildlife', 'HORSE');
  var horses = bageHorses.concat(visionHorses);
  report.ecology.summary = { bage_dogkie: bageDogs, bage_fish: bageFish, visionary_dogkie: visionDogs, visionary_phoenix: visionPhoenix, horses: horses };
  ok('M5.ECOLOGY contiguous sanctuary windows prove Dogkie, Visionary Phoenix and Bage fish displacement while horses stay passive', bageDogs.length > 0 && bageDogs.some(function (x) { return x.max_step_m > 0.02 || x.max_from_first_m > 0.02; }) && visionDogs.length > 0 && visionDogs.some(function (x) { return x.max_step_m > 0.02 || x.max_from_first_m > 0.02; }) && visionPhoenix.length === 1 && visionPhoenix.some(function (x) { return (x.max_step_m > 0.1 || x.max_from_first_m > 0.1) && x.min_clearance_m >= 9.99 && !x.fight_seen && x.states.some(function (s) { return /PATROL|TRAVEL|CLIMB/.test(s); }); }) && bageFish.length > 0 && bageFish.some(function (x) { return (x.max_step_m > 0.02 || x.max_from_first_m > 0.02) && !x.fight_seen; }) && horses.length > 0 && horses.every(function (x) { return !x.fight_seen && !x.states.some(function (s) { return /ATTACK|CHASE|BITE|LUNGE/.test(s); }); }), report.ecology.summary);

  /* Both lighting states switch on the same world. A 1.2 s rAF window around
     each switch proves simulation/cloud drift continues and quantifies hitches. */
  var beforeTime = await ev("return {tod:P.timeOfDay(),programs:P.rendererDebug().info.programs.length,host_t:P.snap().play.host_t};");
  var day = await measuredTimeSwitch('DAY'); await shot('12_day_toggle');
  var night = await measuredTimeSwitch('NIGHT'); await shot('13_night_finish');
  var afterNight = await ev("return {tod:P.timeOfDay(),programs:P.rendererDebug().info.programs.length,host_t:P.snap().play.host_t};");
  report.time_states = { before: beforeTime, day: day, night: night, after: afterNight };
  ok('M5.TIME live NIGHT -> DAY -> NIGHT keeps simulation and world-fixed cloud drift moving, avoids a visible switch hitch, and adds no shader-program surge', beforeTime.tod === 'NIGHT' && day.returned === 'DAY' && day.observed === 'DAY' && night.returned === 'NIGHT' && night.observed === 'NIGHT' && afterNight.tod === 'NIGHT' && day.frames >= 20 && night.frames >= 20 && day.host_delta_s >= 1 && night.host_delta_s >= 1 && day.cloud_moved_m >= 0.1 && night.cloud_moved_m >= 0.1 && day.p95_ms < 100 && night.p95_ms < 100 && day.max_ms < 500 && night.max_ms < 500 && day.programs[1] - day.programs[0] <= 3 && night.programs[1] - night.programs[0] <= 3 && afterNight.programs - beforeTime.programs <= 3, report.time_states);
} catch (e) {
  report.fatal = String(e && e.stack || e);
  console.error(report.fatal);
}

if (pg) {
  report.cleanup = await cleanup();
  var C = report.cleanup || {};
  ok('M5.CLEANUP finishes healthy and grounded, FUSED in FIELD at NIGHT/FULL HUD with no Guide, emote/cast/guard/lock/equipment/menu/confirm residue', !C.error && C.room === 'FIELD' && C.form === 'FUSED' && !C.transforming && !C.flying && !C.exiting && !C.falling && Math.abs(C.flight_height || 0) <= 0.05 && Math.abs(C.flight_vz || 0) <= 0.05 && !C.guard && !C.lock && !C.emote && !C.cast && !C.defeat && C.hp > 0 && !C.room_recovery_used && C.equipment && C.equipment.manifested === 0 && !C.equipment.held && C.menu && !C.menu.open && C.tod === 'NIGHT' && C.hud && C.hud.mode === 'FULL' && (!C.guide || !C.guide.visible) && !C.confirm, C);
  try { await shot('99_cleanup'); } catch (e) { report.cleanup_screenshot_error = String(e && e.message || e); }
  report.runtime_errors = pg.errors.slice();
  var allErrors = report.runtime_errors.concat(report.console_errors);
  var unexpected = allErrors.filter(function (e) { return !/favicon\.ico|athlete_m_preview\/dev_0\.(?:1|2|3|4|5|6|7|9|10|11|12|13)\/manifest\.json|toNonIndexed/.test(String(e)); });
  report.unexpected_errors = unexpected;
  ok('M5.ERRORS no unexpected runtime, page or console errors', unexpected.length === 0, unexpected.slice(0, 12));
  await pg.close();
} else {
  ok('M5.CLEANUP browser launched for deterministic cleanup', false, report.fatal || 'browser unavailable');
  ok('M5.ERRORS browser launched for error gate', false, report.fatal || 'browser unavailable');
}
if (srv) srv.close();
if (report.fatal) ok('M5.PROBE completes without an exception', false, report.fatal);
report.pass = pass; report.fail = fail; report.finished_at = new Date().toISOString(); report.duration_ms = report.started_at ? Date.parse(report.finished_at) - Date.parse(report.started_at) : null;
fs.writeFileSync(path.join(OUT, 'm5_candidate_route.json'), JSON.stringify(report, null, 1));
console.log('RESULT M5 candidate route ' + pass + ' pass / ' + fail + ' fail -> ' + OUT);
process.exit(fail ? 1 : 0);
