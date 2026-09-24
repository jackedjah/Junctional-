/* MAHWORLD GAMEPLAY RUNTIME :: EVENT LOG
   Every headless system emits through one event log so the simulator, telemetry and tests observe identical streams.
       var bus = createEventLog(); bus.on(fn); bus.emit('ATTACK_MAIN_IMPACT', {...}); bus.events() */
export function createEventLog(options) {
  var o = options || {}; var listeners = []; var events = []; var t = 0; var max = o.max || 5000;
  return {
    setTime: function (v) { t = v; }, time: function () { return t; },
    on: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (l) { return l !== fn; }); }; },
    emit: function (name, payload) { var e = { t: t, name: name, payload: payload || {} }; events.push(e); if (events.length > max) events.shift(); listeners.forEach(function (l) { try { l(e); } catch (x) { /* listeners never break gameplay */ } }); return e; },
    events: function () { return events.slice(); }, names: function () { return events.map(function (e) { return e.name; }); },
    count: function (name) { return events.filter(function (e) { return e.name === name; }).length; }, clear: function () { events = []; }
  };
}
