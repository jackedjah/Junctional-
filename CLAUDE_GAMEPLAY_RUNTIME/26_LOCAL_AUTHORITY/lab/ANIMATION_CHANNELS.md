# MAHWORLD runtime animation channels (shared contract, 2026-09-15)

Every presentation module in `26_LOCAL_AUTHORITY/lab/` (RigAnimator, animData, BeamFx, fieldSound, GlbCharacter, PresentationAdapter, gameHud) uses these names. Adjustable numbers live only in `lab/presentation_defaults.json`.

## Bones (derivative rigs, all classes)
Body (existing): `ROOT PELVIS SPINE CHEST NECK HEAD CLAV_L CLAV_R UPPERARM_L UPPERARM_R FOREARM_L FOREARM_R HAND_L HAND_R TAIL1 TAIL2 TAIL3` (TAIL* = fused lower body, TAIL3 tip = fused beam anchor).
New (v2 generator): `FINGERS_L FINGERS_R` (child of HAND_*; x rotation = curl, fist ≈ +1.3 rad, open/relaxed ≈ 0.05), `BROW_L BROW_R` (child of HEAD; x rotation: negative = raise), `CHEEK_L CHEEK_R` (child of HEAD; x negative = raise), `JAW` (child of HEAD; x positive = open), split legs `THIGH_L THIGH_R` (child of PELVIS), `SHIN_L SHIN_R`, `TIP_L TIP_R` (separated beam anchors).
Rotation convention: Euler XYZ radians on each bone's local axes = rest-pose object axes (identity bind); +x rotation = pitch forward/down for spine-chain bones, arms hang along −y in rest.

## Meshes / form roles (RIG_RUNTIME_CONTRACT names)
`fused_mesh` (upper body + fused lower body in one SkinnedMesh, node `*_BODY`), `split_upper_mesh` (same geometry with the fused lower primitive hidden by material group / separate primitive), `split_leg_mesh_L/R` (one SkinnedMesh `*_SPLIT_LEGS` holding both legs, bones THIGH/SHIN/TIP, morph target `PACKED` = legs pressed together at the fused silhouette). Form change = `packed_morph` 1→0 (UNFUSE STAR) / 0→1 (REFUSE SNAP) with the fused primitive visibility swapped at the commit frame where the packed legs coincide with the fused silhouette. Seam parameter `seam` (0..1) for the trace.

## Face channels (animator → bones/uniforms)
`brow_l brow_r` (−1 lowered … +1 raised), `cheek_l cheek_r` (0..1 raise), `jaw` (0..1 open), `smile` (0..1 → cheek raise + jaw slight + mouth corners via CHEEK bones), `blink` (0..1; drives material uniform `uBlink`: lids close over the K3 iris glow — emissive fades and the eye mask darkens to skin from the top down; never a geometry squash), `gaze_x gaze_y` (rad; eyes lead → head → torso ordering is done by the animator; no iris geometry exists so eyes are represented by lid/glow only).
Expression poses (names used by animData and the animator): `CALM CURIOUS FOCUS EXERT FRIENDLY AMUSED PLAYFUL UNCERTAIN WINCE CELEBRATE DISAPPOINT`. Priority (high→low): `REACTION` (wince, hit) > `COMBAT` (focus/exert during host cast phases) > `EMOTE` (authored) > `MOOD` (resting calm + idle variation). Higher layers override with a blend of `face.expression_blend_s`; lower layers never interrupt a higher one.

## Gait / beams (animator → BeamFx / audio)
`animator.gait()` → `{ phase (rad, 0..2π, left support at 0, right at π), speed_mps, form: 'FUSED'|'SPLIT', support: { L: 0..1, R: 0..1 }, events: [{ side: 'L'|'R', t }] (support events since the previous call, derived from phase crossings), airborne: bool, brace: 0..1 }`.
`animator.beams()` → `{ fused: 0..∞, L: 0..∞, R: 0..∞, seam: 0..1 }` relative intensities (presentation weights).
Anchors: fused = bone `TAIL3` world position; separated = `TIP_L` / `TIP_R`. BeamFx casts to the real nearby ground/collider below each anchor (adapter passes `groundY`/collider test), fades the ground response with altitude, never draws to the world floor from altitude.

## Emote data (animData.js)
`EMOTES[id] = { id, name, group: 'SOCIAL'|'DANCE'|'EXERCISE'|'FLEX'|'EXPRESSION'|'PARTNER', form: 'ANY'|'FUSED'|'SPLIT', partner: false|true, directed: bool, icon: '…', segments: { entry: Clip, loop: Clip|null, exit: Clip }, loops: n|'until_cancel', face: expression name, beams: 'idle'|'pulse'|'brace', reply_options: [ids] }`.
`Clip = { duration_s, keys: [ { t: 0..1, bones: { BONE: [x,y,z] }, face: { channel: value }, beam?: 0..2 } ] }` — bone values are additive offsets over the animator's base pose; keys are interpolated with ease-in-out; a clip's last key is held through the segment end. Paired emotes carry `partner_offset_m` and `partner_facing` and both roles (`roles: { A: segments, B: segments }`) on a shared timeline `t0` from the host.

## Host state consumed
`play.form`, `play.mahloco`, `play.transforming`, `play.flight`, `play.dash`, `play.guard`, `play.emote` (id) + `play.emote_at`, `play.emote_target`, `play.paired` `{ id, role, t0, partner_id }`, `play.hit_ago_s`, rules cast phase/progress/category/attack_id/profile, `play.npcs[]` with the same fields + `class_id`, `position`, `facing`, `social` state.
