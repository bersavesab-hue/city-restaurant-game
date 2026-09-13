'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const store = fs.readFileSync(
  path.join(ROOT, 'src/scenes/storeScene.js'),
  'utf8'
);

const androidTest = fs.readFileSync(
  path.join(ROOT, 'tests/v21AndroidBundle.test.js'),
  'utf8'
);

// V16 / V18 / V20 historical contracts
assert.ok(store.includes('V16_STORE_UI_REWRITE'));
assert.ok(store.includes('V36_STORE_THREE_STATE_PHASE1'));
assert.ok(store.includes('V37_STORE_FINAL_FOUR_MODE'));

for (const token of [
  'premium_store_hero',
  'premium_room_1',
  'premium_advice_renovation',
  'premium_advice_permit',
  'premium_advice_staff',
  'premium_explore_banner',
  "'shop:rename'",
  "'room:rename:'",
  "'room:manage'",
  "'module:finance'"
]) {
  assert.ok(
    store.includes(token),
    '历史门店契约缺少：' + token
  );
}

assert.ok(
  store.includes(
    ".loadGroup(\n        'store'"
  ) ||
  store.includes(
    ".loadGroup(\n          'store'"
  ),
  '旧视觉测试必须识别store资源加载'
);

assert.ok(
  store.includes(
    "renovation:\n          'renovation'"
  ),
  '旧V16测试必须识别装修sceneMap'
);

assert.ok(
  !store.includes("'module:renovation'"),
  'V20.1禁止硬编码module:renovation'
);

// V36 exact blockers
assert.ok(
  store.includes('getReadiness') &&
  store.includes('getRenovationProgress'),
  '筹备状态必须通过真实系统联动'
);

assert.ok(
  store.includes("['research', '菜单'") &&
  store.includes("['supply', '库存采购'") &&
  store.includes("['business', '经营数据'"),
  'V36快捷入口历史契约必须保留'
);

// V37 four-mode
for (const token of [
  "return 'no-shop'",
  "return 'multi'",
  "return 'operating'",
  "return 'preparing'",
  'renderNoShop(ctx)',
  'renderMulti(ctx)',
  'renderOperating(',
  'renderPreparing('
]) {
  assert.ok(
    store.includes(token),
    'V37四态缺少：' + token
  );
}

// Android dual-workflow robustness
assert.ok(
  androidTest.includes('!fs.existsSync(esbuild)'),
  '轻量测试缺少esbuild时必须走语法回退'
);

assert.ok(
  androidTest.includes('attempt <= 3') &&
  androidTest.includes(
    "typeof result.status === 'number'"
  ),
  '正式esbuild测试必须保留有限重试'
);

console.log(
  'V37.1 complete historical compatibility tests passed'
);
