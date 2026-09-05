#!/usr/bin/env python3
import asyncio, json, os, re, subprocess
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
ADMIN_JS=(ROOT/'admin-app.js').read_text()
ADMIN_CSS=(ROOT/'admin-app.css').read_text()
COACH_JS=(ROOT/'coach-shell.js').read_text()
COACH_CSS=(ROOT/'coach-shell.css').read_text()
VIEWPORTS=[(375,812,'375'),(393,852,'393'),(430,932,'430'),(768,1024,'ipad')]

def inquiries_html():
  code="""const S=require('./netlify/functions/_session');const f=require('./netlify/functions/form-review');(async()=>{const t=S.createToken(),r=await f.handler({httpMethod:'GET',headers:{cookie:'fob_review='+t}});process.stdout.write(r.body)})()"""
  env=dict(os.environ);env['SESSION_SECRET']='r85b-test-secret'
  r=subprocess.run(['node','-e',code],cwd=ROOT,env=env,capture_output=True,text=True,check=True)
  return re.sub(r'<script\b[^>]*>.*?</script>','',r.stdout,flags=re.S|re.I)
async def main():
  passed=0
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for w,h,name in VIEWPORTS:
      page=await browser.new_page(viewport={'width':w,'height':h})
      errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
      await page.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body><main id="adminApp" class="admin-loading"></main></body>')
      await page.add_style_tag(content=ADMIN_CSS+'\n:root{--admin-bg:#061a08;--admin-panel:#0b2410;--admin-panel-2:#071d0b;--admin-primary:#b8ff70;--admin-secondary:#b8ff70}body{padding-top:160px!important}')
      await page.evaluate("""window.fetch=async()=>({status:200,ok:true,json:async()=>({ok:true,members:[{id:'11111111-1111-4111-8111-111111111111',first_name:'Dominic',last_name:'Malazarte',sesh_left:4,active:true}],recent:[],checkinReady:true,messageUnread:2})});window.BarcodeDetector=undefined;""")
      await page.add_script_tag(content=ADMIN_JS)
      await page.wait_for_selector('.admin-app')
      dims=await page.evaluate('({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bw:document.body.scrollWidth})')
      text=await page.locator('body').inner_text()
      assert dims['sw']==dims['cw']==w and dims['bw']==w,(name,dims)
      assert 'LEGACY / DIRECT FALLBACK' not in text and 'LEGACY GYM TRACKER' not in text
      assert 'MAHFITT COACH MODE' in text and 'MAH INQUIRIES' in text
      assert not errors,(name,errors)
      passed+=5
      if name=='393': await page.screenshot(path=str(ROOT/'validation/r85b-admin-393.png'),full_page=True)
      await page.close()
    # The exact MAH Inquiries server-rendered dashboard must be mobile-contained too.
    review_html=inquiries_html()
    for w,h,name in VIEWPORTS:
      page=await browser.new_page(viewport={'width':w,'height':h})
      errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
      await page.set_content(review_html,wait_until='domcontentloaded')
      await page.add_style_tag(content=COACH_CSS+'\n:root{--coach-surface:#061a08!important;--coach-primary:#b8ff70!important}body.coach-shell-mounted{padding-top:160px!important}')
      await page.evaluate("document.body.classList.add('coach-shell-mounted')")
      dims=await page.evaluate('({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bw:document.body.scrollWidth})')
      assert dims['sw']==dims['cw']==w and dims['bw']==w,(name,dims)
      text=await page.locator('body').inner_text()
      assert 'FOB ADMIN · MAH INQUIRIES' in text and 'Inquiry Responses' in text
      assert not errors,(name,errors)
      passed+=3
      await page.close()
    # Theme bridge: setContent has an opaque origin, so provide a deterministic in-memory Storage object.
    page=await browser.new_page(viewport={'width':393,'height':852})
    await page.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body><main>FOB ADMIN</main></body>')
    await page.evaluate("""Object.defineProperty(window,'localStorage',{value:{_:{},getItem(k){return this._[k]||null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}}});localStorage.setItem('fob.mygym.theme.active-account.v1',JSON.stringify({accountId:'jah',theme:{dark:'#061A08',accent:'#B8FF70',motion:true}}));""")
    await page.add_style_tag(content=COACH_CSS)
    await page.add_script_tag(content=COACH_JS)
    await page.wait_for_selector('.coach-shell')
    vals=await page.evaluate("({surface:getComputedStyle(document.documentElement).getPropertyValue('--coach-surface').trim().toUpperCase(),accent:getComputedStyle(document.documentElement).getPropertyValue('--coach-primary').trim().toUpperCase()})")
    assert vals=={'surface':'#061A08','accent':'#B8FF70'},vals
    await page.click('[data-coach="theme-edit"]')
    assert 'There is no separate backend color theme.' in await page.locator('.coach-dialog').inner_text()
    passed+=3
    await page.close(); await browser.close()
  print(f'r85b-admin-responsive: {passed}/{len(VIEWPORTS)*8+3} PASS')
asyncio.run(main())
