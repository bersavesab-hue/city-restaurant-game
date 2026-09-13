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
    'V18_CITY_UI_REWRITE'
  ),
  '首页必须升级到V18正式UI'
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
  '底部导航必须保留独立装修入口'
);

assert.ok(
  main.includes(
    'V18首页不再使用左右两排页游式大按钮'
  ),
  '首页必须移除旧侧边工具按钮'
);

assert.ok(
  district.includes(
    'V18_DISTRICT_UI_REWRITE'
  ) &&
  district.includes(
    "'open-here'"
  ),
  '商圈页必须是V18重写并保留开店入口'
);

assert.ok(
  store.includes(
    'V16_STORE_UI_REWRITE'
  ) &&
  store.includes(
    "'room:rename:'"
  ) &&
  store.includes(
    "'room:manage'"
  ),
  '门店页必须是V16重写并保留包厢自定义'
);

assert.ok(
  renovation.includes(
    'V17_RENOVATION_UI_REWRITE'
  ) &&
  renovation.includes(
    "'template:save'"
  ) &&
  renovation.includes(
    "'template:save-as'"
  ) &&
  renovation.includes(
    "'rooms'"
  ),
  '装修页必须是V17重写并保留真实模板/包厢功能'
);

console.log(
  'V18 UI compatibility tests passed'
);
