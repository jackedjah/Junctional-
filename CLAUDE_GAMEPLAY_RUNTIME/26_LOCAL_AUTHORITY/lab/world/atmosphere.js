/* MAHWORLD JOB B :: ATMOSPHERE (owner B7 §8 / §10 F, 2026-09-20) — a phone-safe PHYSICALLY-INSPIRED sky in place of the flat 3-stop gradient:
     · the sky dome (fieldScene MAHWORLD_SKY_DOME, which rides with the viewer) gets ONE analytic scattering shader: a Rayleigh-style
       zenith → horizon mix driven by the optical depth of the view ray (1 / (h + ε)), a horizon HAZE band (distance scattering) that
       warms toward the sun, a Mie forward lobe (Henyey-Greenstein) = the sun's glare + a wide halo with a believable tint, a graphite
       ground haze below the horizon and a faint MAHWORLD cool-violet zenith cast — about a dozen ALU ops per sky pixel, no textures;
     · the scene FOG takes the shader's horizon haze colour (one truth for the sky and the distance falloff), cooler and a touch darker than
       before so far silhouettes step back in blue-grey instead of bleaching to white (§10 F depth hierarchy);
     · a slow TIME / WIND parameter (registry.sky.wind, ctx.wind from sky.js) breathes the haze and the sun tint very slightly; the cloud
       sheets of sky.js get a sun-side lighting response through their instance colours;
     · tiers: HIGH = full lobe + halo, MED = same shader, LOW = the Mie lobe off (the cheapest path). The huge sun / moon (celestial.js) and
       the water stay as they are. Presentation only; no per-frame allocation.
   World pivot PASS 1 (owner sky direction 2026-09-25): bright fantasy daylight — a luminous horizon (haze_k), a wide warm glow toward the
   Sun, and a lavender band hugging the ANTI-solar horizon (lavender / lavender_k) that ties the sky to the lavender Moon.
   M20 SKY / ATMOSPHERE (owner 2026-09-27: "Daytime must not feel generic. The daytime sky should feel curated and atmospheric: gray-violet,
   silver-lavender, calm-before-storm, moody but beautiful, soft but premium, magical but believable. It should not default to: empty white,
   plain blue, cheap bright skybox feeling." Night law: "no universal blue / purple wash"):
     · PALETTE (registry sky.atmosphere, defaults below): the day sky is a LOW-SATURATION storm light — a slate grey-violet zenith over a
       silver-lavender horizon and a pearl haze (every stop below the colour law's 0.28 neutral saturation: it reads silver / pearl-violet,
       never a purple wash — purple stays VISIONARY's), a pearl (not gold) glow round a softer Sun; the night is a deep BLUE night (navy
       zenith, blue-grey horizon, a silver-blue moon glow) — the lavender Moon body is the one violet accent left in it;
     · ALTOSTRATUS VEIL: the empty gradient gets a high overcast sheet IN the dome — two reads of one small tileable noise texture projected
       on a plane (streaks along the registry wind, compressed toward the horizon, faded out below ~10°), a little darker than the sky
       where thick and silvered toward the key: the calm-before-storm layering at the cost of two texture fetches per sky pixel (HIGH / MED;
       LOW compiles it out). No geometry, no draw call;
     · ZENITH CAST: the fixed cool cast is scaled per time of day (cast_k), so a grey-violet day zenith does not saturate toward violet;
     · FOG FOLLOWS THE SKY: worldB hands this module the field GROUP as ctx.scene, so the fog / background writes never reached the real
       scene (the effective day fog stayed fieldScene's sky-blue #b9cddd). They now go to the root scene on build AND on every time switch
       (fog colour and near, consistent), so the distance falloff takes the dome's own haze tone: one truth for sky and aerial perspective. */
