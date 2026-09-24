/* MAHWORLD :: Spec B (behind-back camera) — plain-node checks of the camera math + the tracked Spec B probe records (development, 2026-09-17).
   Covers: the critically damped spring (no overshoot at any dt, settles, firmer = faster), the release glide easing, the framing rule
   (same pixel size in portrait and landscape), the movement-frame re-latch rule, the flight-pitch rule, and the recorded acceptance
   probe results per mode (desktop / portrait / landscape, touch EMULATED) in 25_HANDOFF/PASSES/spec_b/.
   node 16_TESTS/gameplay_spec_b_camera.test.mjs   (from CLAUDE_GAMEPLAY_RUNTIME) */
import fs from 'node:fs';
import { wrapAngle, springStep, smoothstep01, framingDistance, relatchNeeded, flightVertical } from '../26_LOCAL_AUTHORITY/lab/cameraMath.js';
var pass = 0, fail = 0; function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
var DEG = Math.PI / 180;
/* 1 wrap */
ok('wrapAngle keeps the shortest signed angle', Math.abs(wrapAngle(350 * DEG) + 10 * DEG) < 1e-9 && Math.abs(wrapAngle(-190 * DEG) - 170 * DEG) < 1e-9 && wrapAngle(0) === 0);
/* 2 spring: simulate an 80° error at several frame rates */
function settle(w, dt, x0) { var x = x0, v = 0, t = 0, maxOver = 0, samples = []; while (t < 4) { var r = springStep(x, v, w, dt); x = r[0]; v = r[1]; t += dt; if (x0 > 0 && x < -1e-6) maxOver = Math.max(maxOver, -x); samples.push([t, x]); } var tSettle = samples.filter(function (s) { return Math.abs(s[1]) > 5 * DEG; }).pop(); return { final: x, overshoot: maxOver, t_within_5deg: tSettle ? tSettle[0] : 0 }; }
[1 / 240, 1 / 60, 1 / 30, 1 / 15].forEach(function (dt) { var r = settle(2 * Math.PI * 1.0, dt, 80 * DEG); ok('spring 1.0 Hz @ dt ' + dt.toFixed(4) + ': no overshoot, settles under 5° within 1.2 s, ends at 0', r.overshoot < 1e-6 && r.t_within_5deg < 1.2 && Math.abs(r.final) < 0.5 * DEG, r); });
var slow = settle(2 * Math.PI * 1.0, 1 / 60, 80 * DEG), fast = settle(2 * Math.PI * 2.0, 1 / 60, 80 * DEG); ok('firmer while moving (2.0 Hz) settles faster than idle (1.0 Hz)', fast.t_within_5deg < slow.t_within_5deg, [slow.t_within_5deg, fast.t_within_5deg]);
var a = settle(2 * Math.PI * 1.0, 1 / 60, 80 * DEG), b = settle(2 * Math.PI * 1.0, 1 / 15, 80 * DEG); ok('frame-rate independent: the 15 fps and 60 fps settle times agree within one 15 fps frame', Math.abs(a.t_within_5deg - b.t_within_5deg) <= 1 / 15 + 1e-9, [a.t_within_5deg, b.t_within_5deg]);
var big = springStep(80 * DEG, 0, 2 * Math.PI * 2.0, 0.35); ok('a huge delta (0.35 s, the presentation clamp) is still a bounded, non-overshooting step', big[0] >= 0 && big[0] < 80 * DEG, big);
/* 3 glide easing */
ok('smoothstep01 clamps and eases (0 → 0, 0.5 → 0.5, 1 → 1, symmetric, monotonic)', smoothstep01(-1) === 0 && smoothstep01(0) === 0 && Math.abs(smoothstep01(0.5) - 0.5) < 1e-12 && smoothstep01(1) === 1 && smoothstep01(2) === 1 && smoothstep01(0.25) < 0.25 && smoothstep01(0.75) > 0.75);
/* 4 framing: same pixel size in both orientations */
var H = 1.82461, fov = 55; var dL = framingDistance(H, 0.5, fov, 844, 390, 1, 0, 0), dP = framingDistance(H, 0.5, fov, 390, 844, 1, 0, 0);
function pixelHeight(d, viewH) { return H / (2 * d * Math.tan(fov * DEG / 2)) * viewH; }
ok('landscape 844×390: he fills 50 % of the short side (195 px)', Math.abs(pixelHeight(dL, 390) - 195) < 1, pixelHeight(dL, 390));
ok('portrait 390×844: the same 195 px (frame_frac is a fraction of the SHORT side)', Math.abs(pixelHeight(dP, 844) - 195) < 1, pixelHeight(dP, 844));
ok('zoom multiplies the distance; speed pull-back adds gradually', Math.abs(framingDistance(H, 0.5, fov, 844, 390, 2, 0, 0) - 2 * dL) < 1e-9 && Math.abs(framingDistance(H, 0.5, fov, 844, 390, 1, 1, 0.1) - 1.1 * dL) < 1e-9 && framingDistance(H, 0.5, fov, 844, 390, 1, 0.5, 0.1) < 1.1 * dL);
ok('distance is clamped to [1.6, 18] m', framingDistance(H, 0.9, fov, 100, 100, 0.55, 0, 0) >= 1.6 && framingDistance(H, 0.05, fov, 844, 390, 2.6, 0, 0) <= 18);
/* 5 movement-frame re-latch */
ok('stick moved 30° from the latch: no re-latch; 60°: re-latch (relatch 45°)', !relatchNeeded(0, 30 * DEG, 45) && relatchNeeded(0, 60 * DEG, 45) && relatchNeeded(170 * DEG, -170 * DEG, 45) === false && relatchNeeded(0, 180 * DEG, 45));
/* 6 flight pitch → vertical — SUPERSEDED — O4 (convergence 2026-09-17): "in altitude-hold mode, looking upward/downward must not itself change height;
   this specifically overrides the old Spec B camera-pitch-driven vertical flight rule". The pure function stays in cameraMath.js for history; the runtime
   no longer calls it. Replacement behaviour: 16_TESTS/gameplay_flight_f01.test.mjs (host hold semantics) + deploy/probe_flight_o4.mjs A2 / T4 (page). */
