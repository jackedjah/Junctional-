/* NPC_TALK dialog + TRANSIT toast through the client reply path (accepted / reason). node deploy/probe_talk.mjs */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 960, height: 720, gpu: false });
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1'); await waitForGame(pg, 90000); await sleep(1500);
  await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; P.hud.showGuide(false); return 1; })()");
  var npc = await pg.evaluate("JSON.stringify((window.MAHWORLD_PLAY.snap().play.npcs||[]).filter(function(n){return n.quest||n.quest_title||n.talk;}).slice(0,3).map(function(n){return {id:n.id,x:n.position&&n.position.x,z:n.position&&n.position.z}}))"); console.log('npcs', npc);
  var first = JSON.parse(npc)[0]; if (first && first.x !== undefined) { await pg.evaluate("window.MAHWORLD_PLAY.goTo(" + (first.x) + "," + (first.z + 1.6) + "," + first.x + "," + first.z + ")"); await sleep(500); }
  var prompts = await pg.evaluate("JSON.stringify((window.MAHWORLD_PLAY.snap().play.prompts||[]).map(function(p){return p.intent+':'+(p.label||'')}))"); console.log('prompts', prompts);
  await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',key:'Enter',bubbles:true})); 1"); await sleep(900);
  var dlg = await pg.evaluate("(function(){ var d=document.getElementById('g-dialog'); return d ? (d.style.display + ' | ' + d.textContent.slice(0,120)) : 'no #g-dialog'; })()"); console.log('dialog', dlg);
  await pg.screenshot(path.join(OUT, 'talk.png'));
  await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true})); 1"); await sleep(300);
  await pg.evaluate("window.MAHWORLD_PLAY.goTo(26.6, 40)"); await sleep(400);
  await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',key:'Enter',bubbles:true})); 1"); await sleep(500);
  var toast = await pg.evaluate("(function(){ var t=document.getElementById('g-toast'); return t ? t.textContent : 'no toast'; })()"); console.log('toast', toast);
  console.log('errors', pg.errors.filter(function (x) { return !/404/.test(x); }));
} finally { await pg.close(); srv.close(); }
