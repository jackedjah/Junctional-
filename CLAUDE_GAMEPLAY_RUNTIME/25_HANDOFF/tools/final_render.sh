#!/bin/bash
# M20 checkpoint: whole-world AFTER renders at the c51ac67 baseline cameras (run after the wave 5 merge)
SP=${EVIDENCE_OUT:-/tmp/mahworld_m20}; mkdir -p $SP
source "$(dirname "$0")/cams.sh"
cd "$(dirname "$0")/../../26_LOCAL_AUTHORITY"
node deploy/world_preview/capture.mjs $SP/final --views $VIEWS_M20 --cam "$CAMS_WORLD;$CAMS_HL;$CAMS_FALLS;$CAMS_MM" --tod BOTH --clock 40 --size 960x540 > $SP/final.log 2>&1
node deploy/world_preview/capture.mjs $SP/final_phone --views $PHONE_VIEWS --cam "$PHONE_CAMS" --tod BOTH --clock 40 --size 393x852 --quality MED > $SP/final_phone.log 2>&1
echo done > $SP/final.done
