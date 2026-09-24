# -*- coding: utf-8 -*-
"""MAHWORLD JOB B :: SOURCE -> RUNTIME DERIVATIVE (no Blender; the Blender slot stays reserved).
   raw Tripo GLB (1.8-2.0 M tris, 8k JPEG + 4k PNG) -> inspect -> quadric decimation (fast_simplification, UVs carried by the
   collapse map, normals recomputed) -> texture resample (Pillow) -> runtime GLB (no extensions, no compression: the runtime has
   no DRACO / KTX2 / meshopt decoders) -> sidecar JSON with provenance (source path, sha256, tris, bytes) and derivative stats.
   Skinned / already-light sources are NOT decimated: geometry, skins, joints and node hierarchy are copied verbatim, only the
   images are resampled. Nothing is ever written into the source folder.

   python deploy/jobb/derive_glb.py --src <glb> --out-dir <dir> --name <CANON> --lods "L0:40000,L1:10000,L2:3000" --tex 2048 --normal 1024 [--keep-geometry] [--preserve-border] [--attribute-representative nearest]
"""
import argparse, hashlib, io, json, os, struct, sys, time
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_glb(path):
    b = open(path, 'rb').read()
    magic, ver, total = struct.unpack_from('<4sII', b, 0)
    assert magic == b'glTF' and ver == 2, 'not a GLB v2'
    jl, jt = struct.unpack_from('<II', b, 12)
    j = json.loads(b[20:20 + jl].decode('utf-8'))
    bl, bt = struct.unpack_from('<II', b, 20 + jl)
    bin_ = b[28 + jl:28 + jl + bl]
    return j, bin_, b


def acc(j, bin_, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); n = NC[a['type']]; dt = CT[a['componentType']]
    stride = bv.get('byteStride')
    if stride and stride != n * np.dtype(dt).itemsize:
        raise SystemExit('strided accessor not supported')
    arr = np.frombuffer(bin_, dtype=dt, count=a['count'] * n, offset=off)
    return arr.reshape(a['count'], n) if n > 1 else arr


def image_bytes(j, bin_, i):
    im = j['images'][i]; bv = j['bufferViews'][im['bufferView']]
    off = bv.get('byteOffset', 0); return bin_[off:off + bv['byteLength']], im.get('mimeType', 'image/png')


def resample(data, target, mime_out, quality):
    im = Image.open(io.BytesIO(data)); w, h = im.size
    if max(w, h) > target:
        s = target / max(w, h); im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    out = io.BytesIO()
    if mime_out == 'image/jpeg':
        im.convert('RGB').save(out, format='JPEG', quality=quality, optimize=True, subsampling=0)
    else:
        im.save(out, format='PNG', optimize=True)
    return out.getvalue(), im.size


class GlbWriter:
    def __init__(self):
        self.bin = bytearray(); self.views = []; self.accs = []

    def pad(self):
        while len(self.bin) % 4: self.bin += b'\0'

    def add_view(self, data, target=None):
        self.pad(); off = len(self.bin); self.bin += data; self.pad()
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target: v['target'] = target
        self.views.append(v); return len(self.views) - 1

    def add_acc(self, arr, ctype, atype, target=None, minmax=False):
        arr = np.ascontiguousarray(arr); vi = self.add_view(arr.tobytes(), target)
        a = {'bufferView': vi, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': atype}
        if minmax:
            a['min'] = [float(x) for x in arr.min(axis=0)]; a['max'] = [float(x) for x in arr.max(axis=0)]
        self.accs.append(a); return len(self.accs) - 1

    def finish(self, j):
        j['bufferViews'] = self.views; j['accessors'] = self.accs; j['buffers'] = [{'byteLength': len(self.bin)}]
        js = json.dumps(j, separators=(',', ':')).encode('utf-8')
        while len(js) % 4: js += b' '
        self.pad()
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        return struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(self.bin), 0x004E4942) + bytes(self.bin)


def face_normals_smooth(pos, tri):
    fn = np.cross(pos[tri[:, 1]] - pos[tri[:, 0]], pos[tri[:, 2]] - pos[tri[:, 0]])
    vn = np.zeros_like(pos)
    for k in range(3): np.add.at(vn, tri[:, k], fn)
    l = np.linalg.norm(vn, axis=1); l[l == 0] = 1
    return (vn / l[:, None]).astype(np.float32)


