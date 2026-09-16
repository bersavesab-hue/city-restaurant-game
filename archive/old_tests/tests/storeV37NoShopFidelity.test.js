'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT =
  path.resolve(__dirname, '..');

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
    'V37_2_NO_SHOP_FIDELITY'
  ),
  'V37.2无门店高保真优化标记必须存在'
);

assert.ok(
  source.includes(
    "require('../core/resourceManager.js')"
  ) &&
  source.includes(
    "require('../property/propertyIconAtlas.js')"
  ),
  'V37.2必须复用现有房源图标图集'
);

assert.ok(
  source.includes(
    "'premium_store_hero'"
  ) &&
  source.includes(
    "'visual_storefront_hero'"
  ) &&
  source.includes(
    "'premium_explore_banner'"
  ),
  '推荐房源必须优先使用店铺/街景素材，不能继续拿包厢内景充当房源'
);

assert.ok(
  !source.includes(
    "const imageKeys = [\n      'premium_store_hero',\n      'premium_room_1'"
  ),
  '推荐房源不能继续使用room_1/room_2内景'
);

for (const token of [
  '还没有自己的门店',
  '可用资金',
  '推荐预算',
  '推荐商圈',
  '前往选址',
  '查看商圈',
  '开店流程',
  '推荐房源',
  '今日机会',
  '市场动态',
  'getListingScore',
  'drawScoreStars'
]) {
  assert.ok(
    source.includes(token),
    'V37.2缺少目标模块：' +
      token
  );
}

assert.ok(
  source.includes(
    'this.contentBottom -'
  ),
  '底部机会/动态卡必须自适应长屏并消除大块空白'
);

assert.ok(
  !source.includes(
    "'module:renovation'"
  ),
  '不能破坏V20.1动态装修入口'
);

assert.ok(
  source.includes(
    'getRenovationProgress'
  ) &&
  source.includes(
    'V37_STORE_FINAL_FOUR_MODE'
  ),
  'V37.2不能破坏四态门店和筹备系统'
);

console.log(
  'V37.2 no-shop fidelity tests passed'
);
