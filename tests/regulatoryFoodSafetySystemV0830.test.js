'use strict';

const assert =
  require('assert');

const gameState =
  require('../src/core/gameState.js');

const seedManager =
  require('../src/core/seedManagerV0813.js');

const regulatory =
  require('../src/regulatory/regulatoryFoodSafetySystemV0830.js');

gameState.reset();

seedManager.setMasterSeed(
  'regulatory-v0830-test',
  {
    resetSimulation:false
  }
);

gameState.setCash(
  200000
);

gameState.addShop({
  id:'shop_reg_v0830',
  name:'食安测试店',
  districtId:'cbd',
  status:'open',
  usableArea:100,
  greaseTrap:'有',
  fireSprinkler:'有'
});

const state =
  regulatory
    .ensureShop(
      'shop_reg_v0830'
    );

assert.equal(
  state.version,
  '0.8.30'
);

assert.equal(
  regulatory
    .INSPECTION_TYPES
    .length,
  8
);

const recalculated =
  regulatory
    .recalculate(
      'shop_reg_v0830',
      {
        districtId:'cbd',
        hygiene:82,
        traceability:84,
        staffCompliance:88,
        facility:86
      }
    );

assert.ok(
  recalculated.complianceScore >=
  0
);

assert.ok(
  recalculated.riskScore >=
  0
);

const nextDay =
  regulatory
    .scheduleNextInspection(
      'shop_reg_v0830',
      1,
      {
        minDays:3,
        maxDays:8
      }
    );

assert.ok(
  nextDay >=
  3
);

let nonPass = null;

for (
  let i = 0;
  i < 12;
  i++
) {
  const result =
    regulatory
      .runInspection(
        'shop_reg_v0830',
        20 + i,
        {
          typeId:
            i % 2 === 0
              ? 'food_safety'
              : 'hygiene',
          districtId:'cbd',
          hygiene:5,
          traceability:5,
          staffCompliance:10,
          facility:10,
          minDays:3,
          maxDays:8
        }
      );

  assert.ok(result.ok);

  assert.ok(
    [
      'pass',
      'warning',
      'fail'
    ].includes(
      result.inspection.result
    )
  );

  if (
    result.inspection.result !==
    'pass' &&
    !nonPass
  ) {
    nonPass =
      result.inspection;
  }
}

assert.ok(
  nonPass,
  '低合规场景应至少产生一次需整改检查'
);

const beforeRemediation =
  gameState
    .getPlayer()
    .cash;

const fixed =
  regulatory
    .remediate(
      'shop_reg_v0830',
      nonPass.id,
      {
        day:40,
        cost:600
      }
    );

assert.ok(fixed.ok);

assert.equal(
  gameState
    .getPlayer()
    .cash,
  beforeRemediation -
    600
);

const overview =
  regulatory
    .overview(
      'shop_reg_v0830'
    );

assert.equal(
  overview.version,
  '0.8.30'
);

assert.equal(
  overview.inspectionTypes.length,
  8
);

assert.ok(
  overview.metrics.inspections >=
  12
);

console.log(
  'V0.8.30 regulatory/inspection/food safety tests passed'
);
