/* MAHWORLD :: DESTINATION NAVIGATION (owner assignment 2026-09-18 §4 — nearby click / tap-to-move)
   Pure route planning over the SAME authoritative data the movement integrator uses (the rules-field colliders and the room's ground /
   platform heights). The host owns the result: a plan is a list of world waypoints that `integrate` walks with the ordinary moveVec, the
   ordinary speed band, accel / decel and `resolveMove` sliding — never a teleport, never a position tween.
   Contract: plan(q) → { ok, path:[{x,z}], target:{x,z,y}, snapped:boolean, straight:boolean, expansions } or { ok:false, reason, ... }.
   Reasons: OUT_OF_RANGE (distance from the PLAYER, not from the camera), OUT_OF_ROOM, TARGET_BLOCKED (inside a solid, unsupported drop /
   rise, under a ceiling too low for the body — after a bounded snap to nearby free ground), NO_ROUTE (bounded grid search exhausted).
   Range validation is separate from path length and from the search budget (max_expansions). Nothing here is per-frame: one plan per
   accepted tap, one bounded re-plan when the walker is stuck. */
export function createNavigator(NAV) {
  var C = Object.assign({ range_m: 30, arrive_radius_m: 0.35, waypoint_radius_m: 0.7, grid_m: 1.0, sample_m: 0.4, max_expansions: 4000, step_max_m: 0.6, snap_m: 1.5, body_height_m: 1.7, stuck_s: 1.2, stuck_progress_m: 0.12, max_replans: 1 }, NAV || {});
  function d2(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }
  /* one point of a route: q.ground(x, z, refY) → support height with the previous sample as the reference (continuity up a ramp / onto a low
     ledge, never a lift onto a 2 m deck from below); q.blocked(x, z, altitude) → solid or null; q.ceiling(x, z, altitude) → underside above or null */
  function sampleOk(q, x, z, prevG, powered, alt) {
    if (Math.abs(x) > q.half || Math.abs(z) > q.half) return null;
    if (powered) { if (q.blocked(x, z, alt)) return null; var c = q.ceiling(x, z, alt); if (c !== null && c < alt + C.body_height_m) return null; return { g: alt }; }
    var g = q.ground(x, z, prevG); if (prevG !== null && Math.abs(g - prevG) > C.step_max_m) return null; if (q.blocked(x, z, g)) return null; return { g: g };
  }
  function straightClear(q, ax, az, ag, bx, bz, powered, alt) { var L = d2(ax, az, bx, bz); var n = Math.max(1, Math.ceil(L / C.sample_m)); var g = ag; for (var i = 1; i <= n; i++) { var t = i / n; var s = sampleOk(q, ax + (bx - ax) * t, az + (bz - az) * t, g, powered, alt); if (!s) return false; g = s.g; } return true; }
  function snapTarget(q, x, z, refG, powered, alt) { if (sampleOk(q, x, z, refG, powered, alt)) return { x: x, z: z, snapped: false }; var best = null; for (var r = 0.5; r <= C.snap_m + 1e-6; r += 0.5) { for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; var sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r; if (sampleOk(q, sx, sz, refG, powered, alt)) { var dd = d2(x, z, sx, sz); if (!best || dd < best.d) best = { x: sx, z: sz, d: dd }; } } if (best) break; } return best ? { x: best.x, z: best.z, snapped: true } : null; }
  function astar(q, from, to, powered, alt) {
    var G = C.grid_m; var pad = Math.min(C.range_m / 2, 12); var minx = Math.floor((Math.min(from.x, to.x) - pad) / G), maxx = Math.ceil((Math.max(from.x, to.x) + pad) / G), minz = Math.floor((Math.min(from.z, to.z) - pad) / G), maxz = Math.ceil((Math.max(from.z, to.z) + pad) / G);
    var W = maxx - minx + 1; function key(cx, cz) { return (cz - minz) * W + (cx - minx); } var sx = Math.round(from.x / G), sz = Math.round(from.z / G), gx = Math.round(to.x / G), gz = Math.round(to.z / G);
    var open = [], gScore = {}, came = {}, ground = {}, closed = {}; var k0 = key(sx, sz); gScore[k0] = 0; ground[k0] = from.g; open.push({ k: k0, cx: sx, cz: sz, f: 0 }); var expansions = 0;
    function h(cx, cz) { var dx = Math.abs(cx - gx), dz = Math.abs(cz - gz); return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); }
    while (open.length) { var bi = 0; for (var i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i; var cur = open.splice(bi, 1)[0]; if (closed[cur.k]) continue; closed[cur.k] = true; expansions++; if (expansions > C.max_expansions) return { ok: false, expansions: expansions };
      if (cur.cx === gx && cur.cz === gz) { var cells = []; var k = cur.k, cx = cur.cx, cz = cur.cz; while (k !== undefined) { cells.push({ x: cx * G, z: cz * G, g: ground[k] }); var p = came[k]; if (!p) break; k = p.k; cx = p.cx; cz = p.cz; } cells.reverse(); return { ok: true, cells: cells, expansions: expansions }; }
      for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dz) continue; var nx = cur.cx + dx, nz = cur.cz + dz; if (nx < minx || nx > maxx || nz < minz || nz > maxz) continue; var nk = key(nx, nz); if (closed[nk]) continue; var s = sampleOk(q, nx * G, nz * G, ground[cur.k], powered, alt); if (!s) continue;
        if (dx && dz) { var a1 = sampleOk(q, (cur.cx + dx) * G, cur.cz * G, ground[cur.k], powered, alt), a2 = sampleOk(q, cur.cx * G, (cur.cz + dz) * G, ground[cur.k], powered, alt); if (!a1 || !a2) continue; }   /* no corner cutting through a solid */
        var ng = gScore[cur.k] + ((dx && dz) ? Math.SQRT2 : 1); if (gScore[nk] === undefined || ng < gScore[nk]) { gScore[nk] = ng; ground[nk] = s.g; came[nk] = { k: cur.k, cx: cur.cx, cz: cur.cz }; open.push({ k: nk, cx: nx, cz: nz, f: ng + h(nx, nz) }); } } }
    return { ok: false, expansions: expansions };
  }
  function stringPull(q, pts, powered, alt) { var out = []; var i = 0; while (i < pts.length - 1) { var j = pts.length - 1; while (j > i + 1 && !straightClear(q, pts[i].x, pts[i].z, pts[i].g, pts[j].x, pts[j].z, powered, alt)) j--; out.push({ x: pts[j].x, z: pts[j].z }); i = j; } return out; }
  return {
    config: C,
    /* q: { from:{x,z}, to:{x,z}, fromGround, powered, altitude, half, ground(x,z,refY), blocked(x,z,alt), ceiling(x,z,alt) } */
    plan: function (q) {
      var range = q.range_m || C.range_m; var dist = d2(q.from.x, q.from.z, q.to.x, q.to.z); if (dist > range) return { ok: false, reason: 'OUT_OF_RANGE', distance_m: +dist.toFixed(2), range_m: range };
      if (Math.abs(q.to.x) > q.half || Math.abs(q.to.z) > q.half) return { ok: false, reason: 'OUT_OF_ROOM', half_m: q.half };
      var powered = !!q.powered, alt = q.altitude || 0; var fromG = q.fromGround || 0;
      var tgt = snapTarget(q, q.to.x, q.to.z, powered ? null : fromG, powered, alt); if (!tgt) return { ok: false, reason: 'TARGET_BLOCKED', distance_m: +dist.toFixed(2) };
      var targetY = powered ? alt : q.ground(tgt.x, tgt.z, fromG); var target = { x: +tgt.x.toFixed(3), z: +tgt.z.toFixed(3), y: +targetY.toFixed(3) };
      if (straightClear(q, q.from.x, q.from.z, fromG, target.x, target.z, powered, alt)) return { ok: true, path: [{ x: target.x, z: target.z }], target: target, snapped: tgt.snapped, straight: true, expansions: 0, distance_m: +dist.toFixed(2) };
      var r = astar(q, { x: q.from.x, z: q.from.z, g: fromG }, target, powered, alt); if (!r.ok) return { ok: false, reason: 'NO_ROUTE', expansions: r.expansions, distance_m: +dist.toFixed(2) };
      var pts = r.cells.slice(); pts[0] = { x: q.from.x, z: q.from.z, g: fromG }; pts[pts.length - 1] = { x: target.x, z: target.z, g: pts[pts.length - 1].g }; var path = stringPull(q, pts, powered, alt); var len = 0; for (var i = 0; i < path.length; i++) { var p0 = i ? path[i - 1] : q.from; len += d2(p0.x, p0.z, path[i].x, path[i].z); }
      return { ok: true, path: path, target: target, snapped: tgt.snapped, straight: false, expansions: r.expansions, distance_m: +dist.toFixed(2), path_m: +len.toFixed(2) };
    }
  };
}
