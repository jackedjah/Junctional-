/* MR.MAH 3D — REFERENCE COMPARISON.

   The measurement half of the required visual loop:

       REFERENCE -> RENDER -> COMPARE -> fix the largest mismatch -> repeat

   Renders the canonical view at the reference frame's own aspect, extracts the
   render's silhouette (trivial — the stage renders on a transparent
   background, so alpha IS the mask), and scores it against the reference
   silhouette measured by `mrmah3d-reference.mjs`.

   What it reports, in the brief's own priority order:
     1. silhouette   IoU of the two masks, aligned on the character box
     2. proportions  head width/height, head-vs-shoulder, widths at 64 heights
     3. composition  where the character sits in frame vs the reference
   plus a side-by-side image so the numbers can be checked by eye.

   Numbers are a guide, not the verdict. The mask is an outer envelope, so a
   high IoU means the proportions are right, NOT that the character looks
   right. Always open the side-by-side.

   Usage: node tools/mrmah3d-compare.mjs [baseUrl] [outDir] */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8123';
const OUT = process.argv[3] || 'validation/mrmah3d';
mkdirSync(OUT, { recursive: true });

const REF = JSON.parse(readFileSync(`${OUT}/REFERENCE_MEASUREMENTS.json`, 'utf8'));

/* Render at half the reference's pixel size; the silhouette comparison is
   scale-invariant and half size keeps the software rasteriser quick. */
const VW = Math.round(REF.image.width / 2);
const VH = Math.round(REF.image.height / 2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH + 260 }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + String(e)));

await page.goto(`${BASE}/mrmah3d/lab/index.html?canonical=1`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });

/* Freeze idle motion so the comparison is repeatable frame to frame. */
await page.evaluate(() => { window.__MRMAH_LAB.scene.setReducedMotion(true); });
await page.waitForTimeout(700);

