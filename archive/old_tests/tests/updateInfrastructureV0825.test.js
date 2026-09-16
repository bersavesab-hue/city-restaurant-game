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
    '0.8.25'
  )
);

const requiredFiles = [
  'src/person/personEmployeeDatabaseV0822.js',
  'src/operations/staffManagementCoordinatorV0823.js',
  'src/operations/liveOperationsCoordinatorV0824.js',
  'src/finance/completeFinanceSystemV0825.js',
  'src/finance/index.js'
];

for (
  const rel
  of requiredFiles
) {
  assert.ok(
    fs.existsSync(
      path.join(
        ROOT,
        rel
      )
    ),
    '缺少 ' +
    rel
  );
}

const operations =
  read(
    'src/operations/operationsStoreV080.js'
  );

for (
  const marker
  of [
    'staffManagementCoordinatorV0823.js',
    'liveOperationsCoordinatorV0824.js',
    'completeFinanceSystemV0825.js',
    'staffCandidateRows(',
    'hireStaffCandidate(',
    'staffManagementSnapshot(',
    'liveOperationsSnapshot(',
    'simulateCustomerVisit(',
    'closeOperatingDay(',
    'financeSnapshot(',
    'financeTransactions(',
    'recordFinanceExpense('
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
  /syncRuntimeStaff\s*\(/.test(
    operations
  )
);

assert.ok(
  /recordProcurement\s*\(/.test(
    operations
  )
);

const operationsIndex =
  read(
    'src/operations/index.js'
  );

for (
  const marker
  of [
    'staffManagementCoordinatorV0823.js',
    'liveOperationsCoordinatorV0824.js',
    'completeFinanceSystemV0825.js'
  ]
) {
  assert.ok(
    operationsIndex.includes(
      marker
    )
  );
}

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/personEmployeeDatabaseV0822.test.js',
    'tests/staffManagementCoordinatorV0823.test.js',
    'tests/liveOperationsCoordinatorV0824.test.js',
    'tests/completeFinanceSystemV0825.test.js',
    'tests/megaOperationsFinanceV0825.test.js',
    'tests/updateInfrastructureV0825.test.js'
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
    'tests/personNpcFullPackV100Src.test.js',
    'tests/staffCareerV088.test.js',
    'tests/staffWorkloadV089.test.js',
    'tests/realOperationLoopV081.test.js',
    'tests/customerRandomDatabaseV0821.test.js',
    'tests/updateInfrastructureV0821.test.js'
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
  'V0.8.25 mega update infrastructure tests passed'
);
