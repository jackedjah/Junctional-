# MAHWORLD — Gameplay rules 17–23
14 September 2026 • Development design v0.1 • Owner-editable

## Read this first

This packet configures the new rules and the gaps between them. It is a design and implementation handoff, not evidence that the game has been changed or playtested. Claude must integrate it into the existing project. The current deliverable stays a local empty playing field with stand-ins until Astra releases a usable character export.

**Owner rule** means something you explicitly specified. **Development choice** means a value or interpretation supplied here under your instruction to fill the blanks. The latter can be changed without rewriting the system. Numerical balance has not been established by playtesting.

Three naming interpretations: Mage/Bage/Balance Mage refer to the existing **BAGE**, not a sixth class. Lien/Lean refer to **Lean**. Visionary's “not allowed to field” is interpreted as **not allowed to heal**. Claude must map these to actual existing IDs without renaming stored characters.

## 1. Three attack categories; two energy bars

| Category | What it is | Development resource rule |
|---|---|---|
| Physical attack | A body strike whose damage is physical. | No combat-magic cost; existing timing, range and recovery still limit it. |
| Physical magic | Magic delivered through a strike/body movement. | Spends combat MAHGIC; damage can contain both physical and magical components. |
| Special magic | Class spells, ranged effects, healing, buffs, traps and manifestations. | Spends the same combat MAHGIC. |

There is no fourth category called “special attack.” Combat and flight retain separate energy pools. Dash uses combat energy even while airborne. These categories do not create three resource bars, and a spell being “special magic” does not mean every spell is a ranged damage attack.

Damage category, range, targeting, effect behavior and gesture are separate skill fields. Moving nearer an opponent does not automatically replace the selected spell with a punch. No universal rule makes every projectile stronger at longer range: preserve existing skill-specific close-range reductions and leave new distance coefficients unassigned until a particular skill needs one.

## 2. Class identities and comparable attack strength

**Owner roles:** Athlete leads pure physical attack; Titan leads physical magic and explosive force; BAGE leads special magic, healing/support and overall durability; Visionary leads sustained traps/control and is the most rounded; Lean leads travel, agility and attack execution/recovery speed.

Development potency indices, before a particular skill's base budget, form/skill modifiers and defense:

| Class | Physical | Physical magic | Special magic |
|---|---:|---:|---:|
| Athlete | 100 | 70 | 60 |
| Titan | 90 | 100 | 40 |
| BAGE | 35 | 40 | 100 |
| Visionary | 65 | 45.5 | 90 |
| Lean | 55 | 56 | 48 |

These are **per-hit/category strength**, not damage per second. “100” is a comparison scale, not automatically 100 HP of damage for every move.

- BAGE physical 35 is 35% of Athlete and approximately 39% of Titan. Its weak physical offense remains below its physical magic.
- Visionary physical 65 and physical magic 45.5 are each **65% of Athlete's matching category**. That honors “same thing with physical magic,” rather than quietly making it 65% of Titan.
- Lean physical 55 is 55% of Athlete. Its magic values are **80% of Athlete's corresponding magic values**, interpreting your stated Athlete reference literally. They are not 80% of Titan's/BAGE's specialist peaks. Lean's speed is a separate advantage.
- Titan can throw a pure punch when selected. Its special identity comes from the highest infused strength and a majority-infused strike catalog; no hidden auto-infusion occurs in Physical mode.
- BAGE's high special-magic affinity is primarily spent on support budgets. Visionary receives an explicit **1.25× periodic-damage specialization** and more simultaneous offensive constructs. Thus Visionary can lead comparable sustained offense without taking BAGE's special-magic/support lead away.

Example: the same raw periodic budget of 120 deals 120 before defenses for BAGE, versus 120 × 0.90 × 1.25 = **135** for Visionary. Do not multiply duration again: 120 already means the total over the full effect, not damage each tick.

### How each class feels

