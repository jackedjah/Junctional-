/* MAHWORLD :: CAMERA MATH (Spec B) — the pure pieces of the behind-back camera, kept out of play.js so plain node can test them.
   · wrapAngle           shortest signed angle
   · springStep          critically damped spring, closed form: stable and overshoot-free at ANY dt (a 30 fps phone frame or a 6 ms harness frame)
   · smoothstep01        ease-in-out for the release glide
   · framingDistance     boom length that makes a body of height H fill `frac` of the SHORT side of the viewport (same pixel size portrait / landscape)
   · relatchNeeded       Spec B movement-frame rule: re-latch when the stick angle moves more than `relatchDeg` from the latched angle
   · flightVertical      forward flight follows the camera pitch: below home (looking up) climbs, well above home (looking down) descends, dead band between */
export function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
export function springStep(x, v, w, dt) { var e = Math.exp(-w * dt); var c = v + w * x; return [(x + c * dt) * e, (v - w * c * dt) * e]; }
export function smoothstep01(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
export function framingDistance(H, frac, fovDeg, viewW, viewH, zoom, speedK, pullback) { var half = Math.tan(fovDeg * Math.PI / 360); var fracH = frac * Math.min(viewW, viewH) / Math.max(1, viewH); var d = (H / fracH) / (2 * half) * (zoom || 1) * (1 + (pullback || 0) * (speedK || 0)); return Math.max(1.6, Math.min(18, d)); }
export function relatchNeeded(latchAng, ang, relatchDeg) { return Math.abs(wrapAngle(ang - latchAng)) > relatchDeg * Math.PI / 180; }
export function flightVertical(pitch, pitchHome, forward) { if (!(forward > 0.3)) return 0; var prel = pitch - pitchHome; return prel < -0.18 ? 1 : (prel > 0.30 ? -1 : 0); }
