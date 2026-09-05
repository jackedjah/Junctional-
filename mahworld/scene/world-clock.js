/* MAHWORLD :: WORLD CLOCK — the ONE authoritative owner of world time.

   Law (brief "REAL-WORLD-SYNCHRONIZED DAY / NIGHT SYSTEM"):
   - MAHWORLD runs an accelerated day: 24 world hours ≈ 2.5 real hours by
     default (1 real minute ≈ 9.6 world minutes). The rate lives HERE only,
     as `cycleRealMs`, so it can be tuned in one place.
   - The player's REAL LOCAL TIME is the broad anchor: through the real day
     the world spends most of each cycle in its day family, through the real
     night most of each cycle in its night family. The anchor does not move
     the sun by jumps; it changes how fast the world moves through daylight
     versus darkness inside each cycle (long days at real noon, long nights
     at real 01:00), so sunrise is always world 06:00 and sunset always 18:00.
   - Everything is a pure function of wall-clock milliseconds, so leaving and
     returning, backgrounding, or reconnecting resumes at the correct world
     state without simulating missed frames.
   - Time of day and the player's world Theme are separate dimensions; this
     module knows nothing about colour.

   Validation only: freeze('night' | 'dusk' | '07:30' | 14.25) pins the world
   hour so matched proofs can be taken at the same camera. */

export const DEFAULTS = Object.freeze({
  cycleRealMs: 2.5 * 60 * 60 * 1000,      /* one full world day in real time */
  epochMs: Date.UTC(2026, 0, 1, 0, 0, 0),   /* world cycles are counted from here; deterministic across devices */
  shareMean: 0.5,                           /* average share of a cycle spent in daylight */
  shareSwing: 0.22,                         /* real noon → 0.72 daylight, real 01:00 → 0.28 */
  sharePeakLocalHour: 13                    /* the real local hour of the longest world days */
});

/* Named bands of the world day (world hours). Order matters for wrap-around. */
export const BANDS = Object.freeze([
  { key: 'dawn',           label: 'DAWN',           from: 5.0,  to: 6.5 },
  { key: 'morning',        label: 'MORNING',        from: 6.5,  to: 10.0 },
  { key: 'day',            label: 'DAY',            from: 10.0, to: 15.5 },
  { key: 'late-afternoon', label: 'LATE AFTERNOON', from: 15.5, to: 17.5 },
  { key: 'sunset',         label: 'SUNSET',         from: 17.5, to: 18.6 },
  { key: 'dusk',           label: 'DUSK',           from: 18.6, to: 20.2 },
  { key: 'night',          label: 'NIGHT',          from: 20.2, to: 26.0 },   /* 20:12 → 02:00 */
  { key: 'late-night',     label: 'LATE NIGHT',     from: 26.0, to: 29.0 }    /* 02:00 → 05:00 */
]);

const TAU = Math.PI * 2;
export function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
export function smoothstep(a, b, v) { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }

/* Daylight share of one cycle for a real local time of day (hours, 0..24). */
export function daylightShare(localHours, o = DEFAULTS) {
  const s = o.shareMean + o.shareSwing * Math.cos(TAU * (localHours - o.sharePeakLocalHour) / 24);
  return Math.min(0.85, Math.max(0.15, s));
}

/* Cycle position u (0..1) → world hour (6 = sunrise, 18 = sunset). */
export function worldHourFor(u, share) {
  const s = Math.min(0.85, Math.max(0.15, share));
  const h = u < s ? 6 + 12 * (u / s) : 18 + 12 * ((u - s) / (1 - s));
  return ((h % 24) + 24) % 24;
}

/* Sun elevation as a signed 0..1 quantity: +1 at world noon, −1 at world midnight. */
export function sunElevation(worldHour) {
  const h = ((worldHour % 24) + 24) % 24;
  if (h >= 6 && h <= 18) return Math.sin(Math.PI * (h - 6) / 12);
  const n = h > 18 ? h - 18 : h + 6;
  return -Math.sin(Math.PI * n / 12);
}

export function bandFor(worldHour) {
  const h = ((worldHour % 24) + 24) % 24;
  const hh = h < 5 ? h + 24 : h;   /* fold 00:00–05:00 onto 24–29 so the night bands are contiguous */
  for (const b of BANDS) if (hh >= b.from && hh < b.to) return b;
  return BANDS[0];
}

export function parseTimeSpec(spec) {
  if (spec == null || spec === '') return null;
  if (typeof spec === 'number' && isFinite(spec)) return ((spec % 24) + 24) % 24;
  const s = String(spec).trim().toLowerCase();
  const named = { dawn: 5.6, sunrise: 6.2, morning: 8.5, day: 12.5, noon: 12.5, afternoon: 16.2, sunset: 18.0, dusk: 18.75, evening: 19.4, night: 22.5, midnight: 0.3, 'late-night': 3.2, latenight: 3.2 };
  if (named[s] != null) return named[s];
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (m) { const h = Number(m[1]), mi = Number(m[2] || 0); if (h < 24 && mi < 60) return h + mi / 60; }
  const n = Number(s); if (isFinite(n)) return ((n % 24) + 24) % 24;
  return null;
}

export function formatHHMM(worldHour) {
  const total = Math.round(((worldHour % 24) + 24) % 24 * 60) % 1440;
  const h = Math.floor(total / 60), m = total % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

export function createWorldClock(options) {
  const o = Object.assign({}, DEFAULTS, {
    now: () => Date.now(),
    /* real local time of day in hours; overridable for tests and for devices with odd zones */
    localHours: (ms) => { const d = new Date(ms); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; }
  }, options || {});
  let frozenHour = null;

  function describe(worldHour, extra) {
    const e = sunElevation(worldHour);
    const band = bandFor(worldHour);
    return Object.assign({
      worldHour: worldHour,
      worldMinutes: worldHour * 60,
      hhmm: formatHHMM(worldHour),
      band: band.key, label: band.label,
      sunElevation: e,                          /* −1..1 */
      moonElevation: -e,
      daylight: smoothstep(-0.14, 0.28, e),     /* 0 night … 1 full day, with a twilight ramp */
      twilight: 1 - Math.min(1, Math.abs(e) / 0.3),   /* 1 exactly at the horizon crossings */
      family: e > -0.02 ? 'day' : 'night'
    }, extra || {});
  }

  return {
    options: o,
    /* Authoritative state for a real instant (default: now). */
    state(ms) {
      const realMs = ms == null ? o.now() : ms;
      if (frozenHour != null) return describe(frozenHour, { realMs, frozen: true, u: null, share: null, worldMinutesPerRealMinute: 0 });
      const cycle = (realMs - o.epochMs) / o.cycleRealMs;
      const u = cycle - Math.floor(cycle);
      const share = daylightShare(o.localHours(realMs), o);
      const worldHour = worldHourFor(u, share);
      const isDay = u < share;
      /* instantaneous rate: how many world minutes pass per real minute right now */
      const rate = (12 * 60) / ((isDay ? share : 1 - share) * o.cycleRealMs / 60000);
      return describe(worldHour, { realMs, frozen: false, u, share, cycleIndex: Math.floor(cycle), worldMinutesPerRealMinute: rate });
    },
    /* Validation only. */
    freeze(spec) { frozenHour = parseTimeSpec(spec); return frozenHour; },
    release() { frozenHour = null; },
    configure(partial) { Object.assign(o, partial || {}); return o; },
    /* average world minutes per real minute for the configured cycle */
    averageRate() { return 1440 / (o.cycleRealMs / 60000); }
  };
}
