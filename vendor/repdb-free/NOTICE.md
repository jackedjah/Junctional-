# RepDB Free Tier — MAHFITT integration notice

Source: RepDB exercise-dataset free tier (`https://github.com/RepDB/exercise-dataset`)
Snapshot used for the resolver: 2026-08, 250 public exercise IDs.

MAHFITT v403 intentionally stores only the resolver/mapping IDs locally. Production flat exercise illustrations are requested from the official `https://exercise-dataset.com/images/flat/` host and are cached only after first use by the MAHFITT service worker. The full RepDB JSON/data bundle is not exposed or republished as a MAHFITT API.

Required public attribution is available at `/credits.html` as **Exercise data by RepDB** linking to `https://repdb.co/`.

Boundaries:
- No files from RepDB `premium-samples/` are included or used in production.
- No paid preview animations are included.
- No generative-AI derivation or training use is performed.
- MAHFITT keeps its own exercise names, programming, coaching metadata, member data, and FOB-original movements.
- Mapping is conservative: an unmatched or materially different movement gets no RepDB visual rather than a misleading substitute.

See `LICENSE-DATA.md` in this folder for the source license text retained with this integration.
