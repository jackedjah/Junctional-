/* MR.MAH 3D :: COMPOSITION
   Page-aware scene direction.

   A camera is not chosen here, it is SOLVED. Each mode declares compositional
   intent — how big Mr.Mah is in frame, where in frame he sits, from what angle
   he is seen, how much world is behind him — and `solveFraming` produces the
   camera position, target and field of view that deliver it at whatever aspect
   ratio the host element happens to be.

   That indirection is the point. A hardcoded camera is correct for exactly one
   viewport and one page; intent survives both.

   ---------------------------------------------------------------------------
   WHY THE MODES LOOK THE WAY THEY DO

   The in-app numbers are taken from the real MAHFITT stage in mygym.css, not
   invented:

     .fabi-character      position:absolute; left:0; bottom:68px;
                          width: 128px * scale;  aspect-ratio 420/560
     presentation         characterX .18          (18% across — LEFT of centre)
     .fabi-response-anchor left:50%; top:14..24px;
                          --fabi-diamond: clamp(318px, 37vw, 392px)
     stage height         620px in AI Chat

   So on the shipped page Mr.Mah is a SMALL figure low and to the left, and the
   response diamond is a LARGE element centred near the top. A centred hero
   render — which is what the reference framing produces — cannot host that
   layout: the diamond would land on his face.

   Every in-app mode therefore places him low and off-centre and leaves the
   upper-centre of the frame as quiet atmosphere for the DOM UI that will sit
   in front of it.

   The showcase mode keeps the reference framing, because that is the view the
   character is evaluated against. It is not an app composition. */

import { MathUtils, Vector3 } from '../vendor/three/three.module.min.js';

/* Solve a camera from compositional intent.

     heightFrac  how much of the frame's HEIGHT the character spans
     screenX/Y   where his centre should land, as fractions of the frame
                 (0,0 = top-left; 0.5,0.5 = centre)
     azimuthDeg  where the camera stands, around him. 0 = dead front.
                 Non-zero is what turns a portrait into a scene: he is seen
                 slightly from the side and reads as occupying space.
     elevation   camera height in world units. Below his mid-height means the
                 viewer looks slightly up at him, which reads as presence.

   Returns { position, target, fov } for the given aspect. */
export function solveFraming(intent, aspect, characterHeight, floatHeight, poseCentreX) {
  var H = characterHeight || 3.0;
  var fov = intent.fov;
  var vHalf = MathUtils.degToRad(fov) / 2;

  /* Distance that makes the character span `heightFrac` of the frame. */
  var dist = H / (2 * Math.tan(vHalf) * intent.heightFrac);

  /* The point on the character we are composing around: his mid-height, and —
     since R90 — his VISUAL centre rather than his origin axis.

     The pose is asymmetric by design: one arm is raised and reaching, the other
     hangs. So the character's silhouette is not centred on x=0, and composing
     around the origin puts him off his intended screen position by exactly that
     asymmetry. It went unnoticed while the arms were short; lengthening them to
     the reference's reach pushed the showcase placement to 0.556 against an
     intent of 0.500 and MODE-showcase caught it.

     The offset is supplied by the caller from the character's own measured
     extents rather than assumed here, so a change to the pose corrects the
     framing automatically instead of silently decentring it. */
  var centreY = (floatHeight == null ? 0.16 : floatHeight) + H / 2;
  var focus = new Vector3(Number(poseCentreX) || 0, centreY, 0);

  /* Camera stands on a circle around him. */
  var az = MathUtils.degToRad(intent.azimuthDeg || 0);
  var camY = intent.elevation == null ? centreY : intent.elevation;
  var position = new Vector3(
    Math.sin(az) * dist,
    camY,
    Math.cos(az) * dist
  );

  /* Now aim so that `focus` lands at (screenX, screenY).

     The camera's forward direction is the direction to the character, rotated
     AWAY from him by exactly the on-screen offset we want. Rotating the aim is
     what shifts him in frame while leaving his own position and the world
     untouched — the alternative, sliding the character sideways, would move
     him off the floor glow and out of the lit pocket he is standing in. */
  /* Both offsets are defined with the SAME polarity — positive means "further
     from the top-left origin" — so they can share one operator below. Defining
     one as (screenX-0.5) and the other as (0.5-screenY) is the natural thing to
     write and it silently inverts the vertical placement: measured, a screenY
     of 0.605 put him at 0.393. */
  var hHalf = Math.atan(Math.tan(vHalf) * aspect);
  var wantH = Math.atan((intent.screenX - 0.5) * 2 * Math.tan(hHalf));
  var wantV = Math.atan((intent.screenY - 0.5) * 2 * Math.tan(vHalf));

  var toFocus = focus.clone().sub(position);
  var horiz = Math.hypot(toFocus.x, toFocus.z);
  var yawToFocus = Math.atan2(toFocus.x, toFocus.z);
  var pitchToFocus = Math.atan2(toFocus.y, horiz);

  /* To place him LEFT of centre the camera aims RIGHT of him; to place him LOW
     in frame it aims ABOVE him. Both are the offset ADDED to the direction
     toward him. Getting either backwards mirrors every preset. */
  var yaw = yawToFocus + wantH;
  var pitch = pitchToFocus + wantV;

  var target = position.clone().add(new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  ).multiplyScalar(dist));

  /* Mobile guard: keep his full width in frame on very narrow stages.

     heightFrac is honoured at any aspect, so he never crops vertically — but a
     tall thin stage shrinks the HORIZONTAL field until his arms run off the
     sides. Where that would happen the vertical FOV is opened just enough to
     hold his width plus a margin. He is then a little smaller than the mode
     asked for, which is the right trade: a cropped character is worse than a
     slightly reduced one. */
  var HALF_WIDTH = H * 0.34;                 /* max half-width incl. the arms */
  var needH = Math.atan((HALF_WIDTH * 1.12) / dist);
  if (hHalf < needH) {
    var grownV = Math.atan(Math.tan(needH) / aspect);
    fov = Math.min(intent.maxFov || 78, MathUtils.radToDeg(grownV * 2));
  }

  return { position: position, target: target, fov: fov, distance: dist };
}

