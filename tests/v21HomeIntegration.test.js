'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, '../src/main.js');
const source = fs.readFileSync(mainPath, 'utf8');

assert.ok(
  source.includes('V21_HOME_ICON_POLISH'),
  'V21主页图标补丁必须已经应用'
);

for (const token of [
  'v21_district_university',
  'v21_nav_traffic',
  'v21_metric_population',
  'assets/images/v21/'
]) {
  assert.ok(
    source.includes(token),
    'V21主页缺少资源接入: ' + token
  );
}

assert.ok(
  source.includes("NAV_H = (VIEW_H < 740 ? 56 : 60)"),
  'V21底部导航必须完成密度压缩'
);

assert.ok(
  source.includes("CARD_H = VIEW_H < 740 ? 124 : 136"),
  'V21商圈卡必须完成高度压缩'
);

console.log('V21 homepage icon integration tests passed');
