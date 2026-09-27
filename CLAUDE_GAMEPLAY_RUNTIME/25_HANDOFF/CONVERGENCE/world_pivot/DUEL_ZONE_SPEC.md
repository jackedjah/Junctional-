# MAHWORLD — DUEL ZONE SPECIFICATION (M17, locked 2026-09-27)

Owner directive 2026-09-27, "PIVOTAL DUEL RULE — 2 TO 5 PLAYERS". This file is the contract between the world, the host and future
Character integration. Engine: `26_LOCAL_AUTHORITY/lab/world/duelRoster.js`. It is pure (no THREE, no DOM) and host-shareable.
Court renderer: `26_LOCAL_AUTHORITY/lab/world/combatZones.js`. Tests: `16_TESTS/gameplay_world_duel_roster.test.mjs` and
`16_TESTS/gameplay_world_combat_zones.test.mjs`. Registry: `combat_zones` (the `roster` and `sizing` blocks).

Nothing here claims live gameplay validation. The host's duel (`DuelHost.js`) is still strictly 1v1: JOIN_DUEL refuses a third fighter.
The 2–5 fighter match is implemented and proven host-free. **Live host integration is PENDING** the runtime bridge.

## 1. Who can fight

| rule | value |
|---|---|
| fighters per match | **2 to 5** (`min_fighters` 2, `max_fighters` 5) |
| same-class matchups | **legal** — ATHLETE vs ATHLETE, five ATHLETEs, two VISIONARYs + three BAGE … |
| identity | **fighterId ≠ classId**: one participant per *fighter*, never one per class. Duplicate classes are first-class: with classes equally likely, a duplicate occurs in 20 % of 2-fighter, 52 % of 3-, 80.8 % of 4- and 96.16 % of 5-fighter rosters |
| slot | stores participant identity (the lowest free slot 0..4 on joining); it never decides colour |
| colour | the participant's **class** decides it — ATHLETE gold, TITAN blue, LEAN crimson, VISIONARY purple, BAGE pink (the registry crystal families' glow) |

## 2. The waiting window and the match lifecycle

| state | meaning |
|---|---|
| **DORMANT** | Nobody queued. The court is neutral infrastructure. |
| **READY** | WAITING. The first fighter onto a dormant court opens a **30 s window**. Others may join until the court is FULL at 5. Joining **never restarts** the window. Nobody is fighting and duel damage is not active. |
| **ACTIVATION** | The roster **LOCKS** when the window ends with ≥ 2 fighters. With 1 fighter the match **never starts**, and the court stays READY (window expired). If a second fighter then arrives, the match starts **at once**: there is no second timer. Activation is a brief dramatic moment (~2.8 s). |
| **ACTIVE_DUEL** | The match is running. |
| **RESOLUTION** | The match ends. Fields stop tracking and drain (~1.4 s). |
| **RESET** | A neutral sweep (~1.2 s), then **DORMANT**. |

- A 6th fighter, or anyone arriving after the lock, is refused (FULL / LOCKED). They are a spectator: white presence only, no territory.
- If everybody leaves during WAITING, the court goes RESET, then DORMANT.
- **REENTER:** fighters still standing on the court after a match must step off and back on to queue again. Nobody is pulled into a second duel.

### Leaving and disconnecting

OD-29 is preserved: `00_CORE/dev_tuning.dev.json` → `local_authority`, owner-approved 2026-09-14.

| event | before the lock | after the lock |
|---|---|---|
| EXIT (voluntary) | leaves the queue, and the slot frees | **CONCEDE**. The last fighter standing wins (`LAST_STANDING`). With ≥ 2 still standing, the match goes on. |
| DISCONNECT | leaves the queue | **PAUSE_AND_WAIT** (the whole match pauses) with a **10 s** reconnect window per fighter. A repeated notice keeps the first deadline. Reconnecting in time resumes. The **first expiry ends the match NO_CONTEST** (no winner). |
| steps off the court | leaves the queue | **OUTSIDE**: the field fades and the match goes on. Coming back is a RETURN. Ring-out rules stay with the host. |
| nobody present for 10 s | — | NO_CONTEST (`ABANDONED`) |
| host KO | — | `eliminate()`, the same as a concede |

