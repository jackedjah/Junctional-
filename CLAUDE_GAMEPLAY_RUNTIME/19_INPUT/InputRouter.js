/* MAHWORLD GAMEPLAY RUNTIME :: INPUT ROUTER (one canonical abstract layer over InputActions)
   Intents (device-independent): MOVE · LOOK · INTERACT · TRANSFORM · FLIGHT (toggle) · ASCEND · DESCEND · MOVEMENT_PATTERN_SELECTION ·
   ATTACK_DIRECTION · ATTACK_PRIMARY · ATTACK_SECONDARY · EMOTE · MENU. Adapters translate device signals into intents through a
   CONFIGURABLE mapping; the router turns intents into the authoritative InputActions. No gameplay logic in adapters.
   Adapters: KEYBOARD_MOUSE (default dev map) · CONTROLLER (placeholder layout — final layout OPEN_DECISION) · TOUCH_FUTURE (tested
   interface stub — exact gestures OPEN_DECISION OD-13 / OD-24). */
export var INTENTS = ['MOVE', 'LOOK', 'INTERACT', 'TRANSFORM', 'FLIGHT', 'ASCEND', 'DESCEND', 'MOVEMENT_PATTERN_SELECTION', 'ATTACK_DIRECTION', 'ATTACK_PRIMARY', 'ATTACK_SECONDARY', 'EMOTE', 'MENU'];
export var DEFAULT_MAPS = {
  KEYBOARD_MOUSE: { classification: 'DEVELOPMENT_DEFAULT', map: { KeyW: 'MOVE:forward', KeyS: 'MOVE:backward', KeyA: 'MOVE:left', KeyD: 'MOVE:right', ArrowUp: 'MOVE:forward', ArrowDown: 'MOVE:backward', ArrowLeft: 'MOVE:left', ArrowRight: 'MOVE:right', ShiftLeft: 'MOVE:run', MouseMove: 'LOOK', KeyM: 'INTERACT', KeyF: 'TRANSFORM', KeyG: 'FLIGHT', Space: 'ASCEND', KeyC: 'DESCEND', ControlLeft: 'DESCEND', Digit1: 'MOVEMENT_PATTERN_SELECTION:1', Digit2: 'MOVEMENT_PATTERN_SELECTION:2', Digit3: 'MOVEMENT_PATTERN_SELECTION:3', Digit4: 'MOVEMENT_PATTERN_SELECTION:4', KeyI: 'ATTACK_DIRECTION:UP', KeyK: 'ATTACK_DIRECTION:DOWN', KeyJ: 'ATTACK_DIRECTION:LEFT', KeyL: 'ATTACK_DIRECTION:RIGHT', KeyQ: 'ATTACK_PRIMARY', Mouse0: 'ATTACK_PRIMARY', KeyE: 'ATTACK_SECONDARY', Mouse2: 'ATTACK_SECONDARY', KeyB: 'EMOTE', Escape: 'MENU', Tab: 'MENU' } },
  CONTROLLER: { classification: 'PLACEHOLDER_LAYOUT (final controller layout OPEN_DECISION)', map: { LeftStick: 'MOVE', RightStick: 'LOOK', FaceWest: 'INTERACT', FaceNorth: 'TRANSFORM', LeftBumper: 'FLIGHT', FaceSouth: 'ASCEND', RightBumper: 'DESCEND', DpadUp: 'MOVEMENT_PATTERN_SELECTION:1', DpadRight: 'MOVEMENT_PATTERN_SELECTION:2', DpadDown: 'MOVEMENT_PATTERN_SELECTION:3', DpadLeft: 'MOVEMENT_PATTERN_SELECTION:4', RightStickFlickUp: 'ATTACK_DIRECTION:UP', RightStickFlickDown: 'ATTACK_DIRECTION:DOWN', RightStickFlickLeft: 'ATTACK_DIRECTION:LEFT', RightStickFlickRight: 'ATTACK_DIRECTION:RIGHT', RightTrigger: 'ATTACK_PRIMARY', LeftTrigger: 'ATTACK_SECONDARY', FaceEast: 'EMOTE', Options: 'MENU' } },
  TOUCH_FUTURE: { classification: 'INTERFACE_STUB (exact gestures OPEN_DECISION OD-13 / OD-24)', map: { virtual_stick: 'MOVE', drag_view: 'LOOK', tap_prompt: 'INTERACT', double_tap: 'TRANSFORM', flight_button: 'FLIGHT', two_finger_up: 'ASCEND', two_finger_down: 'DESCEND', pattern_button_1: 'MOVEMENT_PATTERN_SELECTION:1', pattern_button_2: 'MOVEMENT_PATTERN_SELECTION:2', pattern_button_3: 'MOVEMENT_PATTERN_SELECTION:3', pattern_button_4: 'MOVEMENT_PATTERN_SELECTION:4', swipe_up: 'ATTACK_DIRECTION:UP', swipe_down: 'ATTACK_DIRECTION:DOWN', swipe_left: 'ATTACK_DIRECTION:LEFT', swipe_right: 'ATTACK_DIRECTION:RIGHT', tap: 'ATTACK_PRIMARY', hold: 'ATTACK_SECONDARY', emote_button: 'EMOTE', menu_button: 'MENU' } }
};
var DIR_ACTION = { UP: 'ATTACK_DIRECTION_UP', DOWN: 'ATTACK_DIRECTION_DOWN', LEFT: 'ATTACK_DIRECTION_LEFT', RIGHT: 'ATTACK_DIRECTION_RIGHT' };

