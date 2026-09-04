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
      /* R95 world: there is no shadow catcher any more (the guardian
         references have no cast shadow), so `ground` is absent; the count
         below must now come out at ZERO on every tier. The guard keeps this
         block honest either way. */
      if (s.parts.environment.ground) s.parts.environment.ground.visible = true;
      s.parts.environment.group.visible = true;
      ['grid', 'nodes', 'glow', 'structures', 'motes', 'horizon', 'clouds', 'pillars', 'stars', 'mist', 'moon', 'figures'].forEach(function (k) {
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
      ['grid', 'nodes', 'glow', 'structures', 'motes', 'horizon', 'clouds', 'pillars', 'stars', 'mist', 'moon', 'figures'].forEach(function (k) {
        if (s.parts.environment[k]) s.parts.environment[k].visible = true;
      });
      out.push({
        tier: info.tier, dpr: info.pixelRatio,
        shadows: s.renderer.shadowMap.enabled,
        shadowMap: s.parts.lights.key.shadow.mapSize.width,
        castShadow: s.parts.lights.key.castShadow,
        shadowMapAllocated: !!s.parts.lights.key.shadow.map,
        catcher: !!s.parts.environment.ground,
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
  /* R95 world: TIER-05 and TIER-06 asserted a cast shadow above the low tier
     and a shadow map that grew with it. None of the four guardian references
     has a cast shadow — the floor under the tip is lit by the contact flare —
     so the key no longer casts on ANY tier, the catcher is gone, and no shadow
     map is ever allocated. The two checks now hold that. */
  check('TIER-05 no cast shadow on any tier (R95 world: the references have none)',
    tiers.every(t => t.castShadow === false && t.catcher === false && t.shadowPx === 0),
    `cast shadow px low ${low.shadowPx} / medium ${med.shadowPx} / high ${high.shadowPx}`);
  check('TIER-06 no shadow map allocated on any tier (R95 world)',
    tiers.every(t => t.shadowMapAllocated === false),
    tiers.map(t => `${t.tier} ${t.shadowMapAllocated ? 'allocated' : 'none'}`).join(', '));
  /* ---- R95 tier parity ---------------------------------------------------
     The low tier draws straight to the canvas; the others draw into bloom's
     target and composite. three applies tone mapping and the output encoding
     only on the direct path, so for many passes the low tier was a pale
     ice-white figure while the high tier was the dark sapphire everything was
     tuned against. renderer.js now uses one pipeline; this holds it there by
     comparing the same chest box on the two tiers. Bloom and the halo do not
     reach inside the upper chest, so the box is a fair comparison. */
  const parity = await page.evaluate(async () => {
    const m = await import('/mrmah3d/core/mrmah-scene.js');
    const host = document.getElementById('stage');
    const out = {};
    for (const tier of ['low', 'high']) {
      if (window.__MRMAH_LAB.scene) window.__MRMAH_LAB.scene.destroy();
      const s = m.createMrMahScene(host, { tier, preserveDrawingBuffer: true, reducedMotion: true });
      window.__MRMAH_LAB.scene = s;
      s.setMode('showcase');
      await new Promise(r => setTimeout(r, 350));
      s.parts.loop.pause && s.parts.loop.pause();
      s.renderer.render(s.scene, s.camera);
      const c = s.canvas, g = document.createElement('canvas');
      g.width = c.width; g.height = c.height;
      const cx = g.getContext('2d'); cx.drawImage(c, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, n = 0;
      for (let y = Math.floor(c.height * 0.31); y < c.height * 0.35; y++) {
        for (let x = Math.floor(c.width * 0.44); x < c.width * 0.56; x++) {
          const i = (y * c.width + x) * 4;
          sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++;
        }
      }
      out[tier] = sum / n;
    }
    return out;
  });
  check('R95-TIER-07 every tier renders through the same colour pipeline',
    Math.abs(parity.low - parity.high) <= 8,
    `upper-chest mean luma low ${parity.low.toFixed(1)} vs high ${parity.high.toFixed(1)}`);
  await page.evaluate(async () => {
    const m = await import('/mrmah3d/core/mrmah-scene.js');
    const host = document.getElementById('stage');
    if (window.__MRMAH_LAB.scene) window.__MRMAH_LAB.scene.destroy();
    window.__MRMAH_LAB.scene = m.createMrMahScene(host, { tier: 'high', preserveDrawingBuffer: true });
    await new Promise(r => setTimeout(r, 350));
  });

  /* This container reports a low-core device, so every other capture in this
     run is tier 'low'. Capture the high tier too: it is the delivered look. */
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
  await page.mouse.move(cx, cy);
  /* The press duration is REPORTED, because this check has failed twice for
     timing reasons that read as product bugs: once at 446 ms against a 450 ms
     TAP_MS (a real defect, fixed by raising it to 900), and once under a
     loaded machine where three Playwright mouse steps alone took longer than
     any finger tap. A failure with a held time over TAP_MS is the harness;
     under it, it is the product. */
  const pressAt = Date.now();
  await page.mouse.down();
  await page.mouse.move(cx + 4, cy + 2, { steps: 3 }); await page.mouse.up();
  const heldMs = Date.now() - pressAt;
  await page.waitForTimeout(60);
  check('GESTURE-02 a press with slight jitter is still a tap',
    (await page.evaluate(() => window.__MRMAH_LAB.scene.getState())) === 'tapped',
    `press held ${heldMs} ms by the harness (TAP_MS is 900)`);

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
  /* The mode previews are the DELIVERED evidence of what each surface looks
     like, so they are captured at the high tier. This container advertises very
     few cores and therefore detects as 'low', where bloom is deliberately never
     created — without the override every preview would be missing an effect
     most real devices will run, and the evidence would not show the product. */
  await page.goto(`${URL_LAB}?tier=high`, { waitUntil: 'networkidle' });
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
        aspect: g.width / g.height,
        onScreen: minX >= 0 && maxX < g.width && minY >= 0 && maxY < g.height
      });
    }
    s.setMode('showcase');
    return out;
  });

  /* THE POSE'S SKEW IS STATED, NOT ABSORBED INTO A TOLERANCE.

     One arm is raised and reaching and the other hangs, so the alpha bounding
     box is centred to the RIGHT of the body axis. The camera composes around
     the axis, as the reference does — measured on the anatomical reference the
     character's bounding box sits at 0.553 of the frame while his torso axis
     sits at 0.499 — so the expected reading is the mode's screenX plus that
     skew, not screenX itself.

     It used to be swallowed by a loose X tolerance, and that hid a real
     question: lengthening the arms to the reference's reach took the showcase
     measurement to 0.556, one thousandth past the allowance, and the failure
     read as a framing bug rather than as the pose growing. Computing the skew
     from the pose's own extents means a change to the arms moves the
     expectation with it, and a genuine framing fault — a mirrored axis, a drift
     — still fails.

     skew(frame fractions) = POSE.centreX * heightFrac / (characterHeight * aspect),
     since the frame is characterHeight/heightFrac tall in world units and
     aspect times that wide. */
  const POSE_CENTRE_X = 0.044;    /* proportions.js POSE.centreX (R95-BB pose) */
  const CHARACTER_H = 3.0;
  modes.forEach(m => {
    const skew = POSE_CENTRE_X * m.wantH / (CHARACTER_H * (m.aspect || 1));
    check(`MODE-${m.name} horizontal placement`, Math.abs(m.gotX - (m.wantX + skew)) <= 0.035,
      `${m.gotX.toFixed(3)} vs intent ${m.wantX} + pose skew ${skew.toFixed(3)}`);
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

  for (const name of ['showcase', 'website', 'chat', 'protocol', 'portrait']) {
    await page.evaluate(n => window.__MRMAH_LAB.scene.setMode(n), name);
    await page.waitForTimeout(500);
    writeFileSync(join(OUT, `mode-${name}.png`), await page.locator('.lab-stage').screenshot());
  }
  await ctx.close();
}

/* ---------------------------------------- 10. R94 world ------------------ */
/* The mountain range, beacons, mist, sky and shadow pool built for R94, measured
   in the showcase frame at the high tier — the delivered look. Each check is
   about STRUCTURE in the frame (is the range a mid-dark mass rather than black
   cut-outs or a pale wall; do the beams stand above the peaks; is the mist
   brighter than the floor in front of it; is the sky still black; is the shadow
   a pool under the tip rather than a projection across the floor), and about
   the frame budget the world has to live inside. */
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`${URL_LAB}?tier=high`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  await page.evaluate(() => { window.__MRMAH_LAB.scene.setMode('showcase'); window.__MRMAH_LAB.scene.setReducedMotion(true); });
  await page.waitForTimeout(700);

  const world = await page.evaluate(() => {
    const s = window.__MRMAH_LAB.scene;
    const r = s.renderer, cam = s.camera, c = s.canvas;
    const env = s.parts.environment;
    const g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
    const x = g.getContext('2d', { willReadFrequently: true });
    const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    /* Composite over the stage's own ink before reading. getImageData returns
       UNPREMULTIPLIED colour: read raw, a 5%-alpha wash reports full-strength
       cyan and the sky measures as bright. `raw` keeps the alpha for the
       shadow count, which needs it. */
    function grab(raw) {
      r.render(s.scene, cam);
      x.clearRect(0, 0, c.width, c.height);
      if (!raw) { x.fillStyle = 'rgb(14,17,20)'; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(c, 0, 0);
      return x.getImageData(0, 0, c.width, c.height).data;
    }
    function region(d, x0, x1, y0, y1) {
      let n = 0, sum = 0, mid = 0, bright = 0, lit = 0;
      for (let yy = Math.floor(y0 * c.height); yy < Math.floor(y1 * c.height); yy++)
        for (let xx = Math.floor(x0 * c.width); xx < Math.floor(x1 * c.width); xx++) {
          const i = (yy * c.width + xx) * 4; const l = luma(d, i); n++; sum += l;
          if (l >= 32 && l < 128) mid++; if (l > 120) bright++; if (l > 10) lit++;
        }
      return { mean: sum / n, midFrac: mid / n, bright, litFrac: lit / n };
    }
    /* Full scene at the high tier: the budget. */
    r.render(s.scene, cam);
    const budget = { calls: r.info.render.calls, tris: r.info.render.triangles };
    /* Environment only. R95 world: the moon (brief §11, guardian-a) hangs in
       the upper LEFT corner this block reads as sky, so it is hidden for this
       read only — the check is about the SKY staying near-black, and the sky
       beside the moon still has to. The R95 block measures the moon itself. */
    s.parts.stage.subject.visible = false;
    if (env.moon) env.moon.visible = false;
    const d = grab();
    if (env.moon) env.moon.visible = true;
    const band = region(d, 0.1, 0.9, 0.44, 0.62);       /* the range */
    const above = region(d, 0.0, 1.0, 0.30, 0.44);      /* where only beams and cloud can be */
    const mist = region(d, 0.0, 1.0, 0.56, 0.64);       /* the mist at the bases */
    const floor = region(d, 0.0, 1.0, 0.70, 0.78);      /* the open floor in front */
    const skyL = region(d, 0.0, 0.3, 0.02, 0.30);
    const skyR = region(d, 0.7, 1.0, 0.02, 0.30);
    /* DEPTH-01's measurement, in this context, with the character back. */
    s.parts.stage.subject.visible = true;
    const d2 = grab(true);     /* raw, exactly as analyseStructure reads it */
    let partialRows = 0;
    for (let yy = 0; yy < c.height; yy++) {
      let n = 0;
      for (let xx = 0; xx < c.width; xx++) { const i = (yy * c.width + xx) * 4; if (d2[i + 3] > 4 && luma(d2, i) > 10) n++; }
      if (n > 0 && n <= c.width * 0.8) partialRows++;
    }
    /* The shadow pool: only the catcher visible in the world, character on. */
    const hidden = [];
    env.group.children.forEach(k => { if (k !== env.ground) { hidden.push([k, k.visible]); k.visible = false; } });
    const d3 = grab(true);
    /* Floor rows only: his own semi-transparent dark edge pixels higher in the
       frame match the same heuristic and would stretch the box. */
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, shadowPx = 0;
    for (let yy = Math.floor(c.height * 0.78); yy < c.height; yy++)
      for (let xx = 0; xx < c.width; xx++) {
        const i = (yy * c.width + xx) * 4, a = d3[i + 3];
        if (a > 20 && a < 160 && luma(d3, i) < 14) {
          shadowPx++;
          if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
        }
      }
    hidden.forEach(([k, v]) => { k.visible = v; });
    r.render(s.scene, cam);
    const layers = Object.keys(env.terrain.layers).map(k => ({
      name: k, visible: env.terrain.layers[k].mesh.visible,
      tris: env.terrain.layers[k].geo.attributes.position.count / 3
    }));
    return {
      budget, band, above, mist, floor, skyL, skyR, partialRows, layers,
      shadow: { px: shadowPx, wFrac: shadowPx ? (maxX - minX + 1) / c.width : 0, hFrac: shadowPx ? (maxY - minY + 1) / c.height : 0 },
      summits: env.terrain.summits.length, sparkles: env.terrain.stats.sparkles,
      info: s.info()
    };
  });

  check('R94-WORLD-01 frame budget at tier high (draws <= 165, tris <= 11000)',
    world.budget.calls <= 165 && world.budget.tris <= 11000,
    `${world.budget.calls} draws, ${world.budget.tris} tris`);
  check('R94-WORLD-02 three terrain layers built and visible',
    world.layers.length === 3 && world.layers.every(l => l.visible && l.tris > 100),
    world.layers.map(l => `${l.name} ${l.tris} tris`).join(', '));
  check('R94-WORLD-03 the range is a lit mid-dark mass (not black cut-outs, not a pale wall)',
    world.band.mean > 22 && world.band.mean < 90 && world.band.midFrac > 0.15,
    `band mean ${world.band.mean.toFixed(1)}, ${(world.band.midFrac * 100).toFixed(0)}% of pixels in 32-128`);
  check('R94-WORLD-04 summit beacons rise above the peaks',
    world.summits >= 3 && world.above.bright > 100,
    `${world.summits} beacons, ${world.above.bright} bright px above the range`);
  check('R94-WORLD-05 horizon mist is luminous and sits above the floor rows',
    world.mist.mean > world.floor.mean * 1.6 && world.mist.mean > 18,
    `mist rows ${world.mist.mean.toFixed(1)} vs open floor ${world.floor.mean.toFixed(1)}`);
  check('R94-WORLD-06 the sky stays near-black (references: upper corners 100% under 32)',
    world.skyL.mean < 30 && world.skyR.mean < 30,
    `corners ${world.skyL.mean.toFixed(1)} / ${world.skyR.mean.toFixed(1)}`);
  /* R95 world: amended from "a pool under the tip" to "no cast shadow at
     all" — the guardian references have none, the catcher is gone and the
     key never casts. The measurement is unchanged; its expected value is 0. */
  check('R95 world / R94-WORLD-07 no cast shadow on the floor (the references have none)',
    world.shadow.px === 0, `${world.shadow.px} px of cast shadow`);
  check('R94-WORLD-08 floor still converges with the world in place',
    world.partialRows > 200, `${world.partialRows} rows carry converging content`);
  check('R94-WORLD-09 sparkle specks were placed on the slopes', world.sparkles > 200, `${world.sparkles} specks`);
  check('R94-WORLD-10 no errors building the world', errs.length === 0, errs.slice(0, 3).join(' | '));

  /* Review round. These read the DELIVERED frame — the page screenshot, i.e.
     what the high tier's composite actually puts on screen — because the raw
     `grab()` above measures the scene before bloom's composite and the two
     differ by nearly 2x in the midtones; the review's numbers were taken from
     screenshots and so are these. The mid range is measured over ITS OWN
     pixels (a mask from an isolated render), not over a box that is mostly
     sky: the first cut of item 6 was tuned against a box and came out as black
     cut-outs. The phone frame here (aspect 0.56 at the 700px stage) sees the
     small central massifs more than the big flank ones and reads darker than
     the 500px review frame (42% against 27% under 32), so the ceiling is 50%. */
  await page.evaluate(() => { document.querySelector('.lab-stage').style.height = '700px'; window.__MRMAH_LAB.scene.parts.stage.subject.visible = false; window.__MRMAH_LAB.scene.parts.environment.mist.visible = false; });
  await page.waitForTimeout(400);
  const shotNoMist = await page.locator('.lab-stage').screenshot();
  await page.evaluate(() => { window.__MRMAH_LAB.scene.parts.environment.mist.visible = true; });
  await page.waitForTimeout(300);
  const shotNoChar = await page.locator('.lab-stage').screenshot();
  const delivered = await page.evaluate(async ({ noMist, noChar }) => {
    const s = window.__MRMAH_LAB.scene, env = s.parts.environment, c = s.canvas;
    async function load(data) {
      const img = new Image(); img.src = data; await img.decode();
      const g = document.createElement('canvas'); g.width = img.naturalWidth; g.height = img.naturalHeight;
      const x = g.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      return { d: x.getImageData(0, 0, g.width, g.height).data, W: g.width, H: g.height };
    }
    const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    /* Mask of the mid range from an isolated render. */
    const vis = []; env.group.traverse(o => { vis.push([o, o.visible]); if (o !== env.group && o !== env.structures && o.name !== 'terrain-mid') o.visible = false; });
    env.structures.visible = true;
    s.renderer.render(s.scene, s.camera);
    const g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
    const x = g.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0);
    const md = x.getImageData(0, 0, c.width, c.height).data;
    vis.forEach(([o, v]) => { o.visible = v; });
    s.renderer.render(s.scene, s.camera);
    const nm = await load(noMist), nc = await load(noChar);
    const sameSize = nm.W === c.width && nm.H === c.height;
    const h = new Array(8).fill(0); let n = 0;
    if (sameSize) for (let i = 0; i < md.length; i += 4) { if (md[i + 3] < 200) continue; h[Math.min(7, luma(nm.d, i) >> 5)]++; n++; }
    const planes = { px: n, under32: n ? h[0] / n : 1, mid: n ? (h[1] + h[2]) / n : 0, over128: n ? (h[4] + h[5] + h[6] + h[7]) / n : 1 };
    /* Horizon falloff: fraction of each row above 40 luma, rows 0.62-0.72. */
    const rows = [];
    for (let fy = 0.62; fy < 0.72; fy += 0.004) {
      const y = Math.round(fy * nc.H); let lit = 0;
      for (let xx = 0; xx < nc.W; xx++) if (luma(nc.d, (y * nc.W + xx) * 4) > 40) lit++;
      rows.push(lit / nc.W);
    }
    let maxDrop = 0; for (let i = 1; i < rows.length; i++) maxDrop = Math.max(maxDrop, rows[i - 1] - rows[i]);
    /* The floor in front (rows 0.70-0.82): share above 32 luma. */
    let fl = 0, fn = 0;
    for (let y = Math.round(0.70 * nc.H); y < Math.round(0.82 * nc.H); y++) for (let xx = 0; xx < nc.W; xx++) { fn++; if (luma(nc.d, (y * nc.W + xx) * 4) > 32) fl++; }
    const mirror = env.terrain.mirrors.map(m => ({ visible: m.mesh.visible, tris: m.tris }));
    return { sameSize, planes, maxDrop, floorLit: fl / fn, mirror };
  }, { noMist: 'data:image/png;base64,' + shotNoMist.toString('base64'), noChar: 'data:image/png;base64,' + shotNoChar.toString('base64') });
  check('R94-WORLD-11 the mid range is mirrored into the floor at the high tier',
    delivered.mirror.length === 1 && delivered.mirror[0].visible && delivered.mirror[0].tris > 100,
    JSON.stringify(delivered.mirror));
  /* R95-BB: the darkest band's ceiling rises from 50% to 72%. The bodybuilder
     reference's pyramids histogram at 69-81% under 32 luma (mean 22-28) with
     a 16-30% band at 32-63 and nothing above 128 — far darker than guardian
     B's 22%, and the brief asks for the world darker and lower in saturation
     than him. The 32-96 floor stays at a quarter so the range remains
     gunmetal with lit faces rather than a void. */
  check('R94-WORLD-12 the range reads as gunmetal over its own pixels (ref E pyramids: 69-81% <32, 16-30% 32-63, ~0% >128)',
    delivered.sameSize && delivered.planes.under32 < 0.72 && delivered.planes.mid > 0.25 && delivered.planes.over128 < 0.08,
    `${delivered.planes.px} px: ${(delivered.planes.under32 * 100).toFixed(0)}% <32, ${(delivered.planes.mid * 100).toFixed(0)}% 32-96, ${(delivered.planes.over128 * 100).toFixed(1)}% >128`);
  check('R94-WORLD-13 the horizon grades into the floor (no row-to-row step over 50 points)',
    delivered.maxDrop < 0.50, `largest drop ${(delivered.maxDrop * 100).toFixed(0)} points between rows 0.4% apart`);
  check('R94-WORLD-14 the floor in front reads wet (ref B: 29.5% of rows 0.72-0.84 above 32)',
    delivered.floorLit > 0.10, `${(delivered.floorLit * 100).toFixed(1)}% of the floor above 32`);
  await page.evaluate(() => { window.__MRMAH_LAB.scene.parts.stage.subject.visible = true; });

  /* The delivered evidence: showcase with and without him, chat, protocol, 3/4. */
  await page.evaluate(() => { document.querySelector('.lab-stage').style.height = '700px'; });
  await page.waitForTimeout(300);
  writeFileSync(join(OUT, 'r94-world-showcase.png'), await page.locator('.lab-stage').screenshot());
  await page.evaluate(() => { window.__MRMAH_LAB.scene.parts.stage.subject.visible = false; });
  await page.waitForTimeout(200);
  writeFileSync(join(OUT, 'r94-world-showcase-nochar.png'), await page.locator('.lab-stage').screenshot());
  await page.evaluate(() => { window.__MRMAH_LAB.scene.parts.stage.subject.visible = true; window.__MRMAH_LAB.scene.parts.character.setYaw(0.62); });
  await page.waitForTimeout(200);
  writeFileSync(join(OUT, 'r94-world-threequarter.png'), await page.locator('.lab-stage').screenshot());
  await page.evaluate(() => { window.__MRMAH_LAB.scene.parts.character.setYaw(0); document.querySelector('.lab-stage').style.height = '620px'; });
  const cloudAt = {};
  for (const name of ['chat', 'protocol']) {
    await page.evaluate(n => window.__MRMAH_LAB.scene.setMode(n), name);
    await page.waitForTimeout(400);
    writeFileSync(join(OUT, `r94-world-${name}.png`), await page.locator('.lab-stage').screenshot());
    cloudAt[name] = await page.evaluate(() => window.__MRMAH_LAB.scene.parts.environment.clouds.children.map(q => q.material.opacity));
  }
  /* The in-app frames keep their upper centre clear: the clouds are withheld
     there (scale-gated in applyFine), not merely moved. */
  check('R94-WORLD-15 clouds withheld at chat and protocol scale',
    Object.values(cloudAt).every(a => a.every(o => o === 0)), JSON.stringify(cloudAt));
  await ctx.close();
}
/* ---------------------------------------- end R94 world ------------------ */

