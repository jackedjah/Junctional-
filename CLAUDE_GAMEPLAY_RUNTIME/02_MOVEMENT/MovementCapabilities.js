/* MAHWORLD GAMEPLAY RUNTIME :: MOVEMENT CAPABILITY LAYER (headless, no physics)
   Capability evaluation per form from the canonical config + capability tags. FUSED: travel, hover, glide, dash, high (travel)
   flight, LIMITED lower-body exercise attacks. SPLIT: gait locomotion, precise movement, climbing hooks, low flight, BROAD lower-body
   attacks, combat manoeuvring. Combat context overrides every flight ceiling with the combat cap (two ceilings, canon).

       var cap = createMovementCapabilities(cfg);
       cap.canFly('SPLIT', {combat:true}) · cap.getFlightCeiling('FUSED', {combat:false}) · cap.getMovementSpeedRange('FUSED','BACKWARD')
       cap.canUseAttack('FUSED', attackDef) · cap.canUseLowerBodyPattern('FUSED', patternDef) · cap.canClimb('SPLIT') */
export var FORM_CAPABILITIES = {
  FUSED: { travel: true, hover: true, glide: true, dash: true, flight: 'HIGH', gait: false, precise: false, climb: false, lower_body_attacks: 'LIMITED', combat_maneuver: false, propulsion: 'CENTRAL_LOWER_TIP' },
  SPLIT: { travel: true, hover: false, glide: false, dash: false, flight: 'LOW', gait: true, precise: true, climb: true, lower_body_attacks: 'BROAD', combat_maneuver: true, propulsion: 'PER_TIP_PULSE' }
};

export function createMovementCapabilities(cfg) {
  function form(f) { if (!FORM_CAPABILITIES[f]) throw new Error('unknown form ' + f); return FORM_CAPABILITIES[f]; }
  return {
    forms: function () { return Object.keys(FORM_CAPABILITIES); },
    capabilities: function (f) { return Object.assign({}, form(f)); },
    getMovementSpeedRange: function (f, direction) { form(f); return Object.assign({ unit: 'm/s', direction: direction || 'FORWARD', mph: cfg.speedRangeMph(f) }, cfg.speedRangeMps(f, direction || 'FORWARD')); },
    canFly: function (f, ctx) { form(f); return { ok: true, mode: ctx && ctx.combat ? 'COMBAT' : 'TRAVEL', ceiling_m: this.getFlightCeiling(f, ctx), consumes: cfg.canon('flight.consumes_resource') }; },
    getFlightCeiling: function (f, ctx) { form(f); return ctx && ctx.combat ? cfg.combatFlightCapM() : cfg.travelFlightCeilingM(f); },
    getFlightCeilingRange: function (f, ctx) { form(f); var c = cfg.combatFlightCapM(); return ctx && ctx.combat ? { min: c, max: c } : cfg.travelFlightCeilingRangeM(f); },
    canClimb: function (f) { return { ok: form(f).climb, reason: form(f).climb ? 'OK' : 'REQUIRES_SPLIT' }; },
    canUseLowerBodyPattern: function (f, pattern) {
      var avail = pattern.fused_availability || 'FUSED_OK'; if (f === 'SPLIT') return { ok: true, reason: 'SPLIT_BROAD' };
      if (avail === 'REQUIRES_SPLIT') return { ok: false, reason: 'REQUIRES_SPLIT' }; if (avail === 'FUSED_LIMITED') return { ok: true, reason: 'FUSED_LIMITED', limited: true }; return { ok: true, reason: 'FUSED_OK' };
    },
    canUseAttack: function (f, attack, ctx) {
      form(f); var req = attack.required_form || 'EITHER'; var tags = attack.tags || [];
      if (req !== 'EITHER' && req !== f) return { ok: false, reason: 'REQUIRES_' + req };
      if (tags.indexOf('REQUIRES_SPLIT') >= 0 && f !== 'SPLIT') return { ok: false, reason: 'REQUIRES_SPLIT' };
      if (tags.indexOf('AIRBORNE_OK') < 0 && ctx && ctx.airborne) return { ok: false, reason: 'NOT_AIRBORNE_OK' };
      return { ok: true, reason: tags.indexOf('FUSED_LIMITED') >= 0 && f === 'FUSED' ? 'FUSED_LIMITED' : 'OK' };
    }
  };
}
