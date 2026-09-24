# MAHWORLD :: DERIVATIVE RIG REPAIR (Blender 4.5 headless, --background)
# Repairs the deformation foundation of a runtime derivative GLB (owner brief MAHWORLD_CLAUDE_RIG_MOTION_REPAIR §1):
#   * joints placed at the CENTRE of the real local cross-section, found as the narrowest section BETWEEN two bulges
#     (elbow between deltoid/biceps and forearm; knee between hip and calf) — never a percentage of height, never the
#     surface of the joint, never nearest-bone distance;
#   * consistent rest/bind data (the armature is rebuilt in edit mode, so Blender recomputes inverse binds on re-parent);
#   * heat-diffusion (geodesic) skin weights so influence follows the surface: an arm can no longer pull the ribs and one
#     thigh can no longer pull the other; then limited to the loader's 4 influences and normalised;
#   * face (BROW/CHEEK/JAW) and FINGERS influence re-applied locally out of HEAD/HAND afterwards;
#   * optional extra edge loop through the knee band so the bend has geometry to work with.
# Reads and writes ONLY under lab/assets/. Never opens an Astra file. Run:
#   blender --background --factory-startup --python repair_rig_blender.py -- --src <in.glb> --out <out.glb> [--blend f] [--report f]
import bpy, bmesh, json, math, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(k, d=None):
    return argv[argv.index(k) + 1] if k in argv else d
SRC, OUT = arg('--src'), arg('--out')
BLEND, REPORT = arg('--blend'), arg('--report')
KNEE_SUBDIV = arg('--knee-subdiv', '1') == '1'

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
ARM = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
MESHES = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
for o in list(bpy.data.objects):   # drop anything the importer/startup left behind that is not part of the character
    if o is not ARM and o not in MESHES:
        bpy.data.objects.remove(o, do_unlink=True)
BODY = [o for o in MESHES if 'SPLIT_LEGS' not in o.name]
LEGS = [o for o in MESHES if 'SPLIT_LEGS' in o.name]
report = {'src': SRC, 'meshes': [(o.name, len(o.data.vertices)) for o in MESHES]}

def world_pts(objs):
    out = []
    for o in objs:
        mw = o.matrix_world
        for v in o.data.vertices:
            out.append(mw @ v.co)
    return out
ALL = world_pts(MESHES)
MINZ = min(p.z for p in ALL); MAXZ = max(p.z for p in ALL); H = MAXZ - MINZ
def hh(p):
    return (p.z - MINZ) / H
report['height_units'] = round(H, 5)

def profile(points, lo, hi, bands):
    """[(h_mid, radius, count, cx, cy)] — radius = mean distance from the band's own centre (a real cross-section)."""
    rows = []
    for b in range(bands):
        a = lo + (hi - lo) * b / bands; c = lo + (hi - lo) * (b + 1) / bands
        sel = [p for p in points if a <= hh(p) < c]
        if len(sel) < 5:
            rows.append((0.5 * (a + c), None, len(sel), None, None)); continue
        cx = sum(p.x for p in sel) / len(sel); cy = sum(p.y for p in sel) / len(sel)
        r = sum(math.hypot(p.x - cx, p.y - cy) for p in sel) / len(sel)
        rows.append((0.5 * (a + c), r, len(sel), cx, cy))
    return rows

def peak(rows, lo, hi):
    c = [r for r in rows if r[1] is not None and lo <= r[0] <= hi]
    return max(c, key=lambda r: r[1]) if c else None

def valley(rows, lo, hi):
    c = [r for r in rows if r[1] is not None and lo <= r[0] <= hi]
    return min(c, key=lambda r: r[1]) if c else None

def joint_between(rows, upper_peak, lower_peak, margin=0.012):
    """the narrowest cross-section strictly between two bulges = the joint"""
    if not upper_peak or not lower_peak:
        return None
    lo, hi = sorted([lower_peak[0] + margin, upper_peak[0] - margin])
    return valley(rows, lo, hi)

def centre_at(points, h_target, half=0.018):
    sel = [p for p in points if abs(hh(p) - h_target) <= half]
    if len(sel) < 5:
        sel = [p for p in points if abs(hh(p) - h_target) <= half * 2.5]
    if not sel:
        return None
    return Vector((sum(p.x for p in sel) / len(sel), sum(p.y for p in sel) / len(sel), MINZ + h_target * H))

