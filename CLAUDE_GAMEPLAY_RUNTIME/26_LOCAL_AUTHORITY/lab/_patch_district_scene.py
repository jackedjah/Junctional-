"""S11: district ground + landmark loading + fog / camera far (fieldScene.js, play.js)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
def patch(name, pairs):
    p = os.path.join(HERE, name); s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (name, old[:70], s.count(old)); s = s.replace(old, new)
    open(p, 'w', encoding='utf-8').write(s)

DISTRICT_GROUND = r"""      var floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: floorTex, color: 0xffffff, roughness: NIGHT ? 0.22 : 0.3, metalness: NIGHT ? 0.86 : 0.6 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.012; group.add(floor);
      if (worldSize > size + 1) { /* S11 DISTRICT GROUND: dark graphite / blackened platinum with soft silver reflections and cool metallic-blue route inlays (radial routes plaza -> each landmark), no grid */
        var dSize = worldSize; var dTex = canvasTex(2048, 2048, function (g, w, h) { var cx = w / 2, cz = h / 2, k = w / dSize; var base2 = g.createRadialGradient(cx, cz - 60 * k, 20, cx, cz, w * 0.7); base2.addColorStop(0, NIGHT ? '#1a1f28' : '#1b202a'); base2.addColorStop(0.5, NIGHT ? '#111519' : '#12161d'); base2.addColorStop(1, NIGHT ? '#090b0f' : '#0b0d12'); g.fillStyle = base2; g.fillRect(0, 0, w, h);
          g.globalAlpha = 0.06; for (var i = 0; i < 1400; i++) { var ang = Math.random() * Math.PI * 2, r0 = Math.random() * w * 0.7, len = 60 + Math.random() * 300; g.strokeStyle = Math.random() < 0.55 ? '#cfd8e2' : '#05070b'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(cx + Math.cos(ang) * r0, cz + Math.sin(ang) * r0); g.lineTo(cx + Math.cos(ang + 0.003) * (r0 + len), cz + Math.sin(ang + 0.003) * (r0 + len)); g.stroke(); } g.globalAlpha = 1;
          var routes = (layout.landmarks || []).map(function (l) { return [l.x, l.z]; }); routes.forEach(function (pt) { var gx = cx + pt[0] * k, gz = cz + pt[1] * k; var gr = g.createLinearGradient(cx, cz + 56 * k, gx, gz); gr.addColorStop(0, 'rgba(120,170,220,0.05)'); gr.addColorStop(0.6, 'rgba(120,170,220,0.16)'); gr.addColorStop(1, 'rgba(191,230,255,0.30)'); g.strokeStyle = gr; g.lineWidth = 4.5 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cz + 56 * k); g.lineTo(gx, gz); g.stroke(); g.strokeStyle = 'rgba(180,200,225,0.22)'; g.lineWidth = 0.5 * k; g.beginPath(); g.arc(gx, gz, 44 * k, 0, Math.PI * 2); g.stroke(); });
          var temple = routes[0]; if (temple) { g.strokeStyle = 'rgba(70,120,190,0.30)'; g.lineWidth = 2.2 * k; g.beginPath(); g.arc(cx + temple[0] * k, cz + temple[1] * k, 48 * k, 0, Math.PI * 2); g.stroke(); g.strokeStyle = 'rgba(200,215,230,0.14)'; g.lineWidth = 0.6 * k; g.beginPath(); g.arc(cx + temple[0] * k, cz + temple[1] * k, 60 * k, 0, Math.PI * 2); g.stroke(); } });
        var dFloor = new THREE.Mesh(new THREE.PlaneGeometry(dSize, dSize), new THREE.MeshStandardMaterial({ map: dTex, color: 0xffffff, roughness: NIGHT ? 0.26 : 0.32, metalness: NIGHT ? 0.82 : 0.6 })); dFloor.rotation.x = -Math.PI / 2; dFloor.position.y = -0.005; group.add(dFloor);
        loadDistrict(layout); }"""

LOADER = r"""  /* ---- S11 DISTRICT LANDMARKS: runtime derivatives (Blender-decimated copies, originals never served) placed with the SAME transform the collider
     builder used (translation . yaw . uniform scale . bottom-centre offset). Materials stay as exported (metallic 0 / roughness 0.5: the base colour
     depicts metal and glass; a blanket metallic=1 would also hit signs, windows and plants). The client copy of the proxies feeds the camera boom + map. ---- */
  var districtInfo = { loaded: [], manifest: null, colliders: 0, failed: [] };
  function loadDistrict(layout) {
    var key = layout.version; districtInfo = { loaded: [], manifest: null, colliders: 0, failed: [], key: key };
    fetch('assets/buildings/district_v1.json').then(function (r) { return r.json(); }).then(function (man) { districtInfo.manifest = man; var loader = new GLTFLoader();
      man.buildings.forEach(function (b) { if (b.enabled === false || !b.scale) return; loader.load(b.runtime.replace(/^lab\//, ''), function (g) { if (!built || built.indexOf(key) !== 0) return; var bld = new THREE.Group(); bld.name = 'DISTRICT_' + b.id.toUpperCase(); bld.position.set(b.position[0], 0, b.position[2]); bld.rotation.y = (b.yaw_deg || 0) * Math.PI / 180; var inner = g.scene; var box = new THREE.Box3().setFromObject(inner); var c = box.getCenter(new THREE.Vector3()); inner.position.set(-c.x * b.scale, -box.min.y * b.scale, -c.z * b.scale); inner.scale.setScalar(b.scale); inner.traverse(function (o) { if (o.isMesh) { o.frustumCulled = true; o.castShadow = false; o.receiveShadow = false; if (o.material) { o.material.side = THREE.FrontSide; if (o.material.map) o.material.map.anisotropy = 4; } } }); bld.add(inner); group.add(bld); districtInfo.loaded.push({ id: b.id, scale: b.scale, tris: b.runtime_triangles }); }, undefined, function (e) { districtInfo.failed.push(b.id + ': ' + (e && e.message)); }); }); }).catch(function (e) { districtInfo.failed.push('manifest: ' + (e && e.message)); });
    fetch('../play/rules1723/district_v1_colliders.json').then(function (r) { return r.json(); }).then(function (col) { if (col && col.shapes) { shapes = shapes.concat(col.shapes); districtInfo.colliders = col.shapes.length; } }).catch(function (e) { districtInfo.failed.push('colliders: ' + (e && e.message)); });
  }
  function clear() {"""

patch('fieldScene.js', [
 ("import { createCityScene } from './cityScene.js';", "import { createCityScene } from './cityScene.js'; import { GLTFLoader } from '../vendor/three/GLTFLoader.js';"),
 ("      var size = sizeM || 30; var city = createCityScene(THREE, group, { roundedBox: roundedBox, canvasTex: canvasTex });",
  "      var worldSize = sizeM || 30; var size = Math.min(worldSize, 112);   /* S11: the authored plaza floor stays 112 m; the district ground (below) covers the whole field */ var city = createCityScene(THREE, group, { roundedBox: roundedBox, canvasTex: canvasTex });"),
 ("base.addColorStop(0, NIGHT ? '#3a4557' : '#2b3446'); base.addColorStop(0.55, NIGHT ? '#2a3444' : '#202838'); base.addColorStop(1, NIGHT ? '#1a2230' : '#151b28');",
  "base.addColorStop(0, NIGHT ? '#2a3140' : '#232a38'); base.addColorStop(0.55, NIGHT ? '#1a2029' : '#171d28'); base.addColorStop(1, NIGHT ? '#0e1219' : '#0f131c');   /* S11: blackened platinum (graphite base, silver grain + inlays stay) */"),
 ("      var floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: floorTex, color: 0xffffff, roughness: NIGHT ? 0.2 : 0.3, metalness: NIGHT ? 0.88 : 0.6 })); floor.rotation.x = -Math.PI / 2; group.add(floor);", DISTRICT_GROUND),
 ("scene.background = new THREE.Color(0x070c16); scene.fog = new THREE.Fog(0x0b1424, 60, 240);", "scene.background = new THREE.Color(0x070c16); scene.fog = new THREE.Fog(0x0b1424, 80, (sizeM || 30) > 200 ? 620 : 240);   /* S11: the 80 m temple must read from the plaza (250 m away) */"),
 ("scene.background = new THREE.Color(0xa8cbe6); scene.fog = new THREE.Fog(0xcfe0ea, 70, 260);", "scene.background = new THREE.Color(0xa8cbe6); scene.fog = new THREE.Fog(0xcfe0ea, 90, (sizeM || 30) > 200 ? 680 : 260);"),
 ("  function clear() {", LOADER),
 ("    debug: function () { var sky = group.getObjectByName('MAHWORLD_SKY');", "    district: function () { return districtInfo; },\n    debug: function () { var sky = group.getObjectByName('MAHWORLD_SKY');"),
])
patch('play.js', [("camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400)", "camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900)")])
print('ok')