export function createAtmosphere(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var scene = ctx.scene; var reg = ctx.registry || {}; var A = (reg.sky && reg.sky.atmosphere) || {};
  var night = !!ctx.night, mat = null, prev = null, dome = null, clock = 0, own = [];
  var DAY = { zenith: '#63678b', horizon: '#c8c6d8', haze: '#e0dfe9', sunTint: '#f0ede8', ground: '#4d4e5a', mie: 0.85, fog: '#bdbccd', fog_near_m: 75, lavender: '#bab2cc', lavender_k: 0.35, haze_k: 0.8, veil_k: 0.55, veil_scale: 1, cast_k: 0.3 };
  var NIGHT = { zenith: '#04070f', horizon: '#15213a', haze: '#1d2a45', sunTint: '#aab8d2', ground: '#090c14', mie: 0.55, fog: '#0d1522', fog_near_m: 80, lavender: '#2f3a58', lavender_k: 0.2, haze_k: 0.6, veil_k: 0.25, veil_scale: 1, cast_k: 0.6 };
  function P(k) { var src = night ? (A.night || {}) : (A.day || {}); var base = night ? NIGHT : DAY; return src[k] !== undefined ? src[k] : base[k]; }
  function col(hex) { return new THREE.Color(hex); }
  function tier() { var t = null; try { t = ctx.quality && ctx.quality.tier ? ctx.quality.tier() : null; } catch (e) { t = null; } return t ? String(t).toUpperCase() : 'HIGH'; }
  function sunDir() { var v = new THREE.Vector3(26, 34, 14); var cel = reg.celestial && reg.celestial.sun && (reg.celestial.sun.direction || reg.celestial.sun.dir); if (cel && cel.length === 3) v.set(cel[0], cel[1], cel[2]); if (night) { var m = reg.celestial && reg.celestial.moon && reg.celestial.moon.dir; if (m && m.length === 3) v.set(m[0], m[1], m[2]); else v.set(-Math.sin(0.35), 0.085, -Math.cos(0.35)); } return v.normalize(); }
  function rootScene() { var r = scene; while (r && r.parent) r = r.parent; return r || scene; }   /* M20: ctx.scene is the field group — fog and background live on the scene above it (left alone while the field is hidden behind a hall interior) */
  function applyFog() { if (ctx.scene && ctx.scene.visible === false) return; var scene = rootScene(); if (!scene) return; if (scene.fog) { scene.fog.color.set(P('fog')); if (scene.fog.isFog && P('fog_near_m')) scene.fog.near = P('fog_near_m'); } if (scene.background && scene.background.isColor) scene.background.set(P('horizon')); }
  function windDir() { var W = reg.sky && reg.sky.wind, a = (W && isFinite(+W.dir_deg) ? +W.dir_deg : 28) * Math.PI / 180; return new THREE.Vector2(Math.sin(a), Math.cos(a)); }
  /* M20: the veil's noise — one tileable 128 × 128 value-noise fBm (R: broad masses, G: finer streaks), mip-mapped, built once per dome */
  function veilTexture() { var N = 128, px = new Uint8Array(N * N * 4), s = 0x51a7; function h(x, y, k) { var q = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(k | 0, 2246822519); q = Math.imul(q ^ (q >>> 13), 1274126177); return ((q ^ (q >>> 16)) >>> 0) / 4294967296; }
    function vn(u, v, P, k) { var x = u * P, y = v * P, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); var a = h(ix % P, iy % P, k), b = h((ix + 1) % P, iy % P, k), c = h(ix % P, (iy + 1) % P, k), d = h((ix + 1) % P, (iy + 1) % P, k); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
    function fbm(u, v, P0, oct, k) { var t = 0, n = 0, am = 0.5; for (var o = 0; o < oct; o++) { t += am * vn(u, v, P0 << o, k + o * 7); n += am; am *= 0.5; } return t / n; }
    var R = new Float32Array(N * N), G = new Float32Array(N * N); for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var u = x / N, v = y / N, i = y * N + x; R[i] = fbm(u, v, 4, 4, s); G[i] = fbm(u, v, 8, 3, s + 91); }
    [R, G].forEach(function (C, ch) { var lo = 1, hi = 0; for (var i = 0; i < C.length; i++) { lo = Math.min(lo, C[i]); hi = Math.max(hi, C[i]); } for (i = 0; i < C.length; i++) px[i * 4 + ch] = Math.round(255 * (C[i] - lo) / Math.max(1e-6, hi - lo)); });
    for (var j = 0; j < N * N; j++) { px[j * 4 + 2] = 0; px[j * 4 + 3] = 255; }
    var t = new THREE.DataTexture(px, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; own.push(t); return t; }
  function build() {
    var skyG = scene.getObjectByName('MAHWORLD_SKY'); dome = skyG ? (skyG.getObjectByName('MAHWORLD_SKY_DOME') || null) : null;
    if (!dome) { skyG && skyG.traverse(function (o) { if (!dome && o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && o.material && o.material.side === THREE.BackSide) dome = o; }); }
    if (!dome) { log('atmosphere: sky dome not found — the gradient dome stays'); return; }
    var low = tier() === 'LOW';
    mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false, transparent: false, defines: { VEIL: low ? 0 : 1 },
      uniforms: { uSun: { value: sunDir() }, uZenith: { value: col(P('zenith')) }, uHorizon: { value: col(P('horizon')) }, uHaze: { value: col(P('haze')) }, uSunTint: { value: col(P('sunTint')) }, uGround: { value: col(P('ground')) }, uMie: { value: low ? 0 : P('mie') }, uT: { value: 0 }, uWind: { value: 0 }, uLav: { value: col(P('lavender')) }, uLavK: { value: P('lavender_k') }, uHazeK: { value: P('haze_k') },
        uVeilK: { value: low ? 0 : P('veil_k') }, uVeilS: { value: P('veil_scale') }, uVeilW: { value: windDir() }, uVeilO: { value: new THREE.Vector2() }, uVeilTex: { value: low ? null : veilTexture() }, uCastK: { value: P('cast_k') } },   /* M20 */
      vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'precision mediump float; varying vec3 vDir; uniform vec3 uSun, uZenith, uHorizon, uHaze, uSunTint, uGround, uLav; uniform float uMie, uT, uWind, uLavK, uHazeK, uVeilK, uVeilS, uCastK; uniform vec2 uVeilW, uVeilO;',
        '#if VEIL',
        'uniform sampler2D uVeilTex;',
        '#endif',
        'void main() {',
        '  vec3 d = normalize(vDir); float h = clamp(d.y, -1.0, 1.0); float hp = max(h, 0.0); float mu = dot(d, uSun);',
        /* M8B SKY REALISM: a long zenith → horizon falloff (deep blue high, milky toward the horizon over ~30°) instead of one flat band */
        '  float od = 1.0 / (hp * 4.0 + 0.22);',                                               /* optical depth of the view ray: ~4.5 at the horizon, ~0.24 at the zenith */
        '  float t = clamp(0.62 * pow(1.0 - hp, 2.2) + 0.38 * (1.0 - exp(-od * 0.55)), 0.0, 1.0);',
        '  vec3 sky = mix(uZenith, uHorizon, t);',
        '  sky *= mix(0.9, 1.1, (0.5 + 0.5 * mu) * (0.35 + 0.65 * t));',                        /* multiple scattering: brighter and paler on the Sun side, deeper blue opposite */
        '  float breathe = 1.0 + 0.04 * sin(uT * 0.05 + uWind);',
        '  float hazeK = (exp(-hp * 16.0) + 0.38 * exp(-hp * 3.6)) * breathe;',                 /* a tight bright horizon line + a wide soft haze skirt */
        '  vec3 haze = mix(uHaze, uSunTint, 0.55 * pow(max(mu, 0.0), 4.0));',                   /* warmer toward the sun */
        '  vec3 c = mix(sky, haze, clamp(hazeK * uHazeK, 0.0, 1.0));',
        '  float anti = pow(max(-mu, 0.0), 1.4) * exp(-hp * 7.0);',                              /* lavender band on the anti-solar horizon (ties the sky to the Moon) */
        '  c = mix(c, uLav, clamp(anti * uLavK, 0.0, 1.0));',
        '  c += uSunTint * pow(max(mu, 0.0), 3.0) * exp(-hp * 3.0) * 0.16 * uMie;',               /* the wide warm glow that fills the sky around the key body */
        '  float g = 0.82; float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);',   /* Henyey-Greenstein forward lobe = the glare around the sun / moon */
        '  c += uSunTint * hg * 0.012 * uMie;',
        '  c += uSunTint * (pow(max(mu, 0.0), 10.0) * 0.1 * max(uMie, 0.25) + pow(max(mu, 0.0), 56.0) * 0.28 * uMie);',   /* the soft halo + a tight aureole */
        '#if VEIL',
        /* M20 ALTOSTRATUS VEIL: a high overcast sheet on a plane above the world (the dome rides with the viewer, so it is infinitely far):
           streaks along the wind, compressed toward the horizon and faded out below ~10° before they alias; a little darker than the sky
           where thick (the storm-light layering), silvered on the key's side */
        '  { vec2 q = d.xz / (hp + 0.16); q = vec2(dot(q, uVeilW), dot(q, vec2(-uVeilW.y, uVeilW.x))) * vec2(0.11, 0.2) * uVeilS + uVeilO;',   /* uVeilO: the drift, wrapped on the CPU (a mediump clock would quantise it after an hour) */
        '    float n = texture2D(uVeilTex, q).r * 0.66 + texture2D(uVeilTex, q * vec2(2.0, 3.0) + vec2(0.37, 0.61)).g * 0.34;',   /* M20 review: integer octave scales, so the CPU-wrapped drift never jumps the fine octave (it popped every ~42 min); the streaks are less anisotropic and thin toward the zenith (they converged into vertical bands overhead) */
        '    float hz = smoothstep(0.03, 0.18, hp), cov = smoothstep(0.36, 0.74, n) * hz * (1.0 - 0.55 * smoothstep(0.45, 0.95, hp)), gap = (1.0 - smoothstep(0.16, 0.4, n)) * hz, sunK = pow(max(mu, 0.0), 3.0);',
        '    vec3 vc = mix(uHorizon, uZenith, 0.38 + 0.3 * smoothstep(0.55, 0.9, n)) * (0.9 + 0.26 * sunK) + uSunTint * sunK * 0.12;',
        '    c = mix(c, vc, cov * uVeilK); c = mix(c, uHaze, gap * uVeilK * 0.24); }',   /* thick streaks a shade darker, the thin breaks a shade silverier: light moving through the layer */
        '#endif',
        '  c = mix(c, c * vec3(0.95, 0.975, 1.07), smoothstep(0.35, 0.95, h) * uCastK);',     /* MAHWORLD: a cool cast at the zenith, never a photoreal Earth sky (M20: scaled per time of day) */
        '  if (h < 0.0) c = mix(c, uGround, clamp(-h * 3.0, 0.0, 1.0));',                      /* ground haze → graphite below the horizon */
        '  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * (1.5 / 255.0);',   /* dither: no 8-bit banding across the long gradient */
        '  gl_FragColor = vec4(c, 1.0);',
        '  #include <colorspace_fragment>',   /* the uniforms are linear (THREE.Color) → the renderer output space, like every built-in material */
        '}'].join('\n') });
    prev = dome.material; dome.material = mat; own.push(mat);
    var sk = ctx.mods && ctx.mods.sky; if (sk && sk.shareSky) sk.shareSky(mat.uniforms);   /* M19 horizon merging (owner 2026-09-27): the cloud bodies fade into THIS dome's own colour along each view ray — one truth for the sky and the aerial perspective of the clouds */
    applyFog();   /* M20: the ROOT scene's fog / background (the near forms keep their contrast; the falloff runs to the same far as before) */
    log('atmosphere: scattering dome on (' + tier() + (low ? ', Mie + veil off' : '') + '), fog → ' + P('fog') + ', sun ' + sunDir().toArray().map(function (v) { return v.toFixed(2); }).join(','));
  }
  function tick(dt, t) { clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); if (!mat) return; mat.uniforms.uT.value = clock; var w = ctx.wind; mat.uniforms.uWind.value = w && typeof w.t === 'number' ? w.t * 0.1 : 0; var vo = clock * 0.0004; mat.uniforms.uVeilO.value.set(vo - Math.floor(vo), 0); }   /* M20: the veil drifts downwind, a few tenths of a degree a second overhead */
  function setNight(n) { night = !!n; if (!mat) return; mat.uniforms.uZenith.value.set(P('zenith')); mat.uniforms.uHorizon.value.set(P('horizon')); mat.uniforms.uHaze.value.set(P('haze')); mat.uniforms.uSunTint.value.set(P('sunTint')); mat.uniforms.uGround.value.set(P('ground')); mat.uniforms.uMie.value = tier() === 'LOW' ? 0 : P('mie'); mat.uniforms.uSun.value.copy(sunDir()); mat.uniforms.uLav.value.set(P('lavender')); mat.uniforms.uLavK.value = P('lavender_k'); mat.uniforms.uHazeK.value = P('haze_k'); mat.uniforms.uVeilK.value = tier() === 'LOW' ? 0 : P('veil_k'); mat.uniforms.uVeilS.value = P('veil_scale'); mat.uniforms.uCastK.value = P('cast_k'); applyFog(); }   /* M20: fog colour + near follow the time of day on the real scene (fieldScene rebuilds its Fog on every switch; this runs after it) */
  function dispose() { var sk = ctx.mods && ctx.mods.sky; if (mat && sk && sk.shareSky) sk.shareSky(null); if (dome && prev) { dome.material = prev; } own.forEach(function (m) { m.dispose(); }); own = []; mat = null; }
  function debug() { var rs = rootScene(); return { on: !!mat, tier: tier(), night: night, fog: rs && rs.fog ? '#' + rs.fog.color.getHexString() : null, fog_near_m: rs && rs.fog ? rs.fog.near : null, mie: mat ? mat.uniforms.uMie.value : null, veil: mat ? +mat.uniforms.uVeilK.value.toFixed(2) : null, sun: sunDir().toArray().map(function (v) { return +v.toFixed(3); }) }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug, uniforms: function () { return mat ? mat.uniforms : null; } };   /* M20: the water reflects THIS dome (water.js skyWater) — shared by reference, so day / night follow */
}
