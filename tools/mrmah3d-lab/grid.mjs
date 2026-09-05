/* Overlay a labelled 5% grid on an image so landmark widths can be read by eye.
   node grid.mjs <in.png> <out.png> [x0 y0 x1 y1 scale]  (optional crop fractions + upsample) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [IN, OUT, X0, Y0, X1, Y1, SC] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage();
const data = 'data:image/png;base64,' + readFileSync(IN).toString('base64');
const png = await p.evaluate(async ({ data, x0, y0, x1, y1, sc }) => {
  const img = new Image(); img.src = data; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const sx = Math.round(W * x0), sy = Math.round(H * y0), sw = Math.round(W * (x1 - x0)), sh = Math.round(H * (y1 - y0));
  const cv = document.createElement('canvas'); cv.width = Math.round(sw * sc); cv.height = Math.round(sh * sc);
  const ctx = cv.getContext('2d'); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  ctx.font = '13px monospace'; ctx.lineWidth = 1;
  for (let f = 0; f <= 1.0001; f += 0.05) {
    const X = Math.round(W * f), Y = Math.round(H * f);
    if (X >= sx && X <= sx + sw) { const px = (X - sx) * sc; ctx.strokeStyle = Math.round(f * 100) % 10 === 0 ? 'rgba(0,255,120,0.9)' : 'rgba(0,255,120,0.4)'; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, cv.height); ctx.stroke(); ctx.fillStyle = '#0f8'; ctx.fillText(Math.round(f * 100), px + 2, 12); }
    if (Y >= sy && Y <= sy + sh) { const py = (Y - sy) * sc; ctx.strokeStyle = Math.round(f * 100) % 10 === 0 ? 'rgba(255,80,255,0.9)' : 'rgba(255,80,255,0.4)'; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cv.width, py); ctx.stroke(); ctx.fillStyle = '#f6f'; ctx.fillText(Math.round(f * 100), 2, py - 2); }
  }
  return cv.toDataURL('image/png');
}, { data, x0: +(X0 || 0), y0: +(Y0 || 0), x1: +(X1 || 1), y1: +(Y1 || 1), sc: +(SC || 1) });
writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
await b.close();
