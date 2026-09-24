/* MAHWORLD :: propulsion audio voice bookkeeping (pure, no WebAudio) — coalescing per id+side, bounded voices, oldest stolen */
import { createVoiceLimiter } from '../26_LOCAL_AUTHORITY/lab/fieldSound.js';
var pass = 0, fail = 0; function ok(c, msg) { if (c) pass++; else { fail++; console.log('FAIL', msg); } }
var L = createVoiceLimiter(3, 60);
var a = L.request('me:L', 0.000, 0.14); ok(a.ok && !a.steal, 'first pulse plays');
var b = L.request('me:L', 0.030, 0.14); ok(!b.ok && b.reason === 'COALESCED', 'same side within 60 ms coalesces (one step = one pulse)');
var c = L.request('me:R', 0.035, 0.14); ok(c.ok, 'other side is independent');
var d = L.request('me:L', 0.070, 0.14); ok(d.ok, 'same side after 60 ms plays again');
ok(L.active(0.08) === 3, 'three voices active (' + L.active(0.08) + ')');
var e = L.request('npc:L', 0.09, 0.14); ok(e.ok && e.steal && e.steal.key === 'me:L' && e.steal.start === 0, 'fourth voice steals the OLDEST (me:L @0)');
ok(L.active(0.1) === 3, 'still bounded at max_voices');
var f = L.request('npc:R', 0.5, 0.14); ok(f.ok && !f.steal, 'expired voices are released without stealing');
var st = L.stats(); ok(st.max === 3 && st.coalesced === 1 && st.stolen === 1 && st.started === 5, 'stats ' + JSON.stringify(st));
L.release(f.rec); ok(L.active(0.5) === 0 || L.active(0.5) === 0, 'release removes the record (' + L.active(0.5) + ')');
/* burst protection: a stalled frame replaying 10 crossings for one side yields ONE pulse */
var M = createVoiceLimiter(8, 60); var played = 0; for (var i = 0; i < 10; i++) { if (M.request('me:L', 1.000 + i * 0.001, 0.14).ok) played++; } ok(played === 1, 'burst of 10 crossings in 10 ms → 1 pulse (' + played + ')');
/* undefined key never coalesces (accents) */
var N = createVoiceLimiter(8, 60); ok(N.request(undefined, 0, 0.1).ok && N.request(undefined, 0.001, 0.1).ok, 'keyless requests are not coalesced');
console.log('RESULT beam audio voices: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
