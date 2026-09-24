# PRESENTATION ADAPTER CONTRACT — playable local sample (DEVELOPMENT, 2026-09-14)

**Status:** development contract, version `PRESENT_DEV_0.1.0` (exported as `PRESENTATION_CONTRACT` from `lab/PresentationAdapter.js`). It is the ONE seam between the authoritative runtime snapshot and whatever renders a character. Today it is implemented by a code-generated STAND-IN (primitives). A later, reviewed character asset (Astra's) plugs in by implementing the same surface — no gameplay file changes. Nothing here is canon; nothing here is a final character, animation, or art direction.

## Surface

```
createPresentationAdapter(THREE, scene, { camera, irisColor? }) →
  mount(id, descriptor)   descriptor.kind = 'CHARACTER' | 'TARGET' | 'MARKER'; CHARACTER: { class_id, sex?, self, label }
  update(id, viewState, dt)
  remove(id)              releases every geometry / material / texture the adapter created for the entity
  dispose()               removes everything
  get(id) / ids()         inspection only
  contract, implementation
```

## Units, axes, scale

| item | value |
|---|---|
| length / time | metres, seconds |
| up | +Y |
| facing | yaw in radians about +Y; yaw 0 faces −Z; positive yaw turns toward +X (Three.js right-handed) |
| ground plane | y = 0 at room floor; `position.y` is the authoritative altitude (platform height + flight height) |
| character height | FUSED 1.8 m · SPLIT 1.4 m per body, two bodies at ±0.35 m on local X |
| origin | feet (ROOT) at `position` |

## View state (CHARACTER)

All fields come from the host snapshot; the adapter never derives gameplay from them.

`position{x,y,z}` · `facing` · `form` (FUSED / SPLIT) · `mahloco` (state string, e.g. FUSED_GLIDE, SPLIT_RUN, UNFUSE_CURL) · `transforming` (bool — non-cancellable morph in progress) · `guard` (PHYSICAL / MAGICAL / null) · `dash{dir,t,dur,airborne}` or null · `flight{powered,warning,forced}` · `attack{attack_id,state}` or null (state CONCENTRIC / PEAK_TRANSITION / ECCENTRIC / COMPLETE / INTERRUPTED) · `emote` (id or null) · `health01` · `in_duel` · `label` · `self`.

TARGET: `position`, `health01`, `down`. MARKER: `position`, `active`.

## Required clips (a reviewed asset must provide; the stand-in fakes them with scale / colour / bob)

IDLE · WALK · RUN · DASH · GUARD_PHYSICAL · GUARD_MAGICAL · ATTACK_CONTACT · ATTACK_MANIFESTATION · TRANSFORM_TO_SPLIT · TRANSFORM_TO_FUSED · FLY_IDLE · FLY_MOVE · LAND · LAND_FORCED · HIT · KO

Optional: EMOTE_WAVE · IDLE_VARIANT_* · TAUNT · VICTORY.

Clip selection is the adapter's job from the view state (mahloco state → locomotion clip; `attack.state` → attack clip phase; `flight.*` → fly / land clips; `transforming` → transform clip, never interruptible on screen because the host never cancels it).

## Sockets

ROOT · HEAD · CHEST · HAND_L · HAND_R · FEET. The stand-in exposes `userData.hands` and `userData.head` on its figure groups; a rigged asset maps the same names to bones. Contact attack flashes attach to HAND_*; manifestations attach to CHEST and project forward along the facing.

## Ownership and disposal

The adapter owns every scene object it creates. Callers only hold the entity id. `remove(id)` and `dispose()` must free geometry, materials and textures (the stand-in does). A reviewed-asset adapter additionally owns its loaders, skeleton utilities and animation mixers.

## Fallback

If a reviewed asset fails to load or validate, the adapter MUST fall back to the stand-in for that entity so the sample stays playable. The fallback is visible (label suffix or colour) — never silent.

## Never

The adapter never simulates, never reads input, never changes facing from the camera, never owns gameplay state, never writes to the host. Presentation smoothing (the eased follow toward the authoritative position) is cosmetic; the host position is the truth and the HUD shows host values.

## Mounting the reviewed character later (not done here)

1. Implement `createPresentationAdapter` with the same surface (e.g. `PresentationAdapterGLB.js`) loading a reviewed GLB through the vendored `GLTFLoader.js` (not mounted by the server today — the server serves only `three.module.min.js` / `three.core.min.js` read-only).
2. Map clips and sockets by the names above; keep the stand-in as the fallback path.
3. Switch the import in `lab/play.js`. No host, protocol, tuning or test change is required.

## Reusable character slot (stage 2, 2026-09-14)

`lab/AssetSlot.js` — `createCharacterSlot({ standIn })` + `validateManifest(manifest)` + `MANIFEST_SCHEMA` (`GAME_TEST_EXPORT_MANIFEST_DEV_0.1`). One slot per view; bindings are registered per asset (`register(export_id, { manifest, create })`); `select(id)` validates the manifest, disposes the previous implementation, awaits the binding's loader and falls back VISIBLY to the stand-in (`fallback_reason`, label suffix `(STAND-IN fallback: …)`) on an unknown binding, an invalid manifest, a loader error, or a binding that is not an adapter. History records every switch; `owner_review_status` is carried verbatim (CANDIDATE / OWNER_REVIEWED / OWNER_APPROVED) and never promoted here.

**Manifest — required fields:** `export_id`, `version`, `sha256` (64 hex), `owner_review_status`, `source_release`, `units` = metres, `up_axis` = +Y, `forward_axis` = −Z, `root`, `scale_to_metres` (> 0), `forms` (array; missing FUSED / SPLIT are reported as *unsupported*, never invented), `clips` (map of the required clip names above; missing ones reported), `sockets` (map; missing ones reported), `materials`, `files` (relative paths inside the export; `.blend` / `.py` / absolute / parent paths refused). **Optional:** `textures`, `animation_events` (cosmetic only — they never award damage or drive combat timing), `notes`, `native_evidence` (paths of owner-provided native renders for comparison).

**Where a release comes from:** only an explicitly declared GAME-TEST EXPORT (a versioned folder + manifest named in the project contract or an owner message). Status 2026-09-14: none is declared anywhere in the project (searched the non-Astra project docs for "GAME-TEST EXPORT" / export directories; Astra's folders were not scanned). The stand-in is therefore the only real binding; `EXAMPLE_BROKEN` in `play.js` is a demonstration binding whose loader throws, to show the visible fallback. Native rig / appearance / eye-crystal / material checks: PENDING until a release exists.

**Replacement procedure (exact):** 1) copy the released export read-only into `26_LOCAL_AUTHORITY/lab/assets/<export_id>/<version>/` with its manifest; 2) add a binding in `play.js` — `slot.register('<export_id>', { manifest, create: async (m) => createGlbAdapter(THREE, scene, m) })` where the GLB adapter implements the same `mount / update / remove / dispose` surface (loader: the vendored `GLTFLoader.js`, which the server would then also allow-list read-only); 3) open `play.html?field=1&avatar=<export_id>`; 4) check scale (1.8 m fused), root at the feet, +Y up / −Z forward, neutral-light materials, eye / crystal visibility, listed clips, supported forms; unsupported forms stay on the stand-in; 5) record the version, sha256 and owner-review status in the report — never overwrite the export, never mark a candidate approved.

