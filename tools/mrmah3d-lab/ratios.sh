#!/bin/sh
# Phase L numbers: silhouette landmarks for both characters (fractions of height) and the B/W ratio.
# usage: sh ratios.sh <base> <repo-root> <scratch-prefix>
B="$1"; R="$2"; P="$3"; T="$(dirname "$0")"
mkdir -p "$R/validation/mrmah3d/_tmp"
node "$T/bodymask.mjs" "$B" "$P-m" views=front:0,rear:3.1416 >/dev/null 2>&1
node "$T/bodymask.mjs" "$B" "$P-f" views=front:0,rear:3.1416 variant=female >/dev/null 2>&1
for f in m-mask-front m-mask-rear f-mask-front f-mask-rear; do
  cp "$P-$f.png" "$R/validation/mrmah3d/_tmp/$f.png"
  node "$T/refwidth.mjs" "$B" "validation/mrmah3d/_tmp/$f.png" mode=mask step=0.02 label="$f" 2>&1 | tail -1 | python3 -c "
import sys,json
line=sys.stdin.read().strip(); lab,js=line.split(' ',1); d=json.loads(js); L=d['landmarks']
print(lab, 'waist %.3f hip %.3f B/W %.2f | shoulderRun %.3f shoulder/waist %.2f | knee %.3f calf %.3f' % (L['waistRun'], L['hipRun'], L['hipRun']/max(L['waistRun'],1e-6), L['shoulderMaxRun'], L['shoulderMaxRun']/max(L['waistRun'],1e-6), L['kneeRun'], L['calfRun']))
print('   profile(t,central):', ' '.join('%.2f:%.3f' % (t, c) for t, f, c in d['profile']))"
done
