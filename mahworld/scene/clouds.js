/* MAHPLAZA :: DIAMOND CLOUDS — atmosphere crystallized (brief §03–§05, §38)

   MAHWORLD's sky does not carry ordinary clouds. A cloud here is a VOLUME of
   atmosphere that has begun to crystallize: a soft, layered mass whose inside
   holds thin faceted sheets. The SOFT MASS is what you see; the crystal is a
   suggestion INSIDE it — sheets that catch the moon on their upper faces and
   stay dark underneath, never a straight edge cut against open sky.

   The language is DARK MASS + PLATINUM / SILVER PLANE CATCHES + a little
   SELECTIVE ENERGY. No cyan outlines, no floating diamonds, no glowing
   polygons, no cartoon clouds, no particle fog.

   Construction (all procedural, no texture files, no new dependency):
     · three layers (low deck / mid / high) of 6–7 masses each = 20 masses;
     · each mass = a soft BODY of 4–8 overlapping billboard quads drawn from a
       4-cell procedural blob atlas, merged into one mesh BEHIND the crystal
       and one IN FRONT of it, so the sheets sit inside the volume;
     · 1–5 CRYSTALLINE SHEETS per mass (most on the near deck, barely any on
       the far one): flat faceted quads with a FEATHERED diamond alpha, so a
       sheet fades out before it can cut the sky. Two InstancedMeshes per layer
       carry them — the sheets the moon catches, and the sheets turned away.
   Moonlight also gradates each body: the quads on the moon's side of the sky
   are baked brighter than the quads away from it.
   Motion is a slow rotation of each layer about the world axis: continuous,
   never looping, never popping, with real parallax between the layers, plus a
   very slow per-sheet breathing so the shapes seem to evolve.

   Cost: 13 draw calls, well under 1k triangles. update() rebuilds nothing. */
import * as THREE from '../vendor/three/three.module.min.js';
import { canvasTexture } from './materials.js';

/* ---- authored keys: night / dusk / day ---------------------------------
   Same breakpoints as sky.js so the clouds turn with the dome, not against it.
   Night is the anchor: a moonlit blue-grey mass, restrained silver catches,
   dark undersides. Dusk takes MAHWORLD's violet. Day is brighter and softer
   and the crystalline catches weaken — they never take over the sky. */
/* v5 §13 raised the bodies "a value higher" so the clouds would hold more of the sky. MEASURED in v7,
   that had overshot into an overcast: at night the body was 0x5b73a8 (luminance 112) at 0.92 alpha
   across three overlapping decks, so a vertical profile of the establishing frame read a DEAD FLAT
   124 from the zenith to the skyline — the dome's own 58 → 34 → 16 gradient never reached the camera,
   the moon halo, galaxy band and stars were painted over, and the empty sky out-valued the whole
   architectural band (65.8) by 1.8×. That is what made the city read as black cut-outs.

   THE LAW THIS ENCODES. A night cloud is lit by a moon, so its BODY is darker than the sky it hangs
   in front of near the horizon and only a little brighter than the zenith; its CRESTS are what
   approach the moon's value. Visibility comes from that contrast and from the crystal facets — never
   from covering the sky in pale blue. So the body sits between the dome's mid (34) and horizon (58)
   keys, the alpha lets the star field and the galaxy band read through the thinner edges, and the lit
   facets are pushed UP to keep the clouds every bit as present as v5 wanted them. */
