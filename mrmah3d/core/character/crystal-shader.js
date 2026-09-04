/* MR.MAH 3D :: CRYSTAL SHADER
   Turns MeshStandardMaterial into a per-facet optical material.

   THE PROBLEM THIS SOLVES

   Adding polygons did not make a crystal. Every facet received the same
   roughness, the same metalness and the same base colour, so the body read as
   a polygon mosaic in a single hue no matter how many planes it had — "the
   facets are there but they look painted".

   A real cut stone behaves differently face to face. Light entering one facet
   may travel deep and come back with almost nothing; the neighbouring facet
   may bounce it straight off as a near-white specular; a third may pass it and
   go translucent. That variation is the material, and it cannot come from
   geometry alone.

   WHAT THIS DOES

   `forge.js` assigns every triangle an optical class at build time (weighted
   heavily toward black — see FACET_CLASSES there) and hands it over as the
   `aFacet` attribute. This module patches the standard material's shader to
   read it:

     aFacet.x   roughness offset  — dark faces are rougher and reflect less
     aFacet.y   metalness offset  — silver faces behave more like mirrors
     aFacet.z   darkness          — how much of the face's value is swallowed
     aFacet.w   cyan tint         — how much of the crystal's own hue it keeps

   It also adds a FRESNEL term. Standard PBR already includes Fresnel in its
   BRDF, but subtly; a crystal's whole read depends on it being obvious — faces
   square to the viewer let light IN and go dark, faces at grazing angles throw
   it back and go bright. That single relationship is what makes a solid look
   like it has an inside, and it costs a dot product.

   Cost: no extra draw calls, no render targets, one vec4 attribute. The
   cheapest possible route to the reference's optical range. */

import { Color } from '../../vendor/three/three.module.min.js';

