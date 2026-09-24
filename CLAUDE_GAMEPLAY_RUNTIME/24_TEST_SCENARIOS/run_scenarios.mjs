/* node 24_TEST_SCENARIOS/run_scenarios.mjs [SCENARIO_ID] [--json out.json]   — deterministic headless scenarios (no GPU / DOM / Blender) */
import fs from 'node:fs';
import { SCENARIOS, runScenario } from './scenarios.js';
var args = process.argv.slice(2); var only = args.filter(function (a) { return /^SCENARIO_/.test(a); }); var jsonAt = args.indexOf('--json'); var out = [];
for (var i = 0; i < SCENARIOS.length; i++) { var s = SCENARIOS[i]; if (only.length && only.indexOf(s.id) < 0) continue; var r = await runScenario(s.id); out.push(r); console.log((r.ok ? 'PASS ' : 'FAIL ') + r.id + ' — ' + r.title); r.checks.forEach(function (c) { console.log('  ' + (c.ok ? 'ok   ' : 'FAIL ') + c.id + (c.ok ? '' : ' — ' + JSON.stringify(c.detail))); }); }
if (jsonAt >= 0) fs.writeFileSync(args[jsonAt + 1], JSON.stringify(out, null, 1));
var failed = out.filter(function (r) { return !r.ok; }).length; console.log('\n' + (out.length - failed) + ' scenarios passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
