/* MR.MAH 3D :: BLOOM
   A small, selective bloom — and nothing more than that.

   WHY IT IS WRITTEN BY HAND

   Three's EffectComposer and UnrealBloomPass live in `examples/jsm`, which this
   project does not vendor: the package ships two files and no bundler, and
   pulling an addon tree in for one effect would be a much larger change than
   the effect is worth. What is actually needed here is also far smaller than
   UnrealBloom, which runs a five-level mip chain: this is one bright pass and
   one separable blur at quarter resolution.

   WHAT IT IS FOR, AND WHAT IT IS NOT FOR

   The brief permits bloom only once the underlying material is good, and lists
   what it should help: the eyes, the smile, the hero edges, the brightest
   crystal catches, the hover emitter. It must not flatten facets, make the body
   cyan, wash out the face, or become the source of depth.

   The threshold is what enforces that. At 0.80 only genuinely bright pixels
   contribute — the emissive face features, the hero edge highlights, the floor
   glow, and the rare near-white facet catch. The dark and mid crystal, which is
   most of the character, contributes nothing at all and is therefore untouched.
   Bloom here is a highlight treatment, not a filter over the frame.

   COST

   One scene render into a target, then three fullscreen passes at quarter area.
   The blur is separable, so it is two 9-tap passes rather than one 81-tap. On
   the low tier it is not created at all and the renderer draws straight to the
   canvas as before, so the cheapest devices pay nothing.

   TRANSPARENCY

   MAHFITT's page background shows through the canvas, so the composite has to
   preserve alpha rather than assuming black behind. Bloom also has to be able
   to ADD alpha: a glow spreading past the silhouette sits over pixels the scene
   left empty, and without that it would be invisible against the page. */

import {
  WebGLRenderTarget, ShaderMaterial, OrthographicCamera, Scene, Mesh,
  PlaneGeometry, Vector2, LinearFilter, ClampToEdgeWrapping,
  NoBlending
} from '../vendor/three/three.module.min.js';

var VERT = [
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = uv;',
  '  gl_Position = vec4( position.xy, 0.0, 1.0 );',
  '}'
].join('\n');

/* Bright pass. Runs on the tone-mapped, display-encoded scene colour — see the
   colour-space note on the composite below — so the threshold is in the space
   the eye judges the frame in: a pixel that looks bright blooms.

   `smoothstep` rather than a hard cut: a hard threshold makes bloom pop on and
   off as a highlight drifts across it, which is very visible on a slowly
   rotating crystal. */
var BRIGHT = [
  'uniform sampler2D tDiffuse;',
  'uniform float uThreshold;',
  'uniform float uSoft;',
  'varying vec2 vUv;',
  'void main() {',
  '  vec4 c = texture2D( tDiffuse, vUv );',
  '  float l = dot( c.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );',
  '  float w = smoothstep( uThreshold, uThreshold + uSoft, l );',
  '  gl_FragColor = vec4( c.rgb * w, 1.0 );',
  '}'
].join('\n');

/* Separable Gaussian, 9 taps, direction supplied as a uniform so one material
   serves both passes. */
var BLUR = [
  'uniform sampler2D tDiffuse;',
  'uniform vec2 uDir;',
  'varying vec2 vUv;',
  'void main() {',
  '  vec3 sum = texture2D( tDiffuse, vUv ).rgb * 0.2270270270;',
  '  sum += texture2D( tDiffuse, vUv + uDir * 1.3846153846 ).rgb * 0.3162162162;',
  '  sum += texture2D( tDiffuse, vUv - uDir * 1.3846153846 ).rgb * 0.3162162162;',
  '  sum += texture2D( tDiffuse, vUv + uDir * 3.2307692308 ).rgb * 0.0702702703;',
  '  sum += texture2D( tDiffuse, vUv - uDir * 3.2307692308 ).rgb * 0.0702702703;',
  '  gl_FragColor = vec4( sum, 1.0 );',
  '}'
].join('\n');

var COMPOSITE = [
  'uniform sampler2D tScene;',
  'uniform sampler2D tBloom;',
  'uniform float uStrength;',
  'varying vec2 vUv;',
  /* COLOUR SPACE, established by experiment rather than by reading the docs,
     because two plausible configurations both looked wrong in different ways.

     Three writes DISPLAY-ENCODED (sRGB) colour into the render target either
     way. What the target's `colorSpace` actually changes is whether a shader
     sampling it gets DECODED back to linear:

       target marked sRGB, no encode here  -> decoded on sample, linear written
                                              to the canvas: midtones crushed,
                                              the torso's facet variation gone
       target left default, encode here    -> not decoded, encoded twice:
                                              the whole character blown out cyan

     Both were caught by capturing the same frame at the low tier — which
     bypasses this file entirely and draws straight to the canvas — and
     comparing. That side-by-side is the only reason the first one was
     identifiable at all: the emissive features still looked bright, so the
     frame did not obviously read as "wrong colour space", just as "flatter".

     So: targets stay default, and nothing is converted here. The sum happens in
     display space, which is not where light physically adds, but the values
     being summed are a thresholded highlight pass — the error is invisible and
     the alternative costs a second conversion per pass. */
  'void main() {',
  '  vec4 base = texture2D( tScene, vUv );',
  '  vec3 glow = texture2D( tBloom, vUv ).rgb * uStrength;',
  '  float ga = clamp( dot( glow, vec3( 0.2126, 0.7152, 0.0722 ) ), 0.0, 1.0 );',
  '  gl_FragColor = vec4( base.rgb + glow, clamp( base.a + ga, 0.0, 1.0 ) );',
  '}'
].join('\n');

