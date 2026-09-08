# THREE.JS REFERENCE LEDGER — MAHWORLD R170

R170 §2 asks for this file and gives it a shape:

```
REFERENCE → INTERACTION / RENDERING LESSON → MAHWORLD IMPLEMENTATION LOCATION
          → PERFORMANCE RISK → ACCEPTANCE TEST
```

The rule at the bottom of the shipped template is the one that matters:
**no inspiration-only references.** A reference that cannot name a file and a
measurement is a moodboard, and this project does not keep moodboards.

Two honesty notes before the table.

**No original URLs are retained in this workspace.** The R170 fileset says to
append exact links "rather than guessing", and there are none to append: the
repository carries no cached copy, snippet, bookmark file or note naming a URL
for any of the five references. What is recorded below is therefore the LESSON
as the master prompt states it, mapped onto code that exists. If the links
resurface they belong at the head of each section; nothing here should be
rewritten to match a guess.

**Some rows name a gap, not an implementation.** Marking a row "NOT BUILT" is
the point of the exercise — it is how the ledger stays a work list instead of a
congratulation. Rows are honest about which of the two they are.

---

## HUBTOWN

**Lesson.** Cinematic transitions between world states; spatial continuity
across a change; movement between sections that never feels like a page reload.

**Implementation location.**
- `travel.js` — inter-city flight authored as real traversal, in named beats
  (departure landmark → acceleration corridor → receding home skyline →
  atmospheric traversal → distant city acquisition → biome transition →
  approach infrastructure → arrival district). This is the strongest existing
  expression of the lesson in the codebase.
- `halo-threshold.js` — the HALO ⇄ SKY REALM boundary, built specifically so a
  viewer can see where the sanctuary stops without a cut.
- `interlink.js` — the two routes that make three cities read as one world.
- `mahplaza.js` `ctx.actions` (built at :182, consumed :1076–1094) — the
  selection/approach path a destination action runs through.

**Gap.** Building ENTRY is not this yet. R170 §6 wants
APPROACH → ENTRANCE BECOMES LEGIBLE → CONTEXT ACTION → CONFIRM → TRANSITION →
INTERIOR REVEAL → RETURN PATH, and `match-interior.js` / `buildings.js`
`premiumRoom()` currently have no threshold sequence between them. **NOT BUILT.**

**Performance risk.** A transition that keeps both the interior and the exterior
resident doubles the live scene at the worst moment — during a camera move, when
frame pacing is most visible. Any continuity solution has to bound what stays
loaded, not simply keep everything.

**Acceptance test.** From the plaza, walk to MAH GYM's doorway, enter, and exit,
with no black frame and no reload; measure frame time across the transition and
require no frame over 2× the running median.

---

## CYBER OCEAN

**Lesson.** Fluid Three.js locomotion; flow-field thinking; movement-coupled
particle behaviour; energy trails; selective post-processing.

**Implementation location.**
- `roam.js` — the movement authority. WALK 4.2 / RUN 11.0 / FLY 22.0 /
  BOOST 70.0 m/s, `setMode('walk'|'fly')`, `setVertical(v)`. The speed table is
  already reasoned against world scale (at 70 m/s the 560 m world radius is 8 s
  away).
- `mahplaza.js` `ctx.swimVolumes` (:182, :808) — the registry a swim system
  would read.
- `effects.js` — the pooled MAHGIC vocabulary: six preallocated slots, nothing
  allocated after construction, opacity capped at 0.6.
- `fobeam.js` — the energy-route network and the vertical ASCENT lines.

**Gap.** `ctx.swimVolumes` is a registry with no swimmer: there is no SWIMMING
movement state in `roam.js`. Movement-coupled particles do not exist — `effects.js`
is event-triggered, not velocity-coupled. **NOT BUILT.**

**Performance risk.** This is the reference most likely to cost the mobile
budget. Particle density must scale with device tier (§28 says so explicitly),
and `effects.js`'s no-allocation-after-construction discipline is the pattern any
new system must follow — a per-frame `new` in a trail system is a GC pause on a
phone.

**Acceptance test.** Fly a full boost run across the city with trails enabled on
the lowest quality tier and measure allocation: zero new geometries, materials or
Vector3s per frame, sampled over 600 frames.

---

## CRUCIFORM

