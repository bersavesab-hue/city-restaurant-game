'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const cp =
  require('child_process');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const script =
  path.join(
    ROOT,
    'scripts/ci-reconcile-update-race-v052.js'
  );

const source =
  fs.readFileSync(
    script,
    'utf8'
  );

assert.ok(
  source.includes(
    'V48.3_SAFE_UPDATE_RECONCILE'
  ),
  '缺少V48.3安全更新标记'
);

assert.ok(
  source.includes(
    'fs.existsSync'
  ) &&
  source.includes(
    'update.zip'
  ),
  '恢复脚本必须在重置前识别活动update.zip'
);

const zip =
  path.join(
    ROOT,
    'update.zip'
  );

const existed =
  fs.existsSync(
    zip
  );

if (!existed) {
  fs.writeFileSync(
    zip,
    'V48.3_TEST'
  );
}

const run =
  cp.spawnSync(
    process.execPath,
    [
      script
    ],
    {
      cwd:
        ROOT,
      encoding:
        'utf8',
      env: {
        ...process.env,
        GITHUB_ACTIONS:
          'true',
        GITHUB_WORKFLOW:
          'Apply Update ZIP'
      }
    }
  );

if (!existed) {
  fs.unlinkSync(
    zip
  );
}

assert.strictEqual(
  run.status,
  0,
  run.stderr
);

assert.ok(
  String(
    run.stdout ||
    ''
  ).includes(
    '跳过 git reset'
  ),
  '活动update.zip存在时必须明确跳过hard reset'
);

assert.ok(
  !String(
    run.stdout ||
    ''
  ).includes(
    'HEAD is now at'
  ),
  '活动补丁期间绝不能执行git reset --hard'
);

console.log(
  'V48.3 safe reconcile tests passed'
);
