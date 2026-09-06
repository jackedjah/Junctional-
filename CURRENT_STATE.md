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
  and `.claude/worktrees/agent-af917…`, both renderer-branch worktrees from
  earlier agent work.

## v5 — the chromium city (current)

MAHWORLD is now a civilization built from chromium, dark platinum, polished
crystal, reflective glass, a diamond facet language and MAHGIC light. A finish
is a **roughness, not a hue**: five grades — mirror, satin, brushed, graphite,
crystalline glass — are the same cool neutral metal at five polishes, ranked by
how much of the world may wear each. Mirror is rare and focal; graphite is
everywhere.

| What v5 changed | Where |
| --- | --- |
| the finish-grade family, two new procedural maps (brushed streaks, the diamond floor), every neutral a step up out of near-black | `materials.js` |
| the plaza floor became the HERO surface: nine-metre chromium diamond cells with chamfered bevels and mirror-grade joint catches, laid as a **deck** everything else stands on | `ground.js` |
| the three destinations at three depths with three silhouettes — broad glazed canopy / civic terraces / a dominant tower — from one exported `SITES` plan the ground, paths and crowd all read; no un-bevelled 90° corners anywhere | `buildings.js` |
| twelve megatalls at 214–392 m with three new crowns, on overlapping radii for height parallax | `city.js` |
| forty FOBEAM hairlines in near / mid / far tiers, the far tier generated along a band across the sky as one luminous river of energy | `fobeam.js` |
| diamond clouds hold more of the sky; their crystalline catches are stronger | `clouds.js` |
| the environment map carries the district itself, so chromium has a city to reflect | `mahplaza.js` |
| premium lamps, wayfinding blades, planted plinths, a second shelter, utility columns; nothing in the central sight lines | `plaza-dressing.js` |
| detail tiers, `createImpostor()` and `setLOD()` — the gap v4's header claimed but did not have | `residents.js`, `life.js` |

Contracts: `mahworld/scene/CONTRACTS_V5.md` (v5 additions) and
`CONTRACTS_V4.md` (the module contract and the standing laws).

## The v4 foundation underneath it

The scene has been a lit district since v4: `city.js` (midground blocks,
bridges, a walkway, background towers, distant giants, a rail pod, an elevator),
`plaza-dressing.js`, `match-interior.js`, `clouds.js`, `fobeam.js`, and
`life.js` + `effects.js` (walkers, groups, building entries, an eight-event
ambient scheduler with cooldowns, pooled MAHGIC effects). Every module is
optional and guarded: the assembly imports it if the file exists.

`world.advance(seconds)` runs the world deterministically for validation.
Headless browsers throttle animation frames to under one per second, so evidence
could not otherwise observe ambient life; it drives the same step function a
browser runs.

## What runs today (latest viewable result)

- `mahworld/scene/mahplaza.html` — the MAHPLAZA slice on the permitted renderer
  (three@0.185.1 vendored in `mahworld/vendor/three/`, byte-identical to the
  renderer branch's copy). Serve the repo root with any static server and open
  the page; phone portrait or desktop. Full instructions: `mahworld/scene/README.md`.
- Evidence: `validation/mahworld/mahplaza-v5/` (this pass),
  `validation/mahworld/mahplaza-v4/` (the crystalline-night baseline),
  `validation/mahworld/mahplaza-v3/`, `validation/mahworld/phase0/`.
- Static review: `validation/mahworld/mahplaza-v5/Review.html`
  (relative assets; REFERENCE / BASELINE / AFTER labelled).

## Laws kept

- `world-clock.js` is the one owner of world time.
- Three independent appearance owners — world Theme, local avatar, each remote
  avatar. No global tint, filter, overlay or material overwrite.
- The species law: square-diamond head with a dark facial chamber, humanoid
  upper body, ONE continuous lower teardrop, no legs, one colour per resident —
  identical at every detail tier.
- Blue-white light only; MAH MATCH's red accent is the one exception.
- No audio, no network, no HUD in the world, no invented product copy, no
  fabricated marks, no fake players, no "opponent found".

## Known blockers and dependencies

- Push / publish of this branch: blocked by design (public repository, full
  MAHFITT source). Delivery is by commit + package ZIP + private artifact.
- Headless Chromium here runs software GL (SwiftShader): frame times in
  `capture.json` are not phone numbers; draw calls and triangles are.
- No live multiplayer, matchmaking, commerce or progression exists; every
  "other player" in the scene is a labelled local fixture.
- The reserved square-diamond mark slot on the three signs is still empty: no
  verified FOB or MAHFITT mark file has been supplied.

## Next exact action

Review `validation/mahworld/mahplaza-v5/Review.html` at phone size. The open
decision is still the reserved mark slot — supply official FOB / MAHFITT mark
files, or keep the signage text-only.

_Revision: this version is the one committed with the v5 pass — `git log -1 -- CURRENT_STATE.md` names it. Branch local, unpushed._
