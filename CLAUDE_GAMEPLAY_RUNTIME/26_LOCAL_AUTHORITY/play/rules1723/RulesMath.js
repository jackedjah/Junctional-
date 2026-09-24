/* MAHWORLD :: RULES 17–23 — pure math (no state). Ruleset MW_DEV_2026_09_14_R17_23_V0_1 mapped for the development field.
   Every factor is applied ONCE: raw budget → class potency (per category) → periodic specialization (periodic only) → component split →
   guard (per component, frontal cone) → ordinary resistance (per component) → HP. Healing never passes through resistance. */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url));
export function loadRuleset(file) { var p = file || path.join(HERE, 'rules_17_23.dev.json'); var raw = fs.readFileSync(p, 'utf8'); var d = JSON.parse(raw); d._loaded_sha256 = sha256(raw); var SC = d.resources && d.resources.scale; if (SC && !d._scaled) { d._scaled = true; Object.keys(d.class_profiles || {}).forEach(function (k) { var pr = d.class_profiles[k]; pr.max_health_base = pr.max_health; pr.combat_energy_capacity_base = pr.combat_energy_capacity; pr.max_health = Math.round(pr.max_health * (SC.health || 1)); pr.combat_energy_capacity = Math.round(pr.combat_energy_capacity * (SC.combat_energy || 1)); }); }   /* owner B8 §9: ×2 maxima from data; the PLAYER pools' passive regen is switched off at pool creation (RulesField.poolFor) — synthetics / NPC fixtures keep their data regen (they have no refill sources) */ d._skills_by_id = {}; d.skills.forEach(function (s) { d._skills_by_id[s.id] = s; }); var problems = validateStacks(d); if (problems.length) throw new Error('rules_17_23 attack-stack table invalid: ' + problems.slice(0, 5).join('; ')); return d; }   /* class-scoped stack / presentation validation is enforced at load */
function sha256(s) { var c = null; try { c = globalThis.crypto && globalThis.crypto.subtle ? null : null; } catch (e) { c = null; } return hashFallback(s); }
function hashFallback(s) { var h1 = 0x811c9dc5 >>> 0, h2 = 0x01000193; for (var i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, h2) >>> 0; } return ('00000000' + h1.toString(16)).slice(-8) + '-fnv1a-' + s.length; }
export function resolveClass(rules, id) { var m = rules._runtime_mapping; if (!id) return null; var u = String(id).toUpperCase(); if (m.class_ids[u]) return m.class_ids[u]; return m.class_aliases[u] || null; }
export function profileOf(rules, classId) { return rules.class_profiles[classId] || null; }
export function unitsToM(rules, u) { return u * rules._runtime_mapping.melee_unit_m; }
/* timing: startup / recovery scaled by class multipliers, clamped; cooldowns, ticks, lifetimes and deadlines are NEVER scaled */
export function scaledStartup(rules, skill, profile) { var t = rules.timing_and_effects; return Math.min(t.startup_cap_seconds, Math.max(t.startup_floor_seconds, skill.base_startup_seconds * profile.startup_duration_multiplier)); }
export function scaledRecovery(rules, skill, profile) { var t = rules.timing_and_effects; if (skill.base_recovery_seconds === 0) return 0; return Math.max(t.recovery_floor_seconds, skill.base_recovery_seconds * profile.recovery_duration_multiplier); }
export function fizzleCooldown(rules, skill) { return Math.max(0.5, rules.resources.precommit_interrupt_consumed_fraction * skill.cooldown_seconds); }
/* damage composition — returns the applied amount and the audit trail */
export function composeDamage(rules, o) {
  var skill = o.skill, potency = o.attacker_profile.potency_index[skill.category]; var weights = (skill.effect && skill.effect.component_weights) || rules.damage.default_component_weights[skill.category];
  var raw = o.raw !== undefined ? o.raw : skill.effect.raw_damage; var periodic = !!o.periodic; var scaled = raw * potency / 100 * (periodic ? (o.attacker_profile.periodic_damage_multiplier || 1) : 1) * (o.extra_multiplier || 1);
  var phys = scaled * weights.physical, mag = scaled * weights.magical; var g = o.guard, G = rules.guard; var guardApplies = !!(g && o.in_guard_cone !== false);
  if (guardApplies && !periodic) { if (g === 'PHYSICAL') { phys *= 1 - G.PHYSICAL.physical_reduction; mag *= 1 - G.PHYSICAL.magical_reduction; } else if (g === 'MAGICAL') { phys *= 1 - G.MAGICAL.physical_reduction; mag *= 1 - G.MAGICAL.magical_reduction; } }
  var afterGuard = phys + mag; var tp = o.target_profile; var pr = tp ? tp.physical_damage_reduction : 0, mr = tp ? tp.magical_damage_reduction : 0; var applied = phys * (1 - pr) + mag * (1 - mr);
  return { raw: raw, potency: potency, scaled: +scaled.toFixed(4), components: { physical: +(scaled * weights.physical).toFixed(4), magical: +(scaled * weights.magical).toFixed(4) }, guard: guardApplies ? g : null, after_guard: +afterGuard.toFixed(4), resistance: { physical: pr, magical: mr }, applied: +applied.toFixed(4), periodic: periodic };
}
export function healAmount(rules, skill, profile, missing) { var base = skill.effect.base_heal * profile.potency_index.SPECIAL_MAGIC / 100; return Math.max(0, Math.min(base, missing)); }
export function dashProfile(rules, profile) { return profile.combat_dash; }
export function inCone(facing, from, to, coneDeg) { var dx = to.x - from.x, dz = to.z - from.z; var d = Math.hypot(dx, dz); if (d < 1e-6) return true; var fx = Math.sin(facing), fz = -Math.cos(facing); var cos = (fx * dx + fz * dz) / d; return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI <= coneDeg / 2; }
export function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
export function slowFactor(rules, slows) { if (!slows.length) return 1; var strongest = Math.max.apply(null, slows); return Math.max(rules.status_rules.slow.minimum_remaining_movement_fraction, 1 - strongest); }

