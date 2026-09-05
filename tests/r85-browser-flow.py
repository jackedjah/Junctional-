#!/usr/bin/env python3
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'validation'/'r85-browser'
OUT.mkdir(parents=True,exist_ok=True)
JAH='11111111-1111-4111-8111-111111111111'
DOM='22222222-2222-4222-8222-222222222222'
JENN='33333333-3333-4333-8333-333333333333'
CREGY='44444444-4444-4444-8444-444444444444'
RID='55555555-5555-4555-8555-555555555555'
HID='66666666-6666-4666-8666-666666666666'

CSS_FILES=['gym-app.css','mygym.css','meal-gradient.css','music-studio.css','mahfitt-geometry.css','mahfitt-atmosphere.css','mahfitt-banner.css']
JS_FILES=['gym-shared.js','mahfitt-ui-state.js','mahfitt-navigation.js','meal-gradient.js','image-crop.js','qr-lite.js','exercise-visuals.js','mahfitt-health.js','mahfitt-atmosphere.js','mahfitt-listening.js','mahfitt-mmw.js','mygym.js']
SHELL='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0E1114"><meta name="color-scheme" content="dark"><title>MAHFITT R85 Browser Gate</title></head><body class="mahfitt-member"><main id="mygym"></main></body></html>'''

def member(mid,name):
    return {'id':mid,'name':name,'firstName':name.split()[0],'avatarUrl':'','gymOnly':False,'sessionsLeft':8}
J=member(JAH,'Jah Fobin'); D=member(DOM,'Dominic Malazarte')
SELF={'isClientContext':False,'canCoach':True,'isFobAdmin':True,'grant':'self','signedInAccountId':JAH,'activeFitnessProfileId':JAH,'permissions':{'fitness':True,'programs':True,'calendar':True,'logs':True,'progress':True,'media':True,'messages':True,'habits':True,'resources':True}}
CLIENT={'isClientContext':True,'canCoach':True,'isFobAdmin':True,'grant':'coach_relationship','signedInAccountId':JAH,'activeFitnessProfileId':DOM,'permissions':{'fitness':True,'programs':True,'calendar':True,'logs':True,'progress':True,'media':True,'messages':True,'habits':True,'resources':True}}
PROGRAM={'id':'88888888-8888-4888-8888-888888888888','name':'Power Plan','sub':'4 workouts','body':{'name':'Power Plan','sub':'4 workouts','days':[{'name':'Upper','items':[]}]}}

def mock_state():
    return {
      'resources':[{'id':RID,'title':'Protein Guide','category':'NUTRITION','type':'link','url':'https://example.com/protein','body':'','assignments':[]}],
      'habits':[{'id':HID,'title':'8,000 Steps','source':'coach','schedule':{'kind':'daily'},'completed':False,'editable':True}],
      'messages':[{'id':'99999999-9999-4999-8999-999999999999','mine':False,'senderRole':'member','body':'Ready for today','createdAt':'2026-09-04T09:00:00Z'}],
      'seq':10,
      'calls':{},
      'failDirectoryRemaining':0
    }

