/* MAHWORLD JOB B :: MATCH HALL — the OFFICIAL MATCH building exterior (registry artifact MATCH_HALL), the outdoor MATCH COURT
   (artifact MATCH_COURT_OUTDOOR + zone MATCH_COURT spectator ring) and the MATCH_HALL room interior (registry.rooms_added.MATCH_HALL).
   Owner direction: black / dark graphite, NO ordinary windows, a real recessed door, elite / minimal / premium, organized cool blue-cyan
   luminous LINES (evenly spaced vertical strips, one lintel line), a softened silhouette (bevelled graphite crown band), a platinum plinth.
   Presentation only: the building's colliders come from worldLayout.artifactColliders on the SAME registry (MAIN + two door piers +
   lintel = the 3 m recess drawn here); the court floor, spectator tiers and pylons are NOT colliders. Every static part is baked into
   local space and merged per material (BufferGeometryUtils.mergeGeometries), so at rest the building costs 6 draw calls (black body ·
   graphite crown / frame · platinum plinth / ledge · cyan lines · gate glass · name plate), the court 3 (graphite · platinum · cyan) and
   the interior 5 inside the host's roomGroup (black walls + ceiling · graphite floor + tiers · platinum arena + lips · cyan lines · gate).
   setNight() only changes emissive intensities (no rebuild). Nothing animates, so there is no tick. The interior uses its OWN material
   clones because the host's clearGroup() disposes every material in a room group when the player leaves. */
import { mergeGeometries } from '../../vendor/three/BufferGeometryUtils.js';

var TWO_PI = Math.PI * 2;
var _instance = null;   /* the latest createMatchHall() instance, so the module-level buildInterior export can serve a host that imports it directly */

