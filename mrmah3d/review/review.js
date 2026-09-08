/* MAH 3D REVIEW — development-only turntable.

   The final-refinement pack asks for a lightweight review route: orbit, zoom,
   front / three-quarter / side / rear, and a neutral clay mode beside the
   crystal and platinum ones, so every change can be inspected rather than
   argued about. This is that page.

   IT IS A HARNESS, NOT PART OF THE RENDERER. Nothing in core/ imports it and it
   acquires no renderer logic: orbit and zoom are driven entirely through the
   public surface `createMrMahScene()` already exposes — `parts.character.setYaw`
   for the body's turn, `parts.camera.camera` / `.target` for the eye. If a
   behaviour here ever matters to a product surface it belongs in core/, where
   AI Chat and MAH Protocol would get it too.

   WHY IT ORBITS THE CAMERA AND TURNS THE BODY SEPARATELY. The character's yaw
   is his own — the drag gesture in interaction.js drives it, states can drive
   it, and turning the body is what makes his facets travel through the light.
   The camera's elevation and distance are the REVIEWER's, and they must not
   change what the light is doing. Keeping them apart is what lets a rear view
   be compared against a front one honestly. */

import { createMrMahScene, isSupported, VERSION } from '../core/mrmah-scene.js';

var host = document.getElementById('stage');
var readout = document.getElementById('readout');
var scene = null;

var params = new URLSearchParams(location.search || '');

/* Same development affordances the lab carries, so a capture taken here can be
   compared against one taken there. */
var forcedTier = params.get('tier');
if (['high', 'medium', 'low'].indexOf(forcedTier) === -1) forcedTier = null;
var brightParam = params.get('bright');
if (brightParam && /^\s*\d+\s*,\s*\d+\s*,\s*\d+\s*$/.test(brightParam)) {
  document.documentElement.style.setProperty('--bright-rgb', brightParam);
}

/* THE FRAMINGS.

   Each is a target height on the character and a distance multiplier against
   the solved whole-body distance, so they hold at any host aspect and for
   either character — a hardcoded camera is correct for exactly one viewport,
   which is the mistake composition.js exists to avoid. `t` is a fraction of
   the character's own height, measured from the terminal point up. */
var FRAMINGS = {
  full:  { t: 0.52, scale: 1.00 },
  torso: { t: 0.66, scale: 0.46 },   /* chest, shoulders, both arms */
  lower: { t: 0.30, scale: 0.44 },   /* the quad / knee / calf architecture */
  head:  { t: 0.86, scale: 0.24 }
};

var state = {
  who: params.get('variant') || 'male',
  surface: params.get('debug') || '',
  framing: 'full',
  yawDeg: 0,
  pitchDeg: 0,          /* reviewer elevation, added to the solved pitch */
  zoom: 1,              /* multiplier on the framing's distance */
  spinning: false,
  isolated: params.get('isolate') === '1',
  pose: 'neutral'
};

var solved = null;      /* the camera the composition solver produced */

function say(text, isError) {
  readout.textContent = text;
  if (isError) readout.setAttribute('data-error', '1');
  else readout.removeAttribute('data-error');
}

window.__MRMAH_REVIEW = {
  version: VERSION,
  mounted: false,
  errors: [],
  get scene() { return scene; },
  get state() { return state; },
  /* The verification harness sets a view and captures, rather than scraping
     the DOM or synthesising pointer events. */
  set: function (next) { Object.assign(state, next || {}); syncButtons(); apply(); },
  info: function () { return scene ? scene.info() : null; }
};

window.addEventListener('error', function (e) {
  window.__MRMAH_REVIEW.errors.push(String(e.message || e));
});
window.addEventListener('unhandledrejection', function (e) {
  window.__MRMAH_REVIEW.errors.push('unhandledrejection: ' + String((e.reason && e.reason.message) || e.reason));
});

function mount() {
  if (scene) return;
  if (!isSupported()) {
    say('WebGL is not available in this browser.', true);
    return;
  }
  try {
    scene = createMrMahScene(host, {
      tier: forcedTier || undefined,
      variant: state.who === 'male' ? undefined : state.who,
      /* `showcase` is the evaluation composition — he fills the frame, dead
         front, centred. It is NOT an app composition and must never be used as
         one; it is exactly right for a review page. */
      mode: 'showcase',
      preserveDrawingBuffer: true
    });
    window.__MRMAH_REVIEW.mounted = true;
    var cam = scene.parts.camera;
    solved = {
      position: cam.camera.position.clone(),
      target: cam.target.clone(),
      distance: cam.camera.position.distanceTo(cam.target),
      height: scene.parts.character.height || 3
    };
    state.pose = 'neutral';
    apply();
  } catch (err) {
    window.__MRMAH_REVIEW.errors.push(String((err && err.message) || err));
    say('Mount failed: ' + ((err && err.message) || err), true);
  }
}

