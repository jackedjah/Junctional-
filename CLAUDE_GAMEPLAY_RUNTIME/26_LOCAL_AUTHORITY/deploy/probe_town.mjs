/* TOWN PROBE — wide shots of the plaza with the residents, the quest NPC prompt + dialog. */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var tag = process.argv[2] || 'town'; var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 1200, height: 750, gpu: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(6000);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); return 1; })()");
  console.log('bodies', await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.classBodies())"));
  await pg.evaluate("window.MAHWORLD_PLAY.cam(0.2, 0.55, 22, 1.0)"); await sleep(600); await pg.screenshot(path.join(OUT, tag + '_wide.png'));
  /* walk to the quest NPC (-3.5, 16.5) and talk */
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(-3.5, 14.2)"); await sleep(1200);
  var prompts = await pg.evaluate("JSON.stringify((window.MAHWORLD_PLAY.snap().play.prompts||[]).map(function(p){return p.intent+':'+p.label}))"); console.log('prompts', prompts);
  await pg.evaluate("window.MAHWORLD_PLAY.cam(3.3, 0.18, 4.2, 1.2)"); await sleep(400); await pg.screenshot(path.join(OUT, tag + '_npc_prompt.png'));
  var talk = await pg.evaluate("window.MAHWORLD_PLAY.send('NPC_TALK',{npc:'NPC_VISIONARY_M'}).then(function(r){ if (r && r.ok) window.MAHWORLD_PLAY.hud.dialog('NPC_VISIONARY_M', r.title, r.lines); return JSON.stringify(r); })"); console.log('talk', talk.slice(0, 300)); await sleep(500);
  await pg.screenshot(path.join(OUT, tag + '_npc_dialog.png'));
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
