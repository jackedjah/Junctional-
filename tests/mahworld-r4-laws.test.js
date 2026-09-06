/* MAHWORLD — R4 MAH HALO GATES, checked in the running world.

   R4's activation makes MAH HALO permanent canon, and most of what it asks for is a matter of the
   director's eye — whether the sanctuary feels calm, whether the laser plating reads as premium,
   whether an arrival feels like an arrival. Those are judged from renders and this file cannot help.

   What it CAN do is hold the clauses that are TRUE OR FALSE about the assembled scene, and R4 has
   an unusual number of them because its central claim is GEOMETRIC:

       "appears locally flat but reveals gradual world-scale curvature at immense distance"

   That is a curvature ladder, and a curvature ladder is arithmetic. If the deviation at 50 m is not
   small enough to read as flat under a walking eye, the local claim is false; if the deviation at
   3 km is not large enough to read as an arc, the global claim is false. Both are measured here from
   the module's OWN height function, so the numbers in the spec and the numbers in the world cannot
   drift apart silently — which is exactly the failure class this project keeps producing.

   The other four are wiring gates: a system that is built and unwired is this codebase's most
   frequent defect, and every one of MAH HALO's parts (the surface, the districts, the walking
   contract, the dock, the nav entries) is invisible from a render if the assembly never called it.

   Run: node tests/mahworld-r4-laws.test.js */
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
  await page.waitForFunction(() => window.MAHWORLD_MAHPLAZA && window.MAHWORLD_MAHPLAZA.state.frames > 2, null, { timeout: 400000 });
  await page.evaluate(() => window.MAHWORLD_MAHPLAZA.setTime('21:40'));
  const ev = fn => page.evaluate(fn);

  /* ============================================================================================
     1. THE SURFACE EXISTS AND IS WIRED
     ============================================================================================ */
  const core = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA;
    const H = await import('/mahworld/scene/halo.js');
    const D = await import('/mahworld/scene/halo-districts.js');
    let inScene = 0, names = [];
    w.scene.traverse(o => { if (o.name && /^halo/.test(o.name)) { inScene++; if (names.length < 40) names.push(o.name); } });
    return {
      haloWired: !!w.modules.halo, districtsWired: !!w.modules.haloDistricts,
      HALO: H.HALO, DISTRICTS: D.DISTRICTS.map(d => d.id),
      haloStats: w.halo ? w.halo.stats : null,
      dStats: w.haloDistricts ? w.haloDistricts.stats : null,
      inScene, names
    };
  });
  console.log('\nMAH HALO — the surface');
  P('halo.js is built and in the scene', core.haloWired && core.inScene > 0, 'wired=' + core.haloWired + ' objects=' + core.inScene);
  P('halo-districts.js is built and in the scene', core.districtsWired, 'wired=' + core.districtsWired);
  P('all eight R4 districts are present',
    core.DISTRICTS.length === 8 && ['arrival', 'commons', 'pulse', 'table', 'play', 'quiet', 'forum', 'stage'].every(id => core.DISTRICTS.indexOf(id) >= 0),
    core.DISTRICTS.join(','));
  P('every district actually emitted parts',
    !!core.dStats && core.dStats.districts.length === 8 && core.dStats.triangles > 20000,
    core.dStats ? core.dStats.districts.length + ' districts, ' + Math.round(core.dStats.triangles) + ' tris' : 'no stats');

  /* ============================================================================================
     2. THE CURVATURE LADDER — R4's central geometric claim
     "appears locally flat but reveals gradual world-scale curvature at immense distance"

     Measured as the DROP of the shell away from the tangent plane at the midline, which is the
     deviation an eye standing there actually sees. Because the cross-section is a parabola of
     radius R_DISH, that drop over a distance d is exactly d^2 / (2 * R_DISH).
     ============================================================================================ */
  /* THERE ARE TWO CURVATURES AND THE FIRST CUT OF THIS TEST CONFLATED THEM, which is worth saying
     plainly because it failed the world for the test's own arithmetic:

       DISH   the cross-section, ACROSS the ring's 2700 m width. A parabola of radius R_DISH, so the
              drop from the tangent plane at distance d is d^2 / (2 * R_DISH). This is what a viewer
              standing still and looking left-right across the band sees.
       RING   the plan curvature, AROUND the world axis at radius R_MID. The sagitta of an arc of
              length s is R_MID * (1 - cos(s / (2 * R_MID))). This is what a viewer looking ALONG
              the ring sees — the horizon bending away — and it is the larger of the two by a factor
              of nearly three at 3 km.

     R4's claim ("appears locally flat but reveals gradual world-scale curvature at immense
     distance") is made by both, so both are asserted, each against its own number. */
  const lad = await ev(async () => {
    const H = await import('/mahworld/scene/halo.js');
    const dish = d => H.haloHeight(H.HALO.R_MID + d, 0) - H.HALO.Y;
    const ring = s => H.HALO.R_MID * (1 - Math.cos(s / (2 * H.HALO.R_MID)));
    const D = [50, 150, 300, 1000, 3000];
    return {
      dish: D.map(dish), ring: D.map(ring), at: D,
      rim: H.haloHeight(H.HALO.R_OUT, 0) - H.HALO.Y,
      /* the worst walkable grade, as a percentage: dy/dd at the rim */
      grade: 100 * (H.HALO.R_OUT - H.HALO.R_MID) / H.HALO.R_DISH,
      /* what the module itself publishes, so the spec and the world cannot drift apart */
      published: (window.MAHWORLD_MAHPLAZA.halo || {}).stats
        ? window.MAHWORLD_MAHPLAZA.halo.stats.curvature : null
    };
  });
  console.log('\nMAH HALO — the curvature ladder');
  console.log('  across the ring (DISH):  ' + lad.at.map((d, i) => d + 'm ' + lad.dish[i].toFixed(2)).join('   '));
  console.log('  along  the ring (RING):  ' + lad.at.map((d, i) => d + 'm ' + lad.ring[i].toFixed(2)).join('   '));
  console.log('  rim rise ' + lad.rim.toFixed(1) + ' m   worst grade ' + lad.grade.toFixed(2) + '%');
  /* LOCALLY FLAT: at 50 m — the width of a district terrace — the drop must be under a step in BOTH
     directions, or the ring reads as a dish from where a person stands and the premise is broken. */
  P('locally flat across the ring: under 0.25 m at 50 m', lad.dish[0] < 0.25, lad.dish[0].toFixed(3) + ' m');
  P('locally flat along the ring: under 0.25 m at 50 m', lad.ring[0] < 0.25, lad.ring[0].toFixed(3) + ' m');
  P('still near-flat at 150 m in both directions', lad.dish[1] < 2 && lad.ring[1] < 2,
    'dish ' + lad.dish[1].toFixed(2) + ' / ring ' + lad.ring[1].toFixed(2));
  /* GRADUAL: monotonic, and ACCELERATING in the only sense that is well defined across unequal
     steps — the deviation PER METRE strictly increases. (The first cut compared ratios of ratios
     over 3x and 3.33x steps, which a perfect parabola fails; that was the test being wrong.) */
  const slope = a => a.map((v, i) => v / lad.at[i]);
  const rising = a => { const s = slope(a); return s.every((v, i) => i === 0 || v > s[i - 1]); };
  P('the dish ladder is monotonic and accelerating', rising(lad.dish), slope(lad.dish).map(v => v.toFixed(4)).join(' < '));
  P('the ring ladder is monotonic and accelerating', rising(lad.ring), slope(lad.ring).map(v => v.toFixed(4)).join(' < '));
  /* CURVED AT WORLD SCALE: at 3 km the deviation must dwarf anything else in the world, or
     "world-scale curvature" is a claim no camera can photograph. city.js's tallest ghost is 900 m
     and terrain.js's highest peak is 370. */
  P('world-scale curvature along the ring: over 300 m at 3 km', lad.ring[4] > 300, lad.ring[4].toFixed(1) + ' m');
  P('world-scale curvature across the ring: over 150 m at 3 km', lad.dish[4] > 150, lad.dish[4].toFixed(1) + ' m');
  /* and the module's PUBLISHED figure must be the ring one, since that is what the spec quotes */
  P('halo.js publishes the ring curvature it claims',
    !!lad.published && Math.abs(lad.published.arc3000.deviation - lad.ring[4]) < 1,
    lad.published ? String(lad.published.arc3000.deviation) : 'not published');
  /* AND IT MUST STILL BE WALKABLE: over ~8% and the rim rise is a hill, not a floor. */
  P('the worst grade is walkable (under 8%)', lad.grade > 0 && lad.grade < 8, lad.grade.toFixed(2) + '%');

  /* ============================================================================================
     3. THE WALKING CONTRACT — a sanctuary you cannot stand on is a backdrop
     ============================================================================================ */
  const walk = await ev(async () => {
    const H = await import('/mahworld/scene/halo.js');
    const R = await import('/mahworld/scene/roam.js');
    const w = window.MAHWORLD_MAHPLAZA;
    return {
      overPlaza: H.haloFloor(0, 0),                       /* must be null — the hole */
      onRing: H.haloFloor(0, -H.HALO.R_MID),              /* must be ~Y */
      beyond: H.haloFloor(0, -(H.HALO.R_OUT + 400)),      /* must be null — open sky */
      innerLip: H.haloFloor(0, -(H.HALO.R_IN + 5)),
      roamCeil: R.ROAM.CEIL, haloCeil: H.HALO.CEIL,
      bounds: w.roam ? { ceil: w.roam.bounds.ceil, highY: w.roam.bounds.highY, highR: w.roam.bounds.highR } : null
    };
  });
  console.log('\nMAH HALO — the walking contract');
  P('the hole over MAHPLAZA is open (haloFloor === null)', walk.overPlaza === null, String(walk.overPlaza));
  P('the ring is a floor at the authored altitude', walk.onRing !== null && Math.abs(walk.onRing - core.HALO.Y) < 1, String(walk.onRing));
  P('the sky beyond the outer rim is open', walk.beyond === null, String(walk.beyond));
  P('the inner lip is walkable', walk.innerLip !== null, String(walk.innerLip));
  /* the bound is only real if the ASSEMBLY raised it: roam's own default ceiling is still 700, and a
     surface the flyer is clamped 1100 m below is a surface nobody reaches. */
  P('the assembly raised roam\'s ceiling above the ring',
    !!walk.bounds && walk.bounds.ceil >= core.HALO.Y + 200 && walk.bounds.highR > core.HALO.R_OUT,
    JSON.stringify(walk.bounds) + ' (roam default ceil ' + walk.roamCeil + ')');
  /* and the integrator has to HONOUR it — a bound stored and never read is this project's own
     recurring defect (L47: ctx fields accepted and silently ignored). So fly there and measure. */
  const reach = await ev(async () => {
    const H = await import('/mahworld/scene/halo.js');
    const w = window.MAHWORLD_MAHPLAZA;
    if (!w.navGoto) return { navGoto: false };
    const ok = w.navGoto('halo-arrival');
    w.advance(1.5, 1 / 30);                       /* let the walker settle onto the curved deck */
    const r = w.roam.state;
    return { navGoto: ok, mode: r.mode, y: +r.y.toFixed(2),
      radius: +Math.hypot(r.x, r.z).toFixed(1), want: +H.HALO.R_MID.toFixed(1),
      floor: +(H.haloHeight(r.x, r.z)).toFixed(2) };
  });
  P('MAH NAV can reach a HALO district', reach.navGoto === true, JSON.stringify(reach));
  /* THE ONE THAT CATCHES THE WHOLE CLASS: WALK_R is 95 m and the ring is at 2050. If roam's ground
     bound still applied, this walker would have been yanked to the plaza on the first step. */
  P('a walker stays on the ring instead of being pulled to the plaza',
    reach.radius > core.HALO.R_IN && Math.abs(reach.radius - reach.want) < 120,
    'r=' + reach.radius + ' want~' + reach.want);
  P('the walker stands ON the curved deck, not in it or above it',
    Math.abs(reach.y - (reach.floor + 1.70)) < 0.4, 'eye ' + reach.y + ' vs floor ' + reach.floor + ' + 1.70');

  /* ============================================================================================
     4. THE ASCENT DOCKS — R4: "Ascent shafts and FOBEAMS physically dock into HALO ARRIVAL"
     ============================================================================================ */
  const dock = await ev(async () => {
    const H = await import('/mahworld/scene/halo.js');
    const A = await import('/mahworld/scene/mahascent.js');
    const w = window.MAHWORLD_MAHPLAZA;
    const sites = w.mahAscent ? w.mahAscent.stats.sites : null;
    const d = w.haloDistricts ? w.haloDistricts.stats : null;
    /* the rake: horizontal run against vertical climb, from the transfer decks to the pier at r 760 */
    let rake = null;
    if (sites && sites.length) {
      const s = sites[0];
      const run = Math.abs((H.HALO.R_IN + 60) - Math.hypot(s.x, s.z));
      const climb = H.haloHeight(0, -(H.HALO.R_IN + 60)) - s.y;
      rake = { run: +run.toFixed(1), climb: +climb.toFixed(1), deg: +(Math.atan2(run, climb) * 180 / Math.PI).toFixed(1) };
    }
    return { sites, beams: d ? d.dockBeams : 0, spine: d ? d.spine : null, deckY: A.ASCENT.DECK_Y, rake };
  });
  console.log('\nMAH HALO — the ascent dock');
  P('mahascent publishes its transfer decks', !!dock.sites && dock.sites.length === 3, JSON.stringify(dock.sites && dock.sites.length));
  P('one dock beam per transfer deck', dock.beams === (dock.sites ? dock.sites.length : -1), 'beams=' + dock.beams);
  P('the rake is a cable-car angle, not a wire (25-45 deg off vertical)',
    !!dock.rake && dock.rake.deg > 25 && dock.rake.deg < 45, JSON.stringify(dock.rake));
  /* R3's density law applied to R4's own geometry: the 1200 m between the pier and the district is
     authored, not empty. A spine with no bays is the unbuilt defect that clause names. */
  P('the concourse spine crosses the gap to ARRIVAL',
    !!dock.spine && dock.spine.length > 900 && dock.spine.bays >= 8, JSON.stringify(dock.spine));

  /* ============================================================================================
     5. PEACEFULNESS — R4: "no random hostile spawns... in ordinary districts"
     Asserted rather than intended: "we did not add any" is exactly the sort of thing that stops
     being true in six months, and the halo is 1800 m above every territory mahbeasts.js owns.
     ============================================================================================ */
  const peace = await ev(async () => {
    const H = await import('/mahworld/scene/halo.js');
    const w = window.MAHWORLD_MAHPLAZA;
    const terr = w.beasts && w.beasts.stats ? w.beasts.stats.territories : [];
    return {
      declared: w.haloDistricts ? w.haloDistricts.stats.hostiles : null,
      onHalo: terr.filter(t => H.onHalo(t.x, t.z) && Math.abs((t.y || 0) - H.HALO.Y) < 200).length,
      highest: terr.reduce((m, t) => Math.max(m, t.y || 0), 0),
      count: terr.length
    };
  });
  console.log('\nMAH HALO — peacefulness');
  P('the sanctuary declares zero hostiles', peace.declared === 0, String(peace.declared));
  P('no MAHBEAST territory stands on the ring', peace.onHalo === 0, peace.onHalo + ' of ' + peace.count);

  /* ============================================================================================
     6. THE DOWNWARD VIEWS — R4: "Preserve dramatic overlooks... Preserve downward world views"
     ============================================================================================ */
  console.log('\nMAH HALO — the views down');
  P('overlooks are cut into the rim', !!core.dStats && core.dStats.overlooks >= 8, String(core.dStats && core.dStats.overlooks));
  P('LAW 2 is answered ON the ring, not on the plaza deck',
    !!core.dStats && core.dStats.pools > 8, 'pools=' + (core.dStats && core.dStats.pools));

  /* ============================================================================================
     7. THE BUDGET — a sanctuary that halves the frame rate is not shippable
     ============================================================================================ */
  const budget = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA;
    /* ROAM MUST BE OFF FIRST. The nav check above called navGoto, which turns roam ON — and while
       roam is on, placeCamera() uses roam's own position and IGNORES setCustomView entirely. The
       first cut of this check did not do this, so both measurements were taken from the same roam
       camera standing at HALO ARRIVAL and came back byte-identical (309 draws / 382154 tris for
       "the ring" and "the plaza" alike), which is exactly the shape of a passing test that measures
       nothing. */
    if (w.roam && w.roam.state.on) w.setRoam(false);
    w.setCustomView({ pos: [0, 1801.7, -2010], look: [400, 1802, -2100], fov: 56 });
    w.advance(0.3, 1 / 30);
    const a = { d: w.renderer.info.render.calls, t: w.renderer.info.render.triangles };
    w.setCustomView({ pos: [0, 3.4, 84], look: [0, 14, -40], fov: 54 });
    w.advance(0.3, 1 / 30);
    const b = { d: w.renderer.info.render.calls, t: w.renderer.info.render.triangles };
    return { halo: a, plaza: b, distinct: !(a.d === b.d && a.t === b.t) };
  });
  console.log('\nMAH HALO — budget');
  console.log('  on the ring: ' + budget.halo.d + ' draws / ' + budget.halo.t + ' tris');
  console.log('  on the plaza: ' + budget.plaza.d + ' draws / ' + budget.plaza.t + ' tris');
  /* the guard on the guard: if the two frames are identical the camera never moved and neither
     assertion below means anything (see the note in the probe) */
  P('the two budget frames are actually different cameras', budget.distinct,
    budget.halo.d + '/' + budget.halo.t + ' vs ' + budget.plaza.d + '/' + budget.plaza.t);
  P('the sanctuary costs under 400 draws from a standing eye', budget.halo.d < 400, String(budget.halo.d));
  P('the plaza view still draws the whole city', budget.plaza.d > 900 && budget.plaza.t > 900000,
    budget.plaza.d + ' draws / ' + budget.plaza.t + ' tris');

  /* ============================================================================================
     8. THE NaN SWEEP — L56. A mesh whose positions are NaN does not error, does not warn twice, and
     does not draw: `halo-rims` lost all 205,824 of its vertices to one undefined scale argument and
     the only trace was a single console line at the end of a capture. This walks every geometry in
     the built scene and names the first one that is not finite, which is how it was found.
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
