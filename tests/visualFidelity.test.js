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
  'assets/images/premium/renovation/floor_texture.jpg',
  'assets/images/premium/renovation/template_1.jpg',
  'assets/images/premium/renovation/template_2.jpg',
  'assets/images/premium/renovation/template_3.jpg'
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
    '缺少V18高保真运行资源：' +
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
    'V16_STORE_UI_REWRITE'
  ) &&
  store.includes(
    'premium_store_hero'
  ) &&
  store.includes(
    'premium_room_1'
  ) &&
  store.includes(
    'premium_advice_staff'
  ),
  '门店页必须使用V16正式高保真页面'
);

assert.ok(
  district.includes(
    'V18_DISTRICT_UI_REWRITE'
  ) &&
  district.includes(
    'premium_district_header'
  ) &&
  district.includes(
    'premium_avatar_1'
  ),
  '商圈页必须使用V18正式高保真页面'
);

assert.ok(
  !district.includes(
    'premium_demand_ambience'
  ),
  '商圈时段需求禁止叠加带字效果图背景'
);

assert.ok(
  renovation.includes(
    'V17_RENOVATION_UI_REWRITE'
  ) &&
  renovation.includes(
    'premium_reno_header'
  ) &&
  renovation.includes(
    'premium_floor_texture'
  ) &&
  renovation.includes(
    'premium_template_1'
  ) &&
  renovation.includes(
    "'visual_table_'"
  ),
  '装修页必须使用V17正式高保真页面'
);

assert.ok(
  renovation.includes(
    "'template:save'"
  ) &&
  renovation.includes(
    "'template:save-as'"
  ) &&
  renovation.includes(
    "'template:apply:'"
  ) &&
  renovation.includes(
    "'room:rename:'"
  ),
  '视觉重构不能破坏模板与包厢自定义功能'
);

console.log(
  'V18 premium visual fidelity tests passed'
);
