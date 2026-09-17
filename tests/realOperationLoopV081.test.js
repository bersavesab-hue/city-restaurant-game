'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const gameState =
  require('../src/core/gameState.js');

const operations =
  require('../src/operations/operationsStoreV080.js');

const restaurantSimulation =
  require('../src/operations/restaurantSimulationV081.js');

gameState.reset();

gameState.addShop({
  id: 'shop_v081_test',
  name: '真实营业测试店',
  status: 'open',
  districtId: 'university',
  monthlyRent: 9000,
  usableArea: 90,
  trialOpenedDay: 1
});

const time =
  gameState.getTime();

time.year = 1;
time.month = 4;
time.day = 12;
time.hour = 11;
time.minute = 0;

const runtime =
  operations.getRuntime(
    'shop_v081_test'
  );

assert.ok(
  runtime,
  '必须建立门店Runtime'
);

assert.ok(
  runtime.menu.length >=
    10,
  '必须拥有真实菜单'
);

const currentOrdinal =
  require('../src/core/simulationSystem.js')
    .getDayOrdinal(
      time
    );

assert.equal(
  runtime.day,
  currentOrdinal,
  'V0.8.0旧日历必须迁移到正式日序'
);

const beforeCash =
  gameState
    .getPlayer()
    .cash;

const restock =
  operations
    .autoRestock(
      'shop_v081_test'
    );

assert.ok(
  restock.orders >
    0,
  '真实营业前必须能采购库存'
);

const afterRestockCash =
  gameState
    .getPlayer()
    .cash;

assert.ok(
  afterRestockCash <
    beforeCash,
  '采购必须真实扣除现金'
);

const rate =
  restaurantSimulation
    .expectedArrivalsPerMinute(
      gameState
        .getBusiness()
        .shops[0],
      runtime
    );

assert.ok(
  rate >
    0,
  '营业中门店必须根据商圈产生真实到店率'
);

const changed =
  restaurantSimulation
    .update(
      180
    );

assert.equal(
  changed,
  true,
  '午餐时段推进必须产生经营变化'
);

const dashboard =
  operations
    .dashboard(
      'shop_v081_test'
    );

assert.ok(
  dashboard
    .finance
    .orders >
    0,
  '必须产生真实订单'
);

assert.ok(
  dashboard
    .finance
    .revenue >
    0,
  '营业额必须来自真实订单'
);

assert.ok(
  dashboard
    .finance
    .foodCost >
    0,
  '必须产生真实食材成本'
);

assert.ok(
  dashboard
    .finance
    .customers >
    0,
  '必须记录真实顾客'
);

assert.ok(
  gameState
    .getPlayer()
    .cash !==
    afterRestockCash,
  '营业和固定费用必须改变现金'
);

const stored =
  gameState
    .getRestaurantOperations()
    .shops
    .shop_v081_test;

assert.ok(
  stored.simulation,
  '经营游标必须进入存档树'
);

assert.ok(
  Array.isArray(
    stored.dailySnapshots
  ),
  '日结快照必须进入存档树'
);

const storeScene =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
    ),
    'utf8'
  );

assert.ok(
  storeScene.includes(
    "require('../operations/operationsStoreV080.js')"
  ),
  '门店页必须接真实经营状态'
);

assert.ok(
  !storeScene.includes(
    'revenue * 0.36'
  ),
  '禁止继续使用营业额×36%的假食材成本'
);

assert.ok(
  !storeScene.includes(
    'revenue * 0.055'
  ),
  '禁止继续使用营业额×5.5%的假水电'
);

assert.ok(
  storeScene.includes(
    'realOperation'
  ),
  '门店营业快照必须标记为真实经营'
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
    "require('./operations/restaurantSimulationV081.js')"
  ),
  '主循环必须接真实餐厅模拟'
);

assert.ok(
  main.includes(
    'restaurantSimulation'
  ) &&
  main.includes(
    'restaurantChanged'
  ),
  '时间推进必须真正驱动餐厅经营'
);

console.log(
  'V0.8.1 real operation loop tests passed'
);
