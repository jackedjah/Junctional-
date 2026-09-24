"""RigAnimator.js — master convergence pass: distributed trunk, scapula rhythm, twist carriers, inertialization, support-tip IK, pelvis life."""
import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'RigAnimator.js')
s = open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)

# ---- state for inertialization + support anchors
rep("  var st = { t: rnd() * 10, prevSpeed: 0, prevSpeedMps: 0, brake: 0, yawPrev: null, turn: 0, turnAnt: 0, calm: 0, airborne: false,",
    "  var st = { t: rnd() * 10, prevSpeed: 0, prevSpeedMps: 0, brake: 0, yawPrev: null, turn: 0, turnAnt: 0, calm: 0, airborne: false, inert: { key: null, off: {}, t: 1, dur: 0.22 }, support: { L: null, R: null }, applied: {}, balanceT: rnd() * 9,")

# ---- support-tip IK inside the separated gait (after the authored leg curve; before the pelvis lines)
rep("        set('TIP_L', 0.18 * swL * stride * (0.4 + 0.6 * gL) - 0.06 * stride * sL); set('TIP_R', 0.18 * swR * stride * (0.4 + 0.6 * gR) - 0.06 * stride * sR);   /* the swing tip levels up as it comes forward: positive clearance, never a plant */",
    """        set('TIP_L', 0.18 * swL * stride * (0.4 + 0.6 * gL) - 0.06 * stride * sL); set('TIP_R', 0.18 * swR * stride * (0.4 + 0.6 * gR) - 0.06 * stride * sR);   /* the swing tip levels up as it comes forward: positive clearance, never a plant */
        /* SUPPORT-TIP CONSTRAINT (motion-matching principle, hover version of foot locking): while a leg carries support its tip HOLDS its
           position over the ground (a hover thrust point, never a plant) — the anchor is carried backwards by the body's own travel and the
           hip-knee-tip chain is solved by two-bone IK in the sagittal plane so the leg reads as pushing the body past a point instead of
           skating. Reach is capped at 0.86 of the measured leg; beyond it the anchor slips (the species glides, it does not root). */
        (function () {
          var vzL = speedMps * Math.sqrt(Math.max(0, 1 - (view.lateral || 0) * (view.lateral || 0))) * (back ? -1 : 1), vxL = speedMps * (view.lateral || 0);
          var Lt = SEG.thigh, Ls = SEG.shin, reach = 0.86 * (Lt + Ls);
          ['L', 'R'].forEach(function (S) {
            var sup = S === 'L' ? sL : sR; var th = E['THIGH_' + S], sh = E['SHIN_' + S]; if (!th || !sh) return;
            var a0 = th.x, k0 = sh.x;                                                            /* authored sagittal angles (mesh space: +x rotation swings the hanging bone BACK) */
            var fk = function (a, k) { return { z: -Lt * Math.sin(a) - Ls * Math.sin(a + k), y: -Lt * Math.cos(a) - Ls * Math.cos(a + k) }; };
            var tip = fk(a0, k0); var anc = st.support[S];
            if (sup > 0.55 && !st.airborne && speedMps > 0.4) {
              if (!anc) anc = st.support[S] = { z: tip.z, y: tip.y, w: 0 };
              anc.z -= vzL * dt * 0.9; anc.w = Math.min(1, anc.w + dt * 9);                       /* the body travels forward: the held point drifts back under the hip (10 % slip) */
              var D = Math.hypot(anc.z, anc.y); if (D > reach) { var kk = reach / D; anc.z *= kk; anc.y *= kk; D = reach; }
              var cosK = clamp((Lt * Lt + Ls * Ls - D * D) / (2 * Lt * Ls), -1, 1); var knee = Math.PI - Math.acos(cosK);   /* flexion from straight */
              var ang = Math.atan2(-anc.z, -anc.y);                                                 /* direction hip -> tip measured from straight down, + = backwards */
              var inner = Math.atan2(Ls * Math.sin(knee), Lt + Ls * Math.cos(knee));               /* thigh leads the tip direction by the knee's offset */
              var thigh = ang - inner; var w = sup >= 0.7 ? anc.w : anc.w * (sup - 0.55) / 0.15;
              th.x = a0 + (thigh - a0) * w; sh.x = k0 + (knee - k0) * w;
            } else if (anc) { anc.w -= dt * 6; if (anc.w <= 0) st.support[S] = null; else { var w2 = Math.max(0, anc.w); th.x = a0 + (Math.atan2(-anc.z, -anc.y) - a0) * w2 * 0.5; } }
          });
        })();""")

