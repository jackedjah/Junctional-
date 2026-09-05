/* MR.MAH 3D :: THE CHARACTER
   Assembles head, body and limbs into one canonical Mr.Mah and drives him.

   Interface note: this exposes exactly what `character.js` used to — `root`,
   `update`, `setYaw`, `getYaw`, `dispose` — so the composition root did not
   have to change to adopt a real character. `isPlaceholder` is now false, and
   `setState` is added for the behaviour layer.

   The model is authored with its ORIGIN AT THE TORSO TIP, Y up. Everything in
   proportions.js is measured from that point, so the whole character can be
   floated, bobbed or scaled by moving one group without any part drifting
   relative to another. */

import { Group, MathUtils, MeshBasicMaterial, MeshLambertMaterial } from '../../vendor/three/three.module.min.js';
import { createCrystalMaterials } from './materials.js';
import { buildHead } from './head.js';
import { buildBody } from './body.js';
import { buildLimbs } from './limbs.js';
import { createStateMachine } from './states.js';
import { setInnerLight, setRimDirections } from './crystal-shader.js';
import { HALO_LAYER } from '../bloom.js';
import { HEIGHT, FLOAT, HEAD } from './proportions.js';
import { proportionsFor } from './variants.js';

export function createMrMah(options) {
  var opts = options || {};
  var materials = createCrystalMaterials({ tint: opts.tint, envMap: opts.envMap });

  /* root -> float -> rig
     `float` carries hover and bob so the pose rig never has to know about
     them; `rig` carries yaw so dragging cannot fight the hover. */
  var root = new Group();
  root.name = 'mrmah';
  var float = new Group();
  float.name = 'mrmah-float';
  var rig = new Group();
  rig.name = 'mrmah-rig';
  root.add(float);
  float.add(rig);

  /* R96 — one renderer, one body pipeline, a PROPORTION SET per variant
     (variants.js). The head is shared: the face is the identity. */
  var P = proportionsFor(opts.variant);
  var head = buildHead(materials);
  var body = buildBody(materials, P);
  var limbs = buildLimbs(materials, P);
  rig.add(body.group);
  rig.add(limbs.group);
  rig.add(head.group);

  /* R94 — flag every solid of his for the silhouette-halo pass (bloom.js
     renders HALO_LAYER alone as a mask). Meshes only: the edge lines would
     thicken the mask with their own width and the halo would inherit a cage. */
  root.traverse(function (o) { if (o.isMesh) o.layers.enable(HALO_LAYER); });

  float.position.y = FLOAT.height;

  var states = createStateMachine();

  /* R94 — the taper's internal light breathes with him. Its authored strength
     is read back from the material rather than repeated here (the duplicated
     baseline bug), and the source drifts a little up and down the taper so the
     flanks' glow moves even when the body is momentarily still. */
  var innerBase = (materials.body.userData.crystal && materials.body.userData.crystal.uInnerStrength.value) || 0;
  var innerY = (materials.body.userData.crystal && materials.body.userData.crystal.uInnerLight.value.y) || 0.4;

  var yaw = 0;
  var time = 0;
  var blinkTimer = 2.4;
  var driftLag = 0;
  var blink = 0;

  /* Rest orientations, captured so every animated joint eases back to the
     measured reference pose instead of to an arbitrary zero. */
  var rest = {
    headRotX: head.group.rotation.x,
    headRotZ: head.group.rotation.z,
    leftShoulder: limbs.left.shoulderJoint.rotation.clone(),
    rightShoulder: limbs.right.shoulderJoint.rotation.clone(),
    leftElbow: limbs.left.elbowJoint.rotation.clone(),
    rightElbow: limbs.right.elbowJoint.rotation.clone(),
    leftWrist: limbs.left.wristJoint.rotation.clone(),
    rightWrist: limbs.right.wristJoint.rotation.clone(),
    bodyRotY: body.group.rotation.y,
    bodyRotX: body.group.rotation.x
  };

  function setYaw(radians) {
    yaw = Number(radians) || 0;
    rig.rotation.y = yaw;
    return yaw;
  }
  function getYaw() { return yaw; }

  function update(dt, o) {
    var conf = o || {};
    var reduced = !!conf.reducedMotion;
    var v = states.update(dt);
    time += dt;

    materials.setGlow(v.glow * (conf.glowScale == null ? 1 : conf.glowScale));
    /* R98 — the hand crystal's lamp rides the same pulse as the emitters. */
    if (limbs.handLamp) limbs.handLamp.intensity = 0.95 * v.glow;
    /* R99 — THE CRYSTAL LEVITATES over the palm: a slow rise and fall of a
       few millimetres and a slight roll, out of phase with the hover, so it
       reads as held by control rather than glued to the fingertips. Off
       under reduced motion, like everything else that moves. */
    var crystal = limbs.left && limbs.left.crystal;
    if (crystal && !reduced) {
      var lev = Math.sin(time * 0.9 + 1.3) * 0.007;
      crystal.plate.position.y = crystal.restY + lev;
      crystal.glow.position.y = crystal.restY + lev;
      crystal.plate.rotation.z = Math.sin(time * 0.55) * 0.07;
      crystal.glow.rotation.z = crystal.plate.rotation.z;
      /* R106: PRECESSION — the plate turns slowly about its own axis (a
         40-second revolution) so its facets travel through the light; the
         glow card faces the camera and does not turn. */
      crystal.plate.rotation.y = time * 0.16;
    }

    if (reduced) {
      /* Reduced motion keeps him present but still: hover holds at its
         mid-point and no joint oscillates. */
      float.position.y = FLOAT.height;
      head.group.rotation.x = rest.headRotX;
      head.group.rotation.z = rest.headRotZ;
      head.setBlink(0);
      return;
    }

    /* Hover: the character never rests on the floor. */
    var bob = Math.sin(time * (Math.PI * 2 / FLOAT.bobPeriod)) * FLOAT.bobAmplitude * v.bob;
    float.position.y = FLOAT.height + bob;

    /* A slow lateral sway, a third of the bob rate, so the motion never looks
       like a single sine. */
    float.position.x = Math.sin(time * 0.41) * 0.012 * v.sway;
    float.rotation.z = Math.sin(time * 0.37) * 0.010 * v.sway;

    /* R91 — THE BODY TURNS. This is the largest single fix for "he reads as a
       still image in motion", and it is a fact about the rig rather than about
       the lighting.

       Idle used to rotate the HEAD by 0.045 rad and the torso by 0.34 of that
       — 0.9 degrees. Nothing in any material can read at 0.9 degrees: measured
       over the full idle sweep the character's pixels moved 2.18 luma per step
       and 82% never left the value band they started in. He was, correctly, a
       still image with a bobbing translation applied.

       The whole body now drifts about its own vertical axis. Two incommensurable
       periods so the pair never repeats inside any time a viewer will watch, and
       slow enough (roughly a 40-second beat) that it registers as presence
       rather than as animation — but wide enough that facets genuinely sweep
       through the environment's ramps and the volume reads.

       It sits on `float`, not on `rig`: `setYaw` owns rig.rotation.y for drag,
       and the two must not fight over one channel. */
    float.rotation.y = (Math.sin(time * 0.155) * 0.112 +
                        Math.sin(time * 0.082 + 2.3) * 0.052) * v.sway;
    /* A trace of pitch, so the drift is not confined to one plane and the chest
       and shoulder tops change relationship to the light as well as the sides. */
    float.rotation.x = Math.sin(time * 0.121 + 0.8) * 0.024 * v.sway;

    /* Head: a small independent drift plus the state's tilt. */
    head.group.rotation.x = rest.headRotX + v.headTilt * 0.5 + Math.sin(time * 0.63) * 0.028 * v.sway;
    head.group.rotation.z = rest.headRotZ + Math.sin(time * 0.48) * 0.022 * v.sway;
    /* Head yaw carries TWO periods, not one.

       A single sine is a metronome: watch it for ten seconds and the eye finds
       the loop, and a character whose idle has a findable loop reads as a
       mechanism rather than as something alive. Adding a second, slower and
       weaker term at an incommensurable rate means the pair never repeats
       inside any time a viewer will watch — which is the cheapest possible way
       to buy the "micro head orientation life" the brief asks for. */
    head.group.rotation.y = (Math.sin(time * 0.29) * 0.045 +
                             Math.sin(time * 0.113 + 1.7) * 0.026) * v.sway;

    /* Arms: the raised arm carries most of the life, as it does in the
       reference composition. */
    /* R91 — ARM INERTIA. The limbs lag the body they hang from.

       Everything in this rig moved in perfect lockstep with the torso, which is
       the single most mechanical thing a jointed character can do: a real arm
       arrives late and overshoots slightly, and the eye reads that lag as mass.
       It costs one smoothed value.

       `driftLag` chases the body's own drift with a first-order filter; the
       DIFFERENCE between where the body is and where the lag has got to is the
       instantaneous angular error, and feeding that back into the shoulders as
       a counter-rotation makes the arms trail the turn and settle after it.
       Frame-rate independent, so a 30fps device lags by the same amount of
       TIME rather than the same number of frames. */
    var kLag = 1 - Math.exp(-dt * 2.6);
    driftLag += (float.rotation.y - driftLag) * kLag;
    var inertia = (float.rotation.y - driftLag) * 2.4;

    var lift = v.armLift;
    var open = v.elbowOpen || 0;
    /* Shoulders settle when he is thinking and open when he is explaining —
       the micro-shift the brief asks for, applied to both sides so it reads as
       posture rather than as a gesture on one arm. */
    var set = v.shoulderSet || 0;
    limbs.left.shoulderJoint.rotation.z = rest.leftShoulder.z - lift + set
      - Math.sin(time * 0.72) * 0.030 * v.sway;
    limbs.left.elbowJoint.rotation.z = rest.leftElbow.z + open * 0.30 + Math.sin(time * 0.72 + 0.7) * 0.024 * v.sway;
    limbs.right.shoulderJoint.rotation.z = rest.rightShoulder.z + lift * 0.35 - set
      + Math.sin(time * 0.66 + 1.9) * 0.020 * v.sway;
    limbs.right.elbowJoint.rotation.z = rest.rightElbow.z - open * 0.10 + Math.sin(time * 0.66 + 2.4) * 0.018 * v.sway;

    /* R90 — THE JOINTS BELOW THE ELBOW, and a torso that answers the head.

       Every joint in this rig used to turn about Z only, so an arm could swing
       and nothing else about it could change: the forearm was welded to the
       upper arm's orientation and the hand to the forearm's. That reads as a
       mannequin being posed rather than a body moving, and it is the one thing
       the new anatomy cannot fix on its own — a bicep is only convincing if the
       limb it sits on articulates.

       The wrist now carries a slow roll about its own axis, which is the single
       most human thing a limb can do at rest, and it opens outward as the
       character explains — a presenting gesture rather than a held pose. The
       shoulder gets a small forward/back component so the arm is not confined
       to one plane.

       The torso counter-rotates AGAINST the head's yaw, at about a third of it.
       Heads do not turn independently of bodies; the counter-turn is what makes
       a look feel initiated by the character rather than applied to it, and at
       this amplitude it registers as life rather than as motion. */
    var wristRoll = Math.sin(time * 0.34 + 0.9) * 0.10 * v.sway;
    limbs.left.wristJoint.rotation.y = rest.leftWrist.y + wristRoll + (v.wristTurn || 0);
    limbs.left.wristJoint.rotation.x = rest.leftWrist.x + Math.sin(time * 0.55) * 0.055 * v.sway;
    limbs.right.wristJoint.rotation.y = rest.rightWrist.y - wristRoll * 0.6;
    limbs.right.wristJoint.rotation.x = rest.rightWrist.x + Math.sin(time * 0.47 + 2.1) * 0.040 * v.sway;

    limbs.left.shoulderJoint.rotation.x = rest.leftShoulder.x + Math.sin(time * 0.31 + 0.4) * 0.045 * v.sway;
    limbs.right.shoulderJoint.rotation.x = rest.rightShoulder.x + Math.sin(time * 0.27 + 2.6) * 0.038 * v.sway;
    /* The inertia term goes on the shoulders' Y, which is the axis the body's
       drift turns about — so the arms swing behind the torso and catch up. */
    limbs.left.shoulderJoint.rotation.y = rest.leftShoulder.y - inertia;
    limbs.right.shoulderJoint.rotation.y = rest.rightShoulder.y - inertia;
    /* The hands settle a beat after the wrists, for the same reason. */
    limbs.left.wristJoint.rotation.z = rest.leftWrist.z + inertia * 0.5;
    limbs.right.wristJoint.rotation.z = rest.rightWrist.z + inertia * 0.5;

    body.group.rotation.y = rest.bodyRotY - head.group.rotation.y * 0.34;
    /* THE CHEST OPENS when he explains and closes a little when he thinks — a
       small backward tilt of the torso, which is what "presenting" looks like
       from the ribcage rather than from the arm. */
    body.group.rotation.x = rest.bodyRotX - (v.chestOpen || 0);

    /* Thinking pulse — a visible periodic brightening of the emissive family
       only, so the body stays dark while he is clearly working. */
    var pulseP = 0.5 + 0.5 * Math.sin(time * 3.4);
    if (v.pulse > 0.01) {
      materials.emissive.opacity = 1 - 0.35 * pulseP * v.pulse;
      materials.emissiveSoft.opacity = 0.30 * v.glow * (1 + 1.6 * pulseP * v.pulse);
    } else {
      materials.emissive.opacity = 1;
    }
    /* The internal light follows the glow, deepens on the thinking pulse, and
       breathes slowly on its own. */
    setInnerLight(materials.body,
      innerBase * v.glow * (1 + 0.28 * pulseP * v.pulse) * (0.94 + 0.06 * Math.sin(time * 0.9)),
      innerY + Math.sin(time * 0.53) * 0.06);

    /* Smile expression: the arc scales horizontally with the state. */
    head.smile.scale.x = 0.55 + 0.45 * MathUtils.clamp(v.smile, 0, 1.4);
    head.smile.scale.y = 0.5 + 0.5 * MathUtils.clamp(v.smile, 0, 1.4);

    /* Blink. */
    blinkTimer -= dt * v.blinkRate;
    if (blinkTimer <= 0) { blink = 1; blinkTimer = 2.2 + Math.random() * 3.4; }
    if (blink > 0) { blink = Math.max(0, blink - dt * 7.5); }
    head.setBlink(blink > 0.5 ? (1 - blink) * 2 : blink * 2);
  }

  return {
    root: root,
    rig: rig,
    float: float,
    head: head,
    body: body,
    limbs: limbs,
    materials: materials,
    states: states,
    height: HEIGHT,

    /* R91: the scene drives this so the crystal's reflections sweep even when
       the body is momentarily still. See the note at renderFrame. */
    setEnvRotation: function (y) {
      var r = Number(y) || 0;
      if (materials.body.envMapRotation) materials.body.envMapRotation.y = r;
      if (materials.head && materials.head.envMapRotation) materials.head.envMapRotation.y = r;
      if (materials.cavity && materials.cavity.envMapRotation) materials.cavity.envMapRotation.y = r;
    },
    setYaw: setYaw,
    getYaw: getYaw,
    /* R99 — the rim's directions (crystal-shader.js), handed in by the scene
       in VIEW space each frame: the moon side and the hand crystal's side. */
    /* R100 — content on the display glass (head.js setIcon); development only. */
    setDisplayIcon: function (name) { return head.setIcon ? head.setIcon(name) : null; },
    setRimDirections: function (a, b) {
      setRimDirections(materials.body, a, b);
      if (materials.head) setRimDirections(materials.head, a, b);
    },
    /* R99 — SHADOW-FIRST DEBUG VIEWS (godform brief §39), development only.

         'mass'    every solid flat near-black, no lines: the silhouette test —
                   does the body read as anatomy with nothing but its outline?
         'groups'  one flat colour per anatomical group, so the head, torso,
                   each deltoid, upper arm, forearm and hand can be told apart
                   and their overlaps checked.
         'clay'    (R106) every solid as a matte mid-grey clay under the
                   scene's own lights, no lines, no coat, no facet classes:
                   the sculpt test — does the MACRO form read as curved,
                   pumped anatomy before the crystal is allowed to speak?
         null      restore the crystal.

       Materials are swapped, never edited, and the originals are kept on the
       object so restoring is exact. The lab exposes it as ?debug=. */
    setDebugView: function (name) {
      var mode = name || null;
      var GROUP_COLOURS = [
        ['head-shell', 0xd8dde6], ['torso', 0x3a6fd8], ['deltoid', 0xe0a030],
        ['-upper', 0x30c070], ['-fore', 0xc04080], ['hand-solid', 0xe0e060],
        ['elbow', 0x8890a0], ['wrist', 0x8890a0], ['eye', 0xffffff], ['smile', 0xffffff],
        ['chest-emblem', 0x60e0ff], ['transport', 0x60e0ff], ['throat', 0x60e0ff], ['hand-crystal', 0x60e0ff]
      ];
      root.traverse(function (o) {
        if (o.isLineSegments || o.isLine) {
          if (mode && o.userData.__vis == null) o.userData.__vis = o.visible;
          o.visible = mode ? false : (o.userData.__vis == null ? o.visible : o.userData.__vis);
          if (!mode) delete o.userData.__vis;
          return;
        }
        if (!o.isMesh) return;
        if (mode) {
          if (!o.userData.__mat) o.userData.__mat = o.material;
          var colour = 0x171a20;
          if (mode === 'groups') {
            colour = 0x404650;
            for (var i = 0; i < GROUP_COLOURS.length; i++) {
              if (o.name.indexOf(GROUP_COLOURS[i][0]) !== -1) { colour = GROUP_COLOURS[i][1]; break; }
            }
          }
          if (mode === 'clay') {
            /* Lit clay: a Lambert surface has no specular term, so nothing but
               the form's own turning can make a value change. Emitters stay
               flat so the face and symbols still locate. */
            var emitter = /eye|smile|emblem|transport|throat|hand-crystal|display|glass/.test(o.name);
            if (!o.userData.__clay) o.userData.__clay = new MeshLambertMaterial({ toneMapped: false });
            o.userData.__clay.color.setHex(emitter ? 0x1a1c22 : 0x9a9ea6);
            o.userData.__clay.emissive.setHex(emitter ? 0x000000 : 0x14161a);
            o.material = o.userData.__clay;
          } else {
            if (!o.userData.__dbg) o.userData.__dbg = new MeshBasicMaterial({ toneMapped: false });
            o.userData.__dbg.color.setHex(colour);
            o.material = o.userData.__dbg;
          }
        } else if (o.userData.__mat) {
          o.material = o.userData.__mat;
          delete o.userData.__mat;
          if (o.userData.__dbg) { o.userData.__dbg.dispose(); delete o.userData.__dbg; }
          if (o.userData.__clay) { o.userData.__clay.dispose(); delete o.userData.__clay; }
        }
      });
      return mode;
    },
    setState: states.set,
    getState: states.get,
    stateNames: states.names,
    update: update,

    /* This is the real character, not the Phase 1 stand-in. */
    isPlaceholder: false,

    dispose: function () {
      head.dispose();
      body.dispose();
      limbs.dispose();
      materials.dispose();
      if (root.parent) root.parent.remove(root);
    }
  };
}
