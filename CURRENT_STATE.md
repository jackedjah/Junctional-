# CURRENT_STATE — MAHWORLD / MAHPLAZA visible slice

Short, factual, kept current. Everything below was verified against the working
tree when written; the revision at the bottom says when.

## Project identity

- Repository: `jackedjah/Junctional-` (PUBLIC). Default branch
  `claude/mrmah-3d-renderer-poc-1nyunz` = Astra's Mr. Mah renderer work
  (`mrmah3d/`). Not touched by any MAHWORLD commit.
- MAHWORLD work lives on the orphan branch `claude-mahworld-phase0-control-deck`,
  root `eeb2803` = the R85A1 MAHFITT site imported byte-for-byte. **Local only,
  never pushed**: the branch carries the full MAHFITT application source and the
  repository is public. Publishing it is a separate, explicit decision.
- Other checkouts on this machine (not touched): `.claude/worktrees/agent-a5e618…`
  (`963b292`) and `.claude/worktrees/agent-af917…` (`4915fac`), both renderer-branch
  worktrees from earlier agent work.

## v4 — AAA closure and the luminous crystalline night (current)

The scene is no longer three buildings on an empty floor. It is a lit district with a
designed plaza, a living population, an engineered combat hall, diamond clouds and
FOBEAM infrastructure carrying square-diamond packets.

| Module (all optional, all guarded) | What it adds |
| --- | --- |
| `city.js` | midground blocks with window grids, bridges, a long walkway, background crystalline towers, distant giants, a rail pod, an elevator |
| `plaza-dressing.js` | inlaid routes with curb lips, two gathering nodes, ten light masts, rails, bollards, benches, an info pylon, a shelter |
| `match-interior.js` | the engineered MAH MATCH hall with the two entrance actions mounted in architecture |
| `clouds.js` | layered diamond clouds: soft masses with crystalline internal planes lit by the moon |
| `fobeam.js` | 5 routes, 23 travelling square-diamond packets, endpoint receivers, real occlusion; distinct FOBLOW ribbons |
| `life.js` + `effects.js` | walkers, groups, building entries, eight ambient events with cooldowns, pooled MAHGIC effects |

Night lighting was rebuilt so the world is filled with controlled light while staying deep:
moon key 1.35 with shadows, hemisphere 1.5, city-bounce fill 0.66, environment 0.92 with a
horizon glow band, neutrals raised with higher `envMapIntensity`, platinum trims at
`envMapIntensity` 1.9.

`world.advance(seconds)` runs the world deterministically for validation. Headless browsers
throttle animation frames to under one per second, so evidence could not otherwise observe
ambient life; it drives the same step function a browser runs.

## What runs today (latest viewable result)

