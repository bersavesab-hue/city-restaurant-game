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

const schedule =
  require('../src/operations/operationsScheduleV087.js');

const restaurantSimulation =
  require('../src/operations/restaurantSimulationV081.js');

gameState.reset();

gameState
  .addShop({
    id:'shop_schedule_v087',
    name:'排班测试店',
    status:'open',
    districtId:'university',
    usableArea:80,
    grossArea:90,
    monthlyRent:3000,
    seatEstimate:28
  });

const shop =
  gameState
    .getBusiness()
    .shops[0];

const staffState =
  gameState
    .getOpeningPrep()
    .staffing;

staffState[
  shop.id
] = {
  candidateDay:null,
  candidates:[],
  hired:[
    {
      id:'m1',
      name:'陈启明',
      roleId:'manager',
      roleName:'店长',
      wage:7200
    },
    {
      id:'c1',
      name:'王志强',
      roleId:'chef',
      roleName:'厨师',
      wage:6800
    },
    {
      id:'s1',
      name:'李嘉宁',
      roleId:'server',
      roleName:'服务员',
      wage:4200
    },
    {
      id:'s2',
      name:'张博文',
      roleId:'server',
      roleName:'服务员',
      wage:4200
    },
    {
      id:'k1',
      name:'刘雅琴',
      roleId:'cashier',
      roleName:'收银',
      wage:4300
    }
  ]
};

const hoursResult =
  schedule
    .setBusinessHours(
      shop.id,
      8,
      22
    );

assert.ok(
  hoursResult.ok,
  '必须允许设置营业时间'
);

assert.deepEqual(
  restaurantSimulation
    .businessHours(
      shop
    ),
  {
    openHour:8,
    closeHour:22
  },
  '玩家设置的营业时间必须被真实餐厅模拟读取'
);

assert.equal(
  restaurantSimulation
    .isWithinBusinessHours(
      shop,
      {
        hour:7,
        minute:30
      }
    ),
  false,
  '开门前不能产生正常营业客流'
);

assert.equal(
  restaurantSimulation
    .isWithinBusinessHours(
      shop,
      {
        hour:12,
        minute:0
      }
    ),
  true,
  '营业时间内必须允许客流'
);

const state =
  schedule
    .ensureShop(
      shop.id
    );

const today =
  schedule
    .weekDay(
      gameState
        .getTime()
    );

for (
  const id
  of Object.keys(
    state.employees
  )
) {
  schedule
    .setEmployeeOffDay(
      shop.id,
      id,
      (
        today +
        1
      ) %
      7
    );
}

schedule
  .setEmployeeShift(
    shop.id,
    'm1',
    'mid'
  );

schedule
  .setEmployeeShift(
    shop.id,
    'c1',
    'early'
  );

schedule
  .setEmployeeShift(
    shop.id,
    's1',
    'early'
  );

schedule
  .setEmployeeShift(
    shop.id,
    's2',
    'late'
  );

schedule
  .setEmployeeShift(
    shop.id,
    'k1',
    'mid'
  );

const noonCoverage =
  schedule
    .getCoverage(
      shop.id,
      {
        ...gameState
          .getTime(),
        hour:12,
        minute:0
      }
    );

assert.ok(
  noonCoverage.factor >
    0.55,
  '正常排班的午餐时段必须具有可用承载'
);

schedule
  .setEmployeeOffDay(
    shop.id,
    'c1',
    today
  );

const withoutChef =
  schedule
    .getCoverage(
      shop.id,
      {
        ...gameState
          .getTime(),
        hour:12,
        minute:0
      }
    );

assert.ok(
  withoutChef.factor <
    noonCoverage.factor,
  '厨师休息必须真实降低营业承载'
);

schedule
  .setEmployeeShift(
    shop.id,
    'm1',
    'off'
  );

const moreMissing =
  schedule
    .getCoverage(
      shop.id,
      {
        ...gameState
          .getTime(),
        hour:12,
        minute:0
      }
    );

assert.ok(
  moreMissing.factor <
    withoutChef.factor,
  '停排员工必须进一步降低营业承载'
);

const snapshot =
  schedule
    .getSnapshot(
      shop.id
    );

assert.equal(
  snapshot.businessHours.openHour,
  8,
  '排班页面必须读取真实开门时间'
);

assert.equal(
  snapshot.businessHours.closeHour,
  22,
  '排班页面必须读取真实打烊时间'
);

assert.equal(
  snapshot.employees.length,
  5,
  '所有已录用员工必须进入排班表'
);

const mainSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/main.js'
    ),
    'utf8'
  );

assert.ok(
  mainSource.includes(
    "require('./scenes/scheduleSceneV087.js')"
  ) &&
  mainSource.includes(
    "'schedule',\n  scheduleScene"
  ),
  '排班页面必须注册到主程序'
);

const staffSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/staffScene.js'
    ),
    'utf8'
  );

assert.ok(
  /switchTo\(\s*'schedule'/.test(
    staffSource
  ),
  '招聘页面必须提供可执行的排班入口'
);

const simulationSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/operations/restaurantSimulationV081.js'
    ),
    'utf8'
  );

assert.ok(
  simulationSource.includes(
    'operationsSchedule'
  ) &&
  simulationSource.includes(
    'scheduled.factor'
  ),
  '真实餐厅承载必须读取当前排班'
);

console.log(
  'V0.8.7 operations schedule tests passed'
);
