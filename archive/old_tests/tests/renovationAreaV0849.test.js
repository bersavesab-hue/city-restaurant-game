'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const gameState = require('../src/core/gameState.js');
const renovationSystem = require('../src/renovation/renovationSystem.js');

gameState.reset();
gameState.setCash(2000000);

gameState.addShop({
  id: 'v0849_area_shop',
  name: '面积测试店',
  status: 'leased_pending_renovation',
  grossArea: 180,
  usableArea: 147,
  floor: '1-2层',
  frontage: 8.5,
  independentToilet: true
});

const plan = renovationSystem.ensurePlan('v0849_area_shop');

// Simulate a stale save whose rounded floor data no longer matches the lease.
const stored = gameState.getRenovations().v0849_area_shop;
stored.floors[0].area = 80;
stored.floors[1].area = 80;

const repaired = renovationSystem.ensurePlan('v0849_area_shop');
const repairedTotal = repaired.floors.reduce((sum, floor) => sum + floor.area, 0);

assert.ok(
  Math.abs(repairedTotal - 147) < 0.01,
  '各楼层面积之和必须自动校正为房源可用面积'
);

renovationSystem.setZoneRatios(
  'v0849_area_shop',
  0,
  {
    kitchenRatio: 0.42,
    storageRatio: 0.18,
    serviceRatio: 0.20
  }
);

const clamped = renovationSystem.getMetrics('v0849_area_shop');
const floor = clamped.floors[0];
const zoneSum =
  floor.kitchenArea +
  floor.storageArea +
  floor.serviceArea +
  floor.diningArea;

assert.ok(
  Math.abs(zoneSum - floor.area) <= 0.2,
  '后厨、仓储、服务和堂食面积必须与本层面积闭合'
);

assert.ok(
  floor.diningArea >= floor.minimumDiningArea - 0.1,
  '拖动分区时必须保留最小堂食面积'
);

assert.ok(
  floor.structuralReservedArea > 0,
  '楼梯、卫生间、柱体和门口净空必须参与面积核算'
);

assert.ok(
  floor.effectiveDiningArea <= floor.diningArea,
  '房型效率不得凭空增加可摆面积'
);

const beforeTables = floor.tables['8'];
for (let i = 0; i < 50; i++) {
  renovationSystem.adjustTable('v0849_area_shop', 0, 8, 1);
}

const packed = renovationSystem.getMetrics('v0849_area_shop').floors[0];

assert.ok(
  packed.tables['8'] >= beforeTables,
  '面积充足时仍应允许添加餐桌'
);

assert.ok(
  packed.remainingArea >= -0.01,
  '餐桌不得突破扣除结构净空后的可摆面积'
);

assert.ok(
  Object.values(packed.tables).reduce((sum, count) => sum + count, 0) <=
    packed.usableDiningSlots.length,
  '餐桌数量不得超过真实分区中的可落位点'
);

const beforeUpgradeMetrics = renovationSystem.getMetrics('v0849_area_shop');
const shop = renovationSystem.getShop('v0849_area_shop');

stored.status = 'completed';
stored.construction = {
  snapshot: beforeUpgradeMetrics,
  paid: beforeUpgradeMetrics.totalCost,
  contractor: { name: '旧施工队', days: 8 }
};
shop.status = 'open';

const upgrade = renovationSystem.beginUpgrade('v0849_area_shop');

assert.ok(upgrade.ok, '完工后必须能够重新进入升级装修编辑器');
assert.strictEqual(stored.status, 'draft', '升级装修应回到可编辑状态');
assert.strictEqual(stored.isUpgrade, true, '升级装修必须保留差额计价标记');

const upgradeQuotes = renovationSystem.getContractorQuotes('v0849_area_shop');

assert.ok(
  upgradeQuotes.every(quote => quote.price < beforeUpgradeMetrics.totalCost),
  '升级装修报价必须按改造差额计算，不能重复收取整店造价'
);

renovationSystem.selectContractor('v0849_area_shop', upgradeQuotes[0].id);
const upgradeStart = renovationSystem.startConstruction('v0849_area_shop');

assert.ok(upgradeStart.ok, '营业中的完工门店必须可以开始升级装修');
assert.strictEqual(stored.construction.upgrade, true, '升级施工必须保留原门店状态');

stored.construction.startMinute = -2;
stored.construction.finishMinute = -1;
renovationSystem.updateShop('v0849_area_shop');

assert.strictEqual(stored.status, 'completed', '升级施工完成后应恢复完工状态');
assert.strictEqual(shop.status, 'open', '升级施工完成后不得让营业门店重新走证照流程');

const sceneSource = fs.readFileSync(
  path.join(__dirname, '../src/scenes/renovationScene.js'),
  'utf8'
);

const mainSource = fs.readFileSync(
  path.join(__dirname, '../src/main.js'),
  'utf8'
);

for (const token of [
  'V0849_AREA_TRUTH_RENOVATION_UI',
  '真实面积预览',
  '结构/门口净空',
  'handleTouchStart(',
  'handleTouchMove(',
  'preview:close',
  'renovation:upgrade'
]) {
  assert.ok(sceneSource.includes(token), '装修面积界面缺失：' + token);
}

assert.ok(
  mainSource.includes('api.onTouchStart') &&
    mainSource.includes('api.onTouchMove'),
  '运行时必须转发拖动手势'
);

console.log('V0.8.49 renovation area truth tests passed');
