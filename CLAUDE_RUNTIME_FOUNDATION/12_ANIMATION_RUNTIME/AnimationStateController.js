/* MAHWORLD RUNTIME :: ANIMATION STATE CONTROLLER
   JS port of the mahloco rev-2 locomotion state machine (CLAUDE_DUAL_LOCOMOTION/15_RUNTIME_DESIGN/mahloco) plus the animation
   anchor binder (09_RUNTIME_CODE/mahchar/animation_binding.py), targeted at three.js AnimationMixer but engine-agnostic:
   the controller emits DL_* events and clip requests; a rig driver (options.rig) applies them.

   Canon (never mirrored):
     UNFUSE  FUSED -> SPLIT : ENTER -> CURL -> CHARGE -> BURST(commit) -> STAR -> RECOVER      expensive, seam glow, star release
     REFUSE  SPLIT -> FUSED : ENTER -> KNEES_UP -> ALIGN -> SNAP(commit) -> RECOVER            cheap, magnetic, brief flash
   FUSED = stronger central propulsion / transport; SPLIT = independent limbs on MAHGIC tips (no feet). MAHGIC costs and every
   duration come from runtime_config.default.json (placeholders awaiting human approval) — nothing is invented here.

   Animation: every runtime state maps to a contract clip (animation_set.json); a MISSING clip follows its fallback chain and
   ends in FUSED_IDLE / SPLIT_IDLE, flagged `placeholder:true` so the creator can show "clip missing" instead of a T-pose.

       var ctl = createAnimationStateController({ config, animationSet, binding, rig, world, listener });
       ctl.request('REQUEST_SPLIT'); ctl.tick(dt); ctl.state(); ctl.playState('FUSED_IDLE') */

