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
  process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild'
);

const outfile = path.join(
  os.tmpdir(),
  'city-restaurant-v21-test-bundle.js'
);

const result = childProcess.spawnSync(
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
    encoding: 'utf8'
  }
);

assert.strictEqual(
  result.status,
  0,
  'V21 Android JS bundle必须成功:\n' +
    (result.stderr || result.stdout || '')
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

console.log('V21 Android esbuild regression test passed');
