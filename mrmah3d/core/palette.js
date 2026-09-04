/* MR.MAH 3D :: PALETTE
   The 3D system's colours are not invented here. They are the MAHFITT theme
   tokens, read from CSS custom properties at mount time so a member on a
   non-default theme gets a stage lit in their own palette.

   Token evidence (mygym.css, the MR.MAH block and .fabi-stage):
     --ink-rgb     14,17,20    the dark stage void
     --bright-rgb  233,201,143 the Secondary / warm accent that lights the rig
     --card-rgb    27,32,38    panel plane

   Every consumer takes colours from here. Nothing hardcodes a hex inline. */

var FALLBACK = {
  ink: [14, 17, 20],
  bright: [233, 201, 143],
  card: [27, 32, 38]
};

function readVar(styles, name, fallback) {
  if (!styles) return fallback.slice();
  var raw = String(styles.getPropertyValue(name) || '').trim();
  if (!raw) return fallback.slice();
  var parts = raw.split(/[\s,]+/).map(Number).filter(function (n) { return isFinite(n); });
  return parts.length >= 3 ? parts.slice(0, 3) : fallback.slice();
}

function hex(rgb) {
  return ((rgb[0] & 255) << 16) | ((rgb[1] & 255) << 8) | (rgb[2] & 255);
}

/* Mix two rgb triples. Used to derive plane tints that stay inside the theme
   rather than introducing a fourth colour the member never chose. */
function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

/* ---------------------------------------------------------------------------
   R96 — THE THEME ENERGY SYSTEM.

   The Secondary theme colour is LIGHT, not material. Mr.Mah's body is a
   permanent family — near-black, navy, dark crystal, gunmetal, ice — and the
   theme is what shines through it and off it: eyes, smile, chest and hand
   diamonds, the aura, the hover point, the rim, the hero facet tint, the
   internal crystal light, and the world's beacons. The blue references show
   what the correct Mr.Mah looks like when the Secondary is blue; they are one
   value of this function, not the function.

   Every role is derived from the Secondary's HUE with its own saturation and
   its own LUMINANCE band, fitted numerically — a yellow theme cannot blow him
   out and a purple one cannot make him disappear, because the emission's
   perceived luminance lands in the same band whatever the hue. */
function rgbToHsl(rgb) {
  var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  function f(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  var r, g, b;
  if (s === 0) { r = g = b = l; } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function luma(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }
/* A colour of the theme's hue at saturation `s` whose perceived luminance
   lands inside [yMin, yMax]: lightness is walked up or down until it does. */
function fit(h, s, l0, yMin, yMax) {
  var l = l0, rgb = hslToRgb(h, s, l), y = luma(rgb), i = 0;
  while (i++ < 40 && (y < yMin || y > yMax)) {
    l += y < yMin ? 0.015 : -0.015;
    l = Math.min(0.97, Math.max(0.05, l));
    rgb = hslToRgb(h, s, l); y = luma(rgb);
    if (l >= 0.97 || l <= 0.05) break;
  }
  return rgb;
}
export function deriveTheme(bright) {
  var hsl = rgbToHsl(bright);
  /* A near-grey Secondary has no hue to speak of (it would come out RED, hue
     zero); it falls back to the canonical blue rather than inventing one. */
  var h = hsl[1] < 0.12 ? 190 / 360 : hsl[0];
  /* a saturation floor, so a muted Secondary still gives a coloured energy */
  var s = Math.max(hsl[1], 0.72);
  var emission = fit(h, Math.max(s, 0.88), 0.62, 0.58, 0.80);   /* eyes, smile, diamonds, hover point */
  var theme = {
    energy: bright.slice(),
    emission: emission,
    hot: mix(emission, [255, 255, 255], 0.58),                  /* the white-hot cores */
    hero: fit(h, s, 0.58, 0.42, 0.68),                           /* edge tint, hero facet tint, rims */
    crystalLight: fit(h, Math.max(s, 0.80), 0.50, 0.33, 0.58),   /* the internal transmission light */
    atmosphere: fit(h, Math.max(s, 0.82), 0.48, 0.28, 0.52),     /* halo / aura */
    worldAccent: fit(h, s, 0.60, 0.44, 0.72)                     /* beacons, floor column, figure eyes */
  };
  Object.keys(theme).forEach(function (k) { theme[k + 'Hex'] = hex(theme[k]); });
  return theme;
}

export function readPalette(doc) {
  var d = doc || (typeof document !== 'undefined' ? document : null);
  var styles = null;
  try {
    if (d && d.documentElement && typeof getComputedStyle === 'function') {
      styles = getComputedStyle(d.documentElement);
    }
  } catch (e) { styles = null; }

  var ink = readVar(styles, '--ink-rgb', FALLBACK.ink);
  var bright = readVar(styles, '--bright-rgb', FALLBACK.bright);
  var card = readVar(styles, '--card-rgb', FALLBACK.card);
  var theme = deriveTheme(bright);

  return {
    rgb: { ink: ink, bright: bright, card: card },
    /* R96 — the theme energy roles (see deriveTheme) and the character tint
       built from them. `tint` is what createMrMahScene hands the character
       unless a host passes its own. */
    theme: theme,
    tint: {
      edge: theme.heroHex,
      glow: theme.emissionHex,
      hot: theme.hotHex,
      inner: theme.crystalLightHex
    },
    ink: hex(ink),
    bright: hex(bright),
    card: hex(card),
    /* Body plane: card pushed toward ink so the solid reads darker than the
       panels behind it and depends on light, not on its own brightness. This
       is the value the eventual Mr.Mah materials should sit near. */
    body: hex(mix(card, ink, 0.42)),

    /* PLACEHOLDER ONLY — a deliberately neutral slate, NOT theme-derived and
       NOT art direction.

       Two reasons it is not `body`. First, at the finished character's albedo
       a primitive stack renders as a near-black silhouette: measured, 83% of
       its pixels fell in the darkest luminance eighth and the three lit planes
       could not be told apart, so the placeholder proved nothing about depth.
       Second, a neutral grey cannot be mistaken for a colour decision, which
       keeps this obviously a test object.

       The real Mr.Mah must use `body` and carry R83's luminance discipline
       (mean character luminance ~18.5). Do not carry this value into him. */
    placeholder: 0x5F6D7A,
    /* Floor: nearly the void. The grid lines carry the perspective, not the
       ground colour. */
    floor: hex(mix(ink, card, 0.22)),
    /* Grid lines are the Secondary at low energy, matching .fabi-grid's
       rgba(--bright-rgb, .13) line treatment. */
    grid: hex(mix(ink, bright, 0.55)),
    fog: hex(ink),
    key: hex(mix(bright, [255, 255, 255], 0.28)),
    fill: hex(mix(card, bright, 0.18)),
    rim: hex(bright)
  };
}

export var __internals = { FALLBACK: FALLBACK, mix: mix, hex: hex, fit: fit, luma: luma, rgbToHsl: rgbToHsl, hslToRgb: hslToRgb };
