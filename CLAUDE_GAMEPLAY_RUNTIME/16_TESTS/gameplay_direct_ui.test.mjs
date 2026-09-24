// S09 §45 — attack key mapping + direct execution, class-colour authority, UI input ownership.
// Static source checks (no browser): the runtime files are plain scripts, so the contracts are asserted on their text and on the host.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadHeadlessData, composeHeadless } from '../00_CORE/bootstrap.js';
import { createDuelHost } from '../26_LOCAL_AUTHORITY/DuelHost.js';
import { makeEnvelope } from '../26_LOCAL_AUTHORITY/Protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.join(HERE, '..', '26_LOCAL_AUTHORITY');
const src = (rel) => fs.readFileSync(path.join(R, rel), 'utf8');
const play = src('lab/play.js'), hud = src('lab/gameHud.js'), rules = src('lab/rulesHud.js'), pa = src('lab/PresentationAdapter.js'), menu = src('lab/gameMenu.js'), beam = src('lab/BeamFx.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// ---- attack key mapping: E/R/T/Y → slots 0..3, DIRECT (no arming), TAB emotes, Q menu, nothing else on those keys
for (const [k, s] of [['KeyE', 0], ['KeyR', 1], ['KeyT', 2], ['KeyY', 3]]) {
  ok(play.includes(`case '${k}': directAttack(${s}, 'key'); break;`), `${k} → directAttack(${s})`);
  ok((play.match(new RegExp(`case '${k}'`, 'g')) || []).length === 1, `${k} bound exactly once`);
}
ok(/case 'Tab': e\.preventDefault\(\); if \(hud\.toggleEmotes\) hud\.toggleEmotes\(\)/.test(play), 'TAB = emotes');
ok(/case 'KeyQ': e\.preventDefault\(\); menu\.toggle\(\)/.test(play), 'Q = universal menu');
ok(!/case 'KeyQ': dashFromInput/.test(play) && /case 'KeyB': dashFromInput/.test(play), 'dash moved off Q');
ok(!/case 'Tab'[^\n]*aim/i.test(rules) && /BracketRight/.test(rules), 'rulesHud no longer consumes Tab for aim-cycle');
// S13: H = separate / fuse (was U, was T); G / Shift+G = the two guards; every label says so; no stale transform key survives
ok(play.includes("case 'KeyH': send('TRANSFORM'); break;") && (play.match(/case 'KeyH'/g) || []).length === 1, 'H = separate / fuse, bound once');
ok(!/case 'KeyU': send\('TRANSFORM'/.test(play) && !/case 'KeyT': send\('TRANSFORM'/.test(play) && !/case 'KeyU'/.test(play), 'no stale transform key (U / T)');
ok(/case 'KeyG': toggleGuard\(e\.shiftKey \? 'MAGICAL' : 'PHYSICAL'\)/.test(play) && !/case 'KeyH': toggleGuard/.test(play), 'G = physical guard, Shift+G = magic guard');
ok(/SEPARATE \/ FUSE · H/.test(play) && /SEPARATE<small class="key">H<\/small>/.test(hud) && /'<small>H' \+/.test(hud) && !/<small>T<\/small>/.test(hud) && /H separates \/ fuses/.test(hud) && !/T separates/.test(hud), 'labels say H (controls table, MORE button, guide)');
// direct execution: ONE request RULES_CAST {skill_id}; empty slot refuses locally; never arms
ok(/castSlot: function \(slot\)[^\n]*send\('RULES_CAST', p\)/.test(rules), 'castSlot sends one RULES_CAST');
ok(/if \(!sk\) return Promise\.resolve\(\{ accepted: false, reason: 'EMPTY_SLOT'/.test(rules), 'empty slot → EMPTY_SLOT locally');
ok(/var p = \{ skill_id: sk\.id \}/.test(rules), 'RULES_CAST carries skill_id');
ok(!/castSlot[^\n]*state\.selected\s*=/.test(rules), 'castSlot never mutates the armed selection');
ok(/async function directAttack\(slot, source, dir\)/.test(play) && /rulesHud\.castSlot\(slot\)/.test(play), 'directAttack → castSlot');
ok(/NO ATTACK ' \+ \(slot \+ 1\) \+ ' IN THIS PATTERN/.test(play), 'empty slot toast, no fallthrough');
// host: RULES_CAST {skill_id} executes THAT skill in one request and leaves the armed selection alone (direct ≠ arming)
{
  const data = await loadHeadlessData(); const DT = data.cfg.dev('local_authority.tick_dt_s');
  const h = createDuelHost({ data, composeHeadless }); h.dev.createAccount('PLAYER_A', { classId: 'ATHLETE', sex: 'M' });
  const c = h.connect({ client_id: 'c-A', account_id: 'PLAYER_A', token: h.dev.tokens().PLAYER_A }); let seq = 0;
  const send = (a, p) => h.submit(makeEnvelope({ session_id: c.session_id, client_id: 'c-A' }, ++seq, a, p || {}));
  const run = (sec) => { for (let i = 0; i < Math.round(sec / DT); i++) h.tick(DT); };
  send('ENTER_ROOM', { room: 'FIELD' }); send('FIELD_PRACTICE', { on: true }); run(0.5);
  const rules = () => { const s = send('MOVE', { forward: 0, strafe: 0 }); return s.rules || h.dev.rulesFor ? (h.dev.rulesFor ? h.dev.rulesFor('PLAYER_A') : null) : null; };
  const snap0 = send('RULES_SELECT', { category: 'PHYSICAL', slot: 0 });
  const list = (snap0 && snap0.skills && snap0.skills.PHYSICAL) || null;
  const view = list || (h.dev.snapshot ? (h.dev.snapshot('PLAYER_A').rules || {}).skills?.PHYSICAL : null);
  ok(snap0 && snap0.accepted !== false, 'arm slot 0 accepted');
  const r2 = send('RULES_CAST', { skill_id: 'PA_PULL' });          /* slot 1 skill of the ATHLETE physical set (see rules_17_23 test) */
  run(1.5);
  ok(r2.accepted === true && r2.skill === 'PA_PULL', 'direct RULES_CAST {skill_id} executes that skill: ' + JSON.stringify({ accepted: r2.accepted, skill: r2.skill, reason: r2.reason }));
  const dup = send('RULES_CAST', { skill_id: 'PA_PULL' }); ok(dup.accepted === true || dup.reason === 'ACTION_IN_PROGRESS' || dup.reason === 'COOLDOWN', 'second direct cast is either performed or refused by lifecycle: ' + dup.reason);
  run(4);
  const r3 = send('RULES_CAST', {}); run(1.5);
  ok(r3.accepted === true && r3.skill !== 'PA_PULL', 'armed selection (slot 0) survived the direct cast: armed cast fired ' + r3.skill);
  const bad = send('RULES_CAST', { skill_id: 'VISIONARY_ANKLE' }); ok(bad.accepted === false, 'off-class skill_id refused');
}
// HUD: chips labelled E/R/T/Y, strip present desktop + touch (4 slots), inactive when empty
ok(/var slotKeys = touch \? \['1', '2', '3', '4'\] : \['E', 'R', 'T', 'Y'\]/.test(hud) && /slotKeys\[i\]/.test(hud), 'chips labelled E R T Y on desktop and 1 2 3 4 on touch (G20: no keyboard letters on touch)');
ok(/qs\.pattern_label \|\| qs\.pattern_name \|\| qs\.name/.test(hud) && !/slice\(0, 9\)/.test(hud), 'the 1–4 / E R T Y labels are the authored short forms (ruleset hud_label), never a sliced name (G20)');
ok(/id="g-erty"/.test(hud) && /g-erty-t/.test(hud), 'direct strip desktop + touch');
ok(/' off'\)/.test(hud) && /disabled/.test(hud), 'empty slot rendered inactive');
ok(/case 'direct-0': case 'direct-1': case 'direct-2': case 'direct-3'/.test(hud), 'touch buttons route to directAttack');

// ---- class-colour authority: ATHLETE gold, one table, no CAT_COLOR anywhere in the renderer
ok(/CLASS_ENERGY\s*=\s*\{[^}]*ATHLETE:\s*0xffc34d/.test(pa), 'ATHLETE energy = gold 0xffc34d');
ok(/function energyOf\(/.test(pa), 'energyOf() authority');
for (const f of ['lab/PresentationAdapter.js', 'lab/play.js', 'lab/BeamFx.js', 'lab/fieldScene.js', 'lab/gameHud.js']) ok(!/CAT_COLOR/.test(src(f)), `no CAT_COLOR in ${f}`);
ok((pa.match(/energyOf\(/g) || []).length >= 8, 'projectile/impact/hand/strike/floor/aura all take energyOf');
ok(/uAuraColor/.test(pa) && /uSeamColor/.test(pa), 'aura + seam uniforms carry the class colour');
ok(/airborne_stream_max_m/.test(beam), 'propulsion: long fading stream when airborne');

// ---- UI input ownership: menu owns keys while open, ESC closes, Q toggles, world input blocked
ok(/menu\.isOpen\(\)/.test(play) && /menu\.update\(p\)/.test(play), 'menu integrated (isOpen/update)');
{
  const i = play.indexOf('menu.isOpen()'), j = play.indexOf("case 'KeyE': directAttack");
  ok(i > 0 && i < j, 'menu ownership check precedes attack keys in keydown');
}
ok(play.includes("if (menu.isOpen()) { if (e.code === 'Escape' || e.code === 'KeyQ') { e.preventDefault(); menu.close('key'); }") && /return; \}\s+\/\* Q MENU OWNS INPUT/.test(play) && /close: function/.test(menu), 'menu owns keys while open; ESC / Q close; nothing leaks to the world');
ok(/mahworld_menu_local/.test(menu) && /LOCAL/.test(menu), 'menu backend labelled local/dev');
for (const t of ['STATS', 'SKILLS', 'INVENTORY', 'MAP', 'FRIENDS', 'DMS']) ok(menu.includes(`'${t}'`), `menu tab ${t}`);

console.log(`RESULT direct-execution / colour authority / UI ownership: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
