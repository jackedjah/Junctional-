/* MAHPLAZA v6 (PLATINUM ECOSYSTEM closure) — actual-runtime review set.
   Same page a phone opens (mahworld/scene/mahplaza.html), served from the working tree to
   headless Chromium (software GL). Writes validation/mahworld/mahplaza-v6/:
     core      review views wide, NIGHT and DAY (arrival, in-world, skyline, plaza node, three entrances,
               MAH MATCH hall, residents, appearance, sky/plant)
     phone     portrait phone frames of the key views
     noui      the AAA test: the in-world and skyline frames with every label hidden (?hud=0 is always on here;
               this set additionally hides the in-world signage textures)
     life      the world-life test: the SAME camera at 0 / 20 / 40 / 60 s with life stats and the event log,
               plus a frame of an ambient GYMATTACK event framed from a custom camera when one occurs
     quality   the in-world night frame at high / medium / low with its cost
     review    Review.html (static, relative assets, BASELINE = v3 / AFTER = v6, REFERENCE = concept)
   Run: node tests/mahworld-mahplaza-capture-v6.js [core phone noui life quality review]  (no args = all) */
'use strict';
const fs = require('fs'), p = require('path'), cp = require('child_process');
const ROOT = p.resolve(__dirname, '..');
const OUT = p.join(ROOT, 'validation/mahworld/mahplaza-v6');
const BASE = p.join(ROOT, 'validation/mahworld/mahplaza-v5');
let pw = null; for (const c of ['playwright', (() => { try { return p.join(cp.execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'); } catch (e) { return ''; } })()]) { try { pw = require(c); break; } catch (e) {} }
if (!pw) { console.log('mahworld-mahplaza-capture-v6: SKIP (playwright is not installed)'); process.exit(0); }
const { chromium } = pw;
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const HOST = 'https://mahworld.test';
const ONLY = process.argv.slice(2); const want = k => ONLY.length === 0 || ONLY.indexOf(k) > -1;
const REPORT_FILE = p.join(OUT, 'capture.json');
const report = fs.existsSync(REPORT_FILE) && ONLY.length ? JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8')) : { renderer: 'three@0.185.1 (mahworld/vendor/three)', gl: 'headless Chromium, ANGLE/SwiftShader software GL — ms/frame is NOT a phone number; draw calls, triangles, lights and shadow casters are' };
report.ranAt = new Date().toISOString();
report.revision = (() => { try { return cp.execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim() + (cp.execSync('git status --porcelain', { cwd: ROOT }).toString().trim() ? '+working-tree' : ''); } catch (e) { return 'unknown'; } })();
report.errors = report.errors || []; report.logs = report.logs || [];
const save = () => fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

async function serve(page) {
  await page.route('**/*', route => { const u = new URL(route.request().url()); if (u.origin !== HOST) return route.abort(); const f = p.join(ROOT, decodeURIComponent(u.pathname)); if (f.indexOf(ROOT) === 0 && fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[p.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); return route.fulfill({ status: 404, contentType: 'text/plain', body: '' }); });
}
async function open(page, query, tag) {
  page.setDefaultTimeout(240000);
  page.on('pageerror', e => report.errors.push(tag + ': ' + String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts\.g|404/.test(m.text())) report.logs.push(tag + ': ' + m.text()); });
  await page.goto(HOST + '/mahworld/scene/mahplaza.html' + (query || ''), { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.MAHWORLD_MAHPLAZA && window.MAHWORLD_MAHPLAZA.state.frames > 12, null, { timeout: 200000 });
  await Promise.race([page.evaluate(() => window.MAHWORLD_MAHPLAZA.ready), page.waitForTimeout(20000)]);
  await page.waitForTimeout(400);
}
const info = () => { const w = window.MAHWORLD_MAHPLAZA; let lights = 0, casters = 0, animated = 0; w.scene.traverse(o => { if (o.isLight) lights++; if (o.isMesh && o.castShadow) casters++; }); return { drawCalls: w.renderer.info.render.calls, triangles: w.renderer.info.render.triangles, ms: Number(w.state.ms.toFixed(1)), lights, shadowCasters: casters, geometries: w.renderer.info.memory.geometries, textures: w.renderer.info.memory.textures, programs: (w.renderer.info.programs || []).length, heapMB: performance.memory ? Number((performance.memory.usedJSHeapSize / 1048576).toFixed(1)) : null, clock: w.state.clock && { hhmm: w.state.clock.hhmm, label: w.state.clock.label }, quality: w.quality, modules: w.modules, residents: (w.residents || []).length + ((w.life && w.life.residents) ? w.life.residents.length : 0), life: w.life && w.life.stats ? JSON.parse(JSON.stringify(w.life.stats)) : null }; };
const setView = (page, v) => page.evaluate(v => window.MAHWORLD_MAHPLAZA.setView(v, { instant: true }), v).then(() => page.waitForTimeout(700));
const setTime = (page, t) => page.evaluate(t => window.MAHWORLD_MAHPLAZA.setTime(t), t).then(() => page.waitForTimeout(1200));
async function shot(page, file, meta) { await page.screenshot({ path: p.join(OUT, file) }); const i = await page.evaluate(info); report.captures = (report.captures || []).filter(c => c.file !== file); report.captures.push(Object.assign({ file }, meta, i)); console.log('captured', file, 'draws', i.drawCalls, 'tris', i.triangles, 'ms', i.ms, 'lights', i.lights, 'casters', i.shadowCasters); }
const WIDE = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' };
const VIEWS = [
  ['establishing', 'Arrival — plaza, three destinations, skyline behind'],
  ['overlook', 'Overlook — the whole site plan and the gaps between the facilities'],
  ['valley-right', 'Right valley — mountains and the basin through the city'],
  ['valley-centre', 'Centre valley — mountains behind the city'],
  ['natural-edge', 'Natural edge — where the built world stops'],
  ['in-world', 'In-world — ground level, foreground / midground / background'],
  ['skyline', 'Skyline — the district behind MAH MATCH (midground blocks, walkway, towers, distant forms)'],
  ['plaza-node', 'Plaza node — foreground composition: paths, seating, masts, curbs'],
  ['gym-entrance', 'MAH GYM — massing, canopy, courses, interior'],
  ['match-entrance', 'MAH MATCH — exterior and the two entrance actions in architecture'],
  ['match-hall', 'MAH MATCH hall — the engineered arena, tiers, truss, bays'],
  ['market-entrance', 'MAH MARKET — massing and interior'],
  ['residents', 'Residents — crystalline humanoids, contact grounding, own colours'],
  ['appearance', 'Appearance check camera'],
  ['sky-plant', 'Sky, atmosphere bands, plant detail']
];
const BASELINE = ['establishing', 'in-world', 'skyline', 'plaza-node', 'gym-entrance', 'match-entrance', 'match-hall', 'market-entrance', 'residents', 'sky-plant', 'appearance']
  .reduce((o, v) => { o[v] = `v5-${v}-night-wide.png`; return o; }, {});

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  report.chromium = browser.version();
  if (want('core')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple&quality=high', 'core');
    report.modules = await page.evaluate(() => window.MAHWORLD_MAHPLAZA.modules);
    for (const time of ['night', 'day']) { await setTime(page, time); for (const [view, title] of VIEWS) { await setView(page, view); await shot(page, `v6-${view}-${time}-wide.png`, { set: 'core', view, time, label: 'wide', title }); } }
    await setTime(page, 'dusk'); for (const view of ['establishing', 'skyline']) { await setView(page, view); await shot(page, `v6-${view}-dusk-wide.png`, { set: 'core', view, time: 'dusk', label: 'wide' }); }
    await ctx.close(); save();
  }
  if (want('phone')) {
    const ctx = await browser.newContext(PHONE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple', 'phone');
    for (const view of ['establishing', 'in-world', 'skyline', 'overlook', 'valley-right', 'match-entrance', 'residents']) { await setView(page, view); await shot(page, `v6-${view}-night-phone.png`, { set: 'phone', view, time: 'night', label: 'phone' }); }
    await setTime(page, 'day'); for (const view of ['in-world', 'match-hall']) { await setView(page, view); await shot(page, `v6-${view}-day-phone.png`, { set: 'phone', view, time: 'day', label: 'phone' }); }
    await ctx.close();
    const ctx2 = await browser.newContext(PHONE); const page2 = await ctx2.newPage(); await serve(page2);
    await open(page2, '?time=night&theme=blue&self=purple&view=in-world', 'phone-hud'); await page2.waitForTimeout(800);
    await shot(page2, 'v6-in-world-night-phone-with-controls.png', { set: 'phone', view: 'in-world', time: 'night', label: 'phone with controls' });
    await ctx2.close(); save();
  }
  /* the AAA test (brief §60): no labels at all — hide signage and HUD, judge the world alone */
  if (want('noui')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple', 'noui');
    await page.evaluate(() => { const w = window.MAHWORLD_MAHPLAZA; w.scene.traverse(o => { if (o.isMesh && o.material && o.material.map && o.material.map.image && o.material.map.image.tagName === 'CANVAS' && /sign|word/i.test(o.material.name || '') ) o.visible = false; }); w.scene.traverse(o => { if (o.isMesh && o.material && (o.material.name === '' ) && o.material.map && o.material.transparent && o.geometry.type === 'PlaneGeometry' && o.material.map.image && o.material.map.image.width >= 2000) o.visible = false; }); w.renderOnce(); });
    await page.waitForTimeout(600);
    for (const view of ['in-world', 'establishing', 'skyline', 'overlook', 'valley-right']) { await setView(page, view); await shot(page, `v6-noui-${view}-night.png`, { set: 'noui', view, time: 'night', label: 'no labels' }); }
    await ctx.close(); save();
  }
  /* the world-life test (brief §44): stand still and let the world act. Headless browsers throttle
     requestAnimationFrame to a fraction of a frame per second, so the capture advances the world
     deterministically through the SAME step function the browser runs (world.advance). */
  if (want('life')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple', 'life');
    await setView(page, 'in-world');
    const stills = [];
    for (const at of [0, 20, 40, 60]) {
      if (at) await page.evaluate(s => window.MAHWORLD_MAHPLAZA.advance(s), 20);
      await page.waitForTimeout(120);
      const f = `v6-life-in-world-${at}s.png`; await page.screenshot({ path: p.join(OUT, f) });
      const st = await page.evaluate(() => { const w = window.MAHWORLD_MAHPLAZA; return w.life ? { stats: JSON.parse(JSON.stringify(w.life.stats || {})), log: (w.life.log || []).slice(-12) } : null; });
      stills.push({ file: f, atS: at, life: st }); console.log('life still', at, 's', st && JSON.stringify(st.stats));
    }
    /* advance until an ambient GYMATTACK-class event is running, then frame it from a custom camera */
    let framed = null;
    for (let i = 0; i < 40 && !framed; i++) {
      await page.evaluate(() => window.MAHWORLD_MAHPLAZA.advance(3));
      const ev = await page.evaluate(() => { const w = window.MAHWORLD_MAHPLAZA; if (!w.life || !w.life.log) return null; const L = w.life.log.slice().reverse().find(e => e && e.where && /strike|spar|levit|dash|projectile|wave|training/i.test(e.name || e.id || '')); return L && L.where ? { name: L.name || L.id, where: L.where, t: L.t } : null; });
      if (!ev) continue;
      const d = Math.hypot(ev.where[0], ev.where[2]) || 1, dist = d > 80 ? 30 : 15;
      await page.evaluate(v => window.MAHWORLD_MAHPLAZA.setCustomView(v), { pos: [ev.where[0] - (ev.where[0] / d) * dist + 5, Math.max(2.4, (ev.where[1] || 0) + 4), ev.where[2] - (ev.where[2] / d) * dist + 7], look: [ev.where[0], (ev.where[1] || 0) + 1.2, ev.where[2]], fov: 50 });
      await page.evaluate(() => window.MAHWORLD_MAHPLAZA.advance(0.6, 1 / 60));
      const f = 'v6-life-event.png'; await page.screenshot({ path: p.join(OUT, f) });
      framed = { file: f, event: ev }; console.log('event framed', ev.name, ev.where.map(v => Math.round(v)));
    }
    const summary = await page.evaluate(() => { const L = window.MAHWORLD_MAHPLAZA.life; return { stats: JSON.parse(JSON.stringify(L.stats || {})), log: (L.log || []).slice(-20) }; });
    report.life = { stills, framed: framed || 'no event framed', modulePresent: true, summary };
    await ctx.close(); save();
  }

  if (want('quality')) {
    const ctx = await browser.newContext(WIDE); const page = await ctx.newPage(); await serve(page);
    await open(page, '?hud=0&time=night&theme=blue&self=purple&quality=high', 'quality');
    await setView(page, 'in-world');
    report.quality = [];
    for (const q of ['high', 'medium', 'low']) { await page.evaluate(q => window.MAHWORLD_MAHPLAZA.setQuality(q), q); await page.waitForTimeout(1500); const f = `v6-quality-${q}-in-world-night.png`; await page.screenshot({ path: p.join(OUT, f) }); const i = await page.evaluate(info); report.quality.push(Object.assign({ file: f, tier: q }, i)); console.log('quality', q, 'draws', i.drawCalls, 'tris', i.triangles, 'ms', i.ms, 'casters', i.shadowCasters); }
    await ctx.close(); save();
  }
  await browser.close(); save();
  if (want('review')) writeReview();
  console.log('mahworld-mahplaza-capture-v6: ' + (report.captures || []).length + ' captures, page errors ' + report.errors.length + (report.logs.length ? ' | ' + report.logs.slice(0, 4).join(' | ') : ''));
  process.exit(report.errors.length ? 1 : 0);
})().catch(e => { console.error('CAPTURE CRASH', e && e.stack || e); process.exit(2); });

function writeReview() {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const caps = report.captures || [];
  const cap = (view, time, label) => caps.find(c => c.view === view && c.time === time && c.label === label);
  const baseCap = (() => { try { return JSON.parse(fs.readFileSync(p.join(BASE, 'capture.json'), 'utf8')).captures || []; } catch (e) { return []; } })();
  const baseInfo = view => baseCap.find(c => c.view === view && c.time === 'night' && c.label === 'wide');
  const fig = (src, cap, tag) => src ? `<figure><span class="tag tag--${tag.toLowerCase()}">${tag}</span><a href="${esc(src)}"><img loading="lazy" src="${esc(src)}" alt="${esc(cap)}"></a><figcaption>${esc(cap)}</figcaption></figure>` : '';
  const meta = c => c ? `${c.drawCalls} draws · ${c.triangles.toLocaleString()} tris · ${c.lights} lights · ${c.shadowCasters} casters` : '';
  const gates = fs.existsSync(p.join(OUT, 'gates.json')) ? JSON.parse(fs.readFileSync(p.join(OUT, 'gates.json'), 'utf8')) : null;
  const changed = (() => { try { return cp.execSync('git diff --stat 86da57d -- . ":(exclude)validation"', { cwd: ROOT }).toString().trim(); } catch (e) { return ''; } })();
  const refs = fs.existsSync(p.join(BASE, 'reference')) ? fs.readdirSync(p.join(BASE, 'reference')).map(f => '../mahplaza-v5/reference/' + f) : [];
  const aaaRef = fs.existsSync(p.join(OUT, 'reference')) ? fs.readdirSync(p.join(OUT, 'reference')).map(f => 'reference/' + f) : [];
  let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MAHPLAZA v6 — the platinum ecosystem</title>
<style>:root{--bg:#0b1020;--ink:#e8f0ff;--dim:#9fb3d3;--line:#22304a;--accent:#8fd0ff;--ref:#c9b2ff;--base:#9aa7bb;--after:#8fd0ff;--pass:#63e6a3;--partial:#ffd39a;--blocked:#ff8fa0}
html{background:var(--bg);color:var(--ink);font:15px/1.5 "Space Grotesk",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif}body{margin:0;padding:28px clamp(16px,4vw,56px) 80px;max-width:1500px}
h1{font-size:22px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 4px}h2{font-size:14px;letter-spacing:.24em;text-transform:uppercase;color:var(--dim);margin:44px 0 12px;padding-top:16px;border-top:1px solid var(--line)}
p{max-width:78ch;color:var(--dim)}p.lead{color:var(--ink)}code{font-size:.9em;color:var(--accent)}pre{font-size:12px;color:var(--dim);overflow-x:auto;background:#0e1628;padding:10px;border:1px solid var(--line);border-radius:4px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}.grid--wide{grid-template-columns:repeat(auto-fill,minmax(420px,1fr))}.grid--pair{grid-template-columns:repeat(auto-fit,minmax(420px,1fr))}
figure{margin:0;position:relative;background:#0e1628;border:1px solid var(--line);border-radius:4px;overflow:hidden}figure img{display:block;width:100%;height:auto;background:#000}figcaption{padding:8px 10px 10px;font-size:12.5px;color:var(--dim)}
.tag{position:absolute;top:8px;left:8px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;padding:3px 7px;border-radius:2px;background:rgba(6,10,24,.85);border:1px solid var(--line)}.tag--reference{color:var(--ref)}.tag--baseline{color:var(--base)}.tag--after{color:var(--after)}
table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--dim);font-weight:500;letter-spacing:.08em;text-transform:uppercase;font-size:11px}
.pill{display:inline-block;padding:1px 8px;border-radius:2px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;border:1px solid currentColor}.PASS{color:var(--pass)}.PARTIAL{color:var(--partial)}.BLOCKED,.NOT_RUN,.FAIL{color:var(--blocked)}.wrap{overflow-x:auto}</style></head><body>
<h1>MAHPLAZA — the platinum ecosystem (v6)</h1>
<p class="lead">Actual-runtime captures from <code>mahworld/scene/mahplaza.html</code> on the permitted renderer. Revision <code>${esc(report.revision)}</code>, captured ${esc(report.ranAt)}, ${esc(report.chromium || '')} with software GL. BASELINE frames are the v5 chromium-city pass (<code>../mahplaza-v5/</code>); AFTER frames are this pass. Modules present at capture: <code>${esc(JSON.stringify(report.modules || {}))}</code>.</p>`;
  if (aaaRef.length || refs.length) html += `<h2>Reference</h2><p>The concept images set mood and density targets; they are not evidence.</p><div class="grid grid--pair">${aaaRef.concat(refs).map(r => fig(r, 'Concept image (downscaled copy).', 'REFERENCE')).join('')}</div>`;
  html += `<h2>Plaza — baseline against after (night)</h2><div class="grid grid--pair">`;
  for (const [view, title] of VIEWS) { const b = BASELINE[view], c = cap(view, 'night', 'wide'); if (!c) continue; if (b && fs.existsSync(p.join(BASE, b))) html += fig('../mahplaza-v5/' + b, 'v5 — ' + title + (baseInfo(view) ? ' — ' + baseInfo(view).drawCalls + ' draws · ' + baseInfo(view).triangles.toLocaleString() + ' tris' : ''), 'BASELINE'); html += fig(c.file, 'v6 — ' + title + ' — ' + meta(c), 'AFTER'); }
  html += `</div><h2>Day and dusk</h2><div class="grid">`;
  for (const c of caps.filter(c => c.set === 'core' && c.time !== 'night')) html += fig(c.file, `${c.time.toUpperCase()} — ${c.view} — ${meta(c)}`, 'AFTER');
  html += `</div>`;
  const noui = caps.filter(c => c.set === 'noui'); if (noui.length) html += `<h2>The AAA test — no labels</h2><p>Signage and HUD hidden. Does a still frame still read as a real place with scale, materials, light, depth and activity?</p><div class="grid grid--wide">${noui.map(c => fig(c.file, `${c.view} — ${meta(c)}`, 'AFTER')).join('')}</div>`;
  if (report.life) { html += `<h2>World-life test — the same camera for one minute</h2><p>Life module present: <code>${report.life.modulePresent}</code>. Stills at 0 / 20 / 40 / 60 s with the life stats and the last events. ${typeof report.life.framed === 'string' ? esc(report.life.framed) : 'An ambient event was framed from a custom camera: <code>' + esc(report.life.framed.event.name) + '</code>.'}</p><div class="grid">`; for (const s of report.life.stills) html += fig(s.file, `${s.atS} s — ${s.life ? 'stats ' + esc(JSON.stringify(s.life.stats)) : 'no life module'}`, 'AFTER'); if (typeof report.life.framed !== 'string') html += fig(report.life.framed.file, 'Ambient event: ' + esc(report.life.framed.event.name), 'AFTER'); html += `</div>`; const last = report.life.stills[report.life.stills.length - 1]; if (last && last.life && last.life.log && last.life.log.length) html += `<pre>${esc(last.life.log.map(e => `${(e.t || 0).toFixed ? (e.t).toFixed(1) : e.t}s  ${e.name || e.id}  ${e.where ? (Array.isArray(e.where) ? e.where : [e.where.x, e.where.y, e.where.z]).map(v => Math.round(v)).join(',') : ''}`).join('\n'))}</pre>`; }
  const ph = caps.filter(c => c.set === 'phone'); if (ph.length) html += `<h2>Phone frames</h2><div class="grid">${ph.map(c => fig(c.file, `${esc(c.label)} · ${c.view} · ${c.time} — ${meta(c)}`, 'AFTER')).join('')}</div>`;
  if (report.quality) html += `<h2>Quality tiers</h2><div class="grid">${report.quality.map(q => fig(q.file, `${q.tier.toUpperCase()} — ${meta(q)} · ${q.ms} ms (software GL)`, 'AFTER')).join('')}</div>`;
  if (gates) { html += `<h2>Acceptance (brief §50–§54)</h2><div class="wrap"><table><thead><tr><th>Item</th><th>Status</th><th>Evidence / note</th></tr></thead><tbody>${gates.gates.map(g => `<tr><td>${esc(g.id)} — ${esc(g.name)}</td><td><span class="pill ${esc(g.status)}">${esc(g.status.replace('_', ' '))}</span></td><td>${esc(g.note)}</td></tr>`).join('')}</tbody></table></div>`; if (gates.discrepancies) html += `<h2>Remaining visible discrepancies</h2><ul>${gates.discrepancies.map(d => `<li>${esc(d)}</li>`).join('')}</ul>`; }
  html += `<h2>Technical</h2><div class="wrap"><table><thead><tr><th>File</th><th>View</th><th>Time</th><th>Draws</th><th>Tris</th><th>Lights</th><th>Casters</th><th>ms (software GL)</th><th>Heap MB</th></tr></thead><tbody>${caps.map(c => `<tr><td>${esc(c.file)}</td><td>${esc(c.view)}</td><td>${esc(c.time)}</td><td>${c.drawCalls}</td><td>${c.triangles.toLocaleString()}</td><td>${c.lights}</td><td>${c.shadowCasters}</td><td>${c.ms}</td><td>${c.heapMB == null ? '—' : c.heapMB}</td></tr>`).join('')}</tbody></table></div>
<p>Baseline v5 (night, wide): ${esc(baseCap.filter(c => c.label === 'wide' && c.time === 'night').map(c => c.view + ' ' + c.drawCalls + ' draws / ' + c.triangles.toLocaleString() + ' tris').join(' · '))}</p>
<h3>Changed files against 86da57d (v5)</h3><pre>${esc(changed)}</pre>
<p>Full data: <code>capture.json</code>. Page errors during capture: ${report.errors.length}.</p></body></html>`;
  fs.writeFileSync(p.join(OUT, 'Review.html'), html);
  console.log('wrote Review.html');
}
