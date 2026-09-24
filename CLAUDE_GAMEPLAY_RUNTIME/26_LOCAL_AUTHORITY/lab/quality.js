/* MAHWORLD :: QUALITY TIERS (Spec A). One place that decides how much the presentation may cost: LOW / MED / HIGH.
   Every consumer reads the live tier through q.get() / q.on(); nothing here touches gameplay (the host never waits on rendering).
   Tier selection: ?quality=low|med|high → saved choice (localStorage) → device default (coarse pointer = MED, else HIGH).
   Adaptive resolution stays on within the tier's pixel-ratio cap: it drops the ratio when frame time climbs and raises it back slowly.
   Thresholds are vsync-aware for a 60 Hz phone: a steady 16.7 ms is healthy, an average above ADAPT.drop_ms (21) means frames are being
   missed → drop 0.25; below ADAPT.raise_ms (17.5) → raise 0.125. Both are Control Lab tunables (q.adapt). */
export var ADAPT = { drop_ms: 21, raise_ms: 17.5 };
export var TIERS = {
  LOW: { dpr_cap: 1.0, dpr_floor: 0.6, particles: 0.5, clouds: 10, city_fins: false, fog_far_scale: 0.8, lod_far_m: 120, antialias: false, shadows: 'off', shadow_map: 0, shadow_reach_m: 0 },
  MED: { dpr_cap: 2.0, dpr_floor: 1.0, particles: 0.75, clouds: 16, city_fins: true, fog_far_scale: 1.0, lod_far_m: 170, antialias: true, shadows: 'off', shadow_map: 0, shadow_reach_m: 0 },
  HIGH: { dpr_cap: 3.0, dpr_floor: 1.0, particles: 1.0, clouds: 22, city_fins: true, fog_far_scale: 1.0, lod_far_m: 220, antialias: true, shadows: 'pcf', shadow_map: 1024, shadow_reach_m: 24 }
  /* shadows: the sun casts a shadow map that follows the player (reach = half-size of the orthographic shadow box, metres). Measured 2026-09-17: a PCF 1024 map on the phone tier cost +1.9 ms p95 on the Spec A route (the 70k-triangle player drawn again + PCF in every receiving fragment), so MED / LOW use the blob contact shadow only; HIGH (desktop) has the real sun shadow — the player casts (PCF 1024, reach 24 m); soft 2048 with every rig casting cost +4.9 ms p95 on the desktop route */
  /* PASS 4 (G28, measured 2026-09-18 with probe_fidelity at emulated DPR 2 / 3): the phone tier's old cap of 1.0 rendered 331×717 buffer px behind a 1170×2532 screen (28 % of the device pixels; his gameplay box 193 buffer px tall, upscaled ~5×) — that was the primary 'pixelated / low-res' cause, not the assets. MED renders up to 2× device pixels (a 3× phone gets 780×1688), HIGH (desktop / opt-in) up to the full device ratio, floors 1.0; the adaptive ratio still drops 0.25 per step above 21 ms average, so a slow phone settles at 1.0 instead of 0.6. */
  /* antialias is read once at renderer creation (a WebGL context attribute) — a tier change applies it on the next load */
};
export function createQuality(opts) {
  var o = opts || {}; var params = o.params || new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  var coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  var saved = null; try { saved = localStorage.getItem('mahworld.quality'); } catch (e) { }
  var fromUrl = (params.get('quality') || (params.get('fx') === 'low' ? 'low' : '') || '').toUpperCase();
  var tier = TIERS[fromUrl] ? fromUrl : (TIERS[saved] ? saved : (coarse ? 'MED' : 'HIGH')); var source = TIERS[fromUrl] ? 'url' : (TIERS[saved] ? 'saved' : 'device');
  var listeners = [];
  var api = {
    tier: function () { return tier; }, source: function () { return source; }, get: function () { return TIERS[tier]; }, tiers: function () { return Object.keys(TIERS); },
    set: function (t) { t = String(t || '').toUpperCase(); if (!TIERS[t] || t === tier) return tier; tier = t; source = 'user'; try { localStorage.setItem('mahworld.quality', t); } catch (e) { } listeners.forEach(function (f) { try { f(t, TIERS[t]); } catch (e) { } }); return tier; },
    on: function (f) { listeners.push(f); return function () { var i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); }; },
    /* adaptive pixel ratio inside the tier: called with the recent average frame time; returns the ratio to apply or null */
    adapt: ADAPT,
    adaptPixelRatio: function (avgMs, current, deviceRatio) { var T = TIERS[tier]; var cap = Math.min(T.dpr_cap, deviceRatio || 1); var want = current; if (avgMs > ADAPT.drop_ms) want = Math.max(T.dpr_floor, current - 0.25); else if (avgMs < ADAPT.raise_ms) want = Math.min(cap, current + 0.125); want = Math.min(want, cap); return Math.abs(want - current) > 0.01 ? want : null; }
  };
  return api;
}
