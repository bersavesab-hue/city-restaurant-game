'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(__dirname, '..');

const scene =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/renovationScene.js'
    ),
    'utf8'
  );

assert.ok(
  scene.includes(
    'V45_LIBRARY_RENOVATION_PHASE1'
  ),
  'V45装修标记不存在'
);

assert.ok(
  scene.includes(
    "require('../core/resourceManager.js')"
  ),
  '装修页必须接入resourceManager'
);

assert.ok(
  scene.includes(
    'V45_RENO_RESOURCES'
  ) &&
  scene.includes(
    "'v45-renovation-library'"
  ),
  '装修资料库资源必须实际加载'
);

for (const token of [
  'v45_style_natural',
  'v45_style_chinese',
  'v45_style_modern',
  'v45_style_night',
  'v45_style_business',
  'v45_table_2',
  'v45_table_4',
  'v45_table_6',
  'v45_table_8',
  'v45_stove',
  'v45_fridge',
  'v45_layout_kitchen',
  'v45_layout_dining',
  'v45_layout_private_medium'
]) {
  assert.ok(
    scene.includes(token),
    '装修页缺少资料库资源：' +
      token
  );
}

for (const bad of [
  '👨‍🍳 后厨',
  '🍴 堂食区',
  '🛋',
  '💡',
  '🚪',
  '🪑',
  '🔨 确认方案并开始施工',
  '💾 保存模板'
]) {
  assert.ok(
    !scene.includes(bad),
    '装修页仍残留Emoji视觉：' +
      bad
  );
}

assert.ok(
  scene.includes(
    'V45_HALL_STYLE_VISUAL'
  ),
  '大厅风格必须与实际资料库风格图联动'
);

assert.ok(
  scene.includes(
    "'万'"
  ) &&
  scene.includes(
    "'亿'"
  ),
  '装修金额必须统一万/亿格式'
);

const requiredFiles = [
  'assets/images/library_store/renovation/styles/natural.png',
  'assets/images/library_store/renovation/styles/chinese.png',
  'assets/images/library_store/renovation/styles/modern.png',
  'assets/images/library_store/renovation/styles/night_market.png',
  'assets/images/library_store/renovation/styles/business.png',
  'assets/images/library_store/renovation/furniture/table_2.png',
  'assets/images/library_store/renovation/furniture/table_4.png',
  'assets/images/library_store/renovation/furniture/stove.png',
  'assets/images/library_store/renovation/layouts/kitchen.png',
  'assets/images/library_store/renovation/layouts/dining.png'
];

for (
  const rel
  of requiredFiles
) {
  assert.ok(
    fs.existsSync(
      path.join(
        ROOT,
        rel
      )
    ),
    '仓库缺少装修资料库资源：' +
      rel
  );
}

console.log(
  'V45 renovation phase1 tests passed'
);
