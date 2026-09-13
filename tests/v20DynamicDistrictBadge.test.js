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

const functionStart =
  source.indexOf(
    'function getDistrictVisualMeta('
  );

assert.ok(
  functionStart >= 0,
  '必须存在商圈动态视觉元数据函数'
);

const functionEnd =
  source.indexOf(
    'function drawDistrictPictogram(',
    functionStart
  );

assert.ok(
  functionEnd > functionStart,
  '商圈动态视觉元数据函数边界异常'
);

const body =
  source.slice(
    functionStart,
    functionEnd
  );

const hasField =
  field =>
    new RegExp(
      'district\\s*\\.\\s*' +
        field
    ).test(
      body
    );

for (
  const field of [
    'demandDeltaRatio',
    'saturation',
    'rentIndex',
    'populationDelta'
  ]
) {
  assert.ok(
    hasField(
      field
    ),
    '动态商圈徽记必须读取真实字段：' +
      field
  );
}

for (
  const status of [
    '竞争激烈',
    '需求↑',
    '租金低',
    '人气高',
    '需求↓'
  ]
) {
  assert.ok(
    body.includes(
      status
    ),
    '动态商圈徽记必须保留状态：' +
      status
  );
}

assert.ok(
  body.includes(
    'getShopForDistrict('
  ) &&
  body.includes(
    'myShopCount'
  ),
  '商圈视觉元数据必须继续读取真实我的门店数量'
);

console.log(
  'V20.3 dynamic district badge regression tests passed'
);
