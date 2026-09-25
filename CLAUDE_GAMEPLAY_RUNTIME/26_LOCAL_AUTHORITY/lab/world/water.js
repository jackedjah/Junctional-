/* MAHWORLD JOB B :: WATER + BRIDGES (owner directive 2026-09-19) — the river band(s) and their bridges, placed from
   registry.water and drawn from the SAME collider shapes the host uses (worldLayout.waterColliders): every kerb segment, deck,
   ramp and rail lane the player collides with is exactly what is drawn here — visuals == colliders, no re-implemented placement.
   Look: platinum kerbs / decks / ramps, chrome railings (posts every 3 m + top and mid rail), cyan light lines along the deck
   edges (slow emissive pulse), pale-platinum landing pads at each bridge end, a dark sapphire trench (bed + bank walls) under a
   blue metallic water surface with a procedural tileable normal map (built ONCE as a 256² DataTexture, scrolled in tick).
   Day is the default; setNight() only retunes material properties. Draw calls at rest: 6 (surface, trench, platinum, chrome,
   cyan lines, pads) — everything merged with BufferGeometryUtils.mergeGeometries. Flight / camera clearance: the tallest thing
   here is the rail top (deck_y + rail_h); debug().maxY reports it. No per-frame allocations.
   Integration note (not solved here, presentation only): the FIELD district floor is an opaque plane at y ≈ 0 across the whole
   field, while the river surface sits at surface_y (−1) — the floor must carry a cut-out over the river band for the water to
   be visible; the geometry here is authored at the registry heights regardless. */
import { mergeGeometries } from '../../vendor/three/BufferGeometryUtils.js';
import { waterColliders } from './worldLayout.js';
import { createRipples } from './waterRipples.js';   /* owner interjection 2026-09-19: responsive water (near-window GPU ripples) + floating objects */

