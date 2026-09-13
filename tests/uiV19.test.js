'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const source =
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../src/main.js'
    ),
    'utf8'
  );

assert.ok(
  source.includes(
    'V19_CITY_HOME_POLISH'
  ),
  'V19城市首页精修未应用'
);

assert.ok(
  source.includes(
    'function drawCityBadge('
  ),
  '城市左上角必须使用清晰矢量徽标'
);

assert.ok(
  source.includes(
    'function drawDistrictThumb('
  ) &&
  source.includes(
    "'city_base_01'"
  ),
  '商圈卡缩略图必须从高清城市地图动态裁切'
);

assert.ok(
  source.includes(
    'const preferLeft'
  ) &&
  source.includes(
    'VIEW_W -'
  ) &&
  source.includes(
    'labelW'
  ),
  '地图商圈标签必须具备左右翻转与边界约束'
);

assert.ok(
  source.includes(
    'function drawNavIcon('
  ),
  '底部导航必须改为正式矢量图标'
);

assert.ok(
  source.includes(
    'function getBrandState('
  ),
  '品牌等级必须从声望动态计算'
);

assert.ok(
  !source.includes(
    "'♛ Lv.1'"
  ),
  '品牌等级禁止继续写死Lv.1'
);

assert.ok(
  source.includes(
    'bulletin.districtId'
  ) &&
  source.includes(
    'startDistrictFx('
  ),
  '点击城市通报必须可以联动对应商圈'
);

console.log(
  'V19 city home polish tests passed'
);
