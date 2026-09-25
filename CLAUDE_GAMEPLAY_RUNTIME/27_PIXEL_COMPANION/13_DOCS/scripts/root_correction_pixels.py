"""Surgical, deterministic material/cluster correction; four owner proofs only."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import final_production_pipeline as fp

ROOT=Path(__file__).resolve().parents[2]
RAW=ROOT/'07_ANIMATION_SOURCE/ROOT_CORRECTION'
OUT=ROOT/'12_REVIEW_PROOFS/ROOT_CORRECTION'
N=256
PALETTE=np.array([[3,7,14],[12,18,29],[27,36,52],[49,63,86],
                  [82,101,130],[134,154,180],[194,212,232],[241,249,255]],np.uint8)

def rank(a,size=3):
    return np.array(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.MedianFilter(size)))

def consolidate(level,mask,minarea=5):
    # No blur/interpolation: merge only undersized quantized islands into adjacent
    # same-material shade clusters. The silhouette and crystal material IDs stay fixed.
    out=level.copy(); seen=np.zeros_like(mask); H,W=mask.shape
    for y,x in zip(*np.where(mask)):
        if seen[y,x]: continue
        val=level[y,x]; todo=[(y,x)]; seen[y,x]=True; pixels=[]; neighbors=[]
        while todo:
            yy,xx=todo.pop(); pixels.append((yy,xx))
            for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
                ny,nx=yy+dy,xx+dx
                if 0<=ny<H and 0<=nx<W and mask[ny,nx]:
                    if level[ny,nx]==val and not seen[ny,nx]:
                        seen[ny,nx]=True; todo.append((ny,nx))
                    elif level[ny,nx]!=val: neighbors.append(int(level[ny,nx]))
        if len(pixels)<minarea and neighbors:
            bins=np.bincount(neighbors,minlength=8)
            replacement=int(np.argmax(bins))
            for yy,xx in pixels: out[yy,xx]=replacement
    return out

EXPRESSIONS={
    'NEUTRAL':{'eye':'ring','mouth':'smile'},
    'HELPFUL':{'eye':'ring','mouth':'smile'},
    'THINKING':{'eye':'ring','mouth':'short'},
    'HAPPY':{'eye':'ring','mouth':'smile'},
    'EXCITED':{'eye':'ring','mouth':'open'},
    'CONCERNED':{'eye':'ring','mouth':'concerned'},
    'FOCUSED':{'eye':'ring','mouth':'short'},
}

def face(n,t,character,state):
    # Canonical front anchors: unchanged across all three female poses.
    cx=128; ey=31 if character=='female' else 33
    top=ey-6; mouth=ey+9; bottom=mouth+5; half=13 if character=='female' else 12
    shell=[(cx-half+4,top),(cx+half-4,top),(cx+half,ey-1),
           (cx+half-2,mouth),(cx+5,bottom),(cx-5,bottom),(cx-half+2,mouth),(cx-half,ey-1)]
    nd,td=ImageDraw.Draw(n),ImageDraw.Draw(t)
    nd.polygon(shell,fill=(3,7,14,255)); td.polygon(shell,fill=(0,0,0,0))
    # One-pixel inset rim, dark except the lit left jaw.
    nd.line(shell+[shell[0]],fill=(20,35,59,255),width=1)
    td.line([(cx-half+1,ey+3),(cx-half+3,mouth),(cx-5,bottom)],fill=(64,64,64,255),width=1)
    for x in [cx-6,cx+6]:
        td.line([(x-2,ey-2),(x+1,ey-2),(x+3,ey),(x+2,ey+2),(x-1,ey+3),(x-3,ey+1),(x-2,ey-2)],
                fill=(192,192,192,255),width=1)
        td.point((x-1,ey-2),fill=(255,255,255,255)); td.point((x-2,ey-1),fill=(255,255,255,255))
        nd.rectangle((x-1,ey-1,x+1,ey+1),fill=(3,7,14,255))
    expression=state.upper() if state.upper() in EXPRESSIONS else ('EXCITED' if state=='celebrate_small' else 'HELPFUL' if state=='point_right' else 'NEUTRAL')
    if EXPRESSIONS[expression]['mouth']=='open':
        td.line([(cx-4,mouth),(cx-3,mouth+3),(cx+2,mouth+3),(cx+4,mouth)],fill=(192,192,192,255),width=1)
        td.line((cx-2,mouth+3,cx+1,mouth+3),fill=(255,255,255,255),width=1)
    elif EXPRESSIONS[expression]['mouth']=='short':
        td.line((cx-3,mouth+1,cx+3,mouth+1),fill=(192,192,192,255),width=1)
    elif EXPRESSIONS[expression]['mouth']=='concerned':
        td.line([(cx-4,mouth+2),(cx-2,mouth),(cx+2,mouth),(cx+4,mouth+2)],fill=(192,192,192,255),width=1)
    else:
        td.line([(cx-4,mouth),(cx-2,mouth+2),(cx+2,mouth+2),(cx+4,mouth)],fill=(192,192,192,255),width=1)

def process(character,state):
    base=RAW/character/state
    arrays={}
    for k in ['lit','albedo','form']:
        arrays[k]=np.array(Image.open(base/k/f'{state}.png').convert('RGBA').resize((N,N),Image.Resampling.BOX))
    lit,alb,form=[arrays[k] for k in ['lit','albedo','form']]
    alpha=lit[:,:,3]>=150
    lum=np.dot(lit[:,:,:3],[.2126,.7152,.0722])/255
    volume=form[:,:,0].astype(float)/255
    h,s,v=fp.hsv(alb[:,:,:3]); y,x=np.indices(alpha.shape)
    # Remove tiny alternating texture facets before shade-band formation; rank
    # selection picks an existing value, not a blended or antialiased color.
    source=rank(lum*255,3)/255
    sculpt=np.clip((volume-.43)*2.2,0,1)
    mixed=(.68*source+.32*sculpt)*.89
    # Crystalline crown/lower body retain their larger source planes.
    crystal=(y<24)|(y>110)
    mixed[crystal]=(.82*source+.18*sculpt)[crystal]*.94
    levels=np.digitize(mixed,[.12,.22,.32,.43,.54,.67,.81]).astype(np.uint8)
    levels=consolidate(levels,alpha,5)
    hueblue=(h>.51)&(h<.73)
    theme=alpha&hueblue&(s>.60)&(v>.27)
    # Graphite never becomes a theme merely because a blue reflection fell on it.
    theme&=((np.abs(x-128)<7)|(y<30)|(y>216)|(np.abs(x-128)>30))
    themes=np.digitize(np.maximum(lum,v*.7),[.15,.3,.54,.80]).astype(np.uint8)
    edge=fp.binary_outline(alpha)
    levels[edge]=0; theme[edge]=False
    n=np.zeros((N,N,4),np.uint8); t=np.zeros_like(n)
    neutral=alpha&~theme
    n[neutral,:3]=PALETTE[levels[neutral]]; n[neutral,3]=255
    codes=np.array([0,64,128,192,255],np.uint8)
    t[theme,:3]=codes[themes[theme]][:,None]; t[theme,3]=255
    ni,ti=Image.fromarray(n),Image.fromarray(t)
    face(ni,ti,character,state)
    pf=fp.PixelFrame(ni,ti)
    image=fp.compose(pf)
    name=f'{character.upper()}_{state.upper()}'
    fp.save_frame(fp.PixelFrame(ni.resize((512,512),Image.Resampling.NEAREST),ti.resize((512,512),Image.Resampling.NEAREST)),OUT/f'{name}.png')
    app=image.copy()
    app.save(OUT/f'{name}_APP.png')
    app.resize((1024,1024),Image.Resampling.NEAREST).save(OUT/f'{name}_4X.png')
    return name,app

def main():
    OUT.mkdir(exist_ok=True,parents=True)
    items=[process('female',state) for state in ['neutral','point_right','celebrate_small']]+[process('male','neutral')]
    sheet=Image.new('RGB',(4224,1440),(7,13,22)); d=ImageDraw.Draw(sheet)
    d.text((32,20),'MAHFITT  /  ROOT CORRECTION',font=fp.font(30,True),fill=(162,219,253))
    for i,((name,app),label) in enumerate(zip(items,['FEMALE · NEUTRAL','FEMALE · POINT RIGHT','FEMALE · CELEBRATE','MALE · NEUTRAL'])):
        x=i*1056+16
        d.text((x+16,78),label,font=fp.font(22,True),fill=(209,228,245))
        d.text((x+16,118),'APP PREVIEW · 256 PX',font=fp.font(16),fill=(105,143,172))
        sheet.paste(app,(x+384,122),app)
        d.text((x+16,382),'4× NEAREST',font=fp.font(16),fill=(105,143,172))
        up=app.resize((1024,1024),Image.Resampling.NEAREST); sheet.paste(up,(x,410),up)
    sheet.save(OUT/'COMBINED_PROOF.png')
    (OUT/'expression_contract.json').write_text(json.dumps(EXPRESSIONS,indent=2))
    guide=Image.new('RGBA',(1536,1536))
    for i,(c,s) in enumerate([('female','neutral'),('female','point_right'),('female','celebrate_small'),('male','neutral')]):
        raw=Image.open(RAW/c/s/'lit'/f'{s}.png').convert('RGBA')
        guide.paste(raw,((i%2)*768,(i//2)*768))
    guide.save(OUT/'POSE_LOCK_STYLE_INPUT.png')
    print(OUT)

if __name__=='__main__': main()
