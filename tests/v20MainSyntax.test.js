'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const mainPath = path.resolve(__dirname, '../src/main.js');
const source = fs.readFileSync(mainPath, 'utf8');

assert.ok(
  !/const scene\s*=\s*sceneManager\s*\.getCurrentScene\(\);\s*const scene\s*=/.test(source),
  'V20补丁不能在同一作用域重复声明 const scene'
);

const result = childProcess.spawnSync(
  process.execPath,
  ['--check', mainPath],
  { encoding: 'utf8' }
);

assert.strictEqual(
  result.status,
  0,
  'V20补丁后的 src/main.js 必须通过 JavaScript 语法检查：\n' +
    (result.stderr || result.stdout || '')
);

console.log('V20.5 main.js syntax/build guard tests passed');
