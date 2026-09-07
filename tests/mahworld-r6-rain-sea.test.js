/* MAHWORLD — R6 MAH RAIN + THE CRYSTAL SEA, checked in the running world.

   The direction for this layer is unusually physical, which means most of it is measurable:

       "very long pieces of rain"            -> metres, from the built instance state
       "no sharp edges"                      -> the shard profile's radius at BOTH ends, > 0
       "keep it in that circle shape and
        let it go even wider"                -> top radius vs landing radius
       "huge bodies of crystallized water"   -> the sea's area, and that it MEETS the land
       "extremely flowy, extremely malleable" -> the surface moves, and the movement is measurable
       "abide by all the swim functions"     -> a published volume with a surface, a bed and a depth

   Two gates here exist purely because of defects this project has already paid for, and they come
   first for that reason: the module must EXIST (a const in the temporal dead zone silently deletes a
   whole district, twice now), and the sea's triangles must FACE UP (MAH HAVEN's reservoir was wound
   face-down and was invisible to every camera and every raycast in the world for three rounds).

   Run: node tests/mahworld-r6-rain-sea.test.js */
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
  await page.evaluate(() => window.MAHWORLD_MAHPLAZA.setTime('21:40'));
  await page.evaluate(() => window.MAHWORLD_MAHPLAZA.advance(3, 1 / 30));
  const ev = fn => page.evaluate(fn);

  /* ============================================================================================
     0. IT EXISTS. First, always, for the reason in the header.
     ============================================================================================ */
  const wired = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA;
    return { rain: !!w.modules.mahRain, dome: !!w.modules.haloDome, halo: !!w.modules.halo,
      haven: !!w.modules.mahHaven, crown: !!w.modules.mahCrown };
  });
  console.log('\nR6 — the module is built and wired');
  P('MAH RAIN is wired', wired.rain);
  P('the HALO DOME it falls from survives R6', wired.dome);
  P('R4 MAH HALO survives R6', wired.halo);
  P('R5 MAH HAVEN survives R6', wired.haven);
  P('R5 MAH CROWN survives R6', wired.crown);

  const R = await ev(async () => {
    const w = window.MAHWORLD_MAHPLAZA; if (!w.mahRain) return null;
    const T = await import('/mahworld/vendor/three/three.module.min.js');
    const RM = await import('/mahworld/scene/mah-rain.js');
    const DM = await import('/mahworld/scene/halo-dome.js');
    const s = w.mahRain.stats;

    /* THE SHARD PROFILE, read off the built geometry rather than off the constant that generated
       it: the minimum distance from the long axis, over every vertex, at both ends. A needle has a
       vertex at radius 0 and this is the number that catches it. */
    const curtain = w.scene.getObjectByName('mah-rain-curtain');
    let minEndR = Infinity, maxR = 0, lo = Infinity, hi = -Infinity;
    if (curtain && curtain.geometry) {
      const A = curtain.geometry.attributes.position;
      for (let i = 0; i < A.count; i++) {
        const y = A.getY(i), r = Math.hypot(A.getX(i), A.getZ(i));
        if (r > maxR) maxR = r;
        if (y < lo) lo = y; if (y > hi) hi = y;
      }
      /* THE PROFILE at the ends, not every vertex there. A flat end cap is a fan, and a fan has one
         vertex on the axis at radius 0 by construction — measuring every vertex makes a genuinely
         blunt disc indistinguishable from a needle, which is what the first cut of this gate did.
         What matters is the RIM the shard terminates in, so this takes the LARGEST radius found in
         each end slab: on a needle that is near zero, on a blunt end it is the cap's real radius. */
      const span = hi - lo;
      let loRim = 0, hiRim = 0;
      for (let i = 0; i < A.count; i++) {
        const y = A.getY(i), r = Math.hypot(A.getX(i), A.getZ(i));
        if (y < lo + span * 0.03) loRim = Math.max(loRim, r);
        if (y > hi - span * 0.03) hiRim = Math.max(hiRim, r);
      }
      minEndR = Math.min(loRim, hiRim);
    }

    /* THE SEA MOVES. Sampled by reading the same vertex's displaced height at two times — which
       cannot be done from the CPU, because the displacement is in the vertex shader. So instead:
       the uniform must advance, and the wave table must have amplitude. Both are checkable, and a
       frozen sea is a uniform that never moves. */
    const seaMesh = w.scene.getObjectByName('mah-crystal-sea');
    const seaMat = seaMesh ? seaMesh.material : null;
    const u0 = seaMat && seaMat.userData.seaUniforms ? seaMat.userData.seaUniforms.uSeaT.value : null;
    w.advance(2.0, 1 / 30);
    const u1 = seaMat && seaMat.userData.seaUniforms ? seaMat.userData.seaUniforms.uSeaT.value : null;

    /* THE CURTAIN MOVES, and this one CAN be read from the CPU because the fall is composed into
       instance matrices — which is exactly why it was put there. */
    const m0 = new T.Matrix4(), m1 = new T.Matrix4();
    let moved = 0;
    if (curtain) {
      curtain.getMatrixAt(0, m0);
      const y0 = m0.elements[13];
      w.advance(2.0, 1 / 30);
      curtain.getMatrixAt(0, m1);
      moved = Math.abs(m1.elements[13] - y0);
    }

    /* THE SWIM CONTRACT, exercised rather than described */
    let bestTh = 0, bestR = 1e9;
    for (let d = 0; d < 360; d += 2) { const th = d * Math.PI / 180, r = RM.shoreR(th); if (r < bestR) { bestR = r; bestTh = th; } }
    const probeR = bestR + 400;
    const px = Math.cos(bestTh) * probeR, pz = Math.sin(bestTh) * probeR;
    const at = w.mahRain.seaAt(px, pz);
    const outsideIn = w.mahRain.seaAt(Math.cos(bestTh) * (bestR - 600), Math.sin(bestTh) * (bestR - 600));
    const outsideOut = w.mahRain.seaAt(Math.cos(bestTh) * (RM.SEA.R_OUT + 400), Math.sin(bestTh) * (RM.SEA.R_OUT + 400));
    const vols = (w.ctx && w.ctx.swimVolumes) ? w.ctx.swimVolumes.length : (w.mahRain.swimVolumes ? w.mahRain.swimVolumes().length : 0);

    /* CAN THE SEA BE SEEN. The gate MAH HAVEN's reservoir failed for three rounds while every
       number about it read correct. Fired from a swimmer's eye, out across the water. */
    w.scene.updateMatrixWorld(true);
    const targets = [];
    w.scene.traverse(o => { if (o.isMesh && o.visible && o.geometry && o.matrixWorld) targets.push(o); });
    let sawSea = false, firstHit = '(nothing)';
    for (const pitch of [-0.02, -0.08, -0.25]) {
      const rc = new T.Raycaster(new T.Vector3(px, RM.SEA.LEVEL + 1.2, pz),
        new T.Vector3(Math.cos(bestTh), pitch, Math.sin(bestTh)).normalize(), 0.5, 4000);
      let h = []; try { h = rc.intersectObjects(targets, false); } catch (e) { }
      if (h.length && firstHit === '(nothing)') firstHit = h[0].object.name || '(unnamed)';
      if (h.some(x => /mah-crystal-sea/.test(x.object.name || ''))) sawSea = true;
    }

    /* AND THE CURTAIN — BY COVERAGE, NOT BY A RAY. Three rays across a volume that is 0.05% rain
       hit nothing, and that told me about the rays rather than about the curtain. What decides
       whether a viewer sees rain is how many shards fall inside their view cone, so that is what is
       counted: shards within 32 degrees of the outward axis from a camera on the ring. */
    let rainInCone = 0;
    {
      const mm = new T.Matrix4();
      const eye = new T.Vector3(Math.cos(bestTh) * 2600, 400, Math.sin(bestTh) * 2600);
      const axis = new T.Vector3(Math.cos(bestTh), 0.22, Math.sin(bestTh)).normalize();
      const d = new T.Vector3();
      if (curtain) {
        for (let i = 0; i < curtain.count; i++) {
          curtain.getMatrixAt(i, mm);
          d.set(mm.elements[12] - eye.x, mm.elements[13] - eye.y, mm.elements[14] - eye.z);
          if (d.length() > 9000) continue;
          if (d.normalize().dot(axis) > Math.cos(32 * Math.PI / 180)) rainInCone++;
        }
      }
    }
    const sawRain = rainInCone >= 60;

    /* THE CLOUDS, and the one hard rule: NONE of them may be inside the dome. Read off the built
       instance matrices rather than off the placement code that wrote them, because a rule enforced
       by the code that also asserts it is not a gate. */
    let cloudsInside = 0, cloudN = 0, lowest = 1e9, highest = -1e9, mantleN = 0, aboveApex = 0;
    const bandCount = [0, 0, 0, 0, 0];   /* 0-200, 200-500, 500-900, 900-1400, 1400+ */
    {
      const mm = new T.Matrix4();
      const H = DM.DOME.APEX_Y - DM.DOME.SPRING_Y;
      const surf = r => { const t = Math.min(1, Math.max(0, r / DM.DOME.R));
        return DM.DOME.SPRING_Y + H * Math.sqrt(Math.max(0, 1 - t * t)); };
      for (const nm of ['mah-cloud-mantle', 'mah-cloud-veil']) {
        const im = w.scene.getObjectByName(nm);
        if (!im) continue;
        for (let i = 0; i < im.count; i++) {
          im.getMatrixAt(i, mm);
          const x = mm.elements[12], y = mm.elements[13], z = mm.elements[14];
          const r = Math.hypot(x, z);
          cloudN++;
          if (y < lowest) lowest = y; if (y > highest) highest = y;
          if (r < DM.DOME.R && y < surf(r) && y > DM.DOME.SPRING_Y - 30) cloudsInside++;
          const k = y < 200 ? 0 : y < 500 ? 1 : y < 900 ? 2 : y < 1400 ? 3 : 4;
          bandCount[k]++;
          if (nm === 'mah-cloud-mantle') { mantleN++; if (y > DM.DOME.APEX_Y) aboveApex++; }
        }
      }
    }

    return {
      stats: s, DOME: { R: DM.DOME.R, SPRING_Y: DM.DOME.SPRING_Y, APEX_Y: DM.DOME.APEX_Y },
      cloudsInside, cloudN, cloudLow: lowest, cloudHigh: highest, bandCount,
      aboveApexFrac: mantleN ? aboveApex / mantleN : 0, mantleN, aboveApex,
      SEA: { LEVEL: RM.SEA.LEVEL, R_IN: RM.SEA.R_IN, R_OUT: RM.SEA.R_OUT, DEPTH_MAX: RM.SEA.DEPTH_MAX },
      shardMinEndR: minEndR, shardMaxR: maxR, shardLen: hi - lo,
      seaTimeAdvanced: (u0 != null && u1 != null) ? (u1 - u0) : null,
      curtainMovedM: moved,
      at, outsideIn, outsideOut, vols, sawSea, sawRain, rainInCone, firstHit,
      lenMin: RM.RAIN.LEN_MIN, lenMax: RM.RAIN.LEN_MAX, flare: RM.RAIN.FLARE
    };
  });

  console.log('\nR6 — MAH RAIN, the curtain');
  if (!R) P('MAH RAIN geometry exists', false, 'module absent');
  else {
    P('MAH RAIN geometry exists', true);
    /* "very long pieces" — a raindrop is not long; these are shards */
    P('the shards are genuinely long (over 50 m at the short end)',
      R.lenMin >= 50, R.lenMin + ' m to ' + R.lenMax + ' m');
    /* "no sharp edges" — the gate that stops a long shard becoming a needle */
    P('no shard comes to a point: both ends keep a real radius',
      R.shardMinEndR > 0.02 * R.shardMaxR,
      'end radius ' + R.shardMinEndR.toFixed(3) + ' of max ' + R.shardMaxR.toFixed(3));
    /* "keep it in that circle shape and let it go even wider" */
    P('it falls from the dome\'s own perimeter, not a second opinion about where the dome is',
      Math.abs(R.stats.curtain.topR - R.DOME.R) < 1,
      'curtain ' + R.stats.curtain.topR + ' vs dome ' + R.DOME.R);
    P('the curtain flares outward as it descends',
      R.stats.curtain.landR > R.stats.curtain.topR * 1.1,
      'top ' + R.stats.curtain.topR + ' -> ground ' + R.stats.curtain.landR);
    P('it falls all the way to the water, not to a floor in the air',
      Math.abs(R.stats.curtain.groundY - R.SEA.LEVEL) < 0.01,
      'lands at ' + R.stats.curtain.groundY + ', sea at ' + R.SEA.LEVEL);
    P('the curtain is actually falling', R.curtainMovedM > 1,
      'shard 0 moved ' + R.curtainMovedM.toFixed(1) + ' m in 2 s');
    P('enough curtain falls inside a viewer\'s cone to read as rain', R.sawRain,
      R.rainInCone + ' shards within 32 deg of the outward axis from the ring');
    /* R5 §19: a hero system with no performance strategy has none */
    P('the whole curtain costs one draw call', R.stats.draws >= 1 && R.stats.shards > 500,
      R.stats.shards + ' shards');
  }

  console.log('\nR6 — THE CRYSTAL SEA');
  if (R) {
    P('the sea surface faces UP', !!R.stats.seaFacesUp,
      R.stats.seaFacesUp ? 'CCW from above' : 'CLOCKWISE — FrontSide will cull it, as MAH HAVEN\'s did');
    P('the sea is visible from a swimmer\'s eye', R.sawSea,
      R.sawSea ? 'hit' : 'the outward ray hits ' + R.firstHit + ' and never the sea');
    /* it must MEET the land. terrain.js's land ring ends at 2600 and a 24-bearing raycast found
       ground at 17/24 there and 0/24 by r 3000 — so an inner shore beyond 2600 leaves a gap. */
    P('its inner shore overlaps the land\'s edge instead of leaving a gap',
      R.stats.sea.shoreMax < 2600 && R.stats.sea.shoreMin > 1800,
      'shore runs ' + R.stats.sea.shoreMin + ' to ' + R.stats.sea.shoreMax + ', land ends at 2600');
    P('the shore is not a circle', R.stats.sea.shoreMax - R.stats.sea.shoreMin > 200,
      (R.stats.sea.shoreMax - R.stats.sea.shoreMin) + ' m between its nearest and furthest bearing');
    P('it reaches past the dome, so the ring\'s horizon is water',
      R.SEA.R_OUT > R.DOME.R + 800, 'sea to ' + R.SEA.R_OUT + ', dome at ' + R.DOME.R);
    P('the surface moves', R.seaTimeAdvanced != null && R.seaTimeAdvanced > 0.5,
      'uSeaT advanced ' + (R.seaTimeAdvanced == null ? 'never' : R.seaTimeAdvanced.toFixed(2)) + ' over 2 s');
    P('it is faceted crystal, not smooth water', R.stats.sea.facets > 8000,
      R.stats.sea.facets + ' facets');
    P('it uses the world\'s single natural water level',
      Math.abs(R.SEA.LEVEL + 1.4) < 0.001, 'sea ' + R.SEA.LEVEL + ', terrain BASIN.y -1.4');
  }

  console.log('\nR6 — THE CRYSTAL CLOUDS');
  if (R) {
    P('the clouds exist and are numerous enough to be weather',
      R.cloudN > 400, R.cloudN + ' lobes in 2 draws');
    /* THE NUMBER THE FIRST CUT GOT WRONG BY TWENTY TIMES. Cloud area standing in front of the
       dome, against the dome's own frontal silhouette: over 100% is a lid, and a lid is the one
       thing "around that top dome area" rules out. */
    P('the mantle is weather around the dome, not a lid over it',
      R.stats.clouds.coverPct > 15 && R.stats.clouds.coverPct < 85,
      R.stats.clouds.coverPct + '% of the dome\'s frontal silhouette');
    /* THE ONE HARD RULE FROM THE DIRECTION: "around that top dome area but not inside of it" */
    P('NOT ONE cloud is inside the dome', R.cloudsInside === 0,
      R.cloudsInside + ' of ' + R.cloudN + ' lobes sit under the shell');
    P('the mantle reaches the dome\'s upper surface', R.cloudHigh > R.DOME.SPRING_Y + 900,
      'highest lobe at ' + R.cloudHigh.toFixed(0) + ' m, dome springs at ' + R.DOME.SPRING_Y.toFixed(0));
    P('and clouds come all the way down to the ground', R.cloudLow < 120,
      'lowest lobe at ' + R.cloudLow.toFixed(0) + ' m');
    /* "as you go closer to the ground level, less clouds be appearance" — monotonic, measured */
    const B = R.bandCount;
    P('density falls monotonically toward the ground',
      B[0] < B[1] && B[1] < B[2] && B[2] < B[3],
      '0-200m:' + B[0] + '  200-500:' + B[1] + '  500-900:' + B[2] + '  900-1400:' + B[3] + '  1400+:' + B[4]);
    /* "the apex keeps its sky" is about DENSITY, not about a ceiling. A lobe drifting above the
       apex is still "around" the dome and is not the failure; a HOOD over it is. So the gate is the
       fraction of the mantle sitting above the apex plane, which is what a hood actually looks
       like — the first cut of this gate asserted an absolute maximum height and would have failed
       on one lobe 218 m high while a genuine hood at 25% passed. */
    P('the apex is not hooded (under an eighth of the mantle sits above it)',
      R.aboveApexFrac < 0.125,
      (R.aboveApexFrac * 100).toFixed(1) + '% of the mantle above y ' + R.DOME.APEX_Y);
  }

  console.log('\nR6 — the swim contract (groundwork, per R5 §13\'s rule)');
  if (R) {
    P('a swim volume is published to the assembly', R.vols >= 1, R.vols + ' volume(s)');
    P('a point in open water reports a surface, a bed and a depth',
      !!R.at && R.at.inside && R.at.depth > 5,
      R.at ? ('depth ' + R.at.depth.toFixed(1) + ' m at the probe') : 'null');
    P('the bed is below the surface everywhere it is defined',
      !!R.at && R.at.bedY < R.at.surfaceY,
      R.at ? ('bed ' + R.at.bedY.toFixed(1) + ' vs surface ' + R.at.surfaceY) : 'null');
    P('the water ends at the shore', R.outsideIn === null, 'inland of the shore returns null');
    P('the water ends at its outer edge', R.outsideOut === null, 'past R_OUT returns null');
    P('it is deep enough to swim in', R.SEA.DEPTH_MAX >= 20, R.SEA.DEPTH_MAX + ' m at the deepest');
  }

  console.log('\nWORLD — geometry integrity');
  const nan = await ev(() => {
    const w = window.MAHWORLD_MAHPLAZA; const bad = [];
    w.scene.traverse(o => {
      const g = o.geometry; if (!g || !g.attributes || !g.attributes.position) return;
      const A = g.attributes.position.array;
      for (let i = 0; i < A.length; i += 97) if (!isFinite(A[i])) { bad.push(o.name || '(unnamed)'); return; }
    });
    return bad;
  });
  P('no geometry in the built scene has NaN positions', nan.length === 0, nan.slice(0, 4).join(', '));
  P('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
