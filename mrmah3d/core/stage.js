/* MR.MAH 3D :: STAGE
   The Scene itself, plus the atmospheric depth that makes a dark void read as
   a room rather than a flat black rectangle.

   Depth here is exponential fog only. It is the cheapest possible way to buy
   real depth cueing — no extra draw calls, no post-processing pass, no render
   target — which is exactly the "basic atmospheric depth if extremely
   inexpensive" the Phase 1 brief asks for. Anything more (bloom, SSAO, DOF)
   is a later-phase decision and must be tier-gated when it arrives. */

import {
  Scene, Fog, Group, Color, CanvasTexture, EquirectangularReflectionMapping,
  PMREMGenerator, SRGBColorSpace
} from '../vendor/three/three.module.min.js';

/* A tiny procedural environment for the crystal to reflect.

   This is not decoration — it is what makes the material read as crystal at
   all. A metallic surface with nothing to reflect returns almost pure black
   except where a light happens to specular off it, and the body rendered as a
   flat black shape with cyan outlines no matter how the lights were tuned.
   Give it an environment and every facet reflects a different part of the
   gradient, which is exactly the "readable internal facet variation" the
   reference depends on.

   Generated rather than loaded: no asset to ship, and it re-tints with the
   theme.

   Resolution matters more than it looks. At 64x32 the PMREM blur smeared the
   zone boundaries into one another and the crystal came out uniformly
   mid-toned; the zones only produce a value hierarchy if their edges survive
   to the reflection. */
