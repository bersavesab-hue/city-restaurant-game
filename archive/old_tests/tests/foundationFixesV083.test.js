'use strict';

const assert = require('assert');
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function source(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function syntax(rel) {
  const result = cp.spawnSync(process.execPath, ['--check', path.join(ROOT, rel)], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout || rel);
}

for (const rel of [
  'src/core/saveSystem.js',
  'src/operations/restaurantSimulationV081.js',
  'src/operations/floorSimulationV082.js',
  'src/operations/settlementEngineV10.js',
  'src/operations/operationsStoreV080.js',
  'src/scenes/storeScene.js',
  'src/core/gameState.js',
  'src/main.js'
]) {
  syntax(rel);
}

const simSource = source('src/operations/restaurantSimulationV081.js');
assert(simSource.includes('V083_UNIFIED_DEMAND'));
assert(simSource.includes("require('../city/demandSystem.js')"));
assert(!simSource.includes("weather ===\n          'storm'"));
assert(simSource.includes('marketingEfficiencyMultiplier'));
assert(simSource.includes('complianceCostMultiplier'));
assert(simSource.includes('inspectionRisk'));
assert(simSource.includes('deliveryDemandMultiplier'));
assert(simSource.includes('platformCostMultiplier'));
assert(simSource.includes('reputationMultiplier'));
assert(simSource.includes('V083_PAYABLES'));

const floorSource = source('src/operations/floorSimulationV082.js');
assert(floorSource.includes('V083_DYNAMIC_MODIFIERS'));
assert(floorSource.includes('basePlatformRate'));
assert(floorSource.includes('reputationMultiplier'));

const saveSource = source('src/core/saveSystem.js');
assert(saveSource.includes('V083_SAVE_THROTTLE'));
assert(saveSource.includes('autoSaveIntervalMs = 20000'));
assert(saveSource.includes('flush()'));

const mainSource = source('src/main.js');
assert(mainSource.includes('V083_DYNAMIC_GOAL_STEPS'));
assert(mainSource.includes("goal.steps"));
assert(!mainSource.includes("const labels = ['选址', '装修', '试营业', '经营', '签约'];"));

const settlement = require('../src/operations/settlementEngineV10.js');
const ledger = settlement.createLedger();
settlement.addFixedCosts(ledger, { compliance: 12, rent: 10 });
const summary = settlement.summary(ledger);
assert.strictEqual(summary.compliance, 12);
assert.strictEqual(summary.totalCost, 22);

const gameState = require('../src/core/gameState.js');
const restaurantSimulation = require('../src/operations/restaurantSimulationV081.js');
assert.strictEqual(
  restaurantSimulation.isWithinBusinessHours(
    { businessHours:{ openHour:8, closeHour:22 } },
    { hour:7, minute:30 }
  ),
  false
);
assert.strictEqual(
  restaurantSimulation.isWithinBusinessHours(
    { businessHours:{ openHour:8, closeHour:22 } },
    { hour:12, minute:0 }
  ),
  true
);
assert.strictEqual(
  restaurantSimulation.isWithinBusinessHours(
    { businessHours:{ openHour:18, closeHour:2 } },
    { hour:1, minute:0 }
  ),
  true
);

// 欠款必须能够用后续现金偿还，不能无限挂账。
gameState.setCash(10000);
const runtime = {
  simulation: {
    unpaidOperatingPayables: 4000,
    operatingPayablesByType: { labor:2500, rent:1500 },
    oldestPayableDay: null,
    lastPayableServiceMinute: null,
    payableAgeDays: 0
  }
};
const beforeCash = gameState.getPlayer().cash;
const debtResult = restaurantSimulation.serviceOperatingPayables(runtime);
assert(debtResult.paid > 0);
assert(runtime.simulation.unpaidOperatingPayables < 4000);
assert(gameState.getPlayer().cash < beforeCash);

assert.strictEqual(fs.existsSync(path.join(ROOT, 'apply-update.yml')), false);

console.log('V0.8.3 foundation fixes tests passed');
