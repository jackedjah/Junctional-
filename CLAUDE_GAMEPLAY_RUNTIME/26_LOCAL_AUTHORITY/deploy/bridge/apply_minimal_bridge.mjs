/* MAHWORLD :: MINIMAL RUNTIME BRIDGE (M10). The public recovery branch carries CLAUDE_GAMEPLAY_RUNTIME/ only; its host bootstrap, the static
   build and 32 test programs also need exactly TEN small files from three sibling roots that live only in the owner's archive. This script
   copies ONLY those ten (category A in 25_HANDOFF/CONVERGENCE/world_pivot/RUNTIME_BRIDGE_MANIFEST.md), refuses anything that is not plain
   runtime source / config, and can commit + push them in one step. Nothing in --from is ever written.

   The ten files are the host closure the static build already traced with a resolve / fs hook (deploy/build_static_demo.mjs HOST_MODULES /
   HOST_JSON): 4 JS modules + 6 JSON configs. No meshes, no textures, no RAW_* masters, no documents.

   Run it from the root of a local clone of the repository (on backup/mahworld-m6-20260924T190351Z, after `git pull`):
     node CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/deploy/bridge/apply_minimal_bridge.mjs --from "<folder that contains CLAUDE_RUNTIME_FOUNDATION>" --push
   --from   the archive folder holding CLAUDE_RUNTIME_FOUNDATION/, CLAUDE_DUAL_LOCOMOTION/, CLAUDE_GAMEPLAY_FOUNDATION/ (e.g. MAHWORLD_CHARACTERS)
   --push   commit the ten files and push the branch (without it the files are only copied and listed; nothing is committed)
   --dry-run  check and list, copy nothing
   Checks per file (any failure stops everything, nothing is copied): present · ≤ 1 MB · text, no NUL bytes · JSON parses · no secret VALUES
   (key / token / password assignments, private keys, GitHub / AWS / OpenAI tokens, JWTs such as Supabase keys) · no private absolute paths (C:\Users\…, /Users/…, /home/…) · every relative import of the
   four JS modules resolves inside the ten files or the repository (if a module needs anything else it is NAMED and the run stops — never
   guessed). Requires Node 18+. */
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