def api_response(action,b,state):
    profile=str(b.get('activeProfileId') or JAH).lower()
    if action=='boot':
        return {'ok':True,'account':J,'member':J,'roleContext':SELF,'theme':{'dark':'#07120A','accent':'#BFFF67'},'music':{'available':True,'tracks':[],'playlists':[],'currentTrackId':'','masterVolume':0.5},'programs':[PROGRAM],'recent':[],'activeWorkout':None}
    if action=='coachToday':
        return {'ok':True,'clientCount':3,'attention':[
          {'type':'message','clientId':DOM,'clientName':'Dominic Malazarte','label':'NEW MESSAGE','detail':'Ready for today','at':'2026-09-04T09:00:00Z'},
          {'type':'calendar','clientId':JENN,'clientName':'Jenn','label':'SESSION TODAY','detail':'Strength session','at':'2026-09-04T14:00:00Z'},
          {'type':'workout','clientId':CREGY,'clientName':'Cregy Patterson','label':'WORKOUT COMPLETED','detail':'Lower Body','at':'2026-09-04T08:30:00Z'}]}
    if action=='coachDirectory':
        if state.get('failDirectoryRemaining',0)>0:
            state['failDirectoryRemaining']-=1
            return {'ok':False,'error':'Coach Mode is temporarily unavailable.'}
        return {'ok':True,'clients':[{'id':DOM,'name':'Dominic Malazarte','preferredPark':'Prospect Park'},{'id':JENN,'name':'Jenn','preferredPark':''},{'id':CREGY,'name':'Cregy Patterson','preferredPark':''}]}
    if action=='coachProfileBoot':
        target=str(b.get('activeProfileId') or JAH).lower()
        if target==DOM.lower(): return {'ok':True,'member':D,'roleContext':CLIENT,'programs':[PROGRAM],'recent':[],'activeWorkout':None}
        return {'ok':True,'member':J,'roleContext':SELF,'programs':[PROGRAM],'recent':[],'activeWorkout':None}
    if action=='coachInbox':
        return {'ok':True,'threads':[{'id':DOM,'name':'Dominic Malazarte','unread':1,'latest':{'id':'m1','sender':'member','type':'message','body':'Ready for today','createdAt':'2026-09-04T09:00:00Z'}},{'id':JENN,'name':'Jenn','unread':0,'latest':{'id':'m2','sender':'member','type':'message','body':'Quick question','createdAt':'2026-09-03T18:00:00Z'}}]}
    if action=='coachResources': return {'ok':True,'resources':state['resources']}
    if action=='coachResourceCreate':
        state['seq']+=1; rid=f'aaaaaaaa-aaaa-4aaa-8aaa-{state["seq"]:012d}'
        typ='text' if b.get('type')=='text' else 'link'
        r={'id':rid,'title':b.get('title') or 'Resource','category':(b.get('category') or 'GENERAL').upper(),'type':typ,'url':b.get('url','') if typ=='link' else '','body':b.get('body','') if typ=='text' else '','assignments':[]}
        state['resources'].append(r); return {'ok':True,'resource':r}
    if action in ('coachResourceAssign','coachResourceUnassign'):
        for r in state['resources']:
            if r['id']==b.get('resourceId'):
                if action=='coachResourceAssign': r['assignments']=[{'clientId':b.get('clientId'),'assignedAt':'2026-09-04T10:00:00Z'}]
                else: r['assignments']=[]
        return {'ok':True,'assigned':action=='coachResourceAssign'}
    if action=='coachResourceArchive':
        state['resources']=[r for r in state['resources'] if r['id']!=b.get('resourceId')]; return {'ok':True}
    if action=='memberResources':
        return {'ok':True,'resources':[{'id':RID,'title':'Protein Guide','category':'NUTRITION','type':'link','url':'https://example.com/protein','body':'','assignedAt':'2026-09-04T10:00:00Z'}]}
    if action=='habitList': return {'ok':True,'day':b.get('day','2026-09-04'),'habits':state['habits']}
    if action=='habitCreate':
        state['seq']+=1; hid=f'bbbbbbbb-bbbb-4bbb-8bbb-{state["seq"]:012d}'
        h={'id':hid,'title':b.get('title') or 'Habit','source':'coach' if profile==DOM.lower() else 'self','schedule':b.get('schedule') or {'kind':'daily'},'completed':False,'editable':True}; state['habits'].append(h); return {'ok':True,'habit':h}
    if action=='habitToggle':
        for h in state['habits']:
            if h['id']==b.get('habitId'):
                h['completed']=bool(b.get('completed')); return {'ok':True,'habitId':h['id'],'day':b.get('day'),'completed':h['completed']}
        return {'ok':False,'error':'missing'}
    if action=='habitUpdate':
        for h in state['habits']:
            if h['id']==b.get('habitId'):
                h['title']=b.get('title',h['title']); h['schedule']=b.get('schedule',h['schedule'])
        return {'ok':True}
    if action=='habitArchive':
        state['habits']=[h for h in state['habits'] if h['id']!=b.get('habitId')]; return {'ok':True}
    if action=='exerciseLibrary': return {'ok':True,'exercises':[{'name':'Back Squat','category':'Strength','region':'Legs','equipment':'Barbell'}]}
    if action=='progress': return {'ok':True,'sets':[],'sessions':[],'summary':{}}
    if action=='trainingFoundation': return {'ok':True,'profile':{},'plans':[],'measurements':[],'healthDays':[],'activitySegments':[]}
    if action in ('protocolLoad','aiBoot','aiChat','mahProtocolLoad'): return {'ok':False,'error':'protected'}
    return {'ok':True}

def message_response(action,b,state):
    if action=='coachThread': return {'ok':True,'member':D,'messages':state['messages']}
    if action=='coachSend':
        state['seq']+=1
        m={'id':f'cccccccc-cccc-4ccc-8ccc-{state["seq"]:012d}','mine':True,'senderRole':'coach','body':b.get('body',''),'createdAt':'2026-09-04T10:01:00Z'}
        state['messages'].append(m); return {'ok':True,'message':m}
    return {'ok':True}

