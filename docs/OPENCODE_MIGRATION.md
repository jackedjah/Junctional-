# MAHWORLD — OpenCode migration inventory (environment, tooling, integrations)

Written 2026-09-28 from inside the last Claude Code session (a claude.ai **cloud** session: an ephemeral Linux container, repo cloned fresh,
branch `backup/mahworld-m6-20260924T190351Z`). Secret VALUES are never recorded here — only variable NAMES.
Project rules and how to work: `../AGENTS.md` (and `../CLAUDE.md`, kept). Project-local OpenCode config: `../opencode.jsonc`.

## 1. MCP servers

None of these is defined in a file. There is no `.mcp.json` in the repo, `~/.claude.json` has `mcpServers: {}`, and the launcher settings define
no MCP. All of them were injected into the session by the **claude.ai account's connectors** through the cloud session host (remote, OAuth held by
claude.ai). They do not come with the repository; each must be re-added in OpenCode and authenticated by the owner.

| MCP (session name) | kind | purpose | MAHWORLD workflows that used it | OpenCode translation |
|---|---|---|---|---|
| `github` | remote (GitHub's MCP; claude.ai connector) | issues / PRs / files / CI on `jackedjah/Junctional-` | none essential: code went over plain `git push` (the container's git proxy). PR tooling was available, never needed | `opencode.jsonc` → `mcp.github` (remote `https://api.githubcopilot.com/mcp/`, bearer `{env:GITHUB_PERSONAL_ACCESS_TOKEN}`), **disabled by default** |
| `Scenario` | remote (`mcp.scenario.com`, OAuth) | AI generation of images / textures / 3D / skyboxes (PAID credits) | M8D rock-texture pilot only; owner law: **no paid generation without owner approval**. The `.claude/skills/scenario*` folders are its how-to guides | `mcp.scenario` (remote, OAuth), **disabled** — enable only with owner approval |
| `Supabase` | remote (`mcp.supabase.com`, OAuth) | database / edge functions | not MAHWORLD — it serves the separate MAHFITT / FOB site at the repo root (owner law: do not touch MAHFITT) | `mcp.supabase` (remote, OAuth), **disabled** |
| `Netlify` | remote connector, **never authenticated** in this session | deploys | not used by agents. Earlier protected previews were deployed as unpublished Netlify drafts by scripts / the owner (`NETLIFY_AUTH_TOKEN` or `netlify login`). Owner law: no production deploy | `mcp.netlify` (local process `npx -y @netlify/mcp`, `{env:NETLIFY_AUTH_TOKEN}`), **disabled** |
| `Google_Drive` | remote (claude.ai connector) | Drive files | not used | not configured (add Google's own MCP if ever needed) |
| `Stripe` | remote connector, needs auth (cache entry only) | payments | not used | not configured |
| `Claude_Docs` | claude.ai first-party | living docs on claude.ai | not used by the project | **no OpenCode equivalent** (claude.ai only) |
| `Claude_Code_Remote` | claude.ai session infrastructure | session management, scheduled check-ins (`send_later`), repo attach, PR-activity subscriptions | used for session plumbing only (no project dependency) | **no equivalent** — use OpenCode sessions / your own scheduler |

Also injected by the session host and **not portable**: an environment-manager MCP helper (`~/.claude/environment-manager/codesign-mcp-config.json`,
local port + bearer, session-internal), the Artifact / Workflow / Agent / Monitor / Task* tools (see §7).

## 2. Runtimes, packages, browsers, tools (what the project actually needs)

| tool | version seen | used for | required? |
|---|---|---|---|
| Node.js | 22.22.x (`/opt/node22`) | runtime, lab host server, all tests, build / deploy scripts | **yes** (Node 22; the demo Dockerfile pins Node 22) |
| npm / npx | bundled | `npm test` in `CLAUDE_GAMEPLAY_RUNTIME`; `npx netlify-cli` for manual deploys | yes |
| three.js | r185 (`three@0.185.1`), **vendored** in `26_LOCAL_AUTHORITY/vendor/three` | client renderer | vendored — do not upgrade blindly |
| Playwright (Node, **global** install) | 1.56.1 at `$(npm root -g)/playwright` | headless world renders: `deploy/world_preview/capture.mjs`, `inspect.mjs`, `25_HANDOFF/tools/tune_variants.mjs`, many `deploy/probe_*.mjs` | yes for visual work (`npm i -g playwright@1.56.1`; do not bump blindly) |
| Chromium | 141.0.7390.37 at `/opt/pw-browsers/chromium` (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) | software-GL rendering (`--use-angle=swiftshader`) | yes. Scripts default to `/opt/pw-browsers/chromium`; override with `PLAYWRIGHT_CHROMIUM` (capture) / `MAHWORLD_CHROME` / `CHROME` (probes) |
| Python 3 + Pillow | 3.11 + Pillow 12.3 | contact sheets / evidence (`25_HANDOFF/tools/sheet2.py`, `deploy/world_preview/five_colour_audit.py`) | yes for evidence |
| git | 2.43 | everything | yes |
| ripgrep, jq | installed | search; `jq` is used by the Claude stop hook only | convenient |
| Docker | installed, unused | `26_LOCAL_AUTHORITY/deploy/Dockerfile` (hosted demo backend image) | only for the hosted-demo route |
| netlify-cli | via `npx netlify-cli` (not installed globally) | manual preview deploys, `deploy/purge_open_deploys.mjs`, `deploy/fob_add_mahdemo_route.mjs` | only for deploys (owner-gated) |
| Blender | **not installed** | Character-lane only (not this lane) | no |
| global npm extras seen | eslint, prettier, http-server, nodemon, pnpm, chromedriver | not required by the project | no |

Headless GL note: renders use SwiftShader software GL (~30–90 s per 960×540 frame, 4 CPUs → at most ~3 render processes at once). Frame
times are not performance evidence.

## 3. Environment variable NAMES (values never committed)

Project code / scripts:
- `MAHWORLD_DEMO_PASSWORD` — hosted demo password gate (`lab_host_server.mjs --demo`). Secret.
- `DEMO_SECURE`, `DEMO_PUBLIC_ORIGIN` — demo cookie Secure flag / allowed Origin (non-secret).
- `MAHWORLD_THREE_DIR` — three.js location inside the demo container (set by the Dockerfile).
- `MAHWORLD_RELEASE_COMMIT` — stamp for release builds (non-secret).
- `NETLIFY_AUTH_TOKEN` — Netlify API token for deploy hygiene / route scripts (or `netlify login` config). Secret.
- `MAHDEMO_PW` — the protected-preview password used by owner-side hosted checks (never available to agents). Secret.
- `PLAYWRIGHT_CHROMIUM`, `MAHWORLD_CHROME`, `CHROME`, `PLAYWRIGHT_BROWSERS_PATH` — browser paths.
- `WPDIR` (tune harness), `TEST_LOG_DIR` (test runner), `EVIDENCE_OUT` (final render script) — tool options.
- Debug switches (optional): `MW_DEBUG`, `MW_TRACE_LOG`, `MW_TRACE_ROOT`, `MW_TRACE_HOOKS`, `MW_TRACE_SHADOW`, `F01_DEBUG`, `JOBB_DEBUG`,
  `IKDBG`, `ROUTE_VSYNC`, `ROUTE_MOBILE`, `ROUTE_DPR`, `DUMP`.
- Root MAHFITT site (not MAHWORLD; do not touch): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (secret).

For the OpenCode MCP definitions (only if you enable them): `GITHUB_PERSONAL_ACCESS_TOKEN`, `NETLIFY_AUTH_TOKEN`
(Scenario and Supabase use OAuth, no variable).

Container-only variables of the Claude cloud session (`CLAUDE_CODE_*`, `CCR_*`, `SESSION_INGRESS_URL`, proxy / CA-bundle variables, `GH_TOKEN`,
`GITHUB_TOKEN`, cloud credentials) belong to that infrastructure and are **not** needed by the project.

## 4. Authentication — manual steps for the owner after opening the project in OpenCode
1. **Git push access** to `jackedjah/Junctional-`: a GitHub credential on your machine (SSH key or a fine-grained PAT via your git credential
   helper). The Claude container used a git proxy that will not exist in OpenCode.
2. **Model provider** for OpenCode: `opencode auth login` (your own provider account / key).
3. Optional MCPs (all disabled in `opencode.jsonc`):
   - GitHub: export `GITHUB_PERSONAL_ACCESS_TOKEN`, set `mcp.github.enabled: true`.
   - Scenario (paid): set `mcp.scenario.enabled: true`, then `opencode mcp auth scenario` (browser OAuth). Owner approval required before any generation.
   - Supabase (MAHFITT site only): enable, then `opencode mcp auth supabase`.
   - Netlify (deploys; owner-gated): export `NETLIFY_AUTH_TOKEN`, enable `mcp.netlify`.
4. Hosted demo (only when the owner decides to deploy): set `MAHWORLD_DEMO_PASSWORD` on the backend host; never in files.

## 5. Claude-specific features with no direct OpenCode equivalent
- **Stop hook** `~/.claude/stop-hook-git-check.sh` (outside the repo): blocked ending a turn with uncommitted / unpushed work. OpenCode: follow the
  rule in AGENTS.md ("commit and push before ending a unit of work"); no hook is configured.
- Other session hooks (`~/.claude/stop-hook-reply-gate.py`, `user-prompt-submit-reply-reminder.py`) and the "auto mode" permission classifier:
  cloud-session infrastructure; not needed.
- **Workflow tool / worktree agents**: the M20 waves ran as scripted multi-agent pipelines (worktree agent → adversarial reviewer → fixer →
  re-verifier; the lead cherry-picked only what passed). In OpenCode, reproduce with subagents or separate sessions working in `git worktree`s,
  one owner of each file set; the rules they were given are in `CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/CONVERGENCE/world_pivot/M20_AGENT_BRIEF.md`.
- **Artifacts** (claude.ai pages), `SendUserFile`, `send_later` scheduled check-ins, PR-activity subscriptions: claude.ai only.
- **Skills**: `.claude/skills/scenario*` (in the repo) are Markdown how-to guides for the Scenario MCP; any agent can read them. Claude-only
  built-in skills (artifact design, workflow authoring, etc.) are not part of the project.
- Model-specific session settings (effort level, auto-compaction) have no project meaning.

## 6. Configuration outside the repo that another agent needs (now reproduced in the repo)
- Full-suite runner + the 34 bridge-blocked test files: `CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/tools/run_all_tests.mjs`,
  `known_bridge_blocked_failures.txt` (were only in session scratch).
- Evidence cameras + whole-world render script: `25_HANDOFF/tools/cams.sh`, `final_render.sh` (were scratch).
- In-page tuning harness + contact sheets: `25_HANDOFF/tools/tune_variants.mjs`, `sheet2.py`.
- Permissions: the launcher only pre-allowed `Skill`; nothing project-specific. `opencode.jsonc` sets conservative permissions (ask before
  `git push`, force pushes and deletes).
- No shell aliases, no custom npm scripts beyond `CLAUDE_GAMEPLAY_RUNTIME/package.json` (`npm test`, `npm run simulate`).

## 7. Resources outside the repository that the project references
- **Three sibling roots** the runtime imports but the branch omits: `CLAUDE_RUNTIME_FOUNDATION/`, `CLAUDE_DUAL_LOCOMOTION/`,
  `CLAUDE_GAMEPLAY_FOUNDATION/` (owner's local archive). Without them 34 test files cannot run and the static build / release gate cannot run.
  This is the deferred "runtime bridge"; do not ask for it until the owner says they are back at the PC.
- The owner's local `MAHWORLD_CHARACTERS` folder — preserved archive; never replace, delete, clean or sync it.
- Character-lane raw model `RAW_10_MODELS/Mah_Athlete_M.glb` (needed only by `gameplay_legs_faithful`; intentionally not backed up).
- Netlify site `968f80e5-889b-43a8-b2cd-5860c588546a` (protected preview drafts; owner-controlled) and the fob.systems site source (not in this repo).
- Session-scratch renders (the c51ac67 baseline frames, per-wave renders) lived in `/tmp` of the cloud container and are gone with it. The frames
  that matter are committed as `CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/CONVERGENCE/world_pivot/evidence/m20_*.jpg`; baselines can be re-rendered
  from any commit with `git worktree add <dir> <commit>` + `final_render.sh`.

## 8. Knowledge that lived only in the session (now written down)
- The M20 per-wave working log (decisions, rejections, numbers): `world_pivot/M20_SESSION_LOG.md` (new copy of the session's ledger notes).
- M21 state at the freeze: `world_pivot/m21_wip/M21_STATUS.md` + the unverified cloud patch.
- Practical lessons (also in AGENTS.md): the Edit tool of some agents rewrites a whole file's line endings — edit mixed CRLF/LF files by raw bytes;
  `WP.time()` in the preview re-runs day/night handlers, so tune variants must be applied after it; a material's `userData.dayNight` handler can
  silently override build-time values (the HALO soffit case); `Material.clone()` JSON-copies `userData` (a `Color` becomes a number → NaN);
  measure a region's value when a change is not obvious at sheet scale; lowering the cloud field blur brings back checker stipple.