## 3. The data model (a roster snapshot)

```
{ duelZoneId, state: DORMANT|READY|ACTIVATION|ACTIVE_DUEL|RESOLUTION|RESET, since, authority: LOCAL|HOST,
  rules { min_fighters, max_fighters, wait_s, reconnect_window_s },
  waiting { startedAt, elapsed_s, remaining_s, expired }, full, participantCount, presentCount,
  lockedAt, resolvedAt, resetAt, paused, result { outcome: WIN|NO_CONTEST|ENDED, winnerId, reason },
  territories { n, template, templateName: HALVES|SECTORS|QUADRANTS|DICE_FIVE, theta, byFighter { fighterId: k }, order [fighterId by territory] },
  participants [ { fighterId, slotId, classId, classColor, worldPosition {x,y,z}, local [x,z], isPresent, isLocked,
                   teamId (null = free-for-all; reserved for future team modes), airborneState { airborne, altitude_m },
                   localInfluenceRadius, territory, status: WAITING|LOCKED|OUTSIDE|RECONNECTING|CONCEDED|KO|DONE,
                   joinedAt, reconnectDeadline } ] }
```

The engine exposes `join`, `leave(id, t, EXIT|DISCONNECT|OUTSIDE|KO)`, `update`, `sync(inside, t)`, `begin(fighters, t)`, `resolve`,
`eliminate`, `snapshot(t)`, `applySnapshot(hostSnapshot)` and `events()`. Every time-driven transition fires at its exact moment, so a late
tick never changes an outcome.

- **Authority:** the host runs the engine and ships `snap.duelZones`. The client mirrors it (`applySnapshot`).
- **Legacy 1v1 path:** until the bridge lands, the client can still map the host's 1v1 (`snap.duel.state`) onto a court.

## 4. What the court shows

The **world identity** layer is five tiny permanent class gems in a centre rosette: gold, blue, crimson, violet, pink. It shows in every state
and never colours the surface. The gems do not indicate fighters. Their area is 0.125 % of the court.

| state | the court |
|---|---|
| DORMANT | Overwhelmingly neutral: crystalline white, ice white, pale blue-white, a faint shimmer, plus the gems. |
| READY | Still neutral. A **pearl light fills the border band as the 30 s pass**. Once the window has passed with one fighter, it becomes a steady slow pulse: waiting for a challenger. A soft **white** presence sits under each waiting fighter. No class colour anywhere. |
| ACTIVATION | **Generated from the locked roster: one territory per participant** (§5), in the participants' class colours only. Five colours are never faked. A surge crosses the court. A thin pearl **slot separator** marks every territory border. It is firmer between two territories of *one* class, so GOLD + GOLD still reads as two fighters. The territories let go after ~1.3 s. |
| ACTIVE_DUEL | The court is **neutral again**. Each fighter carries a **local field** in their class colour (§6), and the other classes do not light the court. |
| RESOLUTION → RESET | The fields stop tracking and drain. A neutral sweep follows. Neutral plus the gems remain, with no residual fighter colour. |

## 5. Activation territories — generated, never authored

There are five classes, so the configuration space is large:

- 5⁵ = 3,125 slot-ordered full rosters;
- 6⁵ − 1 − 5 = **7,750** positional 2–5 states;
- **246** class compositions: C(6,4) + C(7,4) + C(8,4) + C(9,4) = 15 + 35 + 70 + 126.

None of these are authored. ONE algorithm handles them all.

**Geometry** is the court's own symmetry, with equal shares:

| fighters | territories |
|---|---|
| 2 | Halves on the court symmetry line (0 / 45 / 90 / 135°) nearest the line between the two fighters. |
| 3 | Three sectors of **exactly one third** each. The top slot is at 90° and the lower two sit at 202.6° / 337.4°, so the borders run at 33.7°, 146.3° and 270°. Plain 120° sectors on a square give 0.356 / 0.322 / 0.322. |
| 4 | The four corner quadrants. |
| 5 | The dice-five: four corners plus a central diamond \|x\| + \|z\| ≤ h·√0.4, each exactly one fifth. The central territory has its own lit band, so the fifth share carries equal visual weight. |

