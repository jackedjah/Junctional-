/* M6 junction repair: one matched night view, one oblique view and one short real-controller crossing. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const DIST = path.resolve(process.argv[2] || path.join(ROOT, '26_LOCAL_AUTHORITY', 'deploy', 'static_dist'));
const OUT = path.join(ROOT, '25_HANDOFF', 'CONVERGENCE', 'astra_m6_closeout', 'junction_repair_proof');
fs.mkdirSync(OUT, { recursive: true });
const report = { generated_at: new Date().toISOString(), source: DIST, point: [-40, 40], screenshots: [], crossing: {}, console_errors: [] };
const srv = await serveStatic(DIST);
const pg = await launchChrome({ width: 1280, height: 800, dpr: 1, gpu: true, timeScale: 0.55, cmdTimeoutMs: 120000 });
async function ev(src) { return await pg.evaluate(`(async function(){var P=window.MAHWORLD_PLAY,H=window.MAHWORLD_STATIC_HOST;${src}})()`); }
async function shot(name) { const f = path.join(OUT, `${name}.png`); await pg.screenshot(f); report.screenshots.push(`${name}.png`); console.log(`SHOT ${name}`); }
async function place(x, z, yaw, pitch, dist) { await ev(`await P.devPlay('PLACE',{x:${x},z:${z}});await P.send('MOVE',{forward:0,strafe:0,run:false,fast:false,yaw:${yaw}});P.camAt(null);P.camFollow(false);P.cam(${yaw},${pitch},${dist},1.15);return P.snap().play.position;`); }

try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1');
  await waitForGame(pg, 150000); await sleep(6500);
  await ev("P.hud.showGuide(false);P.hud.setDev&&P.hud.setDev(false);P.hud.hudMode&&P.hud.hudMode(true);P.timeOfDay('NIGHT');return 1;"); await sleep(900);
  await place(-40, 40, 2.3, 0.52, 18); await sleep(900); await shot('01_matched_night_after');
  await place(-40, 40, 1.72, 0.18, 13); await sleep(900); await shot('02_oblique_after');
  await place(-40, 55, 0, 0.42, 18); await ev("P.camFollow(true);return P.send('MOVE',{forward:1,strafe:0,run:true,fast:false,yaw:0});"); await sleep(350); report.crossing.start = await ev("return P.snap().play.position;");
  await sleep(1650); report.crossing.sample_1 = await ev("return P.snap().play.position;"); await shot('03_crossing_1');
  await sleep(1650); report.crossing.sample_2 = await ev("return P.snap().play.position;"); await shot('04_crossing_2');
  await sleep(1650); report.crossing.sample_3 = await ev("return P.snap().play.position;"); await shot('05_crossing_3');
  await sleep(1300); await ev("return P.send('MOVE',{forward:0,strafe:0,run:false,fast:false,yaw:0});"); report.crossing.end = await ev("return P.snap().play.position;"); await shot('06_crossing_end');
  report.crossing.min_distance_to_junction = Math.min(...Object.values(report.crossing).filter(v => v && typeof v.x === 'number').map(v => Math.hypot(v.x + 40, v.z - 40)));
  report.console_errors = pg.errors.filter(e => !/favicon\.ico|athlete_m_preview\/dev_0\.(?:1|2|3|4|5|6|7|9|10|11|12|13)\/manifest\.json/i.test(String(e)));
} catch (e) {
  report.console_errors.push(String(e && e.stack || e));
} finally {
  fs.writeFileSync(path.join(OUT, 'junction_repair_proof.json'), JSON.stringify(report, null, 1));
  await pg.close(); srv.close();
}
process.exit(report.console_errors.length ? 1 : 0);
