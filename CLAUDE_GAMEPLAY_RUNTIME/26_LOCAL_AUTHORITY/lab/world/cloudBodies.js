/* MAHWORLD WORLD PIVOT · PASS 1 :: CLOUD BODIES (owner sky direction 2026-09-25: bright fantasy daylight, long layered billowing clouds,
   warm/light upper exposure, cooler underside, luminous edges toward the Sun, strong depth layering — never blobs, circles or flat sheets).
   Each registry cloud is a CLUSTER of camera-facing puffs: a flattened base row gives the cloud a calm shelf, a taller crown row gives the
   billowing top. One instanced draw per layer; the puffs are lit in the shader, not by scene lights:
     · a pseudo-spherical normal per puff (view space) wrapped against the Sun (day) / Moon (night) direction → volume-like shading;
     · the puff's height inside its cloud mixes the cool underside into the warm crown (clouds are darker underneath);
     · a silver lining where a thin edge faces the light (forward scattering, stronger when the camera looks toward the light);
     · aerial perspective toward the sky haze colour with distance.
   Puffs are re-sorted back-to-front a few times per second (instances are drawn in buffer order), so nearer bodies always cover farther ones.
   Tiers scale the puff count (HIGH 1 · MED 0.7 · LOW 0.45). Presentation only; the shared optics in sky.js are unchanged. */

var VERT = [
  'attribute vec4 aPuff;',              /* x: height inside the cloud 0..1 · y: seed · z: alpha · w: flatten (base puffs) */
  'attribute vec2 aCloud;',             /* x: cloud base world y · y: cloud vertical extent (m) */
  'uniform vec3 uLightWorld;',
  'varying vec2 vUv; varying vec4 vPuff; varying float vDist; varying vec3 vLightView; varying float vH;',
  'void main() {',
  '  vUv = vec2(aPuff.y > 0.5 ? 1.0 - uv.x : uv.x, uv.y); vPuff = aPuff; vLightView = normalize((viewMatrix * vec4(uLightWorld, 0.0)).xyz);',
  '  vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
  '  float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz);',
  '  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);',
  '  vec3 toCam = normalize(cameraPosition - centre);',
  '  vec3 viewUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);',
  '  vec3 camUp = normalize(mix(vec3(0.0, 1.0, 0.0), viewUp, smoothstep(0.35, 0.85, abs(toCam.y))));',   /* upright near the horizon (flat base, crown up); camera-facing when looked at steeply from below/above so puffs never foreshorten into stacked discs */
  '  camRight = normalize(cross(camUp, toCam)); camUp = normalize(cross(toCam, camRight));',
  '  vec3 world = centre + camRight * position.x * sx + camUp * position.y * sy;',
  '  vH = clamp((world.y - aCloud.x) / max(aCloud.y, 1.0), 0.0, 1.0);',   /* shade by height inside the WHOLE cloud: no per-puff banding */
  '  vec4 mv = viewMatrix * vec4(world, 1.0); vDist = length(cameraPosition - centre);',
  '  gl_Position = projectionMatrix * mv;',
  '}'].join('\n');

