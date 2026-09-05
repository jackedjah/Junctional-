'use strict';
/* ══ MEAL GRADE :: DETERMINISTIC FOB SCORER ═══════════════════════════════
   The vision provider extracts visible evidence. It never chooses the final
   grade. This module applies the product owner's fixed rubric so identical
   evidence receives an identical result regardless of model/provider.

   Historical database and storage names intentionally remain meal_gradient
   for compatibility. New analyses are stamped MG-2.1 in analysis_json.
   ═══════════════════════════════════════════════════════════════════════ */

const SCORING_VERSION = 'MG-2.2';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));
const round = n => Math.round(Number(n) || 0);
const pick = (value, allowed, fallback) => allowed.indexOf(value) >= 0 ? value : fallback;
const yes = value => value === true || value === 'yes';
const finiteOrNull = value => value == null || value === '' || !Number.isFinite(Number(value))
  ? null : Math.max(0, Number(value));
const short = (value, max) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);

function numberRange(low, high, maximum) {
  low = finiteOrNull(low);
  high = finiteOrNull(high);
  if (low == null && high == null) return { low: null, high: null };
  if (low == null) low = high;
  if (high == null) high = low;
  low = clamp(low, 0, maximum);
  high = clamp(high, 0, maximum);
  if (low > high) { const swap = low; low = high; high = swap; }
  return { low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10 };
}

