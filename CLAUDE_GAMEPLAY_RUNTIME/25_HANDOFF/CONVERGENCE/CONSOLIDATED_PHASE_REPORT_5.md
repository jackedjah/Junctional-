CONSOLIDATED PHASE REPORT 5 — owner assignment 2026-09-18, §16 REPORT form · 2026-09-19 04:05 UTC · gameplay / demo lane · checkpoint after phase D (granular MAHGIC + casting anywhere). Phases A–C are in report 4; this report covers what changed since C4 and restates the identities.

CURRENT WORK PRESERVED:
  Worktree C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS (git master), linear: fcf553a (C) → 69c74dc (report 4) → f4e0fb3 (phase D) → this report (docs). Nothing reset; no second demo; C1–C4 ZIPs + drafts untouched; interiors, the hip repair, the camera / nav work kept. Build 111 files (42.5 MB), athlete default dev_0.15 (V10) with dev_0.14 (V9) shipped; ruleset 31 skills / 68 bindings (one ORIGINAL CANDIDATE added, nothing removed); three.js 0.185.1; Quarks not vendored (the dust system is the custom sprite / points path). Protected sources unchanged; Blender not launched. No purchase, install, subscription, credential or live action.

OWNER OVERRIDES APPLIED (superseded checks → replacements; full table in ENHANCEMENT_RECONCILIATION_0918.md §A.2 / §A.4):
  "NO_ATTACK_WHILE_FLYING / AIRBORNE cast refusal" → casting is location-independent; outcomes are height-aware (gameplay_play_sample assertion rewritten, gameplay_mahgic_anywhere added). "Athlete special pool of 3" → 4 (rules + loadout tests: the CASCADE candidate is in the pool, never equipped by default). "Tap on empty ground = nothing", rear-follow return, gym as destination: as in report 4.

CONFIRMED CAUSES (hypotheses separate):
  · Flight blanket locks: CONFIRMED in PlayMode.roomAttack / rulesCast and RulesField.cast (three explicit refusals) — removed; the genuine per-skill rule `requires_grounded` stays.
  · Fake hit marker on neutrals: CONFIRMED — a body strike touching a resident emitted a harmless IMPACT entity the client drew as a burst at the resident; now the entity carries `cause: NEUTRAL` and the client draws nothing on it (walls keep `cause: WALL`, a cosmetic dissolve).
  · Wave trail stretching under low frame rate: CONFIRMED during the probe (grain aging was frame-capped while the host advanced by wall-clock) — grains now age by wall-clock and the wave trail is hard-bounded to 3 m.
  · Hypotheses (not verified): none open for lane D beyond Jah's verdict on the look.

CHANGES (real files, purpose):
  play/rules1723/rules_17_23.dev.json — ATHLETE_CASCADE skill + FOUNDATION binding + PP_ATHLETE_ATHLETE_CASCADE profile; formation per profile (PA BODY / PM GATHER / VECTOR-TRACK WAVE / CASCADE CURTAIN); body_strike_vertical_reach_m 1.6, projectile_hit_height_m 1.4. play/rules1723/RulesField.js — height-aware body strikes / projectiles (entity y, wall probe at height), impact `cause`, presentation view carries formation / skill_id, cast view carries the aimed point. play/PlayMode.js — the two flight refusals removed. lab/rulesHud.js — projectile drawn at its height, NEUTRAL-cause impacts never mounted. lab/dustFx.js NEW — the granular crystalline-dust system. lab/PresentationAdapter.js — GATHER / WAVE / CURTAIN / BURST wiring, tight projectile kernel, faint hand-glow seat, restrained PHYSICAL puff, dust disposal on removal. lab/RigAnimator.js — an active attack takes the arms in flight. lab/play.js — dust tick per frame, dev hooks (dust / dustLive / boneWorld), my cast view carries the point. deploy/probe_mahgic.mjs NEW, deploy/probe_mahgic_closeup.mjs NEW; 16_TESTS/gameplay_mahgic_anywhere.test.mjs NEW; three test files updated for the superseded checks.

RESOURCE USE: dev ruleset (own JSON) → node edit → validated on load (68 bindings) → host + client (RUNTIME_INTEGRATED). three.js 0.185.1 → Points / BufferAttribute / CanvasTexture → dustFx (RUNTIME_INTEGRATED, probe 9/9). No mocap / Tripo / Reallusion / Blender / Quarks. Headless Chrome (GPU) → probes; netlify-cli → draft only.

NAVIGATION: unchanged since report 4 (probe_nav 21/21 on the C4 build; the nav code is untouched in f4e0fb3).
LOWER BODY: unchanged since report 4 (dev_0.15 default; probe_hip_connect 7/7 on fcf553a; the animator change in D only touches the flight ARM trail while casting).

