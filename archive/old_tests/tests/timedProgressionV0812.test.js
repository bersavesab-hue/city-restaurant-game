'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const timeSystem =
  require('../src/core/timeSystem.js');

const globalStateBus =
  require('../src/core/globalStateBusV0811.js');

const operationsSchedule =
  require('../src/operations/operationsScheduleV087.js');

const coordinator =
  require('../src/core/timeScheduleCoordinatorV0812.js');

gameState.reset();
globalStateBus.resetForTests();
coordinator.resetForTests();

gameState.addShop({
  id:'shop_timed_v0812',
  name:'时间联动测试店',
  status:'renovating',
  districtId:'university',
  usableArea:80,
  grossArea:90,
  seatEstimate:24,
  monthlyRent:3000,
  businessHours:{
    openHour:8,
    closeHour:22
  }
});

const shop =
  gameState
    .getBusiness()
    .shops[0];

const now =
  coordinator.absoluteMinute(
    gameState.getTime()
  );

gameState
  .getRenovations()[
    shop.id
  ] = {
    status:'constructing',
    construction:{
      startDay:
        coordinator.dayOrdinal(
          gameState.getTime()
        ),
      finishDay:
        coordinator.dayOrdinal(
          gameState.getTime()
        ),
      startMinute:
        now -
        60,
      finishMinute:
        now +
        60,
      paid:1000,
      contractor:{
        id:'test',
        name:'测试施工队'
      },
      snapshot:{
        totalSeats:24,
        kitchenArea:20,
        diningArea:45
      }
    }
  };

const prep =
  gameState
    .getOpeningPrep();

prep.equipment[
  shop.id
] = {
  status:'ordered',
  items:{},
  orderDay:
    coordinator.dayOrdinal(
      gameState.getTime()
    ),
  deliveryDay:
    coordinator.dayOrdinal(
      gameState.getTime()
    ) +
    1,
  paid:2000
};

operationsSchedule
  .ensureShop(
    shop.id
  );

operationsSchedule
  .setBusinessHours(
    shop.id,
    8,
    22
  );

assert.ok(
  coordinator.install(),
  '统一时间协调器必须能安装'
);

timeSystem.addMinutes(
  60
);

const constructionResult =
  coordinator.syncTime(
    'test-construction'
  );

assert.ok(
  constructionResult,
  '施工推进同步必须返回结果'
);

assert.equal(
  gameState
    .getRenovations()[
      shop.id
    ].status,
  'completed',
  '时间到达装修完成点后必须自动结算装修'
);

assert.equal(
  shop.status,
  'renovated_pending_license',
  '装修完成后门店状态必须同步推进'
);

timeSystem.addDays(
  1
);

coordinator.syncTime(
  'test-equipment'
);

assert.equal(
  prep.equipment[
    shop.id
  ].status,
  'installed',
  '跨日后设备到货必须自动结算'
);

timeSystem.setTime(
  7,
  50
);

coordinator.syncTime(
  'test-rebase'
);

globalStateBus
  .clearHistory();

timeSystem.addMinutes(
  20
);

coordinator.syncTime(
  'test-open-boundary'
);

assert.ok(
  globalStateBus
    .getHistory(
      'business.hours.opened'
    )
    .some(
      event =>
        event.payload &&
        event.payload.shopId ===
          shop.id
    ),
  '跨过开门时间必须产生营业开始事件'
);

timeSystem.setTime(
  21,
  50
);

coordinator.syncTime(
  'test-close-rebase'
);

globalStateBus
  .clearHistory();

timeSystem.addMinutes(
  20
);

coordinator.syncTime(
  'test-close-boundary'
);

assert.ok(
  globalStateBus
    .getHistory(
      'business.hours.closed'
    )
    .some(
      event =>
        event.payload &&
        event.payload.shopId ===
          shop.id
    ),
  '跨过闭店时间必须产生营业结束事件'
);

assert.equal(
  coordinator.consumeChanged(),
  true,
  '时间联动状态变化必须可被主循环感知'
);

const diagnosis =
  coordinator.diagnose();

assert.equal(
  diagnosis.version,
  '0.8.12'
);

assert.equal(
  diagnosis.shopCount,
  1
);

console.log(
  'V0.8.12 timed progression integration tests passed'
);
