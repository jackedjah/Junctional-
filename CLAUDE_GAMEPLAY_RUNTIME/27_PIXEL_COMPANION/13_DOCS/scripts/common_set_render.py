"""Render only the requested common set with the corrected existing armatures.

Authored front colors are bound to the source mesh in rest space. They deform
with that mesh, not rectangular sprite cuts. No arm bone is scaled for reach.
"""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector,Quaternion,Matrix
from bpy_extras.object_utils import world_to_camera_view

P=Path(__file__).resolve().parents[2]; char=sys.argv[-1]
quarter_only='--three-quarter-only' in sys.argv
OUT=P/'07_ANIMATION_SOURCE/COMMON_FINAL'/char; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(P/f'02_RIG/ROOT_CORRECTION/MAH_{char.upper()}_ROOT_CORRECTED.blend'))
scene=bpy.context.scene; camera=scene.camera
rig=next(o for o in scene.objects if o.type=='ARMATURE')
meshes=[o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>100]
root=bpy.data.objects.get('MAH_SPRITE_ROOT')
for b in rig.pose.bones: b.matrix_basis=Matrix.Identity(4)
root.rotation_euler=(0,0,0); root.location=(0,0,0)
bpy.context.view_layer.update()

def smoothstep(a,b,x):
    t=max(0,min(1,(x-a)/(b-a))); return t*t*(3-2*t)

if char=='male':
    # Refine placement/weights on the EXISTING 15-bone rig for its now-requested
    # arm poses. The original coarse bands included torso and hip vertices.
    bpy.context.view_layer.objects.active=rig; rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for side,sign in [('Left',-1),('Right',1)]:
        joints=[Vector((sign*.066,0,.757)),Vector((sign*.129,0,.752)),
                Vector((sign*.173,-.014,.591)),Vector((sign*.194,-.025,.434)),Vector((sign*.177,-.035,.35))]
        for i,name in enumerate(['Shoulder','UpperArm','LowerArm','Hand']):
            bone=rig.data.edit_bones[f'{side}_{name}']; bone.head=joints[i]; bone.tail=joints[i+1]
    bpy.ops.object.mode_set(mode='OBJECT')
    for obj in meshes:
        groups={g.name:g for g in obj.vertex_groups}
        for v in obj.data.vertices:
            p=obj.matrix_world@v.co; x=abs(p.x); z=p.z
            side='Left' if p.x<0 else 'Right'
            seam=.11 if z>.68 else .10 if z>.5 else .125
            gate=smoothstep(seam-.011,seam+.011,x) if .28<z<.825 else 0
            # The shoulder cap belongs to the arm; the clavicle/pec interior does not.
            if z>.735: gate=smoothstep(.090,.115,x)
            for g in list(v.groups): obj.vertex_groups[g.group].remove([v.index])
            body='UpperChest' if z>.70 else 'Chest' if z>.6 else 'Spine' if z>.50 else 'Hips' if z>.41 else 'LowerBody'
            if z>.82: body='Head' if z>.84 else 'Neck'; gate=0
            if 1-gate>0: groups[body].add([v.index],1-gate,'REPLACE')
            if gate:
                if z>.70:
                    shoulder=.25*smoothstep(.70,.77,z)
                    weights={'Shoulder':shoulder,'UpperArm':1-shoulder}
                elif z>.46:
                    upper=smoothstep(.568,.617,z)
                    weights={'UpperArm':upper,'LowerArm':1-upper}
                else:
                    fore=smoothstep(.415,.455,z)
                    weights={'LowerArm':fore,'Hand':1-fore}
                for part,w in weights.items():
                    if w: groups[f'{side}_{part}'].add([v.index],gate*w,'REPLACE')

for b in rig.pose.bones:
    b.matrix_basis=Matrix.Identity(4); b.ik_stretch=0; b.bone.inherit_scale='NONE'
    for c in list(b.constraints):
        if c.type=='STRETCH_TO': b.constraints.remove(c)
        elif c.type=='IK': c.use_stretch=False
