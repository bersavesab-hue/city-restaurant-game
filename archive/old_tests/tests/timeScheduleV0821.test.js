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

const timeSystem =
  require('../src/core/timeSystem.js');

const simulationConfig =
  require('../src/core/simulationConfig.js');

const simulationSystem =
  require('../src/core/simulationSystem.js');

const renovationSystem =
  require('../src/renovation/renovationSystem.js');

const openingPrepSystem =
  require('../src/opening/openingPrepSystem.js');

const globalTimeline =
  require('../src/core/globalTimelineV0821.js');

assert.deepEqual(
  simulationConfig
    .time
    .allowedSpeeds,
  [
    1,
    2,
    5,
    10,
    20,
    100
  ],
  '旧底层倍速契约必须继续保留'
);

assert.deepEqual(
  simulationConfig
    .time
    .uiSpeeds,
  [
    1,
    3,
    8
  ],
  'V1.2.1 玩家主界面只展示1×/3×/8×'
);

assert.equal(
  simulationConfig
    .time
    .baseGameMinutesPerSecond,
  6,
  '旧底层倍速基准保持现实1秒=6游戏分钟'
);

assert.equal(
  simulationConfig
    .time
    .playerBaseGameMinutesPerSecond,
  12,
  'V1.2.1 玩家1×必须达到现实1秒=12游戏分钟'
);

assert.equal(
  simulationConfig
    .time
    .maxSimulationChunkMinutes,
  30,
  '旧内部高速档仍允许最多30分钟分段'
);

assert.equal(
  simulationConfig
    .time
    .playerMaxSimulationChunkMinutes,
  10,
  '玩家1×/3×/8×必须最多按10分钟分段模拟'
);

gameState.reset();

gameState
  .getTime()
  .speed =
  10;

assert.equal(
  gameState
    .getTimeSpeed(),
  10,
  '旧底层10倍速读取必须保持兼容'
);

assert.equal(
  gameState
    .setTimeSpeed(
      100
    ),
  true,
  '旧内部100倍速调用必须继续兼容'
);


gameState
  .getTime()
  .speed =
  10;

assert.equal(
  gameState
    .normalizePlayerTimeSpeed(),
  3,
  '真正恢复玩家旧存档时10×应迁移到3×'
);

gameState
  .setTimeSpeed(
    3
  );

timeSystem
  .resetAccumulator();

const legacyBefore =
  gameState
    .getTime()
    .hour *
    60 +
  gameState
    .getTime()
    .minute;

timeSystem
  .update(
    1000
  );

const legacyAfter =
  gameState
    .getTime()
    .hour *
    60 +
  gameState
    .getTime()
    .minute;

assert.equal(
  legacyAfter -
    legacyBefore,
  36,
  '3×必须保持现实1秒=游戏36分钟'
);

gameState
  .setTimeSpeed(
    8
  );

timeSystem
  .resetAccumulator();

const beforeTime =
  gameState
    .getTime();

const beforeMinute =
  simulationSystem
    .getDayOrdinal(
      beforeTime
    ) *
    1440 +
  beforeTime.hour *
    60 +
  beforeTime.minute;

const steps =
  [];

const advanced =
  timeSystem
    .update(
      250,
      step => {
        steps.push(
          step
        );
      }
    );

assert.equal(
  advanced,
  24,
  '8倍速下250ms应推进24游戏分钟'
);

assert.ok(
  steps.length >=
    3,
  '24分钟必须被分成多个细粒度模拟步'
);

assert.ok(
  steps.every(
    step =>
      step <=
      10
  ),
  '每个模拟步不得超过10分钟'
);

assert.equal(
  steps.reduce(
    (
      sum,
      step
    ) =>
      sum +
      step,
    0
  ),
  advanced,
  '分段时间总量必须等于实际推进时间'
);

const afterTime =
  gameState
    .getTime();

const afterMinute =
  simulationSystem
    .getDayOrdinal(
      afterTime
    ) *
    1440 +
  afterTime.hour *
    60 +
  afterTime.minute;

assert.equal(
  afterMinute -
    beforeMinute,
  24,
  '分段模拟不能漏掉游戏时间'
);

gameState.reset();

gameState.addShop({
  id:'shop_time_fix',
  name:'装修时间联动测试店',
  status:'renovating',
  districtId:'university',
  usableArea:80,
  grossArea:80,
  monthlyRent:8000,
  seatEstimate:24
});