function unmount() {
  if (!scene) return;
  scene.destroy();
  scene = null;
  solved = null;
  window.__MRMAH_REVIEW.mounted = false;
}

/* Place the eye. The character's own yaw does the turning, so the camera only
   ever moves in elevation and distance — it stays on the scene's front axis and
   the key light therefore means the same thing in every capture. */
function place() {
  if (!scene || !solved) return;
  var cam = scene.parts.camera.camera;
  var target = scene.parts.camera.target;
  var f = FRAMINGS[state.framing] || FRAMINGS.full;

  var targetY = solved.height * f.t;
  var distance = solved.distance * f.scale * state.zoom;
  var pitch = state.pitchDeg * Math.PI / 180;

  target.set(0, targetY, 0);
  cam.position.set(0, targetY + distance * Math.sin(pitch), distance * Math.cos(pitch));
  cam.lookAt(target);
  cam.updateProjectionMatrix();
}

/* ISOLATE — hide everything that is not the character.

   The retained evidence for both characters is an isolated figure on a flat
   ground, and that is not decoration: the package's own rule is that value is
   compared over the BODY, never over the frame. With the world in, the mist,
   the moon and the floor glow are most of what a histogram counts, and a
   silhouette read against a lit cloudscape is a different measurement from one
   read against a room. So this hides the scene's children rather than dimming
   them — `visible = false` set at build time does not survive applyMode(), but
   set here, after the mode is applied, it does. */
function isolate(on) {
  if (!scene) return;
  var keep = scene.parts.character.root;
  scene.parts.stage.scene.children.forEach(function (o) {
    if (o === keep || o.isLight || o.isCamera) return;
    if (o.userData.__rvVisible === undefined) o.userData.__rvVisible = o.visible;
    o.visible = on ? false : o.userData.__rvVisible;
  });
}

function apply() {
  if (!scene) return;
  scene.setDebugView(state.surface || null);
  isolate(state.isolated);
  scene.parts.character.setYaw(state.yawDeg * Math.PI / 180);
  place();
}

/* ---- orbit, zoom ------------------------------------------------------- */

var drag = null;
host.addEventListener('pointerdown', function (e) {
  if (!scene) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: state.yawDeg, pitch: state.pitchDeg };
  host.setPointerCapture(e.pointerId);
  host.setAttribute('data-dragging', '1');
  state.spinning = false;
  syncButtons();
});
host.addEventListener('pointermove', function (e) {
  if (!drag || e.pointerId !== drag.id) return;
  state.yawDeg = drag.yaw + (e.clientX - drag.x) * 0.45;
  /* Bounded elevation: past about 55 degrees the floor grid fills the frame and
     the silhouette can no longer be read, which is what this page is for. */
  state.pitchDeg = Math.max(-38, Math.min(55, drag.pitch - (e.clientY - drag.y) * 0.22));
  apply();
});
function endDrag(e) {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  drag = null;
  host.removeAttribute('data-dragging');
}
host.addEventListener('pointerup', endDrag);
host.addEventListener('pointercancel', endDrag);

host.addEventListener('wheel', function (e) {
  if (!scene) return;
  e.preventDefault();
  state.zoom = Math.max(0.16, Math.min(3.0, state.zoom * (e.deltaY > 0 ? 1.09 : 1 / 1.09)));
  place();
}, { passive: false });

host.addEventListener('dblclick', function () { resetView(); });

function resetView() {
  state.yawDeg = 0; state.pitchDeg = 0; state.zoom = 1; state.framing = 'full';
  state.spinning = false;
  syncButtons();
  apply();
}

/* ---- controls ---------------------------------------------------------- */

function press(groupId, match) {
  var group = document.getElementById(groupId);
  if (!group) return;
  Array.prototype.forEach.call(group.querySelectorAll('button'), function (b) {
    b.setAttribute('aria-pressed', String(match(b)));
  });
}

