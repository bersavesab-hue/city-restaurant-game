'use strict';

const assert = require('assert');
const cp = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const registry = require('../src/registry/ProjectModuleRegistry.js');

const index = registry.buildDirectoryIndex();

for (const requiredDirectory of ['core', 'data', 'ui', 'food', 'finance', 'renovation', 'property']) {
  assert.ok(index[requiredDirectory], '核心目录必须有明确架构归属: ' + requiredDirectory);
}

assert.ok(!index.service, '已删除的单数 service/ 目录不能继续出现在架构注册表');
assert.ok(index.services, '应用服务统一归属 services/');

assert.deepStrictEqual(
  registry.knownCaseCollisions,
  [],
  '已解决的大小写冲突不能继续作为历史白名单存在'
);

assert.deepStrictEqual(
  registry.legacyCorePresentationFiles,
  [],
  'core 表现层兼容白名单应在迁移完成后清空'
);

const debtIds = new Set(registry.migrationDebt.map((item) => item.id));
for (const requiredDebt of [
  'renovation-decoration-overlap',
  'people-model-overlap',
  'legacy-main-example'
]) {
  assert.ok(debtIds.has(requiredDebt), '剩余架构债务不能被静默遗忘: ' + requiredDebt);
}

for (const resolvedDebt of [
  'state-case-collision',
  'core-presentation-leak',
  'bootstrap-overlap',
  'service-singular-plural-overlap'
]) {
  assert.ok(!debtIds.has(resolvedDebt), '已解决架构债务不应继续登记: ' + resolvedDebt);
}

const result = cp.spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts/architecture-audit.js')],
  {
    cwd: ROOT,
    encoding: 'utf8'
  }
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

assert.strictEqual(result.status, 0, '架构边界检查必须通过');

console.log('Architecture boundary regression tests passed');
