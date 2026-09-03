# MR.MAH 3D — PHASE 0 + PHASE 1 IMPLEMENTATION REPORT

**Isolated real-time 3D laboratory. Experimental. Not in production.**

Branch `claude/mrmah-3d-renderer-poc-1nyunz`. Additive only — no MAHFITT
production file is modified or included. See `MRMAH3D_MERGE_TARGET.txt`.

---

## A. Inspection findings

The repository supplied to this session (`jackedjah/Junctional-`) was **empty**
— no commits, no branches. The only MAHFITT source available was the uploaded
R83 changed-files archive, which contained complete copies of `mygym.js`
(8,048 lines), `mygym.css` (5,940 lines) and `netlify/functions/mygym.js`
(2,546 lines). That was enough to establish the conventions below from source
rather than from assumption. The other repository visible to this account,
`jackedjah/jacked-launch-pad`, was checked and is an unrelated Lovable/Vite
React project containing no MAHFITT code.

| Question | Answer from the source |
| --- | --- |
| Framework / runtime | none — vanilla JS, no bundler, no build step |
| Module loading | plain `<script defer src>` with cache-busting query strings |
| Entry point | `shell()` in `netlify/functions/mygym.js` generates the HTML |
| Static assets | served from repository root (`/mygym.js`, `/mygym.css`) |
| Routing | `?entry=slots\|tracker\|meals\|calendar` + client `S.view` switching |
| Backend | Netlify Functions (CommonJS), Supabase |
| Tests | plain `node tests/*.test.js`, no framework, no runner |
| Mr.Mah owner | `fabiRigHTML()` — one inline SVG, `viewBox 0 0 420 560` |
| Shared by | AI Chat **and** MAH Protocol, same rig |
| Current "3D" | CSS only: `perspective(470px) rotateX(64deg)` on `.fabi-grid` |
| Breakpoints | 380 / 560 / 768 px, plus `max-height:460 landscape` |
| Reduced motion | already honoured throughout `mygym.css` |

**Chosen integration boundary:** a standalone document at
`/mrmah3d/lab/index.html` that loads no MAHFITT script or stylesheet. This
requires **zero** modification to any production file — the shell, `mygym.js`
and `mygym.css` are untouched — which is the most reversible boundary
available. Reverting is `rm -rf` of the added paths.

**Graphics technology:** Three.js 0.185.1, **vendored** at
`mrmah3d/vendor/three/` (MIT). The project has no bundler and no package
manager in the delivered tree, so vendoring the ES-module build is the only
option consistent with its conventions. `three.module.min.js` imports
`three.core.min.js` as a relative sibling, so no import map is needed.
~750 KB raw / ~187 KB gzipped, loaded **only** by the lab page.

---

## B. What was built

`mrmah3d/core/` — eleven modules, one public entry point.

| Module | Owns |
| --- | --- |
| `mrmah-scene.js` | **the only public API**: `createMrMahScene(host, opts)` |
| `renderer.js` | WebGLRenderer, canvas, drawing-buffer size, context lifetime |
| `stage.js` | Scene, linear fog, `world` / `subject` roots |
| `camera.js` | PerspectiveCamera, responsive framing |
| `lights.js` | key / fill / rim / hemisphere / ambient |
| `environment.js` | shadow-catching ground + perspective grid |
| `character.js` | **Phase 1 placeholder** — the swap point for the real model |
| `interaction.js` | pointer drag → yaw |
| `quality.js` | device tier, DPR caps, downward-only degrade |
| `lifecycle.js` | RAF loop and every reason to stop it |
| `palette.js` | reads MAHFITT theme tokens from CSS at mount |

Phase 1 brief items, all present: dark isolated stage · real perspective camera
· primitive geometry with physical depth · directional key light · fill and rim
· perspective floor grid · atmospheric depth (linear fog) · stable resize ·
stable on mobile viewports · screen-to-3D drag interaction.

### Framing derived, not invented

The camera reproduces the framing members already see. `.fabi-grid`'s
`perspective(470px)` at the stage heights in use is a **55° vertical FOV**, and
`rotateX(64deg)` is a **26° downward pitch**. Both are used verbatim, so the
real renderer inherits the accepted stage language instead of introducing a new
one that would need re-approval.

---

## C. Two real defects found by looking at the render

The first verification pass reported **60/60 checks passing** against a frame
that was visibly wrong. Both faults were found by opening the screenshot, and
both are now covered by assertions that would have caught them.

