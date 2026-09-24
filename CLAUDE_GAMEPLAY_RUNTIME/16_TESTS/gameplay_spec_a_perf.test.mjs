/* MAHWORLD :: Spec A (smoothness) — plain-node checks of the quality tiers and the Control Lab statistics (development, 2026-09-17).
   Covers: tier table shape and monotonic budgets, tier selection order (url → saved → device), adaptive pixel ratio inside the tier,
   Control Lab percentiles / dropped-frame candidates on a synthetic frame series, and the PASS 1 route report files (before / after).
   node 16_TESTS/gameplay_spec_a_perf.test.mjs   (from CLAUDE_GAMEPLAY_RUNTIME) */
import fs from 'node:fs';
/* browser globals the modules touch at import / call time (guarded in the modules, stubbed here so node can load them) */
globalThis.location = { search: '' }; globalThis.matchMedia = function () { return { matches: false }; };
var STORE = {}; globalThis.localStorage = { getItem: function (k) { return STORE[k] === undefined ? null : STORE[k]; }, setItem: function (k, v) { STORE[k] = String(v); } };
var DOC = { createElement: function () { return { style: {}, addEventListener: function () { }, appendChild: function () { }, querySelector: function () { return { addEventListener: function () { }, textContent: '' }; }, getContext: function () { return null; } }; }, head: { appendChild: function () { } }, body: { appendChild: function () { } } }; globalThis.document = DOC;
var { TIERS, ADAPT, createQuality } = await import('../26_LOCAL_AUTHORITY/lab/quality.js');
var { createControlLab } = await import('../26_LOCAL_AUTHORITY/lab/controlLab.js');
var pass = 0, fail = 0; function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }

/* 1 tier table */
var names = Object.keys(TIERS); ok('three tiers LOW / MED / HIGH', names.join() === 'LOW,MED,HIGH', names);
var keys = ['dpr_cap', 'dpr_floor', 'particles', 'clouds', 'city_fins', 'fog_far_scale', 'lod_far_m', 'antialias', 'shadows', 'shadow_map', 'shadow_reach_m'];
ok('every tier carries every budget key and nothing unconsumed', names.every(function (n) { return keys.every(function (k) { return TIERS[n][k] !== undefined; }) && Object.keys(TIERS[n]).every(function (k) { return keys.indexOf(k) >= 0; }); }));
ok('budgets rise LOW → MED → HIGH', TIERS.LOW.dpr_cap < TIERS.MED.dpr_cap && TIERS.MED.dpr_cap < TIERS.HIGH.dpr_cap && TIERS.LOW.particles < TIERS.MED.particles && TIERS.MED.particles <= TIERS.HIGH.particles && TIERS.LOW.clouds < TIERS.MED.clouds && TIERS.MED.clouds < TIERS.HIGH.clouds && TIERS.LOW.lod_far_m < TIERS.MED.lod_far_m && TIERS.MED.lod_far_m < TIERS.HIGH.lod_far_m);
ok('dpr floor never above the cap', names.every(function (n) { return TIERS[n].dpr_floor <= TIERS[n].dpr_cap; }));
ok('shadows: LOW + MED off (blob contact shadow only — measured phone-tier cost), HIGH pcf 1024 (the sun shadow box follows the player, the player casts)', TIERS.LOW.shadows === 'off' && TIERS.MED.shadows === 'off' && TIERS.HIGH.shadows === 'pcf' && TIERS.HIGH.shadow_map === 1024);

/* 2 tier selection */
var q1 = createQuality({ params: new URLSearchParams('') }); ok('device default (fine pointer) → HIGH', q1.tier() === 'HIGH' && q1.source() === 'device', [q1.tier(), q1.source()]);
globalThis.matchMedia = function () { return { matches: true }; }; var q2 = createQuality({ params: new URLSearchParams('') }); ok('device default (coarse pointer) → MED', q2.tier() === 'MED' && q2.source() === 'device', [q2.tier(), q2.source()]);
var q3 = createQuality({ params: new URLSearchParams('quality=low') }); ok('?quality=low wins over the device', q3.tier() === 'LOW' && q3.source() === 'url');
var q4 = createQuality({ params: new URLSearchParams('fx=low') }); ok('?fx=low (historical) maps to LOW', q4.tier() === 'LOW');
q2.set('high'); ok('set() is case-insensitive, persists to localStorage', q2.tier() === 'HIGH' && STORE['mahworld.quality'] === 'HIGH' && q2.source() === 'user');
var q5 = createQuality({ params: new URLSearchParams('') }); ok('saved choice beats the device default', q5.tier() === 'HIGH' && q5.source() === 'saved');
var q6 = createQuality({ params: new URLSearchParams('quality=med') }); ok('url beats the saved choice', q6.tier() === 'MED' && q6.source() === 'url');
var fired = []; q6.on(function (t, T) { fired.push([t, T.lod_far_m]); }); q6.set('LOW'); q6.set('LOW'); q6.set('BOGUS'); ok('listeners fire once per real change, never for unknown tiers', fired.length === 1 && fired[0][0] === 'LOW' && fired[0][1] === TIERS.LOW.lod_far_m, fired);

