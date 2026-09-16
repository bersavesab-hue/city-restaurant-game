'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

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

const pkg = JSON.parse(read('package.json'));
assert.ok(
  versionAtLeast(pkg.version, '0.8.14'),
  '正式版本不能低于0.8.14'
);

for (const rel of [
  'src/core/newGameFlowV0814.js',
  'src/scenes/newGameSceneV0814.js'
]) {
  assert.ok(
    fs.existsSync(path.join(ROOT, rel)),
    rel + ' 必须进入正式树'
  );
}

const main = read('src/main.js');
assert.ok(
  main.includes("require('./core/newGameFlowV0814.js')") &&
  main.includes("require('./scenes/newGameSceneV0814.js')") &&
  main.includes("'newGame',\n  newGameScene") &&
  main.includes('V0814_NEW_GAME_FLOW_BOOT'),
  '主程序必须注册并安装完整开局流程'
);
assert.ok(
  main.includes('const restoredFromSave ='),
  '必须保留旧启动存档恢复兼容锚点'
);
assert.ok(
  /newGameFlow\s*\.\s*getStartupRoute\s*\(/.test(main),
  '启动路线必须由开局流程判断'
);

const system = read('src/scenes/systemSceneV086.js');
assert.ok(
  system.includes("require('../core/newGameFlowV0814.js')") &&
  /newGameFlow\s*\.\s*restart\s*\(/.test(system) &&
  system.includes("'newGame'"),
  '系统重新开局必须进入新的开局流程'
);

const runner = read('scripts/run-ci-tests-v060.js');
for (const rel of [
  'tests/newGameFlowV0814.test.js',
  'tests/newGameCompatibilityV0814.test.js',
  'tests/updateInfrastructureV0814.test.js'
]) {
  assert.ok(
    runner.includes(rel),
    '永久CI缺少 ' + rel
  );
}

assert.ok(
  !fs.existsSync(
    path.join(ROOT, 'scripts/apply-update-patch.js')
  ),
  '工作流结束前必须删除一次性安装器'
);

console.log(
  'V0.8.14 update infrastructure tests passed'
);
