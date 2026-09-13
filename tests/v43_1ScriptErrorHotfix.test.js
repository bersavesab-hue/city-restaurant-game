'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(
  ROOT,
  'src/scenes/shopScene.js'
);

const source = fs.readFileSync(
  file,
  'utf8'
);

assert.ok(
  source.includes(
    'V43_1_PROPERTY_CONSTANTS_HOTFIX'
  ),
  'V43.1 热修标记不存在'
);

assert.ok(
  /const\s+V43_PROPERTY_ICONS\s*=/.test(source),
  'V43_PROPERTY_ICONS 仍未定义'
);

assert.ok(
  /const\s+V43_STOREFRONTS\s*=/.test(source),
  'V43_STOREFRONTS 仍未定义'
);

const constantsPos =
  source.indexOf(
    'const V43_PROPERTY_ICONS'
  );

const enterUsePos =
  source.indexOf(
    'Object.values(V43_PROPERTY_ICONS)'
  );

assert.ok(
  constantsPos >= 0 &&
  enterUsePos >= 0 &&
  constantsPos < enterUsePos,
  'V43_PROPERTY_ICONS 必须先定义再使用'
);

for (const token of [
  'storefront_1.png',
  'storefront_2.png',
  'storefront_3.png',
  'storefront_4.png',
  'storefront_5.png'
]) {
  assert.ok(
    source.includes(token),
    '缺失房源图片路径：' + token
  );
}

assert.ok(
  source.includes(
    'V43_PROPERTY_IMAGE_REBUILD'
  ),
  '不能破坏 V43 图片化重构'
);

console.log(
  'V43.1 script error hotfix tests passed'
);
