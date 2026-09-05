/* R102 — ISOLATION CAPTURES. Render the canonical front with named transports switched off, so a
   colour or value can be attributed instead of argued. One browser per call.
   node isolate.mjs <base> <out.png> tweaks=norim,noinner,nolines,nolights,nocoat,noseamtint [yaw=0] [variant=female] [bright=r,g,b]
     norim     rim floor 0 and rim directions zeroed (the per-frame setter is disconnected for the frame)
     noinner   internal + core light off
     nolines   every LineSegments under the character hidden
     nolights  theme rim / rim2 / bounce / chest lamp / face lamp intensities 0
     nocoat    platinum coat weight 0
     nokey     key light 0 (what the environment alone gives)
     noenv     envMapIntensity 0 on body and head (what the lights alone give) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const [BASE, OUT] = process.argv.slice(2);
const o = Object.fromEntries(process.argv.slice(4).map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
const tweaks = (o.tweaks || '').split(',').filter(Boolean);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 500, height: 889 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`${BASE}/mrmah3d/lab/index.html?tier=high&canonical=1${o.variant ? '&variant=' + o.variant : ''}${o.bright ? '&bright=' + o.bright : ''}`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__MRMAH_LAB && (window.__MRMAH_LAB.mounted || window.__MRMAH_LAB.errors.length), { timeout: 20000 });
const info = await p.evaluate(({ tweaks, yaw }) => {
  const s = window.__MRMAH_LAB.scene; s.setMode('showcase');
  const c = s.parts.character; c.setYaw(Number(yaw || 0));
  const mats = c.materials; const L = s.parts.lights; const done = [];
  const crystals = [mats.body, mats.head].filter(m => m && m.userData && m.userData.crystal);
  const has = (t) => tweaks.indexOf(t) !== -1;
  crystals.forEach(m => {
    const u = m.userData.crystal;
    if (has('norim')) { u.uRimFloor.value = 0; u.uRimDirA.value.set(0, 0, 0); u.uRimDirB.value.set(0, 0, 0); done.push('norim'); }
    if (has('noinner')) { u.uInnerStrength.value = 0; u.uCoreStrength.value = 0; done.push('noinner'); }
    if (has('nocoat')) { u.uCoat.value = 0; done.push('nocoat'); }
    if (has('noenv')) { m.envMapIntensity = 0; m.needsUpdate = true; done.push('noenv'); }
    if (has('norim') || has('noinner')) m.userData.crystal = null;   /* disconnect the per-frame setters */
  });
  if (has('nolines')) { c.root.traverse(ob => { if (ob.isLineSegments || ob.isLine) ob.visible = false; }); done.push('nolines'); }
  if (has('nolights') && L) { ['rim', 'rim2', 'bounce', 'chestLamp', 'faceLamp'].forEach(k => { if (L[k]) L[k].intensity = 0; }); done.push('nolights'); }
  if (has('nokey') && L) { if (L.key) L.key.intensity = 0; done.push('nokey'); }
  return { done, hasLights: !!L, keys: L ? Object.keys(L).slice(0, 12) : null };
}, { tweaks, yaw: o.yaw });
await p.waitForTimeout(800);
writeFileSync(OUT, await p.locator('.lab-stage').screenshot());
console.log(OUT, JSON.stringify(info), 'errors', JSON.stringify(await p.evaluate(() => window.__MRMAH_LAB.errors)));
await b.close();
