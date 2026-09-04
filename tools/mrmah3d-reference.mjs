/* MR.MAH 3D — reference measurement.

   Turns the canonical front reference into numbers, so "does it match?" is a
   measurement rather than an opinion. Emits landmark proportions, a silhouette
   mask, and a per-row width profile that `mrmah3d-compare.mjs` scores against.

   Segmentation, and why it is done this way:

   The character's interior is a DARK crystal. Thresholding on brightness finds
   its glowing edges but loses the whole lower torso, which is darker than the
   background threshold — measured, that truncated the character at 78% of its
   real height. So brightness alone cannot define the body.

   Instead the void is flood-filled inward from the frame border. Anything the
   fill cannot reach is enclosed by a lit contour, which is exactly what the
   character is. That also catches the decorative background pyramids and every
   cell of the floor grid, so the character is then isolated as the connected
   component seeded inside the head, walked downward and cut where it merges
   into the ground starburst.

   Usage: node tools/mrmah3d-reference.mjs [baseUrl] [outFile] */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:8123';
const OUT = process.argv[3] || 'validation/mrmah3d/REFERENCE_MEASUREMENTS.json';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1800 } });

const data = await page.evaluate(async (base) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = base + '/reference/mrmah-canonical-front.png';
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;
  const lum = i => 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];

  /* 1. Flood the void inward from the border. */
  const VOID = 22;
  const bg = new Uint8Array(W * H);
  let stack = [];
  for (let x = 0; x < W; x++) stack.push(x, x + (H - 1) * W);
  for (let y = 0; y < H; y++) stack.push(y * W, W - 1 + y * W);
  while (stack.length) {
    const p = stack.pop();
    if (bg[p] || lum(p) > VOID) continue;
    bg[p] = 1;
    const x = p % W, y = (p - x) / W;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }

  /* 2. Seed inside the head: the brightest pixel in the upper-central frame. */
  let seed = -1, seedL = -1;
  for (let y = Math.floor(H * 0.12); y < Math.floor(H * 0.32); y++) {
    for (let x = Math.floor(W * 0.3); x < Math.floor(W * 0.7); x++) {
      const p = x + y * W;
      if (!bg[p] && lum(p) > seedL) { seedL = lum(p); seed = p; }
    }
  }

  /* 3. Connected component from that seed across everything not-void, bounded
        to a region of interest.

        The bound is required, not tidiness: the decorative pyramids flanking
        the stage have their own lit base flares, and those regions connect to
        the character through enclosed dark floor cells. Unbounded, the
        component swallowed them and reported a character 924px wide in a
        940px frame. The ROI is set generously wider than the character's own
        reach (its hands span roughly x 165..850) and is confirmed against the
        emitted mask. */
  /* y1 is the torso tip. It is measured, not eyeballed: the torso's span
     tapers linearly from 194px at y=1150 to 83px at y=1290 (about -0.79px per
     row) and that line reaches zero at y≈1395, while the ground contact
     starburst peaks at y≈1380. The tip is taken at 1370, just above the flare,
     so the character's height excludes its own floor glow. */
  const ROI = { x0: 150, x1: 860, y0: 235, y1: 1370 };
  const comp = new Uint8Array(W * H);
  stack = [seed];
  while (stack.length) {
    const p = stack.pop();
    if (comp[p] || bg[p]) continue;
    const x = p % W, y = (p - x) / W;
    if (x < ROI.x0 || x > ROI.x1 || y < ROI.y0 || y > ROI.y1) continue;
    comp[p] = 1;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }

  const rowOf = m => {
    const r = [];
    for (let y = 0; y < H; y++) {
      let min = -1, max = -1, n = 0;
      for (let x = 0; x < W; x++) if (m[x + y * W]) { if (min < 0) min = x; max = x; n++; }
      r.push({ y, min, max, n, width: max >= 0 ? max - min + 1 : 0 });
    }
    return r;
  };
  const rows = rowOf(comp);

  /* 4. Top of the head, then walk down and cut where the component bleeds into
        the ground starburst and grid (a sudden full-width row). */
  let top = rows.findIndex(r => r.n > 0);
  let bottom = H - 1;
  for (let y = top; y < H; y++) {
    if (rows[y].width > W * 0.9) { bottom = y - 1; break; }
    if (rows[y].n === 0) { bottom = y - 1; break; }
  }
  /* The starburst flare is wider than the body but narrower than the frame.
     Trim trailing rows that are far wider than the local torso trend. */
  for (let y = bottom; y > top + 20; y--) {
    const ref = rows[y - 12] ? rows[y - 12].width : 0;
    if (ref && rows[y].width > ref * 1.6) bottom = y - 1; else break;
  }

  const body = rows.slice(top, bottom + 1);
  const left = Math.min(...body.filter(r => r.n).map(r => r.min));
  const right = Math.max(...body.filter(r => r.n).map(r => r.max));
  const Hc = bottom - top + 1;

  /* 5. Landmarks: peak-then-valley, with NO fixed window.

        A fixed "upper N%" window cannot separate the head here. The shoulders
        begin around t=0.27 while the head's lower vertex runs to about t=0.34,
        so any window wide enough to hold the whole head also holds the
        shoulder line — and since the shoulders are wider than the head, the
        "widest row in the head" then reports the shoulders. Measured, that
        returned a 603px head against a true 366px one.

        Walking down to the FIRST width maximum finds the head's widest row,
        and continuing to the FIRST minimum finds the neck, wherever they are.
        Widths are smoothed first so facet noise cannot fake a turning point. */
  const smooth = body.map(function (r, i) {
    var s = 0, k = 0;
    for (var j = Math.max(0, i - 3); j <= Math.min(body.length - 1, i + 3); j++) { s += body[j].width; k++; }
    return { y: r.y, width: s / k };
  });
  var hi = 0;
  while (hi + 1 < smooth.length && smooth[hi + 1].width >= smooth[hi].width) hi++;
  var lo = hi;
  while (lo + 1 < smooth.length && smooth[lo + 1].width <= smooth[lo].width) lo++;
  const headWidth = body[hi].width, headWidestY = body[hi].y;
  const neckY = body[lo].y, neckWidth = body[lo].width;

  const lower = body.filter(r => r.y > neckY);
  let shoulderY = neckY, shoulderWidth = -1;
  lower.forEach(r => { if (r.width > shoulderWidth) { shoulderWidth = r.width; shoulderY = r.y; } });

  /* Torso-only width (excluding arms) sampled just under the neck, where the
     arms have not yet separated from the shoulder mass. */
  const headRows = body.filter(r => r.y >= top && r.y <= neckY);
  const headTopY = top;

  const profile = body.map(r => ({
    t: +((r.y - top) / (Hc - 1)).toFixed(4),
    y: r.y, min: r.min, max: r.max, w: r.width,
    cx: r.n ? +((r.min + r.max) / 2).toFixed(1) : null
  }));

  /* 6. Mask image for visual confirmation and for IoU scoring. */
  const mk = document.createElement('canvas');
  mk.width = W; mk.height = H;
  const mc = mk.getContext('2d');
  const out = mc.createImageData(W, H);
  for (let p = 0; p < W * H; p++) {
    const y = Math.floor(p / W);
    const on = comp[p] && y >= top && y <= bottom;
    out.data[p * 4] = on ? 255 : 0;
    out.data[p * 4 + 1] = on ? 255 : 0;
    out.data[p * 4 + 2] = on ? 255 : 0;
    out.data[p * 4 + 3] = 255;
  }
  mc.putImageData(out, 0, 0);

  /* Normalised silhouette: width and centre at 64 evenly spaced heights.
     This is the vector the render is scored against. */
  const SAMPLES = 64;
  const silhouette = [];
  for (let i = 0; i < SAMPLES; i++) {
    const y = Math.round(top + (Hc - 1) * (i / (SAMPLES - 1)));
    const r = rows[y];
    silhouette.push({
      t: +(i / (SAMPLES - 1)).toFixed(4),
      w: r.n ? +((r.width) / Hc).toFixed(4) : 0,
      cx: r.n ? +(((r.min + r.max) / 2 - left) / Hc).toFixed(4) : null
    });
  }

  return {
    maskPng: mk.toDataURL('image/png'),
    image: { width: W, height: H, aspect: +(W / H).toFixed(4) },
    character: {
      top, bottom, left, right, height: Hc, width: right - left + 1,
      centerX: +((left + right) / 2).toFixed(1),
      /* where the character sits in the frame, which the camera must match */
      topFrac: +(top / H).toFixed(4),
      bottomFrac: +(bottom / H).toFixed(4),
      heightFrac: +(Hc / H).toFixed(4),
      centerXFrac: +(((left + right) / 2) / W).toFixed(4)
    },
    landmarks: {
      headTopY, headWidestY, headWidth,
      headHeight: neckY - top,
      headAspectWH: +(headWidth / (neckY - top)).toFixed(3),
      neckY, neckWidth,
      shoulderY, shoulderWidth,
      bottomPointY: bottom
    },
    normalised: {
      headHeight: +((neckY - top) / Hc).toFixed(4),
      headWidth: +(headWidth / Hc).toFixed(4),
      neckWidth: +(neckWidth / Hc).toFixed(4),
      neckAtT: +((neckY - top) / Hc).toFixed(4),
      shoulderWidth: +(shoulderWidth / Hc).toFixed(4),
      shoulderAtT: +((shoulderY - top) / Hc).toFixed(4),
      maxWidth: +((right - left + 1) / Hc).toFixed(4),
      headWidthVsShoulder: +(headWidth / shoulderWidth).toFixed(3)
    },
    silhouette,
    profile: profile.filter((_, i) => i % 16 === 0)
  };
}, BASE);

await browser.close();
mkdirSync(dirname(OUT), { recursive: true });
const maskPng = data.maskPng;
delete data.maskPng;
writeFileSync(OUT, JSON.stringify(data, null, 2));
writeFileSync(dirname(OUT) + '/reference-mask.png', Buffer.from(maskPng.split(',')[1], 'base64'));

console.log('image      ', JSON.stringify(data.image));
console.log('character  ', JSON.stringify(data.character));
console.log('landmarks  ', JSON.stringify(data.landmarks));
console.log('normalised ', JSON.stringify(data.normalised, null, 1));
console.log('\nwidth profile (fraction of character height):');
data.profile.forEach(p => {
  console.log(`  t=${p.t.toFixed(3)}  y=${String(p.y).padStart(4)}  w=${String(p.w).padStart(4)}  cx=${String(p.cx).padStart(6)}  ${'#'.repeat(Math.round(p.w / 14))}`);
});