function normalizeEvidence(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const composition = raw.composition && typeof raw.composition === 'object' ? raw.composition : {};
  const protein = raw.protein && typeof raw.protein === 'object' ? raw.protein : {};
  const condiments = raw.condiments && typeof raw.condiments === 'object' ? raw.condiments : {};
  const snack = raw.snack && typeof raw.snack === 'object' ? raw.snack : {};
  const label = raw.label && typeof raw.label === 'object' ? raw.label : {};
  const product = raw.product_profile && typeof raw.product_profile === 'object' ? raw.product_profile : {};
  const nutrition = raw.nutrition_estimate && typeof raw.nutrition_estimate === 'object'
    ? raw.nutrition_estimate : {};
  const extreme = raw.extreme_signal && typeof raw.extreme_signal === 'object' ? raw.extreme_signal : {};
  const readable = label.present === true && label.readable === true;
  const canEstimate = nutrition.can_estimate === true;
  const servings = numberRange(nutrition.estimated_servings_low, nutrition.estimated_servings_high, 100);
  const calories = numberRange(nutrition.calories_low, nutrition.calories_high, 10000);
  const proteinMacro = numberRange(nutrition.protein_g_low, nutrition.protein_g_high, 1000);
  const carbMacro = numberRange(nutrition.carbs_g_low, nutrition.carbs_g_high, 1500);
  const fatMacro = numberRange(nutrition.fat_g_low, nutrition.fat_g_high, 1000);
  return {
    meal_name: short(raw.meal_name || 'Meal', 120) || 'Meal',
    foods_observed: Array.isArray(raw.foods_observed) ? raw.foods_observed.filter(item => item && item.name)
      .slice(0, 12).map(item => ({
        name: short(item.name, 80),
        confidence: Math.round(clamp(item.confidence, 0, 1) * 100) / 100
      })) : [],
    meal_format: pick(raw.meal_format,
      ['plated_meal', 'packaged_snack', 'portioned_snack', 'mixed', 'unclear'], 'unclear'),
    composition: {
      protein_presence: pick(composition.protein_presence,
        ['none', 'small', 'balanced', 'prominent', 'unclear'], 'unclear'),
      produce_presence: pick(composition.produce_presence,
        ['none', 'small', 'balanced', 'prominent', 'unclear'], 'unclear'),
      produce_kind: pick(composition.produce_kind,
        ['vegetables', 'fresh_fruit', 'dried_fruit', 'mixed', 'none', 'unclear'], 'unclear'),
      dried_fruit_excess: pick(composition.dried_fruit_excess, ['yes', 'no', 'unclear'], 'unclear'),
      starch_kind: pick(composition.starch_kind,
        ['complex', 'refined', 'mixed', 'none', 'unclear'], 'unclear'),
      starch_balance: pick(composition.starch_balance,
        ['small', 'balanced', 'dominant', 'none', 'unclear'], 'unclear')
    },
    protein: {
      amount: pick(protein.amount, ['none', 'small', 'reasonable', 'large', 'unclear'], 'unclear'),
      appearance: pick(protein.appearance,
        ['lean', 'moderate', 'fatty_processed', 'none', 'unclear'], 'unclear'),
      source_count: pick(protein.source_count, ['none', 'one', 'multiple', 'unclear'], 'unclear'),
      fried_breading: pick(protein.fried_breading, ['none', 'moderate', 'extreme', 'unclear'], 'unclear')
    },
    condiments: {
      quantity: pick(condiments.quantity, ['none', 'light', 'moderate', 'heavy', 'extreme', 'unclear'], 'unclear'),
      creamy_oily: pick(condiments.creamy_oily, ['yes', 'no', 'unclear'], 'unclear'),
      sugary: pick(condiments.sugary, ['yes', 'no', 'unclear'], 'unclear'),
      multiple: pick(condiments.multiple, ['yes', 'no', 'unclear'], 'unclear')
    },
    snack: {
      package_visible: snack.package_visible === true,
      portioned_out: snack.portioned_out === true,
      package_scale: pick(snack.package_scale,
        ['normal', 'regular_multi_serving', 'extreme_oversized', 'unclear'], 'unclear'),
      servings_per_package: finiteOrNull(snack.servings_per_package),
      ordinary_chips: snack.ordinary_chips === true,
      protein_bar: snack.protein_bar === true
    },
    label: {
      present: label.present === true,
      readable,
      protein_g: readable ? finiteOrNull(label.protein_g) : null,
      fiber_g: readable ? finiteOrNull(label.fiber_g) : null,
      added_sugar_g: readable ? finiteOrNull(label.added_sugar_g) : null,
      calories_per_serving: readable ? finiteOrNull(label.calories_per_serving) : null
    },
    product_profile: {
      simple_item: product.simple_item === true,
      category: pick(product.category,
        ['none','icing_frosting','candy','dessert_spread','sweet_syrup','sweetened_cream','dessert_other',
          'savory_processed_snack','protein_product','other','unclear'], 'unclear'),
      ingredient_list_visible: product.ingredient_list_visible === true,
      ingredient_pattern: pick(product.ingredient_pattern,
        ['whole_food_dominant','mixed','refined_sugar_fat_dominant','highly_processed','unclear'], 'unclear'),
      macro_pattern: pick(product.macro_pattern,
        ['protein_forward','balanced','sugar_fat_low_protein','refined_carb_low_protein','fat_low_protein','unclear'], 'unclear'),
      inference_basis: pick(product.inference_basis,
        ['ingredient_list','nutrition_label','package_identity','food_identity','mixed','unclear'], 'unclear')
    },
    nutrition_estimate: {
      can_estimate: canEstimate && calories.low != null && calories.high != null,
      portion_basis: pick(nutrition.portion_basis,
        ['visible_portion', 'single_package', 'label_and_visible_portion', 'multiple_angles', 'unclear'], 'unclear'),
      estimated_servings_low: canEstimate ? servings.low : null,
      estimated_servings_high: canEstimate ? servings.high : null,
      calories_low: canEstimate ? calories.low : null,
      calories_high: canEstimate ? calories.high : null,
      protein_g_low: canEstimate ? proteinMacro.low : null,
      protein_g_high: canEstimate ? proteinMacro.high : null,
      carbs_g_low: canEstimate ? carbMacro.low : null,
      carbs_g_high: canEstimate ? carbMacro.high : null,
      fat_g_low: canEstimate ? fatMacro.low : null,
      fat_g_high: canEstimate ? fatMacro.high : null,
      confidence: Math.round(clamp(nutrition.confidence, 0, 1) * 100) / 100,
      assumptions: Array.isArray(nutrition.assumptions)
        ? nutrition.assumptions.filter(item => typeof item === 'string').slice(0, 6).map(item => short(item, 160))
        : []
    },
    extreme_signal: {
      kind: pick(extreme.kind,
        ['none', 'fried_breaded', 'dessert_sugar', 'portion', 'processed_fast_food',
          'oil_sauce', 'oversized_snack_package', 'unclear'], 'unclear'),
      severity: pick(extreme.severity, ['none', 'moderate', 'extreme', 'unclear'], 'unclear'),
      dominates_meal: extreme.dominates_meal === true,
      unmistakable: extreme.unmistakable === true
    },
    evidence_confidence: Math.round(clamp(raw.evidence_confidence, 0, 1) * 100) / 100,
    uncertainties: Array.isArray(raw.uncertainties)
      ? raw.uncertainties.filter(item => typeof item === 'string').slice(0, 8).map(item => short(item, 160))
      : []
  };
}

function condimentPoints(evidence) {
  const quantityDeductions = { none: 0, light: 1, moderate: 4, heavy: 9, extreme: 15, unclear: 2 };
  let score = 20 - quantityDeductions[evidence.condiments.quantity];
  if (yes(evidence.condiments.creamy_oily)) score -= 4;
  if (yes(evidence.condiments.sugary)) score -= 4;
  if (yes(evidence.condiments.multiple)) score -= 3;
  return round(clamp(score, 0, 20));
}