| Class | Movement-pattern emphasis | Good at | Deliberate weakness |
|---|---|---|---|
| Athlete | Explosive pushes, pulls, leaps and rotational strikes; precise starts/stops. | Strongest pure hits; accurate, decisive pressure. Its small magic kit is mostly ranged. | Modest ranged-magic power; less trap/support utility. |
| Titan | Heavy hinge, press, loaded drive and short strength efforts. | Strongest infused hits, physical armor, impact and interruption resistance. | Shortest/slower dash, weaker long-range special magic, least efficient repeated magic expenditure. It still responds promptly. |
| BAGE | Controlled low-force strikes accompanying support casts. | Best healing/support, greatest overall survival, selective deception/defense and a small decay/trap set. | Low direct physical damage and middling mobility; pressure can interrupt casts. |
| Visionary | Functional chains of pushes, pulls, rotations and equipment-inspired magic. | Broad competence, strong attrition, traps, slows and area control. | No healing or lifesteal; less raw physical burst than Athlete/Titan. |
| Lean | Quick combinations, rapid repositioning and economical recovery. | Fastest movement and action phases; flexible light magic/control. | Lower damage per hit, lowest passive survivability, fewer persistent constructs. |

These are emphases, not a claim that any class cannot perform a basic movement pattern. Male/female presentations use the same class mechanics; anatomy and visual identity remain per character.

## 3. Defense, durability, agility and endurance

Development baseline at equal level/skill progression:

| Class | HP | Physical reduction | Magical reduction | Physical-only effective HP | Magic-only effective HP |
|---|---:|---:|---:|---:|---:|
| Athlete | 1000 | 16% | 15% | 1190 | 1176 |
| Titan | 1100 | 25% | 14% | 1467 | 1279 |
| BAGE | 1150 | 24% | 28% | 1513 | 1597 |
| Visionary | 1020 | 18% | 20% | 1244 | 1275 |
| Lean | 900 | 10% | 15% | 1000 | 1059 |

Effective HP here is simply HP ÷ (1 − reduction), excluding guards/heals/statuses. BAGE has the greatest baseline durability against either channel; Titan has the strongest physical armor and poise. This resolves your “BAGE durability / Titan strength” distinction without making BAGE the hardest puncher.

Movement uses the project's existing base speed and combat-dash distance. A lower phase-duration multiplier is faster. No new assumption about meters or Blender scale is required.

| Class | Travel speed | Startup/recovery duration | Dash distance | Dash duration | Dash cooldown | Dash energy |
|---|---:|---:|---:|---:|---:|---:|
| Athlete | 1.00× | 0.90× | 1.00× | 0.15 s | 1.8 s | 8 |
| Titan | 0.82× | 1.10× | 0.80× | 0.19 s | 2.4 s | 10 |
| BAGE | 0.90× | 1.05× | 0.85× | 0.18 s | 2.2 s | 9 |
| Visionary | 0.96× | 1.00× | 0.95× | 0.16 s | 2 s | 8.5 |
| Lean | 1.30× | 0.75× | 1.20× | 0.12 s | 1.4 s | 7 |

Travel speed applies to normal ground movement and free-flight cruise against each existing base speed. Forced descent retains its safe landing controller. Apply phase multipliers to startup and recovery only. Do not speed up poison ticks, cooldowns, energy drain, flight depletion or disconnect deadlines. Basic strikes may be much quicker than one second; most elaborate casts fit within your 1–3 second ceiling. Clamp startup to 0.12–3 seconds. Nonzero recovery has a 0.10-second floor; a self-KO has no recovery.

Explosive force means impact/launch strength, not travel speed. The nonbinding design indices are Titan 100, Athlete 90, Visionary 70, Lean 65, BAGE 40. Agility ranks Lean > Athlete > Visionary > BAGE > Titan. Poise ranks Titan > Athlete > Visionary > BAGE > Lean. Map these intentions to existing stagger/knockback rules; do not silently multiply damage by another rating or build a new stat subsystem just to display them.

Endurance is represented through resource capacity/regeneration, not a third stamina bar:

