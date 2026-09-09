/* MAHPLAZA :: FOBEAMS — the district's coherent energy routes, and its ASCENT NETWORK (v8)

   v8 REINTERPRETS THIS WHOLE MODULE. The FOBEAMs were never decoration: a vertical FOBEAM line
   rising out of the city is the TRACK AN ASCENT VEHICLE RIDES, all the way up to the upper realm.
   "The vehicles are square diamonds that connect to a single vertical line that goes straight up
   into the sky, like the fobeams — these are essentially what those appeared to be in the sky,
   taking you up all the way." So the horizontal network below carries DATA and the three vertical
   lines added in v8 carry PEOPLE, which is why they are thicker, brighter and far rarer. The pods
   that ride them are lofted from the SAME square-diamond outline and the SAME ring stack as the
   upper realm's pods in ascent.js — they are one craft seen from the two ends of one line.

   The canonical MAHFITT FOBEAM is a RAIL with a single SQUARE DIAMOND that
   travels along it, carrying a small travelling light; the FOBLOW is the same
   clock read as a low, broad edge flow. This module is that motif built in
   world space, replacing the two decorative arcs sky.js draws:

     RAIL          a thin additive tube along a CatmullRom curve (r 0.23),
                   vertex-faded at both ends so a route arrives rather than stops.
     OUTER FIELD   a second, much wider tube (r 1.85) at very low opacity —
                   the air the rail energises. Soft; never a laser hose.
     PACKETS       square diamonds (an octahedron flattened in its own plane =
                   a square rotated 45°, the reserved mark) travelling one way,
                   pooled in ONE InstancedMesh, rolled to face the camera while
                   their long axis follows the path.
     LIGHT         each packet carries one elongated additive ellipse, a second
                   InstancedMesh — the 3-D echo of the app's travelling light.
     RECEIVERS     every origin and destination is a real piece of architecture:
                   a plaza-edge relay mast, the MAH MATCH roof node, a walkway
                   pylon hub, three tower crowns. Each brightens for ~0.4 s when
                   a packet lands. No new lights (§37).
     FOBLOWS       three broad, faint, slow ribbons that follow the district's
                   surfaces — local and flowing, no packets, far fainter.

   Routes are deliberate infrastructure, not decoration: the plaza's west mast
   feeds MAH MATCH's roof node, which relays to the city walkway hub, which
   sends on to a tower crown; the east mast runs its own line to a second crown;
   and one trunk crosses the district behind the midground blocks. Nothing runs
   over the open plaza below y = 60, everything is occluded by architecture
   (depthTest on, depthWrite off, §21), and no two routes share a speed, a phase
   or a direction.

   Laws honoured: three.module.min only, procedural, no textures from disk, no
   yellow / amber / orange (colour comes from the world Theme's energy pair), no
   per-frame allocation, no geometry rebuilt in update, ~10 draw calls. */
import * as THREE from '../vendor/three/three.module.min.js';
import { createMusicLineField } from './musicline.js';   /* R2 §10: the universal music-line law */
import { chamferBox, canvasTexture } from './materials.js';

/* ---- the receivers: where a route can begin or end ---------------------------------------
   p     = the transfer point (the beacon head)
   base  = where the receiver is rooted (plaza ground, MAH MATCH's roof at y 24,
           the walkway deck at y 34, a tower crown)                                          */
const NODES = {
  'relay-west':  { p: [-72, 34, -46],  base: [-72, 0, -46],      kind: 'mast',  note: 'plaza-edge relay mast, west of the vehicle corridor' },
  'relay-east':  { p: [76, 31, -50],   base: [76, 0, -50],       kind: 'mast',  note: 'plaza-edge relay mast, east of the vehicle corridor' },
  'match-roof':  { p: [0, 72.0, -78],  base: [0, 65, -78],       kind: 'node',  note: 'MAH MATCH tower crown node' },
  'walkway-hub': { p: [-52, 47.5, -150], base: [-52, 40, -150],  kind: 'node',  note: 'city walkway hub, over the west pylon' },
  'crown-nw':    { p: [-72.6, 131, -291], base: [-72.6, 125, -291], kind: 'crown', note: 'background tower crown, north-west' },
  'crown-w':     { p: [-111.4, 77, -262], base: [-111.4, 71.5, -262], kind: 'crown', note: 'background tower crown, west' },
  'crown-e':     { p: [118, 111, -265], base: [118, 105.5, -265], kind: 'crown', note: 'background tower crown, east' }
};

/* ---- the routes ---------------------------------------------------------------------------
   Each is one-way with its own speed, packet count, gauge (trunk lines carry larger
   carriers, which is also what keeps a 300 m route readable) and phase.                      */
const ROUTES = [
  { id: 'plaza-west-feed', tier: 'near', from: 'relay-west', to: 'match-roof', speed: 15.5, count: 7, gauge: 0.46, gain: 1.00, phase: 0.00,
    via: [[-64, 50, -30], [-46, 66, -30], [-20, 76, -56]] },
  /* leaves the tower crown in the open, dips behind MAH MATCH's mass, climbs back out to the walkway */
  { id: 'match-relay', tier: 'near', from: 'match-roof', to: 'walkway-hub', speed: 20.5, count: 6, gauge: 0.48, gain: 0.95, phase: 0.37,
    via: [[-12, 66, -100], [-30, 56, -122], [-44, 50, -140]] },
  { id: 'plaza-east-line', tier: 'mid', from: 'relay-east', to: 'crown-e', speed: 13.0, count: 9, gauge: 0.62, gain: 0.88, phase: 0.61,
    via: [[86, 60, -92], [96, 86, -150], [110, 104, -206]] },
  { id: 'walkway-uplink', tier: 'mid', from: 'walkway-hub', to: 'crown-nw', speed: 23.5, count: 9, gauge: 0.6, gain: 0.9, phase: 0.18,
    via: [[-58, 74, -178], [-64, 98, -214], [-70, 118, -252]] },
  /* the trunk: crown to crown across the district, passing behind the midground blocks */
  { id: 'district-trunk', tier: 'mid', from: 'crown-w', to: 'crown-e', speed: 18.0, count: 12, gauge: 0.78, gain: 0.8, phase: 0.79,
    via: [[-64, 78, -234], [0, 74, -224], [64, 84, -234]] }
];

/* ---- FOBLOWS: broad, faint, slow flows that follow the district's surfaces ---------------- */
const FLOWS = [
  { width: 26, opacity: 0.062, drift: 0.031, pts: [[-64, 12, 66], [-80, 26, 12], [-90, 44, -58], [-92, 56, -126], [-86, 50, -198]] },
  { width: 20, opacity: 0.055, drift: 0.023, pts: [[60, 12, 66], [76, 24, 10], [90, 38, -56], [98, 46, -124], [104, 42, -186]] },
  { width: 34, opacity: 0.048, drift: 0.017, pts: [[-150, 58, -150], [-70, 70, -186], [20, 74, -200], [110, 64, -176], [170, 50, -140]] }
];

/* ================= THE ASCENT NETWORK (v8) =====================================================

   THREE lines, and no more. A vertical ascent line is the brightest vertical thing in this city and
   the only one that leaves it, so scarcity is what makes it read as an event rather than as traffic;
   a fourth would also have had to stand somewhere the black platinum floor could not answer it.

   WHERE THEY STAND, and why exactly here. Every base sits INSIDE ground.js's FIELD_RADIUS (43 m) so
   its light lands on the hero floor and gets a reflection, OUTSIDE PLAZA_RADIUS (27 m) so it never
   crowds the monument at (0, 7) or the approach, and clear of all three aprons in buildings.js's
   SITES — each apron is (W + 8) x 16 m about its site's own forward, which is what pushed the west
   pad out to x −30 (the gym apron's corner reaches x ≈ −33 at z ≈ −14) and the east pad in to x 32.
   All three read inside the establishing camera's frame at (0.6, 3, 42) looking down −Z: 26°, 28°
   and 9° off axis.

   The pads are turned 45°, which is not a style choice: ground.js lays the floor as a 9 m diamond
   lattice rotated 45°, so a square-diamond pad on that bearing sits IN the joint grid instead of
   across it, and its coping lines up with the cell edges it stands on.

   No two lines share a height, and that is what desynchronises them: the travel texture repeats a
   fixed number of times over each line's own height, so a 604 m line runs its bands 55 m apart at
   16.4 m/s and a 468 m line runs them 43 m apart at 12.8 m/s off the SAME shared texture and the
   same single draw call. The file's rule that no two routes share a speed or a phase still holds.  */
/* EXPORTED (R3-06): mahascent.js continues these same three lines up through the cloud decks to
   the Sky Realm arrival district. One table decides where an ascent stands, or the ground half and
   the sky half of the same line drift apart — which is the whole failure R3-06 is written against. */
/* `w` IS THE LINE'S RANK, AND IT IS THE ONLY THING IN THIS TABLE THAT IS ABOUT COMPOSITION.
   Every other column here is a fact about where a line stands. `w` is a judgement about which line
   the eye is supposed to find first, and it exists because until it did there was NO per-line
   intensity knob at all: `pod` scales the vehicle, `h` scales the geometry, and all three columns
   ran through one shared material at one opacity. Three verticals at identical brightness do not
   read as a hierarchy of ascent lines — they read as three bars ruled through the frame, which is
   exactly the failure the direction names: lasers are punctuation, not wallpaper.
   The rank follows the height rank on purpose. Two signals saying the same thing (the tallest line
   is also the brightest) compound into one clear reading; two signals disagreeing would cancel.
   Consumed by stepAscent below and by mahascent.js's upper continuation, so a line keeps its rank
   whether you are standing on the plaza or standing on the arrival deck 604 m above it. */
export const ASCENTS = [
  /* WEST — the near line. Between the plaza field's west edge and MAH GYM's apron; the closest of the
     three to the camera, so it is the one whose pod reads at real size and whose floor flare is big.
     SECONDARY: nearest the camera, so it needs the least brightness to hold its place in the frame. */
  /* CAMPUS RECONSTRUCTION §1 / §5: these three stood at r 36-39, which is INSIDE the 96 m quad the
     master requires to be kept mostly open — three 500 m vertical lines rising out of the middle of
     the social field. They move to the quad's own edge, into the gaps BETWEEN the facility bearings
     (match 0, market 66, gym 294), so an ascent line now terminates a path instead of interrupting
     one. §5's "integrated into paths/roads" is the whole point: an elevator you walk to along an
     edge is infrastructure, an elevator in the middle of the quad is a monument.
     Their RANK is unchanged — hero north, two secondaries — because that hierarchy was measured and
     is not what was wrong. Only where they stand. */
  { id: 'ascent-west',  x: -87, z: -64, h: 520, pod: 1.00, phase: 0.7665, w: 0.62 },
  /* EAST — between the field's east edge and MAH MARKET's apron, and the shortest of the three.
     SECONDARY, and the quietest: shortest line, furthest off the plaza's forward axis. */
  { id: 'ascent-east',  x:  87, z: -64, h: 468, pod: 0.92, phase: 0.3000, w: 0.52 },
  /* NORTH — on the field's far edge in front of MAH MATCH's west flank, so the tallest line has the
     district's tallest dark mass behind it to be read against.
     HERO: tallest, nearly dead ahead on the plaza's forward sightline, and standing against the one
     backdrop dark enough to take it. This is the ascent line the world is introduced by. */
  { id: 'ascent-north', x: -24, z: -114, h: 604, pod: 1.06, phase: 0.6120, w: 1.30 }
];
/* ---- THE ASCENT OUTPOSTS ----------------------------------------------------------------------
   Direction: "put some elevators on the side of and on top of some mountains and in between some
   other trees on the map — same style as that big connector to the dome, connected to the tree
   addition and the ceiling dome. We're adding infrastructure, not environmental stuff."

   These are the same MAH ASCENT line the plaza runs, placed out in the landscape. They are NOT a
   second implementation of it: the outpost beams are extra instances of the SAME three geometries
   in the SAME three materials the central lines use, created a few hundred lines below where those
   already exist. One truth, one source — a mirrored copy of the beam profile in another module is
   how two things that are meant to be identical drift apart, and this world has paid for that
   before.

   WHAT IS DIFFERENT is only what should be: an outpost is INFRASTRUCTURE, so it gets no pad
   architecture, no pod, no doors and no rank in the plaza's lighting hierarchy — the reconstruction
   master is explicit that local nodes should read as infrastructure and the main ascent stays the
   monument. Each one gets a LANDING instead: a small hexagonal deck with a rim and four legs, so
   the beam visibly stands on something built.

   ---- THE SITES ARE FOUND, NOT TABULATED, AND THAT IS THE CORRECTION ---------------------------
   The first cut of this table wrote nine (bearing, radius, elevation) triples by eye, because the
   world had no way to ask how high the ground was. Two diagnostic cameras aimed at the result
   settled it: at bearing 44 / radius 688 there was no outpost in frame at all — the deck asserted
   at y 132 was buried inside a range that rises past 300 there — and the camera placed to watch the
   treeline node stood inside a ridge. Nine numbers, and the two that were checked were both wrong.
   Guessing an elevation in a landscape generated from a seed is not a thing that can be got right
   by trying harder; it is a thing that has to stop being guessed.

   So terrain.js now exports sampleTop(x, z) — a raycast against the rock it actually built — and
   each outpost carries a bearing and a KIND rather than a position. At seat time the node marches
   outward along its bearing, samples the ground every few metres, and takes the radius that best
   satisfies its kind: `grove` wants flat ground inside the treeline belt, `flank` wants the
   steepest mid-height shoulder it can find, `summit` wants the highest point on the bearing. The
   placement is then a property of the terrain rather than of my eye, it stays correct if the
   terrain seed or the range radii ever change, and — the part that matters for the direction — a
   node asked to stand on the side of a mountain provably stands on the side of a mountain.

   `h` is the beam's own height above its landing, `w` its width. Bearings avoid the three mountain
   passes and the reserved rear sightline; the rest is measured. */