function scoreFullMeal(evidence, mealType) {
  const proteinPresence = { none: 0, small: 6, balanced: 18, prominent: 16, unclear: 8 };
  const produceStandard = { none: 0, small: 7, balanced: 18, prominent: 18, unclear: 8 };
  const produceBreakfast = { none: 4, small: 12, balanced: 18, prominent: 18, unclear: 8 };
  const starchKind = { complex: 9, mixed: 6, refined: 2, none: 7, unclear: 4 };
  let produce = (mealType === 'breakfast' ? produceBreakfast : produceStandard)[evidence.composition.produce_presence];
  if (evidence.composition.produce_kind === 'dried_fruit' && evidence.composition.dried_fruit_excess === 'yes') {
    produce = Math.max(0, produce - 4);
  }
  let starch = starchKind[evidence.composition.starch_kind];
  if (evidence.composition.starch_balance === 'dominant') starch = Math.max(0, starch - 4);
  const composition = round(clamp(proteinPresence[evidence.composition.protein_presence] + produce + starch, 0, 45));

  const amount = { none: 0, small: 5, reasonable: 12, large: 15, unclear: 5 };
  const appearance = { lean: 12, moderate: 8, fatty_processed: 2, none: 0, unclear: 4 };
  const sources = { none: 0, one: 4, multiple: 8, unclear: 2 };
  const noProtein = evidence.protein.amount === 'none';
  const proteinStrength = noProtein ? 0 : round(clamp(
    amount[evidence.protein.amount] + appearance[evidence.protein.appearance] + sources[evidence.protein.source_count], 0, 35));
  const condiments = condimentPoints(evidence);
  return {
    mode: 'full_meal',
    categories: [
      { key: 'composition', label: 'Plate composition', earned: composition, possible: 45 },
      { key: 'protein_strength', label: 'Protein strength', earned: proteinStrength, possible: 35 },
      { key: 'condiment_restraint', label: 'Condiment restraint', earned: condiments, possible: 20 }
    ],
    pictureScore: composition + proteinStrength + condiments
  };
}

function scoreSnack(evidence) {
  /* Unpackaged whole-food snacks (fruit, jerky, nuts, etc.) are already a
     visible portion; they should not lose portion points merely because no
     retail package exists. Packaged snacks still use the package rules. */
  const packageIsAcceptable = !evidence.snack.package_visible
    || evidence.snack.portioned_out
    || evidence.snack.package_scale === 'normal'
    || evidence.snack.package_scale === 'regular_multi_serving';
  const portion = packageIsAcceptable ? 40 : evidence.snack.package_scale === 'extreme_oversized' ? 0 : 28;

  let quality;
  if (evidence.snack.ordinary_chips) quality = 12;
  else if (evidence.snack.protein_bar) quality = 18;
  else {
    quality = 19;
    if (['small', 'balanced', 'prominent'].indexOf(evidence.composition.produce_presence) >= 0) quality += 6;
    if (evidence.protein.amount === 'reasonable') quality += 4;
    if (evidence.protein.amount === 'large') quality += 6;
    if (evidence.composition.starch_kind === 'complex') quality += 2;
    if (evidence.composition.starch_kind === 'refined') quality -= 2;
    if (evidence.protein.fried_breading === 'extreme') quality -= 5;
  }
  quality = round(clamp(quality, 10, 35));

  let restraint = 18;
  if (evidence.snack.ordinary_chips || evidence.snack.protein_bar) restraint -= 6;
  const quantityDeductions = { none: 0, light: 0, moderate: 2, heavy: 5, extreme: 9, unclear: 1 };
  restraint -= quantityDeductions[evidence.condiments.quantity];
  if (yes(evidence.condiments.creamy_oily)) restraint -= 2;
  if (yes(evidence.condiments.sugary)) restraint -= 2;
  if (yes(evidence.condiments.multiple)) restraint -= 2;
  if (evidence.protein.fried_breading === 'moderate') restraint -= 3;
  if (evidence.protein.fried_breading === 'extreme') restraint -= 7;
  restraint = round(clamp(restraint, 0, 20));

  return {
    mode: 'snack',
    categories: [
      { key: 'portion_presentation', label: 'Snack portion', earned: portion, possible: 45 },
      { key: 'snack_quality', label: 'Visible snack quality', earned: quality, possible: 35 },
      { key: 'restraint_processing', label: 'Restraint and processing', earned: restraint, possible: 20 }
    ],
    pictureScore: portion + quality + restraint
  };
}

function labelAdjustment(label, mealType) {
  if (!label.readable) return 0;
  let points = 0;
  if (label.protein_g != null) {
    if (label.protein_g >= 20) points += 4;
    else if (label.protein_g >= 10) points += 3;
    else if (label.protein_g >= 5) points += 1;
  }
  if (label.fiber_g != null) {
    if (label.fiber_g >= 5) points += 3;
    else if (label.fiber_g >= 3) points += 2;
    else if (label.fiber_g >= 1) points += 1;
  }
  if (label.added_sugar_g != null) {
    if (label.added_sugar_g >= 20) points -= 5;
    else if (label.added_sugar_g >= 10) points -= 3;
    else if (label.added_sugar_g >= 5) points -= 1;
    else if (label.added_sugar_g <= 2) points += 1;
  }
  if (label.calories_per_serving != null) {
    if (mealType === 'snack') {
      if (label.calories_per_serving >= 500) points -= 3;
      else if (label.calories_per_serving >= 350) points -= 1;
      else if (label.calories_per_serving <= 250) points += 1;
    } else {
      if (label.calories_per_serving >= 900) points -= 2;
      else if (label.calories_per_serving >= 700) points -= 1;
      else if (label.calories_per_serving <= 550) points += 1;
    }
  }
  return round(clamp(points, -10, 10));
}