var FRAG = [
  'uniform sampler2D uMap; uniform vec3 uTop, uShade, uRim, uHaze; uniform float uOpacity, uRimK, uHazeNear, uHazeFar, uTime;',
  'varying vec2 vUv; varying vec4 vPuff; varying float vDist; varying vec3 vLightView; varying float vH;',
  'void main() {',
  '  vec2 q = vUv * 2.0 - 1.0; q.x += 0.06 * sin(vPuff.y * 40.0 + uTime * 0.05);',
  '  vec4 tex = texture2D(uMap, vUv); float a = tex.a * vPuff.z * uOpacity; if (a < 0.004) discard;',
  '  float r2 = clamp(dot(q, q), 0.0, 1.0); vec3 n = normalize(vec3(q.x, q.y * (1.0 - 0.35 * vPuff.w), sqrt(1.0 - r2) + 0.15));',  /* puff pseudo-normal (view-facing) */
  '  vec3 L = normalize(vLightView); float forward = pow(max(-L.z, 0.0), 3.0);',
  '  float lam = dot(n, L) * 0.5 + 0.5; lam = lam * lam * (3.0 - 2.0 * lam);',
  '  float h = smoothstep(0.0, 0.85, vH);',                                                      /* underside → crown of the whole cloud */
  '  float core = smoothstep(0.2, 0.9, tex.a);',                                               /* the per-puff volume term fades out toward the puff edge, so overlapping puffs meet on the SHARED cloud shading (no ball outlines) */
  '  float lit = clamp(h * 0.8 + (lam - 0.5) * 0.3 * core + 0.14, 0.0, 1.0);',
  '  vec3 col = mix(uShade, uTop, lit) * (0.95 + 0.1 * mix(0.85, tex.r, core));',                             /* the texture carries the cauliflower relief */
  '  float edge = 1.0 - smoothstep(0.08, 0.62, tex.a);',                                      /* thin edges scatter light */
  '  col += uRim * uRimK * edge * (0.08 + forward) * h * clamp(dot(normalize(vec3(q, 0.35)), L) * 0.5 + 0.55, 0.0, 1.0);',
  '  float fogK = smoothstep(uHazeNear, uHazeFar, vDist); col = mix(col, uHaze, fogK * 0.78); a *= 1.0 - fogK * 0.35;',
  '  gl_FragColor = vec4(col, a);',
  '  #include <colorspace_fragment>',
  '}'].join('\n');