var supersededO4 = flightVertical(0.0, 0.2, 1) === 1 && flightVertical(0.55, 0.2, 1) === -1; console.log('SUPERSEDED — O4: flight pitch → vertical (the old rule still evaluates as designed: ' + supersededO4 + '; it is no longer wired)');
var playSrc = fs.readFileSync(new URL('../26_LOCAL_AUTHORITY/lab/play.js', import.meta.url), 'utf8'); ok('O4: play.js no longer wires the camera pitch to flight altitude (no flightVertical call, no cam.flightV rule)', playSrc.indexOf('flightVertical(') < 0 && playSrc.indexOf('cam.flightV =') < 0);
var o4 = null; try { o4 = JSON.parse(fs.readFileSync(new URL('../25_HANDOFF/CONVERGENCE/flight/o4_desktop.json', import.meta.url), 'utf8')); } catch (e) { }
ok('O4 replacement evidence exists and passed (25_HANDOFF/CONVERGENCE/flight/o4_desktop.json)', !!o4 && o4.fail === 0, o4 ? o4.checks.filter(function (l) { return /^FAIL/.test(l); }).slice(0, 3) : 'missing');
/* 7 the recorded acceptance probes (tracked copies) */
var EVID = new URL('../25_HANDOFF/PASSES/spec_b/', import.meta.url);
['desktop', 'portrait', 'landscape'].forEach(function (mode) { var r = null; try { r = JSON.parse(fs.readFileSync(new URL('spec_b_' + mode + '.json', EVID), 'utf8')); } catch (e) { }
  ok('spec B probe record exists for ' + mode, !!r, 'expected 25_HANDOFF/PASSES/spec_b/spec_b_' + mode + '.json');
  if (!r) return; ok(mode + ': every probe check passed (' + r.pass + '/' + (r.pass + r.fail) + ')', r.fail === 0, r.checks.filter(function (l) { return /^FAIL/.test(l); }).slice(0, 3));
  ok(mode + ': touch is labelled EMULATED, never a phone', mode === 'desktop' ? r.touch_emulated === false : r.touch_emulated === true);
  /* release → automatic return: SUPERSEDED — O1 (the orbit persists after release); the < 5° rear-yaw check applies to the EXPLICIT reset */
  var rel = r.samples && r.samples.release; if (rel && rel.length) { var first = rel[0], last = rel[rel.length - 1]; ok(mode + ': O1 — after the release the orbit PERSISTS (release samples keep their yaw error: |Δ| < 3°, |error| > 25°)', Math.abs(last.err - first.err) < 3 && Math.abs(last.err) > 25, { first: first, last: last }); }
  var rs = r.samples && r.samples.reset; if (rs && rs.length) { var lastR = rs[rs.length - 1]; ok(mode + ': the explicit reset samples end with |yaw error| < 5° (documented reset_time_s)', Math.abs(lastR.err) < 5, lastR); } else ok(mode + ': reset samples recorded', false, 'missing samples.reset');
  console.log('SUPERSEDED — O1: ' + mode + ' release → return-behind check (Spec B A2–A4) — replaced by the persist + explicit-reset checks above');
});
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
