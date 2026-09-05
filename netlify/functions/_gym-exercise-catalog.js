'use strict';

/*
 * FOB workout-library expansion.
 *
 * This is intentionally data-only.  The coach endpoint inserts a row only
 * when an exercise with the same name has never existed.  It never
 * updates coach-created rows, programs, sessions, sets, or exercise history.
 * Existing gym_exercises columns are sufficient, so no migration is needed.
 */
const catalog = [];

function add(names, category, region, muscles, equipment, vars, options) {
  const o = options || {};
  names.forEach(function (name) {
    catalog.push({
      name: name,
      category: category,
      region: region || null,
      muscles: (muscles || []).slice(),
      equipment: equipment || null,
      unilateral: !!o.unilateral,
      compound: !!o.compound,
      vars: (vars && vars.length ? vars : ['reps']).slice(),
      instructions: o.instructions || null,
      is_custom: false,
      archived: false
    });
  });
}

/* FOB movements already supported by the product. */
add([
  'Reversal', 'Arm Rock (A.R.)', 'A.R. Reversal', 'Underhand Swing',
  'Pullback', 'Bottom Reverse', 'Star Stance', 'Lateral Raises / Lats',
  'Upright Row and Press Down', 'Break Stance', 'Overstance',
  'Power Reversal', 'Upper Cut', 'High Upright Row', 'High Pullover',
  'Forward Slash', 'Back Slash', 'Slash Loop', '360 Pendulum (Unanchored)',
  'Yank Row (Anchored)', 'Yank Tricep Extension (Anchored)',
  'Yank Chest Press (Anchored)'
], 'fob', 'full-body', ['full body'], 'fob', ['distance', 'time']);

/* Shoulder and rotator-cuff preparation. */
add([
  'Banded Shoulder Internal Rotation (Elbow at Side)',
  'Banded Shoulder External Rotation (Elbow at Side)',
  'Banded Incline Shoulder Internal Rotation (Low to High)',
  'Banded Decline Shoulder Internal Rotation (High to Low)',
  'Banded Incline Shoulder External Rotation (Low to High)',
  'Banded Decline Shoulder External Rotation (High to Low)',
  'Banded 90/90 Shoulder Internal Rotation',
  'Banded 90/90 Shoulder External Rotation',
  'Banded No-Money Drill',
  'Banded Shoulder W',
  'Banded Shoulder Flexion',
  'Banded Shoulder Abduction'
], 'warmup', 'shoulders', ['shoulders', 'rotator cuff'], 'band', ['reps']);

add([
  'Arm Circles Forward', 'Arm Circles Backward', 'Alternating Arm Swings',
  'Cross-Body Arm Swings', 'Shoulder CARs', 'Half-Kneeling Shoulder CARs',
  'Wall Shoulder Flexion Slide', 'Scapular Wall Slide', 'Serratus Wall Slide',
  'Wall Angel', 'Floor Angel', 'Scapular Push-Up', 'Push-Up Plus',
  'Side-Lying Shoulder External Rotation', 'Prone Y Raise Warm-Up',
  'Prone T Raise Warm-Up', 'Prone W Raise Warm-Up',
  'Prone Shoulder Swimmer', 'Quadruped Shoulder Tap',
], 'warmup', 'shoulders', ['shoulders', 'rotator cuff', 'serratus'], 'bodyweight', ['reps']);

add([
  'Bottoms-Up Kettlebell Hold', 'Kettlebell Halo Warm-Up'
], 'warmup', 'shoulders', ['shoulders', 'rotator cuff', 'serratus'], 'kettlebell', ['reps']);

add([
  'PVC Shoulder Pass-Through', 'PVC Overhead Reach', 'PVC Around-the-World',
  'PVC External Rotation Lift-Off', 'PVC Front-Rack Mobilization',
  'PVC Overhead Squat Reach'
], 'warmup', 'shoulders', ['shoulders', 'upper back'], 'stick', ['reps']);

/* Scapula, upper-back, lat, and chest preparation. */
add([
  'Band Pull-Apart', 'Banded Overhead Pull-Apart',
  'Banded Diagonal Pull-Apart', 'Banded Face Pull',
  'Banded Face Pull to External Rotation', 'Straight-Arm Band Pulldown',
  'Banded Lat Activation', 'Banded Scapular Retraction',
  'Banded Serratus Punch', 'Banded Dynamic Hug'
], 'warmup', 'upper-back', ['upper back', 'scapula', 'lats'], 'band', ['reps']);