const shop =
  gameState
    .getBusiness()
    .shops
    .find(
      item =>
        item.id ===
        'shop_time_fix'
    );

renovationSystem
  .ensurePlan(
    shop.id
  );

const plan =
  gameState
    .getRenovations()[
      shop.id
    ];

const time =
  gameState
    .getTime();

const absolute =
  simulationSystem
    .getDayOrdinal(
      time
    ) *
    1440 +
  time.hour *
    60 +
  time.minute;

plan.status =
  'constructing';

plan.construction = {
  contractor:{
    id:'test',
    name:'测试施工队',
    days:1
  },
  startDay:
    simulationSystem
      .getDayOrdinal(
        time
      ),
  finishDay:
    simulationSystem
      .getDayOrdinal(
        time
      ) +
    1,
  startMinute:
    absolute,
  finishMinute:
    absolute +
    120,
  paid:1000,
  snapshot:{
    totalSeats:24
  }
};

let progress =
  renovationSystem
    .getConstructionProgress(
      shop.id
    );

assert.equal(
  progress.progress,
  0,
  '装修刚开始时进度必须为0'
);

timeSystem
  .addMinutes(
    60
  );

progress =
  renovationSystem
    .getConstructionProgress(
      shop.id
    );

assert.ok(
  progress.progress >
    0.49 &&
  progress.progress <
    0.51,
  '装修进度必须跟随真实游戏分钟变化'
);

globalTimeline
  .update(
    60
  );

assert.equal(
  gameState
    .getRenovations()[
      shop.id
    ].status,
  'constructing',
  '未到完工分钟不能提前完成装修'
);

timeSystem
  .addMinutes(
    60
  );

globalTimeline
  .update(
    60
  );

assert.equal(
  gameState
    .getRenovations()[
      shop.id
    ].status,
  'completed',
  '不进入装修页面也必须在时间到达后自动完工'
);

assert.equal(
  shop.status,
  'renovated_pending_license',
  '装修完工必须自动进入后续筹备状态'
);

const equipment =
  openingPrepSystem
    .ensureEquipment(
      shop.id
    );

equipment.status =
  'ordered';

equipment.deliveryDay =
  simulationSystem
    .getDayOrdinal(
      gameState
        .getTime()
    );

globalTimeline
  .update(
    1
  );

assert.equal(
  openingPrepSystem
    .ensureEquipment(
      shop.id
    )
    .status,
  'installed',
  '设备到货也必须由全局时间自动推进'
);

const permits =
  openingPrepSystem
    .getPermitState(
      shop.id
    );

permits
  .items
  .business
  .status =
  'applying';

permits
  .items
  .business
  .appliedDay =
  simulationSystem
    .getDayOrdinal(
      gameState
        .getTime()
    ) -
  2;

permits
  .items
  .business
  .finishDay =
  simulationSystem
    .getDayOrdinal(
      gameState
        .getTime()
    );

globalTimeline
  .update(
    1
  );

assert.notEqual(
  permits
    .items
    .business
    .status,
  'applying',
  '证照到期后必须由全局时间自动进入审批结果'
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
    "require('./core/globalTimelineV0821.js')"
  ),
  '主循环必须接入全局日程系统'
);

assert.ok(
  mainSource.includes(
    "'time:smart'"
  ) &&
  mainSource.includes(
    "'time:speed:3'"
  ) &&
  mainSource.includes(
    "'time:speed:8'"
  ),
  'UI必须提供1×/3×/8×与智能推进'
);

assert.ok(
  mainSource.includes(
    'stepMinutes'
  ) &&
  mainSource.includes(
    'timelineChanged'
  ),
  '主循环必须采用高倍速分段推进'
);

const renovationSceneSource =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/scenes/renovationScene.js'
    ),
    'utf8'
  );

assert.ok(
  renovationSceneSource.includes(
    'progressInfo'
  ) &&
  renovationSceneSource.includes(
    'remainingMinutes'
  ),
  '装修页面必须显示真实施工进度与剩余时间'
);

assert.ok(
  !renovationSceneSource.includes(
    "? 308\n        : 174"
  ),
  '装修进度条不能再使用固定56%假进度'
);

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
    'arrivalBatchLimit'
  ),
  '高倍速客流必须使用动态批量上限'
);

console.log(
  'V0.8.21 time/schedule integration tests passed'
);
