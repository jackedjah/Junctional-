# CLAUDE_GAMEPLAY_RUNTIME — headless gameplay core (Gameplay Foundation Phase 2, 2026-09-13)
Executable, headless gameplay systems for the approved Phase 1 vertical slice. Vanilla ES modules (same conventions as the runtime
foundation / mrmah3d), plain-node tests, no graphics, no physics, no VFX, no animation, no networking, no Blender, no asset access.
Canon: read `..\CLAUDE_GAMEPLAY_FOUNDATION\00_CANON\MAHWORLD_GAMEPLAY_CANON.md` first; this folder never rewrites it.

```
00_CORE/        config.js (THE consumer of PLAYER_MOVEMENT_DEFAULTS.json + dev_tuning.dev.json; unit conversions once), events.js, policies.js (strategy slots for OD-02/15/01/08/06), bootstrap.js, dev_tuning.dev.json (EXPERIMENTAL placeholders for undecided values)
01_PROFILE/     GameplayProfile.js      creator selection + registry + data loadout -> gameplay profile (cosmetics never read by combat)
02_MOVEMENT/    MovementCapabilities.js (canUseAttack / canFly / getFlightCeiling / getMovementSpeedRange / canUseLowerBodyPattern / canClimb), FlightSession.js (travel vs combat ceilings, drain, forced descent, hover fallback), MahlocoAdapter.js (wraps the approved mahloco JS port; no copied transition machine)
03_RESOURCES/   Resource.js             CURRENT / MAX / COST / REGEN / LOCKOUT / DEPLETED, tunable, consumers: flight / specials / transformations / utility
04_COMBAT/      AttackModel.js (attack definitions, validation, registry, movement-pattern kit), data/attacks.dev.json (DEVELOPMENT_REFERENCE incl. ATHLETE_BILATERAL_UPRIGHT_ROW_MANIFESTATION), data/class_loadouts.dev.json (PROVISIONAL; only matrix patterns; Athlete dev preset, others PENDING_HUMAN_REVIEW)
05_ECCENTRIC/   EccentricRuntime.js     ATTACK_CONCENTRIC_BEGIN → ATTACK_MAIN_IMPACT → ATTACK_ECCENTRIC_BEGIN → ATTACK_ECCENTRIC_TICK… → ATTACK_ECCENTRIC_END → ATTACK_COMPLETE; six canon fields; tail < main guard
06_INPUT/       InputActions.js         device-independent actions; placeholder device maps (not final gestures)
07_DUEL/        DuelSession.js          AVAILABLE … CLOSED, health, boundary, combat flight ceiling, winner / loser / result / timestamps, camera metadata only
08_SPECTATOR/   SpectatorSystem.js      spectators (cap from canon), FCFS Call Next queue, winner offer; after-decline policies A / B / C = EXPERIMENTAL_POLICY (OD-02, none canonical)
09_ACTIVITIES/  ActivitySession.js      generic joinable activities + climbing hooks (CLIMB_ENTER … CLIMB_RELEASE), split required, no IK / physics
10_RAIDS/       RaidParty.js            party 1..4, leader, difficulty inputs, scaling hooks through RAID_SCALING_POLICY (OD-08)
11_MENTORS/     MentorQuest.js          placeholder mentors MENTOR_01..12, five quest types, reward hooks through progression
12_PROGRESSION/ Progression.js          WORKOUT_SYNC_EVENT → XP_REWARD → STAT_PROGRESS → LEVEL_PROGRESS (PERMANENT) + temporary buffs (never mutate the profile)
13_EMOTES/      IdleAndEmotes.js        five class flourishes as data, 30 s scheduler from canon, universal emote registry scaffold
14_TELEMETRY/   Telemetry.js            local playtest counters (JSON log)
15_SIMULATOR/   simulate_vertical_slice.mjs   node 15_SIMULATOR/simulate_vertical_slice.mjs [--class ATHLETE] [--sex F] [--policy A|B|C] [--log out.json]
16_TESTS/       gameplay_runtime.test.mjs      node 16_TESTS/gameplay_runtime.test.mjs   (125 checks incl. the full headless slice)
17_HANDOFF/     GAMEPLAY_RUNTIME_PHASE_2_REPORT.md
```
ATHLETE is the DEVELOPMENT prototype class only (OD-19); nothing here declares it the permanent first-playable class.
