/* MAHWORLD — R3 SYSTEM GATES, checked in the running world.

   docs/MAHWORLD_R3_MASTER_IMPLEMENTATION_SPEC.md is a work contract, and a contract nobody measures
   is a wish. These checks turn its mechanically-testable clauses into a build gate — the ones that
   are TRUE OR FALSE about the assembled scene, not the ones that are the director's eye.

   What this file deliberately does NOT claim: it cannot tell you the forest looks alive, that the
   arrival district reads as premium, or that a MAH DESCENT entrance feels like it goes somewhere.
   Those are judged from renders. What it CAN do is catch the class of failure this project keeps
   producing — a system that is built and unwired, a spec number that drifted, a fix to one caller
   that was never walked to the others, an LOD that quietly stopped restoring what it hid.

   Run: node tests/mahworld-r3-laws.test.js */
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
     R3-06 · MAH ASCENT COMPLETES ITS DESTINATION
     "The current vertical beams/elevators must not stop visually in the lower atmosphere."
     ============================================================================================ */
  const asc = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA;
    const A = await import('/mahworld/scene/mahascent.js');
    const C = await import('/mahworld/scene/clouds.js');
    const F = await import('/mahworld/scene/fobeam.js');
    /* clouds.js keeps its LAYOUT private, so read the highest cloud altitude the module reports if
       it exposes one, and fall back to the published constant. The check that matters is relative. */
    let names = []; w.scene.traverse(o => { if (o.name && /ascent/.test(o.name)) names.push(o.name); });
    return {
      wired: !!w.modules.mahAscent,
      deckY: A.ASCENT.DECK_Y, threshold: A.ASCENT.THRESHOLD,
      lineTops: F.ASCENTS.map(a => a.h),
      stats: w.mahAscent ? w.mahAscent.stats : null,
      names
    };
  });
  P('R3-06-A mahascent.js is BUILT AND IN THE SCENE (a module that never renders is not a feature)',
    asc.wired && asc.names.length > 0, 'objects: ' + asc.names.length);
  P('R3-06-B every ascent line continues to ONE shared arrival altitude',
    !!asc.stats && Object.values(asc.stats.tops || {}).length === asc.lineTops.length
    && Object.values(asc.stats.tops || {}).every(t => t.now === asc.deckY),
    JSON.stringify(asc.stats && asc.stats.tops));
  P('R3-06-C the arrival deck stands ABOVE the cloud aperture, and the aperture above the weather',
    asc.deckY > asc.threshold && asc.threshold > 560,
    'deck ' + asc.deckY + ' > aperture ' + asc.threshold + ' > cloud top 560');
  P('R3-06-D no line stops in the lower atmosphere any more (the shortest was 468 m)',
    Math.min(...asc.lineTops) < asc.deckY && asc.deckY >= 700,
    'shortest line ' + Math.min(...asc.lineTops) + ' -> ' + asc.deckY);
  P('R3-06-E the three decks are joined, so they read as ONE district',
    !!asc.stats && asc.stats.bridges >= 3, 'bridges ' + (asc.stats && asc.stats.bridges));

  /* ---- THE RANK ---------------------------------------------------------------------------
     Three verticals at one brightness are not a hierarchy of ascent lines; they are three bars
     ruled through the frame. ASCENTS.w is the only per-line intensity control that exists (h scales
     the geometry, pod scales the vehicle, and all three columns share one material at one opacity),
     and it is read by TWO modules — fobeam's ground columns and mahascent's upper continuation. So
     the table is checked, and then the place the sky half actually consumes it is checked, because a
     rank that lives only in a table is a comment. */
  const rank = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA;
    const F = await import('/mahworld/scene/fobeam.js');
    let up = null; w.scene.traverse(o => { if (o.name === 'ascent-upper-core') up = o; });
    return {
      table: F.ASCENTS.map(a => ({ id: a.id, h: a.h, w: a.w })),
      upper: up && up.instanceColor ? Array.from({ length: up.count }, (_, i) => up.instanceColor.getX(i)) : null
    };
  });
  const ws = rank.table.map(a => a.w);
  P('R3-06-F every ascent line carries a RANK, and no two lines share one',
    ws.length > 0 && ws.every(v => typeof v === 'number' && v > 0) && new Set(ws).size === ws.length,
    JSON.stringify(ws));
  P('R3-06-G exactly ONE line is the hero, and the rank order follows the height order',
    ws.filter(v => v >= 1).length === 1
    && rank.table.slice().sort((a, b) => b.w - a.w).map(a => a.h)
       .every((h, i, arr) => i === 0 || arr[i - 1] >= h),
    JSON.stringify(rank.table));
  P('R3-06-H the rank REACHES the sky half, not just the ground half',
    !!rank.upper && rank.upper.length === ws.length && rank.upper.every((v, i) => Math.abs(v - ws[i]) < 1e-3),
    'upper instanceColor ' + JSON.stringify(rank.upper));

  /* ---- THE ELEVATOR HAS DOORS ---------------------------------------------------------------
     "Let's start enhancing that elevator thing more so that there's doors." A door on a vehicle is
     three claims, and each one has failed once already in this module's history, so each is checked
     rather than trusted:
       · the APERTURE is a real hole in the hull, not a panel drawn on it. The first cut lofted the
         aperture's own cells inset and called it a reveal — which builds a blanking plate across
         the opening, so the door was never open at all and two rounds of lighting work went into
         making a closed panel look like a doorway. The hull's triangle count is the evidence: cells
         removed from a loft cannot be faked.
       · the CABIN exists behind it, because a hole with nothing behind it culls straight through to
         the far side of the world.
       · the LEAVES actually MOVE, and move in time with the departure rather than at random. */
  const door = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA, F = w.fobeams;
    const grab = n => { let m = null; w.scene.traverse(o => { if (o.name === n) m = o; }); return m; };
    const tris = m => m ? (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 : 0;
    const names = ['ascent-pod-shell', 'ascent-pod-cabin', 'ascent-pod-fittings', 'ascent-pod-door-a', 'ascent-pod-door-b', 'ascent-pod-door-glow'];
    const got = {}; names.forEach(n => { const m = grab(n); got[n] = m ? { tris: tris(m), count: m.count } : null; });
    /* walk a whole cycle and record, per line, the extremes of `door` and whether it was ever open
       while no car was on the line — the one state that would be a door hanging in empty air */
    const seen = (F.ascentLines || []).map(L => ({ id: L.id, max: 0, openWithNoPod: 0 }));
    for (let k = 0; k < 40; k++) {
      w.advance(3, 1 / 30);
      (F.ascentLines || []).forEach((L, i) => {
        const d = L.door || 0;
        if (d > seen[i].max) seen[i].max = d;
        if (d > 0.02 && L.podOn < 0.02) seen[i].openWithNoPod++;
      });
    }
    return { meshes: got, seen };
  });
  const dm = door.meshes;
  P('R3-06-I the ascent car carries a doorway: two leaves, a cabin and a lit sill, all instanced',
    !!dm['ascent-pod-door-a'] && !!dm['ascent-pod-door-b'] && !!dm['ascent-pod-cabin'] &&
    !!dm['ascent-pod-fittings'] && !!dm['ascent-pod-door-glow'] &&
    dm['ascent-pod-door-a'].count === ws.length,
    JSON.stringify(dm));
  P('R3-06-J the aperture is a HOLE in the hull, and there is a lined cabin behind it',
    !!dm['ascent-pod-shell'] && !!dm['ascent-pod-cabin'] &&
    dm['ascent-pod-shell'].tris < 360 && dm['ascent-pod-cabin'].tris > 60,
    'hull ' + (dm['ascent-pod-shell'] && dm['ascent-pod-shell'].tris) +
    ' tris (a whole 16x10 loft with caps is 352), cabin ' + (dm['ascent-pod-cabin'] && dm['ascent-pod-cabin'].tris));
  P('R3-06-K every car opens its doors somewhere in the cycle',
    door.seen.length > 0 && door.seen.every(s => s.max > 0.9),
    JSON.stringify(door.seen.map(s => s.id + ' max ' + s.max.toFixed(2))));
  P('R3-06-L and no line ever holds a door open with no car on it',
    door.seen.every(s => s.openWithNoPod === 0),
    JSON.stringify(door.seen.map(s => s.id + ' ' + s.openWithNoPod)));

  /* ---- THE SUN AND THE MOON ON THE FLOOR -----------------------------------------------------
     "The floor is platinum, so it has that reflective property, so it corresponds with how the sun
     and the moon are moving with the time of day."
     THIS FEATURE FAILED SILENTLY TWICE BEFORE IT WORKED, in two different ways, and both are the
     reason these checks exist rather than a render:
       1. mahplaza's mirror patch assigned onBeforeCompile flatly instead of chaining, which deleted
          the path from the four PLAZA grades while leaving it on the two outer rings. The world
          looked fine. The hero floor had no path at all.
       2. The path was injected before <opaque_fragment>, which is the chunk that ASSIGNS
          gl_FragColor, so it was computed and immediately overwritten — while every "did the
          replace match" flag reported success, because the replace HAD matched.
     So: the patch is on every ground surface, every one of its four replaces matched, and the
     direction it points actually changes with the clock and hands over between the two bodies. */
  const cel = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA;
    const S = await import('/mahworld/scene/materials.js');
    const mats = [], seen = new Set();
    w.scene.traverse(o => {
      if (!o.isMesh || !o.material) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (!m || !m.userData || !m.userData.mahCelestial || seen.has(m.uuid)) continue;
        seen.add(m.uuid);
        mats.push({ mesh: o.name || '?', applied: m.userData.mahCelestial.applied });
      }
    });
    /* read the live direction at two hours that are certainly on opposite sides of the handover */
    const sample = (t) => { w.setTime(t); w.advance(0.2, 1 / 30); const c = S.setCelestialPath();
      return { d: [c.dir.x, c.dir.y, c.dir.z], col: c.color.getHexString(),
               sky: c.uniforms.length ? c.uniforms[0].uCelSky.value : null }; };
    const night = sample('23:00'), noon = sample('12:00');
    return { mats, night, noon, n: mats.length };
  });
  const allLanded = cel.mats.length > 0 && cel.mats.every(m =>
    m.applied && m.applied.vDecl && m.applied.vWrite && m.applied.fDecl && m.applied.fApply);
  P('R3-08-A every ground surface in the world carries the celestial path, all four replaces matched',
    allLanded && cel.n >= 6,
    cel.n + ' surfaces: ' + JSON.stringify(cel.mats.map(m => m.mesh)));
  const moved = Math.hypot(cel.night.d[0] - cel.noon.d[0], cel.night.d[1] - cel.noon.d[1], cel.night.d[2] - cel.noon.d[2]);
  P('R3-08-B the path MOVES with the clock rather than sitting at a fixed bearing',
    moved > 0.5, 'direction moved ' + moved.toFixed(3) + ' between 23:00 and 12:00');
  P('R3-08-C and the two bodies hand over: the night path is not the colour of the day path',
    cel.night.col !== cel.noon.col,
    'night #' + cel.night.col + ' vs noon #' + cel.noon.col);
  P('R3-08-D the day sky holds the path back rather than letting it blow the deck out',
    cel.noon.sky != null && cel.noon.sky < cel.night.sky,
    'sky factor noon ' + cel.noon.sky + ' < night ' + cel.night.sky);

  /* ============================================================================================
     R3-07 · MAH DESCENT
     ============================================================================================ */
  const des = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA;
    const D = await import('/mahworld/scene/mahdescent.js');
    const doors = [];
    w.scene.traverse(o => { if (o.name && /^descent-door-/.test(o.name)) doors.push({ n: o.name, y: o.position.y }); });
    return {
      wired: !!w.modules.mahDescent,
      H: D.DESCENT.H, mult: D.DESCENT.H / 2.0, openR: D.DESCENT.OPEN_R, shaft: D.DESCENT.SHAFT_D,
      stats: w.mahDescent ? w.mahDescent.stats : null,
      doors
    };
  });
  P('R3-07-A mahdescent.js is BUILT AND IN THE SCENE', des.wired && des.doors.length > 0,
    'doors: ' + des.doors.length);
  P('R3-07-B at least THREE obvious entrances across the big world',
    !!des.stats && des.stats.entrances >= 3, 'entrances ' + (des.stats && des.stats.entrances));
  P('R3-07-C the entrance is approximately 5x canonical MAHBEING height',
    Math.abs(des.mult - 5) < 0.6, des.H + ' m = ' + des.mult.toFixed(2) + 'x a 2.0 m MAHBEING');
  P('R3-07-D there is VISIBLE DEPTH beneath the threshold, not a painted door',
    des.shaft >= 12, 'shaft descends ' + des.shaft + ' m');
  /* the door is the one part of R3-07 that is behaviour rather than geometry: it must RISE on
     approach and FALL when the viewer leaves, and both directions have to be checked — a door
     stuck open passes a one-sided test and is still broken */
  const doorTravel = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA, m = w.mahDescent;
    if (!m) return null;
    const site = m.stats.sites[0];
    const rest = [];
    w.scene.traverse(o => { if (o.name && /^descent-door-/.test(o.name)) rest.push(o); });
    const door = rest[0];
    const y0 = door.position.y;
    /* far away: settle, then measure */
    m.setEye(site.x + 400, 1.7, site.z + 400);
    for (let i = 0; i < 200; i++) m.update(i / 60, 1 / 60);
    const closed = door.position.y;
    /* inside the proximity radius: settle, then measure */
    m.setEye(site.x + 6, 1.7, site.z + 6);
    for (let i = 0; i < 200; i++) m.update(i / 60, 1 / 60);
    const open = door.position.y;
    /* and back out again, so a door that only ever opens cannot pass */
    m.setEye(site.x + 400, 1.7, site.z + 400);
    for (let i = 0; i < 200; i++) m.update(i / 60, 1 / 60);
    const reclosed = door.position.y;
    return { y0, closed, open, reclosed };
  });
  P('R3-07-E the door RISES on approach', !!doorTravel && doorTravel.open - doorTravel.closed > 3.0,
    doorTravel && (doorTravel.closed.toFixed(2) + ' -> ' + doorTravel.open.toFixed(2)));
  P('R3-07-F and FALLS again when the viewer leaves (a door stuck open is still broken)',
    !!doorTravel && Math.abs(doorTravel.reclosed - doorTravel.closed) < 0.25,
    doorTravel && (doorTravel.open.toFixed(2) + ' -> ' + doorTravel.reclosed.toFixed(2)));

  /* ============================================================================================
     R3-04 · THE FOREST HIERARCHY, and R3-13 · THE LOD THAT PAYS FOR IT
     ============================================================================================ */
  const forest = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA, f = w.rainforest;
    if (!f) return null;
    const d = f.stats.derived || {};
    const names = [];
    w.scene.traverse(o => { if (o.name && /^forest-/.test(o.name)) names.push(o.name); });
    return { mass: d.canopyMass, detail: d.canopyDetail, nodes: d.canopyNodes, names };
  });
  P('R3-04-A the canopy carries all four hierarchy levels, not two',
    !!forest && forest.nodes >= 4000, 'canopy nodes ' + (forest && forest.nodes));
  P('R3-04-B landmark and detail nodes are SEPARATED, so the far tier is possible at all',
    !!forest && forest.mass > 0 && forest.detail > forest.mass,
    'mass ' + (forest && forest.mass) + ' / detail ' + (forest && forest.detail));
  P('R3-13-A the detail geometry bakes into its own meshes (steepD/bandD/downD)',
    !!forest && forest.names.filter(n => /D$/.test(n)).length === 3,
    (forest && forest.names.join(' ')) || '');
  const lod = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA, f = w.rainforest;
    if (!f || !f.setDetail) return null;
    const vis = () => { let n = 0; w.scene.traverse(o => { if (o.name && /^forest-.*D$/.test(o.name) && o.visible) n++; }); return n; };
    const canopy = () => { let c = 0; w.scene.traverse(o => { if (o.name === 'forest-canopy') c = o.count; }); return c; };
    f.setDetail(50); const nearD = vis(), nearC = canopy();
    f.setDetail(2000); const farD = vis(), farC = canopy();
    f.setDetail(50); const backD = vis(), backC = canopy();
    return { nearD, farD, backD, nearC, farC, backC };
  });
  P('R3-13-B the far tier actually drops the detail meshes',
    !!lod && lod.nearD === 3 && lod.farD === 0, JSON.stringify(lod));
  P('R3-13-C and truncates the canopy to its landmark nodes',
    !!lod && lod.farC < lod.nearC && lod.farC > 0, lod && (lod.nearC + ' -> ' + lod.farC));
  P('R3-13-D walking back in RESTORES it exactly (an LOD that leaks is worse than none)',
    !!lod && lod.backD === lod.nearD && lod.backC === lod.nearC, JSON.stringify(lod));

  /* ============================================================================================
     R3-05 · EVERY FOBEAM FAMILY CARRIES THE MINI MUSIC LINE
     ============================================================================================ */
  const music = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA;
    const fields = new Set();
    w.scene.traverse(o => { if (o.name && /musicline/.test(o.name)) fields.add(o.name); });
    return Array.from(fields);
  });
  P('R3-05-A the ascent\'s RECEIVER end carries the motif (the emitter end already did)',
    music.some(n => /ascent/.test(n)), music.join(' '));
  P('R3-05-B the descent shaft carries a downward-reading motif', music.some(n => /descent/.test(n)), music.join(' '));

  /* ============================================================================================
     L42 · ONE SOURCE DECIDES WHERE A CITY IS
     ============================================================================================ */
  const sites = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA;
    const out = { lake: w.lakeCity && w.lakeCity.stats.site, forest: w.rainforest && w.rainforest.stats.site,
      descent: w.mahDescent ? w.mahDescent.stats.sites : [] };
    return out;
  });
  const near = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
  P('L42 the peer-city descent entrances are placed FROM those modules\' own sites',
    !!sites.lake && !!sites.forest
    && sites.descent.some(d => near(d, sites.lake, 340))
    && sites.descent.some(d => near(d, sites.forest, 360)),
    JSON.stringify(sites.descent));

  console.log('\npage errors: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'none'));
  console.log('mahworld-r3-laws: ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  await b.close();
  process.exit(fail || errs.length ? 1 : 0);
})();