/* ---------------- attack modes / progression bands / attack stacks (additive foundation, 2026-09-14) ----------------
   The legacy category ids (PHYSICAL / PHYSICAL_MAGIC / SPECIAL_MAGIC) remain the SERIALIZED ids in journals, snapshots and RULES_SELECT.category;
   the owner's three attack modes (PHYSICAL / PHYSICAL_MAHGIC / SPECIAL_MAHGIC) are applied by this one compatibility adapter. */
export function modeOfCategory(rules, cat) { var m = rules._runtime_mapping.attack_modes; return m ? (m.mode_by_legacy_category[cat] || null) : cat; }
export function categoryOfMode(rules, mode) { var m = rules._runtime_mapping.attack_modes; if (!m) return mode; if (m.legacy_category_by_mode[mode]) return m.legacy_category_by_mode[mode]; if (m.mode_by_legacy_category[mode]) return mode; return null; }
export function modeLabel(rules, mode) { var m = rules._runtime_mapping.attack_modes; return m && m.labels[mode] ? m.labels[mode] : mode; }
export function attackModes(rules) { var m = rules._runtime_mapping.attack_modes; return m ? m.canonical.map(function (id) { return { id: id, label: m.labels[id], category: m.legacy_category_by_mode[id] }; }) : rules.attack_categories.map(function (c) { return { id: c, label: c, category: c }; }); }
export function bandForLevel(rules, level) { var b = rules._runtime_mapping.progression_bands; var lv = Number.isFinite(level) ? level : 1; return lv <= b.foundation_max_level ? 'FOUNDATION_PROTOCOL' : 'CLASS_DEVELOPMENT'; }
export function bandUnlocked(rules, band, level) { var b = rules._runtime_mapping.progression_bands; var lv = Number.isFinite(level) ? level : 1; return lv >= (b.band_min_level[band] || 1); }
export function patternIdOf(rules, skill) { var m = rules._runtime_mapping; if (!skill || !skill.movement_pattern) return 'UNASSIGNED_PATTERN_DEV'; return m.pattern_ids[skill.movement_pattern] || 'UNASSIGNED_PATTERN_DEV'; }
export function patternName(rules, id) { var p = rules._runtime_mapping.attack_stacks && rules._runtime_mapping.attack_stacks.movement_pattern_ids[id]; return p ? p.name : id; }
export function patternLabel(rules, id) { var p = rules._runtime_mapping.attack_stacks && rules._runtime_mapping.attack_stacks.movement_pattern_ids[id]; return p && p.hud_label ? p.hud_label : (p ? p.name : id); }   /* the authored short form for the small attack buttons (G20: never a sliced name) */
function stackIndex(rules) { if (rules._stack_index) return rules._stack_index; var AS = rules._runtime_mapping.attack_stacks; var idx = { byId: {}, byKey: {} }; if (AS) AS.bindings.forEach(function (b) { idx.byId[b.attack_stack_id] = b; var k = b.class + '|' + b.category + '|' + b.movement_pattern_id + '|' + b.progression_band; (idx.byKey[k] = idx.byKey[k] || []).push(b); }); rules._stack_index = idx; return idx; }
/* resolveStack: frozen ruleset + class + (specialization: none yet) + level band + mode/category + movement_pattern_id + equipped stack entry → skill_id + attack_stack_id + presentation_profile_id.
   NEVER falls back into another class or attack mode; a missing / disabled / band-locked binding is ATTACK_STACK_NOT_AVAILABLE with a deterministic `why`. */