**1. The floor had no perspective.** Every line running along Z was missing;
the floor rendered as flat horizontal bands. Cause: a grid centred on the
origin spans z = +20..−20 while the camera sits at z ≈ +6.5, so every Z-line
straddles the near plane. Measured in ANGLE/SwiftShader, such segments are
dropped outright. A hand-built control line starting at z = +5 — in front of
the camera — rendered correctly, which isolated it. Fixed by sizing the grid to
the visible region (`size 28`, `centerZ −9`), which is also less geometry. A
second, independent fault was found in the same area: the grid shared a plane
with the shadow-catcher and lost half its remaining lines to z-fighting; the
grid was lifted to y = 0.02 and the shadow catcher no longer writes depth.
Measured: converging rows **0 → 350**, lateral rows **9 → 20**.

**2. The figure rendered as a near-black silhouette.** 83% of its pixels fell
in the darkest luminance eighth with no separable planes. Two causes. The key
light sat on the exact 45° diagonal between the torso's front and left faces,
so both returned the same N·L and rendered at an identical value — the box lost
its corner. And the placeholder used the finished character's albedo, at which
a primitive stack simply has no readable shading. Fixed by moving the key
forward and giving the placeholder a deliberately neutral, non-theme-derived
slate (`palette.placeholder`). Measured: **7** distinct luminance plateaus
across a **176**-luma spread.

A third, latent fault was found by a stress case: the camera's narrow-aspect
compensation was unbounded and reached a 94° FOV on a very narrow stage. Now
clamped to 75°.

---

## D. Mobile performance

- **DPR capped by tier** — 1 / 1.5 / 2, never `devicePixelRatio` uncapped —
  plus a 2.6 MP total-pixel budget that pulls the cap in further on large
  surfaces. Verified: on a DPR 3 device the three tiers resolve to 1 / 1.5 / 2.
- **The loop stops** on hidden tab, on `pagehide` (which iOS Safari fires when
  `visibilitychange` does not), when the element leaves the viewport, and on
  explicit pause. Verified: frame counter frozen while hidden.
- **`destroy()` releases the WebGL context** via `WEBGL_lose_context`, not just
  `renderer.dispose()`. Verified: `gl.isContextLost() === true` after destroy,
  and six mount/destroy cycles all succeed — the case that matters in a
  single-page app where browsers cap live contexts.
- **`prefers-reduced-motion` honoured** — idle motion disabled, still renders.
- **Degrade is downward only**, after sustained cost, never on one spike.
- Resize is driven by `ResizeObserver` on the host, not `window.resize`, so a
  drawer opening or an iPad rotating is tracked.
- Cost at rest: **9 draw calls, 274 triangles, 0.24 ms/frame**.

---

## E. Tests actually run

| Command | Result |
| --- | --- |
| `node tests/mrmah3d-phase1.test.js` | **90 / 90 PASS** |
| `node tools/mrmah3d-verify.mjs` (real Chromium, WebGL 2.0) | **84 / 84 PASS** |
| `node --check mygym.js` | OK |
| `node --check netlify/functions/mygym.js` | OK |
| `node tests/r83-mrmah-visibility-closure.test.js` | 61/61 reached assertions PASS |
| `node tests/r82-mrmah-micro-specular-edge.test.js` | 69/69 reached assertions PASS |

Runtime coverage: mount, no console errors, no failed requests, real WebGL
context, frames advancing, geometry uploaded, lit pixels, specular present,
stage stays dark, grid convergence, plane separation, drag rotates the subject,
pause/resume, hidden-tab stop, context release, six mount/destroy cycles,
seven viewports (320 / 375 / 393 / 430 / iPad portrait / iPad landscape / phone
landscape / desktop), live resize, FOV clamp, three quality tiers, shadow
rendering, reduced motion.

**The two inherited R82/R83 suites** each pass every assertion they reach and
then abort on a missing `sw.js` — an unchanged production asset the archive
deliberately excludes. This is the partial checkout, not a regression: those
files were never touched, and are not part of this branch.

---

## F. Not claimed

- **No physical iPhone/iPad Safari validation.** All rendering evidence is
  headless Chromium on a **software rasteriser** (ANGLE/SwiftShader). That is
  good evidence for geometry, lighting, lifecycle and layout, and it is **not**
  evidence about real Retina hardware, real GPU drivers, or real thermal and
  battery behaviour. Device acceptance is still required.
- No claim that the placeholder resembles Mr.Mah. It does not, deliberately.
- No performance claim on a real mobile GPU. The 0.24 ms figure is software
  rasterisation of 274 triangles and should not be extrapolated.
- The grid near-plane fault was diagnosed on SwiftShader; a hardware driver may
  clip those segments correctly. The fix is correct either way and draws less.

---

## G. Stop condition

Phase 1 is complete and verified. **Stopping here as instructed.** Not started:
Mr.Mah art direction, the blue-reference recreation, model loading, materials,
animation states, particles, AI Chat integration, MAH Protocol integration.
Each requires explicit approval.
