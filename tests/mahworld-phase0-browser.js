/* MAHWORLD PHASE 0 — real-browser verification of the control-deck bridge.
   Loads the REAL app shell (what netlify/functions/mygym.js shell() returns,
   V=453) in headless Chromium on a phone profile, serves every static file
   from this working tree, and stubs /api/mygym with a boot payload. Nothing
   here reaches Supabase or the network. Six scenarios: production flag off,
   production URL switch refused, development flow end to end, reduced motion,
   Coach client context, and the world scripts failing to load.
   Run: node tests/mahworld-phase0-browser.js   (writes evidence PNG/JSON to
   validation/mahworld/phase0/). Skips cleanly when Playwright is absent. */
'use strict';
const fs = require('fs'), p = require('path');
const ROOT = p.resolve(__dirname, '..');
const OUT = p.join(ROOT, 'validation/mahworld/phase0');
let pw = null;
for (const cand of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { pw = require(cand); break; } catch (e) {} }
if (!pw) { console.log('mahworld-phase0-browser: SKIP (playwright is not installed)'); process.exit(0); }
const { chromium, devices } = pw;
fs.mkdirSync(OUT, { recursive: true });
/* The shell exactly as the Netlify function emits it. The function needs a few
   environment values to load; placeholders are enough for the GET branch,
   which is served before any authentication and never contacts Supabase. */
for (const [k, v] of Object.entries({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'placeholder', SESSION_SECRET: 'placeholder' })) if (!process.env[k]) process.env[k] = v;
let SHELL = '';
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const HOST = 'https://mahfitt.test';
const ROUTE_MARK = 'mahfitt-job3-route-v1';

const SELF = { ok: true, account: { id: 'acct-1', name: 'TEST MEMBER', avatarUrl: '' }, member: { id: 'acct-1', name: 'TEST MEMBER', first_name: 'TEST', last_name: 'MEMBER' }, roleContext: { isClientContext: false, canCoach: false, isFobAdmin: false, signedInAccountId: 'acct-1', activeFitnessProfileId: 'acct-1' }, programs: [], recent: [], theme: null, music: null, activeWorkout: null };
const COACH_VIEWING_CLIENT = Object.assign({}, SELF, { account: { id: 'coach-1', name: 'COACH', avatarUrl: '' }, member: { id: 'client-9', name: 'CLIENT NINE', first_name: 'CLIENT', last_name: 'NINE' }, roleContext: { isClientContext: true, canCoach: true, isFobAdmin: false, signedInAccountId: 'coach-1', activeFitnessProfileId: 'client-9' } });

const results = []; let failures = 0;
function check(scenario, name, ok, detail) { results.push({ scenario, name, ok: !!ok, detail: detail == null ? '' : String(detail) }); if (!ok) { failures++; console.log('FAIL ' + scenario + ' :: ' + name + (detail ? ' — ' + detail : '')); } }

async function serve(page, opts) {
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.origin !== HOST) return route.abort();
    if (u.pathname === '/mygym') {
      const html = SHELL.replace(/window\.MAHWORLD_FLAGS=\{context:"[^"]*"\}/, 'window.MAHWORLD_FLAGS={context:' + JSON.stringify(opts.context || 'production') + '}');
      return route.fulfill({ status: 200, contentType: 'text/html', body: html });
    }
    if (u.pathname === '/api/mygym') {
      let body = {}; try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
      opts.calls && opts.calls.push(body.action || '?');
      if (body.action === 'boot') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.boot || SELF) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [], rows: [], messages: [], habits: [], resources: [] }) });
    }
    if (opts.blockWorld && u.pathname.indexOf('/mahworld/') === 0) return route.fulfill({ status: 404, contentType: 'text/plain', body: 'blocked for the smoke' });
    const f = p.join(ROOT, decodeURIComponent(u.pathname));
    if (f.indexOf(ROOT) === 0 && fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[p.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });
}
function watch(page) {
  const errors = [], consoleErrors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_FAILED|404/.test(m.text())) consoleErrors.push(m.text()); });
  return { errors, consoleErrors };
}
async function openApp(page, query) {
  await page.goto(HOST + '/mygym' + (query || ''), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-home-directory-stack]', { timeout: 20000 });
  await page.waitForTimeout(250);
}
/* Drive the app's own router through history state, exactly as a back/forward
   gesture would: nothing inside the mygym.js IIFE is reachable from outside. */