function normalizedPhysiqueGoal(ctx) {
  const value = short(ctx && ctx.physiqueGoal, 20).toLowerCase();
  return ['gain', 'maintain', 'lose'].indexOf(value) >= 0 ? value : 'maintain';
}

function snackGoalAdjustment(evidence, ctx, nutrition) {
  const physiqueGoal = normalizedPhysiqueGoal(ctx);
  const calorieGoal = finiteOrNull(ctx && ctx.calorieGoal);
  const calories = nutrition && nutrition.available ? finiteOrNull(nutrition.calories_estimate) : null;
  const proteinG = nutrition && nutrition.available ? finiteOrNull(nutrition.protein_g_estimate) : null;
  const calorieShare = calorieGoal && calories != null ? calories / calorieGoal : null;
  const visibleLowProtein = evidence.protein.amount === 'none' || evidence.protein.amount === 'small';
  const lowProtein = proteinG != null ? proteinG < 8 : visibleLowProtein;
  const strongProtein = proteinG != null ? proteinG >= 15
    : evidence.protein.amount === 'reasonable' || evidence.protein.amount === 'large';
  const refinedLowProtein = ['refined_carb_low_protein', 'sugar_fat_low_protein', 'fat_low_protein']
    .indexOf(evidence.product_profile.macro_pattern) >= 0
    || (evidence.composition.starch_kind === 'refined' && lowProtein);
  let points = 0;
  const positive = [];
  const concerns = [];
  let nextStep = '';

  /* Physique goal is context, not a replacement for food quality. The range is
     deliberately bounded so a fruit snack can remain green, while a snack that
     clearly conflicts with the user's stated goal can move one grade band. */
  if (physiqueGoal === 'gain') {
    if (strongProtein) { points += 2; positive.push('Protein supports a gain-focused snack'); }
    else if (lowProtein) { points -= 4; concerns.push('Low protein for a gain-focused snack'); }
    if (calorieShare != null && calorieShare < 0.05 && lowProtein) {
      points -= 6;
      concerns.push('Very small calorie contribution for the daily gain goal');
      nextStep = 'For a gain goal, pair this with a useful protein source or another substantial whole-food component instead of relying on a very small carb-only snack.';
    } else if (calorieShare != null && calorieShare >= 0.06 && calorieShare <= 0.18 && strongProtein) {
      points += 2;
      positive.push('Snack size fits the daily gain goal');
    }
  } else if (physiqueGoal === 'lose') {
    if (strongProtein) { points += 3; positive.push('Protein supports lean-mass retention during a loss goal'); }
    else if (lowProtein) {
      points -= 4;
      concerns.push('Low protein for a loss-focused snack');
      nextStep = 'For a loss goal, keep the useful food quality but consider pairing the snack with a lean protein source when practical.';
    }
    if (calorieShare != null && calorieShare > 0.20 && lowProtein) {
      points -= 4;
      concerns.push('Large calorie share without much protein');
    }
  } else {
    if (strongProtein) { points += 2; positive.push('Useful snack protein'); }
    else if (proteinG != null && proteinG < 5 && calorieShare != null && calorieShare > 0.16) {
      points -= 3;
      concerns.push('Large snack share with little protein');
      nextStep = 'For a maintenance goal, keep the portion reasonable and add protein when a snack is taking a larger share of the day.';
    }
  }

  if (refinedLowProtein && evidence.product_profile.macro_pattern !== 'protein_forward') {
    points -= 3;
    concerns.push('Refined low-protein snack pattern');
    if (!nextStep) nextStep = 'Choose a less-refined snack or pair the carbohydrate with a useful protein source.';
  }

  points = round(clamp(points, -12, 6));
  return {
    points,
    physiqueGoal,
    calorieShare: calorieShare == null ? null : Math.round(calorieShare * 1000) / 1000,
    positive: positive.slice(0, 3),
    concerns: concerns.slice(0, 3),
    nextStep
  };
}

const extremeLabels = {
  fried_breaded: 'deep-fried or heavily breaded food',
  dessert_sugar: 'dessert or sugary food',
  portion: 'extreme portion size',
  processed_fast_food: 'highly processed fast food',
  oil_sauce: 'heavy visible oil or sauce',
  oversized_snack_package: 'extremely oversized snack package',
  unclear: 'possible extreme condition',
  none: 'extreme condition'
};

function importantUncertainty(evidence, mealType) {
  if (evidence.evidence_confidence < 0.62 || evidence.extreme_signal.severity === 'unclear') return true;
  if (mealType === 'snack') {
    return evidence.meal_format === 'unclear'
      || (evidence.snack.package_visible && !evidence.snack.portioned_out && evidence.snack.package_scale === 'unclear');
  }
  return evidence.composition.protein_presence === 'unclear'
    || evidence.composition.produce_presence === 'unclear'
    || evidence.protein.amount === 'unclear';
}

