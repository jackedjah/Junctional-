/* MR.MAH 3D — runtime verification harness (development tooling).

   Drives the lab in a real browser and asserts the Phase 1 contracts that a
   static test cannot reach: that a WebGL context is actually acquired, that
   real lit pixels are produced, that the framing survives phone and tablet
   viewports, that a drag changes the rendered image, and — the one that
   matters most for a single-page app — that destroy() genuinely gives the
   GPU context back.

   Usage:  node tools/mrmah3d-verify.mjs [baseUrl] [outDir]
   Needs a static server rooted at the repository root. */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:8123';
const OUT = process.argv[3] || 'validation/mrmah3d';
const URL_LAB = `${BASE}/mrmah3d/lab/index.html`;

mkdirSync(OUT, { recursive: true });

const results = [];
let failures = 0;
function check(id, ok, detail) {
  results.push({ id, ok: !!ok, detail: detail ?? '' });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}${detail ? `  — ${detail}` : ''}`);
}

/* Viewports named in the brief. 320 is included because it is the narrowest
   real phone and the only one that drives the stage aspect below the camera's
   reference threshold, which is where the horizontal-FOV compensation runs. */
const VIEWPORTS = [
  { name: 'small-320',        width: 320, height: 640, dpr: 2, mobile: true },
  { name: 'iphone-se',        width: 375, height: 667, dpr: 2, mobile: true },
  { name: 'iphone-14',        width: 393, height: 852, dpr: 3, mobile: true },
  { name: 'iphone-pro-max',   width: 430, height: 932, dpr: 3, mobile: true },
  { name: 'ipad-portrait',    width: 768, height: 1024, dpr: 2, mobile: true },
  { name: 'ipad-landscape',   width: 1024, height: 768, dpr: 2, mobile: true },
  { name: 'phone-landscape',  width: 852, height: 393, dpr: 3, mobile: true },
  { name: 'desktop',          width: 1280, height: 900, dpr: 1, mobile: false }
];

/* Reads the stage canvas back and reports how much of it is genuinely lit.
   A canvas that acquired a context but rendered nothing is fully transparent;
   a scene whose lights are broken is opaque but flat. Both are caught here. */
async function analyseCanvas(page) {
  return page.evaluate(() => {
    const c = document.querySelector('.lab-stage canvas');
    if (!c) return { error: 'no canvas' };
    const g = document.createElement('canvas');
    const w = (g.width = Math.min(400, c.width));
    const h = (g.height = Math.min(400, c.height));
    const ctx = g.getContext('2d');
    ctx.drawImage(c, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    let opaque = 0, lit = 0, bright = 0, sum = 0, max = 0;
    const hist = new Set();
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a > 8) opaque++;
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (a > 8) { sum += l; if (l > max) max = l; }
      if (a > 8 && l > 12) lit++;
      if (a > 8 && l > 70) bright++;
      if (a > 8) hist.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    }
    const total = w * h;
    return {
      total, opaque, lit, bright, distinctColors: hist.size,
      meanLuma: opaque ? sum / opaque : 0, maxLuma: max,
      opaqueFraction: opaque / total, litFraction: lit / total
    };
  });
}

/* Structural readout of the rendered frame, at full canvas resolution.

   These two measurements exist because the first version of this harness
   passed 60/60 against a frame that was actually broken: the floor grid was
   drawing only its horizontal lines (every converging line was being dropped),
   and the figure was rendering as a near-black silhouette with no separable
   planes. Aggregate "some pixels are lit" checks cannot see either fault, so
   both are now measured directly.

     fullRows   rows lit right across the frame  -> the grid's X-parallel lines
     partialRows rows with some but not all lit  -> ONLY converging Z-lines and
                                                    the figure can produce these
     plateaus   distinct luminance bands holding a real share of the solid's
                pixels -> the lit planes of the geometry */
async function analyseStructure(page) {
  return page.evaluate(() => {
    const c = document.querySelector('.lab-stage canvas');
    const g = document.createElement('canvas');
    g.width = c.width; g.height = c.height;
    const ctx = g.getContext('2d');
    ctx.drawImage(c, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const luma = i => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

    let fullRows = 0, partialRows = 0;
    for (let y = 0; y < c.height; y++) {
      let n = 0;
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i + 3] > 4 && luma(i) > 10) n++;
      }
      if (n > c.width * 0.8) fullRows++;
      else if (n > 0) partialRows++;
    }

    /* Luminance plateaus over the solid only. Flat shading makes each lit
       plane a single value, so a well-lit solid yields several populated
       bands; a silhouette yields one. Grid lines are excluded by requiring
       near-full alpha, which the semi-transparent lines never reach. */
    const bins = new Array(64).fill(0);
    let solid = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      solid++;
      bins[Math.min(63, Math.floor(luma(i) / 4))]++;
    }
    const plateaus = bins.filter(v => solid && v / solid > 0.02).length;
    const lit = bins.map((v, i) => (i > 2 && solid && v / solid > 0.02) ? i * 4 : -1).filter(v => v >= 0);
    return {
      fullRows, partialRows, solidPixels: solid, plateaus,
      litBands: lit,
      valueSpread: lit.length ? lit[lit.length - 1] - lit[0] : 0
    };
  });
}

const browser = await chromium.launch();

/* ---------------------------------------------------------------- 1. mount */
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));
  const failed = [];
  page.on('requestfailed', r => failed.push(`${r.url()} ${r.failure()?.errorText}`));

  await page.goto(URL_LAB, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => window.__MRMAH_LAB.info());

  check('MOUNT-01 renderer mounts', info && !info.destroyed, `version ${info?.version}`);
  check('MOUNT-02 no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('MOUNT-03 no failed requests', failed.length === 0, failed.join(' | '));
  check('MOUNT-04 no captured page errors',
    (await page.evaluate(() => window.__MRMAH_LAB.errors)).length === 0);
  check('MOUNT-05 real WebGL context', await page.evaluate(() => {
    const c = document.querySelector('.lab-stage canvas');
    return !!(c && (c.getContext('webgl2') || c.getContext('webgl')));
  }));
  check('MOUNT-06 loop running', info.loop.running);
  check('MOUNT-07 frames advancing', info.stats.frames > 10, `${info.stats.frames} frames`);
  check('MOUNT-08 geometry uploaded', info.geometries > 0, `${info.geometries} geometries`);
  check('MOUNT-09 draw calls issued', info.drawCalls > 0, `${info.drawCalls} draws, ${info.triangles} tris`);
  check('MOUNT-10 the real character, not a placeholder', info.placeholder === false);

  /* ------------------------------------------------- 2. pixels are real ---- */
  const px = await analyseCanvas(page);
  check('PIXEL-01 canvas produced content', px.opaque > 0, `${(px.opaqueFraction * 100).toFixed(1)}% opaque`);
  check('PIXEL-02 lit pixels present', px.litFraction > 0.01, `${(px.litFraction * 100).toFixed(2)}% lit`);
  check('PIXEL-03 specular highlights present', px.bright > 0, `${px.bright} bright px, max luma ${px.maxLuma.toFixed(0)}`);
  check('PIXEL-04 shaded gradient (not flat fill)', px.distinctColors > 30, `${px.distinctColors} distinct colours`);
  /* Bound taken from the reference itself: its character pixels measure mean
     luminance 68.2. This is a ceiling on the whole frame (character plus the
     world's additive glow), so it sits above that with headroom — its job is
     to catch the character drifting into "a glowing cyan object", which is the
     failure the brief names, not to pin an exact value. */
  check('PIXEL-05 stage stays dark (reference character measures 68.2)',
    px.meanLuma < 140, `mean ${px.meanLuma.toFixed(1)}`);

  /* ------------------------------- 2b. the frame is structurally right ---- */
  const st = await analyseStructure(page);
  check('DEPTH-01 floor grid draws its receding lines', st.partialRows > 200,
    `${st.partialRows} rows carry converging content (a floor with no perspective scores ~0)`);
  check('DEPTH-02 floor grid draws its lateral lines', st.fullRows >= 8, `${st.fullRows} full-width rows`);
  check('DEPTH-03 solid shows multiple lit planes', st.plateaus >= 3,
    `${st.plateaus} luminance plateaus at ${JSON.stringify(st.litBands)}`);
  check('DEPTH-04 lit planes are separable', st.valueSpread >= 24, `spread ${st.valueSpread} luma`);

  /* ------------------------------------------------- 3. drag interaction --- */
  const box = await page.locator('.lab-stage').boundingBox();
  const before = await page.locator('.lab-stage').screenshot();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.88, box.y + box.height * 0.5, { steps: 24 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await page.locator('.lab-stage').screenshot();
  check('DRAG-01 drag changed the rendered image', Buffer.compare(before, after) !== 0);
  const yaw = await page.evaluate(() => window.__MRMAH_LAB.scene.parts.character.getYaw());
  check('DRAG-02 drag produced a real rotation', Math.abs(yaw) > 0.3, `yaw ${yaw.toFixed(3)} rad`);
  check('DRAG-03 pointer released cleanly',
    await page.evaluate(() => !window.__MRMAH_LAB.scene.parts.interaction.isDragging()));

  writeFileSync(join(OUT, 'stage-393.png'), await page.locator('.lab-stage').screenshot());
  writeFileSync(join(OUT, 'lab-full-393.png'), await page.screenshot({ fullPage: true }));

  /* ------------------------------------------------- 4. lifecycle --------- */
  await page.evaluate(() => window.__MRMAH_LAB.scene.pause());
  await page.waitForTimeout(250);
  const paused = await page.evaluate(() => window.__MRMAH_LAB.info());
  const f1 = paused.stats.frames;
  await page.waitForTimeout(500);
  const f2 = (await page.evaluate(() => window.__MRMAH_LAB.info())).stats.frames;
  check('LIFE-01 pause() stops the render loop', !paused.loop.running && f1 === f2, `${f1} -> ${f2} frames`);

  await page.evaluate(() => window.__MRMAH_LAB.scene.start());
  await page.waitForTimeout(400);
  const f3 = (await page.evaluate(() => window.__MRMAH_LAB.info())).stats.frames;
  check('LIFE-02 start() resumes the loop', f3 > f2, `${f2} -> ${f3} frames`);

  /* Backgrounding the tab must stop the loop — the battery-drain case. */
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);
  const hidden = await page.evaluate(() => window.__MRMAH_LAB.info());
  check('LIFE-03 hidden tab stops the loop', !hidden.loop.running);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);
  check('LIFE-04 returning to foreground resumes',
    (await page.evaluate(() => window.__MRMAH_LAB.info())).loop.running);

  /* destroy() must release the context, not merely stop drawing. */
  const teardown = await page.evaluate(async () => {
    const c = document.querySelector('.lab-stage canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    window.__MRMAH_LAB.scene.destroy();
    await new Promise(r => setTimeout(r, 200));
    return {
      contextLost: gl.isContextLost(),
      canvasRemoved: !document.querySelector('.lab-stage canvas'),
      mounted: window.__MRMAH_LAB.mounted
    };
  });
  check('LIFE-05 destroy() releases the WebGL context', teardown.contextLost);
  check('LIFE-06 destroy() removes the canvas', teardown.canvasRemoved);

  /* Repeated mount/destroy is the real single-page-app pattern. If contexts
     leaked, this is where a browser would start refusing them. */
  const cycles = await page.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      document.querySelector('[data-act="remount"]').click();
      await new Promise(r => setTimeout(r, 120));
      out.push(!!window.__MRMAH_LAB.mounted);
      if (i < 5) { window.__MRMAH_LAB.scene.destroy(); await new Promise(r => setTimeout(r, 60)); }
    }
    return out;
  });
  check('LIFE-07 six mount/destroy cycles all succeed', cycles.every(Boolean), JSON.stringify(cycles));

  await ctx.close();
}

/* ------------------------------------------------- 5. responsive ---------- */
const responsive = [];
for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.dpr,
    isMobile: v.mobile,
    hasTouch: v.mobile
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));

  await page.goto(URL_LAB, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  await page.waitForTimeout(900);

  const info = await page.evaluate(() => window.__MRMAH_LAB.info());
  const px = await analyseCanvas(page);
  const st = await analyseStructure(page);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

  responsive.push({
    viewport: v.name, ...info,
    litFraction: px.litFraction, meanLuma: px.meanLuma,
    partialRows: st.partialRows, plateaus: st.plateaus
  });

  check(`RESP-${v.name} renders`, px.litFraction > 0.005 && info.loop.running,
    `${info.width}x${info.height} dpr ${info.pixelRatio} tier ${info.tier} fov ${info.fov}° lit ${(px.litFraction * 100).toFixed(2)}%`);
  check(`RESP-${v.name} keeps real depth (grid converges, planes separate)`,
    st.partialRows > 120 && st.plateaus >= 3,
    `${st.partialRows} converging rows, ${st.plateaus} lit planes`);
  check(`RESP-${v.name} no console errors`, errs.length === 0, errs.join(' | '));
  check(`RESP-${v.name} no horizontal page overflow`, !overflow);
  check(`RESP-${v.name} pixel ratio within mobile budget`, info.pixelRatio <= 2,
    `dpr ${info.pixelRatio} (device ${v.dpr})`);

  writeFileSync(join(OUT, `stage-${v.name}.png`), await page.locator('.lab-stage').screenshot());
  await ctx.close();
}

/* ---------------------------------------- 6. live resize keeps framing ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(URL_LAB, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  await page.waitForTimeout(500);
  const a = await page.evaluate(() => window.__MRMAH_LAB.info());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(700);
  const b = await page.evaluate(() => window.__MRMAH_LAB.info());
  check('RESIZE-01 surface tracked the new size', b.width !== a.width, `${a.width}x${a.height} -> ${b.width}x${b.height}`);
  check('RESIZE-02 aspect changed the projection', b.camAspect !== a.camAspect,
    `aspect ${a.camAspect} -> ${b.camAspect}`);
  check('RESIZE-03 still rendering after resize', (await analyseCanvas(page)).litFraction > 0.005);
  /* Stability across REPEATED resizes is the real contract, not equality after
     the first. Three.js lazily allocates a couple of internal geometries the
     first time a new render path is exercised, which is a one-off, not a leak;
     measured, the count is flat from the second resize onward. Asserting exact
     equality after one resize failed on that one-off and would have hidden the
     thing that actually matters — unbounded growth. */
  const counts = [b.geometries];
  for (const [w, h] of [[700, 700], [380, 820], [900, 500], [640, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(260);
    counts.push((await page.evaluate(() => window.__MRMAH_LAB.info())).geometries);
  }
  const stable = counts.slice(1).every(c => c === counts[1]);
  check('RESIZE-04 geometry count stable across repeated resizes', stable, counts.join(' -> '));

  /* The camera opens its vertical FOV only below the reference aspect. Drive
     the stage genuinely narrow and confirm the compensation actually fires —
     otherwise that branch ships untested. */
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--lab-preview-width', '150px');
  });
  await page.waitForTimeout(600);
  const narrow = await page.evaluate(() => window.__MRMAH_LAB.info());
  check('RESIZE-05 narrow stage widens the vertical FOV', narrow.fov > b.fov + 1,
    `aspect ${narrow.camAspect} -> fov ${narrow.fov}° (was ${b.fov}°)`);
  check('RESIZE-06 FOV stays within the distortion ceiling', narrow.fov <= 75,
    `fov ${narrow.fov}° at an extreme ${narrow.camAspect} aspect`);
  await ctx.close();
}

/* ---------------------------------------- 6b. quality tiers --------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(URL_LAB, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });

  /* This container reports a low-core device, so detectTier picks 'low'
     everywhere and the medium/high budgets would otherwise never be exercised.
     Mount each tier explicitly. */
  const tiers = await page.evaluate(async () => {
    const m = await import('/mrmah3d/core/mrmah-scene.js');
    const host = document.getElementById('stage');
    const out = [];
    for (const tier of ['low', 'medium', 'high']) {
      if (window.__MRMAH_LAB.scene) window.__MRMAH_LAB.scene.destroy();
      const s = m.createMrMahScene(host, { tier, preserveDrawingBuffer: true });
      window.__MRMAH_LAB.scene = s;
      await new Promise(r => setTimeout(r, 350));
      /* Hide the world before counting shadow pixels. The heuristic looks for
         dark semi-transparent pixels, and the environment's additive haze and
         horizon glow land in exactly that range — with the world visible it
         reported "shadows" on a tier that has them switched off. */
      s.parts.stage.world.visible = false;
      /* ...but keep the shadow catcher, which lives in the world group and is
         the only surface his shadow can fall on. Hiding it too reports zero
         shadow on every tier. */
      s.parts.environment.ground.visible = true;
      s.parts.environment.group.visible = true;
      ['grid', 'nodes', 'glow', 'structures', 'motes', 'horizon', 'clouds'].forEach(function (k) {
        if (s.parts.environment[k]) s.parts.environment[k].visible = false;
      });
      s.parts.stage.world.visible = true;
      s.renderer.render(s.scene, s.camera);
      const c = s.canvas, g = document.createElement('canvas');
      g.width = c.width; g.height = c.height;
      const cx = g.getContext('2d'); cx.drawImage(c, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      let shadowPx = 0;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        if (a > 20 && a < 160 && (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) < 14) shadowPx++;
      }
      const info = s.info();
      ['grid', 'nodes', 'glow', 'structures', 'motes', 'horizon', 'clouds'].forEach(function (k) {
        if (s.parts.environment[k]) s.parts.environment[k].visible = true;
      });
      out.push({
        tier: info.tier, dpr: info.pixelRatio,
        shadows: s.renderer.shadowMap.enabled,
        shadowMap: s.parts.lights.key.shadow.mapSize.width,
        shadowPx
      });
    }
    return out;
  });
  const [low, med, high] = tiers;
  check('TIER-01 pixel-ratio budget rises with tier', low.dpr < med.dpr && med.dpr < high.dpr,
    `low ${low.dpr} / medium ${med.dpr} / high ${high.dpr} on a DPR 3 device`);
  check('TIER-02 low tier caps at DPR 1', low.dpr === 1);
  check('TIER-03 high tier never exceeds DPR 2', high.dpr <= 2);
  check('TIER-04 shadows disabled on low tier', low.shadows === false && low.shadowPx === 0);
  check('TIER-05 shadows render above low tier', med.shadows && med.shadowPx > 200 && high.shadowPx > 200,
    `medium ${med.shadowPx}px, high ${high.shadowPx}px of cast shadow`);
  check('TIER-06 shadow map size scales with tier', high.shadowMap > med.shadowMap,
    `${med.shadowMap} -> ${high.shadowMap}`);
  /* This container reports a low-core device, so every other capture in this
     run is tier 'low' and therefore shadowless. Capture the high tier too, or
     the delivered evidence never shows a contact shadow. */
  writeFileSync(join(OUT, 'stage-tier-high.png'), await page.locator('.lab-stage').screenshot());
  await ctx.close();
}

/* ---------------------------------------- 7. reduced motion --------------- */
{
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, reducedMotion: 'reduce'
  });
  const page = await ctx.newPage();
  await page.goto(URL_LAB, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => window.__MRMAH_LAB.info());
  check('MOTION-01 prefers-reduced-motion is honoured', info.reducedMotion === true);
  const y = await page.evaluate(() => window.__MRMAH_LAB.scene.parts.character.root.position.y);
  check('MOTION-02 idle bob disabled under reduced motion', Math.abs(y) < 1e-6, `y=${y}`);
  check('MOTION-03 still renders under reduced motion', (await analyseCanvas(page)).litFraction > 0.005);
  await ctx.close();
}

/* ---------------------------------------- 8. behaviour and gestures ------ */
{
  const ctx = await browser.newContext({
    viewport: { width: 470, height: 900 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`${BASE}/mrmah3d/lab/index.html?canonical=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  await page.waitForTimeout(400);

  const box = await page.locator('.lab-stage').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(60);
  check('GESTURE-01 a clean press is a tap',
    (await page.evaluate(() => window.__MRMAH_LAB.scene.getState())) === 'tapped');

  /* A finger on glass always moves a little; a few px must still be a tap. */
  await page.waitForTimeout(900);
  await page.mouse.move(cx, cy); await page.mouse.down();
  await page.mouse.move(cx + 4, cy + 2, { steps: 3 }); await page.mouse.up();
  await page.waitForTimeout(60);
  check('GESTURE-02 a press with slight jitter is still a tap',
    (await page.evaluate(() => window.__MRMAH_LAB.scene.getState())) === 'tapped');

  /* A real drag must never fire a tap, and must restore the HOST's state. */
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__MRMAH_LAB.scene.setState('thinking'));
  const yaw0 = await page.evaluate(() => window.__MRMAH_LAB.scene.parts.character.getYaw());
  await page.mouse.move(cx, cy); await page.mouse.down();
  await page.mouse.move(cx + 120, cy, { steps: 20 });
  const during = await page.evaluate(() => window.__MRMAH_LAB.scene.getState());
  await page.mouse.up(); await page.waitForTimeout(80);
  const after = await page.evaluate(() => window.__MRMAH_LAB.scene.getState());
  const yaw1 = await page.evaluate(() => window.__MRMAH_LAB.scene.parts.character.getYaw());
  check('GESTURE-03 dragging reports the drag state', during === 'dragging');
  check('GESTURE-04 a drag is never mistaken for a tap', after !== 'tapped', `ended in ${after}`);
  check('GESTURE-05 drag returns to the host state, not idle', after === 'thinking', after);
  check('GESTURE-06 drag rotated the character', Math.abs(yaw1 - yaw0) > 0.5,
    `${(yaw1 - yaw0).toFixed(3)} rad`);

  const settled = await page.evaluate(async () => {
    const s = window.__MRMAH_LAB.scene; const out = [];
    for (const n of s.states) {
      s.setState(n);
      await new Promise(r => setTimeout(r, 90));
      out.push(s.getState() === n);
    }
    s.setState('idle');
    return out;
  });
  check('STATE-01 every behaviour state applies', settled.every(Boolean));
  check('STATE-02 no errors driving states', errs.length === 0, errs.join(' | '));

  writeFileSync(join(OUT, 'stage-canonical.png'), await page.locator('.lab-stage').screenshot());
  await ctx.close();
}