function quad(material) {
  var scene = new Scene();
  scene.add(new Mesh(new PlaneGeometry(2, 2), material));
  return scene;
}

function target(w, h) {
  return new WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    minFilter: LinearFilter, magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping,
    depthBuffer: false, stencilBuffer: false
  });
}

export function createBloom(options) {
  var opts = options || {};
  var renderer = opts.renderer;
  var strength = opts.strength == null ? 0.62 : opts.strength;
  var threshold = opts.threshold == null ? 0.80 : opts.threshold;

  /* The scene target needs a depth buffer — it is what the 3D pass draws into.
     Left at its default colour space so a shader sampling it gets the values
     three wrote, unconverted — see the composite. */
  /* MSAA on the scene target, or the high tier silently loses its
     antialiasing. The canvas was created with antialias:true, but once the 3D
     pass draws into a render target instead of the canvas that setting applies
     to a framebuffer nothing is being rendered into any more — the target has
     its own sample count, and it defaults to 1. On a character made almost
     entirely of small facet edges the difference is very visible: every plane
     boundary goes ragged and the surface reads coarser than it is. */
  var rtScene = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter, magFilter: LinearFilter,
    depthBuffer: true, stencilBuffer: false,
    samples: opts.samples || 0
  });

  var rtA = target(1, 1);
  var rtB = target(1, 1);

  var brightMat = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: BRIGHT,
    uniforms: {
      tDiffuse: { value: rtScene.texture },
      uThreshold: { value: threshold },
      uSoft: { value: 0.20 }
    },
    depthTest: false, depthWrite: false
  });
  var blurMat = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: BLUR,
    uniforms: { tDiffuse: { value: null }, uDir: { value: new Vector2() } },
    depthTest: false, depthWrite: false
  });
  var compositeMat = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: COMPOSITE,
    uniforms: {
      tScene: { value: rtScene.texture },
      tBloom: { value: rtA.texture },
      uStrength: { value: strength }
    },
    /* NoBlending, and this matters more than it looks.

       With the default transparent blending the quad is composited ONTO the
       canvas' transparent clear, so the result is rgb * alpha — and since three
       already renders premultiplied into the target, the colour gets multiplied
       by its alpha a second time. Everything low-alpha loses most of its value:
       measured, the floor grid nearly disappeared while the opaque character
       looked fine, which is exactly the signature of a stray premultiply.

       Writing the fragment verbatim keeps the target's premultiplied convention
       intact all the way to the page. */
    depthTest: false, depthWrite: false, blending: NoBlending
  });

  var brightScene = quad(brightMat);
  var blurScene = quad(blurMat);
  var compositeScene = quad(compositeMat);
  var cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  var w = 1, h = 1, bw = 1, bh = 1;

  function setSize(width, height, pixelRatio) {
    var r = pixelRatio || 1;
    w = Math.max(1, Math.floor(width * r));
    h = Math.max(1, Math.floor(height * r));
    /* Quarter area. The blur is what gives the glow its spread, so resolution
       here buys almost nothing visually and costs directly. */
    bw = Math.max(1, Math.floor(w / 2));
    bh = Math.max(1, Math.floor(h / 2));
    rtScene.setSize(w, h);
    rtA.setSize(bw, bh);
    rtB.setSize(bw, bh);
  }

  function render(scene, camera) {
    var prevTarget = renderer.getRenderTarget();

    renderer.setRenderTarget(rtScene);
    renderer.clear();
    renderer.render(scene, camera);

    /* Bright pass -> rtA */
    brightMat.uniforms.tDiffuse.value = rtScene.texture;
    renderer.setRenderTarget(rtA);
    renderer.clear();
    renderer.render(brightScene, cam);

    /* Blur horizontally into rtB, then vertically back into rtA. */
    blurMat.uniforms.tDiffuse.value = rtA.texture;
    blurMat.uniforms.uDir.value.set(1 / bw, 0);
    renderer.setRenderTarget(rtB);
    renderer.clear();
    renderer.render(blurScene, cam);

    blurMat.uniforms.tDiffuse.value = rtB.texture;
    blurMat.uniforms.uDir.value.set(0, 1 / bh);
    renderer.setRenderTarget(rtA);
    renderer.clear();
    renderer.render(blurScene, cam);

    renderer.setRenderTarget(prevTarget);
    renderer.clear();
    renderer.render(compositeScene, cam);
  }

  function setStrength(v) {
    compositeMat.uniforms.uStrength.value = Math.max(0, Number(v) || 0);
  }

  function dispose() {
    rtScene.dispose(); rtA.dispose(); rtB.dispose();
    brightMat.dispose(); blurMat.dispose(); compositeMat.dispose();
    [brightScene, blurScene, compositeScene].forEach(function (s) {
      s.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    });
  }

  return {
    render: render, setSize: setSize, setStrength: setStrength,
    dispose: dispose,
    get strength() { return compositeMat.uniforms.uStrength.value; }
  };
}
