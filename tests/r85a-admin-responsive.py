#!/usr/bin/env python3
import os,re,subprocess,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'validation'/'r85a-admin'; OUT.mkdir(parents=True,exist_ok=True)
SHARED=(ROOT/'mahfitt-canonical-components.css').read_text(errors='ignore')
ADMIN_CSS=(ROOT/'admin-app.css').read_text(errors='ignore')
ADMIN_JS=(ROOT/'admin-app.js').read_text(errors='ignore')
COACH_CSS=(ROOT/'coach-shell.css').read_text(errors='ignore')
COACH_JS=(ROOT/'coach-shell.js').read_text(errors='ignore')
VIEWPORTS=[('iphone-375',375,812),('iphone-390',390,844),('iphone-393',393,852),('iphone-430',430,932),('ipad-portrait',768,1024),('ipad-landscape',1024,768)]
THEME="""() => { const m=new Map(); const mem={getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear()}; Object.defineProperty(window,'localStorage',{value:mem,configurable:true}); const s=new Map(); Object.defineProperty(window,'sessionStorage',{value:{getItem:k=>s.has(String(k))?s.get(String(k)):null,setItem:(k,v)=>s.set(String(k),String(v)),removeItem:k=>s.delete(String(k))},configurable:true}); localStorage.setItem('fob.mygym.theme.active-account.v1',JSON.stringify({accountId:'jah',theme:{dark:'#061A08',accent:'#B8FF70',motion:true}})); }"""

def server_html(module):
    code=f"""const S=require('./netlify/functions/_session');const f=require('./netlify/functions/{module}');(async()=>{{const t=S.createToken(),r=await f.handler({{httpMethod:'GET',headers:{{cookie:'fob_review='+t}}}});process.stdout.write(r.body||'')}})().catch(e=>{{console.error(e);process.exit(1)}})"""
    env=dict(os.environ); env['SESSION_SECRET']='r85a-responsive-secret'
    r=subprocess.run(['node','-e',code],cwd=ROOT,env=env,capture_output=True,text=True,check=True)
    # The test executes production layout/style and the canonical crown script;
    # route-specific inline app logic is removed to keep server/API writes inert.
    return re.sub(r'<script\b[^>]*>.*?</script>','',r.stdout,flags=re.S|re.I)

def dims(page):
    return page.evaluate("""() => ({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bw:document.body.scrollWidth})""")
def contained(page,w):
    d=dims(page); return d['sw']<=w+1 and d['bw']<=w+1 and d['cw']==w

def add_canonical(page):
    page.add_style_tag(content=SHARED); page.add_style_tag(content=COACH_CSS); page.add_script_tag(content=COACH_JS); page.wait_for_selector('.coach-shell')