function buildEnvironment(renderer, palette) {
  var c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  var g = c.getContext('2d');
  /* This gradient has to be BRIGHT. It is a reflection source, not scenery,
     and it is never seen directly — the scene background stays transparent.
     A first attempt used the stage's own near-black values and the crystal
     stayed black, because a dark metal reflecting a dark room is just dark. */
  /* ZONES, not a ramp.

     A smooth blue gradient makes almost every facet reflect some shade of
     blue, and the body reads as one uniformly tinted object no matter how much
     the geometry varies — measured, half the character's pixels sat in a
     single mid band. The reference's crystal is not blue everywhere: it is
     near-WHITE where it faces the light, near-BLACK where it faces away, and
     cyan only in a narrow transition. So the environment is built as three
     large zones with quick transitions between them. A facet's value then
     depends on which way it points, which is what a value hierarchy IS. */
  var grad = g.createLinearGradient(0, 0, 0, 128);
  /* THE SPHERE'S AVERAGE MUST BE DARK, and this is the correction that finally
     made the body stop being blue.

     A rough facet does not reflect a direction — it reflects the AVERAGE of the
     environment around that direction. The previous sky was bright white-to-cyan
     across its top 40%, and 40% of a sphere measured near the horizon is most of
     its solid angle, so the average was mid-cyan. Every roughened facet
     therefore returned mid-cyan no matter how black its albedo was, and the
     "black" optical class could not produce a black pixel. That is the whole of
     "ours is still too blue overall": not the albedo, not the facets, the
     reflected average.

     So the gradient is now essentially a dark room. The white cap is a sliver,
     the cyan is a thin band, and everything from a fifth of the way down is
     near black. The bright values the crystal needs come from the light cards
     below, which are SMALL — small enough that a broad rough reflection barely
     touches one, and only a smooth facet aimed straight at a card lights up.
     Dark average, hot local sources: that is what "mostly black with sudden
     silver catches" is made of. */
  grad.addColorStop(0.00, '#ffffff');   /* zenith: a sliver of white cap */
  grad.addColorStop(0.05, '#cfe9f7');
  grad.addColorStop(0.11, '#4e8ea8');   /* falls away immediately */
  grad.addColorStop(0.18, '#123243');   /* the thin cyan band */
  grad.addColorStop(0.27, '#061019');
  grad.addColorStop(0.68, '#03070c');
  /* The lower hemisphere is genuinely dark. It was lifted once because the
     arms were rendering as flat black bars — but the real cause was that they
     had no facet variation to catch anything with, not that the floor was too
     dark. Now that the limbs are properly faceted, this can go back to near
     black, which is what lets some planes on him read as truly dark and gives
     the value hierarchy its bottom end. */
  grad.addColorStop(1.00, '#050a11');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 128);
  /* LIGHT CARDS — the thing that actually makes a crystal glisten.

     A vertical gradient alone cannot do it, and this took a measurement to
     see: a facet reflects the MIRROR direction, not its own normal. A torso
     that stands roughly vertical and is viewed from the front reflects the
     region around the HORIZON, behind and beside the camera — it essentially
     never reflects the zenith. So brightening the top of the sky raised the
     numbers on nothing; measured, the bright bands stayed at 0%.

     Real product renders solve this with softboxes, and that is what these
     are: a few bright rectangles sitting at horizon height at different
     azimuths, on an otherwise dark sphere. A facet whose reflection lands on a
     card goes bright; its neighbour, angled a few degrees away, stays dark.
     With the irregular facet relief on the body that produces exactly the
     reference's scatter of glinting faces among dark ones.

     x is azimuth (0..256 = full turn), y is elevation (0 = zenith, 64 =
     horizon, 128 = nadir). */
  /* SMALL and HOT, not large and warm.

     The cards were previously wide enough that a facet could hardly avoid one,
     which is another way of saying the sky was bright — it produced a lit body
     rather than a body with catches on it. Shrinking them and pushing them to
     full white turns each one into a source a facet either hits or misses. The
     miss is what makes the neighbouring plane fall to black, and the hit/miss
     alternation across a faceted surface IS the reference's "strategically
     authored randomness".

     There are more of them now, at scattered azimuths and elevations, so the
     catches land all over the body instead of banding down one side. */
  var cards = [
    /* key: the main near-white source, front-left of the character */
    { x: 14, y: 30, w: 34, h: 30, fill: 'rgba(255,255,255,1)' },
    /* a second hot pinpoint just off the key — the true white catches */
    { x: 52, y: 48, w: 14, h: 12, fill: 'rgba(255,255,255,1)' },
    /* fill: cool, weaker, opposite side */
    { x: 152, y: 44, w: 26, h: 22, fill: 'rgba(198,236,252,0.75)' },
    /* rim: narrow bright cyan, behind — the chromatic catches */
    { x: 216, y: 26, w: 18, h: 30, fill: 'rgba(150,244,255,0.95)' },
    { x: 188, y: 62, w: 12, h: 12, fill: 'rgba(120,232,255,0.85)' },
    /* a low silver bounce so downward-tilted facets are not uniformly dead */
    { x: 96, y: 82, w: 20, h: 14, fill: 'rgba(228,244,255,0.55)' },

    /* THE CAMERA-SIDE KEY — the reason the body had no silver catches.

       A facet reflects its MIRROR direction, and for a plane facing the viewer
       that direction points straight back at the camera. In equirectangular
       terms the camera (+z) sits at u = atan2(1,0)/2pi + 0.5 = 0.75, i.e. x
       around 192 of 256. Every card was off to the sides, so the whole front of
       the character was reflecting empty black sky and no amount of raising
       envMapIntensity could produce a highlight there — the reflected content
       was zero.

       These two sit around that direction. Only facets whose relief happens to
       aim them at one will catch it, so what lands is a scatter of bright
       planes across the chest and shoulders rather than a uniform sheen —
       which is exactly the reference's behaviour.

       SIZE, corrected twice. It was cut from 26x22 to 15x13 while chasing a pale
       wash across the upper chest — on the theory that a source facing the
       camera lights a broad front square-on and so stops being a catch. That
       theory was wrong: the wash was the torso's rim shell, found later by
       isolation, and shrinking this card had only starved the chest of the one
       light its front planes can actually see.

       Back to a middle size. Large enough that the flared chest has something
       to read by now the shell is gone, small enough that facets still hit or
       miss it rather than all catching it together. */
    { x: 202, y: 50, w: 21, h: 18, fill: 'rgba(255,255,255,1)' },
    /* THE SHOULDER-TOP CARD.

       The deltoids were rendering as flat black masses, and the geometry was
       not the reason. An upward-facing facet does not reflect the sky: mirror
       the view vector about an up normal and the result points BACKWARD and
       slightly up, which in this projection lands around x=64, y=56 — a region
       that was empty. So every up-facing plane on the character, which is most
       of both shoulders, was reflecting nothing.

       This is the card those planes actually see. It is the reason the shoulder
       tops now catch light while their outer and under surfaces stay dark,
       which is the read Reference A has.
       Held near full strength. It was briefly cut to 0.58 while chasing a pair
       of blown white patches on the shoulders, which turned out to be a capped
       tube end standing proud of the chest rather than anything to do with
       lighting. The brief is explicit that the shoulder must not become one
       giant dark mass, and this card is the only thing keeping it from that. */
    { x: 68, y: 54, w: 28, h: 22, fill: 'rgba(255,255,255,0.84)' },
    { x: 176, y: 68, w: 18, h: 15, fill: 'rgba(226,246,255,0.85)' },

    /* A NOTE ON WHAT IS DELIBERATELY NOT HERE.

       Four more cards were added at one point on calculated reflection
       directions for the head's crown bands — x~140 and x~244 at the horizon,
       x~192 near both poles — because the head was rendering black and the
       shoulder-top card's lesson suggested it was reflecting a gap. The real
       cause was that those bands were wound inward and culled entirely (see
       forge.js), and once that was fixed the four cards measured as a visible
       no-op and were removed rather than left in as decoration. Recorded
       because the reasoning was sound and only the premise was wrong: if a part
       is dark, check that it is being DRAWN before working out what it sees. */

    /* THE MIDTONE TIER — larger, dimmer, and the reason this list has two
       kinds of entry.

       With only small hot cards on a black sphere a facet either hits a source
       or misses it, so the body came out bimodal: measured, 86% of the
       character's pixels sat in the two darkest bands and 5% in the brightest,
       with almost nothing between. The reference is not bimodal — it runs
       33/28/15/9/6/4/3/3 straight down the range, and that continuous middle is
       most of what makes it read as a solid object rather than a lit outline.

       A midtone is a PARTIAL catch, which needs a source big enough to clip
       with the edge of a reflection lobe and dim enough not to blow out when it
       does. These are those: broad, weak, spread around the sphere so most
       facets graze one. The hot cards above still supply the sparse silver. */
    /* R90 — ROUGHLY DOUBLED, on measurement rather than taste.

       An eight-band luminance histogram of the character against the anatomical
       reference: this render had 66.3% of its lit pixels in the darkest band
       where the reference has 39.0%, and 19.3% in the second where the reference
       has 38.8%. That is a midtone deficit of about 27 points of the character's
       area — not a look, a hole. The bright tail was short too, 2.3% above 160
       against the reference's 5.6%.

       AND THEN THE MEASUREMENT WAS RE-READ AND SAID THE OPPOSITE.

       That first histogram sampled a box around the whole character, so most of
       what it counted was BACKGROUND — and the reference's background is a lit
       cloudscape while this one is a near-black room. It was measuring the sky
       and calling it the body.

       Re-run over a box that is entirely chest in both images, the finding
       inverts: the reference's chest is 49.2% near-black with 19.5% of its
       pixels above 160, and this render's was 5.9% near-black with 7.6% above
       160 — a mean of 80 against the reference's 66. The body was not too dark.
       It was too UNIFORM: a midtone mush with neither a black end nor a bright
       one, which is precisely what "triangle soup" looks like from across a
       room, and doubling these cards made it worse.

       So they come back down, slightly below where they started, and the bright
       end is bought with envMapIntensity instead (see materials.js) — which
       stretches the reflected tail without lifting the blacks, exactly the
       distinction rule 3 in CLAUDE.md draws. The two low cards stay, at a low
       value, because the undersides of the arms genuinely were reflecting an
       empty hemisphere; that is a gap in coverage rather than a level. */
    { x: 66, y: 34, w: 60, h: 44, fill: 'rgba(150,186,208,0.26)' },
    { x: 120, y: 66, w: 72, h: 40, fill: 'rgba(120,160,186,0.22)' },
    { x: 232, y: 54, w: 56, h: 44, fill: 'rgba(132,172,198,0.24)' },
    { x: 4, y: 70, w: 52, h: 38, fill: 'rgba(112,150,178,0.20)' },
    { x: 172, y: 18, w: 48, h: 32, fill: 'rgba(140,178,204,0.18)' },
    { x: 148, y: 92, w: 64, h: 34, fill: 'rgba(118,156,184,0.20)' },
    { x: 28, y: 96, w: 58, h: 32, fill: 'rgba(110,148,178,0.18)' }
  ];
  /* R91 — ANGULAR STRUCTURE, so a turning facet has something to travel THROUGH.

     A first attempt put a wide soft halo around every card. It measured as a
     failure in the most instructive way: the share of the character above 140
     luma went from 10-12% to 22-25% — it brightened him by half again — while
     the frame-to-frame shading drift did not move at all (3.05% to 3.23%). A
     broad soft halo is a bigger sky, not a travel path. It has a LOW angular
     gradient by construction, which is the opposite of what motion needs.

     What motion needs is many moderate features at many azimuths. A facet
     reflects its mirror direction, so a 5-degree body rotation sweeps the
     reflection about 10 degrees, i.e. roughly 7 px across this 256-wide map.
     Features on that scale mean a facet is always crossing something: it climbs
     a strip, crests, falls, and climbs the next one, continuously, instead of
     sitting in black until it happens to hit a hot card.

     So: soft vertical striations across the horizon band, dim enough that they
     barely register in a still frame and structured enough that they carry the
     motion. Deterministic — the same bars every mount, never Math.random(). */
  var STRIPES = 13;
  for (var sIdx = 0; sIdx < STRIPES; sIdx++) {
    var sx = (sIdx + 0.5) * (256 / STRIPES);
    /* deterministic per-stripe variation so the ring is not a regular comb */
    var wob = Math.sin(sIdx * 12.9898) * 43758.5453;
    wob = wob - Math.floor(wob);
    var sw = 9 + wob * 9;
    var sa = 0.135 + wob * 0.185;
    var sy = 30 + wob * 18;
    var sh = 52 + wob * 28;
    var grad2 = g.createLinearGradient(sx - sw, 0, sx + sw, 0);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(0.5, 'rgba(172,212,236,' + sa.toFixed(3) + ')');
    grad2.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad2;
    g.fillRect(sx - sw, sy, sw * 2, sh);
  }

  cards.forEach(function (c2) {
    var grd = g.createRadialGradient(
      c2.x + c2.w / 2, c2.y + c2.h / 2, 0,
      c2.x + c2.w / 2, c2.y + c2.h / 2, Math.max(c2.w, c2.h) / 2);
    grd.addColorStop(0, c2.fill);
    grd.addColorStop(0.55, c2.fill.replace(/[\d.]+\)$/, '0.35)'));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(c2.x - c2.w * 0.2, c2.y - c2.h * 0.2, c2.w * 1.4, c2.h * 1.4);
  });

  /* Hard bands over the smooth gradient.

     A pure gradient makes neighbouring facets reflect almost the same value,
     and measured against the reference that piled 50% of the character's
     pixels into a single mid-tone band where the reference spreads them evenly
     from black to white. Discrete steps give adjacent facets genuinely
     different reflections, which is what a real cut crystal does. */
  /* The bright bands are now thin and the dark bands wide, for the same reason
     the gradient was rebalanced: a band spanning the horizon covers an enormous
     solid angle, so a "subtle" 0.30 cyan stripe there was lifting the sphere's
     average more than the white cap was. Bright steps stay, but as slivers. */
  var bands = [
    [0, 4, 'rgba(255,255,255,0.45)'],
    [46, 14, 'rgba(4,9,14,0.72)'],
    [66, 3, 'rgba(170,228,248,0.30)'],
    [80, 18, 'rgba(3,7,11,0.70)'],
    [110, 3, 'rgba(120,190,220,0.18)']
  ];
  bands.forEach(function (b) { g.fillStyle = b[2]; g.fillRect(0, b[0], 256, b[1]); });

  var tex = new CanvasTexture(c);
  tex.mapping = EquirectangularReflectionMapping;
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;

  var pmrem = new PMREMGenerator(renderer);
  var target = pmrem.fromEquirectangular(tex);
  pmrem.dispose();
  tex.dispose();
  return target;
}

