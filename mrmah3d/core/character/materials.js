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
  /* R92 — AND NOW IT GOES BACK TO BLUE, DELIBERATELY, because the neutral was
     solving the wrong problem.

     The reasoning above is sound and its premise expired. At metalness 0.68 the
     base colour tints every reflection, so a blue base made the whole body one
     hue — true. But metalness is 0.30 now and the environment is near-black, so
     there is barely any reflection for a base colour to tint: what the neutral
     slate actually buys at this point is a body whose unlit facets are GREY
     rather than blue, and grey against a near-black environment is black.

     Measured over the character's own mask, the build this replaces was 54.4%
     near-black and 8.3% dark sapphire, against a brief asking for 10-15% and
     45-55%. He was a black body with blue edges, exactly as the brief says.

     Dark sapphire is his identity colour and it has to live in the ALBEDO,
     because albedo is the only thing that speaks when nothing is being
     reflected. The cyan accents stay selective — they come from the edges, the
     tint class and the rim card, all of which are chosen. This is the floor
     underneath them. */
  crystal: 0x565e6a,   /* R102: graphite-silver, the dark-silver broad plane of the platinum body (was sapphire 0x30507a) */
  /* R94: 0x0a1730 -> 0x11284f. Histogrammed over the chest against Reference A
     the render was 57% below 32 luma against 40%, with the 32-63 band nearly
     empty: the darkest facets were falling to this colour, and this colour was
     black. The reference's lost planes sit at 20-30 luma and are still blue. */
  /* R94 again: STEEL, not sapphire. Sampled on Reference A, the lost planes
     are (24,27,35)-(45,54,71): near-neutral grey with a slight blue cast. A
     saturated deep colour under blue lights gave darks of (6,31,83) — blue with
     no luma — whatever its value was set to. */
  /* R96: steel -> NAVY. The R94 steel darks were measured on the anatomical
     reference; Reference A (R96) keeps its blue into the darks — the quad
     histograms at chroma 94 with 57% under 32 luma, where this build's darks
     sat at chroma 68. Same luma as the steel, the hue moved to sapphire. */
  /* R97: a step deeper again — the R97 references' backs are 76% under 32
     luma and their chests 64%; this build had reached 44% and 30%. */
  crystalDeep: 0x1b2340, /* the darkest facets — deep navy; R99: toward steel, the godform reference's darks are 76% blue where this build's were 96% */
  /* R98 — the platinum coat's albedo: a cool near-neutral silver, a touch
     blue so it reads as platinum under a moon rather than as chrome. Never
     theme-derived (see crystal-shader.js). */
  platinum: 0xc4ccd8,
  /* R102 — THE BODY IS DARK PLATINUM, NOT SAPPHIRE. Every R102 reference
     (`reference/mrmah-refK-r102-*.png`) is a graphite-and-silver body: the
     broad planes dark silver, the cavities near-black, the crests mid
     platinum, rare white peaks, and the theme present ONLY as refraction,
     internal light and reflected accent. The chromatic facets' own hue
     (`crystalTint`) therefore moves from the canonical sapphire to a cool
     neutral, and the deep colour from navy to graphite; the theme keeps its
     transports (rims, seams, coat reflection, core light, lamps). The blue
     that remains on him under the blue theme is LIGHT. */
  crystalTint: 0xb4bccb,
  graphiteDeep: 0x141820,
  /* R94 — the head's ice family: a pale steel-blue albedo, a deep that is
     still blue rather than black, and a whiter tint for its catches. */
  headCrystal: 0x7d9fc6,
  headDeep: 0x1a3768,
  headTint: 0xa9e6ff,
  edge: 0x35d6ff,        /* cyan edge illumination */
  edgeHot: 0xbdf2ff,     /* near-white specular catch */
  face: 0x0a1220,        /* the recessed face-screen — near-black navy, glossy (R97) */
  cavity: 0x121b24,      /* the walls of the face recess — shadowed crystal */
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
    /* R92: 0.55 -> 0.30. Metalness is the switch between "this surface's colour
       is its own" and "this surface's colour is whatever it can see", and with
       a near-black environment to see, 0.55 meant most of the body had no
       colour available to it at all. Halving it lets the sapphire albedo carry
       the unlit and half-lit planes — which is 70% of him — while the facets
       that DO catch a card still go specular, because roughness stays low and
       that is what actually makes a catch sharp. */
    metalness: 0.30,
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
    /* 17, raised when the torso's rim shell was removed. That shell had been
       contributing a broad additive lift to the body as well as a contour, and
       taking it off cost the chest its facet read at app scale. Putting the
       light back through the reflection keeps it on the SURFACES, which is
       where this material has been made to carry it. */
    /* R90: 17 -> 27. The chest histogram against the anatomical reference showed
       this build short of bright pixels by a factor of two and a half (7.6% of
       the chest above 160 against 19.5%) while carrying far too many midtones.
       envMapIntensity is the correct control for exactly that shape of error:
       against a near-black environment it scales the reflected component only,
       so it stretches the bright tail and leaves the blacks where they are.
       Exposure would have moved the whole distribution and made the midtone
       problem worse. */
    /* R92: 27 -> 19. envMapIntensity scales the REFLECTED component, and with
       metalness coming down to let albedo speak, the reflection no longer has
       to carry the whole material. Left at 27 it would simply have re-crushed
       the midtones the albedo is being brought in to supply — the same
       distribution error from the other direction. */
    envMapIntensity: 7.0,   /* R108: 14 -> 11, the reflected tail (the white panels the addendum named); R109: 7.0 — isolation showed the environment reflection carried most of the chest's excess (mean 92 -> 57 with it off) against a reference chest at mean 43, 69% under 48 */
    /* R92: flatShading OFF, and the facets are unaffected.

       Every vertex of a face already carries that face's own normal, so
       interpolating across three identical normals returns the same constant
       the derivative was producing — the faceted read comes from the DATA, not
       from this flag. Turning it off is what makes the normal blendable, which
       is what the micro-bevel needs (see forge.js and crystal-shader.js). With
       it on, three overwrites the interpolated normal with a screen-space
       derivative every fragment and the bevel is discarded. */
    flatShading: false,
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
    /* R97 — A FACE-SCREEN, not black paint. The plate is a glossy dark
       display surface nested in the crystal: near-black, but polished enough
       that the environment's cards ghost across it as he turns, which is what
       ties it to the shell around it and stops it reading as a hole. Still
       far darker than the shell. */
    color: new Color(PALETTE.face),
    /* R100 — PREMIUM DISPLAY GLASS. Tighter and more mirror-like than the
       R97 screen, so the environment's cards ghost across it as a narrow
       reflection that travels when the head yaws — the strongest single cue
       that the screen is a physical pane and not a painted polygon. Still
       near-black: the reflection is a catch, the glass a void between. */
    roughness: 0.06,
    metalness: 0.74,
    envMapIntensity: 3.0,   /* R101: the reflection travels more clearly across the glass */
    flatShading: true,
    /* R98 — the screen is not pitch black: a faint deep-blue self-light so
       the plate reads as a powered display the eyes and smile are drawn ON,
       embedded in the shell, rather than a hole. Far below the features. */
    /* R100 — and it carries a trace of the THEME: the glass reflects the
       eyes' own colour faintly (a fifth of the way from its blue-violet
       floor toward the emission hue), so violet eyes sit in a screen that
       is faintly violet inside and gold eyes in one that is faintly warm. */
    emissive: new Color(PALETTE.faceGlow || 0x0c1a34).lerp(new Color(tint.glow || PALETTE.glow), 0.26),   /* R101: 0.18 -> 0.26 */
    emissiveIntensity: 0.50
  });

  /* R100 — THE BEZEL the glass stands on: dark machined steel, a little
     glossier than the joints, so the module's edge catches a thin bright
     line where the casing's lip does not. */
  var bezel = new MeshStandardMaterial({
    color: new Color(0x2c3c5c),
    roughness: 0.24,
    metalness: 0.80,
    envMapIntensity: 3.0,
    flatShading: true
  });

  /* CAVITY WALL — the inside of the face recess.

     Darker and far less reflective than the shell around it, because that value
     STEP is what the eye reads as depth from the front. A wall inside a hole lit
     like the crystal surrounding the hole gives no occlusion cue at all, which
     is why the recess kept measuring deep and looking shallow. Not pure black:
     it keeps a little reflection so the wall still turns with the head and
     provides parallax at three-quarter angles. */
  var cavity = new MeshStandardMaterial({
    color: new Color(PALETTE.cavity),
    roughness: 0.62,
    metalness: 0.22,
    envMapIntensity: 1.6,
    flatShading: true
  });

  /* R96 — JOINTS. The elbow knuckles and wrist cuffs (limbs.js) are dark
     GUNMETAL, not the cavity's void: Reference A's joints are machined steel
     between the crystal masses, dark but with a metallic sheen that turns
     with the arm. Drawn in the cavity material they rendered as black cuts. */
  /* R99: lighter and glossier — the joints read as compressed dark crystal
     with a steel sheen rather than as black connector bands, which the
     godform brief rules out. */
  var joint = new MeshStandardMaterial({
    color: new Color(PALETTE.joint || 0x3c5484),
    roughness: 0.30,
    metalness: 0.70,
    envMapIntensity: 3.2,
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
    /* R93: 0.40 -> 0.62. The luminous references carry a hard bright contour all
       the way round the silhouette and along every structural break — it is
       most of why they read as lit crystal rather than as dark glass. With the
       body deepened this tier has to carry more of the frame, and it can: it is
       toneMapped:false, so it holds its value while the crystal comes down. */
    opacity: 0.32,   /* R102: halved — the lines were the loudest colour on the body, a cyan wireframe over the platinum */
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
    opacity: 0.14,   /* R102: halved */
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
    color: new Color(tint.hot || PALETTE.edgeHot),
    transparent: true,
    opacity: 0.60,   /* R102: 1.00 -> 0.60 */
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
    opacity: 0.04,   /* R102: halved */
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
    opacity: 0.150,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });

  /* PER-FACET OPTICS. This is what stops the body being a blue mosaic: every
     triangle carries its own roughness, metalness, darkness and tint class.
     See crystal-shader.js. */
  applyCrystalShader(body, {
    tint: tint.edge || PALETTE.edge,
    /* R101: the facets' own hue never takes the theme (crystal-shader.js) */
    crystalTint: PALETTE.crystalTint,   /* R102: the facets' own hue is cool neutral platinum, never the theme, no longer sapphire */
    deep: PALETTE.graphiteDeep,          /* R102: near-black graphite in the cavities */
    /* Down from 1.35. The Fresnel boost brightens whatever faces away from the
       camera, which is the right instinct for a silhouette lip and the wrong
       one for a diamond head: seen face-on, almost every facet of the head's
       crown bands is at a grazing angle, so the term lifted the entire shell
       evenly and it came back as one flat mid-teal panel however the geometry
       was tilted. Raising the head's relief to test that changed nothing, which
       confirmed the flatness was optical rather than geometric.

       The lit contour it used to provide is now the rim shell's job — that one
       follows the real surface curvature instead of every grazing pixel, so it
       puts light on the silhouette without washing the faces behind it. */
    /* Restored to 1.30. It was cut to 0.92 on the theory that it was flattening
       the head shell; that turned out to be the facet distribution instead, so
       the cut was paying a real cost for nothing.

       It matters more now that the torso's rim shell is gone. Fresnel is the
       right tool for exactly the job the shell was doing badly: it brightens a
       surface by how far it has turned from the viewer, per pixel, following
       the real curvature — so it puts light on the contour without laying a
       flat overlay across the chest, which is precisely the difference between
       the two approaches. */
    /* R92: 1.30 -> 1.00. Fresnel multiplies whatever a grazing facet already
       has, and against a sapphire body that is a good deal more than it was
       against a black one — the bright end measured 9.2% above 190 luma where
       the brief asks for 2-5%. Trimmed rather than removed: it is still what
       puts light on the contour. */
    /* R93: 1.00 -> 1.75. The luminous references put a hard, bright contour on
       every silhouette edge — shoulders, arms, head, the taper — and that
       contour is most of why they read as lit crystal rather than as dark
       glass. Fresnel is the right owner for it: it follows real curvature per
       pixel, so it lights the contour without laying anything across the faces,
       which is exactly what the rim shells were removed for failing to do. */
    /* R93: 1.75 -> 2.9. The contour in the luminous references is not a line —
       it is a broad gradient of light running along every edge of the
       silhouette, several pixels wide and falling off into the body. A line
       tier cannot make that however bright it is set, because it is one pixel
       by construction; Fresnel can, because it follows real curvature per
       fragment and widens wherever the surface turns away gently.

       This is the third time this number has moved and the reasoning is finally
       separable: it was cut to 0.92 on the theory that it was flattening the
       head (wrong — that was the rim shell), restored to 1.30, cut to 1.00 when
       the body went sapphire and the bright end ran high, and raised now
       because the body has been deepened and the contour has to carry the
       frame. Fresnel brightens what has turned AWAY, so on a deep body it costs
       the darks nothing. */
    /* Settled at 1.60. 2.90 was tried and measured as very nearly nothing,
       which is the useful result: this term is MULTIPLICATIVE, so on a deep
       body it has almost no value to multiply. The contour is carried by the
       additive grazing term in crystal-shader.js instead; this one is back to
       doing what it can genuinely do, which is deepen the turn on facets that
       are already lit. */
    /* R97: 1.30 -> 1.55 and absorption 0.50 -> 0.64. The references are dark
       bodies with ELECTRIC RIMS: the grazing term is what draws the rim, the
       absorption is what widens the dark end under it (exposure would move
       both together — CLAUDE.md, "absorption widens"). */
    fresnelBoost: 1.55,
    fresnelPower: 2.0,
    /* R99: 0.64 -> 0.72. The godform brief wants near-black to dominate
       ("the dark makes the light look expensive"); absorption is the control
       that widens the dark end without touching the lit planes. */
    innerDark: 1.00,   /* R108: 0.72 -> 1.00 — with coherent facet groups the body lost its dark end (chest box 29% -> 17% under 32); absorption widens it back down without moving the bright end */
    /* R96 — the facet dome (crystal-shader.js): every large plane grades from
       its edge to its centre, which is what Reference A's glossy planes are. */
    dome: 0.55,   /* R105: the gloss wraps each belly */
    /* R94 — the taper's internal light (see crystal-shader.js). Sapphire, not
       cyan: the reference's taper is a saturated royal blue lit from within,
       and the cyan belongs to the edges. The source sits a third of the way up
       the taper so the lower half is brightest and the light fades out under
       the hip, which is where the reference's glow stops. */
    /* Histogrammed over the taper against Reference A: the reference is 42%
       below 32 luma, 32% in 32-63 and 19% in 64-95 with a mean of 49, where
       the first cut of this light left the taper at a mean of 18 with 99%
       below 32 — a saturated blue has almost no luma, so a dark royal blue at
       strength 2.4 reads as near-black by the numbers and as dim by eye. The
       source goes brighter and its blue a shade toward cyan so the flanks
       reach the reference's 64-95 band; the spear stays dark by class. */
    /* Retuned once the taper's OUTER surface rendered (forge.js winding note):
       the outward flanks transmit far more than the interior wall did, so the
       tip went near-white at 9.0. The source moves up the taper and softens so
       the glow spans the whole lower body rather than pooling at the point. */
    /* R95: reviewed as "a blown blue lampshade" (mean 78 against the reference
       taper's 42, 9.5% of pixels at 192-223 against 0.5%): strength down, the
       source lower, the gate a long fade (crystal-shader.js). */
    /* R95-BB: the gates follow the new body — the quad mass now reaches the
       belt at 1.48, so the taper light's top rises to 1.40 and its source
       with it; the core light spans the taller abdomen and chest. */
    /* And then back DOWN the spear: histogrammed against the bodybuilder
       reference the quad mass is a dark navy (43% under 32 luma, mean 38) and
       the light lives in the spear below it and on the outer edge, so the
       source sits low and the gate fades out through the quad. */
    innerStrength: 1.5,   /* R109: 3.4 -> 1.5 — the spear box was 11% energy cyan against the reference's 4%; cyan is light in the crystal, not the crystal */
    innerY: 0.42,
    innerRange: 1.00,
    innerTop: 1.28,
    coreStrength: 1.0,   /* R109: 2.0 -> 1.0, the core light was 6 points of the chest's energy cyan (reference 2.7%). R101: 1.6 -> 3.6, the core's theme light reaches the abdominal valleys — the one
                            transport that carries a complementary theme (gold) through a sapphire body.
                            R102: back to 2.0 — at 3.6 it flooded the abdominal valleys with theme colour,
                            which is the one thing the carving brief forbids; the valleys are now kept dark
                            by the cavity term and the theme keeps its transports elsewhere. */
    coreY: 1.66,
    coreRange: 0.66,
    coreTop: 2.08,
    innerHalfWidth: 0.36,
    /* R96: the internal light is theme energy (palette.js) */
    innerColor: tint.inner || 0x4a9cff,
    /* R98 — THE PLATINUM COAT (crystal-shader.js), at full strength: the
       per-region map in regions.js and the zone functions decide WHERE, this
       only says the coat exists. Neutral colour on purpose — the platinum
       never takes the theme; the theme lives in what emits and what catches. */
    coat: 1.0,
    coatColor: PALETTE.platinum,
    coatMetal: 0.66,
    coatRough: 0.05,
    coatEnv: 0.70   /* R99: rarer coat, hotter catches — the reference chest has 14% above 160 luma, this had 6% */
  });

  /* R94 — THE HEAD HAS ITS OWN MATERIAL, and it is ICE.

     Cropped beside the reference, the head shell here was near-black with one
     blown bevel, and the reference's is a pale, clear crystal: steel-white and
     sky-blue planes over most of its frame, a few deep-blue facets among them,
     bright hairline edges. That is a lighter albedo, a lower absorption and a
     cooler, whiter tint than the sapphire body — three numbers the body's
     material cannot hold at the same time as its own. The facet table it draws
     from is the head's too (regions.js), so the distribution is authored for a
     few dozen facets rather than the torso's hundreds. */
  var head = new MeshStandardMaterial({
    color: new Color(tint.headCrystal || PALETTE.headCrystal),
    roughness: 0.07,
    /* Lower metalness than the body: the head needs DIFFUSE, because diffuse
       is what gives every facet a pale value that varies smoothly with its
       angle to the key, where reflection alone gives hit-or-miss — one facet
       blown white on the camera-side card, its neighbour black. */
    metalness: 0.24,
    /* Low. Measured against the reference's head shell, the render's bright
       tail was five times too heavy (21% above 160 luma against 4%) and all
       of it was facets catching the camera-side environment card. The
       reflection scales with this number and nothing else on the head does. */
    envMapIntensity: 2.8,
    flatShading: false,
    /* A small self-lit floor: it is what populates the 64-127 bands the
       reference's shell has and this one lacked, without touching the top. */
    emissive: new Color(tint.headCrystal || PALETTE.headCrystal),
    emissiveIntensity: 0.09
  });
  applyCrystalShader(head, {
    tint: PALETTE.headTint,
    deep: PALETTE.headDeep,
    innerDark: 0.42,
    fresnelBoost: 0.90,
    fresnelPower: 3.0,
    dome: 0.30,
    /* R98 — the head's chamfer band is platinum too (the bright frame around
       the black face in the platinum references). The head's own environment
       intensity is already low, so the coat keeps most of its reflection. */
    coat: 1.0,
    coatColor: PALETTE.platinum,
    coatMetal: 0.60,
    coatRough: 0.06,
    coatEnv: 0.85
  });

  /* Explicit env map — see stage.js. Without this envMapIntensity is inert. */
  if (opts.envMap) {
    body.envMap = opts.envMap;
    head.envMap = opts.envMap;
    face.envMap = opts.envMap;
    cavity.envMap = opts.envMap;
    joint.envMap = opts.envMap;
    bezel.envMap = opts.envMap;
    body.needsUpdate = true;
    head.needsUpdate = true;
    face.needsUpdate = true;
  }

  /* R94 — the smile is WEAKER than the eyes. Same glow colour, a shade less
     opaque, so the mouth reads as a quieter mark under two brighter ones — the
     hierarchy both luminous references draw. */
  var emissiveSmile = new MeshBasicMaterial({
    color: new Color(tint.glow || PALETTE.glow),
    toneMapped: false,
    transparent: true,
    opacity: 0.78
  });

  /* R95 — the emblem's white-hot core. */
  var emissiveCore = new MeshBasicMaterial({
    color: new Color(tint.hot || PALETTE.edgeHot),
    toneMapped: false,
    transparent: true,
    opacity: 0.92
  });

  var all = [body, head, face, cavity, joint, bezel, edgeHero, edge, edgeHalo, edgeFaint, emissive, emissiveSoft, emissiveSmile, emissiveCore, rim];

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
    body: body, head: head, face: face, cavity: cavity, joint: joint, bezel: bezel, edgeHero: edgeHero, edge: edge, edgeHalo: edgeHalo, edgeFaint: edgeFaint,
    emissive: emissive, emissiveSoft: emissiveSoft, emissiveSmile: emissiveSmile, emissiveCore: emissiveCore, rim: rim,
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
      SCALE.emissiveSoft = 1 + (1 - t) * 0.95;
      applyOpacity();
    },
    setGlow: function (scale) {
      glow = Math.max(0, Number(scale) || 0);
      applyOpacity();
    },
    dispose: function () { all.forEach(function (m) { if (m.dispose) m.dispose(); }); }
  };
}