/* ---------------------------------------------------------------------------
   MODES

   `world` scales the environment's emphasis so the same scene can be a hero
   stage or a quiet backdrop without rebuilding anything. */

export var MODES = {
  /* SHOWCASE — the reference framing. Dead front, character large and centred,
     used to evaluate him against reference/mrmah-canonical-front.png. This is
     deliberately NOT an app composition. */
  showcase: {
    label: 'showcase',
    fov: 32,
    heightFrac: 0.670,
    screenX: 0.50,
    screenY: 0.4845,
    azimuthDeg: 0,
    elevation: 1.15,
    world: { grid: 1.0, nodes: 1.0, structures: 0.85, motes: 1.0, glow: 1.0, fogNear: 12, fogFar: 52 },
    state: 'idle'
  },

  /* WEBSITE-CANONICAL — measured off reference/mrmah-refC-luminous-b.png
     (941 x 1671). R95 CORRECTION: the first numbers here (apex 0.090, tip
     0.778) were read by eye from a thumbnail and were wrong by a tenth of the
     frame; an independent review flagged it and a 1.6x crop of the top and
     bottom of the reference settled it — the head apex sits at 0.19 of the
     frame, the taper tip at 0.80, so he spans 0.61 of the height with his
     centre at 0.495, centred horizontally, and the horizon (mist meeting
     floor) lies at ~0.66. More sky above him than the showcase, the mountain
     line and beacons behind his lower half. Dead front. */
  website: {
    label: 'website',
    fov: 34,
    heightFrac: 0.610,
    screenX: 0.50,
    screenY: 0.495,
    azimuthDeg: 0,
    elevation: 0.95,
    world: { grid: 1.0, nodes: 1.0, structures: 1.0, motes: 1.0, glow: 1.0, fogNear: 12, fogFar: 60 },
    state: 'idle'
  },

  /* AI CHAT — he is a presence beside the conversation, not its subject.

     Small (30% of frame height), low and left, seen from his right so he reads
     as standing in a room rather than posing for a portrait. The upper-centre
     is left empty: that is where the response diamond will sit. A wider field
     of view than the showcase pulls more world into frame, which is what makes
     the space feel inhabited. */
  chat: {
    label: 'chat',
    fov: 46,
    heightFrac: 0.300,
    screenX: 0.285,          /* mirrors the shipped characterX of .18-.30 */
    screenY: 0.605,          /* low, clear of the response diamond above */
    azimuthDeg: 22,
    elevation: 1.30,         /* below his chest — the viewer looks slightly up */
    world: { grid: 1.0, nodes: 1.0, structures: 1.0, motes: 1.0, glow: 0.95, fogNear: 10, fogFar: 62 },
    state: 'listening'
  },

  /* MAH PROTOCOL — he is presenting. Slightly larger and closer to centre than
     in chat, because Protocol's question is the focus and he is delivering it,
     but still low enough that the question card sits above him. Shallower
     azimuth so he is more front-on and more legible while explaining. */
  protocol: {
    label: 'protocol',
    fov: 42,
    heightFrac: 0.360,
    screenX: 0.345,
    screenY: 0.615,
    azimuthDeg: 14,
    elevation: 1.35,
    world: { grid: 0.85, nodes: 0.8, structures: 0.7, motes: 0.8, glow: 1.0, fogNear: 9, fogFar: 54 },
    state: 'explaining'
  },

  /* PORTRAIT — a close, quiet three-quarter bust for any surface that wants
     him small and personal (a Home card, a coach avatar). Kept here so those
     surfaces do not invent their own camera later. */
  portrait: {
    label: 'portrait',
    fov: 38,
    heightFrac: 0.520,
    screenX: 0.44,
    screenY: 0.520,
    azimuthDeg: 28,
    elevation: 1.85,
    world: { grid: 0.55, nodes: 0.45, structures: 0.3, motes: 0.6, glow: 0.8, fogNear: 8, fogFar: 40 },
    state: 'idle'
  }
};

export var MODE_NAMES = Object.keys(MODES);

export function getMode(name) {
  return MODES[name] || MODES.showcase;
}
