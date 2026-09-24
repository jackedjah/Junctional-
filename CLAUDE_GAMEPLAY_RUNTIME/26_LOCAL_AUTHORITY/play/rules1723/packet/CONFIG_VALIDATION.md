# Design configuration validation

Ruleset: `MW_DEV_2026_09_14_R17_23_V0_1`

**47/47 internal checks passed.**

This checks authored data, arithmetic and cross-rule constraints only. It does not execute the game, verify existing project IDs, prove multiplayer/recovery behavior, establish balance, or prove browser playability. Those checks remain Claude's integration task.

Catalog: 30 skills, 5 class profiles, three attack categories, two energy pools.

- PASS: Exactly five canonical design classes
- PASS: Three attack categories and two independent energy pools
- PASS: No gender stat split or claimed shipping validation
- PASS: All numeric parameters are finite and nonnegative
- PASS: ATHLETE uniquely leads PHYSICAL
- PASS: TITAN uniquely leads PHYSICAL_MAGIC
- PASS: BAGE uniquely leads SPECIAL_MAGIC
- PASS: BAGE direct physical power is 30–40% of both Athlete and Titan
- PASS: BAGE physical attack is below its physical magic
- PASS: Visionary is 60–70% of Athlete in each stated strike category
- PASS: Visionary matching-category ratios agree
- PASS: Lean physical matches the 50–60% Athlete range
- PASS: Lean magic matches 75–85% of the recorded Athlete reference
- PASS: Resistance values cannot divide by zero or heal damage
- PASS: BAGE greatest baseline effective HP for physical_damage_reduction
- PASS: BAGE greatest baseline effective HP for magical_damage_reduction
- PASS: Titan strongest physical armor
- PASS: Lean fastest travel and Titan slowest
- PASS: Lean shortest comparable startup and recovery
- PASS: Lean fastest dash and Titan slowest dash
- PASS: Titan uniquely leads explosive-force intent
- PASS: Visionary comparable periodic output exceeds BAGE
- PASS: Damage component weights sum to one
- PASS: Mixed-guard worked examples evaluate to 46 / 64 before armor
- PASS: Resource routing has no third energy pool
- PASS: Slot counts do not combine patterns and magic shortcuts
- PASS: Skill IDs are unique
- PASS: Skill categories and class references resolve
- PASS: Every class has all three selectable categories
- PASS: Pure skills cost zero magic; magic costs fit every eligible class pool
- PASS: All supplied startup budgets respect the three-second scaled limit
- PASS: Nonzero recoveries stay above the scaled floor
- PASS: Only Titan has a majority-infused strike catalog
- PASS: Default magic loadouts contain at most four unique eligible skills
- PASS: Niche loadout is four valid BAGE skills
- PASS: Visionary has no heal effects and its no-healing rule is explicit
- PASS: BAGE healing has self and ally targets
- PASS: BAGE duration/trap inventory remains within owner range
- PASS: Periodic schedules have a finite whole tick count, no immediate extra tick
- PASS: Periodic total divided among ticks reconstructs its budget
- PASS: Projectiles have positive speed, range and finite lifetime
- PASS: Stationary traps have bounded placement/lifetime and following debuff
- PASS: Only released projectile/zone/trap examples use autonomous flag
- PASS: Discord is voluntary, keeps team identity and does not allow self-damage
- PASS: Last Pulse is an atomic self-KO and burst with a draft unlock
- PASS: Team fixture supports at most 3v3, excludes spectators, disables PvP flight
- PASS: Safety of project scope: no rewards, new map or claimed shipping topology
