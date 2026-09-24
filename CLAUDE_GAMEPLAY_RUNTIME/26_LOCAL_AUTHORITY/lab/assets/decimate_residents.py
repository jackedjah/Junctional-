"""MAHWORLD :: resident source decimation (motion precision pass J). READS the RAW class GLBs (2M-triangle Tripo exports) and writes
   decimated COPIES (~24k triangles, textures scaled to 2048²) into lab/assets/_decimated/ for make_class_rig_v4.mjs. Sources untouched.
   Runs headless: blender --background --python decimate_residents.py"""
import bpy, os, sys, time, traceback
RAW = r'C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\RAW_10_MODELS'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_decimated'); os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, 'decimate.log'), 'a')
def log(*a): print(*a, file=LOG, flush=True)
TARGET_TRIS = 24000
JOBS = ['Mah_Bage_M', 'Mah_Lean_M', 'Mah_Titan_F', 'Mah_Visionary_M', 'Mah_Visionary_F']
for name in JOBS:
    src = os.path.join(RAW, name + '.glb'); dst = os.path.join(OUT, name + '_dec.glb')
    if os.path.exists(dst): log('skip (exists)', dst); continue
    t0 = time.time()
    try:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=src)
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        log(name, 'imported', len(meshes), 'meshes in', round(time.time() - t0, 1), 's')
        for o in meshes:
            tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
            ratio = min(1.0, TARGET_TRIS / max(1, tris))
            log(' ', o.name, 'tris', tris, 'ratio', round(ratio, 4))
            if ratio < 0.999:
                bpy.context.view_layer.objects.active = o; o.select_set(True)
                m = o.modifiers.new('DEC', 'DECIMATE'); m.ratio = ratio; m.use_collapse_triangulate = True
                bpy.ops.object.modifier_apply(modifier='DEC')
                log('   ->', sum(len(p.vertices) - 2 for p in o.data.polygons), 'tris after decimate', round(time.time() - t0, 1), 's')
        for im in bpy.data.images:
            if im.size[0] > 2048 or im.size[1] > 2048:
                im.scale(2048, 2048); log('  image', im.name, 'scaled to 2048')
        bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_apply=True, export_texcoords=True, export_normals=True, export_materials='EXPORT', export_image_format='JPEG', export_jpeg_quality=88, export_animations=False, export_skins=False, export_morph=False, export_yup=True)
        log(name, 'wrote', dst, os.path.getsize(dst), 'bytes in', round(time.time() - t0, 1), 's')
    except Exception:
        log(name, 'FAILED', traceback.format_exc())
log('DECIMATE_DONE')
