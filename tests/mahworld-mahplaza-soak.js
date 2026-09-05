/* MAHPLAZA soak — idle, navigation and re-entry over a real span of time, in the
   same headless Chromium the capture uses. Samples heap, renderer memory counters
   and frame time every 30 s. The point is leak / stability evidence, not frame
   rate (software GL). Writes validation/mahworld/mahplaza-v3/soak.json.
   Run: node tests/mahworld-mahplaza-soak.js [minutes=15] */
'use strict';
const fs = require('fs'), p = require('path'), cp = require('child_process');
const ROOT = p.resolve(__dirname, '..');
const OUT = p.join(ROOT, 'validation/mahworld/mahplaza-v3'); fs.mkdirSync(OUT, { recursive: true });
let pw = null; for (const c of ['playwright', (() => { try { return p.join(cp.execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'); } catch (e) { return ''; } })()]) { try { pw = require(c); break; } catch (e) {} }
if (!pw) { console.log('mahworld-mahplaza-soak: SKIP (playwright is not installed)'); process.exit(0); }
const { chromium } = pw;
const MINUTES = Number(process.argv[2]) || 15;
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json' };
const HOST = 'https://mahworld.test';
const sample = () => { const w = window.MAHWORLD_MAHPLAZA; return { t: Date.now(), heapMB: performance.memory ? Number((performance.memory.usedJSHeapSize / 1048576).toFixed(1)) : null, geometries: w.renderer.info.memory.geometries, textures: w.renderer.info.memory.textures, programs: (w.renderer.info.programs || []).length, ms: Number(w.state.ms.toFixed(1)), frames: w.state.frames, view: w.state.view, world: w.theme.name, clock: w.state.clock && w.state.clock.hhmm, practice: !!w.state.practice, sceneChildren: w.scene.children.length }; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  await page.route('**/*', route => { const u = new URL(route.request().url()); if (u.origin !== HOST) return route.abort(); const f = p.join(ROOT, decodeURIComponent(u.pathname)); if (f.indexOf(ROOT) === 0 && fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[p.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); return route.fulfill({ status: 404, body: '' }); });
  const openWorld = async () => { await page.goto(HOST + '/mahworld/scene/mahplaza.html?view=in-world', { waitUntil: 'load' }); await page.waitForFunction(() => window.MAHWORLD_MAHPLAZA && window.MAHWORLD_MAHPLAZA.state.frames > 5, null, { timeout: 120000 }); };
  const report = { startedAt: new Date().toISOString(), plannedMinutes: MINUTES, phases: [], samples: [], errors };
  const phaseLen = MINUTES * 60000 / 3;
  const run = async (name, until, act) => {
    const t0 = Date.now(); let lastSample = 0, i = 0;
    report.phases.push({ name, startedAt: new Date().toISOString() });
    while (Date.now() - t0 < until) {
      if (act) await act(i++);
      if (Date.now() - lastSample >= 30000) { lastSample = Date.now(); const s = await page.evaluate(sample); s.phase = name; report.samples.push(s); console.log(name, Math.round((Date.now() - t0) / 1000) + 's', 'heap', s.heapMB, 'MB geo', s.geometries, 'tex', s.textures, 'prog', s.programs, 'ms', s.ms, 'frames', s.frames); }
      await page.waitForTimeout(act ? 2000 : 5000);
    }
    report.phases[report.phases.length - 1].endedAt = new Date().toISOString();
  };
  await openWorld();
  report.samples.push(Object.assign(await page.evaluate(sample), { phase: 'start' }));
  await run('idle', phaseLen, null);
  const views = ['establishing', 'in-world', 'match-entrance', 'gym-entrance', 'market-entrance', 'residents', 'appearance', 'sky-plant'];
  const themes = ['blue', 'red', 'purple', 'green'];
  await run('navigation', phaseLen, async i => {
    await page.evaluate(v => window.MAHWORLD_MAHPLAZA.setView(v), views[i % views.length]);
    if (i % 4 === 3) await page.evaluate(t => window.MAHWORLD_MAHPLAZA.setWorldTheme(t), themes[(i >> 2) % themes.length]);
    if (i % 5 === 4) await page.evaluate(c => window.MAHWORLD_MAHPLAZA.setSelfAppearance(c), ['purple', 'green', 'blue', 'red', 'silver'][(i / 5 | 0) % 5]);
    if (i % 9 === 8) await page.evaluate(() => window.MAHWORLD_MAHPLAZA.setDiagnostic(!window.MAHWORLD_MAHPLAZA.state.diagnostic));
    if (i % 23 === 11) { await page.evaluate(() => window.MAHWORLD_MAHPLAZA.practicePreview()); }
    if (i % 23 === 14) { await page.evaluate(() => window.MAHWORLD_MAHPLAZA.practiceExit()); }
    await page.mouse.move(400, 250); await page.mouse.down(); await page.mouse.move(300 + (i % 3) * 60, 260); await page.mouse.up();
  });
  /* re-entry: leave the page and come back (a fresh document), then hold */
  await page.goto('about:blank'); await page.waitForTimeout(1500);
  await openWorld();
  report.samples.push(Object.assign(await page.evaluate(sample), { phase: 're-entry-start' }));
  await run('re-entry-idle', phaseLen, async i => { if (i % 15 === 14) await page.evaluate(v => window.MAHWORLD_MAHPLAZA.setView(v), views[i % views.length]); });
  report.endedAt = new Date().toISOString();
  report.actualMinutes = Number(((Date.parse(report.endedAt) - Date.parse(report.startedAt)) / 60000).toFixed(1));
  const heap = report.samples.filter(s => s.heapMB != null);
  const byPhase = name => heap.filter(s => s.phase === name);
  const trend = arr => arr.length > 1 ? Number((arr[arr.length - 1].heapMB - arr[0].heapMB).toFixed(1)) : null;
  report.summary = { heapStartMB: heap[0] && heap[0].heapMB, heapEndMB: heap[heap.length - 1] && heap[heap.length - 1].heapMB, heapDeltaIdleMB: trend(byPhase('idle')), heapDeltaNavigationMB: trend(byPhase('navigation')), heapDeltaReentryIdleMB: trend(byPhase('re-entry-idle')), geometriesStart: heap[0] && heap[0].geometries, geometriesEnd: heap[heap.length - 1] && heap[heap.length - 1].geometries, texturesEnd: heap[heap.length - 1] && heap[heap.length - 1].textures, programsEnd: heap[heap.length - 1] && heap[heap.length - 1].programs, pageErrors: errors.length, note: 'headless software GL; frame time is not a phone number' };
  await browser.close();
  fs.writeFileSync(p.join(OUT, 'soak.json'), JSON.stringify(report, null, 2));
  console.log('mahworld-mahplaza-soak:', report.actualMinutes, 'min,', JSON.stringify(report.summary));
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('SOAK CRASH', e); process.exit(2); });
