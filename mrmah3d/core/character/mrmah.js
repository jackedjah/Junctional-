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
    rightElbow: limbs.right.elbowJoint.rotation.clone()
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
    head.group.rotation.y = Math.sin(time * 0.29) * 0.045 * v.sway;

    /* Arms: the raised arm carries most of the life, as it does in the
       reference composition. */
    var lift = v.armLift;
    limbs.left.shoulderJoint.rotation.z = rest.leftShoulder.z - lift - Math.sin(time * 0.72) * 0.030 * v.sway;
    limbs.left.elbowJoint.rotation.z = rest.leftElbow.z + Math.sin(time * 0.72 + 0.7) * 0.024 * v.sway;
    limbs.right.shoulderJoint.rotation.z = rest.rightShoulder.z + lift * 0.35 + Math.sin(time * 0.66 + 1.9) * 0.020 * v.sway;
    limbs.right.elbowJoint.rotation.z = rest.rightElbow.z + Math.sin(time * 0.66 + 2.4) * 0.018 * v.sway;

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
