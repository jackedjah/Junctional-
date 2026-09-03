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

  return {
    rgb: { ink: ink, bright: bright, card: card },
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

export var __internals = { FALLBACK: FALLBACK, mix: mix, hex: hex };