# ---- pelvis life in the gait: vertical displacement + lateral weight shift (already roll) → add heave via the hover lift path
rep("      var bob = st.showLegs && speed01 > 0.05 ? 0.35 * hClear * (0.5 - 0.5 * Math.cos(2 * st.gait.phase)) * Math.min(1, speed01 * 2) : 0;",
    "      var bob = st.showLegs && speed01 > 0.05 ? (0.35 * hClear + 0.018 * Math.min(1, speed01 * 1.5)) * (0.5 - 0.5 * Math.cos(2 * st.gait.phase)) * Math.min(1, speed01 * 2) : 0;   /* pelvis heave: twice per cycle, ~2 cm at speed (the pelvis rides the support, it is not a fixed beam) */")

# ---- scapula rhythm + twist carriers + trunk distribution (after the clavicle rhythm block)
rep("        if (E.CHEST) setRaw('CHEST', 0, 0, -rigOutSign(side) * 0.10 * Math.max(0, abd - 0.7));   /* the ribcage leans a little under a high arm */\n      });",
    """        if (E.CHEST) setRaw('CHEST', 0, 0, -rigOutSign(side) * 0.10 * Math.max(0, abd - 0.7));   /* the ribcage leans a little under a high arm */
        /* SCAPULA (rig v5): nonlinear scapulohumeral rhythm — little below 30°, then upward rotation ~1:2.2 to 90°, ~1:1.6 above, plus
           posterior tilt past 100° and a touch of external axial rotation; the girdle visibly carries the high arm. */
        var elevT = Math.max(abd, flex); var upRot = 0.45 * Math.max(0, elevT - 0.5) + 0.25 * Math.max(0, elevT - 1.6); var postTilt = -0.18 * Math.max(0, elevT - 1.75); var axial = 0.10 * Math.max(0, elevT - 1.2);
        setRaw('SCAP_' + side, postTilt, rigOutSign(side) * axial, rigOutSign(side) * upRot);
        if (E.SPINE2) setRaw('SPINE2', -0.03 * Math.max(0, elevT - 1.4), 0, -rigOutSign(side) * 0.04 * Math.max(0, elevT - 1.4));   /* upper thorax answers overhead reach */
      });
      /* TWIST CARRIERS (rig v5): axial rotation of the humerus / forearm is split so the deltoid keeps its shape while the distal segment turns */
      ['L', 'R'].forEach(function (side) { var ua = E['UPPERARM_' + side], tw = E['ARMTWIST_' + side]; if (ua && tw) { tw.y += ua.y * 0.6; ua.y *= 0.4; } var fa = E['FOREARM_' + side], ft = E['FORETWIST_' + side]; if (fa && ft) { ft.y += fa.y * 0.55; fa.y *= 0.45; } });
      /* DISTRIBUTED TRUNK (rig v5): every authored SPINE / CHEST value propagates through LUMBAR / SPINE2 so flexion, side-bend and
         rotation read along the whole trunk instead of at two hinges (totals unchanged: children inherit) */
      if (E.LUMBAR && E.SPINE) { E.LUMBAR.x += E.SPINE.x * 0.42; E.LUMBAR.y += E.SPINE.y * 0.35; E.LUMBAR.z += E.SPINE.z * 0.45; E.SPINE.x *= 0.58; E.SPINE.y *= 0.65; E.SPINE.z *= 0.55; }
      if (E.SPINE2 && E.CHEST) { E.SPINE2.x += E.CHEST.x * 0.38; E.SPINE2.y += E.CHEST.y * 0.40; E.SPINE2.z += E.CHEST.z * 0.40; E.CHEST.x *= 0.62; E.CHEST.y *= 0.60; E.CHEST.z *= 0.60; }""")

