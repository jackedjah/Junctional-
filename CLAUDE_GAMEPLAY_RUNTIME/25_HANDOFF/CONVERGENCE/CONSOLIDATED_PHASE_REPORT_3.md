CONSOLIDATED PHASE REPORT 3 — master §20.5 form · 2026-09-19 00:55 UTC · gameplay / demo lane · answers the owner's C2 REVIEW ("retain the repair, verify the remaining boundaries", items 1–5)

WORK PACKAGE / CHECKPOINT:
  Item 1 G37 appearance gate RUN AND PASSED on the repaired hold (labelled virtual-support / hovered pointed-end drift; no floor contact claimed) · item 2 camera ownership through a room change VERIFIED (FOLLOW stays FOLLOW, MANUAL ORBIT stays ORBIT with its angle; no silent recentre) · item 3 P8 status separated below, gameplay views of the gym hall and both shops captured, warm-load preparation separated from fade duration · item 4 botany untouched at the prototype gate · item 5 combat questions printed in chat (no already-approved answers found in the references), clean C2 artifact line below.
  Checkpoints (master, linear, nothing reset): 3a1c6d5 (P8) → d2a1004 (report 2, docs) → cbc99b7 (THIS code: camera ownership + G37 sequence gate + interior gameplay views) → this report (documentation only). C2 preserved (ZIP + draft 6aadbeca… untouched). C1 preserved.

