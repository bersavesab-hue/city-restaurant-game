'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const gameState=require('../src/core/gameState.js');
const customDish=require('../src/food/customDishSystemV120.js');
const foodQuality=require('../src/food/foodQuality.js');
const menuEngine=require('../src/food/menuEngineV10.js');
const recipeEngine=require('../src/food/recipeEngineV10.js');
const operations=require('../src/operations/operationsStoreV080.js');

gameState.reset();
gameState.setCash(100000);
gameState.addShop({id:'lab_shop',name:'研发测试店',districtId:'university',status:'open'});

const first=customDish.getOverview('lab_shop');
assert.strictEqual(first.version,'1.2.0');
assert.strictEqual(first.candidates.length,3,'每日必须生成3个研发候选');
assert.strictEqual(new Set(first.candidates.map(x=>x.id)).size,3,'研发候选ID不能重复');
assert.ok(first.candidates.every(x=>x.researchCost>0&&x.researchDays>=1),'研发方案必须有真实成本和时间');
assert.strictEqual(foodQuality.QUALITY.length,6,'菜品品质必须为六档');
assert.strictEqual(foodQuality.getQuality(94).name,'大师');

const candidate=first.candidates[0];
const cashBefore=gameState.getPlayer().cash;
const started=customDish.startResearch('lab_shop',candidate.id);
assert.ok(started.ok,'自研菜必须可以启动');
assert.strictEqual(gameState.getPlayer().cash,cashBefore-candidate.researchCost,'研发成本必须真实扣款');

const store=gameState.getBusiness().customDishLab.shops.lab_shop;
store.activeProject.finishMinute=0;
const synced=customDish.sync('lab_shop');
assert.ok(synced.changed&&synced.completed,'到期后必须产出完成菜品');
assert.strictEqual(store.library.length,1,'完成品必须进入配方库');
const dish=store.library[0];
assert.ok(dish.score>=45&&dish.score<=100);
assert.ok(dish.qualityId&&dish.qualityName);
assert.ok(dish.variant&&Array.isArray(dish.variant.ingredients)&&dish.variant.ingredients.length>0);

const menuItem=menuEngine.createMenuItem(dish.baseRecipeId,{name:dish.name,listPrice:dish.recommendedPrice,customDish:dish});
const baseLines=recipeEngine.scaleRecipe(dish.baseRecipeId,1,'single');
const customLines=recipeEngine.scaleMenuItem(menuItem,1);
assert.strictEqual(customLines.length,baseLines.length,'自研菜必须仍可进入真实库存消耗链');
assert.ok(recipeEngine.qualityScoreForMenuItem(menuItem,{freshness:85,staffSkill:70,equipmentScore:75})>0);

const scoreBefore=dish.score;
const improved=customDish.improveDish('lab_shop',dish.id,'taste');
assert.ok(improved.ok,'完成菜品必须可以继续优化');
assert.ok(improved.dish.score>scoreBefore,'优化必须提升菜品研发分');

operations.resetCache();
operations.ensureShopState('lab_shop');
const added=operations.addCustomDishToMenu('lab_shop',dish.id,{});
assert.ok(added.ok,'自研完成品必须可以加入真实菜单');
assert.ok(added.item.customDish&&added.item.customDish.id===dish.id,'菜单项必须保留自研菜配方数据');
assert.ok(operations.estimateMenuItemCost('lab_shop',added.item)>0,'自研菜必须进入真实成本核算');
assert.ok(operations.menuTargets(operations.getRuntime('lab_shop'),2),'自研菜必须进入真实采购目标计算');

const scene=fs.readFileSync(path.join(__dirname,'../src/scenes/researchScene.js'),'utf8');
assert.ok(scene.includes('菜品研发')&&scene.includes('配方库')&&scene.includes('招牌菜'),'菜单页必须提供四级菜品经营入口');
assert.ok(scene.includes('startCustomDishResearch')&&scene.includes('addCustomDishToMenu'),'研发UI必须连接真实经营方法');

console.log('customDishSystemV120.test.js passed');
