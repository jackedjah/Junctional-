/* MAHWORLD :: MUSCLE PRESENTATION LAYER (motion precision pass, section F)
   A reusable three-layer muscle system on top of the derivative rig:
     LAYER 1  skeleton — the RigAnimator's composed pose (bones / joints / primary motion). Read here, never written.
     LAYER 2  muscle morphs / correctives — sparse morph targets baked by make_class_rig_v4 on the body mesh (BICEPS/TRICEPS/DELTOID/PEC/LAT/
              FOREARM per side, TRAP, ABS). `muscle.<NAME>` 0..1 = morph influence.
     LAYER 3  fine tension — the same value drives the per-group tension uniform read through the `_muscle` vertex attribute: normal-map
              strength rises and roughness drops on that muscle only (GlbCharacter.js shader hook), so striations read under contraction.
   Semantic controls: muscle.BICEPS_L, muscle.BICEPS_R, muscle.TRICEPS_L/R, muscle.DELTOID_L/R, muscle.PEC_L/R, muscle.LAT_L/R, muscle.FOREARM_L/R,
   muscle.TRAP, muscle.ABS — conceptually 0..1. Drivers (all additive, max-combined, then smoothed: 80 ms attack / 320 ms release):
     · JOINT POSE   elbow flexion → biceps (+ forearm, − triceps), arm elevation → deltoid, arms drawn back/down → lats, arms forward/in → pecs,
                    shoulder elevation → traps, trunk flexion → abs   (from the bones' live quaternions, so every layer above counts)
     · ATTACKS      the exercise family's arc (RigAnimator.attackArc): PUSH → pec + triceps + deltoid, PULL → lat + biceps, HINGE → glute/abs
                    (abs here), ROTATION → abs + obliques (abs), SQUAT → abs
     · FLEX EMOTES  animData emote `muscles` map with the entry-clip envelope (DOUBLE_BICEPS lights the biceps, LAT_SPREAD the lats, ...)
     · EXPLICIT     set(name, v, holdS) from scripts / dev panel / later animation events.
   Nothing here touches the authority, the skeleton or the mesh topology; if the figure has no muscle morphs every call is a no-op. */
