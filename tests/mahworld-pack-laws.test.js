/* MAHWORLD — THE ULTRA MASTER REFERENCE PACK GATES (§11), checked statically.

   The pack ends with a list headed "Do not pass until:". It is the closest thing this project has
   to an acceptance specification, and until now it lived only in a PDF and in whoever last read
   it. This file turns the mechanically checkable half of that list into a build gate.

   WHAT THIS FILE CANNOT DO, stated up front so nothing here is over-read: it cannot see a render.
   It cannot tell whether the black mirror ground is "pristine and controlled", whether buildings
   are "distinct, smooth and spaced", or whether the iPhone view communicates depth. Those are the
   director's eye and they stay that way. What it CAN do is catch the categorical failures — an
   ordinary car, a hand-sculpted humanoid, transport that does not descend from the FOBLOCK genome,
   a dead genome nobody consumes — which are exactly the ones that creep back in during a large
   parallel pass and are embarrassing to discover in a review render.

   Every law below is written to fail LOUDLY and to name the file and line, and every one of them
   is written to be true of the CURRENT tree, so a failure means something changed.

   Run: node tests/mahworld-pack-laws.test.js */
'use strict';
const fs = require('fs'), p = require('path');
const DIR = p.resolve(__dirname, '../mahworld/scene');

/* Comments stripped WITHOUT losing line numbers — a block comment collapses to the same count of
   newlines it spanned. This project has already shipped one law that reported :144 for something
   on :215, which sends the reader to the wrong place and is worse than no line at all. */
const stripComments = s => s
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''))
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const FILES = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort();
const raw = {}, src = {};
for (const f of FILES) { raw[f] = fs.readFileSync(p.join(DIR, f), 'utf8'); src[f] = stripComments(raw[f]); }

let pass = 0, fail = 0;
const P = (name, ok, detail) => {
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '\n        ' + String(detail).split('\n').join('\n        ') : '')); }
};
const scan = fn => {
  const hits = [];
  for (const f of FILES) {
    const lines = src[f].split('\n');
    for (let i = 0; i < lines.length; i++) {
      const r = fn(lines[i], f, i + 1);
      if (r) hits.push(f + ':' + (i + 1) + '  ' + (r === true ? lines[i].trim().slice(0, 100) : r));
    }
  }
  return hits;
};

