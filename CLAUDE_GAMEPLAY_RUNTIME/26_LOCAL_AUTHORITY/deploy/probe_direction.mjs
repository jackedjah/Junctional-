/* MAHWORLD :: DIRECTION PROBE — measures, for eight screen directions + rapid switching, the travel heading (from authoritative
   positions), the authoritative facing, and the rendered root yaw; then attacks after each and records the effect heading.
   node 26_LOCAL_AUTHORITY/deploy/probe_direction.mjs [--shots] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var shots = process.argv.indexOf('--shots') >= 0;
function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); } function deg(a) { return Math.round(a * 180 / Math.PI); }
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 430, height: 932, mobile: true });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; try{ P.hud.showGuide(false); }catch(e){} P.cam(0.35, 0.30, 9.5); return true; })()");
  await sleep(600);
  var DIRS = [['forward', 0, 1], ['back', 0, -1], ['left', -1, 0], ['right', 1, 0], ['fwd-left', -1, 1], ['fwd-right', 1, 1], ['back-left', -1, -1], ['back-right', 1, -1]];
  var rows = [];
  for (var i = 0; i < DIRS.length; i++) {
    var d = DIRS[i];
    var r = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var mv=P.moveVector(" + d[1] + "," + d[2] + "); var samples=[]; var t0=performance.now(); var last=null; while(performance.now()-t0<1400){ await P.send('MOVE',{forward:+mv.f.toFixed(3),strafe:+mv.s.toFixed(3),run:false,yaw:+mv.yaw.toFixed(3)}); await new Promise(function(r){setTimeout(r,90)}); var s=P.snap(); var p=s.play; var e=P.mePose? null:null; var root=(function(){ try{ return P.faceOf? null:null }catch(e){return null} })(); samples.push({t:performance.now()-t0,x:p.position.x,z:p.position.z,facing:p.facing,rootYaw:(window.__rootYaw? window.__rootYaw():null)}); } await P.send('MOVE',{forward:0,strafe:0,run:false}); await new Promise(function(r){setTimeout(r,500)}); var s2=P.snap().play; return {mv:mv,samples:samples,stopFacing:s2.facing}; })()");
    var s = r.samples; var a = s[Math.floor(s.length * 0.4)], b = s[s.length - 1]; var travel = Math.atan2(b.x - a.x, -(b.z - a.z)); var dist = Math.hypot(b.x - a.x, b.z - a.z);
    var row = { dir: d[0], input_yaw: deg(r.mv.yaw), travel_heading: dist > 0.05 ? deg(travel) : null, dist_m: +dist.toFixed(2), facing_end: deg(b.facing), facing_minus_travel: dist > 0.05 ? deg(wrap(b.facing - travel)) : null, stop_facing: deg(r.stopFacing) };
    if (shots) { await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var mv=P.moveVector(" + d[1] + "," + d[2] + "); for(var k=0;k<6;k++){ await P.send('MOVE',{forward:+mv.f.toFixed(3),strafe:+mv.s.toFixed(3),run:false,yaw:+mv.yaw.toFixed(3)}); await new Promise(function(r){setTimeout(r,90)}); } return true; })()"); await pg.screenshot(path.join(OUT, 'move_' + d[0] + '.png')); await pg.evaluate("window.MAHWORLD_PLAY.send('MOVE',{forward:0,strafe:0,run:false})"); await sleep(400); }
    /* attack right after the move, still facing that way: where does the effect go? */
    var at = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var f0=P.snap().play.facing; var a=await P.send('ATTACK',{hint:'UP'}); await new Promise(function(r){setTimeout(r,350)}); var s=P.snap(); var eff=(s.play.rules&&s.play.rules.effects)||(s.play.rules&&s.play.rules.entities)||null; var fx=null; if(eff&&eff.length){ var e=eff[eff.length-1]; fx=e.heading!==undefined?e.heading:null; } return {accepted:!!a.accepted,reason:a.reason||null,id:a.attack_id||a.skill_id||null,facing_at_attack:f0,facing_after:s.play.facing,effect_heading:fx,effects:eff?eff.length:null}; })()");
    row.attack = { accepted: at.accepted, reason: at.reason, id: at.id, facing_at_attack: deg(at.facing_at_attack), facing_after: deg(at.facing_after), effect_heading: at.effect_heading === null ? null : deg(at.effect_heading), effects: at.effects };
    rows.push(row); console.log(JSON.stringify(row)); await sleep(900);
  }
  /* rapid switching: alternate left/right every 120 ms for 2 s, sample facing jitter */
  var sw = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var out=[]; var t0=performance.now(); var k=0; while(performance.now()-t0<2000){ var ix=(k%2?1:-1); var mv=P.moveVector(ix,0); await P.send('MOVE',{forward:+mv.f.toFixed(3),strafe:+mv.s.toFixed(3),run:false,yaw:+mv.yaw.toFixed(3)}); await new Promise(function(r){setTimeout(r,120)}); out.push(P.snap().play.facing); k++; } await P.send('MOVE',{forward:0,strafe:0,run:false}); return out; })()");
  console.log('rapid switch facings (deg):', sw.map(deg).join(' '));
  /* attack while holding a different movement direction: the body must turn into the held direction first */
  var am = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var f=P.moveVector(0,1); for(var k=0;k<5;k++){ await P.send('MOVE',{forward:+f.f.toFixed(3),strafe:+f.s.toFixed(3),run:false,yaw:+f.yaw.toFixed(3)}); await new Promise(function(r){setTimeout(r,90)}); } var l=P.moveVector(-1,0); await P.send('MOVE',{forward:+l.f.toFixed(3),strafe:+l.s.toFixed(3),run:false,yaw:+l.yaw.toFixed(3)}); await new Promise(function(r){setTimeout(r,1500)}); var a=await P.send('ATTACK',{}); await new Promise(function(r){setTimeout(r,120)}); var s=P.snap().play; await P.send('MOVE',{forward:0,strafe:0,run:false}); return {held_yaw:l.yaw, attack:a, facing_after:s.facing}; })()");
  console.log('attack while holding LEFT:', JSON.stringify({ held: deg(am.held_yaw), accepted: am.attack.accepted, reason: am.attack.reason, aim_source: am.attack.aim_source, facing_after: deg(am.facing_after) }));
  await sleep(1500);
  var ds = await pg.evaluate("(async function(){ var P=window.MAHWORLD_PLAY; var f0=P.snap().play.facing; var p0=P.snap().play.position; var d=await P.send('DASH',{dir:'LEFT'}); await new Promise(function(r){setTimeout(r,700)}); var s=P.snap().play; return {f0:f0,p0:p0,dash:d,f1:s.facing,p1:s.position}; })()");
  var trav = Math.atan2(ds.p1.x - ds.p0.x, -(ds.p1.z - ds.p0.z));
  console.log('dash LEFT:', JSON.stringify({ accepted: ds.dash.accepted, reason: ds.dash.reason, facing_before: deg(ds.f0), facing_after: deg(ds.f1), travel: deg(trav), moved_m: +Math.hypot(ds.p1.x - ds.p0.x, ds.p1.z - ds.p0.z).toFixed(2) }));
  var snapKeys = await pg.evaluate("(function(){ var s=window.MAHWORLD_PLAY.snap(); return {play:Object.keys(s.play), rules:s.play.rules?Object.keys(s.play.rules):null, me:s.play.rules&&s.play.rules.me?Object.keys(s.play.rules.me):null}; })()");
  console.log('snapshot keys:', JSON.stringify(snapKeys));
  fs.writeFileSync(path.join(OUT, 'direction_probe.json'), JSON.stringify({ rows: rows, rapid_switch_deg: sw.map(deg), errors: pg.errors }, null, 1));
  console.log('page errors:', pg.errors.length, pg.errors.slice(0, 3));
} finally { await pg.close(); srv.close(); }
