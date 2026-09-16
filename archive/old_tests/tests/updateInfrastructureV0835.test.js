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
    '0.8.35'
  )
);

for (
  const rel
  of [
    'src/brand/multiStoreBrandRankingV0834.js',
    'src/simulator/fullIntegrationSimulationV0835.js',
    'simulator/run100GameLoopsV0835.js'
  ]
) {
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
    'multiStoreBrandRankingV0834.js',
    'brandPortfolioSnapshot(',
    'brandExpansionCatalog(',
    'createBrandExpansionPlan(',
    'commitBrandExpansionPlan(',
    'brandRankingSnapshot(',
    'storeRankingSnapshot('
  ]
) {
  assert.ok(
    operations.includes(
      marker
    ),
    'operationsStore缺少 ' +
    marker
  );
}

const index =
  read(
    'src/operations/index.js'
  );

assert.ok(
  index.includes(
    'multiStoreBrandRankingV0834.js'
  )
);

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/multiStoreBrandRankingV0834.test.js',
    'tests/fullIntegrationSimulationV0835.test.js',
    'tests/updateInfrastructureV0835.test.js'
  ]
) {
  assert.ok(
    runner.includes(
      test
    ),
    '永久CI缺少 ' + test
  );
}

for (
  const oldTest
  of [
    'tests/regulatoryFoodSafetySystemV0830.test.js',
    'tests/socialInteractionSystemV0831.test.js',
    'tests/globalRandomEngineV0832.test.js',
    'tests/growthAchievementSystemV0833.test.js',
    'tests/megaRegulatorySocialGrowthV0833.test.js',
    'tests/updateInfrastructureV0833.test.js'
  ]
) {
  assert.ok(
    runner.includes(
      oldTest
    ),
    '不能丢失旧回归测试 ' +
    oldTest
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
  'V0.8.35 final update infrastructure tests passed'
);
