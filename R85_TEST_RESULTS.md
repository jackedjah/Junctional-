# R85 TEST RESULTS

## Untouched starting baseline

Starting ZIP: `MAHFITT_R90A_ENTRY_BOOT_RESILIENCE_HOTFIX_FULL_SITE.zip`

SHA-256: `0b690b4780ebf6b67d8bf3d6e4e0d6605974f478d0ebc00a4150cb0ed472dc91`

Before R85 edits, the R90A baseline passed:

- full release gate
- role/context 35/35
- entry-boot resilience 3/3
- source/security guards 30/30
- audio ownership 31/31
- messaging identity 13/13
- simulator persistence 13/13
- R82 Mr.Mah 70/70
- R83 Mr.Mah 62/62

## R85 working-tree gate

Latest measured results before packaging:

| Gate | Result |
|---|---:|
| R85 static release gate | PASS |
| R85 data model | 24/24 PASS |
| R85 Coach server behavior | 33/33 PASS |
| R85 Coach UI / information architecture | 27/27 PASS |
| R85 source/security guards | 30/30 PASS |
| R85 production browser flow | 62/62 PASS |
| R85 browser edge cases | 28/28 PASS |
| inherited role/context | 35/35 PASS |
| inherited R90A boot resilience | 3/3 PASS |
| inherited audio ownership architecture | 31/31 PASS |
| inherited messaging identity | 13/13 PASS |
| inherited simulator persistence | 13/13 PASS |
| R82 Mr.Mah preservation under v448 delivery | 70/70 PASS |
| R83 Mr.Mah preservation under v448 delivery | 62/62 PASS |

Targeted assertions/interactions above, excluding the structural release-gate count: **391/391 PASS**.

The release gate currently parses and validates **128 JS/MJS, 23 HTML, 19 CSS, 2 JSON plus TOML/deployment structure**, service-worker references, merge markers, and absolute development paths.

## Browser interaction proof

Because this sandbox blocks navigation to localhost and `file://`, the R85 browser harness mounts the canonical MAHFITT shell in-memory and injects the **exact production CSS and JavaScript file contents in production order**. Only network/storage boundaries are mocked. Production source is not rewritten for the test.

Verified interactions include:

- Coach Home opens on Today rather than advanced programming.
- Today message row opens correct client/private thread.
- Client Directory search, clear, failure, retry and success.
- rapid/double client selection produces one context switch.
- short client transition names the correct client.
- client opens canonical MAHFITT Home.
- Program Library hides advanced Program Tools until intentionally opened.
- Calendar receives authorized Dominic profile context and Back preserves client context.
- Habits add/edit/complete/uncomplete and persist through route re-entry.
- Resources create/category/assignment behavior and assignment-without-copy contract.
- Messages open/send with coach sender identity.
- Admin remains reachable as a deliberate destination.
- protected client AI state remains blocked.

## Responsive simulation

PASS with zero horizontal overflow and zero page errors at:

- iPhone 375 CSS px
- iPhone 390 CSS px
- iPhone 393 CSS px
- iPhone 430 CSS px
- iPad portrait 768x1024
- iPad landscape 1024x768

Representative captures live in `validation/r85-browser/`.

## Audio status

The inherited **31/31 audio ownership/context architecture checks pass**. They prove client switching does not transfer music/Theme ownership away from the signed-in account or create a second audio owner.

A real authenticated track on physical iPhone/iPad was **not** exercised in this environment. Therefore R85 does not claim physical playback/Pitch/VHS/Reverb/Replay completion merely from automation.

## Physical-device status

No physical iPhone/iPad PASS is claimed. The six browser viewport simulations are separate evidence from physical Safari/PWA behavior.

## Staging packaged-artifact verification

Before creating the final user-facing archive, a full-site staging ZIP was created and extracted into a new directory.

- packaged files: 321
- freshly extracted files: 321
- missing files: 0
- extra files: 0
- content-hash mismatches: 0
- extracted release gate: PASS
- extracted targeted assertion/interaction matrix: 391/391 PASS
- extracted responsive production-browser simulation: all six required viewport classes PASS with zero browser errors
- extracted R82 Mr.Mah preservation: 70/70 PASS
- extracted R83 Mr.Mah preservation: 62/62 PASS

The final outgoing archive is re-created after this report update and must be freshly extracted/retested again because documentation bytes changed.
