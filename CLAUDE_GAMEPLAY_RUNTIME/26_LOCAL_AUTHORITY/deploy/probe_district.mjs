/* S11 district probe: skyline from the plaza, each landmark, map, render cost. node deploy/probe_district.mjs [tag] */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true }); var tag = process.argv[2] || 'd';
var srv = await serveStatic(path.join(HERE, 'static_dist')); var pg = await launchChrome({ width: 1280, height: 720, gpu: true });
var P = function (e) { return pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + e + " })()"); };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(6000);
  console.log('district', await P("return JSON.stringify(P.district())"), 'room size', await P("return P.snap().play.room_size_m"), 'colliders', await P("var c=P.snap().play.rules.colliders; return c.version+' base '+c.shapes.length+' district '+c.district_shapes+' groups '+JSON.stringify(c.groups.map(function(g){return g.id+':'+g.count;}))"));
  await P("P.hud.showGuide(false); P.camFollow(false); return 1;");
  await P("P.cam(Math.PI, 0.12, 14, 2.0); return 1;"); await sleep(600); await pg.screenshot(path.join(OUT, tag + '_skyline_from_spawn.png'));
  var shots = [['temple', 0, 112, 3.14, 0.16, 62, 22], ['gym', -60, 110, 1.57, 0.15, 80, 25], ['tower', 60, 110, -1.57, 0.15, 80, 25], ['market', 40, 232, 2.6, 0.15, 60, 20], ['floor', 0, 70, 3.14, 0.55, 30, 2]];
  for (var s of shots) { if (s[0] === 'market') { await P("return P.goTo(50,130)"); } await P("return P.goTo(" + s[1] + "," + s[2] + ")"); await P("P.cam(" + s[3] + "," + s[4] + "," + s[5] + "," + s[6] + "); return 1;"); await sleep(700); await pg.screenshot(path.join(OUT, tag + '_' + s[0] + '.png')); console.log(s[0], 'pos', await P("return JSON.stringify(P.snap().play.position)"), 'render', await P("var r=P.renderInfo(); return r.calls+' calls '+r.triangles+' tris'")); }
  await P("document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ',key:'q',bubbles:true})); return 1;"); await sleep(500); await P("var b=document.querySelector('[data-m=\"tab\"][data-tab=\"MAP\"]'); if (b) b.click(); return 1;"); await sleep(600); await pg.screenshot(path.join(OUT, tag + '_map.png'));
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }).slice(0, 5));
} finally { await pg.close(); srv.close(); }
