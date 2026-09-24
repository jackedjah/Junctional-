"""MAHWORLD :: building source decimation (S11 building expansion). READS the five original landmark GLBs from the protected INCOMING bundle
   (untouched) and writes runtime COPIES (~70k triangles, base colour 2048² JPEG, normal 1024²) into lab/assets/buildings/_decimated/.
   Same route as decimate_residents.py. Runs headless: run_blender.ps1 -Script decimate_buildings.py"""
import bpy, os, sys, time, traceback
SRC = r'C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\INCOMING_BUILDINGS\MAHWORLD_BUILDING_EXPANSION\INPUTS'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'buildings', '_decimated'); os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, 'decimate.log'), 'a')
def log(*a): print(*a, file=LOG, flush=True)
JOBS = [('temple', 'ornate temple 3d model.glb', 70000), ('gym', 'modern gym building 3d model.glb', 70000), ('tower', 'futuristic tower 3d model.glb', 80000), ('market', 'futuristic market building 3d model.glb', 70000), ('training_display', 'futuristic weightlifting figures 3d model_Clone1.glb', 30000)]
for name, fn, TARGET_TRIS in JOBS:
    src = os.path.join(SRC, fn); dst = os.path.join(OUT, name + '_rt.glb')
    if os.path.exists(dst): log('skip (exists)', dst); continue
    t0 = time.time()
    try:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=src)
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        log(name, 'imported', len(meshes), 'meshes in', round(time.time() - t0, 1), 's')
        for o in meshes:
            tris = sum(len(p.vertices) - 2 for p in o.data.polygons); bb = [o.matrix_world @ v.co for v in o.data.vertices[:1]]
            ratio = min(1.0, TARGET_TRIS / max(1, tris)); log(' ', o.name, 'tris', tris, 'ratio', round(ratio, 4), 'dims', [round(d, 4) for d in o.dimensions])
            if ratio < 0.999:
                bpy.context.view_layer.objects.active = o; o.select_set(True)
                m = o.modifiers.new('DEC', 'DECIMATE'); m.ratio = ratio; m.use_collapse_triangulate = True
                bpy.ops.object.modifier_apply(modifier='DEC')
                log('   ->', sum(len(p.vertices) - 2 for p in o.data.polygons), 'tris after decimate', round(time.time() - t0, 1), 's')
        for im in bpy.data.images:
            isNormal = 'normal' in im.name.lower() or 'nrm' in im.name.lower()
            # fallback: detect the normal image by usage in the material node tree
            for mat in bpy.data.materials:
                if mat.use_nodes:
                    for n in mat.node_tree.nodes:
                        if n.type == 'TEX_IMAGE' and n.image == im:
                            for l in mat.node_tree.links:
                                if l.from_node == n and l.to_node.type == 'NORMAL_MAP': isNormal = True
            target = 1024 if isNormal else 2048
            if im.size[0] > target or im.size[1] > target:
                im.scale(target, target); log('  image', im.name, 'normal' if isNormal else 'base', 'scaled to', target)
        bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_apply=True, export_texcoords=True, export_normals=True, export_materials='EXPORT', export_image_format='JPEG', export_jpeg_quality=86, export_animations=False, export_skins=False, export_morph=False, export_yup=True)
        log(name, 'wrote', dst, os.path.getsize(dst), 'bytes in', round(time.time() - t0, 1), 's')
    except Exception:
        log(name, 'FAILED', traceback.format_exc())
log('DECIMATE_DONE')
