'use strict';
/* MR.MAH 3D — STATIC CONTRACT SUITE

   Written in the plain-node style the rest of tests/ uses: no framework, no
   dependencies, run with `node tests/mrmah3d-phase1.test.js`.

   This suite covers the contracts that can be proved without a GPU, and above
   all the ISOLATION contract — that the experimental 3D system cannot reach a
   production MAHFITT surface. Runtime rendering behaviour is proved separately
   by tools/mrmah3d-verify.mjs, which drives a real browser. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const R = p => path.join(ROOT, p);
const read = p => fs.readFileSync(R(p), 'utf8');
const exists = p => fs.existsSync(R(p));
/* Assertions about what the CODE does must not read the prose around it. These
   modules are heavily commented, and a doc-comment showing the public import,
   or a sentence using the word "face-on", is not an import or a facial feature. */
const code = p => read(p).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/* Read once, up here: the environment section below derives the grid's
   clearance from the composition modes, so `comp` must exist before it. */
const comp = read('mrmah3d/core/composition.js');

let pass = 0, fail = 0;
function ok(id, cond, detail) {
  if (cond) { pass++; console.log('PASS  ' + id); }
  else { fail++; console.log('FAIL  ' + id + (detail ? '  — ' + detail : '')); }
}

const CORE = [
  'quality.js', 'palette.js', 'renderer.js', 'stage.js', 'camera.js',
  'lights.js', 'environment.js', 'character.js', 'interaction.js',
  'lifecycle.js', 'mrmah-scene.js'
];

/* ---- A. the package is present and whole ------------------------------- */
CORE.forEach(f => ok('PKG-' + f, exists('mrmah3d/core/' + f)));
ok('PKG-lab-html', exists('mrmah3d/lab/index.html'));
ok('PKG-lab-js', exists('mrmah3d/lab/lab.js'));
ok('PKG-lab-css', exists('mrmah3d/lab/lab.css'));
ok('PKG-three', exists('mrmah3d/vendor/three/three.module.min.js'));
ok('PKG-three-core', exists('mrmah3d/vendor/three/three.core.min.js'));
ok('PKG-three-license', exists('mrmah3d/vendor/three/LICENSE'));
ok('PKG-readme', exists('mrmah3d/README.md'));

/* three.module.min.js imports its sibling by relative path, which is what lets
   the package work with no bundler and no import map. If that ever becomes a
   bare specifier the lab breaks with a blank stage. */
ok('PKG-three-relative-import',
  /from"\.\/three\.core\.min\.js"/.test(read('mrmah3d/vendor/three/three.module.min.js')));

/* ---- B. ISOLATION — the load-bearing contract -------------------------- */

/* B1. No production MAHFITT file may reference the 3D system. If any of these
   exist in the tree and mention mrmah3d, the glass box has leaked. */
['mygym.js', 'mygym.css', 'netlify/functions/mygym.js'].forEach(function (f) {
  if (!exists(f)) return;                 /* not in this checkout — skip, don't fail */
  ok('ISO-clean-' + f, !/mrmah3d|three\.module|THREE\./.test(read(f)),
    f + ' references the experimental 3D system');
});

/* B2. The lab must not pull in any production stylesheet or script. Its whole
   claim to safety is that it shares no code with the app. */
const labHtml = read('mrmah3d/lab/index.html');
ok('ISO-lab-no-prod-assets',
  !/mygym\.(js|css)|gym-app\.css|gym-shared\.js|mahfitt-[a-z-]+\.(js|css)/.test(labHtml));
ok('ISO-lab-noindex', /name="robots"[^>]*noindex/.test(labHtml));
ok('ISO-lab-declares-dev-only', /DEVELOPMENT LABORATORY/.test(labHtml));

/* B3. The renderer must not reach outside its own package. Every import in
   core/ has to be relative and stay inside mrmah3d/. */
CORE.forEach(function (f) {
  const src = code('mrmah3d/core/' + f);
  const specs = (src.match(/from\s+'([^']+)'/g) || []).map(s => s.slice(6, -1));
  const bad = specs.filter(s => !s.startsWith('./') && !s.startsWith('../vendor/'));
  ok('ISO-imports-' + f, bad.length === 0, 'escapes the package: ' + bad.join(', '));
});

/* B4. WebGL/Three.js is permitted ONLY inside mrmah3d/. Nothing in core/ may
   touch the document outside its given host element, and only the lab may
   query the DOM by id/selector. */
CORE.forEach(function (f) {
  const src = read('mrmah3d/core/' + f);
  ok('ISO-no-global-dom-' + f,
    !/document\.(getElementById|querySelector|body)\b/.test(src),
    f + ' reaches into the document');
});

/* ---- C. lifecycle discipline ------------------------------------------ */
const scene = read('mrmah3d/core/mrmah-scene.js');
const renderer = read('mrmah3d/core/renderer.js');
const lifecycle = read('mrmah3d/core/lifecycle.js');

ok('LIFE-scene-exposes-destroy', /destroy:\s*destroy/.test(scene));
ok('LIFE-renderer-disposes', /renderer\.dispose\(\)/.test(renderer));
/* dispose() alone leaves the GPU context alive; on a single-page app that is
   how a browser runs out of contexts. */
ok('LIFE-releases-webgl-context', /WEBGL_lose_context/.test(renderer));
ok('LIFE-cancels-raf', /cancelAnimationFrame/.test(lifecycle));
ok('LIFE-stops-when-hidden', /visibilitychange/.test(lifecycle));
ok('LIFE-stops-on-pagehide', /pagehide/.test(lifecycle));
ok('LIFE-stops-when-offscreen', /IntersectionObserver/.test(lifecycle));
ok('LIFE-handles-context-loss', /webglcontextlost/.test(scene) && /webglcontextrestored/.test(scene));
/* Without preventDefault the browser never sends a restore event. */
ok('LIFE-context-loss-preventDefault', /preventDefault\(\)/.test(scene));
ok('LIFE-destroy-disposes-every-part',
  ['characterBox.dispose', 'envBox.dispose', 'lightsBox.dispose', 'stageBox.dispose', 'rendererBox.dispose']
    .every(s => scene.indexOf(s) !== -1));
ok('LIFE-scene-traversal-frees-gpu-objects', /geometry\.dispose/.test(read('mrmah3d/core/stage.js')));
ok('LIFE-interaction-unbinds', /removeEventListener/.test(read('mrmah3d/core/interaction.js')));

/* ---- D. mobile budget ------------------------------------------------- */
const quality = read('mrmah3d/core/quality.js');
ok('MOB-dpr-capped', /DPR_CAP/.test(quality));
ok('MOB-low-tier-dpr-1', /low:\s*1\b/.test(quality));
ok('MOB-high-tier-dpr-2-max', /high:\s*2\b/.test(quality));
ok('MOB-pixel-budget', /PIXEL_BUDGET/.test(quality));
ok('MOB-degrade-only-downward', /TIERS\[i - 1\]/.test(quality));
ok('MOB-reduced-motion-supported', /prefers-reduced-motion/.test(quality));
ok('MOB-canvas-touch-action-none', /touchAction\s*=\s*'none'/.test(renderer));
ok('MOB-resize-observed', /ResizeObserver/.test(scene));
/* setSize(w,h,false) — the canvas must not get inline px, or CSS layout and
   the drawing buffer fight each other on rotate. */
ok('MOB-no-inline-canvas-size', /setSize\(w,\s*h,\s*false\)/.test(renderer));

/* ---- E. framing reproduces the reference composition ------------------ */
/* The camera is now solved against reference/mrmah-canonical-front.png, not
   against the 2.5D CSS stage. The legacy stage numbers are still exported for
   that surface, so these assertions read FRAMING specifically — matching the
   file loosely would pass on the legacy constants and prove nothing. */
const camera = read('mrmah3d/core/camera.js');
const framingBlock = (camera.match(/export var FRAMING = \{[\s\S]*?\};/) || [''])[0];
ok('CAM-reference-fov', /fov:\s*32/.test(framingBlock), 'FRAMING.fov must be the solved 32');
ok('CAM-reference-distance', /distance:\s*7\.81/.test(framingBlock));
ok('CAM-reference-aspect', /referenceAspect:\s*0\.5622/.test(framingBlock));
ok('CAM-pitched-up-not-down', /cameraY:\s*1\.15/.test(framingBlock) && /targetY:\s*1\.59/.test(framingBlock),
  'the reference horizon sits below frame centre, so the camera tilts UP');
