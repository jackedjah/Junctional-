/* MAHPLAZA v3 — actual-runtime proof set.
   Serves the working tree to headless Chromium, loads mahworld/scene/mahplaza.html
   (the same page a phone would open) and records what the running scene draws.
   Nothing here is generated art: every pixel comes from the WebGL renderer at run
   time, and every number comes from the renderer or the scene state.

   Writes validation/mahworld/mahplaza-v3/:
     core      the required views (wide 16:9) at NIGHT and DAY, dusk for the arrival pair
     phone     portrait phone captures of the key views
     checks    the SAME-CAMERA theme-independence checks 1–5 (images + state + pixel samples)
     diagnostic the reduced-glare / fixed-exposure view beside the standard view
     tour      the camera move (Tour + a drag look and a dolly) as WebM with frames
     practice  the PRACTICE WITH A BUDDY local preview, stepwise frames + WebM
     review    Review.html (static, relative assets, REFERENCE / BASELINE / AFTER)
   Run: node tests/mahworld-mahplaza-capture.js [core phone checks diagnostic tour practice review]  (no args = all) */
'use strict';
const fs = require('fs'), p = require('path'), cp = require('child_process');
const ROOT = p.resolve(__dirname, '..');
const OUT = p.join(ROOT, 'validation/mahworld/mahplaza-v3');
const BASE = p.join(ROOT, 'validation/mahworld/mahplaza-v2');
let pw = null;
const candidates = ['playwright'];
if (process.env.PLAYWRIGHT_MODULE) candidates.unshift(process.env.PLAYWRIGHT_MODULE);
try { candidates.push(p.join(cp.execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright')); } catch (e) {}
for (const cand of candidates) { try { pw = require(cand); break; } catch (e) {} }
if (!pw) { console.log('mahworld-mahplaza-capture: SKIP (playwright is not installed)'); process.exit(0); }
const { chromium } = pw;
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain' };
const HOST = 'https://mahworld.test';
const ONLY = process.argv.slice(2);
const want = k => ONLY.length === 0 || ONLY.indexOf(k) > -1;
const REPORT_FILE = p.join(OUT, 'capture.json');
const report = fs.existsSync(REPORT_FILE) && ONLY.length ? JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8')) : { renderer: 'three@0.185.1 (mahworld/vendor/three, byte-identical to mrmah3d/vendor/three)', gl: 'headless Chromium, ANGLE/SwiftShader software GL — ms/frame here is NOT a phone number; draw calls and triangles are' };
report.ranAt = new Date().toISOString();
report.revision = (() => { try { return cp.execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim() + (cp.execSync('git status --porcelain', { cwd: ROOT }).toString().trim() ? '+working-tree' : ''); } catch (e) { return 'unknown'; } })();
report.errors = report.errors || []; report.logs = report.logs || [];

async function serve(page) {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== HOST) return route.abort();
    const f = p.join(ROOT, decodeURIComponent(u.pathname));
    if (f.indexOf(ROOT) === 0 && fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[p.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });
}
async function open(page, query, tag) {
  page.on('pageerror', e => report.errors.push(tag + ': ' + String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts\.g/.test(m.text())) report.logs.push(tag + ': ' + m.text()); });
  /* 'commit', not 'load': the page's module script awaits the scene, so 'load' waits for the whole build under software GL */
  page.setDefaultTimeout(180000);   /* software GL on a shared machine: the first frames compile ~30 programs */
  await page.goto(HOST + '/mahworld/scene/mahplaza.html' + (query || ''), { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.MAHWORLD_MAHPLAZA && window.MAHWORLD_MAHPLAZA.state.frames > 12, null, { timeout: 180000 });
  /* `ready` waits for fonts + one animation frame; never let it hang the run */
  await Promise.race([page.evaluate(() => window.MAHWORLD_MAHPLAZA.ready), page.waitForTimeout(20000)]);
  await page.waitForTimeout(400);
}
const save = () => fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
const info = () => ({ drawCalls: window.MAHWORLD_MAHPLAZA.renderer.info.render.calls, triangles: window.MAHWORLD_MAHPLAZA.renderer.info.render.triangles, ms: Number(window.MAHWORLD_MAHPLAZA.state.ms.toFixed(1)), clock: window.MAHWORLD_MAHPLAZA.state.clock && { hhmm: window.MAHWORLD_MAHPLAZA.state.clock.hhmm, label: window.MAHWORLD_MAHPLAZA.state.clock.label, daylight: Number(window.MAHWORLD_MAHPLAZA.state.clock.daylight.toFixed(2)) }, residents: (window.MAHWORLD_MAHPLAZA.residents || []).length, geometries: window.MAHWORLD_MAHPLAZA.renderer.info.memory.geometries, textures: window.MAHWORLD_MAHPLAZA.renderer.info.memory.textures, programs: (window.MAHWORLD_MAHPLAZA.renderer.info.programs || []).length, heapMB: performance.memory ? Number((performance.memory.usedJSHeapSize / 1048576).toFixed(1)) : null, world: window.MAHWORLD_MAHPLAZA.theme.name, diagnostic: window.MAHWORLD_MAHPLAZA.state.diagnostic });
const setView = (page, v) => page.evaluate(v => window.MAHWORLD_MAHPLAZA.setView(v, { instant: true }), v).then(() => page.waitForTimeout(650));
const setTime = (page, t) => page.evaluate(t => window.MAHWORLD_MAHPLAZA.setTime(t), t).then(() => page.waitForTimeout(1200));
async function shot(page, file, meta) {
  await page.screenshot({ path: p.join(OUT, file) });
  const i = await page.evaluate(info);
  report.captures = (report.captures || []).filter(c => c.file !== file);
  report.captures.push(Object.assign({ file }, meta, i));
  console.log('captured', file, 'draws', i.drawCalls, 'tris', i.triangles, 'ms', i.ms, i.clock && i.clock.hhmm, i.clock && i.clock.label);
}
const WIDE = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const REQUIRED = [
  ['establishing', '1. Main arrival view — skyline, MAHPLAZA marker, three destinations'],
  ['in-world', '2. Ground-level three-quarter view — plaza, sidewalks, road'],
  ['gym-entrance', '3. MAH GYM entrance and interior'],
  ['match-entrance', '4. MAH MATCH arena — the two functions: FIND AN OPPONENT / PRACTICE WITH A BUDDY'],
  ['market-entrance', '5. MAH MARKET entrance and interior'],
  ['residents', '6. Resident close-up group — teardrop lower bodies, dark facial chambers, physique variation'],
  ['sky-plant', '7. Sky, FOBEAM / FOBLOW infrastructure and square-diamond plant detail']
];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  report.chromium = browser.version();

  /* ---- core: the required views, wide, NIGHT and DAY (dusk for the arrival pair) --- */
  if (want('core')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple', 'core');
    for (const time of ['night', 'day', 'dusk']) {
      await setTime(page, time);
      for (const [view, title] of REQUIRED) {
        if (time === 'dusk' && view !== 'establishing' && view !== 'in-world') continue;
        await setView(page, view);
        await shot(page, `v3-${view}-${time}-wide.png`, { set: 'core', view, time, label: 'wide', title });
      }
    }
    await ctx.close(); save();
  }

  /* ---- phone: portrait captures of the key views ---------------------------------- */
  if (want('phone')) {
    const ctx = await browser.newContext(PHONE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple', 'phone');
    for (const [time, views] of [['night', ['establishing', 'in-world', 'match-entrance', 'residents', 'appearance']], ['day', ['in-world', 'match-entrance']]]) {
      await setTime(page, time);
      for (const view of views) { await setView(page, view); await shot(page, `v3-${view}-${time}-phone.png`, { set: 'phone', view, time, label: 'phone' }); }
    }
    await ctx.close(); save();
    /* the phone page WITH its controls: what a reviewer actually holds */
    const ctx2 = await browser.newContext(PHONE); const page2 = await ctx2.newPage(); await serve(page2);
    await open(page2, '?time=night&theme=blue&self=purple&view=in-world', 'phone-hud');
    await page2.waitForTimeout(900);
    await shot(page2, 'v3-in-world-night-phone-with-controls.png', { set: 'phone', view: 'in-world', time: 'night', label: 'phone with controls' });
    await page2.evaluate(() => window.MAHWORLD_MAHPLAZA.select('find-opponent')); await page2.waitForTimeout(400);
    await shot(page2, 'v3-find-opponent-card-phone.png', { set: 'phone', view: 'in-world', time: 'night', label: 'phone: FIND AN OPPONENT selected (honest unavailable state)' });
    await page2.evaluate(() => window.MAHWORLD_MAHPLAZA.select('practice-buddy')); await page2.waitForTimeout(400);
    await shot(page2, 'v3-practice-buddy-card-phone.png', { set: 'phone', view: 'in-world', time: 'night', label: 'phone: PRACTICE WITH A BUDDY selected (local preview offer)' });
    await ctx2.close(); save();
  }

  /* ---- checks: the SAME camera, five steps, state + pixels ------------------------- */
  if (want('checks')) {
    const STEPS = [
      ['1-blue-world-purple-self', 'Check 1 — blue world; local avatar purple; fixtures green, red, blue, silver', () => { const w = window.MAHWORLD_MAHPLAZA; w.setWorldTheme('blue'); w.setSelfAppearance('purple'); w.setRemoteAppearance('fixture-silver', 'silver'); }],
      ['2-world-red', 'Check 2 — change ONLY the world to red', () => window.MAHWORLD_MAHPLAZA.setWorldTheme('red')],
      ['3-self-green', 'Check 3 — change ONLY the local avatar to green', () => window.MAHWORLD_MAHPLAZA.setSelfAppearance('green')],
      ['4-remote-silver-to-purple', 'Check 4 — change ONE remote avatar (the silver fixture) to purple', () => window.MAHWORLD_MAHPLAZA.setRemoteAppearance('fixture-silver', 'purple')],
      ['5-world-blue', 'Check 5 — restore the blue world; avatars keep their last colours', () => window.MAHWORLD_MAHPLAZA.setWorldTheme('blue')]
    ];
    report.checks = [];
    for (const [label, vpo] of [['wide', WIDE], ['phone', PHONE]]) {
      const ctx = await browser.newContext(vpo); const page = await ctx.newPage(); await serve(page);
      await open(page, '?hud=0&time=night&theme=blue&self=purple', 'checks-' + label);
      await setView(page, 'appearance');
      for (const [key, title, fn] of STEPS) {
        if (label === 'phone' && !/^[12]/.test(key)) continue;
        await page.evaluate(fn); await page.waitForTimeout(700);
        const file = `v3-check-${key}-${label}.png`;
        await page.screenshot({ path: p.join(OUT, file) });
        const d = await page.evaluate(() => { const w = window.MAHWORLD_MAHPLAZA; return { appearance: w.describeAppearance(), samples: w.residentScreenSamples(), info: null }; });
        d.info = await page.evaluate(info);
        report.checks.push({ file, key, title, label, world: d.appearance.worldTheme, self: d.appearance.self, fixtures: d.appearance.remotes.filter(r => /^fixture-/.test(r.id)), globalTint: d.appearance.globalTint, samples: d.samples.filter(s => s.role === 'self' || /^fixture-/.test(s.id)), drawCalls: d.info.drawCalls });
        console.log('check', key, label, 'world', d.appearance.worldTheme.name, d.appearance.worldTheme.energyMaterialEmissiveHex, '| self', d.appearance.self.colour, d.appearance.self.emissiveHex, '| fixtures', d.appearance.remotes.filter(r => /^fixture-/.test(r.id)).map(r => r.id.slice(8) + '=' + r.colour).join(' '));
      }
      await ctx.close();
    }
    /* verdicts from the recorded state: what changed and what did not, per step */
    const wide = report.checks.filter(c => c.label === 'wide');
    const colourOf = (c, id) => (c.fixtures.find(f => f.id === id) || {}).colour;
    report.checkVerdicts = wide.map((c, i) => {
      const prev = wide[i - 1];
      const fixturesKept = prev ? ['fixture-green', 'fixture-red', 'fixture-blue', 'fixture-silver'].filter(id => id !== 'fixture-silver' || i !== 3).every(id => colourOf(c, id) === colourOf(prev, id)) : true;
      return { key: c.key, world: c.world.name, self: c.self.colour, fixtures: c.fixtures.map(f => f.id.slice(8) + ':' + f.colour).join(' '), changedFromPrevious: prev ? [c.world.name !== prev.world.name ? 'world' : null, c.self.colour !== prev.self.colour ? 'self' : null, colourOf(c, 'fixture-silver') !== colourOf(prev, 'fixture-silver') ? 'fixture-silver' : null].filter(Boolean).join(', ') || 'nothing' : 'baseline', otherFixturesUnchanged: fixturesKept, globalTint: c.globalTint.canvasCssFilter };
    });
    save();
  }

  /* ---- diagnostic: reduced glare / fixed exposure beside the standard view ---------- */
  if (want('diagnostic')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple', 'diagnostic');
    for (const time of ['night', 'day']) {
      await setTime(page, time);
      for (const view of ['in-world', 'match-entrance']) {
        await setView(page, view);
        await page.evaluate(() => window.MAHWORLD_MAHPLAZA.setDiagnostic(false)); await page.waitForTimeout(500);
        await shot(page, `v3-${view}-${time}-standard.png`, { set: 'diagnostic', view, time, label: 'standard', title: 'standard render' });
        await page.evaluate(() => window.MAHWORLD_MAHPLAZA.setDiagnostic(true)); await page.waitForTimeout(500);
        await shot(page, `v3-${view}-${time}-diagnostic.png`, { set: 'diagnostic', view, time, label: 'diagnostic', title: '9. reduced-glare diagnostic: additive glow off, emissive capped at 1.0, exposure fixed at 1.0' });
      }
    }
    await page.evaluate(() => window.MAHWORLD_MAHPLAZA.setDiagnostic(false));
    await ctx.close(); save();
  }

  /* ---- tour + a real look / move: recorded ----------------------------------------- */
  if (want('tour')) {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: { width: 960, height: 540 } } });
    const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple', 'tour');
    await page.waitForTimeout(800);
    const frames = []; const t0 = Date.now();
    const tour = page.evaluate(() => window.MAHWORLD_MAHPLAZA.tour({ hold: 800, leg: 3600 }));
    for (let i = 0; i < 6; i++) { await page.waitForTimeout(1500); const f = `v3-tour-frame-${i + 1}.png`; await page.screenshot({ path: p.join(OUT, f) }); frames.push({ file: f, atMs: Date.now() - t0, view: await page.evaluate(() => window.MAHWORLD_MAHPLAZA.state.view) }); }
    await tour;
    /* then a person's look and move: a drag across the screen, a wheel dolly, an arrow key */
    await page.mouse.move(480, 300); await page.mouse.down(); for (let i = 1; i <= 12; i++) { await page.mouse.move(480 - i * 22, 300 + i * 3); await page.waitForTimeout(60); } await page.mouse.up();
    await page.waitForTimeout(400); await page.screenshot({ path: p.join(OUT, 'v3-tour-frame-7-drag-look.png') });
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(120); }
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(400); await page.screenshot({ path: p.join(OUT, 'v3-tour-frame-8-dolly.png') });
    frames.push({ file: 'v3-tour-frame-7-drag-look.png', note: 'after a 12-step pointer drag (look)' }, { file: 'v3-tour-frame-8-dolly.png', note: 'after wheel dolly and arrow keys (move)' });
    const video = page.video(); await ctx.close();
    const raw = await video.path(); const final = p.join(OUT, 'v3-camera-movement.webm'); fs.renameSync(raw, final);
    report.tour = { file: 'v3-camera-movement.webm', durationMs: Date.now() - t0, frames, order: ['establishing', 'in-world', 'match-entrance', 'drag look', 'wheel dolly + arrow keys'] };
    console.log('recorded v3-camera-movement.webm', fs.statSync(final).size, 'bytes'); save();
  }

  /* ---- the practice preview, stepwise so every step is captured -------------------- */
  if (want('practice')) {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: { width: 960, height: 540 } } });
    const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple&view=match-entrance', 'practice');
    await page.waitForTimeout(600);
    const before = await page.evaluate(() => ({ view: window.MAHWORLD_MAHPLAZA.state.view, sceneChildren: window.MAHWORLD_MAHPLAZA.scene.children.length }));
    const run = page.evaluate(() => window.MAHWORLD_MAHPLAZA.practicePreview({ stepwise: true }));
    const steps = []; const t0 = Date.now(); let guard = 0;
    while (guard++ < 400) {
      await page.waitForTimeout(150);
      const st = await page.evaluate(() => { const s = window.MAHWORLD_MAHPLAZA.state.practice; return s ? { step: s.step, detail: s.detail, waiting: s.waiting } : null; });
      if (!st) { if (steps.length) break; continue; }
      if (st.waiting) {
        await page.waitForTimeout(st.step === 'enter' ? 200 : 900);      /* let the pose settle before the still */
        const f = `v3-practice-${steps.length + 1}-${st.step}.png`; await page.screenshot({ path: p.join(OUT, f) });
        steps.push({ file: f, step: st.step, detail: st.detail, atMs: Date.now() - t0 });
        console.log('practice step', st.step);
        await page.evaluate(() => window.MAHWORLD_MAHPLAZA.practiceContinue());
      }
    }
    const ok = await run;
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({ view: window.MAHWORLD_MAHPLAZA.state.view, sceneChildren: window.MAHWORLD_MAHPLAZA.scene.children.length, proxiesLeft: window.MAHWORLD_MAHPLAZA.scene.children.filter(o => o.userData && o.userData.role === 'practice-proxy').length, practice: window.MAHWORLD_MAHPLAZA.state.practice, selection: window.MAHWORLD_MAHPLAZA.state.selection }));
    await page.screenshot({ path: p.join(OUT, 'v3-practice-9-after.png') });
    /* the exit path: start again and exit mid-way; the plaza context must come back */
    const run2 = page.evaluate(() => window.MAHWORLD_MAHPLAZA.practicePreview({ stepwise: true }));
    for (let i = 0; i < 60; i++) { await page.waitForTimeout(150); const s = await page.evaluate(() => window.MAHWORLD_MAHPLAZA.state.practice); if (s && s.waiting) { if (s.step === 'guard') break; await page.evaluate(() => window.MAHWORLD_MAHPLAZA.practiceContinue()); } }
    await page.evaluate(() => window.MAHWORLD_MAHPLAZA.practiceExit()); const ok2 = await run2; await page.waitForTimeout(500);
    const afterExit = await page.evaluate(() => ({ view: window.MAHWORLD_MAHPLAZA.state.view, proxiesLeft: window.MAHWORLD_MAHPLAZA.scene.children.filter(o => o.userData && o.userData.role === 'practice-proxy').length, practice: window.MAHWORLD_MAHPLAZA.state.practice, sceneChildren: window.MAHWORLD_MAHPLAZA.scene.children.length }));
    await page.screenshot({ path: p.join(OUT, 'v3-practice-10-after-early-exit.png') });
    const video = page.video(); await ctx.close();
    const raw = await video.path(); const final = p.join(OUT, 'v3-practice-preview.webm'); fs.renameSync(raw, final);
    report.practice = { file: 'v3-practice-preview.webm', completed: ok, steps, before, after, earlyExit: { completed: ok2, afterExit }, cleanExit: after.proxiesLeft === 0 && after.practice === null && after.view === before.view && after.sceneChildren === before.sceneChildren && afterExit.proxiesLeft === 0 && afterExit.practice === null && afterExit.view === before.view };
    console.log('practice preview', ok ? 'completed' : 'did not complete', steps.map(s => s.step).join(' → '), 'clean exit', report.practice.cleanExit); save();
  }

  await browser.close();
  save();
  if (want('review')) writeReview();
  console.log('mahworld-mahplaza-capture: ' + (report.captures || []).length + ' captures, checks ' + ((report.checks || []).length) + ', page errors ' + report.errors.length + (report.logs.length ? ' | ' + report.logs.slice(0, 4).join(' | ') : ''));
  process.exit(report.errors.length ? 1 : 0);
})().catch(e => { console.error('CAPTURE CRASH', e && e.stack || e); process.exit(2); });

