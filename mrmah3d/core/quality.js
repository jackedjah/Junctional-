/* MR.MAH 3D :: QUALITY
   Device tiering and pixel-ratio budgeting.

   MAHFITT is mobile-first, so the renderer never gets to decide it wants more
   pixels than the device can afford. Everything expensive in this package asks
   this module first. It is deliberately the only place that reads the device.

   Tiers:
     'low'    small / low-core phones, or an explicitly degraded session
     'medium' typical modern phone
     'high'   tablet, desktop, or a device that has proven it can hold frame

   A tier is a budget, not a look. Phase 1 spends it on pixel ratio, shadow map
   size and antialiasing only. Later phases may add material and particle cost,
   but must keep reading the same tier rather than re-sniffing the device. */

export var TIERS = ['low', 'medium', 'high'];

/* Device pixel ratio is the single largest mobile cost: a DPR 3 iPhone asks the
   GPU for 9x the fragments of DPR 1 for zero perceived gain on a stylised dark
   scene. Cap hard, per tier. */
var DPR_CAP = { low: 1, medium: 1.5, high: 2 };

/* Above this many rendered pixels we pull the cap in one more step regardless
   of tier — an iPad landscape at DPR 2 is a far bigger bill than a phone at the
   same tier. */
var PIXEL_BUDGET = 2600000;

function readEnv(win) {
  win = win || (typeof window !== 'undefined' ? window : null);
  var nav = win && win.navigator || {};
  var mm = win && typeof win.matchMedia === 'function' ? win.matchMedia.bind(win) : null;
  return {
    dpr: Number(win && win.devicePixelRatio) || 1,
    cores: Number(nav.hardwareConcurrency) || 0,
    memory: Number(nav.deviceMemory) || 0,
    shortSide: Math.min(Number(win && win.innerWidth) || 0, Number(win && win.innerHeight) || 0),
    coarse: !!(mm && mm('(pointer:coarse)').matches),
    reducedMotion: !!(mm && mm('(prefers-reduced-motion:reduce)').matches),
    saveData: !!(nav.connection && nav.connection.saveData)
  };
}

/* Pick a starting tier from what the device advertises. Anything unknown is
   treated as mid, never as high — an unknown device is far more likely to be a
   locked-down phone than a workstation. */
export function detectTier(win) {
  var e = readEnv(win);
  if (e.saveData) return 'low';
  if (e.cores && e.cores <= 4) return 'low';
  if (e.memory && e.memory <= 2) return 'low';
  if (e.coarse && e.shortSide && e.shortSide < 390) return 'low';
  if (!e.coarse) return 'high';                       /* fine pointer: desktop */
  if (e.shortSide >= 744) return 'high';              /* iPad-class short side */
  return 'medium';
}

/* The pixel ratio the renderer is actually allowed to use for a given drawing
   surface. Takes CSS size so a large surface can be pulled back below its tier
   cap without changing the tier itself. */
export function pixelRatioFor(tier, cssWidth, cssHeight, win) {
  var e = readEnv(win);
  var cap = DPR_CAP[tier] || DPR_CAP.medium;
  var ratio = Math.min(e.dpr, cap);
  var w = Math.max(1, Number(cssWidth) || 1);
  var h = Math.max(1, Number(cssHeight) || 1);
  while (ratio > 1 && w * ratio * h * ratio > PIXEL_BUDGET) ratio = Math.max(1, ratio - 0.25);
  return Math.round(ratio * 100) / 100;
}

export function settingsFor(tier) {
  return {
    tier: tier,
    antialias: tier === 'high',
    shadows: tier !== 'low',
    shadowMapSize: tier === 'high' ? 1024 : 512,
    /* Bloom is the one genuinely optional pass in the renderer, so it is the
       first thing a weak device gives up. On low it is not created at all and
       the scene draws straight to the canvas exactly as before — no render
       target, no fullscreen passes, no cost. Above low it runs at quarter area
       and adds three small passes. */
    bloom: tier !== 'low',
    bloomStrength: tier === 'high' ? 0.44 : 0.36,
    /* Fog is nearly free and does the most per-cost work of anything here:
       it is what makes a dark stage read as having depth. Never dropped. */
    fog: true,
    /* R94 world. The floor's reflective response is a PROXY on every tier — a
       true planar reflection is a second pass over the whole scene and cannot
       fit the frame budget — but the proxy is tiered: above low, terrain.js
       mirrors the in-frame mid range through the floor (one draw, ~280
       triangles). Low keeps the hover column, the mist's reflection and the
       grid's local brightening only. */
    worldReflections: tier !== 'low'
  };
}

export function prefersReducedMotion(win) {
  return readEnv(win).reducedMotion;
}

/* Live degrade path. The loop reports measured frame cost; if a device cannot
   hold the tier it was given, it drops one step and stays there. It never
   promotes: oscillating between tiers is more visible than simply being one
   step dimmer, and a promotion would re-trigger the same overload that caused
   the demotion. */
export function degrade(tier) {
  var i = TIERS.indexOf(tier);
  return i > 0 ? TIERS[i - 1] : TIERS[0];
}

export var __internals = { readEnv: readEnv, DPR_CAP: DPR_CAP, PIXEL_BUDGET: PIXEL_BUDGET };
