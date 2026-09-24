# MAHWORLD :: RIG SOLVE (Blender 4.5 headless) — measures joints and solves heat-diffusion skin weights, then DUMPS JSON.
# The GLB is rebuilt by rebind_from_blender.mjs (the project's own writer), so the glTF structure — two body primitives with
# their `extras.role`, the SPLIT_LEGS mesh with its PACKED morph, materials and embedded textures — is preserved exactly.
# Blender is used only for what it is better at: real cross-section measurement and geodesic (bone-heat) weighting.
# Reads/writes ONLY under lab/assets/ and the given output paths. Never touches an Astra file.
#   blender --background --factory-startup --python rig_solve_blender.py -- --src <in.glb> --json <out.json> [--blend <rig.blend>]
import bpy, json, math, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(k, d=None):
    return argv[argv.index(k) + 1] if k in argv else d
SRC, JSONOUT, BLEND = arg('--src'), arg('--json'), arg('--blend')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
ARM = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
MESHES = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
for o in list(bpy.data.objects):
    if o is not ARM and o not in MESHES:
        bpy.data.objects.remove(o, do_unlink=True)
BODY = [o for o in MESHES if 'SPLIT_LEGS' not in o.name]
LEGS = [o for o in MESHES if 'SPLIT_LEGS' in o.name]
out = {'src': SRC, 'meshes': [(o.name, len(o.data.vertices)) for o in MESHES]}

def wpts(objs):
    r = []
    for o in objs:
        mw = o.matrix_world
        for v in o.data.vertices:
            r.append(mw @ v.co)
    return r
ALL = wpts(MESHES); MINZ = min(p.z for p in ALL); MAXZ = max(p.z for p in ALL); H = MAXZ - MINZ
def hh(p):
    return (p.z - MINZ) / H

def profile(points, lo, hi, bands):
    rows = []
    for b in range(bands):
        a = lo + (hi - lo) * b / bands; c = lo + (hi - lo) * (b + 1) / bands
        sel = [p for p in points if a <= hh(p) < c]
        if len(sel) < 5:
            rows.append((0.5 * (a + c), None, len(sel), None, None)); continue
        cx = sum(p.x for p in sel) / len(sel); cy = sum(p.y for p in sel) / len(sel)
        rows.append((0.5 * (a + c), sum(math.hypot(p.x - cx, p.y - cy) for p in sel) / len(sel), len(sel), cx, cy))
    return rows
def peak(rows, lo, hi):
    c = [r for r in rows if r[1] is not None and lo <= r[0] <= hi]; return max(c, key=lambda r: r[1]) if c else None
def valley(rows, lo, hi):
    c = [r for r in rows if r[1] is not None and lo <= r[0] <= hi]; return min(c, key=lambda r: r[1]) if c else None
def between(rows, a, b, m=0.012):
    if not a or not b: return None
    lo, hi = sorted([min(a[0], b[0]) + m, max(a[0], b[0]) - m]); return valley(rows, lo, hi)
def centre_at(points, h_t, half=0.018):
    sel = [p for p in points if abs(hh(p) - h_t) <= half] or [p for p in points if abs(hh(p) - h_t) <= half * 2.5]
    if not sel: return None
    return Vector((sum(p.x for p in sel) / len(sel), sum(p.y for p in sel) / len(sel), MINZ + h_t * H))

bodyP = wpts(BODY)
cb = [p for p in bodyP if 0.62 <= hh(p) <= 0.72]; chest_hw = sorted(abs(p.x) for p in cb)[int(len(cb) * 0.55)]
sb = [p for p in bodyP if 0.74 <= hh(p) <= 0.86]; sh_hw = max(abs(p.x) for p in sb)
ARM_THR = chest_hw * 1.05
M = {'H': H, 'chest_half_width': chest_hw, 'shoulder_half_width': sh_hw}
J = {'ROOT': Vector((0, 0, MINZ))}
nrows = profile([p for p in bodyP if abs(p.x) < chest_hw * 0.9], 0.78, 0.94, 16)
neck = valley(nrows, 0.82, 0.90); neck_h = neck[0] if neck else 0.87
J['NECK'] = Vector((0, 0, MINZ + neck_h * H)); J['HEAD'] = Vector((0, 0, MINZ + (neck_h + 0.06) * H)); M['neck_h'] = neck_h
for sign, sfx in ((-1, 'L'), (1, 'R')):
    ap = [p for p in bodyP if (p.x * sign) > ARM_THR and 0.30 <= hh(p) <= 0.92]
    rows = profile(ap, 0.30, 0.92, 26)
    delt = peak(rows, 0.70, 0.84); fore = peak(rows, 0.54, 0.64)
    elbow = between(rows, delt, fore) or valley(rows, 0.60, 0.68)
    handpk = peak(rows, 0.42, 0.50); wrist = between(rows, fore, handpk) or valley(rows, 0.50, 0.57)
    fing = valley(rows, 0.39, 0.45)
    dc = centre_at(ap, delt[0]) if delt else None
    J['CLAV_' + sfx] = Vector((sign * sh_hw * 0.30, 0, MINZ + ((delt[0] + 0.005) if delt else 0.78) * H))
    J['UPPERARM_' + sfx] = Vector((dc.x * 0.80, dc.y, MINZ + (delt[0] - 0.012) * H)) if dc else Vector((sign * sh_hw * 0.6, 0, MINZ + 0.77 * H))
    J['FOREARM_' + sfx] = centre_at(ap, elbow[0]) if elbow else Vector((sign * sh_hw * 0.72, 0, MINZ + 0.64 * H))
    J['HAND_' + sfx] = centre_at(ap, wrist[0]) if wrist else Vector((sign * sh_hw * 0.80, 0, MINZ + 0.53 * H))
    J['FINGERS_' + sfx] = centre_at(ap, fing[0]) if fing else Vector((sign * sh_hw * 0.78, 0, MINZ + 0.43 * H))
    M['arm_' + sfx] = {'deltoid_h': delt[0] if delt else None, 'elbow_h': elbow[0] if elbow else None,
                       'forearm_bulge_h': fore[0] if fore else None, 'wrist_h': wrist[0] if wrist else None, 'fingers_h': fing[0] if fing else None}
