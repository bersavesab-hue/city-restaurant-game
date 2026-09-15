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
    'tests/realOperationLoopV081.test.js',
    'tests/dynamicWorldV0815.test.js',
    'tests/dynamicWorldUiV0816.test.js',
    'tests/liveRestaurantV082.test.js',
    'tests/timeScheduleV0821.test.js',
    'tests/businessLifecycleV086.test.js',
    'tests/operationsScheduleV087.test.js',
    'tests/staffCareerV088.test.js',
    'tests/updateInfrastructureV088.test.js',
    'tests/staffWorkloadV089.test.js',
    'tests/updateInfrastructureV089.test.js',
    'tests/featureRoutingV0810.test.js',
    'tests/updateInfrastructureV0810.test.js',
    'tests/globalStateBusV0811.test.js',
    'tests/stateBridgeV0811.test.js',
    'tests/updateInfrastructureV0811.test.js',
    'tests/timeScheduleCoordinatorV0812.test.js',
    'tests/timedProgressionV0812.test.js',
    'tests/updateInfrastructureV0812.test.js',
    'tests/saveMigrationV0813.test.js',
    'tests/seedManagerV0813.test.js',
    'tests/updateInfrastructureV0813.test.js',
    'tests/newGameFlowV0814.test.js',
    'tests/newGameCompatibilityV0814.test.js',
    'tests/updateInfrastructureV0814.test.js',
    'tests/cityPropertyDatabaseV0815.test.js',
    'tests/propertyMarketDatabaseV0815.test.js',
    'tests/updateInfrastructureV0815.test.js',
    'tests/shopLifecycleV0816.test.js',
    'tests/shopLifecycleIntegrationV0816.test.js',
    'tests/updateInfrastructureV0816.test.js',
    'tests/renovationEquipmentDatabaseV0817.test.js',
    'tests/renovationEquipmentIntegrationV0817.test.js',
    'tests/updateInfrastructureV0817.test.js',
    'tests/v60CleanBase.test.js'
  ]
) {
  runNode(rel, true);
}

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
