/* MAHWORLD JOB A :: FUTURE-CHARACTER IMPORT CONTRACT — the semantic adapter (owner directive 2026-09-19 §import contract).
   New character assets will arrive with their own bone names / hierarchies / rest orientations (Tripo "J_Bip_*", Mixamo "mixamorig:*",
   Reallusion "CC_Base_*", or MAHWORLD's own derivative names). The runtime animates SEMANTIC ROLES, never source names: this module maps a
   per-character record (`import_contract.json`, see lab/import_contract.TEMPLATE.json) onto a loaded skeleton and exposes the canonical role
   → bone table the animator, the beams, the emitters, the split form and the face channels consume (lab/ANIMATION_CHANNELS.md).
   ROLES: ROOT · PELVIS · spine chain (LUMBAR? SPINE SPINE2? CHEST) · NECK HEAD · CLAV_L/R (+ SCAP_L/R) · UPPERARM_L/R (+ ARMTWIST) · FOREARM_L/R
   (+ FORETWIST) · HAND_L/R · FINGERS_L/R · hips THIGH_L/R · knees (SHIN_L/R = the knee joint's child) · pointed tips / propulsion anchors
   TIP_L/R · fused lower body TAIL1 TAIL2 TAIL3 (TAIL3 = the fused tip = fused beam anchor) · emitter anchors (HAND_L/R, TIP_L/R, TAIL3, CHEST)
   · morphs (PACKED …) · face BROW_L/R CHEEK_L/R JAW.
   The adapter ALIASES (never renames) bones: rig.bones[ROLE] → the source bone, so every existing channel keeps working; it records the
   bind orientation per role (identity vs oriented — the animator's Euler convention assumes identity bind, an oriented rig must be
   re-based through `roleQuaternionSpace` before its clips are authored) and validates the record. Pure module: usable in node (the
   validator) and in the browser (GlbCharacter). */
export var ROLES = {
  required: ['ROOT', 'PELVIS', 'SPINE', 'CHEST', 'NECK', 'HEAD', 'CLAV_L', 'CLAV_R', 'UPPERARM_L', 'UPPERARM_R', 'FOREARM_L', 'FOREARM_R', 'HAND_L', 'HAND_R'],
  optional: ['LUMBAR', 'SPINE2', 'SCAP_L', 'SCAP_R', 'ARMTWIST_L', 'ARMTWIST_R', 'FORETWIST_L', 'FORETWIST_R', 'FINGERS_L', 'FINGERS_R', 'BROW_L', 'BROW_R', 'CHEEK_L', 'CHEEK_R', 'JAW'],
  split: ['THIGH_L', 'THIGH_R', 'SHIN_L', 'SHIN_R', 'TIP_L', 'TIP_R'],           /* the separated form: hips → knees → pointed tips (propulsion anchors) */
  fused: ['TAIL1', 'TAIL2', 'TAIL3'],                                             /* the fused lower body → the fused tip */
  emitters: ['HAND_L', 'HAND_R', 'TIP_L', 'TIP_R', 'TAIL3', 'CHEST'],             /* MAHGIC emitter anchors (bones, or offsets from bones in the record) */
  chains: { spine: ['PELVIS', 'LUMBAR', 'SPINE', 'SPINE2', 'CHEST', 'NECK', 'HEAD'], arm_L: ['CLAV_L', 'SCAP_L', 'UPPERARM_L', 'ARMTWIST_L', 'FOREARM_L', 'FORETWIST_L', 'HAND_L', 'FINGERS_L'], arm_R: ['CLAV_R', 'SCAP_R', 'UPPERARM_R', 'ARMTWIST_R', 'FOREARM_R', 'FORETWIST_R', 'HAND_R', 'FINGERS_R'], leg_L: ['THIGH_L', 'SHIN_L', 'TIP_L'], leg_R: ['THIGH_R', 'SHIN_R', 'TIP_R'], fused: ['TAIL1', 'TAIL2', 'TAIL3'] }
};
/* heuristic name patterns for the DRAFT of a record (a human confirms; the record is the truth, never the guess). Side-aware: a role with a
   side needs the name to carry that side (L_ / _L / Left / .l …) and the base pattern; the order below matters (a name is consumed once). */