legP = wpts(LEGS) if LEGS else []
leg_top = max((hh(p) for p in legP), default=0.40)
for sign, sfx in ((-1, 'L'), (1, 'R')):
    lp = [p for p in legP if (p.x * sign) > 0.002]
    if len(lp) < 40:
        J['THIGH_' + sfx] = Vector((sign * 0.055, 0, MINZ + 0.39 * H)); J['SHIN_' + sfx] = Vector((sign * 0.055, 0, MINZ + 0.31 * H)); J['TIP_' + sfx] = Vector((sign * 0.055, 0, MINZ + 0.05 * H)); continue
    rows = profile(lp, 0.0, leg_top + 0.01, 22)
    hip_pk = peak(rows, leg_top - 0.06, leg_top + 0.01); calf = peak(rows, 0.12, 0.26)
    knee = between(rows, hip_pk, calf) or valley(rows, 0.27, 0.36)
    hipc = centre_at(lp, leg_top - 0.015, 0.02)
    J['THIGH_' + sfx] = Vector((hipc.x, hipc.y, MINZ + (leg_top - 0.01) * H)) if hipc else Vector((sign * 0.055, 0, MINZ + 0.39 * H))
    J['SHIN_' + sfx] = centre_at(lp, knee[0], 0.015) if knee else Vector((sign * 0.055, 0, MINZ + 0.31 * H))
    J['TIP_' + sfx] = centre_at(lp, 0.05, 0.03) or Vector((sign * 0.055, 0, MINZ + 0.05 * H))
    M['leg_' + sfx] = {'hip_h': leg_top, 'knee_h': knee[0] if knee else None, 'calf_bulge_h': calf[0] if calf else None}
hip_h = min(M.get('leg_L', {}).get('hip_h', 0.40), M.get('leg_R', {}).get('hip_h', 0.40))
J['PELVIS'] = Vector((0, 0, MINZ + (hip_h + 0.025) * H))
J['CHEST'] = Vector((0, 0, MINZ + ((M['arm_L']['deltoid_h'] or 0.78) - 0.10) * H))
J['SPINE'] = Vector((0, 0, (J['PELVIS'].z + J['CHEST'].z) * 0.5))
J['TAIL1'] = Vector((0, 0, MINZ + hip_h * 0.72 * H)); J['TAIL2'] = Vector((0, 0, MINZ + hip_h * 0.38 * H)); J['TAIL3'] = Vector((0, 0, MINZ + 0.028 * H))
for b in ARM.data.bones:
    if b.name in ('BROW_L', 'BROW_R', 'CHEEK_L', 'CHEEK_R', 'JAW'):
        J[b.name] = (ARM.matrix_world @ b.head_local).copy()
out['measurements'] = M
out['joints'] = {k: [v.x, v.y, v.z] for k, v in J.items()}
out['joints_h'] = {k: round((v.z - MINZ) / H, 4) for k, v in J.items()}

