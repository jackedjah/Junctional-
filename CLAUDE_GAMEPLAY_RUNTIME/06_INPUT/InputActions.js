/* MAHWORLD GAMEPLAY RUNTIME :: INPUT ABSTRACTION
   Gameplay actions independent of the physical device. Touch swipes, controller and keyboard map INTO these later; game logic
   binds only to actions. No mobile gestures are implemented here (device bindings are data, marked PLACEHOLDER).

       var input = createInputActions(bus); input.dispatch('SELECT_MOVEMENT_PATTERN', { pattern_id }); input.bindDevice('TOUCH', {...}); input.fromDevice('TOUCH', 'swipe_up') */
export var ACTIONS = ['SELECT_MOVEMENT_PATTERN', 'ATTACK_DIRECTION_UP', 'ATTACK_DIRECTION_DOWN', 'ATTACK_DIRECTION_LEFT', 'ATTACK_DIRECTION_RIGHT', 'ATTACK_PRIMARY', 'ATTACK_SECONDARY', 'TRANSFORM', 'JUMP_ASCEND', 'DESCEND', 'INTERACT', 'MOVE', 'STOP', 'CANCEL', 'EMOTE', 'CALL_NEXT', 'ACCEPT', 'DECLINE', 'LOOK', 'MENU', 'ENTER_FLIGHT', 'EXIT_FLIGHT'];   /* Phase 4: LOOK / MENU / ENTER_FLIGHT / EXIT_FLIGHT added for the input router */
export var DIRECTION_OF = { ATTACK_DIRECTION_UP: 'UP', ATTACK_DIRECTION_DOWN: 'DOWN', ATTACK_DIRECTION_LEFT: 'LEFT', ATTACK_DIRECTION_RIGHT: 'RIGHT', ATTACK_PRIMARY: 'TAP', ATTACK_SECONDARY: 'HOLD' };

export function createInputActions(bus) {
  var handlers = {}; var bindings = { TOUCH: {}, CONTROLLER: {}, KEYBOARD_MOUSE: {} }; var count = 0;
  return {
    actions: function () { return ACTIONS.slice(); },
    on: function (action, fn) { if (ACTIONS.indexOf(action) < 0) throw new Error('unknown action ' + action); (handlers[action] = handlers[action] || []).push(fn); },
    dispatch: function (action, payload, source) {
      if (ACTIONS.indexOf(action) < 0) throw new Error('unknown action ' + action); count++;
      var ev = Object.assign({ action: action, source: source || 'SCRIPT', direction: DIRECTION_OF[action] || null }, payload || {}); bus.emit('INPUT_ACTION', ev);
      var results = (handlers[action] || []).map(function (h) { return h(ev); }); bus.emit('INPUT_ACTION_DONE', { action: action }); return { action: action, results: results };   /* Phase 4.1: lets the recorder tell nested setup actions (caused by a handler) from independent ones */
    },
    bindDevice: function (device, map) { if (!bindings[device]) throw new Error('unknown device ' + device); Object.keys(map).forEach(function (g) { if (ACTIONS.indexOf(map[g]) < 0) throw new Error('binding to unknown action ' + map[g]); }); bindings[device] = Object.assign({}, bindings[device], map); },
    fromDevice: function (device, gesture, payload) { var a = bindings[device] && bindings[device][gesture]; if (!a) return { action: null, reason: 'UNBOUND_GESTURE', device: device, gesture: gesture }; return this.dispatch(a, payload, device); },
    bindings: function () { return JSON.parse(JSON.stringify(bindings)); }, count: function () { return count; }
  };
}
/* PLACEHOLDER device maps (not final gestures): same actions from three devices */
export var PLACEHOLDER_BINDINGS = {
  TOUCH: { tap_pattern_button: 'SELECT_MOVEMENT_PATTERN', swipe_up: 'ATTACK_DIRECTION_UP', swipe_down: 'ATTACK_DIRECTION_DOWN', swipe_left: 'ATTACK_DIRECTION_LEFT', swipe_right: 'ATTACK_DIRECTION_RIGHT', tap: 'ATTACK_PRIMARY', hold: 'ATTACK_SECONDARY', double_tap: 'TRANSFORM', two_finger_up: 'JUMP_ASCEND', two_finger_down: 'DESCEND', tap_world: 'INTERACT' },
  CONTROLLER: { dpad: 'SELECT_MOVEMENT_PATTERN', rstick_up: 'ATTACK_DIRECTION_UP', rstick_down: 'ATTACK_DIRECTION_DOWN', rstick_left: 'ATTACK_DIRECTION_LEFT', rstick_right: 'ATTACK_DIRECTION_RIGHT', face_a: 'ATTACK_PRIMARY', face_b: 'ATTACK_SECONDARY', face_y: 'TRANSFORM', bumper_r: 'JUMP_ASCEND', bumper_l: 'DESCEND', face_x: 'INTERACT' },
  KEYBOARD_MOUSE: { digit: 'SELECT_MOVEMENT_PATTERN', w_mouse1: 'ATTACK_DIRECTION_UP', s_mouse1: 'ATTACK_DIRECTION_DOWN', a_mouse1: 'ATTACK_DIRECTION_LEFT', d_mouse1: 'ATTACK_DIRECTION_RIGHT', mouse1: 'ATTACK_PRIMARY', mouse2: 'ATTACK_SECONDARY', f: 'TRANSFORM', space: 'JUMP_ASCEND', ctrl: 'DESCEND', e: 'INTERACT' }
};
