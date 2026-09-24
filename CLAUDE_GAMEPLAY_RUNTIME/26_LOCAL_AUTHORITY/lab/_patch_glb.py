"""GlbCharacter.js: per-figure materials + one shader hook (blink / muscle tension / seam light / body aura) + muscle + seam API."""
import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'GlbCharacter.js')
s = open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)

old_blink = s[s.index("  function blinkify(mt) {"):s.index("\n", s.index("  function blinkify(mt) {"))]
new_hook = r"""  /* ONE shader hook per figure material (the source PBR material stays authentic; these are runtime uniforms only):
       uBlink      lids over the K3 iris glow (emissive fades, mask region darkens to skin) — never a geometry squash
       uMuscle[16] MUSCLE LAYER 3: per-group tension 0..1 read through the `_muscle` vertex attribute (group id baked by make_class_rig_v4):
                   normal-map strength rises (striations read) and roughness drops (tensed skin tightens) on that muscle only
       uSeam       TRANSFORMATION: energy tracing the fusion seam itself — the split line is x = 0 of the bind mesh below the crotch, so the
                   glow is a function of |position.x| on the fused lower body (no ring, no separate geometry)
       uAura       restrained body aura: a fresnel rim on the character's own surface (connected to the body, never a hoop) */
  function hook(mt, opts) { if (!mt || mt.__mwHooked) return; mt.__mwHooked = true; var U = { uBlink: { value: 0 }, uMuscle: { value: new Float32Array(16) }, uSeam: { value: 0 }, uAura: { value: 0 }, uSeamTop: { value: opts && opts.seamTop !== undefined ? opts.seamTop : 0.43 }, uSeamColor: { value: new THREE.Color(0x9fe8ff) }, uAuraColor: { value: new THREE.Color(0x66ccff) } }; mt.userData.mw = U; mt.userData.uBlink = U.uBlink;
    mt.onBeforeCompile = function (shader) { Object.keys(U).forEach(function (k) { shader.uniforms[k] = U[k]; });
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float _muscle;\nuniform float uMuscle[16];\nuniform float uSeamTop;\nvarying float vMuscleT;\nvarying float vSeamLine;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vMuscleT = uMuscle[int(clamp(_muscle + 0.5, 0.0, 15.0))];\n  vSeamLine = (1.0 - smoothstep(0.004, 0.022, abs(position.x))) * (1.0 - smoothstep(uSeamTop - 0.02, uSeamTop + 0.02, position.y));');
      var nfm = THREE.ShaderChunk.normal_fragment_maps.replace(/normalScale/g, '(normalScale * (1.0 + 0.9 * vMuscleT))');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uBlink;\nuniform float uSeam;\nuniform float uAura;\nuniform vec3 uSeamColor;\nuniform vec3 uAuraColor;\nvarying float vMuscleT;\nvarying float vSeamLine;')
        .replace('#include <normal_fragment_maps>', nfm)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = clamp(roughnessFactor - 0.22 * vMuscleT, 0.04, 1.0);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_EMISSIVEMAP\n  float mwEyeMask = clamp(max(emissiveColor.r, max(emissiveColor.g, emissiveColor.b)) * 2.0, 0.0, 1.0);\n  totalEmissiveRadiance *= (1.0 - uBlink * 0.97);\n  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.45, uBlink * mwEyeMask);\n#endif\n  { float mwFres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.6); totalEmissiveRadiance += uAuraColor * (uAura * (0.55 * mwFres + 0.05)); totalEmissiveRadiance += uSeamColor * (uSeam * vSeamLine * 2.4); }'); };
    mt.customProgramCacheKey = function () { return 'mahworld_body_hook_v1'; }; mt.needsUpdate = true; }
  function blinkify(mt) { hook(mt); }"""
s = s.replace(old_blink, new_hook)

# per-figure material clones (SkeletonUtils.clone shares materials → uniforms would be shared by every instance of the class)
rep("ml.forEach(function (mt) { if (mt) { mt.side = THREE.FrontSide; mt.roughness = mt.roughness === undefined ? 0.5 : mt.roughness; if (mt.emissiveMap) blinkify(mt); if (mats.indexOf(mt) < 0) mats.push(mt); } }); mat = mat || ml[0]; }",
    "var replaced = ml.map(function (mt) { if (!mt) return mt; var own = matClones.get(mt); if (!own) { own = mt.clone(); own.userData = {}; own.side = THREE.FrontSide; own.roughness = mt.roughness === undefined ? 0.5 : mt.roughness; hook(own, { seamTop: seamTopOf(base) }); matClones.set(mt, own); } if (mats.indexOf(own) < 0) mats.push(own); return own; }); m.material = Array.isArray(m.material) ? replaced : replaced[0]; mat = mat || replaced[0]; }")
