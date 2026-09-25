"""Native pixel-art continuation from the owner's locked artwork.

No 3D appearance stage. Sprite parts follow unit-scale hierarchical FK, not
whole-arm rectangular cuts. Existing atlas/runtime exporter is retained.
"""
from pathlib import Path
import json,math
from functools import lru_cache
from collections import deque
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
import common_set_pixels as export

P=export.P
MASTER=export.MASTERS
REFERENCE=P/'05_PIXEL_MASTERS/COMMON_FINAL/OWNER_PIXEL_REFERENCE.png'
RAW=export.RAW
COLORS=np.array([[3,7,14],[10,17,30],[20,32,52],[31,53,89],[51,86,134],
    [88,130,177],[150,183,218],[228,242,255],[4,28,74],[7,74,177],[18,150,242],[170,239,255]],np.uint8)
CONFIG={
 'female':{'front':{'box':(140,12,357,410),'top':18,'cx':249,'height':390,'eye':(250,77)},
           'quarter':{'box':(444,16,652,412),'top':23,'cx':548,'height':386,'eye':(564,79)},
           'joints':{'R':[(296,146),(314,195),(334,245)],'L':[(207,146),(189,195),(165,245)]},'neck':(250,126),'waist':(249,222)},
 'male':{'front':{'box':(134,481,362,860),'top':490,'cx':246,'height':367,'eye':(244,539)},
         'quarter':{'box':(428,483,647,860),'top':491,'cx':546,'height':366,'eye':(563,544)},
         'joints':{'R':[(313,605),(327,666),(340,719)],'L':[(185,605),(170,666),(156,719)]},'neck':(245,581),'waist':(246,694)}
}

def fill_silhouette(rgb):
    seed=rgb.max(2)>37
    seed=np.array(Image.fromarray(seed.astype(np.uint8)*255).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)))>0
    h,w=seed.shape; outside=np.zeros_like(seed); q=deque()
    for y,x in [(y,x) for y in [0,h-1] for x in range(w)]+[(y,x) for x in [0,w-1] for y in range(h)]:
        if not seed[y,x]: outside[y,x]=1; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
            yy,xx=y+dy,x+dx
            if 0<=yy<h and 0<=xx<w and not seed[yy,xx] and not outside[yy,xx]:
                outside[yy,xx]=1; q.append((yy,xx))
    mask=~outside
    # Remove unconnected background speckles, not interior anatomy or dark face.
    seen=np.zeros_like(mask)
    for y,x in zip(*np.where(mask)):
        if seen[y,x]: continue
        q=deque([(y,x)]); seen[y,x]=1; component=[]
        while q:
            yy,xx=q.popleft(); component.append((yy,xx))
            for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
                ny,nx=yy+dy,xx+dx
                if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=1; q.append((ny,nx))
        # A disconnected label is not sprite artwork. Retain only character-sized
        # connected parts here; the source has no detached accessory particles.
        if len(component)<600:
            for yy,xx in component: mask[yy,xx]=False
    return mask

@lru_cache(maxsize=2)
def source_features(char):
    source=Image.open(P/f'12_REVIEW_PROOFS/ROOT_CORRECTION/{char.upper()}_NEUTRAL_APP.png').convert('RGBA')
    ey=31 if char=='female' else 33
    boxes=[(119,ey-3,126,ey+4),(131,ey-3,138,ey+4),(124,ey+9,133,ey+13)]
    result=[]
    for i,b in enumerate(boxes):
        old=np.array(source.crop(b)); h,w=old.shape[:2]
        # Preserve the existing ring/smile construction. One hard, dark-blue
        # fringe and brighter cores add readability without soft bloom.
        bright=old[:,:,:3].max(2)>90
        mask=np.pad(bright,1); halo=np.zeros_like(mask)
        for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]: halo|=np.roll(mask,(dy,dx),(0,1))
        a=np.zeros((h+2,w+2,4),np.uint8); a[:]=[3,7,14,255]
        a[halo,:3]=export.BLUE[1]; a[mask,:3]=export.BLUE[3]
        core=np.pad(bright&(old[:,:,:3].max(2)>220),1)
        a[core,:3]=export.BLUE[4]
        if i==2:
            a[mask&np.pad(np.indices((h,w))[1]>=2,1)&np.pad(np.indices((h,w))[1]<=6,1),:3]=export.BLUE[4]
        if char=='female' and i<2:
            # Two-pixel outer lashes only; no change to eye size or expression.
            x=0 if i==0 else w+1; inward=1 if i==0 else -1
            a[1,x,:3]=export.BLUE[2]; a[2,x+inward,:3]=export.BLUE[3]
        result.append(((0,0,w+2,h+2),Image.fromarray(a)))
    return result