add([
  'Scapular Pull-Up', 'Dead-Hang Scapular Shrug', 'Active Hang',
  'Quadruped Scapular Protraction and Retraction', 'Bear Plank Scapular Press',
  'Prone Scapular Retraction', 'Chest-Supported Scapular Row',
  'Wall Scapular Clock', 'Forearm Wall Slide with Lift-Off',
  'Foam Roller Wall Slide'
], 'warmup', 'upper-back', ['upper back', 'scapula', 'serratus'], 'bodyweight', ['reps']);

add([
  'Cable Scapular Depression', 'Cable Scapular Retraction',
  'Cable Serratus Punch', 'Light Cable Face Pull'
], 'warmup', 'upper-back', ['upper back', 'scapula', 'serratus'], 'cable', ['reps']);

add([
  'Dynamic Chest Opener', 'Wall Pec Pulse', 'Doorway Pec Pulse',
  'Bench Pec Mobilization', 'Prayer Chest Pulse', 'Standing Rib-Cage Reach',
  'Alternating Chest Fly Warm-Up', 'Incline Push-Up Warm-Up'
], 'warmup', 'chest', ['chest', 'shoulders'], 'bodyweight', ['reps']);

/* Arms, elbows, forearms, and wrists. */
add([
  'Banded Triceps Pressdown Warm-Up', 'Banded Overhead Triceps Extension Warm-Up',
  'Light Band Biceps Curl', 'Banded Hammer Curl Warm-Up',
  'Banded Elbow Extension', 'Banded Elbow Flexion'
], 'warmup', 'arms', ['biceps', 'triceps', 'elbows'], 'band', ['reps']);

add([
  'Elbow Circles', 'Forearm Pronation and Supination',
  'Controlled Biceps Flex and Extend', 'Triceps Reach and Sweep',
  'Arm Shake-Out', 'Close-Grip Wall Push-Up Warm-Up'
], 'warmup', 'arms', ['biceps', 'triceps', 'elbows'], 'bodyweight', ['reps']);

add([
  'Wrist Circles', 'Wrist Flexion Rocks', 'Wrist Extension Rocks',
  'Quadruped Wrist Lean', 'Reverse Quadruped Wrist Lean',
  'Fist Open and Close', 'Finger Wave', 'Finger Extensor Band Opens',
  'Palm Lift-Off', 'Knuckle Rock', 'Radial and Ulnar Deviation',
  'Prayer Wrist Pulse', 'Reverse Prayer Wrist Pulse',
  'Tabletop Finger-Back Wrist Rock', 'Forearm Rotation with Light Dowel'
], 'warmup', 'wrists', ['wrists', 'forearms', 'hands'], 'bodyweight', ['reps']);

add([
  'Banded Wrist Extension', 'Banded Wrist Flexion',
  'Banded Forearm Pronation', 'Banded Forearm Supination'
], 'warmup', 'wrists', ['wrists', 'forearms'], 'band', ['reps']);

/* Spine and trunk preparation. */
add([
  'Cat-Cow', 'Segmental Cat-Cow', 'Standing Cat-Cow',
  'Quadruped Thread the Needle', 'Open Book Rotation',
  'Half-Kneeling Thoracic Rotation', 'Tall-Kneeling Thoracic Rotation',
  'Wall Thoracic Rotation', 'Standing Thoracic Rotation',
  'Seated Thoracic Rotation', 'Foam Roller Thoracic Extension',
  'Bench Thoracic Extension', 'Wall Thoracic Extension',
  'Quadruped Thoracic Extension', 'Standing Side-Bend Reach',
  'Side-Lying Windmill Rotation', 'Segmental Roll-Down',
  'Pelvic Tilt', 'Supine Pelvic Clock'
], 'warmup', 'spine', ['spine', 'thoracic', 'trunk'], 'bodyweight', ['reps']);

add([
  '90/90 Breathing', 'Crocodile Breathing', 'Box Breathing in Crook Lying',
  'Dead Bug Isometric Press', 'Dead Bug Heel Tap', 'Dead Bug Pullover',
  'Bird Dog', 'Bird Dog Elbow to Knee', 'Bear Hover',
  'Bear Hover Shoulder Tap', 'Plank Shoulder Tap Warm-Up',
  'High-Plank Knee Drive', 'Hollow-Body Rock Prep', 'McGill Curl-Up',
  'Side Plank Reach-Through Warm-Up', 'Glute Bridge March with Brace',
  'Standing Cross-Crawl', 'Half-Kneeling Chop Warm-Up',
  'Half-Kneeling Lift Warm-Up'
], 'warmup', 'core', ['core', 'obliques', 'trunk'], 'bodyweight', ['reps']);

