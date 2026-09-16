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
    '0.8.16'
  ),
  '正式版本不能低于0.8.16'
);

assert.ok(
  fs.existsSync(
    path.join(
      ROOT,
      'src/core/shopLifecycleV0816.js'
    )
  ),
  '统一门店生命周期状态机必须进入正式树'
);

const business =
  read(
    'src/core/businessLifecycleV086.js'
  );

assert.ok(
  business.includes(
    "require('./shopLifecycleV0816.js')"
  )
);

assert.ok(
  /shopLifecycle\s*\.\s*deriveStage\s*\(/.test(
    business
  )
);

assert.ok(
  business.includes(
    'pauseShop'
  ) &&
  business.includes(
    'resumeShop'
  )
);

const opening =
  read(
    'src/opening/openingPrepSystem.js'
  );

assert.ok(
  opening.includes(
    "require('../core/shopLifecycleV0816.js')"
  )
);

assert.ok(
  opening.includes(
    "'closed'"
  ) &&
  opening.includes(
    "'paused'"
  ),
  '筹备系统必须保护closed/paused状态'
);

const renovation =
  read(
    'src/renovation/renovationSystem.js'
  );

assert.ok(
  renovation.includes(
    "require('../core/shopLifecycleV0816.js')"
  )
);

assert.ok(
  /shopLifecycle\s*\.\s*canAction\s*\(/.test(
    renovation
  ),
  '装修开工必须经过生命周期校验'
);

const negotiation =
  read(
    'src/property/propertyNegotiationSystem.js'
  );

assert.ok(
  negotiation.includes(
    "require('../core/shopLifecycleV0816.js')"
  )
);

assert.ok(
  /shopLifecycle\s*\.\s*syncShop\s*\(/.test(
    negotiation
  ),
  '签约后必须立即登记生命周期'
);

const newGame =
  read(
    'src/core/newGameFlowV0814.js'
  );

assert.ok(
  newGame.includes(
    "require('./shopLifecycleV0816.js')"
  )
);

assert.ok(
  /lifecycle\s*\.\s*deriveStage\s*\(/.test(
    newGame
  ),
  '开局流程必须复用统一门店生命周期'
);

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/shopLifecycleV0816.test.js',
    'tests/shopLifecycleIntegrationV0816.test.js',
    'tests/updateInfrastructureV0816.test.js'
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
    'tests/businessLifecycleV086.test.js',
    'tests/newGameFlowV0814.test.js',
    'tests/newGameCompatibilityV0814.test.js',
    'tests/updateInfrastructureV0815.test.js'
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
  ),
  '正式测试时一次性安装器必须已经删除'
);

console.log(
  'V0.8.16 update infrastructure tests passed'
);
