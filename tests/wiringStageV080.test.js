'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const gameState =
  require('../src/core/gameState.js');

const operations =
  require('../src/operations/operationsStoreV080.js');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

gameState.reset();

gameState.addShop({
  id: 'shop_v080_test',
  name: 'V080测试门店',
  status: 'open',
  districtId: 'university'
});

const runtime =
  operations
    .getRuntime(
      'shop_v080_test'
    );

assert.ok(
  runtime,
  '门店必须建立经营运行实例'
);

assert.equal(
  runtime
    .supplierNetwork
    .length,
  126,
  '必须接入V0.7的126个供应商原型实例'
);

assert.ok(
  runtime
    .menu
    .length >=
    10,
  '新门店必须建立基础菜单'
);

const first =
  runtime
    .menu[0];

const cost =
  operations
    .estimateMenuItemCost(
      'shop_v080_test',
      first
    );

assert.ok(
  cost >
    0,
  '菜单必须能得到真实供应链估算成本'
);

const oldPrice =
  first.listPrice;

operations
  .adjustMenuPrice(
    'shop_v080_test',
    first.id,
    1
  );

assert.equal(
  operations
    .getRuntime(
      'shop_v080_test'
    )
    .menu[0]
    .listPrice,
  oldPrice +
    1,
  '菜单调价必须写入门店运行状态'
);

operations
  .setMenuFeatured(
    'shop_v080_test',
    first.id
  );

assert.equal(
  operations
    .getRuntime(
      'shop_v080_test'
    )
    .menu[0]
    .featured,
  true,
  '招牌菜必须写入门店运行状态'
);

const beforeCash =
  gameState
    .getPlayer()
    .cash;

const restock =
  operations
    .autoRestock(
      'shop_v080_test'
    );

assert.ok(
  restock.orders >
    0,
  '空库存门店必须能执行真实补货'
);

assert.ok(
  restock.spent >
    0,
  '真实补货必须产生采购支出'
);

assert.ok(
  gameState
    .getPlayer()
    .cash <
    beforeCash,
  '真实采购必须扣除玩家资金'
);

const stockRows =
  operations
    .inventoryRows(
      'shop_v080_test'
    );

assert.ok(
  stockRows.some(
    row =>
      row.haveGrams >
      0
  ),
  '补货后必须真实进入库存'
);

const root =
  gameState
    .getRestaurantOperations();

assert.ok(
  root.shops
    .shop_v080_test,
  '门店经营状态必须进入gameState存档树'
);

JSON.stringify(
  root
);

operations.resetCache();

const restored =
  operations
    .getRuntime(
      'shop_v080_test'
    );

assert.equal(
  restored.menu[0].listPrice,
  oldPrice +
    1,
  '清空运行缓存后必须能从存档树恢复菜单'
);

assert.ok(
  restored
    .inventory
    .lots
    .some(
      lot =>
        lot.grams >
        0
    ),
  '清空运行缓存后必须恢复库存批次'
);

const menuScene =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/researchScene.js'
    ),
    'utf8'
  );

const supplyScene =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/supplyScene.js'
    ),
    'utf8'
  );

const businessScene =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/businessScene.js'
    ),
    'utf8'
  );

assert.ok(
  menuScene.includes(
    'adjustMenuPrice'
  ) &&
  menuScene.includes(
    'setMenuFeatured'
  ),
  '菜单页必须是真实可操作页面'
);

assert.ok(
  supplyScene.includes(
    'autoRestock'
  ) &&
  supplyScene.includes(
    'inventoryRows'
  ),
  '供应链页必须接入真实采购和库存'
);

assert.ok(
  businessScene.includes(
    'dashboard'
  ),
  '数据页必须读取真实经营数据'
);

const main =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/main.js'
    ),
    'utf8'
  );

assert.ok(
  main.includes(
    "require('./core/saveSystem.js')"
  ),
  '主程序必须接入存档系统'
);

assert.ok(
  main.includes(
    'const restoredFromSave ='
  ),
  '启动必须尝试恢复存档'
);

console.log(
  'V0.8.0 wiring stage 1 tests passed'
);
