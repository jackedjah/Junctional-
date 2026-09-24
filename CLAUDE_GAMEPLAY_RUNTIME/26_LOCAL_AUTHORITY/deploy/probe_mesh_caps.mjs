/* OWNER HOTFIX 2026-09-19 §2 — what are the flat TAN faces that show at the arm root when the arm is high? Samples the base-colour texture at
   every vertex UV of the upper body (in the page, off the loaded material), classifies "flat" texels (the unmapped tan of the atlas), and
   reports where those vertices sit at bind (relative to the glenohumeral centres), which connected patches they form, and their weights.
   node deploy/probe_mesh_caps.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveStatic, launchChrome, waitForGame, sleep, PLAY_PATH } from './probe_lib.mjs';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var DIST = path.join(HERE, 'static_dist'); var OUT = path.join(HERE, 'probe_out', 'intact');
var srv = await serveStatic(DIST); var pg = await launchChrome({ width: 400, height: 400, gpu: true });
async function ev(expr) { return await pg.evaluate("(function(){ var P=window.MAHWORLD_PLAY; " + expr + " })()"); }
try {
  await pg.goto(srv.origin + PLAY_PATH + '?field=1&dev=1'); await waitForGame(pg, 120000); await sleep(4000);
  var r = await ev("var e=P.entity('me'); var g=e.fused.group; var out=null; g.traverse(function(m){ if(!m.isSkinnedMesh || out) return; if(!/BODY_1/.test(m.name)) return; var geo=m.geometry; var uv=geo.attributes.uv, pos=geo.attributes.position, si=geo.attributes.skinIndex, sw=geo.attributes.skinWeight; var mat=Array.isArray(m.material)?m.material[0]:m.material; var img=mat.map&&mat.map.image; if(!img) { out={err:'no map'}; return; } var W=img.width||img.naturalWidth, H=img.height||img.naturalHeight; var cv=document.createElement('canvas'); cv.width=W; cv.height=H; var cx=cv.getContext('2d'); cx.drawImage(img,0,0); var px=cx.getImageData(0,0,W,H).data; var flipY=mat.map.flipY; var bones=m.skeleton.bones; var n=pos.count; var tan=[]; var hist={}; for(var i=0;i<n;i++){ var u=uv.getX(i), v=uv.getY(i); var x=Math.min(W-1,Math.max(0,Math.floor((u%1+1)%1*W))), y=Math.min(H-1,Math.max(0,Math.floor(((flipY?1-v:v)%1+1)%1*H))); var o=(y*W+x)*4; var rr=px[o],gg=px[o+1],bb=px[o+2]; var key=(rr>>5)+','+(gg>>5)+','+(bb>>5); hist[key]=(hist[key]||0)+1; if (rr>140 && gg>90 && gg<170 && bb<110 && rr-bb>60) { var best=-1,bw=-1; for(var k=0;k<4;k++){ var w=sw.getComponent(i,k); if(w>bw){bw=w;best=si.getComponent(i,k);} } tan.push({ i:i, p:[+pos.getX(i).toFixed(3),+pos.getY(i).toFixed(3),+pos.getZ(i).toFixed(3)], uv:[+u.toFixed(3),+v.toFixed(3)], rgb:[rr,gg,bb], bone:bones[best]?bones[best].name:'?', w:+bw.toFixed(2) }); } } out={ verts:n, tex:[W,H], flipY:flipY, tan:tan, hist:hist }; }); return out;");
  if (r.err) { console.log(r.err); } else {
    console.log('BODY_1 verts', r.verts, 'texture', r.tex, 'flipY', r.flipY, 'tan-classified vertices', r.tan.length);
    var top = Object.keys(r.hist).sort(function (a, b) { return r.hist[b] - r.hist[a]; }).slice(0, 6).map(function (k) { return k + ':' + r.hist[k]; }); console.log('colour histogram (r,g,b >> 5):', top.join('  '));
    var GH = { L: [-0.1236, 0.7473, -0.0232], R: [0.1236, 0.7473, -0.0223] }; var near = r.tan.filter(function (t) { var d = Math.min(Math.hypot(t.p[0] - GH.L[0], t.p[1] - GH.L[1], t.p[2] - GH.L[2]), Math.hypot(t.p[0] - GH.R[0], t.p[1] - GH.R[1], t.p[2] - GH.R[2])); return d < 0.12; });
    console.log('tan vertices within 12 cm of a shoulder:', near.length); var byBone = {}; near.forEach(function (t) { byBone[t.bone] = (byBone[t.bone] || 0) + 1; }); console.log('  by dominant bone:', JSON.stringify(byBone));
    var ys = near.map(function (t) { return t.p[1]; }).sort(function (a, b) { return a - b; }); if (ys.length) console.log('  y range', ys[0], '..', ys[ys.length - 1], '(shoulder y 0.747)');
    var uvs = {}; near.forEach(function (t) { var k = (Math.round(t.uv[0] * 20) / 20) + ',' + (Math.round(t.uv[1] * 20) / 20); uvs[k] = (uvs[k] || 0) + 1; }); console.log('  uv clusters:', JSON.stringify(uvs));
    console.log('  samples:', JSON.stringify(near.slice(0, 6)));
    fs.writeFileSync(path.join(OUT, 'mesh_caps.json'), JSON.stringify({ verts: r.verts, tan: r.tan, near_shoulder: near }, null, 0));
  }
} catch (e) { console.error(e); } finally { await pg.close(); srv.close(); }