const OUTPOSTS = [
  /* among the trees — the treeline belt runs r 300-605, so the search window is inside it */
  /* WIDTHS. `w / 0.62` is the horizontal scale applied to the shared beam geometry, whose natural
     width is what the three plaza ascents render at. The first cut set these at 0.26-0.34, which is
     HALF the plaza beam, and the render showed the result: a node 200 m out was a hairline scratch
     against a mountain, not a piece of infrastructure. These now match the plaza lines in world
     width and are simply further away, which is what "the same style as that big connector" means
     — and it keeps the lighting hierarchy intact, because a line that is the same size but three
     hundred metres back cannot out-rank the one you are standing under. */
  { id: 'out-tree-a', deg: 24,  kind: 'grove', from: 330, to: 520, h: 470, w: 0.58 },
  { id: 'out-tree-b', deg: 96,  kind: 'grove', from: 320, to: 500, h: 448, w: 0.55 },
  { id: 'out-tree-c', deg: 138, kind: 'grove', from: 360, to: 560, h: 496, w: 0.58 },
  { id: 'out-tree-d', deg: 252, kind: 'grove', from: 340, to: 530, h: 462, w: 0.55 },
  { id: 'out-tree-e', deg: 318, kind: 'grove', from: 320, to: 500, h: 440, w: 0.56 },
  /* on the flanks of the near range: a shoulder part-way up, not a summit and not the foot */
  /* the windows are WIDE because the ranges are placed from a seed and their radii vary by bearing:
     a 300 m window centred on the nominal ring radius found no mountain at all on bearing 44 and
     dropped that node onto the flat. The search is cheap; let it look. */
  { id: 'out-flank-a', deg: 52,  kind: 'flank', from: 480, to: 1250, h: 396, w: 0.70 },
  { id: 'out-flank-b', deg: 118, kind: 'flank', from: 480, to: 1250, h: 372, w: 0.68 },
  { id: 'out-flank-c', deg: 286, kind: 'flank', from: 480, to: 1250, h: 410, w: 0.70 },
  /* and one on top of a summit, which is the one you see from the whole campus */
  { id: 'out-summit',  deg: 74,  kind: 'summit', from: 520, to: 1150, h: 300, w: 0.86 }
];

/* THE SEARCH. Two passes along the bearing at 6 m steps — fine enough to land on a shoulder of a
   range whose facets are tens of metres across, cheap enough that nine nodes cost a few hundred
   raycasts against a handful of merged meshes, once, at build time.

   IT IS TWO PASSES BECAUSE ONE WAS NOT ENOUGH, AND THE FIRST PROBE SAID SO. A single pass scoring
   "higher is better, steeper is better" put the flank node meant for the side of a mountain at
   ground 304 — on a summit — and put every grove node on the first flat sample it met, so all five
   crowded the inner edge of their windows. A score with no target has no middle: it always walks to
   an end of the window. So pass one just measures the bearing and records its highest point, and
   pass two scores against a target derived from it — 45 % of the local peak for a flank, which is
   what "part way up the side" means in numbers.

   The slope term is sampled 14 m to either side along the same bearing, which is the scale of the
   landing itself: what matters is whether the deck's own footprint sits on a slope, not whether the
   mountain does. A flank wants slope; a grove refuses it.

   Heights clamp at 0. The ranges are translated down by 26 m so their skirts sit below the world
   floor, and a ray that passes over a peak can hit one of those skirts and report a NEGATIVE
   ground — which the first probe duly showed as a landing seated at -11.3. Below zero there is no
   ground here, there is only geometry.

   Deterministic, no rand(), and it returns the middle of the window rather than nothing if the
   sampler is missing — a world built without terrain still gets its outposts, on the flat. */
function seekSite(sample, deg, kind, from, to) {
  const t = deg * Math.PI / 180, sx = Math.sin(t), sz = -Math.cos(t);
  const STEP = 6, PROBE = 14;
  const at = r => Math.max(0, sample(sx * r, sz * r));

  /* pass one: what does this bearing look like? */
  let peak = 0;
  for (let r = from; r <= to; r += STEP) peak = Math.max(peak, at(r));
  const target = peak * 0.45;
  const mid = (from + to) / 2, span = (to - from) / 2 || 1;

  /* pass two: score every sample against what this kind is actually looking for */
  let best = null;
  for (let r = from; r <= to; r += STEP) {
    const y = at(r);
    const slope = Math.abs(at(r + PROBE) - at(r - PROBE)) / (PROBE * 2);
    let score;
    if (kind === 'summit') {
      score = y;                                            /* the one kind that IS an extreme */
    } else if (kind === 'grove') {
      if (y > 12) continue;                                 /* never halfway up a foothill */
      /* flat first, then a gentle pull toward the middle of the belt so five nodes on five
         bearings do not all stack against the inner edge at the same radius */
      score = 100 - y * 5 - slope * 70 - Math.abs(r - mid) / span * 14;
    } else {
      if (y < 25 || peak < 90) continue;                    /* no mountain here to stand on */
      /* the shoulder: near the target height, and on a real slope rather than a shelf */
      score = 120 - Math.abs(y - target) / Math.max(1, target) * 130 + Math.min(slope, 1.4) * 55;
    }
    if (best === null || score > best.score) best = { score, r, x: sx * r, z: sz * r, y, peak };
  }
  /* A FLANK THAT FOUND NO MOUNTAIN GOES TO THE HIGH GROUND, NOT TO THE FLAT. The first run of this
     search dropped exactly one node that way and it became a tenth grove node standing in a field,
     which is not what the table asked for and not what a reader of the table would expect. */
  if (!best && kind === 'flank') return seekSite(sample, deg, 'summit', from, to);
  if (best) return best;
  return { score: 0, r: mid, x: sx * mid, z: sz * mid, y: 0, peak };
}

/* ground.js FLOOR_TOP: the laid deck is 0.17 above the raw ground plane and everything that stands
   on the plaza stands on the DECK. A pad sunk to y = 0 would show a 17 cm gap along its whole rim. */
const DECK_Y = 0.17;
const PAD_TOP = DECK_Y + 0.88;     /* the coping: three receding courses above the deck */
const BEAM_Y = PAD_TOP + 0.05;     /* the aperture the line leaves from */
const DOCK_Y = BEAM_Y + 4.90;      /* the pod's belt at rest: its emitter face clears the aperture by ~3 m */

/* THE SCHEDULE. One deterministic cycle per line, driven from absolute t, so a capture at t = 0 is
   the same frame every time. Phases were chosen for that frame: WEST is 30% into its burst (the pod
   ~24 m up and still legibly a pod), EAST is docked, NORTH is deep into its build-up. A pod is
   visible for 74% of its cycle but a LAUNCH occupies 2.2% of it, so across three lines a departure
   happens about every 36 s and never two at once — rare, which is the note. */
const CYCLE = 108;
const U_ARRIVE = 0.040, U_DOCK = 0.070, U_PREP = 0.520, U_READY = 0.744, U_FIRE = 0.760, U_GONE = 0.782, U_COLD = 0.880;
/* "Explosive" here is a burst of POWER, never a fireball and never debris: the pod is intact the
   whole way, leaves under 2.4 s of extreme acceleration, and comes back next cycle on the same line. */
const CLIMB = 640, CLIMB_POW = 2.9;   /* metres covered inside the burst, and its acceleration curve */
const DROP = 700, DROP_POW = 2.4;     /* arrival is the same energy in reverse, decelerating into the pad */

/* THE POD. The superellipse |x|^p + |z|^p = 1 is a hard square diamond at p = 1; p = 1.32 keeps the
   four points and the four flat flanks and takes the raw corner off, which is the only shape law 6
   exempts and even then only chamfered. Sixteen samples put a vertex exactly on each corner
   (0, 4, 8, 12) and each flank centre (2, 6, 10, 14) so the glazing can be placed by index. */
const POD_N = 16, POD_P = 1.32;
/* Broad at the belt and taller above it than below, so the pod is a square diamond in ELEVATION as
   well as in plan and sits ON its light instead of balancing on a point. */
const POD_RINGS = [
  { y: -0.420, s: 0.240 },   /* the emitter face — horizontal, and the reason the shell is low-metal */
  { y: -0.382, s: 0.420 },
  { y: -0.300, s: 0.660 },
  { y: -0.170, s: 0.870 },
  { y: -0.050, s: 0.985 },
  { y:  0.000, s: 1.000 },   /* THE BELT: the widest line, and the mirror catch */
  { y:  0.085, s: 0.975 },
  { y:  0.240, s: 0.860 },
  { y:  0.400, s: 0.655 },
  { y:  0.520, s: 0.400 },
  { y:  0.580, s: 0.220 }    /* the crown */
];
const POD_W = 2.6, POD_H = 4.2;              /* 5.2 m across the belt: large enough to be a vehicle, small enough to be in a plaza */
const POD_BOTTOM = POD_RINGS[0].y * POD_H;   /* −1.76 m: the emitter face sits below the pod's origin */
const GLASS_BANDS = [6, 7, 8], GLASS_SEGS = [1, 2, 5, 6, 9, 10, 13, 14];
/* ---- R170 D4: THE CAR HAS DOORS -----------------------------------------------------------------
   "Let's start enhancing that elevator thing more so that there's doors."

   THE APERTURE IS CUT FROM THE HULL'S OWN LOFT, which is the only way it can fit. loftHull's `only`
   filter already cuts the glazing and the corner seams out of the same section the hull is lofted
   from, so a cell list is this file's existing vocabulary for "a hole exactly here": the hull is
   built with these cells OMITTED, the recessed jamb is built from the SAME cells inset, and the two
   leaves are built from one cell each. Nothing is measured twice, so nothing can drift apart.

   WHY BANDS 2-6 AND SEGMENTS 1-2, and not a doorway from the shared kit. materials.js's
   doorwayParts() is the canonical three-tier door and it refuses anything under 2.2 m, correctly:
   it is architecture, sized for a wall. This is a 4.2 m tall square diamond whose widest line is a
   belt, and the band where its section is near-constant — rings 2 to 7, s 0.66 through 1.00 back to
   0.86 — is 2.27 m tall and no taller. A canonical doorway does not fit a vehicle this size and
   forcing one in would have meant growing the pod, which has its own stated reason for being 5.2 m
   across ("large enough to be a vehicle, small enough to be in a plaza"). So the pod gets a HATCH in
   the canonical LANGUAGE — recessed reveal, split leaves, a lit sill — at vehicle scale, and the
   2.27 m aperture still clears a 2.0 m MAHBEING walking through it.
   Segments 1 and 2 straddle outline vertex 2, which is the centre of a FLANK. A door on a flank and
   never on a point: the four points are the brand figure and they stay whole.

   THE LEAVES SWING, and that is a consequence of the shape rather than a style choice. A leaf that
   slid sideways would have to follow a superellipse whose radius runs from 0.84 to 1.00 and would
   cut through the hull within a few degrees; a leaf that retracted up or down would have to hide
   inside a shell that is NARROWER above and below the belt than the leaf is wide, and would poke
   out of the crown. Hinged at its outer edge, a leaf is lofted from the hull so it matches it
   exactly when shut, and once it is open it is supposed to be off the hull. */
const DOOR = Object.freeze({
  BAND: [2, 6],            /* ring 2 (y -1.26) to ring 7 (y +1.01): the near-constant section */
  SEGS: [1, 2],            /* the two cells either side of flank centre 2, at 45 deg */
  INSET: 0.155,            /* how far the LINER sits behind the hull line: the wall thickness you see through the opening */
  SWING: 1.31,             /* radians a leaf opens to: 75 deg, clear of the opening at walking height */
  SILL_Y: -1.26            /* the threshold line, at the bottom of the aperture */
});
const doorCell = (b, i) => b >= DOOR.BAND[0] && b <= DOOR.BAND[1] && (i === DOOR.SEGS[0] || i === DOOR.SEGS[1]);
const SEAM_N = 48;                           /* the seam outline is finer than the hull's so one segment is a 0.34 m seam, not a facet */
const BAND_REPEAT = 11;                      /* travel bands per line, in the line's own height */
const BAND_RATE = 0.30;                      /* texture v per second — upward, and the only motion cue the eye needs */

const SEG = 128;            /* cached samples per route (arc-length spaced) */
/* v5 §10: MANY more FOBEAMs, each far THINNER and SMALLER than v4's five fat arcs. One beam is now a
   hairline; what carries the composition is the DENSITY of them and the fact that no two are in phase.
   Tessellation falls with distance so 40 routes cost less than v4's five did.
     near  over and around the plaza — the ones a viewer can follow packet by packet
     mid   across the district, between crowns and hubs
     far   the distant energy field: hundreds of metres out, sub-pixel-thin, no outer field  */
const TIER = {
  near: { railR: 0.085, fieldR: 0.72, ts: 84, rs: 5, fts: 34, frs: 5, rail: 0.62, field: 0.085, packet: 1.0 },
  mid:  { railR: 0.115, fieldR: 0.95, ts: 66, rs: 5, fts: 28, frs: 5, rail: 0.5,  field: 0.062, packet: 0.72 },
  far:  { railR: 0.46,  fieldR: 0,    ts: 20, rs: 4, fts: 0,  frs: 0, rail: 0.115, field: 0, packet: 0.26 }   /* v10 §13: a river, not a lattice */
};
/* THE DISTANT MAHGIC FIELD (§11): far routes are generated along a band arcing across the sky, denser
   toward its middle, so together they read as one luminous river of energy — the Milky Way of a world
   whose infrastructure IS light — rather than as thirty separate drawn lines. */