export function createInputRouter(world, deps) {
  var d = deps || {}; var maps = JSON.parse(JSON.stringify(DEFAULT_MAPS)); var active = d.adapter || 'KEYBOARD_MOUSE'; var held = { forward: 0, backward: 0, left: 0, right: 0, run: 0 }; var flying = false; var patterns = world.kit.patterns(); var log = [];
  function moveVector() { return { forward: held.forward - held.backward, strafe: held.right - held.left, run: !!held.run }; }
  /* intents → authoritative actions (the only place this translation lives) */
  function intent(name, arg, phase, source) {
    if (INTENTS.indexOf(name) < 0) return { ok: false, reason: 'UNKNOWN_INTENT', intent: name }; log.push({ intent: name, arg: arg, phase: phase, source: source }); if (log.length > 500) log.shift();
    var src = source || active; var down = phase !== 'up';
    switch (name) {
      case 'MOVE': if (arg && arg in held) held[arg] = down ? 1 : 0; else if (arg && typeof arg === 'object') { held.forward = Math.max(0, arg.forward || 0); held.backward = Math.max(0, -(arg.forward || 0)); held.right = Math.max(0, arg.strafe || 0); held.left = Math.max(0, -(arg.strafe || 0)); held.run = arg.run ? 1 : 0; } return world.input.dispatch('MOVE', moveVector(), src);
      case 'LOOK': return world.input.dispatch('LOOK', { dx: arg && arg.dx || 0, dy: arg && arg.dy || 0 }, src);
      case 'INTERACT': if (!down) return { skipped: 'up' }; return world.input.dispatch('INTERACT', {}, src);
      case 'TRANSFORM': if (!down) return { skipped: 'up' }; return world.input.dispatch('TRANSFORM', {}, src);
      case 'FLIGHT': if (!down) return { skipped: 'up' }; flying = !flying; return world.input.dispatch(flying ? 'ENTER_FLIGHT' : 'EXIT_FLIGHT', {}, src);
      case 'ASCEND': if (!down) return { skipped: 'up' }; return world.input.dispatch('JUMP_ASCEND', {}, src);
      case 'DESCEND': if (!down) return { skipped: 'up' }; return world.input.dispatch('DESCEND', {}, src);
      case 'MOVEMENT_PATTERN_SELECTION': if (!down) return { skipped: 'up' }; var idx = typeof arg === 'number' ? arg - 1 : parseInt(arg, 10) - 1; var pid = typeof arg === 'string' && patterns.indexOf(arg) >= 0 ? arg : patterns[idx]; if (!pid) return { ok: false, reason: 'NO_PATTERN_SLOT', slot: arg }; return world.input.dispatch('SELECT_MOVEMENT_PATTERN', { pattern_id: pid }, src);
      case 'ATTACK_DIRECTION': if (!down) return { skipped: 'up' }; if (!DIR_ACTION[arg]) return { ok: false, reason: 'BAD_DIRECTION' }; return world.input.dispatch(DIR_ACTION[arg], {}, src);
      case 'ATTACK_PRIMARY': if (!down) return { skipped: 'up' }; return world.input.dispatch('ATTACK_PRIMARY', {}, src);
      case 'ATTACK_SECONDARY': if (!down) return { skipped: 'up' }; return world.input.dispatch('ATTACK_SECONDARY', {}, src);
      case 'EMOTE': if (!down) return { skipped: 'up' }; return world.input.dispatch('EMOTE', { emote_id: arg || null }, src);
      case 'MENU': if (!down) return { skipped: 'up' }; return world.input.dispatch('MENU', {}, src);
    }
  }
  function fromDevice(adapter, signal, phase, payload) { var m = maps[adapter]; if (!m) return { ok: false, reason: 'UNKNOWN_ADAPTER' }; var bound = m.map[signal]; if (!bound) return { ok: false, reason: 'UNBOUND_SIGNAL', adapter: adapter, signal: signal }; var parts = bound.split(':'); return intent(parts[0], payload !== undefined ? payload : parts[1], phase || 'down', adapter); }
  return {
    intents: INTENTS.slice(), adapters: function () { return Object.keys(maps); }, activeAdapter: function () { return active; }, setAdapter: function (a) { if (!maps[a]) throw new Error('unknown adapter ' + a); active = a; },
    mapping: function (a) { return JSON.parse(JSON.stringify(maps[a || active])); }, remap: function (a, signal, bound) { if (!maps[a]) throw new Error('unknown adapter'); var name = String(bound).split(':')[0]; if (INTENTS.indexOf(name) < 0) throw new Error('unknown intent ' + name); maps[a].map[signal] = bound; },
    intent: intent, fromDevice: fromDevice, isFlying: function () { return flying; }, setFlying: function (v) { flying = !!v; }, moveVector: moveVector, log: function () { return log.slice(); },
    /* browser keyboard wiring — device-specific, no gameplay logic */
    attachKeyboard: function (win) { if (!win) return function () {}; var kd = function (e) { if (!maps.KEYBOARD_MOUSE.map[e.code]) return; if (e.repeat && !/^MOVE/.test(maps.KEYBOARD_MOUSE.map[e.code])) return; e.preventDefault(); fromDevice('KEYBOARD_MOUSE', e.code, 'down'); }; var ku = function (e) { if (maps.KEYBOARD_MOUSE.map[e.code]) fromDevice('KEYBOARD_MOUSE', e.code, 'up'); }; win.addEventListener('keydown', kd); win.addEventListener('keyup', ku); return function () { win.removeEventListener('keydown', kd); win.removeEventListener('keyup', ku); }; }
  };
}
