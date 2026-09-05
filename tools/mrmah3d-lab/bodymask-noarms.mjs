/* R108 — body mask with the ARMS HIDDEN (group 'mrmah-limbs'), so the central-run width of the torso /
   lower body cannot swallow a forearm hanging beside the hip. Deltoids stay (they are body).
   node bodymask-noarms.mjs <base> <out-prefix> views=front:0,rear:3.1416 variant=female */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const [BASE, PFX] = process.argv.slice(2);
const o = Object.fromEntries(process.argv.slice(4).map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
const VIEWS = (o.views || 'front:0,rear:3.1416').split(',').map(s => { const [n, y] = s.split(':'); return [n, Number(y)]; });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 500, height: 889 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`${BASE}/mrmah3d/lab/index.html?tier=low&canonical=1&debug=${o.debug || 'groups'}${o.variant ? '&variant=' + o.variant : ''}`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__MRMAH_LAB && (window.__MRMAH_LAB.mounted || window.__MRMAH_LAB.errors.length), { timeout: 20000 });
for (const [name, yaw] of VIEWS) {
  const info = await p.evaluate(({ yaw }) => {
    const s = window.__MRMAH_LAB.scene; s.setMode('showcase');
    const c = s.parts.character; c.setYaw(yaw);
    const root = c.root; let hidden = 0, limbs = 0;
    const holds = (o) => { let k = root; while (k) { if (k === o) return true; k = k.parent; } return false; };
    s.scene.children.forEach(o => { if (o !== root && !holds(o) && !o.isLight && !o.isCamera) { o.visible = false; hidden++; } });
    root.traverse(o => { if (o.name === 'mrmah-limbs') { o.visible = false; limbs++; } });
    return { hidden, limbs };
  }, { yaw });
  await p.waitForTimeout(700);
  writeFileSync(`${PFX}-mask-${name}.png`, await p.locator('.lab-stage').screenshot());
  console.log(name, JSON.stringify(info));
}
await b.close();
