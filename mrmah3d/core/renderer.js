/* MR.MAH 3D :: RENDERER
   Owns the WebGLRenderer, the canvas, the drawing-buffer size and the WebGL
   context lifetime. Nothing else in this package is allowed to create a
   context, resize a buffer or call dispose on the renderer.

   The one hard rule here: every context this module opens must be closable.
   MAHFITT is a single-page app whose members navigate constantly, and browsers
   cap live WebGL contexts (Safari especially). A leaked context is not a slow
   page, it is a page where the next mount renders nothing at all. */

import { WebGLRenderer, LinearSRGBColorSpace, NoToneMapping, PCFSoftShadowMap } from '../vendor/three/three.module.min.js';
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

  /* R95 — ONE PIPELINE FOR EVERY TIER.

     three applies tone mapping and the output colour-space encoding ONLY when
     it renders to the canvas. The medium and high tiers render the scene into
     bloom's target first, so on those tiers the crystal has always been drawn
     WITHOUT the ACES curve and without sRGB encoding, and the composite quad
     writes those linear values to the canvas verbatim. The low tier, drawing
     straight to the canvas, got both. Captured side by side on identical
     framing, the low tier was a pale ice-white figure and the high tier the
     dark sapphire every reference pass has been tuned against: two different
     characters, and every histogram in this project was measured on the high
     one. (An earlier note in CLAUDE.md asserted the opposite about targets;
     it was wrong, and this capture is the evidence.)

     The high-tier look is the accepted one, so the direct path now matches it:
     no tone mapping and a linear output space, which is exactly what the
     composite does. `toneMappingExposure` is inert under NoToneMapping on both
     paths, so the tiers cannot drift apart again through it. */
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
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
  /* 1.38. The eight-band histogram is the argument: the character was piling
     48% of its pixels into band 2 against the reference's 28%, while bands 3
     and 4 sat under-filled. That is a distribution shifted as a whole rather
     than a missing bright tail, which is exposure's job and not
     envMapIntensity's — the two are not interchangeable and using the wrong one
     has produced a correctly-numbered, visually flat body here before. */
  /* R92: 1.38 -> 1.12. With the body rebuilt around a sapphire albedo the
     distribution came out correct in the middle and top-heavy at both ends:
     measured over the character's mask, dark sapphire landed on target at 45%
     but brighter blue ran 16.8% against a target of 8-12% while near-black sat
     at 1.7% against 10-15%. That is one distribution sitting too high, not two
     separate faults — which is precisely what exposure is for, and precisely
     what envMapIntensity is not (it would have pulled the bright end down and
     left the missing blacks missing). */
  /* R92: tried at 1.12 and put back. Exposure shifts a distribution as a whole,
     and this one was not shifted — it was too NARROW: near-black short by ten
     points while brighter blue ran high. Lowering exposure bought 3 points of
     black and cost 8 points of sapphire, which is the wrong trade. Widening is
     absorption's job (uInnerDark in crystal-shader.js), because that scales by
     each facet's own darkness and so pulls the bottom down without touching the
     top. */
  renderer.toneMappingExposure = Number(opts.exposure) || 1.38;
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
