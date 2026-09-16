'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(ROOT, 'src/scenes/storeScene.js'),
  'utf8'
);

assert.ok(
  source.includes('V42_STORE_MASTER_REFERENCE_REBUILD'),
  'V42母版重构标记必须存在'
);

assert.ok(
  source.includes('function storeText('),
  '门店页必须使用独立精确字号函数'
);

assert.ok(
  source.includes('Math.max(\n      4.6,'),
  '门店小字不能继续被premiumUi强制到7.3px'
);

for (const token of [
  '还没有自己的门店',
  '推荐房源',
  '今日机会',
  '市场动态',
  '开店进度',
  '下一步建议',
  '筹备资金',
  '今日营业额',
  '今日净利润',
  '今日门店情况',
  '待处理事项',
  '热销菜品',
  '门店评价',
  '我的门店',
  '今日总营业额',
  '今日总利润',
  '异常门店',
  '门店地图',
  '人员调配',
  '统一采购',
  '品牌升级'
]) {
  assert.ok(
    source.includes(token),
    '四态母版模块缺失：' + token
  );
}

assert.ok(
  source.includes("'lib_listing_1'") &&
  source.includes("'lib_listing_2'") &&
  source.includes("'lib_listing_3'"),
  '推荐房源必须继续使用资料库店铺外观'
);

assert.ok(
  source.includes('排烟✓') &&
  source.includes('燃气✓') &&
  source.includes('首店佳'),
  '房源卡必须包含参考图式的紧凑条件标签'
);

assert.ok(
  source.includes('renderPreparing(') &&
  source.includes('renderOperating(') &&
  source.includes('renderMulti(ctx)'),
  '不能只做无门店页，另外三态必须同时存在'
);

assert.ok(
  !source.includes("'module:renovation'"),
  '不能破坏动态装修路由规则'
);

console.log('V42 store master reference tests passed');
