/* JOB B budget probe: at a few camera spots, measures renderer calls / triangles with the whole world layer visible, then with each world
   module's objects hidden one at a time (delta = that module's cost at that spot). Also lists the world layer's mesh inventory.
   node deploy/jobb/world_budget.mjs [--night] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); var night = argv.indexOf('--night') >= 0; var NOWORLD = argv.indexOf('--noworld') >= 0;
var OUT = path.join(HERE, '..', 'probe_out', 'jobb', 'budget'); fs.mkdirSync(OUT, { recursive: true });
var DIST = path.join(HERE, '..', 'static_dist'); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1280, height: 800, gpu: true, unlockFps: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
var report = { night: night, spots: [], inventory: null };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (night ? '&sky=night' : '') + (NOWORLD ? '&world=0' : '')); await waitForGame(pg, 120000); await sleep(3000); await ev("P.hud.showGuide(false); return 1;");
  for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED' || w === 'DISABLED' || NOWORLD) break; await sleep(500); }
  for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(1500);
  /* inventory: every renderable under the world group, by top-level child name */
  report.inventory = await ev("var wb=P.worldLayer(); if(!wb) return {}; var out={}; wb.group.children.forEach(function(ch){ var n=0, tris=0, inst=0; ch.traverse(function(o){ if(o.isMesh||o.isSprite||o.isPoints||o.isLine){ n++; var g=o.geometry; var t=g&&g.index?g.index.count/3:(g&&g.attributes.position?g.attributes.position.count/3:0); var c=o.isInstancedMesh?o.count:1; inst+= o.isInstancedMesh?o.count:0; tris+=t*c; } }); out[ch.name||ch.type]={ renderables:n, tris:Math.round(tris), instances:inst }; }); return out;");
  console.log('inventory', JSON.stringify(report.inventory));
  var spots = [['plaza_wide', 0, -30, 3.14, 0.32, 40], ['forest_w_inside', -100, 5, -1.2, 0.12, 22], ['canal_bridge_main', 0, 200, 0.0, 0.22, 34], ['match_hall_approach', 80, 6, 1.6, 0.15, 36]];
  var groups = ['MAHWORLD_JOB_B'];
  for (var k = 0; k < spots.length; k++) { var o = spots[k]; await ev("return P.goTo(" + o[1] + ", " + o[2] + ", undefined, undefined, 60000);"); await sleep(500); await ev("P.camFollow(false); P.cam(" + o[3] + ", " + o[4] + ", " + o[5] + ", 6); return 1;"); await sleep(1000);
    var base = await ev("var r=P.renderInfo(); return { calls: r.calls, tris: r.triangles };");
    var offAll = await ev("var wb=P.worldLayer(); if(!wb) return null; wb.group.visible=false; return new Promise(function(res){ setTimeout(function(){ var r=P.renderInfo(); wb.group.visible=true; res({ calls: r.calls, tris: r.triangles }); }, 250); });");
    var per = await ev("var wb=P.worldLayer(); if(!wb) return {}; var names=wb.group.children.map(function(c){ return c.name||c.type; }); return new Promise(function(res){ var out={}; var i=0; function step(){ if(i>=names.length){ res(out); return; } var ch=wb.group.children[i]; var v=ch.visible; ch.visible=false; setTimeout(function(){ var r=P.renderInfo(); ch.visible=v; out[names[i]]={ calls: r.calls, tris: r.triangles }; i++; step(); }, 220); } step(); });");
    var deltas = {}; Object.keys(per).forEach(function (n) { deltas[n] = { calls: base.calls - per[n].calls, tris: base.tris - per[n].tris }; });
    report.spots.push({ id: o[0], base: base, without_world: offAll, module_cost: deltas }); console.log(o[0], 'base', JSON.stringify(base), 'without world', JSON.stringify(offAll)); Object.keys(deltas).forEach(function (n) { if (deltas[n].calls || deltas[n].tris) console.log('   ' + n + ' calls ' + deltas[n].calls + ' tris ' + deltas[n].tris); }); }
  report.errors = pg.errors.slice(0, 20);
} catch (e) { report.fatal = String(e && e.stack || e); console.error(e); } finally { fs.writeFileSync(path.join(OUT, (night ? 'night_' : '') + 'budget.json'), JSON.stringify(report, null, 1)); await pg.close(); srv.close(); }
console.log('RESULT world_budget ' + (report.fatal ? 'FATAL' : 'OK'));
