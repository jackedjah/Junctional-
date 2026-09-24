/* CONVERGENCE PASS 4b — WALK IDENTITY ACROSS LEG STATES (owner addendum 2026-09-17): fused and separated must share one locomotion identity.
   Runs the same idle → walk (4 s, straight, the same open strip) → stop → settle script in FUSED and then in SPLIT, with a per-frame in-page
   trace (displayed + host position, gait phase / support, beam levels), and logs for BOTH forms: steady walk speed (displayed and host),
   start transition (input → 95 % of the steady speed), stop transition (release → < 0.05 m/s), step cadence (support-phase crossings per
   second), stride timing (time between consecutive steps) and stride length; states where they match and where they differ. Side-by-side
   stills (idle / walk / stop) from a fixed side camera for each form. node deploy/probe_walk_identity.mjs [static_dist]   Touch = not needed. */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); var DIST = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : path.join(HERE, 'static_dist');
var OUT = path.join(HERE, 'probe_out', 'walk_identity'); fs.mkdirSync(OUT, { recursive: true }); var VP = [1000, 700];
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: VP[0], height: VP[1], gpu: true, unlockFps: true }); var pass = 0, fail = 0, lines = [];
function ok(id, cond, detail) { (cond ? pass++ : fail++); var l = (cond ? 'PASS ' : 'FAIL ') + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''); lines.push(l); console.log(l.slice(0, 900)); }
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function shot(name) { await pg.screenshot(path.join(OUT, name + '.png')); }
function med(a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.floor(s.length / 2)]; }
/* the script: stand at (60, −45) facing west, idle 1.2 s, walk west 4 s, release, settle 2.5 s — identical for both forms */
async function runForm(form) {
  await ev("return P.goTo(60, -45, undefined, undefined, 60000);"); await sleep(300); await ev("return P.send('MOVE',{forward:0,strafe:0,run:false,yaw:-1.5708});"); await sleep(1500);
  await ev("P.cam(-1.5708 + 1.5708, 0.08, 4.2, 0.95); return 1;"); await sleep(600);   /* side view of a westward walk: camera on the south side */
  await ev("P.walkTrace('start'); return 1;"); var t0 = Date.now(); await sleep(1200); await shot(form + '_1_idle');
  var tMove = await ev("var t=performance.now(); P.send('MOVE',{forward:0,strafe:-1,run:false,yaw:-1.5708}); return t;"); await sleep(2500); await shot(form + '_2_walk'); await sleep(1500);
  var tStop = await ev("var t=performance.now(); P.send('MOVE',{forward:0,strafe:0,run:false,yaw:-1.5708}); return t;"); await sleep(600); await shot(form + '_3_stop'); await sleep(1900);
  var tr = await ev("return P.walkTrace('stop');"); return { trace: tr, tMove: tMove, tStop: tStop };
}
function analyse(r) {
  var tr = r.trace; var out = { frames: tr.length, form: tr.length ? tr[Math.floor(tr.length / 2)].form : null };
  /* displayed speed per frame (root position), host speed per frame (host snapshot, 60 ms cadence → smoothed over 0.25 s) */
  /* displayed speed over a 120 ms sliding window (the adapter interpolates 60 ms host snapshots; per-frame differences at an unlocked frame rate are quantised) */
  var sp = []; for (var i = 1; i < tr.length; i++) { var k0 = i; while (k0 > 0 && tr[i].t - tr[k0].t < 120) k0--; if (k0 === i) continue; var dt = (tr[i].t - tr[k0].t) / 1000; if (dt <= 0) continue; sp.push({ t: tr[i].t, v: Math.hypot(tr[i].dx - tr[k0].dx, tr[i].dz - tr[k0].dz) / dt }); }
  var hs = []; for (var j = 0; j < tr.length; j++) { var k = j; while (k > 0 && tr[j].t - tr[k].t < 250) k--; if (k === j) continue; var dth = (tr[j].t - tr[k].t) / 1000; if (tr[j].hx === null || tr[k].hx === null) continue; hs.push({ t: tr[j].t, v: Math.hypot(tr[j].hx - tr[k].hx, tr[j].hz - tr[k].hz) / dth }); }
  var steadyWin = function (a) { return a.filter(function (s) { return s.t > r.tMove + 1500 && s.t < r.tStop - 200; }).map(function (s) { return s.v; }); };
  out.speed_displayed_mps = +(med(steadyWin(sp)) || 0).toFixed(3); out.speed_host_mps = +(med(steadyWin(hs)) || 0).toFixed(3);
  /* transitions on the displayed motion: smooth the per-frame speed over 5 frames */
  var sm = sp.map(function (s, i) { var a = sp.slice(Math.max(0, i - 2), i + 3).map(function (x) { return x.v; }); return { t: s.t, v: a.reduce(function (p, q) { return p + q; }, 0) / a.length }; });
  var target = out.speed_displayed_mps; var t95 = null, tStopped = null; for (var m = 0; m < sm.length; m++) { if (t95 === null && sm[m].t > r.tMove && sm[m].v >= 0.95 * target) t95 = sm[m].t; if (tStopped === null && sm[m].t > r.tStop && sm[m].v < 0.05) tStopped = sm[m].t; }
  out.start_to_95pct_ms = t95 === null ? null : +(t95 - r.tMove).toFixed(0); out.release_to_stop_ms = tStopped === null ? null : +(tStopped - r.tStop).toFixed(0);
  /* overshoot / bobbing: peak displayed speed vs steady, and the vertical / lateral wobble is not traced — the calmness reads in the stills */
  var sp300 = []; for (var i3 = 1; i3 < tr.length; i3++) { var k3 = i3; while (k3 > 0 && tr[i3].t - tr[k3].t < 300) k3--; if (k3 === i3) continue; sp300.push({ t: tr[i3].t, v: Math.hypot(tr[i3].dx - tr[k3].dx, tr[i3].dz - tr[k3].dz) / ((tr[i3].t - tr[k3].t) / 1000) }); }   /* the overshoot is read over 300 ms so the 60 ms snapshot cadence cannot alias into a false peak */ var peak = Math.max.apply(null, sp300.filter(function (s) { return s.t > r.tMove && s.t < r.tStop; }).map(function (s) { return s.v; }).concat([0])); var target300 = med(steadyWin(sp300)) || target; out.peak_over_steady = target300 ? +(peak / target300).toFixed(3) : null; var hv = tr.filter(function (x) { return x.hv !== null && x.hv !== undefined && x.t > r.tMove && x.t < r.tStop; }).map(function (x) { return x.hv; }); var hvSteady = med(tr.filter(function (x) { return x.hv !== null && x.hv !== undefined && x.t > r.tMove + 1500 && x.t < r.tStop - 200; }).map(function (x) { return x.hv; })); var hpeak = Math.max.apply(null, hv.concat([0])); out.host_speed_steady_mps = hvSteady; out.host_peak_over_steady = hvSteady ? +(hpeak / hvSteady).toFixed(3) : null;   /* the host's own integrator velocity (no snapshot quantisation) */
  /* cadence from the gait phase: crossings of 0 (L) and π (R) inside the steady window */
  var steps = []; for (var q = 1; q < tr.length; q++) { if (tr[q].phase === null || tr[q - 1].phase === null) continue; if (tr[q].t <= r.tMove + 1500 || tr[q].t >= r.tStop - 200) continue; var a0 = tr[q - 1].phase, a1 = tr[q].phase; var cross = function (x) { var da = Math.atan2(Math.sin(a0 - x), Math.cos(a0 - x)), db = Math.atan2(Math.sin(a1 - x), Math.cos(a1 - x)); return da < 0 && db >= 0 && (db - da) < Math.PI; }; if (cross(0)) steps.push({ t: tr[q].t, side: 'L' }); if (cross(Math.PI)) steps.push({ t: tr[q].t, side: 'R' }); }
  var win = (r.tStop - 200) - (r.tMove + 1500); out.steps_in_window = steps.length; out.cadence_steps_per_s = +(steps.length / (win / 1000)).toFixed(3);
  var gaps = []; for (var g = 1; g < steps.length; g++) gaps.push(steps[g].t - steps[g - 1].t); out.step_period_ms = gaps.length ? +(med(gaps)).toFixed(0) : null; out.stride_length_m = gaps.length ? +(out.speed_displayed_mps * med(gaps) / 1000).toFixed(3) : null;
  /* does the gait phase advance at all (the fused glide keeps the phase frozen: no steps by design) */
  var ph = tr.filter(function (x) { return x.phase !== null && x.t > r.tMove + 1500 && x.t < r.tStop - 200; }).map(function (x) { return x.phase; }); out.phase_advances = ph.length > 2 && (Math.max.apply(null, ph) - Math.min.apply(null, ph)) > 0.5;
  /* beam rhythm (fused): the propulsion level's oscillation per second in the steady window */
  var bl = tr.filter(function (x) { return x.beam && x.t > r.tMove + 1500 && x.t < r.tStop - 200; }).map(function (x) { return x.beam[0]; }); var osc = 0; for (var b = 2; b < bl.length; b++) { if ((bl[b] - bl[b - 1]) * (bl[b - 1] - bl[b - 2]) < 0) osc++; } out.beam_level_reversals_per_s = bl.length ? +(osc / (win / 1000)).toFixed(2) : null;
  return out;
}
var report = { viewport: VP, checks: lines };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 120000); await sleep(6000); await ev("P.hud.showGuide(false); return 1;");
  for (var w = 0; w < 120; w++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(1000);
  await ev("P.camFollow(false); P.camCfg('fade_below_m', 0); return 1;");
  var bands = await ev("var s=P.snap().play; return { form: s.form, harmonized: null };");
  var F = await runForm('fused'); var fa = analyse(F); report.fused = fa; console.log('FUSED', JSON.stringify(fa));
  await ev("return P.send('TRANSFORM', {});"); await sleep(4000); var formNow = await ev("return P.snap().play.form;"); ok('T0 SEPARATE reached SPLIT before the second run', formNow === 'SPLIT', formNow);
  var S = await runForm('split'); var sa = analyse(S); report.split = sa; console.log('SPLIT', JSON.stringify(sa));
  await ev("return P.send('TRANSFORM', {});"); await sleep(3600);
  /* the comparison */
  var paceRatio = fa.speed_displayed_mps && sa.speed_displayed_mps ? sa.speed_displayed_mps / fa.speed_displayed_mps : null;
  ok('W1 pace: fused and separated ground travel run at the same steady speed (displayed ' + fa.speed_displayed_mps + ' vs ' + sa.speed_displayed_mps + ' m/s; host ' + fa.speed_host_mps + ' vs ' + sa.speed_host_mps + ' m/s; ratio within ±5 %)', paceRatio !== null && Math.abs(paceRatio - 1) <= 0.05 && Math.abs(fa.speed_host_mps - sa.speed_host_mps) < 0.2, { fused: fa.speed_displayed_mps, split: sa.speed_displayed_mps, ratio: paceRatio });
  ok('W2 the harmonized pace is the separated WALK band (3.58 m/s = 8 mph; canonical FUSED was 8.94 m/s): both forms within ±8 % of 3.58', Math.abs(fa.speed_host_mps - 3.58) <= 0.29 && Math.abs(sa.speed_host_mps - 3.58) <= 0.29, { fused_host: fa.speed_host_mps, split_host: sa.speed_host_mps });
  var dStart = fa.start_to_95pct_ms !== null && sa.start_to_95pct_ms !== null ? Math.abs(fa.start_to_95pct_ms - sa.start_to_95pct_ms) : null, dStop = fa.release_to_stop_ms !== null && sa.release_to_stop_ms !== null ? Math.abs(fa.release_to_stop_ms - sa.release_to_stop_ms) : null;
  ok('W3 transition timing: start (input → 95 %) and stop (release → still) match between the forms within 150 ms (fused ' + fa.start_to_95pct_ms + ' / ' + fa.release_to_stop_ms + ' ms, separated ' + sa.start_to_95pct_ms + ' / ' + sa.release_to_stop_ms + ' ms)', dStart !== null && dStop !== null && dStart <= 150 && dStop <= 150, { fused: [fa.start_to_95pct_ms, fa.release_to_stop_ms], split: [sa.start_to_95pct_ms, sa.release_to_stop_ms] });
  /* steady-state ripple of the DISPLAYED speed (300 ms windows) while the host integrator holds a constant speed: a smoothness observation shared by both forms (snapshot cadence → presentation), logged for PASS 5, not a form difference */
  ok('W4 calmness / identity of the start: the host integrator never overshoots in either form (peak = steady) and the displayed start profiles match between the forms (|Δ peak-over-steady| ≤ 0.05; both ≈ ' + fa.peak_over_steady + ' / ' + sa.peak_over_steady + ' — the ~10 % ripple over 300 ms windows is the 60 ms snapshot cadence reaching the presentation, identical in both forms, logged for PASS 5)', fa.host_peak_over_steady <= 1.02 && sa.host_peak_over_steady <= 1.02 && fa.peak_over_steady !== null && sa.peak_over_steady !== null && Math.abs(fa.peak_over_steady - sa.peak_over_steady) <= 0.05, { fused: [fa.peak_over_steady, fa.host_peak_over_steady], split: [sa.peak_over_steady, sa.host_peak_over_steady] });
  ok('W5 separated cadence is measured from the support phase: ' + sa.cadence_steps_per_s + ' steps/s, step period ' + sa.step_period_ms + ' ms, stride ' + sa.stride_length_m + ' m at ' + sa.speed_displayed_mps + ' m/s (the owner’s distance-tied cadence: 3.6 m per full cycle → 2 steps per 3.6 m)', sa.phase_advances && sa.steps_in_window >= 3 && sa.stride_length_m !== null && Math.abs(sa.stride_length_m * 2 - 3.6) < 0.5, { steps: sa.steps_in_window, cadence: sa.cadence_steps_per_s, period_ms: sa.step_period_ms, stride_m: sa.stride_length_m });
  ok('W6 STATED DIFFERENCE (not a pass / fail of the code): the fused form is a GLIDE by the owner’s earlier rule (no support phase, phase frozen: advances = ' + fa.phase_advances + '; beam level reversals ' + fa.beam_level_reversals_per_s + '/s), so it has no step cadence to match — pace and transitions are shared, the step rhythm exists only in the separated form; whether the fused glide should carry the separated walk’s rhythm is the gate question', fa.phase_advances === false, { fused_phase_advances: fa.phase_advances, fused_cadence: fa.cadence_steps_per_s });
  ok('Z zero page / console errors', pg.errors.filter(function (x) { return !/404/.test(x); }).length === 0, pg.errors.filter(function (x) { return !/404/.test(x); }).slice(0, 3));
  fs.writeFileSync(path.join(OUT, 'trace_fused.json'), JSON.stringify(F.trace)); fs.writeFileSync(path.join(OUT, 'trace_split.json'), JSON.stringify(S.trace));
  await ev("P.cam(null); P.camCfg('fade_below_m', 1.3); P.camFollow(true); return 1;");
} catch (e) { ok('X probe completed without an exception', false, String(e && e.stack || e)); }
finally { await pg.close(); srv.close(); }
report.pass = pass; report.fail = fail; fs.writeFileSync(path.join(OUT, 'walk_identity.json'), JSON.stringify(report, null, 1));
console.log('\nRESULT walk identity: ' + pass + ' passed, ' + fail + ' failed · ' + OUT); process.exit(fail ? 1 : 0);
