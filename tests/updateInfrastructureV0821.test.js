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
      a[i] ||
      0;

    const bv =
      b[i] ||
      0;

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
    '0.8.21'
  )
);

assert.ok(
  fs.existsSync(
    path.join(
      ROOT,
      'src/customer/customerRandomDatabaseV0821.js'
    )
  )
);

const engine =
  read(
    'src/customer/customerEngineV10.js'
  );

assert.ok(
  engine.includes(
    'customerRandomDatabaseV0821.js'
  )
);

assert.ok(
  engine.includes(
    'database.normalizeProfile'
  )
);

const index =
  read(
    'src/customer/index.js'
  );

assert.ok(
  index.includes(
    'customerRandomDatabaseV0821'
  )
);

const operations =
  read(
    'src/operations/operationsStoreV080.js'
  );

for (
  const marker
  of [
    'customerRandomDatabaseV0821.js',
    'generateCustomer(',
    'customerRows(',
    'customerInsights('
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

assert.ok(
  /normalizeCustomerMap\s*\(/.test(
    operations
  )
);

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/customerRandomDatabaseV0821.test.js',
    'tests/customerEngineIntegrationV0821.test.js',
    'tests/customerOperationsIntegrationV0821.test.js',
    'tests/updateInfrastructureV0821.test.js'
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
    'tests/customerFullPackV100.test.js',
    'tests/supplierProcurementDatabaseV0820.test.js',
    'tests/procurementLogisticsIntegrationV0820.test.js',
    'tests/updateInfrastructureV0820.test.js'
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
  'V0.8.21 update infrastructure tests passed'
);