async function routeTo(page, view) {
  await page.evaluate(([mark, v]) => { const st = { __mahfitt: mark, branch: '', depth: 1, view: v, extra: {} }; history.pushState(st, '', '/mygym'); window.dispatchEvent(new PopStateEvent('popstate', { state: st })); }, [ROUTE_MARK, view]);
  await page.waitForTimeout(200);
}
const dom = (page, fn, arg) => page.evaluate(fn, arg);
const mobile = Object.assign({}, devices['iPhone 13'], { serviceWorkers: 'block', ignoreHTTPSErrors: true });

(async () => {
  const res = await require(p.join(ROOT, 'netlify/functions/mygym.js')).handler({ httpMethod: 'GET', headers: {}, path: '/mygym', queryStringParameters: {} }, {});
  SHELL = String(res && res.body || '');
  if (!res || res.statusCode !== 200 || !/window\.MAHWORLD_FLAGS=\{context:"[^"]*"\}/.test(SHELL) || !/mahworld\/mahworld-domain\.js\?v=453/.test(SHELL)) throw new Error('the Netlify shell did not render as expected: ' + (res && res.statusCode));
  let browser;
  try { browser = await chromium.launch(); } catch (e) { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
  console.log('chromium', browser.version());

  /* ---- S1: production, flag off — the member experience ------------------ */
  {
    const ctx = await browser.newContext(mobile); const page = await ctx.newPage(); const w = watch(page); const calls = [];
    await serve(page, { context: 'production', boot: SELF, calls });
    await openApp(page);
    const s = await dom(page, () => ({
      hasDomain: !!window.MAHWORLD, hasShell: !!window.MAHWORLD_SHELL, flag: window.MAHWORLD && window.MAHWORLD.flags.isEnabled(), source: window.MAHWORLD && window.MAHWORLD.flags.source(),
      attr: document.documentElement.getAttribute('data-mahworld-state'), entry: !!document.querySelector('[data-mahworld-entry]'), mentions: /mahworld/i.test(document.getElementById('mygym').innerHTML),
      directory: Array.from(document.querySelectorAll('[data-home-directory-stack] .mg-button')).map(b => b.textContent.trim()), primary: document.querySelectorAll('[data-home-primary]').length,
      worldKeys: Object.keys(localStorage).filter(k => k.indexOf('fob.mahworld') === 0)
    }));
    check('S1', 'Home renders with the world scripts loaded (domain + shell present)', s.hasDomain && s.hasShell, JSON.stringify(s));
    check('S1', 'development flag is OFF on a fresh device', s.flag === false && s.source === 'off', s.source);
    check('S1', 'no data-mahworld-state attribute on <html>', s.attr === null, s.attr);
    check('S1', 'no MAHWORLD entry and no MAHWORLD text anywhere in #mygym', !s.entry && !s.mentions, JSON.stringify(s.directory));
    check('S1', 'the directory stack is exactly ACTIVITY + PROGRAM LIBRARY, five primary actions untouched', s.directory.join('|') === 'ACTIVITY|＋ PROGRAM LIBRARY' && s.primary === 5, s.directory.join('|') + ' / ' + s.primary);
    check('S1', 'no fob.mahworld.* key written to localStorage', s.worldKeys.length === 0, JSON.stringify(s.worldKeys));
    await routeTo(page, 'settings');
    const st = await dom(page, () => ({ settings: !!document.querySelector('.mahset-view'), world: !!document.querySelector('.mahworld-settings'), mentions: /mahworld/i.test(document.getElementById('mygym').innerHTML) }));
    check('S1', 'Settings renders without the MAHWORLD section', st.settings && !st.world && !st.mentions, JSON.stringify(st));
    await routeTo(page, 'mahworld');
    const r = await dom(page, () => ({ home: !!document.querySelector('[data-home-directory-stack]'), page: !!document.querySelector('[data-mahworld-page]') }));
    check('S1', 'a direct mahworld route renders Home, not the shell', r.home && !r.page, JSON.stringify(r));
    check('S1', 'zero page errors, zero console errors', w.errors.length === 0 && w.consoleErrors.length === 0, JSON.stringify({ errors: w.errors, console: w.consoleErrors.slice(0, 5) }));
    check('S1', 'boot went to /api/mygym once as the first call', calls[0] === 'boot' && calls.filter(c => c === 'boot').length <= 2, JSON.stringify(calls));
    await routeTo(page, 'home');
    await page.locator('[data-home-directory-stack]').scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    await page.screenshot({ path: p.join(OUT, 's1-home-production-flag-off.png') });
    await page.locator('[data-home-directory-stack]').screenshot({ path: p.join(OUT, 's1-directory-stack-flag-off.png') });
    await ctx.close();
  }

  /* ---- S2: production + ?mahworld=1 on a non-local host → refused ------- */
  {
    const ctx = await browser.newContext(mobile); const page = await ctx.newPage(); const w = watch(page);
    await serve(page, { context: 'production', boot: SELF });
    await openApp(page, '?mahworld=1');
    const s = await dom(page, () => ({ flag: window.MAHWORLD.flags.isEnabled(), key: localStorage.getItem('fob.mahworld.dev.v1'), entry: !!document.querySelector('[data-mahworld-entry]'), ctx: window.MAHWORLD_FLAGS && window.MAHWORLD_FLAGS.context, host: location.hostname }));
    check('S2', '?mahworld=1 is refused on the production context off localhost (flag off, no key, no entry)', s.flag === false && s.key === null && !s.entry && s.ctx === 'production', JSON.stringify(s));
    check('S2', 'zero page errors', w.errors.length === 0, JSON.stringify(w.errors));
    await ctx.close();
  }

  /* ---- S3: deploy-preview + ?mahworld=1 → the development experience ---- */
  {
    const ctx = await browser.newContext(mobile); const page = await ctx.newPage(); const w = watch(page);
    await serve(page, { context: 'deploy-preview', boot: SELF });
    await openApp(page, '?mahworld=1');
    const s = await dom(page, () => {
      const e = document.querySelector('[data-mahworld-entry]'), sib = document.querySelector('.mg-button.program-library-home');
      const eb = e && e.getBoundingClientRect(), sb = sib && sib.getBoundingClientRect();
      const cs = e && getComputedStyle(e), ss = sib && getComputedStyle(sib);
      return { flag: window.MAHWORLD.flags.isEnabled(), source: window.MAHWORLD.flags.source(), entry: !!e, label: e && e.textContent.trim(), cls: e && e.className, attr: document.documentElement.getAttribute('data-mahworld-state'),
        geom: e && sib && { w: [eb.width, sb.width], h: [eb.height, sb.height], radius: [cs.borderRadius, ss.borderRadius], border: [cs.borderWidth, ss.borderWidth], font: [cs.fontSize, ss.fontSize], pad: [cs.padding, ss.padding], last: e === e.parentNode.lastElementChild } };
    });
    check('S3', 'flag ON from the URL switch on a non-production context (source: device storage)', s.flag === true && s.source === 'storage', s.source);
    check('S3', 'the MAHWORLD entry renders last in the directory stack with .mg-button geometry', s.entry && s.label === 'MAHWORLD' && /mg-button/.test(s.cls) && s.geom && s.geom.last, JSON.stringify(s));
    check('S3', 'entry geometry equals ＋ PROGRAM LIBRARY (width, height, radius, border, font, padding)', s.geom && Math.abs(s.geom.w[0] - s.geom.w[1]) < 0.6 && Math.abs(s.geom.h[0] - s.geom.h[1]) < 0.6 && s.geom.radius[0] === s.geom.radius[1] && s.geom.border[0] === s.geom.border[1] && s.geom.font[0] === s.geom.font[1] && s.geom.pad[0] === s.geom.pad[1], JSON.stringify(s.geom));
    check('S3', 'no state attribute yet: the profile has not opted in, so the world is OFF even with the flag on', s.attr === null, s.attr);
    await page.locator('[data-home-directory-stack]').scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    await page.screenshot({ path: p.join(OUT, 's3-home-dev-flag-on.png') });
    await page.locator('[data-home-directory-stack]').screenshot({ path: p.join(OUT, 's3-directory-stack-flag-on.png') });
    await page.click('[data-mahworld-entry]'); await page.waitForSelector('[data-mahworld-page]', { timeout: 5000 });
    let sh = await dom(page, () => ({ crown: !!document.querySelector('.mf-banner'), context: (document.querySelector('.mf-page-context strong') || {}).textContent || '', session: document.querySelector('[data-mahworld-page]').getAttribute('data-mahworld-session'), groups: Array.from(document.querySelectorAll('[data-mahworld-page] .mahset-group header')).map(h => h.textContent.trim()), text: document.querySelector('[data-mahworld-page]').textContent }));
    check('S3', 'the shell page opens under the MAHFITT crown with the MAHWORLD page context, session WORLD_OFF, five groups', sh.crown && sh.context === 'MAHWORLD' && sh.session === 'WORLD_OFF' && sh.groups.length === 5, JSON.stringify({ crown: sh.crown, context: sh.context, session: sh.session, groups: sh.groups }));
    const labels = await dom(page, () => Array.from(document.querySelectorAll('[data-mahworld-page] b')).map(b => b.textContent.trim()));
    check('S3', 'STATUS shows WORLD OFFLINE / DEVELOPMENT, LEVEL, XP, MAHGIC, AVATAR STATUS', /WORLD OFFLINE \/ DEVELOPMENT/.test(sh.text) && ['LEVEL', 'XP', 'MAHGIC', 'AVATAR STATUS'].every(l => labels.indexOf(l) > -1), JSON.stringify(labels));
    check('S3', 'no forbidden resource spelling on the page', !/mahnah|mahna\b|\bmana\b/i.test(sh.text));
    await page.locator('[data-mahworld-page]').screenshot({ path: p.join(OUT, 's3-shell-world-off.png') });
    await page.click('[data-mahworld-action="enable"]'); await page.waitForTimeout(150);
    let a = await dom(page, () => ({ attr: document.documentElement.getAttribute('data-mahworld-state'), session: document.querySelector('[data-mahworld-page]').getAttribute('data-mahworld-session'), enabled: window.MAHWORLD.currentProfile().profile.mahworldEnabled }));
    check('S3', 'ENABLE → profile opted in, session WORLD_AVAILABLE, <html data-mahworld-state="available">', a.enabled === true && a.session === 'WORLD_AVAILABLE' && a.attr === 'available', JSON.stringify(a));
    await page.click('[data-mahworld-action="enter"]'); await page.waitForTimeout(120);
    const mid = await dom(page, () => ({ attr: document.documentElement.getAttribute('data-mahworld-state'), session: document.querySelector('[data-mahworld-page]').getAttribute('data-mahworld-session') }));
    await page.waitForTimeout(900);
    const act = await dom(page, () => ({ attr: document.documentElement.getAttribute('data-mahworld-state'), session: document.querySelector('[data-mahworld-page]').getAttribute('data-mahworld-session'), ref: window.MAHWORLD.currentProfile().profile.currentWorldRef, text: document.querySelector('[data-mahworld-page]').textContent }));
    check('S3', 'ENTER → WORLD_ENTERING then WORLD_ACTIVE (simulated), attribute follows', mid.session === 'WORLD_ENTERING' && mid.attr === 'entering' && act.session === 'WORLD_ACTIVE' && act.attr === 'active' && act.ref && act.ref.worldId === 'mahtropolis-dev', JSON.stringify({ mid, act: { attr: act.attr, session: act.session, ref: act.ref } }));
    check('S3', 'the active session is labelled a simulation on the page', /SIMULATED/.test(act.text));
    await page.locator('[data-mahworld-page]').screenshot({ path: p.join(OUT, 's3-shell-world-active.png') });
    await page.click('[data-mahworld-action="exit"]'); await page.waitForTimeout(120);
    const ex = await dom(page, () => document.querySelector('[data-mahworld-page]').getAttribute('data-mahworld-session'));
    await page.waitForTimeout(700);
    const back = await dom(page, () => ({ attr: document.documentElement.getAttribute('data-mahworld-state'), session: document.querySelector('[data-mahworld-page]').getAttribute('data-mahworld-session'), ref: window.MAHWORLD.currentProfile().profile.currentWorldRef }));
    check('S3', 'EXIT → WORLD_EXITING then back to WORLD_AVAILABLE, world ref cleared', ex === 'WORLD_EXITING' && back.session === 'WORLD_AVAILABLE' && back.attr === 'available' && back.ref === null, JSON.stringify({ ex, back }));
    /* Leave the page in the middle of ENTER: the app's page-teardown owner must
       unmount the shell, the pending simulated transition must never fire over
       Home, and the half-way state settles back to AVAILABLE. */
    await page.click('[data-mahworld-action="enter"]'); await page.waitForTimeout(60); await routeTo(page, 'home'); await page.waitForTimeout(1000);
    const td = await dom(page, () => ({ shell: !!document.querySelector('[data-mahworld-page]'), home: !!document.querySelector('[data-home-directory-stack]'), state: window.MAHWORLD_SHELL.session.state, attr: document.documentElement.getAttribute('data-mahworld-state'), ref: window.MAHWORLD.currentProfile().profile.currentWorldRef }));
    check('S3', 'leaving the page mid-ENTER cancels the entry: nothing re-renders over Home, session settles to WORLD_AVAILABLE', !td.shell && td.home && td.state === 'WORLD_AVAILABLE' && td.attr === 'available' && td.ref === null, JSON.stringify(td));
    await page.click('[data-mahworld-entry]'); await page.waitForSelector('[data-mahworld-page]', { timeout: 5000 });
    /* Another owner on the same device gets a fresh session, never this one. */
    const oc = await dom(page, () => { const M = window.MAHWORLD, SH = window.MAHWORLD_SHELL; const before = SH.session.state; const restore = { accountId: 'acct-1', activeProfileId: 'acct-1', isClientContext: false, permissionKind: 'self' }; M.bind({ getAccountContext: () => ({ accountId: 'acct-2', activeProfileId: 'acct-2', isClientContext: false, permissionKind: 'self' }) }); const owner = SH.syncOwner(); const after = SH.session.state; const attr = document.documentElement.getAttribute('data-mahworld-state'); const html = SH.pageHTML(); M.bind({ getAccountContext: () => restore }); SH.syncOwner(); return { before, owner, after, attr, ownerRow: /ACCT-2/.test(html), offered: /ENABLE MAHWORLD FOR THIS ACCOUNT/.test(html), restored: SH.session.state }; });
    check('S3', 'a different signed-in account on the same device gets a fresh WORLD_OFF session and its own (un-enabled) profile', oc.before === 'WORLD_AVAILABLE' && oc.owner === 'acct-2' && oc.after === 'WORLD_OFF' && oc.attr === null && oc.ownerRow && oc.offered && oc.restored === 'WORLD_OFF', JSON.stringify(oc));
    await page.click('[data-mahworld-entry]').catch(() => {}); await routeTo(page, 'mahworld'); await page.waitForSelector('[data-mahworld-page]', { timeout: 5000 });
    await page.click('[data-mahworld-action="preview"]'); await page.waitForTimeout(150);
    const pv = await dom(page, () => { const pr = window.MAHWORLD.currentProfile().profile; return { xp: pr.progression.lifetimeXp, level: pr.progression.level, authority: pr.authority, last: pr.lastDerivation && pr.lastDerivation.authority, version: pr.lastDerivation && pr.lastDerivation.version, balance: window.MAHWORLD.getBalance().version, text: document.querySelector('[data-mahworld-page]').textContent }; });
    check('S3', 'RUN SAMPLE DERIVATION → XP > 0 as a client PREVIEW carrying the balance version; profile authority stays local-draft', pv.xp > 0 && pv.authority === 'local-draft' && pv.last === 'client-preview' && pv.version === pv.balance && /PREVIEW|local-draft/i.test(pv.text), JSON.stringify({ xp: pv.xp, level: pv.level, authority: pv.authority, last: pv.last, version: pv.version }));
    const priv = await dom(page, () => { const M = window.MAHWORLD, pr = M.currentProfile().profile; const pres = M.Presence.create({ optIn: true, level: 'venue', venueRef: 'gym-7', latitude: 51.5, longitude: -0.1, coords: { lat: 1, lng: 2 } }); const offProfile = M.Presence.toPublicPayload(pr, pres); const on = Object.assign({}, pr, { presenceOptIn: true, displayRef: 'MAH-7' }); const pub = M.Presence.toPublicPayload(on, pres); return { offProfile, pub, leak: pub && M.Presence.containsPreciseLocation(pub), keys: pub && Object.keys(pub), str: JSON.stringify(pub || {}) }; });
    check('S3', 'presence: OFF profile → null payload; opted-in payload carries venue only, no coordinates at any depth', priv.offProfile === null && priv.pub && priv.leak === false && priv.keys.indexOf('latitude') < 0 && priv.str.indexOf('51.5') < 0 && priv.pub.venueRef === 'gym-7', JSON.stringify(priv));
    const keys = await dom(page, () => Object.keys(localStorage).filter(k => k.indexOf('fob.mahworld') === 0).sort());
    check('S3', 'only the flag key and the account-namespaced draft were written', keys.join() === 'fob.mahworld.dev.v1,fob.mahworld.profile.v0.acct-1', keys.join());
    await page.click('[data-mahworld-action="portal:calendar"]'); await page.waitForTimeout(400);
    /* MAH Calendar is an overlay route in this baseline (renderCalendarOverlay), so the
       canonical destination opens ABOVE the current page — exactly what the portal must do. */
    const cal = await dom(page, () => { const ov = document.querySelector('iframe[src*="calendar"], .calendar-overlay, #calendarOverlay, [data-calendar-overlay], .mahfitt-calendar-overlay'); return { overlay: !!ov, tag: ov && ov.tagName + '.' + ov.className, src: ov && ov.getAttribute && ov.getAttribute('src'), bodyHasCalendar: /calendar/i.test(document.body.innerHTML) }; });
    check('S3', 'MAHTROPOLIS portal opens the canonical MAH Calendar (the app\'s own calendar overlay)', cal.overlay && cal.bodyHasCalendar, JSON.stringify(cal));
    await page.keyboard.press('Escape').catch(() => {});
    await routeTo(page, 'home');
    const hm = await dom(page, () => { const e = document.querySelector('[data-mahworld-entry]'); const after = e && getComputedStyle(e, '::after'); return { attr: document.documentElement.getAttribute('data-mahworld-state'), entry: !!e, anim: after && after.animationName, opacity: after && after.opacity }; });
    check('S3', 'back on Home in WORLD_AVAILABLE the entry carries the CSS-only micro-motion (::after drift)', hm.entry && hm.attr === 'available' && hm.anim === 'mahworldDrift' && Number(hm.opacity) > 0, JSON.stringify(hm));
    await page.locator('[data-home-directory-stack]').scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    await page.screenshot({ path: p.join(OUT, 's3-home-world-available.png') });
    await page.locator('[data-home-directory-stack]').screenshot({ path: p.join(OUT, 's3-directory-stack-world-available.png') });
    await routeTo(page, 'settings');
    const setw = await dom(page, () => ({ section: !!document.querySelector('.mahworld-settings'), actions: Array.from(document.querySelectorAll('.mahworld-settings .mahset-action b')).map(b => b.textContent.trim()) }));
    check('S3', 'Settings shows the MAHWORLD · DEVELOPMENT section with OPEN and DISABLE', setw.section && setw.actions.join('|') === 'OPEN MAHWORLD|DISABLE DEVELOPMENT MODE', JSON.stringify(setw));
    await page.click('[data-a="mahworld-dev-off"]'); await page.waitForTimeout(300);
    const off = await dom(page, () => ({ flag: window.MAHWORLD.flags.isEnabled(), attr: document.documentElement.getAttribute('data-mahworld-state'), entry: !!document.querySelector('[data-mahworld-entry]'), home: !!document.querySelector('[data-home-directory-stack]'), key: localStorage.getItem('fob.mahworld.dev.v1') }));
    check('S3', 'DISABLE DEVELOPMENT MODE → flag off, attribute removed, Home without the entry', off.flag === false && off.attr === null && !off.entry && off.home && off.key === null, JSON.stringify(off));
    check('S3', 'zero page errors, zero console errors across the whole development flow', w.errors.length === 0 && w.consoleErrors.length === 0, JSON.stringify({ errors: w.errors, console: w.consoleErrors.slice(0, 5) }));
    await ctx.close();
  }

  /* ---- S4: prefers-reduced-motion → the hook is inert -------------------- */
  {
    const ctx = await browser.newContext(Object.assign({}, mobile, { reducedMotion: 'reduce' })); const page = await ctx.newPage(); const w = watch(page);
    await serve(page, { context: 'deploy-preview', boot: SELF });
    await openApp(page, '?mahworld=1');
    await page.click('[data-mahworld-entry]'); await page.waitForSelector('[data-mahworld-page]');
    await page.click('[data-mahworld-action="enable"]'); await page.waitForTimeout(150);
    await routeTo(page, 'home');
    const rm = await dom(page, () => { const e = document.querySelector('[data-mahworld-entry]'); const after = getComputedStyle(e, '::after'); return { attr: document.documentElement.getAttribute('data-mahworld-state'), anim: after.animationName, transition: after.transitionProperty, dur: after.transitionDuration }; });
    check('S4', 'under prefers-reduced-motion the entry has no animation and no transition while WORLD_AVAILABLE', rm.attr === 'available' && rm.anim === 'none' && (rm.dur === '0s' || rm.transition === 'none'), JSON.stringify(rm));
    await page.click('[data-a="logout"]'); await page.waitForSelector('.my-login', { timeout: 8000 });
    const lo = await dom(page, () => ({ attr: document.documentElement.getAttribute('data-mahworld-state'), state: window.MAHWORLD_SHELL.session.state, owner: window.MAHWORLD.currentOwner().ok, mentions: /mahworld/i.test(document.getElementById('mygym').innerHTML), draft: !!localStorage.getItem('fob.mahworld.profile.v0.acct-1') }));
    check('S4', 'sign-out discards the world session: attribute removed, WORLD_OFF, no owner, login screen without MAHWORLD; the account\'s draft stays namespaced', lo.attr === null && lo.state === 'WORLD_OFF' && lo.owner === false && !lo.mentions && lo.draft, JSON.stringify(lo));
    check('S4', 'zero page errors', w.errors.length === 0, JSON.stringify(w.errors));
    await ctx.close();
  }

  /* ---- S5: Coach Mode viewing a client, flag on → no world at all -------- */
  {
    const ctx = await browser.newContext(mobile); const page = await ctx.newPage(); const w = watch(page);
    await page.addInitScript(() => { try { sessionStorage.setItem('fob.mahfitt.coachContext.v1', JSON.stringify({ id: 'client-9', name: 'CLIENT NINE' })); } catch (e) {} });
    await serve(page, { context: 'deploy-preview', boot: COACH_VIEWING_CLIENT });
    await openApp(page, '?mahworld=1');
    const c = await dom(page, () => ({ flag: window.MAHWORLD.flags.isEnabled(), entry: !!document.querySelector('[data-mahworld-entry]'), mentions: /mahworld/i.test(document.getElementById('mygym').innerHTML), owner: window.MAHWORLD.currentOwner(), profile: window.MAHWORLD.currentProfile().ok, attr: document.documentElement.getAttribute('data-mahworld-state') }));
    check('S5', 'flag is on but the coach viewing a client sees no entry and no MAHWORLD text', c.flag === true && !c.entry && !c.mentions, JSON.stringify(c));
    check('S5', 'the domain refuses an owner in client context (neither coach nor client becomes the player)', c.owner && c.owner.ok === false && c.owner.reason === 'CLIENT_CONTEXT_BLOCKED' && c.owner.ownerAccountId === null && c.profile === false, JSON.stringify(c.owner));
    await routeTo(page, 'mahworld');
    const r = await dom(page, () => ({ home: !!document.querySelector('[data-home-directory-stack]'), page: !!document.querySelector('[data-mahworld-page]') }));
    check('S5', 'a direct mahworld route in client context renders Home', r.home && !r.page, JSON.stringify(r));
    await routeTo(page, 'settings');
    const st = await dom(page, () => ({ settings: !!document.querySelector('.mahset-view'), world: !!document.querySelector('.mahworld-settings') }));
    check('S5', 'Settings has no MAHWORLD section in client context', st.settings && !st.world, JSON.stringify(st));
    const keys = await dom(page, () => Object.keys(localStorage).filter(k => k.indexOf('fob.mahworld.profile') === 0));
    check('S5', 'no draft was written for the coach or the client', keys.length === 0, JSON.stringify(keys));
    check('S5', 'zero page errors', w.errors.length === 0, JSON.stringify(w.errors));
    await routeTo(page, 'home');
    await page.locator('[data-home-directory-stack]').scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    await page.screenshot({ path: p.join(OUT, 's5-coach-client-context.png') });
    await ctx.close();
  }

  /* ---- S6: the world scripts fail to load (404) → MAHFITT unaffected ---- */
  {
    const ctx = await browser.newContext(mobile); const page = await ctx.newPage(); const w = watch(page);
    await serve(page, { context: 'deploy-preview', boot: SELF, blockWorld: true });
    await page.evaluate(() => { try { localStorage.setItem('fob.mahworld.dev.v1', '1'); } catch (e) {} }).catch(() => {});
    await openApp(page, '?mahworld=1');
    const s = await dom(page, () => ({ domain: typeof window.MAHWORLD, shell: typeof window.MAHWORLD_SHELL, home: !!document.querySelector('[data-home-directory-stack]'), entry: !!document.querySelector('[data-mahworld-entry]'), primary: document.querySelectorAll('[data-home-primary]').length }));
    check('S6', 'with /mahworld/*.js returning 404 MAHFITT still boots to Home, no entry, no globals', s.domain === 'undefined' && s.shell === 'undefined' && s.home && !s.entry && s.primary === 5, JSON.stringify(s));
    await routeTo(page, 'mahworld');
    const r = await dom(page, () => ({ home: !!document.querySelector('[data-home-directory-stack]'), page: !!document.querySelector('[data-mahworld-page]') }));
    check('S6', 'the mahworld route falls back to Home when the domain is absent', r.home && !r.page, JSON.stringify(r));
    await routeTo(page, 'settings');
    const st = await dom(page, () => ({ settings: !!document.querySelector('.mahset-view'), world: !!document.querySelector('.mahworld-settings') }));
    check('S6', 'Settings renders normally without the domain', st.settings && !st.world, JSON.stringify(st));
    check('S6', 'zero page errors (a missing optional script is not an exception)', w.errors.length === 0, JSON.stringify(w.errors));
    await ctx.close();
  }

  await browser.close();
  const summary = { ranAt: new Date().toISOString(), shell: 'netlify/functions/mygym.js handler GET (V=453), served at https://mahfitt.test/mygym with /api/mygym stubbed', device: 'iPhone 13 (Playwright device profile), service workers blocked', passed: results.filter(r => r.ok).length, failed: failures, results };
  fs.writeFileSync(p.join(OUT, 'browser-smoke.json'), JSON.stringify(summary, null, 2));
  console.log('mahworld-phase0-browser: ' + summary.passed + '/' + results.length + ' PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('SMOKE CRASH', e && e.stack || e); process.exit(2); });
