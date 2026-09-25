# MAHFITT companion — smooth app package

Integration-ready release; production is unchanged. The FINAL_POLISH visual masters are pixel-identical. Both characters include the required common set, 19 states and 488 frames each. Sources and identity are unchanged.

## Install

Extract `MAHFITT_COMPANION_APP.zip` into a same-origin static directory, preserving the included folder layout. Serve over HTTP(S), not file://. No dependencies, credentials, remote image services or build step are required. Demo: `11_PROTOTYPE/SMOOTH_APP/index.html`.

```js
import { mountCompanion } from '/companion/11_PROTOTYPE/SMOOTH_APP/component.js';

const mascot = await mountCompanion(document.querySelector('#mascot'), {
  character: 'female', theme: 'blue',
  onError: error => console.error('Companion asset error', error)
});
await mascot.setCharacter('male'); // male | female
await mascot.setTheme({ secondary: '#008cff' }); // also named palettes or #RRGGBB
await mascot.play('wave_greet');
await mascot.returnToIdle();
// On component unmount:
mascot.dispose();
```

Use the app's existing theme store for live changes:

```js
mascot.bindTheme({
  getSnapshot: () => ({ secondary: appThemeStore.getState().secondary }),
  subscribe: notify => appThemeStore.subscribe(notify)
});
```

The subscription is removed by `dispose()`. Its returned unsubscribe function is idempotent. Named palettes: blue, gold, red, purple, pink, green. Only the separate indexed Theme pixels recolor; graphite/black and neutral silver/white stay locked. Blue is the default active secondary color, not a fixed body-wide tint.

Alternative: import `component.js`, then use `<mahfitt-companion character="female" theme="blue"></mahfitt-companion>`. The element exposes the same four APIs and emits `companion-ready` and `companion-error`. For a framework, prefer the mount helper inside the framework's mount/unmount lifecycle. A raw `MahfittCompanion(canvas, options)` class is exported from `runtime.js`.

## Motion and display

`idle_neutral`, `idle_long`, `think_loop`, `wave_greet`, `celebrate_small`, `point_up`, `point_down`, `point_left`, `point_right`, `point_up_left`, `point_up_right`, `point_down_left`, `point_down_right`, `dance_a`, `dance_b` are available for both characters. Front/three-quarter masters and look-left/right are also retained. Non-looping gestures return to idle automatically.

Playback uses requestAnimationFrame and elapsed timestamps, targeting a 60 Hz display (higher-refresh displays work too). Frame durations, not callback counts, control state timing. Gesture/dance movement uses 40–45 ms breakdown spacing and intentional pose holds; idles use fewer drawings. Hidden tabs pause the clock; resume avoids a time jump. Browser/device scheduling determines actual refresh rate; this is not 60 unique sprite drawings per second.

Frames are decoded and theme-composited before a state starts, with small preparation yields to keep the current state responsive. Playback performs only crisp canvas copies when the frame changes. No cross-fades, filtering or interpolated raster images. Cache is bounded to three prepared states and three atlas page pairs. Respect `prefers-reduced-motion`; override through `setReducedMotion(true/false)`. Also available: `pause()`, `resume()`, `getPlaybackStats()` and `dispose()`.

The existing 512×512 export / 256×256 authored pixel grid is unchanged. Default app display is 256 CSS pixels. Use integer display multiples and `image-rendering: pixelated`; do not apply CSS blur, canvas smoothing, or fractional scale transforms.

## Verification

`07_ANIMATION_SOURCE/SMOOTH_APP/checks.json` verifies locked master pixels, unchanged neutral theme pixels, atlas references, locked facial pixels, and fixed arm segments across every generated frame. Maximum relative limb-length error is below 1.2e-15. `node 13_DOCS/scripts/test_smooth_runtime.mjs` checks timing, 60 Hz simulated callbacks, visibility, pause/resume, reduced motion, return-to-idle, live theme subscription and cleanup. Browser playback is additionally checked through the packaged demo.

Re-export with `MAHFITT_RELEASE_TAG=SMOOTH_APP` and the existing `13_DOCS/scripts/common_pixel_author.py`. The prior FINAL_POLISH assets remain preserved. Production app integration is intentionally a separate branch/package, not an automatic merge or deployment.