function buildSignals(evidence, breakdown, adjustment, mealType, mixedExtreme, goalContext) {
  const positive = [];
  const concerns = [];
  if (mealType === 'snack') {
    if (breakdown.categories[0].earned >= 40) positive.push('Reasonable visible snack portion');
    if (evidence.composition.produce_presence !== 'none' && evidence.composition.produce_presence !== 'unclear') {
      positive.push('Visible fruit or produce');
    }
    if (evidence.protein.amount === 'reasonable' || evidence.protein.amount === 'large') positive.push('Useful visible protein');
    if (evidence.snack.ordinary_chips) concerns.push('Ordinary chips are a moderate-choice snack');
  } else {
    if (breakdown.categories[0].earned >= 34) positive.push('Balanced visible plate composition');
    if (breakdown.categories[1].earned >= 24) positive.push('Strong visible protein');
    if (breakdown.categories[2].earned >= 16) positive.push('Restrained visible sauces and condiments');
    if (evidence.composition.starch_kind === 'refined') concerns.push('Refined starch lowers the plate-composition score');
    if (evidence.composition.produce_presence === 'none') concerns.push('Little visible produce');
    if (evidence.protein.amount === 'none' || evidence.protein.amount === 'small') concerns.push('Limited visible protein');
  }
  if (evidence.condiments.quantity === 'heavy' || evidence.condiments.quantity === 'extreme'
      || yes(evidence.condiments.creamy_oily) || yes(evidence.condiments.sugary)) {
    concerns.push('Visible condiment quantity or texture reduces restraint');
  }
  if (adjustment > 0) positive.push('Readable label evidence supports the score');
  if (adjustment < 0) concerns.push('Readable label evidence reduces the score');
  if (mixedExtreme) concerns.push('One unmistakable concern is present but does not dominate the whole meal');
  if (goalContext) {
    (goalContext.positive || []).forEach(item => positive.push(item));
    (goalContext.concerns || []).forEach(item => concerns.push(item));
  }
  return { positive: positive.slice(0, 8), concerns: concerns.slice(0, 8) };
}

function simpleProductRedSignal(evidence, finalNumeric) {
  const profile = evidence.product_profile || {};
  if (!profile.simple_item) return { red: false, reason: '' };
  const categories = ['icing_frosting','candy','dessert_spread','sweet_syrup','sweetened_cream','dessert_other'];
  const lowProteinMacros = ['sugar_fat_low_protein','refined_carb_low_protein','fat_low_protein'];
  const poorIngredients = ['refined_sugar_fat_dominant','highly_processed'];
  const categoryExtreme = categories.indexOf(profile.category) >= 0
    && (lowProteinMacros.indexOf(profile.macro_pattern) >= 0 || poorIngredients.indexOf(profile.ingredient_pattern) >= 0)
    && profile.macro_pattern !== 'protein_forward';
  const labelExtreme = evidence.label.readable
    && evidence.label.added_sugar_g != null && evidence.label.added_sugar_g >= 15
    && evidence.label.protein_g != null && evidence.label.protein_g <= 5
    && (evidence.label.fiber_g == null || evidence.label.fiber_g <= 2)
    && profile.macro_pattern !== 'protein_forward';
  const lowScoreExtreme = finalNumeric <= 30
    && profile.macro_pattern !== 'protein_forward'
    && profile.ingredient_pattern !== 'whole_food_dominant'
    && (categories.indexOf(profile.category) >= 0
      || lowProteinMacros.indexOf(profile.macro_pattern) >= 0
      || poorIngredients.indexOf(profile.ingredient_pattern) >= 0);
  return {
    red: categoryExtreme || labelExtreme || lowScoreExtreme,
    reason: labelExtreme ? 'label' : categoryExtreme ? 'product' : lowScoreExtreme ? 'score' : ''
  };
}

