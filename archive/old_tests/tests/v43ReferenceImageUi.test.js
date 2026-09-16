'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const store = fs.readFileSync(
  path.join(ROOT, 'src/scenes/storeScene.js'),
  'utf8'
);

const market = fs.readFileSync(
  path.join(ROOT, 'src/scenes/shopScene.js'),
  'utf8'
);

assert.ok(store.includes('V43_REFERENCE_IMAGE_UI'));
assert.ok(market.includes('V43_PROPERTY_IMAGE_REBUILD'));

assert.ok(
  store.includes('V43_REFERENCE_ICONS') &&
  store.includes("v43_icon_"),
  '门店首页必须真正加载资料库图标'
);

assert.ok(
  market.includes('V43_PROPERTY_ICONS') &&
  market.includes('V43_STOREFRONTS'),
  '房源市场必须真正加载资料库图标和店铺图'
);

assert.ok(
  market.includes("'v43_storefront_'") &&
  market.includes('ctx.drawImage('),
  '房源列表与详情必须实际绘制店铺图片'
);

assert.ok(
  market.includes("'v43_property_header'"),
  '房源市场顶部必须使用图片背景'
);

assert.ok(
  market.includes('Math.max(\n        4.8,'),
  '房源页小字号不能继续强制到7.3px'
);

const manifest = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      'assets/images/v43_reference_icons/manifest.json'
    ),
    'utf8'
  )
);

assert.strictEqual(
  manifest.generated,
  false
);

assert.ok(
  manifest.count >= 35,
  '应从资料库拆出足够的真实图标资源'
);

console.log('V43 reference image UI tests passed');