export var FUSED_STATES = ['FUSED_IDLE', 'FUSED_GLIDE', 'FUSED_DASH'];
export var SPLIT_STATES = ['SPLIT_IDLE', 'SPLIT_WALK_OR_GROUNDED_MOVE', 'SPLIT_RUN', 'SPLIT_CROUCH', 'SPLIT_LUNGE', 'SPLIT_KICK', 'SPLIT_CLIMB', 'SPLIT_COMBAT'];
export var UNFUSE_SEQ = ['UNFUSE_ENTER', 'UNFUSE_CURL', 'UNFUSE_CHARGE', 'UNFUSE_BURST', 'UNFUSE_STAR', 'UNFUSE_RECOVER'];
export var REFUSE_SEQ = ['REFUSE_ENTER', 'REFUSE_KNEES_UP', 'REFUSE_ALIGN', 'REFUSE_SNAP', 'REFUSE_RECOVER'];
export var ALL_STATES = FUSED_STATES.concat(UNFUSE_SEQ, SPLIT_STATES, REFUSE_SEQ);
var UNFUSE_COMMIT = 'UNFUSE_BURST', REFUSE_COMMIT = 'REFUSE_SNAP';
var TIP_LOCK = ['SPLIT_LUNGE', 'SPLIT_CLIMB', 'SPLIT_KICK'], COMMITTED = ['FUSED_DASH', 'SPLIT_LUNGE', 'SPLIT_KICK'];
var ACTION_MODE = { HOVER: 'FUSED', GLIDE: 'FUSED', DASH: 'FUSED', FLY: 'FUSED', MAHGIC_LAUNCH: 'FUSED', WALK: 'SPLIT', RUN: 'SPLIT', CROUCH: 'SPLIT', LUNGE: 'SPLIT', KICK: 'SPLIT', CLIMB: 'SPLIT', STAIRS: 'SPLIT', INTERACT: 'SPLIT', COMBAT_STANCE: 'SPLIT', REQUEST_SPLIT: 'SPLIT', REQUEST_FUSED: 'FUSED' };
var TRANSFORM_REJECTED = ['DASH', 'LUNGE', 'KICK', 'CLIMB', 'MAHGIC_LAUNCH', 'INTERACT', 'FLY'];
var W = 'SPLIT_WALK_OR_GROUNDED_MOVE';
/* transition table: 'STATE|ACTION' -> [to, guard]; ACTION '' = timed/phase transition (mahloco TABLE, 67 rows in the generated table) */
var TABLE = {};
function row(s, a, to, g) { TABLE[s + '|' + a] = [to, g || null]; }
row('FUSED_IDLE', 'GLIDE', 'FUSED_GLIDE'); row('FUSED_IDLE', 'FLY', 'FUSED_GLIDE'); row('FUSED_IDLE', 'MOVE', 'FUSED_GLIDE'); row('FUSED_IDLE', 'DASH', 'FUSED_DASH', 'g_dash'); row('FUSED_IDLE', 'MAHGIC_LAUNCH', 'FUSED_DASH', 'g_dash'); row('FUSED_IDLE', 'REQUEST_SPLIT', 'UNFUSE_ENTER', 'g_unfuse');
row('FUSED_GLIDE', 'STOP', 'FUSED_IDLE'); row('FUSED_GLIDE', 'HOVER', 'FUSED_IDLE'); row('FUSED_GLIDE', 'DASH', 'FUSED_DASH', 'g_dash'); row('FUSED_GLIDE', 'MAHGIC_LAUNCH', 'FUSED_DASH', 'g_dash'); row('FUSED_GLIDE', 'REQUEST_SPLIT', 'UNFUSE_ENTER', 'g_unfuse');
row('FUSED_DASH', '', 'FUSED_GLIDE', 't_timer');
row('UNFUSE_ENTER', '', 'UNFUSE_CURL', 't_phase'); row('UNFUSE_CURL', '', 'UNFUSE_CHARGE', 't_phase'); row('UNFUSE_CHARGE', '', 'UNFUSE_BURST', 't_phase'); row('UNFUSE_BURST', '', 'UNFUSE_STAR', 't_phase'); row('UNFUSE_STAR', '', 'UNFUSE_RECOVER', 't_phase'); row('UNFUSE_RECOVER', '', 'SPLIT_IDLE', 't_phase');
row('UNFUSE_ENTER', 'REQUEST_FUSED', 'FUSED_IDLE', 'g_abort'); row('UNFUSE_CURL', 'REQUEST_FUSED', 'FUSED_IDLE', 'g_abort'); row('UNFUSE_CHARGE', 'REQUEST_FUSED', 'FUSED_IDLE', 'g_abort');
row('SPLIT_IDLE', 'MOVE', W); row('SPLIT_IDLE', 'WALK', W); row('SPLIT_IDLE', 'STAIRS', W); row('SPLIT_IDLE', 'RUN', 'SPLIT_RUN'); row('SPLIT_IDLE', 'CROUCH', 'SPLIT_CROUCH'); row('SPLIT_IDLE', 'LUNGE', 'SPLIT_LUNGE', 'g_contact'); row('SPLIT_IDLE', 'KICK', 'SPLIT_KICK', 'g_contact'); row('SPLIT_IDLE', 'CLIMB', 'SPLIT_CLIMB', 'g_climb'); row('SPLIT_IDLE', 'INTERACT', 'SPLIT_IDLE'); row('SPLIT_IDLE', 'COMBAT_STANCE', 'SPLIT_COMBAT'); row('SPLIT_IDLE', 'REQUEST_FUSED', 'REFUSE_ENTER', 'g_refuse');
row(W, 'STOP', 'SPLIT_IDLE'); row(W, 'RUN', 'SPLIT_RUN'); row(W, 'CROUCH', 'SPLIT_CROUCH'); row(W, 'LUNGE', 'SPLIT_LUNGE', 'g_contact'); row(W, 'KICK', 'SPLIT_KICK', 'g_contact'); row(W, 'CLIMB', 'SPLIT_CLIMB', 'g_climb'); row(W, 'COMBAT_STANCE', 'SPLIT_COMBAT'); row(W, 'REQUEST_FUSED', 'REFUSE_ENTER', 'g_refuse');
row('SPLIT_RUN', 'STOP', 'SPLIT_IDLE'); row('SPLIT_RUN', 'WALK', W); row('SPLIT_RUN', 'LUNGE', 'SPLIT_LUNGE', 'g_contact'); row('SPLIT_RUN', 'CLIMB', 'SPLIT_CLIMB', 'g_climb'); row('SPLIT_RUN', 'REQUEST_FUSED', 'REFUSE_ENTER', 'g_refuse');
row('SPLIT_CROUCH', 'UNCROUCH', 'SPLIT_IDLE'); row('SPLIT_CROUCH', 'KICK', 'SPLIT_KICK', 'g_contact'); row('SPLIT_CROUCH', 'REQUEST_FUSED', 'REFUSE_ENTER', 'g_refuse');
row('SPLIT_COMBAT', 'EXIT_COMBAT', 'SPLIT_IDLE'); row('SPLIT_COMBAT', 'STOP', 'SPLIT_IDLE'); row('SPLIT_COMBAT', 'KICK', 'SPLIT_KICK', 'g_contact'); row('SPLIT_COMBAT', 'LUNGE', 'SPLIT_LUNGE', 'g_contact'); row('SPLIT_COMBAT', 'CROUCH', 'SPLIT_CROUCH'); row('SPLIT_COMBAT', 'MOVE', 'SPLIT_COMBAT'); row('SPLIT_COMBAT', 'REQUEST_FUSED', 'REFUSE_ENTER', 'g_refuse');
row('SPLIT_LUNGE', '', 'SPLIT_IDLE', 't_timer'); row('SPLIT_KICK', '', 'SPLIT_IDLE', 't_timer'); row('SPLIT_CLIMB', '', 'SPLIT_IDLE', 't_climb'); row('SPLIT_CLIMB', 'STOP', 'SPLIT_IDLE');
row('REFUSE_ENTER', '', 'REFUSE_KNEES_UP', 't_phase'); row('REFUSE_KNEES_UP', '', 'REFUSE_ALIGN', 't_phase'); row('REFUSE_ALIGN', '', 'REFUSE_SNAP', 't_align'); row('REFUSE_SNAP', '', 'REFUSE_RECOVER', 't_phase'); row('REFUSE_RECOVER', '', 'FUSED_IDLE', 't_phase');
row('REFUSE_ENTER', 'REQUEST_SPLIT', 'SPLIT_IDLE', 'g_abort'); row('REFUSE_KNEES_UP', 'REQUEST_SPLIT', 'SPLIT_IDLE', 'g_abort'); row('REFUSE_ALIGN', 'REQUEST_SPLIT', 'SPLIT_IDLE', 'g_abort');
export var TRANSITION_TABLE = TABLE;