function userCopy(evidence, grade, majorUnknown, oversizedSnack, mixedExtreme, signals, simpleRed) {
  const extremeLabel = extremeLabels[evidence.extreme_signal.kind] || extremeLabels.unclear;
  let reason;
  let improvement;
  if (grade === 'red') {
    if (simpleRed && simpleRed.red) {
      reason = simpleRed.reason === 'label'
        ? 'The readable label shows a simple sugar-heavy, low-protein product, so it defaults to red instead of being treated like a mixed meal.'
        : 'This is a simple sugar/fat-dominant, low-protein discretionary product, so it defaults to red instead of being treated like a mixed meal.';
      improvement = 'Keep this exact product occasional or choose a more balanced version with meaningfully stronger protein, fiber, or whole-food structure.';
    } else {
      reason = oversizedSnack
        ? 'The visible snack package is unmistakably oversized for a single snack.'
        : 'An unmistakable ' + extremeLabel + ' dominates the visible meal.';
      improvement = oversizedSnack
        ? 'Portion the snack out before photographing it.'
        : 'Reduce the dominant extreme item and show a more balanced portion.';
    }
  } else if (majorUnknown) {
    reason = 'Important visible evidence is unclear, so this meal stays yellow rather than being over-graded.';
    improvement = 'Add a clearer full-meal angle or a readable nutrition label.';
  } else if (mixedExtreme) {
    reason = 'The plate has useful qualities, but one unmistakable concern keeps the overall grade yellow.';
    improvement = 'Reduce or replace the concerning item while preserving the stronger parts of the plate.';
  } else if (evidence.snack.ordinary_chips) {
    reason = 'The portion appears snack-sized; ordinary chips remain a moderate choice.';
    improvement = 'Keep the package portion reasonable or portion it out before photographing.';
  } else if (evidence.snack.protein_bar && evidence.label.added_sugar_g != null && evidence.label.added_sugar_g >= 8) {
    reason = 'Visible protein and fiber evidence is offset by moderately high added sugar, keeping this yellow.';
    improvement = 'A similar bar with less added sugar would score more strongly.';
  } else if (grade === 'green') {
    reason = signals.positive.length
      ? signals.positive.slice(0, 2).join(' and ') + ' support a green grade.'
      : 'The visible portion and food balance support a green grade.';
    improvement = 'Keep the same visible balance and portioning.';
  } else {
    reason = signals.concerns.length
      ? signals.concerns.slice(0, 2).join(' and ') + '.'
      : 'The visible meal is a reasonable moderate choice but does not reach the green standard.';
    if (evidence.condiments.quantity === 'heavy' || evidence.condiments.quantity === 'extreme') {
      improvement = 'Use a lighter visible amount of sauce or dressing.';
    } else if (evidence.protein.amount === 'none' || evidence.protein.amount === 'small') {
      improvement = 'Add a clearer, useful protein portion.';
    } else {
      improvement = 'Improve the visible balance of protein, produce, and starch.';
    }
  }
  return { reason_short: short(reason, 400), improvement_short: short(improvement, 400) };
}

function nutritionResult(evidence) {
  const value = evidence.nutrition_estimate;
  if (!value.can_estimate || value.calories_low == null || value.calories_high == null) {
    return {
      available: false, estimated: true, calories_estimate: null, calories_low: null, calories_high: null,
      protein_g_estimate: null, protein_g_low: null, protein_g_high: null,
      carbs_g_estimate: null, carbs_g_low: null, carbs_g_high: null,
      fat_g_estimate: null, fat_g_low: null, fat_g_high: null,
      confidence: value.confidence, portion_basis: value.portion_basis,
      estimated_servings_low: value.estimated_servings_low,
      estimated_servings_high: value.estimated_servings_high,
      assumptions: value.assumptions
    };
  }
  const mid = (low, high) => low == null || high == null ? null : round((Number(low) + Number(high)) / 2);
  return {
    available: true,
    estimated: true,
    calories_estimate: mid(value.calories_low, value.calories_high),
    calories_low: round(value.calories_low), calories_high: round(value.calories_high),
    protein_g_estimate: mid(value.protein_g_low, value.protein_g_high),
    protein_g_low: value.protein_g_low, protein_g_high: value.protein_g_high,
    carbs_g_estimate: mid(value.carbs_g_low, value.carbs_g_high),
    carbs_g_low: value.carbs_g_low, carbs_g_high: value.carbs_g_high,
    fat_g_estimate: mid(value.fat_g_low, value.fat_g_high),
    fat_g_low: value.fat_g_low, fat_g_high: value.fat_g_high,
    confidence: value.confidence,
    portion_basis: value.portion_basis,
    estimated_servings_low: value.estimated_servings_low,
    estimated_servings_high: value.estimated_servings_high,
    assumptions: value.assumptions
  };
}

