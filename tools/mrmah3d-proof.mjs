/* MAH 3D — PROOF CAPTURE (development tooling).

   Drives `/mrmah3d/review/` in a real browser and captures the proof set the
   final-refinement pack asks for, per character:

     FRONT · 3/4 · SIDE · REAR · lower-body · torso-and-arms · head · hero

   in whichever surface modes are asked for. The point of the page is that a
   change can be inspected; the point of this tool is that the same seven views
   can be captured identically before and after, so a comparison measures the
   change and not the framing.

   Usage:
     node tools/mrmah3d-proof.mjs [baseUrl] [outDir] [--who=male,mrs-mah]
                                  [--surface=material,clay,crystal] [--tier=high]

   Needs a static server rooted at the repository root. Desktop headless
   Chromium runs on a software rasteriser here: this proves geometry, framing
   and value structure, and is NOT evidence about real iPhone/iPad Safari. */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const flag = (name, fallback) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const BASE = positional[0] || 'http://127.0.0.1:8123';
const OUT = positional[1] || 'validation/mrmah3d/proof';
const WHO = flag('who', 'male,mrs-mah').split(',').filter(Boolean);
const SURFACES = flag('surface', 'material,clay').split(',').filter(Boolean);
const TIER = flag('tier', 'high');
/* --isolate hides the world. Both retained evidence sets are an isolated
   figure, and the package's rule is that value is compared over the BODY: with
   the world in, the mist and floor glow are most of what any histogram counts
   and a silhouette is read against a lit cloudscape rather than against
   nothing. Use it for every sculpt comparison. */
const ISOLATE = args.includes('--isolate');
const VIEW_FILTER = flag('views', '');

/* The seven named views. `surface: 'clay'` is forced on the two that exist to
   judge the SCULPT — a lit crystal flatters a form the clay would reject, and
   that is the fault the R106 clay gate was written for. */
const VIEWS = [
  { id: '01-front',      yawDeg: 0,    framing: 'full' },
  { id: '02-threequarter', yawDeg: -40, framing: 'full' },
  { id: '03-side',       yawDeg: -90,  framing: 'full' },
  { id: '04-rear',       yawDeg: 180,  framing: 'full' },
  { id: '05-lower-front', yawDeg: 0,   framing: 'lower' },
  { id: '06-lower-threequarter', yawDeg: -40, framing: 'lower' },
  { id: '07-torso-arms', yawDeg: -22,  framing: 'torso' },
  { id: '08-head',       yawDeg: -20,  framing: 'head' },
  { id: '09-hero',       yawDeg: -28,  framing: 'full', pitchDeg: 6, zoom: 0.86 }
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const manifest = [];
let failures = 0;

for (const who of WHO) {
  const page = await browser.newPage({ viewport: { width: 900, height: 1280 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const url = `${BASE}/mrmah3d/review/index.html?variant=${who}&tier=${TIER}`;
  /* The character is built SYNCHRONOUSLY inside the module script, so the load
     event does not fire until it is finished — a minute for him and three for
     her on this rasteriser. Commit the navigation, then wait on the harness's
     own mounted flag rather than on a lifecycle event the build is holding. */
  await page.goto(url, { waitUntil: 'commit', timeout: 600000 });
  await page.waitForFunction(() => window.__MRMAH_REVIEW && window.__MRMAH_REVIEW.mounted, null,
    { timeout: 600000 });
  await page.waitForTimeout(1200);

  for (const surface of SURFACES) {
    for (const view of VIEWS.filter(v => !VIEW_FILTER || VIEW_FILTER.split(',').some(f => v.id.includes(f)))) {
      const set = {
        yawDeg: view.yawDeg,
        pitchDeg: view.pitchDeg ?? 0,
        zoom: view.zoom ?? 1,
        framing: view.framing,
        spinning: false,
        surface: surface === 'material' ? '' : surface,
        isolated: ISOLATE
      };
      await page.evaluate(s => window.__MRMAH_REVIEW.set(s), set);
      await page.waitForTimeout(420);
      const name = `${who}__${surface}${ISOLATE ? '-iso' : ''}__${view.id}.png`;
      await page.locator('#stage').screenshot({ path: join(OUT, name) });
      manifest.push({ who, surface, view: view.id, file: name, ...set });
      console.log(`captured  ${name}`);
    }
  }

  const info = await page.evaluate(() => window.__MRMAH_REVIEW.info());
  console.log(`${who}: ${info.triangles} tris, ${info.drawCalls} draws, tier ${info.tier}, ` +
    `${info.stats.avgMs.toFixed(2)} ms/frame`);
  if (errors.length) { failures++; console.log(`${who} BROWSER ERRORS: ${errors.join(' | ')}`); }
  manifest.push({ who, info, errors });
  await page.close();
}

await browser.close();
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length} entries -> ${OUT}`);
process.exit(failures ? 1 : 0);
