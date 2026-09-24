/* MAHWORLD GAMEPLAY RUNTIME :: MAHLOCO ADAPTER
   Gameplay never owns transformation validity. The adapter wraps the approved runtime port of mahloco rev 2
   (CLAUDE_RUNTIME_FOUNDATION/12_ANIMATION_RUNTIME/AnimationStateController.js — the same transition table, guards, commit points and
   asymmetric chains as CLAUDE_DUAL_LOCOMOTION/15_RUNTIME_DESIGN/mahloco) and exposes only what gameplay asks:
     TRANSFORM_TO_SPLIT · TRANSFORM_TO_FUSED · form() · movement capability of the current form · tick.
   No transition logic is duplicated here; refusals (COOLDOWN, MIN_DWELL, TIP_LOCK, INSUFFICIENT_MAHGIC, RIG_UNBOUND, …) are mahloco's.

       var loco = createMahlocoAdapter({ controller, capabilities, bus }); loco.transformToSplit(); loco.tick(dt); loco.form() */
export function createMahlocoAdapter(deps) {
  var ctl = deps.controller; if (!ctl || typeof ctl.request !== 'function') throw new Error('MahlocoAdapter: an AnimationStateController (mahloco port) is required');
  var bus = deps.bus, cap = deps.capabilities; var stats = { transforms: 0, cancels: 0, refusals: {} };
  var unhook = ctl.onEvent ? null : null;
  function formOf(mode) { return mode === 'FUSED' || mode === 'REFUSING' ? 'FUSED' : 'SPLIT'; }   /* visible skin owner: mahloco I1 */
  function request(action, label) {
    var before = ctl.snapshot(); var r = ctl.request(action); var payload = { action: action, accepted: r.accepted, reason: r.reason, state: r.state, from_mode: before.mode };
    if (r.accepted && (r.reason === 'OK')) { stats.transforms++; bus.emit(label + '_ACCEPTED', payload); }
    else if (r.accepted && r.reason === 'IN_TRANSFORM_ABORTED') { stats.cancels++; bus.emit('TRANSFORM_CANCELLED', payload); }
    else if (r.accepted) bus.emit(label + '_QUEUED', payload);
    else { stats.refusals[r.reason] = (stats.refusals[r.reason] || 0) + 1; bus.emit(label + '_REFUSED', payload); }
    return r;
  }
  return {
    controller: ctl,
    form: function () { return formOf(ctl.snapshot().mode); },
    mode: function () { return ctl.snapshot().mode; },
    transforming: function () { return ctl.snapshot().transforming; },
    transformToSplit: function () { return request('REQUEST_SPLIT', 'TRANSFORM_TO_SPLIT'); },
    transformToFused: function () { return request('REQUEST_FUSED', 'TRANSFORM_TO_FUSED'); },
    canTransform: function (target) { var s = ctl.snapshot(); if (s.transforming) return { ok: false, reason: 'IN_TRANSFORM' }; if (formOf(s.mode) === target) return { ok: false, reason: 'ALREADY_IN_MODE' }; return { ok: true, reason: 'ASK_MAHLOCO' }; },
    move: function (action) { return ctl.request(action); },   /* MOVE / STOP / RUN / WALK / DASH / GLIDE / CROUCH … (mahloco actions) */
    capabilities: function () { return cap.capabilities(this.form()); },
    tick: function (dt) { ctl.tick(dt); return ctl.state(); },
    snapshot: function () { var s = ctl.snapshot(); return Object.assign({ form: formOf(s.mode) }, s); },
    stats: function () { return { transforms: stats.transforms, cancels: stats.cancels, refusals: Object.assign({}, stats.refusals) }; }
  };
}
