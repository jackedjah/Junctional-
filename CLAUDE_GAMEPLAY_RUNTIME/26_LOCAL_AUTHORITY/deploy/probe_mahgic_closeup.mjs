/* Lane D evidence — CLOSE-UP frame sequences of the granular MAHGIC language (owner 2026-09-18 §8): GATHER on the striking limb (4 frames through the
   startup + the contact burst), the VECTOR WAVE front travelling and terminating, the CASCADE CURTAIN falling over the aimed dummy and breaking into
   dust, and a cast in flight. Dev camera (MANUAL LOOK) framed on the effect; normal speed; frames ~110 ms apart. One labelled sheet.
   node 26_LOCAL_AUTHORITY/deploy/probe_mahgic_closeup.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.resolve(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out', 'mahgic'); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 900, height: 620, gpu: true }); var shots = [];
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function shot(tag) { var f = path.join(OUT, 'cu_' + tag + '.png'); await pg.screenshot(f); shots.push({ tag: tag, f: f }); }
async function seq(tag, n, every) { for (var i = 0; i < n; i++) { await shot(tag + '_' + i); await sleep(every); } }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 120000); await sleep(4500); await ev("P.hud.showGuide(false); P.hud.setDev && P.hud.setDev(false); return 1;"); for (var w0 = 0; w0 < 120; w0++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); }
  await ev("P.send('FIELD_PRACTICE',{on:true}); return 1;"); await sleep(300); var dummy = await ev("var r=P.snap().play.rules; return r.others.filter(function(o){return o.id==='FIELD_DUMMY';})[0];");
  var face = async function (dz) { await ev("return P.goTo(" + dummy.position.x + ", " + (dummy.position.z + dz) + ", undefined, undefined, 30000);"); await sleep(200); await ev("P.send('MOVE',{forward:0,strafe:0,run:false,yaw:0}); return 1;"); await sleep(500); };
  /* GATHER: front-¾ close on the striking hand */
  await face(2.2); await ev("P.camFollow(false); P.cam(2.45, 0.02, 2.2, 1.15); return 1;"); await sleep(200);
  await ev("P.send('RULES_SELECT',{category:'PHYSICAL_MAGIC',slot:0}); return 1;"); await sleep(80); await ev("return P.send('RULES_CAST',{});"); await sleep(120); await seq('gather', 5, 110); await sleep(1500);
  /* WAVE: side view along the flight path, the head at the frame centre-left */
  await face(9.0); await ev("P.camFollow(false); P.cam(1.55, 0.05, 5.5, 1.0); return 1;"); await sleep(200);
  await ev("P.send('RULES_SELECT',{category:'SPECIAL_MAGIC',slot:0}); return 1;"); await sleep(80); await ev("return P.send('RULES_CAST',{});"); await sleep(880); await seq('wave', 5, 90); await sleep(1500);
  /* CURTAIN: the fixed camera pivots on the dummy */
  await face(4.0); await ev("return P.send('RULES_LOADOUT',{category:'SPECIAL_MAGIC',slot:1,skill_id:'ATHLETE_CASCADE'});"); await ev("return P.send('LOCK_TARGET',{aim_id:'FIELD_DUMMY'});"); await sleep(200);
  await ev("P.camFollow(false); P.cam(0.9, 0.08, 4.6, 1.3); P.camAt(" + dummy.position.x + ", 0, " + dummy.position.z + "); return 1;"); await sleep(200);
  await ev("P.send('RULES_SELECT',{category:'SPECIAL_MAGIC',slot:1}); return 1;"); await sleep(80); await ev("return P.send('RULES_CAST',{aim_point:{x:" + dummy.position.x + ",z:" + dummy.position.z + "}});"); await sleep(150); await seq('curtain', 7, 170); await sleep(1500);
  await ev("P.camAt(null); P.send('LOCK_TARGET',{aim_id:null}); P.send('RULES_LOADOUT',{category:'SPECIAL_MAGIC',slot:1,skill_id:'ATHLETE_TRACK'}); return 1;"); await sleep(300);
  /* FLIGHT cast: three-quarter from below, the legs trailing, the arms casting */
  await ev("P.send('FLIGHT',{op:'ENTER'}); return 1;"); await sleep(1400); await ev("P.send('FLIGHT',{op:'HOVER'}); return 1;"); await sleep(600); await ev("P.send('MOVE',{forward:1,strafe:0,run:false,yaw:0}); return 1;"); await sleep(900); await ev("P.camFollow(false); P.cam(2.2, 0.06, 3.8, 1.0); return 1;"); await sleep(150);
  await ev("P.send('RULES_SELECT',{category:'SPECIAL_MAGIC',slot:0}); return 1;"); await sleep(60); await ev("return P.send('RULES_CAST',{});"); await sleep(200); await seq('flight_cast', 4, 130);
  await ev("P.send('MOVE',{forward:0,strafe:0,run:false}); P.send('FLIGHT',{op:'EXIT'}); return 1;"); await sleep(500);
} catch (e) { console.error(e); } finally { await pg.close(); }
try { var pg2 = await launchChrome({ width: 1800, height: 1500, gpu: false }); var groups = ['gather', 'wave', 'curtain'];   /* the flight-cast still comes from probe_mahgic (F1) — a dev camera pivoted on a flying body over the district framed building interiors */ var html = '<html><body style="margin:0;background:#0b0f16;color:#eef;font:600 13px system-ui"><div style="padding:6px 10px">GRANULAR MAHGIC close-ups (original candidate, Athlete gold) — rows: GATHER on the striking hand through the startup → contact · VECTOR WAVE front travelling → terminal · CASCADE CURTAIN falling over the aimed dummy → dust · cast in flight · dev camera MANUAL LOOK, normal speed, frames ≈ 90–170 ms apart · the cast-in-flight still is f1_cast_in_flight.png from probe_mahgic</div>' + groups.map(function (g) { var list = shots.filter(function (s) { return s.tag.indexOf(g + '_') === 0; }); return '<div style="display:grid;grid-template-columns:repeat(' + Math.max(4, list.length) + ',1fr);gap:3px;padding:3px">' + list.map(function (s) { return '<div><div style="padding:2px 4px;color:#fd9">' + s.tag + '</div><img src="file:///' + s.f.replace(/\\/g, '/') + '" style="width:100%"></div>'; }).join('') + '</div>'; }).join('') + '</body></html>'; var hp = path.join(OUT, '_closeup.html'); fs.writeFileSync(hp, html); await pg2.goto('file:///' + hp.replace(/\\/g, '/')); await sleep(1500); await pg2.screenshot(path.join(OUT, 'sheet_mahgic_closeup.png')); await pg2.close(); console.log('sheet ok', shots.length); } catch (e) { console.log('sheet failed', e.message); }
srv.close();
