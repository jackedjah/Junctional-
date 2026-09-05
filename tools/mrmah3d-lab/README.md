# mrmah3d lab tools (development only)

These are the capture / measurement scripts the R106–R109 passes were run with. They lived in a
session scratchpad until the R109 handoff; they are copied here unchanged so the next operator has
them. They are NOT part of the product and nothing in `mrmah3d/` imports them.

All of them drive headless Chromium through Playwright and import it from the absolute path
`/opt/node22/lib/node_modules/playwright/index.mjs` — that is the Linux container's install. On
another machine edit that import to your own Playwright install (`import { chromium } from
'playwright'` after `npm i -D playwright` works), and make sure Chromium is available to it. They
render at `?tier=high` with software GL (`--use-gl=swiftshader`); a GPU machine renders the same
frames faster.

Every script takes the lab's base URL as its first argument — a static server rooted at the
REPOSITORY ROOT, e.g. `python3 -m http.server 8123 --bind 127.0.0.1` (Linux/macOS) or
`python -m http.server 8123 --bind 127.0.0.1` (Windows). The lab page is
`/mrmah3d/lab/index.html`.

| script | what it does |
| --- | --- |
| `view.mjs <base> <out.png> canonical=1 [debug=mass\|clay\|groups\|gray] [yaw=rad] [variant=female] [w= h= dsf= clip=x0,y0,x1,y1] [bright=r,g,b]` | one capture of the lab page; `canonical=1` is the reference framing; `clip` crops at 2x for close-ups |
| `proofset-r109.sh <base> <outdir>` | the R109 proof set: silhouette / clay / faceted grayscale / final for both characters plus detail crops |
| `proofset-r108.sh <base> <outdir>` | the R108 proof set (clay + final + cA..cL close-ups) |
| `bodymask.mjs <base> <prefix> views=front:0,rear:3.1416 [variant=female]` | character-only masks (world hidden, low tier) |
| `bodymask-noarms.mjs …` | the same with the limbs hidden — REQUIRED for Mrs. Mah's hip ratio (the forearm beside the hip inflates it) |
| `refwidth.mjs <base> <mask-relative-to-repo-root> mode=mask step=0.02 label=x` | width profile per t and the landmarks (shoulder run, waist, hip, knee, calf); its "knee" landmark is unreliable — read the profile |
| `ratios.sh <base> <repo-root> <prefix>` | bodymask + refwidth for both characters in one go |
| `grid.mjs <in.png> <out.png> [x0 y0 x1 y1 scale]` | labelled 5% grid overlay for reading landmarks by eye — use it on references AND renders |
| `valhist.mjs <base> <x0,x1,y0,y1> <image…>` | eight luma bands plus black / platinum / ENERGY-cyan / mid shares over a box (paths under the repo root are served; absolute paths are read directly) |
| `bandhist.mjs` | the older eight-band luma histogram |
| `isolate.mjs <base> <out.png> tweaks=norim,noinner,nolines,nolights,nocoat,noenv,nokey` | the canonical front with one light transport switched off — attribute a value before tuning it |
| `nanprobe.mjs <base>` | NaN / degenerate-geometry probe on both variants (run after any geometry edit) |
| `shapeprobe2.mjs male\|female <y>` (`MRMAH_ROOT=<repo>`) | prints a ring's x/z per vertex — probe the ring before arguing about the light |
| `lowerprofile.mjs male 1.7` (`MRMAH_ROOT=<repo>`) | no-browser profiler of the lower-body ring table |
| `armwidth.mjs` | arm belly / elbow / forearm widths on a crop |
| `cropimg.mjs`, `sheet.mjs` | crop an image; tile several captures into one comparison sheet |

The canonical framing is the only view to compare against the reference images. Measure the body
with masks and body-only boxes (see CLAUDE.md, "The chest box measures the emblem").
