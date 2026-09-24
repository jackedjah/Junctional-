/* M5 owner-correction tree probe: measures the forest module's startup cost and follows the same
   labelled tree in each class-colour family across its real LOD boundary. This is local desktop /
   phone-sized evidence only, never physical-phone acceptance.

   node deploy/jobb/probe_tree_lod.mjs [--dist <static_dist>] [--out <dir>] [--label <name>]
     [--sky DAY|NIGHT] [--profile desktop|phone | --mobile] [--shots]
*/
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from '../probe_lib.mjs';

var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2);
function arg(k, d) { var i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; }
function has(k) { return argv.indexOf(k) >= 0; }
var DIST = path.resolve(arg('--dist', path.join(HERE, '..', 'static_dist')));
var OUT = path.resolve(arg('--out', path.join(HERE, '..', 'probe_out', 'jobb', 'tree_lod')));
var SKY = String(arg('--sky', 'NIGHT')).toUpperCase(); if (SKY !== 'DAY' && SKY !== 'NIGHT') throw new Error('tree probe: --sky must be DAY or NIGHT');
var PROFILE = String(arg('--profile', has('--mobile') ? 'phone' : 'desktop')).toLowerCase(); if (PROFILE === 'mobile') PROFILE = 'phone'; if (PROFILE !== 'desktop' && PROFILE !== 'phone') throw new Error('tree probe: --profile must be desktop or phone');
var MOBILE = has('--mobile') || PROFILE === 'phone', SHOTS = has('--shots'); if (MOBILE) PROFILE = 'phone';
var LABEL = String(arg('--label', PROFILE + '_' + SKY.toLowerCase())).replace(/[^A-Za-z0-9_.-]/g, '_');
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(DIST, 'BUILD_INFO.json'))) throw new Error('tree probe: static build missing at ' + DIST);

