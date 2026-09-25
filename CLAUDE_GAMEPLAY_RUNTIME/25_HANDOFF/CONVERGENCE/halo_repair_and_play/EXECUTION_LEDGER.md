# HALO repair-and-play execution ledger

## Implemented / authority-checked

- `RIDE`: `haloLayout.js`, `PlayMode.js`, `cityScene.js`, `fieldScene.js`, and `play.js` now share one floor-origin carrier contract. Boarding is explicit for 1 second inside the fixed 20-second trip; occupied travel publishes exact `carrier_pose` and `rider_pose`, zero relative drift, measured cabin clearance, door phase and zero resource drain. The visible cabin is a human-scale room with floor, roof, glazed wall, frame, doors and interior clearance rather than the old narrow capsule.
- `FLOOR`: `cityScene.js` replaces the two coincident capped-cylinder top faces plus transparent full-area rings/spokes with one opaque 128-segment vertex-gradient deck top, an open-ended structural side skirt and a separate underside. The retained narrow torus seams and court markings are deliberate finite details.
- `VOLLEY`: `HaloSport.js` and the existing host/protocol/HUD/runtime layers provide one active ball and one bounded-speed bot, gravity, substeps, real reach-gated contacts, net/court/out resolution, first-to-seven rally scoring, result, replay and safe exit. No damage, rewards, XP or resource mutation is connected.
- `SERVE LAB`: the same ball/contact/court system provides five serves to LEFT/CENTER/RIGHT targets, per-serve landing/error scoring, result, replay and exit.
- `INPUT/PRESENTATION`: keyboard and HUD/touch buttons reach the host actions; ordinary movement remains available on the player half; combat, flight, transit/navigation and equipment operations are refused only while the activity is active. Held equipment authority is preserved and its geometry is visually stowed for play, then restored.
- `NON-HALO-01`: existing fish schools at the registry water habitats now use a recognizable low-poly spindle body with forked tail, dorsal fin and paired pectoral fins instead of the former altered octahedron. Population counts, habitats, host wildlife and performance-minded instancing remain unchanged.

## Focused checks

- `16_TESTS/gameplay_halo_repair_play.test.mjs`: 11/11, including the post-return mainland equipment/resource link: held barbell retained, two accepted physical contacts fracture `NODE_RB_NEXUS_INTRO`, three real drops spawn, and the combat pool refills.
- `16_TESTS/gameplay_m7_halo_scale.test.mjs`: 13/13.
- Actual-runtime ascent: 42 sampled frames across boarding/travel, host carrier/rider drift `0 m`, rendered passenger/cabin vertical drift `0 m`, held barbell visible inside the cabin.
- Actual-runtime follow-up roundtrip: ground and upper prompts each admitted an ordinary input ride at `0` Flight MAHGIC; 50 ascent and 49 descent samples held host/rendered drift at `0 m`; minimum side/head clearance `1.27/1.45 m`; return docked in `WORLD` at ground `0` with the same held barbell.
- Floor motion: one opaque full-area top, zero transparent full-area overlays, inspected at NIGHT and DAY plus orbit/walk views without the previous breakup.
- Sports motion: one 29.03-second current-runtime clip driven by real keyboard events; seven rally results include a deliberate sideline `OUT` and a real player return contact, then `BOT_WON 0–7`; replay reset to `0–0`; target practice completed `5/5`; safe exit left `sport=null` in `HALO`; zero unexpected console errors.
- Mainland presentation: the Titan Lake view shows the new finned fish school; the linked host gate above proves the resource interaction at the authored newcomer patch rather than treating a decorative screenshot as proof.

## Release outcome

- Source checkpoint `3710e4588a7f853c84a1a376eee7d08fdabc0454` is verified on `backup/mahworld-m6-20260924T190351Z`.
- The established candidate pipeline passed 58 programs / 1,542 checks / 0 failures, 106-file JavaScript syntax, CSS/protected-boundary/183-file secret scans, exact 183-file fresh extraction, extracted syntax and smoke `7/7`.
- Package `ASTRA_M7_HALO_REPAIR_PLAY_PRIVATE_20260924.zip`: 122,993,039 bytes; SHA-256 `a63114487c19a053dfb74c18cd4fc6f453424f7f805d73b895f1a887a90ed1aa`.
- New protected unpublished preview: deploy `6ab5db39db052ab31c510699`, `https://6ab5db39db052ab31c510699--mahworld-test-preview.netlify.app`, state `ready`, context `deploy-preview`, `published_at = null`.
- Production `6aac25101f17ce5ed37166e4` and previous HALO preview `6ab5c2451611040beb1093d8` remain unchanged. Play and a private JavaScript route return `401`; authenticated hosted gameplay was not run because `MAHDEMO_PW` is unavailable. Physical-phone acceptance remains owner-only.

## Deliberately not claimed

- This closes one named non-HALO presentation defect, not the five-sanctuary/master queue.
- No bespoke dome climbing, missing-original recovery, production publication, previous-preview replacement or phone acceptance.
