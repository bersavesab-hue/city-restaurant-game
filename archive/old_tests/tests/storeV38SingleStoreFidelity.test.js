'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

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
    'V38_SINGLE_STORE_FIDELITY'
  ),
  'V38单店精修标记必须存在'
);

for (const token of [
  '今日营业额',
  '今日净利润',
  '到店顾客',
  '门店评分',
  '进入经营',
  '门店详情',
  '今日门店情况',
  '待处理事项',
  '热销菜品',
  '门店评价',
  '扩店机会',
  '更新于 '
]) {
  assert.ok(
    source.includes(token),
    '单门店定稿模块缺失：' +
      token
  );
}

assert.ok(
  source.includes(
    "'shop:detail'"
  ) &&
  source.includes(
    'showShopDetail'
  ),
  '门店详情按钮不能再错误地直接触发重命名'
);

assert.ok(
  source.includes(
    'store_fastfood_visual'
  ) &&
  source.includes(
    'store_meal_visual'
  ),
  '热销菜品区必须复用现有菜品分类素材'
);

assert.ok(
  source.includes(
    'this.contentBottom -'
  ),
  '单门店页底部必须自适应长屏'
);

assert.ok(
  source.includes(
    'getOperatingSnapshot'
  ),
  '营业指标必须继续由动态经营快照计算'
);

assert.ok(
  source.includes(
    'V37_2_NO_SHOP_FIDELITY'
  ) &&
  source.includes(
    'V37_STORE_FINAL_FOUR_MODE'
  ),
  'V38不能破坏无门店页和四态门店结构'
);

assert.ok(
  !source.includes(
    "'module:renovation'"
  ),
  '不能破坏动态装修入口规则'
);

console.log(
  'V38 single-store fidelity tests passed'
);
