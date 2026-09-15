'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const timeSystem =
  require('../src/core/timeSystem.js');

const simulationSystem =
  require('../src/core/simulationSystem.js');

const operationsSchedule =
  require('../src/operations/operationsScheduleV087.js');

const restaurantSimulation =
  require('../src/operations/restaurantSimulationV081.js');

const coordinator =
  require('../src/core/timeScheduleCoordinatorV0812.js');

assert.equal(
  coordinator.VERSION,
  '0.8.12'
);

assert.equal(
  coordinator.dayOrdinal({
    year:1,
    month:1,
    day:1,
    hour:0,
    minute:0
  }),
  1,
  '第一天序号必须统一为1'
);

assert.equal(
  coordinator.daysInMonth(
    4,
    2
  ),
  29,
  '闰年2月必须29天'
);

assert.equal(
  coordinator.daysInMonth(
    100,
    2
  ),
  28,
  '整百年非400倍数不得视为闰年'
);

assert.equal(
  coordinator.daysInMonth(
    400,
    2
  ),
  29,
  '400倍数必须视为闰年'
);

assert.equal(
  coordinator.weekDay({
    year:1,
    month:1,
    day:1
  }),
  0,
  '统一周序必须以周一为0'
);


assert.deepEqual(
  coordinator.normalizeTime({
    year:1,
    month:4,
    day:31,
    hour:10,
    minute:20
  }),
  {
    year:1,
    month:5,
    day:1,
    hour:10,
    minute:20
  },
  '旧模块直接产生4月31日时必须自动进位到5月1日，不能钳回4月30日'
);

assert.equal(
  coordinator.dayOrdinal({
    year:1,
    month:4,
    day:31
  }),
  coordinator.dayOrdinal({
    year:1,
    month:5,
    day:1
  }),
  '非法日期溢出必须保持连续日序，确保人才/事件按日期刷新'
);

assert.equal(
  coordinator.mealPeriod({
    year:1,
    month:1,
    day:1,
    hour:12,
    minute:0
  }),
  'lunch'
);

assert.equal(
  timeSystem.isLeapYear(400),
  true,
  'timeSystem必须委托统一日历'
);

assert.equal(
  timeSystem.getDaysInMonth(
    100,
    2
  ),
  28
);

assert.equal(
  simulationSystem.getDayOrdinal({
    year:4,
    month:3,
    day:1
  }),
  coordinator.dayOrdinal({
    year:4,
    month:3,
    day:1
  }),
  'simulationSystem日序必须与统一日历一致'
);

gameState.reset();

gameState.addShop({
  id:'shop_calendar_v0812',
  name:'统一日程测试店',
  status:'open',
  districtId:'university',
  usableArea:80,
  grossArea:90,
  seatEstimate:24,
  monthlyRent:3000
});

const shop =
  gameState
    .getBusiness()
    .shops[0];

operationsSchedule
  .ensureShop(
    shop.id
  );

assert.ok(
  operationsSchedule
    .setBusinessHours(
      shop.id,
      8,
      22
    )
    .ok,
  '必须能设置统一营业时间'
);

const hours =
  operationsSchedule
    .getBusinessHours(
      shop
    );

assert.deepEqual(
  hours,
  {
    openHour:8,
    closeHour:22
  },
  '统一营业时间必须来自排班系统'
);

assert.equal(
  operationsSchedule
    .isOpenAt(
      shop,
      {
        year:1,
        month:4,
        day:12,
        hour:12,
        minute:0
      }
    ),
  true
);

assert.equal(
  operationsSchedule
    .isOpenAt(
      shop,
      {
        year:1,
        month:4,
        day:12,
        hour:23,
        minute:0
      }
    ),
  false
);

assert.deepEqual(
  restaurantSimulation
    .businessHours(
      shop
    ),
  hours,
  '经营模拟必须复用排班系统营业时间'
);

assert.equal(
  restaurantSimulation
    .isWithinBusinessHours(
      shop,
      {
        year:1,
        month:4,
        day:12,
        hour:7,
        minute:59
      }
    ),
  false
);

assert.equal(
  restaurantSimulation
    .isWithinBusinessHours(
      shop,
      {
        year:1,
        month:4,
        day:12,
        hour:8,
        minute:0
      }
    ),
  true
);

console.log(
  'V0.8.12 time/calendar/schedule unification tests passed'
);
