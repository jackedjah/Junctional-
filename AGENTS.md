# AGENTS.md — MAHWORLD (for OpenCode and any coding agent)

This repository was worked by Claude Code; `CLAUDE.md` (repo root) holds the same owner law and stays authoritative alongside this file.
Read this file, then `CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/CONVERGENCE/CONTINUE_HERE.md` (top "World pivot" section), then only what your task needs.

## 1. Repository, branch, owner law
- Repo `jackedjah/Junctional-` (PUBLIC). **Working branch: `backup/mahworld-m6-20260924T190351Z`** — all MAHWORLD demo work lives here.
  Do not work on the default branch (`claude/mrmah-3d-renderer-poc-1nyunz`, the separate Mr. Mah renderer). Other remote branches
  (`claude-mahworld-phase0-control-deck`, `claude/mah-character-refinement-pafm4w`, `claude/mahworld-r2-world-craftsman`, `astra-mrmah-test`)
  are older lanes: do not touch or merge them.
- Owner law (always): no production deploy; do not touch Character refinement, MAHFITT or S08; no paid generation (Scenario credits) without owner
  approval; no blind dependency upgrades (Three.js r185 is vendored in `CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/vendor/three`); the runtime
  bridge stays deferred (do not poll or ask for it); never claim gameplay, physical-phone performance or subjective owner approval that was not
  verified; do not hide ugly geometry with fog.
- Colour law: only the five class colours — ATHLETE gold, TITAN blue, LEAN red / crimson, VISIONARY purple, BAGE pink — over neutrals
  (platinum, graphite, stone, glass, white light). No green / orange / teal / cyan. Purple is VISIONARY's, never generic magic. Never RGB-average
  far classes (gold+crimson → orange); crimson must not drift pink (crimson + white, or additive light on the blue night floor, turns pink/violet).
- Host safety (art vs the authoritative host): art only on collision surfaces, inside collider footprints, ≥ 3.4 m above ground, or beyond the
  host's ±300 m reach square; below 3.4 m within reach nothing may stand > 5 cm proud; no collider / walkable change; the FIELD room flies to
  100 m, so solid art inside the reach square must clear 105.6 m. `16_TESTS/gameplay_world_pivot_host_safety.test.mjs` pins this.
- Files mix CRLF and LF **per line**: preserve each line's ending (edit raw bytes; some editors normalise the whole file — check that
  `git diff --stat` equals `git diff --ignore-cr-at-eol --stat` before every commit).

## 2. Architecture (what runs)
- `CLAUDE_GAMEPLAY_RUNTIME/` — the game. Vanilla ES modules, Node 22, no npm dependencies for the runtime.
  - `00_CORE` … `24_TEST_SCENARIOS`: headless gameplay systems (config, profiles, movement / flight, resources, combat + eccentric phases, input
    actions, duel / spectator / activities / raids / mentors / progression / emotes / telemetry, persistence, interactions, world schema, debug bot,
    replay). See `CLAUDE_GAMEPLAY_RUNTIME/README.md`.
  - `26_LOCAL_AUTHORITY/` — the playable demo: `lab_host_server.mjs` (authoritative local host: 50 ms tick, JSON API, optional `--demo` password
    gate), `DuelHost.js`, `Protocol.js`, `LabClient.js`, `play/` (rules / colliders, e.g. `play/rules1723/world_v1_colliders.json`),
    `lab/` (the client: `play.html` + `play.js` renderer/input/HUD, `fieldScene.js` light rig + landmarks, `cityScene.js` civic plaza / buildings /
    HALO sky realm, `interiorScene.js`, `gameHud.js`, `quality.js` tiers HIGH / MED / LOW) and `lab/world/*.js` (the world modules built by
    `worldB.js`: terrain, surfaceDetail (ground / rock shaders), macro (ridges, sky beams, small falls), veilFalls (Veil highland + falls), water,
    sky / atmosphere / cloudBodies / celestial (Sun, Moon), forest / meadow / gear (flora, crystal bushes), aura / auraForms / ambientMagic
    (magic ecology), architecture / facadeKit / matchHall / signage / fixtures, combatZones / duelRoster, residents / wildlife …).
  - World data: `26_LOCAL_AUTHORITY/lab/assets/world/world_registry_v1.json`, built by `deploy/jobb/build_registry.mjs` (registry edits go through
    a new guarded line in the builder + the same function applied to the JSON; then `node deploy/jobb/build_world_colliders.mjs` — only its hash
    line may change).
  - `16_TESTS/` — plain-node tests (`node 16_TESTS/<name>.test.mjs`, each prints `RESULT … N passed, M failed`).
  - `25_HANDOFF/` — handoff docs, ledgers, evidence, tools (below).