def main():
    checks=0
    inquiries=server_html('form-review')
    members=server_html('fob-payment')
    with sync_playwright() as p:
      browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
      for name,w,h in VIEWPORTS:
        # FOB Admin root: actual production JS/CSS + canonical crown.
        pg=browser.new_page(viewport={'width':w,'height':h}); errs=[]; pg.on('pageerror',lambda e,errs=errs:errs.append(str(e)))
        pg.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><body><main id="adminApp" class="admin-loading"></main></body>')
        pg.evaluate(THEME); pg.evaluate("""() => { window.fetch=async()=>new Response(JSON.stringify({ok:true,members:[{id:'11111111-1111-4111-8111-111111111111',first_name:'Dominic',last_name:'Malazarte',sesh_left:4,active:true}],recent:[],checkinReady:true,messageUnread:2}),{status:200,headers:{'Content-Type':'application/json'}}); window.BarcodeDetector=undefined; }""")
        pg.add_style_tag(content=SHARED); pg.add_style_tag(content=ADMIN_CSS); pg.add_style_tag(content=COACH_CSS); pg.add_script_tag(content=ADMIN_JS); pg.add_script_tag(content=COACH_JS); pg.wait_for_selector('.admin-app'); pg.wait_for_selector('.coach-shell')
        assert contained(pg,w),(name,'admin',dims(pg)); checks+=1
        assert not errs,(name,'admin errors',errs); checks+=1
        text=pg.locator('body').inner_text(); assert all(x not in text for x in ('Backend Player','OPEN MAHFITT','LEGACY / DIRECT FALLBACK')); checks+=1
        tool=pg.locator('.coach-tool').first.evaluate("e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})"); assert round(tool['w'])==40 and round(tool['h'])==40,(name,tool); checks+=1
        action=pg.locator('.admin-core-links a').first.evaluate("e=>({h:e.getBoundingClientRect().height,r:getComputedStyle(e).borderRadius,f:getComputedStyle(e).fontFamily})"); assert action['h']>=48 and action['r'].startswith('2px') and 'Space Grotesk' in action['f']; checks+=1
        vals=pg.evaluate("() => ({accent:getComputedStyle(document.documentElement).getPropertyValue('--admin-primary').trim().toUpperCase(),surface:getComputedStyle(document.documentElement).getPropertyValue('--admin-bg').trim().toUpperCase()})"); assert vals=={'accent':'#B8FF70','surface':'#061A08'},(name,vals); checks+=1
        if name=='iphone-393': pg.screenshot(path=str(OUT/'fob-admin-393.png'),full_page=True)
        pg.close()

        # Actual server-generated MAH Inquiries dashboard body + canonical crown.
        pg=browser.new_page(viewport={'width':w,'height':h}); errs=[]; pg.on('pageerror',lambda e,errs=errs:errs.append(str(e)))
        pg.set_content(inquiries,wait_until='domcontentloaded'); pg.evaluate(THEME); add_canonical(pg); pg.wait_for_timeout(60)
        assert contained(pg,w),(name,'inquiries',dims(pg)); checks+=1
        assert not errs,(name,'inquiries errors',errs); checks+=1
        assert 'Inquiry Responses' in pg.locator('body').inner_text(); checks+=1
        vals=pg.evaluate("() => ({gold:getComputedStyle(document.documentElement).getPropertyValue('--gold').trim().toUpperCase(),bg:getComputedStyle(document.documentElement).getPropertyValue('--ink').trim().toUpperCase()})"); assert vals['gold']=='#B8FF70' and vals['bg']=='#061A08',(name,vals); checks+=1
        if name=='iphone-393': pg.screenshot(path=str(OUT/'inquiries-393.png'),full_page=True)
        pg.close()

        # Actual server-generated Members Edit body. Route scripts inert; shared/crown ownership live.
        pg=browser.new_page(viewport={'width':w,'height':h}); errs=[]; pg.on('pageerror',lambda e,errs=errs:errs.append(str(e)))
        pg.set_content(members,wait_until='domcontentloaded'); pg.evaluate(THEME); add_canonical(pg); pg.wait_for_timeout(60)
        assert contained(pg,w),(name,'members',dims(pg)); checks+=1
        assert not errs,(name,'members errors',errs); checks+=1
        assert 'MEMBERS EDIT' in pg.locator('body').inner_text(); checks+=1
        btn=pg.locator('.btn').first.evaluate("e=>({h:e.getBoundingClientRect().height,r:getComputedStyle(e).borderRadius,f:getComputedStyle(e).fontFamily})"); assert btn['h']>=48 and btn['r'].startswith('2px') and 'Space Grotesk' in btn['f'],(name,btn); checks+=1
        vals=pg.evaluate("() => ({gold:getComputedStyle(document.documentElement).getPropertyValue('--gold').trim().toUpperCase(),bright:getComputedStyle(document.documentElement).getPropertyValue('--bright').trim().toUpperCase()})"); assert vals['gold']=='#B8FF70' and vals['bright']=='#B8FF70',(name,vals); checks+=1
        if name=='iphone-393': pg.screenshot(path=str(OUT/'members-edit-393.png'),full_page=True)
        pg.close()
      browser.close()
    total=len(VIEWPORTS)*15
    print(f'r85a-admin-responsive: {checks}/{total} PASS')
if __name__=='__main__':
  try: main()
  except Exception as e:
    print('r85a-admin-responsive FAIL:',repr(e),file=sys.stderr); raise
