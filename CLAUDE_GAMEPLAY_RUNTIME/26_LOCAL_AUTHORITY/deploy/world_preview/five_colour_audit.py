"""MAHWORLD :: FIVE-CLASS COLOUR AUDIT (dev only). Owner 2026-09-27: the world was drifting toward PURPLE; the expressive palette is the
five classes (ATHLETE gold, TITAN blue, LEAN crimson, VISIONARY purple, BAGE pink) over a neutral physical world. This is an ARTISTIC
DIAGNOSTIC over the fixed-view evidence frames, not a pixel quota. It answers, per view and across the set:
  1. is one class colour dominating the shared world views?
  2. are all five classes represented across the whole map?
  3. do the district views still read as their class?
  4. does a frame get busy when several colours are visible?
  5. are the neutral materials still giving the colours breathing room?
Every pixel (downsampled) is classified with the colour law's own hue windows (colour_law_audit.mjs): NEUTRAL (low saturation, near
black or near white) or one of the five families, or OFF-LAW (orange / green / cyan). Expressive pixels are weighted by their chroma, so
faint tints count less than saturated light. Two layers are kept apart, because the physical world is not a faction: ACCENT light
(chroma ≥ 0.40, lightness 0.30–0.92: crystals, emissive magic, class materials, signage) is what the balance is judged on; AMBIENT tint
(sky, sea, tinted shading, dusk) is reported separately.
    python3 five_colour_audit.py <capture_dir> <out_prefix> [--tod DAY|NIGHT|BOTH] [--w 240]
Writes <out_prefix>.json, <out_prefix>.txt and <out_prefix>.jpg (a contact sheet with a share bar under every view). Pure PIL."""
import sys, os, json
from PIL import Image, ImageDraw

FAMILIES = [('RED', 345, 360), ('RED', 0, 12), ('GOLD', 36, 56), ('BLUE', 200, 245), ('PURPLE', 246, 292), ('PINK', 293, 344)]
NEUTRAL_S, DARK_L, LIGHT_L = 0.28, 0.08, 0.9   # the colour law's neutral floor
ACCENT_D, ACCENT_L = 0.40, (0.30, 0.92)          # accent light: saturated and bright enough to read as expressive colour
JUDGE_MIN = 0.003                                 # below 0.3 % of the frame a view has too little expressive light for a dominance / read verdict
CLASSES = ['GOLD', 'BLUE', 'RED', 'PURPLE', 'PINK']
SWATCH = {'GOLD': (230, 195, 106), 'BLUE': (90, 140, 240), 'RED': (212, 52, 74), 'PURPLE': (154, 120, 224), 'PINK': (240, 138, 184), 'OFF': (120, 170, 120), 'NEUTRAL': (150, 150, 156)}
# what each fixed view is FOR: SHARED world views should acknowledge several classes; a DISTRICT view should read as its class; SKY views
# are judged on their own (the lavender Moon is VISIONARY-toned by design)
VIEW_TAGS = {'V02': ('SHARED', None), 'V03': ('DISTRICT', 'GOLD'), 'V04': ('DISTRICT', 'BLUE'), 'V05': ('DISTRICT', 'RED'), 'V06': ('DISTRICT', 'PURPLE'),
             'V07': ('DISTRICT', 'PINK'), 'V08': ('SHARED', None), 'V09': ('SHARED', None), 'V10': ('SKY', None), 'V11': ('SHARED', None), 'V12': ('SHARED', None),
             'V13': ('SHARED', None), 'V16': ('DISTRICT', 'RED'), 'V17': ('DISTRICT', 'PURPLE'), 'V21': ('SKY', None), 'V22': ('SKY', None), 'V24': ('DISTRICT', 'BLUE'),
             'V25': ('DISTRICT', 'GOLD'), 'V31': ('SHARED', None), 'V32': ('SHARED', None), 'V33': ('SKY', None), 'V34': ('SHARED', None), 'V35': ('SHARED', None),
             'F3': ('SHARED', None), 'F4': ('SHARED', None), 'TS1': ('SHARED', None)}


def family(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b); l = (mx + mn) / 2.0; d = mx - mn
    if d == 0: return 'NEUTRAL', 0.0, l
    s = d / (1 - abs(2 * l - 1)) if abs(2 * l - 1) < 1 else 0
    if s < NEUTRAL_S or l < DARK_L or l > LIGHT_L: return 'NEUTRAL', 0.0, l
    if mx == r: h = ((g - b) / d) % 6
    elif mx == g: h = (b - r) / d + 2
    else: h = (r - g) / d + 4
    h *= 60
    if h < 0: h += 360
    for f, lo, hi in FAMILIES:
        if lo <= h <= hi: return f, d, l
    return 'OFF', d, l


