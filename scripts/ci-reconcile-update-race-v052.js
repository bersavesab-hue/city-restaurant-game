'use strict';

// V48.3_SAFE_UPDATE_RECONCILE
// V48.3_PRESERVE_VALIDATED_UPDATE
//
// The validated Apply Update ZIP workflow keeps update.zip in the repository
// until AFTER npm install, tests and Android build. Therefore update.zip itself
// is the strongest signal that the current workspace contains an active patch.
//
// Never hard-reset an active patch workspace.

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
  Atomics.wait(
    new Int32Array(
      new SharedArrayBuffer(4)
    ),
    0,
    0,
    ms
  );
}

function hasActiveUpdateZip() {
  return fs.existsSync(
    path.join(
      root,
      'update.zip'
    )
  );
}

function hasDirectValidatedPatch() {
  const manifestPath =
    path.join(
      root,
      'PATCH_MANIFEST.json'
    );

  if (
    !fs.existsSync(
      manifestPath
    )
  ) {
    return false;
  }

  try {
    const manifest =
      JSON.parse(
        fs.readFileSync(
          manifestPath,
          'utf8'
        )
      );

    const pkg =
      String(
        manifest.package ||
        manifest.name ||
        ''
      );

    return (
      pkg.indexOf(
        'V47_V48'
      ) >= 0 ||
      pkg.indexOf(
        'V48'
      ) >= 0 ||
      manifest
        .preserve_workspace ===
        true
    );
  } catch (error) {
    return false;
  }
}

if (
  !(
    inActions &&
    workflow ===
      'Apply Update ZIP'
  )
) {
  process.exit(0);
}

// Critical rule:
// The workflow removes update.zip only AFTER successful tests/build.
// While it exists, the extracted workspace is the active candidate update.
if (
  hasActiveUpdateZip()
) {
  console.log(
    '[recovery-v052] 检测到活动 update.zip，跳过 git reset，保留当前验证补丁。'
  );
  process.exit(0);
}

// Secondary protection for direct validated patches.
if (
  hasDirectValidatedPatch()
) {
  console.log(
    '[recovery-v052] 检测到直接验证补丁，跳过 git reset，保留当前工作区。'
  );
  process.exit(0);
}

if (
  !hasGitRemote()
) {
  process.exit(0);
}

let found =
  false;

for (
  let i = 0;
  i < 45;
  i += 1
) {
  git([
    'fetch',
    'origin',
    'main'
  ]);

  if (
    remoteHasMarker()
  ) {
    found =
      true;

    break;
  }

  sleep(1500);
}

if (!found) {
  console.log(
    '[recovery-v052] 未发现旧 updater 的远端提交，继续当前验证流程。'
  );

  process.exit(0);
}

const reset =
  git(
    [
      'reset',
      '--hard',
      'origin/main'
    ],
    true
  );

if (
  reset.status !==
    0
) {
  process.exit(
    reset.status ||
    1
  );
}

console.log(
  '[recovery-v052] 已对齐旧 updater 的提交，避免最终 push 非快进冲突。'
);
