/* MAHWORLD :: INTERIORS (P8 — master §16 / §17). Presentation for the host's INTERIOR rooms (GYM_INTERIOR, CLOTHING_SHOP, WEAPON_SHOP): one
   enclosed hall per room — platinum floor with inlays, panelled walls with baseboard and cornice trims, a ceiling with light strips, corner columns,
   the doorway (the host's `exit` point) as a lit frame, and the room's purpose: the gym's racks / benches / lifting platform (the host's walkable
   platforms drawn at their exact boxes), the shops' counter and EMPTY display frames — the zero-stock state is a finished, readable "no stock yet"
   panel, never a placeholder item, price or purchase. Everything is presentation; the host owns movement (room size clamp, platforms, ceiling).
   Returns the wall solids for the camera boom (the field's camera probe reads them) and a `ready` promise (fault injection: `failRoom` throws,
   `slowMs` delays readiness — dev only, to exercise the failure / slow paths of the entrance transaction). */
export function buildInterior(THREE, group, play, helpers) {
  var room = play.room, size = play.room_size_m || 24, half = size / 2, plan = play.interior_plan || null, planId = plan && plan.plan_id || null, H = play.ceiling_m || (plan && plan.ceiling_m) || (room === 'GYM_INTERIOR' ? 6.2 : (room === 'MATCH_HALL' ? 9 : 4.6)); var opts = helpers || {}; var WORLD = opts.world || null;   /* M5 owner correction: the host-published ceiling and plan are presentation truth; JOB B still owns MATCH HALL and gym props. */
  if (opts.failRoom && opts.failRoom === room) throw new Error('INTERIOR_BUILD_FAILED (' + room + ') — fault injection');
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  var M = {
    floor: new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.5, metalness: 0.85 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xc6ced8, roughness: 0.42, metalness: 0.82 }),
    panel: new THREE.MeshStandardMaterial({ color: 0xaeb8c6, roughness: 0.5, metalness: 0.75 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: 0.45, metalness: 0.7 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xe6ecf6, emissive: 0xd6e0ff, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.2 }),
    strip: new THREE.MeshBasicMaterial({ color: 0xdff3ff }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd4a83a, roughness: 0.32, metalness: 0.9 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xb4bec9, roughness: 0.3, metalness: 0.97 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x4f8cff, emissive: 0x163f9d, emissiveIntensity: 0.72, roughness: 0.2, metalness: 0.68 }),
    rose: new THREE.MeshStandardMaterial({ color: 0xd58ab4, emissive: 0x7a2f5a, emissiveIntensity: 0.48, roughness: 0.28, metalness: 0.62 })
  };
  var solids = [];   /* camera-boom solids (BOX in room metres) */
  function box(w, h, d, mat, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); group.add(m); return m; }
  if (room === 'MATCH_HALL' && WORLD && WORLD.buildInterior) { var wreg = WORLD.ctx ? WORLD.ctx.registry : null; var mh = WORLD.buildInterior('MATCH_HALL', group, wreg && wreg.rooms_added ? wreg.rooms_added.MATCH_HALL : null);
    if (mh) { H = mh.ceiling_m || H; addLights(); doorway(); var readyM = new Promise(function (res) { var done = function () { res(true); }; if (opts.slowMs) setTimeout(done, opts.slowMs); else (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout)(done); }); return { solids: mh.solids || [], ready: readyM, ceiling_m: H, size_m: size, world: 'MATCH_HALL', arena: mh.arena, tiers: mh.tiers, draw_calls: mh.draw_calls, tris: mh.tris }; } }
  /* floor + inlay ring */
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.receiveShadow = true; group.add(floor);
  var ring = new THREE.Mesh(new THREE.RingGeometry(half * 0.38, half * 0.4, 48), M.trim); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; group.add(ring);
  /* walls: panels with a baseboard and a cornice, thick enough for the camera probe; the doorway wall (+z) gets the lit frame at the exit point */
  var T = 0.6; [[0, -half - T / 2, size + 2 * T, T], [0, half + T / 2, size + 2 * T, T], [-half - T / 2, 0, T, size], [half + T / 2, 0, T, size]].forEach(function (w, i) { var m = box(w[2], H, w[3], M.wall, w[0], H / 2, w[1]); solids.push({ id: 'WALL_' + i, type: 'BOX', x1: w[0] - w[2] / 2, x2: w[0] + w[2] / 2, z1: w[1] - w[3] / 2, z2: w[1] + w[3] / 2, h: H, y0: 0 }); });
  /* baseboard / cornice trims and panel seams */
  [[0, -half + 0.02, size, 0], [0, half - 0.02, size, 0], [-half + 0.02, 0, size, Math.PI / 2], [half - 0.02, 0, size, Math.PI / 2]].forEach(function (w) { var b = box(w[2], 0.12, 0.05, M.dark, w[0], 0.06, w[1]); b.rotation.y = w[3]; var c = box(w[2], 0.08, 0.05, M.trim, w[0], H - 0.3, w[1]); c.rotation.y = w[3]; for (var s = -half + 3; s < half; s += 3) { var seam = box(0.04, H - 0.5, 0.05, M.dark, w[3] ? w[0] : s, H / 2 - 0.1, w[3] ? s : w[1]); seam.rotation.y = w[3]; } });
  /* ceiling with light strips */
  var ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M.panel); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; group.add(ceil);
  for (var sx = -half + 2.5; sx < half; sx += 5) { box(0.14, 0.04, size * 0.86, M.strip, sx, H - 0.05, 0); }
  /* the hall's own light: a cool hemisphere fill + one soft key from above (the shared base lights are dim; lights live in the group so a room change clears them) */
  /* the SAME light signature as the daytime field (3 directional + 1 hemisphere, the same shadow-casting count, fog present): the character's shader programs stay valid across the door — no per-entry recompile */
  addLights(); function addLights() {
  var hemi = new THREE.HemisphereLight(0xdfe8ff, 0x2a3140, 1.45); group.add(hemi); var key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(4, H, 6); if (opts.shadows) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -half; key.shadow.camera.right = half; key.shadow.camera.top = half; key.shadow.camera.bottom = -half; key.shadow.camera.near = 0.5; key.shadow.camera.far = H + 20; } group.add(key); group.add(key.target); var rim = new THREE.DirectionalLight(0xbfd8ff, 0.4); rim.position.set(-6, H * 0.7, -5); group.add(rim); var fill = new THREE.DirectionalLight(0xcfe0ff, 0.3); fill.position.set(0, H * 0.5, 8); group.add(fill); }
  /* corner columns */
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { var col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, H, 16), M.chrome); col.position.set(c[0] * (half - 0.6), H / 2, c[1] * (half - 0.6)); group.add(col); });
  /* the doorway: a lit frame around the exit point on the +z wall */
  doorway(); function doorway() {
    var ex = play.exit; if (!ex || !ex.position) return;
    var dx = ex.position.x, dz = half, doorHalf = plan && plan.portal && plan.portal.half_width_m || 1.5, doorH = Math.min(H - 0.8, plan && plan.portal && plan.portal.height_m || 3.2);
    [-1, 1].forEach(function (s) { box(0.22, doorH, 0.3, M.chrome, dx + s * doorHalf, doorH / 2, dz - 0.15); });
    box(doorHalf * 2 + 0.3, 0.22, 0.3, M.chrome, dx, doorH + 0.11, dz - 0.15); box(doorHalf * 2 - 0.2, 0.06, 0.06, M.trim, dx, doorH - 0.12, dz - 0.32);
    var pad = new THREE.Mesh(new THREE.RingGeometry(ex.range_m - 0.12, ex.range_m, 40), M.trim); pad.rotation.x = -Math.PI / 2; pad.position.set(dx, 0.02, ex.position.z); group.add(pad);
    var doorTex = canvasTex(512, 96, function (g, w, h) { g.fillStyle = '#0b1220'; g.fillRect(0, 0, w, h); g.font = '600 44px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#dff3ff'; g.fillText('EXIT', w / 2, h / 2); });
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshBasicMaterial({ map: doorTex })); sign.position.set(dx, Math.min(H - 0.35, doorH + 0.45), dz - 0.34); sign.rotation.y = Math.PI; group.add(sign);
  }
  /* the host's walkable platforms at their exact boxes (equipment / counter) */
  (play.platforms || []).forEach(function (pl) { var w = pl.x2 - pl.x1, d = pl.z2 - pl.z1; var mat = /COUNTER/.test(pl.id) ? M.dark : (/PLATFORM/.test(pl.id) ? M.gold : M.panel); var m = box(w, pl.height, d, mat, (pl.x1 + pl.x2) / 2, pl.height / 2, (pl.z1 + pl.z2) / 2); if (/COUNTER/.test(pl.id)) { box(w + 0.1, 0.06, d + 0.1, M.chrome, m.position.x, pl.height + 0.03, m.position.z); } if (/BENCH/.test(pl.id)) { box(w * 0.9, 0.12, d * 0.9, M.dark, m.position.x, pl.height + 0.06, m.position.z); } });
  /* Explicit room solids are both rendered and returned to the camera probe; the authoritative movement host consumes the same boxes. */
  (play.room_solids || []).forEach(function (sd) { if (sd.type && sd.type !== 'BOX') return; var y0 = sd.y0 || 0, h = Math.max(0.05, (sd.h || 0) - y0); var sm = /TEMPLE/.test(sd.id || '') ? M.gold : (/TOWER/.test(sd.id || '') ? M.blue : M.chrome); var mesh = box(sd.x2 - sd.x1, h, sd.z2 - sd.z1, sm, (sd.x1 + sd.x2) / 2, y0 + h / 2, (sd.z1 + sd.z2) / 2); mesh.name = sd.id || 'ROOM_SOLID'; solids.push(Object.assign({}, sd)); });
  var label = canvasTex(1024, 128, function (g, w, h) { g.clearRect(0, 0, w, h); g.font = '700 72px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#6fc3ff'; g.shadowBlur = 20; g.fillStyle = '#dff3ff'; g.fillText((play.room_label || room).split('—')[0].trim().toUpperCase(), w / 2, h / 2); });
  var banner = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.75), new THREE.MeshBasicMaterial({ map: label, transparent: true })); banner.position.set(0, H - 1.2, -half + 0.35); group.add(banner);
  if (room === 'GYM_INTERIOR') {
    /* racks along the west / east walls (bars on uprights), a squat cage at the back, the lifting platform is the host's platform */
    [-1, 1].forEach(function (s) { for (var k = 0; k < 3; k++) { var z = -8 + k * 6; [-0.9, 0.9].forEach(function (o) { box(0.12, 1.9, 0.12, M.chrome, s * (half - 1.4), 0.95, z + o); }); box(0.06, 0.06, 2.1, M.gold, s * (half - 1.4), 1.55, z); box(0.06, 0.06, 2.1, M.gold, s * (half - 1.4), 0.95, z); } });
    [-1.4, 1.4].forEach(function (o) { box(0.14, 2.6, 0.14, M.chrome, o, 1.3, -half + 2.2); box(0.14, 2.6, 0.14, M.chrome, o, 1.3, -half + 3.6); }); box(3.1, 0.12, 0.12, M.chrome, 0, 2.55, -half + 2.2); box(3.1, 0.12, 0.12, M.chrome, 0, 2.55, -half + 3.6);
    if (WORLD && WORLD.modules) { var pm = WORLD.modules().props; if (pm && pm.roomProps) { try { pm.roomProps('GYM_INTERIOR', group); } catch (e) { } } }   /* JOB B: the barbell on the platform + a dumbbell on each bench (optimized derivatives, registry-placed) */
  } else if (planId === 'TEMPLE_GOLD_ROTUNDA_V1') {
    var tg = new THREE.MeshStandardMaterial({ color: 0xe6c36a, emissive: 0x7a5a14, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.72 });
    for (var th = 0; th < 3; th++) { var halo = new THREE.Mesh(new THREE.TorusGeometry(4.1 - th * 0.45, 0.11, 8, 48), tg); halo.rotation.x = Math.PI / 2; halo.position.y = 6.2 + th * 1.75; halo.name = 'TEMPLE_HALO_RING_' + (th + 1); group.add(halo); }
    var tcore = new THREE.Mesh(new THREE.OctahedronGeometry(1.25, 1), tg); tcore.scale.y = 1.65; tcore.position.set(0, 2.4, -0.2); tcore.name = 'TEMPLE_ROTUNDA_CORE'; group.add(tcore);
    [-1, 1].forEach(function (s) { var rib = box(0.16, H - 1.3, 0.28, tg, s * 4.7, (H - 1.3) / 2, -0.1); rib.name = 'TEMPLE_VAULT_RIB'; });
  } else if (planId === 'TOWER_BLUE_ATRIUM_V1') {
    var spine = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, H - 1.1, 8), M.blue); spine.position.set(0, (H - 1.1) / 2, -1.0); spine.name = 'TOWER_LUMEN_SPINE'; group.add(spine);
    for (var tr = 0; tr < 4; tr++) { var ringB = new THREE.Mesh(new THREE.TorusGeometry(2.2 + tr * 0.35, 0.09, 8, 40), M.blue); ringB.rotation.x = Math.PI / 2; ringB.position.set(0, 3.4 + tr * 2.2, -1.0); ringB.name = 'TOWER_SUSPENDED_RING_' + (tr + 1); group.add(ringB); }
    [-1, 1].forEach(function (s) { var fin = box(0.18, H - 1.6, 0.5, M.blue, s * 2.9, (H - 1.6) / 2, -2.6); fin.name = 'TOWER_VERTICAL_FIN'; });
  } else if (room === 'CLOTHING_SHOP' || room === 'WEAPON_SHOP' || play.room_shop) {
    /* shops: display frames on the back and side walls, each with a finished EMPTY panel ("NO STOCK YET") — no silhouettes, no prices */
    var kind = room === 'CLOTHING_SHOP' ? 'APPAREL' : 'WEAPONS'; var empty = canvasTex(512, 320, function (g, w, h) { g.fillStyle = '#0e1626'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f6fa8'; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24); g.font = '700 40px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#9fd0ff'; g.fillText(kind, w / 2, 110); g.font = '600 30px "Segoe UI", Arial, sans-serif'; g.fillStyle = '#dff3ff'; g.fillText('NO STOCK YET', w / 2, 175); g.font = '400 22px "Segoe UI", Arial, sans-serif'; g.fillStyle = '#7f9bb8'; g.fillText('catalog empty by design', w / 2, 225); });
    var frames = [[0, -half + 0.3, 0], [-half + 0.3, 0, Math.PI / 2], [half - 0.3, 0, -Math.PI / 2]]; frames.forEach(function (f) { var fr = box(2.6, 1.8, 0.1, M.chrome, f[0], 2.0, f[1]); fr.rotation.y = f[2]; var pnl = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.45), new THREE.MeshBasicMaterial({ map: empty })); pnl.position.set(f[0], 2.0, f[1]); pnl.rotation.y = f[2]; pnl.translateZ(0.07); group.add(pnl); });
    [-3.4, 0, 3.4].forEach(function (z, ri) { [-1, 1].forEach(function (s) { var post = box(0.16, H - 0.8, 0.22, M.rose, s * (half - 1.0), (H - 0.8) / 2, z); post.name = 'MARKET_VAULT_POST_' + ri; }); var beam = box(size - 2, 0.16, 0.22, M.rose, 0, H - 0.65, z); beam.name = 'MARKET_VAULT_RIB_' + ri; });
  } else {
    /* B8 §19 SHELL hall (TEMPLE_HALL, TOWER_HALL, …): the generic hall plus a class-tinted floor inlay and four corner crystal blades — a safe, readable interior where no bespoke one exists yet */ var tintHex = /TEMPLE/.test(room) ? 0xe6c36a : (/TOWER/.test(room) ? 0x4f8cff : 0x9fdcff); var inlay = new THREE.Mesh(new THREE.RingGeometry(half * 0.28, half * 0.34, 48), new THREE.MeshStandardMaterial({ color: tintHex, emissive: tintHex, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); inlay.rotation.x = -Math.PI / 2; inlay.position.y = 0.015; group.add(inlay); var core = new THREE.Mesh(new THREE.OctahedronGeometry(half * 0.09, 0), new THREE.MeshStandardMaterial({ color: tintHex, emissive: tintHex, emissiveIntensity: 0.8, roughness: 0.15, metalness: 0.5, transparent: true, opacity: 0.9 })); core.scale.y = 1.5; core.position.set(0, 2.2, 0); core.name = 'SHELL_CORE_DIAMOND'; group.add(core); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { var bl = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.6, 4), new THREE.MeshStandardMaterial({ color: tintHex, emissive: tintHex, emissiveIntensity: 0.35, roughness: 0.18, metalness: 0.55, transparent: true, opacity: 0.88 })); bl.position.set(c[0] * (half - 1.4), 1.3, c[1] * (half - 1.4)); group.add(bl); });
  }
  var ready = new Promise(function (res) { var done = function () { res(true); }; if (opts.slowMs) setTimeout(done, opts.slowMs); else (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout)(done); });   /* readiness = the enclosure is built and one frame has been rendered (programs compiled) */
  return { solids: solids, ready: ready, ceiling_m: H, size_m: size, plan_id: planId, style_id: plan && plan.style_id || null, feature_ids: plan && plan.feature_ids || [], rendered_bounds: { x1: -half, x2: half, z1: -half, z2: half, y0: 0, h: H } };
}