export function resolveStack(rules, q) {
  var fail = function (why, extra) { return Object.assign({ ok: false, reason: 'ATTACK_STACK_NOT_AVAILABLE', why: why }, extra || {}); };
  var AS = rules._runtime_mapping.attack_stacks; if (!AS) return fail('NO_STACK_TABLE');
  var cat = q.category || categoryOfMode(rules, q.mode); if (!cat || rules.attack_categories.indexOf(cat) < 0) return fail('BAD_MODE');
  var cls = resolveClass(rules, q.classId); if (!cls) return fail('UNKNOWN_CLASS');
  var level = Number.isFinite(q.level) ? q.level : 1; var idx = stackIndex(rules); var b = null;
  if (q.equipped_stack_id) { b = idx.byId[q.equipped_stack_id]; if (!b) return fail('NO_SUCH_STACK'); if (b.class !== cls) return fail('WRONG_CLASS', { stack_class: b.class }); if (b.category !== cat) return fail('WRONG_MODE', { stack_category: b.category }); if (q.movement_pattern_id && b.movement_pattern_id !== q.movement_pattern_id) return fail('WRONG_PATTERN'); if (q.skill_id && b.skill_id !== q.skill_id) return fail('WRONG_SKILL'); if (!b.runtime_enabled) return fail('NOT_RUNTIME_ENABLED'); if (!bandUnlocked(rules, b.progression_band, level)) return fail('BAND_LOCKED', { band: b.progression_band, level: level }); }
  else { var list = (idx.byKey[cls + '|' + cat + '|' + q.movement_pattern_id + '|' + AS.default_equipped_band] || []).filter(function (x) { return x.runtime_enabled && (!q.skill_id || x.skill_id === q.skill_id) && bandUnlocked(rules, x.progression_band, level); }); if (!list.length) return fail('NO_BINDING', { class: cls, category: cat, movement_pattern_id: q.movement_pattern_id || null, skill_id: q.skill_id || null }); b = list[0]; }
  var pp = (rules._runtime_mapping.presentation_profiles || {})[b.presentation_profile_id]; if (!pp || pp.class !== cls) return fail('NO_PRESENTATION_PROFILE');
  return { ok: true, binding: b, presentation: pp, band_now: bandForLevel(rules, level), level: level };
}
/* validateStacks: every binding is class-scoped and complete; a movement shared by several classes resolves to DIFFERENT class-scoped stack + presentation ids; future concepts are never runtime-enabled nor bound. */
export function validateStacks(rules) {
  var P = []; var M = rules._runtime_mapping; var AS = M.attack_stacks; var AM = M.attack_modes; if (!AS || !AM) return ['NO_STACK_TABLE'];
  if (AM.canonical.length !== 3) P.push('MODES_NOT_THREE'); AM.canonical.forEach(function (m) { if (!AM.legacy_category_by_mode[m] || rules.attack_categories.indexOf(AM.legacy_category_by_mode[m]) < 0) P.push('MODE_UNMAPPED ' + m); });
  if (Object.keys(M.class_ids).length !== 5) P.push('CLASSES_NOT_FIVE');
  var ids = {}; var byPatternSkill = {}; var byClassKey = {};
  AS.bindings.forEach(function (b) {
    if (ids[b.attack_stack_id]) P.push('DUPLICATE_STACK_ID ' + b.attack_stack_id); ids[b.attack_stack_id] = true;
    if (!M.class_ids[b.class]) P.push('BAD_CLASS ' + b.attack_stack_id); if (rules.attack_categories.indexOf(b.category) < 0) P.push('BAD_CATEGORY ' + b.attack_stack_id); if (AM.mode_by_legacy_category[b.category] !== b.mode) P.push('MODE_CATEGORY_MISMATCH ' + b.attack_stack_id);
    var s = rules._skills_by_id[b.skill_id]; if (!s) P.push('NO_SKILL ' + b.attack_stack_id); else { if (s.classes.indexOf(b.class) < 0) P.push('SKILL_NOT_FOR_CLASS ' + b.attack_stack_id); if (s.category !== b.category) P.push('SKILL_CATEGORY_MISMATCH ' + b.attack_stack_id); if (patternIdOf(rules, s) !== b.movement_pattern_id) P.push('PATTERN_MISMATCH ' + b.attack_stack_id); }
    if (!AS.movement_pattern_ids[b.movement_pattern_id]) P.push('UNKNOWN_PATTERN ' + b.attack_stack_id); if (M.progression_bands.bands.indexOf(b.progression_band) < 0) P.push('BAD_BAND ' + b.attack_stack_id);
    var pp = (M.presentation_profiles || {})[b.presentation_profile_id]; if (!pp) P.push('NO_PROFILE ' + b.attack_stack_id); else if (pp.class !== b.class) P.push('PROFILE_CLASS_MISMATCH ' + b.attack_stack_id);
    var k = b.movement_pattern_id + '|' + b.skill_id + '|' + b.progression_band; (byPatternSkill[k] = byPatternSkill[k] || []).push(b);
    var ck = b.class + '|' + b.category + '|' + b.movement_pattern_id + '|' + b.progression_band + '|' + b.skill_id; if (byClassKey[ck] && !b.fixture) P.push('DUPLICATE_CLASS_BINDING ' + ck); byClassKey[ck] = true;
  });
  Object.keys(byPatternSkill).forEach(function (k) { var list = byPatternSkill[k]; if (list.length < 2) return; var sids = {}, pids = {}; list.forEach(function (b) { sids[b.attack_stack_id] = true; pids[b.presentation_profile_id] = true; }); if (Object.keys(sids).length !== list.length) P.push('SHARED_MOVEMENT_STACK_NOT_CLASS_SCOPED ' + k); if (Object.keys(pids).length !== list.length) P.push('SHARED_MOVEMENT_PRESENTATION_NOT_CLASS_SCOPED ' + k); });
  (AS.future_concepts || []).forEach(function (f) { if (f.runtime_enabled) P.push('FUTURE_CONCEPT_ENABLED ' + f.concept_id); if (AS.bindings.some(function (b) { return b.movement_pattern_id === f.movement_pattern_id && b.class === f.class; })) P.push('FUTURE_CONCEPT_BOUND ' + f.concept_id); });
  rules.skills.forEach(function (s) { if (patternIdOf(rules, s) === 'UNASSIGNED_PATTERN_DEV' && AS.unassigned_pattern_dev.indexOf(s.id) < 0) P.push('UNASSIGNED_NOT_REPORTED ' + s.id); s.classes.forEach(function (c) { if (!AS.bindings.some(function (b) { return b.skill_id === s.id && b.class === c && b.progression_band === AS.default_equipped_band; })) P.push('SKILL_WITHOUT_FOUNDATION_BINDING ' + s.id + ' ' + c); }); });
  return P;
}
