import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.resolve(process.argv[2] || path.join(HERE, '..', 'static_dist')); var THR = +(process.argv[3] || 1); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 393, height: 852, dpr: 3, mobile: true, gpu: true });
await pg.cmd('Page.addScriptToEvaluateOnNewDocument', { source: "(function(){ window.__LT = []; var last = performance.now(); function f(ts){ var gap = ts - last; if (gap > 200) window.__LT.push({ at: +(ts/1000).toFixed(1), gap_ms: +gap.toFixed(0) }); last = ts; requestAnimationFrame(f); } requestAnimationFrame(f); window.__T0 = performance.now(); })();" });
if (THR > 1) await pg.cmd('Emulation.setCPUThrottlingRate', { rate: THR });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
var t0 = Date.now(); await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 150000); var tGame = (Date.now() - t0) / 1000;
for (var i = 0; i < 300; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); } var tWorld = (Date.now() - t0) / 1000;
var d = await ev("return P.world();"); console.log('dist', DIST, 'throttle', THR, 'game playable at', tGame.toFixed(1), 's, world READY at', tWorld.toFixed(1), 's');
console.log('build_ms per module:', JSON.stringify(d.modules && d.modules.build_ms || null));
console.log('long tasks (>200 ms):', JSON.stringify(await ev("return window.__LT;")));
await pg.close(); srv.close();
