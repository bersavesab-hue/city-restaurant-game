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

const entry = path.join(
  root,
  'android/entry.js'
);

const outfile = path.join(
  os.tmpdir(),
  'city-restaurant-v21-test-bundle.js'
);

// 轻量测试工作流没有执行 npm install。
// 此时不把 ENOENT 误判成游戏构建失败，而是至少做入口语法检查。
// 正式 Apply Update ZIP 工作流会 npm install，并在后续再次实际执行 esbuild + Gradle。
if (!fs.existsSync(esbuild)) {
  const syntax = childProcess.spawnSync(
    process.execPath,
    ['--check', entry],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 15000
    }
  );

  assert.strictEqual(
    syntax.status,
    0,
    'Android入口JS语法检查必须成功:\n' +
      (
        syntax.stderr ||
        syntax.stdout ||
        ''
      )
  );

  console.log(
    'V21 Android lightweight syntax regression test passed (esbuild not installed in this workflow)'
  );

  process.exit(0);
}

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
      entry,
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

for (
  let attempt = 1;
  attempt <= 3;
  attempt++
) {
  result = runBundle();

  if (
    result &&
    typeof result.status === 'number'
  ) {
    break;
  }

  if (attempt < 3) {
    console.warn(
      'V21 Android bundle spawn status=null，重试 ' +
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
          ? 'signal=' +
            result.signal
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