const result = await page.evaluate((ref) => {
  const scene = window.__MRMAH_LAB.scene;

  /* Hide the world before reading the silhouette. The background structures
     are opaque geometry and were being counted as part of the character,
     which reported the body as 59% too wide near the tip. Isolating the
     subject is exact; no alpha threshold can do this reliably. */
  const world = scene.parts.stage.world;
  const worldWasVisible = world.visible;
  world.visible = false;
  scene.renderer.render(scene.scene, scene.camera);

  const c = document.querySelector('.lab-stage canvas');
  const g = document.createElement('canvas');
  g.width = c.width; g.height = c.height;
  const ctx = g.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(c, 0, 0);
  const W = g.width, H = g.height;
  const d = ctx.getImageData(0, 0, W, H).data;

  /* The render's character mask.

     Alpha alone is not enough: the environment (grid, motes, floor glow) also
     writes alpha. The character is isolated as the opaque, saturated mass in
     the central column — the world is drawn additively at low alpha, so a
     simple alpha cut separates them cleanly. */
  /* Threshold at 170, not at "any alpha". The floor starburst under the torso
     tip and the soft halos around the emissive parts are additive and land
     around alpha 140; at a low cut they were being counted as body, which
     inflated the character's height, dragged every landmark's t upward and
     reported the silhouette as 55% too wide near the tip. Solid geometry and
     the edge lines both write alpha well above this. */
  const mask = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (d[p * 4 + 3] > 170) mask[p] = 1;
  }

  /* Keep only the component connected to the frame's centre column, so the
     floor grid and background structures cannot inflate the silhouette. */
  const rows = [];
  for (let y = 0; y < H; y++) {
    let min = -1, max = -1, n = 0;
    for (let x = 0; x < W; x++) if (mask[x + y * W]) { if (min < 0) min = x; max = x; n++; }
    rows.push({ y, min, max, n, width: max >= 0 ? max - min + 1 : 0 });
  }
  /* The character is the tall run of rows that stays narrower than the frame;
     the floor spans it. */
  let top = -1, bottom = -1;
  for (let y = 0; y < H; y++) {
    const ok = rows[y].n > 2 && rows[y].width < W * 0.9;
    if (ok && top < 0) top = y;
    if (ok) bottom = y;
  }

  const Hc = bottom - top + 1;
  const left = Math.min(...rows.slice(top, bottom + 1).filter(r => r.n).map(r => r.min));
  const right = Math.max(...rows.slice(top, bottom + 1).filter(r => r.n).map(r => r.max));

  /* Silhouette vector at the same 64 heights the reference uses, normalised
     to character height so the comparison is scale-free. */
  const SAMPLES = ref.silhouette.length;
  const sil = [];
  for (let i = 0; i < SAMPLES; i++) {
    const y = Math.round(top + (Hc - 1) * (i / (SAMPLES - 1)));
    const r = rows[y];
    sil.push({
      t: +(i / (SAMPLES - 1)).toFixed(4),
      w: r && r.n ? +(r.width / Hc).toFixed(4) : 0,
      cx: r && r.n ? +(((r.min + r.max) / 2 - left) / Hc).toFixed(4) : null
    });
  }

  /* Head landmarks, found the same way the reference tool finds them:
     peak-then-valley, with no fixed window. A fixed "upper N%" window cannot
     work — the shoulders begin at t~0.27 while the head's lower vertex runs to
     t~0.34, so any window wide enough to contain the head also contains the
     shoulder line, and the shoulders are wider than the head. Walking down to
     the FIRST width maximum and then to the FIRST minimum finds the head and
     the neck regardless of where they sit. */
  const body = rows.slice(top, bottom + 1);
  const smooth = body.map((r, i) => {
    let s = 0, k = 0;
    for (let j = Math.max(0, i - 3); j <= Math.min(body.length - 1, i + 3); j++) { s += body[j].width; k++; }
    return { y: r.y, width: s / k, raw: r.width };
  });
  let hi = 0;
  while (hi + 1 < smooth.length && smooth[hi + 1].width >= smooth[hi].width) hi++;
  let lo = hi;
  while (lo + 1 < smooth.length && smooth[lo + 1].width <= smooth[lo].width) lo++;
  const headWidth = body[hi].width, headWidestY = body[hi].y;
  const neckY = body[lo].y, neckWidth = body[lo].width;

  const lower = body.filter(r => r.y > neckY);
  let shoulderWidth = -1, shoulderY = neckY;
  lower.forEach(r => { if (r.width > shoulderWidth) { shoulderWidth = r.width; shoulderY = r.y; } });

  /* Mask PNG for the side-by-side. */
  const mk = document.createElement('canvas');
  mk.width = W; mk.height = H;
  const mc = mk.getContext('2d');
  const im = mc.createImageData(W, H);
  for (let p = 0; p < W * H; p++) {
    const y = Math.floor(p / W);
    const on = mask[p] && y >= top && y <= bottom;
    im.data[p * 4] = on ? 255 : 0; im.data[p * 4 + 1] = on ? 255 : 0;
    im.data[p * 4 + 2] = on ? 255 : 0; im.data[p * 4 + 3] = 255;
  }
  mc.putImageData(im, 0, 0);

  /* Luminance of the character's own pixels, and how it is distributed.

     The reference character measures mean 68.2 with a wide spread — 33% of its
     pixels in the darkest eighth and 2.9% near-white. That distribution IS the
     crystal look: a dark body with sparse bright catches. Matching only the
     mean would allow a uniform mid-grey figure, which is why the spread is
     reported alongside it. */
  let lit = 0, lsum = 0, lmax = 0;
  const bins = new Array(8).fill(0);
  for (let p = 0; p < W * H; p++) {
    const y = Math.floor(p / W);
    if (!mask[p] || y < top || y > bottom) continue;
    const l = 0.2126 * d[p * 4] + 0.7152 * d[p * 4 + 1] + 0.0722 * d[p * 4 + 2];
    lit++; lsum += l; if (l > lmax) lmax = l;
    bins[Math.min(7, Math.floor(l / 32))]++;
  }
  const luma = {
    pixels: lit,
    mean: +(lsum / Math.max(1, lit)).toFixed(1),
    max: Math.round(lmax),
    distribution: bins.map(v => +(v / Math.max(1, lit) * 100).toFixed(1))
  };

  world.visible = worldWasVisible;
  scene.renderer.render(scene.scene, scene.camera);

  return {
    maskPng: mk.toDataURL('image/png'),
    frame: { width: W, height: H },
    character: {
      top, bottom, left, right, height: Hc, width: right - left + 1,
      topFrac: +(top / H).toFixed(4),
      bottomFrac: +(bottom / H).toFixed(4),
      heightFrac: +(Hc / H).toFixed(4),
      centerXFrac: +(((left + right) / 2) / W).toFixed(4)
    },
    landmarks: {
      headWidth, headHeight: neckY - top,
      headAspectWH: +(headWidth / Math.max(1, neckY - top)).toFixed(3),
      shoulderWidth,
      headWidthVsShoulder: +(headWidth / Math.max(1, shoulderWidth)).toFixed(3)
    },
    normalised: {
      headWidth: +(headWidth / Hc).toFixed(4),
      headHeight: +((neckY - top) / Hc).toFixed(4),
      shoulderWidth: +(shoulderWidth / Hc).toFixed(4),
      maxWidth: +((right - left + 1) / Hc).toFixed(4)
    },
    silhouette: sil,
    luma: luma,
    info: window.__MRMAH_LAB.info()
  };
}, REF);

