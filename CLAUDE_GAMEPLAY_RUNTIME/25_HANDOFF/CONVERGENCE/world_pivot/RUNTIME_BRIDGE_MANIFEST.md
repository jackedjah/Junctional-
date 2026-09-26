# MAHWORLD — MINIMAL RUNTIME BRIDGE MANIFEST (M10)

The public recovery branch `backup/mahworld-m6-20260924T190351Z` carries `CLAUDE_GAMEPLAY_RUNTIME/` only. The host bootstrap
(`00_CORE/config.node.js` foundationPaths, `00_CORE/bootstrap.js` dynamic imports), the static build (`deploy/build_static_demo.mjs`
HOST_MODULES / HOST_JSON: 56 files, traced with a resolve / fs hook) and 32 of the 37 failing test programs need files from three sibling
roots that exist only in the owner's archive. 46 of the 56 host files are already on the branch. **Exactly ten are missing.** This manifest
classifies every file those needs reference outside the branch. Nothing else is requested.

## The one owner action

From the root of a local clone, on the branch, after `git pull`:

```
node CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/deploy/bridge/apply_minimal_bridge.mjs --from "<folder that contains CLAUDE_RUNTIME_FOUNDATION>" --push
```

`--from` is the archive folder holding `CLAUDE_RUNTIME_FOUNDATION/`, `CLAUDE_DUAL_LOCOMOTION/` and `CLAUDE_GAMEPLAY_FOUNDATION/`
(normally `MAHWORLD_CHARACTERS`). The script copies ONLY the ten category-A files, then commits and pushes them. Before anything is copied,
every file must pass these checks, and one failure stops the whole run:

- present, a regular file, ≤ 1 MB, text with no NUL bytes
- JSON parses
- no secret VALUES (key / token / password assignments, private keys, GitHub / AWS / OpenAI tokens, JWTs such as Supabase keys); a bare word in a comment does not trip it
- no private absolute paths (`C:\Users\…`, `/Users/…`, `/home/…`)
- every relative import of the four JS modules resolves inside the ten files or the repository

If a module imports anything else, the script names that path and stops; it never guesses. Add `--dry-run` to run the checks only. With
neither flag, the files are copied but nothing is committed.

Alternative without Node: on GitHub, use "Add file → Upload files" on the branch and upload the ten files at exactly the paths below.

## A. PUBLIC-SAFE REQUIRED RUNTIME — bridge these ten, nothing else

| # | path (repo-root relative) | kind | why it is needed |
|---|---|---|---|
| 1 | `CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/jsonSource.js` | JS | `bootstrap.js:12` — `createFsJsonSource`, the reader for every foundation JSON below; all 32 bridge-blocked tests stop here |
| 2 | `CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/ClassIdentityConfig.js` | JS | `bootstrap.js:12/14` — `createClassIdentityConfig(src)`: the class identity the registry and the host are built on |
| 3 | `CLAUDE_RUNTIME_FOUNDATION/10_RUNTIME_LOADER/characterRegistry.js` | JS | `bootstrap.js:13/14` — `createCharacterRegistry(src, identity)`: the registry `composeGameplay` takes its player entry from |
| 4 | `CLAUDE_RUNTIME_FOUNDATION/12_ANIMATION_RUNTIME/AnimationStateController.js` | JS | `bootstrap.js:13/18` — `createAnimationStateController`: the animation state machine the composed player runs on |
| 5 | `CLAUDE_RUNTIME_FOUNDATION/01_CHARACTER_MANIFEST/CHARACTER_MASTER_MANIFEST.json` | JSON | read through `jsonSource` by the identity / registry loaders; already embedded in every static build (`HOST_JSON`); data only, no meshes |
| 6 | `CLAUDE_RUNTIME_FOUNDATION/02_MATERIAL_CONTRACT/material_zones.json` | JSON | read through `jsonSource` at boot (`HOST_JSON`) |
| 7 | `CLAUDE_RUNTIME_FOUNDATION/03_CHARACTER_CREATOR/CHARACTER_VARIANT_SCHEMA.json` | JSON | read through `jsonSource` at boot (`HOST_JSON`) |
| 8 | `CLAUDE_RUNTIME_FOUNDATION/05_ANIMATION_CONTRACT/animation_set.json` | JSON | `bootstrap.js:15` — `src.read('animationSet')` |
| 9 | `CLAUDE_DUAL_LOCOMOTION/15_RUNTIME_DESIGN/config/runtime_config.default.json` | JSON | `bootstrap.js:15` — `src.read('runtimeConfig')`: the Mahloco locomotion config |
| 10 | `CLAUDE_GAMEPLAY_FOUNDATION/02_MOVEMENT/PLAYER_MOVEMENT_DEFAULTS.json` | JSON | `00_CORE/config.js:12/17` — the CANON_TUNABLE movement defaults; the gameplay config refuses to load without it |

