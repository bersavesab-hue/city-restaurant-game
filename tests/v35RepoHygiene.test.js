'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');

assert.ok(pkg.scripts && pkg.scripts.pretest, 'V35必须在GitHub Actions测试前触发安全清理');
assert.ok(pkg.scripts.health, 'V35必须提供工程体检命令');
assert.ok(pkg.scripts.test.includes('tests/v34MoneyFormat.test.js'), '不能丢失V34资金显示回归测试');
assert.ok(pkg.scripts.test.includes('tests/v35RepoHygiene.test.js'), 'V35自身回归测试必须纳入npm test');

for (const token of [
  'node_modules/',
  'android/.gradle/',
  'android/app/build/',
  'android/app/src/main/assets/game.bundle.js',
  'android/app/src/main/assets/assets/',
  'reports/player-lab/latest/',
  'reports/project-health/',
  'update .zip'
]) {
  assert.ok(ignore.includes(token), '.gitignore缺少安全生成路径：' + token);
}

assert.ok(!/^update\.zip$/m.test(ignore), '不能忽略update.zip，否则一键更新无法触发');
assert.ok(fs.existsSync(path.join(ROOT, 'scripts/repo-cleanup.js')), '缺少repo-cleanup.js');
assert.ok(fs.existsSync(path.join(ROOT, 'scripts/project-health-check.js')), '缺少project-health-check.js');

console.log('V35 repository hygiene regression tests passed');
