/* MAHWORLD :: MOVEMENT REVIEW RECORDING (motion precision pass, section M)
   One continuous real-GPU screencast of the static demo, assembled to WebM in-page (no ffmpeg on this machine), with labelled chapter
   stills. Sequence: W/A/S/D body turning · X gather → seam light → star burst → separated hover · long separated gait (side) · close
   lower leg + knee · raised-arm shoulder (front lat spread) · double biceps + muscle · V attack · number-key pattern recall · explicit
   muscle proof · residents + demo quest NPC. The character stays in frame; the HUD stays visible for the control chapters.
   node deploy/record_review.mjs [tag]  → deploy/review/<tag>/mahworld_motion_review.webm + still_NN_<label>.png + marks.json */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var tag = process.argv[2] || 'motion_' + new Date().toISOString().slice(0, 10);
var OUT = path.join(HERE, 'review', tag); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 960, height: 720, gpu: true });
var frames = [], marks = [], t0 = 0;
function mark(label) { marks.push({ t: +((performance.now() - t0) / 1000).toFixed(2), label: label }); console.log(((performance.now() - t0) / 1000).toFixed(1) + 's  ' + label); }
async function key(code, down) { var k = code.replace('Key', '').replace('Digit', '').toLowerCase(); await pg.evaluate("document.dispatchEvent(new KeyboardEvent('" + (down ? 'keydown' : 'keyup') + "',{code:'" + code + "',key:'" + k + "',bubbles:true})); 1"); }
async function hold(codes, ms) { for (var c of codes) await key(c, true); await sleep(ms); for (var c2 of codes) await key(c2, false); }
async function cam(yaw, pitch, dist, pivot) { await pg.evaluate("window.MAHWORLD_PLAY.cam(" + yaw + "," + pitch + "," + dist + "," + (pivot === undefined ? 'null' : pivot) + ")"); }
async function yawOf() { return await pg.evaluate("window.MAHWORLD_PLAY.mePose().root_yaw"); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 90000); await sleep(5000);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); if (P.camFollow) P.camFollow(false); return 1; })()");
  pg.on('Page.screencastFrame', function (p) { frames.push({ t: performance.now() - t0, data: p.data }); pg.cmd('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(function () { }); });
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(0, -12)"); await sleep(600);
  t0 = performance.now(); await pg.cmd('Page.startScreencast', { format: 'jpeg', quality: 72, maxWidth: 960, maxHeight: 720, everyNthFrame: 1 });
  /* 1. movement facing: camera fixed behind the start orientation; the body turns to every travel direction */
  await cam(0.0, 0.42, 6.5); await sleep(400); mark('WASD: body faces travel — W');
  await hold(['KeyW'], 1500); await sleep(300); mark('A (turns left, travels left)'); await hold(['KeyA'], 1500); await sleep(300);
  mark('S (turns around, travels back)'); await hold(['KeyS'], 1500); await sleep(300); mark('D (turns right)'); await hold(['KeyD'], 1500); await sleep(300); mark('W+A diagonal'); await hold(['KeyW', 'KeyA'], 1200); await sleep(600);
  /* 2. transformation from front-3/4 */
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(-3, -13, -3, -8)"); await sleep(500); var y0 = await yawOf(); await cam(y0 + Math.PI + 0.55, 0.06, 3.6, 0.95); await sleep(400); mark('TRANSFORM: X gather → seam light → aura → star burst → separated hover');
  await pg.evaluate('window.MAHWORLD_PLAY.send("TRANSFORM",{to:"SPLIT"})'); await sleep(3600);
  /* 3. long separated gait, side view */
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(-18, -10)"); await sleep(500); await cam(-Math.PI / 2, 0.42, 6.5); await sleep(200); await key('KeyW', true); await sleep(1300); var y1 = await yawOf(); await cam(y1 + Math.PI + Math.PI / 2, 0.02, 3.4, 0.8); mark('SEPARATED GAIT (side): long deliberate strides, knee flexion, tips hover'); await sleep(2600);
  /* 4. close lower leg + knee */
  await cam(y1 + Math.PI + Math.PI / 2 + 0.35, 0.0, 1.5, 0.45); mark('CLOSE: complete lower leg, knee bend, front / side / inner surfaces'); await sleep(2200); await cam(y1 + Math.PI + Math.PI * 0.25, 0.0, 1.5, 0.45); await sleep(1600); await key('KeyW', false); await sleep(600);
  /* 5. raised-arm shoulder + flex */
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(-3, -13)"); await sleep(400); await pg.evaluate('window.MAHWORLD_PLAY.send("TRANSFORM",{to:"FUSED"})'); await sleep(2800); var y2 = await yawOf(); await cam(y2 + Math.PI + 0.3, 0.05, 3.0, 1.15); await sleep(300);
  mark('RAISED ARMS: shoulder cap rides the humerus (FRONT LAT SPREAD)'); await pg.evaluate('window.MAHWORLD_PLAY.send("EMOTE",{emote_id:"FRONT_LAT_SPREAD"})'); await sleep(3200);
  mark('DOUBLE BICEPS: clavicle / deltoid / humerus / elbow / wrist + muscle contraction'); await pg.evaluate('window.MAHWORLD_PLAY.send("EMOTE",{emote_id:"DOUBLE_BICEPS"})'); await sleep(1500); await cam(y2 + Math.PI + 0.3, 0.05, 2.2, 1.35); await sleep(1800);
  /* 6. controls: V attack + number keys */
  await cam(y2 + Math.PI + 0.5, 0.2, 4.5, 1.0); await sleep(300); mark('V = armed attack'); await hold(['KeyV'], 120); await sleep(1500);
  await pg.evaluate("(function(){ var H=window.MAHWORLD_PLAY.hud; var r=window.MAHWORLD_PLAY.snap().play.rules; if (H.tapMode && r) H.tapMode(r.me.attack_mode, 'script'); return 1; })()"); await sleep(500);
  mark('NUMBER KEYS: 2 / 3 / 1 recall movement patterns of the current category (dock highlights), V performs');
  await hold(['Digit2'], 100); await sleep(700); await hold(['KeyV'], 120); await sleep(1500); await hold(['Digit3'], 100); await sleep(700); await hold(['KeyV'], 120); await sleep(1500); await hold(['Digit1'], 100); await sleep(700);
  /* 7. explicit muscle proof */
  await cam(y2 + Math.PI + 0.35, 0.05, 1.7, 1.25); await sleep(300); mark('MUSCLE PROOF: biceps + deltoid + pec/lat contraction on demand (layer 2 morphs + layer 3 tension)');
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; ['BICEPS_L','BICEPS_R','DELTOID_L','DELTOID_R','PEC_L','PEC_R','LAT_L','LAT_R','ABS'].forEach(function(n){ P.muscleSet('me', n, 1, 2.2); }); return 1; })()"); await sleep(2600); await sleep(1200);
  /* 8. town + quest NPC */
  mark('TOWN: nine residents (every class / sex except the player)'); await cam(0.3, 0.6, 24, 1.0); await sleep(2200);
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(-3.5, 14.2)"); await sleep(1500); await cam(3.3, 0.18, 4.4, 1.2); await sleep(500); mark('DEMO QUEST NPC: TALK prompt → placeholder dialog');
  await pg.evaluate("window.MAHWORLD_PLAY.send('NPC_TALK',{npc:'NPC_VISIONARY_M'}).then(function(r){ if (r && r.ok) window.MAHWORLD_PLAY.hud.dialog('NPC_VISIONARY_M', r.title, r.lines); })"); await sleep(2600);
  await pg.evaluate("window.MAHWORLD_PLAY.hud.dialogNext()"); await sleep(1800);
  await pg.cmd('Page.stopScreencast'); var dur = frames.length ? (frames[frames.length - 1].t - frames[0].t) / 1000 : 0; console.log('frames', frames.length, 'seconds', dur.toFixed(1), 'fps', (frames.length / Math.max(0.1, dur)).toFixed(1));
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify({ marks: marks, frames: frames.length, seconds: +dur.toFixed(1) }, null, 1));
  marks.forEach(function (mk, i) { var fi = frames.findIndex(function (f) { return f.t / 1000 >= mk.t + 0.7; }); if (fi >= 0) fs.writeFileSync(path.join(OUT, 'still_' + String(i).padStart(2, '0') + '_' + mk.label.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) + '.png'), Buffer.from(frames[fi].data, 'base64')); });
  /* assemble WebM in a helper page */
  var t2 = await pg.cmd('Target.createTarget', { url: 'about:blank' }); var at2 = await pg.cmd('Target.attachToTarget', { targetId: t2.targetId, flatten: true }); var sid2 = at2.sessionId;
  /* the probe lib's cmd has no sessionId routing: drive the helper through a second raw socket */
  var list = await (await fetch('http://127.0.0.1:' + pg.port + '/json/list')).json();
  var helper = list.filter(function (x) { return x.type === 'page' && x.id === t2.targetId; })[0]; var ws = new WebSocket(helper.webSocketDebuggerUrl); await new Promise(function (r, j) { ws.onopen = r; ws.onerror = j; });
  var mid = 0, pend = {}; ws.onmessage = function (m) { var d = JSON.parse(typeof m.data === 'string' ? m.data : String(m.data)); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
  function c2(method, params) { return new Promise(function (r, j) { var id = ++mid; pend[id] = function (d) { d.error ? j(new Error(JSON.stringify(d.error))) : r(d.result); }; ws.send(JSON.stringify({ id: id, method: method, params: params || {} })); }); }
  await c2('Runtime.enable'); var ev2 = async function (expr) { var r = await c2('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval2: ' + JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
  await ev2('window.__F = []; window.__T = []; 1'); var CH = 40; for (var c0 = 0; c0 < frames.length; c0 += CH) { var chunk = frames.slice(c0, c0 + CH); await ev2('(function(){var d=' + JSON.stringify(chunk.map(function (f) { return f.data; })) + ';var t=' + JSON.stringify(chunk.map(function (f) { return Math.round(f.t - frames[0].t); })) + ';for(var i=0;i<d.length;i++){window.__F.push(d[i]);window.__T.push(t[i]);} return window.__F.length;})()'); }
  var webm = await ev2('(async function(){ var F=window.__F, T=window.__T; if(!F.length) return {error:"no frames"}; var imgs=[]; for (var i=0;i<F.length;i++){ imgs.push(await new Promise(function(res){ var im=new Image(); im.onload=function(){res(im)}; im.onerror=function(){res(null)}; im.src="data:image/jpeg;base64,"+F[i]; })); } var w=imgs[0].width, h=imgs[0].height; var cv=document.createElement("canvas"); cv.width=w; cv.height=h; document.body.appendChild(cv); var ctx=cv.getContext("2d"); ctx.drawImage(imgs[0],0,0); if (typeof MediaRecorder==="undefined" || !cv.captureStream) return {error:"MediaRecorder unavailable"}; var stream=cv.captureStream(30); var mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].filter(function(m){return MediaRecorder.isTypeSupported(m)})[0]; if(!mime) return {error:"no webm codec"}; var rec=new MediaRecorder(stream,{mimeType:mime, videoBitsPerSecond: 3000000}); var chunks=[]; rec.ondataavailable=function(e){ if(e.data && e.data.size) chunks.push(e.data); }; var done=new Promise(function(res){ rec.onstop=res; }); rec.start(250); var start=performance.now(); var i=0; await new Promise(function(res){ function tick(){ var el=performance.now()-start; while(i<F.length && T[i]<=el){ if (imgs[i]) ctx.drawImage(imgs[i],0,0); i++; } if(i>=F.length){ setTimeout(res,300); return; } requestAnimationFrame(tick);} tick(); }); rec.stop(); await done; var blob=new Blob(chunks,{type:mime}); var b64=await new Promise(function(res){ var fr=new FileReader(); fr.onload=function(){res(fr.result.split(",")[1])}; fr.readAsDataURL(blob); }); return {mime:mime, bytes:blob.size, w:w, h:h, b64:b64}; })()');
  if (webm && webm.b64) { var vpath = path.join(OUT, 'mahworld_motion_review.webm'); fs.writeFileSync(vpath, Buffer.from(webm.b64, 'base64')); console.log('VIDEO FILE ' + vpath + ' ' + webm.bytes + ' bytes ' + webm.mime + ' ' + webm.w + 'x' + webm.h + ' ' + dur.toFixed(1) + 's'); }
  else { console.log('WEBM UNAVAILABLE', webm && webm.error); var fdir = path.join(OUT, 'frames'); fs.mkdirSync(fdir, { recursive: true }); frames.forEach(function (f, i) { fs.writeFileSync(path.join(fdir, 'f' + String(i).padStart(5, '0') + '.jpg'), Buffer.from(f.data, 'base64')); }); }
  ws.close();
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
