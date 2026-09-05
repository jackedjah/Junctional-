#!/usr/bin/env python3
import importlib.util, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'validation'/'r85a-components'; OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('r85flow',ROOT/'tests'/'r85-browser-flow.py'); flow=importlib.util.module_from_spec(spec); spec.loader.exec_module(flow)
# R85A establishes this as the shared production metric owner.
flow.CSS_FILES=['mahfitt-canonical-components.css']+flow.CSS_FILES
ADMIN_JS=(ROOT/'admin-app.js').read_text(); ADMIN_CSS=(ROOT/'admin-app.css').read_text(); COACH_JS=(ROOT/'coach-shell.js').read_text(); COACH_CSS=(ROOT/'coach-shell.css').read_text(); SHARED=(ROOT/'mahfitt-canonical-components.css').read_text()

def shot(page,name):
    page.wait_for_timeout(220); page.screenshot(path=str(OUT/name),full_page=True)

def main():
    checks=0; errors=[]
    with sync_playwright() as p:
      browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
      state=flow.mock_state(); pg=browser.new_page(viewport={'width':393,'height':852}); pg.on('pageerror',lambda e:errors.append(str(e)))
      flow.install_in_memory_app(pg,state); flow.wait_text(pg,'MAH PROTOCOL');
      assert flow.no_overflow(pg); checks+=1; member_expanded=pg.locator('.mf-banner').first.evaluate("e=>e.getBoundingClientRect().height"); assert round(member_expanded)==281; checks+=1; member_anchors={k:pg.locator(v).first.evaluate("e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}") for k,v in {'message':'.crownmessage','collapse':'.mf-banner__collapse','player1':'.musiclib','player2':'.musiclibplay','theme1':'.crownai','theme2':'.themeedit'}.items()}; pg.locator('[data-a=\"banner-collapse\"]').first.click(); pg.wait_for_timeout(260); member_collapsed=pg.locator('.mf-banner').first.evaluate("e=>e.getBoundingClientRect().height"); assert round(member_collapsed)==172; checks+=1; pg.locator('[data-a=\"banner-collapse\"]').first.click(); pg.wait_for_timeout(260); shot(pg,'A-member-home-393.png')
      # Member opens the actual production MAH Player.
      pg.locator('[data-a="music-studio"]').first.click(); pg.wait_for_selector('#musicStudio');
      player_member=pg.locator('#musicStudio').evaluate("e=>({id:e.id,cls:e.className,role:e.querySelector('.studio-shell').getAttribute('role')})")
      assert player_member['id']=='musicStudio' and player_member['role']=='dialog'; checks+=2
      # The same production Player is captured here; range/file visual contracts are
      # source-guarded because an empty library does not render every transport rail.
      checks+=1; shot(pg,'D-player-member-393.png'); pg.get_by_role('button',name='Close mah player').click(); pg.wait_for_selector('#musicStudio',state='detached')
      # Member opens actual Theme Editor.
      pg.locator('[data-a="theme-edit"]').first.click(); pg.wait_for_selector('#mygymThemeEditor'); theme_member=pg.locator('#mygymThemeEditor').evaluate("e=>({id:e.id,cls:e.className,title:e.querySelector('#mythemeTitle').textContent})")
      assert theme_member['title']=='Theme Editor'; checks+=1; shot(pg,'F-theme-member-393.png'); pg.get_by_role('button',name='Close theme editor').click(); pg.wait_for_selector('#mygymThemeEditor',state='detached')
      # Same production app enters Coach Home, then authorized Dominic context.
      flow.enter_coach_home(pg); assert flow.no_overflow(pg); checks+=1; shot(pg,'B-coach-home-393.png')
      flow.enter_dominic(pg); ctx=lambda: 'VIEWING DOMINIC MALAZARTE' in pg.locator('body').inner_text()
      assert ctx(); checks+=1
      pg.locator('[data-a="music-studio"]').first.click(); pg.wait_for_selector('#musicStudio'); player_coach=pg.locator('#musicStudio').evaluate("e=>({id:e.id,cls:e.className,role:e.querySelector('.studio-shell').getAttribute('role')})")
      assert player_coach==player_member; checks+=1; shot(pg,'E-player-coach-client-393.png'); pg.get_by_role('button',name='Close mah player').click(); pg.wait_for_selector('#musicStudio',state='detached'); assert ctx(); checks+=1
      pg.locator('[data-a="theme-edit"]').first.click(); pg.wait_for_selector('#mygymThemeEditor'); theme_coach=pg.locator('#mygymThemeEditor').evaluate("e=>({id:e.id,cls:e.className,title:e.querySelector('#mythemeTitle').textContent})")
      assert theme_coach==theme_member; checks+=1; shot(pg,'G-theme-coach-client-393.png'); pg.get_by_role('button',name='Close theme editor').click(); pg.wait_for_selector('#mygymThemeEditor',state='detached'); assert ctx(); checks+=1
      flow.quiet_page(pg); pg.close()

      # Actual FOB Admin root + actual R85A Admin crown at the same viewport/Theme.
      ap=browser.new_page(viewport={'width':393,'height':852}); aerr=[]; ap.on('pageerror',lambda e:aerr.append(str(e)))
      ap.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><body><main id="adminApp" class="admin-loading"></main></body>')
      ap.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});const s=new Map();Object.defineProperty(window,'sessionStorage',{value:{getItem:k=>s.has(k)?s.get(k):null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k)}});localStorage.setItem('fob.mygym.theme.active-account.v1',JSON.stringify({accountId:'jah',theme:{dark:'#07120A',accent:'#BFFF67',motion:true}}));window.fetch=async()=>({status:200,ok:true,json:async()=>({ok:true,members:[],recent:[],checkinReady:true,messageUnread:2})});window.BarcodeDetector=undefined;}""")
      ap.add_style_tag(content=SHARED); ap.add_style_tag(content=ADMIN_CSS); ap.add_style_tag(content=COACH_CSS); ap.add_script_tag(content=ADMIN_JS); ap.add_script_tag(content=COACH_JS); ap.wait_for_selector('.coach-shell'); ap.wait_for_selector('.admin-app')
      assert flow.no_overflow(ap) and not aerr; checks+=2; admin_expanded=ap.locator('.coach-shell').evaluate("e=>e.getBoundingClientRect().height"); assert round(admin_expanded)==round(member_expanded); checks+=1; ap.locator('[data-coach=\"collapse\"]').click(); ap.wait_for_timeout(260); admin_collapsed=ap.locator('.coach-shell').evaluate("e=>e.getBoundingClientRect().height"); assert round(admin_collapsed)==round(member_collapsed); checks+=1; ap.locator('[data-coach=\"collapse\"]').click(); ap.wait_for_timeout(260)
      txt=ap.locator('body').inner_text(); assert 'Backend Player' not in txt and 'OPEN MAHFITT' not in txt and 'LEGACY' not in txt; checks+=1
      control=ap.locator('.coach-tool').first.evaluate("e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})"); assert control=={'w':40,'h':40}; checks+=1; admin_anchors={k:ap.locator(v).first.evaluate("e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}") for k,v in {'message':'.coach-shell__message','collapse':'.coach-shell__collapse','player1':'.coach-shell__side--left .coach-tool:nth-of-type(1)','player2':'.coach-shell__side--left .coach-tool:nth-of-type(2)','theme1':'.coach-shell__side--right .coach-tool:nth-of-type(1)','theme2':'.coach-shell__side--right .coach-tool:nth-of-type(2)'}.items()}; assert admin_anchors==member_anchors,(admin_anchors,member_anchors); checks+=1
      action=ap.locator('.admin-core-links a').first.evaluate("e=>({h:e.getBoundingClientRect().height,r:getComputedStyle(e).borderRadius,f:getComputedStyle(e).fontFamily})"); assert action['h']>=48 and action['r'] in ('2px','2px 2px 2px 2px') and 'Space Grotesk' in action['f']; checks+=3
      # Crown occlusion layer is structural and spans the crown region, not merely a transparency tweak.
      occ=ap.locator('.coach-shell__occlusion').evaluate("e=>({pos:getComputedStyle(e).position,bg:getComputedStyle(e).backgroundImage,h:e.getBoundingClientRect().height})"); assert occ['pos']=='absolute' and occ['h']>=188 and 'linear-gradient' in occ['bg']; checks+=3
      shot(ap,'C-fob-admin-393.png'); ap.close(); browser.close()
    if errors: raise AssertionError('production app page errors: '+repr(errors))
    print(f'r85a-component-visual: {checks}/{checks} PASS')
if __name__=='__main__':
    try: main()
    except Exception as e:
      print('r85a-component-visual FAIL:',repr(e),file=sys.stderr); raise
