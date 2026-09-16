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
  return fs.readFileSync(
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

    if (av > bv) return true;
    if (av < bv) return false;
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
    '0.8.39'
  )
);

for (
  const rel
  of [
    'src/core/gameplayFlowCoordinatorV0836.js',
    'src/core/featureAccessPolicyV0837.js',
    'src/core/interactionRecoverySystemV0838.js',
    'src/core/economyBalanceGuardV0839.js'
  ]
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

const router =
  read(
    'src/core/entryRouterV0810.js'
  );

for (
  const marker
  of [
    'routeGuard',
    'function setGuard(',
    'function getGuardStatus(',
    'ROUTE_BLOCKED'
  ]
) {
  assert.ok(
    router.includes(
      marker
    ),
    'entryRouter缺少 ' +
    marker
  );
}

const main =
  read(
    'src/main.js'
  );

assert.ok(
  /newGameFlow\s*\.\s*getStartupRoute\s*\(/.test(
    main
  ),
  '必须保留V0.8.14开局启动路线兼容契约'
);

for (
  const marker
  of [
    'gameplayFlowCoordinatorV0836.js',
    'featureAccessPolicyV0837.js',
    'interactionRecoverySystemV0838.js',
    'economyBalanceGuardV0839.js',
    'entryRouter.setGuard',
    'gameplayFlowCoordinator',
    '.goal()',
    '.executePrimary()',
    '.startupRoute()'
  ]
) {
  assert.ok(
    main.includes(
      marker
    ),
    'main缺少 ' +
    marker
  );
}

const operations =
  read(
    'src/operations/operationsStoreV080.js'
  );

for (
  const marker
  of [
    'economyBalanceGuardV0839.js',
    'economyBalanceSnapshot(',
    'assessPlannedSpend(',
    'economyRecoveryOptions('
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
    'tests/gameplayFlowCoordinatorV0836.test.js',
    'tests/featureAccessPolicyV0837.test.js',
    'tests/routerGuardIntegrationV0837.test.js',
    'tests/interactionRecoverySystemV0838.test.js',
    'tests/economyBalanceGuardV0839.test.js',
    'tests/gameplayExperienceIntegrationV0839.test.js',
    'tests/updateInfrastructureV0839.test.js'
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
    'tests/fullIntegrationSimulationV0835.test.js',
    'tests/updateInfrastructureV0835.test.js',
    'tests/newGameFlowV0814.test.js',
    'tests/businessLifecycleV086.test.js',
    'tests/featureRoutingV0810.test.js'
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
  'V0.8.39 gameplay experience infrastructure tests passed'
);
