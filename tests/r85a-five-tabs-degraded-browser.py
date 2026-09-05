#!/usr/bin/env python3
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
FLOW=ROOT/'tests'/'r85-browser-flow.py'
spec=importlib.util.spec_from_file_location('r85flow',FLOW)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
orig_api=mod.api_response

BUILTINS=[
 {'id':'builtin:coach-science','title':'FOB Coach Science Compendium','category':'GENERAL','type':'link','url':'/FOB-Coach-Science-Compendium-v1.0.pdf','body':'','assignments':[],'builtin':True},
 {'id':'builtin:pre-sesh','title':'FOB Pre-Sesh Checklist','category':'TRAINING','type':'link','url':'/FOB-Pre-Sesh-Checklist.pdf','body':'','assignments':[],'builtin':True},
 {'id':'builtin:participation','title':'FOB Session Participation Agreement','category':'GENERAL','type':'link','url':'/FOB-Session-Participation-Agreement.pdf','body':'','assignments':[],'builtin':True},
]

def degraded_api(action,b,state):
    if action=='coachDirectory':
        # Simulates the server's authenticated FOB-admin compatibility directory
        # while the optional relationship service is degraded.
        return {'ok':True,'degraded':True,'grant':'fob_admin','clients':[
          {'id':mod.DOM,'name':'Dominic Malazarte','preferredPark':''},
          {'id':mod.JENN,'name':'Jenn','preferredPark':''},
          {'id':mod.CREGY,'name':'Cregy Patterson','preferredPark':''},
        ]}
    if action=='coachResources':
        # Simulates migration-053 storage unavailable: useful shipped resources,
        # no fake create/assignment persistence.
        return {'ok':True,'storageAvailable':False,'degraded':True,'resources':BUILTINS}
    return orig_api(action,b,state)

mod.api_response=degraded_api

def main():
    checks=0; errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':393,'height':852})
        page.on('pageerror',lambda e: errors.append(str(e)))
        state=mod.mock_state()
        mod.install_in_memory_app(page,state)
        mod.enter_coach_home(page)
        mod.wait_text(page,'TODAY'); checks+=1
        assert mod.no_overflow(page); checks+=1

        # TODAY remains actionable under compatibility mode.
        mod.wait_text(page,'Dominic Malazarte'); checks+=1

        # CLIENTS loads a real directory instead of the permanent error card.
        page.get_by_role('button',name='CLIENTS').first.click()
        mod.wait_text(page,'SEARCH CLIENTS'); mod.wait_text(page,'Dominic Malazarte'); checks+=2
        assert 'CLIENTS COULD NOT LOAD' not in page.locator('body').inner_text(); checks+=1

        # MESSAGES still opens its real relationship/admin-authorized inbox owner.
        page.get_by_role('button',name='MESSAGES').first.click()
        mod.wait_text(page,'Ready for today'); checks+=1

        # RESOURCES renders the shipped fallback library if canonical storage is unavailable.
        page.get_by_role('button',name='RESOURCES').first.click()
        mod.wait_text(page,'FOB Coach Science Compendium');
        mod.wait_text(page,'FOB Pre-Sesh Checklist');
        mod.wait_text(page,'FOB Session Participation Agreement'); checks+=3
        body=page.locator('body').inner_text()
        assert 'BUILT-IN LIBRARY READY' in body; checks+=1
        assert page.locator('details.coach-resource-new').count()==0; checks+=1

        # ADMIN remains a deliberate first-level destination.
        page.get_by_role('button',name='ADMIN').first.click()
        mod.wait_text(page,'FOB BUSINESS ADMIN'); checks+=1
        assert mod.no_overflow(page); checks+=1
        assert not errors, errors; checks+=1
        browser.close()
    print(f'r85a-five-tabs-degraded-browser: {checks}/{checks} PASS')

if __name__=='__main__': main()
