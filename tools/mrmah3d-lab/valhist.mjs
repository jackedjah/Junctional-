/* R109 value architecture over a REGION of an image: eight luma bands plus the
   brief's three-class split — BLACK/GRAPHITE (luma < 48), PLATINUM/WHITE
   (luma >= 150 and chroma < 40), CYAN/THEME (cyan-family hue with chroma >= 28),
   and the remainder (dark-blue / midtone crystal).
   node valhist.mjs <base> <x0,x1,y0,y1> <rel-to-repo-root.png | /abs.png> [more...] */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const BASE = process.argv[2];
const box = process.argv[3].split(',').map(Number);
const files = process.argv.slice(4);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1400 } });
await p.goto(BASE + '/mrmah3d/lab/index.html', { waitUntil: 'domcontentloaded' });
const srcs = files.map(f => f.startsWith('/') && !f.startsWith('/reference') && !f.startsWith('/validation')
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
    let n = 0, sum = 0, black = 0, plat = 0, cyan = 0, blue = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4, r = d[i], g = d[i + 1], bl = d[i + 2];
      if (d[i + 3] < 8) continue;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      bands[Math.min(7, Math.floor(l / 32))]++; n++; sum += l;
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), ch = mx - mn;
      let h = 0;
      if (ch > 0) { if (mx === r) h = ((g - bl) / ch) % 6; else if (mx === g) h = (bl - r) / ch + 2; else h = (r - g) / ch + 4; h = (h * 60 + 360) % 360; }
      /* energy cyan: bright and saturated in the cyan band; the crystal's own
         dark blue (hue ~205-215, luma under 100) is counted as body midtone */
      const isCyan = ch >= 60 && h >= 170 && h <= 205 && l >= 100;
      if (l < 48 && !isCyan) black++;
      else if (isCyan) cyan++;
      else if (l >= 150 && ch < 40) plat++;
      else blue++;
    }
    out.push({ size: [W, H], px: n, mean: +(sum / n).toFixed(1),
      bands: bands.map(v => +(100 * v / n).toFixed(1)),
      black: +(100 * black / n).toFixed(1), platinum: +(100 * plat / n).toFixed(1), cyan: +(100 * cyan / n).toFixed(1), mid: +(100 * blue / n).toFixed(1) });
  }
  return out;
}, { srcs, box });
files.forEach((f, i) => console.log(f.split('/').pop(), JSON.stringify(res[i])));
await b.close();
