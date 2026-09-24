/* M1 source-fidelity proof for the remaining imported assets: live host-driven fish, horse and
   golden phoenix figures plus the registry-placed gym barbell and dumbbell. Each is captured from
   the real gameplay scene in both stable time-of-day states. Only the evidence camera is replaced;
   host state, animation, placement, LOD selection, materials and lighting remain live.

   node deploy/jobb/m1_remaining_views.mjs <label> [--mobile] [--dist <static root>]
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
const OUT = path.join(HERE, '..', 'probe_out', 'jobb', 'm1_remaining_views', LABEL);
fs.mkdirSync(OUT, { recursive: true });

const W = MOBILE ? 393 : 1100;
const H = MOBILE ? 852 : 700;
const srv = await serveStatic(DIST);
const pg = await launchChrome({ width: W, height: H, dpr: MOBILE ? 2 : 1, mobile: MOBILE, gpu: true, unlockFps: true });
async function ev(body) { return await pg.evaluate(`(function(){ var P=window.MAHWORLD_PLAY; ${body} })()`); }
async function setTime(state) { await ev(`return P.timeOfDay('${state}');`); await sleep(520); }
async function shot(name) { await sleep(180); await pg.screenshot(path.join(OUT, `${name}.png`)); report.shots.push(name); }

async function installCamera() {
  return await ev(`var THREE=P.THREE, r=P.rendererDebug();
    if(!r.__m1RemainingOrig){ r.__m1RemainingOrig=r.render.bind(r); r.render=function(sc,cam){
      window.__m1RemainingScene=sc; var fc=window.__m1RemainingCam, root=window.__m1RemainingRoot;
      if(fc&&root){ var q=new P.THREE.Vector3(); root.getWorldPosition(q); var o=window.__m1RemainingOffset||{x:3,y:1.5,z:4,look:0.7};
        var v=new P.THREE.Vector3(o.x,o.y,o.z); if(o.local){var wq=new P.THREE.Quaternion();root.getWorldQuaternion(wq);v.applyQuaternion(wq);}
        fc.position.copy(q).add(v); fc.lookAt(q.x,q.y+o.look,q.z); }
      r.__m1RemainingOrig(sc,fc||cam);
    }; }
    var c=window.__m1RemainingCam||new THREE.PerspectiveCamera(42,${W}/${H},0.12,1400);
    c.aspect=${W}/${H}; c.updateProjectionMatrix(); window.__m1RemainingCam=c; return true;`);
}
async function focusWildlife(species, offset, id = null, timeoutMs = 8000) {
  const end = Date.now() + timeoutMs; let found = null;
  while (Date.now() < end) {
    found = await ev(`var W=P.worldLayer(), w=W&&W.wildlife&&W.wildlife(), a=w&&w.figures?w.figures()[${JSON.stringify(species)}]:null;
      var wanted=${JSON.stringify(id)}, f=a&&a.filter(function(x){return x&&x.root&&x.root.visible&&(!wanted||String(x.id)===wanted);})[0];
      if(!f&&!wanted&&a&&a.length) f=a[0];
      window.__m1RemainingRoot=f&&f.root||null; window.__m1RemainingOffset=${JSON.stringify(offset)};
      return f?{id:f.id,visible:!!f.root.visible,state:f.state||null,position:[f.x,f.y,f.z]}:null;`);
    if (found) return found;
    await sleep(250);
  }
  return found;
}
async function waitSpecies(species, preferredStates = [], timeoutMs = 18000, near = null) {
  const end = Date.now() + timeoutMs; let rec = null;
  while (Date.now() < end) {
    const next = await ev(`var a=(P.snap().play.wildlife||[]).filter(function(x){return x.species===${JSON.stringify(species)};});
      var states=${JSON.stringify(preferredStates)}, near=${JSON.stringify(near)};
      var b=a.filter(function(x){return (!states.length||states.indexOf(x.state)>=0)&&(!near||Math.hypot(x.position.x-near.x,x.position.z-near.z)<=near.d);});
      return {preferred:b[0]||null,fallback:a[0]||null};`);
    rec = next && (next.preferred || next.fallback) || rec;
    if (next && next.preferred) return next.preferred;
    await sleep(250);
  }
  return rec;
}
async function focusSceneName(name, offset, timeoutMs = 16000) {
  const end = Date.now() + timeoutMs; let found = null;
  while (Date.now() < end) {
    found = await ev(`var sc=window.__m1RemainingScene, r=sc&&sc.getObjectByName(${JSON.stringify(name)});
      window.__m1RemainingRoot=r||null; window.__m1RemainingOffset=${JSON.stringify(offset)};
      return r?{name:r.name,levels:r.levels?r.levels.length:null,visible:r.visible}:null;`);
    if (found) return found;
    await sleep(250);
  }
  return found;
}

const report = { label: LABEL, mobile: MOBILE, dist: DIST, shots: [], subjects: {}, renderer: null, errors: [] };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1');
  await waitForGame(pg, 150000);
  for (let i = 0; i < 300; i++) { const s = await ev('return P.world()?P.world().status:null;'); if (s === 'READY' || s === 'FAILED') break; await sleep(500); }
  for (let i = 0; i < 120; i++) { const n = await ev('var d=P.district&&P.district(); return d?d.loaded.length:-1;'); if (n >= 4) break; await sleep(500); }
  await sleep(1700);
  await ev(`P.hud.showGuide(false); document.querySelectorAll('body > *').forEach(function(e){ if(e.tagName!=='CANVAS') e.style.visibility='hidden'; }); return true;`);
  await installCamera();

  /* South-coast school: force a scenery breach so the authored fish clears the opaque surface. */
  const fishNear = { x: 50, z: -95, d: 100 };
  await ev(`return P.devPlay('PLACE',{x:${fishNear.x},z:${fishNear.z}});`); await sleep(1700);
  await ev(`return P.devPlay('WILDLIFE_SUMMON',{species:'FISH'});`);
  report.subjects.fish_snapshot = await waitSpecies('FISH', ['RISE', 'BREACH', 'DIVE'], 18000, fishNear);
  report.subjects.fish_figure = await focusWildlife('FISH', MOBILE ? { x: 4.6, y: 1.7, z: 6.2, look: 0.25, local: true } : { x: 4.0, y: 1.5, z: 5.5, look: 0.2, local: true }, report.subjects.fish_snapshot && report.subjects.fish_snapshot.id);
  await setTime('DAY'); await shot('fish_gameplay_day');
  await setTime('NIGHT'); await shot('fish_gameplay_night');

  /* Also record the ordinary underwater cruise pose. The free evidence camera follows at the
     fish's depth, below the one-sided surface, while the live shader undulation remains active. */
  report.subjects.fish_swim_snapshot = await waitSpecies('FISH', ['SWIM'], 18000, fishNear);
  report.subjects.fish_swim_figure = await focusWildlife('FISH', MOBILE ? { x: 5.8, y: 0.35, z: 7.8, look: 0, local: true } : { x: 5.0, y: 0.3, z: 7.0, look: 0, local: true }, report.subjects.fish_swim_snapshot && report.subjects.fish_swim_snapshot.id);
  await setTime('DAY'); await shot('fish_swim_gameplay_day');
  await setTime('NIGHT'); await shot('fish_swim_gameplay_night');

  /* The first two host horses live in the east range. The placement is deliberately outside their
     12 m activation exclusion while remaining close enough for the ordinary active pool. */
  await ev(`return P.devPlay('PLACE',{x:120,z:132});`); await sleep(1800);
  report.subjects.horse_snapshot = await waitSpecies('HORSE');
  report.subjects.horse_figure = await focusWildlife('HORSE', MOBILE ? { x: 4.2, y: 2.1, z: 5.5, look: 0.85, local: true } : { x: 3.8, y: 1.9, z: 5.0, look: 0.8, local: true }, report.subjects.horse_snapshot && report.subjects.horse_snapshot.id);
  await setTime('DAY'); await shot('horse_gameplay_day');
  await setTime('NIGHT'); await shot('horse_gameplay_night');

  /* Provoke the rare Phoenix over a clear crown-terrace point so a close gameplay view is not
     occluded by the distant procedural spire silhouettes. */
  const phoenixTarget = { x: 140, z: 250, d: 24 };
  await ev(`return P.devPlay('PLACE',{x:${phoenixTarget.x},z:${phoenixTarget.z}});`); await sleep(900);
  report.subjects.phoenix_summon = await ev(`return P.devPlay('WILDLIFE_SUMMON',{species:'PHOENIX'});`);
  report.subjects.phoenix_snapshot = await waitSpecies('PHOENIX', ['WINDUP', 'DIVE', 'SWEEP', 'CLIMB'], 30000, phoenixTarget);
  report.subjects.phoenix_figure = await focusWildlife('PHOENIX', MOBILE ? { x: 8.5, y: 3.4, z: 11.5, look: 0.7, local: true } : { x: 7.2, y: 3.0, z: 9.8, look: 0.65, local: true }, report.subjects.phoenix_snapshot && report.subjects.phoenix_snapshot.id);
  await setTime('DAY'); await shot('phoenix_gameplay_day');
  await setTime('NIGHT'); await shot('phoenix_gameplay_night');

  /* Enter the real Gym and frame the registry-placed props by their scene names. */
  await ev(`window.__m1RemainingRoot=null; return P.devPlay('PLACE',{x:-85.2,z:110});`); await sleep(450);
  report.subjects.gym_enter = await ev(`return P.send('ENTER_ROOM',{room:'GYM_INTERIOR'});`); await sleep(3200);
  report.subjects.gym_room = await ev(`return P.snap().play.room;`);

  report.subjects.barbell = await focusSceneName('PROP_GYM_BARBELL_PLATFORM', MOBILE ? { x: 3.2, y: 1.35, z: 4.2, look: 0.38 } : { x: 2.8, y: 1.2, z: 3.8, look: 0.36 });
  await setTime('DAY'); await shot('barbell_gameplay_day');
  await setTime('NIGHT'); await shot('barbell_gameplay_night');

  report.subjects.dumbbell = await focusSceneName('PROP_GYM_DUMBBELL_BENCH_W', MOBILE ? { x: 0.95, y: 0.5, z: 1.25, look: 0.2 } : { x: 0.82, y: 0.42, z: 1.05, look: 0.18 });
  await setTime('DAY'); await shot('dumbbell_gameplay_day');
  await setTime('NIGHT'); await shot('dumbbell_gameplay_night');

  report.renderer = await ev(`var r=P.rendererDebug(); return {calls:r.info.render.calls,triangles:r.info.render.triangles,programs:r.info.programs?r.info.programs.length:null,geometries:r.info.memory.geometries,textures:r.info.memory.textures};`);
  report.errors = await ev(`return P.log().filter(function(x){return /FAILED|Error|exception/i.test(String(x));}).slice(-30);`);
} catch (e) {
  report.fatal = String(e && e.stack || e);
  console.error(e);
} finally {
  fs.writeFileSync(path.join(OUT, 'm1_remaining_views.json'), JSON.stringify(report, null, 1));
  await pg.close(); srv.close();
}
console.log(`RESULT m1_remaining_views ${LABEL} ${report.shots.length} shots${report.fatal ? ' FATAL' : ''}`);
console.log('SUBJECTS', JSON.stringify(report.subjects));
if (report.errors.length) console.log('ERRORS', JSON.stringify(report.errors));
