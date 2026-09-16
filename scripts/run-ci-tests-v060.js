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
    'tests/assetPipeline.test.js',
    'tests/atlasSplit.test.js',
    'tests/foundationSrcV050.test.js',
    'tests/layoutRepairV050.test.js',
    'tests/renovationV17.test.js',
    'tests/storeV16.test.js',
    'tests/storeV36AllContracts.test.js',
    'tests/storeV36Compat.test.js',
    'tests/storeV36Phase1.test.js',
    'tests/storeV37FinalMode.test.js',
    'tests/storeV37FullCompat.test.js',
    'tests/storeV37NoShopFidelity.test.js',
    'tests/storeV38SingleStoreFidelity.test.js',
    'tests/storeV39LibraryAssets.test.js',
    'tests/v32ReferenceHome.test.js',
    'tests/v33GlobalNav.test.js',
    'tests/v34MoneyFormat.test.js',
    'tests/v35RepoHygiene.test.js',
    'tests/v35TopHudPolish.test.js',
    'tests/v42StoreMasterReference.test.js',
    'tests/v43ReferenceImageUi.test.js',
    'tests/v44VisualRepair.test.js',
    'tests/v45RenovationPhase1.test.js',
    'tests/v46RenovationPlayability.test.js',
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
    'tests/foodResearchDatabaseV0818.test.js',
    'tests/foodResearchSystemV0818.test.js',
    'tests/foodMenuResearchIntegrationV0818.test.js',
    'tests/updateInfrastructureV0818.test.js',
    'tests/ingredientInventoryDatabaseV0819.test.js',
    'tests/inventoryIntegrationV0819.test.js',
    'tests/updateInfrastructureV0819.test.js',
    'tests/supplierProcurementDatabaseV0820.test.js',
    'tests/procurementLogisticsIntegrationV0820.test.js',
    'tests/updateInfrastructureV0820.test.js',
    'tests/customerRandomDatabaseV0821.test.js',
    'tests/customerEngineIntegrationV0821.test.js',
    'tests/customerOperationsIntegrationV0821.test.js',
    'tests/updateInfrastructureV0821.test.js',
    'tests/personEmployeeDatabaseV0822.test.js',
    'tests/staffManagementCoordinatorV0823.test.js',
    'tests/liveOperationsCoordinatorV0824.test.js',
    'tests/completeFinanceSystemV0825.test.js',
    'tests/megaOperationsFinanceV0825.test.js',
    'tests/updateInfrastructureV0825.test.js',
    'tests/marketingPlatformMembershipV0826.test.js',
    'tests/reputationMediaSystemV0827.test.js',
    'tests/commercialEcologySystemV0828.test.js',
    'tests/environmentWorldCoordinatorV0829.test.js',
    'tests/megaMarketingWorldV0829.test.js',
    'tests/updateInfrastructureV0829.test.js',
    'tests/regulatoryFoodSafetySystemV0830.test.js',
    'tests/socialInteractionSystemV0831.test.js',
    'tests/globalRandomEngineV0832.test.js',
    'tests/growthAchievementSystemV0833.test.js',
    'tests/megaRegulatorySocialGrowthV0833.test.js',
    'tests/updateInfrastructureV0833.test.js',
    'tests/multiStoreBrandRankingV0834.test.js',
    'tests/fullIntegrationSimulationV0835.test.js',
    'tests/updateInfrastructureV0835.test.js',
    'tests/gameplayFlowCoordinatorV0836.test.js',
    'tests/featureAccessPolicyV0837.test.js',
    'tests/routerGuardIntegrationV0837.test.js',
    'tests/interactionRecoverySystemV0838.test.js',
    'tests/economyBalanceGuardV0839.test.js',
    'tests/gameplayExperienceIntegrationV0839.test.js',
    'tests/updateInfrastructureV0839.test.js',
    'tests/dailyOperatingCycleV0840.test.js',
    'tests/decisionFeedbackV0841.test.js',
    'tests/playtestHealthV0842.test.js',
    'tests/operatingBalanceTunerV0843.test.js',
    'tests/operatingDayIntegrationV0843.test.js',
    'tests/updateInfrastructureV0843.test.js',
    'tests/businessDayUiV0844.test.js',
    'tests/dependencyAuditV0844.test.js',
    'tests/updateInfrastructureV0844.test.js',
    'tests/renovationAreaV0849.test.js',
    'tests/renovationUiV0849.test.js',
    'tests/renovationHotfixV0849.test.js',
    'tests/renovationFinalFixV0850.test.js',
    'tests/renovationEditorV0862.test.js',
    'tests/renovationSpatialV0864.test.js',
    'tests/preparationCommandCenterV0861.test.js',
    'tests/advancedManagementV0862.test.js',
    'tests/updateInfrastructureV0849.test.js',
    'tests/ratingSystemV104.test.js',
    'tests/financialSystemV103.test.js',
    'tests/businessSystemsBootstrapV111.test.js',
    'tests/customDishSystemV120.test.js',
    'tests/v60CleanBase.test.js'
  ]
) {
  runNode(rel, true);
}

for (
  const rel
  of [
    'tests/customerTrafficSystemV103.test.js',
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
