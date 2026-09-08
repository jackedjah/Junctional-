/* MAH 3D — SILHOUETTE PROFILE (development tooling).

   Prints the character's own width and depth profile, measured off the BUILT
   geometry rather than off a ring table. That distinction is the whole point:
   since R120 the male torso's rings are re-sectioned by `maleTorsoSections` and
   projected by the myofascial surface, so a literal in proportions.js is the
   ribcage, not the silhouette. A contour fault — a missing knee, a quad that is
   a panel, a medial return that is a straight edge — can only be read here.

   It reports, per row:
     w      the widest |x| in the band, i.e. the outer contour
     d      the deepest |z|
     seam   the smallest |z| within 0.02 of the centreline — the medial channel
     dw/dy  the slope of the outer contour, which is where a knee shows up:
            a landmark is a change of SLOPE, and a body with none has a single
            monotonic run from the hip to the point

   Usage:  node tools/mrmah3d-profile.mjs [male|mrs-mah|female] [--rows=0.3,0.5]
           node tools/mrmah3d-profile.mjs male --json > out.json */

const who = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'male';
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const band = Number((args.find(a => a.startsWith('--band=')) || '--band=0.01').slice(7));

const base = new URL('../mrmah3d/core/character/', import.meta.url).href;
const { createCrystalMaterials } = await import(base + 'materials.js');
const { buildBody } = await import(base + 'body.js');
const { proportionsFor } = await import(base + 'variants.js');
const { HEIGHT } = await import(base + 'proportions.js');

const P = proportionsFor(who === 'male' ? undefined : who);
const body = buildBody(createCrystalMaterials({}), P, { authoringMaster: true });

/* The lower body is the TORSO solid: the teardrop is one continuous mesh from
   the girdle to the point, which is the canon — never two legs, never a
   separate lower solid. */
const torso = body.group.getObjectByName('torso');
const pos = torso.geometry.attributes.position;

const rows = new Map();
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
  const key = Math.round(y / band) * band;
  let r = rows.get(key);
  if (!r) rows.set(key, r = { w: 0, d: 0, seam: Infinity, n: 0 });
  r.w = Math.max(r.w, Math.abs(x));
  r.d = Math.max(r.d, Math.abs(z));
  if (Math.abs(x) < 0.02 && z > 0) r.seam = Math.min(r.seam, z);
  r.n++;
}

const height = HEIGHT * (P.stature || 1);
const list = [...rows.entries()]
  .filter(([, r]) => r.n >= 6)
  .sort((a, b) => a[0] - b[0])
  .map(([y, r]) => ({
    y: +y.toFixed(3),
    t: +(y / height).toFixed(3),
    w: +r.w.toFixed(4),
    d: +r.d.toFixed(4),
    seam: Number.isFinite(r.seam) ? +r.seam.toFixed(4) : null
  }));

for (let i = 1; i < list.length; i++) {
  const a = list[i - 1], b = list[i];
  b.slope = +((b.w - a.w) / (b.y - a.y)).toFixed(3);
}

if (asJson) {
  console.log(JSON.stringify({ who, height, band, rows: list }, null, 1));
} else {
  console.log(`${who}   height ${height.toFixed(3)}   band ${band}`);
  console.log('    y      t       w       d      seam    dw/dy');
  for (const r of list) {
    console.log(
      String(r.y).padStart(7) + String(r.t).padStart(7) +
      String(r.w).padStart(9) + String(r.d).padStart(9) +
      String(r.seam == null ? '  -' : r.seam).padStart(9) +
      String(r.slope == null ? '  -' : r.slope).padStart(9));
  }
}
