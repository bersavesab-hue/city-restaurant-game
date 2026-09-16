'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const renovationSystem =
  require('../src/renovation/renovationSystem.js');

const openingPrepSystem =
  require('../src/opening/openingPrepSystem.js');

gameState.reset();

gameState.setCash(
  1000000
);

gameState.addShop({
  id:'shop_v0817',
  name:'装修设备数据库测试店',
  districtId:'university',
  streetId:'uni_test',
  address:'测试路17号',
  status:'leased_pending_renovation',
  grossArea:180,
  usableArea:150,
  seatEstimate:52,
  floor:'1层',
  electricCapacityKw:18,
  monthlyRent:10000,
  freeRentDays:10,
  depositMonths:2,
  paymentMonths:3,
  leaseYears:5
});

const plan =
  renovationSystem
    .ensurePlan(
      'shop_v0817'
    );

assert.ok(plan);

const metrics =
  renovationSystem
    .getMetrics(
      'shop_v0817'
    );

assert.ok(metrics);
assert.ok(
  Array.isArray(
    metrics.constructionBreakdown
  )
);
assert.equal(
  metrics
    .constructionBreakdown
    .length,
  12,
  '装修预算必须带12项施工拆分'
);

const quotes =
  renovationSystem
    .getContractorQuotes(
      'shop_v0817'
    );

assert.equal(
  quotes.length,
  3
);

assert.ok(
  quotes.every(
    item =>
      item.profileId &&
      item.specialty &&
      item.price >
        0
  ),
  '施工队报价必须来自固定档案库'
);

gameState
  .getRenovations()[
    'shop_v0817'
  ].status =
  'completed';

const equipmentQuote =
  openingPrepSystem
    .getEquipmentQuote(
      'shop_v0817'
    );

assert.ok(
  equipmentQuote
);

assert.equal(
  equipmentQuote
    .databaseVersion,
  '0.8.17'
);

assert.equal(
  equipmentQuote
    .lines
    .length,
  5,
  '旧5个设备功能组必须继续保留'
);

for (
  const line
  of equipmentQuote.lines
) {
  assert.ok(
    Array.isArray(
      line.availableModels
    ),
    line.id +
    ' 必须挂接细分型号'
  );

  assert.equal(
    line
      .availableModels
      .length,
    5,
    line.id +
    ' 应有5个细分型号'
  );
}

const catalog =
  openingPrepSystem
    .getEquipmentCatalog();

assert.equal(
  catalog.length,
  25
);

const cooking =
  openingPrepSystem
    .getEquipmentCatalog(
      'cooking'
    );

assert.equal(
  cooking.length,
  5
);

console.log(
  'V0.8.17 renovation/equipment integration tests passed'
);
