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
   faint aura, better horizon merging; the best cloud sometimes reads as atmosphere rather than object):
     · decks, streets and heaps are no longer unions of cloudlets but a few wide SOFT SLICES through ONE analytic body (FRAG): a flat base
       shared by the layer, one continuous upper profile over the body's apparent width, a body-plane noise field that erodes, opens gaps
       and sets thickness identically for every overlapping slice — no card can draw its own round outline; from below, the footprint along
       the view ray; from above, the plate becomes a mottled top sheet. Towers and wind streaks keep their (flatter, streak-eroded) atlas;
     · each body draws a FORM (deck / street / heap) and a SCALE (0.6–1.9×) from its private stream; horizon banks lie along their ring;
     · aerial perspective is Beer-Lambert extinction toward the sky dome's OWN colour along the view ray (the dome uniforms are shared by
       reference), after the contrast has fallen toward the body tone — far bodies dissolve into the horizon haze;
     · cheaper: octagon cards (no empty corners), fewer and less-stretched cards, cheap early discards, cards a view cannot show collapsed
       in the vertex stage, slices sample no atlas; LOW keeps the front row and drops the faintest fragments. */

/* M19 SKY REPLICA: the dome's own scattering (atmosphere.js, the same uniforms shared by reference through sky.shareSky), evaluated along the
   view ray — aerial perspective pulls a distant cloud toward exactly the sky behind it, so far bodies dissolve into the horizon haze instead
   of standing in front of it. Per fragment on HIGH / MED, per vertex on LOW. */
var SKY_FN = [
  'uniform vec3 uSkyZ, uSkyH, uSkyHz, uSkyT, uSkyL, uSkyS; uniform float uSkyMie, uSkyLavK, uSkyHazeK, uSkyOn;',
  'vec3 skyAt(vec3 d) {',
  '  float h = clamp(d.y, -1.0, 1.0), hp = max(h, 0.0), mu = dot(d, normalize(uSkyS)), od = 1.0 / (hp * 4.0 + 0.22);',
  '  float t = clamp(0.62 * pow(1.0 - hp, 2.2) + 0.38 * (1.0 - exp(-od * 0.55)), 0.0, 1.0); vec3 c = mix(uSkyZ, uSkyH, t) * mix(0.9, 1.1, (0.5 + 0.5 * mu) * (0.35 + 0.65 * t));',
  '  c = mix(c, mix(uSkyHz, uSkyT, 0.55 * pow(max(mu, 0.0), 4.0)), clamp((exp(-hp * 16.0) + 0.38 * exp(-hp * 3.6)) * uSkyHazeK, 0.0, 1.0));',
  '  c = mix(c, uSkyL, clamp(pow(max(-mu, 0.0), 1.4) * exp(-hp * 7.0) * uSkyLavK, 0.0, 1.0)) + uSkyT * pow(max(mu, 0.0), 3.0) * exp(-hp * 3.0) * 0.16 * uSkyMie;',
  '  return mix(c, c * vec3(0.95, 0.975, 1.07), smoothstep(0.35, 0.95, h)); }'].join('\n');

