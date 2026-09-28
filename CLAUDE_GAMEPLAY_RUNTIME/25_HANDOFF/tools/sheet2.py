import sys,os
from PIL import Image, ImageDraw
# usage: sheet2.py out.jpg W H "cam1,cam2" "label=pathfmt" ...   pathfmt uses {c}
out=sys.argv[1]; W=int(sys.argv[2]); H=int(sys.argv[3]); cams=sys.argv[4].split(','); cols=[a.split('=',1) for a in sys.argv[5:]]
s=Image.new('RGB',(W*len(cols),H*len(cams))); d=ImageDraw.Draw(s)
for r,c in enumerate(cams):
  for k,(lab,fmt) in enumerate(cols):
    p=fmt.format(c=c)
    if os.path.exists(p): s.paste(Image.open(p).convert('RGB').resize((W,H)),(k*W,r*H))
    d.text((k*W+6,r*H+6),c+' '+lab,fill='yellow')
s.save(out,quality=86)
