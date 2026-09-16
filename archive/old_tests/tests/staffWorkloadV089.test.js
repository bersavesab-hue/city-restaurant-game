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

const career =
  require('../src/operations/staffCareerV088.js');

const workload =
  require('../src/operations/staffWorkloadV089.js');

gameState.reset();

gameState
  .addShop({
    id:'shop_workload_v089',
    name:'高峰测试店',
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

const prep =
  gameState
    .getOpeningPrep();

prep.staffing[
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
      wage:7200,
      skill:68
    },
    {
      id:'c1',
      name:'王志强',
      roleId:'chef',
      roleName:'厨师',
      wage:6800,
      skill:72
    },
    {
      id:'s1',
      name:'李嘉宁',
      roleId:'server',
      roleName:'服务员',
      wage:4200,
      skill:62
    },
    {
      id:'s2',
      name:'张博文',
      roleId:'server',
      roleName:'服务员',
      wage:4200,
      skill:60
    },
    {
      id:'k1',
      name:'刘雅琴',
      roleId:'cashier',
      roleName:'收银',
      wage:4300,
      skill:64
    }
  ]
};

career
  .ensureTeam(
    shop.id
  );

const time =
  gameState
    .getTime();

Object.assign(
  time,
  {
    hour:12,
    minute:0
  }
);

assert.ok(
  schedule
    .setBusinessHours(
      shop.id,
      8,
      22
    )
    .ok,
  '必须能设置营业时间'
);

const state =
  schedule
    .ensureShop(
      shop.id
    );

const today =
  schedule
    .weekDay(
      time
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

const lunch =
  workload
    .peakProfile(
      {
        ...time,
        hour:12,
        minute:0
      }
    );

assert.equal(
  lunch.id,
  'lunch',
  '12点必须属于午餐高峰'
);

assert.ok(
  lunch.demandMultiplier >
  1.15,
  '午餐高峰必须真实提高需求'
);

const normal =
  workload
    .peakProfile(
      {
        ...time,
        hour:15,
        minute:0
      }
    );

assert.equal(
  normal.id,
  'normal',
  '15点必须回到平峰'
);

const before =
  workload
    .getSnapshot(
      shop.id,
      {
        ...time,
        hour:12,
        minute:0
      }
    );

workload
  .advance(
    shop.id,
    60,
    {
      ...time,
      hour:12,
      minute:0
    }
  );

const afterHour =
  workload
    .getSnapshot(
      shop.id,
      {
        ...time,
        hour:13,
        minute:0
      }
    );

assert.ok(
  afterHour.avgEnergy <
    before.avgEnergy ||
  afterHour.avgStress >
    before.avgStress,
  '工作一小时后必须产生真实疲劳或压力'
);

for (
  const id
  of Object.keys(
    state.employees
  )
) {
  schedule
    .setEmployeeShift(
      shop.id,
      id,
      'early'
    );
}

for (
  let hour = 7;
  hour <= 15;
  hour++
) {
  workload
    .advance(
      shop.id,
      60,
      {
        ...time,
        hour,
        minute:0
      }
    );
}

const overtime =
  workload
    .getSnapshot(
      shop.id,
      {
        ...time,
        hour:15,
        minute:30
      }
    );

assert.ok(
  overtime.todayOvertimeMinutes >
  0,
  '超过8小时的实际在岗必须产生加班分钟'
);

assert.ok(
  overtime.todayOvertimePay >
  0,
  '真实加班必须产生额外人工成本'
);

assert.ok(
  overtime.avgFatigue >
  before.avgFatigue,
  '长时间工作必须提高平均疲劳'
);

assert.ok(
  workload
    .getCapacityModifier(
      shop.id,
      {
        ...time,
        hour:15,
        minute:30
      }
    ) <=
    1.03,
  '疲劳修正必须进入合理上限'
);

schedule
  .setEmployeeOffDay(
    shop.id,
    'c1',
    today
  );

const conflict =
  workload
    .getSnapshot(
      shop.id,
      {
        ...time,
        hour:12,
        minute:0
      }
    );

assert.ok(
  conflict.conflicts
    .some(
      row =>
        row.roleId ===
        'chef'
    ),
  '午餐高峰厨师缺岗必须形成真实排班冲突'
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
    'V089_STAFF_WORKLOAD'
  ) &&
  simulationSource.includes(
    'peakDemandFactor'
  ) &&
  simulationSource.includes(
    'workloadTick.overtimeCost'
  ),
  '经营模拟必须接入高峰、疲劳和加班成本'
);

const scheduleSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/scheduleSceneV087.js'
    ),
    'utf8'
  );

assert.ok(
  scheduleSource.includes(
    'V089_SCHEDULE_WORKLOAD_UI'
  ) &&
  scheduleSource.includes(
    'workload.avgFatigue'
  ) &&
  scheduleSource.includes(
    'workload.conflictCount'
  ),
  '排班页面必须展示真实工作负荷状态'
);

console.log(
  'V0.8.9 staff workload tests passed'
);
