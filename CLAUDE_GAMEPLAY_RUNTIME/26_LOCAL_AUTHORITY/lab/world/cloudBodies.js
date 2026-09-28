/* MAHWORLD WORLD PIVOT · PASS 1 :: CLOUD BODIES (owner sky direction 2026-09-25: bright fantasy daylight, long layered billowing clouds,
   warm/light upper exposure, cooler underside, luminous edges toward the Sun, strong depth layering — never blobs, circles or flat sheets).
   Each registry cloud is a CLUSTER of camera-facing puffs: a flattened base row gives the cloud a calm shelf, a taller crown row gives the
   billowing top. One instanced draw per layer; the puffs are lit in the shader, not by scene lights.
   M8D CLOUD REALISM (owner 2026-09-26: the clouds read as cotton balls — same-size round crisp puffs just above the rooftops):
     · SHAPES: one procedural atlas of four noise-eroded puff shapes (cauliflower cumulus · soft billow · flat base · wisp) replaces the
       single radial-lobe puff, so silhouettes break up and edges go soft where real clouds are thin;
     · LIGHT: the whole BODY is lit from the key's side (a per-cloud centre, not per puff), each puff self-shadows by marching its own
       density toward the light (two taps on HIGH, one on MED, none on LOW), bases are flat and darker, thin edges scatter a silver lining
       that strengthens when the camera looks toward the light;
     · DEPTH: aerial perspective by distance and a horizon fade by view elevation (distant bases dissolve into the horizon haze);
     · SCALE: skewed size distributions (many small, few large) and a camera-relative ring of TOWERING cumulus behind the far massifs
       (towerCluster) that keeps clear of the Sun and Moon sectors.
   Puffs are re-sorted back-to-front a few times per second (instances are drawn in buffer order), so nearer bodies always cover farther ones.
   Tiers scale the puff count (HIGH 1 · MED 0.7 · LOW 0.45). Presentation only; the shared optics in sky.js are unchanged.
   M14 CLOUD REFINEMENT (owner 2026-09-27: more oblong, more diffuse, fainter in the background, aura-rich — stretched drifting masses, not
   cotton balls or bubble clusters): every puff is STRETCHED along the horizon in the shader (uOblong; base puffs most), its in-plane tilt is
   calmed so the stretched lobes lie along the wind, the silhouette rim fades gradually instead of cutting (uDiffuse), distant bodies thin out
   harder into the haze, and the thin edges carry a faint pearl AURA (violet / pink toward the anti-light side, pale gold toward the key —
   class-family hues only, uAuraK). Layout, positions and the shared sky stream are untouched: only the drawing changes.
   M19 ATMOSPHERE, NOT OBJECTS (owner 2026-09-27, still not accepted: lobed cotton objects — longer, more oblong, more continuous, fewer
   circular lobes, more scale variation, softer distance extinction, irregular erosion, a deeper but subtler underside, weaker far contrast,
   faint aura, better horizon merging; the best cloud sometimes reads as atmosphere rather than object). Second pass after review: camera-
   facing cards of any kind still drew OBJECTS — from below every card (or card-sized footprint) read as a smooth egg, capsule or lens, and
   the towering ring stayed a translucent stack of lobes. So a body is no longer drawn with cards at all:
     · ONE VOLUME PER BODY: each body is ONE box proxy (one instance, 12 triangles; faces turned away from the viewer are collapsed in the
       vertex stage) whose fragments march the view ray through a HEIGHTFIELD cloud — a flat base shared by the layer and a top set by a
       body-anchored noise field, thresholded inside a soft, noise-eaten rounded-rectangle footprint. Thickness, gaps, cells, rolls and
       broken ends all come from that one field: a deck from below is a mottled sheet with sky in its gaps, from the side a long band with
       an uneven top, and toward the horizon its cells and rolls compress into bands in true perspective. No card outline exists to be seen;
     · FORMS: SHEET (stratocumulus deck: wide, thin, flat-topped cells), STREET (rolls along the body axis with clear lanes between), HEAP
       (low domed cumulus cells), TOWER (the far congestus ring: one broad mass split into sub-towers with rounded turrets — no stacked
       lobes — that fades into the haze sooner, a presence behind the banks);
     · LIGHT: Beer-Lambert extinction along the ray; the key reaches each sample through the shorter of its depth below the local top or
       its way in from the sunward flank (lit crowns and sunward sides, deep but soft bases under thick cells, lighter thin cells), sky
       ambient rising with height, a silver lining where the body is thin; on HIGH / MED the crown's slope adds lit / shaded relief;
     · DEPTH: every fragment writes the depth where the body actually is along its ray, so a mountain or the highland standing inside a
       body's box hides the cloud behind it (the box face alone drew it over the peak); aerial extinction by that distance toward the
       dome's own colour (sky.shareSky), contrast first; the horizon fade acts only near the horizon LINE, and a body looked DOWN upon (the
       HALO rim, the highland) thins to a veil of mist, so the districts below stay readable;
     · AURA (colour law): a faint pearl sheen on thin parts that only ever eases ONE class hue out of an equal-channel neutral — gold toward
       the key, pale blue away from it, pink only on lit near-white parts — never an RGB midpoint between two class hues;
     · COST: one shaded fragment per covered pixel per body (no stacked cards: far fewer rasterised and blended cloud fragments) × about
       two march steps per field cell along the ray (HIGH 5–20, MED 4–10; each one mip-filtered texture fetch) + two relief reads; LOW
       takes ONE sample (the body as a thickness map), no relief, no aura noise, the sky colour per vertex, and half the bodies (sky.js).
       The wind streaks on the tower flanks are the only atlas cards left. */

/* M20 WEATHER, NOT FOG (owner 2026-09-27: "continuous elongated masses, soft edges, extinction, underside, horizon integration; phone-safe";
   open items: the aerials over the highland — F4, V12, HA — read through a strong white sheet that hides the district and the massifs, and
   gl_FragDepth is untested on phones). Measured first (layers toggled one by one): the sheet is the MID layer (177–225 m) met nearly level
   from the 200–247 m aerial cameras plus the horizon ring (tops at 236 m) — not the stratus. So:
     · BREAK FROM ABOVE: a body looked down upon — steeply, or at all from at / above its top — raises its field threshold (uBreak 0.75), so its
       cells shrink into broken fragments with the ground readable between them; the uniform milky thinning drops to a residual (uVeilDown);
     · the stratus deck (115–171 m) never stood inside the district in the frames measured (clocks 40 and 1395, when one body drifts across
       the plateau edge): from the plateau (146–175 m) the break from above already opens it — a clear-zone variant showed no difference
       and was dropped (no unproven per-step cost);
     · PHONE-SAFE DEPTH: gl_FragDepth (the exact depth of the body along its ray) stays on HIGH only; MED / LOW (the phone tiers) compile
       CLOUD_DEPTH 0 — no fragment depth, so the early depth test stays on — and rasterise each box by its FAR faces: terrain or a peak
       inside a box hides the cloud there (so a cloud never paints over a ridge it sits behind; the price: a body straddling a ridge is also
       cut where it passes in front of it — the error reads as "behind the mountain", the natural one), and a far face past the far plane is
       pulled in along its own view ray;
     · the per-pixel march offset keeps a fifth of its spread (a thin deck met at a grazing angle read as a diagonal dotted screen); the replica
       follows the dome's per-time zenith cast (uSkyCast). */

/* M20 SKY ROUND 2 (owner 2026-09-28: "choppy … not materially resolved"; the wave-6 review: by day the masses read as translucent grey smoke
   drawn with bright OUTLINES, a sawtooth dither on every rim, and the whirl crossing the Sun had no belly). Measured first: a body's alpha rose
   from 0 to ~0.9 within two or three pixels (a steep sqrt cell wall met by half-cell march steps; the IGN start offset turned the step error
   into a zig-zag); a deck's cells are ~10 m thick, so at 0.06 /m the key reached through almost all of them and crowns and bellies were lit
   alike; the day aerial perspective pulled every body within ~600 m a third of the way to one flat body tone; and the wave-6 silver-lining lobe
   never reached the shader (sky.js did not pass rimPow / rimFwd, so it ran at pow 5 × 1.5 on every thin cell gap near the Sun — the bright
   loops in V27 / V04). So:
     · SOFT CELL WALLS: the density ramps in from a cell's edge (softX, in field units) and fades over the top of each column (softY, a share of
       the column), so a rim is a gradient a few pixels wide and a mis-stepped sample changes little — no sawtooth, no drawn outline; the field
       is read a little blurrier (lodB, a mip bias) so the Voronoi cell creases soften into folds instead of lines;
     · WEIGHT: the key has its own extinction (sigL): crowns stay lit while the lower part of every cell and the belly fall into shade; the soft
       belly also reaches under thin cells (belly); the silver lining keeps only its forward lobe (rimBase: no floor over every thin part);
     · the far tower ring's wind-streak cards can be dropped (sky.js does): ~30 px tall at 1.1 km, their eroded edges aliased into a dotted band.
   Night keeps its look (every new key defaults to the old behaviour; only the soft cell walls are shared). No draw call, texture or tier path
   added; LOW keeps its single sample with its old integrated share, key extinction and no mip bias (measured: from one sample the soft wall
   drew a smooth capsule with a bright rim) — it takes only the new day colour / aerial / rim keys. */

/* M19 SKY REPLICA: the dome's own scattering (atmosphere.js, the same uniforms shared by reference through sky.shareSky), evaluated along the
   view ray — aerial perspective pulls a distant cloud toward the sky behind it, so far bodies dissolve into the horizon haze instead of
   standing in front of it. Includes the dome's Henyey-Greenstein glare, halo and aureole (a cloud near the Sun fades into the glare, not into
   a darker sky). Below the horizon the airlight is the horizon haze (what the scene fog paints over the terrain), not the dome's graphite
   ground colour, which is never seen. Per fragment on HIGH / MED, per vertex on LOW. */