add([
  'Pallof Press Isometric Warm-Up', 'Banded Dead Bug',
  'Banded Bear Plank Row Prep', 'Banded Standing Anti-Rotation Step-Out',
  'Half-Kneeling Pallof Hold', 'Standing Pallof Hold',
  'Tall-Kneeling Band Pulldown Brace'
], 'warmup', 'core', ['core', 'obliques', 'trunk'], 'band', ['reps']);

/* Hip, glute, and groin preparation. */
add([
  'Standing Hip Circles', 'Hip CARs', 'Quadruped Hip CARs',
  '90/90 Hip Switch', '90/90 Hip Switch with Reach',
  'Shin-Box Transition', 'Shin-Box Get-Up', 'Seated Hip Internal-Rotation Lift-Off',
  'Seated Hip External-Rotation Lift-Off', 'Hip Airplane (Supported)',
  'Hip Airplane Rotation Prep', 'Leg Cradle Walk', 'Knee Hug to Lunge',
  'Dynamic Figure-Four Walk', 'Lunge Hip-Flexor Pulse',
  'Half-Kneeling Hip-Flexor Rock', 'Psoas March', 'Supine Hip-Flexor March',
  'Standing Hip-Flexion Hold', 'Quadruped Rock-Back',
  'World\'s Greatest Stretch (Dynamic)', 'Spiderman Lunge with Rotation',
  'Reverse Lunge with Overhead Reach', 'Walking Lunge with Rotation'
], 'warmup', 'hips', ['hips', 'hip flexors'], 'bodyweight', ['reps']);

add([
  'Banded Hip-Flexor March', 'Banded Standing Hip Flexion',
  'Banded Hip Internal Rotation', 'Banded Hip External Rotation',
  'Banded Quadruped Hip Extension'
], 'warmup', 'hips', ['hips', 'hip flexors'], 'band', ['reps']);

add([
  'Glute Bridge', 'Single-Leg Glute Bridge', 'Glute Bridge March',
  'Frog Pump', 'Clamshell', 'Side-Lying Hip Abduction',
  'Fire Hydrant', 'Donkey Kick', 'Quadruped Hip Extension',
  'Standing Glute Kickback Warm-Up'
], 'warmup', 'glutes', ['glutes', 'hip abductors'], 'bodyweight', ['reps']);

add([
  'Mini-Band Squat',
  'Mini-Band Lateral Walk', 'Mini-Band Monster Walk Forward',
  'Mini-Band Monster Walk Backward', 'Mini-Band Diagonal Walk',
  'Mini-Band Standing Abduction', 'Mini-Band Bridge Abduction',
  'Wall Glute-Med Press Isometric'
], 'warmup', 'glutes', ['glutes', 'hip abductors'], 'band', ['reps']);

add([
  'Adductor Rock-Back', 'Dynamic Frog Rock', 'Lateral Lunge Shift',
  'Cossack Squat Shift', 'Half-Kneeling Adductor Rock',
  'Standing Groin Shift', 'Butterfly Pulse', 'Copenhagen Short-Lever Hold',
  'Adductor Squeeze Bridge', 'Supine Ball Adductor Squeeze',
  'Side-Lying Adductor Raise', 'Wide-Stance Squat Pry'
], 'warmup', 'groin', ['adductors', 'groin', 'hips'], 'bodyweight', ['reps']);

/* Knee, quad, hamstring, ankle, and foot preparation. */
add([
  'Reverse Nordic Prep', 'Heel-Elevated Squat Pry', 'Split-Squat Isometric',
  'Wall Sit Warm-Up', 'Quad Set', 'Straight-Leg Raise',
  'Step-Down Control Drill', 'Low Step-Up Warm-Up',
  'Poliquin Step-Up Warm-Up', 'Peterson Step-Up Warm-Up',
  'Knee-Over-Toe Split-Squat Rock', 'Bodyweight Cyclist Squat',
  'Supported Sissy-Squat Prep', 'Kneeling Quad Rock',
  'Lateral Step-Down Warm-Up', 'Backward Walk Warm-Up'
], 'warmup', 'quads-knees', ['quadriceps', 'knees'], 'bodyweight', ['reps']);

add([
  'Banded Terminal Knee Extension', 'Spanish Squat Isometric'
], 'warmup', 'quads-knees', ['quadriceps', 'knees'], 'band', ['reps']);