## Playability pass addendum (2026-09-14) — contract PRESENT_DEV_0.2.0

- Implementation label: `adapter.implementation` = "TEMPORARY PREVIEW (code-generated articulated humanoid, fused lower body)". The preview (head, neck, torso, shoulders, upper / lower arms, hands, fused tapered lower body) is marked TEMPORARY PREVIEW in-world; it is not the Athlete and is replaced through the AssetSlot binding when a released GLB exists.
- View state additions (CHARACTER): `attack.category` (PHYSICAL | PHYSICAL_MAGIC | SPECIAL_MAGIC), `attack.progress` (0..1 of the current authoritative phase), `attack.state` (CONCENTRIC = wind-up, RECOVERY), `hit_ago_s` (seconds since the host recorded a hit or a harmless touch; drives the flinch). Poses are chosen from these fields every frame; no animation callback ever decides gameplay.
- New kind `LOCK_MARKER` — mount `{kind: 'LOCK_MARKER', color}`; update `{position, visible}`. Four inward-pointing corner arrows with a dark outline, one pulse on mount, billboarded, fades while `visible` is false. The view mounts it ONLY from `rules.me.lock` in the snapshot and removes it when the host clears the lock.
- Kinds `IMPACT` / `PROJECTILE` accept `category` and `harmless` (lighter particles for harmless free-roam impacts).
- `HIT` and `KO` are now exercised clips (flinch / lying pose); `ATTACK_CONTACT` splits into anticipation → release → recovery driven by phase progress; `ATTACK_MANIFESTATION` uses a gathering cast pose with hand glow.
- Sound is a sibling module (`lab/fieldSound.js`, synthesised cues, no assets) triggered by the view from phase changes and entity spawns; a reviewed asset does not need it.

## Attack-dock / presentation-profile addendum (2026-09-14)

- `attack.profile {id, tint (#rrggbb), style (BALANCED | HEAVY | FLOW | PRECISE | QUICK), display_name}` arrives frozen with the cast from the host's presentation profile (`_runtime_mapping.presentation_profiles`, one per class + skill). The TEMPORARY PREVIEW uses it cosmetically only: strike flash / floor ring / physical-magic hand glow take the class tint, pose amplitude and release timing follow the style. Damage, timing and balance are unaffected; fidelity is `PLACEHOLDER_COSMETIC_ONLY` until production assets are mounted.
- A reviewed asset maps `presentation_profile_id` to its own clip / VFX / sound / camera set; the same movement pattern must not look literally identical across classes.