**Arrangement** (`arrangeTerritories`) is deterministic and exhaustive over the n! orders (at most 120). Candidates are ranked by these criteria, in order:

1. **Least shared border between the same or similar colours.** Border lengths are the exact Voronoi edge lengths inside the court. The same class scores 1. Different classes score 0.25 × (1 − RGB distance / √3), so close hues (gold / crimson, blue / violet) are kept apart when possible. Duplicates therefore land as far apart as the geometry allows: diagonal quadrants for four, opposite corners with a lone class in the centre for five.
2. **Least travel** from where each fighter stands at the lock.
3. **Slot order** as the tie-break (lexicographic).

The result is computed **once at the lock** and frozen, so it can never flicker. It is presentation only: identity, spawn and gameplay are untouched.

Example: GOLD, GOLD, RED, BLUE, PINK puts the golds in opposite corners and never in the centre.

**Colour** at a court point: the nearest territory's class colour, whitened across the seam (e_k = exp(−1.6 (d_k − d_min)), seam = clamp(Σe − 1) · 0.85). Two territories meet through white and never through an average of their hues.

## 6. Local fields (ACTIVE_DUEL)

Each fighter's field is a soft square-diamond footprint, a subtle crystalline aura and a ground-bound influence with a feathered boundary.
It is class-coloured and follows the fighter continuously. It **responds to motion**: the aura and footprint swell by up to 12 % with speed.

For point p and fighter i, with R = the influence radius and lift = the height above the floor:

```
liftK = max(0.35, 1 / (1 + 0.3 · lift))         — airborne: fainter and narrower with height, never below 35 %, never detached
Rr    = R · (0.7 + 0.3 · liftK) · (1 + 0.12 · speed)
d     = (0.75 |p − xᵢ| + 0.25 · L1(p − xᵢ) / √2) / Rr
wᵢ    = presence · liftK · exp(−1.8 d²) · (1 − smoothstep(0.85, 1.35, d))
```

Overlaps are resolved as follows:

```
W_c        = Σ wᵢ over fighters of class c          (same class reinforces: never a new colour)
D          = W_top⁴ / Σ_c W_c⁴                      (1 = one class alone, 0.5 = two classes equal)
colour     = mix(class colour of the top class, neutral grey 0.96, clamp(2 (1 − D)))
intensity  = min(1.25, max wᵢ + 0.3 (Σ wᵢ − max wᵢ))
display    = colour · intensity, scaled by its brightest channel when > 1 (never clipped per channel)
```

- **Same class:** GOLD + GOLD stays gold and brightens by at most 1.3×.
- **Different classes:** they blend only in the overlap, meeting through a neutral white seam. Each side keeps its own hue.
  - An average would pass orange for gold ↔ crimson, and would fake VISIONARY purple for blue ↔ pink.
  - Easing is always toward an equal-channel grey. Pearl is faintly blue and would turn crimson toward pink.
- **Result:** no sixth colour can appear, and 3–5 overlaps never wash out to white.
- **Footprints:** the strongest footprint wins a pixel, so crossing outlines never mix.

The floor shader implements exactly these formulas. The test checks the constants.

## 7. Size (the owner's target is 18–24 m; combat usability first)

The court is **24 m of clear playable width (≈ 79 ft) plus a 1.2 m inlaid border (26.4 m across).** It is validated from `rules_17_23` and
`dev_tuning`:

- **Lock-on:** lock-on holds to 34 m. The court diagonal (33.9 m) stays inside it, so nobody on the court drops lock. M15d's 31 m court let two fighters stand 43.8 m apart.
- **Dash room:** the longest dash (LEAN 7.4 m) plus a 0.4 m body fits from the centre in every direction.
- **Start spacing:** five fighters' dice-five starts sit 10.7 m apart. That is beyond the longest strike (2.875 m + 0.6 m hit radius), the largest area effect (6.25 m) and a dash plus two bodies.
- **Host boundary:** the host's 1v1 duel boundary is a 12 m radius, which gives the same 24 m.
- **Flight:** PvP flight is off (`teams.pvp_flight`). The field handles airborne fighters anyway.
- **Growth:** if Character integration shows 24 m is cramped for five, the court grows, and lock-on must grow with it.