var SKY_FN = [
  'uniform vec3 uSkyZ, uSkyH, uSkyHz, uSkyT, uSkyL, uSkyS; uniform float uSkyMie, uSkyLavK, uSkyHazeK, uSkyOn, uSkyCast, uSkySkirt, uSkySunHaze;',
  'vec3 skyAt(vec3 d) {',
  '  float hp = max(d.y, 0.0), mu = dot(d, normalize(uSkyS)), mp = max(mu, 0.0), od = 1.0 / (hp * 4.0 + 0.22);',
  '  float t = clamp(0.62 * pow(1.0 - hp, 2.2) + 0.38 * (1.0 - exp(-od * 0.55)), 0.0, 1.0); vec3 c = mix(uSkyZ, uSkyH, t) * mix(0.9, 1.1, (0.5 + 0.5 * mu) * (0.35 + 0.65 * t));',
  '  c = mix(c, mix(uSkyHz, uSkyT, uSkySunHaze * pow(mp, 4.0)), clamp((exp(-hp * 16.0) + uSkySkirt * exp(-hp * 3.6)) * uSkyHazeK, 0.0, 1.0));',   /* M20 wave 6: the dome's haze skirt width and Sun warming (shared uniforms) */
  '  c = mix(c, uSkyL, clamp(pow(max(-mu, 0.0), 1.4) * exp(-hp * 7.0) * uSkyLavK, 0.0, 1.0)) + uSkyT * pow(mp, 3.0) * exp(-hp * 3.0) * 0.16 * uSkyMie;',
  '  c += uSkyT * (0.0039312 / pow(1.6724 - 1.64 * mu, 1.5) * uSkyMie + pow(mp, 10.0) * 0.1 * max(uSkyMie, 0.25) + pow(mp, 56.0) * 0.28 * uSkyMie);',   /* the dome's HG glare (g 0.82) + soft halo + tight aureole */
  '  return mix(c, c * vec3(0.95, 0.975, 1.07), smoothstep(0.35, 0.95, d.y) * uSkyCast); }'].join('\n');   /* M20: the dome's zenith cast, scaled per time of day (atmosphere cast_k) */

var VERT = [
  'attribute vec4 aPuff;',              /* x: height inside the cloud 0..1 · y: atlas shape (integer part 0..3) + seed (fraction) · z: alpha · w: kind (0.5 wind-streak card · 3 the body VOLUME) */
  'attribute vec3 aCloud;',             /* x: the body's flat base (world y) · y: its height (m) · z: its FORM (0 sheet · 1 street · 2 heap · 3 tower) + its own seed (fraction) */
  'attribute vec4 aCentre;',            /* xyz: the cloud body's centre (world) · w: its radius (m) — the whole body is lit from the key's side */
  'attribute vec4 aBody;',              /* M19: xy the body's long axis (world xz) · z its half length · w its half depth (m) — the volume's footprint */
  'uniform vec3 uLightWorld; uniform float uOblong; uniform float uTime;',
  SKY_FN,
  'varying vec2 vUv; varying vec2 vCell; varying vec4 vPuff; varying float vDist; varying float vH; varying vec3 vRel; varying vec2 vLs; varying float vElev; varying float vFwd; varying float vFade;',
  'varying vec3 vView; varying vec3 vCtr; varying vec4 vBodyK; varying vec4 vSlab; varying float vKind;',
  '#if CLOUD_TAPS == 0',
  'varying vec3 vSky;',
  '#endif',
  'void main() {',
  '  float seed = fract(aPuff.y), shape = floor(aPuff.y + 0.001); bool flip = seed > 0.5;',
  '  vUv = vec2(flip ? 0.5 - position.x : position.x + 0.5, position.y + 0.5); vPuff = vec4(aPuff.x, seed, aPuff.z, aPuff.w);',
  '  vCell = vec2(mod(shape, 2.0) * 0.5, (1.0 - floor(shape * 0.5)) * 0.5);',   /* 2 × 2 atlas cell (canvas rows are flipped into uv) */
  '  vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, Lw = normalize(uLightWorld), world; float fade = 1.0, kind = step(2.5, aPuff.w), bH = max(aCloud.y, 1.0), bX = max(aBody.z, 1.0), bZ = max(aBody.w, 1.0);',
  '  vKind = kind; vCtr = aCentre.xyz; vBodyK = vec4(aBody.xy, bX, bZ); vSlab = vec4(aCloud.x, bH, fract(aCloud.z), floor(aCloud.z + 0.0005));',
  '  if (kind > 0.5) {',
  /* M19 the body VOLUME: a box around the heightfield. With the viewer outside, the faces turned away are collapsed (every covered pixel is
     shaded once, from the entry face); with the viewer inside (a stratus deck met on the highland), every face is kept and the march starts at the eye */
  '    world = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz; vec3 nW = mat3(modelMatrix * instanceMatrix) * normal, dc = cameraPosition - aCentre.xyz;',
  '    vec3 lc = vec3(dot(dc.xz, aBody.xy) / bX, (cameraPosition.y - aCloud.x) / bH * 2.0 - 1.0, dot(dc.xz, vec2(-aBody.y, aBody.x)) / bZ);',
  '#if CLOUD_DEPTH',
  '    if (max(abs(lc.x), max(abs(lc.y), abs(lc.z))) > 1.0 && dot(nW, cameraPosition - (modelMatrix * instanceMatrix * vec4(normal * 0.5, 1.0)).xyz) < 0.0) fade = 0.0;',   /* decided at the FACE centre, so all four corners of a face agree (a face seen edge-on never splits into a sliver) */
  '#else',
  /* M20 PHONE-SAFE PATH (MED / LOW: no gl_FragDepth, so the early depth test stays on): the box is rasterised by its FAR faces, whose
     depth is behind the whole body — terrain, a peak or the highland standing inside a box now HIDE the cloud there (the benign error:
     a cloud never paints over a mountain it sits behind). A far face beyond the 1400 m far plane is pulled in along its own view ray,
     which keeps its screen coverage exactly (only its depth changes) */
  '    if (max(abs(lc.x), max(abs(lc.y), abs(lc.z))) > 1.0 && dot(nW, cameraPosition - (modelMatrix * instanceMatrix * vec4(normal * 0.5, 1.0)).xyz) > 0.0) fade = 0.0;',
  '    { vec3 dv = world - cameraPosition; float L = length(dv); if (L > 1300.0) world = cameraPosition + dv * (1300.0 / L); }',
  '#endif',
  '    vRel = vec3(0.0); vLs = vec2(0.0); vH = 0.5;',
  '  } else {',
  /* a WIND STREAK card (the only cards left): camera-facing, upright near the horizon, drawn on the box's front face only */
  '    float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz); vec3 toCam = normalize(cameraPosition - centre); if (normal.z < 0.5) fade = 0.0;',
  '    sx *= 1.0 + uOblong * (0.62 + 0.45 * fract(seed * 5.31)); sy *= 1.0 - 0.1 * uOblong;',   /* M14: stretched along the horizon, each a little differently */
  '#if CLOUD_TAPS == 0',
  '    sx *= 0.84; sy *= 0.9;',   /* LOW: drawn a little smaller */
  '#endif',
  '    vec3 viewUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);',
  '    vec3 camUp = normalize(mix(vec3(0.0, 1.0, 0.0), viewUp, smoothstep(0.35, 0.85, abs(toCam.y))));',   /* upright near the horizon; camera-facing when looked at steeply */
  '    vec3 camRight = normalize(cross(camUp, toCam)); camUp = normalize(cross(toCam, camRight)); vec2 q = vec2(position.x * sx, position.y * sy);',
  '    world = centre + camRight * q.x + camUp * q.y + camRight * sin(uTime * 0.035 + seed * 31.0) * 0.07 * sx + camUp * sin(uTime * 0.027 + seed * 17.0) * 0.035 * sy;',   /* M15: drifts slowly inside its body */
  '    fade *= 1.0 - smoothstep(0.2, 0.5, abs(toCam.y));',   /* wind streaks are side-view features: they fade when looked at steeply */
  '    vH = clamp((world.y - aCloud.x) / bH, 0.0, 1.0); vRel = ((centre - aCentre.xyz) + (world - centre) * 0.35) / max(aCentre.w, 1.0);',   /* shade by height inside the WHOLE cloud; body-side light at the card centre */
  '    vLs = vec2(dot(Lw, camRight) * (flip ? -1.0 : 1.0), dot(Lw, camUp));',   /* the key projected into the card plane: the self-shadow march direction */
  '  }',
  '  vec3 vd = world - cameraPosition; float vl = max(length(vd), 1.0); vElev = vd.y / vl; vFwd = max(dot(vd / vl, Lw), 0.0); vView = vd; vFade = fade;',
  '  vDist = length(cameraPosition - centre);',
  '#if CLOUD_TAPS == 0',
  '  vSky = skyAt(vd / vl);',
  '#endif',
  '  gl_Position = fade < 0.003 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(world, 1.0);',   /* a face or card this view does not show is collapsed outside the clip volume: no fragments at all */
  '}'].join('\n');

