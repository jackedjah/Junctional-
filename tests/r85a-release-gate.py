#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
import json, re, subprocess, sys, tomllib
ROOT=Path(__file__).resolve().parents[1]
SKIP_PARTS={'.git','node_modules'}
class Parser(HTMLParser):
    pass

def all_files(suffixes):
    return [p for p in ROOT.rglob('*') if p.is_file() and not any(x in p.parts for x in SKIP_PARTS) and p.suffix.lower() in suffixes]
errors=[]
js=all_files({'.js','.mjs'})
for p in js:
    r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
    if r.returncode: errors.append(f'JS {p.relative_to(ROOT)}: {r.stderr.strip()}')
html=all_files({'.html'})
for p in html:
    try: Parser().feed(p.read_text(errors='strict'))
    except Exception as e: errors.append(f'HTML {p.relative_to(ROOT)}: {e}')
css=all_files({'.css'})
for p in css:
    try:
        s=p.read_text(errors='strict'); s=re.sub(r'/\*.*?\*/','',s,flags=re.S); s=re.sub(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'','',s)
        if s.count('{')!=s.count('}'): errors.append(f'CSS {p.relative_to(ROOT)} braces {s.count("{")} != {s.count("}")}')
    except Exception as e: errors.append(f'CSS {p.relative_to(ROOT)}: {e}')
jsons=all_files({'.json'})
for p in jsons:
    try: json.loads(p.read_text())
    except Exception as e: errors.append(f'JSON {p.relative_to(ROOT)}: {e}')
for p in all_files({'.toml'}):
    try: tomllib.loads(p.read_text())
    except Exception as e: errors.append(f'TOML {p.relative_to(ROOT)}: {e}')
# Structure/deploy guards.
required=['mahfitt-canonical-components.css','index.html','mygym.js','mygym.css','calendar.html','calendar.js','calendar.css','sw.js','netlify.toml','netlify/functions/mygym.js','netlify/functions/_mahfitt-role-context.js','supabase/migrations/052_mahfitt_role_context.sql','dev/mahfitt-role-simulator.html']
for rel in required:
    if not (ROOT/rel).is_file(): errors.append('MISSING '+rel)
sw=(ROOT/'sw.js').read_text()
m=re.search(r"const SHELL = \[(.*?)\]\.map",sw,re.S)
if m:
    for asset in re.findall(r"'(/[^']+)'",m.group(1)):
        if not (ROOT/asset.lstrip('/')).is_file(): errors.append('SW ASSET MISSING '+asset)
else: errors.append('Could not parse service worker SHELL list')
# Conflict/debug/path leakage checks over text-like files.
text_ext={'.js','.mjs','.css','.html','.json','.md','.sql','.toml','.txt'}
for p in all_files(text_ext):
    try: s=p.read_text(errors='strict')
    except Exception: continue
    if re.search(r'^(<<<<<<<|=======|>>>>>>>)',s,re.M): errors.append('MERGE MARKER '+str(p.relative_to(ROOT)))
    if '/mnt/data/' in s or '/home/oai/' in s: errors.append('ABSOLUTE DEV PATH '+str(p.relative_to(ROOT)))
# Cache lineage guards.
if "fob-shell-v452" not in sw: errors.append('SW cache identity is not v451')
if 'const V = 452;' not in (ROOT/'netlify/functions/mygym.js').read_text(): errors.append('mygym asset stamp is not v451')
if 'v=452' not in (ROOT/'calendar.html').read_text(): errors.append('calendar asset stamp is not v451')
print(f'JS {len(js)} | HTML {len(html)} | CSS {len(css)} | JSON {len(jsons)}')
if errors:
    print('R85A RELEASE GATE FAIL')
    for e in errors: print(' - '+e)
    sys.exit(1)
print('R85A RELEASE GATE PASS')
