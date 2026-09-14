'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');

function runNode(rel, required = false) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    if (required) {
      console.error('[TEST] 必需文件缺失:', rel);
      process.exit(1);
    }
    return false;
  }
  console.log('\n[TEST]', rel);
  const r = cp.spawnSync(process.execPath, [abs], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
  return true;
}

function listJs(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile() && ent.name.endsWith('.js')) out.push(p);
    }
  }
  return out.sort();
}

runNode('scripts/ci-reconcile-update-race-v052.js');

for (const file of listJs('src')) {
  const r = cp.spawnSync(process.execPath, ['--check', file], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}

for (const rel of [
  'tests/core.test.js',
  'tests/propertyFoundation.test.js',
  'tests/propertyMarket.test.js',
  'tests/simulation.test.js'
]) runNode(rel, false);

for (const rel of [
  'tests/layoutRepairV050.test.js',
  'tests/foundationSrcV050.test.js',
  'tests/propertyFullPackV100Src.test.js',
  'tests/personNpcFullPackV100Src.test.js',
  'tests/competitorFullPackV110.test.js',
  'tests/customerFullPackV100.test.js',
  'tests/easterEggPackV100Src.test.js',
  'tests/recoveryContractV052.test.js'
]) runNode(rel, true);

console.log('\nRECOVERY V0.5.2 TESTS PASS');
