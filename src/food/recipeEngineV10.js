'use strict';

const pack=require('./foodPackV10');
const rules=require('./foodRulesV10');
const recipes=pack.RECIPE_BY_ID;

function round(v,n){const p=Math.pow(10,n||0);return Math.round(v*p)/p;}

function scaleRecipe(recipeId, portions, portionId){
  const r=recipes[recipeId];
  if(!r)throw new Error('未知配方 '+recipeId);
  const p=pack.PORTION_SPECS.find(x=>x.id===(portionId||'single'))||pack.PORTION_SPECS[1];
  const factor=Math.max(0,Number(portions||1))*p.portionFactor;
  return r.ingredients.map(x=>({ingredientId:x.ingredientId,name:x.name,grams:round(x.grams*factor,1),optional:x.optional}));
}

function maxCraftable(recipeId, inventory, portionId){
  const need=scaleRecipe(recipeId,1,portionId);
  let max=Infinity;
  for(const line of need){
    if(line.optional)continue;
    const have=Number((inventory&&inventory[line.ingredientId])||0); // grams
    max=Math.min(max,Math.floor(have/Math.max(0.01,line.grams)));
  }
  return Number.isFinite(max)?Math.max(0,max):0;
}

function consumeForOrder(recipeId, inventory, qty, portionId){
  const next=Object.assign({},inventory||{});
  const need=scaleRecipe(recipeId,qty||1,portionId);
  if(maxCraftable(recipeId,next,portionId)<(qty||1))return {ok:false,inventory:next,missing:missingIngredients(recipeId,next,qty,portionId)};
  need.forEach(line=>{if(line.optional&&Number(next[line.ingredientId]||0)<line.grams)return;next[line.ingredientId]=round(Number(next[line.ingredientId]||0)-line.grams,1);});
  return {ok:true,inventory:next,consumed:need};
}

function missingIngredients(recipeId, inventory, qty, portionId){
  const need=scaleRecipe(recipeId,qty||1,portionId);
  return need.filter(line=>!line.optional&&Number((inventory&&inventory[line.ingredientId])||0)<line.grams).map(line=>({ingredientId:line.ingredientId,name:line.name,need:line.grams,have:Number((inventory&&inventory[line.ingredientId])||0),shortage:round(line.grams-Number((inventory&&inventory[line.ingredientId])||0),1)}));
}

function qualityScore(recipeId, ctx){
  const r=recipes[recipeId];if(!r)return 0;ctx=ctx||{};
  const freshness=Number(ctx.freshness==null?80:ctx.freshness);
  const staff=Number(ctx.staffSkill==null?50:ctx.staffSkill);
  const equipment=Number(ctx.equipmentScore==null?70:ctx.equipmentScore);
  const execution=Number(ctx.executionConsistency==null?72:ctx.executionConsistency);
  const difficulty=Math.max(1,r.skill||35);
  const skillFit=Math.min(100,staff/difficulty*70);
  return round(Math.max(0,Math.min(100,freshness*0.30+skillFit*0.32+equipment*0.16+execution*0.22)),1);
}

function substitutionAllowed(recipeId, originalIngredientId, substituteIngredientId){
  const r=recipes[recipeId];if(!r)return false;
  const a=pack.INGREDIENTS.find(x=>x.id===originalIngredientId),b=pack.INGREDIENTS.find(x=>x.id===substituteIngredientId);
  if(!a||!b)return false;
  if(a.category===b.category)return true;
  const compatible={leafy:['fruit_veg'],fruit_veg:['leafy'],pork:['poultry'],poultry:['pork'],flour_noodle:['rice_grain'],rice_grain:['flour_noodle']};
  return (compatible[a.category]||[]).includes(b.category);
}

module.exports={scaleRecipe,maxCraftable,consumeForOrder,missingIngredients,qualityScore,substitutionAllowed,recipeVariableCost:rules.recipeVariableCost};
