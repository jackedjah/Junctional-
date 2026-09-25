"""Deterministic Blender authoring stage for the MAHFITT pixel companion gate.

Usage (Blender 5.2+):
  blender --background --python blender_pipeline.py -- \
    --source <character.glb> --character female|male --project-root <dir>

The script never edits the input GLB.  It imports into a derived .blend, installs
one orthographic camera/lighting rig, records model/rig/material facts, and
renders lit plus source-albedo passes for the directional, idle, and turn proofs.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


DIRECTIONS = [
    ("front", 0.0),
    ("front_3q_a", 45.0),
    ("side_a", 90.0),
    ("rear_3q_a", 135.0),
    ("back", 180.0),
    ("rear_3q_b", 225.0),
    ("side_b", 270.0),
    ("front_3q_b", 315.0),
]


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True)
    p.add_argument("--character", choices=("female", "male"), required=True)
    p.add_argument("--project-root", required=True)
    p.add_argument("--sequences", default="directional,idle,turn,master")
    p.add_argument("--render-resolution", type=int, default=640)
    p.add_argument("--raw-pass", default="")
    p.add_argument("--views", default=",".join(label for label, _ in DIRECTIONS))
    p.add_argument("--static-only", action="store_true")
    return p.parse_args(argv)


def clean_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.armatures,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.materials,
    ):
        # Imported data is rebuilt from the untouched GLB for each character.
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def imported_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners: list[Vector] = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            corners.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        finally:
            evaluated.to_mesh_clear()
    if not corners:
        raise RuntimeError("GLB contains no renderable mesh bounds")
    return (
        Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners))),
        Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners))),
    )


def build_sprite_rig(meshes: list[bpy.types.Object], bounds_min: Vector, bounds_max: Vector) -> bpy.types.Object:
    """Create a compact non-destructive rig for an unrigged fused-body source.

    The authored mesh remains unchanged.  Blender's bone-heat binding is applied
    only inside the derived working master.  Bone placement follows the actual
    source bounds and deliberately retains the fused crystalline lower body.
    """
    center = (bounds_min + bounds_max) * 0.5
    size = bounds_max - bounds_min
    h = size.z
    w = size.x
    y = center.y

    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    armature = bpy.context.object
    armature.name = "MAH_SPRITE_ARMATURE"
    armature.data.name = "MAH_SPRITE_ARMATURE_DATA"
    for existing in list(armature.data.edit_bones):
        armature.data.edit_bones.remove(existing)

    def point(xf: float, zf: float) -> Vector:
        return Vector((center.x + w * xf, y, bounds_min.z + h * zf))

    def add(name: str, head: Vector, tail: Vector, parent=None, connected=False):
        bone = armature.data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.parent = parent
        bone.use_connect = bool(parent and connected)
        return bone

    lower = add("LowerBody", point(0.0, 0.03), point(0.0, 0.42))
    hips = add("Hips", point(0.0, 0.42), point(0.0, 0.50), lower, True)
    spine = add("Spine", point(0.0, 0.50), point(0.0, 0.62), hips, True)
    chest = add("Chest", point(0.0, 0.62), point(0.0, 0.70), spine, True)
    upper = add("UpperChest", point(0.0, 0.70), point(0.0, 0.77), chest, True)
    neck = add("Neck", point(0.0, 0.77), point(0.0, 0.82), upper, True)
    add("Head", point(0.0, 0.82), point(0.0, 0.96), neck, True)

    for side, sign in (("Left", -1.0), ("Right", 1.0)):
        shoulder = add(f"{side}_Shoulder", point(0.10 * sign, 0.75), point(0.23 * sign, 0.72), upper)
        upper_arm = add(f"{side}_UpperArm", point(0.23 * sign, 0.72), point(0.31 * sign, 0.60), shoulder, True)
        lower_arm = add(f"{side}_LowerArm", point(0.31 * sign, 0.60), point(0.34 * sign, 0.48), upper_arm, True)
        add(f"{side}_Hand", point(0.34 * sign, 0.48), point(0.34 * sign, 0.40), lower_arm, True)

    bpy.ops.object.mode_set(mode="OBJECT")
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    for mesh in meshes:
        mesh.select_set(True)
    try:
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
        armature["mah_binding_method"] = "automatic_bone_heat"
    except Exception as exc:
        # Envelope binding is a deterministic fallback for non-manifold meshes.
        for obj in bpy.context.selected_objects:
            obj.select_set(False)
        armature.select_set(True)
        bpy.context.view_layer.objects.active = armature
        for mesh in meshes:
            mesh.select_set(True)
        bpy.ops.object.parent_set(type="ARMATURE_ENVELOPE")
        armature["mah_binding_method"] = f"envelope_fallback: {exc}"
    bind_procedural_sprite_weights(meshes, armature, bounds_min, bounds_max)
    bpy.context.view_layer.update()
    return armature


def bind_procedural_sprite_weights(
    meshes: list[bpy.types.Object],
    armature: bpy.types.Object,
    bounds_min: Vector,
    bounds_max: Vector,
) -> None:
    """Install small, predictable region weights for the minimal mascot rig."""
    center = (bounds_min + bounds_max) * 0.5
    size = bounds_max - bounds_min
    names = [bone.name for bone in armature.data.bones if bone.use_deform]
    for obj in meshes:
        for group in list(obj.vertex_groups):
            obj.vertex_groups.remove(group)
        groups = {name: obj.vertex_groups.new(name=name) for name in names}
        modifier = next((m for m in obj.modifiers if m.type == "ARMATURE"), None)
        if modifier is None:
            modifier = obj.modifiers.new("MAH_SPRITE_DEFORM", "ARMATURE")
        modifier.object = armature
        obj.parent = armature

        for vertex in obj.data.vertices:
            world = obj.matrix_world @ vertex.co
            z = (world.z - bounds_min.z) / max(size.z, 1e-6)
            xn = abs(world.x - center.x) / max(size.x * 0.5, 1e-6)
            side = "Left" if world.x < center.x else "Right"
            weights: list[tuple[str, float]]
            if xn > 0.54 and 0.37 < z < 0.80:
                if z >= 0.68:
                    weights = [(f"{side}_Shoulder", 0.38), (f"{side}_UpperArm", 0.62)]
                elif z >= 0.54:
                    weights = [(f"{side}_UpperArm", 0.58), (f"{side}_LowerArm", 0.42)]
                elif z >= 0.45:
                    weights = [(f"{side}_LowerArm", 0.64), (f"{side}_Hand", 0.36)]
                else:
                    weights = [(f"{side}_Hand", 1.0)]
            elif z >= 0.82:
                weights = [("Head", 1.0)]
            elif z >= 0.76:
                weights = [("Neck", 0.45), ("Head", 0.55)]
            elif z >= 0.69:
                weights = [("UpperChest", 0.62), ("Chest", 0.38)]
            elif z >= 0.60:
                weights = [("Chest", 0.62), ("Spine", 0.38)]
            elif z >= 0.50:
                weights = [("Spine", 0.58), ("Hips", 0.42)]
            elif z >= 0.41:
                weights = [("Hips", 0.72), ("LowerBody", 0.28)]
            else:
                weights = [("LowerBody", 1.0)]
            for name, weight in weights:
                if name in groups:
                    groups[name].add([vertex.index], weight, "REPLACE")
    armature["mah_binding_method"] = "procedural_region_weights_v1"


def add_root(imported: list[bpy.types.Object]) -> bpy.types.Object:
    root = bpy.data.objects.new("MAH_SPRITE_ROOT", None)
    bpy.context.scene.collection.objects.link(root)
    imported_set = set(imported)
    for obj in imported:
        if obj.parent not in imported_set:
            world = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = world
    return root


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_light(name: str, location: Vector, target: Vector, energy: float, size: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)


def configure_scene(bounds_min: Vector, bounds_max: Vector, render_resolution: int = 640) -> dict:
    scene = bpy.context.scene
    size = bounds_max - bounds_min
    height = max(size.z, 0.001)
    width = max(size.x, size.y, 0.001)
    target = Vector(((bounds_min.x + bounds_max.x) * 0.5,
                     (bounds_min.y + bounds_max.y) * 0.5,
                     bounds_min.z + height * 0.53))

    camera_data = bpy.data.cameras.new("MAH_SPRITE_CAMERA")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max(height * 1.12, width * 1.28)
    camera = bpy.data.objects.new("MAH_SPRITE_CAMERA", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    distance = max(height, width) * 3.0
    camera.location = target + Vector((0.0, -distance, height * 0.095))
    look_at(camera, target)
    scene.camera = camera

    add_light(
        "MAH_KEY",
        target + Vector((-height * 1.6, -height * 1.7, height * 2.2)),
        target,
        1150.0,
        height * 1.35,
    )
    add_light(
        "MAH_FILL",
        target + Vector((height * 1.6, -height * 0.7, height * 0.7)),
        target,
        520.0,
        height * 1.8,
    )
    add_light(
        "MAH_RIM",
        target + Vector((height * 0.45, height * 1.8, height * 1.4)),
        target,
        900.0,
        height * 1.0,
    )

    # Blender 5.2 exposes the Eevee Next renderer under BLENDER_EEVEE.
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = render_resolution
    scene.render.resolution_y = render_resolution
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 30
    scene.render.use_file_extension = True
    if hasattr(scene.render, "use_high_quality_normals"):
        scene.render.use_high_quality_normals = True
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.15
    scene.world.color = (0.012, 0.016, 0.028)

    return {
        "projection": "ORTHOGRAPHIC",
        "render_resolution": [render_resolution, render_resolution],
        "native_target": 160,
        "camera_location": list(camera.location),
        "camera_target": list(target),
        "orthographic_scale": camera_data.ortho_scale,
        "bounds_min": list(bounds_min),
        "bounds_max": list(bounds_max),
        "model_size": list(size),
        "elevation_fraction_of_height": 0.095,
        "front_camera_axis": "-Y looking +Y",
        "rotation_axis": "+Z",
    }


def tune_source_materials(meshes: list[bpy.types.Object]) -> None:
    seen: set[bpy.types.Material] = set()
    for obj in meshes:
        for slot in obj.material_slots:
            mat = slot.material
            if mat is None or mat in seen:
                continue
            seen.add(mat)
            mat.surface_render_method = "DITHERED"
            if not mat.use_nodes:
                continue
            for node in mat.node_tree.nodes:
                if node.type == "TEX_IMAGE":
                    node.interpolation = "Closest"
                if node.type == "BSDF_PRINCIPLED":
                    if "Roughness" in node.inputs:
                        node.inputs["Roughness"].default_value = 0.42
                    if "Metallic" in node.inputs:
                        node.inputs["Metallic"].default_value = min(
                            0.72, max(0.12, node.inputs["Metallic"].default_value)
                        )


def inspect(imported: list[bpy.types.Object], source: Path, character: str) -> dict:
    meshes = [o for o in imported if o.type == "MESH"]
    armatures = [o for o in imported if o.type == "ARMATURE"]
    materials = []
    for obj in meshes:
        for slot in obj.material_slots:
            if slot.material and slot.material.name not in materials:
                materials.append(slot.material.name)
    image_info = []
    for image in bpy.data.images:
        image_info.append({
            "name": image.name,
            "size": [int(image.size[0]), int(image.size[1])],
            "source": image.source,
            "packed": bool(image.packed_file),
        })
    mesh_info = []
    for obj in meshes:
        mesh_info.append({
            "name": obj.name,
            "vertices": len(obj.data.vertices),
            "edges": len(obj.data.edges),
            "polygons": len(obj.data.polygons),
            "material_slots": [s.material.name if s.material else None for s in obj.material_slots],
            "shape_keys": [k.name for k in obj.data.shape_keys.key_blocks] if obj.data.shape_keys else [],
            "vertex_groups": len(obj.vertex_groups),
        })
    armature_info = []
    for obj in armatures:
        armature_info.append({
            "name": obj.name,
            "bone_count": len(obj.data.bones),
            "bones": [b.name for b in obj.data.bones],
            "pose_bones": [b.name for b in obj.pose.bones],
        })
    return {
        "character": character,
        "source_file": str(source),
        "source_bytes": source.stat().st_size,
        "object_count": len(imported),
        "object_types": {kind: sum(1 for o in imported if o.type == kind) for kind in sorted({o.type for o in imported})},
        "meshes": mesh_info,
        "armatures": armature_info,
        "materials": materials,
        "images": image_info,
        "actions_on_import": [a.name for a in bpy.data.actions],
        "animation_clips_on_import": len(bpy.data.actions),
        "has_skin_weights": any(len(o.vertex_groups) > 0 for o in meshes),
        "has_shape_keys": any(o.data.shape_keys is not None for o in meshes),
        "separate_meshes": len(meshes),
        "separate_materials": len(materials),
        "authoring_note": "Imported into a derived Blender scene; untouched GLB remains in 00_SOURCE_UNTOUCHED.",
    }


def set_pose_neutral(armature: bpy.types.Object | None) -> None:
    if armature is None:
        return
    for bone in armature.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)


def set_idle_pose(armature: bpy.types.Object | None, index: int, count: int, model_height: float) -> None:
    if armature is None:
        return
    set_pose_neutral(armature)
    phase = 2.0 * math.pi * index / count
    breath = math.sin(phase)
    sway = math.sin(phase + math.pi * 0.5)

    def bone(name: str):
        return armature.pose.bones.get(name)

    chest = bone("Chest")
    upper = bone("UpperChest")
    head = bone("Head")
    hips = bone("Hips")
    left_shoulder = bone("Left_Shoulder")
    right_shoulder = bone("Right_Shoulder")
    if chest:
        chest.rotation_mode = "XYZ"
        chest.rotation_euler.x = math.radians(0.85) * breath
    if upper:
        upper.scale.z = 1.0 + 0.009 * (breath + 1.0) * 0.5
        upper.rotation_mode = "XYZ"
        upper.rotation_euler.y = math.radians(0.4) * sway
    if head:
        head.rotation_mode = "XYZ"
        head.rotation_euler.z = math.radians(0.8) * sway
        head.rotation_euler.x = math.radians(0.45) * breath
    if hips:
        hips.rotation_mode = "XYZ"
        hips.rotation_euler.z = math.radians(0.35) * -sway
    if left_shoulder:
        left_shoulder.rotation_mode = "XYZ"
        left_shoulder.rotation_euler.y = math.radians(0.35) * breath
    if right_shoulder:
        right_shoulder.rotation_mode = "XYZ"
        right_shoulder.rotation_euler.y = math.radians(-0.35) * breath

    # Blink proof: the source has eye bones but no eyelid shape keys.  A brief,
    # tiny eye-bone vertical compression is used on one held frame.
    if index == count - 2:
        for eye_name in ("Left_Eye", "Right_Eye"):
            eye = bone(eye_name)
            if eye:
                eye.scale.z = 0.18


def render_to(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def source_image_for_material(mat: bpy.types.Material):
    if not mat or not mat.use_nodes:
        return None
    principled = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if principled and "Base Color" in principled.inputs:
        link = next(iter(principled.inputs["Base Color"].links), None)
        if link and link.from_node.type == "TEX_IMAGE":
            return link.from_node.image
    return next((n.image for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)


def install_albedo_materials(meshes: list[bpy.types.Object]) -> list[tuple[bpy.types.MaterialSlot, bpy.types.Material]]:
    restored: list[tuple[bpy.types.MaterialSlot, bpy.types.Material]] = []
    cache: dict[bpy.types.Material, bpy.types.Material] = {}
    for obj in meshes:
        for slot in obj.material_slots:
            original = slot.material
            if original is None:
                continue
            restored.append((slot, original))
            if original not in cache:
                mat = bpy.data.materials.new(name=f"{original.name}_SOURCE_ALBEDO_PASS")
                mat.use_nodes = True
                nodes = mat.node_tree.nodes
                nodes.clear()
                out = nodes.new("ShaderNodeOutputMaterial")
                emission = nodes.new("ShaderNodeEmission")
                image = source_image_for_material(original)
                if image:
                    tex = nodes.new("ShaderNodeTexImage")
                    tex.image = image
                    tex.interpolation = "Closest"
                    mat.node_tree.links.new(tex.outputs["Color"], emission.inputs["Color"])
                    if "Alpha" in tex.outputs:
                        mat.node_tree.links.new(tex.outputs["Alpha"], emission.inputs["Strength"])
                else:
                    emission.inputs["Color"].default_value = original.diffuse_color
                emission.inputs["Strength"].default_value = 1.0
                mat.node_tree.links.new(emission.outputs["Emission"], out.inputs["Surface"])
                cache[original] = mat
            slot.material = cache[original]
    return restored


def restore_materials(restored: list[tuple[bpy.types.MaterialSlot, bpy.types.Material]]) -> None:
    for slot, original in restored:
        slot.material = original


def render_pair(base: Path, meshes: list[bpy.types.Object]) -> None:
    render_to(base / "lit" / f"{base.name}.png")
    restored = install_albedo_materials(meshes)
    try:
        old_look = bpy.context.scene.view_settings.look
        old_exposure = bpy.context.scene.view_settings.exposure
        bpy.context.scene.view_settings.look = "None"
        bpy.context.scene.view_settings.exposure = 0.0
        render_to(base / "albedo" / f"{base.name}.png")
        bpy.context.scene.view_settings.look = old_look
        bpy.context.scene.view_settings.exposure = old_exposure
    finally:
        restore_materials(restored)


def main() -> None:
    args = parse_args()
    project = Path(args.project_root).resolve()
    source = Path(args.source).resolve()
    character = args.character
    sequences = {name.strip() for name in args.sequences.split(",") if name.strip()}

    clean_scene()
    bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
    imported = [o for o in bpy.context.scene.objects]
    meshes = [o for o in imported if o.type == "MESH"]
    source_armatures = [o for o in imported if o.type == "ARMATURE"]
    source_had_skin_weights = any(len(o.vertex_groups) > 0 for o in meshes)
    source_bounds_min, source_bounds_max = imported_bounds(imported)
    armature = source_armatures[0] if source_armatures else None
    if armature is None:
        armature = build_sprite_rig(meshes, source_bounds_min, source_bounds_max)
        imported = [o for o in bpy.context.scene.objects]
    root = add_root(imported)
    bounds_min, bounds_max = imported_bounds(imported)
    model_height = (bounds_max - bounds_min).z
    tune_source_materials(meshes)
    camera_contract = configure_scene(bounds_min, bounds_max, args.render_resolution)
    report = inspect(imported, source, character)
    report["source_state_before_derivation"] = {
        "armature_count": len(source_armatures),
        "has_skin_weights": source_had_skin_weights,
        "animation_clips": 0,
        "shape_keys": any(o.data.shape_keys is not None for o in meshes),
    }
    report["camera_contract"] = camera_contract
    report["suitable_existing_rig"] = bool(source_armatures and len(source_armatures[0].data.bones) >= 20)
    report["rig_decision"] = "preserve_existing_skin_and_armature" if report["suitable_existing_rig"] else "created_non_destructive_sprite_production_rig"

    if not args.static_only:
        (project / "02_RIG").mkdir(parents=True, exist_ok=True)
        (project / "03_CAMERA_LIGHTING").mkdir(parents=True, exist_ok=True)
        (project / "02_RIG" / f"{character}_inspection.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        (project / "03_CAMERA_LIGHTING" / f"{character}_camera_contract.json").write_text(json.dumps(camera_contract, indent=2), encoding="utf-8")

    set_pose_neutral(armature)
    root.rotation_euler.z = 0.0
    bpy.context.view_layer.update()
    working = project / "01_3D_WORKING_MASTER" / f"MAH_{character.upper()}_WORKING_MASTER.blend"
    if not args.static_only:
        working.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(working), check_existing=False)

    raw_name = "RAW_RENDER" if not args.raw_pass else f"RAW_RENDER_{args.raw_pass}"
    raw = project / "07_ANIMATION_SOURCE" / raw_name / character

    if "directional" in sequences:
        requested_views = {name.strip() for name in args.views.split(",") if name.strip()}
        for label, angle in DIRECTIONS:
            if label not in requested_views:
                continue
            set_pose_neutral(armature)
            root.rotation_euler.z = math.radians(angle)
            bpy.context.view_layer.update()
            render_pair(raw / "directional" / label, meshes)

    idle_count = 8
    if "idle" in sequences:
        for i in range(idle_count):
            set_idle_pose(armature, i, idle_count, model_height)
            root.rotation_euler.z = math.radians(30.0)
            bpy.context.view_layer.update()
            render_pair(raw / "idle" / f"idle_{i:02d}", meshes)

    turn_count = 16
    if "turn" in sequences:
        set_pose_neutral(armature)
        for i in range(turn_count):
            root.rotation_euler.z = math.radians(i * 360.0 / turn_count)
            bpy.context.view_layer.update()
            render_pair(raw / "turn" / f"turn_{i:02d}", meshes)

    if "master" in sequences:
        set_pose_neutral(armature)
        root.rotation_euler.z = math.radians(30.0)
        bpy.context.view_layer.update()
        render_pair(raw / "master" / "front_3q_master", meshes)

    animation_recipe = {
        "character": character,
        "authoring_master": str(working),
        "rig": armature.name if armature else None,
        "idle": {
            "frames": idle_count,
            "camera_direction_degrees": 30,
            "articulation": ["Chest", "UpperChest", "Head", "Hips", "Left_Shoulder", "Right_Shoulder", "Left_Eye", "Right_Eye"],
            "note": "Procedural pose recipe is implemented by set_idle_pose in blender_pipeline.py.",
        },
        "turn": {
            "frames": turn_count,
            "rotation_degrees_per_frame": 22.5,
            "method": "true rigid rotation of the imported 3D character under a fixed orthographic camera and fixed world-space lights",
        },
    }
    if not args.static_only:
        (project / "07_ANIMATION_SOURCE" / f"{character}_animation_recipe.json").write_text(json.dumps(animation_recipe, indent=2), encoding="utf-8")

        bpy.ops.wm.save_as_mainfile(
            filepath=str(project / "07_ANIMATION_SOURCE" / f"MAH_{character.upper()}_ANIMATION_SOURCE.blend"),
            check_existing=False,
        )
    print(json.dumps({"status": "ok", "character": character, "report": str(project / "02_RIG" / f"{character}_inspection.json")}, indent=2))


if __name__ == "__main__":
    main()
