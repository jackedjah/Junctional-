/* ROAM acceptance. Drives the real page the way a viewer does — real key events, real pointer
   drags on the real stick element — and measures the camera, not the state object. */
'use strict';
const fs = require('fs'), p = require('path'), cp = require('child_process');
const ROOT = '/home/user/Junctional-', SC = __dirname;
let pw = null; for (const c of ['playwright', p.join(cp.execSync('npm root -g').toString().trim(), 'playwright')]) { try { pw = require(c); break; } catch (e) {} }
const { chromium } = pw;
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json' };
const HOST = 'https://mahworld.test';
let pass = 0, fail = 0;
const P = (n, ok, d) => { if (ok) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  — ' + d : '')); } };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push('ERR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|404|ERR_FAILED/.test(m.text())) errs.push('C ' + m.text()); });
  await page.route('**/*', r => {
    const u = new URL(r.request().url()); if (u.origin !== HOST) return r.abort();
    const f = p.join(ROOT, decodeURIComponent(u.pathname));
    if (f.indexOf(ROOT) === 0 && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, contentType: MIME[p.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return r.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });
  await page.goto(HOST + '/mahworld/scene/mahplaza.html', { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.MAHWORLD_MAHPLAZA && window.MAHWORLD_MAHPLAZA.state.frames > 2, null, { timeout: 400000 });
  await page.evaluate(() => window.MAHWORLD_MAHPLAZA.setTime('21:40'));

  const cam = () => page.evaluate(() => { const c = window.MAHWORLD_MAHPLAZA.camera; return { x: +c.position.x.toFixed(3), y: +c.position.y.toFixed(3), z: +c.position.z.toFixed(3) }; });
  const st = () => page.evaluate(() => Object.assign({}, window.MAHWORLD_MAHPLAZA.state));
  const shot = n => page.screenshot({ path: p.join(SC, 'roam-' + n + '.png'), timeout: 240000 });
  /* REAL key events drive the input path; advance() drives the integration at a fixed dt. Under
     SwiftShader this page runs near 1 fps and roam clamps a frame to 0.1 s, so a wall-clock key hold
     measures the renderer, not the movement (L14). */
  /* REAL key/pointer events drive the INPUT path; roam's own integrator is then stepped at a fixed
     dt so the measurement is of roam and not of SwiftShader's ~1 fps (L14 — and roam's anti-teleport
     clamp caps a frame at 0.1 s, so a wall-clock key hold measures the renderer). advance() steps
     roam identically in production; it is not used for the long traversals here only because it also
     steps every resident, cloud and beam, and 1800 of those iterations killed the container once. */
  const sim = secs => page.evaluate(s => {
    const M = window.MAHWORLD_MAHPLAZA, DT = 1 / 60, n = Math.round(s / DT);
    for (let i = 0; i < n; i++) M.roam.step(DT);
    M.roam.applyTo(M.camera);
  }, secs);
  const hold = async (key, secs) => { await page.keyboard.down(key); await sim(secs); await page.keyboard.up(key); };
  const holdBoth = async (k1, k2, secs) => {
    await page.keyboard.down(k1); await page.keyboard.down(k2); await sim(secs);
    await page.keyboard.up(k2); await page.keyboard.up(k1);
  };
  const settle = () => sim(0.3);
  /* one real world step + render, for the frames we actually look at */
  const draw = () => page.evaluate(() => window.MAHWORLD_MAHPLAZA.advance(0.2, 1 / 30));

  /* R01 — the button exists and enabling roam does not jump the camera */
  const before = await cam();
  /* the page now renders three cities and its rAF loop never idles, so Playwright's actionability
     waits (boundingBox, click) starve and time out. Both are replaced with direct DOM calls, which
     still run the real listeners — the input path is what these checks are about, not Playwright. */
  const tap = sel => page.evaluate(q => { const e = document.querySelector(q); if (e) e.click(); return !!e; }, sel);
  const rect = sel => page.evaluate(q => { const e = document.querySelector(q); if (!e) return null;
    const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, sel);
  const rb = await rect('[data-roam]');
  const vp = page.viewportSize();
  P('R00 the roam button is actually on screen', !!rb && rb.y >= 0 && rb.y + rb.height <= vp.height,
    rb ? ('y ' + rb.y.toFixed(0) + '..' + (rb.y + rb.height).toFixed(0) + ' in a ' + vp.height + ' px viewport') : 'no box');
  await tap('[data-roam]');
  await sim(1.0);
  const seeded = await cam(), s1 = await st();
  P('R01 roam engages from the page button', s1.roam === 'walk', 'state.roam=' + s1.roam);
  P('R02 entering roam is a handover, not a cut (eye moves < 2.1 m)',
    Math.hypot(seeded.x - before.x, seeded.z - before.z) < 2.1,
    'from ' + JSON.stringify(before) + ' to ' + JSON.stringify(seeded));
  /* the arrival view stands at r = 84, OUTSIDE the plaza deck (FIELD_RADIUS 43 + apron), so the
     correct eye there is 1.70 over ground and not 1.87 over the deck. Assert the rule, not one of
     its two answers — the first cut of this asserted the deck height and failed on correct code. */
  const seedR = Math.hypot(seeded.x, seeded.z);
  const wantY = (seedR <= 46 ? 0.17 : 0) + 1.70;
  P('R03 the walker stands exactly one eye height above the surface underfoot',
    Math.abs(seeded.y - wantY) < 0.02, 'y=' + seeded.y + ' want ' + wantY.toFixed(2) + ' at r=' + seedR.toFixed(1));
  await draw(); await shot('01-standing');

  /* R04 — W actually walks, and at roughly the designed speed */
  const a = await cam(); await hold('w', 1.5); const c1 = await cam();
  const dist = Math.hypot(c1.x - a.x, c1.z - a.z);
  P('R04 holding W walks (3.5 - 7 m in 1.5 s at 4.2 m/s nominal)', dist > 3.5 && dist < 7, 'moved ' + dist.toFixed(2) + ' m');

  /* R05 — the eye stays on the deck while walking (no sinking, no floating) */
  P('R05 the eye tracks the surface while walking (1.70 off deck / 1.87 on it)',
    Math.abs(c1.y - 1.70) < 0.02 || Math.abs(c1.y - 1.87) < 0.02, 'y=' + c1.y + ' at r=' + Math.hypot(c1.x, c1.z).toFixed(1));

  /* R06 — sprint is faster than walk */
  const b1 = await cam();
  await holdBoth('Shift', 'w', 1.5);
  const c2 = await cam(); const sprintDist = Math.hypot(c2.x - b1.x, c2.z - b1.z);
  P('R06 shift sprints (>= 1.8x the walk distance over the same 1.5 s)', sprintDist > dist * 1.8, 'sprint ' + sprintDist.toFixed(2) + ' m vs walk ' + dist.toFixed(2) + ' m');

  /* R07 — the walker cannot leave the described region */
  await page.evaluate(() => {
    const r = window.MAHWORLD_MAHPLAZA.roam;
    /* head out over open deck at +z (away from the monument at z -6.5, and clear of the three
       destinations, which sit at -10, -34 and -74) so this measures the BOUND and not a collider */
    r.pos.set(0, 1.87, 20); r.state.yaw = Math.PI; r.state.pitch = 0;
  });
  await settle();
  await holdBoth('Shift', 'w', 22);
  const far = await cam(); const farR = Math.hypot(far.x, far.z);
  P('R07 the ground gear is bounded (r <= WALK_R 95 m + slack)', farR <= 96.5, 'r=' + farR.toFixed(2));
  /* and the bound must be an EDGE, not a pin: turn round and you can walk back in */
  await page.evaluate(() => { window.MAHWORLD_MAHPLAZA.roam.state.yaw = 0; });
  await hold('w', 4);
  const backIn = await cam(); const backR = Math.hypot(backIn.x, backIn.z);
  P('R07b the walk bound is an edge, not a pin (can walk back inward)', backR < farR - 5, 'r ' + farR.toFixed(1) + ' -> ' + backR.toFixed(1));
  await draw(); await shot('02-edge');

  /* R08 — collision: aim at the monument and walk into it; must not end up inside the plinth box */
  await page.evaluate(() => {
    const M = window.MAHWORLD_MAHPLAZA, r = M.roam;
    /* yaw 0 is dir (sin 0, 0, -cos 0) = (0,0,-1), i.e. -z, WHICH IS WHERE THE MONUMENT IS (z -6.5).
       The first cut of this used Math.PI, which faces +z: the walker marched away from the monument
       for eight seconds and the test passed having proved nothing. */
    r.pos.set(0, 1.87, 22); r.state.yaw = 0; r.state.pitch = 0;
  });
  await settle();
  await hold('w', 8);
  const hit = await cam();
  /* monument.js registers one 17.80 m box centred (0, ., -6.5): |x| <= 8.9, z in [-15.4, 2.4] */
  const insideMonument = Math.abs(hit.x) <= 8.9 && hit.z <= 2.4 && hit.z >= -15.4;
  /* the test only means anything if the walker actually ARRIVED at the monument: 8 s of walking from
     z=22 covers ~33 m, so it must be stopped just outside the box's near face at z = 2.4 */
  const arrived = hit.z < 6 && hit.z > 1.5;
  P('R08 walking into the monument stops at its collider face (not through it)',
    !insideMonument && arrived, 'ended at ' + JSON.stringify(hit) + ' — near face is z 2.4');
  await draw(); await shot('03-monument-stop');

  /* R09 — fly mode climbs, and reaches the sky roads */
  await tap('[data-roam-mode]'); await settle();
  const s2 = await st();
  P('R09 fly engages', s2.roam === 'fly', 'state.roam=' + s2.roam);
  await page.evaluate(() => { const r = window.MAHWORLD_MAHPLAZA.roam; r.state.pitch = 0.9; r.state.yaw = Math.PI; });
  await holdBoth('Shift', 'w', 4);
  const up = await cam();
  P('R10 flying reaches sky-road altitude (y > 60 m)', up.y > 60, 'y=' + up.y.toFixed(1));
  await page.evaluate(() => { const r = window.MAHWORLD_MAHPLAZA.roam; r.state.pitch = -0.28; r.state.yaw = Math.PI; });
  await settle(); await draw(); await shot('04-flying');

  /* R11 — ceiling and world radius hold */
  await page.evaluate(() => { const r = window.MAHWORLD_MAHPLAZA.roam; r.state.pitch = 1.5; });
  await holdBoth('Shift', 'w', 30);
  const ceil = await cam();
  P('R11 the ceiling holds (y <= 701)', ceil.y <= 701, 'y=' + ceil.y.toFixed(1));

  /* R12 — leaving roam restores a composed view */
  await page.keyboard.press('Escape'); await settle();
  const s3 = await st();
  P('R12 Escape leaves roam and restores a named view', !s3.roam && s3.view === 'establishing', 'roam=' + s3.roam + ' view=' + s3.view);
  await draw(); await shot('05-back');

  /* R13 — the crash that started this: rotate the viewport while in a custom view */
  await page.evaluate(() => window.MAHWORLD_MAHPLAZA.look360(90, { pitch: 6 }));
  await page.setViewportSize({ width: 420, height: 900 });     /* aspect 0.47 -> portrait flips */
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(300);
  P('R13 rotating into portrait during a custom view does not throw', errs.length === 0, errs.slice(0, 3).join(' | '));

  /* R14 — and the same while roaming */
  await page.evaluate(() => window.MAHWORLD_MAHPLAZA.setRoam(true));
  await page.setViewportSize({ width: 420, height: 900 }); await page.waitForTimeout(250);
  await draw(); await shot('06-portrait');
  await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(250);
  P('R14 rotating while roaming does not throw', errs.length === 0, errs.slice(0, 3).join(' | '));

  /* R15 — the stick: a real pointer drag on the real element must move the camera */
  await page.evaluate(() => { const r = window.MAHWORLD_MAHPLAZA.roam; r.setMode('walk'); r.pos.set(0, 1.87, 26); r.state.yaw = Math.PI; });
  await settle();
  const sBefore = await cam();
  const box = await rect('[data-stick]');
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 44, { steps: 4 });
    await page.evaluate(() => window.MAHWORLD_MAHPLAZA.advance(2.0, 1 / 60));
    await draw(); await shot('07-stick');
    await page.mouse.up();
    await settle();
  }
  const sAfter = await cam();
  const stickDist = Math.hypot(sAfter.x - sBefore.x, sAfter.z - sBefore.z);
  P('R15 the touch stick walks the camera', box && stickDist > 2, 'moved ' + stickDist.toFixed(2) + ' m');

  /* R16 — the stick and the hint are absent from captures */
  await page.goto(HOST + '/mahworld/scene/mahplaza.html?hud=0&roam=1', { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.MAHWORLD_MAHPLAZA && window.MAHWORLD_MAHPLAZA.state.frames > 2, null, { timeout: 400000 });
  await page.waitForTimeout(400);
  const padHidden = await page.evaluate(() => {
    const pad = document.querySelector('[data-roam-pad]'), hint = document.querySelector('[data-roam-hint]');
    return { pad: !!pad.hidden, hint: !!hint.hidden, roam: window.MAHWORLD_MAHPLAZA.state.roam };
  });
  P('R16 ?hud=0 hides the roam controls but roam still works', padHidden.pad && padHidden.hint && padHidden.roam === 'walk', JSON.stringify(padHidden));

  console.log('\npage errors: ' + (errs.length ? errs.slice(0, 8).join('\n  ') : 'none'));
  console.log('roam acceptance: ' + pass + '/' + (pass + fail) + (fail ? '  — ' + fail + ' FAILED' : '  PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
