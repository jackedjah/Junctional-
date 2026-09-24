# Owner decisions — full text and consequences · candidate CONSOLIDATED_C2 · 2026-09-18

Only the items that are genuinely Jah's are listed as decisions. Already-set decisions (camera truth, the walk reference V03, the split-walk pace band, the blank shops, the tree gate order, the scope) are NOT re-asked. Each item says what kind of choice it is.

## What is NOT a decision any more

- **(a) "fused glide vs step rhythm"** — SETTLED BY THE MASTER, not by me: §11.1 "a fused hover/glide has no alternating feet … mark contact/cadence not applicable where appropriate; do not invent human feet". The fused form keeps its glide with the shared pace, start and stop identity (walk identity 8/8). Nothing to answer. (If one day Jah wants the fused form to step, that is a new artistic request, not a pending choice.)
- **(b) "hover vs planted tips" (G37)** — RESOLVED AS AN ENGINEERING DEFECT, not by an appearance decision (checkpoint review item 1). What was measured, why it was wrong, and the repair are in `CONSOLIDATED_PHASE_REPORT_2.md` § G37. The retained criterion (≤ 2 cm slide per declared supported contact) is now met on the candidate: walk median 0.24 / max 0.95 cm, run 0.30 / 1.93 cm. The tips still hover (Jah's earlier motion-master B rule: no floor strike); the held point is world-fixed for the whole support hold. Nothing to answer. One optional artistic knob only: the held point sits where the swing's forward extreme puts it (≈ 20–23 cm above the floor at walk speed); if Jah wants it lower or higher, that is one authored number, not a criterion change.
- **(d) "softer rear-follow spring"** — WITHDRAWN. The V03 clip shows an apparent realignment after the turn; without an input trace it cannot be read as an automatic camera behaviour, and the current spring stays unless a demonstrated alternative on the same route and framing is put in front of Jah. No decision is asked.

## Decision (c) — the Spec G exercise table and two patterns (EXERCISE CHOICES: Jah's by design)

Source: `PASS_7_COMBAT_DECISIONS_REQUEST.md` (unchanged). Nothing in the build assumes an answer; PASS 7's independent parts (tap/hold grammar, the counter loop as PROPOSED, input buffering, measured hit-stop, tier data with `?` cells refused at runtime) are built without them.

Full text:

| Pattern | Regression (early levels) | Base | Progression (advanced) | Attack name (exists) | Input |
|---|---|---|---|---|---|
| Horizontal push | ? | ? | ? | Athlete Drive | ATTACK tap (proposed) |
| Vertical pull | ? | ? | ? | Athlete Row Hook | ? (proposed: pull-in combo starter) |
| Hinge | ? | ? | ? | Athlete Hinge Rise | ATTACK hold = heavy / INTERRUPT (proposed) |
| Rotation | ? | ? | ? | Athlete Pivot Strike | ATTACK chain (proposed: 2nd hit of the light chain) |
| Squat | ? | ? | ? | ? | ? |
| Upright row | ? | ? | ? | ? | ? |

1. Fill the `?` cells (or say "same exercise, scaled" per row). **Consequence:** each tier swaps the clip, contact speed, VFX intensity and damage; an unfilled cell stays refused at runtime as `UNASSIGNED_TIER` (never defaulted).
2. **Vector Shot** (MAHGIC tap) — which gym pattern is its mechanic? **BLOCK BREAK** (MAHGIC hold = charged shot) — which pattern? **Consequence:** until answered, both stay functional with no exercise relationship claimed (the ruleset's `UNASSIGNED_PATTERN_DEV` status).
3. Tick or change the proposed defaults: light chain Horizontal Push → Rotation → Horizontal Push finisher · heavy / INTERRUPT = Hinge Rise · pull-in starter = Row Hook · the counter loop exactly as Spec G (BLOCK beats INTERRUPT, BLOCK BREAK beats BLOCK, INTERRUPT beats BLOCK BREAK; a successful counter knocks down with brief immunity; hold GUARD while down to break out faster) · feel numbers as Control Lab tunables (tap/hold threshold 200 ms, buffer 150–200 ms, hit-stop 40–90 ms with a tiny camera impulse — no shake). **Consequence:** these are implemented as PROPOSED and reversible; a "no" on any line reverts that line only.

## Artistic verdicts (APPEARANCE: Jah's eye, separate from the engineering checks)

- **Packet C — the tree** (`botany/REVIEW_PACKET_C.png`): "tree family approved" → the placement definition (`lab/assets/botany/placement_v1.json`, 140 candidates in 38 clusters) and the far LOD become the runtime migration that replaces the laser plants; "change: height / crown / leaves / colour / energy / held-lower" → one authored number each in `lab/assets/botany/tree_spec.js`, re-rendered for another look; "reject" → the prototype is removed from the registry, the laser plants stay. The scale, geometry, winding and cost checks are already PASS and do not depend on this verdict.
- **Packets A + B — the phone experience** on the C2 draft (framing, turn feel, cluster reach, hues, sharpness, the separated legs front/side/back, the transformation, the walk with the held tips, the attack labels H-PUSH · V-PULL · HINGE · ROTATE): one line each. Nothing here changes an engineering criterion.
