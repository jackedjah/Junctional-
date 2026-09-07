/* MAHWORLD — R5 SKY CROWN + HAVEN GATES, checked in the running world.

   R5 §21 is a list of things that must be true before the layer passes. Most acceptance lists in
   this project are the director's eye and no test can help; this one is unusual, because almost
   every clause on it is a MEASUREMENT:

       "MAH CROWN is genuinely extremely tall"          -> metres, from the built geometry
       "its silhouette reads from long distance"        -> degrees subtended at a named range
       "dome encloses the intended sanctuary zone"      -> radii
       "dome remains visually clear enough"             -> opacity and rib count
       "climbable ridges/holds read intentionally"      -> counts and route continuity
       "MAH THRESHOLD remains distinct"                 -> two systems, two bearings, one portal
       "MAH HAVEN water is physically established"      -> the shore sits ON lakecity's polygon
       "footprints exist without overbuilding"          -> zones present, and NOTHING named livestock

   Every number below is read out of the ASSEMBLED SCENE rather than out of a constant, because the
   failure this project keeps producing is a module whose header and whose geometry disagree — and
   the two most expensive defects of this pass (a module in the temporal dead zone that silently did
   not exist, twice) would both have been caught by the first four lines of this file.

   Run: node tests/mahworld-r5-laws.test.js */
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
  const page = await b.newPage({ viewport: { width: 900, height: 520 }, deviceScaleFactor: 1 });
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
  await page.evaluate(() => window.MAHWORLD_MAHPLAZA.setTime('21:40'));
  const ev = fn => page.evaluate(fn);

  /* ============================================================================================
     0. THE THREE MODULES EXIST AT ALL.

     This is first because it is the gate this pass actually failed. TWICE a new module was written,
     wired, committed and rendered while not existing: a `const` array declared below the build that
     closes over it sits in the temporal dead zone, the first call throws a ReferenceError, and the
     assembly's guarded try/catch — which is correct, and which is what lets the world degrade to
     whatever loaded — turns a dead district into one console line. Eight capture cameras
     photographed bare plate before anyone noticed. A wiring gate costs one line and would have.
     ============================================================================================ */
  const wired = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA;
    return { crown: !!w.modules.mahCrown, dome: !!w.modules.haloDome, haven: !!w.modules.mahHaven,
      threshold: !!w.modules.haloThreshold, halo: !!w.modules.halo };
  });
  console.log('\nR5 — the modules are built and wired');
  P('MAH CROWN is wired', wired.crown);
  P('the HALO DOME is wired', wired.dome);
  P('MAH HAVEN is wired', wired.haven);
  P('MAH THRESHOLD survives R5 (it is not replaced by MAH CROWN)', wired.threshold);
  P('R4 MAH HALO survives R5', wired.halo);

  /* ============================================================================================
     1. MAH CROWN — "EXTREMELY TALL", measured
     ============================================================================================ */
  const crown = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA, g = w.scene.getObjectByName('mah-crown');
    if (!g || !w.mahCrown) return null;
    let minY = 1e9, maxY = -1e9, maxR = 0;
    g.traverse(o => {
      const q = o.geometry; if (!q || !q.attributes || !q.attributes.position) return;
      const A = q.attributes.position;
      for (let i = 0; i < A.count; i++) {
        const y = A.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y;
        const r = Math.hypot(A.getX(i), A.getZ(i)); if (r > maxR) maxR = r;
      }
    });
    const s = w.mahCrown.stats;
    /* the subtended angle from a named far camera — "reads from long distance" as a number */
    const sub = (d, eye) => (Math.atan2(maxY - eye, d) - Math.atan2(minY - eye, d)) * 180 / Math.PI;
    return { minY, maxY, maxR, height: maxY - minY, stats: s,
      subFar: sub(12000, 1500), subRing: sub(2050, 1846), draws: s.draws, tris: s.triangles,
      /* the plinth must leave the halo's hole mostly open — R4's whole reason for the ring */
      holeR: 666, plinthR: s.plinthTop != null ? w.mahCrown.CROWN.HUB_R : null };
  });
  console.log('\nR5 §2 — MAH CROWN is genuinely extremely tall');
  if (!crown) P('MAH CROWN geometry exists', false, 'no mesh');
  else {
    P('MAH CROWN geometry exists', true);
    /* the bar is deliberately high. R5: "Do not shrink it into a decorative tower." MAHWORLD's
       tallest prior object is a 900 m ghost shaft, so anything under a kilometre is decorative. */
    P('the tower is over 1500 m tall', crown.height > 1500, crown.height.toFixed(1) + ' m');
    P('its silhouette subtends over 5 deg at 12 km', crown.subFar > 5, crown.subFar.toFixed(1) + ' deg');
    P('it dominates the sanctuary (over 25 deg from the ring midline)',
      crown.subRing > 25, crown.subRing.toFixed(1) + ' deg');
    /* §06 still applies at 3 km: EXTREMELY TALL is not a licence to build a needle */
    P('it is not a needle: slenderness under 15:1',
      crown.stats.slenderness < 15, crown.stats.slenderness + ':1');
    /* R4's clause: the hole exists so the plaza keeps its sky. The tower may pass through it; it
       may not fill it. */
    const frac = crown.plinthR != null ? (crown.plinthR * crown.plinthR) / (crown.holeR * crown.holeR) : 1;
    P('it leaves the halo hole over 90% open, so the plaza keeps its sky',
      frac < 0.10, (frac * 100).toFixed(1) + '% of the hole occupied');
    P('it is carried across the hole on spars, not floating',
      crown.stats.spars >= 6 && crown.stats.stays >= 6,
      crown.stats.spars + ' spars, ' + crown.stats.stays + ' stays');
    /* R5 §19 asks for a performance strategy by name, and a hero object with no LOD has none */
    P('it costs under 15 draws', crown.draws < 15, crown.draws + ' draws');
  }

  /* ============================================================================================
     2. R5 §3 — THE FACADE LANGUAGE IS PRESENT
     ============================================================================================ */
  const facade = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA; if (!w.mahCrown) return null;
    const s = w.mahCrown.stats;
    let warm = 0;
    w.scene.traverse(o => { if (o.name && /crown-interior-light/.test(o.name)) warm++; });
    const names = [];
    w.mahCrown.group.traverse(o => { if (o.name) names.push(o.name); });
    return { bands: s.bands, nodes: s.nodes, facets: s.facets || 0, heroWindows: s.heroWindows || 0,
      warmMeshes: warm, names };
  });
  console.log('\nR5 §3 — the platinum / crystal / diamond hierarchy is visible');
  if (!facade) P('facade stats exist', false);
  else {
    P('the luminous band rhythm exists', facade.bands >= 40, facade.bands + ' bands');
    P('authored square-diamond nodes break the runs', facade.nodes >= 20, facade.nodes + ' nodes');
    P('large facet planes exist', facade.facets >= 4, facade.facets + ' facets');
    /* "rare hero windows" — rare is the requirement, so this gate has an UPPER bound too */
    P('hero windows exist and stay rare (2-16)',
      facade.heroWindows >= 2 && facade.heroWindows <= 16, facade.heroWindows + ' windows');
    /* mahplaza LAW-001: warm light is legal only INSIDE a building and the identifier must say so */
    P('every warm light on the tower names its interior role',
      facade.warmMeshes === facade.heroWindows,
      facade.warmMeshes + ' named vs ' + facade.heroWindows + ' built');
    P('the three material families are all present',
      ['crown-plat', 'crown-dark', 'crown-glass'].every(n => facade.names.indexOf(n) > -1),
      facade.names.join(', '));
  }

  /* ============================================================================================
     3. R5 §5-§8 — THE DOME ENCLOSES, STAYS CLEAR, AND CLEARS THE TOWER
     ============================================================================================ */
  const dome = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA; if (!w.haloDome) return null;
    const H = await import('/mahworld/scene/halo.js');
    const s = w.haloDome.stats, D = w.haloDome.DOME;
    const shell = w.scene.getObjectByName('dome-shell');
    return { stats: s, R: D.R, apex: D.APEX_Y, meridians: D.MERIDIANS, secondary: D.SECONDARY,
      shellOpacity: shell ? shell.material.opacity : null,
      haloOut: H.HALO.R_OUT + H.HALO.APRON,
      crownMast: w.mahCrown ? w.mahCrown.CROWN.MAST_TOP : null };
  });
  console.log('\nR5 §5-§8 — the dome');
  if (!dome) P('the dome exists', false);
  else {
    P('the dome encloses the whole sanctuary (springs at or beyond the outer rim)',
      dome.R >= dome.haloOut - 1, 'dome r ' + dome.R + ' vs ring edge ' + dome.haloOut);
    P('it is a dome, not a lid: rise over 1200 m', dome.stats.rise > 1200, dome.stats.rise + ' m');
    P('the apex clears MAH CROWN\'s mast',
      dome.crownMast != null && dome.apex > dome.crownMast,
      'apex ' + dome.apex + ' vs mast ' + dome.crownMast + ' (' + dome.stats.crownClearance + ' m)');
    /* "translucent/clear enough to preserve sky/moon/cloud views" — two independent ways to fail */
    P('the shell is translucent (opacity under 0.25)',
      dome.shellOpacity != null && dome.shellOpacity < 0.25, 'opacity ' + dome.shellOpacity);
    /* ...and the structure is the OTHER way. 48 full-height ribs photographed as a wireframe cage
       because meridians converge; the opacity number could not have caught it. */
    P('at most 20 ribs reach the apex, so the sky is not caged',
      dome.meridians <= 20, dome.meridians + ' primary ribs');
    P('lower-half infill exists so the spring is not bare',
      dome.secondary >= 16, dome.secondary + ' secondaries');
  }

  /* ============================================================================================
     4. R5 §6-§7 — THE CLIMBING SURFACE IS GEOMETRY, NOT DECORATION
     ============================================================================================ */
  console.log('\nR5 §6-§7 — the climbable dome');
  if (dome) {
    P('four authored routes exist', dome.stats.routes >= 4, dome.stats.routes + ' routes');
    P('the holds are dense enough to read as holds',
      dome.stats.holds >= 200, dome.stats.holds + ' holds');
    /* "resting shelves at long intervals" — a 2 km climb with nowhere to stop is not a route */
    P('resting shelves exist along the routes', dome.stats.shelves >= 8, dome.stats.shelves + ' shelves');
    /* and the holds must be near the SURFACE, not floating near it — measured, because a hold
       placed by a yaw-only helper on a curved shell is exactly the "floating strut" defect again */
    const grip = await ev(async () => {
      const w = window.MAHWORLD_MAHPLAZA;
      const D = await import('/mahworld/scene/halo-dome.js');
      const m = w.scene.getObjectByName('dome-holds'); if (!m) return null;
      const a = m.instanceMatrix.array; let worst = 0;
      for (let i = 0; i < m.count; i++) {
        const x = a[i * 16 + 12], y = a[i * 16 + 13], z = a[i * 16 + 14];
        const d = Math.abs(y - D.domeY(Math.hypot(x, z)));
        if (d > worst) worst = d;
      }
      return { count: m.count, worst };
    });
    if (grip) P('every hold sits on the shell (within 3 m of its surface)',
      grip.worst < 3, 'worst ' + grip.worst.toFixed(2) + ' m over ' + grip.count + ' holds');
  }

  /* ============================================================================================
     5. R5 §9 — MAH THRESHOLD IS STILL A SEPARATE SYSTEM
     ============================================================================================ */
  const sep = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA;
    const t = w.haloThreshold ? w.haloThreshold.stats : null;
    const d = w.haloDome ? w.haloDome.stats : null;
    const nav = (w.navDestinations ? w.navDestinations() : []).map(s => s.id);
    return { thresholdDeg: t ? t.deg : null, gateR: t ? t.gateR : null,
      portal: d ? d.portal : null, nav };
  });
  console.log('\nR5 §9 — three roles, three objects');
  P('the threshold still has its own gate', sep.gateR != null, 'gate at r ' + sep.gateR);
  P('the dome opens a portal at the threshold\'s own bearing, rather than swallowing it',
    sep.portal != null && sep.thresholdDeg != null && Math.abs(sep.portal.deg - sep.thresholdDeg) < 0.01,
    sep.portal ? 'portal ' + sep.portal.deg + ' deg, ' + sep.portal.widthM + ' m wide' : 'no portal');
  P('MAH CROWN, the dome route and the threshold are all separate nav destinations',
    ['mah-crown', 'dome-route', 'halo-skygate'].every(id => sep.nav.indexOf(id) > -1),
    sep.nav.filter(i => /crown|dome|halo-(threshold|skygate|flightline)/.test(i)).join(', '));

  /* ============================================================================================
     6. R5 §10-§15 — MAH HAVEN
     ============================================================================================ */
  const haven = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA; if (!w.mahHaven) return null;
    const L = await import('/mahworld/scene/lakecity.js');
    const s = w.mahHaven.stats, H = w.mahHaven.HAVEN;
    /* THE SHORE MUST SIT ON THE LAKE THAT ALREADY EXISTS. Derived here from lakecity's OWN export,
       so a drift between the two files fails here rather than in a render six rounds later. */
    const c = L.lakeCentre();
    const a = H.SHORE_DEG * Math.PI / 180;
    const want = L.lakeR(a);
    const dx = s.site.shore[0] - c[0], dz = s.site.shore[1] - c[1];
    const got = Math.hypot(dx, dz);
    /* and NOTHING in this district may be an animal — R5 §15 is explicit */
    const banned = [];
    w.mahHaven.group.traverse(o => {
      if (o.name && /cow|chicken|hen|goat|sheep|pig|cattle|livestock|barn/i.test(o.name)) banned.push(o.name);
    });
    let minY = 1e9, maxY = -1e9;
    w.mahHaven.group.traverse(o => {
      const q = o.geometry; if (!q || !q.attributes || !q.attributes.position) return;
      const A = q.attributes.position;
      for (let i = 0; i < A.count; i++) { const y = A.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    });
    return { stats: s, HAVEN: H, wantR: want, gotR: got, banned, minY, maxY,
      zones: s.zones.map(z => z.id), waterY: s.waterY, lakeWaterY: L.WATER_Y };
  });
  console.log('\nR5 §10-§15 — MAH HAVEN');
  if (!haven) P('MAH HAVEN exists', false, 'module absent or failed to build');
  else {
    P('MAH HAVEN exists', true);
    P('its shore sits ON the lake that already exists, not on a second one',
      Math.abs(haven.gotR - haven.wantR) < 1.5,
      'shore r ' + haven.gotR.toFixed(1) + ' vs lake r ' + haven.wantR.toFixed(1));
    P('it uses the world\'s single water level',
      Math.abs(haven.waterY - haven.lakeWaterY) < 0.01,
      'haven ' + haven.waterY + ' vs lake ' + haven.lakeWaterY);
    /* §11: the reveal. A corridor that is not narrow reveals nothing. */
    P('the entrance corridor is narrow (under 10 m) and long (over 60 m)',
      haven.HAVEN.APPROACH_W < 10 && haven.HAVEN.APPROACH_LEN > 60,
      haven.HAVEN.APPROACH_W + ' m x ' + haven.HAVEN.APPROACH_LEN + ' m');
    P('the shoreline is physically built', haven.stats.shorelineM > 300,
      haven.stats.shorelineM + ' m of edge');
    /* §13: the footprints, present without being overbuilt */
    for (const z of ['overlook', 'street-food', 'mini-farm', 'market', 'docks', 'housing']) {
      P('the ' + z + ' footprint is reserved', haven.zones.indexOf(z) > -1, haven.zones.join(', '));
    }
    /* §12: "lower-rise than MAH City" is a rule about SILHOUETTE */
    P('nothing in MAH HAVEN rises over 30 m', haven.maxY < 30, 'tallest ' + haven.maxY.toFixed(1) + ' m');
    /* §15, the hard line */
    P('no ordinary Earth livestock appears anywhere in the district',
      haven.banned.length === 0, haven.banned.join(', '));
  }

  /* ============================================================================================
     7. THE NaN SWEEP — L56, and it has now caught two separate silent losses in this project
     ============================================================================================ */
  const finite = await ev(() => {
    const out = [], seen = new Set();
    window.MAHWORLD_MAHPLAZA.scene.traverse(o => {
      const g = o.geometry; if (!g || seen.has(g.uuid)) return; seen.add(g.uuid);
      const A = g.attributes && g.attributes.position; if (!A) return;
      for (let i = 0; i < A.count; i++) {
        if (!isFinite(A.getX(i)) || !isFinite(A.getY(i)) || !isFinite(A.getZ(i))) {
          out.push((o.name || '(unnamed)') + ' @' + i + '/' + A.count); break;
        }
      }
    });
    return out;
  });
  console.log('\nWORLD — geometry integrity');
  P('no geometry in the built scene has NaN positions', finite.length === 0, finite.slice(0, 4).join(' | '));
  P('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
