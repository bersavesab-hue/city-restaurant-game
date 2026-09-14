'use strict';
const assert=require('assert');
const food=require('../src/food');
const {pack,rules,recipes,menu}=food;

assert(pack.INGREDIENTS.length>=190,'食材池过少: '+pack.INGREDIENTS.length);
assert(pack.RECIPES.length>=96,'配方过少');
assert(pack.COOKING_METHODS.length>=30,'烹饪方式过少');
assert(pack.MENU_STRATEGIES.length>=20,'菜单策略过少');
assert(pack.buildVariantCatalog().length>=288,'菜品变体不足');

const tomato=pack.RECIPES.find(x=>x.name==='番茄炒蛋');
assert(tomato&&tomato.ingredients.length>=5);
const c=rules.recipeVariableCost(tomato,{marketIndex:1,portionId:'single'});
assert(c>0);
const floor=rules.minimumSafePrice(tomato,{marketIndex:1,portionId:'single'});
assert(floor>c);
assert(rules.collectAllergens(tomato).includes('egg'));

const item=menu.createMenuItem(tomato.id,{listPrice:18});
const fit1=menu.customerFit(item,{budget:30,flavors:['番茄'],allergens:[]},{staffSkill:60,equipmentScore:70});
const fit2=menu.customerFit(item,{budget:8,flavors:[],allergens:[]},{staffSkill:60,equipmentScore:70});
assert(fit1>fit2,'预算和口味没有影响选菜');
const eggAllergy=menu.customerFit(item,{budget:30,allergens:['egg']},{});
assert.strictEqual(eggAllergy,0,'过敏硬限制失效');

const inv={};tomato.ingredients.forEach(x=>inv[x.ingredientId]=5000);
assert(recipes.maxCraftable(tomato.id,inv,'single')>0);
const used=recipes.consumeForOrder(tomato.id,inv,2,'single');
assert(used.ok&&used.consumed.length===tomato.ingredients.length);
assert(recipes.qualityScore(tomato.id,{freshness:90,staffSkill:80,equipmentScore:85,executionConsistency:90})>70);

item.stats={orders:100,revenue:2500,variableCost:900,discount:0,refunds:0,ratingSum:0,ratingCount:0};
assert.strictEqual(menu.classifyMenuEngineering(item,{orders:50,contribution:8}),'star');
assert(menu.priceWarning(menu.createMenuItem(tomato.id,{listPrice:1}),{marketIndex:1}).level==='danger');
assert(menu.updateReferencePrice(20,50)<50,'参考价不应一天跳到现价');

console.log('foodMenuFullPackV100.test.js PASS',JSON.stringify({ingredients:pack.INGREDIENTS.length,recipes:pack.RECIPES.length,variants:pack.buildVariantCatalog().length,methods:pack.COOKING_METHODS.length,strategies:pack.MENU_STRATEGIES.length}));
