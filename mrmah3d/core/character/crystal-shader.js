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
    /* R92: 0.72 -> 0.38. This is the multiplier that was eating the sapphire.

       `outgoingLight *= mix(1 - absorb*(1 - fresnel), 1, 0.10)`, and absorb is
       uInnerDark times the facet's own darkness — so a black-class facet seen
       face-on came out at 0.35 of whatever lit it. Raising the ambient to a
       deep blue floor therefore changed almost nothing: the floor was being
       multiplied away before it reached the frame, which is why the first
       attempt at the sapphire body measured WORSE than the black one.

       Absorption is still the mechanism that makes a crystal read as having an
       inside, and it still varies per facet. It just no longer takes two thirds
       of the body's value with it. */
    /* And then partway back up to 0.60. 0.38 was chosen to stop the absorption
       eating the new sapphire floor, and it did — but it also flattened the
       bottom of the range: measured, near-black fell to 1.7% against a target
       of 10-15%, i.e. the body had no lost planes left at all. Absorption is
       the right control for exactly that, because it scales by the facet's OWN
       darkness: raising it pulls the dark classes down and leaves the lit ones
       where they are, which widens the distribution instead of moving it. */
    /* R93: 0.60 -> 0.80, on the luminous references. Measured over the chest,
       they are DARKER than this build, not brighter: mean 55 against 95, with
       42% of the torso below 32 luma where this had 10%. They read as luminous
       through CONTRAST — a deep body with a hard bright contour and a few
       brilliant catches — which is the opposite of the flat mid-blue this had
       settled into. Absorption is the control that deepens the dark classes
       without touching the lit ones. */
    uInnerDark: { value: opts.innerDark == null ? 0.62 : opts.innerDark },
    uTint: { value: tintColor },
    uDeep: { value: deepColor },
    uVariation: { value: opts.variation == null ? 1.0 : opts.variation },
    /* Width of the shaded chamfer as a share of the face, and how far the
       normal is allowed to lean across it. Both deliberately small: the brief
       asks for 1-3% of the local form, and the point is that a viewer says
       "the crystal has better light behavior", never "it became rounded". */
    /* Chamfer width in WORLD UNITS, on a character 3.0 tall — so a shade over
       a quarter of a percent of his height, which is the 1-3%-of-local-form the
       brief asks for on the parts that matter (an arm is ~0.2 across). */
    uBevelWorld: { value: opts.bevelWorld == null ? 0.0045 : opts.bevelWorld },
    uBevelAmount: { value: opts.bevelAmount == null ? 0.38 : opts.bevelAmount }
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
        'varying vec4 vFacet;',
        'attribute vec3 aSmooth;',
        'attribute vec4 aBary;',
        'varying vec3 vSmoothN;',
        'varying vec4 vBary;'
      ].join('\n'))
      .replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vFacet = aFacet;',
        'vBary = aBary;',
        /* into view space, matching how three carries `normal` */
        'vSmoothN = normalize( normalMatrix * aSmooth );'
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
        'uniform vec3 uDeep;',
        'uniform float uBevelWorld;',
        'uniform float uBevelAmount;',
        'varying vec3 vSmoothN;',
        'varying vec4 vBary;'
      ].join('\n'))

      /* THE MICRO-BEVEL. See the long note in forge.js.

         `vBary` is the barycentric coordinate, so the smallest of its three
         components is the fractional distance to the NEAREST EDGE of this face:
         0.333 dead centre, 0 on an edge. Inside a thin margin the shading
         normal leans toward the surface's smoothed normal, which is what a
         physical chamfer would have done, and everywhere else the face keeps
         its own flat normal exactly.

         smoothstep rather than a linear ramp so the middle of every face is
         perfectly flat and the lean happens entirely inside the margin —
         a linear blend leaves a trace of curvature across the whole face and
         the character stops reading as cut.

         This runs after <normal_fragment_begin>, which is where three has
         finished deciding what `normal` is. */
      .replace('#include <normal_fragment_begin>', [
        '#include <normal_fragment_begin>',
        '{',
        '  float mrEdge = min( min( vBary.x, vBary.y ), vBary.z );',
        /* Absolute chamfer -> this face's barycentric fraction, with the
           ceiling doing real work. The arms are built from small facets, so
           their inradius is small and the ratio blows up: at a ceiling of 0.30
           a third of every arm facet was chamfer, the normals leaned most of
           the way to smooth, and both arms came back as bright chrome tubes
           while the large-faceted torso stayed correctly faceted. 0.11 means a
           facet too small to carry a real chamfer simply gets a small one
           rather than becoming a curved surface. */
        '  float mrW = clamp( uBevelWorld / max( vBary.w, 1e-4 ), 0.010, 0.11 );',
        '  float mrB = 1.0 - smoothstep( 0.0, mrW, mrEdge );',
        /* And leaning is capped by how far the neighbours actually disagree.
           Where a surface is nearly smooth already the chamfer has nothing to
           do; where two planes meet at a hard angle it must not swing the
           normal all the way across or the facet stops being a facet. */
        '  float mrDiv = clamp( dot( normal, vSmoothN ), 0.0, 1.0 );',
        /* AND ONLY BIG FACES GET A CHAMFER.
           A chamfer is a feature of an EDGE between two planes worth calling
           planes. Applied to the slivers that make up a limb's transition rings
           it does not soften an edge, it smooths the whole facet — the arms came
           back reading as hollow glass tubes rather than solid crystal. Gated on
           the face's own inradius, the hero planes get their softened edge and
           the small transition faces keep their crisp ones, which is also the
           plane hierarchy the brief asks for. */
        '  float mrBig = smoothstep( 0.030, 0.082, vBary.w );',
        '  normal = normalize( mix( normal, vSmoothN, mrB * uBevelAmount * mrDiv * mrBig ) );',
        '}'
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
        /* R93 — THE ADDITIVE GRAZING TERM IS WHAT LIGHTS A DARK CONTOUR.
           The Fresnel boost above is MULTIPLICATIVE, so on a deep body it has
           almost nothing to multiply: raising it from 1.00 to 2.90 changed the
           frame barely at all, because 2.9 times near-zero is near-zero. The
           luminous references put a broad bright band along every silhouette
           edge of a body that is otherwise very dark, and only an additive term
           can do that.
           Raised from 0.10 to 0.55, and the tint-class gate relaxed from a
           multiplier to a floor of 0.35 — the chromatic facets still take the
           most of it, but a black facet at the contour is no longer excluded
           from the one effect that defines the silhouette. */
        '    outgoingLight += uTint * mrF * 0.55 * mix( 0.35, 1.0, clamp( vFacet.w, 0.0, 1.0 ) );',
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