ATTACK MATRIX (category × pattern × tier × state — Athlete only; other classes untouched):
  PHYSICAL: PUSH / PULL / HINGE / ROTATION — BODY_STRIKE, FOUNDATION band, complete pose arcs (S07), restrained contact puff; tiers = FOUNDATION only (progression cells `?` = owner decision).
  PHYSICAL MAHGIC: PUSH / PULL / HINGE / ROTATION — BODY_STRIKE with the GATHER language on the striking limb + contact burst; contact-based, no projectile (PUSH / PULL demonstrated and measured; HINGE / ROTATION inherit the same GATHER path, not yet shot).
  SPECIAL MAHGIC: VECTOR (WAVE front, projectile at the caster height), TRACK (WAVE, same path, not separately shot), SET (self buff, no offensive presentation), CASCADE PULL — ORIGINAL CANDIDATE (CURTAIN over the aimed area, PROVISIONAL balance, opt-in). VECTOR / TRACK patterns stay UNASSIGNED (Jah's decision); no ghost slots; no shared-ball duplicates; no multi-hit added; no unlock changed; capacity 4/2/2 unchanged.
  Gates: the `?` tier / exercise cells and the two pattern names (PASS_7_COMBAT_DECISIONS_REQUEST.md); the CASCADE balance; Jah's verdict on the dust language.
TRAINING ROOM: NOT STARTED (lane E, next). WORLD + HUD: NOT STARTED (lane G).

EVIDENCE:
  inspected:            RulesField cast / projectile / impact paths, adapter effect lifecycle, animator flight layer, GLTF-independent.
  rendered / measured:  probe_mahgic 9/9 (G1 gather ≤ 0.14 m anchored, no projectile; G2 body-only puff ≤ 24 grains; W1 wave head 0.00 m, front ≤ 0.04 m, trail ≤ 3.0 m, gone 228 ms after the entity, damage once; C1 curtain ≤ 0.11 m over the aimed dummy, top 3.3 m, impact formation CURTAIN, gone by 3.4 s; F1 cast at 8.8 m accepted, projectile at 8.88 m, still powered; P1 eight casts p95 20.3 / p99 24.2 ms, stalls 3 / 854 frames, 0 live effects after, pool ≤ 12; Z 0 errors) · gameplay_mahgic_anywhere 16/16 (incl. a strike from the air missing the ground dummy, a projectile from the air passing over it, the resident receiving nothing) · suite 37 files / 1 252 checks / 0 failures · package stages 1–7e PASS.
  emulated device:      none for lane D (desktop GPU Chrome only). physical phone: NOT tested by agent.
  Jah's verdict:        PENDING — the dust language (sheet_mahgic_closeup.png), the CASCADE candidate, casting in flight. Honest: the wave reads in motion; in stills at gameplay distance it is subtle; W2 (wall termination) is proven on the host path, the page probe skipped it for lack of a wall at the spot.

PACKAGE:
  C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\CLAUDE_GAMEPLAY_RUNTIME\26_LOCAL_AUTHORITY\deploy\packages\CONSOLIDATED_C5.zip · 28 966 378 bytes · 111 entries · SHA-256 488e57c4785a15986891b917769988838818589eb9c9ca5dc69a1f1e557d8419 · packaged from commit f4e0fb3 (clean; stamp 2026-09-19T03:51:31Z) · fresh extraction 111 files byte-identical · smoke 7/7 from the extraction · JS sweep clean · record CONSOLIDATED_C5.PACKAGE.json.

CANDIDATE + ROLLBACK:
  DRAFT https://6aae0732563b514ab3213f21--mahworld-test-preview.netlify.app (netlify-cli draft of the fresh C5 extraction; BUILD_INFO commit f4e0fb3; gate: play 401 password page · asset 401 · BUILD_INFO 401 · dustFx.js 401 — unauthenticated protection PASS; correct-password login NOT RUN). Self-contained; nothing points at production. No live promotion. Rollback = C4 (91a3cf12…, draft 6aadfab9…) / C3 / live 6aac25101f17ce5ed37166e4 unchanged.

NEXT (≤ 3 owner actions; independent work continues):
  1. Jah (phone, ≤ 3 steps, on the C5 draft): PRACTICE BATTLE on → tap PHYS MAHGIC E (Drive) at the dummy, then MAHGIC (Vector Shot) from a few metres, then in the LOADOUT sheet put "Cascade Pull" into a special slot and cast it at the locked dummy. Say "dust ok / more / less / wrong colour" — it is an original candidate.
  2. Jah (one look): 25_HANDOFF/CONVERGENCE/mahgic/sheet_mahgic_closeup.png and, from report 4, lower_body/sheet_hip_closeup_ab.png.
  3. Jah (only when lane F should go past the approved patterns): the combat `?` cells and the two pattern names (PASS_7_COMBAT_DECISIONS_REQUEST.md).
  Independent work continues: lane E (Training Room — GYM_DOOR reuse, a per-room rules field with an interior collider layout so the dummy runs on the real pipeline, tutorial steps, exit), then F, G, H.
