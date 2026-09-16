'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
const runner = fs.readFileSync(path.join(ROOT, 'scripts/run-ci-tests-v060.js'), 'utf8');
const gradle = fs.readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8');

const versionParts =
  String(pkg.version)
    .split('.')
    .map(Number);

const versionNumber =
  versionParts[0] * 10000 +
  versionParts[1] * 100 +
  versionParts[2];

assert.ok(
  versionNumber >= 849,
  '项目版本不得低于0.8.49'
);

assert.strictEqual(
  lock.version,
  pkg.version
);

assert.strictEqual(
  lock.packages[''].version,
  pkg.version
);

for (const name of [
  'tests/renovationAreaV0849.test.js',
  'tests/renovationUiV0849.test.js',
  'tests/updateInfrastructureV0849.test.js'
]) {
  assert.ok(runner.includes(name), '主测试入口缺少：' + name);
}

const codeMatch =
  gradle.match(
    /versionCode\s+(\d+)/
  );

const nameMatch =
  gradle.match(
    /versionName\s+'([^']+)'/
  );

assert.ok(
  codeMatch &&
  Number(codeMatch[1]) >= 849,
  'Android versionCode不得低于849'
);

assert.ok(
  nameMatch &&
  nameMatch[1] === pkg.version,
  'Android versionName必须与package.json一致'
);
assert.ok(fs.existsSync(path.join(ROOT, 'PATCH_MANIFEST_V0849.json')));

const discovery = require('../tools/devkit/test-discovery.js').audit(ROOT);
assert.strictEqual(
  discovery.metrics.uncovered,
  0,
  '全部测试必须纳入主入口：' + discovery.uncovered.join(', ')
);

console.log('V0.8.49 update infrastructure tests passed');
