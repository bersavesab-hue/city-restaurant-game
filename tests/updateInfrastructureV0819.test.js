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
    String(
      current ||
      '0'
    )
      .split('.')
      .map(Number);

  const b =
    String(
      minimum ||
      '0'
    )
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

    if (av > bv) {
      return true;
    }

    if (av < bv) {
      return false;
    }
  }

  return true;
}

const pkg =
  JSON.parse(
    read(
      'package.json'
    )
  );

assert.ok(
  versionAtLeast(
    pkg.version,
    '0.8.19'
  )
);

assert.ok(
  fs.existsSync(
    path.join(
      ROOT,
      'src/inventory/ingredientInventoryDatabaseV0819.js'
    )
  )
);

const rules =
  read(
    'src/inventory/inventoryRulesV10.js'
  );

assert.ok(
  rules.includes(
    'ingredientInventoryDatabaseV0819.js'
  )
);

const engine =
  read(
    'src/inventory/inventoryEngineV10.js'
  );

assert.ok(
  engine.includes(
    'ingredientInventoryDatabaseV0819.js'
  )
);

for (
  const marker
  of [
    'lotRows',
    'inventoryAlerts',
    'capacitySummary',
    'inventoryHealth',
    'databaseVersion'
  ]
) {
  assert.ok(
    engine.includes(
      marker
    ),
    'inventoryEngine缺少 ' +
    marker
  );
}

const index =
  read(
    'src/inventory/index.js'
  );

assert.ok(
  index.includes(
    'ingredientInventoryDatabaseV0819'
  )
);

const operations =
  read(
    'src/operations/operationsStoreV080.js'
  );

assert.ok(
  operations.includes(
    'inventoryLotRows('
  )
);

assert.ok(
  operations.includes(
    'inventoryHealth('
  )
);

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/ingredientInventoryDatabaseV0819.test.js',
    'tests/inventoryIntegrationV0819.test.js',
    'tests/updateInfrastructureV0819.test.js'
  ]
) {
  assert.ok(
    runner.includes(
      test
    ),
    '永久CI缺少 ' +
    test
  );
}

for (
  const oldTest
  of [
    'tests/foodResearchDatabaseV0818.test.js',
    'tests/foodResearchSystemV0818.test.js',
    'tests/foodMenuResearchIntegrationV0818.test.js',
    'tests/updateInfrastructureV0818.test.js',
    'tests/realOperationLoopV081.test.js'
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
      'scripts/apply-update-patch.js'
    )
  )
);

console.log(
  'V0.8.19 update infrastructure tests passed'
);
