'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const renovationSystem =
  require('../src/renovation/renovationSystem.js');

function run() {
  gameState.reset();

  gameState.setCash(
    1000000
  );

  gameState.addShop({
    id:
      'shop_test_renovation',

    name:
      '测试门店',

    districtId:
      'university',

    streetId:
      'uni_xuefu',

    address:
      '学府路测试铺',

    status:
      'leased_pending_renovation',

    grossArea:
      180,

    usableArea:
      150,

    seatEstimate:
      50,

    floor:
      '1-2层',

    monthlyRent:
      12000,

    freeRentDays:
      15,

    depositMonths:
      2,

    paymentMonths:
      3,

    leaseYears:
      5,

    transferFee:
      30000,

    brokerFee:
      6000,

    upfrontPaid:
      72000
  });

  const plan =
    renovationSystem
      .ensurePlan(
        'shop_test_renovation'
      );

  assert.strictEqual(
    plan.floors.length,
    2,
    '双层铺必须生成两层独立装修空间'
  );

  const before =
    renovationSystem
      .getMetrics(
        'shop_test_renovation'
      );

  renovationSystem
    .adjustTable(
      'shop_test_renovation',
      0,
      4,
      2
    );

  renovationSystem
    .addPrivateRoom(
      'shop_test_renovation',
      1
    );

  const after =
    renovationSystem
      .getMetrics(
        'shop_test_renovation'
      );

  assert.ok(
    after.totalSeats >
      before.totalSeats,
    '增加桌椅和包厢后座位数必须动态变化'
  );

  assert.ok(
    after.totalCost !==
      before.totalCost,
    '布局变化必须实时改变装修预算'
  );

  const room =
    after
      .plan
      .floors[1]
      .privateRooms[0];

  renovationSystem
    .cycleRoomSeats(
      'shop_test_renovation',
      1,
      room.id
    );

  renovationSystem
    .cycleRoomStyle(
      'shop_test_renovation',
      1,
      room.id
    );

  const changed =
    renovationSystem
      .getMetrics(
        'shop_test_renovation'
      );

  assert.notStrictEqual(
    changed.totalCost,
    after.totalCost,
    '包厢人数或风格变化必须继续联动预算'
  );

  const quotes =
    renovationSystem
      .getContractorQuotes(
        'shop_test_renovation'
      );

  assert.strictEqual(
    quotes.length,
    3,
    '必须动态生成多家施工队报价'
  );

  renovationSystem
    .selectContractor(
      'shop_test_renovation',
      quotes[0].id
    );

  const cashBefore =
    gameState
      .getPlayer()
      .cash;

  const start =
    renovationSystem
      .startConstruction(
        'shop_test_renovation'
      );

  assert.ok(
    start.ok,
    '有效方案且资金充足时必须可以开工'
  );

  assert.ok(
    gameState
      .getPlayer()
      .cash <
      cashBefore,
    '开工必须真实扣除装修资金'
  );

  assert.strictEqual(
    renovationSystem
      .getShop(
        'shop_test_renovation'
      )
      .status,
    'renovating',
    '开工后门店必须进入装修中状态'
  );

  console.log(
    'dynamic renovation tests passed'
  );
}

run();
