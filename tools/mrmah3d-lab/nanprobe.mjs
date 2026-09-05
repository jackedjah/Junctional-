import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const variant of ['', 'female']) {
  const p = await b.newPage({ viewport: { width: 500, height: 889 } });
  const warns = [];
  p.on('console', m => { if (/NaN/.test(m.text())) warns.push(m.text().slice(0, 60)); });
  await p.goto(`${process.argv[2] || 'http://127.0.0.1:8123'}/mrmah3d/lab/index.html?tier=low&canonical=1${variant ? '&variant=' + variant : ''}`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__MRMAH_LAB && window.__MRMAH_LAB.mounted, { timeout: 20000 });
  const bad = await p.evaluate(() => {
    const out = [];
    window.__MRMAH_LAB.scene.scene.traverse(o => {
      const g = o.geometry; if (!g || !g.attributes || !g.attributes.position) return;
      const a = g.attributes.position.array; let n = 0;
      for (let i = 0; i < a.length; i++) if (Number.isNaN(a[i])) n++;
      if (n) out.push(o.name + ' (' + o.type + '): ' + n + ' NaN of ' + a.length + (o.parent ? ' parent ' + o.parent.name : ''));
    });
    return out;
  });
  console.log(variant || 'male', 'warnings', warns.length, JSON.stringify(bad, null, 1));
  await p.close();
}
await b.close();
