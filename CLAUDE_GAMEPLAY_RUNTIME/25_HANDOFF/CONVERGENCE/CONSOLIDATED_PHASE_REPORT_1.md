CONSOLIDATED PHASE REPORT 1 — master §20.5 form · 2026-09-18 20:20 UTC · gameplay / demo lane (existing Demo owner)

WORK PACKAGE / CHECKPOINT:
  P0 (current state and traceability) DONE · media + link review DONE · P7 botanical prototype BUILT (Packet C gate) · G20 label defect FIXED · P1–P6 evidence reconciled for reuse (not redone) · P8 / P9 NOT STARTED.
  Checkpoint: commits 0db888f (P0 ledgers) → 73b0da5 (P7 + G20) → this report's commit. Candidate CONSOLIDATED_C1 (below).

CURRENT JOB PRESERVED:
  The CONVERGENCE brief stood at the Cards A + B gate (draft 6aad2eeae…, commit f6b322b, tag convergence_card_b2) with three owner decisions open — a gate that permits independent work, so the consolidated phase started there without interrupting, restarting or forking anything. The prior roadmap (PASS 5 decision, PASS 7–9) folds into the master's P0–P9 in dependency order. No model change, no purchase, no install, no protected-source edit, no Blender launch, no live replacement.

ACTUAL WORKTREE / BUILD / ASSETS:
  Repo C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS (git master) · HEAD 73b0da5 (+ this report) · working tree clean after commit.
  Build 26_LOCAL_AUTHORITY/deploy/static_dist: BUILD_INFO built 2026-09-18T20:14Z · commit 73b0da5 clean · 107 files · athlete dev_0.14 (ATHLETE_M_V9, GLB sha256 7d217d0f…; V8 dev_0.13 kept for ?avatar=ATHLETE_M_V8) · nine residents v4 · new: lab/mahgicTree.js, lab/assets/botany/{tree_spec.js, prototype_v1.json}.
  Protected sources untouched: RAW_10_MODELS/Mah_Athlete_M.glb sha256 7b023694… (re-hashed by the reconciliation), ASTRA_VISUAL_CLEANUP read-only. Blender slot still RESERVED. three.js 0.185.1 vendored (unchanged). R170 fileset still ABSENT.