const FAR_ROUTES = 22;

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function smoothstep(e0, e1, x) { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* concatenate geometries into one static BufferGeometry, keeping only the named attributes */
function mergeGeos(list, attrs) {
  const parts = []; let count = 0;
  for (const g of list) { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); parts.push(n); count += n.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  for (const name of attrs) {
    const size = name === 'uv' ? 2 : 3, arr = new Float32Array(count * size);
    let o = 0;
    for (const n of parts) { const a = n.attributes[name], c = n.attributes.position.count; if (a) arr.set(a.array.subarray(0, c * size), o * size); o += c; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  parts.forEach(n => n.dispose());
  return out;
}

/* a soft radial glow — the travelling light and the arrival brightening share it */
function glowTexture() {
  return canvasTexture(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(226,240,255,0.72)');
    g.addColorStop(0.55, 'rgba(150,196,255,0.18)'); g.addColorStop(1, 'rgba(90,150,235,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  });
}

/* THE TRAVEL TEXTURE. Four soft bands, each sheared by exactly one tile width over one band spacing:
   wrapped round a cylinder whose u goes once about the axis, a shear of exactly one tile is a
   continuous HELIX — band b at the tile's right edge lands on band b+1 at its left, and band 3 at the
   bottom lands on band 0 at the top, so neither seam can show however far the offset is scrolled.
   Scrolling this ONE texture is what makes a static bar read as motion UP; nothing else moves. */
function beamBandTexture() {
  const BANDS = 4;
  const t = canvasTexture(64, 256, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    const pitch = h / BANDS;
    c.lineCap = 'butt';
    for (let b = 0; b < BANDS; b++) {
      const base = b * pitch;
      /* the band's profile is drawn as 25 strokes under a gaussian, so it is a soft swell of light
         rather than a hard stripe — a hard stripe on a 500 m beam reads as a ladder */
      for (let s = -12; s <= 12; s++) {
        const a = Math.exp(-(s * s) / 22) * 0.85;
        c.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        c.lineWidth = 2.4;
        for (let k = -1; k <= 1; k++) {
          c.beginPath();
          c.moveTo(k * w, base + s * 1.7);
          c.lineTo((k + 1) * w, base + s * 1.7 + pitch);
          c.stroke();
        }
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* The unit square-diamond outline in XZ, as a flat array so nothing downstream allocates. */
function sqOutline(n, p) {
  const o = new Float32Array(n * 2), e = 2 / p;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    o[i * 2] = Math.sign(ca) * Math.pow(Math.abs(ca), e);
    o[i * 2 + 1] = Math.sign(sa) * Math.pow(Math.abs(sa), e);
  }
  return o;
}
/* Loft an outline through a stack of rings. For an outline running anticlockwise in XZ and rings
   running upward, (a, c, b) / (a, d, c) is the winding whose face normal points radially OUTWARD.
   `only` keeps a subset of cells, which is how the glazing and the corner seams are cut from the
   same section the hull is lofted from and therefore always land exactly on it. */
function loftHull(outline, rings, opts) {
  const o = opts || {}, n = outline.length / 2, m = rings.length;
  const grow = o.grow || 0, only = o.only || null, sx = o.sx == null ? 1 : o.sx, sy = o.sy == null ? 1 : o.sy;
  const pos = [], idx = [];
  for (let r = 0; r < m; r++) {
    const R = rings[r], s = R.s + grow;
    for (let i = 0; i < n; i++) pos.push(outline[i * 2] * s * sx, R.y * sy, outline[i * 2 + 1] * s * sx);
  }
  for (let b = 0; b < m - 1; b++) for (let i = 0; i < n; i++) {
    if (only && !only(b, i)) continue;
    const a = b * n + i, bb = b * n + ((i + 1) % n), c = (b + 1) * n + ((i + 1) % n), d = (b + 1) * n + i;
    idx.push(a, c, bb, a, d, c);
  }
  if (o.capBottom) { const ci = pos.length / 3; pos.push(0, rings[0].y * sy, 0); for (let i = 0; i < n; i++) idx.push(ci, i, (i + 1) % n); }
  if (o.capTop) { const top = (m - 1) * n, ci = pos.length / 3; pos.push(0, rings[m - 1].y * sy, 0); for (let i = 0; i < n; i++) idx.push(ci, top + ((i + 1) % n), top + i); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/* A vertical column ONE UNIT TALL, from y = 0 to y = 1, with its brightness baked into vertex colour
   so ONE instance matrix can stretch it to any height without stretching the fade — which is what
   lets three lines of three different heights be one InstancedMesh and one draw call. uv.v runs 0 at
   the base to 1 at the top, so the travel texture scrolls along it. `prof` is [v, radius] pairs. */
function column(prof, sides, fn) {
  const n = prof.length, verts = n * (sides + 1);
  const pos = new Float32Array(verts * 3), uv = new Float32Array(verts * 2), col = new Float32Array(verts * 3);
  const idx = [];
  for (let r = 0; r < n; r++) {
    const v = prof[r][0], rad = prof[r][1], c = fn(v);
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2, k = r * (sides + 1) + i;
      pos[k * 3] = Math.cos(a) * rad; pos[k * 3 + 1] = v; pos[k * 3 + 2] = Math.sin(a) * rad;
      uv[k * 2] = i / sides; uv[k * 2 + 1] = v;
      col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = c;
    }
  }
  for (let r = 0; r < n - 1; r++) for (let i = 0; i < sides; i++) {
    const a = r * (sides + 1) + i, b = a + 1, c = (r + 1) * (sides + 1) + i + 1, d = (r + 1) * (sides + 1) + i;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  /* the instance matrix stretches this to 600 m; a bounding sphere computed from the unit form would
     cull the line the moment its base left frame, so the meshes that use it are frustumCulled = false */
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 8);
  return g;
}
/* A sampled radius profile — a column is only as good as its falloff, and both radius and brightness
   are curves. `bias` > 1 clusters the rings toward the BASE, which is where a beam's skirt collapses
   from five metres to one and a half inside the first thirty; sampling that evenly over 600 m would
   spend twenty rings on the part that does not change and two on the part that does. */
function profile(rings, radius, bias) {
  const p = [], b = bias || 1;
  for (let i = 0; i < rings; i++) { const v = Math.pow(i / (rings - 1), b); p.push([v, radius(v)]); }
  return p;
}
/* a flat quad in the XZ plane, unit square, +Y normal: pools, streaks and spills all lie on a surface */
function lyingQuad() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), 2));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.8);
  return g;
}

export function buildFobeams(ctx) {
  const scene = ctx.scene, M = ctx.M || {};
  /* assigned by the outpost block below and exported on the contract, so mahplaza.js can re-seat the
     nine landings against real rock once terrain has built. Null if the ascent family is switched
     off entirely — the caller checks.
     `outpostSeats` is held HERE and copied onto stats at the bottom of the file rather than written
     from inside the build block: `stats` is still in its temporal dead zone down there, and a write
     to it throws, which takes the whole module out of the scene with a console.info nobody reads. */
  let outpostSeater = null;
  let outpostSeats = [];
  const theme = ctx.theme || M.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };
  const group = new THREE.Group(); group.name = 'fobeams';
  const owned = { geometries: [], materials: [], textures: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const R = rng(90210);

  /* ---- retire the legacy sky beams -------------------------------------------------------
     Preferred: the assembly hands us the sky module as ctx.sky and we hide its `beams` and
     `flows`. Fallback (no assembly change needed): find the group named 'sky' and hide only
     its additive tube meshes and its double-sided additive ribbons — exactly the old FOBEAM /
     FOBLOW set. Everything hidden is remembered and restored in dispose(). */
  const retired = [];
  (function retireLegacy() {
    const hide = o => { if (o && o.visible !== false) { o.visible = false; retired.push(o); } };
    const sky = ctx.sky;
    if (sky && (sky.beams || sky.flows)) {
      (sky.beams || []).forEach(b => { hide(b.core); hide(b.glow); });
      (sky.flows || []).forEach(hide);
      return;
    }
    const g = scene && scene.getObjectByName && scene.getObjectByName('sky');
    if (!g) return;
    g.children.forEach(o => {
      if (!o.isMesh || !o.material || o.material.blending !== THREE.AdditiveBlending) return;
      const type = o.geometry && o.geometry.type;
      if (type === 'TubeGeometry') hide(o);                                   /* the two arcs: core + glow */
      else if (type === 'BufferGeometry' && o.material.side === THREE.DoubleSide) hide(o);   /* the three ribbons */
    });
  })();

  /* ---- materials (all mine; nothing shared is mutated) ----------------------------------- */
  const railMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const fieldMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const packetMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const glowTex = glowTexture(); owned.textures.push(glowTex);
  const lightMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energy, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const arriveMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energyLight, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
  const flowMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
  railMat.name = 'fobeam-rail'; fieldMat.name = 'fobeam-field'; packetMat.name = 'fobeam-packet';
  lightMat.name = 'fobeam-light'; arriveMat.name = 'fobeam-arrival'; flowMat.name = 'foblow';
  owned.materials.push(railMat, fieldMat, packetMat, lightMat, arriveMat, flowMat);
  const structuralMat = M.trimSatin || M.trim || M.platinum || new THREE.MeshStandardMaterial({ color: 0x8593a8, roughness: 0.36, metalness: 0.9 });
  const headMat = M.energyLight || new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: theme.energyLight, emissiveIntensity: 1.7, roughness: 0.5, metalness: 0 });
  if (!M.trimSatin && !M.trim && !M.platinum) owned.materials.push(structuralMat);
  if (!M.energyLight) owned.materials.push(headMat);

  /* ---- routes: curves, cached samples, rail + field geometry ------------------------------ */
  const routes = [];
  const railParts = [], fieldParts = [];
  const nodeIndex = {}, nodeList = [];
  Object.keys(NODES).forEach((k, i) => { nodeIndex[k] = i; nodeList.push(Object.assign({ id: k, flash: 0 }, NODES[k])); });

  /* ---- the distant MAHGIC field: FAR_ROUTES generated along one band across the sky --------
     Bearing runs the width of the visible sky; the band's height is a smooth arc peaking behind the
     district, so density is highest where the eye already is. Each route is short relative to its
     radius, carries several tiny packets, and has its own speed, phase and direction. Deterministic. */
  const FR = rng(31337);
  const band = (u, jitter) => {
    const bearing = (-24 + 228 * u) * Math.PI / 180;
    const r = 380 + FR() * 330;
    /* v10 §13: the river ran at 78-310 m across radii of 380-710 m — the same band of sky the near
       mountain range occupies (700 m, tops near 370 m) and the same band the moon sits in. Thirty
       lit arcs were drawn straight over the mountains and across the moon, and §13 reserves those
       sight lines. Lifted so the river passes ABOVE the skyline it used to cross. */
    const y = 205 + 265 * Math.sin(Math.PI * u) + (jitter ? (FR() - 0.5) * 96 : 0);
    return [Math.cos(bearing) * r, y, -Math.sin(bearing) * r];
  };
  const farRoutes = [];
  for (let i = 0; i < FAR_ROUTES; i++) {
    const u0 = (i + FR() * 0.7) / FAR_ROUTES, u1 = Math.min(1, u0 + 0.03 + FR() * 0.09);
    const a = band(u0, true), b = band(u1, true);
    /* the mid point is pushed off the chord by a signed amount that is sometimes almost nothing: a third
       of the field runs nearly straight, so the sky is not thirty matching arches */
    const bow = (FR() - 0.42) * 130;
    const mid = [(a[0] + b[0]) / 2 * (0.9 + FR() * 0.2), (a[1] + b[1]) / 2 + bow, (a[2] + b[2]) / 2 * (0.9 + FR() * 0.2)];
    farRoutes.push({
      id: 'mahgic-field-' + i, tier: 'far', p0: a, p1: b, via: [mid],
      speed: 34 + FR() * 46, count: 3 + Math.floor(FR() * 4), gauge: 1.2 + FR() * 1.5,
      gain: 0.2 + FR() * FR() * 0.62, phase: FR(), reverse: FR() < 0.5
    });
  }
  const ALL = ROUTES.concat(farRoutes);

  ALL.forEach((spec, ri) => {
    const T = TIER[spec.tier || 'mid'];
    const a = spec.p0 ? { p: spec.p0 } : NODES[spec.from], b = spec.p1 ? { p: spec.p1 } : NODES[spec.to];
    const pts = [new THREE.Vector3(...a.p)].concat(spec.via.map(v => new THREE.Vector3(...v)), [new THREE.Vector3(...b.p)]);
    if (spec.reverse) pts.reverse();
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    /* cache the path ONCE: arc-length spaced points and their tangents. update() only interpolates. */
    const sample = curve.getSpacedPoints(SEG);
    const px = new Float32Array((SEG + 1) * 3), tx = new Float32Array((SEG + 1) * 3);
    for (let i = 0; i <= SEG; i++) { px[i * 3] = sample[i].x; px[i * 3 + 1] = sample[i].y; px[i * 3 + 2] = sample[i].z; }
    for (let i = 0; i <= SEG; i++) {
      const i0 = Math.max(0, i - 1) * 3, i1 = Math.min(SEG, i + 1) * 3;
      let dx = px[i1] - px[i0], dy = px[i1 + 1] - px[i0 + 1], dz = px[i1 + 2] - px[i0 + 2];
      const l = Math.hypot(dx, dy, dz) || 1; tx[i * 3] = dx / l; tx[i * 3 + 1] = dy / l; tx[i * 3 + 2] = dz / l;
    }
    const len = curve.getLength();
    routes.push({ id: spec.id, tier: spec.tier || 'mid', curve, px, tx, len, speed: spec.speed, gauge: spec.gauge, gain: spec.gain, pgain: T.packet, from: nodeIndex[spec.from], to: nodeIndex[spec.to], count: spec.count, phase: spec.phase });

    /* RAIL — a hairline, bright, faded at both ends by vertex colour */
    const rail = new THREE.TubeGeometry(curve, T.ts, T.railR, T.rs, false);
    const railK = T.rail / TIER.near.rail;   /* the far tier is dimmer as well as thinner */
    paintTube(rail, T.ts, T.rs, u => railK * spec.gain * (0.80 + 0.20 * Math.sin(Math.PI * u)) * smoothstep(0, 0.05, u) * smoothstep(0, 0.05, 1 - u));
    railParts.push(rail);
    /* OUTER FIELD — soft, swelling in the middle of the run; the far tier carries none */
    if (T.fieldR > 0) {
      const field = new THREE.TubeGeometry(curve, T.fts, T.fieldR, T.frs, false);
      const fieldK = T.field / TIER.near.field;
      paintTube(field, T.fts, T.frs, u => fieldK * spec.gain * (0.45 + 0.55 * Math.sin(Math.PI * u)) * smoothstep(0, 0.12, u) * smoothstep(0, 0.12, 1 - u));
      fieldParts.push(field);
    }
  });
  function paintTube(geo, ts, rs, fn) {
    const n = geo.attributes.position.count, col = new Float32Array(n * 3), stride = rs + 1;
    for (let v = 0; v < n; v++) { const c = fn(Math.floor(v / stride) / ts); col[v * 3] = c; col[v * 3 + 1] = c; col[v * 3 + 2] = c; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const railGeo = own(mergeGeos(railParts, ['position', 'color']));
  const fieldGeo = own(mergeGeos(fieldParts, ['position', 'color']));
  const railMesh = new THREE.Mesh(railGeo, railMat); railMesh.renderOrder = 6; railMesh.frustumCulled = false; group.add(railMesh);
  const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat); fieldMesh.renderOrder = 5; fieldMesh.frustumCulled = false; group.add(fieldMesh);

  /* ---- packets: ONE instanced square diamond for every route ------------------------------ */
  const packets = [];
  routes.forEach((r, ri) => {
    for (let i = 0; i < r.count; i++) {
      /* the jitter is a full slot wide, so packets on one route are never evenly spaced and the world
         never falls into a marching rhythm — asynchrony is the point (§10) */
      const jitter = (R() - 0.5) * 0.9 / r.count;
      packets.push({
        r: ri,
        s: ((i / r.count + r.phase + jitter) % 1 + 1) % 1 * r.len,
        speed: r.speed * (0.82 + R() * 0.4),           /* no two packets share a speed, even on one route */
        size: (0.5 + R() * 0.6) * r.gauge,
        gain: (0.72 + R() * 0.34) * r.pgain,   /* a distant packet is a spark, not a lamp */
        b: 0
      });
    }
  });
  const N = packets.length;
  const diamondGeo = own(new THREE.OctahedronGeometry(1, 0));      /* square rotated 45° in its own plane, thin in Z */
  const packetMesh = new THREE.InstancedMesh(diamondGeo, packetMat, N);
  packetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  packetMesh.renderOrder = 7; packetMesh.frustumCulled = false; group.add(packetMesh);
  const lightGeo = own(new THREE.PlaneGeometry(1, 1));
  const lightMesh = new THREE.InstancedMesh(lightGeo, lightMat, N);
  lightMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  lightMesh.renderOrder = 8; lightMesh.frustumCulled = false; group.add(lightMesh);
  const grey = new THREE.Color(1, 1, 1);
  for (let i = 0; i < N; i++) { packetMesh.setColorAt(i, grey); lightMesh.setColorAt(i, grey); }

  /* ---- receivers: mast / roof node / crown, plus the arrival brightening ------------------- */
  const structParts = [];
  const headGeo = own(new THREE.OctahedronGeometry(1, 0));
  const headMesh = new THREE.InstancedMesh(headGeo, headMat, nodeList.length);
  const arriveGeo = own(new THREE.PlaneGeometry(1, 1));
  const arriveMesh = new THREE.InstancedMesh(arriveGeo, arriveMat, nodeList.length);
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _pv = new THREE.Vector3(), _sv = new THREE.Vector3();
  nodeList.forEach((n, i) => {
    const [bx, by, bz] = n.base, top = n.p[1], h = Math.max(1.2, top - by);
    /* a slim tapered shaft, one or two collars, and a chamfered square-diamond housing at the head */
    const shaft = new THREE.CylinderGeometry(0.2, n.kind === 'mast' ? 0.5 : 0.34, h, 6, 1, false);
    shaft.translate(bx, by + h / 2, bz); structParts.push(shaft);
    if (n.kind !== 'mast') { const plinth = chamferBox(2.1, 0.5, 2.1, 0.1); plinth.translate(bx, by + 0.25, bz); structParts.push(plinth); }
    const collarY = [by + h * 0.52].concat(n.kind === 'mast' ? [by + h * 0.86] : []);
    collarY.forEach(y => { const c = chamferBox(1.05, 0.16, 1.05, 0.05); c.translate(bx, y, bz); structParts.push(c); });
    const housing = chamferBox(1.55, 1.55, 0.34, 0.14); housing.rotateZ(Math.PI / 4); housing.translate(bx, top, bz); structParts.push(housing);
    /* the beacon diamond and its arrival glow, both face the plaza */
    _e.set(0, 0, 0); _q.setFromEuler(_e);
    _m4.compose(_pv.set(n.p[0], n.p[1], n.p[2]), _q, _sv.set(0.62, 0.62, 0.2));
    headMesh.setMatrixAt(i, _m4);
    _m4.compose(_pv.set(n.p[0], n.p[1], n.p[2] + 0.35), _q, _sv.set(5.2, 5.2, 1));
    arriveMesh.setMatrixAt(i, _m4);
    arriveMesh.setColorAt(i, grey);
  });
  headMesh.instanceMatrix.needsUpdate = true; arriveMesh.instanceMatrix.needsUpdate = true;
  headMesh.renderOrder = 4; arriveMesh.renderOrder = 8; arriveMesh.frustumCulled = false;
  const structGeo = own(mergeGeos(structParts, ['position', 'normal']));
  const structMesh = new THREE.Mesh(structGeo, structuralMat); structMesh.name = 'fobeam-receivers';
  group.add(structMesh, headMesh, arriveMesh);

  /* ---- FOBLOWS: broad faint ribbons that follow the district's surfaces -------------------- */
  const flowMeshes = [];
  FLOWS.forEach((f, fi) => {
    const curve = new THREE.CatmullRomCurve3(f.pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    const n = 60, pos = new Float32Array((n + 1) * 2 * 3), col = new Float32Array((n + 1) * 2 * 3), idx = [];
    const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), pt = new THREE.Vector3(), tan = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const t = i / n; curve.getPointAt(t, pt); curve.getTangentAt(t, tan);
      side.crossVectors(tan, up).normalize();
      const w = f.width * (0.32 + 0.68 * Math.sin(Math.PI * t)) * 0.5;
      const c = smoothstep(0, 0.16, t) * smoothstep(0, 0.16, 1 - t) * (0.6 + 0.4 * Math.sin(Math.PI * t));
      pos.set([pt.x + side.x * w, pt.y + side.y * w, pt.z + side.z * w, pt.x - side.x * w, pt.y - side.y * w, pt.z - side.z * w], i * 6);
      col.set([c, c, c, c * 0.72, c * 0.72, c * 0.72], i * 6);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = own(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    const mat = flowMat.clone(); mat.opacity = f.opacity; owned.materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 3; mesh.userData.base = f.opacity; mesh.userData.drift = f.drift; mesh.userData.phase = fi * 2.1;
    group.add(mesh); flowMeshes.push(mesh);
  });

  /* ================= THE ASCENT NETWORK ====================================================
     Three vertical lines, their pads, and the square-diamond pods that ride them.

     LAW 2 — WHAT ANSWERS EACH LINE. A 500 m column of light standing on a near-mirror floor is the
     brightest vertical thing in this city, and an emissive tube on its own would light nothing at
     all. Every line is answered FIVE ways, and none of them is a THREE.Light: this assembly already
     spends its light budget on the entrances and the interiors, the plaza floor is metalness 0.98
     and takes no diffuse light from a lamp anyway, and a point light that cannot be seen to do work
     is exactly the floating light the direction is complaining about. So:
       1  A POOL on the black platinum, through ground.js's own ctx.lightPool, so it is laid by the
          instrument that owns the floor and dims with the time of day and follows a retheme.
       2  A SPECULAR STREAK, re-aimed at the camera every frame. On a floor at roughness 0.055 the
          reflection of a vertical light is a long streak running from its base TOWARD the viewer,
          and it lengthens as the view gets more grazing — which is the "legible second copy" the
          references show, and it is right from any camera in the world, not just the hero one.
       3  A MIRRORED COPY of the pad coping and of the emitter plate under the deck (ctx.reflect).
       4  ADJACENT GEOMETRY TINTED: the four mast blades each carry an inward reveal whose vertex
          brightness is 1/(1 + d²/k) in the distance from the beam axis and falls with height at the
          rate a LINE source falls (slowly — a line is not a point, and faking a point's falloff on
          a 500 m beam is what makes these read as decals).
       5  A SPILL on the surface it is mounted to: a gradient lying on the pad coping itself.
     All five surge together when a pod launches, and are back to rest within ~11 s.

     THE COST DISCIPLINE. Fourteen meshes for the whole network, every one instanced or merged: the
     three lines are three InstancedMeshes of three, because a unit-tall column with its fade baked
     into vertex colour can be stretched to any height by an instance matrix without stretching the
     fade — which is also how one shared travel texture gives three lines three different band
     spacings and three different climb speeds.                                                    */
  const ascentGroup = new THREE.Group(); ascentGroup.name = 'ascent-network'; group.add(ascentGroup);
  /* one record for the whole network: the per-line state update() walks, the meshes it writes into,
     and the materials setTime()/setTheme() own. Nothing here is rebuilt or reallocated after build. */
  const ascent = { lines: [], meshes: null, mats: null, base: null, tex: null };
  {
    const padMat = M.graphiteDark || M.graphite || structuralMat;
    /* LAW 1. The coping, the sills and the pad soffits are HORIZONTAL: at metalness ≥ 0.9 they would
       be lit only by the near-black zenith and render black. platinumMidLit is the same platinum read
       at metalness 0.40, which takes the hemisphere. The mast blades and the buttresses are vertical
       and canted, they see the bright horizon band, and they keep the mirror-grade platinumMid. */
    const copeMat = M.platinumMidLit || M.platinumLit || M.platinum || structuralMat;
    const mastMat = M.platinumMid || M.platinumBrushed || M.platinum || structuralMat;
    const podShellMat = M.platinumLit || M.platinum || structuralMat;      /* the crown cap and the emitter face point straight up and down */
    const podBeltMat = M.trimSatin || M.trim || M.chromeSatin || mastMat;  /* the belt is a vertical band: mirror grade is legal there and nowhere else on the pod */
    const podGlassMat = M.crystalGlass || M.glass || M.panel || copeMat;

    const bandTex = beamBandTexture(); owned.textures.push(bandTex);
    bandTex.repeat.set(1, BAND_REPEAT);
    const beamCoreMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, vertexColors: true, transparent: true, opacity: 0.44, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const beamBandMat = new THREE.MeshBasicMaterial({ map: bandTex, color: theme.energy, vertexColors: true, transparent: true, opacity: 0.36, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const beamSheathMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.115, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const revealMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.50, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const emitterMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
    const padGlowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energy, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
    const podSeamMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true });
    const podFieldMat = new THREE.MeshBasicMaterial({ color: theme.energy, vertexColors: true, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    beamCoreMat.name = 'ascent-core'; beamBandMat.name = 'ascent-travel'; beamSheathMat.name = 'ascent-sheath';
    revealMat.name = 'ascent-reveal'; emitterMat.name = 'ascent-emitter'; padGlowMat.name = 'ascent-pad-glow';
    podSeamMat.name = 'ascent-pod-seam'; podFieldMat.name = 'ascent-pod-field';
    owned.materials.push(beamCoreMat, beamBandMat, beamSheathMat, revealMat, emitterMat, padGlowMat, podSeamMat, podFieldMat);

    /* ---- the three columns ------------------------------------------------------------------
       CORE    a hot, thin, slightly tapering line — the track itself
       TRAVEL  a wider sleeve carrying the helical band texture, so the eye reads MOTION UP
       SHEATH  a flared skirt at the pad that narrows and then WIDENS with altitude: the air the
               line energises, and the reason the top dissolves into the sky instead of stopping.
       Every fade reaches exactly zero at v = 1, so no line has an end — it recedes. */
    /* v10 §13 — WHERE A LINE IS BRIGHT DECIDES WHETHER IT IS ARCHITECTURE OR A BAR OF LIGHT.
       Both fades ran at their maximum at v = 0 (the core peaked at 1.42) and decayed fast. v = 0 is
       the pad, which is at EYE LEVEL in every plaza camera, so each of these read as a hard white
       stripe drawn top-to-bottom through the middle of the composition — brighter than the towers,
       brighter than the moon, and slicing the frame into vertical bands. The energy is unchanged in
       total; it has been moved off the eyeline and up the shaft. Each line now enters dim at the
       aperture, comes up to full within about a tenth of its length, and then decays much more
       slowly than before, so it carries much further before it reaches zero — which is also what
       the direction asked for: these go up all the way, and the city goes infinitely up with them. */
    const rise = (v, floor) => floor + (1 - floor) * Math.min(1, v / 0.10);
    const coreGeo = own(column(profile(18, v => 0.30 * Math.pow(1 - v, 0.28) + 0.055), 10,
      v => 1.15 * Math.pow(1 - v, 1.05) * rise(v, 0.30)));
    const bandGeo = own(column(profile(22, v => 0.60 * Math.pow(1 - v, 0.30) + 0.10), 12,
      v => 0.80 * Math.pow(1 - v, 1.25) * rise(v, 0.35)));
    /* the sheath is the one that has to do two things at once: a 5.25 m SKIRT that collapses to 1.6 m
       inside the first thirty metres — the air the pad's emitter energises, and the reason the line
       looks like it comes OUT of something — and then a slow widening with altitude so the top
       dissolves into the sky rather than ending. Rings biased to the base pay for both. */
    const sheathGeo = own(column(profile(22, v => 1.05 + 5.4 * Math.pow(v, 0.85) + 4.2 * Math.exp(-v * 70), 2.0), 10,
      v => Math.pow(1 - v, 2.6) + 0.55 * Math.exp(-v * 34)));
    const N_ASC = ASCENTS.length;
    const coreMesh = new THREE.InstancedMesh(coreGeo, beamCoreMat, N_ASC);
    const bandMesh = new THREE.InstancedMesh(bandGeo, beamBandMat, N_ASC);
    const sheathMesh = new THREE.InstancedMesh(sheathGeo, beamSheathMat, N_ASC);
    coreMesh.renderOrder = 6; bandMesh.renderOrder = 5; sheathMesh.renderOrder = 4;
    coreMesh.name = 'ascent-line-core'; bandMesh.name = 'ascent-line-travel'; sheathMesh.name = 'ascent-line-sheath';
    [coreMesh, bandMesh, sheathMesh].forEach(m => { m.frustumCulled = false; ascentGroup.add(m); });

    /* ---- the pads: real architecture, not a decal on the floor -------------------------------
       Two receding chamfered courses in the dark grade, a low platinum coping, four canted mast
       blades and four buttresses at the diamond's points. Turned 45° so the pad sits IN ground.js's
       diamond lattice rather than across it, and its coping lines up with the cell edges it stands
       on. The blades are what the ascent line is answered BY: they are the adjacent geometry law 2
       asks for, and without them a 500 m beam would be standing on nothing. */
    const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _be = new THREE.Euler(), _bp = new THREE.Vector3(), _bs = new THREE.Vector3(1, 1, 1);
    const padParts = [], copeParts = [], mastParts = [], emitParts = [];
    function put(list, geo, x, y, z, rx, ry, rz) {
      _be.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _bq.setFromEuler(_be); _bp.set(x, y, z); _bm.compose(_bp, _bq, _bs);
      const g = geo.clone(); g.applyMatrix4(_bm); list.push(g); return g;
    }
    const D45 = Math.PI / 4;
    const courseA = chamferBox(8.4, 0.30, 8.4, 0.14), courseB = chamferBox(6.6, 0.36, 6.6, 0.12);
    const copeGeo = chamferBox(5.4, 0.22, 5.4, 0.07);
    /* THE CRADLE CLEARANCE, and it is measured, not guessed. The docked pod's belt is 2.6 m in
       radius and its section only drops below the blades' inner face (2.54 m, leaning in to 2.35 m
       at the top) beneath world y 5.42. So the blades top out at 4.85 and the pod's widest line
       stands above them: a 5.2 m blade at a 10° cant put steel through the hull. */
    const bladeGeo = chamferBox(1.5, 3.8, 0.42, 0.12), buttGeo = chamferBox(0.9, 1.5, 1.9, 0.10);
    const plateGeo = chamferBox(3.0, 0.12, 3.0, 0.05), barGeo = chamferBox(0.16, 0.07, 2.3, 0.02);
    ASCENTS.forEach(A => {
      put(padParts, courseA, A.x, DECK_Y + 0.15, A.z, 0, D45, 0);
      put(padParts, courseB, A.x, DECK_Y + 0.48, A.z, 0, D45, 0);
      put(copeParts, copeGeo, A.x, PAD_TOP - 0.11, A.z, 0, D45, 0);
      for (let i = 0; i < 4; i++) {
        /* blades stand on the diagonals of the turned pad and lean 10° INWARD, so their inner faces
           are tilted toward the line and catch it — a vertical mirror grade doing the job it can do */
        const a = D45 + i * Math.PI / 2, ry = Math.PI / 2 - a;
        put(mastParts, bladeGeo, A.x + Math.cos(a) * 2.75, PAD_TOP + 1.90, A.z + Math.sin(a) * 2.75, -0.10, ry, 0);
        /* a buttress at each of the pad diamond's four points, leaning out. Its height is set from
           its own tilted corner: at y 0.95 the lowest corner lands at 0.01, so it is ROOTED in the
           deck (top 0.17) without ever breaking through the ground plane at y = 0 and appearing
           under the floor in the assembly's reflection group. */
        const b = i * Math.PI / 2;
        put(mastParts, buttGeo, A.x + Math.cos(b) * 3.15, PAD_TOP - 0.10, A.z + Math.sin(b) * 3.15, 0.22, Math.PI / 2 - b, 0);
      }
      /* the emitter: a square-diamond plate the line leaves from, inside a square-diamond outline of
         four bars — the reserved mark at pad scale, the same figure the whole world is built on */
      put(emitParts, plateGeo, A.x, PAD_TOP + 0.07, A.z, 0, D45, 0);
      /* the outline's four bars stand on the DIAGONALS, each turned tangential (a rotation of −a maps
         a Z-long bar onto the tangent), which puts the figure's points back on the world axes — the
         same square diamond as the pad it is inlaid into, and as the plate inside it. The 0.35 m gap
         left at each corner is deliberate: this is the world's diamond OUTLINE, four marks, not a ring. */
      for (let i = 0; i < 4; i++) { const a = D45 + i * Math.PI / 2; put(emitParts, barGeo, A.x + Math.cos(a) * 1.55, PAD_TOP + 0.04, A.z + Math.sin(a) * 1.55, 0, -a, 0); }
    });
    [courseA, courseB, copeGeo, bladeGeo, buttGeo, plateGeo, barGeo].forEach(g => g.dispose());
    const padMesh = new THREE.Mesh(own(mergeGeos(padParts, ['position', 'normal'])), padMat);
    const copeMesh = new THREE.Mesh(own(mergeGeos(copeParts, ['position', 'normal'])), copeMat);
    const mastMesh = new THREE.Mesh(own(mergeGeos(mastParts, ['position', 'normal'])), mastMat);
    const emitMesh = new THREE.Mesh(own(mergeGeos(emitParts, ['position', 'normal'])), emitterMat);
    padMesh.name = 'ascent-pads'; copeMesh.name = 'ascent-copings'; mastMesh.name = 'ascent-masts'; emitMesh.name = 'ascent-emitters';
    padMesh.receiveShadow = copeMesh.receiveShadow = true; mastMesh.castShadow = mastMesh.receiveShadow = true;
    emitMesh.renderOrder = 6;
    ascentGroup.add(padMesh, copeMesh, mastMesh, emitMesh);
    if (typeof ctx.reflect === 'function') { ctx.reflect(copeMesh, 0.3); ctx.reflect(emitMesh, 0.42); }

    /* ---- the reveal: adjacent geometry tinted toward the emitter -----------------------------
       One plane laid on each blade's inner face, built ONCE around a local axis and instanced per
       pad. Its vertex brightness is the real falloff of a LINE source: 1/(1 + d²/k) across the gap
       to the axis, and only a slow decay with height, because a 500 m line does not fall off the way
       a lamp does. That difference is the whole reason this reads as light and not as a painted
       gradient — and the same curve is what makes it die out about four metres from the beam. */
    const revealParts = [];
    let revealMesh = null;
    for (let i = 0; i < 4; i++) {
      const a = D45 + i * Math.PI / 2, ry = Math.PI / 2 - a;
      const pl = new THREE.PlaneGeometry(1.32, 3.5, 2, 6);
      _be.set(-0.10, ry, 0, 'YXZ'); _bq.setFromEuler(_be);
      /* the blade's inner face is at radius 2.54 (centre 2.75, half-depth 0.21); the reveal sits
         0.04 m PROUD of it, toward the line, so it can never z-fight with the metal it lies on */
      _bp.set(Math.cos(a) * 2.50, 1.90, Math.sin(a) * 2.50);
      _bm.compose(_bp, _bq, _bs); pl.applyMatrix4(_bm);
      revealParts.push(pl);
    }
    {
      const geo = own(mergeGeos(revealParts, ['position']));
      const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) {
        const d = Math.hypot(p.getX(v), p.getZ(v)), y = Math.max(0, p.getY(v) - 0.05);
        const k = (1 / (1 + d * d / 5.2)) * (0.34 + 0.66 * Math.exp(-y / 3.6));
        col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = k;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      revealMesh = new THREE.InstancedMesh(geo, revealMat, N_ASC);
      revealMesh.renderOrder = 5; revealMesh.frustumCulled = false; revealMesh.name = 'ascent-reveals';
      ascentGroup.add(revealMesh);
    }

    /* ---- the floor answer: a spill on the coping, a pool and a camera-aimed streak ------------ */
    const glowGeo = own(lyingQuad());
    const floorMesh = new THREE.InstancedMesh(glowGeo, padGlowMat, N_ASC * 3);
    floorMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    floorMesh.renderOrder = 5; floorMesh.frustumCulled = false; floorMesh.name = 'ascent-floor-light';
    ascentGroup.add(floorMesh);
    /* and the pool laid by the floor's own instrument, which is what makes it dim with the day and
       follow a retheme without this module knowing anything about either */
    if (typeof ctx.lightPool === 'function') ASCENTS.forEach(A => ctx.lightPool({ x: A.x, z: A.z, rx: 26, rz: 26, k: 0.34 }));

    /* ---- the pod ------------------------------------------------------------------------------
       Five parts, five InstancedMeshes of three — one draw call per part however many pods fly, and
       per-pod (and per-part) brightness through instanceColor for free, which is what the departure
       build-up needs and what four separate pod Groups could never have given without four material
       clones each. The shell is LOW-metalness near-white platinum on purpose: its crown cap and its
       emitter face point straight up and straight down, and a mirror grade there would reflect the
       near-black zenith and render a black lid on a white pod. */
    const outline = sqOutline(POD_N, POD_P), seamOutline = sqOutline(SEAM_N, POD_P);
    /* the hull is now built with the door aperture MISSING — a real hole in the shell, not a panel
       drawn on it. Everything that fills that hole below is lofted from the same outline and rings. */
    const hullGeo = own(loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, capTop: true, capBottom: true, only: (b, i) => !doorCell(b, i) }));
    const beltGeo = own(loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: 0.018, only: (b, i) => (b === 4 || b === 5) && !doorCell(b, i) }));
    /* band 6 segments 1 and 2 are now doorway, so the glazing gives them up: a window in a door
       opening is a window onto the inside of the door. The pod is asymmetric now, and it should be —
       a vehicle with a boarding side is asymmetric, and here that asymmetry is information. */
    const glassGeo = own(loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: 0.008, only: (b, i) => GLASS_BANDS.indexOf(b) >= 0 && GLASS_SEGS.indexOf(i) >= 0 && !doorCell(b, i) }));
    /* the eight corner seams: one segment of a 48-sample outline is a 0.34 m seam sitting exactly on
       the hull it was lofted from, running keel to crown up all four corners of the diamond */
    const seamGeo = own(loftHull(seamOutline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: 0.020, only: (b, i) => b >= 1 && b <= 8 && (i % (SEAM_N / 4) === 0) }));
    {
      const p = seamGeo.attributes.position, n = p.count, col = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) {
        /* brightest at the belt, softer toward the keel and the crown: the seam is a light in the
           hull's widest joint, not a wireframe drawn round the whole thing */
        const y = p.getY(v) / POD_H, k = 0.42 + 0.58 * Math.exp(-(y * y) / 0.075);
        col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = k;
      }
      seamGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    /* the underside field: the square-diamond column of energy the pod stands on where it meets the
       line. It is the pod's contact with the track and it spools up long before anything moves. */
    const fieldGeo = own(column(profile(7, v => 1.0 - 0.72 * Math.pow(v, 0.75)), 8, v => 1.25 * Math.pow(1 - v, 1.5)));

    /* ---- R170 D4: THE DOORWAY AND WHAT IS BEHIND IT ------------------------------------------
       A hole in a hull is a hole until there is something behind it. Four pieces, and each one is
       lofted or placed off the SAME numbers the hull is, so the aperture cannot drift from its own
       frame the way a hand-placed door always eventually does.

         LINER    the hull's own loft, inset by DOOR.INSET, over every cell the door does NOT
                  occupy. It is the cabin wall, it is what you see through the opening, and it is
                  the only piece that emits — see the material note below for why the lighting has
                  to live here and could not live on the fittings.
         FITTINGS a floor plate at the sill, a low bench across the far wall and a ceiling coffer —
                  the "other interior elements" the direction asks for, and the reason a lit pod at
                  25 m reads as somewhere you could stand rather than as a sealed lozenge. All three
                  are square diamonds, because everything in this world is. They do NOT emit: they
                  are objects standing in front of a lit wall.
         COVE     a band of the liner at the ceiling line, in the additive seam grade — a lift's
                  light where a lift's light goes, and the value the leaves are read against.
         LEAVES   one hull cell each, hinged at their outer edges. Closed they ARE the hull.

       FIVE DRAW CALLS FOR EVERY POD IN THE WORLD however many pods there are: liner, fittings,
       cove, and one per leaf — the two leaves are different cells of the hull and so cannot share a
       geometry. Instanced like everything else here, so the count does not move if a fourth ascent
       line is ever added. */
    /* THERE IS NO JAMB PANEL ACROSS THE OPENING, AND THAT WAS THE THIRD MISTAKE THIS DOORWAY MADE.
       The first cut lofted the aperture's own cells inset by a few centimetres and called it a
       reveal. It is not a reveal — `only: doorCell` at a smaller `grow` reproduces the SAME curved
       surface a few centimetres further in, so what it actually builds is a blanking plate over the
       hole. Cut the hull, put a panel behind it, and the door has never once been open: from the pad
       you see a recessed panel where a doorway should be, and once that panel was made emissive to
       light the cabin it became a glowing panel, which is why two rounds of lighting work could not
       make the opening read as an opening. The hole was closed the whole time.
       So it is gone. The liner below is the far wall, the fittings stand in front of it, and what
       you see through the aperture is the inside of the car — which is what an open door is.

       THE CAR HAS TO HAVE AN INSIDE, and the first cut proved it by not having one. With the
       aperture cut and the leaves open, a camera on the door normal looked straight through the hull
       and out the other side: loftHull winds every face to point radially OUTWARD, so the far wall
       of the pod is backfacing from within and culls away. The opening read as a bite taken out of
       the car rather than as a doorway into it — a hole, which is exactly what the reveal was
       supposed to prevent, at the one distance where anybody can tell.
       So the pod gets a LINER: the same loft, inset, over every segment the door does not occupy,
       across the bands the cabin actually encloses. It shares the cabin's grade and mesh, so it is
       free in draws, and the cabin material is cloned to DoubleSide because a liner is a surface you
       are meant to see from the inside — which is the one thing the hull's own winding cannot do. */
    const linerGeo = loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: -DOOR.INSET,
      only: (b, i) => b >= DOOR.BAND[0] && b <= DOOR.BAND[1] + 1 && !doorCell(b, i) });
    /* the flank the door sits on, and the tangent it opens across — derived from the outline rather
       than typed, so a change to POD_N or POD_P moves the door with the face it belongs to */
    const dV = (i) => [outline[(i % POD_N) * 2] * POD_W, outline[(i % POD_N) * 2 + 1] * POD_W];
    const hingeA = dV(DOOR.SEGS[0]), hingeB = dV(DOOR.SEGS[1] + 1);   /* the two OUTER edges of the pair */
    /* TWO BUCKETS, AND THE SPLIT IS THE WHOLE READ.
       A single emissive cabin was the second failure of this doorway and the exact opposite of the
       first: the black cavity became a flat white panel, because one uniform emissive over every
       surface leaves no shading anywhere and a floor, a bench and a ceiling all render at the same
       value. Nothing in there was legible as a thing.
       So the LINING emits and the FITTINGS do not. The walls are the light source; the floor plate,
       the bench and the coffer keep the palette's ordinary down-facing platinum and read as dark
       objects standing in front of a lit wall — which is exactly how a lift cabin looks from outside
       at night, and it is form the geometry already had and the material was throwing away. */
    const cabinParts = [linerGeo], fitParts = [];
    {
      const sillY = DOOR.SILL_Y * POD_H, headY = POD_RINGS[DOOR.BAND[1] + 1].y * POD_H;
      const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _ce = new THREE.Euler(), _cp = new THREE.Vector3(), _cs = new THREE.Vector3(1, 1, 1);
      const place = (geo, x, y, z, ry) => {
        _ce.set(0, ry || 0, 0); _cq.setFromEuler(_ce); _cp.set(x, y, z); _cm.compose(_cp, _cq, _cs);
        geo.applyMatrix4(_cm); fitParts.push(geo); return geo;
      };
      /* the floor: a square diamond turned 45 deg so its points sit under the hull's points, 3.1 m
         across — a walkable plate for two, which is what a car this size is */
      place(chamferBox(3.1, 0.10, 3.1, 0.05), 0, sillY + 0.05, 0, Math.PI / 4);
      /* the bench, across the wall OPPOSITE the door so a rider faces out through the glazing */
      const back = -0.7071, bx = back * 1.02 * POD_W * 0.62, bz = back * 1.02 * POD_W * 0.62;
      place(chamferBox(1.9, 0.12, 0.52, 0.05), bx, sillY + 0.52, bz, Math.PI / 4);
      place(chamferBox(1.9, 0.44, 0.14, 0.04), bx * 1.14, sillY + 0.30, bz * 1.14, Math.PI / 4);
      /* the ceiling coffer: a recessed square diamond the interior light sits in, so the cabin is lit
         from a fitting rather than glowing all over like a lamp shade */
      place(chamferBox(2.0, 0.12, 2.0, 0.05), 0, headY - 0.06, 0, Math.PI / 4);
    }
    const cabinGeo = own(mergeGeos(cabinParts, ['position', 'normal']));
    const fitGeo = own(mergeGeos(fitParts, ['position', 'normal']));
    /* the two lit pieces: the coffer's panel and a threshold line at the sill — the same "one energy
       line at the step" the doorway kit puts under its own opening */
    const doorGlowParts = [];
    {
      const sillY = DOOR.SILL_Y * POD_H, headY = POD_RINGS[DOOR.BAND[1] + 1].y * POD_H;
      const _gm = new THREE.Matrix4(), _gq = new THREE.Quaternion(), _ge = new THREE.Euler(), _gp = new THREE.Vector3(), _gs = new THREE.Vector3(1, 1, 1);
      const lit = (geo, x, y, z, ry) => {
        _ge.set(0, ry || 0, 0); _gq.setFromEuler(_ge); _gp.set(x, y, z); _gm.compose(_gp, _gq, _gs);
        geo.applyMatrix4(_gm); doorGlowParts.push(geo); return geo;
      };
      lit(chamferBox(1.66, 0.05, 1.66, 0.03), 0, headY - 0.14, 0, Math.PI / 4);
      const mx = (hingeA[0] + hingeB[0]) / 2, mz = (hingeA[1] + hingeB[1]) / 2;
      lit(chamferBox(1.5, 0.035, 0.12, 0.015), mx * 0.86, sillY + 0.11, mz * 0.86, Math.atan2(mx, mz));
      /* THE COVE, and it is the piece that makes the cabin somewhere rather than something.
         A coffer plate facing straight down and a threshold line at the floor are both invisible to
         the camera that matters — a walker on the pad looks slightly UP into a car docked six metres
         over their head, and sees neither. What they can see is the back of the cabin through the
         open door, so the light goes THERE: a continuous band running round the liner just under the
         ceiling, which is where a lift's light has always lived. It reads through the doorway from
         outside, it puts a value behind the leaves so they have something to be silhouetted against,
         and it is the same additive seam grade as every other lit line on this vehicle. */
      lit(loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: -0.135,
        only: (b, i) => b === DOOR.BAND[1] && !doorCell(b, i) }), 0, 0, 0, 0);
    }
    const doorGlowGeo = own(mergeGeos(doorGlowParts, ['position']));
    /* podSeamMat carries vertexColors: true, and a geometry handed to a vertexColors material with
       no `color` attribute does not fall back to white — the attribute reads as zero and an ADDITIVE
       material multiplied by zero is invisible. This module would have compiled, linked, drawn two
       lit pieces every frame and shown nothing. The attribute is written explicitly for that reason;
       the animation rides on instanceColor above it. */
    {
      const n = doorGlowGeo.attributes.position.count, c = new Float32Array(n * 3);
      c.fill(1);
      doorGlowGeo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    /* one leaf, twice — each is a single hull cell column, so shut they close the hole exactly */
    const leafGeo = own(loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: -0.012,
      only: (b, i) => doorCell(b, i) && i === DOOR.SEGS[0] }));
    const leafGeoB = own(loftHull(outline, POD_RINGS, { sx: POD_W, sy: POD_H, grow: -0.012,
      only: (b, i) => doorCell(b, i) && i === DOOR.SEGS[1] }));

    const shellMesh = new THREE.InstancedMesh(hullGeo, podShellMat, N_ASC);
    const beltMesh = new THREE.InstancedMesh(beltGeo, podBeltMat, N_ASC);
    const glassMesh = new THREE.InstancedMesh(glassGeo, podGlassMat, N_ASC);
    const seamMesh = new THREE.InstancedMesh(seamGeo, podSeamMat, N_ASC);
    const fieldMesh2 = new THREE.InstancedMesh(fieldGeo, podFieldMat, N_ASC);
    shellMesh.castShadow = true;
    seamMesh.renderOrder = 7; fieldMesh2.renderOrder = 6; glassMesh.renderOrder = 3;
    [shellMesh, beltMesh, glassMesh, seamMesh, fieldMesh2].forEach(m => {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; ascentGroup.add(m);
    });
    shellMesh.name = 'ascent-pod-shell'; beltMesh.name = 'ascent-pod-belt'; glassMesh.name = 'ascent-pod-glass';
    seamMesh.name = 'ascent-pod-seams'; fieldMesh2.name = 'ascent-pod-field';

    /* the four doorway meshes. The jamb and cabin take platinumMidLit rather than the hull's grade
       for a LAW 1 reason and not a decorative one: a cabin floor plate and a ceiling coffer are
       horizontal faces, and a horizontal mirror under a night zenith renders black — the pod would
       have had a black floor and a black ceiling seen through its own open door. The lit pieces
       reuse podSeamMat, which is already additive, already themed and already driven by the clock,
       so the doorway costs no new material at all. */
    /* DoubleSide, and a clone to get it: the liner's faces are wound outward like every other loft
       in this file, and the whole point of a liner is to be seen from the side that winding culls.
       A clone rather than a mutation because M.platinumMidLit is the palette's own down-facing
       grade and half the world is wearing it — turning that DoubleSide globally would double the
       fragment work on every horizontal soffit in MAHWORLD to fix one cabin. */
    const cabinMat = (M.platinumMidLit || M.platinumLit || podShellMat).clone();
    cabinMat.side = THREE.DoubleSide;
    /* AND IT EMITS, because nothing else was ever going to light it. The cabin is an enclosed box on
       a vehicle six metres in the air at night: the key light does not reach inside it, the
       environment it is metal enough to reflect is the near-black zenith, and the one lit thing in
       there is a cove band that lights only itself. The first cut had all of that and rendered a
       black cavity behind a real doorway — the geometry was right and the read was wrong.
       A lift interior is lit from within, so the liner is: the palette's own cool interior hue at a
       low intensity, which is the same answer residents.js gives for a surface that has to carry
       value in the dark. It is deliberately CONSTANT rather than clock-driven — a lift's cabin light
       does not go off in the afternoon, and the pod flies at every hour. */
    cabinMat.color = new THREE.Color(0x8f99a6);
    cabinMat.emissive = new THREE.Color(0x9fb2cb);
    cabinMat.emissiveIntensity = 0.62;
    cabinMat.name = 'ascent-pod-cabin'; cabinMat.userData.moduleOwned = true;
    owned.materials.push(cabinMat);
    const cabinMesh = new THREE.InstancedMesh(cabinGeo, cabinMat, N_ASC);
    /* the fittings take the palette's shared grade unaltered — no clone, no emissive, no DoubleSide.
       They are lit by the wall behind them the way objects in a room are. */
    const fitMesh = new THREE.InstancedMesh(fitGeo, M.platinumMidLit || M.platinumLit || podShellMat, N_ASC);
    fitMesh.name = 'ascent-pod-fittings';
    const doorGlowMesh = new THREE.InstancedMesh(doorGlowGeo, podSeamMat, N_ASC);
    const leafMeshA = new THREE.InstancedMesh(leafGeo, podShellMat, N_ASC);
    const leafMeshB = new THREE.InstancedMesh(leafGeoB, podShellMat, N_ASC);
    cabinMesh.name = 'ascent-pod-cabin'; doorGlowMesh.name = 'ascent-pod-door-glow';
    leafMeshA.name = 'ascent-pod-door-a'; leafMeshB.name = 'ascent-pod-door-b';
    doorGlowMesh.renderOrder = 7;
    [cabinMesh, fitMesh, doorGlowMesh, leafMeshA, leafMeshB].forEach(m => {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; ascentGroup.add(m);
    });
    ascent.door = {
      cabin: cabinMesh, fit: fitMesh, glow: doorGlowMesh, a: leafMeshA, b: leafMeshB,
      hingeA, hingeB, swing: DOOR.SWING
    };

    /* ---- per-line state, allocated ONCE ------------------------------------------------------ */
    /* EVERY POD TURNS ITS DOOR TOWARD THE PLAZA, AND THE ANGLE IS DERIVED, NOT TYPED.
       A door on a fixed bearing serves whichever pad happens to face the right way and presents the
       other two edge-on. The turn is a QUARTER at a time because the hull is four-fold symmetric:
       a multiple of 90 deg maps the square diamond exactly onto itself, so the belt still meets the
       four blades the cradle clearance was measured against, and the four points stay on the axes.
       The door's own outward bearing is the flank at 45 deg; the wanted bearing is from the pad to
       the plaza centre; the yaw is the difference, rounded to the nearest quarter turn. Measured
       error after rounding: 9 deg west, 16 deg east, 26 deg north — every door faces the arrival. */
    const Q = Math.PI / 2, FLANK = Math.PI / 4;
    ASCENTS.forEach(A => {
      const want = Math.atan2(-A.z, -A.x);            /* pad -> plaza centre, as an outline angle */
      const yaw = Math.round((FLANK - want) / Q) * Q;
      ascent.lines.push({ id: A.id, x: A.x, z: A.z, h: A.h, pod: A.pod, phase: A.phase,
        w: A.w, yaw, charge: 0, burst: 0, podOn: 0, podY: DOCK_Y, field: 3.2, door: 0 });
    });
    ascent.meshes = { core: coreMesh, band: bandMesh, sheath: sheathMesh, floor: floorMesh, reveal: revealMesh,
      shell: shellMesh, belt: beltMesh, glass: glassMesh, seam: seamMesh, field: fieldMesh2 };
    ascent.tex = bandTex;
    ascent.mats = { core: beamCoreMat, band: beamBandMat, sheath: beamSheathMat, reveal: revealMat, emitter: emitterMat, floor: padGlowMat, seam: podSeamMat, field: podFieldMat };
    ascent.base = { core: 0.60, band: 0.46, sheath: 0.115, reveal: 0.50, emitter: 0.88, floor: 0.52, seam: 0.85, field: 0.72 };

    /* the columns never move, so their matrices are written ONCE here; only their COLOUR is animated */
    const _im = new THREE.Matrix4(), _ip = new THREE.Vector3(), _iq = new THREE.Quaternion(), _is = new THREE.Vector3();
    ascent.lines.forEach((L, i) => {
      _iq.identity();
      _ip.set(L.x, BEAM_Y, L.z); _is.set(1, L.h, 1); _im.compose(_ip, _iq, _is);
      coreMesh.setMatrixAt(i, _im); bandMesh.setMatrixAt(i, _im); sheathMesh.setMatrixAt(i, _im);
      _ip.set(L.x, PAD_TOP, L.z); _is.set(1, 1, 1); _im.compose(_ip, _iq, _is); revealMesh.setMatrixAt(i, _im);
    });
    coreMesh.instanceMatrix.needsUpdate = bandMesh.instanceMatrix.needsUpdate = sheathMesh.instanceMatrix.needsUpdate = true;
    revealMesh.instanceMatrix.needsUpdate = true;

    /* ---- THE OUTPOSTS ------------------------------------------------------------------------
       Same geometry, same materials, own instanced meshes. Own meshes rather than extra instances
       on the central three because the plaza's lines carry pads, pods, doors and a lighting rank
       that iterate by index: growing those arrays for nine beams that have none of those things is
       how an index goes out of range three passes later. Three extra draw calls buys total
       independence and an identical look. */
    const N_OUT = OUTPOSTS.length;
    const oCore = new THREE.InstancedMesh(coreGeo, beamCoreMat, N_OUT);
    const oBand = new THREE.InstancedMesh(bandGeo, beamBandMat, N_OUT);
    const oSheath = new THREE.InstancedMesh(sheathGeo, beamSheathMat, N_OUT);
    oCore.renderOrder = 6; oBand.renderOrder = 5; oSheath.renderOrder = 4;
    oCore.name = 'outpost-line-core'; oBand.name = 'outpost-line-travel'; oSheath.name = 'outpost-line-sheath';
    [oCore, oBand, oSheath].forEach(m => { m.frustumCulled = false; ascentGroup.add(m); });

    /* the landing: a hexagonal deck, a rim, and four legs. Built once and instanced, in the world's
       own platinum and graphite so an outpost reads as the same civilisation as the plaza pads. */
    const landParts = [], legParts = [];
    {
      const deck = new THREE.CylinderGeometry(5.6, 5.2, 0.55, 6);
      const rim = new THREE.CylinderGeometry(6.05, 6.05, 0.20, 6, 1, true);
      landParts.push(deck.clone().translate(0, -0.28, 0));
      landParts.push(rim.clone().translate(0, 0.02, 0));
      /* a low rail, so the deck reads as somewhere a person can stand */
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const post = new THREE.CylinderGeometry(0.12, 0.14, 1.25, 6);
        landParts.push(post.clone().translate(Math.cos(a) * 5.2, 0.62, Math.sin(a) * 5.2));
        post.dispose();
      }
      const hoop = new THREE.TorusGeometry(5.2, 0.075, 5, 18).rotateX(Math.PI / 2);
      landParts.push(hoop.clone().translate(0, 1.18, 0));
      deck.dispose(); rim.dispose(); hoop.dispose();
      /* four legs, long enough to reach ground from any of the seated heights this table uses */
      const leg = new THREE.CylinderGeometry(0.42, 0.62, 1, 6);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        legParts.push(leg.clone().translate(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5));
      }
      leg.dispose();
    }
    /* mergeGeos takes the attribute list explicitly — it has no default, and omitting it took the
       WHOLE fobeam module down with "attrs is not iterable", which meant the central ascent lines
       vanished along with the outposts and three renders came back looking like a composition
       change. A module that dies quietly returns a plausible picture. */
    const landGeo = own(mergeGeos(landParts, ['position', 'normal', 'uv']));
    const legGeo = own(mergeGeos(legParts, ['position', 'normal', 'uv']));
    const landMesh = new THREE.InstancedMesh(landGeo, M.platinumLit || M.platinum, N_OUT);
    const legMesh = new THREE.InstancedMesh(legGeo, M.graphiteDark || M.graphite, N_OUT);
    landMesh.name = 'outpost-landing'; legMesh.name = 'outpost-legs';
    landMesh.castShadow = landMesh.receiveShadow = true;
    ascentGroup.add(landMesh); ascentGroup.add(legMesh);

    /* ---- SEATING. Called once here with a flat-ground fallback so the outposts exist even if the
       terrain module is absent or failed, and called AGAIN by mahplaza.js the moment terrain has
       built and can be asked how high the rock is. mahplaza builds fobeams before terrain — moving
       that order to suit one table would reshuffle the scene graph for every module that follows,
       so the seating is deferred instead of the build. Re-running it only rewrites five instance
       matrices, which is why it is a function rather than an inline block. ------------------- */
    const _om = new THREE.Matrix4(), _op = new THREE.Vector3(), _oq = new THREE.Quaternion(), _os = new THREE.Vector3();
    const FLAT = () => 0;
    function seatOutposts(sample) {
      const s = typeof sample === 'function' ? sample : FLAT;
      const seats = [];
      OUTPOSTS.forEach((O, i) => {
        const site = seekSite(s, O.deg, O.kind, O.from, O.to);
        /* the deck stands clear of the ground it found: on rock that is the legs' business, on the
           flat it is the laid deck's 0.17. A summit node sits a little proud of its own peak. */
        const y0 = site.y > 1 ? site.y + (O.kind === 'summit' ? 4.5 : 3.2) : DECK_Y;
        const x = site.x, z = site.z;
        _oq.identity();
        /* the beam, seated on the landing's deck and scaled to its own height */
        _op.set(x, y0 + 0.4, z); _os.set(O.w / 0.62, O.h, O.w / 0.62); _om.compose(_op, _oq, _os);
        oCore.setMatrixAt(i, _om); oBand.setMatrixAt(i, _om); oSheath.setMatrixAt(i, _om);
        _op.set(x, y0, z); _os.set(1, 1, 1); _om.compose(_op, _oq, _os); landMesh.setMatrixAt(i, _om);
        /* the legs run from the deck down INTO whatever it stands on, so the join is never a gap */
        const legH = Math.max(6, y0 - Math.max(0, site.y - 5));
        _op.set(x, y0 - 0.55 - legH / 2, z); _os.set(1, legH, 1); _om.compose(_op, _oq, _os);
        legMesh.setMatrixAt(i, _om);
        seats.push({ id: O.id, kind: O.kind, r: Math.round(site.r), ground: +site.y.toFixed(1), deck: +y0.toFixed(1), peak: +(site.peak || 0).toFixed(1) });
      });
      [oCore, oBand, oSheath, landMesh, legMesh].forEach(m => { m.instanceMatrix.needsUpdate = true; });
      outpostSeats = seats;
      return seats;
    }
    outpostSeater = seatOutposts;
    seatOutposts(null);
    [coreMesh, bandMesh, sheathMesh, revealMesh, floorMesh, shellMesh, beltMesh, glassMesh, seamMesh, fieldMesh2,
     cabinMesh, fitMesh, doorGlowMesh, leafMeshA, leafMeshB]
      .forEach(m => { for (let i = 0; i < m.count; i++) m.setColorAt(i, grey); m.instanceColor.needsUpdate = true; });
  }

  /* ---- R2 §10: THE UNIVERSAL MUSIC-LINE LAW --------------------------------------------------
     Every FOBEAM family carries the miniature vertical music-line motif at or near its PHYSICAL
     endpoint. This module owns two families, so both get one, and both get it from the shared
     infrastructure in musicline.js rather than hand-rolling a bar graph — §11 says build it once.

     WHERE, exactly, and why:
       · every NODES entry a route actually resolves against — those are the physical emitters and
         receivers §12 insists on, and a beam that arrives at a bare post is the thing this law is
         written against. The figure stands just under the node so it reads against the node's own
         mass rather than floating in sky.
       · every ASCENT pad, on its coping, facing the plaza. A launch pad is where a viewer stands
         closest to the network, so it is where the motif has to survive inspection.
     SCALE IS MEASURED FROM THE VIEWING DISTANCE, NOT FROM THE MOTIF. The first cut used 1.35 m at a
     node and 0.9 m on a pad, reasoning from the word "miniature" — and at 25 m the seven bars were a
     smudge, at 80 m they were nothing. "Miniature" is relative to the 130 m tower it sits on, not to
     a hand. 4.2 m at a node reads from the plaza deck and is still 3% of its tower; 1.6 m on a pad
     is chest height to a walker standing next to it, which is where the motif has to survive real
     inspection. The figure is 0.457 of its height wide, so a node motif is 4.2 x 1.9 m. */
  const mlSites = [];
  for (const k of Object.keys(NODES)) {
    const nd = NODES[k];
    if (!nd || !nd.p) continue;
    /* face the plaza centre: a motif seen edge-on is a line, and a line is not a reading */
    mlSites.push({ x: nd.p[0], y: nd.p[1] - 6.4, z: nd.p[2], ry: Math.atan2(-nd.p[0], -nd.p[2]) + Math.PI, scale: 4.2 });
  }
  for (const A of ASCENTS) {
    /* off-centre on the coping so the pad's own beam column does not stand in front of it */
    mlSites.push({ x: A.x + 2.05, y: PAD_TOP + 0.16, z: A.z + 1.5, ry: Math.atan2(-A.x, -A.z) + Math.PI, scale: 1.6 });
  }
  const musicLines = createMusicLineField(ctx, mlSites, { name: 'fobeam-musicline', opacity: 0.78 });
  group.add(musicLines.group);

  if (scene && !group.parent) scene.add(group);

  /* ---- animation ------------------------------------------------------------------------- */
  let dim = 1;                       /* time-of-day multiplier: 1 at night, 0.3 by day */
  let lastT = -1, driven = false, selfT = 0;
  const base = { rail: 0.5, field: 0.1, packet: 0.9, light: 0.5, arrive: 0.6 };
  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _view = new THREE.Vector3();
  const _nrm = new THREE.Vector3(), _bin = new THREE.Vector3(), _mat = new THREE.Matrix4(), _camPos = new THREE.Vector3(0.6, 3, 42);
  const state = { pos: new Float32Array(N * 3), tan: new Float32Array(N * 3) };

  function sampleAt(r, s, outP, outT) {
    const u = clamp01(s / r.len) * SEG, i0 = Math.min(SEG - 1, Math.floor(u)), f = u - i0, a = i0 * 3, b = a + 3;
    outP.set(r.px[a] + (r.px[b] - r.px[a]) * f, r.px[a + 1] + (r.px[b + 1] - r.px[a + 1]) * f, r.px[a + 2] + (r.px[b + 2] - r.px[a + 2]) * f);
    outT.set(r.tx[a] + (r.tx[b] - r.tx[a]) * f, r.tx[a + 1] + (r.tx[b + 1] - r.tx[a + 1]) * f, r.tx[a + 2] + (r.tx[b + 2] - r.tx[a + 2]) * f).normalize();
  }

  /* advance the packets and the receivers; no allocation, no geometry touched */
  function step(t, dt) {
    if (t === lastT) return;                 /* the module is safe to drive twice in one frame */
    lastT = t;
    dt = dt > 0 ? Math.min(dt, 0.1) : 0.016;
    for (let i = 0; i < N; i++) {
      const pk = packets[i], r = routes[pk.r];
      pk.s += pk.speed * dt;
      if (pk.s >= r.len) {                   /* transfer: the destination brightens, the origin sends again */
        pk.s -= r.len;
        if (r.to != null && nodeList[r.to]) nodeList[r.to].flash = 1;
        if (r.from != null && nodeList[r.from]) nodeList[r.from].flash = Math.max(nodeList[r.from].flash, 0.55);
      }
      sampleAt(r, pk.s, _p, _t);
      state.pos[i * 3] = _p.x; state.pos[i * 3 + 1] = _p.y; state.pos[i * 3 + 2] = _p.z;
      state.tan[i * 3] = _t.x; state.tan[i * 3 + 1] = _t.y; state.tan[i * 3 + 2] = _t.z;
      /* enter → travel → transfer: brightness rises through the middle and fades at both ends */
      const u = pk.s / r.len;
      pk.b = pk.gain * (0.5 + 0.5 * Math.sin(Math.PI * u)) * smoothstep(0, 0.09, u) * smoothstep(0, 0.09, 1 - u);
      packetMesh.instanceColor.setXYZ(i, pk.b, pk.b, pk.b);
      const lb = pk.b * 0.85;
      lightMesh.instanceColor.setXYZ(i, lb, lb, lb);
    }
    packetMesh.instanceColor.needsUpdate = true; lightMesh.instanceColor.needsUpdate = true;
    /* receivers: a brief local brightening (~0.4 s), never an explosion */
    let any = false;
    for (let i = 0; i < nodeList.length; i++) {
      const n = nodeList[i];
      if (n.flash > 0) { n.flash = Math.max(0, n.flash - dt / 0.42); any = true; }
      const v = n.flash * n.flash * 0.9 + 0.06;
      arriveMesh.instanceColor.setXYZ(i, v, v, v);
    }
    if (any || arriveMesh.instanceColor.version === 0) arriveMesh.instanceColor.needsUpdate = true;
    /* the flows breathe, very slowly and out of phase with each other */
    for (let i = 0; i < flowMeshes.length; i++) {
      const m = flowMeshes[i];
      m.material.opacity = m.userData.base * dim * (0.82 + 0.18 * Math.sin(t * m.userData.drift + m.userData.phase));
    }
    stepAscent(t);
  }

  /* ---- the ascent cycle -----------------------------------------------------------------------
     Everything below is a pure function of ABSOLUTE t, so a capture at a given second reproduces
     exactly and nothing carries spawn state between frames. No allocation: the per-line records and
     every scratch vector were made at build time. */
  const _lm = new THREE.Matrix4(), _lp = new THREE.Vector3(), _lq = new THREE.Quaternion(), _ls = new THREE.Vector3();
  const _upAxis = new THREE.Vector3(0, 1, 0);
  /* the door's scratch set, allocated here with every other one for the same stated reason: update()
     allocates nothing, and SKY-LAW-014 measures that rather than trusting it */
  const _dm = new THREE.Matrix4(), _dh = new THREE.Matrix4(), _dr = new THREE.Matrix4(), _dt = new THREE.Matrix4();
  const _dq = new THREE.Quaternion(), _dp = new THREE.Vector3();
  function stepAscent(t) {
    const A = ascent, MS = A.meshes;
    if (!MS) return;
    /* ONE shared texture scrolls all three lines; each line's own height turns the same v-space
       scroll into a different metres-per-second, which is why they never march in step */
    A.tex.offset.y = -((t * BAND_RATE) % 1);
    for (let i = 0; i < A.lines.length; i++) {
      const L = A.lines[i];
      let u = ((t / CYCLE + L.phase) % 1 + 1) % 1;
      let charge = 0, burst = 0, podOn = 0, podY = DOCK_Y, field = 3.2;
      /* THE DOORS ARE PART OF THE DEPARTURE, NOT A DECORATION ON IT. They open once the car has
         settled on its field and they are shut and sealed well before ignition — U_SHUT is a
         quarter of the way from PREP to READY, so the last thing that happens before the line goes
         hot is the doors closing, which is exactly the beat that tells a watcher it is leaving.
         A door open during a launch would say the opposite of everything else in this cycle. */
      const U_OPEN = U_DOCK + 0.012, U_SHUT = U_PREP + (U_READY - U_PREP) * 0.25;
      let door = 0;
      if (u >= U_OPEN && u < U_SHUT) door = smoothstep(U_OPEN, U_OPEN + 0.020, u) * (1 - smoothstep(U_SHUT - 0.030, U_SHUT, u));
      if (u >= U_ARRIVE && u < U_DOCK) {
        /* ARRIVAL: the same energy in reverse. It comes down the line out of the sky, decelerating
           hard, and the burst peaks at the moment it settles onto its field. */
        const k = (u - U_ARRIVE) / (U_DOCK - U_ARRIVE);
        podOn = 1; podY = DOCK_Y + DROP * Math.pow(1 - k, DROP_POW);
        charge = 0.30 + 0.70 * (1 - k);
        burst = Math.exp(-(1 - k) * 3.6);
        field = 3.2 + 12 * Math.pow(1 - k, 1.7);
      } else if (u >= U_DOCK && u < U_FIRE) {
        /* DOCKED, then PREPARING: over 24 s the shell brightens, the seams light, the underside
           field spools up and the line beneath charges — the departure is visible long before it
           happens, which is the whole point of it being a departure and not a disappearance. */
        podOn = 1;
        podY = DOCK_Y + 0.07 * Math.sin(t * 0.55 + i * 2.1);   /* it stands on its field; it never quite sits */
        charge = 0.10 + 0.90 * smoothstep(U_PREP, U_READY, u);
        field = 3.2 + 1.6 * charge;
      } else if (u >= U_FIRE && u < U_GONE) {
        /* LAUNCH: 2.4 s of extreme vertical acceleration and one burst of POWER at ignition. No
           fireball, no debris — the pod is intact the whole way and is back on this line next cycle. */
        const k = (u - U_FIRE) / (U_GONE - U_FIRE);
        podOn = 1; podY = DOCK_Y + CLIMB * Math.pow(k, CLIMB_POW);
        charge = 1; burst = Math.exp(-k * 3.2);
        field = 3.2 + 14 * smoothstep(0, 0.22, k) * (1 - 0.45 * k);
      } else if (u >= U_GONE && u < U_COLD) {
        charge = 1 - smoothstep(U_GONE, U_COLD, u);            /* the pad cools over ~11 s */
      }
      L.charge = charge; L.burst = burst; L.podOn = podOn; L.podY = podY; L.field = field; L.door = door;

      /* THE RANK WEIGHTS THE STANDING LINE. IT DOES NOT WEIGHT THE EVENT.
         A launch is the loudest thing this module does, and a secondary line that could not announce
         its own launch would not be a quieter line, it would be a broken one. So the rank scales the
         resting-and-charging term in full, and the burst only three-fifths of the way: at rest the
         three columns sit at 1.30 / 0.62 / 0.52 — a real ladder, readable at a glance from the plaza
         — while a departure still roughly triples whichever line is departing.
         Only the three COLUMNS are ranked. The pad reveals, the pods, the seams and the floor pool
         below are near-field architecture at the walker's own scale; dimming those would remove
         detail to solve a problem that is entirely about the far verticals. */
      const w = L.w, ev = 0.35 + 0.65 * w;
      const beam = w * (1 + 0.55 * charge) + ev * 2.1 * burst;
      MS.core.instanceColor.setXYZ(i, beam, beam, beam);
      MS.band.instanceColor.setXYZ(i, beam, beam, beam);
      MS.sheath.instanceColor.setXYZ(i, beam, beam, beam);
      const rev = 0.85 + 0.60 * charge + 1.9 * burst;
      MS.reveal.instanceColor.setXYZ(i, rev, rev, rev);

      /* the pod: one transform for the hull family, one for the field it stands on. The yaw is the
         quarter turn that aims this car's door at the plaza, computed once at build. */
      const s = L.pod * podOn;
      _lq.setFromAxisAngle(_upAxis, L.yaw); _lp.set(L.x, podY, L.z); _ls.set(s, s, s); _lm.compose(_lp, _lq, _ls);
      MS.shell.setMatrixAt(i, _lm); MS.belt.setMatrixAt(i, _lm); MS.glass.setMatrixAt(i, _lm); MS.seam.setMatrixAt(i, _lm);
      /* the doorway rides the same transform: the jamb, the cabin and the two lit pieces are part of
         the car and never move relative to it. Only the LEAVES get a transform of their own. */
      if (A.door) {
        const D = A.door;
        D.cabin.setMatrixAt(i, _lm); D.fit.setMatrixAt(i, _lm); D.glow.setMatrixAt(i, _lm);
        /* a leaf swings about a VERTICAL axis through its own outer edge, so shut it lies exactly on
           the hull it was lofted from and open it stands clear of the opening. The hinge point is in
           the pod's local frame, so the swing is composed BEFORE the pod's own transform: the leaf
           matrix is podMatrix * T(h) * Ry(theta) * T(-h), and the two leaves turn opposite ways. */
        const th = door * D.swing;
        _dq.setFromAxisAngle(_upAxis, th);
        _dp.set(D.hingeA[0], 0, D.hingeA[1]);
        _dh.makeTranslation(_dp.x, 0, _dp.z).multiply(_dr.makeRotationFromQuaternion(_dq)).multiply(_dt.makeTranslation(-_dp.x, 0, -_dp.z));
        D.a.setMatrixAt(i, _dm.multiplyMatrices(_lm, _dh));
        _dq.setFromAxisAngle(_upAxis, -th);
        _dp.set(D.hingeB[0], 0, D.hingeB[1]);
        _dh.makeTranslation(_dp.x, 0, _dp.z).multiply(_dr.makeRotationFromQuaternion(_dq)).multiply(_dt.makeTranslation(-_dp.x, 0, -_dp.z));
        D.b.setMatrixAt(i, _dm.multiplyMatrices(_lm, _dh));
        /* the threshold line and the coffer brighten as the doors open: the cabin lighting up is how
           a car at 25 m says it is boarding rather than merely parked */
        const dg = 0.30 + 0.95 * door + 0.9 * burst;
        D.glow.instanceColor.setXYZ(i, dg, dg, dg);
      }
      const fw = (1.5 + 1.1 * burst) * s;
      _lp.set(L.x, podY + POD_BOTTOM * s, L.z); _ls.set(fw, -L.field * podOn, fw); _lm.compose(_lp, _lq, _ls);
      MS.field.setMatrixAt(i, _lm);
      const hull = 1 + 0.55 * charge + 1.1 * burst;
      MS.shell.instanceColor.setXYZ(i, hull, hull, hull);
      MS.belt.instanceColor.setXYZ(i, hull, hull, hull);
      MS.glass.instanceColor.setXYZ(i, hull, hull, hull);
      const sm = 0.28 + 0.72 * charge + 1.6 * burst;
      MS.seam.instanceColor.setXYZ(i, sm, sm, sm);
      const fd = 0.30 + 0.70 * charge + 1.4 * burst;
      MS.field.instanceColor.setXYZ(i, fd, fd, fd);

      /* the floor and the coping: spill, pool and streak all surge together */
      const fl = 0.34 + 0.50 * charge + 1.5 * burst;
      MS.floor.instanceColor.setXYZ(i * 3, fl * 1.15, fl * 1.15, fl * 1.15);
      MS.floor.instanceColor.setXYZ(i * 3 + 1, fl, fl, fl);
      MS.floor.instanceColor.setXYZ(i * 3 + 2, fl * 0.92, fl * 0.92, fl * 0.92);
    }
    MS.core.instanceColor.needsUpdate = MS.band.instanceColor.needsUpdate = MS.sheath.instanceColor.needsUpdate = true;
    MS.reveal.instanceColor.needsUpdate = MS.floor.instanceColor.needsUpdate = true;
    MS.shell.instanceColor.needsUpdate = MS.belt.instanceColor.needsUpdate = MS.glass.instanceColor.needsUpdate = true;
    MS.seam.instanceColor.needsUpdate = MS.field.instanceColor.needsUpdate = true;
    MS.shell.instanceMatrix.needsUpdate = MS.belt.instanceMatrix.needsUpdate = MS.glass.instanceMatrix.needsUpdate = true;
    MS.seam.instanceMatrix.needsUpdate = MS.field.instanceMatrix.needsUpdate = true;
    if (A.door) {
      const D = A.door;
      D.cabin.instanceMatrix.needsUpdate = D.fit.instanceMatrix.needsUpdate = D.glow.instanceMatrix.needsUpdate = true;
      D.a.instanceMatrix.needsUpdate = D.b.instanceMatrix.needsUpdate = true;
      if (D.glow.instanceColor) D.glow.instanceColor.needsUpdate = true;
    }
  }

  /* THE FLOOR'S SECOND COPY. On black platinum at roughness 0.055 the reflection of a vertical light
     is a STREAK running from its base toward the viewer, and it lengthens as the view gets more
     grazing — so it has to be re-aimed at whatever camera is actually looking, every frame, or it is
     only correct from one. Nine quads, one draw call: per line a spill lying on the pad coping, a
     round pool on the deck, and the streak. */
  function orientAscent() {
    const A = ascent, MS = A.meshes;
    if (!MS) return;
    for (let i = 0; i < A.lines.length; i++) {
      const L = A.lines[i];
      /* the coping spill has to STAY ON THE COPING or it is a glowing sheet hanging a metre over the
         deck: the coping is a 5.4 m diamond, so the largest square that fits inside it is 3.8 across
         and this disc is sized from that, not from how big the glow would like to be */
      const r = 1.75 + 0.45 * L.charge;
      _lq.identity();
      _lp.set(L.x, PAD_TOP + 0.04, L.z); _ls.set(r * 2, 1, r * 2); _lm.compose(_lp, _lq, _ls);
      MS.floor.setMatrixAt(i * 3, _lm);
      const pr = 26 + 16 * L.charge + 12 * L.burst;
      _lp.set(L.x, DECK_Y + 0.08, L.z); _ls.set(pr, 1, pr); _lm.compose(_lp, _lq, _ls);
      MS.floor.setMatrixAt(i * 3 + 1, _lm);
      /* the streak: aimed along the ground at the camera, and longer the further away (and therefore
         the more grazing) the view is — clamped so a camera standing on the pad does not get a bar */
      let dx = _camPos.x - L.x, dz = _camPos.z - L.z;
      const d = Math.hypot(dx, dz);
      if (d < 1e-3) { dx = 0; dz = 1; }
      const len = Math.min(96, Math.max(14, d * 0.62)) * (1 + 0.3 * L.charge + 0.4 * L.burst);
      const w = (5.2 + 3.4 * L.charge + 4 * L.burst);
      _lq.setFromAxisAngle(_upAxis, Math.atan2(dx, dz));
      _lp.set(L.x + (dx / (d || 1)) * len * 0.42, DECK_Y + 0.09, L.z + (dz / (d || 1)) * len * 0.42);
      _ls.set(w, 1, len); _lm.compose(_lp, _lq, _ls);
      MS.floor.setMatrixAt(i * 3 + 2, _lm);
    }
    MS.floor.instanceMatrix.needsUpdate = true;
  }

  /* orient every packet: the long axis follows the path, the roll is billboarded so the
     diamond never reads as an edge-on sliver. Done at render time, where the camera is known. */
  function orient(camera) {
    if (camera && camera.isCamera) _camPos.setFromMatrixPosition(camera.matrixWorld);
    for (let i = 0; i < N; i++) {
      const pk = packets[i], a = i * 3;
      _p.set(state.pos[a], state.pos[a + 1], state.pos[a + 2]);
      _t.set(state.tan[a], state.tan[a + 1], state.tan[a + 2]);
      _view.subVectors(_p, _camPos).normalize();
      const d = _view.dot(_t);
      _nrm.copy(_view).addScaledVector(_t, -d);
      if (_nrm.lengthSq() < 1e-5) { _nrm.set(0, 1, 0).addScaledVector(_t, -_t.y); if (_nrm.lengthSq() < 1e-5) _nrm.set(0, 0, 1); }
      _nrm.normalize().negate();                       /* the diamond's plane faces the camera */
      _bin.crossVectors(_nrm, _t).normalize();
      const s = pk.size;
      _mat.set(
        _t.x * s * 1.18, _bin.x * s, _nrm.x * s * 0.26, _p.x,
        _t.y * s * 1.18, _bin.y * s, _nrm.y * s * 0.26, _p.y,
        _t.z * s * 1.18, _bin.z * s, _nrm.z * s * 0.26, _p.z,
        0, 0, 0, 1
      );
      packetMesh.setMatrixAt(i, _mat);
      const L = s * 5.4, W = s * 2.3;                  /* the travelling light: an elongated ellipse on the path */
      _mat.set(
        _t.x * L, _bin.x * W, _nrm.x, _p.x,
        _t.y * L, _bin.y * W, _nrm.y, _p.y,
        _t.z * L, _bin.z * W, _nrm.z, _p.z,
        0, 0, 0, 1
      );
      lightMesh.setMatrixAt(i, _mat);
    }
    packetMesh.instanceMatrix.needsUpdate = true; lightMesh.instanceMatrix.needsUpdate = true;
    orientAscent();
  }
  /* if the assembly never calls update(), the motion still runs — but only while frames are
     actually drawn, so a reduced-motion session stays still */
  packetMesh.onBeforeRender = function (renderer, sc, camera) {
    if (!driven) { const now = performance.now() / 1000; const d = selfT ? now - selfT : 0.016; selfT = now; step(now, d); }
    orient(camera);
  };

  /* ---- contract surface ------------------------------------------------------------------ */
  function setTime(clockState) {
    const day = clockState && typeof clockState.daylight === 'number' ? clamp01(clockState.daylight) : 0;
    dim = 1 - 0.7 * day;                               /* full at night, ×0.3 by day */
    railMat.opacity = base.rail * dim;
    fieldMat.opacity = base.field * dim;
    packetMat.opacity = base.packet * dim;
    lightMat.opacity = base.light * dim;
    arriveMat.opacity = base.arrive * dim;
    flowMeshes.forEach(m => { m.material.opacity = m.userData.base * dim; });
    /* the ascent network dims with the day too — but only its LIGHT. The pods' shell, belt and
       glazing are physical objects lit by the scene, and a craft that faded out at noon would be a
       hologram; only what the network EMITS follows the clock. */
    if (ascent.mats) { const A = ascent; Object.keys(A.mats).forEach(k => { A.mats[k].opacity = A.base[k] * dim; }); }
    return dim;
  }
  function setTheme(t) {
    if (!t) return t;
    /* the world Theme owns beam colour — and only beam colour; it never reaches a resident */
    railMat.color.setHex(t.energyLight); packetMat.color.setHex(t.energyLight); arriveMat.color.setHex(t.energyLight);
    fieldMat.color.setHex(t.energy); lightMat.color.setHex(t.energy);
    flowMeshes.forEach(m => m.material.color.setHex(t.energy));
    if (ascent.mats) {
      const A = ascent.mats;
      A.core.color.setHex(t.energyLight); A.emitter.color.setHex(t.energyLight); A.seam.color.setHex(t.energyLight);
      A.band.color.setHex(t.energy); A.sheath.color.setHex(t.energy); A.reveal.color.setHex(t.energy);
      A.floor.color.setHex(t.energy); A.field.color.setHex(t.energy);
    }
    return t;
  }
  function update(t, dt) { driven = true; step(t, dt); musicLines.update(t); }

  function dispose() {
    musicLines.dispose();
    retired.forEach(o => { o.visible = true; }); retired.length = 0;
    const i = (ctx.timeHooks || []).indexOf(timeHook); if (i > -1) ctx.timeHooks.splice(i, 1);
    packetMesh.onBeforeRender = function () {};
    if (group.parent) group.parent.remove(group);
    packetMesh.dispose(); lightMesh.dispose(); headMesh.dispose(); arriveMesh.dispose();
    if (ascent.meshes) Object.keys(ascent.meshes).forEach(k => { const m = ascent.meshes[k]; if (m && m.dispose) m.dispose(); });
    owned.geometries.forEach(g => g.dispose());
    owned.materials.forEach(m => m.dispose());
    owned.textures.forEach(t => t.dispose());
  }

  /* time is the one thing the world may change without knowing about us */
  const timeHook = s => setTime(s);
  if (ctx.timeHooks && ctx.timeHooks.push) ctx.timeHooks.push(timeHook);
  try { setTime(ctx.clock && ctx.clock.state ? ctx.clock.state() : { daylight: 0 }); } catch (e) { setTime({ daylight: 0 }); }
  setTheme(theme);
  step(0, 0.016); orient(null);

  /* MEASURED, not estimated: walk what was actually built and count what the renderer will issue.
     An InstancedMesh is ONE draw call and count × its geometry's triangles, which is the whole
     reason the network is instanced. The +2 is the pair of mirrored copies the assembly builds
     under the deck from this module's two ctx.reflect() registrations. */
  const ascentCost = (() => {
    let calls = 0, tris = 0;
    ascentGroup.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry, n = o.isInstancedMesh ? o.count : 1;
      calls++; tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * n;
    });
    return { drawCalls: calls + 2, triangles: Math.round(tris), meshes: calls, reflections: 2, lights: 0 };
  })();

  const tierCount = t => routes.filter(r => r.tier === t).length;
  const stats = {
    routes: routes.filter(r => r.from != null).map(r => ({ id: r.id, tier: r.tier, from: nodeList[r.from].id, to: nodeList[r.to].id, length: Math.round(r.len), speed: r.speed, packets: r.count })),
    tiers: { near: tierCount('near'), mid: tierCount('mid'), far: tierCount('far') },
    routeCount: routes.length,
    packets: N,
    receivers: nodeList.length,
    flows: flowMeshes.length,
    ascent: {
      lines: ascent.lines.map(L => ({ id: L.id, at: [L.x, L.z], height: L.h, podScale: L.pod, phase: L.phase })),
      cycle: CYCLE, launchSeconds: +((U_GONE - U_FIRE) * CYCLE).toFixed(2), climb: CLIMB,
      drawCalls: ascentCost.drawCalls, meshes: ascentCost.meshes, reflections: ascentCost.reflections,
      triangles: ascentCost.triangles, lightsAdded: 0,
      pools: typeof ctx.lightPool === 'function' ? ASCENTS.length : 0
    },
    drawCalls: 2 + 2 + 3 + flowMeshes.length + ascentCost.drawCalls,   /* rail, field | packets, lights | receivers ×3 | flows | ascent */
    triangles: routes.reduce((n, r) => { const T = TIER[r.tier]; return n + T.ts * T.rs * 2 + T.fts * T.frs * 2; }, 0) + N * 10 + nodeList.length * 90 + flowMeshes.length * 120 + ascentCost.triangles,
    legacyHidden: retired.length
  };
  /* stats is assembled further down this file than the field is built, so the count is attached
     here rather than at the build site — where `stats` is still in its temporal dead zone. */
  stats.musicLines = musicLines.stats;
  /* the outposts report from here for the same reason the music lines do — see the note above. The
     seats are a live reference, so a later re-seat against terrain shows up without re-publishing. */
  stats.outposts = OUTPOSTS.length;
  Object.defineProperty(stats, 'outpostSeats', { get: () => outpostSeats, enumerable: true });
  return {
    group, setTime, update, dispose, stats, routes: stats.routes, ascent: stats.ascent,
    /* re-seat the ascent outposts against a terrain height sampler. mahplaza builds this module
       before terrain, so at build time there is no rock to ask and the nine landings sit on the
       flat; this is how they find the mountains afterwards. Returns the seats it chose. */
    seatOutposts(sample) { return outpostSeater ? outpostSeater(sample) : []; },
    /* THE LIVE LINE STATE, and it is exported so the doors can be MEASURED rather than photographed.
       stats.ascent is a snapshot taken at build and can say nothing about whether a leaf ever moved;
       a render can show a 140-pixel pod and settle nothing. These are the same objects stepAscent
       writes every frame — charge, burst, podY, and `door`, the 0..1 the leaves swing on — so a law
       can advance the clock and assert the one thing that actually matters about a door on a
       vehicle: that it is open while the car is docked and shut before the line goes hot. */
    ascentLines: ascent.lines,
    setTheme(th) { setTheme(th); musicLines.setTheme(th); },
    setQuality(q) { musicLines.setQuality(q); },
    /* the world's single audio surface: hand it normalized band energy and every FOBEAM endpoint
       responds together. No AudioContext is created anywhere in this path (MAH PLAYER owns music). */
    setAudioLevels(arr) { musicLines.setLevels(arr); },
    setMusicState(name) { musicLines.setState(name); },
    musicLines
  };
}