/* ---------------------------------------- 11. R95 world ------------------ */
/* The moon, the distant variant figures, the hover beam, the beams' floor
   reflections and the darker range built for R95, measured at the high tier
   in the frames they have to hold: showcase and website at the 700px stage,
   chat and protocol at the 620px stage. Each check is STRUCTURAL: is the
   moon a textured disc in the upper left, above the horizon rows; do the
   figures ever touch him, in any mode; is the range darker than his chest;
   is there a beam between the tip and the floor; is there no cast shadow;
   does the floor still converge; does the budget hold. Every mask here comes
   from an ISOLATED render — the character alone, the figures alone, the moon
   alone, the beam alone — so a check about one thing never measures another. */
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`${URL_LAB}?tier=high`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  await page.evaluate(() => { window.__MRMAH_LAB.scene.setReducedMotion(true); });

  const measure = (mode, stage) => page.evaluate(async ({ mode, stage }) => {
    const s = window.__MRMAH_LAB.scene;
    s.setMode(mode);
    document.querySelector('.lab-stage').style.height = stage + 'px';
    await new Promise(r => setTimeout(r, 300));
    s.resize();
    const env = s.parts.environment, c = s.canvas, r = s.renderer, cam = s.camera;
    const g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
    const x = g.getContext('2d', { willReadFrequently: true });
    const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    /* Masks are cut from RAW frames (alpha is the object); values that are
       compared to the references are read COMPOSITED over the stage's ink,
       because getImageData returns unpremultiplied colour and a 3%-alpha
       corner cloud otherwise reports its full RGB as sky. */
    function grab(ink) { r.render(s.scene, cam); x.clearRect(0, 0, c.width, c.height); if (ink) { x.fillStyle = 'rgb(14,17,20)'; x.fillRect(0, 0, c.width, c.height); } x.drawImage(c, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; }
    function mask(d, thr) { const m = new Uint8Array(c.width * c.height); let n = 0; for (let i = 0; i < m.length; i++) { const k = i * 4; if (d[k + 3] > 40 && luma(d, k) > thr) { m[i] = 1; n++; } } return { m, n }; }
    function bbox(mk) { let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (let i = 0; i < mk.length; i++) if (mk[i]) { const xx = i % c.width, yy = (i / c.width) | 0; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; } return x1 < 0 ? null : [x0 / c.width, y0 / c.height, x1 / c.width, y1 / c.height]; }
    function stats(d, mk, x0, y0, x1, y1) {
      let n = 0, sum = 0, tail = 0; const bands = new Array(8).fill(0);
      for (let yy = Math.floor((y0 || 0) * c.height); yy < Math.floor((y1 == null ? 1 : y1) * c.height); yy++)
        for (let xx = Math.floor((x0 || 0) * c.width); xx < Math.floor((x1 == null ? 1 : x1) * c.width); xx++) {
          const i = yy * c.width + xx; if (mk && !mk[i]) continue;
          const l = luma(d, i * 4); n++; sum += l; if (l > 128) tail++; bands[Math.min(7, l >> 5)]++;
        }
      return { n, mean: n ? sum / n : 0, tail: n ? tail / n : 0, bands: n ? bands.filter(v => v / n > 0.03).length : 0 };
    }
    const vis = []; env.group.traverse(o => vis.push([o, o.visible]));
    /* The full frame first: budget, DEPTH-01's measure, the sky beside the moon. */
    const full = grab();
    const budget = { calls: r.info.render.calls, tris: r.info.render.triangles };
    let partialRows = 0;
    for (let yy = 0; yy < c.height; yy++) { let n = 0; for (let xx = 0; xx < c.width; xx++) { const i = (yy * c.width + xx) * 4; if (full[i + 3] > 4 && luma(full, i) > 10) n++; } if (n > 0 && n <= c.width * 0.8) partialRows++; }
    const fullInk = grab(true);
    const skyR = stats(fullInk, null, 0.7, 0.02, 1.0, 0.30);
    /* A: the character alone. */
    env.group.visible = false;
    const dA = grab(); const A = mask(dA, 24); const charBox = bbox(A.m);
    let chest = null;
    if (charBox) {
      const w = charBox[2] - charBox[0], h = charBox[3] - charBox[1];
      chest = stats(dA, A.m, charBox[0] + 0.34 * w, charBox[1] + 0.27 * h, charBox[0] + 0.66 * w, charBox[1] + 0.45 * h);
    }
    let charP99 = 0; { const ls = []; for (let i = 0; i < A.m.length; i++) if (A.m[i]) ls.push(luma(dA, i * 4)); ls.sort((a, b) => a - b); charP99 = ls.length ? ls[Math.floor(ls.length * 0.99)] : 0; }
    /* B: the figures alone. */
    env.group.visible = true; s.parts.stage.subject.visible = false;
    env.group.children.forEach(k => { k.visible = (k === env.figures); });
    const B = mask(grab(), 10);
    let overlap = 0; for (let i = 0; i < A.m.length; i++) if (A.m[i] && B.m[i]) overlap++;
    const figuresInFrame = stats(fullInk, B.m);         /* their pixels, in the delivered frame */
    /* M: the moon alone. R95 world (round 5): read OVER THE INK like every
       other value compared to a reference — the raw read is unpremultiplied,
       so a disc at any opacity reported its texel x tint (255 for a white
       limb) rather than what the frame shows, and the moon's max and the
       character's p99 were never on the same scale. */
    env.group.children.forEach(k => { k.visible = (k === env.moon); });
    const dM = grab(true); const M = mask(dM, 60);       /* the disc, not its glow */
    const moon = stats(dM, M.m); moon.box = bbox(M.m);
    let moonMax = 0; for (let i = 0; i < M.m.length; i++) if (M.m[i]) moonMax = Math.max(moonMax, luma(dM, i * 4));
    /* R: the range alone (structures, no mist, no figures), over its rows. */
    env.group.children.forEach(k => { k.visible = (k === env.structures); });
    const dR = grab(); const R = mask(dR, 6);
    const range = stats(dR, R.m, 0.0, 0.40, 1.0, 0.66);
    /* L: the beam alone. */
    env.group.children.forEach(k => { k.visible = (k === env.glow); });
    env.glow.children.forEach(k => { k.visible = (k === env.laser); });
    const L = mask(grab(), 30); const beamBox = bbox(L.m);
    vis.forEach(([o, v]) => { o.visible = v; });
    s.parts.stage.subject.visible = true;
    r.render(s.scene, cam);
    return {
      budget, partialRows, skyR: skyR.mean, charBox, chest, charP99,
      figures: { n: B.n, overlap, box: bbox(B.m), inFrame: figuresInFrame, stats: env.figuresBox.stats },
      moon: { n: M.n, mean: moon.mean, max: moonMax, bands: moon.bands, box: moon.box },
      range, beam: { n: L.n, box: beamBox },
      noShadow: s.parts.lights.key.castShadow === false && !env.ground && !s.parts.lights.key.shadow.map,
      beamMirror: !!(env.terrain.beamMirror && env.terrain.beamMirror.mesh.visible)
    };
  }, { mode, stage });

  const sc = await measure('showcase', 700);
  const web = await measure('website', 700);
  const chat = await measure('chat', 620);
  const proto = await measure('protocol', 620);
  const all = { showcase: sc, website: web, chat, protocol: proto };

  check('R95-WORLD-01 frame budget at tier high (draws <= 170, tris <= 12500)',
    sc.budget.calls <= 170 && sc.budget.tris <= 12500, `${sc.budget.calls} draws, ${sc.budget.tris} tris`);
  check('R95-WORLD-02 the moon is a textured disc in the upper left, above the horizon rows',
    sc.moon.n > 2000 && sc.moon.box && sc.moon.box[0] < 0.35 && sc.moon.box[3] < 0.40 && sc.moon.bands >= 3 &&
    sc.moon.mean > 100 && sc.moon.mean < 200 && sc.moon.max < 250,
    `${sc.moon.n} px at [${(sc.moon.box || []).map(v => v.toFixed(2)).join(', ')}], mean ${sc.moon.mean.toFixed(0)}, max ${sc.moon.max.toFixed(0)}, ${sc.moon.bands} bands`);
  check('R95-WORLD-03 the character stays the brightest thing (his 99th percentile above the moon\'s brightest)',
    sc.charP99 > sc.moon.max, `character p99 ${sc.charP99.toFixed(0)} vs moon max ${sc.moon.max.toFixed(0)}`);
  check('R95-WORLD-04 the moon is present in every mode',
    Object.values(all).every(m => m.moon.n > 300), Object.keys(all).map(k => `${k} ${all[k].moon.n}px`).join(', '));
  check('R95-WORLD-05 four to seven figures, at most four draws, under 1,600 triangles',
    sc.figures.stats.count >= 4 && sc.figures.stats.count <= 7 && sc.figures.stats.draws <= 4 && sc.figures.stats.tris <= 1600,
    `${sc.figures.stats.count} figures, ${sc.figures.stats.draws} draws, ${sc.figures.stats.tris} tris`);
  check('R95-WORLD-06 the figures never overlap him (showcase, website, chat, protocol)',
    sc.figures.n > 500 && Object.values(all).every(m => m.figures.overlap === 0),
    Object.keys(all).map(k => `${k} ${all[k].figures.overlap}px of ${all[k].figures.n}`).join(', '));
  check('R95-WORLD-07 the figures are dim silhouettes in the delivered frame (mean 25-75 over their own pixels)',
    sc.figures.inFrame.mean > 25 && sc.figures.inFrame.mean < 75 && sc.figures.inFrame.tail < 0.05,
    `mean ${sc.figures.inFrame.mean.toFixed(1)}, ${(sc.figures.inFrame.tail * 100).toFixed(1)}% above 128`);
  check('R95-WORLD-08 the range is darker than his chest, with a small bright tail',
    sc.chest && sc.range.n > 1000 && sc.range.mean < sc.chest.mean * 0.9 && sc.range.tail < 0.03,
    `range ${sc.range.mean.toFixed(1)} (${(sc.range.tail * 100).toFixed(1)}% above 128) vs chest ${sc.chest ? sc.chest.mean.toFixed(1) : '?'}`);
  check('R95-WORLD-09 a thin beam stands between the tip and the floor flare',
    sc.beam.n > 20 && sc.beam.box && (sc.beam.box[2] - sc.beam.box[0]) < 0.08 && (sc.beam.box[3] - sc.beam.box[1]) > 0.015 &&
    sc.charBox && Math.abs(sc.beam.box[1] - sc.charBox[3]) < 0.05,
    `${sc.beam.n} px, ${sc.beam.box ? `${((sc.beam.box[2] - sc.beam.box[0]) * 100).toFixed(1)}% wide x ${((sc.beam.box[3] - sc.beam.box[1]) * 100).toFixed(1)}% tall, top at ${sc.beam.box[1].toFixed(3)} vs tip ${sc.charBox[3].toFixed(3)}` : 'none'}`);
  check('R95-WORLD-10 no cast shadow: the key never casts, no catcher, no shadow map', sc.noShadow);
  check('R95-WORLD-11 the beams are mirrored into the wet floor at the high tier', sc.beamMirror);
  check('R95-WORLD-12 the floor still converges with the moon and the figures in place',
    sc.partialRows > 200, `${sc.partialRows} rows carry converging content`);
  check('R95-WORLD-13 the sky beside the moon stays near-black (right corner < 30)',
    sc.skyR < 30, `right corner ${sc.skyR.toFixed(1)}`);
  check('R95-WORLD-14 no errors building the world', errs.length === 0, errs.slice(0, 3).join(' | '));

  /* The delivered evidence. */
  const shot = async (name) => writeFileSync(join(OUT, `r95-world-${name}.png`), await page.locator('.lab-stage').screenshot());
  await page.evaluate(() => { window.__MRMAH_LAB.scene.setMode('showcase'); document.querySelector('.lab-stage').style.height = '700px'; });
  await page.waitForTimeout(400);
  await shot('showcase');
  const box = await page.locator('.lab-stage').boundingBox();
  const clip = (x0, y0, x1, y1) => ({ x: box.x + box.width * x0, y: box.y + box.height * y0, width: box.width * (x1 - x0), height: box.height * (y1 - y0) });
  writeFileSync(join(OUT, 'r95-world-moon.png'), await page.screenshot({ clip: clip(0.0, 0.02, 0.55, 0.30) }));
  writeFileSync(join(OUT, 'r95-world-figures.png'), await page.screenshot({ clip: clip(0.0, 0.54, 1.0, 0.70) }));
  await page.evaluate(() => { window.__MRMAH_LAB.scene.parts.stage.subject.visible = false; });
  await page.waitForTimeout(200);
  await shot('showcase-nochar');
  await page.evaluate(() => { window.__MRMAH_LAB.scene.parts.stage.subject.visible = true; window.__MRMAH_LAB.scene.parts.character.setYaw(0.62); });
  await page.waitForTimeout(200);
  await shot('threequarter');
  await page.evaluate(() => { window.__MRMAH_LAB.scene.parts.character.setYaw(0); document.querySelector('.lab-stage').style.height = '620px'; });
  for (const name of ['chat', 'protocol']) {
    await page.evaluate(n => window.__MRMAH_LAB.scene.setMode(n), name);
    await page.waitForTimeout(400);
    await shot(name);
  }
  await ctx.close();

  /* Website, in the canonical aspect. */
  const ctx2 = await browser.newContext({ viewport: { width: 600, height: 1100 }, deviceScaleFactor: 2 });
  const page2 = await ctx2.newPage();
  await page2.goto(`${URL_LAB}?tier=high&canonical=1`, { waitUntil: 'networkidle' });
  await page2.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  await page2.evaluate(() => { window.__MRMAH_LAB.scene.setReducedMotion(true); window.__MRMAH_LAB.scene.setMode('website'); });
  await page2.waitForTimeout(600);
  writeFileSync(join(OUT, 'r95-world-website.png'), await page2.locator('.lab-stage').screenshot());
  await ctx2.close();
}
/* ---------------------------------------- end R95 world ------------------ */

await browser.close();

writeFileSync(join(OUT, 'VERIFY_RESULTS.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, results, responsive }, null, 2));

const passed = results.length - failures;
console.log(`\n${passed}/${results.length} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
