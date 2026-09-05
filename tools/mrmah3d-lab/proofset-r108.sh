#!/bin/sh
# R108 proof set (brief sections 65 and 79): clay + final for both characters, plus the regional close-ups.
# usage: sh proofset-r108.sh <base> <outdir>
set -e
B="$1"; O="$2"; T="$(dirname "$0")"
mkdir -p "$O"
V="node $T/view.mjs $B"
# ---- full views: clay front / rear, final front / rear / three-quarter (both characters)
$V "$O/m01-clay-front.png"  canonical=1 debug=clay
$V "$O/m02-clay-rear.png"   canonical=1 debug=clay yaw=3.1416
$V "$O/m03-clay-threequarter.png" canonical=1 debug=clay yaw=0.52
$V "$O/m04-clay-side.png"   canonical=1 debug=clay yaw=1.5708
$V "$O/m05-final-front.png" canonical=1
$V "$O/m06-final-rear.png"  canonical=1 yaw=3.1416
$V "$O/m07-final-threequarter.png" canonical=1 yaw=0.52
$V "$O/f01-clay-front.png"  canonical=1 debug=clay variant=female
$V "$O/f02-clay-rear.png"   canonical=1 debug=clay variant=female yaw=3.1416
$V "$O/f03-clay-rear-threequarter.png" canonical=1 debug=clay variant=female yaw=2.55
$V "$O/f04-clay-side.png"   canonical=1 debug=clay variant=female yaw=1.5708
$V "$O/f05-final-front.png" canonical=1 variant=female
$V "$O/f06-final-rear.png"  canonical=1 variant=female yaw=3.1416
$V "$O/f07-final-threequarter.png" canonical=1 variant=female yaw=0.52
$V "$O/f08-final-rear-threequarter.png" canonical=1 variant=female yaw=2.55
# ---- regional close-ups, clay then final (A shoulder, B biceps, C triceps, D forearm, E chest, F abs, G lat, H back, I glute, J quad, K hamstring, L calf)
HI="canonical=1 w=1000 h=1780 dsf=2"
for mode in clay final; do
  D=""; [ "$mode" = clay ] && D="debug=clay"
  $V "$O/cA-shoulder-$mode.png"  $HI $D clip=0.20,0.27,0.80,0.50
  $V "$O/cB-biceps-$mode.png"    $HI $D yaw=0.52 clip=0.05,0.27,0.50,0.62
  $V "$O/cC-triceps-$mode.png"   $HI $D yaw=3.1416 clip=0.50,0.27,0.95,0.62
  $V "$O/cD-forearm-$mode.png"   $HI $D yaw=0.52 clip=0.05,0.45,0.40,0.72
  $V "$O/cE-chest-$mode.png"     $HI $D yaw=0.3 clip=0.20,0.25,0.80,0.60
  $V "$O/cF-abs-$mode.png"       $HI $D clip=0.30,0.38,0.70,0.60
  $V "$O/cG-lat-$mode.png"       $HI $D yaw=2.55 clip=0.15,0.22,0.85,0.62
  $V "$O/cH-back-$mode.png"      $HI $D yaw=3.1416 clip=0.15,0.22,0.85,0.75
  $V "$O/cI-glute-$mode.png"     $HI $D variant=female yaw=2.55 clip=0.15,0.38,0.85,0.75
  $V "$O/cI2-glute-male-$mode.png" $HI $D yaw=2.55 clip=0.20,0.42,0.80,0.80
  $V "$O/cJ-quad-$mode.png"      $HI $D clip=0.25,0.45,0.75,0.98
  $V "$O/cK-hamstring-$mode.png" $HI $D yaw=3.1416 clip=0.25,0.45,0.75,0.98
  $V "$O/cL-calf-$mode.png"      $HI $D yaw=1.5708 clip=0.25,0.55,0.75,0.99
done
echo "proof set written to $O"
