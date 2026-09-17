'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname,'..');
const gameState = require('../src/core/gameState.js');
const progress = require('../src/progress/operatingProgressV0862.js');

gameState.reset();
gameState.addShop({id:'shop_v0862',name:'经营中心测试店',status:'open'});

const history = [
  {status:'closed',day:1,financial:{revenue:1200,profit:100,customers:25}},
  {status:'closed',day:2,financial:{revenue:1500,profit:180,customers:30}},
  {status:'closed',day:3,financial:{revenue:1800,profit:-20,customers:34}},
  {status:'closed',day:4,financial:{revenue:2100,profit:260,customers:40}}
];

const context = {day:4,history,memberCount:30,brandLevel:3,storeCount:1};
const view = progress.overview('shop_v0862',context);
assert.equal(view.version,'0.8.62');
assert.equal(view.weekly.length,3);
assert.equal(view.milestones.length,14);
assert.ok(view.weekly[0].completed,'4个营业日目标应完成');

const claim = progress.claimWeekly('shop_v0862','operate_4',context);
assert.ok(claim.ok);
assert.ok(claim.total>0);
assert.equal(progress.claimWeekly('shop_v0862','operate_4',context).ok,false,'周奖励不可重复领取');

const scene = fs.readFileSync(path.join(ROOT,'src/scenes/advancedManagementSceneV0862.js'),'utf8');
assert.ok(scene.includes("['marketing','营销']"));
assert.ok(scene.includes("['members','会员']"));
assert.ok(scene.includes("['procurement','采购']"));
assert.ok(scene.includes("['growth','成长']"));
assert.ok(scene.includes('startMarketingCampaign'));
assert.ok(scene.includes('compareSupplierQuotes'));
assert.ok(scene.includes('negotiateSupplierQuote'));
assert.ok(scene.includes('createManualPurchaseOrder'));
assert.ok(scene.includes('receiveManualPurchaseOrder'));

const router = fs.readFileSync(path.join(ROOT,'src/core/entryRouterV0810.js'),'utf8');
const hub = fs.readFileSync(path.join(ROOT,'src/scenes/featureHubSceneV0810.js'),'utf8');
const main = fs.readFileSync(path.join(ROOT,'src/main.js'),'utf8');
assert.ok(router.includes('advancedManagement'));
assert.ok(hub.includes("['advancedManagement', '经营中心']"));
assert.ok(main.includes("require('./scenes/advancedManagementSceneV0862.js')"));
assert.ok(main.includes("'advancedManagement'"));

console.log('V0.8.62 advanced management player wiring tests passed');