function puffTexture(THREE, size) {
  var c = document.createElement('canvas'); c.width = c.height = size; var g = c.getContext('2d'); g.clearRect(0, 0, size, size);
  var s = 0x5eed1234 >>> 0; function r() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
  /* one soft core + many small lobes on the upper rim: a cauliflower silhouette rather than a disc. The red channel carries relief. */
  function lobe(x, y, rad, alpha, relief) { var gr = g.createRadialGradient(x - rad * 0.18, y - rad * 0.22, rad * 0.08, x, y, rad); gr.addColorStop(0, 'rgba(' + relief + ',' + relief + ',' + relief + ',' + alpha + ')'); gr.addColorStop(0.55, 'rgba(' + Math.round(relief * 0.86) + ',' + Math.round(relief * 0.86) + ',' + Math.round(relief * 0.86) + ',' + (alpha * 0.72) + ')'); gr.addColorStop(1, 'rgba(180,180,180,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); }
  var C = size / 2; lobe(C, C * 1.04, C * 0.66, 0.95, 225);
  for (var i = 0; i < 26; i++) { var ang = Math.PI * (1.04 + r() * 0.92), d = C * (0.34 + r() * 0.24); lobe(C + Math.cos(ang) * d, C * 1.02 + Math.sin(ang) * d * 0.9, C * (0.16 + r() * 0.16), 0.72 + r() * 0.2, 205 + Math.round(r() * 50)); }
  for (i = 0; i < 12; i++) { ang = Math.PI * (0.08 + r() * 0.84); d = C * (0.22 + r() * 0.26); lobe(C + Math.cos(ang) * d, C * 1.0 + Math.sin(ang) * d * 0.55, C * (0.18 + r() * 0.12), 0.6 + r() * 0.2, 170 + Math.round(r() * 40)); }
  var im = g.getImageData(0, 0, size, size), px = im.data; for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) { var o = (y * size + x) * 4, dx = (x - C) / C, dy = (y - C) / C, rr = Math.sqrt(dx * dx + dy * dy); var fall = Math.max(0, Math.min(1, (1.0 - rr) / 0.5)); fall = fall * fall * (3 - 2 * fall); px[o + 3] = Math.round(px[o + 3] * fall); }
  g.putImageData(im, 0, 0); var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; return t;
}

/* Deterministic cluster layout for one cloud of footprint length L (metres). Returns puffs relative to the cloud origin. */
export function cloudCluster(L, rnd, crown) {
  var n = Math.max(5, Math.min(16, Math.round(L / 13))), puffs = [], k = crown === undefined ? 1 : crown;
  for (var i = 0; i < n; i++) { var u = n === 1 ? 0.5 : i / (n - 1), prof = Math.pow(Math.sin(Math.PI * (0.08 + u * 0.84)), 0.75); var rad = L * (0.09 + 0.07 * prof) * (0.85 + rnd() * 0.3);
    puffs.push({ x: (u - 0.5) * L * 0.86 + (rnd() - 0.5) * L * 0.04, y: rad * 0.28, z: (rnd() - 0.5) * L * 0.16, w: rad * 2.3, h: rad * 1.25, height: 0.1, flat: 1 });   /* base shelf */
    if (prof > 0.35) puffs.push({ x: (u - 0.5) * L * 0.8 + (rnd() - 0.5) * L * 0.06, y: rad * (0.75 + prof * 0.9 * k), z: (rnd() - 0.5) * L * 0.14, w: rad * 2.1, h: rad * 2.1, height: 0.55 + prof * 0.45, flat: 0 });   /* billowing crown */
    if (prof > 0.72 && rnd() < 0.7 * k) { var cr = rad * (0.55 + rnd() * 0.25); puffs.push({ x: (u - 0.5) * L * 0.78 + (rnd() - 0.5) * L * 0.08, y: rad * (1.35 + prof * 1.05 * k), z: (rnd() - 0.5) * L * 0.1, w: cr * 2.1, h: cr * 2.05, height: 1, flat: 0 }); } }   /* irregular cauliflower caps */
  return puffs;
}

export function createCloudBodies(ctx, L, opts) {
  var THREE = ctx.THREE; var tierScale = opts.tierScale || 1; var rnd = opts.rnd || Math.random; var own = [];
  var clouds = [], puffs = [];
  var count = Math.max(4, Math.round((L.count || 20) * (opts.countScale || 1)));
  for (var k = 0; k < count; k++) { var len = (L.size_m ? L.size_m[0] : 60) + rnd() * ((L.size_m ? L.size_m[1] : 140) - (L.size_m ? L.size_m[0] : 60)); var x0 = (rnd() - 0.5) * opts.spread, z0 = opts.originZ + (rnd() - 0.5) * opts.spread, ang0 = 0, rr = 0; if (L.ring_m) { ang0 = rnd() * Math.PI * 2; rr = L.ring_m[0] + rnd() * (L.ring_m[1] - L.ring_m[0]); x0 = Math.cos(ang0) * rr; z0 = opts.originZ + Math.sin(ang0) * rr; }   /* M8B: horizon banks sit on a ring around the world */
    var cl = { x: x0, z: z0, x0: x0, z0: z0, ang0: ang0, rr: rr, y: (L.alt_m || 150) + (rnd() - 0.5) * 24, yaw: rnd() * Math.PI, drift: 0.7 + rnd() * 0.6, len: len, puffs: [] };
    var raw = cloudCluster(len, rnd, L.crown === undefined ? 1 : L.crown); var keep = Math.max(4, Math.round(raw.length * tierScale));
    cl.extent = Math.max.apply(Math, raw.map(function (P) { return P.y + P.h * 0.5; })) + len * 0.02;
    if (L.max_top_m && cl.y + cl.extent > L.max_top_m) cl.y = L.max_top_m - cl.extent;   /* keeps every body below the HALO deck (240 m): no cloud ever pokes up through the upper-realm floor */
    for (var p = 0; p < raw.length; p++) { if (p % Math.max(1, Math.round(raw.length / keep)) !== 0 && raw.length > keep) continue; var P = raw[p]; P.cloud = cl; P.seed = rnd(); cl.puffs.push(P); puffs.push(P); }
    clouds.push(cl); }
  var geo = new THREE.PlaneGeometry(1, 1); own.push(geo); var aPuff = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4); aPuff.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aPuff', aPuff); var aCloud = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 2), 2); aCloud.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aCloud', aCloud);
  var tex = puffTexture(THREE, 256); own.push(tex);
  var mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, fog: false, side: THREE.DoubleSide, toneMapped: true,
    uniforms: { uMap: { value: tex }, uTop: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uRim: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uLightWorld: { value: new THREE.Vector3(0, 1, 0) }, uOpacity: { value: 1 }, uRimK: { value: 0.6 }, uHazeNear: { value: 320 }, uHazeFar: { value: 1100 }, uTime: { value: 0 } } });
  own.push(mat);
  var mesh = new THREE.InstancedMesh(geo, mat, puffs.length); mesh.name = 'SKY_' + L.id; mesh.frustumCulled = false; mesh.userData.noMerge = true; mesh.renderOrder = opts.renderOrder || 4; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.userData.cloudSilhouette = { kind: 'LIT_PUFF_CLUSTER', rectangular: false, feathered: true, clouds: clouds.length, puffs: puffs.length, tier_scale: tierScale };
  var _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(); var order = puffs.map(function (p, i) { return i; }); var sortClock = 1e9;
  function write(camPos) {  /* recompute world puff positions from the drifting cloud origins; with camPos also re-sort back-to-front */
    for (var i = 0; i < puffs.length; i++) { var P = puffs[i], c = P.cloud, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); P.wx = c.x + P.x * cs - P.z * sn; P.wy = c.y + P.y; P.wz = c.z + P.x * sn + P.z * cs; P.d2 = camPos ? (P.wx - camPos.x) * (P.wx - camPos.x) + (P.wy - camPos.y) * (P.wy - camPos.y) + (P.wz - camPos.z) * (P.wz - camPos.z) : 0; }
    if (camPos) order.sort(function (a, b) { return puffs[b].d2 - puffs[a].d2; });   /* back-to-front */
    for (var j = 0; j < order.length; j++) { var Q = puffs[order[j]]; _p.set(Q.wx, Q.wy, Q.wz); _s.set(Q.w, Q.h, 1); _m.compose(_p, _q, _s); mesh.setMatrixAt(j, _m); aPuff.setXYZW(j, Q.height, Q.seed, 0.5 + 0.34 * (1 - Q.flat * 0.25), Q.flat); aCloud.setXY(j, Q.cloud.y - Q.cloud.len * 0.02, Q.cloud.extent); }
    mesh.instanceMatrix.needsUpdate = true; aPuff.needsUpdate = true; aCloud.needsUpdate = true; }
  write(null);
  function setLook(look) { var U = mat.uniforms; U.uTop.value.set(look.top); U.uShade.value.set(look.shade); U.uRim.value.set(look.rim); U.uHaze.value.set(look.haze); U.uOpacity.value = look.opacity; U.uRimK.value = look.rimK; }
  /* camPos: {x,y,z} (ctx.cameraPos()) for the back-to-front sort · lightDir: the world direction of the active key (Sun by day, Moon by night) */
  function tick(dt, t, camPos, lightDir) { mat.uniforms.uTime.value = t || 0; if (lightDir) mat.uniforms.uLightWorld.value.set(lightDir[0], lightDir[1], lightDir[2]).normalize();
    sortClock += dt || 0; var sortNow = sortClock > 0.25 && camPos; write(sortNow ? camPos : null); if (sortNow) sortClock = 0; }
  function dispose() { if (mesh.parent) mesh.parent.remove(mesh); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; }
  return { mesh: mesh, mat: mat, clouds: clouds, puffs: puffs, setLook: setLook, tick: tick, write: write, dispose: dispose };
}
