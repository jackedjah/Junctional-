/* MR.MAH 3D :: RENDERER
   Owns the WebGLRenderer, the canvas, the drawing-buffer size and the WebGL
   context lifetime. Nothing else in this package is allowed to create a
   context, resize a buffer or call dispose on the renderer.

   The one hard rule here: every context this module opens must be closable.
   MAHFITT is a single-page app whose members navigate constantly, and browsers
   cap live WebGL contexts (Safari especially). A leaked context is not a slow
   page, it is a page where the next mount renders nothing at all. */

import { WebGLRenderer, SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap } from '../vendor/three/three.module.min.js';
import { pixelRatioFor, settingsFor } from './quality.js';

export function createRenderer(options) {
  var opts = options || {};
  var tier = opts.tier || 'medium';
  var settings = settingsFor(tier);
  var win = opts.window || (typeof window !== 'undefined' ? window : null);

  var renderer = new WebGLRenderer({
    antialias: settings.antialias,
    alpha: true,               /* the stage sits over MAHFITT's own background */
    powerPreference: 'default',/* 'high-performance' can force the discrete GPU
                                  and drain battery for a character bust */
    stencil: false,
    depth: true,
    /* Needed to screenshot / read pixels for visual validation. Costs a buffer
       copy on some drivers, so it is opt-in and off in normal use. */
    preserveDrawingBuffer: !!opts.preserveDrawingBuffer
  });

  renderer.outputColorSpace = SRGBColorSpace;
  /* MAHFITT's stage is very dark with small bright speculars — exactly the case
     where a filmic curve beats clipping to white. */
  renderer.toneMapping = ACESFilmicToneMapping;
  /* ACES rolls the top end off hard. At exposure 1 the crystal's bright facets
     were being compressed into the same mid-tone as its dark ones, flattening
     exactly the contrast the reference depends on. */
  /* 1.25 rather than 0.95, and the reasoning behind the change is worth
     keeping because it reverses an earlier one. Exposure was pulled DOWN when
     the environment was bright, because lifting everything together was
     flattening the crystal. With the environment rebuilt dark the measurement
     inverted: the character now had 42% of its pixels in the darkest eighth
     against the reference's 33%, i.e. it was globally too dark rather than
     short of highlights, and ACES's shoulder means a lift here moves the darks
     and midtones up while the bright catches roll off gently instead of
     clipping. Exposure is the right knob for a distribution shifted as a whole;
     envMapIntensity is the right knob for a missing bright tail. They are not
     interchangeable, and using the wrong one produced a flat body once already. */
  renderer.toneMappingExposure = Number(opts.exposure) || 1.25;
  renderer.shadowMap.enabled = settings.shadows;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  var canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  /* The character is draggable; without this the browser steals the gesture and
     scrolls the page instead. */
  canvas.style.touchAction = 'none';

  var state = { tier: tier, settings: settings, width: 0, height: 0, pixelRatio: 1, disposed: false };

  /* Resize is separated from "measure" on purpose: the lab and any future
     MAHFITT host measure their own container, and passing the size in keeps
     this module free of layout assumptions. */
  function setSize(cssWidth, cssHeight) {
    if (state.disposed) return state;
    var w = Math.max(1, Math.round(Number(cssWidth) || 1));
    var h = Math.max(1, Math.round(Number(cssHeight) || 1));
    var ratio = pixelRatioFor(state.tier, w, h, win);
    if (w === state.width && h === state.height && ratio === state.pixelRatio) return state;
    state.width = w; state.height = h; state.pixelRatio = ratio;
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);   /* false: never write inline px onto the
                                        canvas — CSS owns the layout box */
    return state;
  }

  function setTier(nextTier) {
    if (state.disposed || nextTier === state.tier) return state;
    state.tier = nextTier;
    state.settings = settingsFor(nextTier);
    renderer.shadowMap.enabled = state.settings.shadows;
    /* Force the pixel ratio to be recomputed under the new cap. */
    var w = state.width, h = state.height;
    state.width = 0; state.height = 0;
    setSize(w, h);
    return state;
  }

  /* Full teardown. Called on unmount, on page hide in some hosts, and by the
     lab's explicit destroy button so the behaviour is actually observable. */
  function dispose() {
    if (state.disposed) return;
    state.disposed = true;
    try { renderer.dispose(); } catch (e) {}
    /* dispose() releases three's own GPU objects but leaves the context alive.
       This is the call that actually gives the context back to the browser. */
    try {
      var ext = renderer.getContext().getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    } catch (e) {}
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  return {
    renderer: renderer,
    canvas: canvas,
    state: state,
    settings: settings,
    setSize: setSize,
    setTier: setTier,
    dispose: dispose,
    isDisposed: function () { return state.disposed; }
  };
}
