/* CONVERGENCE PASS 4 — SOURCE-TO-RUNTIME FIDELITY DIAGNOSIS (O5 / G25 / G26 / G28), in the real page.
   Matched captures of the LOCAL player at a fixed dev camera (same pose, same framing) in: production shading · neutral opaque shading (no maps) ·
   wireframe · fade forced off; native 1:1 crops of the drawing buffer; the buffer chain (device px, render scale, tier, antialias, tone mapping,
   exposure, env intensity); texture facts (sizes, filters, anisotropy, mipmaps) for the character, one Tripo landmark (gym) and one native
   building (training hall). Runs at the emulated DPR given (1 = the harness default, 2 / 3 = phone-like) so the "pixelation" cause is measured,
   not guessed. node deploy/probe_fidelity.mjs [static_dist] [--dpr 1|2|3] [--tier LOW|MED|HIGH]   Touch = not needed (desktop inputs). */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); var DIST = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : path.join(HERE, 'static_dist');
function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; } var DPR = +arg('--dpr', '1'); var TIER = arg('--tier', ''); var TAG = 'dpr' + DPR + (TIER ? '_' + TIER.toLowerCase() : '');
var OUT = path.join(HERE, 'probe_out', 'fidelity'); fs.mkdirSync(OUT, { recursive: true }); var VP = [390, 844];
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: VP[0], height: VP[1], gpu: true, mobile: true, dpr: DPR }); var pass = 0, fail = 0, lines = [];
function ok(id, cond, detail) { (cond ? pass++ : fail++); var l = (cond ? 'PASS ' : 'FAIL ') + id + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''); lines.push(l); console.log(l.slice(0, 700)); }
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
async function shot(name) { await pg.screenshot(path.join(OUT, 'fid_' + TAG + '_' + name + '.png')); }
var report = { tag: TAG, dpr: DPR, tier: TIER || '(default)', viewport: VP, checks: lines };
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1&touch=1' + (TIER ? '&quality=' + TIER : '')); await waitForGame(pg, 120000); await sleep(6000); await ev("P.hud.showGuide(false); return 1;");
  for (var w = 0; w < 120; w++) { var dl = await ev("var d=P.district?P.district():null; return d?d.loaded.length:-1;"); if (dl >= 4) break; await sleep(500); } await sleep(1500);
  /* ── buffer chain ── */
  var chain = await ev("var r=P.renderChain?P.renderChain():null; return {renderer:r, dpr: devicePixelRatio, css:[innerWidth,innerHeight]};");
  report.buffer_chain = chain; console.log(JSON.stringify(chain));
  ok('B1 the buffer chain is reported: device px, drawing buffer, render scale, tier, antialias, tone mapping, exposure', !!chain && !!chain.renderer && chain.renderer.drawing_buffer && chain.renderer.pixel_ratio !== undefined, chain);
  /* ── textures of the three subjects ── */
  var tex = await ev("return P.textureAudit ? P.textureAudit() : null;"); report.textures = tex; ok('T1 texture facts are reported for the player, the gym (Tripo runtime derivative) and the training hall (native)', !!tex && tex.me && tex.gym && tex.native, tex && { me: tex.me && tex.me.count, gym: tex.gym && tex.gym.count, native: tex.native && tex.native.count });
  /* ── matched captures at a fixed dev camera: production, neutral opaque, wireframe, fade off ── */
  await ev("return P.goTo(20, 30, undefined, undefined, 60000);"); await sleep(500); await ev("return P.send('MOVE',{forward:0,strafe:0,run:false,yaw:0});"); await sleep(1200);
  var views = [{ n: 'gameplay', yaw: 0, pitch: 0.2, dist: 7.6, pivot: 1.2 }, { n: 'close_back', yaw: 0, pitch: 0.15, dist: 2.2, pivot: 1.2 }, { n: 'close_side', yaw: 1.5708, pitch: 0.12, dist: 2.2, pivot: 1.2 }, { n: 'close_front', yaw: 3.1416, pitch: 0.12, dist: 2.2, pivot: 1.2 }];
  for (var vi = 0; vi < views.length; vi++) { var v = views[vi];
    await ev("P.cam(" + v.yaw + ", " + v.pitch + ", " + v.dist + ", " + v.pivot + "); P.camCfg('fade_below_m', 0); return 1;"); await sleep(600); await shot(v.n + '_production');
    await ev("return P.shadeMode ? P.shadeMode('neutral') : false;"); await sleep(300); await shot(v.n + '_neutral');
    await ev("return P.shadeMode ? P.shadeMode('wire') : false;"); await sleep(300); await shot(v.n + '_wireframe');
    await ev("return P.shadeMode ? P.shadeMode('production') : false;"); await sleep(200); }
  await ev("P.cam(null); P.camCfg('fade_below_m', 1.3); return 1;");
  var modes = await ev("return P.shadeMode ? P.shadeMode() : null;"); ok('C1 matched captures saved for 4 views × production / neutral / wireframe (' + OUT + ')', modes !== null, modes);
  /* ── native 1:1 crop of the gameplay view (the drawing buffer at its real size) ── */
  await ev("P.cam(0, 0.2, 7.6, 1.2); return 1;"); await sleep(500); var crop = await ev("P.renderOnce(); var c=document.getElementById('view'); var gl=c.getContext('webgl2')||c.getContext('webgl'); var w=gl.drawingBufferWidth, h=gl.drawingBufferHeight; var b=P.screenBox(); if(!b) return null; var s=(devicePixelRatio||1)*(w/innerWidth/(devicePixelRatio||1)); var x0=Math.max(0,Math.floor(b.left*w/innerWidth)-8), y0=Math.max(0,Math.floor(b.top*h/innerHeight)-8), cw=Math.min(w-x0,Math.ceil((b.right-b.left)*w/innerWidth)+16), ch=Math.min(h-y0,Math.ceil((b.bottom-b.top)*h/innerHeight)+16); var px=new Uint8Array(cw*ch*4); gl.readPixels(x0, h-y0-ch, cw, ch, gl.RGBA, gl.UNSIGNED_BYTE, px); var cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; var ctx=cv.getContext('2d'); var img=ctx.createImageData(cw,ch); for(var y=0;y<ch;y++){ for(var x=0;x<cw;x++){ var si=((ch-1-y)*cw+x)*4, di=(y*cw+x)*4; img.data[di]=px[si]; img.data[di+1]=px[si+1]; img.data[di+2]=px[si+2]; img.data[di+3]=255; } } ctx.putImageData(img,0,0); return {w:cw,h:ch,buffer:[w,h],box_px:[Math.round((b.right-b.left)*w/innerWidth), Math.round((b.bottom-b.top)*h/innerHeight)], data:cv.toDataURL('image/png').split(',')[1]};"); await ev("P.cam(null); return 1;");
  if (crop) { fs.writeFileSync(path.join(OUT, 'fid_' + TAG + '_native_crop.png'), Buffer.from(crop.data, 'base64')); report.native_crop = { w: crop.w, h: crop.h, buffer: crop.buffer, box_px: crop.box_px }; }
  ok('N1 a native 1:1 crop of him at gameplay distance was read from the drawing buffer (his box is ' + (crop ? crop.box_px[1] : '?') + ' buffer px tall at DPR ' + DPR + ')', !!crop && crop.h > 40, crop && { buffer: crop.buffer, box_px: crop.box_px });
  ok('Z zero page / console errors', pg.errors.filter(function (x) { return !/404/.test(x); }).length === 0, pg.errors.filter(function (x) { return !/404/.test(x); }).slice(0, 3));
} catch (e) { ok('X probe completed without an exception', false, String(e && e.stack || e)); }
finally { await pg.close(); srv.close(); }
report.pass = pass; report.fail = fail; fs.writeFileSync(path.join(OUT, 'fidelity_' + TAG + '.json'), JSON.stringify(report, null, 1));
console.log('\nRESULT fidelity ' + TAG + ': ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