def collapse_representatives(source_pos, simplified_pos, mapping, mode='first'):
    """Choose one source vertex for attributes that are not handled by the
    geometry-only simplifier.  ``first`` preserves the historical output;
    ``nearest`` chooses the member of each collapse cluster closest to the
    simplified vertex and is normally a better UV/normal proxy.
    """
    if mode == 'first':
        first = {}
        for oi, ni in enumerate(mapping):
            if ni >= 0 and ni not in first: first[ni] = oi
        return np.array([first.get(k, 0) for k in range(len(simplified_pos))], dtype=np.int64)
    valid = np.flatnonzero(mapping >= 0)
    mapped = mapping[valid]
    delta = source_pos[valid] - simplified_pos[mapped]
    dist2 = np.einsum('ij,ij->i', delta, delta)
    # primary key = mapped destination, secondary = distance, tertiary = source index
    order = np.lexsort((valid, dist2, mapped))
    candidates = valid[order]; destinations = mapping[candidates]
    take = np.r_[True, destinations[1:] != destinations[:-1]]
    rep = np.zeros(len(simplified_pos), dtype=np.int64)
    rep[destinations[take]] = candidates[take]
    return rep


def images_only(a, j, bin_, raw, sha):
    """Rebuild the BIN with every non-image bufferView copied verbatim (same order = same indices) and the images resampled."""
    import copy
    out = copy.deepcopy(j); new_bin = bytearray(); views = []
    image_view = {}
    mat = j['materials'][0] if j.get('materials') else {}
    n_img = None
    if mat.get('normalTexture'): n_img = j['textures'][mat['normalTexture']['index']]['source']
    for ii, im in enumerate(j.get('images', [])): image_view[im['bufferView']] = ii
    tex_stats = []
    for vi, bv in enumerate(j['bufferViews']):
        while len(new_bin) % 4: new_bin += b'\0'
        off = bv.get('byteOffset', 0); data = bin_[off:off + bv['byteLength']]
        if vi in image_view:
            ii = image_view[vi]; target = a.normal if ii == n_img else a.tex
            data, size = resample(data, target, 'image/jpeg', 90 if ii == n_img else a.jpeg)
            out['images'][ii]['mimeType'] = 'image/jpeg'; out['images'][ii]['name'] = a.name + '_img' + str(ii)
            tex_stats.append({'image': ii, 'source_bytes': bv['byteLength'], 'runtime_bytes': len(data), 'runtime_size': list(size), 'normal': ii == n_img})
        nv = {'buffer': 0, 'byteOffset': len(new_bin), 'byteLength': len(data)}
        for k in ('target', 'byteStride'):
            if k in bv: nv[k] = bv[k]
        views.append(nv); new_bin += data
    while len(new_bin) % 4: new_bin += b'\0'
    out['bufferViews'] = views; out['buffers'] = [{'byteLength': len(new_bin)}]
    if out.get('meshes'): out['meshes'][0]['name'] = a.name
    out.setdefault('asset', {})['generator'] = 'MAHWORLD JOB B derive_glb.py (images resampled; geometry / skin verbatim)'
    out['asset']['extras'] = {'mahworld': {'canonical': a.name, 'lod': 'L0', 'role': a.role, 'source_sha256': sha, 'source_file': os.path.basename(a.src), 'geometry': 'verbatim'}}
    js = json.dumps(out, separators=(',', ':')).encode('utf-8')
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(new_bin)
    blob = struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(new_bin), 0x004E4942) + bytes(new_bin)
    os.makedirs(a.out_dir, exist_ok=True); fn = os.path.join(a.out_dir, a.name + '_L0.glb'); open(fn, 'wb').write(blob)
    prim = j['meshes'][0]['primitives'][0]; tris = int(j['accessors'][prim['indices']]['count'] // 3) if 'indices' in prim else 0
    side = {'canonical': a.name, 'role': a.role, 'source': {'file': os.path.abspath(a.src), 'original_name': a.canonical_source_name or os.path.basename(a.src), 'sha256': sha, 'bytes': len(raw), 'triangles': tris, 'skinned': 'JOINTS_0' in prim['attributes'], 'joints': len(j['skins'][0]['joints']) if j.get('skins') else 0, 'animations': len(j.get('animations', [])), 'generator': j.get('asset', {}).get('generator', '')}, 'textures': tex_stats, 'lods': [{'lod': 'L0', 'file': os.path.basename(fn), 'triangles': tris, 'bytes': len(blob), 'sha256': hashlib.sha256(blob).hexdigest()}], 'method': 'images resampled (Pillow LANCZOS, JPEG); every accessor, node, skin and animation byte-identical', 'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    json.dump(side, open(os.path.join(a.out_dir, a.name + '.derivative.json'), 'w'), indent=1)
    print('done', a.name, 'images-only: %d tris, %.1f MB -> %.2f MB' % (tris, len(raw) / 1e6, len(blob) / 1e6))


# appended to derive_glb.py: a SKINNED LOD mode — the one skinned primitive is decimated (quadric collapse, UVs / joints / weights follow the
# surviving representative vertex, normals recomputed), everything else (nodes, skin, inverse bind matrices, images) is copied from the L0
# derivative so the skeleton the client animates is byte-identical between LODs.
def skinned_lod(a, j, bin_, raw, sha):
    import copy, fast_simplification
    mesh = j['meshes'][0]; prim = mesh['primitives'][0]
    if 'JOINTS_0' not in prim['attributes']:
        raise SystemExit('skinned-lod: the primitive has no JOINTS_0')
    pos = acc(j, bin_, prim['attributes']['POSITION']).astype(np.float32)
    idx = acc(j, bin_, prim['indices']).astype(np.int64).reshape(-1, 3)
    uv = acc(j, bin_, prim['attributes']['TEXCOORD_0']).astype(np.float32) if 'TEXCOORD_0' in prim['attributes'] else None
    jn = acc(j, bin_, prim['attributes']['JOINTS_0']); wt = acc(j, bin_, prim['attributes']['WEIGHTS_0']).astype(np.float32)
    jn_ctype = j['accessors'][prim['attributes']['JOINTS_0']]['componentType']
    src_tris = int(len(idx))
    # accessors / bufferViews owned by the primitive's geometry are replaced; every other bufferView (IBM, images) is copied verbatim
    geo_acc = set([prim['indices']] + [prim['attributes'][k] for k in prim['attributes']])
    geo_views = set(j['accessors'][ai]['bufferView'] for ai in geo_acc)
    image_view = {}
    for ii, im in enumerate(j.get('images', [])): image_view[im['bufferView']] = ii
    mat = j['materials'][0] if j.get('materials') else {}
    n_img = j['textures'][mat['normalTexture']['index']]['source'] if mat.get('normalTexture') else None
    lods = []; sidecar_lods = []
    for spec in a.lods.split(','):
        tag, target = spec.split(':'); target = int(target)
        t1 = time.time()
        agg = a.agg if target >= 0.05 * len(idx) else max(a.agg, 9.0)
        p2, t2, col = fast_simplification.simplify(pos.astype(np.float64), idx.astype(np.int32), target_count=target, agg=agg, return_collapses=True)
        p3, t3, mapping = fast_simplification.replay_simplification(pos, idx.astype(np.int32), col)
        first = {}
        for oi, ni in enumerate(mapping):
            if ni >= 0 and ni not in first: first[ni] = oi
        rep = np.array([first.get(k, 0) for k in range(len(p3))], dtype=np.int64)
        new_pos = p3.astype(np.float32); new_tri = t3.astype(np.int64)
        keep = (new_tri[:, 0] != new_tri[:, 1]) & (new_tri[:, 1] != new_tri[:, 2]) & (new_tri[:, 0] != new_tri[:, 2]); new_tri = new_tri[keep]
        new_uv = uv[rep] if uv is not None else None; new_jn = jn[rep]; new_wt = wt[rep]
        s = new_wt.sum(axis=1, keepdims=True); s[s == 0] = 1; new_wt = (new_wt / s).astype(np.float32)
        new_nrm = face_normals_smooth(new_pos, new_tri)
        out = copy.deepcopy(j); new_bin = bytearray(); views = []; vmap = {}
        for vi, bv in enumerate(j['bufferViews']):
            if vi in geo_views: continue
            while len(new_bin) % 4: new_bin += b'\0'
            off = bv.get('byteOffset', 0); data = bin_[off:off + bv['byteLength']]
            if vi in image_view:
                ii = image_view[vi]; tgt = a.normal if ii == n_img else a.tex
                data, size = resample(data, tgt, 'image/jpeg', 90 if ii == n_img else a.jpeg)
                out['images'][ii]['mimeType'] = 'image/jpeg'; out['images'][ii]['name'] = a.name + '_img' + str(ii)
            nv = {'buffer': 0, 'byteOffset': len(new_bin), 'byteLength': len(data)}
            for k in ('target', 'byteStride'):
                if k in bv: nv[k] = bv[k]
            vmap[vi] = len(views); views.append(nv); new_bin += data
        for ii, im in enumerate(out.get('images', [])): im['bufferView'] = vmap[j['images'][ii]['bufferView']]
        # re-point the surviving accessors
        new_accs = []; amap = {}
        for ai, ac in enumerate(j['accessors']):
            if ai in geo_acc: continue
            ac2 = dict(ac); ac2['bufferView'] = vmap[ac['bufferView']]; amap[ai] = len(new_accs); new_accs.append(ac2)
        def add(arr, ctype, atype, target, minmax=False):
            arr = np.ascontiguousarray(arr)
            while len(new_bin) % 4: new_bin.extend(b'\0')
            off = len(new_bin); new_bin.extend(arr.tobytes())
            views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(arr.tobytes()), 'target': target})
            ac = {'bufferView': len(views) - 1, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': atype}
            if minmax: ac['min'] = [float(x) for x in arr.min(axis=0)]; ac['max'] = [float(x) for x in arr.max(axis=0)]
            new_accs.append(ac); return len(new_accs) - 1
        attrs = {'POSITION': add(new_pos, 5126, 'VEC3', 34962, True), 'NORMAL': add(new_nrm.astype(np.float32), 5126, 'VEC3', 34962),
                 'JOINTS_0': add(new_jn, jn_ctype, 'VEC4', 34962), 'WEIGHTS_0': add(new_wt, 5126, 'VEC4', 34962)}
        if new_uv is not None: attrs['TEXCOORD_0'] = add(new_uv.astype(np.float32), 5126, 'VEC2', 34962)
        ind = add(new_tri.astype(np.uint32).reshape(-1), 5125, 'SCALAR', 34963)
        # everything that referenced an accessor index must be remapped (skins.inverseBindMatrices; animations are absent for these sources)
        for sk in out.get('skins', []):
            if 'inverseBindMatrices' in sk: sk['inverseBindMatrices'] = amap[sk['inverseBindMatrices']]
        if out.get('animations'): raise SystemExit('skinned-lod: animations present — not supported')
        out['meshes'][0]['name'] = a.name + '_' + tag
        out['meshes'][0]['primitives'] = [{'attributes': attrs, 'indices': ind, 'material': prim.get('material', 0), 'mode': 4}]
        while len(new_bin) % 4: new_bin += b'\0'
        out['bufferViews'] = views; out['accessors'] = new_accs; out['buffers'] = [{'byteLength': len(new_bin)}]
        out.setdefault('asset', {})['generator'] = 'MAHWORLD JOB B derive_glb.py (skinned LOD: quadric collapse, joints / weights carried, skin verbatim)'
        out['asset']['extras'] = {'mahworld': {'canonical': a.name, 'lod': tag, 'role': a.role, 'source_sha256': sha, 'source_file': os.path.basename(a.src), 'geometry': 'decimated', 'triangles': int(len(new_tri))}}
        js = json.dumps(out, separators=(',', ':')).encode('utf-8')
        while len(js) % 4: js += b' '
        total = 12 + 8 + len(js) + 8 + len(new_bin)
        blob = struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(new_bin), 0x004E4942) + bytes(new_bin)
        fn = os.path.join(a.out_dir, a.name + '_' + tag + '.glb'); open(fn, 'wb').write(blob)
        lods.append({'lod': tag, 'file': os.path.basename(fn), 'triangles': int(len(new_tri)), 'vertices': int(len(new_pos)), 'bytes': len(blob), 'sha256': hashlib.sha256(blob).hexdigest(), 'method': 'fast_simplification quadric (agg %.0f) + joints/weights via representative vertex, skin verbatim' % agg, 'seconds': round(time.time() - t1, 1)})
        print('done', a.name, tag, '%d -> %d tris, %.2f MB' % (src_tris, len(new_tri), len(blob) / 1e6))
    side_path = os.path.join(a.out_dir, a.name + '.derivative.json')
    side = json.load(open(side_path)) if os.path.exists(side_path) else {'canonical': a.name, 'role': a.role, 'source': {'file': os.path.abspath(a.src), 'sha256': sha, 'bytes': len(raw), 'triangles': src_tris}}
    side.setdefault('lods', [])
    side['lods'] = [l for l in side['lods'] if l.get('lod') not in [x['lod'] for x in lods]] + lods
    json.dump(side, open(side_path, 'w'), indent=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True); ap.add_argument('--out-dir', required=True); ap.add_argument('--name', required=True)
    ap.add_argument('--lods', default='L0:40000'); ap.add_argument('--tex', type=int, default=2048); ap.add_argument('--normal', type=int, default=1024)
    ap.add_argument('--keep-geometry', action='store_true'); ap.add_argument('--agg', type=float, default=7.0); ap.add_argument('--jpeg', type=int, default=86)
    ap.add_argument('--preserve-normals', action='store_true', help='carry source vertex normals through the collapse map instead of recomputing faceted normals')
    ap.add_argument('--preserve-border', action='store_true', help='static geometry mode: prevent edge collapses touching mesh borders (also protects many indexed UV seams)')
    ap.add_argument('--attribute-representative', choices=('first', 'nearest'), default='first', help='static geometry mode: source vertex used for UV/normal attributes after collapse; first is legacy-compatible')
    ap.add_argument('--role', default=''); ap.add_argument('--canonical-source-name', default=''); ap.add_argument('--skinned-lod', action='store_true', help='decimate the one skinned primitive (joints / weights carried), keep the skin / nodes / images'); ap.add_argument('--images-only', action='store_true', help='skinned / light sources: keep every node, skin, accessor and animation byte-identical, resample only the images')
    a = ap.parse_args()
    t0 = time.time(); j, bin_, raw = read_glb(a.src); sha = hashlib.sha256(raw).hexdigest()
    os.makedirs(a.out_dir, exist_ok=True)
    if a.images_only:
        return images_only(a, j, bin_, raw, sha)
    if a.skinned_lod:
        return skinned_lod(a, j, bin_, raw, sha)
    mesh = j['meshes'][0]; prim = mesh['primitives'][0]
    pos = acc(j, bin_, prim['attributes']['POSITION']).astype(np.float32)
    idx = acc(j, bin_, prim['indices']).astype(np.int64).reshape(-1, 3) if 'indices' in prim else np.arange(len(pos), dtype=np.int64).reshape(-1, 3)
    uv = acc(j, bin_, prim['attributes']['TEXCOORD_0']).astype(np.float32) if 'TEXCOORD_0' in prim['attributes'] else None
    nrm = acc(j, bin_, prim['attributes']['NORMAL']).astype(np.float32) if 'NORMAL' in prim['attributes'] else None
    src_tris = int(len(idx)); bmin = pos.min(axis=0).tolist(); bmax = pos.max(axis=0).tolist()
    # ---- textures (shared by every LOD): resample once
    mat = j['materials'][0] if j.get('materials') else {}
    tex_out = []  # per source image: (bytes, mime, size)
    normal_img = mat.get('normalTexture', {}).get('index')
    base_img = mat.get('pbrMetallicRoughness', {}).get('baseColorTexture', {}).get('index')
    mr_img = mat.get('pbrMetallicRoughness', {}).get('metallicRoughnessTexture', {}).get('index')
    em_img = mat.get('emissiveTexture', {}).get('index')
    tex_index_of_image = {}
    for ti, t in enumerate(j.get('textures', [])): tex_index_of_image.setdefault(t['source'], ti)
    def img_of_tex(ti): return j['textures'][ti]['source'] if ti is not None else None
    n_img, b_img, mr_i, em_i = img_of_tex(normal_img), img_of_tex(base_img), img_of_tex(mr_img), img_of_tex(em_img)
    for ii in range(len(j.get('images', []))):
        data, mime = image_bytes(j, bin_, ii)
        target = a.normal if ii == n_img else a.tex
        out_mime = 'image/jpeg'
        q = 90 if ii == n_img else a.jpeg
        data2, size = resample(data, target, out_mime, q)
        tex_out.append((data2, out_mime, size, len(data)))
    # ---- LODs
    normal_method = 'source normals carried by collapse map' if a.preserve_normals and nrm is not None else 'smooth normals recomputed'
    recipe = {'tool': '26_LOCAL_AUTHORITY/deploy/jobb/derive_glb.py', 'mode': 'static_geometry', 'arguments': {'lods': a.lods, 'tex': a.tex, 'normal': a.normal, 'jpeg': a.jpeg, 'agg': a.agg, 'keep_geometry': bool(a.keep_geometry), 'preserve_normals': bool(a.preserve_normals), 'preserve_border': bool(a.preserve_border), 'attribute_representative': a.attribute_representative}}
    lods = []; sidecar = {'canonical': a.name, 'role': a.role, 'source': {'file': os.path.abspath(a.src), 'original_name': a.canonical_source_name or os.path.basename(a.src), 'sha256': sha, 'bytes': len(raw), 'triangles': src_tris, 'vertices': int(len(pos)), 'bounds_min': bmin, 'bounds_max': bmax, 'skinned': 'JOINTS_0' in prim['attributes'], 'animations': len(j.get('animations', [])), 'generator': j.get('asset', {}).get('generator', '')}, 'textures': [{'source_bytes': t[3], 'runtime_bytes': len(t[0]), 'runtime_size': list(t[2]), 'mime': t[1]} for t in tex_out], 'lods': [], 'method': 'fast_simplification quadric edge collapse (agg %.1f, preserve_border %s), UVs via %s collapse-cluster representative, %s; textures Pillow LANCZOS' % (a.agg, a.preserve_border, a.attribute_representative, normal_method), 'recipe': recipe, 'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    import fast_simplification
    cur_pos, cur_tri, cur_uv, cur_nrm = pos, idx, uv, nrm   # LODs CASCADE: each level simplifies the previous level (reaches small targets, keeps them consistent)
    for spec in a.lods.split(','):
        tag, target = spec.split(':'); target = int(target)
        if a.keep_geometry or target >= len(cur_tri):
            new_pos, new_tri, new_uv, new_nrm = cur_pos, cur_tri, cur_uv, (cur_nrm if cur_nrm is not None else face_normals_smooth(cur_pos, cur_tri))
        else:
            t1 = time.time()
            agg = a.agg if target >= 0.05 * len(cur_tri) else max(a.agg, 9.0)
            p2, t2, col = fast_simplification.simplify(cur_pos.astype(np.float64), cur_tri.astype(np.int32), target_count=target, agg=agg, return_collapses=True, preserve_border=a.preserve_border)
            p3, t3, mapping = fast_simplification.replay_simplification(cur_pos, cur_tri.astype(np.int32), col)
            pos, idx, uv = cur_pos, cur_tri, cur_uv
            # representative source vertex for attributes the geometry-only simplifier cannot carry
            rep = collapse_representatives(cur_pos, p3, mapping, a.attribute_representative)
            new_pos = p3.astype(np.float32); new_tri = t3.astype(np.int64)
            new_uv = uv[rep] if uv is not None else None
            new_nrm = cur_nrm[rep].astype(np.float32) if a.preserve_normals and cur_nrm is not None else face_normals_smooth(new_pos, new_tri)
            sidecar.setdefault('timing_s', {})[tag] = round(time.time() - t1, 1)
            cur_pos, cur_tri, cur_uv, cur_nrm = new_pos, new_tri, new_uv, new_nrm
        # drop degenerate / unused
        keep = (new_tri[:, 0] != new_tri[:, 1]) & (new_tri[:, 1] != new_tri[:, 2]) & (new_tri[:, 0] != new_tri[:, 2]); new_tri = new_tri[keep]
        w = GlbWriter(); out = {'asset': {'version': '2.0', 'generator': 'MAHWORLD JOB B derive_glb.py (fast_simplification + Pillow)'}}
        out['extensionsUsed'] = []; out['scene'] = 0; out['scenes'] = [{'nodes': [0]}]
        out['nodes'] = [{'mesh': 0, 'name': a.name + '_' + tag}]
        attrs = {'POSITION': w.add_acc(new_pos, 5126, 'VEC3', 34962, True), 'NORMAL': w.add_acc(new_nrm, 5126, 'VEC3', 34962)}
        if new_uv is not None: attrs['TEXCOORD_0'] = w.add_acc(new_uv.astype(np.float32), 5126, 'VEC2', 34962)
        ind = w.add_acc(new_tri.astype(np.uint32).reshape(-1), 5125, 'SCALAR', 34963)
        images = []; textures = []
        for ii, t in enumerate(tex_out):
            vi = w.add_view(t[0]); images.append({'bufferView': vi, 'mimeType': t[1], 'name': a.name + '_img' + str(ii)}); textures.append({'sampler': 0, 'source': ii})
        out['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
        out['images'] = images; out['textures'] = textures
        m = {'name': a.name + '_PBR', 'doubleSided': bool(mat.get('doubleSided', False)), 'pbrMetallicRoughness': {'metallicFactor': mat.get('pbrMetallicRoughness', {}).get('metallicFactor', 0), 'roughnessFactor': mat.get('pbrMetallicRoughness', {}).get('roughnessFactor', 0.5)}}
        if b_img is not None: m['pbrMetallicRoughness']['baseColorTexture'] = {'index': tex_index_of_image.get(b_img, 0)}
        if 'baseColorFactor' in mat.get('pbrMetallicRoughness', {}): m['pbrMetallicRoughness']['baseColorFactor'] = mat['pbrMetallicRoughness']['baseColorFactor']
        if n_img is not None: m['normalTexture'] = {'index': tex_index_of_image.get(n_img, 0)}
        if mr_i is not None: m['pbrMetallicRoughness']['metallicRoughnessTexture'] = {'index': tex_index_of_image.get(mr_i, 0)}
        if em_i is not None: m['emissiveTexture'] = {'index': tex_index_of_image.get(em_i, 0)}; m['emissiveFactor'] = mat.get('emissiveFactor', [1, 1, 1])
        out['materials'] = [m]
        out['meshes'] = [{'name': a.name + '_' + tag, 'primitives': [{'attributes': attrs, 'indices': ind, 'material': 0, 'mode': 4}]}]
        out['asset']['extras'] = {'mahworld': {'canonical': a.name, 'lod': tag, 'role': a.role, 'source_sha256': sha, 'source_file': os.path.basename(a.src), 'source_triangles': src_tris}}
        blob = w.finish(out); fn = os.path.join(a.out_dir, '%s_%s.glb' % (a.name, tag)); open(fn, 'wb').write(blob)
        lods.append({'lod': tag, 'file': os.path.basename(fn), 'triangles': int(len(new_tri)), 'vertices': int(len(new_pos)), 'bytes': len(blob), 'sha256': hashlib.sha256(blob).hexdigest()})
        print('  %s: %d tris %d verts %.2f MB' % (tag, len(new_tri), len(new_pos), len(blob) / 1e6))
    sidecar['lods'] = lods; sidecar['elapsed_s'] = round(time.time() - t0, 1)
    json.dump(sidecar, open(os.path.join(a.out_dir, a.name + '.derivative.json'), 'w'), indent=1)
    print('done', a.name, 'source %d tris %.1f MB -> %s in %.0fs' % (src_tris, len(raw) / 1e6, ', '.join('%s %d tris %.2f MB' % (l['lod'], l['triangles'], l['bytes'] / 1e6) for l in lods), time.time() - t0))


if __name__ == '__main__':
    main()