PARENT = {'PELVIS': 'ROOT', 'SPINE': 'PELVIS', 'CHEST': 'SPINE', 'NECK': 'CHEST', 'HEAD': 'NECK',
          'CLAV_L': 'CHEST', 'CLAV_R': 'CHEST', 'UPPERARM_L': 'CLAV_L', 'UPPERARM_R': 'CLAV_R',
          'FOREARM_L': 'UPPERARM_L', 'FOREARM_R': 'UPPERARM_R', 'HAND_L': 'FOREARM_L', 'HAND_R': 'FOREARM_R',
          'FINGERS_L': 'HAND_L', 'FINGERS_R': 'HAND_R', 'TAIL1': 'PELVIS', 'TAIL2': 'TAIL1', 'TAIL3': 'TAIL2',
          'THIGH_L': 'PELVIS', 'THIGH_R': 'PELVIS', 'SHIN_L': 'THIGH_L', 'SHIN_R': 'THIGH_R', 'TIP_L': 'SHIN_L', 'TIP_R': 'SHIN_R',
          'BROW_L': 'HEAD', 'BROW_R': 'HEAD', 'CHEEK_L': 'HEAD', 'CHEEK_R': 'HEAD', 'JAW': 'HEAD'}
TAILOF = {'ROOT': 'PELVIS', 'PELVIS': 'SPINE', 'SPINE': 'CHEST', 'CHEST': 'NECK', 'NECK': 'HEAD',
          'CLAV_L': 'UPPERARM_L', 'CLAV_R': 'UPPERARM_R', 'UPPERARM_L': 'FOREARM_L', 'UPPERARM_R': 'FOREARM_R',
          'FOREARM_L': 'HAND_L', 'FOREARM_R': 'HAND_R', 'HAND_L': 'FINGERS_L', 'HAND_R': 'FINGERS_R',
          'TAIL1': 'TAIL2', 'TAIL2': 'TAIL3', 'THIGH_L': 'SHIN_L', 'THIGH_R': 'SHIN_R', 'SHIN_L': 'TIP_L', 'SHIN_R': 'TIP_R'}
FACE = ('BROW_L', 'BROW_R', 'CHEEK_L', 'CHEEK_R', 'JAW'); FINGER = ('FINGERS_L', 'FINGERS_R')
bpy.context.view_layer.objects.active = ARM
bpy.ops.object.mode_set(mode='EDIT')
eb = ARM.data.edit_bones; inv = ARM.matrix_world.inverted()
for n, p in J.items():
    (eb.get(n) or eb.new(n)).head = inv @ p
for n in J:
    b = eb[n]; t = TAILOF.get(n)
    if t and t in J:
        b.tail = inv @ J[t]
    else:
        d = {'HEAD': Vector((0, 0, H * 0.10)), 'TAIL3': Vector((0, 0, -H * 0.03)), 'TIP_L': Vector((0, 0, -H * 0.03)), 'TIP_R': Vector((0, 0, -H * 0.03)),
             'FINGERS_L': Vector((0, 0, -H * 0.04)), 'FINGERS_R': Vector((0, 0, -H * 0.04)), 'JAW': Vector((0, -H * 0.03, 0))}.get(n, Vector((0, -H * 0.02, 0)) if n in FACE else Vector((0, 0, H * 0.05)))
        b.tail = (inv @ J[n]) + d
    if (b.tail - b.head).length < 1e-4:
        b.tail = b.head + Vector((0, 0, H * 0.02))
for n, par in PARENT.items():
    if n in eb and par in eb:
        eb[n].parent = eb[par]; eb[n].use_connect = False
for b in eb:
    b.use_deform = b.name not in ('ROOT',) + FACE + FINGER
bpy.ops.object.mode_set(mode='OBJECT')

wmode = {}
for o in MESHES:
    for vg in list(o.vertex_groups):
        o.vertex_groups.remove(vg)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); ARM.select_set(True); bpy.context.view_layer.objects.active = ARM
    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO'); wmode[o.name] = 'HEAT'
    except Exception as ex:
        bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE'); wmode[o.name] = 'ENVELOPE(%s)' % ex
    bpy.ops.object.select_all(action='DESELECT')
out['weight_mode'] = wmode

# ---- dump: per mesh, per vertex → world position + {bone: weight} (position is the join key for the GLB writer) ----
dump = {}
for o in MESHES:
    mw = o.matrix_world
    gname = {g.index: g.name for g in o.vertex_groups}
    rows = []
    for i, v in enumerate(o.data.vertices):
        p = mw @ v.co
        w = {}
        for g in v.groups:
            if g.weight > 0.0008:
                w[gname[g.group]] = round(g.weight, 5)
        rows.append([round(p.x, 6), round(p.y, 6), round(p.z, 6), w])
    dump[o.name] = rows
out['vertices'] = dump
out['bone_order'] = [b.name for b in ARM.data.bones]
out['parents'] = PARENT
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
open(JSONOUT, 'w', encoding='utf-8').write(json.dumps(out))
print('RIG_SOLVE_DONE ' + json.dumps({'weights': wmode, 'knee_h': out['joints_h']['SHIN_L'], 'elbow_h': out['joints_h']['FOREARM_L'],
                                      'shoulder_h': out['joints_h']['UPPERARM_L'], 'wrist_h': out['joints_h']['HAND_L'],
                                      'verts': {k: len(v) for k, v in dump.items()}}))
