# S10 — TRIPO UPPER-BODY DONOR + MAH LOWER BODY: STATUS (2026-09-16)

## Blocker (owner action)
The rigged/animated Visionary_F export is not on this machine — every GLB found (RAW/WORKING Visionary_F, the ALL_10 zip copy, Clone1,
the ImageToStl zip) has 0 skins / 0 clips. Exact export step + drop folder: `26_LOCAL_AUTHORITY/deploy/TRIPO_DONOR_MISSING_INPUT.md`
(→ `MAHWORLD_CHARACTERS/INCOMING_TRIPO/`). When it lands: `node 26_LOCAL_AUTHORITY/deploy/inspect_rigged_glb.mjs <file>` first.

## Done without the donor (all committed, default asset unchanged)
- Overhead ≥140° axillary plate: root cause = the source sculpt merges the inner upper arm into the lat over a contact strip; the humeral
  column rule then handed ribcage verts to the arm (1.8 cm edges → 55 cm plates). Runtime derivative `rig_axilla.mjs` (unweld + inner-arm
  and lat patches) → dev_0.12 / `ATHLETE_M_V7` (`?avatar=ATHLETE_M_V7`). Max stretch ratio at 150°: 34 → 5.9. Default stays V6 (dev_0.11).
- Motion-layer contract in RigAnimator (`setLayer(pose, weight)`, UPPER mask, clavicle/scapula DOF ownership, entry/exit inertialization),
  test `16_TESTS/gameplay_motion_layer.test.mjs` (6/6, synthetic poses — not donor motion). Dev hook `MAHWORLD_PLAY.upperLayer(id, pose, w)`.
- Mapping template `lab/assets/retarget/tripo_visionary_f_to_athlete_m_v5.template.json` (chains, reference space, exclusions, checks).
- First-cast hitch: effect warm-up at boot (`?warm=0` disables). Cold 150–187 ms → warmed 50 ms (render 14 ms; rest is host JS).
- NPC: real-input check passes (W → prompt → Enter → lines → Escape → move); Enter/Space/Escape now owned by the dialog.

## Not done / next
- Source playback viewer, retarget, A/B with the donor layer, exercise-clip fitting — all wait on the export.
- Astra appearance manifest: none delivered yet (`astra_return_01` has no new manifest; OWNER_JOB.lock present, Blender idle). Import stays
  a later explicit action on a versioned copy (mesh/rig/motion/appearance versions kept independent).
