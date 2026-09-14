'use strict';

const pack = require('./foodPackV10');
const byIngredient = Object.fromEntries(pack.INGREDIENTS.map(x => [x.id, x]));
const byPortion = Object.fromEntries(pack.PORTION_SPECS.map(x => [x.id, x]));
const byMethod = Object.fromEntries(pack.COOKING_METHODS.map(x => [x.id, x]));

function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function round(v,n){ const p=Math.pow(10,n||0); return Math.round(v*p)/p; }

function ingredientUnitCost(ingredientId, marketIndex, qualityMultiplier) {
  const x = byIngredient[ingredientId];
  if (!x) return 0;
  return x.costIndex * (marketIndex == null ? 1 : marketIndex) * (qualityMultiplier == null ? 1 : qualityMultiplier);
}

function recipeVariableCost(recipe, options) {
  options = options || {};
  const portion = byPortion[options.portionId || 'single'] || byPortion.single;
  const market = options.marketIndexByIngredient || {};
  const quality = options.qualityMultiplier == null ? 1 : options.qualityMultiplier;
  let raw = 0;
  for (const line of recipe.ingredients) {
    const ing = byIngredient[line.ingredientId];
    if (!ing) continue;
    const usable = Math.max(0.45, ing.usableYield || 1);
    const qtyKg = (line.grams * portion.portionFactor) / 1000;
    raw += qtyKg / usable * ingredientUnitCost(ing.id, market[ing.id] || options.marketIndex || 1, quality);
  }
  const method = byMethod[recipe.method];
  const energyAndConsumables = (options.energyBase || 0.08) * (method ? Math.max(1,method.timeMinutes/8) : 1);
  const packaging = options.channel === 'delivery' ? (options.deliveryPackagingCost || 0.22) : (options.packagingCost || 0.04);
  return round(raw + energyAndConsumables + packaging, 3);
}

function effectiveYield(recipe, staffSkill, equipmentScore) {
  const method = byMethod[recipe.method] || {yieldFactor:1,skillFactor:1};
  const skill = clamp((staffSkill == null ? 50 : staffSkill)/100,0,1);
  const equip = clamp((equipmentScore == null ? 70 : equipmentScore)/100,0,1);
  const lossPenalty = (1-skill)*0.08*method.skillFactor + (1-equip)*0.05;
  return round(clamp(method.yieldFactor - lossPenalty,0.65,0.995),3);
}

function estimatedPrepMinutes(recipe, staffSkill, equipmentScore, batchFactor) {
  const method = byMethod[recipe.method] || {timeMinutes:10,skillFactor:1};
  const skill = clamp((staffSkill == null ? 50 : staffSkill)/100,0.15,1);
  const equip = clamp((equipmentScore == null ? 70 : equipmentScore)/100,0.2,1);
  const efficiency = 0.55 + skill*0.28 + equip*0.17;
  const base = (recipe.prepMinutes || 0) + (recipe.cookMinutes || method.timeMinutes);
  return round(base / efficiency * (batchFactor || 1),1);
}

function collectAllergens(recipe) {
  const set = new Set();
  recipe.ingredients.forEach(line => {
    const ing = byIngredient[line.ingredientId];
    if (ing) (ing.tags || []).forEach(t => set.add(t));
  });
  return [...set];
}

function shelfRisk(ingredient, daysHeld, coldChainScore) {
  if (!ingredient) return 1;
  const chain = clamp((coldChainScore == null ? 80 : coldChainScore)/100,0.35,1);
  const effectiveShelf = ingredient.shelfDays * (0.75 + chain*0.25);
  const ratio = daysHeld / Math.max(0.5,effectiveShelf);
  return round(clamp(Math.pow(ratio,1.7),0,1.5),3);
}

function spoilageLoss(ingredient, qty, daysHeld, coldChainScore) {
  const risk = shelfRisk(ingredient,daysHeld,coldChainScore);
  const rate = clamp((risk-0.55)*0.7,0,0.95);
  return round(Math.max(0,qty)*rate,3);
}

function minimumSafePrice(recipe, options) {
  options = options || {};
  const variableCost = recipeVariableCost(recipe,options);
  const laborPerOrder = options.laborPerOrder == null ? 0.45 : options.laborPerOrder;
  const platformRate = options.channel === 'delivery' ? (options.platformRate == null ? 0.18 : options.platformRate) : 0;
  const fixedAllocation = options.fixedAllocation == null ? 0.35 : options.fixedAllocation;
  const floorBeforePlatform = variableCost + laborPerOrder + fixedAllocation;
  return round(floorBeforePlatform / Math.max(0.5,1-platformRate),2);
}

module.exports = {
  clamp,round,ingredientUnitCost,recipeVariableCost,effectiveYield,estimatedPrepMinutes,collectAllergens,shelfRisk,spoilageLoss,minimumSafePrice
};
