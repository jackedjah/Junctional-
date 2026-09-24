/* MAHWORLD :: GLITCH HUNT — "the character glitches into pieces" (owner, 2026-09-17). Plays a long varied script (walk / run / turn /
   strafe / back / fly / land / E R T Y / special / guard / dash / H separate + fuse / emotes / practice hits) with the camera close, and
   every ~50 ms audits the player's bones (bone-length ratio vs rest, per-sample jump, NaN) plus the visible-form flags; any anomaly is
   logged with its time + state and a still is captured at that moment. Also samples the nearest NPC rig. Contact sheets of the stills go to
   deploy/probe_out/glitch/. node deploy/probe_glitch_hunt.mjs [static_dist] [desktop|portrait] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); var DIST = argv[0] && !/^(portrait|desktop)$/.test(argv[0]) ? path.resolve(argv[0]) : path.join(HERE, 'static_dist');
var MODE = argv.filter(function (a) { return /^(portrait|desktop)$/.test(a); })[0] || 'desktop'; var TOUCH = MODE === 'portrait'; var VP = TOUCH ? [390, 844] : [1200, 750]; var OUT = path.join(HERE, 'probe_out', 'glitch'); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: VP[0], height: VP[1], gpu: true, unlockFps: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function key(code, down) { await pg.evaluate("document.dispatchEvent(new KeyboardEvent('" + (down ? 'keydown' : 'keyup') + "',{code:'" + code + "',key:'" + (code.startsWith('Key') ? code.slice(3).toLowerCase() : code) + "',bubbles:true})); 1"); }
async function tap(code) { await key(code, true); await sleep(40); await key(code, false); }
var anomalies = [], samples = 0, stills = 0, phase = 'boot'; var t0 = Date.now();
async function audit(note) { var a = await ev("var me=P.boneAudit('me'); var e=P.entityAnimators?null:null; var s=P.snap().play; var fm=(P.mePose()||{}); return {me:me, form:s.form, mahloco:s.mahloco, attack:s.attack?s.attack.state:null, emote:s.emote||null, flight:!!(s.flight&&s.flight.powered), transforming:!!s.transforming};"); samples++; if (!a.me) return; var bad = a.me.nan || a.me.dislocated.length > 0 || a.me.max_jump_m > 0.6 || Math.abs(a.me.worst_ratio - 1) > 0.25; if (bad) { var t = +((Date.now() - t0) / 1000).toFixed(2); anomalies.push({ t: t, phase: phase, note: note || '', audit: a }); if (stills < 24) { await pg.screenshot(path.join(OUT, 'glitch_' + MODE + '_' + String(stills).padStart(2, '0') + '_' + phase + '.png')); stills++; } } }
async function watch(ms, note) { var end = Date.now() + ms; while (Date.now() < end) { await audit(note); await sleep(50); } }
async function P(label, fn) { phase = label; await fn(); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1' + (TOUCH ? '&touch=1' : '')); await waitForGame(pg, 120000); await sleep(7000); await ev("P.hud.showGuide(false); return 1;");
  for (var w = 0; w < 120; w++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(1000);
  await ev("P.boneAudit('me', true); return 1;"); await sleep(100); await ev("P.boneAudit('me'); return 1;");
  await P('idle', async function () { await watch(1500); });
  await P('walk', async function () { await key('KeyW', true); await watch(3000); await key('KeyW', false); await watch(600); });
  await P('run', async function () { await key('ShiftLeft', true); await key('KeyW', true); await watch(3000); await key('KeyW', false); await key('ShiftLeft', false); await watch(800); });
  await P('turns', async function () { for (var y of [1.5708, 3.1416, -1.5708, 0, 2.3, -0.8]) { await ev("return P.send('MOVE',{forward:1,strafe:0,run:false,yaw:" + y + "});"); await watch(700); } await ev("return P.send('MOVE',{forward:0,strafe:0,run:false});"); await watch(500); });
  await P('strafe', async function () { await key('KeyA', true); await watch(1500); await key('KeyA', false); await key('KeyD', true); await watch(1500); await key('KeyD', false); await watch(400); });
  await P('back', async function () { await key('KeyS', true); await watch(2500); await key('KeyS', false); await watch(800); });
  await P('attacks', async function () { await ev("return P.send('MOVE',{forward:0,strafe:0,run:false,yaw:3.1416});"); await watch(300); for (var c of ['KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyE', 'KeyT']) { await tap(c); await watch(1500, c); } });
  await P('special', async function () { await ev("return P.send('RULES_SELECT',{category:'SPECIAL_MAGIC'});"); await watch(200); await tap('KeyE'); await watch(2600); await tap('KeyR'); await watch(2600); await ev("return P.send('RULES_SELECT',{category:'PHYSICAL'});"); });
  await P('guard_dash', async function () { await key('KeyG', true); await watch(1200); await key('KeyG', false); await watch(500); await tap('KeyB'); await watch(1200); await key('KeyW', true); await tap('KeyB'); await watch(1200); await key('KeyW', false); await watch(500); });
  await P('separate', async function () { await tap('KeyH'); await watch(4500); });
  await P('split_walk', async function () { await key('KeyW', true); await watch(3000); await key('KeyW', false); await key('ShiftLeft', true); await key('KeyW', true); await watch(2500); await key('KeyW', false); await key('ShiftLeft', false); await watch(500); });
  await P('fuse', async function () { await tap('KeyH'); await watch(4500); });
  await P('fly', async function () { await tap('KeyF'); await watch(1500); await key('Space', true); await watch(2000); await key('Space', false); await key('KeyW', true); await watch(4000); await key('KeyW', false); await watch(1000); await tap('KeyF'); await watch(5000); });
  await P('emotes', async function () { for (var em of ['WAVE', 'DOUBLE_BICEPS', 'FRONT_LAT_SPREAD', 'THUMBS_UP', 'APPLAUD', 'BACK_LAT_SPREAD', 'NOD', 'BECKON']) { await ev("return P.send('EMOTE',{emote_id:'" + em + "'});"); await watch(2600, em); } });
  await P('practice_hits', async function () { var tgt = await ev("var p=P.snap().play; var o=(p.rules&&p.rules.others||[]).filter(function(x){return !x.ally;}); return o[0]?o[0].id:null;"); if (tgt) { await ev("return P.goTo(20, 20, undefined, undefined, 60000);"); await watch(500); await ev("return P.send('LOCK_TARGET',{aim_id:" + JSON.stringify(tgt) + "});"); for (var i = 0; i < 4; i++) { await tap('KeyE'); await watch(1400); } await ev("return P.send('LOCK_TARGET',{aim_id:null});"); } });
  await P('npc_watch', async function () { var ids = await ev("return P.entityAnimators ? null : null;"); for (var i = 0; i < 40; i++) { var r = await ev("var ids=[]; try { ids=Object.keys(P.snap().play.npcs||{}); } catch(e){} var best=null; (P.snap().play.npcs||[]).forEach(function(n){ var a=P.boneAudit('other:'+n.id); if(a && (a.nan||a.dislocated.length||a.max_jump_m>0.8)) best={id:n.id, a:a}; }); return best;"); if (r) { anomalies.push({ t: +((Date.now() - t0) / 1000).toFixed(2), phase: 'npc', note: r.id, audit: { me: r.a } }); if (stills < 24) { await pg.screenshot(path.join(OUT, 'glitch_' + MODE + '_' + String(stills).padStart(2, '0') + '_npc.png')); stills++; } } await sleep(100); } });
  await pg.screenshot(path.join(OUT, 'glitch_' + MODE + '_end.png'));
} catch (e) { console.log('EXC', String(e && e.stack || e)); }
finally { await pg.close(); srv.close(); }
var rep = { mode: MODE, samples: samples, anomalies: anomalies.length, stills: stills, list: anomalies.slice(0, 60), errors: pg.errors.filter(function (x) { return !/404/.test(x); }).slice(0, 5) };
fs.writeFileSync(path.join(OUT, 'glitch_' + MODE + '.json'), JSON.stringify(rep, null, 1));
console.log('samples', samples, 'anomalies', anomalies.length, 'stills', stills); anomalies.slice(0, 40).forEach(function (a) { console.log(a.t + 's', a.phase, a.note, 'ratio', a.audit.me.worst_ratio, a.audit.me.worst_bone, 'jump', a.audit.me.max_jump_m, a.audit.me.jump_bone, 'disloc', JSON.stringify(a.audit.me.dislocated).slice(0, 120), 'nan', a.audit.me.nan, a.audit.attack || '', a.audit.emote || '', a.audit.form); });
