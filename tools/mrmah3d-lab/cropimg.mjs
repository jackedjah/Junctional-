/* node cropimg.mjs <in.png> <out.png> x0 y0 x1 y1 [scale]   — fractions of the image; scale upsamples (nearest) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [IN, OUT, x0, y0, x1, y1, SC] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
const data = 'data:image/png;base64,' + readFileSync(IN).toString('base64');
const png = await p.evaluate(async ({ data, x0, y0, x1, y1, sc }) => {
  const img = new Image(); img.src = data; await img.decode();
  const sx = Math.round(img.naturalWidth * x0), sy = Math.round(img.naturalHeight * y0);
  const sw = Math.round(img.naturalWidth * (x1 - x0)), sh = Math.round(img.naturalHeight * (y1 - y0));
  const cv = document.createElement('canvas'); cv.width = Math.round(sw * sc); cv.height = Math.round(sh * sc);
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = sc <= 1;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/png');
}, { data, x0: +x0, y0: +y0, x1: +x1, y1: +y1, sc: SC ? +SC : 1 });
writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
await b.close();
