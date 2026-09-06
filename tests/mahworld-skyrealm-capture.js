/* MAHWORLD UPPER REALM — actual-runtime review set.
   The same page a phone opens (mahworld/scene/skyrealm.html), served from the working tree to
   headless Chromium on software GL. Writes validation/mahworld/skyrealm/:

     spin      THE §43 PROOF. Eight bearings — 0/45/90/135/180/225/270/315 — from ONE standing
               position on the staging apron. This is the set that decides whether the realm is
               authored in every direction or only in front of a hero camera, and it is the first
               set for that reason.
     core      the named views wide, at the realm's signature sunset hour
     time      §40: the same two views at day / sunset / dusk / night, because no time state may
               be visually dead
     phone     §44: portrait frames, where the realm is meant to be most impressive
     quality   the cost at high / medium / low
     review    Review.html — the spin ring first, then everything else

   Run: node tests/mahworld-skyrealm-capture.js [spin core time phone quality review]  (no args = all) */
'use strict';
const fs = require('fs'), p = require('path'), cp = require('child_process');
const ROOT = p.resolve(__dirname, '..');
const OUT = p.join(ROOT, 'validation/mahworld/skyrealm');
let pw = null; for (const c of ['playwright', (() => { try { return p.join(cp.execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'); } catch (e) { return ''; } })()]) { try { pw = require(c); break; } catch (e) {} }
if (!pw) { console.log('mahworld-skyrealm-capture: SKIP (playwright is not installed)'); process.exit(0); }
const { chromium } = pw;
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const HOST = 'https://mahworld.test';
const ONLY = process.argv.slice(2); const want = k => ONLY.length === 0 || ONLY.indexOf(k) > -1;
const REPORT_FILE = p.join(OUT, 'capture.json');
const report = fs.existsSync(REPORT_FILE) && ONLY.length ? JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8')) : {
  renderer: 'three@0.185.1 (mahworld/vendor/three)',
  gl: 'headless Chromium, ANGLE/SwiftShader software GL — ms/frame is NOT a phone number; draw calls, triangles, lights and shadow casters are'
};
report.ranAt = new Date().toISOString();
report.revision = (() => { try { return cp.execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim() + (cp.execSync('git status --porcelain', { cwd: ROOT }).toString().trim() ? '+working-tree' : ''); } catch (e) { return 'unknown'; } })();
report.errors = report.errors || []; report.logs = report.logs || [];
const save = () => fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

const SUNSET = '18:10';
const BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315];
const VIEWS = [
  ['arrival', 'Arrival — stepping out onto the staging apron, facing the sunset'],
  ['concourse', 'MAH ASCENT — turning around to the concourse and the pads'],
  ['pads', 'Ascent pads — a pod docked, one preparing'],
  ['overlook', 'Sunset overlook — the cliff, the cloud ocean, the peaks below'],
  ['cliff', 'The cliff edge — where the cloud floor stops and the void opens'],
  ['training', 'Training expanse — the open flats, rings, gates and distance'],
  ['highcloud', 'High cloud — the cold side: towers, anvils, upper atmosphere'],
  ['islands', 'Cloud islands — the traversal chain out over the flats'],
  ['voidview', 'Void — a hole in the cloud floor and the world far below'],
  ['wide', 'Establishing — the realm from above and behind the arrival side']
];
const TIMES = [['09:30', 'day'], [SUNSET, 'sunset'], ['19:20', 'dusk'], ['22:40', 'night']];

const WIDE = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' };

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
  page.setDefaultTimeout(240000);
  page.on('pageerror', e => report.errors.push(tag + ': ' + String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts\.g|404/.test(m.text())) report.logs.push(tag + ': ' + m.text()); });
  await page.goto(HOST + '/mahworld/scene/skyrealm.html' + (query || ''), { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.MAHWORLD_SKYREALM && window.MAHWORLD_SKYREALM.state.frames > 8, null, { timeout: 220000 });
  await page.waitForTimeout(700);
}
/* headless Chromium throttles rAF below 1 fps, so the world is advanced deterministically */
const settle = (page, s = 0.8) => page.evaluate(sec => window.MAHWORLD_SKYREALM.advance(sec, 1 / 30), s).then(() => page.waitForTimeout(320));
const info = () => {
  const w = window.MAHWORLD_SKYREALM;
  let lights = 0, casters = 0;
  w.scene.traverse(o => { if (o.isLight) lights++; if (o.isMesh && o.castShadow) casters++; });
  const s = w.stats();
  return {
    drawCalls: s.drawCalls, triangles: s.triangles, geometries: s.geometries, textures: s.textures,
    ms: Number(w.state.ms.toFixed(1)), lights, shadowCasters: casters,
    clock: w.state.clock && { hhmm: w.state.clock.hhmm, label: w.state.clock.label },
    band: w.state.band, quality: w.state.quality, modules: w.state.modules,
    moduleStats: s.modules
  };
};
async function shot(page, file, meta) {
  await page.screenshot({ path: p.join(OUT, file) });
  const i = await page.evaluate(info);
  report.captures = (report.captures || []).filter(c => c.file !== file);
  report.captures.push(Object.assign({ file }, meta, i));
  console.log('captured', file.padEnd(38), 'draws', String(i.drawCalls).padStart(5), 'tris', String(i.triangles).padStart(7), 'band', i.band);
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  report.chromium = browser.version();

  /* ---- THE §43 ROTATION PROOF, first ---------------------------------- */
  if (want('spin')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=' + SUNSET + '&quality=high', 'spin');
    report.modules = await page.evaluate(() => window.MAHWORLD_SKYREALM.state.modules);
    report.spin = [];
    for (const deg of BEARINGS) {
      const r = await page.evaluate(d => window.MAHWORLD_SKYREALM.look360(d), deg);
      await settle(page);
      await shot(page, `sky-spin-${String(deg).padStart(3, '0')}.png`, { set: 'spin', degrees: deg, sector: r.sector, sectorName: r.sectorName });
      report.spin.push(r);
    }
    /* the same ring in portrait, because the realm is meant to be seen on a phone */
    const pctx = await browser.newContext(PHONE); const ppage = await pctx.newPage(); await serve(ppage);
    await open(ppage, '?hud=0&time=' + SUNSET + '&quality=high', 'spin-phone');
    for (const deg of BEARINGS) {
      const r = await ppage.evaluate(d => window.MAHWORLD_SKYREALM.look360(d), deg);
      await settle(ppage);
      await shot(ppage, `sky-spin-${String(deg).padStart(3, '0')}-phone.png`, { set: 'spin', shape: 'phone', degrees: deg, sector: r.sector, sectorName: r.sectorName });
    }
    await ctx.close(); await pctx.close(); save();
  }

  /* ---- the named views ------------------------------------------------- */
  if (want('core')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=' + SUNSET + '&quality=high', 'core');
    for (const [v, label] of VIEWS) {
      await page.evaluate(x => window.MAHWORLD_SKYREALM.setView(x), v);
      await settle(page);
      await shot(page, `sky-${v}.png`, { set: 'core', view: v, label });
    }
    await ctx.close(); save();
  }

  /* ---- §40: no time state may be visually dead ------------------------- */
  if (want('time')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=' + SUNSET + '&quality=high', 'time');
    for (const [spec, name] of TIMES) {
      await page.evaluate(t => window.MAHWORLD_SKYREALM.setTime(t), spec);
      for (const v of ['arrival', 'highcloud']) {
        await page.evaluate(x => window.MAHWORLD_SKYREALM.setView(x), v);
        await settle(page);
        await shot(page, `sky-${v}-${name}.png`, { set: 'time', view: v, time: name, spec });
      }
    }
    await ctx.close(); save();
  }

  /* ---- §44: the phone composition -------------------------------------- */
  if (want('phone')) {
    const ctx = await browser.newContext(PHONE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=' + SUNSET + '&quality=high', 'phone');
    for (const v of ['arrival', 'overlook', 'concourse', 'training', 'highcloud', 'cliff']) {
      await page.evaluate(x => window.MAHWORLD_SKYREALM.setView(x), v);
      await settle(page);
      await shot(page, `sky-${v}-phone.png`, { set: 'phone', view: v });
    }
    /* one frame with the interface visible, since that is what a person actually sees */
    await page.goto(HOST + '/mahworld/scene/skyrealm.html?time=' + SUNSET, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.MAHWORLD_SKYREALM && window.MAHWORLD_SKYREALM.state.frames > 8, null, { timeout: 220000 });
    await settle(page, 1.2);
    await shot(page, 'sky-arrival-phone-with-controls.png', { set: 'phone', view: 'arrival', hud: true });
    await ctx.close(); save();
  }

  /* ---- §45: what each tier costs --------------------------------------- */
  if (want('quality')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=' + SUNSET, 'quality');
    for (const q of ['high', 'medium', 'low']) {
      await page.evaluate(x => window.MAHWORLD_SKYREALM.setQuality(x), q);
      await page.evaluate(() => window.MAHWORLD_SKYREALM.setView('arrival'));
      await settle(page, 1.0);
      await shot(page, `sky-arrival-${q}.png`, { set: 'quality', view: 'arrival', tier: q });
    }
    await ctx.close(); save();
  }

  /* ---- Review.html ------------------------------------------------------ */
  if (want('review')) {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const caps = report.captures || [];
    const find = (f) => caps.find(c => c.file === f);
    const meta = c => c ? `${c.drawCalls} draws · ${c.triangles.toLocaleString()} tris · ${esc(c.band || '')}` : '';
    const fig = (file, cap, tag) => fs.existsSync(p.join(OUT, file))
      ? `<figure><img loading="lazy" src="${esc(file)}" alt="${esc(cap)}">${tag ? `<span class="tag">${esc(tag)}</span>` : ''}<figcaption>${esc(cap)}</figcaption></figure>` : '';
    let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MAHWORLD · UPPER REALM · review</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap">
<style>
:root{--bg:#221d44;--ink:#f3f0ff;--dim:rgba(232,226,255,.66);--line:rgba(214,206,255,.22)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:500 14px/1.55 "Space Grotesk",system-ui,sans-serif;padding:28px clamp(16px,4vw,56px)}
h1{letter-spacing:.14em;text-transform:uppercase;font-size:19px;margin:0 0 4px}
h2{letter-spacing:.2em;text-transform:uppercase;font-size:12px;color:var(--dim);margin:36px 0 10px;border-top:1px solid var(--line);padding-top:14px}
.lead{color:var(--dim);max-width:88ch;margin:0 0 8px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}
.grid.spin{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
figure{margin:0;position:relative;border:1px solid var(--line);border-radius:5px;overflow:hidden;background:#191536}
img{display:block;width:100%;height:auto}
figcaption{padding:8px 10px;font-size:11px;color:var(--dim);letter-spacing:.03em}
.tag{position:absolute;top:8px;left:8px;font-size:9px;letter-spacing:.18em;text-transform:uppercase;padding:3px 7px;border-radius:2px;background:rgba(20,16,44,.82);border:1px solid var(--line)}
code{color:#cfe0ff}
</style></head><body>
<h1>MAHWORLD · Upper Realm</h1>
<p class="lead">Actual-runtime captures from <code>mahworld/scene/skyrealm.html</code> on the permitted renderer. Revision <code>${esc(report.revision)}</code>, captured ${esc(report.ranAt)}, ${esc(report.chromium || '')} with software GL — frame times are NOT phone numbers; draw calls and triangles are. Modules present: <code>${esc(JSON.stringify(report.modules || {}))}</code>.</p>`;

    html += `<h2>§43 — the rotation proof: eight bearings from one standing position</h2>
<p class="lead">The realm is judged here first. Every frame is the SAME point on the staging apron, turned. Turning must reveal authored world in every direction, the four sectors must be distinct, and the light must change continuously across them rather than stitching.</p><div class="grid spin">`;
    for (const d of BEARINGS) {
      const f = `sky-spin-${String(d).padStart(3, '0')}.png`; const c = find(f);
      html += fig(f, `${d}° — sector ${c ? c.sector + ' ' + c.sectorName : '?'} — ${meta(c)}`, `${d}°`);
    }
    html += `</div>`;
    html += `<h2>§43/§44 — the same ring in portrait</h2><div class="grid spin">`;
    for (const d of BEARINGS) {
      const f = `sky-spin-${String(d).padStart(3, '0')}-phone.png`; const c = find(f);
      html += fig(f, `${d}° portrait — ${meta(c)}`, `${d}°`);
    }
    html += `</div>`;

    html += `<h2>The named views</h2><div class="grid">`;
    for (const [v, label] of VIEWS) { const c = find(`sky-${v}.png`); html += fig(`sky-${v}.png`, `${label} — ${meta(c)}`, v); }
    html += `</div>`;

    html += `<h2>§40 — no time state may be visually dead</h2><div class="grid">`;
    for (const [, name] of TIMES) for (const v of ['arrival', 'highcloud']) { const c = find(`sky-${v}-${name}.png`); html += fig(`sky-${v}-${name}.png`, `${v} · ${name} — ${meta(c)}`, name); }
    html += `</div>`;

    html += `<h2>§44 — phone</h2><div class="grid">`;
    for (const v of ['arrival', 'overlook', 'concourse', 'training', 'highcloud', 'cliff']) { const c = find(`sky-${v}-phone.png`); html += fig(`sky-${v}-phone.png`, `${v} — ${meta(c)}`, v); }
    html += fig('sky-arrival-phone-with-controls.png', 'arrival, interface visible', 'with UI');
    html += `</div>`;

    html += `<h2>§45 — cost per tier</h2><div class="grid">`;
    for (const q of ['high', 'medium', 'low']) { const c = find(`sky-arrival-${q}.png`); html += fig(`sky-arrival-${q}.png`, `${q} — ${meta(c)}`, q); }
    html += `</div>`;

    if (report.errors && report.errors.length) html += `<h2>Page errors</h2><pre style="color:#ffb8c4;white-space:pre-wrap">${esc(report.errors.join('\n'))}</pre>`;
    html += `</body></html>`;
    fs.writeFileSync(p.join(OUT, 'Review.html'), html);
    console.log('wrote Review.html');
  }

  save();
  console.log('\ncaptures:', (report.captures || []).length, ' page errors:', report.errors.length);
  if (report.errors.length) console.log(report.errors.slice(0, 10).join('\n'));
  await browser.close();
})();
