'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, '../src/main.js');
const source = fs.readFileSync(mainPath, 'utf8');

assert.ok(
  source.includes('V22_HOME_MATCH'),
  'V22补丁必须已经写入 src/main.js'
);

assert.ok(
  source.includes('drawTopHud = function'),
  'V22必须覆盖顶部HUD'
);

assert.ok(
  source.includes('drawDistrictCard = function'),
  'V22必须覆盖商圈详情卡'
);

assert.ok(
  source.includes('drawBottomNav = function'),
  'V22必须覆盖底部导航'
);

assert.ok(
  source.includes("demandSystem.getTotalDemand(district.id).toLocaleString()"),
  '商圈详情需求必须继续读取实时 demandSystem'
);

assert.ok(
  source.includes("item.id === 'traffic'") &&
  source.includes('trafficMode'),
  '底部客流导航必须由真实客流模式控制'
);

console.log('V22.1 applied homepage regression tests passed');