def analyse(path, w):
    im = Image.open(path).convert('RGB'); H = max(1, int(w * im.height / im.width)); im = im.resize((w, H))
    px = im.load(); acc = {k: 0.0 for k in CLASSES + ['OFF']}; amb = {k: 0.0 for k in CLASSES + ['OFF']}; neutral = 0; n = w * H; acc_px = 0; amb_px = 0
    for y in range(H):
        for x in range(w):
            r, g, b = px[x, y]; f, d, l = family(r / 255.0, g / 255.0, b / 255.0)
            if f == 'NEUTRAL': neutral += 1
            elif d >= ACCENT_D and ACCENT_L[0] <= l <= ACCENT_L[1]: acc[f] += d; acc_px += 1
            else: amb[f] += d; amb_px += 1
    ta = sum(acc.values()) or 1e-9; tb = sum(amb.values()) or 1e-9
    return {'neutral_frac': round(neutral / n, 3), 'expressive_frac': round(acc_px / n, 4), 'ambient_frac': round(amb_px / n, 3),
            'shares': {k: round(acc[k] / ta, 3) for k in acc}, 'ambient_shares': {k: round(amb[k] / tb, 3) for k in amb}}


def judge(view, tag, a):
    sh = a['shares']; cls = {k: sh[k] for k in CLASSES}; top = max(cls, key=cls.get); present = [k for k in CLASSES if cls[k] >= 0.05]
    notes = []; judged = a['expressive_frac'] >= JUDGE_MIN
    if not judged: notes.append('too little accent light to judge (%.2f%%)' % (100 * a['expressive_frac']))
    if tag[0] == 'SHARED' and judged:
        if cls[top] >= 0.6: notes.append('DOMINATED by ' + top)
        elif len([k for k in CLASSES if cls[k] >= 0.08]) >= 3: notes.append('BALANCED')
    if tag[0] == 'DISTRICT' and judged:
        exp = tag[1]; notes.append(('READS as ' + exp) if (top == exp or cls[exp] >= 0.35) else ('WEAK read (' + exp + ' ' + str(cls[exp]) + ', top ' + top + ')'))
    if a['expressive_frac'] >= 0.12 and len([k for k in CLASSES if cls[k] >= 0.1]) >= 4: notes.append('BUSY')
    if a['neutral_frac'] + a['ambient_frac'] < 0.8: notes.append('LOW neutral room')
    if sh['OFF'] >= 0.15: notes.append('OFF-LAW light ' + str(sh['OFF']))
    return {'top': top, 'present': present, 'notes': notes}