export function createMuscleLayer(THREE, rig, opts) {
  opts = opts || {}; var names = (rig && rig.muscleNames) || []; var on = names.length > 0;
  var cur = {}, target = {}, explicit = {}, attackK = opts.attack_k || 12, releaseK = opts.release_k || 3.2;
  names.forEach(function (n) { cur[n] = 0; target[n] = 0; });
  var tmpE = new THREE.Euler(); var deadband = 0.03;
  function has(n) { return target[n] !== undefined; }
  function want(n, v) { if (has(n) && v > target[n]) target[n] = Math.min(1, v); }
  function euler(bone) { if (!bone) return null; tmpE.setFromQuaternion(bone.quaternion, 'XYZ'); return tmpE; }
  function smooth01(x, a, b) { var t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-6, b - a))); return t * t * (3 - 2 * t); }
  /* pose-driven contraction from the live bones (layer 1 → 2/3) */
  function fromPose(bones) {
    if (!bones) return;
    ['L', 'R'].forEach(function (S) {
      var fa = euler(bones['FOREARM_' + S]); var flex = fa ? Math.max(0, -fa.x) : 0;                 /* forearm flexion: negative x on this rig = bend */
      var bi = smooth01(flex, 0.25, 1.25); want('BICEPS_' + S, bi); want('FOREARM_' + S, 0.55 * bi);
      var ua = euler(bones['UPPERARM_' + S]); if (ua) { var abd = Math.abs(ua.z), fl = Math.abs(ua.x); var elev = smooth01(Math.max(abd, fl), 0.45, 1.5); want('DELTOID_' + S, elev); want('TRICEPS_' + S, 0.7 * smooth01(fl, 0.9, 1.7) * (1 - bi)); var back = smooth01(ua.x, 0.15, 0.7); want('LAT_' + S, 0.85 * back); var fwdIn = smooth01(-ua.x, 0.5, 1.3) * smooth01(0.9 - abd, 0.0, 0.5); want('PEC_' + S, 0.8 * fwdIn); }
      var cl = euler(bones['CLAV_' + S]); if (cl) want('TRAP', 0.9 * smooth01(Math.abs(cl.z), 0.12, 0.4));
      if (ua) { var elevA = Math.max(Math.abs(ua.z), Math.abs(ua.x)); want('SHOULDER_' + S, smooth01(elevA, 0.22, 1.25)); want('AXILLA_' + S, smooth01(elevA, 1.45, 2.15));   /* dev_0.10 blobs (no-ops on rig v5) */
        /* rig v5 CORRECTIVE LIBRARY: elevation windows (tents) — 45° pec insertion / anterior fold, 90° deltoid cap + axillary fold, 120° axilla + lat-teres, 150°+ superior (acromion / upper trap / scapular region) */
        var tent = function (x, c, w) { return Math.max(0, 1 - Math.abs(x - c) / w); };
        want('SH45_' + S, tent(elevA, 0.79, 0.55)); want('SH90_' + S, tent(elevA, 1.57, 0.6)); want('SH120_' + S, tent(elevA, 2.09, 0.55)); want('SH150_' + S, smooth01(elevA, 2.2, 2.75)); }   /* shoulder corrective: fills the LBS volume loss as the arm elevates (v4.1 morph, no tension) */
    });
    var sp = euler(bones.SPINE); if (sp) want('ABS', 0.8 * smooth01(sp.x, 0.12, 0.45));
  }
  /* attack arcs by exercise family */
  function fromArc(arc) {
    if (!arc) return; var R = Math.max(0, arc.release || 0), L = Math.max(0, arc.load || 0), k = Math.max(L * 0.6, R);
    if (arc.pat === 'PUSH' || arc.pat === 'HORIZONTAL_PUSH') { ['L', 'R'].forEach(function (S) { want('PEC_' + S, k); want('TRICEPS_' + S, k); want('DELTOID_' + S, 0.8 * k); }); want('ABS', 0.5 * k); }
    else if (arc.pat === 'PULL' || arc.pat === 'UPRIGHT_ROW') { ['L', 'R'].forEach(function (S) { want('LAT_' + S, k); want('BICEPS_' + S, 0.9 * k); want('FOREARM_' + S, 0.6 * k); }); want('TRAP', 0.8 * k); }
    else if (arc.pat === 'HINGE' || arc.pat === 'SQUAT') { want('ABS', k); ['L', 'R'].forEach(function (S) { want('LAT_' + S, 0.4 * k); }); }
    else if (arc.pat === 'ROTATION') { want('ABS', k); ['L', 'R'].forEach(function (S) { want('LAT_' + S, 0.6 * k); want('DELTOID_' + S, 0.5 * k); }); }
    else { ['L', 'R'].forEach(function (S) { want('DELTOID_' + S, 0.6 * k); want('TRICEPS_' + S, 0.6 * k); }); }
  }
  /* flex emotes: animData emote.muscles with the entry envelope (rise over the first third, hold, release over the last fifth) */
  function fromEmote(em, emotes) {
    if (!em || !em.id || !emotes) return; var def = emotes[em.id]; if (!def || !def.muscles) return;
    var env = 1; if (em.seg === 'entry') { var dur = def.segments && def.segments.entry ? (def.segments.entry.duration_s || def.segments.entry.duration || 2.5) : 2.5; var p = Math.max(0, Math.min(1, em.t / Math.max(0.1, dur))); env = p < 0.33 ? smooth01(p, 0.05, 0.33) : (p > 0.82 ? 1 - smooth01(p, 0.82, 1) : 1); } else if (em.seg === 'exit') env = 0;
    Object.keys(def.muscles).forEach(function (n) { want(n, def.muscles[n] * env); });
  }
  var api = {
    enabled: on, names: names.slice(),
    /* explicit control (scripts / dev / animation events): holds v for holdS seconds, then releases */
    set: function (name, v, holdS) { if (!has(name)) return false; explicit[name] = { v: Math.max(0, Math.min(1, v || 0)), until: (holdS === undefined ? 0.5 : holdS) }; return true; },
    get: function (name) { return cur[name] || 0; },
    snapshot: function () { var o = {}; names.forEach(function (n) { if (cur[n] > 0.01) o[n] = +cur[n].toFixed(2); }); return o; },
    /* one update per frame: bones = live bones, ctx = { arc, emote, emotes } */
    update: function (dt, bones, ctx) {
      if (!on) return; names.forEach(function (n) { target[n] = 0; });
      fromPose(bones); if (ctx) { fromArc(ctx.arc); fromEmote(ctx.emote, ctx.emotes); }
      Object.keys(explicit).forEach(function (n) { var ex = explicit[n]; ex.until -= dt; if (ex.until <= 0) delete explicit[n]; else want(n, ex.v); });
      names.forEach(function (n) { var t = target[n] < deadband ? 0 : target[n]; var k = t > cur[n] ? attackK : releaseK; cur[n] += (t - cur[n]) * Math.min(1, dt * k); if (Math.abs(cur[n]) < 0.002) cur[n] = 0; if (rig.setMuscle) rig.setMuscle(n, cur[n]); });
    }
  };
  return api;
}