export var SIDE = { L: /(^|[_.:\-])l([_.\-]|$)|left|(^|[_.:\-])l[A-Z]/i, R: /(^|[_.:\-])r([_.\-]|$)|right|(^|[_.:\-])r[A-Z]/i };
export var GUESS = [
  ['ROOT', /^(root|armature|skeleton|rig|bone_?root)$|_root$|c_root$/i, null], ['PELVIS', /^(hip|hips|pelvis)$|c_hips$|:hips$|_hip$|_pelvis$/i, null],
  ['LUMBAR', /waist|lumbar/i, null], ['SPINE', /^spine$|spine0?1$|c_spine$|:spine$|_spine$/i, null], ['CHEST', /chest|spine0?3$|spine0?2$|:spine2$|upperchest/i, null], ['SPINE2', /spine0?2$|spine2$|:spine1$/i, null],
  ['NECK', /neck(twist0?1)?$|^neck/i, null], ['HEAD', /(^|_|:)head$/i, null],
  ['CLAV_L', /clavicle|shoulder/i, 'L'], ['CLAV_R', /clavicle|shoulder/i, 'R'], ['UPPERARM_L', /upper_?arm$|(^|_|:)(l_|left)?arm$/i, 'L'], ['UPPERARM_R', /upper_?arm$|(^|_|:)(r_|right)?arm$/i, 'R'],
  ['FOREARM_L', /fore_?arm$|lower_?arm$/i, 'L'], ['FOREARM_R', /fore_?arm$|lower_?arm$/i, 'R'], ['HAND_L', /hand$/i, 'L'], ['HAND_R', /hand$/i, 'R'],
  ['FINGERS_L', /fingers$|mid(dle)?0?1$|middle1$/i, 'L'], ['FINGERS_R', /fingers$|mid(dle)?0?1$|middle1$/i, 'R'],
  ['THIGH_L', /thigh$|up(per)?_?leg$/i, 'L'], ['THIGH_R', /thigh$|up(per)?_?leg$/i, 'R'], ['SHIN_L', /shin$|calf$|lower_?leg$|(^|_|:)(l_|left)?leg$/i, 'L'], ['SHIN_R', /shin$|calf$|lower_?leg$|(^|_|:)(r_|right)?leg$/i, 'R'],
  ['TIP_L', /^tip_l$|foot$|toe_?base$/i, 'L'], ['TIP_R', /^tip_r$|foot$|toe_?base$/i, 'R'],
  ['JAW', /jaw/i, null], ['BROW_L', /brow/i, 'L'], ['BROW_R', /brow/i, 'R'], ['CHEEK_L', /cheek/i, 'L'], ['CHEEK_R', /cheek/i, 'R'],
  ['TAIL1', /^tail1$|tail_?1$|fused1/i, null], ['TAIL2', /^tail2$|tail_?2$|fused2/i, null], ['TAIL3', /^tail3$|tail_?3$|fused3|fused_tip/i, null]
];
function sideOf(n) { var l = SIDE.L.test(n), r = SIDE.R.test(n); if (l && !r) return 'L'; if (r && !l) return 'R'; if (l && r) { var li = n.search(SIDE.L), ri = n.search(SIDE.R); return li <= ri ? 'L' : 'R'; } return null; }
export function draftContract(boneNames, meta) { var roles = {}; var used = {}; var canon = boneNames.filter(function (n) { return /^[A-Z0-9_]+$/.test(n); });
  GUESS.forEach(function (g) { var role = g[0], re = g[1], side = g[2]; if (boneNames.indexOf(role) >= 0) { roles[role] = role; used[role] = true; return; } for (var i = 0; i < boneNames.length; i++) { var n = boneNames[i]; if (used[n]) continue; if (!re.test(n)) continue; var sd = sideOf(n); if (side && sd !== side) continue; if (!side && sd && !/^(root|armature|skeleton|rig|bone_?root)$/i.test(n)) continue; roles[role] = n; used[n] = true; break; } });
  var m = meta || {}; return { contract: 'MAHWORLD_IMPORT_CONTRACT_V1', character: m.character || 'UNNAMED', source: m.source || null, status: 'DRAFT_AUTO_GUESS — every role below must be confirmed by a human against the source skeleton', units: m.units || 'metres', up_axis: m.up_axis || '+Y', forward_axis: m.forward_axis || '-Z', height_m: m.height_m || null, bind: m.bind || 'UNKNOWN', roles: roles, emitter_anchors: { HAND_L: { role: 'HAND_L', offset_m: [0, 0, 0] }, HAND_R: { role: 'HAND_R', offset_m: [0, 0, 0] }, TIP_L: { role: 'TIP_L', offset_m: [0, 0, 0] }, TIP_R: { role: 'TIP_R', offset_m: [0, 0, 0] }, FUSED_TIP: { role: 'TAIL3', offset_m: [0, 0, 0] }, CHEST: { role: 'CHEST', offset_m: [0, 0.05, 0.12] } }, morphs: m.morphs || {}, face: { channels: ['brow_l', 'brow_r', 'cheek_l', 'cheek_r', 'jaw', 'smile', 'blink'], bones_or_morphs: 'bones' }, forms: { fused: !!roles.TAIL3, split: !!(roles.THIGH_L && roles.SHIN_L && roles.TIP_L) }, canonical_names_present: canon.length, notes: [] }; }