| Class | Combat capacity | Combat regeneration | Flight capacity vs existing base |
|---|---:|---:|---:|
| Athlete | 100 | 5/s | 1.10× |
| Titan | 95 | 4/s | 0.85× |
| BAGE | 120 | 6/s | 1.00× |
| Visionary | 110 | 5.5/s | 1.05× |
| Lean | 100 | 5.5/s | 1.00× |

Development combat regeneration begins after two seconds without a committed spend, while alive and not casting/channeling or holding guard. All of this uses simulation time. Preserve existing flight recharge/drain rules. Stronger resource reserves do not imply faster flight or stronger attacks.

## 4. Defense must respect the actual damage components

Development Physical Magic default: 60% physical + 40% magical damage. Individual skills may override that split explicitly. Physical guard reduces the physical component by 90%; magical guard reduces the magical component by 90%, within a proposed 120-degree forward cone. The other component passes through before ordinary defense. Never reduce the entire mixed hit twice.

For a mixed hit worth 100 before guard/armor, physical guard leaves **46** and magical guard leaves **64**. An explicitly dissipatable pure-magic projectile instead disappears on a successful magical guard before applying damage/status. That exception does not cover body strikes, the whole arena, persistent ground zones or poison already inside a target.

Existing DoT damage still encounters magical resistance, but holding guard does not retroactively cleanse it. Guard choice is manual. Both guards cannot be active together; guarding prevents a new attack until released, and a dash releases guard. A committed attack cannot be erased by tapping guard. Preserve existing perfect-parry behavior; no additional perfect-parry system is required here.

## 5. A control center that stays small

1. **Category tabs, upper left:** Physical / Physical Magic / Special Magic, with concise labels and a clear selected state.
2. **Contextual slots, upper right:** four equipped movement-pattern chips shared by Physical and Physical Magic. Special Magic shows up to four separate class-skill shortcuts in this development field; these do not consume or increase the four pattern slots.
3. **Tap selects; it never fires.** Changing a selection during an attack affects the next action only. A target approaching or leaving cannot switch it automatically.
4. **Hold for details:** after about 350 ms, show a compact translucent panel with the selected pattern's attacks, gestures, targeting, cost, cooldown and range. Keep it within roughly 30% of the screen, scroll when necessary, and retain a readable background. It does not pause a match. Closing it must not leak a swipe into combat.
5. **Perform the action:** hold the left Attack modifier and swipe in the right action area. Hold Dash instead to dash in the swipe direction. Track both pointer IDs. The first modifier owns that gesture until release/cancel; a second modifier must not reinterpret it midway.

Retain keyboard/mouse and on-screen equivalents, a camera alternative to right-click, and portrait/landscape layouts. The body-facing direction determines aim; camera orbit alone does not silently turn the attack. Projectile shots follow that direction. Targeted support/control skills validate facing, range, team and context; selecting an entity does not snap the character around or home a projectile unless the skill explicitly supports it.

The test field may switch equipped sets at reset/outside a round. Selecting among equipped moves remains available. This is a development restriction, not a final answer to your earlier “equip whenever” policy. The four-to-eight slot milestone contradiction remains open.

**No added preattack warnings:** no special-warning banners, ground danger circles, countdowns or forced camera alerts. Actual casting motion, manifestations/projectiles and already-applied status indicators remain visible. “Readable action” is not a fourth attack category or a new warning mechanic.

## 6. Automatic lowering and meaningful interruption

Map every move into the existing attack lifecycle: startup → commit/release → active/eccentric work → recovery. The player initiates the action and selects its direction, but does not manually operate or speed up the lowering phase. Preserve existing concentric/eccentric gameplay effects.

A valid interruption stops unfinished casting, future body-bound hits and future channel ticks. Ordinary damage is not automatically an interruption: use the existing stagger/poise tests so rapid light hits cannot universally lock down Titan. Damage and resource spending already committed are never rewound.

**Explicit development interpretation:** a projectile or independent trap already released may finish only when its skill says `autonomous_after_commit=true`. Interrupting the caster does not recall that object. Already applied buffs/debuffs retain their stated lifetimes; this flag does not undo a completed status application. If the intent is to remove even previously released objects, that can be changed in one policy; it has not been silently assumed. Knockout removes remaining owned constructs/effects after the current committed resolution batch. Match end/reset removes them all.

