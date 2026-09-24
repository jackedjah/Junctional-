/* S13 emote endpoint stills: front + side views at the held pose of each endpoint-driven emote (manual framing, camFollow off).
   node deploy/probe_emote_stills.mjs [tag] -> deploy/probe_out/<tag>_<emote>_<view>.png + the animator's endpoint read-out */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true }); var tag = process.argv[2] || 'em';
var srv = await serveStatic(path.join(HERE, 'static_dist')); var pg = await launchChrome({ width: 900, height: 900, gpu: true });
var P = function (e) { return pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + e + " })()"); };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 120000); await sleep(4000); await P("P.hud.showGuide(false); P.camFollow(false); document.querySelectorAll('body > *').forEach(function(e){ if (e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return 1;");
  var EM = process.argv[3] ? process.argv[3].split(',').map(function (x) { var p = x.split(':'); return [p[0], parseFloat(p[1] || '1.3')]; }) : [['WAVE', 1.3], ['FRONT_LAT_SPREAD', 1.5], ['DOUBLE_BICEPS', 1.4], ['THUMBS_UP', 0.8]];
  for (var e of EM) {
    await P("return P.send('EMOTE',{emote_id:'" + e[0] + "'})"); await sleep(e[1] * 1000);
    var ry = await P("return P.mePose().root_yaw;");
    await P("P.cam(" + (Math.PI - ry) + ", 0.05, 3.4, 1.15); return 1;"); await sleep(250); await pg.screenshot(path.join(OUT, tag + '_' + e[0] + '_front.png'));
    await P("P.cam(" + (Math.PI / 2 - ry) + ", 0.05, 3.4, 1.15); return 1;"); await sleep(250); await pg.screenshot(path.join(OUT, tag + '_' + e[0] + '_side.png'));
    var dbg = await P("var a=P.entityAnimators('me')[0]; return a && a.armDebug ? JSON.stringify(a.armDebug()) : 'n/a';"); console.log(e[0], dbg);
    await sleep(2600);
  }
} finally { await pg.close(); srv.close(); }