def install_in_memory_app(page,state):
    # This harness executes the exact production CSS/JS but replaces only APIs
    # and Storage, because this sandbox administratively blocks localhost/file URL
    # navigation. No production source is rewritten for the test.
    def py_fetch(payload):
        path=str(payload.get('path') or '')
        b=payload.get('body') or {}
        action=b.get('action','boot')
        state.setdefault('calls',{})[action]=state.setdefault('calls',{}).get(action,0)+1
        data=message_response(action,b,state) if 'message-center' in path else api_response(action,b,state)
        return {'status':200,'data':data}
    page.expose_function('__r85PyFetch',py_fetch)
    page.set_content(SHELL,wait_until='domcontentloaded')
    page.evaluate('''() => {
      function memoryStorage(){const m=new Map();return {getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>Array.from(m.keys())[i]||null,get length(){return m.size}}}
      Object.defineProperty(window,'localStorage',{value:memoryStorage(),configurable:true});
      Object.defineProperty(window,'sessionStorage',{value:memoryStorage(),configurable:true});
      window.fetch=async function(input,init){let body={};try{body=JSON.parse(init&&init.body||'{}')}catch(e){};const r=await window.__r85PyFetch({path:String(input||''),body});return new Response(JSON.stringify(r.data||{}),{status:r.status||200,headers:{'Content-Type':'application/json'}})};
      if(!window.matchMedia)window.matchMedia=function(){return{matches:false,addEventListener(){},removeEventListener(){}}};
    }''')
    for css in CSS_FILES:
        page.add_style_tag(content=(ROOT/css).read_text(errors='ignore'))
    for js in JS_FILES:
        page.add_script_tag(content=(ROOT/js).read_text(errors='ignore'))


def quiet_page(page):
    try:
        page.evaluate("""() => {
          window.fetch=async()=>new Response('{\"ok\":true}',{status:200,headers:{'Content-Type':'application/json'}});
          window.requestAnimationFrame=()=>0;
          const last=setTimeout(()=>{},0);
          for(let i=0;i<=last+32;i++){clearTimeout(i);clearInterval(i);try{cancelAnimationFrame(i)}catch(e){}}
        }""")
        page.wait_for_timeout(150)
    except Exception:
        pass

def no_overflow(page):
    return page.evaluate('Math.max(document.documentElement.scrollWidth,document.body.scrollWidth) <= window.innerWidth + 1')

def wait_text(page,text):
    page.wait_for_function('(t)=>document.body && document.body.innerText.includes(t)', arg=text, timeout=10000)

def click_exact(page,text):
    page.get_by_text(text,exact=True).first.click()

def enter_coach_home(page):
    wait_text(page,'MAH PROTOCOL')
    click_exact(page,'COACH MODE')
    wait_text(page,'TODAY')

def enter_dominic(page):
    page.get_by_role('button',name='CLIENTS').first.click()
    wait_text(page,'SEARCH CLIENTS'); wait_text(page,'Dominic Malazarte')
    page.get_by_text('Dominic Malazarte',exact=True).last.click()
    wait_text(page,'VIEWING DOMINIC MALAZARTE'); wait_text(page,'MAH PROTOCOL')

