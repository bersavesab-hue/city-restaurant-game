'use strict';

const assert =
  require('assert');

const simulator =
  require('../src/simulator/fullIntegrationSimulationV0835.js');

const result =
  simulator.run100({
    seedPrefix:
      'test-v0835-100'
  });

assert.equal(
  result.summary.version,
  '0.8.35'
);

assert.equal(
  result.summary.runs,
  100
);

assert.equal(
  result.summary.passed,
  100,
  JSON.stringify(
    result.summary,
    null,
    2
  )
);

assert.equal(
  result.summary.failed,
  0
);

assert.equal(
  result.summary.passRate,
  100
);

assert.deepEqual(
  result.summary.issueCounts,
  {}
);

assert.equal(
  result.results.length,
  100
);

assert.ok(
  result.results.every(
    item =>
      item.metrics.playerCash >=
      0
  )
);

assert.ok(
  result.results.every(
    item =>
      item.metrics.randomB ===
      item.metrics.replayB
  )
);

console.log(
  'V0.8.35 100-run full integration simulation tests passed'
);
