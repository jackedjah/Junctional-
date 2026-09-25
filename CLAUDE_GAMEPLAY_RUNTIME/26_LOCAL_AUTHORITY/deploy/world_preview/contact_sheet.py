"""MAHWORLD world preview contact sheet (dev only): tiles the fixed-viewpoint captures of one or two runs into a labelled grid so a pass can be
reviewed at a glance.  python3 contact_sheet.py <out.jpg> <dirA> [<dirB>] [--tod DAY] [--cols 3] [--w 426]
With two directories each view is shown as an A|B pair (before | after)."""
import sys, os, json
from PIL import Image, ImageDraw
args = [a for a in sys.argv[1:]]
def opt(k, d):
    if k in args:
        i = args.index(k); v = args[i + 1]; del args[i:i + 2]; return v
    return d
tod = opt('--tod', 'DAY'); cols = int(opt('--cols', '3')); W = int(opt('--w', '426'))
out, dirs = args[0], args[1:]
rep = json.load(open(os.path.join(dirs[0], 'capture_report.json')))
views = [v for v in rep['views'] if v['tod'] == tod]
H = int(W * rep['size'][1] / rep['size'][0]); pair = len(dirs) == 2; cellW = W * (2 if pair else 1) + (6 if pair else 0); cellH = H + 22
rows = (len(views) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cellW + (cols + 1) * 8, rows * cellH + (rows + 1) * 8), (18, 20, 26)); d = ImageDraw.Draw(sheet)
for i, v in enumerate(views):
    x = 8 + (i % cols) * (cellW + 8); y = 8 + (i // cols) * (cellH + 8)
    for j, dd in enumerate(dirs):
        p = os.path.join(dd, v['file'])
        if os.path.exists(p):
            im = Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS); sheet.paste(im, (x + j * (W + 6), y + 20))
    d.text((x + 2, y + 4), v['id'] + ' ' + v['label'] + (('   BEFORE | AFTER') if pair else ''), fill=(230, 232, 240))
sheet.save(out, quality=86); print(out, sheet.size)