var FRAG = [
  'uniform sampler2D uMap, uField; uniform vec3 uTop, uShade, uRim, uHaze, uLightWorld; uniform float uOpacity, uRimK, uHazeNear, uHazeFar, uHazeMax, uBaseDark, uShadowK, uTime; uniform vec2 uHor; uniform float uDiffuse, uAuraK; uniform vec3 uAuraA, uAuraB, uAuraC;',
  'uniform vec2 uAerial; uniform float uErode, uSig, uFieldN, uAmb; uniform mat4 projectionMatrix;',   /* M19: aerial extinction (start m, e-folding m) · field erosion · extinction per metre · field texture size · the camera projection (for the fragment's own depth) */
  'uniform float uBreak, uVeilDown;',   /* M20: the break-up from above · the residual thinning from above */
  'uniform float uRimP, uRimF;',   /* M20 wave 6: the silver lining's forward lobe (exponent · gain) */
  'uniform float uSigL, uSoftX, uSoftY, uRimBase, uBelly, uLodB;',   /* M20 sky round 2: the key's own extinction per metre · the soft cell wall (field units) · the soft cell top (share of the column) · the silver lining's floor · the belly's reach · the field's mip bias */
  SKY_FN,
  'varying vec2 vUv; varying vec2 vCell; varying vec4 vPuff; varying float vDist; varying float vH; varying vec3 vRel; varying vec2 vLs; varying float vElev; varying float vFwd; varying float vFade;',
  'varying vec3 vView; varying vec3 vCtr; varying vec4 vBodyK; varying vec4 vSlab; varying float vKind;',
  '#if CLOUD_TAPS == 0',
  'varying vec3 vSky;',
  '#endif',
  'vec4 cellTex(vec2 u) { return texture2D(uMap, vCell + clamp(u, 0.006, 0.994) * 0.5); }',
  'float cH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
  'float cN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(cH(i), cH(i + vec2(1.0, 0.0)), f.x), mix(cH(i + vec2(0.0, 1.0)), cH(i + vec2(1.0, 1.0)), f.x), f.y); }',
  /* M19 the body FIELD at one point of the footprint (body frame, metres): x the local TOP height, y the BASE height, z the footprint weight */
  'float gHx, gHz, gH, gForm, gThr, gBil, gEIn, gUp, gX; vec2 gFsc, gOff;',
  'vec3 slabField(vec2 q, float lod) {',
  '  vec4 f = textureLod(uField, q * gFsc + gOff, lod); vec2 e = q / vec2(gHx, gHz); float r = max(abs(e.x), abs(e.y)) * 0.35 + length(e) * 0.65 + f.a * 0.2, kl = max(r - gEIn, 0.0) * 2.2, E = max(1.0 - kl, 0.0);',   /* a wide, soft rounded-rectangle footprint: toward its edge the threshold rises, so cells shrink into scattered fragments (never an outline; nothing reaches the box walls) */
  '  float c = mix(f.r, f.g, gBil) + (f.b - 0.5) * uErode * 0.55 + (gForm > 0.5 && gForm < 1.5 ? 0.15 * cos(e.y * 6.0 + (f.a - 0.5) * 4.0) : 0.0);',   /* streets: parallel rolls along the axis, clear lanes between */
  '  float x = clamp((c - kl - gThr) / (1.0 - gThr), 0.0, 1.0), qq = r / 0.92, th = gH * 0.94 * (gForm < 1.5 ? mix(sqrt(x), x, gForm < 0.5 ? 0.55 : 0.35) * (0.6 + 0.4 * E) : (gForm > 2.5 ? sqrt(clamp(1.0 - qq * qq, 0.0, 1.0)) * (0.45 + 0.55 * f.r) * (0.7 + 0.3 * f.g) : pow(clamp(1.0 - qq * qq, 0.0, 1.0), 0.6) * (0.5 + 0.5 * x)) * smoothstep(0.0, 0.25, x));',   /* decks and streets: flat-topped cells; heaps: one low domed mass; towers: a dome split by the broad masses (R) into two or three sub-towers of different heights, crowned by the dome-topped cells (G) — rounded turrets, never spires */
  '  gX = x; return vec3(th, gH * (gForm < 1.5 ? 0.22 * (1.0 - E) : (gForm > 2.5 ? 0.14 : 0.3) * smoothstep(0.35, 0.9, r) * (0.6 + 0.4 * c)), E); }',   /* the BASE: flat under the core, lifted toward the flanks — thin deck edges from below, heaps that bulge a little above a narrower flat base */
  'void main() {',
  '  vec3 Lw = normalize(uLightWorld), rd = normalize(vView), col, bodyCol; float a, dist, hN, lit, thin, sunK, fw, an, zf = gl_FragCoord.z;',
  '  if (vKind > 0.5) {',
  /* M19 ONE VOLUME, ONE FIELD: the view ray is cut by the body's box (in the body frame: x along its axis, y above its flat base, z across),
     then marched front to back through the heightfield. The field (one mip-filtered fetch per step: R masses · G dome-topped cells ·
     B fine erosion · A footprint erosion) is thresholded inside the footprint, so the body thins into gaps and broken fragments toward its ends instead of
     ending in an outline; the top is sqrt-shaped (flat-topped cells) for decks and streets, domed for heaps and the tower ring. */
  '    vec2 ax = vBodyK.xy, px = vec2(-ax.y, ax.x); float hx = vBodyK.z, hz = vBodyK.w, H = vSlab.y, form = vSlab.w, sd = vSlab.z;',
  '    vec3 o = cameraPosition - vec3(vCtr.x, vSlab.x, vCtr.z), ol = vec3(dot(o.xz, ax), o.y, dot(o.xz, px)), dl = vec3(dot(rd.xz, ax), rd.y, dot(rd.xz, px));',
  '    vec3 dn = vec3(abs(dl.x) < 1e-4 ? 1e-4 : dl.x, abs(dl.y) < 1e-4 ? 1e-4 : dl.y, abs(dl.z) < 1e-4 ? 1e-4 : dl.z), ta = (vec3(-hx, 0.0, -hz) - ol) / dn, tb = (vec3(hx, H, hz) - ol) / dn, tn = min(ta, tb), tf = max(ta, tb);',
  '    float t0 = max(max(tn.x, tn.y), max(tn.z, 0.0)), t1 = min(min(tf.x, tf.y), tf.z); if (t1 <= t0) discard;',
  '    float fan = form < 0.5 ? 0.6 : (form < 1.5 ? 0.35 : (form < 2.5 ? 0.8 : 1.0)), thr = form < 0.5 ? 0.14 : (form < 1.5 ? 0.24 : (form < 2.5 ? 0.24 : 0.12)), bil = form < 0.5 ? 0.7 : (form < 1.5 ? 0.6 : (form < 2.5 ? 0.5 : 0.6)), eIn = form < 0.5 ? 0.55 : (form < 1.5 ? 0.5 : (form < 2.5 ? 0.62 : 0.72));',
  '    gUp = max(smoothstep(0.06, 0.45, -rd.y), smoothstep(-15.0, 25.0, cameraPosition.y - vSlab.x - H) * smoothstep(0.0, 0.12, -rd.y));',   /* M20: looked down upon = a steep look, OR any downward look from at / above the body top (the HALO rim and the highland aerials meet the mid layer nearly level) */
  '    float fs = min((form < 0.5 ? 0.71 : (form < 1.5 ? 0.62 : (form < 2.5 ? 0.5 : 0.7))) * (0.8 + 0.4 * sd) / hx, 0.0079); vec2 fsc = vec2(fs * fan, fs), off = vec2(sd * 7.31 + uTime * 0.0005, sd * 3.17); gHx = hx; gHz = hz; gH = H; gForm = form; gThr = mix(thr, 0.95, uBreak * gUp); gBil = bil; gEIn = eIn; gFsc = fsc; gOff = off;',   /* M20 BREAK FROM ABOVE: looked down upon (the HALO rim, the highland aerials) a body's cells shrink into broken fragments with the ground readable between them, instead of a uniform milky veil over the district */   /* cells scale with the body (a deck has 6–8 across its length, never under 18 m): big banks keep big, soft cells; the field never repeats inside a body */
  '    float pathL = t1 - t0, nE = floor(min(max(pathL * fs * (form > 2.5 ? 20.0 : 12.0), float(SLAB_MIN)), float(SLAB_STEPS))), ds = pathL / nE, lod = clamp(log2(max(ds * length(dl.xz) * (CLOUD_TAPS == 0 ? 0.08 : 0.8), (t0 + t1) * 0.0008) * fs * uFieldN) + (CLOUD_TAPS == 0 ? 0.0 : uLodB), 0.0, 5.0);',   /* steps of about half a cell along the ray (a steep look through a thin deck takes 3–5, a grazing one up to the tier cap); the mip level follows the step's horizontal travel, so long grazing paths read a pre-filtered field instead of aliasing into spikes */
  '#if CLOUD_TAPS == 0',
  '    float jit = 0.5, kY = max(Lw.y, 0.3);',   /* LOW: one sample at the middle of the path, its height span integrated (the body as a thickness map) */
  '#else',
  '    float jit = 0.5 + (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) * float(CLOUD_JIT), kY = max(Lw.y, 0.3);',   /* M20: the per-pixel start offset at a fifth of its old spread (CLOUD_JIT) — the interleaved-gradient pattern read as a diagonal dotted screen over every thin deck met at a grazing angle; measured A/B: no step banding appears without it */
  '#endif',
  '    vec2 kx = normalize(vec2(dot(Lw.xz, ax), dot(Lw.xz, px)) + 1e-4); float kH = max(length(Lw.xz), 0.3); float T = 1.0, tAcc = 0.0, lAcc = 0.0, tS = -1.0; vec3 C = vec3(0.0), ps = vec3(0.0);',
  '    for (int i = 0; i < SLAB_STEPS; i++) { if (float(i) >= nE) break;',
  '      float t = t0 + (float(i) + jit) * ds; vec3 p = ol + dl * t, F = slabField(p.xz, lod); vec2 e = p.xz / vec2(hx, hz); float th = F.x, b = F.y, cT = max(th - b, 0.0);',
  '#if CLOUD_TAPS == 0',
  '      float yh = abs(dl.y) * ds * 0.5, d = clamp((min(p.y + yh, th) - max(p.y - yh, b) + 2.0) / (yh * 2.0 + 4.0), 0.0, 1.0);',   /* the share of this step's height span that lies between the base and top surfaces (integrated, not point-sampled: flat bases and tops stay clean lines instead of a dithered stipple); one flat base for the body core (the layer shares its altitude) */
  '#else',
  '      float yh = abs(dl.y) * ds * 0.5, d = clamp((th - p.y) / (yh + 1.5 + uSoftY * cT) + 0.35, 0.0, 1.0) * clamp((p.y - b) / (yh * 2.0 + 4.0) + 0.5, 0.0, 1.0) * smoothstep(0.0, uSoftX, gX);',   /* M20 sky round 2 (HIGH / MED): SOFT CELL WALLS — the same share, but the top fades over a band that widens with the step and the column (softY) and the density ramps in from the cell's edge (softX): a rim is a gradient, not a two-pixel wall a mis-stepped sample can saw into teeth. LOW keeps the old share above (its one sample turned the soft wall into a bright outlined capsule) */
  '#endif',
  '      if (d > 0.002) {',
  '        float dk = max(th - p.y, 0.0), sun = exp(-min(dk / kY, max(0.0, 0.8 - dot(e, kx)) * (hx + hz) * 0.5 / kH) * (CLOUD_TAPS == 0 ? uSig * 0.55 : uSigL)), amb = 0.45 + 0.55 * clamp((p.y - b) / max(th - b, 1.0), 0.0, 1.0);',   /* the key through the shorter of two paths — down from the local top, or in from the sun-facing flank (a tall mass is lit on its sunward side, not only on its crown) · sky ambient rising with height */
  '        float lr = clamp(sun * (0.72 - 0.3 * uShadowK) + amb * uAmb + uAmb * 0.33, 0.0, 1.0), ai = 1.0 - exp(-d * uSig * ds);',
  '        C += T * ai * mix(uShade, uTop, lr) * (1.0 - uBaseDark * (1.0 - smoothstep(0.0, 0.55, p.y / H)) * mix(smoothstep(0.08, 0.55, dk / H), 1.0, uBelly) * (1.0 - 0.85 * sun));',   /* a deeper but SOFT underside: only under thick cells, fading up through the lower body — M20 lead review of sky round 2: and only where the key does not reach (a sunlit flank low on a body stays lit: front-lit bodies had gone dull grey, level with the sky) */
  '        tAcc += T * ai * t; lAcc += T * ai * lr; if (T > 0.55 && T * (1.0 - ai) <= 0.55) { ps = p; tS = th; } T *= 1.0 - ai; if (T < 0.02) break; }',
  '    }',
  '    a = 1.0 - T; if (a < 0.004) discard; col = C / a; dist = tAcc / a; lit = lAcc / a;',
  '    vec4 cp = projectionMatrix * viewMatrix * vec4(cameraPosition + rd * dist, 1.0); zf = clamp(0.5 + 0.5 * cp.z / cp.w, 0.0, 0.999999);',   /* DEPTH where the body actually is along the ray (its density-weighted distance), not where its box begins: a mountain or the highland standing inside a body's box hides the cloud behind it and is veiled by the cloud in front of it */
  '#if CLOUD_TAPS > 0',
  /* RELIEF (HIGH / MED): where the ray first meets the body's upper surface, the top's slope (two more field reads) turns each cell and
     turret toward or away from the key — lit and shaded sides on the crowns of heaps and towers, seen from the side or above */
  '    if (tS > 0.0) { float gd = 0.3 / (7.0 * fs), gx = (slabField(ps.xz + vec2(gd, 0.0), lod).x - tS) / gd, gz = (slabField(ps.xz + vec2(0.0, gd), lod).x - tS) / gd; vec3 nw = normalize(vec3(-gx * ax.x - gz * px.x, 1.0, -gx * ax.y - gz * px.y)); col *= mix(1.0, 0.72 + 0.44 * clamp(dot(nw, Lw) * 0.6 + 0.4, 0.0, 1.0), (1.0 - smoothstep(0.1, 0.5, -rd.y)) * smoothstep(0.35, 0.8, ps.y / max(tS, 1.0))); }',
  '#endif',
  '    vec3 pm = ol + dl * dist; hN = clamp(pm.y / H, 0.0, 1.0); thin = 1.0 - smoothstep(0.12, 0.85, a); fw = max(dot(rd, Lw), 0.0);',
  '    vec3 wr = vec3(ax.x * pm.x + px.x * pm.z, pm.y - H * 0.45, ax.y * pm.x + px.y * pm.z) / max(hx, 1.0); sunK = clamp(0.5 + 0.5 * dot(normalize(wr + vec3(0.0, 0.2, 0.0)), Lw), 0.0, 1.0); sunK = sunK * sunK * (3.0 - 2.0 * sunK);',
  '    a *= uOpacity * 0.94 * vFade * (1.0 - uVeilDown * gUp); bodyCol = mix(uShade, uTop, clamp(0.42 + 0.3 * sunK + 0.18 * hN, 0.0, 1.0)); an = CLOUD_TAPS == 0 ? sd : cN((cameraPosition.xz + rd.xz * dist) * 0.011 + sd * 9.0);',   /* never an opaque core · looked DOWN upon (the HALO rim, the highland) a body thins to a veil of mist, so the districts below stay readable through it */
  '  } else {',
  /* a WIND STREAK card: the M8D atlas cloudlet with its own thickness self-shadow (tiered taps) */
  '    vec2 u = vUv; float dens = cellTex(u).a;',
  '#if CLOUD_TAPS > 0',
  '    dens = clamp(dens + (cN(vUv * vec2(3.0, 14.0) + vec2(vPuff.y * 17.0, uTime * 0.012)) - 0.5) * 0.9 * (1.0 - smoothstep(0.4, 0.95, dens)), 0.0, 1.0);',   /* combed into strands */
  '#endif',
  '    a = smoothstep(0.02, 0.7, dens) * vPuff.z * uOpacity * vFade; if (a < 0.004) discard;',
  '    float occl = 0.0;',
  '#if CLOUD_TAPS > 0',
  '    occl = cellTex(u + vLs * 0.06).r * 0.55;',   /* thickness between this point and the key, inside the streak */
  '#if CLOUD_TAPS > 1',
  '    occl += cellTex(u + vLs * 0.16).r * 0.45;',
  '#else',
  '    occl *= 1.6;',
  '#endif',
  '#endif',
  '    float side = dot(normalize(vRel + vec3(0.0, 0.2, 0.0)), Lw);',   /* which side of the whole BODY faces the key */
  '    sunK = clamp(0.5 + 0.5 * side, 0.0, 1.0); sunK = sunK * sunK * (3.0 - 2.0 * sunK); float h = smoothstep(0.0, 0.9, vH);',
  '    lit = clamp(sunK * (1.0 - uShadowK * clamp(occl * 0.5, 0.0, 1.0)) * (0.62 + 0.38 * h) + 0.22 * h, 0.0, 1.0);',
  '    float baseK = 1.0 - smoothstep(0.0, 0.3, vH);',   /* flat, darker bases */
  '    col = mix(uShade, uTop, lit) * (1.0 - uBaseDark * baseK * (1.0 - 0.4 * sunK)); bodyCol = mix(uShade, uTop, clamp(0.4 + 0.32 * sunK + 0.18 * h, 0.0, 1.0));',
  '    col = mix(col, bodyCol, 0.4 * uDiffuse); thin = 1.0 - smoothstep(0.08, 0.62, dens); dist = vDist; hN = vH; fw = vFwd; an = cN(vUv * 2.3 + vPuff.y * 9.0);',
  '  }',
  '  col += uRim * uRimK * thin * (uRimBase + uRimF * pow(fw, uRimP)) * (0.35 + 0.65 * sunK);',   /* thin parts scatter the key forward: a silver lining, strongest toward the light (M20 wave 6: its lobe per look — by day a tight bright rim near the Sun instead of a white wash over every body within ~35° of it) */
  /* M19 AERIAL PERSPECTIVE: contrast falls away first (toward the body tone), then the body takes the sky's own colour along the view ray
     (Beer-Lambert extinction by the distance where the body actually is, plus the long horizon path) — far decks become brighter sky */
  '  float fogK = smoothstep(uHazeNear, uHazeFar, dist) * uHazeMax, ext = max(fogK, 1.0 - exp(-max(dist - uAerial.x, 0.0) / max(uAerial.y, 1.0)));',
  '  float horK = 1.0 - smoothstep(uHor.x, uHor.y, vElev);',   /* aerial perspective + the horizon haze swallowing distant bases */
  '  horK = (vKind > 0.5 ? 1.0 - smoothstep(uHor.x, uHor.y, rd.y) : horK) * (1.0 - smoothstep(0.02, 0.2, -rd.y));',   /* only near the horizon LINE: a cloud seen from above is not a far base */
  '#if CLOUD_TAPS > 0',
  '  vec3 sc = mix(uHaze, skyAt(rd), uSkyOn);',
  '#else',
  '  vec3 sc = mix(uHaze, vSky, uSkyOn);',
  '#endif',
  /* M19 AURA (colour law, review 2026-09-27): a faint pearl sheen where the body is thin. ONE class hue at a time is eased out of an
     equal-channel neutral — gold toward the key, pale blue away from it, pink only where the body is lit near-white — the weights never
     overlap, so no RGB midpoint of two class hues (blue + pink = a fake purple, gold + pink = peach) can form */
  '  float wA = smoothstep(0.58, 0.9, sunK), cool = 1.0 - smoothstep(0.1, 0.42, sunK), wB = cool * (1.0 - smoothstep(0.3, 0.46, an)), wC = cool * smoothstep(0.54, 0.7, an) * smoothstep(0.62, 0.85, lit);',
  '  vec3 tint = vec3(1.0) + (uAuraA / max(max(uAuraA.r, uAuraA.g), max(uAuraA.b, 0.001)) - 1.0) * wA + (uAuraB / max(max(uAuraB.r, uAuraB.g), max(uAuraB.b, 0.001)) - 1.0) * wB + (uAuraC / max(max(uAuraC.r, uAuraC.g), max(uAuraC.b, 0.001)) - 1.0) * wC;',
  '  col = mix(col, tint * max(max(col.r, col.g), col.b), clamp(thin * uAuraK * (1.0 - ext), 0.0, 1.0));',
  '  col = mix(col, bodyCol, clamp(ext * 1.2, 0.0, 0.75));',
  '  col = mix(col, sc, clamp(ext * 0.9 + horK * (0.3 + 0.45 * (1.0 - hN)) * (1.0 - ext), 0.0, 0.94));',
  '  a *= (1.0 - horK * (0.22 + 0.38 * (1.0 - hN)) * uDiffuse) * (1.0 - ext * 0.4);',   /* the far base dissolves into the haze first */
  '  gl_FragColor = vec4(col, a);',
  '#if CLOUD_DEPTH',
  '  gl_FragDepth = zf;',   /* (writing the depth turns off the early depth test for the cloud draws: accepted on HIGH, one shaded fragment per covered pixel per body; M20: MED / LOW take the far-face path instead, see VERT) */
  '#endif',
  '  #include <colorspace_fragment>',
  '}'].join('\n');

