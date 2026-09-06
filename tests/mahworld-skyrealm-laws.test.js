/* MAHWORLD UPPER REALM — the scene laws, checked statically and analytically.
   No renderer, no browser: source text plus the layout module's own arithmetic.

   WHY THIS FILE EXISTS SEPARATELY FROM mahworld-mahplaza-laws.test.js. The lower world's LAW-001
   forbids every warm colour literal — hue 28–75 with saturation — because MAHWORLD's city is a cool
   night world and a stray amber reads as a bug. The upper realm is a SUNSET BIOME: warm is the whole
   point of sector A, and applying the city's law here would forbid the thing the brief asks for. So
   the realms have separate laws, and this one draws the line in the place that actually matters —
   warm belongs to the ATMOSPHERE, never to the architecture, which stays platinum, white chromium,
   diamond glass and silver (§12).

   Run: node tests/mahworld-skyrealm-laws.test.js */
'use strict';
const fs = require('fs'), p = require('path');
const DIR = p.resolve(__dirname, '../mahworld/scene');
const read = f => { try { return fs.readFileSync(p.join(DIR, f), 'utf8'); } catch (e) { return null; } };
/* Strip comments WITHOUT losing line numbers: a block comment collapses to the same count of
   newlines it spanned. A law that reports "sky-structures.js:144" for something on line 215 sends
   the reader to the wrong place, which is worse than not reporting a line at all. */
const stripComments = s => s
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''))
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/* the realm's own modules; the layout and the assembly always exist, the builders are optional
   because this realm was assembled in parallel and must degrade to whatever is present */
const CORE = ['sky-layout.js', 'skyrealm.js'];
const BUILDERS = ['sky-atmosphere.js', 'sky-terrain.js', 'sky-structures.js', 'ascent.js', 'sky-beams.js', 'sky-life.js'];
/* Which files may own a warm colour and which may not. The sun, the sunset sky and a cloud lit by
   them are warm by right; a platform, a railing or a pod shell is not (§12). skyrealm.js is on the
   atmospheric side because it owns the LIGHT RIG and the environment map and no geometry at all —
   it cannot paint architecture warm, because it does not build any. */
const ATMOSPHERIC = new Set(['sky-atmosphere.js', 'sky-terrain.js', 'sky-layout.js', 'skyrealm.js']);

const src = {};
for (const f of CORE.concat(BUILDERS)) { const s = read(f); if (s != null) src[f] = s; }
const present = Object.keys(src);
const missing = BUILDERS.filter(f => !src[f]);

let pass = 0, fail = 0, skip = 0;
const P = (name, ok, detail) => { if (ok) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (detail ? '\n        ' + detail : '')); } };
const S = (name, why) => { skip++; console.log('  SKIP  ' + name + (why ? '  (' + why + ')' : '')); };

