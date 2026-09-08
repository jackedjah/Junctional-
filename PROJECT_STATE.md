# MAHWORLD WORLD 01 — CURRENT STATE

ACTIVE PRIORITY:
P1 FORM — round and smooth the dominant architectural masses. P0 SPACE has had two proven passes
(ground value, forward sight corridor) and the next spaciousness gain is smaller than the form gain.

CURRENT BEST CHECKPOINT:
branch `claude-mahworld-phase0-control-deck`, HEAD of this pass (P0 — ground value corrected).
Evidence: scratchpad `dv/p3-building-away.png` (after) against `dv/p0-building-away.png` (before).

MASTERED:
- Ground VALUE is correct everywhere: the plaza plane, the 126-620 m ring and the land all read as
  dark platinum with a grazing sheen driven by the clock's own horizon key. No pale sheet.
- City is 8 blocks (from 15). Every block that stacked behind another, or closed the primary
  forward view, is gone. All four id-keyed tables (MASSING/GESTURE/DECK/glazedIds) stay in sync.
- One floor across the whole grounded map: deck (260 m) + city ring (126–620 m) + land (600–2600 m),
  all black platinum in the satin/hero grade family, one diamond lattice at one scale, no seams.
- Floor is pitch black with a platinum grazing sheen and NO planar reflection. Metal reads as a
  value RANGE (base 0.075, grazing 0.62, fresnel^5), not a value.
- Sun and moon reflect on every ground surface as an analytic glitter path that tracks the clock,
  hands over between bodies by colour, and works to 2600 m. Guarded by laws R3-08-A..D.
- ASCENT lines are ranked: one hero (north, 1.30) and two secondary (0.62 / 0.52). Laws R3-06-F..H.
- The ascent car is an elevator: cut aperture, two hinged leaves on the departure cycle, lined and
  lit cabin, fittings. Laws R3-06-I..L.
- City thinned 15 blocks → 10; every block that stacked behind another is gone.
- Statues carry the ascent pod's platinum grade (finish moved, species vertex colours preserved).

CURRENT DEFECTS:
1. P0 SPACE (partly open) — the forward view's right flank now shows distance past MAH FORGE, but
   the two colossal MAHBEING figures still occupy the centre of the primary axis. They are the hero
   landmark and must NOT be removed; the remaining gain is a wider corridor either side of them.
   BUILDING-AWAY now PASSES: floor -> treeline -> mountains -> dome -> stars reads as real layers.
2. §23 COLOUR — the city carries WARM window light (city.js WARM table, NEUTRALS.interior 0xffeccd,
   spillWarmM). The master file now names yellow/orange/amber/warm-golden as strict exclusions.
   This is a direct conflict and is unresolved.
3. §22 FLOOR TEXT — plaza wordmark legibility at shallow angle is unverified since the floor was
   re-graded twice (D2 crush, D7 sheen).
4. §4 FORM — architecture is still predominantly faceted/angular; the master file asks for
   round + smooth + premium as the dominant language with diamonds as accent.
5. §6 MONUMENT — statues use residents.js `stand` geometry. Canonical fused lower body and
   sex-specific Mr./Mrs. Mah silhouette are unverified against the character canon.
6. §26 DOME — dome reads as a ceiling above the city rather than an enormous containing shell.

LOCKED / DO NOT REGRESS:
- Renderer: vendored three r185, ES modules, no bundler, no addons, no image files (procedural only).
- LAW 1: metals at metalness ≥ ~0.9 take no diffuse; horizontal faces need a lit grade.
- §06: square diamonds WIDER THAN TALL; the brand figure keeps its points.
- L42: one truth, one source. No second table describing the same thing.
- Determinism: golden ratio / golden angle, never Math.random.
- MAHWORLD world work stays on `claude-mahworld-phase0-control-deck`, separate from Astra's
  canonical mrmah3d character work on `claude/mrmah-3d-renderer-poc-1nyunz`.
- The planar mirror is retired behind one `return null` and must not be re-enabled without direction.
- Never push MAHFITT source publicly; no deployment/visibility changes without explicit authorization.

LATEST EVIDENCE:
- `dv/p0-building-away.png` (before) vs `dv/p3-building-away.png` (after): ground goes from a white
  sheet brighter than the mountains to dark platinum, and the treeline becomes a separable layer.
- `dv/fog-on.png` / `dv/fog-off.png`: the negative result recorded below.
- Laws green at 3af8078: mahplaza 48/48, r3 31/31, r4 54/54, r5 57/57, r6-nexus 74/74,
  skyrealm 16/16, crystalline 6/6.

NEXT ACTION:
P1 FORM. MAH MATCH is the strongest combat identity and the master file asks for a "rounded armored
cross-core, strong but not spiky". Inspect buildings.js's match shell ONLY, replace its hardest
angular transitions with premium radii, and judge on plaza-hero + long-sightline. Do not touch the
monument or the floor in the same pass.

LATEST NEGATIVE RESULT (do not re-test):
Fog is NOT what washes the ground pale. Switching scene.fog off at runtime left the floor exactly as
bright. The cause was a uniform's DEFAULT value, not fog, not the sheen strength, and not the ring.

LAST LEARNED RULE:
A uniform's default is live code. Uniforms are created at a material's FIRST COMPILE, which happens
on the first render — after the clock has already run — so anything that writes them "every tick"
does not own the value until the first tick AFTER compile. Seed a uniform from the real state at
patch time; never let a typed constant be what actually ships.
