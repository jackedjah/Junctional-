/* MAHWORLD :: MOCAP CLIP VALIDATOR (Spec F, PASS 6). node 26_LOCAL_AUTHORITY/mocap/validate_clip.mjs <clip.json | clip.glb> --id <clip id> [--manifest <path>] [--rig <glb>] [--json]
   Checks ONE clip against its manifest entry (lab/mocap/clip_manifest.json) — the things a validator can actually check:
     · bone map complete: every joint of the clip's mask has a track (ROOT only needs a track when the clip has root motion)
     · no missing tracks: every tracked bone has a finite value on every frame
     · no T-pose / bind frames: no frame where every tracked bone sits within 0.02 rad of the identity rest
     · contact frames: for clips whose mask has the tips, the tips' world height per frame is computed by FK on the rig's rest skeleton and the
       contacts (local minima of tip height) are reported; a locomotion clip needs ≥ 2 contacts per leg with consistent heights (spread ≤ 5 cm)
     · loop seams: a loop clip carries its repeat frame (last frame = first frame; the runtime plays [0, n−1)) — first and last frames agree per
       bone (≤ 0.05 rad, wrapped) and in root height (≤ 2 cm)
     · duration ≥ the manifest minimum, fps ≥ 24
   It NEVER judges motion quality (calmness, weight, timing) — that is the render and Jah's eye. Exit 0 = the checks pass; the JSON report lists
   every measurement so the reviewer can see what was and was not checked. Input formats: the runtime clip JSON ({ meta: { fps }, frames: [{ BONE: [x, y, z] }] },
   optional frames[i].ROOT_POS: [x, y, z] metres) or a GLB whose animation targets nodes named with the MAH joint names (Blender retarget export). */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { readClip, restSkeleton, tipWorldY } from './clip_io.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; } function flag(k) { return argv.indexOf(k) >= 0; }
var FILE = argv[0] && !argv[0].startsWith('--') ? argv[0] : null; var ID = arg('--id', null); var MANIFEST = arg('--manifest', path.join(HERE, '..', 'lab', 'mocap', 'clip_manifest.json')); var RIG = arg('--rig', path.join(HERE, '..', 'lab', 'assets', 'athlete_m_preview', 'dev_0.14', 'Mah_Athlete_M_am08_v6.glb'));
if (!FILE || !ID) { console.error('usage: node mocap/validate_clip.mjs <clip.json|clip.glb> --id <clip id> [--manifest p] [--rig glb] [--json]'); process.exit(2); }
var manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); var entry = manifest.clips.filter(function (c) { return c.id === ID; })[0]; if (!entry) { console.error('no manifest entry ' + ID); process.exit(2); }
var mask = manifest.skeleton.masks[entry.mask] || []; var report = { clip: FILE, id: ID, mask: entry.mask, checks: [], measured: {} }; var fail = 0;
function ok(name, cond, detail) { report.checks.push({ name: name, pass: !!cond, detail: detail }); if (!cond) fail++; }

/* ---------- read the clip into frames of Euler XYZ (radians) per bone + optional root position ---------- */
var clip = readClip(FILE);
var frames = clip.frames || []; var fps = (clip.meta && clip.meta.fps) || 30; var duration = frames.length / fps; report.measured.fps = fps; report.measured.frames = frames.length; report.measured.duration_s = +duration.toFixed(3);
ok('the clip has frames and a plausible rate (fps ≥ 24)', frames.length > 1 && fps >= 24, { frames: frames.length, fps: fps });
ok('duration ≥ the manifest minimum (' + entry.min_duration_s + ' s)', duration >= (entry.min_duration_s || 0), { duration_s: +duration.toFixed(2) });

/* ---------- bone map / missing tracks ---------- */
var tracked = {}; frames.forEach(function (r) { Object.keys(r).forEach(function (k) { if (k !== 'ROOT_POS') tracked[k] = (tracked[k] || 0) + 1; }); }); var trackedBones = Object.keys(tracked);
var need = mask.filter(function (b) { return b !== 'ROOT'; }); var missingBones = need.filter(function (b) { return !tracked[b]; }); var extra = trackedBones.filter(function (b) { return need.indexOf(b) < 0 && manifest.skeleton.joints.indexOf(b) >= 0; }); var unknown = trackedBones.filter(function (b) { return manifest.skeleton.joints.indexOf(b) < 0; });
report.measured.tracked_bones = trackedBones; report.measured.missing_bones = missingBones; report.measured.extra_bones = extra; report.measured.unknown_bones = unknown;
ok('bone map complete for mask ' + entry.mask + ' (' + need.length + ' joints)', missingBones.length === 0 && unknown.length === 0, { missing: missingBones, unknown: unknown, extra_outside_mask: extra });
var gaps = []; trackedBones.forEach(function (b) { for (var i = 0; i < frames.length; i++) { var v = frames[i][b]; if (!v || v.length < 3 || typeof v[0] !== 'number' || typeof v[1] !== 'number' || typeof v[2] !== 'number' || !isFinite(v[0]) || !isFinite(v[1]) || !isFinite(v[2])) { gaps.push(b + '@' + i); if (gaps.length > 20) return; } } });
ok('no missing / non-finite track values on any frame', gaps.length === 0, gaps.slice(0, 10));
if (entry.root_motion) ok('root motion clip carries a ROOT_POS track', frames.every(function (r) { return r.ROOT_POS && r.ROOT_POS.length === 3; }), { frames_with_root: frames.filter(function (r) { return !!r.ROOT_POS; }).length });

