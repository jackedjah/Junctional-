# Spec A route evidence (tracked copies of `26_LOCAL_AUTHORITY/deploy/probe_out`, which is gitignored)

Test route, every pass: spawn → walk 10 s → fly 20 s → land → full attack combo (E R T Y + two SPECIAL casts).
Driver: `node deploy/probe_route.mjs <static root> <label> <WxH> [extra query]` · series: `node deploy/route_series.mjs <label> <distA> <distB> [runs] [viewports]`.
Harness for every file here: headless Chrome (`--headless=new --use-angle=d3d11`, GPU on, **unlocked frame pacing** `--disable-frame-rate-limit --disable-gpu-vsync`), this laptop, DAY sky, ATHLETE_M_V8, tier HIGH unless the name says otherwise. Numbers scale with machine load — only interleaved / back-to-back pairs are comparable. **iPhone: NOT measured (Jah only).**

| file | what it is |
|---|---|
| `route_series_pass1.json` | **the acceptance record**: 3 interleaved runs per build per viewport (A = S13 build 74b3ec5, B = PASS 1 build), medians + spread per phase, `delta_route` with the tolerance rule (B p95 ≤ A p95 + max(0.5 ms, A spread)); `16_TESTS/gameplay_spec_a_perf.test.mjs` asserts it |
| `route_before_pass1_desktop_final.json` / `route_pass1_desktop_final.json` | one representative A / B run (1120×700) from that series, with the PASS 1 report's per-phase breakdown, LOD and Control Lab stats (B only) |
| `route_before_pass1_portrait_final.json` / `route_pass1_portrait_final.json` | same for 390×844 |
| `route_pass1_portrait_med_run2.json` / `route_pass1_portrait_low_run2.json` | 390×844 at `?quality=med` / `?quality=low` (the phone default is MED); single runs on the pre-merge PASS 1 build, tier illustration only |

Dropped-frame definitions logged (none is adopted yet — Jah picks): share of intervals > 25 ms / > 33.4 ms / > 50 ms (probe), and the Control Lab's PROPOSED "interval > 1.5 × rolling median" (meaningless on an unlocked harness — only meaningful on a vsync'd device).


## Convergence series
- `route_series_conv1.json` — owner_round_0917 (A) vs CONVERGENCE PASS 1 (B): no regression on either viewport.
- `route_series_conv2b_noisy_DISCARDED.json` — first PASS 2b series; two runs are 2× outliers on BOTH builds (desktop B0 p50 13.7 / p95 32.1, portrait A0 p50 14.6 / p95 32.8 — machine load right after the 40 MB WebM encode of the pivot capture). The desktop verdict it prints (Δ +1.5 ms > tolerance 0.9) is driven by that run; it is kept for the record and excluded from the test pattern. Not an owner exception: the clean rerun is the accepted record.
- `route_series_conv2b2.json` — clean rerun, owner round (A) vs PASS 2b (B): desktop p95 14.3 → 12.7 (Δ −1.6), portrait 11.1 → 10.9 (Δ −0.2): no regression.
