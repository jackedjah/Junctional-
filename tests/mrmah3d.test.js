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
const camZ = Math.cos(26 * Math.PI / 180) * 7.2;
ok('ENV-grid-near-edge-in-front-of-camera', centerZ + gridSize / 2 < camZ,
  'grid near edge z=' + (centerZ + gridSize / 2).toFixed(2) + ' vs camera z=' + camZ.toFixed(2));
ok('ENV-grid-cell-plausible', gridSize / gridDiv > 1 && gridSize / gridDiv < 2,
  'cell ' + (gridSize / gridDiv).toFixed(3) + ' units');
ok('ENV-grid-clear-of-shadow-plane', /y:\s*0\.0[2-9]/.test(env));
ok('ENV-ground-does-not-occlude', /ground\.material\.depthWrite\s*=\s*false/.test(env));
/* The reference world, not a bare floor. */
ok('ENV-glowing-grid-nodes', /grid-nodes/.test(env));
ok('ENV-floor-glow', /floor-glow/.test(env));
ok('ENV-background-structures', /structures/.test(env));
ok('ENV-particles', /motes/.test(env));
ok('ENV-world-stays-quiet', /Mr\.Mah is the only bright, detailed thing/.test(env));

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
const headW = Number((props.match(/halfWidth:\s*([\d.]+)\s*\*\s*H\s*\/\s*2/) || [])[1]);
const headH = Number((props.match(/halfHeight:\s*([\d.]+)\s*\*\s*H\s*\/\s*2/) || [])[1]);
ok('PROP-head-width-matches-reference', Math.abs(headW - 366 / 1119) < 0.01,
  'head width ' + headW.toFixed(4) + ' vs reference ' + (366 / 1119).toFixed(4));
ok('PROP-head-slightly-taller-than-wide', headH > headW,
  'the reference diamond is 366 wide by 384 tall');
ok('PROP-float-not-grounded', /height:\s*0\.1/.test(props));

/* Every part the brief names must actually exist as geometry. */
const parts = {
  'diamond head': /diamondCrystal/.test(read('mrmah3d/core/character/head.js')),
  'recessed face plate': /faceZ/.test(read('mrmah3d/core/character/forge.js')),
  'neck': /neckGeo/.test(read('mrmah3d/core/character/body.js')),
  'shoulders': /shoulder caps/i.test(read('mrmah3d/core/character/body.js')),
  'tapered torso': /torsoLoft/.test(read('mrmah3d/core/character/body.js')),
  'two arms': /ARMS\.right/.test(read('mrmah3d/core/character/limbs.js')) &&
              /ARMS\.left/.test(read('mrmah3d/core/character/limbs.js')),
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

/* ---- F4. tap and drag are distinguishable ----------------------------- */
const inter = read('mrmah3d/core/interaction.js');
ok('TAP-slop-before-drag', /DRAG_SLOP/.test(inter));
ok('TAP-time-bounded', /TAP_MS/.test(inter));
ok('TAP-drag-never-becomes-tap', /wasDragging/.test(inter));
ok('TAP-cancel-is-not-a-tap', /function cancel/.test(inter));

/* ---- G. persistent instructions exist --------------------------------- */
ok('DOC-claude-md', exists('CLAUDE.md'));
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

console.log('\n' + pass + '/' + (pass + fail) + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