CURRENT JOB PRESERVED:
  C2, C1, the live deployment (6aac25101f17ce5ed37166e4, https://mahdemo.fob.systems), the rollback (6aab65567e997ae33c1da204) and the continuation are untouched. P0 not restarted; the unified master not rewritten. No model change, purchase, install, protected-source edit or Blender launch (slot still RESERVED). The three-tree verdict, the phone experience and the interior visual approval remain NOT approved.

ACTUAL WORKTREE / BUILD / ASSETS:
  Repo C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS (git master) · packaged source commit cbc99b7 (clean) · build stamp 2026-09-19T00:41:36Z · 109 files · athlete dev_0.14 (ATHLETE_M_V9) · protected sources unchanged · three.js 0.185.1 vendored · R170 still ABSENT.
  Changed runtime files (cbc99b7): lab/play.js (camRoomChange, hidden field during interiors, matched interior light signature, warm room environment, motionTrace world positions, rigInfo / camOrbit dev hooks), lab/fieldScene.js (setHidden / roomEnvironment / probeSolids), lab/interiorScene.js (light signature, shadows option); probes deploy/probe_interior.mjs (K1–K3, phase timings, gameplay views, weapon shop), NEW deploy/probe_gait_sequence.mjs; tests 16_TESTS/gameplay_g37_contact (10), gameplay_interior_entry (24); evidence motion_e/g37_sequence_*.{png,json}, interior/int_*.png + probe_interior.json.

WHAT I DID:
  1. G37 (item 1). Kept the world-space hold exactly as repaired. Built the normal-speed appearance sequence probe (side MANUAL LOOK; idle → start → walk → 180° turn while walking → stop → run → brake → FUSE → SEPARATE) on the separated form and checked the four things the review named: knee flip (min forward knee offset L 1.2 / R 1.2 cm, threshold −1.5 cm, 0 flips), overextension (max hip→pointed-end / leg length 1.000 / 1.000, threshold 1.005, 0 frames), leg snap (no thigh / shin angular velocity above steady-walk p99 × 2.5 = 38.6 rad/s anywhere, incl. the 19 hold engage / release frames), abrupt release (pointed-end speed in the frame after each release ≤ 10.4 m/s vs 2.5 × body 6.71 m/s; a swinging tip naturally runs near 2 × body speed), FUSE → SEPARATE with the hold inactive. 7/7. The old result (PASS 5 pelvis-frame hold 41.31 / 21.87 cm, measured the same way) and the same-candidate plant-on/off comparison are preserved in motion_e.json.
     Corrected measurement: the first run failed S2 at ratio 1.178 because the probe took its leg length from the LAST "THIGH_L" bone in the scene (the field holds ten class rigs with different knee heights) with the dev_0.13 pointed-end offset (0.054 m). The local figure's rig (new P.rigInfo('me')) is thigh 0.237 m + knee→pointed end 0.735 m = 0.972 m, with the pointed end 0.202 m below the TIP joint — the same END the hold and the trace use. This changed the PROBE only; the animator was not retuned.
  2. Interior camera (item 2). The transaction never calls camReset: camRoomChange() re-expresses the FOLLOW target under the curtain (the room's facing replaces the door's) and keeps a MANUAL ORBIT with its angle relative to his back. Recorded mode before entry / after reveal / after exit: FOLLOW → FOLLOW → FOLLOW (K1); ORBIT −72.7° → ORBIT −72.7° inside (K2); at the doorway ORBIT 107.6° → ORBIT 107.6° after the exit (K3; the doorway value differs from the entry value because the orbit is world-fixed (O1) while he turned round inside — that is the preserved behaviour, not a reset). Reveal placement is collision-safe through the ordinary boom probe against the wall solids (E7) — no forced mode change, no automatic recentring added.
  3. P8 (item 3). Warm-load preparation vs fade: fixed fades 220 + 220 ms; host acknowledgement 1–2 ms; scene preparation 138–285 ms (field HIDDEN not disposed, interior light signature = field's (3 directional + hemisphere, shadow + fog present) so no shader recompiles, room PMREM pre-built at warm-up); exit 4–7 ms; the 350 ms stage line never shows on the warm path and no progress figure exists anywhere. Ordinary gameplay views captured (rear camera, walking): gym platform (int_04b), gym racks (int_04c), clothing shop floor (int_10b, portrait), weapon shop floor (int_15, portrait) — finished spaces, zero merchandise; no products, prices or weapon mechanics added.
  4. Botany (item 4). Nothing changed: no scatter, no old-plant replacement; Packet C images reused as they are.
  5. Owner handoff (item 5). References checked (MAHWORLD_CONVERGENCE_REFERENCES 01_CURRENT_DECISIONS O1–O10, archive ORIGINAL_SPECS_A_H §G, OWNER_DECISIONS_C2, RULES_17_23 packet): no answer exists for any `?` cell, for Vector Shot / BLOCK BREAK, or for the proposed defaults — Spec G itself says "pattern chosen by Jah". The table is printed in chat unchanged.

WHAT I FOUND:
  - The G37 repair holds through the whole ordinary sequence; the appearance gate is measured, not claimed. What it does NOT complete: the separate motion-asset requirement (Spec F: no clip exists; RigAnimator is procedural) and the reference-walk requirement (U04 / EXT-11: no owner-approved reference walk has been matched) — both stay OPEN.
  - The room change was already mode-preserving in code (camRoomChange); the review's question is now answered by recorded evidence rather than by reading the code.
  - Athlete_M's pointed end is 0.20 m below the TIP joint (the dev_0.13 value 0.054 m was stale in the probe only). Every G37 number in reports 1–2 was produced by the trace, which used the measured value — they stand.

RESEARCH BASIS:  unchanged from report 2 (no new links opened; no third-party content used as an implementation prompt).

RESOURCE USE:
  dev_0.14 rig + three.js 0.185.1 → in-page motion trace (world positions) → probe_gait_sequence → g37_sequence_record.json (RUNTIME_INTEGRATED) · headless Chrome (GPU) → probe_interior 22/22 → probe_interior.json + stills (RUNTIME_INTEGRATED) · netlify-cli → draft only (no live change) · no mocap / retarget / Tripo / Blender use.

EVIDENCE:
  inspected:            plantPass reach definition, GlbCharacter tipExtLocal, adapter bone map (body skeleton first), camRoomChange / enterTransaction paths.
  runtime rendered/measured (CURRENT-CANDIDATE REGRESSION on cbc99b7, headless Chrome GPU): gait sequence 7/7 (numbers above) · motion_e 12/12 unchanged (walk median 0.24 / max 0.95 cm; run 0.30 / 1.93 cm; rollback 41.31 / 21.87 cm) · interior 22/22 (enter phases 220 / 1 / 138–285 / 220 ms; K1–K3; C1–C3; F1; S1) · suite 34 files / 516 checks / 0 failures · package stages 1–7e PASS.
  reusable prior evidence: PASS 1–4 records on 4f7aadd as listed in P0_REGISTER_RECONCILIATION.md — not re-run.
  emulated device:      iPhone-portrait 390×844 @ DPR 2, touch emulated (shops, HUD). Never a physical phone.
  physical phone:       NOT tested by agent.
  Jah's actual verdict or PENDING:  PENDING — Packets A + B (phone) and Packet C (tree) on the C3 draft; interior visual approval; decision (c). (Jah's later message reports genuine improvement on the correct build, especially the separated-leg shape — recorded as an improved verdict, NOT approval of every feature.)

P8 STATUS (kept separate):
  implementation:        DONE (confirm → curtain → host → readiness → reveal; duplicate refused; failure recovers; slow stage line; field hidden; camera mode preserved).
  harness results:       22/22 desktop + portrait touch-emulated, incl. fault injection and repeat entry.
  remaining device cases: screen rotation mid-transaction, OS backgrounding / tab discard mid-transaction, real finger on a physical phone — NOT RUN.
  interior visual approval: PENDING Jah (int_04b / 04c / 10b / 15 + sheet_gameplay_interiors.png).

OPEN RISKS / ART DEPENDENCIES:  unchanged (Spec F clips, reference walk, tree verdict, phone verdict, Blender slot); plus the owner's new 2026-09-18 assignment (connected motion / granular MAHGIC / training room / tap-to-move) — reconciled next, in its own document, without reopening this checkpoint.

ZIP:
  C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\CLAUDE_GAMEPLAY_RUNTIME\26_LOCAL_AUTHORITY\deploy\packages\CONSOLIDATED_C3.zip · 28 823 680 bytes · 109 entries · SHA-256 161da1a3b6e729de569912573dc06488e57c95f5df9bc5c74a5f7dfe2e28b665 · packaged from commit cbc99b7 (clean; stamp 2026-09-19T00:41:36Z) · fresh extraction 109 files byte-identical · smoke 7/7 from the extraction · JS sweep clean · record CONSOLIDATED_C3.PACKAGE.json.
  C2 (clean line, for the record): CONSOLIDATED_C2.zip · 28 821 418 bytes · 109 entries · SHA-256 9d9e28837fc0ead91a12d8ee084b038f07e03b8c768ea801e53b54edd436d337 · producing commit 3a1c6d5 (d2a1004 after it is documentation only) · draft 6aadbeca4eab6fe0af3bd0df.

CANDIDATE / ROLLBACK:
  DRAFT https://6aaddb1fcf22df3c0f64b7d8--mahworld-test-preview.netlify.app (netlify-cli draft of the fresh C3 extraction; BUILD_INFO commit cbc99b7 pass CONSOLIDATED_C3; gate check: play 401 password page · asset 401 · BUILD_INFO 401 — unauthenticated-protection PASS; correct-password login NOT RUN). No live promotion. Rollback = the C2 draft / ZIP above; live unchanged.

NEXT:
  1. GATE (Jah): Packets A + B + C on the C3 draft; interior visual approval; decision (c) (table printed in chat).
  2. Independent (no gate): reconcile the 2026-09-18 enhancement assignment with the roadmap; then dependency order A → H (camera heading independence + gesture ownership + tap-to-move first).
  3. Nothing else is asked of Jah.