# ---------------- measured landmarks ----------------
bodyP = world_pts(BODY)
chest_band = [p for p in bodyP if 0.62 <= hh(p) <= 0.72]
chest_hw = sorted(abs(p.x) for p in chest_band)[int(len(chest_band) * 0.55)]
sh_band = [p for p in bodyP if 0.74 <= hh(p) <= 0.86]
sh_hw = max(abs(p.x) for p in sh_band)
ARM_THR = chest_hw * 1.05
M = {'chest_half_width': round(chest_hw, 4), 'shoulder_half_width': round(sh_hw, 4), 'arm_threshold_x': round(ARM_THR, 4)}

J = {}
J['ROOT'] = Vector((0, 0, MINZ))
# neck: narrowest slice of the central column between 0.80 and 0.92
neck_rows = profile([p for p in bodyP if abs(p.x) < chest_hw * 0.9], 0.78, 0.94, 16)
neck = valley(neck_rows, 0.82, 0.90)
neck_h = neck[0] if neck else 0.87
J['NECK'] = Vector((0, 0, MINZ + neck_h * H))
J['HEAD'] = Vector((0, 0, MINZ + (neck_h + 0.06) * H))
M['neck_h'] = round(neck_h, 4)

for sign, sfx in ((-1, 'L'), (1, 'R')):
    ap = [p for p in bodyP if (p.x * sign) > ARM_THR and 0.30 <= hh(p) <= 0.92]
    rows = profile(ap, 0.30, 0.92, 26)
    delt = peak(rows, 0.70, 0.84)                      # deltoid / shoulder mass
    fore = peak(rows, 0.54, 0.64)                      # forearm bulge
    elbow = joint_between(rows, delt, fore) or valley(rows, 0.60, 0.68)
    hand_pk = peak(rows, 0.42, 0.50)                   # hand mass
    wrist = joint_between(rows, fore, hand_pk) or valley(rows, 0.50, 0.57)
    fing = valley(rows, 0.39, 0.45)
    # shoulder joint sits INSIDE the humeral head under the deltoid: take the deltoid band centre and pull it inward
    dc = centre_at(ap, delt[0]) if delt else None
    sh = Vector((dc.x * 0.80, dc.y, MINZ + (delt[0] - 0.012) * H)) if dc else Vector((sign * sh_hw * 0.6, 0, MINZ + 0.77 * H))
    J['CLAV_' + sfx] = Vector((sign * sh_hw * 0.30, 0, MINZ + (delt[0] + 0.005 if delt else 0.78) * H))
    J['UPPERARM_' + sfx] = sh
    J['FOREARM_' + sfx] = centre_at(ap, elbow[0]) if elbow else Vector((sign * sh_hw * 0.72, 0, MINZ + 0.64 * H))
    J['HAND_' + sfx] = centre_at(ap, wrist[0]) if wrist else Vector((sign * sh_hw * 0.80, 0, MINZ + 0.53 * H))
    J['FINGERS_' + sfx] = centre_at(ap, fing[0]) if fing else Vector((sign * sh_hw * 0.78, 0, MINZ + 0.43 * H))
    M['arm_' + sfx] = {'deltoid_h': round(delt[0], 4) if delt else None, 'elbow_h': round(elbow[0], 4) if elbow else None,
                       'forearm_bulge_h': round(fore[0], 4) if fore else None, 'wrist_h': round(wrist[0], 4) if wrist else None,
                       'fingers_h': round(fing[0], 4) if fing else None,
                       'profile': [(round(r[0], 3), round(r[1], 4) if r[1] else None) for r in rows]}

