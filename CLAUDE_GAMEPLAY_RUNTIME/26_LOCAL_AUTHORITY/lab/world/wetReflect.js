/* MAHWORLD M15 :: NIGHT REFLECTION STREAKS (owner 2026-09-27, background-world reference: "premium reflective paving … reflective plaza
   composition"). A polished night floor mirrors every lamp as a long soft streak running from the lamp's base toward the viewer — the
   single strongest cue of the owner's reference plazas. Each streak is a ground quad turned toward the camera every frame in the vertex
   shader: it starts at the lamp's foot, is brightest around the mirror point (where a perfect mirror would show the head, at
   D·H / (H + h) from the lamp for a camera h above the floor), widens and fades as it runs, and breaks up slightly (the stone is honed,
   not glass). Additive, no depth write, 4.5 cm above the floor (host-safe flush), night only (it fades out by day), one instanced draw for
   every lamp given. LOW tier: shorter streaks, no break-up. */
var VERT = [
  'attribute vec4 iL; attribute vec3 iC;',   /* iL: lamp foot (x, floor y, z) + head height above the floor · iC: colour */
  'uniform float uLen; varying vec2 vQ; varying vec3 vC; varying float vMir; varying float vFar;',
  'void main() { vC = iC; vec2 foot = iL.xz; vec2 toC = cameraPosition.xz - foot; float D = max(length(toC), 0.5); vec2 d = toC / D, r = vec2(-d.y, d.x);',
  '  float h = max(cameraPosition.y - iL.y, 0.3), H = max(iL.w, 0.5), mir = D * H / (H + h), L = min(max(mir * 1.35, 2.5), min(D * 0.92, uLen));',   /* the streak runs to a little past the mirror point, never under the viewer */
  '  float along = position.y, w = mix(0.35, 1.1, along) * (0.6 + 0.4 * clamp(H / 7.0, 0.3, 1.5));',
  '  vec2 p = foot + d * (along * L) + r * (position.x * w); vQ = vec2(position.x, along); vMir = clamp(mir / max(L, 0.01), 0.0, 1.0); vFar = D;',
  '  gl_Position = projectionMatrix * viewMatrix * vec4(p.x, iL.y + 0.045, p.y, 1.0); }'
].join('\n');
var FRAG = [
  'uniform float uK; uniform float uBreak; varying vec2 vQ; varying vec3 vC; varying float vMir; varying float vFar;',
  'float wrH(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }',
  'void main() { float across = exp(-vQ.x * vQ.x * 10.0), a = vQ.y;',
  '  float body = exp(-pow((a - vMir) / 0.28, 2.0)) * 0.85 + exp(-a * 6.0) * 0.55;',   /* bright round the mirror point, a glow at the lamp foot */
  '  float fade = smoothstep(0.0, 0.04, a) * (1.0 - smoothstep(0.82, 1.0, a));',
  '  float brk = mix(1.0, 0.7 + 0.3 * wrH(floor(vec2(vQ.x * 3.0, a * 22.0))), uBreak);',   /* honed stone: the streak breaks into short bands */
  '  float far = 1.0 - smoothstep(90.0, 170.0, vFar);',
  '  vec3 col = mix(vC, vec3(1.0), 0.35 * across) * across * body * fade * brk * far * uK;',
  '  if (max(max(col.r, col.g), col.b) < 0.002) discard; gl_FragColor = vec4(col, 1.0); }'
].join('\n');

/* lamps: [{ x, y (floor), z, h (head height above the floor), color (hex) }]; opts: tier, night, k (night strength). */
export function createReflectionStreaks(THREE, lamps, opts) {
  opts = opts || {}; var n = lamps.length; if (!n) return null;
  var base = new THREE.PlaneGeometry(1, 1, 1, 8); base.translate(0, 0.5, 0);   /* x −0.5..0.5 across, y 0..1 along */
  var g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.instanceCount = n;
  var L4 = new Float32Array(n * 4), C3 = new Float32Array(n * 3), c = new THREE.Color();
  lamps.forEach(function (l, i) { L4[i * 4] = l.x; L4[i * 4 + 1] = l.y || 0; L4[i * 4 + 2] = l.z; L4[i * 4 + 3] = l.h || 6; c.set(l.color === undefined ? 0xdfe8ff : l.color); C3[i * 3] = c.r; C3[i * 3 + 1] = c.g; C3[i * 3 + 2] = c.b; });
  g.setAttribute('iL', new THREE.InstancedBufferAttribute(L4, 4)); g.setAttribute('iC', new THREE.InstancedBufferAttribute(C3, 3));
  var LOW = opts.tier === 'LOW', K = opts.k === undefined ? 0.55 : opts.k;
  var uniforms = { uK: { value: opts.night ? K : 0 }, uLen: { value: LOW ? 14 : 24 }, uBreak: { value: LOW ? 0 : 1 } };
  var mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, toneMapped: false });
  var mesh = new THREE.Mesh(g, mat); mesh.name = opts.name || 'WET_REFLECTION_STREAKS'; mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.userData.noMerge = true; mesh.userData.nonInteractable = true; mesh.visible = !!opts.night;
  base.dispose();
  return { mesh: mesh, count: n, setNight: function (nt) { uniforms.uK.value = nt ? K : 0; mesh.visible = !!nt; }, dispose: function () { g.dispose(); mat.dispose(); } };
}
