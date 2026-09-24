/* S09 MASTER REVIEW RECORDING (brief §44) — ONE continuous clip, 18 chapters, a still per chapter, marks.json with timestamps.
   node deploy/record_master.mjs [tag] → deploy/review/<tag>/mahworld_master_review.webm */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var tag = process.argv[2] || 'master'; var OUT = path.join(HERE, 'review', tag); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 960, height: 720, gpu: true }); var frames = [], marks = [], t0 = 0;
function mark(l) { marks.push({ t: +((performance.now() - t0) / 1000).toFixed(2), label: l }); console.log(((performance.now() - t0) / 1000).toFixed(1) + 's  ' + l); }
async function key(code, down) { await pg.evaluate("document.dispatchEvent(new KeyboardEvent('" + (down ? 'keydown' : 'keyup') + "',{code:'" + code + "',key:'" + (code.startsWith('Key') ? code.slice(3).toLowerCase() : code) + "',bubbles:true})); 1"); }
async function tap(code) { await key(code, true); await sleep(40); await key(code, false); }
async function cam(y, p, d, pv) { await pg.evaluate("window.MAHWORLD_PLAY.cam(" + y + "," + p + "," + d + "," + (pv === undefined ? 'null' : pv) + ")"); }
async function yawOf() { return await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw"); }
async function P(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(4000);
  await P("P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); return 1;");
  pg.on('Page.screencastFrame', function (p) { frames.push({ t: performance.now() - t0, data: p.data }); pg.cmd('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(function () { }); });
  await P("return P.goTo(-3, -13, -3, -8)"); await sleep(500);
  t0 = performance.now(); await pg.cmd('Page.startScreencast', { format: 'jpeg', quality: 72, maxWidth: 960, maxHeight: 720, everyNthFrame: 2 });   /* ~25 fps: keeps the frame store small (7.5k frames at 50 fps blew the pagefile) */
  /* 1 neutral idle */
  var y0 = await yawOf(); await cam(y0 + Math.PI + 0.55, 0.06, 3.4, 0.95); mark('1 NEUTRAL IDLE (rig v5 ATHLETE_M_V6): sternum-clavicle-scapula-humerus chain, active idle'); await sleep(3200);
  /* 2 walk / run / turn */
  await cam(y0 + Math.PI + 0.9, 0.18, 5.5, 0.9); mark('2 WALK / RUN / TURN: inertialized transitions, pelvis heave, distributed trunk'); await key('KeyW', true); await sleep(1600); await key('ShiftLeft', true); await sleep(1500); await key('KeyD', true); await sleep(1300); await key('KeyD', false); await key('ShiftLeft', false); await key('KeyW', false); await sleep(700);
  /* 3 split gait front / side / rear */
  await P("return P.goTo(-18, -10)"); await sleep(400); await P("return P.send('TRANSFORM',{to:'SPLIT'})"); await sleep(2600); await cam(-Math.PI / 2, 0.42, 6.5); await sleep(200); await key('KeyW', true); await sleep(1100); var y1 = await yawOf();
  await cam(y1 + Math.PI, 0.05, 3.6, 0.8); mark('3a SPLIT GAIT front: two complete rounded legs (outward winding), tips visible'); await sleep(2600);
  await cam(y1 + Math.PI + Math.PI / 2, 0.02, 3.4, 0.8); mark('3b SPLIT GAIT side: support-tip hover IK, rear leg swing, hover gait (not a foot walk)'); await sleep(2800);
  await cam(y1, 0.05, 3.6, 0.8); mark('3c SPLIT GAIT rear: rear leg long behind, trailing tip'); await sleep(2600); await key('KeyW', false); await sleep(500);
  /* 4 packed -> split -> fused */
  await P("return P.goTo(-3, -13)"); await sleep(400); await P("return P.send('TRANSFORM',{to:'FUSED'})"); await sleep(2600); var y2 = await yawOf(); await cam(y2 + Math.PI + 0.55, 0.06, 3.6, 0.95);
  mark('4 PACKED -> GATHER -> SPLIT -> PACKED: complete leg geometry throughout'); await P("return P.send('TRANSFORM',{to:'SPLIT'})"); await sleep(3400); await P("return P.send('TRANSFORM',{to:'FUSED'})"); await sleep(2800);
  /* 5 shoulder ladder through the animator */
  await cam(y2 + Math.PI - 0.55, 0.05, 1.6, 1.35); mark('5 SHOULDER LADDER 45 / 90 / 120 / 150 / 170: scapular share from the humerus, SH correctives, bone lengths invariant');
  var ladder = [45, 90, 120, 150, 170, 120, 0];
  for (var li = 0; li < ladder.length; li++) { var z = ladder[li] * Math.PI / 180; await P("P.poseOverride('me', { UPPERARM_L: [-0.05, 0, " + (-z) + "], UPPERARM_R: [-0.05, 0, " + z + "], FOREARM_L: [-0.1, 0, 0], FOREARM_R: [-0.1, 0, 0] })"); await sleep(1150); }
  await P("P.poseOverride('me', null)"); await sleep(400);
  /* 6 overhead reach front + side */
  mark('6 OVERHEAD REACH: no stretch / squash, humeral column ownership, proximal twist carriers'); await P("P.poseOverride('me', { UPPERARM_L: [0.2, 0, -2.55], UPPERARM_R: [0.2, 0, 2.55], FOREARM_L: [-0.25, 0, 0], FOREARM_R: [-0.25, 0, 0] })"); await sleep(1400); await cam(y2 + Math.PI + Math.PI / 2, 0.05, 1.7, 1.35); await sleep(1500); await P("P.poseOverride('me', null)"); await sleep(300);
  /* 7-9 attacks by category, E/R/T/Y direct */
  await P("return P.goTo(0, 4, 0, -2)"); await sleep(500); var y3 = await yawOf(); await cam(y3 + Math.PI + 0.9, 0.12, 3.8, 1.0);
  mark('7 PHYSICAL ATTACKS E / R / T / Y direct: setup-load-commit-follow-through-recovery'); for (var s = 0; s < 4; s++) { await tap(['KeyE', 'KeyR', 'KeyT', 'KeyY'][s]); await sleep(1700); }
  await tap('KeyZ'); await sleep(300); mark('8 PHYS-MAHGIC ATTACKS E / R: gold energy (class colour authority)'); await tap('KeyE'); await sleep(2200); await tap('KeyR'); await sleep(2200);
  await tap('KeyZ'); await sleep(300); mark('9 SPECIAL ATTACKS E / R: gold aura + streak + soft impact'); await tap('KeyE'); await sleep(2400); await tap('KeyR'); await sleep(2400);
  /* 10 projectile / impact wide */
  await cam(y3 + Math.PI + 2.3, 0.1, 5.5, 1.0); mark('10 GOLD MAHGIC projectile: core + halo + streak ribbons + wake -> soft impact, no generic disc'); await tap('KeyT'); await sleep(2600); await tap('KeyZ'); await sleep(300);
  /* 11 HUD strip */
  await cam(y3 + Math.PI + 0.9, 0.12, 3.8, 1.0); mark('11 DIRECT EXECUTION HUD: E R T Y strip beside ATTACK, inactive when empty, no arming'); await sleep(1600);
  /* 12 tip propulsion hover */
  await P("return P.goTo(-8, 2)"); await sleep(300); var y4 = await yawOf(); await cam(y4 + Math.PI + 0.6, -0.15, 2.6, 0.45); mark('12 TIP PROPULSION at hover: tip emission, shin gradient, core + envelope'); await sleep(1800); await key('KeyW', true); await sleep(2200); await key('KeyW', false); await sleep(400);
  /* 13 flight stream */
  mark('13 FLIGHT: ascend -> long fading stream, ground light fades with altitude, no fake ground hit'); await tap('KeyF'); await sleep(900); for (var a = 0; a < 5; a++) { await tap('Space'); await sleep(260); } await cam(y4 + Math.PI + 0.9, -0.12, 9.5, 3.2); await sleep(2600); await key('KeyW', true); await sleep(2000); await key('KeyW', false); await tap('KeyF'); await sleep(1800);
  /* 14 TAB emotes */
  var y5 = await yawOf(); await cam(y5 + Math.PI + 0.55, 0.06, 3.4, 0.95); mark('14 TAB = EMOTES radial, then one emote performed'); await tap('Tab'); await sleep(1400); await tap('Escape'); await P("return P.send('EMOTE',{emote_id:'MAH_GROOVE'})"); await sleep(3000);
  /* 15-16 Q menu */
  mark('15 Q = UNIVERSAL MENU: STATS / SKILLS / INVENTORY / MAP / FRIENDS / DMs (LOCAL dev backend), owns input'); await tap('KeyQ'); await sleep(1200);
  var tabs = ['SKILLS', 'INVENTORY', 'MAP', 'FRIENDS', 'DMS']; for (var ti = 0; ti < tabs.length; ti++) { if (tabs[ti] === 'MAP') mark('16 MAP tab: colliders / buildings / residents / player; ESC closes'); await P("var b=document.querySelector('[data-m=\"tab\"][data-tab=\"" + tabs[ti] + "\"]'); if (b) b.click(); return !!b;"); await sleep(1200); }
  await tap('Escape'); await sleep(500);
  /* 17 plaza */
  await P("return P.goTo(0, -6)"); await sleep(300); await cam(0.7, 0.55, 26, 3.0); mark('17 WORLD: platinum / chromium / metallic-blue plaza, authored floor (no grid), pathways, residents'); await sleep(1600); await cam(2.2, 0.35, 34, 4.0); await sleep(2200);
  /* 18 tree elevator */
  await P("P.camFollow(true); return 1;"); await P("return P.goTo(22, 34)"); await P("P.camFollow(false); return 1;"); await sleep(400); await cam(-2.4, 0.25, 16, 4.0); mark('18 TREE ELEVATOR landmark: trunk / branches / crown, platform, pods'); await sleep(2200);
  await P("return P.goTo(26.6, 40)"); await sleep(500); await cam(-2.0, 0.12, 6.0, 1.2); mark('18b ELEVATOR ride (interactable -> TRANSIT): carried to the platform'); await tap('Enter'); await sleep(4200); await cam(-1.2, 0.30, 12, 9.5); await sleep(1800);
  await pg.cmd('Page.stopScreencast'); var dur = frames.length ? (frames[frames.length - 1].t - frames[0].t) / 1000 : 0; console.log('frames', frames.length, 'seconds', dur.toFixed(1));
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify({ marks: marks, frames: frames.length, seconds: +dur.toFixed(1) }, null, 1));
  marks.forEach(function (mk, i) { var fi = frames.findIndex(function (f) { return f.t / 1000 >= mk.t + 0.9; }); if (fi >= 0) fs.writeFileSync(path.join(OUT, 'still_' + String(i).padStart(2, '0') + '_' + mk.label.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) + '.png'), Buffer.from(frames[fi].data, 'base64')); });
  var t2 = await pg.cmd('Target.createTarget', { url: 'about:blank' }); var list = await (await fetch('http://127.0.0.1:' + pg.port + '/json/list')).json(); var helper = list.filter(function (x) { return x.id === t2.targetId; })[0]; var ws = new WebSocket(helper.webSocketDebuggerUrl); await new Promise(function (r, j) { ws.onopen = r; ws.onerror = j; });
  var mid = 0, pend = {}; ws.onmessage = function (m) { var d = JSON.parse(typeof m.data === 'string' ? m.data : String(m.data)); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } }; function c2(method, params) { return new Promise(function (r, j) { var id = ++mid; pend[id] = function (d) { d.error ? j(new Error(JSON.stringify(d.error))) : r(d.result); }; ws.send(JSON.stringify({ id: id, method: method, params: params || {} })); }); }
  await c2('Runtime.enable'); var ev2 = async function (expr) { var r = await c2('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval2: ' + JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
  await ev2('window.__F = []; window.__T = []; 1'); for (var c0 = 0; c0 < frames.length; c0 += 40) { var chunk = frames.slice(c0, c0 + 40); await ev2('(function(){var d=' + JSON.stringify(chunk.map(function (f) { return f.data; })) + ';var t=' + JSON.stringify(chunk.map(function (f) { return Math.round(f.t - frames[0].t); })) + ';for(var i=0;i<d.length;i++){window.__F.push(d[i]);window.__T.push(t[i]);} return window.__F.length;})()'); }
  var webm = await ev2('(async function(){ var F=window.__F, T=window.__T; var load=function(i){ return new Promise(function(res){ var im=new Image(); im.onload=function(){res(im)}; im.onerror=function(){res(null)}; im.src="data:image/jpeg;base64,"+F[i]; }); }; var first=await load(0); var w=first.width, h=first.height; var cv=document.createElement("canvas"); cv.width=w; cv.height=h; document.body.appendChild(cv); var ctx=cv.getContext("2d"); ctx.drawImage(first,0,0); var stream=cv.captureStream(30); var mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].filter(function(m){return MediaRecorder.isTypeSupported(m)})[0]; var rec=new MediaRecorder(stream,{mimeType:mime, videoBitsPerSecond: 3000000}); var chunks=[]; rec.ondataavailable=function(e){ if(e.data && e.data.size) chunks.push(e.data); }; var done=new Promise(function(res){ rec.onstop=res; }); rec.start(250); var start=performance.now(); for (var i=1;i<F.length;i++){ var im=await load(i); F[i]=null; while(performance.now()-start<T[i]) await new Promise(function(r){ requestAnimationFrame(r); }); if (im) ctx.drawImage(im,0,0); } await new Promise(function(r){ setTimeout(r,300); }); rec.stop(); await done; var blob=new Blob(chunks,{type:mime}); var b64=await new Promise(function(res){ var fr=new FileReader(); fr.onload=function(){res(fr.result.split(",")[1])}; fr.readAsDataURL(blob); }); return {mime:mime, bytes:blob.size, b64:b64}; })()');   /* frames decoded one at a time and released (no 7k-bitmap pile-up) */
  var vpath = path.join(OUT, 'mahworld_master_review.webm'); fs.writeFileSync(vpath, Buffer.from(webm.b64, 'base64')); console.log('VIDEO FILE ' + vpath + ' ' + webm.bytes + ' bytes ' + dur.toFixed(1) + 's'); ws.close();
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