legP = world_pts(LEGS) if LEGS else []
leg_top = max((hh(p) for p in legP), default=0.40)
for sign, sfx in ((-1, 'L'), (1, 'R')):
    lp = [p for p in legP if (p.x * sign) > 0.002]
    if len(lp) < 40:
        J['THIGH_' + sfx] = Vector((sign * 0.055, 0, MINZ + 0.40 * H)); J['SHIN_' + sfx] = Vector((sign * 0.055, 0, MINZ + 0.30 * H)); J['TIP_' + sfx] = Vector((sign * 0.055, 0, MINZ + 0.05 * H)); continue
    rows = profile(lp, 0.0, leg_top + 0.01, 22)
    hip_pk = peak(rows, leg_top - 0.06, leg_top + 0.01)     # widest at the hip end
    calf_pk = peak(rows, 0.12, 0.26)                        # calf / shin bulge
    knee = joint_between(rows, hip_pk, calf_pk) or valley(rows, 0.27, 0.36)
    tipc = centre_at(lp, 0.05, 0.03) or Vector((sign * 0.055, 0, MINZ + 0.05 * H))
    hipc = centre_at(lp, leg_top - 0.015, 0.02)
    J['THIGH_' + sfx] = Vector((hipc.x, hipc.y, MINZ + (leg_top - 0.01) * H)) if hipc else Vector((sign * 0.055, 0, MINZ + 0.39 * H))
    J['SHIN_' + sfx] = centre_at(lp, knee[0], 0.015) if knee else Vector((sign * 0.055, 0, MINZ + 0.31 * H))
    J['TIP_' + sfx] = tipc
    M['leg_' + sfx] = {'hip_h': round(leg_top, 4), 'knee_h': round(knee[0], 4) if knee else None,
                       'calf_bulge_h': round(calf_pk[0], 4) if calf_pk else None,
                       'profile': [(round(r[0], 3), round(r[1], 4) if r[1] else None) for r in rows]}

# spine chain: pelvis just above the hip line, chest under the shoulders, spine between
hip_h = min(M.get('leg_L', {}).get('hip_h', 0.40), M.get('leg_R', {}).get('hip_h', 0.40))
J['PELVIS'] = Vector((0, 0, MINZ + (hip_h + 0.025) * H))
J['CHEST'] = Vector((0, 0, MINZ + (M['arm_L']['deltoid_h'] - 0.10) * H))
J['SPINE'] = Vector((0, 0, (J['PELVIS'].z + J['CHEST'].z) * 0.5))
J['TAIL1'] = Vector((0, 0, MINZ + (hip_h * 0.72) * H))
J['TAIL2'] = Vector((0, 0, MINZ + (hip_h * 0.38) * H))
J['TAIL3'] = Vector((0, 0, MINZ + 0.028 * H))
for b in ARM.data.bones:                      # face bones are not the defect: keep their fitted positions
    if b.name in ('BROW_L', 'BROW_R', 'CHEEK_L', 'CHEEK_R', 'JAW'):
        J[b.name] = (ARM.matrix_world @ b.head_local).copy()
report['measurements'] = M
report['joints_h'] = {k: round((v.z - MINZ) / H, 4) for k, v in J.items()}
report['joints_xyz'] = {k: [round(v.x, 4), round(v.y, 4), round(v.z, 4)] for k, v in J.items()}

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
eb = ARM.data.edit_bones
inv = ARM.matrix_world.inverted()
for name, pos in J.items():
    (eb.get(name) or eb.new(name)).head = inv @ pos
for name in J:
    b = eb[name]
    t = TAILOF.get(name)
    if t and t in J:
        b.tail = inv @ J[t]
    else:
        d = {'HEAD': Vector((0, 0, H * 0.10)), 'TAIL3': Vector((0, 0, -H * 0.03)),
             'TIP_L': Vector((0, 0, -H * 0.03)), 'TIP_R': Vector((0, 0, -H * 0.03)),
             'FINGERS_L': Vector((0, 0, -H * 0.04)), 'FINGERS_R': Vector((0, 0, -H * 0.04)),
             'JAW': Vector((0, -H * 0.03, 0))}.get(name, Vector((0, -H * 0.02, 0)) if name in FACE else Vector((0, 0, H * 0.05)))
        b.tail = (inv @ J[name]) + d
    if (b.tail - b.head).length < 1e-4:
        b.tail = b.head + Vector((0, 0, H * 0.02))
for name, par in PARENT.items():
    if name in eb and par in eb:
        eb[name].parent = eb[par]; eb[name].use_connect = False