**Lesson.** Metallic/platinum material response; reflection discipline;
environment-map behaviour; high-contrast reflective planes against dark ones.
R170 §29 states it sharply: *reflection is a material property, not a global
effect.*

**Implementation location.**
- `materials.js` LAW 1 and `applyPlatinumFinish` — a metal at metalness ≥ ~0.9
  takes no diffuse light and is lit only by `scene.environment`, so orientation
  decides grade. This is the codebase's own version of the lesson and it predates
  the ledger.
- `monument.js` — the per-triangle normal splitter (|ny| ≤ 0.50 → mirror grade,
  up-facing → `platinumLit`, down-facing → `platinumMidLit`), stricter than
  `foblock.js`'s 0.707 and for a stated optical reason.
- `materials.js` `cutGem()` / `gemGirdle()` — R2's re-cut of both brand
  diamonds. The mirror HEART behind the glass SHELL is the Cruciform lesson
  applied literally: what you see inside a diamond is the environment, folded.
- `mahplaza.js` — the planar mirror pass on the plaza deck.

**Performance risk.** The planar mirror is a second full scene pass. The R167
audit recorded that `setQuality` never builds or tears it down, so the mirror
cost is paid on every tier including the lowest — a live defect, not a
hypothetical one.

**Acceptance test.** On the low quality tier, the mirror pass is absent and
draw calls drop measurably; on high, a plaza frame shows the monument's
reflection. Both states asserted, not eyeballed.

---

## LOCOMOTIVE

**Lesson.** Editorial restraint; hierarchy; smooth state changes; confident
minimal UI. §30 adds the guard: do not copy Locomotive's branding, only its
presentation discipline.

**Implementation location.**
- `plaza-dressing.js` `directoryTexture()` — the plaza pylon's board, drawn from
  `ctx.directory`, which is the same single destination table the nav menu reads
  (R167 §F). One table, two surfaces.
- `mahplaza.js` `CORE_DEST` (:96) — that table.
- `mahplaza.js` `VIEWS` / `setCustomView` — the camera anchor set.

**Gap.** There is no world-entry transition, no facility title card, and no
creator-to-world handoff. **NOT BUILT.**

**Performance risk.** Low. The risk here is scope, not GPU: editorial motion is
where a pass can spend a week and change nothing measurable.

**Acceptance test.** Every destination name in the world appears in exactly one
source table; a grep for any destination string outside `CORE_DEST` and its
consumers returns nothing. (This is LAW-101…103 in
`tests/mahworld-mahplaza-laws.test.js` and currently passes.)

---

## MAMESON GLSL EXPERIMENT

**Lesson.** Shader-driven atmosphere; procedural surface and energy language;
a lightweight-GPU-effect mindset. §31: shaders must earn their cost.

**Implementation location.**
- `mahplaza.js` `patchMirror()` — an `onBeforeCompile` patch applied to the
  plaza deck and all three district floor materials (R1 cycle 2).
- `sky.js` — the whole atmosphere is procedural: gradient, galaxy band, three
  star tiers, horizon haze, depth bands. No image files anywhere in this world;
  every texture is `canvasTexture`.
- `halo-dome.js` — the crystalline panel field and its MAHGIC seams.
- `effects.js`, `fobeam.js`, `musicline.js` — the MAHGIC family.

**Performance risk.** `onBeforeCompile` forces a shader recompile per material
variant, and the R167 audit found the mirror render target compiles every
material a second time with no priming — a first-frame stall on a phone,
measured, not suspected.

**Acceptance test.** Count shader programs after first paint and after a full
camera tour; the delta must be zero, i.e. nothing compiles lazily during play.

---

## RULE

REFERENCE → LESSON → IMPLEMENTATION → MEASUREMENT.

A row with no measurement is not finished. A row marked NOT BUILT is a work
item, and the work items above are the honest state of R170 at the time this
file was written:

- building entry/exit threshold sequence (HUBTOWN)
- swimming state and movement-coupled particles (CYBER OCEAN)
- mirror pass under quality tiers (CRUCIFORM — defect, not gap)
- shader priming (MAMESON — defect, not gap)
- world-entry and facility presentation (LOCOMOTIVE)
- the Control Lab itself: R170 §24 and the vertical-slice gate steps 14–15 both
  require a live control panel bound to real runtime values, and there is no
  such surface in `mahworld/` at all. **NOT BUILT.**