def prepare(char,view):
    cfg=CONFIG[char][view]; ref=Image.open(REFERENCE).convert('RGB')
    crop=ref.crop(cfg['box']); a=np.array(crop); mask=fill_silhouette(a)
    sy,sx=np.indices(mask.shape); gx=sx+cfg['box'][0]; gy=sy+cfg['box'][1]
    # The reference's floor ellipse touches the tip. Restrict only those final
    # rows to the taper, excluding the backdrop without trimming hands/crown.
    end=cfg['top']+cfg['height']
    mask &= (gy<end-12)|(a.max(2)>140)
    rgba=np.dstack((a,mask.astype(np.uint8)*255)); rgba[~mask]=0
    scale=236/cfg['height']; bx,by,_,_=cfg['box']
    def coord(pt): return np.array([(pt[0]-cfg['cx'])*scale+128,(pt[1]-cfg['top'])*scale+10])
    dest=Image.new('RGBA',(256,256)); art=Image.fromarray(rgba)
    width,height=[round(v*scale) for v in art.size]
    dest.paste(art.resize((width,height),Image.Resampling.NEAREST),tuple(np.round(coord((bx,by))).astype(int)))
    a=np.array(dest); distance=((a[:,:,:3,None].astype(np.int32)-COLORS.T[None,None,:,:])**2*np.array([2,3,1])[None,None,:,None]).sum(2)
    indices=export.consolidate(distance.argmin(2),a[:,:,3]>=128,3)
    a[:,:,:3]=COLORS[indices]; a[a[:,:,3]<128]=0; a[a[:,:,3]>=128,3]=255
    dest=Image.fromarray(a)
    # The same inset shell, not a new head design. Remove old feature pixels before
    # stamping the current approved eye/mouth pixels without any resampling.
    ex,ey=cfg['eye']; half=26 if view=='front' else 22
    points=[(ex-half+7,ey-13),(ex+half-7,ey-13),(ex+half,ey),
            (ex+half-6,ey+28),(ex,ey+39),(ex-half+6,ey+28),(ex-half,ey)]
    shell=[tuple(coord(v)) for v in points]; sd=ImageDraw.Draw(dest)
    sd.polygon(shell,fill=(3,7,14,255),outline=(20,32,52,255))
    # A thin temple/jaw bevel seats the existing black field inside the helmet.
    sd.line([shell[0],shell[-1],shell[-2],shell[-3]],fill=(51,86,134,255),width=1)
    sd.line([shell[1],shell[2],shell[3]],fill=(31,53,89,255),width=1)
    center=coord(cfg['eye']); spacing=6 if view=='front' else 5
    locations=[center+(-spacing-4,-4),center+(spacing-4,-4),center+(-5,9)]
    meta={'features':[{'src':list(b),'asset':f'{char}_feature_{i}.png','dst':[int(round(p[0])),int(round(p[1]))]} for i,((b,_),p) in enumerate(zip(source_features(char),locations))]}
    return dest,coord,meta

def rotate(point,pivot,angle):
    a=math.radians(angle); c,s=math.cos(a),math.sin(a); dx,dy=np.array(point)-pivot
    return np.array(pivot)+[c*dx+s*dy,-s*dx+c*dy]

def transform(image,source_pivot,target_pivot,angle):
    theta=math.radians(angle); c,s=math.cos(theta),math.sin(theta)
    sx,sy=source_pivot; tx,ty=target_pivot
    return image.transform((256,256),Image.Transform.AFFINE,
        (c,-s,sx-c*tx+s*ty,s,c,sy-s*tx-c*ty),resample=Image.Resampling.NEAREST)

