# MAHWORLD GAMEPLAY PHASE 5A — LOCAL AUTHORITATIVE DUEL + SESSION / REWARD SAFETY
2026-09-14 · Claude (engineering lane) · local-only development milestone on top of the Phase 4.1 baseline · **STOP after this report (no 5B, no deployment)**

| field | value |
|---|---|
| HOST STATUS | **WORKING (development lab).** One in-process authoritative host (`26_LOCAL_AUTHORITY/DuelHost.js`) owns time, identity, MAHGIC, cooldowns, forms, duel state, damage, spectator capacity, queue order, result and reward receipts. Each fighter is its own gameplay world composed by the existing `composeGameplay`; the duel session, spectator system and Call Next queue are shared. Transport-neutral (in-process, lossy test wrapper, HTTP). A loopback node HTTP lab host serves a state-only page. |
| TWO-CLIENT + SPECTATOR RESULT | **PASS.** Through the SAME host: connect A / B / spectator → accepted duel → valid movement and FUSED→SPLIT transition through mahloco → basic attack → upright-row concentric + eccentric events driven once → spectator Call Next → client B disconnect (duel paused) / reconnect → shared result (winner PLAYER_A) → one receipt per fighter → clean exit with released controls. Both fighter views and the spectator converge on the same health, state and terminal result. |
| DUPLICATE COMMAND / REWARD TEST | **PASS.** Same command id + same payload → cached ack, not executed twice (one impact, one spend); same id + different payload → `COMMAND_ID_CONFLICT`; stale seq → `OUT_OF_ORDER`; forged damage / xp / health / position / winner / actor fields → `FORBIDDEN_FIELD`; foreign session binding → `SESSION_CLIENT_MISMATCH`; spectator attack → `ROLE_NOT_FIGHTER`; duplicate queue entry → `ALREADY_QUEUED`. Reward receipt applied once (claim-before-apply), duplicate and concurrent duplicate → `ALREADY_APPLIED`, other rule version refused. |
| RECONNECT/EXIT RESULT | **PASS.** Lost acknowledgement + reconnect re-sends the pending command with its original id → host answers from the ack cache (one impact, one MAHGIC spend). Disconnect → RECONNECTING, duel paused at the tick boundary (`PAUSE_AND_WAIT_DEV`); duplicate reconnect idempotent; window expiry → duel aborted WITHOUT rewards or winner, opponent released (no forfeit invented); expired session → `SESSION_EXPIRED`, must connect fresh; page visibility = client-side signal only; voluntary LEAVE mid-duel = existing concede rule (labelled CONCEDE_DEV); late attack after the result → `DUEL_NOT_ACTIVE`, late damage callbacks ignored and logged; no frozen avatar (controls RELEASED on every exit path). |
| EXISTING REPLAY/PROFILE PROTECTION | **Unchanged.** The host imports no persistence, replay or recorder module (test-asserted); receipts are memory only; Phase 4.1 isolated replay remains a separate QA path (33 / 33). No browser profile, MAHFITT data or fitness record is read or written. Protected folders: 63 files, `MUTATION: false`. |
| BROWSER/TRANSPORT PROOF | **PASS.** Node HTTP transport test through the served host (section 6) + headless Chrome against the running lab server: `MAHWORLD_LAB_SMOKE {"connect":[true,true,true],"join":[true,true],"spectate":true,"spectator_attack":"ROLE_NOT_FIGHTER","transform":{…"accepted":true…"to":"SPLIT"},"pattern":true,"special":{…"ATHLETE_BILATERAL_UPRIGHT_ROW_MANIFESTATION"…},"callnext":true,"callnext_dup":"ALREADY_QUEUED","drop":true,"paused":true,"reconnect":true,"concede":true,"agree":true,"terminal":{"winner":"PLAYER_A","loser":"PLAYER_B","result":"CONCEDE"},"xp_A":40,"xp_B":15,"leave":[true,true,true]}` — `26_LOCAL_AUTHORITY/evidence/chrome_lab_smoke.log`, `lab_page_dom.html`, `lab_page_smoke.png`. One light headless run; the lab server self-terminated. |
| TEST TOTALS / NEW REGRESSIONS | new `16_TESTS/gameplay_phase5a.test.mjs` **46 / 46**. Regression (fresh runs after the bootstrap seam + tuning change): Phase 2 125 / 125 · Phase 4 85 / 85 · Phase 4.1 33 / 33 · scenarios 7 / 7 · sandbox Phase 4 35 / 35 · sandbox Phase 3 59 / 59 · foundation validator 118 / 118. **No new regressions.** Pre-existing, unrelated, unchanged: mrmah3d `mrmah3d.test.js` 378 / 379, `mrsmah.test.mjs` 13 / 30, `mrmah3d-r111` anatomy assertion. Test counts are not proof of balance, security or real latency. |
| PRODUCTION LIMITATIONS | see below |
| BLENDER / ASTRA / CODEX | No Blender launched (0 Blender processes at the end). No .blend / texture / GLB / Astra worktree opened. `.codex` untouched, no process killed (a self-exiting server was used for evidence after a process-stop command was denied by the permission gate). Port 8140 not used. |

