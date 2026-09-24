/* Diagnostic-only M5 time-state program audit. It records the exact WebGL
   program cache entries added by a live NIGHT/DAY switch after the normal
   READY gate, without weakening the candidate-route hitch threshold. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';

var HERE = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HERE, '..', '..', '..');
var argv = process.argv.slice(2);
function arg(k, d) { var i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; }
var DIST = path.resolve(arg('--dist', path.join(ROOT, '26_LOCAL_AUTHORITY', 'deploy', 'static_dist')));
var OUT = path.resolve(arg('--out', path.join(ROOT, '25_HANDOFF', 'CONVERGENCE', 'astra_m5', 'time_switch_debug')));
var COLD_ROUTE = argv.indexOf('--cold-route') >= 0;
fs.mkdirSync(OUT, { recursive: true });

var srv = await serveStatic(DIST), pg = null;
var report = { generated_at: new Date().toISOString(), stages: [], errors: [] };
function programSource() {
  return "return (P.rendererDebug().info.programs||[]).map(function(p,i){var k=String(p.cacheKey||'');return {i:i,name:p.name||'',used:p.usedTimes,cache_key:k,cache_key_length:k.length};});";
}
async function ev(src) { return await pg.evaluate("(async function(){var P=window.MAHWORLD_PLAY;" + src + "})()"); }
async function programs() { return await ev(programSource()); }
async function switchState(label, want) {
  await sleep(1800);
  var before = await programs();
  var measured = await ev("return await new Promise(function(resolve){var d=[],prev=performance.now(),start=prev,sync0=performance.now(),returned=P.timeOfDay('" + want + "'),sync_ms=performance.now()-sync0;function f(now){d.push(now-prev);prev=now;if(now-start<1400){requestAnimationFrame(f);return;}var q=d.slice().sort(function(a,b){return a-b;}),mx=Math.max.apply(null,d),pct=function(x){return q[Math.min(q.length-1,Math.floor((q.length-1)*x))]||null;};resolve({returned:returned,observed:P.timeOfDay(),sync_ms:+sync_ms.toFixed(2),frames:q.length,p50_ms:+pct(.5).toFixed(2),p95_ms:+pct(.95).toFixed(2),max_ms:+mx.toFixed(2),max_frame_index:d.indexOf(mx),first_frames_ms:d.slice(0,8).map(function(x){return +x.toFixed(2);}),slow_frames:d.map(function(x,i){return {i:i,ms:+x.toFixed(2)};}).filter(function(x){return x.ms>=80;})});}requestAnimationFrame(f);});");
  var after = await programs(), have = new Set(before.map(function (x) { return x.cache_key; }));
  var row = { label: label, want: want, before_count: before.length, after_count: after.length, measured: measured, added: after.filter(function (x) { return !have.has(x.cache_key); }) };
  report.stages.push(row);
  console.log(label + ' ' + JSON.stringify({ measured: measured, before: before.length, after: after.length, added: row.added.map(function (x) { return { i: x.i, name: x.name, used: x.used, key_len: x.cache_key_length, key_head: x.cache_key.slice(0, 240) }; }) }));
  return row;
}

try {
  pg = await launchChrome({ width: 1280, height: 800, dpr: 1.25, gpu: true, unlockFps: true, cmdTimeoutMs: 180000 });
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&sky=night&quality=MED');
  await waitForGame(pg, 180000);
  for (var i = 0; i < 300; i++) {
    var ready = await ev("var w=P.world(),s=P.warmState(),d=P.district();return {world:w&&w.status,warm:!!s.world_done,landmarks:d&&d.loaded?d.loaded.length:0};");
    if (ready.world === 'READY' && ready.warm && ready.landmarks >= 4) break;
    await sleep(500);
  }
  if (!COLD_ROUTE) {
    await switchState('boot_day', 'DAY');
    await switchState('boot_night', 'NIGHT');
  }

  await ev("P.hud.doButton('mahguide',document.getElementById('g-mahguide'));return 1;");
  for (var g = 0; g < 80; g++) { var gd = await ev("var W=P.worldLayer(),x=W&&W.guides&&W.guides();return x&&x.debug?x.debug():null;"); if (gd && gd.on_stage) break; await sleep(250); }
  await ev("return P.send('EQUIP_MANIFEST',{kind:'DUMBBELL',count:2});"); await sleep(1500);
  await ev("P.send('EQUIP_DISMISS',{});P.hud.doButton('mahguide',document.getElementById('g-mahguide'));return 1;"); await sleep(800);
  if (!COLD_ROUTE) {
    await switchState('after_guide_gear_day', 'DAY');
    await switchState('after_guide_gear_night', 'NIGHT');
  }

  var locations = [[0,140],[0,241],[-108,178],[-150,0],[150,124],[0,0]];
  for (var p = 0; p < locations.length; p++) { await ev("return P.devPlay('PLACE',{x:" + locations[p][0] + ",z:" + locations[p][1] + "});"); await sleep(1200); }
  if (COLD_ROUTE) {
    /* Match the candidate's first-time NIGHT route: exercise the four shipped
       room builders before the first DAY frame, then return to the nexus. */
    var rooms = ['CIVIC_TRAINING_HALL', 'TEMPLE_HALL', 'CLOTHING_SHOP', 'TOWER_HALL'];
    for (var q = 0; q < rooms.length; q++) {
      await ev("return P.enterRoom('" + rooms[q] + "','ENTER_ROOM');"); await sleep(1800);
      await ev("return P.enterRoom('FIELD','ENTER_ROOM');"); await sleep(1800);
    }
    await ev("return P.devPlay('PLACE',{x:0,z:0});"); await sleep(1800);
    await switchState('cold_route_night_noop', 'NIGHT');
    await switchState('cold_route_first_day', 'DAY');
    await switchState('cold_route_return_night', 'NIGHT');
  } else {
    await switchState('after_mainland_views_day', 'DAY');
    await switchState('after_mainland_views_night', 'NIGHT');
  }
} catch (e) {
  report.fatal = String(e && e.stack || e);
  console.error(report.fatal);
} finally {
  if (pg) { report.errors = pg.errors.slice(); await pg.close(); }
  srv.close();
  report.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'time_switch_debug.json'), JSON.stringify(report, null, 1));
}
process.exit(report.fatal ? 1 : 0);