export function applyCrystalShader(material, options) {
  var opts = options || {};
  var tintColor = new Color(opts.tint == null ? 0x2ea8d8 : opts.tint);
  var deepColor = new Color(opts.deep == null ? 0x04080d : opts.deep);

  material.defines = material.defines || {};
  material.defines.MRMAH_CRYSTAL = '';

  /* Uniforms live on the material so the animation states can drive them. */
  material.userData.crystal = {
    uFresnelPower: { value: opts.fresnelPower == null ? 2.6 : opts.fresnelPower },
    uFresnelBoost: { value: opts.fresnelBoost == null ? 1.35 : opts.fresnelBoost },
    uInnerDark: { value: opts.innerDark == null ? 0.72 : opts.innerDark },
    uTint: { value: tintColor },
    uDeep: { value: deepColor },
    uVariation: { value: opts.variation == null ? 1.0 : opts.variation }
  };

  material.onBeforeCompile = function (shader) {
    Object.keys(material.userData.crystal).forEach(function (k) {
      shader.uniforms[k] = material.userData.crystal[k];
    });

    /* ---- vertex: carry the facet class and the view vector through ------ */
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', [
        '#include <common>',
        'attribute vec4 aFacet;',
        'varying vec4 vFacet;'
      ].join('\n'))
      .replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vFacet = aFacet;'
      ].join('\n'));

    /* ---- fragment: modulate the material per facet ---------------------- */
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', [
        '#include <common>',
        'varying vec4 vFacet;',
        'uniform float uFresnelPower;',
        'uniform float uFresnelBoost;',
        'uniform float uInnerDark;',
        'uniform float uVariation;',
        'uniform vec3 uTint;',
        'uniform vec3 uDeep;'
      ].join('\n'))

      /* Base colour: pull each facet toward the deep interior colour by its
         darkness class, then restore only as much of the crystal's own hue as
         its tint class allows. This is what breaks "blue everywhere" — most
         faces end up charcoal or black and only a minority stay chromatic. */
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        '#ifdef MRMAH_CRYSTAL',
        '  float mrDark = clamp( vFacet.z * uVariation, -0.5, 1.0 );',
        /* The tinted end of the mix is no longer amplified. Multiplying the
           crystal's own colour by the cyan AND boosting it meant the chromatic
           class came out brighter than the silver class, so cyan won the value
           hierarchy as well as the hue — the opposite of the reference, where
           cyan is a mid-value accent and the bright end is white. */
        '  vec3 mrHue = mix( vec3( dot( diffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) ) ),',
        '                    diffuseColor.rgb * uTint * 0.95, clamp( vFacet.w, 0.0, 1.0 ) );',
        '  diffuseColor.rgb = mix( mrHue, uDeep, clamp( mrDark, 0.0, 1.0 ) );',
        /* The silver class carries a NEGATIVE darkness, and this line turns
           that into extra albedo — it is what makes a silver facet the
           brightest thing on the body after the face.

           It was briefly cut to 1.02 while chasing a pair of blown white
           patches on the shoulders. That turned out to be geometry (a capped
           tube end standing proud of the chest), not this, so the value is
           restored — with a little taken off the top, because at 1.6 combined
           with envMapIntensity 14 the brightest catches were sitting right on
           the clip point with nowhere left to roll off. */
        '  diffuseColor.rgb *= 1.0 + max( -mrDark, 0.0 ) * 1.38;',
        '#endif'
      ].join('\n'))

      /* Roughness and metalness per facet. A rough dark face kills its own
         reflection, which is how a plane "falls almost completely dark" next
         to one that glints. */
      .replace('#include <roughnessmap_fragment>', [
        '#include <roughnessmap_fragment>',
        '#ifdef MRMAH_CRYSTAL',
        '  roughnessFactor = clamp( roughnessFactor + vFacet.x * uVariation, 0.02, 1.0 );',
        '#endif'
      ].join('\n'))
      .replace('#include <metalnessmap_fragment>', [
        '#include <metalnessmap_fragment>',
        '#ifdef MRMAH_CRYSTAL',
        '  metalnessFactor = clamp( metalnessFactor + vFacet.y * uVariation, 0.0, 1.0 );',
        '#endif'
      ].join('\n'))

      /* Fresnel, applied after lighting.

         Facing the camera -> light goes IN -> the facet darkens toward the
         interior colour. Grazing -> light comes BACK -> the facet brightens.
         Amplified well past physical subtlety on purpose: this is the cue that
         makes the body read as something with an inside rather than a shell,
         and it is what puts the bright lip along every silhouette edge without
         drawing a single line there. */
      .replace('#include <opaque_fragment>', [
        '#ifdef MRMAH_CRYSTAL',
        '  {',
        /* three's own varyings, in the SAME space.

       `vNormal` does not exist here: flatShading defines FLAT_SHADED, under
       which three derives the normal from screen-space derivatives instead of
       interpolating a varying — the shader failed to compile on exactly that.
       `normal` is the shading normal already in view space, and
       `vViewPosition` is the fragment-to-camera vector in view space, so the
       two can be dotted directly. A world-space view vector would have been
       silently wrong even if it had compiled. */
    '    float mrNdV = clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 );',
        '    float mrF = pow( 1.0 - mrNdV, uFresnelPower );',
        /* Absorption is scaled by the facet's OWN class, not applied flat.
           A dark face swallows what enters it; a silver face is a mirror and
           transmits nothing, so it must not be darkened at all. Applying one
           absorption to every facet crushed the whole front of the body and
           lost the bright catches entirely. */
        '    float mrAbsorb = uInnerDark * clamp( vFacet.z, 0.0, 1.0 );',
        '    outgoingLight *= mix( 1.0 - mrAbsorb * ( 1.0 - mrF ), 1.0, 0.10 );',
        '    outgoingLight += outgoingLight * mrF * uFresnelBoost;',
        /* A FLAT cyan add was the last thing keeping the body blue.
           Applied to every fragment at grazing, it painted a cyan wash over
           precisely the facets that should have been reading as dark, and it
           did so AFTER the per-facet classes had carefully separated them.
           It is now scaled by the facet's own tint class, so the chromatic
           faces still catch cyan and the black faces stay black. */
        '    outgoingLight += uTint * mrF * 0.10 * clamp( vFacet.w, 0.0, 1.0 );',
        '  }',
        '#endif',
        '#include <opaque_fragment>'
      ].join('\n'));
  };

  /* Changing defines/onBeforeCompile after first use requires a recompile. */
  material.needsUpdate = true;
  return material;
}

/* Live control for the animation states — a "thinking" pulse can push light
   deeper into the crystal, which reads as him concentrating. */
export function setCrystalVariation(material, v) {
  if (material.userData && material.userData.crystal) {
    material.userData.crystal.uVariation.value = v;
  }
}