/* Linear, not exponential, and that choice matters. FogExp2 fogs by absolute
   distance from the camera, so any density strong enough to dissolve the grid's
   far edge (~28 units) also puts visible haze on the character, who sits a
   fixed ~7 units away. Linear fog with an explicit near lets the subject stay
   completely clean while the floor still fades to nothing. */
export var FOG = { near: 11, far: 42 };

export function createStage(options) {
  var opts = options || {};
  var palette = opts.palette;
  var settings = opts.settings || { fog: true };

  var scene = new Scene();
  /* Transparent clear colour: MAHFITT's own background shows through, so the
     3D stage composites into the page instead of punching a black hole in it.
     The scene therefore has no .background of its own by design. */
  scene.background = null;

  if (settings.fog) {
    scene.fog = new Fog(new Color(palette.fog).getHex(), FOG.near, FOG.far);
  }

  var envTarget = null;
  if (opts.renderer) {
    envTarget = buildEnvironment(opts.renderer, palette);
    scene.environment = envTarget.texture;
  }

  /* Two roots, deliberately separate.

     'world' holds everything the member should read as fixed reality: floor,
     grid, environment. 'subject' holds Mr.Mah. Interaction rotates the
     subject, never the world — so dragging the character does not swing the
     room around him, and a future camera orbit can move the camera without
     fighting a character transform. */
  var world = new Group();
  world.name = 'mrmah-world';
  var subject = new Group();
  subject.name = 'mrmah-subject';
  scene.add(world);
  scene.add(subject);

  function dispose() {
    /* Depth-first geometry/material release. Textures are released via each
       material's own map slots. Phase 1 has none, but the traversal is written
       now so later phases cannot forget it. */
    scene.traverse(function (obj) {
      if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
      var mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
      mats.forEach(function (m) {
        if (!m) return;
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']
          .forEach(function (slot) { if (m[slot] && m[slot].dispose) m[slot].dispose(); });
        if (m.dispose) m.dispose();
      });
    });
    if (envTarget) { envTarget.dispose(); envTarget = null; scene.environment = null; }
    scene.clear();
  }

  /* Per-mode atmospheric depth. A chat stage wants haze starting closer and
     reaching further than a tight portrait does, and that is a property of
     the composition, not of the scene. */
  function setFog(near, far) {
    if (!scene.fog) return;
    if (near != null) scene.fog.near = near;
    if (far != null) scene.fog.far = far;
  }

  return {
    scene: scene, world: world, subject: subject,
    /* Exposed so the character's material can take the env map EXPLICITLY.
       Relying on scene.environment alone left the body reflecting nothing that
       responded to envMapIntensity — measured, values of 1, 2.4 and 4 produced
       byte-identical frames, while a mirror test proved the environment itself
       was rich. Assigning material.envMap puts the intensity back under
       control, which is the knob the whole value hierarchy is built on. */
    environment: envTarget ? envTarget.texture : null,
    setFog: setFog, dispose: dispose
  };
}
