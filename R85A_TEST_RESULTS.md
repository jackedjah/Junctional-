# R85A Test Results

## Current working-tree gates
- R85A release structure: PASS — 133 JS, 23 HTML, 20 CSS, 2 JSON parsed/checked.
- R85A canonical component closure: 24/24 PASS.
- R85A source/security guards: 30/30 PASS.
- R85A required A/B/C/D/E/F/G component visual comparison: 26/26 PASS.
- R85A Admin responsive/canonical Theme matrix: 90/90 PASS.
- R85 data model: 24/24 PASS.
- R85 Coach server behavior: 33/33 PASS.
- R85 Coach UI/IA: 28/28 PASS.
- R85 production-code browser flow: 62 assertions/interactions PASS.
- Browser interaction edge cases: 28 assertions/interactions PASS.
- Role/context: 35/35 PASS.
- Entry-boot resilience: 3/3 PASS.
- Audio ownership: 31/31 PASS.
- Messaging identity: 13/13 PASS.
- Simulator persistence: 13/13 PASS.
- R82 Mr.Mah preservation: 70/70 PASS.
- R83 Mr.Mah preservation: 62/62 PASS.

Total current targeted assertions/interactions: **572/572 PASS**, separate from the release-structure gate.

## Responsive targets
Production browser flows and Admin surfaces pass at:
- iPhone 375
- iPhone 390
- iPhone 393
- iPhone 430
- iPad portrait
- iPad landscape

No tested R85A surface reported horizontal page bleed or page errors.

## Crown measurement proof
At the 393 CSS px acceptance viewport:
- Member crown: 281 px expanded / 172 px collapsed.
- Admin crown: 281 px expanded / 172 px collapsed.
- Top message, collapse, Player pair and Theme pair coordinates match the member crown regression anchors.

## Historical cache note
The untouched R85 source-guard suite contains an old v448 delivery assertion. R85A intentionally supersedes that assertion with its v451 release/source guards; the historical test itself is not re-pinned.

## Not claimed
Physical iPhone/iPad hardware interaction and live-track audio fidelity/effect quality are not claimed from simulator/browser evidence.

## Staging packaged-artifact verification
A complete preverification archive was freshly extracted and compared against the working tree before final report closure:
- working tree files: 353
- extracted files: 353
- missing: 0
- extra: 0
- content-hash mismatches: 0
- complete extracted-tree release/component/browser/role/audio/Mr.Mah matrix: PASS

The exact final outgoing ZIP is freshly extracted and subjected to the same gate after these report bytes are finalized.
