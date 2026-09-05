# MAHTROPOLIS — Arrival Gate (world scene study v1)

The first visible MAHWORLD place: the wet cobalt plaza in front of the
MAHWORLD gate. One small reference-matched arrival area, nothing more.

## What this is, and is not

| Real, running now | Not here (by design) |
| --- | --- |
| A WebGL scene rendered at run time by the permitted renderer | Any game system, player, progression, inventory, presence or network |
| Three authored camera views: ARRIVAL, ASCENT, THRESHOLD | Mr. Mah — his character renderer is separate and untouched |
| A real camera move (TOUR: arrival → ascent → threshold) | Any link from the MAHFITT app shell; MAHFITT never loads this page |
| Drag to look, pinch or scroll to move along the view | Textures, models or fonts from disk; every surface is procedural |
| Rain, sky ribbons, a hovering vehicle, in motion (static under reduced motion) | Post-processing, shadows, or any addon beyond the Three.js core module |

## Renderer and dependencies

- `mahworld/vendor/three/three.module.min.js` + `three.core.min.js`, **three@0.185.1**, MIT.
  Byte-identical to `mrmah3d/vendor/three/` on the renderer branch. Copied, not shared,
  so the world scene never reaches into the character work.
- No other dependency. No bundler, no build step, no package install.
- Verification uses Playwright's headless Chromium (software GL) only to capture evidence; it is
  not needed to view the scene.

## Viewing

From the repository root, any static server works:

```sh
python3 -m http.server 8123
# then open  http://localhost:8123/mahworld/scene/arrival-gate/plaza.html
```

Open it on a phone in portrait or on a desktop. The three buttons at the bottom
switch views; **Tour** plays the camera move; drag the scene to look around;
pinch (or scroll) to move forward and back. `?view=ascent` opens on a view,
`?hud=0` hides the controls for clean captures.

Under `prefers-reduced-motion`, the rain, ribbons and vehicle hold still and
the scene renders on demand.

## Evidence (actual run time, not concept art)

`node tests/mahworld-arrival-gate-capture.js` regenerates `validation/mahworld/arrival-gate/`:

- `view-arrival-phone.png`, `view-ascent-phone.png`, `view-threshold-phone.png` — 390×844 @2x
- `view-*-wide.png` — 1280×720
- `tour.webm` — the Tour camera move recorded from the running page, with `tour-frame-1..6.png`
- `capture.json` — draw calls, triangles, ms/frame under software GL, renderer version, page errors

## References followed

Packet `04_VISUAL_REFERENCES/01_WORLD_ATMOSPHERE_RAINY_COBALT_CITY.jpeg` for the
atmosphere language (nocturnal cobalt, wet reflective ground, luminous urban depth,
restrained haze — not the road, signage or buildings), and the MAHWORLD concept deck
for the place itself: the dark monolith gate with the diamond emblem, the wordmark,
the arched portal with a luminous rim, the wide steps, the flanking curved towers with
light bands, the sky ribbons, the moon, the figures for scale.

The gray character-inspection captures under the renderer branch are Mr. Mah's
engineering evidence and were not used as an environment target.
