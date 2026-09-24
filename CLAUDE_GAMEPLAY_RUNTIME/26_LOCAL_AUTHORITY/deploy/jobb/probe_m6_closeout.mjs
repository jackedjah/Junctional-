/* MAHWORLD M6 bounded closeout visual check.
   One local static-preview session, ten reused views/two short action sequences. No regression, soak, package, or deploy.
   node 26_LOCAL_AUTHORITY/deploy/jobb/probe_m6_closeout.mjs [static_dist] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';

var HERE = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HERE, '..', '..', '..');
var DIST = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, '26_LOCAL_AUTHORITY', 'deploy', 'static_dist');
var FLOOR_ONLY = process.argv.includes('--floor-only');
var OUT = path.join(ROOT, '25_HANDOFF', 'CONVERGENCE', 'astra_m6_closeout', 'visual_check', ...(FLOOR_ONLY ? ['floor_recheck'] : []));
fs.mkdirSync(OUT, { recursive: true });
var REG = JSON.parse(fs.readFileSync(path.join(ROOT, '26_LOCAL_AUTHORITY', 'lab', 'assets', 'world', 'world_registry_v1.json'), 'utf8'));
var report = { generated_at: new Date().toISOString(), source: 'fresh local static_dist; not packaged or deployed', scope: 'one bounded M6 visual session', screenshots: [], runtime: {}, resource: {}, equipment: {}, attacks: {}, console_errors: [], unresolved: [] };
var srv = await serveStatic(DIST), pg = await launchChrome({ width: 1280, height: 800, dpr: 1, gpu: true, timeScale: 0.55, cmdTimeoutMs: 120000 });
async function ev(src) { return await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY,H=window.MAHWORLD_STATIC_HOST; " + src + " })()"); }
async function shot(name) { var f = path.join(OUT, name + '.png'); await pg.screenshot(f); report.screenshots.push(name + '.png'); console.log('SHOT ' + name); return f; }
async function place(x, z, facing, camYaw, pitch, dist, pivot) { return await ev("var r=await P.devPlay('PLACE',{x:" + (+x) + ",z:" + (+z) + "}); await P.send('MOVE',{forward:0,strafe:0,run:false,fast:false,yaw:" + (+facing || 0) + "}); P.camAt(null); P.camFollow(false); P.cam(" + (+camYaw || 0) + "," + (+pitch || 0.14) + "," + (+dist || 8) + "," + (+pivot || 1.15) + "); return {fixture:r,position:P.snap().play.position,camera:P.camState()};"); }
async function tick() { return await ev("var L=H.host.dev.log();return L.length?L[L.length-1].tick:0;"); }
async function events(since, kinds) { return await ev("var L=H.host.dev.log(),K=" + JSON.stringify(kinds) + ";return L.filter(function(e){return e.tick>=" + (+since || 0) + "&&K.indexOf(e.kind)>=0;});"); }
async function resetCombat() { return await ev("var pi=H.host.dev.play_internals(),rf=pi.rulesField(),st=rf.state(),id=Object.keys(st.combatants).filter(function(k){return st.combatants[k].kind==='PLAYER';})[0],me=rf.combatant(id);me.cooldowns={};me.pool.refund(1000);return {id:id,energy:me.pool.state()};"); }
async function manifestHeld(kind, count) { await ev("P.send('EQUIP_DISMISS',{});return 1;"); await sleep(1500); var m = await ev("return P.send('EQUIP_MANIFEST',{kind:'" + kind + "',count:" + count + "});"); await sleep(3600); var items = await ev("return (P.snap().play.equipment.manifested||[]).filter(function(x){return x.kind==='" + kind + "';});"); var picks = []; for (var i = 0; i < items.length; i++) { picks.push(await ev("return P.send('EQUIP_PICKUP',{id:'" + items[i].id + "'});")); await sleep(180); } await sleep(700); return { manifest: m, items: items, picks: picks, debug: await ev("var W=P.worldLayer(),g=W&&W.gear&&W.gear();return g&&g.debug?g.debug():null;") }; }

try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1');
  await waitForGame(pg, 150000); await sleep(6500);
  await ev("P.hud.showGuide(false);P.hud.setDev&&P.hud.setDev(false);P.hud.hudMode&&P.hud.hudMode(true);P.camFollow(false);P.timeOfDay('NIGHT');return 1;"); await sleep(1800);
  report.runtime.initial = await ev("var W=P.worldLayer(),d=W&&W.debug?W.debug():null,e=P.entity('me'),B=e&&e.fused&&e.fused.rig&&e.fused.rig.bones;return {world:P.world(),debug:d,character:{bones:B?Object.keys(B):[],visible_meshes:(function(){var n=0;if(e&&e.root)e.root.traverse(function(o){if(o.isMesh&&o.visible)n++;});return n;})()}};");

  /* Ground transition + actor-at-rest integrity in one elevated view. */
  await place(-40, 40, 2.3, 2.3, 0.52, 18, 1.15); await sleep(900); await shot('01_floor_road_and_rest_integrity');

  if (!FLOOR_ONLY) {
  /* Actual derivative Moon + elongated clouds. */
  await place(-120, -45, 0.35, 0.35, -0.22, 7, 1.2); await sleep(1700); await shot('02_actual_moon_and_elongated_clouds');

  /* Blue MAH GYM aura, then nearest selected canopy from the same one-draw mist system. */
  await place(-74, 110, -Math.PI / 2, -Math.PI / 2, 0.23, 14, 1.4); await sleep(1200); await shot('03_mah_gym_blue_arcane_aura');
  var arch = await ev("var d=P.worldLayer().debug();return d&&d.architecture;"); report.runtime.architecture = arch;
  var cs = (arch && arch.canopy_aura_samples || []).slice().sort(function(a,b){return Math.hypot(a.x+74,a.z-110)-Math.hypot(b.x+74,b.z-110);})[0];
  if (cs) { var dx = cs.x + 74, dz = cs.z - 110, dl = Math.hypot(dx,dz) || 1, px = cs.x - dx / dl * 7, pz = cs.z - dz / dl * 7, fy = Math.atan2(cs.x-px,-(cs.z-pz)); await place(px,pz,fy,fy,0.58,12,2.8); await sleep(1400); await shot('04_selected_canopy_mist_accent'); report.runtime.canopy_view = cs; } else report.unresolved.push('architecture debug returned no selected canopy sample');

  /* Dogkie source albedo identity. */
  var pack = REG.creatures.DOGKIE.pack_territories[0]; await place(pack.x + 5, pack.z + 5, -2.35, 2.75, 0.18, 8, 1.05); await sleep(3600);
  var dog = await ev("return (P.snap().play.creatures||[]).filter(function(x){return x.species==='DOGKIE'||/^DOGKIE/.test(x.id);})[0]||null;");
  if (dog && dog.position) { var fy2 = Math.atan2(dog.position.x-(pack.x+5),-(dog.position.z-(pack.z+5))); await place(pack.x+5,pack.z+5,fy2,fy2+Math.PI,0.16,7,1.0); await sleep(850); }
  await shot('05_dogkie_source_color'); report.runtime.dogkie = { host: dog, debug: await ev("var W=P.worldLayer(),g=W&&W.creatures&&W.creatures();return g&&g.debug?g.debug():null;") };

  /* Dense bush + physical attack/refill + true dumbbell grips. */
  var bush = REG.resource_patches.list.filter(function(x){return x.id==='RB_NEXUS_INTRO';})[0]; await resetCombat(); await place(bush.x,bush.z+3.0,0,2.86,0.13,5.2,1.05); await sleep(900); await shot('06_dense_resource_bush_before');
  var db = await manifestHeld('DUMBBELL',2); report.equipment.dumbbell = db; await ev("P.send('LOCK_TARGET',{aim_id:'NODE_" + bush.id + "'});P.send('RULES_SELECT',{category:'PHYSICAL',slot:0});return 1;"); var rt = await tick(); var first = await ev("return P.send('RULES_CAST',{});"); await sleep(430); await shot('07_dumbbell_grip_physical_impact'); await sleep(1250);
  var broken = false, casts = [first]; for (var ci=0;ci<9&&!broken;ci++) { await resetCombat(); casts.push(await ev("return P.send('RULES_CAST',{});")); await sleep(1450); broken = await ev("var n=(P.snap().play.nodes||[]).filter(function(x){return x.id==='NODE_" + bush.id + "';})[0];return !!(n&&n.broken);"); }
  var drops = await ev("return (P.snap().play.collectibles||[]).slice();"); await shot('08_resource_broken_refill_drops'); for (var di=0;di<drops.length;di++) { await ev("return P.devPlay('PLACE',{x:" + drops[di].x + ",z:" + drops[di].z + "});"); await sleep(500); }
  report.resource = { patch: bush, casts: casts, broken: broken, drops: drops, events: await events(rt,['R1723_DAMAGE','RESOURCE_NODE_BROKEN','REFILL_PICKED']), after: await ev("var p=P.snap().play;return {energy:p.equipment.combat_mahgic,refills:p.equipment.refills,collectibles:p.collectibles};") };

  /* Full L0 barbell at rest, then one actual physical-MAHGIC move as a short load/release pair. */
  await resetCombat(); var bar = await manifestHeld('BARBELL',1); report.equipment.barbell = bar; await place(24,30,0,2.88,0.12,5.2,1.05); await sleep(700); await shot('09_true_barbell_grip_full_geometry');
  var pmSelect = await ev("return P.send('RULES_SELECT',{category:'PHYSICAL_MAGIC',slot:0});"), pmSkill = await ev("return P.snap().play.rules.me.selected_skill;"), pmCast = await ev("return P.send('RULES_CAST',{});"); report.attacks.physical_mahgic = { select: pmSelect, skill: pmSkill, cast: pmCast, samples: [] }; await sleep(1250); report.attacks.physical_mahgic.samples.push(await ev("var p=P.snap().play,e=P.entity('me'),a=e&&e.fused&&e.fused.animator;return {cast:p.rules&&p.rules.me.cast,arc:a&&a.attackArc?a.attackArc():null,pose:P.poseOf('me',['PELVIS','SPINE','CHEST','UPPERARM_L','UPPERARM_R','FOREARM_L','FOREARM_R','HAND_L','HAND_R'])};")); await shot('10_physical_mahgic_load_with_bar'); await sleep(850); report.attacks.physical_mahgic.samples.push(await ev("var p=P.snap().play,e=P.entity('me'),a=e&&e.fused&&e.fused.animator;return {cast:p.rules&&p.rules.me.cast,arc:a&&a.attackArc?a.attackArc():null,pose:P.poseOf('me',['PELVIS','SPINE','CHEST','UPPERARM_L','UPPERARM_R','FOREARM_L','FOREARM_R','HAND_L','HAND_R'])};")); await shot('11_physical_mahgic_release_with_bar');

  report.runtime.final = await ev("var W=P.worldLayer(),d=W&&W.debug?W.debug():null,e=P.entity('me');return {world:P.world(),debug:d,gear:W&&W.gear&&W.gear().debug(),character_visible_meshes:(function(){var n=0;if(e&&e.root)e.root.traverse(function(o){if(o.isMesh&&o.visible)n++;});return n;})()};");
  }
  report.console_errors = pg.errors.filter(function(e){return !/favicon\.ico|athlete_m_preview\/dev_0\.(?:1|2|3|4|5|6|7|9|10|11|12|13)\/manifest\.json|404.*(?:fallback|motion|animation|glb)/i.test(String(e));});
} catch (e) {
  report.unresolved.push(String(e && e.stack || e));
} finally {
  fs.writeFileSync(path.join(OUT,'m6_visual_check.json'),JSON.stringify(report,null,1));
  console.log('M6 VISUAL CHECK → ' + OUT + ' · shots=' + report.screenshots.length + ' unresolved=' + report.unresolved.length + ' errors=' + report.console_errors.length);
  await pg.close(); srv.close();
}
process.exit(report.unresolved.length || report.console_errors.length ? 1 : 0);
