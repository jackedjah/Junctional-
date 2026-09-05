# R85A1 — Test Results

## Baseline

The untouched R85A starting artifact passed the existing release/component/role/audio/message/browser/R82/R83 preservation fingerprint before edits.

## Current working-tree result

Static/structural release gate: **PASS**

Targeted assertions/interactions:

- R85A canonical component closure: 24/24
- R85A source/security guards: 30/30
- R85A1 Coach tabs + pedometer behavior: 18/18
- R85A1 degraded five-tab browser flow: 15/15
- Role/context regression: 35/35
- Audio ownership: 31/31
- Messaging identity: 13/13
- R85 data model: 24/24
- R85 Coach server behavior: 33/33
- R85 Coach UI/IA: 28/28
- Entry-boot resilience: 3/3
- Simulator persistence: 13/13
- Canonical visual comparison: 26/26
- Admin responsive/component parity: 90/90
- Production-code browser flow: 62/62
- Browser interaction edge cases: 28/28
- R82 Mr.Mah preservation: 70/70
- R83 Mr.Mah preservation: 62/62

**Working-tree total: 605/605 targeted assertions/interactions PASS**, separate from the static release gate.

Responsive production-code browser flow passes at 375, 390, 393, 430 CSS px, iPad portrait, and iPad landscape with zero browser page errors and zero page-level horizontal overflow.

Pedometer synthetic detector proof:

- 20 walking-like cadence pulses: accepted within tight tolerance (18–20 required; current run 19)
- isolated vibration spikes: 0 false steps
- rapid phone-shake sequence: 0 false steps

## Additional hygiene

- all JS/MJS syntax: PASS
- HTML/CSS/JSON structural checks: PASS
- merge-marker scan: PASS
- production absolute-development-path scan: PASS
- all three built-in fallback Resource documents exist in the shipped tree: PASS

## Packaged artifact

Staging full-site archive clean-extraction verification: **PASS**

- working tree files: 358
- extracted files: 358
- missing: 0
- extra: 0
- content-hash mismatches: 0
- extracted release gate: PASS
- extracted targeted assertions/interactions: **605/605 PASS**
- extracted responsive browser targets: 375 / 390 / 393 / 430 / iPad portrait / iPad landscape PASS

The exact final outgoing ZIP is re-tested after these report bytes are packaged.

## Not claimed

- Physical iPhone/iPad motion accuracy has not been measured by this environment.
- A web/PWA cannot reliably continue motion sampling while iOS has fully suspended/closed it. R85A1 preserves/reconciles foreground estimates and provides a one-tap motion-resume path; native Core Motion/HealthKit remains the path to true closed/background counting.