/* 3 adaptive pixel ratio inside the tier */
var qa = createQuality({ params: new URLSearchParams('quality=high') });
ok('slow frames (avg > 21 ms: missing 60 Hz frames) drop the ratio by 0.25', qa.adaptPixelRatio(24, 1.5, 2) === 1.25 && qa.adaptPixelRatio(48, 1.5, 2) === 1.25);
ok('never below the tier floor', qa.adaptPixelRatio(48, TIERS.HIGH.dpr_floor, 2) === null);
ok('a steady 60 Hz frame (16.7 ms) raises slowly toward the cap', qa.adaptPixelRatio(16.7, 1.0, 2) === 1.125);
ok('fast frames (avg < 17.5 ms) raise it by 0.125', qa.adaptPixelRatio(12, 1.0, 2) === 1.125);
ok('never above the tier cap (PASS 4: LOW 1.0 · MED 2.0 · HIGH 3.0, floors 0.6 / 1.0 / 1.0)', TIERS.LOW.dpr_cap === 1.0 && TIERS.MED.dpr_cap === 2.0 && TIERS.HIGH.dpr_cap === 3.0 && TIERS.MED.dpr_floor === 1.0 && qa.adaptPixelRatio(12, 3.0, 3) === null && createQuality({ params: new URLSearchParams('quality=med') }).adaptPixelRatio(12, 2.0, 3) === null);
ok('never above the device ratio', qa.adaptPixelRatio(12, 1.0, 1.0) === null);
ok('between the thresholds → no change', qa.adaptPixelRatio(19, 1.0, 2) === null);
ok('thresholds are live tunables (Control Lab binds q.adapt)', qa.adapt && qa.adapt.drop_ms === 21 && qa.adapt.raise_ms === 17.5);
var ql = createQuality({ params: new URLSearchParams('quality=low') }); ok('LOW caps at 1.0 even on a 3× display (and MED at 2.0: a 3× phone renders 2× device pixels, never 1/3 of them)', ql.adaptPixelRatio(10, 1.0, 3) === null && ql.adaptPixelRatio(10, 0.6, 3) === 0.725 && createQuality({ params: new URLSearchParams('quality=med') }).adaptPixelRatio(30, 1.0, 3) === null);

/* 4 Control Lab statistics on a synthetic series: 590 frames at 16.7 ms, 10 frames at 60 ms */
var lab = createControlLab({ $: function () { return null; }, quality: qa });
for (var i = 0; i < 600; i++) lab.frame(i % 60 === 0 ? 60 : 16.7, i % 60 === 0 ? 55 : 9);
var st = lab.stats();
ok('600-frame window', st.frames === 600);
ok('interval p50 = the steady frame', Math.abs(st.interval_ms.p50 - 16.7) < 0.05, st.interval_ms);
ok('interval p99 catches the 60 ms frames', st.interval_ms.p99 === 60, st.interval_ms);
ok('work percentiles track the work series', st.work_ms.p50 === 9 && st.work_ms.p99 === 55, st.work_ms);
ok('dropped % (PROPOSED: > 1.5 × rolling median) = 10 / 600', Math.abs(st.dropped_pct - 1.7) < 0.05, st.dropped_pct);
ok('> 50 ms % = 10 / 600', Math.abs(st.over_50ms_pct - 1.7) < 0.05, st.over_50ms_pct);
ok('the dropped-frame definition is labelled PROPOSED', /PROPOSED/.test(st.dropped_def));
lab.bind('T', 'x', { kind: 'read', get: function () { return 42; } }); lab.bind('T', 'y', { min: 0, max: 1, get: function () { return 0.5; }, set: function (v) { this._v = v; } });
ok('bound values are read live', lab.values().T.x === 42 && lab.values().T.y === 0.5);
ok('setValue reaches the setter, refuses read-only fields', lab.setValue('T', 'y', 0.7) === true && lab.setValue('T', 'x', 1) === false);
lab.reset(); ok('reset empties the window', lab.stats().frames === 0);

