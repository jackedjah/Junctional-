/* after world READY: does play (turning + walking west + flight + a guard) still trigger shader-compile stalls? (phone emulation, optional CPU throttle) */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.resolve(process.argv[2] || path.join(HERE, '..', 'static_dist')); var THR = +(process.argv[3] || 1); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 393, height: 852, dpr: 3, mobile: true, gpu: true });
await pg.cmd('Page.addScriptToEvaluateOnNewDocument', { source: "(function(){ window.__LT = []; var last = performance.now(); function f(ts){ var gap = ts - last; if (gap > 120) window.__LT.push({ at: +(ts/1000).toFixed(1), gap_ms: +gap.toFixed(0) }); last = ts; requestAnimationFrame(f); } requestAnimationFrame(f); })();" });
if (THR > 1) await pg.cmd('Emulation.setCPUThrottlingRate', { rate: THR });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 150000); for (var i = 0; i < 300; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
await sleep(4000); var warm = await ev("return P.warmState ? { world_started: P.warmState().world_started, world_done: P.warmState().world_done, world_ms: P.warmState().world_ms, world_sync_ms: P.warmState().world_sync_ms, world_programs: P.warmState().world_programs, world_err: P.warmState().world_err } : null;"); var progs0 = await ev("return P.rendererDebug().info.programs.length;"); var ltReady = await ev("return window.__LT.length;"); console.log('warm', JSON.stringify(warm), 'programs after READY', progs0);
var tPlay = await ev("return performance.now()/1000;");
/* play: spin the camera (P.cam?), walk west 12 s, fly 6 s, land, guard 2 s */
await ev("P.send('MOVE', { forward: 0, strafe: -1, run: true, fast: true, yaw: -1.5708 }); return 1;"); await sleep(12000);
await ev("P.send('FLIGHT', { op: 'ENTER' }); return 1;"); await sleep(800); await ev("P.send('MOVE', { forward: 0, strafe: -1, run: true, fast: true, yaw: -1.5708 }); return 1;"); await sleep(6000); await ev("P.send('MOVE', { forward: 0, strafe: 0 }); P.send('FLIGHT', { op: 'EXIT' }); return 1;"); await sleep(4000);
await ev("P.send('GUARD', { kind: 'PHYSICAL' }); return 1;"); await sleep(2000); await ev("P.send('GUARD', { kind: 'MAGICAL' }); return 1;"); await sleep(2000); await ev("P.send('GUARD', { kind: 'NONE' }); return 1;");
await ev("P.send('MOVE', { forward: 1, strafe: 0, run: true, yaw: 0 }); return 1;"); await sleep(6000); await ev("P.send('MOVE', { forward: 0, strafe: 0 }); return 1;");
var progs1 = await ev("return P.rendererDebug().info.programs.length;"); var lt = await ev("return window.__LT;"); var after = lt.filter(function (x) { return x.at > " + tPlay + "; });
console.log('programs after play', progs1, '(compiled during play: ' + (progs1 - progs0) + ')'); console.log('long tasks during PLAY (>120 ms):', JSON.stringify(lt.filter(function (x) { return x.at > tPlay; })), 'pos', JSON.stringify(await ev("return P.snap().play.position;")));
await pg.close(); srv.close();
