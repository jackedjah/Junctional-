/* Luminance histogram of a REGION of images served from the repo root.
   node bandhist.mjs <base> <x0,x1,y0,y1> <rel-or-abs.png> [more...]
   Files under the repo root are loaded via the static server; absolute paths
   elsewhere are read via file:// through a data URL. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const BASE = process.argv[2];
const box = process.argv[3].split(',').map(Number);
const files = process.argv.slice(4);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1400 } });
await p.goto(BASE + '/mrmah3d/lab/index.html', { waitUntil: 'domcontentloaded' });
const srcs = files.map(f => f.startsWith('/') && !f.startsWith('/reference')
  ? 'data:image/png;base64,' + readFileSync(f).toString('base64')
  : BASE + '/' + f.replace(/^\//, ''));
const res = await p.evaluate(async ({ srcs, box }) => {
  const out = [];
  for (const src of srcs) {
    const img = new Image(); img.src = src; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, H).data;
    const x0 = Math.floor(W * box[0]), x1 = Math.floor(W * box[1]);
    const y0 = Math.floor(H * box[2]), y1 = Math.floor(H * box[3]);
    const bands = new Array(8).fill(0);
    let n = 0, sum = 0, rs = 0, gs = 0, bs = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      bands[Math.min(7, Math.floor(l / 32))]++; n++; sum += l; rs += d[i]; gs += d[i + 1]; bs += d[i + 2];
    }
    out.push({ size: [W, H], mean: +(sum / n).toFixed(1), rgb: [rs / n, gs / n, bs / n].map(v => Math.round(v)),
      bands: bands.map(v => +(100 * v / n).toFixed(1)) });
  }
  return out;
}, { srcs, box });
files.forEach((f, i) => console.log(f.split('/').pop(), JSON.stringify(res[i])));
await b.close();