## What was built (one isolated folder: `CLAUDE_GAMEPLAY_RUNTIME\26_LOCAL_AUTHORITY\`)
| file | role |
|---|---|
| `Protocol.js` | envelope contract `MAHWORLD_LAB_1`: closed action list, forbidden fields, size / depth / finiteness limits, move-vector bounds, payload hashing for duplicate detection |
| `DuelHost.js` | the authority: accounts (fixture), sessions + dev bindings, arrival-order command execution with per-session seq and idempotent ack cache, fighter worlds via `composeHeadless`, shared `DuelSession` + `SpectatorSystem`, attacks through `createAttackExecution` once, host-side band integrator for position, targeting strategy `SOFT_LOCK_IN_DUEL` (EXPERIMENTAL, OD-15), disconnect strategy `PAUSE_AND_WAIT_DEV` (OD-29), settlement through reward receipts, role-filtered snapshots, single `tick(dt)` scheduler, optional explicit bot fighter |
| `RewardReceipts.js` | once-only development receipt ledger with a memory store adapter boundary |
| `LabClient.js` | transport-neutral client (CONNECTING / READY / IN_DUEL / RECONNECTING / CLOSED), pending-command resend on reconnect, in-process / lossy / HTTP transports |
| `lab_host_server.mjs` | loopback node HTTP host (port 0 by default, URL printed), serves `/lab/*` + two allow-listed client modules only, JSON API, body / content-type / origin / path checks, single tick interval, `--exit-after` for evidence runs, dev `/api/hold` for headless captures |
| `lab/index.html`, `lab/lab.js` | Client A / Client B / Spectator panels + shared authoritative state panel; state-only (no renderer); `?smoke=1` scripted proof |
| `COMMAND_AUTHORITY_CONTRACT.md` | the short command / authority contract |
| `evidence/` | browser smoke console line, DOM dump, screenshot, server stdout |

Smallest seam refactor: `00_CORE/bootstrap.js` now exposes `loadHeadlessData()` + `composeHeadless(data, opts)`; `bootstrapHeadless` is unchanged in behaviour. No second transition table, no second combat engine (test-asserted).

## DEVELOPMENT ASSUMPTIONS (EXISTING CANON / DEVELOPMENT DEFAULT / OPEN)
| item | class | value used here | ledger / replacement point |
|---|---|---|---|
| fused / split speed bands, backward multiplier, spectator max, combat flight cap | EXISTING CANON | `PLAYER_MOVEMENT_DEFAULTS.json` via cfg | — |
| MIN_DWELL, transformation state machine | EXISTING (mahloco rev 2) | untouched; refusals surfaced as `TRANSFORM_REFUSED` | — |
| attack fixtures (4 basics + upright-row special), eccentric tail below main | DEVELOPMENT DEFAULT | `attacks.dev.json`, `dev_tuning.attack.*` | OD-03 / OD-18 (not settled) |
| MAHGIC max / regen / special cost | DEVELOPMENT DEFAULT | `dev_tuning.resource` | OD-06 |
| Call Next decline | DEVELOPMENT DEFAULT | policy A (EXPERIMENTAL) | OD-02 |
| targeting | DEVELOPMENT DEFAULT | `SOFT_LOCK_IN_DUEL` (opponent in an active duel) | OD-15 |
| real-time prototype loop | LAB CHOICE | real-time host tick 0.05 s | product direction OPEN (OD-20 context) |
| disconnect / reconnect | DEVELOPMENT DEFAULT | `PAUSE_AND_WAIT_DEV`, window 8 s, abort without rewards | **OD-29 (new row)** |
| voluntary exit mid-duel | DEVELOPMENT DEFAULT | `CONCEDE_DEV` = existing concede rule | OD-29 |
| duel rewards | DEVELOPMENT DEFAULT | `progression.duel_win_xp` / `duel_loss_xp`, rule version `DEV_0.2.0` | OD-06 / progression review |
| movement integration | DEVELOPMENT DEFAULT | host-side band-min-speed integrator, boundary clamp, no physics | OPEN (no ledger row; not a rule) |
| MVP opponent shape | LAB EXERCISE | two local clients + spectator (OD-21 alternative A exercised, not decided) | OD-21 |
| controls | untouched | lab buttons submit intents only | OD-13 / OD-24 / OD-28 |
| session TTL, envelope limits, protocol version | DEVELOPMENT DEFAULT | `dev_tuning.local_authority` | replace by config |

