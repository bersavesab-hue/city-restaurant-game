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

const main =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/main.js'
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

const store =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
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
    'V18_CITY_UI_REWRITE'
  ),
  '城市首页V18补丁未应用'
);

assert.ok(
  district.includes(
    'V18_DISTRICT_UI_REWRITE'
  ),
  '商圈详情必须是V18全量重写'
);

assert.ok(
  store.includes(
    'V16_STORE_UI_REWRITE'
  ),
  '累计包必须包含V16门店全量重写'
);

assert.ok(
  renovation.includes(
    'V17_RENOVATION_UI_REWRITE'
  ),
  '累计包必须包含V17装修全量重写'
);

for (
  const marker of [
    'district_marker_gold',
    'district_marker_blue',
    'district_marker_orange',
    'district_marker_purple',
    'district_marker_green',
    'district_marker_red'
  ]
) {
  assert.ok(
    main.includes(
      marker
    ),
    '首页缺少商圈图标资源：' +
      marker
  );
}

assert.ok(
  main.includes(
    'V18首页不再使用左右两排页游式大按钮'
  ),
  '首页必须彻底移除两侧旧大按钮'
);

assert.ok(
  district.includes(
    "'open-here'"
  ) &&
  district.includes(
    "'market'"
  ),
  '商圈详情必须保留开店与房源入口'
);

assert.ok(
  !district.includes(
    'premium_demand_ambience'
  ),
  '商圈页禁止重新使用带字时段背景'
);

console.log(
  'V18 core four-page rewrite tests passed'
);
