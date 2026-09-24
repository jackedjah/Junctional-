# PASS 7 (Spec G combat) — the ONE bounded request for Jah’s decisions · 2026-09-18

The brief: "Prepare all relevant exercise / input choices as one bounded request before their implementation is required. Implement independent verified system work without using unanswered choices as permission to guess." This is that request. Everything below is either a cell Jah fills or a PROPOSED default Jah confirms or changes; nothing here is implemented as if answered.

## A. The progression-tier exercise table (Spec G — "Jah fills in the exercises")
Each attack has three tiers; the tier swaps the clip, contact speed, VFX intensity and damage. The names and inputs that already exist in the build are filled; every `?` is unknown and stays unknown.

| Pattern | Regression (early levels) | Base | Progression (advanced) | Attack name (exists) | Input |
|---|---|---|---|---|---|
| Horizontal push | ? | ? | ? | Athlete Drive | ATTACK tap (proposed) |
| Vertical pull | ? | ? | ? | Athlete Row Hook | ? (proposed: pull-in combo starter) |
| Hinge | ? | ? | ? | Athlete Hinge Rise | ATTACK hold = heavy / INTERRUPT (proposed) |
| Rotation | ? | ? | ? | Athlete Pivot Strike | ATTACK chain (proposed: 2nd hit of the light chain) |
| Squat | ? | ? | ? | ? | ? |
| Upright row | ? | ? | ? | ? | ? |

Physical Magic already in the build: "Athlete Infused Drive", "Athlete Infused Row Hook". Special Magic: "Vector Shot" (no exercise mapping yet), "Trackburst".

## B. The two patterns only Jah can choose
1. **Vector Shot** (MAHGIC tap) — which gym pattern is its mechanic? (Spec G: "pattern chosen by Jah")
2. **BLOCK BREAK** (MAHGIC hold = charged shot) — which pattern?

## C. Proposed defaults (Spec G) — confirm, change, or reject each
- Light chain: Horizontal Push → Rotation → Horizontal Push finisher.
- Heavy / INTERRUPT: Hinge Rise (hip-hinge drive).
- Pull-in combo starter: Vertical Pull "Row Hook".
- Counter loop exactly as Spec G: BLOCK beats INTERRUPT · BLOCK BREAK beats BLOCK · INTERRUPT beats BLOCK BREAK; a successful counter knocks the target down with brief immunity; hold GUARD while down to break out faster.
- Feel numbers (tunables, Control Lab): tap / hold threshold 200 ms · input buffer during recovery 150–200 ms · hit-stop 40–90 ms with a tiny camera impulse (no heavy shake) · soft-target cone: forward, best target by angle then distance · enemy telegraph: wind-up length scales with the hit.

## D. What proceeds WITHOUT these answers (independent, verified system work)
- The tap / hold grammar with ONE threshold and a proof of zero double fires (a tap never also fires on release), on touch and desktop.
- The counter-loop rule system (BLOCK / INTERRUPT / BLOCK BREAK as attack TYPES with the beats-relation, knockdown + immunity, GUARD-hold break-out) — bound to the existing skills only through the PROPOSED defaults above, marked PROPOSED in the code and reversible.
- Input buffering during recovery with per-move cancel windows (the mocap manifest’s `cancel_windows` field is the source once clips exist; until then the R1723 recovery phase is the window).
- Hit-stop on contact (measured) + the camera impulse; the hit counter → MAHGIC regen rule.
- The tier system (data + swap points for clip / contact speed / VFX intensity / damage) with the table above carried as data — `?` cells stay `?` and are refused at runtime with a clear "UNASSIGNED_TIER" rather than defaulted.
- The transition log per input sequence, unit tests proving each counter beats the next, the buffered-input test, the measured hit-stop, and frames of every strike at every tier that HAS an exercise assigned (the others are listed as unassigned).

## E. What the gate needs from Jah
1. Fill the `?` cells in A (or say "same exercise, scaled" per row).
2. Answer B (two pattern names).
3. Tick or change C.
4. Later, after PASS 7 builds: the iPhone combat recording (Spec G’s own gate).