/* 5 the logged route evidence (Spec A acceptance: before / after p95 + dropped-frame candidates on the test route, logged).
   Read from the TRACKED copies in 25_HANDOFF/PASSES/perf (deploy/probe_out is gitignored). The series file holds N interleaved
   before (A) / after (B) runs per viewport with medians + spread; "no regression" = B median p95 <= A median p95 + max(0.5 ms, A spread). */
var EVID = new URL('../25_HANDOFF/PASSES/perf/', import.meta.url);
function rep(n) { try { return JSON.parse(fs.readFileSync(new URL(n, EVID), 'utf8')); } catch (e) { return null; } }
var series = rep('route_series_pass1.json');
ok('PASS 1 route series exists (tracked evidence)', !!series && !!series.summary, 'expected 25_HANDOFF/PASSES/perf/route_series_pass1.json');
if (series && series.summary) {
  Object.keys(series.summary).forEach(function (vp) { var S = series.summary[vp]; var d = S.delta_route;
    ok(vp + ': >= 3 valid before runs and >= 3 valid after runs', S.A.valid_runs >= 3 && S.B.valid_runs >= 3, [S.A.valid_runs, S.B.valid_runs]);
    ['walk', 'fly', 'land', 'combo', 'route'].forEach(function (ph) { ok(vp + ': phase ' + ph + ' recorded on both sides', !!S.A.phases[ph] && !!S.B.phases[ph] && S.A.phases[ph].p95_ms.median !== null && S.B.phases[ph].p95_ms.median !== null); });
    ok(vp + ': after p95 <= before p95 + tolerance (no regression; medians of the series)', !d.regressed, { before: S.A.phases.route.p95_ms, after: S.B.phases.route.p95_ms, tolerance_ms: d.tolerance_ms });
    ok(vp + ': after max frame median below 100 ms (first-sight / first-cast stalls warmed)', S.B.phases.route.max_ms.median < 100, S.B.phases.route.max_ms);
    ok(vp + ': dropped-frame candidates logged (>25 / >33 / >50 ms shares, PROPOSED 1.5x-median)', typeof S.B.phases.route.over_25ms_pct.median === 'number' && typeof S.B.phases.route.over_50ms_pct.median === 'number' && typeof S.B.dropped_pct_proposed_median === 'number');
  });
  ok('harness recorded with the measurements (pacing, builds, viewports, runs)', !!series.harness && !!series.builds && Array.isArray(series.viewports) && series.runs >= 3);
}
/* every later pass records its own interleaved series against the previous accepted build: none may regress (Spec A: "No later pass may regress them") */
fs.readdirSync(EVID).filter(function (f) { return /^route_series_(pass\d+|round\d+[a-z_]*|conv[a-z0-9_]*)\.json$/.test(f) && f !== 'route_series_pass1.json'; }).sort().forEach(function (f) { var sr = JSON.parse(fs.readFileSync(new URL(f, EVID), 'utf8')); Object.keys(sr.summary).forEach(function (vp) { var d = sr.summary[vp].delta_route; var valid = sr.summary[vp].A.valid_runs >= 3 && sr.summary[vp].B.valid_runs >= 3; if (d.regressed && sr.owner_exception) ok(f + ' ' + vp + ': REGRESSED by Δ p95 ' + d.p95_ms + ' ms — recorded OWNER EXCEPTION (' + sr.owner_exception.what + ')', valid && typeof sr.owner_exception.measured === 'string' && sr.owner_exception.what.length > 10, sr.owner_exception); else ok(f + ' ' + vp + ': no regression vs the previous accepted build (Δ p95 ' + d.p95_ms + ' ms, tolerance ' + d.tolerance_ms + ')', !d.regressed && valid, d); }); });   /* an owner-requested cost (e.g. the desktop sun shadow) is never silent: the series file must carry an explicit owner_exception with what + measured, and it is printed with the delta */
var after = rep('route_pass1_desktop_final.json');
ok('single-run report carries the breakdown, LOD and Control Lab stats', !!after && !!after.breakdown_ms && Array.isArray(after.lod) && after.lod.length >= 4 && !!after.control_lab_last600);
if (after) ok('every landmark has a far LOD level with fewer triangles', after.lod.every(function (l) { return l.far > 0 && l.far < l.full; }), after.lod);
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
