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

import { Color, Vector3 } from '../../vendor/three/three.module.min.js';

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
    /* R94: 0.62 -> 0.50, with the deep colour lifted at the same time. Measured
       over the chest on identical framing against Reference A: 66% of the
       render's pixels sat below 32 luma against the reference's 48%, and the
       32-63 band held 4.6% against 27.8% — the lost planes were falling
       through the floor rather than sitting on it. */
    uInnerDark: { value: opts.innerDark == null ? 0.50 : opts.innerDark },
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
    uBevelWorld: { value: opts.bevelWorld == null ? 0.0062 : opts.bevelWorld },
    uBevelAmount: { value: opts.bevelAmount == null ? 0.46 : opts.bevelAmount },
    /* R96 — THE FACET DOME. A cut gem's facets are not optically flat: each
       reads as a shallow convex plane whose reflection GRADES across it, from
       a bright edge to a deeper centre, and it is that gradient — not the
       facet count — that the reference's glossy planes are made of. A flat
       facet reflects one point of the environment and comes back as one
       value however sharp the material is. `uDome` leans the normal toward
       the smooth (area-weighted) normal across the WHOLE face in proportion to
       the distance from its centroid, so the face keeps its own flat normal
       at the centre and curves toward its neighbours at the rim; the chamfer
       above still handles the last margin. Gated to large faces exactly as
       the chamfer is, so a limb's transition slivers stay cut. */
    uDome: { value: opts.dome == null ? 0.0 : opts.dome },
    /* R94 — THE INTERNAL LIGHT. A real source INSIDE the crystal, in the
       mesh's own space, whose light reaches the outside of a facet by
       TRANSMISSION rather than reflection: a facet is lit in proportion to how
       squarely the light behind it is hitting its inner face (-N.L), how near
       it is (inverse-square over uInnerRange), and how little its own optical
       class absorbs. A point light placed inside a closed mesh lights nothing
       in a standard renderer — every outward normal faces away from it — which
       is exactly why the taper stayed a slab through every lighting pass: the
       reference taper is lit from within and nothing here could be.

       The effect is gated to a region of the mesh (below uInnerTop, within
       uInnerHalfWidth of the axis) so the same material on the arms and the
       chest is untouched, and its lateral profile favours facets that face
       sideways over those that face the viewer — the spear down the front
       stays dark while the flanks glow, which is the reference's structure. */
    uInnerLight: { value: new Vector3(0, opts.innerY == null ? 0.42 : opts.innerY, 0.0) },
    uInnerColor: { value: new Color(opts.innerColor == null ? 0x2f7dff : opts.innerColor) },
    uInnerStrength: { value: opts.innerStrength == null ? 0.0 : opts.innerStrength },
    uInnerRange: { value: opts.innerRange == null ? 0.85 : opts.innerRange },
    uInnerTop: { value: opts.innerTop == null ? 1.10 : opts.innerTop },
    uInnerHalfWidth: { value: opts.innerHalfWidth == null ? 0.34 : opts.innerHalfWidth },
    /* R95 — a SECOND source in the core, so the abdomen and lower ribcage
       carry interior blue too ("richer interior fill; do not let the body
       collapse into mostly black"). Weaker and shorter-ranged than the taper's,
       gated below the clavicle, and lateral in the same way so the abdominal
       blocks' outer planes glow and the channel stays dark. */
    uCoreLight: { value: new Vector3(0, opts.coreY == null ? 1.58 : opts.coreY, 0.0) },
    uCoreStrength: { value: opts.coreStrength == null ? 0.0 : opts.coreStrength },
    uCoreRange: { value: opts.coreRange == null ? 0.62 : opts.coreRange },
    uCoreTop: { value: opts.coreTop == null ? 2.02 : opts.coreTop },
    /* R98 — THE PLATINUM COAT. A second material blended over the crystal by
       the per-polygon `aCoat` mask (forge.js) and the facet's own class: a
       near-neutral platinum albedo, higher metalness, tighter roughness and no
       absorption. It is deliberately NOT chrome — metalness stops short of 1
       so a coated plane facing the key still shows a pale diffuse steel rather
       than only what it can mirror, which is the difference between a plated
       solid and a hollow reflection. Only the lit classes take it (a black
       facet stays a lost plane whatever region it is in), and planes that face
       up and out take more than planes that face down, which is where a coat
       lit by a moon would read. `uCoat` is the global strength; `uCoatColor`
       stays neutral under every theme ("the platinum remains neutral"). */
    uCoat: { value: opts.coat == null ? 0.0 : opts.coat },
    uCoatColor: { value: new Color(opts.coatColor == null ? 0xbfc8d6 : opts.coatColor) },
    uCoatMetal: { value: opts.coatMetal == null ? 0.66 : opts.coatMetal },
    uCoatRough: { value: opts.coatRough == null ? 0.05 : opts.coatRough },
    uCoatEnv: { value: opts.coatEnv == null ? 0.55 : opts.coatEnv }
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
        'varying vec4 vBary;',
        'varying vec3 vObjPos;',
        'varying vec3 vObjN;',
        'attribute float aInner;',
        'varying float vInner;',
        'attribute float aCoat;',
        'varying float vCoat;'
      ].join('\n'))
      .replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vFacet = aFacet;',
        'vBary = aBary;',
        /* into view space, matching how three carries `normal` */
        'vSmoothN = normalize( normalMatrix * aSmooth );',
        /* the mesh's own space, for the internal light */
        'vObjPos = position;',
        'vObjN = normal;',
        'vInner = aInner;',
        /* R98 — the coat's exposure term is settled here, where the view-space
           normal is cheap: planes facing up and outward take more of the coat
           than planes facing down, which is where a plated solid lit by a moon
           reads platinum. (The fragment's `normal` is not known yet where the
           colour, roughness and metalness are decided, so it cannot be done
           there.) View space is close enough to world: the camera pitches only
           a few degrees. */
        '{',
        '  vec3 mrVN = normalize( normalMatrix * normal );',
        '  vCoat = aCoat * ( 0.55 + 0.45 * clamp( mrVN.y * 0.9 + abs( mrVN.x ) * 0.45 + 0.35, 0.0, 1.0 ) );',
        '}'
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
        'uniform float uDome;',
        'uniform vec3 uInnerLight;',
        'uniform vec3 uInnerColor;',
        'uniform float uInnerStrength;',
        'uniform float uInnerRange;',
        'uniform float uInnerTop;',
        'uniform float uInnerHalfWidth;',
        'uniform vec3 uCoreLight;',
        'uniform float uCoreStrength;',
        'uniform float uCoreRange;',
        'uniform float uCoreTop;',
        'varying vec3 vSmoothN;',
        'varying vec4 vBary;',
        'varying vec3 vObjPos;',
        'varying vec3 vObjN;',
        'varying float vInner;',
        'varying float vCoat;',
        'uniform float uCoat;',
        'uniform vec3 uCoatColor;',
        'uniform float uCoatMetal;',
        'uniform float uCoatRough;',
        'uniform float uCoatEnv;',
        /* the coat weight of this fragment, settled once the normal is known */
        'float mrCoatW = 0.0;'
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
        /* R96 — the dome: centreness is the smallest barycentric coordinate
           scaled so the centroid reads 1 and every edge 0; the lean grows as
           the square of the distance from the centre, which keeps the middle
           third of a face essentially flat and the curvature at its rim. */
        '  float mrCentre = clamp( mrEdge * 3.0, 0.0, 1.0 );',
        /* The dome's size gate opens lower than the chamfer's: a limb's strips
           have an inradius of 0.015-0.045 and the reference's arms are made of
           exactly such planes, each graded. The lean is quadratic from the
           centre so a small face still keeps a flat middle. */
        '  float mrBigDome = smoothstep( 0.012, 0.045, vBary.w );',
        '  float mrDome = uDome * ( 1.0 - mrCentre ) * ( 1.0 - mrCentre ) * mrDiv * mrBigDome;',
        '  normal = normalize( mix( normal, vSmoothN, max( mrB * uBevelAmount * mrDiv * mrBig, mrDome ) ) );',
        '}'
      ].join('\n'))

      /* Base colour: pull each facet toward the deep interior colour by its
         darkness class, then restore only as much of the crystal's own hue as
         its tint class allows. This is what breaks "blue everywhere" — most
         faces end up charcoal or black and only a minority stay chromatic. */
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        '#ifdef MRMAH_CRYSTAL',
        /* R98 — the coat's weight: the polygon's mask (already carrying the
           exposure term from the vertex stage), times a class gate that keeps
           the coat off the dark rows — a black facet is a lost plane whatever
           region it is in. Decided here because this runs before roughness,
           metalness and lighting. */
        '  mrCoatW = clamp( vCoat * uCoat, 0.0, 1.0 ) * ( 1.0 - smoothstep( 0.0, 0.36, clamp( vFacet.z, 0.0, 1.0 ) ) );',
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
        /* R98 — the platinum albedo. A coated plane's colour is the coat's,
           carrying a trace of the crystal's own value underneath so a coated
           silver catch stays brighter than a coated sapphire plane. */
        '  diffuseColor.rgb = mix( diffuseColor.rgb, uCoatColor * ( 0.80 + 0.20 * dot( diffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) ) * 2.0 ), mrCoatW );',
        '#endif'
      ].join('\n'))

      /* Roughness and metalness per facet. A rough dark face kills its own
         reflection, which is how a plane "falls almost completely dark" next
         to one that glints. */
      .replace('#include <roughnessmap_fragment>', [
        '#include <roughnessmap_fragment>',
        '#ifdef MRMAH_CRYSTAL',
        '  roughnessFactor = clamp( roughnessFactor + vFacet.x * uVariation, 0.02, 1.0 );',
        '  roughnessFactor = mix( roughnessFactor, uCoatRough, mrCoatW );',
        '#endif'
      ].join('\n'))
      .replace('#include <metalnessmap_fragment>', [
        '#include <metalnessmap_fragment>',
        '#ifdef MRMAH_CRYSTAL',
        '  metalnessFactor = clamp( metalnessFactor + vFacet.y * uVariation, 0.0, 1.0 );',
        '  metalnessFactor = mix( metalnessFactor, uCoatMetal, mrCoatW );',
        '#endif'
      ].join('\n'))
      /* R98 — a coated plane reflects the environment at its own intensity.
         The body's envMapIntensity is tuned for a dark crystal against a
         near-black room with hot cards, where a metal plane either catches or
         misses; scaled down on the coat, the platinum reads by its pale
         diffuse under the key and keeps its catches as accents rather than as
         blown panels. */
      .replace('radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );',
               'radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness ) * mix( 1.0, uCoatEnv, mrCoatW );')

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
        '    float mrAbsorb = uInnerDark * clamp( vFacet.z, 0.0, 1.0 ) * ( 1.0 - mrCoatW );',
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
        /* R95: the dark classes take less of the additive grazing cyan, so a
           lost plane at the contour stays steel rather than turning blue —
           reviewed, every dark on the body was saturated blue where the
           reference's darks are neutral. */
        /* R95: SOFT-LIMITED. On the linear pipeline the additive term clipped
           per channel to a 1-2 px pure-white stroke on the turned-away flank;
           the references' contour is a broad blue gradient. A saturating curve
           keeps the add chromatic however grazing the pixel, and the wider lobe
           (uFresnelPower 2.6 -> 2.0, set in materials) spreads it. */
        '    float mrRim = 1.0 - exp( -1.6 * mrF );',
        /* R98: on a coated plane the grazing add goes silver-blue rather than
           cyan — a platinum rim catches the moon, a crystal rim its own energy. */
        '    vec3 mrRimColor = mix( uTint, uCoatColor * 1.15, mrCoatW * 0.70 );',
        '    outgoingLight += mrRimColor * mrRim * 0.50 * mix( 0.35, 1.0, clamp( vFacet.w, 0.0, 1.0 ) ) * ( 1.0 - 0.55 * clamp( vFacet.z, 0.0, 1.0 ) );',
        /* R94 — the internal light. See the uniform note above. */
        '    if ( uInnerStrength > 0.0 && vInner > 0.5 ) {',
        '      vec3 mrN = normalize( vObjN );',
        '      vec3 mrL = uInnerLight - vObjPos;',
        '      float mrD = length( mrL );',
        '      mrL /= max( mrD, 1e-4 );',
        /* light arriving from INSIDE: the inner face of this facet turned toward the source */
        '      float mrTrans = clamp( -dot( mrN, mrL ), 0.0, 1.0 );',
        '      float mrQ = mrD / uInnerRange;',
        '      float mrAtt = 1.0 / ( 1.0 + mrQ * mrQ );',
        /* the region gate: below uInnerTop, within the taper's own width */
        /* R95: a LONG vertical fade rather than a short one — reviewed, the
           gate drew a hard horizontal glow line at the hip. The light now grows
           out of the abdomen over ~0.8 units. */
        '      float mrGate = 1.0 - smoothstep( uInnerTop - 0.80, uInnerTop + 0.10, vObjPos.y );',
        '      mrGate *= 1.0 - smoothstep( uInnerHalfWidth * 0.75, uInnerHalfWidth * 1.25, abs( vObjPos.x ) );',
        /* flanks glow, the front spear stays dark: side-facing over viewer-facing */
        '      float mrSide = 0.10 + 0.90 * pow( abs( mrN.x ), 0.75 );',
        /* a facet's own darkness class dims what passes through it */
        '      float mrPass = 1.0 - 0.85 * clamp( vFacet.z, 0.0, 1.0 );',
        /* a mild pow on the transmission so neighbouring columns, which face
           the source at different angles, separate — the reference's flanks
           alternate brighter and darker long facets rather than glowing evenly.
           A first cut at 1.6 with a short range put the taper's light out. */
        '      float mrInner = uInnerStrength * mrAtt * mrGate * mrSide * mrPass * ( 0.18 + 0.82 * pow( mrTrans, 1.25 ) );',
        '      outgoingLight += uInnerColor * mrInner * mix( 0.55, 1.0, clamp( vFacet.w, 0.0, 1.0 ) );',
        /* the core source — see the uniform note */
        '      if ( uCoreStrength > 0.0 ) {',
        '        vec3 mcL = uCoreLight - vObjPos;',
        '        float mcD = length( mcL );',
        '        mcL /= max( mcD, 1e-4 );',
        '        float mcTrans = clamp( -dot( mrN, mcL ), 0.0, 1.0 );',
        '        float mcQ = mcD / uCoreRange;',
        '        float mcAtt = 1.0 / ( 1.0 + mcQ * mcQ );',
        '        float mcGate = 1.0 - smoothstep( uCoreTop - 0.30, uCoreTop + 0.06, vObjPos.y );',
        '        mcGate *= smoothstep( uInnerTop - 0.55, uInnerTop + 0.25, vObjPos.y );',
        '        float mcSide = 0.18 + 0.82 * pow( abs( mrN.x ), 0.75 );',
        '        float mcInner = uCoreStrength * mcAtt * mcGate * mcSide * mrPass * ( 0.18 + 0.82 * pow( mcTrans, 1.25 ) );',
        '        outgoingLight += uInnerColor * mcInner * mix( 0.55, 1.0, clamp( vFacet.w, 0.0, 1.0 ) );',
        '      }',
        '    }',
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

/* R94 — drive the internal light: strength scales with the character's glow
   pulse, and the source can breathe up and down the taper. */
export function setInnerLight(material, strength, y) {
  var u = material.userData && material.userData.crystal;
  if (!u) return;
  if (strength != null) u.uInnerStrength.value = Math.max(0, Number(strength) || 0);
  if (y != null) u.uInnerLight.value.y = Number(y);
}
