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

const requiredAssets = [
  'assets/images/map/city_base_01.png',
  'assets/images/premium/store/store_hero.jpg',
  'assets/images/premium/store/room_1.jpg',
  'assets/images/premium/store/room_2.jpg',
  'assets/images/premium/store/room_3.jpg',
  'assets/images/premium/store/advice_renovation.jpg',
  'assets/images/premium/store/advice_permit.jpg',
  'assets/images/premium/store/advice_staff.jpg',
  'assets/images/premium/store/explore_banner.jpg',
  'assets/images/premium/district/header_city.jpg',
  'assets/images/premium/district/avatar_1.jpg',
  'assets/images/premium/district/avatar_2.jpg',
  'assets/images/premium/district/avatar_3.jpg',
  'assets/images/premium/district/avatar_4.jpg',
  'assets/images/premium/renovation/header_interior.jpg',
  'assets/images/premium/renovation/template_1.jpg',
  'assets/images/premium/renovation/template_2.jpg',
  'assets/images/premium/renovation/template_3.jpg',
  'assets/images/premium/renovation/table2.jpg',
  'assets/images/premium/renovation/table4.jpg',
  'assets/images/premium/renovation/table6.jpg',
  'assets/images/premium/renovation/table8.jpg'
];

for (
  const asset of
  requiredAssets
) {
  assert.ok(
    fs.existsSync(
      path.join(
        ROOT,
        asset
      )
    ),
    '缺少V14高保真运行资源：' +
      asset
  );
}

const main =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/main.js'
    ),
    'utf8'
  );

const store =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
    ),
    'utf8'
  );

const district =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/districtScene.js'
    ),
    'utf8'
  );

const renovation =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/renovationScene.js'
    ),
    'utf8'
  );

assert.ok(
  main.includes(
    "assets/images/map/city_base_01.png"
  ),
  '首页必须使用原始PNG地图'
);

assert.ok(
  store.includes(
    "loadGroup(\n        'premiumStore'"
  ),
  '门店页没有加载高保真图片组'
);

assert.ok(
  store.includes(
    'premium_store_hero'
  ) &&
  store.includes(
    'premium_room_1'
  ) &&
  store.includes(
    'premium_advice_staff'
  ),
  '门店页没有实际绘制高保真素材'
);

assert.ok(
  district.includes(
    "loadGroup(\n        'premiumDistrict'"
  ),
  '商圈页没有加载高保真图片组'
);

assert.ok(
  district.includes(
    'premium_district_header'
  ) &&
  district.includes(
    'premium_avatar_1'
  ),
  '商圈页没有实际绘制高保真素材'
);

assert.ok(
  !district.includes(
    'premium_demand_ambience'
  ),
  'V14商圈时段需求禁止叠加带字效果图背景，否则会与动态数据重影'
);

assert.ok(
  renovation.includes(
    "loadGroup(\n          'premiumRenovation'"
  ),
  '装修页没有加载高保真图片组'
);

assert.ok(
  renovation.includes(
    'premium_floor_texture'
  ) &&
  renovation.includes(
    'premium_template_1'
  ) &&
  renovation.includes(
    'premium_table_4'
  ),
  '装修页没有实际绘制高保真素材'
);

assert.ok(
  renovation.includes(
    'template:apply:'
  ) &&
  renovation.includes(
    'room:rename:'
  ),
  '视觉重构不能破坏模板与包厢自定义功能'
);

assert.ok(
  renovation.includes(
    'template:quick-save'
  ) &&
  renovation.includes(
    'template:save-as'
  ),
  'V14保存模板和另存模板必须是真实可交互按钮'
);

console.log(
  'V14 premium visual fidelity tests passed'
);
