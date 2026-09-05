/* MAHPLAZA :: GROUND PLAN
   Three understandable surface layers (brief §08 / notes §12):
   1. the central pedestrian plaza — broad, dark, polished, mostly uninterrupted;
   2. sidewalks / building aprons — slightly raised, materially different;
   3. vehicle corridors — smooth dark lanes at the district edges with
      restrained blue-white markers, curving away so the city continues.
   Plus the MAHPLAZA civic marker (not MAHWORLD: MAHWORLD is the universe),
   a few seating blocks, and the planter spots the flora module fills.
   Deliberately sparse: pavement stays pavement. */
import * as THREE from '../vendor/three/three.module.min.js';
import { canvasTexture, diamondOutline } from './materials.js';

export const PLAZA_RADIUS = 27;

export function buildGround(ctx) {
  const { M, scene, reflect } = ctx;
  const g = new THREE.Group(); g.name = 'ground';

  /* 1. plaza: polished dark ground, semi-transparent over black so mirrored
     emissives read as wet reflections (see the assembly's reflection group) */
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(260, 260, 1, 1), M.plaza);
  plaza.rotation.x = -Math.PI / 2; plaza.renderOrder = 2; plaza.receiveShadow = true; g.add(plaza);
  if (M.plaza.roughnessMap) { M.plaza.roughnessMap.repeat.set(12, 12); }
  const under = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x02040a, fog: false }));
  under.rotation.x = -Math.PI / 2; under.position.y = -80; g.add(under);
  /* very faint paving seams: large slabs, not a glowing grid */
  const seams = canvasTexture(512, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(150,180,220,0.28)'; c.lineWidth = 2; for (let i = 0; i <= 4; i++) { const p = i * (w / 4); c.beginPath(); c.moveTo(p, 0); c.lineTo(p, h); c.stroke(); c.beginPath(); c.moveTo(0, p); c.lineTo(w, p); c.stroke(); } });
  seams.wrapS = seams.wrapT = THREE.RepeatWrapping; seams.repeat.set(9, 9);
  const seamPlane = new THREE.Mesh(new THREE.PlaneGeometry(216, 216), new THREE.MeshBasicMaterial({ map: seams, transparent: true, opacity: 0.09, depthWrite: false }));
  seamPlane.rotation.x = -Math.PI / 2; seamPlane.position.y = 0.012; seamPlane.renderOrder = 3; g.add(seamPlane);

  /* the circulation ring: one restrained inset ring at the plaza edge */
  const ring = new THREE.Mesh(new THREE.RingGeometry(PLAZA_RADIUS - 0.09, PLAZA_RADIUS + 0.09, 128), M.energySoft);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.renderOrder = 4; g.add(ring);

  /* the MAHPLAZA civic marker: square-diamond mark + wordmark, inlaid, restrained */
  const markMat = M.energyLight;
  const mark = new THREE.Group();
  mark.add(diamondOutline(5.2, 0.16, markMat));
  mark.add(diamondOutline(2.6, 0.12, markMat));
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.8), markMat); core.rotation.y = Math.PI / 4; mark.add(core);
  mark.position.set(0, 0.03, 12); g.add(mark);
  mark.traverse(o => { if (o.isMesh) reflect(o, 0.4); });
  const wordTex = canvasTexture(2048, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(225,238,255,0.92)'; c.font = '700 300px "Space Grotesk", "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; let total = 0; const gap = 44; for (const ch of 'MAHPLAZA') total += c.measureText(ch).width + gap; let x = w / 2 - (total - gap) / 2; c.textAlign = 'left'; for (const ch of 'MAHPLAZA') { c.fillText(ch, x, h / 2); x += c.measureText(ch).width + gap; } });
  const word = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75), new THREE.MeshBasicMaterial({ map: wordTex, transparent: true, depthWrite: false }));
  word.rotation.x = -Math.PI / 2; word.position.set(0, 0.03, 17.5); g.add(word);
  ctx.timeHooks.push(s => { word.material.opacity = 0.55 + 0.45 * (1 - s.daylight); });

  /* 2. aprons: raised slabs in front of the three destinations */
  function apron(x, z, w, d, rotY) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), M.graphiteLight);
    a.position.set(x, 0.08, z); a.rotation.y = rotY; a.receiveShadow = true; g.add(a);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, 0.06), M.energySoft);
    lip.position.set(0, 0.09, d / 2 - 0.03); a.add(lip);
    return a;
  }
  apron(0, -34, 46, 16, 0);                     /* MAH MATCH forecourt */
  apron(-37, -21, 30, 12, 0.32);                /* MAH GYM apron, angled toward the plaza */
  apron(37, -21, 30, 12, -0.32);                /* MAH MARKET apron */

  /* 3. vehicle corridors: two lanes at the district edges, curving away behind the buildings */
  function corridor(sign) {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; const z = 70 - t * 190; const x = sign * (44 + Math.pow(Math.max(0, (t - 0.55)) / 0.45, 1.6) * 40); pts.push(new THREE.Vector3(x, 0, z)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const road = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 3.6, 4, false), M.road);
    road.scale.y = 0.012; road.position.y = 0.006; g.add(road);              /* a flattened tube: a smooth ribbon of roadway */
    const walk = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 6.2, 4, false), M.graphiteLight);
    walk.scale.y = 0.02; walk.position.y = 0.0; walk.renderOrder = 1; g.add(walk);   /* the sidewalk band either side */
    /* lane markers: short inset strips along the centre, sparse */
    const markGeo = new THREE.BoxGeometry(0.08, 0.02, 1.6);
    for (let i = 2; i < 46; i += 3) { const pt = curve.getPointAt(i / 48), tan = curve.getTangentAt(i / 48); const mk = new THREE.Mesh(markGeo, M.energySoft); mk.position.copy(pt).setY(0.03); mk.rotation.y = Math.atan2(tan.x, tan.z); g.add(mk); }
    /* one square-diamond route symbol per corridor */
    const sym = diamondOutline(1.6, 0.08, M.energy); const sp = curve.getPointAt(0.18); sym.position.set(sp.x, 0.03, sp.z); g.add(sym);
    return curve;
  }
  ctx.roads = [corridor(-1), corridor(1)];

  /* seating: two low graphite blocks with one thin light seam each */
  [[-19, 21, 0.5], [19, 21, -0.5]].forEach(([x, z, ry]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.55, 1.4), M.graphiteDark); b.position.set(x, 0.275, z); b.rotation.y = ry; g.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.02, 0.04), M.energySoft); s.position.set(0, 0.28, 0.7); b.add(s);
  });

  /* planter spots the flora module fills — sparse, at the plaza edge and building aprons */
  ctx.planterSpots = [
    { x: -14, z: 24, size: 'medium', shape: 'round' }, { x: 14, z: 24, size: 'medium', shape: 'round' },
    { x: -30, z: 4, size: 'large', shape: 'box' }, { x: 30, z: 4, size: 'large', shape: 'box' },
    { x: -22, z: -30, size: 'small', shape: 'box' }, { x: 22, z: -30, size: 'small', shape: 'box' }
  ];

  scene.add(g);
  return g;
}
