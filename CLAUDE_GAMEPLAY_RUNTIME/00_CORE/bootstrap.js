/* MAHWORLD GAMEPLAY RUNTIME :: HEADLESS BOOTSTRAP (node)
   Loads the runtime foundation (registry, class identity, mahloco JS port + its canonical config) and the gameplay data from disk,
   then composes the world through 00_CORE/compose.js (shared with the browser sandbox). Nothing here duplicates wiring or numbers.
   Phase 5A seam: loadHeadlessData() once + composeHeadless(data, opts) per player, so a local authority can host several
   independent fighter worlds from one data load. bootstrapHeadless(opts) = both steps (unchanged behaviour). */
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL, fileURLToPath } from 'node:url';
import { loadGameplayConfigSync, foundationPaths } from './config.node.js';
import { composeGameplay } from './compose.js';

export async function loadHeadlessData() {
  var P = foundationPaths(path); var RF = P.runtimeFoundation;
  var J = await import(pathToFileURL(path.join(RF, '10_RUNTIME_LOADER/jsonSource.js')).href); var I = await import(pathToFileURL(path.join(RF, '10_RUNTIME_LOADER/ClassIdentityConfig.js')).href);
  var R = await import(pathToFileURL(path.join(RF, '10_RUNTIME_LOADER/characterRegistry.js')).href); var A = await import(pathToFileURL(path.join(RF, '12_ANIMATION_RUNTIME/AnimationStateController.js')).href);
  var src = J.createFsJsonSource(RF, fs, path); var identity = await I.createClassIdentityConfig(src); var registry = await R.createCharacterRegistry(src, identity);
  var mahlocoConfig = await src.read('runtimeConfig'); var animationSet = await src.read('animationSet');
  var cfg = loadGameplayConfigSync(fs, path); var root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  var attacksData = JSON.parse(fs.readFileSync(path.join(root, '04_COMBAT/data/attacks.dev.json'), 'utf8')); var loadouts = JSON.parse(fs.readFileSync(path.join(root, '04_COMBAT/data/class_loadouts.dev.json'), 'utf8'));
  return { paths: P, cfg: cfg, identity: identity, registry: registry, mahlocoConfig: mahlocoConfig, animationSet: animationSet, attacksData: attacksData, loadouts: loadouts, createController: A.createAnimationStateController };
}
export function composeHeadless(data, opts) {
  var o = opts || {}; var selection = { schema_version: '0.2.0', class: o.classId || 'ATHLETE', sex: o.sex || 'F', skin_color: 'SKIN_DEFAULT', face_type: 'FACE_DEFAULT', hair_style: 'HAIR_NONE', hair_color: null, eye_style: null, locomotion_default: 'FUSED' };
  var entry = data.registry.resolve(selection.class, selection.sex);
  var world = composeGameplay({ cfg: data.cfg, bus: o.bus, selection: selection, registryEntry: entry, identity: data.identity, registry: data.registry, loadouts: data.loadouts, attacksData: data.attacksData, mahlocoConfig: data.mahlocoConfig, animationSet: data.animationSet, createController: data.createController });
  world.paths = data.paths; return world;
}
export async function bootstrapHeadless(opts) { var data = await loadHeadlessData(); return composeHeadless(data, opts); }