export function createMatchHall(ctx) {
  var THREE = ctx.THREE; var M = ctx.M || {}; var log = ctx.log || function () { }; var reg = ctx.registry || {};
  var LINE_DAY = 1.6, LINE_NIGHT = 2.9, GATE_DAY = 0.45, GATE_NIGHT = 1.05;
  var night = !!ctx.night; var groups = []; var stats = { building: null, court: null, interior: null };
  var lineMat = null, gateMat = null, plateMat = null, plateTex = null;   /* exterior + court materials (this module's own clones; never mutate ctx.M) */
  var interiorMats = null;                                                /* the current interior's clones (host-disposed on room exit) */
  function mat(k, fallback) { return M[k] || new THREE.MeshStandardMaterial(fallback); }

  /* ---------- geometry helpers: every part is baked in place, then merged per material ---------- */
  function nonIdx(g) { if (!g.index) return g; var n = g.toNonIndexed(); g.dispose(); return n; }
  function merged(parts, material, name, receive) {
    if (!parts || !parts.length) return null; var list = [], i;
    for (i = 0; i < parts.length; i++) list.push(nonIdx(parts[i]));
    var g = null; try { g = mergeGeometries(list, false); } catch (e) { log('matchHall: merge ' + name + ' threw ' + (e && e.message || e)); g = null; }
    for (i = 0; i < list.length; i++) list[i].dispose();
    if (!g) { log('matchHall: merge failed for ' + name + ' (' + list.length + ' parts)'); return null; }
    g.computeBoundingSphere(); var m = new THREE.Mesh(g, material); m.name = name; m.castShadow = false; m.receiveShadow = !!receive; m.userData.noMerge = true; m.userData.tris = Math.round(g.attributes.position.count / 3); return m;
  }
  function box(w, h, d, x, y, z) { var g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return g; }                       /* y = bottom */
  function cyl(rt, rb, h, x, y, z, seg) { var g = new THREE.CylinderGeometry(rt, rb, h, seg || 16); g.translate(x, y + h / 2, z); return g; }
  function disc(r, y, cx, cz, seg) { var g = new THREE.CircleGeometry(r, seg || 64); g.rotateX(-Math.PI / 2); g.translate(cx, y, cz); return g; }
  function flatRing(r1, r2, y, cx, cz, seg) { var g = new THREE.RingGeometry(r1, r2, seg || 96, 1); g.rotateX(-Math.PI / 2); g.translate(cx, y, cz); return g; }
  function roundedRect(w, d, r) { var s = new THREE.Shape(); var x = -w / 2, y = -d / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
  /* annular prism r1..r2, height h, bottom at y, covering the shape-space arc a1..a2 (a full ring when a2 - a1 >= 2π).
     The extrude is rotated flat with rotateX(-π/2), so shape angle -π/2 (3π/2) lands on world / room +z. */
  function arcPrism(r1, r2, h, cx, cz, y, a1, a2) {
    var full = (a2 - a1) >= TWO_PI - 1e-6; var n = Math.max(8, Math.round((a2 - a1) / TWO_PI * 96)); var shape = new THREE.Shape(); var i, a;
    if (full) {
      for (i = 0; i < n; i++) { a = a1 + i / n * TWO_PI; if (i) shape.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); else shape.moveTo(Math.cos(a) * r2, Math.sin(a) * r2); } shape.closePath();
      var hole = new THREE.Path(); for (i = 0; i < n; i++) { a = a1 + i / n * TWO_PI; if (i) hole.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); else hole.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); } hole.closePath(); shape.holes.push(hole);
    } else {
      for (i = 0; i <= n; i++) { a = a1 + (a2 - a1) * i / n; if (i) shape.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); else shape.moveTo(Math.cos(a) * r2, Math.sin(a) * r2); }
      for (i = n; i >= 0; i--) { a = a1 + (a2 - a1) * i / n; shape.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); } shape.closePath();
    }
    var g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, steps: 1 }); g.rotateX(-Math.PI / 2); g.translate(cx, y, cz); return g;
  }
  /* the arcs of a circle that remain when aisles of half-angle gh are cut at the given shape-space centres */
  function arcSegments(gaps, gh) { if (!gaps || !gaps.length) return [[0, TWO_PI]]; var c = gaps.slice().sort(function (a, b) { return a - b; }); var out = []; for (var i = 0; i < c.length; i++) { var a1 = c[i] + gh, a2 = (i + 1 < c.length ? c[i + 1] : c[0] + TWO_PI) - gh; if (a2 > a1) out.push([a1, a2]); } return out; }
  function artifact(id) { var list = reg.artifacts || []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }
  function zone(id) { var list = reg.zones || []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }
  function nameTexture(text) {
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas'); c.width = 1024; c.height = 192; var g = c.getContext('2d'); if (!g) return null;
    g.clearRect(0, 0, 1024, 192); g.font = '600 96px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; try { g.letterSpacing = '16px'; } catch (e) { }
    g.shadowColor = '#dfe8ff'; g.shadowBlur = 10; g.fillStyle = '#e9f8ff'; g.fillText(text, 512, 92); g.shadowBlur = 0; g.fillStyle = '#dfe8ff'; g.fillRect(232, 160, 560, 4);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  /* local frame of a building whose door face is local -x: theta = group yaw, hw = half extent along the door axis, hd = half extent along the
     door facade, d0 = the door centre's offset along the facade (registry doors carry side + world x/z) */
  function doorFrame(A, door) {
    var cx = A.position[0], cz = A.position[2], w = A.footprint.w, d = A.footprint.d; var side = door.side || '-x';
    if (side === '+x') return { theta: Math.PI, hw: w / 2, hd: d / 2, d0: cz - door.z };
    if (side === '-z') return { theta: -Math.PI / 2, hw: d / 2, hd: w / 2, d0: cx - door.x };
    if (side === '+z') return { theta: Math.PI / 2, hw: d / 2, hd: w / 2, d0: door.x - cx };
    if (side !== '-x') log('matchHall: unknown door side ' + side + ' → treated as -x');
    return { theta: 0, hw: w / 2, hd: d / 2, d0: door.z - cz };
  }

  /* ---------- EXTERIOR: the official match building (black body, graphite crown + portal, platinum plinth, cyan lines) ---------- */
  function buildBuilding() {
    var A = artifact('MATCH_HALL'); if (!A || !A.position || !A.footprint) { log('matchHall: MATCH_HALL artifact (position / footprint) missing → exterior skipped'); return; }
    var door = A.door || { side: '-x', x: A.position[0] - A.footprint.w / 2, z: A.position[2], width: 6, height: 5 }; if (!A.door) log('matchHall: MATCH_HALL.door missing → default 6 × 5 door on -x');
    var F = doorFrame(A, door); var hw = F.hw, hd = F.hd, d0 = F.d0; var H = A.footprint.h || 22; var dw = (door.width || 6) / 2, dh = door.height || 5;
    var RECESS = 3.0;                                    /* == the FACE_S / FACE_N collider depth in worldLayout.artifactColliders */
    var PLINTH = 0.3, CROWN = 1.0, BEVEL = 0.45; var bodyTop = H - CROWN - 2 * BEVEL - 0.25;   /* crown top = H - 0.25 (never above the collider) */
    var black = [], graphite = [], platinum = [], cyan = [];
    /* body: MAIN mass + the two door-face piers + the lintel block (the recess is real, matching the collider split) */
    black.push(box(2 * hw - RECESS, bodyTop - PLINTH, 2 * hd, RECESS / 2, PLINTH, 0));
    black.push(box(RECESS, bodyTop - PLINTH, (d0 - dw) + hd, -hw + RECESS / 2, PLINTH, (-hd + d0 - dw) / 2));
    black.push(box(RECESS, bodyTop - PLINTH, hd - (d0 + dw), -hw + RECESS / 2, PLINTH, (d0 + dw + hd) / 2));
    black.push(box(RECESS, bodyTop - dh, 2 * dw, -hw + RECESS / 2, dh, d0));
    /* softened silhouette: a bevelled graphite crown band with rounded corners, overhanging the body */
    var crown = new THREE.ExtrudeGeometry(roundedRect(2 * hw + 0.5, 2 * hd + 0.5, 2.4), { depth: CROWN, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, steps: 1, curveSegments: 8 }); crown.rotateX(-Math.PI / 2); crown.translate(0, bodyTop + BEVEL, 0); graphite.push(crown);
    /* platinum: plinth (0.3 m, 0.25 proud, absent in the doorway), ledge under the crown, one roof diamond */
    platinum.push(box(2 * hw - RECESS + 0.25, PLINTH, 2 * hd + 0.5, RECESS / 2 + 0.125, 0, 0));
    platinum.push(box(RECESS + 0.25, PLINTH, (d0 - dw) + hd + 0.25, -hw + RECESS / 2 - 0.125, 0, (-hd - 0.25 + d0 - dw) / 2));
    platinum.push(box(RECESS + 0.25, PLINTH, hd + 0.25 - (d0 + dw), -hw + RECESS / 2 - 0.125, 0, (d0 + dw + hd + 0.25) / 2));
    [-1, 1].forEach(function (s) { platinum.push(box(0.18, 0.12, 2 * hd + 0.36, s * (hw + 0.09), bodyTop - 0.5, 0)); platinum.push(box(2 * hw + 0.36, 0.12, 0.18, 0, bodyTop - 0.5, s * (hd + 0.09))); });
    var gem = new THREE.OctahedronGeometry(0.8, 0); gem.scale(1, 1.6, 1); gem.translate(0, H + 0.9, 0); platinum.push(gem);   /* roof diamond: y 21.6 .. 24.2, the only part above the 22 m collider */
    /* the door: a graphite portal frame proud of the face, a graphite threshold in the recess, the cyan lintel line, the name plate backing */
    [-1, 1].forEach(function (s) { graphite.push(box(0.35, dh + 0.9, 0.5, -hw - 0.175, 0, d0 + s * (dw + 0.25))); });
    graphite.push(box(0.35, 0.6, 2 * dw + 1.0, -hw - 0.175, dh + 0.3, d0));
    graphite.push(box(RECESS + 0.5, 0.03, 2 * dw, -hw + RECESS / 2 - 0.25, 0, d0));
    graphite.push(box(0.16, 2.0, 9.0, -hw - 0.08, dh + 1.6, d0));
    cyan.push(box(0.08, 0.12, 2 * dw + 0.5, -hw - 0.39, dh + 0.54, d0));
    cyan.push(box(0.05, 0.06, 9.0, -hw - 0.19, dh + 1.42, d0));
    /* recess: vertical lines on both jamb faces + a floor line at the gate threshold (reads as an open, lit gate) */
    [-1, 1].forEach(function (s) { cyan.push(box(0.14, dh - 0.7, 0.06, -hw + RECESS / 2, 0.35, d0 + s * (dw - 0.03))); });
    cyan.push(box(0.1, 0.03, 2 * dw - 0.4, -hw + RECESS - 0.15, 0.03, d0));
    /* approach lines on the ground either side of the door path (the MATCH_DOOR interactable sits ~4 m out on this axis) */
    [-1, 1].forEach(function (s) { cyan.push(box(6.0, 0.03, 0.12, -hw - 3.2, 0.005, d0 + s * (dw + 0.4))); });
    /* vertical light lines: evenly spaced on all four facades, ending under one horizontal band below the crown; none in the door zone */
    var S = 2.5, y0 = PLINTH + 0.6, y1 = bodyTop - 1.1, L = y1 - y0, strips = 0;
    function alongZ(x, proudSign, skipDoor) { for (var z = -hd + S / 2; z < hd - S / 4; z += S) { if (skipDoor && Math.abs(z - d0) < dw + 1.2) continue; cyan.push(box(0.06, L, 0.14, x + proudSign * 0.03, y0, z)); strips++; } }
    function alongX(z, proudSign) { for (var x = -hw + S / 2; x < hw - S / 4; x += S) { cyan.push(box(0.14, L, 0.06, x, y0, z + proudSign * 0.03)); strips++; } }
    alongZ(-hw, -1, true); alongZ(hw, 1, false); alongX(-hd, -1); alongX(hd, 1);
    [-1, 1].forEach(function (s) { cyan.push(box(0.05, 0.07, 2 * hd + 0.1, s * (hw + 0.025), bodyTop - 0.78, 0)); cyan.push(box(2 * hw + 0.1, 0.07, 0.05, 0, bodyTop - 0.78, s * (hd + 0.025))); });
    /* assemble */
    var g = new THREE.Group(); g.name = 'MATCH_HALL'; g.position.set(A.position[0], 0, A.position[2]); g.rotation.y = F.theta; g.userData.noMerge = true;
    var meshes = [merged(black, mat('black', { color: 0x0b0d11, roughness: 0.42, metalness: 0.8 }), 'MATCH_HALL_BODY', true), merged(graphite, mat('graphite', { color: 0x1d2229, roughness: 0.55, metalness: 0.75 }), 'MATCH_HALL_CROWN', true), merged(platinum, mat('platinum', { color: 0xdfe6ee, roughness: 0.34, metalness: 0.82 }), 'MATCH_HALL_PLINTH', true), merged(cyan, lineMat, 'MATCH_HALL_LINES', false)];
    var tris = 0; meshes.forEach(function (m) { if (m) { g.add(m); tris += m.userData.tris; } });
    /* the gate: a dark glass plane at the back of the recess (reads as open; the interior is a room transition) */
    var gate = new THREE.Mesh(new THREE.PlaneGeometry(2 * dw - 0.1, dh - 0.1), gateMat); gate.rotation.y = -Math.PI / 2; gate.position.set(-hw + RECESS - 0.08, dh / 2, d0); gate.name = 'MATCH_HALL_GATE'; gate.renderOrder = 2; g.add(gate); tris += 2;
    /* the name plate 'MAH MATCH' (registry map label) as a canvas plane on the door facade above the portal */
    var label = (A.map && A.map.label) || 'MAH MATCH'; plateTex = nameTexture(label);
    if (plateTex) { plateMat = new THREE.MeshBasicMaterial({ map: plateTex, transparent: true, depthWrite: false }); var plate = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.62), plateMat); plate.rotation.y = -Math.PI / 2; plate.position.set(-hw - 0.17, dh + 2.6, d0); plate.name = 'MATCH_HALL_PLATE'; plate.renderOrder = 3; g.add(plate); tris += 2; }
    else log('matchHall: no document → name plate skipped');
    ctx.group.add(g); groups.push(g);
    stats.building = { id: A.id, at: [A.position[0], A.position[2]], door: { side: door.side || '-x', x: door.x, z: door.z, w: 2 * dw, h: dh }, draw_calls: g.children.length, tris: tris, strips: strips, height_m: H };
  }

  /* ---------- COURT: outdoor official-match ground (graphite disc, platinum rim + stepped spectator tiers, cyan rings, 4 pylons) ---------- */
  function buildCourt() {
    var C = artifact('MATCH_COURT_OUTDOOR'); var Z = zone('MATCH_COURT');
    if (!C || !C.position) { log('matchHall: MATCH_COURT_OUTDOOR artifact missing → court skipped'); return; }
    var cx = C.position[0], cz = C.position[2]; var R = C.r || (Z && Z.r) || 16; var sr = (Z && Z.spectator_r && Z.spectator_r.length === 2) ? Z.spectator_r : [R + 3, R + 8]; if (!Z || !Z.spectator_r) log('matchHall: zone MATCH_COURT.spectator_r missing → ring at r + 3 .. r + 8');
    var s1 = sr[0], s2 = sr[1], sm = (s1 + s2) / 2; var graphite = [], platinum = [], cyan = [];
    graphite.push(disc(R, 0.04, 0, 0, 96));
    platinum.push(arcPrism(R - 0.5, R + 0.25, 0.07, 0, 0, 0, 0, TWO_PI));                                    /* rim kerb (7 cm, not a collider) */
    var GH = 2.0 / s1; var segs = arcSegments([0, Math.PI / 2, Math.PI, Math.PI * 1.5], GH);                 /* four ~4 m aisles so the ring is approachable */
    segs.forEach(function (s) { platinum.push(arcPrism(s1, sm, 0.07, 0, 0, 0, s[0], s[1])); platinum.push(arcPrism(sm, s2, 0.14, 0, 0, 0, s[0], s[1])); cyan.push(arcPrism(s1 + 0.05, s1 + 0.2, 0.03, 0, 0, 0.07, s[0], s[1])); cyan.push(arcPrism(sm + 0.05, sm + 0.2, 0.03, 0, 0, 0.14, s[0], s[1])); });   /* FLAT spectator inlays (7 / 14 cm: below the host's 20 cm step, so no collider is needed and nothing is walked through) */
    [0.25, 0.5, 0.75].forEach(function (k) { cyan.push(flatRing(R * k - 0.06, R * k + 0.06, 0.065, 0, 0, 96)); }); cyan.push(disc(0.55, 0.065, 0, 0, 32));
    for (var i = 0; i < 4; i++) { var a = Math.PI / 4 + i * Math.PI / 2; var px = Math.cos(a) * (s1 - 1.3), pz = Math.sin(a) * (s1 - 1.3); graphite.push(cyl(0.28, 0.36, 4.6, px, 0, pz, 12)); platinum.push(cyl(0.4, 0.4, 0.12, px, 4.3, pz, 12)); cyan.push(box(0.18, 3.4, 0.18, px, 4.42, pz)); }
    var g = new THREE.Group(); g.name = 'MATCH_COURT'; g.position.set(cx, 0, cz); g.userData.noMerge = true;
    var meshes = [merged(graphite, mat('graphite', { color: 0x1d2229, roughness: 0.55, metalness: 0.75 }), 'MATCH_COURT_FLOOR', true), merged(platinum, mat('platinum', { color: 0xdfe6ee, roughness: 0.34, metalness: 0.82 }), 'MATCH_COURT_TIERS', true), merged(cyan, lineMat, 'MATCH_COURT_LINES', false)];
    var tris = 0; meshes.forEach(function (m) { if (m) { g.add(m); tris += m.userData.tris; } });
    ctx.group.add(g); groups.push(g);
    stats.court = { id: C.id, at: [cx, cz], r: R, spectator_r: [s1, s2], pylons: 4, aisles: segs.length, draw_calls: g.children.length, tris: tris };
  }

  /* ---------- INTERIOR: room MATCH_HALL (origin-centred room metres, +z = the doorway wall, as in interiorScene) ---------- */
  function buildInterior(roomId, roomGroup, room) {
    if (roomId !== 'MATCH_HALL') { log('matchHall.buildInterior: room ' + roomId + ' is not MATCH_HALL → null'); return null; }
    room = room || (reg.rooms_added && reg.rooms_added.MATCH_HALL) || null;
    if (!room || !roomGroup) { log('matchHall.buildInterior: room data / roomGroup missing → null'); return null; }
    var size = room.size_m || 44, half = size / 2, H = 9, T = 0.6; var ar = room.arena || { x: 0, z: -2, r: 12 }; if (!room.arena) log('matchHall.buildInterior: arena missing → default r 12 at (0, -2)');
    var tiers = Array.isArray(room.spectator_tiers) ? room.spectator_tiers : []; var ex = (room.exit && room.exit.position) || { x: 0, z: half - 2.4 }; var gx = ex.x || 0, gw = 1.4, dh = 4.4;
    var im = interiorMats = { black: mat('black', { color: 0x0b0d11 }).clone(), graphite: mat('graphite', { color: 0x1d2229 }).clone(), platinum: mat('platinum', { color: 0xdfe6ee }).clone(), line: lineMat.clone(), gate: gateMat.clone() };
    im.line.emissiveIntensity = night ? LINE_NIGHT : LINE_DAY; im.gate.emissiveIntensity = night ? GATE_NIGHT : GATE_DAY;
    var black = [], graphite = [], platinum = [], cyan = []; var walls = [];
    function wall(id, w, d, x, z, h, y0) { y0 = y0 || 0; black.push(box(w, h, d, x, y0, z)); walls.push({ id: id, type: 'BOX', x1: +(x - w / 2).toFixed(3), x2: +(x + w / 2).toFixed(3), z1: +(z - d / 2).toFixed(3), z2: +(z + d / 2).toFixed(3), h: y0 + h, y0: y0 }); }
    /* four dark walls (the +z wall carries the 2.8 m doorway gap at the exit x, with a header above 4.4 m) and a ceiling slab at 9 m */
    wall('WALL_S', size + 2 * T, T, 0, -half - T / 2, H); wall('WALL_W', T, size, -half - T / 2, 0, H); wall('WALL_E', T, size, half + T / 2, 0, H);
    var xl = -half - T, xr = half + T; wall('WALL_N_L', (gx - gw) - xl, T, (xl + gx - gw) / 2, half + T / 2, H); wall('WALL_N_R', xr - (gx + gw), T, (gx + gw + xr) / 2, half + T / 2, H); wall('WALL_N_HEAD', 2 * gw, T, gx, half + T / 2, H - dh, dh);
    black.push(box(size + 2 * T, 0.3, size + 2 * T, 0, H, 0));
    /* graphite: floor, four corner pilasters, the spectator tiers as ring prisms with one aisle towards the doorway (the spawn sits in it) */
    var floor = new THREE.PlaneGeometry(size, size); floor.rotateX(-Math.PI / 2); floor.translate(0, 0.01, 0); graphite.push(floor);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { graphite.push(box(0.9, H, 0.9, c[0] * (half - 0.45), 0, c[1] * (half - 0.45))); });
    /* spectator tiers = the room's walkable platforms (square frames, axis-aligned boxes): the visual IS the host collider; a platinum lip on every box top */
    var plats = Array.isArray(room.platforms) ? room.platforms : []; plats.forEach(function (p) { var w = p.x2 - p.x1, d = p.z2 - p.z1; graphite.push(box(w, p.height, d, (p.x1 + p.x2) / 2, 0, (p.z1 + p.z2) / 2)); platinum.push(box(w + 0.02, 0.05, d + 0.02, (p.x1 + p.x2) / 2, p.height, (p.z1 + p.z2) / 2)); });
    if (!plats.length && tiers.length) log('matchHall.buildInterior: room.platforms missing — spectator tiers not drawn (they must be host platforms)');
    /* platinum arena disc with a cyan edge ring and centre mark */
    platinum.push(cyl(ar.r, ar.r, 0.05, ar.x, 0, ar.z, 72)); cyan.push(arcPrism(ar.r - 0.15, ar.r + 0.06, 0.09, ar.x, ar.z, 0, 0, TWO_PI)); cyan.push(disc(0.5, 0.07, ar.x, ar.z, 32));
    /* cyan: vertical wall lines (evenly spaced, none in the doorway), the doorway frame lines, six light bars under the ceiling */
    var S = 2.75, ly = 0.7, lh = H - 1.6, strips = 0;
    for (var p = -half + S / 2; p < half - S / 4; p += S) { cyan.push(box(0.14, lh, 0.06, p, ly, -half + 0.02)); cyan.push(box(0.06, lh, 0.14, -half + 0.02, ly, p)); cyan.push(box(0.06, lh, 0.14, half - 0.02, ly, p)); strips += 3; if (Math.abs(p - gx) > gw + 0.9) { cyan.push(box(0.14, lh, 0.06, p, ly, half - 0.02)); strips++; } }
    [-1, 1].forEach(function (s) { cyan.push(box(0.14, dh, 0.06, gx + s * (gw + 0.12), 0, half - 0.03)); }); cyan.push(box(2 * gw + 0.5, 0.12, 0.06, gx, dh + 0.06, half - 0.03));
    for (var b = 0; b < 6; b++) cyan.push(box(0.32, 0.16, size - 8, -17.5 + b * 7, H - 0.16, 0));
    var meshes = [merged(black, im.black, 'MATCH_INT_WALLS', true), merged(graphite, im.graphite, 'MATCH_INT_FLOOR', true), merged(platinum, im.platinum, 'MATCH_INT_ARENA', true), merged(cyan, im.line, 'MATCH_INT_LINES', false)];
    var tris = 0, n = 0; meshes.forEach(function (m) { if (m) { roomGroup.add(m); tris += m.userData.tris; n++; } });
    var gate = new THREE.Mesh(new THREE.PlaneGeometry(2 * gw, dh), im.gate); gate.rotation.y = Math.PI; gate.position.set(gx, dh / 2, half + T / 2); gate.name = 'MATCH_INT_GATE'; gate.renderOrder = 2; roomGroup.add(gate); n++; tris += 2;
    stats.interior = { room: roomId, size_m: size, ceiling_m: H, tiers: tiers.length, strips: strips, draw_calls: n, tris: tris };
    return { walls: walls, solids: walls, ceiling_m: H, size_m: size, ready: Promise.resolve(true), arena: { x: ar.x, z: ar.z, r: ar.r }, tiers: tiers.slice(), platforms: plats.length, doorway: { x: gx, z: half, width: 2 * gw, height: dh }, draw_calls: n, tris: tris };
  }

  function applyNight(n) {
    night = !!n; if (lineMat) lineMat.emissiveIntensity = night ? LINE_NIGHT : LINE_DAY; if (gateMat) gateMat.emissiveIntensity = night ? GATE_NIGHT : GATE_DAY;
    if (interiorMats) { interiorMats.line.emissiveIntensity = night ? LINE_NIGHT : LINE_DAY; interiorMats.gate.emissiveIntensity = night ? GATE_NIGHT : GATE_DAY; }
  }
  var api = {
    build: function () {
      var base = mat('cyanLine', { color: 0xe6ecf6, emissive: 0xdfe8ff, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.2 }); lineMat = base.clone(); lineMat.name = 'matchHall_line';
      gateMat = new THREE.MeshStandardMaterial({ color: 0x05080c, roughness: 0.06, metalness: 0.7, transparent: true, opacity: 0.74, emissive: 0x10131c, emissiveIntensity: GATE_DAY, depthWrite: false }); gateMat.name = 'matchHall_gate';
      try { buildBuilding(); } catch (e) { log('matchHall: exterior failed: ' + (e && e.message || e)); }
      try { buildCourt(); } catch (e) { log('matchHall: court failed: ' + (e && e.message || e)); }
      applyNight(ctx.night);
    },
    setNight: applyNight,
    buildInterior: buildInterior,
    dispose: function () {
      groups.forEach(function (g) { if (g.parent) g.parent.remove(g); g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }); groups = [];
      if (lineMat) lineMat.dispose(); if (gateMat) gateMat.dispose(); if (plateMat) plateMat.dispose(); if (plateTex) plateTex.dispose(); lineMat = gateMat = plateMat = plateTex = null; stats.building = stats.court = null; if (_instance === api) _instance = null;
    },
    debug: function () { return { building: stats.building, court: stats.court, interior: stats.interior, night: night, draw_calls_field: (stats.building ? stats.building.draw_calls : 0) + (stats.court ? stats.court.draw_calls : 0) }; }
  };
  _instance = api; return api;
}

/* module-level convenience for a host that imports buildInterior directly: it serves the latest createMatchHall() instance
   (worldB.buildInterior calls the instance method itself) */
export function buildInterior(roomId, roomGroup, room) {
  if (!_instance) { if (typeof console !== 'undefined') console.warn('matchHall.buildInterior: createMatchHall(ctx) has not run yet'); return null; }
  return _instance.buildInterior(roomId, roomGroup, room);
}