for b in eb:
    b.use_deform = b.name not in ('ROOT',) + FACE + FINGER
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------- extra edge loop through the corrected knee band ----------------
subdiv = {}
if KNEE_SUBDIV and LEGS:
    for o in LEGS:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='EDIT')
        bm = bmesh.from_edit_mesh(o.data); bm.verts.ensure_lookup_table()
        kz = [J['SHIN_L'].z, J['SHIN_R'].z]; band = H * 0.030; n = 0
        for v in bm.verts:
            wz = (o.matrix_world @ v.co).z
            v.select = any(abs(wz - z) < band for z in kz); n += 1 if v.select else 0
        for e in bm.edges:
            e.select = e.verts[0].select and e.verts[1].select
        bmesh.update_edit_mesh(o.data)
        if n > 8:
            try:
                bpy.ops.mesh.subdivide(number_cuts=1, smoothness=0); subdiv[o.name] = n
            except Exception as ex:
                subdiv[o.name] = 'failed %s' % ex
        bpy.ops.object.mode_set(mode='OBJECT')
report['knee_band_verts_subdivided'] = subdiv

# ---------------- heat-diffusion weights ----------------
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
report['weight_mode'] = wmode

def add_local(o, bone, centre, radius, source, share):
    vg = o.vertex_groups.get(bone) or o.vertex_groups.new(name=bone)
    src = o.vertex_groups.get(source)
    if not src:
        return 0
    n = 0; mw = o.matrix_world
    for i, v in enumerate(o.data.vertices):
        d = ((mw @ v.co) - centre).length
        if d > radius:
            continue
        try:
            w = next(g.weight for g in v.groups if g.group == src.index)
        except StopIteration:
            continue
        f = share * (1.0 - (d / radius) ** 2)
        if f <= 0.01 or w <= 0.01:
            continue
        vg.add([i], w * f, 'REPLACE'); src.add([i], w * (1 - f), 'REPLACE'); n += 1
    return n
ff = {}
for o in BODY:
    for bn in FACE + FINGER:
        if bn in J:
            src = 'HAND_L' if bn == 'FINGERS_L' else ('HAND_R' if bn == 'FINGERS_R' else 'HEAD')
            ff[bn] = add_local(o, bn, J[bn], H * (0.032 if bn in FINGER else 0.028), src, 0.7)
report['face_finger_weighted_verts'] = ff
for b in ARM.data.bones:
    if b.name in FACE + FINGER:
        b.use_deform = True

for o in MESHES:
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    try:
        bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    except Exception as ex:
        report.setdefault('cleanup_errors', []).append('%s %s' % (o.name, ex))

def reach(o, names):
    out = {}; mw = o.matrix_world
    for gn in names:
        g = o.vertex_groups.get(gn)
        if not g:
            continue
        xs = []
        for i, v in enumerate(o.data.vertices):
            try:
                w = next(gg.weight for gg in v.groups if gg.group == g.index)
            except StopIteration:
                continue
            if w > 0.08:
                xs.append((mw @ v.co).x)
        if xs:
            out[gn] = [round(min(xs), 3), round(max(xs), 3), len(xs)]
    return out
if BODY:
    report['influence_reach_body'] = reach(BODY[0], ['UPPERARM_L', 'UPPERARM_R', 'FOREARM_L', 'FOREARM_R', 'HAND_L', 'HAND_R'])
if LEGS:
    report['influence_reach_legs'] = reach(LEGS[0], ['THIGH_L', 'THIGH_R', 'SHIN_L', 'SHIN_R', 'TIP_L', 'TIP_R'])

if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_skins=True, export_morph=True,
                          export_image_format='JPEG', export_jpeg_quality=88, export_apply=False,
                          export_yup=True, export_animations=False)
report['out'] = OUT; report['out_bytes'] = os.path.getsize(OUT) if os.path.exists(OUT) else 0
if REPORT:
    open(REPORT, 'w', encoding='utf-8').write(json.dumps(report, indent=1, default=str))
print('RIG_REPAIR_DONE ' + json.dumps({'bytes': report['out_bytes'], 'weights': wmode, 'knee_h': report['joints_h'].get('SHIN_L'),
                                       'elbow_h': report['joints_h'].get('FOREARM_L'), 'shoulder_h': report['joints_h'].get('UPPERARM_L')}))
