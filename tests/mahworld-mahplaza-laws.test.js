'use strict';
/* MAHPLAZA scene laws — static checks on the scene sources (no browser).
   Run: node tests/mahworld-mahplaza-laws.test.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SCENE = path.join(ROOT, 'mahworld/scene');
let passed = 0, failed = 0;
function P(name, ok, why) { if (ok) { passed++; return; } failed++; console.log('FAIL  ' + name + (why ? ' — ' + why : '')); }
const read = f => fs.readFileSync(path.join(SCENE, f), 'utf8');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const FILES = ['materials.js', 'ground.js', 'buildings.js', 'residents.js', 'flora-and-vehicles.js', 'sky.js', 'mahplaza.js', 'world-clock.js']
  .concat(['city.js', 'plaza-dressing.js', 'match-interior.js', 'life.js', 'effects.js'].filter(f => fs.existsSync(path.join(SCENE, f))));   /* v4 modules when present */
const src = Object.fromEntries(FILES.map(f => [f, read(f)]));
const html = read('mahplaza.html');
const all = FILES.map(f => stripComments(src[f])).join('\n');

/* ---- light law: no yellow / amber / orange energy anywhere in the scene sources ---- */
function hsl(hex) { const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255; const max = Math.max(r, g, b), min = Math.min(r, g, b); const l = (max + min) / 2; if (max === min) return { h: 0, s: 0, l }; const d = max - min; const s = l > 0.5 ? d / (2 - max - min) : d / (max + min); let h; if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; return { h: h * 60, s, l }; }
/* LAW-001 WAS AMENDED IN v8, ON DIRECTION, AND THE AMENDMENT IS NARROW.
   The original law forbade every warm literal anywhere in the scene, and it earned its keep: it is
   what kept MAHWORLD from drifting into the amber-and-teal of every other sci-fi city, and it is why
   the canonical champagne gold #E9C98F is still kept out of the world's surfaces.

   The direction is now explicit: "most of the windows of the buildings should have yellow or an
   off-white lighting faintly coming out of it." That is a real reversal and it is the right one —
   cool interiors made every lit window agree with the signage, which flattened the city into one
   blue. What is NOT reversed is the thing the law was actually protecting: warm may be LIGHT COMING
   FROM INSIDE A BUILDING, and nothing else. It may not be a surface, a material's base colour, a
   sign, a seam, a beam, an emissive trim, or a resident.

   So the exemption is by ROLE, not by file: a warm literal passes only if the identifier it is
   assigned to names an interior light. Everything else still fails, including a warm value smuggled
   into a material called `panel` or `trim`. */