/* One shared procedural puff ATLAS (2 × 2 cells, alpha = coverage, red = thickness): 0 low heap · 1 soft sheet · 2 flat base band ·
   3 wind streak. Built once, shared by every cloud layer (reference-counted), deterministic.
   M19 (owner 2026-09-27: fewer circular lobes, more irregular erosion): every shape is WIDE and LOW in its cell (sy), the billow that raised
   cauliflower bumps on the upper rim is nearly gone, and the erosion noise is stretched along the horizon (ax < 1) so outlines fray into
   horizontal streaks instead of scalloped circles. */
var ATLAS = {};
function h2(x, y, s) { var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn(x, y, s) { var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); var a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
function fbm(x, y, s) { var v = 0, a = 0.5, f = 1, t = 0; for (var o = 0; o < 5; o++) { v += a * vn(x * f, y * f, s + o * 17); t += a; a *= 0.5; f *= 2.03; } return v / t; }
var SHAPES = [   /* blobs: [x, y, radius, weight] in the cell's -1..1 space · cut: flat-bottom height (only the BASE shape is cut: stacked crown puffs with flat bottoms read as horizontal slices) · warp / erode / billow: outline turbulence · soft: rim width · sy: vertical squash · ax: horizontal stretch of the erosion noise (< 1 = streaks) */
  { blobs: [[0, -0.22, 0.52, 1], [-0.46, -0.28, 0.38, 0.85], [0.47, -0.3, 0.36, 0.85], [-0.2, -0.02, 0.36, 0.7], [0.22, 0.0, 0.34, 0.7], [0.02, 0.16, 0.28, 0.45], [-0.72, -0.34, 0.22, 0.45], [0.74, -0.36, 0.2, 0.4]], cut: -1.2, warp: 0.3, erode: 0.52, billow: 0.12, soft: 0.32, freq: 3.4, sy: 0.9, ax: 0.55 },
  { blobs: [[0, -0.08, 0.62, 1], [-0.52, -0.06, 0.42, 0.8], [0.52, -0.1, 0.4, 0.8], [-0.24, 0.14, 0.36, 0.5], [0.3, 0.1, 0.34, 0.5], [-0.8, -0.1, 0.24, 0.4], [0.82, -0.08, 0.22, 0.4]], cut: -1.2, warp: 0.34, erode: 0.62, billow: 0.05, soft: 0.38, freq: 3.0, sy: 1.0, ax: 0.5 },
  { blobs: [[0, -0.2, 0.6, 1], [-0.55, -0.22, 0.42, 0.85], [0.56, -0.2, 0.42, 0.85], [-0.3, -0.06, 0.36, 0.6], [0.3, -0.05, 0.34, 0.6], [-0.82, -0.24, 0.22, 0.45], [0.84, -0.22, 0.22, 0.45]], cut: -0.52, warp: 0.22, erode: 0.46, billow: 0.06, soft: 0.3, freq: 3.4, sy: 1.1, ax: 0.5 },
  { blobs: [[0, 0, 0.6, 0.8], [-0.5, 0.04, 0.42, 0.6], [0.5, -0.04, 0.4, 0.6], [0.84, 0.02, 0.22, 0.32], [-0.84, 0.0, 0.22, 0.32]], cut: -0.95, warp: 0.5, erode: 1.0, billow: 0, soft: 0.46, freq: 2.6, sy: 1.8, ax: 0.28 }
];
/* density = a SMOOTH SUM of gaussian blobs (lobes merge into one mass instead of reading as separate balls), domain-warped and eroded by
   fBm, with billow noise raising cauliflower bumps on the upper rim. Alpha = coverage (soft rim); red = thickness with internal relief —
   the shader's self-shadow marches this, so the lit side and the deep side separate inside every puff. */
function puffAtlas(THREE, cell) {
  var key = 'c' + cell; if (ATLAS[key]) { ATLAS[key].refs++; return ATLAS[key].tex; }
  var N = cell * 2, c = document.createElement('canvas'); c.width = c.height = N; var g = c.getContext('2d'), im = g.createImageData(N, N), px = im.data;
  for (var v = 0; v < 4; v++) { var S = SHAPES[v], ox = (v % 2) * cell, oy = Math.floor(v / 2) * cell, sy = S.sy || 1, ax = S.ax || 1;
    for (var y = 0; y < cell; y++) for (var x = 0; x < cell; x++) {
      var u = (x + 0.5) / cell * 2 - 1, w = 1 - (y + 0.5) / cell * 2;
      var uw = u + (fbm(u * 1.6 * ax + 3.1 * v, w * 1.6, 311 + v) - 0.5) * S.warp, ww = w + (fbm(u * 1.6 * ax + 5.7, w * 1.6 + 9.2 * v, 733 + v) - 0.5) * S.warp * 0.6;
      var D = 0; for (var l = 0; l < S.blobs.length; l++) { var B = S.blobs[l], dx = (uw - B[0]) / B[2], dy = (ww - B[1]) * sy / B[2]; D += B[3] * Math.exp(-(dx * dx + dy * dy) * 1.7); }
      var n = fbm(u * S.freq * ax + v * 7.3, w * S.freq * 1.4, 91 + v), nb = 1 - Math.abs(2 * fbm(u * S.freq * 1.7 * ax + 1.3, w * S.freq * 1.7 - 2.1 * v, 57 + v) - 1);
      var top = Math.max(0, Math.min(1, (ww + 0.2) / 0.7)), dd = D - 0.5 + (n - 0.5) * S.erode * (1 - 0.5 * top) + (nb - 0.62) * S.billow * top;
      dd *= Math.max(0, Math.min(1, (ww - S.cut) / 0.16));                                     /* flatter bottom */
      var border = Math.max(0, Math.min(1, (1 - Math.max(Math.abs(u), Math.abs(w))) / 0.06));  /* zero alpha at the cell border (no mip bleed) */
      var al = Math.max(0, Math.min(1, dd / S.soft)); al = al * al * (3 - 2 * al) * border; var th = Math.max(0, Math.min(1, (D - 0.35) / 0.9 + (nb - 0.6) * 0.45 + (n - 0.5) * 0.2));
      var o = ((oy + y) * N + ox + x) * 4; px[o] = Math.round(255 * th); px[o + 1] = Math.round(255 * n); px[o + 2] = 255; px[o + 3] = Math.round(255 * al); } }
  g.putImageData(im, 0, 0); var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.premultiplyAlpha = false;
  ATLAS[key] = { tex: t, refs: 1 }; return t;
}
function releaseAtlas(tex) { for (var k in ATLAS) if (ATLAS[k].tex === tex && --ATLAS[k].refs <= 0) { tex.dispose(); delete ATLAS[k]; } }
/* M19 the body FIELD: one shared, tileable N × N data texture (reference-counted with the atlas), mip-mapped so a long grazing ray reads a
   pre-filtered field. R: continuous masses (periodic gradient-noise fBm) · G: CELLS (a warped Voronoi mosaic of dome-topped cells with thin
   gaps between them — the stratocumulus underside, the cauliflower crown) · B: fine erosion · A: macro variation that eats the footprint unevenly. Each channel is
   stretched to its 2–98 % range, so a threshold means the same in every channel. */
function pgn(x, y, P, s) { var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10); function g(i, j, dx, dy) { var a = h2(((i % P) + P) % P, ((j % P) + P) % P, s) * 6.2831853; return Math.cos(a) * dx + Math.sin(a) * dy; } var a = g(ix, iy, fx, fy), b = g(ix + 1, iy, fx - 1, fy), c = g(ix, iy + 1, fx, fy - 1), d = g(ix + 1, iy + 1, fx - 1, fy - 1); return 0.5 + 0.75 * (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy); }
function pgf(u, v, base, oct, s) { var t = 0, n = 0, amp = 0.5; for (var o = 0; o < oct; o++) { var P = base << o; t += amp * pgn(u * P, v * P, P, s + o * 31); n += amp; amp *= 0.5; } return t / n; }
function pcell(u, v, P, s) { var x = u * P, y = v * P, ix = Math.floor(x), iy = Math.floor(y), d1 = 9, d2 = 9; for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) { var cx = ix + i, cy = iy + j, hx = ((cx % P) + P) % P, hy = ((cy % P) + P) % P, qx = cx + 0.15 + 0.7 * h2(hx, hy, s), qy = cy + 0.15 + 0.7 * h2(hx, hy, s + 7), dd = Math.hypot(x - qx, y - qy); if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd; } return Math.sqrt(Math.max(0, 1 - d1 * d1 * 1.4)) * 0.75 + (d2 - d1) * 0.25; }
function fieldTexture(THREE, N) {
  var key = 'f' + N; if (ATLAS[key]) { ATLAS[key].refs++; return ATLAS[key].tex; }
  var ch = [0, 1, 2, 3].map(function () { return new Float32Array(N * N); }), px = new Uint8Array(N * N * 4);
  for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var u = x / N, v = y / N, i = y * N + x, wu = u + (pgf(u, v, 4, 2, 71) - 0.5) * 0.06, wv = v + (pgf(u, v, 4, 2, 73) - 0.5) * 0.06;
    ch[0][i] = pgf(u, v, 3, 5, 11); ch[1][i] = pcell(((wu % 1) + 1) % 1, ((wv % 1) + 1) % 1, 7, 23) + (pgf(u, v, 16, 3, 29) - 0.5) * 0.25; ch[2][i] = pgf(u, v, 12, 4, 37); ch[3][i] = pgf(u, v, 2, 3, 53); }
  ch.forEach(function (A, k) { var s = Array.prototype.slice.call(A).sort(function (p, q) { return p - q; }), lo = s[Math.floor(s.length * 0.02)], hi = s[Math.floor(s.length * 0.98)]; for (var i = 0; i < A.length; i++) px[i * 4 + k] = Math.round(255 * Math.max(0, Math.min(1, (A[i] - lo) / Math.max(1e-6, hi - lo)))); });
  var t = new THREE.DataTexture(px, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  ATLAS[key] = { tex: t, refs: 1 }; return t;
}