const KEYS = {
  night: { body: 0x243352, bodyA: 0.60, lit: 0xeef5ff, litA: 0.74, dark: 0x121a2c, darkA: 0.3,  sheenA: 0.10, litT: 0.14, catch: 1.00 },
  dusk:  { body: 0x50458a, bodyA: 0.62, lit: 0xece5ff, litA: 0.60, dark: 0x241d42, darkA: 0.3,  sheenA: 0.1,  litT: 0.09, catch: 0.84 },
  day:   { body: 0xe6eefa, bodyA: 0.72, lit: 0xf8fbff, litA: 0.26, dark: 0x9db0cb, darkA: 0.24, sheenA: 0.05, litT: 0.04, catch: 0.40 }
};
const _ca = new THREE.Color(), _cb = new THREE.Color();
function lerpHex(a, b, t) { _ca.setHex(a); _cb.setHex(b); return _ca.lerp(_cb, t).getHex(); }
function mixKeys(A, B, t) {
  const o = {};
  for (const k in A) o[k] = (A[k] > 1 && Number.isInteger(A[k])) ? lerpHex(A[k], B[k], t) : A[k] + (B[k] - A[k]) * t;
  return o;
}
function smooth(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function cloudKey(sunElevation) {
  const e = sunElevation;
  if (e <= -0.55) return Object.assign({}, KEYS.night);
  if (e >= 0.32) return Object.assign({}, KEYS.day);
  if (e < -0.12) return mixKeys(KEYS.night, KEYS.dusk, smooth((e + 0.55) / 0.43));
  return mixKeys(KEYS.dusk, KEYS.day, smooth((e + 0.12) / 0.44));
}

/* ---- the key light direction -------------------------------------------
   Local copies of sky.js's sunDirection / moonDirection formulas (kept local
   on purpose: clouds.js must not depend on the sky module). If those formulas
   ever move, this is the one place that has to follow them. */
function sunDir(worldHour, out) {
  const h = ((worldHour % 24) + 24) % 24;
  const day = h >= 6 && h <= 18;
  const f = day ? (h - 6) / 12 : ((h > 18 ? h - 18 : h + 6) / 12);
  const az = f * Math.PI - 0.62, el = Math.sin(f * Math.PI) * 0.78;
  out.set(Math.cos(az) * Math.cos(el), Math.sin(el), 0.6 * Math.sin(az) * Math.cos(el) + 0.3).normalize();
  return day;
}
function moonDir(worldHour, out) {
  const h = ((worldHour % 24) + 24) % 24;
  const f = h > 18 ? (h - 18) / 12 : h < 6 ? (h + 6) / 12 : 0.5;
  out.set(0.5 - f * 0.9, 0.3 + 0.16 * Math.sin(f * Math.PI), -0.78).normalize();
  return out;
}

function seeded(seed) { let s = (seed >>> 0) || 9; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ---- the body atlas: four soft cloud masses in one 2×2 texture ----------
   Layered radial blobs, wider than tall, brighter at the crown and dimmer
   underneath (the volume shading is baked, so the body needs no lighting),
   with two faint straight-edged wedges high in each cell: the first hint that
   this air is not soft all the way through. Every blob stays well inside its
   cell, so nothing bleeds across the atlas seams. */
function cloudAtlas(size) {
  const t = canvasTexture(size, size, (g, W) => {
    const half = W / 2;
    g.clearRect(0, 0, W, W);
    for (let cell = 0; cell < 4; cell++) {
      const ox = (cell % 2) * half, oy = Math.floor(cell / 2) * half;
      const R = seeded(cell * 977 + 31);
      g.save(); g.beginPath(); g.rect(ox, oy, half, half); g.clip();
      const n = 24 + Math.floor(R() * 9);
      for (let i = 0; i < n; i++) {
        const fx = 0.5 + (R() - 0.5) * 0.42, fy = 0.5 + (R() - 0.5) * 0.40;
        const rad = half * (0.07 + R() * 0.13);
        /* vertical volume ramp: crown lit, base in the mass's own shadow */
        const lum = 0.34 + 0.66 * Math.pow(1 - fy, 1.25);
        const r = Math.round(196 + 58 * lum), gg = Math.round(210 + 44 * lum), b = Math.round(232 + 23 * lum);
        const a = (0.24 + R() * 0.22) * (0.55 + 0.45 * lum);
        g.save();
        g.translate(ox + fx * half, oy + fy * half);
        g.scale(1.22, 0.80);
        /* a plateau then a quick shoulder: the union of the blobs gets a bumpy,
           cauliflower silhouette instead of dissolving into even haze */
        const grad = g.createRadialGradient(0, 0, rad * 0.05, 0, 0, rad);
        grad.addColorStop(0, 'rgba(' + r + ',' + gg + ',' + b + ',' + a.toFixed(3) + ')');
        grad.addColorStop(0.46, 'rgba(' + r + ',' + gg + ',' + b + ',' + (a * 0.90).toFixed(3) + ')');
        grad.addColorStop(0.74, 'rgba(' + r + ',' + gg + ',' + b + ',' + (a * 0.42).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(' + r + ',' + gg + ',' + b + ',0)');
        g.fillStyle = grad; g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      /* two soft angular wedges in the upper body: the crystal reading through */
      for (let i = 0; i < 2; i++) {
        const x = ox + half * (0.36 + R() * 0.26), y = oy + half * (0.32 + R() * 0.14);
        const w = half * (0.12 + R() * 0.12), h = half * (0.06 + R() * 0.05), lean = (R() - 0.5) * 0.9;
        const grad = g.createLinearGradient(x, y - h, x, y + h);
        grad.addColorStop(0, 'rgba(226,238,255,0.09)');
        grad.addColorStop(1, 'rgba(180,204,244,0)');
        g.fillStyle = grad;
        g.beginPath(); g.moveTo(x - w, y + h * lean); g.lineTo(x + w, y - h * 0.6); g.lineTo(x + w * 0.3, y + h); g.closePath(); g.fill();
      }
      g.restore();
    }
  });
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/* ---- one crystalline sheet's alpha: a FEATHERED diamond -----------------
   |u| + |v| is the diamond metric; the alpha falls to zero well before the
   quad's own border, so a sheet can never show a straight cut against the
   sky. A crest runs along the upper half (local +Y = the sheet's up-slope
   edge), which is where a tilted plate would catch the light. */
function facetTexture(size) {
  return canvasTexture(size, size, (g, W) => {
    const img = g.createImageData(W, W), d = img.data;
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W * 2 - 1, v = (y + 0.5) / W * 2 - 1;
        const m = Math.abs(u) + Math.abs(v);
        let a = (1.02 - m) / 0.62; a = a < 0 ? 0 : a > 1 ? 1 : a; a = a * a * (3 - 2 * a);
        const crest = Math.exp(-Math.pow((m - 0.5) / 0.17, 2)) * (v < 0 ? 0.5 : 0.1);
        /* one blue-white ratio at every brightness: the sheet is never neutral grey */
        const lum = Math.max(0.34, Math.min(1, 0.5 + 0.5 * (0.5 - v * 0.5) + crest * 0.45));
        const i = (y * W + x) * 4;
        d[i] = Math.round(214 * lum);
        d[i + 1] = Math.round(230 * lum);
        d[i + 2] = Math.round(252 * lum);
        d[i + 3] = Math.round(255 * a * (0.52 + 0.48 * lum));
      }
    }
    g.putImageData(img, 0, 0);
  });
}

/* ---- layout -------------------------------------------------------------
   Three decks. The near deck carries the readable crystal; the far deck is
   almost pure atmospheric silhouette (and is the first thing a low tier
   simplifies). Azimuths are measured from the −z axis, where the cameras look. */
/* COVERAGE. The masses have to stay DISCRETE. v5's mid deck ran seven masses up to 580 wide (986
   after QSCALE) at radius 400–700, which is ~70° of sky each spaced 23° apart — a threefold overlap,
   i.e. a solid deck, which is how the sky came to be one flat value. The probe named that one layer
   as +38 of the ~50 luminance the clouds were adding. Fewer and narrower masses on the same spread
   leaves real sky between them, which is where the moon, the galaxy band and the stars live. */
/* ALTITUDE. The decks used to sit at y 108 / 164 / 252 while the tallest megatall crown stands at
   about 466 m, so MAHWORLD's clouds hung BELOW its skyline, threading between the towers — which is
   why the near deck read as a grey smudge of smog over the city rather than as weather above it.
   Every deck now clears the skyline, and the near deck's radius moves out with its altitude so it
   still sits inside a 46 deg frame instead of passing overhead. */
const LAYOUT = [
  { name: 'low',  count: 5, yMin: 215, yMax: 285, rMin: 430, rMax: 680, wMin: 200, wMax: 320, qMin: 7, qVar: 3, pMin: 5, pVar: 2, pScale: 1.00, speed: 1.55, order: -2, spread: [-1.28, -0.70, -0.10, 0.52, 1.18] },
  { name: 'mid',  count: 4, yMin: 305, yMax: 400, rMin: 620, rMax: 900, wMin: 280, wMax: 440, qMin: 6, qVar: 3, pMin: 4, pVar: 3, pScale: 0.95, speed: 1.00, order: -4, spread: [-1.05, -0.44, 0.28, 1.02] },
  { name: 'high', count: 4, yMin: 440, yMax: 560, rMin: 900, rMax: 1250, wMin: 380, wMax: 590, qMin: 5, qVar: 3, pMin: 3, pVar: 2, pScale: 0.72, speed: 0.70, order: -6, spread: [-0.95, -0.30, 0.42, 1.10] }
];
/* the blob atlas paints the middle of each cell, so a quad has to be ~1.7× the
   mass width it is meant to draw. QSCALE keeps that conversion in one place. */
const QSCALE = 1.7;

export function buildClouds(ctx) {
  const scene = ctx && ctx.scene;
  let theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };

  const group = new THREE.Group(); group.name = 'diamond-clouds';
  const atlas = cloudAtlas(1024);
  const facet = facetTexture(128);
  const sheetGeo = new THREE.PlaneGeometry(1, 1);
  const geometries = [sheetGeo], materials = [], textures = [atlas, facet];

  const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
  const R = seeded(20260905);

  /* build-time scratch */
  const _p = new THREE.Vector3(), _n = new THREE.Vector3(), _ax = new THREE.Vector3(), _ay = new THREE.Vector3(), _ref = new THREE.Vector3(), _sc = new THREE.Vector3(), _m4 = new THREE.Matrix4();

  const layers = [];
  let totalQuads = 0, totalPlanes = 0, totalMasses = 0;
  const sheenSource = [];

  LAYOUT.forEach((L, li) => {
    const lg = new THREE.Group(); lg.name = 'cloud-layer-' + L.name;
    /* body quads accumulate into two merged meshes: the half of every mass
       that sits behind the crystal, and the half that sits in front of it */
    const back = { pri: [], sec: [] }, front = { pri: [], sec: [] };
    const planes = [];

    for (let m = 0; m < L.count; m++) {
      totalMasses++;
      const th = L.spread[m] + (R() - 0.5) * 0.22;                       /* azimuth from the −z axis */
      const rad = L.rMin + R() * (L.rMax - L.rMin);
      const cx = Math.sin(th) * rad, cz = -Math.cos(th) * rad, cy = L.yMin + R() * (L.yMax - L.yMin);
      const W = L.wMin + R() * (L.wMax - L.wMin), H = W * 0.34;            /* a cloud is far wider than it is deep */
      /* the mass's own frame: `out` points away from the world origin, `right` across it */
      const inv = 1 / Math.hypot(cx, cz);
      const outX = cx * inv, outZ = cz * inv, rightX = -outZ, rightZ = outX;

      /* ---- BODY: overlapping soft billboards, yawed to face the origin ---- */
      const nq = L.qMin + Math.floor(R() * L.qVar);
      for (let q = 0; q < nq; q++) {
        const primary = q < 3;
        const w = W * QSCALE * (q === 0 ? 1.0 : q === 1 ? 0.86 : 0.55 + R() * 0.35);
        const h = w * (0.46 + R() * 0.12);
        const dx = q === 0 ? (R() - 0.5) * W * 0.08 : (R() - 0.5) * W * 0.50;
        const dy = q === 0 ? 0 : (R() - 0.5) * H * 0.60;
        const behind = q === 0 ? true : q === 1 ? false : R() < 0.5;
        const dz = (behind ? 1 : -1) * W * (0.05 + R() * 0.18);
        /* dx runs across the mass, dy up it, dz along the view axis (+ = farther) */
        const qx = cx + rightX * dx + outX * dz, qy = cy + dy, qz = cz + rightZ * dx + outZ * dz;
        const alpha = (primary ? 0.88 + R() * 0.12 : 0.54 + R() * 0.34) * (dy < 0 ? 0.9 : 1.0);
        const qi = 1 / Math.hypot(qx, qy, qz);
        (behind ? back : front)[primary ? 'pri' : 'sec'].push({
          x: qx, y: qy, z: qz, w, h,
          yaw: Math.atan2(-qx, -qz), roll: (R() - 0.5) * 0.42,
          cell: Math.floor(R() * 4), flip: R() < 0.5,
          a: alpha, aTop: 1.0, aBot: 0.58 + R() * 0.14,
          tint: 0.82 + R() * 0.18,
          dx: qx * qi, dy: qy * qi, dz: qz * qi                          /* where this quad sits in the sky, for the moon gradient */
        });
        totalQuads++;
      }

      /* ---- CRYSTALLINE SHEETS: small, feathered, entirely inside the body ---- */
      const np = L.pMin + Math.floor(R() * L.pVar);
      for (let i = 0; i < np; i++) {
        /* the cameras look UP at these decks, so a near-horizontal sheet is an
           invisible sliver: most sheets are steeply tilted plates */
        const flat = R() < 0.22;
        const tilt = flat ? 0.16 + R() * 0.22 : 0.50 + R() * 0.65;
        /* the sheet's normal leans toward the viewer's side of the world more
           often than away, so caught tops are read as often as dark undersides */
        const psi = (R() < 0.62 ? Math.atan2(-outZ, -outX) : R() * Math.PI * 2) + (R() - 0.5) * 1.5;
        _n.set(Math.sin(tilt) * Math.cos(psi), Math.cos(tilt), Math.sin(tilt) * Math.sin(psi)).normalize();
        /* local +Y = the sheet's up-slope direction, so the texture's crest lies on its high edge */
        _ref.set(0, 1, 0).addScaledVector(_n, -_n.y);
        if (_ref.lengthSq() < 1e-4) _ref.set(outX, 0, outZ).addScaledVector(_n, -(outX * _n.x + outZ * _n.z));
        _ay.copy(_ref).normalize();
        _ax.crossVectors(_ay, _n).normalize();
        const pw = W * (0.28 + R() * 0.24) * L.pScale;
        const pd = pw * (0.60 + R() * 0.44);
        _p.set(cx + rightX * (R() - 0.5) * W * 0.50 + outX * (R() - 0.5) * W * 0.30,
               cy + (R() - 0.5) * H * 0.56,
               cz + rightZ * (R() - 0.5) * W * 0.50 + outZ * (R() - 0.5) * W * 0.30);
        _sc.set(pw, pd, 1);
        _m4.makeBasis(_ax, _ay, _n).scale(_sc).setPosition(_p);
        const pinv = 1 / _p.length();
        const rec = {
          pos: _p.clone(), ax: _ax.clone(), ay: _ay.clone(), sw: pw, sd: pd,
          m: _m4.clone(),
          up: _n.clone(),
          /* how much of the sheet's lit face the camera (near the world origin) can see:
             a sheet we look at from underneath must stay darker than one we look down on */
          vdot: -(_n.x * _p.x + _n.y * _p.y + _n.z * _p.z) * pinv,
          b: 1, d: 0,
          fr: (0.020 + R() * 0.030) * Math.PI * 2,                        /* 0.02–0.05 Hz */
          ph: R() * Math.PI * 2
        };
        planes.push(rec); totalPlanes++;
        if (li === 0 && rec.pos.y > 96 && rec.pos.y < 168 && sheenSource.length < 8 && R() < 0.55) sheenSource.push(rec);
      }
    }

    /* ---- merge the body quads: primaries first, so a low tier can halve them
       with a draw range instead of rebuilding anything ---- */
    const bodyMat = new THREE.MeshBasicMaterial({
      map: atlas, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, fog: false,
      vertexColors: true, side: THREE.DoubleSide, forceSinglePass: true, blending: THREE.NormalBlending
    });
    materials.push(bodyMat);

    /* `veil` thins the half of the mass that lies between the camera and the
       crystal: a cloud's near skin is the part light passes through, and it is
       what lets the sheets inside read at all */
    const build = (set, order, name, veil) => {
      const list = set.pri.concat(set.sec);
      const count = list.length, verts = count * 6;
      const position = new Float32Array(verts * 3), uv = new Float32Array(verts * 2), colour = new Float32Array(verts * 4);
      const dirs = new Float32Array(count * 3), tints = new Float32Array(count);
      const PAD = 0.012, idx = [0, 1, 2, 0, 2, 3];
      for (let i = 0; i < count; i++) {
        const Q = list[i], c = Math.cos(Q.yaw), s = Math.sin(Q.yaw), cr = Math.cos(Q.roll), sr = Math.sin(Q.roll);
        const hw = Q.w / 2, hh = Q.h / 2;
        const cu = (Q.cell % 2) * 0.5, cv = Math.floor(Q.cell / 2) * 0.5;
        const u0 = cu + PAD, u1 = cu + 0.5 - PAD, v0 = cv + PAD, v1 = cv + 0.5 - PAD;
        dirs[i * 3] = Q.dx; dirs[i * 3 + 1] = Q.dy; dirs[i * 3 + 2] = Q.dz; tints[i] = Q.tint;
        for (let k = 0; k < 6; k++) {
          const j = idx[k];                                               /* corners 0..3 anticlockwise from bottom-left */
          const lx = (j === 0 || j === 3) ? -hw : hw, ly = (j === 0 || j === 1) ? -hh : hh;
          const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
          const o = (i * 6 + k) * 3;
          position[o] = Q.x + rx * c; position[o + 1] = Q.y + ry; position[o + 2] = Q.z - rx * s;
          uv[(i * 6 + k) * 2] = (j === 0 || j === 3) ? (Q.flip ? u1 : u0) : (Q.flip ? u0 : u1);
          uv[(i * 6 + k) * 2 + 1] = (j === 0 || j === 1) ? v0 : v1;
          const co = (i * 6 + k) * 4;
          colour[co] = Q.tint * 0.94; colour[co + 1] = Q.tint * 0.97; colour[co + 2] = Q.tint;
          colour[co + 3] = Q.a * veil * ((j === 0 || j === 1) ? Q.aBot : Q.aTop);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setAttribute('color', new THREE.BufferAttribute(colour, 4));
      geo.computeBoundingSphere();
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, bodyMat);
      mesh.name = 'cloud-body-' + L.name + '-' + name;
      mesh.renderOrder = order;
      mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.userData.fullCount = verts;
      mesh.userData.primaryCount = set.pri.length * 6;
      mesh.userData.dirs = dirs; mesh.userData.tints = tints; mesh.userData.quadCount = count;
      lg.add(mesh);
      return mesh;
    };
    const bodyBack = build(back, L.order - 0.2, 'back', 1.0);
    const bodyFront = build(front, L.order, 'front', 0.5);

    /* ---- the two crystal meshes: caught by the moon, and turned away ---- */
    const litMat = new THREE.MeshBasicMaterial({ map: facet, color: KEYS.night.lit, transparent: true, opacity: KEYS.night.litA, depthWrite: false, fog: false, side: THREE.DoubleSide, forceSinglePass: true, blending: THREE.NormalBlending });
    const darkMat = new THREE.MeshBasicMaterial({ map: facet, color: KEYS.night.dark, transparent: true, opacity: KEYS.night.darkA, depthWrite: false, fog: false, side: THREE.DoubleSide, forceSinglePass: true, blending: THREE.NormalBlending });
    materials.push(litMat, darkMat);
    const cap = Math.max(1, planes.length);
    const lit = new THREE.InstancedMesh(sheetGeo, litMat, cap);
    const dark = new THREE.InstancedMesh(sheetGeo, darkMat, cap);
    [lit, dark].forEach((mesh, i) => {
      mesh.name = 'cloud-crystal-' + L.name + '-' + (i ? 'dark' : 'lit');
      mesh.renderOrder = L.order - 0.1;
      mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      lg.add(mesh);
    });

    group.add(lg);
    layers.push({
      spec: L, group: lg, planes, lit, dark, bodyMat, bodyBack, bodyFront,
      litMap: new Array(cap).fill(null), darkMap: new Array(cap).fill(null),
      /* rad/s: 0.7–1.6 m/s tangential drift; the mid deck shears the other way */
      omega: L.speed / ((L.rMin + L.rMax) / 2) * (li === 1 ? -1 : 1),
      rot0: li * 0.37, lastAssign: -99,
      opacityPhase: R() * Math.PI * 2, opacityRate: (0.021 + R() * 0.016) * Math.PI * 2,
      litScale: li === 2 ? 0.72 : li === 1 ? 0.95 : 1,
      baseBodyA: KEYS.night.bodyA
    });
  });

  /* ---- the theme sheen: a faint energy tint on a few low-deck sheets near
     the beam altitudes. Never more than a breath of colour (≤ 0.12). ---- */
  const sheenMat = new THREE.MeshBasicMaterial({ map: facet, color: theme.energy, transparent: true, opacity: 0.09, depthWrite: false, fog: false, side: THREE.DoubleSide, forceSinglePass: true, blending: THREE.AdditiveBlending });
  materials.push(sheenMat);
  const sheen = new THREE.InstancedMesh(sheetGeo, sheenMat, Math.max(1, sheenSource.length));
  sheen.name = 'cloud-energy-sheen';
  sheen.renderOrder = LAYOUT[0].order + 0.1;
  sheen.castShadow = false; sheen.receiveShadow = false;
  sheen.frustumCulled = false;
  sheenSource.forEach((rec, i) => {
    _m4.makeBasis(rec.ax, rec.ay, rec.up).scale(_sc.set(rec.sw * 1.16, rec.sd * 1.16, 1)).setPosition(rec.pos);
    sheen.setMatrixAt(i, _m4);
  });
  sheen.count = sheenSource.length;
  sheen.instanceMatrix.needsUpdate = true;
  layers[0].group.add(sheen);

  if (scene) scene.add(group);

  /* ---- time --------------------------------------------------------------- */
  const keyDir = new THREE.Vector3(), sunV = new THREE.Vector3(), moonV = new THREE.Vector3();
  const _col = new THREE.Color();
  let key = Object.assign({}, KEYS.night);
  let daylight = 0, tNow = 0;
  let quality = { farLayers: true, name: 'high' };

  /* the body's own moon gradient: quads on the moon's side of the sky are
     baked brighter than the quads turned away from it */
  function shadeBody(mesh, rot) {
    const c = Math.cos(-rot), s = Math.sin(-rot);
    const kx = keyDir.x * c + keyDir.z * s, ky = keyDir.y, kz = -keyDir.x * s + keyDir.z * c;
    const dirs = mesh.userData.dirs, tints = mesh.userData.tints, n = mesh.userData.quadCount;
    const col = mesh.geometry.attributes.color, arr = col.array;
    const range = 0.30 + 0.26 * (1 - daylight);
    for (let i = 0; i < n; i++) {
      const d = dirs[i * 3] * kx + dirs[i * 3 + 1] * ky + dirs[i * 3 + 2] * kz;
      const f = tints[i] * (1 - range * 0.5 + range * smooth(d * 0.5 + 0.5));
      for (let k = 0; k < 6; k++) {
        const o = ((i * 6 + k) * 4);
        arr[o] = f * 0.94; arr[o + 1] = f * 0.97; arr[o + 2] = f;
      }
    }
    col.needsUpdate = true;
  }

  /* which sheets the moon catches, and how hard — recomputed on a time change
     and, cheaply, once a layer has drifted far enough for it to matter */
  function assign(layer) {
    const rot = layer.group.rotation.y;
    const c = Math.cos(-rot), s = Math.sin(-rot);
    /* the key direction expressed in the layer's own (rotating) frame */
    const kx = keyDir.x * c + keyDir.z * s, ky = keyDir.y, kz = -keyDir.x * s + keyDir.z * c;
    const litT = key.litT, span = Math.max(0.2, 0.86 - litT);
    let nl = 0, nd = 0;
    for (let i = 0; i < layer.planes.length; i++) {
      const p = layer.planes[i];
      const d = p.up.x * kx + p.up.y * ky + p.up.z * kz;
      p.d = d;
      /* the moon sits behind this sky, so most catches are seen through the
         sheet: a plate read edge-on is dim, a plate read face-on is bright, and
         an UNDERSIDE always stays darker than a top */
      const av = p.vdot < 0 ? -p.vdot : p.vdot;
      const face = (0.46 + 0.54 * av) * (p.vdot > 0 ? 1 : 0.68);
      if (d > litT) {
        const f = Math.pow(Math.min(1, (d - litT) / span), 0.7);
        p.b = Math.min(0.95, (0.34 + 0.66 * f) * face * key.catch + (1 - key.catch) * 0.30);
        layer.lit.setMatrixAt(nl, p.m);
        _col.setRGB(p.b, p.b, p.b); layer.lit.setColorAt(nl, _col);
        layer.litMap[nl] = p; nl++;
      } else {
        p.b = 0.58 + 0.42 * face;
        layer.dark.setMatrixAt(nd, p.m);
        _col.setRGB(p.b, p.b, p.b); layer.dark.setColorAt(nd, _col);
        layer.darkMap[nd] = p; nd++;
      }
    }
    layer.lit.count = nl; layer.dark.count = nd;
    layer.lit.instanceMatrix.needsUpdate = true; layer.dark.instanceMatrix.needsUpdate = true;
    if (layer.lit.instanceColor) layer.lit.instanceColor.needsUpdate = true;
    if (layer.dark.instanceColor) layer.dark.instanceColor.needsUpdate = true;
    shadeBody(layer.bodyBack, rot); shadeBody(layer.bodyFront, rot);
    layer.lastAssign = rot;
  }

  function setTime(clockState) {
    const s = clockState || { sunElevation: -0.9, daylight: 0, worldHour: 22.5 };
    key = cloudKey(typeof s.sunElevation === 'number' ? s.sunElevation : -0.9);
    daylight = typeof s.daylight === 'number' ? s.daylight : 0;
    const hour = typeof s.worldHour === 'number' ? s.worldHour : 22.5;
    /* the moon leads at night, the sun by day; between them the key swings across */
    sunDir(hour, sunV); moonDir(hour, moonV);
    keyDir.copy(moonV).lerp(sunV, smooth((daylight - 0.15) / 0.7)).normalize();
    layers.forEach((L, i) => {
      L.baseBodyA = key.bodyA * (i === 0 ? 1.0 : i === 1 ? 0.94 : 0.85);   /* the far decks thin out into the air */
      L.bodyMat.opacity = L.baseBodyA;
      L.bodyMat.color.setHex(key.body);
      L.lit.material.opacity = key.litA * L.litScale;
      L.lit.material.color.setHex(key.lit);
      L.dark.material.opacity = key.darkA * L.litScale;
      L.dark.material.color.setHex(key.dark);
      assign(L);
    });
    sheenMat.opacity = Math.min(0.17, key.sheenA);
    return key;
  }

  /* ---- theme: only the sheen follows; the clouds themselves stay silver-blue -- */
  function setTheme(t) {
    if (!t) return theme;
    theme = t;
    sheenMat.color.setHex(t.energy);
    return theme;
  }

  /* ---- motion: allocation-free ------------------------------------------- */
  function update(t, dt) {
    tNow = t;
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i];
      L.group.rotation.y = L.rot0 + t * L.omega;
      /* the mass breathes: a very slow swell of the body's density */
      L.bodyMat.opacity = L.baseBodyA * (1 + 0.08 * Math.sin(t * L.opacityRate + L.opacityPhase));
      if (Math.abs(L.group.rotation.y - L.lastAssign) > 0.02) assign(L);
      const lit = L.lit;
      if (lit.visible && lit.count && lit.instanceColor) {
        for (let j = 0; j < lit.count; j++) {
          const p = L.litMap[j];
          if (!p) continue;
          const b = p.b * (1 + 0.26 * Math.sin(t * p.fr + p.ph));
          _col.setRGB(b, b, b);
          lit.setColorAt(j, _col);
        }
        lit.instanceColor.needsUpdate = true;
      }
    }
    void dt;
  }

  /* ---- quality (§38): the far deck's crystal goes first, then half of every
     body; the near masses never lose their facets ---- */
  function setQuality(q) {
    quality = Object.assign({ farLayers: true, name: 'high' }, q || {});
    const low = quality.farLayers === false || quality.name === 'low';
    layers.forEach((L, i) => {
      const dropCrystal = low && i === 2;
      L.lit.visible = !dropCrystal;
      L.dark.visible = !dropCrystal;
      [L.bodyBack, L.bodyFront].forEach(mesh => {
        mesh.geometry.setDrawRange(0, low ? Math.max(6, mesh.userData.primaryCount) : mesh.userData.fullCount);
      });
    });
    sheen.visible = !low;
    return quality.name;
  }

  function dispose() {
    if (group.parent) group.parent.remove(group);
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
  }

  const stats = {
    module: 'clouds',
    layers: layers.length,
    masses: totalMasses,
    bodyQuads: totalQuads,
    crystalSheets: totalPlanes,
    sheenSheets: sheenSource.length,
    drawCalls: layers.length * 4 + 1,
    triangles: totalQuads * 2 + totalPlanes * 2 + sheenSource.length * 2,
    get key() { return key; },
    get time() { return tNow; },
    get daylight() { return daylight; },
    get quality() { return quality.name; }
  };

  void UP; void FWD;
  setTime(null);
  update(0, 0);

  return { group, setTime, setTheme, update, dispose, stats, setQuality };
}

export default buildClouds;
