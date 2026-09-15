'use strict';

const simulator =
  require('../src/simulator/fullIntegrationSimulationV0835.js');

const result =
  simulator.run100({
    seedPrefix:
      process.env
        .SIM_SEED_PREFIX ||
      'city-restaurant-100-run'
  });

console.log(
  '=== V0.8.35 100局经营回归模拟 ==='
);

console.log(
  JSON.stringify(
    result.summary,
    null,
    2
  )
);

if (
  result.summary.failed >
  0
) {
  process.exitCode =
    1;
}
