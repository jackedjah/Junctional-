# MAHWORLD — visible world scenes (development only)

Runtime scenes on the permitted renderer. Nothing here is linked from the
MAHFITT app shell; MAHFITT never loads these pages, and they carry no game
system, no network and no interface baked into the world.

| Scene | Page | Status |
| --- | --- | --- |
| **MAHPLAZA** — MAH GYM · MAH MATCH · MAH MARKET, a living chromium district under a luminous crystalline night | `mahplaza.html` | **v5** (the chromium city), the current milestone |
| Arrival Gate — the MAHWORLD gate plaza | `arrival-gate/plaza.html` | study v1, kept for the record |

## v5 — the chromium city

MAHWORLD is now built from chromium, dark platinum, polished crystal, reflective
glass and MAHGIC light. Five finish grades (mirror / satin / brushed / graphite /
crystalline glass) are the same cool neutral metal at five polishes, ranked by how
much of the world may wear each — mirror is rare and focal, graphite is everywhere.

| What changed | Where |
| --- | --- |
| the plaza floor became the hero surface: nine-metre chromium diamond cells with chamfered bevels and mirror-grade joint catches, laid as a deck everything else stands on | `ground.js`, `materials.js` |
| the three destinations moved to three depths with three silhouettes — broad glazed canopy, civic terraces, a dominant tower — from one exported site plan the ground, paths and crowd all read | `buildings.js` |
| twelve megatalls at 214–392 m with three new crowns, on overlapping radii for height parallax | `city.js` |
| forty FOBEAM hairlines in near / mid / far tiers, the far tier generated along a band across the sky as one luminous river of energy | `fobeam.js` |
| diamond clouds hold more of the sky; their crystalline catches are stronger | `clouds.js` |
| the environment map carries the district itself, so chromium has a city to reflect | `mahplaza.js` |
| premium lamps, wayfinding blades, planted plinths, a second shelter, utility columns | `plaza-dressing.js` |

Contracts: `CONTRACTS_V5.md` (v5 additions) and `CONTRACTS_V4.md` (the module
contract and the standing laws).

## The world modules

Each is optional: the assembly imports it if the file exists and drives it through
`setTime` / `setTheme` / `update` / `setQuality`, so any one can be removed without
breaking the page.

| Module | Owns |
| --- | --- |
| `city.js` | the MAHWORLD district: midground blocks with recessed window grids, bridges and a long walkway, background crystalline towers, distant giants, a travelling rail pod and an elevator |
| `plaza-dressing.js` | the plaza's civic design: inlaid routes with curb lips, two gathering nodes, light masts with square-diamond luminaires and soft pools, corridor rails and bollards, benches, an info pylon, a shelter |
| `match-interior.js` | the engineered MAH MATCH combat hall: chamfered platform, energy boundary, barrier rails, tiered seating, lighting truss, training bays, and the two entrance actions mounted in recessed display frames |
| `clouds.js` | the diamond cloud system: layered soft cloud masses with crystalline internal planes lit by the moon, drifting per layer |
| `fobeam.js` | FOBEAM infrastructure in the canonical language — rail core, soft outer field, travelling square-diamond packets with their travelling light, endpoint receivers, per-route direction; plus the distinct broad FOBLOW ribbons |
| `life.js` + `effects.js` | ambient world life on a path network, conversation groups, building entries, an eight-event scheduler with cooldowns, distance tiers, and pooled crystalline MAHGIC effects |

## Renderer and dependencies

- `../vendor/three/three.module.min.js` + `three.core.min.js`, **three@0.185.1**, MIT —
  byte-identical to `mrmah3d/vendor/three/` on the renderer branch, copied rather than
  shared so the world never reaches into Mr. Mah's character work.
- No other dependency, no bundler, no build step, no package install. `../package.json`
  only tells Node these files are ES modules so the tests and the release gate can parse them.
- Playwright's headless Chromium (software GL) is used only to capture evidence.

## Viewing MAHPLAZA

```sh
python3 -m http.server 8123          # from the repository root
# open  http://localhost:8123/mahworld/scene/mahplaza.html
```

Portrait phone or desktop.

- **Tap** a destination (MAH GYM, MAH MATCH, MAH MARKET) or one of the two MAH MATCH
  entrance actions. A small card explains what it is and what the preview can do:
  destinations move the camera to the entrance (**Go**); **FIND AN OPPONENT** is shown
  as *not available in this preview* (no live players exist and none are simulated);
  **PRACTICE WITH A BUDDY** offers the local practice preview (two labelled local
  proxies: your colour and the blue buddy fixture — enter → positions → guard →
  strike → block → evade → reset → return). **Exit practice** or Escape ends it at
  any point and restores the plaza.
- **Drag** to look, **pinch / scroll** to move, arrow keys or WASD on a keyboard.
  Reduced-motion settings make camera moves instant and stop idle motion.
