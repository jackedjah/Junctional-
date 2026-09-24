/* MAHWORLD :: ENTITY STATUS (owner B7 §3) — ONE reusable world-space status for monsters, NPCs and other characters:
     NAME / SPECIES · LV <n> · HP bar
   A single sprite per entity (one small canvas texture, re-drawn only when the text, level, lock or the hp fraction changes), billboarded,
   placed above the head (never over it), compact (≈ 1.1 m wide), fading only when genuinely too far to read (fade_m → gone_m).
   Grammar: a platinum plate, the name in small caps, the level in the class energy / species tint, a thin hp track with a cyan fill
   (crimson when low), a LOCKED chevron pair when the player's lock is on this entity, KO dimmed. No giant opaque cards. */
export function createEntityStatus(THREE, opts) {
  opts = opts || {}; var W = opts.width_m || 1.1, PX = 256, PY = 84; var FADE = opts.fade_m || 26, GONE = opts.gone_m || 44; var items = [];
  function draw(st) { var c = st.canvas, g = st.ctx; g.clearRect(0, 0, PX, PY); var ko = !!st.ko;
    g.fillStyle = ko ? 'rgba(20,22,26,0.62)' : 'rgba(26,30,36,0.82)'; g.strokeStyle = st.locked ? 'rgba(255,214,120,0.95)' : 'rgba(223,230,238,0.55)'; g.lineWidth = st.locked ? 3 : 2; rr(g, 3, 3, PX - 6, PY - 6, 12); g.fill(); g.stroke();
    g.fillStyle = st.tint || '#6fd3ff'; g.beginPath(); g.moveTo(22, 20); g.lineTo(30, 30); g.lineTo(22, 40); g.lineTo(14, 30); g.closePath(); g.fill();   /* the square-diamond mark in the species / class tint */
    g.font = '600 20px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = ko ? 'rgba(200,205,212,0.7)' : '#eef4ff'; var name = String(st.name || '').toUpperCase(); if (name.length > 16) name = name.slice(0, 15) + '…'; g.fillText(name, 38, 30);
    var lv = Number.isFinite(st.level) ? 'LV ' + st.level : ''; g.font = '700 20px system-ui, sans-serif'; g.fillStyle = st.tint || '#ffd77a'; var lvW = g.measureText(lv).width; g.fillText(lv, PX - 14 - lvW, 30);
    var tx0 = 14, tx1 = PX - 14, ty = 56, th = 12; g.fillStyle = 'rgba(11,13,17,0.92)'; rr(g, tx0, ty, tx1 - tx0, th, 4); g.fill();
    var f = st.max > 0 ? Math.max(0, Math.min(1, st.hp / st.max)) : 1; if (f > 0 && !ko) { g.fillStyle = f < 0.3 ? '#ff5a6a' : (st.hostile ? '#4fd8ff' : '#8affc4'); rr(g, tx0 + 1, ty + 1, Math.max(2, (tx1 - tx0 - 2) * f), th - 2, 3); g.fill(); }
    if (st.locked) { g.fillStyle = 'rgba(255,214,120,0.95)'; g.beginPath(); g.moveTo(4, PY / 2 - 10); g.lineTo(12, PY / 2); g.lineTo(4, PY / 2 + 10); g.closePath(); g.fill(); g.beginPath(); g.moveTo(PX - 4, PY / 2 - 10); g.lineTo(PX - 12, PY / 2); g.lineTo(PX - 4, PY / 2 + 10); g.closePath(); g.fill(); }
    if (ko) { g.font = '700 16px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillText('KO', tx0 + 4, ty + 6); }
    st.tex.needsUpdate = true; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
  function make(init) { if (typeof document === 'undefined') return null; var canvas = document.createElement('canvas'); canvas.width = PX; canvas.height = PY; var ctx = canvas.getContext('2d'); if (!ctx) return null; var tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    var mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: true, transparent: true }); var sprite = new THREE.Sprite(mat); sprite.scale.set(W, W * PY / PX, 1); sprite.center.set(0.5, 0); sprite.renderOrder = 4; sprite.userData.entityStatus = true;
    var st = { sprite: sprite, canvas: canvas, ctx: ctx, tex: tex, mat: mat, name: init.name || '', level: init.level, hp: init.hp !== undefined ? init.hp : 1, max: init.max !== undefined ? init.max : 1, tint: init.tint || null, hostile: init.hostile !== false, locked: !!init.locked, ko: !!init.ko, key: null, lastF: -1 };
    st.key = keyOf(st); draw(st); items.push(st); return st; }
  function keyOf(st) { var f = st.max > 0 ? Math.round(64 * Math.max(0, Math.min(1, st.hp / st.max))) : 64; return st.name + '|' + st.level + '|' + f + '|' + (st.locked ? 1 : 0) + '|' + (st.ko ? 1 : 0) + '|' + (st.tint || ''); }
  function update(st, v, distance) { if (!st) return; if (v) { if (v.name !== undefined) st.name = v.name; if (v.level !== undefined) st.level = v.level; if (v.hp !== undefined) st.hp = v.hp; if (v.max !== undefined) st.max = v.max; if (v.locked !== undefined) st.locked = !!v.locked; if (v.ko !== undefined) st.ko = !!v.ko; if (v.tint !== undefined) st.tint = v.tint; if (v.hostile !== undefined) st.hostile = v.hostile !== false; }
    var k = keyOf(st); if (k !== st.key) { st.key = k; draw(st); }
    if (typeof distance === 'number') { var a = distance <= FADE ? 1 : (distance >= GONE ? 0 : 1 - (distance - FADE) / (GONE - FADE)); st.mat.opacity = a; st.sprite.visible = a > 0.02; } }
  function dispose(st) { if (!st) return; var i = items.indexOf(st); if (i >= 0) items.splice(i, 1); if (st.sprite.parent) st.sprite.parent.remove(st.sprite); st.tex.dispose(); st.mat.dispose(); }
  return { make: make, update: update, dispose: dispose, count: function () { return items.length; }, width_m: W, fade_m: FADE, gone_m: GONE };
}
