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

  const length =
    Math.max(
      a.length,
      b.length
    );

  for (
    let i = 0;
    i < length;
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
    '0.8.15'
  ),
  '正式版本不能低于0.8.15'
);

assert.ok(
  fs.existsSync(
    path.join(
      ROOT,
      'src/property/cityPropertyDatabaseV0815.js'
    )
  )
);

const market =
  read(
    'src/property/propertyMarketSystem.js'
  );

assert.ok(
  /require\(["']\.\/cityPropertyDatabaseV0815\.js["']\)/.test(
    market
  ),
  '动态市场必须接统一城市/房源数据库'
);

assert.ok(
  /cityPropertyDatabase\s*\.\s*enrichDynamicListing\s*\(/.test(
    market
  ),
  '动态挂牌必须经过完整96铺型补全'
);

assert.ok(
  /f\.propertySubtypeId/.test(
    market
  ),
  '动态挂牌必须支持二级铺型过滤'
);

const runner =
  read(
    'scripts/run-ci-tests-v060.js'
  );

for (
  const test
  of [
    'tests/cityPropertyDatabaseV0815.test.js',
    'tests/propertyMarketDatabaseV0815.test.js',
    'tests/updateInfrastructureV0815.test.js'
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
    'tests/propertyFoundation.test.js',
    'tests/propertyMarket.test.js',
    'tests/propertyFullPackV100Src.test.js',
    'tests/newGameFlowV0814.test.js',
    'tests/updateInfrastructureV0814.test.js'
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
  '工作流测试时一次性安装器必须已删除'
);

console.log(
  'V0.8.15 update infrastructure tests passed'
);