/* ------------------------------------------------------------------ PACK-001 */
/* §5 / §11: "zero ordinary humans"; "Every humanoid resident is a canonical MAHBEING derived from
   Mr. Mah / Mrs. Mah". residents.js is the species authority IN CODE — it is the only module
   allowed to construct a humanoid, and everything else must come through it.

   Enforced by ROLE rather than by a filename allowlist: a module that names real human anatomy is
   building a body, and if it is not residents.js it had better be importing it. This is the same
   shape of test LAW-001 uses for interior light, and it survives files being renamed or split. */
{
  const ANATOMY = /(^|[^A-Za-z])(deltoid|pectoral|bicep|tricep|forearm|torso|ribcage|clavicle|scapula|humanoid|abdominal)([^A-Za-z]|$)/i;
  const offenders = [];
  for (const f of FILES) {
    if (f === 'residents.js') continue;                       /* the authority itself */
    const lines = src[f].split('\n');
    const hit = lines.findIndex(l => ANATOMY.test(l));
    if (hit < 0) continue;
    const importsAuthority = /from\s+['"]\.\/residents\.js['"]/.test(src[f])
      || /import\(\s*['"]\.\/residents\.js['"]\s*\)/.test(src[f])
      || /\bR\.createResident\b|\bcreateResident\b/.test(src[f]);
    if (!importsAuthority) offenders.push(f + ':' + (hit + 1) + '  names human anatomy but never reaches residents.js');
  }
  P('PACK-001 §5 only residents.js builds a humanoid; everyone else comes through it',
    offenders.length === 0, offenders.join('\n'));
}

/* ------------------------------------------------------------------ PACK-002 */
/* §6 / §11: "zero ordinary cars". The pack enumerates what is banned rather than leaving it to
   taste: "No sedans, SUVs, sports cars, motorcycles, taxis, buses, Cybertruck clones, wheel
   arches, grilles or exhausts." A world that grows one of these grows it by someone typing the
   word first, so the word is what this catches. */
{
  const CAR = /(^|[^A-Za-z])(wheel|wheels|tyre|tire|grille|exhaust|sedan|suv|hatchback|taxi|motorcycle|windscreen|windshield|bumper|axle|chassis)([^A-Za-z]|$)/i;
  /* 'wheel' is also a DOM event, and mahplaza.js listens for it to dolly the camera. A law that
     cannot tell a mouse wheel from a car wheel is not strict, it is broken — this suite has already
     been bitten twice by regexes that flagged correct code. Event registration is exempt. */
  const DOM_EVENT = /addEventListener|\bon\s*\(\s*[A-Za-z_$][\w$]*\s*,\s*['"]wheel['"]|['"]wheel['"]\s*,|preventDefault/;
  const hits = scan(l => (CAR.test(l) && !DOM_EVENT.test(l)) ? true : false);
  P('PACK-002 §6 no ordinary-car vocabulary anywhere in the scene',
    hits.length === 0, hits.join('\n') + (hits.length ? '\n\nTransport grows from FOBLOCK + square diamond + platinum + black crystal + MAHGIC.' : ''));
}

/* ------------------------------------------------------------------ PACK-003 */
/* §11: "transport derives from FOBLOCK geometry". Whichever module owns vehicles must actually
   descend from the genome rather than reinventing a hull. Keyed on the word "vehicle" so the law
   follows the responsibility rather than the filename. */
{
  /* An OWNER is a module that BUILDS vehicle geometry, not one that mentions the word. fobeam.js
     says "vehicle corridor" in a node note and mahplaza.js holds a `vehicles` handle returned by
     another module; neither constructs a hull, and failing them would be noise that trains the
     reader to ignore this law. Keyed on a vehicle geometry//builder declaration. */
  const BUILDS_VEHICLE = /function\s+\w*[Vv]ehicle\w*\s*\(|createVehicle\s*\(|vehicleGeometry\s*\(\s*\)\s*\{/;
  const owners = FILES.filter(f => f !== 'foblock.js' && BUILDS_VEHICLE.test(src[f]));
  const offenders = owners.filter(f => !/from\s+['"]\.\/foblock\.js['"]/.test(src[f]));
  P('PACK-003 §6 every module that owns vehicles imports the FOBLOCK genome',
    offenders.length === 0,
    offenders.length ? offenders.join(', ') + ' own vehicles but do not import foblock.js'
                     : '(owners checked: ' + (owners.join(', ') || 'none') + ')');
}

/* ------------------------------------------------------------------ PACK-004 */
/* §4: the FOBLOCK family must EXIST and must be USED. A genome that nothing consumes is a file,
   not a design system — and this exact state shipped for one commit, deliberately and with the
   commit message saying so. The law is here to make sure it does not become permanent. */
{
  const genome = FILES.indexOf('foblock.js') > -1;
  const consumers = FILES.filter(f => f !== 'foblock.js' && /from\s+['"]\.\/foblock\.js['"]/.test(src[f]));
  P('PACK-004 §4 the FOBLOCK genome exists and at least one module consumes it',
    genome && consumers.length > 0,
    !genome ? 'mahworld/scene/foblock.js is missing' : 'foblock.js exists but nothing imports it — dead genome');
}

/* ------------------------------------------------------------------ PACK-005 */
/* §2 / renderer lock: three r185 is VENDORED and there are NO addons. BufferGeometryUtils and
   Reflector do not exist in this project; every module hand-rolls its merge helper and the plaza's
   mirror is a hand-written planar pass. An import from three/addons or from a bare 'three'
   specifier would not resolve at runtime and would take the whole scene down. */
{
  const hits = scan(l => {
    if (/from\s+['"]three\/addons/.test(l) || /from\s+['"]three\/examples/.test(l)) return 'addon import';
    if (/from\s+['"]three['"]/.test(l)) return 'bare three specifier — must be the vendored path';
    return false;
  });
  P('PACK-005 renderer lock: only the vendored three, no addons, no bare specifiers',
    hits.length === 0, hits.join('\n'));
}

/* ------------------------------------------------------------------ PACK-006 */
/* §8 / §11: "future water remains possible" — "Reserve open corridors for future lakes, river,
   ocean edge, canals, waterfalls and reflective basins." terrain.js reserves a basin and states
   in its own header that nothing in city.js, ground.js or buildings.js occupies it. This law
   holds the reservation open: the BASIN declaration must survive, because deleting it is how a
   reserved corridor quietly stops being reserved. */
{
  const t = src['terrain.js'] || '';
  const hasBasin = /\bBASIN\s*=\s*\{/.test(t);
  const used = /\bBASIN\./.test(t);
  P('PACK-006 §8 the reserved water basin is still declared and still used',
    hasBasin && used,
    !hasBasin ? 'terrain.js no longer declares BASIN — the water corridor reservation is gone'
              : 'BASIN is declared but never referenced; it is no longer reserving anything');
}

/* ------------------------------------------------------------------ PACK-007 */
/* §11: "FOBEAM endpoints are physical." The pack is explicit that a beam must connect real
   architecture at both ends rather than fading into nothing — fobeam.js's own header calls its
   receivers "real pieces of architecture". Checked by the presence of a named node table the
   routes resolve against, which is the mechanism that makes an endpoint physical. */
{
  const fb = src['fobeam.js'] || '';
  const hasNodes = /\bNODES\b/.test(fb) && /\bnodeIndex\b|\bNODES\[/.test(fb);
  P('PACK-007 §11 FOBEAM routes resolve against a named endpoint table',
    hasNodes, 'fobeam.js no longer resolves its routes against NODES — endpoints may be floating');
}

/* ------------------------------------------------------------------ PACK-008 */
/* Determinism. Every builder in this world is seeded so a capture reproduces exactly; a stray
   Math.random in BUILD code makes a render un-diffable against the previous one, which destroys
   the compare step the pack's own loop depends on ("IMPLEMENT -> TARGETED RENDER -> COMPARE").
   Animation and one-off jitter at runtime are a different matter, so this checks build-time
   construction only, by exempting lines that are plainly per-frame or per-event. */
{
  const RUNTIME = /(update|frame|tick|phase|jitter|spawn|onSelect|walk)/i;
  const hits = scan((l, f) => {
    if (!/Math\.random\s*\(|Date\.now\s*\(/.test(l)) return false;
    if (RUNTIME.test(l)) return false;
    /* world-clock.js IS the time authority — reading the wall clock is its entire job, and
       forbidding Date.now() there would be like forbidding a thermometer from measuring heat. It
       already exposes freeze() so a capture can pin the clock, which is what determinism actually
       requires of it. */
    if (f === 'world-clock.js') return false;
    return 'non-deterministic call in build code';
  });
  P('PACK-008 build code is deterministic (no Math.random / Date.now outside runtime paths)',
    hits.length === 0, hits.join('\n'));
}

console.log('\nmahworld-pack-laws: ' + pass + '/' + (pass + fail) + (fail ? ' — ' + fail + ' FAILED' : ' PASS'));
process.exit(fail ? 1 : 0);
