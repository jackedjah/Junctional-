"""Essential common-set continuation. Existing art, rig, indexed atlas contract."""
from pathlib import Path
import argparse, json, shutil, hashlib, os
import numpy as np
from PIL import Image, ImageDraw
import final_production_pipeline as fp
from root_correction_pixels import consolidate

P=Path(__file__).resolve().parents[2]
TAG=os.environ.get('MAHFITT_RELEASE_TAG','FINAL_POLISH')
MASTERS=P/'05_PIXEL_MASTERS'/TAG
RAW=P/'07_ANIMATION_SOURCE'/TAG
REVIEW=P/'12_REVIEW_PROOFS'/TAG
BLUE=np.array([[2,12,30],[7,35,76],[12,82,159],[28,164,242],[192,244,255]],np.uint8)
fp.PALETTES['blue']=BLUE.tolist()
fp.FRAMES=P/'08_SPRITE_FRAMES'/TAG
fp.ATLASES=P/'09_ATLASES'/TAG
fp.MANIFESTS=P/'10_MANIFEST'/TAG
NEUTRAL=np.array([[3,7,14],[12,18,29],[29,38,54],[57,71,92],[108,127,154],[185,205,231],[237,247,255]],np.uint8)
PALETTE=np.vstack((NEUTRAL,BLUE,np.array([[24,166,255],[194,244,255],[20,35,59]],np.uint8)))
FACERECT=(113,24,143,48)

def prep():
    MASTERS.mkdir(parents=True,exist_ok=True)
    for char in ['female','male']:
        base=Image.open(P/f'12_REVIEW_PROOFS/ROOT_CORRECTION/{char.upper()}_NEUTRAL_APP.png').convert('RGBA')
        a=np.array(base); alpha=a[:,:,3]==255
        lum=np.dot(a[:,:,:3],[.2126,.7152,.0722])/255
        hue,sat,val=fp.hsv(a[:,:,:3]); yy,xx=np.indices(alpha.shape)
        body=alpha&(yy>=53)&(lum>.095)
        # The low/mid body materials become explicit blue masses. Black stays locked.
        # Silver is reserved for the highest planes rather than every lit facet.
        blue=body&((lum<.75)|(sat>.44))
        levels=np.digitize(lum,[.14,.26,.46,.74]).astype(np.uint8)
        levels=consolidate(levels,blue,4)
        a[blue,:3]=BLUE[levels[blue]]
        # Simplify detached highlight specks without changing a silhouette pixel.
        light=body&~blue
        nl=np.digitize(lum,[.07,.13,.23,.38,.63,.87]).astype(np.uint8)
        nl=consolidate(nl,light,4)
        a[light,:3]=NEUTRAL[nl[light]]
        # The complete approved face patch, including both eyes and mouth, is immutable.
        x0,y0,x1,y1=FACERECT
        original=np.array(base)
        a[y0:y1,x0:x1]=original[y0:y1,x0:x1]
        a[~alpha]=0
        img=Image.fromarray(a)
        img.save(MASTERS/f'{char}_projection.png')
        base.crop(FACERECT).save(MASTERS/f'{char}_FACE_LOCK.png')
        # UV projection needs colors at slightly hidden side surfaces. Extend only
        # texture colors; the unchanged 3D mesh alone determines output coverage.
        valid=alpha.copy(); tex=a.copy()
        for _ in range(20):
            filled=valid.copy(); b=tex.copy()
            for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
                take=~filled&np.roll(valid,(dy,dx),(0,1))
                b[take]=np.roll(tex,(dy,dx),(0,1))[take]; filled[take]=True
            tex=b; valid=filled
        tex[:,:,3]=255
        Image.fromarray(tex).save(MASTERS/f'{char}_projection_padded.png')
    print('Locked masters prepared; eye and mouth patches unchanged.')

def nearest_palette(a):
    rgb=a[:,:,:3].astype(np.int32)
    distance=((rgb[:,:,None,:]-PALETTE.astype(np.int32))**2*np.array([2,3,1])).sum(3)
    out=a.copy(); out[:,:,:3]=PALETTE[distance.argmin(2)]
    out[a[:,:,3]<128]=0; out[a[:,:,3]>=128,3]=255
    return out