/* Deterministic cluster layout for one cloud of footprint length L (metres). Returns puffs relative to the cloud origin.
   M10 (owner: close-range clouds still read as a chain of equal round balls): a real cumulus is a flat base shelf with a few CONVECTIVE
   CELLS rising out of it — one dominant, the others lower, each a mound of billows that shrink as they climb, set in DEPTH (not one row),
   with small ragged FRINGE puffs on the flanks. Sizes now vary inside a body (core billows three to four times the fringe), so the outline
   breaks into turrets, shoulders and gaps instead of a string of beads. Puff count stays about the same (tier-scaled as before).
   M19 (owner 2026-09-27: longer, more continuous, fewer lobes — sometimes ATMOSPHERE rather than OBJECT): the layout now sets the body's
   PROPORTIONS for one volume (the shader draws the body, see FRAG) in three FORMS of different thickness — its tallest slice gives the
   height, its spread in depth the footprint depth — and its wind STREAKS (the only atlas cards still drawn for a deck):
     · SHEET  a stratocumulus deck: long, low (height 16–26 % of its length), broad in depth;
     · STREET a broken cloud street: rolls along the axis, a little taller, narrower;
     · HEAP   flattened cumulus cells: 30–44 % of its length tall (capped by the layer's headroom).
   Order matters: the front row and the crown come first and the second depth row last. */