ok('CAM-legacy-stage-retained', /LEGACY_STAGE/.test(camera) && /pitchDeg:\s*26/.test(camera));
ok('CAM-documents-its-derivation', /940 x 1672/.test(camera) && /67\.0%/.test(camera));
ok('CAM-fov-clamped', /maxFov/.test(camera));
ok('CAM-reframes-to-character', /frameCharacter/.test(camera));

/* The grid must stay entirely in front of the camera: line segments that
   straddle the near plane were measured being dropped by the rasteriser,
   which removed every converging line from the floor. */
const env = read('mrmah3d/core/environment.js');
ok('ENV-grid-pushed-in-front-of-camera', /centerZ:\s*-\d/.test(env));
const gridSize = Number((env.match(/size:\s*(\d+)/) || [])[1]);
const gridDiv = Number((env.match(/divisions:\s*(\d+)/) || [])[1]);
const centerZ = Number((env.match(/centerZ:\s*(-?\d+)/) || [])[1]);
/* The nearest camera across every composition mode, derived from the modes
   themselves rather than from a constant that goes stale the moment a preset
   changes. */
var nearestCamZ = Infinity;
comp.replace(/\{[^{}]*fov:\s*([\d.]+)[^{}]*heightFrac:\s*([\d.]+)[^{}]*azimuthDeg:\s*(-?[\d.]+)/g,
  function (_, fov, hf, az) {
    var d = 3.0 / (2 * Math.tan(Number(fov) * Math.PI / 360) * Number(hf));
    var z = Math.cos(Number(az) * Math.PI / 180) * d;
    if (z < nearestCamZ) nearestCamZ = z;
    return _;
  });
ok('ENV-grid-near-edge-in-front-of-camera', centerZ + gridSize / 2 < nearestCamZ - 2,
  'grid near edge z=' + (centerZ + gridSize / 2).toFixed(2) +
  ' vs nearest mode camera z=' + nearestCamZ.toFixed(2));
ok('ENV-grid-cell-plausible', gridSize / gridDiv > 1 && gridSize / gridDiv < 2,
  'cell ' + (gridSize / gridDiv).toFixed(3) + ' units');
ok('ENV-grid-clear-of-shadow-plane', /y:\s*0\.0[2-9]/.test(env));
/* R95 world: the shadow catcher is gone (the guardian references have no cast
   shadow), so the assertion that it never occluded the grid becomes the
   assertion that nothing catches a shadow at all. */
ok('ENV-ground-does-not-occlude', !/ShadowMaterial/.test(code('mrmah3d/core/environment.js')) &&
  !/receiveShadow\s*=\s*true/.test(code('mrmah3d/core/environment.js')),
  'R95 world: no shadow catcher, nothing to occlude the grid');
/* The reference world, not a bare floor. */
ok('ENV-glowing-grid-nodes', /grid-nodes/.test(env));
ok('ENV-floor-glow', /floor-glow/.test(env));
ok('ENV-background-structures', /structures/.test(env));
ok('ENV-particles', /motes/.test(env));
ok('ENV-world-stays-quiet', /Mr\.Mah\s+is\s+the\s+only\s+bright,\s+detailed\s+thing/.test(env));

/* ---- F. the real character, built from the reference ------------------ */
const mrmah = read('mrmah3d/core/character/mrmah.js');
const props = read('mrmah3d/core/character/proportions.js');

ok('CHR-not-a-placeholder', /isPlaceholder:\s*false/.test(mrmah));
ok('CHR-reference-is-committed', exists('reference/mrmah-canonical-front.png'),
  'the visual reference is engineering evidence and must live in the repo');

/* Proportions must stay traceable to the reference, not drift into taste. */
ok('PROP-cites-the-reference', /reference\/mrmah-canonical-front\.png/.test(props));
ok('PROP-records-frame', /940/.test(props) && /1672/.test(props));
ok('PROP-records-character-height-px', /1119/.test(props));
/* The head is now DELIBERATELY LARGER than the canonical measurement.

   These two checks used to assert the head against the reference's 366/1119, and
   they were right to until the character-direction pass: a stylized companion
   character oversizes the head relative to strict proportion, because that is
   where identity and expression live and the viewer looks there first. At the
   measured size the torso outranked the face.

   So the assertion changes from "matches the measurement" to "is a deliberate,
   bounded enlargement of it" — still a real guard against drift, and against
   anyone quietly returning it to the traced value or inflating it into a
   bobblehead. The shape relationship is unchanged: still slightly taller than
   wide, which is what makes it a diamond rather than a lozenge. */
/* R90 — AND THEN THE ANATOMICAL REFERENCE SUPERSEDED BOTH OF THEM.

   `reference/mrmah-refA-anatomical.png` is the art-direction authority now, and
   measured on it (apex y 212, tip y 1295, so 1083 px of character) the head is
   302 px wide and 258 px tall: 0.279 and 0.238 of character height. Two things
   follow, and both invalidate the assertions above.

   The head is SMALLER than the canonical measurement, not larger — the pivot's
   enlargement was a design judgement the reference does not support, and it was
   costing the body the height it needed for a neck, a trapezius and arms with
   real reach. And the diamond is WIDER THAN TALL there, not taller than wide,
   so the "reads as a diamond only while taller than wide" assertion was
   asserting the opposite of the target.

   These now check the head against the anatomical reference with a tolerance
   band, which is a real guard against drift in either direction and, unlike the
   pair it replaces, against the art direction too. */
const headW = Number((props.match(/halfWidth:\s*([\d.]+)\s*,/) || [])[1]);
const headH = Number((props.match(/halfHeight:\s*([\d.]+)\s*,/) || [])[1]);
const REFA_W = 302 / 1083 * 3 / 2;   /* 0.4183 */
const REFA_H = 258 / 1083 * 3 / 2;   /* 0.3573 */
ok('PROP-head-matches-anatomical-reference',
  Math.abs(headW - REFA_W) < REFA_W * 0.06 && Math.abs(headH - REFA_H) < REFA_H * 0.06,
  'head ' + headW + ' x ' + headH + ' against the anatomical reference ' +
  REFA_W.toFixed(4) + ' x ' + REFA_H.toFixed(4));
ok('PROP-head-slightly-wider-than-tall', headW > headH && headW < headH * 1.35,
  'the anatomical reference cuts the diamond broader than it is tall (302 x 258); ' +
  'taller-than-wide was the canonical front and is no longer the target');
ok('PROP-float-not-grounded', /height:\s*0\.1/.test(props));

/* Every part the brief names must actually exist as geometry. */
const parts = {
  'diamond head': /diamondCrystal/.test(read('mrmah3d/core/character/head.js')),
  'recessed face plate': /faceZ/.test(read('mrmah3d/core/character/forge.js')),
  /* No neck part any more — the chest crown meets the head's own cross-section
     flush, so a connector would only be visible clutter. What must exist is the
     crown that does that job. */
  'head-to-chest crown': /THE CROWN/.test(props),
  'shoulders': /shoulder caps/i.test(read('mrmah3d/core/character/body.js')),
  'tapered torso': /torsoLoft/.test(read('mrmah3d/core/character/body.js')),
  'two arms': /ARMS_?\.right/.test(read('mrmah3d/core/character/limbs.js')) &&
              /ARMS_?\.left/.test(read('mrmah3d/core/character/limbs.js')),
  'elbow joints': /elbowJoint/.test(read('mrmah3d/core/character/limbs.js')),
  'wrists': /wristJoint/.test(read('mrmah3d/core/character/limbs.js')),
  'hands': /buildHand/.test(read('mrmah3d/core/character/limbs.js')),
  'digits': /digitCount/.test(read('mrmah3d/core/character/limbs.js')),
  'chest emblem': /chest-emblem/.test(read('mrmah3d/core/character/body.js')),
  'transport symbols': /transport-symbols/.test(read('mrmah3d/core/character/body.js')),
  'eyes': /eye-left/.test(read('mrmah3d/core/character/head.js')),
  'smile': /smile/.test(read('mrmah3d/core/character/head.js'))
};
Object.keys(parts).forEach(function (k) { ok('GEO-' + k.replace(/\s+/g, '-'), parts[k]); });

/* True 3D, not a flat plate with lines on it. */
const forge = read('mrmah3d/core/character/forge.js');
ok('GEO-flat-per-face-normals', /FLAT per-face normals/.test(forge));
ok('GEO-head-has-depth', /halfDepth/.test(props));
ok('GEO-head-back-apex', /backApexZ/.test(props));
ok('GEO-torso-facet-relief', /facet:/.test(props));
ok('GEO-torso-collar-dip', /dip:/.test(props));
ok('GEO-alternating-triangulation', /Alternate the diagonal/.test(forge));

/* ---- F2. material hierarchy ------------------------------------------- */
const mats = read('mrmah3d/core/character/materials.js');
ok('MAT-body-is-dark-and-lit-not-emissive', /NOT\s+a\s+glowing\s+cyan\s+object/.test(mats));
ok('MAT-flat-shading', /flatShading:\s*true/.test(mats));
ok('MAT-edge-illumination', /LineBasicMaterial/.test(mats));
ok('MAT-edges-depth-tested', /depthTest:\s*true/.test(mats),
  'edge halo must be depth tested or the character reads as a wireframe');
ok('MAT-face-plate-near-black', /face:\s*0x0/.test(mats));
ok('MAT-eyes-exempt-from-tonemapping', /toneMapped:\s*false/.test(mats));
ok('MAT-glow-baselines-not-duplicated', /BASE\.edge/.test(mats));
/* A metallic crystal with nothing to reflect renders black. */
ok('MAT-environment-provided', /PMREMGenerator/.test(read('mrmah3d/core/stage.js')));
ok('MAT-environment-is-bright', /has to be BRIGHT/.test(read('mrmah3d/core/stage.js')));

/* ---- F3. behaviour states, uncoupled from any page -------------------- */
const states = read('mrmah3d/core/character/states.js');
['idle', 'listening', 'thinking', 'explaining', 'success', 'concerned', 'tapped', 'dragging']
  .forEach(function (s) { ok('STATE-' + s, new RegExp('\\b' + s + ':\\s*\\{').test(states)); });
ok('STATE-transient-returns', /transient/.test(states));
ok('STATE-no-page-coupling',
  !/mahfitt|mygym|protocol|aiChat/i.test(code('mrmah3d/core/character/states.js')),
  'the renderer must not know which surface is driving it');
ok('STATE-exposed-on-scene-api', /setState:/.test(read('mrmah3d/core/mrmah-scene.js')));

/* ---- F5. page-aware composition --------------------------------------- */
ok('COMP-module-exists', exists('mrmah3d/core/composition.js'));
['showcase', 'chat', 'protocol', 'portrait'].forEach(function (m) {
  ok('COMP-mode-' + m, new RegExp('\\b' + m + ':\\s*\\{').test(comp));
});
/* The camera is solved from intent, not hardcoded per page. */
ok('COMP-solver', /export function solveFraming/.test(comp));
ok('COMP-intent-fields', /heightFrac/.test(comp) && /screenX/.test(comp) && /azimuthDeg/.test(comp));
ok('COMP-cites-real-stage-layout', /fabi-response-anchor/.test(comp) && /bottom:68px/.test(comp));
/* In-app modes must keep him low and off-centre, or the response diamond
   (large, centred, near the top of the real stage) lands on his face. */
const chatBlock = (comp.match(/chat:\s*\{[\s\S]*?\},\s*\n\n/) || [''])[0];
const protoBlock = (comp.match(/protocol:\s*\{[\s\S]*?\},\s*\n\n/) || [''])[0];
[['chat', chatBlock], ['protocol', protoBlock]].forEach(function (p) {
  const sx = Number((p[1].match(/screenX:\s*([\d.]+)/) || [])[1]);
  const sy = Number((p[1].match(/screenY:\s*([\d.]+)/) || [])[1]);
  const hf = Number((p[1].match(/heightFrac:\s*([\d.]+)/) || [])[1]);
  const az = Number((p[1].match(/azimuthDeg:\s*([\d.]+)/) || [])[1]);
  ok('COMP-' + p[0] + '-off-centre', sx < 0.45, 'screenX ' + sx);
  ok('COMP-' + p[0] + '-low-in-frame', sy > 0.55, 'screenY ' + sy);
  ok('COMP-' + p[0] + '-leaves-room-for-ui', hf < 0.45, 'heightFrac ' + hf);
  ok('COMP-' + p[0] + '-not-dead-front', az > 0, 'azimuth ' + az + ' — a scene, not a portrait');
});
ok('COMP-scene-exposes-setMode', /setMode: setMode/.test(read('mrmah3d/core/mrmah-scene.js')));
ok('COMP-camera-resolves-on-resize', /if \(mode\) \{ applyMode\(aspect\)/.test(read('mrmah3d/core/camera.js')));

/* ---- F5b. site-facing page API ----------------------------------------- */
const surf = read('mrmah3d/core/surfaces.js');
ok('SURF-module-exists', exists('mrmah3d/core/surfaces.js'));
['chat', 'protocol', 'ambient'].forEach(function (x) {
  ok('SURF-' + x, new RegExp('\\b' + x + ':\\s*\\{').test(surf));
});
/* The events a page actually knows about. */
['waiting', 'generating', 'response'].forEach(function (e) {
  ok('SURF-chat-event-' + e, new RegExp(e + ':').test(surf));
});
['intro', 'question', 'answered', 'complete'].forEach(function (e) {
  ok('SURF-protocol-event-' + e, new RegExp(e + ':').test(surf));
});
ok('SURF-unknown-event-is-noop', /return state \|\| null/.test(surf),
  'a page mid-refactor must not be able to throw inside the renderer');
ok('SURF-scene-exposes-signal', /signal: function/.test(scene));
ok('SURF-scene-exposes-adopt', /adopt: function/.test(scene));
/* surfaces.js is the ONLY file allowed to name a MAHFITT page. */
['states.js', 'mrmah.js', 'body.js', 'head.js', 'limbs.js', 'materials.js']
  .forEach(function (f) {
    ok('SURF-character-is-page-agnostic-' + f,
      !/aiChat|ai-chat|mahfitt|mygym|protocol/i.test(code('mrmah3d/core/character/' + f)),
      f + ' must not know which surface is driving it');
  });

/* ---- F6. the world is a layered place, and it is quiet ----------------- */
ok('WORLD-horizon-band', /horizon/.test(env));
ok('WORLD-horizon-is-fogged', /fog MUST be on/.test(env),
  'an unfogged horizon punches a lit wall through the haze');
ok('WORLD-glow-follows-character', /followCharacter/.test(env));
/* R94 world: amended from the literal 9 x 9 — brief item 7 clips the catcher
   to a 2-unit pool under the tip, which is smaller still; the intent (never a
   floor-sized catcher) is what this asserts. */
/* R95 world: amended again — there is no catcher. The guardian references
   have no cast shadow; the key never casts and nothing receives. */
ok('WORLD-shadow-catcher-is-small', !/new PlaneGeometry\((9, 9|2\.0, 2\.0)\)/.test(env) &&
  /key\.castShadow = false;/.test(read('mrmah3d/core/lights.js')),
  'R95 world: no catcher at all, and the key does not cast');
ok('WORLD-per-mode-emphasis', /applyMode/.test(env));
ok('WORLD-fog-is-per-mode', /setFog/.test(read('mrmah3d/core/stage.js')));

/* ---- F4. tap and drag are distinguishable ----------------------------- */
const inter = read('mrmah3d/core/interaction.js');
ok('TAP-slop-before-drag', /DRAG_SLOP/.test(inter));
ok('TAP-time-bounded', /TAP_MS/.test(inter));
ok('TAP-drag-never-becomes-tap', /wasDragging/.test(inter));
ok('TAP-cancel-is-not-a-tap', /function cancel/.test(inter));

/* ---- G. persistent instructions exist --------------------------------- */
ok('DOC-claude-md', exists('CLAUDE.md'));
/* ---- R94 world ---------------------------------------------------------
   The mountain range, mist, clouds, floor response and shadow pool built for
   brief R94. Static contracts only; the rendered result is measured by the
   R94-WORLD block in tools/mrmah3d-verify.mjs. */
{
  const terrain = read('mrmah3d/core/terrain.js');
  const envR94 = read('mrmah3d/core/environment.js');
  const qualityR94 = read('mrmah3d/core/quality.js');

  ok('R94-WORLD-terrain-module-exists', exists('mrmah3d/core/terrain.js'));
  ok('R94-WORLD-terrain-imported-by-environment', /from '\.\/terrain\.js'/.test(envR94));
  /* Baked flat shading: vertex colours on an unlit material, never a lit one —
     that is what keeps a mountain as cheap as a coloured triangle. */
  ok('R94-WORLD-terrain-is-baked-vertex-colour',
    /vertexColors:\s*true/.test(terrain) && /MeshBasicMaterial/.test(terrain) &&
    !/MeshStandardMaterial|MeshPhysicalMaterial|MeshLambertMaterial/.test(terrain));
  /* The fog trap: a fogged object beyond FOG.far is a wall of fog colour and one
     inside the fade is nearly so at these distances. Every terrain material
     opts out and carries its depth tint in its own colour. */
  const terrainMats = (terrain.match(/new (MeshBasicMaterial|PointsMaterial)\(/g) || []).length;
  const terrainUnfogged = (terrain.match(/fog:\s*false/g) || []).length;
  ok('R94-WORLD-terrain-never-fogged', terrainMats > 0 && terrainUnfogged >= terrainMats,
    terrainUnfogged + ' of ' + terrainMats + ' materials carry fog:false');
  ok('R94-WORLD-terrain-has-depth-tint', /depth:\s*0\.\d+/.test(terrain) && /ATMOS/.test(terrain));
  ok('R94-WORLD-terrain-three-depth-layers',
    /\['far',\s*'mid',\s*'ridge'\]/.test(terrain) && /z:\s*-2\d/.test(terrain) &&
    /z:\s*-4\d/.test(terrain) && /z:\s*-[6-9]\d/.test(terrain));
  ok('R94-WORLD-terrain-one-draw-per-layer', /new Mesh\(geo, mat\)/.test(terrain) &&
    !/massifs\.forEach\(function[^}]*new Mesh/.test(terrain));
  ok('R94-WORLD-terrain-faces-wound-outward', /nrm\.dot\(outv\)\s*<\s*0/.test(terrain));
  ok('R94-WORLD-terrain-does-not-touch-document', !/\bdocument\b|\bwindow\b/.test(code('mrmah3d/core/terrain.js')));
  ok('R94-WORLD-terrain-disposes-everything', /owned\.forEach\(function \(o\) \{ if \(o && o\.dispose\) o\.dispose\(\); \}\)/.test(terrain));
  ok('R94-WORLD-terrain-scales-fine-detail', /function setDetail\(k\)/.test(terrain) && /spkMat\.opacity/.test(terrain));
  ok('R94-WORLD-terrain-weights-from-authored-baselines',
    /var BASE = \{\s*beam: beams\.mat\.opacity/.test(terrain) && /BASE\.beam \* weight/.test(terrain));
  ok('R94-WORLD-beams-are-thin-and-short',
    /var w = s\.far \? 0\.16 : 0\.22;/.test(terrain) && /var h = s\.h \* 1\.25;/.test(terrain));
  ok('R94-WORLD-beams-unfogged-additive', /beacon-beams/.test(terrain) &&
    /blending: AdditiveBlending, depthWrite: false, toneMapped: false,\s*side: DoubleSide, fog: false/.test(terrain));

  /* environment.js: what was removed and what replaced it. */
  ok('R94-WORLD-fogged-cones-gone', !/ConeGeometry|EdgesGeometry|MeshStandardMaterial/.test(envR94));
  ok('R94-WORLD-light-pillars-gone', !/light-pillars/.test(envR94));
  ok('R94-WORLD-full-width-cloud-bands-gone', !/w:\s*96,/.test(envR94) && /cloudCornerTexture/.test(envR94));
  ok('R94-WORLD-clouds-are-two-corners', (envR94.match(/\{ x: -?\d+\.\d, y: 1\d\.\d, z: -4\d, w: \d+\.\d, h: \d\.\d, speed/g) || []).length === 2);
  ok('R94-WORLD-clouds-unfogged', /cloudMat = new MeshBasicMaterial\(\{[\s\S]*?fog: false/.test(envR94));
  ok('R94-WORLD-mist-bank-exists', /horizon-mist/.test(envR94) && /mistTexture\(\)/.test(envR94));
  ok('R94-WORLD-mist-stands-above-the-floor', /q\.position\.set\(b\.x, b\.y \+ b\.h \/ 2, b\.z\)/.test(envR94) &&
    !/y:\s*-\d/.test((envR94.match(/var mistQuads = \[\];[\s\S]*?\.forEach/) || [''])[0]));
  ok('R94-WORLD-mist-unfogged-and-gappy', /mistMat = new MeshBasicMaterial\(\{[\s\S]*?fog: false/.test(envR94) &&
    /Tufts, clustered, with real gaps/.test(envR94));
  ok('R94-WORLD-grid-opacity-held', /opacity:\s*0\.21/.test(envR94));
  ok('R94-WORLD-grid-brightens-near-hover', /HOVER_GAIN/.test(envR94) && /vertexColors:\s*true/.test(envR94));
  /* Review round: 2.6 x 0.09 drew as a ruled line over half the frame; the
     column's opaque end was at the camera, not under him. */
  ok('R94-WORLD-hover-is-a-compact-cross',
    /new PlaneGeometry\(1\.9, 1\.9\)/.test(envR94) && /\[\[1\.1, 0\.14\], \[0\.14, 1\.1\]\]/.test(envR94));
  /* R95 world (round 5): the column runs 5.0 long so it reaches the frame's
     bottom row as guardian-a's does; "narrow" is the 0.7 width, which is what
     the convergence rows accepted, and that is the literal this holds. */
  ok('R94-WORLD-reflection-is-a-narrow-column', /new PlaneGeometry\(0\.7, [3-5]\.0\)/.test(envR94) &&
    /function columnTexture/.test(envR94) && /streak\.rotation\.z = Math\.PI/.test(envR94));
  /* R95 world: the pool is gone with the shadow — see WORLD-shadow-catcher-is-small. */
  ok('R94-WORLD-shadow-catcher-is-a-pool',
    !/poolFade/.test(code('mrmah3d/core/environment.js')) && !/new PlaneGeometry\(9, 9\)/.test(envR94),
    'R95 world: no shadow pool, no catcher');
  ok('R94-WORLD-aura-is-a-single-faint-wash',
    (envR94.match(/\{ w: [\d.]+, h: [\d.]+, y: [\d.]+, z: -[\d.]+, o: 0\.0\d+ \}/g) || []).length === 1 &&
    !/o: 0\.185/.test(envR94));
  /* Authored baselines, one writer each. */
  ok('R94-WORLD-applyMode-reads-authored-baselines',
    /b\.mesh\.material\.opacity = b\.baseOpacity \* W\.haze/.test(envR94) &&
    /terrain\.applyWeight\(W\.structures\)/.test(envR94) &&
    !/BASE\.\w+\s*=\s*0\.\d/.test(code('mrmah3d/core/environment.js')));
  ok('R94-WORLD-flare-material-not-shadowed-by-stars',
    /var flareMat = new MeshBasicMaterial/.test(envR94) && (envR94.match(/var starMat = /g) || []).length === 1);
  ok('R94-WORLD-terrain-disposed-with-environment', /owned\.push\(terrain\)/.test(envR94));
  ok('R94-WORLD-floor-reflections-are-tiered', /worldReflections:\s*tier !== 'low'/.test(qualityR94) &&
    /settings\.worldReflections/.test(terrain));
  ok('R94-WORLD-mrmah-scene-untouched-by-world-pass', !/preRender/.test(read('mrmah3d/core/mrmah-scene.js')),
    'the proxy floor needs no pre-render hook');

  /* ---- review round (critic punch list) ---- */
  /* Item 1: pyramids, not domes — every mid and far massif at h/r >= 2.0 with
     6-7 sides so a side is one readable plane. */
  const midBlock = (terrain.match(/mid: \{[\s\S]*?massifs: \[([\s\S]*?)\]/) || ['', ''])[1];
  const farBlock = (terrain.match(/far: \{[\s\S]*?massifs: \[([\s\S]*?)\]/) || ['', ''])[1];
  const massifs = b => Array.from(b.matchAll(/h: ([\d.]+), r: ([\d.]+), sides: (\d+)/g)).map(m => ({ h: +m[1], r: +m[2], sides: +m[3] }));
  const mids = massifs(midBlock), fars = massifs(farBlock);
  ok('R94-WORLD-peaks-are-steep', mids.length >= 8 && fars.length >= 5 &&
    mids.every(m => m.h / m.r >= 2.1 && m.sides <= 7) && fars.every(m => m.h / m.r >= 1.9 && m.sides <= 7),
    mids.map(m => (m.h / m.r).toFixed(1)).join(' '));
  /* Item 2: rocks lit and dissolving — base on the floor, foot alpha 0, ridge
     albedo above the stage's ink, rubble-sized faces. */
  ok('R94-WORLD-ridge-foot-dissolves', /fadeFoot: true/.test(terrain) && /k === 0 \? 0\.0 :/.test(terrain) &&
    /Float32BufferAttribute\(col, 4\)/.test(terrain) && !/k === 0 \? -0\.35/.test(terrain));
  ok('R94-WORLD-ridge-is-lit-not-a-hole', /ridge: \{ base: srgb\(66, 74, 88\)/.test(terrain) &&
    /ridge: \{ ang: 0\.60, rad: 0\.90/.test(terrain) && /tone: 'ridge', rings: 3/.test(terrain));
  /* Item 3: the floor gives the range back — mirrored through the floor, one
     draw, tiered; the beacon streaks that never reached the frame are gone. */
  ok('R94-WORLD-range-mirrored-into-floor', /mirror: \{ maxX: 12/.test(terrain) &&
    /name \+ '-mirror'/.test(terrain) && /-p0\.y, p0\.z, p2\.x, -p2\.y/.test(terrain) &&
    /!!settings\.worldReflections/.test(terrain) && !/buildBeaconReflections/.test(terrain));
  /* Item 4: no strip lying on the floor under the horizon; the grid carries
     the distance brightness in its own lines. */
  ok('R94-WORLD-no-floor-sheen-strip', !/floor-sheen/.test(envR94) && !/PlaneGeometry\(60, 9\)/.test(envR94) &&
    /FAR_GAIN/.test(envR94));
  /* Item 5: the mist stands over the rocks and blends rather than adds. */
  ok('R94-WORLD-mist-blends-not-adds',
    !/mistMat = new MeshBasicMaterial\(\{[\s\S]*?AdditiveBlending[\s\S]*?\}\);/.test(
      (envR94.match(/var mistMat = new MeshBasicMaterial\(\{[\s\S]*?\}\);/) || [''])[0]) &&
    /h: 2\.6, y: 0\.04, o: 0\.85/.test(envR94));
  ok('R94-WORLD-mist-reflected-in-floor', /mistTexture\(true\)/.test(envR94) && /scale\.set\(m\.mesh\.scale\.x, -1\.7, 1\)/.test(envR94));
  /* Item 6: gunmetal — the steel catch and the diffuse gain came down, the
     brightness moved into the specks. */
  /* R95 world: the literal `ks: 0.34` became a ceiling. R95 measured the range
     competing with the character (a massif box at 53.8 luma against his left
     pectoral at 47.8) and brought the mid tone's catch down again; the intent
     of this check — the catch came DOWN from R94's 0.62, never up — holds. */
  const midKs = Number((terrain.match(/mid:\s*\{[^}]*ks: ([\d.]+)/) || [])[1]);
  ok('R94-WORLD-steel-not-ice', midKs > 0 && midKs <= 0.34 && /sparkle: 1100/.test(terrain) && /size: 0\.36/.test(terrain),
    'mid ks ' + midKs);
  /* Item 8: clouds placed for the reference frame, dithered, and withheld at
     app scale from the one writer in applyFine. */
  ok('R94-WORLD-clouds-scale-gated', /cloudK/.test(envR94) &&
    /b\.mesh\.material\.opacity = b\.baseOpacity \* W\.haze \* cloudK/.test(envR94) &&
    (envR94.match(/b\.mesh\.material\.opacity = /g) || []).length === 1);
  ok('R94-WORLD-clouds-dithered', /getImageData\(0, 0, 256, 128\)/.test(envR94) && /putImageData/.test(envR94));
}
/* ---- end R94 world ------------------------------------------------------ */

/* ---- R95 world ---------------------------------------------------------
   The moon, the distant variant figures, the hover beam, the beams' floor
   reflections, the darker range and the removal of the cast shadow, built
   for brief R95 (reference/mrmah-refD-guardian-{a,b,c,d}.png). Static
   contracts only; the rendered result is measured by the R95-WORLD block in
   tools/mrmah3d-verify.mjs. */
{
  const envR95 = read('mrmah3d/core/environment.js');
  const envCode = code('mrmah3d/core/environment.js');
  const moon = read('mrmah3d/core/moon.js');
  const figures = read('mrmah3d/core/figures.js');
  const terrainR95 = read('mrmah3d/core/terrain.js');
  const lightsR95 = read('mrmah3d/core/lights.js');

  ok('R95-WORLD-moon-module-exists', exists('mrmah3d/core/moon.js'));
  ok('R95-WORLD-figures-module-exists', exists('mrmah3d/core/figures.js'));
  ok('R95-WORLD-modules-imported-by-environment',
    /from '\.\/moon\.js'/.test(envR95) && /from '\.\/figures\.js'/.test(envR95));
  /* The glass box: a new module may create a canvas to paint a texture, the
     way environment.js does, and nothing more. */
  ['moon.js', 'figures.js'].forEach(function (f) {
    const src = code('mrmah3d/core/' + f);
    ok('R95-WORLD-no-global-dom-' + f, !/document\.(getElementById|querySelector|body)\b/.test(src) && !/\bwindow\b/.test(src));
    const specs = (src.match(/from\s+'([^']+)'/g) || []).map(s => s.slice(6, -1));
    ok('R95-WORLD-imports-stay-inside-' + f, specs.length > 0 && specs.every(s => s.startsWith('./') || s.startsWith('../vendor/')));
  });
  ok('R95-WORLD-figures-never-touch-document', !/\bdocument\b/.test(code('mrmah3d/core/figures.js')));
  /* The moon: one painted disc, normal blending, unfogged, upper left, far. */
  ok('R95-WORLD-moon-is-one-painted-disc', /function moonTexture/.test(moon) && /createRadialGradient/.test(moon) &&
    (moon.match(/new PlaneGeometry\(/g) || []).length === 1);
  /* R95 world (round 5): the disc is fully opaque and its value distribution
     lives in the texture — at 0.86 under a tint nothing in it could deliver
     the reference's top band. Unfogged and normally blended is the intent. */
  ok('R95-WORLD-moon-unfogged-and-not-additive',
    /map: tex, color: new Color\(0x[0-9a-f]+\), transparent: true, opacity: (0\.\d+|1\.0),\s*depthWrite: false, toneMapped: false, fog: false/.test(moon) &&
    !/AdditiveBlending/.test(code('mrmah3d/core/moon.js')));
  ok('R95-WORLD-moon-hangs-far-and-high-on-the-left', /MOON = \{ x: -1\d, y: 4\d, z: -1[2-6]\d, disc: 1\d(\.\d)? \}/.test(moon));
  ok('R95-WORLD-moon-has-framing-clouds-in-one-geometry', /function moonCloudTexture/.test(moon) &&
    /MOON_CLOUDS\.forEach/.test(moon) && /moon-clouds/.test(moon) && (moon.match(/new Mesh\(/g) || []).length === 2);
  ok('R95-WORLD-moon-weights-from-authored-baselines', /var BASE = \{ disc: mat\.opacity, cloud: cloudMat\.opacity \}/.test(moon) &&
    /BASE\.disc \* weight/.test(moon) && !/BASE\.\w+\s*=\s*0\.\d/.test(code('mrmah3d/core/moon.js')));
  /* The figures: forge parts, baked vertex colours on an unlit material, one
     geometry, no edge lines, no fog, a bounded cast. */
  ok('R95-WORLD-figures-built-from-forge', /import \{ loft, segment \} from '\.\/character\/forge\.js'/.test(figures) &&
    /loft\(rings, 7/.test(figures) && /segment\(a, b/.test(figures));
  ok('R95-WORLD-figures-are-baked-vertex-colour', /vertexColors: true/.test(figures) && /MeshBasicMaterial/.test(figures) &&
    !/MeshStandardMaterial|MeshPhysicalMaterial|MeshLambertMaterial|LineSegments|EdgesGeometry|LineBasicMaterial/.test(figures));
  ok('R95-WORLD-figures-never-fogged', (figures.match(/fog:\s*false/g) || []).length >= 2 && !/fog:\s*true/.test(figures));
  ok('R95-WORLD-figures-faces-wound-outward', /if \(n\.dot\(outv\) < 0\)/.test(figures));
  const cast = (figures.match(/\{ x: -?[\d.]+, z: -[\d.]+, s: 0\.\d+, yaw: -?[\d.]+, body: '\w+', head: '\w+' \}/g) || []);
  /* R95-BB: four to seven. The bodybuilder brief asks for FEWER figures and a
     cleaner background; eight in a row read as a crowd. */
  ok('R95-WORLD-figures-cast-is-four-to-seven', cast.length >= 4 && cast.length <= 7, cast.length + ' figures');
  ok('R95-WORLD-figures-scaled-to-his-height', cast.every(c => { const s = Number(c.match(/s: (0\.\d+)/)[1]); return s >= 0.30 && s <= 0.60; }));
  ok('R95-WORLD-figures-stand-behind-him', cast.every(c => { const z = Number(c.match(/z: (-[\d.]+)/)[1]); return z <= -16 && z >= -36; }));
  ok('R95-WORLD-figures-vary-in-body', new Set(cast.map(c => c.match(/body: '(\w+)'/)[1])).size >= 5 &&
    /obese/.test(figures) && /thin/.test(figures) && /heavy/.test(figures) && /taper/.test(figures));
  ok('R95-WORLD-figures-vary-in-head', /round:\s*\{[^}]*sides: 8/.test(figures) && /wide:/.test(figures) && /tall:/.test(figures));
  ok('R95-WORLD-figures-have-eyes', /figure-eyes/.test(figures) && /AdditiveBlending/.test(figures));
  ok('R95-WORLD-figures-two-draws', /draws: 2/.test(figures) && (figures.match(/new Mesh\(/g) || []).length === 1 && (figures.match(/new Points\(/g) || []).length === 1);
  ok('R95-WORLD-figures-feet-dissolve', /footFade/.test(figures) && /Float32BufferAttribute\(acc\.col, 4\)/.test(figures));
  /* The hover beam: a dedicated core texture on the crossed quads. */
  ok('R95-WORLD-hover-beam-has-a-core', /function beamTexture/.test(envR95) && /map: beamTex/.test(envR95) &&
    /new PlaneGeometry\(0\.02[0-9], 1\)/.test(envR95));
  /* The floor: the beams mirrored through it on a soft smear, tiered. */
  ok('R95-WORLD-beams-mirrored-into-floor', /function buildBeamMirror/.test(terrainR95) && /beacon-beams-mirror/.test(terrainR95) &&
    /settings\.worldReflections && opts\.smear/.test(terrainR95) && /function smearTexture/.test(envR95) &&
    /smearTex = smearTexture\(\)/.test(envR95) && /smear: smearTex\b/.test(envR95) && /owned\.push\(rampTex, worldRadialTex, smearTex\)/.test(envR95));
  ok('R95-WORLD-beam-mirror-weighted-from-baseline', /beamMirror: beamMirror \? beamMirror\.mat\.opacity : 0/.test(terrainR95) &&
    /BASE\.beamMirror \* weight/.test(terrainR95));
  /* The range: darker than the character. The mid tone's diffuse gain and
     steel catch came down from R94's 0.60 / 0.34. */
  const midTone = (terrainR95.match(/mid:\s*\{ base: srgb\(\d+, \d+, \d+\), amb: ([\d.]+), kd: ([\d.]+), spec: srgb\([^)]+\), ks: ([\d.]+)/) || []);
  ok('R95-WORLD-range-tones-came-down', midTone.length === 4 && Number(midTone[1]) <= 0.90 && Number(midTone[2]) <= 0.40 && Number(midTone[3]) <= 0.22,
    'mid amb/kd/ks ' + midTone.slice(1).join('/'));
  /* No cast shadow anywhere. */
  ok('R95-WORLD-key-never-casts', /key\.castShadow = false;/.test(lightsR95) && !/key\.castShadow = !!settings\.shadows/.test(lightsR95));
  ok('R95-WORLD-no-shadow-catcher', !/ShadowMaterial/.test(envCode) && !/receiveShadow/.test(envCode) && !/name = 'ground'/.test(envCode));
  /* One writer each, from authored baselines, through applyMode / applyFine. */
  ok('R95-WORLD-applyMode-drives-moon-and-figures',
    /moon\.applyWeight\(W\.structures\)/.test(envR95) && /figures\.applyWeight\(W\.structures\)/.test(envR95) &&
    /moon\.setDetail\(k\)/.test(envR95) && /figures\.setDetail\(k\)/.test(envR95));
  ok('R95-WORLD-new-parts-disposed-with-environment', /owned\.push\(moon\)/.test(envR95) && /owned\.push\(figures\)/.test(envR95) &&
    /owned\.forEach\(function \(o\) \{ if \(o && o\.dispose\) o\.dispose\(\); \}\)/.test(moon) &&
    /owned\.forEach\(function \(o\) \{ if \(o && o\.dispose\) o\.dispose\(\); \}\)/.test(figures));
  /* The mist in front of the figures is thinned, from the authored table. */
  ok('R95-WORLD-front-mist-veiled-not-rewritten', /veil: 0\.\d+/.test(envR95) &&
    /m\.opacity = mistMat\.opacity \* b\.o \* \(b\.veil == null \? 1 : b\.veil\)/.test(envR95));
  /* Guardian references committed. */
  ['a', 'b', 'c', 'd'].forEach(function (k) {
    ok('R95-WORLD-reference-' + k + '-is-committed', exists('reference/mrmah-refD-guardian-' + k + '.png'));
  });
}
/* ---- end R95 world ------------------------------------------------------ */

if (exists('CLAUDE.md')) {
  const md = read('CLAUDE.md');
  [
    ['production-protected', /production MAHFITT is protected/i],
    ['experimental', /experimental/i],
    ['one-canonical-renderer', /canonical/i],
    ['shared-by-ai-chat-and-protocol', /AI Chat/i, /MAH Protocol/i],
    ['webgl-scoped', /WebGL/i],
    ['dom-elsewhere', /DOM/i],
    ['mobile-mandatory', /mobile/i],
    ['visual-inspection', /visual/i],
    ['approval-required', /approval/i],
    ['no-silent-redesign', /silently/i]
  ].forEach(function (rule) {
    ok('DOC-' + rule[0], rule.slice(1).every(re => re.test(md)));
  });
}

/* ---- R96: gloss, thin head, theme energy, one renderer with variants ------ */
(function () {
  const shader = read('mrmah3d/core/character/crystal-shader.js');
  const pal = read('mrmah3d/core/palette.js');
  const variants = exists('mrmah3d/core/character/variants.js') ? read('mrmah3d/core/character/variants.js') : '';
  const sceneSrc = read('mrmah3d/core/mrmah-scene.js');
  const propsSrc = read('mrmah3d/core/character/proportions.js');
  ok('R96-facet-dome-in-shader', /uDome/.test(shader) && /mrDome/.test(shader));
  const hw = Number((propsSrc.match(/halfWidth:\s*([\d.]+)\s*,/) || [])[1]);
  const hd = Number((propsSrc.match(/halfDepth:\s*([\d.]+)\s*,/) || [])[1]);
  ok('R96-head-is-a-thin-shell', hd > 0 && hd <= hw * 0.66, 'halfDepth ' + hd + ' against halfWidth ' + hw + ' (rear must not be bulbous)');
  ok('R96-theme-derived-from-secondary', /export function deriveTheme/.test(pal) &&
    ['emission', 'hero', 'crystalLight', 'atmosphere', 'worldAccent'].every(r => pal.indexOf(r) !== -1));
  ok('R96-theme-luminance-fitted', /function fit\(/.test(pal) && /yMin/.test(pal) && /yMax/.test(pal));
  ok('R96-scene-passes-derived-tint', /opts\.tint \|\| palette\.tint/.test(sceneSrc));
  ok('R96-variants-module', variants.length > 0 && /export function proportionsFor/.test(variants) && /female/.test(variants));
  ok('R96-variant-is-an-option-not-a-fork', /variant: opts\.variant/.test(sceneSrc) &&
    /proportionsFor\(opts\.variant\)/.test(read('mrmah3d/core/character/mrmah.js')));
  ok('R96-variant-keeps-one-lower-body', variants.length > 0 && !/leg/i.test(code('mrmah3d/core/character/variants.js')) && /hipShape/.test(variants));
  ok('R96-lab-declares-canonical-blue', /--bright-rgb:\s*79,\s*227,\s*255/.test(read('mrmah3d/lab/lab.css')));
})();

/* ---- R98: platinum coat, plate head, elbow hinge, hand lamp, square head -- */
(function () {
  const forge = read('mrmah3d/core/character/forge.js');
  const shader = read('mrmah3d/core/character/crystal-shader.js');
  const regions = read('mrmah3d/core/character/regions.js');
  const propsSrc = read('mrmah3d/core/character/proportions.js');
  const limbs = read('mrmah3d/core/character/limbs.js');
  const mats = read('mrmah3d/core/character/materials.js');
  const figures = read('mrmah3d/core/figures.js');
  ok('R98-platinum-references-present',
    exists('reference/mrmah-refH-platinum-front.png') && exists('reference/mrmah-refH-platinum-threequarter.png'));
  /* the coat is a per-polygon mask in the geometry, not a global tint */
  ok('R98-coat-is-a-geometry-mask', /'aCoat'/.test(forge) && /faceCoat/.test(forge) && /quadCoat/.test(forge));
  ok('R98-coat-in-shader', /uCoat\b/.test(shader) && /mrCoatW/.test(shader) && /uCoatColor/.test(shader));
  /* the coat's weight is settled before roughness / metalness are decided */
  const colorAt = shader.indexOf('mrCoatW = clamp( vCoat * uCoat');
  const roughAt = shader.indexOf('roughnessFactor = mix( roughnessFactor, uCoatRough');
  ok('R98-coat-weight-decided-before-roughness', colorAt > 0 && roughAt > colorAt);
  /* dark rows never take the coat */
  ok('R98-coat-gated-off-dark-classes', /mrCoatW = clamp\( vCoat \* uCoat, 0\.0, 1\.0 \) \* \( 1\.0 - smoothstep/.test(shader));
  /* every region carries its share, and the recesses carry none */
  ok('R98-regions-carry-coat-shares', /STERNUM:\s*\{[^}]*coat:\s*0\.00/.test(regions) && /DELT:\s*\{[^}]*coat:\s*1\.00/.test(regions) &&
    /HAND:\s*\{[^}]*coat:\s*0\.[0-2]/.test(regions));
  /* the coat is neutral, never theme energy */
  ok('R98-coat-colour-is-neutral', /platinum:\s*0x[0-9a-f]{6}/i.test(mats) && /coatColor:\s*PALETTE\.platinum/.test(mats) &&
    !/coatColor:\s*tint\./.test(mats));
  /* the head is a chamfered PLATE with a flat back and a wide face screen */
  const bevelZ = Number((propsSrc.match(/bevelZ:\s*([\d.]+)/) || [])[1]);
  const faceInset = Number((propsSrc.match(/faceInset:\s*([\d.]+)/) || [])[1]);
  ok('R98-head-front-is-a-shallow-chamfer', bevelZ > 0 && bevelZ <= 0.5, 'bevelZ ' + bevelZ + ' of halfDepth (was 0.96: a wall)');
  ok('R98-head-face-screen-is-wide', faceInset >= 0.64, 'faceInset ' + faceInset);
  ok('R98-head-has-a-flat-back-plate', /backInset:\s*0\.[5-9]/.test(propsSrc) && /backInset/.test(forge) && /backInset: HEAD\.backInset/.test(read('mrmah3d/core/character/head.js')));
  ok('R98-face-screen-self-lit', /emissive: new Color\(PALETTE\.faceGlow \|\| 0x[0-9a-f]{6}\)/i.test(mats));
  /* the elbow is a hinge: a lateral pin in the joint material */
  ok('R98-elbow-hinge-pin', /elbow-pin/.test(limbs) && /lateral/.test(limbs));
  /* the hand crystal lights the hand, and rides the glow */
  ok('R98-hand-crystal-lamp', /hand-crystal-lamp/.test(limbs) && /PointLight/.test(limbs) &&
    /limbs\.handLamp\.intensity/.test(read('mrmah3d/core/character/mrmah.js')));
  /* the forearm and upper arm have real profiles: brachialis, extensor, a taper into the elbow */
  ok('R98-arm-anatomy-profiles', /brachialis/.test(propsSrc) && /extensor/.test(propsSrc) && /ulna/.test(propsSrc));
  /* the background cast carries a square head among the diamonds and the round one */
  ok('R98-figures-include-a-square-head', /square:\s*\{[^}]*box: true/.test(figures) && /head: 'square'/.test(figures));
  /* the female variant carries the same reduced clavicle share as the male */
  ok('R98-variant-clavicle-carries-coat', /coat: 0\.30/.test(read('mrmah3d/core/character/variants.js')));
})();

/* ---- R99: the godform — anatomy first, shadow second, facets third ------- */
(function () {
  const forge = read('mrmah3d/core/character/forge.js');
  const propsSrc = read('mrmah3d/core/character/proportions.js');
  const limbs = read('mrmah3d/core/character/limbs.js');
  const body = read('mrmah3d/core/character/body.js');
  const regions = read('mrmah3d/core/character/regions.js');
  ok('R99-godform-reference-present', exists('reference/mrmah-refI-godform-front.jpg'));
  /* the underside of the pec is its own dark zone — contact shadow between masses */
  ok('R99-pec-underside-zone', /function pecUnderZone/.test(propsSrc) && /zoneAt: pecUnderZone/.test(propsSrc));
  /* the underarm pocket is lost */
  ok('R99-underarm-pocket-lost', /ae < 2\.05\) return \{ classes: REGIONS\.OBLIQUE\.classes[^}]*index: 0/.test(propsSrc));
  /* the inner arm is a shadow valley, decided per limb from its real basis */
  ok('R99-inner-arm-valley', /export function limbSideDirection/.test(forge) && /innerSignOf/.test(limbs) && /armZone\(REGIONS\.UPPER_ARM\.classes, upperInner\)/.test(limbs));
  /* the chest has depth: every chest ring is deeper than 0.85 of its width */
  const chestRows = propsSrc.match(/\{ y: (1\.895|1\.970|2\.080), w: ([\d.]+), d: ([\d.]+)/g) || [];
  ok('R99-chest-has-depth', chestRows.length === 3 && chestRows.every(r => { const m = r.match(/w: ([\d.]+), d: ([\d.]+)/); return Number(m[2]) >= Number(m[1]) * 0.85; }), chestRows.join(' | '));
  /* the neck is a column, not a connector: at least 0.13 half-width under the chin */
  const neckRow = propsSrc.match(/\{ y: 2\.315, w: ([\d.]+)/);
  ok('R99-neck-carries-the-head', neckRow && Number(neckRow[1]) >= 0.13, 'neck half-width ' + (neckRow && neckRow[1]));
  /* no authored shoulder stroke: the deltoid's ridge line is off */
  ok('R99-no-shoulder-ridge-stroke', /if \(ARMS_\.deltoidRidge\)/.test(body) && !/deltoidRidge:\s*true/.test(propsSrc));
  /* the lowered hand is a fist */
  ok('R99-lowered-hand-is-a-fist', /var curl = opts\.open \? 0\.22 : 0\.5[0-9]/.test(limbs));
  /* the deltoid's root is buried in the chest, inboard of the pec's outer plane */
  ok('R99-deltoid-root-buried', /innerX: 0\.2[0-9]{2}/.test(body));
  /* the shadow-first debug views (brief §39): mass silhouette, anatomical groups, grayscale */
  const mrmahSrc = read('mrmah3d/core/character/mrmah.js');
  const labSrc = read('mrmah3d/lab/lab.js');
  ok('R99-debug-views-exist', /setDebugView/.test(mrmahSrc) && /'mass'|"mass"/.test(mrmahSrc) && /'groups'|"groups"/.test(mrmahSrc) &&
    /setDebugView/.test(read('mrmah3d/core/mrmah-scene.js')));
  ok('R99-debug-views-restore-exactly', /userData\.__mat/.test(mrmahSrc) && /delete o\.userData\.__mat/.test(mrmahSrc));
  ok('R99-lab-exposes-debug-views', /params\.get\('debug'\)/.test(labSrc) && /grayscale\(1\)/.test(labSrc));
  /* the anatomical groups are named so the view can tell them apart */
  ok('R99-anatomy-meshes-named', /name = 'torso'/.test(body) && /'deltoid-right' : 'deltoid-left'/.test(body) &&
    /'-upper'/.test(limbs) && /'-fore'/.test(limbs) && /'hand-solid'/.test(limbs));
  /* the presented crystal levitates over the palm and stops under reduced motion */
  ok('R99-hand-crystal-levitates', /crystal\.plate\.position\.y = crystal\.restY \+ lev/.test(mrmahSrc) && /if \(crystal && !reduced\)/.test(mrmahSrc));
  /* the rim is directional, not a uniform outline (brief §21): two view-space
     directions, rotated from world each frame by the scene */
  const shaderSrc = read('mrmah3d/core/character/crystal-shader.js');
  const sceneSrc2 = read('mrmah3d/core/mrmah-scene.js');
  ok('R99-rim-is-directional', /uRimDirA/.test(shaderSrc) && /uRimDirB/.test(shaderSrc) && /mrRimDir/.test(shaderSrc) &&
    /export function setRimDirections/.test(shaderSrc));
  ok('R99-rim-directions-follow-the-camera', /transformDirection\(cameraBox\.camera\.matrixWorldInverse\)/.test(sceneSrc2) &&
    /characterBox\.setRimDirections\(RIM_A_VIEW, RIM_B_VIEW\)/.test(sceneSrc2));
  /* the arm's named rows reach the dark end */
  ok('R99-arm-rows-reach-dark', /var UPPER_ARM = \[\s*\/\*[^]*?\*\/\s*var UPPER_ARM = \[|var UPPER_ARM = \[\n\s*\[0\.14,\s*0\.08,\s*-0\.10,\s*0\.7/.test(regions));
})();

/* ---- R100: the display module, the carving, the platinum / theme fusion --- */
(function () {
  const forge = read('mrmah3d/core/character/forge.js');
  const head = read('mrmah3d/core/character/head.js');
  const propsSrc = read('mrmah3d/core/character/proportions.js');
  const limbs = read('mrmah3d/core/character/limbs.js');
  const mats = read('mrmah3d/core/character/materials.js');
  const shader = read('mrmah3d/core/character/crystal-shader.js');
  const lab = read('mrmah3d/lab/lab.js');
  /* the head is a casing around a display module: channel floor, bezel wall, glass forward of the floor */
  ok('R100-display-module-geometry', /screenInset/.test(forge) && /bezel\.push\(\[S0\[sj\], S\[sj\], S\[s\], S0\[s\]\]\)/.test(forge) &&
    /material: 3/.test(forge) && /geo\.userData\.screen/.test(forge));
  const screenZ = Number((propsSrc.match(/screenZ:\s*(-?[\d.]+)/) || [])[1]);
  const faceZ = Number((propsSrc.match(/faceZ:\s*(-?[\d.]+)/) || [])[1]);
  const bevelZ = Number((propsSrc.match(/bevelZ:\s*([\d.]+)/) || [])[1]);
  ok('R100-glass-forward-of-floor-behind-lip', screenZ > faceZ && screenZ < bevelZ, 'floor ' + faceZ + ' < glass ' + screenZ + ' < lip ' + bevelZ);
  const screenInset = Number((propsSrc.match(/screenInset:\s*([\d.]+)/) || [])[1]);
  ok('R100-screen-keeps-the-face', screenInset >= 0.63 && screenInset <= 0.70, 'screenInset ' + screenInset + ' (the smile reaches 0.625)');
  ok('R100-head-has-four-materials', /materials\.face, materials\.cavity, materials\.bezel/.test(head) && /var bezel = new MeshStandardMaterial/.test(mats));
  /* the casing's shadow on the glass is a vertex-alpha ring, not a filter */
  ok('R100-casing-shadow-on-glass', /display-shadow/.test(head) && /vertexColors: true/.test(head) && !/style\.filter|backdrop/.test(head));
  /* hardware / content split: a content slot that can host more than the face, developer only */
  ok('R100-display-content-slot', /function setIcon/.test(head) && /display-icon/.test(head) && /faceContent/.test(head) &&
    /setDisplayIcon/.test(read('mrmah3d/core/mrmah-scene.js')) && /params\.get\('face'\)/.test(lab));
  ok('R100-icon-is-not-in-any-state', !/setIcon|setDisplayIcon/.test(read('mrmah3d/core/character/states.js')) && !/setDisplayIcon/.test(read('mrmah3d/core/surfaces.js')));
  /* the glass is glossy, dark, and carries a trace of the theme */
  ok('R100-display-glass-material', /roughness: 0\.0[0-9],\s*\n\s*metalness: 0\.7/.test(mats) && /\.lerp\(new Color\(tint\.glow \|\| PALETTE\.glow\), 0\.1/.test(mats));
  /* anatomy: traps, clavicle groove, serratus, bicep crest, lateral tricep head, radial ridge, knuckles */
  ok('R100-trapezius-ring-and-zone', /function trapZone/.test(propsSrc) && /zoneAt: trapZone/.test(propsSrc));
  ok('R100-clavicle-groove', /function subclavicleShape/.test(propsSrc) && /function subclavicleZone/.test(propsSrc) && /zoneAt: subclavicleZone/.test(propsSrc));
  ok('R100-serratus-saw', /tooth/.test(propsSrc) && /SERRATUS/.test(propsSrc));
  ok('R100-bicep-crest-and-lateral-head', /bump\(d, 0, 0\.62\) \* 0\.360/.test(propsSrc) && /lateralHead/.test(propsSrc));
  ok('R100-radial-forearm-ridge', /var radial = bump\(d, outer \* 0\.95/.test(propsSrc) && /ARMS_\.shapes\.fore\(t, d, foreInner\)/.test(limbs));
  ok('R100-cap-shadow-on-the-arm', /t < 0\.17 && ad > 0\.55/.test(limbs));
  ok('R100-hand-knuckles', /KNUCKLE/.test(limbs) && /spec\.digitRadius \* 1\.22/.test(limbs));
  /* platinum / theme fusion: the coat's albedo and grazing reflection carry the theme, the base stays neutral */
  ok('R100-platinum-reflects-the-theme', /mrTintN/.test(shader) && /mix\( vec3\( 1\.0 \), mrTintN, 0\.10 \)/.test(shader) &&
    /mix\( uCoatColor \* 1\.15, uTint, 0\.35 \)/.test(shader));
  ok('R100-internal-colour-seams', /mrSeam/.test(shader) && /uTint \* mrSeam \* 0\.1/.test(shader));
  ok('R100-platinum-base-still-neutral', /platinum: 0xc4ccd8/.test(mats) && /coatColor: PALETTE\.platinum/.test(mats));
})();

console.log('\n' + pass + '/' + (pass + fail) + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