def run():
    errors=[]; checks=0
    with sync_playwright() as p:
      browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
      # Full interaction proof at 393px.
      state=mock_state(); page=browser.new_page(viewport={'width':393,'height':852})
      page.on('pageerror',lambda e:errors.append(str(e)))
      install_in_memory_app(page,state); enter_coach_home(page); checks+=3
      body=page.locator('body').inner_text(); assert 'PERIODIZATION' not in body and 'ROUTINE CREATOR' not in body and 'EXERCISE DATABASE' not in body; checks+=1
      wait_text(page,'Dominic Malazarte'); wait_text(page,'Jenn'); wait_text(page,'Cregy Patterson'); checks+=3
      page.get_by_role('button',name='CLIENTS').first.click(); wait_text(page,'SEARCH CLIENTS'); wait_text(page,'Dominic Malazarte'); checks+=2
      s=page.locator('#coachClientSearch'); s.fill('Dominic'); assert page.locator('.coach-client-row').count()==1; checks+=1
      page.get_by_label('Clear client search').click(); assert page.locator('.coach-client-row').count()>=3; checks+=1
      page.get_by_text('Dominic Malazarte',exact=True).last.click(); wait_text(page,'VIEWING DOMINIC MALAZARTE'); wait_text(page,'MAH PROTOCOL'); checks+=2
      client_body=page.locator('body').inner_text(); assert 'ROUTINE CREATOR' not in client_body and 'EXERCISE DATABASE' not in client_body; checks+=1
      # Canonical client Program Library exposes advanced tools only after intentional entry.
      page.locator('[data-a="program-library"]').first.click(); wait_text(page,'PROGRAM TOOLS'); wait_text(page,'PERIODIZATION'); wait_text(page,'EXERCISE DATABASE'); checks+=3
      # Back to canonical client Home, then MAH Progress -> MAH Habits.
      page.go_back(); wait_text(page,'VIEWING DOMINIC MALAZARTE'); wait_text(page,'MAH PROGRESS'); checks+=2
      click_exact(page,'MAH PROGRESS'); wait_text(page,'MAH HABITS'); checks+=1
      page.get_by_text('MAH HABITS',exact=True).last.click(); wait_text(page,'MAH HABITS · TODAY'); wait_text(page,'8,000 Steps'); checks+=2
      page.locator('#mahHabitTitle').fill('10-minute walk'); page.get_by_role('button',name='ADD HABIT').click(); wait_text(page,'10-minute walk'); checks+=1
      page.locator('[data-a="habit-toggle"]').last.click(); page.locator('[data-a="habit-toggle"][data-completed="1"]').last.wait_for(timeout=5000); checks+=1
      # Protected client AI remains structurally present but cannot be operated.
      page.locator('[data-a="progress"]').first.click(); wait_text(page,'GYM PROGRESS'); page.locator('[data-a="home"]').first.click(); wait_text(page,'MAH PROTOCOL'); click_exact(page,'MAH PROTOCOL'); wait_text(page,'PRIVATE MEMBER SYSTEM'); checks+=3
      page.get_by_role('button',name='BACK TO CLIENTS').click(); wait_text(page,'SEARCH CLIENTS'); checks+=1
      # Friendly coach Inbox -> canonical private thread; sender remains coach in mock state.
      page.get_by_role('button',name='MESSAGES').first.click(); wait_text(page,'Ready for today'); checks+=1
      page.locator('[data-a="coach-inbox-open"]').first.click(); wait_text(page,'AUTHORIZED PRIVATE THREAD'); checks+=1
      page.locator('#coachMessageText').fill('Coach follow-up'); page.get_by_role('button',name='SEND MESSAGE').click(); wait_text(page,'Coach follow-up'); assert state['messages'][-1]['senderRole']=='coach'; checks+=2
      page.get_by_role('button',name='BACK TO INBOX').click(); wait_text(page,'Messages'); checks+=1
      # Resources create + assign affordance exists in canonical Coach Resources.
      page.get_by_role('button',name='RESOURCES').first.click(); wait_text(page,'Protein Guide'); checks+=1
      page.locator('details.coach-resource-new summary').click(); page.locator('#coachResourceTitle').fill('Mobility Reset'); page.locator('#coachResourceCategory').fill('TRAINING'); page.locator('#coachResourceUrl').fill('https://example.com/mobility'); page.locator('[data-a="coach-resource-create"]').click(); wait_text(page,'Mobility Reset'); checks+=2
      # FOB Admin is deliberate depth, not Coach Home.
      page.get_by_role('button',name='ADMIN').first.click(); wait_text(page,'FOB BUSINESS ADMIN'); checks+=1
      assert no_overflow(page); checks+=1
      page.wait_for_timeout(500)
      page.screenshot(path=str(OUT/'iphone-393-full.png'),full_page=True)
      quiet_page(page); page.close()

      # Responsive client-context proof at every required target.
      targets=[('iphone-375',375,812),('iphone-390',390,844),('iphone-393',393,852),('iphone-430',430,932),('ipad-portrait',768,1024),('ipad-landscape',1024,768)]
      responsive=[]
      for name,w,h in targets:
        st=mock_state(); pg=browser.new_page(viewport={'width':w,'height':h}); local=[]; pg.on('pageerror',lambda e,local=local:local.append(str(e)))
        install_in_memory_app(pg,st); enter_coach_home(pg); pg.get_by_role('button',name='CLIENTS').first.click(); wait_text(pg,'Dominic Malazarte'); pg.get_by_text('Dominic Malazarte',exact=True).last.click(); wait_text(pg,'VIEWING DOMINIC MALAZARTE'); pg.wait_for_timeout(500)
        ok=no_overflow(pg) and not local; responsive.append((name,ok,len(local))); assert ok,name+' overflow/error'; pg.screenshot(path=str(OUT/(name+'-client.png')),full_page=True); quiet_page(pg); pg.close(); checks+=4
      browser.close()
    if errors: raise AssertionError('Browser page errors: '+repr(errors))
    print('r85-browser-flow: %d assertions/interactions PASS'%checks)
    for row in responsive: print('  %s: PASS, browserErrors=%d'% (row[0],row[2]))

if __name__=='__main__':
    try: run()
    except Exception as e:
      print('r85-browser-flow FAIL:',repr(e),file=sys.stderr); raise
