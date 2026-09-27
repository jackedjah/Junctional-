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
import { taperShaft, energyTip, tipMaterial } from './formKit.js'; import { applySurface } from './surfaceDetail.js';

var TWO_PI = Math.PI * 2;
var _instance = null;   /* the latest createMatchHall() instance, so the module-level buildInterior export can serve a host that imports it directly */

export function createMatchHall(ctx) {
  var THREE = ctx.THREE; var M = ctx.M || {}; var log = ctx.log || function () { }; var reg = ctx.registry || {};
  var LINE_DAY = 1.6, LINE_NIGHT = 2.9, GATE_DAY = 0.45, GATE_NIGHT = 1.05;
  var night = !!ctx.night; var groups = []; var stats = { building: null, court: null, interior: null };
  var lineMat = null, gateMat = null, plateMat = null, plateTex = null;
  var facadeMat = null, facadeU = null, tickerMat = null, tickerTex = null, bladeMat = null, bladeTex = null, clock = 0;   /* M12 neo-Tokyo facade (owner pivot): animated lines, ticker, signage blade */   /* exterior + court materials (this module's own clones; never mutate ctx.M) */
  var interiorMats = null;                                                /* the current interior's clones (host-disposed on room exit) */
  var ownMats = [];                                                       /* M20: exterior materials this module creates (disposed with it) */
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
  function box(w, h, d, x, y, z) { var g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return g; }
  function tag(g, k) { var n = g.attributes.position.count, a = new Float32Array(n); a.fill(k); g.setAttribute('aLine', new THREE.BufferAttribute(a, 1)); return g; }   /* M12: line kind for the facade animation — 0 vertical strip, 1 horizontal band, 2 portal / sign edge (M14: 3 tier band, 4 light river; M19: 5 body floor reveal) */                       /* y = bottom */
  function cyl(rt, rb, h, x, y, z, seg) { var g = new THREE.CylinderGeometry(rt, rb, h, seg || 16); g.translate(x, y + h / 2, z); return g; }
  function disc(r, y, cx, cz, seg) { var g = new THREE.CircleGeometry(r, seg || 64); g.rotateX(-Math.PI / 2); g.translate(cx, y, cz); return g; }
  function flatRing(r1, r2, y, cx, cz, seg) { var g = new THREE.RingGeometry(r1, r2, seg || 96, 1); g.rotateX(-Math.PI / 2); g.translate(cx, y, cz); return g; }
  function roundedRect(w, d, r) { var s = new THREE.Shape(); var x = -w / 2, y = -d / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
  /* annular prism r1..r2, height h, bottom at y, covering the shape-space arc a1..a2 (a full ring when a2 - a1 >= 2π).
     The extrude is rotated flat with rotateX(-π/2), so shape angle -π/2 (3π/2) lands on world / room +z. */
  var ARC_SEG = 96;   /* M19: segments per full circle for the court's arcs / rings — 64 on the LOW tier (set in buildCourt) */
  function arcPrism(r1, r2, h, cx, cz, y, a1, a2) {
    var full = (a2 - a1) >= TWO_PI - 1e-6; var n = Math.max(8, Math.round((a2 - a1) / TWO_PI * ARC_SEG)); var shape = new THREE.Shape(); var i, a;
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

  /* ---------- M12 NEO-TOKYO FACADE (owner pivot 2026-09-26: the black building was stale; a premium, animated city-tech life) ----------
     Restrained and intentional, not cyberpunk clutter: the existing light strips carry slow rising PACKETS (most in one of the five class
     colours — the hall is where every class competes), a SCAN sweeps once round the building, the crown band CHASES, and the portal lines
     run a quick gold-white chase; a scrolling TICKER band wraps all four facades under the crown; a vertical SIGNAGE BLADE stands off the
     door-side corner. Day is quiet (base lines dim, packets faint); night is alive. All new pieces are above 3.4 m (ticker ≈ bodyTop − 2 m,
     blade 7–17 m); the strips keep their geometry. Cost: the lines stay one draw (own material clone, the court is untouched), +1 ticker,
     +2 blade (edge + sign faces). */
  var tickerGeo = null, bladeGeo = null, graphiteM2 = null;
  var CLASS_HEX = ['#e6c36a', '#3f78e8', '#d4344a', '#8f6ad8', '#f08ab8'], CLASS_NAMES = ['ATHLETE', 'TITAN', 'LEAN', 'VISIONARY', 'BAGE'];
  function tickerTexture() { var c = document.createElement('canvas'); c.width = 2048; c.height = 96; var g = c.getContext('2d'); g.fillStyle = '#05070b'; g.fillRect(0, 0, 2048, 96);
    g.font = '600 50px "Segoe UI", Arial, sans-serif'; g.textBaseline = 'middle'; try { g.letterSpacing = '6px'; } catch (e) { } var x = 30;
    function word(t, col) { g.fillStyle = col; g.fillText(t, x, 50); x += g.measureText(t).width + 34; } function dot(col) { g.fillStyle = col; g.fillRect(x, 42, 16, 16); x += 50; }
    word('MAH MATCH', '#f4f6ff'); dot('#f4f6ff'); word('OFFICIAL', '#aab3c4'); for (var i = 0; i < 5; i++) { dot(CLASS_HEX[i]); word(CLASS_NAMES[i], CLASS_HEX[i]); } dot('#f4f6ff'); word('LIVE', '#f4f6ff');
    g.fillStyle = 'rgba(255,255,255,0.08)'; for (var y = 0; y < 96; y += 4) g.fillRect(0, y, 2048, 1);   /* a faint LED raster */
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
  function bladeTexture() { var c = document.createElement('canvas'); c.width = 192; c.height = 1024; var g = c.getContext('2d'); g.fillStyle = '#06080c'; g.fillRect(0, 0, 192, 1024);
    g.font = '700 104px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; var letters = 'MAHMATCH'.split(''); letters.forEach(function (L, i) { g.fillStyle = i < 3 ? '#f4f6ff' : '#dfe6ee'; g.fillText(L, 96, 70 + i * 112 + (i >= 3 ? 30 : 0)); });
    for (var k = 0; k < 5; k++) { g.fillStyle = CLASS_HEX[k]; g.fillRect(20 + k * 32, 348, 24, 8); }   /* the five class bars between MAH and MATCH */
    g.fillStyle = '#f4f6ff'; g.fillRect(8, 0, 4, 1024); g.fillRect(180, 0, 4, 1024);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function neoTokyo(hw, hd, d0, dw, dh, bodyTop, cyan, graphite) { if (typeof document === 'undefined') return;
    /* ticker: four planes round the body, one continuous u along the perimeter so the text flows round the corners */
    var TH = 0.9, TY = bodyTop - 2.3, OUT = 0.08, REP = 36, u0 = 0, pos = [], uv = [], nor = [], idx = [];
    var sides = [[-hw - OUT, -hd, -hw - OUT, hd, -1, 0], [-hw, hd + OUT, hw, hd + OUT, 0, 1], [hw + OUT, hd, hw + OUT, -hd, 1, 0], [hw, -hd - OUT, -hw, -hd - OUT, 0, -1]];
    sides.forEach(function (S) { var L = Math.hypot(S[2] - S[0], S[3] - S[1]), b = pos.length / 3, u1 = u0 + L / REP;
      pos.push(S[0], TY, S[1], S[2], TY, S[3], S[2], TY + TH, S[3], S[0], TY + TH, S[1]); uv.push(u0, 0, u1, 0, u1, 1, u0, 1); for (var k = 0; k < 4; k++) nor.push(S[4], 0, S[5]); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); u0 = u1; });
    tickerGeo = new THREE.BufferGeometry(); tickerGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tickerGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); tickerGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); tickerGeo.setIndex(idx); tickerGeo.computeBoundingSphere();
    tickerTex = tickerTexture(); tickerMat = new THREE.MeshBasicMaterial({ map: tickerTex, side: THREE.DoubleSide }); tickerMat.name = 'matchHall_ticker';
    sides.forEach(function (S) { var L = Math.hypot(S[2] - S[0], S[3] - S[1]), mx = (S[0] + S[2]) / 2, mz = (S[1] + S[3]) / 2, ax = S[4] !== 0; [TY - 0.08, TY + TH + 0.02].forEach(function (yy) { cyan.push(tag(box(ax ? 0.05 : L, 0.06, ax ? L : 0.05, mx + S[4] * 0.03, yy, mz + S[5] * 0.03), 1)); }); });   /* the ticker's frame lines (they chase) */
    /* the signage blade off the door-side corner away from the door, perpendicular to the facade, 7–17 m up */
    var cz = d0 > 0 ? -hd + 1.4 : hd - 1.4, BW = 2.2, BH = 10, BY = 7;
    bladeGeo = new THREE.BoxGeometry(BW, BH, 0.36); bladeGeo.translate(-hw - 0.35 - BW / 2, BY + BH / 2, cz);
    bladeGeo.clearGroups(); bladeGeo.addGroup(0, 24, 0); bladeGeo.addGroup(24, 12, 1);   /* sides / top / bottom: graphite; the two broad faces: the sign */
    bladeTex = bladeTexture(); bladeMat = new THREE.MeshBasicMaterial({ map: bladeTex }); bladeMat.name = 'matchHall_blade'; graphiteM2 = mat('graphite', { color: 0x1d2229, roughness: 0.55, metalness: 0.75 });
    [BY + 1.2, BY + BH - 1.2].forEach(function (yy) { graphite.push(box(0.4, 0.3, 0.3, -hw - 0.2, yy, cz)); });   /* mounting brackets */
    cyan.push(tag(box(0.08, BH, 0.42, -hw - 0.35 - BW - 0.04, BY, cz), 2)); cyan.push(tag(box(BW + 0.1, 0.08, 0.42, -hw - 0.35 - BW / 2, BY + BH, cz), 2)); cyan.push(tag(box(BW + 0.1, 0.08, 0.42, -hw - 0.35 - BW / 2, BY - 0.08, cz), 2));   /* the blade's lit edges */
    /* the animated facade line material (own clone; the court keeps lineMat) */
    facadeMat = lineMat.clone(); facadeMat.name = 'matchHall_facade_lines'; facadeU = { uTime: { value: 0 }, uNight: { value: night ? 1 : 0 }, uH: { value: bodyTop } };
    facadeMat.onBeforeCompile = function (sh) { sh.uniforms.uTime = facadeU.uTime; sh.uniforms.uNight = facadeU.uNight; sh.uniforms.uH = facadeU.uH;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aLine; varying float vLine; varying vec3 vLP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLine = aLine; vLP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', ['#include <common>', 'uniform float uTime; uniform float uNight; uniform float uH; varying float vLine; varying vec3 vLP;',
        'float nkH(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
        'vec3 nkClass(float h) { if (h < 0.2) return vec3(0.791, 0.546, 0.141); if (h < 0.4) return vec3(0.05, 0.188, 0.807); if (h < 0.6) return vec3(0.658, 0.034, 0.069); if (h < 0.8) return vec3(0.275, 0.144, 0.686); return vec3(0.871, 0.254, 0.479); }'].join('\n'))
        .replace('#include <emissivemap_fragment>', ['#include <emissivemap_fragment>',
        '{ float k = vLine, t = uTime; vec3 Eb = totalEmissiveRadiance / max(length(totalEmissiveRadiance), 1e-3); vec3 add = vec3(0.0);',
        '  float ang = atan(vLP.z, vLP.x) / 6.2831853 + 0.5; float sweep = pow(0.5 - 0.5 * cos(fract(ang - t * 0.018) * 6.2831853), 6.0) * (0.9 + 0.1 * sin(t * 0.4));',
        '  if (k < 0.5) { float id = nkH(floor(vLP.xz * 0.4 + 0.5)); float yN = clamp(vLP.y / uH, 0.0, 1.0); float ph = fract(t * (0.035 + id * 0.03) + id * 7.0);',
        '    float on = step(0.45, fract(id * 13.7)); vec3 cc = mix(vec3(0.028, 0.147, 1.0), vec3(0.254, 0.074, 1.0), fract(id * 5.3)); for (int j = 0; j < 2; j++) { float d = fract(ph + float(j) * 0.47) - yN; float tail = exp(-d * d * 55.0) * (0.8 + 0.2 * sin(t * 0.9 + id * 11.0)); float head = exp(-d * d * 1400.0) * 0.5;',
        '    add += cc * (tail * 2.1 + head * 0.8) * on; } }   /* DESIGN DNA: soft eased light bulbs that breathe (no hard white head) */',
        '  else if (k < 1.5) { float f = fract(ang * 14.0 - t * 0.35); add += Eb * (0.5 - 0.5 * cos(f * 6.2831853)) * 0.55; }',
        '  else if (k < 2.5) { float f = fract((vLP.y + abs(vLP.z) + abs(vLP.x) * 0.3) * 0.3 - t * 0.5); add += vec3(0.9, 0.78, 0.5) * pow(0.5 - 0.5 * cos(f * 6.2831853), 3.0) * 0.9; }',
        '  else if (k < 3.5) { float a2 = atan(vLP.z, vLP.x - 3.0) / 6.2831853 + 0.5, lv = floor(vLP.y * 0.4); float f = fract(a2 * 2.0 - t * (0.045 + 0.02 * mod(lv, 3.0)) + lv * 0.37);',   /* M14 tier bands: TITAN blue ↔ VISIONARY violet, a soft light chasing round each floor at its own pace */
        '    vec3 cc = mix(vec3(0.028, 0.147, 1.0), vec3(0.254, 0.074, 1.0), 0.5 + 0.5 * sin(vLP.y * 0.35 + a2 * 6.2831853 + t * 0.25)); add += cc * (0.55 + 1.7 * pow(0.5 - 0.5 * cos(f * 6.2831853), 5.0)); }',
        '  else if (k < 4.5) { float f = fract(vLP.y * 0.04 - t * 0.2 + fract((vLP.x + vLP.z) * 0.013)); vec3 cc = mix(vec3(0.028, 0.147, 1.0), vec3(0.254, 0.074, 1.0), smoothstep(8.0, 40.0, vLP.y));',   /* M14 light rivers: pulses climbing the corners into the crown, blue below turning violet above */
        '    add += cc * (0.4 + 2.2 * pow(0.5 - 0.5 * cos(f * 6.2831853), 8.0)); }',
        '  else { float f = fract(ang * 2.0 - t * 0.022 + vLP.y * 0.05); vec3 cc = mix(vec3(0.05, 0.28, 1.0), vec3(0.254, 0.074, 1.0), 0.25 + 0.25 * sin(t * 0.17 + vLP.y * 0.3));',   /* M19 body floor reveals: a dim bright-blue line under each slab nose, one slow soft light travelling round it (restraint: not a neon band) */
        '    add += cc * (0.14 + 0.6 * pow(0.5 - 0.5 * cos(f * 6.2831853), 6.0)); }',
        '  float bk = k > 2.5 ? 0.25 : (k > 1.5 ? 2.6 : (k > 0.5 ? 1.0 : 0.45));   /* M15c restraint: the body strips keep only a faint base line — the black body leads */',
        '  totalEmissiveRadiance = Eb * mix(0.1, 0.13, uNight) * bk + add * mix(0.75, 1.0, uNight) + Eb * sweep * mix(0.35, 0.6, uNight) * (k > 2.5 ? 0.3 : 1.0); }'].join('\n')); };   /* absolute levels: a dim ice base line; class-coloured packets with a white head and a fading tail climb the strips, kept below the tone-map shoulder so the class colour survives (a hot packet read as flat white) */
    facadeMat.customProgramCacheKey = function () { return 'matchHall_neoTokyo'; }; facadeMat.color.setHex(0x14171d); facadeMat.metalness = 0.25; facadeMat.roughness = 0.55;   /* M20: a dark slot by day (at 0.6 metal the lines mirrored the pale sky as white stripes) */   /* dark diffuse: the lines are light, not white paint lit by the sky */
    stats.neoTokyo = { ticker_perimeter_m: +(u0 * REP).toFixed(1), blade: [BW, BH, BY] };
  }

  /* ---------- M14 SKY TIERS (owner 2026-09-27: "grander … taller / more significant, a few more visible floors / stacked upper levels, more
     expressive from top and side views, much more Neo-Tokyo / futuristic nightlife … very bright blue, strong purple, animated light movement
     across and into the building … layered facade logic … the inside beginning to reflect that energy … not tacky, not casino") ----------
     Three stepped, softened tiers rise from the roof, set back toward the rear so the door facade reads as a cascade. Every floor is a glass
     ribbon over a lit ROOM drawn by interior mapping (the view ray is carried to the room's back wall, ceiling or floor: a blue → violet
     wash, light beams sweeping it, light pooled low, ceiling light lines — true parallax, no geometry); every floor line and slab nose is a
     TITAN-blue / VISIONARY-violet band that chases round its tier; LIGHT RIVERS climb the body's corners and the tiers' rounded corners
     toward the crown; a lit halo ring and a tapered mast carry the roof diamond and a class-blue energy tip.
     Presentation only: every part is ABOVE the 22 m collider top (≥ 21.75 m) and inside the 40 × 40 footprint; the host collider is
     unchanged (a matching collider for the tiers waits on the runtime bridge). Cost: +2 draws (tier glass, tip); the tier bodies, slabs and
     lines merge into the existing body / crown / line draws. */
  var glassMat = null, glassU = null, tipM = null, tipGeo = null, sigilMat = null, sigilTex = null, sigilGeo = null;
  /* M15 SIGIL (owner 2026-09-27, reference renders: a stronger exterior identity): the MAH MATCH diamond sigil as a tall luminous panel on the
     plaza-facing door facade and on the south face — a crystal diamond cut into an M, lit from within in TITAN blue rising into VISIONARY
     violet, a slow light sweeping up through it. It sits on a graphite backing plate proud of the facade strips (9.4 – 17.6 m up). +1 draw. */
  function sigilTexture() { if (typeof document === 'undefined') return null; var c = document.createElement('canvas'); c.width = 512; c.height = 768; var g = c.getContext('2d'); if (!g) return null;
    g.clearRect(0, 0, 512, 768); g.lineJoin = 'round'; g.strokeStyle = '#ffffff'; g.shadowColor = '#ffffff'; g.shadowBlur = 18;
    function dia(cx, cy, w, h, lw) { g.lineWidth = lw; g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + w, cy); g.lineTo(cx, cy + h); g.lineTo(cx - w, cy); g.closePath(); g.stroke(); }
    dia(256, 330, 200, 300, 14); dia(256, 330, 150, 225, 5);
    g.lineWidth = 16; g.beginPath(); g.moveTo(150, 440); g.lineTo(150, 250); g.lineTo(256, 360); g.lineTo(362, 250); g.lineTo(362, 440); g.stroke();   /* the M */
    g.lineWidth = 6; g.beginPath(); g.moveTo(256, 360); g.lineTo(256, 520); g.stroke(); g.beginPath(); g.moveTo(256, 60); g.lineTo(256, 140); g.stroke();
    g.font = '600 58px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; try { g.letterSpacing = '10px'; } catch (e) { } g.shadowBlur = 10; g.fillStyle = '#ffffff'; g.fillText('MAH MATCH', 256, 715);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; return t; }
  function sigils(hw, hd, d0, graphite) { sigilTex = sigilTexture(); if (!sigilTex) return;
    var W = 5.5, Hh = 8.2, Y = 9.4, P = [], U = [], I = [], k = 0;   /* 9.4 – 17.6 m: clear of the name plate below and the ticker band above */
    function panel(cx, cz, nx, nz) { var tx = -nz, tz = nx; [[-1, 0], [1, 0], [1, 1], [-1, 1]].forEach(function (q) { P.push(cx + nx * 0.235 + tx * q[0] * W / 2, Y + q[1] * Hh, cz + nz * 0.235 + tz * q[0] * W / 2); U.push((q[0] * (nx + nz < 0 ? -1 : 1) + 1) / 2, q[1]); }); I.push(k, k + 1, k + 2, k, k + 2, k + 3); k += 4;
      var bw = Math.abs(nx) > 0 ? 0.24 : W + 0.8, bd = Math.abs(nx) > 0 ? W + 0.8 : 0.24; graphite.push(box(bw, Hh + 0.8, bd, cx + nx * 0.09, Y - 0.4, cz + nz * 0.09)); }
    panel(-hw, d0 > 0 ? d0 - 9.5 : d0 + 9.5, -1, 0);   /* door facade, beside the portal */
    panel(4, -hd, 0, -1);   /* south face */
    /* M19 fix: the sigil plane sat at 0.20 m, 1 cm BEHIND its backing plate's front face (0.21 m), so the depth test hid it and only the dark
       plate showed; it now stands 2.5 cm in front of the plate — the MAH MATCH diamond (blue → violet, the five-class sweep) finally reads.
       M19 review (the first time this shader was ever seen): it read the canvas's RED channel, and the un-premultiplied canvas is white
       wherever the glow halo reaches, so the line-art diamond drew as a solid glowing lozenge; the sweep AVERAGED the class colour with the
       blue → violet base (LEAN crimson turned pink) and a ~3x gain let the channels clip (gold → a white slab, TITAN blue → pale cyan).
       Now: the texture's ALPHA is the line coverage (the diamond, the M and the label draw as lines with a soft halo); the sweep eases the
       base to equal-channel white and rises from white into the class colour (never an RGB average of two far hues, as auraForms' cycle5);
       every colour is kept at full hue with its brightest channel at 1 and the light is capped below 1 (0.9 at night), so nothing clips;
       the line is drawn premultiplied OVER the plate (it hides what is behind it by its coverage), so by day the class colour is not washed
       toward pink / pale by the lit grey plate showing through additive light. */
    sigilGeo = new THREE.BufferGeometry(); sigilGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sigilGeo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); sigilGeo.setIndex(I); sigilGeo.computeBoundingSphere();
    sigilMat = new THREE.ShaderMaterial({ uniforms: { uMap: { value: sigilTex }, uTime: facadeU ? facadeU.uTime : { value: 0 }, uNight: facadeU ? facadeU.uNight : { value: night ? 1 : 0 } }, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide, toneMapped: false,   /* M19 review: premultiplied 'over' — the lit line hides the plate behind it (additive light on the daylit grey plate turned crimson pink); at night the plate is black and this is the old additive look */
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D uMap; uniform float uTime; uniform float uNight; varying vec2 vUv; void main() { float a = texture2D(uMap, vUv).a; if (a < 0.01) discard; vec3 B = vec3(0.028, 0.147, 1.0), V = vec3(0.254, 0.074, 1.0); vec3 c = mix(B, V, smoothstep(0.15, 0.95, vUv.y + 0.08 * sin(uTime * 0.3)));   /* M19 review: alpha = the line coverage */\n float sp = vUv.y * 0.8 - uTime * 0.09, sweep = exp(-pow(fract(sp) - 0.5, 2.0) * 40.0), n = mod(floor(sp), 5.0); vec3 K = n < 0.5 ? vec3(1.0, 0.848, 0.461) : (n < 1.5 ? vec3(0.375, 0.583, 1.0) : (n < 2.5 ? vec3(1.0, 0.245, 0.349) : (n < 3.5 ? vec3(0.662, 0.491, 1.0) : vec3(1.0, 0.575, 0.767))));   /* M16: each sweep up the sigil carries the next class in turn — gold, blue, crimson, violet, pink: the match hall belongs to all five (M19: the five class hexes at full brightness, display space) */\n float tw = smoothstep(0.12, 0.5, sweep), tk = smoothstep(0.5, 0.85, sweep); c = mix(mix(c, vec3(1.0), tw), K, tk); c = mix(c, vec3(1.0), 0.12 * a * a * (1.0 - tk)); c /= max(max(c.r, c.g), max(c.b, 1e-3));   /* M19: base → white → class (never an RGB average), a faint white line core, the brightest channel at 1 */\n gl_FragColor = vec4(c * min(a * mix(0.42, 0.62, uNight) * (1.0 + 0.45 * sweep), mix(0.66, 0.9, uNight)), min(a * 1.15, 0.92)); }' });   /* M19: capped light — the class reads as colour, never a clipped white glare */
    sigilMat.name = 'matchHall_sigil'; }
  function tierQ() { try { return ctx.quality && ctx.quality.tier ? String(ctx.quality.tier()).toUpperCase() : 'HIGH'; } catch (e) { return 'HIGH'; } }
  /* a vertical strip following a rounded-rect outline (w × d, corner r, centred at cx, cz) from y0 to y1, pushed off the outline by off;
     outward normals, u in metres along the outline; room = [floor y, room height] adds the glass aGlass attribute */
  function ribbon(w, d, r, cx, cz, y0, y1, off, n, room) {
    var pts = roundedRect(w, d, r).getSpacedPoints(n), N = pts.length, pos = [], nor = [], uv = [], gl = [], idx = [], u = 0;
    for (var i = 0; i < N; i++) { var a = pts[i === 0 || i === N - 1 ? N - 2 : i - 1], b = pts[i === 0 || i === N - 1 ? 1 : i + 1], tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1, nx = ty / tl, nz = tx / tl;   /* the outline runs counter-clockwise: 2D outward (ty, −tx) → world (x, −y) */
      if (i > 0) u += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); var X = cx + pts[i].x + nx * off, Z = cz - pts[i].y + nz * off;
      pos.push(X, y0, Z, X, y1, Z); nor.push(nx, 0, nz, nx, 0, nz); uv.push(u, 0, u, 1); if (room) gl.push(room[0], room[1], room[0], room[1]);
      if (i < N - 1) { var k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (room) g.setAttribute('aGlass', new THREE.Float32BufferAttribute(gl, 2)); g.setIndex(idx); return g;
  }
  function skyGlass() {
    glassMat = new THREE.MeshStandardMaterial({ color: 0x07090e, roughness: 0.08, metalness: 0.85, envMapIntensity: 1.1 }); glassMat.name = 'matchHall_sky_glass';
    glassU = { uTime: facadeU ? facadeU.uTime : { value: 0 }, uNight: facadeU ? facadeU.uNight : { value: night ? 1 : 0 } };
    glassMat.onBeforeCompile = function (sh) { sh.uniforms.uTime = glassU.uTime; sh.uniforms.uNight = glassU.uNight;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aGlass; varying vec2 vGl; varying vec3 vGW; varying vec3 vGN; varying float vGU;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGl = aGlass; vGU = uv.x; vGW = (modelMatrix * vec4(position, 1.0)).xyz; vGN = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uNight; varying vec2 vGl; varying vec3 vGW; varying vec3 vGN; varying float vGU;').replace('#include <emissivemap_fragment>', ['#include <emissivemap_fragment>',
        '{ vec3 V = normalize(vGW - cameraPosition); float cn = max(dot(V, -vGN), 0.1), t = uTime, fl = vGl.x, ce = vGl.x + vGl.y;',
        '  float sW = 3.2 / cn, sY = V.y > 0.0 ? (ce - vGW.y) / max(V.y, 1e-3) : (fl - vGW.y) / min(V.y, -1e-3), s = min(sW, max(sY, 0.0)); vec3 Q = vGW + V * s;',   /* interior mapping: the room's back wall, ceiling or floor */
        '  float wall = step(sW, sY), up = step(0.0, V.y), yIn = clamp((Q.y - fl) / max(vGl.y, 0.5), 0.0, 1.0);',
        '  vec3 B = vec3(0.05, 0.28, 1.0), P = vec3(0.254, 0.074, 1.0); vec3 wash = mix(B, P, 0.8 * smoothstep(0.3, 1.0, 0.5 + 0.5 * sin((Q.x * 0.07 + Q.z * 0.05) * 2.0 + t * 0.21 + fl * 0.4)));',   /* M19: bright TITAN blue leads, VISIONARY violet drifts through as the accent (the rooms read mostly violet before) */
        '  float beams = 0.45 * pow(0.5 + 0.5 * sin((Q.x - Q.z) * 0.42 - t * 0.35 + fl), 10.0);',   /* M20: one slow soft sweep across the room (two fast beams read as a club, not a hall) */
        '  float lines = pow(0.5 + 0.5 * cos((Q.x + Q.z) * 1.9), 24.0) * (1.0 - smoothstep(0.35, 1.1, fwidth((Q.x + Q.z) * 1.9))), cove = exp(-(1.0 - yIn) * 7.0);',   /* M20: the ceiling lines fade where they would alias (grazing views from the street read as speckle) */   /* ceiling light lines; a COVE wash grazing the top of the back wall — the blue / violet is architectural light */
        '  vec3 room = wall * wash * (0.16 + 0.55 * exp(-yIn * 4.0) + 0.9 * cove + 0.6 * beams)',   /* back wall: the wash, light pooled low, the cove */
        '    + (1.0 - wall) * up * (wash * (0.12 + 0.25 * beams) + vec3(0.75, 0.8, 1.0) * lines * 0.35)',   /* ceiling: light lines */
        '    + (1.0 - wall) * (1.0 - up) * wash * (0.45 + 0.5 * beams);',   /* floor: glossy, catching the sweep */
        '  float alW = abs(vGN.z) > abs(vGN.x) ? Q.x : Q.z, hY = Q.y - fl;',
        '  float fk = floor(fl * 2.0 + 0.5), bc = floor(alW / 3.6 + fk * 0.19), bx = fract(alW / 3.6 + fk * 0.19) * 3.6, bh = fract(sin(bc * 12.9898 + fk * 7.233) * 43758.5453);',   /* integer seeds: the sine hash amplified the varying floor height's interpolation error into per-pixel static */   /* M20 ROOMS, NOT PEOPLE (lead: room cards show furnished rooms): per 3.6 m of wall a lounge banquette, a bar counter or a lit display */
        '  float seat = step(0.35, bx) * step(bx, 2.9) * max(step(hY, 0.46), step(hY, 0.95) * step(abs(bx - 1.62), 1.12)) * step(0.4, bh), bar = step(0.25, bx) * step(bx, 3.25) * step(hY, 1.1) * step(bh, 0.4);',
        '  float disp = step(0.7, bx) * step(bx, 2.9) * step(1.5, hY) * step(hY, 2.55) * step(0.6, fract(bh * 7.31)), fig = min(seat + bar, 1.0) * step(0.0, hY) * wall;',
        '  room *= 1.0 - 0.78 * fig; room += wall * disp * vec3(0.55, 0.62, 0.85) * (0.45 + 0.55 * cove);',
        '  float occ = 0.55 + 0.45 * sin(fl * 1.9 + floor(vGU / 7.0) * 2.7 + 0.3 * sin(t * 0.13 + vGU * 0.2)), mull = 1.0 - smoothstep(0.44, 0.48, abs(fract(vGU / 1.6) - 0.5));',
        '  totalEmissiveRadiance += room * occ * mull * smoothstep(0.08, 0.45, cn) * mix(0.22, 1.0, uNight); }'].join('\n')); };
    glassMat.customProgramCacheKey = function () { return 'matchHall_skyGlass'; };
  }
  function skyTiers(hw, hd, H, black, graphite, platinum, cyan, glass) {
    var LOWQ = tierQ() === 'LOW', seg = LOWQ ? 56 : 96, y = H - 0.25, SL = 0.5, OV = 0.7, bev = 0.22, curve = LOWQ ? 4 : 8;
    var T = [{ cx: 2.0, w: 31, d: 30, r: 3.0, floors: [3.2, 3.0] }, { cx: 3.2, w: 23, d: 22, r: 3.6, floors: [3.0, 2.9] }, { cx: 4.0, w: 14, d: 14, r: 4.4, floors: [4.4] }];
    cyan.push(tag(ribbon(T[0].w + 3.4, T[0].d + 3.4, T[0].r + 1.7, T[0].cx, 0, y, y + 0.06, 0, seg), 1));   /* a lit kerb round the roof terrace (the chase) */
    T.forEach(function (t) { var h = t.floors.reduce(function (a, b) { return a + b; }, 0), fy = y;
      var body = new THREE.ExtrudeGeometry(roundedRect(t.w, t.d, t.r), { depth: h - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: LOWQ ? 1 : 2, steps: 1, curveSegments: curve }); body.rotateX(-Math.PI / 2); body.translate(t.cx, y + bev, 0); black.push(body);   /* the extrude's walls stand bev outside the outline */
      t.floors.forEach(function (fh) { glass.push(ribbon(t.w, t.d, t.r, t.cx, 0, fy + 0.42, fy + fh - 0.5, bev + 0.03, seg, [fy + 0.1, fh - 0.25])); cyan.push(tag(ribbon(t.w, t.d, t.r, t.cx, 0, fy + 0.15, fy + 0.26, bev + 0.05, seg), 3)); fy += fh; });   /* a glass floor over its lit room, and its floor line */
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) { var o = bev * 0.7071 + 0.03; cyan.push(tag(box(0.16, h - 0.5, 0.16, t.cx + c[0] * (t.w / 2 - 0.25 * t.r + o), y + 0.25, c[1] * (t.d / 2 - 0.25 * t.r + o)), 4)); });   /* light rivers at the rounded corners (the quadratic corner's midpoint) */
      y += h; var sw = t.w + 2 * OV, sd = t.d + 2 * OV, sr = t.r + OV;
      var slab = new THREE.ExtrudeGeometry(roundedRect(sw - 0.4, sd - 0.4, sr - 0.2), { depth: SL - 0.4, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: LOWQ ? 1 : 2, steps: 1, curveSegments: curve }); slab.rotateX(-Math.PI / 2); slab.translate(t.cx, y + 0.2, 0); graphite.push(slab);   /* a softened slab nose over each tier */
      cyan.push(tag(ribbon(sw, sd, sr, t.cx, 0, y + 0.16, y + 0.3, 0.03, seg), 3)); y += SL; });
    var tx = T[2].cx, ringY = y + 1.6, RR = 6.0;
    var ring = new THREE.TorusGeometry(RR, 0.13, LOWQ ? 6 : 8, LOWQ ? 48 : 96); ring.rotateX(Math.PI / 2); ring.translate(tx, ringY, 0); cyan.push(tag(ring, 3));   /* the crown's halo ring */
    [0, 1, 2, 3].forEach(function (i) { var a = Math.PI / 4 + i * Math.PI / 2; graphite.push(box(0.09, 1.6, 0.09, tx + Math.cos(a) * RR, y, Math.sin(a) * RR)); });   /* its four hangers */
    var mast = taperShaft(THREE, 0.5, 0.16, 6.5, LOWQ ? 'LOW' : 'MED', { flare: 1.3, belly: 0.04 }); mast.translate(tx, y, 0); graphite.push(mast);
    var gemY = y + 6.5 + 1.2, tipH = 3.0; tipGeo = energyTip(THREE, 0.32, tipH, 0x2f6bff, LOWQ ? 'LOW' : 'MED'); tipGeo.translate(tx, gemY + 1.25, 0);
    return { tx: tx, top: y, ringY: ringY, gemY: gemY, height: gemY + 1.25 + tipH, tiers: T.length, floors: T.reduce(function (a, t) { return a + t.floors.length; }, 0) };
  }

  /* ---------- M19 BODY LEVELS (owner 2026-09-27, MAH MATCH: "Keep its black identity. Continue toward: more readable levels; more visible
     occupancy; better window rhythm; premium violet + bright blue animated facade behavior; interior glimpses; restrained Neo-Tokyo
     character; more humanistic architectural transitions. Do NOT cover it in neon.") ----------
     The 22 m body was one windowless black box under the lit sky tiers. It now reads as a building of floors: two softened graphite slab
     noses wrap the body (rounded where they turn the corners, a thin blue → violet reveal tucked under each, the tiers' floor-line language
     carried down) at the floor lines of a double-height lobby and two upper levels; each 5 m bay between the light strips carries ONE punched
     window per upper level — a rounded-corner graphite reveal round coated glass that looks into a lit room (the tiers' interior mapping:
     the blue → violet wash, people crossing, occupancy that changes bay to bay) — and the door facade opens its lobby in four tall windows
     beside the portal. The corners, the edge half-bays and the sigil / blade bays stay black, so the black mass still leads (≈ 15 % glass).
     Host safety: the lobby glass (3 cm) and its reveal (4.5 cm) stand ≤ 5 cm proud of the body face below 3.4 m; everything else new is
     above 8.8 m; no collider changes. Cost: 0 draws — the glass joins the sky-glass draw, the noses + reveals the crown draw, the reveal
     lines the line draw. */
  var BODY_NOSE = [8.8, 13.4], BODY_NH = 0.42;   /* the slab-nose floor lines (bottom y) and nose height — shared with the corner light rivers */
  function bodyLevels(hw, hd, d0, dw, S, PLINTH, graphite, cyan, glass) {
    var LOWQ = tierQ() === 'LOW', NOSE = BODY_NOSE, NH = BODY_NH, NB = 0.06, NO = 0.1, NR = 0.45;   /* a nose stands 0.16 m proud; NR ≤ 0.48 keeps the rounded corner outside the sharp body corner */
    NOSE.forEach(function (y) { var s = new THREE.ExtrudeGeometry(roundedRect(2 * hw + 2 * NO, 2 * hd + 2 * NO, NR), { depth: NH - 2 * NB, bevelEnabled: true, bevelThickness: NB, bevelSize: NB, bevelSegments: LOWQ ? 1 : 2, steps: 1, curveSegments: LOWQ ? 2 : 6 }); s.rotateX(-Math.PI / 2); s.translate(0, y + NB, 0); graphite.push(s);
      cyan.push(tag(ribbon(2 * hw + 2 * NO, 2 * hd + 2 * NO, NR, 0, 0, y - 0.05, y + 0.01, 0.0, LOWQ ? 40 : 72), 5)); });   /* the lit reveal tucked under the nose (kind 5: dim blue, one slow travelling light) */
    var sigZ = d0 > 0 ? d0 - 9.5 : d0 + 9.5, bladeZ = d0 > 0 ? -hd + 1.4 : hd - 1.4, SIG_HALF = 3.2;   /* == sigils(): the door-facade panel beside the portal, the south panel at x = 4 (W 5.5 + 0.8 backing) */
    var ROWS = [{ y0: 9.95, y1: 12.55, fl: NOSE[0] + NH, h: NOSE[1] - NOSE[0] - NH, dep: 0.26 }, { y0: 14.45, y1: 16.75, fl: NOSE[1] + NH, h: 17.35 - NOSE[1] - NH, dep: 0.26 }], LOBBY = { y0: 1.0, y1: 6.2, fl: PLINTH, h: NOSE[0] - PLINTH, dep: 0.045 };
    var WW = 3.2, FW = 0.22, cs = 2, ui = 0, n = { upper: 0, lobby: 0, clerestory: 0, louvres: 0, lobby_spans: [] };   /* LOW: glass only, no rounded reveals */
    var CLER = { y0: 4.5, y1: 7.7, fl: PLINTH, h: NOSE[0] - PLINTH, dep: 0.26 };   /* M20: the double-height lobby level shows on every face (a clerestory row) */
    function pane(nx, nz, a, a0, a1, R) {   /* one window: glass 3 cm off the face + a rounded reveal; a = the bay centre along the face, a0..a1 = the glazed span */
      var tx = nz, tz = -nx, fx = nx * hw, fz = nz * hd, w = a1 - a0, h = R.y1 - R.y0, cA = (a0 + a1) / 2, cx = fx + tx * cA, cz = fz + tz * cA, o = 0.03, u0 = ui++ * 7 + (WW - w);
      var P = [], U = [], I = [0, 1, 2, 0, 2, 3]; [[a0, R.y0, 0], [a1, R.y0, 1], [a1, R.y1, 1], [a0, R.y1, 0]].forEach(function (q) { P.push(fx + tx * q[0] + nx * o, q[1], fz + tz * q[0] + nz * o); U.push(u0 + (q[0] - a0), q[2]); });
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('aGlass', new THREE.Float32BufferAttribute([R.fl, R.h, R.fl, R.h, R.fl, R.h, R.fl, R.h], 2)); g.setIndex(I); glass.push(g);
      if (LOWQ) return; var sh = roundedRect(w + 2 * FW, h + 2 * FW, 0.42), hole = roundedRect(w, h, 0.26); sh.holes.push(hole);
      var fr = new THREE.ExtrudeGeometry(sh, { depth: R.dep, bevelEnabled: false, steps: 1, curveSegments: cs }); fr.rotateY(Math.atan2(nx, nz)); fr.translate(cx, (R.y0 + R.y1) / 2, cz); graphite.push(fr); }
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (f) { var nx = f[0], nz = f[1], half = nx ? hd : hw, doorFace = nx < 0;   /* the door face is local -x (doorFrame) */
      for (var a = -half + S; a <= half - S + 1e-6; a += S) { var lz = nx ? -nx * a : 0, lx = nz ? nz * a : 0, a0 = a - WW / 2, a1 = a + WW / 2;   /* the bay centre in local x / z */
        var clear = !(doorFace && (Math.abs(lz - sigZ) < SIG_HALF + WW / 2 || Math.abs(lz - bladeZ) < WW / 2 + 0.6)) && !(nz < 0 && Math.abs(lx - 4) < SIG_HALF + WW / 2);
        if (clear) ROWS.forEach(function (R) { pane(nx, nz, a, a0, a1, R); n.upper++; });
        var bi = Math.round((a + half) / S), nb = Math.round(2 * half / S);   /* M20 LOWER LEVEL (owner: "empty surfaces … service zones, vents"): on the three faces without the lobby, the */
        if (!doorFace && (bi === 1 || bi === nb - 1) && !LOWQ) { var fxL = nx * hw, fzL = nz * hd, lt = nz, lz2 = -nx; graphite.push(box(nx ? 0.1 : WW, 3.3, nx ? WW : 0.1, fxL + lt * a + nx * 0.05, 4.4, fzL + lz2 * a + nz * 0.05));   /* the corner bays: a plant-room louvre (frame + 9 blades, 4.4–7.7 m) */
          for (var lb = 0; lb < 9; lb++) { var lg = new THREE.BoxGeometry(nx ? 0.16 : WW - 0.3, 0.07, nx ? WW - 0.3 : 0.16); lg.rotateX(nz ? -nz * 0.5 : 0); lg.rotateZ(nx ? nx * 0.5 : 0); lg.translate(fxL + lt * a + nx * 0.16, 4.62 + lb * 0.34, fzL + lz2 * a + nz * 0.16); graphite.push(lg); } n.louvres++; }
        else if (!doorFace && clear && bi % 2 === 0) { pane(nx, nz, a, a0, a1, CLER); n.clerestory++; }   /* double-height hall glazes every other bay above the stone base (≥ 4.3 m) */
        if (doorFace && Math.abs(lz - d0) <= 2 * S + 1e-6 && Math.abs(lz - d0) > 1e-6) { var gap = dw + 0.75, s0 = a0, s1 = a1; if (lz > d0) s0 = Math.max(a0, d0 + gap); else s1 = Math.min(a1, d0 - gap);   /* trim clear of the portal frame */
          if (s1 - s0 >= 2.2) { pane(nx, nz, a, s0, s1, LOBBY); n.lobby++; n.lobby_spans.push([s0 - FW, s1 + FW]); } } } });
    return { noses: NOSE.length, windows_upper: n.upper, windows_lobby: n.lobby, windows_clerestory: n.clerestory, louvres: n.louvres, lobby_spans: n.lobby_spans };
  }

  /* ---------- M20 BASE · FINS · ENTRANCE (owner 2026-09-27, MAH MATCH: "glazing, interior depth, floor rhythm, blue / purple as
     ARCHITECTURAL light, entrance, signage, roof, human scale — Do not solve weak architecture with neon"; lead: it read as a black box with a
     window grid and thin white lines, a white goalpost frame standing 4 m in front of its door) ----------
     · STONE BASE — a honed dark-granite course (0.3–3.6 m, staggered 2.4 × 1.2 m slabs, 3 cm proud) wraps the body under a brushed coping:
       the black metal mass now stands on a base at human scale (stone · black metal · glass · graphite structure, four materials, not one);
     · FINS — the evenly spaced light strips become 30 cm granite FINS (the base rising as piers) from the coping to under the ticker, each
       carrying its line as a slot in its face: the facade gets depth and shadow, the light follows the structure (the strips no longer start at 0.9 m: below 3.4 m
       nothing stands more than 3 cm proud — the old strips and corner rivers stood 6–12 cm out there);
     · ENTRANCE — a cantilevered graphite CANOPY over the portal (from 5.24 m, 2.6 m deep) with a blue light cove inside its fascia (the hall's
       architectural light, one slow travelling light), a flush granite threshold apron; the two glowing approach lines on the paving are gone;
     · SERVICE — a flush staff door with its frame and a small canopy (3.6 m) on the rear face; plant-room louvres at the lower corner bays.
     Host safety: below 3.4 m everything new is ≤ 3 cm proud (the apron 1.5 cm); canopy, coping, fins and louvres are ≥ 3.4 m. Cost: +1 draw
     (the stone); fins, canopy, louvres and the door join the crown draw, the soffit the line draw. */
  function bodyBase(hw, hd, d0, dw, dh, S, PLINTH, lobbySpans, stone, graphite, platinum, cyan) {
    var LOWQ = tierQ() === 'LOW', BT = 3.6, P = 0.03, out = { base_pieces: 0, service_door: 0, canopy: 0 };
    function cut(ivs, a, b) { var r = []; ivs.forEach(function (iv) { if (b <= iv[0] || a >= iv[1]) { r.push(iv); return; } if (a > iv[0]) r.push([iv[0], a]); if (b < iv[1]) r.push([b, iv[1]]); }); return r; }
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (f) { var nx = f[0], nz = f[1], half = nx ? hd : hw, doorFace = nx < 0, rearFace = nx > 0, tx = nz, tz = -nx, fx = nx * hw, fz = nz * hd;
      function seg(a0, a1, y0, y1, dep, list) { var w = a1 - a0, cA = (a0 + a1) / 2; if (w < 0.05 || y1 - y0 < 0.02) return; list.push(box(nx ? dep : w, y1 - y0, nx ? w : dep, fx + tx * cA + nx * dep / 2, y0, fz + tz * cA + nz * dep / 2)); out.base_pieces++; }
      var full = [[-half, half]], lowBand = full, highBand = full;
      if (doorFace) { lowBand = cut(full, d0 - dw - 0.55, d0 + dw + 0.55); highBand = lowBand; lobbySpans.forEach(function (sp) { highBand = cut(highBand, sp[0], sp[1]); }); }
      var sd = rearFace ? -half + S * 3 : null; if (sd !== null) { lowBand = cut(lowBand, sd - 0.95, sd + 0.95); highBand = cut(highBand, sd - 0.95, sd + 0.95); }   /* the staff door's bay */
      var yS = doorFace ? 0.78 : BT; lowBand.forEach(function (iv) { seg(iv[0], iv[1], PLINTH, doorFace ? 0.78 : BT, P, stone); }); if (doorFace) highBand.forEach(function (iv) { seg(iv[0], iv[1], yS, BT, P, stone); });
      if (sd !== null) { highBand.forEach(function (iv) { if (iv[0] < sd && iv[1] > sd) seg(iv[0], iv[1], 2.85, BT, P, stone); }); seg(sd - 0.95, sd + 0.95, 2.85, BT, P, stone);   /* the stone lintel over the staff door */
        seg(sd - 0.62, sd + 0.62, PLINTH, 2.7, 0.025, graphite); seg(sd - 0.75, sd - 0.62, PLINTH, 2.78, 0.04, graphite); seg(sd + 0.62, sd + 0.75, PLINTH, 2.78, 0.04, graphite); seg(sd - 0.75, sd + 0.75, 2.7, 2.8, 0.04, graphite);   /* the door leaf and its frame */
        seg(sd + 0.38, sd + 0.42, 1.0, 1.3, 0.045, platinum); seg(sd - 0.9, sd + 0.9, 3.62, 3.74, 1.1, graphite); out.service_door = 1; }   /* its pull handle; a small canopy at 3.6 m */
      /* the coping over the base: a granite cap, ≥ 3.4 m so it may project a little */
      (doorFace ? highBand : full).forEach(function (iv) { seg(iv[0], iv[1], BT, BT + 0.14, 0.07, stone); }); });   /* a granite cap */
    /* the entrance canopy: graphite slab + fascia, cantilevered from the door face over the portal, its soffit lit (line kind 5) */
    var CW = 2 * dw + 1.0, CD = 2.6, CY = dh + 0.5;   /* over the portal frame (it absorbs the portal lintel), clear of the lobby windows beside it and low enough that the name plate reads above it */
    graphite.push(box(CD + 0.1, 0.3, CW, -hw - CD / 2 + 0.05, CY, d0)); graphite.push(box(0.12, 0.62, CW + 0.12, -hw - CD - 0.02, CY - 0.26, d0)); [-1, 1].forEach(function (sg) { graphite.push(box(CD, 0.62, 0.1, -hw - CD / 2, CY - 0.26, d0 + sg * (CW / 2 + 0.05))); });
    cyan.push(tag(box(0.1, 0.03, CW - 0.5, -hw - CD + 0.2, CY - 0.05, d0), 5)); [-1, 1].forEach(function (sg) { cyan.push(tag(box(CD - 0.4, 0.03, 0.1, -hw - CD / 2 + 0.1, CY - 0.05, d0 + sg * (CW / 2 - 0.2)), 5)); });   /* a cove of light inside the fascia (U) — not a lit panel */
    stone.push(box(4.2, 0.015, 2 * dw + 3.4, -hw - 2.1, 0, d0)); out.canopy = 1;   /* a flush granite threshold apron */
    return out; }

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
    var LOWQ = tierQ() === 'LOW';   /* M19: the LOW tier pays for the body levels by a lighter crown band and court (it must never get heavier) */
    var crown = new THREE.ExtrudeGeometry(roundedRect(2 * hw + 0.5, 2 * hd + 0.5, 2.4), { depth: CROWN, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: LOWQ ? 2 : 4, steps: 1, curveSegments: LOWQ ? 4 : 8 }); crown.rotateX(-Math.PI / 2); crown.translate(0, bodyTop + BEVEL, 0); graphite.push(crown);
    /* platinum: plinth (0.3 m, 0.25 proud, absent in the doorway), ledge under the crown, one roof diamond */
    platinum.push(box(2 * hw - RECESS + 0.25, PLINTH, 2 * hd + 0.5, RECESS / 2 + 0.125, 0, 0));
    platinum.push(box(RECESS + 0.25, PLINTH, (d0 - dw) + hd + 0.25, -hw + RECESS / 2 - 0.125, 0, (-hd - 0.25 + d0 - dw) / 2));
    platinum.push(box(RECESS + 0.25, PLINTH, hd + 0.25 - (d0 + dw), -hw + RECESS / 2 - 0.125, 0, (d0 + dw + hd + 0.25) / 2));
    [-1, 1].forEach(function (s) { platinum.push(box(0.18, 0.12, 2 * hd + 0.36, s * (hw + 0.09), bodyTop - 0.5, 0)); platinum.push(box(2 * hw + 0.36, 0.12, 0.18, 0, bodyTop - 0.5, s * (hd + 0.09))); });
    /* the door: a graphite portal frame proud of the face, a graphite threshold in the recess, the cyan lintel line, the name plate backing */
    [-1, 1].forEach(function (s) { graphite.push(box(0.35, dh + 0.9, 0.5, -hw - 0.175, 0, d0 + s * (dw + 0.25))); });
    graphite.push(box(0.35, 0.6, 2 * dw + 1.0, -hw - 0.175, dh + 0.3, d0));
    graphite.push(box(RECESS + 0.5, 0.03, 2 * dw, -hw + RECESS / 2 - 0.25, 0, d0));
    graphite.push(box(0.16, 2.0, 9.0, -hw - 0.08, dh + 1.6, d0));
    cyan.push(tag(box(0.08, 0.12, 2 * dw + 0.5, -hw - 0.39, dh + 0.54, d0), 2));
    cyan.push(tag(box(0.05, 0.06, 9.0, -hw - 0.19, dh + 1.42, d0), 2));
    /* recess: vertical lines on both jamb faces + a floor line at the gate threshold (reads as an open, lit gate) */
    [-1, 1].forEach(function (s) { cyan.push(tag(box(0.14, dh - 0.7, 0.06, -hw + RECESS / 2, 0.35, d0 + s * (dw - 0.03)), 2)); });
    cyan.push(tag(box(0.1, 0.03, 2 * dw - 0.4, -hw + RECESS - 0.15, 0.03, d0), 2));
    /* M20: the two glowing approach lines on the paving are gone (the entrance canopy's lit soffit and the threshold apron mark the door) */
    /* vertical light lines: evenly spaced on all four facades, ending under one horizontal band below the crown; none in the door zone */
    var S = 5.0, y0 = 3.72, y1 = bodyTop - 1.1, L = y1 - y0, strips = 0;   /* M15c restraint (owner 2026-09-27: black identity, selected violet / blue light): half as many strips as M12's 2.5 m rhythm. M20: they start over the stone base */
    var stone = [], FIN = 0.3, finTop = bodyTop - 2.55, sigZ0 = d0 > 0 ? d0 - 9.5 : d0 + 9.5, fins = 0;   /* M20 FINS: graphite, 30 cm, the line a slot in the fin face; none across a sigil panel (door face / south face) */
    function finAt(isX, x, z, sgn) { if (isX && sgn < 0 && Math.abs(z - sigZ0) < 3.4) return false; if (!isX && sgn < 0 && Math.abs(x - 4) < 3.4) return false; stone.push(isX ? box(FIN, finTop - y0, 0.46, x + sgn * FIN / 2, y0, z) : box(0.46, finTop - y0, FIN, x, y0, z + sgn * FIN / 2)); fins++; return true; }   /* the base's granite rises as the fins (graphite on the black body did not read) */
    function alongZ(x, proudSign, skipDoor) { for (var z = -hd + S / 2; z < hd - S / 4; z += S) { if (skipDoor && Math.abs(z - d0) < dw + 1.2) continue; var fin = finAt(true, x, z, proudSign); cyan.push(tag(box(0.06, fin ? finTop - y0 - 0.3 : L, 0.1, x + proudSign * (fin ? FIN + 0.02 : 0.03), y0 + (fin ? 0.15 : 0), z), 0)); strips++; } }
    function alongX(z, proudSign) { for (var x = -hw + S / 2; x < hw - S / 4; x += S) { var fin = finAt(false, x, z, proudSign); cyan.push(tag(box(0.1, fin ? finTop - y0 - 0.3 : L, 0.06, x, y0 + (fin ? 0.15 : 0), z + proudSign * (fin ? FIN + 0.02 : 0.03)), 0)); strips++; } }
    alongZ(-hw, -1, true); alongZ(hw, 1, false); alongX(-hd, -1); alongX(hd, 1);
    [-1, 1].forEach(function (s) { cyan.push(tag(box(0.05, 0.07, 2 * hd + 0.1, s * (hw + 0.025), bodyTop - 0.78, 0), 1)); cyan.push(tag(box(2 * hw + 0.1, 0.07, 0.05, 0, bodyTop - 0.78, s * (hd + 0.025)), 1)); });
    neoTokyo(hw, hd, d0, dw, dh, bodyTop, cyan, graphite);   /* M12: the ticker band, the signage blade and its lit edges */
    var RIV = [[3.72, BODY_NOSE[0] - 0.06], [BODY_NOSE[0] + BODY_NH, BODY_NOSE[1] - 0.06], [BODY_NOSE[1] + BODY_NH, bodyTop - 0.3]];   /* M20: from the coping up (a 0.2 m river stood 12 cm proud at 0.9 m) */   /* M19 review: the 0.2 m river (out to hw + 0.12) cut through each rounded slab-nose corner (≈ hw + 0.03 on the diagonal) — it now runs up to each nose and on above it, as if behind the slab */
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) { RIV.forEach(function (r) { cyan.push(tag(box(0.2, r[1] - r[0], 0.2, c[0] * (hw + 0.02), r[0], c[1] * (hd + 0.02)), 4)); }); });   /* M14: light rivers up the body's corners */
    var glass = []; skyGlass(); var sky = skyTiers(hw, hd, H, black, graphite, platinum, cyan, glass);   /* M14: the stacked sky tiers */
    var levels = bodyLevels(hw, hd, d0, dw, S, PLINTH, graphite, cyan, glass);   /* M19: readable floors, punched windows into lit rooms, the lobby glass */
    var base = bodyBase(hw, hd, d0, dw, dh, S, PLINTH, levels.lobby_spans, stone, graphite, platinum, cyan); levels.fins = fins; levels.base = base;   /* M20: base course, service door, entrance canopy */
    sigils(hw, hd, d0, graphite);   /* M15: the diamond sigil panels */
    /* assemble */
    var g = new THREE.Group(); g.name = 'MATCH_HALL'; g.position.set(A.position[0], 0, A.position[2]); g.rotation.y = F.theta; g.userData.noMerge = true;
    var gem = new THREE.OctahedronGeometry(0.8, 0); gem.scale(1, 1.6, 1); gem.translate(sky.tx, sky.gemY, 0); platinum.push(gem);   /* M14: the roof diamond is now the crest on the crown mast (was on the flat roof, y 21.6 – 24.2) */
    var stoneM = new THREE.MeshStandardMaterial({ color: 0x4a4e56, roughness: 0.62, metalness: 0.12, envMapIntensity: 0.4 }); stoneM.name = 'matchHall_granite'; applySurface(THREE, stoneM, 'CLADDING', tierQ()); ownMats.push(stoneM);   /* M20: honed dark granite (matte against the lacquered black body) */
    var meshes = [merged(stone, stoneM, 'MATCH_HALL_BASE', true), merged(black, mat('black', { color: 0x0b0d11, roughness: 0.42, metalness: 0.8 }), 'MATCH_HALL_BODY', true), merged(graphite, mat('graphite', { color: 0x1d2229, roughness: 0.55, metalness: 0.75 }), 'MATCH_HALL_CROWN', true), merged(platinum, mat('platinum', { color: 0xdfe6ee, roughness: 0.34, metalness: 0.82 }), 'MATCH_HALL_PLINTH', true), merged(cyan, facadeMat || lineMat, 'MATCH_HALL_LINES', false)];
    var gm = merged(glass, glassMat, 'MATCH_HALL_SKY_GLASS', false); if (gm) { gm.renderOrder = 1; meshes.push(gm); }
    if (sigilGeo && sigilMat) { var sg = new THREE.Mesh(sigilGeo, sigilMat); sg.name = 'MATCH_HALL_SIGIL'; sg.renderOrder = 4; meshes.push(sg); }
    if (tipGeo) { tipM = tipMaterial(THREE); var tp = new THREE.Mesh(tipGeo, tipM); tp.name = 'MATCH_HALL_CROWN_TIP'; tp.userData.tris = Math.round(tipGeo.index ? tipGeo.index.count / 3 : tipGeo.attributes.position.count / 3); meshes.push(tp); }
    if (tickerGeo) { var tk = new THREE.Mesh(tickerGeo, tickerMat); tk.name = 'MATCH_HALL_TICKER'; tk.renderOrder = 3; meshes.push(tk); } if (bladeGeo) { var bl = new THREE.Mesh(bladeGeo, [graphiteM2, bladeMat]); bl.name = 'MATCH_HALL_SIGN_BLADE'; meshes.push(bl); }
    var tris = 0; meshes.forEach(function (m) { if (m) { g.add(m); tris += m.userData.tris || 0; } });
    /* the gate: a dark glass plane at the back of the recess (reads as open; the interior is a room transition) */
    var gateGeo = new THREE.PlaneGeometry(2 * dw - 0.1, dh - 0.1); if (glassMat) { var gn = gateGeo.attributes.position.count, ga = new Float32Array(gn * 2), gu = gateGeo.attributes.uv; for (var gi = 0; gi < gn; gi++) { ga[gi * 2] = 0.05; ga[gi * 2 + 1] = dh + 0.6; gu.setX(gi, gu.getX(gi) * (2 * dw - 0.1) + 0.8); } gateGeo.setAttribute('aGlass', new THREE.BufferAttribute(ga, 2)); }   /* M14: the gate is a window into a lit lobby (the tiers' interior mapping), so the energy reads inside the building too */
    var gate = new THREE.Mesh(gateGeo, glassMat || gateMat); gate.rotation.y = -Math.PI / 2; gate.position.set(-hw + RECESS - 0.08, dh / 2, d0); gate.name = 'MATCH_HALL_GATE'; gate.renderOrder = 2; g.add(gate); tris += 2;
    /* the name plate 'MAH MATCH' (registry map label) as a canvas plane on the door facade above the portal */
    var label = (A.map && A.map.label) || 'MAH MATCH'; plateTex = nameTexture(label);
    if (plateTex) { plateMat = new THREE.MeshBasicMaterial({ map: plateTex, transparent: true, depthWrite: false }); var plate = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.62), plateMat); plate.rotation.y = -Math.PI / 2; plate.position.set(-hw - 0.17, dh + 2.6, d0); plate.name = 'MATCH_HALL_PLATE'; plate.renderOrder = 3; g.add(plate); tris += 2; }
    else log('matchHall: no document → name plate skipped');
    ctx.group.add(g); groups.push(g);
    stats.building = { id: A.id, at: [A.position[0], A.position[2]], door: { side: door.side || '-x', x: door.x, z: door.z, w: 2 * dw, h: dh }, draw_calls: g.children.length, tris: tris, strips: strips, height_m: H, sky_tiers: { tiers: sky.tiers, floors: sky.floors, visual_top_m: +sky.height.toFixed(1), collider_top_m: H, note: 'visual only, above the collider top and inside the footprint; a matching collider waits on the runtime bridge' }, body_levels: levels };
    if (ctx.auraRequests) { var ct = Math.cos(F.theta), st = Math.sin(F.theta), wx = A.position[0] + sky.tx * ct, wz = A.position[2] - sky.tx * st;   /* M14 AURA: a halo round the crown ring (M16: pearl-prismatic, was violet), a soft blue presence round the tiers (night-led) */
      ctx.auraRequests.push({ x: wx, y: sky.ringY, z: wz, size: 10.5, aspect: 0.8, ring: 0.66, ringW: 0.05, breakup: 0.55, tint: 0xf4f6ff, spectral: 0.9, intensity: 0.16, pull: 5, nightK: 3.2, phase: 2.1 });
      ctx.auraRequests.push({ x: wx, y: H + (sky.top - H) * 0.5, z: wz, size: 24, aspect: 0.75, ring: 0, tint: 0x5a8cf0, spectral: 0.4, intensity: 0.05, pull: 10, nightK: 5, phase: 0.7 }); }
  }

  /* ---------- COURT: outdoor official-match ground (graphite disc, platinum rim + stepped spectator tiers, cyan rings, 4 pylons) ---------- */
  function buildCourt() {
    var C = artifact('MATCH_COURT_OUTDOOR'); var Z = zone('MATCH_COURT');
    if (!C || !C.position) { log('matchHall: MATCH_COURT_OUTDOOR artifact missing → court skipped'); return; }
    var cx = C.position[0], cz = C.position[2]; var R = C.r || (Z && Z.r) || 16; var sr = (Z && Z.spectator_r && Z.spectator_r.length === 2) ? Z.spectator_r : [R + 3, R + 8]; if (!Z || !Z.spectator_r) log('matchHall: zone MATCH_COURT.spectator_r missing → ring at r + 3 .. r + 8');
    var s1 = sr[0], s2 = sr[1], sm = (s1 + s2) / 2; var graphite = [], platinum = [], cyan = [];
    var LOWQ = tierQ() === 'LOW', RS = LOWQ ? 64 : 96; ARC_SEG = RS;   /* M19: LOW uses 64 segments per circle (was 96; 48 faceted visibly on the r ≈ 24 m spectator arcs) */
    graphite.push(disc(R, 0.04, 0, 0, RS));
    platinum.push(arcPrism(R - 0.5, R + 0.25, 0.07, 0, 0, 0, 0, TWO_PI));                                    /* rim kerb (7 cm, not a collider) */
    var GH = 2.0 / s1; var segs = arcSegments([0, Math.PI / 2, Math.PI, Math.PI * 1.5], GH);                 /* four ~4 m aisles so the ring is approachable */
    segs.forEach(function (s) { platinum.push(arcPrism(s1, sm, 0.07, 0, 0, 0, s[0], s[1])); platinum.push(arcPrism(sm, s2, 0.14, 0, 0, 0, s[0], s[1])); cyan.push(arcPrism(s1 + 0.05, s1 + 0.2, 0.03, 0, 0, 0.07, s[0], s[1])); cyan.push(arcPrism(sm + 0.05, sm + 0.2, 0.03, 0, 0, 0.14, s[0], s[1])); });   /* FLAT spectator inlays (7 / 14 cm: below the host's 20 cm step, so no collider is needed and nothing is walked through) */
    [0.25, 0.5, 0.75].forEach(function (k) { cyan.push(flatRing(R * k - 0.06, R * k + 0.06, 0.065, 0, 0, RS)); }); cyan.push(disc(0.55, 0.065, 0, 0, 32));
    for (var i = 0; i < 4; i++) { var a = Math.PI / 4 + i * Math.PI / 2; var px = Math.cos(a) * (s1 - 1.3), pz = Math.sin(a) * (s1 - 1.3); graphite.push(cyl(0.28, 0.36, 4.6, px, 0, pz, 12)); platinum.push(cyl(0.4, 0.4, 0.12, px, 4.3, pz, 12)); cyan.push(box(0.18, 3.4, 0.18, px, 4.42, pz)); }
    var g = new THREE.Group(); g.name = 'MATCH_COURT'; g.position.set(cx, 0, cz); g.userData.noMerge = true;
    var meshes = [merged(graphite, mat('graphite', { color: 0x1d2229, roughness: 0.55, metalness: 0.75 }), 'MATCH_COURT_FLOOR', true), merged(platinum, mat('platinum', { color: 0xdfe6ee, roughness: 0.34, metalness: 0.82 }), 'MATCH_COURT_TIERS', true), merged(cyan, lineMat, 'MATCH_COURT_LINES', false)];
    var tris = 0; meshes.forEach(function (m) { if (m) { g.add(m); tris += m.userData.tris; } });
    ctx.group.add(g); groups.push(g);
    stats.court = { id: C.id, at: [cx, cz], r: R, spectator_r: [s1, s2], pylons: 4, aisles: segs.length, draw_calls: g.children.length, tris: tris }; ARC_SEG = 96;
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
  function neoNight(n) { if (glassU && !facadeU) glassU.uNight.value = n ? 1 : 0; if (tipM) tipM.opacity = n ? 0.95 : 0.8; if (facadeU) facadeU.uNight.value = n ? 1 : 0; if (facadeMat) facadeMat.emissiveIntensity = n ? LINE_NIGHT : LINE_DAY; if (tickerMat) tickerMat.color.setScalar(n ? 1.15 : 0.62); if (bladeMat) bladeMat.color.setScalar(n ? 1.1 : 0.6); }
  var api = {
    tick: function (dt, t) { clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); if (facadeU) facadeU.uTime.value = clock; else if (glassU) glassU.uTime.value = clock; if (tickerTex) tickerTex.offset.x = (clock * 0.018) % 1; },
    build: function () {
      var base = mat('cyanLine', { color: 0xe6ecf6, emissive: 0xdfe8ff, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.2 }); lineMat = base.clone(); lineMat.name = 'matchHall_line';
      gateMat = new THREE.MeshStandardMaterial({ color: 0x05080c, roughness: 0.06, metalness: 0.7, transparent: true, opacity: 0.74, emissive: 0x10131c, emissiveIntensity: GATE_DAY, depthWrite: false }); gateMat.name = 'matchHall_gate';
      try { buildBuilding(); } catch (e) { log('matchHall: exterior failed: ' + (e && e.message || e)); }
      try { buildCourt(); } catch (e) { log('matchHall: court failed: ' + (e && e.message || e)); }
      applyNight(ctx.night); neoNight(ctx.night);
    },
    setNight: function (n) { applyNight(n); neoNight(n); },
    buildInterior: buildInterior,
    dispose: function () {
      groups.forEach(function (g) { if (g.parent) g.parent.remove(g); g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }); groups = [];
      [facadeMat, tickerMat, tickerTex, bladeMat, bladeTex, glassMat, tipM, sigilMat, sigilTex, sigilGeo].forEach(function (o) { if (o) o.dispose(); }); facadeMat = tickerMat = tickerTex = bladeMat = bladeTex = glassMat = tipM = sigilMat = sigilTex = sigilGeo = null; glassU = null; if (tipGeo) tipGeo.dispose(); tipGeo = null; if (tickerGeo) tickerGeo.dispose(); if (bladeGeo) bladeGeo.dispose(); tickerGeo = bladeGeo = null;
      ownMats.forEach(function (m2) { m2.dispose(); }); ownMats = []; if (lineMat) lineMat.dispose(); if (gateMat) gateMat.dispose(); if (plateMat) plateMat.dispose(); if (plateTex) plateTex.dispose(); lineMat = gateMat = plateMat = plateTex = null; stats.building = stats.court = null; if (_instance === api) _instance = null;
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
