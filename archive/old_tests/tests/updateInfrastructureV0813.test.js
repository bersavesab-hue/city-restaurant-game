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
  return fs.readFileSync(
    path.join(ROOT, rel),
    'utf8'
  );
}

function versionAtLeast(current, minimum) {
  const a =
    String(current || '0')
      .split('.')
      .map(Number);
  const b =
    String(minimum || '0')
      .split('.')
      .map(Number);
  const length =
    Math.max(a.length, b.length);

  for (let i = 0; i < length; i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return true;
}

const pkg =
  JSON.parse(
    read('package.json')
  );

assert.ok(
  versionAtLeast(
    pkg.version,
    '0.8.13'
  ),
  '正式版本不能低于0.8.13'
);

for (
  const file
  of [
    'src/core/saveMigrationV0813.js',
    'src/core/seedManagerV0813.js',
    'tests/saveMigrationV0813.test.js',
    'tests/seedManagerV0813.test.js'
  ]
) {
  assert.ok(
    fs.existsSync(
      path.join(ROOT, file)
    ),
    '缺少V0.8.13正式文件: ' +
    file
  );
}

const saveSource =
  read('src/core/saveSystem.js');

for (
  const marker
  of [
    "city_restaurant_save_v1",
    "city_restaurant_save_v1_backup",
    'V083_SAVE_THROTTLE',
    'autoSaveIntervalMs = 20000',
    'flush()',
    "require('./saveMigrationV0813.js')",
    "require('./seedManagerV0813.js')"
  ]
) {
  assert.ok(
    saveSource.includes(marker),
    '存档系统缺少兼容/升级标记: ' +
    marker
  );
}

const simulation =
  read('src/core/simulationSystem.js');

assert.ok(
  simulation.includes(
    "require('./seedManagerV0813.js')"
  ) &&
  /seedManager\s*\.\s*deriveSeed\s*\(/.test(
    simulation
  ),
  'simulationSystem必须接入全局主种子派生机制'
);

const runner =
  read('scripts/run-ci-tests-v060.js');

for (
  const test
  of [
    'tests/saveMigrationV0813.test.js',
    'tests/seedManagerV0813.test.js',
    'tests/updateInfrastructureV0813.test.js'
  ]
) {
  assert.ok(
    runner.includes(test),
    '永久CI缺少 ' + test
  );
}

assert.ok(
  !fs.existsSync(
    path.join(
      ROOT,
      'scripts/apply-update-patch.js'
    )
  ),
  '工作流执行后必须删除一次性安装器'
);

console.log(
  'V0.8.13 update infrastructure tests passed'
);
