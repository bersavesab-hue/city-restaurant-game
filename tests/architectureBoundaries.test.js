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

const debtIds = new Set(registry.migrationDebt.map((item) => item.id));
for (const requiredDebt of [
  'state-case-collision',
  'core-presentation-leak',
  'bootstrap-overlap',
  'service-singular-plural-overlap',
  'renovation-decoration-overlap'
]) {
  assert.ok(debtIds.has(requiredDebt), '已知架构债务不能被静默遗忘: ' + requiredDebt);
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
