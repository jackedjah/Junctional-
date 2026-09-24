/* Demo site hygiene — every deploy keeps a permalink (<id>--mahworld-test-preview.netlify.app); a deploy made BEFORE the gate existed would
   still serve the game openly there. With Netlify credentials this lists the demo site's deploys, probes each permalink for a private asset
   and DELETES the ones that answer 200 (open). Gated deploys (401/503) are kept; the published deploy is never touched.
   Needs NETLIFY_AUTH_TOKEN (or `npx netlify-cli login`). node deploy/purge_open_deploys.mjs [--dry] */
import fs from 'node:fs'; import path from 'node:path';
var SITE = '968f80e5-889b-43a8-b2cd-5860c588546a', API = 'https://api.netlify.com/api/v1', ASSET = '/claude_gameplay_runtime/26_local_authority/lab/play.js';
var DRY = process.argv.indexOf('--dry') >= 0;
function token() { if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN; try { var cfg = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA || '', 'netlify', 'Config', 'config.json'), 'utf8')); var u = cfg.users && cfg.users[cfg.userId]; return u && u.auth && u.auth.token || null; } catch (e) { return null; } }
var TOKEN = token(); if (!TOKEN) { console.error('no Netlify credentials: set NETLIFY_AUTH_TOKEN or run `npx netlify-cli login`, then rerun'); process.exit(2); }
async function api(method, p) { var r = await fetch(API + p, { method: method, headers: { Authorization: 'Bearer ' + TOKEN } }); if (!r.ok) throw new Error(method + ' ' + p + ' -> ' + r.status); return r.status === 204 ? null : r.json(); }
var site = await api('GET', '/sites/' + SITE); var published = site.published_deploy && site.published_deploy.id; var deploys = await api('GET', '/sites/' + SITE + '/deploys?per_page=100');
console.log(site.name, '· published', published, '·', deploys.length, 'deploys');
var open = 0, kept = 0, removed = 0;
for (var d of deploys) {
  if (!d.id || d.state !== 'ready') continue; var url = 'https://' + d.id + '--' + site.name + '.netlify.app' + ASSET; var st = 0;
  try { st = (await fetch(url, { headers: { accept: '*/*' }, redirect: 'manual' })).status; } catch (e) { st = -1; }
  var isOpen = st === 200; if (isOpen) open++;
  if (isOpen && d.id !== published) { if (DRY) console.log('OPEN (would delete)', d.id, d.created_at); else { await api('DELETE', '/deploys/' + d.id); removed++; console.log('deleted open deploy', d.id, d.created_at); } }
  else { kept++; console.log(isOpen ? 'OPEN but PUBLISHED — the live site is not gated, redeploy the gated build NOW' : 'ok ' + st, d.id, d.created_at); }
}
console.log('open', open, '· removed', removed, '· kept', kept);
