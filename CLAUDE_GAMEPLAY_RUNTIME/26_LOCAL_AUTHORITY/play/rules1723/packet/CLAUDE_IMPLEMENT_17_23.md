# CLAUDE — IMPLEMENT OWNER ANSWERS 17–23 IN THE EXISTING TEST FIELD
14 September 2026 • Continue the current project; preserve completed work

## Mission

The owner supplied class/combat answers 17–23 and authorized filling gaps with sensible editable defaults. Use the accompanying `MAHWORLD_RULES_17_23.md` and `MAHWORLD_RULES_17_23_STARTER.json` as the new development design. Implement the mechanics in the existing local empty playing field, with the same authoritative host and presentation adapter.

The owner wants to open the game and actually try movement, attacks, defenses and class differences. Keep the field runnable throughout. Continue through the stages below without asking permission at each ordinary reversible step. An unfinished or blocked Astra face/export does not block stand-in gameplay.

The JSON is a design exchange format, not a verified drop-in runtime schema. Map it into existing configuration and action/effect code. Do not build a second combat engine or load invented field names blindly. Read applicable workspace instructions and the current resume; do not assume any earlier prompt was executed just because it exists.

This scope updates the earlier restriction against adding class kits/team effects: these new owner answers authorize that work now. It does not authorize a new map, full skill tree, real progression pipeline, matchmaking service or art-source edits.

## 1. Reconcile once, then implement

Read the actual runtime class/catalog/configuration, attack phases, guard/resources, targeting, team/damage/healing state, manifest adapter and relevant recovery paths. Map existing canonical class IDs to Athlete, Titan, BAGE, Visionary and Lean; BAGE/Mage/Balance Mage are one existing class. Do not create a sixth class or rename persisted IDs indiscriminately.

Record only concrete differences: already working, small configuration change, missing mechanic, unrelated open decision. If an existing approved move already performs a draft skill's role, reuse it and document the mapping. Do not replace established pattern names, animation bindings or skill progression with these placeholder names.

Owner directives outrank the proposed tuning. Every new numerical value is development tuning unless the design identifies it as an explicit owner rule. The owner authorized these provisional choices; do not stop to ask about every coefficient. Flag the two main readings in the ledger: Visionary's apparent “field” means no healing, and Lean's 80% magic reference is Athlete's matching category, not each specialist's peak.

Freeze the selected new ruleset into each newly created development match. Preserve old active matches and replay behavior. If the current host requires new serializable fields/events, version them and supply explicit compatible defaults for historical state. Never replay old actions through new mutable balance tables. A replay unable to reconstruct required state must report that incompatibility using established recovery handling, not invent data.

## 2. Classes, damage channels and small controls

Implement five data-driven profiles with identical mechanics for each class's M/F presentations. Use supplied relative movement/phase/dash values against known runtime units. Do not guess physical scale from an unverified Blender file.

Expose three explicit action categories: Physical, Physical Magic, Special Magic. Preserve exactly two energy pools: combat and flight. PA costs no magic in the new fixture; PM/SM and dashes spend combat energy. Flight retains its independent rules and cannot activate during PvP. Keep existing form cost/MIN_DWELL behavior where this packet leaves them open.

Separate potency, skill base budget, damage components, periodic specialization, guard and ordinary resistance. Apply each once. Use the design's mixed-hit test: raw 60 physical + 40 magical leaves 46 behind physical guard, or 64 behind magical guard, before armor. Dissipation is only for declared eligible pure-magic projectiles. Never infer a fourth “special attack” category or three energy pools.

Use compact category tabs and contextual four-pattern chips; special magic has a separate four-shortcut development loadout. Tap selects without attacking. Long-press details explain actual available gestures/cost/range without pausing PvP or taking over the screen. Preserve left Attack/Dash modifier + right gesture and keyboard/on-screen equivalents. A camera alternative to right-click must remain.

Pointer cancellation, focus loss, orientation changes and drawer closing must release input state without an accidental attack, duplicate cost or sticky guard. Category changes do not cancel an action or switch targeting when an enemy changes range.

## 3. Starter moves and lifecycle