## Rigid GLB character addendum (2026-09-15)

`createPresentationAdapter(THREE, scene, { characterFactory })` accepts a factory that returns `{ group, height, width, sockets{HEAD,CHEST,HAND_L,HAND_R,FEET}, capabilities }` for a RIGID figure (development preview copy of Athlete_M; no skeleton, morphs or clips). The adapter then drives whole-body procedural motion only (`rigidPose`: wind-up twist, release lunge, recovery, cast rise, guard brace, flight lean, hit recoil, KO) plus the existing effects at the estimated sockets; `capabilities()` reports `{figure:'RIGID_GLB', limbs:false, legs_separate:false}`. The SPLIT form is NOT representable on a rigid asset: the fused silhouette stays and the limitation is reported in the development panel — no mesh scaling is ever presented as leg separation. A skinned, morph-carrying reviewed export replaces the factory through the same slot.


## ADDENDUM 2026-09-15 · SKINNED derivative rig + RigAnimator (COMPLETE PLAYABLE DEMO PASS)

A GLB binding whose factory reports `skinned: true` (a SkinnedMesh with named bones) is driven by `lab/RigAnimator.js` instead of `rigidPose`: every bone target is a layered, purely presentational function of the AUTHORITATIVE view (idle breathing → locomotion lean / arm-back posture / backward hinge from the smoothed velocity and facing → turn and brake settle → flight incline with ascend / descend arm changes → directional dash poses (upright torso, complementary bent arms, leading hand near the chin) → per-pattern attack anticipation / release / settle driven by the host cast phase and progress (PUSH / PULL / HINGE / ROTATION / CAST) → guards → hit recoil from `hit_ago_s` → emotes (WAVE shoulder → elbow → wrist → hand, NOD, READY; keyed by `emote` + `emote_at`) → transformation phases keyed by the mahloco state (UNFUSE ENTER · CURL · CHARGE · BURST · STAR · RECOVER / REFUSE ENTER · KNEES_UP · ALIGN · SNAP · RECOVER with seam-glow and propulsion emitter timing from the placeholder durations) → KO). Bones are slerped toward the layered target at a state-dependent rate; nothing here decides timing, damage or movement. Hand effects are parented to the HAND_L / HAND_R bones (scaled by the inverse body scale), the seam ring to PELVIS and the propulsion emitters to TAIL3. `capabilities()` reports `{figure:'SKINNED_GLB_DERIVATIVE_RIG', limbs:true, joints:[…17], legs_separate:false, morphs:false, eyes:false}`. The authentic source materials are kept (no graphite override; KO tints, invisibility fades, then the colour is restored to white). Limits stated honestly: the derivative rig has no split-leg geometry, PACKED morph, eyelids or mouth — the STAR / SNAP phases move the fused lower body and the SPLIT form is the fused mesh with the propulsion moved to the tips; no floating eye overlays are ever added. Snapshot additions consumed: `emote_at` (host clock of the accepted emote).


## ADDENDUM 2026-09-15 (evening) · LIVING CHARACTER: rig v2, gait phase, beams, face layers, emotes, NPCs

Contract file for names and formats: `lab/ANIMATION_CHANNELS.md`; adjustable presentation numbers: `lab/presentation_defaults.json` (the ONE file). `PresentationAdapter` options: `defaults`, `animData` (lab/animData.js: EXPRESSIONS, EMOTES with entry/loop/exit clips and paired roles, HAND_POSES, CLASS_STYLE), `sound` (lab/fieldSound.js propulsion + step pulses), `groundAt(x, z, fromY)` (lab/fieldScene.js: highest collider top under a point), `factoryFor(class_id)` (per-class GLB factories; NPC bodies), `beams` (false disables BeamFx). Per skinned figure the adapter runs RigAnimator v2, applies `setForm(packed, showLegs)` (v2 assets: fused-lower primitive ↔ split-legs mesh with the PACKED morph, driven by the transformation phase), `setBlink` (material uniform: lids close over the K3 glow), collects `gait()` events (single phase, left support at 0 / right at π; events are phase crossings) and forwards them as beam pulses + one audio pulse each, and updates `BeamFx` with the TAIL3 / TIP_L / TIP_R world anchors, the real support surface under each anchor, altitude, velocity, brace and the one↔two `blend` during transformation. Facial output (`faceOf(id)`) is layered REACTION > COMBAT > EMOTE > MOOD; face channels drive BROW/CHEEK/JAW bones (crude on the Tripo head) and the blink uniform; no eye or lid geometry exists. Emotes come from the host (`emote`, `emote_at`, `emote_target`, `paired {id, role, t0, partner_id}`, `host_t`); paired roles reconstruct their phase from `host_t − t0` on late snapshots. Field NPCs (`play.npcs`) are mounted by play.js under `other:<id>` with their class body and are excluded from the rules-view updates. Presentation never adds displacement, timing, damage or reach: clips are additive over the animator base pose, reach values are capped in animData, and every state comes from the host snapshot.
