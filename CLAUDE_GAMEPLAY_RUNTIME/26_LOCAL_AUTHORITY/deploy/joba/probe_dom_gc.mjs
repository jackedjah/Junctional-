import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, '..', 'static_dist'); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 393, height: 852, dpr: 3, mobile: true, gpu: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function dom() { var m = await pg.cmd('Memory.getDOMCounters'); return m; }
await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 150000); for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
await pg.cmd('HeapProfiler.enable'); await pg.cmd('HeapProfiler.collectGarbage'); var a = await dom(); await sleep(15000); var b = await dom(); await pg.cmd('HeapProfiler.collectGarbage'); await sleep(500); var c = await dom();
console.log('after GC', JSON.stringify(a), '→ 15 s idle', JSON.stringify(b), '→ GC again', JSON.stringify(c));
/* who allocates: count element creations by tag for 5 s */
await ev("window.__CE = {}; var ce = document.createElement.bind(document); document.createElement = function (t) { var k = String(t).toLowerCase(); window.__CE[k] = (window.__CE[k] || 0) + 1; return ce(t); }; return 1;"); await sleep(5000); console.log('createElement calls in 5 s:', JSON.stringify(await ev("return window.__CE;")));
await ev("window.__IH = {}; var d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML'); Object.defineProperty(Element.prototype, 'innerHTML', { set: function (v) { var k = this.id || this.className || this.tagName; window.__IH[k] = (window.__IH[k] || 0) + 1; return d.set.call(this, v); }, get: d.get, configurable: true }); return 1;"); await sleep(5000); console.log('innerHTML sets in 5 s by element:', JSON.stringify(await ev("return window.__IH;")));
await pg.close(); srv.close();
