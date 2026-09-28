/* Full-suite runner (preserved from the M20 session scratch). Runs every CLAUDE_GAMEPLAY_RUNTIME/16_TESTS/*.test.mjs in its own node process,
   prints ok / FAIL per file and a SUMMARY line; logs + tests.json go to $TEST_LOG_DIR (default: <os tmp>/mahworld_test_logs).
   Usage (from anywhere):  node CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/tools/run_all_tests.mjs [RUNTIME_ROOT]
   Pass another checkout's CLAUDE_GAMEPLAY_RUNTIME as RUNTIME_ROOT to test a worktree. Compare the FAIL list with
   known_bridge_blocked_failures.txt (34 files that cannot run until the deferred runtime bridge lands): a change must not add a failure. */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RT = path.resolve(process.argv[2] || path.join(HERE, '..', '..'));
const LOGS = process.env.TEST_LOG_DIR || path.join(os.tmpdir(), 'mahworld_test_logs'); fs.mkdirSync(LOGS, { recursive: true });
const tests = fs.readdirSync(path.join(RT, '16_TESTS')).filter(f => /\.test\.mjs$/.test(f)).sort();
const res = [];
for (const t of tests) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join('16_TESTS', t)], { cwd: RT, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = /(\d+) passed, (\d+) failed/.exec(out);
  const row = { test: t, code: r.status, signal: r.signal, passed: m ? +m[1] : null, failed: m ? +m[2] : null, ms: Date.now() - t0 };
  res.push(row); fs.writeFileSync(path.join(LOGS, t + '.log'), out);
  console.log((r.status === 0 && row.failed === 0 ? 'ok   ' : 'FAIL ') + t + ' — ' + (row.passed ?? '?') + '/' + (row.failed ?? '?') + ' ' + row.ms + 'ms');
}
const ok = res.filter(x => x.code === 0 && x.failed === 0);
console.log(`\nSUMMARY ${res.length} files, ${res.reduce((a, x) => a + (x.passed || 0), 0)} checks passed, ${res.length - ok.length} files failing`);
fs.writeFileSync(path.join(LOGS, 'tests.json'), JSON.stringify(res, null, 1));