function buildGuidance(evidence, grade, numericScore, breakdown, copy, signals, mealType, ctx, nutrition, goalContext, requestedType) {
  const weakest = breakdown.categories.slice().sort((a, b) =>
    (a.earned / Math.max(1, a.possible)) - (b.earned / Math.max(1, b.possible)))[0];
  let next;
  let principle;
  if (weakest.key === 'composition') {
    next = 'Next time, make the protein and vegetables or fruit visually clear, keep starch proportional, and favor a complex starch when one is included.';
    principle = 'Plate composition';
  } else if (weakest.key === 'protein_strength') {
    next = 'Next time, use a clearer lean protein anchor or a slightly stronger visible protein portion while preserving the plate balance.';
    principle = 'Protein anchor';
  } else if (weakest.key === 'condiment_restraint') {
    next = 'Next time, keep creamy, oily, or sugary condiments lighter or place them on the side.';
    principle = 'Condiment restraint';
  } else if (weakest.key === 'portion_presentation') {
    next = 'Next time, show one realistic snack portion or portion the food out before photographing it.';
    principle = 'Portion control';
  } else if (weakest.key === 'snack_quality') {
    next = 'Next time, keep the valid snack portion and choose a version with stronger visible food quality when practical.';
    principle = 'Repeatable snack choices';
  } else {
    next = 'Next time, keep the portion reasonable and reduce the most processed, fried, or sauce-heavy visible element.';
    principle = 'Restraint and repetition';
  }

  if (mealType === 'snack' && goalContext && goalContext.nextStep) {
    next = goalContext.nextStep + ' ' + next;
  }

  if (grade === 'green' && numericScore >= 94) {
    next = 'This is already a very strong result. Preserve the portion structure, rotate food sources for variety, and keep sauces measured rather than automatic.';
  } else if (copy.improvement_short && grade !== 'green') {
    next = copy.improvement_short + ' ' + next;
  }

  let frequency;
  if (grade === 'green' && numericScore >= 90) {
    frequency = 'Strong routine option. It can appear often when it fits the rest of the day and you still rotate foods for variety.';
  } else if (grade === 'green') {
    frequency = 'Reasonable regular-rotation meal. Improve the weakest visible category before treating this exact version as an automatic default.';
  } else if (grade === 'red') {
    frequency = 'Keep this exact version occasional. A re-portioned or less extreme version can be judged as a different meal next time.';
  } else {
    frequency = 'Use this as a moderate-rotation choice rather than the daily default; apply the next-step change when repeating it.';
  }

  let goal = grade === 'green'
    ? 'This supports body-composition consistency by making the portion and food structure easier to repeat. It still counts inside the full day, not in isolation.'
    : grade === 'red'
      ? 'This exact version can make daily consistency harder if repeated often. The goal is not to ban it, but to reduce the extreme feature before it becomes a pattern.'
      : 'This can fit the goal, but the day becomes easier to manage when the next repeat improves the weakest visible category.';
  const calorieGoal = Number(ctx && ctx.calorieGoal);
  const physiqueGoal = normalizedPhysiqueGoal(ctx);
  if (nutrition && nutrition.available && calorieGoal > 0) {
    const share = round(nutrition.calories_estimate / calorieGoal * 100);
    goal = 'This ' + (mealType === 'snack' ? 'snack' : 'meal') + ' is estimated at about ' + share + '% of the ' + round(calorieGoal)
      + '-calorie daily goal. ' + goal;
  }
  goal = 'Physique goal: ' + physiqueGoal + '. ' + goal;
  const visibleWhy = copy.reason_short || (signals.positive[0] || signals.concerns[0] || 'Visible evidence produced this grade.');
  const specificNext = 'For ' + (evidence.meal_name || 'this meal') + ', '
    + next.charAt(0).toLowerCase() + next.slice(1);
  return {
    why_this_grade: short(visibleWhy, 700),
    path_to_greener: short(next, 700),
    next_time_application: short(specificNext, 700),
    suggested_frequency: short(frequency, 500),
    goal_application: short(goal, 600),
    course_principle: principle,
    course_application: short('Use the FOB Course principle of ' + principle.toLowerCase()
      + ' to make this exact choice more repeatable instead of chasing a perfect meal.', 500),
    meal_type_context: mealType,
    requested_meal_type_context: requestedType || mealType,
    physique_goal_context: normalizedPhysiqueGoal(ctx)
  };
}

