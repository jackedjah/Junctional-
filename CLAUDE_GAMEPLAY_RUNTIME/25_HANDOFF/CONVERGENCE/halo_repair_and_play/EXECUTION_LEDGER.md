# HALO repair-and-play execution ledger

## Implemented / authority-checked

- `RIDE`: `haloLayout.js`, `PlayMode.js`, `cityScene.js`, `fieldScene.js`, and `play.js` now share one floor-origin carrier contract. Boarding is explicit for 1 second inside the fixed 20-second trip; occupied travel publishes exact `carrier_pose` and `rider_pose`, zero relative drift, measured cabin clearance, door phase and zero resource drain. The visible cabin is a human-scale room with floor, roof, glazed wall, frame, doors and interior clearance rather than the old narrow capsule.
- `FLOOR`: `cityScene.js` replaces the two coincident capped-cylinder top faces plus transparent full-area rings/spokes with one opaque 128-segment vertex-gradient deck top, an open-ended structural side skirt and a separate underside. The retained narrow torus seams and court markings are deliberate finite details.
- `VOLLEY`: `HaloSport.js` and the existing host/protocol/HUD/runtime layers provide one active ball and one bounded-speed bot, gravity, substeps, real reach-gated contacts, net/court/out resolution, first-to-seven rally scoring, result, replay and safe exit. No damage, rewards, XP or resource mutation is connected.
- `SERVE LAB`: the same ball/contact/court system provides five serves to LEFT/CENTER/RIGHT targets, per-serve landing/error scoring, result, replay and exit.
- `INPUT/PRESENTATION`: keyboard and HUD/touch buttons reach the host actions; ordinary movement remains available on the player half; combat, flight, transit/navigation and equipment operations are refused only while the activity is active. Held equipment authority is preserved and its geometry is visually stowed for play, then restored.
- `NON-HALO-01`: existing fish schools at the registry water habitats now use a recognizable low-poly spindle body with forked tail, dorsal fin and paired pectoral fins instead of the former altered octahedron. Population counts, habitats, host wildlife and performance-minded instancing remain unchanged.

## Focused checks

- `16_TESTS/gameplay_halo_repair_play.test.mjs`: 10/10.
- `16_TESTS/gameplay_m7_halo_scale.test.mjs`: 13/13.
- Changed-file JavaScript syntax and `git diff --check`: clean.

## Pending gates

- Actual-runtime moving ride/floor/court/input inspection and short clips/stills.
- One affected mainland water/ecology view plus existing equipment/resource smoke.
- Established candidate release/security/package/fresh-extraction gates once, then one new protected unpublished preview.
- Hosted authenticated gameplay only if permitted credentials are available. Physical-phone acceptance remains owner-only.

## Deliberately not claimed

- This closes one named non-HALO presentation defect, not the five-sanctuary/master queue.
- No bespoke dome climbing, missing-original recovery, production publication, previous-preview replacement or phone acceptance.

