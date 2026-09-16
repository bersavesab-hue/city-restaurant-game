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

const floorSimulation =
  require('../src/operations/floorSimulationV082.js');

gameState.reset();

gameState.addShop({
  id:'shop_v082_test',
  name:'现场模拟测试店',
  status:'open',
  districtId:'university',
  monthlyRent:9000,
  usableArea:90,
  seatEstimate:24,
  trialOpenedDay:1
});

const runtime =
  operations
    .getRuntime(
      'shop_v082_test'
    );

const restock =
  operations
    .autoRestock(
      'shop_v082_test'
    );

assert.ok(
  restock.orders >
    0,
  '现场模拟前必须能形成真实库存'
);

const floor =
  floorSimulation
    .ensureState(
      runtime
    );

assert.equal(
  floor.version,
  '0.8.2',
  '现场状态版本错误'
);

floorSimulation
  .syncTables(
    runtime,
    24
  );

assert.ok(
  runtime
    .diningRoom
    .tables
    .length >
    0,
  '必须按座位生成餐桌'
);

const startCash =
  gameState
    .getPlayer()
    .cash;

const result =
  floorSimulation
    .advance(
      runtime,
      gameState
        .getBusiness()
        .shops[0],
      240,
      14,
      {
        absoluteMinute:10000,
        staffCoverage:0.9,
        weather:'sunny',
        capacityMultiplier:1,
        seats:24
      }
    );

const live =
  floorSimulation
    .getSnapshot(
      runtime
    );

assert.ok(
  result.changed,
  '有客流时现场模拟必须发生变化'
);

assert.ok(
  live.completedOrdersToday >
    0,
  '240分钟必须有真实订单完成'
);

assert.ok(
  runtime
    .ledger
    .orders >
    0,
  '完成订单必须进入真实账本'
);

assert.ok(
  runtime
    .ledger
    .foodCost >
    0,
  '厨房制作必须产生真实食材成本'
);

assert.ok(
  gameState
    .getPlayer()
    .cash !==
    startCash,
  '现场结算必须改变玩家现金'
);

assert.ok(
  live.peakQueueToday >=
    live.queueParties,
  '必须记录高峰队列'
);

assert.ok(
  Number.isFinite(
    live.avgCookMinutes
  ),
  '必须统计真实平均出餐时间'
);

const saved =
  gameState
    .getRestaurantOperations()
    .shops
    .shop_v082_test;

operations.persist(
  'shop_v082_test'
);

const savedAfter =
  gameState
    .getRestaurantOperations()
    .shops
    .shop_v082_test;

assert.ok(
  savedAfter.floor,
  '现场队列/餐桌/厨房/配送状态必须进入存档树'
);

const daily =
  floorSimulation
    .closeDay(
      runtime
    );

assert.ok(
  daily.completedOrdersToday >
    0,
  '日结必须保留现场经营指标'
);

const storeSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/storeScene.js'
    ),
    'utf8'
  );

for (
  const keyword
  of [
    '等位',
    '在座',
    '后厨队列',
    '外卖配送',
    '等位离开',
    '后厨高峰拥堵'
  ]
) {
  assert.ok(
    storeSource.includes(
      keyword
    ),
    '门店现场UI缺少：' +
      keyword
  );
}

const restaurantSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/operations/restaurantSimulationV081.js'
    ),
    'utf8'
  );

assert.ok(
  restaurantSource.includes(
    "require('./floorSimulationV082.js')"
  ),
  '真实营业主循环必须接入现场模拟'
);

assert.ok(
  restaurantSource.includes(
    'floorResult'
  ),
  '营业主循环不能继续直接即时结算每个到店顾客'
);

assert.ok(
  !restaurantSource.includes(
    '\n}}\n\nfunction update('
  ),
  'V0.8.2 补丁不能留下重复函数闭合大括号'
);

console.log(
  'V0.8.2 live restaurant floor simulation tests passed'
);