rep("var mat = null; var bones = {}; var skinnedMesh = null; var lowerPrim = null; var legsMesh = null; var mats = [];",
    "var mat = null; var bones = {}; var skinnedMesh = null; var lowerPrim = null; var legsMesh = null; var mats = []; var matClones = new Map();")
# seam top helper (bind-space y of the crotch) + muscle API
rep("  function blinkify(mt) { hook(mt); }",
    "  function blinkify(mt) { hook(mt); }\n  function seamTopOf(base) { return base && base.seamTop !== undefined ? base.seamTop : (manifest.split && manifest.split.crotch_h !== undefined && manifest.source_height_units ? manifest.split.crotch_h * manifest.source_height_units + 0.02 : 0.43); }")
rep("setBlink: function (b) { var v = Math.max(0, Math.min(1, b || 0)); for (var i = 0; i < mats.length; i++) { if (mats[i].userData && mats[i].userData.uBlink) mats[i].userData.uBlink.value = v; } },",
    """setBlink: function (b) { var v = Math.max(0, Math.min(1, b || 0)); for (var i = 0; i < mats.length; i++) { if (mats[i].userData && mats[i].userData.uBlink) mats[i].userData.uBlink.value = v; } },
          /* transformation energy: seam 0..1 lights the fusion line on the body, aura 0..1 is the rim glow (both presentation only) */
          setSeam: function (seam, aura) { for (var i = 0; i < mats.length; i++) { var U = mats[i].userData && mats[i].userData.mw; if (U) { U.uSeam.value = Math.max(0, Math.min(1.5, seam || 0)); U.uAura.value = Math.max(0, Math.min(1.5, aura || 0)); } } },
          /* MUSCLE LAYER 2 + 3: name (BICEPS_L, DELTOID_R, PEC_L, LAT_R, TRAP, ABS, ...) → morph influence on both body primitives + tension uniform for the group */
          muscleNames: muscleNames, muscleGroups: muscleGroups,
          setMuscle: function (name, v) { var idx = muscleIndex[name]; if (idx === undefined) return false; var val = Math.max(0, Math.min(1.2, v || 0)); muscleMeshes.forEach(function (mm) { if (mm.morphTargetInfluences) mm.morphTargetInfluences[idx] = val; }); var grp = muscleGroups[name]; if (grp !== undefined) for (var i = 0; i < mats.length; i++) { var U = mats[i].userData && mats[i].userData.mw; if (U) U.uMuscle.value[grp] = Math.min(1, val); } return true; },
          getMuscle: function (name) { var idx = muscleIndex[name]; if (idx === undefined || !muscleMeshes.length || !muscleMeshes[0].morphTargetInfluences) return 0; return muscleMeshes[0].morphTargetInfluences[idx] || 0; },""")
# collect the muscle meshes/dictionary after packedIdx setup
rep("g.add(body); var h = base.size.y * scale;",
    "var muscleMeshes = [], muscleIndex = {}, muscleNames = [], muscleGroups = {}; body.traverse(function (m) { if (m.isSkinnedMesh && m !== legsMesh && m.morphTargetDictionary) { muscleMeshes.push(m); Object.keys(m.morphTargetDictionary).forEach(function (k) { if (muscleIndex[k] === undefined) { muscleIndex[k] = m.morphTargetDictionary[k]; muscleNames.push(k); } }); } }); (manifest.muscles || []).forEach(function (mu) { if (muscleIndex[mu.name] !== undefined) muscleGroups[mu.name] = mu.group; });\n        g.add(body); var h = base.size.y * scale;")
rep("split_legs: !!legsMesh, packed_morph: !!(legsMesh && legsMesh.morphTargetInfluences), morphs: base.morphs > 0,",
    "split_legs: !!legsMesh, packed_morph: !!(legsMesh && legsMesh.morphTargetInfluences), morphs: base.morphs > 0, muscles: muscleNames.length,")
open(p, 'w', encoding='utf-8').write(s); print('patched GlbCharacter.js')