export function cloudCluster(L, rnd, crown, form) {
  var k = crown === undefined ? 1 : crown, puffs = [], F = form || (rnd() < 0.4 ? 'SHEET' : (rnd() < 0.55 ? 'STREET' : 'HEAP'));
  var H = L * (F === 'HEAP' ? 0.3 + rnd() * 0.14 : (F === 'STREET' ? 0.2 + rnd() * 0.1 : 0.16 + rnd() * 0.1)) * (0.7 + 0.3 * k), D = L * (F === 'SHEET' ? 0.26 + rnd() * 0.14 : (F === 'HEAP' ? 0.16 + rnd() * 0.08 : 0.14 + rnd() * 0.08));
  var nQ = Math.max(3, Math.min(7, Math.round(L / 42))), sp = L / nQ, bw = Math.max(sp * 1.9, H * 1.3), baseTop = H * 0.34;
  for (var i = 0; i < nQ; i++) puffs.push({ x: ((i + 0.5) / nQ - 0.5) * L + (rnd() - 0.5) * sp * 0.1, y: baseTop, z: (i % 2 ? 1 : -1) * D * (0.15 + rnd() * 0.3), w: bw, h: H * 1.15, height: 0.1, flat: 1 });   /* front base slices */
  var nC = Math.max(3, nQ - 1); for (var c = 0; c < nC; c++) puffs.push({ x: ((c + 0.5) / nC - 0.5) * L * 0.8 + (rnd() - 0.5) * sp * 0.3, y: baseTop + H * (0.36 + rnd() * 0.12), z: (rnd() - 0.5) * D * 0.6, w: Math.max(L * 0.8 / nC * 1.8, H * 1.1), h: H * 1.0, height: 0.55 + 0.3 * rnd(), flat: 0 });   /* crown slices */
  var nw = 1 + Math.floor(rnd() * 2);
  for (var f = 0; f < nw; f++) { var sw = f % 2 ? 1 : -1; puffs.push({ x: sw * L * (0.44 + rnd() * 0.1), y: baseTop * (0.4 + rnd() * 0.6), z: (rnd() - 0.5) * L * 0.1, w: L * (0.16 + rnd() * 0.08), h: L * (0.022 + rnd() * 0.015), height: 0.3, flat: 0.5, v: 3 }); }   /* wind streaks trailing off the ends */
  for (var j = 0; j < nQ - 1; j++) puffs.push({ x: ((j + 1) / nQ - 0.5) * L + (rnd() - 0.5) * sp * 0.2, y: baseTop, z: (j % 2 ? -1 : 1) * D * (0.35 + rnd() * 0.3), w: bw * 0.95, h: H * 1.05, height: 0.1, flat: 1 });   /* second depth row */
  return puffs;
}

function legacyCluster(L, rnd, crown) {   /* the M9 layout, kept ONLY to draw from the shared sky stream exactly as before (see createCloudBodies) */
  var n = Math.max(5, Math.min(16, Math.round(L / 13))), puffs = [], k = crown === undefined ? 1 : crown;
  for (var i = 0; i < n; i++) { var u = n === 1 ? 0.5 : i / (n - 1), prof = Math.pow(Math.sin(Math.PI * (0.08 + u * 0.84)), 0.75); var rad = L * (0.09 + 0.07 * prof) * (0.85 + rnd() * 0.3);
    puffs.push({ x: (u - 0.5) * L * 0.86 + (rnd() - 0.5) * L * 0.04, y: rad * 0.28, z: (rnd() - 0.5) * L * 0.16, w: rad * 2.3, h: rad * 1.25, height: 0.1, flat: 1 });   /* base shelf */
    if (prof > 0.35) puffs.push({ x: (u - 0.5) * L * 0.8 + (rnd() - 0.5) * L * 0.06, y: rad * (0.75 + prof * 0.9 * k), z: (rnd() - 0.5) * L * 0.14, w: rad * 2.1, h: rad * 2.1, height: 0.55 + prof * 0.45, flat: 0 });   /* billowing crown */
    if (prof > 0.72 && rnd() < 0.7 * k) { var cr = rad * (0.55 + rnd() * 0.25); puffs.push({ x: (u - 0.5) * L * 0.78 + (rnd() - 0.5) * L * 0.08, y: rad * (1.35 + prof * 1.05 * k), z: (rnd() - 0.5) * L * 0.1, w: cr * 2.1, h: cr * 2.05, height: 1, flat: 0 }); } }   /* irregular cauliflower caps */
  return puffs;
}

/* M8D: a TOWERING cumulus (congestus) of base width W and height H: a flat base shelf, a rising column of billows that narrows upward and
   leans a little with wind shear, cauliflower caps and one or two ragged wisps on the flanks. Every puff names its atlas shape (v). */
export function towerCluster(W, H, rnd) {
  var puffs = [], nb = 4 + Math.floor(rnd() * 3);
  for (var i = 0; i < nb; i++) { var u = i / (nb - 1), bw = W * (0.34 + rnd() * 0.12); puffs.push({ x: (u - 0.5) * W * 0.72 + (rnd() - 0.5) * W * 0.06, y: H * 0.05, z: (rnd() - 0.5) * W * 0.1, w: bw, h: bw * 0.34, height: 0.04, flat: 1, v: 2 }); }
  var lean = (rnd() - 0.5) * W * 0.22, levels = 5 + Math.floor(rnd() * 3);
  for (var l = 0; l < levels; l++) { var t = (l + 0.5) / levels, wl = W * (0.66 - 0.36 * t) * (0.9 + rnd() * 0.2), per = t < 0.5 ? 3 : (t < 0.8 ? 2 : 1);
    for (var k = 0; k < per; k++) { var off = per === 1 ? 0 : (k / (per - 1) - 0.5) * wl * 0.62, r = wl * (per === 1 ? 0.62 : 0.48) * (0.85 + rnd() * 0.3);
      puffs.push({ x: lean * t + off + (rnd() - 0.5) * wl * 0.12, y: H * (0.1 + 0.72 * t) + r * 0.15, z: (rnd() - 0.5) * W * 0.12, w: r * 2.0, h: r * 1.9, height: 0.1 + 0.8 * t, flat: 0, v: rnd() < 0.6 ? 0 : 1 }); } }
  var caps = 2 + Math.floor(rnd() * 3), topW = W * 0.3;
  for (var c = 0; c < caps; c++) { var cr = topW * (0.35 + rnd() * 0.25); puffs.push({ x: lean + (rnd() - 0.5) * topW, y: H * (0.86 + rnd() * 0.08) - cr * 0.2, z: (rnd() - 0.5) * W * 0.06, w: cr * 2.1, h: cr * 2.0, height: 1, flat: 0, v: 0 }); }
  var wisps = 1 + Math.floor(rnd() * 2);
  for (var s = 0; s < wisps; s++) { var sg = rnd() < 0.5 ? -1 : 1, wr = W * (0.16 + rnd() * 0.1); puffs.push({ x: sg * W * (0.42 + rnd() * 0.12), y: H * (0.2 + rnd() * 0.3), z: (rnd() - 0.5) * W * 0.1, w: wr * 2.6, h: wr * 1.1, height: 0.3, flat: 0.5, v: 3 }); }
  return puffs;
}

/* M19: ONE geometry for the whole layer — a unit box with per-face normals (24 vertices, 12 triangles, no material groups): a body VOLUME
   uses the faces the viewer can see (the others collapse in the vertex stage), a wind-streak card uses only its front face as a quad. */