const WARM_ROLE = /(^|[^A-Za-z])(interior|interiorPale|interiorSoft|windowWarm|roomLight|lamplight)([^A-Za-z]|$)/;
const yellows = [];
for (const f of FILES) {
  const lines = stripComments(src[f]).split('\n');
  lines.forEach((line, i) => {
    for (const hx of line.match(/0x[0-9a-fA-F]{6}\b/g) || []) {
      const { h, s, l } = hsl(parseInt(hx, 16));
      if (h >= 28 && h <= 75 && s > 0.35 && l > 0.2 && !WARM_ROLE.test(line)) yellows.push(f + ':' + (i + 1) + ':' + hx);
    }
  });
}
P('LAW-001 warm colour only as interior light; never a surface, sign, seam, beam or resident', yellows.length === 0, yellows.join(' '));
const cssYellow = (html.match(/#[0-9a-fA-F]{6}\b/g) || []).filter(hx => { const { h, s, l } = hsl(parseInt(hx.slice(1), 16)); return h >= 28 && h <= 75 && s > 0.35 && l > 0.2; });
P('LAW-002 the page chrome has no yellow either', cssYellow.length === 0, cssYellow.join(' '));

/* ---- copy law (brief §09 / §11 / §16) ---- */
const B = src['buildings.js'];
P('LAW-010 MAH MATCH carries the copy "MATCHES · PRACTICE"', /'MATCHES · PRACTICE'/.test(B));
P('LAW-011 the two entrance actions exist and the third panel is gone', /'FIND AN OPPONENT'/.test(B) && /'PRACTICE WITH A BUDDY'/.test(B) && !/SOLO PRACTICE|BUDDY PRACTICE'/.test(B));
P('LAW-012 MAH MARKET makes no product or nutrition claim', !/NUTRITION|GEAR · STYLE/.test(stripComments(B)) && !/\$\s?\d|\d+\s?(coins|credits|MAHGIC)/i.test(stripComments(B)));
P('LAW-013 no fabricated pictogram: the dumbbell / fist / cart glyph drawers are gone and signs use the reserved mark slot', !/GLYPHS/.test(all) && !/dumbbell\(|fist\(|cart\(/.test(all) && /mark: true/.test(B));
P('LAW-014 the ground marker says MAHPLAZA (the place), not MAHWORLD', /'MAHPLAZA'/.test(src['ground.js']) && !/'MAHWORLD'/.test(stripComments(src['ground.js'])));
P('LAW-015 the practice preview copy is honest: no "opponent found", no live counts, no real names', !/opponent found|players online|\d+ players/i.test(all + html) && /No live players are connected/.test(B));

/* ---- ownership / privacy / audio law ---- */
P('LAW-020 the scene never imports Mr. Mah\'s character work (mrmah3d) and only the vendored renderer', !/mrmah3d/.test(all) && FILES.every(f => !/from\s+['"](?!\.\.\/vendor\/three\/|\.\/)/.test(stripComments(src[f]))));
P('LAW-021 no AudioContext, autoplay or second player — MAH PLAYER stays the music owner', !/AudioContext|new Audio\(|<audio|autoplay/i.test(all + html));
P('LAW-022 no network, geolocation, contacts or account calls from the world scene', !/fetch\(|XMLHttpRequest|WebSocket|navigator\.geolocation|navigator\.contacts|supabase|netlify\/functions/i.test(all + stripComments(html)));
P('LAW-023 the only persistence is the preview appearance under fob.mahworld.preview.*, guarded', /fob\.mahworld\.preview\./.test(src['mahplaza.js']) && !/fob\.mahfitt\.|fob\.mahworld\.profile/.test(all) && /try \{ (return )?localStorage/.test(src['mahplaza.js']));
P('LAW-024 the page links back to the MAHFITT control deck and hides the frame meter unless ?debug=1', /mahfitt\.html/.test(html) && /data-meter hidden/.test(html) && /debug'\) === '1'/.test(html));

/* ---- appearance independence law (brief §12) ---- */
const MP = stripComments(src['mahplaza.js']), RS = stripComments(src['residents.js']);
P('LAW-030 three separate owners exist: setWorldTheme, setSelfAppearance, setRemoteAppearance', /function setWorldTheme/.test(MP) && /function setSelfAppearance/.test(MP) && /function setRemoteAppearance/.test(MP));
P('LAW-031 no global tint: no CSS filter / hue-rotate / mix-blend on the canvas, no scene-wide colour overwrite', !/(^|[^-])filter\s*:|hue-rotate|mix-blend-mode/.test(html) && !/scene\.overrideMaterial/.test(MP));
P('LAW-032 the world Theme reaches ENERGY materials only (retheme touches energy, energyLight, energySoft and nothing else)', /m\.retheme = function[\s\S]*?m\.energy\.emissive[\s\S]*?m\.energyLight\.emissive[\s\S]*?m\.energySoft\.color[\s\S]*?return t;/.test(src['materials.js']) && !/m\.retheme = function[\s\S]*?(graphite|glass|interior|matchRed)[\s\S]*?return t;/.test(src['materials.js']));
P('LAW-033 a resident recolour rebuilds ONE group in place and never edits another colour\'s shared materials', /export function recolour\(group, colour\)/.test(RS) && /createResident\(spec\)/.test(RS) && !/MATERIALS\.clear|MATERIALS\.forEach/.test(RS));
P('LAW-034 residents carry stable ids and the silver colour exists for the check', /r\.userData\.id = id/.test(RS) && /silver:\s*\{/.test(RS));

/* ---- species law ---- */
P('LAW-040 one continuous lower teardrop, no legs, feet or knees anywhere in the residents module', /teardrop/.test(RS) && !/\b(leg|legs|foot|feet|knee|knees|shin|thigh)\b/i.test(RS.replace(/NO legs, feet or knees|no legs/gi, '')));
P('LAW-041 the head is a square-diamond slab with a dark facial chamber, eyes and a smile', /faceChamber/.test(RS) && /eyeL/.test(RS) && /smile/.test(RS) && !/SphereGeometry/.test(RS));
P('LAW-042 physique variation includes beginners in the outdoor population', /physique: 0\.2\b/.test(MP) && /physique: 0\.25\b/.test(MP));
const outdoor = (MP.match(/role: 'remote', x:/g) || []).length + (MP.match(/role: 'self'/g) || []).length;
P('LAW-043 8–12 residents outdoors (self + fixtures)', outdoor >= 8 && outdoor <= 12, String(outdoor));

/* ---- plants and vehicles ---- */
P('LAW-050 the leaf is a square rotated in-plane with thin depth (octahedron scaled square in XY, thin Z)', /g\.scale\(0\.5, 0\.5, 0\.09\)/.test(src['flora-and-vehicles.js']));
P('LAW-051 planters are sparse (hard caps 4 / 5 / 7 leaves)', /leaves: 4 \}/.test(src['flora-and-vehicles.js']) && /leaves: 5 \}/.test(src['flora-and-vehicles.js']) && /leaves: 7 \}/.test(src['flora-and-vehicles.js']));
P('LAW-052 the sky craft are not labelled FOBlock in the scene (adaptation, see REFERENCE_MANIFEST.md)', !/FOBlock/.test(stripComments(src['flora-and-vehicles.js']) + MP) && fs.existsSync(path.join(SCENE, 'REFERENCE_MANIFEST.md')));

/* ---- clock stays the one owner of time ---- */
P('LAW-060 nobody but world-clock.js derives world time; the assembly asks the clock', /createWorldClock\(\)/.test(MP) && !/worldHourFor|daylightShare/.test(MP));

/* ---- diagnostic + teardown exist ---- */
P('LAW-070 a diagnostic view exists (additive off, emissive capped, exposure fixed) and dispose removes listeners', /function setDiagnostic/.test(MP) && /AdditiveBlending/.test(MP) && /toneMappingExposure = state\.diagnostic \? 1\.0/.test(MP) && /removeEventListener/.test(MP));

/* ---- R167 §D the doorway ladder ------------------------------------------------------------
   Three files author doorways — city.js the local ones, mahfacilities.js the facility ones,
   buildings.js the landmark portals — and the hierarchy only means anything if their sizes stay
   strictly separated. Sizes are literals in the sources, so this reads them without a browser.

   LAW-081 is the one that protects the design argument rather than a number. TIER 1 IS ABSOLUTE:
   a local entrance is 3.2 m to the head on a 20 m block and on a 70 m tower, and that constancy is
   the whole signal — it is how the street tells a player which door is human-sized. Give LOCAL a
   proportional term and the doors quietly start growing with their buildings, every tier looks the
   same again, and nothing else in the suite would notice. */
const MAT = src['materials.js'];
const tierRow = k => { const m = MAT.match(new RegExp(k + ':\\s*Object\\.freeze\\(\\{([^}]*)\\}\\)')); if (!m) return null;
  const o = {}; for (const [, key, val] of m[1].matchAll(/(\w+):\s*(-?[\d.]+)/g)) o[key] = parseFloat(val); return o; };
const T1 = tierRow('LOCAL'), T2 = tierRow('FACILITY'), T3 = tierRow('LANDMARK');
P('LAW-080 the doorway kit publishes three tiers', !!(T1 && T2 && T3));
P('LAW-081 tier 1 is ABSOLUTE — a local entrance does not scale with the mass it is cut into',
  !!T1 && T1.wf === 0 && T1.hf === 0, T1 ? 'wf ' + T1.wf + ' hf ' + T1.hf : 'no LOCAL row');
P('LAW-082 tier 3 is PROPORTIONAL — a landmark threshold grows with its building',
  !!T3 && T3.wf > 0 && T3.hf > 0);
P('LAW-083 the tiers are a ladder: each core opening clears the one below it',
  !!(T1 && T2 && T3) && T2.h > T1.h && T3.h > T2.h && T2.w > T1.w && T3.w > T2.w,
  T1 && T3 ? [T1.h, T2.h, T3.h].join(' < ') : '');
/* the landmark portals are hand-sized to locked masses, so they are checked against the ladder
   rather than generated by it: every one of them must still out-scale a facility entrance */
const sites = [...src['buildings.js'].matchAll(/openW:\s*(\d+(?:\.\d+)?),\s*openH:\s*(\d+(?:\.\d+)?)/g)]
  .map(m => ({ w: +m[1], h: +m[2] }));
P('LAW-084 every landmark portal out-scales the largest facility entrance', sites.length >= 3 &&
  sites.every(s => s.h > T2.h + T2.hf * 40 && s.w > T2.w + T2.wf * 40),
  sites.map(s => s.w + 'x' + s.h).join(' '));
P('LAW-085 the light ladder runs step -> head -> full, one rung per tier',
  /LOCAL:[^\n]*glow:\s*'sill'/.test(MAT) && /FACILITY:[^\n]*glow:\s*'head'/.test(MAT) && /LANDMARK:[^\n]*glow:\s*'full'/.test(MAT));
P('LAW-086 every doorway reports into one channel, so the ladder can be measured from one place',
  /ctx\.doorTiers/.test(src['city.js']) && /ctx\.doorTiers/.test(src['buildings.js']) && /doorTiers:/.test(MP));

console.log('mahworld-mahplaza-laws: ' + passed + '/' + (passed + failed) + ' PASS');
if (failed) process.exit(1);