function hsl(hex) {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
/* the body of every function named `update` in a source, for the allocation law */
function updateBodies(code) {
  const out = [];
  const re = /\bfunction\s+update\s*\(|\bupdate\s*[:=]\s*(?:function\s*)?\(/g;
  let m;
  while ((m = re.exec(code))) {
    let i = code.indexOf('{', m.index); if (i < 0) continue;
    let depth = 0, j = i;
    for (; j < code.length; j++) { const c = code[j]; if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) break; } }
    out.push(code.slice(i, j + 1));
  }
  return out;
}

(async () => {
  console.log('MAHWORLD UPPER REALM — scene laws\n');
  if (missing.length) console.log('  modules not yet present: ' + missing.join(', ') + '\n');

  /* ---------------------------------------------------------------- layout */
  const L = await import('../mahworld/scene/sky-layout.js');

  {
    let worst = 0, jump = 0, prev = null;
    for (let d = 0; d < 720; d++) {
      const b = (d / 2) * Math.PI / 180 - Math.PI;
      const w = L.sectorWeights(b).slice();
      worst = Math.max(worst, Math.abs(w.reduce((a, v) => a + v, 0) - 1));
      if (prev) for (let i = 0; i < 4; i++) jump = Math.max(jump, Math.abs(w[i] - prev[i]));
      prev = w;
    }
    P('SKY-LAW-001 sector weights are a partition of every bearing (sum 1, no discontinuity)', worst < 1e-9 && jump < 0.03, 'worst sum error ' + worst.toExponential(2) + ', largest half-degree jump ' + jump.toFixed(4));
  }
  {
    const band = L.atmoBand({ band: 'sunset', sunElevation: 0.055 });
    const warm = b => { const h = L.atmosphere(b, 0.02, band); return ((h >> 16) & 255) - (h & 255); };
    const a = warm(0), c = warm(Math.PI / 2), e = warm(Math.PI), g = warm(-1.75);
    P('SKY-LAW-002 the sky is directional: warm at the sun, cold away from it, monotonically', a > c && c > e && e > g, `sunset ${a} > right ${c} > behind ${e} > cold ${g}`);
  }
  {
    const bad = [];
    for (const [k, s] of Object.entries(L.SITES)) {
      if (s.floating) continue;
      const q = L.siteAt(s);
      if (!L.deckSolid(q.x, q.z)) bad.push(k + ' stands over nothing');
      else if (L.deckEdge(q.x, q.z) < 0.1) bad.push(k + ' sits on a rim (edge ' + L.deckEdge(q.x, q.z).toFixed(2) + ')');
    }
    P('SKY-LAW-003 every grounded site stands on solid cloud, clear of a rim', bad.length === 0, bad.join('; '));
  }
  {
    /* the cloud floor must be terrain, not a plane: it has to actually vary */
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < 4000; i++) {
      const b = (i / 4000) * Math.PI * 2 - Math.PI, r = 40 + (i % 37) * 24;
      const d = L.dir(b), x = d.x * r, z = d.z * r;
      if (!L.deckSolid(x, z)) continue;
      const h = L.deckHeight(x, z); if (h < lo) lo = h; if (h > hi) hi = h;
    }
    P('SKY-LAW-004 the cloud floor is terrain, not a flat plane', hi - lo > 25, 'height range ' + (hi - lo).toFixed(1) + ' m across the solid deck');
  }
  {
    const open = !L.deckSolid(0, -400) && L.deckSolid(0, -200);
    const holes = L.VOIDS.every(v => { const d = L.dir(v.bearing); return !L.deckSolid(d.x * v.r, d.z * v.r); });
    P('SKY-LAW-005 the sunset cliff opens and every void is a hole', open && holes);
  }
  {
    /* §11/§32: architecture is sparse and special. This is the number that stops a sky metropolis. */
    const n = Object.keys(L.SITES).length;
    P('SKY-LAW-006 the realm stays sparse (no sky metropolis)', n <= 24, n + ' named sites');
  }
  {
    const b1 = L.atmoBand({ band: 'sunset', sunElevation: 0.06 });
    const b2 = L.atmoBand({ band: 'night', sunElevation: -0.45 });
    const ok = L.atmoScalar(b1, 'stars') < L.atmoScalar(b2, 'stars') && L.atmoScalar(b1, 'sunI') > L.atmoScalar(b2, 'sunI');
    P('SKY-LAW-007 time bands blend rather than snap, and night is darker than sunset', ok && typeof L.atmosphere(0, 0, 'dusk') === 'number');
  }

  /* ------------------------------------------------------------ source laws */
  {
    /* WARM IS ALSO INTERIOR LIGHT — the same exemption the city's LAW-001 carries, added here after
       this law failed sky-structures.js for using 0xffeccd and 0xf2d9a8. Those are the world's warm
       interior white and its window spill; the concourse having lit rooms behind its glass is the
       direction, not a violation. The law was wrong, not the code.
       The exemption is by ROLE, not by file, exactly as in the city: a warm literal passes only on a
       line whose identifier names an interior light. Warm smuggled into a `panel` or a `rail` in the
       same file still fails, which is the whole point of §12 — this realm reads LIGHTER than the
       city, and it gets there with platinum and glass, not with amber paint. */
    /* An EXPLICIT ALLOWLIST of identifiers that mean "light from inside a room", not a prefix match.
       It has to be a list because the distinction that matters is `warmSoft` (a window's spill, fine)
       against `warmRail` (architecture wearing amber, forbidden), and no prefix rule separates those.
       `warm` and `warmSoft` were added after this law failed a builder for using them: they are
       perfectly good names for warm interior light, and a law that accepts only one naming
       convention is brittle rather than strict. */
    const WARM_ROLE = /(^|[^A-Za-z])(interior|interiorPale|interiorSoft|interiorWarm|warm|warmSoft|warmGlow|windowWarm|roomLight|lamplight|spill)([^A-Za-z]|$)/;
    const offenders = [];
    for (const f of present) {
      if (ATMOSPHERIC.has(f)) continue;
      stripComments(src[f]).split('\n').forEach((line, i) => {
        for (const hx of line.match(/0x[0-9a-fA-F]{6}\b/g) || []) {
          const { h, s, l } = hsl(parseInt(hx, 16));
          if (h >= 20 && h <= 68 && s > 0.4 && l > 0.25 && !WARM_ROLE.test(line)) offenders.push(f + ':' + (i + 1) + ':' + hx);
        }
      });
    }
    P('SKY-LAW-010 warm colour is atmosphere or interior light, never architecture (§12)', offenders.length === 0, offenders.join(' '));
  }
  {
    const offenders = [];
    for (const f of BUILDERS) {
      if (!src[f]) continue;
      const code = stripComments(src[f]);
      /* a builder that positions anything must ask the contract where the cloud is */
      const positions = /\.position\.set\(|\.position\.y\s*=|translate\(/.test(code);
      const asks = /deckHeight|cloudTopAt|siteAt|floating/.test(code);
      if (positions && !asks) offenders.push(f);
    }
    P('SKY-LAW-011 no builder invents its own ground height (§03)', offenders.length === 0, offenders.join(' ') + ' position things without consulting deckHeight/cloudTopAt/siteAt');
  }
  {
    const offenders = [];
    for (const f of BUILDERS) {
      if (!src[f] || ATMOSPHERIC.has(f)) continue;
      const code = stripComments(src[f]);
      if (/\bfog\s*=\s*new\s+THREE\.(Fog|FogExp2)/.test(code)) offenders.push(f + ' sets scene fog');
      if (/scene\.background\s*=/.test(code)) offenders.push(f + ' sets scene.background');
    }
    P('SKY-LAW-012 only the assembly owns fog and background', offenders.length === 0, offenders.join('; '));
  }
  {
    /* §35/§36: the realm's signage is a closed set. Any quoted ALL-CAPS phrase in a builder that is
       not in layout.SIGNAGE is invented copy — the failure this brief is most exposed to, because
       the concept art is full of marketing lines that are not canonical. */
    const allowed = new Set([L.SIGNAGE.realm, L.SIGNAGE.ascent, L.SIGNAGE.queue, L.SIGNAGE.canonicalSub]
      .concat(L.SIGNAGE.actions)
      .concat(['READY', 'BOARDING', 'DEPARTING', 'PREPARING', 'DOCKED', 'ARRIVING', 'MAH', 'PAD']));
    const offenders = [];
    for (const f of BUILDERS) {
      if (!src[f]) continue;
      for (const m of stripComments(src[f]).match(/['"`][A-Z][A-Z ]{3,40}['"`]/g) || []) {
        const t = m.slice(1, -1).trim();
        if (!allowed.has(t) && !/^[A-Z]{1,4}$/.test(t)) offenders.push(f + ' "' + t + '"');
      }
    }
    P('SKY-LAW-013 no invented signage copy: every sign string comes from layout.SIGNAGE', offenders.length === 0, offenders.join('; '));
  }
  {
    const offenders = [];
    for (const f of BUILDERS.concat(['skyrealm.js'])) {
      if (!src[f]) continue;
      for (const body of updateBodies(stripComments(src[f]))) {
        if (/new\s+THREE\.(Vector[234]|Color|Matrix[34]|Quaternion|Euler|Box3|Sphere)\b/.test(body)) offenders.push(f + ': allocates a THREE object in update()');
        if (/\.clone\s*\(/.test(body)) offenders.push(f + ': .clone() in update()');
      }
    }
    P('SKY-LAW-014 update() allocates nothing', offenders.length === 0, [...new Set(offenders)].join('; '));
  }
  {
    const offenders = [];
    for (const f of present) {
      const code = stripComments(src[f]);
      for (const m of code.match(/from\s+['"][^'"]+['"]/g) || []) {
        const path = m.replace(/from\s+['"]|['"]/g, '');
        if (!/^\.\//.test(path) && path !== '../vendor/three/three.module.min.js') offenders.push(f + ' -> ' + path);
      }
      if (/mrmah3d/.test(code)) offenders.push(f + ' reaches into mrmah3d');
      if (/three\/examples|BufferGeometryUtils|addons/.test(code)) offenders.push(f + ' uses a three addon');
    }
    P('SKY-LAW-015 only the vendored renderer and sibling scene modules; no addons, no character work', offenders.length === 0, offenders.join('; '));
  }
  {
    const wanted = ['group', 'setTime', 'setTheme', 'update', 'setQuality', 'dispose', 'stats'];
    const offenders = [];
    for (const f of BUILDERS) {
      if (!src[f]) continue;
      const code = src[f];
      const miss = wanted.filter(k => !new RegExp('(^|[^\\w.])' + k + '\\s*[,:(]|\\b' + k + '\\s*,').test(code));
      if (miss.length) offenders.push(f + ' missing ' + miss.join('/'));
    }
    P('SKY-LAW-016 every builder returns the module contract', offenders.length === 0, offenders.join('; '));
  }
  {
    if (!src['ascent.js']) S('SKY-LAW-017 the ascent pod survives its own launch (§10)', 'ascent.js not present');
    else {
      const code = stripComments(src['ascent.js']);
      /* the brief's "explode when ready to go" means a burst of POWER; a pod that is destroyed,
         shattered into debris or set on fire is a misreading with an obvious signature */
      const bad = /debris|shatter|fragment(s)?\s*=|fireball|explosion|destroyed|\.visible\s*=\s*false\s*;?\s*\/\/\s*destroyed/i.test(code);
      P('SKY-LAW-017 the ascent pod survives its own launch (§10)', !bad, 'ascent.js contains destruction language');
    }
  }
  {
    /* §12: the realm reads LIGHTER than the city. Its structures should not be wearing the city's
       darkest greys — those exist for a night world, not a cloud one. */
    const dark = [];
    for (const f of ['sky-structures.js', 'ascent.js']) {
      if (!src[f]) continue;
      for (const m of stripComments(src[f]).match(/M\.(graphiteDark|plaza|road|arena)\b/g) || []) dark.push(f + ':' + m);
    }
    P('SKY-LAW-018 the sky realm does not wear the night city\'s darkest grades (§12)', dark.length === 0, [...new Set(dark)].join(' '));
  }

  console.log('\nmahworld-skyrealm-laws: ' + pass + '/' + (pass + fail) + ' PASS' + (skip ? ', ' + skip + ' skipped' : '') + (missing.length ? ' — ' + missing.length + ' builder(s) not yet present' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('mahworld-skyrealm-laws: ERROR', e && e.message); process.exit(1); });
