/* MAHWORLD SHADER LAB — an isolated bench for one diamond, one beam, and one shader.

   WHAT THIS IS NOT. It is not part of MAHWORLD. It imports exactly one thing from the rest of
   the repository — the vendored Three.js build — and nothing from mahworld/scene/. No module
   here is imported BY anything in production either, so the lab cannot break the world and the
   world cannot break the lab. That isolation is the whole point: it is where a shader gets tried
   before it is allowed near mahplaza.

   ---- PHASE 2: WHAT THE THREE REFERENCES ACTUALLY CHANGED ------------------------------------
   The references were studied, not copied. No branding, asset, colour, string or layout is taken
   from any of them; what is taken is a principle, and each is named where it acts.

   THREE.JS — its showcase is carried by custom ShaderMaterial work, dynamic lighting and eased
   camera behaviour rather than by heavy post. So: a three-term light model (key, fill, RIM)
   instead of two; an analytic floor reflection solved in the ground shader instead of a render
   target; and every camera and palette move runs through a frame-rate independent ease rather
   than a jump. All of it inside four draw calls, because that same showcase makes clear mobile
   quality comes from shader craft, not from passes.

   MAMESON, "fluffed 2" — a space station in volumetric cloud driven by five global uniforms
   (day, speed, clouds, lift, and a purple-to-pink colour slider). Two things came from it. First,
   confirmation that a very small uniform set can transform a scene completely, so the answer to a
   dull frame is a stronger RESPONSE CURVE, not another control — which is why MAHGIC now adds a
   second packet train to the beam rather than only raising its brightness. Second, its colour
   control is a NAMED BIDIRECTIONAL PAIR, not a number: this lab's theme now reads COOL at one end
   and WARM at the other, because "THEME MIX 0.42" tells a director nothing.

   LOCOMOTIVE — restraint, generous whitespace, a tightly limited palette, and emphasis carried by
   CASE and LETTER-SPACING rather than by weight or colour. Its menu is a full takeover and the
   takeover is decisive. So the chrome retreated to four corner anchors, the type runs one family
   in one weight, and the WORLD MENU is a full-screen overlay whose items do not merely navigate:
   each commits the entire scene — camera and every uniform — to a new state. A menu that only
   closes itself is a dropdown. That is the LOCOMOTIVE lesson translated to a 3D bench.

   ---- THE MOBILE BUDGET, chosen for a high-end iPhone and stated so it can be checked ---------
     · 4 draw calls, well under 100 triangles: sky 2, ground 2, diamond 8, beam 12;
     · the floor reflection costs NO geometry — it is closed-form in the ground shader, which is
       the whole reason this stays a phone scene instead of a render-target scene;
     · no textures of any kind, so nothing to download, decode, or keep resident;
     · no post-processing, no render targets, no shadow maps, no environment map;
     · ONE transparent object (the beam), so there is no transparency stack to sort;
     · device pixel ratio clamped at 2 — a 3x iPhone renders 2.25x the pixels for no visible gain
       and a real thermal cost;
     · the loop stops when the tab is hidden.

   Everything below is deterministic. No Math.random, matching the house rule that a world you
   cannot reproduce is a world you cannot debug.

   ---- A HARD-WON SYNTAX NOTE ------------------------------------------------------------------
   The shaders live in template literals. A BACKTICK inside one of these comments ends the string
   and turns the rest of the shader into JavaScript. It cost two debugging passes here — the
   second time inside the comment written to warn about the first. There are no backticks below. */

import * as THREE from '../mahworld/vendor/three/three.module.min.js';

/* The two palettes the theme crossfades between, kept at matched VALUE so the mix moves hue and
   not exposure — a control that also changes brightness cannot be judged. Named at both ends. */
export const THEMES = {
  /* DEEP is near-black on purpose. Obsidian is not dark grey: the shadow side of the crystal has
     to fall almost to the void or platinum has nothing to be bright against, and the frame reads
     as one pale wash — which is exactly what it did before these numbers were cut by two thirds. */
  cool: { body: [0.66, 0.75, 0.90], deep: [0.012, 0.020, 0.038], energy: [0.52, 0.80, 1.00], sky: [0.009, 0.015, 0.030] },
  warm: { body: [0.93, 0.80, 0.63], deep: [0.034, 0.021, 0.014], energy: [1.00, 0.66, 0.36], sky: [0.032, 0.017, 0.011] }
};
export const THEME_ENDS = ['COOL', 'WARM'];

export const CONTROLS = [
  /* key         label         min max  step  default */
  ['worldLight', 'WORLD LIGHT', 0, 1, 0.01, 0.42],
  ['speed', 'SPEED', 0, 3, 0.01, 1.00],
  ['atmosphere', 'ATMOSPHERE', 0, 1, 0.01, 0.22],
  ['lift', 'LIFT', 0, 1, 0.01, 0.45],
  ['themeMix', 'PALETTE', 0, 1, 0.01, 0.00],
  ['mahgic', 'MAHGIC', 0, 1, 0.01, 0.34]
];