## Blocking owner questions (max three)
1. **OD-29** — when a fighter's connection is lost, is the intended product rule pause-and-wait, forfeit, or abort? (The lab pauses and aborts without rewards.)
2. **OD-02** — after the winner declines Call Next, which of A / B / C is the rule? (Lab uses A, labelled experimental.)
3. **OD-21 / product direction** — is the first shipped duel two real clients on one authority (as exercised here) or one client plus a scripted partner?
Everything else stays a labelled development preset or open for the interview.

## Local lab launch / playtest
```
cd C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\CLAUDE_GAMEPLAY_RUNTIME
node 26_LOCAL_AUTHORITY/lab_host_server.mjs          →  prints http://127.0.0.1:<port>/lab/index.html
```
Open the printed URL (loopback only). Panels: Client A, Client B, Spectator. Sequence: CONNECT (all three) → JOIN DUEL (A, then B; duel goes ACTIVE) → SPECTATE (spectator) → MOVE FWD / STOP, TRANSFORM, PATTERN 1 + ATTACK UP, PATTERN 2 + SPECIAL (HOLD) on a fighter → CALL NEXT (spectator; press twice to see the duplicate rejection) → DISCONNECT (sim) on B (shared panel shows `paused`) → RECONNECT → CONCEDE → the shared panel shows the terminal result and xp on both fighters → winner ACCEPT / DECLINE NEXT → LEAVE. Every rejection shows its reason under the panel. `?smoke=1` runs this automatically. Ctrl-C stops the host. The Phase 3 sandbox on port 8140 is unrelated and untouched.

## Files changed
New: everything under `26_LOCAL_AUTHORITY\` (listed above), `16_TESTS\gameplay_phase5a.test.mjs`, this report.

| modified | before sha256 | after sha256 | change |
|---|---|---|---|
| `CLAUDE_GAMEPLAY_RUNTIME\00_CORE\bootstrap.js` | `9d3cc0182763da26c6d7b5787cb28a023ecb8d0371b277851b5e93d95df4519c` | `76a20fc126f0b37b63174fe731e9acf5c209768afdeecc56b04abc8ad55e56ca` | seam: `loadHeadlessData` + `composeHeadless`; `bootstrapHeadless` unchanged |
| `CLAUDE_GAMEPLAY_RUNTIME\00_CORE\dev_tuning.dev.json` | `33bfb944d40140acc9fa774260b994d79754d9727ca198caddc3070341746c75` | `65df6df6fb02939521ed00de5288c9b23a270a2128f4e5e4b6023e12a53ee3d3` | added `local_authority` block (EXPERIMENTAL) |
| `CLAUDE_GAMEPLAY_FOUNDATION\15_OPEN_DECISIONS\GAMEPLAY_OPEN_DECISIONS.md` | `1586967e88e53a11cf1c7df303c140cbbb16b637146cf5b4950a5f0fbe0bf310` | `f07c7b3ebdbe8805b69e7df355d9a17dd5bdb5057b6fb239c990ec510432bf08` | appended OD-29 (append-only) |

Rollback: delete `26_LOCAL_AUTHORITY\`, `16_TESTS\gameplay_phase5a.test.mjs` and this report; restore the three files above to their "before" hashes (bootstrap: previous single-function file; dev tuning: remove the `local_authority` key; ledger: delete the OD-29 row). All other suites are independent of these additions.

## PRODUCTION LIMITATIONS (honest)
- Local, loopback, single process. Dev tokens are bindings, not authentication; no TLS, accounts, matchmaking, WebSocket netcode, WAN latency, moderation or chat.
- In-memory idempotency for receipts and command acks: not durable exactly-once across a host crash; the storage adapter boundary exists, no database transaction does.
- Position is a tiny host-side integrator on the canonical bands with a boundary clamp: no physics, no collision, no anti-cheat claim beyond rejecting client-set positions.
- Disconnect handling, exit-as-concede, targeting, rewards and balance are development presets (OD-29, OD-15, OD-02, OD-06, OD-18, OD-21) — nothing is settled.
- The lab page is state-only; no 3D view, no character proxies; graphical integration would duplicate gameplay wiring and was left out on purpose.
- Bot fighter support exists only when explicitly added to a slot; not used in the two-client proof.
- Headless evidence needed a dev-only `/api/hold` endpoint to keep the page open; it is harmless but lab-only.
