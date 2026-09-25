# MAHFITT pixel companion — final polish

Integration-ready companion package; no production app files or deployment settings are modified.
The two owner GLBs remain unchanged in `00_SOURCE_UNTOUCHED`. The existing approved reference, source facial pixels, authoring scripts, final layered frames, atlases, manifests and review art are preserved. Earlier local passes are not deleted.

## Contents

- 19 states per character: two static masters and 17 animations, including all eight pointing directions, two dances, three idles/thinking, two looks, wave and compact celebration.
- 181 frames per character. Unchanged 256×256 authored pixel grid, 512×512 nearest-neighbor exports; binary transparency.
- Deterministic two-link arm rotations; no stretching/scaling. Every generated frame is checked for canvas clipping and segment-length invariance.
- Same compact face vocabulary with a subtle helmet bevel, brighter hard-edged facial cores and female-only outer lashes.
- Five-level indexed theme material. Black/graphite and neutral silver/white remain unchanged; the blue set represents the app secondary/theme color.

## Integration

Deploy these folders together, keeping their relative structure:

- `09_ATLASES/FINAL_POLISH`
- `10_MANIFEST/FINAL_POLISH`
- `11_PROTOTYPE/FINAL_POLISH`

The GLBs, source frames and reviews are authoring/archive inputs, not runtime downloads.

```html
<canvas id="companion" width="512" height="512"
  style="width:256px;height:256px;image-rendering:pixelated"></canvas>
<script type="module">
  import { MahfittCompanion } from './11_PROTOTYPE/FINAL_POLISH/runtime.js';
  const mascot = new MahfittCompanion(document.querySelector('#companion'));
  await mascot.setCharacter('female');
  mascot.setTheme('blue');
  // Bind the actual app secondary color when available:
  // mascot.setThemeColor('#1ca4f2');
  await mascot.play('point_up_right');
  // Non-looping gestures return to idle automatically.
  // On component unmount: mascot.dispose();
</script>
```

Use `setReducedMotion(true)` to retain informative held gesture poses while disabling loops.
For the provided demo, serve `27_PIXEL_COMPANION` over HTTP and open `11_PROTOTYPE/FINAL_POLISH/index.html`.

## Rebuild

Python with Pillow and NumPy on the existing Windows authoring machine:

```text
python 13_DOCS/scripts/common_pixel_author.py
```

This reuses the established exporter and runtime template. It only regenerates the final-polish common package, not the old extended animation library.
`07_ANIMATION_SOURCE/FINAL_POLISH/checks.json` contains frame/face/arm/atlas/theme checks.
`12_REVIEW_PROOFS/FINAL_POLISH/THEME_CONFIRMATION.png` shows blue and one alternate palette with unchanged neutral pixels.

The dedicated package branch is intended for later app integration. Production is intentionally not merged or deployed.