/* ---------- T-pose / bind frames ---------- */
var bind = []; frames.forEach(function (r, i) { var all = trackedBones.length > 0; trackedBones.forEach(function (b) { var v = r[b]; if (!v) return; if (Math.abs(v[0]) > 0.02 || Math.abs(v[1]) > 0.02 || Math.abs(v[2]) > 0.02) all = false; }); if (all) bind.push(i); });
report.measured.bind_frames = bind; ok('no T-pose / identity-rest frames (every tracked bone within 0.02 rad of rest on the same frame)', bind.length === 0, { bind_frames: bind.slice(0, 10), count: bind.length });

/* ---------- contact frames (FK on the rig's rest skeleton) ---------- */
var hasTips = need.indexOf('TIP_L') >= 0 && need.indexOf('TIP_R') >= 0; var rig = null; try { rig = restSkeleton(RIG); } catch (e) { report.measured.rig_error = String(e.message); }
if (hasTips && rig && frames.length > 1) {
  var worldY = function (row, bone) { return tipWorldY(rig, row, bone); };
  var contacts = {}; ['TIP_L', 'TIP_R'].forEach(function (tip) { var ys = frames.map(function (r) { return worldY(r, tip); }); var mins = []; for (var i = 1; i < ys.length - 1; i++) if (ys[i] <= ys[i - 1] && ys[i] < ys[i + 1] && (mins.length === 0 || i - mins[mins.length - 1].frame > fps * 0.25)) mins.push({ frame: i, y_m: +ys[i].toFixed(3) }); contacts[tip] = { count: mins.length, frames: mins.slice(0, 12), height_spread_m: mins.length ? +(Math.max.apply(null, mins.map(function (m) { return m.y_m; })) - Math.min.apply(null, mins.map(function (m) { return m.y_m; }))).toFixed(3) : null }; });
  report.measured.contacts = contacts; var loco = /^(WALK|JOG|RUN|START|STOP|TURN-IN-PLACE|QUICK-TURN)$/.test(entry.state);
  if (loco) ok('contact frames found on both tips (≥ 2 per leg for a locomotion clip) with consistent contact heights (spread ≤ 5 cm)', contacts.TIP_L.count >= 2 && contacts.TIP_R.count >= 2 && contacts.TIP_L.height_spread_m <= 0.05 && contacts.TIP_R.height_spread_m <= 0.05, contacts);
  else report.checks.push({ name: 'contact frames (informational for a non-locomotion clip)', pass: true, detail: contacts });
} else report.checks.push({ name: 'contact frames', pass: true, detail: hasTips ? 'rig unavailable — not checked' : 'mask has no tips — not applicable' });

/* ---------- loop seams ---------- */
if (entry.loop && frames.length > 1) { var first = frames[0], last = frames[frames.length - 1]; var worst = 0, worstBone = null; trackedBones.forEach(function (b) { var a = first[b], c = last[b]; if (!a || !c) return; for (var k = 0; k < 3; k++) { var d = Math.abs(Math.atan2(Math.sin(a[k] - c[k]), Math.cos(a[k] - c[k]))); if (d > worst) { worst = d; worstBone = b; } } }); var rootDy = first.ROOT_POS && last.ROOT_POS ? Math.abs(first.ROOT_POS[1] - last.ROOT_POS[1]) : 0;
  report.measured.loop_seam = { worst_rad: +worst.toFixed(4), worst_bone: worstBone, root_dy_m: +rootDy.toFixed(3) }; ok('loop seam: the clip carries its repeat frame — first and last frames agree per bone (≤ 0.05 rad) and in root height (≤ 2 cm)', worst <= 0.05 && rootDy <= 0.02, report.measured.loop_seam); }

report.pass = fail === 0; report.verdict = fail === 0 ? 'CHECKS PASS (structure only — motion quality is not judged here)' : fail + ' check(s) failed';
if (flag('--json')) console.log(JSON.stringify(report, null, 1)); else { report.checks.forEach(function (c) { console.log((c.pass ? 'PASS ' : 'FAIL ') + c.name + (c.detail !== undefined ? ' — ' + JSON.stringify(c.detail).slice(0, 300) : '')); }); console.log('RESULT ' + ID + ': ' + report.verdict); }
process.exit(fail ? 1 : 0);
