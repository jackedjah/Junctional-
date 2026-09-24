/* MAHWORLD :: STATIC DEMO HOST — the SAME authority code (DuelHost / PlayMode / RulesField), run inside the page.
   A permanent static URL cannot keep a Node tick loop alive, so the loopback lab host's job is done here instead:
     · the host modules load through import-map shims for node:fs / node:path / node:url (JSON files are pre-baked by the build)
     · the memory store (non-persistent, exactly like `--memory`): demo progress resets on reload
     · ONE setInterval ticks the host at the configured tick_dt
     · window.fetch is wrapped so every `<base>/api/*` call play.js makes is answered by the in-page host with the same JSON the
       server would return; everything else (modules, GLBs, three.js) is an ordinary static file
   play.js is untouched: it still believes it talks to a lab server over HTTP. Dev endpoints (/api/dev/*, /api/hold) are absent,
   as in `--demo`. Single-player: there is no second browser to share this host with. */
import { loadHeadlessData, composeHeadless } from '../../00_CORE/bootstrap.js';
import { createDuelHost, hostIdentity } from '../DuelHost.js';
import { createMemoryStore } from '../DurableStore.js';

var PREFIX = location.pathname.replace(/\/lab\/[^/]*$/, ''); var BASE = location.origin + PREFIX;
var FIXTURE_ACCOUNTS = [{ id: 'PLAYER_A', classId: 'ATHLETE', sex: 'F' }, { id: 'PLAYER_B', classId: 'ATHLETE', sex: 'M' }, { id: 'SPECTATOR_1' }, { id: 'SPECTATOR_2' }];
var stats = { requests: 0, rejected: 0 }; var hostRef = null; var storeRef = null; var openedRef = null;

var ready = (async function boot() {
  var data = await loadHeadlessData(); var tickDt = data.cfg.dev('local_authority.tick_dt_s');
  var store = createMemoryStore(); var opened = store.open({ identity: hostIdentity(data) });
  var host = createDuelHost({ data: data, composeHeadless: composeHeadless, store: store, opened: opened, clock: { kind: 'MONOTONIC_WALL', now: function () { return performance.now() / 1000; } } });
  FIXTURE_ACCOUNTS.forEach(function (a) { host.dev.createAccount(a.id, { classId: a.classId, sex: a.sex }); });
  /* the tick shares the page's thread with rendering: on a slow phone a timer fires late, so each firing runs as many FIXED
     steps as wall time owes (bounded, so a backgrounded tab does not replay minutes at once) — the server had its own process */
  var last = performance.now(), stepMs = tickDt * 1000;
  setInterval(function () { var now = performance.now(); var n = Math.floor((now - last) / stepMs); if (n <= 0) return; if (n > 12) { n = 12; last = now - 12 * stepMs; } var t0 = performance.now(); for (var i = 0; i < n; i++) host.tick(tickDt); last += n * stepMs; if (window.MAHWORLD_STATIC_HOST) window.MAHWORLD_STATIC_HOST.tick_ms_last_frame = (window.MAHWORLD_STATIC_HOST.tick_ms_last_frame || 0) + (performance.now() - t0); }, Math.max(10, Math.round(stepMs / 2)));
  hostRef = host; storeRef = store; openedRef = opened;
  window.MAHWORLD_STATIC_HOST = { host: host, tick_dt_s: tickDt, mode: 'IN_PAGE_AUTHORITY (memory store, single player)' };
  return host;
})();

function health(host) { var st = host.state(); return { ok: true, protocol: host.protocol, lifecycle: host.lifecycle(), generation: host.generation(), version: st.version, committed_version: st.committed_version, t: host.time(), tick: st.tick, deadline_clock: host.clock.kind, duel: st.duel, paused: st.paused, recovery: host.recovery(), fault: host.fault(), store: { kind: storeRef.kind, persistent: !!storeRef.persistent, path: null, previous_clean_shutdown: openedRef.previous_clean_shutdown, stale_lock_recovered: false }, dev_hooks: false, static_host: true, stats: stats }; }
function reply(code, body) { return new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }

async function route(method, url, init) {
  var host = await ready; stats.requests++;
  var p = url.pathname.slice(PREFIX.length);
  var body = null;
  if (method === 'POST') {
    var ct = String((init && init.headers && (init.headers['content-type'] || init.headers['Content-Type'])) || '');
    if (!/^application\/json/.test(ct)) { stats.rejected++; return reply(415, { ok: false, reason: 'CONTENT_TYPE_JSON_REQUIRED' }); }
    try { body = JSON.parse(String(init.body || '{}')); } catch (e) { stats.rejected++; return reply(400, { ok: false, reason: 'BAD_JSON' }); }
  }
  if (method === 'GET') {
    if (p === '/api/snapshot') { var t0s = performance.now(); var snap = host.snapshot(url.searchParams.get('session') || ''); var r = reply(200, snap); if (window.MAHWORLD_STATIC_HOST) window.MAHWORLD_STATIC_HOST.snap_ms_last_frame = (window.MAHWORLD_STATIC_HOST.snap_ms_last_frame || 0) + (performance.now() - t0s); return r; }
    if (p === '/api/tokens') return reply(200, { ok: true, classification: 'DEVELOPMENT_LAB_BINDINGS (not authentication)', tokens: host.dev.tokens() });
    if (p === '/api/health') return reply(200, health(host));
    stats.rejected++; return reply(404, { ok: false, reason: p === '/api/hold' ? 'NOT_AVAILABLE_IN_DEMO' : 'NOT_FOUND' });
  }
  if (method === 'POST') {
    if (p === '/api/connect') return reply(200, host.connect(body));
    if (p === '/api/command') return reply(200, host.submit(body));
    if (p === '/api/disconnect') return reply(200, host.disconnect(body && body.session_id));
    if (p === '/api/reconnect') return reply(200, host.reconnect(body));
    stats.rejected++; return reply(404, { ok: false, reason: p.indexOf('/api/dev/') === 0 ? 'NOT_AVAILABLE_IN_DEMO' : 'NOT_FOUND' });
  }
  stats.rejected++; return reply(405, { ok: false, reason: 'METHOD_NOT_ALLOWED' });
}

var realFetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  var urlStr = typeof input === 'string' ? input : (input && input.url) || '';
  var u; try { u = new URL(urlStr, location.href); } catch (e) { return realFetch(input, init); }
  if (u.origin === location.origin && u.pathname.indexOf(PREFIX + '/api/') === 0) {
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    return route(method, u, init || {});
  }
  return realFetch(input, init);
};