Map/reuse the catalog's four starting pattern exemplars. Provide pure and infused variants. Titan gets its two additional infused variants, making it the only majority-infused body-strike catalog in this fixture; Physical selection must still remain purely physical.

Wire automatic lowering through the existing concentric/eccentric phases. Preserve established committed/eccentric damage. Valid interruption stops uncommitted body/channel work, not committed receipts. Autonomous released effects continue only according to explicit skill policy. Respect poise/stagger; do not make every damage tick cancel every action.

Integrate reservation/commit/fizzle behavior into the current single authoritative spend path. No duplicate deductions/refunds on repeated commands, crash/recovery, action rejection or resets. The current primitive names may differ from the design; map them rather than adding parallel accounts.

Startup is capped at three seconds after class scaling, ordinary attacks can be faster, and Lean has the shortest comparable startup/recovery. Do not change cooldown/tick/effect/deadline clocks through the phase multiplier. Paused simulation must pause gameplay effects.

## 4. Finish the stated class mechanics through reusable effect types

Use the existing effect system where available. Implement and expose the supplied starter examples, reusing their handlers/data:

- Athlete: two ranged magic examples plus impact resistance.
- Titan: close special-magic pressure/brace alongside the strongest infused strikes.
- BAGE: in/out-match healing and a team buff; one decay zone and one trap; a separate development niche loadout for invisibility, short immunity, Discord Mark and Last Pulse.
- Visionary: target-following ankle weight slow, fixed chain zone, barbell area hit and triggered cable trap. No direct healing, self-healing or lifesteal.
- Lean: light fast projectile, short movement boost and brief target slow.

Do not invent the rest of BAGE's eventual 5–10 duration/trap inventory or final level unlocks. Last Pulse's approximate level 12 remains a draft note; test fixtures may expose it without changing character progression.

Define finite lifetimes, real collision/range/target checks, strongest-only slow and same-family DoT behavior, entity caps, cleanup and no automatic retarget. Target-following attached weights/debuffs and caster-following shell effects demonstrate the nonstationary branch without requiring a new homing projectile system.

Do not add warning banners, countdowns, danger circles or forced camera alerts. Actual body/cast/manifestation/projectile visuals and applied status icons should make actions readable with existing modest effects.

Healing must reject outsiders/spectators assisting active match participants. Discord must preserve team identity, target/aim choice and healer allegiance while allowing only marked voluntary damage actions to hit original teammates. Log both the damage actor and curse source. Handle the snapshot across projectile delay and replay. No forced actions or global friendly-fire toggle.

Last Pulse must resolve self-KO and blast atomically before victory evaluation. An interrupted precommit cast produces neither. Respect existing simultaneous-outcome handling; add the explicitly scoped no-reward DRAW_DEV only if needed for this fixture. Do not change disconnect NO_CONTEST into a draw.

If a critical shared effect needs correction, finish that reusable handler and its meaningful tests before multiplying new one-off implementations. Keep a runnable default loadout and a clearly labeled niche fixture; default quickslots may be fewer than four when the class has fewer skills.

## 5. Team tests on the same empty floor

Keep the existing 1v1/two-client/spectator lab working. Add equal-size 2v2/3v3 development fixtures through the current authority, using synthetic participants/bots where suitable. No matchmaking backend, architecture, raid campaign or cloud deployment.

Exercise actual team-aware damage, healing, targeting, knockout and reset. Spectators are not combatants. Use the proposed all-opponents-KO round rule and explicit same-batch tie outcome without real rewards or in-round resurrection.

Preserve OD-29: ten elapsed seconds, original per-disconnected-actor deadlines, whole-round pause, resume only when all return in time, earliest expiry NO_CONTEST/no winner/no reward. The live deadline clock remains separate from paused simulation. Duplicate notices cannot restart grace; reconnect must evaluate expiry even when no simulation ticks have run. Historical replay reads only recorded deadline data.

This team extension must not resolve host-failure policy. RECOVERY_HELD_DEV, immutable match config, single-writer authority, no rewards, progression protection and isolated QA replay stay intact. Avoid rerunning the old real event-loop stall experiment unless the driver itself changes or evidence contradicts its recorded fix.

