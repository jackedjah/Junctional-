/* quick boom check: stand with the back to the gym facade and print camera numbers + nearby district proxies */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var srv = await serveStatic(path.join(HERE, 'static_dist')); var pg = await launchChrome({ width: 900, height: 600, gpu: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 120000); await sleep(3000); await pg.evaluate("window.MAHWORLD_PLAY.hud.showGuide(false); 1");
  var r = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; await P.goTo(-72.5,110); await new Promise(function(r){setTimeout(r,2500)}); await P.send('MOVE',{forward:0,strafe:0,run:false,yaw:1.5708}); await new Promise(function(r){setTimeout(r,1500)}); var c=P.cam(); var d=P.district(); var s=P.snap().play; var near=(d&&d.loaded||[]).map(function(b){ return b.id||b.name; }); var cols = s.rules && s.rules.colliders ? (Array.isArray(s.rules.colliders)? s.rules.colliders.length : Object.keys(s.rules.colliders).length) : null; return {cam:c, pos:s.position, facing:s.facing, district:near, cols:cols, dbg:P.cameraDebug()}; })()");
  console.log(JSON.stringify(r, null, 1));
  var shapes = await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; var fs=P.fieldSceneDebug?P.fieldSceneDebug():null; return fs?fs:'no fieldSceneDebug'; })()"); console.log(typeof shapes === 'string' ? shapes : JSON.stringify(shapes).slice(0, 1500));
  await pg.screenshot(path.join(HERE, 'probe_out', 'boom_wall.png'));
} finally { await pg.close(); srv.close(); }