def layer(image,mask):
    a=np.array(image).copy(); a[~mask]=0; return Image.fromarray(a)

def parts(char,base,coord):
    a=np.array(base); alpha=a[:,:,3]>0; yy,xx=np.indices(alpha.shape); grid=np.stack((xx,yy),2)
    arms={}; allarm=np.zeros_like(alpha)
    for side,sign in [('R',1),('L',-1)]:
        js=CONFIG[char]['joints'][side]; sh,el,wr=[coord(v) for v in js]
        sx,sy=js[0]; ex,ey=js[1]; wx,wy=js[2]
        # Follow the actual inner silhouette. Taking all exterior pixels (rather
        # than a capped limb rectangle) prevents old fingers/forearms remaining
        # attached to the torso when the articulated arm moves.
        inner={
            'female':{
                'R':[(283,128),(285,152),(290,173),(296,195),(302,216),(313,241),(316,270),(313,310)],
                'L':[(222,128),(215,152),(208,173),(200,195),(193,216),(179,241),(181,270),(185,310)]},
            'male':{
                'R':[(297,581),(292,611),(303,641),(309,661),(308,694),(306,720),(300,775)],
                'L':[(201,581),(202,611),(195,641),(193,661),(188,694),(191,720),(198,775)]}
        }[char][side]
        outside=420 if side=='R' else 70
        polygon=inner+[(outside,inner[-1][1]),(outside,inner[0][1])]
        m=Image.new('1',(256,256)); ImageDraw.Draw(m).polygon([tuple(coord(v)) for v in polygon],fill=1)
        mask=np.array(m,dtype=bool)&alpha; allarm|=mask
        upperdir=(el-sh)/np.linalg.norm(el-sh); foredir=(wr-el)/np.linalg.norm(wr-el)
        along_upper=((grid-sh)*upperdir).sum(2); along_fore=((grid-el)*foredir).sum(2)
        upper=mask&(along_upper<=np.linalg.norm(el-sh)+2)
        fore=mask&(along_upper>=np.linalg.norm(el-sh)-2)&(along_fore<=np.linalg.norm(wr-el)+2)
        hand=mask&(along_fore>=np.linalg.norm(wr-el)-2)
        arms[side]={'joints':[sh,el,wr],'layers':[layer(base,upper),layer(base,fore),layer(base,hand)]}
    neck=coord(CONFIG[char]['neck']); headmask=alpha&(yy<=round(neck[1]+1))&~allarm
    body=layer(base,~allarm&~headmask&alpha); head=layer(base,headmask)
    return {'body':body,'head':head,'neck':neck,'waist':coord(CONFIG[char]['waist']),'arms':arms}

SPECS={
 'front_master':([1000],True),'front_3q_master':([1000],True),
 'idle_neutral':([280]*12,True),'idle_long':([300]*16,True),
 'look_left':([100,100,120,600,120,100,160],False),'look_right':([100,100,120,600,120,100,160],False),
 'think_loop':([240]*12,True),'point_right':([100,90,90,100,650,100,90,90,180],False),
 'wave_greet':([100,90,90,90,100,100,100,100,90,90,90,170],False),
 'celebrate_small':([100,90,90,100,300,100,90,90,180],False)}
for direction in ['up','down','left','up_left','up_right','down_left','down_right']:
    SPECS['point_'+direction]=([100,90,90,100,650,100,90,90,180],False)
SPECS['dance_a']=([110]*16,False)
SPECS['dance_b']=([110]*16,False)
if export.TAG=='SMOOTH_APP':
    SPECS.update({
        'idle_neutral':([140]*24,True), 'idle_long':([150]*32,True),
        'think_loop':([80]*36,True),
        'look_left':([45]*9+[600]+[45]*8+[140],False),
        'look_right':([45]*9+[600]+[45]*8+[140],False),
        'wave_greet':([40]*33,False),
        'celebrate_small':([40]*12+[300]+[40]*11+[120],False),
        'dance_a':([40]*49,False), 'dance_b':([40]*49,False)})
    for key in [k for k in SPECS if k.startswith('point_')]:
        SPECS[key]=([40]*12+[650]+[40]*11+[120],False)

