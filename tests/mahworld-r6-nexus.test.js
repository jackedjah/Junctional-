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
  /* §3 names FOUR tiers — PRIMARY TRUNKS, SECONDARY BRANCHES, TERTIARY CONNECTORS, FOBEAM/MAHGIC
     LINES — and the first build had two of them. A tier that is not built is not a hierarchy. */
  P('all four §3 tiers are built, not just named',
    S.parts.primary > 0 && S.parts.branch > 0 && S.parts.tertiary > 0 && S.parts.mahgic > 0,
    JSON.stringify(S.parts));
  /* and "do not make every support identical" is a LADDER OF SIZES, not a list of labels. Two
     tiers within a few per cent of each other are one tier wearing two names. */
  P('§3: the tier widths strictly decrease, with real gaps between them', S.hierarchyOK === true,
    S.hierarchy + (S.hierarchyFaults && S.hierarchyFaults.length ? '  faults: ' + S.hierarchyFaults.join(', ') : ''));
  P('every member stands on a deck wide enough to carry it', S.seatsOK === true,
    JSON.stringify(S.seatFaults || []));
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
     3b. §4 — THE TUBULAR DIAMOND ENTRY SYSTEM, and §7's DISTAL DETAIL LAW.

     "Every transport tube entry should feel like a premium destination portal." Before this pass
     every tube in the complex met the deck as a bare capped cylinder, which is exactly what §7
     means by "even a simple door" being a quality gate.
     ============================================================================================ */
  console.log('\nR6 §4 — every tube has a door, and no platform stands in front of one');
  const portal = await ev(async () => {
    const m = await import('/mahworld/scene/mah-nexus.js');
    const P = m.NEXUS.PORTAL;
    return { w: P.W, h: P.H, ratio: +(P.W / P.H).toFixed(2),
      jambDepth: P.JAMB_D, throatDepth: P.THROAT_D,
      nodeRatio: +(P.NODE_W / P.NODE_H).toFixed(2),
      expo: [P.CASING_N, P.JAMB_N, P.THROAT_N],
      doors: m.doorBearings(), petals: m.petalBearings() };
  });
  P('there is a portal at every tube entry, plus the main door (§10)',
    S.parts.portals === portal.doors.length + 1,
    S.parts.portals + ' portals for ' + portal.doors.length + ' tubes');
  /* §06 is a standing world law and it applies to every diamond in the world, doors included: a
     diamond taller than it is wide reads as a spike, which §5 forbids by name. */
  P('§06: the portal mouth is WIDER THAN TALL', portal.ratio > 1.15,
    portal.w + ' x ' + portal.h + ' = ' + portal.ratio + ':1');
  P('§06: the status node is wider than tall too', portal.nodeRatio > 1.15, portal.nodeRatio + ':1');
  P('§4: the jamb is physically deep, not a painted line', portal.jambDepth >= 10,
    portal.jambDepth + ' m');
  P('§4: the throat goes deeper still', portal.throatDepth > portal.jambDepth, portal.throatDepth + ' m');
  /* the depth reads off the CORNER RADIUS changing, not off a shadow — so the three rings must
     round off monotonically as they recede. This is the mechanism, checked as a sequence. */
  P('§4: the frame rounds off as it recedes, so the depth reads without a shadow',
    portal.expo[0] > portal.expo[1] && portal.expo[1] > portal.expo[2], portal.expo.join(' > '));
  /* THE COLLISION THE RENDER CAUGHT. Petals on a 36-degree phase and straight tubes on 45 put a
     158 m wide platform nine degrees off a transport entry — it filled the lower half of that
     portal's own proof frame. The bearings are derived from the door gaps now, not phased. */
  P('§8 platforms do not stand in front of §4 doors', S.petalDoorSep > 14,
    'closest petal is ' + S.petalDoorSep + ' deg from a door');
  P('the petal bearings are derived from the doors, not a fixed phase',
    JSON.stringify(S.petalBearings) === JSON.stringify(portal.petals.map(b2 => +b2.toFixed(1))),
    JSON.stringify(S.petalBearings) + ' vs ' + JSON.stringify(portal.petals));

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
     5. §07 / LAW 1 — THE HERO OBJECT HAS TO BE BRIGHTER THAN THE CITY.

     The first build made the whole complex a pure metal at metalness 0.94-0.95 and it went dark:
     measured from the approach camera at 09:20, nexus-trunk 89.6, nexus-shell 36.7 and the tube
     families 23.8, against a sky at 167. v7's own notes put this world's building masses at 49-58,
     so the newest and most important object in MAHWORLD was darker than the darkest thing in it.

     The cause was LAW 1 read backwards. A metal takes NO diffuse light, so a broad surface made
     entirely of metal is only as bright as what it happens to reflect — and most of a 400 m complex
     is not pointing at the horizon band. MAHWORLD's own answer was already in the scene: crown-plat
     and halo-rims, the brightest architecture in the world, carry #b6c4d6 at metalness 0.38 and
     reserve 0.9+ for edges. The finish shader takes that split as options, so it is set explicitly
     now rather than inherited.

     This gate is the measurement, kept: classify by raycast, read the same pixel out of the
     framebuffer, and require the trunk to out-value the city masses it is supposed to dominate.
     ============================================================================================ */
  console.log('\nR6 §07 — the hero object out-values the city');
  const val = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA;
    const T = await import('/mahworld/vendor/three/three.module.min.js');
    const m = await import('/mahworld/scene/mah-nexus.js');
    const N = m.NEXUS, D = Math.PI / 180;
    const cx = N.R * Math.cos(N.BEARING * D), cz = -N.R * Math.sin(N.BEARING * D);
    const k = 2600 / N.R;
    w.setTime('09:20');
    w.setCustomView({ pos: [cx * k, 60, cz * k], look: [cx, 900, cz], fov: 56 });
    w.camera.near = 0.5; w.camera.far = 60000; w.camera.updateProjectionMatrix();
    w.advance(8, 1 / 30);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    w.scene.updateMatrixWorld(true); w.camera.updateMatrixWorld(true);
    const all = []; w.scene.traverse(o => { if (o.isMesh && o.visible && o.geometry) all.push(o); });
    const cv = w.renderer.domElement, W = cv.width, H = cv.height;
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    c2.getContext('2d').drawImage(cv, 0, 0);
    const px = c2.getContext('2d').getImageData(0, 0, W, H).data;
    const rc = new T.Raycaster(); rc.far = 60000;
    /* the atmosphere is SKIPPED, not classified: rain and cloud lie in front of the monument and
       the sky in equal measure, so they cannot separate the two. The pixel still contains them,
       which is the honest number because it is what a viewer sees. */
    const SKIP = ['rain', 'cloud', 'veil', 'mantle', 'curtain', 'fog', 'beam', 'fobeam'];
    const tokOf = o => String(o && o.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const bins = {};
    for (let iy = -0.85; iy <= 0.85; iy += 0.04) for (let ix = -0.9; ix <= 0.9; ix += 0.04) {
      rc.setFromCamera(new T.Vector2(ix, iy), w.camera);
      let h = []; try { h = rc.intersectObjects(all, false); } catch (e) {}
      /* the sky in this world is a MESH, and an UNNAMED one — so `no hit means sky` never fires
         and `hit.object.name` is the empty string. Both go to the SKY bin by name here, which is
         the third time in this round that an object's name has decided a measurement's fate. */
      let nm = 'SKY';
      for (const hit of h) {
        const t = tokOf(hit.object);
        if (t.some(x => SKIP.includes(x))) continue;
        nm = (!t.length || t.includes('sky')) ? 'SKY' : (hit.object.name || 'SKY');
        break;
      }
      const sx = Math.round((ix * 0.5 + 0.5) * (W - 1)), sy = Math.round((0.5 - iy * 0.5) * (H - 1));
      const o = (sy * W + sx) * 4;
      (bins[nm] = bins[nm] || []).push(0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]);
    }
    const med = k2 => { const a = bins[k2]; if (!a || a.length < 12) return null; a.slice().sort(); a.sort((x, y) => x - y); return +a[Math.floor(a.length / 2)].toFixed(1); };
    return { trunk: med('nexus-trunk'), tube: med('nexus-tube'), shell: med('nexus-shell'),
      mahgic: med('nexus-mahgic'), sky: med('SKY'),
      seen: Object.keys(bins).filter(n => n.indexOf('nexus') === 0) };
  });
  P('the value probe found the complex at all', val.seen.length >= 2, JSON.stringify(val.seen));
  /* 58 is the top of v7's measured range for this world's building masses. The trunk is the hero
     vertical and must clear it; below that the monument is competing with warehouses. */
  P('the trunk out-values every building mass in the world', val.trunk != null && val.trunk > 70,
    'trunk ' + val.trunk + '  (world building masses measure 49-58)');
  P('the tube family is platinum casing, not a recess', val.tube != null && val.tube > 70,
    'tubes ' + val.tube);
  /* and it must stay an OBJECT, not become a hole in the sky or a light source brighter than it */
  P('the complex still reads darker than the sky behind it',
    val.trunk != null && val.sky != null && val.trunk < val.sky - 15,
    'trunk ' + val.trunk + '  sky ' + val.sky);
  /* v10 §13, made permanent for this module. The first MAHGIC build measured 191.7 against a trunk
     at 108.8 and hit 254.8 — clipped white — at world distance. §3's fourth tier is an ACCENT: a
     tier that out-values the three above it is not accenting the structure, it has replaced it.
     The rails may be brighter than the metal (they are light), but not by more than a third. */
  P('§3 tier 4 accents the structure instead of replacing it (v10 §13)',
    val.mahgic == null || (val.trunk != null && val.mahgic < val.trunk * 1.35),
    'mahgic ' + val.mahgic + '  trunk ' + val.trunk);

  /* ============================================================================================
     5b. R7 §15 — THE MATERIAL FAMILIES ARE VISUALLY DISTINCT.

     R7's acceptance gates require "platinum / crystal / glass are visually distinct" and that black
     crystal is "deep, reflective / clearcoat, readable, NEVER dead black". Both were failing: the
     halo landing terraces rendered as dead black discs because `deck` was the world's FLOOR
     material (paving, 0x0b0f16 at metalness 0.40), and the jambs were a matte structural grade that
     read as unlit cavity rather than machined recess.

     A material family is only real if a viewer can tell its members apart, so that is what is
     measured — the properties, not the intent.
     ============================================================================================ */
  console.log('\nR7 §15 — the material families are distinguishable');
  const fam = await ev(() => {
    const g = window.MAHWORLD_MAHPLAZA.mahNexus.group;
    const out = {};
    for (const c of g.children) {
      if (!c.isMesh || !c.material) continue;
      const m = c.material;
      /* the LOD split renamed these: the jamb and throat now build inside the detail tier, so
         their meshes are `nexus-recess-detail` and `nexus-glass-detail`. Strip both affixes or the
         gate reads `undefined` and reports a material fault that is really a naming fault — which
         is how this file's first run of these three gates failed. */
      out[c.name.replace('nexus-', '').replace('-detail', '')] = {
        lum: +(0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b).toFixed(3),
        rough: m.roughness, metal: m.metalness,
        clearcoat: m.clearcoat == null ? null : m.clearcoat,
        transparent: !!m.transparent, opacity: m.opacity
      };
    }
    return out;
  });
  P('black crystal is not dead black (§15)',
    fam.deck && fam.deck.lum > 0.004 && (fam.deck.clearcoat == null || fam.deck.clearcoat > 0.5),
    JSON.stringify(fam.deck));
  P('the recess is liquid dark METAL, not matte structure (§15)',
    fam.recess && fam.recess.metal > 0.85 && fam.recess.rough < 0.25, JSON.stringify(fam.recess));
  P('clear diamond glass exists and is actually transparent (§15, §5)',
    fam.glass && fam.glass.transparent && fam.glass.opacity < 0.6, JSON.stringify(fam.glass));
  /* distinctness: the dark families must be genuinely darker than the platinum ones, and the two
     dark families must differ from each other in FINISH rather than only in colour. */
  P('platinum and the dark families are far apart in value',
    fam.tube && fam.deck && fam.tube.lum > fam.deck.lum * 6,
    'tube ' + (fam.tube && fam.tube.lum) + ' vs black crystal ' + (fam.deck && fam.deck.lum));
  P('the two dark families differ in finish, not just colour',
    fam.deck && fam.recess && Math.abs(fam.deck.metal - fam.recess.metal) > 0.3,
    'metalness ' + (fam.deck && fam.deck.metal) + ' vs ' + (fam.recess && fam.recess.metal));

  /* ============================================================================================
     6. CONTRACT, COST AND DETERMINISM.
     ============================================================================================ */
  console.log('\nthe module contract');
  const api = await ev(() => {
    const n = window.MAHWORLD_MAHPLAZA.mahNexus;
    return ['setTime', 'setTheme', 'update', 'setQuality', 'setDetail', 'navSites', 'dispose']
      .reduce((o, k) => (o[k] = typeof n[k] === 'function', o), {});
  });
  for (const k of Object.keys(api)) P('contract: ' + k + '()', api[k]);
  /* R7 §24 — THE BUDGET IS PER TIER, BECAUSE THE STRATEGY IS PER TIER.

     A single triangle limit is the wrong gate for an object with LOD, and it failed as one: the §15
     material closure and the §7 halo terminals took this complex from 130k in four draws to 235k in
     seven, and a flat budget can only say "too big" — it cannot say "too big AT DISTANCE", which is
     the thing that actually costs frames. §24 asks for high detail near the player and a clean
     silhouette far from them, so both ends are measured.

     The far tier lands at exactly what the whole object cost before R7, which is the sanity check
     that the split went along the right seam. */
  P('§24: the far silhouette is cheap — few draws', S.drawsFar <= 6, S.drawsFar + ' draws at distance');
  P('§24: the far silhouette is cheap — few triangles', S.triSilhouette < 150000,
    S.triSilhouette + ' silhouette triangles');
  P('§24: the near tier stays inside a hero object\'s budget', S.triangles < 280000,
    S.triangles + ' near (' + S.triSilhouette + ' silhouette + ' + S.triDetail + ' detail)');
  P('§24: detail is a real fraction of the cost, so dropping it is worth doing',
    S.triDetail > S.triangles * 0.25, S.triDetail + ' of ' + S.triangles);
  /* and the tier must actually TOGGLE — a budget split that never changes what is drawn is a
     comment, not a strategy. */
  const lod = await ev(async () => {
    const n = window.MAHWORLD_MAHPLAZA.mahNexus;
    const seen = g => g.children.filter(c => c.isMesh && c.visible && /-detail$/.test(c.name)).length;
    n.setDetail(200); const near = seen(n.group);
    n.setDetail(9000); const far = seen(n.group);
    n.setDetail(200);
    return { near, far, total: n.group.children.filter(c => /-detail$/.test(c.name)).length };
  });
  P('§24: the detail tier is actually dropped at distance',
    lod.total > 0 && lod.near === lod.total && lod.far === 0,
    lod.near + ' detail meshes near, ' + lod.far + ' far, of ' + lod.total);

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
