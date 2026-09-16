'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

const pkg =
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'package.json'
      ),
      'utf8'
    )
  );

assert.ok(
  (
    pkg.scripts.pretest ||
    ''
  ).startsWith(
    'node scripts/patch-safety-v089.js && node scripts/quality-gate-v089.js'
  ),
  'pretest必须先做补丁安全检查，再执行质量门禁'
);

const gate =
  fs.readFileSync(
    path.join(
      ROOT,
      'scripts/quality-gate-v089.js'
    ),
    'utf8'
  );

for (
  const required
  of [
    'tests/playerLab.test.js',
    'tests/playerLabIsolation.test.js',
    'tests/playerLabReport.test.js',
    'tests/androidEditableModal.test.js',
    'tests/districtInsight.test.js',
    'tests/visualAssets.test.js',
    'tests/visualFidelity.test.js',
    'simulator/run100.js',
    '--ci',
    '--report'
  ]
) {
  assert.ok(
    gate.includes(
      required
    ),
    '质量门禁缺少：' +
      required
  );
}

const safety =
  fs.readFileSync(
    path.join(
      ROOT,
      'scripts/patch-safety-v089.js'
    ),
    'utf8'
  );

assert.ok(
  safety.includes(
    '.github/workflows/'
  ) &&
  safety.includes(
    'update.zip'
  ),
  '必须提前阻止自动补丁修改GitHub Workflow'
);

console.log(
  'V0.8.9 quality gate infrastructure tests passed'
);
