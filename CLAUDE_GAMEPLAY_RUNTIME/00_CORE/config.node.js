/* MAHWORLD GAMEPLAY RUNTIME :: CONFIG (node loader) — the only node-specific config code; config.js stays browser-safe. */
import { fileURLToPath } from 'node:url';
import { createGameplayConfig, CANON_DEFAULTS_REL } from './config.js';
export function loadGameplayConfigSync(fs, path) {
  var here = path.dirname(fileURLToPath(import.meta.url)); var root = path.resolve(here, '..');
  var defaults = JSON.parse(fs.readFileSync(path.resolve(root, CANON_DEFAULTS_REL), 'utf8')); var dev = JSON.parse(fs.readFileSync(path.join(here, 'dev_tuning.dev.json'), 'utf8'));
  return createGameplayConfig(defaults, dev);
}
export function foundationPaths(path) { var here = path.dirname(fileURLToPath(import.meta.url)); var root = path.resolve(here, '..', '..'); return { root: root, runtimeFoundation: path.join(root, 'CLAUDE_RUNTIME_FOUNDATION'), gameplayFoundation: path.join(root, 'CLAUDE_GAMEPLAY_FOUNDATION'), dualLocomotion: path.join(root, 'CLAUDE_DUAL_LOCOMOTION') }; }