var VERT = [
  'attribute vec4 aPuff;',              /* x: height inside the cloud 0..1 · y: atlas shape (integer part 0..3) + seed (fraction) · z: alpha · w: flatten (base puffs) */
  'attribute vec3 aCloud;',             /* x: cloud base world y · y: cloud vertical extent (m) · z: M19 the body's own seed (its field never repeats another body's) */
  'attribute vec4 aCentre;',            /* xyz: the cloud body's centre (world) · w: its radius (m) — the whole body is lit from the key's side */
  'attribute vec4 aBody;',              /* M19: xy the body's long axis (world xz) · z its half length · w its half depth (m) — the soft ENVELOPE of one long mass */
  'uniform vec3 uLightWorld; uniform float uOblong; uniform float uTime;',
  SKY_FN,
  'varying vec2 vUv; varying vec2 vCell; varying vec4 vPuff; varying float vDist; varying float vH; varying vec3 vRel; varying vec2 vLs; varying float vElev; varying float vFwd; varying float vBelow; varying float vShell; varying float vFade;',
  'varying vec2 vHxz; varying vec3 vCtr; varying vec4 vBodyK; varying float vAbove; varying float vSoft; varying float vSeed; varying vec3 vView; varying vec3 vSky; varying float vSide; varying float vForm; varying float vExt;',
  'void main() {',
  '  float seed = fract(aPuff.y), shape = floor(aPuff.y + 0.001); bool flip = seed > 0.5;',
  '  vUv = vec2(flip ? 1.0 - uv.x : uv.x, uv.y); vPuff = vec4(aPuff.x, seed, aPuff.z, aPuff.w);',
  '  vCell = vec2(mod(shape, 2.0) * 0.5, (1.0 - floor(shape * 0.5)) * 0.5);',   /* 2 × 2 atlas cell (canvas rows are flipped into uv) */
  '  vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
  '  float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz);',
  '  vec3 toCam = normalize(cameraPosition - centre);',
  '  float tyB = normalize(cameraPosition - aCentre.xyz).y, below = smoothstep(0.2, 0.7, -tyB); vBelow = below; float isPlate = step(1.5, aPuff.w), isBase = step(0.5, aPuff.w) * (1.0 - isPlate), slabV = step(floor(aCloud.z + 0.0005), 2.5) * (1.0 - step(0.25, aPuff.w) * step(aPuff.w, 0.75)); sy *= 1.0 + below * (0.6 + 0.9 * min(aPuff.w, 1.0)) * (1.0 - 0.8 * slabV);',   /* M19: a slice is already as wide as its body needs; it is stretched far less (fewer overlapping fragments) */
  '  float under = smoothstep(0.08, 0.42, -tyB); vFade = mix(mix(1.0 - 0.3 * under, 1.0 - 0.65 * under, isBase), under, isPlate); vSide = 1.0 - smoothstep(0.03, 0.18, -tyB);',   /* M19: from below the base plate (the deck's soft mottled underside) takes over sooner, and the flat-base clip only acts side-on (from below it cut every card at the same height: stacked hat brims) — all three are read from the BODY centre, so every card of one body takes the same state (per card they switched at card borders: hard seams) */
  '  float oblong = 1.0 + (1.0 - isPlate) * uOblong * (0.62 + 0.45 * min(aPuff.w, 1.0) + 0.45 * fract(seed * 5.31)) * (1.0 - 0.75 * slabV); sx *= oblong; sy *= 1.0 - 0.1 * uOblong * (1.0 - isPlate);',   /* M14: stretched along the horizon (base puffs most, each a little differently), a touch flatter — drifting masses, not balls */   /* M9: the plate appears as the base puffs fade, once the body is overhead */   /* seen from below, puffs spread vertically so the underside closes into one flat grey surface (thin stacked puffs read as slices) */
  '#if CLOUD_TAPS == 0',
  '  sx *= 0.84; sy *= 0.9;',   /* M19 LOW: square cards, drawn a little smaller, so LOW rasterises fewer cloud fragments than before in every view */
  '#endif',
  '  vec3 viewUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);',
  '  vec3 camUp = normalize(mix(vec3(0.0, 1.0, 0.0), viewUp, smoothstep(0.35, 0.85, abs(toCam.y))));',   /* upright near the horizon (flat base, crown up); camera-facing when looked at steeply from below/above so puffs never foreshorten into stacked discs */
  '  vec3 camRight = normalize(cross(camUp, toCam)); camUp = normalize(cross(toCam, camRight));',
  '  float rot = (1.0 - step(0.25, aPuff.w)) * step(2.5, aCloud.z) * (fract(seed * 7.13) - 0.5) * 0.9 * (1.0 - 0.7 * uOblong), cr = cos(rot), sr = sin(rot); vec2 q = vec2(position.x * sx, position.y * sy);',
  '  vec3 tX = camRight * cr + camUp * sr, tY = camUp * cr - camRight * sr;',   /* M10: crown puffs turn up to ±26° in their own plane, so the four atlas shapes never stand in the same pose (M19: towers only — slices stay level) */
  '  vec3 world = centre + tX * q.x + tY * q.y + (tX * sin(uTime * 0.035 + seed * 31.0) * 0.07 * sx + tY * sin(uTime * 0.027 + seed * 17.0) * 0.035 * sy) * (1.0 - isPlate);',   /* M15: every lobe drifts slowly inside its body, so a cloud never just sits there */
  '  float over = smoothstep(0.1, 0.45, tyB), isWisp = step(0.25, aPuff.w) * step(aPuff.w, 0.75); vFade = mix(vFade * (1.0 - 0.55 * over), over, isPlate * step(0.0, tyB)) * (1.0 - isWisp * smoothstep(0.2, 0.5, abs(tyB)));',   /* M19 seen from ABOVE (the HALO rim): the plate rises to the body top and becomes its lit, mottled upper sheet while the cards thin out; wind streaks are side-view features and fade when looked at steeply */
  '  if (isPlate > 0.5) { float up = step(0.0, tyB); world = centre + mat3(instanceMatrix) * vec3(position.x, 0.0, position.y) + vec3(0.0, up * aCloud.y * 0.6, 0.0); vBelow = 1.0 - up; }',   /* the base plate lies flat in the body's own frame */
  '  vH = clamp((world.y - aCloud.x) / max(aCloud.y, 1.0), 0.0, 1.0);',   /* shade by height inside the WHOLE cloud: no per-puff banding */
  '  vRel = ((centre - aCentre.xyz) + (world - centre) * 0.35 * (1.0 - below)) / max(aCentre.w, 1.0);',   /* body-side light is taken at the PUFF centre (plus a little in-puff gradient seen side-on): per-fragment it painted the same gradient on every puff, which stacked into plates seen from below */
  '  vec3 Lw = normalize(uLightWorld); vLs = vec2(dot(Lw, tX) * (flip ? -1.0 : 1.0), dot(Lw, tY)) * (1.0 - 0.85 * below);',   /* the key projected into this puff's texture plane: the self-shadow march direction */
  '  vec3 vd = world - cameraPosition; float vl = max(length(vd), 1.0); vElev = vd.y / vl; vFwd = max(dot(vd / vl, Lw), 0.0);',
  '  vDist = length(cameraPosition - centre);',
  '  vec3 dO = (centre - aCentre.xyz) / vec3(max(aCentre.w, 1.0), max(aCloud.y * 0.5, 1.0), max(aCentre.w, 1.0)); vShell = length(dO - toCam * dot(dO, toCam));',   /* M9: the puff's place in the body's SILHOUETTE (ellipsoid-normalised, projected across the view): 0 = covered core, ~1 = the visible outline */
  /* M19 ONE BODY, ONE FIELD (owner 2026-09-27: still lobed cotton objects): every fragment is placed in its BODY's frame, not its card's —
     (1) the body ENVELOPE, a soft horizontal ellipse over the long axis, so the mass thins out toward its ends and flanks as one form;
     (2) the body PLANE (per fragment, FRAG): the view ray is cut by the plane through the body centre facing the viewer, so every
     overlapping card samples the SAME outline, erosion and thickness at the same screen point — no card draws an outline of its own;
     (3) height above the body's one flat base, shared by the whole layer. */
  '  vec3 rel = world - aCentre.xyz, tcB = normalize(cameraPosition - aCentre.xyz); vec2 ax = aBody.xy, pp = vec2(-ax.y, ax.x);',
  '  vHxz = vec2(max(aBody.z, 1.0), max(aBody.w, 1.0));',
  '#if CLOUD_TAPS == 0',
  '  vHxz *= 0.86;',   /* LOW: the footprint shrinks with its smaller cards */
  '#endif',
  '  vec3 rB = cross(vec3(0.0, 1.0, 0.0), tcB); rB = length(rB) > 0.001 ? normalize(rB) : vec3(1.0, 0.0, 0.0); float cth = dot(rB.xz, ax);',
  '  vCtr = aCentre.xyz; vBodyK = vec4(ax, max(sqrt(vHxz.x * vHxz.x * cth * cth + vHxz.y * vHxz.y * (1.0 - cth * cth)), 1.0), max(aCentre.w, 1.0));',   /* the body's APPARENT half width from this side, and its radius */
  '  vAbove = world.y - aCloud.x; vSoft = max(2.5, aCloud.y * 0.1); vSeed = fract(aCloud.z); vForm = floor(aCloud.z + 0.0005); vExt = aCloud.y; vView = vd;',
  '#if CLOUD_TAPS == 0',
  '  vSky = skyAt(vd / vl);',
  '#else',
  '  vSky = vec3(0.0);',
  '#endif',
  '  gl_Position = vFade < 0.003 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(world, 1.0);',   /* M19: a card this view does not show (the plate side-on, a streak from above) is collapsed outside the clip volume: no fragments at all */
  '}'].join('\n');

