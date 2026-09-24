/* S13 CAMERA ACCEPTANCE (A-G) — real input paths in headless Chromium: keyboard + mouse (desktop) and synthetic pointer events on the touch
   zones (emulated touch, not a physical device). Measures the REAR OFFSET = wrap(cam.yaw + displayed root yaw) in degrees (0 = camera directly
   behind the character), the boom (applied vs wanted), framing (crown-to-tips share of the viewport height) and input ownership.
   node deploy/probe_camera.mjs [--live http://127.0.0.1:PORT] [touch]   (default: serves deploy/static_dist) */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var argv = process.argv.slice(2); var live = argv.indexOf('--live') >= 0 ? argv[argv.indexOf('--live') + 1] : null; var TOUCH = argv.indexOf('touch') >= 0;
var srv = live ? null : await serveStatic(path.join(HERE, 'static_dist')); var origin = live || srv.origin; var pagePath = live ? '/lab/play.html' : PLAY_PATH;
var pg = await launchChrome({ width: TOUCH ? 844 : 1200, height: TOUCH ? 390 : 750, gpu: true }); var pass = 0, fail = 0; var lines = [];
function ok(id, cond, detail) { (cond ? pass++ : fail++); var l = (cond ? 'PASS ' : 'FAIL ') + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''); lines.push(l); console.log(l); }
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function key(code, down) { await pg.evaluate("document.dispatchEvent(new KeyboardEvent('" + (down ? 'keydown' : 'keyup') + "',{code:'" + code + "',key:'" + (code.startsWith('Key') ? code.slice(3).toLowerCase() : code) + "',bubbles:true})); 1"); }
async function tap(code) { await key(code, true); await sleep(40); await key(code, false); }
async function state() { return await ev("var c=P.cam(); var ry=P.mePose().root_yaw; var off=Math.atan2(Math.sin(c.yaw-ry),Math.cos(c.yaw-ry))*180/Math.PI;   /* displayed root yaw = −(host facing) since PASS 2 */ var s=P.snap().play; return {off:+off.toFixed(1), yaw:+c.yaw.toFixed(3), pitch:+c.pitch.toFixed(3), dist:+c.dist.toFixed(2), applied:+c.applied.toFixed(2), dragging:c.dragging, fixed:c.fixed, x:+s.position.x.toFixed(2), z:+s.position.z.toFixed(2), facing:+(s.facing||0).toFixed(3), form:s.form, flying:!!(s.flight&&s.flight.powered)};"); }
async function sampleOffsets(ms, step) { var out = []; var t0 = Date.now(); while (Date.now() - t0 < ms) { out.push(await state()); await sleep(step || 100); } return out; }
function maxAbs(arr, k) { return Math.max.apply(null, arr.map(function (s) { return Math.abs(s[k]); })); }
async function mouseDrag(dx, dy, ms) { var vw = await ev("return {w:innerWidth,h:innerHeight};"); var x = vw.w * 0.6, y = vw.h * 0.5; await pg.evaluate("document.getElementById('view').dispatchEvent(new MouseEvent('mousedown',{clientX:" + x + ",clientY:" + y + ",bubbles:true})); 1"); var n = Math.max(4, Math.round(ms / 40)); for (var i = 1; i <= n; i++) { await pg.evaluate("dispatchEvent(new MouseEvent('mousemove',{clientX:" + (x + dx * i / n) + ",clientY:" + (y + dy * i / n) + ",bubbles:true})); 1"); await sleep(40); } return { x: x + dx, y: y + dy }; }
async function mouseUp(x, y) { await pg.evaluate("dispatchEvent(new MouseEvent('mouseup',{clientX:" + x + ",clientY:" + y + ",bubbles:true})); 1"); }
/* touch: synthetic pointer events straight to the zones (pointerType touch) */
async function ptr(type, el, id, x, y) { await pg.evaluate("(function(){ var t=document.getElementById('" + el + "'); var e=new PointerEvent('" + type + "',{pointerId:" + id + ",pointerType:'touch',isPrimary:" + (id === 1) + ",clientX:" + x + ",clientY:" + y + ",bubbles:true,cancelable:true}); t.dispatchEvent(e); })(); 1"); }
async function stickHold(dirx, diry) { var vw = await ev("return {w:innerWidth,h:innerHeight};"); var x = vw.w * 0.2, y = vw.h * 0.72; await ptr('pointerdown', 'tc-stickzone', 1, x, y); for (var i = 1; i <= 4; i++) { await ptr('pointermove', 'tc-stickzone', 1, x + dirx * 20 * i, y + diry * 20 * i); await sleep(30); } return { x: x + dirx * 80, y: y + diry * 80 }; }
async function stickRelease(p) { await ptr('pointerup', 'tc-stickzone', 1, p.x, p.y); }
async function lookDrag(dx, dy, ms) { var vw = await ev("return {w:innerWidth,h:innerHeight};"); var x = vw.w * 0.72, y = vw.h * 0.45; await ptr('pointerdown', 'tc-world', 2, x, y); var n = Math.max(4, Math.round(ms / 40)); for (var i = 1; i <= n; i++) { await ptr('pointermove', 'tc-world', 2, x + dx * i / n, y + dy * i / n); await sleep(40); } return { x: x + dx, y: y + dy }; }
async function lookRelease(p) { await ptr('pointerup', 'tc-world', 2, p.x, p.y); }
try {
  await pg.goto(origin + pagePath + '?field=1&dev=1' + (TOUCH ? '&touch=1' : '')); await waitForGame(pg, 120000); await sleep(4000); await ev("P.hud.showGuide(false); return 1;");
  var isT = await ev("return document.body.classList.contains('touch');"); ok('0. mode ' + (TOUCH ? 'TOUCH (emulated: synthetic pointer events on the look/stick zones)' : 'DESKTOP (keyboard + mouse events)'), isT === TOUCH);
  /* framing: crown-to-tips share of the viewport height at rest */
  await sleep(1500); var share = await ev("return P.cameraDebug();");
  ok('1. FRAMING crown-to-tips = ' + (share.share * 100).toFixed(0) + '% of viewport height (target 50-67%), dist ' + share.dist + ' m, aim ' + share.pivot.toFixed(2) + ' m, rear offset ' + share.off_deg + '°', share.share >= 0.45 && share.share <= 0.7 && share.crown_ndc_y < 0.98 && share.tips_ndc_y > -0.98, share);
  await pg.screenshot(path.join(OUT, 'cam_' + (TOUCH ? 'touch' : 'desk') + '_rest.png'));
  /* A. W A S D each held alone, no look input: rear view throughout (after the turn settles) */
  var holds = TOUCH ? [['W', 0, -1], ['A', -1, 0], ['S', 0, 1], ['D', 1, 0]] : [['KeyW'], ['KeyA'], ['KeyS'], ['KeyD']]; var aRes = {};
  for (var h of holds) { var p0; if (TOUCH) p0 = await stickHold(h[1], h[2]); else await key(h[0], true); var sm = await sampleOffsets(1700, 100); if (TOUCH) await stickRelease(p0); else await key(h[0], false); await sleep(250); var tail = sm.slice(-7); aRes[h[0]] = { settled_max: maxAbs(tail, 'off'), peak: maxAbs(sm, 'off'), moved: Math.hypot(sm[sm.length - 1].x - sm[0].x, sm[sm.length - 1].z - sm[0].z).toFixed(2) }; }
  ok('A. W/A/S/D held alone → direct rear view (settled |offset| < 8°): ' + JSON.stringify(aRes), Object.keys(aRes).every(function (k) { return aRes[k].settled_max < 8 && parseFloat(aRes[k].moved) > 0.5; }));
  await pg.screenshot(path.join(OUT, 'cam_' + (TOUCH ? 'touch' : 'desk') + '_A.png'));
  /* B. diagonal + rapid reversals: no spiral, ends behind */
  var yaw0 = (await state()).yaw; var pB;
  if (TOUCH) { pB = await stickHold(0.7, -0.7); } else { await key('KeyW', true); await key('KeyD', true); }
  var diag = await sampleOffsets(1500, 100); var faceVar = Math.max.apply(null, diag.slice(-6).map(function (s) { return Math.abs(Math.atan2(Math.sin(s.facing - diag[diag.length - 1].facing), Math.cos(s.facing - diag[diag.length - 1].facing))); })) * 180 / Math.PI;
  if (TOUCH) { await stickRelease(pB); } else { await key('KeyW', false); await key('KeyD', false); }
  var seq = TOUCH ? [[0, 1], [-1, 0], [1, 0], [0, -1]] : ['KeyS', 'KeyA', 'KeyD', 'KeyW']; var travel = 0, last = (await state()).yaw;
  for (var q of seq) { var pq; if (TOUCH) pq = await stickHold(q[0], q[1]); else await key(q, true); for (var i = 0; i < 3; i++) { await sleep(90); var st = await state(); travel += Math.abs(Math.atan2(Math.sin(st.yaw - last), Math.cos(st.yaw - last))); last = st.yaw; } if (TOUCH) await stickRelease(pq); else await key(q, false); }
  var pW; if (TOUCH) pW = await stickHold(0, -1); else await key('KeyW', true); var after = await sampleOffsets(1600, 100); if (TOUCH) await stickRelease(pW); else await key('KeyW', false); await sleep(200);
  ok('B. diagonal hold: facing steady (Δ ' + faceVar.toFixed(1) + '°), rapid reversals: camera travel ' + (travel * 180 / Math.PI).toFixed(0) + '° total (bounded, no spiral), final hold settles behind (' + maxAbs(after.slice(-6), 'off').toFixed(1) + '°)', faceVar < 6 && travel < 3.5 * Math.PI && maxAbs(after.slice(-6), 'off') < 8);
  /* C. move + manual drag at the same time: deliberate orbit, movement continues */
  var before = await state(); var pC; if (TOUCH) pC = await stickHold(0, -1); else await key('KeyW', true); await sleep(300);
  var dragEnd; if (TOUCH) dragEnd = await lookDrag(-220, 0, 600); else dragEnd = await mouseDrag(-260, 0, 600);
  var duringDrag = await state(); await sleep(400); var duringDrag2 = await state();
  ok('C. hold forward + drag look: dragging=' + duringDrag.dragging + ', offset ' + duringDrag.off + '° → ' + duringDrag2.off + '° (held, not fought), still moving (' + Math.hypot(duringDrag2.x - before.x, duringDrag2.z - before.z).toFixed(1) + ' m)', duringDrag.dragging === true && Math.abs(duringDrag.off) > 35 && Math.abs(duringDrag2.off - duringDrag.off) < 12 && Math.hypot(duringDrag2.x - before.x, duringDrag2.z - before.z) > 1.5);
  await pg.screenshot(path.join(OUT, 'cam_' + (TOUCH ? 'touch' : 'desk') + '_C_manual_look.png'));
  /* D. release → smooth return (no overshoot, no oscillation, < 1.5 s) while still moving, then stop */
  if (TOUCH) await lookRelease(dragEnd); else await mouseUp(dragEnd.x, dragEnd.y);
  var ret = []; var tR = Date.now(); var settledAt = null; var sign0 = Math.sign(duringDrag2.off); var overshoot = 0; while (Date.now() - tR < 2200) { var sr = await state(); ret.push(sr); if (settledAt === null && Math.abs(sr.off) < 4) settledAt = Date.now() - tR; if (Math.sign(sr.off) === -sign0 && Math.abs(sr.off) > 4) overshoot = Math.max(overshoot, Math.abs(sr.off)); await sleep(60); }
  if (TOUCH) await stickRelease(pC); else await key('KeyW', false);
  var mono = true; for (var i = 1; i < ret.length; i++) { if (Math.abs(ret[i].off) > Math.abs(ret[i - 1].off) + 6) mono = false; }
  ok('D. release → return behind in ' + (settledAt === null ? '>2200' : settledAt) + ' ms, overshoot ' + overshoot.toFixed(1) + '°, monotone ' + mono + ', dragging=' + ret[ret.length - 1].dragging, settledAt !== null && settledAt < 1500 && overshoot < 5 && mono && ret[ret.length - 1].dragging === false);
  /* E. stand with the back to a building facade (the rear camera position is inside the wall): the boom shortens; walk away: it restores; never a sideways orbit */
  await sleep(400); var gt = await ev("return P.goTo ? P.goTo(-68, 108) : null;"); await sleep(1500); console.log('E goTo', JSON.stringify(gt), JSON.stringify(await state())); await ev("return P.send('MOVE',{forward:0,strafe:0,run:false,yaw:-1.5708});"); await sleep(1200); console.log('E faced -x', JSON.stringify(await state()));
  var pIn; if (TOUCH) pIn = await stickHold(0, -1); else await key('KeyW', true); await sleep(2600); if (TOUCH) await stickRelease(pIn); else await key('KeyW', false); await sleep(400);   /* walk into the facade until blocked */
  console.log('E after walk-in', JSON.stringify(await state())); await ev("return P.send('MOVE',{forward:0,strafe:0,run:false,yaw:1.5708});"); await sleep(1400); console.log('E after turn', JSON.stringify(await state()));   /* turn the back to the wall: the rear camera position is now inside the building */
  var atWall = await sampleOffsets(900, 100); var pE; if (TOUCH) pE = await stickHold(0, -1); else await key('KeyW', true); var away = await sampleOffsets(2600, 120); if (TOUCH) await stickRelease(pE); else await key('KeyW', false); await sleep(300);
  var minApplied = Math.min.apply(null, atWall.map(function (s) { return s.applied; })); var restored = away[away.length - 1].applied; var bx = await state();
  ok('E. back to the MAH GYM facade: boom shortened to ' + minApplied.toFixed(2) + ' m (wanted ' + atWall[0].dist + '), rear offset max ' + Math.max(maxAbs(atWall, 'off'), maxAbs(away.slice(3), 'off')).toFixed(1) + '° (no sideways orbit); walking away restores ' + restored.toFixed(2) + ' m; player x=' + bx.x, minApplied < atWall[0].dist - 0.5 && Math.max(maxAbs(atWall, 'off'), maxAbs(away.slice(3), 'off')) < 10 && restored > atWall[0].dist - 0.3);
  await pg.screenshot(path.join(OUT, 'cam_' + (TOUCH ? 'touch' : 'desk') + '_E_wall.png'));
  /* F. actions: attacks, H form change, flight, emote — no unintended camera changes */
  await ev("return P.goTo ? P.goTo(0, 60) : null;"); await sleep(2500); var fRes = {};
  for (var act of [['attack E', 'KeyE'], ['form H', 'KeyH'], ['fly F', 'KeyF'], ['wave X', 'KeyX']]) { var s0 = await state(); await tap(act[1]); var sm2 = await sampleOffsets(1400, 100); var s1 = sm2[sm2.length - 1]; fRes[act[0]] = { off_max: maxAbs(sm2, 'off'), dist_change: +(s1.dist - s0.dist).toFixed(2), pitch_change: +(s1.pitch - s0.pitch).toFixed(3), dragging: s1.dragging, fixed: s1.fixed, form: s1.form, flying: s1.flying }; if (act[1] === 'KeyF') { await sleep(800); await tap('KeyF'); await sleep(2500); } if (act[1] === 'KeyH') { await sleep(2500); await tap('KeyH'); await sleep(2500); } }
  ok('F. attack / H form / flight / emote: rear offset stays (max ' + Math.max.apply(null, Object.keys(fRes).map(function (k) { return fRes[k].off_max; })).toFixed(1) + '°), no zoom / pitch / drag / fixed changes: ' + JSON.stringify(fRes), Object.keys(fRes).every(function (k) { var r = fRes[k]; return r.off_max < 12 && Math.abs(r.dist_change) < 0.6 && Math.abs(r.pitch_change) < 0.05 && !r.dragging && !r.fixed; }));
  /* G. menus own their input: a drag while the Q menu / emote surface is open must not rotate the camera; no stuck drag after release */
  var g0 = await state(); await tap('KeyQ'); await sleep(400); var menuOpen = await ev("return P.menu ? P.menu.isOpen() : null;"); var gEnd; if (TOUCH) gEnd = await lookDrag(-200, 0, 400); else gEnd = await mouseDrag(-200, 0, 400); var g1 = await state(); if (TOUCH) await lookRelease(gEnd); else await mouseUp(gEnd.x, gEnd.y); await tap('KeyQ'); await sleep(300);
  await tap('Tab'); await sleep(300); var emOpen = await ev("return P.hud.emotesOpen ? P.hud.emotesOpen() : null;"); var gEnd2; if (TOUCH) gEnd2 = await lookDrag(-200, 0, 400); else gEnd2 = await mouseDrag(-200, 0, 400); var g2 = await state(); if (TOUCH) await lookRelease(gEnd2); else await mouseUp(gEnd2.x, gEnd2.y); await tap('Escape'); await sleep(300); var g3 = await state();
  ok('G. Q menu open (' + menuOpen + '): drag Δyaw ' + Math.abs(g1.yaw - g0.yaw).toFixed(3) + ' rad; emote surface open (' + emOpen + '): drag Δyaw ' + Math.abs(g2.yaw - g1.yaw).toFixed(3) + ' rad; dragging after: ' + g3.dragging, Math.abs(g1.yaw - g0.yaw) < 0.02 && Math.abs(g2.yaw - g1.yaw) < 0.02 && g3.dragging === false);
  fs.writeFileSync(path.join(OUT, 'camera_' + (TOUCH ? 'touch' : 'desk') + '.txt'), lines.join('\n') + '\nRESULT ' + pass + ' passed, ' + fail + ' failed\n');
  console.log('RESULT camera ' + (TOUCH ? 'touch' : 'desktop') + ': ' + pass + ' passed, ' + fail + ' failed'); console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }).slice(0, 5));
} finally { await pg.close(); if (srv) srv.close(); }
process.exit(fail ? 1 : 0);
