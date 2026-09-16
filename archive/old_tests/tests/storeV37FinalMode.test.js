'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const source =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
    ),
    'utf8'
  );

assert.ok(
  source.includes(
    'V37_STORE_FINAL_FOUR_MODE'
  ),
  'V37定稿四态门店页必须存在'
);

for (const token of [
  "return 'no-shop'",
  "return 'multi'",
  "return 'operating'",
  "return 'preparing'",
  'renderNoShop(ctx)',
  'renderPreparing(',
  'renderOperating(',
  'renderMulti(ctx)'
]) {
  assert.ok(
    source.includes(token),
    '缺少门店定稿状态：' + token
  );
}

for (const token of [
  '还没有自己的门店',
  '推荐房源',
  '今日机会',
  '市场动态',
  '今日门店情况',
  '待处理事项',
  '热销菜品',
  '门店评价',
  '我的门店',
  '今日总营业额',
  '异常门店',
  '继续筹备'
]) {
  assert.ok(
    source.includes(token),
    '缺少定稿页面模块：' + token
  );
}

assert.ok(
  source.includes('getLiveListings') &&
  source.includes('getDistrictSummary'),
  '无门店推荐房源必须使用真实动态房源市场'
);

assert.ok(
  source.includes('getOperatingSnapshot'),
  '营业页必须由动态经营模型生成指标'
);

assert.ok(
  source.includes(
    ".loadGroup(\n        'store'"
  ) ||
  source.includes(
    ".loadGroup(\n          'store'"
  ),
  '必须兼容旧视觉资源加载测试'
);

assert.ok(
  source.includes(
    "renovation:\n          'renovation'"
  ),
  '必须兼容旧V16装修路由测试'
);

assert.ok(
  !source.includes(
    "'module:renovation'"
  ),
  '不能破坏V20.1动态装修入口规则'
);

for (const token of [
  'premium_store_hero',
  'premium_room_1',
  'premium_advice_renovation',
  'premium_advice_permit',
  'premium_advice_staff',
  'premium_explore_banner',
  "'shop:rename'",
  "'room:rename:'",
  "'room:manage'",
  "'module:finance'"
]) {
  assert.ok(
    source.includes(token),
    '历史门店契约丢失：' + token
  );
}


assert.ok(
  source.includes('getReadiness') &&
  source.includes('getRenovationProgress'),
  'V37.1必须继续满足V36真实筹备状态联动契约'
);

assert.ok(
  source.includes("['research', '菜单'") &&
  source.includes("['supply', '库存采购'") &&
  source.includes("['business', '经营数据'"),
  'V37.1必须继续满足V36菜单/供应链/数据快捷入口契约'
);

console.log(
  'V37.1 final four-mode store tests passed'
);
