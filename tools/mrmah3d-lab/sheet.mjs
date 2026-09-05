/* Contact sheet: lay N PNGs side by side (scaled to a common height) so a
   sequence can be judged in one look. Images must be served from the repo root
   OR be given as absolute paths (copied into validation/ temporarily).
   node sheet.mjs <out.png> <height> <label1=path1> <label2=path2> ... */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
const [OUT, H, ...items] = process.argv.slice(2);
const BASE = process.env.MRMAH_BASE || 'http://127.0.0.1:8123';
const ROOT = '/home/user/Junctional-';
const tmp = [];
const list = items.map((it, i) => {
  const eq = it.indexOf('='); const label = it.slice(0, eq); let path = it.slice(eq + 1);
  if (path.startsWith('/') && !path.startsWith(ROOT)) { const t = `validation/mrmah3d/_sheet_${i}.png`; copyFileSync(path, ROOT + '/' + t); tmp.push(ROOT + '/' + t); path = t; }
  else if (path.startsWith(ROOT)) path = path.slice(ROOT.length + 1);
  return { label, rel: path };
});
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2400, height: 1400 } });
await p.goto(BASE + '/mrmah3d/lab/index.html', { waitUntil: 'domcontentloaded' });
const dims = await p.evaluate(async ({ list, H }) => {
  const imgs = [];
  for (const it of list) { const im = new Image(); im.src = location.origin + '/' + it.rel; await im.decode(); imgs.push(im); }
  const widths = imgs.map(im => Math.round(im.naturalWidth * H / im.naturalHeight));
  const cv = document.createElement('canvas'); cv.id = 'sheet';
  cv.width = widths.reduce((a, b) => a + b + 6, 0); cv.height = H + 22;
  cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  let x = 0; ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff';
  imgs.forEach((im, i) => { ctx.drawImage(im, x, 22, widths[i], H); ctx.fillText(list[i].label, x + 4, 15); x += widths[i] + 6; });
  document.body.appendChild(cv);
  return [cv.width, cv.height];
}, { list, H: Number(H) });
writeFileSync(OUT, await p.locator('#sheet').screenshot());
await b.close();
tmp.forEach(t => { try { unlinkSync(t); } catch (e) {} });
console.log('wrote', OUT, dims);
