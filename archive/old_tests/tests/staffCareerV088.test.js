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

const staffCareer =
  require('../src/operations/staffCareerV088.js');

gameState.reset();

gameState
  .setCash(
    120000
  );

gameState
  .addShop({
    id:'shop_staff_v088',
    name:'员工成长测试店',
    status:'open',
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

const day =
  staffCareer
    .currentDay();

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
      age:34,
      roleId:'manager',
      roleName:'店长',
      wage:7200,
      skill:78,
      hiredDay:
        day -
        120
    },
    {
      id:'c1',
      name:'王志强',
      age:31,
      roleId:'chef',
      roleName:'厨师',
      wage:6800,
      skill:82,
      hiredDay:
        day -
        120
    },
    {
      id:'s1',
      name:'李嘉宁',
      age:25,
      roleId:'server',
      roleName:'服务员',
      wage:4200,
      skill:68,
      hiredDay:
        day -
        65
    },
    {
      id:'s2',
      name:'张博文',
      age:27,
      roleId:'server',
      roleName:'服务员',
      wage:4300,
      skill:65,
      hiredDay:
        day -
        65
    },
    {
      id:'k1',
      name:'刘雅琴',
      age:29,
      roleId:'cashier',
      roleName:'收银',
      wage:4400,
      skill:72,
      hiredDay:
        day -
        95
    }
  ]
};

const team =
  staffCareer
    .ensureTeam(
      shop.id
    );

assert.equal(
  team.length,
  5,
  '已录用员工必须全部进入长期职业系统'
);

const snapshot =
  staffCareer
    .getTeamSnapshot(
      shop.id
    );

assert.equal(
  snapshot.count,
  5,
  '团队管理页必须看到完整员工'
);

assert.ok(
  snapshot.employees
    .every(
      row =>
        row.title &&
        row.performance >
          0
    ),
  '每名员工必须有职级和绩效'
);

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

const scheduleState =
  gameState
    .getBusiness()
    .operationsSchedule
    .shops[
      shop.id
    ];

for (
  const id
  of Object.keys(
    scheduleState.employees
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

  schedule
    .setEmployeeShift(
      shop.id,
      id,
      'mid'
    );
}

const time = {
  ...gameState
    .getTime(),
  hour:12,
  minute:0
};

const beforeLeave =
  schedule
    .getCoverage(
      shop.id,
      time
    );

const leave =
  staffCareer
    .approveLeave(
      shop.id,
      'c1',
      1
    );

assert.ok(
  leave.ok,
  '必须允许员工请假'
);

const afterLeave =
  schedule
    .getCoverage(
      shop.id,
      time
    );

assert.ok(
  afterLeave.factor <
    beforeLeave.factor,
  '请假必须真实降低当天排班承载'
);

const cashBeforeTraining =
  gameState
    .getPlayer()
    .cash;

const train =
  staffCareer
    .startTraining(
      shop.id,
      's1'
    );

assert.ok(
  train.ok,
  '必须允许员工培训'
);

assert.ok(
  gameState
    .getPlayer()
    .cash <
    cashBeforeTraining,
  '培训必须真实消耗资金'
);

const server =
  staffState[
    shop.id
  ].hired
    .find(
      row =>
        row.id ===
        's1'
    );

const skillBefore =
  server.skill;

assert.ok(
  staffCareer
    .isUnavailable(
      server,
      day
    ).unavailable,
  '培训期间员工必须离岗'
);

staffCareer
  .processDay(
    train.finishDay
  );

assert.ok(
  server.skill >
    skillBefore,
  '培训完成后技能必须成长'
);

assert.equal(
  server.career.training,
  null,
  '培训完成后必须清除在训状态'
);

const cashier =
  staffState[
    shop.id
  ].hired
    .find(
      row =>
        row.id ===
        'k1'
    );

const wageBefore =
  cashier.wage;

const raise =
  staffCareer
    .giveRaise(
      shop.id,
      cashier.id
    );

assert.ok(
  raise.ok &&
  cashier.wage >
    wageBefore,
  '加薪必须真实修改工资'
);

assert.equal(
  staffCareer
    .giveRaise(
      shop.id,
      cashier.id
    )
    .ok,
  false,
  '30天内不能重复加薪'
);

const manager =
  staffState[
    shop.id
  ].hired
    .find(
      row =>
        row.id ===
        'm1'
    );

staffCareer
  .ensureCareer(
    shop.id,
    manager
  );

manager.skill =
  90;

manager.hiredDay =
  day -
  220;

const promotion =
  staffCareer
    .promote(
      shop.id,
      manager.id
    );

assert.ok(
  promotion.ok,
  '满足技能和任职天数后必须允许晋升'
);

assert.ok(
  manager.career.level >
    1,
  '晋升必须提高职业等级'
);

const profile =
  manager.personProfile;

const stressBefore =
  profile.state.stress;

const coach =
  staffCareer
    .coach(
      shop.id,
      manager.id
    );

assert.ok(
  coach.ok,
  '必须允许员工沟通关怀'
);

assert.ok(
  profile.state.stress <
    stressBefore,
  '沟通关怀必须降低员工压力'
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
    "require('./operations/staffCareerV088.js')"
  ) &&
  mainSource.includes(
    "require('./scenes/staffCareerSceneV088.js')"
  ),
  '主程序必须接入员工职业系统和团队管理页'
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
  staffSource.includes(
    '团队管理'
  ) &&
  staffSource.includes(
    "'staffCareer'"
  ),
  '招聘页必须提供团队管理入口'
);

const scheduleSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/operations/operationsScheduleV087.js'
    ),
    'utf8'
  );

assert.ok(
  scheduleSource.includes(
    'career.training'
  ) &&
  scheduleSource.includes(
    'career.leave'
  ),
  '培训和请假必须真实影响排班'
);

const liveWorldSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/world/liveWorldSystemV084.js'
    ),
    'utf8'
  );

assert.ok(
  liveWorldSource.includes(
    'careerUnavailable'
  ) &&
  liveWorldSource.includes(
    'dayOff'
  ),
  '长期员工状态必须接入NPC每日状态演化'
);

console.log(
  'V0.8.8 staff career tests passed'
);
