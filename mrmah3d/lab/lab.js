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
      /* The lab screenshots itself during verification, which needs the
         drawing buffer to survive the frame. Production hosts must leave this
         off — it costs a buffer copy on some mobile drivers. */
      preserveDrawingBuffer: true
    });
    window.__MRMAH_LAB.mounted = true;
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