export function modeOf(s) { if (s.indexOf('UNFUSE') === 0) return 'UNFUSING'; if (s.indexOf('REFUSE') === 0) return 'REFUSING'; return s.indexOf('FUSED') === 0 ? 'FUSED' : 'SPLIT'; }
export function isTransforming(s) { var m = modeOf(s); return m === 'UNFUSING' || m === 'REFUSING'; }

/* ---- animation binding (port of animation_binding.py) ---- */
var SELF_CLIPS = ['FUSED_IDLE', 'FUSED_GLIDE', 'FUSED_DASH', 'SPLIT_IDLE', 'SPLIT_RUN', 'SPLIT_CROUCH', 'SPLIT_LUNGE', 'SPLIT_KICK', 'SPLIT_CLIMB', 'SPLIT_COMBAT'];
export var DEFAULT_FALLBACK = {
  FUSED_HOVER: ['FUSED_IDLE'], FUSED_GLIDE: ['FUSED_FORWARD', 'FUSED_IDLE'], FUSED_FORWARD: ['FUSED_GLIDE', 'FUSED_IDLE'], FUSED_BACKWARD: ['FUSED_GLIDE', 'FUSED_IDLE'],
  FUSED_STRAFE_LEFT: ['FUSED_GLIDE', 'FUSED_IDLE'], FUSED_STRAFE_RIGHT: ['FUSED_GLIDE', 'FUSED_IDLE'], FUSED_ASCEND: ['FUSED_HOVER', 'FUSED_IDLE'], FUSED_DESCEND: ['FUSED_HOVER', 'FUSED_IDLE'],
  FUSED_DASH: ['FUSED_GLIDE', 'FUSED_IDLE'], FUSED_FLIGHT_IDLE: ['FUSED_HOVER', 'FUSED_IDLE'], FUSED_FLIGHT_FORWARD: ['FUSED_GLIDE', 'FUSED_IDLE'],
  UNFUSE_CURL: ['FUSED_IDLE'], UNFUSE_CHARGE: ['UNFUSE_CURL', 'FUSED_IDLE'], UNFUSE_BURST_STAR: ['UNFUSE_RECOVER', 'SPLIT_IDLE'], UNFUSE_RECOVER: ['SPLIT_IDLE'],
  SPLIT_FORWARD: ['SPLIT_IDLE'], SPLIT_RUN: ['SPLIT_FORWARD', 'SPLIT_IDLE'], SPLIT_STRAFE_LEFT: ['SPLIT_FORWARD', 'SPLIT_IDLE'], SPLIT_STRAFE_RIGHT: ['SPLIT_FORWARD', 'SPLIT_IDLE'], SPLIT_CROUCH: ['SPLIT_IDLE'], SPLIT_LUNGE: ['SPLIT_FORWARD', 'SPLIT_IDLE'],
  SPLIT_KICK: ['SPLIT_IDLE'], SPLIT_CLIMB: ['SPLIT_IDLE'], SPLIT_COMBAT: ['SPLIT_IDLE'], REFUSE_KNEES_UP: ['SPLIT_IDLE'], REFUSE_ALIGN: ['REFUSE_KNEES_UP', 'SPLIT_IDLE'], REFUSE_SNAP: ['REFUSE_RECOVER', 'FUSED_IDLE'], REFUSE_RECOVER: ['FUSED_IDLE'],
  FUSED_IDLE: [], SPLIT_IDLE: [], UNFUSE_ABORT: ['FUSED_IDLE'], REFUSE_ABORT: ['SPLIT_IDLE']
};
var IDLES = ['FUSED_IDLE', 'SPLIT_IDLE'];

