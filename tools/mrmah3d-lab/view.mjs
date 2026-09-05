/* General capture of the REAL renderer through the lab page.
   node view.mjs <base> <out.png> [key=value ...]
     mode=showcase|chat|protocol|portrait   (default showcase)
     yaw=<radians>        rotate the character (parts.character.setYaw)
     state=<name>         idle listening thinking explaining success concerned
     w=520 h=760          viewport (CSS px);  stage=700  .lab-stage height
     dsf=2                deviceScaleFactor;  tier=high|medium|low (default high)
     nochar=1             hide the character (environment-only capture)
     clip=x0,y0,x1,y1     crop fractions of the stage box
     settle=900           ms to wait before the capture
     canonical=1          reference-frame aspect (lab ?canonical=1)
   Rotation lives on the character part: `scene.setYaw` does not exist. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
const o = Object.fromEntries(process.argv.slice(4).map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
const W = Number(o.w || 520), H = Number(o.h || 760), STAGE = Number(o.stage || 700);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(o.dsf || 2) });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
const q = new URLSearchParams({ tier: o.tier || 'high' }); if (o.canonical) q.set('canonical', '1');
if (o.variant) q.set('variant', o.variant); if (o.debug) q.set('debug', o.debug); if (o.bright) q.set('bright', o.bright);
await p.goto(`${BASE}/mrmah3d/lab/index.html?${q}`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
await p.evaluate(({ mode, stage, yaw, state, nochar }) => {
  const s = window.__MRMAH_LAB.scene;
  s.setMode(mode);
  if (!document.documentElement.dataset.canonical) document.querySelector('.lab-stage').style.height = stage + 'px';
  if (state) s.setState(state);
  const c = s.parts && s.parts.character;
  if (yaw && c && c.setYaw) c.setYaw(Number(yaw));
  if (nochar && c && c.root) c.root.visible = false;
}, { mode: o.mode || 'showcase', stage: STAGE, yaw: o.yaw, state: o.state, nochar: o.nochar });
await p.waitForTimeout(Number(o.settle || 900));
const box = await p.locator('.lab-stage').boundingBox();
let clip;
if (o.clip) {
  const [x0, y0, x1, y1] = o.clip.split(',').map(Number);
  clip = { x: box.x + box.width * x0, y: box.y + box.height * y0, width: box.width * (x1 - x0), height: box.height * (y1 - y0) };
}
writeFileSync(OUT, clip ? await p.screenshot({ clip }) : await p.locator('.lab-stage').screenshot());
const errs = await p.evaluate(() => window.__MRMAH_LAB.errors);
console.log('wrote', OUT, JSON.stringify({ stage: [box.width, box.height], errors: errs }));
await b.close();
