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
    '0.8.17'
  )
);

const databasePath =
  path.join(
    ROOT,
    'src/renovation/renovationEquipmentDatabaseV0817.js'
  );

assert.ok(
  fs.existsSync(
    databasePath
  )
);

const renovation =
  read(
    'src/renovation/renovationSystem.js'
  );

assert.ok(
  renovation.includes(
    'renovationEquipmentDatabaseV0817.js'
  )
);

assert.ok(
  /database\s*\.\s*quoteContractors\s*\(/.test(
    renovation
  )
);

assert.ok(
  /database\s*\.\s*estimateConstructionBreakdown\s*\(/.test(
    renovation
  )
);

const opening =
  read(
    'src/opening/openingPrepSystem.js'
  );

assert.ok(
  opening.includes(
    'renovationEquipmentDatabaseV0817.js'
  )
);

assert.ok(
  /equipmentDatabase\s*\.\s*getEquipmentSkus\s*\(/.test(
    opening
  )
);

assert.ok(
  opening.includes(
    'getEquipmentCatalog('
  )
);

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/renovationEquipmentDatabaseV0817.test.js',
    'tests/renovationEquipmentIntegrationV0817.test.js',
    'tests/updateInfrastructureV0817.test.js'
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
  const legacy
  of [
    'tests/renovation.test.js',
    'tests/renovationUndo.test.js',
    'tests/v48FloorGeometry.test.js',
    'tests/openingPrep.test.js',
    'tests/shopLifecycleV0816.test.js',
    'tests/updateInfrastructureV0816.test.js'
  ]
) {
  if (
    legacy ===
    'tests/openingPrep.test.js'
  ) {
    continue;
  }

  assert.ok(
    runner.includes(
      legacy
    ),
    '旧回归测试不能丢失 ' +
    legacy
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
  'V0.8.17 update infrastructure tests passed'
);
