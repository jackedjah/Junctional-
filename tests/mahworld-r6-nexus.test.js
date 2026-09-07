/* MAHWORLD — R6 MAH NEXUS, checked in the running world.

   §21 PASS 1 is SILHOUETTE, so these gates check the things a silhouette is made of — proportion,
   footprint, reach, and section curvature — and nothing about detail, which does not exist yet.

   Four of these gates exist because of instrument failures this site cost, and they are the most
   valuable ones in the file. Siting MAH NEXUS took four sweeps, and every one of the first three
   reported a world that was not there:

       a `built` filter matching /city/ counted `city-ground`, the FLOOR, as architecture
       min/max sentinels of +/-1e9 gave a groundless sample score -2.4e9, so FAILED rows sorted first
       every intersect sat in an empty catch, so a throwing pool looked exactly like an empty one
       and an overhead filter of /rain/ swallowed TERRAIN, because terrain contains rain

   So the SITE is gated here, not just the geometry: if the complex ever moves, or grows past the
   ground that was measured flat for it, this file fails instead of the next render.

   Run: node tests/mahworld-r6-nexus.test.js */
'use strict';
const fs = require('fs'), p = require('path'), cp = require('child_process');
const ROOT = '/home/user/Junctional-';
let pw = null; for (const c of ['playwright', p.join(cp.execSync('npm root -g').toString().trim(), 'playwright')]) { try { pw = require(c); break; } catch (e) {} }
const { chromium } = pw;
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json' };
const HOST = 'https://mahworld.test';
let pass = 0, fail = 0;
const P = (n, ok, d) => { if (ok) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  — ' + d : '')); } };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage({ viewport: { width: 900, height: 520 } });
  const errs = []; page.on('pageerror', e => errs.push('ERR ' + e.message));
  await page.route('**/*', r => {
    const u = new URL(r.request().url()); if (u.origin !== HOST) return r.abort();
    const f = p.join(ROOT, decodeURIComponent(u.pathname));
    if (f.indexOf(ROOT) === 0 && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, contentType: MIME[p.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return r.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });
  await page.goto(HOST + '/mahworld/scene/mahplaza.html?hud=0', { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.MAHWORLD_MAHPLAZA && window.MAHWORLD_MAHPLAZA.state.frames > 2, null, { timeout: 900000 });
  await page.evaluate(() => window.MAHWORLD_MAHPLAZA.advance(3, 1 / 30));
  const ev = fn => page.evaluate(fn);

  /* ============================================================================================
     0. IT EXISTS AND IT IS WIRED. First, always: a const in the temporal dead zone has silently
        deleted a whole district twice in this project, and the module list is how that is caught.
     ============================================================================================ */
  const wired = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA;
    return { nexus: !!w.modules.mahNexus, rain: !!w.modules.mahRain, halo: !!w.modules.halo,
      haven: !!w.modules.mahHaven, dome: !!w.modules.haloDome, forest: !!w.modules.rainforest };
  });
  console.log('\nR6 §1 — MAH NEXUS is built and wired');
  P('MAH NEXUS is wired', wired.nexus);
  P('R6 MAH RAIN survives', wired.rain);
  P('R4 MAH HALO survives', wired.halo);
  P('R5 MAH HAVEN survives', wired.haven);
  P('R5 the dome survives', wired.dome);
  P('R2 Rainforest City survives (it is this complex\'s foreground)', wired.forest);

  const S = await ev(() => JSON.parse(JSON.stringify(window.MAHWORLD_MAHPLAZA.mahNexus.stats)));

  /* ============================================================================================
     1. THE SITE. Measured once, at cost; gated forever.
     ============================================================================================ */
  console.log('\nTHE SITE — measured, and it stays measured');
  const site = await ev(async () => {
    const m = await import('/mahworld/scene/mah-nexus.js');
    const t = await import('/mahworld/scene/terrain.js');
    const N = m.NEXUS;
    const D = Math.PI / 180;
    const x = N.R * Math.cos(N.BEARING * D), z = -N.R * Math.sin(N.BEARING * D);
    return { bearing: N.BEARING, r: N.R, groundY: N.GROUND_Y, clearR: N.SITE_CLEAR_R,
      x, z, basinY: t.BASIN ? t.BASIN.y : null };
  });
  P('the site is on the rainforest pass axis (108..146)', site.bearing >= 108 && site.bearing <= 146,
    'bearing ' + site.bearing);
  P('the site is outside MAH HALO\'s hole, so a trunk can reach a ceiling', site.r > 700,
    'r ' + site.r + ' vs halo R_IN 700');
  P('the site is inside MAH HALO\'s outer rim', site.r < 3400, 'r ' + site.r);
  P('the site clears Rainforest City (bearing 127, r 700) by more than the complex\'s own reach',
    Math.abs(site.r - 700) > site.clearR + 300, 'separation ' + (site.r - 700) + ' m');
  /* the ground here is the PASS FLOOR, which is not the world water plane. A base handed BASIN.y
     would sit 1.3 m into its own site — MAH HAVEN's reservoir was drowned by exactly this
     substitution, one number handed down from the assembly that the district did not want. */
  P('the ground level is the pass floor, not the world water plane',
    site.basinY == null || Math.abs(site.groundY - site.basinY) > 0.5,
    'groundY ' + site.groundY + '  BASIN.y ' + site.basinY);

  /* the world is asked where its own ground is, rather than the module being believed */
  const dug = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA;
    const T = await import('/mahworld/vendor/three/three.module.min.js');
    const m = await import('/mahworld/scene/mah-nexus.js');
    w.scene.updateMatrixWorld(true);
    const tok = n => String(n || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const GROUND = new Set(['terrain', 'ground', 'land', 'lake', 'sea', 'basin', 'shore', 'water', 'bed']);
    const ground = [];
    w.scene.traverse(o => { if (o.isMesh && o.visible && o.geometry && tok(o.name).some(k => GROUND.has(k))) ground.push(o); });
    const N = m.NEXUS, D = Math.PI / 180;
    const cx = N.R * Math.cos(N.BEARING * D), cz = -N.R * Math.sin(N.BEARING * D);
    const ys = []; let miss = 0;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const x = cx + i * N.SITE_CLEAR_R / 2, z = cz + j * N.SITE_CLEAR_R / 2;
      const rc = new T.Raycaster(new T.Vector3(x, 4000, z), new T.Vector3(0, -1, 0), 1, 9000);
      const h = rc.intersectObjects(ground, false);
      if (!h.length) { miss++; continue; }
      ys.push(h[0].point.y);
    }
    return { n: ys.length, miss, pool: ground.length,
      lo: ys.length ? Math.min(...ys) : null, hi: ys.length ? Math.max(...ys) : null };
  });
  /* THE POOL GATE. This is the /rain/-swallows-terrain bug, made permanent. If the ground pool
     ever comes back with fewer objects than the terrain family alone, the instrument is broken
     and every number below it is fiction. */
  P('the ground pool actually contains the world\'s terrain', dug.pool >= 5, 'pool ' + dug.pool);
  P('every sample over the footprint finds ground', dug.miss === 0, dug.miss + ' misses');
  P('the footprint is still flat', dug.hi != null && (dug.hi - dug.lo) < 6,
    'relief ' + (dug.hi - dug.lo).toFixed(1) + ' m');
  P('the module\'s ground level matches the world\'s', dug.hi != null && Math.abs(dug.hi - site.groundY) < 1.5,
    'module ' + site.groundY + '  world ' + (dug.hi == null ? '?' : dug.hi.toFixed(1)));
  P('the complex closes inside the ground measured flat for it', S.footprintOK,
    'reach ' + S.groundReach + ' m vs clear ' + S.siteClearR + ' m');

  /* ============================================================================================
     2. §3 — THE TRUNKS CONNECT PHYSICALLY INTO THE HALO UNDERSIDE.
     ============================================================================================ */
  console.log('\nR6 §3 — it reaches, and it does not spear');
  P('every member that claims a landing has one', S.landings >= 18, S.landings + ' landings');
  P('no landing misses the underside', S.landingGap < 1.0,
    'worst ' + S.landingGap + ' m at ' + S.landingWorstIn);
  P('the complex reaches the halo', S.reachesHalo === true,
    'topY ' + S.topY + '  capY ' + S.haloUnderY);
  /* the FIRST build put the top vertex 11 m above the halo's walking surface, because a branch
     leaning inward meets a ceiling that RISES toward the hole and its tilted end cap came through
     the deck. Every landing approach is vertical now, and this is the gate that says so. */
  const pierce = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA;
    const m = await import('/mahworld/scene/mah-nexus.js');
    const h = await import('/mahworld/scene/halo.js');
    const N = m.NEXUS, D = Math.PI / 180;
    const CX = N.R * Math.cos(N.BEARING * D), CZ = -N.R * Math.sin(N.BEARING * D);
    const g = w.mahNexus.group;
    let worst = -1e9, deckTop = null;
    for (const c of g.children) {
      if (!c.isMesh) continue;
      const A = c.geometry.attributes.position;
      for (let i = 0; i < A.count; i++) {
        const y = A.getY(i); if (y < 1600) continue;
        const wx = CX + A.getX(i), wz = CZ + A.getZ(i);
        const top = h.haloHeight(wx, wz) + h.HALO.THICK / 2 - N.GROUND_Y;
        if (deckTop == null) deckTop = top;
        const over = y - top;
        if (over > worst) worst = over;
      }
    }
    return { worst: +worst.toFixed(2), deckTop: +(deckTop || 0).toFixed(1) };
  });
  P('nothing punches through the halo walking deck', pierce.worst < 0,
    'worst overshoot ' + pierce.worst + ' m above the deck');

  /* ============================================================================================
     3. §2 / §5 — IT IS NOT A SPIKE, A PIPE BUNDLE, OR A SHARD.
     ============================================================================================ */
  console.log('\nR6 §2/§5 — the shape the brief forbids');
  P('the core is monumental, not a spike', S.coreAspect >= 5 && S.coreAspect <= 12,
    'height:width ' + S.coreAspect + ':1');
  P('the primary trunks are towers, not needles', S.primaryAspect <= 24,
    'height:width ' + S.primaryAspect + ':1');
  P('the hierarchy §3 asks for is all present',
    S.parts.core === 1 && S.parts.primary >= 4 && S.parts.rings >= 2, JSON.stringify(S.parts));
  P('all three tube families exist (§2: straight, spiralling, branch-like)',
    S.parts.straight > 0 && S.parts.spiral > 0 && S.parts.branch > 0, JSON.stringify(S.parts));
  P('the sanctuary is not held up by toothpicks (§3)', S.parts.primary + S.parts.branch >= 10,
    (S.parts.primary + S.parts.branch) + ' major members');
  /* §5's NO SHARD law, as a number. The section is a superellipse and its exponent IS the corner
     sharpness: 2 is a circle, 8 is a square with corners you could cut yourself on. Read the
     exponents out of the module rather than trusting the prose next to them. */
  const expo = await ev(async () => {
    const m = await import('/mahworld/scene/mah-nexus.js');
    const N = m.NEXUS;
    const list = [N.CORE.N0, N.CORE.N1, N.PRIMARY.N, N.STRAIGHT.N, N.SPIRAL.N, N.BRANCH.N, N.PETALS.N]
      .concat(N.TIERS.map(t => t.n)).concat(N.RINGS.map(r => r.n));
    return { min: Math.min(...list), max: Math.max(...list), n: list.length };
  });
  P('every section is a rounded square, never a razor one (§5)', expo.max <= 6.2 && expo.min >= 2.8,
    'exponents ' + expo.min + '..' + expo.max + ' across ' + expo.n + ' families');

  /* ============================================================================================
     4. THE SURFACE IS SMOOTH, NOT FACETED. §5 asks for blended curvature; a non-indexed sweep
        would give flat shards, so the normals are measured rather than assumed.
     ============================================================================================ */
  console.log('\nR6 §5 — blended curvature, measured');
  const smooth = await ev(() => {
    const g = window.MAHWORLD_MAHPLAZA.mahNexus.group;
    let checked = 0, sharp = 0;
    for (const c of g.children) {
      if (!c.isMesh || c.name !== 'nexus-trunk') continue;
      const Nn = c.geometry.attributes.normal;
      /* adjacent vertices inside one triangle: on a smooth sweep their normals are near-parallel;
         on a flat-shaded one they are identical, and across a shard they diverge hard */
      for (let i = 0; i + 2 < Nn.count && checked < 40000; i += 3) {
        const d = Nn.getX(i) * Nn.getX(i + 1) + Nn.getY(i) * Nn.getY(i + 1) + Nn.getZ(i) * Nn.getZ(i + 1);
        checked++; if (d < 0.55) sharp++;
      }
    }
    return { checked, sharp, pct: checked ? +(100 * sharp / checked).toFixed(2) : null };
  });
  P('the trunk surface has normals to measure', smooth.checked > 1000, smooth.checked + ' triangles');
  P('almost no triangle turns more than 57 degrees across itself', smooth.pct != null && smooth.pct < 4,
    smooth.pct + '% sharp');

  /* ============================================================================================
     5. CONTRACT, COST AND DETERMINISM.
     ============================================================================================ */
  console.log('\nthe module contract');
  const api = await ev(() => {
    const n = window.MAHWORLD_MAHPLAZA.mahNexus;
    return ['setTime', 'setTheme', 'update', 'setQuality', 'setDetail', 'navSites', 'dispose']
      .reduce((o, k) => (o[k] = typeof n[k] === 'function', o), {});
  });
  for (const k of Object.keys(api)) P('contract: ' + k + '()', api[k]);
  P('the whole complex is a handful of draws', S.draws <= 6, S.draws + ' draws');
  P('the triangle cost is a hero object\'s, not a world\'s', S.triangles < 220000, S.triangles + ' triangles');

  const nav = await ev(() => window.MAHWORLD_MAHPLAZA.mahNexus.navSites());
  P('it is somewhere you can be sent', nav.length >= 1 && nav[0].id === 'mah-nexus', JSON.stringify(nav));

  const surf = await ev(async () => {
    const m = await import('/mahworld/scene/mah-nexus.js');
    const N = m.NEXUS, D = Math.PI / 180;
    const cx = N.R * Math.cos(N.BEARING * D), cz = -N.R * Math.sin(N.BEARING * D);
    return { centre: m.nexusSurface(cx, cz), far: m.nexusSurface(cx + 3000, cz),
      offEdge: m.nexusSurface(cx + N.SITE_CLEAR_R + 200, cz) };
  });
  P('the base is walkable', typeof surf.centre === 'number' && surf.centre > 80, 'y ' + surf.centre);
  P('the roam surface ends where the complex does', surf.far === null && surf.offEdge === null,
    JSON.stringify(surf));

  /* determinism: the world's own law. No Math.random anywhere in this module. */
  const src = fs.readFileSync(p.join(ROOT, 'mahworld/scene/mah-nexus.js'), 'utf8');
  P('nothing here is random', src.indexOf('Math.random') === -1);

  P('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
