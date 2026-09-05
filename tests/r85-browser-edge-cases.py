#!/usr/bin/env python3
import importlib.util, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('r85_browser_flow',ROOT/'tests'/'r85-browser-flow.py')
M=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(M)
OUT=ROOT/'validation'/'r85-browser';OUT.mkdir(parents=True,exist_ok=True)

def wait(t,p): M.wait_text(p,t)
def page_with(browser,state,w=393,h=852):
    p=browser.new_page(viewport={'width':w,'height':h});M.install_in_memory_app(p,state);return p

def run():
  checks=0;errors=[]
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    # Client Directory: genuine failure -> retry -> clean success, plus rapid double-tap guard.
    st=M.mock_state();st['failDirectoryRemaining']=1;p=page_with(browser,st);p.on('pageerror',lambda e:errors.append(str(e)));M.enter_coach_home(p);p.get_by_role('button',name='CLIENTS').first.click();wait('CLIENTS COULD NOT LOAD',p);checks+=1
    p.locator('[data-a="coach-directory-retry"]').click();wait('Dominic Malazarte',p);assert 'CLIENTS COULD NOT LOAD' not in p.locator('body').inner_text();checks+=2
    el=p.locator('[data-a="coach-client"][data-id="'+M.DOM+'"]').first
    el.evaluate('(e)=>{e.click();e.click()}');wait('VIEWING DOMINIC MALAZARTE',p);assert st['calls'].get('coachProfileBoot')==1;checks+=2
    p.wait_for_timeout(450);assert M.no_overflow(p);checks+=1;M.quiet_page(p);p.close()

    # Today row is actionable and routes into the right client's private thread.
    st=M.mock_state();p=page_with(browser,st);M.enter_coach_home(p);p.locator('[data-a="coach-attention"][data-route="coach-messages"]').first.click();wait('AUTHORIZED PRIVATE THREAD',p);wait('VIEWING DOMINIC MALAZARTE',p);checks+=2;M.quiet_page(p);p.close()

    # Client context: Calendar carries target member id; Back closes overlay; context survives.
    st=M.mock_state();p=page_with(browser,st);M.install_in_memory_app if False else None
    M.enter_coach_home(p);p.get_by_role('button',name='CLIENTS').first.click();wait('Dominic Malazarte',p);p.get_by_text('Dominic Malazarte',exact=True).last.click();wait('VIEWING DOMINIC MALAZARTE',p);p.wait_for_timeout(350)
    p.locator('[data-a="calendar"]').first.click(timeout=5000);p.locator('#mygymCalendar iframe').wait_for(timeout=5000);src=p.locator('#mygymCalendar iframe').get_attribute('src') or '';assert 'activeProfileId='+M.DOM in src;checks+=2
    p.go_back();p.wait_for_function("()=>!document.getElementById('mygymCalendar')",timeout=5000);wait('VIEWING DOMINIC MALAZARTE',p);checks+=2
    # MAH Habits persistence, edit, complete/uncomplete across route changes.
    p.get_by_text('MAH PROGRESS',exact=True).first.click();wait('MAH HABITS',p);p.locator('[data-a="mah-habits"]').click();wait('MAH HABITS · TODAY',p)
    p.locator('#mahHabitTitle').fill('10-minute walk');p.locator('[data-a="habit-save"]').click();wait('10-minute walk',p);checks+=1
    new_id=st['habits'][-1]['id'];p.locator('[data-a="habit-toggle"][data-id="'+new_id+'"]').click();p.locator('[data-a="habit-toggle"][data-id="'+new_id+'"][data-completed="1"]').wait_for(timeout=5000);checks+=1
    p.locator('[data-a="progress"]').click();wait('GYM PROGRESS',p);p.locator('[data-a="mah-habits"]').click();wait('10-minute walk',p);assert p.locator('[data-a="habit-toggle"][data-id="'+new_id+'"]').get_attribute('data-completed')=='1';checks+=2
    p.locator('[data-a="habit-edit"][data-id="'+new_id+'"]').click();p.locator('#mahHabitTitle').fill('10-minute walk after lunch');p.locator('[data-a="habit-save"]').click();wait('10-minute walk after lunch',p);checks+=1
    p.locator('[data-a="habit-toggle"][data-id="'+new_id+'"]').click();p.locator('[data-a="habit-toggle"][data-id="'+new_id+'"][data-completed="0"]').wait_for(timeout=5000);checks+=1
    p.evaluate('window.scrollTo(0,0)');p.wait_for_timeout(80);p.screenshot(path=str(OUT/'iphone-393-habits.png'),full_page=True);M.quiet_page(p);p.close()

    # Resources: canonical list/category, link contract, assignment without duplicate copy.
    st=M.mock_state();p=page_with(browser,st);M.enter_coach_home(p);p.get_by_role('button',name='RESOURCES').first.click();wait('Protein Guide',p);assert p.locator('a[href="https://example.com/protein"]').count()==1;checks+=2
    select=p.locator('#resourceAssign_'+M.RID);select.select_option(M.DOM);p.locator('[data-a="coach-resource-assign"][data-resource="'+M.RID+'"]').click();wait('Dominic Malazarte ×',p);assert st['resources'][0]['assignments'][0]['clientId']==M.DOM;checks+=2
    p.locator('details.coach-resource-new summary').click();p.locator('#coachResourceTitle').fill('Mobility Reset');p.locator('#coachResourceCategory').fill('TRAINING');p.locator('#coachResourceUrl').fill('https://example.com/mobility');p.locator('[data-a="coach-resource-create"]').click();wait('Mobility Reset',p);wait('TRAINING',p);checks+=2
    p.evaluate('window.scrollTo(0,0)');p.wait_for_timeout(80);p.screenshot(path=str(OUT/'iphone-393-resources.png'),full_page=True);M.quiet_page(p);p.close()

    # Friendly surfaces visual captures: Coach Home, Clients, Messages, Admin.
    st=M.mock_state();p=page_with(browser,st);M.enter_coach_home(p);p.wait_for_timeout(250);p.screenshot(path=str(OUT/'iphone-393-coach-home.png'),full_page=True);checks+=1
    p.get_by_role('button',name='CLIENTS').first.click();wait('Dominic Malazarte',p);p.screenshot(path=str(OUT/'iphone-393-clients.png'),full_page=True);checks+=1
    p.get_by_role('button',name='MESSAGES').first.click();wait('Ready for today',p);p.screenshot(path=str(OUT/'iphone-393-messages.png'),full_page=True);checks+=1
    p.get_by_role('button',name='ADMIN').first.click();wait('FOB BUSINESS ADMIN',p);p.screenshot(path=str(OUT/'iphone-393-admin.png'),full_page=True);checks+=1
    M.quiet_page(p);p.close();browser.close()
  if errors: raise AssertionError(errors)
  print(f'r85-browser-edge-cases: {checks} assertions/interactions PASS')
if __name__=='__main__':
  try:run()
  except Exception as e:print('r85-browser-edge-cases FAIL:',repr(e),file=sys.stderr);raise
