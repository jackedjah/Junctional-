/* MAHWORLD :: authored choreography data — plain-node checks (development, 2026-09-15).
   Validates lab/animData.js against lab/ANIMATION_CHANNELS.md: bone names, ranges, segments, partner roles, sampler behaviour, expressions.
   node 16_TESTS/gameplay_anim_data.test.mjs   (from CLAUDE_GAMEPLAY_RUNTIME) */
import fs from 'node:fs';
import { BONES, FACE_CHANNELS, EXPRESSION_NAMES, GROUPS, EXPRESSIONS, EMOTES, EMOTE_ORDER, HAND_POSES, CLASS_STYLE, BEAM_HINTS, MAX_CLASS_AMP, SEGMENTS_REF, sampleClip, emoteDuration, loopFor, segmentsFor, listEmotes } from '../26_LOCAL_AUTHORITY/lab/animData.js';
var PROFILE = JSON.parse(fs.readFileSync(new URL('../26_LOCAL_AUTHORITY/lab/rig_profile.json', import.meta.url), 'utf8'));
var LIMITS = PROFILE.limits_rad, CLEAR = PROFILE.clearance;
var pass = 0, fail = 0; function ok(id, cond, detail) { if (cond) { pass++; console.log('PASS ' + id); } else { fail++; console.log('FAIL ' + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }
var REQUIRED = ['WAVE', 'NOD', 'APPLAUD', 'THUMBS_UP', 'BECKON', 'MAH_GROOVE', 'SIDE_GLIDE', 'UPRIGHT_ROW_DEMO', 'HORIZONTAL_PUSH_DEMO', 'HIP_HINGE_DEMO', 'SQUAT_DEMO', 'DOUBLE_BICEPS', 'FRONT_LAT_SPREAD', 'SIDE_CHEST', 'BACK_LAT_SPREAD', 'SHRUG', 'QUIET_LAUGH', 'FIST_BUMP', 'HIGH_FIVE', 'PAIRED_GROOVE', 'READY'];
var FACE_RANGE = { brow_l: [-1, 1], brow_r: [-1, 1], cheek_l: [0, 1], cheek_r: [0, 1], jaw: [0, 1], smile: [0, 1], blink: [0, 1], blink_bias: [0, 1], gaze_x: [-0.6, 0.6], gaze_y: [-0.6, 0.6] };
var boneSet = {}; BONES.forEach(function (b) { boneSet[b] = 1; });
function checkClip(label, c, problems) { if (!c || typeof c.duration_s !== 'number' || !(c.duration_s > 0)) { problems.push(label + ': missing duration'); return; } if (!Array.isArray(c.keys) || c.keys.length < 2) { problems.push(label + ': fewer than 2 keys'); return; }
  var lastT = -1; c.keys.forEach(function (k, i) { if (typeof k.t !== 'number' || k.t < 0 || k.t > 1 || k.t < lastT) problems.push(label + ' key ' + i + ': bad t ' + k.t); lastT = k.t;
    Object.keys(k.bones || {}).forEach(function (b) { if (!boneSet[b]) problems.push(label + ' key ' + i + ': unknown bone ' + b); var v = k.bones[b]; if (!Array.isArray(v) || v.length !== 3 || v.some(function (x) { return !Number.isFinite(x) || Math.abs(x) > 3.2; })) problems.push(label + ' key ' + i + ': bad value for ' + b + ' ' + JSON.stringify(v)); });
    Object.keys(k.face || {}).forEach(function (f) { var r = FACE_RANGE[f]; if (!r) problems.push(label + ' key ' + i + ': unknown face channel ' + f); else if (!Number.isFinite(k.face[f]) || k.face[f] < r[0] - 1e-9 || k.face[f] > r[1] + 1e-9) problems.push(label + ' key ' + i + ': face ' + f + ' out of range ' + k.face[f]); });
    if (k.beam !== undefined && (!Number.isFinite(k.beam) || k.beam < 0 || k.beam > 2)) problems.push(label + ' key ' + i + ': beam out of range ' + k.beam); });
  if (c.keys[0].t !== 0) problems.push(label + ': first key not at t=0'); if (c.keys[c.keys.length - 1].t !== 1) problems.push(label + ': last key not at t=1'); }
/* 1 catalogue completeness */
ok('all 21 starter emotes present', REQUIRED.every(function (id) { return EMOTES[id] && EMOTES[id].id === id; }), REQUIRED.filter(function (id) { return !EMOTES[id]; }));
ok('EMOTE_ORDER matches the catalogue', EMOTE_ORDER.length === Object.keys(EMOTES).length && EMOTE_ORDER.every(function (id) { return !!EMOTES[id]; }));
ok('groups valid', Object.keys(EMOTES).every(function (id) { return GROUPS.indexOf(EMOTES[id].group) >= 0; }));
ok('every group used', GROUPS.every(function (g) { return listEmotes(g).length > 0; }), GROUPS.map(function (g) { return g + ':' + listEmotes(g).length; }));
/* 2 per-emote structure */
var problems = [];
Object.keys(EMOTES).forEach(function (id) { var e = EMOTES[id]; if (['ANY', 'FUSED', 'SPLIT'].indexOf(e.form) < 0) problems.push(id + ': form'); if (typeof e.partner !== 'boolean' || typeof e.directed !== 'boolean') problems.push(id + ': partner/directed flags'); if (!e.icon || !e.name) problems.push(id + ': icon/name');
  if (EXPRESSION_NAMES.indexOf(e.face) < 0) problems.push(id + ': face expression ' + e.face); if (['idle', 'pulse', 'brace'].indexOf(e.beams) < 0) problems.push(id + ': beams'); if (!Array.isArray(e.reply_options) || e.reply_options.some(function (r) { return !EMOTES[r]; })) problems.push(id + ': reply_options');
  if (!(e.loops === 'until_cancel' || (Number.isInteger(e.loops) && e.loops >= 0))) problems.push(id + ': loops'); var s = e.segments; if (!s) { problems.push(id + ': segments'); return; }
  checkClip(id + '.entry', s.entry, problems); checkClip(id + '.exit', s.exit, problems); var needsLoop = e.loops === 'until_cancel' || e.loops > 0; if (needsLoop) checkClip(id + '.loop', s.loop, problems); else if (s.loop !== null) problems.push(id + ': loop should be null when loops = 0');
  if (e.form_variants) Object.keys(e.form_variants).forEach(function (f) { checkClip(id + '.form_variants.' + f, e.form_variants[f], problems); });
  if (e.partner) { if (!e.roles || !e.roles.A || !e.roles.B) problems.push(id + ': partner roles A/B'); else { ['A', 'B'].forEach(function (r) { checkClip(id + '.roles.' + r + '.entry', e.roles[r].entry, problems); checkClip(id + '.roles.' + r + '.exit', e.roles[r].exit, problems); if (needsLoop) checkClip(id + '.roles.' + r + '.loop', e.roles[r].loop, problems); }); }
    if (!(typeof e.partner_offset_m === 'number' && e.partner_offset_m > 0.5 && e.partner_offset_m < 2.5)) problems.push(id + ': partner_offset_m'); if (['FACE', 'SIDE'].indexOf(e.partner_facing) < 0) problems.push(id + ': partner_facing'); if (e.contact_t !== null && !(e.contact_t > 0 && e.contact_t < 1)) problems.push(id + ': contact_t'); if (e.group !== 'PARTNER') problems.push(id + ': partner emote must be in PARTNER group'); }
  else if (e.roles) problems.push(id + ': roles on a solo emote'); });
ok('emote structures valid (segments, keys, bones, ranges, roles)', problems.length === 0, problems.slice(0, 12));
/* 3 reach limits on partner contact keys */
var reachProblems = []; ['FIST_BUMP', 'HIGH_FIVE'].forEach(function (id) { var e = EMOTES[id]; ['A', 'B'].forEach(function (r) {
  var s = sampleClip(e.roles[r].entry, e.contact_t); var w = wrist('R', s.bones), rest = wrist('R', {});
  var forward = w.z - SEGMENTS_REF.shoulder.z, span = Math.sqrt(Math.pow(w.x - SEGMENTS_REF.shoulder.x, 2) + Math.pow(w.y - SEGMENTS_REF.shoulder.y, 2) + Math.pow(w.z - SEGMENTS_REF.shoulder.z, 2));
  var armLen = SEGMENTS_REF.upperarm_m + SEGMENTS_REF.forearm_m;
  if (forward < 0.32) reachProblems.push(id + '.' + r + ': contact hand only ' + forward.toFixed(3) + ' m in front');
  if (span > armLen + 1e-6) reachProblems.push(id + '.' + r + ': contact beyond arm length ' + span.toFixed(3) + ' > ' + armLen.toFixed(3));
  if (w.y <= rest.y + 0.15) reachProblems.push(id + '.' + r + ': contact hand not lifted (' + w.y.toFixed(3) + ')'); }); });
ok('partner contact reaches forward within arm length (measured by forward kinematics)', reachProblems.length === 0, reachProblems);
/* 4 sampler behaviour */
var w = EMOTES.WAVE.segments.entry; var s0 = sampleClip(w, 0), sMid = sampleClip(w, 0.44), sEnd = sampleClip(w, 1), sOver = sampleClip(w, 1.5), sUnder = sampleClip(w, -1);
ok('sampleClip at t=0 equals the first key (rest, no arm raise)', (s0.bones.UPPERARM_R || [0, 0, 0])[2] === 0 && s0.face.gaze_x === 0.2);
ok('sampleClip mid-wave has the right arm raised outward and elbow bent', sMid.bones.UPPERARM_R[2] > 1.2 && sMid.bones.FOREARM_R[0] < -1.0, sMid.bones);
ok('sampleClip holds the last key past t=1 and clamps below 0', JSON.stringify(sOver) === JSON.stringify(sEnd) && JSON.stringify(sUnder) === JSON.stringify(s0));
var mono = true; var prev = null; for (var u = 0.24; u <= 0.34; u += 0.01) { var v = sampleClip(w, u).bones.HAND_R[2]; if (prev !== null && v > prev + 1e-9) mono = false; prev = v; }
ok('sampleClip is monotonic between two keys (wave wrist 0 → −0.55 over 0.24…0.34)', mono);
var kb = sampleClip(w, 0.24); ok('sampleClip lands exactly on a key value at a key boundary', Math.abs(kb.bones.UPPERARM_R[2] - 1.38) < 1e-9, kb.bones.UPPERARM_R);
var beamMid = sampleClip(EMOTES.MAH_GROOVE.segments.loop, 0.125).beam; ok('sampleClip interpolates beam weights', Number.isFinite(beamMid) && beamMid > 1.0 && beamMid < 1.3, beamMid);
/* 5 durations, loops, variants, roles helpers */
ok('emoteDuration: entry + loops + exit', Math.abs(emoteDuration(EMOTES.UPRIGHT_ROW_DEMO) - (0.6 + 3 * 2.2 + 0.5)) < 1e-9 && Math.abs(emoteDuration(EMOTES.MAH_GROOVE, 2) - (0.6 + 2 * 1.6 + 0.5)) < 1e-9 && Math.abs(emoteDuration(EMOTES.WAVE) - 2.5) < 1e-9, [emoteDuration(EMOTES.UPRIGHT_ROW_DEMO), emoteDuration(EMOTES.MAH_GROOVE, 2), emoteDuration(EMOTES.WAVE)]);
ok('loopFor picks the SPLIT groove variant with leg bones', !!sampleClip(loopFor(EMOTES.MAH_GROOVE, 'SPLIT'), 0).bones.THIGH_L && !sampleClip(loopFor(EMOTES.MAH_GROOVE, 'FUSED'), 0).bones.THIGH_L);
ok('segmentsFor returns role B for paired emotes and solo segments otherwise', segmentsFor(EMOTES.PAIRED_GROOVE, 'B') === EMOTES.PAIRED_GROOVE.roles.B && segmentsFor(EMOTES.WAVE, 'B') === EMOTES.WAVE.segments);
ok('SQUAT requires SPLIT and explains it; other exercises work fused', EMOTES.SQUAT_DEMO.form === 'SPLIT' && /Separate/.test(EMOTES.SQUAT_DEMO.requirement_text) && EMOTES.UPRIGHT_ROW_DEMO.form === 'ANY');
ok('social emotes are directed, dances loop until cancel, exercises repeat 3×', ['WAVE', 'NOD', 'APPLAUD', 'THUMBS_UP', 'BECKON'].every(function (id) { return EMOTES[id].directed; }) && EMOTES.MAH_GROOVE.loops === 'until_cancel' && EMOTES.SIDE_GLIDE.loops === 'until_cancel' && EMOTES.HIP_HINGE_DEMO.loops === 3);
/* 6 choreography sanity: the intended joints actually move */
function maxAbs(clip, bone, axis) { var m = 0; for (var u2 = 0; u2 <= 1.0001; u2 += 0.02) { var b = sampleClip(clip, u2).bones[bone]; if (b) m = Math.max(m, Math.abs(b[axis])); } return m; }
ok('WAVE moves clavicle, shoulder, elbow, wrist and fingers', maxAbs(EMOTES.WAVE.segments.entry, 'CLAV_R', 2) > 0.2 && maxAbs(EMOTES.WAVE.segments.entry, 'UPPERARM_R', 2) > 1.2 && maxAbs(EMOTES.WAVE.segments.entry, 'FOREARM_R', 0) > 1 && maxAbs(EMOTES.WAVE.segments.entry, 'HAND_R', 2) > 0.4);
ok('APPLAUD brings both hands together repeatedly, in front of the chest', (function () {
  /* measured over the clapping window only: the first and last keys are the rest pose */
  var c = EMOTES.APPLAUD.segments.entry, near = 9, far = 0, front = 9;
  for (var u = 0.12; u <= 0.85; u += 0.01) { var b = sampleClip(c, u).bones; var gap = wrist('R', b).x - wrist('L', b).x;
    near = Math.min(near, gap); far = Math.max(far, gap); front = Math.min(front, wrist('L', b).z); }
  /* palms close to within a hand's width, open again by at least 0.15 m, and never come back onto the chest */
  return near < 0.30 && far - near > 0.15 && front > 0.24 && c.keys.length >= 8; })());
ok('DOUBLE_BICEPS: shoulders raised, elbows flexed, fists formed, chest expanded', maxAbs(EMOTES.DOUBLE_BICEPS.segments.entry, 'UPPERARM_L', 2) >= 1.4 && maxAbs(EMOTES.DOUBLE_BICEPS.segments.entry, 'FOREARM_R', 0) >= 1.25 && maxAbs(EMOTES.DOUBLE_BICEPS.segments.entry, 'FINGERS_L', 0) >= 1.3 && maxAbs(EMOTES.DOUBLE_BICEPS.segments.entry, 'CHEST', 0) > 0.08);
ok('SHRUG lifts both clavicles, turns palms up and uses brow asymmetry', maxAbs(EMOTES.SHRUG.segments.entry, 'CLAV_L', 2) > 0.3 && maxAbs(EMOTES.SHRUG.segments.entry, 'HAND_L', 0) > 0.35 && sampleClip(EMOTES.SHRUG.segments.entry, 0.55).face.brow_l > sampleClip(EMOTES.SHRUG.segments.entry, 0.55).face.brow_r + 0.2);
ok('MAH_GROOVE counter-rotates pelvis and chest (opposite side bend)', (function () { var s = sampleClip(EMOTES.MAH_GROOVE.segments.loop, 0); return s.bones.PELVIS[2] * s.bones.CHEST[2] < 0; })());
ok('SQUAT flexes hips (THIGH x − = thigh forward) and knees (SHIN x + = shin folds back), tips supporting, pelvis drops', (function () {
  var deep = sampleClip(EMOTES.SQUAT_DEMO.segments.loop, 0.5).bones;
  return deep.THIGH_L[0] < -0.8 && deep.SHIN_R[0] > 1.1 && deep.TIP_L[0] > 0.4 && deep.PELVIS[0] > 0.1; })());
ok('UPRIGHT_ROW raises elbows outward / upward with clavicle motion', maxAbs(EMOTES.UPRIGHT_ROW_DEMO.segments.loop, 'UPPERARM_L', 2) > 0.8 && maxAbs(EMOTES.UPRIGHT_ROW_DEMO.segments.loop, 'CLAV_R', 2) > 0.15);
ok('HORIZONTAL_PUSH extends the elbows at the reach', (function () { var s = sampleClip(EMOTES.HORIZONTAL_PUSH_DEMO.segments.loop, 0.45); return s.bones.FOREARM_L[0] > -0.4 && s.bones.UPPERARM_L[0] < -0.9; })());
ok('HIP_HINGE hinges pelvis and spine together with the head kept level', (function () { var s = sampleClip(EMOTES.HIP_HINGE_DEMO.segments.loop, 0.45); return s.bones.PELVIS[0] > 0.3 && s.bones.SPINE[0] > 0.2 && s.bones.HEAD[0] < 0; })());
ok('BACK_LAT_SPREAD turns the body away as a DISTRIBUTED yaw (pelvis + spine + chest) and returns', (function () {
  var c = EMOTES.BACK_LAT_SPREAD.segments.entry, best = 0, shares = null;
  for (var u = 0; u <= 1.0001; u += 0.02) { var b = sampleClip(c, u).bones;
    var pv = (b.PELVIS || [0, 0, 0])[1], sp = (b.SPINE || [0, 0, 0])[1], ch = (b.CHEST || [0, 0, 0])[1];
    if (pv + sp + ch > best) { best = pv + sp + ch; shares = [pv, sp, ch]; } }
  /* a real turn, but no single joint carries it: every share stays inside its own limit with room left */
  return best >= 1.4 && shares[0] <= LIMITS.PELVIS_y[1] && shares[1] <= LIMITS.SPINE_y[1] && shares[2] <= LIMITS.CHEST_y[1]
    && shares[0] > 0.2 && shares[1] > 0.2 && shares[2] > 0.2
    && sampleClip(EMOTES.BACK_LAT_SPREAD.segments.exit, 1).bones.PELVIS === undefined; })());
ok('QUIET_LAUGH: restrained torso oscillation with an amused face', maxAbs(EMOTES.QUIET_LAUGH.segments.entry, 'CHEST', 0) <= 0.08 && sampleClip(EMOTES.QUIET_LAUGH.segments.entry, 0.3).face.smile > 0.5);
ok('paired emotes carry offsets, facing and contact', EMOTES.FIST_BUMP.partner_offset_m === 1.1 && EMOTES.HIGH_FIVE.partner_facing === 'FACE' && EMOTES.PAIRED_GROOVE.partner_facing === 'SIDE' && EMOTES.PAIRED_GROOVE.contact_t === null);
/* 7 expressions, hand poses, class style */
var exProblems = []; EXPRESSION_NAMES.forEach(function (n) { var e = EXPRESSIONS[n]; if (!e) { exProblems.push(n + ' missing'); return; } Object.keys(FACE_RANGE).forEach(function (f) { if (f === 'blink') return; if (!(f in e.face)) exProblems.push(n + ': face.' + f + ' missing'); else if (e.face[f] < FACE_RANGE[f][0] || e.face[f] > FACE_RANGE[f][1]) exProblems.push(n + ': face.' + f + ' out of range'); }); if (!Array.isArray(e.head) || e.head.length !== 3 || e.head.some(function (x) { return Math.abs(x) > 0.3; })) exProblems.push(n + ': head'); if (typeof e.hold_s !== 'number') exProblems.push(n + ': hold_s'); });
ok('all 11 expressions complete and within range', exProblems.length === 0, exProblems);
ok('expressions are restrained (no permanent clench: |brow| ≤ 0.5, cheeks ≤ 0.6, jaw ≤ 0.25, smile ≤ 0.7)', EXPRESSION_NAMES.every(function (n) { var f = EXPRESSIONS[n].face; return Math.abs(f.brow_l) <= 0.5 && Math.abs(f.brow_r) <= 0.5 && f.cheek_l <= 0.6 && f.cheek_r <= 0.6 && f.jaw <= 0.25 && f.smile <= 0.7; }));
ok('WINCE is brief and closes the lids; CALM is near neutral', EXPRESSIONS.WINCE.hold_s <= 0.5 && EXPRESSIONS.WINCE.face.blink_bias >= 0.6 && Math.abs(EXPRESSIONS.CALM.face.brow_l) < 0.05 && EXPRESSIONS.CALM.face.smile < 0.1);
ok('hand poses complete', ['FIST', 'OPEN', 'RELAXED', 'GUARD', 'CAST', 'DIRECT'].every(function (p) { return HAND_POSES[p] && Number.isFinite(HAND_POSES[p].FINGERS) && Number.isFinite(HAND_POSES[p].HAND); }) && HAND_POSES.FIST.FINGERS > HAND_POSES.OPEN.FINGERS);
ok('class styles for the five classes only', Object.keys(CLASS_STYLE).sort().join(',') === 'ATHLETE,BAGE,LEAN,TITAN,VISIONARY' && Object.keys(CLASS_STYLE).every(function (c) { return CLASS_STYLE[c].amp > 0 && CLASS_STYLE[c].speed > 0 && typeof CLASS_STYLE[c].settle === 'string'; }));
ok('face channel list matches the contract', FACE_CHANNELS.join(',') === 'brow_l,brow_r,cheek_l,cheek_r,jaw,smile,blink,blink_bias,gaze_x,gaze_y');
/* 7 HARD JOINT LIMITS — every key of every clip, including partner roles and form variants.
   A clamped clip looks frozen, so the data must already be legal: the animator's clamp is a safety net,
   never the thing that shapes these poses. */
function limitOf(bone, axis) { var r = LIMITS[bone.replace(/_(L|R)$/, '') + '_' + axis]; return (r && r.length === 2) ? r : null; }
function eachAuthoredKey(fn) {
  var n = 0;
  EMOTE_ORDER.forEach(function (id) {
    var e = EMOTES[id]; if (!e) return;
    function segs(g, tag) { if (!g) return; ['entry', 'loop', 'exit'].forEach(function (nm) { var c = g[nm]; if (!c || !c.keys) return;
      c.keys.forEach(function (k, ki) { n++; fn(id + tag + '.' + nm + '[' + ki + ' t=' + k.t + ']', k, c, e); }); }); }
    segs(e.segments, '');
    if (e.roles) Object.keys(e.roles).forEach(function (r) { segs(e.roles[r], '{role ' + r + '}'); });
    if (e.form_variants) Object.keys(e.form_variants).forEach(function (v) { segs(e.form_variants[v], '{form ' + v + '}'); });
  });
  return n;
}
var AXES = ['x', 'y', 'z'];
var limitProblems = [], keyCount = 0, channelCount = 0;
keyCount = eachAuthoredKey(function (label, k, clip) {
  /* a clip that is NOT marked no_scale could be multiplied by the largest class amplitude, so it is
     held to the stricter standard; every clip here is marked, and the marking itself is asserted below */
  var factor = clip.no_scale ? 1 : MAX_CLASS_AMP;
  Object.keys(k.bones || {}).forEach(function (b) {
    AXES.forEach(function (ax, i) { var r = limitOf(b, ax); if (!r) return; channelCount++; var emId = String(label).split('.')[0].replace(/:.*$/, ''); var ed = EMOTES[emId]; var ov = ed && ed.allowance && PROFILE.pose_overrides && PROFILE.pose_overrides[ed.allowance] ? PROFILE.pose_overrides[ed.allowance].limits_rad : null; var base = b.replace(/_(L|R)$/, ''); if (ov && ov[base + '_' + ax]) r = ov[base + '_' + ax];   /* an emote's NAMED allowance (rig_profile pose_overrides, e.g. PERCH knees) */
      var v = (k.bones[b][i] || 0) * factor;
      if (v < r[0] - 1e-9 || v > r[1] + 1e-9) limitProblems.push(label + ' ' + b + '.' + ax + ' = ' + v.toFixed(3) + ' outside [' + r[0] + ', ' + r[1] + ']'); });
  });
});
ok('every authored key of every clip (segments, roles, form variants) is inside rig_profile limits_rad', limitProblems.length === 0, limitProblems.slice(0, 10));
ok('the limit sweep actually covered the whole catalogue', keyCount >= 180 && channelCount >= 1200, { keys: keyCount, channels: channelCount });

/* the class-amplitude contract: RigAnimator plays emote clips with setBones(s.bones, 1), so CLASS_STYLE.amp
   never scales an authored angle. Poses that sit AT a limit on purpose (the ≈105°-inside DOUBLE_BICEPS elbow)
   would break if a future layer multiplied them, so every clip carries no_scale and the test enforces it. */
var unmarked = [];
eachAuthoredKey(function (label, k, clip) { if (!clip.no_scale) unmarked.push(label); });
ok('every clip is marked no_scale (CLASS_STYLE.amp must not multiply authored bone values)', unmarked.length === 0, unmarked.slice(0, 6));
ok('MAX_CLASS_AMP matches the largest CLASS_STYLE amplitude', Math.abs(MAX_CLASS_AMP - Math.max.apply(null, Object.keys(CLASS_STYLE).map(function (c) { return CLASS_STYLE[c].amp; }))) < 1e-9, MAX_CLASS_AMP);
ok('at least one authored pose uses the full art-direction elbow (a squeeze must not be left short)',
  (function () { var deepest = 0; eachAuthoredKey(function (l, k) { ['FOREARM_L', 'FOREARM_R'].forEach(function (b) { if (k.bones[b]) deepest = Math.min(deepest, k.bones[b][0]); }); }); return deepest <= LIMITS.FOREARM_x[0] + 0.05; })());

/* 8 BEAM HINTS: every emote's one-word hint resolves to an envelope, and every key carries a weight. */
var beamProblems = [];
eachAuthoredKey(function (label, k, clip, e) {
  var h = BEAM_HINTS[e.beams];
  if (!h) { beamProblems.push(label + ': unknown beams hint ' + e.beams); return; }
  if (!Number.isFinite(k.beam)) beamProblems.push(label + ': no beam weight');
});
ok('every emote carries a known beams hint and every key a finite beam weight', beamProblems.length === 0, beamProblems.slice(0, 6));
ok('dances pulse, exercises and flexes brace, social and expression emotes stay near idle', (function () {
  function peak(id) { var m = 0; var e = EMOTES[id]; var g = e.segments || e.roles.A;
    ['entry', 'loop', 'exit'].forEach(function (n) { if (g[n]) g[n].keys.forEach(function (k) { m = Math.max(m, k.beam || 0); }); }); return m; }
  return EMOTE_ORDER.every(function (id) { var e = EMOTES[id], p = peak(id);
    if (e.beams === 'brace') return p >= 1.2;
    if (e.beams === 'pulse') return p >= 1.2;
    return p <= 1.2; }); })(),
  EMOTE_ORDER.map(function (id) { return id + ':' + EMOTES[id].beams; }));

/* 9 BODY CLEARANCE. Big deltoids and arms mean the hands travel AROUND the chest, never through it.
   The reference is the RELAXED REST ARM, exactly as RigAnimator's own clearance step measures it: on a
   real body the hanging elbow already sits beside the ribs, so the rule that means anything is
   "no authored pose may drive the elbow or hand DEEPER into the torso than the relaxed arm already is".
   Approximate on purpose — clip values are additive offsets over the animator's base pose — so this
   catches arms entering the torso, not millimetres. */
function rotXYZ(v, e) { var cx = Math.cos(e[0]), sx = Math.sin(e[0]), cy = Math.cos(e[1]), sy = Math.sin(e[1]), cz = Math.cos(e[2]), sz = Math.sin(e[2]);
  var x1 = v.x * cz - v.y * sz, y1 = v.x * sz + v.y * cz, z1 = v.z;
  var x2 = x1 * cy + z1 * sy, y2 = y1, z2 = -x1 * sy + z1 * cy;
  return { x: x2, y: y2 * cx - z2 * sx, z: y2 * sx + z2 * cx }; }
function armPts(side, bones) { var Z = [0, 0, 0];
  var ua = (bones && bones['UPPERARM_' + side]) || Z, fa = (bones && bones['FOREARM_' + side]) || Z;
  var sh = { x: (side === 'L' ? -1 : 1) * SEGMENTS_REF.shoulder.x, y: SEGMENTS_REF.shoulder.y, z: SEGMENTS_REF.shoulder.z };
  var u = rotXYZ({ x: 0, y: -SEGMENTS_REF.upperarm_m, z: 0 }, ua);
  var elbow = { x: sh.x + u.x, y: sh.y + u.y, z: sh.z + u.z };
  var f = rotXYZ(rotXYZ({ x: 0, y: -SEGMENTS_REF.forearm_m, z: 0 }, fa), ua);
  return { elbow: elbow, hand: { x: elbow.x + f.x, y: elbow.y + f.y, z: elbow.z + f.z } }; }
function wrist(side, bones) { return armPts(side, bones).hand; }
function depth(p, pad) { function into(v) { if (!v) return 0;
    var dx = (p.x - v.cx) / (v.rx + pad), dy = (p.y - v.cy) / (v.ry + pad), dz = (p.z - v.cz) / (v.rz + pad);
    var d = dx * dx + dy * dy + dz * dz; return d < 1 ? 1 - d : 0; }
  return Math.max(into(CLEAR.ribcage), into(CLEAR.pelvis)); }
var REST = {}; ['L', 'R'].forEach(function (side) { var q = armPts(side, null);
  REST[side] = { e: depth(q.elbow, CLEAR.min_elbow_to_ribs_m), h: depth(q.hand, CLEAR.min_hand_to_chest_m) }; });
var clearProblems = [];
eachAuthoredKey(function (label, k) { ['L', 'R'].forEach(function (side) { var q = armPts(side, k.bones);
  if (depth(q.elbow, CLEAR.min_elbow_to_ribs_m) > REST[side].e + 1e-6) clearProblems.push(label + ' ' + side + ' elbow inside the ribcage');
  if (depth(q.hand, CLEAR.min_hand_to_chest_m) > REST[side].h + 1e-6) clearProblems.push(label + ' ' + side + ' hand closer to the chest than ' + CLEAR.min_hand_to_chest_m + ' m'); }); });
ok('no authored pose drives an elbow into the ribcage or a hand onto the chest', clearProblems.length === 0, clearProblems.slice(0, 8));
ok('the reference body measurements are present and plausible', SEGMENTS_REF.upperarm_m > 0.2 && SEGMENTS_REF.upperarm_m < 0.4 && SEGMENTS_REF.forearm_m > 0.15 && SEGMENTS_REF.forearm_m < 0.35 && SEGMENTS_REF.shoulder.y > 1.2, SEGMENTS_REF);

/* 10 HAND POSES: distinguishable shapes, all inside FINGERS_x / HAND_x with headroom. */
var handProblems = [];
Object.keys(HAND_POSES).forEach(function (n) { var p = HAND_POSES[n];
  if (p.FINGERS < LIMITS.FINGERS_x[0] || p.FINGERS > LIMITS.FINGERS_x[1]) handProblems.push(n + ': FINGERS ' + p.FINGERS + ' outside ' + JSON.stringify(LIMITS.FINGERS_x));
  if (p.HAND < LIMITS.HAND_x[0] || p.HAND > LIMITS.HAND_x[1]) handProblems.push(n + ': HAND ' + p.HAND + ' outside ' + JSON.stringify(LIMITS.HAND_x)); });
ok('hand poses stay inside FINGERS_x and HAND_x', handProblems.length === 0, handProblems);
ok('hand poses are meaningfully distinct: closed fist, braced guard, open palm, directing palm, casting shape', (function () {
  var H = HAND_POSES;
  var closed = H.FIST.FINGERS >= 1.25 && H.GUARD.FINGERS >= 1.0 && H.GUARD.HAND >= 0.2;      /* fist + braced guard */
  var open = H.OPEN.FINGERS <= 0.1 && H.DIRECT.FINGERS <= 0.2 && H.DIRECT.HAND <= -0.3;      /* flat hand + presenting palm */
  var cast = H.CAST.FINGERS <= 0.3 && H.CAST.HAND <= -0.4;                                    /* splayed, wrist cocked back */
  var spread = Object.keys(H).length >= 6 && (H.FIST.FINGERS - H.OPEN.FINGERS) > 1.0;
  return closed && open && cast && spread; })(), HAND_POSES);

console.log('\nRESULT anim data: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
