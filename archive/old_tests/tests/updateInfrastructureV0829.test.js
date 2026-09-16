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

function read(rel) {
  return fs
    .readFileSync(
      path.join(
        ROOT,
        rel
      ),
      'utf8'
    );
}

function versionAtLeast(
  current,
  minimum
) {
  const a =
    String(current || '0')
      .split('.')
      .map(Number);

  const b =
    String(minimum || '0')
      .split('.')
      .map(Number);

  const n =
    Math.max(
      a.length,
      b.length
    );

  for (
    let i = 0;
    i < n;
    i++
  ) {
    const av =
      a[i] || 0;

    const bv =
      b[i] || 0;

    if (av > bv) return true;
    if (av < bv) return false;
  }

  return true;
}

const pkg =
  JSON.parse(
    read('package.json')
  );

assert.ok(
  versionAtLeast(
    pkg.version,
    '0.8.29'
  )
);

const required = [
  'src/operations/marketingPlatformMembershipV0826.js',
  'src/reputation/reputationMediaSystemV0827.js',
  'src/world/commercialEcologySystemV0828.js',
  'src/world/environmentWorldCoordinatorV0829.js'
];

for (const rel of required) {
  assert.ok(
    fs.existsSync(
      path.join(
        ROOT,
        rel
      )
    ),
    '缺少 ' + rel
  );
}

const operations =
  read(
    'src/operations/operationsStoreV080.js'
  );

for (
  const marker
  of [
    'marketingPlatformMembershipV0826.js',
    'reputationMediaSystemV0827.js',
    'commercialEcologySystemV0828.js',
    'environmentWorldCoordinatorV0829.js',
    'marketingCatalog(',
    'startMarketingCampaign(',
    'enrollMember(',
    'marketingMembershipSnapshot(',
    'reputationSnapshot(',
    'recordManualReview(',
    'createReputationRumor(',
    'commercialEcologySnapshot(',
    'environmentSnapshot('
  ]
) {
  assert.ok(
    operations.includes(marker),
    'operationsStore缺少 ' + marker
  );
}

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/marketingPlatformMembershipV0826.test.js',
    'tests/reputationMediaSystemV0827.test.js',
    'tests/commercialEcologySystemV0828.test.js',
    'tests/environmentWorldCoordinatorV0829.test.js',
    'tests/megaMarketingWorldV0829.test.js',
    'tests/updateInfrastructureV0829.test.js'
  ]
) {
  assert.ok(
    runner.includes(test),
    '永久CI缺少 ' + test
  );
}

for (
  const oldTest
  of [
    'tests/completeFinanceSystemV0825.test.js',
    'tests/megaOperationsFinanceV0825.test.js',
    'tests/updateInfrastructureV0825.test.js',
    'tests/dynamicWorldV0815.test.js',
    'tests/competitorFullPackV110.test.js'
  ]
) {
  assert.ok(
    runner.includes(oldTest),
    '不能丢失旧回归测试 ' + oldTest
  );
}

assert.ok(
  !fs.existsSync(
    path.join(
      ROOT,
      'apply-update.yml'
    )
  )
);

assert.ok(
  !fs.existsSync(
    path.join(
      ROOT,
      'scripts/apply-update-patch.js'
    )
  )
);

console.log(
  'V0.8.29 mega update infrastructure tests passed'
);
