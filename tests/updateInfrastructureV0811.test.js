'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function versionAtLeast(current, minimum) {
  const a = String(current || '0').split('.').map(Number);
  const b = String(minimum || '0').split('.').map(Number);
  const n = Math.max(a.length, b.length);

  for (let i = 0; i < n; i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }

  return true;
}

const pkg = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'package.json'),
    'utf8'
  )
);

assert.ok(
  versionAtLeast(pkg.version, '0.8.11'),
  '正式版本不能低于0.8.11'
);

const lockPath = path.join(ROOT, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert.equal(lock.version, pkg.version, 'package-lock顶层版本必须与package.json一致');
  assert.equal(lock.packages[''].version, pkg.version, 'package-lock根包版本必须一致');
}

const runner = fs.readFileSync(
  path.join(ROOT, 'scripts/run-ci-tests-v060.js'),
  'utf8'
);

for (const test of [
  'tests/globalStateBusV0811.test.js',
  'tests/stateBridgeV0811.test.js',
  'tests/updateInfrastructureV0811.test.js'
]) {
  assert.ok(
    runner.includes(test),
    '永久CI缺少：' + test
  );
}

assert.ok(
  !fs.existsSync(
    path.join(ROOT, 'scripts/apply-update-patch.js')
  ),
  '工作流执行后必须删除V0.8.11一次性增量安装脚本'
);

const mainSource = fs.readFileSync(
  path.join(ROOT, 'src/main.js'),
  'utf8'
);

assert.ok(mainSource.includes("require('./core/globalStateBusV0811.js')"));
assert.ok(mainSource.includes("require('./core/stateBridgeV0811.js')"));
assert.ok(mainSource.includes('V0811_GLOBAL_STATE_BUS_BOOT'));
assert.ok(mainSource.includes('stateBridge.install()'));
assert.ok(mainSource.includes('runtime.stateBus ='));
assert.ok(mainSource.includes('V0811_STATE_BUS_RUNTIME_SYNC'));
assert.ok(/stateBridge\s*\.\s*syncRuntime/.test(mainSource));
assert.ok(mainSource.includes('V0810_ENTRY_ROUTER_BOOT'), 'V0.8.10统一路由接线必须保留');

const workflow = fs.readFileSync(
  path.join(ROOT, '.github/workflows/apply-update.yml'),
  'utf8'
);

assert.ok(workflow.includes('update.zip 不允许直接覆盖 package.json'));
assert.ok(workflow.includes('scripts/apply-update-patch.js'));
assert.ok(workflow.includes('git reset .github/workflows'));

console.log('V0.8.11 update infrastructure tests passed');
