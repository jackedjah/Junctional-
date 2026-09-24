# MAHWORLD COMPLETE PLAYABLE DEMO PASS — REPORT (2026-09-15)

Owner brief: "CONTINUE — MAHWORLD COMPLETE PLAYABLE DEMO PASS / COLORED ATHLETE · ARTICULATED ANIMATION · WORKING MENUS / DETAILED FUSE/SEPARATE · 4/2/2 ATTACK LOADOUT · MOONLIT SKY". Owner phone findings addressed: MORE did not work; movement and combat like a rigid action figure; flight and eyes artificial; leg separation / fusion missing; every exposed control must work; compact MAHWORLD-themed interface.

Everything below was executed on this machine with the permitted native tools only (Node 22, the existing Chrome headless over CDP, plain-node tests). No Blender, no installs, no purchases, no deployment. Owner-started server (PID 20640) and Astra sessions untouched; only the pass's own temporary servers (port 0) and headless Chrome instances were started and stopped. Sources (RAW_10_MODELS, WORKING_10_MODELS, Astra folders, .codex) untouched — the colored character is an isolated derivative copy.

## 1 · PLAYABLE RESULT

Local playable demo with the COLORED, RIGGED Athlete_M — since the LIVING ATHLETE addendum the default is **dev_0.4 `ATHLETE_M_AM08`**: Astra's latest fully saved RETAINED candidate (AM08: GOLD_B gold decision, finger fix, K3 eye accents, AM06 material response) connected onto the derivative rig (see §4a). (Original wording: authentic source materials, 17-joint derivative skeleton, living procedural body motion from the authoritative state), a compact themed HUD (attack dock with edge handle, MORE bottom sheet with ACTIONS / LOADOUT / EMOTES, stepped guide with gesture glyphs), the host-authoritative 4 / 2 / 2 loadout, three emotes, the full UNFUSE / REFUSE phase choreography (on the fused lower body — see limits), and a moonlit sky. All host suites pass; the control inventory and the MORE torture sequence pass on desktop and emulated phone layouts; a runtime video was recorded in-page. Three baby steps to play are at the end.

## 2 · MORE ROOT CAUSE / FIX

Root cause (real event path, verified with the in-HUD event log `hud.eventLog()` that records pointerdown → pointerup → activation for every tap):
1. **Re-rendered buttons lost the tap** — the HUD rewrote button `innerHTML` (FLY / LAND, SEPARATE / FUSE, PRACTICE, LOCK, summary, cast bar) on every 100 ms tick; a finger resting on a button whose children were replaced between pointerdown and pointerup no longer had its target inside the button, so the delegated handler saw no `[data-do]` and did nothing. Fix: idempotent `setHtml()` (no DOM churn unless the text changed) **and** activation resolved from the pointer-down-remembered button on pointer-up (`st.pressBtn`, pointer capture), independent of the release target.
2. **Duration limit** — a press held longer than 1.2 s (slow frames, hesitant thumb) was discarded. Fix: native click semantics — a press activates on release regardless of duration unless the finger moved off (> 14 px).
3. **Dismiss layer stuck after arming a move** — selecting a chip closed the drawer but left the outside-tap layer visible, so the next world tap (lock-on) was swallowed once. Fix: `syncDismiss()` after arming.
4. **Handled drags re-activated the element under the release** (drag-open the dock, release re-collapsed it). Fix: a handled drag consumes its pointer.
5. **HELP could not be closed by touch** — its CLOSE button only listened to `click`, never synthesised under `touch-action: none`. Fix: pointerup + click.

MORE is now a bottom sheet (`#g-more.sheet`, slides up/down, drag handle) with three tabs. Verified with real input events (150 ms and 30 ms presses) under every owner-listed condition: baseline, after attack-mode change, with the attack drawer open (one panel at a time — the drawer closes), after rotation 390×844 → 844×390 → back (touch layouts), after background / resume (blur + visibilitychange + focus), after performing an attack, while flying; one tap opens and it stays open with no further input; a tap outside closes only the sheet and is consumed (world unchanged: no lock, no camera change, no cast); two taps = open then close. Evidence: `evidence/play/controls_portrait/transcript.json`, `controls_desktop1440/`, `controls_small/` (steps `MORE …`).

Note: the emulated background/resume uses the events the page listens to; `Page.setWebLifecycleState(frozen→active)` stalls CSS transitions in headless Chrome for seconds (a headless artefact, verified, not a page defect).

## 3 · CONTROL COVERAGE (INPUT → HANDLER → COMMAND → VISIBLE RESULT)

**desktop 1440×900 (mouse + keyboard)** — MORE 6/6 conditions OK · controls 35/35 OK · transcript errors 0 (`evidence/play/controls_desktop1440/transcript.json`)
**phone portrait 390×844 (touch)** — MORE 8/8 conditions OK · controls 32/32 OK · transcript errors 0 (`evidence/play/controls_portrait/transcript.json`)