export function createWater(ctx) {
  var THREE = ctx.THREE, M = ctx.M || {}, log = ctx.log || function () { };
  var group = null, meshes = [], ownMats = [], normalTex = null, waterMat = null, lineMat = null, padMat = null, foamMat = null, foamMeshes = []; var ripples = null; var floats = null, floatN = 0, floatData = [], floatM4 = null, floatQ = null, floatV = null, floatS = null, floatE = null, floatRivers = [];
  var night = !!ctx.night, clock = 0;
  var DAY = { color: 0x1b4a76, rough: 0.2, env: 0.62, opacity: 0.76, line: 1.6, lineAmp: 0.22 };   /* translucent enough that the beach continues visibly under the water near the shore */
  var NIGHT = { color: 0x10304f, rough: 0.10, env: 1.15, opacity: 0.90, line: 2.6, lineAmp: 0.45 };
  var NORMAL_BASE = 0.17, NORMAL_AMP = 0.03, TILE_M = 13, POST_M = 3, GROUND_Y = 0, PAD_D = 2.4, PAD_MARGIN = 0.6;
  var counts = { rivers: 0, bridges: 0, kerbSegments: 0, decks: 0, ramps: 0, rails: 0, posts: 0, edgeLines: 0, pads: 0, drawCalls: 0, triangles: 0, maxY: 0, railTopY: 0, clearanceOk: true, night: night };

  function num() { for (var i = 0; i < arguments.length; i++) if (typeof arguments[i] !== 'number' || !isFinite(arguments[i])) return false; return true; }
  function validRiver(r) { return !!r && num(r.x1, r.x2, r.z1, r.z2, r.surface_y, r.bed_y) && r.x2 > r.x1 && r.z2 > r.z1 && r.bed_y < r.surface_y; }
  function validBridge(b) { return !!b && num(b.x1, b.x2, b.z1, b.z2, b.deck_y) && b.x2 > b.x1 && b.z2 > b.z1 && b.deck_y > 0; }
  function shared(name, fallback) { if (M[name]) return M[name]; var m = new THREE.MeshStandardMaterial(fallback); ownMats.push(m); log('water: ctx.M.' + name + ' missing — local fallback material'); return m; }

  /* axis-aligned box from bounds (metres) */
  function box(x1, x2, y0, y1, z1, z2) { var g = new THREE.BoxGeometry(x2 - x1, y1 - y0, z2 - z1); g.translate((x1 + x2) / 2, (y0 + y1) / 2, (z1 + z2) / 2); return g; }
  /* thin box whose TOP surface runs from (z1, h0) to (z2, h1) — the RAMP shape (axis z); `thick` is measured normal to the slope */
  function slopedBox(w, thick, cx, z1, z2, h0, h1) {
    var dz = z2 - z1, dh = h1 - h0, L = Math.hypot(dz, dh), th = -Math.atan2(dh, dz);
    var g = new THREE.BoxGeometry(w, thick, L); g.rotateX(th);
    var nyy = Math.cos(th), nz = Math.sin(th);   /* rotated +y = top-face normal */
    g.translate(cx, (h0 + h1) / 2 - nyy * thick / 2, (z1 + z2) / 2 - nz * thick / 2); return g;
  }
  function flat(x1, x2, z1, z2, y) { var g = new THREE.PlaneGeometry(x2 - x1, z2 - z1, 1, 1); g.rotateX(-Math.PI / 2); g.translate((x1 + x2) / 2, y, (z1 + z2) / 2); return g; }
  function addMerged(list, mat, name) {
    if (!list.length) return null; var merged = null; try { merged = mergeGeometries(list, false); } catch (e) { merged = null; }
    list.forEach(function (g) { g.dispose(); }); if (!merged) { log('water: merge failed for ' + name); return null; }
    var mesh = new THREE.Mesh(merged, mat); mesh.name = name; mesh.receiveShadow = true; mesh.userData.noMerge = true; group.add(mesh); meshes.push(mesh);
    merged.computeBoundingBox(); counts.maxY = Math.max(counts.maxY, merged.boundingBox.max.y); counts.drawCalls++; counts.triangles += Math.round((merged.index ? merged.index.count : merged.attributes.position.count) / 3);
    return mesh;
  }
  /* seamless procedural water normal map: a sum of integer-frequency sines (tileable) → central-difference normals, encoded RGBA8 */
  function foamTexture() { var c = document.createElement('canvas'); c.width = 256; c.height = 64; var g = c.getContext('2d'); g.clearRect(0, 0, 256, 64); for (var i = 0; i < 40; i++) { var x = Math.random() * 256, y = 12 + Math.random() * 40, r = 6 + Math.random() * 14; var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } var t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }
  function makeNormalTexture(n) {
    var data = new Uint8Array(n * n * 4), h = new Float32Array(n * n), TAU = Math.PI * 2, x, y, i;
    var waves = [[3, 2, 1.0, 0.0], [5, -3, 0.6, 1.7], [-2, 6, 0.5, 0.6], [7, 4, 0.3, 2.9], [1, -8, 0.22, 4.1], [9, -1, 0.16, 5.3], [-6, -6, 0.2, 0.9]];
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) { var u = x / n, v = y / n, s = 0; for (i = 0; i < waves.length; i++) { var w = waves[i]; s += w[2] * Math.sin(TAU * (w[0] * u + w[1] * v) + w[3]); } h[y * n + x] = s; }
    var S = 0.03 * n / 2;   /* gradient per uv unit × strength */
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
      var xl = (x + n - 1) % n, xr = (x + 1) % n, yd = (y + n - 1) % n, yu = (y + 1) % n;
      var gx = (h[y * n + xr] - h[y * n + xl]) * S, gy = (h[yu * n + x] - h[yd * n + x]) * S;
      var nx = -gx, ny = -gy, nz = 1, il = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz); nx *= il; ny *= il; nz *= il;
      var o = (y * n + x) * 4; data[o] = Math.round((nx * 0.5 + 0.5) * 255); data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255); data[o + 2] = Math.round((nz * 0.5 + 0.5) * 255); data[o + 3] = 255;
    }
    var tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    var maxAniso = 4; try { if (ctx.renderer && ctx.renderer.capabilities) maxAniso = Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy()); } catch (e) { } tex.anisotropy = maxAniso; tex.needsUpdate = true; return tex;
  }

  function build() {
    var reg = ctx.registry, W = reg && reg.water;
    if (!W) { log('water: registry.water missing — nothing built'); return; }
    var rivers = (W.rivers || []).filter(function (r) { var ok = validRiver(r); if (!ok) log('water: river ' + (r && r.id) + ' skipped (missing / invalid x1 x2 z1 z2 surface_y bed_y)'); return ok; });
    var bridges = (W.bridges || []).filter(function (b) { var ok = validBridge(b); if (!ok) log('water: bridge ' + (b && b.id) + ' skipped (missing / invalid x1 x2 z1 z2 deck_y)'); return ok; });
    if (!rivers.length && !bridges.length) { log('water: no valid rivers or bridges — nothing built'); return; }
    var kerbH = num(W.kerb_h) ? W.kerb_h : 0.45;
    var shapes = waterColliders({ water: { rivers: rivers, bridges: bridges, kerb_h: kerbH } });   /* the host's exact collider set */
    group = new THREE.Group(); group.name = 'MAHWORLD_WATER'; group.userData.noMerge = true; ctx.group.add(group);

    normalTex = makeNormalTexture(256); ctx.waterNormalTex = normalTex;   /* shared with the coast's sea */
    waterMat = new THREE.MeshStandardMaterial({ color: DAY.color, roughness: DAY.rough, metalness: 0.55, transparent: true, opacity: DAY.opacity, envMapIntensity: DAY.env, side: THREE.FrontSide, normalMap: normalTex, normalScale: new THREE.Vector2(NORMAL_BASE, NORMAL_BASE) }); ownMats.push(waterMat);
    var cyanSrc = M.cyanLine || null; lineMat = cyanSrc ? cyanSrc.clone() : new THREE.MeshStandardMaterial({ color: 0xe6ecf6, emissive: 0xdfe8ff, emissiveIntensity: DAY.line, roughness: 0.3, metalness: 0.2 }); ownMats.push(lineMat);   /* cloned: its emissive pulses */
    padMat = new THREE.MeshStandardMaterial({ color: 0xeef3f8, roughness: 0.3, metalness: 0.84, envMapIntensity: 0.6 }); ownMats.push(padMat);   /* slightly lighter than ctx.M.platinum */
    var platinum = shared('platinum', { color: 0xdfe6ee, roughness: 0.34, metalness: 0.82 }), chromeM = shared('chrome', { color: 0xc9d3dc, roughness: 0.2, metalness: 0.95 }), sapphire = shared('sapphire', { color: 0x1c2a46, roughness: 0.4, metalness: 0.7 });

    var surf = [], trench = [], shore = [], foam = [], plat = [], chrome = [], lines = [], pads = [];
    /* (1) rivers: water surface at surface_y (uv scaled so the normal map tiles every TILE_M metres), sapphire bed at bed_y + the two bank walls up to ground */
    rivers.forEach(function (r) {
      var w = r.x2 - r.x1, d = r.z2 - r.z1, cx = (r.x1 + r.x2) / 2, cz = (r.z1 + r.z2) / 2;
      var g = new THREE.PlaneGeometry(w, d, 1, 1); var uv = g.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / TILE_M, uv.getY(i) * d / TILE_M); g.rotateX(-Math.PI / 2); g.translate(cx, r.surface_y, cz); surf.push(g);
      /* BEACH banks (owner 2026-09-19): the ground slopes from the floor edge down to the wade floor over shore_w on each bank (the SAME profile as the host's water ramps), then the flat bed; the shore gradient reads dry → wet → deep */
      var sw = r.shore_w || 0, wy = r.wade_y !== undefined ? r.wade_y : r.bed_y; var SEG = 8;
      var px = r.pond ? sw : 0;   /* a POND (owner 2026-09-20 §12): beach shores on all four sides */
      if (sw > 0) { [[r.z1, 1], [r.z2, -1]].forEach(function (bank) { var g2 = new THREE.PlaneGeometry(w, sw, 1, SEG);   /* full width: the pond corners are shore (review 2026-09-20) */ g2.rotateX(-Math.PI / 2); var pos = g2.attributes.position, uv2 = g2.attributes.uv; for (var i = 0; i < pos.count; i++) { var lz = pos.getZ(i); var t = (lz + sw / 2) / sw;   /* 0 at the local −z edge … 1 at +z */ var dEdge = bank[1] > 0 ? t : 1 - t; var e = dEdge * dEdge * (3 - 2 * dEdge); pos.setY(i, wy * e); uv2.setXY(i, pos.getX(i) / 9, Math.min(1, dEdge < 0.25 ? dEdge * 0.64 : 0.16 + (dEdge - 0.25) * 0.61));   /* dry sand up to the waterline (≈ 1.5 m in), then the wet band and the deep tone */ } g2.computeVertexNormals(); g2.translate(cx, 0, bank[0] + bank[1] * sw / 2); shore.push(g2); });
        if (r.pond) [[r.x1, 1], [r.x2, -1]].forEach(function (bank) { var g3 = new THREE.PlaneGeometry(sw, d - 2 * sw, SEG, 1); g3.rotateX(-Math.PI / 2); var pos3 = g3.attributes.position, uv3 = g3.attributes.uv; for (var i3 = 0; i3 < pos3.count; i3++) { var lx = pos3.getX(i3); var t3 = (lx + sw / 2) / sw; var dE = bank[1] > 0 ? t3 : 1 - t3; var e3 = dE * dE * (3 - 2 * dE); pos3.setY(i3, wy * e3); uv3.setXY(i3, pos3.getZ(i3) / 9, Math.min(1, dE < 0.25 ? dE * 0.64 : 0.16 + (dE - 0.25) * 0.61)); } g3.computeVertexNormals(); g3.translate(bank[0] + bank[1] * sw / 2, 0, cz); shore.push(g3); }); }
      var bedG = flat(r.x1 + px, r.x2 - px, r.z1 + sw, r.z2 - sw, wy); var buv = bedG.attributes.uv; for (var bi = 0; bi < buv.count; bi++) buv.setXY(bi, buv.getX(bi) * w / 9, 0.62); shore.push(bedG);   /* the bed at the wade floor, the deep end of the gradient */
      counts.rivers++;
    });
    /* (2) collider shapes → visuals. kerbs (rim) and decks are solid boxes from the ground, ramps are sloped boxes, rails get posts + rails */
    var byBridge = {}; bridges.forEach(function (b) { byBridge[b.id] = { b: b, deck: null, ramps: [], rails: [] }; });
    shapes.forEach(function (s) {
      if (s.rim) { plat.push(box(s.x1, s.x2, GROUND_Y, s.h, s.z1, s.z2)); counts.kerbSegments++; return; }
      if (s.water) return;   /* the bed collider is the trench drawn above */
      var owner = null; for (var id in byBridge) { if (s.id === id + '_DECK' || s.id === id + '_RAMP_S' || s.id === id + '_RAMP_N' || s.id === id + '_RAIL0' || s.id === id + '_RAIL1') { owner = byBridge[id]; break; } }
      if (!owner) { log('water: unowned collider shape ' + s.id + ' (drawn as a plain box)'); plat.push(box(s.x1, s.x2, num(s.y0) ? s.y0 : GROUND_Y, s.h, s.z1, s.z2)); return; }
      if (s.deck) { owner.deck = s; plat.push(box(s.x1, s.x2, GROUND_Y, s.h, s.z1, s.z2)); counts.decks++; }
      else if (s.type === 'RAMP') { owner.ramps.push(s); var top = Math.max(s.h0, s.h1); var th = Math.max(0.12, (top - GROUND_Y) * Math.cos(Math.atan2(s.h1 - s.h0, s.z2 - s.z1))); plat.push(slopedBox(s.x2 - s.x1, th, (s.x1 + s.x2) / 2, s.z1, s.z2, s.h0, s.h1)); counts.ramps++; }   /* thick enough that its underside meets the ground at the high end (reads solid from every above-ground view) */
      else if (s.rail) owner.rails.push(s);
    });
    /* walkable surface height along a bridge (deck + ramps) — used to seat the railing posts */
    function surfaceAt(o, z) { if (o.deck && z >= o.deck.z1 && z <= o.deck.z2) return o.deck.h; for (var i = 0; i < o.ramps.length; i++) { var r = o.ramps[i]; if (z >= r.z1 && z <= r.z2) return r.h0 + (r.h1 - r.h0) * (z - r.z1) / (r.z2 - r.z1); } return GROUND_Y; }
    bridges.forEach(function (b) {
      var o = byBridge[b.id]; counts.bridges++;
      o.rails.forEach(function (s) {
        var lx = (s.x1 + s.x2) / 2, top = s.h, base = num(s.y0) ? s.y0 : b.deck_y, mid = base + (top - base) * 0.55; counts.rails++; counts.railTopY = Math.max(counts.railTopY, top);
        chrome.push(box(lx - 0.07, lx + 0.07, top - 0.07, top, s.z1, s.z2));            /* top rail cap (level, == the collider's top edge) */
        chrome.push(box(lx - 0.025, lx + 0.025, mid - 0.025, mid + 0.025, s.z1, s.z2)); /* mid rail */
        var zs = []; for (var z = s.z1; z < s.z2 - 0.5; z += POST_M) zs.push(z); zs.push(s.z2);
        zs.forEach(function (z) { var zz = Math.min(s.z2 - 0.06, Math.max(s.z1 + 0.06, z)); var y0 = surfaceAt(o, zz), h = top - 0.07 - y0; if (h <= 0.05) return; var c = new THREE.CylinderGeometry(0.045, 0.052, h, 8, 1); c.translate(lx, y0 + h / 2, zz); chrome.push(c); counts.posts++; });
      });
      if (o.deck) { var d = o.deck; [d.x1 + 0.38, d.x2 - 0.38].forEach(function (lx) {   /* cyan light line just inboard of each rail lane, on the deck and continuing down both ramps */
        lines.push(box(lx - 0.04, lx + 0.04, d.h + 0.005, d.h + 0.035, d.z1, d.z2)); counts.edgeLines++;
        o.ramps.forEach(function (r) { lines.push(slopedBox(0.08, 0.03, lx, r.z1, r.z2, r.h0 + 0.02, r.h1 + 0.02)); counts.edgeLines++; }); }); }
      pads.push(flat(b.x1 - PAD_MARGIN, b.x2 + PAD_MARGIN, b.z1 - PAD_D, b.z1, GROUND_Y + 0.012)); pads.push(flat(b.x1 - PAD_MARGIN, b.x2 + PAD_MARGIN, b.z2, b.z2 + PAD_D, GROUND_Y + 0.012)); counts.pads += 2;   /* landing pads at both ends */
    });
    var shoreMat = M.shore || sapphire; addMerged(shore, shoreMat, 'WATER_SHORE'); if (trench.length) addMerged(trench, sapphire, 'WATER_TRENCH');
    /* FOAM lines: a soft white band along each waterline that laps in and out (waves rolling up the beach) */
    foamMat = new THREE.MeshBasicMaterial({ map: foamTexture(), transparent: true, opacity: 0.55, depthWrite: false, fog: true, color: 0xf2f8ff, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });   /* a decal on the water surface: never z-fights it (STABILITY 2026-09-20) */ ownMats.push(foamMat);
    rivers.forEach(function (r) { var sw2 = r.shore_w || 0; if (sw2 <= 0) return; var fw = 1.5; var fx0 = r.pond ? sw2 : 0; [[r.z1 + 1.7, 1], [r.z2 - 1.7, -1]].forEach(function (bank) { var fg = new THREE.PlaneGeometry(r.x2 - r.x1 - 2 * fx0, fw, 1, 1); fg.rotateX(-Math.PI / 2); var fuv = fg.attributes.uv; for (var i = 0; i < fuv.count; i++) fuv.setX(i, fuv.getX(i) * (r.x2 - r.x1) / 6); fg.translate((r.x1 + r.x2) / 2, r.surface_y + 0.012, bank[0]); var fm = new THREE.Mesh(fg, foamMat); fm.name = 'WATER_FOAM'; fm.userData.noMerge = true; fm.userData.foam = { z0: bank[0], dir: bank[1], phase: (r.x1 + r.x2) * 0.01 }; fm.renderOrder = 3; group.add(fm); meshes.push(fm); foamMeshes.push(fm); counts.drawCalls++; }); }); addMerged(plat, platinum, 'WATER_PLATINUM'); addMerged(chrome, chromeM, 'WATER_RAILS'); addMerged(lines, lineMat, 'WATER_EDGE_LINES'); addMerged(pads, padMat, 'WATER_LANDING_PADS');
    var surface = addMerged(surf, waterMat, 'WATER_SURFACE'); if (surface) { surface.receiveShadow = false; surface.renderOrder = 1; }
    /* responsive water: the near-window ripple field (impulses from the player / creatures / hooks) — the far surface keeps the drifting normal map */
    try { ripples = createRipples(ctx, { rivers: rivers, farMaterial: waterMat, tileM: TILE_M }); ripples.build(); ctx.ripples = ripples; } catch (e) { ripples = null; log('water: ripples failed (' + (e && e.message || e) + ')'); }   /* ctx.ripples: the coast registers the SEA body, the wildlife layer splashes into it */
    /* M8C WATER / LAND TRANSITION: shallow-water cue — from each waterline (1.7 m inside the rect, where the foam laps) the water stays
       lighter and more transparent over the rising bank and deepens to full colour ~6.5 m out, so the canals and ponds flow into their banks
       instead of ending as a flat blue sheet at a hard line. Chained AFTER the ripple system's own patch; value / alpha only. */
    (function () { var R = rivers.slice(0, 8).map(function (r) { return new THREE.Vector4(r.x1, r.z1, r.x2, r.z2); }); while (R.length < 8) R.push(new THREE.Vector4(1, 1, 0, 0));
      function shallow(wm) { if (!wm || wm.userData.shallowCue) return; wm.userData.shallowCue = true; var prevW = wm.onBeforeCompile, prevWK = wm.customProgramCacheKey;
      wm.onBeforeCompile = function (sh, rr) { if (prevW) prevW.call(this, sh, rr); sh.uniforms.uWR = { value: R };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vShW;').replace('#include <project_vertex>', '#include <project_vertex>\nvShW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vShW; uniform vec4 uWR[8];').replace('#include <color_fragment>', ['#include <color_fragment>',
          'float wEd = 1e5; for (int i = 0; i < 8; i++) { vec4 Rw = uWR[i]; if (vShW.x > Rw.x && vShW.x < Rw.z && vShW.z > Rw.y && vShW.z < Rw.w) wEd = min(wEd, min(min(vShW.x - Rw.x, Rw.z - vShW.x), min(vShW.z - Rw.y, Rw.w - vShW.z))); }',
          'float wShallow = 1.0 - smoothstep(1.4, 6.5, wEd);',
          'diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.45 + vec3(0.05), wShallow * 0.55); diffuseColor.a *= mix(1.0, 0.42, wShallow);'].join('\n'))
          .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - 0.6 * wShallow;'); };   /* over the shallows the sky mirror gives way to the submerged bank (it was invisible at eye level: grazing reflection swamped the tint) */
      wm.customProgramCacheKey = function () { return (prevWK ? prevWK.call(this) : '') + '|mahworld-water-shallow2'; }; wm.needsUpdate = true; }
      shallow(waterMat); var nearW = ctx.group && ctx.group.getObjectByName('WATER_NEAR'); if (nearW) shallow(nearW.material); })();   /* the ripple NEAR window is a clone taken before this patch with its own hook: it carries the cue too (it is what the eye sees at a bank) */
    /* ORIGINAL floating surface objects: MAHWORLD crystal float pads (hexagonal platinum discs with a crystal core) that ride the waves — buoyant, tilting with the local slope, decorative (no collider) */
    try { buildFloats(rivers, bridges); } catch (e) { log('water: float pads failed (' + (e && e.message || e) + ')'); }
    counts.clearanceOk = counts.maxY <= counts.railTopY + 1.1 + 1e-6;
    if (!counts.clearanceOk) log('water: clearance breach — maxY ' + counts.maxY.toFixed(2) + ' above rail top + 1.1');
    applyNight(night);
    log('water: ' + counts.rivers + ' river(s), ' + counts.bridges + ' bridge(s), ' + counts.drawCalls + ' draw calls, ' + counts.triangles + ' tris, maxY ' + counts.maxY.toFixed(2));
  }
  function buildFloats(rivers, bridges) {
    floatRivers = rivers; var rnd = ctx.rnd ? ctx.rnd(9137) : Math.random; var list = [];
    rivers.forEach(function (r) { var span = r.x2 - r.x1; var count = Math.min(14, Math.max(4, Math.round(span / 24))); for (var i = 0; i < count; i++) { var x = r.x1 + 8 + (span - 16) * (i + 0.5) / count + (rnd() - 0.5) * 10; var z = r.z1 + 3.5 + (r.z2 - r.z1 - 7) * rnd(); var nearBridge = bridges.some(function (b) { return x > b.x1 - 4 && x < b.x2 + 4; }); if (nearBridge) continue; list.push({ x: x, z: z, y: r.surface_y, r: 0.7 + rnd() * 0.7, yaw: rnd() * Math.PI * 2, phase: rnd() * 6.28, tilt: 0, ty: 0 }); } });
    if (!list.length) return; floatData = list; floatN = list.length;
    var hexG = new THREE.CylinderGeometry(1, 0.92, 0.12, 6, 1); hexG.translate(0, 0.06, 0); var coreG = new THREE.OctahedronGeometry(0.34, 0); coreG.scale(1, 0.55, 1); coreG.translate(0, 0.2, 0);
    var padMatF = shared('platinum', { color: 0xdfe6ee, roughness: 0.34, metalness: 0.82 }); var coreMat = M.crystal || shared('crystal', { color: 0xe8f4ff, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.85 });
    floats = new THREE.InstancedMesh(hexG, padMatF, floatN); floats.name = 'WATER_FLOAT_PADS'; floats.userData.noMerge = true; floats.frustumCulled = false; floats.castShadow = false; floats.receiveShadow = true; floats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    var cores = new THREE.InstancedMesh(coreG, coreMat, floatN); cores.name = 'WATER_FLOAT_CORES'; cores.userData.noMerge = true; cores.frustumCulled = false; cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage); floats.userData.cores = cores;
    floatM4 = new THREE.Matrix4(); floatQ = new THREE.Quaternion(); floatV = new THREE.Vector3(); floatS = new THREE.Vector3(); floatE = new THREE.Euler();
    group.add(floats); group.add(cores); meshes.push(floats, cores); counts.drawCalls += 2; counts.floats = floatN; updateFloats(0);
  }
  function updateFloats(t) {
    if (!floats) return; var cores = floats.userData.cores; var H = ripples ? ripples.heightAt : null;
    for (var i = 0; i < floatN; i++) { var f = floatData[i]; var h = H ? H(f.x, f.z) : 0; var hx = H ? H(f.x + 0.5, f.z) - H(f.x - 0.5, f.z) : 0; var hz = H ? H(f.x, f.z + 0.5) - H(f.x, f.z - 0.5) : 0;
      var bob = f.y + 0.02 + h * 0.85 + 0.015 * Math.sin(t * 0.8 + f.phase);   /* buoyant: rides ~85 % of the local wave height + a slow breathing bob */
      floatE.set(Math.max(-0.35, Math.min(0.35, hz * 0.9)), f.yaw + 0.02 * Math.sin(t * 0.3 + f.phase), Math.max(-0.35, Math.min(0.35, -hx * 0.9))); floatQ.setFromEuler(floatE);
      floatV.set(f.x, bob, f.z); floatS.set(f.r, 1, f.r); floatM4.compose(floatV, floatQ, floatS); floats.setMatrixAt(i, floatM4); floatS.set(f.r * 0.9, f.r * 0.9, f.r * 0.9); floatM4.compose(floatV, floatQ, floatS); cores.setMatrixAt(i, floatM4); }
    floats.instanceMatrix.needsUpdate = true; cores.instanceMatrix.needsUpdate = true;
  }
  function applyNight(n) { var P = n ? NIGHT : DAY; if (waterMat) { waterMat.color.setHex(P.color); waterMat.roughness = P.rough; waterMat.envMapIntensity = P.env; waterMat.opacity = P.opacity; } if (lineMat) lineMat.emissiveIntensity = P.line; }
  function tick(dt, t) {
    if (!waterMat) return; clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0);
    normalTex.offset.x = (clock * 0.011) % 1; normalTex.offset.y = (clock * 0.007) % 1;
    for (var fi = 0; fi < foamMeshes.length; fi++) { var fmesh = foamMeshes[fi], fd = fmesh.userData.foam; var ph = clock * 1.21 + fd.phase; fmesh.position.z = fd.dir * (0.9 * Math.sin(ph) + 0.3 * Math.sin(ph * 2.3)); fmesh.material.opacity = 0.32 + 0.28 * (0.5 + 0.5 * Math.sin(ph + 1.2)); }   /* waves lapping: the foam band rolls up the beach and back (≈ 5 s period) */
    var ns = NORMAL_BASE + NORMAL_AMP * Math.sin(clock * 0.55); waterMat.normalScale.x = ns; waterMat.normalScale.y = ns;
    var P = night ? NIGHT : DAY; lineMat.emissiveIntensity = P.line + P.lineAmp * (0.5 + 0.5 * Math.sin(clock * 1.3));
    if (ripples) ripples.tick(dt, clock); if (floats) updateFloats(clock);
  }
  function setNight(n) { night = !!n; counts.night = night; applyNight(night); if (ripples) ripples.setNight(night); }
  function dispose() {
    meshes.forEach(function (m) { if (m.parent) m.parent.remove(m); if (m.geometry) m.geometry.dispose(); }); meshes = [];
    ownMats.forEach(function (m) { m.dispose(); }); ownMats = []; if (normalTex) { normalTex.dispose(); normalTex = null; }
    if (ripples) { ripples.dispose(); ripples = null; } floats = null; floatData = []; floatN = 0; foamMeshes = []; foamMat = null;
    if (group && group.parent) group.parent.remove(group); group = null; waterMat = lineMat = padMat = null;
  }
  function debug() { var d = {}; for (var k in counts) d[k] = typeof counts[k] === 'number' ? +(+counts[k]).toFixed(3) : counts[k]; d.meshes = meshes.map(function (m) { return m.name; }); d.ripples = ripples ? ripples.debug() : null; d.floats = floatN; return d; }
  /* hooks: impulse(x, z, strength, radius) for later event sources (JOB A projectiles / attacks connect here), heightAt(x, z) for anything that floats */
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug, impulse: function (x, z, a, r) { return ripples ? ripples.impulse(x, z, a, r) : false; }, heightAt: function (x, z) { return ripples ? ripples.heightAt(x, z) : 0; }, inWater: function (x, z) { return ripples ? !!ripples.inWater(x, z) : false; } };
}
