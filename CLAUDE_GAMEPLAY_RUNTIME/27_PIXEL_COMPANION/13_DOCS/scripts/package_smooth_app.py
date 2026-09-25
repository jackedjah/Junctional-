"""Incremental package over the preserved final-polish source branch."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '14_RELEASE/SMOOTH_APP'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = [ROOT / name for name in [
        '13_DOCS/SMOOTH_APP_HANDOFF.md',
        '13_DOCS/scripts/common_set_pixels.py',
        '13_DOCS/scripts/common_pixel_author.py',
        '13_DOCS/scripts/test_smooth_runtime.mjs',
        '13_DOCS/scripts/package_smooth_app.py']]
    for folder in ['05_PIXEL_MASTERS', '07_ANIMATION_SOURCE', '08_SPRITE_FRAMES',
                   '09_ATLASES', '10_MANIFEST', '11_PROTOTYPE', '12_REVIEW_PROOFS']:
        files.extend(p for p in (ROOT / folder / 'SMOOTH_APP').rglob('*') if p.is_file())
    files = sorted(set(files))
    records = []
    for path in files:
        with path.open('rb') as stream:
            sha = hashlib.file_digest(stream, 'sha256').hexdigest()
        records.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha})
    report = {'release': 'SMOOTH_APP', 'productionModified': False,
              'sourcePreservationParent': '033a49517cf7003e363e396ba9b3ce53d36d0743',
              'files': records, 'totalBytes': sum(r['bytes'] for r in records)}
    (OUT / 'PACKAGE_MANIFEST.json').write_text(json.dumps(report, indent=2))
    runtime = [p for p in files if p.relative_to(ROOT).parts[0] in ['09_ATLASES', '10_MANIFEST', '11_PROTOTYPE']]
    runtime.append(ROOT / '13_DOCS/SMOOTH_APP_HANDOFF.md')
    with zipfile.ZipFile(OUT / 'MAHFITT_COMPANION_APP.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in runtime:
            archive.write(path, path.relative_to(ROOT).as_posix())
    staged = files + [OUT / 'PACKAGE_MANIFEST.json', OUT / 'MAHFITT_COMPANION_APP.zip']
    (OUT / 'GIT_PATHS.txt').write_text('\n'.join('CLAUDE_GAMEPLAY_RUNTIME/27_PIXEL_COMPANION/' + p.relative_to(ROOT).as_posix() for p in staged) + '\n')
    print(json.dumps({'files': len(files), 'totalMB': round(report['totalBytes'] / 1e6, 2),
                      'runtimeZipMB': round((OUT / 'MAHFITT_COMPANION_APP.zip').stat().st_size / 1e6, 2)}, indent=2))

if __name__ == '__main__':
    main()