for obj in meshes:
    for m in obj.modifiers:
        if m.type=='ARMATURE': m.use_deform_preserve_volume=True
bpy.context.view_layer.update()

texture=bpy.data.images.load(str(P/f'05_PIXEL_MASTERS/COMMON_FINAL/{char}_projection_padded.png'),check_existing=False)
texture.pack()
mat=bpy.data.materials.new('COMMON_LOCKED_PIXEL_SURFACE'); mat.use_nodes=True
n=mat.node_tree.nodes; n.clear()
tex=n.new('ShaderNodeTexImage'); tex.image=texture; tex.interpolation='Closest'; tex.extension='EXTEND'
uv=n.new('ShaderNodeUVMap'); uv.uv_map='MAH_LOCKED_FRONT_PROJECTION'
em=n.new('ShaderNodeEmission'); em.inputs['Strength'].default_value=1
out=n.new('ShaderNodeOutputMaterial')
mat.node_tree.links.new(uv.outputs['UV'],tex.inputs['Vector'])
mat.node_tree.links.new(tex.outputs['Color'],em.inputs['Color'])
mat.node_tree.links.new(em.outputs[0],out.inputs['Surface'])
if quarter_only:
    # Front projection cannot describe newly exposed side surfaces. Shade those
    # from broad normal-driven bands, instead of stretching silhouette-edge rows.
    geo=n.new('ShaderNodeNewGeometry')
    light=n.new('ShaderNodeVectorMath'); light.operation='DOT_PRODUCT'
    light.inputs[1].default_value=Vector((-.6,-.7,1)).normalized()
    mat.node_tree.links.new(geo.outputs['Normal'],light.inputs[0])
    scale=n.new('ShaderNodeMath'); scale.operation='MULTIPLY_ADD'; scale.inputs[1].default_value=.5; scale.inputs[2].default_value=.5
    mat.node_tree.links.new(light.outputs['Value'],scale.inputs[0])
    def ramp(colors):
        r=n.new('ShaderNodeValToRGB'); r.color_ramp.interpolation='CONSTANT'
        for e in list(r.color_ramp.elements)[1:]: r.color_ramp.elements.remove(e)
        for i,(pos,color) in enumerate(colors):
            e=r.color_ramp.elements[0] if i==0 else r.color_ramp.elements.new(pos)
            e.position=pos
            # shader colors are linear; the palette constants are display sRGB.
            e.color=tuple((v/255/12.92 if v/255<=.04045 else ((v/255+.055)/1.055)**2.4) for v in color)+(1,)
        mat.node_tree.links.new(scale.outputs[0],r.inputs['Fac']); return r
    blue=ramp([(0,(3,7,14)),(.35,(7,35,76)),(.55,(12,79,151)),(.78,(24,150,232))])
    gray=ramp([(0,(3,7,14)),(.4,(29,38,54)),(.65,(108,127,154)),(.86,(185,205,231))])
    attr=n.new('ShaderNodeVertexColor'); attr.layer_name='MAH_PROJECTION_COVERAGE'
    separate=n.new('ShaderNodeSeparateColor'); mat.node_tree.links.new(attr.outputs['Color'],separate.inputs[0])
    material_mix=n.new('ShaderNodeMixRGB'); mat.node_tree.links.new(separate.outputs['Green'],material_mix.inputs[0])
    mat.node_tree.links.new(blue.outputs['Color'],material_mix.inputs[1]); mat.node_tree.links.new(gray.outputs['Color'],material_mix.inputs[2])
    front_mix=n.new('ShaderNodeMixRGB'); mat.node_tree.links.new(separate.outputs['Red'],front_mix.inputs[0])
    mat.node_tree.links.new(material_mix.outputs[0],front_mix.inputs[1]); mat.node_tree.links.new(tex.outputs['Color'],front_mix.inputs[2])
    mat.node_tree.links.new(front_mix.outputs[0],em.inputs['Color'])