/* validate a record against a skeleton description { bones: [{ name, parent, rotation: [x,y,z,w] | null }], morphs: [names], height_m } */
export function validateContract(contract, skel) {
  var out = { ok: true, errors: [], warnings: [], roles: {}, bind: {}, chains: {} }; var byName = {}; (skel.bones || []).forEach(function (b) { byName[b.name] = b; });
  function role(r) { var src = contract.roles && contract.roles[r]; if (!src) return null; var b = byName[src]; if (!b) { out.errors.push('role ' + r + ' → bone "' + src + '" not in the skeleton'); return null; } out.roles[r] = src; return b; }
  ROLES.required.forEach(function (r) { if (!role(r)) { out.ok = false; if (!(contract.roles && contract.roles[r])) out.errors.push('required role ' + r + ' unmapped'); } });
  ROLES.optional.forEach(function (r) { if (contract.roles && contract.roles[r]) role(r); });
  var splitOk = ROLES.split.every(function (r) { return !!role(r); }), fusedOk = ROLES.fused.every(function (r) { return !!role(r); });
  if (!splitOk) out.warnings.push('no complete SPLIT form (THIGH / SHIN / TIP both sides): the separated form and the propulsion anchors are unavailable'); if (!fusedOk) out.warnings.push('no complete FUSED chain (TAIL1..3): the fused lower body and its tip anchor are unavailable');
  /* chain order: each mapped role must descend from the previous mapped role of its chain */
  Object.keys(ROLES.chains).forEach(function (cn) { var chain = ROLES.chains[cn].filter(function (r) { return out.roles[r]; }); var okc = true; for (var i = 1; i < chain.length; i++) { var child = byName[out.roles[chain[i]]], want = out.roles[chain[i - 1]]; var p = child && child.parent, hops = 0; while (p && p !== want && hops < 12) { p = byName[p] ? byName[p].parent : null; hops++; } if (p !== want) { okc = false; out.errors.push('chain ' + cn + ': ' + chain[i] + ' (' + out.roles[chain[i]] + ') does not descend from ' + chain[i - 1] + ' (' + want + ')'); } } out.chains[cn] = { roles: chain, ordered: okc }; if (!okc) out.ok = false; });
  /* bind orientation per role: identity (the animator's convention) or oriented (needs re-basing) */
  Object.keys(out.roles).forEach(function (r) { var b = byName[out.roles[r]]; var q = b && b.rotation; if (!q) { out.bind[r] = 'unknown'; return; } var ang = 2 * Math.acos(Math.max(-1, Math.min(1, Math.abs(q[3])))); out.bind[r] = ang < 0.02 ? 'identity' : 'oriented(' + (ang * 180 / Math.PI).toFixed(1) + '°)'; });
  var oriented = Object.keys(out.bind).filter(function (r) { return /oriented/.test(out.bind[r]); }); if (oriented.length) out.warnings.push('oriented bind on ' + oriented.length + ' role(s) (' + oriented.slice(0, 6).join(', ') + (oriented.length > 6 ? '…' : '') + '): the canonical Euler channels need per-role re-basing (contract.bind = "oriented") before authored clips apply');
  if (contract.bind === 'identity' && oriented.length) { out.ok = false; out.errors.push('contract claims identity bind but the skeleton is oriented'); }
  if (contract.units && contract.units !== 'metres') out.warnings.push('units ' + contract.units + ' — the runtime is metres (scale_to_metres must be set in the manifest)');
  if (contract.height_m && (contract.height_m < 1.2 || contract.height_m > 2.6)) out.warnings.push('height ' + contract.height_m + ' m is outside the humanoid band 1.2–2.6');
  if (contract.morphs) Object.keys(contract.morphs).forEach(function (k) { var mn = contract.morphs[k]; var list = Array.isArray(mn) ? mn : [mn]; list.forEach(function (one) { if (typeof one === 'string' && skel.morphs && skel.morphs.length && skel.morphs.indexOf(one) < 0) out.warnings.push('morph ' + k + ' → "' + one + '" not found'); }); });
  Object.keys(contract.emitter_anchors || {}).forEach(function (k) { var a = contract.emitter_anchors[k]; if (a && a.role && !out.roles[a.role] && !(contract.roles && contract.roles[a.role])) out.warnings.push('emitter anchor ' + k + ' refers to unmapped role ' + a.role); });
  return out;
}
/* apply a record to a loaded three.js skeleton: aliases canonical roles onto the source bones (bones[ROLE] = bone) — never renames, never moves */
export function applyContract(contract, bonesByName) { var aliased = 0, missing = []; var roles = (contract && contract.roles) || {}; Object.keys(roles).forEach(function (r) { var src = roles[r]; var b = bonesByName[src]; if (!b) { missing.push(r + '→' + src); return; } if (!bonesByName[r]) { bonesByName[r] = b; aliased++; } }); return { aliased: aliased, missing: missing, roles: Object.keys(roles).length }; }