POINTS={'right':('R',68,7,0),'left':('L',-68,-7,0),
        'up':('R',80,80,20),'down':('R',35,-45,10),
        'up_right':('R',70,45,20),'up_left':('L',-70,-45,-20),
        'down_right':('R',45,-5,5),'down_left':('L',-45,5,-5)}

def draw(char,base,pieces,features,state,i,count):
    phase=2*math.pi*i/max(1,count); e=math.sin(math.pi*i/max(1,count-1))**2
    body_angle=0; head_angle=0; drift=np.array([0.,0.]); angle={'R':[0.,0.,0.],'L':[0.,0.,0.]}
    if state in ['idle_neutral','idle_long','think_loop']:
        amplitude=1.25 if state=='idle_long' else 1
        body_angle=.48*math.sin(phase)*amplitude; head_angle=-.65*math.sin(phase+.3)*amplitude
        drift=np.array([.35*math.sin(phase),-.7*math.sin(phase)])*amplitude
        angle['R']=[1.6*math.sin(phase),1.4*math.sin(phase-.6),1.2*math.sin(phase-.9)]
        angle['L']=[-1.6*math.sin(phase),-1.4*math.sin(phase-.6),-1.2*math.sin(phase-.9)]
        if state=='think_loop': head_angle-=2*(1-math.cos(phase)); body_angle*=.5
    elif state in ['look_left','look_right']:
        sign=1 if state=='look_left' else -1; head_angle=sign*5*e; body_angle=sign*.6*e
    elif state.startswith('point_'):
        side,aa,fa,ha=POINTS[state[6:]]
        angle[side]=[aa*e,fa*e,ha*e]; head_angle=(-1 if side=='R' else 1)*e
    elif state=='wave_greet':
        fore_ease=e**.75 if export.TAG=='SMOOTH_APP' else math.sqrt(e)
        angle['R']=[50*e*e,95*fore_ease,14*math.sin(phase*2)*e]; head_angle=-1.2*e
    elif state=='celebrate_small':
        # Bend the elbows before lifting the upper arms: a compact, human-like
        # path which never sweeps long straight arms out of the app canvas.
        aa=58*e*e; blend=min(1,2*e)
        fa=90*(blend*blend*(3-2*blend) if export.TAG=='SMOOTH_APP' else blend)
        angle['R']=[aa,fa,-6*e]; angle['L']=[-aa,-fa,6*e]; drift[1]=-1.3*e
    elif state in ['dance_a','dance_b']:
        beat=math.sin(phase*2); body_angle=2.2*beat*e; head_angle=-3*beat*e
        drift=np.array([1.5*beat,-.7*(1-math.cos(phase*4))])*e
        if state=='dance_a':
            angle['R']=[(18+12*beat)*e,(24-14*beat)*e,-8*beat*e]
            angle['L']=[-(18-12*beat)*e,-(24+14*beat)*e,-8*beat*e]
        else:
            fore_ease=e**.75 if export.TAG=='SMOOTH_APP' else math.sqrt(e)
            angle['R']=[(22+7*beat)*e*e,(100-8*beat)*fore_ease,8*beat*e]
            angle['L']=[-(22-7*beat)*e*e,-(100+8*beat)*fore_ease,8*beat*e]
    # Fit a pointing gesture by translation only. Segment lengths, body size,
    # and the authored grid stay invariant, including diagonal directions.
    if state.startswith('point_'):
        xs=[]
        for side in ['L','R']:
            arm=pieces['arms'][side]; sh,el,wr=arm['joints']; aa,fa,ha=angle[side]
            tel=rotate(el,sh,aa); twr=rotate(wr,el,aa+fa)+(tel-el)
            for src,pivot,target,rot in zip(arm['layers'],[sh,el,wr],[sh,tel,twr],[aa,aa+fa,aa+fa+ha]):
                yy,xx=np.where(np.array(src)[:,:,3]>0); theta=math.radians(rot)
                px=target[0]+math.cos(theta)*(xx-pivot[0])+math.sin(theta)*(yy-pivot[1]); xs.extend([px.min(),px.max()])
        drift[0]=max(0,5-min(xs))-max(0,max(xs)-250)
    waist=pieces['waist']; target_waist=waist+drift
    bodymap=lambda pt:rotate(pt,waist,body_angle)+drift
    canvas=Image.new('RGBA',(256,256)); errors=[]
    for side in ['L','R']:
        arm=pieces['arms'][side]; sh,el,wr=arm['joints']; upper,fore,hand=arm['layers']
        aa,fa,ha=angle[side]; tsh=bodymap(sh)
        tel=rotate(el,sh,body_angle+aa)+(tsh-sh)
        twr=rotate(wr,el,body_angle+aa+fa)+(tel-el)
        for src,pivot,target,rot in [(upper,sh,tsh,body_angle+aa),(fore,el,tel,body_angle+aa+fa),(hand,wr,twr,body_angle+aa+fa+ha)]:
            canvas.alpha_composite(transform(src,pivot,target,rot))
        errors += [abs(np.linalg.norm(tel-tsh)/np.linalg.norm(el-sh)-1),abs(np.linalg.norm(twr-tel)/np.linalg.norm(wr-el)-1)]
    canvas.alpha_composite(transform(pieces['body'],waist,target_waist,body_angle))
    neck=pieces['neck']; target_neck=bodymap(neck)
    canvas.alpha_composite(transform(pieces['head'],neck,target_neck,body_angle+head_angle))
    boxes=[]
    for feature,(_,image) in zip(features,source_features(char)):
        origin=np.array(feature['dst']); center=origin+np.array(image.size)/2
        location=rotate(center,neck,body_angle+head_angle)+(target_neck-neck)-np.array(image.size)/2
        location=np.round(location).astype(int)
        canvas.paste(image,tuple(location))
        boxes.append({'src':feature['src'],'asset':feature['asset'],'dst':location.tolist()})
    return canvas,boxes,max(errors)