add([
  'Hamstring Sweep Walk', 'Walking Toe Touch', 'Inchworm',
  'Single-Leg RDL Reach', 'Leg Swing Front to Back',
  'Straight-Leg March', 'Hamstring Walkout', 'Bridge Walkout',
  'Nordic Hamstring Eccentric Prep', 'Sliding Leg-Curl Prep',
  'A-March', 'A-Skip', 'Butt Kick', 'High-Knee March'
], 'warmup', 'hamstrings', ['hamstrings', 'posterior chain'], 'bodyweight', ['reps']);

add([
  'Ankle Circles', 'Knee-to-Wall Dorsiflexion', 'Half-Kneeling Ankle Rock',
  'Standing Ankle Rock', 'Straight-Knee Calf Pulse',
  'Bent-Knee Calf Pulse', 'Bodyweight Calf Raise', 'Single-Leg Calf Raise Warm-Up',
  'Tibialis Raise Warm-Up', 'Heel Walk', 'Toe Walk', 'Pogo Prep',
  'Foot Doming', 'Toe Yoga', 'Big-Toe Mobilization', 'Seated Ankle Alphabet',
  'Lateral Ankle Weight Shift'
], 'warmup', 'calves-ankles', ['calves', 'ankles', 'feet'], 'bodyweight', ['reps']);

add([
  'Plantar-Fascia Ball Roll'
], 'warmup', 'calves-ankles', ['calves', 'ankles', 'feet'], 'massage ball', ['time']);

add([
  'Banded Ankle Dorsiflexion', 'Banded Ankle Plantar Flexion',
  'Banded Ankle Inversion', 'Banded Ankle Eversion',
  'Banded Ankle Mobilization', 'Banded Big-Toe Flexion'
], 'warmup', 'calves-ankles', ['calves', 'ankles', 'feet'], 'band', ['reps']);

/* General dynamic warm-ups. */
add([
  'Jumping Jack', 'Seal Jack', 'Low-Impact Jack', 'Bodyweight Squat Warm-Up',
  'Squat to Reach', 'Squat Pry', 'Reverse Lunge to Knee Drive',
  'Lateral Lunge and Reach', 'Inchworm to High Plank',
  'Walkout to Push-Up', 'Mountain Climber Warm-Up', 'Lateral Shuffle',
  'Carioca Step', 'Easy Skip', 'Bear Crawl',
  'Crab Walk', 'Duck Walk', 'Dynamic Burpee Walkout',
  'Overhead Reach and Calf Raise',
  'Cross-Crawl March', 'Lunge Matrix', 'Squat Matrix'
], 'warmup', 'full-body', ['full body'], 'bodyweight', ['reps'], { compound: true });

add(['Easy Jump Rope'], 'warmup', 'full-body', ['full body'], 'jump rope', ['time'], { compound: true });
add(['Medicine-Ball Slam Patterning'], 'warmup', 'full-body', ['full body'], 'medicine ball', ['reps'], { compound: true });
add([
  'Kettlebell Deadlift Patterning', 'Kettlebell Swing Patterning',
  'Goblet Squat Pry', 'Turkish Get-Up Roll to Elbow'
], 'warmup', 'full-body', ['full body'], 'kettlebell', ['reps'], { compound: true });

/* Cooldown and flexibility library. */
add([
  'Cross-Body Shoulder Stretch', 'Overhead Triceps Stretch',
  'Sleeper Stretch', 'Doorway Shoulder External-Rotation Stretch',
  'Wall Shoulder Flexion Stretch', 'Bench Shoulder Flexion Stretch',
  'Child\'s-Pose Lat Stretch', 'Bench Lat Stretch', 'Puppy-Pose Stretch',
  'Behind-the-Back Shoulder Stretch', 'Posterior-Capsule Shoulder Stretch'
], 'stretch', 'shoulders', ['shoulders', 'rotator cuff', 'lats'], 'bodyweight', ['time']);

add([
  'Doorway Pec Stretch', 'Corner Pec Stretch', 'Single-Arm Wall Pec Stretch',
  'Floor Pec Stretch', 'Prayer Chest Stretch', 'Wall Biceps Stretch',
  'Kneeling Lat Stretch', 'Hanging Lat Stretch', 'Seated Upper-Back Stretch',
  'Thread-the-Needle Hold', 'Open-Book Hold'
], 'stretch', 'chest-upper-back', ['chest', 'upper back', 'lats'], 'bodyweight', ['time']);