/* ---------------------------------------- 9. page composition modes ------ */
{
  /* A real AI Chat stage: 393px phone, 620px tall stage. Each mode declares
     where Mr.Mah should sit and how big he should be; this measures where he
     ACTUALLY lands. Without it the presets are just numbers in a file — and
     the horizontal and vertical placement were each silently mirrored at one
     point, which only a measurement caught. */
  const ctx = await browser.newContext({ viewport: { width: 393, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL_LAB, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  await page.evaluate(() => { document.querySelector('.lab-stage').style.height = '620px'; });
  await page.waitForTimeout(300);

  const modes = await page.evaluate(async () => {
    const s = window.__MRMAH_LAB.scene;
    const M = await import('/mrmah3d/core/composition.js');
    s.setReducedMotion(true);
    const out = [];
    for (const name of s.modes) {
      s.setMode(name);
      await new Promise(r => setTimeout(r, 420));
      const world = s.parts.stage.world;
      world.visible = false;
      s.renderer.render(s.scene, s.camera);
      const c = s.canvas, g = document.createElement('canvas');
      g.width = c.width; g.height = c.height;
      const x = g.getContext('2d', { willReadFrequently: true });
      x.drawImage(c, 0, 0);
      const d = x.getImageData(0, 0, g.width, g.height).data;
      let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
      for (let i = 0; i < g.width * g.height; i++) {
        if (d[i * 4 + 3] <= 170) continue;
        const px = i % g.width, py = (i - px) / g.width;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
      world.visible = true;
      s.renderer.render(s.scene, s.camera);
      const want = M.MODES[name];
      out.push({
        name,
        gotX: ((minX + maxX) / 2) / g.width, wantX: want.screenX,
        gotY: ((minY + maxY) / 2) / g.height, wantY: want.screenY,
        gotH: (maxY - minY) / g.height, wantH: want.heightFrac,
        state: s.getState(), wantState: want.state,
        onScreen: minX >= 0 && maxX < g.width && minY >= 0 && maxY < g.height
      });
    }
    s.setMode('showcase');
    return out;
  });

  modes.forEach(m => {
    /* X tolerance is looser than Y: the raised arm makes his alpha bounding
       box asymmetric, so its centre sits right of his body axis. */
    check(`MODE-${m.name} horizontal placement`, Math.abs(m.gotX - m.wantX) <= 0.055,
      `${m.gotX.toFixed(3)} vs intent ${m.wantX}`);
    check(`MODE-${m.name} vertical placement`, Math.abs(m.gotY - m.wantY) <= 0.045,
      `${m.gotY.toFixed(3)} vs intent ${m.wantY}`);
    check(`MODE-${m.name} scale in frame`, Math.abs(m.gotH - m.wantH) <= 0.045,
      `${m.gotH.toFixed(3)} vs intent ${m.wantH}`);
    check(`MODE-${m.name} fully in frame`, m.onScreen);
    check(`MODE-${m.name} sets its resting state`, m.state === m.wantState, m.state);
  });
  /* The in-app modes must leave the upper-centre clear for the DOM UI that
     sits in front of them — the response diamond is large and centred there. */
  modes.filter(m => m.name === 'chat' || m.name === 'protocol').forEach(m => {
    check(`MODE-${m.name} leaves the upper-centre free for UI`,
      m.gotY - m.gotH / 2 > 0.40 && m.gotX < 0.45,
      `head at ${(m.gotY - m.gotH / 2).toFixed(2)} down, centre ${m.gotX.toFixed(2)} across`);
  });
  check('MODE-00 no errors switching modes', errs.length === 0, errs.slice(0, 3).join(' | '));

  for (const name of ['showcase', 'chat', 'protocol', 'portrait']) {
    await page.evaluate(n => window.__MRMAH_LAB.scene.setMode(n), name);
    await page.waitForTimeout(500);
    writeFileSync(join(OUT, `mode-${name}.png`), await page.locator('.lab-stage').screenshot());
  }
  await ctx.close();
}

await browser.close();

writeFileSync(join(OUT, 'VERIFY_RESULTS.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, results, responsive }, null, 2));

const passed = results.length - failures;
console.log(`\n${passed}/${results.length} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
