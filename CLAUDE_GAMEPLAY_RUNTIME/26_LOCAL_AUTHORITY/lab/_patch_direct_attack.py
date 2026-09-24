"""E/R/T/Y direct attack execution (brief §18-19), TAB emotes (§27), scapular / trunk participation in the exercise families (§8, §17)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
def patch(name, pairs):
    p = os.path.join(HERE, name); s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (name, old[:70], s.count(old)); s = s.replace(old, new)
    open(p, 'w', encoding='utf-8').write(s)

# ---------------- rulesHud: cast an explicit skill (one host request, immune to the selection race) ----------------
patch('rulesHud.js', [
 ("    cast: function (opts) { var r = state.lastRules; if (!r) return; var sk = currentSkill(r); var p = {};",
  """    /* DIRECT EXECUTION (E/R/T/Y): cast slot N of the current category in ONE request — RULES_CAST {skill_id} — with the same aim logic the
       armed cast uses, computed for THAT skill. The armed selection is untouched (arming never fires; direct keys never arm). */
    castSlot: function (slot) { var r = state.lastRules; if (!r) return Promise.resolve({ accepted: false, reason: 'NO_RULES' }); var list = r.skills[r.me.category] || []; var sk = list[slot]; if (!sk) return Promise.resolve({ accepted: false, reason: 'EMPTY_SLOT', slot: slot }); var p = { skill_id: sk.id }; var aim = aimId(r, sk); if ((sk.targets || /SLOW|DISCORD|HEAL|ALLY_BUFF/.test(sk.effect)) && aim) p.aim_id = aim; if (sk.targets && sk.targets.indexOf('EXPLICIT_ALLY') >= 0 && state.allyConfirm) p.confirm_ally = true; if (/ZONE|TRAP|AIMED/.test(sk.effect + ' ' + (sk.mode || '')) && aim) { var t = r.others.filter(function (o) { return o.id === aim; })[0]; if (t) p.aim_point = { x: t.position.x, z: t.position.z }; } return send('RULES_CAST', p); },
    slotSkill: function (slot) { var r = state.lastRules; if (!r) return null; return (r.skills[r.me.category] || [])[slot] || null; },
    cast: function (opts) { var r = state.lastRules; if (!r) return; var sk = currentSkill(r); var p = {};"""),
 ("  function eligibleTargets(r) { if (!r) return []; var me = r.me; var sk = currentSkill(r);", "  function eligibleTargets(r, skOverride) { if (!r) return []; var me = r.me; var sk = skOverride || currentSkill(r);"),
 ("  function aimId(r) { var list = eligibleTargets(r);", "  function aimId(r, skOverride) { var list = eligibleTargets(r, skOverride);"),
])

# ---------------- play.js: keys, direct attack, TAB emotes, controls text ----------------
patch('play.js', [
 ("case 'KeyV': case 'KeyJ': attack('key'); break;",
  "case 'KeyV': case 'KeyJ': attack('key'); break;\n    case 'KeyE': directAttack(0, 'key'); break; case 'KeyR': directAttack(1, 'key'); break; case 'KeyT': directAttack(2, 'key'); break; case 'KeyY': directAttack(3, 'key'); break;   /* DIRECT EXECUTION: E/R/T/Y = attack 1-4 of the current movement pattern / category, performed immediately */\n    case 'Tab': e.preventDefault(); if (hud.toggleEmotes) hud.toggleEmotes(); break;   /* TAB = emotes (radial); Escape / outside closes */"),
 ("case 'KeyI': if (hud.toggleEmotes) hud.toggleEmotes(); break; case 'KeyE': interact(); break;", "case 'KeyI': if (hud.toggleEmotes) hud.toggleEmotes(); break; case 'KeyF' + '_interact': interact(); break;"),
 ("async function attack(source) {", """/* E/R/T/Y: perform slot N of the current category NOW (one RULES_CAST {skill_id}); a missing slot refuses locally, never falls through to another action */
async function directAttack(slot, source) { if (hud.suppressed() || hud.guideOpen() || hud.panelOpen()) return { accepted: false, reason: 'HUD_BUSY' }; if (!rulesHud.active()) return attack(source); var sk = rulesHud.slotSkill ? rulesHud.slotSkill(slot) : null; if (!sk) { hud.toast('NO ATTACK ' + (slot + 1) + ' IN THIS PATTERN'); sound.refuse(); return { accepted: false, reason: 'EMPTY_SLOT' }; } if (sk.availability && sk.availability !== 'READY') { hud.toast((sk.pattern_name || sk.name) + ' — ' + (sk.availability === 'COOLDOWN' ? 'COOLDOWN ' + (sk.cooldown_remaining_s || 0).toFixed(1) + 's' : sk.availability.replace(/_/g, ' '))); sound.refuse(); return { accepted: false, reason: sk.availability }; } var a = await rulesHud.castSlot(slot); if (a && a.accepted) { sound.tick(); if (hud.flashSlot) hud.flashSlot(slot); } else if (a && a.reason) { hud.toast(refusalText(a)); sound.refuse(); } return a; }
async function attack(source) {"""),
 ("['V / ATTACK', 'perform the ARMED movement pattern (desktop primary attack)']", "['E R T Y', 'ATTACK 1-4 of the current movement pattern — performed IMMEDIATELY (no arming); an empty slot does nothing'], ['V / ATTACK', 'perform the ARMED move']"),
 ("['long-press MORE · I', 'six-favourite EMOTE radial", "['TAB · long-press MORE', 'six-favourite EMOTE radial"),
 ("['1 – 4 · Z', 'RECALL movement pattern 1–4 of the current category (arms it; V performs) · Z cycles PHYSICAL / PHYS MAHGIC / SPECIAL']", "['1 – 4 · Z', 'arm a pattern (1-4) · Z cycles PHYSICAL / PHYS MAHGIC / SPECIAL (the E/R/T/Y set follows the category)'], ['Q', 'MAHWORLD menu: STATS · SKILLS · INVENTORY · MAP · FRIENDS · DMs']"),
])
# the old KeyE = interact: interact moves to F? No — F is FLY. Interact stays on the contextual button + 'KeyG'? G is guard. Use 'KeyX'?? X = wave. Put interact on Enter.
patch('play.js', [("case 'KeyF' + '_interact': interact(); break;", "case 'Enter': interact(); break;   /* interact moved from E (E is now attack 1) — Enter or the contextual button */")])
patch('play.js', [("case 'KeyX': send('EMOTE', { emote_id: 'WAVE' }); break;", "case 'KeyX': send('EMOTE', { emote_id: 'WAVE' }); break; case 'KeyQ': e.preventDefault(); if (hud.toggleMenu) hud.toggleMenu(); break;")])
patch('play.js', [("case 'KeyQ': dashFromInput(); break;", "case 'KeyC' + '_dash': dashFromInput(); break;")])
patch('play.js', [("case 'KeyC' + '_dash': dashFromInput(); break;", "case 'ShiftLeft' + '_dash': dashFromInput(); break;")])
# dash: Q is now the menu; dash moves to KeyB (free) — keep DASH label in sync
patch('play.js', [("case 'ShiftLeft' + '_dash': dashFromInput(); break;", "case 'KeyB': dashFromInput(); break;   /* dash moved from Q (Q = MAHWORLD menu) */")])
patch('play.js', [("['HOLD DASH + swipe / Q', 'dash in that direction (touch) · Q dashes toward held keys (desktop)']", "['HOLD DASH + swipe / B', 'dash in that direction (touch) · B dashes toward held keys (desktop)']")])
patch('play.js', [("interact (E), wave (X)", "interact (Enter), wave (X)")])

# ---------------- gameHud: E/R/T/Y labels beside the current attacks, direct slot buttons on touch, flash ----------------
patch('gameHud.js', [
 ("rows += '<div class=\"gchip\" data-slot=\"' + i + '\"><b>' + (i + 1) + '</b>", "rows += '<div class=\"gchip\" data-slot=\"' + i + '\"><b class=\"gkey\">' + (['E', 'R', 'T', 'Y'][i] || (i + 1)) + '</b>"),
 ("rows += '<div class=\"gchip empty\" data-slot=\"' + i + '\"><b>' + (i + 1) + '</b>", "rows += '<div class=\"gchip empty\" data-slot=\"' + i + '\"><b class=\"gkey off\">' + (['E', 'R', 'T', 'Y'][i] || (i + 1)) + '</b>"),
 ("<button class=\"gbtn\" data-do=\"attack\">ATTACK<small>V</small></button><button class=\"gbtn\" data-do=\"dash\">DASH<small>Q</small></button>",
  "<button class=\"gbtn\" data-do=\"attack\">ATTACK<small>V</small></button><span id=\"g-erty\" class=\"gerty\"></span><button class=\"gbtn\" data-do=\"dash\">DASH<small>B</small></button>"),
 ("    toast: function (text, ms) { st.toast = text; st.toastT = performance.now() + (ms || 1800); },",
  "    toast: function (text, ms) { st.toast = text; st.toastT = performance.now() + (ms || 1800); },\n    flashSlot: function (slot) { st.flashSlot = slot; st.flashT = performance.now() + 260; },"),
 ("      var to = $('g-toast'); if (st.toast && performance.now() < st.toastT) { to.style.display = 'block'; to.textContent = st.toast; } else to.style.display = 'none';",
  """      var to = $('g-toast'); if (st.toast && performance.now() < st.toastT) { to.style.display = 'block'; to.textContent = st.toast; } else to.style.display = 'none';
      /* E R T Y direct-attack strip: compact, beside ATTACK on desktop; four direct slot buttons on touch. Inactive when the slot is empty / not ready. */
      var erty = $('g-erty'); if (erty && r) { var list = r.skills[r.me.category] || []; var html = ''; for (var qi = 0; qi < 4; qi++) { var qs = list[qi]; var ready = qs && qs.availability === 'READY'; var flash = st.flashSlot === qi && performance.now() < st.flashT; html += '<button class="gbtn gq' + (qs ? (ready ? '' : ' cd') : ' off') + (flash ? ' hit' : '') + '" data-do="direct-' + qi + '" ' + (qs ? 'title="' + esc(qs.pattern_name || qs.name) + '"' : 'disabled') + '><b>' + ['E', 'R', 'T', 'Y'][qi] + '</b><small>' + esc(qs ? (qs.pattern_name || qs.name).split(' ')[0].slice(0, 9) : '—') + '</small></button>'; } setHtml(erty, html); }"""),
 ("      case 'info': if (el) api.openDetail(parseInt(el.getAttribute('data-slot'), 10)); break;", "      case 'direct-0': case 'direct-1': case 'direct-2': case 'direct-3': if (act.directAttack) act.directAttack(parseInt(d.slice(7), 10), 'button'); break;\n      case 'info': if (el) api.openDetail(parseInt(el.getAttribute('data-slot'), 10)); break;"),
])
patch("play.js", [("act: { attack: attack, ", "act: { attack: attack, directAttack: directAttack, ")])
print('ok')
