'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const source = fs.readFileSync(
  path.join(ROOT, 'src/scenes/storeScene.js'),
  'utf8'
);

// V16 store contract
assert.ok(
  source.includes('V16_STORE_UI_REWRITE'),
  'V16标记不能丢'
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
    '缺少资料库门店素材：' + token
  );
}

assert.ok(
  source.includes("'shop:rename'") &&
  source.includes("'room:rename:'") &&
  source.includes("'room:manage'"),
  '门店/包厢自定义入口不能丢'
);

assert.ok(
  source.includes(
    "renovation:\n          'renovation'"
  ),
  '装修sceneMap旧兼容格式必须存在'
);

assert.ok(
  source.includes("'module:finance'"),
  '周转金入口不能丢'
);

// V18 visualAssets contract
assert.ok(
  source.includes(
    ".loadGroup(\n        'store'"
  ) ||
  source.includes(
    ".loadGroup(\n          'store'"
  ),
  '门店必须主动加载store资源组'
);

// V20.1 contract
assert.ok(
  source.includes('renovation:') &&
  source.includes("'renovation'") &&
  source.includes("'room:manage'"),
  '装修场景路由必须存在'
);

assert.ok(
  !source.includes("'module:renovation'"),
  '禁止硬编码module:renovation'
);

// V36 new contract
for (const token of [
  "return 'no-shop'",
  "return 'preparing'",
  "return 'operating'",
  'renderNoShop(ctx)',
  'renderPreparing(',
  'renderOperating(',
  'getDistrictSummary',
  'getLiveListings',
  'getReadiness',
  'getRenovationProgress'
]) {
  assert.ok(
    source.includes(token),
    'V36三状态/动态联动缺少：' + token
  );
}

console.log(
  'V36.2 all store historical contracts passed'
);
