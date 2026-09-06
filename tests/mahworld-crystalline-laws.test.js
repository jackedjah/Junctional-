/* MAHWORLD — THE CRYSTALLINE SMOOTHNESS LAWS (visual law §06), checked statically.

   THE RULE, in the form this codebase already states best (clouds.js's own header):

       THE SILHOUETTE IS ROUND. THE SURFACE IS CRYSTALLINE.

   The direction has been given four separate times — "make it more round looking not so pointy",
   "round off all things somewhat sharp in the architecture", "controlled smoothness (not bubbly,
   not jagged)", and §06's "do not confuse diamond with sharp everywhere" — and it has been
   half-applied three times, because each pass corrected the module in front of it and left the
   others. terrain.js lost its cones in v8 while sky.js kept building 5–7 sided ConeGeometry peaks
   for the same horizon; sky-atmosphere.js's peaks were corrected only after a render caught them.

   The point of this file is that the direction stops depending on whoever is looking. A pointy form
   fails the build.

   WHAT THESE LAWS DO NOT DO. They cannot see a silhouette, so they do not try. They catch the
   MECHANICAL signatures of pointiness — the primitives and literals that can only ever produce a
   point — and they leave judgement to the eye. A form can pass every law here and still read as
   jagged; nothing here licenses the conclusion that the world is smooth.

   THE BRAND EXEMPTION. The SQUARE DIAMOND — an octahedron, a square rotated 45° — is MAHFITT's own
   figure. Beacons, markers, the reserved mark, ascent pods, resident heads and the leaf plate are
   square diamonds on purpose and MUST keep their points. Rounding one is a worse failure than
   leaving a cone. So OctahedronGeometry is legal only where the code says what it is, by role, on
   its own line — the same by-role test LAW-001 uses for interior light.

   Run: node tests/mahworld-crystalline-laws.test.js */
'use strict';
const fs = require('fs'), p = require('path');
const DIR = p.resolve(__dirname, '../mahworld/scene');

/* Strip comments WITHOUT losing line numbers — a block comment collapses to the same count of
   newlines it spanned, so a reported line number points at the real line. (The skyrealm suite
   shipped this bug once: it reported :144 for something on :215.) */
const stripComments = s => s
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''))
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const FILES = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort();
const src = {};
for (const f of FILES) src[f] = stripComments(fs.readFileSync(p.join(DIR, f), 'utf8'));

let pass = 0, fail = 0;
const P = (name, ok, detail) => {
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '\n        ' + String(detail).split('\n').join('\n        ') : '')); }
};

/* walk every non-comment line of every scene module */
function scan(fn) {
  const hits = [];
  for (const f of FILES) {
    const lines = src[f].split('\n');
    for (let i = 0; i < lines.length; i++) {
      const r = fn(lines[i], f, i + 1);
      if (r) hits.push(f + ':' + (i + 1) + '  ' + (r === true ? lines[i].trim().slice(0, 110) : r));
    }
  }
  return hits;
}

/* ------------------------------------------------------------------ CRY-001 */
/* A cone is the pointiest primitive there is, and a row of them is a sawtooth. terrain.js's own
   header puts it exactly: "a cone's tangent is the same all the way to its point", which is why
   widening a cone only produces a wider cone. Nothing in this world is built from one. */
{
  const hits = scan(l => /\bnew\s+THREE\.ConeGeometry\b/.test(l));
  P('CRY-001 no ConeGeometry anywhere in the scene — a cone cannot have a round summit',
    hits.length === 0,
    hits.join('\n') + (hits.length ? '\n\nUse a convex profile whose tangent turns horizontal at the summit; see terrain.js massif().' : ''));
}

/* ------------------------------------------------------------------ CRY-002 */
/* A CylinderGeometry whose TOP radius is zero is a cone wearing a different constructor. This
   catches the rename dodge. */
{
  const hits = scan(l => {
    const m = /\bnew\s+THREE\.CylinderGeometry\(\s*(-?[\d.]+)\s*,/.exec(l);
    if (!m) return false;
    return parseFloat(m[1]) === 0 ? 'top radius 0 — this is a cone: ' + l.trim().slice(0, 90) : false;
  });
  P('CRY-002 no CylinderGeometry tapering to a radius of zero — that is a cone by another name',
    hits.length === 0, hits.join('\n'));
}

/* ------------------------------------------------------------------ CRY-003 */
/* THE BLUNT-TIP LAW. A taper must END ON A FACET. v8 established the reason and it is optical, not
   stylistic: "a needle aliases into a hairline and catches nothing, so it reads as a scratch rather
   than as crystal" — a blunt tip holds a highlight and a needle cannot. The threshold is a ratio,
   because a 6 cm tip is blunt on a bollard and a needle on a 400 m tower.

   Only literal-to-literal tapers are judged; a computed radius is left to the eye.

   A STEEP TAPER IS NOT A NEEDLE IF IT IS SHORT. A segment that loses almost all of its radius over
   a fraction of that radius is a CHAMFER or a CAP — it is the blunt tip, not a spike — and this law
   must not fail the very thing it is asking for. city.js's archetype C ends on a 0.12-tall cap
   going 0.46 -> 0.04, which is exactly correct crown-blunting and would otherwise read as an
   8.7% violation. So the ratio is only judged on an ELONGATED taper: height at least twice the
   base radius. A non-literal height is still judged, because an unknown height on a near-zero tip
   is the case worth catching (sky-structures.js's 2.2 -> 0.1 spire is 26 * S tall). */
{
  const MIN_RATIO = 0.10;
  const hits = scan(l => {
    const re = /\bnew\s+THREE\.CylinderGeometry\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*([^,)]+),/g;
    let m, out = null;
    while ((m = re.exec(l))) {
      const top = parseFloat(m[1]), bot = parseFloat(m[2]);
      if (!(bot > 0) || !(top >= 0)) continue;
      if (top === 0) continue;                        /* CRY-002 owns that case */
      const hRaw = m[3].trim();
      const h = /^-?[\d.]+$/.test(hRaw) ? parseFloat(hRaw) : null;
      if (h !== null && h < 2 * bot) continue;        /* a cap or a chamfer, which is the goal */
      const ratio = top / bot;
      if (ratio < MIN_RATIO) {
        out = 'tip is ' + (ratio * 100).toFixed(1) + '% of the base over a height of ' + hRaw
          + ' (min ' + (MIN_RATIO * 100) + '% on an elongated taper): ' + l.trim().slice(0, 80);
      }
    }
    return out;
  });
  P('CRY-003 every elongated literal taper ends on a facet at least 10% of its base — no needles',
    hits.length === 0, hits.join('\n'));
}

