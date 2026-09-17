'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const renovationSystem =
  require('../src/renovation/renovationSystem.js');

gameState.reset();

gameState.addShop({
  id:
    'undo_shop',
  name:
    '撤销测试店',
  districtId:
    'university',
  streetId:
    'undo',
  address:
    '测试路2号',
  status:
    'leased_pending_renovation',
  grossArea:
    90,
  usableArea:
    80,
  seatEstimate:
    28,
  floor:
    '1层',
  monthlyRent:
    5000,
  freeRentDays:
    10,
  depositMonths:
    2,
  paymentMonths:
    3,
  leaseYears:
    3,
  transferFee:
    0,
  brokerFee:
    0,
  upfrontPaid:
    0
});

const before =
  renovationSystem
    .ensurePlan(
      'undo_shop'
    )
    .floors[0]
    .tables['4'];

renovationSystem
  .adjustTable(
    'undo_shop',
    0,
    4,
    1
  );

assert.strictEqual(
  renovationSystem
    .ensurePlan(
      'undo_shop'
    )
    .floors[0]
    .tables['4'],
  before + 1
);

assert.ok(
  renovationSystem
    .undo(
      'undo_shop'
    ),
  '必须可以撤销'
);

assert.strictEqual(
  renovationSystem
    .ensurePlan(
      'undo_shop'
    )
    .floors[0]
    .tables['4'],
  before
);

assert.ok(
  renovationSystem
    .redo(
      'undo_shop'
    ),
  '必须可以重做'
);

assert.strictEqual(
  renovationSystem
    .ensurePlan(
      'undo_shop'
    )
    .floors[0]
    .tables['4'],
  before + 1
);

console.log(
  'renovation undo/redo tests passed'
);
