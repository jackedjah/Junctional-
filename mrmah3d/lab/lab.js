/* MR.MAH 3D LAB — development-only harness.

   Mounts the canonical renderer, shows what it is doing, and exposes the
   lifecycle controls so cleanup can actually be observed rather than assumed.

   This file is a harness, not part of the renderer. Nothing in core/ imports
   it, and nothing here should acquire renderer logic — if a behaviour matters,
   it belongs in core/ where a future MAHFITT surface will also get it. */

import { createMrMahScene, isSupported, VERSION } from '../core/mrmah-scene.js';
import { TIERS } from '../core/quality.js';

var host = document.getElementById('stage');
var readout = document.getElementById('readout');
var scene = null;

var forcedTier = null;

/* ?canonical=1 puts the stage into the reference frame's aspect. That is the
   view the character's camera was solved for, and the only one that should be
   compared against reference/mrmah-canonical-front.png. */
var params = new URLSearchParams(location.search || '');
if (params.get('canonical') === '1') document.documentElement.dataset.canonical = '1';
/* ?tier=high|medium|low forces the quality tier at mount.

   This exists because the verification container advertises very few cores and
   therefore always resolves to the LOW tier, where bloom is deliberately not
   created at all. Without an override every captured frame would be missing an
   effect that most real devices will run, so the evidence would not show what
   the product actually looks like. Development affordance only — nothing in
   the renderer reads it, and production hosts pass no tier and get detection. */
var tierParam = params.get('tier');
if (tierParam === 'high' || tierParam === 'medium' || tierParam === 'low') {
  forcedTier = tierParam;
}
/* R96: ?bright=r,g,b sets the Secondary theme colour the renderer derives its
   energy palette from — the way to see him under a member's non-blue theme.
   Development affordance only; production hosts carry the real token. */
/* R96: ?variant=female mounts the female proportion set (variants.js). */
var variantParam = params.get('variant') === 'female' ? 'female' : undefined;
var brightParam = params.get('bright');
/* R99: ?debug=mass|groups|gray — the godform brief's shadow-first views.
   `mass` and `groups` swap the character's materials (scene.setDebugView);
   `gray` desaturates the stage in CSS so the value hierarchy can be judged
   without its colour. Development affordance only. */
var debugParam = params.get('debug');
/* R100: ?face=dumbbell puts the developer-only dumbbell icon on the display glass. */
var faceParam = params.get('face');
if (brightParam && /^\s*\d+\s*,\s*\d+\s*,\s*\d+\s*$/.test(brightParam)) {
  document.documentElement.style.setProperty('--bright-rgb', brightParam);
}

function say(text, isError) {
  readout.textContent = text;
  if (isError) readout.setAttribute('data-error', '1');
  else readout.removeAttribute('data-error');
}

/* A single object the verification harness reads instead of scraping the DOM. */
window.__MRMAH_LAB = {
  version: VERSION,
  mounted: false,
  errors: [],
  get scene() { return scene; },
  info: function () { return scene ? scene.info() : null; }
};

window.addEventListener('error', function (e) {
  window.__MRMAH_LAB.errors.push(String(e.message || e));
});
window.addEventListener('unhandledrejection', function (e) {
  window.__MRMAH_LAB.errors.push('unhandledrejection: ' + String((e.reason && e.reason.message) || e.reason));
});

function mount() {
  if (scene) return;
  if (!isSupported()) {
    say('WebGL is not available in this browser.\nIn MAHFITT this is the case that must fall back to the existing 2.5D rig.', true);
    return;
  }
  try {
    scene = createMrMahScene(host, {
      tier: forcedTier || undefined,
      variant: variantParam,
      /* The lab screenshots itself during verification, which needs the
         drawing buffer to survive the frame. Production hosts must leave this
         off — it costs a buffer copy on some mobile drivers. */
      preserveDrawingBuffer: true
    });
    window.__MRMAH_LAB.mounted = true;
    if (debugParam === 'mass' || debugParam === 'groups') scene.setDebugView(debugParam);
    if (debugParam === 'gray') host.style.filter = 'grayscale(1)';
    if (faceParam && scene.setDisplayIcon) scene.setDisplayIcon(faceParam);
  } catch (err) {
    window.__MRMAH_LAB.errors.push(String(err && err.message || err));
    say('Mount failed: ' + (err && err.message || err), true);
  }
}

