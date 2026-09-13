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

function text(rel) {
  return fs.readFileSync(
    path.join(
      ROOT,
      rel
    ),
    'utf8'
  );
}

const main =
  text(
    'src/main.js'
  );

const district =
  text(
    'src/scenes/districtScene.js'
  );

const store =
  text(
    'src/scenes/storeScene.js'
  );

const renovation =
  text(
    'src/scenes/renovationScene.js'
  );

assert.ok(
  main.includes(
    'V14_GOLDEN_UI_MAIN'
  ),
  '首页V14补丁未应用'
);

assert.ok(
  main.includes(
    "'assets/images/map/city_base_01.png'"
  ),
  '首页必须使用原始PNG地图'
);

assert.ok(
  main.includes(
    "{ id: 'renovation', name: '装修', icon: '装' }"
  ),
  'V14底部导航必须有独立装修入口'
);

assert.ok(
  main.includes(
    'V14：首页取消两侧六个大按钮'
  ),
  '首页必须移除两侧山寨感工具按钮'
);

assert.ok(
  district.includes(
    'V14_GOLDEN_UI_DISTRICT'
  ),
  '商圈V14补丁未应用'
);

assert.ok(
  !district.includes(
    "'premium_demand_ambience'"
  ),
  '商圈时段需求禁止再叠带字背景图'
);

assert.ok(
  district.includes(
    "'open-here'"
  ),
  '商圈页必须存在选择该商圈开店入口'
);

assert.ok(
  store.includes(
    'V14_GOLDEN_UI_STORE'
  ),
  '门店V14补丁未应用'
);

assert.ok(
  store.includes(
    "'room:rename:'"
  ) &&
  store.includes(
    "'room:manage'"
  ),
  '门店页必须能直接管理/改名包厢'
);

assert.ok(
  renovation.includes(
    'V14_GOLDEN_UI_RENOVATION'
  ),
  '装修V14补丁未应用'
);

assert.ok(
  renovation.includes(
    "'template:quick-save'"
  ) &&
  renovation.includes(
    "'template:save-as'"
  ),
  '保存模板与另存模板必须是真实按钮'
);

assert.ok(
  renovation.includes(
    "page:\n                'rooms'"
  ) ||
  renovation.includes(
    "'rooms'"
  ),
  '装修页必须支持直接进入包厢编辑页'
);

console.log(
  'V14 golden UI integration tests passed'
);
