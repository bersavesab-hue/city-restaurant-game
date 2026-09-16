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
    '0.8.33'
  )
);

const required = [
  'src/regulatory/regulatoryFoodSafetySystemV0830.js',
  'src/social/socialInteractionSystemV0831.js',
  'src/core/globalRandomEngineV0832.js',
  'src/progress/growthAchievementSystemV0833.js'
];

for (
  const rel
  of required
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
    'regulatoryFoodSafetySystemV0830.js',
    'socialInteractionSystemV0831.js',
    'globalRandomEngineV0832.js',
    'growthAchievementSystemV0833.js',
    'regulatorySnapshot(',
    'runRegulatoryInspection(',
    'socialSnapshot(',
    'generateSocialDialogue(',
    'randomSnapshot(',
    'randomInt(',
    'growthSnapshot(',
    'evaluateGrowth('
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
  /socialInteractionSystem\s*\.\s*registerActor\s*\(/.test(
    operations
  ),
  '招聘员工必须接入社交关系系统'
);

assert.ok(
  /regulatoryFoodSafetySystem\s*\.\s*processDay\s*\(/.test(
    operations
  ),
  '日结必须推进监管系统'
);

assert.ok(
  /growthAchievementSystem\s*\.\s*evaluate\s*\(/.test(
    operations
  ),
  '日结必须推进成长系统'
);

const index =
  read(
    'src/operations/index.js'
  );

for (
  const marker
  of [
    'regulatoryFoodSafetySystemV0830.js',
    'socialInteractionSystemV0831.js',
    'globalRandomEngineV0832.js',
    'growthAchievementSystemV0833.js'
  ]
) {
  assert.ok(
    index.includes(marker),
    'operations index缺少 ' +
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
    'tests/regulatoryFoodSafetySystemV0830.test.js',
    'tests/socialInteractionSystemV0831.test.js',
    'tests/globalRandomEngineV0832.test.js',
    'tests/growthAchievementSystemV0833.test.js',
    'tests/megaRegulatorySocialGrowthV0833.test.js',
    'tests/updateInfrastructureV0833.test.js'
  ]
) {
  assert.ok(
    runner.includes(test),
    '永久CI缺少 ' +
    test
  );
}

for (
  const oldTest
  of [
    'tests/marketingPlatformMembershipV0826.test.js',
    'tests/reputationMediaSystemV0827.test.js',
    'tests/commercialEcologySystemV0828.test.js',
    'tests/environmentWorldCoordinatorV0829.test.js',
    'tests/megaMarketingWorldV0829.test.js',
    'tests/updateInfrastructureV0829.test.js',
    'tests/easterEggPackV100Src.test.js',
    'tests/seedManagerV0813.test.js'
  ]
) {
  assert.ok(
    runner.includes(oldTest),
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
  'V0.8.33 mega update infrastructure tests passed'
);