# ---- inertialization at the apply step: state changes blend from the last applied pose, not from a restarted clip
rep("      var a = Math.min(1, dt * rate); var pose = {};\n      Object.keys(B).forEach(function (k) { var e = E[k]; pose[k] = [e.x, e.y, e.z]; tmpE.set(e.x, e.y, e.z, 'XYZ'); tmpQ.setFromEuler(tmpE); B[k].quaternion.slerp(tmpQ, a); });\n      st.pose = pose;",
    """      /* INERTIALIZATION: when the discrete state changes (attack / guard / emote / form / airborne / hit), the offset between the last
         applied pose and the new composed pose is captured and decayed with a quintic over ~0.22 s (0.12 s for attacks) — continuity of
         pose and velocity without a low-pass on the continuous layers (the gait keeps its own oscillator). */
      var inert = st.inert; var ikey = [at ? at.attack_id + ':' + at.state : '', v.guard || '', emKey || '', v.form || '', st.airborne ? 'A' : 'G', hitAgo < 0.4 ? 'H' : '', v.dash ? 'D' : '', isTf ? ms : ''].join('|');
      if (inert.key !== null && ikey !== inert.key) { var offs = {}; Object.keys(B).forEach(function (k) { var ap = st.applied[k]; if (!ap) return; var e = E[k]; offs[k] = [ap[0] - e.x, ap[1] - e.y, ap[2] - e.z]; }); inert.off = offs; inert.t = 0; inert.dur = at ? 0.12 : (isTf ? 0.16 : 0.22); }
      inert.key = ikey; inert.t = Math.min(1, inert.t + dt / Math.max(0.05, inert.dur)); var q5 = 1 - inert.t; var decay = q5 * q5 * q5 * (q5 * (6 * q5 - 15) + 10) * 0 + Math.pow(q5, 3);   /* cubic-out decay of the captured offset */
      var a = Math.min(1, dt * Math.max(rate, 24)); var pose = {};
      Object.keys(B).forEach(function (k) { var e = E[k]; var o = inert.off[k]; var ex = e.x, ey = e.y, ez = e.z; if (o && decay > 0.001) { ex += o[0] * decay; ey += o[1] * decay; ez += o[2] * decay; } pose[k] = [ex, ey, ez]; tmpE.set(ex, ey, ez, 'XYZ'); tmpQ.setFromEuler(tmpE); B[k].quaternion.slerp(tmpQ, a); st.applied[k] = pose[k]; });
      st.pose = pose;""")

# ---- active idle: slow weight/pelvis balance shift + shoulder settling (no jitter, long periods)
rep("      st.central = 1; st.tips = 0; st.seam = 0; st.aura = 0; var beamF = DB.fused_idle || 1, beamL = 0, beamR = 0;",
    "      st.balanceT += dt; var balW = 0.5 - 0.5 * Math.cos(st.balanceT * Math.PI * 2 / 9.0); var balSide = Math.sin(st.balanceT * Math.PI * 2 / 9.0); set('PELVIS', 0, 0, 0.018 * balSide * calm); set('LUMBAR', 0, 0, -0.010 * balSide * calm); set('CHEST', 0, 0, -0.008 * balSide * calm); set('CLAV_L', -0.010 * balW * calm); set('CLAV_R', -0.010 * balW * calm);   /* ACTIVE IDLE: a 9 s weight shift through pelvis / lumbar / chest, shoulders settling with it */\n      st.central = 1; st.tips = 0; st.seam = 0; st.aura = 0; var beamF = DB.fused_idle || 1, beamL = 0, beamR = 0;")
open(p, 'w', encoding='utf-8').write(s); print('patched RigAnimator.js')
