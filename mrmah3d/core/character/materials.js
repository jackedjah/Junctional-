/* MR.MAH 3D :: MATERIALS
   The crystal look.

   The reference's hierarchy, in order, and this file exists to reproduce it:

     1. a predominantly DARK translucent crystalline mass
     2. readable internal facet variation
     3. thin cyan edge illumination
     4. sparse bright specular catches
     5. selective near-white highlights
     6. a dark recessed facial interior
     7. highly readable glowing eyes and smile

   The single most important discipline here is that Mr.Mah is NOT a glowing
   cyan object. The body is dark and *lit*; only the edges and the face emit.
   If the body ever starts emitting, the facets stop reading and he flattens
   into a neon sign — which is the failure mode the brief calls out. */

import {
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial, Color,
  AdditiveBlending, DoubleSide, BackSide
} from '../../vendor/three/three.module.min.js';
import { applyCrystalShader } from './crystal-shader.js';

/* Ice-blue family. `edge` is the reference's signature cyan. */
export var PALETTE = {
  /* Desaturated on purpose. At metalness 0.68 the base colour tints every
     reflection, so a strongly blue crystal turns even a white environment zone
     blue and the whole body converges on one hue. A near-neutral slate lets
     the white zone stay white, the dark zone stay black, and the cyan come
     from the edges and the narrow environment band where it belongs. */
  /* Pulled further toward neutral again. Every remaining trace of blue in the
     base colour is multiplied across every facet at once, so it is the one
     value that can make the whole body read as "a blue object" no matter how
     well the per-facet classes separate. The cyan the character needs comes
     from the edges, the tint class and the rim card — all of which are
     selective. This is not. */
  crystal: 0x4a5058,
  crystalDeep: 0x0b1219, /* the darkest facets */
  edge: 0x35d6ff,        /* cyan edge illumination */
  edgeHot: 0xbdf2ff,     /* near-white specular catch */
  face: 0x05090d,        /* the recessed facial plane — almost black */
  glow: 0x4fe3ff
};