def process(char,path,meta):
    raw=Image.open(path).convert('RGBA').resize((256,256),Image.Resampling.NEAREST)
    a=np.array(raw) if meta.get('pixel_native') else nearest_palette(np.array(raw)); y,x=np.indices(a.shape[:2])
    # Preserve the exact current features, not reauthored variants or a new blink.
    if meta['state']!='front_3q_master' and not meta.get('pixel_native'):
        dx=int(round(meta['head_offset'][0])); dy=int(round(meta['head_offset'][1]))
        locked=np.array(Image.open(MASTERS/f'{char}_FACE_LOCK.png'))
        x0,y0,x1,y1=FACERECT
        a[y0+dy:y1+dy,x0+dx:x1+dx]=locked
    mask=a[:,:,3]==255
    # Explicit material palette membership, never a saturation guess. Graphite
    # (including blue-biased dark graphite) and silver are permanently neutral.
    theme=np.zeros(mask.shape,bool)
    authored_theme=[(31,53,89),(51,86,134),(88,130,177),
                    (4,28,74),(7,74,177),(18,150,242),(170,239,255)]
    for color in authored_theme+list(BLUE): theme|=np.all(a[:,:,:3]==color,axis=2)&mask
    dist=((a[:,:,:3,None].astype(float)-BLUE.T[None,None,:,:])**2).sum(2)
    lev=dist.argmin(2)
    neutral=a.copy(); neutral[theme]=0
    t=np.zeros_like(a); code=np.array([0,64,128,192,255],np.uint8)
    t[theme,:3]=code[lev[theme]][:,None]; t[theme,3]=255
    return fp.PixelFrame(Image.fromarray(neutral).resize((512,512),Image.Resampling.NEAREST),
                         Image.fromarray(t).resize((512,512),Image.Resampling.NEAREST))

