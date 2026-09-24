# MAHWORLD — FUTURE-CHARACTER IMPORT CONTRACT (JOB A, owner directive 2026-09-19)

Purpose: new character assets are coming (the current ATHLETE_M_V11 is only the motion / control / combat testbed). The runtime must animate SEMANTIC ROLES, never source bone names, so a new character plugs into the same controller, animator, beams, emitters, split / fuse and face channels through ONE per-character record — no rewrite of RigAnimator per asset.

## The record — `import_contract.json` (one per character, next to its GLB; `contract: "MAHWORLD_IMPORT_CONTRACT_V1"`)
- identity: `character`, `source` (original file), `status` (DRAFT_AUTO_GUESS → CONFIRMED), `units`, `scale_to_metres`, `up_axis`, `forward_axis`, `height_m`, `bind` (`identity` | `oriented`).
- `roles` — canonical role → source bone name:
  - required: `ROOT PELVIS SPINE CHEST NECK HEAD CLAV_L CLAV_R UPPERARM_L UPPERARM_R FOREARM_L FOREARM_R HAND_L HAND_R`
  - optional: `LUMBAR SPINE2 SCAP_L/R ARMTWIST_L/R FORETWIST_L/R FINGERS_L/R BROW_L/R CHEEK_L/R JAW`
  - SPLIT form (separated legs): `THIGH_L/R` (hips), `SHIN_L/R` (knees → shins), `TIP_L/R` (the pointed tips = propulsion anchors)
  - FUSED form: `TAIL1 TAIL2 TAIL3` (TAIL3 = the fused tip = the fused beam anchor)
- `emitter_anchors` — `HAND_L HAND_R TIP_L TIP_R FUSED_TIP CHEST`, each `{ role, offset_m }` (a bone, or a bone + offset).
- `morphs` — canonical morph role → source morph target names (`PACKED` for the split-legs pack, `muscles` list …).
- `face` — channel list (`brow_l brow_r cheek_l cheek_r jaw smile blink`) and whether they drive bones or morphs.
- `forms` — which forms the asset supports (`fused`, `split`).
- `notes` — conventions and human confirmations.
Template: `26_LOCAL_AUTHORITY/lab/import_contract.TEMPLATE.json`. Reference record (CONFIRMED): `26_LOCAL_AUTHORITY/lab/assets/athlete_m_preview/dev_0.16/import_contract.json` (the derivative rig's canonical names = identity mapping, bind identity, 32 roles, chains spine / arm_L / arm_R / leg_L / leg_R / fused all ordered; the manifest embeds it as `import_contract`).

## The adapter — `26_LOCAL_AUTHORITY/lab/importContract.js`
- `draftContract(boneNames, meta)` — the semantic guess (side-aware name patterns for Tripo / Reallusion / Mixamo / MAHWORLD names). A human confirms every role; the record is the truth, never the guess.
- `validateContract(contract, skeleton)` — roles exist · every chain descends in order (spine, arms, legs, fused) · bind orientation per role (identity vs oriented, with the angle) · units / height band · morph names · emitter anchors → `{ ok, errors, warnings, roles, bind, chains }`.
- `applyContract(contract, bonesByName)` — ALIASES roles onto source bones (`bones[ROLE] = sourceBone`), never renames or moves. `lab/GlbCharacter.js` applies the manifest's record after building its bone table and reports it in `capabilities.import_contract` (`{ applied, aliased, missing, roles, bind }`); a canonical-named rig aliases nothing and behaves exactly as before (verified: the page boots, 38 bones, ROOT / PELVIS / SPINE / CHEST / NECK / HEAD unchanged).
- Tool: `node 26_LOCAL_AUTHORITY/deploy/joba/validate_import_contract.mjs <glb> --draft <out.json> --character <ID>` then `… <glb> <record.json>` (exit 1 when invalid). No three.js needed (reads the GLB's node / skin / morph tables directly).

## What the validator found on real assets (proof the adapter surfaces the right questions)
- ATHLETE_M_V11 (`Mah_Athlete_M_am08_v8.glb`): VALID, 32 roles, all chains ordered, identity bind.
- MRS_MAH_GUIDE (a Tripo humanoid, Reallusion-style names `Hip / Waist / Spine01 / Spine02 / L_Clavicle / L_Upperarm / L_Forearm / L_Hand / L_Thigh / L_Calf / L_ToeBase …`): the draft maps 23 roles; the validator reports the one real hierarchy question — the spine chain's root is `Hip` (the guessed `Pelvis` is a sibling) — and an ORIENTED bind on 20 roles → `bind: "oriented"`. That is the exact information a human needs before confirming the record; no split (`TIP`) or fused (`TAIL`) form exists on that asset.
- DOGKIE (quadruped): 22 roles guessed, no SPINE / fused chain — correctly refused as a humanoid contract (creatures keep their own procedural classification in `lab/world/creatures.js`).

## What an ORIENTED rig still needs (not done — a real scope item for the first oriented character)
The animator's channels are Euler XYZ on local axes = rest-pose object axes (identity bind, `lab/ANIMATION_CHANNELS.md`). For an oriented rig (Mixamo / Reallusion / Tripo) the adapter must re-base each role: `q_local = q_bind⁻¹ · q_canonical · q_bind` per bone at pose time (a per-role bind quaternion table from the record), plus the mirrored-side convention (`MIRROR_SIDES` in RigAnimator) checked from the rest positions. The record's `bind: "oriented"` and the validator's per-role angles are the input; RigAnimator's `set()` is the one place to apply it. Authored clips (Tripo donor timing) are retargeted through the same table.

## Per-character intake procedure (the owner's future characters)
1. Copy the source GLB (never modify it) into `lab/assets/<char>/<version>/`; write the manifest (units, scale_to_metres, forward axis, forms, files, sha256).
2. `validate_import_contract.mjs <glb> --draft import_contract.json --character <ID>` → confirm every role by hand → `validate_import_contract.mjs <glb> import_contract.json` must print VALID.
3. Set `manifest.import_contract` (the record) — the runtime aliases the roles on load.
4. If `bind` is `oriented`: run the re-basing (above) before any authored clip; verify with the intactness matrix at normal speed and slowed (owner hotfix 2026-09-19 gate).
5. Emitter anchors / tips: confirm positions in the asset viewer; the beams and MAHGIC read them by role.
