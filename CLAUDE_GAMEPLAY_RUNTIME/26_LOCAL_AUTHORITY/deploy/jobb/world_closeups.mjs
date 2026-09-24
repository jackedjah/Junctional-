/* JOB B close-ups with a FREE inspection camera (the page's renderer is patched to draw with a probe camera for the capture — the game camera
   and its collision are untouched): the guide beside the player, a Dogkie in the forest (+ its procedural gait / attack states in practice),
   the projector beacon, the gym barbell. node deploy/jobb/world_closeups.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, '..', 'probe_out', 'jobb', 'closeups'); fs.mkdirSync(OUT, { recursive: true });
var DIST = path.join(HERE, '..', 'static_dist'); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1280, height: 800, gpu: true, unlockFps: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function freeCam(from, at) { await ev("var THREE=P.THREE; var r=P.rendererDebug(); if(!r.__orig){ r.__orig=r.render.bind(r); r.render=function(sc,cam){ if(window.__freecam){ r.__orig(sc, window.__freecam); } else r.__orig(sc,cam); }; } var c=new THREE.PerspectiveCamera(45, 1280/800, 0.1, 1400); c.position.set(" + from.join(',') + "); c.lookAt(" + at.join(',') + "); c.updateProjectionMatrix(); window.__freecam=c; return 1;"); }
async function shot(name) { await ev("document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1;"); await sleep(200); await pg.screenshot(path.join(OUT, name + '.png')); await ev("document.querySelectorAll('body > *').forEach(function(e){ e.style.visibility=''; }); return 1;"); }
var report = { shots: [], errors: [] };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 120000); await sleep(3000); await ev("P.hud.showGuide(false); return 1;");
  for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
  for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(1500);
  /* guide: MRS follows; camera 2.2 m from the guide looking at it (player in frame) */
  await ev("var g=P.worldLayer().guides(); g.setGuide('MRS'); g.setVisible(true); return 1;"); await sleep(3000); await ev("return P.goTo(6, -6, undefined, undefined, 20000);"); await sleep(1500);
  var gp = await ev("var g=P.worldLayer().guides(); var d=g.debug(); var me=P.snap().play.position; return { pos: d.pos, me: me, d: d };"); console.log('guide', JSON.stringify(gp.d).slice(0, 200));
  await freeCam([gp.pos[0] + 1.6, gp.pos[1] + 0.35, gp.pos[2] + 1.6], gp.pos); await shot('guide_mrs_close'); report.shots.push({ id: 'guide_mrs_close', guide: gp.d });
  await ev("var g=P.worldLayer().guides(); g.setGuide('MR'); return 1;"); await sleep(2500); gp = await ev("var g=P.worldLayer().guides(); var d=g.debug(); return { pos: d.pos, d: d };"); await freeCam([gp.pos[0] + 1.6, gp.pos[1] + 0.35, gp.pos[2] + 1.6], gp.pos); await shot('guide_mr_close'); report.shots.push({ id: 'guide_mr_close', guide: gp.d });
  await ev("var g=P.worldLayer().guides(); g.setGuide(null); window.__freecam=null; return 1;");
  /* projector beacon (-80, 98) and the gym door */
  await ev("return P.goTo(-74, 92, undefined, undefined, 60000);"); await sleep(800); await freeCam([-72, 2.6, 92], [-80, 2.2, 98]); await shot('projector_close'); await ev("window.__freecam=null; return 1;");
  /* Dogkie: walk to the west forest, then frame the nearest active creature from 4 m; PRACTICE on → chase / bite frames */
  await ev("return P.goTo(-96, 2, undefined, undefined, 60000);"); await sleep(2500);
  async function nearest() { return await ev("var p=P.snap().play; var me=p.position; var best=null, bd=1e9; (p.creatures||[]).forEach(function(c){ var d=Math.hypot(c.position.x-me.x, c.position.z-me.z); if(d<bd){ bd=d; best=c; } }); return best ? { id: best.id, x: best.position.x, z: best.position.z, state: best.state, d: bd, hp: best.hp } : null;"); }
  var near = await nearest(); console.log('nearest', JSON.stringify(near)); if (near) { await ev("return P.goTo(" + (near.x + 4) + ", " + (near.z + 3) + ", undefined, undefined, 40000);"); await sleep(800); for (var k = 0; k < 3; k++) { near = await nearest(); await freeCam([near.x + 3.2, 1.4, near.z + 2.6], [near.x, 0.7, near.z]); await shot('dogkie_' + near.state.toLowerCase() + '_' + k); report.shots.push({ id: 'dogkie_' + k, c: near }); await sleep(700); }
    await ev("P.send('FIELD_PRACTICE', { on: true }); return 1;"); await sleep(400); for (var k2 = 0; k2 < 6; k2++) { await sleep(700); near = await nearest(); if (!near) break; await freeCam([near.x + 3.2, 1.5, near.z + 2.6], [near.x, 0.7, near.z]); await shot('dogkie_practice_' + near.state.toLowerCase() + '_' + k2); report.shots.push({ id: 'dogkie_practice_' + k2, c: near }); }
    var me = await ev("var r=P.snap().play.rules; return r ? { hp: r.me.hp, max: r.me.max } : null;"); report.me_after_practice = me; console.log('me after practice', JSON.stringify(me)); await ev("P.send('FIELD_PRACTICE', { on: false }); window.__freecam=null; return 1;"); }
  var cr = await ev("var wb=P.worldLayer(); var m=wb.creatures(); return m && m.debug ? m.debug() : null;"); report.creatures = cr;
  report.errors = pg.errors.filter(function (e) { return !/404|favicon/.test(e); }).slice(0, 20);
} catch (e) { report.fatal = String(e && e.stack || e); console.error(e); } finally { fs.writeFileSync(path.join(OUT, 'closeups.json'), JSON.stringify(report, null, 1)); await pg.close(); srv.close(); }
console.log('RESULT world_closeups ' + (report.fatal ? 'FATAL' : 'OK') + ' shots ' + report.shots.length + ' errors ' + report.errors.length);