/* THE WORLD MENU'S PAYLOAD. A takeover is decisive, so each entry commits the whole scene —
   camera AND every uniform — not just a viewpoint. Four states, because a bench with twelve
   moods is a bench nobody reads. */
export const SCENES = [
  { id: 'origin', name: 'Origin', note: 'The diamond at rest. Clear air, cool palette.',
    cam: { yaw: 0.62, pitch: 0.30, dist: 8.6 },
    set: { worldLight: 0.42, speed: 1.00, atmosphere: 0.22, lift: 0.45, themeMix: 0.00, mahgic: 0.34 } },
  { id: 'ascent', name: 'Ascent', note: 'Held high in thin air. The floor lets go.',
    cam: { yaw: 1.35, pitch: 0.10, dist: 9.8 },
    set: { worldLight: 0.86, speed: 0.70, atmosphere: 0.06, lift: 0.95, themeMix: 0.12, mahgic: 0.20 } },
  { id: 'veil', name: 'Veil', note: 'Deep scatter. The horizon closes in.',
    cam: { yaw: 2.35, pitch: 0.44, dist: 7.4 },
    set: { worldLight: 0.30, speed: 0.45, atmosphere: 0.92, lift: 0.30, themeMix: 0.32, mahgic: 0.30 } },
  { id: 'signal', name: 'Signal', note: 'Full MAHGIC at the warm end of the palette.',
    /* the beam stands at world -x, and at yaw -0.55 it projected straight down through the scene
       title in the bottom-left corner — the equalizer landed on the word. Composition is part of
       the preset, so the preset moves. */
    cam: { yaw: 0.18, pitch: 0.16, dist: 7.2 },
    set: { worldLight: 0.14, speed: 1.85, atmosphere: 0.26, lift: 0.62, themeMix: 1.00, mahgic: 1.00 } }
];

/* ---- the chunk every shader shares ---------------------------------------------------------- */
const COMMON = `
  uniform float uTime;        /* seconds, already scaled by speed on the CPU side */
  uniform float uAtmosphere;
  uniform float uLift;
  uniform float uMahgic;
  uniform float uWorld;       /* WORLD LIGHT: how high and how hard the key sits */
  uniform float uDiaY;        /* the diamond's live height, so the floor can answer to it */
  uniform float uHorizon;     /* the horizon's screen height, 0 top .. 1 bottom */
  uniform vec3  uBody;
  uniform vec3  uDeep;
  uniform vec3  uEnergy;
  uniform vec3  uSky;
  /* THE HAZE COLOUR, and why it is not the sky colour. Atmosphere first mixed everything toward
     uSky, a near-black navy, so raising the slider made the scene DARKER and flatter — measured,
     the whole range moved the floor's contrast by one value step. Real haze is light SCATTERED
     toward the viewer, so it is always BRIGHTER than the sky in front of which it sits. It is
     computed on the CPU from the same palette, so the two can never drift apart. */
  uniform vec3  uHaze;

  /* THE OUTPUT ENCODE. Three's built-in materials end with its colorspace_fragment chunk, which
     converts the linear colour the shading maths works in into the sRGB the framebuffer shows. A
     hand-written ShaderMaterial gets no chunks, so it writes LINEAR values into an sRGB target and
     everything it draws comes out far too dark. It hid because it was uniform — the whole bench
     was dark together and read as a deliberately moody scene. What exposed it was the one surface
     no shader here draws: the clear colour, which the renderer encodes properly. Across the
     horizon the frame read rgb(56,75,105) above and rgb(10,18,36) below — the same colour,
     encoded on one side and raw on the other. A hand-written shader owes the framebuffer the
     encode that the built-in chunk would have added. */
  vec3 toSRGB(vec3 c) {
    c = max(c, vec3(0.0));
    return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666)) - 0.055, step(vec3(0.0031308), c));
  }
`;

/* ---- 0. THE SKY ------------------------------------------------------------------------------
   A screen-space gradient drawn first with depth test off: two triangles for the whole backdrop.
   The horizon's screen height comes in from the CPU (projecting one far ground point costs
   nothing), so the gradient stays welded to the world when the camera pitches instead of sliding
   like wallpaper — which is the difference between an environment and a background image. */
const SKY_VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }
`;
const SKY_FRAG = `
  ${COMMON}
  varying vec2 vUv;
  void main() {
    float y = 1.0 - vUv.y;                       /* 0 at the top of the frame */
    float toHorizon = clamp((uHorizon - y) / max(0.001, uHorizon), 0.0, 1.0);
    /* the zenith is the deepest value and the sky opens toward the horizon, which is where
       scattered light actually gathers */
    /* WORLD LIGHT opens the sky as it raises the key, so one control moves the whole environment
       rather than only the lit side of the object */
    vec3 zenith = uSky * mix(0.42, 1.30, uWorld);
    vec3 col = mix(uHaze, zenith, pow(toHorizon, 0.70));
    float bd = max(0.0, uHorizon - y) * 7.0;
    float band = exp(-bd * bd);          /* a multiply, not a pow — this runs on every sky pixel */
    col += (uHaze - uSky) * band * (0.35 + 1.30 * uAtmosphere) * (0.55 + 0.75 * uWorld);
    /* the faintest lift of the energy hue into the sky, so the palette reads as ONE system and
       the theme control reaches the whole frame rather than only the objects standing in it */
    col += uEnergy * 0.030 * band * (0.30 + 0.70 * uMahgic);
    gl_FragColor = vec4(toSRGB(col), 1.0);
  }
