'use strict';
/* MR.MAH 3D — PHASE 1 STATIC CONTRACT SUITE

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

/* ---- E. framing is derived from the accepted design ------------------- */
const camera = read('mrmah3d/core/camera.js');
ok('CAM-fov-from-css-perspective', /fov:\s*55/.test(camera));
ok('CAM-pitch-from-css-rotateX', /pitchDeg:\s*26/.test(camera));
ok('CAM-documents-its-derivation', /perspective\(470px\)/.test(camera) && /rotateX\(64deg\)/.test(camera));
ok('CAM-fov-clamped', /maxFov/.test(camera));

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
ok('ENV-grid-cell-matches-css-aspect', Math.abs(gridSize / gridDiv - 1.3333) < 0.01,
  'cell ' + (gridSize / gridDiv).toFixed(3) + ' units');
ok('ENV-grid-clear-of-shadow-plane', /y:\s*0\.0[2-9]/.test(env));
ok('ENV-ground-does-not-occlude', /ground\.material\.depthWrite\s*=\s*false/.test(env));

/* ---- F. the placeholder is unmistakably a placeholder ----------------- */
const character = read('mrmah3d/core/character.js');
ok('PH-flagged-in-api', /isPlaceholder:\s*true/.test(character));
ok('PH-declared-in-source', /THIS IS NOT MR\.MAH/.test(character));
ok('PH-uses-neutral-not-theme-body', /palette\.placeholder/.test(character));
ok('PH-no-face-geometry', !/\b(eye|mouth|nose|brow|face)\b/i.test(code('mrmah3d/core/character.js')));
ok('PH-palette-warns-against-reuse', /Do not carry this value into him/.test(read('mrmah3d/core/palette.js')));

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