add([
  'Foam-Roller Thoracic Hold'
], 'stretch', 'chest-upper-back', ['chest', 'upper back', 'lats'], 'foam roller', ['time']);

add([
  'Standing Wrist-Flexor Stretch', 'Standing Wrist-Extensor Stretch',
  'Kneeling Wrist-Flexor Stretch', 'Kneeling Wrist-Extensor Stretch',
  'Prayer Wrist Stretch', 'Reverse-Prayer Wrist Stretch',
  'Finger-Extension Stretch', 'Forearm-Pronation Stretch',
  'Forearm-Supination Stretch', 'Bench Triceps Stretch'
], 'stretch', 'arms-wrists', ['arms', 'wrists', 'forearms'], 'bodyweight', ['time']);

add([
  'Child\'s Pose', 'Extended Child\'s Pose', 'Cobra Stretch', 'Sphinx Stretch',
  'Supine Knees-to-Chest Stretch', 'Supine Spinal Twist',
  'Seated Spinal Twist', 'Standing Side-Bend Stretch',
  'Half-Kneeling QL Stretch', 'Prayer Side Stretch',
  'Cat-Cow Cooldown', 'Happy Baby Stretch'
], 'stretch', 'core-spine', ['spine', 'core', 'trunk'], 'bodyweight', ['time']);

add([
  'Half-Kneeling Hip-Flexor Stretch', 'Kneeling Hip-Flexor Stretch',
  'Couch Stretch', 'Standing Hip-Flexor Stretch', 'Pigeon Stretch',
  'Figure-Four Stretch', 'Supine Figure-Four Stretch', '90/90 Hip Stretch',
  'Seated Glute Stretch', 'Lying Glute Stretch', 'Frog Stretch',
  'Butterfly Stretch', 'Half-Kneeling Adductor Stretch',
  'Side-Lunge Adductor Stretch', 'Wide-Knee Child\'s Pose',
  'Supported Cossack Hold', 'Hip Internal-Rotation Stretch',
  'Hip External-Rotation Stretch'
], 'stretch', 'hips-glutes-groin', ['hips', 'glutes', 'adductors'], 'bodyweight', ['time']);

add([
  'Standing Quad Stretch', 'Side-Lying Quad Stretch', 'Prone Quad Stretch',
  'Kneeling Quad Stretch', 'Seated Hamstring Stretch',
  'Supine Hamstring Strap Stretch', 'Standing Hamstring Stretch',
  'Half-Split Hamstring Stretch', 'Single-Leg Forward Fold',
  'Hurdler Hamstring Stretch', 'Wall Hamstring Stretch'
], 'stretch', 'quads-hamstrings', ['quadriceps', 'hamstrings'], 'bodyweight', ['time']);

add([
  'Wall Calf Stretch (Straight Knee)', 'Wall Soleus Stretch (Bent Knee)',
  'Downward-Dog Calf Pedal', 'Step Calf Stretch',
  'Half-Kneeling Dorsiflexion Hold', 'Kneeling Shin Stretch',
  'Plantar-Fascia Toe Stretch', 'Seated Towel Calf Stretch'
], 'stretch', 'calves-ankles', ['calves', 'ankles', 'feet'], 'bodyweight', ['time']);

/* Specialty strength, control, and athletic movements. */
add([
  'Z Press', 'Bradford Press', 'Cuban Press', 'Bottoms-Up Kettlebell Press',
  'Half-Kneeling Landmine Press', 'Tall-Kneeling Landmine Press',
  'Single-Arm Landmine Press', 'Landmine Push Press', 'Viking Press',
  'Kneeling Kettlebell Windmill'
], 'push', 'upper', ['shoulders', 'triceps', 'core'], 'specialty', ['weight', 'reps'], { compound: true });

add([
  'Powell Raise', 'Lu Raise', 'Trap-3 Raise', 'Incline Y Raise',
  'Cable Y Raise', 'Prone Cuban Rotation', 'Cable External Rotation',
  'Cable Internal Rotation', 'Cable 90/90 External Rotation',
  'Cable 90/90 Internal Rotation', 'Side-Lying Powell Raise'
], 'isolation', 'upper', ['shoulders', 'rotator cuff', 'upper back'], 'cable', ['weight', 'reps']);

