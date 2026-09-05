/* MAHPLAZA — actual-runtime capture.
   Serves the working tree to headless Chromium, loads mahworld/scene/mahplaza.html
   (the same page a phone would open) and records what the running scene draws:
   the SAME three cameras at DAY, DUSK and NIGHT (matched proofs), a phone
   portrait in-world set, a red world-Theme proof (residents keep their own
   colours), and the Tour camera move as WebM with a contact sheet. Nothing here
   is generated art: every pixel comes from the WebGL renderer at run time.
   Run: node tests/mahworld-mahplaza-capture.js   (writes validation/mahworld/mahplaza-v2/) */
'use strict';
const fs = require('fs'), p = require('path');
const ROOT = p.resolve(__dirname, '..');
const OUT = p.join(ROOT, 'validation/mahworld/mahplaza-v2');
let pw = null;
const candidates = ['playwright'];
if (process.env.PLAYWRIGHT_MODULE) candidates.unshift(process.env.PLAYWRIGHT_MODULE);
try { candidates.push(p.join(require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright')); } catch (e) {}
for (const cand of candidates) { try { pw = require(cand); break; } catch (e) {} }
if (!pw) { console.log('mahworld-mahplaza-capture: SKIP (playwright is not installed)'); process.exit(0); }
const { chromium } = pw;
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain' };
const HOST = 'https://mahworld.test';
const ONLY = process.argv.slice(2);   /* optional: e.g. `wide night` to capture a subset quickly */
const want = (k) => ONLY.length === 0 || ONLY.indexOf(k) > -1;

async function serve(page) {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== HOST) return route.abort();
    const f = p.join(ROOT, decodeURIComponent(u.pathname));
    if (f.indexOf(ROOT) === 0 && fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[p.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });
}
async function open(page, query) {
  const errors = [], logs = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'info') logs.push(m.type() + ': ' + m.text()); });
  await page.goto(HOST + '/mahworld/scene/mahplaza.html' + (query || ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.MAHWORLD_MAHPLAZA && window.MAHWORLD_MAHPLAZA.state.frames > 5, null, { timeout: 90000 });
  await page.evaluate(() => window.MAHWORLD_MAHPLAZA.ready);
  return { errors, logs };
}
const info = () => ({ drawCalls: window.MAHWORLD_MAHPLAZA.renderer.info.render.calls, triangles: window.MAHWORLD_MAHPLAZA.renderer.info.render.triangles, ms: Number(window.MAHWORLD_MAHPLAZA.state.ms.toFixed(1)), clock: window.MAHWORLD_MAHPLAZA.state.clock && { hhmm: window.MAHWORLD_MAHPLAZA.state.clock.hhmm, label: window.MAHWORLD_MAHPLAZA.state.clock.label, daylight: Number(window.MAHWORLD_MAHPLAZA.state.clock.daylight.toFixed(2)) }, residents: (window.MAHWORLD_MAHPLAZA.residents || []).length, flora: (window.MAHWORLD_MAHPLAZA.flora || []).length, vehicles: !!window.MAHWORLD_MAHPLAZA.vehicles });

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  console.log('chromium', browser.version());
  const report = { ranAt: new Date().toISOString(), renderer: 'three@0.185.1 (mahworld/vendor/three, byte-identical to mrmah3d/vendor/three)', captures: [], tour: null, errors: [], logs: [] };
  const TIMES = ['day', 'dusk', 'night'];

  /* ---- matched proofs: the SAME cameras at day, dusk and night ------------- */
  for (const [label, vp, scale, views] of [['wide', { width: 1280, height: 720 }, 1, ['establishing', 'in-world', 'match-approach']], ['phone', { width: 390, height: 844 }, 2, ['in-world', 'establishing', 'match-approach']]]) {
    if (!want(label)) continue;
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: scale, isMobile: label === 'phone', hasTouch: label === 'phone' });
    const page = await ctx.newPage(); await serve(page);
    const { errors, logs } = await open(page, '?hud=0&time=night');
    for (const time of TIMES) {
      if (!want(time)) continue;
      await page.evaluate(t => window.MAHWORLD_MAHPLAZA.setTime(t), time);
      await page.waitForTimeout(1200);
      for (const view of views) {
        if (label === 'phone' && view !== 'in-world' && time !== 'night') continue;   /* phone: full set for in-world, night only for the others */
        await page.evaluate(v => window.MAHWORLD_MAHPLAZA.setView(v, { instant: true }), view);
        await page.waitForTimeout(650);
        const file = `mahplaza-${view}-${time}-${label}.png`;
        await page.screenshot({ path: p.join(OUT, file) });
        const i = await page.evaluate(info);
        report.captures.push(Object.assign({ file, view, time, label }, i));
        console.log('captured', file, 'draws', i.drawCalls, 'tris', i.triangles, 'ms', i.ms, 'clock', i.clock && i.clock.hhmm, i.clock && i.clock.label, 'residents', i.residents);
      }
    }
    report.errors.push(...errors.map(e => label + ': ' + e)); report.logs.push(...logs.map(l => label + ': ' + l));
    await ctx.close();
  }

  /* ---- theme proof: a red world Theme; residents must keep their own colours -- */
  if (want('theme')) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); await serve(page);
    const { errors } = await open(page, '?hud=0&time=night&theme=red');
    await page.waitForTimeout(1200);
    for (const view of ['in-world', 'establishing']) {
      await page.evaluate(v => window.MAHWORLD_MAHPLAZA.setView(v, { instant: true }), view); await page.waitForTimeout(650);
      const file = `mahplaza-${view}-night-phone-theme-red.png`; await page.screenshot({ path: p.join(OUT, file) });
      report.captures.push(Object.assign({ file, view, time: 'night', label: 'phone', theme: 'red' }, await page.evaluate(info)));
      console.log('captured', file);
    }
    report.errors.push(...errors.map(e => 'theme: ' + e));
    await ctx.close();
  }

  /* ---- the camera move: Tour at night, recorded ------------------------------ */
  if (want('tour')) {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: { width: 960, height: 540 } } });
    const page = await ctx.newPage(); await serve(page);
    const { errors } = await open(page, '?hud=0&time=night');
    await page.waitForTimeout(800);
    const frames = []; const t0 = Date.now();
    const tour = page.evaluate(() => window.MAHWORLD_MAHPLAZA.tour({ hold: 800, leg: 3600 }));
    for (let i = 0; i < 6; i++) { await page.waitForTimeout(1600); const f = `tour-frame-${i + 1}.png`; await page.screenshot({ path: p.join(OUT, f) }); frames.push({ file: f, atMs: Date.now() - t0, view: await page.evaluate(() => window.MAHWORLD_MAHPLAZA.state.view) }); }
    await tour;
    const video = page.video(); await ctx.close();
    const raw = await video.path(); const final = p.join(OUT, 'tour-night.webm'); fs.renameSync(raw, final);
    report.tour = { file: 'tour-night.webm', durationMs: Date.now() - t0, frames, order: ['establishing', 'in-world', 'match-approach'] };
    report.errors.push(...errors.map(e => 'tour: ' + e));
    console.log('recorded tour-night.webm', fs.statSync(final).size, 'bytes');
  }

  await browser.close();
  fs.writeFileSync(p.join(OUT, 'capture.json'), JSON.stringify(report, null, 2));
  console.log('mahworld-mahplaza-capture: ' + report.captures.length + ' captures, tour ' + (report.tour ? 'recorded' : 'skipped') + ', page errors ' + report.errors.length + (report.logs.length ? ' | ' + report.logs.slice(0, 4).join(' | ') : ''));
  process.exit(report.errors.length ? 1 : 0);
})().catch(e => { console.error('CAPTURE CRASH', e && e.stack || e); process.exit(2); });
