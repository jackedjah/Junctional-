/* JOB B plan view: renders the live FIELD scene top-down with an orthographic camera (fog off for the capture) at several extents and
   also a few oblique establishing shots — the placement / cleanup proof before and after world edits.
   node deploy/jobb/plan_view.mjs <out dir> [--tag before] [--night] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); var OUT = path.resolve(argv[0] || path.join(HERE, '..', 'probe_out', 'jobb', 'plan')); fs.mkdirSync(OUT, { recursive: true });
var tag = argv.indexOf('--tag') >= 0 ? argv[argv.indexOf('--tag') + 1] : 'plan'; var night = argv.indexOf('--night') >= 0;
var DIST = path.join(HERE, '..', 'static_dist'); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1400, height: 1400, gpu: true, unlockFps: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (night ? '&sky=night' : '')); await waitForGame(pg, 120000); await sleep(5000); await ev("P.hud.showGuide(false); P.hud.setDev && P.hud.setDev(false); return 1;");
  for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); }
  await sleep(1500); await ev("document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1;");
  /* orthographic top-down captures rendered by the page's own renderer into its canvas */
  var views = [['top_vast', 0, 120, 700], ['top_full', 0, 120, 190], ['top_plaza', 0, 0, 70], ['top_north', 0, 200, 110], ['top_west', -110, 130, 90], ['top_east', 110, 130, 90], ['top_south', 0, -20, 60]];
  /* swap the camera the page renders with (the page's own frame loop keeps running) */
  await ev("var THREE=P.THREE; var r=P.rendererDebug(); if(!r.__orig) { r.__orig=r.render.bind(r); r.render=function(sc,cam){ var sc2=sc; if(window.__ortho){ var fog=sc.fog; sc.fog=null; var sky=sc.getObjectByName('MAHWORLD_SKY'); var skyV=sky?sky.visible:null; if(sky) sky.visible=false; r.__orig(sc, window.__ortho); sc.fog=fog; if(sky) sky.visible=skyV; } else r.__orig(sc,cam); }; } return 1;");
  for (var v of views) { await ev("var THREE=P.THREE; var half=" + v[3] + "; var cam=new THREE.OrthographicCamera(-half, half, half, -half, 1, 1200); cam.position.set(" + v[1] + ", 400, " + v[2] + "); cam.up.set(0,0,-1); cam.lookAt(" + v[1] + ", 0, " + v[2] + "); cam.updateProjectionMatrix(); window.__ortho=cam; return 1;"); await sleep(400); await pg.screenshot(path.join(OUT, tag + '_' + v[0] + '.png')); }
  await ev("window.__ortho=null; return 1;"); await sleep(200);
  /* oblique establishing shots from the player's own camera */
  var obl = [['coast_south', 0, -50, 0.0, 0.12, 30], ['coast_west', -150, 60, 1.57, 0.1, 30], ['canal_beach', -60, 212, 0.4, 0.2, 18], ['plaza_from_south', 0, -40, 3.1, 0.35, 60], ['gym_approach', -70, 100, 2.4, 0.2, 40], ['market_north', 0, 215, 3.14, 0.25, 40], ['skyline_west', -60, 40, 2.0, 0.05, 30]];
  for (var o of obl) { await ev("return P.goTo(" + o[1] + ", " + o[2] + ", undefined, undefined, 60000);"); await sleep(400); await ev("P.camFollow(false); P.cam(" + o[3] + ", " + o[4] + ", " + o[5] + ", 6); return 1;"); await sleep(900); await pg.screenshot(path.join(OUT, tag + '_' + o[0] + '.png')); }
  var info = await ev("var r=P.renderInfo(); var d=P.district(); return { calls: r.calls, tris: r.triangles, district: d.loaded.map(function(b){ return b.id+':'+b.tris; }), failed: d.failed };"); fs.writeFileSync(path.join(OUT, tag + '_info.json'), JSON.stringify(info, null, 1)); console.log('plan captured', tag, JSON.stringify(info).slice(0, 300));
} catch (e) { console.error(e); } finally { await pg.close(); srv.close(); }
