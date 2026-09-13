'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const os = require('os');

const root = path.resolve(__dirname, '..');

const esbuild = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32'
    ? 'esbuild.cmd'
    : 'esbuild'
);

const outfile = path.join(
  os.tmpdir(),
  'city-restaurant-v21-test-bundle.js'
);

function runBundle() {
  try {
    if (fs.existsSync(outfile)) {
      fs.unlinkSync(outfile);
    }
  } catch (error) {
  }

  return childProcess.spawnSync(
    esbuild,
    [
      path.join(root, 'android/entry.js'),
      '--bundle',
      '--platform=browser',
      '--format=iife',
      '--target=chrome100',
      '--outfile=' + outfile
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      timeout: 45000
    }
  );
}

let result = null;

for (let attempt = 1; attempt <= 3; attempt++) {
  result = runBundle();

  // 真实的非零退出码立即视为构建失败，不重试掩盖问题。
  if (
    result &&
    typeof result.status === 'number'
  ) {
    break;
  }

  if (attempt < 3) {
    console.warn(
      'V21 Android bundle test spawn status=null，重试 ' +
      (attempt + 1) +
      '/3'
    );
  }
}

const detail =
  result
    ? (
      result.stderr ||
      result.stdout ||
      (
        result.error
          ? String(result.error)
          : ''
      ) ||
      (
        result.signal
          ? 'signal=' + result.signal
          : ''
      )
    )
    : 'spawnSync未返回结果';

assert.strictEqual(
  result && result.status,
  0,
  'V21 Android JS bundle必须成功:\n' +
    detail
);

assert.ok(
  fs.existsSync(outfile) &&
  fs.statSync(outfile).size > 1000,
  'V21 Android测试bundle未生成'
);

try {
  fs.unlinkSync(outfile);
} catch (error) {
}

console.log(
  'V21 Android esbuild regression test passed'
);
