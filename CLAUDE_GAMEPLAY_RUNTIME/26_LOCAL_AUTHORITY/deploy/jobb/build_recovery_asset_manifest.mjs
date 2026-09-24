import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME = path.resolve(HERE, '..', '..', '..');
const OUT = path.join(RUNTIME, '25_HANDOFF', 'CONVERGENCE', 'ASSET_BACKUP_MANIFEST.json');
const REGISTRY = path.join(RUNTIME, '26_LOCAL_AUTHORITY', 'lab', 'assets', 'world', 'world_registry_v1.json');
const BUILDING_INPUTS = path.resolve(RUNTIME, '..', 'INCOMING_BUILDINGS', 'MAHWORLD_BUILDING_EXPANSION', 'INPUTS');

function files(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, ent.name);
    if (ent.isDirectory()) out.push(...files(p));
    else if (ent.isFile()) out.push(p);
  }
  return out;
}
function sha(file) { const h = crypto.createHash('sha256'); h.update(fs.readFileSync(file)); return h.digest('hex'); }
function rel(p) { return path.relative(RUNTIME, p).replaceAll('\\', '/'); }
function safeName(s) { return s.replaceAll('\\', '/').split('/').map(encodeURIComponent).join('/'); }
function row(file, role, remotePath, sourceId = null) {
  const st = fs.statSync(file);
  return {
    logical_path: role.startsWith('runtime') ? rel(file) : file.replaceAll('\\', '/'),
    role,
    source_id: sourceId,
    bytes: st.size,
    sha256: sha(file),
    remote_path: remotePath,
    content_storage: 'GIT_BLOB_NOT_LFS',
    upload_state: 'PENDING_PUSH',
    retrieval_state: 'PENDING_REMOTE_READBACK',
    license_privacy: 'Owner-supplied MAHWORLD game asset; public recovery upload explicitly authorized 2026-09-24. Generator/export provenance is recorded in project manifests; third-party source terms were not independently re-audited in this emergency pass.'
  };
}

const binaryExt = new Set(['.glb', '.gltf', '.bin', '.png', '.jpg', '.jpeg', '.webp', '.ktx2', '.blend', '.blend1']);
const runtimeRoot = path.join(RUNTIME, '26_LOCAL_AUTHORITY', 'lab', 'assets');
const runtimeAssets = files(runtimeRoot).filter(p => binaryExt.has(path.extname(p).toLowerCase()) && !/[\\/]_decimated[\\/]/i.test(p) && !/[\\/]rejected_blender_export[\\/]/i.test(p));
const rows = runtimeAssets.map(p => row(p, /\.blend1?$/i.test(p) ? 'runtime_authoring' : 'runtime_derivative', `CLAUDE_GAMEPLAY_RUNTIME/${rel(p)}`));

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
for (const src of registry.sources || []) {
  if (!src.path || !fs.existsSync(src.path)) continue;
  const family = src.path.includes('GLB_NEW3') ? 'GLB_NEW3' : 'GLB_PHASE_AB';
  rows.push(row(src.path, 'approved_original', `CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/RECOVERY_ASSETS/originals/${family}/${safeName(path.basename(src.path))}`, src.id));
}
for (const p of files(BUILDING_INPUTS).filter(p => /\.glb$/i.test(p))) {
  rows.push(row(p, 'approved_building_original', `CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/RECOVERY_ASSETS/originals/INCOMING_BUILDINGS/${safeName(path.basename(p))}`));
}

rows.sort((a, b) => a.remote_path.localeCompare(b.remote_path));
const manifest = {
  schema: 'MAHWORLD_ASSET_BACKUP_MANIFEST_V1',
  updated_utc: new Date().toISOString(),
  repository: 'https://github.com/jackedjah/Junctional-',
  visibility: 'PUBLIC',
  recovery_branch: 'backup/mahworld-m6-20260924T190351Z',
  gameplay_root: 'CLAUDE_GAMEPLAY_RUNTIME',
  source_checkpoint: 'bdc43b60d56c22253aeddf2eac996a5394128407',
  cloud_execution: 'NOT_TESTED',
  summary: {
    files: rows.length,
    bytes: rows.reduce((n, x) => n + x.bytes, 0),
    runtime_files: rows.filter(x => x.role.startsWith('runtime')).length,
    original_files: rows.filter(x => x.role.includes('original')).length,
    lfs_pointers: 0
  },
  assets: rows,
  outside_repository_dependencies: rows.filter(x => x.role.includes('original')).map(x => ({ local_path: x.logical_path, recovery_path: x.remote_path, sha256: x.sha256, state: 'PENDING_PUSH' })),
  excluded_private_or_restricted: [
    { scope: 'MAHWORLD_VIDEO_SOURCE_BUNDLE and reference footage', reason: 'private/restricted review media; not required runtime bytes; intentionally not uploaded' },
    { scope: 'Character/MAHFITT/S08 working assets and reserved Blender jobs', reason: 'separate job boundary; intentionally not uploaded' },
    { scope: 'Netlify .netlify state, credentials, .env values, browser profiles and logs', reason: 'secret/private machine state; intentionally not uploaded' },
    { scope: 'old package ZIPs, static_dist, temp derivative/probe folders and rejected decimation candidates', reason: 'reproducible or redundant; excluded from recovery payload' },
    { scope: 'GLB_PHASE_AB/faceted diamond sphere 3d model.glb', reason: 'not referenced by the current source registry/derivative chain; excluded as non-required' },
    { scope: 'resistance-band source model', reason: 'no source model exists in the project database; current runtime truth is the documented procedural tube fallback' },
    { scope: 'MAHWORLD_M6_FINAL_JUNCTION_FIX.txt', reason: 'not present in project or bounded Downloads search; operative scope is fully restated in the backed-up owner directive and handoffs' }
  ],
  restore: {
    instruction: 'Check out the recovery branch normally. All listed bytes are ordinary Git blobs, not LFS pointers. Compare each recovered file against this manifest SHA-256 before use.',
    originals_mapping: 'Files under 25_HANDOFF/RECOVERY_ASSETS/originals restore to the local source paths recorded in logical_path when a derivative rebuild is required.'
  },
  notes: ['Upload/readback fields are advanced only after the asset commit is pushed and independently retrieved from GitHub.']
};
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`asset manifest -> ${OUT} (${manifest.summary.files} files, ${manifest.summary.bytes} bytes)`);
