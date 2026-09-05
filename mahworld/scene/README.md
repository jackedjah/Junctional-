# MAHWORLD — visible world scenes (development only)

Runtime scenes on the permitted renderer. Nothing here is linked from the
MAHFITT app shell; MAHFITT never loads these pages, and they carry no game
system, no player, no network and no interface baked into the world.

| Scene | Page | Status |
| --- | --- | --- |
| **MAHPLAZA** — MAH GYM · MAH MATCH · MAH MARKET, residents, sky, day/night | `mahplaza.html` | world scene v2, the current milestone |
| Arrival Gate — the MAHWORLD gate plaza | `arrival-gate/plaza.html` | study v1, kept for the record |

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

Portrait phone or desktop. Bottom controls: **View** (Establishing, In-world, MAH MATCH,
Gym, Market), **Tour** (the camera move establishing → in-world → MAH MATCH), **Time**
(Live, or pin Day / Dusk / Night for inspection), **Theme** (your world Theme: canonical,
red, purple, green — environment energy only). Drag to look, pinch or scroll to move.
Query parameters: `?view=`, `?time=day|dusk|night|HH:MM`, `?theme=`, `?hud=0`.

## What each module owns

| File | Owns |
| --- | --- |
| `world-clock.js` | the ONE authoritative world time: 24 world hours ≈ 2.5 real hours, anchored to real local time (long world days through the real day, long nights through the real night), pure function of wall-clock ms, `freeze()` for validation only |
| `materials.js` | themes (environment energy only), fixed neutrals, signage textures and glyphs, geometry helpers; no yellow anywhere |
| `ground.js` | plaza, aprons, vehicle corridors with restrained markers, the MAHPLAZA civic marker, seating, planter spots |
| `buildings.js` | MAH GYM (training, readable interior), MAH MATCH (the fighting facility: square-diamond arena, energy boundary, tiers, practice zones, wayfinding FIND AN OPPONENT / BUDDY PRACTICE / SOLO PRACTICE), MAH MARKET (low, welcoming, shelving with abstract goods) |
| `residents.js` | the crystalline species: square-diamond head, faceted body, arms, ONE lower teardrop, no legs; physique 0..1; one coherent player colour each; poses |
| `flora-and-vehicles.js` | diamond vegetation (dark planter → luminous stems → square-diamond leaves) and FOB-inspired square-diamond vehicles on a route |
| `sky.js` | dome, sun and moon, stars, clouds, mountains, quiet skyline, FOBEAMS (directed) and FOBLOWS (soft flows), the light rig keyed by the clock |
| `mahplaza.js` | assembly, camera views, tour, interaction, environment map from the sky, reflections, the loop |

## Laws kept

- Time of day and world Theme are separate; the Theme recolours environmental energy
  only and never another resident's colour.
- Light is blue-white; the single red accent belongs to MAH MATCH's competitive identity.
- MAHPLAZA is the location marker; MAHWORLD is the universe.
- No speech bubbles, no HUD in the world, no product claims: the market shows abstract goods.

## Evidence (actual run time)

`node tests/mahworld-mahplaza-capture.js` writes `validation/mahworld/mahplaza-v2/`:
the SAME three cameras at DAY, DUSK and NIGHT (wide), the in-world phone view at all
three, night phone views, a red-Theme proof, `tour-night.webm` with six frames, and
`capture.json` (draw calls, triangles, ms/frame under software GL, clock state).
`node tests/mahworld-world-clock.test.js` proves the clock.