/* ------------------------------------------------------------------ CRY-004 */
/* THE BRAND EXEMPTION, enforced BY ROLE rather than by file — the same shape of test LAW-001 uses
   for interior light, and for the same reason: a whitelist of files rots the moment a module moves,
   while a line that names what it is stays true. An octahedron is legal where the code says it is
   the square diamond; an unexplained one is a spike someone reached for. */
{
  const ROLE = /(diamond|mark|beacon|marker|pod|head|leaf|brand|octa|crystalCore|gem|reserved)/i;
  const hits = scan(l => {
    if (!/\bnew\s+THREE\.(Octahedron|Tetrahedron)Geometry\b/.test(l)) return false;
    return ROLE.test(l) ? false : 'octahedron/tetrahedron with no stated role — if it is the square diamond, name it: ' + l.trim().slice(0, 90);
  });
  P('CRY-004 an octahedron is legal only where the line names it as the square-diamond brand figure',
    hits.length === 0, hits.join('\n'));
}

/* ------------------------------------------------------------------ CRY-005 */
/* THE ANTI-BUBBLE LAW — the over-correction, which the direction forbids as explicitly as the
   jaggedness: "not bubbly, not jagged", "big designed facets". The way this world would go bubbly is
   by subdividing its way out of the problem, so a high-detail sphere or a heavily subdivided
   platonic in a SCENE module is the signature to catch. (materials.js may build smooth primitives
   for environment probes and glows; the sky domes are legitimately high-segment because they are
   painted, not lit.) */
{
  const DOME = /(dome|env|sky|glow|halo|probe|sprite|moon|sun)/i;
  const hits = scan((l, f) => {
    const m = /\bnew\s+THREE\.(?:Icosahedron|Octahedron|Dodecahedron|Tetrahedron)Geometry\(\s*[^,]+,\s*(\d+)\s*\)/.exec(l);
    if (m && parseInt(m[1], 10) >= 3) return 'detail ' + m[1] + ' subdivides a platonic into a ball: ' + l.trim().slice(0, 90);
    const s = /\bnew\s+THREE\.SphereGeometry\(\s*[^,]+,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(l);
    if (s && !DOME.test(l) && parseInt(s[1], 10) >= 32 && parseInt(s[2], 10) >= 24) {
      return 'a ' + s[1] + '×' + s[2] + ' sphere is a bubble, not a faceted mass: ' + l.trim().slice(0, 90);
    }
    return false;
  });
  P('CRY-005 nothing subdivides its way to a smooth ball — facets are the point (anti-bubble)',
    hits.length === 0, hits.join('\n'));
}

/* ------------------------------------------------------------------ CRY-006 */
/* The mountain languages must not diverge again. Whatever builds a peak builds it the same way in
   every module: sky.js and terrain.js both draw the SAME horizon, and for one release they drew it
   with two different primitives, so the same range was rounded or pointed depending on which module
   happened to own that peak. If a module names a peak, it must not be reaching for a cone. */
{
  const PEAK = /(peak|mountain|massif|ridge|summit)/i;
  const offenders = [];
  for (const f of FILES) {
    const lines = src[f].split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!PEAK.test(lines[i])) continue;
      const win = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
      if (/\bnew\s+THREE\.ConeGeometry\b/.test(win)) offenders.push(f + ':' + (i + 1) + '  a peak built from a cone');
    }
  }
  P('CRY-006 every module that builds a peak uses the rounded-massif language, not a cone',
    offenders.length === 0, [...new Set(offenders)].join('\n'));
}

console.log('\nmahworld-crystalline-laws: ' + pass + '/' + (pass + fail) + (fail ? ' — ' + fail + ' FAILED' : ' PASS'));
process.exit(fail ? 1 : 0);