- The repo root also carries the separate MAHFITT / FOB website (html / css / js at the root, `netlify/`, `supabase/`) — **not MAHWORLD; do not touch.**

## 3. Run / build / test
- Play locally: `node CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/lab_host_server.mjs --field --open` (loopback; prints the URL, `play.html?field=1`).
  Phone on the same Wi-Fi: add `--lan`. Flags: `--memory` (no persistence), `--dev-hooks` (test endpoints), `--demo` (password gate; password only
  from the env `MAHWORLD_DEMO_PASSWORD`).
- Headless world renders (the evidence tool): from `CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY`:
  `node deploy/world_preview/capture.mjs <outDir> --views V03,V13 --cam "ID=x,y,z:lx,ly,lz" --tod DAY|NIGHT|BOTH --clock 40 --size 960x540 [--quality MED]`
  (software GL via Playwright + `/opt/pw-browsers/chromium`; ~30–90 s per frame; `capture_report.json` gives draw calls / triangles; the only
  expected console error is one known 404). `deploy/world_preview/inspect.mjs "<js using window.WP>"` evaluates JS in the live preview.
  `deploy/world_preview/world_preview.js` must mirror any renderer change made in `lab/play.js` (e.g. tone-mapping exposure, now 1.28).
- Tools preserved in `CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/tools/`: `run_all_tests.mjs` (full suite), `known_bridge_blocked_failures.txt`,
  `tune_variants.mjs` (in-page variant tuning, one page load), `sheet2.py` (before/after contact sheets, needs Pillow).
- Full suite: `node CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/tools/run_all_tests.mjs`. Current baseline: **71 files, 655 checks passed, 34 files failing** —
  the 34 are exactly `known_bridge_blocked_failures.txt` (they import sibling roots that are not in this repo until the deferred runtime bridge
  lands). A change must not add a failure. Core-only quick test: `cd CLAUDE_GAMEPLAY_RUNTIME && npm test`.
- Tests that must stay green for any world change: gameplay_world_colour_law, gameplay_world_pivot_host_safety, gameplay_world_combat_zones,
  gameplay_world_duel_roster, gameplay_world_hardscape_inlays, gameplay_world_material_realism, gameplay_world_veil_district,
  gameplay_world_warm_class_light, gameplay_world_m19_mountains, gameplay_world_m20_water, gameplay_world_m20_ambient, gameplay_m5_moon_cloud,
  gameplay_m5_ridge_collision.

## 4. Gameplay controls (current, `lab/play.js` + `lab/play.html`)
- Keyboard: WASD / arrows move · Shift run · Space (hold) enter flight / climb · C descend · B dash · G guard (Shift+G magical guard) · V or J primary
  attack · E / R / T / Y direct attacks 1–4 · M cast MAHGIC · H transform · Enter interact · Q menu (Esc / Q close) · Tab or I emotes · X wave · Backspace camera reset · F2 HUD toggle ·
  = / Numpad+ faster travel · P practice duel · K concede · L leave arena · O practice reset · Z cycle rules mode · F3 developer HUD · Esc close panels.
- Touch (phone-first HUD): left joystick with MAP · SPEED · CAM on an arc above it; right thumb island with DASH, GUARD, PRIMARY (hold + swipe),
  quick slots (tap = use, hold = arm), category label and ⚔; FULL / MINIMAL HUD toggle. Tap-to-navigate is refused while a direction is held.

## 5. Mobile-first requirements
- Phones are the primary target: MED is the default tier on coarse-pointer devices (`lab/quality.js`), LOW is the safety tier.
- Every new draw call must be justified; LOW must never get heavier; prefer instancing, merged geometry, shared materials and shader detail.
- Check tier cost in `capture_report.json` (draws / triangles) and, for shaders, static instruction counts; software-GL frame times are not
  performance evidence, and nothing is "phone-verified" until the owner tests a physical phone.
- Portrait and landscape HUD must both work (safe-area insets, thumb reach).

## 6. Completed work that must not regress (world baseline = M20, accepted by the owner; M21 tone commit on top)
Full record: `CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/CONVERGENCE/world_pivot/MASTER_WORLD_PIVOT_LEDGER.md` (sections M8 … M20) with evidence
`world_pivot/evidence/m20_*.jpg`. Preserve: the whole Moon (core + triplanar), the contained Sun, the storm-calm violet-grey sky, the five-class
identity system (gold NEXUS halo, gilded temple, neutral shared world), road / hardscape class inlays, the duel-zone engine and visuals (M15–M17),
the Veil Falls structure (level-lipped strands, flow-mapped foam) and highland layout, MAH MATCH, the HALO structure (elevator-only access,
240 m deck, serve court), the mountains (rounded folds; in-reach ridge faces are the collision plane, bit-identical), the building systems,
the M20 flora (tree pits, satin trunks, family-true bushes), the ambient magic system, the 128-segment junction topology (M6), host-safety and
colour-law tests.

