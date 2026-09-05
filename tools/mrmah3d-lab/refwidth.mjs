/* R102 — SILHOUETTE WIDTH PROFILE of a reference or a render.
   Mask: mode=ref  -> bright (luma > T) or strongly violet/blue pixels inside x bounds (the platinum body on a dark world)
         mode=mask -> any pixel that differs from the top-left background by > 24 (a bodymask.mjs capture)
   Per row: full extent (outermost char pixels) and the CENTRAL RUN (from the widest-run centre, extend until a gap
   of `gap` px), which is the torso/lower body alone where an arm hangs clear of it.
   Prints rows at `step`, normalised to the character's height (apex row 0 .. tip row 1) AND to width in units of
   character height, plus landmark widths. Writes an overlay when out.png is given.
   node refwidth.mjs <base> <png repo-relative> mode=ref|mask [x0=0.2 x1=0.8 y0=0 y1=1 T=48 gap=10 step=0.01 out=path label=..] */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const [BASE, IMG] = process.argv.slice(2);
const o = Object.fromEntries(process.argv.slice(4).map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1400 } });
await p.goto(BASE + '/mrmah3d/lab/index.html', { waitUntil: 'domcontentloaded' });
const r = await p.evaluate(async ({ IMG, o }) => {
  const img = new Image(); img.src = location.origin + '/' + IMG + '?t=' + Math.random(); await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;
  const x0 = Math.round(W * (o.x0 == null ? 0.2 : +o.x0)), x1 = Math.round(W * (o.x1 == null ? 0.8 : +o.x1));
  const y0 = Math.round(H * (o.y0 == null ? 0 : +o.y0)), y1 = Math.round(H * (o.y1 == null ? 1 : +o.y1));
  const T = o.T == null ? 48 : +o.T, gap = o.gap == null ? 10 : +o.gap;
  const bg = [d[(2 * W + 2) * 4], d[(2 * W + 2) * 4 + 1], d[(2 * W + 2) * 4 + 2]];
  const isChar = (x, y) => {
    const i = (y * W + x) * 4; const R = d[i], G = d[i + 1], B = d[i + 2];
    if (o.mode === 'mask') return x >= 24 && y >= 24 && x < W - 24 && y < H - 24 && Math.max(Math.abs(R - bg[0]), Math.abs(G - bg[1]), Math.abs(B - bg[2])) > 24;
    const l = 0.299 * R + 0.587 * G + 0.114 * B;
    // the platinum body is NEUTRAL (silver, graphite, near-black); the world behind it is violet mist and sky.
    // body = not violet, and above the sky's black
    const violet = (B - Math.max(R, G)) > (o.chroma == null ? 22 : +o.chroma);
    return !violet && l > T;
  };
  const mask = new Uint8Array(W * H);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (isChar(x, y)) mask[y * W + x] = 1;
  // apex / tip: first and last rows with any char pixel in the central 30%
  let apex = -1, tip = -1;
  for (let y = y0; y < y1; y++) { let any = 0; for (let x = Math.round(W * 0.35); x < W * 0.65; x++) if (mask[y * W + x]) { any = 1; break; } if (any) { if (apex < 0) apex = y; tip = y; } }
  const rows = [];
  const step = Math.max(1, Math.round((tip - apex) * (o.step == null ? 0.01 : +o.step)));
  for (let y = apex; y <= tip; y += step) {
    let left = -1, right = -1; const runs = [];
    let rs = -1;
    for (let x = x0; x <= x1; x++) {
      const on = x < x1 && mask[y * W + x];
      if (on) { if (left < 0) left = x; right = x; if (rs < 0) rs = x; }
      else if (rs >= 0) { runs.push([rs, x - 1]); rs = -1; }
    }
    // central run: the run nearest the frame's centre column (he is centred in every reference), then
    // bridge gaps smaller than `gap`
    let c = null;
    if (runs.length) {
      const cxF = W * (o.cx == null ? 0.5 : +o.cx);
      const dist = (rr) => rr[0] <= cxF && rr[1] >= cxF ? 0 : Math.min(Math.abs(rr[0] - cxF), Math.abs(rr[1] - cxF));
      runs.sort((a, b) => dist(a) - dist(b)); c = runs[0].slice();
      let grown = true;
      while (grown) { grown = false; for (const rr of runs) { if (rr[0] > c[1] && rr[0] - c[1] <= gap) { c[1] = rr[1]; grown = true; } if (rr[1] < c[0] && c[0] - rr[1] <= gap) { c[0] = rr[0]; grown = true; } } }
    }
    rows.push({ t: +((y - apex) / (tip - apex)).toFixed(3), full: left < 0 ? 0 : right - left + 1, run: c ? c[1] - c[0] + 1 : 0, cx: c ? (c[0] + c[1]) / 2 : null });
  }
  const hpx = tip - apex;
  const at = (t) => rows.reduce((best, r) => Math.abs(r.t - t) < Math.abs(best.t - t) ? r : best, rows[0]);
  const maxIn = (a, b, key) => rows.filter(r => r.t >= a && r.t <= b).reduce((m, r) => r[key] > m[key] ? r : m, { [key]: -1, t: a });
  const minIn = (a, b, key) => rows.filter(r => r.t >= a && r.t <= b).reduce((m, r) => r[key] < m[key] ? r : m, { [key]: 1e9, t: a });
  const u = (v) => +(v / hpx).toFixed(3);
  let png = null;
  if (o.out) {
    const od = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const k = i * 4; const on = mask[i]; od.data[k] = on ? 255 : d[k] * 0.25; od.data[k + 1] = on ? 255 : d[k + 1] * 0.25; od.data[k + 2] = on ? 255 : d[k + 2] * 0.25; od.data[k + 3] = 255; }
    ctx.putImageData(od, 0, 0);
    ctx.strokeStyle = 'magenta'; ctx.lineWidth = 2; ctx.strokeRect(x0, apex, x1 - x0, tip - apex);
    ctx.strokeStyle = 'rgba(0,255,120,0.9)';
    rows.forEach(r => { if (r.cx != null) { ctx.beginPath(); ctx.moveTo(r.cx - r.run / 2, apex + r.t * hpx); ctx.lineTo(r.cx + r.run / 2, apex + r.t * hpx); ctx.stroke(); } });
    png = cv.toDataURL('image/png');
  }
  return {
    frame: W + 'x' + H, apex, tip, heightPx: hpx,
    // landmarks in units of character height (apex→tip = 1): the head is ~0.20–0.24 of it
    landmarks: {
      headMax: u(maxIn(0.00, 0.20, 'run').run),
      shoulderMaxFull: u(maxIn(0.18, 0.36, 'full').full), shoulderMaxRun: u(maxIn(0.18, 0.36, 'run').run), shoulderT: maxIn(0.18, 0.36, 'run').t,
      latRun: u(maxIn(0.32, 0.44, 'run').run), latT: maxIn(0.32, 0.44, 'run').t,
      waistRun: u(minIn(0.40, 0.56, 'run').run), waistT: minIn(0.40, 0.56, 'run').t,
      hipRun: u(maxIn(0.50, 0.66, 'run').run), hipT: maxIn(0.50, 0.66, 'run').t,
      thighRun: u(at(0.70).run), kneeRun: u(minIn(0.72, 0.84, 'run').run), kneeT: minIn(0.72, 0.84, 'run').t,
      calfRun: u(maxIn(0.80, 0.94, 'run').run), calfT: maxIn(0.80, 0.94, 'run').t
    },
    profile: rows.filter((r, i) => i % 5 === 0).map(r => [r.t, u(r.full), u(r.run)]),
    png
  };
}, { IMG, o });
if (o.out && r.png) writeFileSync(o.out, Buffer.from(r.png.split(',')[1], 'base64'));
delete r.png;
console.log(o.label || IMG, JSON.stringify(r));
await b.close();