var FRAG = [
  'uniform sampler2D uMap; uniform vec3 uTop, uShade, uRim, uHaze, uLightWorld; uniform float uOpacity, uRimK, uHazeNear, uHazeFar, uHazeMax, uBaseDark, uShadowK, uTime; uniform vec2 uHor; uniform float uDiffuse, uAuraK; uniform vec3 uAuraA, uAuraB, uAuraC;',
  'uniform vec2 uAerial; uniform float uErode;',   /* M19: aerial extinction (start m, e-folding length m) · body-field erosion */
  SKY_FN,
  'varying vec2 vUv; varying vec2 vCell; varying vec4 vPuff; varying float vDist; varying float vH; varying vec3 vRel; varying vec2 vLs; varying float vElev; varying float vFwd; varying float vBelow; varying float vShell; varying float vFade;',
  'varying vec2 vHxz; varying vec3 vCtr; varying vec4 vBodyK; varying float vAbove; varying float vSoft; varying float vSeed; varying vec3 vView; varying vec3 vSky; varying float vSide; varying float vForm; varying float vExt;',
  'vec4 cellTex(vec2 u) { return texture2D(uMap, vCell + clamp(u, 0.006, 0.994) * 0.5); }',
  'float cH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
  'float cN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(cH(i), cH(i + vec2(1.0, 0.0)), f.x), mix(cH(i + vec2(0.0, 1.0)), cH(i + vec2(1.0, 1.0)), f.x), f.y); }',
  'void main() {',
  '  vec2 u = vUv;',
  '  float shell = smoothstep(0.3, 0.85, vShell);',   /* M9 (owner: clouds still read as stacked pancakes): a puff INSIDE the body must not draw its own outline */
  /* M19 SLICES THROUGH ONE BODY (owner 2026-09-27: still lobed cotton objects — longer, more continuous, fewer circular lobes): decks,
     streets and heaps are no longer a union of cloudlet sprites. Their cards are wide SOFT SLICES (a radial falloff, no outline of their
     own) through ONE analytic body: a flat base, and an upper outline that is one continuous profile over the body's apparent width —
     a long undulating ridge that tapers to its ends (deck), the same ridge broken into separate masses where it dips (street), one broad
     dome (heap). Only towers and wind streaks keep their atlas cloudlet. */
  '  vec3 tcB = normalize(cameraPosition - vCtr), rB = cross(vec3(0.0, 1.0, 0.0), tcB); rB = length(rB) > 0.001 ? normalize(rB) : vec3(1.0, 0.0, 0.0);',
  '  vec3 X = vView * (dot(cameraPosition - vCtr, tcB) / max(dot(vView, -tcB), 0.001)) + cameraPosition - vCtr, rw = vView + cameraPosition - vCtr;',   /* the view ray cut by the body plane (relative to the centre) · the fragment itself */
  '  float hbS = mix((X.y + vCtr.y - cameraPosition.y - vView.y + vAbove) / max(vExt, 1.0), vAbove / max(vExt, 1.0), step(1.5, vPuff.w));',   /* height above the flat base, read on the SAME body plane (the plate keeps its own): cards at different depths share one outline instead of stacking lens edges */
  '  float vProf = dot(X, rB) / vBodyK.z; vec2 bodyP = mix(vec2(dot(X, rB), dot(X, cross(tcB, rB))), vec2(dot(rw.xz, vBodyK.xy), dot(rw.xz, vec2(-vBodyK.y, vBodyK.x))), smoothstep(0.55, 0.85, abs(tcB.y))) / vBodyK.w;',
  '  float slab = step(vForm, 2.5) * (1.0 - step(0.25, vPuff.w) * step(vPuff.w, 0.75));',
  '  vec4 tex = slab > 0.5 ? vec4(0.5, 0.5, 1.0, 1.0 - smoothstep(mix(0.3, 0.62, step(1.5, vPuff.w)), 1.0, length(vUv * 2.0 - 1.0))) : cellTex(u); float dens = tex.a; if (dens < 0.01 || vSide * step(hbS * vExt, -1.2 * vSoft) > 0.5) discard;',   /* cheap outs first: outside the card's soft ellipse, or under the flat base seen side-on */   /* slices sample no atlas at all */
  '  float pu = 1.0 - smoothstep(0.2, 1.0, abs(vProf)), tn = cN(vec2(vProf * (vForm > 1.5 ? 1.5 : (vForm > 0.5 ? 1.9 : 2.4)) + vSeed * 23.0, vSeed * 7.0 + uTime * 0.003));',
  '  float top = vForm > 1.5 ? pow(pu, 0.55) * (0.6 + 0.4 * tn) : sqrt(pu) * (vForm > 0.5 ? smoothstep(0.2, 0.8, tn) : 0.4 + 0.6 * tn), hb = hbS;',
  '  float pl = slab * max(vBelow, step(1.5, vPuff.w)), cut = slab * (1.0 - pl); if (dens * (1.0 - cut * smoothstep(top + 0.12, top + 0.3, hb)) < 0.012) discard;',   /* early out before the field */
  /* M19 BODY FIELD: an anisotropic value-noise field in the body plane (long along the horizon, fine across it: stratocumulus cells and
     wind-combed streaks), slowly evolving — it erodes the edges, opens gaps and sets the thickness, identically for every overlapping card
     (the finer octaves shift a little per slice, so the stack reads as depth, not as one pasted layer) */
  '  vec2 bp = bodyP * vec2(2.4, 7.0) + vec2(uTime * 0.012 + vSeed * 37.0, vSeed * 19.0); float bn = cN(bp);',
  '#if CLOUD_TAPS > 0',
  '  bn = bn * 0.56 + cN(bp * vec2(2.3, 2.0) + 5.3 + vPuff.y * 1.7) * 0.44;',
  '#if CLOUD_TAPS > 1',
  '  bn = bn * 0.8 + cN(bp * vec2(5.2, 4.1) - 2.9 + vPuff.y * 3.1) * 0.2;',
  '#endif',
  '#endif',
  '  vec2 bax = vBodyK.xy, bpp = vec2(-bax.y, bax.x); vec3 Pb = vView * ((vView.y - vAbove) / (abs(vView.y) > 0.001 ? vView.y : 0.001)) + cameraPosition - vCtr;',   /* the view ray where it meets the body's flat base plane */
  '  float env = 1.0 - smoothstep(0.55, 1.1, length(vec2(dot(rw.xz, bax) / vHxz.x, dot(rw.xz, bpp) / vHxz.y) * vec2(1.0, 0.6)));',   /* an atlas cloudlet's own place in the footprint (towers, streaks) */
  '  float envB = 0.0; if (pl > 0.01) { vec2 fq = vec2(dot(Pb.xz, bax) / vHxz.x, dot(Pb.xz, bpp) / vHxz.y); envB = (1.0 - smoothstep(0.5, 1.08, length(fq * vec2(1.0, 0.9)) + (cN(fq * vec2(2.2, 3.0) + vSeed * 13.0) - 0.5) * 0.3 + (bn - 0.5) * 0.3)) * clamp(0.7 + 0.6 * bn, 0.0, 1.0); }',   /* an irregular, mottled underside (thin cells let the sky through), not an oval */   /* seen from below (or above), the FOOTPRINT along the view ray: every card of the body agrees on it, so no card draws a lens edge */
  '  float sil = mix(1.0 - slab * smoothstep(top - 0.38, top + 0.06, hb + (bn - 0.5) * 0.42), envB, pl);',   /* side-on: the continuous, frayed upper outline · from below: the footprint */
  '  float d = dens * mix(1.0, env, (1.0 - slab) * (0.3 + 0.45 * vBelow)) * sil; d = clamp(d + (bn - 0.5) * uErode * (0.6 + 0.6 * shell) * min(d * 2.5, 1.0) * (1.0 - 0.5 * smoothstep(0.5, 0.95, d)), 0.0, 1.0);',
  '  d *= mix(1.0, smoothstep(-vSoft, vSoft * 1.6, hbS * vExt), vSide);',   /* one soft flat base for the whole body (the layer shares its altitude) */
  '  float a = smoothstep(0.03, 0.62, d) * (0.72 + 0.28 * bn) * vPuff.z * mix(1.0, 0.72, slab) * uOpacity * vFade; if (a < (CLOUD_TAPS == 0 ? 0.02 : 0.004)) discard;',   /* never an opaque cotton core: thin cells let the sky through (slices stack, so each is lighter) · LOW drops the faintest 2 % of fragments (no blend for what the eye cannot see) */
  '  float occl = 0.0;',
  '#if CLOUD_TAPS > 0',
  '  if (slab < 0.5) {',   /* M19: only atlas cloudlets (towers, streaks) march their own thickness; a slice takes its thickness from the body */
  '  occl = cellTex(u + vLs * 0.06).r * 0.55;',   /* thickness between this point and the key, inside the puff */
  '#if CLOUD_TAPS > 1',
  '  occl += cellTex(u + vLs * 0.16).r * 0.45;',
  '#else',
  '  occl *= 1.6;',
  '#endif',
  '  }',
  '#endif',
  '  vec3 Lw = normalize(uLightWorld); float side = dot(normalize(vRel + vec3(0.0, 0.2, 0.0)), Lw);',   /* which side of the whole BODY faces the key */
  '  float sunK = clamp(0.5 + 0.5 * side, 0.0, 1.0); sunK = sunK * sunK * (3.0 - 2.0 * sunK); float h = smoothstep(0.0, 0.9, vH);',
  '  float thick = clamp(d * (0.4 + 0.95 * bn), 0.0, 1.0);',   /* M19: thickness is a BODY quantity (field × density), so light and shade never outline a single lobe */
  '  float lit = sunK * (1.0 - uShadowK * clamp(occl * 0.25 + thick * 0.5, 0.0, 1.0)) * (0.62 + 0.38 * h) + 0.22 * h;',
  '  float baseK = 1.0 - smoothstep(0.0, 0.3, vH);',   /* flat, darker bases */
  '  float belly = 1.0 - smoothstep(0.05, 0.85, vH);',   /* M19: a deeper but SOFTER underside — the shade rises gradually through the lower body, strongest where it is thick */
  '  lit = mix(lit, 0.3 + 0.42 * (1.0 - thick) + 0.14 * sunK, vBelow);',   /* seen from below, the whole underside shares one tone (lighter where thin) */
  '  vec3 col = mix(uShade, uTop, clamp(lit, 0.0, 1.0)) * (1.0 - uBaseDark * (0.35 * baseK + 0.65 * belly) * (0.45 + 0.55 * thick) * (1.0 - 0.4 * sunK));',
  '  vec3 bodyCol = mix(uShade, uTop, clamp(0.4 + 0.32 * sunK + 0.18 * h, 0.0, 1.0)) * (1.0 - uBaseDark * 0.45 * belly);',
  '  col = mix(col, bodyCol, 0.25 * uDiffuse);',   /* every part leans toward the body's mean tone: one soft mass, not a cluster of lit balls */
  '  float edge = 1.0 - smoothstep(0.04, 0.45, d);',   /* thin parts scatter the key forward: a silver lining, strongest toward the light */
  '  col += uRim * uRimK * edge * (0.08 + 1.5 * pow(vFwd, 5.0)) * (0.35 + 0.65 * sunK) * (1.0 - 0.7 * vBelow) * (0.35 + 0.65 * shell);',
  /* M19 AERIAL PERSPECTIVE: contrast falls away first (toward the body tone), then the body takes the sky's own colour along the view ray
     (Beer-Lambert extinction, plus the long horizon path) — distant decks become brighter sky, not grey objects on it */
  '  float fogK = smoothstep(uHazeNear, uHazeFar, vDist) * uHazeMax; float ext = max(fogK, 1.0 - exp(-max(vDist - uAerial.x, 0.0) / max(uAerial.y, 1.0)));',
  '  float horK = 1.0 - smoothstep(uHor.x, uHor.y, vElev);',   /* aerial perspective + the horizon haze swallowing distant bases */
  '#if CLOUD_TAPS > 0',
  '  vec3 sc = mix(uHaze, skyAt(normalize(vView)), uSkyOn);',
  '#else',
  '  vec3 sc = mix(uHaze, vSky, uSkyOn);',
  '#endif',
  '  float thin = 1.0 - smoothstep(0.08, 0.62, d);',   /* M14 AURA, M19 body-coherent: a faint pearl sheen where the body is thin — pale blue / pink away from the key, pale gold toward it, fading with distance */
  '  vec3 aur = mix(mix(uAuraB, uAuraC, smoothstep(0.35, 0.7, bn)), uAuraA, sunK * 0.65 * (1.0 - vBelow)); float lum = max(max(col.r, col.g), col.b);',
  '  col = mix(col, aur * lum, clamp(thin * (0.3 + 0.7 * shell) * uAuraK * (1.0 - ext), 0.0, 1.0));',
  '  col = mix(col, bodyCol, clamp(ext * 1.25, 0.0, 0.8));',
  '  col = mix(col, sc, clamp(ext * 0.9 + horK * (0.3 + 0.45 * (1.0 - vH)) * (1.0 - ext), 0.0, 0.94));',
  '  a *= (1.0 - horK * (0.22 + 0.38 * (1.0 - vH)) * uDiffuse) * (1.0 - ext * 0.4);',   /* the far base dissolves into the haze first */
  '  gl_FragColor = vec4(col, a);',
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

/* Deterministic cluster layout for one cloud of footprint length L (metres). Returns puffs relative to the cloud origin.
   M10 (owner: close-range clouds still read as a chain of equal round balls): a real cumulus is a flat base shelf with a few CONVECTIVE
   CELLS rising out of it — one dominant, the others lower, each a mound of billows that shrink as they climb, set in DEPTH (not one row),
   with small ragged FRINGE puffs on the flanks. Sizes now vary inside a body (core billows three to four times the fringe), so the outline
   breaks into turrets, shoulders and gaps instead of a string of beads. Puff count stays about the same (tier-scaled as before).
   M19 (owner 2026-09-27: longer, more continuous, fewer lobes — sometimes ATMOSPHERE rather than OBJECT): the cards are now wide soft
   SLICES through one analytic body (the shader draws the outline, see FRAG), in three FORMS of different thickness —
     · SHEET  a stratocumulus deck: long, low (height 16–26 % of its length), broad in depth;
     · STREET a broken cloud street: the same slices, the shader's ridge dips into gaps between separate masses;
     · HEAP   a flattened cumulus: one broad dome, 30–44 % of its length tall.
   Order matters: the front row and the crown come first and the second depth row last, so a tier that keeps fewer cards drops depth, not
   coverage. Every form ends in one or two wind STREAKS (atlas cloudlets). Card counts are lower than M10's. */
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

/* M19: every card is a corner-cut OCTAGON (its edges touch the inscribed circle): the corners of a square card are empty in every atlas
   cloudlet and every soft slice, and they were still rasterised — about a sixth of the sky's cloud fragments, for 4 more triangles a card (HIGH / MED; LOW keeps the quad and draws its cards 13 % smaller) */
function cardGeometry(THREE) { var g = new THREE.BufferGeometry(), p = [], uv = [], ix = [], r = 0.5 / Math.cos(Math.PI / 8); for (var i = 0; i < 8; i++) { var a = (i + 0.5) * Math.PI / 4, x = Math.cos(a) * r, y = Math.sin(a) * r; p.push(x, y, 0); uv.push(x + 0.5, y + 0.5); if (i > 1) ix.push(0, i - 1, i); }   /* a 6-triangle fan, no centre vertex */
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); return g; }
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
      len *= sr < 0.16 ? 1.45 + sr * 2.8 : (sr < 0.4 ? 0.6 + (sr - 0.16) * 0.8 : 0.9 + (sr - 0.4) * 0.4); cl.len = len; cl.y = alt + (cl.y - alt) * 0.3; cl.form = form; }
    cl.formI = form === 'SHEET' ? 0 : (form === 'STREET' ? 1 : (form === 'HEAP' ? 2 : 3));   /* the shader's silhouette rule per form (3 = tower: its own puff outline) */
    var raw = tower ? towerCluster(len, L.tower_h_m ? L.tower_h_m[0] + rnd() * (L.tower_h_m[1] - L.tower_h_m[0]) : len * 0.8, rnd) : cloudCluster(len, pr, crownK, form); var keep = Math.max(4, Math.round(raw.length * tierScale));
    if (L.ring_m && !tower) { cl.yawJ = (cl.yaw - Math.PI / 2) * 0.25; cl.yaw = ang0 + Math.PI / 2 + cl.yawJ; }   /* M19: a horizon bank lies ALONG its ring (±22°), so from the world it is always a long bank, never an end-on column; sky.js keeps it tangent as it drifts */
    if (tower) cl.yaw = ang0 + Math.PI / 2;   /* a tower's long axis runs along the ring: seen broadside from the world */
    cl.extent = Math.max.apply(Math, raw.map(function (P) { return P.y + P.h * 0.5; })) + len * 0.02; cl.rad = Math.max(len * 0.5, cl.extent * 0.55);
    if (L.max_top_m && cl.y + cl.extent > L.max_top_m) cl.y = L.max_top_m - cl.extent;   /* keeps every body below the HALO deck (240 m): no cloud ever pokes up through the upper-realm floor */
    for (var p = 0; p < raw.length; p++) { if (tower ? (p % Math.max(1, Math.round(raw.length / keep)) !== 0 && raw.length > keep) : p >= keep) continue; var P = raw[p];   /* M19: slice bodies keep their FIRST cards (front row + crown), so a lower tier drops depth, never coverage */ P.cloud = cl; P.seed = pr();
      if (P.v === undefined) { P.v = pickShape(P, style, pr); if (P.v === 0 && P.seed < 0.55) P.v = 1; }   /* M14: about half the cauliflower lobes become soft billows (no draw added: the seed is already drawn) */
      cl.puffs.push(P); puffs.push(P); }
    /* M9 BASE PLATE (owner: clouds read as stacked pancakes / cards from below): ONE horizontal soft card per body at its base, the body's
       footprint, aligned with its yaw. Seen from below it takes over from the base puffs (a row of upright base puffs seen end-on stacked
       into a tower of ellipses), so the underside reads as one flat, darker surface; from the side it is edge-on and invisible. */
    var bx0 = 1e9, bx1 = -1e9, bz = 0, by = 1e9; cl.puffs.forEach(function (Q) { bx0 = Math.min(bx0, Q.x - Q.w * 0.42); bx1 = Math.max(bx1, Q.x + Q.w * 0.42); bz = Math.max(bz, Math.abs(Q.z) + Q.w * 0.3); if (Q.flat) by = Math.min(by, Q.y - Q.h * 0.3); });
    if (!tower) { var fz = 0; cl.puffs.forEach(function (Q) { fz = Math.max(fz, Math.abs(Q.z)); }); bx0 = -len * 0.53; bx1 = len * 0.53; bz = fz + len * 0.09; }   /* M19: a slice body's plate is its own footprint (its cards overhang it) */
    if (by < 1e8) { var PL = { x: (bx0 + bx1) / 2, y: by, z: 0, w: (bx1 - bx0), h: bz * 2, height: 0, flat: 2, v: 1, plate: true, cloud: cl, seed: Math.abs(Math.sin(cl.x0 * 12.9898 + cl.z0 * 78.233) * 43758.5453) % 1 };   /* a positional hash: the plate never draws from the shared sky stream (the composition stays put) */ cl.puffs.push(PL); puffs.push(PL); }
    var ex = 0, ez = 0; cl.puffs.forEach(function (Q) { if (!Q.plate) { ex = Math.max(ex, Math.abs(Q.x) + Q.w * (tower ? 0.6 : 0)); ez = Math.max(ez, Math.abs(Q.z) + (tower ? Q.w * 0.5 : 0)); } }); cl.hx = Math.max(tower ? ex : len * 0.5, 1); cl.hz = Math.max(tower ? ez : ez + len * 0.08, 1);   /* M19: the body ENVELOPE (half length / half depth): the analytic body's own footprint, not its cards' */
    clouds.push(cl); }
  var geo = opts.taps === 0 ? new THREE.PlaneGeometry(1, 1) : cardGeometry(THREE); own.push(geo);   /* LOW keeps the two-triangle card (fewer triangles than before) */ var aPuff = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4); aPuff.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aPuff', aPuff); var aCloud = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 3), 3); aCloud.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aCloud', aCloud);
  var aCentre = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4); aCentre.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aCentre', aCentre);
  var aBody = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 4), 4); aBody.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aBody', aBody);   /* M19: the body's long axis + envelope */
  var taps = opts.taps === undefined ? 2 : opts.taps, tex = puffAtlas(THREE, opts.cell || 256);
  var mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, fog: false, side: THREE.DoubleSide, toneMapped: true, defines: { CLOUD_TAPS: taps },
    uniforms: { uMap: { value: tex }, uTop: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uRim: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uLightWorld: { value: new THREE.Vector3(0, 1, 0) }, uOpacity: { value: 1 }, uRimK: { value: 0.6 },
      uHazeNear: { value: 260 }, uHazeFar: { value: 1250 }, uHazeMax: { value: 0.7 }, uHor: { value: new THREE.Vector2(0.0, 0.16) }, uBaseDark: { value: 0.18 }, uShadowK: { value: 0.55 }, uTime: { value: 0 },
      uOblong: { value: 1 }, uDiffuse: { value: 1 }, uAuraK: { value: 0.2 }, uAuraA: { value: new THREE.Color(0xffe2b0) }, uAuraB: { value: new THREE.Color(0xb4c4ee) }, uAuraC: { value: new THREE.Color(0xf2b3dc) },
      uAerial: { value: new THREE.Vector2(160, 1100) }, uErode: { value: 0.9 },   /* M19 */
      uSkyZ: { value: new THREE.Color() }, uSkyH: { value: new THREE.Color() }, uSkyHz: { value: new THREE.Color() }, uSkyT: { value: new THREE.Color() }, uSkyL: { value: new THREE.Color() }, uSkyS: { value: new THREE.Vector3(0, 1, 0) }, uSkyMie: { value: 0 }, uSkyLavK: { value: 0 }, uSkyHazeK: { value: 0 }, uSkyOn: { value: 0 } } });   /* M19: replaced by the dome's own uniform objects (shareSky) */
  own.push(mat);
  var mesh = new THREE.InstancedMesh(geo, mat, puffs.length); mesh.name = 'SKY_' + L.id; mesh.frustumCulled = false; mesh.userData.noMerge = true; mesh.renderOrder = opts.renderOrder || 4; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.userData.cloudSilhouette = { kind: tower ? 'LIT_TOWER_CLUSTER' : 'LIT_PUFF_CLUSTER', rectangular: false, feathered: true, clouds: clouds.length, puffs: puffs.length, tier_scale: tierScale, shapes: 'ATLAS_4_NOISE_ERODED', self_shadow_taps: taps, style: style, body: tower ? 'ATLAS_CLOUDLETS' : 'ANALYTIC_SLICES', card: 'OCTAGON', forms: clouds.map(function (c) { return c.form || 'TOWER'; }).join(',') };
  var _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _qp = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0); var order = puffs.map(function (p, i) { return i; }); var sortClock = 1e9;
  function write(camPos) {  /* recompute world puff positions from the drifting cloud origins; with camPos also re-sort back-to-front */
    for (var i = 0; i < puffs.length; i++) { var P = puffs[i], c = P.cloud, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); P.wx = c.x + P.x * cs - P.z * sn; P.wy = c.y + P.y; P.wz = c.z + P.x * sn + P.z * cs; P.d2 = camPos ? (P.wx - camPos.x) * (P.wx - camPos.x) + (P.wy - camPos.y) * (P.wy - camPos.y) + (P.wz - camPos.z) * (P.wz - camPos.z) : 0; }
    if (camPos) order.sort(function (a, b) { return puffs[b].d2 - puffs[a].d2; });   /* back-to-front */
    for (var j = 0; j < order.length; j++) { var Q = puffs[order[j]]; _p.set(Q.wx, Q.wy, Q.wz); if (Q.plate) { _qp.setFromAxisAngle(_up, -Q.cloud.yaw); _s.set(Q.w, 1, Q.h); _m.compose(_p, _qp, _s); } else { _s.set(Q.w, Q.h, 1); _m.compose(_p, _q, _s); } mesh.setMatrixAt(j, _m); aPuff.setXYZW(j, Q.height, Q.v + Q.seed * 0.998, Q.plate && Q.cloud.formI < 3 ? 1.2 : 0.5 + 0.34 * (1 - Q.flat * 0.25), Q.flat); aCloud.setXYZ(j, Q.cloud.y - Q.cloud.len * 0.02, Q.cloud.extent, Q.cloud.formI + Q.cloud.seed * 0.998); aCentre.setXYZW(j, Q.cloud.x, Q.cloud.y + Q.cloud.extent * 0.45, Q.cloud.z, Q.cloud.rad); aBody.setXYZW(j, Math.cos(Q.cloud.yaw), Math.sin(Q.cloud.yaw), Q.cloud.hx, Q.cloud.hz); }
    mesh.instanceMatrix.needsUpdate = true; aPuff.needsUpdate = true; aCloud.needsUpdate = true; aCentre.needsUpdate = true; aBody.needsUpdate = true; }
  write(null);
  function setLook(look) { var U = mat.uniforms; U.uTop.value.set(look.top); U.uShade.value.set(look.shade); U.uRim.value.set(look.rim); U.uHaze.value.set(look.haze); U.uOpacity.value = look.opacity; U.uRimK.value = look.rimK;
    U.uHazeNear.value = look.hazeNear !== undefined ? look.hazeNear : 260; U.uHazeFar.value = look.hazeFar !== undefined ? look.hazeFar : 1250; U.uHazeMax.value = look.hazeMax !== undefined ? look.hazeMax : 0.7;
    U.uHor.value.set(look.hor ? look.hor[0] : 0.0, look.hor ? look.hor[1] : 0.16); U.uBaseDark.value = look.baseDark !== undefined ? look.baseDark : 0.18; U.uShadowK.value = look.shadowK !== undefined ? look.shadowK : 0.55;
    U.uOblong.value = look.oblong !== undefined ? look.oblong : 1; U.uDiffuse.value = look.diffuse !== undefined ? look.diffuse : 1; U.uAuraK.value = look.auraK !== undefined ? look.auraK : 0.2;   /* M14 */
    if (look.auraA) U.uAuraA.value.set(look.auraA); if (look.auraB) U.uAuraB.value.set(look.auraB); if (look.auraC) U.uAuraC.value.set(look.auraC);
    if (look.aerial) U.uAerial.value.set(look.aerial[0], look.aerial[1]); U.uErode.value = look.erode !== undefined ? look.erode : 0.9; }   /* M19 */
  /* M19: share the sky dome's scattering uniforms BY REFERENCE (atmosphere.js calls sky.shareSky once its shader exists), so day / night
     switches and the LOW tier's Mie-off reach the clouds' aerial perspective with no copy; null falls back to the flat haze colour. */
  function shareSky(D) { var U = mat.uniforms; if (!D) { U.uSkyOn = { value: 0 }; return; } U.uSkyZ = D.uZenith; U.uSkyH = D.uHorizon; U.uSkyHz = D.uHaze; U.uSkyT = D.uSunTint; U.uSkyL = D.uLav; U.uSkyS = D.uSun; U.uSkyMie = D.uMie; U.uSkyLavK = D.uLavK; U.uSkyHazeK = D.uHazeK; U.uSkyOn = { value: 1 }; }
  /* camPos: {x,y,z} (ctx.cameraPos()) for the back-to-front sort · lightDir: the world direction of the active key (Sun by day, Moon by night) */
  function tick(dt, t, camPos, lightDir) { mat.uniforms.uTime.value = t || 0; if (lightDir) mat.uniforms.uLightWorld.value.set(lightDir[0], lightDir[1], lightDir[2]).normalize();
    sortClock += dt || 0; var sortNow = sortClock > 0.25 && camPos; write(sortNow ? camPos : null); if (sortNow) sortClock = 0; }
  function dispose() { if (mesh.parent) mesh.parent.remove(mesh); own.forEach(function (o) { try { o.dispose(); } catch (e) { } }); own = []; releaseAtlas(tex); }
  return { mesh: mesh, mat: mat, clouds: clouds, puffs: puffs, setLook: setLook, shareSky: shareSky, tick: tick, write: write, dispose: dispose };
}