/* ---------------------------------------------------------------- Review.html */
function writeReview() {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const has = f => fs.existsSync(p.join(OUT, f));
  const baseHas = f => fs.existsSync(p.join(BASE, f));
  /* references: the concept images, downscaled with Playwright's ffmpeg when available */
  const refDir = p.join(OUT, 'reference'); fs.mkdirSync(refDir, { recursive: true });
  const refSrc = [process.env.MAHPLAZA_REF_DIR, p.join(ROOT, 'validation/mahworld/reference')].filter(Boolean).find(d => fs.existsSync(d));
  let ffmpeg = null; try { for (const d of fs.readdirSync('/opt/pw-browsers')) if (/^ffmpeg/.test(d)) ffmpeg = p.join('/opt/pw-browsers', d, 'ffmpeg-linux'); } catch (e) {}
  /* downscaled copies already in reference/ are used as they are (they are produced once, outside this script);
     otherwise try ffmpeg (Playwright's build may lack a PNG decoder) and fall back to a plain copy */
  if (refSrc) for (const f of fs.readdirSync(refSrc)) if (/mahplaza.*\.(png|jpe?g)$/i.test(f)) {
    const existing = fs.readdirSync(refDir).find(x => x.replace(/\.\w+$/, '') === f.replace(/\.\w+$/, ''));
    if (existing) continue;
    const dst = p.join(refDir, f.replace(/\.(jpe?g|png)$/i, '.png'));
    try { if (ffmpeg) cp.execSync(`"${ffmpeg}" -y -loglevel error -i "${p.join(refSrc, f)}" -vf "scale='min(960,iw)':-2" "${dst}"`); else fs.copyFileSync(p.join(refSrc, f), dst); } catch (e) { console.log('reference copy failed', f, e.message.split('\n')[0]); }
  }
  const refs = fs.readdirSync(refDir).filter(x => /\.(png|jpe?g)$/i.test(x)).sort().map(x => 'reference/' + x);
  const gates = fs.existsSync(p.join(OUT, 'gates.json')) ? JSON.parse(fs.readFileSync(p.join(OUT, 'gates.json'), 'utf8')) : null;
  const caps = report.captures || [];
  const cap = (view, time, label) => caps.find(c => c.view === view && c.time === time && c.label === label);
  const baselineFor = view => ({ establishing: 'mahplaza-establishing-night-wide.png', 'in-world': 'mahplaza-in-world-night-wide.png', 'match-entrance': 'mahplaza-match-approach-night-wide.png', 'gym-entrance': null, 'market-entrance': null, residents: 'mahplaza-in-world-night-phone.png', 'sky-plant': null })[view];
  const fig = (src, cap, tag) => src ? `<figure><span class="tag tag--${tag.toLowerCase()}">${tag}</span><a href="${esc(src)}"><img loading="lazy" src="${esc(src)}" alt="${esc(cap)}"></a><figcaption>${esc(cap)}</figcaption></figure>` : '';
  const meta = c => c ? `${c.drawCalls} draw calls · ${c.triangles.toLocaleString()} tris · world ${c.clock ? c.clock.hhmm + ' ' + c.clock.label : ''}` : '';
  let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MAHPLAZA v3 — review</title>
<style>
:root{--bg:#0b1020;--ink:#e8f0ff;--dim:#9fb3d3;--line:#22304a;--accent:#8fd0ff;--ref:#c9b2ff;--base:#9aa7bb;--after:#8fd0ff;--pass:#63e6a3;--partial:#ffd39a;--blocked:#ff8fa0}
html{background:var(--bg);color:var(--ink);font:15px/1.5 "Space Grotesk",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif}body{margin:0;padding:28px clamp(16px,4vw,56px) 80px;max-width:1500px}
h1{font-size:22px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 4px}h2{font-size:14px;letter-spacing:.24em;text-transform:uppercase;color:var(--dim);margin:44px 0 12px;padding-top:16px;border-top:1px solid var(--line)}
p{max-width:78ch;color:var(--dim)}p.lead{color:var(--ink)}code{font-size:.9em;color:var(--accent)}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}.grid--wide{grid-template-columns:repeat(auto-fill,minmax(420px,1fr))}.grid--pair{grid-template-columns:repeat(auto-fit,minmax(420px,1fr))}
figure{margin:0;position:relative;background:#0e1628;border:1px solid var(--line);border-radius:4px;overflow:hidden}figure img{display:block;width:100%;height:auto;background:#000}figcaption{padding:8px 10px 10px;font-size:12.5px;color:var(--dim)}
.tag{position:absolute;top:8px;left:8px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;padding:3px 7px;border-radius:2px;background:rgba(6,10,24,.85);border:1px solid var(--line)}.tag--reference{color:var(--ref)}.tag--baseline{color:var(--base)}.tag--after{color:var(--after)}
table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--dim);font-weight:500;letter-spacing:.08em;text-transform:uppercase;font-size:11px}
.pill{display:inline-block;padding:1px 8px;border-radius:2px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;border:1px solid currentColor}.PASS{color:var(--pass)}.PARTIAL{color:var(--partial)}.BLOCKED,.NOT_RUN,.FAIL{color:var(--blocked)}
.sw{display:inline-block;width:11px;height:11px;transform:rotate(45deg);border:1px solid rgba(255,255,255,.3);vertical-align:-1px;margin-right:6px}video{width:100%;max-width:960px;border:1px solid var(--line);border-radius:4px;background:#000}
.wrap{overflow-x:auto}
</style></head><body>
<h1>MAHPLAZA — visible plaza slice v3</h1>
<p class="lead">Actual-runtime captures from <code>mahworld/scene/mahplaza.html</code> on the permitted renderer (three@0.185.1, vendored). Revision <code>${esc(report.revision)}</code>, captured ${esc(report.ranAt)}, ${esc(report.chromium || '')} with software GL. Every image below is what the running scene drew; nothing is concept art except the panels marked REFERENCE.</p>
<p>Labels: <span class="tag tag--reference" style="position:static">REFERENCE</span> the user's concept images (suggestions, not brand assets) · <span class="tag tag--baseline" style="position:static">BASELINE</span> the v2 milestone captures (<code>../mahplaza-v2/</code>) · <span class="tag tag--after" style="position:static">AFTER</span> this slice.</p>`;
  if (refs.length) html += `<h2>Reference</h2><div class="grid grid--pair">${refs.map(r => fig(r, 'Concept image (downscaled copy). Composition and mood only — icons, sub-lines and the yellow light are not carried.', 'REFERENCE')).join('')}</div>`;
  html += `<h2>Required views (AFTER · night)</h2><div class="grid grid--wide">`;
  for (const [view, title] of REQUIRED) { const c = cap(view, 'night', 'wide'); if (c) html += fig(c.file, title + ' — ' + meta(c), 'AFTER'); }
  const ph = cap('appearance', 'night', 'phone'); if (ph) html += fig(ph.file, '8. Same-camera appearance check on a phone frame (see the theme checks below for the blue / red pair)', 'AFTER');
  const dg = caps.find(c => c.label === 'diagnostic' && c.view === 'in-world' && c.time === 'night'); if (dg) html += fig(dg.file, dg.title + ' — ' + meta(dg), 'AFTER');
  html += `</div>`;
  html += `<h2>Baseline against after (night)</h2><p>The v2 milestone beside this slice, same or nearest camera. What changed: fabricated icons removed, MAH MATCH copy and two actions, ramp, glare lowered, faces, sparser plants, three independent appearance owners.</p><div class="grid grid--pair">`;
  for (const [view, title] of REQUIRED) { const b = baselineFor(view), c = cap(view, 'night', 'wide'); if (b && baseHas(b) && c) html += fig('../mahplaza-v2/' + b, 'v2 — ' + title.replace(/^\d+\. /, ''), 'BASELINE') + fig(c.file, 'v3 — ' + title.replace(/^\d+\. /, ''), 'AFTER'); }
  html += `</div>`;
  html += `<h2>Day and dusk (same cameras)</h2><div class="grid">`;
  for (const [view, title] of REQUIRED) for (const time of ['day', 'dusk']) { const c = cap(view, time, 'wide'); if (c) html += fig(c.file, `${time.toUpperCase()} — ${title.replace(/^\d+\. /, '')} — ${meta(c)}`, 'AFTER'); }
  html += `</div>`;
  html += `<h2>Phone frames</h2><div class="grid">`;
  for (const c of caps.filter(c => c.set === 'phone')) html += fig(c.file, `${esc(c.label)} · ${c.view} · ${c.time} — ${meta(c)}`, 'AFTER');
  html += `</div>`;
  if (report.checks && report.checks.length) {
    html += `<h2>Theme independence — the SAME camera, five steps</h2><p>Blue world, purple local avatar, fixtures green / red / blue / silver; then ONLY the world to red; then ONLY the local avatar to green; then ONE remote avatar (the silver fixture) to purple; then the world back to blue. State values are read from the running scene (each resident's own material emissive and its painted vertex colours); pixel samples are read back from the frame buffer at each resident's chest. No CSS filter, overlay or grading pass exists (<code>canvas filter: ${esc(report.checks[0].globalTint.canvasCssFilter)}</code>).</p><div class="grid grid--wide">`;
    for (const c of report.checks.filter(c => c.label === 'wide')) html += fig(c.file, `${c.title} — world ${c.world.name} (#${c.world.energyMaterialEmissiveHex}) · self ${c.self.colour} (#${c.self.emissiveHex}) · ${c.fixtures.map(f => f.id.slice(8) + ' ' + f.colour).join(', ')}`, 'AFTER');
    html += `</div><div class="grid grid--pair">`;
    for (const c of report.checks.filter(c => c.label === 'phone')) html += fig(c.file, `Phone — ${c.title}`, 'AFTER');
    html += `</div><div class="wrap"><table><thead><tr><th>Step</th><th>World energy</th><th>Self (material emissive / vertex avg)</th><th>Fixtures (state)</th><th>Pixel at chest (r,g,b)</th><th>Changed vs previous</th><th>Others unchanged</th></tr></thead><tbody>`;
    for (const c of report.checks.filter(c => c.label === 'wide')) {
      const v = (report.checkVerdicts || []).find(x => x.key === c.key) || {};
      const px = c.samples.map(s => `${s.id.replace('fixture-', '')} ${s.rgb ? s.rgb.join(',') : '—'}`).join('<br>');
      html += `<tr><td>${esc(c.title.split(' — ')[0])}</td><td><span class="sw" style="background:#${c.world.energyMaterialEmissiveHex}"></span>${c.world.name} #${c.world.energyMaterialEmissiveHex}</td><td><span class="sw" style="background:#${c.self.emissiveHex}"></span>${c.self.colour} #${c.self.emissiveHex} / #${c.self.vertexAverageHex}</td><td>${c.fixtures.map(f => `<span class="sw" style="background:#${f.emissiveHex}"></span>${f.id.slice(8)} ${f.colour}`).join('<br>')}</td><td>${px}</td><td>${esc(v.changedFromPrevious || '')}</td><td>${v.otherFixturesUnchanged === false ? '<span class="pill FAIL">changed</span>' : '<span class="pill PASS">yes</span>'}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }
  const diag = caps.filter(c => c.set === 'diagnostic');
  if (diag.length) { html += `<h2>Reduced-glare diagnostic</h2><p>Standard render beside the diagnostic view: additive glow layers off, emissive strengths capped at 1.0, tone-mapping exposure fixed at 1.0. What remains is geometry and direct light — the readability of the scene does not depend on glow.</p><div class="grid grid--pair">`; for (const c of diag) html += fig(c.file, `${c.label.toUpperCase()} · ${c.view} · ${c.time} — ${meta(c)}`, 'AFTER'); html += `</div>`; }
  if (report.tour) html += `<h2>Camera movement</h2><p>The Tour (arrival → in-world → MAH MATCH entrance), then a pointer drag to look, a wheel dolly and arrow keys. ${Math.round(report.tour.durationMs / 100) / 10} s recorded.</p><video controls preload="metadata" src="${esc(report.tour.file)}"></video><div class="grid">${report.tour.frames.map(f => fig(f.file, f.note || `${f.view || ''} at ${(f.atMs / 1000).toFixed(1)} s`, 'AFTER')).join('')}</div>`;
  if (report.practice) html += `<h2>PRACTICE WITH A BUDDY — local preview</h2><p>${report.practice.completed ? 'Completed' : 'Did not complete'}: enter → positions → guard → strike → block → evade → reset → return. Two labelled local proxies (your colour and the blue buddy fixture); no other person is involved. Clean exit: <span class="pill ${report.practice.cleanExit ? 'PASS' : 'FAIL'}">${report.practice.cleanExit ? 'plaza context restored, no proxies left, nothing running' : 'see capture.json'}</span>; the early-exit path was also exercised.</p><video controls preload="metadata" src="${esc(report.practice.file)}"></video><div class="grid">${report.practice.steps.map(s => fig(s.file, `${s.step.toUpperCase()} — ${s.detail}`, 'AFTER')).join('')}${fig('v3-practice-9-after.png', 'after the preview: back where the viewer was', 'AFTER')}${fig('v3-practice-10-after-early-exit.png', 'after an early exit at GUARD: plaza context restored', 'AFTER')}</div>`;
  if (gates) { html += `<h2>Visual acceptance gates</h2><div class="wrap"><table><thead><tr><th>Gate</th><th>Status</th><th>Evidence / note</th></tr></thead><tbody>`; for (const g of gates.gates) html += `<tr><td>${esc(g.id)} — ${esc(g.name)}</td><td><span class="pill ${esc(g.status)}">${esc(g.status.replace('_', ' '))}</span></td><td>${esc(g.note)}</td></tr>`; html += `</tbody></table></div>`; if (gates.performance) html += `<p>${esc(gates.performance)}</p>`; }
  html += `<h2>Measured</h2><div class="wrap"><table><thead><tr><th>File</th><th>View</th><th>Time</th><th>Draw calls</th><th>Triangles</th><th>ms/frame (software GL)</th><th>Heap MB</th></tr></thead><tbody>${caps.map(c => `<tr><td>${esc(c.file)}</td><td>${esc(c.view)}</td><td>${esc(c.time)}</td><td>${c.drawCalls}</td><td>${c.triangles.toLocaleString()}</td><td>${c.ms}</td><td>${c.heapMB == null ? '—' : c.heapMB}</td></tr>`).join('')}</tbody></table></div>
<p>Full data: <code>capture.json</code>. Page errors during capture: ${report.errors.length}.</p>
</body></html>`;
  fs.writeFileSync(p.join(OUT, 'Review.html'), html);
  console.log('wrote Review.html');
}
