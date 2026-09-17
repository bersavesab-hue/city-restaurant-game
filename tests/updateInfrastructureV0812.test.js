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

function read(rel) {
  return fs
    .readFileSync(
      path.join(
        ROOT,
        rel
      ),
      'utf8'
    );
}

function versionAtLeast(
  current,
  minimum
) {
  const a =
    String(
      current ||
      '0'
    )
      .split('.')
      .map(Number);

  const b =
    String(
      minimum ||
      '0'
    )
      .split('.')
      .map(Number);

  const length =
    Math.max(
      a.length,
      b.length
    );

  for (
    let i = 0;
    i <
    length;
    i++
  ) {
    const av =
      a[i] ||
      0;

    const bv =
      b[i] ||
      0;

    if (av > bv) {
      return true;
    }

    if (av < bv) {
      return false;
    }
  }

  return true;
}

const pkg =
  JSON.parse(
    read(
      'package.json'
    )
  );

assert.ok(
  versionAtLeast(
    pkg.version,
    '0.8.12'
  ),
  '正式版本不能低于0.8.12'
);

assert.ok(
  fs.existsSync(
    path.join(
      ROOT,
      'src/core/timeScheduleCoordinatorV0812.js'
    )
  ),
  '统一时间/营业日程协调器必须进入正式树'
);

const main =
  read(
    'src/main.js'
  );

assert.ok(
  main.includes(
    'V0812_TIME_SCHEDULE_BOOT'
  ) &&
  main.includes(
    "require('./core/timeScheduleCoordinatorV0812.js')"
  ),
  '主循环必须安装统一时间/营业日程协调器'
);

const timeSystem =
  read(
    'src/core/timeSystem.js'
  );

assert.ok(
  timeSystem.includes(
    "require('./timeScheduleCoordinatorV0812.js')"
  ),
  'timeSystem必须复用统一日历'
);

const simulation =
  read(
    'src/core/simulationSystem.js'
  );

assert.ok(
  simulation.includes(
    "require('./timeScheduleCoordinatorV0812.js')"
  ),
  'simulationSystem必须复用统一日历'
);

const schedule =
  read(
    'src/operations/operationsScheduleV087.js'
  );

assert.ok(
  schedule.includes(
    'getBusinessHours'
  ) &&
  schedule.includes(
    'isOpenAt'
  ) &&
  schedule.includes(
    'notifyScheduleChange'
  ),
  '营业时间、开闭店判断与排班变更必须统一'
);

const restaurant =
  read(
    'src/operations/restaurantSimulationV081.js'
  );

assert.ok(
  /operationsSchedule\s*\.\s*getBusinessHours\s*\(/.test(
    restaurant
  ) &&
  /operationsSchedule\s*\.\s*isOpenAt\s*\(/.test(
    restaurant
  ),
  '经营模拟不得再维护独立营业时间判断'
);

const lifecycle =
  read(
    'src/core/businessLifecycleV086.js'
  );

assert.ok(
  /timeScheduleCoordinator\s*\.\s*dayOrdinal\s*\(/.test(
    lifecycle
  ),
  '门店生命周期日序必须使用统一日历'
);

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/timeScheduleCoordinatorV0812.test.js',
    'tests/timedProgressionV0812.test.js',
    'tests/updateInfrastructureV0812.test.js'
  ]
) {
  assert.ok(
    runner.includes(
      test
    ),
    '永久CI缺少 ' +
    test
  );
}

assert.ok(
  !fs.existsSync(
    path.join(
      ROOT,
      'scripts/apply-update-patch.js'
    )
  ),
  '工作流结束前必须删除一次性安装器'
);

console.log(
  'V0.8.12 update infrastructure tests passed'
);
