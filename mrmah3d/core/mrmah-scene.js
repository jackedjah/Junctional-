/* MR.MAH 3D :: SCENE  (composition root / public API)

   THIS IS THE ONE ENTRY POINT. Everything else in core/ is an implementation
   detail and should not be imported by a host surface.

       import { createMrMahScene } from '/mrmah3d/core/mrmah-scene.js';
       const mah = createMrMahScene(hostElement);
       ...
       mah.destroy();

   The whole point of routing every future surface — AI Chat, MAH Protocol,
   Home, coach-facing — through this one function is that there is exactly one
   canonical Mr.Mah. When the real model, materials and animation states land,
   they land behind this call and every surface receives them at once.

   PHASE 1 STATUS: experimental, development-only, placeholder geometry.
   Mounting this into a production MAHFITT surface requires explicit approval.
   See CLAUDE.md. */

import { detectTier, degrade, prefersReducedMotion } from './quality.js';
import { readPalette } from './palette.js';
import { createRenderer } from './renderer.js';
import { createStage } from './stage.js';
import { createCamera } from './camera.js';
import { createLights } from './lights.js';
import { createEnvironment } from './environment.js';
import { createCharacter } from './character.js';
import { createInteraction } from './interaction.js';
import { createLoop } from './lifecycle.js';

export var VERSION = '0.1.0-phase1';

