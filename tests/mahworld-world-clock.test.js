'use strict';
/* MAHWORLD world clock — the one authoritative owner of world time.
   Plain Node. Run: node tests/mahworld-world-clock.test.js */
const path = require('path');
let passed = 0, failed = 0;
function P(name, ok, why) { if (ok) { passed++; return; } failed++; console.log('FAIL  ' + name + (why ? ' — ' + why : '')); }

(async () => {
  const mod = await import(path.join(__dirname, '..', 'mahworld/scene/world-clock.js'));
  const { createWorldClock, DEFAULTS, worldHourFor, sunElevation, daylightShare, parseTimeSpec, formatHHMM, bandFor } = mod;

  P('WC-001 the rate lives in one place: 24 world hours ≈ 2.5 real hours, 9.6 world minutes per real minute on average', DEFAULTS.cycleRealMs === 9000000 && Math.abs(createWorldClock().averageRate() - 9.6) < 1e-9);

  /* deterministic from wall time, so returning later resumes at the right state */
  const fixedLocal = () => 12;   /* pretend it is always real noon for these checks */
  const c = createWorldClock({ localHours: fixedLocal });
  const t0 = DEFAULTS.epochMs + 7 * DEFAULTS.cycleRealMs + 1234567;
  P('WC-002 state is a pure function of the instant (same ms → same world time, different clock instances)', c.state(t0).hhmm === createWorldClock({ localHours: fixedLocal }).state(t0).hhmm && c.state(t0).cycleIndex === 7);

  /* monotonic and continuous across a whole cycle, including the wrap at the cycle boundary */
  let prev = null, jumps = 0, maxStep = 0, samples = 0;
  for (let ms = t0; ms <= t0 + DEFAULTS.cycleRealMs * 1.2; ms += 15000) {
    const h = c.state(ms).worldHour;
    if (prev != null) { let d = h - prev; if (d < -12) d += 24; if (d < 0) jumps++; maxStep = Math.max(maxStep, d); }
    prev = h; samples++;
  }
  P('WC-003 world time never runs backwards and never jumps (15 s real steps stay under 10 world minutes)', jumps === 0 && maxStep < 10 / 60, 'jumps ' + jumps + ' maxStep ' + maxStep);

  /* the real-world anchor: long world days at real noon, long nights at real 01:00 */
  const shareNoon = daylightShare(13), shareNight = daylightShare(1), shareEdge = daylightShare(7);
  P('WC-004 daylight share follows the real local time: noon > 0.65, 01:00 < 0.35, morning near a half', shareNoon > 0.65 && shareNight < 0.35 && Math.abs(shareEdge - 0.5) < 0.12, [shareNoon, shareNight, shareEdge].join());
  function daylightFraction(localHours) {
    const k = createWorldClock({ localHours: () => localHours }); let day = 0, n = 0;
    for (let ms = t0; ms < t0 + DEFAULTS.cycleRealMs; ms += 30000) { if (k.state(ms).family === 'day') day++; n++; }
    return day / n;
  }
  P('WC-005 through a real-daytime cycle the world is predominantly day; through a real-night cycle predominantly night', daylightFraction(13) > 0.62 && daylightFraction(1) < 0.38, daylightFraction(13) + ' / ' + daylightFraction(1));

  /* sunrise and sunset stay put; only the speed through them changes */
  P('WC-006 sunrise is always world 06:00 and sunset always 18:00, whatever the share', Math.abs(worldHourFor(0, 0.3) - 6) < 1e-9 && Math.abs(worldHourFor(0.3, 0.3) - 18) < 1e-9 && Math.abs(worldHourFor(0, 0.7) - 6) < 1e-9 && Math.abs(worldHourFor(0.7, 0.7) - 18) < 1e-9);
  P('WC-007 sun elevation peaks at world noon, bottoms at world midnight, crosses zero at 06:00 and 18:00', Math.abs(sunElevation(12) - 1) < 1e-9 && Math.abs(sunElevation(0) + 1) < 1e-9 && Math.abs(sunElevation(6)) < 1e-9 && Math.abs(sunElevation(18)) < 1e-9);

  /* smooth transitions: daylight is a ramp, not a switch */
  const k = createWorldClock({ localHours: fixedLocal });
  let maxDelta = 0; prev = null;
  for (let ms = t0; ms <= t0 + DEFAULTS.cycleRealMs; ms += 5000) { const d = k.state(ms).daylight; if (prev != null) maxDelta = Math.max(maxDelta, Math.abs(d - prev)); prev = d; }
  P('WC-008 daylight changes smoothly (no step larger than 3% per 5 real seconds)', maxDelta < 0.03, String(maxDelta));

  /* bands and labels */
  P('WC-009 the day is named in bands that wrap through midnight', bandFor(12).key === 'day' && bandFor(18).key === 'sunset' && bandFor(19).key === 'dusk' && bandFor(23).key === 'night' && bandFor(1).key === 'night' && bandFor(3).key === 'late-night' && bandFor(5.5).key === 'dawn');

  /* validation freeze and parsing */
  P('WC-010 a frozen clock returns the pinned hour and reports it as frozen; release restores real time', (k.freeze('night'), k.state().frozen === true && k.state().band === 'night') && (k.freeze('07:30'), Math.abs(k.state().worldHour - 7.5) < 1e-9) && (k.freeze(14.25), k.state().label === 'DAY') && (k.release(), k.state().frozen === false));
  P('WC-011 time specs parse: names, HH:MM, numbers; nonsense is null', parseTimeSpec('dusk') >= 18.6 && parseTimeSpec('dusk') < 20.2 && parseTimeSpec('23:15') === 23.25 && parseTimeSpec(26) === 2 && parseTimeSpec('banana') === null && formatHHMM(23.25) === '23:15' && formatHHMM(24) === '00:00');

  /* the module owns no colour and no rendering */
  const fs = require('fs'); const src = fs.readFileSync(path.join(__dirname, '..', 'mahworld/scene/world-clock.js'), 'utf8');
  P('WC-012 the clock knows nothing about colour, themes, rendering or the document', !/THREE|document\.|Color|theme|0x[0-9a-f]{6}/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));

  console.log('mahworld-world-clock: ' + passed + '/' + (passed + failed) + ' PASS');
  if (failed) process.exit(1);
})().catch(e => { console.error(e); process.exit(2); });
