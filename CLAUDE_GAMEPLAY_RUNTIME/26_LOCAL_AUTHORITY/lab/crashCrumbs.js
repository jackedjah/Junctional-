/* MAHWORLD :: CRASH BREADCRUMBS (owner B8 P0, 2026-09-20) — persistent, low-cost pre-crash diagnostics that SURVIVE an automatic reload
   (iOS Safari "This webpage was reloaded because a problem occurred" at ~126 s of the B7 phone review). Every `period_s` a compact numeric
   sample (region / position, mode + flight, open overlay, creature + wildlife counts, scene objects, skinned meshes, renderer geometries /
   textures / programs / calls / triangles, animated rigs, fish agents, effects, loaded GLBs, heap when the browser exposes it, the last
   user actions, error / rejection / context-loss counters) goes into a ring of the last ~30 s in sessionStorage (localStorage fallback) —
   a few KB, never logs. A DIRTY flag is set while the session runs and cleared only by a deliberate unload (pagehide); a WebKit kill never
   fires pagehide, so on the next boot DIRTY + a ring = an unexpected reload and the snapshot is recovered (`P.crashReport()`, one console
   line, the dev panel — never noisy owner HUD). */
export function createCrashCrumbs(opts) {
  opts = opts || {}; var KEY = opts.key || 'mahworld-crumbs-v1'; var PERIOD = opts.period_s || 1.5; var RING = opts.ring || 20; var store = null;
  try { store = window.sessionStorage; store.setItem(KEY + '-probe', '1'); store.removeItem(KEY + '-probe'); } catch (e) { try { store = window.localStorage; store.setItem(KEY + '-probe', '1'); store.removeItem(KEY + '-probe'); } catch (e2) { store = null; } }
  var ring = [], actions = [], counters = { errors: 0, rejections: 0, ctx_lost: 0, ctx_restored: 0 }, lastError = null, lastT = 0, recovered = null, sessionStart = Date.now();
  function read() { if (!store) return null; try { return JSON.parse(store.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(obj) { if (!store) return; try { store.setItem(KEY, JSON.stringify(obj)); } catch (e) { } }
  function boot() {
    var prev = read(); var nav = null; try { var ne = performance.getEntriesByType && performance.getEntriesByType('navigation')[0]; nav = ne ? ne.type : null; } catch (e) { nav = null; }
    if (prev && prev.dirty && prev.ring && prev.ring.length) { recovered = { detected_at: new Date().toISOString(), navigation_type: nav, session_started: prev.started, last_sample_age_s: prev.ring.length ? +((Date.now() - prev.ring[prev.ring.length - 1].w) / 1000).toFixed(1) : null, counters: prev.counters, last_error: prev.last_error, actions: prev.actions, ring: prev.ring }; }
    write({ dirty: true, started: sessionStart, ring: [], actions: [], counters: counters, last_error: null, recovered_from: recovered ? recovered.detected_at : null });
    try { addEventListener('pagehide', function () { var cur = read() || {}; cur.dirty = false; cur.clean_exit = Date.now(); write(cur); }); } catch (e) { }   /* a deliberate navigation / close: not a crash */
    try { addEventListener('error', function (ev) { counters.errors++; lastError = { kind: 'error', msg: String(ev && (ev.message || ev.error && ev.error.message) || '').slice(0, 160), t: Date.now() }; }); addEventListener('unhandledrejection', function (ev) { counters.rejections++; lastError = { kind: 'rejection', msg: String(ev && ev.reason && (ev.reason.message || ev.reason) || '').slice(0, 160), t: Date.now() }; }); } catch (e) { }
    return recovered;
  }
  function watchCanvas(canvas) { if (!canvas) return; try { canvas.addEventListener('webglcontextlost', function () { counters.ctx_lost++; lastError = { kind: 'webglcontextlost', msg: '', t: Date.now() }; flush(); }); canvas.addEventListener('webglcontextrestored', function () { counters.ctx_restored++; }); } catch (e) { } }
  function noteAction(name) { actions.push([Math.round((Date.now() - sessionStart) / 100) / 10, String(name).slice(0, 24)]); if (actions.length > 10) actions.shift(); }
  function flush() { write({ dirty: true, started: sessionStart, ring: ring, actions: actions, counters: counters, last_error: lastError, recovered_from: recovered ? recovered.detected_at : null }); }
  /* sample(): the caller hands a compact object of numbers / short strings; stored every PERIOD seconds */
  function sample(t, obj) { if (t - lastT < PERIOD) return false; lastT = t; obj.w = Date.now(); obj.s = Math.round((Date.now() - sessionStart) / 100) / 10; ring.push(obj); if (ring.length > RING) ring.shift(); flush(); return true; }
  function report() { return recovered; }
  function summary() { if (!recovered) return null; var last = recovered.ring[recovered.ring.length - 1] || {}; return 'RESTORED after an unexpected reload (' + (recovered.navigation_type || 'unknown') + ') — last sample ' + recovered.last_sample_age_s + ' s before: ' + Object.keys(last).filter(function (k) { return k !== 'w'; }).map(function (k) { return k + '=' + last[k]; }).join(' '); }
  return { boot: boot, watchCanvas: watchCanvas, noteAction: noteAction, sample: sample, report: report, summary: summary, counters: counters, available: !!store };
}