export function isSupported(win) {
  var w = win || (typeof window !== 'undefined' ? window : null);
  if (!w || !w.document) return false;
  try {
    var c = w.document.createElement('canvas');
    return !!(w.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

export function createMrMahScene(host, options) {
  var opts = options || {};
  if (!host) throw new Error('createMrMahScene: a host element is required');

  var win = opts.window || (typeof window !== 'undefined' ? window : null);
  var doc = opts.document || (host.ownerDocument || (typeof document !== 'undefined' ? document : null));

  /* Refuse loudly rather than half-mounting. A host that cannot get a context
     should fall back to the existing 2.5D rig, not to a blank rectangle. */
  if (!isSupported(win)) {
    var err = new Error('WebGL is not available');
    err.code = 'MRMAH3D_UNSUPPORTED';
    throw err;
  }

  var tier = opts.tier || detectTier(win);
  var palette = opts.palette || readPalette(doc);
  var reducedMotion = opts.reducedMotion != null ? !!opts.reducedMotion : prefersReducedMotion(win);

  var rendererBox = createRenderer({
    tier: tier,
    window: win,
    exposure: opts.exposure,
    preserveDrawingBuffer: !!opts.preserveDrawingBuffer
  });
  var settings = rendererBox.settings;

  var stageBox = createStage({ palette: palette, settings: settings });
  var cameraBox = createCamera({ framing: opts.framing });
  var lightsBox = createLights({ palette: palette, settings: settings, parent: stageBox.scene });
  var envBox = createEnvironment({ palette: palette, settings: settings, parent: stageBox.world });
  var characterBox = (opts.createCharacter || createCharacter)({
    palette: palette, settings: settings, parent: stageBox.subject
  });

  host.appendChild(rendererBox.canvas);

  /* ---- sizing -------------------------------------------------------- */

  function measure() {
    var r = host.getBoundingClientRect ? host.getBoundingClientRect() : null;
    var w = Math.max(1, Math.round((r && r.width) || host.clientWidth || 1));
    var h = Math.max(1, Math.round((r && r.height) || host.clientHeight || 1));
    return { width: w, height: h };
  }

  function resize() {
    var m = measure();
    rendererBox.setSize(m.width, m.height);
    cameraBox.setViewport(m.width, m.height);
    return m;
  }

  var ro = null;
  if (win && typeof win.ResizeObserver === 'function') {
    /* ResizeObserver rather than window.resize: the host element can change
       size without the window doing so — an opening History drawer, a rotating
       iPad, a keyboard pushing the layout. window.resize misses all of them. */
    ro = new win.ResizeObserver(function () { resize(); });
    ro.observe(host);
  } else if (win) {
    win.addEventListener('resize', resize);
  }

  /* ---- context loss --------------------------------------------------- */

  var contextLost = false;
  function onContextLost(e) {
    /* Without preventDefault the browser will not deliver a restore event and
       the canvas is dead permanently. */
    if (e && e.preventDefault) e.preventDefault();
    contextLost = true;
    loop.pause();
  }
  function onContextRestored() {
    contextLost = false;
    resize();
    loop.start();
  }
  rendererBox.canvas.addEventListener('webglcontextlost', onContextLost, false);
  rendererBox.canvas.addEventListener('webglcontextrestored', onContextRestored, false);

  /* ---- frame ---------------------------------------------------------- */

  function renderFrame(dt) {
    if (contextLost || rendererBox.isDisposed()) return;
    characterBox.update(dt, { reducedMotion: reducedMotion });
    rendererBox.renderer.render(stageBox.scene, cameraBox.camera);
  }

  var loop = createLoop({
    render: renderFrame,
    element: host,
    window: win,
    document: doc,
    onOverBudget: function () {
      var next = degrade(rendererBox.state.tier);
      if (next !== rendererBox.state.tier) {
        rendererBox.setTier(next);
        resize();
      }
    }
  });

  var interactionBox = createInteraction({
    element: rendererBox.canvas,
    getYaw: characterBox.getYaw,
    onYaw: function (y) {
      characterBox.setYaw(y);
      /* Keep the key light swinging with the subject the way the 2.5D rig's
         midpoint calculator does — horizontal only, never vertical. */
      lightsBox.setKeyAzimuth(Math.sin(y) * 0.5);
      /* Repaint immediately so a drag stays responsive even while the loop is
         paused (reduced motion, or off-screen with a pointer still captured). */
      if (!loop.isRunning()) renderFrame(0);
    }
  });

  resize();
  loop.start();
  /* One synchronous frame so the very first paint is not an empty canvas —
     and so a screenshot taken immediately after mount has real content. */
  renderFrame(0);

  /* ---- teardown ------------------------------------------------------- */

  var destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    loop.destroy();
    interactionBox.dispose();
    if (ro) ro.disconnect(); else if (win) win.removeEventListener('resize', resize);
    rendererBox.canvas.removeEventListener('webglcontextlost', onContextLost);
    rendererBox.canvas.removeEventListener('webglcontextrestored', onContextRestored);
    characterBox.dispose();
    envBox.dispose();
    lightsBox.dispose();
    stageBox.dispose();
    /* Renderer last: it is what actually hands the WebGL context back. */
    rendererBox.dispose();
  }

  return {
    version: VERSION,
    host: host,
    canvas: rendererBox.canvas,
    renderer: rendererBox.renderer,
    scene: stageBox.scene,
    camera: cameraBox.camera,
    palette: palette,
    parts: {
      renderer: rendererBox, stage: stageBox, camera: cameraBox,
      lights: lightsBox, environment: envBox, character: characterBox,
      interaction: interactionBox, loop: loop
    },
    resize: resize,
    pause: loop.pause,
    start: loop.start,
    destroy: destroy,
    setReducedMotion: function (v) { reducedMotion = !!v; },
    info: function () {
      return {
        version: VERSION,
        tier: rendererBox.state.tier,
        pixelRatio: rendererBox.state.pixelRatio,
        width: rendererBox.state.width,
        height: rendererBox.state.height,
        fov: Math.round(cameraBox.camera.fov * 10) / 10,
        camAspect: Math.round(cameraBox.camera.aspect * 1000) / 1000,
        reducedMotion: reducedMotion,
        placeholder: !!characterBox.isPlaceholder,
        contextLost: contextLost,
        destroyed: destroyed,
        loop: loop.state(),
        stats: loop.stats,
        drawCalls: rendererBox.renderer.info.render.calls,
        triangles: rendererBox.renderer.info.render.triangles,
        geometries: rendererBox.renderer.info.memory.geometries,
        textures: rendererBox.renderer.info.memory.textures
      };
    }
  };
}
