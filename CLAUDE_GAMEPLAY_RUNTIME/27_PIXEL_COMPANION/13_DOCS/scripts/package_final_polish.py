"""Package only the explicit companion release; no workspace/source discovery."""
from pathlib import Path
import hashlib,json,zipfile

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'14_RELEASE/FINAL_POLISH'

def selected_files():
    directories=[f'{folder}/FINAL_POLISH' for folder in [
        '05_PIXEL_MASTERS','07_ANIMATION_SOURCE','08_SPRITE_FRAMES',
        '09_ATLASES','10_MANIFEST','11_PROTOTYPE','12_REVIEW_PROOFS']]
    files=[ROOT/name for name in [
        '00_SOURCE_UNTOUCHED/MAH_FEMALE_SOURCE.glb',
        '00_SOURCE_UNTOUCHED/MAH_MALE_SOURCE.glb',
        '05_PIXEL_MASTERS/COMMON_FINAL/OWNER_PIXEL_REFERENCE.png',
        '12_REVIEW_PROOFS/ROOT_CORRECTION/FEMALE_NEUTRAL_APP.png',
        '12_REVIEW_PROOFS/ROOT_CORRECTION/MALE_NEUTRAL_APP.png',
        '11_PROTOTYPE/FINAL_APPROVED/index.html',
        '11_PROTOTYPE/FINAL_APPROVED/styles.css',
        '11_PROTOTYPE/FINAL_APPROVED/runtime.js',
        '13_DOCS/FINAL_POLISH_HANDOFF.md',
        '13_DOCS/final-polish-requirements.txt',
        '13_DOCS/scripts/blender_pipeline.py',
        '13_DOCS/scripts/common_set_render.py',
        '13_DOCS/scripts/common_pixel_author.py',
        '13_DOCS/scripts/common_set_pixels.py',
        '13_DOCS/scripts/final_production_pipeline.py',
        '13_DOCS/scripts/root_correction_pixels.py',
        '13_DOCS/scripts/package_final_polish.py']]
    for folder in directories:
        files.extend(p for p in (ROOT/folder).rglob('*') if p.is_file())
    return sorted(set(files))

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    files=selected_files(); records=[]
    for path in files:
        assert path.is_file(),path
        assert path.stat().st_size<100*1024*1024,path
        records.append({'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,
                        'sha256':hashlib.file_digest(path.open('rb'),'sha256').hexdigest()})
    report={'release':'FINAL_POLISH','productionModified':False,'files':records,
            'totalBytes':sum(r['bytes'] for r in records)}
    (OUT/'PACKAGE_MANIFEST.json').write_text(json.dumps(report,indent=2))
    # A small app-ready ZIP excludes authoring GLBs; full source preservation is
    # the branch plus local source files described by the checksum manifest.
    runtime=[p for p in files if p.relative_to(ROOT).parts[0] in ['09_ATLASES','10_MANIFEST','11_PROTOTYPE']
             and 'FINAL_POLISH' in p.parts]
    runtime.append(ROOT/'13_DOCS/FINAL_POLISH_HANDOFF.md')
    with zipfile.ZipFile(OUT/'MAHFITT_COMPANION_INTEGRATION.zip','w',zipfile.ZIP_DEFLATED) as z:
        for path in runtime: z.write(path,path.relative_to(ROOT).as_posix())
    staged=files+[OUT/'PACKAGE_MANIFEST.json',OUT/'MAHFITT_COMPANION_INTEGRATION.zip']
    # Paths are relative to the existing git root, not the user index/worktree.
    (OUT/'GIT_PATHS.txt').write_text('\n'.join('CLAUDE_GAMEPLAY_RUNTIME/27_PIXEL_COMPANION/'+p.relative_to(ROOT).as_posix() for p in staged)+'\n')
    print(json.dumps({'files':len(files),'totalMB':round(report['totalBytes']/1e6,2),
                      'runtimeZipMB':round((OUT/'MAHFITT_COMPANION_INTEGRATION.zip').stat().st_size/1e6,2)},indent=2))

if __name__=='__main__': main()
