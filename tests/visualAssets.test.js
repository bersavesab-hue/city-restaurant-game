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

const visualSystemText =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/ui/visualAssetSystem.js'
    ),
    'utf8'
  );

const storeText =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
    ),
    'utf8'
  );

const districtText =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/districtScene.js'
    ),
    'utf8'
  );

const renovationText =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/renovationScene.js'
    ),
    'utf8'
  );

for (
  const required of [
    'visual_storefront_hero',
    'visual_district_banner',
    'visual_table_2',
    'visual_stove',
    'visual_fridge'
  ]
) {
  assert.ok(
    visualSystemText.includes(
      required
    ),
    '视觉系统缺少资源键：' +
      required
  );
}

assert.ok(
  storeText.includes(
    ".loadGroup(\n        'store'"
  ) ||
  storeText.includes(
    ".loadGroup(\n          'store'"
  ),
  '门店页必须主动加载门店图片'
);

assert.ok(
  storeText.includes(
    'premium_store_hero'
  ) &&
  storeText.includes(
    'premium_room_1'
  ),
  '门店页必须实际绘制门店高保真图片'
);

assert.ok(
  districtText.includes(
    ".loadGroup(\n        'district'"
  ) ||
  districtText.includes(
    ".loadGroup(\n          'district'"
  ),
  '商圈页必须主动加载商圈图片'
);

assert.ok(
  districtText.includes(
    'premium_district_header'
  ) &&
  districtText.includes(
    'premium_avatar_1'
  ),
  '商圈页必须实际绘制商圈高保真素材'
);

assert.ok(
  renovationText.includes(
    ".loadGroup(\n        'renovation'"
  ) ||
  renovationText.includes(
    ".loadGroup(\n          'renovation'"
  ),
  '装修页必须主动加载装修素材'
);

assert.ok(
  renovationText.includes(
    "'visual_table_'"
  ) ||
  (
    renovationText.includes(
      "'visual_table_2'"
    ) &&
    renovationText.includes(
      "'visual_table_8'"
    )
  ),
  '装修平面图必须实际使用桌椅图片'
);

assert.ok(
  renovationText.includes(
    'visual_stove'
  ) &&
  renovationText.includes(
    'visual_fridge'
  ),
  '装修平面图必须实际使用后厨设备图片'
);

console.log(
  'V18 visual runtime loading tests passed'
);
