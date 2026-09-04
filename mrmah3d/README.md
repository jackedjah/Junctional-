# `mrmah3d` — the Mr.Mah real-time 3D renderer

**Experimental. Development-only. Not in production.**

This package is an isolated real-time 3D system living inside MAHFITT. Nothing
in the shipped application loads it.

It renders the real Mr.Mah, built to match `../reference/mrmah-canonical-front.png`.
He is **not finished art** — see the remaining gaps in
`../MRMAH3D_PHASE2_REPORT.md` — but he is no longer a placeholder.

Read `../CLAUDE.md` before changing anything here.

---

## Open the laboratory

The project has no build step, so any static server rooted at the repository
root works:

```sh
npx http-server . -p 8123 -s -c-1
# then open:
#   http://127.0.0.1:8123/mrmah3d/lab/index.html
#   http://127.0.0.1:8123/mrmah3d/lab/index.html?canonical=1   <- reference framing
```

The lab is a standalone page. It loads no MAHFITT stylesheet or script, so it
cannot affect the application, and the application cannot affect it.

## Verify it

```sh
node tests/mrmah3d.test.js                          # static contracts, no browser
node tools/mrmah3d-verify.mjs http://127.0.0.1:8123 # real browser, writes screenshots

# the reference comparison loop
node tools/mrmah3d-reference.mjs http://127.0.0.1:8123
node tools/mrmah3d-compare.mjs   http://127.0.0.1:8123
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

const mah = createMrMahScene(hostElement, { mode: 'chat' });
mah.setState('thinking');              // idle listening thinking explaining
                                       // success concerned
mah.setMode('protocol');               // re-composes the whole scene

// ... later, on unmount — this is not optional:
mah.destroy();
```

A surface declares WHERE it is (`mode`) and WHAT IS HAPPENING (`state`). It
never positions a camera. See `../CLAUDE.md` §9 for what each mode is for and
why the in-app ones keep him low and off-centre.

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
  composition.js   page modes; solves a camera from compositional intent
  lights.js        key / fill / rim / hemi / ambient
  environment.js   shadow-catching ground + perspective grid
  character.js     the character seam (swap point for a loaded model)
  character/       proportions, forge, materials, head, body, limbs, states
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

**The in-app camera is solved from intent, not chosen.** See `composition.js`
and `../CLAUDE.md` §9: a mode says how big he is and where he sits, and the
camera follows at any aspect ratio.

**The showcase framing reproduces the reference.** It
composition: the character fills 67.0% of frame height, his apex sits 15.0%
down, and the horizon sits 59.8% down. Those three constraints give a 32° FOV
at distance 7.81 with the camera at Y 1.15 pitched **up** 3.22° — up, because a
horizon below frame centre means the camera is tilted upward. Do not round
these off; they are the composition.

The 2.5D stage's own framing (`perspective(470px) rotateX(64deg)` → 55° FOV,
26° *downward* pitch) is retained as `camera.js LEGACY_STAGE` for that surface,
but it is not the reference's framing and is no longer the default.

**The floor grid is deliberately pushed in front of the camera.** A grid
centred on the origin straddles the near plane, and measured in
ANGLE/SwiftShader such line segments are dropped outright — the floor rendered
as horizontal bands with no converging lines and read as a flat backdrop. The
grid's near edge is therefore kept well in front of the closest camera any mode
produces, with margin; `tests/mrmah3d.test.js` derives that clearance from the
modes themselves so a new preset cannot quietly break it. Do not re-centre it
on the origin.

---

## What this pass does not do

No model loading (all geometry is procedural). No true bloom. No AI Chat or
MAH Protocol integration — the state API exists and is documented in
`../CLAUDE.md`, but nothing is wired. No production exposure. Those require
approval.