writeFileSync(`${OUT}/render-mask.png`, Buffer.from(result.maskPng.split(',')[1], 'base64'));
writeFileSync(`${OUT}/render-canonical.png`, await page.locator('.lab-stage').screenshot());

/* ---- overlay ------------------------------------------------------------
   The instrument that actually drives the loop. Numbers say "13% too wide at
   t=0.46"; this says WHERE and WHICH PART. The two masks are scaled to a
   common character height and aligned on the character's own bounding box, so
   only shape is compared — never scale or position in frame.
     magenta = reference only   (render is missing mass here)
     green   = render only      (render has mass the reference does not)
     grey    = agreement                                                    */
const overlay = await page.evaluate(async ({ base, renderMask, ref, got }) => {
  async function load(src) {
    const i = new Image(); i.crossOrigin = 'anonymous'; i.src = src; await i.decode(); return i;
  }
  const refImg = await load(base + '/validation/mrmah3d/reference-mask.png');
  const rndImg = await load(renderMask);

  const CW = 620, CH = 900;                 /* common canvas */
  const pad = 40;
  const targetH = CH - pad * 2;

  function drawAligned(img, box) {
    const c = document.createElement('canvas');
    c.width = CW; c.height = CH;
    const x = c.getContext('2d', { willReadFrequently: true });
    const scale = targetH / box.height;
    const w = box.width * scale;
    /* align on the character box: same height, same centre */
    x.drawImage(img,
      box.left, box.top, box.width, box.height,
      CW / 2 - w / 2, pad, w, targetH);
    return x.getImageData(0, 0, CW, CH).data;
  }

  const A = drawAligned(refImg, ref);
  const B = drawAligned(rndImg, got);

  const out = document.createElement('canvas');
  out.width = CW; out.height = CH;
  const oc = out.getContext('2d');
  const im = oc.createImageData(CW, CH);
  let inter = 0, uni = 0;
  for (let p = 0; p < CW * CH; p++) {
    const a = A[p * 4] > 127, b = B[p * 4] > 127;
    if (a || b) uni++;
    if (a && b) inter++;
    let r = 8, g = 10, bl = 14;
    if (a && b) { r = 150; g = 155; bl = 160; }
    else if (a) { r = 226; g = 40; bl = 190; }
    else if (b) { r = 40; g = 226; bl = 130; }
    im.data[p * 4] = r; im.data[p * 4 + 1] = g; im.data[p * 4 + 2] = bl; im.data[p * 4 + 3] = 255;
  }
  oc.putImageData(im, 0, 0);
  oc.font = 'bold 15px monospace';
  oc.fillStyle = '#e228be'; oc.fillText('magenta = reference only', 12, 24);
  oc.fillStyle = '#28e282'; oc.fillText('green = render only', 12, 44);
  return { png: out.toDataURL('image/png'), iou: inter / Math.max(1, uni) };
}, {
  base: BASE,
  renderMask: result.maskPng,
  ref: { left: REF.character.left, top: REF.character.top, width: REF.character.width, height: REF.character.height },
  got: { left: result.character.left, top: result.character.top, width: result.character.width, height: result.character.height }
});
writeFileSync(`${OUT}/silhouette-overlay.png`, Buffer.from(overlay.png.split(',')[1], 'base64'));
delete result.maskPng;

/* ---- scoring ----------------------------------------------------------- */

/* Silhouette agreement: mean absolute width error across the 64 heights,
   expressed as a fraction of character height, converted to a 0-100 score.
   Widths are normalised by height on both sides, so this is pure shape. */
/* Scored over t = 0 .. 0.93 only. Below that the reference's own ground
   starburst merges with the torso tip and cannot be separated from it, so the
   reference silhouette's last 7% is contaminated (it reports width where the
   character has already tapered to a point). Excluding it compares the parts
   of the reference that are actually measurable. */
