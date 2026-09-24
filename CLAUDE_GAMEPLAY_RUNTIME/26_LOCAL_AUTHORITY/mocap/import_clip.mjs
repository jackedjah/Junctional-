/* MAHWORLD :: MOCAP CLIP IMPORT HELPER (Spec F, PASS 6). node 26_LOCAL_AUTHORITY/mocap/import_clip.mjs <retargeted.glb> --id <clip id> [--out lab/assets/mocap/<id>.json] [--register]
   Input: a GLB exported from Blender AFTER the outside-repo steps (AI mocap → clean-up → retarget onto the Mr. Mah skeleton) whose animation
   targets nodes named with the MAH joint names. Output: the runtime clip JSON the animator consumes ({ meta, frames: [{ BONE: [x, y, z] }] },
   Euler XYZ radians per frame at the clip's own rate, ROOT_POS in metres when present) — the same shape as the S10 donor clips, so
   RigAnimator.setLayer / setDonorClips can play it. Runs the validator first; refuses to write a clip that fails structure. `--register` sets the
   manifest entry's file and status = 'VALIDATED' (never 'CAPTURED': that word is the owner's after the render review).
   Retargeting itself is NOT done here: source rigs differ per tool; the retarget lives in Blender (outside the repo) or, for a three.js path,
   `SkeletonUtils.retargetClip` in the browser with the manifest's bone_map_template — either way this helper only ingests the result. */
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { readClip } from './clip_io.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; } function flag(k) { return argv.indexOf(k) >= 0; }
var FILE = argv[0] && !argv[0].startsWith('--') ? argv[0] : null; var ID = arg('--id', null); if (!FILE || !ID) { console.error('usage: node mocap/import_clip.mjs <retargeted.glb> --id <clip id> [--out p] [--register]'); process.exit(2); }
var MANIFEST = path.join(HERE, '..', 'lab', 'mocap', 'clip_manifest.json'); var OUT = arg('--out', path.join(HERE, '..', 'lab', 'assets', 'mocap', ID + '.json'));
var v = spawnSync(process.execPath, [path.join(HERE, 'validate_clip.mjs'), FILE, '--id', ID, '--json'], { encoding: 'utf8' }); var rep = null; try { rep = JSON.parse(v.stdout); } catch (e) { console.error(v.stdout || v.stderr); process.exit(1); }
if (!rep.pass) { console.error('validator failed — not importing:\n' + rep.checks.filter(function (c) { return !c.pass; }).map(function (c) { return '  ' + c.name + ' — ' + JSON.stringify(c.detail).slice(0, 200); }).join('\n')); process.exit(1); }
var clip = readClip(FILE);
clip.meta = Object.assign({}, clip.meta, { clip: ID, imported: new Date().toISOString(), source_file: path.basename(FILE), validator: rep.verdict, rotation: 'Euler XYZ radians, MAH joint names, identity bind', mask: rep.mask });
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(clip)); console.log('wrote ' + OUT + ' · ' + clip.frames.length + ' frames @ ' + clip.meta.fps + ' fps');
if (flag('--register')) { var m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); var e = m.clips.filter(function (c) { return c.id === ID; })[0]; if (!e) { console.error('no manifest entry ' + ID); process.exit(1); } e.file = path.relative(path.join(HERE, '..'), OUT).replace(/\\/g, '/'); e.status = 'VALIDATED'; e.validated = { at: clip.meta.imported, frames: clip.frames.length, fps: clip.meta.fps, contacts: rep.measured.contacts || null }; fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 1)); console.log('manifest: ' + ID + ' → VALIDATED (CAPTURED is set only after the render review)'); }