export function createCrystalMaterials(options) {
  var opts = options || {};
  var tint = opts.tint || {};

  /* BODY — dark, fairly smooth, moderately metallic.
     flatShading is mandatory: it is what makes every facet return its own
     value and is the entire mechanism by which the form reads.
     Metalness is kept mid: high enough for crisp specular catches on the
     facets, low enough that diffuse still separates the planes. */
  var body = new MeshStandardMaterial({
    color: new Color(tint.crystal || PALETTE.crystal),
    /* Low roughness gives each facet a tight, bright catch instead of a broad
       soft sheen — that is what reads as crystal rather than as plastic, and
       it is where the reference's sparse near-white highlights come from. */
    /* Low roughness keeps the reflection of the environment SHARP, so
       neighbouring facets pick up very different parts of the gradient and the
       body gets the reference's strong dark-to-light contrast. Blurring it
       (high roughness) averages the environment out and every facet converges
       on the same mid-tone, which reads as flat plastic. */
    roughness: 0.085,
    /* Down from 0.68. Metalness suppresses diffuse, and diffuse is where a
       continuous middle of the value range comes from — it varies smoothly with
       each facet's angle to the lights instead of switching on and off with a
       reflection. At 0.68 the body was almost purely specular and therefore
       almost purely bimodal. Kept above a half so the specular catches still
       dominate the bright end, which is what keeps it crystal and not stone. */
    metalness: 0.55,
    /* The environment built in stage.js is what this metalness reflects.
       Without it a dark metal returns near-black on every facet. */
    /* High, and paired with a LOW tone-mapping exposure. These two are not
       the same knob: exposure lifts every pixel together, while envMapIntensity
       scales the reflection — and the dark zones of the environment reflect
       almost nothing, so raising it pushes the bright facets up while leaving
       the dark ones where they are. That is contrast, which is what the
       crystal reads by. Chasing the mean with exposure alone produced a
       correctly-numbered but visually flat body. */
    /* Raised again once the environment was rebuilt dark. This number is only
       safe to push because of that: envMapIntensity multiplies the REFLECTION,
       and a facet reflecting a black room returns black however high it goes.
       So it scales the catches and leaves the floor alone, which is precisely
       the axis the value hierarchy needs. Against the old bright sky the same
       move would simply have made the whole body brighter and bluer. */
    /* Raised once more when the edge lines came down. Dropping edge opacity
       from 0.62 to 0.40 cost the character nine points of mean luminance on its
       own, which is the clearest possible evidence that the additive linework —
       not the surfaces — had been doing the lighting. That is the wireframe
       read, stated as a measurement. The brightness has to come back through
       the material instead, and it does. */
    /* 14, once the facet table was reweighted half-black. The brief is explicit
       that the dark regions must not go dead or matte — they have to keep
       catching light — and darkening the albedo without raising the reflected
       component is exactly how a body goes flat. Verification caught it as a
       drop in separable lit planes before it was obvious by eye. */
    envMapIntensity: 14.0,
    flatShading: true,
    /* A faint self-lit floor so facets turned fully away from every light are
       still crystal rather than holes cut in the frame. Deliberately tiny. */
    emissive: new Color(tint.crystal || PALETTE.crystal),
    /* Small. Self-illumination raises the floor of EVERY facet at once, which
       is the fastest way to destroy the dark end of the value hierarchy — the
       reference puts a third of its pixels in the darkest eighth, and it cannot
       do that if the material is glowing at itself. */
    emissiveIntensity: 0.05
  });

  /* FACE PLATE — the recess. Almost black, rough, non-metallic, so it stays a
     dark void that the eyes and smile read against at maximum contrast. */
  var face = new MeshStandardMaterial({
    color: new Color(PALETTE.face),
    roughness: 0.9,
    metalness: 0.0,
    /* The recess must stay a VOID. Even at roughness 0.9 and zero metalness the
       plate picks up a diffuse wash of the environment, and any value at all in
       there costs the eyes and smile the contrast they read against — which is
       the whole reason the plate is recessed in the first place. */
    envMapIntensity: 0.18,
    flatShading: true
  });

  /* EDGES — the cyan perimeter. Unlit and additive so it holds its value
     against the dark body regardless of where the lights are; this is
     illumination, not a surface. Thin by construction: it is drawn from the
     geometry's own edges, so it can never drift off the form. */
  /* Opacity is well under 1 on purpose. At full strength every plane break on
     the model draws a bright line of equal weight, and the character reads as
     a wireframe cage with dark fill rather than as a lit solid — which was the
     standing note after the last pass. The edges are a highlight ON the
     crystal, not the crystal's outline. Selectivity is enforced twice: here by
     value, and in the geometry by only extracting edges above a large
     dihedral angle. */
  var edge = new LineBasicMaterial({
    color: new Color(tint.edge || PALETTE.edge),
    transparent: true,
    /* Down again, from 0.62. With the surfaces finally carrying real optical
       variation the lines no longer have to describe the form, and at 0.62 they
       were laying a continuous cyan web over the whole torso — which is both
       the "wireframe feel" note and a large part of "too blue overall", since
       an additive cyan line brightens every pixel it crosses. */
    opacity: 0.40,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });

  /* A second, dimmer edge pass for the just-bloomed halo, without a
     post-processing pass.

     depthTest MUST stay on. With it off this pass drew every hidden back edge
     over the front of the body, and the character read as a wireframe cage
     rather than a solid crystal — by far the largest single visual error in
     the first reference comparison. The reference does show some internal
     structure, but that comes from facets catching light, not from seeing the
     far side of the model. */
  var edgeHalo = new LineBasicMaterial({
    color: new Color(tint.edge || PALETTE.edge),
    transparent: true,
    opacity: 0.16,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false
  });

  /* HERO EDGES — rare, and the brightest thing on the body after the face.

     Only the very sharpest breaks qualify: the head's girdle, the shoulder
     spine, the torso's prow. Ice-white rather than cyan so they read as a
     specular catch running along an edge rather than as more of the same
     outline colour. Four classes of edge — hero, structural, secondary, lost —
     is what removes the last of the technical-wireframe look; a single value
     everywhere is a drawing, a range is lighting. */
  var edgeHero = new LineBasicMaterial({
    color: new Color(PALETTE.edgeHot),
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });

  /* FAINT EDGES — every remaining seam, at a whisper.

     This is the other half of the two-tier scheme in body.js. The facet seams
     still need to exist, or the crystal loses its cut; they just must not
     compete with the structural lines. At this value they read as the glint
     along a facet boundary rather than as drawn linework. */
  var edgeFaint = new LineBasicMaterial({
    color: new Color(tint.edge || PALETTE.edge),
    transparent: true,
    opacity: 0.07,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });

  /* EMISSIVE — eyes, smile, emblem, symbols. Unlit and tone-mapping-exempt so
     they keep their exact colour and stay legible; the brief is explicit that
     bloom must not be allowed to destroy the eyes or the smile. */
  var emissive = new MeshBasicMaterial({
    color: new Color(tint.glow || PALETTE.glow),
    toneMapped: false,
    transparent: true,
    opacity: 1
  });

  var emissiveSoft = new MeshBasicMaterial({
    color: new Color(tint.glow || PALETTE.glow),
    toneMapped: false,
    transparent: true,
    /* Raised from 0.30 once the eyes and smile were reduced to hairlines.

       A hairline is right at the canonical framing and wrong at chat framing:
       there the character is 30% of frame height, the eye ring falls under a
       pixel wide, and antialiasing simply erases it — the eyes rendered as dark
       holes in the face. The brief asks for thin laser circles AND for the eyes
       and smile to stay highly readable, and those only reconcile if the thin
       line carries the shape while a wider, dimmer companion carries the
       presence. So the ring stays hairline and this does the work at distance.
       This is also the reason it must not be solved with bloom: bloom would
       thicken every bright thing on the character, not just the face. */
    /* Back down now that there is a REAL bloom pass.

       This companion geometry existed as a stand-in for bloom — a wider, dimmer
       copy of each bright feature so the hairline eyes and smile kept presence
       at small scale. With bloom.js actually running, the two stack: the face
       got a halo from the companion AND a halo from the post pass, which
       together washed the recess and flattened the head shell behind it. The
       companion now does only what bloom cannot, which is stay visible on the
       low tier where there is no post-processing at all. */
    opacity: 0.40,
    blending: AdditiveBlending,
    depthWrite: false
  });

  /* RIM SHELL — a slightly enlarged back-faced copy of the body, additive and
     faint. Where the silhouette turns away from the camera the shell shows
     through as a thin bright lip, which is the cheap, geometry-correct way to
     get the reference's lit contour without a fresnel shader or a post pass. */
  var rim = new MeshBasicMaterial({
    color: new Color(tint.edge || PALETTE.edge),
    side: BackSide,
    transparent: true,
    /* Raised as the edge lines came down. The lit contour still has to close
       the silhouette against the void; with dimmer edges the rim shell is now
       doing most of that job, which is the right owner for it — it follows the
       real surface curvature instead of drawing every polygon boundary. */
    opacity: 0.155,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });

  /* PER-FACET OPTICS. This is what stops the body being a blue mosaic: every
     triangle carries its own roughness, metalness, darkness and tint class.
     See crystal-shader.js. */
  applyCrystalShader(body, {
    tint: tint.edge || PALETTE.edge,
    deep: PALETTE.crystalDeep
  });

  /* Explicit env map — see stage.js. Without this envMapIntensity is inert. */
  if (opts.envMap) {
    body.envMap = opts.envMap;
    face.envMap = opts.envMap;
    body.needsUpdate = true;
    face.needsUpdate = true;
  }

  var all = [body, face, edgeHero, edge, edgeHalo, edgeFaint, emissive, emissiveSoft, rim];

  /* Captured at construction so setGlow(1) restores exactly what each material
     was defined with. */
  var BASE = {
    edgeHero: edgeHero.opacity,
    edge: edge.opacity,
    edgeFaint: edgeFaint.opacity,
    edgeHalo: edgeHalo.opacity,
    emissiveSoft: emissiveSoft.opacity,
    rim: rim.opacity,
    emissive: body.emissiveIntensity
  };

  /* Two independent multipliers on the same baselines: `glow` is the animation
     state's pulse, `SCALE` is the size-aware art direction. They are applied
     together in one place so neither can overwrite the other — an earlier
     version had two writers racing on these opacities every frame. */
  var glow = 1;
  var SCALE = { edgeHero: 1, edge: 1, edgeFaint: 1, rim: 1, emissiveSoft: 1 };

  function applyOpacity() {
    edgeHero.opacity = BASE.edgeHero * glow * SCALE.edgeHero;
    edge.opacity = BASE.edge * glow * SCALE.edge;
    edgeHalo.opacity = BASE.edgeHalo * glow * SCALE.edge;
    edgeFaint.opacity = BASE.edgeFaint * glow * SCALE.edgeFaint;
    emissiveSoft.opacity = BASE.emissiveSoft * glow * SCALE.emissiveSoft;
    rim.opacity = BASE.rim * glow * SCALE.rim;
    body.emissiveIntensity = BASE.emissive * glow;
  }

  return {
    body: body, face: face, edgeHero: edgeHero, edge: edge, edgeHalo: edgeHalo, edgeFaint: edgeFaint,
    emissive: emissive, emissiveSoft: emissiveSoft, rim: rim,
    /* One place to drive the whole character's luminosity — used by the
       animation states so a "thinking" pulse cannot desynchronise.

       Baselines are read from the materials themselves rather than repeated
       as literals. They were duplicated here once, and editing a value at its
       definition then had no effect at all because the first frame of the
       render loop overwrote it with the stale copy. */
    /* SCALE-AWARE PRESENTATION.

       The showcase render does not simply scale down. At chat size the
       character is a couple of hundred pixels tall, and at that size the facet
       seams — which are the right weight when he fills the frame — collapse
       into a grey fuzz that eats the silhouette and competes with the eyes.
       Meanwhile the things that must survive (the face, the shoulder line, the
       lit contour) are exactly the things that get thinnest.

       So the same renderer presents itself differently by size: the secondary
       seams fade out entirely, the structural lines and the rim shell come up
       to hold the form, and the face's glow strengthens so the eyes and smile
       stay readable. Nothing about the model changes — this is art direction on
       the line weights, which is what a good illustrator does when the same
       drawing has to work at two sizes.

       `px` is the character's height on screen in CSS pixels. Below ~180 he is
       a small presence beside UI; above ~420 he is the subject of the frame. */
    setScaleHint: function (px) {
      var t = Math.max(0, Math.min(1, (Number(px) - 150) / 280));
      /* Faint seams: gone when small, full when large. */
      SCALE.edgeFaint = t;
      /* Structural lines and contour: lifted when small so the form still
         reads once the surfaces are only a few pixels across.

         The lift is deliberately modest. A first version pushed the contour up
         by 75% and the protocol preview came back reading as a cyan figure
         rather than a dark crystal one — which is the exact failure the brief
         names first. Enough to hold the silhouette, not enough to become the
         character's colour. */
      SCALE.edge = 1 + (1 - t) * 0.34;
      SCALE.rim = 1 + (1 - t) * 0.42;
      SCALE.edgeHero = 1 + (1 - t) * 0.22;
      /* The face is the exception: it is the one thing that must not degrade
         with size at all, so its glow gets the largest share of the lift. */
      SCALE.emissiveSoft = 1 + (1 - t) * 0.70;
      applyOpacity();
    },
    setGlow: function (scale) {
      glow = Math.max(0, Number(scale) || 0);
      applyOpacity();
    },
    dispose: function () { all.forEach(function (m) { if (m.dispose) m.dispose(); }); }
  };
}
