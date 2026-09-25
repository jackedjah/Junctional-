/* MAHWORLD WORLD PIVOT · PASS 5 :: WORLD MAP RENDERER (owner 2026-09-25: the five class territories readable at a glance, a futuristic
   technical-overlay look that stays clean on a phone, strong relationships between territory, sanctuary, landmarks, roads, water, the
   central HALO access and the player). Pure 2D canvas drawing from the world registry — no host, no DOM beyond the canvas it is given.
     · TERRITORIES: the registry region rects are rasterised ONCE into a smooth territory field (soft union per class, nearest class wins),
       cached per size: translucent class fills, a glowing class-colour border where territories meet, faint class hatching inside;
     · WATER, ROADS (causeway / regional / trail hierarchy), LANDMARKS (diamond glyphs + labels), MAHGIC crystal patches, the HALO access
       (ring glyph at the tree elevator with its height), the player (heading arrow + pulse) and a five-class legend;
     · ONLY the five class colours (gold · blue · red/crimson · purple · pink) as expressive colour; everything else is neutral platinum /
       white light on a deep graphite-navy field. No ctx.filter (iPhone Safari), no per-frame allocation beyond the cached field.
   drawWorldMap(g, W, H, WR, { player: { x, z, heading }, t, labels, mapLabel }) → { bounds, sx, sz } */
var FAM = { gold: '#e6c36a', blue: '#3f78e8', red: '#d4344a', purple: '#9a74e6', pink: '#f08ab8', platinum: '#dfe6ee' };
var CLASS_OF = { ATHLETE_SANCTUARY: 'ATHLETE', TITAN_SANCTUARY: 'TITAN', LEAN_SANCTUARY: 'LEAN', VISIONARY_SANCTUARY: 'VISIONARY', BAGE_SANCTUARY: 'BAGE' };
var CACHE = { key: null, img: null, canvas: null };

function hexRgb(h) { var v = parseInt(String(h).replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function rectDist(x, z, r) { var dx = Math.max(r.x1 - x, 0, x - r.x2), dz = Math.max(r.z1 - z, 0, z - r.z2); return Math.hypot(dx, dz); }

/* one cached territory raster: for every cell the nearest region (by distance to its rects, the NEXUS circle included) within reach */
function territoryField(WR, W, H, sx, sz, ix, iz, bounds) {
  var regions = ((WR.regions && WR.regions.list) || []).filter(function (R) { return R.family && R.family !== 'platinum' || R.id === 'MATCH_DISTRICT'; });
  var key = W + 'x' + H + ':' + (WR.generated || '') + ':' + regions.length;
  if (CACHE.key === key && CACHE.canvas) return CACHE.canvas;
  var c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d'); var img = g.createImageData(W, H), px = img.data;
  var cell = new Int16Array(W * H); cell.fill(-1); var reach = 26;   /* metres a territory extends past its rects (soft union / fills small gaps) */
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var wx = ix(x), wz = iz(y); if (wx < bounds.x1 || wx > bounds.x2 || wz < bounds.z1 || wz > bounds.z2) continue; var best = -1, bd = 1e9;
    for (var i = 0; i < regions.length; i++) { var R = regions[i], sh = R.shape || {}, d = 1e9; if (sh.kind === 'CIRCLE') d = Math.max(0, Math.hypot(wx - sh.x, wz - sh.z) - sh.r); else (sh.rects || []).forEach(function (r) { d = Math.min(d, rectDist(wx, wz, r)); }); if (d < bd) { bd = d; best = i; } }
    if (best >= 0 && bd <= reach) cell[y * W + x] = best; }
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) { var id = cell[y * W + x]; if (id < 0) continue; var R2 = regions[id], rgb = hexRgb(FAM[R2.family] || FAM.platinum), o = (y * W + x) * 4;
    var ed = 99; for (var dy = -6; dy <= 6; dy += 1) for (var dx = -6; dx <= 6; dx += 1) { var yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= H || xx >= W) continue; if (cell[yy * W + xx] !== id) { var dd = Math.abs(dx) + Math.abs(dy); if (dd < ed) ed = dd; } }
    var hatch = ((x + y) % 9 === 0) ? 0.07 : 0; var a = R2.family === 'platinum' ? 0.1 : (ed <= 1 ? 0.95 : ed <= 2 ? 0.7 : ed <= 6 ? 0.34 + (6 - ed) * 0.05 : 0.3 + hatch);   /* border line + inner glow ramp + calm interior fill */
    px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = Math.round(a * 255); }
  g.putImageData(img, 0, 0); CACHE.key = key; CACHE.canvas = c; return c;
}