## 6. Evidence sufficient to call it usable

First run the packet's design validator. Then add/run focused real-runtime tests for the changed paths, including:

1. All five profile orderings, Lean/Visionary ratio reference, BAGE durability, Titan's majority-infused catalog, same M/F profile, and one-time factor application.
2. Mixed-hit guards; eligible projectile dissipation; applied DoT not retroactively blocked; range changes cannot switch the selected category.
3. Valid/invalid healing inside and outside matches, full-HP capping, no resurrection or outsider healing, no Visionary healing.
4. Precommit interruption versus released autonomous effect; correct reservation/fizzle/full cost, no duplicate/recovered spend, no manual lowering control, no infinite/stale effect after knockout/reset.
5. Fixed zone and following debuff; finite ticks, reentry/reapplication without extra tick, strongest-only slow/DoT and capped constructs; visibility/target loss.
6. Invisibility break conditions, immunity restrictions/timer behavior, Discord voluntary same-team hit without team mutation, Last Pulse interruption and atomic simultaneous-KO case.
7. Equal teams up to 3v3, real team elimination/tie, spectator handling, multiple disconnect deadlines, late reconnect with zero ticks and final NO_CONTEST exactly once. Run the relevant OD-29/recovery regressions because team/action persistence is touched.
8. Crash/replay under a frozen ruleset reproduces damage, costs, statuses, target snapshots and outcomes; a poisoned fresh clock is never consulted during historical replay. QA replay does not issue new live rewards/effects.

Perform an actual local browser playthrough when the available permitted tooling supports it: select each class, move/dash, manually change categories, hit/miss a target, use both guards, heal a damaged ally, demonstrate a fixed/following manifestation, try the BAGE niche fixture, reset and repeat. Check desktop and basic portrait/landscape layouts. Browser screenshots are evidence only of what they display; Node tests alone are not proof the controls are playable.

Keep the development field on loopback using the existing dynamic-port convention; do not use reserved port 8140 or terminate another server. No public hosting or remote-phone setup. If browser automation is unavailable, finish the launchable implementation and report browser interaction UNVERIFIED with an exact short manual check, rather than claiming it passed.

Run focused tests that resolve these risks. Do not turn this into a broad historical test campaign, new benchmark framework or refactor. Preserve active work by applying changes at a safe checkpoint.

## 7. Art and deferred work boundary

Use a code-generated stand-in and the current adapter until Astra publishes an explicit shared game-test export, manifest and dependencies. Then read only that released handoff and preserve its candidate/approval status. No native source repair, Blender retries, CC/Reallusion transfer, protected master edits or hard-coded Athlete anatomy in gameplay.

Do not implement a map, full tutorial/quest/social flow, class reset, final unlock schedule, new MAHFITT sync, character XP changes, real rewards, production deployment, unapproved dependency upgrade or shipping matchmaking choice. The owner's 3–5× workout proposal is skill XP, never a raw damage multiplier.

## Deliver a running continuation

Update the existing rule ledger and resume with exact owner rules, proposed defaults actually adopted, mapping to runtime IDs, changed files and deferred decisions. Do not report a configured skill as runtime-tested unless it was executed. Do not stop at another plan or settings document when implementation is available.

Return:
FIELD OPENS / ACTUAL LOCAL URL:
EXACT LAUNCH AND CONTROLS:
FIVE CLASS PROFILES / THREE CATEGORIES / TWO RESOURCES:
STARTER AND NICHE SKILLS ACTUALLY WORKING:
GUARDS / INTERRUPTIONS / LOWERING:
HEALING / TRAPS / FOLLOWING EFFECTS:
TEAM FIXTURES / DISCORD / SELF-KO OUTCOME:
OD-29 / REPLAY REGRESSION:
ACTUAL BROWSER EVIDENCE:
ASSET SLOT AND LIMITATIONS:
PROPOSED DEFAULTS / OPEN DECISIONS:
CHANGED FILES:

Continue until the implementation and focused verification are complete, or report the exact genuine access/input blocker and the remaining independent work completed. Do not claim the entire game, art or final balance is finished.
