'use strict';

// CLEAN_BASE_V060_TEST_RUNNER

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function runNode(rel, required = true) {
  const abs = path.join(ROOT, rel);

  if (!fs.existsSync(abs)) {
    if (required) {
      console.error('[TEST] 必需文件缺失:', rel);
      process.exit(1);
    }
    return;
  }

  console.log('\n[TEST]', rel);

  const result =
    cp.spawnSync(
      process.execPath,
      [abs],
      {
        cwd: ROOT,
        stdio: 'inherit'
      }
    );

  if (result.status !== 0) {
    process.exit(
      result.status || 1
    );
  }
}

function listJs(dir) {
  const abs =
    path.join(ROOT, dir);

  if (!fs.existsSync(abs)) return [];

  const out = [];
  const stack = [abs];

  while (stack.length) {
    const cur = stack.pop();

    for (
      const ent
      of fs.readdirSync(
        cur,
        { withFileTypes: true }
      )
    ) {
      const p =
        path.join(
          cur,
          ent.name
        );

      if (ent.isDirectory()) {
        stack.push(p);
      } else if (
        ent.isFile() &&
        ent.name.endsWith('.js')
      ) {
        out.push(p);
      }
    }
  }

  return out.sort();
}

runNode(
  'scripts/v60-audit.js'
);

// Every source and live script must at least parse.
for (
  const dir
  of ['src', 'scripts']
) {
  for (
    const file
    of listJs(dir)
  ) {
    const result =
      cp.spawnSync(
        process.execPath,
        ['--check', file],
        {
          cwd: ROOT,
          stdio: 'inherit'
        }
      );

    if (
      result.status !== 0
    ) {
      process.exit(
        result.status || 1
      );
    }
  }
}

// Current functional baseline.
for (
  const rel
  of [
    'tests/core.test.js',
    'tests/propertyFoundation.test.js',
    'tests/propertyMarket.test.js',
    'tests/simulation.test.js',

    'tests/v61GeometryLegacyFallback.test.js',
    'tests/renovation.test.js',
    'tests/renovationUndo.test.js',
    'tests/v48FloorGeometry.test.js',
    'tests/v48DynamicFloorIntegration.test.js',
    'tests/v47V48Combined.test.js',

    'tests/propertyFullPackV100Src.test.js',
    'tests/personNpcFullPackV100Src.test.js',
    'tests/competitorFullPackV110.test.js',
    'tests/customerFullPackV100.test.js',
    'tests/easterEggPackV100Src.test.js',

    'tests/operationCoreV070.test.js',
    'tests/wiringStageV080.test.js',
    'tests/v60CleanBase.test.js'
  ]
) {
  runNode(rel, true);
}

// Useful current feature tests: run them when present.
for (
  const rel
  of [
    'tests/propertyDeal.test.js',
    'tests/openingFinance.test.js',
    'tests/openingPrep.test.js',
    'tests/customization.test.js',
    'tests/foodMenuFullPackV100.test.js'
  ]
) {
  runNode(rel, false);
}

console.log(
  '\nCLEAN BASE V0.6.0 TESTS PASS'
);
