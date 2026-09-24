/* M6 bounded junction attribution only.
   Reuses the existing preview/probe helper and one fixed camera. Every temporary visibility/render
   change is restored before the next frame. No gameplay state or source data is mutated. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const DIST = path.resolve(process.argv[2] || path.join(ROOT, '26_LOCAL_AUTHORITY', 'deploy', 'static_dist'));
const OUT = path.join(ROOT, '25_HANDOFF', 'CONVERGENCE', 'astra_m6_closeout', 'junction_isolation');
fs.mkdirSync(OUT, { recursive: true });
const report = { generated_at: new Date().toISOString(), point: [-40, 40], captures: [], nearby: [], errors: [] };
const srv = await serveStatic(DIST);
const pg = await launchChrome({ width: 1280, height: 800, dpr: 1, gpu: true, timeScale: 0.55, cmdTimeoutMs: 120000 });
async function ev(src) { return await pg.evaluate(`(async function(){var P=window.MAHWORLD_PLAY,H=window.MAHWORLD_STATIC_HOST;${src}})()`); }
async function shot(name) { const f = path.join(OUT, `${name}.png`); await pg.screenshot(f); report.captures.push(`${name}.png`); console.log(`SHOT ${name}`); }
async function toggle(name, src, restore) { await ev(src); await sleep(450); await shot(name); await ev(restore); await sleep(250); }

try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1');
  await waitForGame(pg, 150000); await sleep(6500);
  await ev("P.hud.showGuide(false);P.hud.setDev&&P.hud.setDev(false);P.hud.hudMode&&P.hud.hudMode(true);P.camFollow(false);P.timeOfDay('NIGHT');await P.devPlay('PLACE',{x:-40,z:40});await P.send('MOVE',{forward:0,strafe:0,run:false,fast:false,yaw:2.3});P.camAt(null);P.camFollow(false);P.cam(2.3,0.52,18,1.15);return 1;");
  await sleep(1100); await shot('00_baseline');
  report.nearby = await ev("var sc=P.sceneDebug(),T=P.THREE,box=new T.Box3(),centre=new T.Vector3(-40,0,40),out=[];sc.updateMatrixWorld(true);sc.traverse(function(o){if(!o.visible||(!o.isMesh&&!o.isPoints&&!o.isLine)||!o.geometry)return;try{box.setFromObject(o);var d=box.distanceToPoint(centre);if(d<18){var m=Array.isArray(o.material)?o.material[0]:o.material;out.push({name:o.name||'(unnamed)',type:o.type,distance:+d.toFixed(3),parent:o.parent&&o.parent.name||'',material:m&&m.type||'',transparent:!!(m&&m.transparent),opacity:m&&m.opacity,renderOrder:o.renderOrder,castShadow:!!o.castShadow,receiveShadow:!!o.receiveShadow});}}catch(e){}});return out.sort(function(a,b){return a.distance-b.distance;});");
  await toggle('01_no_path_seams', "var o=P.sceneDebug().getObjectByName('TERRAIN_PATH_SEAMS');if(o)o.visible=false;return !!o;", "var o=P.sceneDebug().getObjectByName('TERRAIN_PATH_SEAMS');if(o)o.visible=true;return !!o;");
  await toggle('02_no_path_cores', "var o=P.sceneDebug().getObjectByName('TERRAIN_PATH_CORES');if(o)o.visible=false;return !!o;", "var o=P.sceneDebug().getObjectByName('TERRAIN_PATH_CORES');if(o)o.visible=true;return !!o;");
  await toggle('03_no_path_frames', "var o=P.sceneDebug().getObjectByName('TERRAIN_PATH_FRAMES');if(o)o.visible=false;return !!o;", "var o=P.sceneDebug().getObjectByName('TERRAIN_PATH_FRAMES');if(o)o.visible=true;return !!o;");
  await toggle('04_no_region_tint', "var o=P.sceneDebug().getObjectByName('TERRAIN_REGION_TINTS');if(o)o.visible=false;return !!o;", "var o=P.sceneDebug().getObjectByName('TERRAIN_REGION_TINTS');if(o)o.visible=true;return !!o;");
  await toggle('05_no_player', "var e=P.entity('me');if(e&&e.root)e.root.visible=false;return !!(e&&e.root);", "var e=P.entity('me');if(e&&e.root)e.root.visible=true;return !!(e&&e.root);");
  await toggle('06_no_renderer_shadows', "P.shadowSet(false,'renderer');return P.rendererDebug().shadowMap.enabled;", "P.shadowSet(true,'renderer');return P.rendererDebug().shadowMap.enabled;");
  await toggle('07_no_terrain', "var o=P.sceneDebug().getObjectByName('MAHWORLD_TERRAIN');if(o)o.visible=false;return !!o;", "var o=P.sceneDebug().getObjectByName('MAHWORLD_TERRAIN');if(o)o.visible=true;return !!o;");
  await toggle('08_no_all_path_layers', "var s=P.sceneDebug(),ns=['TERRAIN_PATH_SEAMS','TERRAIN_PATH_CORES','TERRAIN_PATH_FRAMES'];ns.forEach(function(n){var o=s.getObjectByName(n);if(o)o.visible=false;});return ns;", "var s=P.sceneDebug(),ns=['TERRAIN_PATH_SEAMS','TERRAIN_PATH_CORES','TERRAIN_PATH_FRAMES'];ns.forEach(function(n){var o=s.getObjectByName(n);if(o)o.visible=true;});return ns;");
  await toggle('09_only_path_layers', "var g=P.sceneDebug().getObjectByName('MAHWORLD_TERRAIN'),keep={TERRAIN_PATH_SEAMS:1,TERRAIN_PATH_CORES:1,TERRAIN_PATH_FRAMES:1};g.children.forEach(function(o){o.userData.__iso=o.visible;o.visible=!!keep[o.name];});return g.children.map(function(o){return [o.name,o.visible];});", "var g=P.sceneDebug().getObjectByName('MAHWORLD_TERRAIN');g.children.forEach(function(o){if(o.userData.__iso!==undefined){o.visible=o.userData.__iso;delete o.userData.__iso;}});return true;");
  report.errors = pg.errors.slice();
} catch (e) {
  report.errors.push(String(e && e.stack || e));
} finally {
  fs.writeFileSync(path.join(OUT, 'junction_isolation.json'), JSON.stringify(report, null, 1));
  await pg.close(); srv.close();
}
process.exit(report.errors.length ? 1 : 0);
