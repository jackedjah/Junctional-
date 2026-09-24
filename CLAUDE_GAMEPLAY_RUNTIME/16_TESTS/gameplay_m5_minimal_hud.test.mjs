/* M5 — reversible, persisted minimal/full HUD view preference. */
import fs from 'node:fs';
var root = new URL('../26_LOCAL_AUTHORITY/', import.meta.url);
function read(p) { return fs.readFileSync(new URL(p, root), 'utf8'); }
var hud = read('lab/gameHud.js'), play = read('lab/play.js'), html = read('lab/play.html');
var pass = 0, fail = 0;
function ok(id, cond) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id); } }

ok('M5 HUD preference loads and persists as FULL/MINIMAL without touching gameplay or time state', /localStorage\.getItem\('mahworld-hud-mode'\) === 'MINIMAL'/.test(hud) && /localStorage\.setItem\('mahworld-hud-mode', st\.minimal \? 'MINIMAL' : 'FULL'\)/.test(hud) && /document\.body\.classList\.toggle\('hud-minimal', st\.minimal\)/.test(hud));
ok('M5 HUD mode is accessible from SETTINGS/ACTIONS, the public probe API, and F2', /data-do="hudmode" id="g-hudmode"/.test(hud) && /hudMode: function \(on\)/.test(hud) && /case 'hudmode'/.test(hud) && /case 'F2'/.test(play) && /hud\.hudMode/.test(play));
ok('M5 minimal CSS hides only secondary guide/gear/utility/combat-menu chrome', /body\.hud-minimal #g-mahguide, body\.hud-minimal #g-gear, body\.hud-minimal #g-utils, body\.hud-minimal #g-swordbt, body\.hud-minimal #g-cue \{ display: none !important; \}/.test(html));
ok('M5 minimal CSS retains vitals, state, warnings, toast, contextual prompt, menu and core attack/guard/form/flight controls', !/hud-minimal[^\n]*(?:#g-vitals|#g-vitals-r|#g-state|#g-warn|#g-toast|#g-ctx|#g-menubt|#g-erty|#g-cluster|#g-fly|#g-guard|#tc-stick|#tc-form)/.test(html));

console.log('RESULT M5 minimal HUD: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
