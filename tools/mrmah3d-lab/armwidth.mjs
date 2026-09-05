/* node armwidth.mjs <in.png> x0 x1 y0 y1 [thr]
   Scans rows y0..y1 (fractions) of a clay capture and prints, every 2.5% of
   the image height, the width in px of the bright (character) run found
   between x0..x1 (fractions) — the widest contiguous run above `thr` luma. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const [IN, x0, x1, y0, y1, THR] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
const data = 'data:image/png;base64,' + readFileSync(IN).toString('base64');
const rows = await p.evaluate(async ({ data, x0, x1, y0, y1, thr }) => {
  const img = new Image(); img.src = data; await img.decode();
  const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
  const W = cv.width, H = cv.height;
  const d = ctx.getImageData(0, 0, W, H).data;
  const out = [];
  const X0 = Math.round(W * x0), X1 = Math.round(W * x1);
  for (let fy = y0; fy <= y1; fy += 0.025) {
    const y = Math.round(H * fy);
    let best = 0, bl = -1, br = -1, run = 0, rs = 0;
    for (let x = X0; x <= X1; x++) {
      const i = (y * W + x) * 4;
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (l > thr) { if (run === 0) rs = x; run++; if (run > best) { best = run; bl = rs; br = x; } }
      else run = 0;
    }
    out.push({ y: fy.toFixed(3), px: y, width: best, left: bl, right: br });
  }
  return { W, H, out };
}, { data, x0: +x0, x1: +x1, y0: +y0, y1: +y1, thr: THR ? +THR : 70 });
console.log(JSON.stringify({ W: rows.W, H: rows.H }));
for (const r of rows.out) console.log(r.y, r.px, 'w', r.width, r.left, r.right);
await b.close();
