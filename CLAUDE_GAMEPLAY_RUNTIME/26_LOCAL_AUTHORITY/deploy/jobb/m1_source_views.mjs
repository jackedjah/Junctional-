/* M1 source-fidelity proof: matched gameplay views for the imported tree, Dogkie and gold temple,
   in both stable day/night states, plus a dense-forest frame-cost sample. The renderer is patched
   only to use a free evidence camera; game state, world placement and materials remain live.

   node deploy/jobb/m1_source_views.mjs <label> [--mobile] [--dist <static root>]
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
function arg(name, fallback) { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; }
const LABEL = argv[0] && argv[0][0] !== '-' ? argv[0] : 'run';
const MOBILE = argv.includes('--mobile');
const DIST = path.resolve(arg('--dist', path.join(HERE, '..', 'static_dist')));
const OUT = path.join(HERE, '..', 'probe_out', 'jobb', 'm1_source_views', LABEL);
fs.mkdirSync(OUT, { recursive: true });

const W = MOBILE ? 393 : 1100;
const H = MOBILE ? 852 : 700;
const srv = await serveStatic(DIST);
const pg = await launchChrome({ width: W, height: H, dpr: MOBILE ? 2 : 1, mobile: MOBILE, gpu: true, unlockFps: true });
async function ev(body) { return await pg.evaluate(`(function(){ var P=window.MAHWORLD_PLAY; ${body} })()`); }
async function freeCam(from, at, fov = 50) {
  await ev(`var THREE=P.THREE, r=P.rendererDebug();
    if(!r.__m1Orig){ r.__m1Orig=r.render.bind(r); r.render=function(sc,cam){
      var fc=window.__m1Cam;
      if(fc&&window.__m1FollowRoot){ var q=new P.THREE.Vector3(); window.__m1FollowRoot.getWorldPosition(q); fc.position.set(q.x+3.2,q.y+1.5,q.z+4.0); fc.lookAt(q.x,q.y+0.75,q.z); }
      r.__m1Orig(sc,fc||cam);
    }; }
    var c=window.__m1Cam||new THREE.PerspectiveCamera(${fov},${W}/${H},0.4,1400);
    window.__m1FollowRoot=null; c.fov=${fov}; c.aspect=${W}/${H}; c.position.set(${from.join(',')}); c.lookAt(${at.join(',')}); c.updateProjectionMatrix(); window.__m1Cam=c; return true;`);
}
async function setTime(state) { await ev(`return P.timeOfDay('${state}');`); await sleep(650); }
async function shot(name) { await sleep(300); await pg.screenshot(path.join(OUT, `${name}.png`)); report.shots.push(name); }
async function measureForest() {
  await sleep(500);
  return await ev(`return new Promise(function(resolve){
    var n=0, t0=performance.now(), intervals=[], last=t0;
    function frame(now){ intervals.push(now-last); last=now; n++;
      if(n<120){ requestAnimationFrame(frame); return; }
      intervals=intervals.slice(20).sort(function(a,b){return a-b;});
      var r=P.rendererDebug(), wd=P.worldLayer()&&P.worldLayer().debug?P.worldLayer().debug():null;
      resolve({ frame_ms_mean:+((performance.now()-t0)/n).toFixed(3), frame_ms_p50:+intervals[Math.floor(intervals.length*0.50)].toFixed(3), frame_ms_p95:+intervals[Math.floor(intervals.length*0.95)].toFixed(3), calls:r.info.render.calls, triangles:r.info.render.triangles, geometries:r.info.memory.geometries, textures:r.info.memory.textures, forest:wd&&wd.forest||null });
    } requestAnimationFrame(frame);
  });`);
}

const report = { label: LABEL, mobile: MOBILE, dist: DIST, shots: [], forest_perf: null, dogkie: null, renderer: null, errors: [] };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1');
  await waitForGame(pg, 150000);
  for (let i = 0; i < 300; i++) { const s = await ev('return P.world()?P.world().status:null;'); if (s === 'READY' || s === 'FAILED') break; await sleep(500); }
  for (let i = 0; i < 120; i++) { const n = await ev('var d=P.district&&P.district(); return d?d.loaded.length:-1;'); if (n >= 4) break; await sleep(500); }
  await sleep(2200);
  await ev(`P.hud.showGuide(false); document.querySelectorAll('body > *').forEach(function(e){ if(e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return true;`);

  /* Dense west-forest / Dogkie pack. This point has multiple seeded trees inside the L0 band. */
  await ev(`return P.devPlay('PLACE',{x:-100,z:-24});`); await sleep(2200);
  await freeCam([-83, 7.0, -8], [-99, 7.0, -17], MOBILE ? 55 : 48);
  await setTime('DAY'); await shot('tree_gameplay_day');
  report.forest_perf = await measureForest();
  await setTime('NIGHT'); await shot('tree_gameplay_night');

  /* Use a live host-published Dogkie position so the matched close view survives its patrol motion. */
  await setTime('DAY');
  const dog = await ev(`var s=P.snap(), p=s&&s.play||{}, a=(p.creatures||[]).filter(function(c){return c&&c.position&&(!c.species||c.species==='DOGKIE');});
    var pp=p.position||{x:-100,z:-24}; a.sort(function(x,y){return Math.hypot(x.position.x-pp.x,x.position.z-pp.z)-Math.hypot(y.position.x-pp.x,y.position.z-pp.z);});
    return a.length?{id:a[0].id,x:a[0].position.x,z:a[0].position.z,state:a[0].state||null}:null;`);
  report.dogkie = dog;
  if (dog) {
    await freeCam([dog.x + 3.2, 1.5, dog.z + 4], [dog.x, 0.9, dog.z], MOBILE ? 42 : 38);
    await ev(`var C=P.worldLayer()&&P.worldLayer().creatures&&P.worldLayer().creatures(); var a=C&&C.pickRoots?C.pickRoots():[]; window.__m1FollowRoot=(a.filter(function(x){return String(x.id)===${JSON.stringify(String(dog && dog.id))};})[0]||a[0]||{}).root||null; return !!window.__m1FollowRoot;`);
    await shot('dogkie_gameplay_day');
    await setTime('NIGHT'); await shot('dogkie_gameplay_night');
  }

  /* Same temple/causeway composition used by the stability probe, now in both lighting states. */
  await ev(`return P.devPlay('PLACE',{x:4,z:120});`); await sleep(1300);
  await freeCam([6, 3, 118], [0, 28, 178], MOBILE ? 58 : 55);
  await setTime('DAY'); await shot('temple_gameplay_day');
  await setTime('NIGHT'); await shot('temple_gameplay_night');

  report.renderer = await ev(`var r=P.rendererDebug(); return {calls:r.info.render.calls,triangles:r.info.render.triangles,programs:r.info.programs?r.info.programs.length:null,geometries:r.info.memory.geometries,textures:r.info.memory.textures};`);
  report.errors = await ev(`return P.log().filter(function(x){return /FAILED|Error|exception/i.test(String(x));}).slice(-30);`);
} catch (e) {
  report.fatal = String(e && e.stack || e);
  console.error(e);
} finally {
  fs.writeFileSync(path.join(OUT, 'm1_source_views.json'), JSON.stringify(report, null, 1));
  await pg.close(); srv.close();
}
console.log(`RESULT m1_source_views ${LABEL} ${report.shots.length} shots${report.fatal ? ' FATAL' : ''}`);
if (report.forest_perf) console.log('FOREST', JSON.stringify(report.forest_perf));
if (report.errors.length) console.log('ERRORS', JSON.stringify(report.errors));