WHAT I DID:
  actual changed files and purpose
  · 25_HANDOFF/CONVERGENCE/ADDENDUM_QUEUE.md, CONTINUE_HERE.md — the queue record for the master + bundle (U01 / EXT-01); the new checkpoint and exact next actions.
  · 26_LOCAL_AUTHORITY/deploy/video_frames.mjs (new) — decodes an mp4 / webm in headless Chrome (no ffmpeg), seeks every N s + dense intervals, writes frames + timestamped contact sheets + a JSON of what was sampled (bytes never modified).
  · 25_HANDOFF/CONVERGENCE/MEDIA_REVIEW_LEDGER.md/.json (new) — all 13 bundle videos opened frame by frame (946 frames / 84 sheets; V01 in three timeline parts with 0.2–0.25 s sampling over the owner-cued intervals); 312 reviewer entries + 138 skeptic additions, EVERY entry marked CONFIRMED / OVERCLAIMED / NOT_VISIBLE / CORRECTED by a second agent that re-opened the cited frames. Kinds: 73 historical failures, 20 target qualities (V03), 82 appearance references, 29 tool-UI, 164 neutral context, 79 UNCERTAIN (kept as uncertain).
  · 25_HANDOFF/CONVERGENCE/SOURCE_LINK_LEDGER.md/.json (new) — fresh bounded retrieval of the three tcrf roots + the TikTok link + 23 technical pages; 19 links deliberately not revisited, each with its reason; statuses, examined sections, unexamined leads, hyperlink totals UNKNOWN where the article never came back.
  · 25_HANDOFF/CONVERGENCE/P0_REGISTER_RECONCILIATION.md/.json (new) — the 116 rows reconciled with the evidence actually on disk (every cited path re-checked; skeptic-corrected statuses) + a post-audit section for what changed in this session.
  · 26_LOCAL_AUTHORITY/lab/mahgicTree.js (new), lab/assets/botany/tree_spec.js (new), lab/assets/botany/prototype_v1.json (new) — the MAHGIC tree family generator, its authored definition (all numbers reversible) and the prototype placement registry (1 specimen + 6 cluster). lab/fieldScene.js — builds / places / ticks / disposes the family after the static merge (`?botany=0` off switch; `botany()` / `botanyEnergy()` read-outs). lab/play.js — `botany: params.get('botany') !== '0'`, VFX-off turns the tree energy off, dev hooks `P.botany()`, `P.camAt()`, `P.THREE`. deploy/build_static_demo.mjs — ships the spec + registry.
  · 26_LOCAL_AUTHORITY/deploy/probe_botany.mjs (new) + 16_TESTS/gameplay_mahgic_tree.test.mjs (new, 24 checks) — the §14.5 evidence set and the geometry / scale / attachment / normals / idempotence / scope contracts.
  · G20 fix: play/rules1723/rules_17_23.dev.json (`hud_label` per movement pattern: H-PUSH · V-PULL · HINGE · ROTATE · UP-ROW · —), RulesMath.js `patternLabel`, RulesField.js `pattern_label` in both skill views, lab/gameHud.js (no `.slice(0, 9)`; touch drawer chips 1–4, desktop E R T Y), lab/play.html (#g-sel wraps to two lines instead of 'UNAV…'); deploy/probe_hud_pass3.mjs L8b (labels = authored, no overflow, chips numeric on touch); 16_TESTS/gameplay_direct_ui.test.mjs updated; hud/ records + stills refreshed.
  · 25_HANDOFF/CONVERGENCE/RESOURCE_USE_RECORD.md — this phase's section in the §5.1 vocabulary.

WHAT I FOUND:
  confirmed causes with file:line
  · G20 / EXT-07 (was FAIL_KNOWN in the B2 candidate): lab/gameHud.js:245 rendered the 1–4 / E R T Y labels as `(pattern_name||name).split(' ')[0].slice(0, 9)` → 'Horizonta'; play.html:63 `#g-summary #g-sel { text-overflow: ellipsis }` → 'UNAV…'; gameHud.js:230 drawer chips `['E','R','T','Y']` on touch. Fixed as above; probe L8b PASS ×3 modes.
  · lab/mahgicTree.js (first build): tube / sphere / leaf / gem triangles were wound inward (t × (t × n) = −n) — caught by the new winding-vs-normal gate (1 % agreement) and the signed-volume gate; fixed (≥ 99 % / positive volumes). The bed's original winding was correct and is kept.
  · Media (older builds, NOT the current build): V01 confirms F01 — 'FLIGHT MAHGIC EMPTY — LANDING' banner while the meter refills to 100/100 (00:28–01:10, 03:22, 04:24) and 'FORCED LANDING IN PROGRESS' under it (01:02); F02 — the camera enters building geometry (00:08.25 whole viewport inside architecture; 03:39.8 and 04:22.5 columns fill the frame) and cycles far → screen-filling back → far near façades (00:03, 00:11); F03 — pale / background-coloured patches on the upper back at 00:07–00:09; F04 — the S13 legs as long thin lines / unequal sticks (V02 00:09, 00:58; V01 03:37). These map to G02 / G03 / G07 / G09 / G26 / G33 / G46 and were addressed in PASS 1–4B on the candidate (per the P0 rows) — the footage is the "before", not a live audit.
  · V13 (portrait demo capture, older build): night sky, front-facing camera framing the face, 36–45 s of empty gradient viewport; V12: rig-repair capture. Lineage only.
  hypotheses and non-reproduced conditions separately
  · The V01 far ↔ close camera cycles could be obstruction-boom collapse or the fade / pitch-up logic of that build; the input trace is not in the footage (UNCERTAIN in the ledger).
  · The three tcrf.net roots: every automated path returns an AI-agent decoy page; whether the real articles contain the 'five loading cards', the DMC2 desktop screenshots or the GTA V cut-mission fields stays UNVERIFIED by this session (search snippets are logged as unexamined leads only).

RESEARCH BASIS:
  actual source observation → original MAHWORLD adaptation
  · V03 (the owner's chosen target; third-party, not MAHWORLD): rear / rear-three-quarter full-body view, character ≈ 27–33 % of frame height at x ≈ 44 %, feet at 90–97 %, horizon in the top third; a ~0.5 s in-place turn with a visible step and weight shift at 1.0–2.4 s; the camera swing starts 0.2–0.4 s after the body begins turning and re-centres within ≈ 1 s; quiet standing 12–23 s with only subtle pose changes; deep-blue gradient sky nearly cloud-free with thin cirrus, fog / cloud wisps hugging the far valley, strong daytime sun, crisp shadows. → Build (PASS 2b pivot, measured): idle box 33.8 % desktop / 27.8 % portrait / 33.8 % landscape — inside the reference band; rear follow is a critically damped spring at 1.2 Hz idle / 2.0 Hz moving (≈ 0.3–0.5 s to re-centre, no lag) — faster than the reference's ~1 s; the owner may prefer a softer preset (one Control Lab number, reversible) — listed as decision (d), NOT applied (no threshold changed after the fact). Sky: the build keeps the owner's 'daytime, clouds, cool sky' rule; the reference's fog wisps at the far layer are a candidate for the P7 sky pass, not applied.
  · DCUO combat guide (L31, retrieved): tap = quick, hold = strong / lunging; BLOCK beats INTERRUPT, INTERRUPT beats BLOCK BREAK, BLOCK BREAK beats BLOCK; a successful counter grants brief immunity; hold BLOCK to break out. → matches the counter loop already in PASS_7_COMBAT_DECISIONS_REQUEST.md (no change).
  · three.js docs (L05–L14, current-release pages, no r185 banner): AnimationAction blendMode Normal / Additive, SkeletonUtils.retargetClip RetargetOptions (names / getBoneName / hip / preserveBonePositions …), InstancedMesh + LOD + MeshStandardMaterial facts → the tree uses InstancedMesh + onBeforeCompile on the vendored r185 (compiled, zero console errors); retargetClip has no per-bone mask → upper-body limiting stays a track filter in mocap/import_clip.mjs (already so).
  · Asset licences on record (nothing downloaded): Poly Haven / ambientCG / Kenney CC0; Quaternius QAL v1.0 (not CC0: no standalone redistribution); Sonniss GDC bundle v2.0 (royalty-free, no redistribution as sounds, no AI training).
  · Master §14 → the tree: the scale reference was MEASURED on the rig (not a screenshot) and the specimen crown authored inside the hip band; no Fortnite / TCRF art informs it (none was retrieved).

RESOURCE USE:
  input → tool/version/permission → output → runtime consumer → proof  (full table: RESOURCE_USE_RECORD.md, this phase's section)
  · bundle videos (13, read-only) → headless Chrome frame decode → frames / sheets → none (evidence) → MEDIA_REVIEW_LEDGER (INPUT_INSPECTED)
  · tcrf roots + TikTok → WebFetch (bounded, no login / CAPTCHA) → decoy pages / identity only → none → SOURCE_LINK_LEDGER (BLOCKED)
  · 23 technical pages → WebFetch → facts + licences → decisions above → SOURCE_LINK_LEDGER §B (DOCUMENTATION_READ)
  · dev_0.14 GLB → node restSkeleton FK → hip / pelvis heights → tree_spec.scale_reference → probe S2 (INPUT_INSPECTED → OUTPUT_CREATED)
  · three.js 0.185.1 → mahgicTree.js generator → 3 variants / 9 instanced draws → fieldScene → test 24/24 + probe 10/10 (RUNTIME_INTEGRATED, OWNER_ACCEPTED pending)
  · Tripo / Reallusion / Blender / quarks / asset libraries → NOT USED (slot reserved; no clip; no credits; no downloads)

EVIDENCE:
  inspected:            master (all 1 132 lines), bundle docs, PASS 0–7 reports + records, lab / play sources for the G20 cause and the plant family (cityScene.js:79–83), rig manifest.
  source-reported:      the bundle's own VIDEO_DECODE_CHECKS (13/13 sequential decode) and research diagnosis; the earlier PASS reports' numbers reused per row in P0_REGISTER_RECONCILIATION.md (each with its producing commit).
  recorded footage inspected:  all 13 files by filename + timestamps (MEDIA_REVIEW_LEDGER.md; sampling stated per file; sub-sample events, audio and input outside it).
  runtime rendered/measured:   probe_botany 10/10 (desktop 1280×800 GPU; 25_HANDOFF/CONVERGENCE/botany/): placed crowns 0.748–0.851 m; silhouette region 214×286 px aspect 0.75, widest rows in the upper crown; paired view: crown sy 404.5 vs pelvis 418.3 / femoral head 403.2 px; sway 0.819 % of the frame in 1.5 s (upper 8 016 px vs lower 366); boom inside the cluster 3.00 → 3.00 m; +93 k triangles vs ?botany=0 (385 615 vs 292 251), render 3.5 vs 3.2 ms (single samples); zero console errors. probe_hud_pass3 22 / 22 / 17 (portrait / landscape / desktop) incl. L8b. Tests: 32 files, 1 156 checks, 0 failing (package stage 1).
  emulated device:      iPhone-portrait 390×844 @ DPR 2, touch emulated (botany M1: 326 k tris, 3.7 ms render; HUD portrait / landscape records). Never a physical phone.
  physical phone:       NOT tested by agent
  Jah's actual verdict or PENDING:  PENDING — Packets A + B (B2 → C1) and Packet C (tree).

ACCEPTANCE:
  each applicable row → status (P0_REGISTER_RECONCILIATION.md holds all 116 with value / units / paths; counts of the skeptic-corrected snapshot: 14 EVIDENCE_REUSABLE_PASS · 63 EVIDENCE_REUSABLE_PARTIAL · 4 FAIL_KNOWN · 1 BLOCKED_OWNER · 6 NOT_TESTED · 28 NOT_BUILT; then the post-audit updates)
  · G00 / EXT-03 identities → PASS for this checkpoint (above) · G01 / EXT-33 → PARTIAL (record extended; output hashes now given for the new assets) · EXT-01 / U01 queue → PASS · U02 / EXT-02 → PASS for the ledgers (no root retrieved; five-card figure UNVERIFIED) · U03 → PARTIAL (one owner, additive layers; carried) 
  · G02–G06 / EXT-04 flight → REUSABLE (PASS 1 on 4f7aadd, 29/29 host + traces); physical phone PENDING
  · G07–G12 / EXT-05 camera → REUSABLE PARTIAL / PASS (Spec B + PASS 2 records; 0 inside-geometry frames over 5 860–7 443 frames ×3 viewports; reset ≤ 3.6°); G07 vs the V03 reference: framing inside the band; spring speed = owner option (d)
  · G13–G16 / EXT-06 touch → PARTIAL (camera-look path audited; joystick + ATTACK / DASH / FLY two-finger ownership untraced)
  · G17–G24 / EXT-07 / EXT-08 HUD → PARTIAL; G20 truncation FIXED this session (labels authored; L8b PASS ×3); readability on the phone BLOCKED_OWNER
  · G25–G31 / EXT-09 / EXT-34 fidelity + perf → PARTIAL (PASS 4A captures at DPR 1/2/3; route series on the B2 build; the C1 build's route series NOT MEASURED yet — P9)
  · G32–G35 / EXT-10 legs → PASS / PARTIAL (10/10, 8/8, probe 9/9 on dev_0.14; lower-body visual acceptance = Jah)
  · G36–G40 / EXT-11 / EXT-12 / U04 motion → PARTIAL; G37 FAIL_KNOWN (walk 42.77 cm median drift under the pointed-contact definition; owner decision hover vs planted); G40 PASS (manifest / checklist)
  · G41–G46 / EXT-13 / EXT-14 combat + FX → G41 PARTIAL (rules 60/60, stack 22/22), G42 NOT_BUILT (hit-stop), G43 FAIL_KNOWN on the old footage (candidate NOT TESTED), G44 PARTIAL, G45 NOT_TESTED, G46 PARTIAL
  · G47 / G48 / EXT-16 landmarks → PARTIAL (0.67× applied once at the owner round — verify-only; consumers agree) · G49 / G50 / EXT-18 water / bridges / materials / roads → NOT_BUILT · G51 map → PARTIAL
  · EXT-17 / U05 sky → PARTIAL (pivot 9/9 ×3; the V03 fog-wisp layer not applied) · EXT-19 botany → superseded by U06–U16 below
  · U06 tree height → PASS (measured, crowns 0.748–0.851 m vs pelvis 0.765 / femoral head 0.835) · U07 hierarchy → PASS · U08 craft → PASS (attachment ≤ 2.5 cm, junction spheres, normals, closed solids) · U09 energy → PASS (effects-off silhouette captured) · U10 life → PASS (0.819 % change, crown-biased) · U11 gate → BLOCKED_OWNER (verdict PENDING; no replacement) · U12 scope → PASS (laser plants + TREE_ELEVATOR untouched, instance set recorded) · U13 placement → PASS for the prototype only (mask = after approval) · U14 idempotence → PASS · U15 performance → PARTIAL (7 instances measured; LOD + distribution budget = after approval) · U16 no-eco → PASS
  · G52 / G53 / EXT-20–EXT-29 / U17 / U18 interiors, loading, shops → NOT_BUILT (P8) · EXT-30 activity → PARTIAL (nine residents roam) · EXT-31 tutorial → PARTIAL · EXT-32 → NOT_TESTED
  · G54 one runtime → PARTIAL (same authority modules in the static host) · G55 routes → PARTIAL (common route on B2; extended route NOT RUN) · G56 / EXT-35 package → PASS (C1 pipeline complete) · G57 / EXT-36 candidate gated → PASS (401 verified; correct-password login NOT RUN) · G58 → BLOCKED_OWNER · G59 → PASS (blockers named with owners) · U19 → PARTIAL (evidence types kept separate here) · U20 → PASS (checkpoint saved; no model change)

OPEN RISKS / ART DEPENDENCIES:
  named owner and minimum prerequisite
  · Tree look (Jah, Packet C): the leaves read as teal lenticular petals in tip fans; the branches are pale platinum — both are one authored number each in tree_spec.js if Jah wants darker metal, larger / fewer leaves or a different tint. No LOD yet: distribution beyond the prototype needs the far variant + placement mask (agent, after approval).
  · G37 foot contact (Jah): hover vs planted tips. · Walk identity glide vs step rhythm (Jah). · PASS 7 exercise table + two patterns (Jah). · Rear-follow spring softness (Jah, optional).
  · tcrf page contents (Jah, optional): save the three pages from a normal browser into 25_HANDOFF/CONVERGENCE/sources/; the master's corrected research stays as written either way.
  · Disk: C: 6.9 GB free (deploy/probe_out/video 293 MB is regenerable).

BOTANICAL FAMILY:
  prototype accepted? NO — PENDING Jah's verdict (Packet C). distribution status: NONE (prototype only: 1 specimen at plaza (3.0, 0.4) + 6-tree cluster at ≈ (−8, −7); the old laser-plant family is untouched). actual count/cost: 7 instances · 44–50 k tris · 9 instanced draws (+ sun-shadow pass) · +93 k triangles measured vs ?botany=0 · no collider, no interaction.

SHOPS / INTERIORS:
  actual enterable destinations: NONE (no entrance / interior transaction exists; the contextual prompt covers ENTER / TRANSIT / TALK / QUEST / DUEL intents, exercised only at the tree elevator 'LIFT'). zero-stock/art status: no shop, catalog or merchandise UI exists — P8 builds the first entrance transaction, then the gym and the two zero-stock shop functions in the market with the empty state tested.

ZIP:
  exact full path C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\CLAUDE_GAMEPLAY_RUNTIME\26_LOCAL_AUTHORITY\deploy\packages\CONSOLIDATED_C1.zip · 28 803 750 bytes · 107 entries · SHA-256 642c082e35a4150ec352ddb3d796b6525840a97be0305482df045eb53915369f · Section 2 pipeline (package_pass.mjs, record CONSOLIDATED_C1.PACKAGE.json, commit 73b0da5 clean): 32 test files / 1 156 checks PASS, JS sweep 68 files, CSS sweep, runtime / cache stamps, backend boundaries, secret scan 107 files, ZIP integrity (107 = 107), fresh extraction (byte sizes match), smoke test from the extraction 7/7, JS sweep from the extraction clean. Extracted again with Windows bsdtar to a scratch folder (107 files, hash re-verified) for the draft deploy.

CANDIDATE / ROLLBACK:
  DRAFT https://6aad9c2b987f7a96700b29fa--mahworld-test-preview.netlify.app (deploy 6aad9c2b987f7a96700b29fa, context deploy-preview, state ready, published_at null; gate check: play 401 password page · asset 401) — the live demo https://mahdemo.fob.systems (6aac25101f17ce5ed37166e4, owner_round_0917) is UNCHANGED and is not replaced because tests pass; rollback 6aab65567e997ae33c1da204; previous candidate B2 6aad2eeae77aff15879b2553 still up. Correct-password login: NOT RUN (no password held or stored). Main MAHFITT site / DNS / domains / credentials untouched.

NEXT:
  next independent task or necessary gate, max three baby steps
  1. GATE (Jah, ≤ 3 steps in CONTINUE_HERE.md): Packet C verdict on the tree; Packets A + B on C1; the one-word decisions (a)(b)(c)(d).
  2. Meanwhile (agent, independent): P8 first entrance transaction at the MAH GYM (confirm → fade → ready → interior → EXIT to the doorway; interruption paths; one scene owner), then the two zero-stock shop functions in the market with the empty state tested.
  3. Meanwhile (agent, no map change): the tree far-LOD variant and a seeded placement-mask definition over eligible ground — definitions only until "tree family approved".

ERRATA (owner checkpoint review, 2026-09-18 — corrections to the text above; the underlying records are unchanged):
  · "idle box 33.8 % desktop / 27.8 % portrait / 33.8 % landscape — inside the reference band": WRONG as written. 33.8 % is OUTSIDE the 27–33 % read from V03 frames; the V03 band is approximate (frame sampling of a third-party clip with no input trace) and is NOT a target to resize the character to. The character size stays as set (PASS 2b presets); no retune.
  · "camera swing lags 0.2–0.4 s and re-centres ≈ 1 s → build spring faster than the reference — owner option (d)": the clip shows an APPARENT realignment of the view after the character turns; whether that is an automatic follow, a manual stick input or an edit cannot be known from the footage (no input trace). Option (d) is WITHDRAWN: the current rear-follow spring stays unless a demonstrated alternative (same route, same framing) is put in front of the owner. Manual orbit persists until the explicit reset; no recenter timer, flight-pitch altitude control, speed zoom, lock-on reframing or strike shake exists or is planned.
  · "946 frames / 84 sheets … every entry verdict-marked": this is SAMPLED coverage (0.2–3 s spacing, dense 0.2–0.25 s over the owner-cued intervals), not exhaustive per-frame coverage of any video.
  · "+93 k triangles vs 44–50 k placed": the two-page-load comparison mixed LOD / culling states. The matched same-load measurement (A B A B) is +100 095 renderer triangles = 50 216 placed (7 instances: 32 972 branch + 16 940 leaf + 304 gem) + 49 912 drawn again by the sun-shadow pass (branches + leaves cast; gems do not) and +14 draw calls (9 instanced draws in the main pass + up to 6 in the shadow pass); the mean frame interval did not move at the 60 Hz vsync of the harness (render p50 ≈ 4 ms both ways). Nine draws alone do not establish the cost — the matched numbers do, and the phone-tier (no shadows) delta was +2.5 draws / +18.6 k triangles for the part of the cluster in the portrait frustum.
  · G37 "owner decision hover vs planted": superseded — resolved as an engineering repair (see CONSOLIDATED_PHASE_REPORT_2.md).
  · G57 wording: the unauthenticated gate protection (play 401 password page, asset 401) is its own PASS; the correct-password loading is NOT RUN (no password held) — two separate lines, never one aggregate.
  · Candidate ↔ source: CONSOLIDATED_C1.zip was packaged from commit 73b0da5 (clean tree, stamp in the record); commits 7c3ebf2 and ef3a2e4 after it are documentation / package-record only (no runtime file), which is why the report HEAD differs from the packaged build.
