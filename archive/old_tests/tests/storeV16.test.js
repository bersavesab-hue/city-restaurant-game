'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const source =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
    ),
    'utf8'
  );

assert.ok(
  source.includes(
    'V16_STORE_UI_REWRITE'
  ),
  '门店页必须使用V16全量重写版本'
);

for (
  const token of [
    'premium_store_hero',
    'premium_room_1',
    'premium_advice_renovation',
    'premium_advice_permit',
    'premium_advice_staff',
    'premium_explore_banner'
  ]
) {
  assert.ok(
    source.includes(
      token
    ),
    '门店页缺少高保真素材：' +
      token
  );
}

assert.ok(
  source.includes(
    "'shop:rename'"
  ) &&
  source.includes(
    "'room:rename:'"
  ) &&
  source.includes(
    "'room:manage'"
  ),
  '门店与包厢自定义功能不能丢'
);

assert.ok(
  source.includes(
    "'module:renovation'"
  ) ||
  source.includes(
    "renovation:\n          'renovation'"
  ),
  '装修入口必须保留'
);

assert.ok(
  source.includes(
    "'module:finance'"
  ),
  '资金软锁恢复入口必须保留'
);

console.log(
  'V16 store page rewrite tests passed'
);