function scoreEvidence(raw, ctx) {
  const evidence = normalizeEvidence(raw);
  const requestedTypeRaw = short(ctx && ctx.mealType, 20).toLowerCase();
  const requestedType = ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(requestedTypeRaw) >= 0
    ? requestedTypeRaw : 'lunch';
  /* Meal selection is a journal category, not a command to treat every photo as
     a plated meal. The vision evidence can identify an actual snack even when
     the member logged it under breakfast/lunch/dinner. */
  const visuallySnack = evidence.meal_format === 'packaged_snack' || evidence.meal_format === 'portioned_snack';
  const mealType = visuallySnack ? 'snack' : requestedType;
  const breakdown = mealType === 'snack' ? scoreSnack(evidence) : scoreFullMeal(evidence, mealType);
  const adjustment = labelAdjustment(evidence.label, mealType);
  const nutrition = nutritionResult(evidence);
  const goalContext = mealType === 'snack'
    ? snackGoalAdjustment(evidence, ctx || {}, nutrition)
    : { points: 0, physiqueGoal: normalizedPhysiqueGoal(ctx), calorieShare: null, positive: [], concerns: [], nextStep: '' };
  const finalNumeric = round(clamp(breakdown.pictureScore + adjustment + goalContext.points, 0, 100));

  const packageServingRed = mealType === 'snack' && evidence.snack.package_visible && !evidence.snack.portioned_out
    && evidence.snack.servings_per_package != null && evidence.snack.servings_per_package >= 8;
  const oversizedSnack = mealType === 'snack' && evidence.snack.package_visible && !evidence.snack.portioned_out
    && (evidence.snack.package_scale === 'extreme_oversized' || packageServingRed
      || (evidence.extreme_signal.kind === 'oversized_snack_package'
        && evidence.extreme_signal.severity === 'extreme' && evidence.extreme_signal.unmistakable));
  const unmistakableExtreme = evidence.extreme_signal.severity === 'extreme'
    && evidence.extreme_signal.unmistakable;
  const dominantExtreme = unmistakableExtreme && evidence.extreme_signal.dominates_meal;
  const mixedExtreme = unmistakableExtreme && !evidence.extreme_signal.dominates_meal;
  const majorUnknown = importantUncertainty(evidence, mealType);
  const simpleRed = simpleProductRedSignal(evidence, finalNumeric);

  let forcedYellow = mixedExtreme || majorUnknown || evidence.snack.ordinary_chips;
  /* A typical protein bar with good protein/fibre but moderately high added
     sugar remains yellow; a genuinely low-sugar bar may still earn green. */
  if (mealType === 'snack' && evidence.snack.protein_bar
      && evidence.label.added_sugar_g != null && evidence.label.added_sugar_g >= 8) forcedYellow = true;

  let grade;
  if (oversizedSnack || dominantExtreme || simpleRed.red) grade = 'red';
  else if (finalNumeric >= 75 && !forcedYellow) grade = 'green';
  else grade = 'yellow';

  /* ══ SCORE / GRADE COHERENCE ═══════════════════════════════════════════
     The overrides above set the grade AFTER the number was calculated, and
     the number was never brought with it. That is how "RED · 76/100" reached
     the screen: a discretionary product forced to red while still carrying
     the composition score it earned before the override.

     The displayed number now always lands inside the displayed colour. The
     project's own green threshold of 75 is preserved and is the source of
     truth; the yellow floor sits at 40, giving:

         RED     0-39      YELLOW  40-74      GREEN  75-100

     Re-mapping, not clamping: a meal's standing WITHIN its band is preserved
     proportionally, so a 76 forced to red becomes a high red rather than
     collapsing every overridden meal to the same figure. The number stays a
     coach's overall rating of the final interpretation, which is what it
     claims to be. */
  const BANDS = { red: [0, 39], yellow: [40, 74], green: [75, 100] };
  const band = BANDS[grade];
  let displayNumeric = finalNumeric;
  if (displayNumeric < band[0] || displayNumeric > band[1]) {
    /* where the raw score sat across the full range, mapped into the band */
    const t = Math.max(0, Math.min(100, finalNumeric)) / 100;
    displayNumeric = Math.round(band[0] + t * (band[1] - band[0]));
    displayNumeric = Math.max(band[0], Math.min(band[1], displayNumeric));
  }

  const signals = buildSignals(evidence, breakdown, adjustment, mealType, mixedExtreme, goalContext);
  const copy = userCopy(evidence, grade, majorUnknown, oversizedSnack, mixedExtreme, signals, simpleRed);
  const guidance = buildGuidance(evidence, grade, finalNumeric, breakdown, copy, signals, mealType, ctx, nutrition, goalContext, requestedType);
  const needsMore = majorUnknown;
  return {
    meal_name: evidence.meal_name,
    score: grade,
    confidence: evidence.evidence_confidence,
    picture_score: breakdown.pictureScore,
    label_adjustment: adjustment,
    final_numeric_score: displayNumeric,
    /* the pre-override composition score, kept for coaching analysis only and
       never shown beside a colour */
    composition_score: finalNumeric,
    score_breakdown: {
      mode: breakdown.mode,
      categories: breakdown.categories,
      picture_total: breakdown.pictureScore,
      label_adjustment: adjustment,
      goal_context_adjustment: goalContext.points,
      final_total: finalNumeric
    },
    foods_observed: evidence.foods_observed,
    positive_signals: signals.positive,
    concern_signals: signals.concerns,
    uncertain_signals: evidence.uncertainties,
    portion_assessment: {
      protein: evidence.protein.amount,
      vegetables_fruit: evidence.composition.produce_presence,
      starch_refined_carb: evidence.composition.starch_balance,
      added_fat_visible: evidence.condiments.quantity
    },
    visible_cooking_signals: {
      deep_fried_or_heavily_breaded: evidence.protein.fried_breading,
      visible_excess_oil: evidence.condiments.creamy_oily,
      heavy_sauce_or_dressing: evidence.condiments.quantity,
      highly_processed_packaged: evidence.extreme_signal.kind === 'processed_fast_food' ? evidence.extreme_signal.severity : 'none'
    },
    label_evidence: Object.assign({}, evidence.label, { adjustment }),
    goal_context: goalContext,
    product_profile: evidence.product_profile,
    reason_short: copy.reason_short,
    improvement_short: copy.improvement_short,
    guidance,
    nutrition_estimate: nutrition,
    needs_more_evidence: needsMore,
    evidence,
    rubric: {
      version: SCORING_VERSION,
      green_threshold: 75,
      red_requires_unmistakable_extreme: false,
      simple_discretionary_red_default: true,
      simple_low_score_red_threshold: 30,
      label_adjustment_limit: 10,
      goal_context_adjustment_range: [-12, 6],
      visual_snack_detection_overrides_log_category: true
    }
  };
}

module.exports = {
  SCORING_VERSION,
  scoreEvidence,
  normalizeEvidence,
  labelAdjustment
};
