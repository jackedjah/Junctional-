# `mrmah3d` — the Mr.Mah real-time 3D renderer

**Status: Phase 1. Experimental. Development-only. Not in production.**

This package is an isolated real-time 3D system living inside MAHFITT. Nothing
in the shipped application loads it. The character it renders is a stack of
primitives and **is not Mr.Mah** — see `core/character.js`.

Read `../CLAUDE.md` before changing anything here.

---

## Open the laboratory

The project has no build step, so any static server rooted at the repository
root works:

```sh
npx http-server . -p 8123 -s -c-1
# then open:
#   http://127.0.0.1:8123/mrmah3d/lab/index.html
```

The lab is a standalone page. It loads no MAHFITT stylesheet or script, so it
cannot affect the application, and the application cannot affect it.

## Verify it

```sh
node tests/mrmah3d-phase1.test.js                  # static contracts, no browser
node tools/mrmah3d-verify.mjs http://127.0.0.1:8123 # real browser, writes screenshots
```

`tools/mrmah3d-verify.mjs` captures to `validation/mrmah3d/`. **Look at the
images.** Automated totals have already once passed a frame that was visibly
broken; see §6 of `../CLAUDE.md`.

---

## Using it from a host surface

One entry point. Everything else is internal.

```js
import { createMrMahScene, isSupported } from '/mrmah3d/core/mrmah-scene.js';

if (!isSupported()) return;            // fall back to the 2.5D rig
const mah = createMrMahScene(hostElement);
// ... later, on unmount — this is not optional:
mah.destroy();
```

`createMrMahScene(host, options)` takes the element it should fill and confines
itself to it. Useful options: `tier` (`'low' | 'medium' | 'high'`, otherwise
detected), `palette`, `framing`, `reducedMotion`, `preserveDrawingBuffer`
(screenshotting only — it costs a buffer copy on some mobile drivers).

It returns `{ resize, pause, start, destroy, info, canvas, scene, camera, parts }`.
`info()` is the live readout the lab's HUD prints.

**`destroy()` is mandatory on unmount.** MAHFITT is a single-page app; nothing
tears the renderer down for you, and browsers cap live WebGL contexts.

---

## Layout

```
core/
  mrmah-scene.js   composition root — THE public API
  renderer.js      WebGLRenderer, canvas, buffer size, context lifetime
  stage.js         Scene + fog; 'world' and 'subject' roots
  camera.js        PerspectiveCamera + responsive framing
  lights.js        key / fill / rim / hemi / ambient
  environment.js   shadow-catching ground + perspective grid
  character.js     PHASE 1 PLACEHOLDER — swap point for the real model
  interaction.js   pointer drag -> yaw
  quality.js       device tier, DPR caps, degrade path
  lifecycle.js     RAF loop and every reason to stop it
  palette.js       reads MAHFITT theme tokens from CSS
lab/               development-only laboratory page
vendor/three/      pinned Three.js 0.185.1 (MIT)
```

Three.js is **vendored**, not installed: MAHFITT has no bundler and serves plain
static assets. `three.module.min.js` imports `three.core.min.js` as a relative
sibling, so the pair works with no import map. Do not replace this with a CDN
link or add a package manager for it.

---

## Two decisions worth not re-deriving

**The camera framing is not invented.** It matches the stage members already
know. `mygym.css` fakes its perspective with
`transform: perspective(470px) rotateX(64deg)`, which is a ~55° vertical field
of view and a 26° downward pitch. `core/camera.js` uses exactly those.

**The floor grid is deliberately pushed in front of the camera.** A grid
centred on the origin spans z = +20..−20 while the camera sits at z ≈ +6.5, so
every line running along Z straddles the near plane. Measured in
ANGLE/SwiftShader, such segments are dropped outright — the floor rendered as
horizontal bands with no converging lines and read as a flat backdrop. Sizing
the grid to the visible region fixes it on every rasteriser and draws less
geometry. Do not re-centre it on the origin.

---

## What Phase 1 does not do

No Mr.Mah geometry, face or hands. No PS3-era materials. No animation states.
No model loading. No particles. No AI Chat or MAH Protocol integration. Those
are later phases and require approval.