function volumeGeometry(THREE) { var g = new THREE.BoxGeometry(1, 1, 1); g.clearGroups(); return g; }
function pickShape(P, style, r) { return P.flat ? (style === 'STRATUS' && r() < 0.15 ? 3 : 2) : (P.height >= 1 ? 0 : (style === 'STRATUS' ? (r() < 0.7 ? 1 : 3) : (r() < 0.55 ? 0 : 1))); }   /* atlas shape per puff */
function privateRnd(x, z, k) { var s = (Math.imul(Math.round(x * 64) | 0, 73856093) ^ Math.imul(Math.round(z * 64) | 0, 19349663) ^ Math.imul(k | 0, 83492791)) >>> 0 || 1; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function angleGap(a, b) { var d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; }

export function createCloudBodies(ctx, L, opts) {
  var THREE = ctx.THREE; var tierScale = opts.tierScale || 1; var rnd = opts.rnd || Math.random; var own = [];
  var clouds = [], puffs = [], style = L.style || 'CUMULUS', tower = style === 'TOWER';
  var count = Math.max(4, Math.round((L.count || 20) * (opts.countScale || 1))), avoid = opts.avoid || [], avoidR = (L.avoid_deg || 0) * Math.PI / 180;
  for (var k = 0; k < count; k++) { var s0 = L.size_m ? L.size_m[0] : 60, s1 = L.size_m ? L.size_m[1] : 140, len = s0 + Math.pow(rnd(), L.size_pow || 1) * (s1 - s0);   /* M8D: skewed — many small, a few large */
    var x0 = (rnd() - 0.5) * opts.spread, z0 = opts.originZ + (rnd() - 0.5) * opts.spread, ang0 = 0, rr = 0;
    if (L.ring_m) { ang0 = rnd() * Math.PI * 2; for (var tries = 0; tries < 24 && avoid.some(function (az) { return angleGap(ang0, az) < avoidR; }); tries++) ang0 = rnd() * Math.PI * 2;   /* M8D: towers keep clear of the Sun / Moon sectors */
      rr = L.ring_m[0] + rnd() * (L.ring_m[1] - L.ring_m[0]); x0 = Math.cos(ang0) * rr; z0 = opts.originZ + Math.sin(ang0) * rr; }   /* M8B: horizon banks sit on a ring around the world */
    var cl = { x: x0, z: z0, x0: x0, z0: z0, ang0: ang0, rr: rr, y: (L.alt_m || 150) + (rnd() - 0.5) * 24, yaw: rnd() * Math.PI, drift: 0.7 + rnd() * 0.6, len: len, puffs: [] };
    /* M10: the cell layout draws from a PRIVATE positional stream; the shared sky stream is advanced exactly as the M9 layout drew from it
       (legacyCluster + its per-puff seed / shape draws), so every body keeps its accepted place, size, height, yaw and drift and the other
       layers are untouched — only each body's inner form changes. */
    var pr = tower ? rnd : privateRnd(x0, z0, k + 1), crownK = L.crown === undefined ? 1 : L.crown;
    if (!tower) { var legacy = legacyCluster(len, rnd, crownK), keepL = Math.max(4, Math.round(legacy.length * tierScale)); for (var lp = 0; lp < legacy.length; lp++) { if (lp % Math.max(1, Math.round(legacy.length / keepL)) !== 0 && legacy.length > keepL) continue; rnd(); pickShape(legacy[lp], style, rnd); } }
    /* M19 FORM + SCALE + ONE BASE (owner 2026-09-27): each body draws, from its PRIVATE stream, a form (stratus layers are mostly decks, the
       horizon ring decks and streets, the mid layer all three) and a scale — about one in six becomes a long deck (1.45–1.9×), one in four
       a small fragment (0.6–0.8×) — and every body's base is pulled to within ±3.6 m of the layer altitude, so a layer shares one flat
       cloud-base plane that recedes in perspective. The shared stream and every accepted position, yaw and drift are untouched. */
    var form = null; cl.seed = Math.abs(Math.sin(x0 * 78.233 + z0 * 12.9898 + k) * 43758.5453) % 1;
    if (!tower) { var fr = pr(), sr = pr(), alt = L.alt_m || 150; form = style === 'STRATUS' ? (fr < 0.62 ? 'SHEET' : 'STREET') : (L.bank ? (fr < 0.5 ? 'SHEET' : 'STREET') : (fr < 0.34 ? 'SHEET' : (fr < 0.7 ? 'STREET' : 'HEAP')));
      len *= sr < 0.16 ? 1.45 + sr * 2.8 : (sr < 0.4 ? 0.6 + (sr - 0.16) * 0.8 : 0.9 + (sr - 0.4) * 0.4); if (sr >= 0.16 && sr < 0.4) form = 'SHEET'; else if (form === 'SHEET') len *= 1.3; if (!L.bank) len *= 1.35; cl.len = len;   /* a small fragment is always a thin sheet of small cells (a lone roll or dome that small read as a floating pebble); full decks run 30 % longer; a volume shows less of its footprint than a card cluster did, so the low / mid bodies grow 35 % to keep the sky's coverage */ cl.y = alt + (cl.y - alt) * 0.3; cl.form = form; }
    cl.formI = form === 'SHEET' ? 0 : (form === 'STREET' ? 1 : (form === 'HEAP' ? 2 : 3));   /* the shader's field rule per form (3 = the tower ring) */
    var tH = tower ? (L.tower_h_m ? L.tower_h_m[0] + rnd() * (L.tower_h_m[1] - L.tower_h_m[0]) : len * 0.8) : 0;   /* drawn before the tower layout, exactly as before */
    var raw = tower ? towerCluster(len, tH, rnd) : cloudCluster(len, pr, crownK, form); var keep = Math.max(4, Math.round(raw.length * tierScale));
    if (L.ring_m && !tower) { cl.yawJ = (cl.yaw - Math.PI / 2) * 0.25; cl.yaw = ang0 + Math.PI / 2 + cl.yawJ; }   /* M19: a horizon bank lies ALONG its ring (±22°), so from the world it is always a long bank, never an end-on column; sky.js keeps it tangent as it drifts */
    if (tower) cl.yaw = ang0 + Math.PI / 2;   /* a tower's long axis runs along the ring: seen broadside from the world */
    cl.extent = tower ? tH : Math.max.apply(Math, raw.map(function (P) { return P.y + P.h * 0.5; })) + len * 0.02;
    if (form === 'SHEET') cl.extent *= 0.72;   /* a deck is a thin sheet: about a tenth of its length */
    if (!tower && L.max_top_m) cl.extent = Math.max(8, Math.min(cl.extent, L.max_top_m - cl.y - 1));   /* M19 (review): a body taller than the layer's headroom is FLATTENED to it, never pushed down (8 of 26 mid bodies had sunk ≥ 20 m below the shared base) */
    cl.rad = Math.max(len * 0.5, cl.extent * 0.55);
    if (L.max_top_m && cl.y + cl.extent > L.max_top_m) cl.y = L.max_top_m - cl.extent;   /* keeps every body below the HALO deck (240 m): no cloud ever pokes up through the upper-realm floor */
    var ez = 0;
    for (var p = 0; p < raw.length; p++) { if (tower ? (p % Math.max(1, Math.round(raw.length / keep)) !== 0 && raw.length > keep) : p >= keep) continue; var P = raw[p]; P.cloud = cl; P.seed = pr();
      if (P.v === undefined) { P.v = pickShape(P, style, pr); if (P.v === 0 && P.seed < 0.55) P.v = 1; }   /* M14: about half the cauliflower lobes become soft billows (no draw added: the seed is already drawn) */
      if (P.flat !== 0.5 || !tower) { ez = Math.max(ez, Math.abs(P.z) + (tower ? P.w * 0.3 : 0)); continue; }   /* M19: the layout's slices, lobes and deck streaks only size the body (the VOLUME draws it; a deck's streak card read as a floating pebble) */
      if (opts.streaks === false) continue; cl.puffs.push(P); puffs.push(P); }   /* the tower flanks keep their wind streaks as atlas cards · M20 sky round 2: unless the caller drops them (sky.js does) — on the far ring a streak card is ~30 px tall and its eroded atlas edge aliased into a dotted band across the massifs (MX); the seeds are still drawn, so the shared sky stream and every body stay put */
    /* M19 the body VOLUME (replaces M9's base plate and every slice): one box around the heightfield — half length, half depth (the layout's
       spread in depth), the body's height — drawn as ONE instance; a positional hash seeds it (the shared sky stream is not touched). */
    cl.hx = Math.max(len * (tower ? 0.62 : 0.72), 1); cl.hz = Math.max(tower ? Math.max(ez, len * 0.36) : (ez * 1.15 + len * 0.04) * 1.2, 1);   /* the field thins out over the outer third: the box is larger than the body it holds */
    var SV = { x: 0, y: cl.extent * 0.5, z: 0, w: cl.hx * 2, h: cl.extent, height: 0.5, flat: 3, v: 1, slab: true, cloud: cl, seed: Math.abs(Math.sin(cl.x0 * 12.9898 + cl.z0 * 78.233) * 43758.5453) % 1 }; cl.puffs.push(SV); puffs.push(SV);
    clouds.push(cl); }
  var geo = volumeGeometry(THREE); own.push(geo);   /* M19: one box per body (+ a quad per wind streak) on every tier */ var aPuff = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4); aPuff.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aPuff', aPuff); var aCloud = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 3), 3); aCloud.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aCloud', aCloud);
  var aCentre = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4); aCentre.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aCentre', aCentre);
  var aBody = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4); aBody.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aBody', aBody);   /* M19: the body's long axis + envelope */
  var taps = opts.taps === undefined ? 2 : opts.taps, tex = puffAtlas(THREE, opts.cell || 256), fieldN = (opts.cell || 256) >= 256 ? 256 : 128, field = fieldTexture(THREE, fieldN);
  var mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, fog: false, side: THREE.DoubleSide, toneMapped: true, defines: { CLOUD_TAPS: taps, SLAB_STEPS: taps === 0 ? 1 : (taps === 1 ? 10 : 20), SLAB_MIN: taps === 0 ? 1 : (taps === 1 ? 4 : 5), CLOUD_JIT: 0.2, CLOUD_DEPTH: opts.fragDepth === undefined ? (taps > 1 ? 1 : 0) : (opts.fragDepth ? 1 : 0) },   /* M19: march steps per tier (HIGH 5–20 · MED 4–10 · LOW 1); the shader takes about two per field cell along the ray · M20: gl_FragDepth on HIGH only (MED / LOW: the far-face path) */
    uniforms: { uMap: { value: tex }, uTop: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uRim: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uLightWorld: { value: new THREE.Vector3(0, 1, 0) }, uOpacity: { value: 1 }, uRimK: { value: 0.6 },
      uHazeNear: { value: 260 }, uHazeFar: { value: 1250 }, uHazeMax: { value: 0.7 }, uHor: { value: new THREE.Vector2(0.0, 0.16) }, uBaseDark: { value: 0.18 }, uShadowK: { value: 0.55 }, uTime: { value: 0 },
      uOblong: { value: 1 }, uDiffuse: { value: 1 }, uAuraK: { value: 0.2 }, uAuraA: { value: new THREE.Color(0xffe9b3) }, uAuraB: { value: new THREE.Color(0xb4c4ee) }, uAuraC: { value: new THREE.Color(0xf2b3dc) },
      uAerial: { value: new THREE.Vector2(160, 1100) }, uErode: { value: 0.9 }, uField: { value: field }, uFieldN: { value: fieldN }, uSig: { value: 0.06 }, uAmb: { value: 0.3 },   /* M19 */
      uSkyZ: { value: new THREE.Color() }, uSkyH: { value: new THREE.Color() }, uSkyHz: { value: new THREE.Color() }, uSkyT: { value: new THREE.Color() }, uSkyL: { value: new THREE.Color() }, uSkyS: { value: new THREE.Vector3(0, 1, 0) }, uSkyMie: { value: 0 }, uSkyLavK: { value: 0 }, uSkyHazeK: { value: 0 }, uSkyOn: { value: 0 }, uSkyCast: { value: 1 }, uSkySkirt: { value: 0.38 }, uSkySunHaze: { value: 0.55 },   /* M19: replaced by the dome's own uniform objects (shareSky) */
      uBreak: { value: 0.75 }, uVeilDown: { value: 0.55 }, uRimP: { value: 5 }, uRimF: { value: 1.5 }, uSigL: { value: 0.033 }, uSoftX: { value: 0.35 }, uSoftY: { value: 0.3 }, uRimBase: { value: 0.08 }, uBelly: { value: 0 }, uLodB: { value: 0 } } });   /* M20 · M20 wave 6: uRimP / uRimF */
  own.push(mat);
  var mesh = new THREE.InstancedMesh(geo, mat, puffs.length); mesh.name = 'SKY_' + L.id; mesh.frustumCulled = false; mesh.userData.noMerge = true; mesh.renderOrder = opts.renderOrder || 4; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.userData.cloudSilhouette = { kind: tower ? 'LIT_TOWER_CLUSTER' : 'LIT_PUFF_CLUSTER', rectangular: false, feathered: true, clouds: clouds.length, puffs: puffs.length, tier_scale: tierScale, shapes: 'ATLAS_4_NOISE_ERODED', self_shadow_taps: taps, style: style, body: 'HEIGHTFIELD_VOLUME', card: opts.streaks === false ? 'BOX_PROXY' : 'BOX_PROXY + STREAK_CARDS', forms: clouds.map(function (c) { return c.form || 'TOWER'; }).join(',') };
  var _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _qp = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0); var order = puffs.map(function (p, i) { return i; }); var sortClock = 1e9;
  function write(camPos) {  /* recompute world puff positions from the drifting cloud origins; with camPos also re-sort back-to-front */
    for (var i = 0; i < puffs.length; i++) { var P = puffs[i], c = P.cloud, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); P.wx = c.x + P.x * cs - P.z * sn; P.wy = c.y + P.y; P.wz = c.z + P.x * sn + P.z * cs; P.d2 = camPos ? (P.wx - camPos.x) * (P.wx - camPos.x) + (P.wy - camPos.y) * (P.wy - camPos.y) + (P.wz - camPos.z) * (P.wz - camPos.z) : 0; }
    if (camPos) order.sort(function (a, b) { return puffs[b].d2 - puffs[a].d2; });   /* back-to-front */
    for (var j = 0; j < order.length; j++) { var Q = puffs[order[j]]; _p.set(Q.wx, Q.wy, Q.wz); if (Q.slab) { _qp.setFromAxisAngle(_up, -Q.cloud.yaw); _s.set(Q.cloud.hx * 2, Q.cloud.extent, Q.cloud.hz * 2); _m.compose(_p, _qp, _s); } else { _s.set(Q.w, Q.h, 1); _m.compose(_p, _q, _s); } mesh.setMatrixAt(j, _m); aPuff.setXYZW(j, Q.height, Q.v + Q.seed * 0.998, Q.slab ? 1 : 0.5, Q.flat); aCloud.setXYZ(j, Q.cloud.y, Q.cloud.extent, Q.cloud.formI + Q.cloud.seed * 0.998); aCentre.setXYZW(j, Q.cloud.x, Q.cloud.y + Q.cloud.extent * 0.45, Q.cloud.z, Q.cloud.rad); aBody.setXYZW(j, Math.cos(Q.cloud.yaw), Math.sin(Q.cloud.yaw), Q.cloud.hx, Q.cloud.hz); }
    mesh.instanceMatrix.needsUpdate = true; aPuff.needsUpdate = true; aCloud.needsUpdate = true; aCentre.needsUpdate = true; aBody.needsUpdate = true; }
  write(null);
  function setLook(look) { var U = mat.uniforms, gain = look.gain !== undefined ? +look.gain : 1; U.uTop.value.set(look.top).multiplyScalar(gain); U.uShade.value.set(look.shade); U.uRim.value.set(look.rim).multiplyScalar(gain);   /* M20: gain lifts the lit crowns / rims above 1 before the filmic curve — under a silver sky a lit cloud top must still out-shine the (untonemapped) dome behind it, or the masses read as grey smoke */ U.uHaze.value.set(look.haze); U.uOpacity.value = look.opacity; U.uRimK.value = look.rimK;
    U.uHazeNear.value = look.hazeNear !== undefined ? look.hazeNear : 260; U.uHazeFar.value = look.hazeFar !== undefined ? look.hazeFar : 1250; U.uHazeMax.value = look.hazeMax !== undefined ? look.hazeMax : 0.7;
    U.uHor.value.set(look.hor ? look.hor[0] : 0.0, look.hor ? look.hor[1] : 0.16); U.uBaseDark.value = look.baseDark !== undefined ? look.baseDark : 0.18; U.uShadowK.value = look.shadowK !== undefined ? look.shadowK : 0.55;
    U.uOblong.value = look.oblong !== undefined ? look.oblong : 1; U.uDiffuse.value = look.diffuse !== undefined ? look.diffuse : 1; U.uAuraK.value = look.auraK !== undefined ? look.auraK : 0.2;   /* M14 */
    if (look.auraA) U.uAuraA.value.set(look.auraA); if (look.auraB) U.uAuraB.value.set(look.auraB); if (look.auraC) U.uAuraC.value.set(look.auraC);
    if (look.aerial) U.uAerial.value.set(look.aerial[0], look.aerial[1]); U.uErode.value = look.erode !== undefined ? look.erode : 0.9; U.uSig.value = look.sig !== undefined ? look.sig : 0.06; U.uAmb.value = look.amb !== undefined ? look.amb : 0.3;   /* M19 */
    U.uBreak.value = look.brk !== undefined ? look.brk : 0.75; U.uVeilDown.value = look.veilDown !== undefined ? look.veilDown : 0.55; U.uRimP.value = look.rimPow !== undefined ? look.rimPow : 5; U.uRimF.value = look.rimFwd !== undefined ? look.rimFwd : 1.5;
    U.uSigL.value = look.sigL !== undefined ? look.sigL : U.uSig.value * 0.55; U.uSoftX.value = look.softX !== undefined ? look.softX : 0.35; U.uSoftY.value = look.softY !== undefined ? look.softY : 0.3; U.uRimBase.value = look.rimBase !== undefined ? look.rimBase : 0.08; U.uBelly.value = look.belly !== undefined ? look.belly : 0; U.uLodB.value = look.lodB !== undefined ? look.lodB : 0; }   /* M20 · M20 wave 6: the rim lobe */
  /* M19: share the sky dome's scattering uniforms BY REFERENCE (atmosphere.js calls sky.shareSky once its shader exists), so day / night
     switches and the LOW tier's Mie-off reach the clouds' aerial perspective with no copy; null falls back to the flat haze colour.
     This swaps uniform OBJECTS inside mat.uniforms after the program may have compiled: it works because three.js resolves each uniform
     by name in material.uniforms on every upload (no cached reference to the old object). It relies on the build order sky → atmosphere
     (worldB.js); a module built later that calls shareSky again simply re-points the same entries. */
  function shareSky(D) { var U = mat.uniforms; if (!D) { U.uSkyOn = { value: 0 }; return; } U.uSkyZ = D.uZenith; U.uSkyH = D.uHorizon; U.uSkyHz = D.uHaze; U.uSkyT = D.uSunTint; U.uSkyL = D.uLav; U.uSkyS = D.uSun; U.uSkyMie = D.uMie; U.uSkyLavK = D.uLavK; U.uSkyHazeK = D.uHazeK; if (D.uCastK) U.uSkyCast = D.uCastK; if (D.uSkirt) U.uSkySkirt = D.uSkirt; if (D.uSunHaze) U.uSkySunHaze = D.uSunHaze; U.uSkyOn = { value: 1 }; }
  /* camPos: {x,y,z} (ctx.cameraPos()) for the back-to-front sort · lightDir: the world direction of the active key (Sun by day, Moon by night) */
  function tick(dt, t, camPos, lightDir) { mat.uniforms.uTime.value = t || 0; if (lightDir) mat.uniforms.uLightWorld.value.set(lightDir[0], lightDir[1], lightDir[2]).normalize();
    sortClock += dt || 0; var sortNow = sortClock > 0.25 && camPos; write(sortNow ? camPos : null); if (sortNow) sortClock = 0; }
  function dispose() { if (mesh.parent) mesh.parent.remove(mesh); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; releaseAtlas(tex); releaseAtlas(field); }
  return { mesh: mesh, mat: mat, clouds: clouds, puffs: puffs, setLook: setLook, shareSky: shareSky, tick: tick, write: write, dispose: dispose };
}