for obj in meshes:
    uv_layer=obj.data.uv_layers.get(uv.uv_map) or obj.data.uv_layers.new(name=uv.uv_map)
    projected=[]
    for v in obj.data.vertices:
        co=world_to_camera_view(scene,camera,obj.matrix_world@v.co); projected.append((co.x,co.y))
    for loop in obj.data.loops: uv_layer.data[loop.index].uv=projected[loop.vertex_index]
    if quarter_only:
        colors=obj.data.color_attributes.new(name='MAH_PROJECTION_COVERAGE',type='FLOAT_COLOR',domain='POINT')
        for v in obj.data.vertices:
            facing=-((obj.matrix_world.to_3x3()@v.normal).normalized().y)
            coverage=smoothstep(.35,.8,facing)
            z=(obj.matrix_world@v.co).z
            colors.data[v.index].color=(coverage,1.0 if z>.78 else 0,0,1)
    for slot in obj.material_slots: slot.material=mat

scene.render.resolution_x=768; scene.render.resolution_y=768
scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'; scene.view_settings.look='None'; scene.view_settings.exposure=0
scene.render.film_transparent=True
head=rig.pose.bones['Head']
distance=(Vector((0,0,.49))-camera.location).length
marker=camera.matrix_world@Vector((0,(.5-34/256)*camera.data.ortho_scale,-distance))
marker_local=(rig.matrix_world@head.matrix).inverted()@marker
neutral_marker=world_to_camera_view(scene,camera,marker)

NAMES={
 'female':{'L':['L_Clavicle','L_Upperarm','L_Forearm','L_Hand'],'R':['R_Clavicle','R_Upperarm','R_Forearm','R_Hand'],'chest':'Spine02'},
 'male':{'L':['Right_Shoulder','Right_UpperArm','Right_LowerArm','Right_Hand'],'R':['Left_Shoulder','Left_UpperArm','Left_LowerArm','Left_Hand'],'chest':'UpperChest'}
}[char]

def rotate(name,angle,axis=(0,1,0)):
    b=rig.pose.bones[name]; local=b.bone.matrix_local.to_3x3().inverted()@Vector(axis)
    b.rotation_mode='QUATERNION'; b.rotation_quaternion=Quaternion(local,math.radians(angle))

def aim(name,direction,factor):
    b=rig.pose.bones[name]
    q=(b.tail-b.head).rotation_difference(Vector(direction).normalized())
    q=Quaternion((1,0,0,0)).slerp(q,factor)
    b.matrix=Matrix.Translation(b.head)@q.to_matrix().to_4x4()@Matrix.Translation(-b.head)@b.matrix
    b.scale=(1,1,1); bpy.context.view_layer.update()

def arms(side,a,b,clav=0,wrist=0):
    names=NAMES[side]
    rotate(names[0],clav); rotate(names[1],a); rotate(names[2],b); rotate(names[3],wrist)

def lengths():
    values={}
    for side in ['L','R']:
        shoulder,upper,fore,hand=NAMES[side]
        points=[rig.matrix_world@rig.pose.bones[name].head for name in [upper,fore,hand]]
        values[side]=[(points[1]-points[0]).length,(points[2]-points[1]).length,
            (rig.pose.bones[hand].tail-rig.pose.bones[hand].head).length]
    return values

def reset():
    root.rotation_euler=(0,0,0); root.location=(0,0,0)
    for b in rig.pose.bones: b.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()

reset(); baseline=lengths()

