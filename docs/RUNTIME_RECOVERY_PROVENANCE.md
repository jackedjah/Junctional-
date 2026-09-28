# Runtime bridge recovery: provenance and results (2026-09-28)

This file records how the ten runtime bridge files were restored. The runtime bridge had been deferred since M10; before this import the
full status was in `docs/OPENCODE_MIGRATION.md` §9. Only those ten files were imported. The old deployment was not restored, and no game
source, test or config was edited.

## Source
- Owner-supplied package `MAHWORLD_RUNTIME_RECOVERY.zip` (sha256 `802dea630494f3d0aa99465af4c087ff29d4fe1d9d247dc92308a0b8c5973f51`),
  built from the Netlify M7 reference-lock preview `deploy-6ab5acc1077641dc53f2b30b` (24 Sep 2026). Its `build_info.json` names source commit
  `3185a25` with `worktree_clean=false`. That commit is **not** in this repository's history. Treat these files as a recovered deployment
  snapshot, not as an exact clean Git commit.
- Four JS modules came byte-exact from ZIP members. Six JSON files were decoded from exact UTF-8 strings embedded in the deploy's
  `shims/host_files.js`. Total size is 86,701 bytes.
- The package (verifier, README, manifest, report) stays outside the repository. Only the three `CLAUDE_*` trees were imported.

## Files (path · bytes · sha256)
| path | bytes | sha256 |
|---|---|---|
| `CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/jsonSource.js` | 2759 | `25a8a053e6b0cafb65b513cf1747f541fb0afdb7e22cc8815aac23a6da9b8e1a` |
| `CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/ClassIdentityConfig.js` | 4619 | `4df963559d248445cf59efbb28491b0d01f98931ee82171fea65c322bf81bd8e` |
| `CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/characterRegistry.js` | 5950 | `4a8cab6dca959770701255628157cfba0984ad7a84e5954bd89a5c8f3fdbe027` |
| `CLAUDE_RUNTIME_FOUNDATION/12_ANIMATION_RUNTIME/AnimationStateController.js` | 29667 | `c4c64caab39251d950d0739bae13b2f6043b9e960516e9f631b4b266a1453aa4` |
| `CLAUDE_RUNTIME_FOUNDATION/01_CHARACTER_MANIFEST/CHARACTER_MASTER_MANIFEST.json` | 18594 | `82d67f5482854c12ecea6e7546e39c25b931ba61016c99e8bd5825819f3f3651` |
| `CLAUDE_RUNTIME_FOUNDATION/02_MATERIAL_CONTRACT/material_zones.json` | 8289 | `626a11c935b546ed7644f4a58c6c8f97a9ea16d9d316cd68c4f35fd8d0bafd9d` |
| `CLAUDE_RUNTIME_FOUNDATION/03_CHARACTER_CREATOR/CHARACTER_VARIANT_SCHEMA.json` | 8134 | `f856cfb0cf19130123cbb93bb3070831640e62b94208d34aba7b466406997105` |
| `CLAUDE_RUNTIME_FOUNDATION/05_ANIMATION_CONTRACT/animation_set.json` | 3226 | `e9e7216b1840ac59e0a6dc412886da2e35876df9feb63e123fb7ff26c99f9b4b` |
| `CLAUDE_DUAL_LOCOMOTION/15_RUNTIME_DESIGN/config/runtime_config.default.json` | 1713 | `4f36744d44ba64ab320d159692b8dc8096e0d766ad2dfdd9e1a5519209e9123a` |
| `CLAUDE_GAMEPLAY_FOUNDATION/02_MOVEMENT/PLAYER_MOVEMENT_DEFAULTS.json` | 3750 | `7452c6b9deaae2c88991fa15f346d0b303b658f2cb3058160eccdca966bbbc3b` |

`animation_set.json` and `runtime_config.default.json` use CRLF line endings; the other eight use LF. All ten were committed byte-exact (the
repository has no `.gitattributes` and no `core.autocrlf`).

## Verification (actual runs, cloud session, Node 22.22.2)
1. `VERIFY_RECOVERY.mjs`, run outside the repo, printed 23 PASS and exited 0. It printed the VISIONARY warning traced below. A separate
   sha256 and byte-count check also matched the manifest for all ten files (10 / 10).
2. The ten paths in `RECOVERY_MANIFEST.json` are exactly the importer's `BRIDGE_FILES`, in the same order. No destination existed before the
   import, and the working tree was clean at `a6c999a`.
3. `apply_minimal_bridge.mjs --from <extracted MAHWORLD_RUNTIME_RECOVERY> --dry-run` passed every check and copied nothing. Running it without
   `--dry-run` and without `--push` copied the ten files. Re-hashing the copies in the repo matched 10 / 10.
4. `node CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/deploy/build_static_demo.mjs` exited 0 with 199 files, 208.3 MB and a clean private-content
   scan. It used to stop at `missing: …`. The build output (`deploy/static_dist/`) was deleted afterwards and is not committed.
5. `node CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/tools/run_all_tests.mjs` ran **71 files: 38 ok, 33 failing, 656 checks passed**. Before the import
   it was 37 ok, 34 failing, 655 checks. There are **no new failures**. `gameplay_mahgic_tree` now passes (30/0; it was 29/1 without the build).
   `known_bridge_blocked_failures.txt` now lists exactly these 33 files. Their causes are below.

