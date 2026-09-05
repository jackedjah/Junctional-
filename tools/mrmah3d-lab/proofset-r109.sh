#!/bin/sh
# R109 proof set (brief section 35): silhouette, clay, faceted grayscale and final material for BOTH
# characters, plus the detail crops. usage: sh proofset-r109.sh <base> <outdir>
set -e
B="$1"; O="$2"; T="$(dirname "$0")"
mkdir -p "$O"
V="node $T/view.mjs $B"
for who in m f; do
  VAR=""; [ "$who" = f ] && VAR="variant=female"
  # 1-3 pure silhouette
  $V "$O/$who-01-silhouette-front.png" canonical=1 debug=mass $VAR
  $V "$O/$who-02-silhouette-side.png"  canonical=1 debug=mass $VAR yaw=1.5708
  $V "$O/$who-03-silhouette-rear.png"  canonical=1 debug=mass $VAR yaw=3.1416
  # 4-7 clay
  $V "$O/$who-04-clay-front.png"        canonical=1 debug=clay $VAR
  $V "$O/$who-05-clay-threequarter.png" canonical=1 debug=clay $VAR yaw=0.52
  $V "$O/$who-06-clay-side.png"         canonical=1 debug=clay $VAR yaw=1.5708
  $V "$O/$who-07-clay-rear.png"         canonical=1 debug=clay $VAR yaw=3.1416
  # 8-10 faceted grayscale
  $V "$O/$who-08-gray-front.png"        canonical=1 debug=gray $VAR
  $V "$O/$who-09-gray-threequarter.png" canonical=1 debug=gray $VAR yaw=0.52
  $V "$O/$who-10-gray-rear.png"         canonical=1 debug=gray $VAR yaw=3.1416
  # 11-14 final material
  $V "$O/$who-11-final-front.png"        canonical=1 $VAR
  $V "$O/$who-12-final-threequarter.png" canonical=1 $VAR yaw=0.52
  $V "$O/$who-13-final-side.png"         canonical=1 $VAR yaw=1.5708
  $V "$O/$who-14-final-rear.png"         canonical=1 $VAR yaw=3.1416
done
HI="canonical=1 w=1000 h=1780 dsf=2"
# Mr. Mah detail crops
$V "$O/m-d1-chest.png"     $HI yaw=0.3 clip=0.20,0.25,0.80,0.60
$V "$O/m-d2-shoulder.png"  $HI clip=0.20,0.27,0.80,0.50
$V "$O/m-d3-arm.png"       $HI yaw=0.52 clip=0.05,0.27,0.50,0.72
$V "$O/m-d4-back.png"      $HI yaw=3.1416 clip=0.15,0.22,0.85,0.75
$V "$O/m-d5-abs.png"       $HI clip=0.30,0.38,0.70,0.60
$V "$O/m-d6-quad-transition.png" $HI clip=0.25,0.42,0.75,0.80
$V "$O/m-d7-teardrop.png"  $HI clip=0.30,0.62,0.70,0.99
# Mrs. Mah detail crops
$V "$O/f-d1-chest.png"     $HI variant=female yaw=0.3 clip=0.20,0.25,0.80,0.60
$V "$O/f-d1b-chest-side.png" $HI variant=female yaw=1.5708 clip=0.25,0.22,0.75,0.55
$V "$O/f-d2-shoulder.png"  $HI variant=female clip=0.20,0.27,0.80,0.50
$V "$O/f-d3-arm.png"       $HI variant=female yaw=0.52 clip=0.05,0.27,0.50,0.72
$V "$O/f-d4-back.png"      $HI variant=female yaw=3.1416 clip=0.15,0.22,0.85,0.75
$V "$O/f-d5-waist.png"     $HI variant=female clip=0.25,0.36,0.75,0.60
$V "$O/f-d6-glute-threequarter.png" $HI variant=female yaw=2.55 clip=0.15,0.38,0.85,0.75
$V "$O/f-d7-glute-side.png" $HI variant=female yaw=1.5708 clip=0.20,0.38,0.80,0.75
$V "$O/f-d8-thigh-sweep.png" $HI variant=female clip=0.15,0.42,0.85,0.80
$V "$O/f-d9-teardrop.png"  $HI variant=female clip=0.30,0.62,0.70,0.99
echo "proof set written to $O"