def set_pose(state,i,count):
    reset()
    phase=2*math.pi*i/max(count,1)
    envelope=math.sin(math.pi*i/max(1,count-1))**2
    if state=='front_3q_master': root.rotation_euler.z=math.radians(45)
    elif state in ['idle_neutral','idle_long']:
        amount=1 if state=='idle_neutral' else 1.35
        root.location.z=.0018*math.sin(phase)*amount
        root.location.x=.0008*math.sin(phase)*amount
        rotate(NAMES['chest'],.48*math.sin(phase)*amount,(1,0,0))
        rotate('Head',.7*math.sin(phase)*amount,(0,0,1))
    elif state in ['look_left','look_right']:
        sign=-1 if state=='look_left' else 1
        rotate('Head',sign*12*envelope,(0,0,1))
        rotate(NAMES['chest'],sign*1.5*envelope,(0,0,1))
    elif state=='think_loop':
        root.location.z=.0006*math.sin(phase)
        rotate('Head',-4*(.5-.5*math.cos(phase)),(0,1,0))
        rotate(NAMES['chest'],.7*math.sin(phase),(1,0,0))
    elif state=='point_right':
        arms('L',-68*envelope,-13*envelope,-4*envelope)
        bpy.context.view_layer.update()
        if char=='female':
            aim('L_Hand',(1,-.05,0),envelope)
            for k in [1,2,3]: aim(f'L_Index{k}',(1,-.05,.03),envelope)
            for finger in ['Mid','Ring','Pinky']:
                for k,direction in [(1,(.4,0,-1)),(2,(-1,0,-.2)),(3,(-.4,0,1))]:
                    aim(f'L_{finger}{k}',direction,envelope)
    elif state=='wave_greet':
        arms('L',-60*envelope,-82*envelope,-4*envelope,15*math.sin(phase*2)*envelope)
    elif state=='celebrate_small':
        for side,sign in [('L',-1),('R',1)]:
            arms(side,sign*68*envelope,sign*61*envelope,sign*5*envelope)
        root.location.z=.002*envelope
    bpy.context.view_layer.update()

SPECS={
 'front_master':([1000],True),'front_3q_master':([1000],True),
 'idle_neutral':([400]*8,True),'idle_long':([450]*12,True),
 'look_left':([100,100,120,600,120,100,160],False),
 'look_right':([100,100,120,600,120,100,160],False),
 'think_loop':([230]*8,True),
 'point_right':([100,90,90,100,650,100,90,90,180],False),
 'wave_greet':([100,90,90,90,100,100,100,100,90,90,90,170],False),
 'celebrate_small':([100,90,90,100,300,100,90,90,180],False),
}
report={'character':char,'states':{},'audit':{'max_segment_relative_error':0,'bone_scale_unit':True,
    'ik_stretch':0,'stretch_to_constraints':0,'pose_method':'rotation-only FK on existing corrected rig'}}
if quarter_only:
    report=json.loads((OUT/'render_manifest.json').read_text())
    SPECS={'front_3q_master':SPECS['front_3q_master']}
for state,(durations,loop) in SPECS.items():
    frames=[]; folder=OUT/state; folder.mkdir(exist_ok=True)
    for i in range(len(durations)):
        set_pose(state,i,len(durations))
        measure=lengths()
        error=max(abs(measure[s][j]/baseline[s][j]-1) for s in ['L','R'] for j in range(3))
        assert error<2e-5,(state,i,error)
        assert all(abs(v-1)<1e-5 for b in rig.pose.bones for v in b.scale)
        report['audit']['max_segment_relative_error']=max(report['audit']['max_segment_relative_error'],error)
        path=folder/f'frame_{i:03d}.png'; scene.render.filepath=str(path)
        bpy.ops.render.render(write_still=True)
        co=world_to_camera_view(scene,camera,rig.matrix_world@head.matrix@marker_local)
        frames.append({'file':str(path.relative_to(OUT)).replace('\\','/'),
            'head_offset':[(co.x-neutral_marker.x)*256,-(co.y-neutral_marker.y)*256],
            'arm_segment_relative_error':error})
    report['states'][state]={'frames':frames,'durationsMs':durations,'loop':loop}
    print('COMMON_SET_FINISHED_STATE',char,state,flush=True)
reset()
derived=P/f'02_RIG/COMMON_FINAL/MAH_{char.upper()}_COMMON_MASTER.blend'; derived.parent.mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(derived))
(OUT/'render_manifest.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report['audit']))
