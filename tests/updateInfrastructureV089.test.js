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

const pkg =
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'package.json'
      ),
      'utf8'
    )
  );

assert.equal(
  pkg.version,
  '0.8.9',
  '正式版本必须为0.8.9'
);

assert.ok(
  !String(
    pkg.scripts &&
    pkg.scripts.pretest ||
    ''
  ).includes(
    'upgrade-workload-v089.js'
  ),
  '正式pretest不能继续调用V0.8.9临时升级脚本'
);

assert.ok(
  !fs.existsSync(
    path.join(
      ROOT,
      'scripts/upgrade-workload-v089.js'
    )
  ),
  '正式树必须删除V0.8.9临时升级脚本'
);

const runner =
  fs.readFileSync(
    path.join(
      ROOT,
      'scripts/run-ci-tests-v060.js'
    ),
    'utf8'
  );

assert.ok(
  runner.includes(
    'tests/staffWorkloadV089.test.js'
  ) &&
  runner.includes(
    'tests/updateInfrastructureV089.test.js'
  ),
  '永久CI必须包含V0.8.9工作负荷和基础设施回归测试'
);

const simulation =
  fs.readFileSync(
    path.join(
      ROOT,
      'src/operations/restaurantSimulationV081.js'
    ),
    'utf8'
  );

assert.ok(
  simulation.includes(
    'V089_STAFF_WORKLOAD'
  ),
  '正式经营模拟必须保留V0.8.9工作负荷接线'
);

console.log(
  'V0.8.9 update infrastructure tests passed'
);