export function drawWorldMap(g, W, H, WR, opts) {
  opts = opts || {}; var walls = (WR && WR.field && WR.field.walls) || { x1: -175, x2: 175, z1: -56.5, z2: 292 };
  var pad = 14, spanX = walls.x2 - walls.x1, spanZ = walls.z2 - walls.z1, sc = Math.min((W - pad * 2) / spanX, (H - pad * 2 - 34) / spanZ);
  var ox = (W - spanX * sc) / 2, oz = pad + 4;
  var sx = function (x) { return ox + (x - walls.x1) * sc; }, sz = function (z) { return oz + (walls.z2 - z) * sc; };   /* north (+z) up */
  var ix = function (px) { return walls.x1 + (px - ox) / sc; }, iz = function (py) { return walls.z2 - (py - oz) / sc; };
  /* 1 field: deep graphite-navy with a technical grid and a soft vignette */
  var bg = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.75); bg.addColorStop(0, '#0d1322'); bg.addColorStop(1, '#05070d'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(223,230,238,0.05)'; g.lineWidth = 1; for (var gx = Math.ceil(walls.x1 / 25) * 25; gx <= walls.x2; gx += 25) { g.beginPath(); g.moveTo(sx(gx), sz(walls.z2)); g.lineTo(sx(gx), sz(walls.z1)); g.stroke(); } for (var gz = Math.ceil(walls.z1 / 25) * 25; gz <= walls.z2; gz += 25) { g.beginPath(); g.moveTo(sx(walls.x1), sz(gz)); g.lineTo(sx(walls.x2), sz(gz)); g.stroke(); }
  /* 2 territories */
  if (WR && WR.regions) g.drawImage(territoryField(WR, W, H, sx, sz, ix, iz, walls), 0, 0);
  /* 3 water */
  var water = (WR && WR.water && WR.water.rivers) || []; water.forEach(function (w) { if (!isFinite(w.x1)) return; var x = sx(w.x1), y = sz(w.z2), ww = (w.x2 - w.x1) * sc, hh = (w.z2 - w.z1) * sc; g.fillStyle = w.pond ? 'rgba(96,140,220,0.62)' : 'rgba(70,112,200,0.5)'; g.fillRect(x, y, ww, hh); g.strokeStyle = 'rgba(200,216,248,0.7)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, ww - 1, hh - 1); });   /* ponds, basins and the north river are registry rects */
  /* 4 roads: causeways platinum light, regional paths in their class colour, trails as a fine class line */
  var paths = (WR && WR.paths && WR.paths.list) || []; ['TRAIL', 'REGIONAL', 'CAUSEWAY'].forEach(function (tier) { paths.filter(function (p) { return p.tier === tier; }).forEach(function (p) { var fc = FAM[p.family] || FAM.platinum;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); p.pts.forEach(function (pt, i) { if (i) g.lineTo(sx(pt[0]), sz(pt[1])); else g.moveTo(sx(pt[0]), sz(pt[1])); });
    if (tier === 'CAUSEWAY') { g.strokeStyle = 'rgba(8,11,18,0.85)'; g.lineWidth = 5; g.stroke(); g.strokeStyle = 'rgba(245,247,252,0.95)'; g.lineWidth = 2.4; g.stroke(); }
    else if (tier === 'REGIONAL') { g.strokeStyle = fc; g.globalAlpha = 0.9; g.lineWidth = 1.7; g.stroke(); g.globalAlpha = 1; }
    else { g.setLineDash([2, 3]); g.strokeStyle = fc; g.globalAlpha = 0.7; g.lineWidth = 1; g.stroke(); g.setLineDash([]); g.globalAlpha = 1; } }); });
  /* 5 MAHGIC crystal patches */
  var res = (WR && WR.map && WR.map.resources) || []; res.forEach(function (r) { var fc = FAM[r.family] || FAM.platinum, x = sx(r.x), y = sz(r.z), s = r.intro ? 3.2 : 2.2; g.fillStyle = fc; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.7, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.7, y); g.closePath(); g.fill(); g.globalAlpha = 1; });
  /* 6 HALO access: ring glyph + height at the tree elevator */
  var halo = opts.halo || { x: 30, z: 40, height_m: 240 }; var hx = sx(halo.x), hy = sz(halo.z); var pulse = 0.5 + 0.5 * Math.sin((opts.t || 0) * 2.2);
  g.strokeStyle = 'rgba(245,247,252,0.95)'; g.lineWidth = 2; g.beginPath(); g.arc(hx, hy, 7, 0, Math.PI * 2); g.stroke(); g.strokeStyle = 'rgba(216,200,255,' + (0.35 + 0.35 * pulse).toFixed(2) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(hx, hy, 11 + pulse * 2, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#f5f7fc'; g.beginPath(); g.moveTo(hx, hy - 4); g.lineTo(hx + 3, hy + 1); g.lineTo(hx - 3, hy + 1); g.closePath(); g.fill();
  /* 7 territory names first (they win label space): large, calm, in the class colour, at the region's largest rect */
  var LBL0 = typeof opts.mapLabel === 'function' ? opts.mapLabel : null; var regions0 = (WR && WR.regions && WR.regions.list) || [];
  if (opts.labels !== false && LBL0) regions0.forEach(function (R) { var cls = CLASS_OF[R.id]; if (!cls) return; var rs = (R.shape && R.shape.rects) || []; if (!rs.length) return; var big = rs.reduce(function (a, r) { return (r.x2 - r.x1) * (r.z2 - r.z1) > (a.x2 - a.x1) * (a.z2 - a.z1) ? r : a; }); LBL0(cls, sx((big.x1 + big.x2) / 2), sz((big.z1 + big.z2) / 2) + 10, { font: '900 12px system-ui', color: FAM[R.family], height: 16, force: true }); });
  /* 8 landmarks: diamond glyph in the territory colour + label */
  var LBL = typeof opts.mapLabel === 'function' ? opts.mapLabel : null; var bl = (WR && WR.map && WR.map.buildings) || []; var regions = (WR && WR.regions && WR.regions.list) || [];
  function famAt(x, z) { var best = null, bd = 1e9; regions.forEach(function (R) { var sh = R.shape || {}, d = 1e9; if (sh.kind === 'CIRCLE') d = Math.max(0, Math.hypot(x - sh.x, z - sh.z) - sh.r); else (sh.rects || []).forEach(function (r) { d = Math.min(d, rectDist(x, z, r)); }); if (d < bd) { bd = d; best = R; } }); return best && bd < 30 ? best.family : 'platinum'; }
  bl.forEach(function (b) { var x = sx(b.x), y = sz(b.z), fc = FAM[famAt(b.x, b.z)] || FAM.platinum; g.fillStyle = '#05070d'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 4.5, y); g.lineTo(x, y + 6); g.lineTo(x - 4.5, y); g.closePath(); g.fill(); g.strokeStyle = fc; g.lineWidth = 1.6; g.stroke(); g.fillStyle = fc; g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); if (opts.labels !== false && LBL) LBL(b.text, x, y - 12, { font: '700 9px system-ui', color: '#eef1f8' }); });
  if (opts.labels !== false && LBL) LBL('HALO · ' + (halo.height_m || 240) + ' m', hx, hy + 17, { font: '800 9px system-ui', color: '#e9dcff', force: true });
  /* 9 player: heading arrow + pulse */
  var P = opts.player; if (P && isFinite(P.x) && isFinite(P.z)) { var px2 = sx(P.x), py2 = sz(P.z), hd = P.heading || 0; g.save(); g.translate(px2, py2); g.strokeStyle = 'rgba(245,247,252,' + (0.3 + 0.4 * pulse).toFixed(2) + ')'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 8 + pulse * 3, 0, Math.PI * 2); g.stroke(); g.rotate(hd); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2.5); g.lineTo(-5, 5); g.closePath(); g.fill(); g.restore(); }
  /* 10 legend: the five classes */
  var LG = [['ATHLETE', 'gold'], ['TITAN', 'blue'], ['LEAN', 'red'], ['VISIONARY', 'purple'], ['BAGE', 'pink']], lw = (W - 20) / 5, ly = H - 22;
  g.fillStyle = 'rgba(5,7,13,0.82)'; g.fillRect(6, ly - 8, W - 12, 26); LG.forEach(function (L, i) { var x = 10 + i * lw; g.fillStyle = FAM[L[1]]; g.fillRect(x, ly - 1, 10, 10); g.fillStyle = '#eef1f8'; g.font = '700 9px system-ui'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(L[0], x + 14, ly + 4); });
  return { bounds: walls, sx: sx, sz: sz };
}