Resource proposal: reserve a magic move's full cost on accepted startup; commit the full cost at release. An interruption before release consumes 25% and releases the remainder, with a short fizzle cooldown of max(0.5 seconds, 25% of normal cooldown). No manual cancel/refund exploit. Invalid/repeated commands cause no extra charge; insufficient energy refuses startup. Preserve single-authority receipts and replay/dedup behavior.

Paused gameplay freezes casts, buffs, poisons and cooldowns. Disconnect itself neither refunds nor restarts the attack. The reconnect deadline keeps using OD-29's separate recorded monotonic clock. Replay must consume historical configuration and journal data, never current tuning or a fresh real-world clock.

## 7. Starter catalog and the niche mechanics

The JSON contains **30 draft skill definitions**: eight shared strike exemplars, two extra Titan infused strikes, and twenty class-specific Special Magic examples. They are a compact development catalog, not final names or a complete skill tree. Reuse existing approved skill/pattern IDs first. Four starter patterns are provisionally Push, Pull, Hinge and Rotation only when the current project lacks an approved set.

Titan therefore has six infused versus four pure strike variants in this fixture, the only majority-infused strike catalog. Other classes have four of each. This counts available strike variants, not the player's chosen attacks or the separate support/spell catalog.

| Class | Draft special-magic examples | Purpose |
|---|---|---|
| Athlete | Vector Shot, Trackburst, Set Position | Mostly ranged magic, plus a brief impact-resistance stance. |
| Titan | Iron Pulse, Anchor Brace | Close magic pressure and resistance to displacement. |
| BAGE | Mend, Rally, Sapping Mist, Delayed Seal | Heal/buff allies, with limited decay and traps. |
| BAGE niche fixture | Vanish, Phase Shell, Discord Mark, Last Pulse | Invisibility, immunity, risky friendly-fire curse, self-destruction. Swap this four-skill set outside the round. |
| Visionary | Ankle Load, Chain Circuit, Barbell Drop, Cable Snare | Gym-equipment manifestations that slow, trap and wear targets down. |
| Lean | Slip Bolt, Quickstep Echo, Tether Flick | Fast light ranged pressure, movement boost and brief control. |

### Healing and temporary defenses

BAGE may heal **living self/allies inside and outside matches**. Healing caps at missing HP, spends combat energy and has a cooldown. Inside a match, only its participants on that team qualify; a spectator or outside friend cannot heal into someone else's fight. Outside a match, use a deliberate same-party/practice-team ally selection. No resurrection, overheal rewards or healing-XP farm is added.

Vanish lasts four seconds in this draft and breaks on incoming damage or the next nonmovement skill commit, excluding its own activation. Invisibility is not invulnerability: manually aimed/AoE attacks can still connect. Phase Shell lasts 1.25 seconds, blocks damage/new harmful statuses, allows movement/dash, and prevents new offensive/support casts while active. Existing effect timers continue; immunity does not cleanse them or recall already released spells.

### Discord Mark — risky friendly fire, not mind control

For four seconds, a marked player's newly committed damage actions can also hit that player's own teammates at 50% of normal applicable damage. The player still chooses whether/how to attack and retains their team identity. They are not forced to swing, and their aim is not redirected.

BAGE may deliberately mark an enemy or an ally; ally targeting must be intentional. A mark on an ally risks damaging BAGE's own team, as you described. It does not alter healing eligibility or permit self-hits. Mark eligibility is recorded at each action's commit; already flying attacks are not retroactively converted, and an action committed while marked retains its recorded eligibility. Keep both the attacking actor and curse instigator in the record. Disable this effect outside match/team test contexts.

### Last Pulse — self-destruction

Your approximate level 12 is recorded as a **draft unlock**, not a finalized progression change. In the development fixture, BAGE starts a 2.5-second base cast, then commits a self-KO and an enemy area burst together. If interrupted before commitment, neither happens. This is fictional in-game combat, with no resurrection mechanic implied.

