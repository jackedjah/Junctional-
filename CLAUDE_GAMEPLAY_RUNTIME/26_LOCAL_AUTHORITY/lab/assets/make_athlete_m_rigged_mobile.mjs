/* MAHWORLD PLAYABLE SAMPLE :: ATHLETE_M rigged preview — MOBILE TEXTURE VARIANT (dev_0.3)
   Derives `athlete_m_preview/dev_0.3/Mah_Athlete_M_rigged_mobile.glb` from the dev_0.2 derivative auto-rig by downscaling the two embedded
   authentic Tripo JPEG textures (8192² base colour + 8192² normal map) for phone load. No image library exists on this machine and installs
   are forbidden, so the resampling is done by the existing Chrome (headless, DevTools protocol): each JPEG is decoded by the browser, drawn
   onto a canvas at the target size and re-encoded as JPEG. Geometry, accessors, the 17-joint skin (JOINTS_0 / WEIGHTS_0), nodes, material
   and extensionsUsed are copied byte-for-byte; only the two image bufferViews change and every bufferView is re-packed 4-byte aligned.
   Never touches dev_0.1, dev_0.2, RAW_10_MODELS, WORKING_10_MODELS or any Astra folder.
   Usage: node 26_LOCAL_AUTHORITY/lab/assets/make_athlete_m_rigged_mobile.mjs [--base 2048] [--normal 2048] [--q 0.86] [--qn 0.9] */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net'; import crypto from 'node:crypto'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var argv = process.argv.slice(2); function arg(k, d) { var i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }
var BASE_PX = parseInt(arg('--base', '2048'), 10); var NORMAL_PX = parseInt(arg('--normal', '2048'), 10); var Q_BASE = parseFloat(arg('--q', '0.86')); var Q_NORMAL = parseFloat(arg('--qn', '0.9'));
var SRC_DIR = path.join(HERE, 'athlete_m_preview', 'dev_0.2'); var SRC = path.join(SRC_DIR, 'Mah_Athlete_M_rigged.glb'); var SRC_MANIFEST = path.join(SRC_DIR, 'manifest.json');
var OUT_DIR = path.join(HERE, 'athlete_m_preview', 'dev_0.3'); var OUT = path.join(OUT_DIR, 'Mah_Athlete_M_rigged_mobile.glb');
var CHROME = process.env.MAHWORLD_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
function freePort() { return new Promise(function (res) { var s = net.createServer(); s.listen(0, '127.0.0.1', function () { var p = s.address().port; s.close(function () { res(p); }); }); }); }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
/* ---- parse GLB ---- */
var glb = fs.readFileSync(SRC); if (glb.readUInt32LE(0) !== 0x46546C67) throw new Error('not a GLB'); var jsonLen = glb.readUInt32LE(12); var json = JSON.parse(glb.slice(20, 20 + jsonLen).toString('utf8')); var binLen = glb.readUInt32LE(20 + jsonLen); var bin = glb.slice(28 + jsonLen, 28 + jsonLen + binLen);
var srcSha = sha256(glb); console.log('source', SRC, glb.length, 'bytes sha256', srcSha);
function jpegSize(buf) { var i = 2; while (i < buf.length) { if (buf[i] !== 0xFF) { i++; continue; } var m = buf[i + 1]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }; var len = buf.readUInt16BE(i + 2); i += 2 + len; } return null; }
var chunks = json.bufferViews.map(function (bv) { return bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength); });
var imgs = json.images.map(function (im, idx) { var b = chunks[im.bufferView]; return { idx: idx, name: im.name, bufferView: im.bufferView, bytes: b, size: jpegSize(b) }; });
imgs.forEach(function (im) { console.log('image', im.idx, im.name, im.bytes.length, 'bytes', im.size ? im.size.w + 'x' + im.size.h : '?'); });
/* ---- resample in headless Chrome ---- */
var port = await freePort(); var udd = fs.mkdtempSync(path.join(os.tmpdir(), 'mahworld-tex-'));
var chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=' + port, '--user-data-dir=' + udd, 'about:blank'], { stdio: 'ignore' });
var wsUrl = null; for (var i = 0; i < 100 && !wsUrl; i++) { await wait(200); try { var v = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json(); wsUrl = v.webSocketDebuggerUrl; } catch (e) { } }
if (!wsUrl) { chrome.kill(); throw new Error('chrome devtools endpoint did not come up'); }
var ws = new WebSocket(wsUrl); await new Promise(function (r, j) { ws.onopen = r; ws.onerror = j; }); var msgId = 0; var pending = {}; var sessionId = null;
ws.onmessage = function (ev) { var m = JSON.parse(ev.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
function cdp(method, params) { return new Promise(function (res, rej) { var id = ++msgId; pending[id] = function (m) { if (m.error) rej(new Error(method + ': ' + JSON.stringify(m.error))); else res(m.result); }; var msg = { id: id, method: method, params: params || {} }; if (sessionId) msg.sessionId = sessionId; ws.send(JSON.stringify(msg)); }); }
var t = await cdp('Target.createTarget', { url: 'about:blank' }); var at = await cdp('Target.attachToTarget', { targetId: t.targetId, flatten: true }); sessionId = at.sessionId; await cdp('Runtime.enable');
async function resample(im, px, q) { var t0 = Date.now(); var dataUrl = 'data:image/jpeg;base64,' + im.bytes.toString('base64');
  var expr = '(async function(){ var img = new Image(); await new Promise(function(res, rej){ img.onload = res; img.onerror = function(){ rej(new Error("decode failed")); }; img.src = ' + JSON.stringify(dataUrl) + '; }); var c = document.createElement("canvas"); c.width = ' + px + '; c.height = ' + px + '; var g = c.getContext("2d"); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, ' + px + ', ' + px + '); return { w: img.naturalWidth, h: img.naturalHeight, data: c.toDataURL("image/jpeg", ' + q + ').split(",")[1] }; })()';
  var r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('resample ' + im.name + ': ' + JSON.stringify(r.exceptionDetails).slice(0, 300)); var out = Buffer.from(r.result.value.data, 'base64'); console.log('resampled', im.name, r.result.value.w + 'x' + r.result.value.h, '->', px + 'x' + px, 'q', q, out.length, 'bytes', (Date.now() - t0) + ' ms'); return out; }
var newBytes = {}; newBytes[imgs[0].bufferView] = await resample(imgs[0], BASE_PX, Q_BASE); newBytes[imgs[1].bufferView] = await resample(imgs[1], NORMAL_PX, Q_NORMAL);
try { await cdp('Target.closeTarget', { targetId: t.targetId }); } catch (e) { } ws.close(); chrome.kill(); await wait(300); try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) { }
/* ---- re-pack bufferViews (4-byte aligned), everything else untouched ---- */
var parts = []; var offset = 0; var outViews = json.bufferViews.map(function (bv, i) { var b = newBytes[i] !== undefined ? newBytes[i] : chunks[i]; var nb = Object.assign({}, bv); nb.byteOffset = offset; nb.byteLength = b.length; parts.push(b); var pad = (4 - (b.length % 4)) % 4; if (pad) parts.push(Buffer.alloc(pad)); offset += b.length + pad; return nb; });
var outJson = JSON.parse(JSON.stringify(json)); outJson.bufferViews = outViews; outJson.buffers = [{ byteLength: offset }];
outJson.asset = Object.assign({}, outJson.asset || {}, { generator: (outJson.asset && outJson.asset.generator ? outJson.asset.generator + ' + ' : '') + 'MAHWORLD make_athlete_m_rigged_mobile.mjs (dev_0.3: textures ' + BASE_PX + '/' + NORMAL_PX + ')' });
var outBin = Buffer.concat(parts); var jsonBuf = Buffer.from(JSON.stringify(outJson), 'utf8'); var jpad = (4 - (jsonBuf.length % 4)) % 4; if (jpad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jpad, 0x20)]);
var header = Buffer.alloc(12); header.writeUInt32LE(0x46546C67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + outBin.length, 8);
var jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4E4F534A, 4); var bh = Buffer.alloc(8); bh.writeUInt32LE(outBin.length, 0); bh.writeUInt32LE(0x004E4942, 4);
var outGlb = Buffer.concat([header, jh, jsonBuf, bh, outBin]); fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(OUT, outGlb); var outSha = sha256(outGlb);
console.log('wrote', OUT, outGlb.length, 'bytes sha256', outSha, '(' + (100 * outGlb.length / glb.length).toFixed(1) + '% of dev_0.2)');
/* ---- manifest ---- */
var mf = JSON.parse(fs.readFileSync(SRC_MANIFEST, 'utf8')); mf.export_id = 'ATHLETE_M_RIGGED_MOBILE'; mf.version = 'dev_0.3'; mf.sha256 = outSha; mf.files = ['Mah_Athlete_M_rigged_mobile.glb']; mf.owner_review_status = 'CANDIDATE'; mf.forward_axis = '-Z'; mf.source_forward_axis = '+Z';
mf.preview_status = 'DEVELOPMENT_PREVIEW_UNAPPROVED (mobile texture variant: textures downscaled from 8192² to ' + BASE_PX + '² (base colour, JPEG q' + Q_BASE + ') / ' + NORMAL_PX + '² (normal map, JPEG q' + Q_NORMAL + ') for phone load; derived from dev_0.2 sha ' + srcSha.slice(0, 16) + '… by browser-canvas resampling; geometry, skin weights, skeleton and material unchanged; ' + (mf.preview_status ? String(mf.preview_status).replace(/^DEVELOPMENT_PREVIEW_UNAPPROVED \(/, '').replace(/\)$/, '') : '') + ')';
mf.derived_from = { export_id: 'ATHLETE_M_RIGGED_PREVIEW', version: 'dev_0.2', sha256: srcSha, file: 'Mah_Athlete_M_rigged.glb' }; mf.textures = { base_color: BASE_PX + 'x' + BASE_PX + ' jpeg q' + Q_BASE, normal: NORMAL_PX + 'x' + NORMAL_PX + ' jpeg q' + Q_NORMAL, source: '8192x8192 jpeg (both)' };
mf.limitations = (mf.limitations || []).concat(['textures resampled in the browser canvas (bilinear/high-quality smoothing), not a mip-aware filter; fine crystal micro-detail from the 8192² source is softened at 2048²']);
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(mf, null, 1) + '\n'); console.log('wrote', path.join(OUT_DIR, 'manifest.json'));