def sheet(char,library):
    keys=[k for k in library if k not in ['front_master','front_3q_master']]
    height=670+294*((len(keys)+4)//5)
    s=Image.new('RGB',(1792,height),(7,13,22)); d=ImageDraw.Draw(s)
    d.text((28,20),f'MAHFITT  /  {char.upper()}',font=fp.font(28,True),fill=(140,217,255))
    labels=[('front_master','FRONT'),('front_3q_master','FRONT 3/4')]
    for i,(key,title) in enumerate(labels):
        img=fp.compose(library[key]['frames_data'][0]); s.paste(img,(200+i*780,80),img)
        d.text((365+i*780,595),title,font=fp.font(22,True),fill=(191,222,244))
    for i,key in enumerate(keys):
        x=(i%5)*358; y=650+(i//5)*294
        frames=library[key]['frames_data']; img=fp.compose(frames[len(frames)//2]).resize((256,256),Image.Resampling.NEAREST)
        s.paste(img,(x+51,y),img)
        d.text((x+51,y+257),key.upper().replace('_',' '),font=fp.font(15,True),fill=(135,188,225))
    path=REVIEW/f'{char.upper()}_FINAL.png'; s.save(path); return s

def finish():
    REVIEW.mkdir(parents=True,exist_ok=True); package={}; checks={}
    for char in ['female','male']:
        render=json.loads((RAW/char/'render_manifest.json').read_text())
        library={}
        for state,spec in render['states'].items():
            frames=[process(char,RAW/char/rec['file'],{'state':state,**rec}) for rec in spec['frames']]
            library[state]={'frames_data':frames,'durationsMs':spec['durationsMs'],'loop':spec['loop'],
                'purpose':state.replace('_',' '),'interruptible':True,'transition':'idle_neutral'}
            if state in ['front_master','front_3q_master']:
                fp.save_frame(frames[0],MASTERS/f'{char}_{state}.png')
        manifests,records=fp.write_animation_assets(char,library)
        pages=fp.pack_atlases(char,records,manifests)
        for page in pages:
            for key in ['neutral','themeIndex','bluePreview']:
                page[key]=page[key].replace('/FINAL_APPROVED/','/'+TAG+'/')
        manifest_path=fp.write_manifest(char,manifests,pages)
        manifest=json.loads(manifest_path.read_text())
        manifest['artDirection']='Same native pixel master; subtle inset helmet bevel, compact bright facial cores, female-only lashes; rigid-length articulated movement'
        manifest['faceLock']={'eyes':'polished consistent rings','mouth':'polished compact smile','femaleOnlyLashes':True}
        manifest['themeArchitecture']['binding']='Active MAHFITT app secondary/theme color; explicit indexed material IDs'
        manifest['themeArchitecture']['lockedNeutralMaterials']=['black','graphite','silver','white']
        manifest['armLengthAudit']=render['audit']
        if TAG=='SMOOTH_APP':
            manifest['playback']={'updatePath':'requestAnimationFrame','targetHz':60,'authoredMotion':'selective breakdown frames; duration-based timing; no image interpolation'}
            for name,spec in manifest['animations'].items():
                spec['holdFrame']=int(np.argmax(spec['durationsMs'])) if max(spec['durationsMs'])>min(spec['durationsMs']) else len(spec['frames'])//2
        manifest_path.write_text(json.dumps(manifest,indent=2))
        package[char]=library
        checks[char]=check(char,library,manifest)
        sheet(char,library)
    index={'defaultCharacter':'female','defaultTheme':'blue','characters':{'female':'female.json','male':'male.json'}}
    (fp.MANIFESTS/'index.json').write_text(json.dumps(index,indent=2))
    # Compact final owner sheet and a representative app-scale motion contact sheet.
    sh=Image.open(REVIEW/'FEMALE_FINAL.png').height
    owner=Image.new('RGB',(1792,sh*2),(7,13,22))
    for i,char in enumerate(['female','male']): owner.paste(Image.open(REVIEW/f'{char.upper()}_FINAL.png'),(0,i*sh))
    owner.save(REVIEW/'FINAL_OWNER_REVIEW.png')
    motion_keys=['idle_neutral','think_loop','point_right','wave_greet','celebrate_small']
    contact=Image.new('RGB',(2304,2860),(7,13,22)); d=ImageDraw.Draw(contact)
    d.text((30,20),'MAHFITT  /  COMMON MOTION',font=fp.font(28,True),fill=(140,217,255))
    for ci,char in enumerate(['female','male']):
        for si,key in enumerate(motion_keys):
            y=75+(ci*5+si)*276
            d.text((25,y+25),f'{char.upper()}\n{key.upper().replace("_"," ")}',font=fp.font(17,True),fill=(161,210,244))
            frames=package[char][key]['frames_data']
            for j,k in enumerate(np.linspace(0,len(frames)-1,8).round().astype(int)):
                img=fp.compose(frames[k]).resize((256,256),Image.Resampling.NEAREST)
                contact.paste(img,(256+j*256,y),img)
    contact.save(REVIEW/'MOTION_PREVIEW_SHEET.png')
    gif_frames=[]; durations=[]
    for key in [k for k in package['female'] if k not in ['front_master','front_3q_master','look_left','look_right']]:
        specs=[package[c][key] for c in ['female','male']]
        for k in range(len(specs[0]['frames_data'])):
            frame=Image.new('RGB',(640,380),(7,13,22)); dd=ImageDraw.Draw(frame)
            dd.text((22,14),key.upper().replace('_',' '),font=fp.font(20,True),fill=(140,217,255))
            for j,spec in enumerate(specs):
                img=fp.compose(spec['frames_data'][k]).resize((256,256),Image.Resampling.NEAREST)
                frame.paste(img,(32+320*j,76),img)
                dd.text((32+320*j,345),['FEMALE','MALE'][j],font=fp.font(16,True),fill=(196,222,242))
            gif_frames.append(frame); durations.append(specs[0]['durationsMs'][k])
    gif_frames[0].save(REVIEW/'COMMON_MOTION.gif',save_all=True,append_images=gif_frames[1:],duration=durations,loop=0,disposal=2)
    theme_proof(package,checks)
    (RAW/'checks.json').write_text(json.dumps(checks,indent=2))
    if TAG=='SMOOTH_APP':
        print(json.dumps({'review':str(REVIEW),'checks':checks},indent=2))
        return  # The app module is maintained directly; never overwrite it with the legacy timer template.
    runtime=P/'11_PROTOTYPE'/TAG; runtime.mkdir(exist_ok=True)
    old=P/'11_PROTOTYPE/FINAL_APPROVED'
    for name in ['index.html','styles.css']:
        shutil.copy2(old/name,runtime/name)
    html=(runtime/'index.html').read_text().replace('styles.css"','styles.css?v=final-polish"').replace('runtime.js"','runtime.js?v=final-polish"')
    (runtime/'index.html').write_text(html)
    css=(runtime/'styles.css').read_text().replace('width:min(100%,620px); height:auto;',
        'width:256px; height:256px; max-width:100%;')
    (runtime/'styles.css').write_text(css)
    js=(old/'runtime.js').read_text()
    js=js.replace('/FINAL_APPROVED/','/'+TAG+'/')
    js=js.replace('location.href','import.meta.url')
    js=js.replace('async setCharacter(character) {','async setCharacter(character) {\n    clearTimeout(this.timer);')
    js=js.replace('this.pageCache.clear();','if (this.secondaryPalette) this.manifest.themeArchitecture.palettes.app = this.secondaryPalette;\n    this.pageCache.clear();')
    js=js.replace('  setTheme(theme) {','''  setThemeColor(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("Use a six-digit app secondary color, e.g. #1ca4f2");
    const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
    this.secondaryPalette = [.07,.22,.54,1].map(scale => rgb.map(v => Math.round(v*scale)));
    this.secondaryPalette.push(rgb.map(v => Math.round(v+(255-v)*.80)));
    this.theme = "app";
    if (this.manifest) {
      this.manifest.themeArchitecture.palettes.app = this.secondaryPalette;
      this.drawCurrent();
    }
    return this;
  }

  setTheme(theme) {''')
    js=js.replace('  returnToIdle() {', '  dispose() { this.disposed = true; clearTimeout(this.timer); this.pageCache.clear(); }\n\n  returnToIdle() {')
    js=js.replace('  schedule() {\n', '  schedule() {\n    if (this.disposed) return;\n')
    js=js.replace('    const page = await this.loadPage(frame.page);', '    const page = await this.loadPage(frame.page);\n    if (this.disposed) return;')
    js=js.replace('["look_around", "inspect_ui", "shoulder_roll", "rare_special_idle_a"]','["look_left", "look_right", "idle_long"]')
    js=js.replace('this.frameIndex = 0;\n    await this.drawCurrent();',
        'this.frameIndex = this.reducedMotion && !this.manifest.animations[name].loop ? Math.floor(this.manifest.animations[name].frames.length / 2) : 0;\n    await this.drawCurrent();')
    js=js.replace('this.frameIndex = animation.frames.length - 1;\n        this.timer = setTimeout(() => this.returnToIdle(), 220);',
        'this.timer = setTimeout(() => this.returnToIdle(), 1500);')
    js=js.replace('if (!spec.loop) setTimeout(() => { this.currentPriority = 0; }, spec.durationsMs.reduce((a, b) => a + b, 0));',
        'if (!spec.loop || channel === "personality") setTimeout(() => { this.currentPriority = 0; if (channel === "personality" && this.companion.animation === animation) this.companion.returnToIdle(); }, spec.durationsMs.reduce((a, b) => a + b, 0));')
    # Avoid importing a demo DOM when used as an application module.
    js=js.replace('const companion = new MahfittCompanion(canvas);','if (canvas) {\nconst companion = new MahfittCompanion(canvas);')+'\n}\n'
    (runtime/'runtime.js').write_text(js)
    (runtime/'README.md').write_text('# MAHFITT final polish\n\nServe 27_PIXEL_COMPANION over HTTP and open 11_PROTOTYPE/FINAL_POLISH/index.html. Import MahfittCompanion from runtime.js. 17 animations plus two static masters per character (all eight pointing directions, two dances, idles, wave and celebration). 512px export, unchanged 256px authored grid. No smoothing. The same polished face is consistent across states; subtle lashes are female-only. Set the app secondary color with setThemeColor(hex), or choose a named palette with setTheme(name). Black/graphite and neutral silver/white never recolor.\n')
    print(json.dumps({'review':str(REVIEW),'checks':checks},indent=2))

def check(char,library,manifest):
    render=json.loads((RAW/char/'render_manifest.json').read_text())
    count=0
    for state,spec in library.items():
        for i,frame in enumerate(spec['frames_data']):
            a=np.array(fp.compose(frame)); assert set(np.unique(a[:,:,3]))<={0,255}
            rec=render['states'][state]['frames'][i]
            if rec.get('pixel_native'):
                for feature in rec['feature_boxes']:
                    sx,sy,ex,ey=feature['src']; dx,dy=feature['dst']; w,h=ex-sx,ey-sy
                    source=Image.open(MASTERS/feature['asset'])
                    expected=np.array(source.resize((w*2,h*2),Image.Resampling.NEAREST))
                    assert np.array_equal(a[dy*2:(dy+h)*2,dx*2:(dx+w)*2],expected),f'Feature changed: {char}/{state}/{i}'
            count+=1
    assert render['audit']['max_segment_relative_error']<2e-5
    if TAG=='SMOOTH_APP':
        for name in ['front_master','front_3q_master']:
            previous=np.array(Image.open(P/f'05_PIXEL_MASTERS/FINAL_POLISH/{char}_{name}.png').convert('RGBA'))
            assert np.array_equal(np.array(fp.compose(library[name]['frames_data'][0])),previous),f'Visual master drift: {char}/{name}'
    for page in manifest['atlases']['pages']:
        for key in ['neutral','themeIndex','bluePreview']:
            assert (fp.MANIFESTS/page[key]).resolve().is_file()
    return {'states':len(library),'frames':count,'face_pixels_locked':True,
            'arm_segment_max_relative_error':render['audit']['max_segment_relative_error'],'atlas_paths_verified':True,
            'final_visual_master_pixel_identical':TAG=='SMOOTH_APP'}

def theme_proof(package,checks):
    proof=Image.new('RGB',(1216,660),(7,13,22)); d=ImageDraw.Draw(proof)
    d.text((24,16),'BLUE = APP SECONDARY / THEME COLOR',font=fp.font(24,True),fill=(140,217,255))
    for ci,char in enumerate(['female','male']):
        frame=package[char]['front_master']['frames_data'][0]
        blue=np.array(fp.compose(frame,'blue')); changed=np.array(fp.compose(frame,'purple'))
        locked=np.array(frame.neutral)[:,:,3]>0
        assert np.array_equal(blue[locked],changed[locked])
        assert np.any(blue!=changed)
        checks[char]['theme_neutrals_unchanged']=True
        for ti,theme in enumerate(['blue','purple']):
            im=fp.compose(frame,theme).resize((256,256),Image.Resampling.NEAREST)
            x=32+ci*608+ti*280; proof.paste(im,(x,80),im)
            d.text((x,350),char.upper()+' / '+theme.upper(),font=fp.font(17,True),fill=(190,216,238))
    d.text((24,430),'Same sprites. Only indexed theme pixels swap.',font=fp.font(24,True),fill=(205,230,249))
    d.text((24,478),'Black / graphite: permanent. Silver / white: neutral.',font=fp.font(21),fill=(165,190,216))
    d.text((24,526),'All frames: hard alpha, nearest-neighbor pixels, fixed arm lengths.',font=fp.font(21),fill=(165,190,216))
    proof.save(REVIEW/'THEME_CONFIRMATION.png')

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('stage',choices=['prep','finish']); a=p.parse_args()
    prep() if a.stage=='prep' else finish()