export function stateToClip(animationSet, state) {
  var m = animationSet.runtime_state_to_clip || {}; if (m[state]) return m[state];
  if (SELF_CLIPS.indexOf(state) >= 0) return state; return state;
}
export function defaultBinding(animationSet, baseModel, skeletonSignature) {
  var b = {}; var all = Object.assign({}, animationSet.required_clips, animationSet.optional_clips);
  Object.keys(all).forEach(function (clip) { var kind = all[clip]; b[clip] = { clip: clip, type: kind, asset_ref: null, status: 'MISSING', fallback: (DEFAULT_FALLBACK[clip] || ['FUSED_IDLE']).slice(), notifies: (animationSet.required_notifies[clip] || []).slice(), root_motion: clip.indexOf('SPLIT_') === 0 && kind === 'loop' && clip !== 'SPLIT_IDLE', class_override: ['FUSED_IDLE', 'FUSED_HOVER', 'SPLIT_IDLE'].indexOf(clip) >= 0 }; });
  return { schema_version: '0.1.0', base_model: baseModel, skeleton_signature: skeletonSignature || 'UNKNOWN', bindings: b, blend_spaces: {}, defaults: { blend_in: 0.15, blend_out: 0.15, placeholder_policy: 'STATIC_POSE_FLAGGED' } };
}
export function validateBinding(animationSet, binding) {
  var errs = []; var b = (binding && binding.bindings) || {};
  if (!binding || typeof binding !== 'object') return ['binding is not an object'];
  ['schema_version', 'base_model', 'skeleton_signature', 'bindings', 'defaults'].forEach(function (k) { if (!(k in binding)) errs.push('missing ' + k); });
  Object.keys(animationSet.required_clips).forEach(function (clip) { if (!b[clip]) errs.push('required clip ' + clip + ' not bound'); else if (b[clip].type !== animationSet.required_clips[clip]) errs.push(clip + ' type ' + b[clip].type + ' != contract ' + animationSet.required_clips[clip]); });
  Object.keys(b).forEach(function (clip) {
    var e = b[clip];
    if (!(clip in animationSet.required_clips) && !(clip in animationSet.optional_clips)) errs.push('unknown clip ' + clip);
    if ((e.status === 'AUTHORED' || e.status === 'APPROVED') && !e.asset_ref) errs.push(clip + ' marked ' + e.status + ' without asset_ref');
    (e.notifies || []).forEach(function (n) { if (animationSet.forbidden_notifies.indexOf(n) >= 0) errs.push(clip + ' carries forbidden notify ' + n); });
    (animationSet.required_notifies[clip] || []).forEach(function (n) { if ((e.status === 'AUTHORED' || e.status === 'APPROVED') && (e.notifies || []).indexOf(n) < 0) errs.push(clip + ' authored without required notify ' + n); });
    var chain = e.fallback || []; if (IDLES.indexOf(clip) < 0 && (!chain.length || IDLES.indexOf(chain[chain.length - 1]) < 0)) errs.push(clip + ' fallback chain must end in an idle');
    chain.forEach(function (f) { if (!b[f]) errs.push(clip + ' fallback ' + f + ' is not bound'); });
  });
  return errs;
}

