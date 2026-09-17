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

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert.ok(versionAtLeast(pkg.version, '0.8.10'), '正式版本不能低于0.8.10');

const runner = fs.readFileSync(path.join(ROOT, 'scripts/run-ci-tests-v060.js'), 'utf8');
assert.ok(runner.includes('tests/featureRoutingV0810.test.js'));
assert.ok(runner.includes('tests/updateInfrastructureV0810.test.js'));

assert.ok(
  !fs.existsSync(path.join(ROOT, 'scripts/apply-update-patch.js')),
  '工作流执行后必须删除一次性增量安装脚本'
);

const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/apply-update.yml'), 'utf8');
assert.ok(workflow.includes('update.zip 不允许直接覆盖 package.json'));
assert.ok(workflow.includes('scripts/apply-update-patch.js'));

const oldRegression = fs.readFileSync(path.join(ROOT, 'tests/updateInfrastructureV089.test.js'), 'utf8');
assert.ok(oldRegression.includes('V0810_VERSION_GUARD'));
assert.ok(!oldRegression.includes("'正式版本必须为0.8.9'"));

console.log('V0.8.10 update infrastructure tests passed');
