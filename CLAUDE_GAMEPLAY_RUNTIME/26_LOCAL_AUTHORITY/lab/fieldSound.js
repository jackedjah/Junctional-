/* MAHWORLD PLAYABLE SAMPLE :: tiny synthesised sound layer (development) — no audio assets. WebAudio unlocks on the first user
   gesture; every cue is a short oscillator envelope. Presentation only; nothing here influences gameplay.
   2026-09-15 additions: PROPULSION audio for the lower-tip beams — a quiet continuous fused hover tone, softer separated support tones,
   an airborne variant, one concise propulsion pulse per supported separated step (the CALLER fires it from gait phase crossings, never
   from a timer; calls within 60 ms for the same id+side coalesce), landing / brace accents, bounded voices (oldest stolen), smooth
   gain ramps, stereo pan. Gains come from presentation_defaults.json → audio via setPropulsionDefaults(). The voice bookkeeping is a
   pure module-level factory (createVoiceLimiter) so it can be unit-tested without WebAudio. */
export function createVoiceLimiter(maxVoices, coalesceMs) {
  var MAX = maxVoices || 8, CO = (coalesceMs === undefined ? 60 : coalesceMs) / 1000;   /* times are seconds (AudioContext.currentTime) */ var voices = []; var last = {}; var stolen = 0, coalesced = 0, started = 0;
  return {
    /* returns { ok, steal } — ok=false when coalesced; steal = the voice record to stop first (oldest) when at the limit */
    request: function (key, now, dur) { if (key !== undefined && key !== null) { var l = last[key]; if (l !== undefined && now - l < CO) { coalesced++; return { ok: false, reason: 'COALESCED' }; } last[key] = now; } var i = 0; while (i < voices.length) { if (voices[i].end <= now) voices.splice(i, 1); else i++; } var steal = null; if (voices.length >= MAX) { voices.sort(function (a, b) { return a.start - b.start; }); steal = voices.shift(); stolen++; } var rec = { key: key, start: now, end: now + (dur || 0.2) }; voices.push(rec); started++; return { ok: true, steal: steal, rec: rec }; },
    release: function (rec) { var i = voices.indexOf(rec); if (i >= 0) voices.splice(i, 1); },
    active: function (now) { return voices.filter(function (v) { return v.end > now; }).length; },
    stats: function () { return { max: MAX, coalesce_ms: CO * 1000, active: voices.length, started: started, stolen: stolen, coalesced: coalesced }; },
    reset: function () { voices.length = 0; last = {}; }
  };
}
export function createFieldSound() {
  var ctx = null, master = null, muted = false; var AUD = { fused_hover_gain: 0.10, split_support_gain: 0.06, step_pulse_gain: 0.18, airborne_gain: 0.09, max_voices: 8, fade_s: 0.12 }; var limiter = createVoiceLimiter(AUD.max_voices, 60); var props = {};
  function ensure() { if (ctx) return true; try { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.18; master.connect(ctx.destination); } catch (e) { ctx = null; return false; } return true; }
  function ready() { return !muted && ensure() && ctx.state === 'running'; }
  function tone(freq, dur, type, gain, slide) { if (!ready()) return; var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), ctx.currentTime + dur); g.gain.setValueAtTime(gain || 0.5, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur); o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.02); }
  function noise(dur, gain) { if (!ready()) return; var n = ctx.sampleRate * dur; var buf = ctx.createBuffer(1, n, ctx.sampleRate); var d = buf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); var s = ctx.createBufferSource(); s.buffer = buf; var g = ctx.createGain(); g.gain.value = gain || 0.3; s.connect(g); g.connect(master); s.start(); }
  var noiseBuf = null; function noiseBuffer() { if (noiseBuf) return noiseBuf; var n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }
  /* one continuous propulsion layer per character: filtered noise + low sine through a band-pass, panner, gain ramps */
  function layer(pan) { var src = ctx.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true; var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 220; bp.Q.value = 2.5; var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 62; var og = ctx.createGain(); og.gain.value = 0.35; var g = ctx.createGain(); g.gain.value = 0; var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) p.pan.value = pan || 0; src.connect(bp); bp.connect(g); osc.connect(og); og.connect(g); if (p) { g.connect(p); p.connect(master); } else g.connect(master); src.start(); osc.start(); return { src: src, bp: bp, osc: osc, g: g, target: 0 }; }
  function ramp(l, gain, fade) { l.target = gain; var t = ctx.currentTime; l.g.gain.cancelScheduledValues(t); l.g.gain.setValueAtTime(l.g.gain.value, t); l.g.gain.linearRampToValueAtTime(gain, t + fade); }
  function prop(id) { if (props[id]) return props[id]; var p = { fused: layer(0), L: layer(-0.5), R: layer(0.5), lastStep: {}, airborne: false }; props[id] = p; return p; }
  function burst(freq, dur, gain, pan, q) { if (!ready()) return; var s = ctx.createBufferSource(); s.buffer = noiseBuffer(); var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q || 6; var g = ctx.createGain(); var t = ctx.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0005, t + dur); var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; s.connect(bp); bp.connect(g); if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(master); } else g.connect(master); s.start(t); s.stop(t + dur + 0.02); var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * 0.5, t); o.frequency.exponentialRampToValueAtTime(freq * 0.25, t + dur); var og = ctx.createGain(); og.gain.setValueAtTime(gain * 0.5, t); og.gain.exponentialRampToValueAtTime(0.0005, t + dur); o.connect(og); og.connect(p || master); o.start(t); o.stop(t + dur + 0.02); return { s: s, o: o }; }
  var api = {
    unlock: function () { if (ensure() && ctx.state === 'suspended') ctx.resume(); },   /* audio unlock only (the former duplicate key made this play a cue) */
    mute: function (m) { muted = !!m; if (muted) api.stopAll(); },
    swing: function () { noise(0.12, 0.25); tone(180, 0.12, 'triangle', 0.25, 90); },
    impact: function (harmless) { noise(0.08, harmless ? 0.15 : 0.35); tone(harmless ? 240 : 120, 0.16, 'square', harmless ? 0.15 : 0.35, 60); },
    cast: function () { tone(420, 0.25, 'sine', 0.3, 880); tone(210, 0.3, 'triangle', 0.15, 420); },
    magicImpact: function () { noise(0.1, 0.25); tone(660, 0.3, 'sine', 0.3, 220); },
    lock: function () { tone(880, 0.07, 'square', 0.2); tone(1320, 0.09, 'square', 0.15); },
    lockClear: function () { tone(660, 0.08, 'square', 0.15, 330); },
    fly: function () { tone(300, 0.35, 'sine', 0.25, 700); },
    land: function () { tone(500, 0.2, 'sine', 0.2, 200); },
    dash: function () { noise(0.08, 0.2); tone(500, 0.1, 'sawtooth', 0.12, 900); },
    tick: function () { tone(1200, 0.05, 'square', 0.12); },
    refuse: function () { tone(170, 0.14, 'square', 0.18, 120); },
    guard: function () { tone(520, 0.12, 'triangle', 0.18, 700); },
    /* ---- propulsion (lower-tip beams) ---- */
    setPropulsionDefaults: function (audio) { Object.assign(AUD, audio || {}); limiter = createVoiceLimiter(AUD.max_voices, 60); },
    /* per frame: form FUSED|SPLIT, intensity {fused,L,R} (presentation weights), speed01, airborne, effort01 */
    propulsion: function (id, v) { if (!ready() || !v) return; var p = prop(id); var fade = AUD.fade_s; var eff = v.effort01 || 0, sp = v.speed01 || 0; var it = v.intensity || {}; var air = !!v.airborne;
      var falloff = v.distance_m === undefined || v.distance_m === null ? 1 : 1 / (1 + Math.max(0, v.distance_m) / 8);   /* spatial falloff: the listener is at the camera, so a distant character's hum recedes instead of stacking */
      var freqBase = air ? 420 : 220; var fusedGain = falloff * (v.form === 'SPLIT' ? 0 : (air ? AUD.airborne_gain : AUD.fused_hover_gain) * Math.min(1.6, it.fused === undefined ? 1 : it.fused) * (1 + 0.25 * sp + 0.35 * eff));   /* thrust (speed + effort) modulates the hum */
      var lg = falloff * (v.form === 'SPLIT' ? (air ? AUD.airborne_gain * 0.6 : AUD.split_support_gain) * Math.min(1.6, it.L === undefined ? 0.3 : it.L) : 0); var rg = falloff * (v.form === 'SPLIT' ? (air ? AUD.airborne_gain * 0.6 : AUD.split_support_gain) * Math.min(1.6, it.R === undefined ? 0.3 : it.R) : 0);
      if (Math.abs(p.fused.target - fusedGain) > 0.002) ramp(p.fused, fusedGain, fade); if (Math.abs(p.L.target - lg) > 0.002) ramp(p.L, lg, fade); if (Math.abs(p.R.target - rg) > 0.002) ramp(p.R, rg, fade);
      var f = freqBase * (1 + 0.15 * sp + 0.1 * eff); p.fused.bp.frequency.setTargetAtTime(f, ctx.currentTime, 0.08); p.L.bp.frequency.setTargetAtTime(f * 1.12, ctx.currentTime, 0.08); p.R.bp.frequency.setTargetAtTime(f * 1.06, ctx.currentTime, 0.08); p.fused.osc.frequency.setTargetAtTime(air ? 74 : 62, ctx.currentTime, 0.1); p.airborne = air; },
    /* one concise pulse per supported separated step; coalesces repeats within 60 ms for the same id+side; bounded voices */
    stepPulse: function (id, side, strength, pan) { var now = ctx ? ctx.currentTime : (performance.now() / 1000); var r = limiter.request(id + ':' + side, now, 0.14); if (!r.ok) return false; if (r.steal && r.steal.stop) { try { r.steal.stop(); } catch (e) { /* already ended */ } } if (!ready()) return true; var s = Math.max(0.1, Math.min(1.5, strength === undefined ? 0.6 : strength)); var pn = pan === undefined ? (side === 'L' ? -0.5 : (side === 'R' ? 0.5 : 0)) : pan; var b = burst(520 + 90 * s + (Math.random() - 0.5) * 30, 0.12, AUD.step_pulse_gain * s, pn, 5); if (b) r.rec.stop = function () { try { b.s.stop(); b.o.stop(); } catch (e) { /* ended */ } }; return true; },
    takeoff: function (id, strength) { var now = ctx ? ctx.currentTime : 0; var r = limiter.request(id + ':takeoff', now, 0.34); if (!r.ok) return; var s = Math.max(0.2, Math.min(1.5, strength || 0.8)); var b = burst(300, 0.32, AUD.airborne_gain * 1.6 * s, 0, 2.2); if (b) { try { b.o.frequency.setValueAtTime(150, ctx.currentTime); b.o.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.3); } catch (e) { /* osc may be a noise-only burst */ } r.rec.stop = function () { try { b.s.stop(); } catch (e) { } }; } },
    landing: function (id, strength) { var now = ctx ? ctx.currentTime : 0; var r = limiter.request(id + ':land', now, 0.3); if (!r.ok) return; var s = Math.max(0.2, Math.min(1.5, strength || 0.8)); var b = burst(260, 0.28, AUD.step_pulse_gain * s * 1.2, 0, 3); if (b) r.rec.stop = function () { try { b.s.stop(); } catch (e) { } }; },
    brace: function (id, strength) { var now = ctx ? ctx.currentTime : 0; var r = limiter.request(id + ':brace', now, 0.18); if (!r.ok) return; var s = Math.max(0.2, Math.min(1.5, strength || 0.6)); var b = burst(180, 0.16, AUD.fused_hover_gain * 1.5 * s, 0, 2.5); if (b) r.rec.stop = function () { try { b.s.stop(); } catch (e) { } }; },
    stopPropulsion: function (id) { var p = props[id]; if (!p || !ctx) return; [p.fused, p.L, p.R].forEach(function (l) { try { ramp(l, 0, AUD.fade_s); setTimeout(function () { try { l.src.stop(); l.osc.stop(); } catch (e) { } }, AUD.fade_s * 1000 + 50); } catch (e) { } }); delete props[id]; },
    stopAll: function () { Object.keys(props).forEach(api.stopPropulsion); limiter.reset(); },
    voices: function () { return Object.assign({ propulsion_layers: Object.keys(props).length, context: ctx ? ctx.state : 'none' }, limiter.stats()); }
  };
  return api;
}