/* ---- controller ---- */
export function createAnimationStateController(options) {
  var o = options || {}; var cfg = o.config; if (!cfg) throw new Error('AnimationStateController: config (runtime_config.default.json) required');
  if (!(cfg.speed_fused_glide >= cfg.speed_split_run && cfg.speed_fused_dash > cfg.speed_fused_glide)) throw new Error('canon: fused transport must be the stronger form');
  if (!(cfg.unfuse_mahgic_cost > cfg.refuse_mahgic_cost)) throw new Error('canon: unfusing must cost more than refusing');
  if (!(cfg.refuse_snap_flash < cfg.charge_seam_peak)) throw new Error('canon: refuse flash smaller than unfuse aura');
  var anim = o.animationSet; if (!anim) throw new Error('AnimationStateController: animationSet required');
  var binding = o.binding || defaultBinding(anim, o.baseModel || 'MAH_ATHLETE_F', o.skeletonSignature);
  var berrs = validateBinding(anim, binding); if (berrs.length) throw new Error('invalid binding: ' + berrs.slice(0, 5).join('; '));
  var B = binding.bindings;
  var rig = Object.assign({ setVisibility: function () {}, setStateParam: function () {}, setPackedMorph: function () {}, setSeam: function () {}, setCollisionProfile: function () {}, setPropulsion: function () {}, setIk: function () {}, play: function () {}, alignmentErrorDeg: function () { return 0; }, fault: function () { return null; } }, o.rig || {});
  var world = Object.assign({ grounded: function () { return true; }, hoverHeight: function () { return 0; }, speed: function () { return 0; }, clearanceOk: function () { return true; }, climbableAhead: function () { return false; }, mahgic: function () { return 100; }, spendMahgic: function () {}, refundMahgic: function () {} }, o.world || {});
  var listener = o.listener || null; var rigBound = o.rigBound !== false;

  var M = { t: 0, state: 'FUSED_IDLE', stateTime: 0, modeTime: 0, pending: null, pendingAfter: null, transformReadyAt: 0, dashReadyAt: 0, forced: false, faultHold: 0, alignHold: 0, commits: 0, mahgicSpent: 0, visible: 'FUSED', budget: [1, 0, 0, 0], collision: 'FUSED', seam: 0, morph: 1, authority: 'CENTRAL', events: [], current: null, degraded: !rigBound };
  function emit(name, payload) { var e = { t: M.t, name: name, payload: payload || {} }; M.events.push(e); if (M.events.length > 2000) M.events.shift(); if (listener) listener(e); return e; }
  function committed() { var s = M.state; if (UNFUSE_SEQ.indexOf(s) >= 0) return UNFUSE_SEQ.indexOf(s) >= UNFUSE_SEQ.indexOf(UNFUSE_COMMIT); if (REFUSE_SEQ.indexOf(s) >= 0) return REFUSE_SEQ.indexOf(s) >= REFUSE_SEQ.indexOf(REFUSE_COMMIT); return false; }
  function phaseDuration(s) { return { UNFUSE_ENTER: cfg.unfuse_enter_duration, UNFUSE_CURL: cfg.unfuse_curl_duration, UNFUSE_CHARGE: cfg.unfuse_charge_duration, UNFUSE_BURST: cfg.unfuse_burst_duration, UNFUSE_STAR: cfg.unfuse_star_duration, UNFUSE_RECOVER: cfg.unfuse_recover_duration, REFUSE_ENTER: cfg.refuse_enter_duration, REFUSE_KNEES_UP: cfg.refuse_knees_up_duration, REFUSE_ALIGN: cfg.refuse_align_min_duration, REFUSE_SNAP: cfg.refuse_snap_duration, REFUSE_RECOVER: cfg.refuse_recover_duration }[s]; }
  function phaseProgress() { return isTransforming(M.state) ? Math.min(1, M.stateTime / Math.max(1e-6, phaseDuration(M.state))) : 0; }

  /* animation resolution with fallback chain */
  function resolve(clip) {
    var seen = []; var c = clip;
    while (c && seen.indexOf(c) < 0) { seen.push(c); var e = B[c]; if (e && e.status !== 'MISSING' && e.asset_ref) return { resolved: c, entry: e, via: seen.slice(0, -1) }; c = e && e.fallback && e.fallback.length ? e.fallback[0] : null; }
    return { resolved: null, entry: null, via: seen };
  }
  function playState(state) {
    var clip = stateToClip(anim, state); var r = resolve(clip);
    var ev = { state: state, requested: clip, resolved: r.resolved, via_fallbacks: r.via, placeholder: r.resolved === null, idle_fallback: r.resolved === null ? (modeOf(state) === 'FUSED' || modeOf(state) === 'REFUSING' ? 'FUSED_IDLE' : 'SPLIT_IDLE') : null };
    M.current = ev; rig.play(r.resolved || ev.idle_fallback, 'LOCO', binding.defaults.blend_in, ev); emit('ANIM_PLAY', ev); return ev;
  }

  /* guards */
  var G = {
    g_dash: function () { return M.t >= M.dashReadyAt ? 'OK' : 'COOLDOWN'; },
    g_unfuse: function () { if (M.degraded) return 'RIG_UNBOUND'; var r = common(cfg.max_unfuse_entry_speed, 'SPLIT'); if (r !== 'OK') return r; if (cfg.unfuse_requires_grounded && !(world.grounded() || world.hoverHeight() <= cfg.unfuse_max_hover_height)) return 'GUARD_NOT_GROUNDED'; if (world.mahgic() < cfg.unfuse_mahgic_cost) return 'INSUFFICIENT_MAHGIC'; return 'OK'; },
    g_refuse: function () { if (TIP_LOCK.indexOf(M.state) >= 0) return 'TIP_LOCK'; var r = common(cfg.max_refuse_entry_speed, 'FUSED'); if (r !== 'OK') return r; if (world.mahgic() < cfg.refuse_mahgic_cost) return 'INSUFFICIENT_MAHGIC'; return 'OK'; },
    g_abort: function () { return committed() ? 'IN_TRANSFORM_QUEUED' : 'OK'; },
    g_contact: function () { return world.grounded() ? 'OK' : 'GUARD_NOT_GROUNDED'; },
    g_climb: function () { return world.climbableAhead() ? 'OK' : 'GUARD_NO_CLIMBABLE'; }
  };
  function common(maxSpeed, profile) { if (M.t < M.transformReadyAt) return 'COOLDOWN'; if (M.modeTime < cfg.min_dwell_after_transform) return 'MIN_DWELL'; if (world.speed() > maxSpeed) return 'GUARD_SPEED'; if (!world.clearanceOk(profile)) return 'GUARD_CLEARANCE'; return 'OK'; }

  function setBudget(c, l, r, s) { var sum = c + l + r + s; var b = sum > 0 ? [c / sum, l / sum, r / sum, s / sum] : [1, 0, 0, 0]; M.budget = b; rig.setPropulsion(b[0], b[1], b[2], b[3]); M.authority = b[0] >= b[1] + b[2] ? 'CENTRAL' : 'BILATERAL'; }
  function applyFused() { M.visible = 'FUSED'; rig.setVisibility('FUSED'); rig.setStateParam(1); M.morph = 1; rig.setPackedMorph(1); M.seam = 0; rig.setSeam(0); setBudget(1, 0, 0, 0); M.collision = 'FUSED'; rig.setCollisionProfile('FUSED'); rig.setIk('L', false); rig.setIk('R', false); }
  function applySplit() { M.visible = 'SPLIT'; rig.setVisibility('SPLIT'); rig.setStateParam(0); M.morph = 0; rig.setPackedMorph(0); M.seam = 0; rig.setSeam(0); setBudget(0, 0.5, 0.5, 0); M.collision = 'SPLIT'; rig.setCollisionProfile('SPLIT'); rig.setIk('L', true); rig.setIk('R', true); }
  function applyOutputs() {
    var s = M.state; if (!isTransforming(s)) return; var p = phaseProgress(); var fx = cfg.seam_fx_enabled ? 1 : 0; var seam, b, morph;
    if (s === 'UNFUSE_ENTER') { seam = 0; b = [1, 0, 0, 0]; morph = 1; }
    else if (s === 'UNFUSE_CURL') { var cc = 1 - (1 - cfg.charge_central_propulsion) * p; seam = 0; b = [cc, 0, 0, 1 - cc]; morph = 1; }
    else if (s === 'UNFUSE_CHARGE') { seam = cfg.charge_seam_peak * p; b = [cfg.charge_central_propulsion, 0, 0, 1 - cfg.charge_central_propulsion]; morph = 1; }
    else if (s === 'UNFUSE_BURST') { seam = cfg.charge_seam_peak; b = [0, 0, 0, 1]; morph = 1; }
    else if (s === 'UNFUSE_STAR') { seam = cfg.charge_seam_peak * (1 - p); b = [0, p / 2, p / 2, 1 - p]; morph = 1 - p; }
    else if (s === 'UNFUSE_RECOVER') { seam = 0; b = [0, 0.5, 0.5, 0]; morph = 0; }
    else if (s === 'REFUSE_ENTER' || s === 'REFUSE_KNEES_UP') { seam = 0; b = [0, 0.5, 0.5, 0]; morph = 0; }
    else if (s === 'REFUSE_ALIGN') { var fl = cfg.align_tip_propulsion_floor; var tt = 1 - (1 - fl) * p; seam = 0; b = [0, tt / 2, tt / 2, 1 - tt]; morph = p; }
    else if (s === 'REFUSE_SNAP') { seam = cfg.refuse_snap_flash * (1 - p); b = [1, 0, 0, 0]; morph = 1; }
    else { seam = 0; b = [1, 0, 0, 0]; morph = 1; }
    var prev = M.seam; M.seam = seam * fx; rig.setSeam(M.seam); M.morph = morph; rig.setPackedMorph(morph); setBudget(b[0], b[1], b[2], b[3]);
    if (s === 'UNFUSE_CHARGE' && Math.floor(M.seam * 4) !== Math.floor(prev * 4)) emit('DL_SEAM_GLOW_INTENSITY', { level: Math.round(M.seam * 1000) / 1000 });
  }

  function enter(to, via) {
    var frm = M.state;
    if (TIP_LOCK.indexOf(frm) >= 0 && REFUSE_SEQ.indexOf(to) >= 0) throw new Error('I4: tip-lock state cannot start a re-fusion');
    emit('STATE_EXIT', { state: frm }); M.state = to; M.stateTime = 0;
    if (modeOf(to) !== modeOf(frm) && !isTransforming(to)) M.modeTime = 0;
    emit('STATE_ENTER', { state: to, via: via || 'tick' });
    if (to === 'UNFUSE_ENTER') beginTransform('UNFUSE');
    else if (to === 'REFUSE_ENTER') beginTransform('REFUSE');
    else if (to === 'UNFUSE_CURL') emit('DL_UNFUSE_CURL');
    else if (to === 'UNFUSE_CHARGE') { emit('DL_UNFUSE_CHARGE_BEGIN'); emit('DL_SEAM_GLOW_START'); }
    else if (to === 'UNFUSE_BURST') unfuseCommit();
    else if (to === 'UNFUSE_STAR') emit('DL_STAR_POSE');
    else if (to === 'UNFUSE_RECOVER') { emit('DL_SPLIT_PROPULSION_ENABLE'); rig.setIk('L', true); rig.setIk('R', true); emit('IK_ENABLE', { side: 'L' }); emit('IK_ENABLE', { side: 'R' }); }
    else if (to === 'REFUSE_KNEES_UP') { emit('DL_REFUSE_KNEES_UP'); rig.setIk('L', false); rig.setIk('R', false); emit('IK_DISABLE', { side: 'L' }); emit('IK_DISABLE', { side: 'R' }); }
    else if (to === 'REFUSE_ALIGN') { emit('DL_MAGNET_ALIGNMENT'); M.alignHold = 0; }
    else if (to === 'REFUSE_SNAP') refuseCommit();
    else if (to === 'REFUSE_RECOVER') emit('DL_FUSED_PROPULSION_ENABLE');
    else if (to === 'FUSED_DASH') { M.dashReadyAt = M.t + cfg.dash_cooldown; emit('FX_DASH_BURST'); }
    else if (TIP_LOCK.indexOf(to) >= 0) emit('TIP_LOCK', { state: to });
    if (TIP_LOCK.indexOf(frm) >= 0) emit('TIP_UNLOCK', { state: frm });
    playState(to);
    if (IDLES.indexOf(to) >= 0 && isTransforming(frm)) complete(frm, to);
    if (IDLES.indexOf(to) >= 0 && M.pendingAfter && via !== 'FORCED_INTERRUPT' && via !== 'DAMAGE_INTERRUPT') { var a = M.pendingAfter; M.pendingAfter = null; request(a); }
    applyOutputs();
  }
  function beginTransform(dir) { M.forced = false; M.faultHold = 0; M.commits = 0; M.mahgicSpent = 0; emit(dir === 'UNFUSE' ? 'DL_UNFUSE_BEGIN' : 'DL_REFUSE_BEGIN', dir === 'UNFUSE' ? { cost: cfg.unfuse_mahgic_cost, cost_mode: cfg.unfuse_cost_mode } : { cost: cfg.refuse_mahgic_cost }); emit('TRANSFORM_BEGIN', { direction: dir }); M.collision = 'TRANSFORM_SWEEP'; rig.setCollisionProfile(M.collision); emit('COLLISION_PROFILE', { profile: M.collision }); }
  function unfuseCommit() { M.commits += 1; if (M.commits !== 1) throw new Error('I3'); if (cfg.unfuse_cost_mode === 'at_commit') { world.spendMahgic(cfg.unfuse_mahgic_cost); M.mahgicSpent = cfg.unfuse_mahgic_cost; } emit('DL_UNFUSE_BURST'); emit('DL_LEG_SPLIT_COMMIT', { mahgic_spent: M.mahgicSpent }); M.visible = 'SPLIT'; rig.setVisibility('SPLIT'); rig.setStateParam(0); rig.setPackedMorph(1); emit('VISIBILITY', { profile: 'SPLIT' }); emit('OWNERSHIP_HANDOFF', { from: 'CENTRAL', to: 'BILATERAL' }); }
  function refuseCommit() { M.commits += 1; if (M.commits !== 1) throw new Error('I3'); world.spendMahgic(cfg.refuse_mahgic_cost); M.mahgicSpent = cfg.refuse_mahgic_cost; emit('DL_MAGNET_SNAP'); emit('DL_LEG_FUSION_COMMIT', { mahgic_spent: M.mahgicSpent }); M.visible = 'FUSED'; rig.setVisibility('FUSED'); rig.setStateParam(1); rig.setPackedMorph(1); emit('VISIBILITY', { profile: 'FUSED' }); emit('OWNERSHIP_HANDOFF', { from: 'BILATERAL', to: 'CENTRAL' }); }
  function abort(why) {
    var s = M.state; var unf = modeOf(s) === 'UNFUSING'; var origin = unf ? 'FUSED_IDLE' : 'SPLIT_IDLE'; var refund = unf ? M.mahgicSpent * cfg.unfuse_abort_refund_fraction : 0;
    if (refund > 0) world.refundMahgic(refund);
    emit(unf ? 'DL_UNFUSE_ABORT' : 'DL_REFUSE_ABORT', { from: s, why: why, refund: refund }); rig.setSeam(0); M.seam = 0;
    M.transformReadyAt = M.t + cfg.transform_cooldown; M.mahgicSpent = 0; M.forced = false; M.faultHold = 0;
    emit('STATE_EXIT', { state: s }); M.state = origin; M.stateTime = 0; M.modeTime = 0; emit('STATE_ENTER', { state: origin, via: 'abort' });
    (origin === 'FUSED_IDLE' ? applyFused : applySplit)(); playState(origin); emit('TRANSFORM_ABORTED', { to: origin });
  }
  function complete(frm, to) {
    (to === 'SPLIT_IDLE' ? applySplit : applyFused)(); emit(to === 'SPLIT_IDLE' ? 'SPLIT_COMPLETE' : 'FUSE_COMPLETE', { mahgic_spent: M.mahgicSpent }); emit('COLLISION_PROFILE', { profile: M.collision });
    M.transformReadyAt = M.t + cfg.transform_cooldown; M.forced = false; M.faultHold = 0;
    if (M.pending) { var p = M.pending; M.pending = null; var r = request(p); if (!r.accepted) { M.pending = (r.reason === 'COOLDOWN' || r.reason === 'MIN_DWELL') ? p : null; emit('PENDING_DEFERRED', { action: p, reason: r.reason }); } }
  }
  function result(accepted, reason, note) { return { accepted: accepted, reason: reason, state: M.state, note: note || '' }; }

  function request(action) {
    var s = M.state;
    if (action === 'FORCED_INTERRUPT' || action === 'DAMAGE_INTERRUPT') return interrupt(action);
    if (!action || action === 'NONE') return result(true, 'OK');
    if (isTransforming(s)) {
      var heading = modeOf(s) === 'UNFUSING' ? 'SPLIT' : 'FUSED'; var target = ACTION_MODE[action];
      if (TRANSFORM_REJECTED.indexOf(action) >= 0) return result(false, 'IN_TRANSFORM_REJECTED');
      if (target === heading || !target) { if (action !== 'REQUEST_SPLIT' && action !== 'REQUEST_FUSED') M.pendingAfter = action; return result(true, 'IN_TRANSFORM_QUEUED', 'same direction'); }
      var key = target === 'FUSED' ? 'REQUEST_FUSED' : 'REQUEST_SPLIT';
      if (TABLE[s + '|' + key] && G.g_abort() === 'OK') { abort('player request'); M.pendingAfter = (action !== 'REQUEST_SPLIT' && action !== 'REQUEST_FUSED') ? action : null; return result(true, 'IN_TRANSFORM_ABORTED'); }
      M.pending = key; M.pendingAfter = (action !== 'REQUEST_SPLIT' && action !== 'REQUEST_FUSED') ? action : null; return result(true, 'IN_TRANSFORM_QUEUED', 'past commit: completes, then opposite form queued');
    }
    if (COMMITTED.indexOf(s) >= 0) return result(false, 'COMMITTED_ACTION');
    var tgt = ACTION_MODE[action];
    if (tgt && tgt !== modeOf(s) && action !== 'REQUEST_SPLIT' && action !== 'REQUEST_FUSED') {
      if (!cfg.auto_switch_on_action) return result(false, 'WRONG_MODE');
      var r = request(tgt === 'SPLIT' ? 'REQUEST_SPLIT' : 'REQUEST_FUSED'); if (r.accepted) M.pendingAfter = action; return { accepted: r.accepted, reason: r.reason, state: M.state, note: 'form change first, then ' + action };
    }
    if ((action === 'REQUEST_SPLIT' || action === 'REQUEST_FUSED') && tgt === modeOf(s)) return result(true, 'ALREADY_IN_MODE');
    var rw = TABLE[s + '|' + action]; if (!rw) return result(false, 'WRONG_MODE', 'no table row for ' + action + ' in ' + s);
    if (rw[1] && rw[1].indexOf('g_') === 0) { var why = G[rw[1]](); if (why !== 'OK') return result(false, why); }
    enter(rw[0], action); return result(true, 'OK');
  }
  function interrupt(action) {
    var s = M.state;
    if (action === 'DAMAGE_INTERRUPT' && isTransforming(s) && (!cfg.damage_interrupts_transformation || (cfg.invulnerable_during_transformation && isTransforming(s)))) { emit('DAMAGE_INTERRUPT_IGNORED', { state: s }); return result(true, 'IN_TRANSFORM_IGNORED'); }
    emit('FORCED_INTERRUPT', { state: s, source: action });
    if (isTransforming(s)) { M.pending = null; M.pendingAfter = null; if (!committed()) { abort('interrupt'); emit('TRANSFORM_FORCED', { policy: 'abort_to_origin' }); } else { M.forced = true; emit('TRANSFORM_FORCED', { policy: 'complete_forward' }); } return result(true, 'OK'); }
    if (COMMITTED.indexOf(s) >= 0) { enter(modeOf(s) === 'FUSED' ? 'FUSED_IDLE' : 'SPLIT_IDLE', action); return result(true, 'OK'); }
    return result(true, 'OK', 'hit reaction is the animation layer');
  }

  function tick(dt) {
    M.t += dt; M.stateTime += dt; M.modeTime += dt; var s = M.state;
    if (isTransforming(s)) tickTransform(dt); else tickTimed(dt);
    var sum = M.budget[0] + M.budget[1] + M.budget[2] + M.budget[3]; if (Math.abs(sum - 1) > 1e-9) throw new Error('I2: energy budget must sum to 1');
    var splitOwns = modeOf(M.state) === 'SPLIT' ? true : modeOf(M.state) === 'FUSED' ? false : (modeOf(M.state) === 'UNFUSING' ? committed() : !committed());
    if ((M.visible === 'SPLIT') !== splitOwns) throw new Error('I1: exactly one lower-body skin visible');
    return M.state;
  }
  function tickTransform(dt) {
    var s = M.state; var f = rig.fault();
    if (f && M.faultHold >= 0) { if (M.faultHold === 0) emit('FAULT', { reason: f }); M.faultHold += dt; if (M.faultHold < cfg.max_fault_hold) return; emit('FAULT_HOLD_EXPIRED', { state: s }); M.faultHold = -1e9; if (!committed()) { abort('rig fault'); return; } M.forced = true; }
    else if (!f && M.faultHold > 0 && M.faultHold < cfg.max_fault_hold) { emit('FAULT_CLEARED', { held: M.faultHold }); M.faultHold = 0; }
    if (s === 'UNFUSE_CHARGE' && cfg.unfuse_cost_mode === 'during_charge') { var step = Math.min(cfg.unfuse_mahgic_cost * dt / cfg.unfuse_charge_duration, cfg.unfuse_mahgic_cost - M.mahgicSpent); if (step > 0) { world.spendMahgic(step); M.mahgicSpent += step; } }
    applyOutputs();
    var dur = phaseDuration(s) / (M.forced ? cfg.forced_complete_speed_mult : 1);
    if (s === 'REFUSE_ALIGN') {
      var aligned = rig.alignmentErrorDeg() <= cfg.leg_alignment_tolerance_deg;
      if (M.stateTime >= dur && aligned) { enter(TABLE[s + '|'][0]); return; }
      if (M.stateTime >= dur) { M.alignHold += dt; if (M.alignHold >= cfg.refuse_align_max_hold && !M.forced) { abort('alignment timeout'); return; } if (M.forced) { enter(TABLE[s + '|'][0]); return; } }
      return;
    }
    if (M.stateTime >= dur) enter(TABLE[s + '|'][0]);
  }
  function tickTimed(dt) {
    var s = M.state; var rw = TABLE[s + '|']; if (!rw) return;
    var d = { FUSED_DASH: cfg.dash_duration, SPLIT_LUNGE: cfg.lunge_duration, SPLIT_KICK: cfg.kick_duration }[s];
    if (rw[1] === 't_timer' && M.stateTime >= d) enter(rw[0]);
    else if (rw[1] === 't_climb' && !world.climbableAhead()) enter(rw[0]);
  }

  applyFused(); playState('FUSED_IDLE');
  if (!rigBound) emit('RIG_UNBOUND', {});
  return {
    request: request, tick: tick, state: function () { return M.state; }, mode: function () { return modeOf(M.state); }, transforming: function () { return isTransforming(M.state); }, committed: committed,
    phaseProgress: phaseProgress, snapshot: function () { return { state: M.state, mode: modeOf(M.state), visible: M.visible, budget: M.budget.slice(), seam: M.seam, morph: M.morph, collision: M.collision, authority: M.authority, t: M.t, pending: M.pending, pendingAfter: M.pendingAfter, clip: M.current, transforming: isTransforming(M.state), committed: committed() }; },
    events: function () { return M.events.slice(); }, playState: playState, resolve: resolve, binding: function () { return binding; }, config: function () { return cfg; }, states: function () { return ALL_STATES.slice(); },
    setRigBound: function (v) { M.degraded = !v; emit(v ? 'RIG_BOUND' : 'RIG_UNBOUND', {}); }, destroy: function () { listener = null; }
  };
}