function unmount() {
  if (!scene) return;
  scene.destroy();
  scene = null;
  window.__MRMAH_LAB.mounted = false;
}

document.querySelector('.lab-controls').addEventListener('click', function (e) {
  var act = e.target && e.target.getAttribute('data-act');
  if (!act) return;
  if (act === 'pause' && scene) scene.pause();
  if (act === 'start' && scene) scene.start();
  if (act === 'destroy') unmount();
  if (act === 'remount') { unmount(); mount(); }
  if (act === 'tier') {
    var i = TIERS.indexOf(forcedTier || (scene ? scene.info().tier : 'medium'));
    forcedTier = TIERS[(i + 1) % TIERS.length];
    unmount(); mount();
  }
});

/* Page modes. Switching here is exactly what a MAHFITT surface will do:
   declare where the character is being shown and let the composition, world
   emphasis and resting behaviour follow. */
var modeBar = document.querySelector('.lab-modes');
modeBar.addEventListener('click', function (e) {
  var mode = e.target && e.target.getAttribute('data-mode');
  if (!mode || !scene) return;
  Array.prototype.forEach.call(modeBar.querySelectorAll('button'), function (b) {
    b.setAttribute('aria-pressed', String(b === e.target));
  });
  scene.setMode(mode);
});

/* Width presets. These constrain the *stage element*, not the window, so a
   desktop browser can check the phone and iPad layouts without a device — the
   renderer sees a genuinely different host size and must re-frame. */
var sizeBar = document.querySelector('.lab-sizes');
sizeBar.addEventListener('click', function (e) {
  var w = e.target && e.target.getAttribute('data-w');
  if (w == null) return;
  Array.prototype.forEach.call(sizeBar.querySelectorAll('button'), function (b) {
    b.setAttribute('aria-pressed', String(b === e.target));
  });
  document.documentElement.style.setProperty('--lab-preview-width', Number(w) ? w + 'px' : 'none');
});

function tick() {
  if (scene) {
    var i = scene.info();
    say([
      'mrmah3d ' + i.version + (i.placeholder ? '   [PLACEHOLDER GEOMETRY — NOT MR.MAH]' : ''),
      'mode        ' + scene.getMode() + '   state ' + scene.getState(),
      'surface     ' + i.width + ' x ' + i.height + ' css   dpr ' + i.pixelRatio + '   fov ' + i.fov + '°',
      'quality     tier ' + i.tier + (i.stats.tierDrops ? '  (auto-dropped ' + i.stats.tierDrops + 'x)' : ''),
      'loop        ' + (i.loop.running ? 'running' : 'STOPPED') +
        '   visible ' + i.loop.visible + '   on-screen ' + i.loop.onScreen + '   paused ' + i.loop.paused,
      'frame       ' + i.stats.avgMs.toFixed(2) + ' ms   ~' + i.stats.fps + ' fps   ' + i.stats.frames + ' frames',
      'gpu         ' + i.drawCalls + ' draws   ' + i.triangles + ' tris   ' +
        i.geometries + ' geometries   ' + i.textures + ' textures',
      'motion      ' + (i.reducedMotion ? 'reduced (respecting prefers-reduced-motion)' : 'normal')
    ].join('\n'));
  } else if (!window.__MRMAH_LAB.errors.length) {
    say('destroyed — WebGL context released.\nPress Re-mount to build a new one.');
  }
  requestAnimationFrame(tick);
}

mount();
tick();
