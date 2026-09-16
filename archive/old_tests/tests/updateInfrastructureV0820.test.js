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
    '0.8.20'
  )
);

assert.ok(
  fs.existsSync(
    path.join(
      ROOT,
      'src/supplier/supplierProcurementDatabaseV0820.js'
    )
  )
);

const supplierEngine =
  read(
    'src/supplier/supplierEngineV10.js'
  );

assert.ok(
  supplierEngine.includes(
    'supplierProcurementDatabaseV0820.js'
  )
);

assert.ok(
  supplierEngine.includes(
    'getSupplierCatalog'
  )
);

assert.ok(
  supplierEngine.includes(
    'negotiateQuote'
  )
);

const procurement =
  read(
    'src/supplier/procurementEngineV10.js'
  );

for (
  const marker
  of [
    'supplierProcurementDatabaseV0820.js',
    'updatePurchaseOrderStatuses',
    'cancelPurchaseOrder',
    'procurementOverview',
    'enforceArrival'
  ]
) {
  assert.ok(
    procurement.includes(
      marker
    ),
    'procurementEngine缺少 ' +
    marker
  );
}

assert.ok(
  /batchNo\s*:\s*po\.id/.test(
    procurement
  ),
  '采购单ID必须进入库存批次追溯字段'
);

const supplierIndex =
  read(
    'src/supplier/index.js'
  );

assert.ok(
  supplierIndex.includes(
    'supplierProcurementDatabaseV0820'
  )
);

const operations =
  read(
    'src/operations/operationsStoreV080.js'
  );

for (
  const marker
  of [
    'supplierCatalog(',
    'compareSupplierQuotes(',
    'negotiateSupplierQuote(',
    'createManualPurchaseOrder(',
    'receiveManualPurchaseOrder(',
    'cancelManualPurchaseOrder(',
    'procurementOverview('
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

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/supplierProcurementDatabaseV0820.test.js',
    'tests/procurementLogisticsIntegrationV0820.test.js',
    'tests/updateInfrastructureV0820.test.js'
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
    'tests/ingredientInventoryDatabaseV0819.test.js',
    'tests/inventoryIntegrationV0819.test.js',
    'tests/updateInfrastructureV0819.test.js',
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
      'apply-update.yml'
    )
  ),
  '仓库根目录不能残留 apply-update.yml'
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
  'V0.8.20 update infrastructure tests passed'
);
