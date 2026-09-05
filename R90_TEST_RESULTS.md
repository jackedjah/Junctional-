# R90 TEST RESULTS

## Starting R89 baseline

Fresh extracted from the exact incoming ZIP before editing.

- 109 JS/MJS files: syntax PASS
- 22 HTML files: parse PASS
- 18 CSS files: structural PASS
- 1 JSON file: parse PASS
- merge-conflict scan: PASS

## R90 targeted automated assertions

| Suite | Result |
|---|---:|
| Role/context resolver | 25 / 25 PASS |
| Messaging context/security | 13 / 13 PASS |
| Audio/Theme ownership | 31 / 31 PASS |
| Source/security guards | 30 / 30 PASS |
| Simulator persistence/public-host isolation | 13 / 13 PASS |
| R82 Mr.Mah preservation under R90 cache contract | 70 / 70 PASS |
| R83 Mr.Mah preservation under R90 cache contract | 62 / 62 PASS |
| **Total** | **244 / 244 PASS** |

The exact untouched historical R82/R83 test files are also included. If run unchanged, each reaches its final historical `V446 must not change` delivery assertion and fails there because R90 deliberately advances the deployment cache to `V447`. All preceding historical material/geometry/runtime assertions pass. The R90 preservation suites retain those assertions and replace only that superseded delivery expectation with the v447 R90 requirement.

## Responsive interaction simulation

Headless Chromium viewport simulation using the development-only deterministic role simulator:

- iPhone 375 x 812: 11 / 11 interaction proof, no horizontal overflow, no browser errors
- iPhone 390 x 844: 11 / 11, no overflow/errors
- iPhone 393 x 852: 11 / 11, no overflow/errors
- iPhone 430 x 932: 11 / 11, no overflow/errors
- iPad portrait 820 x 1180: 11 / 11, no overflow/errors
- iPad landscape 1180 x 820: 11 / 11, no overflow/errors
- **Total: 66 / 66 interaction checks PASS**

Mandatory simulated flow covers Jah -> Coach Mode -> search Dominic -> branded switch -> client context -> Jah remains music owner -> edit Dominic program fixture -> client AI block -> Exit -> Jah restored -> Dominic self persona -> same program mutation visible -> Dominic self AI available.

Dedicated client-context screenshots exist for iPhone 375, iPad portrait and iPad landscape. The 375 and iPad portrait captures were visually inspected for context clarity/overflow. The mobile context label was corrected to retain a visible `COACH` indicator.

## Full current-tree release gate

- 120 JS/MJS: `node --check` PASS
- 23 HTML: parser PASS
- 19 CSS: brace/structure PASS
- 2 JSON: parse PASS
- TOML: parse PASS
- required deployment files: PASS
- service-worker shell file references: PASS
- merge markers: none
- absolute `/mnt/data` or `/home/oai` development paths: none
- cache lineage: `fob-shell-v447`, My Gym `V=447`, Calendar `v=447`: PASS

## Separately unverified

- Physical iPhone hardware: **not claimed**.
- Physical iPad portrait/landscape hardware: **not claimed**.
- Live authenticated-account end-to-end audio playback across a real backend session (play/pause/seek/Pitch/VHS/Reverb/Replay while switching clients): **not physically/runtime verified in this sandbox**. R90's ownership/no-reset architecture is covered by 31/31 source/behavioral guards, but that is not substituted for live-device audio evidence.

These unverified gates must remain separate from the automated/package PASS result.
