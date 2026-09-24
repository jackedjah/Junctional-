/* MAHWORLD GAMEPLAY RUNTIME :: COMPOSE (environment-neutral)
   Builds the gameplay world from already-loaded data + an injected mahloco controller factory. Used by the node bootstrap
   (00_CORE/bootstrap.js) and by the browser sandbox (CLAUDE_GAMEPLAY_SANDBOX) so neither copies gameplay wiring. No node imports.

       var world = composeGameplay({ cfg, bus?, selection, registryEntry, identity, loadouts, attacksData, mahlocoConfig, animationSet, createController }) */
import { createEventLog } from './events.js';
import { createPolicyRegistry } from './policies.js';
import { assembleGameplayProfile } from '../01_PROFILE/GameplayProfile.js';
import { createMovementCapabilities } from '../02_MOVEMENT/MovementCapabilities.js';
import { createFlightSession } from '../02_MOVEMENT/FlightSession.js';
import { createMahlocoAdapter } from '../02_MOVEMENT/MahlocoAdapter.js';
import { createResource } from '../03_RESOURCES/Resource.js';
import { createAttackRegistry, createCombatKit } from '../04_COMBAT/AttackModel.js';
import { createInputActions, PLACEHOLDER_BINDINGS } from '../06_INPUT/InputActions.js';
import { CALL_NEXT_POLICIES } from '../08_SPECTATOR/SpectatorSystem.js';
import { RAID_SCALING_POLICIES } from '../10_RAIDS/RaidParty.js';
import { createProgression, createBuffSystem } from '../12_PROGRESSION/Progression.js';
import { createIdleFlourishScheduler, createEmoteRegistry } from '../13_EMOTES/IdleAndEmotes.js';
import { createTelemetry } from '../14_TELEMETRY/Telemetry.js';

export function composeGameplay(d) {
  var cfg = d.cfg; var bus = d.bus || createEventLog(); var policies = createPolicyRegistry(cfg);
  var selection = d.selection; var entry = d.registryEntry; var profile = assembleGameplayProfile(cfg, { selection: selection, registryEntry: entry, loadouts: d.loadouts, identity: d.identity });
  var capabilities = createMovementCapabilities(cfg); var resource = createResource(cfg, bus, {});
  /* mahloco (approved JS port of rev 2) with its own canonical config; its MAHGIC guard reads the gameplay resource */
  var controller = d.createController({ config: d.mahlocoConfig, animationSet: d.animationSet, baseModel: entry.id, rigBound: true, world: { mahgic: function () { return resource.state().current; }, spendMahgic: function (a) { resource.spend(a, 'TRANSFORM'); }, refundMahgic: function (a) { resource.refund(a); } }, listener: function (e) { bus.emit('MAHLOCO_' + e.name, e.payload); } });
  var loco = createMahlocoAdapter({ controller: controller, capabilities: capabilities, bus: bus });
  var flight = createFlightSession(cfg, bus, { resource: resource, capabilities: capabilities });
  var attacks = createAttackRegistry(cfg, d.attacksData); var kit = createCombatKit(cfg, { attacks: attacks, loadouts: d.loadouts, classId: profile.class_id, capabilities: capabilities, bus: bus });
  var input = createInputActions(bus); Object.keys(PLACEHOLDER_BINDINGS).forEach(function (dev) { input.bindDevice(dev, PLACEHOLDER_BINDINGS[dev]); });
  var progression = createProgression(cfg, bus); var buffs = createBuffSystem(cfg, bus); var flourish = createIdleFlourishScheduler(cfg, bus, { classId: profile.class_id }); var emotes = createEmoteRegistry(bus); var telemetry = createTelemetry(bus, { locomotion: loco });
  Object.keys(CALL_NEXT_POLICIES).forEach(function (k) { policies.register('CALL_NEXT_POLICY', k, CALL_NEXT_POLICIES[k], 'OD-02'); }); Object.keys(RAID_SCALING_POLICIES).forEach(function (k) { policies.register('RAID_SCALING_POLICY', k, RAID_SCALING_POLICIES[k], 'OD-08'); }); policies.selectDefaults();
  return { cfg: cfg, bus: bus, policies: policies, identity: d.identity, registry: d.registry || null, entry: entry, selection: selection, profile: profile, capabilities: capabilities, resource: resource, controller: controller, loco: loco, flight: flight, attacks: attacks, loadouts: d.loadouts, kit: kit, input: input, progression: progression, buffs: buffs, flourish: flourish, emotes: emotes, telemetry: telemetry,
    tick: function (dt, sample) { bus.setTime(bus.time() + dt); loco.tick(dt); resource.tick(dt); flight.tick(dt); kit.tick(dt); buffs.tick(dt); emotes.tick(dt); telemetry.tick(dt, sample); } };
}