Resolve the burst, self-KO and other same-timestamp committed events in one authoritative batch before victory evaluation. Otherwise a duel may incorrectly close before the explosion lands. Self-KO is a committed cost, not ordinary damage: armor, immunity or a simultaneous heal cannot cancel it. Preserve existing deterministic ordering for other events. Use an existing draw rule for simultaneous team elimination; if none exists, use an explicit no-winner/no-reward `DRAW_DEV` only for this new fixture. Disconnect expiry remains `NO_CONTEST`, not this draw.

### Traps and duration effects

BAGE gets two playable duration/trap examples here and a proposed eventual inventory of six within your 5–10 range; four slots remain undefined rather than inventing a full tree. Visionary gets stronger comparative periodic output, more control variety and a three-construct cap versus BAGE's two. Others have one persistent offensive construct at a time when a skill requires one.

Ankle Load proposes a 40% slow for four seconds. Slows use the strongest value only and cannot reduce ordinary movement below 40% of normal. They do not secretly shorten a dash or root someone. A new placement at the construct cap is refused without charge. Same-family poisons take the strongest instance and refresh without an extra instant tick; separate BAGE/Visionary families can coexist. No unlimited same-family poison pileup.

Every manifestation is declared as world-fixed, following a target, following its caster or a projectile, with finite duration and appropriate range/collision rules. A floor trap can stay fixed while the debuff it applies follows its victim. Following is not permission to retarget, pass through walls, persist forever or leak an invisible enemy's position. Loss of a following target ends that manifestation; an unsteered projectile may finish its recorded heading until hit/expiry. Fixed zones tick on their recorded cadence: enter/exit does not generate extra immediate ticks.

## 8. Team play without waiting for a map

Your new maximum is **three versus three**. The development field should support equal teams of one, two or three, using synthetic slots/bots where needed. Six combatants maximum; spectators are separate. This settles the supported team size, not matchmaking, raids, arena architecture, shipping topology or the open OD-02 policy.

Normal friendly fire remains off except Discord's explicitly recorded effect. BAGE healing/buffs use actual team/context checks. Proposed round rule: a knocked-out actor cannot respawn during that round; eliminate the opposing team to win, with simultaneous elimination handled as above. Active PvP flight remains unavailable.

**Development extension of OD-29 to teams:** pause the whole round when an active combatant disconnects. Each disconnected actor keeps their original 10-elapsed-second deadline; duplicate notices cannot restart it. Resume only when all missing actors return in time. The earliest expiry makes the entire match NO_CONTEST, with no winner/reward. Spectator loss does not pause the round. Preserve RECOVERY_HELD_DEV and the existing unresolved host-failure policy.

## 9. What stays protected and what is still open

Preserve existing immutable match configurations, recorded clock readings, deterministic recovery, single-writer authority, command deduplication, no-reward development operation and real player data. New tuning must be versioned for new test matches, not silently applied to active/replayed matches. Migrate new state explicitly; do not reinterpret old journals with current constants.

Still open: exact workout skill-XP multiplier/conversion; character-specialization versus destructive class-reset meaning; the four-to-eight pattern unlock schedule; full progression/unlocks; final energy/skill names; final parry tuning; form-cost reference/pool where absent; detailed airborne PvE policy; permanent live-loadout changes; shipping topology and host-failure outcome. None should block a stand-in test field.

The existing warning near 25% flight energy, safe controlled descent, automatic form transition, class art preservation and shared-export boundary remain. No map, architecture, new MAHFITT connection, real reward/progression issuance, public deployment, Blender launch or Reallusion transfer is part of this packet.

## 10. How to use this packet

Give Claude this document, `MAHWORLD_RULES_17_23_STARTER.json`, and `CLAUDE_IMPLEMENT_17_23.md`. The validator checks internal design consistency only. Claude must separately run the real engine/browser checks listed in its handoff and report actual evidence.

Development tuning can change after playtests. Owner rules should change only when you change them. Keeping those two layers separate is what makes the five class profiles easy to tune without rebuilding the controls, combat engine or characters.