var report = { label: LABEL, sky: SKY, profile_id: PROFILE, profile: MOBILE ? 'phone-sized emulation (not a physical phone)' : 'desktop headless Chrome GPU',
  viewport: MOBILE ? { width: 393, height: 852, dpr: 2 } : { width: 1280, height: 800, dpr: 1 }, dist: DIST, startup: {}, families: [], lifecycle: null, screenshots: [], errors: [], expected_fallback_errors: [] };
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: report.viewport.width, height: report.viewport.height, dpr: report.viewport.dpr, mobile: MOBILE, gpu: true, unlockFps: false, cmdTimeoutMs: 120000 });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function frames(n) { return await ev("return new Promise(function(res){ var a=[],p=performance.now(); function f(){ var q=performance.now(); a.push(q-p); p=q; if(a.length<" + n + ") requestAnimationFrame(f); else res(a); } requestAnimationFrame(f); });"); }
function stats(a) { var s = a.slice().sort(function (x, y) { return x - y; }); function p(q) { return +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(2); } return { n: s.length, p50_ms: p(0.5), p95_ms: p(0.95), p99_ms: p(0.99), max_ms: +s[s.length - 1].toFixed(2) }; }
async function snapshot() { return await ev("var w=P.worldLayer(),d=w&&w.debug?w.debug():null,r=P.renderInfo(),rd=P.rendererDebug(); return { forest:d&&d.forest, forest_build_ms:d&&d.build_ms?d.build_ms.forest:null, render:{calls:r.calls,triangles:r.triangles||r.tris,programs:rd&&rd.info&&rd.info.programs?rd.info.programs.length:null,textures:rd&&rd.info&&rd.info.memory?rd.info.memory.textures:null,geometries:rd&&rd.info&&rd.info.memory?rd.info.memory.geometries:null}, camera:P.camState?P.camState().position:null }; "); }
async function transitionFrames(index, elapsedOffset) { return await ev("return new Promise(function(res){ var out=[],t0=performance.now(),idx=" + index + ",off=" + elapsedOffset + "; function take(mark,frame){ var w=P.worldLayer(),d=w&&w.debug?w.debug():null,f=d&&d.forest||{},r=P.renderInfo(),rd=P.rendererDebug(),exact=(f.family_samples||[]).filter(function(s){return s.index===idx;})[0]||null; out.push({mark:mark,frame_after_place:frame,elapsed_ms:+(off+performance.now()-t0).toFixed(1),tree_state:exact,lod_counts:f.lod_counts,render:{calls:r.calls,triangles:r.triangles||r.tris,programs:rd&&rd.info&&rd.info.programs?rd.info.programs.length:null,textures:rd&&rd.info&&rd.info.memory?rd.info.memory.textures:null,geometries:rd&&rd.info&&rd.info.memory?rd.info.memory.geometries:null},screenshot:null}); } requestAnimationFrame(function(){take('raf_1',1);requestAnimationFrame(function(){requestAnimationFrame(function(){take('raf_3',3);res(out);});});}); });"); }
async function placeTree(tree, distance) {
  /* yaw +pi/2 puts the camera about eight metres farther +X than the player; the selected tree
     remains behind the player in the view, so it is both classifiable and visible. */
  var playerX = tree.x + distance - 8; return await ev("P.camFollow(false); P.cam(Math.PI/2,0.12,8,4); return P.devPlay('PLACE',{x:" + playerX + ",z:" + tree.z + "});");
}
function exactTree(snap, index) { var forest = snap && snap.forest || {}; return (forest.family_samples || []).filter(function (s) { return s.index === index; })[0] || null; }
async function transitionFor(tree, distance, familyNumber, phase) {
  var t0 = performance.now(), captures = [], file = null;
  await placeTree(tree, distance);
  var immediate = await snapshot(), immediateRow = { mark: 'immediate', frame_after_place: 0, elapsed_ms: +(performance.now() - t0).toFixed(1), tree_state: exactTree(immediate, tree.index), lod_counts: immediate.forest && immediate.forest.lod_counts, render: immediate.render, screenshot: null };
  /* Start the page-side rAF sampler before the CDP screenshot. The screen remains
     the first available presented image, while raf_1 / raf_3 stay true frame samples
     rather than labels distorted by screenshot I/O latency. */
  var rafPending = transitionFrames(tree.index, +(performance.now() - t0).toFixed(1));
  if (SHOTS) {
    file = LABEL + '_' + String(familyNumber).padStart(2, '0') + '_' + tree.family + '_' + phase + '_immediate.png';
    await pg.screenshot(path.join(OUT, file)); report.screenshots.push(file); immediateRow.screenshot = file;
  }
  captures.push(immediateRow); captures = captures.concat(await rafPending); await sleep(550); var settled = await snapshot(); captures.push({ mark: 'settled_550ms', frame_after_place: null, elapsed_ms: +(performance.now() - t0).toFixed(1), tree_state: exactTree(settled, tree.index), lod_counts: settled.forest && settled.forest.lod_counts, render: settled.render, screenshot: null });
  return { settled: settled, captures: captures };
}
async function settledFor(tree, distance) {
  await placeTree(tree, distance); await sleep(550); return await snapshot();
}
try {
  var t0 = performance.now(); await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1&sky=' + SKY.toLowerCase()); report.startup.load_event_ms = +(performance.now() - t0).toFixed(1);
  await waitForGame(pg, 120000); report.startup.ready_ms = +(performance.now() - t0).toFixed(1); await ev("P.hud.showGuide(false);return 1;"); await sleep(1200);
  report.observed_sky = await ev("return P.timeOfDay();"); if (report.observed_sky !== SKY) throw new Error('tree probe: requested ' + SKY + ' but runtime reports ' + report.observed_sky);
  var initial = await snapshot(); report.startup.forest_build_ms = initial.forest_build_ms; report.startup.forest = initial.forest; report.startup.render = initial.render;
  var samples = initial.forest && initial.forest.family_samples ? initial.forest.family_samples : await ev("var w=P.worldLayer(),c=w&&w.ctx,p=c&&c.forestPlacement||[],z=(w&&w.registry&&w.registry().tree_lock&&w.registry().tree_lock.zone_family)||{},seen={},a=[]; p.forEach(function(t,i){var f=z[t.zone];if(f&&!seen[f]){seen[f]=1;a.push({index:i,zone:t.zone,family:f,x:t.x,z:t.z});}});return a;");
  var wanted = ['gold', 'blue', 'red', 'pink', 'purple']; samples = wanted.map(function (f) { return samples.filter(function (s) { return s.family === f; })[0]; }).filter(Boolean);
  if (samples.length !== wanted.length) throw new Error('tree probe: missing labelled family samples: ' + wanted.filter(function (f) { return !samples.some(function (s) { return s.family === f; }); }).join(', '));
  var nearM = initial.forest && initial.forest.lod_m ? initial.forest.lod_m.near : 26; var distances = [nearM + 14, Math.max(nearM + 3, nearM * 1.1), Math.max(4, nearM - 8), Math.max(nearM + 3, nearM * 1.1), nearM + 14];
  for (var i = 0; i < samples.length; i++) { var tr = samples[i], rec = { family: tr.family, zone: tr.zone, index: tr.index, tree: { x: tr.x, z: tr.z }, passes: [] };
    for (var j = 0; j < distances.length; j++) { var phase = ['far_in', 'boundary_in', 'near', 'boundary_out', 'far_out'][j], transition = await transitionFor(tr, distances[j], i + 1, phase), snap = transition.settled, ft = snap.forest || {}, exact = exactTree(snap, tr.index), ftimes = stats(await frames(90)); rec.passes.push({ phase: phase, requested_camera_distance_m: +distances[j].toFixed(1), transition: transition.captures, tree_state: exact, lod_counts: ft.lod_counts, render: snap.render, settled_tree_state: exact, settled_lod_counts: ft.lod_counts, settled_render: snap.render, frames: ftimes });
    } report.families.push(rec); console.log('tree family', tr.family, JSON.stringify(rec.passes.map(function (p) { return { phase: p.phase, tier: p.settled_tree_state && p.settled_tree_state.tier, tris: p.settled_render.triangles, p95: p.frames.p95_ms }; })));
  }
  var before = await snapshot(), first = samples[0], cycles = [];
  if (first) for (i = 0; i < 8; i++) { var ds = i % 2 ? Math.max(4, nearM - 8) : nearM + 14; var cs = await settledFor(first, ds); cycles.push({ cycle: i + 1, side: i % 2 ? 'near' : 'far', forest: cs.forest, render: cs.render }); }
  var after = await snapshot(), br = before.forest && before.forest.lifecycle && before.forest.lifecycle.resources, ar = after.forest && after.forest.lifecycle && after.forest.lifecycle.resources; report.lifecycle = { cycles: cycles, before: before, after: after, stable_programs: before.render.programs === after.render.programs, stable_tree_resources: !!br && !!ar && JSON.stringify(br) === JSON.stringify(ar), global_textures_note: before.render.textures === after.render.textures ? 'stable' : 'changed while travelling (whole-world counter, not attributed to forest)', global_geometries_note: before.render.geometries === after.render.geometries ? 'stable' : 'changed while travelling (whole-world counter, not attributed to forest)' };
  report.expected_fallback_errors = pg.errors.filter(function (e) { return /favicon\.ico|athlete_m_preview\/dev_0\.(1|13|12|11|10|9|7|6|5|4|3|2)\/manifest\.json/i.test(e); }); report.errors = pg.errors.filter(function (e) { return report.expected_fallback_errors.indexOf(e) < 0; });
} catch (e) { report.fatal = String(e && e.stack || e); report.expected_fallback_errors = pg.errors.filter(function (x) { return /favicon\.ico|athlete_m_preview\/dev_0\./i.test(x); }); report.errors = pg.errors.filter(function (x) { return report.expected_fallback_errors.indexOf(x) < 0; }); console.error(e); }
finally { await pg.close(); srv.close(); }
fs.writeFileSync(path.join(OUT, LABEL + '_tree_lod.json'), JSON.stringify(report, null, 1));
console.log('RESULT tree_lod ' + (report.fatal || report.errors.length ? 'FAIL' : 'OK') + ' → ' + path.join(OUT, LABEL + '_tree_lod.json'));
process.exit(report.fatal || report.errors.length ? 1 : 0);
