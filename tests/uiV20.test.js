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
    'V20_HOME_REFERENCE_1TO1'
  ),
  '主页必须升级到V20目标图版'
);

for (
  const token of [
    'function drawGoalBar(',
    'function drawTrafficOverlay(',
    'function getHomeGoalState(',
    'function getDistrictVisualMeta(',
    'function drawDistrictPictogram(',
    'function drawMetricSymbol(',
    "id: 'traffic'",
    "name: '客流'",
    "'city:rename'",
    "'brand:status'",
    "'goal:current'"
  ]
) {
  assert.ok(
    source.includes(
      token
    ),
    'V20主页缺少：' +
      token
  );
}

assert.ok(
  source.includes(
    'meta.myShopCount'
  ),
  '地图必须显示真实我的门店标识'
);

const hasDistrictField =
  field =>
    new RegExp(
      'district\\s*\\.\\s*' +
        field
    ).test(
      source
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
    hasDistrictField(
      field
    ),
    '商圈动态徽记缺少真实字段：' +
      field
  );
}

for (
  const badge of [
    '竞争激烈',
    '需求↑',
    '租金低',
    '人气高',
    '需求↓'
  ]
) {
  assert.ok(
    source.includes(
      badge
    ),
    '商圈动态徽记缺少状态：' +
      badge
  );
}

assert.ok(
  source.includes(
    "current ===\n            'renovation'"
  ) ||
  source.includes(
    "current ===\n          'renovation'"
  ),
  '装修页必须归入门店底栏高亮体系'
);

console.log(
  'V20 homepage reference-layout tests passed'
);
