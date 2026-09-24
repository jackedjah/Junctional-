/* MAHWORLD :: PROBE LIB — serve deploy/static_dist on a free port, open it in headless Chrome over CDP, evaluate JS in the page,
   take screenshots. Small on purpose (the 150 KB evidence driver is for full clips). Node 22: global WebSocket. */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net'; import http from 'node:http'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url));
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.toml': 'text/plain', '.wasm': 'application/wasm' };
export var CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
export var PLAY_PATH = '/claude_gameplay_runtime/26_local_authority/lab/play';
function freePort() { return new Promise(function (res) { var s = net.createServer(); s.listen(0, '127.0.0.1', function () { var p = s.address().port; s.close(function () { res(p); }); }); }); }
export async function serveStatic(dir) {
  var port = await freePort();
  var srv = http.createServer(function (req, res) {
    var u = new URL(req.url, 'http://x'); var p = decodeURIComponent(u.pathname); if (p === '/') p = '/index.html';
    var f = path.join(dir, p); if (!f.startsWith(dir)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f = f + '.html';
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found ' + p); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(function (r) { srv.listen(port, '127.0.0.1', r); });
  return { port: port, origin: 'http://127.0.0.1:' + port, close: function () { srv.close(); } };
}
function sweepStale() { try { var t = os.tmpdir(); fs.readdirSync(t).forEach(function (n) { if (!/^(mw-probe-|mahworld-(cdp|emote|static|rec)-)/.test(n)) return; var f = path.join(t, n); try { var st = fs.statSync(f); if (Date.now() - st.mtimeMs < 2 * 3600e3) return; fs.rmSync(f, { recursive: true, force: true }); } catch (e) { } }); } catch (e) { } }   /* profiles older than two hours whose Chrome is long gone */
export async function launchChrome(opts) {
  opts = opts || {}; var port = await freePort(); var udd = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-probe-'));
  var W = opts.width || 430, H = opts.height || 932;
  var args = ['--headless=new'].concat(opts.gpu ? ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] : ['--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']).concat(opts.unlockFps ? ['--disable-frame-rate-limit', '--disable-gpu-vsync'] : []).concat([ '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--mute-audio', '--remote-debugging-port=' + port, '--user-data-dir=' + udd, '--window-size=' + W + ',' + H, 'about:blank']);
  var proc = spawn(CHROME, args, { stdio: 'ignore' });
  var wsUrl = null; for (var i = 0; i < 60 && !wsUrl; i++) { try { var j = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); var pg = j.filter(function (t) { return t.type === 'page'; })[0]; if (pg) wsUrl = pg.webSocketDebuggerUrl; } catch (e) { } if (!wsUrl) await new Promise(function (r) { setTimeout(r, 250); }); }
  if (!wsUrl) throw new Error('chrome did not expose a page');
  var ws = new WebSocket(wsUrl); await new Promise(function (r, j) { ws.onopen = r; ws.onerror = j; });
  var id = 0, pending = {}, events = []; var listeners = {};
  ws.onmessage = function (m) { var d = JSON.parse(typeof m.data === 'string' ? m.data : String(m.data)); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } else if (d.method) { events.push(d); (listeners[d.method] || []).forEach(function (f) { f(d.params); }); } };
  var CMD_TIMEOUT_MS = opts.cmdTimeoutMs || 90000; var closedReason = null;
  function failAll(reason) { closedReason = reason; Object.keys(pending).forEach(function (k) { var f = pending[k]; delete pending[k]; try { f({ error: { message: reason } }); } catch (e) { } }); }
  ws.onclose = function () { failAll('chrome CDP socket closed (the renderer died?)'); }; ws.onerror = function () { failAll('chrome CDP socket error'); }; proc.on('exit', function (code) { failAll('chrome exited (code ' + code + ')'); });
  /* every CDP command either answers, fails when Chrome dies, or times out — a probe never hangs forever on a dead renderer (two chain hangs on 2026-09-19 were exactly that) */
  function cmd(method, params) { return new Promise(function (r, j) { if (closedReason) return j(new Error(method + ': ' + closedReason)); var mid = ++id; var tm = setTimeout(function () { if (pending[mid]) { delete pending[mid]; j(new Error(method + ': no answer in ' + CMD_TIMEOUT_MS + ' ms')); } }, CMD_TIMEOUT_MS); pending[mid] = function (d) { clearTimeout(tm); d.error ? j(new Error(method + ': ' + JSON.stringify(d.error))) : r(d.result); }; try { ws.send(JSON.stringify({ id: mid, method: method, params: params || {} })); } catch (e) { clearTimeout(tm); delete pending[mid]; j(e); } }); }
  var errors = [];
  await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Log.enable');
  listeners['Runtime.exceptionThrown'] = [function (p) { errors.push((p.exceptionDetails.exception && p.exceptionDetails.exception.description) || p.exceptionDetails.text); }];
  listeners['Log.entryAdded'] = [function (p) { if (p.entry.level === 'error') errors.push('[log] ' + p.entry.text + (p.entry.url ? ' <' + p.entry.url + '>' : '')); }];
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: opts.dpr || 1, mobile: !!opts.mobile });
  if (opts.mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  /* slow-motion for evidence: scale the page's clocks (performance.now, rAF timestamps, Date.now deltas) so a 0.5 s attack spans
     enough software-rendered frames to be photographed; the host and the presentation see the same scaled time */
  if (opts.timeScale && opts.timeScale !== 1) await cmd('Page.addScriptToEvaluateOnNewDocument', { source: '(function(){ var K=' + opts.timeScale + '; var p0=performance.now(); var pn=performance.now.bind(performance); performance.now=function(){ return p0+(pn()-p0)*K; }; var raf=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=function(cb){ return raf(function(ts){ cb(p0+(ts-p0)*K); }); }; var d0=Date.now(); var dn=Date.now; Date.now=function(){ return d0+(dn()-d0)*K; }; window.__timeScale=K; })();' });
  async function evaluate(expr) { var r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('eval: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text)); if (r.result.value === undefined && r.result.unserializableValue !== undefined) { var u = r.result.unserializableValue; return u === '-0' ? 0 : (u === 'NaN' ? NaN : (u === 'Infinity' ? Infinity : (u === '-Infinity' ? -Infinity : undefined))); }   /* CDP cannot serialize -0 / NaN / ±Infinity by value: a settled yaw of -0.000 came back as undefined and poisoned P.cam(yaw0 + π) → NaN camera → 198 blank stills (2026-09-19) */ return r.result.value; }
  async function goto(url) { var done = new Promise(function (r) { listeners['Page.loadEventFired'] = [r]; }); await cmd('Page.navigate', { url: url }); await done; }
  async function screenshot(file) { var r = await cmd('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; }
  /* deterministic time: after boot, pause virtual time and advance it in explicit steps (timers, rAF, performance.now all follow) */
  async function timePause() { await cmd('Emulation.setVirtualTimePolicy', { policy: 'pause' }); }
  async function timeStep(ms) { var done = new Promise(function (r) { listeners['Emulation.virtualTimeBudgetExpired'] = [function () { r('expired'); }]; setTimeout(function () { r('timeout'); }, 4000); }); await cmd('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms, maxVirtualTimeTaskStarvationCount: 100000 }); return await done; }
  async function close() { try { await cmd('Browser.close'); } catch (e) { } try { proc.kill(); } catch (e) { } for (var k = 0; k < 12; k++) { await new Promise(function (r) { setTimeout(r, 500); }); try { fs.rmSync(udd, { recursive: true, force: true }); if (!fs.existsSync(udd)) break; } catch (e) { } } }   /* the throwaway profile is removed (retried while Chrome releases its locks): 470 of them once filled the system drive */
  sweepStale();
  function on(method, fn) { (listeners[method] = listeners[method] || []).push(fn); }
  return { cmd: cmd, evaluate: evaluate, goto: goto, screenshot: screenshot, close: close, errors: errors, events: events, timePause: timePause, timeStep: timeStep, on: on, port: port };
}
export function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
/* wait until the page reports the character is mounted and the host answered a poll */
export async function waitForGame(pg, timeoutMs) {
  var t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 60000)) {
    var ok = await pg.evaluate("(function(){ var P = window.MAHWORLD_PLAY; if (!P) return false; var s = P.snap(); var e = P.listenerCount ? P.listenerCount() : null; return !!(s && s.play && s.play.position && e && e.entities > 0); })()");
    if (ok) { /* B8 P0: the READY gate (#restore-veil) owns the pointer until the world layer reports READY — every probe waits for it, as a player must */ var t1 = Date.now(); while (Date.now() - t1 < 90000) { var gate = await pg.evaluate("(function(){ var P = window.MAHWORLD_PLAY; if (!P || !P.restoreState) return true; var v = document.getElementById('restore-veil'); return !!(P.restoreState().done && (!v || getComputedStyle(v).display === 'none')); })()"); if (gate) break; await sleep(500); } return true; } await sleep(300);
  }
  throw new Error('game did not boot: ' + pg.errors.slice(0, 5).join(' | '));
}
