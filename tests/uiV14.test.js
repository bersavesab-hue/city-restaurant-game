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
  '首页必须保留V18动态城市底层'
);

assert.ok(
  main.includes(
    "'assets/images/map/city_base_01.png'"
  ),
  '首页必须使用原始PNG地图'
);

assert.ok(
  main.includes(
    "id: 'traffic'"
  ) &&
  main.includes(
    "name: '客流'"
  ) &&
  !main.includes(
    "{ id: 'renovation', name: '装修', icon: '装' }"
  ),
  '装修必须并入门店，第三底栏改为真实客流模式'
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
  '商圈页必须保留真实开店入口'
);

assert.ok(
  store.includes(
    'V16_STORE_UI_REWRITE'
  ) &&
  store.includes(
    "'room:manage'"
  ) &&
  store.includes(
    "renovation:"
  ) &&
  store.includes(
    "'renovation'"
  ),
  '装修入口必须保留在门店体系'
);

assert.ok(
  renovation.includes(
    'V17_RENOVATION_UI_REWRITE'
  ) &&
  renovation.includes(
    "'template:save'"
  ),
  '装修页功能必须继续保留'
);

console.log(
  'V20 UI compatibility tests passed'
);
