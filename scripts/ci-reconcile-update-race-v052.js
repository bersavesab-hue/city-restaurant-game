'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
const marker = '.update-recovery-v052';
const inActions = process.env.GITHUB_ACTIONS === 'true';
const workflow = String(process.env.GITHUB_WORKFLOW || '');

function git(args, inherit = false) {
  return cp.spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe'
  });
}

function hasGitRemote() {
  const r = git(['remote', 'get-url', 'origin']);
  return r.status === 0 && String(r.stdout || '').trim();
}

function remoteHasMarker() {
  const r = git(['show', `origin/main:${marker}`]);
  return r.status === 0;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Only the validated Apply Update ZIP job runs npm install/test.
// The legacy fast updater does not run npm, so this is the safe place to
// reconcile its commit without modifying workflow files.
if (!(inActions && workflow === 'Apply Update ZIP')) process.exit(0);
if (!hasGitRemote()) process.exit(0);

let found = false;
for (let i = 0; i < 45; i += 1) {
  git(['fetch', 'origin', 'main']);
  if (remoteHasMarker()) {
    found = true;
    break;
  }
  sleep(1500);
}

if (!found) {
  console.log('[recovery-v052] 未发现旧 updater 的远端提交，继续当前验证流程。');
  process.exit(0);
}

const reset = git(['reset', '--hard', 'origin/main'], true);
if (reset.status !== 0) process.exit(reset.status || 1);
console.log('[recovery-v052] 已对齐旧 updater 的提交，避免最终 push 非快进冲突。');