function syncButtons() {
  press('who', function (b) { return b.getAttribute('data-who') === state.who; });
  press('surface', function (b) { return (b.getAttribute('data-surface') || '') === state.surface; });
  press('framing', function (b) { return b.getAttribute('data-zoom') === state.framing; });
  press('views', function (b) {
    var y = ((Number(b.getAttribute('data-yaw')) % 360) + 360) % 360;
    return Math.abs(((state.yawDeg % 360) + 360) % 360 - y) < 0.5;
  });
  press('motion', function (b) {
    var act = b.getAttribute('data-act');
    if (act === 'spin') return state.spinning;
    if (act === 'still') return !state.spinning;
    if (act === 'pose') return state.pose !== 'neutral';
    if (act === 'isolate') return state.isolated;
    return false;
  });
  var poseBtn = document.querySelector('#motion [data-act="pose"]');
  if (poseBtn) poseBtn.disabled = !scene ||
    !(scene.parts.character.setPresentationPose || (scene.parts.character.poseNames || []).length > 1);
}

document.getElementById('who').addEventListener('click', function (e) {
  var who = e.target && e.target.getAttribute('data-who');
  if (!who || who === state.who) return;
  state.who = who;
  say('building ' + who + '…');
  /* Mrs. Mah's regional sculpt is a long build; yield a frame so the readout
     paints before the main thread is taken. */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      unmount();
      state.pitchDeg = 0; state.zoom = 1;
      mount();
      syncButtons();
    });
  });
});

document.getElementById('views').addEventListener('click', function (e) {
  var yaw = e.target && e.target.getAttribute('data-yaw');
  if (yaw == null) return;
  state.yawDeg = Number(yaw);
  state.spinning = false;
  syncButtons();
  apply();
});

document.getElementById('surface').addEventListener('click', function (e) {
  var s = e.target && e.target.getAttribute('data-surface');
  if (s == null) return;
  state.surface = s;
  syncButtons();
  apply();
});

document.getElementById('framing').addEventListener('click', function (e) {
  var f = e.target && e.target.getAttribute('data-zoom');
  if (!f) return;
  state.framing = f;
  state.zoom = 1;
  syncButtons();
  place();
});

document.getElementById('motion').addEventListener('click', function (e) {
  var act = e.target && e.target.getAttribute('data-act');
  if (!act) return;
  if (act === 'spin') state.spinning = true;
  if (act === 'still') state.spinning = false;
  if (act === 'reset') { resetView(); return; }
  if (act === 'pose' && scene) {
    /* Two controllers, one button. Mr. Mah's presentation (hero-pose.js) and
       Mrs. Mah's hero pose (mrs-hero-pose.js) are separate owners with the same
       two modes; neither is reachable for the other character. */
    var c = scene.parts.character;
    var next = state.pose === 'neutral' ? 'hero' : 'neutral';
    state.pose = (c.setPresentationPose ? c.setPresentationPose(next) : null) ||
      ((c.poseNames || []).indexOf(next) !== -1 ? c.setPose(next) : 'neutral');
  }
  if (act === 'isolate') state.isolated = !state.isolated;
  syncButtons();
});

/* ---- readout ----------------------------------------------------------- */

var last = 0;
function tick(now) {
  requestAnimationFrame(tick);
  if (!scene) {
    if (!window.__MRMAH_REVIEW.errors.length && !window.__MRMAH_REVIEW.mounted) say('destroyed.');
    return;
  }
  if (state.spinning) {
    state.yawDeg = (state.yawDeg + (now - last) * 0.018) % 360;
    scene.parts.character.setYaw(state.yawDeg * Math.PI / 180);
  }
  last = now;
  if (now % 4 > 3.9) return;

  var i = scene.info();
  var c = scene.parts.character;
  say([
    'mrmah3d ' + i.version + '   character ' + (c.variant || 'male') + '   pose ' + state.pose,
    'view        yaw ' + state.yawDeg.toFixed(1) + '°   elevation ' + state.pitchDeg.toFixed(1) +
      '°   framing ' + state.framing + '   zoom ' + state.zoom.toFixed(2),
    'surface     ' + (state.surface || 'material (crystal + platinum coat)') +
      (state.isolated ? '   ISOLATED (world hidden)' : ''),
    'stage       ' + i.width + ' x ' + i.height + ' css   dpr ' + i.pixelRatio + '   fov ' + i.fov + '°   tier ' + i.tier,
    'frame       ' + i.stats.avgMs.toFixed(2) + ' ms   ~' + i.stats.fps + ' fps',
    'gpu         ' + i.drawCalls + ' draws   ' + i.triangles + ' tris   ' + i.geometries + ' geometries',
    window.__MRMAH_REVIEW.errors.length ? 'ERRORS      ' + window.__MRMAH_REVIEW.errors.join(' | ') : ''
  ].filter(Boolean).join('\n'), window.__MRMAH_REVIEW.errors.length > 0);
}

mount();
syncButtons();
requestAnimationFrame(tick);
