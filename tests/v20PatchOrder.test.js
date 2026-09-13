'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const patch =
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../scripts/apply-v20-home-1to1.js'
    ),
    'utf8'
  );

const badgeReplace =
  patch.indexOf(
    "'顶部城市缩略图'"
  );

const helperInsert =
  patch.indexOf(
    "'主页目标与客流辅助函数'"
  );

assert.ok(
  badgeReplace >= 0 &&
  helperInsert >= 0,
  'V20补丁必须同时包含城市缩略图替换和辅助函数插入'
);

assert.ok(
  helperInsert >
  badgeReplace,
  '主页辅助函数必须在城市缩略图 replaceBetween 之后插入，否则会被替换过程删除'
);

for (
  const token of [
    'function drawGoalBar()',
    'function getHomeGoalState()',
    'function drawTrafficOverlay()',
    'function getDistrictVisualMeta(',
    'function drawMetricSymbol('
  ]
) {
  assert.ok(
    patch.includes(
      token
    ),
    '补丁源码缺少主页动态函数：' +
      token
  );
}

console.log(
  'V20.5 patch ordering regression tests passed'
);