- `mahworld/scene/mahplaza.html` — the MAHPLAZA slice on the permitted renderer
  (three@0.185.1 vendored in `mahworld/vendor/three/`, byte-identical to the
  renderer branch's copy). Serve the repo root with any static server and open
  the page; phone portrait or desktop. Full instructions: `mahworld/scene/README.md`.
- Evidence of the running scene: `validation/mahworld/mahplaza-v3/` (this slice),
  `validation/mahworld/mahplaza-v2/` (baseline before this slice),
  `validation/mahworld/phase0/` (control-deck bridge), `validation/mahworld/arrival-gate/`.
- Static review: `validation/mahworld/mahplaza-v3/Review.html` (relative assets;
  REFERENCE / BASELINE / AFTER labelled).

## Owners changed by this slice (all under `mahworld/scene/` unless noted)

| File | Change |
| --- | --- |
| `materials.js` | fabricated dumbbell / fist / cart glyphs removed; signage carries a reserved square-diamond mark slot and truthful text only; glare reduced (emissive, additive opacity, reflection); live `retheme()`; `setDiagnostic()` |
| `buildings.js` | MAH MATCH copy `MAH MATCH / MATCHES · PRACTICE`, two entrance actions `FIND AN OPPONENT` + `PRACTICE WITH A BUDDY` (three-panel wayfinding removed); central ramp through the steps; MAH MARKET subtitle removed; action targets registered for tap navigation |
| `residents.js` | dark facial chamber with friendly eyes and mouth; `silver`; per-entity `recolour()`; stable ids; `guard` pose with drivable arms for the practice preview; teardrop law unchanged |
| `flora-and-vehicles.js` | square-diamond leaf (square rotated in-plane, thin depth); sparser planters; live `setTheme()` |
| `sky.js` | live `setTheme()`; halo / beam glare reduced |
| `mahplaza.js` | world Theme, local avatar and remote avatars independent (`setWorldTheme`, `setSelfAppearance`, `setRemoteAppearance`, `describeAppearance`, `samplePixels`); tap vs drag; preview navigation; honest opponent state; scripted practice preview with clean exit; diagnostic mode; teardown |
| `mahplaza.html` | live controls, no debug overlay in the standard preview (`?debug=1` only), route back to the MAHFITT control deck |
| `tests/mahworld-mahplaza-capture.js` | v3 proof set, same-camera theme checks with state + pixel evidence, diagnostic, recordings, `Review.html` |
| `tests/mahworld-mahplaza-laws.test.js` | static scene-law test (new) |
| `MAHWORLD_PHASE0_FOUNDATION.md` §26a, `mahworld/scene/README.md`, `mahworld/scene/REFERENCE_MANIFEST.md` | documentation |

MAHFITT app files, `mahworld/mahworld-domain.js`, `mahworld/mahworld-shell.js`,
`mahworld/mahworld-menu.css`, `netlify/`, `sw.js`, cache stamps: **unchanged**.

## Stage status (build sequence P0–P12 of the brief)

| Stage | Status | Where |
| --- | --- | --- |
| P0 state + manifest | DONE | this file, `mahworld/scene/REFERENCE_MANIFEST.md` |
| P1 residents (faces, silver, recolour, ids, guard) | DONE | `residents.js` |
| P2 signage / MAH MATCH actions / ramp / MARKET copy | DONE | `buildings.js`, `materials.js` |
| P3 glare + diagnostic view | DONE | `materials.js`, `sky.js`, `mahplaza.js` (`setDiagnostic`) |
| P4 three appearance owners + same-camera checks | DONE, PROVEN | `mahplaza.js`; `capture.json.checks`, `v3-check-*.png` |
| P5 tap navigation, honest opponent state, practice preview + clean exit | DONE, PROVEN | `mahplaza.js`; `v3-practice-*.png`, `v3-practice-preview.webm` |
| P6 plants / craft / population density | DONE | `flora-and-vehicles.js`, `mahplaza.js` |
| P7 camera look / move / reduced motion / teardown | DONE | `v3-camera-movement.webm` |
| P8 proof set + Review.html | DONE | `validation/mahworld/mahplaza-v3/` |
| P9 15-minute soak | DONE (15.5 min, concurrent with the capture) | `soak.json` |
| P10 tests + release gate | DONE | laws 27/27, clock 12/12, Phase 0 96/96, R85A gate PASS on a clean snapshot |
| P11 scoped commit, package, private artifact | DONE (see the bottom line) | commit on the local branch; `MAHPLAZA_FABLE_VISUAL_SLICE_<rev>.zip` |
| P12 push / deploy | NOT DONE by design | public repository; full MAHFITT source on the branch |

Visual gates A–H with evidence: `validation/mahworld/mahplaza-v3/gates.json` (rendered in `Review.html`).

## Known blockers and dependencies

- Push / publish of this branch: blocked by design (public repository, full MAHFITT source).
  Delivery is by commit + package ZIP + private artifact.
- Headless Chromium here runs software GL (SwiftShader): frame times in `capture.json`
  are not phone numbers; draw calls and triangles are.
- No live multiplayer, matchmaking, commerce or progression exists; every "other player"
  in the scene is a labelled local fixture.

## Next exact action

Review `validation/mahworld/mahplaza-v3/Review.html`; decide on the reserved
mark slot (supply official FOB / MAHFITT mark files, or keep text-only signage);
then the next slice is the interior walk-in for one destination.

_Revision: started on `9315031`; this version is the one committed with the slice — `git log -1 -- CURRENT_STATE.md` names it. Working tree clean at that commit; branch local, unpushed._