## 8. Placement — a modest set of two

**Rules (tested):**

- ≥ 4 m of approach and exit space beyond each court's circumradius, clear of every collider.
- **No lamp or fixture inside the court** (+ 2 m).
- Never on a road, spur, forecourt or water.
- Flat ground.
- Clear of the official match court.
- No two courts within 90 m.
- No court in open sight of more than one other. A pair closer than 120 m with no building between counts as in open sight.
- No mass placement.

**Re-survey:** every collider, path, water body, interactable, NPC spot **and every lamp / fixture** was checked at the 26.4 m footprint.

- Only three open regions fit inside the field walls: the canonical court's lawn, the north-west lawn by the gym, and a north lawn 74 m from the canonical court. Outside the walls is sea and cliff.
- The south apron and the plaza's west edge clear the colliders, but the plaza-rim lamps stand inside every footprint that fits there. They were tried and withdrawn.

**The two placed courts:**

| court | position | setting |
|---|---|---|
| **CZ_ELEVATOR_GROVE** | (45, 110) | the canonical court: open paving between the HALO trunk and the north-east forest |
| **CZ_GYM_LAWN** | (−47, 121.5) | the open lawn between the gym and the north-west forest |

The two mirror each other across the elevator lawn, 92.7 m apart.

**Not placed yet:** the other M15 sites stay in `pending_sites`. More courts need new open ground, or the owner may decide to move plaza lamps.

## 9. Coverage — mathematical, not thousands of fixtures

`gameplay_world_duel_roster` covers these cases.

**Rules:**

- 1 fighter never starts combat.
- 2 start exactly at the window's end.
- Joining never restarts the window.
- A late second fighter starts the match at once.
- Up to 5 are accepted; the 6th is refused.
- Duplicate and all-same-class rosters work.
- fighterId is unique.
- classId never determines identity.

**States and colour:**

- DORMANT and READY are neutral.
- ACTIVATION shows only the participants' classes.
- ACTIVE_DUEL returns the court to neutral.
- Fields track their fighters.
- RESOLUTION stops tracking.
- The five gems remain in every state.
- No sixth colour appears.

**Blending:**

- Same-class overlap keeps its colour.
- All ten class pairs, plus random 3–5-field pile-ups, stay in the participants' own colour-law families or neutral, at every light level the floor uses.

**OD-29 and leaving:** covered as listed in §2.

**Every one of the 246 compositions:**

- the roster forms and locks;
- exactly N territories generate, with equal shares;
- the count and the duplicates are preserved;
- only class colours appear, and every territory pixel and seam is lawful;
- the arrangement reaches the best possible colour score;
- no NaN appears in the snapshot or in the court's GPU attributes.

**Strategic subset:** every join order (656 permutations) of nine duplicate-heavy rosters must be optimal and deterministic, and the territories must not flicker while fighters move.

**Stress:** 300 seeded event storms × 80 events hold every invariant.

## 10. Visual contract

`evidence/m17_duel_contract.jpg` is the visual contract for future Character integration. Each panel is labelled, and there are twelve:

1. DORMANT
2. READY
3. 2-fighter ACTIVATION
4. 3-fighter ACTIVATION
5. 4-fighter ACTIVATION
6. 5-fighter ACTIVATION
7. duplicate-class ACTIVATION
8. ACTIVE_DUEL with 2 fields
9. ACTIVE_DUEL with 5 fields
10. same-class overlap
11. mixed-class overlap
12. RESET

The dev preview can stage any of them:

```
?duelDemo=ZONE:CLS,CLS[,…]:DORMANT|READY|WAITING_EXPIRED|ACTIVATION|ACTIVE_DUEL|RESOLUTION|RESET[:SPREAD|CLUSTER|AIR]&scaleRefs=N
```

Duplicate classes are allowed in the roster.
