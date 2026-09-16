'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const source = fs.readFileSync(
  path.join(ROOT, 'src/scenes/storeScene.js'),
  'utf8'
);

assert.ok(
  source.includes('V36_STORE_THREE_STATE_PHASE1'),
  'V36门店三状态第一阶段必须存在'
);

for (const token of [
  "return 'no-shop'",
  "return 'operating'",
  "return 'preparing'",
  'renderNoShop(ctx)',
  'renderPreparing(',
  'renderOperating('
]) {
  assert.ok(
    source.includes(token),
    '缺少门店状态结构：' + token
  );
}

assert.ok(
  source.includes("require('../property/propertyMarketSystem.js')"),
  '无门店页必须使用真实动态房源市场'
);

assert.ok(
  source.includes('getDistrictSummary') &&
  source.includes('getLiveListings'),
  '推荐商圈与房源必须来自真实市场数据'
);

assert.ok(
  source.includes('estimateFirstStore'),
  '无门店页必须有动态开店预算估算'
);

assert.ok(
  source.includes('getReadiness') &&
  source.includes('getRenovationProgress'),
  '筹备页必须联动真实装修/证照/员工/设备状态'
);

assert.ok(
  source.includes('compactMoney'),
  '门店页金额必须支持紧凑显示'
);

for (const token of [
  'premium_store_hero',
  'premium_room_1',
  'premium_advice_renovation',
  'premium_advice_permit',
  'premium_advice_staff',
  'premium_explore_banner'
]) {
  assert.ok(
    source.includes(token),
    '资料库导入的门店素材不能丢：' + token
  );
}

assert.ok(
  source.includes("'shop:rename'") &&
  source.includes("'room:rename:'") &&
  source.includes("'room:manage'"),
  '门店名和包厢名自定义能力必须保留'
);

assert.ok(
  source.includes(
    "renovation:\n          'renovation'"
  ) &&
  source.includes("'module:finance'"),
  '装修场景路由与资金恢复入口必须保留'
);

assert.ok(
  !source.includes("'module:renovation'"),
  '装修入口必须继续通过动态 module:id 生成，不能硬编码 module:renovation'
);

assert.ok(
  source.includes("['research', '菜单'") &&
  source.includes("['supply', '库存采购'") &&
  source.includes("['business', '经营数据'"),
  '营业页必须保留菜单/供应链/数据快捷入口'
);

console.log('V36 store three-state phase1 regression tests passed');