- **View** row: Arrival, In-world, MAH MATCH, Gym, Market, Residents, Tour.
- **Time** row: Live (the real-time-anchored world clock) or pin Day / Dusk / Night.
- **World** row: your world theme — Blue, Red, Purple, Green. Environment energy only.
- **My avatar** row: your own resident's colour. Yours only.
- **Preview** row: Practice preview, Reduced-glare view (additive glow off, emissive
  capped, exposure fixed), and the route back to the MAHFITT control deck.
- Query parameters: `?view=`, `?time=day|dusk|night|HH:MM`, `?theme=`, `?self=`,
  `?diagnostic=1`, `?hud=0` (no controls), `?debug=1` (frame meter; off by default).

Your world theme and avatar colour are remembered on this device only
(`fob.mahworld.preview.*`). Nothing is sent anywhere.

## Three independent appearance owners

| Owner | Changes | Never changes |
| --- | --- | --- |
| **World theme** (viewer-local) | seams, signs' light, ground marker, sky infrastructure, plants, craft, entrance light colour | any resident, glass, neutrals, interior whites, MAH MATCH's red |
| **Local avatar** | the viewer's own resident (`self`) | anyone else, the world |
| **Remote avatars** | each other resident individually (in this preview, labelled local fixtures) | the viewer's avatar, the world |

Residents paint their colour into their own vertex colours and per-colour materials;
a recolour rebuilds ONE resident in place. There is no CSS filter, overlay, colour
grading pass or scene-wide material override. `tests/mahworld-mahplaza-capture.js`
proves it with the same camera across five steps (state values and read-back pixels).

## What each module owns

| File | Owns |
| --- | --- |
| `world-clock.js` | the ONE authoritative world time: 24 world hours ≈ 2.5 real hours, anchored to real local time, pure function of wall-clock ms, `freeze()` for validation only |
| `materials.js` | themes (environment energy only, live `retheme`), fixed neutrals, signage textures with the reserved square-diamond mark slot (no invented pictograms), `setDiagnostic`, geometry helpers; no yellow anywhere |
| `ground.js` | plaza, aprons, vehicle corridors with restrained markers, the MAHPLAZA civic marker, seating, planter spots |
| `buildings.js` | MAH GYM (training, readable interior), MAH MATCH (the fighting facility: `MAH MATCH · MATCHES · PRACTICE`, the two entrance actions FIND AN OPPONENT / PRACTICE WITH A BUDDY, central ramp through the steps, square-diamond arena, energy boundary, tiers, practice zones), MAH MARKET (name only; abstract goods, no commerce); tap targets |
| `residents.js` | the crystalline species: square-diamond head with a dark facial chamber, friendly eyes and smile; faceted body; arms; ONE lower teardrop, no legs; physique 0..1 (beginners included); one coherent player colour each; poses incl. `guard` (drivable for the practice preview); `recolour()`; stable ids |
| `flora-and-vehicles.js` | diamond vegetation (dark planter → luminous stems → square-diamond leaves: a square rotated in-plane, thin depth; sparse) and square-diamond sky craft in the FOB vocabulary (an adaptation, see `REFERENCE_MANIFEST.md`), live `setTheme` |
| `sky.js` | dome, sun and moon, stars, clouds, mountains, quiet skyline, FOBEAMS (directed) and FOBLOWS (soft flows) as adaptations of the app's accepted vocabulary, the light rig keyed by the clock, live `setTheme` |
| `mahplaza.js` | assembly, camera views, tour, tap vs drag, selection and preview navigation, the practice preview and its clean exit, world / self / remote appearance API, diagnostic mode, environment map, reflections, the loop, teardown |
| `REFERENCE_MANIFEST.md` | what the scene borrows from MAHFITT / FOB assets, from where, and how faithfully |

## Laws kept

- Time of day, world theme and avatar appearance are three separate things.
- Light is blue-white; the single red accent belongs to MAH MATCH's competitive identity.
- MAHPLAZA is the location marker; MAHWORLD is the universe.
- No speech bubbles, no HUD in the world, no product claims, no prices, no fabricated
  logos, no fake players, no "opponent found".
- MAH PLAYER remains the music owner: the scene creates no audio.

## Evidence (actual run time)

- `node tests/mahworld-mahplaza-capture.js` writes `validation/mahworld/mahplaza-v3/`:
  the required views at NIGHT, DAY (and DUSK for the arrival pair), phone frames, the
  five same-camera theme checks with state and pixel evidence, the reduced-glare
  diagnostic beside the standard render, `v3-camera-movement.webm`,
  `v3-practice-preview.webm` with stepwise frames, `capture.json`, and a static
  `Review.html` (relative assets; REFERENCE / BASELINE / AFTER).
- `node tests/mahworld-mahplaza-soak.js 15` writes `soak.json` (idle, navigation, re-entry).
- `node tests/mahworld-mahplaza-laws.test.js` checks the scene laws statically.
- `node tests/mahworld-world-clock.test.js` proves the clock.
- The v2 milestone evidence stays in `validation/mahworld/mahplaza-v2/` as the baseline.
