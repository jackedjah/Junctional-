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

/* Ice-blue family. `edge` is the reference's signature cyan. */
export var PALETTE = {
  crystal: 0x2b4152,     /* blue-slate body — dark, but not so dark that the
                            facets have no diffuse left to separate them */
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
    roughness: 0.14,
    metalness: 0.68,
    /* The environment built in stage.js is what this metalness reflects.
       Without it a dark metal returns near-black on every facet. */
    envMapIntensity: 1.5,
    flatShading: true,
    /* A faint self-lit floor so facets turned fully away from every light are
       still crystal rather than holes cut in the frame. Deliberately tiny. */
    emissive: new Color(tint.crystal || PALETTE.crystal),
    emissiveIntensity: 0.35
  });

  /* FACE PLATE — the recess. Almost black, rough, non-metallic, so it stays a
     dark void that the eyes and smile read against at maximum contrast. */
  var face = new MeshStandardMaterial({
    color: new Color(PALETTE.face),
    roughness: 0.9,
    metalness: 0.0,
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
    opacity: 0.62,
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
    opacity: 0.30,
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
    opacity: 0.22,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });

  var all = [body, face, edge, edgeHalo, emissive, emissiveSoft, rim];

  /* Captured at construction so setGlow(1) restores exactly what each material
     was defined with. */
  var BASE = {
    edge: edge.opacity,
    edgeHalo: edgeHalo.opacity,
    emissiveSoft: emissiveSoft.opacity,
    rim: rim.opacity,
    emissive: body.emissiveIntensity
  };

  return {
    body: body, face: face, edge: edge, edgeHalo: edgeHalo,
    emissive: emissive, emissiveSoft: emissiveSoft, rim: rim,
    /* One place to drive the whole character's luminosity — used by the
       animation states so a "thinking" pulse cannot desynchronise.

       Baselines are read from the materials themselves rather than repeated
       as literals. They were duplicated here once, and editing a value at its
       definition then had no effect at all because the first frame of the
       render loop overwrote it with the stale copy. */
    setGlow: function (scale) {
      var s = Math.max(0, Number(scale) || 0);
      edge.opacity = BASE.edge * s;
      edgeHalo.opacity = BASE.edgeHalo * s;
      emissiveSoft.opacity = BASE.emissiveSoft * s;
      rim.opacity = BASE.rim * s;
      body.emissiveIntensity = BASE.emissive * s;
    },
    dispose: function () { all.forEach(function (m) { if (m.dispose) m.dispose(); }); }
  };
}
