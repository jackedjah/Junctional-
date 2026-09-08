# MAHWORLD R168 — Character Creator / Eye + Face Identity System

This fileset is the controlling implementation package for the **main MAHBEING character-selection / character-creation page**, with the new **Eye Selection + Signature Face system** as the current focus.

## Read in this order
1. `R168_MASTER_AUTONOMOUS_IMPLEMENTATION_PROMPT.txt`
2. `REFERENCE_MAP.md`
3. `IMPLEMENTATION/CHARACTER_CREATOR_FLOW.md`
4. `IMPLEMENTATION/EYE_FACE_RUNTIME_SPEC.md`
5. `IMPLEMENTATION/DATA_CONTRACT.json`
6. `ACCEPTANCE_CHECKLIST.md`
7. every file in `CURRENT_REFERENCES/`

## Controlling intent
- Preserve the existing MAHWORLD / MAHBEING identity.
- Add **Eyes** as a first-class character-creation selection step.
- The eye system must be **welcoming, broad, unisex, precise, pixel/faceted, and less anime** than the early exploration.
- The black field around each eye is not a background mistake: it represents the **canonical black face-display area** of MAHBEINGS.
- Eye choices must be **malleable at runtime** rather than frozen sprites only.
- Mr. Mah and Mrs. Mah retain recognizable signature defaults, but the system is available to all identities.
- Do not rebuild unrelated character anatomy or MAHWORLD systems during this pass.

## Autonomous working rule
Continue implementation without stopping for tiny approvals. Surface checkpoints only when a meaningful UI/runtime gate has passed or a blocking dependency truly requires user input.
