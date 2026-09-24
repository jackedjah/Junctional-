"""Check the design packet's internal constraints; this is not a game-runtime test."""
from pathlib import Path
from math import isclose, isfinite
import json
import sys

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / 'MAHWORLD_RULES_17_23_STARTER.json'
cfg = json.loads(CONFIG_PATH.read_text())
profiles = cfg['class_profiles']
skills = cfg['skills']
checks = []


def check(name, condition):
    checks.append((name, bool(condition)))


def score(cid, category):
    return profiles[cid]['potency_index'][category]


def numeric_values(value):
    if isinstance(value, dict):
        for child in value.values():
            yield from numeric_values(child)
    elif isinstance(value, list):
        for child in value:
            yield from numeric_values(child)
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        yield value


def walk_dicts(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_dicts(child)


check('Exactly five canonical design classes', set(profiles) == {'ATHLETE','TITAN','BAGE','VISIONARY','LEAN'})
check('Three attack categories and two independent energy pools', cfg['attack_categories'] == ['PHYSICAL','PHYSICAL_MAGIC','SPECIAL_MAGIC'] and cfg['energy_pools'] == ['COMBAT','FLIGHT'])
check('No gender stat split or claimed shipping validation', cfg['authority']['gender_stat_differences'] is False and cfg['authority']['shipping_balance_validated'] is False)
check('All numeric parameters are finite and nonnegative', all(isfinite(x) and x >= 0 for x in numeric_values(cfg)))
for category, leader in [('PHYSICAL','ATHLETE'), ('PHYSICAL_MAGIC','TITAN'), ('SPECIAL_MAGIC','BAGE')]:
    check(f'{leader} uniquely leads {category}', all(score(leader, category) > score(cid, category) for cid in profiles if cid != leader))
check('BAGE direct physical power is 30–40% of both Athlete and Titan', all(.30 <= score('BAGE','PHYSICAL') / score(cid,'PHYSICAL') <= .40 for cid in ['ATHLETE','TITAN']))
check('BAGE physical attack is below its physical magic', score('BAGE','PHYSICAL') < score('BAGE','PHYSICAL_MAGIC'))
check('Visionary is 60–70% of Athlete in each stated strike category', all(.60 <= score('VISIONARY',cat)/score('ATHLETE',cat) <= .70 for cat in ['PHYSICAL','PHYSICAL_MAGIC']))
check('Visionary matching-category ratios agree', isclose(score('VISIONARY','PHYSICAL')/score('ATHLETE','PHYSICAL'), score('VISIONARY','PHYSICAL_MAGIC')/score('ATHLETE','PHYSICAL_MAGIC')))
check('Lean physical matches the 50–60% Athlete range', .50 <= score('LEAN','PHYSICAL')/score('ATHLETE','PHYSICAL') <= .60)
check('Lean magic matches 75–85% of the recorded Athlete reference', all(.75 <= score('LEAN',cat)/score('ATHLETE',cat) <= .85 for cat in ['PHYSICAL_MAGIC','SPECIAL_MAGIC']))
check('Resistance values cannot divide by zero or heal damage', all(0 <= p[k] < 1 for p in profiles.values() for k in ['physical_damage_reduction','magical_damage_reduction']))
for key in ['physical_damage_reduction','magical_damage_reduction']:
    bage_ehp = profiles['BAGE']['max_health']/(1-profiles['BAGE'][key])
    check(f'BAGE greatest baseline effective HP for {key}', all(bage_ehp > p['max_health']/(1-p[key]) for cid,p in profiles.items() if cid != 'BAGE'))
check('Titan strongest physical armor', all(profiles['TITAN']['physical_damage_reduction'] > p['physical_damage_reduction'] for cid,p in profiles.items() if cid != 'TITAN'))
check('Lean fastest travel and Titan slowest', all(profiles['LEAN']['movement_speed_multiplier'] > p['movement_speed_multiplier'] > profiles['TITAN']['movement_speed_multiplier'] for cid,p in profiles.items() if cid not in ['LEAN','TITAN']))
check('Lean shortest comparable startup and recovery', all(profiles['LEAN'][key] < p[key] for cid,p in profiles.items() if cid != 'LEAN' for key in ['startup_duration_multiplier','recovery_duration_multiplier']))
dash_speed = {cid:p['combat_dash']['distance_multiplier']/p['combat_dash']['duration_seconds'] for cid,p in profiles.items()}
check('Lean fastest dash and Titan slowest dash', max(dash_speed,key=dash_speed.get) == 'LEAN' and min(dash_speed,key=dash_speed.get) == 'TITAN')
check('Titan uniquely leads explosive-force intent', all(profiles['TITAN']['design_ratings_not_automatic_damage_multipliers']['explosive_force'] > p['design_ratings_not_automatic_damage_multipliers']['explosive_force'] for cid,p in profiles.items() if cid != 'TITAN'))
check('Visionary comparable periodic output exceeds BAGE', score('VISIONARY','SPECIAL_MAGIC') * profiles['VISIONARY']['periodic_damage_multiplier'] > score('BAGE','SPECIAL_MAGIC') * profiles['BAGE']['periodic_damage_multiplier'])
check('Damage component weights sum to one', all(isclose(sum(weights.values()),1) for weights in cfg['damage']['default_component_weights'].values()))
weights = cfg['damage']['default_component_weights']['PHYSICAL_MAGIC']
def guarded_raw(guard_name):
    guard = cfg['guard'][guard_name]
    return 100 * sum(weights[channel]*(1-guard[channel+'_reduction']) for channel in ['physical','magical'])
check('Mixed-guard worked examples evaluate to 46 / 64 before armor', isclose(guarded_raw('PHYSICAL'),46) and isclose(guarded_raw('MAGICAL'),64))
check('Resource routing has no third energy pool', cfg['resources']['PHYSICAL_cost_pool'] is None and all(cfg['resources'][key] == 'COMBAT' for key in ['PHYSICAL_MAGIC_cost_pool','SPECIAL_MAGIC_cost_pool','dash_cost_pool']) and cfg['resources']['flight_cost_pool'] == 'FLIGHT')
check('Slot counts do not combine patterns and magic shortcuts', cfg['input']['initial_movement_pattern_slots'] == 4 and cfg['input']['movement_pattern_slots_shared_between_PHYSICAL_and_PHYSICAL_MAGIC'] and cfg['input']['magic_quick_slots_are_not_extra_movement_pattern_slots'])
check('Skill IDs are unique', len({s['id'] for s in skills}) == len(skills))
check('Skill categories and class references resolve', all(s['category'] in cfg['attack_categories'] and s['classes'] and set(s['classes']) <= set(profiles) for s in skills))
check('Every class has all three selectable categories', all(set(s['category'] for s in skills if cid in s['classes']) == set(cfg['attack_categories']) for cid in profiles))
check('Pure skills cost zero magic; magic costs fit every eligible class pool', all((s['combat_energy_cost'] == 0 if s['category']=='PHYSICAL' else 0 < s['combat_energy_cost'] <= min(profiles[cid]['combat_energy_capacity'] for cid in s['classes'])) for s in skills))
check('All supplied startup budgets respect the three-second scaled limit', all(cfg['timing_and_effects']['startup_floor_seconds'] <= s['base_startup_seconds']*profiles[cid]['startup_duration_multiplier'] <= cfg['timing_and_effects']['startup_cap_seconds'] for s in skills for cid in s['classes']))
check('Nonzero recoveries stay above the scaled floor', all(s['base_recovery_seconds'] == 0 or s['base_recovery_seconds']*profiles[cid]['recovery_duration_multiplier'] >= cfg['timing_and_effects']['recovery_floor_seconds'] for s in skills for cid in s['classes']))
shares = {}
for cid in profiles:
    strikes = [s for s in skills if cid in s['classes'] and s.get('strike_family')]
    shares[cid] = sum(s['category']=='PHYSICAL_MAGIC' for s in strikes)/len(strikes)
check('Only Titan has a majority-infused strike catalog', shares['TITAN'] > .5 and all(share <= .5 for cid,share in shares.items() if cid != 'TITAN'))
by_id = {s['id']:s for s in skills}
loadouts = cfg['catalog_policy']['magic_quick_loadouts']
check('Default magic loadouts contain at most four unique eligible skills', all(len(ids)<=cfg['input']['special_magic_quick_slots_dev'] and len(ids)==len(set(ids)) and all(sid in by_id and by_id[sid]['category']=='SPECIAL_MAGIC' and cid in by_id[sid]['classes'] for sid in ids) for cid,ids in loadouts.items()))
check('Niche loadout is four valid BAGE skills', len(cfg['catalog_policy']['bage_niche_fixture'])==4 and all(sid in by_id and 'BAGE' in by_id[sid]['classes'] for sid in cfg['catalog_policy']['bage_niche_fixture']))
check('Visionary has no heal effects and its no-healing rule is explicit', cfg['status_rules']['visionary_healing_allowed'] is False and all(s['effect']['type']!='HEAL' for s in skills if 'VISIONARY' in s['classes']))
check('BAGE healing has self and ally targets', set(by_id['BAGE_MEND']['effect']['targets']) == {'SELF','ALLY'})
cap = cfg['catalog_policy']['bage_offensive_duration_trap_inventory']
check('BAGE duration/trap inventory remains within owner range', cap['owner_range'][0] <= cap['planned_total_dev'] <= cap['owner_range'][1] and cap['current_examples'] <= cap['planned_total_dev'])
periodics = [d for s in skills for d in walk_dicts(s['effect']) if 'raw_periodic_total' in d]
check('Periodic schedules have a finite whole tick count, no immediate extra tick', all(d['tick_interval_seconds']>0 and d['duration_seconds']>0 and isclose(d['duration_seconds']/d['tick_interval_seconds'],round(d['duration_seconds']/d['tick_interval_seconds'])) and d['first_tick_after_seconds']==d['tick_interval_seconds'] for d in periodics))
check('Periodic total divided among ticks reconstructs its budget', all(isclose((d['raw_periodic_total']/(d['duration_seconds']/d['tick_interval_seconds']))*(d['duration_seconds']/d['tick_interval_seconds']),d['raw_periodic_total']) for d in periodics))
projectiles = [s['effect'] for s in skills if s['effect']['type']=='PROJECTILE']
check('Projectiles have positive speed, range and finite lifetime', all(e['speed_melee_units_per_second']>0 and e['range_melee_units']>0 and e['lifetime_seconds']>0 and e['range_melee_units']/e['speed_melee_units_per_second'] <= e['lifetime_seconds'] for e in projectiles))
traps = [s['effect'] for s in skills if s['effect']['type']=='TRIGGER_TRAP']
check('Stationary traps have bounded placement/lifetime and following debuff', all(e['mode']=='WORLD_FIXED' and e['placement_range_melee_units']>0 and e['untriggered_lifetime_seconds']>0 and e['on_trigger']['mode']=='FOLLOW_TARGET' for e in traps))
check('Only released projectile/zone/trap examples use autonomous flag', all(s['effect']['type'] in {'PROJECTILE','PERIODIC_ZONE','TRIGGER_TRAP'} for s in skills if s['autonomous_after_commit']))
check('Discord is voluntary, keeps team identity and does not allow self-damage', all(cfg['status_rules']['discord'][key] is False for key in ['changes_team_identity','forces_actions','allows_self_damage','changes_healing_targets','out_of_match_allowed']))
check('Last Pulse is an atomic self-KO and burst with a draft unlock', by_id['BAGE_LAST_PULSE']['effect']['requires_atomic_resolution'] and by_id['BAGE_LAST_PULSE']['draft_unlock_level']==12 and by_id['BAGE_LAST_PULSE']['final_unlock']=='UNDECIDED')
check('Team fixture supports at most 3v3, excludes spectators, disables PvP flight', max(cfg['teams']['dev_equal_team_sizes'])==cfg['teams']['owner_max_team_size']==3 and not cfg['teams']['spectators_are_combatants'] and not cfg['teams']['pvp_flight'])
check('Safety of project scope: no rewards, new map or claimed shipping topology', cfg['scope']['no_rewards_or_real_profiles'] and not cfg['scope']['new_map_or_matchmaking'] and not cfg['scope']['new_shipping_topology_decided'])

failed = [name for name,passed in checks if not passed]
report = [
    '# Design configuration validation',
    '',
    f'Ruleset: `{cfg["ruleset_id"]}`',
    '',
    f'**{len(checks)-len(failed)}/{len(checks)} internal checks passed.**',
    '',
    'This checks authored data, arithmetic and cross-rule constraints only. It does not execute the game, verify existing project IDs, prove multiplayer/recovery behavior, establish balance, or prove browser playability. Those checks remain Claude\'s integration task.',
    '',
    f'Catalog: {len(skills)} skills, {len(profiles)} class profiles, three attack categories, two energy pools.',
    '',
]
report += [f'- {"PASS" if passed else "FAIL"}: {name}' for name,passed in checks]
if '--report' in sys.argv:
    (ROOT/'CONFIG_VALIDATION.md').write_text('\n'.join(report)+'\n')
print(f'{len(checks)-len(failed)}/{len(checks)} design configuration checks passed.')
for name in failed:
    print(f'FAIL: {name}')
sys.exit(bool(failed))
