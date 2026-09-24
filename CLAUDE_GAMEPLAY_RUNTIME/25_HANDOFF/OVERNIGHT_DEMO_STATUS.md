# OVERNIGHT DEMO CONVERGENCE — STATUS RECORD (2026-09-15, one concise record; the final report is OVERNIGHT_DEMO_CONVERGENCE_REPORT.md)

| stage | status | notes |
|---|---|---|
| A inspect + reproduce phone defects | DONE | swipe path traced: no gesture recogniser existed; right-side swipes were consumed by camera orbit, MOD+swipe only dashed, ATTACK was a plain tap |
| B touch ownership / gestures / movement | DONE | `lab/touchControls.js` (pointer ids, roles fixed at pointerdown, cancel-safe, floating stick with dead zone, one command per gesture) |
| C compact HUD | DONE | `lab/gameHud.js` + `play.html`: vitals · state pill · three modes · FLY / guards / MORE · stick + HOLD ATTACK / DASH; MORE panel for secondary actions; DEV panel (F3) with the diagnostics inspector; dismiss layer consumes outside taps |
| D actual Athlete_M silhouette | DONE (preview) | isolated geometry-only copy of `RAW_10_MODELS/Mah_Athlete_M.glb` → `lab/assets/athlete_m_preview/dev_0.1/` (0.6 MB, graphite / platinum material, CANDIDATE status, never approved); source, masters, Astra files untouched |
| E animation inventory + connection | DONE (honest) | whole-body procedural motion on the rigid mesh; limb / leg / morph motion impossible on this asset (see table in the report) |
| F local integrated demo verified | DONE | portrait / landscape / small phone touch sequences, desktop playability, dock and rules regressions, 0 page errors |
| G website demo | PREPARED, NOT DEPLOYED | `--demo` gate + `--base-path` in the server, package builder, Dockerfile, README; blockers: persistent backend host (Netlify cannot run it), fob.systems site source not on this machine, password not in this session |
| H final verification + handoff | DONE | report + this record |

Checkpoints: `26_LOCAL_AUTHORITY/evidence/checkpoints/overnight_2026-09-15_before/` (originals + SHA256SUMS) and `..._after/`.
