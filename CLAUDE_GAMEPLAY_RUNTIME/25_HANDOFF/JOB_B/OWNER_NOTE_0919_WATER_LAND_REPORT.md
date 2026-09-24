# OWNER NOTE 2026-09-19 — "water not too crazy · multiple bodies of land · gradual beach shorelines" — integration report (JOB B, same session, absorbed after the environment / guide-scale interjection)

Owner words (verbatim intent): calm the water; the world must read as VAST with multiple bodies of land; wherever water meets land it must be very gradual, following beach physics (waves lapping, a shore, never a hard plane).

## What changed (commit 5eca38a → candidate CONSOLIDATED_B2)
1. CALM WATER — the near ripple field's displacement 0.11 → 0.07 m, normal gain 5 → 3.2, damping 0.99, wading splats × 0.6, landing splat 0.6; the far normal map softer (0.17, drift halved, 13 m tile); the near water more translucent (0.76) so the sand continues visibly under it near the shore. Rings still form, expand and fade — restrained, no permanent noise (`evidence/water/sheet_wade_beach.jpg`).
2. MULTIPLE BODIES OF LAND — `lab/world/coast.js` (new, registry `coast`): the mainland is ONE island: its floor now ends at a rounded coast 28–30 m beyond the field walls (x ±203, z −86..322, corners r 70; the district floor is a ShapeGeometry with that outline + the canal hole), then a 34 m BEACH RING descends through the waterline (8 m out, sea −0.3) to −1.6 under the sea (the shared dry → wet → deep shore gradient), then a single animated SEA plane (1.8 km, the canal's drifting normal map, bluer / rougher so it reads as water at grazing angles) to the horizon. FIVE other landmasses stand in the sea at 300–650 m (ISLE_W / E / N / SW / NE: elliptical beach ring + rising plateau + crystal spires + instanced sapphire tree silhouettes), hazed by the fog for depth; the existing far crystalline massifs and mid walkway arcs remain around them (the arcs now stand in the sea like piers). The legacy flat haze plain is retired. Scenery beyond the walls: no colliders (the field walls stay the playable limit). Cost: 12 draw calls, 13.6 k tris, no per-frame allocation (`evidence/plan/coast_top_vast.png`, `sheet_coast.jpg`, `evidence/shore/`).
3. BEACH SHORELINES — the canal banks are beaches: no kerb; the ground slopes from the floor edge (0) down to the wade floor (−0.45) over 6 m on each bank as walkable water RAMPS (host `Colliders.groundHeight` honours water ramps below zero; the same profile is drawn as sloped shore strips with the gradient; the water surface sits at −0.16 so ~2.4 m of dry sand shows above the waterline, then the wet band, then the water); FOAM lines lap in and out along every waterline (canal, coast, islands — a soft white band swinging ≈ ±1 m on a 5 s period with pulsing opacity = waves rolling up the beach). Verified on the host: the ground profile 0 → −0.11 → −0.45 → −0.11 → 0 across the canal, walking in / across / out on both banks (`gameplay_world_jobb` 5, 21 / 21).
4. Everything else from JOB B and the environment / guide interjection stays (ripples, floats, guides, fixtures, sun / moon, match hall, Dogkies).

## Honest residuals
- From a low camera the canal bank still reads as a pale band + a darker wet band rather than a wide sandy beach: the slope is 6 m / 0.45 m (a 4° beach) — physically gradual, visually short. A wider bank (10–12 m shore_w) would read "beachier" but eats the 20 m canal; an owner call.
- The sea is one flat plane: no swell geometry (a large-scale slow vertex swell is the next cheap step if wanted).
- Islands are silhouettes (unreachable, no detail up close) — intended as "vast world" scenery.

## Candidate — CONSOLIDATED_B2
- ZIP `26_LOCAL_AUTHORITY/deploy/packages/CONSOLIDATED_B2.zip` · **51 896 114 bytes · 147 entries · SHA-256 489bc249e0103a0bfc3866a54e3f283134f373357a890f08d45bb7a817116cc8** · from commit **5eca38a (clean)** · pipeline 0–7e PASS (43 files / 1 340 checks / 0 failing, fresh-extraction smoke 7 / 7).
- ONE review URL (DRAFT, no `--prod`): **https://6aaf353db7fae6d0aa4df21d--mahworld-test-preview.netlify.app** (deploy 6aaf353d…; gate 401 on play / BUILD_INFO / coast.js = unauthenticated protection PASS; correct-password login NOT RUN). Live https://mahdemo.fob.systems = 6aac25101f17ce5ed37166e4 untouched (verified). B1 (c7fd0f71…, draft 6aaf261b…) and C7 remain as rollbacks.
- This candidate ALSO carries the first JOB A deliverables (`../JOB_A/JOB_A_PROGRESS_REPORT.md`): one FLY control, SEPARATE / FUSE corner, category strip arrows + swipe, MAH GUIDE toggle.

## Owner actions (≤ 3)
1. Phone, on the B2 draft: walk to the canal bank and into the water (the beach slope, the foam), look south / west from the plaza edge (the coast, the sea, the islands) — one line: keep / change (a wider canal beach?).
2. FLY on the phone: hold, release, tap, tap again, hold again — one line.
3. (unchanged) the evidence files / stat source / decisions.
