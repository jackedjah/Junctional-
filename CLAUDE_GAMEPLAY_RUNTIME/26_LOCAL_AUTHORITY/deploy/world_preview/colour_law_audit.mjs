/* MAHWORLD :: COLOUR LAW AUDIT (dev only). Owner law 2026-09-25: the ONLY expressive world colours are the five class identities —
   ATHLETE gold, TITAN blue, LEAN red/crimson, VISIONARY purple/violet, BAGE pink. Neutral support (platinum, silver, graphite, steel, black,
   neutral glass, dark stone, white light, low-saturation environmental tones) is allowed. This scans colour literals in the world-art sources
   and the world registry and flags every EXPRESSIVE colour (saturation and lightness above the neutral floor) whose hue falls outside the five
   families (green, teal/cyan, orange, yellow-green…). It reports; it does not edit.  node deploy/world_preview/colour_law_audit.mjs [--json out.json] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
var HERE = path.dirname(fileURLToPath(import.meta.url)); var LA = path.resolve(HERE, '..', '..');
var FAMILIES = [ /* hue windows in degrees (inclusive), chosen so neighbouring laws never overlap */
  { id: 'RED', lo: 345, hi: 360 }, { id: 'RED', lo: 0, hi: 12 }, { id: 'GOLD', lo: 36, hi: 56 }, { id: 'BLUE', lo: 200, hi: 245 },
  { id: 'PURPLE', lo: 246, hi: 292 }, { id: 'PINK', lo: 293, hi: 344 } ];
var NEUTRAL_S = 0.28, DARK_L = 0.08, LIGHT_L = 0.9;   /* below NEUTRAL_S saturation, or near-black / near-white, a colour reads as neutral support */
export function classify(hex) {
  var r = (hex >> 16 & 255) / 255, g = (hex >> 8 & 255) / 255, b = (hex & 255) / 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); var h = 0;
  if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  var out = { h: Math.round(h), s: +s.toFixed(2), l: +l.toFixed(2) };
  if (s < NEUTRAL_S || l < DARK_L || l > LIGHT_L) return Object.assign(out, { verdict: 'NEUTRAL' });
  var fam = FAMILIES.filter(function (f) { return h >= f.lo && h <= f.hi; })[0];
  if (fam) return Object.assign(out, { verdict: 'LAW', family: fam.id });
  var name = h < 36 ? 'ORANGE' : h < 75 ? 'YELLOW_GREEN' : h < 165 ? 'GREEN' : 'TEAL_CYAN';
  return Object.assign(out, { verdict: 'VIOLATION', off_family: name });
}
export function auditColourLaw() {
var FILES = [];
function add(dir, re) { fs.readdirSync(dir).forEach(function (f) { if (re.test(f)) FILES.push(path.join(dir, f)); }); }
add(path.join(LA, 'lab', 'world'), /\.js$/); ['fieldScene.js', 'cityScene.js', 'farWorld.js', 'mahgicTree.js', 'interiorScene.js', 'dustFx.js', 'BeamFx.js', 'worldMap.js'].forEach(function (f) { FILES.push(path.join(LA, 'lab', f)); });
FILES.push(path.join(LA, 'lab', 'assets', 'world', 'world_registry_v1.json')); FILES.push(path.join(LA, 'lab', 'assets', 'botany', 'tree_spec.js'));
var rows = [];
FILES.filter(function (f) { return fs.existsSync(f); }).forEach(function (f) {
  var src = fs.readFileSync(f, 'utf8'); var lines = src.split('\n');
  lines.forEach(function (line, i) { var re = /(?:0x|#)([0-9a-fA-F]{6})\b/g, m; while ((m = re.exec(line))) { var hex = parseInt(m[1], 16); var c = classify(hex); if (c.verdict !== 'VIOLATION') continue;
    var ctx = line.slice(Math.max(0, m.index - 70), m.index + 40).replace(/\s+/g, ' ');
    rows.push({ file: path.relative(LA, f), line: i + 1, hex: '#' + m[1].toLowerCase(), h: c.h, s: c.s, l: c.l, off: c.off_family, ctx: ctx }); } });
});
var byFile = {}; rows.forEach(function (r) { (byFile[r.file] = byFile[r.file] || []).push(r); });
var byOff = {}; rows.forEach(function (r) { byOff[r.off] = (byOff[r.off] || 0) + 1; });
return { rows: rows, byFile: byFile, byOff: byOff, files: FILES.length };
}
var AUD = null;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  AUD = auditColourLaw(); var rows = AUD.rows, byFile = AUD.byFile, byOff = AUD.byOff;
  console.log('colour-law violations: ' + rows.length + ' literals in ' + Object.keys(byFile).length + ' files · ' + JSON.stringify(byOff));
  Object.keys(byFile).sort().forEach(function (f) { console.log('\n' + f + ' (' + byFile[f].length + ')'); byFile[f].slice(0, 400).forEach(function (r) { console.log('  L' + r.line + ' ' + r.hex + ' h' + r.h + ' s' + r.s + ' l' + r.l + ' ' + r.off + '  …' + r.ctx + '…'); }); });
  var j = process.argv.indexOf('--json'); if (j >= 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify({ law: FAMILIES, neutral: { s_below: NEUTRAL_S, l_below: DARK_L, l_above: LIGHT_L }, count: rows.length, by_family: byOff, rows: rows }, null, 1));
}
