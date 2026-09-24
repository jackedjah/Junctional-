/* Reference-video frame sampler: plays a local video in headless Chrome and screenshots frames at given times (no ffmpeg on this PC).
   node deploy/video_frames.mjs <video file> <out dir> [t1,t2,...seconds | every:N] */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { launchChrome, sleep } from './probe_lib.mjs';
var file = path.resolve(process.argv[2]); var out = path.resolve(process.argv[3] || 'frames'); fs.mkdirSync(out, { recursive: true }); var spec = process.argv[4] || 'every:4';
var srv = http.createServer(function (req, res) { if (req.url.startsWith('/v')) { var st = fs.statSync(file); var range = req.headers.range; var type = /\.mov$/i.test(file) ? 'video/quicktime' : 'video/mp4'; if (range) { var m = /bytes=(\d+)-(\d*)/.exec(range); var s = +m[1], e = m[2] ? +m[2] : st.size - 1; res.writeHead(206, { 'Content-Type': type, 'Content-Range': 'bytes ' + s + '-' + e + '/' + st.size, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1 }); fs.createReadStream(file, { start: s, end: e }).pipe(res); } else { res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' }); fs.createReadStream(file).pipe(res); } return; } res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<html><body style="margin:0;background:#000"><video id="v" src="/v" muted playsinline style="width:100vw;height:100vh;object-fit:contain"></video></body></html>'); });
await new Promise(function (r) { srv.listen(0, '127.0.0.1', r); }); var port = srv.address().port;
var pg = await launchChrome({ width: 1280, height: 720, gpu: true });
try {
  await pg.goto('http://127.0.0.1:' + port + '/'); await sleep(500);
  var meta = null; for (var i = 0; i < 60; i++) { meta = await pg.evaluate("(function(){ var v=document.getElementById('v'); return v.readyState>=1 ? { d: v.duration, w: v.videoWidth, h: v.videoHeight, err: v.error?v.error.code:null } : null; })()"); if (meta) break; await sleep(250); }
  console.log('video', path.basename(file), JSON.stringify(meta));
  if (!meta || !isFinite(meta.d)) { console.log('cannot decode in Chrome'); } else {
    var times = spec.startsWith('every:') ? (function () { var n = parseFloat(spec.slice(6)); var t = []; for (var s = 0.2; s < meta.d; s += n) t.push(+s.toFixed(2)); return t; })() : spec.split(',').map(Number);
    for (var t of times) { await pg.evaluate("(function(){ var v=document.getElementById('v'); v.currentTime=" + t + "; return 1; })()"); for (var k = 0; k < 40; k++) { var ok = await pg.evaluate("(function(){ var v=document.getElementById('v'); return !v.seeking && v.readyState>=2; })()"); if (ok) break; await sleep(100); } await sleep(150); var f = path.join(out, path.basename(file).replace(/\.[^.]+$/, '') + '_t' + String(t).replace('.', '_') + '.png'); await pg.screenshot(f); console.log('frame', t, path.basename(f)); }
  }
} catch (e) { console.error(e); } finally { await pg.close(); srv.close(); }
