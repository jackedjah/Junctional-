/* R109 — table-level lower-body profile without a browser.
   Lofts the TORSO (refine on, jitter off, facet off) and prints, per ring y <= yMax,
   the silhouette half-width (max |x|), the front and back extents (max z / min z),
   t = 1 - y/3, the full-width fraction of height (2*maxX/3) and depth/width.
   MRMAH_ROOT=<worktree> node lowerprofile.mjs [male|female] [yMax=1.7] */
const ROOT = process.env.MRMAH_ROOT || '/home/user/Junctional-';
const { loft } = await import(ROOT + '/mrmah3d/core/character/forge.js');
const { proportionsFor } = await import(ROOT + '/mrmah3d/core/character/variants.js');
const [variant, yMaxArg] = process.argv.slice(2);
const yMax = Number(yMaxArg || 1.7);
const P = proportionsFor(variant === 'female' ? 'female' : undefined);
const T = P.TORSO;
const rings = T.rings.map(r => Object.assign({}, r, { facet: 0 }));
const built = loft(rings, T.sides, { refine: T.refine, jitter: 0, capBottom: false });
const pos = built.positions;
const byY = new Map();
for (let i = 0; i < pos.length; i += 3) {
  const y = Math.round(pos[i + 1] * 1000) / 1000;
  if (y > yMax + 1e-6) continue;
  if (!byY.has(y)) byY.set(y, { maxX: 0, maxZ: -9, minZ: 9 });
  const b = byY.get(y);
  b.maxX = Math.max(b.maxX, Math.abs(pos[i]));
  b.maxZ = Math.max(b.maxZ, pos[i + 2]);
  b.minZ = Math.min(b.minZ, pos[i + 2]);
}
const authored = new Set(T.rings.map(r => Math.round(r.y * 1000) / 1000));
const ys = [...byY.keys()].sort((a, b) => b - a);
let prev = null, warn = [];
console.log('   y      t    half   frac   front   back  depth  d/w');
for (const y of ys) {
  const b = byY.get(y);
  const frac = 2 * b.maxX / 3.0, depth = b.maxZ - b.minZ;
  const mark = authored.has(y) ? '*' : ' ';
  console.log(`${mark}${y.toFixed(3)}  ${(1 - y / 3).toFixed(3)}  ${b.maxX.toFixed(3)}  ${frac.toFixed(3)}  ${b.maxZ.toFixed(3)}  ${b.minZ.toFixed(3)}  ${depth.toFixed(3)}  ${(depth / (2 * b.maxX)).toFixed(2)}`);
  if (prev && y < 1.20 && b.maxX > prev.maxX + 1e-4) warn.push(`swell: ${y} (${b.maxX.toFixed(3)}) wider than the ring above (${prev.maxX.toFixed(3)})`);
  prev = b;
}
if (warn.length) console.log('WARN\n ' + warn.join('\n '));
