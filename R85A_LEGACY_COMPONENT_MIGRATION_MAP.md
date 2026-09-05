# R85A Legacy Component Migration Map

| Legacy Coach/Admin owner | R85A disposition | Canonical replacement |
|---|---|---|
| `Backend Player` modal | REMOVED from normal UX | Production MAH Player (`#musicStudio`) |
| Coach-only `new Audio()` engine | REMOVED | Existing single MAHFITT audio engine |
| `fob.coach.audio.v1` prefs | REMOVED | Signed-in account MAH Player state |
| `fob-coach-media-v1` IndexedDB | REMOVED | Signed-in account private MAH Player library |
| Visible Backend Player file input | REMOVED | Canonical MAH Player upload/import UI; underlying file input is hidden |
| Visible Backend Player Volume/Speed ranges | REMOVED | Canonical styled MAH Player transport/rails |
| `SAVE COACH PLAYER` | REMOVED | Canonical Player persistence/actions |
| Backend `MAHFITT Theme` explanation modal | REMOVED | Production Theme Editor (`#mygymThemeEditor`) |
| `OPEN MAHFITT` Theme detour | REMOVED | THEME launches actual Theme Editor directly |
| Coach/Admin separate typography metrics | REPLACED | `mahfitt-canonical-components.css` + Space Grotesk semantic primitives |
| Legacy Admin action slabs | STANDARDIZED | `.mf-canon-button` / canonical primary hierarchy |
| Generic Admin scanner close/action geometry | STANDARDIZED | canonical 40px square close + shared button geometry |
| Short 188/74 Admin crown | REPLACED | measured canonical 281/172 crown geometry |
| Admin crown text bleed | REPLACED | structural crown occlusion + lower fade owner |
| Approximate phone crown anchors | REPLACED | measured Member Home anchors at 393px |
| Visible legacy/direct-fallback UI | ABSENT | canonical Coach/Admin destinations only |

Compatibility URLs may still exist internally where required by older business operations, but no normal R85A Player/Theme interaction routes through the removed legacy component implementations.
