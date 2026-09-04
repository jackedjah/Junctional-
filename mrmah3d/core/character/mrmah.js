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

import { Group, MathUtils } from '../../vendor/three/three.module.min.js';
import { createCrystalMaterials } from './materials.js';
import { buildHead } from './head.js';
import { buildBody } from './body.js';
import { buildLimbs } from './limbs.js';
import { createStateMachine } from './states.js';
import { HEIGHT, FLOAT, HEAD } from './proportions.js';

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

  var head = buildHead(materials);
  var body = buildBody(materials);
  var limbs = buildLimbs(materials);
  rig.add(body.group);
  rig.add(limbs.group);
  rig.add(head.group);

  float.position.y = FLOAT.height;

  var states = createStateMachine();

  var yaw = 0;
  var time = 0;
  var blinkTimer = 2.4;
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
    bodyRotY: body.group.rotation.y
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
    var lift = v.armLift;
    var open = v.elbowOpen || 0;
    limbs.left.shoulderJoint.rotation.z = rest.leftShoulder.z - lift - Math.sin(time * 0.72) * 0.030 * v.sway;
    limbs.left.elbowJoint.rotation.z = rest.leftElbow.z + open * 0.30 + Math.sin(time * 0.72 + 0.7) * 0.024 * v.sway;
    limbs.right.shoulderJoint.rotation.z = rest.rightShoulder.z + lift * 0.35 + Math.sin(time * 0.66 + 1.9) * 0.020 * v.sway;
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

    body.group.rotation.y = rest.bodyRotY - head.group.rotation.y * 0.34;

    /* Thinking pulse — a visible periodic brightening of the emissive family
       only, so the body stays dark while he is clearly working. */
    if (v.pulse > 0.01) {
      var p = 0.5 + 0.5 * Math.sin(time * 3.4);
      materials.emissive.opacity = 1 - 0.35 * p * v.pulse;
      materials.emissiveSoft.opacity = 0.30 * v.glow * (1 + 1.6 * p * v.pulse);
    } else {
      materials.emissive.opacity = 1;
    }

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

    setYaw: setYaw,
    getYaw: getYaw,
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