## Why the 33 still fail (each checked individually)
- **31 files** crash at `SyntaxError: Unexpected token 'export'` in `CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/jsonSource.js`. The
  recovered modules are ES modules. The nearest `package.json` to them is the repository-root `package.json`, which belongs to the
  MAHFITT / FOB site and declares `"type": "commonjs"`. It was added on 2026-09-05 and is not to be touched. In the owner's archive those
  folders had no such parent. The affected files are: attack_stack, attacks_phase_e, b7_targeting, b8_equipment, creature_combat, direct_ui,
  district, emotes_npc, flight_f01, guard_sheet, halo_repair_play, hud_pass3, hud_phase_b, interior_entry, loadout_422, m2_equipment_motion,
  m4_world_expansion, m5_owner_buildings, m5_owner_corrections, m7_halo_scale, mahgic_anywhere, navigation, od29_disconnect, phase4,
  phase4_1, phase5a, phase5b, play_sample, rules_17_23, runtime and world_jobb (all `gameplay_*.test.mjs`).
- **Diagnostic probe (not committed):** I temporarily added a one-line `CLAUDE_RUNTIME_FOUNDATION/package.json` containing
  `{ "type": "module" }`, ran only the 33 failing files, then deleted it. With it, **29 files pass**. Four still fail, each for its own reason:
  - `gameplay_legs_faithful`: `ENOENT RAW_10_MODELS/Mah_Athlete_M.glb`. That raw Character-lane model was not recovered (no GLB in the deploy
    matches its historical sha256). No substitute was used.
  - `gameplay_runtime`: 49 checks pass, then it hits `ENOENT CLAUDE_GAMEPLAY_FOUNDATION/04_CLASS_LOADOUTS/CLASS_MOVEMENT_PATTERN_MATRIX.md`
    (test line 78). That canon document is outside the ten files. The M10 manifest wrongly treated it as `_doc`-only. It is not recovered.
  - `gameplay_m5_owner_buildings`: 13 pass, 1 fails (G03). The check needs the original building source GLBs (e.g. the 76 MB temple) in the
    owner's local `MAHWORLD_CHARACTERS/INCOMING_BUILDINGS/…` folder, so it can only pass on the owner's PC.
  - `gameplay_world_jobb`: 33 pass, 1 fails (check 24). It guards against payment wording with `/stripe/i`. That regex matches the word
    "stripes" in a comment in `lab/world/terrain.js` (line 167), added by M20 commit `0057fd7`. This is a latent false positive that stayed
    hidden while the bridge was missing. Nothing renders differently.

## VISIONARY colour compatibility
- The recovered `material_zones.json` says `iris_color_by_class.VISIONARY = "GREEN"`, with a hue band of 110–140°.
  `CHARACTER_MASTER_MANIFEST.json` gives both VISIONARY entries `iris_color: "GREEN"`. Their notes read "violet - canon GREEN" and
  "purple - canon GREEN". This is historical data and was kept byte-exact, not edited.
- **Actual effect on the current branch:** `ClassIdentityConfig.irisColor()` returns a text label. `00_CORE/bootstrap.js` →
  `01_PROFILE/GameplayProfile.js` stores it as `profile.visual.iris_color`, and `characterRegistry` uses it for `irisColorMatchesClass`. The
  only readers are the simulator's console line and one test that checks ATHLETE = GOLD. No renderer, material or world code maps that label
  or the hue band to a colour. `irisHueBand` / `inIrisHueBand` have no runtime caller. So the recovered GREEN changes **nothing that is
  rendered**, and the current purple VISIONARY design is untouched (`gameplay_world_colour_law` passes, 4/0).
- **Separate issue, older than this recovery:** `26_LOCAL_AUTHORITY/lab/PresentationAdapter.js:12` hardcodes
  `CLASS_ENERGY.VISIONARY = 0x8cff9c`, a mint green, commented "iris_color_by_class canon". It dates from the M6 checkpoint `bdc43b6`.
  That value *is* rendered for a VISIONARY actor's projectile / zone / impact / nav-marker effects. It conflicts with the current colour law
  (no green; VISIONARY = purple). It sits in the character presentation layer and is outside this recovery, so it was reported, not changed.

## Corrections that need an owner decision (none applied)
1. Add `CLAUDE_RUNTIME_FOUNDATION/package.json` = `{ "type": "module" }`. This one-line module-type marker unblocks 29 test files, as measured
   by the probe above.
2. Change `PresentationAdapter.js` `CLASS_ENERGY.VISIONARY` from green `0x8cff9c` to the purple VISIONARY colour (character presentation
   lane).
3. Reword "stripes" in the `terrain.js` comment (comment only). The alternative is to accept jobb check 24 as a known false positive. The
   test must not be weakened.
4. Decide whether to restore the three missing owner-archive items: `CLASS_MOVEMENT_PATTERN_MATRIX.md`, `RAW_10_MODELS/Mah_Athlete_M.glb`
   (Character lane), and the building source originals for G03.
5. When the canon is next revised, record VISIONARY = PURPLE in the Character-lane data (`material_zones.json`, manifest). Do not rewrite
   the recovered evidence silently.