| control | input | handler | host command | visible result |
|---|---|---|---|---|
| mode PHYSICAL | tap dock button | button.gmode → tapMode | RULES_SELECT ✓ PA_PUSH | mode highlighted true, drawer true |
| mode PHYSICAL_MAGIC | tap dock button | button.gmode → tapMode | RULES_SELECT ✓ PM_PUSH | drawer true chips 2 |
| mode SPECIAL_MAGIC | tap dock button | button.gmode → tapMode | RULES_SELECT ✓ ATHLETE_VECTOR | drawer true |
| move selection (chip) | tap chip slot 2 | .gchip → selectMove(slot) | RULES_SELECT ✓ ATHLETE_TRACK | selection {"PHYSICAL":0,"PHYSICAL_MAGIC":0,"SPECIAL_MAGIC":1} · drawer closed true · summary "• Trackburst · READY" |
| attack | hold ATTACK + swipe up | touchControls gesture → attack("gesture") | RULES_CAST ✓ PA_PUSH | casts 1 → 2 · cast bar true |
| dash | hold DASH + swipe right | touchControls dashSwipe → send DASH | DASH ✓ RIGHT 3.4m | moved 3.40 m |
| guard PHYSICAL | tap GUARDP | data-do=guardp → act.guard | GUARD ✓ PHYSICAL | guard=PHYSICAL · button.on true |
| guard MAGICAL | tap GUARDM | data-do=guardm → act.guard | GUARD ✓ MAGICAL | guard=MAGICAL · button.on true |
| lock on (tap enemy) | tap the dummy on screen at 233,326 (entity other:FIELD_DUMMY, top tc-world) | tapAt → entityAt → send LOCK_TARGET | LOCK_TARGET ✓ FIELD_DUMMY | lock FIELD_DUMMY · marker {"target":"other:FIELD_DUMMY","opacity":1,"position":{"x":0,"y":1,"z":-2}} · hud {"open":false,"more":false,"more_tab":"acti |
| unlock | MORE → UNLOCK | data-do=unlock → LOCK_TARGET null | LOCK_TARGET ✓ cleared | lock null · target panel false |
| FLY | tap FLY | data-do=fly → flyToggle → FLIGHT ENTER | FLIGHT ✓ | powered true alt 2.5 · button "LAND F" |
| LAND | tap LAND | data-do=fly → flyToggle → FLIGHT EXIT | FLIGHT ✓ | landed true · button "FLY F" |
| SEPARATE / FUSE | MORE → SEPARATE, tapped twice quickly | data-do=transform → send TRANSFORM (second tap refused: already changing) | TRANSFORM ✓ | form FUSED → SPLIT · toast "ALREADY CHANGING FORM" · button "FUSE T" |
| FUSE back | MORE → FUSE | data-do=transform → TRANSFORM | TRANSFORM ✓ | form FUSED |
| PRACTICE BATTLE | MORE → PRACTICE | data-do=practice → FIELD_PRACTICE | FIELD_PRACTICE ✓ | practice true · state pill "PRACTICE BATTLE" |
| RESET PRACTICE | MORE → RESET | data-do=reset → PRACTICE_RESET | PRACTICE_RESET ✓ FIELD | dummy hp 1000 · practice true |
| INTERACT (prompt present) | MORE → INTERACT | data-do=interact → interact() → first prompt intent | FIELD_INCOMING ✓ PA_PUSH | label "INTERACT INCOMING PHYSICAL (I)" · toast "null" · prompt {"intent":"FIELD_INCOMING","kind":"PHYSICAL","label":"INCOMING PHYSICAL (I)","el |
| emote WAVE | MORE → EMOTES → WAVE | data-do=emote[data-emote] → EMOTE | EMOTE ✓ | snapshot emote WAVE · bones {"UPPERARM_R":[-0.178,-0.012,-2.212],"HEAD":[-0.037,-0.218,0.07],"FOREARM_L":[-0.06,0,0]} |
| emote NOD | MORE → EMOTES → NOD | data-do=emote[data-emote] → EMOTE | EMOTE ✓ | snapshot emote NOD · bones {"UPPERARM_R":[0,0,-0.055],"HEAD":[0.238,-0.042,0],"FOREARM_L":[-0.06,0,0]} |
| emote READY | MORE → EMOTES → READY | data-do=emote[data-emote] → EMOTE | EMOTE ✓ | snapshot emote READY · bones {"UPPERARM_R":[-0.656,-0.013,-0.44],"HEAD":[-0.073,-0.034,0],"FOREARM_L":[-1.648,0,0]} |
| LOADOUT equip (4/2/2) | MORE → LOADOUT → PHYS MAHGIC slot 2 → pick PM_HINGE | data-do=load-slot / load-pick → RULES_LOADOUT | RULES_LOADOUT ✓ PM_HINGE | pool shown true · equipped ["PM_PUSH","PM_PULL"] → ["PM_PUSH","PM_HINGE"] · count 2/2 · toast "EQUIPPED Infused Hinge Rise · PHYSICAL MAGIC slot 2" |
| LOADOUT empty slot | slot 2 → leave empty | data-do=load-clear → RULES_LOADOUT null | RULES_LOADOUT ✓ | equipped ["PM_PUSH",null] · dock skills 1 · count 1/2 |
| LOADOUT re-equip | slot 2 → PM_PULL | load-pick → RULES_LOADOUT | RULES_LOADOUT ✓ PM_PULL | ["PM_PUSH","PM_PULL"] |
| LOADOUT server validation | duplicate skill into another slot; slot beyond capacity | host RulesField RULES_LOADOUT | refusals DUPLICATE / BAD_SLOT | no change: ["PA_PUSH","PA_PULL","PA_HINGE","PA_ROTATION"] |
| HELP | MORE → HELP, then CLOSE | data-do=help → #menu.open · #closemenu | none (client panel) | help open true → closed true |
| GUIDE | MORE → GUIDE → START | data-do=guide → showGuide(true,0) · guide-close | none (client panel) | guide open true step 0 → closed true |
| DEV PANEL | MORE → DEV PANEL | data-do=dev → toggleDev | none (client panel) | dev panel visible true |
| MENU handle (tap) | tap the sheet handle | data-do=more-close → closePanels | none | sheet open false visible false |
| MENU handle (drag down) | drag the handle down 60 px | pointermove on handle → closePanels(sheet-drag) | none | sheet open false |
| attack dock handle (tap → slide to edge) | tap the dock edge handle | data-do=dock-toggle → dockCollapse | none | dock left 195 → 358 (viewport 390) · collapsed true · handle glyph "⟨" |
| attack dock handle (drag inward → reopen) | drag the handle left 60 px | pointermove on handle → dockCollapse(false) | none | dock left 195 · collapsed false |
| move details (ⓘ) + CLOSE | tap ⓘ on slot 1, then CLOSE | data-do=info → openDetail · detail-close | none | detail visible true → false |

**small phone 320×568 (touch)** — MORE 8/8 conditions OK · controls 32/32 OK · transcript errors 0 (`evidence/play/controls_small/transcript.json`)

Every row is produced by real input events (CDP touch / mouse / keyboard, never synthetic DOM clicks) and read back from the page's read-only debug handle; the COMMAND column is the host acknowledgement line (`✓`) written by the page's own log. INTERACT: the field always publishes a prompt (INCOMING fixture) so the "nothing nearby" state cannot occur in the field room; the button label shows the current prompt ("E · nothing nearby" when none) and the code path toasts NOTHING TO INTERACT WITH HERE when no prompt exists.

## 4 · COLORED CHARACTER SOURCE

- Source: `RAW_10_MODELS/Mah_Athlete_M.glb` (sha256 7b023694ea924b86128ff2e1ae3b64157491c1d5b11805b9d4d2b68131592b63; identical to WORKING_10_MODELS and Astra's starting copy; Tripo export; one mesh, 12,863 triangles, faces +Z, no skin / morph / animation). The Astra head / eye cleanup (AM08 retained base, AM19 in progress) has NO export, so it is not included — stated in the manifests.
- Derivatives (isolated, CANDIDATE, unapproved, never presented as the finished Athlete):
  - `26_LOCAL_AUTHORITY/lab/assets/athlete_m_preview/dev_0.2/Mah_Athlete_M_rigged.glb` — 12,016,216 bytes, sha256 1f3fbc345bee0557cc35354701e3e3d7ba8948e810159be440aaec4ee2346a63; authentic base-colour + normal JPEG textures (8192²) kept, material `ATHLETE_M_SOURCE_PBR`, uniform silhouette override removed; 17-joint derivative skeleton + skin weights added by `lab/assets/make_athlete_m_rigged.mjs`. Selectable with `?avatar=ATHLETE_M_RIGGED_8K`.
  - `dev_0.3/Mah_Athlete_M_rigged_mobile.glb` — 2,556,156 bytes (21 % of dev_0.2), sha256 303a7ad3946aed7c28a72d509a399f2f542bfd0f1396d7852020a4c5e3472afd; same geometry / skin / material, textures resampled in headless Chrome to 2048² (base colour q0.86, normal q0.90) by `lab/assets/make_athlete_m_rigged_mobile.mjs`; JPEG decode 30 + 25 ms instead of 282 + 309 ms. **Default avatar** (`ATHLETE_M_RIGGED`). Fine crystal micro-detail present at 8192² is softened.
- Renderer verification (`matInfo()` hook): mesh `ATHLETE_M_BODY`, SkinnedMesh, 17 bones, `MeshStandardMaterial` with `map` (sRGB colour space) and `normalMap` bound, colour #ffffff (no tint), attributes position / normal / uv / skinIndex / skinWeight. Screenshots: `evidence/play/skinned_probe/01_idle_front.png` (bronze / graphite colour zones, crest, gradients), `04_run.png`, `12_attack_startup.png`, `14_emote_WAVE.png`; sky + character: `evidence/play/sky_probe/02_pitch_0.15.png`.
- Eyes: verified at close range in the renderer (`evidence/play/face_probe/face_close_front.png`, camera 0.5 m from the face): the head has sculpted sockets, nose and mouth but NO eyes — no eye geometry and no painted sclera / iris (uniform graphite base colour). Blinks and eye gaze are therefore impossible on this asset without faking; nothing was faked and no overlay was added. The alive layer re-aims the head / neck instead. Eye work (AM19 repair / eye geometry with lids) is Astra's, requested in the handoff.
- Reuse check (read-only sweep of both trees): no reusable rig, skin, clip, FBX / BVH / VRM or Reallusion asset exists for Athlete_M (all class GLBs are single static Tripo nodes; the only authored armature is Athlete_F's legs-only 11-bone DL_RIG bound to split-shin geometry; 0 / 29 contract clips authored; Character Creator not installed, iClone Personal with unverified FBX export, AccuFACE trial). The derivative rig is the only working path.

## 4a · CHARACTER CONNECTION (addendum: "finish and connect the correct Athlete")

- Handoff followed: `ASTRA_VISUAL_CLEANUP/ATHLETE_M/00_REPORTS/ATHLETE_M_RESUME_STATE.md` → RETAINED BASE = `02_CHECKPOINTS/AM08_BASE_CLOSED_RETAINED.blend` (sha256 6a6404c99722df70fdd5bfd07cd9b655c5cb4e114a227987be4fdfbdc6139cc5). `13_HANDOFF_EXPORTS/` is EMPTY (no exported GLB); AM09–AM19 checkpoints are all `_NOT_RETAINED` (AM18 eye/lid failed, AM19 not launched). So the latest fully saved candidate available is AM08, and its usable exports are its textures.
- Runtime copy: **`26_LOCAL_AUTHORITY/lab/assets/athlete_m_preview/dev_0.4/Mah_Athlete_M_am08_rigged.glb`** (export_id `ATHLETE_M_AM08_RIGGED`, 2,627,468 bytes, sha256 4e3926eec4a789e865f59ec544780516f6dbdae018a5595b9bd5da46564f6850), built by `lab/assets/make_athlete_m_am08.mjs` from dev_0.2 (rig) + read-only Astra exports: base colour `04_TEXTURE_WORK/AM08_RIGHT_FINGER_COLOR_FIX/Mah_Athlete_M_AM08_FINGER_COLOR_TEST_8K.png` (sha 8c118ed02e00464d…; GOLD_B + 5,870 finger texels), eye mask `04_TEXTURE_WORK/AM02B_EYE_SHAPE/Mah_Athlete_M_EYE_MASK_AM02B_GUARDED_8K.png` (sha 3366d380f6c6bb6f…), the source normal map; K3 eye treatment as glTF `emissiveTexture` + `emissiveFactor` (1, 0.3, 0.02) + `KHR_materials_emissive_strength` 3 with the dark-gold diffuse composited under the mask; roughness 0.5 / metallic 0. Verified in the renderer: `emissiveInfo()` → emissiveMap 1024², emissive #ff9527, intensity 3, base 2048²; screenshots `evidence/play/am08_probe/am08_front.png`, `am08_face_close.png` (glowing K3 eye accents, forehead crystal, GOLD_B zones), `am08_run.png`.
- Includes: AM00 geometry (unchanged source), AM02 K3 eyes, AM03 GOLD_B, AM06 material, AM08 finger fix. Excludes (not retained / no export): AM05 chest darkening, AM09 facets, AM10 trap silver, AM12–AM19 premium head, human-like eyes, eye seating, sockets, lids.
- Binding: the .blend was never opened (no Blender available; Astra's editable source untouched). Astra's AM03 / AM08 reports state the runtime geometry / UV / corner-normal snapshots exactly match the source, which is the basis for reusing the dev_0.2 skin vertex-for-vertex; a future retained checkpoint with changed geometry must be re-rigged on that export (`make_athlete_m_rigged.mjs`), never by index-copied weights. That geometry-equality statement is the one unverified dependency here.
- Exact remaining eye dependency: a retained, exported AM19-or-later result (eye geometry with lids / iris islands). The missing-eye finding (§4) applies to the Tripo source and to AM08 alike: K3 eyes are emissive accents with no geometry, so blinks and eye gaze stay unavailable; the alive layer re-aims the head / neck only.

## 5 · RIG AND ARTICULATED MOTION

- Derivative skeleton (`make_athlete_m_rigged.mjs`): ROOT · PELVIS · SPINE · CHEST · NECK · HEAD · CLAV_L/R · UPPERARM_L/R · FOREARM_L/R · HAND_L/R · TAIL1 · TAIL2 · TAIL3 (the fused lower body). Bind pose = identity at the source pose; skin weights = top-3 gaussian distance weights (σ 0.055) with anatomical region constraints (arms |x| > 0.118 for 0.36–0.86 H, torso band, axial chain); vertex counts per bone recorded in the manifest (`weight_stats`). Not one bone: 17 joints, every visible body region weighted.
- `lab/RigAnimator.js` (new): layered procedural controller driven ONLY by the authoritative view — idle breathing (chest / spine / head sway), locomotion (spine + chest hinge forward, arms slightly extended behind, tail propulsion; backward glide = backward hinge with arms forward), turn twist, brake settle, flight (forward inclination, arms back, ascend / descend variants, hover bob), directional dashes (upright torso, complementary bent arms, leading hand near the chin; forward / back / left / right), per-pattern attacks (PUSH / PULL / HINGE / ROTATION anticipation → release → settle from the host cast phase + progress; SPECIAL cast with both hands; class presentation style scales amplitude), guards, hit recoil (`hit_ago_s`), emotes, transformation phases, KO. Bones slerp toward the layered target at a state-dependent rate (7–30 /s).
- Effects bound to bones: hand glows on HAND_L / HAND_R, seam ring on PELVIS, propulsion emitters on TAIL3; ground contact flash / floor ring unchanged (impact only).
- Deformation check (screenshots + bone read-back `mePose().bones`): run lean SPINE 0.17 / arms 0.31 back / TAIL −0.18; flight UPPERARM 0.78–1.14 back; dash-left UPPERARM_L z 0.58; guard PHYSICAL forearms −2.15; attack PA_PUSH chest yaw −0.49 wind-up; WAVE UPPERARM_R z −2.51 with head turn; READY forearms −1.9. Skin stretching is acceptable at the shoulders / elbows in the tested ranges; the crotch / tail region shows mild pinching in the deep curl (see limits).
- Timing stays host-authoritative: the animator reads phases, never sets them.

## 6 · FUSE / SEPARATE SEQUENCE

Host: unchanged (`TRANSFORM` → mahloco UNFUSE_ENTER … / REFUSE_ENTER …, non-cancellable, cost, KO handling). Presentation per `15_RUNTIME_DESIGN/TRANSFORMATION_SEQUENCE.md` rev 2 with the placeholder durations from `runtime_config.default.json`:
- UNFUSE: ENTER (0.05) → CURL (0.25: upright fetal-like curl — spine 0.85, tail 1.0 up, arms wrapped, central emitter 1 → 0.3) → CHARGE (0.6: held curl with fine tremor, seam ring 0 → 1) → BURST (0.12: commit — body opens, seam 1, central 0) → STAR (0.18: arms spread wide, tips 0 → 0.5, seam fades) → RECOVER (0.3) → SPLIT_IDLE (propulsion on the tips).
- REFUSE: ENTER (0.05) → KNEES_UP (0.2: lower body pulled up fast, torso upright) → ALIGN (0.15: micro-adjust) → SNAP (0.08: commit — flash 0.35, lower body drops into place, central emitter returns) → RECOVER (0.25) → FUSED_IDLE.
- Verified in `evidence/play/skinned_probe_transform/` (t00…t15 + r0…r8 bone / seam read-back every 100 ms, screenshots t03 curl+seam, t06 star, r2 snap). Duplicate taps: the HUD refuses a second SEPARATE / FUSE while `transforming` ("ALREADY CHANGING FORM") and the host rule stays non-cancellable; closing the menu or releasing the finger never cancels (host-driven).
- **Missing assets, precisely**: contract roles `split_upper_mesh`, `split_leg_mesh_L`, `split_leg_mesh_R`, `packed_morph` (RIG_RUNTIME_CONTRACT.md) do not exist anywhere (04_SPLIT_MODULES, 06_RIG_PROTOTYPE empty; 05_TRANSITION_MODULES / 08_STATIC_POSES contain PNG references only). Therefore the STAR / SNAP form change cannot separate or rejoin legs: the fused lower body performs the motion and the SPLIT form is the fused mesh with propulsion moved to the tips. No holes, membranes, mesh swaps or duplicate limbs are faked. OPEN line appended to the ledger.

## 7 · WAVE / EMOTES / GUIDE

- Emotes: WAVE (shoulder → elbow → wrist → hand oscillation, head turn, clean return), NOD (head + neck), READY (confident bent-arm stance) — registered on the host beside WAVE (`PlayMode.js`, cosmetic, same eligibility / interruption, 1.0 s dev cooldown keys in `00_CORE/dev_tuning.dev.json`), snapshot adds `emote_at`. EMOTES tab in the MORE sheet; refusals are shown with the host reason.
- Alive idle layer (`RigAnimator.js`): ribcage / spine breathing with a per-breath re-drawn period (1.35–2.05 s), relaxed shoulders and soft hands, occasional head / neck re-aims (2.5–7 s apart, mostly small, no constant scanning), restrained posture / hand / shoulder variations 6–14 s apart with eased in / out, all seeded per character (no synchronised twitching), all yielding to actions through the `calm` factor (drops within 0.3 s of any action / movement). Verified: `evidence/play/alive_probe/alive_series.json` (chest −0.009…+0.019 rad, breath periods 1.35 / 1.67 / 1.75 / 1.84 / 1.96 / 2.04 s, head yaw re-aim −0.037, HANDS variation observed). Face: calm resting expression from the sculpt; no eyes on the asset (see §4), so no blinks / eye gaze and no overlays.
- Guide: six steps (MOVE · LOOK · LOCK ON · ATTACK · DASH/FLY/FUSE · MORE) with a gesture glyph per step and touch / mouse text variants; real BACK / NEXT / SKIP / GOT IT controls; reopened from MORE → GUIDE. Verified navigating 0 → 2 → 1 → closed by real taps.

## 8 · 4/2/2 LOADOUT

Host (`RulesField.js`, `PlayMode.js`, `Protocol.js`, tests): intent `RULES_LOADOUT { category|mode, slot, skill_id|null }`; ONE canonical tunable `rules_17_23.dev.json` `_runtime_mapping.loadout_capacity { PHYSICAL: 4, PHYSICAL_MAGIC: 2, SPECIAL_MAGIC: 2 }`; defaults per class = 4 pattern strikes / first 2 PM candidates / first 2 of the class quick list; validation reasons `BAD_LOADOUT_REQUEST`, `BAD_MODE`, `BAD_CATEGORY`, `IN_ROUND`, `BAD_SLOT`, `BAD_SKILL`, `WRONG_CATEGORY`, `NOT_FOR_CLASS`, `NOT_ELIGIBLE` (LEVEL_BAND / LOCKED), `DUPLICATE`; empty slots valid; journal `R1723_LOADOUT`; re-validation at level fixture / class change; casting an unequipped skill refused `SKILL_NOT_EQUIPPED`; a cast in flight keeps its frozen metadata (tested). Snapshot `rules.me.loadout[category] = { capacity, equipped[], equipped_count, pool[{skill_id, name, eligible, reason, equipped_slot, …}] }`; `rules.me.skills[category]` = equipped in slot order.
HUD: dock buttons show `n/cap`; drawer shows equipped moves + "◇ empty slot"; LOADOUT tab lists slots per mode, tap a slot → eligible / locked pool with reasons, tap a move → `RULES_LOADOUT`, confirmed by toast ("EQUIPPED Infused Hinge Rise · PHYSICAL MAGIC slot 2") and the re-rendered slot; "leave slot empty" → null. Verified end-to-end with real taps: PM slot 2 PM_PULL → PM_HINGE → empty (dock 1/2, drawer 1 chip) → PM_PULL; server refusals DUPLICATE / BAD_SLOT. Tests: `16_TESTS/gameplay_loadout_422.test.mjs` 16/16.

## 9 · SKY / MOON

`lab/fieldScene.js` builds a night sky inside the existing group (disposed by `clear()`): 2,860 stars (two point clouds), 14 drifting blue / violet dimensional-cloud sprites in one batch, 3 distant cloud-skyland silhouettes on the horizon (scenery only, no collider, 250–370 m inside the far plane), a large cratered moon (procedural 512² canvas: 26 shaded craters + 90 small, maria, limb darkening) with a halo, placed ahead of the spawn view at ~5° elevation so the upper half is in frame at the default third-person pitch and the whole disc at pitch ≤ 0.25. +6 draw calls (50 → 56), 4 small canvas textures, lighting / ground / colliders unchanged, 0 page errors. Evidence: `evidence/play/sky_probe/*.png`.

## 10 · RUNTIME VIDEO

Recorded in-page from the real runtime (CDP screencast of the whole page including the HUD, replayed at the captured timestamps onto a canvas and encoded by MediaRecorder VP9 in headless Chrome — no ffmpeg exists on this machine). Character on screen: **dev_0.4 ATHLETE_M_AM08** (Astra's retained AM08 colours + K3 eyes on the derivative rig).

| file | size | length | frames / fps | layout |
|---|---|---|---|---|
| `26_LOCAL_AUTHORITY/evidence/play/video_desktop1440/video/mahworld_demo_desktop1440.webm` | 9080784 bytes | 110.8 s | 1153 / 10.4 | desktop 1440×900, mouse |
| `26_LOCAL_AUTHORITY/evidence/play/video_portrait/video/mahworld_demo_portrait.webm` | 13964185 bytes | 93.6 s | 2359 / 25.2 | phone portrait 390×844, emulated touch |

Chapters (`video/marks.json`, stills `still_00…13.jpg` next to each file): 0 s close view — breathing ribcage, relaxed shoulders, calm face, head re-aims · idle · run forward → stop (spine / chest lean, arms back, brake settle) · backward glide (backward hinge) · take-off, forward flight (inclination), landing · dashes left / right / forward / back (upright torso, bent arms, leading hand near the chin) · PHYSICAL attacks (four movement patterns, wind-up → release → settle) · PHYSICAL MAHGIC (hand-bound glow) · SPECIAL MAHGIC (both hands) · guards + incoming hit reaction · SEPARATE (curl → charge with seam glow → burst → star → recover) and FUSE (knees up → align → snap) · emotes WAVE / NOD / READY · MORE sheet → LOADOUT → EMOTES → GUIDE by real taps → dock handle collapse / reopen.
What the footage does NOT show, plainly: leg separation (the SPLIT form is the fused mesh with propulsion on the tips — no split geometry exists), blinks or eye gaze (K3 eyes are emissive accents without geometry), authored clips (all motion is procedural on the derivative bones). The frame rate is the software renderer's (10–25 fps), not a device measurement.

## 11 · PERFORMANCE / VERIFICATION

Measured on THIS machine in headless Chrome with the swiftshader software renderer (no GPU) — an upper bound on cost, not a phone number.

| layout | frames | avg frame ms | max ms | frames > 50 ms | draw calls | triangles | textures | programs |
|---|---|---|---|---|---|---|---|---|
| desktop 1440×900 | 1413 | 80.4 | 766.7 | 1203 | 46 | 31142 | 11 | 11 |
| portrait 390×844 | 2448 | 39.2 | 766.6 | 156 | 38 | 30140 | 11 | 11 |

Mobile load size: default avatar dev_0.4 = 2,627,468 bytes (2048² base colour JPEG 972 KB + 2048² normal 682 KB + 1024² eye mask 8 KB + 1.0 MB geometry/skin); demo package 124 files / 7.5 MB total (`deploy/build_demo_package.mjs`, private-content scan clean). Deformation cost: one SkinnedMesh, 17 bones, 12,863 triangles (GPU skinning); the animator's per-frame JS cost was not measured separately. Sky: +6 draw calls.

Host suites (plain node, from CLAUDE_GAMEPLAY_RUNTIME): loadout_422 16/16 · rules_17_23 60/60 · attack_stack 22/22 · od29_disconnect 26/26 · phase5a 46/46 · phase5b 46/46 · play_sample 97/97 · phase4_1 33/33 · phase4 85/85 · runtime 125/125 · asset_slot 11/11 — no pre-existing failures.

Browser regressions after all changes (headless, real input events, 0 page errors each): `--controls` portrait 32/32 + MORE 8/8 (focused rerun with no competing CPU jobs — the three earlier portrait failures (attack cast, guard MAGICAL, unlock) did not recur; their earlier failure coincided with concurrent CPU-heavy jobs and is recorded, not explained away), desktop1440 35/35 + MORE 6/6, small 32/32 + MORE 8/8; `--phone` portrait and landscape (two-finger hold + swipe, cancel, rotation, stick) 0 errors (`phone_portrait_demo2`, `phone_landscape_demo2`); `--dock` desktop1440 0 errors; `--pass3` desktop 0 errors (camera-relative movement, lock-on, collisions, harmless free-roam attacks); `--rules` desktop 0 errors (rules 17–23 visible controls, class rules, energy separation). Host suites listed above (OD-29 26/26, 5B deterministic recovery 46/46). Not run: nothing was skipped from the requested set; no physical phone was used.

Emulated-touch evidence is NOT a physical-phone acceptance pass: frame times above come from headless swiftshader software rendering (avg 60–110 ms) and say nothing about a phone GPU; only the owner's phone can accept.

## 11a · WORKING vs UNFINISHED ANIMATION (addendum checklist)

Working (procedural on the 17-joint derivative rig, verified in footage and bone read-back): idle breathing with varied period · relaxed shoulders / soft hands · head / neck re-aims · restrained posture / hand / shoulder variations (seeded, non-synchronised) · acceleration lean, turn twist, brake settle · fused forward travel posture · backward glide hinge · take-off, forward flight inclination, ascend / descend arms, landing settle · four directional dashes · PUSH / PULL / HINGE / ROTATION attack anticipation → release → recovery driven by the host phases · SPECIAL casts (both hands) · guards PHYSICAL / MAGICAL · hit recoil · KO · WAVE (clavicle → shoulder → elbow → wrist → hand), NOD, READY · UNFUSE / REFUSE phase choreography with seam / propulsion timing.
Unfinished / unavailable: leg separation and rejoining (no split geometry — the STAR / SNAP phases move the fused lower body; SPLIT form = fused mesh + tip propulsion) · blinks and eye gaze (no eye geometry; K3 accents only) · authored clips (0 / 29) · separated-form locomotion gait (no legs) · hand finger articulation (single HAND bone per side) · normal-strength-0.25-inside-eye-mask detail of K3 not reproduced.

## 11b · PORTRAIT-CONTROL RESULT

Focused rerun after the CPU-heavy jobs finished: `controls_portrait` 32/32 controls OK, MORE 8/8 conditions OK, 0 transcript errors. The three earlier portrait failures (attack cast not registered, guard MAGICAL state, unlock) had occurred while other headless-Chrome and analysis jobs were running; they did not recur in the isolated rerun, and the folder holds the latest run only (the driver overwrites `--out`); the earlier failing rows (attack cast not registered, guard MAGICAL still PHYSICAL, unlock still locked) are recorded here verbatim from that run's console output. This is emulated touch, not a physical-phone pass.

## 12 · REMAINING BLOCKERS

1. Split anatomy: no `split_upper_mesh` / `split_leg_mesh_L/R` / `packed_morph` geometry exists — leg separation and rejoining seams need authored geometry (Astra). Blinks / gaze: no eyelid or eye geometry.
2. The derivative auto-rig is a development rig (distance weights): mild pinching at the tail / crotch in the deep curl and at extreme shoulder angles; a reviewed skin from Astra replaces it through the same slot.
3. Owner review: both derivative assets are CANDIDATE; the Astra head / eye cleanup (AM19) has no export.
4. Physical-phone acceptance not performed here (no phone in this session); LAN launcher unchanged for the owner to test.
5. Hosting: password-gated backend hosting prepared earlier (Dockerfile / package / README) remains NOT deployed — Netlify cannot run the host, the site source is not local, no password was supplied. Nothing was provisioned.

## 13 · HOSTING / LOCAL LAUNCHER

- Launchers unchanged: `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\START_MAHWORLD_RULES_17_23.cmd` (sha256 35a1d513…, desktop) and `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\START_MAHWORLD_PHONE_TEST.cmd` (sha256 4f61bab4…, `--lan`, same-subnet guard, prints the phone URL). The page now defaults to **dev_0.4 ATHLETE_M_AM08**; `?avatar=ATHLETE_M_RIGGED` (dev_0.3 source colours), `?avatar=ATHLETE_M_RIGGED_8K` (dev_0.2), `?avatar=STAND_IN` remain selectable.
- `/mahworld` prep preserved: `deploy/build_demo_package.mjs` now also ships `dev_0.3/Mah_Athlete_M_rigged_mobile.glb` (the 12 MB dev_0.2 stays local); `--demo` gate, `--base-path`, Dockerfile and README untouched.

## 14 · FILES · HASHES · ROLLBACK

Checkpoints: `26_LOCAL_AUTHORITY/evidence/checkpoints/complete_2026-09-15_before/` (pre-pass originals + SHA256SUMS; reconstructed for PlayMode.js / dev_tuning / lab_host_server by reversing the exact patches) and `…_after/` (post-pass copies + SHA256SUMS). Rollback = copy a `_before` file back over the live file.

| file | before (sha256 prefix) | after |
|---|---|---|
| lab/gameHud.js | e0bd9eb9682c73a6 | 265da30f80370d19 |
| lab/play.js | 65ef7019c583a5d8 | 6b73028244233c1c |
| lab/play.html | 4536557197c1c673 | 52ae9c2d23ed492b |
| lab/PresentationAdapter.js | 60af608c35990673 | fb9e643928c133fc |
| lab/GlbCharacter.js | d11bd7bd36e3e5c2 | ef2f2373a5cbd797 |
| lab/RigAnimator.js | — (new) | a873941e2996eb7c |
| lab/fieldScene.js | 901b25789a1c3416 | 0a3e2427f2a2b90d |
| lab/touchControls.js | 2cf24d5727f6bf2e | 4d484ca87784e747 |
| lab_host_server.mjs | 45c8d49454d9a18f | ed22663b9800fcb1 |
| play/PlayMode.js | 201b9b8ee8f4479e | 3870ff22b5069ef5 |
| Protocol.js | 15461c164e207aee | 56d321e937b524d2 |
| play/rules1723/RulesField.js | f585974d5cd60314 | c63dfe7e65eab300 |
| play/rules1723/rules_17_23.dev.json | cc381f042be0dbb7 | 3169ccaa6086a484 |
| 00_CORE/dev_tuning.dev.json | f7a3c34aa0459fd3 | e99213f39a4fc6e1 |
| evidence/play/cdp_playtest.mjs | 5e5e2e7bba8dedcf | 211a68265e380344 |
| deploy/build_demo_package.mjs | e7dcdab0a6ad3af6 | f1aebedc32e4675c |
| lab/PRESENTATION_ADAPTER_CONTRACT.md | 50ff355e910f3e39 | 9a39161bdd65fd20 |
| COMMAND_AUTHORITY_CONTRACT.md | 79eb34aab82372a7 | 3f1f073b1acc4dac |
| 16_TESTS/gameplay_attack_stack.test.mjs | d64363b64100593c | c66316fdae419c1a |
| 16_TESTS/gameplay_rules_17_23.test.mjs | 9236d01c… | 926cfe6705cedae2 |
| CLAUDE_GAMEPLAY_FOUNDATION/…/GAMEPLAY_OPEN_DECISIONS.md | 7ddd052aeab092df | ef6e8b74c53adcd5 |
| START_MAHWORLD_RULES_17_23.cmd / START_MAHWORLD_PHONE_TEST.cmd | 35a1d513… / 4f61bab4… | unchanged |

Assets (new, never copied into checkpoints because of size; sums in `_after/SHA256SUMS`): dev_0.2 `Mah_Athlete_M_rigged.glb` 1f3fbc345bee0557…, dev_0.3 `Mah_Athlete_M_rigged_mobile.glb` 303a7ad3946aed7c…, **dev_0.4 `Mah_Athlete_M_am08_rigged.glb` 4e3926eec4a789e8…** (generator `lab/assets/make_athlete_m_am08.mjs` 657e29a4…). Rigid dev_0.1 untouched. RAW / WORKING / Astra folders untouched (read-only reads of two exported PNGs and one sha256 of the retained .blend).

New files: `lab/RigAnimator.js`, `lab/assets/make_athlete_m_rigged.mjs`, `lab/assets/make_athlete_m_rigged_mobile.mjs`, `lab/assets/athlete_m_preview/dev_0.2/*`, `dev_0.3/*`, `16_TESTS/gameplay_loadout_422.test.mjs`, evidence folders `evidence/play/skinned_probe*`, `sky_probe`, `controls_*`, `video_*`, this report.

## 15 · THREE BABY STEPS TO PLAY

1. Double-click `START_MAHWORLD_RULES_17_23.cmd` (desktop) or `START_MAHWORLD_PHONE_TEST.cmd` (phone on the same Wi-Fi; open the printed `http://<pc-ip>:<port>/lab/play.html?…` on the phone).
2. Read the six-step guide (NEXT / GOT IT), then: left thumb = move, right drag = look, top-right = pick a mode and a move, HOLD ATTACK + swipe the arrow.
3. Tap MORE for PRACTICE BATTLE, SEPARATE / FUSE, LOADOUT (4 / 2 / 2) and EMOTES; tap outside any panel to close it.
