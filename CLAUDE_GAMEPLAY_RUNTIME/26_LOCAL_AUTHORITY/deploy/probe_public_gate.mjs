/* PUBLIC DEMO GATE — real Chromium session against a public address (fresh profile, no cookies): password page render, wrong password,
   correct password, game loads (character + world), refresh keeps the session, logout closes it, assets never served unauthenticated.
   node deploy/probe_public_gate.mjs <base url without trailing slash> [mobile]   e.g. https://fob.systems/mahdemo or https://mahworld-test-preview.netlify.app */
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { launchChrome, sleep } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var OUT = path.join(HERE, 'probe_out'); fs.mkdirSync(OUT, { recursive: true });
var BASE = (process.argv[2] || 'https://mahworld-test-preview.netlify.app').replace(/\/$/, ''); var MOBILE = process.argv[3] === 'mobile'; var PW = process.env.MAHDEMO_PW || ''; var tag = (MOBILE ? 'mob_' : 'web_') + BASE.replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
var PLAY = BASE.indexOf('fob.systems') >= 0 ? BASE + '/claude_gameplay_runtime/26_local_authority/lab/play?field=1' : BASE + '/claude_gameplay_runtime/26_local_authority/lab/play?field=1';
var pg = await launchChrome({ width: MOBILE ? 390 : 1280, height: MOBILE ? 844 : 800, gpu: true }); var log = [];
async function status(u) { return await pg.evaluate("fetch('" + u + "', {credentials:'include'}).then(function(r){ return r.status + ' ' + (r.headers.get('content-type')||''); }).catch(function(e){ return 'ERR ' + e.message; })"); }
try {
  if (MOBILE) { await pg.cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }); await pg.cmd('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' }); }
  /* A fresh visit */
  await pg.goto(BASE); await sleep(2500); await pg.evaluate("(function(){ try { if (window.MAHWORLD_PLAY && window.MAHWORLD_PLAY.hud) window.MAHWORLD_PLAY.hud.showGuide(false); } catch (e) {} return 1; })()"); var url1 = await pg.evaluate('location.href'); var title1 = await pg.evaluate('document.title'); var hasForm = await pg.evaluate("!!document.querySelector('form input[name=password]')");
  log.push('A fresh visit → ' + url1 + ' · title "' + title1 + '" · password form: ' + hasForm); await pg.screenshot(path.join(OUT, tag + '_A_prompt.png'));
  /* F private asset before login */
  log.push('F asset before login → ' + await status(BASE + '/claude_gameplay_runtime/26_local_authority/lab/play.js'));
  /* B wrong password */
  await pg.evaluate("document.querySelector('input[name=password]').value='wrong-password'; document.querySelector('form').submit(); 1"); await sleep(2500);
  var errText = await pg.evaluate("(document.querySelector('.err')||{}).textContent||''"); log.push('B wrong password → ' + location_of(await pg.evaluate('location.href')) + ' · error: "' + errText + '"'); await pg.screenshot(path.join(OUT, tag + '_B_wrong.png'));
  /* C correct password */
  if (!PW) { log.push('C skipped: MAHDEMO_PW not provided to the probe'); } else {
    await pg.evaluate("document.querySelector('input[name=password]').value=" + JSON.stringify(PW) + "; document.querySelector('form').submit(); 1"); await sleep(3000);
    var url3 = await pg.evaluate('location.href'); log.push('C correct password → ' + location_of(url3));
    for (var w = 0; w < 120; w++) { var ready = await pg.evaluate("!!(window.MAHWORLD_PLAY && window.MAHWORLD_PLAY.snap && window.MAHWORLD_PLAY.snap() && window.MAHWORLD_PLAY.snap().play && window.MAHWORLD_PLAY.snap().play.position)"); if (ready) break; await sleep(500); }
    for (var w2 = 0; w2 < 120; w2++) { var dl = await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; var d=P&&P.district?P.district():null; return d?d.loaded.length:-1; })()"); if (dl >= 4) break; await sleep(500); }   /* the four landmark GLBs stream in after boot (16 MB) */
    await sleep(2000); var st = await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; if (!P) return 'no MAHWORLD_PLAY'; var p=P.snap().play; var ri=P.renderInfo?P.renderInfo():null; var d=P.district?P.district():null; var bg=P.sceneDebug&&P.sceneDebug().background&&P.sceneDebug().background.getHex?P.sceneDebug().background.getHex():null; return JSON.stringify({room:p.room, pos:p.position, avatar:P.slot().id, glb:!!P.slot().glb, calls:ri&&ri.calls, tris:ri&&ri.triangles, district:d&&d.loaded.length, sky: bg===0x9fc4e4?'DAY':(bg===0x070c16?'NIGHT':bg)}); })()");
    log.push('C game state: ' + st); await pg.screenshot(path.join(OUT, tag + '_C_game.png'));
    /* controls respond */
    await pg.evaluate("window.MAHWORLD_PLAY.hud.showGuide(false); 1"); await sleep(300); var p0 = await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.snap().play.position)"); await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true})); 1"); await sleep(1200); await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w',bubbles:true})); 1"); await sleep(400); var p1 = await pg.evaluate("JSON.stringify(window.MAHWORLD_PLAY.snap().play.position)"); log.push('C controls: W moved ' + p0 + ' → ' + p1);
    /* no private-network requests */
    var bad = pg.errors.filter(function (e) { return /127\.0\.0\.1|localhost|192\.168|10\.\d+\.\d+/.test(e); }); log.push('C private-network requests in console errors: ' + bad.length);
    /* D refresh */
    await pg.goto(PLAY); await sleep(4000); var after = await pg.evaluate("!!(window.MAHWORLD_PLAY && window.MAHWORLD_PLAY.snap)"); log.push('D refresh keeps the session → game present: ' + after + ' at ' + location_of(await pg.evaluate('location.href')));
    log.push('D asset with session → ' + await status(BASE + '/claude_gameplay_runtime/26_local_authority/lab/play.js'));
    /* E logout */
    await pg.goto(PLAY + '&mahdemo_logout=1'); await sleep(2500); var hasForm2 = await pg.evaluate("!!document.querySelector('form input[name=password]')"); log.push('E logout → password form again: ' + hasForm2 + ' at ' + location_of(await pg.evaluate('location.href'))); await pg.screenshot(path.join(OUT, tag + '_E_logout.png'));
    log.push('E asset after logout → ' + await status(BASE + '/claude_gameplay_runtime/26_local_authority/lab/play.js'));
  }
  /* H password never in served files */
  var html = await pg.evaluate('document.documentElement.outerHTML'); log.push('H password string in served page: ' + (PW && html.indexOf(PW) >= 0 ? 'LEAKED' : 'absent'));
  console.log(log.join('\n')); console.log('console errors (non-404):', pg.errors.filter(function (x) { return !/404/.test(x); }).slice(0, 4));
} finally { await pg.close(); }
function location_of(u) { return u.replace(/mahdemo_s=[^&]+/, ''); }