const T_MAX = 0.93;
let wErr = 0, n = 0, worst = [];
for (let i = 0; i < REF.silhouette.length; i++) {
  if (REF.silhouette[i].t > T_MAX) continue;
  const a = REF.silhouette[i].w, b = result.silhouette[i].w;
  const e = Math.abs(a - b);
  wErr += e; n++;
  worst.push({ t: REF.silhouette[i].t, ref: a, got: b, err: +e.toFixed(4) });
}
const meanErr = wErr / n;
const silScore = Math.max(0, 100 * (1 - meanErr / 0.35));
worst.sort((x, y) => y.err - x.err);

function delta(label, ref, got, tol) {
  const d = got - ref;
  const pct = ref ? (d / ref) * 100 : 0;
  const ok = Math.abs(pct) <= (tol || 8);
  return { label, ref, got, delta: +d.toFixed(4), pct: +pct.toFixed(1), ok };
}

const checks = [
  delta('character height / frame', REF.character.heightFrac, result.character.heightFrac, 6),
  delta('character top / frame', REF.character.topFrac, result.character.topFrac, 12),
  delta('head width / char height', REF.normalised.headWidth, result.normalised.headWidth, 10),
  delta('head aspect W:H', REF.landmarks.headAspectWH, result.landmarks.headAspectWH, 12),
  delta('shoulder width / char height', REF.normalised.shoulderWidth, result.normalised.shoulderWidth, 10),
  delta('head vs shoulder width', REF.normalised.headWidthVsShoulder, result.landmarks.headWidthVsShoulder, 12),
  delta('max width / char height', REF.normalised.maxWidth, result.normalised.maxWidth, 10)
];

console.log('\n=== MR.MAH REFERENCE COMPARISON ===');
console.log(`render ${result.frame.width}x${result.frame.height}   errors: ${errors.length || 'none'}`);
if (errors.length) console.log('  ' + errors.slice(0, 5).join('\n  '));
console.log(`\nSILHOUETTE SCORE  ${silScore.toFixed(1)} / 100   (mean width error ${(meanErr * 100).toFixed(2)}% of height)`);
console.log(`SILHOUETTE IoU    ${(overlay.iou * 100).toFixed(1)}%   (shape overlap, aligned on the character box)\n`);

console.log('PROPORTIONS                        reference     render     delta');
checks.forEach(c => {
  console.log(`  ${c.ok ? 'ok  ' : 'OFF '} ${c.label.padEnd(30)} ${String(c.ref).padStart(8)} ${String(c.got).padStart(10)} ${(c.pct > 0 ? '+' : '') + c.pct}%`);
});

console.log('\nLUMINANCE (character pixels only)');
console.log(`  reference   mean 68.2   spread ${JSON.stringify([33.4,28.4,14.8,8.5,5.6,3.5,2.9,2.9])}`);
console.log(`  render      mean ${result.luma.mean}   spread ${JSON.stringify(result.luma.distribution)}`);
console.log(`  ${Math.abs(result.luma.mean - 68.2) < 22 ? 'ok  ' : 'OFF '} mean within 22 of the reference`);

console.log('\nWORST SILHOUETTE MISMATCHES (t = fraction down the character):');
worst.slice(0, 8).forEach(w => {
  console.log(`  t=${w.t.toFixed(3)}  reference ${w.ref.toFixed(3)}  render ${w.got.toFixed(3)}  ` +
    `${w.got > w.ref ? 'TOO WIDE' : 'TOO NARROW'} by ${(w.err * 100).toFixed(1)}% of height`);
});

console.log('\nwidth profile   ref | render');
for (let i = 0; i < REF.silhouette.length; i += 3) {
  const a = REF.silhouette[i], b = result.silhouette[i];
  const bar = v => '#'.repeat(Math.round(v * 60));
  console.log(`  t=${a.t.toFixed(2)} ${bar(a.w).padEnd(42)} | ${bar(b.w)}`);
}

writeFileSync(`${OUT}/COMPARISON.json`, JSON.stringify({
  generatedAt: new Date().toISOString(),
  silhouetteScore: +silScore.toFixed(1),
  meanWidthError: +meanErr.toFixed(4),
  checks, worst: worst.slice(0, 12), render: result, errors
}, null, 2));

await browser.close();
console.log(`\nwrote ${OUT}/render-canonical.png, render-mask.png, COMPARISON.json`);
