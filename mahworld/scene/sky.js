/* MAHPLAZA :: SKY, TIME OF DAY, DISTANCE
   The sky is a function of the world clock: a gradient dome, a blue-white
   sun, the moon, stars, fog and the light rig all interpolate between three
   authored keys — NIGHT, DUSK (MAHWORLD's own violet twilight, not an Earth
   orange sunset) and DAY (a cool steel-blue day that reveals construction).
   Beyond the plaza: quiet rounded towers, a ring structure, dark mountains,
   and the FOB sky infrastructure — FOBEAMS (directed, coherent energy paths)
   and FOBLOWS (soft, broad atmospheric flows). They frame the world; they do
   not cover it. Everything here follows the viewer's world Theme for energy
   and never turns yellow. */
import * as THREE from '../vendor/three/three.module.min.js';

const KEYS = {
  night: { top: 0x040a19, horizon: 0x10264c, fog: 0x0e2142, hemiSky: 0x5a83c8, hemiGround: 0x141c2c, hemiI: 1.2, sun: 0xa9c9ff, sunI: 0.75, fillI: 0.5, exposure: 1.0, stars: 1.0, haze: 0.5, infra: 1.0, sunDisc: 0, clouds: 0.12 },
  dusk:  { top: 0x1a1a48, horizon: 0x7466b4, fog: 0x3c3672, hemiSky: 0x8a8ed4, hemiGround: 0x16162a, hemiI: 1.05, sun: 0xd8dbff, sunI: 1.0, fillI: 0.35, exposure: 1.0, stars: 0.35, haze: 0.55, infra: 0.8, sunDisc: 0.7, clouds: 0.3 },
  day:   { top: 0x5f87bd, horizon: 0xc4d5ea, fog: 0xb3c6df, hemiSky: 0xcfdff3, hemiGround: 0x2a3340, hemiI: 0.85, sun: 0xf3f7ff, sunI: 2.3, fillI: 0.18, exposure: 1.02, stars: 0.0, haze: 0.22, infra: 0.3, sunDisc: 1, clouds: 0.42 }
};
const c1 = new THREE.Color(), c2 = new THREE.Color();
function lerpHex(a, b, t) { c1.setHex(a); c2.setHex(b); return c1.lerp(c2, t).getHex(); }
function mixKeys(A, B, t) {
  const o = {};
  for (const k in A) o[k] = typeof A[k] === 'number' && A[k] > 1 && Number.isInteger(A[k]) ? lerpHex(A[k], B[k], t) : A[k] + (B[k] - A[k]) * t;
  return o;
}
/* sun elevation e (−1..1) → blended sky key */
export function skyColors(state) {
  const e = state.sunElevation;
  /* a long violet twilight: night below −0.55, full dusk at −0.12, day from +0.32 */
  if (e <= -0.55) return Object.assign({}, KEYS.night);
  if (e >= 0.32) return Object.assign({}, KEYS.day);
  if (e < -0.12) return mixKeys(KEYS.night, KEYS.dusk, smooth((e + 0.55) / 0.43));
  return mixKeys(KEYS.dusk, KEYS.day, smooth((e + 0.12) / 0.44));
}
function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

/* sun / moon direction: sunrise from +x, noon high toward the camera side (+z), sunset at −x */
export function sunDirection(worldHour, out) {
  const h = ((worldHour % 24) + 24) % 24;
  const day = h >= 6 && h <= 18;
  const f = day ? (h - 6) / 12 : ((h > 18 ? h - 18 : h + 6) / 12);
  const az = f * Math.PI, el = Math.sin(f * Math.PI) * 0.78;   /* noon ≈ 45°: the sun models the facades instead of grazing them */
  out.set(Math.cos(az) * Math.cos(el), Math.sin(el), 0.6 * Math.sin(az) * Math.cos(el) + 0.3).normalize();
  return { day, dir: out };
}
/* the moon keeps to the back of the sky over the district, where a phone frame can hold it */
export function moonDirection(worldHour, out) {
  const h = ((worldHour % 24) + 24) % 24;
  const f = h > 18 ? (h - 18) / 12 : h < 6 ? (h + 6) / 12 : 0.5;
  out.set(0.5 - f * 0.9, 0.3 + 0.16 * Math.sin(f * Math.PI), -0.78).normalize();
  return out;
}