## 7. Known defects / open items
- Current open list: `world_pivot/M20_WORKING_NOTES.md` (Veil fall banding at close range, Veil fins 109 / 111, crown silhouettes locked to the GLB,
  terrace trees on bare slab, small clouds as smooth capsules, faint ambient life, MED plaza-floor shader +33 % static ALU, LEAN spire house buried
  in the ridge — owner decision).
- 34 test files cannot run until the runtime bridge lands (deferred by the owner; do not poll).

## 8. Current active task
**M21 — final high-ROI polish / consolidation** (owner brief: one lead, targeted fixes, 1–3 cameras per fix, then one broad evidence set, then the
exit test and a PRE-CHARACTER WORLD CHECKPOINT). Status: `CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/CONVERGENCE/world_pivot/m21_wip/M21_STATUS.md`
— priority 1 (tone) done; priority 2 (cloud capsules) preserved as an UNVERIFIED patch; priorities 3–7 not started. The work was frozen for the
OpenCode migration: **do not resume fixing until the owner says so.** Character integration (one temporary character for scale / lighting /
movement calibration) waits for explicit owner authorization.

## 9. Deployment
- No production deploy without the owner. Hosted demo design: `26_LOCAL_AUTHORITY/deploy/README_DEMO_DEPLOY.md` — `node deploy/build_demo_package.mjs`
  → `deploy/dist/` (+ `deploy/Dockerfile`); a persistent Node 22 backend (`lab_host_server.mjs --demo`, env `MAHWORLD_DEMO_PASSWORD`,
  `DEMO_SECURE=1`, `DEMO_PUBLIC_ORIGIN`) behind a Netlify proxy rule on `/mahworld/*`. Earlier protected previews used a static build
  (`deploy/build_static_demo.mjs`) as unpublished Netlify drafts after the release gate; see `CONTINUE_HERE.md` for their records.
  Secrets never go in files, URLs, logs or this repo.

## 10. Verification before declaring anything fixed
1. Establish the intended result and the cameras that show it; render BEFORE frames first.
2. Implement the smallest change; render AFTER frames at the same cameras (day and night where relevant; phone MED 393×852 if tiers are
   affected); actually look at them, zoomed where the defect was; measure a region's value when unsure. "If the improvement is not obvious:
   do not call it a win" — iterate or revert.
3. Run the area tests + the must-stay-green list + the full suite; compare failures with `known_bridge_blocked_failures.txt`.
4. Check draw calls / triangles per tier; LOW never heavier.
5. Check line endings (`git diff --stat` == `--ignore-cr-at-eol --stat`).
6. Commit with a message that states what changed, the evidence and the tests; push with `git push -u origin backup/mahworld-m6-20260924T190351Z`.
7. Report honestly: what improved, what did not, what still needs the owner. Never mark anything owner-approved.

## 11. OpenCode operating notes (environment and tooling)
- Environment / tooling inventory, env-var NAMES, MCP translation and manual auth steps: `docs/OPENCODE_MIGRATION.md`. Project config:
  `opencode.jsonc` (every MCP disabled until the owner authenticates it; secrets only as `{env:NAME}`).
- Needed locally: Node 22, git, Python 3 + Pillow, **global** Playwright 1.56.1 + its Chromium (`npm i -g playwright@1.56.1 && npx playwright install chromium`;
  if Chromium is not at `/opt/pw-browsers/chromium`, set `PLAYWRIGHT_CHROMIUM` for `capture.mjs` and `MAHWORLD_CHROME` / `CHROME` for probes).
- Commit and push before ending any unit of work (the Claude session enforced this with a stop hook; OpenCode has none configured).
  Never leave verified work only in a working tree; never commit unverified visual changes — park them as a patch with a status note.
- Render budget: software-GL frames take 30–90 s; run at most ~3 render processes on a 4-CPU machine; use 1–3 cameras per fix and one
  broad set per milestone (`CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/tools/final_render.sh`, cameras in `tools/cams.sh`).
- Tuning without code edits: `tools/tune_variants.mjs` evaluates JS against `window.WP` after `WP.time(tod)` (day / night handlers such as a
  material's `userData.dayNight` re-apply on the time switch — apply variants after it, and check that code changes survive it).
- Parallel work: use separate `git worktree`s with one owner per file set, an independent adversarial review, and merge (cherry-pick) only what
  passes; the rules handed to such agents are in `world_pivot/M20_AGENT_BRIEF.md`.
- Session history beyond the ledger: `world_pivot/M20_SESSION_LOG.md`.
