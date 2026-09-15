'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
const runner = fs.readFileSync(path.join(ROOT, 'scripts/run-ci-tests-v060.js'), 'utf8');
const gradle = fs.readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8');

assert.strictEqual(pkg.version, '0.8.49');
assert.strictEqual(lock.version, '0.8.49');
assert.strictEqual(lock.packages[''].version, '0.8.49');

for (const name of [
  'tests/renovationAreaV0849.test.js',
  'tests/renovationUiV0849.test.js',
  'tests/updateInfrastructureV0849.test.js'
]) {
  assert.ok(runner.includes(name), '主测试入口缺少：' + name);
}

assert.ok(gradle.includes('versionCode 849'));
assert.ok(gradle.includes("versionName '0.8.49'"));
assert.ok(fs.existsSync(path.join(ROOT, 'PATCH_MANIFEST_V0849.json')));

const discovery = require('../tools/devkit/test-discovery.js').audit(ROOT);
assert.strictEqual(
  discovery.metrics.uncovered,
  0,
  '全部测试必须纳入主入口：' + discovery.uncovered.join(', ')
);

console.log('V0.8.49 update infrastructure tests passed');