add([
  'Meadows Row', 'Seal Row', 'Kroc Row', 'Helms Row',
  'Chest-Supported Kelso Shrug', 'Snatch-Grip High Pull',
  'Landmine Row', 'Half-Kneeling Single-Arm Pulldown',
  'Rope Climb Pull', 'Inverted Row with Feet Elevated'
], 'pull', 'upper', ['back', 'lats', 'biceps'], 'specialty', ['weight', 'reps'], { compound: true });

add([
  'Zercher Squat', 'Hatfield Squat', 'Cyclist Squat',
  'Spanish Squat', 'Sissy Squat', 'Belt Squat', 'Landmine Hack Squat',
  'ATG Split Squat', 'Front-Foot-Elevated Split Squat',
  'Rear-Foot-Elevated Split Squat', 'Poliquin Step-Up',
  'Peterson Step-Up', 'Lateral Step-Down', 'Cossack Squat'
], 'squat', 'lower', ['quadriceps', 'glutes', 'adductors'], 'specialty', ['weight', 'reps'], { compound: true });

add([
  'Jefferson Deadlift', 'Jefferson Curl', 'Snatch-Grip Romanian Deadlift',
  'B-Stance Romanian Deadlift', 'Kickstand Romanian Deadlift',
  'Landmine Romanian Deadlift', 'Cable Pull-Through',
  'Nordic Hamstring Curl', 'Razor Curl', 'Glute-Ham Raise',
  'Reverse Hyperextension', '45-Degree Back Extension',
  'Single-Leg Back Extension'
], 'hinge', 'lower', ['hamstrings', 'glutes', 'posterior chain'], 'specialty', ['weight', 'reps'], { compound: true });

add([
  'Copenhagen Plank', 'Copenhagen Hip Adduction', 'Cable Hip Airplane',
  'Standing Cable Hip Internal Rotation', 'Standing Cable Hip External Rotation',
  'Cable Hip Flexion', 'Cable Hip Abduction', 'Cable Hip Adduction',
  'Reverse Nordic Curl', 'Weighted Tibialis Raise',
  'Bent-Knee Calf Raise', 'Seated Soleus Raise'
], 'isolation', 'lower', ['hips', 'adductors', 'knees', 'calves'], 'specialty', ['weight', 'reps']);

add([
  'Turkish Get-Up', 'Half Turkish Get-Up', 'Kettlebell Windmill',
  'Bent Press', 'Waiter Carry', 'Bottoms-Up Carry', 'Suitcase Carry',
  'Front-Rack Carry', 'Overhead Carry', 'Cross-Body Carry',
  'Zercher Carry', 'Sandbag Bear-Hug Carry'
], 'carry', 'full', ['core', 'shoulders', 'grip'], 'specialty', ['distance', 'weight'], { unilateral: true, compound: true });

add([
  'Reverse Sled Drag', 'Forward Sled Drag', 'Lateral Sled Drag',
  'Sled March', 'Sled Sprint', 'Backward Treadmill Walk',
  'Heavy Rope Alternating Wave', 'Heavy Rope Double Wave',
  'Heavy Rope Lateral Wave', 'Heavy Rope Slam'
], 'conditioning', 'full', ['full body'], 'specialty', ['time', 'distance'], { compound: true });

add([
  'Snap-Down', 'Depth Drop', 'Pogo Jump', 'Lateral Pogo Jump',
  'Broad Jump', 'Box Jump', 'Depth Jump', 'Hurdle Hop',
  'Skater Bound', 'Single-Leg Forward Bound', 'Split-Squat Jump',
  'Squat Jump', 'Tuck Jump', 'Lateral Box Jump',
  'Rotational Medicine-Ball Throw', 'Medicine-Ball Chest Pass',
  'Medicine-Ball Scoop Toss', 'Medicine-Ball Overhead Slam',
  'Medicine-Ball Shot-Put Throw', 'Wall Drill A-March',
  'Wall Drill A-Switch', 'Falling Sprint Start'
], 'plyometric', 'full', ['full body', 'power'], 'specialty', ['reps'], { compound: true });

add([
  'Single-Leg Balance Hold', 'Single-Leg Balance Reach',
  'Single-Leg Clock Reach', 'Tandem Balance Walk',
  'Heel-to-Toe Walk', 'Single-Leg RDL Balance Reach',
  'Half-Kneeling Balance Hold', 'Tall-Kneeling Balance Hold',
  'Single-Leg Medicine-Ball Pass', 'Balance-Pad Single-Leg Hold'
], 'balance', 'full', ['ankles', 'hips', 'core'], 'bodyweight', ['time'], { unilateral: true });

module.exports = { catalog };