What these ten unlock:

- static build and release gate
- wildlife / game host and creature runtime (fish, horse, Phoenix, Dogkie)
- movement, camera, flight, landing and elevator
- combat presentation
- HALO collider validation in the running host
- preview packaging
- 32 of the 37 failing test programs

Everything else these programs need (world, lab, the 12 preview character folders `lab/assets/*_preview/dev_*`, colliders, registry) is
already on the branch.

## B. PRIVATE / CHARACTER SOURCE — DO NOT UPLOAD

| path or pattern | referenced by | effect of leaving it out |
|---|---|---|
| `MAHWORLD_CHARACTERS/RAW_10_MODELS/…` (e.g. `Mah_Athlete_M.glb`) | `16_TESTS/gameplay_legs_faithful` (compares against the raw master) | That one test stays blocked. No runtime impact: the game uses the shipped `lab/assets/*_preview` derivatives |
| `MAHWORLD_CHARACTERS/ASTRA_VISUAL_CLEANUP/…` (`.blend` checkpoints, 8K texture work) | historical evidence and handoff notes | none |
| `MAHWORLD_CHARACTERS/INCOMING_BUILDINGS/…` (source inputs) | historical building-intake notes | none: the decimated buildings are already in `lab/assets/buildings` |
| any Character master, rig or texture source; anything under Character / MAHFITT / S08 | none of the listed programs | none. Owner rule: do not touch |

## C. GENERATED / UNNECESSARY — not needed, do not upload

The rest of the three sibling roots is not needed:

- docs and canon markdown (e.g. `CLAUDE_GAMEPLAY_FOUNDATION/00_CANON/MAHWORLD_GAMEPLAY_CANON.md` and `04_CLASS_LOADOUTS/…MATRIX.md`, cited only in `_doc` strings)
- reports, evidence and renders
- `node_modules`, build outputs and caches
- `CLAUDE_DUAL_LOCOMOTION/15_RUNTIME_DESIGN/mahloco` (the adapter the host uses is `CLAUDE_GAMEPLAY_RUNTIME`'s own `MahlocoAdapter`)
- the archive's own copy of `CLAUDE_GAMEPLAY_RUNTIME` (the branch is newer)

Local 404 lines in old `25_HANDOFF/JOB_B/evidence/*.json` logs are records, not requests.

## D. SECRET / NEVER UPLOAD

`.env*`, `*.pem`, `*.key`, service-role or API keys, Supabase or Netlify tokens, `.git-credentials`, `.npmrc` with tokens, and browser or
account exports. None of them is needed by anything above. The bridge script refuses any file whose text looks like a secret or carries a
private absolute path.

## After the push (Claude)

Claude will rerun the following on the branch:

- full 61-file suite
- static build and release gate
- wildlife host and creature runtime
- movement, camera, flight, elevator and combat
- HALO collider validation

After that, Claude will continue with the collider-backed work that is queued behind the bridge: creatures, gameplay presentation, and
HALO seating / pavilions with real colliders.
