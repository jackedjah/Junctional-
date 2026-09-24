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
       the water stay as they are. Presentation only; no per-frame allocation. */
export function createAtmosphere(ctx) {
  var THREE = ctx.THREE, log = ctx.log || function () { }; var scene = ctx.scene; var reg = ctx.registry || {}; var A = (reg.sky && reg.sky.atmosphere) || {};
  var night = !!ctx.night, mat = null, prev = null, dome = null, clock = 0, own = [];
  var DAY = { zenith: '#2159b4', horizon: '#a4c3e3', haze: '#cfdde9', sunTint: '#fff0c8', ground: '#5a6470', mie: 1.0, fog: '#9cb8d4', fog_near_m: 120 };
  var NIGHT = { zenith: '#040915', horizon: '#1c3352', haze: '#2a4363', sunTint: '#9fb4d8', ground: '#0d1420', mie: 0.15, fog: '#0b1424', fog_near_m: 80 };
  function P(k) { var src = night ? (A.night || {}) : (A.day || {}); var base = night ? NIGHT : DAY; return src[k] !== undefined ? src[k] : base[k]; }
  function col(hex) { return new THREE.Color(hex); }
  function tier() { var t = null; try { t = ctx.quality && ctx.quality.tier ? ctx.quality.tier() : null; } catch (e) { t = null; } return t ? String(t).toUpperCase() : 'HIGH'; }
  function sunDir() { var v = new THREE.Vector3(26, 34, 14); var cel = reg.celestial && reg.celestial.sun && (reg.celestial.sun.direction || reg.celestial.sun.dir); if (cel && cel.length === 3) v.set(cel[0], cel[1], cel[2]); if (night) { var m = reg.celestial && reg.celestial.moon && reg.celestial.moon.dir; if (m && m.length === 3) v.set(m[0], m[1], m[2]); else v.set(-Math.sin(0.35), 0.085, -Math.cos(0.35)); } return v.normalize(); }
  function build() {
    var skyG = scene.getObjectByName('MAHWORLD_SKY'); dome = skyG ? (skyG.getObjectByName('MAHWORLD_SKY_DOME') || null) : null;
    if (!dome) { skyG && skyG.traverse(function (o) { if (!dome && o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && o.material && o.material.side === THREE.BackSide) dome = o; }); }
    if (!dome) { log('atmosphere: sky dome not found — the gradient dome stays'); return; }
    var low = tier() === 'LOW';
    mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false, transparent: false,
      uniforms: { uSun: { value: sunDir() }, uZenith: { value: col(P('zenith')) }, uHorizon: { value: col(P('horizon')) }, uHaze: { value: col(P('haze')) }, uSunTint: { value: col(P('sunTint')) }, uGround: { value: col(P('ground')) }, uMie: { value: low ? 0 : P('mie') }, uT: { value: 0 }, uWind: { value: 0 } },
      vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'precision mediump float; varying vec3 vDir; uniform vec3 uSun, uZenith, uHorizon, uHaze, uSunTint, uGround; uniform float uMie, uT, uWind;',
        'void main() {',
        '  vec3 d = normalize(vDir); float h = clamp(d.y, -1.0, 1.0); float mu = dot(d, uSun);',
        '  float od = 1.0 / (max(h, 0.0) * 4.0 + 0.22);',                                  /* optical depth of the view ray: ~4.5 at the horizon, ~0.24 at the zenith */
        '  vec3 sky = mix(uZenith, uHorizon, clamp(1.0 - exp(-od * 0.55), 0.0, 1.0));',      /* Rayleigh-style: the thicker the ray, the paler the blue */
        '  float breathe = 1.0 + 0.04 * sin(uT * 0.05 + uWind);',
        '  float hazeK = exp(-max(h, 0.0) * 13.0) * breathe;',                                /* the horizon haze band (distance scattering) */
        '  vec3 haze = mix(uHaze, uSunTint, 0.55 * pow(max(mu, 0.0), 4.0));',                /* warmer toward the sun */
        '  vec3 c = mix(sky, haze, clamp(hazeK * 0.62, 0.0, 1.0));',
        '  float g = 0.82; float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);', /* Henyey-Greenstein forward lobe = the glare around the sun */
        '  c += uSunTint * hg * 0.012 * uMie;',
        '  c += uSunTint * pow(max(mu, 0.0), 10.0) * 0.1 * max(uMie, 0.25);',                 /* the wide soft halo */
        '  c = mix(c, c * vec3(0.95, 0.975, 1.07), smoothstep(0.35, 0.95, h));',              /* MAHWORLD: a cool violet-cyan cast at the zenith, never a photoreal Earth sky */
        '  if (h < 0.0) c = mix(c, uGround, clamp(-h * 3.0, 0.0, 1.0));',                     /* ground haze → graphite below the horizon */
        '  gl_FragColor = vec4(c, 1.0);',
        '  #include <colorspace_fragment>',   /* the uniforms are linear (THREE.Color) → the renderer output space, like every built-in material */
        '}'].join('\n') });
    prev = dome.material; dome.material = mat; own.push(mat);
    if (scene.fog) { scene.fog.color.set(P('fog')); if (scene.fog.isFog && P('fog_near_m')) scene.fog.near = P('fog_near_m'); }   /* the near forms keep their contrast; the falloff runs to the same far as before */ if (scene.background && scene.background.isColor) scene.background.set(P('horizon'));
    log('atmosphere: scattering dome on (' + tier() + (low ? ', Mie off' : '') + '), fog → ' + P('fog') + ', sun ' + sunDir().toArray().map(function (v) { return v.toFixed(2); }).join(','));
  }
  function tick(dt, t) { clock = (typeof t === 'number' && isFinite(t)) ? t : clock + (dt || 0); if (!mat) return; mat.uniforms.uT.value = clock; var w = ctx.wind; mat.uniforms.uWind.value = w && typeof w.t === 'number' ? w.t * 0.1 : 0; }
  function setNight(n) { night = !!n; if (!mat) return; mat.uniforms.uZenith.value.set(P('zenith')); mat.uniforms.uHorizon.value.set(P('horizon')); mat.uniforms.uHaze.value.set(P('haze')); mat.uniforms.uSunTint.value.set(P('sunTint')); mat.uniforms.uGround.value.set(P('ground')); mat.uniforms.uMie.value = tier() === 'LOW' ? 0 : P('mie'); mat.uniforms.uSun.value.copy(sunDir()); if (scene.fog) scene.fog.color.set(P('fog')); }
  function dispose() { if (dome && prev) { dome.material = prev; } own.forEach(function (m) { m.dispose(); }); own = []; mat = null; }
  function debug() { return { on: !!mat, tier: tier(), night: night, fog: scene.fog ? '#' + scene.fog.color.getHexString() : null, mie: mat ? mat.uniforms.uMie.value : null, sun: sunDir().toArray().map(function (v) { return +v.toFixed(3); }) }; }
  return { build: build, tick: tick, setNight: setNight, dispose: dispose, debug: debug };
}