export function buildSky(ctx) {
  const { M, scene, theme } = ctx;
  const g = new THREE.Group(); g.name = 'sky';

  /* dome with a vertex gradient we repaint on time changes */
  const domeGeo = new THREE.SphereGeometry(900, 40, 20);
  const colours = new Float32Array(domeGeo.attributes.position.count * 3);
  domeGeo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10; g.add(dome);
  function paintDome(k) {
    const pos = domeGeo.attributes.position; const top = new THREE.Color(k.top), hor = new THREE.Color(k.horizon), below = hor.clone().multiplyScalar(0.55), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const ny = pos.getY(i) / 900; if (ny >= 0) tmp.copy(hor).lerp(top, smooth(ny / 0.55)); else tmp.copy(hor).lerp(below, smooth(-ny / 0.2)); colours[i * 3] = tmp.r; colours[i * 3 + 1] = tmp.g; colours[i * 3 + 2] = tmp.b; }
    domeGeo.attributes.color.needsUpdate = true;
  }

  /* sun and moon discs + halos */
  const glowTex = radialTexture();
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(22, 48), new THREE.MeshBasicMaterial({ color: 0xf6f9ff, fog: false, transparent: true }));
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xdde9ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sunHalo.scale.set(220, 220, 1);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(24, 48), new THREE.MeshBasicMaterial({ map: moonTexture(), fog: false, transparent: true }));
  const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9fc0ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); moonHalo.scale.set(140, 140, 1);
  g.add(sunDisc, sunHalo, moon, moonHalo);

  /* stars */
  const starGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 0.95 + 0.05, r = 850; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd8e6ff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
  g.add(stars);

  /* clouds: a few broad soft masses, MAHWORLD's own quiet sky, keyed by time */
  const clouds = new THREE.Group();
  const cloudMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xdde8f8, transparent: true, opacity: 0.3, depthWrite: false, fog: false });
  [[-320, 150, -520, 420, 130], [120, 190, -560, 520, 150], [420, 120, -430, 380, 110], [-80, 230, -640, 600, 120], [-520, 110, -380, 300, 90]].forEach(([x, y, z, w, h]) => { const s = new THREE.Sprite(cloudMat.clone()); s.position.set(x, y, z); s.scale.set(w, h, 1); clouds.add(s); });
  g.add(clouds);
  /* horizon haze: luminous urban depth behind everything */
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(1400, 220), new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energyDeep, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  haze.position.set(0, 30, -520); g.add(haze);

  /* mountains: two dark ridges, fog-affected so they recede */
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x0c1322, roughness: 0.95, metalness: 0.0, flatShading: true });
  const ridge = (radius, count, hMin, hMax, seed) => {
    let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < count; i++) {
      const a = Math.PI * 0.62 + (i / (count - 1)) * Math.PI * 0.76 + (rnd() - 0.5) * 0.06;   /* the back half of the horizon */
      const x = Math.cos(a) * radius, z = -Math.abs(Math.sin(a) * radius) - 120;
      const h = hMin + rnd() * (hMax - hMin), w = 70 + rnd() * 90;
      const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5 + Math.floor(rnd() * 3), 1), mountainMat);
      m.position.set(x, h / 2 - 4, z); m.rotation.y = rnd() * Math.PI; g.add(m);
    }
  };
  ridge(560, 11, 120, 240, 5); ridge(430, 9, 70, 150, 17);

  /* restrained skyline: rounded towers, a few cylinders, one ring — quiet, softened, receding */
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x131c2c, roughness: 0.6, metalness: 0.35 });
  const stripMat = new THREE.MeshBasicMaterial({ color: theme.energy, transparent: true, opacity: 0.35, fog: true });
  let s = 3; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * 0.55 + (i / 15) * Math.PI * 0.9, r = 165 + rnd() * 70;
    const x = Math.cos(a) * r, z = -Math.abs(Math.sin(a) * r) - 40;
    if (Math.abs(x) < 26) continue;
    const radius = 5 + rnd() * 5, h = 24 + rnd() * 46;
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(radius, h, 3, 14), towerMat); t.position.set(x, h / 2, z); g.add(t);
    if (i % 3 !== 1) { const st = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.05, radius + 0.05, 0.45, 20, 1, true), stripMat); st.position.set(x, h * (0.45 + rnd() * 0.3), z); g.add(st); }
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(28, 1.4, 8, 48), towerMat); ring.position.set(-135, 44, -200); ring.rotation.x = Math.PI / 2.4; ring.rotation.z = 0.3; g.add(ring);
  [[-205, 12, -60], [205, 16, -80]].forEach(([x, h, z]) => { const cyl = new THREE.Mesh(new THREE.CylinderGeometry(16, 17, h, 24), towerMat); cyl.position.set(x, h / 2, z); g.add(cyl); });

  /* FOBEAMS — directed coherent energy pathways from slim masts, long graceful arcs */
  const beamMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const beamGlowMat = new THREE.MeshBasicMaterial({ color: theme.energy, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x8e9bb0, roughness: 0.3, metalness: 0.9 });
  const beams = [];
  function fobeam(pts, mastAt) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.26, 6, false), beamMat);
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 2.2, 6, false), beamGlowMat);
    g.add(core, glow); beams.push({ core, glow });
    if (mastAt) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 40, 8), mastMat); mast.position.set(mastAt[0], 20, mastAt[1]); g.add(mast); }
  }
  /* the pathways rise from masts at the district's edges and arc BEHIND the destinations, framing them */
  fobeam([[-90, 40, 30], [-96, 96, -90], [-70, 134, -220], [-10, 128, -340], [80, 84, -460]], [-90, 30]);
  fobeam([[96, 40, 10], [104, 100, -140], [70, 128, -300], [-20, 96, -460]], [96, 10]);

  /* FOBLOWS — soft broad atmospheric flows: flat translucent ribbons along curves */
  const flowMat = new THREE.MeshBasicMaterial({ color: theme.energy, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const flows = [];
  function foblow(pts, width) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    const N = 90, verts = new Float32Array((N + 1) * 2 * 3), idx = [];
    const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
    for (let i = 0; i <= N; i++) { const t = i / N, p = curve.getPointAt(t), tan = curve.getTangentAt(t); side.crossVectors(tan, up).normalize(); const w = width * (0.4 + 0.6 * Math.sin(Math.PI * t)); const a = p.clone().addScaledVector(side, w / 2), b = p.clone().addScaledVector(side, -w / 2); verts.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(verts, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, flowMat.clone()); g.add(m); flows.push(m);
  }
  foblow([[-260, 60, -60], [-120, 95, -160], [20, 120, -240], [160, 100, -300], [300, 60, -340]], 26);
  foblow([[-200, 110, -260], [-60, 140, -300], [90, 150, -320], [260, 120, -360]], 34);
  foblow([[220, 40, 20], [140, 90, -120], [40, 130, -260], [-80, 140, -380]], 18);

  scene.add(g);

  /* ---- time application ---------------------------------------------- */
  const sunDir = new THREE.Vector3();
  const state = { k: null };
  function setTime(clockState, lights) {
    const k = skyColors(clockState); state.k = k;
    paintDome(k);
    scene.fog.color.setHex(k.fog);
    const sun = sunDirection(clockState.worldHour, sunDir);
    /* the disc positions: sun by day, moon opposite; both always placed, faded by the key */
    sunDisc.position.copy(sunDir).multiplyScalar(800); sunDisc.lookAt(0, 0, 0); sunDisc.material.opacity = k.sunDisc * (sun.day ? 1 : 0);
    sunHalo.position.copy(sunDir).multiplyScalar(790); sunHalo.material.opacity = 0.55 * k.sunDisc * (sun.day ? 1 : 0);
    const moonDir = moonDirection(clockState.worldHour, new THREE.Vector3());
    moon.position.copy(moonDir).multiplyScalar(800); moon.lookAt(0, 0, 0); moon.material.opacity = 0.06 + 0.94 * Math.pow(1 - clockState.daylight, 1.5);
    moonHalo.position.copy(moonDir).multiplyScalar(790); moonHalo.material.opacity = 0.22 * (1 - clockState.daylight);
    stars.material.opacity = 0.85 * k.stars;
    haze.material.opacity = k.haze;
    clouds.children.forEach((c, i) => { c.material.opacity = k.clouds * (0.7 + (i % 3) * 0.15); c.material.color.setHex(clockState.daylight > 0.5 ? 0xe4edf9 : 0x8fb0e6); });
    beams.forEach(b => { b.core.material.opacity = 0.9 * k.infra; b.glow.material.opacity = 0.12 * k.infra; });
    flows.forEach(f => { f.material.opacity = 0.15 * k.infra; });
    stripMat.opacity = 0.35 * (1 - clockState.daylight * 0.7);
    if (lights) {
      lights.hemi.color.setHex(k.hemiSky); lights.hemi.groundColor.setHex(k.hemiGround); lights.hemi.intensity = k.hemiI;
      lights.dir.color.setHex(k.sun); lights.dir.intensity = k.sunI;
      const lightDir = sun.day ? sunDir : moonDir;
      lights.dir.position.copy(lightDir).multiplyScalar(300);
      /* the city behind the viewer bounces cool light onto the facades: what keeps graphite readable at night */
      if (lights.fill) { lights.fill.intensity = k.fillI; lights.fill.color.setHex(clockState.daylight > 0.5 ? 0xdfe9ff : 0x9dbdf0); }
    }
    return k;
  }
  function update(t) { flows.forEach((f, i) => { const k = state.k ? state.k.infra : 1; f.material.opacity = (0.15 + Math.sin(t * 0.00025 + i * 2.1) * 0.035) * k; }); }

  return { group: g, setTime, update, beams, flows };
}

function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(210,230,255,0.5)'); r.addColorStop(0.7, 'rgba(120,170,255,0.1)'); r.addColorStop(1, 'rgba(60,110,200,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function moonTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const cx = 256, cy = 256, R = 254;
  const base = g.createRadialGradient(cx - 40, cy - 50, 20, cx, cy, R);
  base.addColorStop(0, '#dbe4f3'); base.addColorStop(0.7, '#a3b3cd'); base.addColorStop(1, '#5f7394');
  g.fillStyle = base; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 0.2; g.fillStyle = '#3b4d6d';
  [[cx - 90, cy + 40, 46], [cx + 70, cy - 30, 30], [cx + 20, cy + 120, 22], [cx - 140, cy - 90, 18], [cx + 110, cy + 80, 26]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
  g.globalAlpha = 1;
  const t = g.createRadialGradient(cx + 70, cy - 60, R * 0.5, cx, cy, R); t.addColorStop(0, 'rgba(6,10,20,0)'); t.addColorStop(1, 'rgba(6,10,20,0.7)');
  g.fillStyle = t; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
