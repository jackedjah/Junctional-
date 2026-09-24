/* forensics helper: which DOM subtree grows while the game idles (phone emulation), and how long the world build blocks the main thread */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, '..', 'static_dist'); var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 393, height: 852, dpr: 3, mobile: true, gpu: true });
await pg.cmd('Page.addScriptToEvaluateOnNewDocument', { source: "(function(){ window.__LT = []; var last = performance.now(); function f(ts){ var gap = ts - last; if (gap > 250) window.__LT.push({ at: +(ts/1000).toFixed(1), gap_ms: +gap.toFixed(0) }); last = ts; requestAnimationFrame(f); } requestAnimationFrame(f); })();" });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 150000);
for (var i = 0; i < 240; i++) { var w = await ev("return P.world ? P.world().status : null;"); if (w === 'READY' || w === 'FAILED') break; await sleep(500); }
console.log('long tasks (rAF gaps > 250 ms) during load + world build:', JSON.stringify(await ev("return window.__LT;")));
async function census() { return await ev("var out = {}; document.querySelectorAll('body > *').forEach(function (el) { out[(el.id || el.tagName) + (el.className ? '.' + String(el.className).split(' ')[0] : '')] = el.querySelectorAll('*').length; }); out.__total = document.querySelectorAll('*').length; return out;"); }
var a = await census(); await sleep(10000); var b = await census(); var grow = {}; Object.keys(b).forEach(function (k) { if (b[k] !== a[k]) grow[k] = (a[k] || 0) + ' -> ' + b[k]; }); console.log('DOM growth over 10 s idle:', JSON.stringify(grow));
var deep = await ev("var best = null, bn = 0; document.querySelectorAll('*').forEach(function (el) { var n = el.children.length; if (n > bn) { bn = n; best = el; } }); return best ? { tag: best.tagName, id: best.id, cls: best.className, children: bn, sample: best.lastElementChild ? best.lastElementChild.outerHTML.slice(0, 200) : null } : null;"); console.log('largest element:', JSON.stringify(deep));
console.log('rAF gaps after ready:', JSON.stringify(await ev("return window.__LT.slice(-6);")));
await pg.close(); srv.close();
