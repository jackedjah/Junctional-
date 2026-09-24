/* MAHWORLD GAMEPLAY RUNTIME :: ATTACK DATA MODEL + MOVEMENT-PATTERN SYSTEM
   Structured attack definitions (attack_id, class_id, movement_pattern, exercise, range_type, attack_tier, required_form, phases,
   targeting, cooldown, resource_cost, damage_profile, manifestation_profile, tags) validated on load; a generic pattern system that
   selects a pattern and resolves (pattern + direction/tier + form) to an attack from the DATA-DRIVEN class loadout. No final roster,
   no class decisions in code, no numbers (keys only; resolved through cfg).

       var kit = createCombatKit(cfg, { attacks, loadouts, classId: 'ATHLETE', capabilities, bus });
       kit.selectPattern('VERTICAL_PULL'); kit.resolve('HOLD', 'FUSED') -> attack def | null */
export var TIERS = ['BASIC', 'SKILL', 'SPECIAL', 'BUFF_UTILITY']; export var RANGES = ['CONTACT', 'MID_RANGE', 'LONG_RANGE']; export var FORMS = ['FUSED', 'SPLIT', 'EITHER']; export var PHASES = ['CONCENTRIC', 'PEAK_TRANSITION', 'ECCENTRIC'];

export function validateAttack(a, cfg) {
  var e = []; ['attack_id', 'class_id', 'movement_pattern', 'exercise', 'range_type', 'attack_tier', 'required_form', 'phases', 'targeting', 'cooldown_key', 'damage_profile', 'tags'].forEach(function (k) { if (!(k in a)) e.push(a.attack_id + ': missing ' + k); });
  if (TIERS.indexOf(a.attack_tier) < 0) e.push(a.attack_id + ': bad tier'); if (RANGES.indexOf(a.range_type) < 0) e.push(a.attack_id + ': bad range'); if (FORMS.indexOf(a.required_form) < 0) e.push(a.attack_id + ': bad form');
  if (!Array.isArray(a.phases) || !a.phases.length) e.push(a.attack_id + ': no phases');
  else { var order = a.phases.map(function (p) { return PHASES.indexOf(p.phase); }); if (order.some(function (x) { return x < 0; })) e.push(a.attack_id + ': bad phase'); if (order.some(function (x, i) { return i && x <= order[i - 1]; })) e.push(a.attack_id + ': phases out of order'); }
  var ecc = a.phases.some(function (p) { return p.phase === 'ECCENTRIC'; });
  if (ecc && a.range_type !== 'LONG_RANGE') e.push(a.attack_id + ': eccentric phase only on LONG_RANGE manifestation attacks (canon)');
  if (ecc && (!a.damage_profile.eccentric_tick_key || !a.damage_profile.eccentric_duration_key)) e.push(a.attack_id + ': eccentric needs tick + duration keys');
  if (ecc && a.tags.indexOf('ECCENTRIC_PHASE') < 0) e.push(a.attack_id + ': eccentric attack must carry ECCENTRIC_PHASE tag');
  if (a.required_form === 'SPLIT' && a.tags.indexOf('REQUIRES_SPLIT') < 0) e.push(a.attack_id + ': SPLIT-only attack must carry REQUIRES_SPLIT');
  if (cfg) { a.phases.forEach(function (p) { if (p.duration_key) cfg.resolve(p.duration_key); if (p.damage_key) cfg.resolve(p.damage_key); }); if (a.cooldown_key) cfg.resolve(a.cooldown_key); if (a.resource_cost_key) cfg.dev('resource.' + a.resource_cost_key); }
  return e;
}

export function createAttackRegistry(cfg, data) {
  var byId = {}; var errs = [];
  (data.attacks || []).forEach(function (a) { var e = validateAttack(a, cfg); if (e.length) errs = errs.concat(e); byId[a.attack_id] = a; });
  if (errs.length) throw new Error('attack data invalid: ' + errs.slice(0, 5).join('; '));
  return { classification: data.classification || 'UNKNOWN', get: function (id) { return byId[id] || null; }, all: function () { return Object.keys(byId).map(function (k) { return byId[k]; }); }, forClass: function (c) { return this.all().filter(function (a) { return a.class_id === c || a.class_id === 'ANY'; }); }, forPattern: function (c, p) { return this.forClass(c).filter(function (a) { return a.movement_pattern === p; }); } };
}

export function createCombatKit(cfg, deps) {
  var attacks = deps.attacks, loadouts = deps.loadouts, cls = deps.classId, cap = deps.capabilities, bus = deps.bus;
  var lo = loadouts.loadouts[cls]; if (!lo) throw new Error('no loadout entry for ' + cls);
  var catalog = {}; loadouts.pattern_catalog.forEach(function (p) { catalog[p.pattern_id] = p; });
  var range = cfg.movementPatternSlotRange(); var S = { selected: null, switches: 0, cooldowns: {}, t: 0 };
  var patterns = lo.patterns.slice(); patterns.forEach(function (p) { if (!catalog[p]) throw new Error('loadout pattern not in catalog: ' + p); });
  return {
    classId: cls, classification: loadouts.classification, status: lo.status,
    patterns: function () { return patterns.slice(); }, pattern: function (id) { return catalog[id] || null; }, slotRange: function () { return range; },
    slotCountWithinCanonRange: function () { return patterns.length >= range.min && patterns.length <= range.max; },   /* the 4-pattern prototype is deliberately below the canon 8-12 UI range */
    selectPattern: function (id) { if (patterns.indexOf(id) < 0) return { ok: false, reason: 'PATTERN_NOT_IN_LOADOUT' }; if (S.selected !== id) S.switches++; S.selected = id; bus.emit('PATTERN_SELECTED', { pattern_id: id, class_id: cls }); return { ok: true, pattern_id: id }; },
    selected: function () { return S.selected; }, switches: function () { return S.switches; },
    /* resolves the selected pattern + a direction / tier hint + current form into a usable attack (or a clean refusal) */
    resolve: function (directionOrTier, form, ctx) {
      if (!S.selected) return { ok: false, reason: 'NO_PATTERN_SELECTED' };
      var cands = attacks.forPattern(cls, S.selected).filter(function (a) { return a.direction === directionOrTier || a.attack_tier === directionOrTier; });
      if (!cands.length) return { ok: false, reason: 'NO_ATTACK_FOR_INPUT', pattern_id: S.selected, input: directionOrTier };
      var usable = cands.map(function (a) { return { attack: a, can: cap.canUseAttack(form, a, ctx) }; }); var first = usable.filter(function (u) { return u.can.ok; })[0];
      if (!first) return { ok: false, reason: usable[0].can.reason, attack_id: usable[0].attack.attack_id, pattern_id: S.selected };
      var cd = S.cooldowns[first.attack.attack_id]; if (cd !== undefined && cd > S.t) return { ok: false, reason: 'COOLDOWN', remaining_s: cd - S.t, attack_id: first.attack.attack_id };
      return { ok: true, attack: first.attack, limited: first.can.limited || first.can.reason === 'FUSED_LIMITED' };
    },
    startCooldown: function (attack) { S.cooldowns[attack.attack_id] = S.t + cfg.resolve(attack.cooldown_key); },
    tick: function (dt) { S.t += dt; },
    availability: function (form) { var out = {}; patterns.forEach(function (p) { out[p] = { pattern: cap.canUseLowerBodyPattern(form, catalog[p]), attacks: attacks.forPattern(cls, p).map(function (a) { return { attack_id: a.attack_id, tier: a.attack_tier, can: cap.canUseAttack(form, a) }; }) }; }); return out; }
  };
}
