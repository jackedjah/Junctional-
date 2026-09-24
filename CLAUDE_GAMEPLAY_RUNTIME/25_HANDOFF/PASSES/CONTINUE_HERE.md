# CONTINUE HERE — MAHWORLD all-passes execution (gameplay lane)

Written 2026-09-17 at the PASS 2 human gate; updated the same day after the OWNER ROUND (see `OWNER_ROUND_2026-09-17_REPORT.md`): camera lock-in (rear follow + drag only), metallic runtime look, 0.67× landmarks, daylight + sun shadow (HIGH), mobile layout, dash 1.75×, and a PRODUCTION deploy of that build to the demo project (deploy 6aac25101f17ce5ed37166e4, https://mahdemo.fob.systems; rollback 6aab65567e997ae33c1da204). Read this before repeating any work.

## Where things are
- Repo / worktree: `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS` (git, branch `master`, clean). Checkpoint tags: `s13_convergence` (74b3ec5) → `pass1_spec_a` (4da1488) → `pass2_spec_b` (d98f142) → **`owner_round_0917` (HEAD)**.
- Brief: `C:\Users\jahsu\Downloads\MAHWORLD_ALL_PASSES_MASTER_PROMPT.md` (PART I continuous execution, PASS 0–9; PART II Specs A–H, Section 2, 12, 13).
- Runtime root R = `CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY`; static root `R/deploy/static_dist` (rebuild: `node deploy/build_static_demo.mjs` from R). Tests: `cd CLAUDE_GAMEPLAY_RUNTIME && node 16_TESTS/<file>` (26 files, all passing at HEAD).
- Reports (Section 13): `25_HANDOFF/PASSES/PASS_0_AUDIT.md`, `PASS_1_SPEC_A_REPORT.md`, `PASS_2_SPEC_B_REPORT.md`. Evidence: `25_HANDOFF/PASSES/perf/` (Spec A route series, README), `25_HANDOFF/PASSES/spec_b/` (Spec B probe records + stills).
- Packages (Section 2 pipeline `node 26_LOCAL_AUTHORITY/deploy/package_pass.mjs <label>` from CLAUDE_GAMEPLAY_RUNTIME): `R/deploy/packages/PASS1_specA.zip` (sha256 3a72d716…) and **`PASS2_specB.zip` (sha256 15cbe6bb7d7760fbebe90b791442d097f99a14a4cfc00de2b32265b6defbb784)** — zips are gitignored (rebuildable from the tag), the `*.PACKAGE.json` records are tracked. Both packages passed the full pipeline incl. the fresh-extraction smoke test.
- Deployment: the demo project (`mahworld-test-preview`, https://mahdemo.fob.systems) serves the owner-round build `6aac25101f17ce5ed37166e4` (commit 59a6585, zip sha256 b71516ce…); rollback = the S13 deploy `6aab65567e997ae33c1da204`. The main MAHFITT site is untouched. Blender: never launched.

## Current pass: PASS 2 (Spec B) — stopped at its HUMAN GATE
Completed on the harness (headless Chrome, touch EMULATED, unlocked fps): every Spec B acceptance check in desktop / portrait / landscape (`probe_spec_b.mjs` 20/20 ×3), the extra Spec B rules (`probe_spec_b_extra.mjs` 6/6 ×2), the Section 2 gesture audit of the affected paths (`probe_spec_b_gestures.mjs` 11/11 + 10/10, NOT EXERCISED cases listed), the Spec A regression series (no regression by the recorded rule), a fresh-context review with all BLOCKER / SHOULD-FIX items fixed (notably the S13-era yaw-sign bug: the camera saw his face at ±90° headings), Section 2 packaging.
NOT MEASURED (Jah only): the iPhone recording (Spec B gate) and the Spec A Control Lab phone screenshot (pending since PASS 1).

## Pending user decisions (ask, do not assume)
1. **Camera-drag area** (bounded): RIGHT (right half only — Spec B/C) or ANYWHERE (everything except the joystick and buttons — Jah's S13 note). The look zone `#tc-world` (left 42 % → right) stays as is until answered.
2. Whether to DRAFT-deploy `PASS2_specB.zip` to the demo project for the phone review (no domain / DNS change; the live S13 deploy would stay published unless told otherwise).
3. (design note) Whether flight pitch-follow should persist after the look finger lifts (today the pitch springs home after a release, so pitch-follow holds while the finger is down).

## Exact next action
1. Wait for Jah's reply: two recordings (portrait + landscape: walk / swipe / release / hold-back 3 s), the `?lab=1` Control Lab screenshot, and the RIGHT / ANYWHERE word.
2. On feedback: identify the exact screen / state in each recording, fix that failure, re-run `probe_spec_b.mjs` (3 modes) + `probe_spec_b_gestures.mjs` + `route_series.mjs pass2 <scratch pass1_dist> deploy/static_dist 3`, re-package, resume from PASS 2. If the answer is RIGHT → change `#tc-world` to `left: 50%` (and the stick zone stays bottom-left); if ANYWHERE → `left: 0` with the stick zone stacked above it; either way re-run the gesture audit and the D check.
3. Then PASS 3 (Spec C controls + HUD, portrait AND landscape, then desktop; PWA manifest; no keyboard letters on touch; full Section 2 gesture audit with a line per case; screenshot matrix) → its own iPhone gate.
Scratch (session temp, may be gone): `…/scratchpad/pass1_dist` = the PASS 1 static root used as series baseline A; rebuild from tag `pass1_spec_a` if missing.
