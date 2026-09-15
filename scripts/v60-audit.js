'use strict';

// CLEAN_BASE_V060_AUDIT
// Updated by DevKit 1.0: validates a minimum clean-base version instead of
// hard-coding one patch version forever.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function versionGte(a, b) {
  const aa = String(a || '0').split('.').map(x => Number((x.match(/\d+/) || ['0'])[0]));
  const bb = String(b || '0').split('.').map(x => Number((x.match(/\d+/) || ['0'])[0]));
  const len = Math.max(aa.length, bb.length);

  for (let i = 0; i < len; i++) {
    const av = aa[i] || 0;
    const bv = bb[i] || 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }

  return true;
}

const forbidden = [
  'update .zip',
  '.update-recovery-v052',
  'scripts/apply-v20-home-1to1.js',
  'scripts/apply-v21-home-polish.js',
  'scripts/apply-v26-home-rewrite.js',
  'scripts/apply-v42-store-master.js',
  'scripts/apply-v43-1-hotfix.js',
  'scripts/apply-v48-dynamic-floor.js',
  'scripts/ci-reconcile-update-race-v052.js',
  'scripts/run-ci-tests-v052.js',
  'scripts/build-android-js-v052.js',
  'scripts/project-health-check-v052.js',
  'assets/images/v21',
  'assets/images/v24'
];

for (const rel of forbidden) {
  assert.ok(!exists(rel), '遗留文件仍存在：' + rel);
}

const pkg = JSON.parse(read('package.json'));

assert.ok(
  versionGte(pkg.version, '0.6.1'),
  'package版本不得低于干净基线0.6.1'
);

assert.ok(!pkg.scripts.preinstall, '不能重新引入一次性preinstall补丁器');
assert.ok(!pkg.scripts.postinstall, '不能重新引入旧恢复型postinstall');

assert.equal(pkg.scripts.test, 'node scripts/run-ci-tests-v060.js');
assert.equal(pkg.scripts['build:android-js'], 'node scripts/build-android-js-v060.js');
assert.ok(
  String(pkg.scripts.pretest || '').includes(
    'node tests/androidStartupSmoke.test.js'
  ),
  '必须保留 Android 启动冒烟测试，防止真机启动级回归'
);

const main = read('src/main.js');

for (const token of [
  'V21_HOME_ICON_POLISH',
  'V22_HOME_MATCH',
  'V23_HOME_REMAP',
  'V24_FINAL_HOME_PACK',
  'V25_STRICT_HOME_LAYOUT',
  'V26_HARD_REBUILD_HOME',
  'V28_TARGET_MARKERS_AND_BADGES',
  'v26GetPoint(',
  'v26GetBadgeSummary('
]) {
  assert.ok(!main.includes(token), '主页旧覆盖层仍存在：' + token);
}

for (const token of [
  'V29_CRISP_ICON_PASS',
  'V32_REFERENCE_HOME_REBUILD',
  'V33_GLOBAL_NAV_UNIFICATION',
  'V34_MONEY_FORMAT_FIX',
  'V35_TOP_HUD_POLISH'
]) {
  assert.ok(main.includes(token), '当前稳定主页层缺失：' + token);
}

assert.ok(
  main.includes("id: 'renovation', label: '装修'"),
  '最终全局导航必须包含装修'
);

const scene = read('src/scenes/renovationScene.js');
const floorStart = scene.indexOf('  drawFloorCanvas(');
const floorEnd = scene.indexOf('\n  drawToolButton(', floorStart);

assert.ok(
  floorStart >= 0 && floorEnd > floorStart,
  '无法定位装修平面图渲染器'
);

const floorBlock = scene.slice(floorStart, floorEnd);

assert.ok(
  floorBlock.includes('const floorGeometry ='),
  'floorGeometry未定义'
);

assert.ok(
  !/\bgeometry\b/.test(floorBlock),
  '装修平面图仍存在未定义geometry变量'
);

assert.ok(
  floorBlock.includes('this.drawGeometryShell(') &&
  floorBlock.includes('floorGeometry'),
  '动态房型没有进入主渲染'
);

const build = read('scripts/build-android-js-v060.js');

assert.ok(
  !build.includes('preserveOrFail') &&
  !build.includes('保留现有可用 game.bundle.js'),
  '构建器不能回退旧bundle'
);

console.log('CLEAN BASE AUDIT PASS');