def main():
    args = sys.argv[1:]
    def opt(k, d):
        if k in args:
            i = args.index(k); v = args[i + 1]; del args[i:i + 2]; return v
        return d
    tod = opt('--tod', 'BOTH'); W = int(opt('--w', '240'))
    cap, out = args[0], args[1]
    rep = json.load(open(os.path.join(cap, 'capture_report.json')))
    views = [v for v in rep['views'] if tod == 'BOTH' or v['tod'] == tod]
    rows = []
    for v in views:
        p = os.path.join(cap, v['file'])
        if not os.path.exists(p): continue
        tag = VIEW_TAGS.get(v['id'], ('SHARED', None)); a = analyse(p, W); j = judge(v['id'], tag, a)
        rows.append(dict(view=v['id'], tod=v['tod'], tag=tag[0], expect=tag[1], file=v['file'], **a, **j))
    # across the set
    def agg(sel):   # weighted by each view's accent light, so a view with almost no expressive colour does not dilute the set
        s = {k: 0.0 for k in CLASSES}; wsum = 0.0
        for r in sel:
            w = r['expressive_frac']; wsum += w
            for k in CLASSES: s[k] += r['shares'][k] * w
        return {k: round(s[k] / max(wsum, 1e-9), 3) for k in CLASSES}
    summary = {}
    for t in ('DAY', 'NIGHT'):
        sh = [r for r in rows if r['tag'] == 'SHARED' and r['tod'] == t]; al = [r for r in rows if r['tod'] == t]
        if not al: continue
        A = agg(al); S = agg(sh)
        summary[t] = {'map_mean_shares': A, 'shared_mean_shares': S, 'classes_represented': [k for k in CLASSES if A[k] >= 0.05],
                      'shared_dominated': [r['view'] for r in sh if any(n.startswith('DOMINATED') for n in r['notes'])],
                      'shared_purple_led': [r['view'] for r in sh if r['top'] == 'PURPLE'],
                      'district_weak': [r['view'] for r in al if r['tag'] == 'DISTRICT' and any(n.startswith('WEAK') for n in r['notes'])],
                      'busy': [r['view'] for r in al if 'BUSY' in r['notes']], 'mean_neutral_frac': round(sum(r['neutral_frac'] for r in al) / len(al), 3),
                      'mean_accent_frac': round(sum(r['expressive_frac'] for r in al) / len(al), 4),
                      'shared_ambient_shares': (lambda w: {k: round(sum(r['ambient_shares'][k] * r['ambient_frac'] for r in sh) / w, 3) for k in CLASSES})(sum(r['ambient_frac'] for r in sh) or 1e-9)}
    json.dump({'capture': os.path.abspath(cap), 'views': rows, 'summary': summary}, open(out + '.json', 'w'), indent=1)
    L = ['MAHWORLD five-class colour audit (artistic diagnostic, not a quota) — ' + cap, 'shares = chroma-weighted share of the ACCENT light (sky / sea / tinted shading kept apart as ambient)', '']
    for t, S in summary.items():
        L.append('%s  map mean: %s' % (t, '  '.join('%s %.2f' % (k, S['map_mean_shares'][k]) for k in CLASSES)))
        L.append('%s  shared mean: %s' % (t, '  '.join('%s %.2f' % (k, S['shared_mean_shares'][k]) for k in CLASSES)))
        L.append('%s  shared AMBIENT (sky / sea / shading / night grade): %s' % (t, '  '.join('%s %.2f' % (k, S['shared_ambient_shares'][k]) for k in CLASSES)))
        L.append('   represented: %s | shared dominated: %s | shared purple-led: %s | district weak: %s | busy: %s | mean neutral %.2f | mean accent %.3f' % (
            ','.join(S['classes_represented']), ','.join(S['shared_dominated']) or '-', ','.join(S['shared_purple_led']) or '-', ','.join(S['district_weak']) or '-', ','.join(S['busy']) or '-', S['mean_neutral_frac'], S['mean_accent_frac']))
    L.append('')
    for r in rows:
        L.append('%-4s %-5s %-15s neutral %.2f accent %.3f  %s  | %s' % (r['view'], r['tod'], r['tag'] + ('/' + r['expect'] if r['expect'] else ''), r['neutral_frac'], r['expressive_frac'],
                 ' '.join('%s %.2f' % (k[:3], r['shares'][k]) for k in CLASSES + ['OFF']), '; '.join(r['notes']) or '-'))
    open(out + '.txt', 'w').write('\n'.join(L) + '\n')
    # contact sheet: thumbnail + share bar (neutral share of the frame in grey, then the expressive light split by family)
    TW, TH, BAR, cols = 300, 169, 14, 4; cellH = TH + BAR + 30
    sheet = Image.new('RGB', (cols * (TW + 6), ((len(rows) + cols - 1) // cols) * (cellH + 6)), (18, 18, 20)); d = ImageDraw.Draw(sheet)
    for i, r in enumerate(rows):
        x0, y0 = (i % cols) * (TW + 6), (i // cols) * (cellH + 6)
        sheet.paste(Image.open(os.path.join(cap, r['file'])).convert('RGB').resize((TW, TH)), (x0, y0))
        nw = int(TW * 0.25); d.rectangle((x0, y0 + TH, x0 + nw, y0 + TH + BAR), fill=SWATCH['NEUTRAL']); d.text((x0 + 2, y0 + TH + 1), 'acc %.1f%%' % (100 * r['expressive_frac']), fill=(20, 20, 20)); x = x0 + nw   # a grey cap carrying the accent %, then the accent split
        for k in CLASSES + ['OFF']:
            ww = int(round((TW - nw) * r['shares'][k]))
            if ww > 0: d.rectangle((x, y0 + TH, min(x0 + TW, x + ww), y0 + TH + BAR), fill=SWATCH[k]); x += ww
        d.text((x0 + 3, y0 + TH + BAR + 2), '%s %s %s  top %s' % (r['view'], r['tod'].lower(), r['tag'].lower(), r['top'].lower()), fill=(235, 235, 235))
        d.text((x0 + 3, y0 + TH + BAR + 15), ('; '.join(r['notes']) or '-')[:48], fill=(200, 200, 160))
    sheet.save(out + '.jpg', quality=84)
    print('\n'.join(L[:3 + 4 * len(summary)]))


if __name__ == '__main__':
    main()