def main():
    MASTER.mkdir(parents=True,exist_ok=True)
    for char in ['female','male']:
        for i,(_,feature) in enumerate(source_features(char)): feature.save(MASTER/f'{char}_feature_{i}.png')
        front,coord,front_meta=prepare(char,'front'); quarter,_,quarter_meta=prepare(char,'quarter')
        pieces=parts(char,front,coord)
        report={'character':char,'states':{},'audit':{'max_segment_relative_error':0,'bone_scale_unit':True,
            'ik_stretch':0,'stretch_to_constraints':0,'pose_method':'native pixel parts; hierarchical unit-scale shoulder/elbow/wrist rotation',
            'visual_source':'owner approved pixel sheet; no 3D render appearance'}}
        out=RAW/char; out.mkdir(parents=True,exist_ok=True)
        for state,(durations,loop) in SPECS.items():
            folder=out/state; folder.mkdir(exist_ok=True); frames=[]
            for i in range(len(durations)):
                if state=='front_3q_master':
                    img=quarter.copy(); boxes=quarter_meta['features']; error=0
                    for feature,(_,image) in zip(boxes,source_features(char)): img.paste(image,tuple(feature['dst']))
                else: img,boxes,error=draw(char,front,pieces,front_meta['features'],state,i,len(durations))
                assert error<1e-10
                path=folder/f'frame_{i:03d}.png'; img.save(path)
                bounds=img.getbbox()
                assert bounds and min(bounds[:2])>0 and max(bounds[2:])<256, (char,state,i,bounds)
                frames.append({'file':str(path.relative_to(out)).replace('\\','/'),'head_offset':[0,0],
                    'pixel_native':True,'feature_boxes':boxes,'arm_segment_relative_error':error})
                report['audit']['max_segment_relative_error']=max(report['audit']['max_segment_relative_error'],error)
            report['states'][state]={'frames':frames,'durationsMs':durations,'loop':loop}
        (out/'render_manifest.json').write_text(json.dumps(report,indent=2))
        print(char,report['audit'])
    export.finish()

if __name__=='__main__': main()
