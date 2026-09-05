/* MAHTROPOLIS Arrival Gate (study v1) — actual-runtime capture.
   Serves the working tree to headless Chromium, loads mahworld/scene/arrival-gate/plaza.html
   (the same page a phone would open), and records what the running scene
   draws: three authored views as PNG and the Tour camera move as WebM plus a
   six-frame contact sheet. Nothing here is generated art: every pixel comes
   from the WebGL renderer at run time.
   Run: node tests/mahworld-arrival-gate-capture.js   (writes validation/mahworld/arrival-gate/) */
'use strict';
const fs = require('fs'), p = require('path');
const ROOT = p.resolve(__dirname, '..');
const OUT = p.join(ROOT, 'validation/mahworld/arrival-gate');
let pw = null;
const candidates = ['playwright'];
if (process.env.PLAYWRIGHT_MODULE) candidates.unshift(process.env.PLAYWRIGHT_MODULE);
try { candidates.push(p.join(require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright')); } catch (e) {}
for (const cand of candidates) { try { pw = require(cand); break; } catch (e) {} }
if (!pw) { console.log('mahworld-arrival-gate-capture: SKIP (playwright is not installed)'); process.exit(0); }
const { chromium } = pw;
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain', '.woff2': 'font/woff2' };
const HOST = 'https://mahworld.test';

async function serve(page) {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== HOST) return route.abort();   /* fonts and anything external: the scene must stand alone */
    const f = p.join(ROOT, decodeURIComponent(u.pathname));
    if (f.indexOf(ROOT) === 0 && fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[p.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });
}
async function open(page, query) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  await page.goto(HOST + '/mahworld/scene/arrival-gate/plaza.html' + (query || ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.MAHWORLD_PLAZA && window.MAHWORLD_PLAZA.state.frames > 5, null, { timeout: 60000 });
  await page.evaluate(() => window.MAHWORLD_PLAZA.ready);
  return errors;
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  console.log('chromium', browser.version());
  const report = { ranAt: new Date().toISOString(), renderer: 'three@0.185.1 (mahworld/vendor/three, byte-identical to mrmah3d/vendor/three)', device: 'iPhone-class portrait 390x844 @2x and landscape 1280x720 @1', views: [], tour: null, errors: [] };

  /* ---- three views, portrait phone and landscape -------------------------- */
  for (const [label, vp, scale] of [['phone', { width: 390, height: 844 }, 2], ['wide', { width: 1280, height: 720 }, 1]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: scale, isMobile: label === 'phone', hasTouch: label === 'phone' });
    const page = await ctx.newPage(); await serve(page);
    const errors = await open(page, '?hud=0');
    const gl = await page.evaluate(() => { const r = window.MAHWORLD_PLAZA.renderer; const info = r.info; return { drawCalls: info.render.calls, triangles: info.render.triangles, programs: info.programs.length, pixelRatio: r.getPixelRatio() }; });
    for (const view of ['arrival', 'ascent', 'threshold']) {
      await page.evaluate(v => window.MAHWORLD_PLAZA.setView(v, { instant: true }), view);
      await page.waitForTimeout(700);   /* let the rain and glow settle for a few frames */
      const file = `view-${view}-${label}.png`;
      await page.screenshot({ path: p.join(OUT, file) });
      const ms = await page.evaluate(() => window.MAHWORLD_PLAZA.state.ms);
      report.views.push({ view, label, file, msPerFrameSoftwareGL: Number(ms.toFixed(1)), ...gl });
      console.log('captured', file, 'draws', gl.drawCalls, 'tris', gl.triangles, 'ms', ms.toFixed(1));
    }
    report.errors.push(...errors.map(e => label + ': ' + e));
    await ctx.close();
  }

  /* ---- the camera move: Tour recorded as video + contact sheet ------------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: { width: 960, height: 540 } } });
    const page = await ctx.newPage(); await serve(page);
    const errors = await open(page, '?hud=0');
    const frames = [];
    const t0 = Date.now();
    const tour = page.evaluate(() => window.MAHWORLD_PLAZA.tour({ hold: 700, leg: 3200 }));
    for (let i = 0; i < 6; i++) { await page.waitForTimeout(1500); const f = `tour-frame-${i + 1}.png`; await page.screenshot({ path: p.join(OUT, f) }); frames.push({ file: f, atMs: Date.now() - t0, view: await page.evaluate(() => window.MAHWORLD_PLAZA.state.view) }); }
    await tour;
    const video = page.video();
    await ctx.close();
    const raw = await video.path();
    const final = p.join(OUT, 'tour.webm');
    fs.renameSync(raw, final);
    report.tour = { file: 'tour.webm', durationMs: Date.now() - t0, frames, legsMs: 3200, holdsMs: 700, order: ['arrival', 'ascent', 'threshold'] };
    report.errors.push(...errors.map(e => 'tour: ' + e));
    console.log('recorded tour.webm', fs.statSync(final).size, 'bytes');
  }

  await browser.close();
  fs.writeFileSync(p.join(OUT, 'capture.json'), JSON.stringify(report, null, 2));
  console.log('mahworld-arrival-gate-capture: ' + report.views.length + ' views, tour ' + (report.tour ? 'recorded' : 'missing') + ', page errors ' + report.errors.length);
  process.exit(report.errors.length ? 1 : 0);
})().catch(e => { console.error('CAPTURE CRASH', e && e.stack || e); process.exit(2); });
