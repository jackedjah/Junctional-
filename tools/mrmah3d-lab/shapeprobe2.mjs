const ROOT = process.env.MRMAH_ROOT || '/home/user/Junctional-';
const { loft } = await import(ROOT + '/mrmah3d/core/character/forge.js');
const { proportionsFor } = await import(ROOT + '/mrmah3d/core/character/variants.js');
const [variant, yArg] = process.argv.slice(2);
const P = proportionsFor(variant === 'female' ? 'female' : undefined);
const T = P.TORSO;
const built = loft(T.rings, T.sides, { refine: T.refine, jitter: 0, capBottom: false });
const pos = built.positions; const Y = Number(yArg);
const byY = new Map();
for (let i = 0; i < pos.length; i += 3) { const y = Math.round(pos[i + 1] * 1000) / 1000; if (!byY.has(y)) byY.set(y, []); byY.get(y).push([pos[i], pos[i + 2]]); }
const y = [...byY.keys()].sort((a, b) => Math.abs(a - Y) - Math.abs(b - Y))[0];
const ring = byY.get(y).map(([x, z]) => ({ deg: Math.round(Math.atan2(x, z) * 180 / Math.PI), x, z })).map(v => { if (v.deg < 0) v.deg += 360; return v; }).filter(v => v.deg >= 90 && v.deg <= 270).sort((a, b) => a.deg - b.deg);
console.log(variant, 'ring y', y, ring.map(v => `${v.deg}°: x ${v.x.toFixed(3)} z ${v.z.toFixed(3)}`).join(' | '));