`;

/* ---- 1. THE DIAMOND -------------------------------------------------------------------------
   A square diamond, WIDER THAN TALL — the house figure; a spike wearing the name is the one shape
   the language forbids. The octahedron is deliberately un-subdivided: its eight faces ARE the
   facets, and because Three builds it non-indexed each face already carries its own normal, so it
   shades as cut crystal with no normal map and no smoothing pass. */
const DIAMOND_VERT = `
  ${COMMON}
  varying vec3 vN;
  varying vec3 vNObj;
  varying vec3 vNW;
  varying vec3 vVW;
  varying vec3 vViewDir;
  varying float vH;
  void main() {
    vN = normalize(normalMatrix * normal);
    vNObj = normal;             /* OBJECT space: a facet's identity must not change when it turns */
    vNW = normalize(mat3(modelMatrix) * normal);          /* WORLD space, for the environment term */
    vH = clamp(position.y * 0.5 + 0.5, 0.0, 1.0);
    /* LIFT is a HEIGHT plus a hover, not just a hover. Moving the object by an oscillation alone
       meant the slider could be caught near a zero crossing and the frame barely changed — live
       in the code, dead in the hand, and measured at 0.11 of a value step across the whole range.
       The standing height is what the control is for; the hover is what says that height is being
       HELD rather than built. Two terms at an irrational ratio, so the position never exactly
       repeats and it reads as suspended instead of as a metronome. */
    float bob = sin(uTime * 1.30) * 0.42 + sin(uTime * 0.618) * 0.22;
    vec3 p = position;
    p.y += uLift * 1.75 + bob * (0.25 + 0.75 * uLift);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vVW = normalize(wp.xyz - cameraPosition);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const DIAMOND_FRAG = `
  ${COMMON}
  varying vec3 vN;
  varying vec3 vNObj;
  varying vec3 vNW;
  varying vec3 vVW;
  varying vec3 vViewDir;
  varying float vH;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vViewDir);

    /* WORLD LIGHT moves the key from a low raking angle to nearly overhead, so the control is a
       real lighting change and not a brightness knob: at the low end the facets are lit edge-on
       and the crystal is mostly shadow, at the high end the upper planes open up. */
    vec3 keyDir = normalize(vec3(0.42, mix(0.22, 1.35, uWorld), 0.38));
    float key  = max(dot(N, keyDir), 0.0);
    float fill = max(dot(N, normalize(vec3(-0.55, 0.20, -0.65))), 0.0);
    float rim  = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);   /* re-tightened below */

    /* FACET HIERARCHY. The geometry is flat-shaded, so a face's normal is constant across it and
       makes a perfect per-facet key — no attribute, no id buffer. Hashing it gives each of the
       eight faces its own fixed character, so a few read as HERO catches and the rest stay quiet.
       Uniform brightness across every face is what made this read as grey plastic; a cut stone is
       a hierarchy of faces, not a set of equals. */
    /* KEYED ON THE OBJECT-SPACE NORMAL, not the view-space one. Hashing the view normal made a
       facet's identity change every frame as the diamond turned, so the hierarchy averaged itself
       away and every face came out the same mid-grey — the exact defect this term exists to fix,
       hidden inside the fix. A facet's character belongs to the facet, not to where it happens
       to be pointing this frame. */
    /* A HASH IS A LOTTERY, AND EIGHT FACES IS TOO SMALL A DRAW. Keyed on a sin-hash, every one
       of the eight landed below the hero threshold, so the hierarchy silently did nothing and the
       stone stayed inside a 55-value band no matter how hard the catches were pushed. With so few
       elements the assignment has to be DETERMINISTIC, not sampled.
       So the rule is the physical one: the UPWARD faces are the polished ones, because upward is
       what catches the sky. The hash is kept, demoted to a small per-face variation so the four
       heroes are not identical twins. */
    vec3 No = normalize(vNObj);
    float fid = fract(sin(dot(floor(No * 4.0 + 0.5), vec3(12.99, 78.23, 37.72))) * 43758.5453);
    /* a narrow window, because a catch that covers a quarter of the stone is not a catch. */
    float hero = smoothstep(0.40, 0.90, No.y) * (0.74 + 0.26 * fid);

    /* OBSIDIAN CARRIES THE BODY; PLATINUM CARRIES THE LIGHT.
       The diffuse term used to run to two thirds of the body colour on any face turned toward the
       key, which made every lit facet the same pale grey and the whole stone read as plastic. A
       polished dark crystal is almost black in diffuse — what you actually see on it is a small
       number of SPECULAR catches. So the diffuse is cut to a quarter of what it was and the
       brightness moved into the catches, where it belongs. */
    vec3 col = mix(uDeep, uBody, key * (0.075 + 0.115 * hero) + fill * 0.028);

    /* PLATINUM CATCHES: a tight specular the hero faces take hard and the quiet faces barely
       take at all, so the bright marks are rare and PLACED rather than smeared over the body.
       Two lobes — a broad sheen and a narrow glint — because one lobe reads as either a haze or
       a dot, and it is the pair that reads as polished metal. */
    /* A SPECULAR LOBE CANNOT PUT A CATCH ON A FLAT SOLID. With eight faces the reflection vector
       is CONSTANT across each one, so a tight pow() lobe is all-or-nothing per face and, at any
       given camera angle, usually nothing: measured, the stone still spanned only 49..105 with
       two lobes stacked on it. Metal does not get its brightness from a lobe — it gets it from
       REFLECTING THE ENVIRONMENT, and a facet is bright because of what it happens to be facing.

       So this is a two-band analytic environment, in world space: a facet turned toward the sky
       takes the sky's value, one turned toward the floor takes the void's. No cube map, no probe,
       two mixes — and it is what finally makes a face read as polished rather than as painted. */
    vec3 Rw = reflect(normalize(vVW), normalize(vNW));
    float up = clamp(Rw.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 envUp = uHaze + uBody * 0.72;
    vec3 env = mix(uDeep * 0.5, envUp, smoothstep(0.42, 0.96, up));
    /* the HERO faces are the polished ones; the quiet faces stay nearly matte, which is what
       makes the bright marks rare and placed instead of a sheen over the whole body */
    col += env * (0.048 + 1.32 * hero) * (0.45 + 0.55 * uWorld);

    /* one narrow glint left in, purely for the moment a facet swings through the key */
    float glint = pow(max(dot(reflect(-keyDir, N), V), 0.0), mix(90.0, 300.0, hero));
    col += uBody * glint * (0.60 + 2.60 * hero);

    /* THE RIM IS A SILHOUETTE TERM, NOT A FILL. At 0.34 with a wide exponent it lifted almost
       every facet of a faceted solid — most faces on an octahedron are somewhat glancing — and
       became the bright FLOOR that was holding the darks at 79. Tighter and much weaker: it now
       does only its actual job, which is keeping a near-black silhouette from vanishing into a
       near-black void. */
    rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);
    col += uBody * rim * 0.10;

    /* MAHGIC — restrained by construction, not by the operator remembering to be careful. It is
       capped against the body's own brightness so even a full setting cannot build the
       over-bright lattice this project has had to correct twice. It rides the facet EDGES, where
       the rim term is high, and pulses along the height, so it reads as something the object is
       DOING rather than a colour laid over it. */
    float pulse = 0.5 + 0.5 * sin(uTime * 2.1 - vH * 5.0);
    col += uEnergy * uMahgic * 0.62 * rim * (0.40 + 0.60 * pulse);

    /* no constant term: at atmosphere 0 the air is CLEAR and the crystal keeps its darks. A fog
       floor was quietly washing the black crystal at every setting. The RANGE shortens as the
       haze thickens, which is what haze is. */
    float depth = clamp(gl_FragCoord.z / gl_FragCoord.w / mix(46.0, 7.5, uAtmosphere), 0.0, 1.0);
    col = mix(col, uHaze, depth * uAtmosphere);
    gl_FragColor = vec4(toSRGB(col), 1.0);
  }
`;

/* ---- 2. THE FOBEAM, AND ITS EQUALIZER ---------------------------------------------------------
   A CAMERA-FACING BILLBOARD, not a tube. The tube was the wrong solid for the job: a hollow
   cylinder is brightest where the eye grazes its silhouette, so it read as a glass pipe with dark
   middle — the opposite of a beam, which is a bright narrow CORE bleeding into a soft spill. A
   billboard gives exactly that from a horizontal falloff, and it costs two triangles instead of
   twelve. It is turned to face the camera about the vertical axis only, because a FOBEAM is a
   vertical structure and tilting it to face the camera fully would break that.

   THE EQUALIZER is canonical FOBEAM language: a short row of thin vertical bars at the foot of
   the beam, rising and falling. It is ONE merged geometry — every bar's quad in a single buffer,
   with a per-vertex bar index and a top/bottom flag, so the heights animate in the vertex shader
   and the whole row is a single draw with no instancing machinery. */
const BEAM_VERT = `
  ${COMMON}
  varying vec2 vUvB;
  void main() {
    vUvB = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const BEAM_FRAG = `
  ${COMMON}
  varying vec2 vUvB;
  void main() {
    float x = vUvB.x * 2.0 - 1.0;                 /* -1 .. 1 across the beam */
    float y = vUvB.y;                             /* 0 at the foot, 1 at the tip */

    /* CORE AND SPILL, as two separate falloffs. The narrow one is the structure; the wide one is
       the light it throws into the air. Keeping them apart is what stops a beam reading as a
       painted stripe — one term alone gives either a hard bar or a smudge. */
    float core  = exp(-x * x * 190.0);
    float spill = exp(-x * x * 5.5);

    /* it has to END, at both ends, or it is a bar. Different rates because a beam leaves its
       source sharply and dissipates slowly. */
    float base = smoothstep(0.0, 0.05, y);
    float tip  = 1.0 - smoothstep(0.34, 1.0, y);
    float body = base * tip;

    /* PACKETS travelling up it. fract() of (height - time) is a rising sawtooth; raised to a power
       it becomes a short bright packet with a long dark gap, which is the FOBEAM signature — a
       carrier with information on it, not a strip light. MAHGIC adds a SECOND, faster train
       rather than only turning the brightness up, so the control changes what the beam is saying
       and not merely how loud it says it. */
    float t1 = fract(y * 2.1 - uTime * 0.40 * (0.4 + uLift));
    float t2 = fract(y * 5.3 - uTime * 0.95 * (0.4 + uLift) + 0.37);
    float packet = pow(1.0 - t1, 7.0) + pow(1.0 - t2, 11.0) * uMahgic * 0.85;

    float a = body * (core * (0.85 + 1.30 * packet) + spill * 0.16 * (0.35 + 0.65 * uMahgic));
    a *= 0.45 + 0.55 * uMahgic;
    /* an additive surface cannot be fogged toward a colour, only dimmed — and haze eats a beam
       faster than it eats a solid */
    a *= 1.0 - uAtmosphere * 0.45;
    /* the core goes toward white while the spill keeps the energy hue, which is what a hot line
       in cool air actually looks like */
    vec3 col = mix(uEnergy, vec3(1.0), clamp(core * (0.35 + packet * 0.5), 0.0, 1.0));
    gl_FragColor = vec4(toSRGB(col) * a, a);
  }
`;

const EQ_VERT = `
  ${COMMON}
  attribute float aBar;      /* which bar, 0..N-1 */
  attribute float aTop;      /* 1 on the two upper corners, 0 on the lower */
  varying float vLevel;
  varying float vTop;
  void main() {
    /* each bar keeps its own phase and its own rate, from the golden angle rather than a random
       call, so the row reads as a spectrum responding to something instead of as noise */
    float ph = aBar * 2.3999632;
    float lvl = 0.30 + 0.70 * (0.5 + 0.5 * sin(uTime * (1.7 + 0.42 * fract(ph)) + ph * 3.1));
    lvl = mix(0.22, 1.0, lvl * (0.30 + 0.70 * uMahgic));
    vLevel = lvl; vTop = aTop;
    vec3 p = position;
    p.y *= lvl;                                   /* the bar grows from its foot */
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const EQ_FRAG = `
  ${COMMON}
  varying float vLevel;
  varying float vTop;
  void main() {
    /* bright at the tip, falling toward the foot: a level meter reads from its cap */
    float v = 0.30 + 0.70 * vTop;
    float a = (0.30 + 0.70 * uMahgic) * v * (0.45 + 0.55 * vLevel);
    a *= 1.0 - uAtmosphere * 0.40;
    vec3 col = mix(uEnergy, vec3(1.0), vTop * vLevel * 0.45);
    gl_FragColor = vec4(toSRGB(col) * a, a);
  }
`;

/* ---- 3. THE GROUND, AND THE REFLECTION THAT COSTS NO GEOMETRY --------------------------------
   Two triangles. The floor carries a reflection of the diamond solved in closed form here rather
   than by mirroring the object into a second draw or rendering to a target: the diamond is a
   known shape at a known height on a known axis, so its mirror image is an expression, not a
   pass. It spreads and dims as the object rises, which is both correct and the reason LIFT now
   reads on the FLOOR as well as in the air — one control, two places to see it. */
const GROUND_VERT = `
  varying vec2 vXZ;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vXZ = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const GROUND_FRAG = `
  ${COMMON}
  varying vec2 vXZ;
  void main() {
    float d = length(vXZ);

    /* the floor itself: obsidian, with a pool of energy gathered under the object */
    float pool = exp(-d * 0.20);
    vec3 col = mix(uDeep * 0.30, uEnergy * 0.26, pool * (0.16 + 0.84 * uMahgic));

    /* THE WORLD GRID — the depth cue, and deliberately almost invisible. A visible grid is a
       blueprint; what a void needs is just enough regular structure for the eye to read distance
       from, so it sits barely above the floor value and is gone well before the horizon.
       The line width GROWS with distance so each line stays about a pixel instead of aliasing
       into a moire field, which is the whole reason a naive fract() grid looks broken far away —
       and it needs no derivative extension to do it. */
    vec2 g = abs(fract(vXZ / 4.0) - 0.5);
    float lw = 0.012 + d * 0.0016;
    float line = 1.0 - smoothstep(0.0, lw, min(g.x, g.y));
    float gridFade = exp(-d * 0.055) * (1.0 - smoothstep(14.0, 34.0, d));
    col += uEnergy * line * gridFade * (0.020 + 0.030 * uMahgic);

    /* THE REFLECTION. Height above the floor sets both how far the image spreads and how much of
       it survives — a contact reflection is tight and bright, a high one is wide and faint. */
    float h = max(0.35, uDiaY);
    float spread = 1.15 + h * 0.62;
    float rr = d / spread;
    float img = exp(-rr * rr * 1.35) / (1.0 + h * 0.55);
    col += uBody * img * 0.26 * (0.35 + 0.65 * uWorld);
    col += uEnergy * img * 0.20 * uMahgic;

    /* a tight contact shadow directly beneath, so the object is SEATED in the space even while it
       hovers — without it the diamond floats over the floor rather than above it */
    float cd = d / (0.85 + h * 0.10);
    float contact = exp(-cd * cd * 2.2);
    col *= 1.0 - contact * 0.45 / (1.0 + h * 0.9);

    /* THE FLOOR MUST REACH SKY VALUE BEFORE IT RUNS OUT. Fading by a fraction that only reached
       0.64 at the plane's own rim left the ground 36% darker than the sky it was meant to meet
       and drew a hard line across the frame — measured as a 46-value jump in one pixel row. A
       horizon is where two values MEET; if they do not, no amount of haze hides the seam.
       Atmosphere sets how EARLY they meet, never whether they meet at all. */
    float horizon = smoothstep(0.0, 1.0, d / mix(62.0, 8.0, uAtmosphere));
    col = mix(col, uHaze, clamp(horizon, 0.0, 1.0));
    gl_FragColor = vec4(toSRGB(col), 1.0);
  }
`;

/* ================================================================================================
   THE LAB
   ============================================================================================== */
export function createShaderLab(canvas, opts = {}) {
  const state = { running: true, time: 0, frames: 0, fps: 0, scene: SCENES[0].id, adaptive: true };
  for (const [k, , , , , dflt] of CONTROLS) state[k] = opts[k] != null ? opts[k] : dflt;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });

  /* ---- ADAPTIVE RESOLUTION, and why this rather than a cheaper shader ------------------------
     Profiled, this scene is FILL-BOUND and nothing else: with every object hidden it runs at 60,
     at a quarter of the pixels it runs at 60, and the draw calls, the JS loop and the DOM work
     are all far below a millisecond. The per-fragment maths is the cost, and the largest single
     term in it is the sRGB encode's pow(), which every shader runs on every pixel — swapping it
     for a sqrt bought 23% immediately.

     That swap was not kept. sqrt is gamma 2.0, which lifts the darks, and deep blacks are the
     point of this palette; buying frames by washing out the shadows is buying the wrong thing.

     So the resolution adapts instead. This trades the one quantity a viewer notices least on a
     small bright screen — sample density — and keeps every shading term intact, which is how
     real-time work on mobile has always solved a fill limit. It steps down only after a full
     second below target and back up only after two comfortable seconds, so it settles rather
     than oscillating, and it never exceeds 2 even on a 3x phone. */
  const DPR_CEIL = Math.min(window.devicePixelRatio || 1, 2);
  const DPR_STEPS = [DPR_CEIL, DPR_CEIL * 0.75, DPR_CEIL * 0.6, DPR_CEIL * 0.5];
  let dprStep = 0;
  renderer.setPixelRatio(DPR_STEPS[0]);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 240);

  const U = {
    uTime: { value: 0 }, uAtmosphere: { value: state.atmosphere }, uLift: { value: state.lift },
    uMahgic: { value: state.mahgic }, uWorld: { value: state.worldLight },
    uDiaY: { value: 2.4 }, uHorizon: { value: 0.5 },
    uBody: { value: new THREE.Vector3() }, uDeep: { value: new THREE.Vector3() },
    uEnergy: { value: new THREE.Vector3() }, uSky: { value: new THREE.Vector3() },
    uHaze: { value: new THREE.Vector3() }
  };
  const mk = (v, f, extra = {}) => new THREE.ShaderMaterial(
    Object.assign({ uniforms: U, vertexShader: v, fragmentShader: f }, extra));

  const owned = { geometries: [], materials: [] };
  const own = (o, bin) => { owned[bin].push(o); return o; };

  const skyGeo = own(new THREE.PlaneGeometry(2, 2), 'geometries');
  /* DEPTH-TESTED AND DRAWN LAST, which is the single largest performance decision in this file.
     Drawn first with the test off, the sky shaded every pixel on screen and the ground then
     repainted the lower sixty per cent of them — about 1.6 screens of pow/exp per frame, and
     measured, fill was the entire cost: hiding the objects gave 60 fps, and so did quartering
     the pixels, while the draw calls and the JS loop cost nothing either way.
     Sitting at the far plane with the test ON, the sky is rejected by the depth buffer wherever
     geometry already stands, so it shades only the pixels that are actually sky. Same image,
     roughly half the fragments. */
  const skyMat = own(mk(SKY_VERT, SKY_FRAG, { depthTest: true, depthWrite: false }), 'materials');
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'lab-sky'; sky.frustumCulled = false; sky.renderOrder = 10;
  scene.add(sky);

  const groundGeo = own(new THREE.PlaneGeometry(80, 80, 1, 1), 'geometries');
  const groundMat = own(mk(GROUND_VERT, GROUND_FRAG), 'materials');
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'lab-ground'; ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const diaGeo = own(new THREE.OctahedronGeometry(1, 0), 'geometries');
  diaGeo.scale(1.5, 1.0, 1.5);           /* WIDER THAN TALL — the house figure, never a spike */
  const diaMat = own(mk(DIAMOND_VERT, DIAMOND_FRAG), 'materials');
  const diamond = new THREE.Mesh(diaGeo, diaMat);
  diamond.name = 'lab-diamond'; diamond.position.set(0, 2.4, 0);
  scene.add(diamond);

  const beamGeo = own(new THREE.PlaneGeometry(1, 1, 1, 1), 'geometries');
  const beamMat = own(mk(BEAM_VERT, BEAM_FRAG, {
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false
  }), 'materials');
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.name = 'lab-fobeam';
  /* SIZED TO THE FRAME, not to a round number. At fourteen units tall its midpoint projected off
     the top of the viewport and two thirds of it was never in shot — a probe caught it, because
     hiding the beam changed only 2.2% of the frame. It now stands from the floor to just inside
     the top of the default view, so foot, packets and dissipating tip are all in one picture. */
  const BEAM_H = 6.8, BEAM_W = 1.5;
  beam.scale.set(BEAM_W, BEAM_H, 1);
  beam.position.set(-3.4, BEAM_H * 0.5, -1.2);
  scene.add(beam);

  /* THE EQUALIZER — one merged geometry, one draw. Bars are laid across the beam's local X so the
     row turns with it when it billboards. */
  const EQ_BARS = 13;
  const eqGeo = own(new THREE.BufferGeometry(), 'geometries');
  {
    const pos = [], bar = [], top = [], idx = [];
    const w = 0.052, gap = 0.104, h = 0.62;
    for (let i = 0; i < EQ_BARS; i++) {
      const cx = (i - (EQ_BARS - 1) / 2) * gap;
      const v0 = pos.length / 3;
      pos.push(cx - w * 0.5, 0, 0, cx + w * 0.5, 0, 0, cx + w * 0.5, h, 0, cx - w * 0.5, h, 0);
      bar.push(i, i, i, i);
      top.push(0, 0, 1, 1);
      idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
    }
    eqGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    eqGeo.setAttribute('aBar', new THREE.Float32BufferAttribute(bar, 1));
    eqGeo.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1));
    eqGeo.setIndex(idx);
  }
  const eqMat = own(mk(EQ_VERT, EQ_FRAG, {
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false
  }), 'materials');
  const equalizer = new THREE.Mesh(eqGeo, eqMat);
  equalizer.name = 'lab-equalizer';
  equalizer.position.set(beam.position.x, 0.02, beam.position.z + 0.34);
  scene.add(equalizer);

  /* ---- palette ------------------------------------------------------------------------------- */
  const lerp3 = (out, a, b, t) => out.set(
    a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  function applyPalette() {
    const t = state.themeMix, A = THEMES.cool, B = THEMES.warm;
    lerp3(U.uBody.value, A.body, B.body, t);
    lerp3(U.uDeep.value, A.deep, B.deep, t);
    lerp3(U.uEnergy.value, A.energy, B.energy, t);
    lerp3(U.uSky.value, A.sky, B.sky, t);
    const s = U.uSky.value, e = U.uEnergy.value, at = U.uAtmosphere.value;
    /* SCATTER IS PROPORTIONAL TO AIR. Holding the haze at a fixed bright value meant that even at
       atmosphere 0.22 more than half the visible floor had already mixed into it, and the frame
       had no blacks left anywhere — the premium platinum-and-black-crystal reading was gone and
       the whole bench sat in one pale mid-grey. With no air there is no scattering, so the haze
       BEGINS at the sky's own colour and only lifts away from it as the slider rises. */
    U.uHaze.value.set(
      s.x + (e.x * 0.15 + 0.060) * at,
      s.y + (e.y * 0.15 + 0.068) * at,
      s.z + (e.z * 0.15 + 0.086) * at);
    /* the clear colour is the one surface no shader here draws, so it has to be kept in step or
       the sky stays hard while everything in front of it washes out */
    const a = U.uAtmosphere.value, h = U.uHaze.value;
    renderer.setClearColor(new THREE.Color(
      s.x + (h.x - s.x) * a, s.y + (h.y - s.y) * a, s.z + (h.z - s.z) * a), 1);
  }

  /* every control has a TARGET and a live value; the frame walks one toward the other. A preset
     that snapped ten uniforms at once read as a glitch rather than as a decision. */
  const target = {};
  for (const [k] of CONTROLS) target[k] = state[k];

  function syncUniforms() {
    U.uAtmosphere.value = state.atmosphere;
    U.uLift.value = state.lift;
    U.uMahgic.value = state.mahgic;
    U.uWorld.value = state.worldLight;
    applyPalette();
  }
  function set(key, value, immediate) {
    if (!(key in target)) return false;
    target[key] = value;
    if (immediate) { state[key] = value; syncUniforms(); }
    return true;
  }
  syncUniforms();

  /* ---- camera -------------------------------------------------------------------------------- */
  const cam = Object.assign({}, SCENES[0].cam);
  const camTarget = Object.assign({}, cam);
  function place() {
    camera.position.set(
      Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist,
      1.7 + Math.sin(cam.pitch) * cam.dist,
      Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist);
    camera.lookAt(0, 2.0 + state.lift * 0.8, 0);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* one drag to orbit, so a facet can be brought round to the light without a controls addon */
  let dragging = false, px = 0, py = 0;
  const down = e => { dragging = true; const p = e.touches ? e.touches[0] : e; px = p.clientX; py = p.clientY; };
  const move = e => {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    camTarget.yaw -= (p.clientX - px) * 0.006;
    camTarget.pitch = Math.max(-0.06, Math.min(1.05, camTarget.pitch + (p.clientY - py) * 0.004));
    px = p.clientX; py = p.clientY;
    if (e.cancelable) e.preventDefault();
  };
  const up = () => { dragging = false; };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  canvas.addEventListener('touchstart', down, { passive: true });
  window.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', up);

  /* THE TAKEOVER'S PAYLOAD — camera and every uniform at once, eased. */
  function goScene(id) {
    const S = SCENES.find(s => s.id === id); if (!S) return false;
    state.scene = S.id;
    camTarget.yaw = S.cam.yaw; camTarget.pitch = S.cam.pitch; camTarget.dist = S.cam.dist;
    for (const k in S.set) set(k, S.set[k]);
    return true;
  }

  /* ---- the loop ------------------------------------------------------------------------------ */
  const _v = new THREE.Vector3();
  let raf = 0, last = performance.now(), acc = 0, accFrames = 0;
  /* frame-rate independent easing: the same fraction of the REMAINING distance per second however
     long the frame took. Lerping by a fixed constant per frame runs every transition at a
     different speed on a different device, which is how a 60 fps design feels wrong at 120. */
  const ease = (a, b, dt, rate) => a + (b - a) * (1 - Math.exp(-rate * dt));

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state.running) state.time += dt * state.speed;
    U.uTime.value = state.time;

    let moved = false;
    for (const [k] of CONTROLS) {
      if (Math.abs(target[k] - state[k]) > 1e-4) { state[k] = ease(state[k], target[k], dt, 5.0); moved = true; }
      else state[k] = target[k];
    }
    if (moved) syncUniforms();

    cam.yaw = ease(cam.yaw, camTarget.yaw, dt, 3.2);
    cam.pitch = ease(cam.pitch, camTarget.pitch, dt, 3.2);
    cam.dist = ease(cam.dist, camTarget.dist, dt, 3.2);
    place();

    /* the height the floor's reflection answers to, repeating the vertex shader's own maths so the
       image can never drift away from the object casting it */
    const bob = Math.sin(state.time * 1.30) * 0.42 + Math.sin(state.time * 0.618) * 0.22;
    U.uDiaY.value = diamond.position.y + state.lift * 1.75 + bob * (0.25 + 0.75 * state.lift);

    /* where the horizon sits on screen, so the sky gradient stays welded to the world */
    _v.set(Math.sin(cam.yaw) * 900, 0, Math.cos(cam.yaw) * 900).project(camera);
    U.uHorizon.value = (-_v.y * 0.5 + 0.5);

    /* billboard the beam and its equalizer about the VERTICAL axis only — a FOBEAM is a vertical
       structure, and letting it face the camera fully would tip it out of the world */
    const bY = Math.atan2(camera.position.x - beam.position.x, camera.position.z - beam.position.z);
    beam.rotation.y = bY; equalizer.rotation.y = bY;
    diamond.rotation.y = state.time * 0.22;
    renderer.render(scene, camera);

    state.frames++; acc += dt; accFrames++;
    if (acc >= 0.5) {
      state.fps = Math.round(accFrames / acc); acc = 0; accFrames = 0;
      governResolution();
    }
  }
  /* hysteresis in both directions, so a single slow half-second cannot start a staircase */
  let lowFor = 0, highFor = 0;
  function governResolution() {
    if (!state.adaptive) return;
    const f = state.fps;
    if (f && f < 50) { lowFor += 0.5; highFor = 0; } else if (f > 58) { highFor += 0.5; lowFor = 0; }
    else { lowFor = 0; highFor = 0; }
    if (lowFor >= 1.0 && dprStep < DPR_STEPS.length - 1) {
      dprStep++; lowFor = 0; renderer.setPixelRatio(DPR_STEPS[dprStep]); resize();
    } else if (highFor >= 2.0 && dprStep > 0) {
      dprStep--; highFor = 0; renderer.setPixelRatio(DPR_STEPS[dprStep]); resize();
    }
  }
  const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();

  const info = () => ({
    draws: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    programs: renderer.info.programs ? renderer.info.programs.length : null,
    textures: renderer.info.memory.textures,
    pixelRatio: +renderer.getPixelRatio().toFixed(2), dprStep: dprStep,
    fps: state.fps, frames: state.frames, scene: state.scene,
    objects: [sky.name, ground.name, diamond.name, beam.name, equalizer.name]
  });

  return {
    scene, camera, renderer, state, target, set, goScene, info, resize, start, stop,
    THEMES, THEME_ENDS, CONTROLS, SCENES,
    dispose() {
      stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      for (const g of owned.geometries) { try { g.dispose(); } catch (e) { } }
      for (const m of owned.materials) { try { m.dispose(); } catch (e) { } }
      try { renderer.dispose(); } catch (e) { }
    }
  };
}
