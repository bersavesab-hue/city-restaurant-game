'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const store = fs.readFileSync(
  path.join(ROOT, 'src/scenes/storeScene.js'),
  'utf8'
);

const androidBuilder = fs.readFileSync(
  path.join(ROOT, 'scripts/build-android-js-v060.js'),
  'utf8'
);

// visualAssets.test.js legacy formatting contract
assert.ok(
  store.includes(
    ".loadGroup(\n        'store'"
  ) ||
  store.includes(
    ".loadGroup(\n          'store'"
  ),
  'V36.2必须兼容旧visualAssets门店资源加载检查'
);

// storeV16.test.js legacy route contract
assert.ok(
  store.includes(
    "renovation:\n          'renovation'"
  ),
  'V36.2必须保留旧V16可识别的装修sceneMap路由'
);

// v20StoreRenovationRoute.test.js newer contract
assert.ok(
  !store.includes("'module:renovation'"),
  'V36.2不能硬编码module:renovation'
);

assert.ok(
  store.includes("'room:manage'"),
  '包厢装修入口不能丢'
);

assert.ok(
  store.includes('V36_STORE_THREE_STATE_PHASE1'),
  'V36三状态门店页不能丢'
);

// Current clean-base builder must fail on source or dependency errors.
assert.ok(
  androidBuilder.includes('source errors are fatal') &&
  androidBuilder.includes('找不到模块'),
  '安卓构建器必须拒绝失效源码和缺失依赖'
);

console.log(
  'V36.2 full legacy compatibility tests passed'
);
