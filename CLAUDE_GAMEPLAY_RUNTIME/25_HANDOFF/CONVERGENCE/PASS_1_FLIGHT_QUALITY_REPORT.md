PASS 1 — flight-state reliability (F01), O4 hold-fly, quality baseline

WHAT I DID:
  26_LOCAL_AUTHORITY/play/PlayMode.js       F01: a REQUIRED landing (zero-energy forced · low-energy controller · deliberate EXIT · DESCEND) that comes to rest on a NON-walkable solid top COMPLETES as a landing on that support (`fl.perch`); a perched body is supported by its top (the ground rule no longer teleports it to the deck below); stepping off = `FLIGHT_FALL` → 9 m/s fall with horizontal air control, DASH refused `FALLING`, ENTER/ASCEND catches the fall when the pool allows (`FLIGHT_CAUGHT_FALL`); take-off clears the perch. O4: HOVER captures `hold_alt = altitude + vz·|vz|/(2·vertical_brake_mps2)` and settles on it (`hold_gain_per_s`), braking at `vertical_brake_mps2`; a release whose stop point is on the ground completes as a landing (`landing:true`); a hold below a solid top rests on it; the ceiling clamp re-captures the hold. Room change / practice reset clear perch · falling · hold · hold_alt. Snapshot adds `perch`, `falling`, `hold_alt`.
  00_CORE/dev_tuning.dev.json               flight.vertical_brake_mps2 = 20 (stop distance 1.06 m from a 6.5 m/s climb), flight.hold_gain_per_s = 3, `_doc_o4`.
  26_LOCAL_AUTHORITY/lab/play.js            Space / FLY are HOLD controls (press = ENTER/ASCEND, release ALWAYS sends the hold — never gated on a polled snapshot); F tap = lift 600 ms then hold (reversible default, documented); F while flying / LAND = deliberate landing; C / DOWN hold = descend (C release re-asserts a held Space); focus loss releases every hold; the Spec B camera-pitch → altitude rule REMOVED; Control Lab: drawing-buffer px, render scale %, workload line.
  26_LOCAL_AUTHORITY/lab/gameHud.js         FLY / DOWN holds keyed by pointerId (a second finger on 1–4 / GUARD / DOWN never orphans the hold); airborne-only `#g-flyaux` DOWN (hold) + LAND pair; FLY reads "LANDING required" and dims during a forced landing; the notice says FALLING for a fall and "FORCED LANDING — flight MAHGIC ran out, landing first" once the pool has regenerated (the recording's contradiction).
  26_LOCAL_AUTHORITY/lab/play.html          `#g-flyaux` placement: desktop = top row of the action column (nothing below moves), touch = fixed column left of the 2×2 (FLY never moves under the thumb).
  26_LOCAL_AUTHORITY/lab/PresentationAdapter.js   `workload()` for the Control Lab; forced-landing glow reads `forced_landing` (was a dead branch).
  26_LOCAL_AUTHORITY/lab/controlLab.js      stats line: buffer W×H px, render scale, workload (entities / rigs / animated / effects / pooled / static chunks).
  26_LOCAL_AUTHORITY/deploy/sync_district_colliders.mjs   NEW — splices the district shapes + manifest landmark envelopes into `_runtime_mapping.field_colliders_district_v1` (rest of rules_17_23.dev.json byte-identical; `--check` mode).
  26_LOCAL_AUTHORITY/deploy/build_district.mjs   solid / deck tops = the REAL sampled surface rounded up to 0.25 m (`--topq`), not the 1.5 m voxel top (bodies floated 0.4–1.26 m above roofs); regenerated `district_v1_colliders.json` (1 247 shapes) + manifest landing levels (gym roof 48.3 m).
  26_LOCAL_AUTHORITY/play/rules1723/rules_17_23.dev.json   mapping synced (28 base + 1 247 district shapes, 4 landmark envelopes at 0.67×).
  16_TESTS/gameplay_flight_f01.test.mjs     NEW — 29 checks (host): perch on exhaustion / EXIT / DESCEND, permissions, regen + take-off, fall off + catch, hold tolerance MEASURED, ceiling, ground-stop landing, the recording's exact zero-energy case from the 100 m ceiling, tracked page evidence.
  16_TESTS/gameplay_district.test.mjs       1b mapping == JSON + envelopes == manifest; roof-terrace selection from the manifest heights.
  16_TESTS/gameplay_spec_b_camera.test.mjs  #6 flight pitch → vertical: SUPERSEDED — O4 (history kept, source-grep + replacement evidence checks).
  26_LOCAL_AUTHORITY/deploy/probe_flight_f01.mjs · probe_flight_o4.mjs   NEW page probes; probe_spec_b_extra.mjs E1: SUPERSEDED — O4 marker.
  25_HANDOFF/CONVERGENCE/PASS_0_RECONCILIATION.md   F09 (host/visual collider mismatch) added to the ledger; RESOURCE_USE_RECORD.md started.

WHAT I FOUND:
  · F01 root cause (`play/PlayMode.js:168` before): a descending body was HELD on a non-walkable solid top "without landing"; with `fl.forced` true the landing predicate (altitude ≤ ground) could never fire 24 m above the deck → forced forever, MOVE refused, meter refilling. Reproduced in the page before the fix (`f01_trace.json` history: hold GYM_S157 at 28.55 m, ground 24, forced true, res 100, MOVE `FORCED_LANDING_IN_PROGRESS`).
  · F09 (new): the authority collided against the S11-size landmarks (2 356 shapes, gym 71.5 × 72 m) while the picture showed 0.67× (47.9 × 48.2 m) — `rules_17_23.dev.json` was never updated by the owner round; only the client JSON was. Invisible walls 12 m outside every landmark; mid-air perches on invisible storeys.
  · Deck tops were the 1.5 m voxel tops (`build_district.mjs:38` `h: y1`): a body on the gym roof stood 0.4–1.26 m above the visible mesh.
  · Reviewer (fresh context) findings fixed: Space quick-tap lost its release (`play.js` keyup gated on a stale snapshot) → runaway climb; a second finger orphaned the FLY hold (`gameHud.js` single `pressBtn` slot); a perch fall was a helpless 3 m/s float with refused inputs; HOVER could capture a hold below the ground; room change kept stale fields; C keyup dropped a held Space; the adapter's forced glow read a field that does not exist.
  · Local-player interpolation (inspected, NOT changed): snapshots are polled every 60 ms (`play.js` `setInterval(poll, 60)`), every entity — the local player included — follows its snapshot with an exponential filter `k = dt·12` (~83 ms constant, `PresentationAdapter.js:151`); far rigs animate at 1/2/3 frame steps beyond 30/60 m. The route breakdown shows `poll_wall_ms ≈ 10 ms` per poll with `snapshot_ms 0.04` (the in-page host is cheap): a per-frame local-player read would remove ~30 ms of average position latency for ≈ 0.7 ms/frame. Recorded as a PASS 5 candidate (motion foundation), not done here.

EVIDENCE
  inspected:          the recording addendum entries F01/F07, `flight_state_contradiction.jpg`; PlayMode.js flight tick; Colliders.js `solidAt` / `groundHeight`; the S11 vs 0.67× collider sets side by side.
  rendered/measured:  `node 16_TESTS/gameplay_flight_f01.test.mjs` → 29/29 (perch altitude = top + 0.05 m; hold: stop 1.056 m theoretical vs host 1.056; settle |err| ≤ 0.05 m, overshoot past hold ≤ 0.15 m; fall ≤ 0.225 m per tick at 60 Hz; forced case from 100 m: MOVE refused `FORCED_LANDING_IN_PROGRESS` while forced, then perch, MOVE accepted, ENTER by the rules).
                      `node deploy/probe_flight_f01.mjs` (headless Chrome, in-page authority) → 14/14: clear ground A1–A5; solid top TOWER_S122 B1–B3 (HUD notice gone, MOVE accepted); walk-off fall D1–D2 (continuous at ≤ 9 m/s); deliberate landing C1–C3. Trace: `25_HANDOFF/CONVERGENCE/flight/f01_trace.json`, still `f01_B_end.png`.
                      `node deploy/probe_flight_o4.mjs desktop|portrait|landscape` → 7/7, 9/9, 9/9: Space/FLY hold → release settles with err ≤ 0.004 m (measured), stop 0.38–0.56 m at the sampled release speed; looking up (pitch −0.40) / down (1.20) while flying forward: altitude unchanged (Δ 0.00 m); DOWN hold / LAND; affordance airborne-only, 58 px, ≤ 79 px from FLY, no overlap, FLY moved 0 px; blur releases the hold; two-finger GUARD + power 1 during a FLY hold: climb continues, release holds. Files `o4_*.json`, stills `o4_portrait_airborne.png`, `o4_landscape_airborne.png`. Touch = EMULATED (synthetic pointer events).
                      `node 16_TESTS/gameplay_district.test.mjs` → 31/31 on the synced 0.67× colliders; `deploy/sync_district_colliders.mjs --check` → IN SYNC. All 27 test files green (see the commit).
                      Spec A route series (owner round A vs PASS 1 B, interleaved, unlocked pacing): see `25_HANDOFF/PASSES/perf/route_series_conv1.json` — filled in below once the series completes.
  iPhone:             NOT tested (Jah only).

ACCEPTANCE (brief §PASS 1):
  required landing genuinely completes                → PASS (host #1a/#3/#8, page B2/C1; perch altitude = top + 0.05 m)
  resources, messages, action permissions agree       → PASS (host #1b/#8a, page B3: no LANDING notice, MOVE accepted, ENTER by the rules; FLY dims + "LANDING required" during a forced descent; notice truthful once the pool regenerates)
  flight can start again when the real rules permit   → PASS (host #2, page A5/C2)
  no stale movement/action restriction                → PASS (host #4a/#4b, page A3/B3/D1)
  O4 hold = climb, release = hold, tolerance measured → PASS (host #5–5d: |err| ≤ 0.05 m, stop 1.056 m explicit; page A1/T2: err 0.004 m)
  looking up/down never changes altitude              → PASS (page A2/T4: Δ 0.00 m at pitch −0.40 / +1.20)
  descent/landing path discoverable                   → PASS (C / DOWN hold, F / LAND; airborne-only affordance; page A3/A4/T5/T6)
  focus loss clears held input                        → PASS (page T7)
  comparable baseline metrics + declared limits       → route series pending (this laptop, unlocked pacing, ±3× machine-load variance → only interleaved medians compared)
  original Spec A checks retained                     → PASS (gameplay_spec_a_perf 58/58)
  displaced tests SUPERSEDED — O4, not weakened       → PASS (Spec B #6 + probe E1 marked; replacements: host #5–5d, page A2/T4)

OPEN RISKS:
  · The tap take-off (F key / click) climbs 600 ms after the release — a documented reversible convenience; O4's literal hold semantics are Space / FLY.
  · A landing cannot be aborted by a hold once EXIT was sent (ASCEND leaves `exiting` true) — pre-existing; owner decision.
  · Roof slabs are 0.25 m bins of the sampled surface: a body can still stand up to 0.25 m above a sloped roof.
  · Phone timing of the two-finger hold is EMULATED only.

SUPERSEDED: Spec B "flight pitch → vertical" (test #6, probe E1) → O4. Spec B release/return-when-idle → O1 (PASS 2).

CANDIDATE: not published. `deploy/static_dist` rebuilt locally (41.6 MB, private-content scan clean); the live demo (`6aac25101f17ce5ed37166e4`) is unchanged.

ZIP:              produced at the PASS 2 gate (Card A bundles camera + flight + HUD) — no separate PASS 1 package.
NEXT:             PASS 2 (camera: O1 persistent orbit + explicit reset, O2 both-side drag, obstruction recovery, fade restore). No gate yet.
