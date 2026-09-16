'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
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

const pkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
);

assert.ok(versionGte(pkg.version, '0.6.1'));
assert.ok(!pkg.scripts.preinstall);
assert.ok(!pkg.scripts.postinstall);

assert.ok(exists('scripts/run-ci-tests-v060.js'));
assert.ok(exists('scripts/build-android-js-v060.js'));
assert.ok(exists('scripts/v60-audit.js'));
assert.ok(!exists('update .zip'));
assert.ok(!exists('.update-recovery-v052'));

const scripts = fs.readdirSync(path.join(ROOT, 'scripts'));

assert.ok(
  !scripts.some(x => /^apply-v/i.test(x)),
  '正式树不能继续保留apply-v补丁器'
);

assert.ok(
  !scripts.some(x => /v052/i.test(x)),
  '正式树不能继续依赖V0.5.2恢复脚本'
);

const main = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');

assert.ok(
  main.length < 155000,
  'src/main.js仍然过度膨胀，旧覆盖层可能没有被清理'
);

assert.ok(
  !main.includes('V21_HOME_ICON_POLISH') &&
  !main.includes('V28_TARGET_MARKERS_AND_BADGES')
);

assert.ok(main.includes('V33_GLOBAL_NAV_UNIFICATION'));

const scene = fs.readFileSync(
  path.join(ROOT, 'src/scenes/renovationScene.js'),
  'utf8'
);

const start = scene.indexOf('  drawFloorCanvas(');
const end = scene.indexOf('\n  drawToolButton(', start);
const block = scene.slice(start, end);

assert.ok(block.includes('floorGeometry'));
assert.ok(!/\bgeometry\b/.test(block));

console.log('v60CleanBase.test.js PASS');
