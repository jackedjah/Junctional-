/* JOB A — IMPACT FRAMES / ATTACK TEMPO AUDIT (owner 2026-09-18 §16: preparation → commitment → contact / release → brief finish → recovery,
   readable, never rushed, never so slow that controls feel delayed). MEASURED from the data the runtime actually uses — the ruleset's
   base startup / recovery per skill scaled by the class phase multipliers (RulesMath scaledStartup / scaledRecovery, the same functions
   the field runs) and the animator's authored sub-phase split of each host phase (RigAnimator §5: STARTUP progress → LOAD reached at
   p 0.55 then held with a breathing overshoot until the host commits; RECOVERY progress → WHIP to the force arc by p 0.25, the
   force arc HELD to p 0.45, the follow-through fading from p 0.45 to 1.0 — the 2026-09-20 impact-frame hold; before it the hold was p 0.25–0.30 = 1–3 frames). Nothing here changes a number: it prints the table and flags what a reviewer should look at.
   node deploy/joba/audit_attack_tempo.mjs [class] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { loadRuleset, profileOf, scaledStartup, scaledRecovery } from '../../play/rules1723/RulesMath.js';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.resolve(HERE, '..', '..'); var OUT = path.join(HERE, '..', 'probe_out', 'joba'); fs.mkdirSync(OUT, { recursive: true });
var CLASS = (process.argv[2] || 'ATHLETE').toUpperCase();
var rules = loadRuleset(); var prof = profileOf(rules, CLASS); var T = rules.timing_and_effects || {};
var FRAME = 1 / 60; var READ_MIN_S = 0.20;   /* a phase a viewer can read at normal speed: ≥ 12 frames at 60 Hz (a reviewer threshold, not canon) */
var rows = (rules.skills || []).filter(function (s) { return (s.classes || []).indexOf(CLASS) >= 0 || /^ATHLETE_/.test(s.id) && CLASS === 'ATHLETE'; }).map(function (s) {
  var su = scaledStartup(rules, s, prof), rc = scaledRecovery(rules, s, prof); var load = su * 0.55, hold = su - load; var whip = rc * 0.25, finish = rc * 0.45 - whip, recover = rc - rc * 0.45;
  return { id: s.id, name: s.draft_name, category: s.category, pattern: s.movement_pattern || (s.effect && s.effect.type), base_startup_s: s.base_startup_seconds, base_recovery_s: s.base_recovery_seconds, startup_s: +su.toFixed(3), recovery_s: +rc.toFixed(3), total_s: +(su + rc).toFixed(3), cooldown_s: s.cooldown_seconds,
    animator: { preparation_load_s: +load.toFixed(3), loaded_hold_s: +hold.toFixed(3), commit_whip_s: +whip.toFixed(3), contact_finish_s: +Math.max(0, finish).toFixed(3), recovery_s: +recover.toFixed(3) },
    frames_60hz: { startup: Math.round(su / FRAME), recovery: Math.round(rc / FRAME) },
    flags: [].concat(su < READ_MIN_S ? ['STARTUP_UNDER_' + READ_MIN_S + 's'] : [], rc < READ_MIN_S ? ['RECOVERY_UNDER_' + READ_MIN_S + 's'] : [], (su + rc) > 1.6 ? ['LONG_TOTAL_' + (su + rc).toFixed(2) + 's'] : [], su <= (T.startup_floor_seconds || 0.12) + 1e-9 ? ['AT_STARTUP_FLOOR'] : []) };
});
var summary = { class: CLASS, phase_multipliers: prof.phase_multipliers || prof.phase_multiplier || null, startup_floor_s: T.startup_floor_seconds, recovery_floor_s: T.recovery_floor_seconds, read_min_s: READ_MIN_S, skills: rows.length, flagged: rows.filter(function (r) { return r.flags.length; }).map(function (r) { return r.id + ': ' + r.flags.join(', '); }) };
console.log('ATTACK TEMPO AUDIT — ' + CLASS + ' (host phases scaled by the class multipliers; animator sub-phases as authored)');
console.log(['id', 'category', 'pattern', 'startup', 'recovery', 'total', 'load', 'hold', 'whip', 'finish', 'recover', 'flags'].join('\t'));
rows.forEach(function (r) { console.log([r.id, r.category, r.pattern, r.startup_s, r.recovery_s, r.total_s, r.animator.preparation_load_s, r.animator.loaded_hold_s, r.animator.commit_whip_s, r.animator.contact_finish_s, r.animator.recovery_s, r.flags.join('|') || '-'].join('\t')); });
console.log(JSON.stringify(summary));
fs.writeFileSync(path.join(OUT, 'attack_tempo_' + CLASS + '.json'), JSON.stringify({ summary: summary, rows: rows }, null, 1));
