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

assert.equal(
  pkg.version,
  '0.8.44'
);

assert.ok(
  pkg.scripts.pretest.startsWith(
    'node scripts/patch-safety-v089.js && node scripts/quality-gate-v089.js'
  ),
  '测试前必须先执行补丁安全和质量门禁'
);

const runner =
  fs.readFileSync(
    path.join(
      ROOT,
      'scripts/run-ci-tests-v060.js'
    ),
    'utf8'
  );

for (
  const name
  of [
    'tests/v34MoneyFormat.test.js',
    'tests/v35RepoHygiene.test.js',
    'tests/businessDayUiV0844.test.js',
    'tests/dependencyAuditV0844.test.js',
    'tests/updateInfrastructureV0844.test.js'
  ]
) {
  assert.ok(
    runner.includes(name),
    '主测试入口缺少：' +
    name
  );
}

const discovery =
  require(
    '../tools/devkit/test-discovery.js'
  ).audit(ROOT);

assert.equal(
  discovery.metrics.uncovered,
  0,
  '主测试与质量门禁入口应覆盖全部测试文件：' +
  discovery.uncovered.join(', ')
);

const gradle =
  fs.readFileSync(
    path.join(
      ROOT,
      'android/app/build.gradle'
    ),
    'utf8'
  );

assert.ok(
  gradle.includes(
    'versionCode 844'
  ) &&
  gradle.includes(
    "versionName '0.8.44'"
  )
);

assert.ok(
  fs.existsSync(
    path.join(
      ROOT,
      'PATCH_MANIFEST_V0844.json'
    )
  )
);

console.log(
  'V0.8.44 update infrastructure tests passed'
);