export var BRIDGE_FILES = [
  'CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/jsonSource.js',
  'CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/ClassIdentityConfig.js',
  'CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/characterRegistry.js',
  'CLAUDE_RUNTIME_FOUNDATION/12_ANIMATION_RUNTIME/AnimationStateController.js',
  'CLAUDE_RUNTIME_FOUNDATION/01_CHARACTER_MANIFEST/CHARACTER_MASTER_MANIFEST.json',
  'CLAUDE_RUNTIME_FOUNDATION/02_MATERIAL_CONTRACT/material_zones.json',
  'CLAUDE_RUNTIME_FOUNDATION/03_CHARACTER_CREATOR/CHARACTER_VARIANT_SCHEMA.json',
  'CLAUDE_RUNTIME_FOUNDATION/05_ANIMATION_CONTRACT/animation_set.json',
  'CLAUDE_DUAL_LOCOMOTION/15_RUNTIME_DESIGN/config/runtime_config.default.json',
  'CLAUDE_GAMEPLAY_FOUNDATION/02_MOVEMENT/PLAYER_MOVEMENT_DEFAULTS.json'
];
var BRANCH = 'backup/mahworld-m6-20260924T190351Z', MAX_BYTES = 1 << 20;
var SECRET = /((api[_-]?key|secret|passw(or)?d|access[_-]?token|auth[_-]?token|service[_-]?role)["']?\s*[:=]\s*["'][^"'\s]{8,}["']|bearer\s+[a-z0-9._-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk-[A-Za-z0-9]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bAKIA[0-9A-Z]{16}\b|\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.)/i;   /* a key / token VALUE, not the bare word */
var PRIVATE_PATH = /([A-Za-z]:\\Users\\|\/Users\/[^\/\s'"]+\/|\/home\/[^\/\s'"]+\/)/;

function main() {
  var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; } var has = function (k) { return argv.indexOf(k) >= 0; };
  var FROM = arg('--from', null), PUSH = has('--push'), DRY = has('--dry-run');
  var REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
  if (!FROM) { console.error('usage: node ' + path.relative(process.cwd(), fileURLToPath(import.meta.url)) + ' --from "<archive folder containing CLAUDE_RUNTIME_FOUNDATION>" [--push] [--dry-run]'); process.exit(2); }
  FROM = path.resolve(FROM); if (!fs.existsSync(path.join(FROM, 'CLAUDE_RUNTIME_FOUNDATION'))) { console.error('--from must contain CLAUDE_RUNTIME_FOUNDATION/ (not found under ' + FROM + ')'); process.exit(2); }
  if (!fs.existsSync(path.join(REPO, 'CLAUDE_GAMEPLAY_RUNTIME', '00_CORE', 'bootstrap.js'))) { console.error('run this from a clone of the repository (repo root not found at ' + REPO + ')'); process.exit(2); }
  var problems = [], rows = [];
  BRIDGE_FILES.forEach(function (rel) {
    var src = path.join(FROM, rel); if (!fs.existsSync(src)) { problems.push('MISSING in the archive: ' + rel); return; }
    var st = fs.statSync(src); if (!st.isFile()) { problems.push('not a file: ' + rel); return; } if (st.size > MAX_BYTES) { problems.push('too large (' + st.size + ' B > 1 MB): ' + rel); return; }
    var buf = fs.readFileSync(src); if (buf.includes(0)) { problems.push('binary content (NUL bytes): ' + rel); return; } var text = buf.toString('utf8');
    if (/\.json$/.test(rel)) { try { JSON.parse(text); } catch (e) { problems.push('JSON does not parse: ' + rel + ' (' + e.message + ')'); } }
    var sm = SECRET.exec(text); if (sm) problems.push('secret-like text in ' + rel + ': "' + sm[0].slice(0, 40) + '" — review by hand, never upload secrets');
    var pm = PRIVATE_PATH.exec(text); if (pm) problems.push('private absolute path in ' + rel + ': "' + pm[0] + '" — remove it or tell Claude which file');
    if (/\.m?js$/.test(rel)) { var re = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|export\s[^'"]*?from\s*|require\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g, m;
      while ((m = re.exec(text))) { var tgtAbs = path.resolve(path.dirname(src), m[1]); var tgtRel = path.relative(FROM, tgtAbs).split(path.sep).join('/');
        var ok = BRIDGE_FILES.indexOf(tgtRel) >= 0 || fs.existsSync(path.join(REPO, tgtRel)); if (!ok) problems.push(rel + ' imports ' + m[1] + ' → ' + tgtRel + ' which is NOT in the ten files — stop: tell Claude this path (it will be classified before anything else is added)'); } }
    rows.push({ rel: rel, bytes: st.size });
  });
  console.log('MAHWORLD minimal runtime bridge — ' + BRIDGE_FILES.length + ' files from ' + FROM);
  rows.forEach(function (r) { console.log('  ' + (r.bytes + ' B').padStart(9) + '  ' + r.rel); });
  if (problems.length) { console.error('\nSTOPPED — nothing was copied:'); problems.forEach(function (p) { console.error('  · ' + p); }); process.exit(1); }
  if (DRY) { console.log('\ndry run: all checks passed, nothing copied.'); return; }
  rows.forEach(function (r) { var dst = path.join(REPO, r.rel); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(path.join(FROM, r.rel), dst); });
  console.log('\ncopied ' + rows.length + ' files into ' + REPO);
  if (!PUSH) { console.log('not committed (add --push to commit and push them).'); return; }
  function git(args) { var r = spawnSync('git', args, { cwd: REPO, stdio: 'inherit' }); if (r.status !== 0) { console.error('git ' + args.join(' ') + ' failed'); process.exit(1); } }
  var cur = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).stdout.trim(); if (cur !== BRANCH) { console.error('the clone is on ' + cur + ', not ' + BRANCH + ' — run: git checkout ' + BRANCH); process.exit(1); }
  git(['add', '--'].concat(BRIDGE_FILES)); git(['commit', '-m', 'Runtime bridge: the ten public-safe host files (minimal manifest, M10)', '--'].concat(BRIDGE_FILES)); git(['push', 'origin', BRANCH]);
  console.log('\npushed. Claude will pick it up from the branch.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
