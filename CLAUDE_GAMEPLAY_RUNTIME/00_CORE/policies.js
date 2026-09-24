/* MAHWORLD GAMEPLAY RUNTIME :: POLICY REGISTRY (strategy interfaces for OPEN_DECISION items — never hidden canon)
   Every unresolved design point is a named policy slot with pluggable strategies. Each registered strategy carries
   classification EXPERIMENTAL_POLICY and the ledger id it waits on; a temporary default is a config value in dev_tuning.dev.json,
   never a constant in code.

       var policies = createPolicyRegistry(cfg);
       policies.register('CALL_NEXT_POLICY', 'A', strategyA, 'OD-02');
       policies.select('CALL_NEXT_POLICY', 'B'); policies.get('CALL_NEXT_POLICY') -> strategy object */
export var POLICY_SLOTS = { CALL_NEXT_POLICY: 'OD-02', TARGETING_POLICY: 'OD-15', HERO_ARENA_CAMERA_MODE: 'OD-01', RAID_SCALING_POLICY: 'OD-08', RESOURCE_TUNING: 'OD-06' };

export function createPolicyRegistry(cfg) {
  var slots = {}; Object.keys(POLICY_SLOTS).forEach(function (s) { slots[s] = { strategies: {}, selected: null, open_decision: POLICY_SLOTS[s] }; });
  return {
    register: function (slot, id, strategy, odId) { if (!slots[slot]) throw new Error('unknown policy slot ' + slot); slots[slot].strategies[id] = { id: id, classification: 'EXPERIMENTAL_POLICY', open_decision: odId || POLICY_SLOTS[slot], strategy: strategy }; return this; },
    select: function (slot, id) { if (!slots[slot] || !slots[slot].strategies[id]) throw new Error('policy ' + slot + '/' + id + ' not registered'); slots[slot].selected = id; return slots[slot].strategies[id]; },
    selectDefaults: function () { Object.keys(slots).forEach(function (s) { var d = cfg.policyDefault(s).value; if (slots[s].strategies[d]) slots[s].selected = d; }); return this; },
    get: function (slot) { var s = slots[slot]; if (!s || !s.selected) throw new Error('policy ' + slot + ' has no selected strategy (OPEN_DECISION ' + (s ? s.open_decision : '?') + ')'); return s.strategies[s.selected]; },
    selected: function (slot) { return slots[slot] ? slots[slot].selected : null; },
    describe: function () { var out = {}; Object.keys(slots).forEach(function (s) { out[s] = { open_decision: slots[s].open_decision, selected: slots[s].selected, available: Object.keys(slots[s].strategies), classification: 'EXPERIMENTAL_POLICY' }; }); return out; }
  };
}
